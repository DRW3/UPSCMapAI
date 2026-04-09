// ─────────────────────────────────────────────────────────────────────────────
// UPSC Mains Answer Frameworks — keyed by subject.
//
// Each subject in UPSC GS Mains has its OWN answer-writing register, drawn
// from the actual PYQ patterns of that paper. A History answer hinges on
// chronology + primary sources + historiographical schools. A Polity answer
// hinges on Articles + landmark SC judgments + committees. A GS-IV Ethics
// answer is built around philosophers + case studies + civil service
// dilemmas — a completely different shape from any other paper.
//
// The frameworks here were drafted from PYQ analysis of UPSC Mains
// 2014-2023, the 2nd ARC reports, Insights/ForumIAS toppers' answer
// scripts (Akshat Jain, Pratibha Verma, Yashashvini Sharaf), and the
// register that examiners reward in the official model answers.
//
// Inline [[term||explanation]] markers are picked up by the existing
// renderRichText() helper in TopicDetailSheet — tapping a highlighted
// term opens the same bottom popup the rest of the notes use, with
// the explanation written like a senior mentor pulling the aspirant
// aside: specific cases, named committees, real PYQs.
// ─────────────────────────────────────────────────────────────────────────────

export interface MainsFramework {
  /** Section title shown at the top of the framework card */
  title: string
  /** One-line subtitle */
  subtitle: string
  /** How to open the answer — narrative paragraph with [[term||explanation]] */
  introduction: string
  /** 5-6 body-writing principles, each may contain highlights */
  bodyPoints: string[]
  /** How to close the answer */
  conclusion: string
  /** Word-limit display string */
  wordLimit: string
  /** Real UPSC PYQs that this framework targets */
  pyqSamples: string[]
}

// ── 1. HISTORY (GS-I) ────────────────────────────────────────────────────────
const HISTORY: MainsFramework = {
  title: "Writing a History Mains answer",
  subtitle: "Chronology, sources and historiographical perspective — GS-I",
  introduction:
    "Open with a one-line definition of the period / dynasty / movement, then immediately fix the [[time bracket||UPSC examiners check first whether you have the timeline straight. Always open with the years — 'The Mauryan Empire (321-185 BCE)', 'The Civil Disobedience Movement (1930-34)', 'The Bhakti Movement (8th-17th centuries CE)'. Without dates the rest of the answer reads like opinion. Toppers always anchor with a date in line one.]]. Name the [[primary source||The historian's evidence base — Arthashastra & Megasthenes' Indica for Mauryas, Rajatarangini for Kashmir, Tarikh-i-Firoz Shahi for the Sultanate, Ain-i-Akbari for Mughals, Charles Wood's Despatch (1854) for colonial education, Hunter Commission (1882), Discovery of India for the National Movement. Naming ONE source by author + work earns an instant credibility mark.]] you'll lean on. State the [[directive||UPSC History uses very specific verbs: 'Discuss' = present multiple aspects; 'Examine' = scrutinise from different angles; 'Critically Examine' = scrutinise + your reasoned verdict; 'Bring out the salient features' = list + explain; 'Trace the evolution of' = chronological narrative. Each demands a different structure — circle the directive verb in the question before you start writing.]] (Discuss / Examine / Critically Examine / Trace) so the examiner sees you read the question.",
  bodyPoints: [
    "Establish CHRONOLOGY first — give the timeline before analysing impact. A history answer without dates, sequence and key events reads like a generic essay. Use a 2-3 line opening paragraph that fixes the period in time, then move to analysis.",
    "Anchor every claim in [[evidence||History answers are graded on the strength of evidence. Acceptable anchors: archaeological finds (Lothal dockyard, Sarnath Lion Capital, Burzahom pit-dwellings), inscriptions (Ashoka's 14 Major Rock Edicts, Allahabad Pillar Inscription of Samudragupta, Aihole Inscription of Pulakeshin II), coins (Indo-Greek tetradrachms, Kushan gold coinage), foreign travellers (Megasthenes, Fa-Xian, Hsuen Tsang, Al-Biruni, Ibn Battuta, Marco Polo, Bernier), chronicles and court literature. Don't say 'evidence shows' — name the source.]] — archaeological finds, inscriptions, coins, foreign travellers' accounts, contemporary chronicles, or court literature. Generic 'historians say' loses marks; 'Megasthenes' Indica describes...' earns them.",
    "Show [[continuity AND change||What persisted from the previous era, what transformed. e.g. 'Mauryan administration drew on Mahajanapada-era institutions (continuity) but introduced a centralised bureaucracy with provincial governors (change)'. e.g. 'The Bhakti movement absorbed Vedic devotionalism (continuity) but rejected caste hierarchies (change)'. This is exactly what UPSC means by 'analytical history' — the difference between a 6-mark and a 9-mark answer.]] — what persisted from the previous era, what transformed. This framing is the difference between a descriptive answer and an analytical one.",
    "Bring in different [[historiographical schools||UPSC GS-I rewards aspirants who name the schools of interpretation: Colonial (James Mill, Vincent Smith), Nationalist (R.C. Majumdar, Tarachand, Bipan Chandra), Marxist (D.D. Kosambi, R.S. Sharma, Romila Thapar, Irfan Habib), Subaltern (Ranajit Guha, Partha Chatterjee, Dipesh Chakrabarty), Cambridge School (Anil Seal, Gordon Johnson). Naming even ONE school by its historian shows you understand history is interpretation, not just facts.]] where relevant — colonial vs nationalist vs Marxist vs subaltern readings. Cite at least one historian by name (e.g. 'R.S. Sharma's view that...', 'Romila Thapar argues...', 'Bipan Chandra's nationalist reading...').",
    "Connect to BROADER themes — state formation, agrarian change, religious synthesis, urbanisation, trade networks, women's status, cultural exchange. Top history answers don't sit in one event; they show how the event fits a larger historical process. e.g. linking the Bhakti movement to the wider trend of vernacularisation and democratisation of religion across medieval South Asia.",
  ],
  conclusion:
    "Close with the long-term [[significance||A history conclusion should answer 'so what?' — what did this period leave behind for the next era or for modern India? e.g. 'The Bhakti movement laid the cultural foundation for India's syncretic ethos that the Constitution later codified as secularism', or 'Curzon's partition of Bengal (1905) crystallised the Swadeshi imagination that Gandhi would later channel into Non-Cooperation'. Linking past to present is a topper habit and earns the integration mark.]] of the period or movement. Show how it shaped what followed and, where possible, link it back to a contemporary constitutional value — secularism, pluralism, federalism, social justice. Avoid simply restating the body; the conclusion should add a fresh historiographical reflection.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "Discuss the role of women in the Indian National Movement. (UPSC 2018, GS-I)",
    "Examine the linkages between the 19th-century Indian Renaissance and the emergence of national identity. (UPSC 2020, GS-I)",
    "How did Mahatma Gandhi succeed in making the National Movement a mass movement? (UPSC 2017, GS-I)",
  ],
}

