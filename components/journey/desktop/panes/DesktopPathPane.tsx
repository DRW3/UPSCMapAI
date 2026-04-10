'use client'

import { useMemo, useState } from 'react'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { UPSC_SYLLABUS, type LearningSubject, type LearningTopic } from '@/data/syllabus'

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `${r},${g},${b}`
}

function stateBg(topicState: string, color: string): string {
  if (topicState === 'completed') return 'linear-gradient(135deg, rgba(52,211,153,0.04), rgba(255,255,255,0.02))'
  if (topicState === 'started')   return `linear-gradient(135deg, rgba(${hexToRgb(color)},0.05), rgba(255,255,255,0.02))`
  return 'rgba(255,255,255,0.025)'
}

function stateBorder(topicState: string, color: string): string {
  if (topicState === 'completed') return '1px solid rgba(52,211,153,0.18)'
  if (topicState === 'started')   return `1px solid rgba(${hexToRgb(color)},0.22)`
  return '1px solid rgba(255,255,255,0.06)'
}

// ── StateBadge ─────────────────────────────────────────────────────────────────

interface StateBadgeProps {
  topicState: string
  color: string
}

function StateBadge({ topicState, color }: StateBadgeProps) {
  let label: string
  let bg: string
  let textColor: string
  let border: string

  switch (topicState) {
    case 'completed':
      label = '✓ Done'
      bg = 'rgba(52,211,153,0.15)'
      textColor = '#6ee7b7'
      border = '1px solid rgba(52,211,153,0.25)'
      break
    case 'started':
      bg = `rgba(${hexToRgb(color)},0.15)`
      textColor = color
      border = `1px solid rgba(${hexToRgb(color)},0.25)`
      label = 'In progress'
      break
    case 'locked':
      label = '🔒'
      bg = 'rgba(255,255,255,0.06)'
      textColor = 'rgba(255,255,255,0.35)'
      border = '1px solid rgba(255,255,255,0.08)'
      break
    default: // available
      label = 'Open'
      bg = 'rgba(255,255,255,0.07)'
      textColor = 'rgba(255,255,255,0.55)'
      border = '1px solid rgba(255,255,255,0.10)'
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.03em',
      background: bg,
      color: textColor,
      border,
      lineHeight: 1.6,
    }}>
      {label}
    </span>
  )
}

// ── StrongFocusPill ────────────────────────────────────────────────────────────

interface StrongFocusPillProps {
  topic: LearningTopic
  subject: LearningSubject
  state: JourneyStateValue
  topicState: string
}

function StrongFocusPill({ topic, subject, state, topicState }: StrongFocusPillProps) {
  const { profile } = state
  const tp = state.progress.topics[topic.id]
  const accuracy = tp && tp.questionsAnswered > 0 ? tp.correctAnswers / tp.questionsAnswered : null
  const subjectIsWeak = !!profile?.weakSubjects?.includes(subject.id)

  const isStrong = topicState !== 'completed'
    && (tp?.questionsAnswered ?? 0) >= 5
    && accuracy !== null
    && accuracy >= 0.80

  const isFocusArea = topicState !== 'completed' && !isStrong && (
    subjectIsWeak ||
    ((tp?.questionsAnswered ?? 0) >= 5 && accuracy !== null && accuracy < 0.30)
  )

  if (isStrong) {
    return (
      <div
        aria-label="Strong topic — accuracy above 80%"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px 3px 6px', borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(34,197,94,0.12))',
          border: '1px solid rgba(52,211,153,0.35)',
          color: '#6ee7b7',
          flexShrink: 0,
          boxShadow: '0 1px 8px rgba(52,211,153,0.20), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3.2 3.2L13 5" stroke="#6ee7b7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
          textTransform: 'uppercase', lineHeight: 1,
        }}>Strong</span>
      </div>
    )
  }

  if (isFocusArea) {
    return (
      <div
        aria-label="Focus area — worth revisiting"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px 3px 6px', borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.10))',
          border: '1px solid rgba(251,191,36,0.35)',
          color: '#fcd34d',
          flexShrink: 0,
          boxShadow: '0 1px 8px rgba(251,191,36,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.2" stroke="#fcd34d" strokeWidth="1.8" />
          <circle cx="8" cy="8" r="2" fill="#fcd34d" />
        </svg>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
          textTransform: 'uppercase', lineHeight: 1,
        }}>Focus</span>
      </div>
    )
  }

  return null
}

// ── SubjectTopicGrid ───────────────────────────────────────────────────────────

interface SubjectTopicGridProps {
  subject: LearningSubject
  state: JourneyStateValue
}

