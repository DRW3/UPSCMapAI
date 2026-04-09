/**
 * data/topic-keyword-map.ts
 *
 * Maps every syllabus topic ID → { dbSubjects, keywords }
 * Used by the PYQ retrieval API to match questions to learning journey topics.
 * Keywords are matched against question text (case-insensitive).
 */

export interface TopicKeywordEntry {
  dbSubjects: string[]   // DB subject column values to filter on
  keywords: string[]     // question text must match ≥1 of these
  fallbackSubjects?: string[]  // if 0 results, try these subjects
}

export const TOPIC_KEYWORD_MAP: Record<string, TopicKeywordEntry> = {

  // ── Ancient History ────────────────────────────────────────────────────────

  'prehistoric-india': {
    dbSubjects: ['history'],
    keywords: ['prehistoric', 'palaeolithic', 'mesolithic', 'neolithic', 'chalcolithic',
                'bhimbetka', 'mehrgarh', 'stone age', 'microliths', 'cave painting'],
  },
  'indus-valley': {
    dbSubjects: ['history'],
    keywords: ['indus', 'harappa', 'mohenjo', 'lothal', 'dholavira', 'kalibangan',
                'rakhigarhi', 'harappan', 'bronze age', 'granary', 'great bath'],
  },
  'vedic-age': {
    dbSubjects: ['history'],
    keywords: ['vedic', 'rigveda', 'upanishad', 'varna', 'aryans', 'janapada',
                'brahmin', 'kshatriya', 'samhita', 'brahmana', 'ashrama'],
  },
  'buddhism-jainism': {
    dbSubjects: ['history'],
    keywords: ['buddhism', 'buddhist', 'buddha', 'jainism', 'jain', 'tirthankara',
                'mahavira', 'pali', 'sangha', 'theravada', 'mahayana', 'vajrayana',
                'anekantavada', 'nirvana', 'bodhi', 'tripitaka', 'dhamma'],
  },
  'mahajanapadas': {
    dbSubjects: ['history'],
    keywords: ['mahajanapada', 'magadha', 'licchavi', 'vajji', 'koshala', 'nanda',
                'republic', 'gana sangha', 'pataliputra', 'sixteen'],
  },
  'mauryan-empire': {
    dbSubjects: ['history'],
    keywords: ['maurya', 'chandragupta', 'ashoka', 'kautilya', 'arthashastra',
                'edicts', 'kalinga', 'dhamma', 'pataliputra', 'megasthenes',
                'indica', 'chanakya', 'rock edict', 'pillar edict'],
  },
  'post-mauryan': {
    dbSubjects: ['history'],
    keywords: ['shunga', 'sunga', 'kushana', 'kanishka', 'satavahana', 'indo-greek',
                'gandhara', 'mathura school', 'amaravati', 'yavana', 'satvahana'],
  },
  'gupta-empire': {
    dbSubjects: ['history'],
    keywords: ['gupta', 'samudragupta', 'chandragupta ii', 'vikramaditya', 'nalanda',
                'kalidasa', 'aryabhata', 'iron pillar', 'prayag prashasti', 'fahien'],
  },
  'south-india-ancient': {
    dbSubjects: ['history'],
    keywords: ['pallava', 'chalukya', 'chola', 'pandya', 'sangam', 'mahabalipuram',
                'aihole', 'pattadakal', 'badami', 'brihadeshwara', 'chera'],
  },
  'ancient-art': {
    dbSubjects: ['history', 'art_culture'],
    keywords: ['stupa', 'vihara', 'chaitya', 'cave', 'ajanta', 'ellora', 'rock cut',
                'gandhara art', 'mathura art', 'amaravati', 'sanchi', 'relief sculpture'],
  },
  'ancient-literature-science': {
    dbSubjects: ['history'],
    keywords: ['panini', 'charaka', 'sushruta', 'aryabhata', 'brahmagupta',
                'varahamihira', 'astronomy', 'mathematics', 'ayurveda', 'yoga sutra'],
  },

  // ── Medieval History ───────────────────────────────────────────────────────

  'rajput-kingdoms': {
    dbSubjects: ['history'],
    keywords: ['rajput', 'prithviraj', 'tarain', 'rajasthan', 'tripartite',
                'gurjara', 'pratihara', 'chahamana', 'chandela', 'paramara'],
  },
  'arab-turkish-invasions': {
    dbSubjects: ['history'],
    keywords: ['mahmud ghazni', 'ghazni', 'somnath', 'alberuni', 'qasim',
                'sind', 'ghori', 'muhammad ghori', 'battle of tarain'],
  },
  'chola-maritime': {
    dbSubjects: ['history'],
    keywords: ['chola', 'rajaraja', 'rajendra', 'brihadeshwara', 'naval',
                'southeast asia', 'local self government', 'ur', 'sabha', 'nattar'],
  },
  'slave-dynasty': {
    dbSubjects: ['history'],
    keywords: ['qutb', 'iltutmish', 'raziya', 'balban', 'iqta', 'slave dynasty',
                'mamluk', 'qutub minar', 'delhi sultanate'],
  },
  'khalji-tughlaq': {
    dbSubjects: ['history'],
    keywords: ['alauddin khalji', 'khalji', 'tughlaq', 'muhammad bin tughlaq',
                'firoz shah', 'ibn battuta', 'market reform', 'capital transfer',
                'mongol', 'mongols'],
  },
  'vijayanagara-bahmani': {
    dbSubjects: ['history'],
    keywords: ['vijayanagara', 'krishnadevaraya', 'talikota', 'bahmani',
                'hampi', 'deccan sultanate', 'bahmanid'],
  },
  'lodi-dynasty': {
    dbSubjects: ['history'],
    keywords: ['lodi', 'sayyid', 'ibrahim lodi', 'panipat 1526', 'first battle panipat'],
  },
  'babur-humayun': {
    dbSubjects: ['history'],
    keywords: ['babur', 'humayun', 'baburnama', 'khanwa', 'sher shah', 'sur dynasty',
                'grand trunk road', 'rupiah', 'shergarh'],
  },
  'akbar': {
    dbSubjects: ['history'],
    keywords: ['akbar', 'mansabdari', 'din-i-ilahi', 'ibadat khana', 'fatehpur sikri',
                'abul fazl', 'todar mal', 'birbal', 'rajput policy'],
  },
  'jahangir-shahjahan': {
    dbSubjects: ['history'],
    keywords: ['jahangir', 'noor jahan', 'shah jahan', 'taj mahal', 'red fort',
                'tuzuk', 'peacock throne', 'mumtaz', 'mughals'],
  },
  'aurangzeb': {
    dbSubjects: ['history'],
    keywords: ['aurangzeb', 'jizya', 'shivaji', 'maratha', 'deccan policy',
                'mughal decline', 'sambhaji', 'zulfikar ali'],
  },
  'mughal-culture': {
    dbSubjects: ['history', 'art_culture'],
    keywords: ['mughal miniature', 'urdu', 'char bagh', 'pietra dura', 'persian',
                'mughal architecture', 'akbarnama', 'ain-i-akbari'],
  },
  'bhakti-movement': {
    dbSubjects: ['history'],
    keywords: ['bhakti', 'alvars', 'nayanars', 'ramanuja', 'kabir', 'mirabai',
                'tukaram', 'chaitanya', 'namdev', 'shankaracharya', 'advaita',
                'saguna', 'nirguna', 'sant'],
  },
  'sufi-movement': {
    dbSubjects: ['history'],
    keywords: ['sufi', 'chishti', 'suhrawardi', 'qadiri', 'nizamuddin', 'amir khusrau',
                'khanqah', 'silsila', 'dargah', 'mysticism'],
  },
  'maratha-empire': {
    dbSubjects: ['history'],
    keywords: ['maratha', 'shivaji', 'ashtapradhan', 'peshwa', 'third battle panipat',
                'maratha confederacy', 'guerrilla', 'chauth', 'sardeshmukhi'],
  },

  // ── Modern History ─────────────────────────────────────────────────────────

  'european-trade': {
    dbSubjects: ['history'],
    keywords: ['portuguese', 'dutch', 'french east india', 'carnatic wars',
                'vasco da gama', 'east india company', 'factory', 'surat'],
  },
  'battle-plassey-buxar': {
    dbSubjects: ['history'],
    keywords: ['plassey', 'buxar', 'siraj', 'clive', 'mir jafar', 'dual government',
                'diwani', 'nawab', 'battle of plassey', 'battle of buxar'],
  },
  'british-expansion': {
    dbSubjects: ['history'],
    keywords: ['subsidiary alliance', 'doctrine of lapse', 'tipu sultan',
                'mysore war', 'maratha war', 'ranjit singh', 'sikh war',
                'wellesley', 'cornwallis', 'hastings'],
  },
  'colonial-economy-impact': {
    dbSubjects: ['history'],
    keywords: ['drain of wealth', 'dadabhai naoroji', 'zamindari', 'ryotwari',
                'indigo revolt', 'opium', 'de-industrialisation', 'permanent settlement',
                'mahalwari'],
  },
  'socioreligious-reforms': {
    dbSubjects: ['history'],
    keywords: ['brahmo samaj', 'ram mohan roy', 'arya samaj', 'dayananda',
                'ramakrishna', 'vivekananda', 'prarthana samaj', 'aligarh',
                'sati abolition', 'widow remarriage', 'reform movement'],
  },
  'revolt-1857': {
    dbSubjects: ['history'],
    keywords: ['revolt 1857', 'sepoy mutiny', 'bahadur shah', 'rani lakshmibai',
                'nana sahib', 'tantia tope', 'mangal pandey', '1857'],
  },
  'early-nationalism': {
    dbSubjects: ['history'],
    keywords: ['indian national congress', 'INC', 'hume', 'moderate', 'extremist',
                'tilak', 'partition bengal', 'swadeshi', 'lal bal pal', 'gokhale'],
  },
  'gandhian-era': {
    dbSubjects: ['history'],
    keywords: ['gandhi', 'satyagraha', 'champaran', 'non-cooperation', 'civil disobedience',
                'dandi', 'quit india', 'INA', 'subhas bose', 'khilafat', 'rowlatt'],
  },
  'revolutionary-movements': {
    dbSubjects: ['history'],
    keywords: ['bhagat singh', 'chandrashekhar azad', 'ghadar party', 'anushilan',
                'revolutionary', 'bomb', 'sukhdev', 'rajguru', 'kakori'],
  },
  'constitutional-developments': {
    dbSubjects: ['history', 'polity'],
    keywords: ['regulating act', "pitt's india act", 'government of india act',
                'morley minto', 'dyarchy', 'communal award', 'cripps mission',
                'montagu chelmsford', '1909', '1919', '1935'],
  },
  'independence-partition': {
    dbSubjects: ['history'],
    keywords: ['partition', 'mountbatten', 'radcliffe', 'cabinet mission',
                'princely states', 'sardar patel', 'integration', 'refugee'],
  },

  // ── Geography ─────────────────────────────────────────────────────────────

  'himalayas': {
    dbSubjects: ['geography'],
    keywords: ['himalaya', 'himalayan', 'karakoram', 'siwalik', 'lesser himalaya',
                'greater himalaya', 'nanda devi', 'k2', 'pass', 'glacier', 'zoji la',
                'rohtang', 'nathu la'],
  },
  'deccan-plateau': {
    dbSubjects: ['geography'],
    keywords: ['deccan', 'western ghats', 'eastern ghats', 'vindhya', 'satpura',
                'aravalli', 'deccan trap', 'rain shadow', 'ghats'],
  },
  'northern-plains': {
    dbSubjects: ['geography'],
    keywords: ['gangetic plain', 'doab', 'bhangar', 'khadar', 'terai', 'thar desert',
                'rann of kutch', 'northern plains', 'indo-gangetic'],
  },
  'rivers-drainage': {
    dbSubjects: ['geography'],
    keywords: ['river', 'ganga', 'brahmaputra', 'indus', 'godavari', 'krishna',
                'kaveri', 'yamuna', 'Son', 'chambal', 'narmada', 'tapti',
                'drainage', 'tributary', 'inter-linking'],
  },
  'climate-india': {
    dbSubjects: ['geography'],
    keywords: ['monsoon', 'ITCZ', 'el nino', 'la nina', 'western disturbance',
                'loo', 'northeast monsoon', 'southwest monsoon', 'mawsynram',
                'koppen', 'rainfall', 'cyclone'],
  },
  'soils-vegetation': {
    dbSubjects: ['geography'],
    keywords: ['alluvial soil', 'black soil', 'regur', 'laterite', 'red soil',
                'forest type', 'mangrove', 'tropical evergreen', 'deciduous',
                'soil erosion', 'vegetation'],
  },
  'islands-india': {
    dbSubjects: ['geography'],
    keywords: ['andaman', 'nicobar', 'lakshadweep', 'coral reef', 'island',
                'exclusive economic zone', 'EEZ', 'great nicobar'],
  },
  'agriculture-geo': {
    dbSubjects: ['geography', 'economy'],
    keywords: ['kharif', 'rabi', 'green revolution', 'cropping pattern',
                'horticulture', 'crop', 'agriculture zone', 'irrigation'],
  },
  'minerals-resources': {
    dbSubjects: ['geography'],
    keywords: ['iron ore', 'coal', 'bauxite', 'petroleum', 'mineral',
                'damodar', 'jharkhand mineral', 'rare earth', 'lignite',
                'copper', 'manganese', 'mica'],
  },
  'industries-transport': {
    dbSubjects: ['geography'],
    keywords: ['steel plant', 'textile', 'SEZ', 'special economic zone',
                'golden quadrilateral', 'freight corridor', 'port',
                'DMIC', 'industrial corridor'],
  },
  'population-urbanisation': {
    dbSubjects: ['geography'],
    keywords: ['census', 'population density', 'sex ratio', 'literacy rate',
                'urbanisation', 'migration', 'demographic dividend'],
  },
  'world-physical': {
    dbSubjects: ['geography'],
    keywords: ['andes', 'rocky mountains', 'alps', 'rift valley', 'fold mountain',
                'shield', 'plateau', 'ocean trench', 'continent'],
  },
  'ocean-currents': {
    dbSubjects: ['geography'],
    keywords: ['ocean current', 'gulf stream', 'humboldt', 'el nino', 'la nina',
                'thermohaline', 'gyre', 'upwelling', 'ITCZ'],
  },
  'world-climate-zones': {
    dbSubjects: ['geography'],
    keywords: ['tropical rainforest', 'savanna', 'mediterranean', 'temperate',
                'taiga', 'tundra', 'boreal', 'steppe', 'koppen', 'climate zone'],
  },
  'geopolitical-resources': {
    dbSubjects: ['geography'],
    keywords: ['OPEC', 'persian gulf', 'rare earth', 'arctic', 'chokepoint',
                'strait', 'malacca', 'hormuz', 'suez', 'resource war'],
  },

  // ── Polity ─────────────────────────────────────────────────────────────────

  'making-constitution': {
    dbSubjects: ['polity'],
    keywords: ['constituent assembly', 'ambedkar', 'objectives resolution',
                'constituent assembly debates', 'constitution making',
                'rajendra prasad', 'drafting committee'],
  },
  'fundamental-rights': {
    dbSubjects: ['polity'],
    keywords: ['fundamental right', 'article 12', 'article 13', 'article 14',
                'article 19', 'article 21', 'article 32', 'writ', 'habeas corpus',
                'mandamus', 'prohibition', 'certiorari', 'equality', 'freedom'],
  },
  'dpsp-duties': {
    dbSubjects: ['polity'],
    keywords: ['directive principle', 'DPSP', 'article 36', 'article 51a',
                'fundamental duties', 'gandhian principle', 'socialist',
                'article 44', 'uniform civil code'],
  },
  'federal-structure': {
    dbSubjects: ['polity'],
    keywords: ['union list', 'state list', 'concurrent list', 'residuary',
                'seventh schedule', 'federal', 'centre-state',
                'governor', 'article 356', 'president rule'],
  },
  'amendments': {
    dbSubjects: ['polity'],
    keywords: ['article 368', 'amendment', '42nd amendment', '44th amendment',
                '73rd amendment', '74th amendment', 'basic structure',
                'kesavananda', 'constitution amendment'],
  },
  'parliament': {
    dbSubjects: ['polity'],
    keywords: ['lok sabha', 'rajya sabha', 'parliament', 'money bill',
                'joint session', 'speaker', 'anti-defection', 'question hour',
                'zero hour', 'budget', 'prorogation'],
  },
  'executive': {
    dbSubjects: ['polity'],
    keywords: ['president', 'prime minister', 'cabinet', 'council of ministers',
                'ordinance', 'collective responsibility', 'dissolution',
                'article 74', 'article 75', 'prorogation'],
  },
  'judiciary': {
    dbSubjects: ['polity'],
    keywords: ['supreme court', 'high court', 'judicial review', 'PIL',
                'article 32', 'article 226', 'original jurisdiction',
                'appellate', 'advisory opinion', 'independence judiciary'],
  },
  'state-government': {
    dbSubjects: ['polity'],
    keywords: ['governor', 'chief minister', 'vidhan sabha', 'vidhan parishad',
                'state legislature', 'article 356', "governor's discretion"],
  },
  'local-government': {
    dbSubjects: ['polity'],
    keywords: ['panchayat', 'municipality', 'gram sabha', '73rd amendment',
                '74th amendment', 'three tier', 'nagar panchayat',
                'PESA', 'fifth schedule', 'tribal area', 'municipal corporation'],
  },
  'civil-services': {
    dbSubjects: ['polity'],
    keywords: ['civil service', 'IAS', 'IPS', 'UPSC', 'all india service',
                'lateral entry', 'administrative reform'],
  },
  'rti-egovernance': {
    dbSubjects: ['polity'],
    keywords: ['RTI', 'right to information', 'e-governance', 'digital india',
                'information commission', 'Jan Dhan', 'aadhaar', 'transparency'],
  },
  'anticorruption': {
    dbSubjects: ['polity'],
    keywords: ['lokpal', 'lokayukta', 'CAG', 'CVC', 'CBI',
                'anticorruption', 'whistleblower', 'vigilance',
                'prevention of corruption'],
  },
  'india-neighborhood': {
    dbSubjects: ['polity'],
    keywords: ['pakistan', 'china', 'bangladesh', 'nepal', 'bhutan',
                'sri lanka', 'SAARC', 'LAC', 'myanmar', 'neighbourhood',
                'BIMSTEC'],
  },
  'india-major-powers': {
    dbSubjects: ['polity'],
    keywords: ['india-us', 'quad', 'india-russia', 'S-400', 'india-china',
                'doklam', 'galwan', 'india-eu', 'BRICS', 'SCO', 'nuclear deal'],
  },
  'multilateral-bodies': {
    dbSubjects: ['polity'],
    keywords: ['united nations', 'UNSC', 'security council', 'IMF',
                'world bank', 'WTO', 'G20', 'G7', 'commonwealth',
                'permanent member', 'veto'],
  },
  'regional-groupings': {
    dbSubjects: ['polity'],
    keywords: ['ASEAN', 'RCEP', 'BRICS', 'SCO', 'SAARC', 'belt and road',
                'BRI', 'QUAD', 'AUKUS', 'IORA', 'regional group'],
  },

  // ── Economy ────────────────────────────────────────────────────────────────

  'planning-development': {
    dbSubjects: ['economy'],
    keywords: ['five year plan', 'NITI aayog', 'planning commission',
                'HDI', 'GDP', 'economic growth', 'development', 'aspirational'],
  },
  'fiscal-monetary': {
    dbSubjects: ['economy'],
    keywords: ['RBI', 'repo rate', 'CRR', 'SLR', 'monetary policy',
                'fiscal deficit', 'FRBM', 'GST', 'tax', 'inflation',
                'monetary policy committee', 'LAF', 'open market'],
  },
  'poverty-inequality': {
    dbSubjects: ['economy'],
    keywords: ['poverty', 'poverty line', 'MGNREGA', 'unemployment',
                'informal sector', 'gini', 'inequality', 'inclusive growth',
                'tendulkar', 'SECC', 'below poverty'],
  },
  'agriculture-economy': {
    dbSubjects: ['economy'],
    keywords: ['MSP', 'minimum support price', 'FCI', 'PDS', 'APMC',
                'PM-KISAN', 'crop insurance', 'PM fasal bima',
                'land reform', 'agricultural', 'food security'],
  },
  'infrastructure': {
    dbSubjects: ['economy'],
    keywords: ['gati shakti', 'sagarmala', 'UDAN', 'freight corridor',
                'smart city', 'NIP', 'national infrastructure', 'PMAY',
                'dedicated freight', 'highway'],
  },
  'external-sector': {
    dbSubjects: ['economy'],
    keywords: ['balance of payments', 'BOP', 'current account', 'FDI',
                'FPI', 'export', 'import', 'trade deficit', 'FTA',
                'SEZ', 'rupee', 'forex', 'capital account'],
  },
  'banking-finance': {
    dbSubjects: ['economy'],
    keywords: ['NPA', 'IBC', 'bank', 'NBFC', 'UPI', 'fintech',
                'jan dhan', 'microfinance', 'MUDRA', 'insolvency',
                'NPR', 'resolution', 'shadow banking'],
  },

  // ── Environment ────────────────────────────────────────────────────────────

  'biodiversity-conservation': {
    dbSubjects: ['environment'],
    keywords: ['biodiversity', 'endemic', 'CBD', 'nagoya protocol', 'ABS',
                'in-situ', 'ex-situ', 'hotspot', 'species diversity',
                'conservation', 'ecosystem'],
  },
  'protected-areas': {
    dbSubjects: ['environment'],
    keywords: ['tiger', 'project tiger', 'tiger reserve', 'national park',
                'wildlife sanctuary', 'biosphere reserve', 'UNESCO MAB',
                'project elephant', 'snow leopard', 'protected area'],
  },
  'wetlands-coastal': {
    dbSubjects: ['environment'],
    keywords: ['wetland', 'ramsar', 'sundarbans', 'mangrove', 'coral reef',
                'seagrass', 'coastal regulation', 'CRZ', 'marine',
                'estuary', 'backwater'],
  },
  'forests-india': {
    dbSubjects: ['environment'],
    keywords: ['forest', 'FSI', 'FRA', 'CAMPA', 'community forest',
                'joint forest management', 'forest rights', 'deforestation',
                'afforestation', 'compensatory'],
  },
  'climate-change': {
    dbSubjects: ['environment'],
    keywords: ['climate change', 'greenhouse', 'global warming', 'IPCC',
                'carbon', 'GHG', 'emission', 'tipping point', 'net zero',
                '1.5 degree', 'paris agreement', 'NDC'],
  },
  'international-agreements': {
    dbSubjects: ['environment'],
    keywords: ['paris agreement', 'UNFCCC', 'kyoto protocol', 'montreal protocol',
                'CBD', 'CITES', 'stockholm', 'rotterdam', 'minamata',
                'environmental convention', 'COP'],
  },
  'pollution': {
    dbSubjects: ['environment'],
    keywords: ['pollution', 'AQI', 'PM 2.5', 'air quality', 'ganga',
                'CPCB', 'NGT', 'e-waste', 'plastic', 'noise',
                'water pollution', 'soil pollution'],
  },
  'renewable-energy': {
    dbSubjects: ['environment', 'science'],
    keywords: ['solar', 'wind energy', 'national solar mission', 'ISA',
                'MNRE', 'green hydrogen', 'renewable', 'energy transition',
                'LIFE', 'biofuel', 'battery storage'],
  },
  'natural-disasters': {
    dbSubjects: ['environment', 'geography'],
    keywords: ['earthquake', 'cyclone', 'flood', 'landslide', 'drought',
                'tsunami', 'disaster', 'seismic', 'NDMA', 'sendai',
                'volcanic', 'heat wave'],
  },
  'disaster-management-system': {
    dbSubjects: ['environment'],
    keywords: ['NDMA', 'SDMA', 'NDRF', 'disaster management act',
                'sendai framework', 'early warning', 'community disaster',
                'DM act 2005', 'disaster risk reduction'],
  },

  // ── Science & Technology ───────────────────────────────────────────────────

  'isro-space': {
    dbSubjects: ['science'],
    keywords: ['ISRO', 'PSLV', 'GSLV', 'chandrayaan', 'mangalyaan',
                'gaganyaan', 'NAVIC', 'satellite', 'space mission',
                'mars orbiter', 'lunar', 'aditya L1'],
  },
  'nuclear-technology': {
    dbSubjects: ['science'],
    keywords: ['nuclear', 'thorium', 'three stage', 'civil nuclear deal',
                'NSG', 'NPT', 'CTBT', 'BARC', 'atomic energy',
                'nuclear doctrine', 'fast breeder'],
  },
  'ai-biotech': {
    dbSubjects: ['science'],
    keywords: ['artificial intelligence', 'biotechnology', 'GMO', 'CRISPR',
                'genome', 'nanotechnology', 'machine learning', 'data',
                'stem cell', 'gene editing'],
  },
  'defense-tech': {
    dbSubjects: ['science'],
    keywords: ['DRDO', 'HAL', 'brahmos', 'tejas', 'arjun', 'defence',
                'indigenisation', 'iDEX', 'DAP', 'defense export',
                'missile', 'agni', 'prithvi'],
  },
  'cybersecurity': {
    dbSubjects: ['science'],
    keywords: ['cyber', 'CERT-In', 'data protection', 'IT act',
                'cybersecurity', 'hacking', 'malware', 'dark web',
                'personal data', 'PDPB', 'digital security'],
  },
  'internal-security': {
    dbSubjects: ['science'],
    keywords: ['naxal', 'naxalism', 'UAPA', 'NIA', 'insurgency',
                'terrorism', 'FICN', 'hawala', 'left wing extremism',
                'maoist', 'red corridor'],
  },
  'border-management': {
    dbSubjects: ['science', 'geography'],
    keywords: ['LOC', 'LAC', 'siachen', 'border', 'doklam', 'fencing',
                'coastal security', 'border village', 'smart fencing'],
  },

  // ── Ethics (GS-IV) ─────────────────────────────────────────────────────────

  'moral-thinkers': {
    dbSubjects: ['polity'],
    keywords: ['ethics', 'kant', 'utilitarianism', 'virtue', 'gandhi',
                'ambedkar', 'moral philosophy', 'deontological', 'consequentialism'],
  },
  'attitude-aptitude': {
    dbSubjects: ['polity'],
    keywords: ['attitude', 'aptitude', 'emotional intelligence', 'EQ',
                'empathy', 'compassion', 'moral reasoning', 'values'],
  },
  'civil-service-values': {
    dbSubjects: ['polity'],
    keywords: ['integrity', 'civil servant', 'probity', 'public service',
                'impartiality', 'accountability', 'transparency',
                'dedication', 'service delivery'],
  },
  'corruption-ethics': {
    dbSubjects: ['polity'],
    keywords: ['corruption', 'probity', 'whistleblower', 'corporate governance',
                'conflict of interest', 'bribery', 'anti-corruption'],
  },
  'case-studies': {
    dbSubjects: ['polity'],
    keywords: ['dilemma', 'ethical dilemma', 'stakeholder', 'case study',
                'displacement', 'whistle blower', 'officer', 'civil servant'],
  },

  // ── Society & Culture ──────────────────────────────────────────────────────

  'classical-arts': {
    dbSubjects: ['art_culture'],
    keywords: ['bharatanatyam', 'kathak', 'odissi', 'kuchipudi', 'manipuri',
                'mohiniyattam', 'hindustani', 'carnatic', 'classical dance',
                'classical music', 'folk'],
  },
  'temple-architecture': {
    dbSubjects: ['art_culture', 'history'],
    keywords: ['nagara', 'dravida', 'vesara', 'shikhara', 'gopuram',
                'temple', 'UNESCO', 'heritage', 'ASI', 'architecture'],
  },
  'painting-traditions': {
    dbSubjects: ['art_culture'],
    keywords: ['madhubani', 'warli', 'pattachitra', 'kalamkari', 'tanjore',
                'miniature painting', 'folk art', 'bengal school', 'painting'],
  },
  'tribes-diversity': {
    dbSubjects: ['history'],
    keywords: ['scheduled tribe', 'tribal', 'PVTG', 'forest rights', 'PESA',
                'northeast tribe', 'adivasi', 'van gujjar', 'primitive'],
  },
  'women-empowerment': {
    dbSubjects: ['polity', 'history'],
    keywords: ['women', 'gender', 'sex ratio', 'female', 'dowry',
                'domestic violence', 'POCSO', 'maternity', 'reservation women',
                'SHG', 'self help group'],
  },
  'caste-religion': {
    dbSubjects: ['polity', 'history'],
    keywords: ['caste', 'dalit', 'reservation', 'communalism', 'secularism',
                'minority', 'personal law', 'OBC', 'scheduled caste'],
  },
  'urbanisation-migration': {
    dbSubjects: ['economy', 'geography'],
    keywords: ['smart city', 'slum', 'PMAY', 'migration', 'urban',
                'remittance', 'circular migration', 'megacity', 'urbanisation'],
  },

  // ── New Topics (added for complete syllabus coverage) ────────────────────

  'ajivika-charvaka': {
    dbSubjects: ['history'],
    keywords: ['ajivika', 'makkhali gosala', 'lokayata', 'charvaka', 'materialism', 'determinism'],
  },
  'sangam-age': {
    dbSubjects: ['history'],
    keywords: ['sangam literature', 'tolkappiyam', 'silappadikaram', 'manimekalai', 'tamil kingdoms', 'roman trade', 'muziri', 'arikamedu', 'poompuhar'],
  },
  'harsha-pushyabhuti': {
    dbSubjects: ['history'],
    keywords: ['harsha', 'pushyabhuti dynasty', 'hieun tsang', 'kannauj', 'banabhatta', 'harshacharita', 'nalanda under harsha'],
  },
  'vakatakas': {
    dbSubjects: ['history'],
    keywords: ['vakataka dynasty', 'pravarasena', 'ajanta patronage', 'deccan politics'],
  },
  'rashtrakutas': {
    dbSubjects: ['history'],
    keywords: ['rashtrakutas', 'amoghavarsha', 'kailasa temple ellora', 'dantidurga', 'tripartite struggle'],
  },
  'ancient-coinage': {
    dbSubjects: ['history'],
    keywords: ['punch-marked coins', 'indo-greek coins', 'kushana gold coins', 'gupta coins', 'satavahana coins', 'roman coins in india', 'numismatics'],
  },
  'ancient-inscriptions': {
    dbSubjects: ['history'],
    keywords: ['ashokan edicts', 'allahabad pillar inscription', 'hathigumpha', 'nasik inscription', 'aihole inscription', 'junagarh rock inscription', 'brahmi script', 'kharosthi'],
  },
  'sultanate-administration': {
    dbSubjects: ['history'],
    keywords: ['iqta system', 'diwan-i-arz', 'diwan-i-risalat', 'muqti', 'wazir', 'military administration', 'judicial system', 'revenue system'],
  },
  'sultanate-architecture': {
    dbSubjects: ['history'],
    keywords: ['qutub minar', 'alai darwaza', 'tughluqabad', 'begumpuri mosque', 'true arch', 'dome', 'arabesque', 'calligraphy', 'indo-islamic synthesis'],
  },
  'sher-shah-suri': {
    dbSubjects: ['history'],
    keywords: ['sher shah suri', 'land revenue system', 'grand trunk road', 'rupiya coin', 'caravanserais', 'provincial administration', 'sasaram tomb'],
  },
  'mughal-administration': {
    dbSubjects: ['history'],
    keywords: ['mansabdari system', 'zat and sawar', 'jagirdari system', 'todar mal revenue', 'zabti system', 'dahsala', 'subahs', 'faujdar', 'kotwal', 'qazi'],
  },
  'sikhism-gurus': {
    dbSubjects: ['history'],
    keywords: ['guru nanak', 'guru angad', 'guru arjan', 'adi granth', 'guru hargobind', 'guru tegh bahadur', 'guru gobind singh', 'khalsa', 'golden temple'],
  },
  'provincial-dynasties': {
    dbSubjects: ['history'],
    keywords: ['ahoms of assam', 'kakatiyas of warangal', 'hoysalas of dwarasamudra', 'gajapatis of odisha', 'eastern gangas', 'provincial independence'],
  },
  'medieval-society-economy': {
    dbSubjects: ['history'],
    keywords: ['guild system', 'trade routes', 'indian ocean trade', 'horse trade', 'textile exports', 'position of women', 'caste in medieval india', 'slavery', 'coins and currency'],
  },
  'medieval-literature': {
    dbSubjects: ['history'],
    keywords: ['persian literature', 'urdu emergence', 'bhakti literature vernacular', 'amir khusrau', 'tulsidas', 'surdas', 'regional languages growth', 'barani', 'abul fazl', 'ain-i-akbari'],
  },
  'deccan-sultanates-detail': {
    dbSubjects: ['history'],
    keywords: ['adil shahi', 'qutb shahi', 'nizam shahi', 'gol gumbaz', 'charminar', 'deccan painting', 'deccani culture'],
  },
  'anglo-mysore-wars': {
    dbSubjects: ['history'],
    keywords: ['hyder ali', 'tipu sultan', 'four mysore wars', 'treaty of mangalore', 'treaty of seringapatam', 'rocket technology', 'tipu\'s reforms', 'fall of seringapatam 1799'],
  },
  'anglo-maratha-wars': {
    dbSubjects: ['history'],
    keywords: ['treaty of surat', 'treaty of salbai', 'treaty of bassein', 'three anglo-maratha wars', 'maratha confederacy collapse', 'peshwa baji rao ii'],
  },
  'anglo-sikh-wars': {
    dbSubjects: ['history'],
    keywords: ['maharaja ranjit singh', 'sikh empire', 'treaty of lahore', 'dalip singh', 'annexation of punjab', 'duleep singh kohinoor'],
  },
  'british-land-revenue': {
    dbSubjects: ['history'],
    keywords: ['permanent settlement 1793', 'cornwallis', 'ryotwari thomas munro', 'mahalwari', 'zamindars', 'ryots', 'revenue collection', 'impact on peasants'],
  },
  'south-west-reforms': {
    dbSubjects: ['history'],
    keywords: ['jyotiba phule', 'savitribai phule', 'narayana guru', 'periyar', 'self-respect movement', 'sndp yogam', 'ayyankali', 'kandukuri veeresalingam', 'widow remarriage association'],
  },
  'peasant-tribal-movements': {
    dbSubjects: ['history'],
    keywords: ['santhal rebellion 1855', 'munda ulgulan', 'birsa munda', 'indigo revolt 1859', 'deccan riots 1875', 'moplah rebellion', 'tana bhagat', 'rampa rebellion', 'kol rebellion', 'santal hul'],
  },
  'working-class-movements': {
    dbSubjects: ['history'],
    keywords: ['aituc 1920', 'bombay textile strike', 'girni kamgar union', 'n m joshi', 'b p wadia', 'trade union act 1926', 'labour movements'],
  },
  'left-wing-politics': {
    dbSubjects: ['history'],
    keywords: ['communist party of india', 'congress socialist party', 'kisan sabha', 'telangana movement', 'tebhaga movement', 'punnapra vayalar', 'ems namboodiripad', 'muzaffar ahmad'],
  },
  'communalism-two-nation': {
    dbSubjects: ['history'],
    keywords: ['muslim league 1906', 'two-nation theory', 'jinnah', 'lahore resolution 1940', 'hindu mahasabha', 'rss', 'direct action day', 'communal politics evolution'],
  },
  'press-education-national': {
    dbSubjects: ['history'],
    keywords: ['vernacular press', 'indian press act', 'amrit bazar patrika', 'kesari', 'the hindu', 'young india', 'harijan', 'indian universities', 'wood\'s despatch', 'hunter commission'],
  },
  'women-freedom-struggle': {
    dbSubjects: ['history'],
    keywords: ['sarojini naidu', 'aruna asaf ali', 'kasturba gandhi', 'annie besant', 'captain lakshmi sahgal', 'kamala nehru', 'begum hazrat mahal', 'pandita ramabai', 'rani gaidinliu'],
  },
  'nehru-era': {
    dbSubjects: ['history', 'polity'],
    keywords: ['nation-building', 'nehru vision', 'mixed economy', 'secularism', 'democratic socialism', 'scientific temper', 'iits iims', 'bhakra nangal', 'temples of modern india'],
  },
  'princely-states-integration': {
    dbSubjects: ['history', 'polity'],
    keywords: ['instrument of accession', 'operation polo hyderabad', 'junagadh referendum', 'kashmir accession', 'sardar patel', 'vp menon', '565 princely states', 'travancore'],
  },
  'states-reorganization': {
    dbSubjects: ['history', 'polity'],
    keywords: ['dhar commission', 'jvp committee', 'potti sriramulu', 'src 1953', 'states reorganisation act 1956', 'linguistic states', 'andhra pradesh formation', 'later bifurcations'],
  },
  'land-reforms-post-47': {
    dbSubjects: ['history', 'polity'],
    keywords: ['zamindari abolition', 'tenancy reforms', 'land ceiling', 'bhoodan movement', 'vinoba bhave', 'cooperative farming', 'impact assessment', 'unfinished agenda'],
  },
  'five-year-plans-history': {
    dbSubjects: ['history', 'polity'],
    keywords: ['mahalanobis model', 'first to twelfth plans', 'plan holidays', 'rolling plans', 'gadgil formula', 'niti aayog 2015', 'indicative planning', 'public sector dominance'],
  },
  'green-white-revolution': {
    dbSubjects: ['history', 'polity'],
    keywords: ['ms swaminathan', 'norman borlaug', 'hyv seeds', 'punjab haryana', 'verghese kurien', 'operation flood', 'amul', 'blue revolution', 'yellow revolution'],
  },
  'foreign-policy-nam': {
    dbSubjects: ['history', 'polity'],
    keywords: ['non-aligned movement', 'panchsheel 1954', 'bandung conference 1955', 'nehru foreign policy', 'strategic autonomy', 'afro-asian solidarity', 'tito nasser nehru'],
  },
  'indo-pak-wars': {
    dbSubjects: ['history', 'polity'],
    keywords: ['kashmir war 1947', 'tashkent declaration', '1965 war', '1971 war', 'bangladesh liberation', 'shimla agreement', 'mukti bahini', 'sam manekshaw'],
  },
  'indo-china-1962': {
    dbSubjects: ['history', 'polity'],
    keywords: ['mcmahon line', 'aksai chin', 'nefa', 'forward policy', 'chinese aggression 1962', 'henderson brooks report', 'aftermath', 'border disputes'],
  },
  'emergency-1975': {
    dbSubjects: ['history', 'polity'],
    keywords: ['allahabad hc verdict', 'article 352', 'fundamental rights suspension', 'press censorship', 'forced sterilization', 'shah commission', 'janata party', '42nd amendment'],
  },
  'liberalization-1991': {
    dbSubjects: ['history', 'polity'],
    keywords: ['balance of payments crisis', 'manmohan singh', 'pv narasimha rao', 'lpg reforms', 'gatt uruguay round', 'disinvestment', 'license raj end', 'fdi opening', 'wto membership'],
  },
  'nuclear-tests': {
    dbSubjects: ['history', 'polity'],
    keywords: ['smiling buddha 1974', 'pokhran ii 1998', 'nuclear doctrine', 'no first use', 'homi bhabha', 'apj abdul kalam', 'sanctions aftermath', 'india-us nuclear deal 2008'],
  },
  'kashmir-issue-evolution': {
    dbSubjects: ['history', 'polity'],
    keywords: ['instrument of accession', 'article 370', 'un resolutions', 'shimla agreement', 'insurgency 1989', 'kargil 1999', 'article 370 abrogation 2019', 'delimitation'],
  },
  'northeast-insurgency': {
    dbSubjects: ['history', 'polity'],
    keywords: ['naga issue', 'afspa', 'shillong accord', 'assam accord 1985', 'ulfa', 'mizo accord 1986', 'bodo accord', 'nrc', 'manipur unrest', 'look east/act east'],
  },
  'punjab-crisis': {
    dbSubjects: ['history', 'polity'],
    keywords: ['akali dal', 'anandpur sahib resolution', 'bhindranwale', 'operation bluestar 1984', 'anti-sikh riots', 'punjab militancy', 'rajiv-longowal accord'],
  },
  'mandal-commission': {
    dbSubjects: ['history', 'polity'],
    keywords: ['mandal commission 1980', '27% obc reservation', 'v p singh', 'indra sawhney case 1992', 'creamy layer', 'ews reservation 2019', '103rd amendment', 'social justice debate'],
  },
  'coalition-era': {
    dbSubjects: ['history', 'polity'],
    keywords: ['end of congress dominance', 'vp singh government', 'babri masjid demolition 1992', 'upa i ii', 'nda', 'coalition dharma', 'regional parties rise', 'anti-defection', 'hung parliaments'],
  },
  'renaissance-reformation': {
    dbSubjects: ['history'],
    keywords: ['renaissance', 'humanism', 'martin luther', 'protestant reformation', 'counter reformation', 'enlightenment', 'voltaire', 'rousseau', 'locke', 'scientific revolution'],
  },
  'american-revolution': {
    dbSubjects: ['history'],
    keywords: ['american independence 1776', 'boston tea party', 'declaration of independence', 'us constitution', 'bill of rights', 'federalism', 'republican government', 'monroe doctrine'],
  },
  'french-revolution': {
    dbSubjects: ['history'],
    keywords: ['estates general', 'bastille', 'declaration of rights of man', 'jacobins', 'reign of terror', 'napoleon', 'code napoleon', 'impact on world', 'liberty equality fraternity'],
  },
  'industrial-revolution': {
    dbSubjects: ['history'],
    keywords: ['textile industry', 'steam engine', 'factory system', 'urbanization', 'labour conditions', 'luddites', 'chartism', 'second industrial revolution', 'social changes', 'capitalism growth'],
  },
  'nationalism-europe': {
    dbSubjects: ['history'],
    keywords: ['congress of vienna', 'metternich', '1848 revolutions', 'bismarck', 'german unification', 'garibaldi', 'mazzini', 'cavour', 'italian unification', 'blood and iron'],
  },
  'imperialism-colonialism': {
    dbSubjects: ['history'],
    keywords: ['new imperialism', 'scramble for africa', 'berlin conference 1884', 'opium wars china', 'meiji restoration japan', 'white man\'s burden', 'economic imperialism', 'resistance movements'],
  },
  'world-war-1': {
    dbSubjects: ['history'],
    keywords: ['alliance system', 'assassination sarajevo', 'trench warfare', 'total war', 'treaty of versailles', 'league of nations', 'mandate system', 'ottoman breakup', 'wilson\'s 14 points'],
  },
  'russian-revolution': {
    dbSubjects: ['history'],
    keywords: ['tsar nicholas ii', 'february revolution', 'october revolution', 'lenin', 'bolsheviks', 'war communism', 'nep', 'stalin', 'collectivization', 'five year plans ussr'],
  },
  'fascism-nazism': {
    dbSubjects: ['history'],
    keywords: ['mussolini', 'fascism italy', 'hitler', 'nazism', 'weimar republic', 'anti-semitism', 'holocaust', 'totalitarianism', 'militarism', 'axis powers formation'],
  },
  'world-war-2': {
    dbSubjects: ['history'],
    keywords: ['appeasement', 'blitzkrieg', 'pearl harbor', 'd-day', 'hiroshima nagasaki', 'holocaust', 'yalta potsdam', 'united nations formation', 'nuremberg trials', 'cold war start'],
  },
  'cold-war': {
    dbSubjects: ['history'],
    keywords: ['truman doctrine', 'marshall plan', 'nato warsaw pact', 'berlin wall', 'cuban missile crisis', 'korean war', 'vietnam war', 'detente', 'salt start', 'reagan gorbachev'],
  },
  'decolonization': {
    dbSubjects: ['history'],
    keywords: ['indian independence wave', 'indonesian independence', 'african decolonization', 'bandung conference', 'algeria', 'congo', 'apartheid south africa', 'waves of independence', 'neo-colonialism'],
  },
  'chinese-revolution': {
    dbSubjects: ['history'],
    keywords: ['sun yat-sen', 'kuomintang', 'chinese civil war', 'long march', 'mao zedong', 'people\'s republic 1949', 'cultural revolution', 'great leap forward', 'deng xiaoping reforms'],
  },
  'arab-israeli-conflict': {
    dbSubjects: ['history'],
    keywords: ['balfour declaration', 'palestine mandate', '1948 war', 'six day war 1967', 'yom kippur 1973', 'camp david', 'intifada', 'oslo accords', 'two-state solution', 'plo hamas'],
  },
  'ussr-collapse': {
    dbSubjects: ['history'],
    keywords: ['gorbachev', 'glasnost perestroika', 'fall of berlin wall 1989', 'dissolution of ussr 1991', 'cis', 'unipolar world', 'eu expansion', 'nato expansion', 'end of history debate'],
  },
  'political-philosophies': {
    dbSubjects: ['history'],
    keywords: ['marx engels', 'communist manifesto', 'capitalism adam smith', 'socialism types', 'fabian socialism', 'welfare state', 'fascism ideology', 'anarchism', 'liberalism', 'social democracy'],
  },
  'globalization-world-order': {
    dbSubjects: ['history'],
    keywords: ['wto formation', 'economic globalization', 'cultural globalization', 'anti-globalization', 'huntington clash', 'fukuyama end of history', 'multipolarity', 'brics rise', 'terrorism post 9/11'],
  },
  'national-boundaries-redrawing': {
    dbSubjects: ['history'],
    keywords: ['treaty of versailles boundaries', 'post-wwii map', 'decolonization boundaries', 'yugoslavia breakup', 'ussr breakup', 'sudan split', 'kosovo', 'crimea', 'ongoing disputes'],
  },
  'trans-himalayan': {
    dbSubjects: ['geography'],
    keywords: ['karakoram range', 'ladakh range', 'zaskar range', 'cold desert', 'k2', 'siachen glacier', 'indus in ladakh', 'pangong tso', 'strategic importance'],
  },
  'lakes-india': {
    dbSubjects: ['geography'],
    keywords: ['chilika', 'wular', 'dal lake', 'sambhar', 'lonar crater', 'pulicat', 'vembanad', 'loktak', 'bhimtal', 'hussain sagar'],
  },
  'cyclones-india': {
    dbSubjects: ['geography'],
    keywords: ['tropical cyclone formation', 'bay of bengal cyclones', 'arabian sea cyclones', 'cyclone naming', 'imd classification', 'fani amphan biparjoy', 'cyclone preparedness', 'storm surge'],
  },
  'irrigation-india': {
    dbSubjects: ['geography'],
    keywords: ['canal irrigation', 'well irrigation', 'tank irrigation', 'drip sprinkler', 'major irrigation projects', 'bhakra nangal', 'hirakud', 'inter-state water disputes', 'river linking', 'pmksy'],
  },
  'coastal-plains': {
    dbSubjects: ['geography'],
    keywords: ['konkan coast', 'malabar coast', 'coromandel coast', 'northern circars', 'kathiawar', 'lagoons', 'major ports', 'minor ports', 'sagarmala'],
  },
  'thar-desert': {
    dbSubjects: ['geography'],
    keywords: ['thar desert', 'rann of kutch', 'great rann little rann', 'arid ecosystem', 'indira gandhi canal', 'desert national park', 'sand dunes', 'saline lakes'],
  },
  'earth-interior': {
    dbSubjects: ['geography'],
    keywords: ['crust mantle core', 'moho discontinuity', 'gutenberg discontinuity', 'lehmann', 'seismic waves p s', 'shadow zone', 'composition layers', 'asthenosphere', 'lithosphere'],
  },
  'plate-tectonics': {
    dbSubjects: ['geography'],
    keywords: ['continental drift', 'sea floor spreading', 'plate boundaries', 'convergent divergent transform', 'ring of fire', 'volcanism types', 'hotspots', 'mid-ocean ridges', 'subduction'],
  },
  'rocks-minerals': {
    dbSubjects: ['geography'],
    keywords: ['igneous rocks', 'sedimentary rocks', 'metamorphic rocks', 'rock cycle', 'minerals', 'ore deposits', 'geological time scale', 'fossils'],
  },
  'geomorphology': {
    dbSubjects: ['geography'],
    keywords: ['weathering types', 'mass wasting', 'fluvial landforms', 'glacial landforms', 'aeolian landforms', 'karst topography', 'coastal landforms', 'erosion cycle davis'],
  },
  'atmosphere-structure': {
    dbSubjects: ['geography'],
    keywords: ['troposphere stratosphere', 'mesosphere thermosphere', 'ozone layer', 'insolation', 'heat budget', 'albedo', 'terrestrial radiation', 'greenhouse effect', 'temperature inversion'],
  },
  'pressure-winds': {
    dbSubjects: ['geography'],
    keywords: ['pressure belts', 'trade winds', 'westerlies', 'polar easterlies', 'coriolis effect', 'ferrel cell', 'hadley cell', 'jet streams', 'local winds', 'monsoon mechanism global'],
  },
  'precipitation-types': {
    dbSubjects: ['geography'],
    keywords: ['convectional rainfall', 'orographic rainfall', 'frontal rainfall', 'warm front cold front', 'air masses', 'temperate cyclones', 'tropical cyclones formation', 'thunderstorms'],
  },
  'oceanography': {
    dbSubjects: ['geography'],
    keywords: ['ocean floor relief', 'continental shelf', 'abyssal plain', 'mid-ocean ridge', 'trench', 'ocean temperature', 'thermocline', 'salinity distribution', 'ocean deposits'],
  },
  'tides': {
    dbSubjects: ['geography'],
    keywords: ['spring tides', 'neap tides', 'gravitational pull', 'tidal bore', 'tidal energy', 'tidal range', 'diurnal semidiurnal', 'gulf of cambay tides'],
  },
  'world-rivers-lakes': {
    dbSubjects: ['geography'],
    keywords: ['amazon nile mississippi', 'yangtze mekong danube', 'great lakes', 'caspian sea', 'lake baikal', 'african great lakes', 'river basins', 'transboundary rivers'],
  },
  'world-deserts': {
    dbSubjects: ['geography'],
    keywords: ['sahara', 'arabian desert', 'gobi', 'kalahari', 'atacama', 'antarctic desert', 'desertification', 'oasis', 'desert ecosystems'],
  },
  'industrial-location': {
    dbSubjects: ['geography'],
    keywords: ['weber theory', 'raw material orientation', 'market orientation', 'rostow stages', 'primary secondary tertiary', 'quaternary sector', 'global manufacturing shifts', 'special economic zones'],
  },
  'world-agriculture': {
    dbSubjects: ['geography'],
    keywords: ['subsistence farming', 'commercial farming', 'plantation agriculture', 'shifting cultivation', 'pastoral nomadism', 'wheat rice belt', 'food crisis', 'fao'],
  },
  'world-population': {
    dbSubjects: ['geography'],
    keywords: ['population distribution', 'demographic transition model', 'age-sex pyramid', 'migration types', 'refugee crisis', 'urbanization global', 'megacities', 'population policies'],
  },
  'indian-society-features': {
    dbSubjects: ['polity', 'history'],
    keywords: ['unity in diversity', 'linguistic diversity', 'religious pluralism', 'ethnic diversity', 'joint family system', 'social stratification', 'tolerance', 'composite culture'],
  },
  'regionalism': {
    dbSubjects: ['polity', 'history'],
    keywords: ['regionalism types', 'demand for statehood', 'telangana movement', 'gorkhaland', 'bodoland', 'sons of soil', 'linguistic sub-nationalism', 'inter-state disputes', 'regional parties'],
  },
  'secularism-india': {
    dbSubjects: ['polity', 'history'],
    keywords: ['indian secularism', 'western secularism', 'article 25-28', 'principled distance', 'sarva dharma sambhava', 'dharma nirapekshata', 'uniform civil code debate', 'minority rights'],
  },
  'globalization-society': {
    dbSubjects: ['polity', 'history'],
    keywords: ['cultural globalization', 'consumerism', 'westernization', 'mcdonaldization', 'glocalization', 'brain drain', 'it revolution impact', 'social media society', 'changing values'],
  },
  'social-empowerment': {
    dbSubjects: ['polity', 'history'],
    keywords: ['sc st empowerment', 'reservation policy', 'dalit movements', 'tribal welfare', 'minority commissions', 'disabled rights rpwd act', 'elderly care', 'transgender rights nalsa'],
  },
  'education-society': {
    dbSubjects: ['polity', 'history'],
    keywords: ['nep 2020', 'rte act 2009', 'samagra shiksha', 'mid day meal', 'sarva shiksha abhiyan', 'higher education', 'skill development', 'digital education', 'kothari commission'],
  },
  'indian-diaspora': {
    dbSubjects: ['polity', 'history'],
    keywords: ['nri pio oci', 'remittances', 'brain drain gain', 'diaspora countries', 'pravasi bharatiya', 'soft power', 'diaspora diplomacy', 'labour migration gulf'],
  },
  'folk-music-dance': {
    dbSubjects: ['art_culture'],
    keywords: ['bihu assam', 'bhangra gidda punjab', 'garba gujarat', 'lavani maharashtra', 'ghoomar rajasthan', 'chhau', 'yakshagana', 'rouf', 'dollu kunitha', 'karma dance'],
  },
  'indian-theatre': {
    dbSubjects: ['art_culture'],
    keywords: ['kathakali', 'koodiyattam', 'chhau dance-drama', 'nautanki', 'tamasha', 'therukoothu', 'bhand pather', 'jatra', 'swang', 'burrakatha'],
  },
  'puppetry-traditions': {
    dbSubjects: ['art_culture'],
    keywords: ['tholpavakoothu kerala', 'tholu bommalata ap', 'bommalattam tamil nadu', 'ravanachhaya odisha', 'putul nach bengal', 'kathputli rajasthan', 'string rod shadow glove'],
  },
  'buddhist-jain-architecture': {
    dbSubjects: ['art_culture'],
    keywords: ['sanchi stupa', 'bodh gaya mahabodhi', 'sarnath', 'ajanta caves', 'dilwara temples', 'ranakpur', 'gomateshwara', 'dharma chakra', 'bamiyan influence', 'nalanda ruins'],
  },
  'indo-islamic-architecture': {
    dbSubjects: ['art_culture'],
    keywords: ['true arch dome', 'qutub complex', 'alai darwaza', 'tughluqabad', 'gol gumbaz', 'charminar', 'jama masjid', 'provincial styles bengal gujarat jaunpur malwa', 'persian influence'],
  },
  'colonial-architecture': {
    dbSubjects: ['art_culture'],
    keywords: ['indo-saracenic', 'gothic revival', 'victoria terminus', 'rashtrapati bhavan', 'lutyens delhi', 'chandigarh le corbusier', 'iim ahmedabad doshi', 'modern indian architecture'],
  },
  'unesco-heritage-india': {
    dbSubjects: ['art_culture'],
    keywords: ['cultural sites', 'natural sites', 'mixed sites', 'tentative list', '42 sites current', 'dholavira latest', 'santiniketan', 'hoysala temples', 'criteria for selection'],
  },
  'handicrafts-textiles': {
    dbSubjects: ['art_culture'],
    keywords: ['pochampally ikat', 'banarasi silk', 'chanderi', 'pashmina', 'kanchipuram', 'patola', 'phulkari', 'chikankari', 'zari work', 'gi tags'],
  },
  'festivals-india': {
    dbSubjects: ['art_culture'],
    keywords: ['diwali', 'holi', 'eid', 'christmas', 'pongal onam bihu baisakhi', 'losar', 'hornbill festival', 'pushkar fair', 'kumbh mela', 'hemis'],
  },
  'martial-arts-india': {
    dbSubjects: ['art_culture'],
    keywords: ['kalaripayattu kerala', 'silambam tamil nadu', 'gatka punjab', 'thang-ta manipur', 'malkhamb', 'kushti', 'kabaddi', 'traditional games', 'khel ratna arjuna awards'],
  },
  'languages-scripts': {
    dbSubjects: ['art_culture'],
    keywords: ['eighth schedule 22 languages', 'classical language status', 'tamil sanskrit telugu kannada malayalam odia', 'brahmi devanagari', 'language families indo-aryan dravidian', 'three language formula'],
  },
  'indian-literature-modern': {
    dbSubjects: ['art_culture'],
    keywords: ['vedic literature', 'kalidasa', 'sangam literature', 'bhakti poetry', 'modern indian literature', 'rabindranath tagore', 'premchand', 'sahitya akademi', 'jnanpith award', 'regional literary giants'],
  },
  'fairs-melas': {
    dbSubjects: ['art_culture'],
    keywords: ['kumbh mela', 'pushkar fair', 'surajkund mela', 'hornbill festival', 'rann utsav', 'hemis festival', 'thrissur pooram', 'international film festival', 'jaipur literature festival'],
  },
  'preamble': {
    dbSubjects: ['polity'],
    keywords: ['sovereign socialist secular democratic republic', 'justice liberty equality fraternity', 'berubari case', 'kesavananda', '42nd amendment', 'amendability', 'guiding light'],
  },
  'right-freedom-religion': {
    dbSubjects: ['polity'],
    keywords: ['article 25 freedom of conscience', 'article 26 religious affairs', 'article 27 taxes', 'article 28 religious instruction', 'essential religious practices', 'sabarimala', 'hijab'],
  },
  'cultural-educational-rights': {
    dbSubjects: ['polity'],
    keywords: ['article 29 minority protection', 'article 30 minority educational institutions', 'tma pai case', 'st stephen\'s case', 'linguistic minorities', 'national commission for minorities'],
  },
  'parliamentary-committees': {
    dbSubjects: ['polity'],
    keywords: ['standing committees', 'departmental standing committees', 'pac', 'estimates committee', 'committee on public undertakings', 'jpc', 'select committee', 'sarkaria commission'],
  },
  'legislative-process': {
    dbSubjects: ['polity'],
    keywords: ['ordinary bill', 'money bill', 'financial bill', 'constitutional amendment bill', 'ordinance', 'joint sitting', 'rajya sabha powers', 'certification by speaker', 'committee stage'],
  },
  'subordinate-courts': {
    dbSubjects: ['polity'],
    keywords: ['district courts', 'sessions court', 'magistrate courts', 'tribunals', 'nclt nclat', 'cat sat', 'ngt', 'lok adalat', 'family courts', 'fast track courts'],
  },
  'inter-state-relations': {
    dbSubjects: ['polity'],
    keywords: ['article 262', 'inter-state water disputes act', 'cauvery tribunal', 'zonal councils', 'inter-state council article 263', 'freedom of trade article 301', 'full faith and credit'],
  },
  'emergency-provisions': {
    dbSubjects: ['polity'],
    keywords: ['national emergency article 352', 'president\'s rule article 356', 'financial emergency article 360', '44th amendment safeguards', 'bommai case', 'minerva mills', 'suspension of fr'],
  },
  'special-provisions-states': {
    dbSubjects: ['polity'],
    keywords: ['article 370 abrogation', 'article 371 series', 'fifth schedule tribal areas', 'sixth schedule ne autonomous councils', 'pesa', 'nagaland mizoram special status', 'darjeeling'],
  },
  'constitutional-bodies': {
    dbSubjects: ['polity'],
    keywords: ['election commission', 'upsc', 'state psc', 'finance commission', 'cag', 'attorney general', 'advocate general', 'ncsc', 'ncst', 'special officer linguistic minorities'],
  },
  'statutory-regulatory-bodies': {
    dbSubjects: ['polity'],
    keywords: ['nhrc', 'ncw', 'ncpcr', 'ncm', 'ncbc', 'sebi', 'trai', 'cci', 'rera', 'fssai'],
  },
  'representation-peoples-act': {
    dbSubjects: ['polity'],
    keywords: ['rpa 1950 1951', 'disqualifications', 'election petition', 'evm vvpat', 'nota', 'anti-defection', '10th schedule', 'electoral bonds', 'delimitation', 'eci reforms'],
  },
  'comparative-constitutions': {
    dbSubjects: ['polity'],
    keywords: ['us constitution comparison', 'uk parliamentary system', 'canadian federalism', 'australian concurrent list', 'irish dpsp', 'south african bill of rights', 'french republic', 'japanese peace clause'],
  },
  'pressure-groups': {
    dbSubjects: ['polity'],
    keywords: ['pressure groups types', 'interest groups', 'trade unions', 'farmer organizations', 'business lobbies', 'ngos', 'civil society role', 'social movements', 'narmada bachao', 'rti movement'],
  },
  'government-schemes': {
    dbSubjects: ['polity'],
    keywords: ['mgnrega', 'pm-kisan', 'dbt', 'ayushman bharat', 'pm awas yojana', 'ujjwala', 'swachh bharat', 'make in india', 'startup india', 'skill india'],
  },
  'welfare-vulnerable': {
    dbSubjects: ['polity'],
    keywords: ['sc st welfare', 'sc scholarship', 'tribal welfare', 'minority welfare', 'pmjay', 'nsap', 'disability rights rpwd', 'elderly ignoaps', 'transgender act', 'child welfare icds'],
  },
  'health-education-governance': {
    dbSubjects: ['polity'],
    keywords: ['nhm', 'ayushman bharat', 'aiims expansion', 'nep 2020', 'rte', 'samagra shiksha', 'pmkvy', 'national skill mission', 'aser', 'health infrastructure'],
  },
  'india-foreign-policy': {
    dbSubjects: ['polity'],
    keywords: ['nehruvian foreign policy', 'strategic autonomy', 'multi-alignment', 'neighbourhood first', 'act east', 'link west', 'sagar doctrine', 'vaccine maitri', 'foreign policy determinants'],
  },
  'india-indian-ocean': {
    dbSubjects: ['polity'],
    keywords: ['indian ocean region', 'iora', 'string of pearls', 'necklace of diamonds', 'sagar', 'andaman nicobar command', 'chabahar port', 'hambantota', 'diego garcia', 'maritime security'],
  },
  'india-africa': {
    dbSubjects: ['polity'],
    keywords: ['india-africa summit', 'iafs', 'development partnership', 'lines of credit', 'itec', 'pan-africa network', 'indian diaspora africa', 'trade investment', 'un cooperation'],
  },
  'india-central-west-asia': {
    dbSubjects: ['polity'],
    keywords: ['india-central asia summit', 'india-gulf relations', 'energy security', 'labour diaspora gulf', 'i2u2', 'abraham accords impact', 'india-israel', 'india-iran', 'india-latin america trade'],
  },
  'diaspora-policy': {
    dbSubjects: ['polity'],
    keywords: ['pio oci cards', 'pravasi bharatiya divas', 'diaspora contributions', 'remittances $100b', 'brain drain vs gain', 'nri investment', 'lobbying influence us uk', 'diaspora diplomacy'],
  },
  'developed-developing-impact': {
    dbSubjects: ['polity'],
    keywords: ['us fed policy impact', 'china trade impact', 'eu regulations cbam', 'oil prices opec', 'supply chain shifts', 'tech decoupling', 'dollar hegemony', 'global south solidarity'],
  },
  'international-treaties': {
    dbSubjects: ['polity'],
    keywords: ['npt ctbt', 'paris agreement', 'unclos', 'wto agreements', 'bilateral ftas', 'rcep', 'cptpp', 'bits', 'extradition treaties', 'double taxation'],
  },
  'india-global-commons': {
    dbSubjects: ['polity'],
    keywords: ['antarctic treaty', 'india arctic policy', 'himadri station', 'outer space treaty', 'artemis accords', 'isa seabed mining', 'cyber norms', 'bbnj treaty', 'deep ocean mission'],
  },
  'national-income': {
    dbSubjects: ['economy'],
    keywords: ['gdp gnp ndp nnp', 'real nominal gdp', 'gdp deflator', 'base year', 'cso nso', 'income method', 'expenditure method', 'production method', 'per capita income', 'ppp'],
  },
  'government-budgeting': {
    dbSubjects: ['economy'],
    keywords: ['budget cycle', 'revenue receipts', 'capital receipts', 'revenue expenditure', 'capital expenditure', 'consolidated fund', 'contingency fund', 'public account', 'vote on account', 'supplementary demands'],
  },
  'taxation-system': {
    dbSubjects: ['economy'],
    keywords: ['income tax', 'corporate tax', 'gst structure', 'cgst sgst igst', 'gst council', 'customs duty', 'cess surcharge', 'laffer curve', 'tax to gdp ratio', 'tax reforms'],
  },
  'food-processing': {
    dbSubjects: ['economy'],
    keywords: ['food processing sector', 'pmksy', 'mega food parks', 'operation greens', 'cold chain', 'supply chain management', 'fpos', 'food safety fssai', 'value addition', 'export potential'],
  },
  'land-reforms-economy': {
    dbSubjects: ['economy'],
    keywords: ['zamindari abolition', 'tenancy reforms', 'land ceiling', 'land consolidation', 'computerization of land records', 'dilrmp', 'svamitva', 'land acquisition larr 2013', 'land banking'],
  },
  'animal-husbandry-fisheries': {
    dbSubjects: ['economy'],
    keywords: ['dairy sector amul', 'operation flood', 'livestock census', 'poultry', 'blue revolution', 'pmmsy', 'sagar parikrama', 'fisheries export', 'animal welfare', 'veterinary infrastructure'],
  },
  'irrigation-economy': {
    dbSubjects: ['economy'],
    keywords: ['irrigation coverage', 'pmksy', 'micro irrigation', 'drip sprinkler', 'canal command areas', 'water pricing', 'groundwater crisis', 'central water commission', 'dam safety act'],
  },
  'liberalization-economy': {
    dbSubjects: ['economy'],
    keywords: ['lpg reforms 1991', 'license raj end', 'disinvestment', 'privatization', 'industrial policy changes', 'fdi policy evolution', 'sez policy', 'make in india', 'pli scheme', 'ease of doing business'],
  },
  'msme-industry': {
    dbSubjects: ['economy'],
    keywords: ['msme definition classification', 'udyam registration', 'make in india', 'pli scheme', 'defence corridors', 'semiconductor mission', 'industrial clusters', 'startup ecosystem', 'dpiit'],
  },
  'investment-models': {
    dbSubjects: ['economy'],
    keywords: ['ppp model', 'bot', 'boot', 'dbfot', 'ham hybrid annuity', 'vgf viability gap', 'epc', 'invit', 'reits', 'nabfid'],
  },
  'insurance-pension': {
    dbSubjects: ['economy'],
    keywords: ['irda', 'lic ipo', 'pm jeevan jyoti', 'pm suraksha bima', 'atal pension yojana', 'nps', 'epfo', 'crop insurance pmfby', 'health insurance pmjay', 'reinsurance'],
  },
  'capital-markets': {
    dbSubjects: ['economy'],
    keywords: ['sebi regulation', 'bse nse', 'primary market ipo', 'secondary market', 'mutual funds', 'bonds g-sec', 'corporate bonds', 'sovereign green bonds', 'cryptocurrency regulation', 'cbdc digital rupee'],
  },
  'general-physics': {
    dbSubjects: ['science'],
    keywords: ['mechanics', 'newton\'s laws', 'gravitation', 'thermodynamics', 'heat transfer', 'optics', 'light reflection refraction', 'electricity', 'magnetism', 'electromagnetic spectrum'],
  },
  'general-chemistry': {
    dbSubjects: ['science'],
    keywords: ['atomic structure', 'periodic table', 'chemical bonding', 'acids bases salts', 'ph scale', 'metals non-metals', 'organic chemistry basics', 'polymers', 'soaps detergents', 'ceramics glass'],
  },
  'general-biology': {
    dbSubjects: ['science'],
    keywords: ['cell structure', 'dna rna', 'genetics heredity', 'evolution', 'human body systems', 'blood groups', 'immune system', 'vitamins minerals', 'diseases', 'nutrition'],
  },
  'health-diseases': {
    dbSubjects: ['science'],
    keywords: ['communicable diseases', 'non-communicable diseases', 'vector borne diseases', 'vaccines immunization', 'antibiotic resistance', 'pandemic preparedness', 'one health', 'mental health', 'malnutrition', 'nhm goals'],
  },
  'it-computers': {
    dbSubjects: ['science'],
    keywords: ['computer basics', 'internet architecture', 'cloud computing', 'blockchain', 'quantum computing', '5g technology', 'iot', 'digital payments', 'ott platforms', 'data centres'],
  },
  'robotics-automation': {
    dbSubjects: ['science'],
    keywords: ['robotics applications', 'automation in manufacturing', 'industry 4.0', '3d printing', 'drones uav regulations', 'autonomous vehicles', 'smart manufacturing', 'ai in governance'],
  },
  'ipr-patents': {
    dbSubjects: ['science'],
    keywords: ['patent', 'copyright', 'trademark', 'gi tags india', 'trips agreement', 'wipo', 'compulsory licensing', 'doha declaration', 'patent evergreening', 'traditional knowledge'],
  },
  'indians-in-science': {
    dbSubjects: ['science'],
    keywords: ['cv raman', 'satyendra nath bose', 'homi bhabha', 'vikram sarabhai', 'apj abdul kalam', 'srinivasa ramanujan', 'har gobind khorana', 'venkatraman ramakrishnan', 'ms swaminathan', 'tessy thomas'],
  },
  'agricultural-science': {
    dbSubjects: ['science'],
    keywords: ['gm crops', 'bt cotton', 'bt brinjal controversy', 'biofortification', 'golden rice', 'precision farming', 'vertical farming', 'organic farming', 'icar', 'krishi vigyan kendra'],
  },
  'space-applications': {
    dbSubjects: ['science'],
    keywords: ['remote sensing', 'gis applications', 'insat series', 'irs series', 'navic vs gps', 'weather forecasting satellites', 'telemedicine via satellite', 'disaster management satellites', 'bhuvan portal'],
  },
  'emerging-tech-latest': {
    dbSubjects: ['science'],
    keywords: ['5g deployment india', 'internet of things', '3d printing applications', 'drone policy india', 'metaverse', 'ar vr', 'brain-computer interface', 'gene therapy', 'digital twins', 'edge computing'],
  },
  'eia-process': {
    dbSubjects: ['environment'],
    keywords: ['eia notification 2006', 'eia process stages', 'public hearing', 'eac', 'category a b', 'eia draft 2020 controversy', 'strategic eia', 'cumulative eia', 'eia dilution concerns'],
  },
  'environment-laws': {
    dbSubjects: ['environment'],
    keywords: ['environment protection act 1986', 'wildlife protection act 1972', 'forest conservation act 1980', 'water air act', 'ngt', 'cpcb spcb', 'biological diversity act 2002', 'nba', 'campa act'],
  },
  'ecology-fundamentals': {
    dbSubjects: ['environment'],
    keywords: ['food chain', 'food web', 'trophic levels', 'ecological pyramids', 'biogeochemical cycles', 'carbon cycle', 'nitrogen cycle', 'phosphorus cycle', 'water cycle', 'energy flow'],
  },
  'ecosystem-types': {
    dbSubjects: ['environment'],
    keywords: ['terrestrial ecosystems', 'forest ecosystem', 'grassland ecosystem', 'desert ecosystem', 'freshwater ecosystem', 'marine ecosystem', 'estuarine ecosystem', 'ecosystem services', 'succession'],
  },
  'species-conservation': {
    dbSubjects: ['environment'],
    keywords: ['iucn categories', 'cr en vu nt lc', 'red data book', 'wpa schedules i-vi', 'flagship species', 'keystone species', 'indicator species', 'umbrella species', 'endemic species india', 'species recovery programmes'],
  },
  'indian-flora-fauna': {
    dbSubjects: ['environment'],
    keywords: ['indian biodiversity', 'western ghats endemics', 'eastern himalayas endemics', 'asiatic lion', 'bengal tiger', 'one-horned rhino', 'gangetic dolphin', 'great indian bustard', 'nilgiri tahr', 'sangai deer'],
  },
  'waste-management': {
    dbSubjects: ['environment'],
    keywords: ['solid waste management rules', 'plastic waste rules', 'e-waste rules', 'biomedical waste rules', 'hazardous waste rules', 'epr', 'circular economy', 'waste to energy', 'swachh bharat waste'],
  },
  'sustainable-development': {
    dbSubjects: ['environment'],
    keywords: ['17 sdgs', 'agenda 2030', 'india sdg index', 'circular economy', 'green gdp', 'natural capital accounting', 'esg investing', 'life lifestyle', 'panchamrit targets'],
  },
  'carbon-markets': {
    dbSubjects: ['environment'],
    keywords: ['carbon credit', 'cap and trade', 'cdm', 'article 6 paris', 'voluntary carbon market', 'india carbon market', 'green climate fund', 'loss and damage fund', 'climate finance gap', 'green bonds'],
  },
  'external-state-actors': {
    dbSubjects: ['science'],
    keywords: ['state-sponsored terrorism', 'isi pakistan', 'non-state actors', 'terror financing', 'radicalization', 'cross-border terrorism', 'proxy war', 'fatf grey list'],
  },
  'development-extremism-link': {
    dbSubjects: ['science'],
    keywords: ['poverty extremism link', 'tribal alienation', 'displacement', 'forest rights denial', 'naxal ideology', 'development deficit red corridor', 'samadhan doctrine', 'aspirational districts'],
  },
  'media-social-security': {
    dbSubjects: ['science'],
    keywords: ['social media radicalization', 'fake news', 'deepfakes', 'information warfare', 'it act section 69a', 'content regulation', 'hate speech online', 'encrypted messaging challenges', 'media trial', 'press freedom vs security'],
  },
  'money-laundering': {
    dbSubjects: ['science'],
    keywords: ['pmla 2002', 'fatf', 'ed', 'fiu', 'hawala', 'shell companies', 'benami property', 'black money', 'swiss bank accounts', 'fatf grey list'],
  },
  'organized-crime': {
    dbSubjects: ['science'],
    keywords: ['drug trafficking golden crescent triangle', 'ndps act', 'ncb', 'human trafficking', 'arms smuggling', 'cybercrime syndicates', 'narco-terrorism', 'dark net', 'cryptocurrency crime'],
  },
  'security-forces': {
    dbSubjects: ['science'],
    keywords: ['bsf', 'crpf', 'cisf', 'itbp', 'ssb', 'assam rifles', 'nsg', 'coast guard', 'marcos', 'para sf'],
  },
  'ethics-human-interface': {
    dbSubjects: ['polity'],
    keywords: ['ethics definition', 'morality vs ethics', 'determinants of ethics', 'consequences of ethical actions', 'ethical reasoning', 'moral development kohlberg', 'conscience', 'ethics in human action'],
  },
  'emotional-intelligence': {
    dbSubjects: ['polity'],
    keywords: ['daniel goleman ei model', 'self-awareness', 'self-regulation', 'motivation', 'empathy', 'social skills', 'ei in leadership', 'ei in administration', 'ei vs iq', 'managing emotions'],
  },
  'ethics-private-public': {
    dbSubjects: ['polity'],
    keywords: ['private ethics', 'public ethics', 'ethical conflicts', 'professional ethics', 'personal integrity', 'role of ethics in family', 'friendship ethics', 'workplace ethics', 'duty vs personal interest'],
  },
  'human-values': {
    dbSubjects: ['polity'],
    keywords: ['value formation', 'family role in values', 'socialization', 'educational institutions', 'peer influence', 'media influence', 'moral education', 'character building', 'ethical leadership development'],
  },
  'ethics-dimensions': {
    dbSubjects: ['polity'],
    keywords: ['meta-ethics', 'normative ethics', 'applied ethics', 'professional ethics', 'bioethics', 'environmental ethics', 'media ethics', 'business ethics', 'legal ethics'],
  },
  'ethical-dilemmas-govt': {
    dbSubjects: ['polity'],
    keywords: ['conflict of interest', 'nepotism', 'favoritism', 'ethical fading', 'groupthink', 'moral hazard', 'regulatory capture', 'revolving door', 'corporate fraud', 'ethical leadership'],
  },
  'laws-rules-conscience': {
    dbSubjects: ['polity'],
    keywords: ['law vs morality', 'rule of law', 'natural law', 'positive law', 'conscience', 'civil disobedience', 'conscientious objector', 'thoreau', 'mlk letter birmingham'],
  },
  'probity-governance': {
    dbSubjects: ['polity'],
    keywords: ['probity definition', 'philosophical basis', 'plato\'s philosopher king', 'kautilya governance', 'confucian ethics governance', 'servant leadership', 'public trust doctrine', 'transparency in governance'],
  },
  'codes-ethics-conduct': {
    dbSubjects: ['polity'],
    keywords: ['code of ethics vs code of conduct', 'civil services conduct rules', 'all india services rules', 'nolan principles', 'un ethics code', 'corporate codes', 'professional codes', 'enforcement challenges'],
  },
  'work-culture-delivery': {
    dbSubjects: ['polity'],
    keywords: ['work culture', 'organizational culture', 'service orientation', 'citizen centricity', 'quality management', 'sevottam model', 'citizen charter', 'grievance redressal', 'performance measurement'],
  },
  'ethical-intl-relations': {
    dbSubjects: ['polity'],
    keywords: ['ethics in international relations', 'just war theory', 'humanitarian intervention', 'r2p', 'sanctions ethics', 'foreign aid ethics', 'tied aid', 'debt trap', 'ethical foreign policy'],
  },
  'corporate-governance': {
    dbSubjects: ['polity'],
    keywords: ['corporate governance principles', 'board accountability', 'enron satyam', 'sebi lodr', 'kotak committee', 'esg', 'stakeholder theory', 'csr', 'whistle-blower mechanism corporate'],
  },
  'public-funds-ethics': {
    dbSubjects: ['polity'],
    keywords: ['public money trust', 'fiscal responsibility', 'cag audit', 'corruption in spending', 'leakages', 'rajiv gandhi quote', 'dbt transparency', 'social audit', 'rti and expenditure'],
  },
  'great-leaders-lessons': {
    dbSubjects: ['polity'],
    keywords: ['mahatma gandhi', 'ambedkar', 'mandela', 'abraham lincoln', 'martin luther king jr', 'mother teresa', 'kautilya', 'confucius', 'buddha', 'swami vivekananda'],
  },
  // ── CSAT — Reading Comprehension ─────────────────────────────────────────
  'passage-comprehension': {
    dbSubjects: ['general'],
    keywords: ['passage reading', 'main idea', 'inference', 'tone of passage', 'author\'s perspective', 'vocabulary in context', 'logical conclusion', 'comprehension'],
  },
  'critical-reading': {
    dbSubjects: ['general'],
    keywords: ['critical reading', 'argument strength', 'assumptions in passage', 'logical flaw', 'bias detection', 'evaluating evidence', 'counter argument'],
  },
  'para-jumbles-summary': {
    dbSubjects: ['general'],
    keywords: ['para jumbles', 'paragraph ordering', 'sentence rearrangement', 'summarization', 'precis writing', 'coherence', 'logical flow'],
  },

  // ── CSAT — Logical Reasoning ───────────────────────────────────────────
  'syllogisms': {
    dbSubjects: ['general'],
    keywords: ['syllogism', 'venn diagram', 'all some no', 'conclusion validity', 'complementary pairs', 'universal particular', 'negative premises'],
  },
  'statement-assumption': {
    dbSubjects: ['general'],
    keywords: ['statement assumption', 'implicit assumption', 'explicit assumption', 'negation method', 'hidden premise', 'valid assumption'],
  },
  'statement-conclusion': {
    dbSubjects: ['general'],
    keywords: ['statement conclusion', 'strong weak argument', 'cause effect', 'assertion reason', 'course of action', 'evaluating arguments'],
  },
  'coding-decoding': {
    dbSubjects: ['general'],
    keywords: ['coding decoding', 'letter coding', 'number coding', 'mixed coding', 'symbol coding', 'word coding', 'reverse coding'],
  },
  'blood-relations': {
    dbSubjects: ['general'],
    keywords: ['blood relation', 'family tree', 'generation mapping', 'coded relation', 'gender determination', 'maternal paternal'],
  },
  'direction-sense': {
    dbSubjects: ['general'],
    keywords: ['direction sense', 'cardinal direction', 'turns displacement', 'shortest distance', 'shadow direction', 'north south east west'],
  },
  'seating-arrangement': {
    dbSubjects: ['general'],
    keywords: ['seating arrangement', 'linear arrangement', 'circular arrangement', 'floor puzzle', 'comparison puzzle', 'scheduling puzzle'],
  },
  'logical-sequence': {
    dbSubjects: ['general'],
    keywords: ['logical sequence', 'ranking', 'alphabetical order', 'dictionary order', 'word formation', 'logical word sequence', 'sequential reasoning'],
  },

  // ── CSAT — Analytical Ability ──────────────────────────────────────────
  'number-series': {
    dbSubjects: ['general'],
    keywords: ['number series', 'arithmetic progression', 'geometric progression', 'difference series', 'fibonacci', 'mixed series', 'wrong term'],
  },
  'letter-series': {
    dbSubjects: ['general'],
    keywords: ['letter series', 'alphanumeric series', 'reverse alphabet', 'skip pattern', 'positional value', 'letter gap'],
  },
  'analogies-classification': {
    dbSubjects: ['general'],
    keywords: ['analogy', 'classification', 'odd one out', 'word analogy', 'number analogy', 'figure analogy', 'relationship pattern'],
  },
  'pattern-recognition': {
    dbSubjects: ['general'],
    keywords: ['pattern recognition', 'figure completion', 'embedded figure', 'mirror image', 'water image', 'rotation pattern', 'pattern counting'],
  },
  'paper-folding-dice': {
    dbSubjects: ['general'],
    keywords: ['paper folding', 'paper cutting', 'dice', 'cube painting', 'opposite faces', 'open dice', 'hole punching', 'spatial visualization'],
  },

  // ── CSAT — Data Interpretation ─────────────────────────────────────────
  'bar-line-graphs': {
    dbSubjects: ['general'],
    keywords: ['bar graph', 'bar chart', 'line graph', 'stacked bar', 'grouped bar', 'growth rate', 'trend analysis'],
  },
  'pie-charts': {
    dbSubjects: ['general'],
    keywords: ['pie chart', 'degree calculation', 'sector comparison', 'percentage to degree', 'central angle', 'proportional reasoning'],
  },
  'tables-data': {
    dbSubjects: ['general'],
    keywords: ['table data', 'row column analysis', 'multi-table', 'derived values', 'missing data inference', 'index numbers', 'tabular reasoning'],
  },
  'data-sufficiency': {
    dbSubjects: ['general'],
    keywords: ['data sufficiency', 'statement analysis', 'minimum data', 'independent sufficiency', 'combined sufficiency', 'necessary sufficient'],
  },

  // ── CSAT — Basic Numeracy ──────────────────────────────────────────────
  'number-system': {
    dbSubjects: ['general'],
    keywords: ['number system', 'hcf', 'lcm', 'prime factorization', 'divisibility', 'remainder theorem', 'unit digit'],
  },
  'percentage-ratio': {
    dbSubjects: ['general'],
    keywords: ['percentage', 'ratio', 'proportion', 'percentage change', 'successive percentage', 'partnership', 'componendo'],
  },
  'average-mixture': {
    dbSubjects: ['general'],
    keywords: ['average', 'weighted average', 'mixture', 'alligation', 'mean median mode', 'replacement problem', 'dilution'],
  },
  'time-speed-distance': {
    dbSubjects: ['general'],
    keywords: ['time speed distance', 'relative speed', 'boats streams', 'trains problem', 'average speed', 'circular track', 'races'],
  },
  'time-work': {
    dbSubjects: ['general'],
    keywords: ['time and work', 'work rate', 'pipes cisterns', 'combined work', 'alternate days', 'efficiency comparison'],
  },
  'profit-loss-interest': {
    dbSubjects: ['general'],
    keywords: ['profit loss', 'cost price', 'selling price', 'markup', 'discount', 'simple interest', 'compound interest', 'successive discount'],
  },
  'probability-combinatorics': {
    dbSubjects: ['general'],
    keywords: ['probability', 'complementary events', 'independent events', 'permutation', 'combination', 'counting principle', 'factorial'],
  },
  'geometry-mensuration': {
    dbSubjects: ['general'],
    keywords: ['geometry', 'mensuration', 'triangle', 'circle', 'quadrilateral', 'area perimeter', 'volume', 'surface area', 'coordinate'],
  },

  // ── CSAT — Decision Making ─────────────────────────────────────────────
  'administrative-decisions': {
    dbSubjects: ['general'],
    keywords: ['administrative decision', 'stakeholder analysis', 'prioritization', 'resource allocation', 'ethical consideration', 'public interest', 'scenario evaluation'],
  },
  'problem-identification': {
    dbSubjects: ['general'],
    keywords: ['problem identification', 'root cause analysis', 'lateral thinking', 'systems approach', 'flowchart reasoning', 'algorithm design', 'evaluating alternatives'],
  },
  'essay-technique': {
    dbSubjects: ['general'],
    keywords: ['essay structure', 'introduction hook', 'body paragraphs', 'conclusion', 'thesis statement', 'coherence', 'examples quotations', 'multidimensional approach', 'word limit 1000-1200'],
  },
  'essay-philosophical': {
    dbSubjects: ['general'],
    keywords: ['wisdom vs knowledge', 'means vs ends', 'individual vs society', 'freedom vs responsibility', 'change vs tradition', 'hope vs despair'],
  },
  'essay-social': {
    dbSubjects: ['general'],
    keywords: ['gender equality', 'caste discrimination', 'education access', 'health challenges', 'urbanization', 'migration', 'digital divide', 'youth aspirations'],
  },
  'essay-political': {
    dbSubjects: ['general'],
    keywords: ['democracy challenges', 'federalism', 'judicial activism', 'bureaucracy reform', 'corruption', 'civil liberties', 'development vs environment'],
  },
  'essay-science-env': {
    dbSubjects: ['general'],
    keywords: ['ai ethics', 'technology and humanity', 'climate change urgency', 'sustainable development', 'space exploration', 'digital privacy', 'biotechnology ethics'],
  },
  'essay-economy': {
    dbSubjects: ['general'],
    keywords: ['inequality and growth', 'agriculture crisis', 'make in india', 'startup culture', 'globalization pros cons', 'informal economy', 'financial inclusion'],
  },
  'govt-schemes-current': {
    dbSubjects: ['general'],
    keywords: ['all major central schemes', 'state schemes', 'budget announcements', 'policy changes', 'new laws', 'ordinances'],
  },
  'acts-bills-current': {
    dbSubjects: ['general'],
    keywords: ['recent legislation', 'amendment acts', 'pending bills', 'ordinances', 'supreme court judgments', 'landmark cases'],
  },
  'international-events': {
    dbSubjects: ['general'],
    keywords: ['g20 g7', 'brics summit', 'cop climate', 'unga', 'bilateral summits', 'military exercises', 'trade agreements signed'],
  },
  'awards-appointments': {
    dbSubjects: ['general'],
    keywords: ['nobel prize', 'booker prize', 'padma awards', 'bharat ratna', 'national awards', 'sports achievements', 'key appointments'],
  },
  'science-news': {
    dbSubjects: ['general'],
    keywords: ['space missions', 'scientific discoveries', 'medical breakthroughs', 'tech launches', 'drdo tests', 'environment tech'],
  },
  'economic-events': {
    dbSubjects: ['general'],
    keywords: ['union budget highlights', 'rbi monetary policy', 'trade data', 'gdp growth', 'inflation trends', 'forex reserves', 'stock market milestones'],
  },
  'reports-indices': {
    dbSubjects: ['general'],
    keywords: ['hdi undp', 'wef global competitiveness', 'world happiness', 'ease of doing business', 'global hunger index', 'niti sdg index', 'aser', 'srs', 'nfhs', 'economic survey'],
  },
  'places-in-news': {
    dbSubjects: ['general'],
    keywords: ['conflict zones', 'disaster locations', 'diplomatic events locations', 'new infrastructure', 'unesco new sites', 'volcanic eruptions earthquakes'],
  },
}
