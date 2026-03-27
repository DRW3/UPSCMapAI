/**
 * tag-pyqs-by-topic.mjs
 *
 * Reads all DB questions, scores each against every syllabus topic's keywords,
 * and updates the `tags` field with matching topic IDs.
 *
 * Run: /opt/homebrew/bin/node scripts/tag-pyqs-by-topic.mjs
 */

import fs from 'fs'
import path from 'path'

// ── Load env ──────────────────────────────────────────────────────────────────
const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const [k, ...v] = l.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}

const { createClient } = await import('@supabase/supabase-js')
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── Topic keyword map (inlined from data/topic-keyword-map.ts) ────────────────

const TOPIC_KEYWORD_MAP = {
  // Ancient History
  'prehistoric-india': { dbSubjects: ['history'], keywords: ['prehistoric', 'palaeolithic', 'mesolithic', 'neolithic', 'chalcolithic', 'bhimbetka', 'mehrgarh', 'stone age', 'microliths'] },
  'indus-valley': { dbSubjects: ['history'], keywords: ['indus', 'harappa', 'mohenjo', 'lothal', 'dholavira', 'kalibangan', 'rakhigarhi', 'harappan', 'great bath', 'granary'] },
  'vedic-age': { dbSubjects: ['history'], keywords: ['vedic', 'rigveda', 'upanishad', 'varna', 'aryans', 'arya', 'janapada', 'brahmin', 'kshatriya', 'samhita', 'brahmana'] },
  'buddhism-jainism': { dbSubjects: ['history'], keywords: ['buddhism', 'buddhist', 'buddha', 'jainism', 'jain', 'tirthankara', 'mahavira', 'pali', 'sangha', 'theravada', 'mahayana', 'nirvana', 'bodhi', 'tripitaka', 'dhamma', 'anekantavada', 'tirthankar'] },
  'mahajanapadas': { dbSubjects: ['history'], keywords: ['mahajanapada', 'magadha', 'licchavi', 'vajji', 'koshala', 'nanda', 'republic', 'gana sangha', 'sixteen states'] },
  'mauryan-empire': { dbSubjects: ['history'], keywords: ['maurya', 'chandragupta', 'ashoka', 'kautilya', 'arthashastra', 'edicts', 'kalinga', 'dhamma', 'pataliputra', 'megasthenes', 'indica', 'chanakya', 'rock edict', 'pillar edict'] },
  'post-mauryan': { dbSubjects: ['history'], keywords: ['shunga', 'sunga', 'kushana', 'kanishka', 'satavahana', 'indo-greek', 'gandhara art', 'mathura school', 'amaravati', 'yavana', 'kushan'] },
  'gupta-empire': { dbSubjects: ['history'], keywords: ['gupta', 'samudragupta', 'chandragupta ii', 'vikramaditya', 'nalanda', 'kalidasa', 'aryabhata', 'iron pillar', 'prayag prashasti', 'fahien', 'golden age'] },
  'south-india-ancient': { dbSubjects: ['history'], keywords: ['pallava', 'chalukya', 'chola', 'pandya', 'sangam', 'mahabalipuram', 'aihole', 'pattadakal', 'badami', 'brihadeshwara', 'chera'] },
  'ancient-art': { dbSubjects: ['history', 'art_culture'], keywords: ['stupa', 'vihara', 'chaitya', 'cave', 'ajanta', 'ellora', 'rock cut', 'gandhara', 'mathura art', 'amaravati school', 'sanchi', 'relief sculpture', 'architecture'] },
  'ancient-literature-science': { dbSubjects: ['history'], keywords: ['panini', 'charaka', 'sushruta', 'aryabhata', 'brahmagupta', 'varahamihira', 'astronomy', 'mathematics', 'ayurveda', 'yoga sutra', 'ashtadhyayi'] },

  // Medieval History
  'rajput-kingdoms': { dbSubjects: ['history'], keywords: ['rajput', 'prithviraj', 'tarain', 'rajasthan', 'tripartite struggle', 'gurjara', 'pratihara', 'chandela', 'paramara', 'chahamana'] },
  'arab-turkish-invasions': { dbSubjects: ['history'], keywords: ['mahmud ghazni', 'ghazni', 'somnath', 'alberuni', 'qasim', 'sind', 'ghori', 'muhammad ghori', 'battle of tarain'] },
  'chola-maritime': { dbSubjects: ['history'], keywords: ['chola', 'rajaraja', 'rajendra chola', 'brihadeshwara', 'naval expedition', 'southeast asia', 'local self government', 'ur', 'sabha', 'nattar', 'chola administration'] },
  'slave-dynasty': { dbSubjects: ['history'], keywords: ['qutb', 'iltutmish', 'raziya', 'balban', 'iqta', 'slave dynasty', 'mamluk', 'qutub minar', 'delhi sultanate', 'aibak'] },
  'khalji-tughlaq': { dbSubjects: ['history'], keywords: ['alauddin khalji', 'khalji', 'tughlaq', 'muhammad bin tughlaq', 'firoz shah', 'ibn battuta', 'market reform', 'capital transfer', 'mongol'] },
  'vijayanagara-bahmani': { dbSubjects: ['history'], keywords: ['vijayanagara', 'krishnadevaraya', 'talikota', 'bahmani', 'hampi', 'deccan sultanate', 'bahmanid'] },
  'lodi-dynasty': { dbSubjects: ['history'], keywords: ['lodi', 'sayyid', 'ibrahim lodi', 'panipat 1526', 'first battle panipat'] },
  'babur-humayun': { dbSubjects: ['history'], keywords: ['babur', 'humayun', 'baburnama', 'khanwa', 'sher shah', 'sur dynasty', 'grand trunk road', 'shergarh'] },
  'akbar': { dbSubjects: ['history'], keywords: ['akbar', 'mansabdari', 'din-i-ilahi', 'ibadat khana', 'fatehpur sikri', 'abul fazl', 'todar mal', 'birbal', 'rajput policy'] },
  'jahangir-shahjahan': { dbSubjects: ['history'], keywords: ['jahangir', 'noor jahan', 'shah jahan', 'taj mahal', 'red fort', 'tuzuk', 'peacock throne', 'mumtaz'] },
  'aurangzeb': { dbSubjects: ['history'], keywords: ['aurangzeb', 'jizya', 'shivaji', 'deccan policy', 'mughal decline', 'sambhaji'] },
  'mughal-culture': { dbSubjects: ['history', 'art_culture'], keywords: ['mughal miniature', 'urdu', 'char bagh', 'pietra dura', 'mughal architecture', 'akbarnama', 'ain-i-akbari', 'mughal painting'] },
  'bhakti-movement': { dbSubjects: ['history'], keywords: ['bhakti', 'alvars', 'nayanars', 'ramanuja', 'kabir', 'mirabai', 'tukaram', 'chaitanya', 'namdev', 'shankaracharya', 'advaita', 'sant', 'bhakti movement'] },
  'sufi-movement': { dbSubjects: ['history'], keywords: ['sufi', 'chishti', 'suhrawardi', 'qadiri', 'nizamuddin', 'amir khusrau', 'khanqah', 'silsila', 'dargah', 'sufism'] },
  'maratha-empire': { dbSubjects: ['history'], keywords: ['maratha', 'shivaji', 'ashtapradhan', 'peshwa', 'third battle panipat', 'maratha confederacy', 'guerrilla', 'chauth', 'sardeshmukhi'] },

  // Modern History
  'european-trade': { dbSubjects: ['history'], keywords: ['portuguese', 'dutch', 'french east india', 'carnatic wars', 'vasco da gama', 'east india company', 'factory surat', 'dupleix'] },
  'battle-plassey-buxar': { dbSubjects: ['history'], keywords: ['plassey', 'buxar', 'siraj', 'clive', 'mir jafar', 'dual government', 'diwani', 'nawab', 'battle of plassey', 'battle of buxar'] },
  'british-expansion': { dbSubjects: ['history'], keywords: ['subsidiary alliance', 'doctrine of lapse', 'tipu sultan', 'mysore war', 'maratha war', 'ranjit singh', 'sikh war', 'wellesley', 'cornwallis'] },
  'colonial-economy-impact': { dbSubjects: ['history'], keywords: ['drain of wealth', 'dadabhai naoroji', 'zamindari', 'ryotwari', 'indigo revolt', 'opium', 'de-industrialisation', 'permanent settlement', 'mahalwari'] },
  'socioreligious-reforms': { dbSubjects: ['history'], keywords: ['brahmo samaj', 'ram mohan roy', 'arya samaj', 'dayananda', 'ramakrishna', 'vivekananda', 'prarthana samaj', 'aligarh movement', 'sati abolition', 'widow remarriage'] },
  'revolt-1857': { dbSubjects: ['history'], keywords: ['revolt 1857', 'sepoy mutiny', 'bahadur shah', 'rani lakshmibai', 'nana sahib', 'tantia tope', 'mangal pandey', '1857'] },
  'early-nationalism': { dbSubjects: ['history'], keywords: ['indian national congress', 'INC 1885', 'hume', 'moderate', 'extremist', 'tilak', 'partition bengal', 'swadeshi', 'lal bal pal', 'gokhale'] },
  'gandhian-era': { dbSubjects: ['history'], keywords: ['gandhi', 'satyagraha', 'champaran', 'non-cooperation', 'civil disobedience', 'dandi march', 'quit india', 'INA', 'subhas bose', 'khilafat', 'rowlatt'] },
  'revolutionary-movements': { dbSubjects: ['history'], keywords: ['bhagat singh', 'chandrashekhar azad', 'ghadar party', 'anushilan', 'revolutionary', 'sukhdev', 'rajguru', 'kakori', 'hsra'] },
  'constitutional-developments': { dbSubjects: ['history', 'polity'], keywords: ['regulating act', "pitt's india act", 'government of india act', 'morley minto', 'dyarchy', 'communal award', 'cripps mission', 'montagu chelmsford', 'reforms 1919', 'reforms 1935', 'GOI act'] },
  'independence-partition': { dbSubjects: ['history'], keywords: ['partition', 'mountbatten', 'radcliffe', 'cabinet mission', 'princely states', 'sardar patel', 'integration', 'refugee', 'boundary commission'] },

  // Geography
  'himalayas': { dbSubjects: ['geography'], keywords: ['himalaya', 'himalayan', 'karakoram', 'siwalik', 'nanda devi', 'k2', 'pass', 'glacier', 'zoji la', 'rohtang', 'nathu la', 'mountain range'] },
  'deccan-plateau': { dbSubjects: ['geography'], keywords: ['deccan', 'western ghats', 'eastern ghats', 'vindhya', 'satpura', 'aravalli', 'deccan trap', 'rain shadow', 'plateau'] },
  'northern-plains': { dbSubjects: ['geography'], keywords: ['gangetic plain', 'doab', 'bhangar', 'khadar', 'terai', 'thar desert', 'rann of kutch', 'northern plains', 'indo-gangetic'] },
  'rivers-drainage': { dbSubjects: ['geography'], keywords: ['river', 'ganga', 'brahmaputra', 'indus', 'godavari', 'krishna', 'kaveri', 'yamuna', 'chambal', 'narmada', 'tapti', 'drainage system', 'tributary', 'river basin'] },
  'climate-india': { dbSubjects: ['geography'], keywords: ['monsoon', 'ITCZ', 'el nino', 'la nina', 'western disturbance', 'loo', 'northeast monsoon', 'southwest monsoon', 'mawsynram', 'rainfall pattern', 'cyclone'] },
  'soils-vegetation': { dbSubjects: ['geography'], keywords: ['alluvial soil', 'black soil', 'regur', 'laterite', 'red soil', 'forest type', 'mangrove forest', 'tropical evergreen', 'deciduous forest', 'soil erosion'] },
  'islands-india': { dbSubjects: ['geography'], keywords: ['andaman', 'nicobar', 'lakshadweep', 'coral reef', 'island', 'EEZ', 'exclusive economic zone', 'great nicobar'] },
  'agriculture-geo': { dbSubjects: ['geography', 'economy'], keywords: ['kharif', 'rabi', 'green revolution', 'cropping pattern', 'horticulture', 'crop', 'agriculture zone', 'irrigation'] },
  'minerals-resources': { dbSubjects: ['geography'], keywords: ['iron ore', 'coal', 'bauxite', 'petroleum', 'mineral', 'damodar valley', 'jharkhand mineral', 'rare earth', 'lignite', 'copper', 'manganese', 'mica'] },
  'industries-transport': { dbSubjects: ['geography'], keywords: ['steel plant', 'textile industry', 'SEZ', 'special economic zone', 'golden quadrilateral', 'freight corridor', 'port', 'industrial corridor'] },
  'population-urbanisation': { dbSubjects: ['geography'], keywords: ['census', 'population density', 'sex ratio', 'literacy rate', 'urbanisation', 'migration', 'demographic dividend'] },
  'world-physical': { dbSubjects: ['geography'], keywords: ['andes', 'rocky mountains', 'alps', 'rift valley', 'fold mountain', 'shield', 'ocean trench', 'tectonic', 'continent'] },
  'ocean-currents': { dbSubjects: ['geography'], keywords: ['ocean current', 'gulf stream', 'humboldt', 'thermohaline', 'gyre', 'upwelling', 'drift', 'warm current', 'cold current'] },
  'world-climate-zones': { dbSubjects: ['geography'], keywords: ['tropical rainforest', 'savanna', 'mediterranean climate', 'temperate grassland', 'taiga', 'tundra', 'boreal', 'steppe', 'koppen', 'biome'] },
  'geopolitical-resources': { dbSubjects: ['geography'], keywords: ['OPEC', 'persian gulf', 'rare earth', 'arctic', 'chokepoint', 'strait of malacca', 'strait of hormuz', 'suez canal', 'resource'] },

  // Polity
  'making-constitution': { dbSubjects: ['polity'], keywords: ['constituent assembly', 'ambedkar', 'objectives resolution', 'constitution making', 'rajendra prasad', 'drafting committee', 'constituent'] },
  'fundamental-rights': { dbSubjects: ['polity'], keywords: ['fundamental right', 'article 12', 'article 13', 'article 14', 'article 19', 'article 21', 'article 32', 'writ', 'habeas corpus', 'mandamus', 'equality', 'freedom', 'right to life'] },
  'dpsp-duties': { dbSubjects: ['polity'], keywords: ['directive principle', 'DPSP', 'article 36', 'article 51a', 'fundamental duties', 'gandhian principle', 'article 44', 'uniform civil code', 'directive'] },
  'federal-structure': { dbSubjects: ['polity'], keywords: ['union list', 'state list', 'concurrent list', 'residuary', 'seventh schedule', 'federal', 'centre-state', 'governor', 'article 356', 'president rule'] },
  'amendments': { dbSubjects: ['polity'], keywords: ['article 368', 'amendment', '42nd amendment', '44th amendment', '73rd amendment', '74th amendment', 'basic structure', 'kesavananda', 'constitutional amendment'] },
  'parliament': { dbSubjects: ['polity'], keywords: ['lok sabha', 'rajya sabha', 'parliament', 'money bill', 'joint session', 'speaker', 'anti-defection', 'question hour', 'zero hour', 'prorogation', 'budget session'] },
  'executive': { dbSubjects: ['polity'], keywords: ['president', 'prime minister', 'cabinet', 'council of ministers', 'ordinance', 'collective responsibility', 'dissolution lok sabha', 'article 74', 'article 75'] },
  'judiciary': { dbSubjects: ['polity'], keywords: ['supreme court', 'high court', 'judicial review', 'PIL', 'article 32', 'article 226', 'original jurisdiction', 'appellate jurisdiction', 'advisory opinion', 'judiciary'] },
  'state-government': { dbSubjects: ['polity'], keywords: ['governor discretion', 'chief minister', 'vidhan sabha', 'vidhan parishad', 'state legislature', 'article 356', 'state government'] },
  'local-government': { dbSubjects: ['polity'], keywords: ['panchayat', 'municipality', 'gram sabha', '73rd amendment', '74th amendment', 'three tier', 'nagar panchayat', 'PESA', 'fifth schedule', 'municipal corporation', 'zila parishad'] },
  'civil-services': { dbSubjects: ['polity'], keywords: ['civil service', 'IAS', 'IPS', 'UPSC commission', 'all india service', 'lateral entry', 'administrative reform', 'civil servants'] },
  'rti-egovernance': { dbSubjects: ['polity'], keywords: ['RTI', 'right to information', 'e-governance', 'digital india', 'information commission', 'aadhaar', 'transparency', 'accountability RTI'] },
  'anticorruption': { dbSubjects: ['polity'], keywords: ['lokpal', 'lokayukta', 'CAG', 'CVC', 'CBI', 'anticorruption', 'whistleblower', 'vigilance', 'prevention of corruption'] },
  'india-neighborhood': { dbSubjects: ['polity'], keywords: ['pakistan', 'china relations', 'bangladesh', 'nepal', 'bhutan', 'sri lanka', 'SAARC', 'LAC', 'myanmar', 'neighbourhood policy', 'BIMSTEC'] },
  'india-major-powers': { dbSubjects: ['polity'], keywords: ['india-us', 'quad', 'india-russia', 'S-400', 'india-china', 'doklam', 'galwan', 'india-eu', 'BRICS', 'SCO', 'nuclear deal', 'bilateral'] },
  'multilateral-bodies': { dbSubjects: ['polity'], keywords: ['united nations', 'UNSC', 'security council reform', 'IMF', 'world bank', 'WTO', 'G20', 'G7', 'commonwealth', 'permanent member'] },
  'regional-groupings': { dbSubjects: ['polity'], keywords: ['ASEAN', 'RCEP', 'BRICS', 'SCO', 'SAARC', 'belt and road', 'QUAD', 'AUKUS', 'IORA', 'regional grouping'] },

  // Economy
  'planning-development': { dbSubjects: ['economy'], keywords: ['five year plan', 'NITI aayog', 'planning commission', 'HDI', 'GDP growth', 'economic development', 'aspirational district', 'SDG'] },
  'fiscal-monetary': { dbSubjects: ['economy'], keywords: ['RBI', 'repo rate', 'CRR', 'SLR', 'monetary policy', 'fiscal deficit', 'FRBM', 'GST', 'inflation', 'monetary policy committee', 'LAF', 'open market operation', 'reverse repo'] },
  'poverty-inequality': { dbSubjects: ['economy'], keywords: ['poverty', 'poverty line', 'MGNREGA', 'unemployment', 'informal sector', 'gini coefficient', 'inequality', 'inclusive growth', 'tendulkar committee', 'SECC'] },
  'agriculture-economy': { dbSubjects: ['economy'], keywords: ['MSP', 'minimum support price', 'FCI', 'PDS', 'APMC', 'PM-KISAN', 'crop insurance', 'PM fasal bima', 'land reform', 'food security', 'zero budget farming'] },
  'infrastructure': { dbSubjects: ['economy'], keywords: ['gati shakti', 'sagarmala', 'UDAN', 'freight corridor', 'smart city', 'NIP', 'national infrastructure', 'PMAY', 'dedicated freight corridor', 'highway'] },
  'external-sector': { dbSubjects: ['economy'], keywords: ['balance of payments', 'current account deficit', 'FDI', 'FPI', 'export', 'import', 'trade deficit', 'FTA', 'SEZ', 'forex reserve', 'capital account convertibility'] },
  'banking-finance': { dbSubjects: ['economy'], keywords: ['NPA', 'IBC', 'bank merger', 'NBFC', 'UPI', 'fintech', 'jan dhan', 'microfinance', 'MUDRA', 'insolvency', 'resolution framework', 'shadow banking', 'syndicated'] },

  // Environment
  'biodiversity-conservation': { dbSubjects: ['environment'], keywords: ['biodiversity', 'endemic species', 'CBD', 'nagoya protocol', 'ABS', 'in-situ conservation', 'ex-situ conservation', 'hotspot', 'biosphere', 'ecosystem services'] },
  'protected-areas': { dbSubjects: ['environment'], keywords: ['tiger', 'project tiger', 'tiger reserve', 'national park', 'wildlife sanctuary', 'biosphere reserve', 'UNESCO MAB', 'project elephant', 'snow leopard', 'protected area'] },
  'wetlands-coastal': { dbSubjects: ['environment'], keywords: ['wetland', 'ramsar', 'sundarbans', 'mangrove', 'coral reef', 'seagrass', 'coastal regulation', 'CRZ', 'estuary', 'backwater', 'wetland site'] },
  'forests-india': { dbSubjects: ['environment'], keywords: ['forest cover', 'FSI', 'FRA 2006', 'CAMPA', 'community forest', 'joint forest management', 'forest rights', 'deforestation', 'afforestation', 'compensatory afforestation'] },
  'climate-change': { dbSubjects: ['environment'], keywords: ['climate change', 'greenhouse gas', 'global warming', 'IPCC', 'carbon emission', 'GHG', 'tipping point', 'net zero', '1.5 degree', 'paris agreement', 'NDC', 'carbon credit'] },
  'international-agreements': { dbSubjects: ['environment'], keywords: ['paris agreement', 'UNFCCC', 'kyoto protocol', 'montreal protocol', 'CBD convention', 'CITES', 'stockholm convention', 'rotterdam convention', 'minamata', 'COP', 'IPBES'] },
  'pollution': { dbSubjects: ['environment'], keywords: ['pollution', 'AQI', 'PM 2.5', 'air quality index', 'ganga pollution', 'CPCB', 'NGT', 'e-waste', 'plastic pollution', 'noise pollution', 'water pollution', 'solid waste'] },
  'renewable-energy': { dbSubjects: ['environment', 'science'], keywords: ['solar energy', 'wind energy', 'national solar mission', 'ISA', 'MNRE', 'green hydrogen', 'renewable energy', 'energy transition', 'LIFE mission', 'biofuel', 'battery storage'] },
  'natural-disasters': { dbSubjects: ['environment', 'geography'], keywords: ['earthquake', 'cyclone', 'flood', 'landslide', 'drought', 'tsunami', 'seismic zone', 'NDMA', 'sendai framework', 'volcanic', 'heat wave', 'disaster'] },
  'disaster-management-system': { dbSubjects: ['environment'], keywords: ['NDMA', 'SDMA', 'NDRF', 'disaster management act', 'sendai framework 2015', 'early warning system', 'DM act 2005', 'disaster risk reduction'] },

  // Science & Tech
  'isro-space': { dbSubjects: ['science'], keywords: ['ISRO', 'PSLV', 'GSLV', 'chandrayaan', 'mangalyaan', 'gaganyaan', 'NAVIC', 'satellite mission', 'mars orbiter', 'lunar', 'aditya L1', 'space agency'] },
  'nuclear-technology': { dbSubjects: ['science'], keywords: ['nuclear', 'thorium', 'three stage programme', 'civil nuclear deal', 'NSG', 'NPT', 'CTBT', 'BARC', 'atomic energy', 'nuclear doctrine', 'fast breeder reactor'] },
  'ai-biotech': { dbSubjects: ['science'], keywords: ['artificial intelligence', 'biotechnology', 'GMO', 'CRISPR', 'genome', 'nanotechnology', 'machine learning', 'stem cell', 'gene editing', 'biotech'] },
  'defense-tech': { dbSubjects: ['science'], keywords: ['DRDO', 'HAL', 'brahmos', 'tejas', 'arjun tank', 'defence indigenisation', 'iDEX', 'DAP 2020', 'defense export', 'missile agni', 'prithvi missile'] },
  'cybersecurity': { dbSubjects: ['science'], keywords: ['cyber', 'CERT-In', 'data protection', 'IT act', 'cybersecurity', 'hacking', 'dark web', 'personal data', 'PDPB', 'digital security', 'ransomware'] },
  'internal-security': { dbSubjects: ['science'], keywords: ['naxal', 'naxalism', 'UAPA', 'NIA', 'insurgency', 'terrorism', 'FICN', 'hawala', 'left wing extremism', 'maoist', 'red corridor', 'extremism'] },
  'border-management': { dbSubjects: ['science', 'geography'], keywords: ['LOC', 'LAC', 'siachen', 'border management', 'doklam', 'smart fencing', 'coastal security', 'border village', 'BMS'] },

  // Ethics
  'moral-thinkers': { dbSubjects: ['polity'], keywords: ['ethics', 'kant', 'utilitarianism', 'virtue ethics', 'gandhi philosophy', 'ambedkar ethics', 'moral philosophy', 'deontological', 'consequentialism'] },
  'attitude-aptitude': { dbSubjects: ['polity'], keywords: ['attitude', 'aptitude', 'emotional intelligence', 'EQ', 'empathy', 'compassion', 'moral reasoning', 'values', 'cognition'] },
  'civil-service-values': { dbSubjects: ['polity'], keywords: ['integrity', 'civil servant', 'probity', 'public service', 'impartiality', 'accountability', 'transparency', 'dedication service', 'civil service ethics'] },
  'corruption-ethics': { dbSubjects: ['polity'], keywords: ['corruption', 'probity', 'whistleblower', 'corporate governance', 'conflict of interest', 'bribery', 'anti-corruption measure'] },
  'case-studies': { dbSubjects: ['polity'], keywords: ['dilemma', 'ethical dilemma', 'stakeholder management', 'case study', 'displacement', 'whistle blower', 'officer dilemma', 'civil servant duty'] },

  // Society & Culture
  'classical-arts': { dbSubjects: ['art_culture'], keywords: ['bharatanatyam', 'kathak', 'odissi', 'kuchipudi', 'manipuri', 'mohiniyattam', 'hindustani music', 'carnatic music', 'classical dance', 'classical music', 'folk art'] },
  'temple-architecture': { dbSubjects: ['art_culture', 'history'], keywords: ['nagara style', 'dravida style', 'vesara style', 'shikhara', 'gopuram', 'temple architecture', 'UNESCO heritage', 'ASI', 'architectural style'] },
  'painting-traditions': { dbSubjects: ['art_culture'], keywords: ['madhubani', 'warli', 'pattachitra', 'kalamkari', 'tanjore painting', 'miniature painting', 'folk art', 'bengal school', 'amrita sher-gil', 'painting'] },
  'tribes-diversity': { dbSubjects: ['history'], keywords: ['scheduled tribe', 'tribal', 'PVTG', 'forest rights act', 'PESA', 'northeast tribe', 'adivasi', 'primitive tribal group'] },
  'women-empowerment': { dbSubjects: ['polity', 'history'], keywords: ['women', 'gender', 'sex ratio', 'female infanticide', 'dowry', 'domestic violence', 'POCSO', 'maternity benefit', 'reservation women', 'SHG', 'self help group'] },
  'caste-religion': { dbSubjects: ['polity', 'history'], keywords: ['caste', 'dalit', 'reservation', 'communalism', 'secularism', 'minority rights', 'personal law', 'OBC', 'scheduled caste', 'anti-discrimination'] },
  'urbanisation-migration': { dbSubjects: ['economy', 'geography'], keywords: ['smart city', 'slum', 'PMAY', 'migration', 'urban poverty', 'remittance', 'circular migration', 'megacity', 'urbanisation'] },
}

