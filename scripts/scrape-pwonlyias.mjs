/**
 * scrape-pwonlyias.mjs
 *
 * Scrapes UPSC Prelims PYQs (2011-2024) from PWOnlyIAS using Playwright.
 * Handles two page formats:
 *   Format A: Ans + Explanation inline in HTML
 *   Format B: Ans + Explanation inside collapse <div>
 *
 * Run: /opt/homebrew/bin/node scripts/scrape-pwonlyias.mjs
 */

import pkg from '../node_modules/playwright/index.js'
import fs from 'fs'
import path from 'path'

const { chromium } = pkg

const SUBJECTS = [
  { slug: 'ancient-and-medieval-history', subject: 'history',     topic: 'ancient_medieval_history' },
  { slug: 'modern-history',               subject: 'history',     topic: 'modern_history'           },
  { slug: 'art-and-culture',              subject: 'art_culture', topic: 'art_culture'              },
  { slug: 'geography',                    subject: 'geography',   topic: 'geography'                },
  { slug: 'environment-and-ecology',      subject: 'environment', topic: 'environment_ecology'      },
  { slug: 'indian-economy',               subject: 'economy',     topic: 'indian_economy'           },
  { slug: 'indian-polity',                subject: 'polity',      topic: 'indian_polity'            },
  { slug: 'science-technology',           subject: 'science',     topic: 'science_technology'       },
]

const OUTPUT_DIR = path.resolve('data/pyqs/scraped')
const COMBINED_FILE = path.resolve('data/pyqs/all_scraped.json')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// ── HTML helpers ────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Parse all questions from a subject page ─────────────────────────────────

function parseQuestionsFromHTML(html, subject, topic, slug) {
  const results = []

  // Split by year headers: <p>...2024...</p> or <h2>2024</h2>
  // A year header is a standalone 4-digit year (2010-2025) in a tag
  const yearSplitPattern = /<(?:p|h[2-5]|strong)[^>]*>\s*(?:<(?:strong|b|span)[^>]*>)?\s*(20[12][0-9])\s*(?:<\/(?:strong|b|span)>)?\s*<\/(?:p|h[2-5]|strong)>/gi
  const yearMatches = [...html.matchAll(yearSplitPattern)]

  let sections = []
  if (yearMatches.length > 0) {
    for (let i = 0; i < yearMatches.length; i++) {
      const year = parseInt(yearMatches[i][1])
      const start = yearMatches[i].index
      const end = i + 1 < yearMatches.length ? yearMatches[i + 1].index : html.length
      sections.push({ year, html: html.slice(start, end) })
    }
  } else {
    // Fallback: try to detect years inline per question
    sections = [{ year: 0, html }]
  }

  for (const { year, html: sectionHtml } of sections) {
    const questions = parseQuestionsInSection(sectionHtml, year, subject, topic, slug)
    results.push(...questions)
  }

  return results
}

function parseQuestionsInSection(html, year, subject, topic, slug) {
  const results = []

  // Split into individual question blocks
  // "Question N" appears in a <p> tag
  const qSplitPattern = /<p[^>]*>\s*(?:<[^>]*>)*\s*Question\s+(\d+)\s*(?:<\/[^>]*>)*\s*<\/p>/gi
  const qMatches = [...html.matchAll(qSplitPattern)]

  for (let i = 0; i < qMatches.length; i++) {
    const qNum = parseInt(qMatches[i][1])
    const start = qMatches[i].index
    const end = i + 1 < qMatches.length ? qMatches[i + 1].index : html.length
    const qBlock = html.slice(start, end)

    const parsed = parseOneQuestion(qBlock, qNum, year, subject, topic, slug)
    if (parsed) results.push(parsed)
  }

  return results
}

