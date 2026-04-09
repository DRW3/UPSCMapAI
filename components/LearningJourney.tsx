'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { UPSC_SYLLABUS, TOTAL_TOPICS, type LearningTopic, type LearningSubject } from '@/data/syllabus'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PYQ {
  id: number
  year: number
  question: string
  options: { a: string; b: string; c: string; d: string } | null
  answer: string | null
  explanation: string | null
  subject: string
  topic: string
  difficulty: string | null
  source: string
}

// ── Progress helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'upsc-journey-v1'

function loadProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveProgress(p: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* noop */ }
}

// ── Topic sequencing helpers ─────────────────────────────────────────────────

function getSubjectTopics(subject: LearningSubject): LearningTopic[] {
  return subject.units.flatMap(u => u.topics)
}

function findNextTopic(topicId: string, subject: LearningSubject): LearningTopic | null {
  const all = getSubjectTopics(subject)
  const idx = all.findIndex(t => t.id === topicId)
  return idx >= 0 && idx + 1 < all.length ? all[idx + 1] : null
}

function isTopicUnlocked(topicId: string, subject: LearningSubject, progress: Record<string, boolean>): boolean {
  const all = getSubjectTopics(subject)
  const idx = all.findIndex(t => t.id === topicId)
  if (idx <= 0) return true // First topic always unlocked
  return !!progress[all[idx - 1].id] // Previous topic must be completed
}

// ── Difficulty indicator ──────────────────────────────────────────────────────

function DifficultyDots({ level, color }: { level: 1 | 2 | 3; color: string }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3].map(d => (
        <div key={d} className="rounded-full transition-all"
          style={{ width: 5, height: 5, background: d <= level ? color : 'rgba(255,255,255,0.15)' }} />
      ))}
    </div>
  )
}

// ── Daily + Lifetime Stats ──────────────────────────────────────────────────

const DAILY_KEY = 'upsc-daily-v1'
const LIFETIME_KEY = 'upsc-lifetime-v1'

interface DailyStats {
  date: string
  topicsStudied: string[]
  questionsAnswered: number
  questionsCorrect: number
}

interface LifetimeStats {
  questionsAnswered: number
  questionsCorrect: number
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function loadDailyStats(): DailyStats {
  const today = todayStr()
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}')
    if (raw.date === today) return raw as DailyStats
  } catch { /* noop */ }
  return { date: today, topicsStudied: [], questionsAnswered: 0, questionsCorrect: 0 }
}

function saveDailyStats(s: DailyStats) {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(s)) } catch { /* noop */ }
}

function loadLifetimeStats(): LifetimeStats {
  try { return JSON.parse(localStorage.getItem(LIFETIME_KEY) || '{"questionsAnswered":0,"questionsCorrect":0}') as LifetimeStats }
  catch { return { questionsAnswered: 0, questionsCorrect: 0 } }
}

function saveLifetimeStats(s: LifetimeStats) {
  try { localStorage.setItem(LIFETIME_KEY, JSON.stringify(s)) } catch { /* noop */ }
}

function getNextPrelimsDate(): Date {
  const now = new Date()
  const thisYear = new Date(`${now.getFullYear()}-06-08T00:00:00+05:30`)
  return now > thisYear ? new Date(`${now.getFullYear() + 1}-06-08T00:00:00+05:30`) : thisYear
}

function getDaysToExam(): number {
  return Math.max(0, Math.ceil((getNextPrelimsDate().getTime() - Date.now()) / 86400000))
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night grind'
}

const UPSC_QUOTES = [
  { text: 'Dream is not that which you see while sleeping, it is something that does not let you sleep.', author: 'Dr. APJ Abdul Kalam' },
  { text: 'The future belongs to those who prepare for it today.', author: 'Malcolm X' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: 'In a gentle way, you can shake the world.', author: 'Mahatma Gandhi' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'You have to dream before your dreams can come true.', author: 'Dr. APJ Abdul Kalam' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Be the change that you wish to see in the world.', author: 'Mahatma Gandhi' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'Hard work beats talent when talent doesn\'t work hard.', author: 'Tim Notke' },
  { text: 'Winners never quit and quitters never win.', author: 'Vince Lombardi' },
]

function getNextUnlockedTopics(progress: Record<string, boolean>, limit: number = 3): Array<{ topic: LearningTopic; subject: LearningSubject }> {
  const results: Array<{ topic: LearningTopic; subject: LearningSubject }> = []
  const seenSubjects = new Set<string>()
  for (const subj of UPSC_SYLLABUS) {
    if (results.length >= limit) break
    const topics = getSubjectTopics(subj)
    for (const topic of topics) {
      if (!progress[topic.id] && isTopicUnlocked(topic.id, subj, progress)) {
        if (!seenSubjects.has(subj.id)) {
          results.push({ topic, subject: subj })
          seenSubjects.add(subj.id)
        }
        break
      }
    }
  }
  return results
}

function getLevel(questionsAnswered: number): { level: number; progress: number; nextAt: number } {
  return { level: Math.floor(questionsAnswered / 50) + 1, progress: questionsAnswered % 50, nextAt: 50 }
}

// ── Confetti Particle System ─────────────────────────────────────────────────

