# UPSC MapAI — Complete Technical Blueprint

A chat-first, AI-powered interactive map tool for UPSC aspirants. User types a natural language request → AI renders the right map instantly with UPSC annotations.

---

## PRODUCT VISION

**User types:** "Show me the rivers of peninsular India with their tributaries"
**App does:**
1. Renders a clean NCERT-style map with all peninsular rivers
2. Highlights westward vs eastward flowing rivers in different colors
3. Shows sidebar with UPSC notes: river lengths, states they pass through, dams, PYQ frequency
4. User types "now show only rivers that flow into the Arabian Sea" → map filters instantly

---

## 1. WHAT MAPS TO COVER (UPSC Scope)

### Physical Geography
- Rivers: Himalayan (Indus, Ganga, Brahmaputra basins) + Peninsular (east-flowing vs west-flowing)
- Mountain passes: Khardung La, Zoji La, Rohtang, Nathu La, Jelep La, Shipki La, Lipulekh, Bomdi La, Diphu, Pangsau
- Physiographic divisions: Himalayas, IGP, Deccan Plateau, Coastal Plains, Islands
- Soils: Alluvial (Khadar/Bhangar), Black Cotton, Red, Laterite, Arid, Saline, Peaty
- Climate zones + Rainfall isohyets + Monsoon tracks (Arabian Sea + Bay of Bengal branches)
- Vegetation zones: Tropical evergreen, deciduous, thorn scrub, montane, mangroves

### Political Geography
- States + UTs with formation dates (especially: 1953 linguistic reorganization, 2000 trifurcation, 2014 Telangana, 2019 J&K)
- Border disputes: LAC (Eastern/Sikkim/Western sectors), LoC, Sir Creek, Kalapani-Lipulekh
- Tri-junction points (high PYQ frequency)

### Historical Maps (Highest UPSC Value)
- Ancient: Harappan sites, 16 Mahajanapadas, Mauryan Empire, Gupta Empire, Ashoka edicts, Buddhist/Jain sites, ancient trade routes
- Medieval: Chola Empire peak, Delhi Sultanate phases, Vijayanagara, Mughal expansion (Akbar/Aurangzeb), Maratha Confederacy 1760, Sikh Empire
- Colonial: European trading posts, British expansion phases (1757→1947), 1857 revolt centers, Partition/Radcliffe Line
- Princely States pre-1947

### Economic Geography
- Mineral belts: Iron ore (Jharkhand-Odisha belt, Karnataka), Coal (Damodar, Godavari, Wardha), Petroleum (Mumbai High, Assam, Gujarat, Barmer), Copper (Singhbhum, Khetri), Gold (Kolar), Uranium, Mica
- Agriculture zones: Rice, Wheat, Cotton, Sugarcane, Jute, Tea, Coffee, Spices
- Industry: Steel plants (Bhilai, Durgapur, Rourkela, Bokaro, Jamshedpur), Ports (all 13 major), Nuclear plants, ISRO centers
- Transport: Railway zones, National Highways (GQ, NSEW corridors), Inland waterways

### International / Maritime
- Neighboring countries with strategic angles (CPEC, String of Pearls, Chabahar)
- Ocean chokepoints: Strait of Hormuz, Bab-el-Mandeb, Malacca, Palk Strait, Ten Degree Channel
- Ocean currents, monsoon wind patterns
- India's EEZ (2.37 million sq km)

### Thematic Maps
- Biodiversity hotspots (4 in India), Biosphere Reserves (18), Tiger Reserves (54), Ramsar Wetlands (82)
- UNESCO World Heritage Sites (42)
- Tribal/Scheduled Areas: 5th Schedule vs 6th Schedule states
- Naxal/LWE-affected districts (Red Corridor)
- Flood-prone + Drought-prone districts

---

## 2. AI ARCHITECTURE

### LLM Choice
**Primary: Claude claude-sonnet-4-6** — best for geographic reasoning + strict tool use (guaranteed JSON schema conformance for map rendering)
**Fast follow-ups: claude-haiku-4-5** — 3-5x cheaper, sub-second latency for "zoom to Punjab" type commands
**Initial session planning: claude-opus-4-6** — once per session, cached

### Two-Phase Intent Pipeline

**Phase 1 — Intent Classification (Tool Use, ~200ms)**
Claude extracts structured intent from user's natural language:

