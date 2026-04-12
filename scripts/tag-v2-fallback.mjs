import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
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

const nvidia = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

const MODEL = 'meta/llama-3.1-70b-instruct';
const VALID_TOPIC_IDS = syllabusTopicIds();
const FAIL_LOG = 'data/v2-tagging-failures-fallback.jsonl';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Use ALL candidates (not subject-filtered) so miscategorized questions find their real topic
const ALL_CANDIDATES = buildCandidates('general');

function buildPrompt(row) {
  // For fallback, send one question at a time with the full candidate list
  // Split into subject groups to keep prompt manageable
  const cands = ALL_CANDIDATES.slice(0, 120);
  const candList = cands.map(c => `${c.topicId} — ${c.title}`).join('\n');

  return `You are a UPSC Civil Services syllabus classifier. Classify this question into 1-3 topics.

IMPORTANT: The question may be miscategorized by its source. Ignore the original subject label. Focus ONLY on question content.
Only tag if you are genuinely confident the topic is relevant. If no topic is a strong match, return empty topics.

CANDIDATE TOPICS (pick from these ONLY):
${candList}

QUESTION: ${row.question}
Options: (a) ${row.options.a} (b) ${row.options.b} (c) ${row.options.c} (d) ${row.options.d}

Return strict JSON: {"topics":["topic-id"],"confidence":0.9}
Only return topics with confidence >= 0.8. If nothing fits well, return {"topics":[],"confidence":0}.`;
}

async function tagRow(row, attempt = 1) {
  try {
    const resp = await nvidia.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: buildPrompt(row) }],
      temperature: 0.1,
      max_tokens: 200,
    });

    const raw = resp.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    const topics = (parsed.topics || []).filter(t => VALID_TOPIC_IDS.has(t)).slice(0, 3);

    if (topics.length === 0) {
      // Last resort: keyword match from sub_topic_raw
      const kwMatch = keywordFallback(row);
      if (kwMatch) return { tags: [`topic:${kwMatch}`], confidence: { method: 'keyword-fallback', match: kwMatch } };
      return null;
    }

    return {
      tags: topics.map(t => `topic:${t}`),
      confidence: { method: 'nvidia-fallback', model: MODEL, score: parsed.confidence ?? null },
    };
  } catch (e) {
    const msg = e?.message || String(e);
    if (attempt < 6 && /429|rate.?limit|try again/i.test(msg)) {
      const wait = 5000 * Math.pow(1.5, attempt - 1);
      console.log(`  429 — sleeping ${Math.round(wait/1000)}s (attempt ${attempt})`);
      await sleep(wait);
      return tagRow(row, attempt + 1);
    }
    return null;
  }
}

// Keyword-based fallback: match sub_topic_raw or question text against topic titles/keywords
function keywordFallback(row) {
  const text = `${row.question} ${row.sub_topic_raw || ''}`.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const c of ALL_CANDIDATES) {
    let score = 0;
    const title = c.title.toLowerCase();
    const words = title.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      if (text.includes(w)) score += 1;
    }
    for (const kw of (c.keywords || [])) {
      if (text.includes(kw.toLowerCase())) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = c.topicId;
    }
  }

  return bestScore >= 4 ? bestMatch : null;
}

// Pull all untagged rows (paginated)
const all = [];
let from = 0;
while (true) {
  const { data, error } = await sb.from('upsc_pyqs_v2')
    .select('id, subject, question, options, sub_topic_raw')
    .eq('tags', '{}')
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}

console.log(`Untagged rows to process: ${all.length}`);
if (all.length === 0) { console.log('Nothing to do!'); process.exit(0); }

let tagged = 0, kwTagged = 0, failed = 0;
for (let i = 0; i < all.length; i++) {
  const row = all[i];
  const result = await tagRow(row);

  if (result) {
    const { error } = await sb.from('upsc_pyqs_v2')
      .update({ tags: result.tags, confidence: result.confidence })
      .eq('id', row.id);
    if (error) {
      appendFileSync(FAIL_LOG, JSON.stringify({ id: row.id, reason: 'db error: ' + error.message }) + '\n');
      failed++;
    } else {
      if (result.confidence.method === 'keyword-fallback') kwTagged++;
      else tagged++;
    }
  } else {
    // Skip — better untagged than mis-tagged
    appendFileSync(FAIL_LOG, JSON.stringify({ id: row.id, reason: 'skipped — no confident match', question: row.question.slice(0,100) }) + '\n');
    failed++;
  }

  if ((i + 1) % 10 === 0) console.log(`  progress: ${i+1}/${all.length} (${tagged} LLM, ${kwTagged} keyword, ${failed} failed)`);
  await sleep(8000);
}

console.log(`\nDONE. LLM tagged: ${tagged}, keyword tagged: ${kwTagged}, failed: ${failed}`);
console.log(`Failures logged to ${FAIL_LOG}`);