// ── 2. GEOGRAPHY (GS-I) ──────────────────────────────────────────────────────
const GEOGRAPHY: MainsFramework = {
  title: "Writing a Geography Mains answer",
  subtitle: "Diagrams, factors and spatial reasoning — GS-I",
  introduction:
    "Define the geographical concept / feature / process in one line, then locate it spatially — '[[mention the latitudes||UPSC Geography rewards spatial precision. e.g. 'India lies between 8°4'N and 37°6'N latitude' or 'The Western Ghats run parallel to the western coast from 8°N to 21°N'. Specific coordinates show you have the map in your head, not just words.]]', the basin, the agroclimatic zone, or the tectonic plate involved. State the [[geographical scale||UPSC Geography questions operate at four scales: global (climate change, ocean currents), regional (monsoons, plate tectonics), national (Indian agroclimatic zones, river systems), and local (a specific industrial cluster, a city, a watershed). Identify which scale the question wants — answers that confuse scales lose marks.]] (global / regional / national / local) the question is asking about and announce the directive ('Account for...', 'Discuss...', 'Critically examine...').",
  bodyPoints: [
    "ALWAYS use a [[diagram||A labelled diagram is non-negotiable in Geography Mains. Sketch: a rough India map (with state outlines marked for any India-specific question), a cross-section (for relief / soil / aquifer questions), a climograph (for rainfall / temperature questions), a flow diagram (for the hydrological cycle / nutrient cycle), or a Venn diagram (for overlapping climatic zones). Even a 4-cm rough sketch with 5 labels earns 2 marks. Mark the title, the legend, and the source ('source: NATMO').]] — sketch a labelled India map, a cross-section, a climograph, or a flow diagram. Even a rough 4-cm sketch with 5 labels earns marks. Title it, label it, cite the source ('source: NATMO').",
    "Cover both PHYSICAL and HUMAN factors. Physical = relief, climate, drainage, soils, vegetation. Human = demographic, economic, political, historical. e.g. 'The location of the Indian textile industry is shaped by physical factors (cotton-growing black soil belt) and human factors (Mumbai port access, colonial-era infrastructure, skilled labour)'.",
    "Anchor with [[hard data||Geography answers must quote specific numbers — temperatures, rainfall (in mm), elevations (in m), distances (in km), areas (in sq km), percentages of GDP / population. e.g. 'India receives an average annual rainfall of 1,170 mm' or 'The Thar Desert covers 200,000 sq km'. Sources: India Meteorological Department (IMD), Geological Survey of India (GSI), Census, Forest Survey of India (FSI), NITI Aayog SDG India Index.]] — temperatures, rainfall in mm, elevations in m, areas in sq km, percentages of GDP. Cite IMD, GSI, FSI, Census, or NATMO as the source.",
    "Use a [[Cause-Effect-Mitigation flow||The standard scaffold for Geography hazard / climate / pollution questions: (1) CAUSES — natural + anthropogenic; (2) IMPACTS — environmental + economic + social; (3) MITIGATION — structural (engineering) + non-structural (policy, awareness, community). Toppers literally use these three sub-headings on hazard questions and finish with a fourth: 'India's institutional response — NDMA, NIDM, SDRF'.]] for hazards, climate change, pollution and resource depletion questions. Sub-head: CAUSES → IMPACTS → MITIGATION → INSTITUTIONAL RESPONSE.",
    "Bring in CASE EXAMPLES from India and the world — Rajasthan canal command area, Western Ghats biodiversity hotspot, Sundarbans climate vulnerability, Cauvery dispute, Joshimath subsidence (2023), Wayanad landslides (2024), Assam floods. Concrete cases ground abstract geography in real terrain.",
  ],
  conclusion:
    "Close by linking the geographical issue to [[sustainable development||The Brundtland definition (1987) — 'meeting present needs without compromising future generations'. Always link Geography conclusions to one of the 17 SDGs (SDG-13 Climate Action, SDG-14 Life Below Water, SDG-15 Life on Land, SDG-6 Water & Sanitation, SDG-11 Sustainable Cities). For India-specific questions, link to NITI Aayog's Vision 2030, India's NDC under Paris Agreement, or the LiFE (Lifestyle for Environment) movement.]] and an actionable policy direction — invoke NDMA, NITI Aayog, the National Action Plan on Climate Change, or India's NDC commitments. End with the [[intergenerational equity||The principle that the current generation holds the planet in trust for future generations. Coined in international environmental law (Brundtland Commission, Rio Declaration). Geography conclusions that invoke intergenerational equity feel grounded in ethics, not just policy — and that earns an extra mark.]] frame where relevant.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "Discuss the factors responsible for the location of the cotton textile industry in India. (UPSC 2020, GS-I)",
    "Account for the variations in oceanic salinity and discuss its multi-dimensional effects. (UPSC 2017, GS-I)",
    "Explain the formation of mountains and the impact of climate change on Himalayan glaciation. (UPSC 2023, GS-I)",
  ],
}