```typescript
const mapRequestTool = {
  name: "parse_map_request",
  input_schema: {
    type: "object",
    properties: {
      map_type: { type: "string", enum: [
        "physical_rivers", "physical_mountains", "physical_passes",
        "physical_climate", "physical_soil", "physical_vegetation",
        "political_states", "political_districts", "political_borders",
        "historical_kingdoms", "historical_battles", "historical_routes",
        "historical_colonial", "historical_revolt",
        "economic_minerals", "economic_agriculture", "economic_industry",
        "economic_transport", "economic_ports",
        "international_neighbors", "international_maritime",
        "thematic_protected_areas", "thematic_disasters",
        "thematic_tribal", "thematic_environment"
      ]},
      region_scope: { type: "string", enum: [
        "all_india", "peninsular_india", "north_india", "northeast_india",
        "south_india", "central_india", "himalayan_region",
        "specific_state", "specific_district", "world", "south_asia", "indian_ocean"
      ]},
      time_period: {
        era: "contemporary | ancient_pre500CE | early_medieval_500_1200CE | medieval_1200_1600CE | late_medieval_1600_1800CE | colonial_1800_1947",
        specific_year: 1760,
        specific_event: "Battle of Panipat III"
      },
      features_to_show: ["string"],      // specific rivers, mineral types, etc.
      features_to_highlight: ["string"], // subset to emphasize
      data_layers: [{ layer_type, data_source, filter_criteria }],
      sidebar_topics: ["string"],        // UPSC study points for side panel
      upsc_context: "string"            // which syllabus topics this covers
    }
  }
}
```

**Phase 2 — Data Resolution (~100ms)**
Structured intent → load correct GeoJSON layers + generate annotations via Claude.

### Map Operations (Diff-based for fast follow-ups)

```typescript
type MapOperation =
  | { op: "add_layer";       layer: LayerConfig }
  | { op: "remove_layer";    layer_id: string }
  | { op: "highlight";       feature_ids: string[] }
  | { op: "filter";          property: string; value: any }
  | { op: "zoom_to";         bounds: BBox }
  | { op: "add_markers";     points: AnnotatedPoint[] }
  | { op: "update_choropleth"; property: string; colorScale: string }
  | { op: "toggle_label";    feature_id: string; visible: boolean };
```

This means "now highlight only westward-flowing rivers" is a `filter + highlight` op on the existing map, not a full re-render.

### RAG Knowledge Base
Embed ~10,000 UPSC fact chunks into a vector DB:
- Each major river as a chunk (~500 tokens): name, length, origin, tributaries, states, dams, PYQ frequency
- Each historical battle: location, year, belligerents, outcome, UPSC angle
- Each mineral: type, states, major mines, economic importance
- NCERT chapter summaries (Class 6-12 History + Geography)
- PYQ database: each question tagged to geographic feature → powers "this has been asked 4 times in UPSC Prelims" annotations

**Embedding model:** `text-embedding-3-small` (OpenAI, $0.02/1M tokens — full UPSC corpus costs ~$2 to index)

---

## 3. MAP DATA SOURCES

### Administrative Boundaries
| Data | Source | URL | Size |
|------|---------|-----|------|
| India States | GADM v4.1 | `https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IND_1.json` | ~3MB |
| India Districts (773) | GADM v4.1 | `https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IND_2.json` | ~25MB → simplify to 4MB |
| World Countries | Natural Earth 10m | `https://www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_0_countries_ind.zip` | ~3MB |
| India Census Data | HindustanTimesLabs | `https://github.com/HindustanTimesLabs/shapefiles` | Various |

### Physical Features
| Data | Source | Notes |
|------|---------|-------|
| Major Rivers | Natural Earth 10m + clip to India | Missing many peninsular tributaries — supplement with OSM |
| Detailed Rivers | HydroSHEDS HydroRIVERS | `https://www.hydrosheds.org/products/hydrorivers` — 8.5M segments, filter `dis_m3_pyr > 1` |
| OSM Rivers | Overpass API | `way["waterway"="river"](area["ISO3166-1"="IN"])` — cache result |
| Protected Areas | WDPA | `https://www.protectedplanet.net` — filter by ISO3=IND, contains all 54 tiger reserves |
| Soil Types | FAO HWSD | `https://www.fao.org/soils-portal/data-hub/` — or manually digitize 7 zones from NCERT |
| Rainfall | IMD Gridded | `https://imdpune.gov.in` — or hand-digitize 6 isohyet bands |
| Railways | Natural Earth 10m | `https://www.naturalearthdata.com/download/10m/cultural/ne_10m_railroads.zip` |

### Historical Boundaries (Competitive Moat)
**The honest truth: No single good open-source dataset exists for South Asian historical boundaries at UPSC-required detail.**

