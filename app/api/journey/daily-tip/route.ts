import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

// ── Daily mentor tip ──────────────────────────────────────────────────────
//
// Returns ONE warm, plain-English mentor message (3-5 short sentences)
// for the MentorsSuggestion card on the journey HomeTab.
//
// PRIMARY PATH: Groq-generated. We pick the most actionable signal from
// the user's metrics, then ask llama-3.1-8b-instant to write a warm,
// personal message tailored to that specific moment in their prep. The
// AI response is validated against the same plain-English guard as the
// templates (banned words, idioms, word count, must-mention-topic).
//
// FALLBACK PATH: hand-written deterministic templates from `pickSignal()`.
// Used when (a) Groq is unreachable, (b) the API key is missing, (c) the
// AI response fails validation, or (d) the user has no topic to point at.
//
// Both paths share the same input pipeline: we receive ~25 metrics from
// the client (today's accuracy, week momentum, next-topic prior accuracy,
// crown progress, subject accuracy, goal progress, days to exam, etc.)
// and pick a single signal that drives whichever path runs.
//
// Two hard constraints regardless of path:
//   - Plain English. ~10-year-old vocabulary. Most UPSC aspirants are
//     not native English speakers.
//   - Aligned with the CTA. The sentence MUST tell them to open the
//     specific topic the button below opens. Never names a different
//     topic.

export const runtime = 'nodejs'

// ── Groq client (lazy) ────────────────────────────────────────────────────
let _groq: Groq | null = null
function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

// ── Tunables ──────────────────────────────────────────────────────────────
const QUESTIONS_PER_CROWN = 5

// ── Plain-English guard ──────────────────────────────────────────────────
// Final sanity filter so even hand-written templates can't accidentally
// ship a hard-to-read word in the future. Banned terms fall into three
// buckets: jargon/idioms, demoralising language, and motivational cliches.
const BANNED_WORDS = [
  // jargon and idioms a non-native speaker can't parse
  'anchor', 'runway', 'finite', 'mapped', 'rhythm', 'momentum', 'compound',
  'leverage', 'calibration', 'diagnostic', 'high-yield', 'marks-per-hour',
  'curve', 'dispatch', 'unlock', 'level up', 'lock in', 'plant',
  'flag', 'pile', 'hypothetical', 'natural next', 'aspirational', 'identity',
  'consolidate', 'consolidates', 'stamina', 'depth over speed',
  'dabbler', 'drifts', 'drift away', 'borrowed', 'two-step pattern',
  'permanent skill', 'temporary fact', 'almost-finished',
  'half done', 'practice cold', 'cold material', 'land deeper',
  'in your head', 'in the bag', 'on deck', 'on the board',
  'showing up', 'show up', 'comeback', 'log', 'kind of', 'shape of',
  'real day', 'honest minutes',
  // demoralising language
  'lagging', 'falling short', 'low completion', 'deficit', 'weak subject',
  'falling behind', 'behind schedule',
  // generic motivation cliches
  'believe in yourself', 'you can do it', 'dream big', 'consistency is key',
  'never give up', 'sky is the limit',
]

function passesPlainEnglish(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  for (const w of BANNED_WORDS) {
    if (lower.includes(w.toLowerCase())) return false
  }
  if (text.includes('—') || text.includes(';')) return false
  // Mentor-voice variants stay readable for non-native English speakers
  // but now allow ~30% more content (up from 32 → 50 words) so the tip
  // can carry richer, more useful mentorship instead of a one-liner.
  if (text.trim().split(/\s+/).length > 50) return false
  return true
}

