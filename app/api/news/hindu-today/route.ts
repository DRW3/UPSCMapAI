/**
 * GET /api/news/hindu-today
 *
 * Returns the top UPSC-relevant articles from The Hindu's print edition
 * (today's printed newspaper). We hit the public Today's Paper page,
 * extract the embedded article-index JSON, score each headline for UPSC
 * relevance, classify by GS paper, and return the top 15 with images.
 *
 * IMPORTANT: We only return publisher-supplied metadata — title, URL,
 * page number, layout desk, the publisher's own short teaser, and the
 * publisher's hot-linked image URL. No full article bodies are fetched
 * or returned. Each card in the UI links back to the publisher's site
 * for full content. This mirrors the behaviour of standard news
 * aggregators (Google News, Apple News, RSS readers) and stays inside
 * the boundaries of fair-use linking + RSS-style aggregation.
 *
 * Cache: 1 hour in-memory (per Vercel Function instance).
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Types ────────────────────────────────────────────────────────────────

interface HinduArticle {
  title: string
  url: string
  desk: string
  page: string
  teaser: string
  image: string | null
  // Derived
  score: number
  gs: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'CA'
  gsTopic: string
  prepType: 'prelims' | 'mains' | 'both'
  whyItMatters: string
  readMinutes: number
}

// ── In-memory cache (1h) ─────────────────────────────────────────────────

let cache: { ts: number; data: HinduArticle[] } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

// ── HTML / JSON parsing ──────────────────────────────────────────────────

function getField(chunk: string, field: string): string {
  const re = new RegExp(`"${field}":"([^"]*)"`)
  const m = chunk.match(re)
  if (!m) return ''
  // Decode escaped backslash sequences (\u2019, \/, etc.)
  try {
    return JSON.parse(`"${m[1]}"`) as string
  } catch {
    return m[1].replace(/\\\//g, '/').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  }
}

function parseHinduPrintIndex(html: string): Omit<HinduArticle, 'score' | 'gs' | 'gsTopic' | 'prepType' | 'whyItMatters' | 'readMinutes'>[] {
  // Each article object in the embedded JSON has the shape:
  // {"href":"\/todays-paper\/2026-04-07\/th_chennai\/article...ece",
  //  "id":"...","layoutdesk":"TH_Edit","articleheadline":"...",
  //  "articlephoto":"https:\/\/...","pageno":"30","teaser_text":"..."}
  const out: Omit<HinduArticle, 'score' | 'gs' | 'gsTopic' | 'prepType' | 'whyItMatters' | 'readMinutes'>[] = []
  const seen = new Set<string>()
  const re = /\{"href":"[^{}]*?"teaser_text":"[^"]*"\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const chunk = m[0]
    const href = getField(chunk, 'href')
    const title = getField(chunk, 'articleheadline')
    if (!href || !title) continue
    const url = href.startsWith('http') ? href : `https://www.thehindu.com${href}`
    if (seen.has(url)) continue
    seen.add(url)
    out.push({
      title,
      url,
      desk: getField(chunk, 'layoutdesk'),
      page: getField(chunk, 'pageno'),
      teaser: getField(chunk, 'teaser_text'),
      image: getField(chunk, 'articlephoto') || null,
    })
  }
  return out
}

// ── UPSC scoring + GS classification ─────────────────────────────────────

const DROP_RE = /\b(IPL|cricket|T20|ODI|Ranji|football|tennis|Bollywood|box[- ]office|movie|trailer|actor|actress|singer|wicket|batsman|bowler|stadium|innings|squad|recipe|horoscope|wedding|fashion|restaurant|Test match)\b/i

const DROP_DESKS = new Set(['TH_Sports', 'TH_Sport', 'Sports', 'TH_Property', 'TH_Cinema', 'TH_Lifestyle', 'TH_Realestate'])

const DESK_BOOST: Record<string, number> = {
  TH_Edit: 6,
  TH_Lead: 5,
  TH_Opinion: 5,
  TH_National: 3,
  TH_Foreign: 3,
  TH_World: 3,
  TH_International: 3,
  TH_Business: 2,
  TH_SciTech: 2,
  TH_Science: 2,
  TH_Regional: 1,
}

const KEEP_RE = /\b(Supreme Court|Cabinet|Parliament|Lok Sabha|Rajya Sabha|RBI|repo rate|GST|Union Budget|scheme|Yojana|ministry|Article \d+|Constitution|amendment|bill|treaty|summit|G20|G7|BRICS|SCO|QUAD|United Nations|UN |WTO|WHO|IPCC|COP\d+|ISRO|DRDO|CAG|election commission|NITI Aayog|FATF|MoU|judgment|verdict|ordinance|policy|MSP|inflation|GDP|tribunal|commission|panel|UPSC|civil services|defence|border|China|Pakistan|Bangladesh|Nepal|Sri Lanka|Myanmar|climate|biodiversity|tiger|wildlife|pollution|environment|ecology|High Court|President|Prime Minister|Modi|minister|monetary policy|fiscal|subsidy|CBI|ED|NIA|SEBI|IRDAI|Census|NSO|NCRB|Ramsar|IUCN|UNESCO|IMF|World Bank|ADB|reservation|caste|Dalit|tribal|Scheduled|export|import|tariff|trade|farmer|agriculture|space|satellite|nuclear|missile|defense|army|navy|air force|terror|insurgency|judiciary|law|act|water|river|forest|coal|renewable|solar|electric vehicle|Iran|Israel|Russia|Ukraine|Trump|Putin|Xi|Kremlin|ruling|court|rights|dignity|censorship|health|disease|right to|Kerala|Bangladesh)\b/gi

// GS paper classification keyword maps
const GS1_KEYWORDS = /\b(history|ancient|medieval|modern|colonial|British|Mughal|Maurya|Gupta|Vedic|Indus|Harappa|partition|freedom struggle|geography|monsoon|river|Himalaya|plateau|coastal|earthquake|cyclone|society|caste|tribal|Dalit|women's movement|culture|art|architecture|temple|sculpture|dance|music|festival|UNESCO heritage|Renaming Kerala|myths)\b/i
const GS2_KEYWORDS = /\b(Constitution|Article \d+|amendment|Supreme Court|High Court|judgment|verdict|judiciary|Parliament|Lok Sabha|Rajya Sabha|Cabinet|President|Vice President|Prime Minister|Governor|election commission|federalism|Centre-State|reservation|right to|fundamental rights|directive principles|panchayati|local government|civil society|NGO|treaty|MoU|G20|G7|BRICS|SCO|QUAD|UN |UNESCO|WTO|WHO|IMF|World Bank|bilateral|foreign policy|MEA|Bangladesh|Pakistan|Nepal|Sri Lanka|Myanmar|China|Iran|Israel|Russia|Ukraine|US-India|EU|ASEAN|tribunal|commission|panel|governance|transparency|accountability|RTI|CAG|CBI|NIA|ED|polity|reservation|women's reservation|transgender|rights)\b/i
const GS3_KEYWORDS = /\b(economy|RBI|repo rate|inflation|GDP|fiscal|monetary policy|Union Budget|GST|tax|trade|export|import|tariff|FDI|MSME|startup|industry|manufacturing|agriculture|farmer|MSP|subsidy|food security|PDS|NITI Aayog|environment|climate change|pollution|biodiversity|wildlife|tiger|forest|water|river|coal|renewable|solar|wind|nuclear|electric vehicle|EV|sustainability|conservation|IPCC|COP|Ramsar|IUCN|disaster|cyclone|earthquake|flood|drought|science|technology|space|ISRO|satellite|moon|chandrayaan|DRDO|defence|missile|BrahMos|Tejas|nuclear|cyber|AI|biotechnology|health|disease|TB|tuberculosis|epidemic|pandemic|vaccine|public health|One Health|terror|insurgency|militant|naxal|Maoist|border|army|navy|air force)\b/i
const GS4_KEYWORDS = /\b(ethics|integrity|aptitude|moral|conscience|public servant|probity|emotional intelligence|values|attitude|whistleblower|conflict of interest|case study)\b/i

interface GsClassification {
  gs: HinduArticle['gs']
  topic: string
}

function classifyGs(title: string, teaser: string, desk: string): GsClassification {
  const blob = `${title} ${teaser}`
  // Editorials and Op-Eds usually map to GS-2 or GS-3 — check both
  const gs2 = (blob.match(GS2_KEYWORDS) || []).length
  const gs3 = (blob.match(GS3_KEYWORDS) || []).length
  const gs1 = (blob.match(GS1_KEYWORDS) || []).length
  const gs4 = (blob.match(GS4_KEYWORDS) || []).length

  const max = Math.max(gs1, gs2, gs3, gs4)
  if (max === 0) {
    return { gs: 'CA', topic: deskToTopic(desk) }
  }
  if (gs2 === max) return { gs: 'GS-2', topic: derivePolityTopic(blob) }
  if (gs3 === max) return { gs: 'GS-3', topic: deriveGs3Topic(blob) }
  if (gs1 === max) return { gs: 'GS-1', topic: deriveGs1Topic(blob) }
  return { gs: 'GS-4', topic: 'Ethics' }
}

function deskToTopic(desk: string): string {
  if (desk.includes('Foreign') || desk.includes('World') || desk.includes('International')) return 'Current Affairs · World'
  if (desk.includes('Edit')) return 'Editorial'
  if (desk.includes('National')) return 'Current Affairs · India'
  if (desk.includes('Business')) return 'Current Affairs · Economy'
  if (desk.includes('Science') || desk.includes('SciTech')) return 'Current Affairs · Sci-Tech'
  return 'Current Affairs'
}

function derivePolityTopic(blob: string): string {
  if (/\b(Bangladesh|Pakistan|Nepal|Sri Lanka|Myanmar|China|Iran|Israel|Russia|Ukraine|US|UN |G20|BRICS|SCO|QUAD|treaty|MoU|MEA|foreign|bilateral)\b/i.test(blob)) return 'IR · Foreign Policy'
  if (/\b(Supreme Court|High Court|judgment|verdict|judiciary|tribunal)\b/i.test(blob)) return 'Polity · Judiciary'
  if (/\b(Constitution|Article \d+|amendment|fundamental rights|directive)\b/i.test(blob)) return 'Polity · Constitution'
  if (/\b(reservation|women|transgender|Dalit|tribal|caste|rights|dignity)\b/i.test(blob)) return 'Polity · Social Justice'
  if (/\b(election|EVM|election commission|EC )\b/i.test(blob)) return 'Polity · Elections'
  if (/\b(Parliament|Lok Sabha|Rajya Sabha|Cabinet|bill|ordinance)\b/i.test(blob)) return 'Polity · Parliament'
  if (/\b(governance|transparency|RTI|CAG|civil society)\b/i.test(blob)) return 'Polity · Governance'
  return 'Polity & Governance'
}

function deriveGs3Topic(blob: string): string {
  if (/\b(climate|environment|biodiversity|wildlife|tiger|forest|river|water|pollution|IPCC|COP|Ramsar|sustainability|conservation|renewable|solar|carbon)\b/i.test(blob)) return 'Environment'
  if (/\b(RBI|repo rate|inflation|GDP|fiscal|budget|GST|tax|trade|export|import|MSP|farmer|agriculture|economy|MSME|FDI)\b/i.test(blob)) return 'Economy'
  if (/\b(ISRO|satellite|space|moon|chandrayaan|DRDO|missile|nuclear|biotechnology|cyber|AI )\b/i.test(blob)) return 'Sci-Tech'
  if (/\b(health|disease|TB|tuberculosis|pandemic|epidemic|vaccine|public health|One Health)\b/i.test(blob)) return 'Health & Sci-Tech'
  if (/\b(terror|insurgency|naxal|Maoist|border|army|navy|air force|defence|security)\b/i.test(blob)) return 'Internal Security'
  if (/\b(disaster|cyclone|earthquake|flood|drought)\b/i.test(blob)) return 'Disaster Mgmt'
  return 'Economy & Environment'
}

function deriveGs1Topic(blob: string): string {
  if (/\b(history|ancient|medieval|colonial|British|Mughal|Maurya|Gupta|partition|freedom struggle)\b/i.test(blob)) return 'History'
  if (/\b(geography|monsoon|river|Himalaya|plateau|coastal|earthquake|cyclone)\b/i.test(blob)) return 'Geography'
  if (/\b(culture|art|architecture|temple|sculpture|dance|music|festival|UNESCO heritage|myth)\b/i.test(blob)) return 'Art & Culture'
  return 'Society'
}

function inferPrepType(desk: string, gs: HinduArticle['gs']): HinduArticle['prepType'] {
  if (desk.includes('Edit') || desk.includes('Lead') || desk.includes('Opinion')) return 'mains'
  if (gs === 'CA') return 'prelims'
  if (gs === 'GS-2' || gs === 'GS-3') return 'both'
  return 'prelims'
}

function whyItMatters(article: { gs: string; gsTopic: string; desk: string; title: string }): string {
  const isOpinion = article.desk.includes('Edit') || article.desk.includes('Opinion') || article.desk.includes('Lead')
  if (article.gs === 'GS-2' && article.gsTopic.includes('Foreign')) {
    return isOpinion ? `Mains essay angle — ${article.gsTopic}` : `${article.gsTopic} fact set for Prelims`
  }
  if (article.gs === 'GS-2' && article.gsTopic.includes('Judiciary')) {
    return `${article.gsTopic} — landmark/development worth noting for both papers`
  }
  if (article.gs === 'GS-3' && article.gsTopic === 'Environment') {
    return isOpinion ? `Mains essay angle — environmental governance` : `Environment & ecology — fact + case study material`
  }
  if (article.gs === 'GS-3' && article.gsTopic === 'Economy') {
    return isOpinion ? `Mains analytical piece on the economy` : `Economy — RBI/fiscal/budget data point for Prelims`
  }
  if (article.gs === 'GS-3' && article.gsTopic.startsWith('Health')) {
    return `${article.gsTopic} — public-health intersection, increasingly tested`
  }
  if (article.gs === 'GS-2' && article.gsTopic.includes('Social Justice')) {
    return `${article.gsTopic} — directly testable in GS-2 + Mains essay`
  }
  if (article.gs === 'GS-1') {
    return `${article.gsTopic} — fact-recall material for Prelims`
  }
  if (article.gs === 'CA') {
    return `Current affairs — context-builder, may surface in Prelims`
  }
  return `${article.gs} · ${article.gsTopic}`
}

function estimateReadMinutes(teaser: string, desk: string): number {
  // Editorials are longer reads; news pieces are shorter
  if (desk.includes('Edit') || desk.includes('Lead') || desk.includes('Opinion')) return 4
  if (teaser.length > 200) return 3
  return 2
}

function score(it: { title: string; teaser: string; desk: string }): number {
  if (DROP_DESKS.has(it.desk)) return -999
  const blob = `${it.title} ${it.teaser}`
  if (DROP_RE.test(blob)) return -999
  let s = DESK_BOOST[it.desk] ?? 1
  const keepHits = (blob.match(KEEP_RE) || []).length
  s += keepHits * 2
  if (it.title.length < 18) s -= 1
  return s
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  // Array.from avoids the Set iterator downlevelIteration error.
  const arrA = Array.from(a)
  for (let i = 0; i < arrA.length; i++) {
    if (b.has(arrA[i])) inter++
  }
  return inter / (a.size + b.size - inter)
}

function tokens(s: string): Set<string> {
  return new Set((s.toLowerCase().match(/[a-z]{4,}/g) || []))
}

// ── Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ articles: cache.data, cached: true })
  }

  try {
    const res = await fetch('https://www.thehindu.com/todays-paper/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        Accept: 'text/html,application/xhtml+xml',
      },
      // Vercel edge cache for 30 minutes; on-demand revalidation
      next: { revalidate: 1800 },
    })
    if (!res.ok) {
      return NextResponse.json({ articles: [], error: `Hindu fetch failed: ${res.status}` }, { status: 502 })
    }
    const html = await res.text()
    const raw = parseHinduPrintIndex(html)

    // Score → drop noise → enrich → dedupe → top 15
    const enriched = raw
      .map(it => {
        const s = score(it)
        if (s <= 0) return null
        const { gs, topic } = classifyGs(it.title, it.teaser, it.desk)
        const prepType = inferPrepType(it.desk, gs)
        const wim = whyItMatters({ gs, gsTopic: topic, desk: it.desk, title: it.title })
        return {
          ...it,
          score: s,
          gs,
          gsTopic: topic,
          prepType,
          whyItMatters: wim,
          readMinutes: estimateReadMinutes(it.teaser, it.desk),
        } as HinduArticle
      })
      .filter((x): x is HinduArticle => x !== null)
      .sort((a, b) => b.score - a.score)

    // Jaccard dedupe (≥0.6 title overlap → drop)
    const deduped: HinduArticle[] = []
    const seenTok: Set<string>[] = []
    for (const it of enriched) {
      const t = tokens(it.title)
      if (seenTok.some(prev => jaccard(prev, t) >= 0.6)) continue
      seenTok.push(t)
      deduped.push(it)
      if (deduped.length >= 15) break
    }

    cache = { ts: Date.now(), data: deduped }
    return NextResponse.json({ articles: deduped, cached: false })
  } catch (err) {
    console.error('hindu-today fetch error:', err)
    if (cache) {
      // Stale-while-error: serve last good data even if expired
      return NextResponse.json({ articles: cache.data, cached: true, stale: true })
    }
    return NextResponse.json({ articles: [], error: String(err) }, { status: 500 })
  }
}
