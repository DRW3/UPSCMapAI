/**
 * Real-time geographic data from Wikidata SPARQL + OpenStreetMap Overpass API.
 * Both are free, open-source, no API key required.
 */
import type { AnnotatedPoint } from '@/types'

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql'

// ─── Wikidata Q-IDs (verified) ────────────────────────────────────────────────
// India = Q668
// Q19683138  = Ramsar site (wetland of international importance) — via P1435
// Q46169     = national park
// Q5533772   = Tiger reserve of India
// Q158454    = biosphere reserve (UNESCO)
// Q9259      = World Heritage Site — via P1435
// Q1377575   = wildlife refuge (covers Indian wildlife sanctuaries)
// Q134447    = nuclear power plant
// Q12323     = dam
// Q44782     = port
// Q200297    = thermal power station
// Q15911738  = hydroelectric power station
// Q1371037   = Indian Institute of Technology (class used for all IITs)

const SPARQL_QUERIES: Record<string, string> = {
  ramsar_sites: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P1435 wd:Q19683138 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel`,

  national_parks: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q46169 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel`,

  tiger_reserves: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31 wd:Q5533772 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel`,

  biosphere_reserves: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31 wd:Q158454 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel`,

  unesco_heritage: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P1435 wd:Q9259 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel`,

  wildlife_sanctuaries: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q1377575 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel LIMIT 150`,

  nuclear_plants: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q134447 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }`,

  major_dams: `
    SELECT ?item ?itemLabel ?coord ?riverLabel WHERE {
      ?item wdt:P31/wdt:P279* wd:Q12323 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      OPTIONAL { ?item wdt:P206 ?river . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } ORDER BY ?itemLabel`,

  major_ports: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q44782 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }`,

  iit_colleges: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31 wd:Q1371037 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }`,

  thermal_power: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q200297 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } LIMIT 60`,

  hydro_power: `
    SELECT ?item ?itemLabel ?coord WHERE {
      ?item wdt:P31/wdt:P279* wd:Q15911738 .
      ?item wdt:P17 wd:Q668 .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    } LIMIT 60`,
}

// ─── Keyword → Query mapping ──────────────────────────────────────────────────

const KEYWORD_MAP: Record<string, string> = {
  ramsar: 'ramsar_sites',
  ramsar_sites: 'ramsar_sites',
  ramsar_wetlands: 'ramsar_sites',
  wetlands: 'ramsar_sites',
  wetland: 'ramsar_sites',
  national_park: 'national_parks',
  national_parks: 'national_parks',
  tiger_reserve: 'tiger_reserves',
  tiger_reserves: 'tiger_reserves',
  project_tiger: 'tiger_reserves',
  biosphere: 'biosphere_reserves',
  biosphere_reserve: 'biosphere_reserves',
  biosphere_reserves: 'biosphere_reserves',
  man_and_biosphere: 'biosphere_reserves',
  unesco: 'unesco_heritage',
  world_heritage: 'unesco_heritage',
  unesco_heritage: 'unesco_heritage',
  world_heritage_sites: 'unesco_heritage',
  wildlife_sanctuary: 'wildlife_sanctuaries',
  wildlife_sanctuaries: 'wildlife_sanctuaries',
  wildlife_refuge: 'wildlife_sanctuaries',
  nuclear_plant: 'nuclear_plants',
  nuclear_power: 'nuclear_plants',
  nuclear_plants: 'nuclear_plants',
  nuclear_power_plants: 'nuclear_plants',
  dam: 'major_dams',
  dams: 'major_dams',
  major_dams: 'major_dams',
  river_dams: 'major_dams',
  port: 'major_ports',
  ports: 'major_ports',
  major_ports: 'major_ports',
  thermal_power: 'thermal_power',
  thermal_plants: 'thermal_power',
  hydro_power: 'hydro_power',
  hydroelectric: 'hydro_power',
  iit: 'iit_colleges',
  iits: 'iit_colleges',
  iit_colleges: 'iit_colleges',
}

// Map type → auto queries
// Intentionally empty: all Wikidata fetches must be driven by explicit features_to_show
// keywords set by the AI. Auto-triggering by map_type causes irrelevant dataset dumps
// (e.g. "Volcanoes" → thematic_environment → ramsar + biosphere reserves loaded).
const MAP_TYPE_QUERIES: Record<string, string[]> = {}

