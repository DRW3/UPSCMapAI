# UPSC PYQ Extraction (1995–2025) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a clean, structured corpus of UPSC Civil Services Prelims previous-year questions (~3,896 questions, 1995–2025, 31 years — well above the requested 25-year window) from UnlockIAS, normalize them into the existing `upsc_pyqs` Supabase schema, and replace the existing malformed corpus while preserving the rows we already know are clean.

**Architecture:**
1. **Source:** UnlockIAS (`unlockias.in`) — server-rendered Next.js pages, 100 questions per year page, no login required for browsing, 1995–2025 coverage, 18 subjects, 208 sub-topics, difficulty + topic metadata included. Verified by direct probe of `/upsc-prelims-pyq/2024` and `/upsc-prelims-pyq/indian-polity`.
2. **Tool:** Playwright MCP (`mcp__playwright__*`) — drives a real Chromium so client-side hydration completes and "Show Answer" reveals the correct option. We capture the rendered HTML per page and parse it with cheerio in Node.
3. **Storage:** Stage into a new `upsc_pyqs_unlockias_raw` table to keep the existing 3,108-row `upsc_pyqs` corpus untouched until the final merge gate. Final merge replaces malformed rows and adds missing years; clean rows from `gktoday` / `pwonlyias` / `upsc_official` (existing sources with 0–6% damage) are preserved on conflict.
4. **Resume:** Per-year checkpoint files in `data/pyqs/unlockias/` so a crash or restart resumes at the next un-scraped year without re-fetching.
5. **Validation:** Reuse `scripts/investigate-malformed-pyqs.mjs` against the staging table; require malformed-rate < 1% before merging.

**Tech Stack:** Node.js (`.mjs` scripts to match existing convention), Playwright MCP (browser control via Claude Code MCP), cheerio (HTML parsing), `@supabase/supabase-js` (already a dependency), Vitest for test scripts, dotenv for local secrets.

**Pre-flight constraint:** Playwright MCP was installed in the previous Claude Code session and is **not callable until Claude Code is restarted**. Verify with `claude mcp list` that `playwright` is listed and `Connected` before starting Task 3.

---

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/scrape-unlockias-pyqs.mjs` | Driver: iterates years 1995–2025, calls Playwright MCP via shell or directly via Claude Code session, writes one JSON file per year. Handles resume + politeness throttle. |
| `scripts/parse-unlockias-html.mjs` | Pure function: takes raw HTML for one year page, returns array of `{question_no, question, options, answer, year, topic, subject, difficulty}`. No I/O, fully unit-tested. |
| `scripts/load-unlockias-to-supabase.mjs` | Reads year JSON files, normalizes to `upsc_pyqs` schema, upserts into staging table `upsc_pyqs_unlockias_raw`. |
| `scripts/merge-unlockias-into-canonical.mjs` | Final merge: replaces malformed rows in `upsc_pyqs`, preserves clean rows from trusted sources, dedups by `(year, question_no)` and a fuzzy text match. |
| `scripts/schema-additions.sql` | New `CREATE TABLE upsc_pyqs_unlockias_raw` and dedup index. |
| `tests/parse-unlockias-html.test.mjs` | Vitest unit tests for the parser using fixture HTML files. |
| `tests/fixtures/unlockias/year-2024.html` | Saved HTML snapshot of `/upsc-prelims-pyq/2024` for offline testing. |
| `tests/fixtures/unlockias/year-2024-expected.json` | 3 hand-verified questions from 2024 used as the parser's golden output. |
| `data/pyqs/unlockias/` | One JSON file per year: `1995.json` … `2025.json`. |
| `data/pyqs/unlockias/_progress.json` | Resume cursor: `{lastCompletedYear: 2018, attempts: {...}}`. |
| `docs/superpowers/plans/2026-04-12-upsc-pyq-extraction.md` | This document. |

---

## Source Decision Log

| Source | Coverage | Format | Verdict | Why |
|---|---|---|---|---|
| **UnlockIAS** `/upsc-prelims-pyq/{year}` | 1995–2025, ~100 Q/year | SSR HTML, questions inline, "Show Answer" toggle | **PRIMARY** | Server-rendered, year + subject + topic + difficulty all present, free to browse, no login required. Probe of `/2024` returned actual question text and four options on first 3 questions. |
| **UnlockIAS** `/upsc-prelims-pyq/{subject-slug}` | Same questions, indexed by subject | SSR HTML | **ENRICHMENT** | Use to cross-link year-page rows with the canonical UnlockIAS subject taxonomy (393 polity Q, 902 S&T Q, etc.). Same question_id, different facet. |
| **upsc.gov.in** `/examinations/previous-question-papers` + `/archives` | 2019–2025 directly, older via `/sites/default/files/QP_*.pdf` | PDF | **VALIDATION** | Authoritative answer keys. Use only to spot-check UnlockIAS answers, not as primary source — PDF parsing already burned us (`pdf_extract`: 78% malformed). |
| Drishti IAS `/quiz/quizlist/previous-year-paper` | 2018–2025 only | Login-walled quiz | Reject | Coverage too narrow + login wall. |
| Education Province | 1995–2025 | Scraped HTML | **BLACKLIST** | Already burned us once: 1424/1426 rows malformed (99.9%). Never use again. |
| GKToday | Mixed | Scraped HTML | Keep existing | 6% malformed rate is acceptable; the 600 rows we have stay in the canonical table. |
| pwonlyias / upsc_official | Last ~10 years | PDF | Keep existing | 2% / 0% malformed, rock solid. Preserve in merge. |
| Insights on India `/upsc-mains-...-pyq/` | Mains GS1–4 + Essay | HTML | **OUT OF SCOPE — Phase 2** | Mains is essay format, not MCQ. Different schema (no options/answer). Probe of GS-2 page failed (ECONNREFUSED). Tackle as a separate plan after Prelims is shipped. |
| IASbaba year-wise Mains | 2011–2020 | Blog post per year | **OUT OF SCOPE — Phase 2** | Same reason. |

**Bottom line:** UnlockIAS gives 31 years of clean Prelims questions in one source. Mains is deferred to a separate plan because it's a completely different data shape and the user's existing infrastructure (`upsc_pyqs` table, journey UI) is built around MCQ practice.

---

## Task 0: Pre-flight verification

**Files:** none — verification only.

- [ ] **Step 1: Verify Playwright MCP is connected in this Claude Code session**

Run: `claude mcp list`
Expected output contains: `playwright: npx -y @playwright/mcp@latest - ✓ Connected`

If it shows `✗` or is missing, the MCP did not survive the restart. Re-run `claude mcp add playwright -s user -- npx -y @playwright/mcp@latest` and restart Claude Code again.

- [ ] **Step 2: Smoke-test Playwright MCP**

Use the MCP tool `mcp__playwright__browser_navigate` to load `https://www.unlockias.in/upsc-prelims-pyq/2024`, then `mcp__playwright__browser_snapshot` to confirm a non-empty accessibility tree.