// ── 3. SOCIETY (GS-I) ────────────────────────────────────────────────────────
const SOCIETY: MainsFramework = {
  title: "Writing an Indian Society Mains answer",
  subtitle: "Data, dimensions and case studies — GS-I",
  introduction:
    "Define the social phenomenon in one line, then anchor it in [[hard data||Society questions are graded on data fluency. Memorise these top sources: NFHS-5 (2019-21) for health/gender/nutrition, Census 2011 for demography, Periodic Labour Force Survey (PLFS) for employment, NCRB for crimes against women/SC/ST, India Justice Report, NITI Aayog SDG India Index, Time Use Survey for unpaid care work. Quoting one specific NFHS-5 stat ('57% of women aged 15-49 are anaemic in India') earns more than a paragraph of generic claims.]] — NFHS-5, Census 2011, NCRB, PLFS, India Justice Report, NITI Aayog SDG India Index. Mention WHY this matters now: a recent SC verdict, a Bill in Parliament, or a contemporary incident. State the directive (Discuss / Examine / Critically examine).",
  bodyPoints: [
    "Lead with [[NFHS-5 / Census / NCRB data||Society answers without data feel like opinions. Top stats to memorise: 48.5% female literacy gap closure (NFHS-5), 23% of urban women in workforce (PLFS 2022), 31,000 rape cases reported (NCRB 2022), 30% of Indian children stunted (NFHS-5), 18% of marriages before age 18 (NFHS-5). Drop the citation in the same sentence as the claim — 'Per NFHS-5...' — and the examiner will reach for the marks pen.]] in the very first body line. Quote specific percentages, rankings or absolute numbers and cite the source in the same sentence ('Per NFHS-5...').",
    "Cover MULTIPLE dimensions — gender, caste, class, region, urban-rural, age, religion. India's social questions are intersectional by design; a one-dimensional answer caps at 50%. e.g. a question on women's labour force participation must touch class (rural Dalit women vs urban upper-caste women), region (Kerala vs Bihar) and age cohort.",
    "Bring in real [[case studies||Society answers earn marks for naming specific incidents and movements: Sabarimala temple entry case (2018), Nirbhaya (2012) and the Justice Verma Committee, Hathras (2020), Bilkis Bano (1992 / 2022 remission case), Triple Talaq judgment (Shayara Bano 2017), the Stan Swamy custodial death (2021), the Bhima Koregaon case, the farmers' protest (2020-21), the Manipur ethnic violence (2023). One named case = one mark guaranteed.]] — Sabarimala (2018), Nirbhaya & Verma Committee, Hathras (2020), Triple Talaq / Shayara Bano (2017), Bhima Koregaon, the farmers' protest (2020-21), Manipur ethnic violence (2023). One named case earns more than a paragraph of abstract analysis.",
    "Cite the [[constitutional / legal framework||Society questions are still UPSC GS — the constitutional anchor is non-negotiable. Most-relevant Articles: 14 (equality), 15 (non-discrimination), 17 (untouchability abolished), 21 (life with dignity, expanded by Puttaswamy), 23 (forced labour), 24 (child labour), 39A (legal aid), 41 (work, education), 46 (educational interests of weaker sections). Plus laws: SC/ST POA Act 1989, Domestic Violence Act 2005, POCSO 2012, Maternity Benefit Amendment 2017, Transgender Persons Act 2019.]] — Articles 14, 15, 17, 21, 23, 39A, 46 — plus the relevant statute (SC/ST PoA Act, DV Act 2005, POCSO 2012, Maternity Benefit Amendment 2017, Transgender Persons Act 2019).",
    "Name the GOVERNMENT SCHEME addressing the issue — Beti Bachao Beti Padhao, PMMVY, JJM, SHe-box, One Stop Centres, MGNREGA, PM-POSHAN, Saubhagya, PMUY. Not just 'government schemes' — the actual scheme name + year + flagship feature.",
  ],
  conclusion:
    "Close with a [[multi-stakeholder approach||Society conclusions should refuse the trap of 'the state must do more' — that's the lazy close. Toppers name THREE actors: state (legislation, scheme, budget), civil society (NGOs, women's collectives, media), and community (panchayats, mahila mandals, parents, youth). e.g. 'Reducing child marriage requires legal enforcement (state), awareness drives by NGOs (civil society) and parental and panchayat-level commitment (community).' This 'tripod' framing instantly elevates the answer.]] — state + civil society + community. Suggest a specific reform direction and anchor it in [[substantive equality||Coined in feminist legal scholarship — moves beyond formal equality (treating everyone the same) to require active state intervention to undo structural disadvantage. Used by the SC in Anuj Garg v. Hotel Association (2008), NALSA v. Union of India (2014, transgender rights), and Joseph Shine v. Union of India (2018, adultery). Name-drop 'substantive equality' in any gender / caste / disability question for an instant edge.]] or constitutional fraternity (Preamble). Avoid one-sided closures.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "How does patriarchy impact the position of a middle-class working woman in India? (UPSC 2014, GS-I)",
    "Critically examine whether globalisation has led to the reduction of poverty and inequality in India. (UPSC 2018, GS-I)",
    "Discuss the changes in the trends of labour migration within and outside India in the last four decades. (UPSC 2015, GS-I)",
  ],
}

