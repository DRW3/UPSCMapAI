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
  'science': 'science',
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