// ── Stable-per-day seeded picker ─────────────────────────────────────────
// Hashes (yyyy-mm-dd + name + signalId) into a small integer used to
// index into a variant array. Same student + same day + same signal →
// same phrase (no flicker on tab return / remount). Different day → new
// phrase. Different signal → independent pick.
function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function pickVariant<T>(variants: T[], seedKey: string): T {
  if (variants.length === 0) throw new Error('pickVariant: empty array')
  return variants[hashStr(seedKey) % variants.length]
}
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Metric bag ───────────────────────────────────────────────────────────
interface Metrics {
  name: string                  // first name or empty
  greet: string                 // 'Hi <Name>' or 'Hi there'
  // Volume
  done: number                  // topics completed
  started: number               // topics started or completed
  // Today
  todayQa: number
  todayCorrect: number
  todayAcc: number              // 0-100, only meaningful when todayQa > 0
  todayRead: number             // topics read today
  todayPractice: number         // practice rounds today
  goalRead: number              // today's read target
  goalPractice: number          // today's practice target
  // Week
  weekDays: number              // distinct days studied in last 7
  weekQa: number                // questions answered in last 7
  // Streak
  streak: number
  // Next topic the CTA opens
  topic: string                 // topic title (already validated client-side)
  subject: string               // subject short title
  ntAnswered: number            // questions answered on the next topic to date
  ntAcc: number                 // accuracy on the next topic
  ntCrown: number               // current crown level on the next topic
  ntToCrown: number             // correct answers needed for the next crown
  // Subject of the next topic
  subAnswered: number
  subAcc: number
  // Exam
  daysLeft: number              // 0 if not provided
}

// ── Signal types ─────────────────────────────────────────────────────────
type SignalId =
  | 'fresh'
  | 'goal_almost_done_read'
  | 'goal_almost_done_practice'
  | 'goal_one_more_round'
  | 'streak_at_risk'
  | 'topic_weak_history'
  | 'crown_close'
  | 'today_strong'
  | 'today_keep_going'
  | 'subject_strong'
  | 'week_grind'
  | 'pace_exam'
  | 'streak_any'
  | 'returning_after_break'
  | 'done_count'

interface Signal {
  id: SignalId
  variants: string[]            // each is a finished sentence(s) — all must be plain English
}

