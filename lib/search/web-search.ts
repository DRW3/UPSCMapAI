/**
 * Open-source web search for enriching UPSC study notes.
 * Uses Wikipedia REST API + DuckDuckGo instant answers — no API keys needed.
 */

interface SearchResult {
  title: string
  snippet: string
  source: 'wikipedia' | 'ddg'
}

/** Search Wikipedia for articles matching the query, return top summaries */
async function searchWikipedia(query: string, limit = 3): Promise<SearchResult[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`

  try {
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    const titles: string[] = (data.query?.search ?? []).map((r: { title: string }) => r.title)

    // Fetch summaries for each title in parallel
    const summaries = await Promise.all(
      titles.map(async (title): Promise<SearchResult | null> => {
        try {
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
          const sRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(4000) })
          if (!sRes.ok) return null
          const sData = await sRes.json()
          const extract = (sData.extract as string) ?? ''
          if (extract.length < 50) return null
          return {
            title: sData.title ?? title,
            snippet: extract.slice(0, 800),
            source: 'wikipedia' as const,
          }
        } catch {
          return null
        }
      }),
    )

    return summaries.filter((s): s is SearchResult => s !== null)
  } catch {
    return []
  }
}

/** DuckDuckGo instant answer API — returns Wikipedia-style abstract + related topics */
async function ddgInstantAnswer(query: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    const results: SearchResult[] = []

    // Main abstract (usually from Wikipedia)
    if (data.Abstract && data.Abstract.length > 50) {
      results.push({
        title: data.Heading ?? query,
        snippet: (data.Abstract as string).slice(0, 800),
        source: 'ddg',
      })
    }

    // Related topics — grab top 3
    const related = (data.RelatedTopics ?? []).slice(0, 3)
    for (const topic of related) {
      if (topic.Text && topic.Text.length > 30) {
        results.push({
          title: topic.FirstURL?.split('/').pop()?.replace(/_/g, ' ') ?? '',
          snippet: (topic.Text as string).slice(0, 400),
          source: 'ddg',
        })
      }
    }

    return results
  } catch {
    return []
  }
}

/**
 * Search the web for context on a UPSC topic.
 * Runs Wikipedia + DuckDuckGo in parallel, deduplicates, and returns
 * a formatted context string ready for LLM injection.
 */
export async function searchForContext(query: string, mapTitle: string): Promise<string> {
  // Build search queries — topic-focused + UPSC angle
  const searchQuery = `${mapTitle} ${query} India`
  const upscQuery = `${mapTitle} UPSC geography history`

  const [wikiResults, ddgResults, wikiUpsc] = await Promise.all([
    searchWikipedia(searchQuery, 3),
    ddgInstantAnswer(mapTitle),
    searchWikipedia(upscQuery, 2),
  ])

  // Deduplicate by title
  const seen = new Set<string>()
  const all: SearchResult[] = []
  for (const r of [...ddgResults, ...wikiResults, ...wikiUpsc]) {
    const key = r.title.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      all.push(r)
    }
  }

  if (all.length === 0) return ''

  // Format as context block for the LLM
  const sections = all.slice(0, 5).map(
    (r, i) => `[${i + 1}] ${r.title} (${r.source})\n${r.snippet}`,
  )

  return `\n\nWEB SEARCH CONTEXT (use these facts to enrich your notes — cite specific details, dates, figures):\n${sections.join('\n\n')}`
}
