'use client'

import { useMemo, useState } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import { type TopicProgress, type JourneyProgress, type NodeState, type UserProfile, DEFAULT_TOPIC_PROGRESS, GLASS_STYLE } from './types'

interface PracticeTabProps {
  progress: JourneyProgress
  subjects: LearningSubject[]
  topicStates: Record<string, { state: NodeState; topic: LearningTopic; subject: LearningSubject }>
  onTopicSelect: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onStartQuickMix: () => void
  onNavigateToPath: () => void
  profile: UserProfile | null
}

function getLocalDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface TopicWithMeta {
  topic: LearningTopic; subject: LearningSubject; tp: TopicProgress; accuracy: number; daysSince: number
}

function buildTopicList(subjects: LearningSubject[], progress: JourneyProgress): TopicWithMeta[] {
  const now = Date.now(), result: TopicWithMeta[] = []
  for (const subject of subjects) for (const unit of subject.units) for (const topic of unit.topics) {
    const tp = progress.topics[topic.id] || DEFAULT_TOPIC_PROGRESS
    if (tp.state === 'started' || tp.state === 'completed') {
      const accuracy = tp.questionsAnswered > 0 ? (tp.correctAnswers / tp.questionsAnswered) * 100 : 0
      const daysSince = tp.lastPracticed ? Math.floor((now - new Date(tp.lastPracticed).getTime()) / 86400000) : 999
      result.push({ topic, subject, tp, accuracy, daysSince })
    }
  }
  return result
}

function pickNextUp(all: TopicWithMeta[], weakSubjectIds?: string[]): TopicWithMeta | null {
  const weakSet = new Set(weakSubjectIds || [])

  const weakFocus = all
    .filter(t => weakSet.has(t.subject.id) && t.tp.questionsAnswered >= 3 && t.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
  if (weakFocus[0]) return weakFocus[0]

  const weak = all.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < 40).sort((a, b) => a.accuracy - b.accuracy)
  if (weak[0]) return weak[0]

  const dueFocus = all
    .filter(t => weakSet.has(t.subject.id) && t.tp.state === 'completed' && t.daysSince >= 3)
    .sort((a, b) => b.daysSince - a.daysSince)
  if (dueFocus[0]) return dueFocus[0]

  const due = all.filter(t => t.tp.state === 'completed' && t.daysSince >= 3).sort((a, b) => b.daysSince - a.daysSince)
  if (due[0]) return due[0]

  const startedFocus = all.filter(t => weakSet.has(t.subject.id) && t.tp.state === 'started')
  if (startedFocus[0]) return startedFocus[0]

  const started = all.filter(t => t.tp.state === 'started')
  return started[0] || all[0] || null
}

// -- Urgency helpers --

type UrgencyLevel = 'overdue' | 'due-soon' | 'recent' | 'none'

function getUrgency(daysSince: number): UrgencyLevel {
  if (daysSince >= 7) return 'overdue'
  if (daysSince >= 3) return 'due-soon'
  if (daysSince >= 1) return 'recent'
  return 'none'
}

function urgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case 'overdue': return '#ef4444'
    case 'due-soon': return '#f97316'
    case 'recent': return '#eab308'
    default: return 'rgba(255,255,255,0.30)'
  }
}

// -- Accuracy trend helper --

type TrendDirection = 'up' | 'down' | 'stable'

function computeTrend(tp: TopicProgress): TrendDirection {
  const total = tp.questionsAnswered
  const correct = tp.correctAnswers
  if (total < 4) return 'stable'

  const currentAcc = correct / total
  if (tp.crownLevel >= 3 && currentAcc >= 0.7) return 'up'
  if (tp.crownLevel >= 2 && currentAcc >= 0.6) return 'up'
  if (currentAcc < 0.35 && total >= 6) return 'down'
  if (currentAcc < 0.45 && total >= 8) return 'down'

  if (currentAcc >= 0.55) return 'up'
  if (currentAcc < 0.45) return 'down'
  return 'stable'
}

function trendIndicator(dir: TrendDirection): { symbol: string; color: string } {
  switch (dir) {
    case 'up': return { symbol: '\u2197', color: '#34d399' }
    case 'down': return { symbol: '\u2198', color: '#f87171' }
    case 'stable': return { symbol: '\u2192', color: 'rgba(255,255,255,0.35)' }
  }
}

// -- Weekly stats helper --

