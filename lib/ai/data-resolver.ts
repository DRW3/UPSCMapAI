import type { ParsedMapIntent, MapLayer, AnnotatedPoint } from '@/types'

const DATA_SOURCE_PATHS: Record<string, string> = {
  gadm_india_states: '/geojson/political/india-states.geojson',
  gadm_india_districts: '/geojson/political/india-districts.geojson',
  natural_earth_rivers: '/geojson/physical/rivers-india.geojson',
  natural_earth_relief: '/geojson/physical/relief-contours.geojson',
  hydrosheds_rivers: '/geojson/physical/rivers-india.geojson',
  osm_roads: '/geojson/physical/roads-nh.geojson',
  mineral_deposits: '/geojson/thematic/minerals.geojson',
  protected_areas: '/geojson/thematic/protected-areas.geojson',
  disaster_zones: '/geojson/thematic/disaster-prone.geojson',
  // World countries — used for international/neighboring country maps
  world_countries: '/geojson/political/world-countries.geojson',
  natural_earth_countries: '/geojson/political/world-countries.geojson',
  south_asia_countries: '/geojson/political/world-countries.geojson',
}

// ─── Historical Empire Polygons ───────────────────────────────────────────────

const EMPIRE_POLYGONS: Record<string, [number, number][]> = {
  mauryan:        [[60.5,35.5],[75.0,36.5],[80.0,32.0],[88.0,26.5],[87.0,21.0],[80.5,13.0],[76.0,10.5],[72.0,19.0],[67.0,24.5],[63.0,28.0],[60.5,35.5]],
  gupta:          [[72.0,24.0],[78.0,32.0],[88.0,26.0],[85.0,20.0],[80.0,16.0],[75.0,20.0],[72.0,24.0]],
  mughal:         [[66.0,36.0],[79.0,37.0],[92.0,26.0],[85.0,20.0],[78.0,13.0],[73.0,15.0],[70.0,21.0],[62.0,28.0],[66.0,36.0]],
  maratha:        [[72.0,22.0],[78.0,30.0],[83.0,25.0],[82.0,17.0],[79.0,14.0],[74.0,17.0],[73.0,20.0],[72.0,22.0]],
  vijayanagara:   [[74.0,17.0],[80.0,18.0],[84.0,15.0],[80.5,8.5],[77.5,8.0],[74.5,11.0],[74.0,17.0]],
  chola:          [[76.5,13.5],[80.5,15.0],[83.0,12.0],[80.5,8.0],[77.5,8.0],[75.5,10.0],[76.5,13.5]],
  delhi_sultanate:[[68.0,30.0],[78.0,35.0],[88.0,24.0],[82.0,15.0],[74.0,17.0],[70.0,22.0],[68.0,30.0]],
  pallava:        [[78.0,15.0],[81.0,14.0],[81.5,11.0],[79.5,8.5],[77.5,10.0],[78.0,13.0],[78.0,15.0]],
  rashtrakuta:    [[73.0,20.0],[79.0,21.0],[80.0,17.0],[76.5,14.0],[73.5,16.0],[73.0,20.0]],
  pala:           [[84.0,27.0],[88.0,26.5],[90.5,24.0],[85.0,21.0],[82.0,23.0],[84.0,27.0]],
  satavahana:     [[73.5,20.0],[80.5,20.0],[81.0,16.0],[76.0,13.0],[73.0,16.0],[73.5,20.0]],
  kushana:        [[60.0,38.0],[76.0,37.0],[80.0,30.0],[75.0,26.0],[68.0,26.0],[62.0,32.0],[60.0,38.0]],
  british:        [[66.0,36.0],[97.0,29.0],[97.0,22.0],[89.0,21.0],[80.0,10.0],[76.0,8.0],[70.0,20.0],[62.0,24.0],[66.0,36.0]],
  ancient:        [[66.0,34.0],[80.0,35.0],[88.0,25.0],[84.0,18.0],[77.0,10.0],[72.0,20.0],[66.0,28.0],[66.0,34.0]],
  medieval:       [[68.0,34.0],[80.0,35.0],[90.0,24.0],[82.0,15.0],[74.0,16.0],[68.0,24.0],[68.0,34.0]],
  colonial:       [[66.0,36.0],[97.0,29.0],[95.0,20.0],[80.0,8.0],[70.0,20.0],[60.0,26.0],[66.0,36.0]],
}