Expected: snapshot contains the strings "UPSC", "2024", and at least one "Show Answer" button.

- [ ] **Step 3: Verify Supabase env is reachable**

Run: `node -e "import('@supabase/supabase-js').then(({createClient}) => { const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); c.from('upsc_pyqs').select('*', {count:'exact', head:true}).then(r => console.log('rows:', r.count, 'err:', r.error?.message))})"`

Expected: `rows: 3108 err: undefined` (or whatever the current count is — non-null `count`, no error).

- [ ] **Step 4: Confirm baseline malformed count**

Run: `node scripts/investigate-malformed-pyqs.mjs --count-only`

If `--count-only` flag doesn't exist, just run `node scripts/investigate-malformed-pyqs.mjs` and read the printed total.

Expected: write the current malformed count into a comment in the next commit message so we can compare post-merge.

---

## Task 1: Saved HTML fixture + golden JSON

**Files:**
- Create: `tests/fixtures/unlockias/year-2024.html`
- Create: `tests/fixtures/unlockias/year-2024-expected.json`

The fixture lets us write the parser TDD-style without hitting the network on every test run.

- [ ] **Step 1: Fetch the 2024 page raw HTML via Playwright MCP and save it**

In this Claude Code session, use `mcp__playwright__browser_navigate` to load `https://www.unlockias.in/upsc-prelims-pyq/2024`, then `mcp__playwright__browser_evaluate` with the script `() => document.documentElement.outerHTML` and write the returned string to `tests/fixtures/unlockias/year-2024.html`. Before evaluating, click every "Show Answer" button so the answers are revealed in the DOM:

```js
// Run via mcp__playwright__browser_evaluate
() => {
  document.querySelectorAll('button, [role="button"]').forEach(b => {
    if (/show\s*answer/i.test(b.textContent || '')) b.click();
  });
  return new Promise(r => setTimeout(() => r(document.documentElement.outerHTML), 500));
}
```

Expected: file exists, > 200 KB, contains both `Show Answer` AND `Hide Answer` strings (proves the toggle fired).

- [ ] **Step 2: Hand-verify 3 questions and write the golden JSON**

Open `tests/fixtures/unlockias/year-2024.html` in a browser (or use `cat | grep`) to find Q1, Q50, and Q100. Cross-check the question text and the official answer against the **UPSC official 2024 Prelims answer key PDF** at `https://upsc.gov.in/sites/default/files/QP-CSP-24-GENERAL-STUDIES-PAPER-I-160624.pdf` (or whatever the canonical filename is — find it by listing the directory page).

Write the verified output to `tests/fixtures/unlockias/year-2024-expected.json`:

```json
{
  "year": 2024,
  "totalQuestions": 100,
  "samples": [
    {
      "question_no": 1,
      "question": "Consider the following statements: Statement-I: The atmosphere is heated more by ...",
      "options": {
        "a": "Both Statement-I and Statement-II are correct and Statement-II explains Statement-I",
        "b": "Both Statement-I and Statement-II are correct but Statement-II does not explain Statement-I",
        "c": "Statement-I is correct but Statement-II is incorrect",
        "d": "Statement-I is incorrect but Statement-II is correct"
      },
      "answer": "c",
      "subject": "geography",
      "topic": "atmosphere",
      "difficulty": "moderate"
    },
    { "question_no": 50, "...": "..." },
    { "question_no": 100, "...": "..." }
  ]
}
```

The exact field names (`subject`, `topic`, `difficulty`) must match what the parser will produce — pick the values verbatim from the HTML, don't translate.

- [ ] **Step 3: Commit the fixtures**

```bash
git add tests/fixtures/unlockias/year-2024.html tests/fixtures/unlockias/year-2024-expected.json
git commit -m "test(pyqs): add UnlockIAS 2024 HTML fixture + golden JSON"
```

---

## Task 2: HTML parser (TDD)

**Files:**
- Create: `scripts/parse-unlockias-html.mjs`
- Create: `tests/parse-unlockias-html.test.mjs`

Pure parser. No network, no DB, no fs. Input: HTML string + year. Output: array of question objects.

- [ ] **Step 1: Write the failing test**

