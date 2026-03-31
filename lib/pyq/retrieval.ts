/**
 * lib/pyq/retrieval.ts
 *
 * AI-generated UPSC PYQs using Groq.
 * Replaces Supabase retrieval — generates realistic UPSC-style questions
 * on-the-fly based on the map intent or topic.
 */

import Groq from 'groq-sdk'
import type { ParsedMapIntent } from '@/types'

// ── Groq client ──────────────────────────────────────────────────────────────

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

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

// ── Map map_type → subject for context ──────────────────────────────────────

function subjectFromMapType(mapType: string): string {
  if (mapType.startsWith('physical_'))      return 'geography'
  if (mapType.startsWith('political_'))     return 'geography'
  if (mapType.startsWith('historical_'))    return 'history'
  if (mapType.startsWith('economic_'))      return 'economy'
  if (mapType.startsWith('international_')) return 'geography'
  return 'general'
}

// ── AI question generation ──────────────────────────────────────────────────

async function generateQuestionsWithAI(
  topic: string,
  subject: string,
  context: string,
  count: number,
): Promise<RetrievedPYQ[]> {
  const prompt = `Generate ${count} realistic UPSC Prelims multiple-choice questions about: "${topic}"
Subject area: ${subject}
Context: ${context}

Return a JSON array of objects with this exact structure:
[
  {
    "year": <realistic year between 2015-2024>,
    "question": "<question text>",
    "options": { "a": "<option>", "b": "<option>", "c": "<option>", "d": "<option>", "correct": "<a/b/c/d>" },
    "answer": "<a/b/c/d>",
    "explanation": "<brief 1-2 sentence explanation>",
    "difficulty": "<easy/medium/hard>"
  }
]

Rules:
- Questions should be factual, exam-worthy, and test conceptual understanding
- Cover different aspects of the topic
- Make all 4 options plausible
- Keep questions concise (1-3 sentences)
- Return ONLY the JSON array, no other text`

  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a UPSC exam question paper setter. Generate authentic UPSC-style MCQs. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const text = response.choices[0]?.message?.content?.trim() || '[]'
    // Extract JSON array from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed.map((q: Record<string, unknown>, i: number) => ({
      id: Date.now() + i,
      year: (q.year as number) || 2023,
      exam_type: 'prelims',
      paper: 'gs1',
      question: (q.question as string) || '',
      options: q.options as RetrievedPYQ['options'],
      answer: (q.answer as string) || null,
      explanation: (q.explanation as string) || null,
      subject,
      topic,
      subtopic: null,
      map_type: null,
      region: null,
      tags: [topic],
      difficulty: (q.difficulty as string) || 'medium',
      appearances: 1,
      source: 'ai-generated',
      similarity: 0.9,
    }))
  } catch (err) {
    console.warn('AI question generation failed:', err)
    return []
  }
}

// ── Core retrieval (now AI-powered) ──────────────────────────────────────────

export async function fetchRelevantPYQs(
  intent: ParsedMapIntent,
  options: {
    limit?         : number
    threshold?     : number
    yearMin?       : number
    yearMax?       : number
    requireYear?   : boolean
  } = {},
): Promise<RetrievedPYQ[]> {
  const { limit = 8 } = options

  const subject = subjectFromMapType(intent.map_type)
  const topic = intent.title
  const context = [
    intent.upsc_context,
    intent.features_to_highlight?.join(', '),
    intent.region_specific,
    intent.time_period?.specific_event,
  ].filter(Boolean).join('. ')

  return generateQuestionsWithAI(topic, subject, context, Math.min(limit, 8))
}

// ── Format PYQs as markdown for the sidebar ───────────────────────────────────

export function formatPYQsMarkdown(pyqs: RetrievedPYQ[]): string {
  if (pyqs.length === 0) return ''

  const lines: string[] = ['## Practice Questions', '']

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

// ── Quick count helper (returns static estimate without DB) ────────────────

export async function countPYQsForTopic(_topic: string): Promise<number> {
  // Without a database, return a reasonable default
  return 5
}