const EMPIRE_COLORS: Record<string, string> = {
  mauryan: '#e07b39', gupta: '#c4953a', mughal: '#7c5cba',
  maratha: '#e06c5a', vijayanagara: '#4a9e6e', chola: '#c45c8a',
  delhi_sultanate: '#5a7bb5', pallava: '#6aab8a', rashtrakuta: '#a06040',
  pala: '#8a6aab', satavahana: '#b07050', kushana: '#6080a0',
  british: '#c0392b', ancient: '#c8965a', medieval: '#7a9ab5', colonial: '#c0392b',
}

// ─── Historical City Markers per Empire ──────────────────────────────────────

export const EMPIRE_CITIES: Record<string, AnnotatedPoint[]> = {
  mauryan: [
    { id: 'pataliputra', coordinates: [85.13, 25.61], label: 'Pataliputra (Capital)', icon: '🏛️', color: '#e07b39', pyq_count: 8 },
    { id: 'taxila', coordinates: [72.83, 33.75], label: 'Taxila / Takshashila', icon: '🎓', color: '#e07b39', pyq_count: 6 },
    { id: 'ujjain', coordinates: [75.78, 23.18], label: 'Ujjain (W. Capital)', icon: '🏛️', color: '#e07b39', pyq_count: 5 },
    { id: 'tosali', coordinates: [85.82, 20.22], label: 'Tosali / Dhauli (Kalinga)', icon: '⚔️', color: '#e07b39', pyq_count: 7 },
    { id: 'suvarnagiri', coordinates: [77.3, 15.0], label: 'Suvarnagiri (S. Capital)', icon: '🏛️', color: '#e07b39', pyq_count: 3 },
    { id: 'sopara', coordinates: [72.83, 19.39], label: 'Sopara (Port)', icon: '⚓', color: '#e07b39', pyq_count: 2 },
    { id: 'girnar', coordinates: [70.49, 21.49], label: 'Girnar (Rock Edict)', icon: '🪨', color: '#e07b39', pyq_count: 4 },
    { id: 'rajgir', coordinates: [85.41, 25.03], label: 'Rajgir (Early capital)', icon: '🏰', color: '#e07b39', pyq_count: 4 },
    { id: 'nalanda', coordinates: [85.44, 25.14], label: 'Nalanda University', icon: '🎓', color: '#e07b39', pyq_count: 6 },
    { id: 'vaishali', coordinates: [85.13, 25.99], label: 'Vaishali', icon: '⛩️', color: '#e07b39', pyq_count: 3 },
    { id: 'bodh_gaya', coordinates: [84.99, 24.69], label: 'Bodh Gaya', icon: '☸️', color: '#e07b39', pyq_count: 5 },
    { id: 'sanchi', coordinates: [77.74, 23.48], label: 'Sanchi Stupa', icon: '☸️', color: '#e07b39', pyq_count: 5 },
  ],
  gupta: [
    { id: 'pataliputra_g', coordinates: [85.13, 25.61], label: 'Pataliputra (Capital)', icon: '🏛️', color: '#c4953a', pyq_count: 7 },
    { id: 'ujjain_g', coordinates: [75.78, 23.18], label: 'Ujjain', icon: '🏛️', color: '#c4953a', pyq_count: 4 },
    { id: 'nalanda_g', coordinates: [85.44, 25.14], label: 'Nalanda', icon: '🎓', color: '#c4953a', pyq_count: 6 },
    { id: 'varanasi_g', coordinates: [83.00, 25.32], label: 'Varanasi', icon: '⛩️', color: '#c4953a', pyq_count: 4 },
    { id: 'prayag_g', coordinates: [81.84, 25.43], label: 'Prayag (Allahabad)', icon: '🏛️', color: '#c4953a', pyq_count: 3 },
    { id: 'ajanta', coordinates: [75.7, 20.55], label: 'Ajanta Caves', icon: '🎨', color: '#c4953a', pyq_count: 6 },
    { id: 'ellora', coordinates: [75.18, 20.02], label: 'Ellora Caves', icon: '🎨', color: '#c4953a', pyq_count: 5 },
  ],
  mughal: [
    { id: 'agra', coordinates: [78.0, 27.18], label: 'Agra (Capital)', icon: '🏛️', color: '#7c5cba', pyq_count: 8 },
    { id: 'delhi_m', coordinates: [77.21, 28.61], label: 'Delhi / Shahjahanabad', icon: '🕌', color: '#7c5cba', pyq_count: 9 },
    { id: 'fatehpur', coordinates: [77.66, 27.1], label: 'Fatehpur Sikri', icon: '🏰', color: '#7c5cba', pyq_count: 6 },
    { id: 'lahore', coordinates: [74.35, 31.55], label: 'Lahore', icon: '🏛️', color: '#7c5cba', pyq_count: 5 },
    { id: 'kabul_m', coordinates: [69.18, 34.52], label: 'Kabul', icon: '🏰', color: '#7c5cba', pyq_count: 4 },
    { id: 'panipat_1', coordinates: [76.97, 29.39], label: 'Panipat (1526/1556)', icon: '⚔️', color: '#7c5cba', pyq_count: 10 },
    { id: 'haldighat', coordinates: [73.67, 25.05], label: 'Haldighati (1576)', icon: '⚔️', color: '#7c5cba', pyq_count: 7 },
    { id: 'amber', coordinates: [75.85, 26.98], label: 'Amber Fort (Rajput Alliance)', icon: '🏰', color: '#7c5cba', pyq_count: 4 },
    { id: 'aurangabad_m', coordinates: [75.32, 19.88], label: 'Aurangabad (Deccan HQ)', icon: '🏛️', color: '#7c5cba', pyq_count: 4 },
  ],
  maratha: [
    { id: 'raigad', coordinates: [73.44, 18.25], label: 'Raigad (Capital)', icon: '🏰', color: '#e06c5a', pyq_count: 7 },
    { id: 'pune_m', coordinates: [73.86, 18.52], label: 'Pune / Poona', icon: '🏛️', color: '#e06c5a', pyq_count: 7 },
    { id: 'nagpur_m', coordinates: [79.09, 21.15], label: 'Nagpur', icon: '🏛️', color: '#e06c5a', pyq_count: 4 },
    { id: 'panipat_3', coordinates: [76.97, 29.39], label: 'Panipat 1761 (Defeat)', icon: '⚔️', color: '#e06c5a', pyq_count: 8 },
    { id: 'shivneri', coordinates: [73.85, 19.19], label: 'Shivneri Fort (Shivaji birth)', icon: '🏰', color: '#e06c5a', pyq_count: 5 },
    { id: 'sinhagad', coordinates: [73.75, 18.37], label: 'Sinhagad Fort', icon: '🏰', color: '#e06c5a', pyq_count: 4 },
    { id: 'kolhapur', coordinates: [74.22, 16.7], label: 'Kolhapur', icon: '🏛️', color: '#e06c5a', pyq_count: 3 },
  ],
  vijayanagara: [
    { id: 'hampi', coordinates: [76.46, 15.33], label: 'Hampi (Capital)', icon: '🏛️', color: '#4a9e6e', pyq_count: 8 },
    { id: 'warangal', coordinates: [79.58, 17.97], label: 'Warangal', icon: '🏰', color: '#4a9e6e', pyq_count: 5 },
    { id: 'chandragiri', coordinates: [79.31, 13.58], label: 'Chandragiri Fort', icon: '🏰', color: '#4a9e6e', pyq_count: 3 },
    { id: 'talikota', coordinates: [76.29, 16.47], label: 'Talikota (Battle 1565)', icon: '⚔️', color: '#4a9e6e', pyq_count: 6 },
    { id: 'belur', coordinates: [75.86, 13.16], label: 'Belur (Hoysala temple)', icon: '⛩️', color: '#4a9e6e', pyq_count: 4 },
    { id: 'lepakshi', coordinates: [77.61, 13.8], label: 'Lepakshi', icon: '⛩️', color: '#4a9e6e', pyq_count: 3 },
  ],
  chola: [
    { id: 'thanjavur', coordinates: [79.13, 10.79], label: 'Thanjavur (Capital)', icon: '🏛️', color: '#c45c8a', pyq_count: 7 },
    { id: 'gangaikonda', coordinates: [79.45, 11.22], label: 'Gangaikonda Cholapuram', icon: '🏛️', color: '#c45c8a', pyq_count: 5 },
    { id: 'uraiyur', coordinates: [78.72, 10.9], label: 'Uraiyur (Early capital)', icon: '🏰', color: '#c45c8a', pyq_count: 4 },
    { id: 'poompuhar', coordinates: [79.86, 11.22], label: 'Poompuhar (Port)', icon: '⚓', color: '#c45c8a', pyq_count: 4 },
    { id: 'mahabalipuram', coordinates: [80.19, 12.62], label: 'Mahabalipuram', icon: '⛩️', color: '#c45c8a', pyq_count: 5 },
    { id: 'kanchi', coordinates: [79.7, 12.83], label: 'Kanchipuram', icon: '⛩️', color: '#c45c8a', pyq_count: 5 },
  ],
  delhi_sultanate: [
    { id: 'delhi_ds', coordinates: [77.21, 28.61], label: 'Delhi (Capital)', icon: '🕌', color: '#5a7bb5', pyq_count: 9 },
    { id: 'lahore_ds', coordinates: [74.35, 31.55], label: 'Lahore', icon: '🏛️', color: '#5a7bb5', pyq_count: 5 },
    { id: 'devagiri', coordinates: [75.32, 19.88], label: 'Devagiri (Daulatabad)', icon: '🏰', color: '#5a7bb5', pyq_count: 6 },
    { id: 'warangal_ds', coordinates: [79.58, 17.97], label: 'Warangal', icon: '🏰', color: '#5a7bb5', pyq_count: 4 },
    { id: 'khambhat', coordinates: [72.62, 22.32], label: 'Khambhat (Port)', icon: '⚓', color: '#5a7bb5', pyq_count: 3 },
  ],
  british: [
    { id: 'calcutta', coordinates: [88.36, 22.57], label: 'Calcutta (Capital 1773-1911)', icon: '🏛️', color: '#c0392b', pyq_count: 9 },
    { id: 'bombay', coordinates: [72.88, 19.08], label: 'Bombay', icon: '⚓', color: '#c0392b', pyq_count: 7 },
    { id: 'madras', coordinates: [80.27, 13.08], label: 'Madras', icon: '⚓', color: '#c0392b', pyq_count: 7 },
    { id: 'delhi_b', coordinates: [77.21, 28.61], label: 'New Delhi (Capital 1911)', icon: '🏛️', color: '#c0392b', pyq_count: 8 },
    { id: 'plassey', coordinates: [88.24, 23.79], label: 'Plassey 1757', icon: '⚔️', color: '#c0392b', pyq_count: 10 },
    { id: 'buxar', coordinates: [83.98, 25.57], label: 'Buxar 1764', icon: '⚔️', color: '#c0392b', pyq_count: 8 },
    { id: 'meerut', coordinates: [77.7, 28.98], label: 'Meerut (1857 Revolt)', icon: '⚔️', color: '#c0392b', pyq_count: 8 },
    { id: 'jhansi', coordinates: [78.57, 25.45], label: 'Jhansi (1857)', icon: '⚔️', color: '#c0392b', pyq_count: 7 },
  ],
}

