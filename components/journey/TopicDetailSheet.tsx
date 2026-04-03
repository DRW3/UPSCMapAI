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
  // New engaging fields (optional for backward compat with cached notes)
  hook?: string
  timeline?: { year: string; event: string }[]
  comparison?: { title: string; headers: [string, string]; rows: [string, string][] } | null
  mnemonic?: string | null
  examTip?: string
  keyTakeaways?: string[]
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

  // Topic image from Wikipedia
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageDesc, setImageDesc] = useState<string>('')

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

  // Fetch topic image + description from Wikipedia API
  useEffect(() => {
    const imgCacheKey = `upsc-img-${topic.id}`
    const cached = localStorage.getItem(imgCacheKey)
    if (cached && cached !== 'none') {
      try {
        const parsed = JSON.parse(cached)
        setImageUrl(parsed.url)
        setImageDesc(parsed.desc || '')
      } catch {
        setImageUrl(cached)
      }
      return
    }
    if (cached === 'none') return

    const wikiTitle = topic.title.replace(/ /g, '_')
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`)
      .then(r => r.json())
      .then(data => {
        const src = data?.thumbnail?.source || data?.originalimage?.source || null
        if (src) {
          const largerSrc = src.replace(/\/\d+px-/, '/600px-')
          const desc = data?.description || data?.extract?.slice(0, 80) || ''
          setImageUrl(largerSrc)
          setImageDesc(desc)
          localStorage.setItem(imgCacheKey, JSON.stringify({ url: largerSrc, desc }))
        } else {
          localStorage.setItem(imgCacheKey, 'none')
        }
      })
      .catch(() => localStorage.setItem(imgCacheKey, 'none'))
  }, [topic.id, topic.title])

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

  // Fallback UPSC relevance text based on PYQ frequency
  const fallbackRelevance =
    freq === 'high'
      ? `This topic appears frequently in UPSC ${subject.paper}. Focus on key facts, dates, and analytical angles for both Prelims and Mains.`
      : freq === 'medium'
        ? `This topic has appeared in past UPSC papers for ${subject.paper}. Understanding core concepts will help across multiple questions.`
        : `While not frequently asked directly, this topic builds foundational understanding for ${subject.paper} and may appear as part of broader questions.`

  // Map relevance regex for inline map buttons
  const MAP_REGEX = /map|locat|region|river|site|city|cities|capital|border|coast|mountain|valley|penins|plateau|district|province|temple|fort|port/i

  // SVG ring for crown progress
  const ringSize = 48
  const ringStroke = 4
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (progressPct / 100) * ringCircumference

  // Track image error to hide the entire image container
  const [imageError, setImageError] = useState(false)

  // Active highlight explanation popover
  const [activeHighlight, setActiveHighlight] = useState<{ term: string; explanation: string } | null>(null)

  // Renders text with **bold** markers AND [[term||explanation]] highlight capsules
  function renderRichText(text: string, color: string): React.ReactNode {
    // Split on [[term||explanation]] pattern
    const parts = text.split(/(\[\[.*?\|\|.*?\]\])/g)

    return parts.map((part, i) => {
      const highlightMatch = part.match(/^\[\[(.*?)\|\|(.*?)\]\]$/)
      if (highlightMatch) {
        const [, term, explanation] = highlightMatch
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              setActiveHighlight(prev =>
                prev?.term === term ? null : { term, explanation }
              )
            }}
            style={{
              display: 'inline',
              padding: '2px 8px',
              margin: '0 1px',
              borderRadius: 99,
              background: `${color}15`,
              border: `1px solid ${color}30`,
              color: `${color}dd`,
              fontSize: 'inherit',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 150ms ease',
              lineHeight: 1.8,
            }}
          >
            {term}
            <span style={{
              display: 'inline-block',
              marginLeft: 3,
              fontSize: '0.7em',
              opacity: 0.6,
              verticalAlign: 'middle',
            }}>{'\u24D8'}</span>
          </span>
        )
      }

      // Apply bold parsing to non-highlight parts
      const boldParts = part.split(/\*\*(.*?)\*\*/g)
      return boldParts.map((bp, j) =>
        j % 2 === 1
          ? <strong key={`${i}-${j}`} style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>{bp}</strong>
          : <span key={`${i}-${j}`}>{bp}</span>
      )
    })
  }

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
        {/* 1. Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Scrollable content */}
        <div
          onScroll={() => { if (activeHighlight) setActiveHighlight(null) }}
          style={{
            flex: 1,
            overflowY: 'auto',
            scrollbarWidth: 'none' as const,
            paddingBottom: 16,
          }}
        >
          {/* 2. Compact header row */}
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

          {/* 3. Image with description */}
          {imageUrl && !imageError && (
            <div style={{
              margin: '0 20px 16px',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              position: 'relative',
              animation: 'tds-cardIn 0.4s ease 0.12s both',
            }}>
              <img
                src={imageUrl}
                alt={topic.title}
                style={{
                  width: '100%',
                  height: 160,
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={() => setImageError(true)}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '20px 12px 8px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                {imageDesc ? (
                  <span style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.4,
                    flex: 1,
                    minWidth: 0,
                  }}>
                    {imageDesc}
                  </span>
                ) : (
                  <span />
                )}
                <span style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.35)',
                  fontWeight: 600,
                  flexShrink: 0,
                  padding: '2px 5px',
                  borderRadius: 4,
                  background: 'rgba(0,0,0,0.3)',
                  letterSpacing: '0.03em',
                }}>
                  CC
                </span>
              </div>
            </div>
          )}

          {/* 4. UPSC Relevance Banner (moved to top) */}
          {notesLoading ? (
            <div style={{
              margin: '0 20px 16px',
              height: 60,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              animation: 'tds-shimmer 1.5s ease-in-out infinite',
            }} />
          ) : (
            <div style={{
              margin: '0 20px 16px',
              padding: '14px 16px',
              borderRadius: 14,
              background: `${color}0C`,
              border: `1px solid ${color}25`,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              animation: 'tds-cardIn 0.35s ease 0.1s both',
            }}>
              <span style={{ fontSize: 20 }}>{'\uD83C\uDFAF'}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: `${color}dd`, margin: '0 0 4px' }}>
                  Why This Matters for UPSC
                </p>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.68)', margin: 0 }}>
                  {notes?.upscRelevance || fallbackRelevance}
                </p>
              </div>
            </div>
          )}

          {/* 5. Stat pills row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '0 20px',
              marginBottom: 16,
              animation: 'tds-cardIn 0.3s ease 0.15s both',
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
          <div style={{ padding: '0 20px', animation: 'tds-cardIn 0.35s ease 0.2s both' }}>

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
            {!notesLoading && notes && (() => {
              const wordCount = [notes.summary, ...(notes.keyPoints || []), ...(notes.importantFacts || []), notes.hook || '', notes.examTip || '', ...(notes.keyTakeaways || [])].join(' ').split(/\s+/).length
              const readTime = Math.max(2, Math.ceil(wordCount / 200))
              return (
              <>
                {/* A. Read Time Estimate */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 16,
                    animation: 'tds-cardIn 0.3s ease 0.2s both',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.35)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '4px 12px',
                      borderRadius: 99,
                    }}
                  >
                    {'\uD83D\uDCD6'} ~{readTime} min read
                  </span>
                </div>

                {/* B. Hook Card */}
                {notes.hook && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      borderRadius: 16,
                      background: 'rgba(79,209,197,0.06)',
                      border: '1px solid rgba(79,209,197,0.15)',
                      borderLeft: '3px solid rgba(79,209,197,0.5)',
                      animation: 'tds-cardIn 0.3s ease 0.25s both',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#4FD1C5', margin: '0 0 8px' }}>
                      {'\uD83D\uDCA1'} Did You Know?
                    </p>
                    <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', margin: 0, letterSpacing: '-0.01em' }}>
                      {renderRichText(notes.hook, color)}
                    </p>
                  </div>
                )}

                {/* C. Summary Card */}
                <div
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 20,
                    animation: 'tds-cardIn 0.3s ease 0.3s both',
                  }}
                >
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', margin: 0, letterSpacing: '-0.01em' }}>
                    {renderRichText(notes.summary, color)}
                  </p>
                </div>

                {/* D. Timeline */}
                {notes.timeline && notes.timeline.length > 0 && (
                  <div style={{ marginBottom: 20, animation: 'tds-cardIn 0.3s ease 0.35s both' }}>
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
                      <span style={{ fontSize: 16 }}>{'\uD83D\uDCC5'}</span> Timeline
                    </h3>
                    <div
                      style={{
                        padding: '16px 16px 16px 16px',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        position: 'relative' as const,
                      }}
                    >
                      {/* Vertical line */}
                      <div
                        style={{
                          position: 'absolute' as const,
                          left: 36,
                          top: 20,
                          bottom: 20,
                          width: 2,
                          background: `${color}4D`,
                          borderRadius: 1,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {notes.timeline.map((entry, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 12,
                              paddingLeft: 24,
                              position: 'relative' as const,
                              animation: `tds-cardIn 0.3s ease ${0.4 + idx * 0.05}s both`,
                            }}
                          >
                            {/* Circle dot */}
                            <div
                              style={{
                                position: 'absolute' as const,
                                left: 16,
                                top: 5,
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: color,
                                boxShadow: `0 0 6px ${color}40`,
                                flexShrink: 0,
                              }}
                            />
                            {/* Year badge */}
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color,
                                background: `${color}15`,
                                padding: '2px 10px',
                                borderRadius: 99,
                                minWidth: 70,
                                textAlign: 'center' as const,
                                flexShrink: 0,
                                marginLeft: 8,
                              }}
                            >
                              {entry.year}
                            </span>
                            {/* Event */}
                            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                              {entry.event}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* E. Key Concepts (improved Key Points) */}
                {notes.keyPoints && notes.keyPoints.length > 0 && (
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
                      <span style={{ fontSize: 16 }}>{'\uD83D\uDCCC'}</span> Key Concepts
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notes.keyPoints.map((point, idx) => {
                        const hasMapRelevance = MAP_REGEX.test(point)
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              padding: '14px 16px',
                              borderRadius: 14,
                              background: 'rgba(255,255,255,0.025)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderLeft: `3px solid ${color}60`,
                              animation: `tds-cardIn 0.3s ease ${0.25 + idx * 0.05}s both`,
                            }}
                          >
                            <div style={{ display: 'flex', gap: 12 }}>
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
                                }}
                              >
                                {idx + 1}
                              </span>
                              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
                                {renderRichText(point, color)}
                              </p>
                            </div>
                            {hasMapRelevance && (
                              <button
                                onClick={onOpenMap}
                                style={{
                                  alignSelf: 'flex-end',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  background: 'rgba(129,140,248,0.08)',
                                  border: '1px solid rgba(129,140,248,0.20)',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: '#818cf8',
                                }}
                              >
                                {'\uD83D\uDDFA\uFE0F'} View on Map
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* F. Comparison Table */}
                {notes.comparison && notes.comparison.rows && notes.comparison.rows.length > 0 && (
                  <div style={{ marginBottom: 20, animation: 'tds-cardIn 0.3s ease 0.4s both' }}>
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
                      <span style={{ fontSize: 16 }}>{'\uD83D\uDCCA'}</span> {notes.comparison.title || 'Comparison'}
                    </h3>
                    <div
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {/* Header row */}
                      <div
                        style={{
                          display: 'flex',
                          background: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {notes.comparison.headers.map((header, hIdx) => (
                          <div
                            key={hIdx}
                            style={{
                              flex: 1,
                              padding: '12px 14px',
                              fontSize: 12,
                              fontWeight: 700,
                              color,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.03em',
                            }}
                          >
                            {header}
                          </div>
                        ))}
                      </div>
                      {/* Body rows */}
                      {notes.comparison.rows.map((row, rIdx) => (
                        <div
                          key={rIdx}
                          style={{
                            display: 'flex',
                            background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          {row.map((cell, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                flex: 1,
                                padding: '12px 14px',
                                fontSize: 13,
                                lineHeight: 1.5,
                                color: 'rgba(255,255,255,0.72)',
                              }}
                            >
                              {cell}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* G. Mnemonic Card */}
                {notes.mnemonic && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      borderRadius: 16,
                      background: 'rgba(183,148,244,0.06)',
                      border: '1px solid rgba(183,148,244,0.15)',
                      borderLeft: '3px solid rgba(183,148,244,0.5)',
                      animation: 'tds-cardIn 0.3s ease 0.45s both',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#B794F4', margin: '0 0 8px' }}>
                      {'\uD83E\uDDE0'} Memory Trick
                    </p>
                    <p
                      style={{
                        fontSize: 15,
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        lineHeight: 1.7,
                        color: 'rgba(255,255,255,0.85)',
                        margin: 0,
                      }}
                    >
                      {notes.mnemonic}
                    </p>
                  </div>
                )}

                {/* H. Quick Facts (improved) */}
                {notes.importantFacts && notes.importantFacts.length > 0 && (
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notes.importantFacts.map((fact, idx) => {
                        const colonIdx = fact.indexOf(':')
                        const hasLabel = colonIdx > 0 && colonIdx < 40
                        const label = hasLabel ? fact.slice(0, colonIdx) : null
                        const detail = hasLabel ? fact.slice(colonIdx + 1).trim() : fact
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: 'rgba(255,255,255,0.025)',
                              borderLeft: `2px solid ${color}66`,
                              animation: `tds-cardIn 0.3s ease ${0.35 + idx * 0.04}s both`,
                            }}
                          >
                            <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                              {label && (
                                <span style={{ fontWeight: 700, color }}>{label}: </span>
                              )}
                              {detail}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* I. Exam Tip Card */}
                {notes.examTip && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      borderRadius: 16,
                      background: 'rgba(246,173,85,0.06)',
                      border: '1px solid rgba(246,173,85,0.15)',
                      borderLeft: '3px solid rgba(246,173,85,0.5)',
                      animation: 'tds-cardIn 0.3s ease 0.5s both',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F6AD55', margin: '0 0 8px' }}>
                      {'\uD83C\uDFAF'} Exam Strategy
                    </p>
                    <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', margin: 0, letterSpacing: '-0.01em' }}>
                      {renderRichText(notes.examTip, color)}
                    </p>
                  </div>
                )}

                {/* J. Key Takeaways */}
                {notes.keyTakeaways && notes.keyTakeaways.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 16,
                      borderRadius: 16,
                      background: 'rgba(52,211,153,0.06)',
                      border: '1px solid rgba(52,211,153,0.15)',
                      animation: 'tds-cardIn 0.3s ease 0.55s both',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', margin: '0 0 10px' }}>
                      {'\u2705'} Remember This
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notes.keyTakeaways.map((takeaway, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ color: '#34d399', fontSize: 14, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{'\u2713'}</span>
                          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.80)', margin: 0 }}>
                            {takeaway}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* K. Connections */}
                {notes.connections && (
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.50)', margin: '0 0 16px' }}>
                    <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Related Topics: </span>
                    {notes.connections}
                  </p>
                )}
              </>
              )
            })()}

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
                        animation: `tds-cardIn 0.3s ease ${0.25 + idx * 0.06}s both`,
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

          {/* Highlight Explanation Popover */}
          {activeHighlight && (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                margin: '0 12px 8px',
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(15,15,30,0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: `1px solid ${color}30`,
                boxShadow: `0 -4px 24px rgba(0,0,0,0.4), 0 0 12px ${color}15`,
                zIndex: 10,
                animation: 'tds-cardIn 0.2s ease both',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 99,
                      background: `${color}20`,
                      border: `1px solid ${color}35`,
                      fontSize: 13,
                      fontWeight: 700,
                      color: `${color}ee`,
                    }}>
                      {activeHighlight.term}
                    </span>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: 'rgba(251,191,36,0.10)',
                      border: '1px solid rgba(251,191,36,0.20)',
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#fbbf24',
                      letterSpacing: '0.05em',
                    }}>
                      UPSC
                    </span>
                  </div>
                  <p style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.78)',
                    margin: 0,
                  }}>
                    {activeHighlight.explanation}
                  </p>
                </div>
                <button
                  onClick={() => setActiveHighlight(null)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {'\u2715'}
                </button>
              </div>
            </div>
          )}

          {/* 10. Crown Progress Section */}
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

        {/* 11. Sticky bottom CTA */}
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
