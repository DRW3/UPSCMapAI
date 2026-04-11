/**
 * Compare freshly harvested UnlockIAS PYQs against the existing upsc_pyqs table.
 *
 * Reports:
 *   - total counts on each side
 *   - exact matches by (year, question_no)
 *   - fuzzy text matches (normalized question, first 200 chars)
 *   - existing rows with no UnlockIAS counterpart (would survive a merge)
 *   - UnlockIAS rows with no canonical counterpart (would be inserted)
 *   - overlap by source tag (so we know which existing sources we'd be replacing)
 *
 * Read-only. Touches no data.
 *
 * Run: node scripts/compare-unlockias-vs-canonical.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';

const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/&[a-z#0-9]+;/g, ' ')   // html entities
    .replace(/[^a-z0-9]+/g, ' ')      // punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
}

function shortKey(s, n = 200) {
  return normalize(s).slice(0, n);
}

// ── Load UnlockIAS harvest ───────────────────────────────────────────────────
const harvestDir = 'data/pyqs/unlockias';
const harvest = [];
for (const f of readdirSync(harvestDir).sort()) {
  if (!/^\d{4}\.json$/.test(f)) continue;
  const d = JSON.parse(readFileSync(`${harvestDir}/${f}`, 'utf8'));
  for (const q of d.questions) harvest.push(q);
}
console.log(`UnlockIAS harvest:    ${harvest.length} questions across ${new Set(harvest.map(q=>q.year)).size} years`);

// ── Pull canonical upsc_pyqs (paginate to be safe) ───────────────────────────
const canonical = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data, error } = await sb
    .from('upsc_pyqs')
    .select('id, year, question_no, question, paper, exam_type')
    .range(from, from + PAGE - 1);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  canonical.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
console.log(`Canonical upsc_pyqs:  ${canonical.length} rows`);

// Check if there's a source column
const probe = await sb.from('upsc_pyqs').select('*').limit(1);
const cols = probe.data?.[0] ? Object.keys(probe.data[0]) : [];
const hasSourceCol = cols.includes('source');
console.log(`Schema columns:       ${cols.join(', ')}`);
console.log(`Source column?        ${hasSourceCol ? 'yes' : 'no'}`);

if (hasSourceCol) {
  const { data: srcData } = await sb
    .from('upsc_pyqs')
    .select('source, id', { count: 'exact' })
    .limit(5000);
  const srcCount = {};
  for (const r of srcData) srcCount[r.source || '∅'] = (srcCount[r.source || '∅'] || 0) + 1;
  console.log('Existing rows by source:', srcCount);
}

// ── Build indexes ────────────────────────────────────────────────────────────
const canonicalByYearNo = new Map();   // 'year:qno' → [rows]
const canonicalByText = new Map();     // shortKey → [rows]
const canonicalByYear = new Map();     // year → [rows] (for fuzzy fallback)

for (const c of canonical) {
  if (c.year && c.question_no) {
    const k = `${c.year}:${c.question_no}`;
    if (!canonicalByYearNo.has(k)) canonicalByYearNo.set(k, []);
    canonicalByYearNo.get(k).push(c);
  }
  const tk = shortKey(c.question);
  if (tk) {
    if (!canonicalByText.has(tk)) canonicalByText.set(tk, []);
    canonicalByText.get(tk).push(c);
  }
  if (c.year) {
    if (!canonicalByYear.has(c.year)) canonicalByYear.set(c.year, []);
    canonicalByYear.get(c.year).push(c);
  }
}

// Diagnostic: how many canonical rows have year + question_no?
const canonHasNo = canonical.filter(c => c.year && c.question_no).length;
console.log(`Canonical rows with year+question_no: ${canonHasNo}`);

// ── Compare ──────────────────────────────────────────────────────────────────
let exactMatches = 0;        // matched by (year, question_no)
let fuzzyMatches = 0;        // matched by normalized text only
let noMatch = 0;
const matchedCanonicalIds = new Set();
const unmatchedHarvestSamples = [];
const fuzzyMatchSamples = [];

for (const h of harvest) {
  const key = `${h.year}:${h.question_no}`;
  const exact = canonicalByYearNo.get(key);
  if (exact && exact.length) {
    exactMatches++;
    for (const e of exact) matchedCanonicalIds.add(e.id);
    continue;
  }
  // Fuzzy: same year, normalized text identical
  const tk = shortKey(h.question);
  const sameTextRows = canonicalByText.get(tk) || [];
  if (sameTextRows.length) {
    fuzzyMatches++;
    for (const e of sameTextRows) matchedCanonicalIds.add(e.id);
    if (fuzzyMatchSamples.length < 5) {
      fuzzyMatchSamples.push({
        harvest: { year: h.year, qno: h.question_no, q: h.question.slice(0, 100) },
        canonical: { year: sameTextRows[0].year, qno: sameTextRows[0].question_no, id: sameTextRows[0].id, q: sameTextRows[0].question.slice(0, 100) },
      });
    }
    continue;
  }
  noMatch++;
  if (unmatchedHarvestSamples.length < 5) {
    unmatchedHarvestSamples.push({ year: h.year, qno: h.question_no, q: h.question.slice(0, 120) });
  }
}

const canonicalUnmatched = canonical.length - matchedCanonicalIds.size;

console.log('\n══════════════ OVERLAP REPORT ══════════════');
console.log(`Harvest size:                          ${harvest.length}`);
console.log(`Canonical size:                        ${canonical.length}`);
console.log(`────────────────────────────────────────`);
console.log(`Exact matches  (year + question_no):   ${exactMatches}`);
console.log(`Fuzzy matches  (normalized text):      ${fuzzyMatches}`);
console.log(`No match in canonical (would INSERT):  ${noMatch}`);
console.log(`────────────────────────────────────────`);
console.log(`Canonical rows matched by harvest:     ${matchedCanonicalIds.size}`);
console.log(`Canonical rows NOT in harvest:         ${canonicalUnmatched}  ← survive merge untouched`);
console.log('═══════════════════════════════════════════');

// Distribution of unmatched harvest rows by year — to understand the years gap
const unmatchedByYear = {};
for (const h of harvest) {
  const key = `${h.year}:${h.question_no}`;
  if (!canonicalByYearNo.has(key) && !canonicalByText.has(shortKey(h.question))) {
    unmatchedByYear[h.year] = (unmatchedByYear[h.year] || 0) + 1;
  }
}
console.log('\nNew (no-match) harvest rows by year:');
for (const y of Object.keys(unmatchedByYear).sort()) {
  console.log(`  ${y}: ${unmatchedByYear[y]}`);
}

// Distribution of canonical-unmatched by year
const canonUnmatchedByYear = {};
for (const c of canonical) {
  if (!matchedCanonicalIds.has(c.id) && c.year) {
    canonUnmatchedByYear[c.year] = (canonUnmatchedByYear[c.year] || 0) + 1;
  }
}
console.log('\nCanonical rows NOT matched by harvest, by year (top 15):');
const sorted = Object.entries(canonUnmatchedByYear).sort((a,b)=>b[1]-a[1]).slice(0,15);
for (const [y, n] of sorted) console.log(`  ${y}: ${n}`);

console.log('\nSample unmatched harvest (truly new):');
for (const s of unmatchedHarvestSamples) console.log(' ', s);

if (fuzzyMatchSamples.length) {
  console.log('\nSample fuzzy matches (text identical, qno mismatch):');
  for (const s of fuzzyMatchSamples) console.log(' ', s);
}