// ── The cascade ──────────────────────────────────────────────────────────
// Order matters: the FIRST signal whose condition is true wins. Variants
// are written in the SIMPLEST possible English so a non-native speaker
// (most UPSC aspirants) can read every word at a glance. Rules:
//   - One-syllable verbs preferred: open, read, do, try, see, get, keep
//   - Sentences max ~12 words each
//   - No idioms, no metaphors, no compound concepts
//   - No "in your head", "on the board", "shape of", "showing up"
//   - Just direct: "Do this. Then do that. You did good."
// Detail level is preserved (~32-42 words per variant) so the message
// still feels like real mentorship, not a one-line nudge.
function pickSignal(m: Metrics): Signal {
  const t = m.topic
  const greet = m.greet
  const subj = m.subject

  // ── Priority 0: fresh (no data at all) — friendly welcome ──────────
  if (m.started === 0 && m.done === 0 && m.todayQa === 0) {
    return {
      id: 'fresh',
      variants: [
        `${greet}! Welcome. This is your first topic — ${t}. Open it today. Read it for 15 minutes. You do not need to learn it all today. Just read it one time, slowly.`,
        `${greet}! Today is day one. Just open ${t} and read it one time. Read slow. You do not need to take notes today. You can take notes tomorrow. Easy start.`,
        `${greet}! Start with ${t}. Read it for 20 minutes today. Take your time. Every topper started here too — with one topic, on one day. You are doing the right thing.`,
      ],
    }
  }

  // ── Priority 1: today's goal is one read away from done ────────────
  if (
    m.goalRead > 0 &&
    m.todayPractice >= m.goalPractice &&
    m.todayRead === m.goalRead - 1
  ) {
    return {
      id: 'goal_almost_done_read',
      variants: [
        `${greet}! All your practice for today is done. Just one read is left. Open ${t} and read for 15 minutes. Then today is fully done. Small days like this add up fast.`,
        `${greet}! You did all ${m.goalPractice} practice rounds. Just one topic left to read. Open ${t} now. Read it slowly. Then your day is done. Try to finish every day.`,
        `${greet}! You did ${m.todayRead} of ${m.goalRead} reads and all your practice. ${t} is the last step. Read it for 15 minutes. Then your day is done. This is how a streak is built.`,
      ],
    }
  }

  // ── Priority 2: today's goal is one practice round away ────────────
  if (
    m.goalPractice > 0 &&
    m.todayRead >= m.goalRead &&
    m.todayPractice === m.goalPractice - 1
  ) {
    return {
      id: 'goal_almost_done_practice',
      variants: [
        `${greet}! All your reading is done. Just one practice round is left. Open ${t} and answer the questions. Reading is only half the job. Five minutes of practice and your day is done.`,
        `${greet}! One more practice round and you hit ${m.goalPractice} of ${m.goalPractice}. Open ${t} now. Just one round, then your day is done. A full day helps your brain learn much more.`,
        `${greet}! You did ${m.todayPractice} of ${m.goalPractice} practice rounds. Just one more left. Open ${t} and answer the questions. Try to be quick, like in the real exam. End strong today.`,
      ],
    }
  }

  // ── Priority 3: one read away (general case) ───────────────────────
  if (m.goalRead > 0 && m.todayRead === m.goalRead - 1) {
    return {
      id: 'goal_one_more_round',
      variants: [
        `${greet}! You read ${m.todayRead} of ${m.goalRead} topics so far. One more and you are done for the day. Open ${t} now. Give it 15 quiet minutes. Short and focused is better than long and tired.`,
        `${greet}! Just one topic away from a full day. Open ${t} and read it slowly. The last topic of the day is always the hardest. But if you do it, your study power grows day by day.`,
        `${greet}! Just ${t} is left for today. Open it now. Read for 15 minutes and take your time. 15 minutes now is better than 30 minutes when you are tired tonight.`,
      ],
    }
  }

  // ── Priority 4: streak is at risk (≥3 days, no activity today yet) ──
  if (m.streak >= 3 && m.todayQa === 0 && m.todayRead === 0 && m.todayPractice === 0) {
    return {
      id: 'streak_at_risk',
      variants: [
        `${greet}! You studied ${m.streak} days in a row. Today is not over yet. Open ${t} for just 10 minutes. A short read today will save your ${m.streak}-day streak. Do not lose it now.`,
        `${greet}! Your ${m.streak}-day streak needs you today. Open ${t}. Read for 10 minutes. Answer 3 questions. That is all. Toppers come back even on the days they do not feel like it.`,
        `${greet}! ${m.streak} days in a row is real work. Do not stop today. Open ${t} now. Just 10 minutes. Even a short study day is much better than a missed day for your brain.`,
      ],
    }
  }

  // ── Priority 5: prior accuracy on the next topic is weak (≤59%) ───
  if (m.ntAnswered >= 5 && m.ntAcc > 0 && m.ntAcc <= 59) {
    return {
      id: 'topic_weak_history',
      variants: [
        `${greet}! Last time you got ${m.ntAcc}% on ${t} out of ${m.ntAnswered} questions. The topic is telling you to read it one more time. Open the notes first. Then try the questions. Your score will go up.`,
        `${greet}! Your score on ${t} is ${m.ntAcc}% so far. Open the notes today. Read them slowly. The questions will feel much easier the second time. Then try a new round.`,
        `${greet}! Last time on ${t} you got ${m.ntAcc}%. Do not jump to the questions today. First open the notes and read them for 10 minutes. Then answer 5 questions. Read first, then practice.`,
      ],
    }
  }

  // ── Priority 6: 1-3 correct answers from the next knowledge level ──
  if (m.ntCrown >= 0 && m.ntCrown < 5 && m.ntToCrown >= 1 && m.ntToCrown <= 3) {
    const nextLevel = m.ntCrown + 1
    return {
      id: 'crown_close',
      variants: [
        `${greet}! Just ${m.ntToCrown} more right answers and ${t} will reach Level ${nextLevel}. You have done the hard part. Open it now. Try to get ${m.ntToCrown} right answers in a row. Easy points today.`,
        `${greet}! You are ${m.ntToCrown} right answers away from Level ${nextLevel} on ${t}. Open it today, while it is still fresh in your mind. Finish it now and it will stay with you better.`,
        `${greet}! ${m.ntToCrown} right answers and ${t} reaches Level ${nextLevel}. Open it now. Levels show you which topics you really know. Topics you only half know will fail you on exam day.`,
      ],
    }
  }

  // ── Priority 7: today is a strong day (≥5 questions, ≥75% accuracy) ─
  if (m.todayQa >= 5 && m.todayAcc >= 75) {
    return {
      id: 'today_strong',
      variants: [
        `${greet}! You did ${m.todayQa} questions today and got ${m.todayAcc}% right. That is exam-day work. Open ${t} now while your brain is still sharp. A sharp 10 minutes is worth a tired 30 minutes.`,
        `${greet}! You got ${m.todayCorrect} out of ${m.todayQa} right today. This is the score UPSC wants on exam day. Open ${t} now and read it with the same focus. Big day.`,
        `${greet}! ${m.todayAcc}% on ${m.todayQa} questions today is a strong day. Open ${t} now and read it with the same focus. You will learn twice as much when your brain is already paying attention.`,
      ],
    }
  }

  // ── Priority 8: today has activity but accuracy is mixed ───────────
  if (m.todayQa >= 5 && m.todayAcc >= 50 && m.todayAcc < 75) {
    return {
      id: 'today_keep_going',
      variants: [
        `${greet}! You did ${m.todayQa} questions today at ${m.todayAcc}%. Not perfect, but it is good. Open ${t} next and read it slowly. Topics you read after practice stay with you the best.`,
        `${greet}! ${m.todayCorrect} out of ${m.todayQa} right today. Good — that is enough to learn from. Open ${t} now and read it before you sleep. Today's mistakes will make tomorrow's score better.`,
        `${greet}! You did ${m.todayQa} questions at ${m.todayAcc}%. Some right, some wrong. Both are good. The wrong ones show you what to read again. Open ${t} now. Keep going for 15 more minutes.`,
      ],
    }
  }

  // ── Priority 9: subject of the next topic is strong (≥70% over ≥20 Qs) ──
  if (m.subAnswered >= 20 && m.subAcc >= 70 && subj) {
    return {
      id: 'subject_strong',
      variants: [
        `${greet}! Your ${subj} score is ${m.subAcc}% out of ${m.subAnswered} questions. Strong subjects give you the most marks in Prelims. Stay in ${subj} for now. Open ${t} today and add one more topic.`,
        `${greet}! ${subj} is your best subject at ${m.subAcc}%. Give your strong subjects more time, not less. That is where the marks come from. ${t} is next in ${subj}. Open it now.`,
        `${greet}! You did ${m.subAnswered} ${subj} questions at ${m.subAcc}%. Do not switch to a new subject yet. Open ${t} and stay in ${subj} one more day. Your brain still remembers it well today.`,
      ],
    }
  }

  // ── Priority 10: 4+ study days in the last 7 — week-grinder ──────
  if (m.weekDays >= 4) {
    return {
      id: 'week_grind',
      variants: [
        `${greet}! You studied ${m.weekDays} of the last 7 days. You did ${m.weekQa} questions this week. This is what a serious student looks like. Open ${t} today and keep going. Same time tomorrow.`,
        `${greet}! ${m.weekDays} study days last week and ${m.weekQa} questions. You are doing real work. Open ${t} now and add one more day. UPSC is won on small quiet days like this one.`,
        `${greet}! ${m.weekDays} study days out of 7. Most students stop by month four — you did not. Open ${t} today and make it ${m.weekDays + 1} of 7. Small steps every day are real progress.`,
      ],
    }
  }

  // ── Priority 11: pace toward Prelims (mature users) ───────────────
  if (m.daysLeft > 0 && m.daysLeft <= 365 && m.done >= 10) {
    return {
      id: 'pace_exam',
      variants: [
        `${greet}! Prelims is ${m.daysLeft} days away. You have ${m.done} topics ready. From now on, every new topic matters more. Open ${t} today. Read it like the real exam is tomorrow.`,
        `${greet}! ${m.daysLeft} days to Prelims. ${m.done} topics done. From now on, go slow and learn each one well. Open ${t}. Read it slowly. Do not move to the next topic until you feel sure.`,
        `${greet}! ${m.done} topics done. ${m.daysLeft} days left for Prelims. Treat each new topic as something you will use forever. Open ${t} today. Read it. Then practice tomorrow. Two short days work better than one long day.`,
      ],
    }
  }

  // ── Priority 12: any active streak ────────────────────────────────
  if (m.streak >= 1) {
    const dayWord = m.streak === 1 ? 'day' : 'days'
    return {
      id: 'streak_any',
      variants: [
        `${greet}! ${m.streak} ${dayWord} in a row. UPSC is won in 200 quiet days like this one. Today's topic is ${t}. Open it now. Study for 20 minutes. Keep your phone far away from you.`,
        `${greet}! ${m.streak} ${dayWord} of study. The students who pass UPSC are not the smartest. They are the ones who came back every day. Open ${t} now. Read it like it is the only thing today.`,
        `${greet}! ${m.streak} ${dayWord} done. The first two weeks of any new habit are the hardest. You are right in that time. Open ${t} today and add one more day. Small steps every day — that is the game.`,
      ],
    }
  }

  // ── Priority 13: returning after a break (touched ≥1 topic, no streak) ──
  if (m.started >= 1) {
    return {
      id: 'returning_after_break',
      variants: [
        `${greet}! Welcome back. Breaks happen. They do not delete the work you have already done. ${t} is waiting for you. Open it for 10 minutes today. The first day back is the hardest. After that, study comes back on its own.`,
        `${greet}! Good to see you again. The first 5 minutes are the hardest part of coming back. Open ${t} today. Read for as long as it feels easy. Do not try to do everything in one day.`,
        `${greet}! You took a break and that is fine. Start small today, not big. Open ${t} now. Read for 15 minutes. Then stop. Tomorrow you can do a little more. That is how a real return works.`,
      ],
    }
  }

  // ── Priority 14: generic done count (last resort) ─────────────────
  return {
    id: 'done_count',
    variants: [
      `${greet}! You have done ${m.done} ${m.done === 1 ? 'topic' : 'topics'} so far. Each one is one step closer to your goal. ${t} is the next step. Open it today and read for 15 minutes.`,
      `${greet}! ${m.done} ${m.done === 1 ? 'topic' : 'topics'} done so far. Most people who try UPSC apps stop after 3 topics. You are already different. Open ${t} now. Today is the day that moves your prep.`,
      `${greet}! ${m.done} ${m.done === 1 ? 'topic' : 'topics'} done. ${t} is your topic for today. Make it the only thing you care about right now. Do not think about the rest of the syllabus. Just open ${t} and study.`,
    ],
  }
}

