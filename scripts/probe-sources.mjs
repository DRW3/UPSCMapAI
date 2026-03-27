const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}

const sources = [
  // GKToday year-wise quizzes
  'https://www.gktoday.in/quiz/upsc-2023-prelims-paper-i/',
  'https://www.gktoday.in/quiz/upsc-2022-prelims-paper-i/',
  'https://www.gktoday.in/quiz/upsc-2019-prelims-paper-i/',
  'https://www.gktoday.in/quiz/upsc-cse-prelims-2023/',
  'https://www.gktoday.in/quiz/upsc-cse-2023-gs-paper-1/',
  // Examveda
  'https://www.examveda.com/upsc-civil-service-exam-ias/',
  'https://www.examveda.com/mcq-question-on-upsc-ias/',
  // Drishti IAS
  'https://www.drishtiias.com/upsc-prelims-previous-year-question-papers',
  // ClearIAS
  'https://www.clearias.com/upsc-civil-services-prelims-previous-year-questions/',
  // Prepp
  'https://prepp.in/upsc-ias-question-papers',
  // Insight IAS
  'https://www.insightsonindia.com/upsc-previous-year-question-papers/',
  // Study IQ
  'https://www.studyiq.com/articles/upsc-previous-year-question-papers/',
  // Testbook
  'https://testbook.com/upsc-exam/upsc-previous-year-papers',
  // FreePyQ / dedicated
  'https://pyqupsc.com/',
  'https://www.upscpdf.com/upsc-question-papers',
]

async function probe(url) {
  try {
    const r = await fetch(url, { headers, redirect: 'follow' })
    const html = await r.text()
    const qSignals = (html.match(/question|answer|option|correct/gi) || []).length
    // Check for actual question structure
    const hasOptions = html.includes('(A)') || html.includes('Option A') || html.includes('data-id="A"')
    const hasYear = html.match(/\b(199[3-9]|200[0-9]|201[0-9]|202[0-5])\b/g)
    const years = hasYear ? [...new Set(hasYear)].sort().join(',') : 'none'
    const finalUrl = r.url !== url ? r.url.slice(0, 65) : ''
    console.log(`[${r.status}] ${url.slice(0, 60).padEnd(60)} | ${String(html.length).padStart(7)}B | ${String(qSignals).padStart(4)} signals | options:${hasOptions ? 'YES' : 'no '} | years:${years.slice(0, 30)} ${finalUrl ? '-> ' + finalUrl : ''}`)
  } catch (e) {
    console.log(`[FAIL] ${url.slice(0, 60)} | ${e.message.slice(0, 50)}`)
  }
}

for (const url of sources) {
  await probe(url)
  await new Promise(r => setTimeout(r, 300))
}
