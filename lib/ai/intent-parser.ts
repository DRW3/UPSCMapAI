import Groq from 'groq-sdk'
import type { ParsedMapIntent } from '@/types'

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

const PARSE_MAP_INTENT_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'parse_map_intent',
    description: 'Parse a natural language UPSC map request into a structured intent object',
    parameters: {
      type: 'object',
      properties: {
        map_type: {
          type: 'string',
          enum: [
            'physical_rivers', 'physical_mountains', 'physical_passes',
            'physical_climate', 'physical_soil', 'physical_vegetation',
            'political_states', 'political_districts', 'political_borders',
            'historical_kingdoms', 'historical_battles', 'historical_routes',
            'historical_colonial', 'historical_revolt',
            'economic_minerals', 'economic_agriculture', 'economic_industry',
            'economic_transport', 'economic_ports',
            'international_neighbors', 'international_maritime',
            'thematic_protected_areas', 'thematic_disasters',
            'thematic_tribal', 'thematic_environment',
          ],
          description: 'Primary category of the map',
        },
        region_scope: {
          type: 'string',
          enum: [
            'all_india', 'peninsular_india', 'north_india', 'northeast_india',
            'south_india', 'central_india', 'himalayan_region',
            'specific_state', 'specific_district', 'world', 'south_asia', 'indian_ocean',
          ],
          description: 'Geographic scope of the map',
        },
        region_specific: {
          type: ['string', 'null'],
          description: 'State/district name when region_scope is specific_state or specific_district',
        },
        time_period: {
          type: 'object',
          properties: {
            era: {
              type: 'string',
              enum: [
                'contemporary', 'ancient_pre500CE', 'early_medieval_500_1200CE',
                'medieval_1200_1600CE', 'late_medieval_1600_1800CE',
                'colonial_1800_1947', 'post_independence',
                // Short aliases the model often generates
                'ancient', 'medieval', 'colonial', 'modern',
                'early_medieval', 'late_medieval', 'pre_independence',
              ],
            },
            specific_year: { type: ['number', 'null'] },
            specific_event: { type: ['string', 'null'] },
          },
        },
        features_to_show: {
          type: 'array',
          items: { type: 'string' },
          description: 'Feature names/categories to show — used for Wikidata live queries (ramsar, national_parks, tiger_reserves etc.)',
        },
        features_to_highlight: {
          type: 'array',
          items: { type: 'string' },
          description: 'The 1-3 specific named things the user is asking about — used to dim everything else on the map. LEAVE EMPTY for general/overview queries. Examples: ["Ganga"] for a Ganga river query, ["Maharashtra"] for a Maharashtra state query, ["Western Ghats"] for a Western Ghats query, ["Panipat"] for a Panipat battle query, ["coal"] for a coal deposits query, ["Mauryan"] for a Mauryan empire query. Rule: if the query names a specific thing → put that name here. If the query is broad (major rivers, all states, India map) → EMPTY.',
        },
        annotation_level: {
          type: 'string',
          enum: ['minimal', 'standard', 'detailed'],
          description: 'How much labeling/annotation to show',
        },
        upsc_context: {
          type: 'string',
          description: 'One sentence on why this map matters for UPSC exam',
        },
        data_layers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              layer_id: { type: 'string' },
              layer_type: {
                type: 'string',
                enum: [
                  'base_political', 'rivers', 'relief', 'points_of_interest',
                  'historical_boundary', 'thematic_choropleth', 'event_markers',
                  'routes', 'labels',
                ],
              },
              data_source: { type: 'string' },
              visible: { type: 'boolean' },
            },
            required: ['layer_id', 'layer_type', 'data_source', 'visible'],
          },
          description: 'Ordered list of map layers to render',
        },
        sidebar_topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topics for the UPSC notes sidebar',
        },
        title: {
          type: 'string',
          description: 'Short display title for the map (max 60 chars)',
        },
        annotated_points: {
          type: 'array',
          description: 'Geographic markers for the map. ONLY include locations directly relevant to the query topic — never pad with unrelated cities or capitals. 6-15 focused points for specific queries; 12-20 for broad overviews. Coordinates must be accurate.',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique snake_case identifier',
              },
              lat: {
                type: 'number',
                description: 'Latitude in decimal degrees (must be accurate)',
              },
              lng: {
                type: 'number',
                description: 'Longitude in decimal degrees (must be accurate)',
              },
              label: {
                type: 'string',
                description: 'Display label shown on map — include a brief one-liner explanation. Format: "Name — key fact". Examples: "Pataliputra — Mauryan capital city", "Jharia — largest coal field in India", "Plassey — decisive 1757 battle site"',
              },
              icon: {
                type: 'string',
                description: 'Emoji icon: 🏛️=capital/city, ⚔️=battle, 🌊=river/lake, ⛰️=mountain range, 🏔️=peak/pass, ⚓=port, ☸️=religious, 🎓=education, ⛏️=mineral/industry, 🌿=forest/protected, 🌍=country, 🏗️=dam/infra, ⚛️=nuclear, 🏭=thermal, 💧=hydro, 📍=other',
              },
              color: {
                type: 'string',
                description: 'Hex color — use consistent colors per feature type: #e63946=battles/military, #2980b9=rivers/water, #27ae60=forests/protected, #e67e22=historical capitals, #8e44ad=religious/cultural, #2c3e50=industry/infra, #c0392b=colonial, #f39c12=mountains',
              },
            },
            required: ['id', 'lat', 'lng', 'label', 'icon', 'color'],
          },
        },
      },
      required: [
        'map_type', 'region_scope', 'features_to_show', 'features_to_highlight',
        'annotation_level', 'upsc_context', 'data_layers', 'sidebar_topics', 'title',
        'annotated_points',
      ],
    },
  },
}

