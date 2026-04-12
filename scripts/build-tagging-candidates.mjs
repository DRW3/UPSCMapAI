import { readFileSync } from 'node:fs';

function loadTopicKeywordMap() {
  const src = readFileSync('data/topic-keyword-map.ts', 'utf8');
  const entries = {};
  const blockRe = /'([a-z0-9-]+)'\s*:\s*\{([^}]*)\}/g;
  for (const m of src.matchAll(blockRe)) {
    const id = m[1];
    const body = m[2];
    const subs = [...body.matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
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
  if (!canonicalSubject || canonicalSubject === 'general') return all;
  const filtered = all.filter(c => c.dbSubjects.includes(canonicalSubject));
  return filtered.length > 0 ? filtered : all;
}

export function syllabusTopicIds() {
  return new Set(Object.keys(TOPIC_MAP));
}