export function getEmpireCities(empire: string): AnnotatedPoint[] {
  return EMPIRE_CITIES[empire] ?? []
}

// ─── Empire Detection ─────────────────────────────────────────────────────────

export function detectEmpire(title: string, features: string[], dataSource: string): string {
  const text = `${title} ${features.join(' ')} ${dataSource}`.toLowerCase()
  if (text.includes('maurya') || text.includes('ashoka') || text.includes('chandragupta maurya')) return 'mauryan'
  if (text.includes('gupta') && !text.includes('chandragupta maurya')) return 'gupta'
  if (text.includes('mughal') || text.includes('moghul') || text.includes('akbar') || text.includes('aurangzeb') || text.includes('babur') || text.includes('humayun')) return 'mughal'
  if (text.includes('maratha') || text.includes('shivaji') || text.includes('peshwa')) return 'maratha'
  if (text.includes('vijayanagara') || text.includes('hampi') || text.includes('krishnadevaraya')) return 'vijayanagara'
  if (text.includes('chola')) return 'chola'
  if ((text.includes('delhi') && text.includes('sultanate')) || text.includes('tughlaq') || text.includes('khilji') || text.includes('iltutmish') || text.includes('alauddin')) return 'delhi_sultanate'
  if (text.includes('pallava')) return 'pallava'
  if (text.includes('rashtrakuta')) return 'rashtrakuta'
  if (text.includes('pala')) return 'pala'
  if (text.includes('satavahana')) return 'satavahana'
  if (text.includes('kushana') || text.includes('kushan')) return 'kushana'
  if (text.includes('british') || text.includes('colonial') || text.includes('east india') || text.includes('1857') || text.includes('company raj')) return 'british'
  if (text.includes('ancient') || text.includes('pre500') || text.includes('pre-500')) return 'ancient'
  if (text.includes('colonial_1800') || text.includes('1800_1947')) return 'colonial'
  return 'medieval'
}

