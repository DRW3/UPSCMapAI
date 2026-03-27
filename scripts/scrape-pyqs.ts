/**
 * scripts/scrape-pyqs.ts
 *
 * Scrapes UPSC-relevant questions from:
 *   1. IndiaBix General Knowledge — /general-knowledge/{category}/
 *      HTML confirmed live: bix-td-qtxt, bix-td-option-val, jq-hdnakq (answer)
 *   2. Examveda  — /mcq-question-on-{category}/ (year-tagged UPSC PYQs)
 *
 * Output: data/pyqs/scraped/{source}_{category}.json
 *         data/pyqs/all_pyqs.json   (merged + deduped)
 *
 * Run:
 *   npx tsx scripts/scrape-pyqs.ts
 *   npx tsx scripts/scrape-pyqs.ts --source indiabix
 *   npx tsx scripts/scrape-pyqs.ts --source examveda
 */

import * as fs   from 'fs'
import * as path from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RawPYQ {
  question     : string
  options      : { a: string; b: string; c: string; d: string } | null
  answer       : string | null
  explanation  : string | null
  year         : number | null
  exam_type    : 'prelims' | 'mains' | 'general'
  paper        : 'gs1' | 'gs2' | 'gs3' | 'gs4' | 'csat' | 'general'
  subject      : string
  topic        : string
  subtopic     : string | null
  map_type     : string | null
  region       : string | null
  tags         : string[]
  difficulty   : 'easy' | 'medium' | 'hard' | null
  source       : string
  source_url   : string
}

// ── Source config ─────────────────────────────────────────────────────────────

interface IndiaBixSource {
  slug      : string    // /general-knowledge/{slug}/
  subject   : string
  topic     : string
  subtopic  : string | null
  map_types : string[]
  tags      : string[]
  maxPages  : number
}

const INDIABIX_SOURCES: IndiaBixSource[] = [
  {
    slug: 'indian-geography', subject: 'geography', topic: 'physical_geography',
    subtopic: null,
    map_types: ['physical_rivers','physical_mountains','physical_passes',
                'physical_climate','physical_soil','physical_vegetation',
                'political_states','economic_minerals'],
    tags: ['geography','india','upsc'], maxPages: 20,
  },
  {
    slug: 'world-geography', subject: 'geography', topic: 'world_geography',
    subtopic: 'international',
    map_types: ['international_neighbors','international_maritime'],
    tags: ['world','geography','international','upsc'], maxPages: 8,
  },
  {
    slug: 'indian-history', subject: 'history', topic: 'general_history',
    subtopic: null,
    map_types: ['historical_kingdoms','historical_battles','historical_colonial','historical_revolt'],
    tags: ['history','india','upsc','gs1'], maxPages: 20,
  },
  {
    slug: 'indian-economy', subject: 'economy', topic: 'economic_geography',
    subtopic: null,
    map_types: ['economic_minerals','economic_agriculture','economic_industry',
                'economic_transport','economic_ports'],
    tags: ['economy','india','upsc','gs3'], maxPages: 15,
  },
  {
    slug: 'indian-politics', subject: 'polity', topic: 'governance',
    subtopic: null,
    map_types: ['political_states','political_borders'],
    tags: ['polity','constitution','upsc','gs2'], maxPages: 15,
  },
  {
    slug: 'indian-culture', subject: 'history', topic: 'art_culture',
    subtopic: 'culture',
    map_types: ['historical_kingdoms','thematic_tribal'],
    tags: ['culture','heritage','upsc','gs1'], maxPages: 8,
  },
  {
    slug: 'biology', subject: 'environment', topic: 'environment',
    subtopic: 'ecology_biodiversity',
    map_types: ['thematic_protected_areas','thematic_environment'],
    tags: ['environment','ecology','biodiversity','upsc','gs3'], maxPages: 10,
  },
  {
    slug: 'famous-places-in-india', subject: 'geography', topic: 'places',
    subtopic: 'places_of_interest',
    map_types: ['political_states','thematic_protected_areas'],
    tags: ['places','india','upsc'], maxPages: 8,
  },
]

