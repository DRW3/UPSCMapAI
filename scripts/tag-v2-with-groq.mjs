import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync } from 'node:fs';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
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
const nvidia = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

const USE_GROQ = process.argv.includes('--groq');
const MODEL = USE_GROQ ? 'llama-3.3-70b-versatile' : 'meta/llama-3.1-70b-instruct';
const BATCH = 10;
const CONCURRENCY = 3;
const FAIL_LOG = 'data/v2-tagging-failures.jsonl';
const VALID_TOPIC_IDS = syllabusTopicIds();

const args = process.argv.slice(2);
const limit = (() => {
  const i = args.indexOf('--limit');
  return i >= 0 ? parseInt(args[i + 1], 10) : null;
})();
const retagEmpty = args.includes('--retag-empty');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function backoffFromError(msg, attempt) {
  const m = msg && msg.match(/try again in ([\d.]+)s/i);
  const base = m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 5000;
  return Math.min(base * Math.pow(1.5, attempt - 1), 60000);
}

const SUBJECT_EXAMPLES = {
  history: `EXAMPLES:
Q: "Revolutionary terrorists in Northern India" → ["revolutionary-movements"]
Q: "Zero was invented by" → ["ancient-literature-science"]
Q: "Gandhiji's Dandi March" → ["gandhian-era"]`,

  science: `EXAMPLES:
Q: "Element alloyed with iron for stainless steel" → ["general-chemistry"]
Q: "Cobalt-60 in radiation therapy" → ["nuclear-technology","general-physics"]
Q: "ISRO Mars Orbiter Mission" → ["isro-space"]`,

  art_culture: `EXAMPLES:
Q: "Temple associated with Devadasis" → ["temple-architecture"]
Q: "Bharatanatyam originated in" → ["classical-arts"]
Q: "Ajanta caves are famous for" → ["buddhist-jain-architecture","painting-traditions"]`,

  geography: `EXAMPLES:
Q: "50% of world population between latitudes" → ["world-population"]
Q: "Deccan Plateau is bounded by" → ["deccan-plateau"]
Q: "Black soil is best for growing" → ["soils-vegetation","agriculture-geo"]`,

  economy: `EXAMPLES:
Q: "White goods industry refers to" → ["msme-industry"]
Q: "Monetary policy formulated by" → ["fiscal-monetary"]
Q: "GDP at factor cost" → ["national-income"]`,

  environment: `EXAMPLES:
Q: "Water pollution measured by dissolved amount of" → ["pollution"]
Q: "Western Ghats biodiversity hotspot" → ["biodiversity-conservation"]
Q: "Ramsar Convention relates to" → ["wetlands-coastal","international-agreements"]`,

  polity: `EXAMPLES:
Q: "Parliament exercises control over administration" → ["parliament"]
Q: "Preamble of Indian Constitution" → ["preamble"]
Q: "Article 356 deals with" → ["emergency-provisions"]`,

  ir: `EXAMPLES:
Q: "Chabahar Port important for India" → ["india-central-west-asia","india-foreign-policy"]
Q: "UN Security Council permanent members" → ["multilateral-bodies"]
Q: "Non-Aligned Movement co-founded by" → ["foreign-policy-nam"]`,

  current_affairs: `EXAMPLES:
Q: "Border dispute India-China" → ["indo-china-1962","india-neighborhood"]
Q: "New pharma product launch" → ["health-diseases"]
Note: Match to most specific syllabus topic available.`,
};

function buildPrompt(rows) {
  const subject = rows[0].subject;
  const cands = buildCandidates(subject).slice(0, 60);
  const candList = cands.map(c => `- ${c.topicId} — ${c.title}`).join('\n');
  const qList = rows.map((r, i) => {
    const opts = ['a','b','c','d'].map(k => `(${k}) ${r.options[k]}`).join('\n    ');
    return `[${i + 1}] ${r.question}\n    ${opts}`;
  }).join('\n\n');

  const examples = SUBJECT_EXAMPLES[subject] || SUBJECT_EXAMPLES['current_affairs'];

  return `You are a UPSC Civil Services syllabus classifier. You MUST classify every question.

For each question below, return the 1 to 3 most relevant topic IDs from the
candidate list. Only use IDs that appear in the candidates — never invent new ones.
If unsure, pick the closest matching topic — never return empty topics.

${examples}

CANDIDATE TOPICS (only these are valid):
${candList}

QUESTIONS:
${qList}

Respond with strict JSON only, no prose, no markdown fences:
{"results":[{"q":1,"topics":["topic-id-here"],"confidence":0.9}, ...]}

IMPORTANT: You MUST return a result for EVERY question. Never skip a question. Always pick at least 1 topic.`;
}

