const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
}

async function get(url) {
  const r = await fetch(url, { headers, redirect: 'follow' })
  return { status: r.status, html: await r.text(), final: r.url }
}

// ── 1. upscpdf.com — has options:YES ─────────────────────────────────────────
console.log('\n=== upscpdf.com ===')
const pdf = await get('https://upscpdf.com/upsc-question-papers')
// Find actual question links
const pdfLinks = [...pdf.html.matchAll(/href="([^"]*(?:question|paper|prelims|upsc)[^"]*\d{4}[^"]*)"/gi)]
  .map(m => m[1]).filter(l => l.includes('upscpdf.com') || l.startsWith('/'))
  .slice(0, 10)
console.log('Links found:', pdfLinks)
// Show where options appear
const optIdx = pdf.html.indexOf('(A)')
if (optIdx > -1) console.log('Around (A):', pdf.html.slice(optIdx - 200, optIdx + 300))

// ── 2. InsightsOnIndia — 4120 signals ─────────────────────────────────────────
console.log('\n=== insights on india ===')
const insights = await get('https://www.insightsonindia.com/upsc-previous-year-question-papers/')
console.log('Status:', insights.status, 'Final URL:', insights.final)
// Find question links
const iLinks = [...insights.html.matchAll(/href="([^"]*(?:20[0-9]{2}|previous|prelims)[^"]*)"/gi)]
  .map(m => m[1]).filter(Boolean).slice(0, 15)
console.log('Paper links:', iLinks)

// ── 3. Examveda deeper ────────────────────────────────────────────────────────
console.log('\n=== examveda.com ===')
const ev = await get('https://www.examveda.com/upsc-civil-service-exam-ias/')
// Find UPSC links
const evLinks = [...ev.html.matchAll(/href="(https?:\/\/www\.examveda\.com[^"]*upsc[^"]*)"/gi)]
  .map(m => m[1]).slice(0, 10)
console.log('UPSC links:', evLinks)

// ── 4. GKToday main UPSC page ─────────────────────────────────────────────────
console.log('\n=== gktoday main upsc ===')
const gkt = await get('https://www.gktoday.in/upsc/')
console.log('Status:', gkt.status, 'len:', gkt.html.length)
const gktLinks = [...gkt.html.matchAll(/href="(https?:\/\/www\.gktoday\.in[^"]*(?:prelim|civil|upsc|paper)[^"]*)"/gi)]
  .map(m => m[1]).slice(0, 15)
console.log('Links:', gktLinks)

// ── 5. StudyIQ — large page, find question links ─────────────────────────────
console.log('\n=== studyiq ===')
const siq = await get('https://www.studyiq.com/articles/upsc-previous-year-question-papers/')
const siqLinks = [...siq.html.matchAll(/href="([^"]*(?:20[0-9]{2}|prelims|question-paper)[^"]*)"/gi)]
  .map(m => m[1]).filter(l => l.includes('studyiq')).slice(0, 10)
console.log('Links:', siqLinks)
