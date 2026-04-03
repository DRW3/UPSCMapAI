/**
 * app/api/journey/pyqs/route.ts
 *
 * Returns UPSC PYQs for a learning journey topic.
 * Strategy: Query Supabase first → fall back to AI generation if needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TOPIC_KEYWORD_MAP } from '@/data/topic-keyword-map'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

// ── Topic display names for AI fallback prompts ─────────────────────────────

const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  'prehistoric-india':         'Prehistoric India (Palaeolithic, Mesolithic, Neolithic)',
  'indus-valley':              'Indus Valley Civilization',
  'vedic-age':                 'Vedic Age and Upanishads',
  'buddhism-jainism':          'Buddhism and Jainism',
  'mahajanapadas':             'Mahajanapadas and Early Republics',
  'mauryan-empire':            'Mauryan Empire (Chandragupta, Ashoka)',
  'post-mauryan':              'Post-Mauryan Period (Kushanas, Satavahanas)',
  'gupta-empire':              'Gupta Empire and Classical India',
  'south-india-ancient':       'Ancient South India (Pallavas, Chalukyas, Cholas)',
  'rajput-kingdoms':           'Rajput Kingdoms',
  'arab-turkish-invasions':    'Arab and Turkish Invasions',
  'chola-maritime':            'Chola Maritime Empire',
  'slave-dynasty':             'Delhi Sultanate – Slave Dynasty',
  'khalji-tughlaq':            'Khalji and Tughlaq Dynasties',
  'vijayanagara-bahmani':      'Vijayanagara and Bahmani Kingdoms',
  'akbar':                     'Akbar and Mughal Administration',
  'aurangzeb':                 'Aurangzeb and Mughal Decline',
  'bhakti-movement':           'Bhakti Movement',
  'sufi-movement':             'Sufi Movement',
  'maratha-empire':            'Maratha Empire',
  'european-trade':            'European Trading Companies in India',
  'battle-plassey-buxar':      'Battle of Plassey and Buxar',
  'british-expansion':         'British Expansion in India',
  'colonial-economy-impact':   'Colonial Economy and Its Impact',
  'socioreligious-reforms':    'Socio-Religious Reform Movements',
  'revolt-1857':               'Revolt of 1857',
  'early-nationalism':         'Rise of Indian Nationalism',
  'gandhian-era':              'Gandhian Era and National Movement',
  'independence-partition':    'Independence and Partition',
  'himalayas':                 'The Himalayan Region',
  'deccan-plateau':            'Deccan Plateau and Peninsular India',
  'northern-plains':           'Northern Plains of India',
  'rivers-drainage':           'Rivers and Drainage Systems',
  'climate-india':             'Climate of India',
  'soils-vegetation':          'Soils and Natural Vegetation',
  'agriculture-geo':           'Agricultural Geography',
  'minerals-resources':        'Minerals and Resources',
  'ocean-currents':            'Ocean Currents and Oceanography',
  'making-constitution':       'Making of the Indian Constitution',
  'fundamental-rights':        'Fundamental Rights',
  'dpsp-duties':               'Directive Principles and Fundamental Duties',
  'federal-structure':         'Federal Structure of India',
  'parliament':                'Indian Parliament',
  'judiciary':                 'Indian Judiciary',
  'local-government':          'Panchayati Raj and Local Government',
  'planning-development':      'Planning and Development',
  'fiscal-monetary':           'Fiscal and Monetary Policy',
  'poverty-inequality':        'Poverty and Inequality',
  'agriculture-economy':       'Agricultural Economy',
  'banking-finance':           'Banking and Finance',
  'biodiversity-conservation': 'Biodiversity and Conservation',
  'protected-areas':           'Protected Areas and Wildlife',
  'climate-change':            'Climate Change',
  'pollution':                 'Pollution and Environmental Degradation',
  'renewable-energy':          'Renewable Energy',
  'isro-space':                'ISRO and Space Technology',
  'ai-biotech':                'AI and Biotechnology',
  'defense-tech':              'Defense Technology',
}

const SUBJECT_MAP: Record<string, string> = {
  'ancient-history':   'Ancient Indian History',
  'medieval-history':  'Medieval Indian History',
  'modern-history':    'Modern Indian History',
  'geography':         'Indian and World Geography',
  'polity':            'Indian Polity and Governance',
  'economy':           'Indian Economy',
  'environment':       'Environment and Ecology',
  'science-tech':      'Science and Technology',
  'ethics':            'Ethics, Integrity and Aptitude',
  'society':           'Indian Society and Culture',
  'art-culture':       'Art and Culture',
  'world-history':     'World History',
  'post-independence': 'Post-Independence India',
  'csat':              'CSAT — Civil Services Aptitude Test',
  'essay':             'Essay Paper',
  'current-affairs':   'Current Affairs and Analysis',
  'general-science':   'General Science for Prelims',
}

// ── Supabase PYQ retrieval ──────────────────────────────────────────────────

interface DbPYQ {
  id: number
  year: number
  question: string
  options: { a: string; b: string; c: string; d: string; correct?: string } | null
  answer: string | null
  explanation: string | null
  subject: string
  topic: string
  difficulty: string | null
  source: string
}

async function fetchFromSupabase(
  topicId: string,
  subjectId: string,
  limit: number
): Promise<DbPYQ[]> {
  const supabase = createServerClient()
  const mapping = TOPIC_KEYWORD_MAP[topicId]

  if (!mapping) {
    // No keyword mapping — try a broad subject query
    const dbSubjects = subjectIdToDbSubjects(subjectId)
    const { data } = await supabase
      .from('upsc_pyqs')
      .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
      .in('subject', dbSubjects)
      .not('options', 'is', null)
      .not('answer', 'is', null)
      .limit(limit * 3)

    if (data && data.length > 0) {
      return shuffleAndPick(data as DbPYQ[], limit)
    }
    return []
  }

  // Build keyword search: use ilike for each keyword with OR
  const keywords = mapping.keywords
  const dbSubjects = mapping.dbSubjects

  // Strategy 1: Full-text search on question field with subject filter
  const keywordPattern = keywords.slice(0, 8).map(k => `%${k}%`)

  let query = supabase
    .from('upsc_pyqs')
    .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
    .in('subject', dbSubjects)
    .not('options', 'is', null)
    .not('answer', 'is', null)

  // Build OR filter for keywords
  const orConditions = keywordPattern.map(pat => `question.ilike.${pat}`).join(',')
  query = query.or(orConditions)

  const { data, error } = await query.limit(limit * 4)

  if (error) {
    console.error('Supabase query error:', error.message)
    return []
  }

  if (data && data.length >= 3) {
    return shuffleAndPick(data as DbPYQ[], limit)
  }

  // Strategy 2: Fallback subjects if not enough results
  if (mapping.fallbackSubjects && mapping.fallbackSubjects.length > 0) {
    const fallbackQuery = supabase
      .from('upsc_pyqs')
      .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
      .in('subject', mapping.fallbackSubjects)
      .not('options', 'is', null)
      .not('answer', 'is', null)
      .or(orConditions)
      .limit(limit * 3)

    const { data: fallbackData } = await fallbackQuery

    const combined = [...(data || []), ...(fallbackData || [])]
    // Dedupe by ID
    const seen = new Set<number>()
    const unique = combined.filter(q => {
      if (seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })

    if (unique.length >= 3) {
      return shuffleAndPick(unique as DbPYQ[], limit)
    }
  }

  // Strategy 3: Broader subject-only query (no keyword filter)
  if ((data?.length || 0) < 3) {
    const broadQuery = supabase
      .from('upsc_pyqs')
      .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
      .in('subject', dbSubjects)
      .not('options', 'is', null)
      .not('answer', 'is', null)
      .limit(limit * 3)

    const { data: broadData } = await broadQuery
    if (broadData && broadData.length > 0) {
      return shuffleAndPick(broadData as DbPYQ[], limit)
    }
  }

  return data ? shuffleAndPick(data as DbPYQ[], limit) : []
}

function subjectIdToDbSubjects(subjectId: string): string[] {
  const map: Record<string, string[]> = {
    'ancient-history':   ['history'],
    'medieval-history':  ['history'],
    'modern-history':    ['history'],
    'world-history':     ['history'],
    'post-independence': ['history'],
    'geography':         ['geography'],
    'polity':            ['polity'],
    'economy':           ['economy'],
    'environment':       ['environment'],
    'science-tech':      ['science'],
    'society':           ['history', 'art_culture'],
    'ethics':            ['polity'],
    'csat':              ['general'],
    'essay':             ['general'],
    'current-affairs':   ['current_affairs'],
    'general-science':   ['science'],
  }
  return map[subjectId] || ['general']
}

function isValidQuestion(q: DbPYQ): boolean {
  if (!q.options || !q.answer) return false
  const opts = q.options
  // All 4 options must exist and be reasonable length
  if (!opts.a || !opts.b || !opts.c || !opts.d) return false
  // Reject if any option is too short (< 2 chars) or absurdly long (> 500 chars)
  for (const val of [opts.a, opts.b, opts.c, opts.d]) {
    if (val.length < 2 || val.length > 500) return false
  }
  // Reject if options look like fragments of question text
  const qLen = q.question.length
  if (opts.b.length > qLen * 0.8 || opts.d.length > qLen * 0.8) return false
  // Answer must be a/b/c/d
  if (!['a', 'b', 'c', 'd'].includes(q.answer.toLowerCase())) return false
  return true
}

function shuffleAndPick(arr: DbPYQ[], count: number): DbPYQ[] {
  const valid = arr.filter(isValidQuestion)
  const shuffled = [...valid]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// ── AI fallback generation ──────────────────────────────────────────────────

async function generateWithAI(
  topicId: string,
  subjectId: string,
  limit: number
): Promise<DbPYQ[]> {
  const topicName = TOPIC_DISPLAY_NAMES[topicId] || topicId.replace(/-/g, ' ')
  const subjectName = SUBJECT_MAP[subjectId] || subjectId.replace(/-/g, ' ')

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are a UPSC exam question paper setter. Generate authentic UPSC Prelims-style MCQs. Return only valid JSON.',
      },
      {
        role: 'user',
        content: `Generate ${limit} realistic UPSC Prelims MCQs about "${topicName}" (subject: ${subjectName}).

Return a JSON array:
[
  {
    "year": <year 2015-2024>,
    "question": "<question>",
    "options": { "a": "<opt>", "b": "<opt>", "c": "<opt>", "d": "<opt>" },
    "answer": "<a/b/c/d>",
    "explanation": "<1-2 sentence explanation>",
    "subject": "${subjectId}",
    "topic": "${topicId}",
    "difficulty": "<easy/medium/hard>"
  }
]

Rules:
- Test conceptual understanding, not rote memory
- All 4 options should be plausible
- Cover different aspects of the topic
- Return ONLY the JSON array`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const text = response.choices[0]?.message?.content?.trim() || '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed)) return []

  return parsed.map((q: Record<string, unknown>, i: number) => ({
    id: Date.now() + i,
    year: (q.year as number) || 2023,
    question: (q.question as string) || '',
    options: (q.options as DbPYQ['options']) || null,
    answer: (q.answer as string) || null,
    explanation: (q.explanation as string) || null,
    subject: (q.subject as string) || subjectId,
    topic: (q.topic as string) || topicId,
    difficulty: (q.difficulty as string) || 'medium',
    source: 'ai-generated',
  }))
}

// ── API Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subject') || ''
  const topicId = searchParams.get('topic') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

  try {
    // Try Supabase first
    const dbQuestions = await fetchFromSupabase(topicId, subjectId, limit)

    if (dbQuestions.length >= 3) {
      // Normalize DB format to match frontend expectations
      const pyqs = dbQuestions.map(q => {
        // Extract correct answer from options.correct if answer field is missing
        let answer = q.answer
        if (!answer && q.options && 'correct' in q.options) {
          answer = q.options.correct as string
        }

        return {
          id: q.id,
          year: q.year || 2023,
          question: q.question,
          options: q.options ? { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d } : null,
          answer,
          explanation: q.explanation,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty || 'medium',
          source: q.source || 'database',
        }
      })

      return NextResponse.json({ pyqs })
    }

    // Fallback to AI generation
    const aiQuestions = await generateWithAI(topicId, subjectId, limit)

    // Combine DB + AI if DB had some results
    const combined = [...dbQuestions, ...aiQuestions].slice(0, limit)
    const pyqs = combined.map(q => ({
      id: q.id,
      year: q.year || 2023,
      question: q.question,
      options: q.options ? { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d } : null,
      answer: q.answer,
      explanation: q.explanation,
      subject: q.subject || subjectId,
      topic: q.topic || topicId,
      difficulty: q.difficulty || 'medium',
      source: q.source || 'ai-generated',
    }))

    return NextResponse.json({ pyqs })
  } catch (err) {
    console.error('PYQ fetch failed:', err)

    // Last resort: try AI only
    try {
      const aiQuestions = await generateWithAI(topicId, subjectId, limit)
      const pyqs = aiQuestions.map(q => ({
        id: q.id,
        year: q.year || 2023,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        subject: q.subject || subjectId,
        topic: q.topic || topicId,
        difficulty: q.difficulty || 'medium',
        source: 'ai-generated',
      }))
      return NextResponse.json({ pyqs })
    } catch {
      return NextResponse.json({ pyqs: [] })
    }
  }
}
