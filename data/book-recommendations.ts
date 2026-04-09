// Definitive UPSC Civil Services book/source recommendations
// Compiled from toppers' lists, coaching consensus, and official sources
// Maps to subject IDs in data/syllabus.ts

export interface BookRecommendation {
  title: string
  author: string
  detail: string
  type: 'standard' | 'ncert' | 'government' | 'coaching' | 'reference'
  priority: 1 | 2 | 3 // 1 = must-read, 2 = highly recommended, 3 = supplementary
}

export interface SubjectBooks {
  subjectId: string
  subjectTitle: string
  paper: string
  books: BookRecommendation[]
}

export const UPSC_BOOK_RECOMMENDATIONS: SubjectBooks[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-I: HISTORY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'ancient-history',
    subjectTitle: 'Ancient Indian History',
    paper: 'GS-I',
    books: [
      // ── Standard Textbooks ──
      {
        title: "India's Ancient Past",
        author: 'R.S. Sharma',
        detail: 'The gold-standard for ancient India. Chapters 1-8 cover Stone Age to Chalcolithic; Ch 9-15 cover Vedic period; Ch 16-22 cover Mahajanapadas to Mauryas; Ch 23-30 cover post-Mauryan to Gupta period; Ch 31-36 cover South India & cultural developments. Read cover-to-cover.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Introduction to Indian Art (Part I — Ancient & Medieval)',
        author: 'NCERT Class 11 Fine Arts',
        detail: 'Official NCERT for art & architecture. Ch 1-4 cover Indus Valley art, Buddhist architecture (Sanchi, Amaravati), temple architecture (Nagara, Dravida, Vesara styles). Essential for factual art/culture questions.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'History of Medieval India',
        author: 'Satish Chandra',
        detail: 'Though titled Medieval, Ch 1-2 provide excellent context on post-Gupta transition period (Harsha, Chalukyas, Pallavas). Use these chapters to bridge Ancient-Medieval gap.',
        type: 'standard',
        priority: 3,
      },
      // ── NCERTs ──
      {
        title: 'Themes in Indian History I (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Harappan Civilisation (Bricks, Beads, Bones); Ch 2: Mahajanapadas & early states (Kings, Farmers, Towns); Ch 3: Social hierarchy via Mahabharata; Ch 4: Buddhism & Jainism. All 4 chapters are directly tested in Prelims.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Exploring Society: India and Beyond (Class 6)',
        author: 'NCERT',
        detail: 'Ch 6: Indus Valley basics; Ch 7: Vedic Age overview. Builds conceptual foundation — read before R.S. Sharma for easier comprehension.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'The Gupta Era (Class 7 — Exploring Society Part I)',
        author: 'NCERT',
        detail: 'Ch 7 specifically covers Gupta achievements — science, literature, art. Good for quick revision of Gupta golden age.',
        type: 'ncert',
        priority: 3,
      },
      // ── Supplementary ──
      {
        title: 'Tamil Nadu State Board History (Class 11)',
        author: 'Tamil Nadu Govt',
        detail: 'Chapters on Sangam Age, Chola maritime empire, and South Indian dynasties are more detailed than NCERT. Freely available PDF — excellent for ancient South India coverage which is a frequent Prelims area.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  {
    subjectId: 'medieval-history',
    subjectTitle: 'Medieval Indian History',
    paper: 'GS-I',
    books: [
      {
        title: 'History of Medieval India',
        author: 'Satish Chandra',
        detail: 'The definitive medieval India text. Ch 1-5: Early medieval (Rajputs, Arab invasions); Ch 6-12: Delhi Sultanate (Slave to Lodi dynasties); Ch 13-22: Mughal Empire (Babur to Aurangzeb); Ch 23-26: Maratha rise, Sikh Empire, 18th century decline. Read fully.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Themes in Indian History II (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Traveller accounts (Al-Biruni, Ibn Battuta, Bernier) — frequently tested; Ch 2: Bhakti-Sufi traditions — high PYQ frequency; Ch 3: Vijayanagara Empire; Ch 4: Mughal agrarian relations. All chapters are Prelims-critical.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Exploring Society Part I (Class 7)',
        author: 'NCERT',
        detail: 'Ch 4: Delhi Sultanate; Ch 5: Vijayanagara & Bahmani; Ch 6: Mughal Empire. Provides accessible overview before Satish Chandra deep-dive.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'Medieval India: From Sultanat to the Mughals (Part I & II)',
        author: 'Satish Chandra (Delhi Sultanate + Mughal Empire)',
        detail: 'Expanded two-volume edition with more detail on Sultanate administration, iqta system, Mughal mansabdari, revenue systems. For those needing depth beyond the single-volume edition — useful for Mains answers.',
        type: 'reference',
        priority: 3,
      },
      {
        title: 'Tamil Nadu State Board History (Class 11)',
        author: 'Tamil Nadu Govt',
        detail: 'Chapters on Chola administration, Pandya dynasty, and Bhakti movement in South India supplement NCERT coverage. Particularly strong on temple architecture and South Indian cultural history.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  {
    subjectId: 'modern-history',
    subjectTitle: 'Modern Indian History',
    paper: 'GS-I',
    books: [
      {
        title: "India's Struggle for Independence",
        author: 'Bipan Chandra',
        detail: 'The Bible of modern Indian history for UPSC. 39 chapters covering 1857 Revolt through Independence. Key sections: Ch 2-5 (1857 & aftermath); Ch 10-15 (Rise of Congress, Extremists, Moderates); Ch 16-20 (Gandhian era — Non-Cooperation, Civil Disobedience, Quit India); Ch 30-35 (Communalism, Partition, Princely States). Absolutely non-negotiable.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'A Brief History of Modern India',
        author: 'Rajiv Ahir (Spectrum)',
        detail: 'Concise alternative/supplement to Bipan Chandra. Excellent chronological tables, one-page summaries per movement, and fact-dense format ideal for Prelims revision. Covers socio-religious reform movements (Brahmo Samaj, Arya Samaj, etc.) more comprehensively than Bipan Chandra.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Themes in Indian History III (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Colonial agrarian policies (Permanent Settlement, Ryotwari); Ch 2: 1857 Revolt (Rebels and the Raj); Ch 3: Gandhian nationalism; Ch 4: Constituent Assembly debates. All chapters appear verbatim in Prelims questions.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'India and the Contemporary World II (Class 10)',
        author: 'NCERT',
        detail: 'Ch 2: Nationalism in India (Non-Cooperation to Civil Disobedience with clear timelines); Ch 5: Print culture and press in national movement. Good conceptual foundation before Bipan Chandra.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'History of Modern India',
        author: 'Bipan Chandra (different from Struggle book)',
        detail: 'Covers British administrative, economic, and educational policies in India. Chapters on economic drain theory, deindustrialization, and land revenue systems complement the Struggle book. Read Ch 1-10 on colonial policies.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  {
    subjectId: 'world-history',
    subjectTitle: 'World History',
    paper: 'GS-I',
    books: [
      {
        title: 'Mastering Modern World History',
        author: 'Norman Lowe',
        detail: 'The standard text for UPSC world history. Key chapters: Ch 1-2 (WWI causes & events); Ch 4-6 (Rise of Fascism, Nazism); Ch 7-9 (WWII); Ch 14-16 (Cold War, NATO, Warsaw Pact); Ch 19-21 (Decolonization of Africa & Asia); Ch 23-25 (EU, UN, Globalization). Focus on events from 18th century onwards as per syllabus.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'India and the Contemporary World I (Class 9)',
        author: 'NCERT',
        detail: 'Ch 1: French Revolution (causes, events, legacy) — very frequently tested; Ch 2: Russian Revolution & Socialism in Europe; Ch 3: Nazism & Rise of Hitler. These 3 chapters form the NCERT backbone for world history Prelims.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'India and the Contemporary World II (Class 10)',
        author: 'NCERT',
        detail: 'Ch 1: Rise of Nationalism in Europe (unification of Germany & Italy); Ch 3: Making of a Global World (colonialism, trade routes); Ch 4: Age of Industrialisation. Bridge NCERT concepts to Norman Lowe depth.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Themes in World History (Class 11)',
        author: 'NCERT',
        detail: 'Ch 3: Roman Empire; Ch 4: Central Islamic Lands; Ch 5: Nomadic Empires (Mongols); Ch 6: Industrial Revolution; Ch 7: Displacing Indigenous Peoples. Provides pre-modern world context that NCERTs 9-10 skip.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'World History by Arjun Dev',
        author: 'Arjun Dev',
        detail: 'Old NCERT-style coverage of world history. Chapters on American Revolution, Unification of Italy & Germany, Chinese Revolution, and decolonization are more exam-focused than Norman Lowe. Good supplement for specific topics.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  // Post-Independence (maps to 'post-independence' in syllabus)
  {
    subjectId: 'post-independence',
    subjectTitle: 'Post-Independence India',
    paper: 'GS-I',
    books: [
      {
        title: "India's Foreign Policy Since Independence",
        author: 'Rajiv Sikri',
        detail: 'Covers India-China, India-Pakistan, NAM, Look East Policy, nuclear doctrine. Read chapters on neighbourhood policy and India-US relations for Mains IR + post-independence crossover questions.',
        type: 'reference',
        priority: 2,
      },
      {
        title: "India Since Independence",
        author: 'Bipan Chandra',
        detail: 'The single most important book for post-1947 India. Part I (Ch 1-8): Nation-building, integration of princely states, linguistic reorganization; Part II (Ch 9-16): Nehruvian era, planning, foreign policy, Kashmir; Part III (Ch 17-25): Emergency, coalition era, economic reforms; Part IV (Ch 26-34): Caste, communalism, regionalism. Covers everything UPSC asks about post-independence.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Politics in India Since Independence (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Nation-building challenges; Ch 2: Planning era; Ch 3: Congress system; Ch 5: Emergency; Ch 6: Rise of regional parties; Ch 8: Regional aspirations; Ch 9: Indian politics recent trends. Directly mapped to UPSC syllabus — every chapter is testable.',
        type: 'ncert',
        priority: 1,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-I: GEOGRAPHY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'geography',
    subjectTitle: 'Indian & World Geography',
    paper: 'GS-I',
    books: [
      // ── Standard Textbooks ──
      {
        title: 'Certificate Physical and Human Geography',
        author: 'Goh Cheng Leong',
        detail: 'The cult-classic for physical geography. Part I: Ch 1-6 (Geomorphology — weathering, erosion, landforms); Part II: Ch 7-12 (Climatology — pressure belts, wind systems, precipitation); Part III: Ch 13-18 (Oceanography — currents, tides, salinity); Part IV: Ch 19-26 (Biogeography, soils, vegetation). Read fully for world physical geography.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Indian Geography',
        author: 'Majid Husain',
        detail: 'The standard reference for Indian geography. Key sections: Physical India (Himalayas, Plains, Peninsular Plateau, Islands); Climate & Monsoon; Drainage systems; Soils & Vegetation; Agriculture & Irrigation; Mineral & Energy resources; Industries & Transport; Population & Urbanization. Covers both physical and human geography of India comprehensively.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Geography of India',
        author: 'Khullar',
        detail: 'Alternative to Majid Husain with better maps and diagrams. Particularly strong on economic geography — industrial regions, agricultural patterns, mineral belts. Use as supplement for topics where Majid Husain feels insufficient.',
        type: 'standard',
        priority: 2,
      },
      {
        title: 'Oxford School Atlas',
        author: 'Oxford University Press',
        detail: 'Essential map reference. Practice locating mountain passes, river systems, national parks, industrial corridors, mineral belts, and cultural sites on maps. UPSC Prelims regularly tests map-based questions. Keep alongside while reading any geography book.',
        type: 'reference',
        priority: 1,
      },
      // ── NCERTs ──
      {
        title: 'Fundamentals of Physical Geography (Class 11)',
        author: 'NCERT',
        detail: 'Ch 2-3: Origin of Earth, Interior of Earth; Ch 4: Plate Tectonics & Continental Drift; Ch 5-6: Rocks, Minerals, Geomorphic Processes; Ch 7-10: Atmosphere (composition, radiation, circulation, precipitation); Ch 11: World Climates; Ch 12-13: Oceanography (temperature, salinity, currents); Ch 14: Biodiversity. Foundation for Goh Cheng Leong.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'India: Physical Environment (Class 11)',
        author: 'NCERT',
        detail: 'Ch 1-2: Physiographic divisions (Himalayas, Northern Plains, Peninsular Plateau, Coastal Plains, Islands); Ch 3: Drainage (Himalayan vs Peninsular rivers); Ch 4: Climate & Monsoon mechanism; Ch 5: Natural Vegetation; Ch 6: Natural Hazards & Disasters. Core Indian physical geography.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Fundamentals of Human Geography (Class 12)',
        author: 'NCERT',
        detail: 'Ch 2-3: World Population (distribution, density, composition); Ch 4: Human Development; Ch 5: Primary Activities (agriculture types worldwide); Ch 6-7: Secondary & Tertiary Activities (industrial location); Ch 8: Transport & Communication. Covers world human geography comprehensively.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'India: People and Economy (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Population distribution; Ch 2: Migration patterns; Ch 4: Human Settlements; Ch 5: Land Resources & Agriculture; Ch 6: Water Resources; Ch 7: Mineral & Energy Resources; Ch 8: Manufacturing Industries; Ch 9: Planning & Sustainable Development. Directly maps to UPSC Indian geography syllabus.',
        type: 'ncert',
        priority: 1,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-I: SOCIETY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'society',
    subjectTitle: 'Indian Society & Social Issues',
    paper: 'GS-I',
    books: [
      {
        title: 'Indian Society (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Indian Society structure; Ch 2: Demographic structure; Ch 3: Social institutions (caste, family, kinship); Ch 4: Market as social institution; Ch 5: Patterns of Social Inequality & Exclusion; Ch 6: Social movements. The primary source — most Mains questions can be answered from this alone.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Social Change and Development in India (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Structural Change (colonialism to modernity); Ch 2: Cultural Change; Ch 3: Constitutional framework for social change; Ch 4: Change & Development in Rural Society; Ch 5: Change & Development in Industrial Society; Ch 6: Globalisation & Social Change. Covers GS-I social change dimensions.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Social Problems in India',
        author: 'Ram Ahuja',
        detail: 'Detailed coverage of caste system, communalism, regionalism, secularism, women empowerment, population issues, and urbanization challenges. Chapters on communalism (Ch 12-14) and regionalism (Ch 15-16) are especially valuable for Mains.',
        type: 'standard',
        priority: 2,
      },
      {
        title: 'Society in India (Concepts, Theories and Recent Trends)',
        author: 'Ram Ahuja',
        detail: 'More theoretical companion to Social Problems. Covers sociological concepts (role, status, social stratification) that help frame Mains answers with academic depth. Focus on chapters about secularism, diversity, and globalization impact.',
        type: 'reference',
        priority: 3,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-II: POLITY & CONSTITUTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'polity',
    subjectTitle: 'Indian Polity & Constitution',
    paper: 'GS-II',
    books: [
      {
        title: 'Indian Polity',
        author: 'M. Laxmikanth',
        detail: 'THE cult-status UPSC book — no topper skips this. 82 chapters organized as: Part I (Ch 1-5): Constitutional framework & making; Part II (Ch 6-11): Citizenship, Fundamental Rights, DPSPs, Fundamental Duties; Part III (Ch 12-23): Union Government (President, PM, Parliament, Judiciary); Part IV (Ch 24-35): State Government; Part V (Ch 36-44): Local Government & Constitutional Bodies; Part VI (Ch 45-55): Non-Constitutional Bodies, Tribunals; Part VII (Ch 56-70): Political dynamics (parties, elections, emergency). Read every chapter, make notes from every table. This single book covers 80%+ of Polity questions.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Introduction to the Constitution of India',
        author: 'D.D. Basu',
        detail: 'More legalistic and detailed than Laxmikanth. Excellent for understanding constitutional interpretation, landmark Supreme Court judgements, and amendment analysis. Read chapters on Fundamental Rights (Art 14-32), Federal Structure, and Emergency provisions for Mains depth.',
        type: 'standard',
        priority: 2,
      },
      {
        title: 'Indian Constitution at Work (Class 11)',
        author: 'NCERT',
        detail: 'Ch 1: Constitution — Why & How; Ch 2: Rights in the Constitution; Ch 3: Election & Representation; Ch 4: Executive; Ch 5: Legislature; Ch 6: Judiciary; Ch 7: Federalism; Ch 8: Local Governments; Ch 9: Constitution as Living Document. Read before Laxmikanth — builds conceptual clarity.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Political Theory (Class 11)',
        author: 'NCERT',
        detail: 'Ch 1: Political Theory intro; Ch 2: Freedom; Ch 3: Equality; Ch 4: Social Justice; Ch 5: Rights; Ch 6: Citizenship; Ch 7: Nationalism; Ch 8: Secularism; Ch 9: Peace; Ch 10: Development. Provides philosophical foundations for GS-II & GS-IV (Ethics) answers.',
        type: 'ncert',
        priority: 2,
      },
      // ── Governance & Social Justice (GS-II sub-topic) ──
      {
        title: 'Governance in India',
        author: 'M. Laxmikanth',
        detail: 'Companion volume covering e-governance, citizens charters, RTI, social audit, self-help groups, role of civil society and NGOs. Directly maps to GS-II governance & social justice syllabus. Focus on Chapters covering transparency, accountability, and government schemes.',
        type: 'standard',
        priority: 2,
      },
      {
        title: '2nd ARC Reports',
        author: 'Administrative Reforms Commission',
        detail: 'Government of India reports. Key reports: 4th Report (Ethics in Governance); 5th Report (Public Order); 6th Report (Local Governance); 10th Report (Refurbishing Personnel Administration); 12th Report (Citizen Centric Administration); 13th Report (Organizational Structure). Read summaries and key recommendations — directly quoted in UPSC answer keys.',
        type: 'government',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-III: ECONOMY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'economy',
    subjectTitle: 'Indian Economy',
    paper: 'GS-III',
    books: [
      {
        title: 'Indian Economy',
        author: 'Ramesh Singh',
        detail: 'The most comprehensive economy book for UPSC. Part I (Ch 1-5): Growth, Development & Planning; Part II (Ch 6-10): Money, Banking & Financial Markets; Part III (Ch 11-15): Fiscal Policy, Taxation, Budget; Part IV (Ch 16-20): Agriculture; Part V (Ch 21-24): Industry; Part VI (Ch 25-28): External Sector (BOP, WTO, FDI/FII). Updated annually — always use latest edition.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Indian Economy: Performance and Policies',
        author: 'Uma Kapila',
        detail: 'Academic depth for Mains answer enrichment. Sections on economic reforms (1991 liberalization), poverty measurement methodologies (Tendulkar, Rangarajan committees), and inclusive growth are particularly strong. Use specific chapters as supplement to Ramesh Singh.',
        type: 'reference',
        priority: 3,
      },
      {
        title: 'Indian Economy — Key Concepts',
        author: 'Sankarganesh Karuppiah (Sriram IAS)',
        detail: 'Coaching notes turned book. Excellent concise treatment of banking (NPA, Basel norms, RBI monetary policy), financial markets (SEBI, mutual funds, derivatives), and government schemes. Popular among toppers for quick revision.',
        type: 'coaching',
        priority: 2,
      },
      // ── NCERTs ──
      {
        title: 'Indian Economic Development (Class 11)',
        author: 'NCERT',
        detail: 'Ch 1: Indian Economy on eve of Independence; Ch 2: Indian Economy 1950-90 (Planning era); Ch 3: Liberalisation, Privatisation, Globalisation; Ch 4: Poverty; Ch 5: Human Capital; Ch 6: Rural Development; Ch 7: Employment; Ch 8: Infrastructure; Ch 9: Environment & Sustainable Development; Ch 10: Comparative Development (India-China-Pakistan). Foundation for Ramesh Singh.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Macroeconomics (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: National Income concepts (GDP, GNP, NDP, NNP); Ch 2: Money & Banking (money supply, credit creation); Ch 3: Income Determination; Ch 4: Government Budget & Fiscal Policy (revenue/capital accounts, deficit types); Ch 5: Balance of Payments (current/capital account). Essential for understanding macro concepts tested in Prelims.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Microeconomics (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1-2: Consumer theory (not heavily tested); Ch 3-4: Production & Cost (basics useful); Ch 5-6: Market structures (perfect competition, monopoly). Lower priority than Macroeconomics but concepts appear in economy questions on market regulation.',
        type: 'ncert',
        priority: 3,
      },
      // ── Government Sources ──
      {
        title: 'Economic Survey of India',
        author: 'Ministry of Finance (Annual)',
        detail: 'Released before the Union Budget each year. Volume I: Analytical chapters on state of the economy, sectoral analysis, and policy recommendations. Volume II: Statistical tables. Focus on Summary chapter, Agriculture chapter, Industry chapter, and any new thematic chapters (e.g., circular economy, green growth). 5-8 Prelims questions come directly from latest Economic Survey.',
        type: 'government',
        priority: 1,
      },
      {
        title: 'Union Budget & Budget at a Glance',
        author: 'Ministry of Finance (Annual)',
        detail: 'Read the Budget Speech, Budget at a Glance document, and key allocations. Focus on: major scheme allocations, new taxes/cess, fiscal deficit targets, disinvestment targets, sector-specific announcements. Critical for both Prelims and Mains.',
        type: 'government',
        priority: 1,
      },
      {
        title: 'India Year Book',
        author: 'Publications Division, Ministry of I&B (Annual)',
        detail: 'Government of India annual reference. Key chapters: Chapter on Agriculture, Industry, Defence, Science & Technology, Welfare Schemes, and International Relations. Heavy factual content — good for Prelims fact-based questions. Read selectively (not cover-to-cover).',
        type: 'government',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-III: ENVIRONMENT & ECOLOGY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'environment',
    subjectTitle: 'Environment & Ecology',
    paper: 'GS-III',
    books: [
      {
        title: 'Environment',
        author: 'Shankar IAS Academy',
        detail: 'The cult-status book for environment — equivalent of Laxmikanth for Polity. Covers: Part I — Ecology basics (ecosystem, food chains, biogeochemical cycles); Part II — Biodiversity (hotspots, endemic species, IUCN Red List); Part III — Pollution (air, water, soil, noise); Part IV — Climate Change (UNFCCC, Kyoto, Paris Agreement, IPCC); Part V — Environmental legislation (EPA, Forest Conservation Act, Wildlife Protection Act, NGT); Part VI — International conventions (CBD, Ramsar, CITES, CMS). 15-20 Prelims questions come from environment — this book covers almost all.',
        type: 'coaching',
        priority: 1,
      },
      {
        title: 'Biology (Class 12) — Chapters 13-16',
        author: 'NCERT',
        detail: 'Ch 13: Organisms and Populations (ecology fundamentals, adaptations); Ch 14: Ecosystem (energy flow, nutrient cycling, ecological succession); Ch 15: Biodiversity and Conservation (species diversity, conservation strategies, in-situ/ex-situ); Ch 16: Environmental Issues (pollution, deforestation, greenhouse effect). These 4 chapters are MANDATORY reading — Prelims ecology questions are often verbatim from here.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Science (Class 10) — Environment chapters',
        author: 'NCERT',
        detail: 'Ch 15: Our Environment (food chains, ozone layer); Ch 16: Sustainable Management of Natural Resources (3Rs, water harvesting, forest management, Chipko movement). Builds basics before Class 12 biology and Shankar IAS.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'India: People and Economy (Class 12) — Chapter 9',
        author: 'NCERT',
        detail: 'Ch 9: Planning and Sustainable Development — covers sustainable development goals, Agenda 21, case studies of Indira Gandhi Canal Command Area and Integrated Tribal Development. Links geography with environment.',
        type: 'ncert',
        priority: 3,
      },
      // ── Government Sources ──
      {
        title: 'ENVIS (Environmental Information System) Bulletins',
        author: 'Ministry of Environment, Forest & Climate Change',
        detail: 'Free government portal with thematic bulletins on wetlands, biodiversity, pollution, climate change. Useful for Mains answers — provides latest government data and initiatives. Access at envis.nic.in.',
        type: 'government',
        priority: 3,
      },
      {
        title: 'Down to Earth Magazine',
        author: 'Centre for Science and Environment (CSE)',
        detail: 'Fortnightly magazine covering environmental issues, wildlife, pollution, climate policy, and Supreme Court environmental judgements. Best source for current affairs in environment. The annual "State of India\'s Environment" report is gold for Mains.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-III: SCIENCE & TECHNOLOGY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'science-tech',
    subjectTitle: 'Science & Technology',
    paper: 'GS-III',
    books: [
      {
        title: 'Science and Technology in India',
        author: 'Ravi P. Agrahari',
        detail: 'Most comprehensive S&T book for UPSC. Covers: Space Technology (ISRO missions, satellite types); Nuclear Energy (reactors, India\'s 3-stage programme); Defence Technology (missile systems, indigenous platforms); Biotechnology (GM crops, CRISPR, stem cells); IT & Cyber Security; Nano & Robotics. Updated annually with latest developments.',
        type: 'standard',
        priority: 1,
      },
      // ── NCERTs for General Science foundation ──
      {
        title: 'Science (Class 10)',
        author: 'NCERT',
        detail: 'Ch 1: Chemical Reactions; Ch 4: Carbon & Compounds; Ch 6: Life Processes; Ch 8: Heredity & Evolution (DNA basics — tested in biotech questions); Ch 10: Light (optics basics); Ch 12: Electricity; Ch 13: Magnetic Effects. Builds the science base needed for S&T current affairs questions.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'Biology (Class 11 & 12)',
        author: 'NCERT',
        detail: 'Class 11: Ch 1-5 (Cell Biology, Biomolecules — useful for biotech context). Class 12: Ch 6 (Molecular Basis of Inheritance — DNA, RNA, genetic engineering); Ch 9 (Strategies for Enhancement in Food Production — GM crops); Ch 10 (Microbes in Human Welfare — biotech applications). These chapters directly inform biotechnology and health science questions.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'Physics (Class 11 & 12) — Select chapters',
        author: 'NCERT',
        detail: 'Class 12: Ch 12 (Atoms — nuclear physics basics); Ch 13 (Nuclei — nuclear fission/fusion, radioactivity). Provides conceptual clarity for nuclear energy and space technology questions. Do not read the whole book — only these specific chapters.',
        type: 'ncert',
        priority: 3,
      },
      // ── Government Sources ──
      {
        title: 'ISRO Annual Report & Website',
        author: 'Indian Space Research Organisation',
        detail: 'Track latest missions: Chandrayaan, Gaganyaan, Aditya-L1, PSLV/GSLV launches. The annual report summarizes all missions, satellite deployments, and international collaborations. isro.gov.in is the primary source.',
        type: 'government',
        priority: 1,
      },
      {
        title: 'DST, DBT, DRDO Annual Reports',
        author: 'Dept of Science & Technology / Dept of Biotechnology / DRDO',
        detail: 'Key government S&T departments. DST covers research funding and Science & Technology Policy. DBT covers biotech regulation (GM crops, biosafety). DRDO covers defence technology (missile systems, radar, combat vehicles). Read annual report summaries.',
        type: 'government',
        priority: 2,
      },
      {
        title: 'Science Reporter Magazine',
        author: 'NISCAIR / CSIR',
        detail: 'Monthly government science magazine. Covers recent scientific achievements, ISRO updates, Indian research breakthroughs. Affordable and UPSC-focused — better than newspaper science sections for depth.',
        type: 'government',
        priority: 3,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-III: GENERAL SCIENCE (mapped to 'general-science' in syllabus)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'general-science',
    subjectTitle: 'General Science',
    paper: 'GS-III / Prelims',
    books: [
      {
        title: 'Science (Class 9)',
        author: 'NCERT',
        detail: 'Ch 1-3: Matter (states, atoms, molecules — chemistry basics); Ch 5-7: Cell biology, Tissues, Diversity in organisms; Ch 8-10: Motion, Force, Gravitation (physics basics); Ch 12: Sound; Ch 14-15: Natural Resources. Foundation for all general science Prelims questions.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Science (Class 10)',
        author: 'NCERT',
        detail: 'Ch 1: Chemical Reactions; Ch 2: Acids, Bases, Salts; Ch 4: Carbon Compounds; Ch 6: Life Processes; Ch 8: Heredity & Evolution; Ch 10: Light; Ch 12: Electricity; Ch 13: Magnetic Effects; Ch 14: Sources of Energy. Together with Class 9, these two NCERTs cover 90% of general science Prelims.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Lucent General Science',
        author: "Lucent's Publication",
        detail: 'Pocket-sized fact-dense reference covering Physics, Chemistry, Biology in one volume. Organized as objective-question-friendly bullets. Best used for Prelims revision AFTER reading NCERTs — not as primary source. Covers diseases, vitamins, scientific instruments, inventions, etc.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-IV: ETHICS, INTEGRITY & APTITUDE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'ethics',
    subjectTitle: 'Ethics, Integrity & Aptitude',
    paper: 'GS-IV',
    books: [
      {
        title: 'Ethics, Integrity and Aptitude',
        author: 'G. Subba Rao & P.N. Roy Chowdhury',
        detail: 'The most complete GS-IV book. Covers: Part I — Moral thinkers (Aristotle, Kant, Gandhi, Ambedkar, Kautilya); Part II — Ethics in public administration (accountability, transparency, RTI); Part III — Emotional Intelligence; Part IV — Attitude (content, structure, functions); Part V — Aptitude & foundational values for civil service; Part VI — Case studies with model answers. The case study section is invaluable for Paper IV preparation.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Lexicon for Ethics, Integrity & Aptitude',
        author: 'Niraj Kumar (Chronicle)',
        detail: 'Popular among toppers for its concise definitions and structured coverage. Organized alphabetically and thematically — covers every GS-IV keyword (Accountability, Compassion, Conflict of Interest, Emotional Intelligence, Integrity, Probity, etc.) with real-world examples. Excellent for last-mile revision.',
        type: 'standard',
        priority: 1,
      },
      {
        title: '4th Report of 2nd ARC: Ethics in Governance',
        author: 'Administrative Reforms Commission',
        detail: 'Government report directly on the GS-IV syllabus. Covers: Ethical framework for governance, Conflict of interest, Code of Ethics vs Code of Conduct for civil servants, Whistleblower protection, Citizens\' Charters, Social Audit. Recommended by UPSC in its syllabus description.',
        type: 'government',
        priority: 1,
      },
      {
        title: 'Political Theory (Class 11)',
        author: 'NCERT',
        detail: 'Ch 2: Freedom; Ch 3: Equality; Ch 4: Social Justice; Ch 5: Rights; Ch 8: Secularism. Provides philosophical grounding for ethics answers. Concepts of justice (Rawls), liberty (Mill, Berlin), and equality directly applicable to GS-IV Section A.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'Previous Year GS-IV Papers (2013-present)',
        author: 'UPSC',
        detail: 'Paper IV is unique — reading model answers to past case studies is as important as reading books. Analyze the pattern: Section A (theory — thinkers, concepts) and Section B (case studies — 6 scenarios with word limits). Practice writing 150-word case study answers with ethical frameworks.',
        type: 'reference',
        priority: 1,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-I: ART & CULTURE (currently part of ancient/medieval history in syllabus)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'art-culture',
    subjectTitle: 'Art & Culture',
    paper: 'GS-I',
    books: [
      {
        title: 'Indian Art and Culture',
        author: 'Nitin Singhania',
        detail: 'The single most important Art & Culture book for UPSC. Covers: Ch 1-3: Indian Architecture (temple styles — Nagara, Dravida, Vesara; rock-cut caves; Indo-Islamic architecture); Ch 4-6: Indian Painting (Ajanta, Mughal, Rajasthani, Pahari miniatures); Ch 7-8: Performing Arts (Classical dances — Bharatanatyam, Kathak, etc.; Theatre forms); Ch 9-10: Music (Carnatic, Hindustani); Ch 11-14: Handicrafts, Festivals, GI-tagged products, UNESCO sites. 8-12 Prelims questions come from this domain — this book is essential.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Introduction to Indian Art (Class 11 Fine Arts)',
        author: 'NCERT',
        detail: 'Part I (Ancient): Indus Valley art, Buddhist art (Gandhara, Mathura schools), temple architecture evolution. Part II (Medieval): Indo-Islamic architecture, Mughal paintings, Deccan paintings. Concise and factually precise — often the exact source for Prelims questions on art and architecture.',
        type: 'ncert',
        priority: 1,
      },
      {
        title: 'Living Craft Traditions of India (Class 11 Fine Arts)',
        author: 'NCERT',
        detail: 'Covers folk and tribal arts, textile traditions (Kalamkari, Phulkari, Bandhani, Patola), pottery, metal craft, and other living traditions. These topics increasingly appear in Prelims under Art & Culture and GI-tag based questions.',
        type: 'ncert',
        priority: 2,
      },
      {
        title: 'CCRT (Centre for Cultural Resources and Training) Website',
        author: 'Ministry of Culture, Government of India',
        detail: 'Free online resource covering classical dances, music forms, puppetry, folk traditions, and cultural institutions. The "Culture" section on India.gov.in and CCRT portal are official sources for government-recognized art forms. Useful for verifying facts from Nitin Singhania.',
        type: 'government',
        priority: 3,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-II: INTERNATIONAL RELATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'international-relations',
    subjectTitle: 'International Relations',
    paper: 'GS-II',
    books: [
      {
        title: 'International Relations',
        author: 'Pavneet Singh',
        detail: 'Most popular IR book among recent toppers. Covers: India\'s neighbourhood policy (Pakistan, China, Nepal, Sri Lanka, Bangladesh, Myanmar, Afghanistan); India & major powers (US, Russia, EU, Japan, Australia); Multilateral organizations (UN, WTO, BRICS, SCO, QUAD, G20); India\'s Act East Policy, Connect Central Asia, Look West policy. Updated regularly with current developments.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'India\'s Foreign Policy (Rajiv Sikri) / Challenge and Strategy (Rajesh Rajagopalan)',
        author: 'Rajiv Sikri / Rajesh Rajagopalan',
        detail: 'Rajiv Sikri covers India\'s bilateral relations and neighbourhood policy with nuanced analysis. Rajagopalan adds strategic/security dimensions. Together they cover strategic partnerships, nuclear doctrine, maritime security, and India\'s role in international order. For Mains depth.',
        type: 'reference',
        priority: 2,
      },
      {
        title: 'Contemporary World Politics (Class 12)',
        author: 'NCERT',
        detail: 'Ch 1: Cold War era (bipolar world); Ch 2: End of bipolarity (Soviet collapse); Ch 3: US Hegemony; Ch 4: Alternative centres of power (EU, ASEAN, China); Ch 5: South Asian politics; Ch 6: International organisations (UN, IMF, WTO); Ch 7: Security; Ch 8: Environment & natural resources; Ch 9: Globalisation. Essential NCERT — many Prelims questions sourced from this.',
        type: 'ncert',
        priority: 1,
      },
      // ── Government Sources ──
      {
        title: 'Ministry of External Affairs Annual Report',
        author: 'MEA, Government of India',
        detail: 'Provides India\'s official positions on bilateral relations, multilateral engagements, diaspora affairs, and development partnerships. Useful for understanding India\'s stated foreign policy positions — critical for Mains GS-II answers.',
        type: 'government',
        priority: 2,
      },
      {
        title: 'MEA Website — Bilateral Briefs',
        author: 'Ministry of External Affairs',
        detail: 'mea.gov.in has country-wise bilateral briefs summarizing India\'s relationship with every country. Updated after each summit/visit. Gold standard for factual accuracy in IR Mains answers.',
        type: 'government',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GS-III: INTERNAL SECURITY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'internal-security',
    subjectTitle: 'Internal Security',
    paper: 'GS-III',
    books: [
      {
        title: 'Internal Security & Disaster Management',
        author: 'Ashok Kumar & Vipul Anekant',
        detail: 'Comprehensive coverage of: Left Wing Extremism (Naxalism — history, spread, SAMADHAN strategy); Terrorism (J&K, NE India, global jihad, lone wolf); Border management (BSF, ITBP, fencing, technology); Cyber security (CERT-In, National Cyber Security Policy); Role of media & social media in security; Money laundering; Organized crime; Disaster management (NDMA, SDMA, NDRF). Covers entire GS-III security syllabus.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Challenges to Internal Security of India',
        author: 'Ashok Kumar (another edition by same domain experts)',
        detail: 'Alternative/earlier edition focusing specifically on: Terrorism and insurgency in NE India (ULFA, NSCN); Cross-border terrorism; Illegal migration (Rohingya, Bangladesh border); Drug trafficking routes; Arms trafficking. Use chapters on NE insurgency and border challenges as supplement.',
        type: 'standard',
        priority: 2,
      },
      {
        title: '5th Report of 2nd ARC: Public Order',
        author: 'Administrative Reforms Commission',
        detail: 'Government committee recommendations on: Police reforms (Prakash Singh vs Union of India directives); Intelligence apparatus reforms; Centre-State coordination in internal security; Community policing; Disaster management framework. Key government source for Mains answers.',
        type: 'government',
        priority: 2,
      },
      {
        title: 'MHA Annual Report',
        author: 'Ministry of Home Affairs, Government of India',
        detail: 'Annual report covering: Border management, Internal security operations, Police modernization, Cyber crime statistics, Naxal violence data, NE insurgency status, disaster management updates. Official data source — essential for factual Mains answers.',
        type: 'government',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CURRENT AFFAIRS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'current-affairs',
    subjectTitle: 'Current Affairs',
    paper: 'All Papers',
    books: [
      // ── Daily Sources ──
      {
        title: 'The Hindu / Indian Express',
        author: 'Daily Newspaper',
        detail: 'Read ONE newspaper daily (The Hindu preferred, Indian Express is equally good). Focus sections: Page 1 (national news), Editorial page (opinion for Mains perspectives), Economy page, International page. Spend 45-60 min daily. The Hindu editorial and Op-Ed pieces are frequently the basis for Mains GS questions.',
        type: 'reference',
        priority: 1,
      },
      // ── Government Sources ──
      {
        title: 'PIB (Press Information Bureau)',
        author: 'Government of India',
        detail: 'Daily government press releases on schemes, policies, bilateral meetings, cabinet decisions. pib.gov.in — read daily summary. PIB is THE source for government schemes and policy announcements tested in Prelims. Many toppers rely on PIB more than newspapers.',
        type: 'government',
        priority: 1,
      },
      {
        title: 'Yojana Magazine',
        author: 'Publications Division, Ministry of I&B (Monthly)',
        detail: 'Monthly government magazine on development themes. Each issue focuses on one theme (e.g., Digital India, Women Empowerment, Rural Development, Water Conservation). Articles written by domain experts and bureaucrats. Provides ready-made Mains answer content. Rs 22/issue.',
        type: 'government',
        priority: 1,
      },
      {
        title: 'Kurukshetra Magazine',
        author: 'Publications Division, Ministry of I&B (Monthly)',
        detail: 'Monthly magazine focused on rural development, agriculture, and Panchayati Raj. Each issue covers one theme with scheme details and ground-level implementation data. Excellent for GS-II (governance) and GS-III (agriculture, rural development) Mains answers.',
        type: 'government',
        priority: 2,
      },
      // ── Monthly Compilations ──
      {
        title: 'Monthly Current Affairs Compilation',
        author: 'Vision IAS / Drishti IAS / Insights on India',
        detail: 'Monthly magazine-format compilations covering: government schemes, international events, summits, reports (NITI Aayog, World Bank, UN), awards, sports, science breakthroughs. Choose ONE source and follow consistently. Most toppers use Vision IAS or Drishti IAS monthly compilations.',
        type: 'coaching',
        priority: 1,
      },
      {
        title: 'Manorama Yearbook / India Year Book',
        author: 'Malayala Manorama / Publications Division',
        detail: 'Annual reference — Manorama Yearbook covers India + World current affairs, general knowledge, who\'s who. India Year Book (government publication) has official data on all ministries and departments. Read India Year Book chapters on: Agriculture, Welfare, Defence, S&T, International Relations.',
        type: 'reference',
        priority: 2,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CSAT (Paper II)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'csat',
    subjectTitle: 'CSAT (Civil Services Aptitude Test)',
    paper: 'Paper-II (Qualifying)',
    books: [
      {
        title: 'CSAT Paper II Manual',
        author: 'TMH (Tata McGraw Hill)',
        detail: 'Comprehensive CSAT preparation covering: Comprehension passages (strategy + practice); Logical Reasoning (syllogisms, Venn diagrams, blood relations, direction sense); Analytical Ability (data interpretation, data sufficiency); Quantitative Aptitude (arithmetic, algebra, geometry basics); Decision Making. Although qualifying (33%), many aspirants fail here — do not neglect.',
        type: 'standard',
        priority: 1,
      },
      {
        title: 'Verbal & Non-Verbal Reasoning',
        author: 'R.S. Aggarwal',
        detail: 'The classic reasoning book. Relevant sections for CSAT: Verbal Reasoning (Analogies, Classification, Series, Coding-Decoding, Blood Relations, Direction Sense, Syllogisms); Non-Verbal Reasoning (Series, Analogy, Classification, Mirror/Water Images). Practice chapters selectively — not all sections are UPSC-relevant.',
        type: 'standard',
        priority: 2,
      },
      {
        title: 'Quantitative Aptitude',
        author: 'R.S. Aggarwal',
        detail: 'Focus on: Percentage, Profit & Loss, Simple & Compound Interest, Ratio & Proportion, Time & Work, Time Speed Distance, Data Interpretation (tables, bar charts, pie charts). CSAT math is Class 10 level — do not over-prepare. Practice speed and accuracy over difficulty.',
        type: 'standard',
        priority: 2,
      },
      {
        title: 'Previous Year CSAT Papers (2011-present)',
        author: 'UPSC',
        detail: 'Solve all CSAT papers from 2011 onwards. Pattern analysis shows: ~8-10 comprehension questions, ~6-8 logical reasoning, ~5-6 quantitative aptitude, ~4-5 decision making per paper. The comprehension passages are the highest-scoring section — practice reading speed.',
        type: 'reference',
        priority: 1,
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ESSAY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    subjectId: 'essay',
    subjectTitle: 'Essay Paper',
    paper: 'Essay',
    books: [
      {
        title: 'Previous Year UPSC Essays with Toppers\' Copies',
        author: 'UPSC / Various (ForumIAS, Civilsdaily)',
        detail: 'Read 50+ past UPSC essay topics (2013-present). Analyze topper answer scripts (available on ForumIAS) for: structure (introduction-body-conclusion pattern), multidimensional approach (social, economic, political, ethical angles), use of examples (Indian + international), word economy in 1000-1200 words. Practice writing 2 essays per week timed at 60-70 minutes each.',
        type: 'reference',
        priority: 1,
      },
      {
        title: 'Essay Strategy + Practice',
        author: 'Drishti IAS / Vision IAS',
        detail: 'Coaching institutes offer structured essay writing programmes with: Essay frameworks, quotation banks, essay templates, weekly essay tests with evaluation. Drishti IAS essay guidance notes (free PDF) provide good structural templates. Vision IAS essay test series is highly regarded.',
        type: 'coaching',
        priority: 2,
      },
      {
        title: 'Newspaper Editorials (The Hindu / Indian Express)',
        author: 'Daily Reading',
        detail: 'The best essay preparation is daily editorial reading. The Hindu editorial page and Indian Express "Explained" section provide: analytical frameworks, argumentative structure, use of data/examples, balanced perspectives. Maintain an "essay quotes & examples" notebook from editorial reading.',
        type: 'reference',
        priority: 1,
      },
    ],
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CROSS-CUTTING NCERT MASTER LIST
// Complete list of NCERTs relevant for UPSC, organized by class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NCERTBook {
  class: number
  subject: string
  title: string
  relevantSubjects: string[] // maps to subjectIds
  chapters: string // which chapters to focus on
  priority: 1 | 2 | 3
}

export const NCERT_MASTER_LIST: NCERTBook[] = [
  // ── Class 6 ──
  { class: 6, subject: 'Social Science', title: 'Exploring Society: India and Beyond', relevantSubjects: ['ancient-history', 'geography', 'polity'], chapters: 'Ch 2-3 (Geography basics), Ch 4-7 (History foundations), Ch 10-12 (Governance)', priority: 2 },

  // ── Class 7 ──
  { class: 7, subject: 'Social Science', title: 'Exploring Society: India and Beyond Part I', relevantSubjects: ['medieval-history', 'geography', 'polity'], chapters: 'Ch 1-3 (Geography of India), Ch 4-7 (Medieval History), Ch 8-10 (Constitution basics)', priority: 2 },

  // ── Class 8 ──
  // (Not in the manifest but standard NCERT for UPSC)
  { class: 8, subject: 'History', title: 'Our Pasts III (Part 1 & 2)', relevantSubjects: ['modern-history'], chapters: 'Part 1: Ch 1-5 (Company rule to 1857); Part 2: Ch 6-10 (Nationalism, Reforms, Making of modern India)', priority: 2 },
  { class: 8, subject: 'Geography', title: 'Resources and Development', relevantSubjects: ['geography'], chapters: 'Ch 1: Resources; Ch 2: Land, Soil; Ch 3: Mineral/Power; Ch 4: Agriculture; Ch 5: Industries; Ch 6: Human Resources', priority: 3 },
  { class: 8, subject: 'Civics', title: 'Social and Political Life III', relevantSubjects: ['polity'], chapters: 'Ch 1: Constitution; Ch 2: Understanding Secularism; Ch 3: Parliament; Ch 4: Judiciary; Ch 8: Confronting Marginalisation', priority: 3 },

  // ── Class 9 ──
  { class: 9, subject: 'History', title: 'India and the Contemporary World I', relevantSubjects: ['world-history'], chapters: 'Ch 1: French Revolution; Ch 2: Russian Revolution; Ch 3: Nazism', priority: 1 },
  { class: 9, subject: 'Geography', title: 'Contemporary India I', relevantSubjects: ['geography'], chapters: 'Ch 1: India Size & Location; Ch 2: Physical Features; Ch 3: Drainage; Ch 4: Climate; Ch 5: Natural Vegetation & Wildlife; Ch 6: Population', priority: 2 },
  { class: 9, subject: 'Civics', title: 'Democratic Politics I', relevantSubjects: ['polity'], chapters: 'Ch 1: What is Democracy; Ch 2: Constitutional Design; Ch 3: Electoral Politics; Ch 4: Working of Institutions; Ch 5: Democratic Rights', priority: 3 },
  { class: 9, subject: 'Economics', title: 'Economics', relevantSubjects: ['economy'], chapters: 'Ch 1: Village of Palampur; Ch 2: People as Resource; Ch 3: Poverty; Ch 4: Food Security', priority: 3 },
  { class: 9, subject: 'Science', title: 'Science', relevantSubjects: ['general-science', 'science-tech'], chapters: 'All chapters for general science foundation', priority: 2 },

  // ── Class 10 ──
  { class: 10, subject: 'History', title: 'India and the Contemporary World II', relevantSubjects: ['world-history', 'modern-history'], chapters: 'Ch 1: Nationalism in Europe; Ch 2: Nationalism in India; Ch 3: Making of Global World; Ch 4: Industrialisation', priority: 1 },
  { class: 10, subject: 'Geography', title: 'Contemporary India II', relevantSubjects: ['geography'], chapters: 'Ch 1: Resources & Development; Ch 3: Water Resources; Ch 4: Agriculture; Ch 5: Minerals & Energy; Ch 6: Manufacturing; Ch 7: Lifelines of National Economy', priority: 2 },
  { class: 10, subject: 'Civics', title: 'Democratic Politics II', relevantSubjects: ['polity'], chapters: 'Ch 1: Power Sharing; Ch 2: Federalism; Ch 3: Democracy & Diversity; Ch 4: Gender, Religion, Caste; Ch 5: Popular Struggles; Ch 7: Outcomes of Democracy', priority: 2 },
  { class: 10, subject: 'Economics', title: 'Understanding Economic Development', relevantSubjects: ['economy'], chapters: 'Ch 1: Development; Ch 2: Sectors; Ch 3: Money & Credit; Ch 4: Globalisation; Ch 5: Consumer Rights', priority: 2 },
  { class: 10, subject: 'Science', title: 'Science', relevantSubjects: ['general-science', 'environment'], chapters: 'Ch 6: Life Processes; Ch 8: Heredity; Ch 15: Our Environment; Ch 16: Sustainable Management', priority: 1 },

  // ── Class 11 ──
  { class: 11, subject: 'History', title: 'Themes in World History', relevantSubjects: ['world-history'], chapters: 'Ch 1-7: Ancient civilizations to Industrial Revolution', priority: 2 },
  { class: 11, subject: 'Geography', title: 'Fundamentals of Physical Geography', relevantSubjects: ['geography'], chapters: 'All 14 chapters — comprehensive physical geography', priority: 1 },
  { class: 11, subject: 'Geography', title: 'India: Physical Environment', relevantSubjects: ['geography'], chapters: 'All 6 chapters — Indian physical geography', priority: 1 },
  { class: 11, subject: 'Political Science', title: 'Indian Constitution at Work', relevantSubjects: ['polity'], chapters: 'All 9 chapters — Constitution fundamentals', priority: 1 },
  { class: 11, subject: 'Political Science', title: 'Political Theory', relevantSubjects: ['polity', 'ethics'], chapters: 'All 10 chapters — political philosophy foundations', priority: 2 },
  { class: 11, subject: 'Economics', title: 'Indian Economic Development', relevantSubjects: ['economy'], chapters: 'All 10 chapters — Indian economic history and policy', priority: 1 },
  { class: 11, subject: 'Fine Arts', title: 'An Introduction to Indian Art', relevantSubjects: ['art-culture', 'ancient-history', 'medieval-history'], chapters: 'Part I: Ancient art & architecture; Part II: Medieval art & architecture', priority: 1 },
  { class: 11, subject: 'Biology', title: 'Biology (Cell Biology + Biomolecules)', relevantSubjects: ['science-tech', 'general-science'], chapters: 'Ch 1-5: Cell biology fundamentals for biotech context', priority: 3 },

  // ── Class 12 ──
  { class: 12, subject: 'History', title: 'Themes in Indian History I', relevantSubjects: ['ancient-history'], chapters: 'Ch 1: Harappan; Ch 2: Mahajanapadas; Ch 3: Social hierarchies; Ch 4: Buddhism & Jainism', priority: 1 },
  { class: 12, subject: 'History', title: 'Themes in Indian History II', relevantSubjects: ['medieval-history'], chapters: 'Ch 1: Travellers; Ch 2: Bhakti-Sufi; Ch 3: Vijayanagara; Ch 4: Mughal agrarian', priority: 1 },
  { class: 12, subject: 'History', title: 'Themes in Indian History III', relevantSubjects: ['modern-history'], chapters: 'Ch 1: Colonial countryside; Ch 2: 1857 Revolt; Ch 3: Gandhian nationalism; Ch 4: Constitution making', priority: 1 },
  { class: 12, subject: 'Geography', title: 'Fundamentals of Human Geography', relevantSubjects: ['geography'], chapters: 'Ch 2-8: Population, Activities, Transport', priority: 1 },
  { class: 12, subject: 'Geography', title: 'India: People and Economy', relevantSubjects: ['geography', 'environment'], chapters: 'Ch 1-9: Population to Sustainable Development', priority: 1 },
  { class: 12, subject: 'Political Science', title: 'Politics in India Since Independence', relevantSubjects: ['post-independence', 'polity'], chapters: 'All 9 chapters — post-1947 Indian politics', priority: 1 },
  { class: 12, subject: 'Political Science', title: 'Contemporary World Politics', relevantSubjects: ['international-relations'], chapters: 'All 9 chapters — Cold War to Globalisation', priority: 1 },
  { class: 12, subject: 'Economics', title: 'Macroeconomics', relevantSubjects: ['economy'], chapters: 'Ch 1: National Income; Ch 2: Money & Banking; Ch 3: Income Determination; Ch 4: Govt Budget; Ch 5: BOP', priority: 1 },
  { class: 12, subject: 'Sociology', title: 'Indian Society', relevantSubjects: ['society'], chapters: 'Ch 1-6: Demographics, Social institutions, Inequality, Social movements', priority: 1 },
  { class: 12, subject: 'Sociology', title: 'Social Change and Development in India', relevantSubjects: ['society'], chapters: 'Ch 1-6: Structural change, Rural/Industrial development, Globalisation', priority: 1 },
  { class: 12, subject: 'Biology', title: 'Biology', relevantSubjects: ['environment', 'science-tech'], chapters: 'Ch 6: Molecular Inheritance (DNA/RNA); Ch 9: Food Production; Ch 10: Microbes; Ch 13-16: Ecology & Environment', priority: 1 },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GOVERNMENT SOURCES MASTER LIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GovernmentSource {
  title: string
  publisher: string
  frequency: 'daily' | 'monthly' | 'annual' | 'periodic'
  url: string
  relevantSubjects: string[]
  detail: string
  priority: 1 | 2 | 3
}

export const GOVERNMENT_SOURCES: GovernmentSource[] = [
  {
    title: 'Press Information Bureau (PIB)',
    publisher: 'Government of India',
    frequency: 'daily',
    url: 'https://pib.gov.in',
    relevantSubjects: ['current-affairs', 'economy', 'science-tech', 'polity'],
    detail: 'Daily press releases on government schemes, policy decisions, cabinet approvals, bilateral meetings. The single most important government source for UPSC current affairs. Read daily summaries.',
    priority: 1,
  },
  {
    title: 'Yojana Magazine',
    publisher: 'Publications Division, Ministry of I&B',
    frequency: 'monthly',
    url: 'https://publicationsdivision.nic.in',
    relevantSubjects: ['current-affairs', 'economy', 'polity', 'society'],
    detail: 'Each issue covers one development theme with expert articles. Themes include: Digital India, Women Empowerment, Agriculture, Health, Education, Rural Development. Provides Mains-ready content.',
    priority: 1,
  },
  {
    title: 'Kurukshetra Magazine',
    publisher: 'Publications Division, Ministry of I&B',
    frequency: 'monthly',
    url: 'https://publicationsdivision.nic.in',
    relevantSubjects: ['current-affairs', 'economy', 'society'],
    detail: 'Focused on rural development, agriculture, Panchayati Raj. Each issue provides scheme-level detail on rural India programmes. Excellent for GS-III agriculture and rural development questions.',
    priority: 2,
  },
  {
    title: 'Economic Survey',
    publisher: 'Ministry of Finance',
    frequency: 'annual',
    url: 'https://www.indiabudget.gov.in',
    relevantSubjects: ['economy'],
    detail: 'Released before Union Budget. Volume I has analytical chapters; Volume II has data tables. Focus on summary, thematic chapters, and key statistics. 5-8 Prelims questions sourced from here annually.',
    priority: 1,
  },
  {
    title: 'Union Budget Documents',
    publisher: 'Ministry of Finance',
    frequency: 'annual',
    url: 'https://www.indiabudget.gov.in',
    relevantSubjects: ['economy', 'current-affairs'],
    detail: 'Budget Speech, Budget at a Glance, Expenditure Profile, Revenue Profile. Track: fiscal deficit targets, key scheme allocations, tax changes, disinvestment plans.',
    priority: 1,
  },
  {
    title: 'India Year Book',
    publisher: 'Publications Division, Ministry of I&B',
    frequency: 'annual',
    url: 'https://publicationsdivision.nic.in',
    relevantSubjects: ['current-affairs', 'polity', 'economy', 'science-tech'],
    detail: 'Comprehensive reference on all government ministries and departments. Key chapters: Land & People, Agriculture, Commerce, Defence, Education, Energy, Environment, Health, Industry, International Relations, Science & Technology, Welfare.',
    priority: 2,
  },
  {
    title: 'NITI Aayog Reports & Publications',
    publisher: 'NITI Aayog',
    frequency: 'periodic',
    url: 'https://niti.gov.in',
    relevantSubjects: ['economy', 'polity', 'society'],
    detail: 'Key publications: SDG India Index, Composite Water Management Index, India Innovation Index, Health Index, School Education Quality Index. These indices and their state rankings frequently appear in Prelims and Mains.',
    priority: 2,
  },
  {
    title: 'ISRO Website & Annual Report',
    publisher: 'Indian Space Research Organisation',
    frequency: 'periodic',
    url: 'https://www.isro.gov.in',
    relevantSubjects: ['science-tech'],
    detail: 'Track launches (PSLV/GSLV/SSLV), missions (Chandrayaan, Gaganyaan, Aditya-L1), satellite programmes (NavIC, IRNSS, GAGAN). Annual report summarizes all activities.',
    priority: 1,
  },
  {
    title: 'Down to Earth Magazine',
    publisher: 'Centre for Science and Environment (CSE)',
    frequency: 'monthly',
    url: 'https://www.downtoearth.org.in',
    relevantSubjects: ['environment', 'current-affairs'],
    detail: 'Best source for environment current affairs. Covers: wildlife, pollution, climate policy, Supreme Court environmental orders, international environmental conventions. Annual "State of India\'s Environment" report is essential.',
    priority: 1,
  },
  {
    title: 'Science Reporter',
    publisher: 'NISCAIR / CSIR',
    frequency: 'monthly',
    url: 'https://www.niscpr.res.in',
    relevantSubjects: ['science-tech'],
    detail: 'Government science monthly magazine covering Indian research achievements, ISRO updates, DRDO developments, biotech advances. More UPSC-relevant than general science magazines.',
    priority: 3,
  },
  {
    title: 'Ministry of External Affairs — Bilateral Briefs',
    publisher: 'MEA, Government of India',
    frequency: 'periodic',
    url: 'https://www.mea.gov.in',
    relevantSubjects: ['international-relations'],
    detail: 'Country-wise briefs on India\'s bilateral relations. Updated after each summit/high-level visit. Official source for India\'s foreign policy positions. Also track PM\'s bilateral meeting statements.',
    priority: 2,
  },
  {
    title: 'MHA Annual Report',
    publisher: 'Ministry of Home Affairs',
    frequency: 'annual',
    url: 'https://www.mha.gov.in',
    relevantSubjects: ['internal-security'],
    detail: 'Covers: border management, internal security operations, police modernization, Naxal violence data, NE insurgency status, cyber crime statistics, disaster management framework.',
    priority: 2,
  },
  {
    title: 'Rajya Sabha TV / Sansad TV In-Depth Programmes',
    publisher: 'Parliament of India',
    frequency: 'daily',
    url: 'https://sansadtv.nic.in',
    relevantSubjects: ['current-affairs', 'polity', 'economy', 'international-relations'],
    detail: 'Shows like "The Big Picture", "In Depth", "India\'s World" provide balanced expert analysis on current affairs. Many toppers cite Sansad TV as a key preparation tool for Mains answer enrichment.',
    priority: 2,
  },
  {
    title: '2nd Administrative Reforms Commission Reports',
    publisher: 'Government of India',
    frequency: 'periodic',
    url: 'https://darpg.gov.in',
    relevantSubjects: ['polity', 'ethics', 'internal-security'],
    detail: 'Key reports: 4th (Ethics in Governance), 5th (Public Order), 6th (Local Governance), 10th (Personnel Administration), 12th (Citizen-Centric Administration), 13th (Organizational Structure), 15th (State & District Administration). Read summaries and key recommendations.',
    priority: 2,
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Get recommendations for a specific subject
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getBooksForSubject(subjectId: string): BookRecommendation[] {
  const subject = UPSC_BOOK_RECOMMENDATIONS.find(s => s.subjectId === subjectId)
  return subject?.books ?? []
}

export function getNCERTsForSubject(subjectId: string): NCERTBook[] {
  return NCERT_MASTER_LIST.filter(n => n.relevantSubjects.includes(subjectId))
}

export function getGovSourcesForSubject(subjectId: string): GovernmentSource[] {
  return GOVERNMENT_SOURCES.filter(g => g.relevantSubjects.includes(subjectId))
}

export function getMustReadBooks(subjectId: string): BookRecommendation[] {
  return getBooksForSubject(subjectId).filter(b => b.priority === 1)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CULT-STATUS BOOKS QUICK REFERENCE
// These are the "non-negotiable" books that every serious UPSC aspirant owns
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CULT_STATUS_BOOKS = [
  { subject: 'Indian Polity', book: 'Indian Polity — M. Laxmikanth', status: 'THE polity bible. No UPSC aspirant can skip this. 80%+ polity questions answerable from this alone.' },
  { subject: 'Modern History', book: "India's Struggle for Independence — Bipan Chandra", status: 'The definitive freedom struggle text. 39 chapters covering every movement, every leader.' },
  { subject: 'Ancient History', book: "India's Ancient Past — R.S. Sharma", status: 'Gold standard from Stone Age to post-Gupta. Clear, chronological, comprehensive.' },
  { subject: 'Medieval History', book: 'History of Medieval India — Satish Chandra', status: 'Rajputs to Mughals to 18th century decline. The only medieval history book most toppers read.' },
  { subject: 'Geography', book: 'Certificate Physical & Human Geography — Goh Cheng Leong', status: 'World physical geography classic. Unmatched clarity on climatology, geomorphology, oceanography.' },
  { subject: 'Economy', book: 'Indian Economy — Ramesh Singh', status: 'Most comprehensive economy text. Updated annually. Covers planning to GST to crypto regulation.' },
  { subject: 'Environment', book: 'Environment — Shankar IAS Academy', status: 'Equivalent of Laxmikanth for environment. Ecology, biodiversity, climate change, legislation — all in one.' },
  { subject: 'Art & Culture', book: 'Indian Art and Culture — Nitin Singhania', status: 'Architecture, painting, dance, music, handicrafts. The one-stop shop for Art & Culture Prelims.' },
  { subject: 'Modern History (Concise)', book: 'A Brief History of Modern India — Spectrum (Rajiv Ahir)', status: 'Concise fact-dense modern history. Popular for Prelims revision alongside Bipan Chandra.' },
  { subject: 'Ethics', book: 'Lexicon for Ethics — Niraj Kumar', status: 'Alphabetical GS-IV keyword coverage with examples. Every topper has this.' },
] as const