function SubjectTopicGrid({ subject, state }: SubjectTopicGridProps) {
  const { enrichedTopicStates } = state
  const rgb = hexToRgb(subject.color)

  const totalTopics = subject.units.reduce((acc, u) => acc + u.topics.length, 0)

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Subject header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: `linear-gradient(135deg, ${subject.color}, rgba(${rgb},0.6))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.2,
        }}>
          {subject.icon} {subject.title}
        </h2>
        <p style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'rgba(255,255,255,0.40)',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          {totalTopics} topics · {subject.units.length} units · {subject.paper}
        </p>
      </div>

      {/* Units */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {subject.units.map(unit => (
          <div key={unit.id}>
            {/* Unit header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 15 }}>{unit.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.70)',
                letterSpacing: '0.01em',
                flex: 1,
              }}>
                {unit.title}
              </span>
              <span style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.30)',
                fontWeight: 500,
              }}>
                {unit.topics.length} topics
              </span>
            </div>

            {/* Topic card grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 10,
            }}>
              {unit.topics.map(topic => {
                const entry = enrichedTopicStates[topic.id]
                const topicState = entry?.state ?? 'locked'
                const isLocked = topicState === 'locked'

                return (
                  <div
                    key={topic.id}
                    role="button"
                    tabIndex={isLocked ? -1 : 0}
                    aria-label={`${topic.title} — ${topicState}`}
                    onClick={() => {
                      if (!isLocked) {
                        state.handleNodeTap(topic.id, topic, subject)
                      }
                    }}
                    onKeyDown={e => {
                      if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                        state.handleNodeTap(topic.id, topic, subject)
                      }
                    }}
                    style={{
                      background: stateBg(topicState, subject.color),
                      border: stateBorder(topicState, subject.color),
                      borderRadius: 12,
                      padding: '12px 12px 10px',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.45 : 1,
                      transition: 'transform 120ms ease-out, box-shadow 120ms ease-out',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      minHeight: 90,
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (!isLocked) {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.transform = 'translateY(-2px)'
                        el.style.boxShadow = `0 6px 20px rgba(${rgb},0.15)`
                      }
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.transform = 'none'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    {/* Top row: badge + strong/focus pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <StateBadge topicState={topicState} color={subject.color} />
                      <StrongFocusPill
                        topic={topic}
                        subject={subject}
                        state={state}
                        topicState={topicState}
                      />
                    </div>

                    {/* Topic icon + title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 2 }}>
                      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.3 }}>{topic.icon}</span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isLocked ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.85)',
                        lineHeight: 1.35,
                        letterSpacing: '0.01em',
                      }}>
                        {topic.title}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DesktopPathPane ────────────────────────────────────────────────────────────

interface Props {
  state: JourneyStateValue
}

export function DesktopPathPane({ state }: Props) {
  const { enrichedTopicStates, profile } = state

  // Default expand the user's first focus subject, fall back to first syllabus subject.
  const [expandedSubjectId, setExpandedSubjectId] = useState<string>(
    profile?.weakSubjects?.[0] ?? UPSC_SYLLABUS[0]?.id ?? ''
  )

  // Per-subject stats
  const subjectStats = useMemo(() => {
    return UPSC_SYLLABUS.map(s => {
      let total = 0, completed = 0
      for (const u of s.units) {
        for (const t of u.topics) {
          total++
          if (enrichedTopicStates[t.id]?.state === 'completed') completed++
        }
      }
      return { subject: s, total, completed, pct: total ? Math.round((completed / total) * 100) : 0 }
    })
  }, [enrichedTopicStates])

  const expandedSubject = UPSC_SYLLABUS.find(s => s.id === expandedSubjectId)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px minmax(0, 1fr)',
      gap: 22,
      animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both',
      height: '100%',
    }}>
      {/* LEFT: subject accordion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        {/* Header label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.40)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Subjects
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.30)',
          }}>
            {UPSC_SYLLABUS.length}
          </span>
        </div>

        {/* Subject accordion buttons */}
        {subjectStats.map(({ subject, total, completed, pct }) => {
          const isActive = expandedSubjectId === subject.id
          const rgb = hexToRgb(subject.color)
          const circumference = 2 * Math.PI * 9 // r=9
          const dashOffset = circumference * (1 - pct / 100)

          return (
            <button
              key={subject.id}
              onClick={() => setExpandedSubjectId(subject.id)}
              aria-pressed={isActive}
              aria-label={`${subject.shortTitle} — ${completed}/${total} done`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 11px',
                borderRadius: 10,
                border: isActive
                  ? `1px solid rgba(${rgb},0.30)`
                  : '1px solid rgba(255,255,255,0.05)',
                background: isActive
                  ? `linear-gradient(135deg, rgba(${rgb},0.12), rgba(${rgb},0.05))`
                  : 'rgba(255,255,255,0.025)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms ease-out',
                boxShadow: isActive
                  ? `0 2px 16px rgba(${rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.06)`
                  : 'none',
                flexShrink: 0,
              }}
            >
              {/* Subject icon */}
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>
                {subject.icon}
              </span>

              {/* Subject info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? subject.color : 'rgba(255,255,255,0.70)',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'color 150ms ease-out',
                }}>
                  {subject.shortTitle}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.30)',
                  fontWeight: 500,
                  marginTop: 2,
                  lineHeight: 1,
                }}>
                  {completed}/{total} done · {pct}%
                </div>
              </div>

              {/* Percentage circle */}
              <svg
                width={22}
                height={22}
                viewBox="0 0 22 22"
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                {/* Track */}
                <circle
                  cx={11} cy={11} r={9}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={2}
                />
                {/* Progress arc */}
                <circle
                  cx={11} cy={11} r={9}
                  fill="none"
                  stroke={pct > 0 ? subject.color : 'rgba(255,255,255,0.10)'}
                  strokeWidth={2}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 11 11)"
                  style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
                />
                {/* Percent text */}
                <text
                  x={11} y={11}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isActive ? subject.color : 'rgba(255,255,255,0.40)'}
                  fontSize={pct === 100 ? 6 : 5.5}
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  {pct}%
                </text>
              </svg>
            </button>
          )
        })}
      </div>

      {/* RIGHT: topic grid for the expanded subject */}
      <div style={{ overflowY: 'auto', paddingRight: 4 }}>
        {expandedSubject && (
          <SubjectTopicGrid subject={expandedSubject} state={state} />
        )}
      </div>
    </div>
  )
}
