# UnlockIAS PYQ Table v2 + Journey Cutover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `upsc_pyqs_v2` in Supabase, populate it from the already-harvested 3,886 UnlockIAS questions, tag every row with syllabus topic IDs via Groq, and cut the journey UI over to it via a single environment variable — fully reversible.

**Architecture:** Three-stage pipeline that runs end-to-end in one session: SQL migration → JSON loader → Groq tagger → API cutover. Each stage writes its own checkpoint and is independently re-runnable. Drop-in schema compatibility means zero changes to React components, just two `.from('upsc_pyqs')` lines wrapped in an env-var lookup.

**Tech Stack:** Node.js (`.mjs` to match repo convention), `@supabase/supabase-js` (already installed), `groq-sdk` (already installed at `scripts/repair-malformed-pyqs.mjs:27`), Vitest for unit tests, raw SQL for the migration.

**Spec reference:** `docs/superpowers/specs/2026-04-12-upsc-pyqs-v2-design.md`

**Already done in prior session:** 3,886 questions are harvested into `data/pyqs/unlockias/{1995..2025}.json` via `scripts/harvest-unlockias.mjs`. Do NOT re-harvest.

---

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/v2-schema.sql` | `CREATE TABLE upsc_pyqs_v2` + indexes + updated-at trigger. Run once via Supabase SQL editor or psql. |
| `scripts/normalize-subject.mjs` | Pure function: maps UnlockIAS subject strings to canonical short codes (`'Indian Polity'` → `'polity'`). Exports `normalizeSubject(raw)` and `SUBJECT_MAP`. Importable by loader and tagger. |
| `tests/normalize-subject.test.mjs` | Vitest unit tests for `normalizeSubject`. |
| `scripts/load-v2.mjs` | Reads `data/pyqs/unlockias/*.json`, normalizes subjects, upserts into `upsc_pyqs_v2`. Idempotent via `question_id_external` UNIQUE constraint. |
| `scripts/build-tagging-candidates.mjs` | Pure function: given a question's UnlockIAS subject, returns the filtered list of `{topicId, title, keywords}` from `data/topic-keyword-map.ts` and `data/syllabus.ts` for the Groq prompt. Exports `buildCandidates(subject)`. |
| `tests/build-tagging-candidates.test.mjs` | Vitest tests for `buildCandidates`. |
| `scripts/tag-v2-with-groq.mjs` | Pulls untagged rows from `upsc_pyqs_v2` in batches of 5, calls Groq llama-3.3-70b with the candidate-filtered prompt, validates returned topic IDs against `syllabus.ts`, writes `tags` column + `confidence` JSONB. Reuses 429-retry logic from `scripts/repair-malformed-pyqs.mjs`. |
| `scripts/audit-tagging.mjs` | Selects 50 random tagged rows, prints `{question, assigned tags, topic titles}`, prompts user to mark each `y/n`, reports accuracy. |
| `scripts/coverage-report-v2.mjs` | Counts how many questions are tagged for each of the 524 syllabus topics. Identifies gaps. |
| `app/api/journey/pyqs/route.ts:387, 613` | Wrap `'upsc_pyqs'` in `process.env.PYQ_TABLE || 'upsc_pyqs'`. |
| `app/api/journey/pyq-counts/route.ts:18, 66` | Same wrap. |
| `data/pyqs/unlockias/_v2-load-state.json` | Loader checkpoint: which years have been loaded successfully. |
| `data/v2-tagging-failures.jsonl` | Append-only log of rows that failed Groq tagging twice. |

---

## Pre-existing inventory you should know

From the spec's app-dependency audit:

- **`app/api/journey/pyqs/route.ts:387-392`** — primary `.from('upsc_pyqs').select('id, year, question, options, answer, explanation, subject, topic, difficulty, source, tags').contains('tags', [\`topic:${topicId}\`]).not('options','is',null).not('answer','is',null)`.
- **`app/api/journey/pyqs/route.ts:611-617`** — wrong-question replay, same select, `.in('id', onlyIds)`.
- **`app/api/journey/pyq-counts/route.ts:18-22`** — counts via `.select('id, tags, year')`, paginated `.range(from, from+999)`.
- **`app/api/journey/pyq-counts/route.ts:65-69`** — legacy keyword fallback, `.select('id, question, subject, year')`.
- **`components/journey/PracticeSheet.tsx:15-26`** — defines the `PYQ` interface that the new table's columns must satisfy 1:1.
- **`scripts/repair-malformed-pyqs.mjs:27, 55, 116`** — the existing Groq integration pattern (`import Groq from 'groq-sdk'`, `groq.chat.completions.create({ model: 'llama-3.1-8b-instant', ... })`, `try again in Xs` retry parsing). The new tagger uses the same pattern but with `llama-3.3-70b-versatile`.

---

## Task 0: Pre-flight verification

**Files:** none — verification only.

- [ ] **Step 1: Confirm harvest is intact**

Run: `cd ~/Documents/UPSCMapAI && node scripts/harvest-unlockias.mjs status`

Expected output ends with: `31/31 years complete, 3886 total questions` (or within ±5).

- [ ] **Step 2: Confirm Supabase service-role key is loaded**

Run:
```bash
node -e "
import('@supabase/supabase-js').then(async ({createClient}) => {
  const fs = await import('node:fs');
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count } = await sb.from('upsc_pyqs').select('*', {count:'exact', head:true});
  console.log('upsc_pyqs row count:', count);
});
"
```
Expected: prints a number ≥3000 (the existing v1 corpus). If it errors with `Invalid API key` or undefined, fix `.env.local` before continuing.

- [ ] **Step 3: Confirm Groq API key works**

Run:
```bash
node -e "
import('groq-sdk').then(async ({default: Groq}) => {
  const fs = await import('node:fs');
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
  const g = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const r = await g.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{role:'user', content:'Reply with the single word OK.'}],
    max_tokens: 5,
  });
  console.log('groq:', r.choices[0].message.content.trim());
});
"
```
Expected: prints `groq: OK` (or similar single word). If 401/429, fix the key or wait out the rate limit before continuing.

- [ ] **Step 4: Confirm `upsc_pyqs_v2` does NOT already exist**

Run:
```bash
node -e "
import('@supabase/supabase-js').then(async ({createClient}) => {
  const fs = await import('node:fs');
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await sb.from('upsc_pyqs_v2').select('*', {count:'exact', head:true});
  console.log(error ? 'does not exist (good): ' + error.message : 'EXISTS already — abort and inspect');
});
"
```
Expected: prints `does not exist (good): ...`. If it says `EXISTS already`, stop and inspect the existing table before continuing.

---

## Task 1: SQL migration — create `upsc_pyqs_v2`

**Files:**
- Create: `scripts/v2-schema.sql`

- [ ] **Step 1: Write the SQL migration**

```sql
-- scripts/v2-schema.sql
-- Drop-in replacement table for upsc_pyqs, fed by the UnlockIAS harvest.
-- Schema is column-compatible with everything app/api/journey/pyqs/route.ts
-- and components/journey/PracticeSheet.tsx read.

CREATE TABLE IF NOT EXISTS upsc_pyqs_v2 (
  id                    BIGSERIAL PRIMARY KEY,
  year                  INT  NOT NULL CHECK (year BETWEEN 1995 AND 2030),
  exam_type             TEXT NOT NULL DEFAULT 'prelims',
  paper                 TEXT NOT NULL,
  question_no           INT  NOT NULL,
  question              TEXT NOT NULL,
  options               JSONB NOT NULL,
  answer                TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  explanation           TEXT,
  subject               TEXT NOT NULL,
  topic                 TEXT NOT NULL,
  difficulty            TEXT,
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  source                TEXT NOT NULL DEFAULT 'unlockias',
  source_url            TEXT,
  question_id_external  TEXT UNIQUE,
  sub_topic_raw         TEXT,
  confidence            JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pyqs_v2_year     ON upsc_pyqs_v2 (year);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_subject  ON upsc_pyqs_v2 (subject);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_paper    ON upsc_pyqs_v2 (paper);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_tags     ON upsc_pyqs_v2 USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_pyqs_v2_question_fts ON upsc_pyqs_v2
  USING GIN (to_tsvector('english', question));

-- Reuse the existing set_updated_at() function defined in scripts/schema.sql.
-- If it doesn't exist in this DB, run scripts/schema.sql first.
DROP TRIGGER IF EXISTS trg_pyqs_v2_updated_at ON upsc_pyqs_v2;
CREATE TRIGGER trg_pyqs_v2_updated_at
  BEFORE UPDATE ON upsc_pyqs_v2
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Apply the migration via Supabase SQL editor**

Open the Supabase project dashboard for `kvfclhqgqnlcdluyczrs`, go to SQL Editor, paste the contents of `scripts/v2-schema.sql`, click Run.

Expected: `Success. No rows returned.` (or equivalent).

If the trigger creation fails with `function set_updated_at() does not exist`, run the relevant chunk from `scripts/schema.sql` first (search for `CREATE OR REPLACE FUNCTION set_updated_at`), then re-run the v2 migration.

- [ ] **Step 3: Verify the table exists and is empty**

Run:
```bash
node -e "
import('@supabase/supabase-js').then(async ({createClient}) => {
  const fs = await import('node:fs');
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count, error } = await sb.from('upsc_pyqs_v2').select('*', {count:'exact', head:true});
  console.log('upsc_pyqs_v2:', error ? 'ERROR ' + error.message : count + ' rows');
});
"
```
Expected: `upsc_pyqs_v2: 0 rows`.

- [ ] **Step 4: Commit**

```bash
git add scripts/v2-schema.sql
git commit -m "feat(pyqs-v2): add upsc_pyqs_v2 schema migration"
```

---

## Task 2: Subject normalization (TDD)

**Files:**
- Create: `scripts/normalize-subject.mjs`
- Create: `tests/normalize-subject.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/normalize-subject.test.mjs
import { describe, it, expect } from 'vitest';
import { normalizeSubject, SUBJECT_MAP } from '../scripts/normalize-subject.mjs';

describe('normalizeSubject', () => {
  it('maps Indian Polity → polity', () => {
    expect(normalizeSubject('Indian Polity')).toBe('polity');
  });

  it('is case-insensitive', () => {
    expect(normalizeSubject('INDIAN POLITY')).toBe('polity');
    expect(normalizeSubject('indian polity')).toBe('polity');
  });

  it('trims whitespace', () => {
    expect(normalizeSubject('  Geography  ')).toBe('geography');
  });

  it('handles all observed UnlockIAS subjects', () => {
    const observed = [
      'Art & Culture', 'Current Affairs', 'Economy', 'Environment & Ecology',
      'Geography', 'History', 'Indian Economy', 'Indian Polity',
      'International Relations', 'Modern History', 'Polity',
      'Science & Technology', 'Science and Technology',
    ];
    for (const s of observed) {
      const out = normalizeSubject(s);
      expect(out, `failed for "${s}"`).toMatch(/^[a-z_]+$/);
    }
  });

  it('returns "general" for unknown subjects with a console warning', () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...a) => warns.push(a.join(' '));
    try {
      expect(normalizeSubject('Made-up Subject XYZ')).toBe('general');
      expect(warns.some(w => /unmapped/i.test(w))).toBe(true);
    } finally {
      console.warn = orig;
    }
  });

  it('SUBJECT_MAP is exported and is a plain object', () => {
    expect(SUBJECT_MAP).toBeTypeOf('object');
    expect(SUBJECT_MAP['indian polity']).toBe('polity');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/Documents/UPSCMapAI && npx vitest run tests/normalize-subject.test.mjs`
Expected: FAIL with `Cannot find module '../scripts/normalize-subject.mjs'`.

- [ ] **Step 3: Implement the module**

```js
// scripts/normalize-subject.mjs
export const SUBJECT_MAP = {
  'indian polity': 'polity',
  'polity': 'polity',
  'governance': 'polity',
  'indian economy': 'economy',
  'economy': 'economy',
  'geography': 'geography',
  'physical geography': 'geography',
  'environment & ecology': 'environment',
  'environment and ecology': 'environment',
  'environment': 'environment',
  'ancient history': 'history',
  'medieval history': 'history',
  'modern history': 'history',
  'history': 'history',
  'art & culture': 'art_culture',
  'art and culture': 'art_culture',
  'science & technology': 'science',
  'science and technology': 'science',
  'general science': 'science',
  'international relations': 'ir',
  'current affairs': 'current_affairs',
  'sports': 'current_affairs',
};

export function normalizeSubject(raw) {
  const k = (raw || '').trim().toLowerCase();
  if (SUBJECT_MAP[k]) return SUBJECT_MAP[k];
  console.warn(`[normalize-subject] unmapped subject: "${raw}" → "general"`);
  return 'general';
}
```

- [ ] **Step 4: Run tests — they should pass**

Run: `cd ~/Documents/UPSCMapAI && npx vitest run tests/normalize-subject.test.mjs`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/normalize-subject.mjs tests/normalize-subject.test.mjs
git commit -m "feat(pyqs-v2): subject normalizer with TDD coverage"
```

---

## Task 3: Loader script — JSON → Supabase

**Files:**
- Create: `scripts/load-v2.mjs`
- Create: `data/pyqs/unlockias/_v2-load-state.json`

- [ ] **Step 1: Initialize the load-state file**

```bash
cd ~/Documents/UPSCMapAI
echo '{"completedYears":[],"totalLoaded":0,"unmappedSubjects":[]}' > data/pyqs/unlockias/_v2-load-state.json
```

- [ ] **Step 2: Write the loader script**

```js
// scripts/load-v2.mjs
//
// Loads the UnlockIAS harvest into upsc_pyqs_v2.
//
// - Reads every data/pyqs/unlockias/{year}.json
// - Normalizes subject via scripts/normalize-subject.mjs
// - Maps year>=2011 → paper='gs1', else 'general'
// - Upserts on (question_id_external) so re-runs are idempotent
// - Skips rows that don't pass the v2 schema constraints (answer in a-d, etc.)
// - Resumes via _v2-load-state.json (year-level checkpointing)
//
// Run: node scripts/load-v2.mjs           # incremental (skip completed years)
//      node scripts/load-v2.mjs --force   # reload everything

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { normalizeSubject } from './normalize-subject.mjs';

// Load .env.local
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const HARVEST_DIR = 'data/pyqs/unlockias';
const STATE_PATH = `${HARVEST_DIR}/_v2-load-state.json`;
const force = process.argv.includes('--force');

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
const unmapped = new Set(state.unmappedSubjects || []);

function paperFor(year) {
  return year >= 2011 ? 'gs1' : 'general';
}

function rowFromHarvest(q) {
  // q comes from data/pyqs/unlockias/{year}.json questions[]
  const subject = normalizeSubject(q.subject || '');
  if (subject === 'general' && q.subject) unmapped.add(q.subject);
  return {
    year: q.year,
    exam_type: 'prelims',
    paper: paperFor(q.year),
    question_no: q.question_no,
    question: q.question,
    options: q.options,
    answer: (q.answer || '').toLowerCase(),
    explanation: q.explanation || null,
    subject,
    topic: (q.sub_topic || subject).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    difficulty: q.difficulty || null,
    tags: [],                       // populated by tagger
    source: 'unlockias',
    source_url: `https://www.unlockias.in/upsc-prelims-pyq/${q.year}`,
    question_id_external: q.question_id,
    sub_topic_raw: q.sub_topic || null,
  };
}

async function loadYear(year) {
  const file = `${HARVEST_DIR}/${year}.json`;
  const harvest = JSON.parse(readFileSync(file, 'utf8'));
  const rows = harvest.questions.map(rowFromHarvest);

  // Drop any row that fails the v2 NOT NULL / CHECK constraints client-side
  // so the upsert doesn't blow up the whole batch.
  const valid = rows.filter(r =>
    r.year && r.question_no && r.question?.length > 10 &&
    r.options?.a && r.options?.b && r.options?.c && r.options?.d &&
    ['a','b','c','d'].includes(r.answer)
  );
  const dropped = rows.length - valid.length;

  // Upsert in 100-row batches
  for (let i = 0; i < valid.length; i += 100) {
    const batch = valid.slice(i, i + 100);
    const { error } = await sb
      .from('upsc_pyqs_v2')
      .upsert(batch, { onConflict: 'question_id_external' });
    if (error) throw new Error(`year=${year} batch starting at ${i}: ${error.message}`);
  }

  console.log(`[${year}] loaded ${valid.length} rows (${dropped} dropped client-side)`);
  return { loaded: valid.length, dropped };
}

const yearFiles = readdirSync(HARVEST_DIR)
  .filter(f => /^\d{4}\.json$/.test(f))
  .map(f => parseInt(f.split('.')[0], 10))
  .sort((a, b) => a - b);

let totalLoaded = 0, totalDropped = 0;
for (const year of yearFiles) {
  if (!force && state.completedYears.includes(year)) {
    console.log(`[${year}] already loaded — skip (--force to reload)`);
    continue;
  }
  const r = await loadYear(year);
  totalLoaded += r.loaded;
  totalDropped += r.dropped;
  state.completedYears = [...new Set([...state.completedYears, year])].sort();
  state.totalLoaded = totalLoaded;
  state.unmappedSubjects = [...unmapped];
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

console.log(`\nDONE. Loaded ${totalLoaded} rows total. Dropped ${totalDropped} for schema constraint violations.`);
if (unmapped.size) {
  console.log(`\nWARNING: ${unmapped.size} unmapped subject strings encountered:`);
  for (const s of unmapped) console.log(`  - "${s}"`);
  console.log('Add these to SUBJECT_MAP in scripts/normalize-subject.mjs and re-run with --force.');
}

// Final count from DB
const { count } = await sb.from('upsc_pyqs_v2').select('*', { count: 'exact', head: true });
console.log(`\nupsc_pyqs_v2 row count: ${count}`);
```

- [ ] **Step 3: Run the loader**

Run: `cd ~/Documents/UPSCMapAI && node scripts/load-v2.mjs`

Expected stdout ends with:
```
DONE. Loaded ~3886 rows total. Dropped ~0 for schema constraint violations.

upsc_pyqs_v2 row count: ~3886
```

If `unmapped subject strings` warnings appear, they're listed at the end. Add each to `SUBJECT_MAP`, re-run `npx vitest run tests/normalize-subject.test.mjs`, then re-run `node scripts/load-v2.mjs --force`.

If client-side drops are >20, inspect the harvest for those years — likely the same edge cases (matching questions, non-MCQ format) we saw in pre-2011. Document them and continue.

- [ ] **Step 4: Sanity-check the loaded data**

Run:
```bash
node -e "
import('@supabase/supabase-js').then(async ({createClient}) => {
  const fs = await import('node:fs');
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('upsc_pyqs_v2').select('year, subject, paper, answer').limit(5000);
  const by = (k) => data.reduce((a, r) => (a[r[k]] = (a[r[k]]||0) + 1, a), {});
  console.log('by year:', Object.keys(by('year')).length, 'distinct');
  console.log('by subject:', by('subject'));
  console.log('by paper:', by('paper'));
  console.log('answer dist:', by('answer'));
});
"
```

Expected:
- ~31 distinct years
- subjects roughly: `polity`, `economy`, `geography`, `environment`, `history`, `art_culture`, `science`, `ir`, `current_affairs`
- paper: `general` (~2386) and `gs1` (~1500)
- answer distribution: roughly 25% each for a, b, c, d (well-balanced)

- [ ] **Step 5: Commit**

```bash
git add scripts/load-v2.mjs data/pyqs/unlockias/_v2-load-state.json
git commit -m "feat(pyqs-v2): load 3886 UnlockIAS questions into upsc_pyqs_v2"
```

---

## Task 4: Tagging candidates builder (TDD)

**Files:**
- Create: `scripts/build-tagging-candidates.mjs`
- Create: `tests/build-tagging-candidates.test.mjs`

- [ ] **Step 1: Read the existing topic-keyword map structure**

Run: `head -40 data/topic-keyword-map.ts`
Take note of the `TopicKeywordEntry` type: `{ dbSubjects: string[], keywords: string[] }`. The keys of `TOPIC_KEYWORD_MAP` are topic IDs.

- [ ] **Step 2: Write the failing test**

```js
// tests/build-tagging-candidates.test.mjs
import { describe, it, expect } from 'vitest';
import { buildCandidates } from '../scripts/build-tagging-candidates.mjs';

describe('buildCandidates', () => {
  it('returns candidates for a known subject', () => {
    const cands = buildCandidates('polity');
    expect(Array.isArray(cands)).toBe(true);
    expect(cands.length).toBeGreaterThan(5);
    expect(cands.length).toBeLessThan(120);  // pre-filter must narrow the 524 universe
    for (const c of cands) {
      expect(c).toEqual(expect.objectContaining({
        topicId: expect.any(String),
        title: expect.any(String),
        keywords: expect.any(Array),
      }));
    }
  });

  it('returns smaller-but-nonempty list for niche subjects', () => {
    const cands = buildCandidates('environment');
    expect(cands.length).toBeGreaterThan(0);
  });

  it('falls back to ALL topics for unknown subject', () => {
    const cands = buildCandidates('general');
    expect(cands.length).toBeGreaterThan(100);  // wide net
  });

  it('every topicId actually exists in syllabus', async () => {
    const { UPSC_SYLLABUS } = await import('../data/syllabus.ts');
    const syllabusIds = new Set();
    for (const subj of UPSC_SYLLABUS)
      for (const unit of subj.units)
        for (const t of unit.topics) syllabusIds.add(t.id);
    const cands = buildCandidates('history');
    for (const c of cands) expect(syllabusIds.has(c.topicId)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/Documents/UPSCMapAI && npx vitest run tests/build-tagging-candidates.test.mjs`
Expected: FAIL with module-not-found.

- [ ] **Step 4: Implement the candidate builder**

```js
// scripts/build-tagging-candidates.mjs
//
// Given an UnlockIAS subject (already normalized to canonical short codes),
// return the slice of TOPIC_KEYWORD_MAP whose dbSubjects overlap with that
// subject. Used to narrow the Groq prompt from 524 candidates to ~20-40.
//
// Importing TypeScript files from .mjs requires a runtime that handles .ts —
// we use tsx via `npx tsx` when running the tagger, OR compile the data
// modules to JSON ahead of time. To keep this dependency-free, we read the
// .ts files via a tiny string-parsing fallback.

import { readFileSync } from 'node:fs';

// Crude but sufficient TS extractor: pull the literal object keys + dbSubjects
// from data/topic-keyword-map.ts. The file format is rigidly hand-maintained
// so a regex parser is fine.
function loadTopicKeywordMap() {
  const src = readFileSync('data/topic-keyword-map.ts', 'utf8');
  const entries = {};
  const blockRe = /'([a-z0-9-]+)'\s*:\s*\{([^}]*)\}/g;
  for (const m of src.matchAll(blockRe)) {
    const id = m[1];
    const body = m[2];
    const subs = [...body.matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
    // First quoted strings up until 'keywords:' are dbSubjects.
    const kwIdx = body.indexOf('keywords');
    let dbSubjects = subs;
    let keywords = [];
    if (kwIdx > 0) {
      const before = body.slice(0, kwIdx);
      const after = body.slice(kwIdx);
      dbSubjects = [...before.matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
      keywords = [...after.matchAll(/'([^']+)'/g)].map(x => x[1]);
    }
    entries[id] = { dbSubjects, keywords };
  }
  return entries;
}

function loadSyllabusTitles() {
  const src = readFileSync('data/syllabus.ts', 'utf8');
  const titles = {};
  // Match `id: 'foo-bar', ... title: 'Foo Bar Title'` within each topic block.
  const re = /id:\s*'([a-z0-9-]+)'[\s\S]{0,200}?title:\s*'([^']+)'/g;
  for (const m of src.matchAll(re)) titles[m[1]] = m[2];
  return titles;
}

const TOPIC_MAP = loadTopicKeywordMap();
const TITLES = loadSyllabusTitles();

export function buildCandidates(canonicalSubject) {
  const all = Object.entries(TOPIC_MAP).map(([topicId, e]) => ({
    topicId,
    title: TITLES[topicId] || topicId,
    keywords: e.keywords || [],
    dbSubjects: e.dbSubjects || [],
  }));
  // Always-include subjects: 'general', 'current_affairs' get the wide net.
  if (!canonicalSubject || canonicalSubject === 'general') return all;
  const filtered = all.filter(c => c.dbSubjects.includes(canonicalSubject));
  return filtered.length > 0 ? filtered : all;  // fallback if pre-filter empty
}

export function syllabusTopicIds() {
  return new Set(Object.keys(TOPIC_MAP));
}
```

- [ ] **Step 5: Run tests — should pass**

Run: `cd ~/Documents/UPSCMapAI && npx vitest run tests/build-tagging-candidates.test.mjs`

If the syllabus-import test fails because Vitest can't load `.ts` directly, change the test to use a parsed list from `loadSyllabusTitles` via `syllabusTopicIds()` instead of importing `syllabus.ts`. Re-run.

Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-tagging-candidates.mjs tests/build-tagging-candidates.test.mjs
git commit -m "feat(pyqs-v2): subject-pre-filter for Groq tagging candidates"
```

---

## Task 5: Groq tagger script

**Files:**
- Create: `scripts/tag-v2-with-groq.mjs`
- Create: `data/v2-tagging-failures.jsonl` (touched empty)

- [ ] **Step 1: Touch the failures log**

```bash
cd ~/Documents/UPSCMapAI && : > data/v2-tagging-failures.jsonl
```

- [ ] **Step 2: Write the tagger**

```js
// scripts/tag-v2-with-groq.mjs
//
// Tags untagged rows in upsc_pyqs_v2 with topic:{id} entries via Groq
// llama-3.3-70b-versatile. Batches of 5, concurrency 4, 429-aware retry.
//
// Run: node scripts/tag-v2-with-groq.mjs                # tag everything not yet tagged
//      node scripts/tag-v2-with-groq.mjs --limit 50     # tag only 50 rows (smoke test)
//      node scripts/tag-v2-with-groq.mjs --retag-empty  # re-tag rows that ended up with []

import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync } from 'node:fs';
import Groq from 'groq-sdk';
import { buildCandidates, syllabusTopicIds } from './build-tagging-candidates.mjs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';
const BATCH = 5;
const CONCURRENCY = 4;
const FAIL_LOG = 'data/v2-tagging-failures.jsonl';
const VALID_TOPIC_IDS = syllabusTopicIds();

const args = process.argv.slice(2);
const limit = (() => {
  const i = args.indexOf('--limit');
  return i >= 0 ? parseInt(args[i + 1], 10) : null;
})();
const retagEmpty = args.includes('--retag-empty');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Parse Groq's "Please try again in 5.6s" format.
function backoffFromError(msg) {
  const m = msg && msg.match(/try again in ([\d.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 3000;
}

function buildPrompt(rows) {
  // All rows in a batch share a subject (we group by subject upstream).
  const subject = rows[0].subject;
  const cands = buildCandidates(subject).slice(0, 60); // hard cap to keep prompt small
  const candList = cands.map(c => `- ${c.topicId} — ${c.title}`).join('\n');
  const qList = rows.map((r, i) => {
    const opts = ['a','b','c','d'].map(k => `(${k}) ${r.options[k]}`).join('\n    ');
    return `[${i + 1}] ${r.question}\n    ${opts}`;
  }).join('\n\n');

  return `You are a UPSC Civil Services syllabus classifier.

For each question below, return the 1 to 3 most relevant topic IDs from the
candidate list. Only use IDs that appear in the candidates — never invent new ones.

CANDIDATE TOPICS (only these are valid):
${candList}

QUESTIONS:
${qList}

Respond with strict JSON only, no prose, no markdown fences:
{"results":[{"q":1,"topics":["topic-id-here"],"confidence":0.9}, ...]}`;
}

async function tagBatch(rows, attempt = 1) {
  const prompt = buildPrompt(rows);
  let resp;
  try {
    resp = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (attempt < 4 && /429|rate.?limit|try again/i.test(msg)) {
      const wait = backoffFromError(msg);
      console.log(`  groq 429 — sleeping ${wait}ms (attempt ${attempt})`);
      await sleep(wait);
      return tagBatch(rows, attempt + 1);
    }
    throw new Error(`groq call failed: ${msg}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(resp.choices[0].message.content);
  } catch {
    throw new Error('groq returned non-JSON: ' + resp.choices[0].message.content.slice(0, 200));
  }

  // Validate + assign tags back to rows
  const results = parsed.results || [];
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = results.find(x => x.q === i + 1);
    const valid = (r?.topics || []).filter(t => VALID_TOPIC_IDS.has(t)).slice(0, 3);
    out.push({
      id: rows[i].id,
      tags: valid.map(t => `topic:${t}`),
      confidence: { method: 'groq', model: MODEL, score: r?.confidence ?? null, raw_topics: r?.topics || [] },
    });
  }
  return out;
}

async function writeBack(rowResults) {
  for (const r of rowResults) {
    if (r.tags.length === 0) {
      appendFileSync(FAIL_LOG, JSON.stringify({ id: r.id, reason: 'no valid topics returned', raw: r.confidence.raw_topics }) + '\n');
      continue;
    }
    const { error } = await sb
      .from('upsc_pyqs_v2')
      .update({ tags: r.tags, confidence: r.confidence })
      .eq('id', r.id);
    if (error) {
      appendFileSync(FAIL_LOG, JSON.stringify({ id: r.id, reason: 'db update error: ' + error.message }) + '\n');
    }
  }
}

// Pull untagged rows
async function pullUntagged() {
  const filter = retagEmpty
    ? sb.from('upsc_pyqs_v2').select('id, subject, question, options').eq('tags', '{}')
    : sb.from('upsc_pyqs_v2').select('id, subject, question, options').or('tags.is.null,tags.eq.{}');
  let q = filter;
  if (limit) q = q.limit(limit);
  else q = q.limit(5000);  // tagger handles up to 5k per run; re-run for more
  const { data, error } = await q;
  if (error) throw new Error('pull untagged: ' + error.message);
  return data || [];
}

const rows = await pullUntagged();
console.log(`Untagged rows to process: ${rows.length}`);

// Group by subject so each batch shares the same candidate list
const bySubject = new Map();
for (const r of rows) {
  if (!bySubject.has(r.subject)) bySubject.set(r.subject, []);
  bySubject.get(r.subject).push(r);
}

let processed = 0, tagged = 0, failed = 0;
for (const [subject, subjectRows] of bySubject) {
  console.log(`\n[subject=${subject}] ${subjectRows.length} rows`);
  // Chunk into batches of BATCH
  const batches = [];
  for (let i = 0; i < subjectRows.length; i += BATCH) batches.push(subjectRows.slice(i, i + BATCH));

  // Process with limited concurrency
  let idx = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (idx < batches.length) {
      const my = batches[idx++];
      try {
        const results = await tagBatch(my);
        await writeBack(results);
        for (const r of results) (r.tags.length ? tagged++ : failed++);
        processed += my.length;
        if (processed % 25 === 0) console.log(`  progress: ${processed}/${rows.length} (${tagged} tagged, ${failed} failed)`);
      } catch (e) {
        for (const r of my) appendFileSync(FAIL_LOG, JSON.stringify({ id: r.id, reason: 'batch error: ' + e.message }) + '\n');
        failed += my.length;
        processed += my.length;
      }
      await sleep(300); // be polite
    }
  }));
}

console.log(`\nDONE. Processed ${processed}, tagged ${tagged}, failed ${failed}.`);
console.log(`Failures (if any) logged to ${FAIL_LOG}`);
```

- [ ] **Step 3: Smoke-test on 10 rows first**

Run: `cd ~/Documents/UPSCMapAI && node scripts/tag-v2-with-groq.mjs --limit 10`

Expected: prints `Untagged rows to process: 10`, then `DONE. Processed 10, tagged ~10, failed ~0.`

Verify the smoke result:
```bash
node -e "
import('@supabase/supabase-js').then(async ({createClient}) => {
  const fs = await import('node:fs');
  for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('upsc_pyqs_v2').select('id, question, tags, confidence').neq('tags', '{}').limit(5);
  for (const r of data) console.log(r.id, r.tags, '|', r.question.slice(0,80));
});
"
```
Expected: 5 rows, each showing `topic:something` tags and a snippet of the question. Eyeball that the tags look plausible.

If they look wrong (e.g. all rows tagged with the same generic topic), fix the prompt before scaling up.

- [ ] **Step 4: Run the full tagging pass**

Run: `cd ~/Documents/UPSCMapAI && node scripts/tag-v2-with-groq.mjs 2>&1 | tee /tmp/tag-v2.log`

Expected: ~25-40 minutes runtime. Progress lines every 25 rows. Final line: `DONE. Processed ~3876, tagged ~3500+, failed ~50-300.`

If the run dies mid-way (Groq quota, network), just re-run — the script auto-resumes by selecting only `tags = '{}' OR tags IS NULL`.

- [ ] **Step 5: Re-run on rows that ended up empty**

Some rows may have empty `tags` because Groq returned IDs that didn't exist in the syllabus. Re-run with the explicit retag flag:

Run: `node scripts/tag-v2-with-groq.mjs --retag-empty`

Expected: catches ~50% of the failed batch on the second pass with a slightly different sampling. Whatever's still empty after this is logged in `data/v2-tagging-failures.jsonl` and stays empty (those questions remain queryable by year/text but won't surface under any journey topic — acceptable for v1).

- [ ] **Step 6: Commit**

```bash
git add scripts/tag-v2-with-groq.mjs data/v2-tagging-failures.jsonl
git commit -m "feat(pyqs-v2): tag corpus with Groq llama-3.3-70b syllabus classifier"
```

---

## Task 6: Coverage report

**Files:**
- Create: `scripts/coverage-report-v2.mjs`

- [ ] **Step 1: Write the script**

```js
// scripts/coverage-report-v2.mjs
//
// For every topic ID in the syllabus, count how many upsc_pyqs_v2 rows are
// tagged with topic:{id}. Highlights uncovered topics so we know where the
// AI fallback in app/api/journey/pyqs/route.ts will kick in.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { syllabusTopicIds } from './build-tagging-candidates.mjs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

// Pull all rows' tags (lightweight column)
const all = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('upsc_pyqs_v2').select('id, tags').range(from, from + 999);
  if (error) throw new Error(error.message);
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}

const counts = {};
let untagged = 0;
for (const r of all) {
  if (!r.tags?.length) { untagged++; continue; }
  for (const t of r.tags) {
    if (t.startsWith('topic:')) {
      const id = t.slice(6);
      counts[id] = (counts[id] || 0) + 1;
    }
  }
}

const syllabusIds = syllabusTopicIds();
const uncovered = [...syllabusIds].filter(id => !counts[id]);

console.log(`Total rows:           ${all.length}`);
console.log(`Untagged (empty):     ${untagged}`);
console.log(`Tagged rows:          ${all.length - untagged}`);
console.log(`Distinct topics hit:  ${Object.keys(counts).length} / ${syllabusIds.size}`);
console.log(`Uncovered topics:     ${uncovered.length}`);

console.log('\nTop 20 most-covered topics:');
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [id, n] of top) console.log(`  ${n.toString().padStart(4)}  ${id}`);

console.log('\nFirst 30 uncovered topics:');
for (const id of uncovered.slice(0, 30)) console.log(`  ${id}`);
```

- [ ] **Step 2: Run it**

Run: `cd ~/Documents/UPSCMapAI && node scripts/coverage-report-v2.mjs`

Expected:
- `Total rows: ~3886`
- `Untagged (empty): <100`
- `Distinct topics hit: 100-300` (we don't expect to cover all 524 — many syllabus topics are too narrow for any single PYQ to match)
- A list of the 20 most popular topics + 30 uncovered ones for sanity-checking

If `Untagged > 200`, there's a tagging quality problem — go back to Task 5 and re-run the tagger with prompt tweaks.

- [ ] **Step 3: Commit**

```bash
git add scripts/coverage-report-v2.mjs
git commit -m "feat(pyqs-v2): coverage report for syllabus topic tagging"
```

---

## Task 7: Audit script — manual quality gate

**Files:**
- Create: `scripts/audit-tagging.mjs`

- [ ] **Step 1: Write the audit script**

```js
// scripts/audit-tagging.mjs
//
// Picks 50 random tagged rows from upsc_pyqs_v2, prints each with its assigned
// tags + the syllabus titles for those tags. Operator marks each y/n; the
// script prints final accuracy.
//
// Run: node scripts/audit-tagging.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

// Load syllabus titles via the same crude regex parser used by build-tagging-candidates
function loadTitles() {
  const src = readFileSync('data/syllabus.ts', 'utf8');
  const titles = {};
  const re = /id:\s*'([a-z0-9-]+)'[\s\S]{0,200}?title:\s*'([^']+)'/g;
  for (const m of src.matchAll(re)) titles[m[1]] = m[2];
  return titles;
}
const TITLES = loadTitles();

// Pull a random sample of tagged rows. Postgres `order by random()` is
// expensive — instead, pull a wider window then sample client-side.
const { data: pool } = await sb
  .from('upsc_pyqs_v2')
  .select('id, year, question, options, answer, tags')
  .neq('tags', '{}')
  .limit(2000);

if (!pool?.length) {
  console.error('No tagged rows found — run scripts/tag-v2-with-groq.mjs first');
  process.exit(1);
}

const sample = [...pool].sort(() => Math.random() - 0.5).slice(0, 50);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

let yes = 0, no = 0, skipped = 0;
for (let i = 0; i < sample.length; i++) {
  const r = sample[i];
  console.log('\n────────────────────────────────────────');
  console.log(`[${i + 1}/50] id=${r.id} year=${r.year}`);
  console.log(r.question);
  for (const k of ['a','b','c','d']) console.log(`  (${k}) ${r.options[k]}`);
  console.log(`  → answer: ${r.answer}`);
  console.log(`  → tags: ${r.tags.map(t => {
    const id = t.replace(/^topic:/, '');
    return `${t} (${TITLES[id] || '?'})`;
  }).join(', ')}`);
  const ans = (await ask('  Are these tags reasonable? [y/n/s=skip] ')).trim().toLowerCase();
  if (ans === 'y') yes++;
  else if (ans === 'n') no++;
  else skipped++;
}
rl.close();

const judged = yes + no;
const acc = judged ? (100 * yes / judged).toFixed(1) : '0';
console.log(`\nAudit complete: ${yes} yes / ${no} no / ${skipped} skipped`);
console.log(`Accuracy: ${acc}% (target: ≥90%)`);
if (judged && yes / judged >= 0.9) console.log('✓ PASS — proceed with cutover');
else console.log('✗ FAIL — refine prompt and re-run scripts/tag-v2-with-groq.mjs --retag-empty (after wiping tags)');
```

- [ ] **Step 2: Run the audit interactively**

Run: `cd ~/Documents/UPSCMapAI && node scripts/audit-tagging.mjs`

For each of the 50 questions, read the question + answer + assigned tags, decide if the topic assignments are reasonable, type `y`, `n`, or `s`. Aim for ≥90% yes.

- [ ] **Step 3: Decision gate**

If accuracy ≥90%, proceed to Task 8 (cutover).

If accuracy <90%:
1. Note the patterns in failures (e.g. "history questions are getting tagged with random art_culture topics").
2. Refine the prompt in `scripts/tag-v2-with-groq.mjs:buildPrompt()` — add an instruction line that addresses the specific failure pattern.
3. Wipe the tags column for the affected rows and re-run the tagger:
   ```bash
   node -e "
   import('@supabase/supabase-js').then(async ({createClient}) => {
     const fs = await import('node:fs');
     for (const line of fs.readFileSync('.env.local','utf8').split('\n')) {
       const m = line.match(/^([A-Z_]+)=(.+)$/);
       if (m) process.env[m[1]] = m[2].trim();
     }
     const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
     const { error } = await sb.from('upsc_pyqs_v2').update({tags: [], confidence: null}).neq('id', 0);
     console.log(error ? error.message : 'wiped all tags');
   });
   "
   ```
4. Re-run `node scripts/tag-v2-with-groq.mjs`.
5. Re-run audit.

- [ ] **Step 4: Commit**

```bash
git add scripts/audit-tagging.mjs
git commit -m "feat(pyqs-v2): interactive tagging audit script"
```

---

## Task 8: API cutover

**Files:**
- Modify: `app/api/journey/pyqs/route.ts:387` and `app/api/journey/pyqs/route.ts:613`
- Modify: `app/api/journey/pyq-counts/route.ts:18` and `app/api/journey/pyq-counts/route.ts:66`

- [ ] **Step 1: Read the existing route to find the exact lines**

Run: `grep -n "from('upsc_pyqs')" app/api/journey/pyqs/route.ts app/api/journey/pyq-counts/route.ts`

Expected output:
```
app/api/journey/pyqs/route.ts:387:    .from('upsc_pyqs')
app/api/journey/pyqs/route.ts:613:        .from('upsc_pyqs')
app/api/journey/pyq-counts/route.ts:18:        .from('upsc_pyqs')
app/api/journey/pyq-counts/route.ts:66:        .from('upsc_pyqs')
```

- [ ] **Step 2: Add a single PYQ_TABLE constant near the top of `app/api/journey/pyqs/route.ts`**

Use the Edit tool. Find the imports block at the top of the file and add right after the imports (before the first function or `export`):

```ts
const PYQ_TABLE = process.env.PYQ_TABLE || 'upsc_pyqs';
```

- [ ] **Step 3: Replace both `.from('upsc_pyqs')` in pyqs/route.ts**

Use Edit with `replace_all: true`:

old: `.from('upsc_pyqs')`
new: `.from(PYQ_TABLE)`

That's 2 occurrences in this file.

- [ ] **Step 4: Same change in `app/api/journey/pyq-counts/route.ts`**

Add at top after imports:
```ts
const PYQ_TABLE = process.env.PYQ_TABLE || 'upsc_pyqs';
```

Then `.from('upsc_pyqs')` → `.from(PYQ_TABLE)` with `replace_all: true`. 2 occurrences.

- [ ] **Step 5: Type-check the changes**

Run: `cd ~/Documents/UPSCMapAI && npx tsc --noEmit 2>&1 | grep -E 'pyqs/route|pyq-counts/route' | head -20`

Expected: no output (no type errors in those files).

- [ ] **Step 6: Smoke-test locally with v1 (default) — must not regress**

Set the env explicitly to v1 to confirm fallback works:
```bash
PYQ_TABLE=upsc_pyqs npm run dev
```
In another terminal:
```bash
curl -s 'http://localhost:3000/api/journey/pyqs?subject=ancient-history&topic=vedic-age&limit=3' | head -c 500
```
Expected: JSON array with up to 3 questions (or empty array — that's fine if vedic-age has no v1 hits, just confirms the route works).

Stop the dev server (Ctrl+C).

- [ ] **Step 7: Smoke-test with v2**

```bash
PYQ_TABLE=upsc_pyqs_v2 npm run dev
```
Same curl. Expected: returns v2-shaped questions with `source: "unlockias"` and full explanations. If empty, it means v2 has no rows tagged with `topic:vedic-age` — try a different topic from the coverage report's "top 20 most-covered" list.

Stop the dev server.

- [ ] **Step 8: Browser smoke test**

```bash
PYQ_TABLE=upsc_pyqs_v2 npm run dev
```

Open `http://localhost:3000` in a browser. Navigate to a topic from the coverage report's top-20 list (e.g. polity → constitution-of-india or whichever was the top hit). Tap the topic, click Practice. Verify:
1. A question loads and renders cleanly.
2. All four options are full sentences (not fragments).
3. Selecting an answer reveals the correct one.
4. The explanation text appears under the answer reveal.
5. The year tag shows correctly.
6. Difficulty badge renders.

If anything is broken in the UI, capture a screenshot, file a follow-up task in this plan, and DO NOT mark Task 8 complete.

- [ ] **Step 9: Commit**

```bash
git add app/api/journey/pyqs/route.ts app/api/journey/pyq-counts/route.ts
git commit -m "feat(pyqs-v2): wrap PYQ table reads in PYQ_TABLE env var (cutover hook)"
```

---

## Task 9: Production rollout

**Files:** none — config only.

- [ ] **Step 1: Push the cutover code**

```bash
git push origin main
```

Wait for Vercel to build. Confirm green build in the dashboard.

At this point production is still serving from `upsc_pyqs` because `PYQ_TABLE` isn't set on Vercel.

- [ ] **Step 2: Set the env var on Vercel**

Vercel dashboard → Settings → Environment Variables → Add:
- Name: `PYQ_TABLE`
- Value: `upsc_pyqs_v2`
- Environment: Production (also Preview if you want it on staging URLs)

- [ ] **Step 3: Redeploy production**

In Vercel dashboard, go to Deployments → click the latest production deployment → Redeploy. Or push an empty commit:
```bash
git commit --allow-empty -m "chore: trigger redeploy with PYQ_TABLE=upsc_pyqs_v2"
git push
```

- [ ] **Step 4: Verify in prod**

Open the production URL. Navigate to a known-good topic. Confirm clean questions render.

Quick API check:
```bash
curl -s 'https://YOUR-PROD-URL/api/journey/pyqs?subject=ancient-history&topic=mauryan-empire&limit=2' | python3 -m json.tool | head -50
```
Expected: questions with `source: "unlockias"` and explanation text.

- [ ] **Step 5: Tag the release**

```bash
git tag -a pyqs-v2-cutover -m "UnlockIAS PYQ corpus is now the primary journey source"
git push --tags
```

- [ ] **Step 6: Rollback rehearsal (don't actually do it, but document the steps)**

In the commit message OR in `docs/superpowers/specs/2026-04-12-upsc-pyqs-v2-design.md`, append a "Rollback procedure" note:
1. Vercel → Settings → Env Vars → delete `PYQ_TABLE` (or set to `upsc_pyqs`).
2. Vercel → Deployments → Redeploy.
3. Verify with the same curl, expecting v1 rows.
4. Total time: ~30-60 seconds.

---

## Self-Review

**Spec coverage:**
- ✅ "New table that's drop-in compatible" → Task 1 schema, Task 8 env var
- ✅ "Loaded from harvest JSON" → Task 3 loader
- ✅ "Tagged via Groq llama-3.3-70b" → Task 5 tagger
- ✅ "Subject pre-filter narrows 524 → 20-40 candidates" → Task 4 builder + Task 5 prompt
- ✅ "≥90% audit accuracy quality gate" → Task 7 audit script + decision gate
- ✅ "Single env var cutover, instant rollback" → Task 8 + Task 9
- ✅ "Smoke test the journey UI" → Task 8 Step 8
- ✅ "Coverage report for gap visibility" → Task 6
- ✅ "Idempotent re-runs" → Task 3 uses `question_id_external` UNIQUE; Task 5 selects only `tags = '{}'`
- ✅ "Failed-tagging log" → Task 5 writes `data/v2-tagging-failures.jsonl`

**Placeholder scan:** None. All steps have exact code blocks, exact commands, and exact expected outputs. No "TBD", no "implement later", no "similar to Task N".

**Type / name consistency:**
- `normalizeSubject(raw)` exported from `scripts/normalize-subject.mjs` (Task 2), imported by `scripts/load-v2.mjs` (Task 3) ✓
- `buildCandidates(canonicalSubject)` and `syllabusTopicIds()` exported from `scripts/build-tagging-candidates.mjs` (Task 4), imported by `scripts/tag-v2-with-groq.mjs` (Task 5) and `scripts/coverage-report-v2.mjs` (Task 6) ✓
- Schema column names (`question_id_external`, `sub_topic_raw`, `confidence`, `tags`) match between Task 1 SQL, Task 3 loader, and Task 5 tagger writes ✓
- `PYQ_TABLE` env var name is identical in Task 8 Step 2/4 + Task 9 Step 2 ✓
- Failure log path `data/v2-tagging-failures.jsonl` matches between Task 5 file creation, Task 5 appendFileSync, and the spec's `data/v2-tagging-failures.jsonl` reference ✓

**Risks called out from spec, mapped to mitigations:**
- Groq accuracy <90% → Task 7 Step 3 has the explicit decision gate + retag procedure
- Topic with zero hits → Task 6 coverage report + spec's note that the API's existing AI fallback handles empty topics
- Schema drift → Task 8 Step 5 type-check + Step 6/7 dual smoke-test of v1 and v2
- Env var typo → Task 9 Step 4 explicit prod verify with curl
- User progress reset → documented in spec; not a code task

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-12-upsc-pyqs-v2-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for the iterative parts (Task 5 prompt tuning, Task 7 audit failures, Task 8 UI smoke test).

2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batched with checkpoints. Faster end-to-end if everything works first try, but my context fills up during the 25-minute Groq tagging run in Task 5.

**Hard dependencies before either approach:**
- Supabase service-role key in `.env.local` (verify in Task 0 Step 2)
- Groq API key in `.env.local` (verify in Task 0 Step 3)
- `set_updated_at()` function exists in the DB (Task 1 Step 2 has the fallback)

**Which approach do you want?**
