/**
 * discover-pyq-pattern.mjs
 * Use Playwright to navigate Drishti IAS & Vision IAS PYQ pages
 * and discover the actual URL pattern + HTML structure for year-wise questions.
 */
import { chromium } from 'playwright'
import fs from 'fs'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
})

async function probe(url, name) {
  const page = await context.newPage()
  try {
    console.log(`\n[${name}] Loading: ${url}`)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    const title = await page.title()
    console.log(`  Title: ${title}`)

    // Check for question-related text in rendered HTML
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000))
    const hasOptions = /\(A\)|\(B\)|Option A|option-a/i.test(bodyText)
    const optCount = (bodyText.match(/\(A\)|\(a\)/g) || []).length
    console.log(`  (A) count in rendered text: ${optCount}`)
    console.log(`  Text preview: ${bodyText.slice(0, 400).replace(/\n+/g, ' ').trim()}`)

    // Find all internal links that look like year-wise paper pages
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.textContent.trim().slice(0, 60), href: a.href }))
        .filter(l => /20[0-9]{2}|prelim|question|paper|pyq|gs-1|gs1/i.test(l.href + l.text))
        .slice(0, 20)
    )
    if (links.length) {
      console.log('  Year/PYQ links found:')
      links.forEach(l => console.log(`    [${l.text}] ${l.href}`))
    }

    if (optCount > 3) {
      // Full structure discovery
      console.log('\n  *** QUESTIONS FOUND - inspecting structure ***')
      const structure = await page.evaluate(() => {
        const items = []
        // Try common question container selectors
        const selectors = [
          '.question', '.question-text', '.ques', '.q-text',
          'ol > li', '.exam-question', '.pyq-question',
          '[class*="question"]', '[class*="Question"]',
          'p:has(+ ol)', 'p:has(+ ul)',
        ]
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel)
          if (els.length > 0) {
            items.push({ selector: sel, count: els.length, sample: els[0].outerHTML.slice(0, 300) })
          }
        }
        return items
      })
      structure.forEach(s => console.log(`  Selector: "${s.selector}" → ${s.count} elements\n  Sample: ${s.sample}`))

      // Save rendered HTML for inspection
      const html = await page.content()
      const fname = name.replace(/[^a-z0-9]/gi, '_') + '.html'
      fs.writeFileSync(`/tmp/${fname}`, html)
      console.log(`  Saved rendered HTML to /tmp/${fname}`)
    }

    return { url, optCount, links }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`)
    return { url, optCount: 0, links: [] }
  } finally {
    await page.close()
  }
}

// ── Drishti IAS ───────────────────────────────────────────────────────────────
await probe('https://www.drishtiias.com/upsc-prelims-previous-year-paper/', 'DrishtiIAS-index')
await probe('https://www.drishtiias.com/upsc-question-papers/', 'DrishtiIAS-papers')

// ── Vision IAS ────────────────────────────────────────────────────────────────
await probe('https://www.visionias.in/resources/upsc-civil-services-previous-year-papers', 'VisionIAS')
await probe('https://www.visionias.in/previous-year-question-papers/', 'VisionIAS-alt')

// ── Drishti IAS direct year pages (common patterns) ───────────────────────────
const drishtiYears = [
  'https://www.drishtiias.com/upsc-prelims-paper-1-2024-questions-answers/',
  'https://www.drishtiias.com/upsc-prelims-gs-paper-1-2024/',
  'https://www.drishtiias.com/upsc-prelims-2024/',
  'https://www.drishtiias.com/upsc-gs-1-2024-question-paper/',
]
for (const url of drishtiYears) {
  await probe(url, `Drishti-${url.split('/').filter(Boolean).pop()}`)
}

// ── ClearIAS (returned 200 on main page) ─────────────────────────────────────
await probe('https://www.clearias.com/upsc-question-papers/', 'ClearIAS-index')
await probe('https://www.clearias.com/upsc-civil-services-preliminary-exam-2024-paper-1/', 'ClearIAS-2024')
await probe('https://www.clearias.com/upsc-civil-services-preliminary-exam-2023-paper-1/', 'ClearIAS-2023')

// ── PWOnlyIAS (returned 200) ──────────────────────────────────────────────────
await probe('https://pwonlyias.com/upsc-previous-year-question-papers/', 'PWOnlyIAS')
await probe('https://pwonlyias.com/upsc-prelims-2024-question-paper/', 'PWOnlyIAS-2024')

await browser.close()
console.log('\n✅ Discovery complete')