interface WeekStats {
  questions: number
  accuracy: number
  topics: number
}

function computeWeekStatsFromProgress(
  progress: JourneyProgress,
  weeksAgo: number
): WeekStats {
  const calendar = progress.studyCalendar || []
  const now = new Date()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setHours(0, 0, 0, 0)
  startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay())

  const weekStart = new Date(startOfThisWeek)
  weekStart.setDate(weekStart.getDate() - weeksAgo * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const startStr = getLocalDate(weekStart)
  const endStr = getLocalDate(weekEnd)

  let questions = 0
  let correctAnswers = 0
  let activeDays = 0

  for (const day of calendar) {
    if (day.date >= startStr && day.date < endStr) {
      questions += day.questionsAnswered
      correctAnswers += (day.correctAnswers || 0)
      if (day.questionsAnswered > 0) activeDays++
    }
  }

  const accuracy = questions > 0 ? Math.min(100, Math.round((correctAnswers / questions) * 100)) : 0

  return { questions, accuracy, topics: activeDays }
}

// -- Pulse animation CSS (injected once) --

const PULSE_KEYFRAMES = `
@keyframes practiceTabPulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.8); }
  100% { opacity: 0; transform: scale(2.4); }
}
`

let pulseInjected = false
function ensurePulseAnimation() {
  if (typeof document === 'undefined' || pulseInjected) return
  const style = document.createElement('style')
  style.textContent = PULSE_KEYFRAMES
  document.head.appendChild(style)
  pulseInjected = true
}

// -- Category type --

type CategoryFilter = 'all' | 'review' | 'weak' | 'focus' | 'quickmix'

// -- TopicRow component --

function TopicRow({ icon, title, subject, rightContent, urgencyDot, onTap }: {
  icon: string; title: string; subject: string;
  rightContent: React.ReactNode; urgencyDot?: string; onTap: () => void
}) {
  return (
    <button onClick={onTap} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 14,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
      cursor: 'pointer', textAlign: 'left' as const,
    }}>
      {urgencyDot && (
        <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: urgencyDot }} />
          {urgencyDot === '#ef4444' && (
            <div style={{
              position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderRadius: 9999,
              background: urgencyDot,
              animation: 'practiceTabPulse 2s ease-out infinite',
            }} />
          )}
        </div>
      )}
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subject}</div>
      </div>
      {rightContent}
    </button>
  )
}

// -- Main Component --

const GLASS = { ...GLASS_STYLE } as const

