/**
 * app/api/journey/pyqs/route.ts
 *
 * Retrieves PYQs for a learning journey topic using 3-tier fallback:
 *   1. Tag match (exact topic ID in tags array)
 *   2. Subject + keyword full-text search
 *   3. Subject-only most-recent questions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// ── Subject mapping: syllabus subject ID → DB subject values ─────────────────

const SUBJECT_MAP: Record<string, string[]> = {
  'ancient-history':   ['history', 'art_culture'],
  'medieval-history':  ['history', 'art_culture'],
  'modern-history':    ['history'],
  'geography':         ['geography'],
  'polity':            ['polity'],
  'economy':           ['economy'],
  'environment':       ['environment'],
  'science-tech':      ['science'],
  'ethics':            ['polity', 'history'],
  'society':           ['history', 'art_culture'],
  'art-culture':       ['art_culture', 'history'],
  'world-history':     ['history'],
}

// ── Topic → keyword expansion for text search fallback ──────────────────────

const TOPIC_SEARCH_KEYWORDS: Record<string, string> = {
  // Ancient
  'prehistoric-india':         'prehistoric palaeolithic mesolithic neolithic chalcolithic',
  'indus-valley':              'indus harappa mohenjo dholavira harappan',
  'vedic-age':                 'vedic rigveda upanishad varna aryans',
  'buddhism-jainism':          'buddha buddhism jain mahavira tirthankara pali sangha',
  'mahajanapadas':             'mahajanapada magadha nanda licchavi republic',
  'mauryan-empire':            'maurya ashoka chandragupta kautilya arthashastra edict',
  'post-mauryan':              'kushana kanishka satavahana sunga indo-greek gandhara',
  'gupta-empire':              'gupta samudragupta kalidasa aryabhata nalanda',
  'south-india-ancient':       'pallava chalukya chola sangam mahabalipuram',
  'ancient-art':               'stupa chaitya vihara ajanta ellora rock cut sculpture',
  'ancient-literature-science':'panini charaka sushruta aryabhata brahmagupta',
  // Medieval
  'rajput-kingdoms':           'rajput prithviraj tarain gurjara pratihara rajasthan',
  'arab-turkish-invasions':    'mahmud ghazni somnath alberuni qasim ghori',
  'chola-maritime':            'chola rajaraja rajendra brihadeshwara naval southeast',
  'slave-dynasty':             'qutb iltutmish raziya balban iqta qutub minar mamluk',
  'khalji-tughlaq':            'alauddin khalji tughlaq firoz shah ibn battuta market reform',
  'vijayanagara-bahmani':      'vijayanagara krishnadevaraya talikota bahmani hampi',
  'lodi-dynasty':              'lodi sayyid ibrahim panipat 1526',
  'babur-humayun':             'babur humayun sher shah sur khanwa',
  'akbar':                     'akbar mansabdari din-i-ilahi fatehpur sikri abul fazl',
  'jahangir-shahjahan':        'jahangir shah jahan taj mahal noor jahan tuzuk',
  'aurangzeb':                 'aurangzeb jizya shivaji mughal decline deccan',
  'mughal-culture':            'mughal miniature urdu mughal architecture',
  'bhakti-movement':           'bhakti kabir mirabai tukaram chaitanya shankaracharya',
  'sufi-movement':             'sufi chishti nizamuddin amir khusrau silsila khanqah',
  'maratha-empire':            'maratha shivaji peshwa ashtapradhan chauth',
  // Modern
  'european-trade':            'portuguese dutch french east india company carnatic surat',
  'battle-plassey-buxar':      'plassey buxar siraj clive dual government diwani',
  'british-expansion':         'subsidiary alliance doctrine of lapse tipu sultan sikh war',
  'colonial-economy-impact':   'drain of wealth zamindari ryotwari indigo revolt permanent settlement',
  'socioreligious-reforms':    'brahmo samaj ram mohan roy arya samaj vivekananda',
  'revolt-1857':               '1857 sepoy mutiny rani lakshmibai nana sahib tantia tope',
  'early-nationalism':         'INC 1885 moderate extremist tilak partition bengal swadeshi',
  'gandhian-era':              'gandhi satyagraha champaran non-cooperation civil disobedience dandi quit india',
  'revolutionary-movements':   'bhagat singh chandrashekhar azad ghadar party anushilan',
  'constitutional-developments':'regulating act government of india act morley minto dyarchy 1935',
  'independence-partition':    'partition mountbatten radcliffe princely states sardar patel',
  // Geography
  'himalayas':                 'himalaya karakoram siwalik pass glacier nanda devi',
  'deccan-plateau':            'deccan western ghats eastern ghats vindhya satpura aravalli',
  'northern-plains':           'gangetic doab bhangar khadar terai thar desert',
  'rivers-drainage':           'river ganga brahmaputra indus godavari krishna kaveri narmada',
  'climate-india':             'monsoon ITCZ el nino western disturbance rainfall cyclone',
  'soils-vegetation':          'alluvial soil black soil laterite mangrove tropical deciduous',
  'islands-india':             'andaman nicobar lakshadweep coral reef island EEZ',
  'agriculture-geo':           'kharif rabi green revolution cropping pattern irrigation',
  'minerals-resources':        'iron ore coal bauxite petroleum mineral damodar rare earth',
  'industries-transport':      'steel plant textile SEZ freight corridor golden quadrilateral',
  'population-urbanisation':   'census population density sex ratio literacy urbanisation',
  'world-physical':            'andes rocky mountains alps rift valley fold mountain ocean trench',
  'ocean-currents':            'ocean current gulf stream humboldt thermohaline upwelling',
  'world-climate-zones':       'tropical rainforest savanna mediterranean temperate tundra koppen',
  'geopolitical-resources':    'OPEC persian gulf rare earth chokepoint strait malacca hormuz',
  // Polity
  'making-constitution':       'constituent assembly ambedkar objectives resolution drafting committee',
  'fundamental-rights':        'fundamental right article 14 article 19 article 21 article 32 writ habeas corpus',
  'dpsp-duties':               'directive principle DPSP article 51a fundamental duties article 44',
  'federal-structure':         'union list state list concurrent list seventh schedule president rule 356',
  'amendments':                'article 368 amendment 42nd 44th basic structure kesavananda',
  'parliament':                'lok sabha rajya sabha parliament money bill speaker anti-defection question hour',
  'executive':                 'president prime minister cabinet ordinance collective responsibility',
  'judiciary':                 'supreme court high court judicial review PIL article 32 article 226',
  'state-government':          'governor chief minister vidhan sabha vidhan parishad state legislature',
  'local-government':          'panchayat municipality gram sabha 73rd amendment pesa municipal corporation',
  'civil-services':            'civil service IAS UPSC all india service lateral entry',
  'rti-egovernance':           'RTI right to information e-governance information commission transparency',
  'anticorruption':            'lokpal lokayukta CAG CVC CBI vigilance prevention of corruption',
  'india-neighborhood':        'SAARC pakistan nepal bhutan bangladesh sri lanka LAC BIMSTEC',
  'india-major-powers':        'QUAD BRICS SCO bilateral india-us india-russia india-china',
  'multilateral-bodies':       'united nations UNSC security council IMF world bank WTO G20',
  'regional-groupings':        'ASEAN RCEP BRICS SCO SAARC belt road AUKUS IORA',
  // Economy
  'planning-development':      'five year plan NITI aayog planning commission HDI GDP',
  'fiscal-monetary':           'RBI repo rate CRR SLR monetary policy fiscal deficit GST FRBM',
  'poverty-inequality':        'poverty MGNREGA unemployment gini inequality tendulkar inclusive growth',
  'agriculture-economy':       'MSP FCI PDS APMC PM-KISAN crop insurance food security',
  'infrastructure':            'gati shakti sagarmala UDAN freight corridor smart city PMAY',
  'external-sector':           'balance of payments FDI FPI current account trade deficit FTA forex',
  'banking-finance':           'NPA IBC bank NBFC UPI jan dhan MUDRA microfinance insolvency',
  // Environment
  'biodiversity-conservation': 'biodiversity CBD nagoya protocol endemic hotspot in-situ ex-situ',
  'protected-areas':           'tiger project tiger national park wildlife sanctuary biosphere reserve',
  'wetlands-coastal':          'wetland ramsar sundarbans mangrove coral reef coastal CRZ',
  'forests-india':             'forest FSI CAMPA FRA community forest deforestation afforestation',
  'climate-change':            'climate change greenhouse IPCC global warming paris agreement NDC carbon',
  'international-agreements':  'UNFCCC kyoto montreal protocol CBD CITES stockholm COP',
  'pollution':                 'pollution AQI PM 2.5 CPCB NGT e-waste plastic water pollution',
  'renewable-energy':          'solar wind MNRE ISA green hydrogen renewable energy transition',
  'natural-disasters':         'earthquake cyclone flood landslide drought tsunami seismic NDMA sendai',
  'disaster-management-system':'NDMA NDRF disaster management act sendai framework DM act',
  // Science
  'isro-space':                'ISRO PSLV GSLV chandrayaan mangalyaan gaganyaan NAVIC satellite',
  'nuclear-technology':        'nuclear thorium BARC atomic energy NPT CTBT NSG nuclear doctrine',
  'ai-biotech':                'artificial intelligence biotechnology GMO CRISPR genome machine learning',
  'defense-tech':              'DRDO HAL brahmos tejas missile defense indigenisation iDEX',
  'cybersecurity':             'cyber CERT data protection IT act cybersecurity digital security',
  'internal-security':         'naxal UAPA NIA insurgency terrorism hawala left wing extremism',
  'border-management':         'LOC LAC siachen border fencing coastal security',
  // Ethics
  'moral-thinkers':            'ethics kant utilitarianism virtue gandhi ambedkar moral philosophy',
  'attitude-aptitude':         'attitude aptitude emotional intelligence empathy compassion values',
  'civil-service-values':      'integrity civil servant probity public service impartiality accountability',
  'corruption-ethics':         'corruption probity whistleblower conflict of interest bribery corporate governance',
  'case-studies':              'dilemma stakeholder ethical case officer civil servant duty',
  // Society
  'classical-arts':            'bharatanatyam kathak odissi kuchipudi hindustani carnatic classical dance music',
  'temple-architecture':       'nagara dravida vesara shikhara gopuram temple architecture UNESCO',
  'painting-traditions':       'madhubani warli pattachitra kalamkari tanjore miniature painting',
  'tribes-diversity':          'scheduled tribe tribal PVTG forest rights PESA adivasi northeast',
  'women-empowerment':         'women gender sex ratio female dowry domestic violence POCSO SHG',
  'caste-religion':            'caste dalit reservation communalism secularism minority OBC',
  'urbanisation-migration':    'smart city slum PMAY migration urbanisation remittance circular',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subject') || ''
  const topicId   = searchParams.get('topic') || ''
  const limit     = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

  const supabase = createServerClient()
  const dbSubjects = SUBJECT_MAP[subjectId] || []

  // ── Tier 1: exact tag match ────────────────────────────────────────────────

  if (topicId) {
    const { data: tagMatches } = await supabase
      .from('upsc_pyqs')
      .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
      .contains('tags', [topicId])
      .gt('year', 2009)
      .order('year', { ascending: false })
      .limit(limit * 2)

    if (tagMatches && tagMatches.length >= 3) {
      return NextResponse.json({ pyqs: dedupe(tagMatches, limit) })
    }

    // Partial tag results — keep for merging
    const partial = tagMatches || []

    // ── Tier 2: subject + keyword text search ──────────────────────────────

    const searchTerms = TOPIC_SEARCH_KEYWORDS[topicId]
    if (searchTerms && dbSubjects.length > 0) {
      // Build OR query from first 3 meaningful keywords
      const words = searchTerms.trim().split(/\s+/).filter(w => w.length > 3).slice(0, 4)
      const searchStr = words.join(' | ')

      const { data: textMatches } = await supabase
        .from('upsc_pyqs')
        .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
        .in('subject', dbSubjects)
        .gt('year', 2009)
        .textSearch('question', searchStr, { type: 'websearch', config: 'english' })
        .order('year', { ascending: false })
        .limit(limit * 2)

      const combined = [...partial, ...(textMatches || [])]
      if (combined.length >= 2) {
        return NextResponse.json({ pyqs: dedupe(combined, limit) })
      }
    }
  }

  // ── Tier 3: subject-only fallback (always returns something) ──────────────

  const subjects = dbSubjects.length > 0
    ? dbSubjects
    : ['history', 'geography', 'polity', 'economy', 'environment', 'science', 'art_culture']

  const { data: fallback } = await supabase
    .from('upsc_pyqs')
    .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
    .in('subject', subjects)
    .gt('year', 2011)
    .not('explanation', 'is', null)
    .order('year', { ascending: false })
    .limit(limit * 3)

  // If even that returns nothing (no 'not null explanation' match), try without explanation filter
  if (!fallback || fallback.length === 0) {
    const { data: lastResort } = await supabase
      .from('upsc_pyqs')
      .select('id, year, question, options, answer, explanation, subject, topic, difficulty, source')
      .in('subject', subjects)
      .gt('year', 2011)
      .order('year', { ascending: false })
      .limit(limit)

    return NextResponse.json({ pyqs: lastResort || [] })
  }

  return NextResponse.json({ pyqs: dedupe(fallback, limit) })
}

function dedupe(rows: any[], limit: number): any[] {
  const seen = new Set<string>()
  return rows.filter(q => {
    const key = q.question.slice(0, 60).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, limit)
}
