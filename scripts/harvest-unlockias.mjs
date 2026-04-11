#!/usr/bin/env node
// Harvest UPSC Prelims PYQs from UnlockIAS year pages.
//
// One HTTP request per year. Each year page embeds all 100 questions inside
// React Server Components push chunks as fully-structured JSON records:
//   { question_id, year, paper, question_number, question_text, options{a,b,c,d},
//     correct_answer, subject, sub_topic, difficulty, explanation, source, exam }
//
// Approach:
//   1. curl the year page (DNS-pinned to Fastly IP because Tailscale MagicDNS
//      can't resolve www.unlockias.in via the OS resolver on this machine)
//   2. Find every  self.__next_f.push([1, "<json-string-literal>"])  call
//   3. Concatenate the decoded payloads into one big string
//   4. Walk that string finding each {"question_id":"UPSC_..."} object via
//      brace-matching, JSON.parse each
//
// Usage:
//   node scripts/harvest-unlockias.mjs <year>     # one year (e.g. 2024)
//   node scripts/harvest-unlockias.mjs all        # 1995..2025
//   node scripts/harvest-unlockias.mjs status     # show progress
//   node scripts/harvest-unlockias.mjs reparse    # re-parse already-saved raw HTML
//
// On reruns: years already saved with count >= expected are skipped unless
// the saved count is suspiciously low (< 80) or --force is passed.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';

const exec = promisify(execFile);

const HOST = 'www.unlockias.in';
const FASTLY_IP = '151.101.2.15';
const RAW_DIR = 'data/pyqs/unlockias/raw';
const OUT_DIR = 'data/pyqs/unlockias';
const YEARS = Array.from({ length: 2025 - 1995 + 1 }, (_, i) => 1995 + i);
const PAUSE_MS = 800; // be polite — one year page per ~1s

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function curl(url, attempt = 1) {
  try {
    const { stdout } = await exec('curl', [
      '-sL',
      '--max-time', '25',
      '--retry', '2',
      '--retry-delay', '3',
      '--resolve', `${HOST}:443:${FASTLY_IP}`,
      '-A', 'UPSCMapAI-corpus-builder/1.0 (research; contact: project owner)',
      url,
    ], { maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } catch (e) {
    if (attempt < 3) {
      await sleep(2000 * attempt);
      return curl(url, attempt + 1);
    }
    throw new Error(`curl failed after 3 attempts: ${url} — ${e.message}`);
  }
}

// Decode all RSC push chunks into one concatenated string.
function decodeRscPayload(html) {
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let total = '';
  for (const m of html.matchAll(re)) {
    try { total += JSON.parse(m[1]); } catch { /* skip bad chunk */ }
  }
  return total;
}

// Find a balanced JSON object starting at index `start` (which must point at '{').
// Respects strings and escapes. Returns [endIndexInclusive, jsonText] or null.
function readJsonObject(s, start) {
  if (s[start] !== '{') return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return [i, s.slice(start, i + 1)];
    }
  }
  return null;
}

// Extract every question record from the decoded RSC payload.
function extractQuestions(rsc) {
  const out = [];
  const marker = '"question_id":"UPSC_';
  let cursor = 0;
  while (true) {
    const i = rsc.indexOf(marker, cursor);
    if (i < 0) break;
    // Walk back to the enclosing '{'
    let openIdx = i;
    while (openIdx > 0 && rsc[openIdx] !== '{') openIdx--;
    const r = readJsonObject(rsc, openIdx);
    if (!r) { cursor = i + marker.length; continue; }
    try {
      const obj = JSON.parse(r[1]);
      if (obj.question_id && obj.question_text) out.push(obj);
    } catch {
      // Some objects nest further structures we don't need; the outer brace
      // we found may belong to a wrapper, not the question. Try expanding.
      // For now, just skip — the marker scan continues from after this point.
    }
    cursor = r[0] + 1;
  }
  // Dedupe by question_id (the same record can appear in multiple wrappers)
  const seen = new Map();
  for (const q of out) seen.set(q.question_id, q);
  return [...seen.values()];
}

function normalizeRecord(q) {
  return {
    year: q.year,
    paper: q.paper || 'GS1',
    question_no: q.question_number,
    question_id: q.question_id,
    question: (q.question_text || '').trim(),
    options: {
      a: q.options?.a || '',
      b: q.options?.b || '',
      c: q.options?.c || '',
      d: q.options?.d || '',
    },
    answer: (q.correct_answer || '').toLowerCase(),
    subject: q.subject || null,
    sub_topic: q.sub_topic || null,
    difficulty: q.difficulty || null,
    explanation: q.explanation || null,
    source_tag: q.source || null,
    exam: q.exam || null,
  };
}

