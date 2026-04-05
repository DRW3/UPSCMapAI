#!/usr/bin/env node
/**
 * UPSC PYQ Extractor — Gemini Vision OCR for Scanned PDFs
 * ========================================================
 * Converts scanned PDF pages to images, sends to Gemini 2.5 Flash for OCR,
 * and extracts structured MCQ data.
 *
 * Usage:
 *   node scripts/extract-pyqs-gemini-vision.mjs                # all scanned years
 *   node scripts/extract-pyqs-gemini-vision.mjs 2023           # single year
 *   node scripts/extract-pyqs-gemini-vision.mjs --reparse      # force reparse all
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAPERS_DIR = path.join(__dirname, '..', 'data', 'pyqs', 'papers')
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'pyqs', 'gemini_extracted_pyqs.json')
const PROGRESS_FILE = path.join(__dirname, '..', 'data', 'pyqs', 'gemini_extraction_progress.json')
const TEMP_DIR = path.join(__dirname, '..', 'data', 'pyqs', '.tmp_pages')

// ── Load env ────────────────────────────────────────────────────────────────
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const GEMINI_KEY = envFile.match(/GEMINI_API_KEY=(.+)/)[1].trim()

const genAI = new GoogleGenerativeAI(GEMINI_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
  },
})

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const yearFilter = args.find(a => /^\d{4}$/.test(a))
const forceReparse = args.includes('--reparse')

// ── Rate limiting ───────────────────────────────────────────────────────────
const RATE_LIMIT_DELAY = 4000 // 4s between requests (15 RPM free tier)
const MAX_RETRIES = 5

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGeminiWithRetry(parts, retries = 0) {
  try {
    const result = await model.generateContent(parts)
    return result.response.text()
  } catch (e) {
    if (retries >= MAX_RETRIES) throw e
    const msg = e.message || ''
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      // Extract retry delay — look for "retryDelay":"57s" or "retry in 57s" patterns
      const retryMatch = msg.match(/retryDelay["\s:]+(\d{1,3})s/) || msg.match(/retry in (\d{1,3})s/i)
      const waitSec = (retryMatch && parseInt(retryMatch[1]) < 300) ? parseInt(retryMatch[1]) + 5 : Math.pow(2, retries + 1) * 10
      console.log(`    ⏳ Rate limited, waiting ${waitSec}s (retry ${retries + 1}/${MAX_RETRIES})...`)
      await sleep(waitSec * 1000)
      return callGeminiWithRetry(parts, retries + 1)
    }
    throw e
  }
}

// ── PDF to images ───────────────────────────────────────────────────────────

function pdfToImages(pdfPath, prefix) {
  const outPrefix = path.join(TEMP_DIR, prefix)
  execSync(`pdftoppm -png -r 200 "${pdfPath}" "${outPrefix}"`, { stdio: 'pipe' })
  // pdftoppm creates files like prefix-01.png, prefix-02.png, ...
  const files = fs.readdirSync(TEMP_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
    .sort()
  return files.map(f => path.join(TEMP_DIR, f))
}

// ── MCQ extraction prompt ───────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are extracting MCQ questions from a UPSC Civil Services Preliminary Exam (General Studies Paper I) question paper.

Look at these page images and extract ALL MCQ questions visible. Each question has:
- A question number (1-100)
- Question text (may include numbered statements, lists, or tables)
- Four options labeled (a), (b), (c), (d)

IMPORTANT RULES:
- Extract EVERY question completely — do not skip any
- Preserve the exact question text including numbered sub-statements
- If a question references "the statements given above" or "the above pairs", include the statements/pairs in the question text
- Options may be short (like "1 and 2 only") or long sentences
- Some questions have answer markings — capture those too
- If you see directions like "Directions for Q.X to Q.Y" include that context

Return ONLY a valid JSON array. Each element:
{
  "questionNo": <number>,
  "question": "<full question text>",
  "options": { "a": "<option a>", "b": "<option b>", "c": "<option c>", "d": "<option d>" },
  "answer": "<a/b/c/d if visible, otherwise null>"
}

Return ONLY the JSON array — no markdown code fences, no commentary. If no questions are found on these pages, return [].`

const ANSWER_KEY_PROMPT = `Extract the answer key from this image. It maps question numbers to correct answers (a/b/c/d).

Return ONLY a valid JSON object mapping question numbers to answers.
Format: { "1": "a", "2": "c", "3": "b", ... }

Return ONLY the JSON — no markdown, no commentary. If you can't read the answers, return {}.`

// ── Parse JSON from Gemini response ─────────────────────────────────────────

function parseJSON(text) {
  // Strip markdown fences if present
  let cleaned = text.trim()
  // Remove all markdown code fences (may appear multiple times)
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  // Remove any leading/trailing text before/after the JSON
  cleaned = cleaned.trim()

  // Try parsing directly
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Try to find JSON array in the text (greedy)
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]) } catch {}
      // If that fails, try fixing common issues: trailing commas, truncated JSON
      let fixed = arrayMatch[0]
        .replace(/,\s*\]/, ']')  // trailing comma before ]
        .replace(/,\s*\}/, '}')  // trailing comma before }
      // Try to fix truncated response — find last complete object
      try { return JSON.parse(fixed) } catch {}
      // Find last valid closing and truncate
      const lastBrace = fixed.lastIndexOf('}')
      if (lastBrace > 0) {
        const truncated = fixed.slice(0, lastBrace + 1) + ']'
        try { return JSON.parse(truncated) } catch {}
      }
    }
    // Try finding individual JSON objects and building array
    const objects = []
    const objRegex = /\{[^{}]*"questionNo"\s*:\s*\d+[^{}]*\}/g
    let m
    while ((m = objRegex.exec(cleaned)) !== null) {
      try {
        objects.push(JSON.parse(m[0]))
      } catch {}
    }
    if (objects.length > 0) {
      console.log(`    🔧 Recovered ${objects.length} questions from malformed JSON`)
      return objects
    }
    console.log(`    ⚠️  Failed to parse JSON response (${cleaned.length} chars)`)
    return null
  }
}

// ── Subject classification (same as original script) ────────────────────────

const SUBJECT_KEYWORDS = {
  'ancient-history': /indus valley|harappan|vedic|maurya|ashoka|gupta|sangam|chola|pallava|chalukya|rashtrakuta|buddhis[mt]|jainis[mt]|mahajanapada|gandhara|kushan|satavahana|magadh/i,
  'medieval-history': /mughal|sultan|delhi sultanate|vijayanagar|bahmani|akbar|aurangzeb|shivaji|maratha|sikh|guru nanak|bhakti|sufi|tughlaq|khilji|slave dynasty|lodi/i,
  'modern-history': /british|colonial|east india company|revolt.*1857|gandhi|nehru|congress|swadeshi|quit india|civil disobedience|salt march|dandi|partition|independence|freedom movement|ilbert bill|morley.?minto|montagu|simon commission|rowlatt|jallianwala/i,
  'world-history': /french revolution|industrial revolution|world war|cold war|russian revolution|american revolution|renaissance|colonialism|imperialism|nato|warsaw|united nations|league of nations/i,
  'indian-geography': /river|monsoon|soil|climate.*india|western ghats|eastern ghats|himalaya|deccan|peninsula|indian ocean|coastal|tropical|cyclone|flood|drought|irrigation|agricultural|crop|mineral.*india/i,
  'world-geography': /latitude|longitude|earthquake|volcano|plate tectonics|ocean current|atmosphere|lithosphere|hydrosphere|climate zone|temperate|tropical cyclone|el nino|la nina|ozone/i,
  'indian-polity': /constitution|fundamental right|directive principle|parliament|lok sabha|rajya sabha|president|governor|supreme court|high court|amendment|article \d|panchayat|municipal|federal|union list|state list|concurrent list|election commission|comptroller|attorney general/i,
  'indian-economy': /gdp|fiscal|monetary|inflation|rbi|reserve bank|budget|tax|gst|fdi|current account|balance of payment|niti aayog|planning commission|poverty|subsidy|public sector|privatization|disinvestment/i,
  'science-technology': /dna|rna|cell|atom|molecule|nuclear|satellite|isro|space|nano|biotechnology|genetic|virus|bacteria|vaccine|antibiotic|polymer|semiconductor|laser|radar|internet|5g|artificial intelligence/i,
  'environment-ecology': /biodiversity|ecosystem|forest|wildlife|pollution|carbon|greenhouse|ozone|climate change|coral|mangrove|wetland|endangered|species|national park|sanctuary|ramsar|biosphere reserve|environmental/i,
  'art-culture': /painting|sculpture|dance|music|temple|architecture|mughal art|rajput|miniature|folk|classical|carnatic|hindustani|bharatanatyam|kathak|odissi|cave|fresco|mural|heritage/i,
  'governance': /governance|transparency|accountability|e.?governance|right to information|rti|lokpal|lokayukta|citizen charter|social audit|ngo|civil society|self.?help group/i,
  'international-relations': /bilateral|multilateral|asean|saarc|brics|g20|g7|wto|imf|world bank|treaty|diplomatic|foreign policy|border dispute|maritime|indo.?pacific|quad/i,
  'internal-security': /terrorism|naxal|maoist|insurgency|border security|cyber security|money laundering|narcotics|human trafficking|bsf|crpf|nsa|nia|uapa/i,
}

function classifyQuestion(questionText) {
  for (const [subject, pattern] of Object.entries(SUBJECT_KEYWORDS)) {
    if (pattern.test(questionText)) return subject
  }
  return 'general'
}

// ── Load/save progress ──────────────────────────────────────────────────────

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) } catch {}
  }
  return { completedYears: [], questions: [] }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ── Main pipeline ───────────────────────────────────────────────────────────

async function processYear(year) {
  const paperFile = `${year}_gs1_question_paper.pdf`
  const paperPath = path.join(PAPERS_DIR, paperFile)
  if (!fs.existsSync(paperPath)) {
    console.log(`  ⚠️  ${year}: Paper PDF not found`)
    return []
  }

  console.log(`\n📖 ${year}: Converting PDF to images...`)
  const prefix = `y${year}_q_`
  const pageImages = pdfToImages(paperPath, prefix)
  console.log(`  📄 ${pageImages.length} pages`)

  // Skip instruction pages (usually first 1-2 pages) and blank pages
  // Process in batches of 4 pages
  const BATCH_SIZE = 4
  let allQuestions = []

  for (let i = 0; i < pageImages.length; i += BATCH_SIZE) {
    const batch = pageImages.slice(i, i + BATCH_SIZE)
    const pageRange = `${i + 1}-${Math.min(i + BATCH_SIZE, pageImages.length)}`
    process.stdout.write(`  🔍 Pages ${pageRange}...`)

    // Build multimodal request
    const parts = []
    for (const imgPath of batch) {
      const imgData = fs.readFileSync(imgPath)
      parts.push({ inlineData: { mimeType: 'image/png', data: imgData.toString('base64') } })
    }
    parts.push(EXTRACTION_PROMPT)

    try {
      const responseText = await callGeminiWithRetry(parts)
      const questions = parseJSON(responseText)
      if (questions && Array.isArray(questions) && questions.length > 0) {
        allQuestions.push(...questions)
        console.log(` ✅ ${questions.length} questions`)
      } else {
        console.log(` (no questions)`)
      }
    } catch (e) {
      console.log(` ❌ Error: ${e.message.slice(0, 100)}`)
    }

    await sleep(RATE_LIMIT_DELAY)
  }

  // Process answer key if available
  const akFile = `${year}_gs1_answer_key.pdf`
  const akPath = path.join(PAPERS_DIR, akFile)
  let answerMap = {}

  if (fs.existsSync(akPath)) {
    console.log(`  🔑 Processing answer key...`)
    const akPrefix = `y${year}_ak_`
    const akImages = pdfToImages(akPath, akPrefix)

    // Answer keys are usually 1-3 pages, process all at once or in small batches
    for (let i = 0; i < akImages.length; i += 3) {
      const batch = akImages.slice(i, i + 3)
      const parts = []
      for (const imgPath of batch) {
        const imgData = fs.readFileSync(imgPath)
        parts.push({ inlineData: { mimeType: 'image/png', data: imgData.toString('base64') } })
      }
      parts.push(ANSWER_KEY_PROMPT)

      try {
        const responseText = await callGeminiWithRetry(parts)
        const answers = parseJSON(responseText)
        if (answers && typeof answers === 'object') {
          Object.assign(answerMap, answers)
        }
      } catch (e) {
        console.log(`    ⚠️  Answer key error: ${e.message.slice(0, 100)}`)
      }
      await sleep(RATE_LIMIT_DELAY)
    }

    const akCount = Object.keys(answerMap).length
    console.log(`  🔑 ${akCount} answers extracted from key`)
  }

  // Merge answers into questions
  let answersApplied = 0
  for (const q of allQuestions) {
    // Apply answer from answer key
    if (!q.answer && answerMap[String(q.questionNo)]) {
      q.answer = answerMap[String(q.questionNo)]
      answersApplied++
    }
    // Normalize answer
    if (q.answer) {
      q.answer = q.answer.toLowerCase().trim()
      if (!['a', 'b', 'c', 'd'].includes(q.answer)) q.answer = null
    }
    // Add metadata
    q.year = year
    q.subject = classifyQuestion(q.question)
    q.source = 'gemini-vision-ocr'
  }

  // Deduplicate by question number (keep first occurrence)
  const seen = new Set()
  const deduped = []
  for (const q of allQuestions) {
    if (!seen.has(q.questionNo)) {
      seen.add(q.questionNo)
      deduped.push(q)
    }
  }

  console.log(`  ✅ ${year}: ${deduped.length} unique questions, ${answersApplied} answers applied`)

  // Clean up temp images for this year
  for (const f of fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(`y${year}_`))) {
    fs.unlinkSync(path.join(TEMP_DIR, f))
  }

  return deduped
}

async function main() {
  console.log('🔬 UPSC PYQ Gemini Vision OCR Extractor')
  console.log('========================================\n')

  // Create temp directory
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

  // Load progress
  const progress = forceReparse ? { completedYears: [], questions: [] } : loadProgress()
  console.log(`📂 Progress: ${progress.completedYears.length} years already done, ${progress.questions.length} questions saved\n`)

  // Scanned years that need OCR (from extraction_stats.json errors)
  const SCANNED_YEARS = [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

  const yearsToProcess = SCANNED_YEARS
    .filter(y => !yearFilter || y === parseInt(yearFilter))
    .filter(y => forceReparse || !progress.completedYears.includes(y))

  if (yearsToProcess.length === 0) {
    console.log('✅ All years already processed! Use --reparse to force re-extraction.')
    return
  }

  console.log(`📋 Years to process: ${yearsToProcess.join(', ')}\n`)

  for (const year of yearsToProcess) {
    try {
      const questions = await processYear(year)
      if (questions.length > 0) {
        // Remove any existing questions for this year, add new ones
        progress.questions = progress.questions.filter(q => q.year !== year)
        progress.questions.push(...questions)
        progress.completedYears.push(year)
        saveProgress(progress)
        console.log(`  💾 Progress saved (${progress.questions.length} total)\n`)
      }
    } catch (e) {
      console.error(`  ❌ ${year} FAILED: ${e.message}`)
      console.error(`     Saving progress and continuing...\n`)
      saveProgress(progress)
    }
  }

  // Sort and save final output
  progress.questions.sort((a, b) => a.year - b.year || a.questionNo - b.questionNo)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(progress.questions, null, 2))

  // Summary
  console.log('\n════════════════════════════════════════')
  console.log('📊 EXTRACTION SUMMARY')
  console.log('════════════════════════════════════════')
  console.log(`Total questions:  ${progress.questions.length}`)
  console.log(`With answers:     ${progress.questions.filter(q => q.answer).length}`)
  console.log(`Years completed:  ${progress.completedYears.sort().join(', ')}`)

  const byYear = {}
  for (const q of progress.questions) {
    byYear[q.year] = (byYear[q.year] || 0) + 1
  }
  console.log('\nBy year:')
  for (const [y, c] of Object.entries(byYear).sort()) {
    console.log(`  ${y}: ${c} questions`)
  }

  const bySubject = {}
  for (const q of progress.questions) {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1
  }
  console.log('\nBy subject:')
  for (const [s, c] of Object.entries(bySubject).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`)
  }

  console.log(`\n💾 Saved to ${OUTPUT_FILE}`)

  // Cleanup temp dir
  try {
    const remaining = fs.readdirSync(TEMP_DIR)
    for (const f of remaining) fs.unlinkSync(path.join(TEMP_DIR, f))
    fs.rmdirSync(TEMP_DIR)
  } catch {}
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
