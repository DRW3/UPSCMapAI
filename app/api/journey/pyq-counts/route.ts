import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TOPIC_KEYWORD_MAP } from '@/data/topic-keyword-map'

export const runtime = 'nodejs'

// Cache for 1 hour
export const revalidate = 3600

export async function GET() {
  try {
    const supabase = createServerClient()

    // Fetch all PYQs — only the fields needed for counting
    const { data, error } = await supabase
      .from('upsc_pyqs')
      .select('id, question, subject')
      .not('options', 'is', null)
      .not('answer', 'is', null)

    if (error || !data) {
      return NextResponse.json({ counts: {} })
    }

    // Count per topic using keyword matching
    const counts: Record<string, number> = {}

    for (const [topicId, mapping] of Object.entries(TOPIC_KEYWORD_MAP)) {
      const { dbSubjects, keywords } = mapping
      let count = 0

      for (const pyq of data) {
        // Must be in the right subject
        if (!dbSubjects.includes(pyq.subject)) continue
        // Must match at least one keyword (case-insensitive)
        const qLower = pyq.question.toLowerCase()
        if (keywords.some(kw => qLower.includes(kw.toLowerCase()))) {
          count++
        }
      }

      counts[topicId] = count
    }

    return NextResponse.json({ counts }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    console.error('PYQ counts error:', err)
    return NextResponse.json({ counts: {} })
  }
}
