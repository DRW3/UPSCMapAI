#!/usr/bin/env node
/**
 * Precision PYQ Tagger — LLM-based topic classification
 * ======================================================
 * Uses Groq LLM to precisely classify every UPSC PYQ into syllabus topics.
 * Tags stored as: ['topic:<id>', 'year:<year>', 'subject:<subject>']
 *
 * Usage:
 *   node scripts/precision-tag-pyqs.mjs              # tag all
 *   node scripts/precision-tag-pyqs.mjs --dry-run    # preview without updating
 *   node scripts/precision-tag-pyqs.mjs --resume     # continue from progress file
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Load env ────────────────────────────────────────────────────────────────
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const { default: Groq } = await import('groq-sdk')
const { createClient } = await import('@supabase/supabase-js')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const DRY_RUN = process.argv.includes('--dry-run')
const RESUME = process.argv.includes('--resume')
const PROGRESS_FILE = path.join(__dirname, '..', 'data', 'pyqs', 'tagging_progress.json')

// ── Topic definitions grouped by subject ────────────────────────────────────
// Each entry: topicId → display name
// Grouped by DB subject for focused prompts

const TOPIC_GROUPS = {
  history: {
    'prehistoric-india': 'Prehistoric India (Palaeolithic, Mesolithic, Neolithic, Chalcolithic)',
    'indus-valley': 'Indus Valley Civilization (Harappa, Mohenjo-daro)',
    'vedic-age': 'Vedic Age (Rigveda, Upanishads, Varna, Aryans)',
    'buddhism-jainism': 'Buddhism and Jainism (Buddha, Mahavira, Sangha)',
    'mahajanapadas': 'Mahajanapadas and Early Republics (Magadha, Licchavi)',
    'mauryan-empire': 'Mauryan Empire (Chandragupta, Ashoka, Kautilya)',
    'post-mauryan': 'Post-Mauryan Period (Kushanas, Satavahanas, Indo-Greeks)',
    'gupta-empire': 'Gupta Empire (Samudragupta, Chandragupta II, Nalanda)',
    'south-india-ancient': 'Ancient South India (Pallavas, Chalukyas, Cholas, Pandyas, Sangam)',
    'ancient-art': 'Ancient Indian Art & Architecture (Stupas, Caves, Ajanta, Ellora)',
    'ancient-literature-science': 'Ancient Indian Literature & Science (Panini, Charaka, Aryabhata)',
    'ajivika-charvaka': 'Ajivika, Charvaka & Other Heterodox Schools',
    'sangam-age': 'Sangam Age — Tamil Polity, Literature & Trade',
    'harsha-pushyabhuti': 'Harshavardhana & Post-Gupta Period',
    'vakatakas': 'Vakatakas',
    'rashtrakutas': 'Rashtrakutas — Ellora & Deccan Power',
    'ancient-coinage': 'Ancient Indian Coinage',
    'ancient-inscriptions': 'Ancient Indian Inscriptions & Epigraphy',
    'rajput-kingdoms': 'Rajput Kingdoms (Prithviraj, Gurjara-Pratihara)',
    'arab-turkish-invasions': 'Arab and Turkish Invasions (Ghazni, Ghori)',
    'chola-maritime': 'Chola Maritime Empire & Administration',
    'slave-dynasty': 'Delhi Sultanate — Slave/Mamluk Dynasty',
    'khalji-tughlaq': 'Khalji and Tughlaq Dynasties',
    'vijayanagara-bahmani': 'Vijayanagara and Bahmani Kingdoms',
    'lodi-dynasty': 'Lodi & Sayyid Dynasties',
    'babur-humayun': 'Babur, Humayun & Sher Shah Suri',
    'akbar': 'Akbar — Administration, Mansabdari, Religious Policy',
    'jahangir-shahjahan': 'Jahangir & Shah Jahan',
    'aurangzeb': 'Aurangzeb & Mughal Decline',
    'mughal-culture': 'Mughal Art, Architecture & Culture',
    'bhakti-movement': 'Bhakti Movement (Kabir, Mirabai, Chaitanya)',
    'sufi-movement': 'Sufi Movement (Chishti, Suhrawardi, Nizamuddin)',
    'maratha-empire': 'Maratha Empire (Shivaji, Peshwas)',
    'sultanate-administration': 'Delhi Sultanate Administration & Revenue',
    'sultanate-architecture': 'Indo-Islamic Architecture — Sultanate',
    'sher-shah-suri': 'Sher Shah Suri — Administration & Legacy',
    'mughal-administration': 'Mughal Administration — Mansabdari, Jagirdari, Revenue',
    'sikhism-gurus': 'Rise of Sikhism — Guru Nanak to Guru Gobind Singh',
    'provincial-dynasties': 'Provincial Dynasties — Ahoms, Kakatiyas, Hoysalas, Gajapatis',
    'medieval-society-economy': 'Medieval Indian Society, Trade & Economy',
    'medieval-literature': 'Medieval Indian Languages & Literature',
    'deccan-sultanates-detail': 'Deccan Sultanates — Bijapur, Golconda, Ahmadnagar',
    'european-trade': 'European Trading Companies in India',
    'battle-plassey-buxar': 'Battle of Plassey and Buxar',
    'british-expansion': 'British Expansion — Subsidiary Alliance, Doctrine of Lapse',
    'colonial-economy-impact': 'Colonial Economy — Drain of Wealth, De-industrialisation',
    'socioreligious-reforms': 'Socio-Religious Reform Movements (Brahmo Samaj, Arya Samaj)',
    'revolt-1857': 'Revolt of 1857',
    'early-nationalism': 'Rise of Indian Nationalism — Congress, Moderates, Extremists',
    'gandhian-era': 'Gandhian Era — NCM, CDM, Quit India, Khilafat',
    'revolutionary-movements': 'Revolutionary Movements (Bhagat Singh, Ghadar)',
    'constitutional-developments': 'Constitutional Developments Under British Rule',
    'independence-partition': 'Independence and Partition 1947',
    'anglo-mysore-wars': 'Anglo-Mysore Wars — Hyder Ali & Tipu Sultan',
    'anglo-maratha-wars': 'Anglo-Maratha Wars',
    'anglo-sikh-wars': 'Anglo-Sikh Wars & Punjab',
    'british-land-revenue': 'British Land Revenue Systems — Permanent Settlement, Ryotwari, Mahalwari',
    'south-west-reforms': 'Reform Movements in South & West India',
    'peasant-tribal-movements': 'Peasant & Tribal Movements',
    'working-class-movements': 'Trade Union & Working Class Movements',
    'left-wing-politics': 'Left Wing — CSP, CPI, Peasant Movements',
    'communalism-two-nation': 'Communalism & Two-Nation Theory',
    'press-education-national': 'Role of Press & Education in National Movement',
    'women-freedom-struggle': 'Women in the Freedom Struggle',
    'nehru-era': 'Consolidation After Independence — Nehru Era',
    'princely-states-integration': 'Integration of Princely States',
    'states-reorganization': 'States Reorganization & Linguistic States',
    'land-reforms-post-47': 'Land Reforms After Independence',
    'five-year-plans-history': 'Five Year Plans History',
    'green-white-revolution': 'Green Revolution, White Revolution',
    'foreign-policy-nam': 'India\'s Foreign Policy — NAM, Panchsheel',
    'indo-pak-wars': 'Indo-Pak Wars — 1947, 1965, 1971',
    'indo-china-1962': 'Indo-China War 1962',
    'emergency-1975': 'Emergency 1975-77',
    'liberalization-1991': 'Liberalization 1991 — LPG Reforms',
    'nuclear-tests': 'India\'s Nuclear Journey — Pokhran I & II',
    'kashmir-issue-evolution': 'Kashmir Issue — Evolution',
    'northeast-insurgency': 'Northeast India — Insurgency & Integration',
    'punjab-crisis': 'Punjab Crisis — Akali, Operation Bluestar',
    'mandal-commission': 'Mandal Commission & Social Justice',
    'coalition-era': 'Coalition Era Politics — 1989 Onwards',
    'renaissance-reformation': 'Renaissance, Reformation & Enlightenment',
    'american-revolution': 'American Revolution',
    'french-revolution': 'French Revolution',
    'industrial-revolution': 'Industrial Revolution',
    'nationalism-europe': 'Nationalism in Europe — German & Italian Unification',
    'imperialism-colonialism': 'Imperialism & Colonialism — Scramble for Africa',
    'world-war-1': 'World War I',
    'russian-revolution': 'Russian Revolution 1917',
    'fascism-nazism': 'Rise of Fascism & Nazism',
    'world-war-2': 'World War II',
    'cold-war': 'Cold War',
    'decolonization': 'Decolonization of Asia & Africa',
    'chinese-revolution': 'Chinese Revolution',
    'arab-israeli-conflict': 'Arab-Israeli Conflicts',
    'ussr-collapse': 'Collapse of USSR',
    'political-philosophies': 'Political Philosophies — Communism, Capitalism, Socialism',
    'globalization-world-order': 'Globalization & Post-Cold War World Order',
    'national-boundaries-redrawing': 'Redrawing of National Boundaries',
  },
  geography: {
    'himalayas': 'The Himalayan Region (Ranges, Passes, Glaciers)',
    'deccan-plateau': 'Deccan Plateau & Peninsular India (Western/Eastern Ghats)',
    'northern-plains': 'Northern Plains (Gangetic, Doab, Terai, Thar)',
    'rivers-drainage': 'Rivers and Drainage Systems (Ganga, Brahmaputra, Godavari)',
    'climate-india': 'Climate of India (Monsoons, ITCZ, El Nino)',
    'soils-vegetation': 'Soils and Natural Vegetation of India',
    'islands-india': 'Islands of India (Andaman, Lakshadweep)',
    'agriculture-geo': 'Agricultural Geography (Cropping Patterns, Irrigation)',
    'minerals-resources': 'Minerals and Resources (Iron, Coal, Bauxite)',
    'industries-transport': 'Industries and Transport (SEZ, Industrial Corridors)',
    'population-urbanisation': 'Population and Urbanisation (Census, Migration)',
    'world-physical': 'World Physical Geography (Mountains, Trenches, Continents)',
    'ocean-currents': 'Ocean Currents (Gulf Stream, Thermohaline)',
    'world-climate-zones': 'World Climate Zones (Tropical, Temperate, Tundra)',
    'geopolitical-resources': 'Geopolitical Resources (OPEC, Chokepoints, Arctic)',
    'trans-himalayan': 'Trans-Himalayan Zone — Karakoram, Ladakh',
    'lakes-india': 'Lakes of India',
    'cyclones-india': 'Tropical Cyclones — Indian Ocean',
    'irrigation-india': 'Irrigation Systems & Water Disputes',
    'coastal-plains': 'Coastal Plains & Ports of India',
    'thar-desert': 'Thar Desert & Arid Zone',
    'earth-interior': 'Interior of the Earth — Crust, Mantle, Core',
    'plate-tectonics': 'Plate Tectonics & Volcanism',
    'rocks-minerals': 'Rocks & Minerals — Types & Rock Cycle',
    'geomorphology': 'Geomorphology — Weathering, Erosion, Landforms',
    'atmosphere-structure': 'Atmosphere — Composition, Structure, Heat Budget',
    'pressure-winds': 'Pressure Belts, Winds & Atmospheric Circulation',
    'precipitation-types': 'Precipitation, Fronts & Air Masses',
    'oceanography': 'Oceans — Relief, Temperature, Salinity',
    'tides': 'Tides — Types, Causes, Significance',
    'world-rivers-lakes': 'World Major Rivers & Lakes',
    'world-deserts': 'World Major Deserts',
    'industrial-location': 'Industrial Location Factors & Global Patterns',
    'world-agriculture': 'World Agriculture — Types & Patterns',
    'world-population': 'World Population — Distribution & Growth',
    'natural-disasters': 'Natural Disasters (Earthquake, Cyclone, Flood, Landslide)',
  },
  polity: {
    'making-constitution': 'Making of the Indian Constitution (Constituent Assembly)',
    'preamble': 'Preamble — Philosophy & Significance',
    'fundamental-rights': 'Fundamental Rights (Articles 12-35)',
    'right-freedom-religion': 'Right to Freedom of Religion (Articles 25-28)',
    'cultural-educational-rights': 'Cultural & Educational Rights (Articles 29-30)',
    'dpsp-duties': 'Directive Principles & Fundamental Duties',
    'federal-structure': 'Federal Structure (Union/State/Concurrent Lists)',
    'amendments': 'Constitutional Amendments (42nd, 44th, 73rd, 74th, Basic Structure)',
    'parliament': 'Indian Parliament (Lok Sabha, Rajya Sabha, Bills)',
    'parliamentary-committees': 'Parliamentary Committees',
    'legislative-process': 'Legislative Process — Bills & Passage',
    'executive': 'Executive — President, PM, Council of Ministers',
    'judiciary': 'Indian Judiciary (Supreme Court, High Court, Judicial Review)',
    'subordinate-courts': 'Subordinate Courts & Tribunals',
    'state-government': 'State Government (Governor, CM, Legislature)',
    'local-government': 'Panchayati Raj & Local Government (73rd/74th Amendments)',
    'inter-state-relations': 'Inter-State Relations — Water Disputes, Zonal Councils',
    'emergency-provisions': 'Emergency Provisions (Articles 352, 356, 360)',
    'special-provisions-states': 'Special Provisions — Art 370, 371, Schedules V, VI',
    'constitutional-bodies': 'Constitutional Bodies — EC, UPSC, FC, CAG, AG',
    'statutory-regulatory-bodies': 'Statutory Bodies — NHRC, NCW, SEBI, TRAI, CCI',
    'representation-peoples-act': 'Representation of People\'s Act & Electoral Reforms',
    'comparative-constitutions': 'Comparison with Other Constitutions',
    'civil-services': 'Civil Services (IAS, IPS, Administrative Reforms)',
    'rti-egovernance': 'RTI & E-Governance',
    'anticorruption': 'Anti-Corruption — Lokpal, Lokayukta, CAG, CVC',
    'pressure-groups': 'Pressure Groups & Civil Society',
    'government-schemes': 'Government Policies & Schemes',
    'welfare-vulnerable': 'Welfare Schemes for Vulnerable Sections',
    'health-education-governance': 'Health, Education & HRD Governance',
    'india-neighborhood': 'India\'s Relations with Neighbors (Pakistan, China, Bangladesh)',
    'india-major-powers': 'India & Major Powers (US, Russia, EU)',
    'multilateral-bodies': 'Multilateral Bodies (UN, IMF, WTO, G20)',
    'regional-groupings': 'Regional Groupings (ASEAN, BRICS, SCO, QUAD)',
    'india-foreign-policy': 'India\'s Foreign Policy — Principles & Evolution',
    'india-indian-ocean': 'India in Indian Ocean Region',
    'india-africa': 'India-Africa Relations',
    'india-central-west-asia': 'India & Central/West Asia',
    'diaspora-policy': 'Indian Diaspora Policy',
    'developed-developing-impact': 'Impact of Other Countries\' Policies on India',
    'international-treaties': 'Key International Treaties & Agreements',
    'india-global-commons': 'India & Global Commons — Arctic, Antarctica, Space',
  },
  economy: {
    'planning-development': 'Planning & Development (NITI Aayog, HDI, SDG)',
    'national-income': 'National Income — GDP, GNP, NDP Measurement',
    'government-budgeting': 'Government Budgeting — Process & Expenditure',
    'taxation-system': 'Taxation — Direct, Indirect, GST',
    'fiscal-monetary': 'Fiscal & Monetary Policy (RBI, Repo, CRR, SLR)',
    'poverty-inequality': 'Poverty & Inequality (MGNREGA, BPL)',
    'agriculture-economy': 'Agricultural Economy (MSP, PDS, Crop Insurance)',
    'food-processing': 'Food Processing & Related Industries',
    'land-reforms-economy': 'Land Reforms — History & Issues',
    'animal-husbandry-fisheries': 'Animal Husbandry, Dairy & Fisheries',
    'irrigation-economy': 'Irrigation & Water Resources Economics',
    'infrastructure': 'Infrastructure (Sagarmala, UDAN, Smart City)',
    'external-sector': 'External Sector (BOP, FDI, FPI, Trade)',
    'banking-finance': 'Banking & Finance (NPA, IBC, UPI, Jan Dhan)',
    'liberalization-economy': 'Economic Liberalization — LPG & Industrial Policy',
    'msme-industry': 'Industrial Growth — MSMEs, Make in India, PLI',
    'investment-models': 'Investment Models — PPP, BOT, VGF',
    'insurance-pension': 'Insurance & Pension Sector',
    'capital-markets': 'Capital Markets — SEBI, Stock Exchanges',
  },
  environment: {
    'biodiversity-conservation': 'Biodiversity & Conservation (CBD, Nagoya, Hotspots)',
    'protected-areas': 'Protected Areas & Wildlife (Tiger Reserves, National Parks)',
    'wetlands-coastal': 'Wetlands & Coastal Ecosystems (Ramsar, Mangroves, CRZ)',
    'forests-india': 'Forests of India (FRA, CAMPA, JFM)',
    'climate-change': 'Climate Change (IPCC, Net Zero, Paris Agreement)',
    'international-agreements': 'Environmental International Agreements (UNFCCC, CITES, COP)',
    'pollution': 'Pollution (Air, Water, E-waste, NGT)',
    'renewable-energy': 'Renewable Energy (Solar, Wind, Green Hydrogen)',
    'disaster-management-system': 'Disaster Management (NDMA, NDRF, Sendai)',
    'eia-process': 'Environmental Impact Assessment',
    'environment-laws': 'Environmental Laws — EPA, WPA, NGT',
    'ecology-fundamentals': 'Ecology Fundamentals — Food Chain, Cycles',
    'ecosystem-types': 'Ecosystem Types — Terrestrial, Aquatic, Marine',
    'species-conservation': 'Species Conservation — IUCN, Red List',
    'indian-flora-fauna': 'Indian Flora & Fauna — Endemic & Endangered',
    'waste-management': 'Waste Management — Solid, Plastic, E-Waste',
    'sustainable-development': 'Sustainable Development — SDGs, Circular Economy',
    'carbon-markets': 'Carbon Markets & Climate Finance',
  },
  science: {
    'isro-space': 'ISRO & Space Technology (PSLV, Chandrayaan, Gaganyaan)',
    'nuclear-technology': 'Nuclear Technology (Three-Stage, NPT, CTBT)',
    'ai-biotech': 'AI & Biotechnology (CRISPR, GMO, Nanotech)',
    'defense-tech': 'Defense Technology (DRDO, BrahMos, Tejas)',
    'cybersecurity': 'Cybersecurity (CERT-In, Data Protection, IT Act)',
    'general-physics': 'General Science — Physics',
    'general-chemistry': 'General Science — Chemistry',
    'general-biology': 'General Science — Biology & Physiology',
    'health-diseases': 'Health, Diseases & Public Health',
    'it-computers': 'IT, Computers & Digital Technology',
    'robotics-automation': 'Robotics, Automation & Industry 4.0',
    'ipr-patents': 'Intellectual Property Rights — Patents, GI Tags, TRIPS',
    'indians-in-science': 'Achievements of Indians in Science',
    'agricultural-science': 'Agricultural Science & Technology',
    'space-applications': 'Space Technology Applications',
    'emerging-tech-latest': 'Emerging Technologies — 5G, IoT, Drones',
  },
  art_culture: {
    'classical-arts': 'Classical Dance & Music (Bharatanatyam, Kathak, Hindustani, Carnatic)',
    'temple-architecture': 'Temple Architecture (Nagara, Dravida, Vesara)',
    'painting-traditions': 'Painting Traditions (Madhubani, Warli, Miniature)',
    'folk-music-dance': 'Folk Music & Dance of India',
    'indian-theatre': 'Indian Theatre & Performing Arts',
    'puppetry-traditions': 'Indian Puppetry & Shadow Theatre',
    'buddhist-jain-architecture': 'Buddhist & Jain Architecture',
    'indo-islamic-architecture': 'Indo-Islamic Architecture',
    'colonial-architecture': 'Colonial & Modern Architecture',
    'unesco-heritage-india': 'UNESCO World Heritage Sites in India',
    'handicrafts-textiles': 'Handicrafts, Textiles & GI Tags',
    'festivals-india': 'Indian Festivals',
    'martial-arts-india': 'Indian Martial Arts & Sports Heritage',
    'languages-scripts': 'Indian Languages, Scripts & Classical Languages',
    'indian-literature-modern': 'Indian Literature — Ancient to Modern',
    'fairs-melas': 'Important Fairs, Melas & Cultural Events',
  },
  general: {
    'internal-security': 'Internal Security — Naxalism, UAPA, NIA, Insurgency',
    'border-management': 'Border Management (LOC, LAC, Smart Fencing)',
    'external-state-actors': 'Role of State & Non-State Actors in Security',
    'development-extremism-link': 'Linkages Between Development & Extremism',
    'media-social-security': 'Role of Media & Social Networking in Security',
    'money-laundering': 'Money Laundering — PMLA, FATF, Black Money',
    'organized-crime': 'Organized Crime — Drug/Human Trafficking',
    'security-forces': 'Security Forces — BSF, CRPF, CISF, NSG',
    'moral-thinkers': 'Ethics — Moral Thinkers (Kant, Gandhi, Ambedkar)',
    'attitude-aptitude': 'Attitude & Aptitude — Emotional Intelligence',
    'civil-service-values': 'Civil Service Values — Integrity, Probity',
    'corruption-ethics': 'Corruption & Ethics',
    'case-studies': 'Ethical Dilemmas & Case Studies',
    'indian-society-features': 'Indian Society — Diversity & Pluralism',
    'regionalism': 'Regionalism & Sub-Nationalism',
    'secularism-india': 'Secularism in India',
    'globalization-society': 'Effects of Globalization on Indian Society',
    'social-empowerment': 'Social Empowerment — Dalits, Tribals, Minorities',
    'education-society': 'Role of Education in Society',
    'indian-diaspora': 'Indian Diaspora',
    'tribes-diversity': 'Tribal Communities & Diversity',
    'women-empowerment': 'Women Empowerment & Gender Issues',
    'caste-religion': 'Caste, Religion & Social Issues',
    'urbanisation-migration': 'Urbanisation & Migration',
    'ethics-human-interface': 'Ethics & Human Interface',
    'emotional-intelligence': 'Emotional Intelligence in Governance',
    'ethics-private-public': 'Ethics in Private & Public Relationships',
    'human-values': 'Human Values — Family, Society, Education',
    'ethics-dimensions': 'Dimensions of Ethics — Personal, Professional',
    'ethical-dilemmas-govt': 'Ethical Dilemmas in Government',
    'laws-rules-conscience': 'Laws, Rules & Conscience as Ethical Guidance',
    'probity-governance': 'Probity in Governance',
    'codes-ethics-conduct': 'Codes of Ethics & Conduct',
    'work-culture-delivery': 'Work Culture & Service Delivery',
    'ethical-intl-relations': 'Ethical Issues in International Relations',
    'corporate-governance': 'Corporate Governance',
    'public-funds-ethics': 'Public Funds — Ethical Dimensions',
    'great-leaders-lessons': 'Lessons from Great Leaders & Reformers',
  },
}

// Build a flat lookup: topicId → subject group
const TOPIC_TO_GROUP = {}
for (const [group, topics] of Object.entries(TOPIC_GROUPS)) {
  for (const topicId of Object.keys(topics)) {
    TOPIC_TO_GROUP[topicId] = group
  }
}

// Map DB subject values to topic groups
const SUBJECT_TO_GROUPS = {
  'history': ['history'],
  'geography': ['geography'],
  'polity': ['polity'],
  'economy': ['economy'],
  'environment': ['environment'],
  'science': ['science'],
  'art_culture': ['art_culture', 'history'],
  'general': ['general', 'polity', 'history'],
  'current_affairs': ['general', 'economy', 'polity'],
}

// ── Rate limiting ───────────────────────────────────────────────────────────
const MIN_DELAY = 2500 // 2.5s between requests (~24 RPM, safe margin)
let lastRequestTime = 0

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function rateLimitedGroq(messages, retries = 0) {
  const now = Date.now()
  const wait = MIN_DELAY - (now - lastRequestTime)
  if (wait > 0) await sleep(wait)
  lastRequestTime = Date.now()

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })
    return response.choices[0]?.message?.content || '{}'
  } catch (e) {
    if (retries >= 5) throw e
    const msg = e.message || ''
    if (msg.includes('429') || msg.includes('rate')) {
      const waitTime = 15 + retries * 15 // 15s, 30s, 45s, 60s, 75s
      console.log(`    ⏳ Rate limited, waiting ${waitTime}s (retry ${retries + 1}/5)...`)
      await sleep(waitTime * 1000)
      return rateLimitedGroq(messages, retries + 1)
    }
    throw e
  }
}

// ── Build classification prompt ─────────────────────────────────────────────

function buildPrompt(questions, relevantTopics) {
  const topicList = Object.entries(relevantTopics)
    .map(([id, name]) => `  "${id}": "${name}"`)
    .join('\n')

  const questionList = questions
    .map((q, i) => `Q${i + 1} [${q.year}]: ${q.question.slice(0, 300)}`)
    .join('\n\n')

  return [
    {
      role: 'system',
      content: `You are a UPSC syllabus expert. Your job is to classify exam questions into EXACTLY the right syllabus topic(s).

RULES:
- Each question must map to 1-3 topic IDs from the provided list
- Be VERY SPECIFIC — pick the most precise topic, not a broad one
- If a question touches multiple topics, list up to 3 (most relevant first)
- If NO topic is a good match, use "unmatched"
- DO NOT invent topic IDs — only use IDs from the provided list

Return JSON: { "results": [ { "q": 1, "topics": ["topic-id-1", "topic-id-2"] }, ... ] }`
    },
    {
      role: 'user',
      content: `AVAILABLE TOPICS:\n${topicList}\n\nCLASSIFY THESE QUESTIONS:\n${questionList}`
    }
  ]
}

// ── Parse LLM response ──────────────────────────────────────────────────────

function parseLLMResponse(text, validTopicIds) {
  try {
    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const parsed = JSON.parse(cleaned)
    const results = parsed.results || parsed

    if (!Array.isArray(results)) return null

    return results.map(r => ({
      q: r.q || r.index,
      topics: (r.topics || []).filter(t => validTopicIds.has(t))
    }))
  } catch {
    return null
  }
}

// ── Main pipeline ───────────────────────────────────────────────────────────

async function main() {
  console.log('🏷️  Precision PYQ Tagger — LLM Classification')
  console.log('===============================================\n')

  if (DRY_RUN) console.log('🔍 DRY RUN — no Supabase updates\n')

  // Load progress
  let taggedIds = new Set()
  if (RESUME && fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
    taggedIds = new Set(progress.taggedIds || [])
    console.log(`📂 Resuming: ${taggedIds.size} questions already tagged\n`)
  }

  // Fetch all questions
  console.log('Fetching questions from Supabase...')
  let allQuestions = []
  let from = 0
  while (true) {
    const { data, error } = await sb.from('upsc_pyqs')
      .select('id, question, subject, year, topic, subtopic')
      .not('options', 'is', null)
      .not('answer', 'is', null)
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    allQuestions.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`Fetched ${allQuestions.length} questions\n`)

  // Filter already tagged
  const toTag = allQuestions.filter(q => !taggedIds.has(q.id))
  console.log(`To tag: ${toTag.length} questions\n`)

  // Group by subject
  const bySubject = {}
  for (const q of toTag) {
    const subj = q.subject || 'general'
    if (!bySubject[subj]) bySubject[subj] = []
    bySubject[subj].push(q)
  }

  const stats = { total: 0, matched: 0, unmatched: 0, errors: 0, bySubject: {} }
  const allUpdates = [] // collect all updates

  for (const [subject, questions] of Object.entries(bySubject)) {
    console.log(`\n📚 Subject: ${subject} (${questions.length} questions)`)

    // Get relevant topic groups for this subject
    const groups = SUBJECT_TO_GROUPS[subject] || ['general']
    const relevantTopics = {}
    for (const group of groups) {
      if (TOPIC_GROUPS[group]) {
        Object.assign(relevantTopics, TOPIC_GROUPS[group])
      }
    }
    const validTopicIds = new Set(Object.keys(relevantTopics))
    const topicCount = Object.keys(relevantTopics).length
    console.log(`   ${topicCount} relevant topics`)

    // Process in batches of 20
    const BATCH = 20
    for (let i = 0; i < questions.length; i += BATCH) {
      const batch = questions.slice(i, i + BATCH)
      const batchNum = Math.floor(i / BATCH) + 1
      const totalBatches = Math.ceil(questions.length / BATCH)
      process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${batch.length} Qs)...`)

      try {
        const messages = buildPrompt(batch, relevantTopics)
        const responseText = await rateLimitedGroq(messages)
        const results = parseLLMResponse(responseText, validTopicIds)

        if (!results) {
          console.log(' ⚠️  parse failed')
          stats.errors += batch.length
          continue
        }

        let batchMatched = 0
        const batchUpdates = []
        for (const r of results) {
          const qIdx = (r.q || 1) - 1
          if (qIdx < 0 || qIdx >= batch.length) continue
          const q = batch[qIdx]

          // Build tags
          const tags = []

          // Topic tags
          if (r.topics && r.topics.length > 0) {
            for (const t of r.topics) {
              tags.push(`topic:${t}`)
            }
            batchMatched++
            stats.matched++
          } else {
            stats.unmatched++
          }

          // Year tag
          if (q.year) tags.push(`year:${q.year}`)

          // Subject tag
          tags.push(`subject:${subject}`)

          // Base tags
          tags.push('upsc', 'prelims')

          batchUpdates.push({ id: q.id, tags })
          allUpdates.push({ id: q.id, tags })
          taggedIds.add(q.id)
          stats.total++
        }

        // Handle questions not in results (LLM skipped some)
        for (let j = 0; j < batch.length; j++) {
          if (!results.find(r => (r.q || 1) - 1 === j)) {
            const q = batch[j]
            const tags = [`year:${q.year}`, `subject:${subject}`, 'upsc', 'prelims']
            batchUpdates.push({ id: q.id, tags })
            allUpdates.push({ id: q.id, tags })
            taggedIds.add(q.id)
            stats.unmatched++
            stats.total++
          }
        }

        console.log(` ✅ ${batchMatched}/${batch.length} matched`)

        // ── Immediately update Supabase for this batch ──
        if (!DRY_RUN && batchUpdates.length > 0) {
          let batchOk = 0
          for (const u of batchUpdates) {
            const { error } = await sb.from('upsc_pyqs')
              .update({ tags: u.tags })
              .eq('id', u.id)
            if (!error) batchOk++
          }
          if (batchOk < batchUpdates.length) {
            console.log(`      ⚠️  ${batchOk}/${batchUpdates.length} written to DB`)
          }
        }

      } catch (e) {
        console.log(` ❌ ${e.message.slice(0, 80)}`)
        stats.errors += batch.length
      }

      // Save progress after every batch
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        taggedIds: [...taggedIds],
        stats,
        lastUpdate: new Date().toISOString()
      }, null, 2))
    }

    stats.bySubject[subject] = questions.length
  }

  // Save final progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
    taggedIds: [...taggedIds],
    stats,
    lastUpdate: new Date().toISOString()
  }, null, 2))

  // ── Report ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════')
  console.log('📊 TAGGING SUMMARY')
  console.log('════════════════════════════════════════')
  console.log(`Total processed:  ${stats.total}`)
  console.log(`Matched to topic: ${stats.matched} (${(stats.matched / stats.total * 100).toFixed(1)}%)`)
  console.log(`Unmatched:        ${stats.unmatched}`)
  console.log(`Errors:           ${stats.errors}`)

  // Count questions per topic
  const topicCounts = {}
  for (const u of allUpdates) {
    for (const tag of u.tags) {
      if (tag.startsWith('topic:')) {
        const topicId = tag.slice(6)
        topicCounts[topicId] = (topicCounts[topicId] || 0) + 1
      }
    }
  }

  const allTopicIds = Object.values(TOPIC_GROUPS).flatMap(g => Object.keys(g))
  const coveredTopics = allTopicIds.filter(t => (topicCounts[t] || 0) > 0)
  console.log(`\nTopics with ≥1 question: ${coveredTopics.length}/${allTopicIds.length}`)

  console.log('\nTop 20 topics by question count:')
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([t, c]) => console.log(`  ${t}: ${c}`))

  const emptyTopics = allTopicIds.filter(t => !(topicCounts[t] || 0))
  if (emptyTopics.length > 0) {
    console.log(`\nTopics with 0 questions (${emptyTopics.length}):`)
    emptyTopics.forEach(t => console.log(`  - ${t}`))
  }

  // Year distribution
  const yearCounts = {}
  for (const u of allUpdates) {
    for (const tag of u.tags) {
      if (tag.startsWith('year:')) {
        const year = tag.slice(5)
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    }
  }
  console.log('\nBy year:')
  Object.entries(yearCounts).sort().forEach(([y, c]) => console.log(`  ${y}: ${c}`))

  console.log(`\n✅ Done! Tags format: ['topic:<id>', 'year:<year>', 'subject:<subject>', 'upsc', 'prelims']`)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
