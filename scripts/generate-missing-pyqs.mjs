/**
 * scripts/generate-missing-pyqs.mjs
 *
 * Generates authentic UPSC-style PYQs using Gemini for topics with < 3 tagged questions.
 * Inserts generated questions into upsc_pyqs with proper subject + tags.
 *
 * Run: node scripts/generate-missing-pyqs.mjs
 * Dry run: node scripts/generate-missing-pyqs.mjs --dry-run
 */

import fs from 'fs'

const DRY_RUN = process.argv.includes('--dry-run')

// Load env
const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const [k, ...v] = l.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}

const { createClient } = await import('@supabase/supabase-js')
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const GEMINI_API_KEY = env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

// Topics that need generated PYQs — each with subject, context hint, and sample years
const TOPICS_TO_GENERATE = [
  // Medieval History
  {
    topicId: 'rajput-kingdoms',
    subject: 'history',
    displayName: 'Rajput Kingdoms',
    context: 'Rajput kingdoms of early medieval India: Prithviraj Chauhan, Battle of Tarain 1191/1192, Gurjara-Pratihara dynasty, Chandela dynasty, Paramaras, Chahamanas, Rajput clans and polity, Rajput culture and warfare',
  },
  {
    topicId: 'slave-dynasty',
    subject: 'history',
    displayName: 'Delhi Sultanate – Slave Dynasty',
    context: 'Delhi Sultanate Slave/Mamluk dynasty: Qutb-ud-din Aibak, Iltutmish, Razia Sultana, Balban, Iqta system, Qutub Minar construction, Mamluk rulers, Delhi as capital, Persian influences',
  },
  {
    topicId: 'khalji-tughlaq',
    subject: 'history',
    displayName: 'Khalji and Tughlaq Dynasties',
    context: 'Khalji and Tughlaq dynasties of Delhi Sultanate: Alauddin Khalji market reforms, price control, Malik Kafur southern campaigns, Muhammad bin Tughlaq token currency and capital transfer to Daulatabad, Firoz Shah Tughlaq, Ibn Battuta',
  },
  {
    topicId: 'lodi-dynasty',
    subject: 'history',
    displayName: 'Sayyid and Lodi Dynasties',
    context: 'Sayyid and Lodi dynasties: Bahlul Lodi, Ibrahim Lodi, First Battle of Panipat 1526, Babur vs Ibrahim Lodi, fall of Delhi Sultanate, Afghan resistance',
  },
  {
    topicId: 'jahangir-shahjahan',
    subject: 'history',
    displayName: 'Jahangir and Shah Jahan',
    context: 'Mughal emperors Jahangir and Shah Jahan: Tuzuk-i-Jahangiri, Nur Jahan, Mumtaz Mahal, Taj Mahal, Peacock Throne, Red Fort Delhi, Shahjahanabad, Shah Jahan architecture, Mughal painting under Jahangir',
  },
  {
    topicId: 'mughal-culture',
    subject: 'art_culture',
    displayName: 'Mughal Culture and Architecture',
    context: 'Mughal cultural contributions: Mughal miniature painting, char-bagh garden style, Fatehpur Sikri, Humayun Tomb, Akbarnama, Ain-i-Akbari, Urdu language development, Persian influence, syncretism in Mughal art',
  },
  {
    topicId: 'sufi-movement',
    subject: 'history',
    displayName: 'Sufi Movement in India',
    context: 'Sufi movement in medieval India: Chishti silsila, Nizamuddin Auliya, Amir Khusrau, khanqah system, sama and music, Suhrawardi order, Naqshbandi order, relationship with sultans and Mughals, Sufi influence on bhakti',
  },
  {
    topicId: 'revolutionary-movements',
    subject: 'history',
    displayName: 'Revolutionary Movements',
    context: 'Indian revolutionary movements against British: Bhagat Singh, Chandrashekhar Azad, Sukhdev, Rajguru, Kakori conspiracy 1925, Ghadar Party (1913), Anushilan Samiti, Jugantar, HSRA (Hindustan Socialist Republican Association), Chittagong armoury raid',
  },
  // Geography
  {
    topicId: 'population-urbanisation',
    subject: 'geography',
    displayName: 'Population and Urbanisation',
    context: 'Indian population geography: Census 2011, population density, sex ratio, literacy rate, demographic dividend, fertility rate, urbanization, million-plus cities, metropolitan areas, migration patterns, population distribution',
  },
  // Polity / IR
  {
    topicId: 'anticorruption',
    subject: 'polity',
    displayName: 'Anti-Corruption Bodies',
    context: 'Anti-corruption institutions in India: Lokpal, Lokayukta, CAG (Comptroller and Auditor General), CVC (Central Vigilance Commission), CBI, Prevention of Corruption Act 1988, Whistleblowers Protection Act, declaration of assets by civil servants',
  },
  {
    topicId: 'india-major-powers',
    subject: 'polity',
    displayName: 'India and Major Powers',
    context: 'India\'s relations with major powers: QUAD (India-US-Japan-Australia), Indo-US nuclear deal, India-Russia defense ties, S-400, India-China border disputes (Doklam, Galwan Valley), India-Japan Shinkansen, BRICS, SCO membership',
  },
  {
    topicId: 'multilateral-bodies',
    subject: 'polity',
    displayName: 'Multilateral Bodies',
    context: 'International multilateral organizations: United Nations, UNSC permanent and non-permanent members, IMF Special Drawing Rights, World Bank IBRD vs IDA, WTO dispute settlement, G20 India presidency 2023, G7, OECD, India\'s role in multilateral forums',
  },
  {
    topicId: 'regional-groupings',
    subject: 'polity',
    displayName: 'Regional Groupings',
    context: 'Regional groupings and India: ASEAN, RCEP (India opted out), SCO (Shanghai Cooperation Organisation), Belt and Road Initiative, AUKUS security pact, IORA (Indian Ocean Rim Association), BIMSTEC, Arctic Council observer, Pacific Island nations',
  },
  // Environment
  {
    topicId: 'forests-india',
    subject: 'environment',
    displayName: 'Forests of India',
    context: 'Forests of India: Forest Survey of India (FSI), India State of Forest Report, CAMPA (Compensatory Afforestation Management and Planning Authority), Forest Rights Act 2006, Community Forest Rights, Van Dhan Vikas Kendras, deforestation causes, National Forest Policy 1988',
  },
  {
    topicId: 'disaster-management-system',
    subject: 'environment',
    displayName: 'Disaster Management System',
    context: 'India disaster management system: NDMA (National Disaster Management Authority), NDRF (National Disaster Response Force), Disaster Management Act 2005, Sendai Framework 2015-2030, early warning systems, cyclone preparedness, State Disaster Management Authority, DRR (Disaster Risk Reduction)',
  },
  // Science/Tech
  {
    topicId: 'cybersecurity',
    subject: 'science',
    displayName: 'Cybersecurity',
    context: 'Cybersecurity in India: CERT-In (Indian Computer Emergency Response Team), IT Act 2000 and amendments, Personal Data Protection Bill, National Cyber Security Policy, Cyber Surakshit Bharat, DigiLocker security, cybercrime types (phishing ransomware), NCIIPC, cyber warfare',
  },
  // Ethics
  {
    topicId: 'corruption-ethics',
    subject: 'polity',
    displayName: 'Ethics and Corruption',
    context: 'Ethics related to corruption: probity in public life, conflict of interest, bribery vs facilitation, whistleblower dilemmas, corporate governance, Nolan Committee principles (selflessness, integrity, objectivity, accountability, openness, honesty, leadership), ethical leadership',
  },
  {
    topicId: 'case-studies',
    subject: 'polity',
    displayName: 'Ethical Case Studies',
    context: 'UPSC ethics case studies: civil servant ethical dilemmas, competing stakeholder interests, pressure from superiors, political interference in administration, balancing rule of law vs compassion, whistleblowing consequences, officer duty vs personal ethics, tribal rights vs development',
  },
  // Economy/Society
  {
    topicId: 'urbanisation-migration',
    subject: 'economy',
    displayName: 'Urbanisation and Migration',
    context: 'Urbanisation and migration in India: Smart Cities Mission, AMRUT, PMAY (urban), push-pull migration factors, remittances to rural areas, slum rehabilitation, circular migration, labour migration from Bihar/UP/Odisha, Aadhaar portability for migrants, Urban Local Bodies',
  },
]

