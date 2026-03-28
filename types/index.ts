export type MapType =
  | 'physical_rivers' | 'physical_mountains' | 'physical_passes'
  | 'physical_climate' | 'physical_soil' | 'physical_vegetation'
  | 'political_states' | 'political_districts' | 'political_borders'
  | 'historical_kingdoms' | 'historical_battles' | 'historical_routes'
  | 'historical_colonial' | 'historical_revolt'
  | 'economic_minerals' | 'economic_agriculture' | 'economic_industry'
  | 'economic_transport' | 'economic_ports'
  | 'international_neighbors' | 'international_maritime'
  | 'thematic_protected_areas' | 'thematic_disasters'
  | 'thematic_tribal' | 'thematic_environment'

export type RegionScope =
  | 'all_india' | 'peninsular_india' | 'north_india' | 'northeast_india'
  | 'south_india' | 'central_india' | 'himalayan_region'
  | 'specific_state' | 'specific_district' | 'world' | 'south_asia' | 'indian_ocean'

export type HistoricalEra =
  | 'contemporary' | 'ancient_pre500CE' | 'early_medieval_500_1200CE'
  | 'medieval_1200_1600CE' | 'late_medieval_1600_1800CE'
  | 'colonial_1800_1947' | 'post_independence'

export interface MapLayer {
  layer_id: string
  layer_type: 'base_political' | 'rivers' | 'relief' | 'points_of_interest'
    | 'historical_boundary' | 'thematic_choropleth'
    | 'event_markers' | 'routes' | 'labels'
  data_source: string
  visible: boolean
  style?: Record<string, unknown>
  filter_criteria?: Record<string, unknown>
}

export interface AnnotatedPointInput {
  id: string
  lat: number
  lng: number
  label: string
  icon: string
  color: string
}

export interface ParsedMapIntent {
  map_type: MapType
  region_scope: RegionScope
  region_specific?: string
  time_period?: {
    era?: HistoricalEra
    specific_year?: number
    specific_event?: string
  }
  features_to_show: string[]
  features_to_highlight: string[]
  annotation_level: 'minimal' | 'standard' | 'detailed'
  upsc_context: string
  data_layers: MapLayer[]
  sidebar_topics: string[]
  title: string
  /** AI-generated annotated points with exact coordinates */
  annotated_points?: AnnotatedPointInput[]
}

export type MapOperation =
  | { op: 'add_layer'; layer: MapLayer }
  | { op: 'remove_layer'; layer_id: string }
  | { op: 'highlight'; feature_ids: string[] }
  | { op: 'filter'; property: string; value: unknown }
  | { op: 'zoom_to'; bounds: [number, number, number, number] }
  | { op: 'add_markers'; points: AnnotatedPoint[] }
  | { op: 'update_choropleth'; property: string; colorScale: string }
  | { op: 'toggle_label'; feature_id: string; visible: boolean }
  | { op: 'full_replace'; intent: ParsedMapIntent }

export interface AnnotatedPoint {
  id: string
  coordinates: [number, number]
  label: string
  icon?: string
  color?: string
  details?: Record<string, string>
  pyq_count?: number
}

export interface MapState {
  intent: ParsedMapIntent | null
  layers: MapLayer[]
  highlightedFeatures: string[]
  viewport: {
    center: [number, number]
    zoom: number
  }
  annotatedPoints: AnnotatedPoint[]
  /** Actual bounds from the zoom_to operation — used to fit the plotted area on screen */
  targetBounds: [number, number, number, number] | null
}

export interface MapSession {
  id: string
  query: string
  title: string
  mapType: string
  timestamp: number
  intent: ParsedMapIntent
  layers: MapLayer[]
  highlightedFeatures: string[]
  annotatedPoints: AnnotatedPoint[]
  sidebarContent: string
}

export interface UPSC_PYQ {
  id?          : number
  year         : number                              // 0 = unknown (IndiaBix)
  exam_type    : 'prelims' | 'mains' | 'optional'
  paper        : 'gs1' | 'gs2' | 'gs3' | 'gs4' | 'csat' | 'general'
  question_no? : number
  question     : string
  options?     : { a: string; b: string; c: string; d: string; correct?: string }
  answer?      : string
  explanation? : string
  subject      : string
  topic        : string
  subtopic?    : string
  map_type?    : string
  region?      : string
  tags         : string[]
  difficulty?  : 'easy' | 'medium' | 'hard'
  appearances  : number
  source       : string
  source_url?  : string
  embedding?   : number[]
}

export interface UPSCKnowledgeChunk {
  id: string
  content: string
  metadata: {
    type: string
    region?: string
    map_type?: MapType
    geojson_ids?: string[]
    pyq_count?: number
    era?: string
    state?: string
  }
  similarity?: number
}
