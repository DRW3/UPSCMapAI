/**
 * app/api/journey/pyqs/route.ts
 *
 * Returns UPSC PYQs for a learning journey topic.
 * Strategy: Query Supabase first → fall back to AI generation if needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const PYQ_TABLE = process.env.PYQ_TABLE || 'upsc_pyqs';

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

// ── Topic display names for AI fallback prompts ─────────────────────────────

const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  'prehistoric-india':         'Prehistoric India (Palaeolithic, Mesolithic, Neolithic)',
  'indus-valley':              'Indus Valley Civilization',
  'vedic-age':                 'Vedic Age and Upanishads',
  'buddhism-jainism':          'Buddhism and Jainism',
  'mahajanapadas':             'Mahajanapadas and Early Republics',
  'mauryan-empire':            'Mauryan Empire (Chandragupta, Ashoka)',
  'post-mauryan':              'Post-Mauryan Period (Kushanas, Satavahanas)',
  'gupta-empire':              'Gupta Empire and Classical India',
  'south-india-ancient':       'Ancient South India (Pallavas, Chalukyas, Cholas)',
  'rajput-kingdoms':           'Rajput Kingdoms',
  'arab-turkish-invasions':    'Arab and Turkish Invasions',
  'chola-maritime':            'Chola Maritime Empire',
  'slave-dynasty':             'Delhi Sultanate – Slave Dynasty',
  'khalji-tughlaq':            'Khalji and Tughlaq Dynasties',
  'vijayanagara-bahmani':      'Vijayanagara and Bahmani Kingdoms',
  'akbar':                     'Akbar and Mughal Administration',
  'aurangzeb':                 'Aurangzeb and Mughal Decline',
  'bhakti-movement':           'Bhakti Movement',
  'sufi-movement':             'Sufi Movement',
  'maratha-empire':            'Maratha Empire',
  'european-trade':            'European Trading Companies in India',
  'battle-plassey-buxar':      'Battle of Plassey and Buxar',
  'british-expansion':         'British Expansion in India',
  'colonial-economy-impact':   'Colonial Economy and Its Impact',
  'socioreligious-reforms':    'Socio-Religious Reform Movements',
  'revolt-1857':               'Revolt of 1857',
  'early-nationalism':         'Rise of Indian Nationalism',
  'gandhian-era':              'Gandhian Era and National Movement',
  'independence-partition':    'Independence and Partition',
  'himalayas':                 'The Himalayan Region',
  'deccan-plateau':            'Deccan Plateau and Peninsular India',
  'northern-plains':           'Northern Plains of India',
  'rivers-drainage':           'Rivers and Drainage Systems',
  'climate-india':             'Climate of India',
  'soils-vegetation':          'Soils and Natural Vegetation',
  'agriculture-geo':           'Agricultural Geography',
  'minerals-resources':        'Minerals and Resources',
  'ocean-currents':            'Ocean Currents and Oceanography',
  'making-constitution':       'Making of the Indian Constitution',
  'fundamental-rights':        'Fundamental Rights',
  'dpsp-duties':               'Directive Principles and Fundamental Duties',
  'federal-structure':         'Federal Structure of India',
  'parliament':                'Indian Parliament',
  'judiciary':                 'Indian Judiciary',
  'local-government':          'Panchayati Raj and Local Government',
  'planning-development':      'Planning and Development',
  'fiscal-monetary':           'Fiscal and Monetary Policy',
  'poverty-inequality':        'Poverty and Inequality',
  'agriculture-economy':       'Agricultural Economy',
  'banking-finance':           'Banking and Finance',
  'biodiversity-conservation': 'Biodiversity and Conservation',
  'protected-areas':           'Protected Areas and Wildlife',
  'climate-change':            'Climate Change',
  'pollution':                 'Pollution and Environmental Degradation',
  'renewable-energy':          'Renewable Energy',
  'isro-space':                'ISRO and Space Technology',
  'ai-biotech':                'AI and Biotechnology',
  'defense-tech':              'Defense Technology',

  // ── New Topics ─────────────────────────────────────────────────────────
  'ajivika-charvaka': 'Ajivika, Charvaka & Other Heterodox Sects',
  'sangam-age': 'Sangam Age — Tamil Polity, Literature & Trade',
  'harsha-pushyabhuti': 'Harshavardhana & Post-Gupta Period',
  'vakatakas': 'Vakatakas',
  'rashtrakutas': 'Rashtrakutas — Ellora & Deccan Power',
  'ancient-coinage': 'Ancient Indian Coinage',
  'ancient-inscriptions': 'Ancient Indian Inscriptions & Epigraphy',
  'sultanate-administration': 'Delhi Sultanate Administration & Revenue System',
  'sultanate-architecture': 'Indo-Islamic Architecture — Delhi Sultanate',
  'sher-shah-suri': 'Sher Shah Suri — Administration & Legacy',
  'mughal-administration': 'Mughal Administration — Mansabdari, Jagirdari & Revenue',
  'sikhism-gurus': 'Rise of Sikhism — Guru Nanak to Guru Gobind Singh',
  'provincial-dynasties': 'Provincial Dynasties — Ahoms, Kakatiyas, Hoysalas, Gajapatis',
  'medieval-society-economy': 'Medieval Indian Society, Trade & Economy',
  'medieval-literature': 'Medieval Indian Languages & Literature',
  'deccan-sultanates-detail': 'Deccan Sultanates — Bijapur, Golconda, Ahmadnagar, Bidar, Berar',
  'anglo-mysore-wars': 'Anglo-Mysore Wars — Hyder Ali & Tipu Sultan',
  'anglo-maratha-wars': 'Anglo-Maratha Wars',
  'anglo-sikh-wars': 'Anglo-Sikh Wars & Punjab Under British',
  'british-land-revenue': 'British Land Revenue Systems — Permanent Settlement, Ryotwari, Mahalwari',
  'south-west-reforms': 'Reform Movements in South & West India',
  'peasant-tribal-movements': 'Peasant & Tribal Movements',
  'working-class-movements': 'Trade Union & Working Class Movements',
  'left-wing-politics': 'Left Wing in Indian Politics — CSP, CPI, Peasant Movements',
  'communalism-two-nation': 'Communalism & Two-Nation Theory — Muslim League, Hindu Mahasabha',
  'press-education-national': 'Role of Press & Education in National Movement',
  'women-freedom-struggle': 'Women in the Freedom Struggle',
  'nehru-era': 'Consolidation After Independence — Nehru Era',
  'princely-states-integration': 'Integration of Princely States — Sardar Patel & VP Menon',
  'states-reorganization': 'States Reorganization — SRC & Linguistic States',
  'land-reforms-post-47': 'Land Reforms After Independence',
  'five-year-plans-history': 'Five Year Plans — From Planning Commission to NITI Aayog',
  'green-white-revolution': 'Green Revolution, White Revolution & Agricultural Transformation',
  'foreign-policy-nam': 'India\'s Foreign Policy — NAM, Panchsheel, Bandung',
  'indo-pak-wars': 'Indo-Pak Wars — 1947, 1965, 1971 & Bangladesh Liberation',
  'indo-china-1962': 'Indo-China War 1962 & Sino-Indian Relations',
  'emergency-1975': 'Emergency 1975-77 — Causes, Events & Aftermath',
  'liberalization-1991': 'Liberalization 1991 — LPG Reforms',
  'nuclear-tests': 'India\'s Nuclear Journey — Pokhran I & II',
  'kashmir-issue-evolution': 'Kashmir Issue — Evolution from 1947 to Present',
  'northeast-insurgency': 'Northeast India — Insurgency, Accords & Integration',
  'punjab-crisis': 'Punjab Crisis — Akali Movement, Operation Bluestar',
  'mandal-commission': 'Mandal Commission & Social Justice Movements',
  'coalition-era': 'Coalition Era Politics — 1989 Onwards',
  'renaissance-reformation': 'Renaissance, Reformation & Enlightenment',
  'american-revolution': 'American Revolution & US Constitution',
  'french-revolution': 'French Revolution — Causes, Course & Legacy',
  'industrial-revolution': 'Industrial Revolution — Origins, Phases & Social Impact',
  'nationalism-europe': 'Nationalism in Europe — German & Italian Unification',
  'imperialism-colonialism': 'Imperialism & Colonialism — Scramble for Africa & Asia',
  'world-war-1': 'World War I — Causes, Course & Treaty of Versailles',
  'russian-revolution': 'Russian Revolution 1917 — Bolshevism & Soviet State',
  'fascism-nazism': 'Rise of Fascism & Nazism — Italy & Germany',
  'world-war-2': 'World War II — Causes, Course & Consequences',
  'cold-war': 'Cold War — Origins, Proxy Wars, Detente & End',
  'decolonization': 'Decolonization of Asia & Africa',
  'chinese-revolution': 'Chinese Revolution — Sun Yat-sen to Mao',
  'arab-israeli-conflict': 'Creation of Israel & Arab-Israeli Conflicts',
  'ussr-collapse': 'Collapse of USSR & End of Cold War',
  'political-philosophies': 'Political Philosophies — Communism, Capitalism, Socialism, Fascism',
  'globalization-world-order': 'Globalization & Post-Cold War World Order',
  'national-boundaries-redrawing': 'Redrawing of National Boundaries — Post-War to Present',
  'trans-himalayan': 'Trans-Himalayan Zone — Karakoram, Ladakh, Zaskar',
  'lakes-india': 'Lakes of India — Natural & Artificial',
  'cyclones-india': 'Tropical Cyclones — Indian Ocean, Track & Impact',
  'irrigation-india': 'Irrigation Systems — Types, Projects & Water Disputes',
  'coastal-plains': 'Coastal Plains & Ports of India',
  'thar-desert': 'Thar Desert & Arid Zone',
  'earth-interior': 'Interior of the Earth — Crust, Mantle, Core',
  'plate-tectonics': 'Plate Tectonics & Volcanism',
  'rocks-minerals': 'Rocks & Minerals — Types & Rock Cycle',
  'geomorphology': 'Geomorphology — Weathering, Erosion & Landforms',
  'atmosphere-structure': 'Atmosphere — Composition, Structure & Heat Budget',
  'pressure-winds': 'Pressure Belts, Winds & Atmospheric Circulation',
  'precipitation-types': 'Precipitation, Fronts & Air Masses',
  'oceanography': 'Oceans — Relief, Temperature, Salinity',
  'tides': 'Tides — Types, Causes & Significance',
  'world-rivers-lakes': 'World Major Rivers & Lakes',
  'world-deserts': 'World Major Deserts — Hot & Cold',
  'industrial-location': 'Industrial Location Factors & Global Patterns',
  'world-agriculture': 'World Agriculture — Types, Patterns & Food Production',
  'world-population': 'World Population — Distribution, Growth & Migration',
  'indian-society-features': 'Salient Features of Indian Society — Diversity & Pluralism',
  'regionalism': 'Regionalism — Sub-Nationalism, Demand for States',
  'secularism-india': 'Secularism — Indian vs Western Model',
  'globalization-society': 'Effects of Globalization on Indian Society',
  'social-empowerment': 'Social Empowerment — Dalits, Tribals, Minorities, Disabled, Elderly',
  'education-society': 'Role of Education in Society & Empowerment',
  'indian-diaspora': 'Indian Diaspora — Role, Policies & Soft Power',
  'folk-music-dance': 'Folk Music & Dance of India',
  'indian-theatre': 'Indian Theatre & Performing Arts',
  'puppetry-traditions': 'Indian Puppetry & Shadow Theatre',
  'buddhist-jain-architecture': 'Buddhist & Jain Architecture',
  'indo-islamic-architecture': 'Indo-Islamic Architecture — Sultanate to Provincial Styles',
  'colonial-architecture': 'Colonial & Modern Indian Architecture',
  'unesco-heritage-india': 'UNESCO World Heritage Sites in India',
  'handicrafts-textiles': 'Indian Handicrafts, Textiles & GI Tags',
  'festivals-india': 'Indian Festivals — Regional, Religious & National',
  'martial-arts-india': 'Indian Martial Arts & Sports Heritage',
  'languages-scripts': 'Indian Languages, Scripts & Classical Languages',
  'indian-literature-modern': 'Indian Literature — Ancient to Modern',
  'fairs-melas': 'Important Fairs, Melas & Cultural Events',
  'preamble': 'Preamble — Philosophy & Significance',
  'right-freedom-religion': 'Right to Freedom of Religion — Articles 25-28',
  'cultural-educational-rights': 'Cultural & Educational Rights — Articles 29-30',
  'parliamentary-committees': 'Parliamentary Committees — Standing, Financial & Ad Hoc',
  'legislative-process': 'Legislative Process — Bills, Types & Passage',
  'subordinate-courts': 'Subordinate Courts & Tribunals',
  'inter-state-relations': 'Inter-State Relations — Water Disputes, Zonal Councils',
  'emergency-provisions': 'Emergency Provisions — Articles 352, 356, 360',
  'special-provisions-states': 'Special Provisions for States — Art 370, 371 & Schedules V, VI',
  'constitutional-bodies': 'Constitutional Bodies — EC, UPSC, FC, CAG, AG',
  'statutory-regulatory-bodies': 'Statutory & Regulatory Bodies — NHRC, NCW, SEBI, TRAI, CCI, etc.',
  'representation-peoples-act': 'Representation of People\'s Act & Electoral Reforms',
  'comparative-constitutions': 'Comparison with Other Constitutions — US, UK, France, etc.',
  'pressure-groups': 'Pressure Groups & Civil Society in Indian Polity',
  'government-schemes': 'Major Government Policies & Schemes for Development',
  'welfare-vulnerable': 'Welfare Schemes for Vulnerable Sections',
  'health-education-governance': 'Health, Education & HRD Governance',
  'india-foreign-policy': 'India\'s Foreign Policy — Principles & Evolution',
  'india-indian-ocean': 'India in Indian Ocean Region — IORA, Maritime Strategy',
  'india-africa': 'India-Africa Relations',
  'india-central-west-asia': 'India & Central Asia, West Asia, Latin America',
  'diaspora-policy': 'Indian Diaspora — Policy & Global Role',
  'developed-developing-impact': 'Impact of Developed & Developing Countries\' Policies on India',
  'international-treaties': 'Key International Treaties & Agreements',
  'india-global-commons': 'India & Global Commons — Arctic, Antarctica, Space, Cyber, Deep Sea',
  'national-income': 'National Income — GDP, GNP, NDP, NNP & Measurement',
  'government-budgeting': 'Government Budgeting — Process, Receipts & Expenditure',
  'taxation-system': 'Taxation — Direct, Indirect, GST Structure',
  'food-processing': 'Food Processing & Related Industries',
  'land-reforms-economy': 'Land Reforms in India — History & Contemporary Issues',
  'animal-husbandry-fisheries': 'Animal Husbandry, Dairy & Fisheries',
  'irrigation-economy': 'Irrigation & Water Resources Economics',
  'liberalization-economy': 'Economic Liberalization — LPG & Industrial Policy Changes',
  'msme-industry': 'Industrial Growth — MSMEs, Make in India & PLI',
  'investment-models': 'Investment Models — PPP, BOT, VGF, HAM',
  'insurance-pension': 'Insurance & Pension Sector',
  'capital-markets': 'Capital Markets — SEBI, Stock Exchanges & Bonds',
  'general-physics': 'General Science — Physics Basics',
  'general-chemistry': 'General Science — Chemistry Basics',
  'general-biology': 'General Science — Biology & Human Physiology',
  'health-diseases': 'Health, Diseases & Public Health',
  'it-computers': 'IT, Computers & Digital Technology',
  'robotics-automation': 'Robotics, Automation & Industry 4.0',
  'ipr-patents': 'Intellectual Property Rights — Patents, GI Tags, TRIPS',
  'indians-in-science': 'Achievements of Indians in Science & Technology',
  'agricultural-science': 'Agricultural Science & Technology',
  'space-applications': 'Space Technology Applications — Remote Sensing, GPS, Weather',
  'emerging-tech-latest': 'Emerging Technologies — 5G, IoT, 3D Printing, Drones',
  'eia-process': 'Environmental Impact Assessment — Process & Issues',
  'environment-laws': 'Environmental Laws & Institutions — EPA, WPA, NGT',
  'ecology-fundamentals': 'Ecology Fundamentals — Food Chain, Pyramids, Cycles',
  'ecosystem-types': 'Ecosystem Types — Terrestrial, Aquatic, Marine',
  'species-conservation': 'Species Conservation — IUCN, Red List, Schedules',
  'indian-flora-fauna': 'Indian Flora & Fauna — Endemic & Endangered Species',
  'waste-management': 'Waste Management — Solid, Plastic, E-Waste, Biomedical',
  'sustainable-development': 'Sustainable Development — SDGs, Circular Economy',
  'carbon-markets': 'Carbon Markets & Climate Finance',
  'external-state-actors': 'Role of State & Non-State Actors in Internal Security',
  'development-extremism-link': 'Linkages Between Development & Spread of Extremism',
  'media-social-security': 'Role of Media & Social Networking in Security Challenges',
  'money-laundering': 'Money Laundering — PMLA, FATF, Black Money',
  'organized-crime': 'Organized Crime — Drug Trafficking, Human Trafficking, Arms',
  'security-forces': 'Security Forces & Agencies — BSF, CRPF, CISF, ITBP, NSG & Mandates',
  'ethics-human-interface': 'Ethics & Human Interface — Essence, Determinants, Consequences',
  'emotional-intelligence': 'Emotional Intelligence — Concepts & Applications in Governance',
  'ethics-private-public': 'Ethics in Private & Public Relationships',
  'human-values': 'Human Values — Role of Family, Society & Education',
  'ethics-dimensions': 'Dimensions of Ethics — Personal, Professional, Applied',
  'ethical-dilemmas-govt': 'Ethical Concerns & Dilemmas in Government & Private Institutions',
  'laws-rules-conscience': 'Laws, Rules, Regulations & Conscience as Ethical Guidance',
  'probity-governance': 'Probity in Governance — Philosophical Basis',
  'codes-ethics-conduct': 'Codes of Ethics & Codes of Conduct in Governance',
  'work-culture-delivery': 'Work Culture & Quality of Service Delivery',
  'ethical-intl-relations': 'Ethical Issues in International Relations & Funding',
  'corporate-governance': 'Corporate Governance — Principles, Scandals & Reforms',
  'public-funds-ethics': 'Utilization of Public Funds — Ethical Dimensions',
  'great-leaders-lessons': 'Lessons from Lives of Great Leaders & Reformers',
  // ── CSAT — Reading Comprehension ─────────────────────────────────────────
  'passage-comprehension': 'Passage Analysis & Inference — Main Idea, Tone, Purpose',
  'critical-reading': 'Critical Reading & Evaluation — Arguments, Assumptions, Bias',
  'para-jumbles-summary': 'Para Jumbles & Précis Writing — Ordering, Summarization',
  // ── CSAT — Logical Reasoning ───────────────────────────────────────────
  'syllogisms': 'Syllogisms & Venn Diagrams — All/Some/No Statements',
  'statement-assumption': 'Statement & Assumption — Implicit, Explicit, Negation Method',
  'statement-conclusion': 'Statement & Conclusion / Arguments — Strong vs Weak',
  'coding-decoding': 'Coding-Decoding — Letter, Number, Symbol Coding',
  'blood-relations': 'Blood Relations — Family Tree, Generation Mapping',
  'direction-sense': 'Direction Sense & Distance — Cardinal Directions, Displacement',
  'seating-arrangement': 'Seating Arrangement & Puzzles — Linear, Circular, Floor',
  'logical-sequence': 'Logical Sequence & Order — Ranking, Alphabetical, Dictionary',
  // ── CSAT — Analytical Ability ──────────────────────────────────────────
  'number-series': 'Number Series & Patterns — AP, GP, Mixed Series',
  'letter-series': 'Letter & Alphanumeric Series — Gaps, Reverse Alphabet',
  'analogies-classification': 'Analogies & Classification — Odd One Out, Relationships',
  'pattern-recognition': 'Figure & Pattern Recognition — Mirror, Water Image, Embedded',
  'paper-folding-dice': 'Paper Folding, Cutting & Dice — Opposite Faces, Cube Painting',
  // ── CSAT — Data Interpretation ─────────────────────────────────────────
  'bar-line-graphs': 'Bar & Line Graphs — Stacked, Grouped, Trends',
  'pie-charts': 'Pie Charts & Percentages — Degree, Sector Comparison',
  'tables-data': 'Tables & Data Analysis — Row-Column, Multi-Table',
  'data-sufficiency': 'Data Sufficiency — Statement Analysis, Minimum Data Needed',
  // ── CSAT — Basic Numeracy ──────────────────────────────────────────────
  'number-system': 'Number System & Divisibility — HCF, LCM, Remainder Theorem',
  'percentage-ratio': 'Percentage, Ratio & Proportion — Successive, Partnership',
  'average-mixture': 'Averages, Mixtures & Alligation — Weighted Average, Dilution',
  'time-speed-distance': 'Time, Speed & Distance — Boats, Trains, Circular Track',
  'time-work': 'Time & Work — Pipes, Cisterns, Efficiency',
  'profit-loss-interest': 'Profit, Loss & Interest — Markup, Discount, SI/CI',
  'probability-combinatorics': 'Probability & Basic Combinatorics — PnC, Counting Principle',
  'geometry-mensuration': 'Geometry & Mensuration — Triangles, Circles, Volume',
  // ── CSAT — Decision Making ─────────────────────────────────────────────
  'administrative-decisions': 'Administrative Decision Making — Stakeholder, Prioritization',
  'problem-identification': 'Problem Identification & Solution — Root Cause, Lateral Thinking',
  'essay-technique': 'Essay Writing Technique — Structure, Introduction, Conclusion',
  'essay-philosophical': 'Philosophical & Abstract Essay Themes',
  'essay-social': 'Social Issues Essay Themes',
  'essay-political': 'Political & Governance Essay Themes',
  'essay-science-env': 'Science, Technology & Environment Essay Themes',
  'essay-economy': 'Economy & Development Essay Themes',
  'govt-schemes-current': 'Government Schemes & Policies — Current Database',
  'acts-bills-current': 'Important Acts, Bills & Ordinances — Recent',
  'international-events': 'International Events, Summits & Exercises',
  'awards-appointments': 'Awards, Appointments & Sports Events',
  'science-news': 'Science & Technology in News',
  'economic-events': 'Economic Events — Budget, RBI, Trade',
  'reports-indices': 'Important Reports & Global Indices',
  'places-in-news': 'Places in News — Conflicts, Disasters, Diplomacy',
}

const SUBJECT_MAP: Record<string, string> = {
  'ancient-history':   'Ancient Indian History',
  'medieval-history':  'Medieval Indian History',
  'modern-history':    'Modern Indian History',
  'geography':         'Indian and World Geography',
  'polity':            'Indian Polity and Governance',
  'economy':           'Indian Economy',
  'environment':       'Environment and Ecology',
  'science-tech':      'Science and Technology',
  'ethics':            'Ethics, Integrity and Aptitude',
  'society':           'Indian Society and Culture',
  'art-culture':       'Art and Culture',
  'world-history':     'World History',
  'post-independence': 'Post-Independence India',
  'csat':              'CSAT — Civil Services Aptitude Test',
  'essay':             'Essay Paper',
  'current-affairs':   'Current Affairs and Analysis',
  'general-science':   'General Science for Prelims',
}

// ── Supabase PYQ retrieval ──────────────────────────────────────────────────

interface DbPYQ {
  id: number
  year: number
  question: string
  options: { a: string; b: string; c: string; d: string; correct?: string } | null
  answer: string | null
  explanation: string | null
  subject: string
  topic: string
  difficulty: string | null
  source: string
}

// ── Result of a Supabase fetch ─────────────────────────────────────────────
// `exhausted` is true when the topic has DB questions but the user has seen
// every single valid one (post-isValidQuestion filter). Frontend uses this
// to fire the "all PYQs done" celebration.
interface SupabaseFetchResult {
  questions: DbPYQ[]
  exhausted: boolean
  totalDbAvailable: number   // unfiltered count of valid questions for this topic
}

// Fetch the topic's DB pool — STRICTLY topic-tagged questions only.
// We deliberately do NOT fall back to keyword/subject queries here, because
// those drag in questions from sibling topics (e.g. an "Akbar" question
// when the user is practicing "Mauryan Empire") which destroys the user's
// trust in the topic filter. Every question in the DB has been precision-
// tagged by the Groq tagger pipeline, so the tag query is authoritative.
//
// For topics that genuinely have no tagged questions in the DB, the GET
// handler falls through to AI generation (which is constrained to the
// requested topic by prompt) — that's a much better fallback than wrong-
// topic content.
//
// All exclusion happens in JS (no fragile PostgREST `.not('id', 'in', ...)`).
async function fetchFromSupabase(
  topicId: string,
  _subjectId: string,
  limit: number,
  year: number | undefined,
  excludeIds: number[],
): Promise<SupabaseFetchResult> {
  const supabase = createServerClient()
  const SELECT_FIELDS = 'id, year, question, options, answer, explanation, subject, topic, difficulty, source, tags'
  const excludeSet = new Set(excludeIds.filter(n => Number.isFinite(n) && n > 0))
  const POOL_LIMIT = 500

  // Strict tag-based query — the ONLY source of truth for topic membership.
  const topicTag = `topic:${topicId}`
  let tagQuery = supabase
    .from(PYQ_TABLE)
    .select(SELECT_FIELDS)
    .contains('tags', [topicTag])
    .not('options', 'is', null)
    .not('answer', 'is', null)
  if (year) tagQuery = tagQuery.eq('year', year)
  const { data: tagData } = await tagQuery.limit(POOL_LIMIT)
  const rawRows = (tagData || []) as DbPYQ[]

  // Defense-in-depth: even though `.contains('tags', [topicTag])` should be
  // strict, double-check each row's tags array on the server side. Drop any
  // row whose tags somehow do NOT contain our exact topic tag.
  const topicScopedRows = rawRows.filter(r => {
    const tags = (r as DbPYQ & { tags?: unknown }).tags
    if (!Array.isArray(tags)) return false
    return tags.some(t => typeof t === 'string' && t === topicTag)
  })

  // Sanitize: drop dupes, drop invalid, separate seen vs fresh.
  const seenIds = new Set<number>()
  const allValid: DbPYQ[] = []
  const fresh: DbPYQ[] = []
  for (const row of topicScopedRows) {
    if (seenIds.has(row.id)) continue
    seenIds.add(row.id)
    if (!isValidQuestion(row)) continue
    allValid.push(row)
    if (!excludeSet.has(row.id)) fresh.push(row)
  }

  // Happy path: fresh items available — return up to `limit`.
  if (fresh.length > 0) {
    return {
      questions: shuffleAndPick(fresh, limit),
      exhausted: false,
      totalDbAvailable: allValid.length,
    }
  }

  // No fresh items left. Three distinct empty states:
  //  - allValid > 0 AND excludeSet covers them all → EXHAUSTED
  //    (the user has actually seen every tagged question)
  //  - allValid > 0 BUT excludeSet is empty/partial → not exhausted
  //    (something weird; should never happen since fresh would be > 0)
  //  - allValid === 0 → topic has zero tagged questions in the DB at all
  //    (caller falls back to AI generation)
  //
  // Belt-and-suspenders: require BOTH allValid > 0 AND excludeSet has at
  // least as many entries as allValid (i.e. the user has seen every
  // single one). This guarantees `exhausted: true` only fires when the
  // user has truly attempted every tagged question for the topic.
  const everyValidIdSeen = allValid.length > 0 &&
    allValid.every(q => excludeSet.has(q.id))
  return {
    questions: [],
    exhausted: everyValidIdSeen,
    totalDbAvailable: allValid.length,
  }
}

function isValidQuestion(q: DbPYQ): boolean {
  if (!q.options || !q.answer) return false
  const opts = q.options
  // All 4 options must exist and be reasonable length
  if (!opts.a || !opts.b || !opts.c || !opts.d) return false
  // Reject if any option is too short (< 2 chars) or absurdly long (> 500 chars)
  for (const val of [opts.a, opts.b, opts.c, opts.d]) {
    if (val.length < 2 || val.length > 500) return false
  }
  // Reject if options look like fragments of question text
  const qLen = q.question.length
  if (opts.b.length > qLen * 0.8 || opts.d.length > qLen * 0.8) return false
  // Answer must be a/b/c/d
  if (!['a', 'b', 'c', 'd'].includes(q.answer.toLowerCase())) return false
  return true
}

function shuffleAndPick(arr: DbPYQ[], count: number): DbPYQ[] {
  const valid = arr.filter(isValidQuestion)
  const shuffled = [...valid]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// ── AI fallback generation ──────────────────────────────────────────────────

async function generateWithAI(
  topicId: string,
  subjectId: string,
  limit: number
): Promise<DbPYQ[]> {
  const topicName = TOPIC_DISPLAY_NAMES[topicId] || topicId.replace(/-/g, ' ')
  const subjectName = SUBJECT_MAP[subjectId] || subjectId.replace(/-/g, ' ')

  const MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a UPSC exam question paper setter. Generate authentic UPSC Prelims-style MCQs. Return only valid JSON.',
    },
    {
      role: 'user' as const,
      content: `Generate ${limit} realistic UPSC Prelims MCQs about "${topicName}" (subject: ${subjectName}).

Return a JSON array:
[
  {
    "year": <year 2015-2024>,
    "question": "<question>",
    "options": { "a": "<opt>", "b": "<opt>", "c": "<opt>", "d": "<opt>" },
    "answer": "<a/b/c/d>",
    "explanation": "<1-2 sentence explanation>",
    "subject": "${subjectId}",
    "topic": "${topicId}",
    "difficulty": "<easy/medium/hard>"
  }
]

Rules:
- Test conceptual understanding, not rote memory
- All 4 options should be plausible
- Cover different aspects of the topic
- Return ONLY the JSON array`,
    },
  ]

  let text = '[]'
  for (const model of MODELS) {
    try {
      const response = await getGroq().chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      })
      text = response.choices[0]?.message?.content?.trim() || '[]'
      break
    } catch (modelErr: unknown) {
      const err = modelErr as { status?: number; message?: string }
      if (err.status === 429 || (err.message && err.message.includes('429'))) {
        console.warn(`PYQs: ${model} rate-limited, trying next model...`)
        continue
      }
      throw modelErr
    }
  }
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed)) return []

  return parsed.map((q: Record<string, unknown>, i: number) => ({
    id: Date.now() + i,
    year: (q.year as number) || 2023,
    question: (q.question as string) || '',
    options: (q.options as DbPYQ['options']) || null,
    answer: (q.answer as string) || null,
    explanation: (q.explanation as string) || null,
    subject: (q.subject as string) || subjectId,
    topic: (q.topic as string) || topicId,
    difficulty: (q.difficulty as string) || 'medium',
    source: 'ai-generated',
  }))
}

// ── API Handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subject') || ''
  const topicId = searchParams.get('topic') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : undefined
  // Comma-separated list of question IDs to skip — used by the
  // "Try Again with New Questions" CTA in PracticeSheet.
  const excludeRaw = searchParams.get('excludeIds') || ''
  const excludeIds = excludeRaw
    ? excludeRaw
        .split(',')
        .map(s => parseInt(s, 10))
        .filter(n => Number.isFinite(n) && n > 0)
    : []
  // Comma-separated list of SPECIFIC question IDs to fetch. When set,
  // bypasses the topic-tag query entirely and returns those exact rows.
  // Used by the "Practice only Wrong Questions" CTA on the topic-complete
  // celebration to replay every question the user has ever answered wrong
  // for this topic, across all sessions.
  const idsRaw = searchParams.get('ids') || ''
  const onlyIds = idsRaw
    ? idsRaw
        .split(',')
        .map(s => parseInt(s, 10))
        .filter(n => Number.isFinite(n) && n > 0)
    : []

  // Helper to normalize a DbPYQ to the response shape the frontend expects.
  const toResponse = (q: DbPYQ) => {
    let answer = q.answer
    if (!answer && q.options && 'correct' in q.options) {
      answer = q.options.correct as string
    }
    return {
      id: q.id,
      year: q.year || 2023,
      question: q.question,
      options: q.options ? { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d } : null,
      answer,
      explanation: q.explanation,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty || 'medium',
      source: q.source || 'database',
    }
  }

  // ── Fast path: fetch specific question IDs (Practice Wrong Questions) ──
  if (onlyIds.length > 0) {
    try {
      const supabase = createServerClient()
      const SELECT_FIELDS = 'id, year, question, options, answer, explanation, subject, topic, difficulty, source, tags'
      const { data } = await supabase
        .from(PYQ_TABLE)
        .select(SELECT_FIELDS)
        .in('id', onlyIds)
        .not('options', 'is', null)
        .not('answer', 'is', null)
        .limit(Math.min(50, onlyIds.length))
      const rows = ((data || []) as DbPYQ[]).filter(isValidQuestion)
      // Preserve a stable response shape so the client can normalize.
      return NextResponse.json({
        pyqs: rows.map(toResponse),
        exhausted: false,
        totalDbAvailable: rows.length,
        seenCount: 0,
      })
    } catch (err) {
      console.error('Wrong-replay fetch failed:', err)
      return NextResponse.json({ pyqs: [], exhausted: false, totalDbAvailable: 0, seenCount: 0 })
    }
  }

  try {
    const dbResult = await fetchFromSupabase(topicId, subjectId, limit, year, excludeIds)

    // Happy path: enough fresh DB questions to fill the round.
    if (dbResult.questions.length >= 3) {
      return NextResponse.json({
        pyqs: dbResult.questions.map(toResponse),
        exhausted: false,
        totalDbAvailable: dbResult.totalDbAvailable,
        seenCount: excludeIds.length,
      })
    }

    // EXHAUSTED: topic has DB questions but the user has seen them all.
    // Surface the explicit signal so the frontend can fire the celebration
    // overlay instead of silently falling back to AI generation.
    if (dbResult.exhausted) {
      return NextResponse.json({
        pyqs: [],
        exhausted: true,
        totalDbAvailable: dbResult.totalDbAvailable,
        seenCount: excludeIds.length,
      })
    }

    // Otherwise — DB is thin (< 3 questions for this topic, ever) — top up
    // with AI to give the user something to practice.
    const aiQuestions = await generateWithAI(topicId, subjectId, limit - dbResult.questions.length)
    const combined = [...dbResult.questions, ...aiQuestions].slice(0, limit)
    return NextResponse.json({
      pyqs: combined.map(toResponse),
      exhausted: false,
      totalDbAvailable: dbResult.totalDbAvailable,
      seenCount: excludeIds.length,
    })
  } catch (err) {
    console.error('PYQ fetch failed:', err)
    // Last resort: AI only
    try {
      const aiQuestions = await generateWithAI(topicId, subjectId, limit)
      return NextResponse.json({
        pyqs: aiQuestions.map(toResponse),
        exhausted: false,
        totalDbAvailable: 0,
        seenCount: excludeIds.length,
      })
    } catch {
      return NextResponse.json({ pyqs: [], exhausted: false, totalDbAvailable: 0, seenCount: excludeIds.length })
    }
  }
}