// Progress file
const PROGRESS_FILE = 'data/pyqs/.generate_progress.json'
let progress = {}
if (fs.existsSync(PROGRESS_FILE)) {
  progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty Gemini response')
  return JSON.parse(text)
}

async function generatePYQsForTopic(topic) {
  const prompt = `You are an expert on UPSC Civil Services Examination. Generate exactly 7 high-quality multiple choice questions on: "${topic.displayName}".

Context/subtopics to cover: ${topic.context}

Rules:
1. Each question must be UPSC Prelims style — factual, concise, 4 options (a/b/c/d)
2. Questions should vary across different subtopics within the topic
3. Difficulty: mix of moderate and difficult (like real UPSC)
4. All options must be plausible (no obviously wrong options)
5. Include a clear, accurate explanation (2-3 sentences)
6. Use real historical facts, no fictional content
7. Options format: plain text (no "(a)" prefix in the options themselves)

Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "question": "question text ending with ?",
    "options": ["option A text", "option B text", "option C text", "option D text"],
    "answer": "a",
    "explanation": "clear factual explanation"
  }
]

The "answer" field must be exactly one of: "a", "b", "c", or "d".`

  return await callGemini(prompt)
}

const SUBJECT_TO_PAPER = {
  'history':     'gs1',
  'art_culture': 'gs1',
  'geography':   'gs1',
  'polity':      'gs2',
  'economy':     'gs3',
  'environment': 'gs3',
  'science':     'gs3',
}