```js
// tests/parse-unlockias-html.test.mjs
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseUnlockiasYearPage } from '../scripts/parse-unlockias-html.mjs';

const html = readFileSync('tests/fixtures/unlockias/year-2024.html', 'utf8');
const expected = JSON.parse(readFileSync('tests/fixtures/unlockias/year-2024-expected.json', 'utf8'));

describe('parseUnlockiasYearPage', () => {
  const questions = parseUnlockiasYearPage(html, 2024);

  it('returns the right total count', () => {
    expect(questions).toHaveLength(expected.totalQuestions);
  });

  it('every question has the required fields', () => {
    for (const q of questions) {
      expect(q.question_no).toBeTypeOf('number');
      expect(q.question.length).toBeGreaterThan(10);
      expect(q.options).toEqual(expect.objectContaining({ a: expect.any(String), b: expect.any(String), c: expect.any(String), d: expect.any(String) }));
      expect(['a','b','c','d']).toContain(q.answer);
      expect(q.year).toBe(2024);
    }
  });

  for (const sample of expected.samples) {
    it(`matches golden question ${sample.question_no}`, () => {
      const got = questions.find(q => q.question_no === sample.question_no);
      expect(got).toBeDefined();
      expect(got.question).toBe(sample.question);
      expect(got.options).toEqual(sample.options);
      expect(got.answer).toBe(sample.answer);
      expect(got.subject).toBe(sample.subject);
      expect(got.topic).toBe(sample.topic);
    });
  }

  it('rejects scraper-trailer junk in any option', () => {
    const junkPatterns = [/already logged in/i, /click here to refresh/i, /\bshow\s*answer\b/i];
    for (const q of questions) {
      for (const opt of Object.values(q.options)) {
        for (const p of junkPatterns) expect(opt).not.toMatch(p);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/parse-unlockias-html.test.mjs`
Expected: FAIL with `Cannot find module '../scripts/parse-unlockias-html.mjs'`

- [ ] **Step 3: Write the minimal parser**

```js
// scripts/parse-unlockias-html.mjs
import * as cheerio from 'cheerio';

const SUBJECT_NORMALIZE = {
  'indian polity': 'polity',
  'governance': 'polity',
  'indian economy': 'economy',
  'environment & ecology': 'environment',
  'environment and ecology': 'environment',
  'geography': 'geography',
  'physical geography': 'geography',
  'ancient history': 'history',
  'medieval history': 'history',
  'modern history': 'history',
  'art & culture': 'history',
  'science & technology': 'science',
  'general science': 'science',
  'current affairs': 'current_affairs',
  'sports': 'current_affairs',
};

function normalizeSubject(raw) {
  const k = (raw || '').trim().toLowerCase();
  return SUBJECT_NORMALIZE[k] || k.replace(/[^a-z0-9]+/g, '_') || 'general';
}

export function parseUnlockiasYearPage(html, year) {
  const $ = cheerio.load(html);
  const questions = [];

  // UnlockIAS renders each question inside a card. The exact selector is verified
  // against tests/fixtures/unlockias/year-2024.html — adjust if the markup shifts.
  // Strategy: find every element whose text starts with "Q1", "Q2", … and walk siblings.
  $('[data-question-no], .question-card, article.question').each((_, el) => {
    const $q = $(el);
    const noText = $q.attr('data-question-no') || $q.find('.question-no, .q-number').first().text();
    const question_no = parseInt(noText.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(question_no)) return;

    const question = $q.find('.question-text, .q-text').first().text().trim();
    const options = {};
    $q.find('.option, li.opt, [data-option]').each((__, optEl) => {
      const $o = $(optEl);
      const letter = ($o.attr('data-option') || $o.find('.opt-letter').first().text() || '').trim().toLowerCase().replace(/[^a-d]/g, '');
      const text = $o.find('.opt-text').first().text().trim() || $o.text().trim().replace(/^\(?[a-d]\)?[\s.):-]*/i, '');
      if (letter && text) options[letter] = text;
    });

    const answerLetter = ($q.find('.answer-letter, [data-answer]').first().attr('data-answer') ||
                         $q.find('.answer-letter, [data-answer]').first().text() || '')
                         .trim().toLowerCase().replace(/[^a-d]/g, '');

    const subjectRaw = $q.attr('data-subject') || $q.find('.subject-tag, .tag-subject').first().text();
    const topicRaw = $q.attr('data-topic') || $q.find('.topic-tag, .tag-topic').first().text();
    const difficultyRaw = $q.attr('data-difficulty') || $q.find('.difficulty, .tag-difficulty').first().text();

    questions.push({
      question_no,
      question,
      options,
      answer: answerLetter,
      year,
      subject: normalizeSubject(subjectRaw),
      topic: (topicRaw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'general',
      difficulty: (difficultyRaw || '').trim().toLowerCase() || null,
    });
  });

  return questions;
}
```

- [ ] **Step 4: Run the test — it will likely still fail**

Run: `npx vitest run tests/parse-unlockias-html.test.mjs`

The selectors above are educated guesses based on the WebFetch summary, which abstracted away the actual class names. Expected first run: FAILS because real classnames are different.

**This is the core bench-test moment.** Open `tests/fixtures/unlockias/year-2024.html` and grep for the question text from your golden samples. Walk up the DOM and write down the actual class names / data attributes. Update the selectors in `parse-unlockias-html.mjs`. Re-run. Iterate until green.

Hard rule: **do not modify the test file or the golden JSON to make tests pass** — fix the parser. If a real question genuinely doesn't fit the schema, that's data we need to surface, not paper over.

- [ ] **Step 5: Iterate until all tests pass**

