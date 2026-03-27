/**
 * lib/pyq/retrieval.ts
 *
 * Semantic + keyword retrieval of UPSC PYQs from Supabase.
 * Called from app/api/map/route.ts and app/api/details/route.ts to enrich
 * map notes with real past questions.
 */

import { createServerClient } from '@/lib/supabase/server'
import type { ParsedMapIntent } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetrievedPYQ {
  id         : number
  year       : number
  exam_type  : string
  paper      : string
  question   : string
  options    : { a: string; b: string; c: string; d: string; correct?: string } | null
  answer     : string | null
  explanation: string | null
  subject    : string
  topic      : string
  subtopic   : string | null
  map_type   : string | null
  region     : string | null
  tags       : string[]
  difficulty : string | null
  appearances: number
  source     : string
  similarity : number
}

// ── Embedding ─────────────────────────────────────────────────────────────────
// Semantic embeddings are disabled: the Supabase PYQ data was indexed with
// Gemini vectors; switching providers would produce incorrect similarity scores.
// fetchRelevantPYQs falls back to keyword search automatically.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function embedText(_text: string): Promise<number[]> {
  throw new Error('Semantic embeddings not available — using keyword fallback')
}

// ── Build query text from map intent ─────────────────────────────────────────

function buildQueryText(intent: ParsedMapIntent): string {
  const parts: string[] = [intent.title, intent.upsc_context]

  if (intent.features_to_highlight?.length) {
    parts.push(intent.features_to_highlight.join(', '))
  }
  if (intent.region_specific) {
    parts.push(intent.region_specific)
  }
  if (intent.time_period?.specific_event) {
    parts.push(intent.time_period.specific_event)
  }

  return parts.filter(Boolean).join('. ')
}

// ── Map map_type → subject filter for tighter retrieval ──────────────────────

function subjectFromMapType(mapType: string): string | null {
  if (mapType.startsWith('physical_'))      return 'geography'
  if (mapType.startsWith('political_'))     return 'geography'
  if (mapType.startsWith('historical_'))    return 'history'
  if (mapType.startsWith('economic_'))      return 'economy'
  if (mapType.startsWith('international_')) return 'geography'
  if (mapType.startsWith('thematic_'))      return null  // broad — don't restrict
  return null
}

// ── Core retrieval ────────────────────────────────────────────────────────────

export async function fetchRelevantPYQs(
  intent: ParsedMapIntent,
  options: {
    limit?         : number
    threshold?     : number
    yearMin?       : number   // e.g. 2014 for last-decade-only
    yearMax?       : number
    requireYear?   : boolean  // if true, skip questions with year = 0 (untagged)
  } = {},
): Promise<RetrievedPYQ[]> {
  const {
    limit       = 8,
    threshold   = 0.55,
    yearMin,
    yearMax,
    requireYear = false,
  } = options

  // Build embedding from intent
  const queryText = buildQueryText(intent)
  let embedding: number[]
  try {
    embedding = await embedText(queryText)
  } catch {
    // If embedding fails (quota / network), fall back to keyword search
    return keywordFallback(intent, limit)
  }

  const supabase = createServerClient()
  const subject  = subjectFromMapType(intent.map_type)

  const { data, error } = await supabase.rpc('search_pyqs', {
    query_embedding  : embedding,
    match_threshold  : threshold,
    match_count      : limit * 2,          // fetch extra, then filter
    filter_subject   : subject ?? null,
    filter_map_type  : intent.map_type,
    filter_year_min  : yearMin ?? null,
    filter_year_max  : yearMax ?? null,
  })

  if (error || !data) {
    console.warn('PYQ retrieval error:', error?.message)
    return keywordFallback(intent, limit)
  }

  let results = data as RetrievedPYQ[]

  if (requireYear) {
    results = results.filter(q => q.year > 0)
  }

  // Deduplicate very similar questions (similarity within 0.03 of each other)
  const deduped: RetrievedPYQ[] = []
  for (const q of results) {
    const isDup = deduped.some(prev =>
      prev.question.slice(0, 60).toLowerCase() === q.question.slice(0, 60).toLowerCase()
    )
    if (!isDup) deduped.push(q)
    if (deduped.length >= limit) break
  }

  return deduped
}

// ── Keyword fallback (when embeddings unavailable) ────────────────────────────

async function keywordFallback(
  intent: ParsedMapIntent,
  limit: number,
): Promise<RetrievedPYQ[]> {
  const supabase = createServerClient()
  const keywords = [
    ...(intent.features_to_highlight ?? []),
    intent.region_specific ?? '',
    intent.time_period?.specific_event ?? '',
  ].filter(Boolean)

  if (keywords.length === 0) return []

  // Full-text search on the question field
  const query = keywords.join(' & ')

  const { data, error } = await supabase
    .from('upsc_pyqs')
    .select('id,year,exam_type,paper,question,options,answer,explanation,subject,topic,subtopic,map_type,region,tags,difficulty,appearances,source')
    .textSearch('question', query, { type: 'websearch', config: 'english' })
    .eq('map_type', intent.map_type)
    .order('appearances', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return (data as unknown as RetrievedPYQ[]).map(q => ({ ...q, similarity: 0 }))
}

// ── Format PYQs as markdown for the sidebar ───────────────────────────────────

export function formatPYQsMarkdown(pyqs: RetrievedPYQ[]): string {
  if (pyqs.length === 0) return ''

  const lines: string[] = ['## Previous Year Questions', '']

  for (const q of pyqs) {
    const yearLabel = q.year > 0 ? `${q.year}` : 'Year N/A'
    const examLabel = q.exam_type === 'prelims' ? 'Prelims' : 'Mains'
    const diff      = q.difficulty
      ? ` · ${q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}`
      : ''

    lines.push(`**[${yearLabel} ${examLabel}${diff}]**`)
    lines.push(q.question)

    if (q.options) {
      lines.push(
        `- (A) ${q.options.a}`,
        `- (B) ${q.options.b}`,
        `- (C) ${q.options.c}`,
        `- (D) ${q.options.d}`,
      )
    }

    if (q.answer) {
      const ans = q.answer.length === 1
        ? `**Answer: (${q.answer.toUpperCase()})**`
        : `**Answer:** ${q.answer}`
      lines.push(ans)
    }

    if (q.explanation) {
      lines.push(`> ${q.explanation.slice(0, 280)}${q.explanation.length > 280 ? '…' : ''}`)
    }

    lines.push('')  // blank line between questions
  }

  return lines.join('\n')
}

// ── Quick count helper (for pyq_count badge on markers) ──────────────────────

export async function countPYQsForTopic(topic: string): Promise<number> {
  const supabase = createServerClient()
  const { count, error } = await supabase
    .from('upsc_pyqs')
    .select('*', { count: 'exact', head: true })
    .or(`topic.eq.${topic},tags.cs.{${topic}}`)

  if (error) return 0
  return count ?? 0
}
