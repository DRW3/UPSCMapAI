'use client'

import { useState, useEffect } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import {
  type TopicProgress,
  type CrownLevel,
  CROWN_COLORS,
  QUESTIONS_PER_CROWN,
} from '@/components/journey/types'

// ── Props ───────────────────────────────────────────────────────────────────────

interface TopicDetailSheetProps {
  topic: LearningTopic
  subject: LearningSubject
  progress: TopicProgress
  onClose: () => void
  onStartPractice: () => void
  onOpenMap: () => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function TopicDetailSheet({
  topic,
  subject,
  progress,
  onClose,
  onStartPractice,
  onOpenMap,
}: TopicDetailSheetProps) {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  function handleDismiss() {
    setDismissing(true)
    setTimeout(onClose, 300)
  }

  const color = subject.color
  const crown = progress.crownLevel
  const nextCrown = Math.min(5, crown + 1) as CrownLevel
  const correctNeeded = nextCrown * QUESTIONS_PER_CROWN
  const correctProgress = Math.min(progress.correctAnswers, correctNeeded)
  const progressPct = correctNeeded > 0 ? (correctProgress / correctNeeded) * 100 : 0
  const accuracy = progress.questionsAnswered > 0
    ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100)
    : 0

  const isCompleted = progress.state === 'completed'
  const isStarted = progress.state === 'started'
  const buttonLabel = isCompleted
    ? crown >= 5
      ? 'PRACTICE AGAIN'
      : 'LEVEL UP CROWN'
    : isStarted
      ? 'CONTINUE PRACTICE'
      : 'START PRACTICE'

  const difficultyLabel = topic.difficulty === 1 ? 'Easy' : topic.difficulty === 2 ? 'Medium' : 'Hard'
  const difficultyColor = topic.difficulty === 1 ? '#34d399' : topic.difficulty === 2 ? '#fbbf24' : '#f87171'
  const freqLabel = topic.pyqFrequency === 'high' ? 'Frequently Asked' : topic.pyqFrequency === 'medium' ? 'Sometimes Asked' : 'Rarely Asked'
  const freqColor = topic.pyqFrequency === 'high' ? '#f472b6' : topic.pyqFrequency === 'medium' ? '#fbbf24' : '#64748b'

  return (
    <>
      <style jsx global>{`
        @keyframes tds-slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes tds-slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        @keyframes tds-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tds-fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90]"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          animation: dismissing ? 'tds-fadeOut 0.3s ease forwards' : 'tds-fadeIn 0.25s ease forwards',
        }}
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[91] flex flex-col"
        style={{
          maxHeight: '80vh',
          borderRadius: '24px 24px 0 0',
          background: 'linear-gradient(180deg, rgba(18,18,28,0.98) 0%, rgba(12,12,20,0.99) 100%)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          animation: dismissing
            ? 'tds-slideDown 0.3s ease forwards'
            : visible
              ? 'tds-slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards'
              : 'none',
          transform: visible && !dismissing ? undefined : 'translateY(100%)',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="rounded-full" style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: 'none' }}>
          {/* Header: icon + title + subject */}
          <div className="flex items-start gap-4 pt-2 pb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${color}22 0%, ${color}0a 100%)`,
                border: `2px solid ${color}44`,
                boxShadow: `0 4px 16px ${color}15`,
              }}
            >
              {topic.icon}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-[18px] font-bold text-white/92 leading-tight">{topic.title}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg"
                  style={{ background: `${color}18`, color }}>
                  {subject.shortTitle} &middot; {subject.paper}
                </span>
              </div>
            </div>
            {/* Close */}
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          {/* Tags: difficulty + frequency */}
          <div className="flex gap-2 mb-5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: `${difficultyColor}12`, color: difficultyColor, border: `1px solid ${difficultyColor}25` }}>
              <DifficultyDots level={topic.difficulty} color={difficultyColor} />
              {difficultyLabel}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: `${freqColor}12`, color: freqColor, border: `1px solid ${freqColor}25` }}>
              <FireSmall color={freqColor} />
              {freqLabel}
            </span>
          </div>

          {/* Crown Progress */}
          {(isStarted || isCompleted) && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">👑</span>
                  <span className="text-[13px] font-bold" style={{ color: CROWN_COLORS[crown] }}>
                    Crown Level {crown}
                  </span>
                </div>
                {crown < 5 && (
                  <span className="text-[11px] text-white/35">
                    {correctProgress}/{correctNeeded} correct → Lv {nextCrown}
                  </span>
                )}
              </div>
              {crown < 5 && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: `linear-gradient(90deg, ${CROWN_COLORS[crown]}, ${CROWN_COLORS[nextCrown]})`,
                      boxShadow: `0 0 8px ${CROWN_COLORS[crown]}60`,
                    }}
                  />
                </div>
              )}
              {crown >= 5 && (
                <p className="text-[12px] text-white/40 mt-1">Legendary mastery achieved!</p>
              )}
              {/* Stats row */}
              <div className="flex gap-4 mt-3">
                <div>
                  <p className="text-[16px] font-bold text-white">{progress.questionsAnswered}</p>
                  <p className="text-[9px] text-white/30">Attempted</p>
                </div>
                <div>
                  <p className="text-[16px] font-bold text-white">{progress.correctAnswers}</p>
                  <p className="text-[9px] text-white/30">Correct</p>
                </div>
                <div>
                  <p className="text-[16px] font-bold" style={{ color: accuracy >= 70 ? '#34d399' : accuracy >= 40 ? '#fbbf24' : '#f87171' }}>
                    {accuracy}%
                  </p>
                  <p className="text-[9px] text-white/30">Accuracy</p>
                </div>
                <div>
                  <p className="text-[16px] font-bold" style={{ color: '#fbbf24' }}>{progress.xpEarned}</p>
                  <p className="text-[9px] text-white/30">XP Earned</p>
                </div>
              </div>
            </div>
          )}

          {/* Key Concepts */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2.5">Key Concepts</p>
            <div className="flex flex-wrap gap-2">
              {topic.concepts.map((concept) => (
                <span
                  key={concept}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-xl"
                  style={{ background: `${color}0c`, color: `${color}cc`, border: `1px solid ${color}20` }}
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>

          {/* Map Query Preview */}
          <button
            onClick={onOpenMap}
            className="w-full rounded-2xl p-4 flex items-center gap-3 mb-4 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px]"
              style={{ background: 'rgba(99,102,241,0.12)' }}>
              🗺️
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold text-indigo-300">Explore on Map</p>
              <p className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{topic.mapQuery}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(165,180,252,0.5)" strokeWidth="2" strokeLinecap="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>

          {/* Last Practiced */}
          {progress.lastPracticed && (
            <p className="text-[11px] text-white/25 text-center mb-4">
              Last practiced: {new Date(progress.lastPracticed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Action button (sticky bottom) */}
        <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={onStartPractice}
            className="w-full py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all hover:scale-[1.01] active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              boxShadow: `0 4px 24px ${color}35`,
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Helper sub-components ────────────────────────────────────────────────────────

function DifficultyDots({ level, color }: { level: 1 | 2 | 3; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(d => (
        <div key={d} className="rounded-full" style={{ width: 5, height: 5, background: d <= level ? color : 'rgba(255,255,255,0.15)' }} />
      ))}
    </div>
  )
}

function FireSmall({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C10.5 6 6 8.5 6 13c0 3.5 2.5 7 6 7s6-3.5 6-7c0-4.5-4.5-7-6-11z" fill={color} opacity={0.8} />
    </svg>
  )
}