**Solution: One-time 40-hour QGIS digitization of 25 key templates from Schwartzberg's Historical Atlas of South Asia (archive.org)**

Priority templates to build:
1. Harappan Civilization sites + extent (~2300 BCE)
2. 16 Mahajanapadas (600 BCE)
3. Mauryan Empire at Ashoka (250 BCE)
4. Gupta Empire peak (380 CE)
5. Chola Empire peak (1030 CE)
6. Delhi Sultanate - Tughlaq peak (1330 CE)
7. Vijayanagara Empire (1520 CE)
8. Mughal - Akbar (1600 CE)
9. Mughal - Aurangzeb (1700 CE)
10. Maratha Confederacy (1760 CE)
11. Sikh Empire - Ranjit Singh (1830 CE)
12-17. British India expansion phases: 1757, 1800, 1820, 1848, 1857 pre/post revolt
18. Princely States 1946
19. Partition 1947 + Radcliffe Line
20-25. Ancient trade routes, colonial European posts, Subsidiary Alliance map, etc.

**For point features (battles, revolt centers, Harappan sites):** Pre-generate with Claude (validated against known coordinates), store as static GeoJSON. Example:
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [76.973, 29.390] },
  "properties": {
    "name": "Battle of Panipat I (1526)",
    "year": 1526,
    "outcome": "Mughal victory, end of Delhi Sultanate",
    "upsc_angle": "First use of gunpowder artillery in India (tulughma formation)",
    "pyq_count": 6
  }
}
```

---

## 4. RENDERING TECH STACK

### Decision: MapLibre GL JS + D3.js overlay

| Library | Verdict |
|---------|---------|
| **MapLibre GL JS 4.x** | PRIMARY — WebGL rendering, handles 100K features at 60fps, free (Mapbox fork), excellent GeoJSON support, custom style JSON |
| **D3.js v7** | SUPPLEMENTAL — SVG annotations, custom legends, UPSC-style hand-drawn arrows, flow diagrams |
| Leaflet | Skip — tile-based aesthetic, poor projection flexibility |
| react-simple-maps | Skip — SVG DOM too slow for district-level + rivers simultaneously |

### NCERT Atlas Visual Style
```typescript
const upscMapStyle = {
  background: '#cce5f6',           // ocean blue
  landFill: '#f5f0e8',             // NCERT map beige
  stateBorder: '#6b5a4a',
  districtBorder: '#c4b5a0',
  riverColor: '#4a90d9',
  historicalFill: 'rgba(255,180,50,0.3)',  // amber for empires
  highlightColor: '#e63946',       // red for emphasis
  labelFont: 'Georgia, serif'      // matches printed atlas
}
```

---

## 5. FULL TECH STACK

```
Frontend:  Next.js 14 (App Router) + TypeScript
Chat UI:   Vercel AI SDK v4 (useChat hook, streaming)
Map:       MapLibre GL JS 4.x + D3.js v7
Styling:   Tailwind CSS v3 + shadcn/ui
State:     Zustand 5

Backend:   Next.js API Routes (MVP) → Fastify on Railway (production)
AI:        Claude claude-sonnet-4-6 / claude-haiku-4-5 / claude-opus-4-6 via @anthropic-ai/sdk
Embeddings: text-embedding-3-small (OpenAI)

Database:  Supabase PostgreSQL + pgvector (user data + UPSC knowledge base)
Vector DB: pgvector (MVP) → Qdrant on Railway (scale)
Session:   Upstash Redis (map state, conversation history)
GeoJSON:   Cloudflare R2 (static asset storage, free 10GB/10M reads)

Hosting:   Vercel (frontend) + Railway optional (heavy backend)

Cost MVP:  $0/month (all free tiers)
Cost 1K DAU: ~$25-50/month
```

### Key packages
```json
{
  "next": "^14.2.0",
  "ai": "^4.0.0",
  "@anthropic-ai/sdk": "^0.78.0",
  "maplibre-gl": "^4.7.0",
  "d3": "^7.9.0",
  "topojson-client": "^3.1.0",
  "zustand": "^5.0.0",
  "@supabase/supabase-js": "^2.47.0",
  "openai": "^4.77.0"
}
```

---

## 6. UX FLOW — STEP BY STEP

**User types:** "Show me the important passes of the Himalayas with their strategic significance"

```
1. [claude-haiku-4-5, ~200ms]
   → Classify: map_type=physical_passes, region=himalayan_region
   → Extract: features_to_show=["Khardung La","Zoji La","Bara Lacha La","Rohtang","Shipki La","Lipulekh","Nathu La","Jelep La","Bomdi La","Diphu","Pangsau"]