// ── 4. POLITY & GOVERNANCE (GS-II) ───────────────────────────────────────────
const POLITY: MainsFramework = {
  title: "Writing a Polity & Governance Mains answer",
  subtitle: "Articles, judgments and committees — GS-II",
  introduction:
    "Open by defining the constitutional provision / institution / process in one line. IMMEDIATELY cite the [[exact Article||Polity answers live and die by Article numbers. The top 15 to memorise: Art 14 (equality), 15 (non-discrimination), 19 (six freedoms), 21 (life & personal liberty — the most-cited Article in modern UPSC), 25 (religion), 32 (Supreme Court writs — Ambedkar's 'heart and soul'), 226 (HC writs), 243 (Panchayats), 256-263 (Centre-State), 280 (Finance Commission), 312 (All-India Services), 324 (ECI), 356 (President's Rule), 368 (Amendment), 370 (J&K, now repealed). Quote the exact number — 'Article 19(1)(a)', not 'the freedom of speech Article'.]] (or set of Articles) involved. Mention the [[Directive Principle / Fundamental Right||The constitutional 'soul' the question is touching. Fundamental Rights are justiciable (Articles 12-35); Directive Principles are non-justiciable but fundamental in governance (Articles 36-51). Top DPSPs to invoke: 38 (social order), 39 (equal justice & means of livelihood), 39A (free legal aid), 41 (right to work, education, public assistance), 43 (living wage), 46 (educational interests of weaker sections), 47 (nutrition, public health), 48A (environment), 51 (international peace). Linking a Right + a DPSP shows constitutional sophistication.]] at stake. State the directive (Discuss / Critically examine / Evaluate / Comment).",
  bodyPoints: [
    "ARTICLES & SCHEDULES first — cite the exact constitutional text. Not 'the Constitution provides for...' but 'Article 280 mandates the Finance Commission every five years'. Add Schedule references where relevant (7th Schedule for Union/State/Concurrent lists, 9th for protected laws, 10th for anti-defection).",
    "Cite at least one landmark [[SC judgment||The 12 must-know cases for Polity Mains: Kesavananda Bharati (1973, basic structure), Maneka Gandhi (1978, due process expanded Art 21), Minerva Mills (1980, FR-DPSP balance), Indira Sawhney (1992, 50% reservation cap), S.R. Bommai (1994, secularism + Art 356 review), Vishaka (1997, sexual harassment guidelines), I.R. Coelho (2007, 9th Schedule reviewable), NALSA (2014, transgender rights), Puttaswamy (2017, privacy as FR), Navtej Singh Johar (2018, Sec 377 read down), Joseph Shine (2018, adultery), Shayara Bano (2017, triple talaq). Name the case + the year + one-line ratio.]] — e.g. Kesavananda Bharati for basic structure, S.R. Bommai for federalism + secularism, Puttaswamy for privacy, NALSA for transgender rights, Vishaka for women's safety. Year + one-line ratio is the gold standard.",
    "Bring in [[committee recommendations||UPSC GS-II rewards specific committee citations. Top 10 to remember: 2nd ARC (15 reports on governance reform), Sarkaria Commission (1983, Centre-State relations), Punchhi Commission (2007, Centre-State updated), Justice Verma Committee (2013, women's safety post-Nirbhaya), Justice Srikrishna Committee (2018, data protection), N.K. Singh Committee (2017, FRBM review), Election Commission's reforms (Goswami 1990), Vohra Committee (1993, criminalisation of politics), Swaran Singh Committee (1976, FDs), Dinesh Goswami Committee (1990, electoral reforms).]] — 2nd ARC, Sarkaria, Punchhi, Justice Verma, Srikrishna (data protection), N.K. Singh (FRBM), Vohra (criminalisation of politics), Goswami (electoral reforms). Name the chair + year + key recommendation.",
    "Where the question allows, bring in [[comparative constitutional practice||UPSC's comparative angle: Britain (parliamentary supremacy, no written constitution), USA (presidential system, judicial review, due process), Canada (federalism, notwithstanding clause), Australia (concurrent list, federal financial relations), Germany (basic law, eternity clause — inspired Kesavananda's basic structure), South Africa (transformative constitutionalism). Even ONE comparative line ('Unlike the US, India has no political question doctrine') signals depth.]] — UK parliamentary supremacy, US judicial review, Canadian federalism, German eternity clause, South African transformative constitutionalism. One comparative line signals depth.",
    "Identify [[implementation gaps||Polity questions almost always have a 'what's broken' angle. Common gaps to flag: low judicial vacancy fill rate (~30% in HCs), pendency (50 million cases), criminalisation of politics (43% of MPs face cases — ADR 2024), low women's representation (15% in Lok Sabha), Centre-State friction over GST compensation, governor's discretion misuse, anti-defection law loopholes, urban local body neglect. Stating the GAP first, then the REFORM, is the topper structure.]] — judicial pendency, low women's representation in Parliament, governor's discretion misuse, anti-defection loopholes, urban local body neglect — and propose a SPECIFIC reform direction.",
  ],
  conclusion:
    "Anchor your reform proposal in [[constitutional morality||Coined by B.R. Ambedkar in his Constituent Assembly speeches (4 November 1948) — the obligation to follow the spirit and not just the letter of the Constitution. The SC has invoked it in Naz Foundation (2009), Manoj Narula (2014), Lt Governor of Delhi (2018), Sabarimala (2018) and Navtej Singh Johar (2018). Closing a Polity answer with 'this requires a renewed commitment to constitutional morality' is a topper move that earns an instant integration mark.]] or a Directive Principle. End with a balanced governance vision — neither pro-state nor anti-state, but pro-constitutional-design. Avoid one-sided endings; UPSC's examiners want you to think like a future Joint Secretary, not an opposition politician.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "Critically examine the role of the Governor in the present federal setup. (UPSC 2022, GS-II)",
    "Discuss the role of the Election Commission of India in light of evolution of the Model Code of Conduct. (UPSC 2022, GS-II)",
    "'The Supreme Court of India keeps a check on arbitrary power of the Parliament in amending the Constitution.' Discuss critically. (UPSC 2017, GS-II)",
  ],
}

// ── 5. ECONOMY (GS-III) ──────────────────────────────────────────────────────
const ECONOMY: MainsFramework = {
  title: "Writing an Economy Mains answer",
  subtitle: "Data-driven sectoral analysis — GS-III",
  introduction:
    "Define the economic concept / sector / policy in one line, then anchor it in current data — the latest [[Economic Survey||The Economic Survey is released in two volumes (Vol I = analysis, Vol II = sectoral data) the day before the Union Budget by the Chief Economic Adviser. Memorise 3-4 stats from the most recent edition: real GDP growth, fiscal deficit % of GDP, CAD %, gross fixed capital formation, employment in agriculture (~46%), services share of GDP (~54%). Quote it in your first body line — 'Per the Economic Survey 2023-24...' — and you immediately separate yourself from the bottom 80%.]], the Union Budget, the latest RBI Monetary Policy report, or the NITI Aayog SDG India Index. State the macro context (growth / fiscal / monetary / employment / inflation / external balance) and announce the directive.",
  bodyPoints: [
    "Lead with NUMBERS from authoritative sources — Economic Survey, Union Budget, RBI MPC reports, PLFS for employment, ASI for industry, NSS rounds, NITI Aayog, World Bank, IMF Article IV, Doing Business Report. Generic 'India's economy is growing' loses marks; '7.6% real GDP growth in FY24, per the Economic Survey' earns them.",
    "Take a SECTORAL view — agriculture, industry (manufacturing + mining + utilities), services (IT, finance, tourism), MSME, labour. Each sector has its own scheme + concern + data point. Don't lump 'the Indian economy' — disaggregate.",
    "Show POLICY MEASURES — name the schemes (PM-KISAN, PMFME, PLI scheme, MUDRA, Stand-Up India, Atmanirbhar Bharat packages, GatiShakti, Make in India, Vocal for Local), the RBI tools (repo, CRR, OMO, LAF, MSF) and the fiscal levers (capital expenditure ratio, revenue/fiscal deficit, off-budget borrowings).",
    "Map [[STAKEHOLDER impact||Economy questions are won on stakeholder mapping. The standard six: (1) farmers / agri-labour, (2) consumers, (3) MSMEs, (4) formal labour, (5) informal labour (~85% of workforce, per PLFS), (6) corporate sector. Plus where relevant: women workers, youth (NEET), tribal communities, exporters. Naming the affected stakeholder + the magnitude of impact ('the 85% informal workforce') is what 'multi-dimensional' actually means in Economy answers.]] — farmers, consumers, MSMEs, formal labour, the 85% informal workforce, exporters. Name the constituency, name the impact size.",
    "Bring in COMPARATIVE international practice where relevant — China's manufacturing-led growth, Germany's Mittelstand for MSMEs, Vietnam's export model, South Korea's Chaebols, the Nordic welfare model. Even one comparative example signals the global lens UPSC examiners reward.",
  ],
  conclusion:
    "Close with a SPECIFIC reform recommendation — not 'reforms are needed' but 'NITI Aayog should institutionalise X', 'the Finance Commission should weight Y', 'the RBI should sequence Z'. Anchor the close in the [[growth-equity-sustainability triangle||Every Economy conclusion should respect three constraints simultaneously: GROWTH (GDP, productivity, investment), EQUITY (distribution, reduction in inequality, reaching the bottom decile) and SUSTAINABILITY (environmental, fiscal, intergenerational). Topper closures invoke all three: 'A reform that drives growth, embeds equity and respects ecological limits is what India 2047 demands.' This trifecta closure is non-negotiable for high marks.]] — UPSC penalises closes that ignore equity or ecology. End with the Inclusive Development frame.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "Examine the role of MSMEs in India's economic growth and the challenges they face. (UPSC 2022, GS-III)",
    "Discuss the challenges to India's manufacturing sector in achieving the targets set under the Make in India initiative. (UPSC 2018, GS-III)",
    "Distinguish between Capital Budget and Revenue Budget. Explain the components of both these Budgets. (UPSC 2021, GS-III)",
  ],
}

