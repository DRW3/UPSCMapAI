import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TOPIC_KEYWORD_MAP } from '@/data/topic-keyword-map'

export const runtime = 'nodejs'

// Cache for 1 hour
export const revalidate = 3600

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const yearParam = req.nextUrl.searchParams.get('year')

    // Fetch all PYQs with their tags
    const { data, error } = await supabase
      .from('upsc_pyqs')
      .select('id, tags, year')
      .not('options', 'is', null)
      .not('answer', 'is', null)

    if (error || !data) {
      return NextResponse.json({ counts: {}, yearCounts: {} })
    }

    // Count per topic using tags (primary) with keyword fallback
    const counts: Record<string, number> = {}
    const yearCounts: Record<string, Record<string, number>> = {}

    // Check if tags are populated (new system)
    const hasTaggedData = data.some(q => q.tags && q.tags.length > 0 && q.tags.some((t: string) => t.startsWith('topic:')))

    if (hasTaggedData) {
      // New tag-based counting — precise and fast
      for (const pyq of data) {
        if (!pyq.tags || pyq.tags.length === 0) continue

        // Year filter
        if (yearParam && pyq.year !== parseInt(yearParam)) continue

        for (const tag of pyq.tags) {
          if (tag.startsWith('topic:')) {
            const topicId = tag.slice(6)
            counts[topicId] = (counts[topicId] || 0) + 1

            // Year breakdown
            if (pyq.year) {
              const yearKey = String(pyq.year)
              if (!yearCounts[topicId]) yearCounts[topicId] = {}
              yearCounts[topicId][yearKey] = (yearCounts[topicId][yearKey] || 0) + 1
            }
          }
        }
      }
    } else {
      // Fallback: keyword-based counting (legacy)
      for (const [topicId, mapping] of Object.entries(TOPIC_KEYWORD_MAP)) {
        const { dbSubjects, keywords } = mapping
        let count = 0

        for (const pyq of data as { id: number; tags: string[]; year: number; question?: string; subject?: string }[]) {
          if (yearParam && pyq.year !== parseInt(yearParam)) continue
          if (!dbSubjects.includes(pyq.subject || '')) continue
          const qLower = (pyq.question || '').toLowerCase()
          if (keywords.some(kw => qLower.includes(kw.toLowerCase()))) {
            count++
          }
        }

        counts[topicId] = count
      }
    }

    // Ensure all topics in keyword map have a count (even if 0)
    for (const topicId of Object.keys(TOPIC_KEYWORD_MAP)) {
      if (!(topicId in counts)) counts[topicId] = 0
    }

    return NextResponse.json({ counts, yearCounts }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    console.error('PYQ counts error:', err)
    return NextResponse.json({ counts: {}, yearCounts: {} })
  }
}
