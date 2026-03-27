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
}
