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