// ─── Icons & colors per query type ───────────────────────────────────────────

const QUERY_META: Record<string, { icon: string; color: string; label: string }> = {
  ramsar_sites:        { icon: '🦢', color: '#2980b9', label: 'Ramsar Wetland' },
  national_parks:      { icon: '🌿', color: '#27ae60', label: 'National Park' },
  tiger_reserves:      { icon: '🐯', color: '#e67e22', label: 'Tiger Reserve' },
  biosphere_reserves:  { icon: '🌍', color: '#16a085', label: 'Biosphere Reserve' },
  unesco_heritage:     { icon: '🏛️', color: '#8e44ad', label: 'UNESCO Heritage' },
  wildlife_sanctuaries:{ icon: '🦌', color: '#2ecc71', label: 'Wildlife Sanctuary' },
  nuclear_plants:      { icon: '⚛️', color: '#e74c3c', label: 'Nuclear Plant' },
  major_dams:          { icon: '🏗️', color: '#2c3e50', label: 'Dam' },
  major_ports:         { icon: '⚓', color: '#2980b9', label: 'Major Port' },
  iit_colleges:        { icon: '🎓', color: '#8e44ad', label: 'IIT' },
  thermal_power:       { icon: '🏭', color: '#7f8c8d', label: 'Thermal Plant' },
  hydro_power:         { icon: '💧', color: '#3498db', label: 'Hydro Plant' },
}

// ─── Wikidata fetch ───────────────────────────────────────────────────────────

function parseWKTCoord(wkt: string): [number, number] | null {
  const m = wkt.match(/Point\(([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\)/)
  if (!m) return null
  return [parseFloat(m[1]), parseFloat(m[2])] // [lng, lat]
}

async function fetchWikidata(queryKey: string): Promise<AnnotatedPoint[]> {
  const sparql = SPARQL_QUERIES[queryKey]
  if (!sparql) return []

  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(sparql.trim())}&format=json`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'UPSCMapAI/1.0 (educational tool)',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Wikidata ${queryKey}: HTTP ${res.status}`)

  const json = await res.json()
  const bindings: Record<string, { value: string }>[] = json.results.bindings
  const meta = QUERY_META[queryKey]

  const points: AnnotatedPoint[] = []
  const seenIds = new Set<string>()

  for (const b of bindings) {
    const coords = parseWKTCoord(b.coord?.value ?? '')
    if (!coords) continue
    const label = b.itemLabel?.value ?? 'Unknown'
    if (label.startsWith('Q') && !isNaN(Number(label.slice(1)))) continue // skip unlabeled

    const id = b.item?.value?.split('/').pop() ?? label
    if (seenIds.has(id)) continue  // dedup
    seenIds.add(id)

    const extra = b.riverLabel?.value
    const displayLabel = extra ? `${label} (${extra})` : label

    points.push({
      id,
      coordinates: coords,
      label: displayLabel,
      icon: meta?.icon ?? '📍',
      color: meta?.color ?? '#3498db',
      pyq_count: 1,
      details: { source: 'Wikidata', type: meta?.label ?? queryKey },
    })
  }
  return points
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface WebQueryResult {
  queryKey: string
  points: AnnotatedPoint[]
  meta: { icon: string; color: string; label: string }
}

/**
 * Detect which web queries are needed from intent features + map type
 */
export function detectWebQueries(
  featurestoShow: string[],
  mapType: string
): string[] {
  const needed = new Set<string>()

  // From features_to_show keywords
  for (const f of featurestoShow) {
    const key = f.toLowerCase().replace(/\s+/g, '_')
    const query = KEYWORD_MAP[key]
    if (query) needed.add(query)
  }

  // From map_type
  const autoQueries = MAP_TYPE_QUERIES[mapType] ?? []
  for (const q of autoQueries) needed.add(q)

  return Array.from(needed)
}

/**
 * Fetch all needed web queries in parallel
 */
export async function fetchWebGeoData(queryKeys: string[]): Promise<WebQueryResult[]> {
  if (queryKeys.length === 0) return []

  const results = await Promise.allSettled(
    queryKeys.map(async (key) => {
      const points = await fetchWikidata(key)
      return { queryKey: key, points, meta: QUERY_META[key] ?? { icon: '📍', color: '#666', label: key } }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<WebQueryResult> => r.status === 'fulfilled' && r.value.points.length > 0)
    .map(r => r.value)
}
