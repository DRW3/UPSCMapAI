import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { syllabusTopicIds } from './build-tagging-candidates.mjs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

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
