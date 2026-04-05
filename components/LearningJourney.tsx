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

// ── PYQ Practice Modal ────────────────────────────────────────────────────────

function PYQPractice({
  topic,
  subject,
  onClose,
  onComplete,
}: {
  topic: LearningTopic
  subject: LearningSubject
  onClose: () => void
  onComplete: () => void
}) {
  const [pyqs, setPyqs] = useState<PYQ[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    const keywords = topic.concepts.slice(0, 4).join(',')
    fetch(`/api/journey/pyqs?subject=${subject.id}&topic=${topic.id}&keywords=${encodeURIComponent(keywords)}&limit=5&_t=${Date.now()}`)
      .then(r => r.json())
      .then(d => { setPyqs(d.pyqs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [topic.id, subject.id, topic.concepts, fetchKey])

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

  const optionLabels = ['a', 'b', 'c', 'd'] as const
  const optionColors = {
    correct: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#86efac' },
    wrong: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5' },
    neutral: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.75)' },
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0f0f14, #0d0d12)',
          border: `1.5px solid ${subject.color}30`,
          maxHeight: '90vh',
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
                  <div key={i} className="rounded-full transition-all"
                    style={{
                      width: i === currentIdx ? 20 : 6,
                      height: 6,
                      background: i < currentIdx ? subject.color : i === currentIdx ? subject.color : 'rgba(255,255,255,0.15)',
                    }} />
                ))}
              </div>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
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
              <p className="text-[12px] text-white/30">Loading PYQs…</p>
            </div>
          ) : pyqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-[14px] text-white/60 font-medium">No PYQs found for this topic yet</p>
              <p className="text-[12px] text-white/30">Mark complete and move on, or explore on the map</p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={onComplete}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)` }}
                >
                  Mark Complete →
                </button>
                <Link
                  href={`/map?q=${encodeURIComponent(topic.mapQuery)}`}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/70 transition-all hover:text-white/90"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Open on Map
                </Link>
              </div>
            </div>
          ) : done ? (
            /* Score screen */
            <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
                style={{ background: `${subject.color}18`, border: `2px solid ${subject.color}40` }}>
                {score.correct === score.total ? '🏆' : score.correct > score.total / 2 ? '🌟' : '📚'}
              </div>
              <div>
                <p className="text-[28px] font-bold text-white">{score.correct}/{score.total}</p>
                <p className="text-[13px] text-white/45 mt-1">
                  {score.correct === score.total
                    ? 'Perfect score! Outstanding!'
                    : score.correct > score.total / 2
                      ? 'Good work! Keep going!'
                      : 'Review the topic and try again!'}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 mt-2 w-full max-w-xs">
                {/* Primary: Try again with new questions */}
                <button
                  onClick={() => {
                    setCurrentIdx(0)
                    setSelected(null)
                    setRevealed(false)
                    setScore({ correct: 0, total: 0 })
                    setDone(false)
                    setFetchKey(k => k + 1)
                  }}
                  className="w-full px-5 py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)` }}
                >
                  Try Again — New Questions ↻
                </button>
                {/* Secondary row */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => { setCurrentIdx(0); setSelected(null); setRevealed(false); setScore({ correct: 0, total: 0 }); setDone(false) }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/70 transition-all hover:text-white/90"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Retry Same
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/70 transition-all hover:text-white/90"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Done ✓
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Question */
            <div className="flex flex-col gap-5">
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
                        }}
                      >
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold mt-0.5 transition-all"
                          style={{
                            background: revealed && opt === current.answer
                              ? '#22c55e'
                              : revealed && opt === selected
                                ? '#ef4444'
                                : selected === opt
                                  ? subject.color
                                  : 'rgba(255,255,255,0.1)',
                            color: 'white',
                          }}
                        >
                          {opt.toUpperCase()}
                        </span>
                        <span className="text-[13px] leading-snug" style={{ color: colors.text }}>{text}</span>
                        {revealed && opt === current.answer && (
                          <span className="ml-auto flex-shrink-0 text-green-400 text-lg">✓</span>
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
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{isCorrect ? '🎉' : '💡'}</span>
                    <span className="text-[12px] font-bold" style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
                      {isCorrect ? 'Correct!' : `Correct answer: (${current.answer?.toUpperCase()})`}
                    </span>
                  </div>
                  {current.explanation && (
                    <p className="text-[12px] text-white/55 leading-relaxed">{current.explanation.slice(0, 350)}{current.explanation.length > 350 ? '…' : ''}</p>
                  )}
                </div>
              )}

              {/* Next button */}
              {revealed && (
                <button
                  onClick={handleNext}
                  className="self-end px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)` }}
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
  position,
  onStart,
  onPractice,
}: {
  topic: LearningTopic
  subject: LearningSubject
  isDone: boolean
  position: 'left' | 'center' | 'right'
  onStart: (id: string) => void
  onPractice: (topic: LearningTopic) => void
}) {
  const alignClass =
    position === 'left'
      ? 'self-start ml-2 sm:ml-8 md:ml-16'
      : position === 'right'
        ? 'self-end mr-2 sm:mr-8 md:mr-16'
        : 'self-center'

  return (
    <div className={`${alignClass} group flex flex-col gap-1`} style={{ minWidth: 210, maxWidth: 310 }}>
      <Link
        href={`/map?q=${encodeURIComponent(topic.mapQuery)}`}
        onClick={() => onStart(topic.id)}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
        style={{
          background: isDone
            ? `linear-gradient(135deg, ${subject.color}28, ${subject.color}18)`
            : 'rgba(255,255,255,0.04)',
          border: `2px solid ${isDone ? subject.color + '60' : 'rgba(255,255,255,0.09)'}`,
          boxShadow: isDone ? `0 4px 24px ${subject.color}18` : 'none',
        }}
      >
        {/* Icon bubble */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all"
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
        <div className="flex-1 min-w-0">
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
          </div>
        </div>
      </Link>

      {/* PYQ Practice button — shows below the node */}
      {topic.pyqFrequency !== 'low' && (
        <button
          onClick={() => onPractice(topic)}
          className="self-center flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
          style={{
            background: `${subject.color}14`,
            border: `1px solid ${subject.color}30`,
            color: subject.color,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="6" cy="6" r="5" />
            <path d="M4 6h4M6 4v4" />
          </svg>
          Practice PYQs
        </button>
      )}
    </div>
  )
}

// ── Connector dots ────────────────────────────────────────────────────────────

function Connector({ color, align }: { color: string; align: 'left' | 'center' | 'right' }) {
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
          style={{ width: 4, height: 4, background: `${color}40`, opacity: 1 - i * 0.25 }} />
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
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
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
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200"
      style={{
        background: active ? `${subject.color}20` : 'rgba(255,255,255,0.04)',
        color: active ? subject.color : 'rgba(255,255,255,0.45)',
        border: `1.5px solid ${active ? subject.color + '55' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: active ? `0 0 14px ${subject.color}18` : 'none',
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
              strokeLinecap="round" />
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
        <span className="text-lg leading-none">⚡</span>
        <div>
          <p className="text-[11px] font-semibold text-white/80">{done * 50} XP</p>
          <p className="text-[10px] text-white/30">total earned</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LearningJourney() {
  const [activeSubject, setActiveSubject] = useState(UPSC_SYLLABUS[0].id)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)
  const [practiceTopic, setPracticeTopic] = useState<LearningTopic | null>(null)
  const pathRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setProgress(loadProgress())
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

  function getCompletedForSubject(s: LearningSubject) {
    return s.units.flatMap(u => u.topics).filter(t => progress[t.id]).length
  }

  function getTotalForSubject(s: LearningSubject) {
    return s.units.flatMap(u => u.topics).length
  }

  return (
    <>
      {/* PYQ Practice Modal */}
      {practiceTopic && (
        <PYQPractice
          topic={practiceTopic}
          subject={subject}
          onClose={() => setPracticeTopic(null)}
          onComplete={() => {
            markStarted(practiceTopic.id)
            setPracticeTopic(null)
          }}
        />
      )}

      <section className="py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">

          {/* ── Section Header ── */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.22)' }}>
              🎯 Learning Journey
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Master the{' '}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #a5b4fc, #6366f1)' }}>
                Entire Syllabus
              </span>
            </h2>
            <p className="text-white/40 text-[14px] max-w-md mx-auto">
              Follow the path topic by topic. Click a topic to open the AI map, or hover to practice PYQs.
            </p>
          </div>

          {/* ── Stats Bar ── */}
          {mounted && (
            <div className="mb-8">
              <StatsBar progress={progress} />
            </div>
          )}

          {/* ── Subject Tabs ── */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
            {UPSC_SYLLABUS.map(s => (
              <SubjectTab
                key={s.id}
                subject={s}
                active={activeSubject === s.id}
                completedTopics={mounted ? getCompletedForSubject(s) : 0}
                totalTopics={getTotalForSubject(s)}
                onClick={() => {
                  setActiveSubject(s.id)
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
                      const prevPos = ti > 0 ? positions[(ti - 1) % positions.length] : pos

                      return (
                        <div key={topic.id} className="flex flex-col">
                          {ti > 0 && <Connector color={subject.color} align={prevPos} />}
                          <TopicNode
                            topic={topic}
                            subject={subject}
                            isDone={isDone}
                            position={pos}
                            onStart={markStarted}
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

        </div>
      </section>
    </>
  )
}
