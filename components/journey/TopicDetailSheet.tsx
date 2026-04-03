'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

interface StudyNotes {
  summary: string
  keyPoints: string[]
  importantFacts: string[]
  upscRelevance: string
  connections: string
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

  // Study notes state
  const [notes, setNotes] = useState<StudyNotes | null>(null)
  const [notesLoading, setNotesLoading] = useState(true)

  // Drag-to-dismiss
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)
  const isDragging = useRef(false)
  const [dragTranslate, setDragTranslate] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  // Fetch study notes with localStorage caching
  useEffect(() => {
    const cacheKey = `upsc-notes-${topic.id}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        setNotes(JSON.parse(cached))
        setNotesLoading(false)
        return
      } catch {
        // ignore bad cache
      }
    }

    const keywords = topic.concepts.slice(0, 6).join(',')
    fetch(
      `/api/journey/notes?topic=${topic.id}&subject=${subject.id}&title=${encodeURIComponent(topic.title)}&concepts=${encodeURIComponent(keywords)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.notes) {
          setNotes(data.notes)
          localStorage.setItem(cacheKey, JSON.stringify(data.notes))
        }
        setNotesLoading(false)
      })
      .catch(() => setNotesLoading(false))
  }, [topic.id, subject.id, topic.title, topic.concepts])

  const handleDismiss = useCallback(() => {
    setDismissing(true)
    setTimeout(onClose, 350)
  }, [onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    isDragging.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) {
      dragOffset.current = delta
      setDragTranslate(delta)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    if (dragOffset.current > 120) {
      handleDismiss()
    } else {
      setDragTranslate(0)
      dragOffset.current = 0
    }
  }, [handleDismiss])

  const color = subject.color
  const crown = progress.crownLevel
  const nextCrown = Math.min(5, crown + 1) as CrownLevel
  const correctNeeded = nextCrown * QUESTIONS_PER_CROWN
  const correctProgress = Math.min(progress.correctAnswers, correctNeeded)
  const progressPct = correctNeeded > 0 ? (correctProgress / correctNeeded) * 100 : 0
  const accuracy =
    progress.questionsAnswered > 0
      ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100)
      : 0

  const isCompleted = progress.state === 'completed'
  const isStarted = progress.state === 'started'
  const hasProgress = isStarted || isCompleted
  const isFocusArea = profile?.weakSubjects?.includes(subject.id) ?? false

  // Button label logic
  const buttonLabel = isCompleted
    ? 'PRACTICE AGAIN'
    : isStarted
      ? 'START PRACTICE \u2192'
      : isFocusArea
        ? 'START FOCUS \u2192'
        : 'START STUDYING \u2192'
  const buttonIsOutline = isCompleted

  const diffLevel = topic.difficulty
  const diffColor = diffLevel === 1 ? '#34d399' : diffLevel === 2 ? '#fbbf24' : '#f87171'
  const diffLabel = diffLevel === 1 ? 'Easy' : diffLevel === 2 ? 'Medium' : 'Hard'

  const freq = topic.pyqFrequency
  const freqColor =
    freq === 'high' ? '#f87171' : freq === 'medium' ? '#fbbf24' : 'rgba(255,255,255,0.35)'
  const freqLabel = freq === 'high' ? 'Frequently' : freq === 'medium' ? 'Sometimes' : 'Rarely'

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
        @keyframes tds-cardIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tds-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: dismissing
            ? 'tds-fadeOut 0.3s ease forwards'
            : 'tds-fadeIn 0.2s ease forwards',
        }}
      />

      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 71,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          borderRadius: '24px 24px 0 0',
          background: 'rgba(10,10,20,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          transform:
            visible && !dismissing
              ? `translateY(${dragTranslate}px)`
              : 'translateY(100%)',
          transition: isDragging.current
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          animation: dismissing
            ? 'tds-slideDown 0.35s ease forwards'
            : visible && dragTranslate === 0
              ? 'tds-slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards'
              : 'none',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            scrollbarWidth: 'none' as const,
            paddingBottom: 16,
          }}
        >
          {/* ── Compact Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 8px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `${color}18`,
                border: `1.5px solid ${color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              {topic.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.95)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {topic.title}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color,
                  marginTop: 2,
                  display: 'inline-block',
                }}
              >
                {subject.shortTitle} · {subject.paper}
              </span>
            </div>
          </div>

          {/* ── Stat Pills Row ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '0 20px',
              marginBottom: 16,
              animation: 'tds-cardIn 0.3s ease 0.1s both',
            }}
          >
            {/* Difficulty */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ display: 'flex', gap: 2 }}>
                {[1, 2, 3].map((d) => (
                  <span
                    key={d}
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: d <= diffLevel ? diffColor : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: diffColor }}>
                {diffLabel}
              </span>
            </div>

            {/* PYQ Frequency */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill={freqColor} opacity={0.85}>
                <path d="M12 2C10.5 6 6 8.5 6 13c0 3.5 2.5 7 6 7s6-3.5 6-7c0-4.5-4.5-7-6-11z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: freqColor }}>
                {freqLabel}
              </span>
            </div>

            {/* Focus badge */}
            {isFocusArea && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 99,
                  background: 'rgba(249,115,22,0.10)',
                  border: '1px solid rgba(249,115,22,0.25)',
                }}
              >
                <span style={{ fontSize: 10, lineHeight: 1 }}>{'\uD83C\uDFAF'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>
                  FOCUS
                </span>
              </div>
            )}
          </div>

          {/* ── Study Notes Section ── */}
          <div style={{ padding: '0 20px', animation: 'tds-cardIn 0.35s ease 0.15s both' }}>

            {/* Loading skeleton */}
            {notesLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {[48, 32, 32, 24].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: h,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      animation: `tds-shimmer 1.5s ease-in-out infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Notes loaded successfully */}
            {!notesLoading && notes && (
              <>
                {/* Summary Card */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 20,
                  }}
                >
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
                    {notes.summary}
                  </p>
                </div>

                {/* Key Points */}
                {notes.keyPoints.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.88)',
                        margin: '0 0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{'\uD83D\uDCCC'}</span> Key Points
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notes.keyPoints.map((point, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: '14px 16px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.025)',
                            borderLeft: `3px solid ${color}60`,
                            animation: `tds-cardIn 0.3s ease ${0.2 + idx * 0.06}s both`,
                          }}
                        >
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 8,
                              flexShrink: 0,
                              background: `${color}15`,
                              color: `${color}cc`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              marginTop: 1,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Facts */}
                {notes.importantFacts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.88)',
                        margin: '0 0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{'\u26A1'}</span> Quick Facts
                    </h3>
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {notes.importantFacts.map((fact, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: color,
                              marginTop: 7,
                            }}
                          />
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.68)', margin: 0 }}>
                            {fact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* UPSC Relevance Card */}
                {notes.upscRelevance && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      marginBottom: 20,
                      background: `${color}0A`,
                      border: `1px solid ${color}20`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 15, marginTop: 1 }}>{'\uD83C\uDFAF'}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: `${color}cc`, margin: '0 0 4px' }}>
                          Why This Matters for UPSC
                        </p>
                        <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                          {notes.upscRelevance}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connections */}
                {notes.connections && (
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.40)', marginBottom: 16, margin: '0 0 16px' }}>
                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Related Topics: </span>
                    {notes.connections}
                  </p>
                )}

                {/* Wikipedia Link */}
                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(topic.title.replace(/ /g, '_'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: 14,
                    marginBottom: 16,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{'\uD83D\uDCDA'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', margin: 0 }}>
                      Read more on Wikipedia
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                      Free, open-source reference
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity={0.5}
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </a>
              </>
            )}

            {/* Fallback: API failed, show concepts */}
            {!notesLoading && !notes && (
              <div style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.88)',
                    margin: '0 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{'\uD83D\uDCD6'}</span> Key Areas to Cover
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topic.concepts.map((concept, idx) => (
                    <div
                      key={concept}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.025)',
                        borderLeft: `3px solid ${color}60`,
                        animation: `tds-cardIn 0.3s ease ${0.2 + idx * 0.06}s both`,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: `${color}15`,
                          color: `${color}cc`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                          marginTop: 1,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                        {concept}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Map Card ── */}
          {topic.mapQuery && (
            <div style={{ padding: '0 20px' }}>
              <button
                onClick={onOpenMap}
                style={{
                  width: '100%',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  textAlign: 'left' as const,
                  background: 'rgba(129,140,248,0.06)',
                  border: '1px solid rgba(129,140,248,0.15)',
                  cursor: 'pointer',
                  animation: 'tds-cardIn 0.35s ease 0.35s both',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{'\uD83D\uDDFA\uFE0F'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', margin: 0 }}>
                      Visualize on Map
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'rgba(129,140,248,0.5)',
                        margin: '4px 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {topic.mapQuery}
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity={0.6}
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* ── Crown Progress Section ── */}
          {hasProgress && (
            <div style={{ padding: '0 20px' }}>
              <div
                style={{
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: 'tds-cardIn 0.35s ease 0.3s both',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.30)',
                    margin: '0 0 12px',
                  }}
                >
                  Your Progress
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Crown ring */}
                  <div style={{ flexShrink: 0, position: 'relative' as const, width: ringSize, height: ringSize }}>
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
                      style={{
                        position: 'absolute' as const,
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      {'\uD83D\uDC51'}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CROWN_COLORS[crown] }}>
                        Level {crown}/5
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color:
                            accuracy >= 70
                              ? '#34d399'
                              : accuracy >= 40
                                ? '#fbbf24'
                                : '#f87171',
                        }}
                      >
                        {accuracy}% accuracy
                      </span>
                    </div>

                    {crown < 5 && (
                      <div
                        style={{
                          height: 8,
                          borderRadius: 99,
                          overflow: 'hidden',
                          marginBottom: 6,
                          background: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 99,
                            width: `${progressPct}%`,
                            background: `linear-gradient(90deg, ${CROWN_COLORS[crown]}, ${CROWN_COLORS[nextCrown]})`,
                            boxShadow: `0 0 8px ${CROWN_COLORS[crown]}40`,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    )}

                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                      {crown >= 5
                        ? 'Legendary mastery achieved'
                        : `${progress.questionsAnswered} questions answered`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Bottom CTA ── */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={onStartPractice}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 56,
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              border: buttonIsOutline
                ? '1.5px solid rgba(255,255,255,0.12)'
                : `1px solid ${color}40`,
              color: buttonIsOutline ? 'rgba(255,255,255,0.55)' : '#fff',
              background: buttonIsOutline
                ? 'transparent'
                : `linear-gradient(135deg, ${color}cc, ${color})`,
              boxShadow: buttonIsOutline ? 'none' : `0 4px 24px ${color}35`,
            }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </>
  )
}
