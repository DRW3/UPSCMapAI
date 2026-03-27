/**
 * embed-extracted-pyqs.ts
 *
 * Reads data/pyqs/extracted/all_extracted.json,
 * generates embeddings via Gemini, and upserts into Supabase upsc_pyqs table.
 *
 * Run: npx tsx scripts/embed-extracted-pyqs.ts
 */

import fs from 'fs'
import path from 'path'

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY')
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

// ── Config ────────────────────────────────────────────────────────────────────
const EMBED_MODEL = 'gemini-embedding-001'
const BATCH_SIZE = 5
const INPUT_FILE = path.resolve(process.cwd(), 'data/pyqs/extracted/all_extracted.json')
const PROGRESS_FILE = path.resolve(process.cwd(), 'data/pyqs/.extracted_embed_progress.json')

// ── Helpers ───────────────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
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
  const data = (await res.json()) as { embedding: { values: number[] } }
  return data.embedding.values
}

function loadProgress(): Set<string> {
  try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))) } catch { return new Set() }
}
function saveProgress(done: Set<string>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(Array.from(done)))
}

// ── Main ──────────────────────────────────────────────────────────────────────
const questions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8')) as any[]
console.log(`Loaded ${questions.length} extracted questions`)

const done = loadProgress()
const remaining = questions.filter(q => !done.has(`${q.year}_${q.question_no}`))
console.log(`Already embedded: ${done.size} | Remaining: ${remaining.length}`)

let inserted = 0
for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
  const batch = remaining.slice(i, i + BATCH_SIZE)

  for (const q of batch) {
    const key = `${q.year}_${q.question_no}`
    if (done.has(key)) continue

    const embedText = `${q.question} ${q.options.a} ${q.options.b} ${q.options.c} ${q.options.d}`.slice(0, 2000)
    let embedding: number[]
    try {
      embedding = await embed(embedText)
    } catch (e: any) {
      console.error(`  Embed error for Q${q.question_no} ${q.year}: ${e.message}`)
      await new Promise(r => setTimeout(r, 2000))
      continue
    }

    const row = {
      year: q.year,
      exam_type: 'prelims',
      paper: q.paper || 'gs1',
      question: q.question,
      options: q.options,
      answer: q.answer,
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
      source: 'upsc_official',
      source_url: q.source_url || '',
    }

    const { error } = await supabase.from('upsc_pyqs').insert(row)
    if (error) {
      console.error(`  Insert error Q${q.question_no} ${q.year}: ${error.message}`)
    } else {
      done.add(key)
      inserted++
    }

    await new Promise(r => setTimeout(r, 300))
  }

  saveProgress(done)
  console.log(`Progress: ${done.size}/${questions.length} | Inserted this run: ${inserted}`)
}

console.log(`\n✅ Done. Inserted ${inserted} new questions into Supabase.`)
const { count } = await supabase.from('upsc_pyqs').select('*', { count: 'exact', head: true })
console.log(`   Total rows in upsc_pyqs: ${count}`)
