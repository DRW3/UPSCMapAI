'use client'

import { useState, useEffect } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import {
  type TopicProgress,
  type CrownLevel,
  CROWN_COLORS,
  QUESTIONS_PER_CROWN,
} from './types'

interface TopicDetailSheetProps {
  topic: LearningTopic
  subject: LearningSubject
  progress: TopicProgress
  onClose: () => void
  onStartPractice: () => void
  onOpenMap: () => void
}

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
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  function handleDismiss() {
    setDismissing(true)
    setTimeout(onClose, 350)
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
  const hasProgress = isStarted || isCompleted

  const buttonLabel = isCompleted ? 'PRACTICE AGAIN' : isStarted ? 'CONTINUE' : 'START PRACTICE'
  const buttonIsOutline = isCompleted

  const diffLevel = topic.difficulty
  const diffColor = diffLevel === 1 ? '#34d399' : diffLevel === 2 ? '#fbbf24' : '#f87171'
  const diffLabel = diffLevel === 1 ? 'Easy' : diffLevel === 2 ? 'Medium' : 'Hard'

  const freq = topic.pyqFrequency
  const freqColor = freq === 'high' ? '#f87171' : freq === 'medium' ? '#fbbf24' : 'rgba(255,255,255,0.30)'
  const freqLabel = freq === 'high' ? 'Frequently Asked' : freq === 'medium' ? 'Sometimes Asked' : 'Rarely Asked'

  // SVG ring for crown progress
  const ringSize = 32
  const ringStroke = 3
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (progressPct / 100) * ringCircumference

  return (
    <>
      <style>{`
        @keyframes tds-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes tds-slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes tds-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tds-fadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70]"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: dismissing ? 'tds-fadeOut 0.3s ease forwards' : 'tds-fadeIn 0.2s ease forwards',
        }}
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 z-[71] flex flex-col"
        style={{
          maxHeight: '75vh',
          borderRadius: '24px 24px 0 0',
          background: 'rgba(10,10,20,0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          animation: dismissing
            ? 'tds-slideDown 0.35s ease forwards'
            : visible
              ? 'tds-slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards'
              : 'none',
          transform: visible && !dismissing ? undefined : 'translateY(100%)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="rounded-full" style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: 'none' }}>
          {/* Icon + Title + Subject */}
          <div className="flex items-center gap-3 pb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${color}20, ${color}08)`,
                border: `1.5px solid ${color}35`,
              }}
            >
              {topic.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
                {topic.title}
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color }}>{subject.shortTitle}</p>
            </div>
          </div>

          {/* Difficulty + PYQ Frequency */}
          <div className="flex items-center gap-3 mb-5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: diffColor }}>
              <span className="flex gap-0.5">
                {[1, 2, 3].map(d => (
                  <span key={d} className="inline-block rounded-full" style={{ width: 6, height: 6, background: d <= diffLevel ? diffColor : 'rgba(255,255,255,0.15)' }} />
                ))}
              </span>
              {diffLabel}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: freqColor }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={freqColor} opacity={0.8}>
                <path d="M12 2C10.5 6 6 8.5 6 13c0 3.5 2.5 7 6 7s6-3.5 6-7c0-4.5-4.5-7-6-11z" />
              </svg>
              {freqLabel}
            </span>
          </div>

          {/* Crown Progress Card */}
          {hasProgress && (
            <div
              className="rounded-[16px] p-4 mb-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Progress ring */}
                <svg width={ringSize} height={ringSize} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={ringStroke} />
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={CROWN_COLORS[crown]} strokeWidth={ringStroke} strokeLinecap="round"
                    strokeDasharray={ringCircumference} strokeDashoffset={crown >= 5 ? 0 : ringOffset} />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold" style={{ color: CROWN_COLORS[crown] }}>
                      Level {crown}/5
                    </span>
                    <span className="text-[12px] font-semibold" style={{ color: accuracy >= 70 ? '#34d399' : accuracy >= 40 ? '#fbbf24' : '#f87171' }}>
                      {accuracy}%
                    </span>
                  </div>
                  {crown < 5 && (
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${progressPct}%`,
                        background: `linear-gradient(90deg, ${CROWN_COLORS[crown]}, ${CROWN_COLORS[nextCrown]})`,
                        boxShadow: `0 0 6px ${CROWN_COLORS[crown]}50`,
                      }} />
                    </div>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    {crown >= 5 ? 'Legendary mastery achieved' : `${progress.questionsAnswered} questions answered`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Concepts */}
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Key Concepts
          </p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {topic.concepts.map((concept) => (
              <span
                key={concept}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: `${color}10`,
                  color: `${color}bb`,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {concept}
              </span>
            ))}
          </div>

          {/* Explore on Map link */}
          <button
            onClick={onOpenMap}
            className="flex items-center gap-1.5 mb-4 transition-opacity active:opacity-60"
          >
            <span className="text-[13px]">🗺️</span>
            <span className="text-[12px] font-semibold" style={{ color: '#818cf8' }}>Explore on Map</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </div>

        {/* CTA Button */}
        <div className="px-5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onStartPractice}
            className="w-full flex items-center justify-center gap-2 text-[15px] font-extrabold tracking-wide transition-all active:scale-[0.97]"
            style={{
              height: 56,
              borderRadius: 16,
              color: buttonIsOutline ? 'rgba(255,255,255,0.55)' : '#fff',
              background: buttonIsOutline
                ? 'transparent'
                : `linear-gradient(135deg, #6366f1, #8b5cf6)`,
              border: buttonIsOutline
                ? '1.5px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(99,102,241,0.2)',
              boxShadow: buttonIsOutline
                ? 'none'
                : '0 4px 24px rgba(99,102,241,0.3)',
            }}
          >
            {buttonLabel}
            {!buttonIsOutline && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