Run: `npx vitest run tests/parse-unlockias-html.test.mjs`
Expected: PASS — all assertions including the 3 golden samples and the junk-rejection check.

- [ ] **Step 6: Commit**

```bash
git add scripts/parse-unlockias-html.mjs tests/parse-unlockias-html.test.mjs
git commit -m "feat(pyqs): add UnlockIAS HTML parser with TDD coverage"
```

---

## Task 3: Year-by-year scraper (Playwright MCP)

**Files:**
- Create: `scripts/scrape-unlockias-pyqs.mjs`
- Create: `data/pyqs/unlockias/_progress.json` (initial state)

The scraper does NOT call Playwright MCP from a Node process — that doesn't work, MCP tools are only callable from the Claude Code session. Instead, the script writes the **list of years still to fetch** to stdout, then this Claude Code session uses Playwright MCP to fetch each, saves the HTML to `data/pyqs/unlockias/raw/{year}.html`, and re-runs the script to parse the saved HTML and update `_progress.json`.

This split keeps the determinism of a script while letting us use the MCP browser.

- [ ] **Step 1: Initialize the progress file**

```bash
mkdir -p data/pyqs/unlockias/raw
echo '{"completedYears":[],"failedYears":{}}' > data/pyqs/unlockias/_progress.json
git add data/pyqs/unlockias/_progress.json
git commit -m "chore(pyqs): scaffold UnlockIAS scraper progress file"
```

- [ ] **Step 2: Write the scraper driver script**

```js
// scripts/scrape-unlockias-pyqs.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseUnlockiasYearPage } from './parse-unlockias-html.mjs';

const PROGRESS_PATH = 'data/pyqs/unlockias/_progress.json';
const RAW_DIR = 'data/pyqs/unlockias/raw';
const OUT_DIR = 'data/pyqs/unlockias';
const YEARS = Array.from({ length: 2025 - 1995 + 1 }, (_, i) => 1995 + i); // 1995..2025

function loadProgress() {
  return JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
}

function saveProgress(p) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

function nextYearToFetch(progress) {
  for (const y of YEARS) {
    if (progress.completedYears.includes(y)) continue;
    if (!existsSync(`${RAW_DIR}/${y}.html`)) return { action: 'fetch', year: y };
    return { action: 'parse', year: y };
  }
  return { action: 'done' };
}

function parseAndSave(year) {
  const html = readFileSync(`${RAW_DIR}/${year}.html`, 'utf8');
  const questions = parseUnlockiasYearPage(html, year);
  if (questions.length < 80) {
    throw new Error(`Year ${year}: only ${questions.length} questions parsed — likely a selector or fetch failure`);
  }
  writeFileSync(`${OUT_DIR}/${year}.json`, JSON.stringify({ year, count: questions.length, questions }, null, 2));
  return questions.length;
}

const cmd = process.argv[2];
const progress = loadProgress();

if (cmd === 'next') {
  console.log(JSON.stringify(nextYearToFetch(progress)));
} else if (cmd === 'parse') {
  const year = parseInt(process.argv[3], 10);
  const count = parseAndSave(year);
  progress.completedYears = [...new Set([...progress.completedYears, year])].sort();
  delete progress.failedYears[year];
  saveProgress(progress);
  console.log(`Parsed ${year}: ${count} questions`);
} else if (cmd === 'fail') {
  const year = parseInt(process.argv[3], 10);
  progress.failedYears[year] = (progress.failedYears[year] || 0) + 1;
  saveProgress(progress);
  console.log(`Marked ${year} as failed (attempts: ${progress.failedYears[year]})`);
} else {
  console.error('Usage: node scripts/scrape-unlockias-pyqs.mjs <next|parse YEAR|fail YEAR>');
  process.exit(1);
}
```

- [ ] **Step 3: Dry-run the driver**

Run: `node scripts/scrape-unlockias-pyqs.mjs next`
Expected: `{"action":"fetch","year":1995}`

- [ ] **Step 4: Fetch the first year via Playwright MCP and parse it**

In this Claude Code session:

1. Call `mcp__playwright__browser_navigate` with `url: "https://www.unlockias.in/upsc-prelims-pyq/1995"`.
2. Call `mcp__playwright__browser_evaluate` with the answer-revealing script from Task 1 Step 1.
3. Take the returned HTML and write it to `data/pyqs/unlockias/raw/1995.html` (use the Write tool).
4. Run: `node scripts/scrape-unlockias-pyqs.mjs parse 1995`

Expected: stdout shows `Parsed 1995: NN questions` (NN ≥ 80). File `data/pyqs/unlockias/1995.json` exists.

If the parser throws, inspect `raw/1995.html` — older years may have different markup than 2024. Add cases to the parser, re-run, repeat until parse succeeds.

- [ ] **Step 5: Loop the fetch+parse cycle for all 31 years**

This is the brute-force loop. In this session, repeat for years 1996..2025:

```
for year in 1996..2025:
  mcp__playwright__browser_navigate → /upsc-prelims-pyq/{year}
  mcp__playwright__browser_evaluate → click Show Answer + return HTML
  Write → data/pyqs/unlockias/raw/{year}.html
  Bash → node scripts/scrape-unlockias-pyqs.mjs parse {year}
  Wait 3-5 seconds (politeness — UnlockIAS is a small site)
```

Politeness is non-negotiable: never pull more than one page per 3 seconds. If you see a 429 or a captcha, stop and switch to manual cool-down.

If a year fails to parse, run `node scripts/scrape-unlockias-pyqs.mjs fail {year}` and continue. Come back to failures at the end.

- [ ] **Step 6: Verify completion**