export default function PracticeTab({ progress, subjects, topicStates, onTopicSelect, onStartQuickMix, onNavigateToPath, profile }: PracticeTabProps) {
  void topicStates // prop passed by parent but categories are computed from allTopics
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')

  const allTopics = useMemo(() => buildTopicList(subjects.length > 0 ? subjects : UPSC_SYLLABUS, progress), [subjects, progress])
  const nextUp = useMemo(() => pickNextUp(allTopics, profile?.weakSubjects), [allTopics, profile])
  const weakThreshold = profile?.prepStage === 'advanced' ? 75 : profile?.prepStage === 'intermediate' ? 60 : 50

  const reviewTopics = useMemo(() =>
    allTopics.filter(t => t.tp.state === 'completed' && t.daysSince >= 3).sort((a, b) => b.daysSince - a.daysSince),
    [allTopics]
  )
  const weakTopics = useMemo(() =>
    allTopics.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < weakThreshold)
      .sort((a, b) => a.accuracy - b.accuracy),
    [allTopics, weakThreshold]
  )
  const focusTopics = useMemo(() => {
    if (!profile?.weakSubjects?.length) return []
    const weakSet = new Set(profile.weakSubjects)
    return allTopics.filter(t => weakSet.has(t.subject.id)).sort((a, b) => a.accuracy - b.accuracy)
  }, [allTopics, profile])

  const hasPracticedTopics = allTopics.length > 0

  // Priority topic for smart session
  const priorityTopic = useMemo(() => {
    const reviewDue = allTopics.filter(t => t.tp.state === 'completed' && t.daysSince >= 3)
    const focusDue = focusTopics.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < weakThreshold)
    const overdue = reviewDue.filter(t => t.daysSince >= 7).sort((a, b) => b.daysSince - a.daysSince)
    if (overdue[0]) return overdue[0]
    if (focusDue[0]) return focusDue[0]
    if (reviewDue[0]) return reviewDue[0]
    return nextUp
  }, [allTopics, focusTopics, weakThreshold, nextUp])

  // Weekly stats
  const weeklyStats = useMemo(() => {
    const thisWeek = computeWeekStatsFromProgress(progress, 0)
    const lastWeek = computeWeekStatsFromProgress(progress, 1)
    const improving = thisWeek.questions > lastWeek.questions || thisWeek.accuracy > lastWeek.accuracy
    const declining = thisWeek.questions < lastWeek.questions && thisWeek.accuracy < lastWeek.accuracy
    const trend: TrendDirection = improving ? 'up' : declining ? 'down' : 'stable'
    return { thisWeek, lastWeek, trend }
  }, [progress])

  const fmt = (d: number) => d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`

  // Inject pulse CSS
  if (typeof window !== 'undefined') ensurePulseAnimation()

  // -- Category pills config --
  const categories: { key: CategoryFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'review', label: 'Review Due', count: reviewTopics.length },
    { key: 'weak', label: 'Weak', count: weakTopics.length },
    { key: 'focus', label: 'Focus Areas', count: focusTopics.length },
    { key: 'quickmix', label: 'Quick Mix' },
  ]

  // -- Empty state --
  if (allTopics.length === 0) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 24px', textAlign: 'center' }}>
      <div style={{
        width: 96, height: 96, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.04) 70%, transparent 100%)',
        boxShadow: '0 0 40px rgba(99,102,241,0.12), 0 0 80px rgba(139,92,246,0.06)',
      }}>
        <span style={{ fontSize: 48, lineHeight: 1 }}>🎯</span>
      </div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Your practice hub</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', maxWidth: 280, lineHeight: 1.7, margin: '10px auto 0' }}>
          {profile?.weakSubjects?.length ? (
            <>Complete a topic in <span style={{ color: '#f97316', fontWeight: 600 }}>{subjects.find(s => s.id === profile.weakSubjects[0])?.shortTitle || 'your focus area'}</span> to unlock practice</>
          ) : (
            'Complete your first topic on the Path to unlock smart practice recommendations'
          )}
        </p>
      </div>
      <button onClick={onNavigateToPath} style={{
        padding: '14px 36px', borderRadius: 16,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        boxShadow: '0 4px 24px rgba(99,102,241,0.35), 0 0 48px rgba(99,102,241,0.10)',
        fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer',
        transition: 'transform 150ms ease',
      }}>
        Go to Path &rarr;
      </button>
    </div>
  )

  // -- Render review topic row --
  function renderReviewRow(t: TopicWithMeta) {
    const urgency = getUrgency(t.daysSince)
    const uColor = urgencyColor(urgency)
    return (
      <TopicRow
        key={t.topic.id}
        icon={t.topic.icon}
        title={t.topic.title}
        subject={t.subject.shortTitle}
        urgencyDot={uColor}
        onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)}
        rightContent={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.40)' }}>{fmt(t.daysSince)}</span>
            {urgency === 'overdue' && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>OVERDUE</span>
            )}
          </div>
        }
      />
    )
  }

  // -- Render weak topic row --
  function renderWeakRow(t: TopicWithMeta) {
    const trend = computeTrend(t.tp)
    const ti = trendIndicator(trend)
    const accColor = t.accuracy < 40 ? '#f87171' : '#fbbf24'
    return (
      <TopicRow
        key={t.topic.id}
        icon={t.topic.icon}
        title={t.topic.title}
        subject={t.subject.shortTitle}
        onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: accColor }}>{Math.round(t.accuracy)}%</span>
            {t.tp.questionsAnswered >= 3 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: ti.color }}>{ti.symbol}</span>
            )}
          </div>
        }
      />
    )
  }

  // -- Section header --
  function SectionHeader({ icon, label, count }: { icon: string; label: string; count: number }) {
    if (count === 0) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>({count})</span>
      </div>
    )
  }

  // -- Render category content --
  function renderCategoryContent() {
    switch (activeCategory) {
      case 'all': {
        const hasReview = reviewTopics.length > 0
        const hasWeak = weakTopics.length > 0
        const hasFocus = focusTopics.length > 0
        if (!hasReview && !hasWeak && !hasFocus) {
          return (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: 0 }}>All topics are in good shape. Keep going!</p>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hasReview && (
              <>
                <SectionHeader icon="🔄" label="Review Due" count={reviewTopics.length} />
                {reviewTopics.slice(0, 5).map(renderReviewRow)}
              </>
            )}
            {hasWeak && (
              <>
                <SectionHeader icon="⚠️" label="Weak Topics" count={weakTopics.length} />
                {weakTopics.slice(0, 5).map(renderWeakRow)}
              </>
            )}
            {hasFocus && (
              <>
                <SectionHeader icon="🎯" label="Focus Areas" count={focusTopics.length} />
                {focusTopics.slice(0, 5).map(renderWeakRow)}
              </>
            )}
          </div>
        )
      }

      case 'review': {
        if (reviewTopics.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: '8px 0 0' }}>No reviews due. You are on top of it!</p>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reviewTopics.map(renderReviewRow)}
          </div>
        )
      }

      case 'weak': {
        if (weakTopics.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <span style={{ fontSize: 28 }}>💪</span>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: '8px 0 0' }}>No weak topics. Strong performance!</p>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weakTopics.map(renderWeakRow)}
          </div>
        )
      }

      case 'focus': {
        if (focusTopics.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <span style={{ fontSize: 28 }}>🎯</span>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: '8px 0 0' }}>
                {profile?.weakSubjects?.length ? 'No topics practiced in focus areas yet.' : 'Set focus areas in your profile to see them here.'}
              </p>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {focusTopics.map(renderWeakRow)}
          </div>
        )
      }

      case 'quickmix': {
        return (
          <div style={{
            ...GLASS, padding: 24, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 40 }}>🎲</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Quick Mix</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '6px 0 0', lineHeight: 1.6 }}>
                5 random questions from across all your practiced topics. Great for revision and keeping things fresh!
              </p>
            </div>
            <button
              onClick={hasPracticedTopics ? onStartQuickMix : undefined}
              style={{
                padding: '13px 32px', borderRadius: 14,
                background: hasPracticedTopics ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                boxShadow: hasPracticedTopics ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
                fontSize: 14, fontWeight: 700, color: hasPracticedTopics ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none', cursor: hasPracticedTopics ? 'pointer' : 'default',
                transition: 'transform 150ms ease',
              }}
            >
              Start Quick Mix &rarr;
            </button>
          </div>
        )
      }
    }
  }

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* SECTION 1: Header + Smart Session CTA */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Practice</h2>
      </div>

      {priorityTopic && (
        <div>
          <button
            onClick={() => {
              const t = priorityTopic!
              onTopicSelect(t.topic.id, t.topic, t.subject)
            }}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 14, textAlign: 'center',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
              fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer',
              transition: 'transform 150ms ease',
            }}
          >
            Start Smart Session &rarr;
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', margin: '6px 0 0' }}>
            AI picks what matters most for you right now
          </p>
        </div>
      )}

      {/* SECTION 2: Category Filter Pills */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>
        {categories.map(cat => {
          const isSelected = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                height: 34, borderRadius: 9999, fontSize: 12, fontWeight: 600,
                padding: '0 14px', whiteSpace: 'nowrap' as const, flexShrink: 0,
                background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: isSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                color: isSelected ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {cat.label}{cat.count !== undefined ? ` (${cat.count})` : ''}
            </button>
          )
        })}
      </div>

      {/* SECTION 3: Topic List */}
      <div style={{ minHeight: 120 }}>
        {renderCategoryContent()}
      </div>

      {/* SECTION 4: Weekly Snapshot (compact) */}
      {(weeklyStats.thisWeek.questions > 0 || weeklyStats.lastWeek.questions > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: 12 }}>📊</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', flex: 1 }}>
            This week: <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>{weeklyStats.thisWeek.questions}</span> questions
            <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>&middot;</span>
            <span style={{ fontWeight: 600, color: weeklyStats.thisWeek.accuracy >= 70 ? '#34d399' : weeklyStats.thisWeek.accuracy >= 50 ? '#fbbf24' : '#f87171' }}>{weeklyStats.thisWeek.accuracy}%</span> acc
          </span>
          {weeklyStats.trend !== 'stable' && (() => {
            const ti = trendIndicator(weeklyStats.trend)
            return (
              <span style={{ fontSize: 11, fontWeight: 600, color: ti.color, flexShrink: 0 }}>
                {ti.symbol} {weeklyStats.trend === 'up' ? 'Improving' : 'Needs effort'}
              </span>
            )
          })()}
        </div>
      )}
    </div>
  )
}
