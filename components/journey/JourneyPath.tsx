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
  pyqCounts?: Record<string, number>
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

/** Per-subject stats for the accordion headers */
interface SubjectStats {
  subject: LearningSubject
  completedCount: number
  totalCount: number
  items: ListItem[]
  firstAvailableTopic: LearningTopic | null
}

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
@keyframes jp-scanline {
  0%   { transform: translateX(-100%); opacity: 0; }
  50%  { opacity: 1; }
  100% { transform: translateX(200%); opacity: 0; }
}
@keyframes jp-ringPulse {
  0%, 100% { stroke-opacity: 0.8; filter: drop-shadow(0 0 2px rgba(var(--ring-rgb), 0.4)); }
  50%      { stroke-opacity: 1; filter: drop-shadow(0 0 6px rgba(var(--ring-rgb), 0.7)); }
}
@keyframes jp-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}
@keyframes jp-ctaPulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1; }
}
@keyframes jp-searchSlideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes jp-fabSlideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes jp-sectionExpand {
  from { opacity: 0; max-height: 0; transform: translateY(-8px); }
  40%  { opacity: 1; }
  to   { opacity: 1; max-height: 20000px; transform: translateY(0); }
}
@keyframes jp-heroGlow {
  0%, 100% { box-shadow: 0 0 30px rgba(var(--hero-rgb), 0.12), 0 4px 20px rgba(0,0,0,0.3); }
  50%      { box-shadow: 0 0 50px rgba(var(--hero-rgb), 0.22), 0 4px 20px rgba(0,0,0,0.3); }
}
@keyframes jp-heroPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}
@keyframes jp-gradientFlow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`

// ---------------------------------------------------------------------------
// ExamCountdownBanner (available for HomeTab use)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// SubjectFilterPills (kept for backward compat, but hidden when accordion is shown)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// ProgressRing -- SVG circular progress indicator around the topic icon
// ---------------------------------------------------------------------------

function ProgressRing({ size, stroke, progress, color, rgb, animate }: {
  size: number; stroke: number; progress: number; color: string; rgb: string; animate?: boolean
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(progress, 1) * circumference)

  return (
    <svg
      width={size} height={size}
      style={{
        position: 'absolute', top: 0, left: 0,
        transform: 'rotate(-90deg)',
        ...(animate ? { ['--ring-rgb' as string]: rgb, animation: 'jp-ringPulse 2.5s ease-in-out infinite' } : {}),
      }}
    >
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {/* Progress arc */}
      {progress > 0 && (
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 3px ${color}66)` }}
        />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// TopicCard (redesigned -- futuristic glass card)
// ---------------------------------------------------------------------------

