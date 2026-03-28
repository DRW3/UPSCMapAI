import { NextRequest } from 'next/server'
import { parseMapIntent } from '@/lib/ai/intent-parser'
import { streamAnnotations } from '@/lib/ai/annotation-gen'
import { getBoundsForScope, detectEmpire, getEmpireCities } from '@/lib/ai/data-resolver'
import { detectWebQueries, fetchWebGeoData } from '@/lib/geo/webquery'
import { fetchRelevantPYQs } from '@/lib/pyq/retrieval'
import { searchForContext } from '@/lib/search/web-search'
import type { MapOperation, AnnotatedPoint } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  if (!message || typeof message !== 'string') {
    return new Response('Missing message', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(sseEvent(data)))
      }

      try {
        // 1. Parse intent with Gemini — includes annotated_points with real coordinates
        const intent = await parseMapIntent(message)

        // 2. Detect if this query needs live Wikidata thematic data
        // Skip Wikidata entirely for specific queries (features_to_highlight non-empty)
        // — those are about a named thing, not a dataset category overview
        const isSpecificQuery = intent.features_to_highlight && intent.features_to_highlight.length > 0
        const webQueryKeys = isSpecificQuery ? [] : detectWebQueries(intent.features_to_show, intent.map_type)
        const needsWebData = webQueryKeys.length > 0

        // 3. Start Wikidata + PYQ + Web Search fetch in parallel
        const webDataPromise = needsWebData
          ? fetchWebGeoData(webQueryKeys)
          : Promise.resolve([])
        const pyqPromise = fetchRelevantPYQs(intent, { limit: 5, threshold: 0.45 })
          .catch(() => [])   // never block the map if Supabase is down
        const webSearchPromise = searchForContext(message, intent.title)
          .catch(() => '')   // never block if search fails

        // 4. Send full_replace map operation
        send({ type: 'map_operation', operation: { op: 'full_replace', intent } as MapOperation })

        // 5. Zoom to region
        const bounds = getBoundsForScope(intent.region_scope, intent.region_specific)
        send({ type: 'map_operation', operation: { op: 'zoom_to', bounds } as MapOperation })

        // 6. Convert AI-generated annotated_points → AnnotatedPoint[]
        const aiPoints: AnnotatedPoint[] = (intent.annotated_points ?? [])
          .filter(p => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng))
          .map(p => ({
            id: p.id,
            coordinates: [p.lng, p.lat] as [number, number],
            label: p.label,   // clean label — icon is stored separately
            icon: p.icon,
            color: p.color,
            pyq_count: 1,
          }))

        // 7. For historical maps, merge empire cities (richer detail than AI points)
        const isHistorical = intent.map_type.startsWith('historical') ||
          intent.data_layers.some(l => l.data_source.startsWith('custom_historical'))

        let empireCityPoints: AnnotatedPoint[] = []
        if (isHistorical) {
          const empire = detectEmpire(intent.title, intent.features_to_show, '')
          empireCityPoints = getEmpireCities(empire)
        }

        // 8. Merge: empire cities take priority (better curated), then AI points fill gaps
        const seenIds = new Set<string>()
        const allStaticPoints: AnnotatedPoint[] = []

        for (const pt of empireCityPoints) {
          seenIds.add(pt.id)
          allStaticPoints.push(pt)
        }
        for (const pt of aiPoints) {
          if (!seenIds.has(pt.id)) {
            seenIds.add(pt.id)
            allStaticPoints.push(pt)
          }
        }

        if (allStaticPoints.length > 0) {
          send({ type: 'map_operation', operation: { op: 'add_markers', points: allStaticPoints } as MapOperation })
        }

        // 9. Send chat status message
        if (needsWebData) {
          send({
            type: 'chat_text',
            text: `**${intent.title}** — ${allStaticPoints.length} locations marked. Fetching live ${webQueryKeys.map(k => k.replace(/_/g, ' ')).join(', ')} from Wikidata…`,
          })
        } else {
          send({
            type: 'chat_text',
            text: buildChatResponse(intent, allStaticPoints.length),
          })
        }

        // 10. Wait for Wikidata data and stream as additional markers
        const webResults = await webDataPromise
        let totalWebPoints = 0

        for (const result of webResults) {
          if (result.points.length === 0) continue
          totalWebPoints += result.points.length

          const batchSize = 50
          for (let i = 0; i < result.points.length; i += batchSize) {
            const batch = result.points.slice(i, i + batchSize)
            send({
              type: 'map_operation',
              operation: { op: 'add_markers', points: batch } as MapOperation,
            })
          }
        }

        if (needsWebData && totalWebPoints > 0) {
          const summary = webResults
            .map(r => `${r.points.length} ${r.meta.label}${r.points.length > 1 ? 's' : ''}`)
            .join(', ')
          send({
            type: 'chat_text_append',
            text: ` → **${totalWebPoints} live locations added** (${summary}).`,
          })
        } else if (needsWebData && totalWebPoints === 0) {
          send({
            type: 'chat_text_append',
            text: ` → No live data returned. Showing ${allStaticPoints.length} AI-mapped locations.`,
          })
        }

        // 11. Stream UPSC notes with real PYQs + web search context
        const pyqs = await pyqPromise
        const webContext = await webSearchPromise
        for await (const chunk of streamAnnotations(intent, pyqs, webContext)) {
          send({ type: 'sidebar_text', text: chunk })
        }
        send({ type: 'sidebar_done' })

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function buildChatResponse(
  intent: ReturnType<typeof parseMapIntent> extends Promise<infer T> ? T : never,
  markerCount: number
): string {
  const regionPart = intent.region_specific
    ? ` — ${intent.region_specific}`
    : intent.region_scope !== 'all_india' ? ` — ${intent.region_scope.replace(/_/g, ' ')}` : ''
  return `**${intent.title}**${regionPart} · ${markerCount} locations marked. Study notes loading →`
}