// ── Fetch all questions ────────────────────────────────────────────────────────

console.log('Fetching all questions from Supabase...')
let allQuestions = []
let from = 0
while (true) {
  const { data, error } = await sb.from('upsc_pyqs')
    .select('id, question, subject, topic, tags, source, year')
    .range(from, from + 999)
  if (error) throw error
  if (!data || data.length === 0) break
  allQuestions.push(...data)
  if (data.length < 1000) break
  from += 1000
}
console.log(`Fetched ${allQuestions.length} questions`)

// ── Score each question against topic keywords ─────────────────────────────────

function scoreQuestion(questionText, subjectValue, keywordEntry) {
  const text = questionText.toLowerCase()
  let score = 0

  // Subject match bonus
  if (keywordEntry.dbSubjects.includes(subjectValue)) score += 5

  // Keyword matches
  for (const kw of keywordEntry.keywords) {
    if (text.includes(kw.toLowerCase())) {
      score += 3
    }
  }

  return score
}

// ── Build topic tags for each question ────────────────────────────────────────

console.log('Computing topic tags for each question...')
const updates = []

for (const q of allQuestions) {
  const topicTags = []

  for (const [topicId, entry] of Object.entries(TOPIC_KEYWORD_MAP)) {
    const score = scoreQuestion(q.question, q.subject, entry)
    if (score >= 8) {  // require subject match (5) + at least 1 keyword match (3)
      topicTags.push(topicId)
    }
  }

  // Always include base tags
  const baseTags = [q.subject, q.topic, 'upsc', 'prelims']
  if (q.year) baseTags.push(String(q.year))

  const newTags = [...new Set([...baseTags.filter(Boolean), ...topicTags])]

  if (JSON.stringify(newTags.sort()) !== JSON.stringify((q.tags || []).sort())) {
    updates.push({ id: q.id, tags: newTags, topicTags })
  }
}