// Examveda URL slugs for year-tagged UPSC Prelims PYQs
const EXAMVEDA_SOURCES = [
  { slug: 'indian-geography',          subject: 'geography', topic: 'physical_geography',    map_types: ['physical_rivers','physical_mountains','political_states'] },
  { slug: 'ancient-indian-history',    subject: 'history',   topic: 'ancient_history',        map_types: ['historical_kingdoms','historical_routes'] },
  { slug: 'medieval-indian-history',   subject: 'history',   topic: 'medieval_history',       map_types: ['historical_kingdoms','historical_battles'] },
  { slug: 'modern-indian-history',     subject: 'history',   topic: 'modern_history',         map_types: ['historical_colonial','historical_revolt'] },
  { slug: 'indian-economy',            subject: 'economy',   topic: 'economic_geography',     map_types: ['economic_minerals','economic_agriculture','economic_ports'] },
  { slug: 'environment-and-ecology',   subject: 'environment', topic: 'environment',          map_types: ['thematic_protected_areas','thematic_environment'] },
]

// ── HTTP ──────────────────────────────────────────────────────────────────────

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchHTML(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) { console.warn(`  ⚠ ${res.status} ${url}`); return null }
    return await res.text()
  } catch (err) {
    console.warn(`  ✕ ${url}`, (err as Error).message)
    return null
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── HTML utils ────────────────────────────────────────────────────────────────

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ').trim()
}

// ── IndiaBix parser (confirmed structure 2024) ────────────────────────────────
//
// <div class="bix-div-container">
//   <div class="bix-td-qno" id="qno1">1.</div>
//   <div class="bix-td-qtxt table-responsive w-100">Question text here</div>
//   <div class="bix-tbl-options" id="tblOption_661">
//     <div class="bix-opt-row">
//       <div class="bix-td-option" id="tdOptionNo_A_661">…</div>
//       <div class="bix-td-option-val …" id="tdOptionDt_A_661">
//         <div class="flex-wrap">Option A text</div>
//       </div>
//     </div>
//     … B, C, D …
//   </div>
//   <input type="hidden" class="jq-hdnakq" id="hdnAnswer_661" value="D">
//   <div class="bix-ans-description table-responsive">Explanation…</div>
// </div>