const SYSTEM_INSTRUCTION = `You are an expert UPSC geography/history teacher and cartographer.
Parse user map requests into precise structured intents. Always be VERY DETAILED.

Rules for data_layers:
- Always include a base_political layer (India state boundaries) as the FIRST layer with data_source "gadm_india_states"
- For historical maps always add a historical_boundary layer with data_source "custom_historical_{era}"
- Add a rivers layer (data_source "natural_earth_rivers") ONLY when map_type is "physical_rivers". NEVER add rivers for political, historical, thematic, state-geography, or any other map type — even if rivers are briefly mentioned.
- For international/neighbors maps still include base_political as the base layer

Rules for features_to_show (used ONLY for Wikidata live data triggers — BE VERY STRICT):
- ONLY populate this when the user is EXPLICITLY asking for ALL items of that category across India/a region.
- Valid: "Show all tiger reserves" → ["tiger_reserves"] | "All major dams of India" → ["major_dams"] | "Ramsar wetlands" → ["ramsar"] | "Nuclear power plants" → ["nuclear_plants"]
- INVALID (must be EMPTY []): river disputes, battles, empires, state geography, historical queries, specific place queries, anything with features_to_highlight non-empty
- "Kaveri dispute" → [] | "Ganga river" → [] | "Volcanoes of India" → [] | "Coal deposits" → [] | "Western Ghats" → []
- Rule: if features_to_highlight is non-empty → features_to_show MUST be []
- When in doubt → leave features_to_show as []

Rules for annotated_points — ONLY PLOT WHAT THE QUERY IS ABOUT:
- STRICT RULE: annotated_points must contain ONLY locations directly relevant to the specific topic queried. NEVER pad with unrelated cities, state capitals, or general landmarks just to increase count.
- "Volcanoes of India" → ONLY volcanic sites (Barren Island, Narcondam, Deccan Traps outcrops). NOT Delhi, NOT Mumbai.
- "Coal deposits" → ONLY coal mine locations (Jharia, Raniganj, Singrauli...). NOT state capitals.
- "Ganga river" → ONLY points ON the Ganga (source, cities on its banks, tributaries, delta). NOT Deccan cities.
- "Battle of Plassey" → ONLY Plassey site + nearby forts + commanders' positions. NOT all of India's cities.
- "Tiger reserves" → ONLY tiger reserve locations. NOT cities unless they are the nearest access town.
- For general overviews (major rivers, all states, India map): spread markers evenly across the topic — 12-20 points.
- For specific single-topic queries: 6-15 highly focused points, ALL directly about that topic.
- For neighbors/international: capital cities of neighboring countries + major border crossings + New Delhi.
- Use accurate real-world coordinates — these are plotted on a live map. Double-check lat/lng values.
- Quality over quantity. 8 perfectly relevant points is far better than 25 padded ones.
- Labels MUST include a brief one-liner explanation: "Name — key fact". NOT just bare names. The label is shown on the map next to the pin so the user understands what each point is without clicking.

Rules for features_to_highlight — populate for SPECIFIC queries, EMPTY for overviews:
- "Ganga river" → ["Ganga"] | "Major rivers of India" → []
- "Maharashtra geography" → ["Maharashtra"] | "India political map" → []
- "Western Ghats" → ["Western Ghats"] | "Mountain ranges of India" → []
- "Battle of Plassey" → ["Plassey"] | "Major battles of India" → []
- "Mauryan Empire" → ["Mauryan"] | "Medieval kingdoms of India" → []
- "Coal deposits" → ["coal"] | "Minerals of India" → []
- "Kaziranga National Park" → ["Kaziranga"] | "Tiger reserves of India" → []
- "Jawaharlal Nehru Port" → ["JNPT"] | "Major ports of India" → []
- Rule: 1 specific named thing in the query → put that name here. General overview → []
Rules for sidebar_topics: exactly 5 topics, each starting with "GS-I:", "GS-II:", "GS-III:", or "Prelims:"
annotation_level: "detailed" for historical, "standard" for physical/political/international`

/**
 * Post-process the model's output to fix data_layers.
 * The llama model often returns wrong data_source / layer_type values.
 * We rebuild them deterministically based on map_type since we know
 * exactly what layers each type needs.
 */