// ── Last-resort fallback ────────────────────────────────────────────────
// Used only if a hand-written variant ever trips the BANNED_WORDS guard
// or the word-cap. Plain simple English. No jargon.
function safeFallback(m: Metrics): string {
  const target = m.topic || m.subject || 'your first topic'
  return `${m.greet}! Open ${target} today and read it for 15 quiet minutes.`
}

// ── Stricter validator for AI output ─────────────────────────────────────
// In addition to the plain-English guard, AI responses must (a) start
// with the expected greeting, (b) actually name the next topic, and
// (c) sit within a 25–55 word window. Anything outside falls back.
function passesAIValidation(text: string, m: Metrics): boolean {
  if (!passesPlainEnglish(text)) return false
  if (text.trim().split(/\s+/).length < 25) return false
  // Must include the user's greeting (or at least their name)
  const lower = text.toLowerCase()
  if (m.name && !lower.includes(m.name.toLowerCase())) return false
  // Must include the next topic (case-insensitive substring)
  if (m.topic && !lower.includes(m.topic.toLowerCase())) return false
  return true
}

// ── AI generation (PRIMARY path) ─────────────────────────────────────────
// Builds a tight prompt with all the rules baked in, calls Groq's fastest
// model (llama-3.1-8b-instant, sub-second), and returns the raw text.
// Returns null on any failure so the caller falls back cleanly.
async function generateAITip(m: Metrics, signalId: string): Promise<string | null> {
  const client = getGroq()
  if (!client) return null

  // Concise data block — all the metrics in a flat key/value list. The
  // model picks ONE to anchor the message, decided by the signalId hint.
  const dataBlock = [
    `Greeting: ${m.greet}`,
    `Streak (days in a row): ${m.streak}`,
    `Topics done so far: ${m.done}`,
    `Today reads: ${m.todayRead} of ${m.goalRead}`,
    `Today practice rounds: ${m.todayPractice} of ${m.goalPractice}`,
    `Today questions: ${m.todayQa} (${m.todayCorrect} correct, ${m.todayAcc}%)`,
    `Last 7 days: studied on ${m.weekDays}, ${m.weekQa} questions`,
    `Days to Prelims: ${m.daysLeft || 'unknown'}`,
    `Next topic to open: ${m.topic}`,
    `Subject: ${m.subject}`,
    `Past attempts on next topic: ${m.ntAnswered} questions, ${m.ntAcc}%`,
    `Current Knowledge Level on next topic: ${m.ntCrown}/5`,
    `Right answers needed for next level: ${m.ntToCrown}`,
    `Subject accuracy so far: ${m.subAcc}% across ${m.subAnswered} questions`,
    `Signal hint (which situation matters most right now): ${signalId}`,
  ].join('\n')

  const systemPrompt = `You are PadhAI, a warm and caring UPSC prep mentor speaking to one student at a time. You write like a supportive older sibling who already cleared UPSC and knows exactly how hard the daily grind feels. Your job is to write ONE message that lands warmly, names a real number from their data, and ends with a clear next action they can do right now.`

  // Targeted note injected ONLY when this is the user's very first
  // session (zero topics started, zero done, zero questions today).
  // Stops the model from inventing "yesterday" or "last time" backstory
  // for someone who literally has no past activity. For every other
  // signal the prompt stays exactly as it was.
  const isBrandNew = signalId === 'fresh'
  const brandNewNote = isBrandNew
    ? `\nIMPORTANT — FIRST-TIME USER: This student has just signed up. They have done nothing yet. Their streak is 0, they have not studied any day, they have no past attempts. Do NOT say "yesterday", "last time", "you didn't study", "your last score", or anything that implies past activity. Just welcome them warmly and tell them to open their first topic for a short, easy session today.\n`
    : ''

  const userPrompt = `Write ONE daily mentor message for this student.
${brandNewNote}
THEIR DATA TODAY:
${dataBlock}

WHAT THE MESSAGE MUST DO:
1. Start with "${m.greet}!" exactly.
2. Reference ONE specific number from the data above (the one most relevant to the signal hint).
3. Tell them to open "${m.topic}" with a specific small action (read for X minutes, answer N questions, etc).
4. Sound warm, personal, caring — like a friend, not a robot.
5. Use the SIMPLEST possible English. Vocabulary a 10-year-old can read. Most UPSC aspirants are not native English speakers.
6. 30-45 words total. 3-5 short sentences.
7. End with the action — usually "Open ${m.topic} now."

WHAT THE MESSAGE MUST NOT DO:
- Do NOT use any idioms: no "in the bag", "on the board", "warm in your head", "showing up", "shape of", "drift away", "two-step", "borrowed".
- Do NOT use these words: anchor, runway, momentum, compound, leverage, finite, mapped, depth, stamina, consolidate, dabbler, comeback, identity, rhythm, level up, lock in, plant, flag, hypothetical, lagging, behind schedule.
- Do NOT use motivational cliches: no "you can do it", "believe in yourself", "never give up", "consistency is key".
- Do NOT use em-dashes (—) or semicolons (;).
- Do NOT mention any topic other than "${m.topic}".
- Do NOT use long compound sentences. Break ideas into short separate sentences.
- Do NOT wrap your message in quotes or JSON.

EXAMPLES OF THE TONE I WANT:
- "Hi Abhi! 5 days in a row is real work. Today's topic is Mauryan Empire. Open it now and read for 20 minutes. Keep your phone in another room. You are doing the right thing — one quiet day at a time."
- "Hi Priya! Last time on Vedic Age you got 55%. The topic is asking you to read it again. Open the notes first today. Then try 5 questions. Read first, then practice. Your score will go up next time."
- "Hi Rohan! All your reading is done. Just one practice round left. Open Indus Valley Civilization now and answer the questions. Five minutes and your day is fully done. Small finished days are how a real streak is built."

Now write ONE message for this student. Output ONLY the message text. No quotes, no JSON, no extra words.`

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      max_tokens: 220,
    })
    let text = response.choices[0]?.message?.content?.trim() || ''
    // Strip any accidental wrapping quotes the model adds despite the rule.
    text = text.replace(/^["'`\s]+|["'`\s]+$/g, '')
    // Strip a stray "Output:" or label prefix
    text = text.replace(/^(Message|Output|Tip|Response)[:\-\s]+/i, '')
    return text || null
  } catch (err) {
    console.error('daily-tip Groq error:', err)
    return null
  }
}