function parseIndiaBixPage(html: string, src: IndiaBixSource, pageUrl: string): RawPYQ[] {
  const questions: RawPYQ[] = []

  // Split on container boundaries
  const blocks = html.split(/<div[^>]+class="[^"]*bix-div-container[^"]*"/)
  if (blocks.length < 2) return questions

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    // ── Question text ─────────────────────────────────────────────────────────
    const qMatch = block.match(/bix-td-qtxt[^>]*>([\s\S]*?)<\/div/)
    if (!qMatch) continue
    const question = stripHTML(qMatch[1]).replace(/^\d+\.\s*/, '').trim()
    if (question.length < 10) continue

    // ── Options ───────────────────────────────────────────────────────────────
    // Extract each option by its ID suffix _A_NNN, _B_NNN, etc.
    const optMap: Record<string, string> = {}
    const optRegex = /tdOptionDt_([A-D])_\d+"[^>]*>([\s\S]*?)<\/div\s*>\s*<\/div/gi
    let om: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((om = optRegex.exec(block)) !== null) {
      optMap[om[1].toLowerCase()] = stripHTML(om[2]).trim()
    }

    // Fallback: bix-td-option-val pattern
    if (Object.keys(optMap).length < 4) {
      const vals = Array.from(block.matchAll(/bix-td-option-val[^>]*>([\s\S]*?)<\/div\s*>\s*<\/div/g))
      const letters = ['a', 'b', 'c', 'd']
      vals.slice(0, 4).forEach((m, idx) => {
        if (!optMap[letters[idx]]) optMap[letters[idx]] = stripHTML(m[1]).trim()
      })
    }

    let options: RawPYQ['options'] = null
    if (optMap.a && optMap.b && optMap.c && optMap.d) {
      options = { a: optMap.a, b: optMap.b, c: optMap.c, d: optMap.d }
    }

    // ── Answer (hidden input) ─────────────────────────────────────────────────
    // <input ... class="jq-hdnakq" ... value="D">
    let answer: string | null = null
    const ansMatch = block.match(/jq-hdnakq[^>]+value="([A-Da-d])"/)
      || block.match(/hdnAnswer_\d+"[^>]+value="([A-Da-d])"/)
    if (ansMatch) answer = ansMatch[1].toLowerCase()

    // ── Explanation ───────────────────────────────────────────────────────────
    let explanation: string | null = null
    const expMatch = block.match(/bix-ans-description[^>]*>([\s\S]*?)<\/div/)
    if (expMatch) {
      const raw = stripHTML(expMatch[1]).replace(/Let's discuss\./i, '').trim()
      if (raw.length > 15 && !raw.toLowerCase().includes('no answer description')) {
        explanation = raw
      }
    }

    const mapType = classifyMapType(question, src.map_types)
    const region  = extractRegion(question)

    questions.push({
      question,
      options,
      answer,
      explanation,
      year       : null,
      exam_type  : 'general',
      paper      : src.subject === 'economy' || src.subject === 'environment' ? 'gs3'
                 : src.subject === 'polity' ? 'gs2' : 'gs1',
      subject    : src.subject,
      topic      : src.topic,
      subtopic   : src.subtopic,
      map_type   : mapType,
      region,
      tags       : Array.from(new Set([...src.tags, ...extractTags(question)])),
      difficulty : estimateDifficulty(question),
      source     : 'indiabix',
      source_url : pageUrl,
    })
  }

  return questions
}

// Pagination: IndiaBix uses numeric offsets like /009002, /009015
// Each page has ~10 questions; offset = (page-1) * 10 + 1, formatted as 6 digits
function indiaBixPageUrl(baseSlug: string, page: number): string {
  if (page === 1) return `https://www.indiabix.com/general-knowledge/${baseSlug}/`
  const offset = String((page - 1) * 10 + 1).padStart(6, '0')
  // IndiaBix uses section IDs — fetch page 2+ by appending the question offset
  // The pattern is /SSSNNN where SSS = section id, NNN = question start
  // We get the actual next-page link from the HTML instead
  return `https://www.indiabix.com/general-knowledge/${baseSlug}/${offset}`
}

// ── IndiaBix scraper ──────────────────────────────────────────────────────────

async function scrapeIndiaBix(sources: IndiaBixSource[], outDir: string): Promise<void> {
  for (const src of sources) {
    console.log(`\n── IndiaBix: ${src.slug} ──────────────────`)
    const all: RawPYQ[] = []

    // Page 1
    const firstUrl = `https://www.indiabix.com/general-knowledge/${src.slug}/`
    const firstHtml = await fetchHTML(firstUrl)
    if (!firstHtml) continue

    let qs = parseIndiaBixPage(firstHtml, src, firstUrl)
    console.log(`  Page 1 (${firstUrl}): ${qs.length} questions`)
    all.push(...qs)
    await sleep(1200 + Math.random() * 600)

    // Extract pagination links from first page
    const pageLinks = Array.from(
      firstHtml.matchAll(/href="(https:\/\/www\.indiabix\.com\/general-knowledge\/[^"]+\/\d{6}[^"]*)"/g)
    ).map(m => m[1])
    const uniqueLinks = Array.from(new Set(pageLinks)).slice(0, src.maxPages - 1)

    for (let pi = 0; pi < uniqueLinks.length; pi++) {
      const url  = uniqueLinks[pi]
      const html = await fetchHTML(url)
      if (!html) break
      qs = parseIndiaBixPage(html, src, url)
      if (qs.length === 0) break
      console.log(`  Page ${pi + 2} (${url.split('/').slice(-1)[0]}): ${qs.length} questions`)
      all.push(...qs)

      // Get more page links from this page too
      const moreLinks = Array.from(
        html.matchAll(/href="(https:\/\/www\.indiabix\.com\/general-knowledge\/[^"]+\/\d{6}[^"]*)"/g)
      ).map(m => m[1]).filter(l => !uniqueLinks.includes(l) && l !== firstUrl)
      moreLinks.forEach(l => { if (!uniqueLinks.includes(l) && uniqueLinks.length < src.maxPages) uniqueLinks.push(l) })

      await sleep(1200 + Math.random() * 600)
    }

    if (all.length > 0) {
      const file = path.join(outDir, `indiabix_${src.slug}.json`)
      fs.writeFileSync(file, JSON.stringify(all, null, 2))
      console.log(`  ✔ ${all.length} questions → ${path.basename(file)}`)
    }
  }
}

// ── Examveda parser ───────────────────────────────────────────────────────────
// Examveda has UPSC year-tagged questions:
// https://www.examveda.com/mcq-question-on-{slug}/
//
// HTML structure:
// <article class="question">
//   <header><p>Q. Question text</p></header>
//   <div class="options">
//     <a class="btn-default" data-id="A">Option A</a>
//     <a class="btn-default" data-id="B">Option B</a>
//     ...
//   </div>
//   <div class="solution"><p>Answer: A</p><p>Explanation…</p></div>
//   <div class="discuss-meta">Asked in: UPSC 2019</div>
// </article>

function parseExamvedaPage(html: string, src: typeof EXAMVEDA_SOURCES[0], pageUrl: string): RawPYQ[] {
  const questions: RawPYQ[] = []

  const articles = html.split(/<article[^>]+class="[^"]*question[^"]*"/)
  if (articles.length < 2) return questions

  for (let i = 1; i < articles.length; i++) {
    const block = articles[i]

    // Question
    const qMatch = block.match(/<(?:p|h[1-6])[^>]*>\s*(?:Q\.|Q\s+)?([\s\S]*?)<\/(?:p|h[1-6])/)
    if (!qMatch) continue
    const question = stripHTML(qMatch[1]).replace(/^Q\.\s*/, '').trim()
    if (question.length < 10) continue

    // Options — data-id="A/B/C/D"
    const optMatches = Array.from(block.matchAll(/data-id="([A-D])"[^>]*>([\s\S]*?)<\/a/gi))
    let options: RawPYQ['options'] = null
    if (optMatches.length >= 4) {
      const map: Record<string, string> = {}
      optMatches.forEach(m => { map[m[1].toLowerCase()] = stripHTML(m[2]).trim() })
      if (map.a && map.b && map.c && map.d) options = { a: map.a, b: map.b, c: map.c, d: map.d }
    }

    // Answer
    let answer: string | null = null
    const aMatch = block.match(/[Aa]nswer\s*[:\-]?\s*([A-Da-d])\b/)
      || block.match(/correct[^:]*:\s*([A-Da-d])\b/i)
    if (aMatch) answer = aMatch[1].toLowerCase()

    // Explanation
    let explanation: string | null = null
    const expMatch = block.match(/solution[^>]*>([\s\S]*?)<\/div/)
    if (expMatch) {
      const raw = stripHTML(expMatch[1]).replace(/Answer\s*[:\-]?\s*[A-D]/i, '').trim()
      if (raw.length > 20) explanation = raw
    }

    // Year (from "Asked in: UPSC 2019" or similar)
    let year: number | null = null
    const yearMatch = block.match(/(?:UPSC|asked)[^0-9]*(\b20[0-9]{2}\b)/i)
    if (yearMatch) year = parseInt(yearMatch[1])

    const mapType = classifyMapType(question, src.map_types)
    const region  = extractRegion(question)

    questions.push({
      question,
      options,
      answer,
      explanation,
      year,
      exam_type  : year ? 'prelims' : 'general',
      paper      : src.subject === 'economy' || src.subject === 'environment' ? 'gs3' : 'gs1',
      subject    : src.subject,
      topic      : src.topic,
      subtopic   : null,
      map_type   : mapType,
      region,
      tags       : Array.from(new Set([src.subject, src.topic, 'upsc', ...extractTags(question)])),
      difficulty : estimateDifficulty(question),
      source     : 'examveda',
      source_url : pageUrl,
    })
  }

  return questions
}

async function scrapeExamveda(outDir: string): Promise<void> {
  for (const src of EXAMVEDA_SOURCES) {
    console.log(`\n── Examveda: ${src.slug} ──────────────────`)
    const all: RawPYQ[] = []

    for (let page = 1; page <= 20; page++) {
      const url  = page === 1
        ? `https://www.examveda.com/mcq-question-on-${src.slug}/`
        : `https://www.examveda.com/mcq-question-on-${src.slug}/${page}/`
      const html = await fetchHTML(url)
      if (!html || html.includes('404') || html.includes('Page not found')) break

      const qs = parseExamvedaPage(html, src, url)
      if (qs.length === 0) break
      console.log(`  Page ${page}: ${qs.length} questions`)
      all.push(...qs)
      await sleep(1000 + Math.random() * 500)
    }

    if (all.length > 0) {
      const file = path.join(outDir, `examveda_${src.slug}.json`)
      fs.writeFileSync(file, JSON.stringify(all, null, 2))
      console.log(`  ✔ ${all.length} questions → ${path.basename(file)}`)
    }
  }
}

// ── Classification helpers ────────────────────────────────────────────────────

const MAP_TYPE_RULES: Array<[RegExp, string]> = [
  [/\b(river|ganga|yamuna|brahmaputra|godavari|krishna|cauvery|indus|narmada|tapti|sutlej|ravi|chenab)\b/i, 'physical_rivers'],
  [/\b(mountain|himalay|ghats?|peak|ridge|aravalli|vindhya|satpura|karakoram|nilgiri)\b/i,                 'physical_mountains'],
  [/\b(pass|col|zoji|nathu|rohtang|lipulekh|shipki|bomdi)\b/i,                                             'physical_passes'],
  [/\b(monsoon|rainfall|temperature|cyclone|drought|climate|precipitation)\b/i,                            'physical_climate'],
  [/\b(soil|laterite|alluvial|black soil|red soil|desert soil|regur)\b/i,                                  'physical_soil'],
  [/\b(forest|vegetation|mangrove|deciduous|tropical|savanna|grassland)\b/i,                               'physical_vegetation'],
  [/\b(mineral|coal|iron ore|bauxite|copper|gold|petroleum|mica|manganese|chromite)\b/i,                   'economic_minerals'],
  [/\b(agriculture|crop|wheat|rice|cotton|jute|sugarcane|oilseed|pulses|horticulture)\b/i,                 'economic_agriculture'],
  [/\b(industry|steel|cement|textile|automobile|fertilizer|factory|sez)\b/i,                               'economic_industry'],
  [/\b(port|harbour|seaport|kandla|nhava|kochi|visakhapatnam|paradip|ennore)\b/i,                          'economic_ports'],
  [/\b(railway|highway|transport|national highway|nh-|waterway|shipping)\b/i,                              'economic_transport'],
  [/\b(ancient|maurya|gupta|harappa|vedic|ashoka|chandragupta|satavahana|kushana)\b/i,                     'historical_kingdoms'],
  [/\b(mughal|delhi sultanate|vijayanagara|chola|maratha|pallava|rashtrakuta|pala|bahmani)\b/i,             'historical_kingdoms'],
  [/\b(battle|panipat|plassey|buxar|haldighati|talikota|kalinga|war of)\b/i,                               'historical_battles'],
  [/\b(colonial|british|east india company|company raj|raj|british india)\b/i,                             'historical_colonial'],
  [/\b(1857|revolt|mutiny|freedom|independence|gandhi|nehru|congress|non-cooperation|civil disobedience)\b/i, 'historical_revolt'],
  [/\b(national park|tiger reserve|wildlife|biosphere|ramsar|wetland|sanctuary)\b/i,                       'thematic_protected_areas'],
  [/\b(flood|earthquake|tsunami|cyclone|disaster|landslide|drought)\b/i,                                   'thematic_disasters'],
  [/\b(tribe|tribal|adivasi|scheduled tribe|vanvasi|indigenous)\b/i,                                       'thematic_tribal'],
  [/\b(environment|pollution|carbon|emission|climate change|global warming|ozone|deforestation)\b/i,       'thematic_environment'],
  [/\b(neighbour|china|pakistan|bangladesh|nepal|bhutan|sri lanka|myanmar|afghanistan)\b/i,                 'international_neighbors'],
  [/\b(ocean|sea|eez|island|andaman|lakshadweep|maritime|exclusive economic)\b/i,                          'international_maritime'],
  [/\b(state|district|capital|union territory|boundary|border|demarcation)\b/i,                            'political_states'],
]

function classifyMapType(text: string, candidates: string[]): string | null {
  const lower = text.toLowerCase()
  for (const [re, mt] of MAP_TYPE_RULES) {
    if (re.test(lower) && candidates.includes(mt)) return mt
  }
  return candidates[0] ?? null
}

const STATES = [
  'rajasthan','gujarat','maharashtra','goa','karnataka','kerala','tamil','andhra',
  'telangana','odisha','west bengal','jharkhand','bihar','uttar pradesh','madhya pradesh',
  'chhattisgarh','haryana','punjab','himachal','uttarakhand','jammu','kashmir','ladakh',
  'assam','meghalaya','arunachal','nagaland','manipur','mizoram','tripura','sikkim',
  'delhi','chandigarh','puducherry','andaman','lakshadweep',
]

function extractRegion(text: string): string | null {
  const lower = text.toLowerCase()
  for (const s of STATES) {
    if (lower.includes(s)) return s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  }
  if (/north.?east/i.test(text))  return 'North East India'
  if (/himalay/i.test(text))       return 'Himalayan Region'
  if (/deccan/i.test(text))        return 'Deccan Plateau'
  if (/gangetic/i.test(text))      return 'Gangetic Plain'
  if (/western ghats/i.test(text)) return 'Western Ghats'
  return null
}

function extractTags(text: string): string[] {
  const map: Array<[RegExp, string]> = [
    [/himalay/i, 'himalaya'], [/river|nadi/i, 'rivers'], [/coal/i, 'coal'],
    [/tiger/i, 'tiger_reserve'], [/ramsar/i, 'ramsar'], [/nuclear/i, 'nuclear'],
    [/dam/i, 'dams'], [/port/i, 'ports'], [/battle/i, 'battles'],
    [/mughal/i, 'mughal'], [/maurya/i, 'mauryan'], [/british/i, 'british'],
    [/1857/i, '1857_revolt'], [/monsoon/i, 'monsoon'], [/biodiversity/i, 'biodiversity'],
    [/national park/i, 'national_park'], [/mineral/i, 'minerals'],
    [/forest/i, 'forests'], [/drought/i, 'drought'], [/island/i, 'islands'],
  ]
  return map.filter(([re]) => re.test(text)).map(([, tag]) => tag)
}

function estimateDifficulty(text: string): 'easy' | 'medium' | 'hard' {
  const words = text.split(/\s+/).length
  const hasNegation = /\bNOT\b|\bEXCEPT\b|\bINCORRECT\b|\bFALSE\b/.test(text)
  const hasNumbers  = /\d{4}|\d{2,3}\s*%|\d+\s*(km|m\b|°C)/.test(text)
  if (hasNegation || (hasNumbers && words > 30)) return 'hard'
  if (words > 20 || hasNumbers) return 'medium'
  return 'easy'
}

// ── Merge + dedup ─────────────────────────────────────────────────────────────

function mergeAndDedup(scrapedDir: string): RawPYQ[] {
  const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json'))
  const seen  = new Set<string>()
  const all   : RawPYQ[] = []
  for (const file of files) {
    const data: RawPYQ[] = JSON.parse(fs.readFileSync(path.join(scrapedDir, file), 'utf-8'))
    for (const q of data) {
      const key = q.question.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80)
      if (!seen.has(key)) { seen.add(key); all.push(q) }
    }
  }
  return all
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2)
  const source = args[args.indexOf('--source') + 1] ?? 'all'
  const outDir = path.join(process.cwd(), 'data', 'pyqs', 'scraped')
  fs.mkdirSync(outDir, { recursive: true })

  console.log(`\n🔍 UPSC PYQ Scraper — source: ${source}\n`)

  if (source === 'all' || source === 'indiabix') {
    await scrapeIndiaBix(INDIABIX_SOURCES, outDir)
  }
  if (source === 'all' || source === 'examveda') {
    await scrapeExamveda(outDir)
  }

  const merged  = mergeAndDedup(outDir)
  const outFile = path.join(process.cwd(), 'data', 'pyqs', 'all_pyqs.json')
  fs.writeFileSync(outFile, JSON.stringify(merged, null, 2))
  console.log(`\n✅ ${merged.length} unique questions → data/pyqs/all_pyqs.json`)
}

main().catch(console.error)