function normalizeIntent(raw: ParsedMapIntent): ParsedMapIntent {
  const mt = raw.map_type ?? 'political_states'
  const layers: ParsedMapIntent['data_layers'] = []

  // 1. Base political layer (always present)
  const isWorld = mt.startsWith('international') || raw.region_scope === 'world'
  layers.push({
    layer_id: 'base-political',
    layer_type: 'base_political',
    data_source: isWorld ? 'world_countries' : 'gadm_india_states',
    visible: true,
  })

  // 2. Rivers layer — only for physical_rivers
  if (mt === 'physical_rivers') {
    layers.push({
      layer_id: 'rivers',
      layer_type: 'rivers',
      data_source: 'natural_earth_rivers',
      visible: true,
    })
  }

  // 3. Historical boundary — for any historical map type
  if (mt.startsWith('historical')) {
    const era = raw.time_period?.era ?? 'medieval'
    layers.push({
      layer_id: 'historical-boundary',
      layer_type: 'historical_boundary',
      data_source: `custom_historical_${era}`,
      visible: true,
    })
  }

  // 4. Thematic layers
  if (mt.startsWith('thematic_protected')) {
    layers.push({ layer_id: 'protected-areas', layer_type: 'points_of_interest', data_source: 'protected_areas', visible: true })
  }
  if (mt.startsWith('thematic_disasters')) {
    layers.push({ layer_id: 'disaster-zones', layer_type: 'thematic_choropleth', data_source: 'disaster_zones', visible: true })
  }
  if (mt.startsWith('economic_minerals')) {
    layers.push({ layer_id: 'minerals', layer_type: 'thematic_choropleth', data_source: 'mineral_deposits', visible: true })
  }

  // Fix annotated_points: ensure coordinates are valid numbers
  const points = (raw.annotated_points ?? []).filter(
    p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
      && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
  )

  return { ...raw, data_layers: layers, annotated_points: points }
}

export async function parseMapIntent(userMessage: string): Promise<ParsedMapIntent> {
  const MODELS = [
    'llama-3.1-8b-instant',                        // fastest, highest limits (500K TPD)
    'qwen/qwen3-32b',                              // good quality, 500K TPD
    'meta-llama/llama-4-scout-17b-16e-instruct',   // 500K TPD
    'llama-3.3-70b-versatile',                      // best quality, lowest limits (100K TPD)
  ] as const

  async function attempt(msg: string, model: string): Promise<ParsedMapIntent> {
    const response = await getGroq().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: msg },
      ],
      tools: [PARSE_MAP_INTENT_TOOL],
      tool_choice: { type: 'function', function: { name: 'parse_map_intent' } },
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.type !== 'function') {
      throw new Error('Model did not return a tool call')
    }

    const raw = JSON.parse(toolCall.function.arguments) as ParsedMapIntent
    return normalizeIntent(raw)
  }

  // Race all models in parallel — first successful response wins.
  // This gives the speed of the fastest available model instead of
  // waiting for each to fail sequentially.
  try {
    return await Promise.any(
      MODELS.map(model => attempt(userMessage, model))
    )
  } catch {
    // All models failed on direct prompt — try forced prompt in parallel
  }

  const forcedPrompt = `You MUST call the parse_map_intent function for this query. Interpret it as a geographic/map topic no matter what. If the exact thing doesn't exist in that region, map the region itself with what IS geographically notable there.\n\nQuery: "${userMessage}"`

  try {
    return await Promise.any(
      MODELS.map(model => attempt(forcedPrompt, model))
    )
  } catch {
    // All models failed
  }

  throw new ParseFailedError(userMessage)
}

/** Sentinel error so the route handler can distinguish parse failures from real errors */
export class ParseFailedError extends Error {
  public readonly query: string
  constructor(query: string) {
    super('parse_failed')
    this.name = 'ParseFailedError'
    this.query = query
  }
}

/** Use the 8B model to generate helpful suggestions when parsing fails */
export async function generateFallbackResponse(query: string): Promise<string> {
  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: `You are an expert UPSC geography and history assistant. The user searched for a topic that couldn't be mapped. Your job is to:
1. Briefly explain why this specific topic might not have map results (e.g., "There are no active volcanoes in Bhutan" or "This topic is not geographic in nature")
2. Suggest 3-5 closely related UPSC-relevant topics they CAN search for that WILL produce map results
3. Keep it concise, friendly, and helpful

Format as a short paragraph + bullet list of suggestions. Use markdown.`,
      },
      {
        role: 'user',
        content: `The user searched for: "${query}"\n\nGive a helpful response explaining what they can search instead.`,
      },
    ],
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}

/** Lightweight follow-up classification */
export async function classifyFollowUp(
  userMessage: string,
  currentIntent: ParsedMapIntent
): Promise<'full_replace' | 'modify'> {
  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `Current map: "${currentIntent.title}"\nUser message: "${userMessage}"\n\nClassify as "full_replace" (completely new map) or "modify" (minor change). Reply with only one of those two words.`,
    }],
    max_tokens: 20,
  })

  const text = response.choices[0]?.message?.content?.trim() ?? ''
  return text.startsWith('modify') ? 'modify' : 'full_replace'
}