export function getHistoricalGeoJSON(
  dataSource: string,
  title: string = '',
  features: string[] = []
): GeoJSON.FeatureCollection | null {
  if (!dataSource.startsWith('custom_historical')) return null
  const empire = detectEmpire(title, features, dataSource)
  const coords = EMPIRE_POLYGONS[empire] ?? EMPIRE_POLYGONS.medieval
  const color = EMPIRE_COLORS[empire] ?? '#9a7a5a'
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: { empire, color, title } }],
  }
}

/**
 * Compute the geographic bounding box [minLng, minLat, maxLng, maxLat] for a
 * layer's polygon/area data.  Returns null for layers without inline geometry
 * (e.g. file-based GeoJSON loaded by the map).
 */
export function getLayerGeoBounds(
  layer: MapLayer,
  title: string,
  features: string[],
): [number, number, number, number] | null {
  if (layer.layer_type === 'historical_boundary') {
    const geojson = getHistoricalGeoJSON(layer.data_source, title, features)
    if (!geojson) return null
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
    for (const feature of geojson.features) {
      const coords =
        feature.geometry.type === 'Polygon'
          ? (feature.geometry.coordinates as number[][][])[0]
          : feature.geometry.type === 'MultiPolygon'
            ? (feature.geometry.coordinates as number[][][][]).flat(1)[0]
            : []
      for (const coord of coords) {
        const [lng, lat] = coord as [number, number]
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
    if (minLng !== Infinity) return [minLng, minLat, maxLng, maxLat]
  }
  return null
}

// ─── MapLibre Style ───────────────────────────────────────────────────────────

export function buildMapLibreStyle(layer: MapLayer): Record<string, unknown>[] {
  switch (layer.layer_type) {
    case 'base_political':
      return [
        {
          id: `${layer.layer_id}-fill`,
          type: 'fill',
          source: layer.layer_id,
          // India states slightly different from world land (#f0ebe0) so borders read clearly
          paint: { 'fill-color': '#e2dbd0', 'fill-opacity': 1 },
        },
        {
          id: `${layer.layer_id}-line`,
          type: 'line',
          source: layer.layer_id,
          paint: { 'line-color': '#9a8878', 'line-width': 0.7, 'line-opacity': 0.85 },
        },
        {
          id: `${layer.layer_id}-labels`,
          type: 'symbol',
          source: layer.layer_id,
          minzoom: 5,
          layout: {
            'text-field': ['coalesce', ['get', 'ST_NM'], ['get', 'NAME_1'], ['get', 'name'], ['get', 'NAME']],
            'text-size': ['interpolate', ['linear'], ['zoom'], 5, 9, 8, 13],
            'text-font': ['Open Sans Regular'],
            'text-max-width': 7,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#3d3528',
            'text-halo-color': 'rgba(226,219,208,0.9)',
            'text-halo-width': 1.5,
          },
        },
      ]
    case 'rivers':
      return [
        // ── Outer glow ────────────────────────────────────────────────────
        {
          id: `${layer.layer_id}-glow`,
          type: 'line',
          source: layer.layer_id,
          paint: {
            'line-color': '#38bdf8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 10, 7, 22, 10, 32],
            'line-opacity': 0.12,
            'line-blur': 8,
          },
        },
        // ── Dark casing (gives depth) ─────────────────────────────────────
        {
          id: `${layer.layer_id}-casing`,
          type: 'line',
          source: layer.layer_id,
          paint: {
            'line-color': '#0369a1',
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3.5, 7, 7, 10, 11],
            'line-opacity': 0.55,
          },
        },
        // ── Bright main line ──────────────────────────────────────────────
        {
          id: `${layer.layer_id}-line`,
          type: 'line',
          source: layer.layer_id,
          paint: {
            'line-color': '#38bdf8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 7, 4.5, 10, 7],
            'line-opacity': 1,
          },
        },
        // ── River name labels along the path ─────────────────────────────
        {
          id: `${layer.layer_id}-labels`,
          type: 'symbol',
          source: layer.layer_id,
          minzoom: 4,
          layout: {
            'text-field': ['coalesce', ['get', 'name'], ['get', 'NAME'], ['get', 'namelong']],
            'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 13],
            'text-font': ['Open Sans Regular'],
            'symbol-placement': 'line',
            'text-max-angle': 25,
            'text-offset': [0, -0.8],
          },
          paint: {
            'text-color': '#075985',
            'text-halo-color': 'rgba(255,255,255,0.95)',
            'text-halo-width': 2,
          },
          filter: ['!=', ['coalesce', ['get', 'name'], ''], ''],
        },
      ]
    case 'relief':
      return [{ id: `${layer.layer_id}-line`, type: 'line', source: layer.layer_id, paint: { 'line-color': '#c8a882', 'line-width': 0.5, 'line-opacity': 0.6 } }]
    case 'historical_boundary':
      return [
        {
          id: `${layer.layer_id}-fill`,
          type: 'fill',
          source: layer.layer_id,
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 },
        },
        {
          id: `${layer.layer_id}-line`,
          type: 'line',
          source: layer.layer_id,
          paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-dasharray': [5, 2], 'line-opacity': 0.85 },
        },
      ]
    case 'thematic_choropleth':
      return [{
        id: `${layer.layer_id}-fill`, type: 'fill', source: layer.layer_id,
        paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'value'], 0, '#ffffcc', 50, '#fd8d3c', 100, '#800026'], 'fill-opacity': 0.75 },
      }]
    case 'event_markers':
    case 'points_of_interest':
      return [{
        id: `${layer.layer_id}-circle`, type: 'circle', source: layer.layer_id,
        paint: { 'circle-radius': 6, 'circle-color': '#e63946', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
      }]
    case 'routes':
      return [{ id: `${layer.layer_id}-line`, type: 'line', source: layer.layer_id, paint: { 'line-color': '#e63946', 'line-width': 2, 'line-dasharray': [6, 3] } }]
    case 'labels':
      return [{
        id: `${layer.layer_id}-symbol`, type: 'symbol', source: layer.layer_id,
        layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Open Sans Regular'] },
        paint: { 'text-color': '#333', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
      }]
    default:
      return []
  }
}

