/**
 * UPSC knowledge chunks for RAG.
 * Run: npx ts-node data/knowledge/seed-chunks.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * First, create the table in Supabase:
 * CREATE EXTENSION IF NOT EXISTS vector;
 * CREATE TABLE upsc_knowledge (
 *   id text PRIMARY KEY,
 *   content text NOT NULL,
 *   metadata jsonb DEFAULT '{}',
 *   embedding vector(1536)
 * );
 * CREATE INDEX ON upsc_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 */

import type { UPSCKnowledgeChunk } from '@/types'

export const SEED_CHUNKS: Omit<UPSCKnowledgeChunk, 'similarity'>[] = [
  // ─── Rivers ────────────────────────────────────────────────────────────────
  {
    id: 'rivers-himalayan-overview',
    content: `The Himalayan rivers — Indus, Ganga, and Brahmaputra — are perennial rivers fed by glaciers and monsoon rain. They form some of the world's largest alluvial plains. The Ganga basin covers about 26% of India's total land area and supports 43% of its population. These rivers are antecedent rivers, older than the Himalayas themselves, and have cut deep gorges as mountains rose.`,
    metadata: { type: 'geography', region: 'north_india', map_type: 'physical_rivers', pyq_count: 8 },
  },
  {
    id: 'rivers-peninsular-overview',
    content: `Peninsular rivers — Godavari, Krishna, Cauvery, Mahanadi — are rain-fed and seasonal. They flow east to the Bay of Bengal (except Narmada and Tapti which flow west). Godavari is called "Vriddha Ganga" and is the longest peninsular river. The Western Ghats act as the watershed between east-flowing and west-flowing rivers.`,
    metadata: { type: 'geography', region: 'peninsular_india', map_type: 'physical_rivers', pyq_count: 6 },
  },
  // ─── Mountains ─────────────────────────────────────────────────────────────
  {
    id: 'western-ghats-biodiversity',
    content: `The Western Ghats (Sahyadri) run parallel to the west coast for ~1,600 km. They are a UNESCO World Heritage Site and one of the world's eight "hottest biodiversity hotspots." They receive very heavy orographic rainfall (Cherrapunji excluded) and are the source of rivers like Godavari, Krishna, and Cauvery. The Palghat Gap is the only major break in the Ghats.`,
    metadata: { type: 'geography', region: 'peninsular_india', map_type: 'physical_mountains', pyq_count: 9 },
  },
  {
    id: 'himalayan-passes-upsc',
    content: `Key Himalayan passes: Zoji La (J&K, NH1, lowest Himalayan pass), Rohtang Pass (Himachal, connects Manali-Leh), Nathu La (Sikkim, India-China trade route reopened 2006), Banihal Pass (J&K, Jawahar Tunnel), Shipki La (Himachal-Tibet), Lipulekh (Uttarakhand-Tibet, Kailash Mansarovar route), Bomdi La (Arunachal Pradesh). These passes are strategically vital for defense and trade.`,
    metadata: { type: 'geography', map_type: 'physical_passes', pyq_count: 7 },
  },
  // ─── Historical ────────────────────────────────────────────────────────────
  {
    id: 'battle-panipat-three',
    content: `Three Battles of Panipat: (1) 1526 — Babur defeated Ibrahim Lodi, founded Mughal Empire; used artillery for first time in India. (2) 1556 — Akbar (under Bairam Khan) defeated Hemu, consolidated Mughal rule. (3) 1761 — Ahmad Shah Durrani (Abdali) defeated Marathas, checked Maratha expansion. Panipat (Haryana) sits on the flat Indo-Gangetic Plain, ideal for cavalry battles.`,
    metadata: { type: 'history', map_type: 'historical_battles', era: 'medieval_1200_1600CE', pyq_count: 10 },
  },
  {
    id: 'mughal-empire-extent',
    content: `Mughal Empire at peak under Aurangzeb (1707) covered ~4 million km², most of the Indian subcontinent except the far south. Capital: Delhi/Agra/Fatehpur Sikri. Key provinces (Subas): Punjab, Delhi, Agra, Allahabad, Bengal, Bijapur, Golconda. The Deccan campaigns (1681-1707) were decisive — Aurangzeb spent 27 years there, weakening the empire.`,
    metadata: { type: 'history', map_type: 'historical_kingdoms', era: 'medieval_1200_1600CE', pyq_count: 8 },
  },
  {
    id: 'colonial-boundaries-1947',
    content: `At Independence (1947), British India was partitioned into India and Pakistan. The Radcliffe Line (drawn by Sir Cyril Radcliffe in 5 weeks) divided Punjab and Bengal. There were 565 princely states — most acceded to India under Sardar Patel's leadership. Key integrations: Hyderabad (Operation Polo, 1948), Junagadh (referendum), Kashmir (disputed, Instrument of Accession Oct 1947).`,
    metadata: { type: 'history', map_type: 'historical_colonial', era: 'colonial_1800_1947', pyq_count: 12 },
  },
  // ─── Economic ──────────────────────────────────────────────────────────────
  {
    id: 'mineral-deposits-india',
    content: `India's mineral belt: Jharkhand-Odisha-Chhattisgarh has 90% of iron ore reserves. Coal: Jharkhand (Jharia), West Bengal (Raniganj), Chhattisgarh (Korba). Copper: Rajasthan (Khetri), Jharkhand (Singhbhum). Bauxite: Odisha (Koraput), Jharkhand. Manganese: Odisha, Maharashtra. Mica: Jharkhand, Rajasthan. India has 7% of world's iron ore reserves but imports copper and gold.`,
    metadata: { type: 'economy', map_type: 'economic_minerals', pyq_count: 7 },
  },
  // ─── Political/Administrative ───────────────────────────────────────────────
  {
    id: 'northeast-india-geography',
    content: `The Seven Sister States + Sikkim. Connected to mainland India via the Siliguri Corridor ("Chicken's Neck," 22km wide). Surrounded by China (N), Bhutan (NW), Bangladesh (S), Myanmar (E). Brahmaputra flows E→W through Assam. Highest biodiversity in India. Article 371 gives special provisions to NE states. Strategic due to China proximity — forward posts, DPSCU missions.`,
    metadata: { type: 'geography', region: 'northeast_india', map_type: 'political_states', pyq_count: 9 },
  },
]