function parseOneQuestion(block, qNum, year, subject, topic, slug) {
  // ── Extract question text ──────────────────────────────────────────────────
  // Find option (a) position — everything before it is the question + header
  const optAIdx = block.search(/\(a\)\s/i)
  if (optAIdx < 0) return null

  const beforeOpts = block.slice(0, optAIdx)
  // Remove "Question N" header from beginning
  const questionRaw = beforeOpts.replace(/<p[^>]*>\s*(?:<[^>]*>)*\s*Question\s+\d+\s*(?:<\/[^>]*>)*\s*<\/p>/i, '')
  const questionText = stripHtml(questionRaw).trim()
  if (!questionText || questionText.length < 5) return null

  // ── Determine option terminator pattern ────────────────────────────────────
  // Option d ends at:
  //   - <a ... collapse (Format B — collapse button)
  //   - <p><b>Ans: (Format A — inline answer)
  //   - end of block
  const optTerminator = /(?=<a[^>]*collapse|<p[^>]*>\s*<b>\s*Ans\s*:|<p[^>]*>\s*<strong>\s*Ans\s*:)/i

  const afterOpts = block.slice(optAIdx)
  const termIdx = afterOpts.search(optTerminator)
  const optHtml = termIdx >= 0 ? afterOpts.slice(0, termIdx) : afterOpts

  // Match all 4 options
  const optMatch = optHtml.match(/\(a\)\s*([\s\S]*?)\s*\(b\)\s*([\s\S]*?)\s*\(c\)\s*([\s\S]*?)\s*\(d\)\s*([\s\S]*)/i)
  if (!optMatch) return null

  const options = {
    a: stripHtml(optMatch[1]).trim(),
    b: stripHtml(optMatch[2]).trim(),
    c: stripHtml(optMatch[3]).trim(),
    d: stripHtml(optMatch[4]).trim(),
  }

  // ── Extract answer & explanation ───────────────────────────────────────────
  let answer = ''
  let explanation = ''

  // Format A: inline <p><b>Ans: X</b></p>
  const directAnsMatch = block.match(/<(?:p|div)[^>]*>\s*<(?:b|strong)>\s*Ans\s*:\s*([A-Da-d])\s*<\/(?:b|strong)>/i)
  if (directAnsMatch) {
    answer = directAnsMatch[1].toLowerCase()
    // Explanation follows Ans
    const expMatch = block.match(/<(?:b|strong)>\s*Explanation\s*:\s*<\/(?:b|strong)>([\s\S]*?)(?=<p[^>]*>\s*(?:<[^>]*>)*\s*Question\s+\d+|$)/i)
    if (expMatch) explanation = stripHtml(expMatch[1]).trim().slice(0, 1200)
  }

  // Format B: collapse div with Ans: and Exp:
  if (!answer) {
    const collapseMatch = block.match(/id="collapseExample\d+"[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
    if (collapseMatch) {
      const inner = collapseMatch[1]
      const ansMatch = inner.match(/<(?:b|strong)>\s*Ans\s*:\s*([A-Da-d])\s*<\/(?:b|strong)>/i)
      if (ansMatch) answer = ansMatch[1].toLowerCase()
      const expMatch = inner.match(/<(?:b|strong)>\s*Exp\s*:\s*<\/(?:b|strong)>([\s\S]*?)$/)
      if (expMatch) explanation = stripHtml(expMatch[1]).trim().slice(0, 1200)
      // Also try "Explanation:" label in collapse
      if (!explanation) {
        const expMatch2 = inner.match(/<(?:b|strong)>\s*Explanation\s*:\s*<\/(?:b|strong)>([\s\S]*?)$/)
        if (expMatch2) explanation = stripHtml(expMatch2[1]).trim().slice(0, 1200)
      }
    }
  }

  // If still no answer, try plain text Ans: pattern
  if (!answer) {
    const plainAns = block.match(/Ans\s*:\s*([A-Da-d])/i)
    if (plainAns) answer = plainAns[1].toLowerCase()
  }

  if (!answer) answer = 'a' // fallback

  return {
    year,
    paper: 'gs1',
    exam_type: 'prelims',
    question_no: qNum,
    question: questionText,
    options,
    answer,
    explanation,
    subject,
    topic,
    difficulty: 'medium',
    source: 'pwonlyias',
    source_url: `https://pwonlyias.com/prelims-previous-years-paper/${slug}/`,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 900 },
})

const allQuestions = []
const FORCE_RESCRAPE = process.argv.includes('--force')

for (const { slug, subject, topic } of SUBJECTS) {
  const outputFile = path.join(OUTPUT_DIR, `pwonly_${slug}.json`)

  if (!FORCE_RESCRAPE && fs.existsSync(outputFile)) {
    console.log(`\n⏭  ${slug} already scraped, loading...`)
    const existing = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
    allQuestions.push(...existing)
    console.log(`   Loaded ${existing.length} questions`)
    continue
  }

  console.log(`\n🔍 Scraping: ${slug}`)
  const url = `https://pwonlyias.com/prelims-previous-years-paper/${slug}/`

  const page = await context.newPage()
  let html = ''
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 })
    await page.waitForTimeout(5000)

    const optCount = await page.evaluate(() => (document.body.innerText.match(/\(a\)/gi) || []).length)
    console.log(`  (a) count in rendered text: ${optCount}`)

    if (optCount < 3) {
      console.log(`  WARNING: Very few options found — skipping`)
      await page.close()
      continue
    }

    html = await page.content()
    console.log(`  HTML size: ${(html.length / 1024).toFixed(0)}KB`)
  } catch (e) {
    console.error(`  ERROR: ${e.message}`)
    await page.close()
    continue
  }
  await page.close()

  // Save raw HTML for debugging
  fs.writeFileSync(path.join('/tmp', `pwonly_${slug}.html`), html)

  const questions = parseQuestionsFromHTML(html, subject, topic, slug)
  console.log(`  Parsed: ${questions.length} questions`)

  if (questions.length === 0) {
    console.log(`  WARNING: No questions — check /tmp/pwonly_${slug}.html`)
    continue
  }

  // Validate sample
  const sample = questions[0]
  console.log(`  Sample Q1 (${sample.year}): "${sample.question.slice(0, 60)}..." → Ans: ${sample.answer}`)

  const byYear = {}
  for (const q of questions) byYear[q.year] = (byYear[q.year] || 0) + 1
  for (const [yr, cnt] of Object.entries(byYear).sort()) {
    console.log(`    ${yr}: ${cnt} questions`)
  }

  fs.writeFileSync(outputFile, JSON.stringify(questions, null, 2))
  console.log(`  ✓ Saved → ${outputFile}`)
  allQuestions.push(...questions)

  await new Promise(r => setTimeout(r, 2000))
}

await browser.close()

// Combine with extracted PDFs if present
const extractedFile = path.resolve('data/pyqs/extracted/all_extracted.json')
if (fs.existsSync(extractedFile)) {
  const extracted = JSON.parse(fs.readFileSync(extractedFile, 'utf8'))
  console.log(`\n📄 Adding ${extracted.length} PDF-extracted questions`)
  allQuestions.push(...extracted)
}

// Deduplicate by year+question_no+first-30-chars-of-question
const seen = new Set()
const deduped = allQuestions.filter(q => {
  const key = `${q.year}_${q.question_no}_${q.question.slice(0, 30)}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

fs.writeFileSync(COMBINED_FILE, JSON.stringify(deduped, null, 2))
console.log(`\n✅ Total after dedup: ${deduped.length} questions (from ${allQuestions.length})`)
console.log(`   Combined: ${COMBINED_FILE}`)

const bySubject = {}
for (const q of deduped) bySubject[q.subject] = (bySubject[q.subject] || 0) + 1
console.log('\n📊 Breakdown by subject:')
for (const [s, c] of Object.entries(bySubject).sort()) console.log(`   ${s}: ${c}`)

console.log('\nNext: run scripts/embed-all-pyqs.mjs to embed and insert into Supabase')