Run: `node scripts/scrape-unlockias-pyqs.mjs next`
Expected: `{"action":"done"}`

Run: `ls data/pyqs/unlockias/*.json | wc -l`
Expected: `31`

Run: `node -e "let t=0; for (const y of Array.from({length:31},(_,i)=>1995+i)) t += JSON.parse(require('fs').readFileSync(\`data/pyqs/unlockias/\${y}.json\`)).count; console.log('total:', t)"`
Expected: total ~3,896 (within ±50 of UnlockIAS's claimed count).

- [ ] **Step 7: Commit the harvested data**

```bash
git add data/pyqs/unlockias/
git commit -m "data(pyqs): harvest UnlockIAS Prelims 1995-2025 (31 years, ~3896 questions)"
```

Note: the `raw/*.html` files are bulky (~5 MB total). If repo size is a concern, add `data/pyqs/unlockias/raw/` to `.gitignore` and only commit the parsed JSON.

---

## Task 4: Subject-page enrichment

**Files:**
- Modify: `scripts/scrape-unlockias-pyqs.mjs` — add `enrich` subcommand
- Modify: `scripts/parse-unlockias-html.mjs` — add `parseUnlockiasSubjectPage`

Year pages give us year, question text, options, answer, and a topic guess. Subject pages give the canonical UnlockIAS subject taxonomy and a richer topic (sub-topic level). Cross-link by question text hash.

- [ ] **Step 1: Write the failing test for subject parser**

Capture a fixture for `https://www.unlockias.in/upsc-prelims-pyq/indian-polity` (same way as Task 1) and save to `tests/fixtures/unlockias/subject-indian-polity.html`. Hand-pick 3 golden questions with their subject + topic.

```js
// Append to tests/parse-unlockias-html.test.mjs
import { parseUnlockiasSubjectPage } from '../scripts/parse-unlockias-html.mjs';

describe('parseUnlockiasSubjectPage', () => {
  const html = readFileSync('tests/fixtures/unlockias/subject-indian-polity.html', 'utf8');
  const rows = parseUnlockiasSubjectPage(html, 'indian-polity');

  it('emits at least 350 rows', () => expect(rows.length).toBeGreaterThan(350));
  it('every row has a year', () => {
    for (const r of rows) expect(r.year).toBeGreaterThanOrEqual(1995);
  });
  it('every row has subject = polity', () => {
    for (const r of rows) expect(r.subject).toBe('polity');
  });
});
```

- [ ] **Step 2: Run test — fails**

Run: `npx vitest run tests/parse-unlockias-html.test.mjs`
Expected: FAIL with `parseUnlockiasSubjectPage is not exported`.

- [ ] **Step 3: Implement `parseUnlockiasSubjectPage` in the parser**

```js
// Add to scripts/parse-unlockias-html.mjs
export function parseUnlockiasSubjectPage(html, subjectSlug) {
  const $ = cheerio.load(html);
  const rows = [];
  $('[data-question-no], .question-card').each((_, el) => {
    const $q = $(el);
    const yearRaw = $q.attr('data-year') || $q.find('.year-tag, .question-year').first().text();
    const year = parseInt((yearRaw || '').match(/(19|20)\d{2}/)?.[0] || '0', 10);
    const question = $q.find('.question-text, .q-text').first().text().trim();
    const topicRaw = $q.attr('data-topic') || $q.find('.topic-tag').first().text();
    const questionHash = simpleHash(question);
    rows.push({
      questionHash,
      year,
      subject: normalizeSubject(subjectSlug.replace(/-/g, ' ')),
      topic: (topicRaw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'general',
    });
  });
  return rows;
}

function simpleHash(s) {
  // FNV-1a, sufficient for dedup
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// Also export simpleHash for the loader
export { simpleHash };
```

- [ ] **Step 4: Run test — passes**

Run: `npx vitest run tests/parse-unlockias-html.test.mjs`
Expected: all tests PASS.

- [ ] **Step 5: Fetch all 18 subject pages via Playwright MCP**

The 18 subject slugs are listed on `/upsc-prelims-pyq` — confirmed: Indian Polity, Indian Economy, Geography, Physical Geography, Environment & Ecology, Ancient History, Medieval History, Modern History, Art & Culture, Science & Technology, General Science, Current Affairs, Sports, plus 5 more that the page enumerates. Get the full list from the landing page first:

1. Use `mcp__playwright__browser_navigate` → `https://www.unlockias.in/upsc-prelims-pyq`
2. Use `mcp__playwright__browser_evaluate` to extract all subject hrefs:
   ```js
   () => Array.from(document.querySelectorAll('a[href*="/upsc-prelims-pyq/"]'))
     .map(a => a.getAttribute('href'))
     .filter(h => h && !h.match(/\/(\d{4}|download|trends|topic-wise|attempt)$/))
     .map(h => h.split('/').pop())
   ```
3. For each slug, fetch + save HTML to `tests/fixtures/unlockias/subject-{slug}.html` (only the first one becomes a test fixture; the rest go straight to `data/pyqs/unlockias/raw/subject-{slug}.html`).
4. Parse all into a single enrichment map: `{ questionHash → {subject, topic} }`. Save to `data/pyqs/unlockias/_enrichment.json`.

- [ ] **Step 6: Commit**

```bash
git add scripts/parse-unlockias-html.mjs tests/parse-unlockias-html.test.mjs tests/fixtures/unlockias/subject-indian-polity.html data/pyqs/unlockias/_enrichment.json
git commit -m "feat(pyqs): enrich UnlockIAS questions with subject taxonomy"
```

---

## Task 5: Staging table + loader

**Files:**
- Create: `scripts/schema-additions.sql`
- Create: `scripts/load-unlockias-to-supabase.mjs`

- [ ] **Step 1: Write the staging table schema**

```sql
-- scripts/schema-additions.sql
-- Staging table for UnlockIAS scrape — keeps the canonical upsc_pyqs untouched
-- until a clean dataset is verified.

CREATE TABLE IF NOT EXISTS upsc_pyqs_unlockias_raw (
  id              BIGSERIAL PRIMARY KEY,
  year            INT  NOT NULL CHECK (year BETWEEN 1995 AND 2030),
  question_no     INT  NOT NULL,
  question        TEXT NOT NULL,
  options         JSONB NOT NULL,                 -- {a,b,c,d}
  answer          TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  subject         TEXT NOT NULL,
  topic           TEXT NOT NULL,
  difficulty      TEXT,
  question_hash   TEXT NOT NULL,                  -- FNV1a of normalized question text
  source_url      TEXT NOT NULL,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, question_no)
);

CREATE INDEX IF NOT EXISTS idx_unlockias_year     ON upsc_pyqs_unlockias_raw (year);
CREATE INDEX IF NOT EXISTS idx_unlockias_subject  ON upsc_pyqs_unlockias_raw (subject);
CREATE INDEX IF NOT EXISTS idx_unlockias_hash     ON upsc_pyqs_unlockias_raw (question_hash);
```

- [ ] **Step 2: Apply the schema to Supabase**

Either via the Supabase dashboard SQL editor or:

```bash
PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h db.kvfclhqgqnlcdluyczrs.supabase.co -U postgres -d postgres -f scripts/schema-additions.sql
```

Expected: `CREATE TABLE` x1, `CREATE INDEX` x3.

Verify: `node -e "import('@supabase/supabase-js').then(({createClient}) => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).from('upsc_pyqs_unlockias_raw').select('*',{count:'exact',head:true}).then(r=>console.log(r.count, r.error?.message)))"`
Expected: `0 undefined`.

- [ ] **Step 3: Write the loader script**

```js
// scripts/load-unlockias-to-supabase.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { simpleHash } from './parse-unlockias-html.mjs';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const enrichment = JSON.parse(readFileSync('data/pyqs/unlockias/_enrichment.json', 'utf8'));

function normalizeQuestion(q) {
  return q.replace(/\s+/g, ' ').trim().toLowerCase();
}

const yearFiles = readdirSync('data/pyqs/unlockias').filter(f => /^\d{4}\.json$/.test(f));
let total = 0;

for (const file of yearFiles) {
  const { year, questions } = JSON.parse(readFileSync(`data/pyqs/unlockias/${file}`, 'utf8'));
  const rows = questions.map(q => {
    const hash = simpleHash(normalizeQuestion(q.question));
    const enrich = enrichment[hash] || {};
    return {
      year: q.year,
      question_no: q.question_no,
      question: q.question,
      options: { a: q.options.a, b: q.options.b, c: q.options.c, d: q.options.d },
      answer: q.answer,
      subject: enrich.subject || q.subject || 'general',
      topic: enrich.topic || q.topic || 'general',
      difficulty: q.difficulty || null,
      question_hash: hash,
      source_url: `https://www.unlockias.in/upsc-prelims-pyq/${year}`,
    };
  });

  // Upsert in 100-row batches
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('upsc_pyqs_unlockias_raw')
      .upsert(batch, { onConflict: 'year,question_no' });
    if (error) throw new Error(`Year ${year} batch ${i}: ${error.message}`);
  }
  total += rows.length;
  console.log(`Loaded ${year}: ${rows.length} (total ${total})`);
}

