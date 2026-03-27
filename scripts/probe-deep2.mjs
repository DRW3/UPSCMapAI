const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

async function get(url) {
  const r = await fetch(url, { headers, redirect: 'follow' })
  return { status: r.status, html: await r.text(), final: r.url }
}

// ── InsightsIAS 10-year papers ────────────────────────────────────────────────
console.log('\n=== InsightsIAS 10-year page ===')
const ins = await get('https://www.insightsonindia.com/upsc-ias-civil-services-past-year-prelims-preliminary-exam-full-question-papers-10-years/')
console.log('Status:', ins.status, '| len:', ins.html.length)
const insLinks = [...ins.html.matchAll(/href="([^"]*(?:20[0-9]{2}|question|prelim)[^"]*)"[^>]*>([^<]{5,80})</gi)]
  .map(m => [m[1].slice(0, 80), m[2].trim()]).slice(0, 20)
console.log('Links:')
insLinks.forEach(([url, text]) => console.log(' ', text, '|', url))

await new Promise(r => setTimeout(r, 500))

// ── GitHub datasets ───────────────────────────────────────────────────────────
console.log('\n=== GitHub UPSC PYQ datasets ===')
const ghSources = [
  'https://raw.githubusercontent.com/doadam/zimaUPSC/main/data/prelims.json',
  'https://raw.githubusercontent.com/upsc-pyq/upsc-pyq.github.io/main/data/questions.json',
  'https://api.github.com/search/repositories?q=upsc+pyq+questions+json&sort=stars',
]
for (const url of ghSources) {
  const r = await get(url)
  if (r.status === 200) {
    console.log('FOUND:', url, '| len:', r.html.length, '| preview:', r.html.slice(0, 200))
  } else {
    console.log('MISS:', url, '| status:', r.status)
  }
  await new Promise(r => setTimeout(r, 300))
}

// ── GKToday — find actual quiz slugs ─────────────────────────────────────────
console.log('\n=== GKToday quiz listing ===')
const gkt = await get('https://www.gktoday.in/quiz/?s=upsc+prelims')
console.log('Status:', gkt.status, '| len:', gkt.html.length)
const gktQuizLinks = [...gkt.html.matchAll(/href="(https:\/\/www\.gktoday\.in\/quiz\/[^"]+)"/gi)]
  .map(m => m[1]).slice(0, 20)
console.log('Quiz links:', gktQuizLinks)

await new Promise(r => setTimeout(r, 500))

// ── IndiaBix UPSC section — find actual year-tagged questions ─────────────────
console.log('\n=== IndiaBix UPSC section ===')
const ibx = await get('https://www.indiabix.com/upsc-civil-services-exam/questions-and-answers/')
console.log('Status:', ibx.status, '| len:', ibx.html.length)
const ibxLinks = [...ibx.html.matchAll(/href="(https:\/\/www\.indiabix\.com\/upsc[^"]+)"/gi)]
  .map(m => m[1]).slice(0, 20)
console.log('UPSC links:', ibxLinks)
// Show question sample if present
const qIdx = ibx.html.indexOf('bix-td-qtxt')
if (qIdx > -1) console.log('SAMPLE Q:', ibx.html.slice(qIdx, qIdx + 300))
