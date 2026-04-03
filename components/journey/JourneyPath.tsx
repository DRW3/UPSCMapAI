'use client'

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import type { LearningSubject, LearningTopic, LearningUnit } from '@/data/syllabus'
import {
  type TopicProgress, type NodeState, type CrownLevel,
  type UserProfile, type StudyDay,
  DEFAULT_TOPIC_PROGRESS, CROWN_COLORS,
} from '@/components/journey/types'

// ---------------------------------------------------------------------------
// Props & Internal types
// ---------------------------------------------------------------------------

export interface JourneyPathProps {
  subjects: LearningSubject[]
  progress: Record<string, TopicProgress>
  activeSubjectId: string | null
  onNodeTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onSubjectChange: (subjectId: string | null) => void
  profile: UserProfile | null
  studyCalendar?: StudyDay[]
  newlyUnlockedId?: string
  isPro?: boolean
  freeTopicIds?: string[]  // topic IDs the user has opened for free
}

interface FlatTopicNode {
  kind: 'topic'; topic: LearningTopic; unit: LearningUnit
  subject: LearningSubject; progress: TopicProgress; state: NodeState
  isFirstAvailable: boolean; globalIndex: number
}
interface UnitHeaderData {
  kind: 'unit'; unit: LearningUnit; subject: LearningSubject
  completedCount: number; totalCount: number
}
type ListItem = FlatTopicNode | UnitHeaderData

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
}

const PATH_LEFT = 30    // px from left for the vertical path line
const DOT_SIZE = 10     // dot on the path line
const CONNECTOR_W = 20  // horizontal line from dot to card

// ---------------------------------------------------------------------------
// CSS Keyframes
// ---------------------------------------------------------------------------

const KEYFRAMES = `
@keyframes jp-fadeUp {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes jp-pulse {
  0%, 100% { box-shadow: 0 0 4px 2px rgba(99,102,241,0.3); transform: scale(1); }
  50%      { box-shadow: 0 0 14px 6px rgba(99,102,241,0.5); transform: scale(1.15); }
}
@keyframes jp-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes jp-pathGlow {
  0%, 100% { opacity: 0.6; filter: brightness(1); }
  50%      { opacity: 1; filter: brightness(1.3); }
}
@keyframes jp-dotFlow {
  0%   { transform: translateY(-8px); opacity: 0; }
  50%  { opacity: 1; }
  100% { transform: translateY(8px); opacity: 0; }
}
@keyframes jp-borderPulse {
  0%, 100% { border-color: rgba(var(--pulse-rgb), 0.25); box-shadow: 0 0 12px 0 rgba(var(--pulse-rgb), 0.08); transform: scale(1); }
  50%      { border-color: rgba(var(--pulse-rgb), 0.55); box-shadow: 0 0 24px 4px rgba(var(--pulse-rgb), 0.20); transform: scale(1.005); }
}
@keyframes jp-completedPop {
  0%   { transform: scale(0.95); opacity: 0.7; }
  60%  { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes jp-slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes jp-newlyUnlocked {
  0% { transform: scale(0.8); opacity: 0; filter: brightness(2); }
  40% { transform: scale(1.05); opacity: 1; filter: brightness(1.5); }
  70% { transform: scale(0.98); filter: brightness(1.1); }
  100% { transform: scale(1); opacity: 1; filter: brightness(1); }
}
@keyframes jp-unlockGlow {
  0%, 100% { box-shadow: 0 0 20px 4px rgba(var(--glow-rgb), 0.3), 0 0 40px 8px rgba(var(--glow-rgb), 0.1); }
  50% { box-shadow: 0 0 30px 8px rgba(var(--glow-rgb), 0.5), 0 0 60px 16px rgba(var(--glow-rgb), 0.2); }
}
@keyframes jp-unlockShimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}
`

// ---------------------------------------------------------------------------
// ExamCountdownBanner
// ---------------------------------------------------------------------------