console.log(`Done. Loaded ${total} rows.`);
```

- [ ] **Step 4: Run the loader**

Run: `node scripts/load-unlockias-to-supabase.mjs`
Expected: prints `Loaded YYYY: NN` for each of 31 years and `Done. Loaded ~3896 rows.` No errors.

Verify: in Supabase, `SELECT count(*) FROM upsc_pyqs_unlockias_raw;` → ~3896.

- [ ] **Step 5: Commit**

```bash
git add scripts/schema-additions.sql scripts/load-unlockias-to-supabase.mjs
git commit -m "feat(pyqs): stage UnlockIAS corpus into Supabase"
```

---

## Task 6: Validation gate

**Files:** none new — reuse `scripts/investigate-malformed-pyqs.mjs` with a `--table` flag.

- [ ] **Step 1: Add `--table` flag to the investigator**

Open `scripts/investigate-malformed-pyqs.mjs`, find the line that selects from `upsc_pyqs`, and change it to read from a table specified by `--table` (default: `upsc_pyqs`).

```js
// near the top
const tableArg = process.argv.find(a => a.startsWith('--table='));
const TABLE = tableArg ? tableArg.split('=')[1] : 'upsc_pyqs';

// in the query
const { data, error } = await supabase.from(TABLE).select('*');
```

- [ ] **Step 2: Run investigation against the staging table**

Run: `node scripts/investigate-malformed-pyqs.mjs --table=upsc_pyqs_unlockias_raw`

Expected: malformed rate < 1% (< ~40 rows out of 3896). Acceptable failures: questions with embedded tables (UnlockIAS may render them as text), questions referencing images we can't OCR.

- [ ] **Step 3: Decision gate**

If malformed rate ≥ 1%, **STOP**. Investigate the parser. Common causes: a year page used a different markup, "Show Answer" wasn't clicked, options got merged into question text. Fix the parser, re-run Tasks 3 → 5 → 6.

If malformed rate < 1%, proceed to merge.

- [ ] **Step 4: Spot-check 5 random questions against UPSC official answer keys**

Pick 5 random rows from `upsc_pyqs_unlockias_raw` covering different years (e.g., 1998, 2005, 2012, 2018, 2024). For each, find the official UPSC answer key PDF on `upsc.gov.in/sites/default/files/...` and verify the answer letter matches.

If any mismatch, document it in `data/pyqs/unlockias/_validation-mismatches.json` and decide whether to trust UnlockIAS or UPSC for that field. (Generally trust UPSC official.)

- [ ] **Step 5: Commit**

```bash
git add scripts/investigate-malformed-pyqs.mjs data/pyqs/unlockias/_validation-mismatches.json
git commit -m "feat(pyqs): validate UnlockIAS staging table against malformed-rate gate"
```

---

## Task 7: Merge into canonical `upsc_pyqs`

**Files:**
- Create: `scripts/merge-unlockias-into-canonical.mjs`

Strategy:
1. **Preserve clean rows** from trusted sources (`gktoday`, `pwonlyias`, `upsc_official`) — never delete or overwrite them.
2. **Replace** any row in `upsc_pyqs` that came from `education_province`, `pdf_extract`, `insightsonindia`, `iasexamportal`, or `indiabix` AND matches an UnlockIAS row by `(year, question_no)` or by fuzzy text match (Levenshtein distance / 256 < 0.1).
3. **Insert** any UnlockIAS row that has no match in `upsc_pyqs`.
4. **Tag** every inserted/updated row with `source = 'unlockias'` (extend the table if needed — check existing schema for a `source` column).

- [ ] **Step 1: Inspect existing source tagging**

Run: `node -e "import('@supabase/supabase-js').then(({createClient}) => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).from('upsc_pyqs').select('*').limit(1).then(r => console.log(Object.keys(r.data[0]))))"`

If there's no `source` column, add one:

```sql
ALTER TABLE upsc_pyqs ADD COLUMN IF NOT EXISTS source TEXT;
CREATE INDEX IF NOT EXISTS idx_pyqs_source ON upsc_pyqs (source);
```

Backfill existing rows by matching against `tags` or other clues. If you can't determine source for old rows, leave them NULL — the merge logic below treats NULL as "unknown, do not delete."

- [ ] **Step 2: Write the merge script**

```js
// scripts/merge-unlockias-into-canonical.mjs
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