export function resolveDataPath(dataSource: string): string | null {
  return DATA_SOURCE_PATHS[dataSource] ?? null
}

// ─── Annotated Points ─────────────────────────────────────────────────────────

const ALL_FEATURE_COORDS: Record<string, [number, number]> = {
  // Rivers
  ganga: [85.0, 25.0], yamuna: [79.0, 27.0], brahmaputra: [91.74, 26.14],
  godavari: [80.5, 18.0], krishna: [79.5, 16.5], cauvery: [78.1, 11.5], kaveri: [78.1, 11.5],
  indus: [71.0, 27.0], mahanadi: [84.5, 20.5], narmada: [76.0, 22.5],
  tapti: [76.0, 21.5], tapi: [76.0, 21.5], chambal: [77.5, 25.5],
  betwa: [79.0, 25.0], son: [82.0, 24.5], damodar: [87.0, 23.5],
  luni: [72.0, 26.0], sabarmati: [72.6, 23.0], mahi: [73.5, 22.5],
  sutlej: [75.0, 31.0], chenab: [73.0, 32.0], ravi: [74.0, 32.5], jhelum: [74.5, 33.5],
  beas: [75.5, 32.0], ghaggar: [74.5, 30.0],
  // Mountains / Ranges
  western_ghats: [76.0, 13.5], eastern_ghats: [80.0, 14.0],
  vindhya: [79.0, 24.5], satpura: [77.0, 22.0], aravallis: [73.5, 26.0],
  himalaya: [84.0, 29.5], karakoram: [76.5, 35.5], hindu_kush: [70.0, 35.0],
  western_himalaya: [77.0, 32.0], eastern_himalaya: [90.0, 27.5],
  nilgiris: [76.7, 11.4], cardamom_hills: [77.0, 10.0], shivalik: [78.0, 30.5],
  // Passes
  zoji_la: [75.47, 34.28], nathu_la: [88.83, 27.38], banihal: [75.22, 33.48],
  rohtang: [77.23, 32.37], shipki_la: [78.77, 31.77], lipulekh: [80.26, 30.16],
  bomdi_la: [92.42, 27.27], bara_lacha: [77.37, 32.77],
  // Historical cities / capitals
  pataliputra: [85.13, 25.61], takshashila: [72.83, 33.75], taxila: [72.83, 33.75],
  ujjain: [75.78, 23.18], vaishali: [85.13, 25.99], rajgir: [85.41, 25.03],
  nalanda: [85.44, 25.14], bodh_gaya: [84.99, 24.69], sanchi: [77.74, 23.48],
  ajanta: [75.70, 20.55], ellora: [75.18, 20.02], hampi: [76.46, 15.33],
  thanjavur: [79.13, 10.79], kanchi: [79.70, 12.83], kanchipuram: [79.70, 12.83],
  mahabalipuram: [80.19, 12.62], devagiri: [75.32, 19.88],
  raigad: [73.44, 18.25], shivneri: [73.85, 19.19], sinhagad: [73.75, 18.37],
  // Battles
  battle_panipat_1526: [76.97, 29.39], battle_panipat_1556: [76.97, 29.39],
  battle_panipat_1761: [76.97, 29.39], panipat: [76.97, 29.39],
  battle_plassey_1757: [88.24, 23.79], plassey: [88.24, 23.79],
  battle_buxar_1764: [83.98, 25.57], buxar: [83.98, 25.57],
  battle_haldighati_1576: [73.67, 25.05], haldighati: [73.67, 25.05],
  battle_talikota_1565: [76.29, 16.47], talikota: [76.29, 16.47],
  battle_kalinga: [85.82, 20.22], kalinga: [85.82, 20.22],
  meerut: [77.70, 28.98], jhansi: [78.57, 25.45],
  // Modern cities
  delhi: [77.21, 28.61], mumbai: [72.88, 19.08], kolkata: [88.36, 22.57],
  chennai: [80.27, 13.08], hyderabad: [78.47, 17.37], bengaluru: [77.59, 12.97],
  bangalore: [77.59, 12.97], pune: [73.86, 18.52], ahmedabad: [72.59, 23.03],
  surat: [72.83, 21.17], jaipur: [75.79, 26.91], lucknow: [80.95, 26.85],
  patna: [85.13, 25.61], bhopal: [77.41, 23.26], nagpur: [79.09, 21.15],
  // Economic / resources
  jharia: [86.42, 23.75], raniganj: [87.08, 23.62], korba: [82.70, 22.36],
  rourkela: [84.86, 22.22], jamshedpur: [86.18, 22.80], bhilai: [81.43, 21.21],
  khetri: [75.80, 28.0], singhbhum: [85.50, 22.70],
  // Protected areas / Geography
  sundarbans: [89.0, 21.9], kaziranga: [93.37, 26.57], jim_corbett: [78.77, 29.53],
  gir: [70.79, 21.12], western_ghats_biosphere: [76.0, 11.0],
  // Ports
  kandla: [70.22, 23.00], nhava_sheva: [72.94, 18.95], chennai_port: [80.30, 13.09],
  cochin: [76.27, 9.93], visakhapatnam: [83.30, 17.69], paradip: [86.61, 20.31],
}