console.log(`Questions needing tag updates: ${updates.length}`)

// Show a sample of what we're setting
const withTopics = updates.filter(u => u.topicTags.length > 0)
console.log(`Questions matched to ≥1 syllabus topic: ${withTopics.length}`)
console.log(`Sample tags:`)
for (const u of withTopics.slice(0, 5)) {
  console.log(`  Q${u.id}: syllabus topics = [${u.topicTags.join(', ')}]`)
}

// ── Batch update ───────────────────────────────────────────────────────────────

console.log('\nUpdating tags in Supabase...')
let updated = 0
const BATCH = 50

for (let i = 0; i < updates.length; i += BATCH) {
  const batch = updates.slice(i, i + BATCH)

  for (const u of batch) {
    const { error } = await sb.from('upsc_pyqs')
      .update({ tags: u.tags })
      .eq('id', u.id)
    if (error) {
      console.error(`  Error updating Q${u.id}:`, error.message)
    } else {
      updated++
    }
  }

  if ((i / BATCH) % 5 === 0 || i + BATCH >= updates.length) {
    console.log(`  Updated ${updated}/${updates.length}`)
  }
}

// ── Report coverage ────────────────────────────────────────────────────────────

console.log('\n📊 Topic Coverage Report:')
const topicCoverage = {}
for (const q of allQuestions) {
  // Re-fetch isn't needed, just use our computed updates
}
// Compute from updates
const allTagMaps = new Map(updates.map(u => [u.id, u.topicTags]))

const topicCounts = {}
for (const [, topicTags] of allTagMaps) {
  for (const t of topicTags) {
    topicCounts[t] = (topicCounts[t] || 0) + 1
  }
}

const allTopicIds = Object.keys(TOPIC_KEYWORD_MAP)
let covered = 0
const missing = []

for (const topicId of allTopicIds) {
  const count = topicCounts[topicId] || 0
  if (count > 0) {
    covered++
  } else {
    missing.push(topicId)
  }
}

console.log(`Covered: ${covered}/${allTopicIds.length} topics`)
console.log(`\nTopics with most questions:`)
Object.entries(topicCounts).sort((a,b) => b[1]-a[1]).slice(0, 15).forEach(([t,c]) => {
  console.log(`  ${t}: ${c}`)
})

if (missing.length > 0) {
  console.log(`\nTopics with 0 matched questions:`)
  missing.forEach(t => console.log(`  - ${t}`))
}

console.log(`\n✅ Done. Updated ${updated} questions with topic tags.`)