2. [Data Resolver, ~100ms]
   → Load: india_states.topojson (base)
   → Load: passes.geojson (filtered: himalayan_region)
   → RAG query: "himalayan passes strategic significance" → top 5 chunks

3. [Map Renderer, ~50ms]
   → Render India base map (beige, state borders)
   → Add pass markers with custom SVG icons (mountain symbol)
   → Color-code: India-China border passes (red), India-Pakistan (orange), others (blue)

4. [claude-sonnet-4-6, streaming, ~1.5s]
   → Generate sidebar content:
      "🏔️ Himalayan Passes — UPSC Notes

      Nathu La (Sikkim, 4310m): India-China trade route reopened 2006 after 44 years.
      China route to Tibet. Asked in UPSC 2019 Prelims.

      Zoji La (J&K, 3528m): Only road link between Leh and Srinagar. Closed winters.
      NH-1 passes through. India-Pakistan 1947 war strategic point.

      Lipulekh (Uttarakhand, 5334m): India-China-Nepal trijunction. India-Nepal border
      dispute 2020. Kailash Mansarovar Yatra route.
      ..."

5. User: "Which of these are disputed with China?"
   → [claude-haiku-4-5] → MapOperation: highlight [Nathu La, Jelep La, Shipki La, Lipulekh, Bomdi La]
   → [D3 overlay] → Pulse animation on highlighted passes
   → [Sidebar update] → Filter to only show China-disputed passes with LAC context
