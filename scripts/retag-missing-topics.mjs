import fs from 'fs'

const env = {}
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const [k, ...v] = l.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}

const { createClient } = await import('@supabase/supabase-js')
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const MISSING_TOPICS = {
  'rajput-kingdoms':         { dbSubjects: ['history'], keywords: ['rajput', 'prithviraj', 'tarain', 'gurjara', 'pratihara', 'chandela', 'chahamana'] },
  'slave-dynasty':           { dbSubjects: ['history'], keywords: ['qutb', 'iltutmish', 'raziya', 'balban', 'iqta', 'qutub minar', 'mamluk', 'aibak'] },
  'khalji-tughlaq':          { dbSubjects: ['history'], keywords: ['alauddin', 'khalji', 'tughlaq', 'firoz', 'ibn battuta'] },
  'lodi-dynasty':            { dbSubjects: ['history'], keywords: ['lodi', 'sayyid', 'ibrahim', 'panipat 1526', 'first battle of panipat'] },
  'jahangir-shahjahan':      { dbSubjects: ['history'], keywords: ['jahangir', 'shah jahan', 'taj mahal', 'noor jahan', 'tuzuk', 'mumtaz'] },
  'mughal-culture':          { dbSubjects: ['history', 'art_culture'], keywords: ['mughal miniature', 'urdu', 'char bagh', 'mughal architecture', 'akbarnama'] },
  'sufi-movement':           { dbSubjects: ['history'], keywords: ['sufi', 'chishti', 'nizamuddin', 'amir khusrau', 'khanqah', 'silsila'] },
  'revolutionary-movements': { dbSubjects: ['history'], keywords: ['bhagat singh', 'chandrashekhar', 'ghadar', 'anushilan', 'sukhdev', 'kakori'] },
  'population-urbanisation': { dbSubjects: ['geography'], keywords: ['census', 'population density', 'sex ratio', 'literacy rate', 'demographic'] },
  'anticorruption':          { dbSubjects: ['polity'], keywords: ['lokpal', 'lokayukta', 'CAG', 'CVC', 'vigilance', 'corruption act', 'anticorruption'] },
  'india-major-powers':      { dbSubjects: ['polity'], keywords: ['quad', 'BRICS', 'SCO', 'nuclear deal', 'india-us', 'doklam', 'galwan', 'QUAD'] },
  'multilateral-bodies':     { dbSubjects: ['polity'], keywords: ['united nations', 'security council', 'IMF', 'world bank', 'WTO', 'G20', 'permanent member'] },
  'regional-groupings':      { dbSubjects: ['polity'], keywords: ['ASEAN', 'RCEP', 'SCO', 'belt and road', 'AUKUS', 'IORA'] },
  'forests-india':           { dbSubjects: ['environment'], keywords: ['forest', 'FSI', 'CAMPA', 'FRA', 'forest rights', 'deforestation', 'afforestation'] },
  'disaster-management-system': { dbSubjects: ['environment'], keywords: ['NDMA', 'NDRF', 'disaster management', 'sendai', 'DM act'] },
  'cybersecurity':           { dbSubjects: ['science'], keywords: ['cyber', 'CERT', 'IT act', 'data protection', 'cybersecurity'] },
  'corruption-ethics':       { dbSubjects: ['polity'], keywords: ['corruption', 'probity', 'whistleblower', 'conflict of interest'] },
  'case-studies':            { dbSubjects: ['polity'], keywords: ['dilemma', 'ethical', 'stakeholder', 'officer', 'civil servant'] },
  'urbanisation-migration':  { dbSubjects: ['economy', 'geography'], keywords: ['smart city', 'slum', 'PMAY', 'migration', 'urbanization', 'remittance'] },
}

let updated = 0
const topicCounts = {}

for (const [topicId, entry] of Object.entries(MISSING_TOPICS)) {
  let allRows = []
  for (const subj of entry.dbSubjects) {
    const { data } = await sb.from('upsc_pyqs')
      .select('id, question, tags')
      .eq('subject', subj)
      .gt('year', 2009)
    allRows.push(...(data || []))
  }

  const matches = allRows.filter(q => {
    const text = q.question.toLowerCase()
    return entry.keywords.some(kw => text.includes(kw.toLowerCase()))
  })

  topicCounts[topicId] = matches.length
  console.log(`${topicId}: ${matches.length} matches`)

  for (const q of matches) {
    const existingTags = q.tags || []
    if (existingTags.includes(topicId)) continue
    const newTags = [...new Set([...existingTags, topicId])]
    const { error } = await sb.from('upsc_pyqs').update({ tags: newTags }).eq('id', q.id)
    if (!error) updated++
  }
}

console.log(`\nUpdated ${updated} questions`)
console.log('\nStill 0 matches:')
Object.entries(topicCounts).filter(([,c]) => c === 0).forEach(([t]) => console.log(' -', t))