function ExamCountdownBanner({ profile, totalTopics, completedTopics }: {
  profile: UserProfile
  totalTopics: number
  completedTopics: number
}) {
  const now = new Date()
  const examDate = new Date(profile.examYear, 4, 25)
  const diffMs = examDate.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  const syllabusPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

  const totalPrepDays = Math.max(1, Math.ceil(
    (examDate.getTime() - new Date(profile.onboardedAt || now.toISOString()).getTime()) / (1000 * 60 * 60 * 24)
  ))
  const elapsedDays = Math.max(0, totalPrepDays - daysLeft)
  const expectedPercent = totalPrepDays > 0 ? Math.round((elapsedDays / totalPrepDays) * 100) : 0

  let paceLabel: string
  let paceColor: string
  let paceGradient: string

  if (syllabusPercent >= expectedPercent - 5) {
    paceLabel = 'On Track'
    paceColor = '#22c55e'
    paceGradient = 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.03) 100%)'
  } else if (syllabusPercent >= expectedPercent - 20) {
    paceLabel = 'Slightly Behind'
    paceColor = '#f97316'
    paceGradient = 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0.03) 100%)'
  } else {
    paceLabel = 'Needs Catch-up'
    paceColor = '#ef4444'
    paceGradient = 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.03) 100%)'
  }

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 14,
      background: paceGradient,
      border: `1px solid ${paceColor}20`,
      marginBottom: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      animation: 'jp-fadeUp 400ms cubic-bezier(0.16,1,0.3,1) both',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      <span style={{ fontSize: 13 }}>📅</span>
      <span style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.70)',
        fontWeight: 500,
        letterSpacing: '-0.01em',
      }}>
        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{daysLeft}</span> days to Prelims
        <span style={{ margin: '0 5px', opacity: 0.3 }}>&middot;</span>
        <span style={{ fontWeight: 600 }}>{syllabusPercent}%</span> done
        <span style={{ margin: '0 5px', opacity: 0.3 }}>&middot;</span>
        <span style={{ color: paceColor, fontWeight: 600 }}>{paceLabel}</span>
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubjectFilterPills
// ---------------------------------------------------------------------------