// ── 6. ENVIRONMENT (GS-III) ──────────────────────────────────────────────────
const ENVIRONMENT: MainsFramework = {
  title: "Writing an Environment Mains answer",
  subtitle: "Indian context, global frame, climate justice — GS-III",
  introduction:
    "Define the environmental issue / ecosystem / treaty in one line, then anchor it in a recent global event — the latest [[CoP outcome||The Conference of Parties under UNFCCC. Recent CoPs to memorise: CoP-26 Glasgow (2021, coal 'phase down' rather than 'phase out', India's 'Panchamrit' commitments — 500 GW non-fossil capacity by 2030, net zero by 2070), CoP-27 Sharm El-Sheikh (2022, Loss & Damage Fund), CoP-28 Dubai (2023, 'transitioning away from fossil fuels'), CoP-29 Baku (2024, climate finance). Quoting the latest CoP earns instant currency marks.]], an IPCC report finding, India's NDC update, or the SDG India Index. State India's stake — vulnerability, biodiversity hotspot status, energy needs, coastal exposure.",
  bodyPoints: [
    "Frame the INDIAN context — National Action Plan on Climate Change (NAPCC) and its 8 missions (National Solar Mission, Mission for Sustainable Habitat, Water Mission, Green India Mission, Sustainable Agriculture, Strategic Knowledge, Himalayan Eco-system, Enhanced Energy Efficiency), India's NDC ([[Panchamrit||India's five climate commitments at CoP-26 (Glasgow, 2021): (1) 500 GW non-fossil energy capacity by 2030, (2) 50% of energy from renewables by 2030, (3) 1 billion tonne reduction in projected emissions by 2030, (4) 45% reduction in carbon intensity of GDP by 2030, (5) NET ZERO by 2070. Naming all five Panchamrits in one line is a topper signature for any climate question.]]), the LiFE movement, Green Hydrogen Mission, GOBARdhan, Compensatory Afforestation Fund (CAMPA).",
    "Frame the GLOBAL context — UNFCCC, the Paris Agreement (2015, 1.5°C aspirational), Kyoto Protocol, Convention on Biological Diversity (CBD), Ramsar Convention (wetlands), CITES (wildlife trade), the Montreal Protocol (ozone, the only universally ratified treaty), IPCC's AR6 (2021-23). Mention India's leadership role: International Solar Alliance (ISA), Coalition for Disaster Resilient Infrastructure (CDRI), Global Biofuels Alliance.",
    "Bring in specific [[Indian case studies||Top environmental case studies UPSC keeps testing: Western Ghats (Gadgil + Kasturirangan reports), Sundarbans (climate vulnerability + Royal Bengal Tiger), Joshimath subsidence (2023), Wayanad landslides (2024), Assam floods, Cauvery & Krishna disputes, Aravalli encroachment, Nilgiris biosphere reserve, Chilika Lake restoration (Ramsar success), Kaziranga's rhino conservation, Project Tiger (now 53 reserves, 3,167 tigers per 2022 estimate), Project Elephant. Naming a specific case + a number is the gold standard.]] — Western Ghats (Gadgil & Kasturirangan reports), Sundarbans, Joshimath (2023), Wayanad landslides (2024), Cauvery dispute, Project Tiger (53 reserves, 3,167 tigers per 2022 estimate), Chilika Lake restoration.",
    "Identify the [[multi-stakeholder map||Environment questions are won on stakeholder mapping: (1) local communities & forest dwellers (FRA 2006 rights), (2) state forest departments, (3) Centre (MoEFCC, NGT), (4) industry (extractive vs ESG-aligned), (5) civil society & NGOs, (6) international bodies (UNFCCC, CBD secretariat), (7) future generations (intergenerational equity). Top answers literally name 4-5 of these in one body point.]] — forest communities, state departments, MoEFCC, industry, NGOs, international bodies, future generations. The Forest Rights Act 2006 dimension is non-negotiable for any forest question.",
    "Solutions in three layers: NATURE-BASED (mangroves, agroforestry, watershed conservation), TECHNOLOGICAL (green hydrogen, CCUS, EV charging infrastructure, bioenergy), POLICY (carbon pricing, EPR, ESG disclosures, environmental taxes). Name 1-2 examples in each layer.",
  ],
  conclusion:
    "Close with the [[climate justice||The principle that those least responsible for climate change (the Global South, Indigenous peoples, the poor, future generations) bear its worst impacts and should not pay its costs. India's diplomatic position rests on this — Common But Differentiated Responsibilities (CBDR) under UNFCCC, the demand for $100 bn/year climate finance from developed nations, the Loss & Damage Fund won at CoP-27. Closing an environment answer with the climate justice frame is what separates a 6 from a 9.]] frame and India's leadership role — ISA, CDRI, Mission LiFE, the Global Biofuels Alliance. Invoke [[intergenerational equity||The principle that the present generation holds the planet in trust for those not yet born. Coined in international environmental law (Brundtland, Rio Declaration). Used by the SC in T.N. Godavarman v. Union of India (the ongoing forest conservation case) and M.C. Mehta v. Kamal Nath (1997, public trust doctrine). Naming intergenerational equity in your conclusion grounds the answer in environmental ethics.]] and the public trust doctrine where relevant.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "Discuss in detail the photochemical smog emphasising its formation, effects and mitigation. (UPSC 2022, GS-III)",
    "What are the key features of the National Action Plan on Climate Change (NAPCC) launched by Government of India? (UPSC 2022, GS-III)",
    "Mention the significance of straits and isthmus in international trade. (UPSC 2022, GS-III)",
  ],
}