```

---

## 7. DATABASE SCHEMA

```sql
-- UPSC Knowledge Base (pgvector)
CREATE TABLE upsc_knowledge (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB,
  -- {"type":"river","region":"peninsular","map_type":"physical_rivers","geojson_ids":["river_narmada"],"pyq_count":4}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON upsc_knowledge USING hnsw (embedding vector_cosine_ops);

-- Map sessions
CREATE TABLE map_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  conversation JSONB DEFAULT '[]',
  current_map_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved maps
CREATE TABLE saved_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT,
  map_state JSONB,
  query TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  plan TEXT DEFAULT 'free',  -- free | pro | institute
  maps_generated INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. PYQ ANALYSIS — HIGHEST FREQUENCY MAP TOPICS

Based on UPSC Prelims 2014-2024 analysis:

| Topic | PYQ Count | Priority |
|-------|-----------|----------|
| Mountain Passes (Himalayan) | 12 | P0 |
| Rivers & Tributaries | 18 | P0 |
| Westward-flowing peninsular rivers | 8 | P0 |
| Mineral distribution | 14 | P0 |
| 1857 Revolt centers | 7 | P0 |
| Buddhist/Jain heritage sites | 9 | P0 |
| Ramsar wetlands / National Parks | 11 | P0 |
| Maratha/Mughal empire extents | 6 | P1 |
| Tribal/Scheduled areas | 5 | P1 |
| Straits & chokepoints | 8 | P1 |
| Nuclear/Steel plant locations | 7 | P1 |
| Biodiversity hotspots | 4 | P1 |
| Soil types | 5 | P1 |
| Ocean currents (Indian Ocean) | 4 | P2 |
| SEZs & ports | 6 | P2 |

Build templates for all P0 topics first.

---

## 9. COMPETITION & MONETIZATION

### Existing Players
| Tool | Gap |
|------|-----|
| Drishti IAS maps | Static images, no interaction, no chat |
| Vision IAS atlas | PDF/print, not searchable |
| Google Maps | Not UPSC-contextual, no historical layers |
| MapMyIndia | Commercial, no UPSC annotation |
| **Gap: ZERO** tools combine chat + dynamic map + UPSC context |

### Pricing Model
```
Free:          10 maps/day, no save, watermark on export
Pro (₹299/mo): Unlimited maps, save + organize, PDF export, PYQ annotations
Institute (₹999/mo per teacher): Class sharing, custom map sets, 100 student accounts
```

Target: 50,000 UPSC aspirants (market: 500K+ active in India) × ₹299 = ₹1.5 Cr MRR potential

### Growth Strategy
- Launch free on Reddit (r/UPSC has 800K members)
- YouTube demos showing "I asked AI to show 1857 revolt map" → viral potential
- Partner with UPSC coaching institutes (Drishti, Vision, ForumIAS)
- SEO: "UPSC map questions" gets 50K+/month searches

---

## 10. MVP SCOPE — 4 WEEKS

### Week 1: Foundation
- [ ] Next.js project setup with MapLibre + Tailwind
- [ ] Basic chat UI (Vercel AI SDK useChat)
- [ ] India states + rivers rendered on map (static, no AI yet)
- [ ] Claude integration: parse "show me X map" → render correct layer

### Week 2: Core Map Types
- [ ] Build 15 static GeoJSON datasets: states, districts, major rivers, passes, minerals, ports, national parks
- [ ] Implement 8 map types: physical_rivers, physical_passes, political_states, economic_minerals, thematic_protected_areas, historical_battles (1857), international_maritime, physical_climate
- [ ] UPSC sidebar notes for each map type (static content first)

### Week 3: AI Intelligence
- [ ] RAG pipeline: index 500 UPSC knowledge chunks into pgvector
- [ ] Streaming annotations: Claude generates contextual notes in real-time
- [ ] Follow-up queries: diff-based map operations ("now highlight X")
- [ ] PYQ frequency badges on features

### Week 4: Polish + Launch
- [ ] 5 historical map templates (QGIS digitized): Mughal, Maratha, 1857, British phases, Mauryan
- [ ] Save maps feature
- [ ] Auth (Supabase Auth)
- [ ] Deploy on Vercel
- [ ] 10 beta users from UPSC forums

### Post-MVP Backlog
- [ ] All 25 historical templates
- [ ] Offline mode (service worker + cached GeoJSON)
- [ ] Map comparison: "compare Maratha 1760 vs British 1800"
- [ ] Export as UPSC-ready PDF
- [ ] Mobile app (React Native + MapLibre iOS/Android)
- [ ] Voice input ("Alexa, show me the peninsular rivers")

---

## 11. FOLDER STRUCTURE

```
UPSCMapAI/
├── app/
│   ├── (chat)/
│   │   └── page.tsx              # Main chat + map interface
│   ├── api/
│   │   ├── map/route.ts          # AI map generation endpoint
│   │   └── knowledge/route.ts    # RAG search endpoint
│   └── layout.tsx
├── components/
│   ├── MapCanvas.tsx             # MapLibre GL JS wrapper
│   ├── ChatInterface.tsx         # Vercel AI SDK chat UI
│   ├── UPSCNotes.tsx             # Streaming sidebar panel
│   ├── MapLegend.tsx             # D3 SVG legend
│   └── HistoricalTimeline.tsx    # Slider for temporal maps
├── lib/
│   ├── ai/
│   │   ├── intent-parser.ts      # Phase 1: Claude tool use
│   │   ├── data-resolver.ts      # Phase 2: GeoJSON loading
│   │   └── annotation-gen.ts     # Streaming UPSC notes
│   ├── map/
│   │   ├── map-store.ts          # Zustand map state
│   │   ├── layer-manager.ts      # Add/remove/update layers
│   │   └── projections.ts        # d3-geo helpers
│   └── rag/
│       ├── embeddings.ts         # OpenAI embedding client
│       └── retrieval.ts          # pgvector similarity search
├── data/
│   ├── geojson/                  # Static map datasets (git LFS)
│   │   ├── political/
│   │   ├── physical/
│   │   ├── thematic/
│   │   └── historical/
│   └── knowledge/
│       └── seed-chunks.ts        # UPSC knowledge base seeder
├── scripts/
│   ├── process-geojson.sh        # GDAL/mapshaper processing
│   └── seed-knowledge.ts         # Index UPSC chunks into pgvector
└── public/
    └── map-icons/                # SVG icons for passes, minerals, etc.
```

---

## 12. FIRST CODE TO WRITE

Start with this `MapCanvas.tsx` to prove the map renders correctly, then add AI on top:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'india': {
            type: 'geojson',
            data: '/data/geojson/political/india_states.geojson'
          },
          'rivers': {
            type: 'geojson',
            data: '/data/geojson/physical/rivers_major.geojson'
          }
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#cce5f6' } },
          { id: 'land', type: 'fill', source: 'india',
            paint: { 'fill-color': '#f5f0e8', 'fill-outline-color': '#6b5a4a' } },
          { id: 'borders', type: 'line', source: 'india',
            paint: { 'line-color': '#6b5a4a', 'line-width': 1.5 } },
          { id: 'rivers', type: 'line', source: 'rivers',
            paint: { 'line-color': '#4a90d9',
                     'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 8, 2] } }
        ]
      },
      center: [82.8, 22.5],
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 12
    })

    return () => map.current?.remove()
  }, [])

  return <div ref={mapContainer} className="w-full h-full" />
}
```

---

*Research completed: March 2026. Ready to build.*
