const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}
async function get(url) {
  const r = await fetch(url, { headers, redirect: 'follow' })
  return { status: r.status, html: await r.text(), final: r.url }
}

// ── Mrunal.org — known for clean accessible UPSC content ─────────────────────
console.log('\n=== Mrunal.org ===')
const mr = await get('https://mrunal.org/2023/06/upsc-prelims-2023-question-paper.html')
console.log('Status:', mr.status, '| len:', mr.html.length)
const mrOpts = (mr.html.match(/\(\s*[aA]\s*\)/g) || []).length
console.log('Option-A count:', mrOpts)
if (mrOpts > 3) {
  const idx = mr.html.indexOf('(A)') || mr.html.indexOf('(a)')
  console.log('SAMPLE:', mr.html.slice(Math.max(0, idx-200), idx+400))
}
await new Promise(r => setTimeout(r, 400))

// ── IAS Baba ─────────────────────────────────────────────────────────────────
console.log('\n=== IAS Baba ===')
const ib = await get('https://www.iasbaba.com/upsc-prelims-previous-year-question-papers/')
console.log('Status:', ib.status, '| len:', ib.html.length)
const ibLinks = [...ib.html.matchAll(/href="([^"]*(?:prelims|20[0-9]{2}|question)[^"]*)"/gi)]
  .map(m => m[1]).filter(u => u.includes('iasbaba')).slice(0, 10)
console.log('Links:', ibLinks)
await new Promise(r => setTimeout(r, 400))

// ── Vision IAS ────────────────────────────────────────────────────────────────
console.log('\n=== Vision IAS ===')
const vi = await get('https://www.visionias.in/resources/upsc-civil-services-previous-year-papers')
console.log('Status:', vi.status, '| len:', vi.html.length)
await new Promise(r => setTimeout(r, 400))

// ── FreePyq / pyqupsc ─────────────────────────────────────────────────────────
console.log('\n=== pyqupsc alternatives ===')
const pyq = await get('https://upscpdf.com/upsc-prelims-question-paper')
console.log('Status:', pyq.status, '| len:', pyq.html.length)
const pyqLinks = [...pyq.html.matchAll(/href="([^"]*prelims[^"]*20[0-9]{2}[^"]*)"/gi)].map(m=>m[1]).slice(0,10)
console.log('Links:', pyqLinks)
await new Promise(r => setTimeout(r, 300))

// ── UPSC official answer key PDFs ─────────────────────────────────────────────
// These are public domain on upsc.gov.in
console.log('\n=== UPSC Official Site ===')
const off = await get('https://upsc.gov.in/examinations/previous-question-papers')
console.log('Status:', off.status, '| final:', off.final)
const offLinks = [...off.html.matchAll(/href="([^"]*\.pdf[^"]*)"/gi)].map(m=>m[1]).slice(0,10)
console.log('PDF links:', offLinks)
await new Promise(r => setTimeout(r, 300))

// ── Testbook free questions ────────────────────────────────────────────────────
console.log('\n=== TestBook (free) ===')
const tb = await get('https://testbook.com/upsc-previous-year-papers/upsc-2023-gs-1-question-paper')
console.log('Status:', tb.status, '| len:', tb.html.length)
const tbOpts = (tb.html.match(/option[_-]a|data-option="a"|\(A\)/gi) || []).length
console.log('Option signals:', tbOpts)

await new Promise(r => setTimeout(r, 300))

// ── IAS Kracker / similar ─────────────────────────────────────────────────────
console.log('\n=== iaskracker / solutionphp ===')
const ik = await get('https://www.solutionphp.com/upsc-prelims-2023-question-paper-with-answer-key/')
console.log('Status:', ik.status, '| len:', ik.html.length)
const ikOpts = (ik.html.match(/\(A\)/g) || []).length
console.log('(A) count:', ikOpts)
if (ikOpts > 5) {
  const idx = ik.html.indexOf('(A)')
  console.log('SAMPLE:', ik.html.slice(Math.max(0,idx-300), idx+500))
}