async function tagBatch(rows, attempt = 1) {
  const prompt = buildPrompt(rows);
  let resp;
  try {
    const client = USE_GROQ ? groq : nvidia;
    const opts = {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
    };
    if (USE_GROQ) opts.response_format = { type: 'json_object' };
    resp = await client.chat.completions.create(opts);
  } catch (e) {
    const msg = e?.message || String(e);
    if (attempt < 8 && /429|rate.?limit|try again|too many/i.test(msg)) {
      const wait = backoffFromError(msg, attempt);
      console.log(`  429 — sleeping ${Math.round(wait/1000)}s (attempt ${attempt})`);
      await sleep(wait);
      return tagBatch(rows, attempt + 1);
    }
    throw new Error(`LLM call failed: ${msg}`);
  }

  const raw = resp.choices[0].message.content;
  let results;
  try {
    // NVIDIA may return {"results":[...]} OR a bare array [{q:1,...}, ...]
    const trimmed = raw.trim();
    const parsed = JSON.parse(trimmed.startsWith('[') ? trimmed : (trimmed.match(/\{[\s\S]*\}/) || [trimmed])[0]);
    if (Array.isArray(parsed)) {
      // Bare array of results
      results = parsed.flatMap(item => item.results ? item.results : [item]);
    } else {
      results = parsed.results || (parsed.q ? [parsed] : []);
    }
  } catch {
    throw new Error('LLM returned non-JSON: ' + raw.slice(0, 200));
  }
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = results.find(x => x.q === i + 1);
    const valid = (r?.topics || []).filter(t => VALID_TOPIC_IDS.has(t)).slice(0, 3);
    out.push({
      id: rows[i].id,
      tags: valid.map(t => `topic:${t}`),
      confidence: { method: USE_GROQ ? 'groq' : 'nvidia', model: MODEL, score: r?.confidence ?? null, raw_topics: r?.topics || [] },
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

async function pullUntagged() {
  const all = [];
  let from = 0;
  while (true) {
    let q = sb.from('upsc_pyqs_v2').select('id, subject, question, options');
    if (retagEmpty) q = q.eq('tags', '{}');
    else q = q.or('tags.is.null,tags.eq.{}');
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) throw new Error('pull untagged: ' + error.message);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
    if (limit && all.length >= limit) break;
  }
  return limit ? all.slice(0, limit) : all;
}

const rows = await pullUntagged();
console.log(`Untagged rows to process: ${rows.length}`);

const bySubject = new Map();
for (const r of rows) {
  if (!bySubject.has(r.subject)) bySubject.set(r.subject, []);
  bySubject.get(r.subject).push(r);
}

let processed = 0, tagged = 0, failed = 0;
for (const [subject, subjectRows] of bySubject) {
  console.log(`\n[subject=${subject}] ${subjectRows.length} rows`);
  const batches = [];
  for (let i = 0; i < subjectRows.length; i += BATCH) batches.push(subjectRows.slice(i, i + BATCH));

  let idx = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (idx < batches.length) {
      const my = batches[idx++];
      try {
        const results = await tagBatch(my);
        await writeBack(results);
        for (const r of results) (r.tags.length ? tagged++ : failed++);
        processed += my.length;
        if (processed % 50 === 0) console.log(`  progress: ${processed}/${rows.length} (${tagged} tagged, ${failed} failed)`);
      } catch (e) {
        for (const r of my) appendFileSync(FAIL_LOG, JSON.stringify({ id: r.id, reason: 'batch error: ' + e.message }) + '\n');
        failed += my.length;
        processed += my.length;
      }
      await sleep(2000);
    }
  }));
}

console.log(`\nDONE. Processed ${processed}, tagged ${tagged}, failed ${failed}.`);
console.log(`Failures (if any) logged to ${FAIL_LOG}`);