function ConfettiExplosion({ color }: { color: string }) {
  const particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      tx: `${(Math.random() - 0.5) * 280}px`,
      ty: `${-Math.random() * 260 - 40}px`,
      rot: `${(Math.random() - 0.5) * 720}deg`,
      color: [color, '#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'][i % 6],
      delay: Math.random() * 0.15,
      size: 6 + Math.random() * 6,
      shape: i % 3,
    }))
  ).current

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{
            '--tx': p.tx,
            '--ty': p.ty,
            '--rot': p.rot,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '0',
            clipPath: p.shape === 2 ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : undefined,
            animation: `journey-confetti-pop 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s both`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ── Unlock Celebration Overlay ───────────────────────────────────────────────

function UnlockCelebration({
  completedTopic,
  nextTopic,
  subject,
  onDone,
}: {
  completedTopic: LearningTopic
  nextTopic: LearningTopic
  subject: LearningSubject
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 100)
    const t2 = setTimeout(() => setPhase('exit'), 1800)
    const t3 = setTimeout(onDone, 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        animation: phase === 'exit'
          ? 'journey-backdrop-out 0.4s ease-out forwards'
          : 'journey-backdrop-in 0.3s ease-out forwards',
      }}
    >
      <ConfettiExplosion color={subject.color} />

      {/* Star burst ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 120,
          height: 120,
          border: `3px solid ${subject.color}`,
          animation: 'journey-ring-burst 1s ease-out 0.2s both',
        }}
      />

      {/* Main content */}
      <div
        className="flex flex-col items-center gap-4 z-10"
        style={{
          animation: phase === 'exit'
            ? 'journey-modal-out 0.35s ease-in forwards'
            : 'journey-modal-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Checkmark badge */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center relative"
          style={{
            background: `linear-gradient(135deg, ${subject.color}40, ${subject.color}20)`,
            border: `2px solid ${subject.color}60`,
            boxShadow: `0 0 40px ${subject.color}30`,
            animation: 'journey-star-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke={subject.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 18l7 7 13-13" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center"
          style={{ animation: 'journey-score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}>
          <p className="text-[22px] font-bold text-white">Topic Complete!</p>
          <p className="text-[13px] text-white/40 mt-1">{completedTopic.title}</p>
        </div>

        {/* Next topic preview */}
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl mt-2"
          style={{
            background: `linear-gradient(135deg, ${subject.color}18, ${subject.color}08)`,
            border: `1.5px solid ${subject.color}40`,
            animation: 'journey-bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${subject.color}25` }}>
            {nextTopic.icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: subject.color }}>
              Up Next
            </p>
            <p className="text-[13px] font-semibold text-white/90">{nextTopic.title}</p>
          </div>
          <div className="ml-2 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: `${subject.color}30` }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={subject.color} strokeWidth="2" strokeLinecap="round">
              <path d="M4 2l4 4-4 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PYQ Practice Modal ────────────────────────────────────────────────────────

function PYQPractice({
  topic,
  subject,
  onClose,
  onComplete,
  nextTopic,
}: {
  topic: LearningTopic
  subject: LearningSubject
  onClose: () => void
  onComplete: (sessionScore: { correct: number; total: number }) => void
  nextTopic: LearningTopic | null
}) {
  const [pyqs, setPyqs] = useState<PYQ[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setLoading(true)
    const keywords = topic.concepts.slice(0, 4).join(',')
    fetch(`/api/journey/pyqs?subject=${subject.id}&topic=${topic.id}&keywords=${encodeURIComponent(keywords)}&limit=5`)
      .then(r => r.json())
      .then(d => { setPyqs(d.pyqs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [topic.id, subject.id, topic.concepts])

  const current = pyqs[currentIdx]
  const isCorrect = revealed && selected === current?.answer

  function handleSelect(opt: string) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    setScore(s => ({
      correct: s.correct + (opt === current?.answer ? 1 : 0),
      total: s.total + 1,
    }))
  }

  function handleNext() {
    if (currentIdx + 1 >= pyqs.length) {
      setDone(true)
    } else {
      setCurrentIdx(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 300)
  }

  const optionLabels = ['a', 'b', 'c', 'd'] as const
  const optionColors = {
    correct: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#86efac' },
    wrong: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5' },
    neutral: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.75)' },
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        animation: closing ? 'journey-backdrop-out 0.3s ease-out forwards' : 'journey-backdrop-in 0.3s ease-out forwards',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0f0f14, #0d0d12)',
          border: `1.5px solid ${subject.color}30`,
          maxHeight: '90vh',
          animation: closing ? 'journey-modal-out 0.3s ease-in forwards' : 'journey-modal-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{topic.icon}</span>
            <div>
              <p className="text-[13px] font-bold text-white/90">{topic.title}</p>
              <p className="text-[10px] text-white/35">PYQ Practice</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!done && pyqs.length > 0 && (
              <div className="flex items-center gap-1.5">
                {pyqs.map((_, i) => (
                  <div key={i} className="rounded-full transition-all duration-300"
                    style={{
                      width: i === currentIdx ? 20 : 6,
                      height: 6,
                      background: i < currentIdx ? subject.color : i === currentIdx ? subject.color : 'rgba(255,255,255,0.15)',
                      boxShadow: i === currentIdx ? `0 0 8px ${subject.color}60` : 'none',
                    }} />
                ))}
              </div>
            )}
            <button onClick={handleClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 transition-all duration-200 hover:rotate-90"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${subject.color}40`, borderTopColor: subject.color }} />
              <p className="text-[12px] text-white/30">Loading PYQs...</p>
            </div>
          ) : pyqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center"
              style={{ animation: 'journey-bounce-in 0.5s ease-out both' }}>
              <span className="text-4xl">📭</span>
              <p className="text-[14px] text-white/60 font-medium">No PYQs found for this topic yet</p>
              <p className="text-[12px] text-white/30">Complete this topic to continue your journey</p>
              <button
                onClick={() => onComplete({ correct: 0, total: 0 })}
                className="mt-2 px-6 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)`,
                  boxShadow: `0 4px 20px ${subject.color}30`,
                }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'journey-shimmer 2s linear infinite',
                  }} />
                <span className="relative z-10">
                  {nextTopic ? `Continue to ${nextTopic.title} →` : 'Mark Complete ✓'}
                </span>
              </button>
            </div>
          ) : done ? (
            /* Score screen */
            <div className="flex flex-col items-center justify-center py-8 gap-5 text-center relative">
              {score.correct === score.total && <ConfettiExplosion color={subject.color} />}

              {/* Score badge */}
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl relative"
                style={{
                  background: `${subject.color}18`,
                  border: `2px solid ${subject.color}40`,
                  animation: 'journey-star-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                  boxShadow: `0 0 30px ${subject.color}20`,
                }}
              >
                {score.correct === score.total ? '🏆' : score.correct > score.total / 2 ? '🌟' : '📚'}
              </div>

              {/* Score text */}
              <div style={{ animation: 'journey-score-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' }}>
                <p className="text-[32px] font-bold text-white">{score.correct}/{score.total}</p>
                <p className="text-[13px] text-white/45 mt-1">
                  {score.correct === score.total
                    ? 'Perfect score! Outstanding!'
                    : score.correct > score.total / 2
                      ? 'Good work! Keep going!'
                      : 'Review the topic and try again!'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-3 w-full max-w-xs"
                style={{ animation: 'journey-bounce-in 0.5s ease-out 0.4s both' }}>
                {/* Primary: Continue to next topic */}
                <button
                  onClick={() => onComplete(score)}
                  className="w-full px-6 py-3.5 rounded-2xl text-[14px] font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)`,
                    boxShadow: `0 4px 24px ${subject.color}35`,
                  }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'journey-shimmer 2s linear infinite',
                    }} />
                  <span className="relative z-10">
                    {nextTopic ? `Next: ${nextTopic.title} →` : 'Complete ✓'}
                  </span>
                </button>

                {/* Secondary buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCurrentIdx(0); setSelected(null); setRevealed(false); setScore({ correct: 0, total: 0 }); setDone(false) }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/60 transition-all hover:text-white/90 hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Retry
                  </button>
                  <Link
                    href={`/map?q=${encodeURIComponent(topic.mapQuery)}`}
                    onClick={() => onComplete(score)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/60 text-center transition-all hover:text-white/90 hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Study on Map
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Question */
            <div className="flex flex-col gap-5" style={{ animation: 'journey-bounce-in 0.4s ease-out both' }}>
              {/* Year + difficulty badge */}
              <div className="flex items-center gap-2">
                {current.year > 0 && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: `${subject.color}18`, color: subject.color }}>
                    UPSC {current.year}
                  </span>
                )}
                {current.difficulty && (
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg text-white/40"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {current.difficulty}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-white/25">{currentIdx + 1} of {pyqs.length}</span>
              </div>

              {/* Question text */}
              <p className="text-[14px] text-white/88 leading-relaxed font-medium">{current.question}</p>

              {/* Options */}
              {current.options && (
                <div className="flex flex-col gap-2.5">
                  {optionLabels.map(opt => {
                    const text = current.options?.[opt]
                    if (!text) return null
                    let colors = optionColors.neutral
                    if (revealed) {
                      if (opt === current.answer) colors = optionColors.correct
                      else if (opt === selected) colors = optionColors.wrong
                    }
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        disabled={revealed}
                        className="flex items-start gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 disabled:cursor-default"
                        style={{
                          background: selected === opt && !revealed ? `${subject.color}18` : colors.bg,
                          border: `1.5px solid ${selected === opt && !revealed ? subject.color + '60' : colors.border}`,
                          animation: revealed && opt === current.answer
                            ? 'journey-pulse 1.5s ease-in-out infinite'
                            : revealed && opt === selected && opt !== current.answer
                              ? 'journey-shake 0.5s ease-out both'
                              : undefined,
                        }}
                      >
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold mt-0.5 transition-all duration-300"
                          style={{
                            background: revealed && opt === current.answer
                              ? '#22c55e'
                              : revealed && opt === selected
                                ? '#ef4444'
                                : selected === opt
                                  ? subject.color
                                  : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            transform: revealed && opt === current.answer ? 'scale(1.1)' : 'scale(1)',
                          }}
                        >
                          {opt.toUpperCase()}
                        </span>
                        <span className="text-[13px] leading-snug" style={{ color: colors.text }}>{text}</span>
                        {revealed && opt === current.answer && (
                          <span className="ml-auto flex-shrink-0 text-green-400 text-lg"
                            style={{ animation: 'journey-star-in 0.5s ease-out both' }}>✓</span>
                        )}
                        {revealed && opt === selected && opt !== current.answer && (
                          <span className="ml-auto flex-shrink-0 text-red-400 text-lg">✗</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Answer reveal */}
              {revealed && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    animation: 'journey-bounce-in 0.4s ease-out both',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{isCorrect ? '🎉' : '💡'}</span>
                    <span className="text-[12px] font-bold" style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
                      {isCorrect ? 'Correct!' : `Correct answer: (${current.answer?.toUpperCase()})`}
                    </span>
                  </div>
                  {current.explanation && (
                    <p className="text-[12px] text-white/55 leading-relaxed">{current.explanation.slice(0, 350)}{current.explanation.length > 350 ? '...' : ''}</p>
                  )}
                </div>
              )}

              {/* Next button */}
              {revealed && (
                <button
                  onClick={handleNext}
                  className="self-end px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)`,
                    animation: 'journey-bounce-in 0.3s ease-out both',
                    boxShadow: `0 2px 12px ${subject.color}25`,
                  }}
                >
                  {currentIdx + 1 >= pyqs.length ? 'See Results →' : 'Next Question →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Topic Node ────────────────────────────────────────────────────────────────

function TopicNode({
  topic,
  subject,
  isDone,
  isLocked,
  isNewlyUnlocked,
  position,
  index,
  onPractice,
}: {
  topic: LearningTopic
  subject: LearningSubject
  isDone: boolean
  isLocked: boolean
  isNewlyUnlocked: boolean
  position: 'left' | 'center' | 'right'
  index: number
  onPractice: (topic: LearningTopic) => void
}) {
  const alignClass =
    position === 'left'
      ? 'self-start ml-2 sm:ml-8 md:ml-16'
      : position === 'right'
        ? 'self-end mr-2 sm:mr-8 md:mr-16'
        : 'self-center'

  // Locked state
  if (isLocked) {
    return (
      <div
        className={`${alignClass} flex flex-col gap-1`}
        style={{
          minWidth: 210,
          maxWidth: 310,
          opacity: 0.35,
          filter: 'grayscale(0.6)',
          animation: `journey-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-not-allowed relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '2px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="7" width="10" height="7" rx="2" />
              <path d="M5 7V5a3 3 0 016 0v2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate text-white/30">
              {topic.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <DifficultyDots level={topic.difficulty} color="rgba(255,255,255,0.15)" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${alignClass} group flex flex-col gap-1`}
      style={{
        minWidth: 210,
        maxWidth: 310,
        animation: isNewlyUnlocked
          ? 'journey-bounce-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both'
          : `journey-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
      }}
    >
      <div
        onClick={() => onPractice(topic)}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.03] hover:shadow-lg cursor-pointer relative overflow-hidden"
        style={{
          background: isDone
            ? `linear-gradient(135deg, ${subject.color}28, ${subject.color}18)`
            : isNewlyUnlocked
              ? `linear-gradient(135deg, ${subject.color}18, ${subject.color}08)`
              : 'rgba(255,255,255,0.04)',
          border: `2px solid ${isDone ? subject.color + '60' : isNewlyUnlocked ? subject.color + '40' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: isDone
            ? `0 4px 24px ${subject.color}18`
            : isNewlyUnlocked
              ? `0 0 20px ${subject.color}15`
              : 'none',
        }}
      >
        {/* Shimmer on newly unlocked */}
        {isNewlyUnlocked && !isDone && (
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${subject.color}10, transparent)`,
              backgroundSize: '200% 100%',
              animation: 'journey-shimmer 3s linear infinite',
            }} />
        )}

        {/* Glow breathe on current unlocked (not done, not newly unlocked) */}
        {!isDone && !isNewlyUnlocked && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              border: `1px solid ${subject.color}20`,
              animation: 'journey-glow-breathe 3s ease-in-out infinite',
            }} />
        )}

        {/* Icon bubble */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all relative z-10"
          style={{
            background: isDone ? `${subject.color}30` : 'rgba(255,255,255,0.07)',
            boxShadow: isDone ? `0 0 0 2px ${subject.color}40` : 'none',
          }}
        >
          {isDone ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={subject.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10l4 4 8-8" />
            </svg>
          ) : topic.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: isDone ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)' }}>
            {topic.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <DifficultyDots level={topic.difficulty} color={subject.color} />
            {topic.pyqFrequency === 'high' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24' }}>
                ★ PYQ
              </span>
            )}
            {isNewlyUnlocked && !isDone && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: `${subject.color}20`, color: subject.color, animation: 'journey-float 2s ease-in-out infinite' }}>
                ▶ START
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="relative z-10">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={isDone ? subject.color : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ── Connector dots ────────────────────────────────────────────────────────────

function Connector({ color, align, isActive, index }: { color: string; align: 'left' | 'center' | 'right'; isActive: boolean; index: number }) {
  const css =
    align === 'left'
      ? 'self-start ml-[calc(2rem+22px)] sm:ml-[calc(2rem+52px)] md:ml-[calc(4rem+52px)]'
      : align === 'right'
        ? 'self-end mr-[calc(2rem+22px)] sm:mr-[calc(2rem+52px)] md:mr-[calc(4rem+52px)]'
        : 'self-center'

  return (
    <div className={`${css} flex flex-col items-center gap-[3px] py-1`}>
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-full"
          style={{
            width: 4,
            height: 4,
            background: isActive ? color : `${color}25`,
            opacity: isActive ? 1 - i * 0.2 : 0.3,
            animation: isActive ? `journey-flow-dot 1.5s ease-in-out ${i * 0.2 + index * 0.1}s infinite` : undefined,
          }} />
      ))}
    </div>
  )
}

// ── Unit Banner ───────────────────────────────────────────────────────────────

function UnitBanner({ title, icon, color, completedCount, totalCount }: {
  title: string; icon: string; color: string; completedCount: number; totalCount: number
}) {
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  return (
    <div className="flex flex-col items-center w-full mb-4">
      <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl"
        style={{ background: `linear-gradient(135deg, ${color}14, ${color}08)`, border: `1px solid ${color}30` }}>
        <span className="text-base">{icon}</span>
        <span className="text-[12px] font-bold text-white/80 tracking-wide">{title}</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}>
          {completedCount}/{totalCount}
        </span>
      </div>
      {pct > 0 && (
        <div className="w-24 h-0.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
    </div>
  )
}

// ── Subject Tab ───────────────────────────────────────────────────────────────

function SubjectTab({ subject, active, completedTopics, totalTopics, onClick }: {
  subject: LearningSubject; active: boolean; completedTopics: number; totalTopics: number; onClick: () => void
}) {
  const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
  return (
    <button onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300"
      style={{
        background: active ? `${subject.color}20` : 'rgba(255,255,255,0.04)',
        color: active ? subject.color : 'rgba(255,255,255,0.45)',
        border: `1.5px solid ${active ? subject.color + '55' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active ? `0 0 14px ${subject.color}18` : 'none',
        transform: active ? 'scale(1.02)' : 'scale(1)',
      }}>
      <span className="text-base leading-none">{subject.icon}</span>
      <span className="hidden sm:inline">{subject.shortTitle}</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
        style={{
          background: active ? `${subject.color}25` : 'rgba(255,255,255,0.07)',
          color: active ? subject.color : 'rgba(255,255,255,0.3)',
        }}>
        {pct > 0 ? `${pct}%` : subject.paper}
      </span>
    </button>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ progress }: { progress: Record<string, boolean> }) {
  const total = TOTAL_TOPICS
  const done = Object.keys(progress).filter(k => progress[k]).length
  const pct = Math.round((done / total) * 100)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setStreak(parseInt(localStorage.getItem('upsc-streak-v1') || '0'))
  }, [])

  return (
    <div className="flex items-center gap-4 sm:gap-6 px-5 py-3.5 rounded-2xl flex-wrap justify-center sm:justify-start"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
            <circle cx="16" cy="16" r="12" fill="none" stroke="#6366f1" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 12}`}
              strokeDashoffset={`${2 * Math.PI * 12 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.7s ease-out' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-indigo-300">{pct}%</span>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-white/80">{done}/{total} topics</p>
          <p className="text-[10px] text-white/30">syllabus coverage</p>
        </div>
      </div>
      <div className="w-px h-8 bg-white/[0.08]" />
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">🔥</span>
        <div>
          <p className="text-[11px] font-semibold text-white/80">{streak}-day streak</p>
          <p className="text-[10px] text-white/30">keep it going!</p>
        </div>
      </div>
      <div className="w-px h-8 bg-white/[0.08]" />
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">📝</span>
        <div>
          <p className="text-[11px] font-semibold text-white/80">{done} topics</p>
          <p className="text-[10px] text-white/30">completed</p>
        </div>
      </div>
    </div>
  )
}

// ── Today View ───────────────────────────────────────────────────────────────

function TodayView({
  progress,
  dailyStats,
  lifetimeStats,
  streak,
  onStartTopic,
  onSwitchToSyllabus,
}: {
  progress: Record<string, boolean>
  dailyStats: DailyStats
  lifetimeStats: LifetimeStats
  streak: number
  onStartTopic: (topic: LearningTopic, subject: LearningSubject) => void
  onSwitchToSyllabus: (subjectId: string) => void
}) {
  const daysToExam = getDaysToExam()
  const prelimsYear = getNextPrelimsDate().getFullYear()
  const greeting = getTimeGreeting()
  const quote = UPSC_QUOTES[new Date().getDate() % UPSC_QUOTES.length]
  const nextTopics = getNextUnlockedTopics(progress, 4)
  const continueNext = nextTopics[0] || null
  const totalDone = Object.keys(progress).filter(k => progress[k]).length
  const { level, progress: levelProg, nextAt } = getLevel(lifetimeStats.questionsAnswered)
  const accuracy = lifetimeStats.questionsAnswered > 0
    ? Math.round((lifetimeStats.questionsCorrect / lifetimeStats.questionsAnswered) * 100) : 0

  const DAILY_TOPIC_GOAL = 3
  const DAILY_QS_GOAL = 15
  const topicsDoneToday = dailyStats.topicsStudied.length
  const qsDoneToday = dailyStats.questionsAnswered
  const dailyPct = Math.min(100, Math.round(((Math.min(topicsDoneToday, DAILY_TOPIC_GOAL) / DAILY_TOPIC_GOAL + Math.min(qsDoneToday, DAILY_QS_GOAL) / DAILY_QS_GOAL) / 2) * 100))

  const subjectProgress = UPSC_SYLLABUS.map(s => ({
    subject: s,
    done: getSubjectTopics(s).filter(t => progress[t.id]).length,
    total: getSubjectTopics(s).length,
  }))

  // Urgency color for countdown
  const countdownColor = daysToExam <= 30 ? '#ef4444' : daysToExam <= 90 ? '#f59e0b' : '#6366f1'

  return (
    <div className="space-y-5 pb-8" style={{ animation: 'journey-bounce-in 0.4s ease-out both' }}>

      {/* ── Hero: Greeting + Countdown ── */}
      <div className="relative overflow-hidden rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.07) 50%, rgba(236,72,153,0.05) 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
        {/* Animated gradient orbs */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)', animation: 'journey-glow-breathe 4s ease-in-out infinite' }} />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', animation: 'journey-glow-breathe 4s ease-in-out 2s infinite' }} />

        <div className="relative z-10">
          <p className="text-white/45 text-[13px] font-medium">{greeting}</p>
          <h1 className="text-[24px] font-bold text-white mt-0.5 mb-5">
            Future{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #a5b4fc, #c084fc)' }}>
              Civil Servant
            </span>
          </h1>

          {/* Countdown */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-[72px] h-[72px] rounded-2xl"
              style={{
                background: `${countdownColor}12`,
                border: `1.5px solid ${countdownColor}30`,
                boxShadow: `0 0 30px ${countdownColor}10`,
              }}>
              <span className="text-[28px] font-black leading-none bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${countdownColor}, ${countdownColor}cc)` }}>
                {daysToExam}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/35 mt-0.5">days</span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-white/80">Prelims {prelimsYear}</p>
              <p className="text-[11px] text-white/35 mt-0.5">
                {daysToExam <= 30 ? 'Final stretch — every hour counts!' :
                 daysToExam <= 90 ? 'Crunch time — stay focused!' :
                 daysToExam <= 180 ? 'Good time to build strong foundations' :
                 'Start early, finish strong'}
              </p>
              {streak > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-[12px]">🔥</span>
                  <span className="text-[11px] font-bold" style={{ color: streak >= 7 ? '#f59e0b' : '#a5b4fc' }}>
                    {streak}-day streak{streak >= 7 ? ' — on fire!' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[12px] text-white/40 italic leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-[10px] text-white/25 mt-1">— {quote.author}</p>
        </div>
      </div>

      {/* ── Daily Mission ── */}
      <div className="rounded-2xl p-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}>
              <span className="text-[14px]">🎯</span>
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white/90">Today&apos;s Mission</h3>
              <p className="text-[10px] text-white/30">Daily targets to stay on track</p>
            </div>
          </div>
          {/* Completion ring */}
          <div className="relative w-11 h-11">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="17" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
              <circle cx="22" cy="22" r="17" fill="none"
                stroke={dailyPct >= 100 ? '#22c55e' : '#6366f1'} strokeWidth="3.5"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - dailyPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.7s ease-out' }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
              style={{ color: dailyPct >= 100 ? '#22c55e' : '#a5b4fc' }}>
              {dailyPct}%
            </span>
          </div>
        </div>

        {/* Topic goal */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">📖</span>
              <span className="text-[12px] text-white/60 font-medium">Study {DAILY_TOPIC_GOAL} topics</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: topicsDoneToday >= DAILY_TOPIC_GOAL ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
              {Math.min(topicsDoneToday, DAILY_TOPIC_GOAL)}/{DAILY_TOPIC_GOAL}
              {topicsDoneToday >= DAILY_TOPIC_GOAL && ' ✓'}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((topicsDoneToday / DAILY_TOPIC_GOAL) * 100, 100)}%`,
                background: topicsDoneToday >= DAILY_TOPIC_GOAL
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #6366f1, #a78bfa)',
              }} />
          </div>
        </div>

        {/* Question goal */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">📝</span>
              <span className="text-[12px] text-white/60 font-medium">Practice {DAILY_QS_GOAL} questions</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: qsDoneToday >= DAILY_QS_GOAL ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
              {Math.min(qsDoneToday, DAILY_QS_GOAL)}/{DAILY_QS_GOAL}
              {qsDoneToday >= DAILY_QS_GOAL && ' ✓'}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((qsDoneToday / DAILY_QS_GOAL) * 100, 100)}%`,
                background: qsDoneToday >= DAILY_QS_GOAL
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : 'linear-gradient(90deg, #6366f1, #a78bfa)',
              }} />
          </div>
        </div>

        {dailyPct >= 100 ? (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <span className="text-[14px]">🏆</span>
            <span className="text-[11px] font-semibold" style={{ color: '#4ade80' }}>
              Mission complete! You&apos;re unstoppable today.
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-white/25 mt-3 flex items-center gap-1.5">
            <span>🔥</span> Complete today&apos;s mission to keep your streak alive
          </p>
        )}
      </div>

      {/* ── Continue Learning Card ── */}
      {continueNext && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3 px-1">
            Continue Learning
          </h3>
          <button
            onClick={() => onStartTopic(continueNext.topic, continueNext.subject)}
            className="w-full rounded-2xl p-5 text-left transition-all hover:scale-[1.01] active:scale-[0.98] relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${continueNext.subject.color}14, ${continueNext.subject.color}06)`,
              border: `1.5px solid ${continueNext.subject.color}35`,
              boxShadow: `0 4px 24px ${continueNext.subject.color}08`,
            }}>
            {/* Shimmer */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${continueNext.subject.color}08, transparent)`,
                backgroundSize: '200% 100%',
                animation: 'journey-shimmer 3s linear infinite',
              }} />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: `${continueNext.subject.color}20`, border: `1px solid ${continueNext.subject.color}30` }}>
                {continueNext.topic.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white/90 leading-tight">{continueNext.topic.title}</p>
                <p className="text-[11px] text-white/35 mt-1">{continueNext.subject.shortTitle} &middot; {continueNext.subject.paper}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <DifficultyDots level={continueNext.topic.difficulty} color={continueNext.subject.color} />
                  {continueNext.topic.pyqFrequency === 'high' && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24' }}>
                      ★ PYQ HOT
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${continueNext.subject.color}18` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={continueNext.subject.color} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── Recommended Topics ── */}
      {nextTopics.length > 1 && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3 px-1">
            Recommended For You
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {nextTopics.slice(1, 5).map(({ topic, subject: s }, i) => (
              <button
                key={topic.id}
                onClick={() => onStartTopic(topic, s)}
                className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  background: `linear-gradient(160deg, ${s.color}0d, rgba(255,255,255,0.02))`,
                  border: `1px solid ${s.color}22`,
                  animation: `journey-bounce-in 0.5s ease-out ${0.1 + i * 0.08}s both`,
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3"
                  style={{ background: `${s.color}15` }}>
                  {topic.icon}
                </div>
                <p className="text-[12px] font-semibold text-white/75 leading-tight mb-1 line-clamp-2">{topic.title}</p>
                <p className="text-[10px] text-white/30 mb-2">{s.shortTitle}</p>
                <div className="flex items-center gap-1.5">
                  <DifficultyDots level={topic.difficulty} color={s.color} />
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md ml-auto"
                    style={{ background: `${s.color}15`, color: s.color }}>
                    Start
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Dashboard ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3 px-1">
          Your Progress
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Streak */}
          <div className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {streak >= 7 && (
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
            )}
            <span className="text-2xl block mb-1">🔥</span>
            <p className="text-[26px] font-black text-white leading-none">{streak}</p>
            <p className="text-[11px] text-white/30 mt-1">day streak</p>
            {streak >= 7 && <p className="text-[9px] font-bold mt-1" style={{ color: '#f59e0b' }}>On fire!</p>}
          </div>

          {/* Level */}
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-2xl block mb-1">📊</span>
            <p className="text-[26px] font-black text-white leading-none">L{level}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(levelProg / nextAt) * 100}%`, background: 'linear-gradient(90deg, #a78bfa, #c084fc)' }} />
              </div>
              <span className="text-[8px] text-white/20 font-bold">{levelProg}/{nextAt}</span>
            </div>
            <p className="text-[10px] text-white/25 mt-1">{lifetimeStats.questionsAnswered} Qs total</p>
          </div>

          {/* Topics */}
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-2xl block mb-1">✅</span>
            <p className="text-[26px] font-black text-white leading-none">
              {totalDone}<span className="text-[14px] text-white/25">/{TOTAL_TOPICS}</span>
            </p>
            <p className="text-[11px] text-white/30 mt-1">topics done</p>
            <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full" style={{ width: `${(totalDone / TOTAL_TOPICS) * 100}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)' }} />
            </div>
          </div>

          {/* Accuracy */}
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-2xl block mb-1">🎯</span>
            <p className="text-[26px] font-black text-white leading-none">
              {accuracy}<span className="text-[14px] text-white/25">%</span>
            </p>
            <p className="text-[11px] text-white/30 mt-1">accuracy</p>
            {lifetimeStats.questionsAnswered > 0 && (
              <p className="text-[9px] text-white/20 mt-1">
                {lifetimeStats.questionsCorrect}/{lifetimeStats.questionsAnswered} correct
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Subject Progress Rings ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/25 mb-3 px-1">
          Subject Overview
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {subjectProgress.map(({ subject: s, done, total }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const r = 16; const circ = 2 * Math.PI * r
            return (
              <button
                key={s.id}
                onClick={() => onSwitchToSyllabus(s.id)}
                className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: pct > 0 ? `${s.color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${pct > 0 ? s.color + '18' : 'rgba(255,255,255,0.04)'}`,
                }}>
                <div className="relative w-9 h-9">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                    {pct > 0 && (
                      <circle cx="18" cy="18" r={r} fill="none" stroke={s.color} strokeWidth="2.5"
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - pct / 100)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.7s ease-out' }} />
                    )}
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[13px]">{s.icon}</span>
                </div>
                <span className="text-[8px] font-semibold text-white/35 text-center leading-tight line-clamp-1 w-full">
                  {s.shortTitle}
                </span>
                <span className="text-[8px] font-bold"
                  style={{ color: pct > 0 ? s.color : 'rgba(255,255,255,0.15)' }}>
                  {pct}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Explore Syllabus CTA ── */}
      <button
        onClick={() => onSwitchToSyllabus(UPSC_SYLLABUS[0].id)}
        className="w-full rounded-2xl p-4 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))',
          border: '1px solid rgba(99,102,241,0.18)',
        }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 4l4-2 4 2 4-2v10l-4 2-4-2-4 2V4z" />
          <path d="M6 2v10M10 4v10" />
        </svg>
        <span className="text-[13px] font-semibold text-indigo-300">Explore Full Syllabus</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
          <path d="M4 2l4 4-4 4" />
        </svg>
      </button>

      {/* ── Map CTA ── */}
      <Link
        href="/map"
        className="flex items-center justify-center gap-2 w-full rounded-2xl p-3.5 transition-all hover:scale-[1.01]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
          <path d="M5 1.5v12M10 3.5v10" />
        </svg>
        <span className="text-[12px] text-white/40 font-medium">Ask your own question on the Map</span>
      </Link>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LearningJourney() {
  const [tab, setTab] = useState<'today' | 'syllabus'>('today')
  const [activeSubject, setActiveSubject] = useState(UPSC_SYLLABUS[0].id)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)
  const [practiceTopic, setPracticeTopic] = useState<LearningTopic | null>(null)
  const [celebration, setCelebration] = useState<{
    completedTopic: LearningTopic
    nextTopic: LearningTopic
  } | null>(null)
  const [newlyUnlockedId, setNewlyUnlockedId] = useState<string | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats>({ date: '', topicsStudied: [], questionsAnswered: 0, questionsCorrect: 0 })
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>({ questionsAnswered: 0, questionsCorrect: 0 })
  const [streak, setStreak] = useState(0)
  const pathRef = useRef<HTMLDivElement>(null)
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    setMounted(true)
    setProgress(loadProgress())
    setDailyStats(loadDailyStats())
    setLifetimeStats(loadLifetimeStats())
    setStreak(parseInt(localStorage.getItem('upsc-streak-v1') || '0'))
  }, [])

  const markStarted = useCallback((topicId: string) => {
    setProgress(prev => {
      const next = { ...prev, [topicId]: true }
      saveProgress(next)
      const today = new Date().toDateString()
      const lastDay = localStorage.getItem('upsc-last-day') || ''
      if (lastDay !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        const streak = parseInt(localStorage.getItem('upsc-streak-v1') || '0')
        const newStreak = lastDay === yesterday ? streak + 1 : 1
        localStorage.setItem('upsc-streak-v1', String(newStreak))
        localStorage.setItem('upsc-last-day', today)
      }
      return next
    })
  }, [])

  const subject = UPSC_SYLLABUS.find(s => s.id === activeSubject)!

  // Compute next topic for current practice
  const nextTopicForPractice = practiceTopic ? findNextTopic(practiceTopic.id, subject) : null

  function getCompletedForSubject(s: LearningSubject) {
    return s.units.flatMap(u => u.topics).filter(t => progress[t.id]).length
  }

  function getTotalForSubject(s: LearningSubject) {
    return s.units.flatMap(u => u.topics).length
  }

  // Handle practice completion → save stats → celebrate → open next topic
  const handlePracticeComplete = useCallback((sessionScore: { correct: number; total: number }) => {
    if (!practiceTopic) return

    const currentTopic = practiceTopic
    const next = findNextTopic(currentTopic.id, subject)

    // Mark current topic as done
    markStarted(currentTopic.id)

    // Update daily stats
    setDailyStats(prev => {
      const updated: DailyStats = {
        ...prev,
        date: todayStr(),
        topicsStudied: prev.topicsStudied.includes(currentTopic.id)
          ? prev.topicsStudied
          : [...prev.topicsStudied, currentTopic.id],
        questionsAnswered: prev.questionsAnswered + (sessionScore.total || 0),
        questionsCorrect: prev.questionsCorrect + (sessionScore.correct || 0),
      }
      saveDailyStats(updated)
      return updated
    })

    // Update lifetime stats
    if (sessionScore.total > 0) {
      setLifetimeStats(prev => {
        const updated: LifetimeStats = {
          questionsAnswered: prev.questionsAnswered + sessionScore.total,
          questionsCorrect: prev.questionsCorrect + sessionScore.correct,
        }
        saveLifetimeStats(updated)
        return updated
      })
    }

    // Update streak
    setStreak(parseInt(localStorage.getItem('upsc-streak-v1') || '0'))

    // Close practice modal
    setPracticeTopic(null)

    if (next) {
      setCelebration({ completedTopic: currentTopic, nextTopic: next })
      setNewlyUnlockedId(next.id)
    }
  }, [practiceTopic, subject, markStarted])

  // When celebration ends, auto-open next topic
  const handleCelebrationDone = useCallback(() => {
    const next = celebration?.nextTopic
    setCelebration(null)

    if (next) {
      // Scroll to next topic
      const el = topicRefs.current[next.id]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      // Auto-open practice for next topic after scroll
      setTimeout(() => {
        setPracticeTopic(next)
      }, 500)
    }
  }, [celebration])

  // Today view handlers
  const handleStartFromToday = useCallback((topic: LearningTopic, subj: LearningSubject) => {
    setActiveSubject(subj.id)
    setPracticeTopic(topic)
  }, [])

  const handleSwitchToSyllabus = useCallback((subjectId: string) => {
    setActiveSubject(subjectId)
    setTab('syllabus')
    setTimeout(() => pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }, [])

  return (
    <>
      {/* Unlock Celebration Overlay */}
      {celebration && (
        <UnlockCelebration
          completedTopic={celebration.completedTopic}
          nextTopic={celebration.nextTopic}
          subject={subject}
          onDone={handleCelebrationDone}
        />
      )}

      {/* PYQ Practice Modal */}
      {practiceTopic && (
        <PYQPractice
          topic={practiceTopic}
          subject={subject}
          onClose={() => setPracticeTopic(null)}
          onComplete={handlePracticeComplete}
          nextTopic={nextTopicForPractice}
        />
      )}

      <section className="px-4 md:px-6 pb-12">
        <div className="max-w-4xl mx-auto">

          {/* ── Tab Bar ── */}
          <div className="sticky top-14 z-30 -mx-4 px-4 pt-3 pb-2 mb-4"
            style={{
              background: 'rgba(8,8,16,0.92)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
            <div className="flex gap-1.5 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setTab('today')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-300"
                style={{
                  background: tab === 'today' ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))' : 'transparent',
                  color: tab === 'today' ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                  boxShadow: tab === 'today' ? '0 2px 12px rgba(99,102,241,0.15)' : 'none',
                  border: tab === 'today' ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                }}>
                <span className="text-[14px]">{tab === 'today' ? '☀️' : '○'}</span>
                Today
              </button>
              <button
                onClick={() => {
                  setTab('syllabus')
                  setTimeout(() => pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-300"
                style={{
                  background: tab === 'syllabus' ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))' : 'transparent',
                  color: tab === 'syllabus' ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
                  boxShadow: tab === 'syllabus' ? '0 2px 12px rgba(99,102,241,0.15)' : 'none',
                  border: tab === 'syllabus' ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                }}>
                <span className="text-[14px]">{tab === 'syllabus' ? '📚' : '○'}</span>
                Syllabus
              </button>
            </div>
          </div>

          {/* ── Tab Content ── */}
          {tab === 'today' && mounted ? (
            <TodayView
              progress={progress}
              dailyStats={dailyStats}
              lifetimeStats={lifetimeStats}
              streak={streak}
              onStartTopic={handleStartFromToday}
              onSwitchToSyllabus={handleSwitchToSyllabus}
            />
          ) : tab === 'syllabus' ? (
            <>
              {/* ── Stats Bar ── */}
              {mounted && (
                <div className="mb-6">
                  <StatsBar progress={progress} />
                </div>
              )}

              {/* ── Subject Tabs ── */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
                {UPSC_SYLLABUS.map(s => (
                  <SubjectTab
                    key={s.id}
                    subject={s}
                    active={activeSubject === s.id}
                    completedTopics={mounted ? getCompletedForSubject(s) : 0}
                    totalTopics={getTotalForSubject(s)}
                    onClick={() => {
                      setActiveSubject(s.id)
                      setNewlyUnlockedId(null)
                      setTimeout(() => pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
                    }}
                  />
                ))}
              </div>

              {/* ── Subject Path ── */}
              <div ref={pathRef} className="flex flex-col">
                {/* Subject title row */}
                <div className="flex items-center gap-3 mb-7 px-1">
                  <span className="text-2xl">{subject.icon}</span>
                  <div>
                    <h3 className="text-[16px] font-bold text-white/90">{subject.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{ background: `${subject.color}20`, color: subject.color }}>
                      {subject.paper}
                    </span>
                  </div>
                  <div className="flex-1 h-px"
                    style={{ background: `linear-gradient(to right, ${subject.color}30, transparent)` }} />
                  <span className="text-[11px] text-white/25">
                    {mounted ? getCompletedForSubject(subject) : 0}/{getTotalForSubject(subject)} done
                  </span>
                </div>

                {/* Units */}
                {subject.units.map(unit => {
                  const unitDone = unit.topics.filter(t => progress[t.id]).length
                  return (
                    <div key={unit.id} className="mb-10">
                      <UnitBanner
                        title={unit.title}
                        icon={unit.icon}
                        color={subject.color}
                        completedCount={mounted ? unitDone : 0}
                        totalCount={unit.topics.length}
                      />
                      <div className="flex flex-col">
                        {unit.topics.map((topic, ti) => {
                          const positions: ('left' | 'center' | 'right')[] = ['center', 'right', 'center', 'left', 'center', 'right', 'center', 'left']
                          const pos = positions[ti % positions.length]
                          const isDone = mounted ? !!progress[topic.id] : false
                          const locked = mounted ? !isTopicUnlocked(topic.id, subject, progress) && !isDone : false
                          const isNewlyUnlocked = topic.id === newlyUnlockedId && !isDone
                          const prevPos = ti > 0 ? positions[(ti - 1) % positions.length] : pos
                          const prevDone = ti > 0 ? !!progress[unit.topics[ti - 1].id] : true

                          return (
                            <div
                              key={topic.id}
                              className="flex flex-col"
                              ref={el => { topicRefs.current[topic.id] = el }}
                            >
                              {ti > 0 && (
                                <Connector
                                  color={subject.color}
                                  align={prevPos}
                                  isActive={prevDone || isDone}
                                  index={ti}
                                />
                              )}
                              <TopicNode
                                topic={topic}
                                subject={subject}
                                isDone={isDone}
                                isLocked={locked}
                                isNewlyUnlocked={isNewlyUnlocked}
                                position={pos}
                                index={ti}
                                onPractice={setPracticeTopic}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* End-of-subject CTA */}
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: `${subject.color}20`, border: `2px solid ${subject.color}40` }}>
                    🏆
                  </div>
                  <p className="text-[12px] text-white/40 text-center">
                    Completed {subject.shortTitle}?{' '}
                    <button
                      onClick={() => {
                        const idx = UPSC_SYLLABUS.findIndex(s => s.id === activeSubject)
                        const next = UPSC_SYLLABUS[(idx + 1) % UPSC_SYLLABUS.length]
                        setActiveSubject(next.id)
                        setNewlyUnlockedId(null)
                        pathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="font-semibold hover:opacity-80 transition-opacity"
                      style={{ color: subject.color }}
                    >
                      Move to next subject →
                    </button>
                  </p>
                </div>
              </div>

              {/* ── Open Full Map CTA ── */}
              <div className="mt-6 flex justify-center">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[13px] font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 20px rgba(99,102,241,0.28)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
                    <path d="M5 1.5v12M10 3.5v10" />
                  </svg>
                  Ask your own question on the Map
                </Link>
              </div>
            </>
          ) : null}

        </div>
      </section>
    </>
  )
}
