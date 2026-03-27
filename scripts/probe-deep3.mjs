const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}
async function get(url) {
  const r = await fetch(url, { headers, redirect: 'follow' })
  return { status: r.status, html: await r.text(), final: r.url }
}
function showSample(html, marker, context = 600) {
  const idx = html.indexOf(marker)
  if (idx > -1) return html.slice(Math.max(0, idx - 50), idx + context)
  return '(not found)'
}

// ── InsightsIAS solve PYQs ─────────────────────────────────────────────────
console.log('\n=== InsightsIAS /upsc-previous-year-prelims-qp/ ===')
const ins = await get('https://www.insightsonindia.com/upsc-previous-year-prelims-qp/')
console.log('Status:', ins.status, '| len:', ins.html.length)
const hasOpts = ins.html.includes('(A)') || ins.html.includes('option-a') || ins.html.includes('data-correct')
console.log('Has options:', hasOpts)
// Find question links
const insLinks = [...ins.html.matchAll(/href="([^"]*(?:prelims|20[0-9]{2}|question)[^"]*)"[^>]*>([^<]{5,60})</gi)]
  .map(m => [m[2].trim(), m[1].slice(0, 90)]).slice(0, 15)
insLinks.forEach(([t, u]) => console.log(' ', t, '|', u))

await new Promise(r => setTimeout(r, 500))

// ── Jagran Josh year-wise ──────────────────────────────────────────────────
console.log('\n=== Jagran Josh ===')
const jj2023 = await get('https://www.jagranjosh.com/articles/upsc-prelims-2023-question-paper-gs-1-with-answer-key-1685449090-1')
console.log('Status:', jj2023.status, '| len:', jj2023.html.length)
const jjHasQ = jj2023.html.includes('(A)') || jj2023.html.includes('(a)') || jj2023.html.includes('Option')
console.log('Has options:', jjHasQ)
if (jjHasQ) console.log('SAMPLE:', showSample(jj2023.html, '(A)', 400))

await new Promise(r => setTimeout(r, 400))

// ── AffairsCloud ──────────────────────────────────────────────────────────
console.log('\n=== AffairsCloud ===')
const ac = await get('https://affairscloud.com/upsc/upsc-previous-year-question-papers/')
console.log('Status:', ac.status, '| len:', ac.html.length)
const acLinks = [...ac.html.matchAll(/href="([^"]*upsc[^"]*(?:20[0-9]{2}|prelim)[^"]*)"/gi)]
  .map(m => m[1]).slice(0, 10)
console.log('Links:', acLinks)

await new Promise(r => setTimeout(r, 400))

// ── Adda247 ───────────────────────────────────────────────────────────────
console.log('\n=== Adda247 ===')
const ad = await get('https://currentaffairs.adda247.com/upsc-previous-year-question-papers/')
console.log('Status:', ad.status, '| len:', ad.html.length)
const adHasQ = ad.html.includes('(A)') || ad.html.includes('option')
console.log('Has options:', adHasQ)

await new Promise(r => setTimeout(r, 400))

// ── Sriram IAS / KSG / direct year URLs ───────────────────────────────────
console.log('\n=== Direct year-wise question sites ===')
const directUrls = [
  'https://www.jagranjosh.com/articles/upsc-prelims-2022-question-paper-gs-paper-1-1654599600-1',
  'https://www.jagranjosh.com/articles/upsc-ias-prelims-2019-question-paper-1-with-answer-key-1559218590-1',
  'https://www.ssbcrack.com/2023/05/28/upsc-prelims-2023-question-paper-with-answer-key/',
  'https://www.ssbcrack.com/2022/06/06/upsc-ias-prelims-2022-question-paper-with-answer-key/',
]
for (const url of directUrls) {
  const r = await get(url)
  const hasOpts = r.html.includes('(A)') || r.html.includes('Option A')
  const qCount = (r.html.match(/\(\s*[aA]\s*\)/g) || []).length
  console.log(r.status, '|', qCount, 'option-A |', url.slice(0, 80))
  if (qCount > 5) {
    console.log('  SAMPLE:', showSample(r.html, '(A)', 300))
  }
  await new Promise(r => setTimeout(r, 300))
}