// ── 7. SCIENCE & TECHNOLOGY (GS-III) ─────────────────────────────────────────
const SCIENCE_TECH: MainsFramework = {
  title: "Writing a Science & Technology Mains answer",
  subtitle: "Tech, capability, ethics and policy — GS-III",
  introduction:
    "Define the technology / scientific concept in plain English (1 line), then anchor it in a recent Indian milestone — an [[ISRO mission||Recent ISRO missions to memorise: Chandrayaan-3 (2023, soft landing on lunar south pole, first nation to do so), Aditya-L1 (2023, India's first solar observatory at L1 Lagrange point), Gaganyaan (crewed mission scheduled for 2025), XPoSat (2024, X-ray polarimetry), NavIC (regional satnav), GSLV Mk III / LVM3, RLV-TD (reusable launch vehicle), Reusable launch vehicle. ISRO is India's most-tested S&T topic — know 3-4 missions cold.]], a DRDO test, an IIT/IISc breakthrough, or a CSIR/ICMR development. State its strategic / developmental significance.",
  bodyPoints: [
    "Explain WHAT the technology does in 2-3 plain-English sentences. UPSC examiners are generalists — they reward clarity over jargon. e.g. for CRISPR: 'CRISPR-Cas9 is a gene-editing tool that uses a guide RNA to direct an enzyme to a specific DNA sequence and cut it, allowing scientists to delete, insert or modify genes with high precision.'",
    "Describe INDIA's capability — the institutional ecosystem: ISRO, DRDO, BARC, CSIR (38 labs), ICMR, ICAR, DBT, DST, BIRAC, IIT/IISc/IIIT/IISER networks, NIPER. Name the specific institution doing the work + one named output (e.g. 'BHEL's electric vehicle motor', 'IIT Madras' Hyperloop pod', 'IISc's gene therapy trials').",
    "Cover APPLICATION areas — agriculture (precision farming, drought-resistant seeds), health (vaccines, telemedicine), defence (BrahMos, K-series SLBMs, Tejas), space (NavIC, communication, remote sensing for disaster management), communication (5G, BharatNet), education (DIKSHA, SWAYAM).",
    "Address [[ethical and regulatory concerns||Every S&T answer must touch the ethics layer. Common concerns: (1) IPR & access (e.g. cost of patented Covid drugs), (2) data privacy (DPDP Act 2023, Puttaswamy verdict), (3) biosafety (Cartagena Protocol, GEAC clearance for GM crops), (4) dual-use (nuclear, biotech, AI weapons), (5) environmental impact (e-waste, satellite debris), (6) algorithmic bias and AI fairness, (7) gene-editing germ-line ethics. Naming 2 concerns + the regulatory body (DPDP, GEAC, AERB, NHA, AIM at NITI Aayog) is the topper move.]] — IPR, data privacy (DPDP Act 2023), biosafety (GEAC, Cartagena Protocol), dual-use (nuclear, biotech, AI weapons), environmental impact, algorithmic bias. Name the concern + the regulator.",
    "Way forward: R&D investment (India's GERD is 0.65% of GDP vs OECD 2.5%), public-private partnership, indigenous IP, brain-gain (return migration of Indian scientists), Anusandhan National Research Foundation (NRF), Atal Innovation Mission, PM Vidyalaxmi, the National Quantum Mission.",
  ],
  conclusion:
    "Anchor the close in [[strategic autonomy||India's foundational foreign-policy and tech doctrine — the freedom to pursue national interests without dependence on any external bloc. Coined in the post-Cold War era, formalised in nuclear policy (1998 Pokhran, the 'minimum credible deterrent' doctrine). In tech, strategic autonomy means: indigenous semiconductor capacity (India Semiconductor Mission, $10 bn PLI), space launch sovereignty (ISRO's full launch stack), defence indigenisation (DAP 2020 with positive indigenisation lists), and now AI (the IndiaAI Mission, 2024). Closing an S&T answer with the strategic autonomy frame is a topper signature.]] and Atmanirbhar Bharat. Tie it to inclusive technology access (digital divide closure, affordable healthcare, scalable agritech) and the [[innovation ecosystem||The full pipeline: basic research (universities + national labs) → translational research (TRL 4-7, the 'valley of death') → commercialisation (startups, BIRAC's BIG/SBIRI grants) → market scale (Make in India, PLI, ESG capital). India's gaps: low private R&D, weak university-industry linkage, low PhD output. Top conclusions name the gap + one concrete reform.]] reform agenda — the Anusandhan NRF, Vigyan Bhawan, the National Research Foundation Act.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [
    "Discuss the application of gene editing in agriculture and healthcare in India. (UPSC 2023, GS-III)",
    "What are the main objectives of the National Quantum Mission? Discuss its applications in everyday life. (UPSC 2023, GS-III)",
    "Discuss the role of ISRO in promoting peaceful uses of outer space. (UPSC 2022, GS-III)",
  ],
}