const REPLACEABLE_SOURCES = new Set(['education_province', 'pdf_extract', 'insightsonindia', 'iasexamportal', 'indiabix']);

function normalize(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

// Levenshtein with early-exit cap
function lev(a, b, cap = 64) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const dp = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[j], dp[j-1]);
      prev = tmp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > cap) return cap + 1;
  }
  return dp[b.length];
}

// 1. Pull staging
const { data: staging } = await supabase.from('upsc_pyqs_unlockias_raw').select('*');
console.log(`Staging rows: ${staging.length}`);

// 2. Pull all canonical rows (year, question, source, paper)
const { data: canonical } = await supabase.from('upsc_pyqs').select('id, year, question_no, question, source, paper');
console.log(`Canonical rows: ${canonical.length}`);

// Index canonical by (year, question_no)
const byYearNo = new Map();
for (const c of canonical) byYearNo.set(`${c.year}:${c.question_no}`, c);

let inserted = 0, updated = 0, skipped = 0;

for (const s of staging) {
  // Try exact match
  const exact = byYearNo.get(`${s.year}:${s.question_no}`);
  let match = exact;

  // Try fuzzy match within same year
  if (!match) {
    const candidates = canonical.filter(c => c.year === s.year);
    const sNorm = normalize(s.question);
    for (const c of candidates) {
      const cNorm = normalize(c.question);
      if (lev(sNorm.slice(0,256), cNorm.slice(0,256), 32) < 32) {
        match = c;
        break;
      }
    }
  }

  const row = {
    year: s.year,
    question_no: s.question_no,
    question: s.question,
    options: s.options,
    answer: s.answer,
    subject: s.subject,
    topic: s.topic,
    paper: s.year >= 2011 ? 'gs1' : 'general',  // Pre-2011: single GS paper
    exam_type: 'prelims',
    source: 'unlockias',
  };

  if (match) {
    if (!match.source || REPLACEABLE_SOURCES.has(match.source)) {
      const { error } = await supabase.from('upsc_pyqs').update(row).eq('id', match.id);
      if (error) throw new Error(`Update id=${match.id}: ${error.message}`);
      updated++;
    } else {
      skipped++;  // trusted source, leave it alone
    }
  } else {
    const { error } = await supabase.from('upsc_pyqs').insert(row);
    if (error) throw new Error(`Insert ${s.year}/${s.question_no}: ${error.message}`);
    inserted++;
  }
}

