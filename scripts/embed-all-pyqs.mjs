/**
 * embed-all-pyqs.mjs
 *
 * Reads data/pyqs/all_scraped.json, generates Gemini embeddings,
 * and upserts into Supabase upsc_pyqs table.
 *
 * Run: /opt/homebrew/bin/node scripts/embed-all-pyqs.mjs
 */

import fs from 'fs'
import path from 'path'

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.resolve('.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing env vars: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

// ── Config ────────────────────────────────────────────────────────────────────
const EMBED_MODEL = 'gemini-embedding-001'
const BATCH_SIZE = 5
const INPUT_FILE = path.resolve('data/pyqs/all_scraped.json')
const PROGRESS_FILE = path.resolve('data/pyqs/.all_embed_progress.json')

// ── Helpers ───────────────────────────────────────────────────────────────────

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  )
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.embedding.values
}

function loadProgress() {
  try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))) } catch { return new Set() }
}
function saveProgress(done) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(Array.from(done)))
}

// ── Check existing rows to avoid duplicates ───────────────────────────────────
async function getExistingKeys() {
  const keys = new Set()
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('upsc_pyqs')
      .select('year, question_no, source, subject')
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) {
      keys.add(`${row.source}_${row.year}_${row.subject}_${row.question_no}`)
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  return keys
}

// ── Main ──────────────────────────────────────────────────────────────────────

const questions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
console.log(`Loaded ${questions.length} questions from ${INPUT_FILE}`)

console.log('Checking existing rows in Supabase...')
const existingKeys = await getExistingKeys()
console.log(`Existing rows in DB: ${existingKeys.size}`)

const done = loadProgress()
const remaining = questions.filter(q => {
  const key = `${q.source}_${q.year}_${q.subject}_${q.question_no}`
  return !done.has(key) && !existingKeys.has(key)
})
console.log(`Already embedded: ${done.size} | Remaining: ${remaining.length}`)

let inserted = 0
let errors = 0

for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
  const batch = remaining.slice(i, i + BATCH_SIZE)

  for (const q of batch) {
    const progressKey = `${q.source}_${q.year}_${q.subject}_${q.question_no}`
    if (done.has(progressKey) || existingKeys.has(progressKey)) continue

    const embedText = [
      q.question,
      q.options?.a || '',
      q.options?.b || '',
      q.options?.c || '',
      q.options?.d || '',
    ].join(' ').slice(0, 2000)

    let embedding
    try {
      embedding = await embed(embedText)
    } catch (e) {
      console.error(`  Embed error Q${q.question_no} ${q.year} ${q.subject}: ${e.message}`)
      errors++
      await new Promise(r => setTimeout(r, 2000))
      continue
    }

    const row = {
      year: q.year || 0,
      exam_type: q.exam_type || 'prelims',
      paper: q.paper || 'gs1',
      question_no: q.question_no || null,
      question: q.question,
      options: q.options || {},
      answer: q.answer || 'a',
      explanation: q.explanation || null,
      subject: q.subject || 'general',
      topic: q.topic || 'general',
      subtopic: null,
      map_type: null,
      region: null,
      tags: [q.subject, q.topic, 'upsc', 'prelims', String(q.year)].filter(Boolean),
      difficulty: q.difficulty || 'medium',
      appearances: 1,
      embedding,
      source: q.source || 'pwonlyias',
      source_url: q.source_url || '',
    }

    const { error } = await supabase.from('upsc_pyqs').insert(row)
    if (error) {
      console.error(`  Insert error Q${q.question_no} ${q.year}: ${error.message}`)
      errors++
    } else {
      done.add(progressKey)
      existingKeys.add(progressKey)
      inserted++
    }

    await new Promise(r => setTimeout(r, 300))
  }

  saveProgress(done)
  if ((i / BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= remaining.length) {
    console.log(`Progress: ${i + Math.min(BATCH_SIZE, remaining.length - i)}/${remaining.length} | Inserted: ${inserted} | Errors: ${errors}`)
  }
}

console.log(`\n✅ Done. Inserted ${inserted} new questions. Errors: ${errors}`)

const { count } = await supabase.from('upsc_pyqs').select('*', { count: 'exact', head: true })
console.log(`   Total rows in upsc_pyqs: ${count}`)
