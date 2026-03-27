/**
 * extract-upsc-pdfs.ts
 *
 * Downloads official UPSC Civil Services Prelims GS Paper I PDFs,
 * uploads each to Gemini Files API, and uses Gemini vision to extract
 * all 100 questions with options, correct answer, explanation, and
 * subject classification.
 *
 * Output: data/pyqs/extracted/<year>_gs1.json
 *
 * Run: /opt/homebrew/bin/node -r @swc/register scripts/extract-upsc-pdfs.ts
 * Or:  npx tsx scripts/extract-upsc-pdfs.ts
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in .env.local')

// ── Papers to extract ─────────────────────────────────────────────────────────
interface PaperDef {
  year: number
  url: string
  label: string
}

const PAPERS: PaperDef[] = [
  {
    year: 2025,
    url: 'https://upsc.gov.in/sites/default/files/QP-CSP-25-GENERAL-STUDIES-PAPER-I-26052025.pdf',
    label: '2025_gs1',
  },
  {
    year: 2024,
    url: 'https://upsc.gov.in/sites/default/files/QP-CSP-24-GENERAL-STUDIES-PAPER-I-180624.pdf',
    label: '2024_gs1',
  },
]

// ── Extracted question interface ──────────────────────────────────────────────
interface ExtractedQuestion {
  year: number
  paper: 'gs1'
  exam_type: 'prelims'
  question_no: number
  question: string
  options: { a: string; b: string; c: string; d: string }
  answer: 'a' | 'b' | 'c' | 'd'
  explanation: string
  subject: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  source: 'upsc_official'
  source_url: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.resolve(process.cwd(), 'data/pyqs/extracted')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// Cache uploaded file URIs so we don't re-upload on retries
const URI_CACHE_FILE = path.join(OUTPUT_DIR, '.uri_cache.json')
const URI_CACHE: Record<string, string> = (() => {
  try { return JSON.parse(fs.readFileSync(URI_CACHE_FILE, 'utf8')) } catch { return {} }
})()
function saveUriCache() { fs.writeFileSync(URI_CACHE_FILE, JSON.stringify(URI_CACHE, null, 2)) }

// Pre-seed with already uploaded URIs from previous run
URI_CACHE['2025_gs1'] = URI_CACHE['2025_gs1'] || 'https://generativelanguage.googleapis.com/v1beta/files/6130yw07wv48'
URI_CACHE['2024_gs1'] = URI_CACHE['2024_gs1'] || 'https://generativelanguage.googleapis.com/v1beta/files/1bqzq79ec7zh'
saveUriCache()

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  (already downloaded: ${path.basename(dest)})`); return resolve() }
    console.log(`  Downloading ${path.basename(dest)} ...`)
    const file = fs.createWriteStream(dest)
    const makeRequest = (u: string) => {
      https.get(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0 Safari/537.36' },
      }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return makeRequest(res.headers.location!)
        }
        if (res.statusCode !== 200) {
          file.close()
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`))
        }
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', reject)
    }
    makeRequest(url)
  })
}

async function uploadToGemini(pdfPath: string): Promise<string> {
  const fileSize = fs.statSync(pdfPath).size
  const mimeType = 'application/pdf'
  const displayName = path.basename(pdfPath)
  console.log(`  Uploading ${displayName} (${(fileSize / 1024 / 1024).toFixed(1)} MB) to Gemini Files API...`)

  // Step 1: initiate resumable upload
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
        'X-Goog-Upload-Header-Content-Type': mimeType,
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  )
  if (!initRes.ok) {
    const err = await initRes.text()
    throw new Error(`Gemini upload init failed: ${initRes.status} ${err}`)
  }
  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL')!
  console.log(`  Upload URL obtained`)

  // Step 2: send file bytes
  const fileBuffer = fs.readFileSync(pdfPath)
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(fileSize),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fileBuffer,
  })
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Gemini upload PUT failed: ${uploadRes.status} ${err}`)
  }
  const uploadedFile = (await uploadRes.json()) as { file: { uri: string; state: string } }
  const fileUri = uploadedFile.file.uri
  console.log(`  Uploaded → ${fileUri}`)

  // Step 3: poll until ACTIVE
  let state = uploadedFile.file.state
  while (state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileUri.split('/v1beta/')[1]}?key=${GEMINI_API_KEY}`
    )
    const status = (await statusRes.json()) as { state: string }
    state = status.state
    console.log(`  File state: ${state}`)
  }
  if (state !== 'ACTIVE') throw new Error(`File ended in state ${state}`)
  return fileUri
}

async function extractQuestionsFromPDF(fileUri: string, year: number, sourceUrl: string): Promise<ExtractedQuestion[]> {
  console.log(`  Asking Gemini to extract questions from ${year} paper...`)

  const prompt = `This is the official UPSC Civil Services Preliminary Examination ${year} General Studies Paper I (GS1) question paper (scanned PDF).

Extract ALL 100 questions from this paper. For each question provide a JSON object with:
- question_no: integer (1-100)
- question: full verbatim question text (preserve any quoted text, data tables, etc.)
- options: object with keys "a", "b", "c", "d" each containing the full option text verbatim
- answer: the correct option letter "a", "b", "c", or "d" — use your knowledge of UPSC ${year} answer key
- explanation: 2-3 sentence explanation of why that answer is correct, with relevant facts
- subject: one of "history", "geography", "polity", "economy", "environment", "science", "current_affairs", "art_culture", "world_history"
- topic: specific topic within the subject (e.g. "ancient_history", "rivers", "constitution", "biodiversity")
- difficulty: "easy", "medium", or "hard"

Return ONLY a valid JSON array, no markdown, no extra text. Start directly with [ and end with ].
If you cannot determine the correct answer with confidence, still provide your best assessment based on UPSC preparation resources.`

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini generate failed: ${res.status} ${err.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message: string }
  }

  if (data.error) throw new Error(`Gemini error: ${data.error.message}`)

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!raw) throw new Error('Empty response from Gemini')

  // Parse JSON — strip any markdown fences if present
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  let questions: any[]
  try {
    questions = JSON.parse(jsonStr)
  } catch {
    // Try to extract JSON array from within the response
    const match = jsonStr.match(/\[[\s\S]*\]/)
    if (!match) throw new Error(`Could not parse JSON from Gemini response. Preview: ${raw.slice(0, 500)}`)
    questions = JSON.parse(match[0])
  }

  console.log(`  Extracted ${questions.length} questions`)

  return questions.map((q: any) => ({
    year,
    paper: 'gs1' as const,
    exam_type: 'prelims' as const,
    question_no: q.question_no,
    question: String(q.question || '').trim(),
    options: {
      a: String(q.options?.a || '').trim(),
      b: String(q.options?.b || '').trim(),
      c: String(q.options?.c || '').trim(),
      d: String(q.options?.d || '').trim(),
    },
    answer: (String(q.answer || 'a').toLowerCase().replace(/[^abcd]/, 'a')) as 'a' | 'b' | 'c' | 'd',
    explanation: String(q.explanation || '').trim(),
    subject: String(q.subject || 'general').trim(),
    topic: String(q.topic || 'general').trim(),
    difficulty: (['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium') as 'easy' | 'medium' | 'hard',
    source: 'upsc_official' as const,
    source_url: sourceUrl,
  }))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const allQuestions: ExtractedQuestion[] = []

  for (const paper of PAPERS) {
    const outputFile = path.join(OUTPUT_DIR, `${paper.label}.json`)
    if (fs.existsSync(outputFile)) {
      console.log(`\n⏭  ${paper.year} GS1 already extracted (${outputFile}), loading...`)
      const existing = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
      allQuestions.push(...existing)
      continue
    }

    console.log(`\n📄 Processing ${paper.year} GS Paper I`)

    // 1. Get or upload file URI
    let fileUri: string
    if (URI_CACHE[paper.label]) {
      fileUri = URI_CACHE[paper.label]
      console.log(`  Using cached URI: ${fileUri}`)
    } else {
      const pdfPath = path.join(OUTPUT_DIR, `${paper.label}.pdf`)
      try {
        await downloadFile(paper.url, pdfPath)
      } catch (e: any) {
        console.error(`  ✗ Download failed: ${e.message}`)
        continue
      }
      try {
        fileUri = await uploadToGemini(pdfPath)
        URI_CACHE[paper.label] = fileUri
        saveUriCache()
      } catch (e: any) {
        console.error(`  ✗ Gemini upload failed: ${e.message}`)
        continue
      }
    }

    // 3. Extract questions
    let questions: ExtractedQuestion[]
    try {
      questions = await extractQuestionsFromPDF(fileUri, paper.year, paper.url)
    } catch (e: any) {
      console.error(`  ✗ Extraction failed: ${e.message}`)
      continue
    }

    // 4. Save JSON
    fs.writeFileSync(outputFile, JSON.stringify(questions, null, 2))
    console.log(`  ✓ Saved ${questions.length} questions → ${outputFile}`)

    allQuestions.push(...questions)
    await new Promise(r => setTimeout(r, 2000))
  }

  // Merge into combined file
  const combined = path.join(OUTPUT_DIR, 'all_extracted.json')
  fs.writeFileSync(combined, JSON.stringify(allQuestions, null, 2))
  console.log(`\n✅ Total extracted: ${allQuestions.length} questions`)
  console.log(`   Combined file: ${combined}`)
  console.log('\n📊 Breakdown by year:')
  const byYear: Record<number, number> = {}
  for (const q of allQuestions) byYear[q.year] = (byYear[q.year] || 0) + 1
  for (const [yr, cnt] of Object.entries(byYear).sort()) console.log(`   ${yr}: ${cnt} questions`)
  console.log('\nNext: run scripts/embed-extracted-pyqs.ts to embed and insert into Supabase')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