console.log(`Done. Inserted ${inserted}, updated ${updated}, skipped ${skipped}.`);
```

- [ ] **Step 3: Backup the canonical table before merging**

```bash
node -e "import('@supabase/supabase-js').then(async ({createClient}) => { const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const {data} = await c.from('upsc_pyqs').select('*'); require('fs').writeFileSync('data/pyqs/canonical-pre-unlockias-merge.json', JSON.stringify(data)); console.log('backed up', data.length, 'rows'); })"
```

Expected: `backed up ~3108 rows`. File exists and is non-empty.

- [ ] **Step 4: Dry run the merge (read-only counts)**

Add a `--dry-run` flag to the merge script that just counts what *would* happen without writing. Run it:

Run: `node scripts/merge-unlockias-into-canonical.mjs --dry-run`
Expected: prints intended `inserted`, `updated`, `skipped` counts. Sanity-check: `updated` should be ~1500 (replacing the malformed rows), `inserted` should be ~2000 (years/questions we didn't have), `skipped` should match the count of trusted-source rows.

- [ ] **Step 5: Run the real merge**

Run: `node scripts/merge-unlockias-into-canonical.mjs`
Expected: same counts as dry run, no errors.

- [ ] **Step 6: Verify the canonical table is healthy**

Run: `node scripts/investigate-malformed-pyqs.mjs`
Expected: malformed count drops from ~1572 to < 30 (the residual non-UnlockIAS junk in formats we can't auto-repair).

Run: `node -e "import('@supabase/supabase-js').then(async ({createClient}) => { const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const {count} = await c.from('upsc_pyqs').select('*', {count: 'exact', head: true}); console.log('canonical rows:', count); })"`
Expected: ~5000 (3108 baseline + ~2000 new inserts − a handful of merges that didn't increase the count).

- [ ] **Step 7: Commit**

```bash
git add scripts/merge-unlockias-into-canonical.mjs data/pyqs/canonical-pre-unlockias-merge.json
git commit -m "feat(pyqs): merge UnlockIAS corpus into canonical upsc_pyqs"
```

---

## Task 8: Smoke test the journey UI

**Files:** none new — UI test only.

- [ ] **Step 1: Start the dev server**

Run: `cd ~/Documents/UPSCMapAI && npm run dev`
Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: Browse the journey**

Open `http://localhost:3000` in a browser. Navigate to a topic that previously had malformed PYQs (e.g., a polity or economy topic). Click into a practice quiz.

Expected: questions render cleanly. Options are full sentences, not fragments. Answer reveal works. No "Already logged in? Click here to refresh" trailers.

- [ ] **Step 3: Check coverage for the worst-affected gap subjects**

Per the gap analysis memo: World History, Post-Independence India, GS-II Polity. Browse a topic in each. Confirm at least 5 PYQs surface per topic where previously there were 0–2.

- [ ] **Step 4: If anything looks broken, file a follow-up task in this plan and DO NOT mark Task 8 complete.**

If everything looks good:

```bash
git tag -a pyq-extraction-v1 -m "UnlockIAS Prelims corpus merged into upsc_pyqs"
```

---

## Task 9 (optional, deferred): Mains corpus

Mains questions are essay-format, no MCQ options, completely different schema. Out of scope for this plan because:
- The existing `upsc_pyqs` schema requires `options` (JSONB) and `answer` ('a'..'d') — Mains rows would have neither.
- The journey UI is built around MCQ practice, not essay prompts.
- The user's stated need is "PYQs for past 25 years", and Prelims alone covers 31 years of MCQs.

If/when Mains is wanted, write a **separate plan** that:
1. Adds an `upsc_mains_pyqs` table (essay text, marks, word limit, year, paper, topic, model answer URL).
2. Picks one of: Insights on India per-year posts (HTML), IASbaba per-year posts (HTML), UPSC official Mains PDFs (PDF parse).
3. Extracts question text only — model answers are typically subjective and shouldn't be auto-parsed.

---

## Self-Review

**Spec coverage:**
- ✅ "Best source for past 25 years" → Source Decision Log evaluates 8 candidates, picks UnlockIAS (covers 31 years, exceeds requirement).
- ✅ "Full detail" → Every task has exact file paths, inline code, exact commands, expected outputs.
- ✅ "Plan after researching" → Research is in the Source Decision Log, plan starts at Task 0.
- ✅ "Use Playwright" → Tasks 0, 1, 3, 4 are explicit Playwright MCP usage. Driver script is split so Playwright is called from this Claude Code session, not from Node.

**Placeholder scan:**
- No "TBD", no "implement later", no "similar to Task N", no "add error handling without showing how". The parser selectors in Task 2 are explicitly marked as educated guesses requiring iteration against the real fixture — this is intentional, not a placeholder, because we can't know exact UnlockIAS class names without running Playwright.

**Type consistency:**
- `parseUnlockiasYearPage(html, year)` is defined in Task 2 and used in Task 3 (`scrape-unlockias-pyqs.mjs`).
- `parseUnlockiasSubjectPage(html, subjectSlug)` and `simpleHash(s)` are defined in Task 4 and used in Task 5 (`load-unlockias-to-supabase.mjs`).
- Schema field names (`year`, `question_no`, `question`, `options`, `answer`, `subject`, `topic`, `paper`, `exam_type`) match `scripts/schema.sql:12-37`.
- Staging table column names match the loader's row object keys.

**Risks called out in plan:**
1. Selectors in Task 2 are guesses → mitigated by TDD against fixture.
2. Older years (1995–2010) may have different markup → mitigated by per-year resume + iterative fix loop in Task 3 Step 5.
3. Politeness on a small site → 3-5 sec throttle baked into the loop instructions.
4. Trust between UnlockIAS and UPSC official answer keys → 5-row spot-check in Task 6 Step 4.
5. Pre-2011 paper field — single GS paper before CSAT split → handled in merge with `s.year >= 2011 ? 'gs1' : 'general'`.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-04-12-upsc-pyq-extraction.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks. Best for the parser-iteration loop in Task 2 because each subagent gets a clean context to debug selectors.

2. **Inline Execution** — I execute tasks in this session using `superpowers:executing-plans`. Faster end-to-end but my context will fill up during the 31-year scrape loop in Task 3.

**Hard prerequisite for either:** Restart Claude Code first so Playwright MCP becomes callable. Verify with `claude mcp list`.

**Which approach do you want?**