function SubjectFilterPills({ subjects, activeSubjectId, onSubjectChange, weakSubjectIds }: {
  subjects: LearningSubject[]
  activeSubjectId: string | null
  onSubjectChange: (id: string | null) => void
  weakSubjectIds: string[]
}) {
  const pillStyle = (active: boolean, color: string, rgb: string, isWeak: boolean): React.CSSProperties => ({
    height: 32,
    padding: '0 13px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    border: active
      ? `1px solid rgba(${rgb},0.4)`
      : isWeak
        ? '1px solid rgba(249,115,22,0.2)'
        : '1px solid rgba(255,255,255,0.06)',
    background: active
      ? `rgba(${rgb},0.14)`
      : isWeak
        ? 'rgba(249,115,22,0.04)'
        : 'rgba(255,255,255,0.02)',
    color: active ? color : isWeak ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)',
    boxShadow: active ? `0 0 12px rgba(${rgb},0.2)` : 'none',
    transition: 'all 200ms ease-out',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  })

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10, padding: '8px 0 10px',
      background: 'linear-gradient(to bottom, #050510 65%, transparent)',
    }}>
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
        padding: '0 4px', msOverflowStyle: 'none',
      }}>
        <button
          onClick={() => onSubjectChange(null)}
          style={{ ...pillStyle(activeSubjectId === null, '#818cf8', '99,102,241', false), padding: '0 15px', fontWeight: 600 }}
          aria-label="Show all subjects"
        >
          All
        </button>
        {subjects.map((s) => {
          const active = activeSubjectId === s.id
          const isWeak = weakSubjectIds.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => onSubjectChange(active ? null : s.id)}
              style={pillStyle(active, s.color, hexToRgb(s.color), isWeak)}
              aria-label={`Filter by ${s.shortTitle}`}
            >
              {s.icon} {s.shortTitle}
              {isWeak && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#f97316',
                  boxShadow: '0 0 4px rgba(249,115,22,0.5)',
                  flexShrink: 0, marginLeft: 2,
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnitHeader
// ---------------------------------------------------------------------------

function UnitHeader({ data }: { data: UnitHeaderData }) {
  const { unit, subject, completedCount, totalCount } = data
  const rgb = hexToRgb(subject.color)
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div style={{
      margin: '24px 0 10px',
      padding: '12px 16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.05)',
      position: 'relative',
      overflow: 'hidden',
      animation: 'jp-fadeUp 400ms cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* Gradient underline */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, rgba(${rgb},0.5), rgba(${rgb},0.1), transparent)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{subject.icon}</span>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'rgba(255,255,255,0.70)',
            letterSpacing: '-0.01em',
          }}>
            {unit.title}
          </span>
        </div>
        <span style={{
          fontSize: 11, color: `rgba(${rgb},0.8)`,
          background: `rgba(${rgb},0.08)`,
          padding: '3px 10px', borderRadius: 9999, fontWeight: 600,
        }}>
          {completedCount}/{totalCount} {pct > 0 && `(${pct}%)`}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TopicCard (the core card-based design)
// ---------------------------------------------------------------------------

function TopicCard({ node, onTap, isFirstAvailable, isNewlyUnlocked, needsPro }: {
  node: FlatTopicNode
  onTap: () => void
  isFirstAvailable: boolean
  isNewlyUnlocked?: boolean
  needsPro?: boolean
}) {
  const { topic, subject, state, progress: tp, globalIndex } = node
  const crown = tp.crownLevel
  const rgb = hexToRgb(subject.color)
  const difficultyDots = Array.from({ length: 3 }, (_, i) => i < topic.difficulty)
  const conceptsToShow = topic.concepts.slice(0, 4)

  const stateConfig = (() => {
    switch (state) {
      case 'locked':
        return {
          label: needsPro ? 'PRO' : 'Start',
          labelIcon: needsPro ? null : '\u2192',
          borderColor: needsPro ? 'rgba(139,92,246,0.20)' : `rgba(${rgb},0.30)`,
          dotColor: needsPro ? 'rgba(139,92,246,0.5)' : subject.color,
        }
      case 'available':
        return {
          label: isFirstAvailable ? 'Up Next — Tap to Start' : 'Start',
          labelIcon: '\u2192',
          borderColor: `rgba(${rgb},0.30)`,
          dotColor: subject.color,
        }
      case 'started':
        return {
          label: 'Continue',
          labelIcon: '\u2192',
          borderColor: `rgba(${rgb},0.20)`,
          dotColor: subject.color,
        }
      case 'completed':
        return {
          label: `Crown ${crown}`,
          labelIcon: null,
          borderColor: 'rgba(34,211,153,0.20)',
          dotColor: '#34d399',
        }
    }
  })()

  // Question count based on frequency + remaining to practice
  const totalQs = topic.pyqFrequency === 'high' ? 20 : topic.pyqFrequency === 'medium' ? 10 : 5
  const answered = tp.questionsAnswered || 0
  const remaining = Math.max(0, totalQs - answered)
  const progressPct = state === 'started' && crown > 0 ? (crown / 5) * 100 : 0

  // Path dot vertical connector is rendered by the parent; here we render the card
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        paddingLeft: PATH_LEFT - DOT_SIZE / 2,
        animation: isNewlyUnlocked && state === 'available'
          ? `jp-newlyUnlocked 0.8s cubic-bezier(0.16,1,0.3,1) both`
          : `jp-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both`,
        animationDelay: isNewlyUnlocked ? undefined : `${Math.min(globalIndex * 40, 600)}ms`,
        position: 'relative',
      }}
    >
      {/* Path dot */}
      <div
        style={{
          width: isNewlyUnlocked && state === 'available' ? DOT_SIZE + 4 : DOT_SIZE,
          height: isNewlyUnlocked && state === 'available' ? DOT_SIZE + 4 : DOT_SIZE,
          borderRadius: '50%',
          background: stateConfig.dotColor,
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
          boxShadow: isNewlyUnlocked && state === 'available'
            ? `0 0 14px 6px rgba(${rgb},0.6)`
            : (state === 'available' || state === 'locked') && isFirstAvailable
              ? `0 0 8px 3px rgba(${rgb},0.5)`
              : state === 'available'
                ? `0 0 6px 2px rgba(${rgb},0.3)`
                : state === 'locked' && needsPro
                  ? `0 0 4px 1px rgba(139,92,246,0.3)`
                  : state === 'locked'
                    ? `0 0 4px 1px rgba(${rgb},0.2)`
                    : state === 'completed'
                      ? '0 0 6px 2px rgba(34,211,153,0.3)'
                      : 'none',
          animation: isNewlyUnlocked && state === 'available'
            ? 'jp-pulse 1.5s ease-in-out infinite'
            : state === 'available' && isFirstAvailable
              ? 'jp-pulse 2s ease-in-out infinite'
              : state === 'available'
                ? 'jp-pulse 3s ease-in-out infinite'
                : undefined,
          transition: 'all 300ms ease-out',
        }}
      />

      {/* Horizontal connector */}
      <div style={{
        width: CONNECTOR_W,
        height: 2,
        flexShrink: 0,
        background: state === 'completed'
          ? `linear-gradient(90deg, rgba(34,211,153,0.4), rgba(34,211,153,0.1))`
          : state === 'available'
            ? `linear-gradient(90deg, rgba(${rgb},0.4), rgba(${rgb},0.1))`
            : state === 'started'
              ? `linear-gradient(90deg, rgba(${rgb},0.3), rgba(${rgb},0.08))`
              : state === 'locked' && needsPro
                ? `linear-gradient(90deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))`
                : state === 'locked'
                  ? `linear-gradient(90deg, rgba(${rgb},0.2), rgba(${rgb},0.05))`
                  : 'rgba(255,255,255,0.04)',
      }} />

      {/* Card body */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${topic.title}${needsPro ? ' (PRO)' : ''}`}
        onClick={onTap}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}
        className="active:scale-[0.98]"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '12px 14px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: state === 'available'
            ? `2px solid rgba(${rgb},0.45)`
            : state === 'started'
              ? `2px solid rgba(${rgb},0.30)`
              : `1.5px solid ${stateConfig.borderColor}`,
          borderLeft: state === 'available'
            ? `4px solid ${subject.color}`
            : state === 'started'
              ? `4px solid rgba(${rgb},0.50)`
              : state === 'completed'
                ? '4px solid rgba(34,211,153,0.50)'
                : state === 'locked' && needsPro
                  ? '4px solid rgba(139,92,246,0.30)'
                  : state === 'locked'
                    ? `4px solid rgba(${rgb},0.30)`
                    : undefined,
          opacity: needsPro ? 0.7 : 1,
          filter: 'none',
          boxShadow: state === 'available' && isFirstAvailable
            ? `0 0 20px rgba(${rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.06)`
            : state === 'available'
              ? `0 0 12px rgba(${rgb},0.10), inset 0 1px 0 rgba(255,255,255,0.04)`
              : state === 'completed'
                ? '0 0 8px rgba(34,211,153,0.08)'
                : state === 'locked'
                  ? `inset 0 1px 0 rgba(255,255,255,0.03)`
                  : 'none',
          cursor: 'pointer',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          // For the pulse animation on available cards
          ...(state === 'available' ? {
            // Use CSS custom property for the animation color
            ['--pulse-rgb' as string]: rgb,
            ['--glow-rgb' as string]: rgb,
            animation: isNewlyUnlocked
              ? 'jp-unlockGlow 2s ease-in-out 0.8s infinite'
              : isFirstAvailable
                ? 'jp-borderPulse 2.5s ease-in-out infinite'
                : undefined,
          } : {}),
        }}
      >
        {/* Top row: Icon + Title + Crown/Status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          {/* Icon circle */}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: state === 'locked'
              ? needsPro
                ? 'rgba(139,92,246,0.10)'
                : `rgba(${rgb},0.12)`
              : state === 'available'
                ? `rgba(${rgb},0.18)`
                : `rgba(${rgb},0.12)`,
            border: state === 'locked'
              ? needsPro
                ? '1px solid rgba(139,92,246,0.15)'
                : `1px solid rgba(${rgb},0.15)`
              : state === 'available'
                ? `1.5px solid rgba(${rgb},0.30)`
                : `1px solid rgba(${rgb},0.15)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
            boxShadow: state === 'available' ? `0 0 12px rgba(${rgb},0.15)` : 'none',
          }}>
            {topic.icon}
          </div>

          {/* Title + subtitle area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600,
              color: state === 'locked'
                ? 'rgba(255,255,255,0.75)'
                : state === 'completed'
                  ? 'rgba(255,255,255,0.75)'
                  : 'rgba(255,255,255,0.92)',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              letterSpacing: '-0.01em',
            }}>
              {topic.title}
            </div>

            {/* State label */}
            {stateConfig.label && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: state === 'completed'
                  ? CROWN_COLORS[crown as CrownLevel]
                  : state === 'available'
                    ? subject.color
                    : state === 'locked' && needsPro
                      ? '#a78bfa'
                      : state === 'locked'
                        ? subject.color
                        : 'rgba(255,255,255,0.50)',
                marginTop: 3,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                ...(state === 'available' && isFirstAvailable ? {
                  background: `rgba(${rgb},0.12)`,
                  padding: '2px 10px',
                  borderRadius: 8,
                  fontSize: 10,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase' as const,
                } : {}),
              }}>
                {state === 'completed' && (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 1 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {stateConfig.label}
                {'labelIcon' in stateConfig && stateConfig.labelIcon && (
                  <span style={{ fontSize: 12 }}>{stateConfig.labelIcon}</span>
                )}
              </span>
            )}
          </div>

          {/* Crown badge */}
          {crown > 0 && (
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              background: CROWN_COLORS[crown as CrownLevel],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${CROWN_COLORS[crown as CrownLevel]}55`,
              ...(crown === 5 ? {
                backgroundImage: 'linear-gradient(90deg, #f472b6, #c084fc, #f472b6)',
                backgroundSize: '200% 100%',
                animation: 'jp-shimmer 2s linear infinite',
              } : {}),
            }}>
              {crown === 5 ? '\u2605' : crown}
            </div>
          )}
        </div>

        {/* Bottom row: Tags, difficulty, PYQ */}
        {(
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: conceptsToShow.length > 0 ? 8 : 0 }}>
            {/* Subject tag */}
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: subject.color,
              background: `rgba(${rgb},0.08)`,
              padding: '2px 7px',
              borderRadius: 6,
              lineHeight: 1.4,
            }}>
              {subject.shortTitle}
            </span>

            {/* Difficulty dots */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {difficultyDots.map((filled, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: filled ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.12)',
                }} />
              ))}
            </div>

            {/* Question count */}
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.50)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '1px 7px',
              borderRadius: 6,
              lineHeight: 1.4,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 10 }}>📝</span> {totalQs} Qs
            </span>

            {/* Remaining to practice */}
            {answered > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: remaining === 0 ? '#34d399' : '#fbbf24',
                background: remaining === 0 ? 'rgba(34,211,153,0.08)' : 'rgba(251,191,36,0.08)',
                border: `1px solid ${remaining === 0 ? 'rgba(34,211,153,0.20)' : 'rgba(251,191,36,0.20)'}`,
                padding: '1px 7px',
                borderRadius: 6,
                lineHeight: 1.4,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {remaining === 0 ? '✓ Done' : `${remaining} left`}
              </span>
            )}
          </div>
        )}

        {/* Concepts as small tags */}
        {conceptsToShow.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {conceptsToShow.map((c, i) => (
              <span key={i} style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.40)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '2px 7px',
                borderRadius: 6,
                lineHeight: 1.3,
              }}>
                {c}
              </span>
            ))}
            {topic.concepts.length > 4 && (
              <span style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.25)',
                padding: '2px 4px',
              }}>
                +{topic.concepts.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Progress bar for started/completed */}
        {(state === 'started' || state === 'completed') && (
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 3,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{
              height: '100%',
              width: state === 'completed' ? '100%' : `${progressPct}%`,
              background: state === 'completed'
                ? 'linear-gradient(90deg, #34d399, #22c55e)'
                : `linear-gradient(90deg, ${subject.color}, rgba(${rgb},0.5))`,
              borderRadius: '0 2px 2px 0',
              transition: 'width 500ms ease-out',
            }} />
          </div>
        )}

        {/* Shimmer overlay for newly unlocked topics */}
        {isNewlyUnlocked && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '50%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            animation: 'jp-unlockShimmer 1.5s ease-in-out 0.8s',
            animationFillMode: 'both',
            pointerEvents: 'none', zIndex: 5,
          }} />
        )}

        {/* PRO badge */}
        {needsPro && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '3px 8px',
            borderRadius: 6,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
            border: '1px solid rgba(139,92,246,0.3)',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#a78bfa',
            zIndex: 5,
          }}>
            PRO
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JourneyPath({
  subjects,
  progress,
  activeSubjectId,
  onNodeTap,
  onSubjectChange,
  profile,
  newlyUnlockedId,
  isPro,
  freeTopicIds,
}: JourneyPathProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstAvailableRef = useRef<HTMLDivElement>(null)
  const newlyUnlockedRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { setReady(true) }, [])

  // Flatten subjects -> ListItems
  const items = useMemo<ListItem[]>(() => {
    const filtered = activeSubjectId
      ? subjects.filter((s) => s.id === activeSubjectId)
      : subjects
    const result: ListItem[] = []
    let gi = 0
    let foundFirst = false
    for (const subject of filtered) {
      for (const unit of subject.units) {
        let done = 0
        for (const t of unit.topics) {
          if ((progress[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed') done++
        }
        result.push({ kind: 'unit', unit, subject, completedCount: done, totalCount: unit.topics.length })
        for (const topic of unit.topics) {
          const tp = progress[topic.id] || DEFAULT_TOPIC_PROGRESS
          const isFA = !foundFirst && (tp.state === 'available' || tp.state === 'started')
          if (isFA) foundFirst = true
          result.push({
            kind: 'topic', topic, unit, subject, progress: tp,
            state: tp.state, isFirstAvailable: isFA, globalIndex: gi++,
          })
        }
      }
    }
    return result
  }, [subjects, progress, activeSubjectId])

  // Track completed topic IDs for path fill
  const completedIds = useMemo(() => {
    const s = new Set<string>()
    for (const it of items) {
      if (it.kind === 'topic' && it.state === 'completed') s.add(it.topic.id)
    }
    return s
  }, [items])

  // Total and completed counts for countdown banner
  const { totalTopics, completedTopics } = useMemo(() => {
    let total = 0, completed = 0
    for (const subject of subjects) {
      for (const unit of subject.units) {
        for (const t of unit.topics) {
          total++
          if ((progress[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed') completed++
        }
      }
    }
    return { totalTopics: total, completedTopics: completed }
  }, [subjects, progress])

  // Auto-scroll to first available or newly unlocked topic
  useEffect(() => {
    if (!ready) return
    const id = requestAnimationFrame(() => {
      const c = scrollRef.current
      if (!c) return
      // Prefer scrolling to newly unlocked topic if available
      const target = newlyUnlockedId ? newlyUnlockedRef.current : firstAvailableRef.current
      if (!target) return
      const cr = c.getBoundingClientRect()
      const nr = target.getBoundingClientRect()
      c.scrollTo({
        top: Math.max(0, c.scrollTop + nr.top - cr.top - 140),
        behavior: 'smooth',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [activeSubjectId, ready, newlyUnlockedId])

  const handleTap = useCallback(
    (n: FlatTopicNode) => onNodeTap(n.topic.id, n.topic, n.subject),
    [onNodeTap],
  )

  // Build segment data for path line coloring
  // We track whether each topic segment should be "filled" (completed)
  let prevTopicNode: FlatTopicNode | null = null

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          maxWidth: 440,
          margin: '0 auto',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 16px 120px',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
        }}
      >
        {/* Exam Countdown Banner */}
        {profile && profile.examYear && (
          <ExamCountdownBanner
            profile={profile}
            totalTopics={totalTopics}
            completedTopics={completedTopics}
          />
        )}

        <SubjectFilterPills
          subjects={subjects}
          activeSubjectId={activeSubjectId}
          onSubjectChange={onSubjectChange}
          weakSubjectIds={profile?.weakSubjects || []}
        />

        {/* Path container */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Vertical path line (base, dim) */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: PATH_LEFT + DOT_SIZE / 2 - 1.5,
            width: 3,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 2,
            zIndex: 0,
          }} />

          {items.map((item) => {
            if (item.kind === 'unit') {
              prevTopicNode = null
              return (
                <div key={`u-${item.unit.id}`} style={{ paddingLeft: PATH_LEFT + DOT_SIZE + CONNECTOR_W }}>
                  <UnitHeader data={item} />
                </div>
              )
            }

            const node = item
            const prevWasCompleted = prevTopicNode !== null && completedIds.has(prevTopicNode.topic.id)

            // Filled segment: vertical line between previous completed node and this node
            const showFilledSegment = prevTopicNode !== null && prevWasCompleted
            const isNewlyUnlocked = node.topic.id === newlyUnlockedId
            const nodeNeedsPro = !isPro && node.state !== 'completed' && node.state !== 'started' && !(freeTopicIds || []).includes(node.topic.id) && (freeTopicIds || []).length >= 2

            const el = (
              <div
                key={`t-${node.topic.id}`}
                ref={isNewlyUnlocked ? newlyUnlockedRef : node.isFirstAvailable ? firstAvailableRef : undefined}
                style={{ position: 'relative', marginBottom: 8 }}
              >
                {/* Filled path segment overlay if previous was completed */}
                {showFilledSegment && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    left: PATH_LEFT + DOT_SIZE / 2 - 1.5,
                    width: 3,
                    height: 8 + 12, // gap + partial into current node area
                    background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                    borderRadius: 2,
                    zIndex: 1,
                    boxShadow: '0 0 8px rgba(99,102,241,0.3)',
                    animation: 'jp-pathGlow 3s ease-in-out infinite',
                  }} />
                )}

                <TopicCard
                  node={node}
                  onTap={() => handleTap(node)}
                  isFirstAvailable={node.isFirstAvailable}
                  isNewlyUnlocked={isNewlyUnlocked}
                  needsPro={nodeNeedsPro}
                />
              </div>
            )

            prevTopicNode = node
            return el
          })}

          {/* Bottom spacer for scroll padding */}
          <div style={{ height: 40 }} />
        </div>
      </div>
    </>
  )
}
