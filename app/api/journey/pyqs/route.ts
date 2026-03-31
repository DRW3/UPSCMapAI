/**
 * app/api/journey/pyqs/route.ts
 *
 * Generates UPSC PYQs for a learning journey topic using AI (Groq).
 * No database required — questions are generated on-the-fly.
 */

import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

// ── Topic display names for better AI prompts ────────────────────────────────

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

// ── Subject mapping ──────────────────────────────────────────────────────────

const SUBJECT_MAP: Record<string, string> = {
  'ancient-history':   'Ancient Indian History',
  'medieval-history':  'Medieval Indian History',
  'modern-history':    'Modern Indian History',
  'geography':         'Indian and World Geography',
  'polity':            'Indian Polity and Governance',
  'economy':           'Indian Economy',
  'environment':       'Environment and Ecology',
  'science-tech':      'Science and Technology',
  'ethics':            'Ethics and Integrity',
  'society':           'Indian Society',
  'art-culture':       'Art and Culture',
  'world-history':     'World History',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subject') || ''
  const topicId   = searchParams.get('topic') || ''
  const limit     = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

  const topicName   = TOPIC_DISPLAY_NAMES[topicId] || topicId.replace(/-/g, ' ')
  const subjectName = SUBJECT_MAP[subjectId] || subjectId.replace(/-/g, ' ')

  try {
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
    if (!jsonMatch) {
      return NextResponse.json({ pyqs: [] })
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ pyqs: [] })
    }

    const pyqs = parsed.map((q: Record<string, unknown>, i: number) => ({
      id: Date.now() + i,
      year: (q.year as number) || 2023,
      question: (q.question as string) || '',
      options: q.options || null,
      answer: (q.answer as string) || null,
      explanation: (q.explanation as string) || null,
      subject: (q.subject as string) || subjectId,
      topic: (q.topic as string) || topicId,
      difficulty: (q.difficulty as string) || 'medium',
      source: 'ai-generated',
    }))

    return NextResponse.json({ pyqs })
  } catch (err) {
    console.error('AI PYQ generation failed:', err)
    return NextResponse.json({ pyqs: [] })
  }
}
