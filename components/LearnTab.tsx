'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UPSC_SYLLABUS, TOTAL_TOPICS, type LearningTopic, type LearningSubject } from '@/data/syllabus'

// ── Progress helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'upsc-journey-v1'

function loadProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveProgress(p: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* noop */ }
}

// ── PYQ Practice Inline ─────────────────────────────────────────────────────

interface PYQ {
  id: number; year: number; question: string
  options: { a: string; b: string; c: string; d: string } | null
  answer: string | null; explanation: string | null
  difficulty: string | null
}

function PYQPractice({ topic, subject, onClose, onComplete }: {
  topic: LearningTopic; subject: LearningSubject
  onClose: () => void; onComplete: () => void
}) {
  const [pyqs, setPyqs] = useState<PYQ[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/journey/pyqs?subject=${subject.id}&topic=${topic.id}&limit=5`)
      .then(r => r.json())
      .then(d => { setPyqs(d.pyqs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [topic.id, subject.id])

  const current = pyqs[idx]
  const isCorrect = revealed && selected === current?.answer
  const opts = ['a', 'b', 'c', 'd'] as const

  function handleSelect(opt: string) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    setScore(s => ({ correct: s.correct + (opt === current?.answer ? 1 : 0), total: s.total + 1 }))
  }

  function handleNext() {
    if (idx + 1 >= pyqs.length) { setDone(true) } else {
      setIdx(i => i + 1); setSelected(null); setRevealed(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: '#0f0f14',
          border: `1.5px solid ${subject.color}30`,
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">{topic.icon}</span>
            <div>
              <p className="text-[12px] font-bold text-white/90">{topic.title}</p>
              <p className="text-[10px] text-white/30">PYQ Practice</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!done && pyqs.length > 0 && (
              <span className="text-[10px] text-white/25">{idx + 1}/{pyqs.length}</span>
            )}
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${subject.color}40`, borderTopColor: subject.color }} />
              <p className="text-[11px] text-white/30">Generating questions...</p>
            </div>
          ) : pyqs.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-[13px] text-white/50">No questions available</p>
              <button onClick={onComplete}
                className="mt-2 px-4 py-2 rounded-xl text-[11px] font-semibold text-white"
                style={{ background: subject.color }}>
                Study on Map
              </button>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `${subject.color}18`, border: `2px solid ${subject.color}40` }}>
                {score.correct === score.total ? '🏆' : score.correct > score.total / 2 ? '🌟' : '📚'}
              </div>
              <p className="text-[24px] font-bold text-white">{score.correct}/{score.total}</p>
              <p className="text-[12px] text-white/40">
                {score.correct === score.total ? 'Perfect!' : score.correct > score.total / 2 ? 'Good work!' : 'Review and retry!'}
              </p>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setIdx(0); setSelected(null); setRevealed(false); setScore({ correct: 0, total: 0 }); setDone(false) }}
                  className="px-4 py-2 rounded-xl text-[11px] font-semibold text-white/60"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Retry
                </button>
                <button onClick={onComplete}
                  className="px-4 py-2 rounded-xl text-[11px] font-semibold text-white"
                  style={{ background: subject.color }}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Badges */}
              <div className="flex items-center gap-2">
                {current.year > 0 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: `${subject.color}18`, color: subject.color }}>
                    UPSC {current.year}
                  </span>
                )}
                {current.difficulty && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md text-white/35"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {current.difficulty}
                  </span>
                )}
              </div>

              <p className="text-[13px] text-white/85 leading-relaxed font-medium">{current.question}</p>

              {current.options && (
                <div className="flex flex-col gap-2">
                  {opts.map(opt => {
                    const text = current.options?.[opt]
                    if (!text) return null
                    const isAnswer = opt === current.answer
                    const isSelected = opt === selected
                    let bg = 'rgba(255,255,255,0.04)'
                    let border = 'rgba(255,255,255,0.1)'
                    let textColor = 'rgba(255,255,255,0.7)'
                    if (revealed && isAnswer) { bg = 'rgba(34,197,94,0.12)'; border = '#22c55e'; textColor = '#86efac' }
                    else if (revealed && isSelected) { bg = 'rgba(239,68,68,0.12)'; border = '#ef4444'; textColor = '#fca5a5' }
                    else if (isSelected && !revealed) { bg = `${subject.color}18`; border = `${subject.color}60` }
                    return (
                      <button key={opt} onClick={() => handleSelect(opt)} disabled={revealed}
                        className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all disabled:cursor-default"
                        style={{ background: bg, border: `1.5px solid ${border}` }}>
                        <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5"
                          style={{
                            background: revealed && isAnswer ? '#22c55e' : revealed && isSelected ? '#ef4444'
                              : isSelected ? subject.color : 'rgba(255,255,255,0.1)',
                            color: 'white',
                          }}>
                          {opt.toUpperCase()}
                        </span>
                        <span className="text-[12px] leading-snug" style={{ color: textColor }}>{text}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {revealed && current.explanation && (
                <div className="rounded-xl p-3.5"
                  style={{
                    background: isCorrect ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
                    {isCorrect ? '🎉 Correct!' : `💡 Answer: (${current.answer?.toUpperCase()})`}
                  </p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{current.explanation.slice(0, 300)}</p>
                </div>
              )}

              {revealed && (
                <button onClick={handleNext}
                  className="self-end px-5 py-2 rounded-xl text-[12px] font-semibold text-white hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{ background: subject.color }}>
                  {idx + 1 >= pyqs.length ? 'See Results' : 'Next →'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function LearnTab({
  onSendMessage,
}: {
  onSendMessage: (text: string) => void
}) {
  const [activeSubject, setActiveSubject] = useState(UPSC_SYLLABUS[0].id)
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)
  const [practiceTopic, setPracticeTopic] = useState<{ topic: LearningTopic; subject: LearningSubject } | null>(null)

  useEffect(() => { setMounted(true); setProgress(loadProgress()) }, [])

  const markDone = useCallback((topicId: string) => {
    setProgress(prev => {
      const next = { ...prev, [topicId]: true }
      saveProgress(next)
      // Update streak
      const today = new Date().toDateString()
      const lastDay = localStorage.getItem('upsc-last-day') || ''
      if (lastDay !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        const streak = parseInt(localStorage.getItem('upsc-streak-v1') || '0')
        localStorage.setItem('upsc-streak-v1', String(lastDay === yesterday ? streak + 1 : 1))
        localStorage.setItem('upsc-last-day', today)
      }
      return next
    })
  }, [])

  const subject = UPSC_SYLLABUS.find(s => s.id === activeSubject)!
  const totalDone = mounted ? Object.keys(progress).filter(k => progress[k]).length : 0
  const subjectDone = mounted ? subject.units.flatMap(u => u.topics).filter(t => progress[t.id]).length : 0
  const subjectTotal = subject.units.flatMap(u => u.topics).length
  const streak = mounted ? parseInt(typeof window !== 'undefined' ? localStorage.getItem('upsc-streak-v1') || '0' : '0') : 0
  const pct = Math.round((totalDone / TOTAL_TOPICS) * 100)

  return (
    <>
      {practiceTopic && (
        <PYQPractice
          topic={practiceTopic.topic}
          subject={practiceTopic.subject}
          onClose={() => setPracticeTopic(null)}
          onComplete={() => {
            markDone(practiceTopic.topic.id)
            setPracticeTopic(null)
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: '12px 14px' }}>

        {/* ── Stats Row ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 14, marginBottom: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Progress ring */}
          <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
              <circle cx="16" cy="16" r="12" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - pct / 100)}`}
                strokeLinecap="round" />
            </svg>
            <span style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#a5b4fc',
            }}>{pct}%</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              {totalDone}/{TOTAL_TOPICS} topics
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>syllabus coverage</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 8px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 13 }}>🔥</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{streak}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 8px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 13 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{totalDone * 50}</span>
          </div>
        </div>

        {/* ── Subject Tabs ── */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-thin">
          {UPSC_SYLLABUS.map(s => {
            const isActive = activeSubject === s.id
            const sDone = mounted ? s.units.flatMap(u => u.topics).filter(t => progress[t.id]).length : 0
            const sTotal = s.units.flatMap(u => u.topics).length
            const sPct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0
            return (
              <button
                key={s.id}
                onClick={() => setActiveSubject(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: isActive ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? `${s.color}55` : 'rgba(255,255,255,0.08)'}`,
                  color: isActive ? s.color : 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 12 }}>{s.icon}</span>
                <span className="hidden sm:inline">{s.shortTitle}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 5,
                  background: isActive ? `${s.color}25` : 'rgba(255,255,255,0.06)',
                  color: isActive ? s.color : 'rgba(255,255,255,0.3)',
                }}>
                  {sPct > 0 ? `${sPct}%` : s.paper}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Subject Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12, paddingLeft: 2,
        }}>
          <span style={{ fontSize: 18 }}>{subject.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              {subject.title}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {subjectDone}/{subjectTotal} completed
            </p>
          </div>
          {/* Progress bar */}
          <div style={{
            width: 60, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${subjectTotal > 0 ? (subjectDone / subjectTotal) * 100 : 0}%`,
              height: '100%', borderRadius: 2,
              background: subject.color,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* ── Topic List ── */}
        {subject.units.map(unit => (
          <div key={unit.id} style={{ marginBottom: 16 }}>
            {/* Unit header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 10, marginBottom: 6,
              background: `${subject.color}08`,
              border: `1px solid ${subject.color}18`,
            }}>
              <span style={{ fontSize: 12 }}>{unit.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', flex: 1 }}>
                {unit.title}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: subject.color, opacity: 0.7,
              }}>
                {mounted ? unit.topics.filter(t => progress[t.id]).length : 0}/{unit.topics.length}
              </span>
            </div>

            {/* Topics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 4 }}>
              {unit.topics.map(topic => {
                const isDone = mounted ? !!progress[topic.id] : false
                return (
                  <div
                    key={topic.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 12,
                      background: isDone ? `${subject.color}08` : 'transparent',
                      border: `1px solid ${isDone ? `${subject.color}20` : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Status indicator */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      background: isDone ? subject.color : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${isDone ? subject.color : 'rgba(255,255,255,0.12)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                          <path d="M2.5 6l2.5 2.5 4.5-5" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: 10 }}>{topic.icon}</span>
                      )}
                    </div>

                    {/* Title + difficulty */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: 600,
                        color: isDone ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        textDecorationColor: 'rgba(255,255,255,0.15)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {topic.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        {/* Difficulty dots */}
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3].map(d => (
                            <div key={d} style={{
                              width: 4, height: 4, borderRadius: '50%',
                              background: d <= topic.difficulty ? subject.color : 'rgba(255,255,255,0.12)',
                            }} />
                          ))}
                        </div>
                        {topic.pyqFrequency === 'high' && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, color: '#f59e0b',
                            padding: '0 4px', borderRadius: 3,
                            background: 'rgba(245,158,11,0.12)',
                          }}>
                            HOT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => setPracticeTopic({ topic, subject })}
                        title="Practice PYQs"
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <circle cx="6" cy="6" r="5" /><path d="M4 6h4M6 4v4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          markDone(topic.id)
                          onSendMessage(topic.mapQuery)
                        }}
                        title="Open on Map"
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: `${subject.color}18`,
                          border: `1px solid ${subject.color}35`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: subject.color,
                          transition: 'all 0.15s',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ height: 20 }} />
      </div>
    </>
  )
}