function validate(r) {
  const errs = [];
  if (!r.year || r.year < 1995 || r.year > 2030) errs.push('bad year');
  if (!r.question_no) errs.push('no question_no');
  if (!r.question || r.question.length < 10) errs.push('question too short');
  for (const k of ['a', 'b', 'c', 'd']) {
    if (!r.options[k] || r.options[k].length < 1) errs.push(`missing option ${k}`);
  }
  if (!['a', 'b', 'c', 'd'].includes(r.answer)) errs.push('bad answer letter');
  for (const v of Object.values(r.options)) {
    if (/already logged in|click here to refresh|show\s*answer/i.test(v)) errs.push('junk in option');
  }
  return errs;
}

async function harvestYear(year, { force = false } = {}) {
  const outFile = `${OUT_DIR}/${year}.json`;
  if (!force && existsSync(outFile)) {
    const existing = JSON.parse(readFileSync(outFile, 'utf8'));
    if ((existing.count || 0) >= 80) {
      console.log(`[${year}] already harvested (${existing.count} questions) — skip`);
      return existing;
    }
  }

  const yearUrl = `https://${HOST}/upsc-prelims-pyq/${year}`;
  console.log(`[${year}] GET ${yearUrl}`);
  const html = await curl(yearUrl);
  writeFileSync(`${RAW_DIR}/${year}.html`, html);

  const rsc = decodeRscPayload(html);
  if (!rsc.includes('question_id')) {
    throw new Error(`[${year}] no question_id markers in RSC payload (${rsc.length} bytes) — likely no questions or markup change`);
  }

  const raw = extractQuestions(rsc);
  console.log(`[${year}] extracted ${raw.length} raw question objects`);

  const records = [];
  const failures = [];
  for (const q of raw) {
    const r = normalizeRecord(q);
    const errs = validate(r);
    if (errs.length) failures.push({ id: q.question_id, errs, record: r });
    else records.push(r);
  }
  records.sort((a, b) => (a.question_no || 0) - (b.question_no || 0));

  const out = {
    year,
    fetched_at: new Date().toISOString(),
    count: records.length,
    failures: failures.length,
    questions: records,
    failed: failures,
  };
  writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`[${year}] saved ${records.length} ok, ${failures.length} failed → ${outFile}`);
  return out;
}

function reparseAll() {
  let total = 0;
  for (const f of readdirSync(RAW_DIR).sort()) {
    const m = f.match(/^(\d{4})\.html$/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const html = readFileSync(`${RAW_DIR}/${f}`, 'utf8');
    const rsc = decodeRscPayload(html);
    const raw = extractQuestions(rsc);
    const records = [];
    const failures = [];
    for (const q of raw) {
      const r = normalizeRecord(q);
      const errs = validate(r);
      if (errs.length) failures.push({ id: q.question_id, errs });
      else records.push(r);
    }
    records.sort((a, b) => (a.question_no || 0) - (b.question_no || 0));
    writeFileSync(`${OUT_DIR}/${year}.json`, JSON.stringify({
      year, fetched_at: new Date().toISOString(),
      count: records.length, failures: failures.length,
      questions: records, failed: failures,
    }, null, 2));
    console.log(`[${year}] reparsed: ${records.length} ok, ${failures.length} failed`);
    total += records.length;
  }
  console.log(`\ntotal: ${total} questions across reparsed years`);
}

function status() {
  let total = 0, done = 0;
  for (const y of YEARS) {
    const f = `${OUT_DIR}/${y}.json`;
    if (existsSync(f)) {
      const d = JSON.parse(readFileSync(f, 'utf8'));
      total += d.count || 0;
      done++;
      console.log(`  ${y}: ${d.count} ok, ${d.failures || 0} failed`);
    } else {
      console.log(`  ${y}: -`);
    }
  }
  console.log(`\n${done}/${YEARS.length} years complete, ${total} total questions`);
}

const arg = process.argv[2];
const force = process.argv.includes('--force');

if (!arg) {
  console.error('Usage: node scripts/harvest-unlockias.mjs <year|all|status|reparse> [--force]');
  process.exit(1);
}
if (arg === 'status') {
  status();
} else if (arg === 'reparse') {
  reparseAll();
} else if (arg === 'all') {
  for (const y of YEARS) {
    try { await harvestYear(y, { force }); }
    catch (e) { console.error(`[${y}] FAILED: ${e.message}`); }
    await sleep(PAUSE_MS);
  }
  console.log('\n--- final status ---');
  status();
} else {
  const y = parseInt(arg, 10);
  if (!Number.isFinite(y)) { console.error('bad year'); process.exit(1); }
  await harvestYear(y, { force });
}
