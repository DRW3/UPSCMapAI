/**
 * app/api/journey/pyqs/route.ts
 *
 * Returns UPSC PYQs for a learning journey topic.
 * Strategy: Query Supabase first → fall back to AI generation if needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { TOPIC_KEYWORD_MAP } from '@/data/topic-keyword-map'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

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

async function fetchFromSupabase(
  topicId: string,
  subjectId: string,
  limit: number,
  year?: number
): Promise<DbPYQ[]> {
  const supabase = createServerClient()
  const mapping = TOPIC_KEYWORD_MAP[topicId]
  const SELECT_FIELDS = 'id, year, question, options, answer, explanation, subject, topic, difficulty, source, tags'

  // ── Strategy 1: Tag-based query (precise, preferred) ────────────────────
  const topicTag = `topic:${topicId}`

  let tagQuery = supabase
    .from('upsc_pyqs')
    .select(SELECT_FIELDS)
    .contains('tags', [topicTag])
    .not('options', 'is', null)
    .not('answer', 'is', null)

  if (year) {
    tagQuery = tagQuery.eq('year', year)
  }

  const { data: tagData } = await tagQuery.limit(limit * 4)

  if (tagData && tagData.length >= 3) {
    return shuffleAndPick(tagData as DbPYQ[], limit)
  }

  // ── Strategy 2: Keyword fallback (for untagged data) ────────────────────
  if (mapping) {
    const keywords = mapping.keywords
    const dbSubjects = mapping.dbSubjects
    const keywordPattern = keywords.slice(0, 8).map(k => `%${k}%`)

    let kwQuery = supabase
      .from('upsc_pyqs')
      .select(SELECT_FIELDS)
      .in('subject', dbSubjects)
      .not('options', 'is', null)
      .not('answer', 'is', null)

    if (year) {
      kwQuery = kwQuery.eq('year', year)
    }

    const orConditions = keywordPattern.map(pat => `question.ilike.${pat}`).join(',')
    kwQuery = kwQuery.or(orConditions)

    const { data: kwData } = await kwQuery.limit(limit * 4)

    // Merge tag results + keyword results, deduped
    const combined = [...(tagData || []), ...(kwData || [])]
    const seen = new Set<number>()
    const unique = combined.filter(q => {
      if (seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })

    if (unique.length >= 3) {
      return shuffleAndPick(unique as DbPYQ[], limit)
    }

    // Strategy 3: Broader subject-only (no keyword filter, no year filter)
    if (unique.length < 3) {
      const { data: broadData } = await supabase
        .from('upsc_pyqs')
        .select(SELECT_FIELDS)
        .in('subject', dbSubjects)
        .not('options', 'is', null)
        .not('answer', 'is', null)
        .limit(limit * 3)

      if (broadData && broadData.length > 0) {
        const all = [...unique, ...broadData]
        const seen2 = new Set<number>()
        const unique2 = all.filter(q => {
          if (seen2.has(q.id)) return false
          seen2.add(q.id)
          return true
        })
        return shuffleAndPick(unique2 as DbPYQ[], limit)
      }
    }

    return unique.length > 0 ? shuffleAndPick(unique as DbPYQ[], limit) : []
  }

  // No mapping — try broad subject query
  const dbSubjects = subjectIdToDbSubjects(subjectId)
  const { data } = await supabase
    .from('upsc_pyqs')
    .select(SELECT_FIELDS)
    .in('subject', dbSubjects)
    .not('options', 'is', null)
    .not('answer', 'is', null)
    .limit(limit * 3)

  if (data && data.length > 0) {
    return shuffleAndPick(data as DbPYQ[], limit)
  }
  return []
}

function subjectIdToDbSubjects(subjectId: string): string[] {
  const map: Record<string, string[]> = {
    'ancient-history':   ['history'],
    'medieval-history':  ['history'],
    'modern-history':    ['history'],
    'world-history':     ['history'],
    'post-independence': ['history'],
    'geography':         ['geography'],
    'polity':            ['polity'],
    'economy':           ['economy'],
    'environment':       ['environment'],
    'science-tech':      ['science'],
    'society':           ['history', 'art_culture'],
    'ethics':            ['polity'],
    'csat':              ['general'],
    'essay':             ['general'],
    'current-affairs':   ['current_affairs'],
    'general-science':   ['science'],
  }
  return map[subjectId] || ['general']
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

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You are a UPSC exam question paper setter. Generate authentic UPSC Prelims-style MCQs. Return only valid JSON.',
      },
      {
        role: 'user',
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
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const text = response.choices[0]?.message?.content?.trim() || '[]'
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
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : undefined

  try {
    // Try Supabase first (tag-based + keyword fallback)
    const dbQuestions = await fetchFromSupabase(topicId, subjectId, limit, year)

    if (dbQuestions.length >= 3) {
      // Normalize DB format to match frontend expectations
      const pyqs = dbQuestions.map(q => {
        // Extract correct answer from options.correct if answer field is missing
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
      })

      return NextResponse.json({ pyqs })
    }

    // Fallback to AI generation
    const aiQuestions = await generateWithAI(topicId, subjectId, limit)

    // Combine DB + AI if DB had some results
    const combined = [...dbQuestions, ...aiQuestions].slice(0, limit)
    const pyqs = combined.map(q => ({
      id: q.id,
      year: q.year || 2023,
      question: q.question,
      options: q.options ? { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d } : null,
      answer: q.answer,
      explanation: q.explanation,
      subject: q.subject || subjectId,
      topic: q.topic || topicId,
      difficulty: q.difficulty || 'medium',
      source: q.source || 'ai-generated',
    }))

    return NextResponse.json({ pyqs })
  } catch (err) {
    console.error('PYQ fetch failed:', err)

    // Last resort: try AI only
    try {
      const aiQuestions = await generateWithAI(topicId, subjectId, limit)
      const pyqs = aiQuestions.map(q => ({
        id: q.id,
        year: q.year || 2023,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        subject: q.subject || subjectId,
        topic: q.topic || topicId,
        difficulty: q.difficulty || 'medium',
        source: 'ai-generated',
      }))
      return NextResponse.json({ pyqs })
    } catch {
      return NextResponse.json({ pyqs: [] })
    }
  }
}