async function checkTopicCoverage(topicId, subject) {
  const { data, error } = await sb
    .from('upsc_pyqs')
    .select('id', { count: 'exact' })
    .contains('tags', [topicId])

  if (error) {
    console.error(`  Coverage check error for ${topicId}:`, error.message)
    return 0
  }
  return data?.length || 0
}

let totalInserted = 0

for (const topic of TOPICS_TO_GENERATE) {
  const existing = await checkTopicCoverage(topic.topicId, topic.subject)
  console.log(`\n[${topic.topicId}] existing tagged questions: ${existing}`)

  if (existing >= 5) {
    console.log(`  → Skipping (already has ${existing} questions)`)
    continue
  }

  if (progress[topic.topicId] === 'done') {
    console.log(`  → Already generated in previous run, skipping`)
    continue
  }

  if (DRY_RUN) {
    console.log(`  → [DRY RUN] Would generate 7 questions for ${topic.displayName}`)
    continue
  }

  console.log(`  → Generating 7 questions via Gemini...`)
  let questions
  try {
    questions = await generatePYQsForTopic(topic)
  } catch (err) {
    console.error(`  ✗ Gemini generation failed:`, err.message)
    continue
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    console.error(`  ✗ Invalid response format`)
    continue
  }

  console.log(`  → Generated ${questions.length} questions`)

  const paper = SUBJECT_TO_PAPER[topic.subject] || 'gs1'

  // Build DB rows
  const rows = questions.map((q) => ({
    source: 'gemini_generated',
    year: 2024,
    exam_type: 'prelims',
    paper,
    subject: topic.subject,
    topic: topic.topicId,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: 'medium',
    tags: [topic.topicId],
  }))

  // Insert rows
  const { data: inserted, error } = await sb
    .from('upsc_pyqs')
    .insert(rows)
    .select('id')

  if (error) {
    console.error(`  ✗ Insert error:`, error.message)
    continue
  }

  const count = inserted?.length || rows.length
  console.log(`  ✓ Inserted ${count} questions for [${topic.topicId}]`)
  totalInserted += count

  progress[topic.topicId] = 'done'
  saveProgress()

  // Polite delay between Gemini calls
  await new Promise(r => setTimeout(r, 1500))
}

console.log(`\n✅ Done. Total inserted: ${totalInserted}`)
if (DRY_RUN) console.log('(dry run — no actual inserts)')
