// probe-sources2.mjs — UPSC PYQ HTML source probe
// Tests multiple sites for accessible structured question data

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const URLS = [
  // 1. Drishti IAS
  { site: 'Drishti IAS', url: 'https://www.drishtiias.com/upsc-prelims-previous-year-paper/' },
  { site: 'Drishti IAS', url: 'https://www.drishtiias.com/quiz/upsc-civil-services-prelims/' },
  { site: 'Drishti IAS', url: 'https://www.drishtiias.com/upsc-question-papers/' },

  // 2. Vision IAS
  { site: 'Vision IAS', url: 'https://www.visionias.in/resources/upsc-civil-services-previous-year-papers' },
  { site: 'Vision IAS', url: 'https://www.visionias.in/upsc-previous-year-papers/' },

  // 3. Byju's
  { site: "Byju's", url: 'https://byjus.com/free-ias-prep/upsc-previous-year-question-papers/' },
  { site: "Byju's", url: 'https://byjus.com/question-papers/upsc-previous-year-papers/' },

  // 4. ClearIAS
  { site: 'ClearIAS', url: 'https://www.clearias.com/upsc-question-papers/' },
  { site: 'ClearIAS', url: 'https://www.clearias.com/upsc-previous-year-papers/' },

  // 5. ForumIAS
  { site: 'ForumIAS', url: 'https://forumias.com/blog/upsc-prelims-previous-year-question-papers/' },

  // 6. Unacademy
  { site: 'Unacademy', url: 'https://unacademy.com/content/upsc/study-material/general-awareness/upsc-previous-year-question-papers/' },

  // 7. NEXT IAS
  { site: 'NEXT IAS', url: 'https://www.nextias.com/upsc-previous-year-question-papers/' },

  // 8. PWOnlyIAS
  { site: 'PWOnlyIAS', url: 'https://pwonlyias.com/upsc-previous-year-question-papers/' },

  // 9. Testbook
  { site: 'Testbook', url: 'https://testbook.com/upsc-previous-year-papers/upsc-2024-gs-1-question-paper' },
  { site: 'Testbook', url: 'https://testbook.com/upsc-previous-year-papers/upsc-2023-gs-1-question-paper' },

  // 10. IndiaBix
  { site: 'IndiaBix', url: 'https://www.indiabix.com/upsc-civil-services-exam/questions-and-answers/' },
  { site: 'IndiaBix', url: 'https://www.indiabix.com/upsc-civil-services-exam/2024/' },
  { site: 'IndiaBix', url: 'https://www.indiabix.com/upsc-civil-services-exam/2023/' },
  { site: 'IndiaBix', url: 'https://www.indiabix.com/upsc-civil-services-exam/2022/' },

  // 11. GKToday
  { site: 'GKToday', url: 'https://www.gktoday.in/gk/upsc-civil-services-prelims-question-papers/' },
  { site: 'GKToday', url: 'https://www.gktoday.in/quiz/upsc-civil-services-prelims-gs-2024/' },
  { site: 'GKToday', url: 'https://www.gktoday.in/quiz/upsc-prelims-2023-general-studies-paper/' },

  // 12. AffairsCloud
  { site: 'AffairsCloud', url: 'https://affairscloud.com/upsc-previous-year-papers/' },
  { site: 'AffairsCloud', url: 'https://affairscloud.com/upsc-prelims-2024-question-paper/' },

  // 13. Jagran Josh
  { site: 'Jagran Josh', url: 'https://www.jagranjosh.com/articles/upsc-prelims-2024-question-paper-gs-1-with-answer-key' },
  { site: 'Jagran Josh', url: 'https://www.jagranjosh.com/articles/upsc-ias-prelims-2024-gspaper1-question-paper-answer-key-1716802200-1' },

  // 14. StudyIQ
  { site: 'StudyIQ', url: 'https://www.studyiq.com/articles/upsc-previous-year-question-papers/' },

  // 15. Plutus IAS
  { site: 'Plutus IAS', url: 'https://plutusias.com/upsc-previous-year-question-papers/' },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Extract a small HTML snippet that looks like a question
function extractQuestionSample(html) {
  // Look for patterns: "(A)", "(B)", option A), option B)
  const patterns = [
    /\(A\).{0,200}\(B\)/s,
    /\(a\).{0,200}\(b\)/s,
    /option.{0,10}A.{0,200}option.{0,10}B/is,
    /Answer:.{0,100}/i,
    /Correct Answer.{0,100}/i,
  ];

  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) {
      // Return surrounding 400 chars
      const idx = html.indexOf(m[0]);
      const start = Math.max(0, idx - 100);
      const end = Math.min(html.length, idx + 500);
      return html.slice(start, end).replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}

// Check if HTML has structured options
function hasOptions(html) {
  const optionPatterns = [
    /\(A\)/,
    /\(B\)/,
    /option[_\-\s]?[aAbB]/i,
    />A\.</,
    /data-option/i,
    /class="[^"]*option[^"]*"/i,
    /class="[^"]*choice[^"]*"/i,
    /class="[^"]*answer[^"]*"/i,
  ];
  return optionPatterns.some((p) => p.test(html));
}

function hasQuestionText(html) {
  return /\(A\)/.test(html) || /\(B\)/.test(html);
}

// Extract HTML classes that look related to questions
function extractQuestionClasses(html) {
  const classMatches = html.matchAll(/class="([^"]*(?:question|option|answer|choice|quiz|mcq)[^"]*)"/gi);
  const found = new Set();
  for (const m of classMatches) {
    m[1].split(/\s+/).forEach((cls) => {
      if (/question|option|answer|choice|quiz|mcq/i.test(cls)) found.add(cls);
    });
  }
  return [...found].slice(0, 15);
}

async function probeUrl(entry) {
  const { site, url } = entry;
  const result = {
    site,
    url,
    status: null,
    sizeKB: null,
    hasABOptions: false,
    hasAnswerKey: false,
    questionClasses: [],
    sample: null,
    error: null,
    finalUrl: null,
    contentType: null,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    clearTimeout(timer);

    result.status = res.status;
    result.finalUrl = res.url;
    result.contentType = res.headers.get('content-type') || '';

    const text = await res.text();
    result.sizeKB = (text.length / 1024).toFixed(1);

    if (result.contentType.includes('html')) {
      result.hasABOptions = hasQuestionText(text);
      result.hasAnswerKey = /correct answer|answer key|ans[:\s]/i.test(text);
      result.questionClasses = extractQuestionClasses(text);
      result.sample = extractQuestionSample(text);
    }
  } catch (err) {
    result.error = err.message.slice(0, 120);
  }

  return result;
}

async function main() {
  console.log('='.repeat(80));
  console.log('UPSC PYQ SOURCE PROBE — probe-sources2.mjs');
  console.log(`Testing ${URLS.length} URLs with 400ms delay between requests`);
  console.log('='.repeat(80));
  console.log();

  const results = [];

  for (let i = 0; i < URLS.length; i++) {
    const entry = URLS[i];
    process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${URLS.length}] ${entry.site.padEnd(14)} ${entry.url} ... `);

    const r = await probeUrl(entry);
    results.push(r);

    if (r.error) {
      console.log(`ERROR: ${r.error}`);
    } else {
      const flags = [
        r.hasABOptions ? '(A)(B) YES' : '(A)(B) NO ',
        r.hasAnswerKey ? 'ANS-KEY:YES' : 'ANS-KEY:NO ',
        `${r.sizeKB}KB`,
      ].join(' | ');
      console.log(`HTTP ${r.status} | ${flags}`);
    }

    if (i < URLS.length - 1) await delay(400);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('DETAILED RESULTS FOR PAGES WITH (A)(B) OPTIONS FOUND');
  console.log('='.repeat(80));

  const winners = results.filter((r) => r.hasABOptions && r.status === 200);
  if (winners.length === 0) {
    console.log('No pages with (A)(B) option text found in raw HTML.');
  }

  for (const r of winners) {
    console.log();
    console.log(`--- ${r.site}: ${r.url}`);
    console.log(`    Status: ${r.status} | Size: ${r.sizeKB}KB | ContentType: ${r.contentType}`);
    if (r.finalUrl && r.finalUrl !== r.url) console.log(`    Redirected to: ${r.finalUrl}`);
    if (r.questionClasses.length) {
      console.log(`    Question-related CSS classes: ${r.questionClasses.join(', ')}`);
    }
    if (r.sample) {
      console.log('    SAMPLE HTML (question snippet):');
      console.log('    ' + r.sample.slice(0, 800).replace(/\n/g, '\n    '));
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('ALL RESULTS SUMMARY TABLE');
  console.log('='.repeat(80));
  console.log(
    'Site'.padEnd(14) +
    'Status'.padEnd(8) +
    '(A)(B)'.padEnd(8) +
    'AnsKey'.padEnd(8) +
    'SizeKB'.padEnd(10) +
    'URL'
  );
  console.log('-'.repeat(80));

  for (const r of results) {
    const status = r.error ? 'ERR' : String(r.status);
    const ab = r.hasABOptions ? 'YES' : 'no';
    const ak = r.hasAnswerKey ? 'YES' : 'no';
    const kb = r.sizeKB || '-';
    console.log(
      r.site.padEnd(14) +
      status.padEnd(8) +
      ab.padEnd(8) +
      ak.padEnd(8) +
      String(kb).padEnd(10) +
      r.url
    );
  }

  console.log();
  console.log('='.repeat(80));
  console.log('SITES RETURNING HTTP 200');
  console.log('='.repeat(80));
  const ok200 = results.filter((r) => r.status === 200);
  for (const r of ok200) {
    console.log(`  ${r.site.padEnd(14)} ${r.url}`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('SITES WITH STRUCTURED QUESTION HTML (A/B/C/D options in source)');
  console.log('='.repeat(80));
  if (winners.length === 0) {
    console.log('  NONE — no site returned (A)(B) option text in raw HTML');
  } else {
    for (const r of winners) {
      console.log(`  ${r.site.padEnd(14)} ${r.url}`);
    }
  }

  // Also show pages with answer key even if no (A)(B)
  const ansKeyOnly = results.filter((r) => r.hasAnswerKey && !r.hasABOptions && r.status === 200);
  if (ansKeyOnly.length > 0) {
    console.log();
    console.log('Pages with answer-key text but no (A)(B) raw options (may be JS-rendered):');
    for (const r of ansKeyOnly) {
      console.log(`  ${r.site.padEnd(14)} ${r.url}`);
    }
  }

  console.log();
  console.log('PROBE COMPLETE.');
}

main().catch(console.error);