// ── 8. ETHICS (GS-IV) — Different format altogether ──────────────────────────
const ETHICS: MainsFramework = {
  title: "Writing an Ethics (GS-IV) Mains answer",
  subtitle: "Philosopher, principle, case, application — a different shape",
  introduction:
    "GS-IV answers are NOT structured like other GS papers. Open by defining the [[ethical concept||The 'spine' of every Ethics answer is a clear definition. Top concepts UPSC tests: integrity, impartiality, accountability, dedication, empathy, compassion, tolerance, foundational values, emotional intelligence, conscience, attitude, aptitude, public service motivation, civil service ethics, probity, conflict of interest, moral courage, altruism. Define the concept in your own words first, THEN bring in the philosopher's framing.]] in your own words, then quote ONE thinker — Indian (Gandhi, Vivekananda, Tagore, Aurobindo, Tilak, B.R. Ambedkar, Buddha, Kautilya) or Western (Kant, Mill, Aristotle, Socrates, Rawls, Sen). Frame the concept in the civil services context: how does it apply to a future District Magistrate or Joint Secretary?",
  bodyPoints: [
    "Bring in the THEORETICAL framework — name a tradition: [[Deontology||Kantian — actions are right or wrong in themselves, irrespective of consequences. Core idea: the 'categorical imperative' — act only according to a maxim you'd will to be universal law. e.g. don't lie, don't accept bribes, don't break a promise — even if doing so produces a better outcome. The 'rule-bound' civil servant operates here.]] (Kant — duty for duty's sake), [[Utilitarianism||Bentham, J.S. Mill — the right action is the one that produces the greatest good for the greatest number. Outcome-driven, not rule-driven. e.g. a CO who diverts emergency rations to a worse-affected village even if it breaks queue protocol is a utilitarian. The 'greatest welfare' lens.]] (Bentham, Mill — greatest good for the greatest number), [[Virtue Ethics||Aristotle — focus on the character of the moral agent rather than rules or consequences. The right action is what a virtuous person (one of practical wisdom, phronesis) would do. The Indian parallel is svadharma + sthitaprajna (Bhagavad Gita). The 'character-driven' civil servant operates here.]] (Aristotle — character + practical wisdom), Gandhi (truth + nonviolence), Vivekananda (service as worship), Buddha (Middle Path).",
    "Use a CASE STUDY — a real or fictional civil service dilemma. e.g. 'A young IAS officer discovers her senior is approving sub-standard infrastructure contracts in exchange for political support'. Lay out facts, identify the stakeholders, surface the values in conflict (loyalty vs honesty, hierarchy vs accountability), and walk through possible options.",
    "Map the [[STAKEHOLDERS||Every Ethics case study must list the affected parties + their interests + their values. Standard map: (1) the immediate public/community, (2) the system/institution, (3) the senior/colleague, (4) personal family, (5) the rule of law / Constitution, (6) the larger society / future generations. Top answers number them and put each in a 1-line bullet.]] — who is affected, whose interest dominates, whose values are in tension. Number them: (1) the public, (2) the institution, (3) the senior, (4) the officer's family, (5) the rule of law.",
    "ACTION — what would YOU do as a civil servant? Be specific. Walk through options with their consequences, then commit to a chosen path. Cite [[emotional intelligence||Daniel Goleman's framework: (1) self-awareness, (2) self-regulation, (3) motivation, (4) empathy, (5) social skills. UPSC introduced EI explicitly into the GS-IV syllabus and tests it directly. A civil servant high on EI handles the dilemma not by deflecting but by listening, regulating impulses, motivating the team, empathising with the citizen, and managing relationships with the senior.]], foundational civil service values (integrity, impartiality, accountability, dedication, empathy, compassion, tolerance — the 7 from the syllabus), and probity. Show the reasoning, don't just state the action.",
    "Connect back to constitutional [[values||The Preamble's Justice (social, economic, political), Liberty (of thought, expression, belief, faith, worship), Equality (of status and opportunity), Fraternity (assuring dignity of the individual). Plus the All India Services (Conduct) Rules 1968, the 2nd ARC's 4th Report on Ethics in Governance (2007) which proposed the Civil Services Code, and Article 51A (Fundamental Duties). Top Ethics answers cite at least one of these.]] — Justice, Liberty, Equality, Fraternity from the Preamble — and to the All India Services Conduct Rules 1968 / 2nd ARC's 4th Report (Ethics in Governance, 2007).",
  ],
  conclusion:
    "Close with the civil servant's role as a [[balancer||The civil servant in a democracy is neither a politician nor an activist — they are the institutional balancer between competing values, stakeholders and time horizons. Channel the Gita's sthitaprajna ('one of steady wisdom') or Gandhi's antyodaya ('rise of the last person'). Top GS-IV closures name this balancing role explicitly: 'The civil servant must hold integrity in one hand and empathy in the other.']] — neither activist nor bureaucrat, but the institutional steward of public trust. Quote ONE line from Gandhi, Vivekananda, Aurobindo or Tagore — and mean it. End with public service motivation: 'service not as a career but as a calling'.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark) · case studies often longer",
  pyqSamples: [
    "What is meant by 'environmental ethics'? Why is it important to study? Discuss any one of the major environmental issues from the viewpoint of environmental ethics. (UPSC 2023, GS-IV)",
    "What does each of the following quotations mean to you? (a) 'The weak can never forgive. Forgiveness is the attribute of the strong.' — Mahatma Gandhi (UPSC 2022, GS-IV)",
    "Case study: A civil servant facing pressure to clear an environmentally damaging project — discuss the ethical issues involved and your course of action. (UPSC pattern)",
  ],
}

// ── 9. ESSAY (CSE Essay Paper) — Different format ────────────────────────────
const ESSAY: MainsFramework = {
  title: "Writing an Essay (CSE Essay Paper)",
  subtitle: "Multi-paragraph, philosophical, no headings — 1000-1200 words",
  introduction:
    "Open with a [[hook||Essay openings make or break the score. Topper hooks: a quotation (Tagore, Gandhi, Tagore, Camus, Sen — pick one that's apt and not overused), a paradox ('the world has more food than ever, yet 800 million go hungry'), a vivid anecdote (1-2 sentences from a real or imagined scene), a historical moment, or a startling statistic. Avoid clichés ('Education is the most powerful weapon...'). The hook should make the examiner want to read paragraph 2.]] — a quotation, a paradox, a vivid anecdote, or a startling statistic. Then in 2-3 sentences state your central [[thesis||The essay's spine — your one-sentence answer to the question. Every paragraph in the body must serve this thesis. Without a clear thesis the essay reads like a Wikipedia entry. Toppers state the thesis in line 3-4 of the opening paragraph and then 'preview' the essay's structure: 'I will argue X by examining Y, Z and W.']] — what the essay will argue. Preview the path: 'I will explore this through historical, social and contemporary lenses.'",
  bodyPoints: [
    "NO HEADINGS in the essay paper — flowing paragraphs only. Each paragraph carries one idea, runs 100-150 words, and ends with a transition into the next. The essay paper rewards prose, not bullet points.",
    "5-7 BODY paragraphs each focused on a distinct dimension — historical, philosophical, social, economic, ethical, contemporary, comparative (international). Use the [[PESTEL + Ethics||The essay's safest body scaffold: Political, Economic, Social, Technological, Environmental, Legal — plus Ethical/Philosophical. Cover at least 4 of these 7 dimensions across the body. UPSC examiners actively look for breadth in essays — a one-dimension essay caps at 50%. The 'Past-Present-Future' triptych is another solid scaffold for any progress / development / change essay.]] scaffold or the Past-Present-Future triptych.",
    "Weave EXAMPLES into the prose — historical figures, literature, current events, personal observation (rare, sparingly), international comparisons. Don't list examples; narrate them. e.g. 'When Rosa Parks refused to give up her seat in 1955, she did not merely defy a bus law — she made visible a larger architecture of segregation that had until then remained invisible to those it served.'",
    "Use [[quotations sparingly||Essay quotations: 2-3 per essay, max. Sources: Tagore, Gandhi, Aurobindo, Vivekananda, B.R. Ambedkar, Nehru (sparingly), Amartya Sen, Martha Nussbaum, Camus, Hannah Arendt, Tagore, Tagore, Tagore (he's a topper favourite). Avoid the Steve Jobs / Einstein circuit. Place a quotation at a critical pivot point — after a paradox, before a counter-argument, or as the final line of the essay.]] for emphasis — 2-3 across the whole essay, max. Place them at critical pivots, not as decoration.",
    "Address the COUNTER-ARGUMENT in one full paragraph. Even if you favour one side, give the opposing view its strongest possible articulation, then respond. This is what separates a balanced essay from an advocacy piece — and it's exactly what UPSC examiners are trained to look for.",
  ],
  conclusion:
    "Loop back to the opening [[hook||The most satisfying essay closures return to the image, quotation or paradox the essay opened with — but with new meaning earned by the body's argument. e.g. if you opened with Rosa Parks, close with 'Like Parks, the citizen who refuses to look away makes injustice visible — and visibility is the first act of change.' This 'circular closure' is the topper's signature move.]] — but with new meaning the body has earned. Widen the lens to a national / human / civilisational vision. Close on a hopeful, future-oriented note that does NOT moralise. Avoid 'in conclusion'; let the final paragraph itself signal closure.",
  wordLimit: "1000-1200 words · 1.5 hours per essay · 2 essays in the paper",
  pyqSamples: [
    "'Education is what survives when what has been learnt has been forgotten.' (UPSC Essay 2023)",
    "'Forests are the best case studies for economic excellence.' (UPSC Essay 2023)",
    "'Wisdom finds truth.' (UPSC Essay 2023)",
  ],
}

