import { describe, it, expect } from 'vitest';
import { buildCandidates, syllabusTopicIds } from '../scripts/build-tagging-candidates.mjs';

describe('buildCandidates', () => {
  it('returns candidates for a known subject', () => {
    const cands = buildCandidates('polity');
    expect(Array.isArray(cands)).toBe(true);
    expect(cands.length).toBeGreaterThan(5);
    expect(cands.length).toBeLessThan(120);
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
    expect(cands.length).toBeGreaterThan(100);
  });

  it('every topicId exists in the topic keyword map', () => {
    const ids = syllabusTopicIds();
    const cands = buildCandidates('history');
    for (const c of cands) expect(ids.has(c.topicId)).toBe(true);
  });
});
