const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}
async function get(url) {
  try {
    const r = await fetch(url, { headers, redirect: 'follow' })
    return { status: r.status, html: await r.text(), final: r.url }
  } catch (e) {
    return { status: 0, html: '', final: url, err: e.message }
  }
}

// ── GKToday question pages (not quizzes) ──────────────────────────────────────
console.log('\n=== GKToday question pages ===')
const gktPages = [
  'https://www.gktoday.in/question-answer/',
  'https://www.gktoday.in/gk/upsc-civil-services-exam/',
  'https://www.gktoday.in/gk/questions/upsc-civil-services-exam/',
  'https://www.gktoday.in/gk/solved-paper-upsc-civil-services-preliminary-exam-2023/',
  'https://www.gktoday.in/gk/solved-paper-upsc-civil-services-preliminary-exam-2022/',
  'https://www.gktoday.in/gk/solved-paper-upsc-civil-services-preliminary-exam-2019/',
]
for (const url of gktPages) {
  const r = await get(url)
  const opts = (r.html.match(/\(A\)|\(a\)|option-a|data-answer/gi) || []).length
  console.log(`[${r.status}] ${opts} opts | ${url.slice(0,75)}`)
  if (opts > 3) {
    const idx = r.html.search(/\(A\)|\(a\)/i)
    console.log('  SAMPLE:', r.html.slice(Math.max(0,idx-200), idx+300))
  }
  await new Promise(r => setTimeout(r, 400))
}

// ── IndiaBix actual UPSC exam pages ───────────────────────────────────────────
console.log('\n=== IndiaBix UPSC Civil Services — actual exam pages ===')
const ibxPages = [
  'https://www.indiabix.com/upsc-civil-services-exam/',
  'https://www.indiabix.com/upsc-civil-services-exam/2023/',
  'https://www.indiabix.com/upsc-civil-services-exam/2022/',
]
for (const url of ibxPages) {
  const r = await get(url)
  const containers = (r.html.match(/bix-div-container/g) || []).length
  const links = [...r.html.matchAll(/href="(https?:\/\/www\.indiabix\.com\/upsc[^"]+)"/gi)].map(m=>m[1]).slice(0,10)
  console.log(`[${r.status}] ${containers} containers | ${r.html.length}B | ${url}`)
  if (links.length) console.log('  Links:', links)
  await new Promise(r => setTimeout(r, 300))
}

// ── Currentaffairs4u ─────────────────────────────────────────────────────────
console.log('\n=== currentaffairs4u ===')
const ca4u = await get('https://www.currentaffairs4u.com/upsc-previous-year-papers/')
console.log(`[${ca4u.status}] ${ca4u.html.length}B`)
const opts4u = (ca4u.html.match(/\(A\)|\(a\)/g) || []).length
console.log('Option-A count:', opts4u)
if (opts4u > 3) console.log('SAMPLE:', ca4u.html.slice(ca4u.html.indexOf('(A)')-200, ca4u.html.indexOf('(A)')+300))
await new Promise(r => setTimeout(r, 300))

// ── Oliveboard ────────────────────────────────────────────────────────────────
console.log('\n=== Oliveboard ===')
const ob = await get('https://www.oliveboard.in/blog/upsc-previous-year-papers/')
console.log(`[${ob.status}] ${ob.html.length}B`)
const obLinks = [...ob.html.matchAll(/href="([^"]*upsc[^"]*20[0-9]{2}[^"]*paper[^"]*)"/gi)].map(m=>m[1]).slice(0,8)
console.log('Links:', obLinks)
await new Promise(r => setTimeout(r, 300))

// ── Sarkari Result / similar aggregators ─────────────────────────────────────
console.log('\n=== UPSC IAS Exam question papers (aggregator) ===')
const urls = [
  'https://www.sarkarinaukri.com/upsc/upsc-previous-year-question-papers',
  'https://www.iasquestion.com/',
  'https://upscpdf.com/upsc-civil-services-question-papers/',
]
for (const url of urls) {
  const r = await get(url)
  const opts = (r.html.match(/\(A\)/g) || []).length
  console.log(`[${r.status}] ${r.html.length}B | ${opts} opts | ${url.slice(0,70)}`)
  await new Promise(r => setTimeout(r, 300))
}

// ── UPSC official site — direct paper links ───────────────────────────────────
console.log('\n=== UPSC official PDF links ===')
const upscOff = await get('https://upsc.gov.in/examinations/previous-question-papers')
console.log(`[${upscOff.status}] ${upscOff.html.length}B | final: ${upscOff.final.slice(0,70)}`)
const pdfLinks = [...upscOff.html.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m=>m[1]).slice(0,10)
console.log('PDF links:', pdfLinks)