export function resolveAnnotatedPoints(intent: ParsedMapIntent): AnnotatedPoint[] {
  const points: AnnotatedPoint[] = []
  const seen = new Set<string>()

  for (const featureId of intent.features_to_show) {
    const key = featureId.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const coords = ALL_FEATURE_COORDS[key] ?? ALL_FEATURE_COORDS[featureId.toLowerCase()]
    if (coords && !seen.has(key)) {
      seen.add(key)
      points.push({
        id: featureId,
        coordinates: coords,
        label: featureId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        icon: getFeatureIcon(featureId, intent.map_type),
        pyq_count: 0,
      })
    }
  }

  return points
}

function getFeatureIcon(id: string, mapType: string): string {
  const t = id.toLowerCase()
  if (t.startsWith('battle_') || t.includes('battle') || t.includes('panipat') || t.includes('plassey') || t.includes('buxar') || t.includes('haldighati') || t.includes('talikota') || t.includes('kalinga') || t.includes('meerut') || t.includes('jhansi')) return '⚔️'
  if (['ganga','yamuna','brahmaputra','godavari','krishna','cauvery','kaveri','indus','mahanadi','narmada','tapti','tapi','chambal','betwa','son','damodar','luni','sabarmati','sutlej','chenab','ravi','jhelum','beas'].includes(t)) return '🌊'
  if (mapType.startsWith('physical_river')) return '🌊'
  if (['western_ghats','eastern_ghats','himalaya','vindhya','satpura','aravallis','nilgiris','karakoram','shivalik'].includes(t)) return '⛰️'
  if (t.includes('_la') || t.includes('pass') || t.includes('rohtang') || t.includes('banihal')) return '🏔️'
  if (['nalanda','taxila','takshashila','ajanta','ellora'].includes(t)) return '🎓'
  if (['sanchi','bodh_gaya','vaishali'].includes(t)) return '☸️'
  if (['pataliputra','hampi','devagiri','raigad','thanjavur','kanchi','kanchipuram'].includes(t)) return '🏛️'
  if (mapType.startsWith('economic_mineral')) return '⛏️'
  if (mapType.startsWith('thematic_protected')) return '🌿'
  if (t.includes('port') || ['kandla','nhava_sheva','cochin','paradip','visakhapatnam','sopara','poompuhar','khambhat','bombay','surat'].includes(t)) return '⚓'
  return '📍'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getBoundsForScope(scope: string, regionSpecific?: string): [number, number, number, number] {
  const BOUNDS: Record<string, [number, number, number, number]> = {
    all_india: [68.0, 8.0, 97.5, 37.5],
    peninsular_india: [74.0, 8.0, 88.0, 22.0],
    north_india: [72.0, 25.0, 88.0, 37.5],
    northeast_india: [88.0, 22.0, 97.5, 29.5],
    south_india: [74.0, 8.0, 82.0, 17.0],
    central_india: [74.0, 18.0, 84.0, 26.0],
    himalayan_region: [72.0, 28.0, 97.0, 37.5],
    south_asia: [60.0, 6.0, 97.5, 38.0],
    indian_ocean: [40.0, -30.0, 100.0, 25.0],
    world: [-180.0, -85.0, 180.0, 85.0],
  }
  return BOUNDS[scope] ?? BOUNDS.all_india
}
