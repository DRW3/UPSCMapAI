'use client'

import { useState, useEffect, useRef } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import {
  type TopicProgress,
  type CrownLevel,
  type UserProfile,
  CROWN_COLORS,
  QUESTIONS_PER_CROWN,
} from './types'

interface TopicDetailSheetProps {
  topic: LearningTopic
  subject: LearningSubject
  progress: TopicProgress
  profile: UserProfile | null
  onClose: () => void
  onStartPractice: () => void
  onOpenMap: () => void
}

export default function TopicDetailSheet({
  topic,
  subject,
  progress,
  profile,
  onClose,
  onStartPractice,
  onOpenMap,
}: TopicDetailSheetProps) {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  // Drag-to-dismiss
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)
  const isDragging = useRef(false)
  const [dragTranslate, setDragTranslate] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  function handleDismiss() {
    setDismissing(true)
    setTimeout(onClose, 350)
  }

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
    isDragging.current = true
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) {
      dragOffset.current = delta
      setDragTranslate(delta)
    }
  }

  function handleTouchEnd() {
    isDragging.current = false
    if (dragOffset.current > 120) {
      handleDismiss()
    } else {
      setDragTranslate(0)
      dragOffset.current = 0
    }
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

  const isFocusArea = profile?.weakSubjects?.includes(subject.id) ?? false

  const buttonLabel = isFocusArea && !isCompleted && !isStarted
    ? 'START FOCUS \u2192'
    : isCompleted ? 'PRACTICE AGAIN'
    : isStarted ? 'START PRACTICE \u2192'
    : 'START STUDYING \u2192'
  const buttonIsOutline = isCompleted

  const diffLevel = topic.difficulty
  const diffColor = diffLevel === 1 ? '#34d399' : diffLevel === 2 ? '#fbbf24' : '#f87171'
  const diffLabel = diffLevel === 1 ? 'Easy' : diffLevel === 2 ? 'Medium' : 'Hard'

  const freq = topic.pyqFrequency
  const freqColor = freq === 'high' ? '#f87171' : freq === 'medium' ? '#fbbf24' : 'rgba(255,255,255,0.35)'
  const freqLabel = freq === 'high' ? 'Frequently' : freq === 'medium' ? 'Sometimes' : 'Rarely'

  // Study tip based on PYQ frequency
  const studyTip = freq === 'high'
    ? { icon: '\u2B50', text: 'This topic appears frequently in UPSC Prelims. Focus on factual details and dates.' }
    : freq === 'medium'
    ? { icon: '\uD83D\uDCDD', text: 'This topic has been asked occasionally. Understand the key concepts and their applications.' }
    : { icon: '\uD83D\uDCA1', text: 'While less frequent in exams, understanding this topic builds a strong foundation.' }

  // SVG ring for crown progress
  const ringSize = 48
  const ringStroke = 4
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
        @keyframes tds-cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70]"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: dismissing ? 'tds-fadeOut 0.3s ease forwards' : 'tds-fadeIn 0.2s ease forwards',
        }}
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed bottom-0 left-0 right-0 z-[71] flex flex-col"
        style={{
          maxHeight: '85vh',
          borderRadius: '24px 24px 0 0',
          background: 'rgba(10,10,20,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          transform: visible && !dismissing
            ? `translateY(${dragTranslate}px)`
            : 'translateY(100%)',
          transition: isDragging.current ? 'none' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          animation: dismissing
            ? 'tds-slideDown 0.35s ease forwards'
            : visible && dragTranslate === 0
              ? 'tds-slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards'
              : 'none',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="rounded-full" style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Hero Section */}
        <div
          className="relative px-5 pt-4 pb-5 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${color}25, ${color}08)`,
          }}
        >
          {/* Decorative radial glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
            }}
          />
          <div className="flex flex-col items-center text-center relative">
            <div
              className="flex items-center justify-center mb-3"
              style={{ fontSize: 48, lineHeight: 1 }}
            >
              {topic.icon}
            </div>
            <h2
              className="text-[18px] font-bold leading-snug mb-2"
              style={{ color: 'rgba(255,255,255,0.95)' }}
            >
              {topic.title}
            </h2>
            <span
              className="text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{
                background: `${color}18`,
                color,
                border: `1px solid ${color}30`,
              }}
            >
              {subject.shortTitle}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4" style={{ scrollbarWidth: 'none' }}>

          {/* Quick Stats Row */}
          <div
            className="flex items-center justify-center gap-2 mb-5"
            style={{ animation: 'tds-cardIn 0.3s ease 0.1s both' }}
          >
            {/* Difficulty */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="flex gap-0.5">
                {[1, 2, 3].map(d => (
                  <span
                    key={d}
                    className="inline-block rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      background: d <= diffLevel ? diffColor : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: diffColor }}>{diffLabel}</span>
            </div>

            {/* PYQ Frequency */}
            <div
              className="flex items-center gap-1 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill={freqColor} opacity={0.85}>
                <path d="M12 2C10.5 6 6 8.5 6 13c0 3.5 2.5 7 6 7s6-3.5 6-7c0-4.5-4.5-7-6-11z" />
              </svg>
              <span className="text-[11px] font-semibold" style={{ color: freqColor }}>{freqLabel}</span>
            </div>

            {/* Focus badge */}
            {isFocusArea && (
              <div
                className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(249,115,22,0.10)',
                  border: '1px solid rgba(249,115,22,0.25)',
                }}
              >
                <span style={{ fontSize: 10, lineHeight: 1 }}>{'\uD83C\uDFAF'}</span>
                <span className="text-[11px] font-bold" style={{ color: '#f97316' }}>FOCUS</span>
              </div>
            )}
          </div>

          {/* Study Notes Section */}
          <div style={{ animation: 'tds-cardIn 0.35s ease 0.15s both' }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 16 }}>{'\uD83D\uDCD6'}</span>
              <h3 className="text-[14px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                What to Study
              </h3>
            </div>

            {/* Concept Cards Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {topic.concepts.map((concept, idx) => (
                <div
                  key={concept}
                  className="flex items-start gap-2.5 p-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `2px solid ${color}50`,
                    animation: `tds-cardIn 0.3s ease ${0.2 + idx * 0.04}s both`,
                  }}
                >
                  <span
                    className="flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      width: 20,
                      height: 20,
                      background: `${color}18`,
                      color: `${color}cc`,
                      marginTop: 1,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="text-[12px] font-medium leading-snug"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                  >
                    {concept}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Study Tip */}
          <div
            className="rounded-2xl p-4 mb-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.05)',
              animation: 'tds-cardIn 0.35s ease 0.25s both',
            }}
          >
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <span className="mr-1.5">{studyTip.icon}</span>
              {studyTip.text}
            </p>
          </div>

          {/* Crown Progress Section */}
          {hasProgress && (
            <div
              className="rounded-2xl p-4 mb-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'tds-cardIn 0.35s ease 0.3s both',
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'rgba(255,255,255,0.30)' }}
              >
                Your Progress
              </p>
              <div className="flex items-center gap-4">
                {/* Crown ring */}
                <div className="flex-shrink-0 relative">
                  <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={ringStroke}
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke={CROWN_COLORS[crown]}
                      strokeWidth={ringStroke}
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={crown >= 5 ? 0 : ringOffset}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center text-[14px]"
                    style={{ lineHeight: 1 }}
                  >
                    {'\uD83D\uDC51'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-bold" style={{ color: CROWN_COLORS[crown] }}>
                      Level {crown}/5
                    </span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{
                        color: accuracy >= 70 ? '#34d399' : accuracy >= 40 ? '#fbbf24' : '#f87171',
                      }}
                    >
                      {accuracy}% accuracy
                    </span>
                  </div>

                  {crown < 5 && (
                    <div
                      className="h-2 rounded-full overflow-hidden mb-1.5"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPct}%`,
                          background: `linear-gradient(90deg, ${CROWN_COLORS[crown]}, ${CROWN_COLORS[nextCrown]})`,
                          boxShadow: `0 0 8px ${CROWN_COLORS[crown]}40`,
                        }}
                      />
                    </div>
                  )}

                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {crown >= 5
                      ? 'Legendary mastery achieved'
                      : `${progress.questionsAnswered} questions answered`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Map Connection */}
          {topic.mapQuery && (
            <button
              onClick={onOpenMap}
              className="w-full rounded-2xl p-4 mb-4 text-left transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(129,140,248,0.06)',
                border: '1px solid rgba(129,140,248,0.15)',
                animation: 'tds-cardIn 0.35s ease 0.35s both',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ fontSize: 20 }}>{'\uD83D\uDDFA\uFE0F'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: '#818cf8' }}>
                    Visualize on Map
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(129,140,248,0.5)' }}>
                    {topic.mapQuery}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" opacity={0.6}>
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Sticky Bottom CTA */}
        <div
          className="px-5 pt-3"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={onStartPractice}
            className="w-full flex items-center justify-center gap-2 text-[15px] font-extrabold tracking-wide transition-all active:scale-[0.97]"
            style={{
              height: 56,
              borderRadius: 16,
              color: buttonIsOutline ? 'rgba(255,255,255,0.55)' : '#fff',
              background: buttonIsOutline
                ? 'transparent'
                : `linear-gradient(135deg, ${color}cc, ${color})`,
              border: buttonIsOutline
                ? '1.5px solid rgba(255,255,255,0.12)'
                : `1px solid ${color}40`,
              boxShadow: buttonIsOutline
                ? 'none'
                : `0 4px 24px ${color}35`,
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </>
  )
}
