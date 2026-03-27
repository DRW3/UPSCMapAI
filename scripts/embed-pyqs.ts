/**
 * scripts/embed-pyqs.ts
 *
 * Reads data/pyqs/all_pyqs.json, generates Gemini text-embedding-004
 * embeddings (768-dim), and bulk-inserts into Supabase upsc_pyqs table.
 *
 * Prerequisites:
 *   1. Run scripts/scrape-pyqs.ts first
 *   2. Supabase URL + SERVICE_ROLE_KEY set in .env.local
 *   3. schema.sql applied in Supabase SQL editor
 *
 * Run:
 *   npx tsx scripts/embed-pyqs.ts
 *   npx tsx scripts/embed-pyqs.ts --batch 50 --dry-run
 */

import * as fs   from 'fs'
import * as path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import type { RawPYQ } from './scrape-pyqs'

// ── Load env vars from .env.local ─────────────────────────────────────────────
// (tsx doesn't auto-load .env.local — load manually if dotenv not installed)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

// ── Clients ───────────────────────────────────────────────────────────────────

const genAI    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// ── Embedding ─────────────────────────────────────────────────────────────────

const embModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

/** Build the text we embed — includes question + options for richer context */
function buildEmbedText(q: RawPYQ): string {
  const parts = [q.question]
  if (q.options) {
    parts.push(
      `A: ${q.options.a}`,
      `B: ${q.options.b}`,
      `C: ${q.options.c}`,
      `D: ${q.options.d}`,
    )
  }
  if (q.explanation) parts.push(q.explanation)
  parts.push(`[${q.subject} | ${q.topic}]`)
  return parts.join(' ').slice(0, 2000) // Gemini embedding input limit
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (const text of texts) {
    const res = await embModel.embedContent(text)
    results.push(res.embedding.values)
    await sleep(60)   // ~16 req/s → stay under free-tier rate limit
  }
  return results
}

// ── DB insert ─────────────────────────────────────────────────────────────────

interface DBRow {
  year         : number
  exam_type    : string
  paper        : string
  question_no  : number | null
  question     : string
  options      : object | null
  answer       : string | null
  explanation  : string | null
  subject      : string
  topic        : string
  subtopic     : string | null
  map_type     : string | null
  region       : string | null
  tags         : string[]
  difficulty   : string | null
  appearances  : number
  embedding    : number[]
  source       : string
  source_url   : string | null
}

async function insertBatch(rows: DBRow[]): Promise<number> {
  const { error, count } = await supabase
    .from('upsc_pyqs')
    .insert(rows, { count: 'exact' })

  if (error) {
    console.error('  ✕ insert error:', error.message)
    return 0
  }
  return count ?? rows.length
}

// ── Progress tracking ─────────────────────────────────────────────────────────

function loadProgress(file: string): Set<string> {
  if (!fs.existsSync(file)) return new Set()
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as string[]
  return new Set(data)
}

function saveProgress(file: string, done: Set<string>) {
  fs.writeFileSync(file, JSON.stringify(Array.from(done), null, 2))
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args     = process.argv.slice(2)
  const dryRun   = args.includes('--dry-run')
  const batchArg = args.find(a => a.startsWith('--batch='))?.split('=')[1]
    || args[args.indexOf('--batch') + 1]
  const BATCH    = parseInt(batchArg ?? '25')

  // Validate env
  if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY in .env.local')
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

  // Load scraped data
  const dataFile = path.join(process.cwd(), 'data', 'pyqs', 'all_pyqs.json')
  if (!fs.existsSync(dataFile)) {
    throw new Error('Run scripts/scrape-pyqs.ts first — data/pyqs/all_pyqs.json not found')
  }

  const rawQuestions: RawPYQ[] = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
  console.log(`\n📚 Loaded ${rawQuestions.length} questions from all_pyqs.json`)

  // Progress checkpoint — skip already embedded questions
  const progressFile = path.join(process.cwd(), 'data', 'pyqs', '.embed_progress.json')
  const done         = loadProgress(progressFile)
  const pending      = rawQuestions.filter(q => !done.has(q.question.slice(0, 60)))
  console.log(`   ${done.size} already embedded, ${pending.length} pending\n`)

  if (dryRun) {
    console.log('--dry-run: showing first 3 items, not inserting')
    pending.slice(0, 3).forEach((q, i) => {
      console.log(`\n[${i + 1}] ${q.question.slice(0, 100)}…`)
      console.log(`    subject:${q.subject}  topic:${q.topic}  map_type:${q.map_type ?? 'null'}`)
    })
    return
  }

  let total  = 0
  let errors = 0

  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH)
    const batchNum = Math.floor(i / BATCH) + 1
    const totalBatches = Math.ceil(pending.length / BATCH)
    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${chunk.length} qs)… `)

    // Generate embeddings
    let embeddings: number[][]
    try {
      const texts = chunk.map(buildEmbedText)
      embeddings  = await embedBatch(texts)
    } catch (err) {
      console.error(`\n  ✕ embedding failed:`, (err as Error).message)
      errors += chunk.length
      continue
    }

    // Build DB rows
    const rows: DBRow[] = chunk.map((q, idx) => ({
      year        : q.year ?? 0,    // 0 = year unknown (IndiaBix)
      exam_type   : q.exam_type === 'general' ? 'prelims' : q.exam_type,
      paper       : q.paper,
      question_no : null,
      question    : q.question,
      options     : q.options,
      answer      : q.answer,
      explanation : q.explanation,
      subject     : q.subject,
      topic       : q.topic,
      subtopic    : q.subtopic,
      map_type    : q.map_type,
      region      : q.region,
      tags        : Array.from(new Set(q.tags)),
      difficulty  : q.difficulty,
      appearances : 1,
      embedding   : embeddings[idx],
      source      : q.source,
      source_url  : q.source_url,
    }))

    // Insert into Supabase
    const inserted = await insertBatch(rows)
    total += inserted
    console.log(`✔ ${inserted} inserted (total: ${total})`)

    // Mark progress
    for (const q of chunk) done.add(q.question.slice(0, 60))
    saveProgress(progressFile, done)

    // Polite delay between batches
    if (i + BATCH < pending.length) await sleep(500)
  }

  console.log(`\n✅ Done — ${total} questions inserted, ${errors} errors`)
  if (errors > 0) console.log(`   Re-run the script to retry failed batches`)

  // Suggest creating vector index once we have enough rows
  const { count } = await supabase
    .from('upsc_pyqs')
    .select('*', { count: 'exact', head: true })
  console.log(`\n📊 Total rows in upsc_pyqs: ${count}`)
  if ((count ?? 0) >= 1000) {
    console.log(`\n💡 You now have ≥ 1000 rows — run this in Supabase SQL editor to enable fast ANN search:`)
    console.log(`   CREATE INDEX idx_pyqs_embedding ON upsc_pyqs`)
    console.log(`     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`)
  }
}

main().catch(err => {
  console.error('\n✕ Fatal:', err.message)
  process.exit(1)
})