// ── Handler ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const num = (k: string) => parseInt(searchParams.get(k) || '0', 10) || 0
  const str = (k: string) => searchParams.get(k) || ''

  const name = str('name')
  const safeName = name || 'there'
  const greet = `Hi ${safeName}`

  // Goal progress comes in as "X/Y" strings.
  const parseGoal = (raw: string): [number, number] => {
    const [a, b] = raw.split('/').map(s => parseInt(s, 10))
    return [Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0]
  }
  const [todayRead, goalRead] = parseGoal(str('gr'))
  const [todayPractice, goalPractice] = parseGoal(str('gp'))

  const metrics: Metrics = {
    name,
    greet,
    done: num('done'),
    started: num('started'),
    todayQa: num('todayQa'),
    todayCorrect: num('todayCorrect'),
    todayAcc: num('todayAcc'),
    todayRead,
    todayPractice,
    goalRead,
    goalPractice,
    weekDays: num('weekDays'),
    weekQa: num('weekQa'),
    streak: num('streak'),
    topic: str('nextTopic'),
    subject: str('nextSubject'),
    ntAnswered: num('ntAnswered'),
    ntAcc: num('ntAcc'),
    ntCrown: num('ntCrown'),
    ntToCrown: num('ntToCrown'),
    subAnswered: num('subAnswered'),
    subAcc: num('subAcc'),
    daysLeft: num('days'),
  }

  // If we have no topic to point at, the alignment rule can't be honored —
  // return a quiet generic line.
  if (!metrics.topic && !metrics.subject) {
    return NextResponse.json({
      tip: `${greet}! Open the syllabus and pick your first topic today.`,
      signal: 'no_target',
    })
  }

  try {
    // Pick the most actionable signal for this student RIGHT NOW. This
    // drives both the AI prompt (as a hint) and the deterministic
    // fallback (as the variant bank).
    const signal = pickSignal(metrics)

    // ── PRIMARY: Groq-generated warm mentor tip ───────────────────────
    const aiTip = await generateAITip(metrics, signal.id)
    if (aiTip && passesAIValidation(aiTip, metrics)) {
      return NextResponse.json({ tip: aiTip, signal: signal.id, source: 'ai' })
    }

    // ── FALLBACK: deterministic template ──────────────────────────────
    // Action-aware seed: same student + same day + same signal + same
    // *count of completed actions today* → same variant. The action
    // count makes the message refresh whenever they finish a read or a
    // practice round, so the mentor card doesn't feel static after work.
    const actionCount = metrics.todayRead + metrics.todayPractice + Math.floor(metrics.todayQa / 5)
    const seed = `${todayKey()}|${name}|${signal.id}|${actionCount}`
    let tip = pickVariant(signal.variants, seed)

    // Defensive: variants are hand-written, but the BANNED_WORDS guard
    // ensures we never ship a regression.
    if (!passesPlainEnglish(tip)) {
      tip = safeFallback(metrics)
    }

    return NextResponse.json({ tip, signal: signal.id, source: 'template' })
  } catch (err) {
    console.error('Daily tip error:', err)
    return NextResponse.json({ tip: safeFallback(metrics), signal: 'error', source: 'fallback' })
  }
}

// QUESTIONS_PER_CROWN is exported as a UI constant elsewhere; we keep a
// local copy here so the route stays self-contained and free of cross-
// module imports from the components tree.
void QUESTIONS_PER_CROWN
