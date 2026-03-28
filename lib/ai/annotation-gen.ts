import Groq from 'groq-sdk'
import type { ParsedMapIntent } from '@/types'
import type { RetrievedPYQ } from '@/lib/pyq/retrieval'

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

const UPSC_SYSTEM_INSTRUCTION_WITH_PYQS = `You are an expert UPSC teacher writing concise, exam-focused geographical and historical notes.
Format your response in Markdown with these exact sections:
## Overview
Brief explanation of what this map shows (2-3 sentences).

## Key Features
Bullet points of important features visible on the map and why they matter.

## UPSC Significance
Specific exam relevance — which papers, topics, trends.

## Past Year Questions (PYQs)
Use ONLY the real PYQs provided in the prompt — copy them verbatim, do NOT invent questions.

## Key Facts to Remember
5-7 bullet points of high-yield facts for quick revision.

Keep total length under 600 words. Use precise facts, years, and figures. Avoid fluff.`

const UPSC_SYSTEM_INSTRUCTION_NO_PYQS = `You are an expert UPSC teacher writing concise, exam-focused geographical and historical notes.
Format your response in Markdown with these sections:
## Overview
Brief explanation of what this map shows (2-3 sentences).

## Key Features
Bullet points of important features visible on the map and why they matter.

## UPSC Significance
Specific exam relevance — which papers, topics, trends.

## Key Facts to Remember
5-7 bullet points of high-yield facts for quick revision.

Keep total length under 500 words. Use precise facts, years, and figures. Avoid fluff.`

function formatPYQsForPrompt(pyqs: RetrievedPYQ[]): string {
  return pyqs.map(q => {
    const yearLabel = q.year > 0 ? `${q.year} Prelims` : 'Prelims'
    const diff = q.difficulty ? ` · ${q.difficulty}` : ''
    let text = `**[${yearLabel}${diff}]** ${q.question}`
    if (q.options) {
      text += `\n  (A) ${q.options.a}  (B) ${q.options.b}  (C) ${q.options.c}  (D) ${q.options.d}`
    }
    if (q.answer) text += `\n  **Answer: (${q.answer.toUpperCase()})**`
    if (q.explanation) text += `\n  _${q.explanation.slice(0, 200)}${q.explanation.length > 200 ? '…' : ''}_`
    return text
  }).join('\n\n')
}

function buildPrompt(intent: ParsedMapIntent, pyqs: RetrievedPYQ[]): string {
  const base = `Generate UPSC study notes for this map:
Title: ${intent.title}
Map Type: ${intent.map_type}
Region: ${intent.region_scope}${intent.region_specific ? ` (${intent.region_specific})` : ''}
${intent.time_period?.era ? `Era: ${intent.time_period.era}` : ''}
${intent.time_period?.specific_event ? `Event: ${intent.time_period.specific_event}` : ''}
Features shown: ${intent.features_to_show.join(', ')}
UPSC Context: ${intent.upsc_context}
Topics to cover: ${intent.sidebar_topics.join(', ')}`

  if (pyqs.length === 0) return base

  return `${base}

REAL PAST YEAR QUESTIONS (use these verbatim in the PYQs section — do NOT modify or invent):
${formatPYQsForPrompt(pyqs)}`
}

/** Stream UPSC notes for a given map intent, enriched with real PYQs from Supabase */
export async function* streamAnnotations(
  intent: ParsedMapIntent,
  pyqs: RetrievedPYQ[] = [],
): AsyncGenerator<string> {
  const groqStream = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    stream: true,
    messages: [
      {
        role: 'system',
        content: pyqs.length > 0
          ? UPSC_SYSTEM_INSTRUCTION_WITH_PYQS
          : UPSC_SYSTEM_INSTRUCTION_NO_PYQS,
      },
      { role: 'user', content: buildPrompt(intent, pyqs) },
    ],
  })

  for await (const chunk of groqStream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

/** Non-streaming version for use cases that need full text */
export async function generateAnnotations(
  intent: ParsedMapIntent,
  pyqs: RetrievedPYQ[] = [],
): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of streamAnnotations(intent, pyqs)) {
    chunks.push(chunk)
  }
  return chunks.join('')
}