// ── 10. DEFAULT — current affairs, general science, fallback ─────────────────
const DEFAULT: MainsFramework = {
  title: "Writing a UPSC Mains GS answer",
  subtitle: "The universal blueprint",
  introduction:
    "Define the key term in one line, then anchor it in current relevance — a recent SC verdict, a committee report, a flagship scheme, or an SDG/UN frame. State the [[directive||UPSC uses very specific question verbs (Discuss / Analyse / Examine / Critically Examine / Comment / Evaluate). Each demands a different structure. Examiners check whether you obeyed the directive — half the marks ride on that obedience alone.]] (Discuss / Analyse / Examine / Critically) explicitly so the examiner sees you read the question. 2-3 lines, ~40-50 words.",
  bodyPoints: [
    "Cover at least 2-3 dimensions — pick from constitutional, social, economic, environmental, ethical, geopolitical, federal — whichever fit the question best. Multi-dimensional answers always score higher than one-track ones.",
    "Substantiate every claim with a specific [[anchor||An 'anchor' in UPSC writing means a concrete proof point. Generic claims ('India faces challenges') score zero; specific anchors ('the 2015 NITI Aayog report flagged X', 'Article 21 covers Y after Puttaswamy', '63% per NFHS-5') score full marks. Anchor every sentence.]]: Article number, Committee/Yojana name, SC judgment, scheme, data point, year. Generic statements lose marks; concrete examples earn them.",
    "Use micro-headings or numbered sub-points so the examiner can scan your answer in 30 seconds. Bold key terms — examiners spend 60-90 seconds per answer.",
    "If the directive is 'Examine' or 'Critically Analyse', address the counter-view too. UPSC rewards balanced thinking, not advocacy.",
    "Connect back to a wider syllabus theme — Federalism, Welfare State, Cooperative Federalism, Sustainable Development, Just Society — so the examiner sees you can integrate across the syllabus.",
  ],
  conclusion:
    "End with a forward-looking solution: a constitutional/SDG frame, a specific reform direction, or a balanced way ahead. Avoid one-sided closures — UPSC values nuance. Close on a positive, solution-oriented note. 2-3 lines.",
  wordLimit: "150 words (10-mark) · 250 words (15-mark)",
  pyqSamples: [],
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject-ID → framework mapping. Subject IDs come from data/syllabus.ts.
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_TO_FRAMEWORK: Record<string, MainsFramework> = {
  // GS-I — History
  'ancient-history': HISTORY,
  'medieval-history': HISTORY,
  'modern-history': HISTORY,
  'world-history': HISTORY,
  'post-independence': HISTORY,
  // GS-I — Geography & Society
  'geography': GEOGRAPHY,
  'society': SOCIETY,
  // GS-II
  'polity': POLITY,
  // GS-III
  'economy': ECONOMY,
  'environment': ENVIRONMENT,
  'science-tech': SCIENCE_TECH,
  // Prelims-only General Science also routes to SCIENCE_TECH so the
  // aspirant gets science-specific writing guidance instead of the
  // generic GS blueprint. Same content domain, same scaffold.
  'general-science': SCIENCE_TECH,
  // GS-IV
  'ethics': ETHICS,
  // Essay
  'essay': ESSAY,
  // Anything else (current-affairs, future subjects) → DEFAULT
}

/**
 * Returns the appropriate Mains answer framework for a given subject.
 *
 * For most subjects this is a 1:1 lookup. For `current-affairs` (which
 * spans economy / environment / science / polity etc.) we look at the
 * topic ID and route to the most relevant framework so the aspirant
 * isn't given the generic blueprint when their topic is clearly about
 * one of the GS papers.
 *
 * Returns null for CSAT (Paper II of Prelims) since CSAT isn't a Mains
 * paper and the framework concept doesn't apply.
 */
export function getMainsFramework(subjectId: string, topicId?: string): MainsFramework | null {
  if (subjectId === 'csat') return null

  // Current-affairs topics live under one umbrella subject but each
  // individual topic belongs to a specific GS paper. Route by topic ID
  // keywords so the aspirant gets the right answer-writing register.
  if (subjectId === 'current-affairs' && topicId) {
    const id = topicId.toLowerCase()
    if (id.includes('econom') || id.includes('budget') || id.includes('rbi') || id.includes('trade') || id.includes('fiscal') || id.includes('survey')) {
      return ECONOMY
    }
    if (id.includes('environment') || id.includes('climate') || id.includes('cop') || id.includes('biodivers')) {
      return ENVIRONMENT
    }
    if (id.includes('science') || id.includes('tech') || id.includes('discoveries') || id.includes('innovation')) {
      return SCIENCE_TECH
    }
    if (id.includes('acts') || id.includes('bills') || id.includes('scheme') || id.includes('governance') || id.includes('polity') || id.includes('judgment')) {
      return POLITY
    }
    // International relations, summits, awards, reports, places in news
    // → fall through to DEFAULT (no IR-specific framework yet)
    return DEFAULT
  }

  return SUBJECT_TO_FRAMEWORK[subjectId] ?? DEFAULT
}