function TopicCard({ node, onTap, isFirstAvailable, isNewlyUnlocked, needsPro, dbQuestionCount }: {
  node: FlatTopicNode
  onTap: () => void
  isFirstAvailable: boolean
  isNewlyUnlocked?: boolean
  needsPro?: boolean
  dbQuestionCount?: number
}) {
  const { topic, subject, state, progress: tp, globalIndex } = node
  const crown = tp.crownLevel
  const rgb = hexToRgb(subject.color)
  const conceptsToShow = topic.concepts.slice(0, 3)

  // PYQ data
  const dbCount = dbQuestionCount ?? 0
  const answered = tp.questionsAnswered || 0
  const pyqPct = dbCount > 0 ? Math.min(answered / dbCount, 1) : 0
  const crownPct = crown / 5

  // Difficulty label
  const diffLabel = topic.difficulty === 1 ? 'Easy' : topic.difficulty === 2 ? 'Medium' : 'Hard'
  const diffColor = topic.difficulty === 1 ? '#34d399' : topic.difficulty === 2 ? '#fbbf24' : '#f87171'

  // State-dependent config
  const dotColor = state === 'completed' ? '#34d399' : needsPro ? 'rgba(139,92,246,0.5)' : subject.color
  const isActive = state === 'available' || state === 'started'
  const isUpNext = state === 'available' && isFirstAvailable

  // Icon ring progress: for completed/started show crown progress, otherwise show PYQ progress
  const ringProgress = state === 'completed' ? 1 : state === 'started' ? crownPct : pyqPct
  const ringColor = state === 'completed' ? '#34d399' : subject.color

  // Card background gradient based on state
  const cardBg = state === 'completed'
    ? `linear-gradient(135deg, rgba(34,211,153,0.04) 0%, rgba(255,255,255,0.02) 100%)`
    : isUpNext
      ? `linear-gradient(135deg, rgba(${rgb},0.06) 0%, rgba(255,255,255,0.02) 100%)`
      : isActive
        ? `linear-gradient(135deg, rgba(${rgb},0.03) 0%, rgba(255,255,255,0.02) 100%)`
        : needsPro
          ? 'linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(255,255,255,0.015) 100%)'
          : 'rgba(255,255,255,0.025)'

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
      {/* -- Path dot -- */}
      <div style={{
        width: isNewlyUnlocked && state === 'available' ? DOT_SIZE + 4 : DOT_SIZE,
        height: isNewlyUnlocked && state === 'available' ? DOT_SIZE + 4 : DOT_SIZE,
        borderRadius: '50%',
        background: dotColor,
        flexShrink: 0, position: 'relative', zIndex: 2,
        boxShadow: isNewlyUnlocked && state === 'available'
          ? `0 0 14px 6px rgba(${rgb},0.6)`
          : isUpNext ? `0 0 8px 3px rgba(${rgb},0.5)`
          : state === 'available' ? `0 0 6px 2px rgba(${rgb},0.3)`
          : state === 'completed' ? '0 0 6px 2px rgba(34,211,153,0.3)'
          : needsPro ? `0 0 4px 1px rgba(139,92,246,0.3)`
          : `0 0 4px 1px rgba(${rgb},0.2)`,
        animation: isNewlyUnlocked && state === 'available' ? 'jp-pulse 1.5s ease-in-out infinite'
          : isUpNext ? 'jp-pulse 2s ease-in-out infinite'
          : state === 'available' ? 'jp-pulse 3s ease-in-out infinite'
          : undefined,
        transition: 'all 300ms ease-out',
      }} />

      {/* -- Connector line -- */}
      <div style={{
        width: CONNECTOR_W, height: 2, flexShrink: 0,
        background: state === 'completed'
          ? `linear-gradient(90deg, rgba(34,211,153,0.5), rgba(34,211,153,0.08))`
          : isActive
            ? `linear-gradient(90deg, rgba(${rgb},0.5), rgba(${rgb},0.08))`
            : needsPro
              ? `linear-gradient(90deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))`
              : `linear-gradient(90deg, rgba(${rgb},0.15), rgba(${rgb},0.03))`,
      }} />

      {/* -- Card body -- */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${topic.title}${needsPro ? ' (PRO)' : ''}`}
        onClick={onTap}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } }}
        className="active:scale-[0.98]"
        style={{
          flex: 1, minWidth: 0,
          padding: '14px 14px 12px',
          borderRadius: 18,
          background: cardBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isUpNext
            ? `1.5px solid rgba(${rgb},0.35)`
            : state === 'available'
              ? `1.5px solid rgba(${rgb},0.25)`
              : state === 'started'
                ? `1.5px solid rgba(${rgb},0.20)`
                : state === 'completed'
                  ? '1.5px solid rgba(34,211,153,0.15)'
                  : needsPro
                    ? '1.5px solid rgba(139,92,246,0.12)'
                    : `1.5px solid rgba(255,255,255,0.06)`,
          opacity: needsPro ? 0.65 : 1,
          boxShadow: isUpNext
            ? `0 4px 24px rgba(${rgb},0.12), 0 1px 0 rgba(255,255,255,0.06) inset`
            : state === 'available'
              ? `0 2px 16px rgba(${rgb},0.08), 0 1px 0 rgba(255,255,255,0.04) inset`
              : state === 'completed'
                ? '0 2px 12px rgba(34,211,153,0.06), 0 1px 0 rgba(255,255,255,0.04) inset'
                : '0 1px 0 rgba(255,255,255,0.03) inset',
          cursor: 'pointer',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          ...(state === 'available' ? {
            ['--pulse-rgb' as string]: rgb,
            ['--glow-rgb' as string]: rgb,
            animation: isNewlyUnlocked
              ? 'jp-unlockGlow 2s ease-in-out 0.8s infinite'
              : isUpNext
                ? 'jp-borderPulse 2.5s ease-in-out infinite'
                : undefined,
          } : {}),
        }}
      >
        {/* -- Top accent gradient line -- */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: state === 'completed'
            ? 'linear-gradient(90deg, rgba(34,211,153,0.6), rgba(34,211,153,0.1), transparent)'
            : isActive
              ? `linear-gradient(90deg, rgba(${rgb},0.7), rgba(${rgb},0.15), transparent)`
              : needsPro
                ? 'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(139,92,246,0.05), transparent)'
                : `linear-gradient(90deg, rgba(${rgb},0.2), rgba(${rgb},0.03), transparent)`,
          borderRadius: '18px 18px 0 0',
        }} />

        {/* -- Corner glow (top-left radial) -- */}
        {isActive && (
          <div style={{
            position: 'absolute', top: -20, left: -20, width: 80, height: 80,
            background: `radial-gradient(circle, rgba(${rgb},0.08) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}

        {/* -- Row 1: Icon with ring + Title + Crown/Status badge -- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          {/* Icon with progress ring */}
          <div style={{
            width: 44, height: 44, position: 'relative', flexShrink: 0,
            animation: isUpNext ? 'jp-float 3s ease-in-out infinite' : undefined,
          }}>
            <ProgressRing
              size={44} stroke={2.5}
              progress={ringProgress}
              color={ringColor}
              rgb={state === 'completed' ? '34,211,153' : rgb}
              animate={isUpNext}
            />
            <div style={{
              position: 'absolute', inset: 3,
              borderRadius: '50%',
              background: state === 'completed'
                ? 'rgba(34,211,153,0.10)'
                : isActive
                  ? `rgba(${rgb},0.12)`
                  : needsPro
                    ? 'rgba(139,92,246,0.08)'
                    : `rgba(${rgb},0.06)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {topic.icon}
            </div>
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 650,
              color: state === 'locked' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.92)',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              letterSpacing: '-0.02em',
            }}>
              {topic.title}
            </div>

            {/* Inline meta row: subject + difficulty */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: subject.color,
                background: `rgba(${rgb},0.10)`,
                padding: '1px 7px',
                borderRadius: 6,
                letterSpacing: '0.02em',
              }}>
                {subject.shortTitle}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: diffColor,
                opacity: 0.8,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {diffLabel}
              </span>
            </div>
          </div>

          {/* Right side: Crown badge OR state CTA */}
          {crown > 0 ? (
            <div style={{
              width: 30, height: 30, borderRadius: 10,
              background: `linear-gradient(135deg, ${CROWN_COLORS[crown as CrownLevel]}, ${CROWN_COLORS[crown as CrownLevel]}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
              flexShrink: 0,
              boxShadow: `0 2px 10px ${CROWN_COLORS[crown as CrownLevel]}44, 0 0 0 2px rgba(255,255,255,0.06) inset`,
              ...(crown === 5 ? {
                backgroundImage: 'linear-gradient(135deg, #f472b6, #c084fc, #818cf8, #f472b6)',
                backgroundSize: '300% 300%',
                animation: 'jp-shimmer 3s linear infinite',
              } : {}),
            }}>
              {crown === 5 ? '\u2605' : crown}
            </div>
          ) : isUpNext ? (
            <div style={{
              padding: '5px 12px',
              borderRadius: 10,
              background: `linear-gradient(135deg, rgba(${rgb},0.20), rgba(${rgb},0.10))`,
              border: `1px solid rgba(${rgb},0.25)`,
              fontSize: 10, fontWeight: 700,
              color: subject.color,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
              animation: 'jp-ctaPulse 2s ease-in-out infinite',
            }}>
              UP NEXT
            </div>
          ) : state === 'started' ? (
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <path d="M9 18l6-6-6-6" stroke={subject.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : needsPro ? (
            <div style={{
              padding: '4px 8px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.20), rgba(139,92,246,0.20))',
              border: '1px solid rgba(139,92,246,0.25)',
              fontSize: 9, fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#a78bfa',
              flexShrink: 0,
            }}>
              PRO
            </div>
          ) : (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.25 }}>
              <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* -- Row 2: PYQ progress bar + concepts -- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* PYQ mini progress section */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Progress bar track */}
            <div style={{
              height: 4, borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: 5,
            }}>
              <div style={{
                height: '100%',
                width: dbCount === 0 ? '0%' : `${pyqPct * 100}%`,
                background: dbCount === 0
                  ? 'transparent'
                  : answered >= dbCount
                    ? 'linear-gradient(90deg, #34d399, #22c55e)'
                    : answered > 0
                      ? `linear-gradient(90deg, ${subject.color}, rgba(${rgb},0.6))`
                      : 'transparent',
                borderRadius: 4,
                transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
                boxShadow: answered > 0 && dbCount > 0
                  ? answered >= dbCount
                    ? '0 0 8px rgba(34,211,153,0.4)'
                    : `0 0 6px rgba(${rgb},0.3)`
                  : 'none',
              }} />
            </div>

            {/* Concepts inline */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
              {conceptsToShow.map((c, i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 500,
                  color: 'rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  padding: '1px 6px',
                  borderRadius: 5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 80,
                }}>
                  {c}
                </span>
              ))}
              {topic.concepts.length > 3 && (
                <span style={{
                  fontSize: 9, color: 'rgba(255,255,255,0.20)',
                  padding: '1px 3px', whiteSpace: 'nowrap',
                }}>
                  +{topic.concepts.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* PYQ count badge */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            flexShrink: 0, gap: 1,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em',
              color: dbCount === 0
                ? 'rgba(255,255,255,0.20)'
                : answered >= dbCount
                  ? '#34d399'
                  : answered > 0
                    ? 'rgba(255,255,255,0.75)'
                    : 'rgba(255,255,255,0.50)',
            }}>
              {dbCount === 0
                ? '0'
                : answered >= dbCount
                  ? `${dbCount}`
                  : `${answered}/${dbCount}`
              }
            </span>
            <span style={{
              fontSize: 9, fontWeight: 500, letterSpacing: '0.03em',
              color: dbCount === 0
                ? 'rgba(255,255,255,0.15)'
                : answered >= dbCount
                  ? 'rgba(34,211,153,0.7)'
                  : 'rgba(255,255,255,0.30)',
              textTransform: 'uppercase',
            }}>
              {dbCount === 0 ? 'No PYQs' : answered >= dbCount ? 'Done' : 'PYQs'}
            </span>
          </div>
        </div>

        {/* -- Completed checkmark stripe -- */}
        {state === 'completed' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, rgba(34,211,153,0.5), rgba(34,211,153,0.15), transparent)',
            borderRadius: '0 0 18px 18px',
          }} />
        )}

        {/* -- Started progress bar -- */}
        {state === 'started' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '0 0 18px 18px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${crownPct * 100}%`,
              background: `linear-gradient(90deg, ${subject.color}, rgba(${rgb},0.5))`,
              borderRadius: '0 2px 2px 0',
              transition: 'width 500ms ease-out',
            }} />
          </div>
        )}

        {/* -- Scan line animation for up-next card -- */}
        {isUpNext && !isNewlyUnlocked && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '30%',
            background: `linear-gradient(90deg, transparent, rgba(${rgb},0.04), transparent)`,
            animation: 'jp-scanline 4s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 3,
          }} />
        )}

        {/* -- Shimmer overlay for newly unlocked -- */}
        {isNewlyUnlocked && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '50%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            animation: 'jp-unlockShimmer 1.5s ease-in-out 0.8s',
            animationFillMode: 'both',
            pointerEvents: 'none', zIndex: 5,
          }} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContinueHero — shows what you studied + what's recommended next
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ContinueHero({ nextTopic, nextSubject, recentlyDone, onContinue }: {
  nextTopic: LearningTopic | null
  nextSubject: LearningSubject | null
  recentlyDone: { topic: LearningTopic; subject: LearningSubject }[]
  onContinue: () => void
}) {
  if (!nextTopic || !nextSubject) return null
  const rgb = hexToRgb(nextSubject.color)

  return (
    <div style={{
      padding: '18px 16px 16px',
      borderRadius: 20,
      background: `linear-gradient(135deg, rgba(${rgb},0.10) 0%, rgba(${rgb},0.03) 50%, rgba(255,255,255,0.02) 100%)`,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1px solid rgba(${rgb},0.20)`,
      marginBottom: 12,
      position: 'relative',
      overflow: 'hidden',
      ['--hero-rgb' as string]: rgb,
      animation: 'jp-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both, jp-heroGlow 4s ease-in-out infinite',
    }}>
      {/* Animated gradient border top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        backgroundImage: `linear-gradient(90deg, transparent, rgba(${rgb},0.8), rgba(${rgb},0.3), transparent)`,
        backgroundSize: '200% 100%',
        animation: 'jp-gradientFlow 3s ease infinite',
      }} />

      {/* Corner radial glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        background: `radial-gradient(circle, rgba(${rgb},0.12) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Recently studied (compact) */}
      {recentlyDone.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Recently studied
          </span>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {recentlyDone.slice(0, 3).map((r) => (
              <span key={r.topic.id} style={{
                fontSize: 11, fontWeight: 550, color: 'rgba(255,255,255,0.55)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '3px 10px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 4,
                maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#34d399', flexShrink: 0,
                  boxShadow: '0 0 6px rgba(34,211,153,0.5)',
                }} />
                {r.topic.title.length > 22 ? r.topic.title.slice(0, 20) + '...' : r.topic.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended next */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: nextSubject.color,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Up next
        </span>
        <div style={{
          flex: 1, height: 1,
          background: `linear-gradient(90deg, rgba(${rgb},0.3), transparent)`,
        }} />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onContinue}
        onKeyDown={(e) => { if (e.key === 'Enter') onContinue() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Topic icon */}
        <div style={{
          width: 50, height: 50, borderRadius: 16,
          background: `rgba(${rgb},0.15)`,
          border: `1.5px solid rgba(${rgb},0.30)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
          boxShadow: `0 4px 16px rgba(${rgb},0.15)`,
          animation: 'jp-heroPulse 3s ease-in-out infinite',
        }}>
          {nextTopic.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {nextTopic.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: nextSubject.color,
              background: `rgba(${rgb},0.12)`,
              padding: '2px 8px', borderRadius: 6,
            }}>
              {nextSubject.shortTitle}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: nextTopic.difficulty === 1 ? '#34d399' : nextTopic.difficulty === 2 ? '#fbbf24' : '#f87171',
            }}>
              {nextTopic.difficulty === 1 ? 'Easy' : nextTopic.difficulty === 2 ? 'Medium' : 'Hard'}
            </span>
          </div>
        </div>

        {/* Continue arrow */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${nextSubject.color}, rgba(${rgb},0.7))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 16px rgba(${rgb},0.35)`,
          transition: 'transform 200ms ease',
        }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SubjectAccordionHeader
// ---------------------------------------------------------------------------

function SubjectAccordionHeader({ stats, isExpanded, onToggle }: {
  stats: SubjectStats
  isExpanded: boolean
  onToggle: () => void
}) {
  const { subject, completedCount, totalCount } = stats
  const rgb = hexToRgb(subject.color)
  const pct = totalCount > 0 ? completedCount / totalCount : 0
  const pctDisplay = Math.round(pct * 100)

  // SVG ring for the header
  const ringSize = 36
  const ringStroke = 3
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCirc = 2 * Math.PI * ringRadius
  const ringOffset = ringCirc - (pct * ringCirc)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${subject.shortTitle} - ${completedCount} of ${totalCount} done`}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px',
        borderRadius: 16,
        background: isExpanded
          ? `linear-gradient(135deg, rgba(${rgb},0.08) 0%, rgba(${rgb},0.02) 100%)`
          : 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isExpanded
          ? `1px solid rgba(${rgb},0.25)`
          : '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'all 250ms cubic-bezier(0.16,1,0.3,1)',
        marginBottom: isExpanded ? 8 : 4,
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Top accent line when expanded */}
      {isExpanded && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, rgba(${rgb},0.7), rgba(${rgb},0.15), transparent)`,
        }} />
      )}

      {/* Progress ring with icon */}
      <div style={{ width: ringSize, height: ringSize, position: 'relative', flexShrink: 0 }}>
        <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={ringStroke} />
          {pct > 0 && (
            <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
              fill="none" stroke={subject.color} strokeWidth={ringStroke}
              strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)',
                filter: `drop-shadow(0 0 3px ${subject.color}66)`,
              }}
            />
          )}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {subject.icon}
        </div>
      </div>

      {/* Subject name + summary */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 650,
          color: isExpanded ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
        }}>
          {subject.shortTitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: `rgba(${rgb},0.8)`,
          }}>
            {completedCount}/{totalCount} done
          </span>
          {!isExpanded && totalCount > 0 && (
            /* Inline mini progress bar for collapsed */
            <div style={{
              flex: 1, maxWidth: 80, height: 3, borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${pctDisplay}%`,
                background: subject.color,
                borderRadius: 3,
                transition: 'width 400ms ease-out',
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Percentage */}
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: pctDisplay === 100 ? '#34d399' : `rgba(${rgb},0.7)`,
        marginRight: 4,
      }}>
        {pctDisplay}%
      </span>

      {/* Chevron */}
      <svg
        width={18} height={18} viewBox="0 0 24 24" fill="none"
        style={{
          flexShrink: 0,
          transition: 'transform 250ms cubic-bezier(0.16,1,0.3,1)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        <path d="M6 9l6 6 6-6" stroke={isExpanded ? subject.color : 'rgba(255,255,255,0.35)'}
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SearchOverlay
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SearchOverlay({ subjects, progress, pyqCounts, onSelect, onClose }: {
  subjects: LearningSubject[]
  progress: Record<string, TopicProgress>
  pyqCounts?: Record<string, number>
  onSelect: (topicId: string, subjectId: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus on mount
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  // Build flat list of all topics for searching
  const allTopics = useMemo(() => {
    const list: { topic: LearningTopic; subject: LearningSubject; tp: TopicProgress }[] = []
    for (const s of subjects) {
      for (const u of s.units) {
        for (const t of u.topics) {
          list.push({ topic: t, subject: s, tp: progress[t.id] || DEFAULT_TOPIC_PROGRESS })
        }
      }
    }
    return list
  }, [subjects, progress])

  const results = useMemo(() => {
    if (!query.trim()) return allTopics.slice(0, 20) // show first 20 when no query
    const q = query.toLowerCase().trim()
    return allTopics.filter((item) => {
      if (item.topic.title.toLowerCase().includes(q)) return true
      if (item.topic.concepts.some(c => c.toLowerCase().includes(q))) return true
      if (item.subject.shortTitle.toLowerCase().includes(q)) return true
      return false
    }).slice(0, 30)
  }, [allTopics, query])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(5,5,16,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex', flexDirection: 'column',
        animation: 'jp-searchSlideDown 200ms cubic-bezier(0.16,1,0.3,1) both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Search header */}
      <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 0 20px rgba(99,102,241,0.1)',
        }}>
          {/* Search icon */}
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx={11} cy={11} r={7} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
            <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search topics, concepts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: 15, fontWeight: 500,
              color: 'rgba(255,255,255,0.90)',
              letterSpacing: '-0.01em',
            }}
          />
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.50)',
              cursor: 'pointer',
            }}
          >
            ESC
          </button>
        </div>

        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 8, paddingLeft: 4,
          fontWeight: 500,
        }}>
          {query.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Browse all topics'}
        </div>
      </div>

      {/* Results */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 16px 40px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {results.map((item) => {
          const rgb = hexToRgb(item.subject.color)
          const stateLabel = item.tp.state === 'completed' ? 'Done'
            : item.tp.state === 'started' ? 'In progress'
            : item.tp.state === 'available' ? 'Available'
            : 'Locked'
          const stateColor = item.tp.state === 'completed' ? '#34d399'
            : item.tp.state === 'started' ? item.subject.color
            : item.tp.state === 'available' ? item.subject.color
            : 'rgba(255,255,255,0.30)'

          return (
            <div
              key={item.topic.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.topic.id, item.subject.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(item.topic.id, item.subject.id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                marginBottom: 4,
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.topic.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>
                  {item.topic.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: item.subject.color,
                    background: `rgba(${rgb},0.10)`,
                    padding: '1px 6px', borderRadius: 5,
                  }}>
                    {item.subject.shortTitle}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, color: stateColor,
                    opacity: 0.8,
                  }}>
                    {stateLabel}
                  </span>
                </div>
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                <path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )
        })}

        {results.length === 0 && query.trim() && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: 'rgba(255,255,255,0.30)', fontSize: 13,
          }}>
            No topics matching &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// JumpToCurrentFAB
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function JumpToCurrentFAB({ topicName, color, direction, onClick }: {
  topicName: string
  color: string
  direction: 'up' | 'down'
  onClick: () => void
}) {
  const rgb = hexToRgb(color)
  const displayName = topicName.length > 24 ? topicName.slice(0, 22) + '...' : topicName

  return (
    <button
      onClick={onClick}
      aria-label={`Continue: ${topicName}`}
      style={{
        position: 'fixed',
        bottom: 80, right: 16,
        zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 16px',
        borderRadius: 9999,
        background: `rgba(${rgb},0.18)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid rgba(${rgb},0.35)`,
        boxShadow: `0 4px 24px rgba(${rgb},0.20), 0 0 0 1px rgba(255,255,255,0.06)`,
        cursor: 'pointer',
        animation: 'jp-fabSlideIn 300ms cubic-bezier(0.16,1,0.3,1) both',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {/* Arrow */}
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{
        flexShrink: 0,
        transform: direction === 'up' ? 'rotate(180deg)' : 'rotate(0deg)',
      }}>
        <path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: 'rgba(255,255,255,0.85)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        Continue: {displayName}
      </span>
    </button>
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
  onSubjectChange: _onSubjectChange,
  profile: _profile,
  newlyUnlockedId,
  isPro,
  freeTopicIds,
  pyqCounts,
}: JourneyPathProps) {
  void _onSubjectChange; void _profile
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstAvailableRef = useRef<HTMLDivElement>(null)
  const newlyUnlockedRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)

  // Refs for individual topic elements (for scroll-to)
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => { setReady(true) }, [])

  // Build per-subject stats + items (the accordion data)
  const subjectStats = useMemo<SubjectStats[]>(() => {
    return subjects.map((subject) => {
      const items: ListItem[] = []
      let completedCount = 0
      let totalCount = 0
      let gi = 0
      let foundFirst = false
      let firstAvailableTopic: LearningTopic | null = null

      for (const unit of subject.units) {
        let unitDone = 0
        for (const t of unit.topics) {
          totalCount++
          if ((progress[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed') {
            completedCount++
            unitDone++
          }
        }
        items.push({ kind: 'unit', unit, subject, completedCount: unitDone, totalCount: unit.topics.length })
        for (const topic of unit.topics) {
          const tp = progress[topic.id] || DEFAULT_TOPIC_PROGRESS
          const isFA = !foundFirst && (tp.state === 'available' || tp.state === 'started')
          if (isFA) {
            foundFirst = true
            firstAvailableTopic = topic
          }
          items.push({
            kind: 'topic', topic, unit, subject, progress: tp,
            state: tp.state, isFirstAvailable: isFA, globalIndex: gi++,
          })
        }
      }

      return { subject, completedCount, totalCount, items, firstAvailableTopic }
    })
  }, [subjects, progress])

  // Track completed topic IDs for path fill
  const completedIds = useMemo(() => {
    const s = new Set<string>()
    for (const ss of subjectStats) {
      for (const it of ss.items) {
        if (it.kind === 'topic' && it.state === 'completed') s.add(it.topic.id)
      }
    }
    return s
  }, [subjectStats])

  // Find the global "first available" topic across all subjects
  const globalFirstAvailable = useMemo(() => {
    for (const ss of subjectStats) {
      if (ss.firstAvailableTopic) {
        return { topic: ss.firstAvailableTopic, subjectId: ss.subject.id, color: ss.subject.color }
      }
    }
    return null
  }, [subjectStats])

  // Auto-expand: when activeSubjectId is set, expand that subject
  // On initial mount with no activeSubjectId, expand the subject with the first available topic
  useEffect(() => {
    if (activeSubjectId) {
      setExpandedSubjectId(activeSubjectId)
    } else if (!expandedSubjectId && globalFirstAvailable) {
      setExpandedSubjectId(globalFirstAvailable.subjectId)
    }
  }, [activeSubjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // If newlyUnlockedId changes, auto-expand the subject containing that topic
  useEffect(() => {
    if (!newlyUnlockedId) return
    for (const ss of subjectStats) {
      for (const it of ss.items) {
        if (it.kind === 'topic' && it.topic.id === newlyUnlockedId) {
          setExpandedSubjectId(ss.subject.id)
          return
        }
      }
    }
  }, [newlyUnlockedId, subjectStats])

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
  }, [expandedSubjectId, ready, newlyUnlockedId])

  const handleTap = useCallback(
    (n: FlatTopicNode) => onNodeTap(n.topic.id, n.topic, n.subject),
    [onNodeTap],
  )

  // Handle accordion toggle — scroll the header into view
  const accordionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handleAccordionToggle = useCallback((subjectId: string) => {
    setExpandedSubjectId((prev) => {
      const next = prev === subjectId ? null : subjectId
      // Scroll the accordion header to the top of the scroll container
      if (next) {
        requestAnimationFrame(() => {
          const header = accordionRefs.current[subjectId]
          const container = scrollRef.current
          if (header && container) {
            const headerRect = header.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            container.scrollTo({
              top: container.scrollTop + headerRect.top - containerRect.top - 4,
              behavior: 'smooth',
            })
          }
        })
      }
      return next
    })
  }, [])

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
          padding: '8px 16px 120px',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
        }}
      >
        {/* Just the subject accordion — nothing else */}
        {subjectStats.map((ss) => {
          const isExpanded = expandedSubjectId === ss.subject.id

          return (
            <div key={ss.subject.id} style={{ marginBottom: isExpanded ? 12 : 2 }}>
              {/* Accordion header — sticky when expanded so it stays visible */}
              <div
                ref={(el) => { accordionRefs.current[ss.subject.id] = el }}
                style={isExpanded ? {
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                } : undefined}
              >
                <SubjectAccordionHeader
                  stats={ss}
                  isExpanded={isExpanded}
                  onToggle={() => handleAccordionToggle(ss.subject.id)}
                />
              </div>

              {/* Expanded content: render the topic list */}
              {isExpanded && (
                <div style={{
                  animation: 'jp-sectionExpand 400ms cubic-bezier(0.22,1,0.36,1) both',
                  position: 'relative',
                  width: '100%',
                  overflow: 'hidden',
                }}>
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

                  {(() => {
                    let prevTopicNode: FlatTopicNode | null = null

                    return ss.items.map((item) => {
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
                      const showFilledSegment = prevTopicNode !== null && prevWasCompleted
                      const isNewlyUnlocked = node.topic.id === newlyUnlockedId
                      const nodeNeedsPro = !isPro && node.state !== 'completed' && node.state !== 'started' && !(freeTopicIds || []).includes(node.topic.id) && (freeTopicIds || []).length >= 2

                      const el = (
                        <div
                          key={`t-${node.topic.id}`}
                          ref={(r) => {
                            topicRefs.current[node.topic.id] = r
                            if (isNewlyUnlocked) (newlyUnlockedRef as React.MutableRefObject<HTMLDivElement | null>).current = r
                            if (node.isFirstAvailable) (firstAvailableRef as React.MutableRefObject<HTMLDivElement | null>).current = r
                          }}
                          style={{ position: 'relative', marginBottom: 8 }}
                        >
                          {/* Filled path segment overlay if previous was completed */}
                          {showFilledSegment && (
                            <div style={{
                              position: 'absolute',
                              top: -8,
                              left: PATH_LEFT + DOT_SIZE / 2 - 1.5,
                              width: 3,
                              height: 8 + 12,
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
                            dbQuestionCount={pyqCounts?.[node.topic.id] ?? 0}
                          />
                        </div>
                      )

                      prevTopicNode = node
                      return el
                    })
                  })()}

                  {/* Bottom spacer for section */}
                  <div style={{ height: 8 }} />
                </div>
              )}
            </div>
          )
        })}

        {/* Bottom spacer for scroll padding */}
        <div style={{ height: 40 }} />
      </div>
    </>
  )
}
