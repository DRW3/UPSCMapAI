import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { normalizeSubject } from './normalize-subject.mjs';

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
    tags: [],
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

  const valid = rows.filter(r =>
    r.year && r.question_no && r.question?.length > 10 &&
    r.options?.a && r.options?.b && r.options?.c && r.options?.d &&
    ['a','b','c','d'].includes(r.answer)
  );
  const dropped = rows.length - valid.length;

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

const { count } = await sb.from('upsc_pyqs_v2').select('*', { count: 'exact', head: true });
console.log(`\nupsc_pyqs_v2 row count: ${count}`);
