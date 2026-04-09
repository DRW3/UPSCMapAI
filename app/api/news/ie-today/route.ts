/**
 * GET /api/news/ie-today
 *
 * Returns the top UPSC-relevant articles from The Indian Express,
 * published on the current IST calendar date. Two sources combined:
 *
 *   1. PRIMARY: indianexpress.com/news-sitemap.xml
 *      Google News sitemap protocol — 600+ URLs covering the last
 *      ~48 hours of IE publishing, each with publication_date,
 *      title, keywords, and image. Updated every few minutes, so
 *      a 7 AM IST request already has the morning print-drop wave.
 *
 *   2. CROSS-REFERENCE: indianexpress.com/todays-paper/
 *      The IE ePaper landing page. Lists ~39 URLs hand-curated as
 *      today's print edition. We use this set ONLY to mark each
 *      sitemap article with an `inPrint` flag (and boost its score
 *      by +5). All other metadata still comes from the sitemap.
 *
 * IMPORTANT: This route returns publisher-supplied metadata only —
 * title, URL, publish timestamp, image URL hot-linked from IE's CDN,
 * and the publisher-supplied keyword tags. No article bodies are
 * fetched or returned. Each card in the UI links back to the
 * publisher's site for full content. This is exactly how RSS readers,
 * Google News, and Apple News operate.
 *
 * Cache: 1h in-memory per Vercel function instance + 30 min edge.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Types ────────────────────────────────────────────────────────────────

type GsPaper = 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'CA'

interface IeArticle {
  source: 'ie'
  title: string
  url: string
  publishedAt: string         // ISO IST
  publishedHHmm: string       // 'HH:mm IST'
  image: string | null
  inPrint: boolean
  desk: string                // derived from URL slug
  page: string                // not available for IE — always ''
  teaser: string              // not available — empty string
  score: number
  gs: GsPaper
  gsTopic: string
  prepType: 'prelims' | 'mains' | 'both'
  whyItMatters: string
  readMinutes: number
}

// ── Cache ────────────────────────────────────────────────────────────────

let cache: { ts: number; data: IeArticle[] } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

// ── Sitemap parsing ──────────────────────────────────────────────────────

interface SitemapEntry {
  url: string
  title: string
  publishedAt: string
  keywords: string
  image: string | null
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseIeNewsSitemap(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = []
  // Each <url>...</url> contains the article entry. We use a non-greedy
  // match across line breaks (the `[\s\S]*?` is the regex idiom for
  // "any character including newlines, non-greedy").
  const urlRe = /<url>([\s\S]*?)<\/url>/g
  let m: RegExpExecArray | null
  while ((m = urlRe.exec(xml))) {
    const chunk = m[1]
    const loc = chunk.match(/<loc>([^<]+)<\/loc>/)
    const title = chunk.match(/<news:title>([^<]+)<\/news:title>/)
    const pub = chunk.match(/<news:publication_date>([^<]+)<\/news:publication_date>/)
    const keywords = chunk.match(/<news:keywords>([^<]+)<\/news:keywords>/)
    const image = chunk.match(/<image:loc>([^<]+)<\/image:loc>/)
    if (!loc || !title || !pub) continue
    out.push({
      url: loc[1].trim(),
      title: decodeHtmlEntities(title[1].trim()),
      publishedAt: pub[1].trim(),
      keywords: keywords ? decodeHtmlEntities(keywords[1].trim()) : '',
      image: image ? image[1].trim() : null,
    })
  }
  return out
}

function parseTodaysPaperUrls(html: string): Set<string> {
  // Today's Paper page lists ~39 article URLs as anchor hrefs. Extract
  // them all into a set for O(1) inPrint lookup.
  const set = new Set<string>()
  const re = /href="(https:\/\/indianexpress\.com\/article\/[^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    set.add(m[1])
  }
  return set
}

// ── UPSC scoring (parallel to the Hindu route) ───────────────────────────

const DROP_RE = /\b(IPL|cricket|T20|ODI|Ranji|football|tennis|Bollywood|box[- ]office|movie|trailer|actor|actress|singer|wicket|batsman|bowler|stadium|innings|squad|recipe|horoscope|wedding|fashion|restaurant|Test match|paparazzi|red carpet|filmfare)\b/i

// IE URL slug mapping → "section" + "score boost". Slug categories that
// shouldn't ever surface for UPSC are mapped to a -999 sentinel via the
// SECTION_DROP set.
const SECTION_DROP = new Set([
  'entertainment', 'sports', 'cricket', 'cinema', 'movies', 'television',
  'fashion', 'lifestyle', 'food', 'travel', 'horoscope',
])

interface SectionInfo {
  desk: string
  boost: number
}

function classifyIeSection(url: string): SectionInfo | null {
  // URL pattern: /article/{top}/{sub?}/{slug}-{id}/
  const m = url.match(/\/article\/([^/]+)(?:\/([^/]+))?/)
  if (!m) return { desk: 'other', boost: 0 }
  const top = m[1].toLowerCase()
  const sub = (m[2] || '').toLowerCase()
  if (SECTION_DROP.has(top)) return null
  // Editor-curated UPSC desk — IE's own pre-tagged content
  if (top === 'upsc-current-affairs') return { desk: 'IE_UPSC', boost: 7 }
  // Explained — pre-curated explainer pieces
  if (top === 'explained') return { desk: 'IE_Explained', boost: 6 }
  // Opinion subcategories
  if (top === 'opinion') {
    if (sub === 'editorials') return { desk: 'IE_Editorial', boost: 6 }
    if (sub === 'columns') return { desk: 'IE_Column', boost: 4 }
    if (sub === 'op-ed') return { desk: 'IE_OpEd', boost: 4 }
    if (sub === 'lead') return { desk: 'IE_Lead', boost: 5 }
    return { desk: 'IE_Opinion', boost: 4 }
  }
  if (top === 'india') return { desk: 'IE_India', boost: 3 }
  if (top === 'world') return { desk: 'IE_World', boost: 3 }
  if (top === 'business') return { desk: 'IE_Business', boost: 2 }
  if (top === 'political-pulse') return { desk: 'IE_Political', boost: 3 }
  if (top === 'legal-news') return { desk: 'IE_Legal', boost: 4 }
  if (top === 'technology') return { desk: 'IE_Tech', boost: 2 }
  if (top === 'cities') return { desk: 'IE_Cities', boost: 1 }
  if (top === 'education') return { desk: 'IE_Education', boost: 2 }
  if (top === 'live-news') return { desk: 'IE_Live', boost: 1 }
  return { desk: top.replace(/[^a-z0-9]/g, '_'), boost: 0 }
}

const KEEP_RE = /\b(Supreme Court|Cabinet|Parliament|Lok Sabha|Rajya Sabha|RBI|repo rate|GST|Union Budget|scheme|Yojana|ministry|Article \d+|Constitution|amendment|bill|treaty|summit|G20|G7|BRICS|SCO|QUAD|United Nations|UN |WTO|WHO|IPCC|COP\d+|ISRO|DRDO|CAG|election commission|NITI Aayog|FATF|MoU|judgment|verdict|ordinance|policy|MSP|inflation|GDP|tribunal|commission|panel|UPSC|civil services|defence|border|China|Pakistan|Bangladesh|Nepal|Sri Lanka|Myanmar|climate|biodiversity|tiger|wildlife|pollution|environment|ecology|High Court|President|Prime Minister|Modi|minister|monetary policy|fiscal|subsidy|CBI|ED|NIA|SEBI|IRDAI|Census|NSO|NCRB|Ramsar|IUCN|UNESCO|IMF|World Bank|ADB|reservation|caste|Dalit|tribal|Scheduled|export|import|tariff|trade|farmer|agriculture|space|satellite|nuclear|missile|defense|army|navy|air force|terror|insurgency|judiciary|law|act|water|river|forest|coal|renewable|solar|electric vehicle|Iran|Israel|Russia|Ukraine|Trump|Putin|Xi|Kremlin|ruling|court|rights|dignity|censorship|health|disease|right to|Kerala|Bangladesh|reactor|criticality|fast breeder|PFBR|Kalpakkam|Sabarimala)\b/gi

const GS1_KEYWORDS = /\b(history|ancient|medieval|modern|colonial|British|Mughal|Maurya|Gupta|Vedic|Indus|Harappa|partition|freedom struggle|geography|monsoon|river|Himalaya|plateau|coastal|earthquake|cyclone|society|caste|tribal|Dalit|women's movement|culture|art|architecture|temple|sculpture|dance|music|festival|UNESCO heritage|Renaming Kerala|myths)\b/i
const GS2_KEYWORDS = /\b(Constitution|Article \d+|amendment|Supreme Court|High Court|judgment|verdict|judiciary|Parliament|Lok Sabha|Rajya Sabha|Cabinet|President|Vice President|Prime Minister|Governor|election commission|federalism|Centre-State|reservation|right to|fundamental rights|directive principles|panchayati|local government|civil society|NGO|treaty|MoU|G20|G7|BRICS|SCO|QUAD|UN |UNESCO|WTO|WHO|IMF|World Bank|bilateral|foreign policy|MEA|Bangladesh|Pakistan|Nepal|Sri Lanka|Myanmar|China|Iran|Israel|Russia|Ukraine|US-India|EU|ASEAN|tribunal|commission|panel|governance|transparency|accountability|RTI|CAG|CBI|NIA|ED|polity|reservation|women's reservation|transgender|rights|Sabarimala)\b/i
const GS3_KEYWORDS = /\b(economy|RBI|repo rate|inflation|GDP|fiscal|monetary policy|Union Budget|GST|tax|trade|export|import|tariff|FDI|MSME|startup|industry|manufacturing|agriculture|farmer|MSP|subsidy|food security|PDS|NITI Aayog|environment|climate change|pollution|biodiversity|wildlife|tiger|forest|water|river|coal|renewable|solar|wind|nuclear|electric vehicle|EV|sustainability|conservation|IPCC|COP|Ramsar|IUCN|disaster|cyclone|earthquake|flood|drought|science|technology|space|ISRO|satellite|moon|chandrayaan|DRDO|defence|missile|BrahMos|Tejas|nuclear|cyber|AI |biotechnology|health|disease|TB|tuberculosis|epidemic|pandemic|vaccine|public health|One Health|terror|insurgency|militant|naxal|Maoist|border|army|navy|air force|reactor|criticality|fast breeder|PFBR|Kalpakkam|three stage nuclear)\b/i
const GS4_KEYWORDS = /\b(ethics|integrity|aptitude|moral|conscience|public servant|probity|emotional intelligence|values|attitude|whistleblower|conflict of interest|case study)\b/i

interface GsClassification { gs: GsPaper; topic: string }

function classifyGs(title: string, keywords: string, desk: string): GsClassification {
  const blob = `${title} ${keywords}`
  const gs2 = (blob.match(GS2_KEYWORDS) || []).length
  const gs3 = (blob.match(GS3_KEYWORDS) || []).length
  const gs1 = (blob.match(GS1_KEYWORDS) || []).length
  const gs4 = (blob.match(GS4_KEYWORDS) || []).length
  const max = Math.max(gs1, gs2, gs3, gs4)
  if (max === 0) return { gs: 'CA', topic: deskToTopic(desk) }
  if (gs2 === max) return { gs: 'GS-2', topic: derivePolityTopic(blob) }
  if (gs3 === max) return { gs: 'GS-3', topic: deriveGs3Topic(blob) }
  if (gs1 === max) return { gs: 'GS-1', topic: deriveGs1Topic(blob) }
  return { gs: 'GS-4', topic: 'Ethics' }
}

function deskToTopic(desk: string): string {
  if (desk.includes('World')) return 'Current Affairs · World'
  if (desk.includes('Editorial') || desk.includes('Opinion') || desk.includes('Lead') || desk.includes('Column') || desk.includes('OpEd')) return 'Editorial'
  if (desk.includes('India')) return 'Current Affairs · India'
  if (desk.includes('Business')) return 'Current Affairs · Economy'
  if (desk.includes('Tech')) return 'Current Affairs · Sci-Tech'
  if (desk.includes('Explained')) return 'Explained'
  if (desk.includes('UPSC')) return 'UPSC Desk'
  return 'Current Affairs'
}

function derivePolityTopic(blob: string): string {
  if (/\b(Bangladesh|Pakistan|Nepal|Sri Lanka|Myanmar|China|Iran|Israel|Russia|Ukraine|US |UN |G20|BRICS|SCO|QUAD|treaty|MoU|MEA|foreign|bilateral)\b/i.test(blob)) return 'IR · Foreign Policy'
  if (/\b(Supreme Court|High Court|judgment|verdict|judiciary|tribunal|Sabarimala)\b/i.test(blob)) return 'Polity · Judiciary'
  if (/\b(Constitution|Article \d+|amendment|fundamental rights|directive)\b/i.test(blob)) return 'Polity · Constitution'
  if (/\b(reservation|women|transgender|Dalit|tribal|caste|rights|dignity)\b/i.test(blob)) return 'Polity · Social Justice'
  if (/\b(election|EVM|election commission|EC )\b/i.test(blob)) return 'Polity · Elections'
  if (/\b(Parliament|Lok Sabha|Rajya Sabha|Cabinet|bill|ordinance)\b/i.test(blob)) return 'Polity · Parliament'
  if (/\b(governance|transparency|RTI|CAG|civil society)\b/i.test(blob)) return 'Polity · Governance'
  return 'Polity & Governance'
}

function deriveGs3Topic(blob: string): string {
  if (/\b(reactor|criticality|fast breeder|PFBR|Kalpakkam|three stage nuclear|nuclear)\b/i.test(blob)) return 'Sci-Tech · Nuclear'
  if (/\b(climate|environment|biodiversity|wildlife|tiger|forest|river|water|pollution|IPCC|COP|Ramsar|sustainability|conservation|renewable|solar|carbon)\b/i.test(blob)) return 'Environment'
  if (/\b(RBI|repo rate|inflation|GDP|fiscal|budget|GST|tax|trade|export|import|tariff|MSP|farmer|agriculture|economy|MSME|FDI)\b/i.test(blob)) return 'Economy'
  if (/\b(ISRO|satellite|space|moon|chandrayaan|DRDO|missile|biotechnology|cyber|AI )\b/i.test(blob)) return 'Sci-Tech'
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

function inferPrepType(desk: string, gs: GsPaper): IeArticle['prepType'] {
  if (desk === 'IE_UPSC' || desk === 'IE_Explained') return 'both'
  if (desk.includes('Editorial') || desk.includes('Opinion') || desk.includes('Column') || desk.includes('OpEd') || desk.includes('Lead')) return 'mains'
  if (gs === 'CA') return 'prelims'
  if (gs === 'GS-2' || gs === 'GS-3') return 'both'
  return 'prelims'
}

function whyItMatters(article: { gs: GsPaper; gsTopic: string; desk: string; inPrint: boolean }): string {
  const opinion = /Editorial|Opinion|Column|OpEd|Lead/.test(article.desk)
  const printPrefix = article.inPrint ? '★ In today\'s print · ' : ''
  if (article.desk === 'IE_UPSC') return `${printPrefix}IE\'s own UPSC desk — direct prep material`
  if (article.desk === 'IE_Explained') return `${printPrefix}IE Explained — pre-curated UPSC explainer`
  if (article.gs === 'GS-2' && article.gsTopic.includes('Foreign')) {
    return `${printPrefix}${opinion ? 'Mains essay angle' : 'Fact set'} — ${article.gsTopic}`
  }
  if (article.gs === 'GS-2' && article.gsTopic.includes('Judiciary')) {
    return `${printPrefix}${article.gsTopic} — landmark for both papers`
  }
  if (article.gs === 'GS-3' && article.gsTopic === 'Environment') {
    return `${printPrefix}${opinion ? 'Mains essay angle — environmental governance' : 'Environment & ecology — case study'}`
  }
  if (article.gs === 'GS-3' && article.gsTopic === 'Economy') {
    return `${printPrefix}${opinion ? 'Mains analytical piece on the economy' : 'Economy fact for Prelims'}`
  }
  if (article.gs === 'GS-3' && article.gsTopic.includes('Nuclear')) {
    return `${printPrefix}GS-3 Sci-Tech · India's nuclear programme — high-yield`
  }
  if (article.gs === 'GS-3' && article.gsTopic.startsWith('Health')) {
    return `${printPrefix}${article.gsTopic} — public-health intersection`
  }
  if (article.gs === 'GS-2' && article.gsTopic.includes('Social Justice')) {
    return `${printPrefix}${article.gsTopic} — directly testable in GS-2 + Mains essay`
  }
  if (article.gs === 'GS-1') return `${printPrefix}${article.gsTopic} — fact-recall material for Prelims`
  if (article.gs === 'CA') return `${printPrefix}Current affairs — context-builder`
  return `${printPrefix}${article.gs} · ${article.gsTopic}`
}

function score(it: { title: string; keywords: string; desk: string; inPrint: boolean; sectionBoost: number }): number {
  if (it.sectionBoost < 0) return -999
  const blob = `${it.title} ${it.keywords}`
  if (DROP_RE.test(blob)) return -999
  let s = it.sectionBoost
  s += (blob.match(KEEP_RE) || []).length * 2
  if (it.inPrint) s += 5
  if (it.title.length < 18) s -= 1
  return s
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  const arrA = Array.from(a)
  for (let i = 0; i < arrA.length; i++) {
    if (b.has(arrA[i])) inter++
  }
  return inter / (a.size + b.size - inter)
}

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z]{4,}/g) || [])
}

// ── Date helpers (IST) ───────────────────────────────────────────────────

function todayIstDate(): string {
  // IST = UTC+5:30. Get the current YYYY-MM-DD in IST.
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  return ist.toISOString().slice(0, 10)
}

function istDateFromIso(iso: string): string {
  // Sitemap publication_date format: '2026-04-08T11:39:48+05:30'
  // Extract YYYY-MM-DD directly from the prefix.
  return iso.slice(0, 10)
}

function istHHmm(iso: string): string {
  // Extract HH:mm portion. The string already carries the +05:30 offset.
  const m = iso.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]} IST` : ''
}

function estimateReadMinutes(desk: string): number {
  if (desk.includes('Editorial') || desk.includes('Opinion') || desk.includes('Column') || desk.includes('OpEd') || desk.includes('Lead')) return 4
  if (desk === 'IE_Explained' || desk === 'IE_UPSC') return 5
  return 3
}

// ── Handler ──────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ articles: cache.data, cached: true })
  }

  try {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    const headers = { 'User-Agent': ua, Accept: 'text/html,application/xml,*/*' }

    const [sitemapRes, printRes] = await Promise.all([
      fetch('https://indianexpress.com/news-sitemap.xml', { headers, next: { revalidate: 1800 } }),
      fetch('https://indianexpress.com/todays-paper/', { headers, next: { revalidate: 1800 } }).catch(() => null),
    ])

    if (!sitemapRes.ok) {
      return NextResponse.json({ articles: [], error: `IE sitemap fetch failed: ${sitemapRes.status}` }, { status: 502 })
    }

    const sitemapXml = await sitemapRes.text()
    const entries = parseIeNewsSitemap(sitemapXml)

    // Cross-reference: which sitemap URLs are also in today's print edition?
    const printUrls = printRes && printRes.ok
      ? parseTodaysPaperUrls(await printRes.text())
      : new Set<string>()

    // Filter to today's IST date
    const today = todayIstDate()
    const todays = entries.filter(e => istDateFromIso(e.publishedAt) === today)

    // Score, classify, dedupe
    const enriched: IeArticle[] = []
    for (const e of todays) {
      const sect = classifyIeSection(e.url)
      if (!sect) continue
      const inPrint = printUrls.has(e.url)
      const s = score({ title: e.title, keywords: e.keywords, desk: sect.desk, inPrint, sectionBoost: sect.boost })
      if (s <= 0) continue
      const { gs, topic } = classifyGs(e.title, e.keywords, sect.desk)
      const prepType = inferPrepType(sect.desk, gs)
      const wim = whyItMatters({ gs, gsTopic: topic, desk: sect.desk, inPrint })
      enriched.push({
        source: 'ie',
        title: e.title,
        url: e.url,
        publishedAt: e.publishedAt,
        publishedHHmm: istHHmm(e.publishedAt),
        image: e.image,
        inPrint,
        desk: sect.desk,
        page: '',
        teaser: '',
        score: s,
        gs,
        gsTopic: topic,
        prepType,
        whyItMatters: wim,
        readMinutes: estimateReadMinutes(sect.desk),
      })
    }

    enriched.sort((a, b) => b.score - a.score)

    // Jaccard dedupe (drop near-duplicate titles like wire-copy reposts)
    const deduped: IeArticle[] = []
    const seenTok: Set<string>[] = []
    for (const it of enriched) {
      const t = tokens(it.title)
      if (seenTok.some(prev => jaccard(prev, t) >= 0.6)) continue
      seenTok.push(t)
      deduped.push(it)
      if (deduped.length >= 15) break
    }

    cache = { ts: Date.now(), data: deduped }
    return NextResponse.json({ articles: deduped, cached: false, totalCandidates: enriched.length })
  } catch (err) {
    console.error('ie-today fetch error:', err)
    if (cache) {
      return NextResponse.json({ articles: cache.data, cached: true, stale: true })
    }
    return NextResponse.json({ articles: [], error: String(err) }, { status: 500 })
  }
}
