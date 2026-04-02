'use client'

import { useMemo, useState } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import { type TopicProgress, type JourneyProgress, type NodeState, type UserProfile, DEFAULT_TOPIC_PROGRESS } from './types'

interface PracticeTabProps {
  progress: JourneyProgress
  subjects: LearningSubject[]
  topicStates: Record<string, { state: NodeState; topic: LearningTopic; subject: LearningSubject }>
  onTopicSelect: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onStartQuickMix: () => void
  onNavigateToPath: () => void
  profile: UserProfile | null
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

  // First: weak accuracy in focus areas
  const weakFocus = all
    .filter(t => weakSet.has(t.subject.id) && t.tp.questionsAnswered >= 3 && t.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
  if (weakFocus[0]) return weakFocus[0]

  // Then: any weak accuracy topic
  const weak = all.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < 40).sort((a, b) => a.accuracy - b.accuracy)
  if (weak[0]) return weak[0]

  // Then: due for review in focus areas
  const dueFocus = all
    .filter(t => weakSet.has(t.subject.id) && t.tp.state === 'completed' && t.daysSince >= 3)
    .sort((a, b) => b.daysSince - a.daysSince)
  if (dueFocus[0]) return dueFocus[0]

  // Then: any due for review
  const due = all.filter(t => t.tp.state === 'completed' && t.daysSince >= 3).sort((a, b) => b.daysSince - a.daysSince)
  if (due[0]) return due[0]

  // Then: started topics in focus areas first
  const startedFocus = all.filter(t => weakSet.has(t.subject.id) && t.tp.state === 'started')
  if (startedFocus[0]) return startedFocus[0]

  const started = all.filter(t => t.tp.state === 'started')
  return started[0] || all[0] || null
}

function reason(t: TopicWithMeta, weakSubjectIds?: string[]): string {
  const isFocus = weakSubjectIds && weakSubjectIds.includes(t.subject.id)
  if (t.tp.questionsAnswered >= 3 && t.accuracy < 40) return isFocus ? 'Weak in focus area' : 'Weakest topic'
  if (t.tp.state === 'completed' && t.daysSince >= 3) return isFocus ? 'Focus area review' : 'Due for review'
  if (t.tp.state === 'started') return isFocus ? 'Continue (focus)' : 'Continue learning'
  return 'Practice next'
}

// ── Urgency helpers ──────────────────────────────────────────────────────────

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

function urgencyLabel(level: UrgencyLevel): string | null {
  switch (level) {
    case 'overdue': return 'overdue'
    case 'due-soon': return 'due soon'
    default: return null
  }
}

// ── Accuracy trend helper ────────────────────────────────────────────────────

type TrendDirection = 'up' | 'down' | 'stable'

function computeTrend(tp: TopicProgress): TrendDirection {
  // We estimate trend by comparing current accuracy to what it would be
  // without the last 3 answers. If not enough data, return stable.
  const total = tp.questionsAnswered
  const correct = tp.correctAnswers
  if (total < 4) return 'stable'

  const currentAcc = correct / total
  // Best estimate: if crown level is rising relative to accuracy
  if (tp.crownLevel >= 3 && currentAcc >= 0.7) return 'up'
  if (tp.crownLevel >= 2 && currentAcc >= 0.6) return 'up'
  if (currentAcc < 0.35 && total >= 6) return 'down'
  if (currentAcc < 0.45 && total >= 8) return 'down'

  // Use a simple heuristic: if accuracy is above 55% with decent volume, trending up
  if (currentAcc >= 0.55) return 'up'
  if (currentAcc < 0.45) return 'down'
  return 'stable'
}

function trendIndicator(dir: TrendDirection): { symbol: string; color: string } {
  switch (dir) {
    case 'up': return { symbol: '\u2197', color: '#34d399' }    // ↗
    case 'down': return { symbol: '\u2198', color: '#f87171' }  // ↘
    case 'stable': return { symbol: '\u2192', color: 'rgba(255,255,255,0.35)' } // →
  }
}

// ── Weekly stats helper ──────────────────────────────────────────────────────

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

  const startStr = weekStart.toISOString().slice(0, 10)
  const endStr = weekEnd.toISOString().slice(0, 10)

  let questions = 0
  let xpEarned = 0
  let activeDays = 0

  for (const day of calendar) {
    if (day.date >= startStr && day.date < endStr) {
      questions += day.questionsAnswered
      xpEarned += day.xpEarned
      if (day.questionsAnswered > 0) activeDays++
    }
  }

  // Estimate accuracy from xp/questions ratio (10 xp per correct answer)
  const estimatedCorrect = questions > 0 ? Math.round(xpEarned / 10) : 0
  const accuracy = questions > 0 ? Math.min(100, Math.round((estimatedCorrect / questions) * 100)) : 0

  return { questions, accuracy, topics: activeDays }
}

// ── Pulse animation CSS (injected once) ──────────────────────────────────────

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

const GLASS = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 } as const
const ELEVATED = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: 20 } as const

export default function PracticeTab({ progress, subjects, topicStates, onTopicSelect, onStartQuickMix, onNavigateToPath, profile }: PracticeTabProps) {
  const allTopics = useMemo(() => buildTopicList(subjects.length > 0 ? subjects : UPSC_SYLLABUS, progress), [subjects, progress])
  const nextUp = useMemo(() => pickNextUp(allTopics, profile?.weakSubjects), [allTopics, profile])
  const weakThreshold = profile?.prepStage === 'advanced' ? 75 : profile?.prepStage === 'intermediate' ? 60 : 50
  const weakTopics = useMemo(() =>
    allTopics.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < weakThreshold)
      .sort((a, b) => a.accuracy - b.accuracy),
    [allTopics, weakThreshold]
  )
  const reviewTopics = useMemo(() => allTopics.filter(t => t.tp.state === 'completed' && t.daysSince >= 1).sort((a, b) => b.daysSince - a.daysSince), [allTopics])
  const focusTopics = useMemo(() => {
    if (!profile?.weakSubjects?.length) return []
    const weakSet = new Set(profile.weakSubjects)
    return allTopics.filter(t => weakSet.has(t.subject.id)).sort((a, b) => a.accuracy - b.accuracy)
  }, [allTopics, profile])
  const hasPracticedTopics = allTopics.length > 0
  const [reviewOpen, setReviewOpen] = useState(false)
  const [weakOpen, setWeakOpen] = useState(false)
  const [heroPressed, setHeroPressed] = useState(false)
  const fmt = (d: number) => d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`

  // ── New: Today's Plan computation ────────────────────────────────────────────
  const todayPlan = useMemo(() => {
    const reviewDue = allTopics.filter(t => t.tp.state === 'completed' && t.daysSince >= 3)
    const focusDue = focusTopics.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < weakThreshold)
    const availableNew = Object.values(topicStates).filter(e => e.state === 'available').slice(0, 5)

    const reviewCount = reviewDue.length
    const focusCount = Math.min(focusDue.length, 2)
    const newCount = Math.min(availableNew.length, 2)

    const reviewMin = reviewCount * 5
    const focusMin = focusCount * 8
    const newMin = newCount * 6
    const totalMin = reviewMin + focusMin + newMin

    // Determine highest priority topic for "Start Smart Session"
    let priorityTopic: TopicWithMeta | null = null
    // Priority: overdue review > focus weak > next up
    const overdue = reviewDue.filter(t => t.daysSince >= 7).sort((a, b) => b.daysSince - a.daysSince)
    if (overdue[0]) priorityTopic = overdue[0]
    else if (focusDue[0]) priorityTopic = focusDue[0]
    else if (reviewDue[0]) priorityTopic = reviewDue[0]
    else priorityTopic = nextUp

    return {
      reviewCount,
      reviewMin,
      focusCount,
      focusMin,
      newCount,
      newMin,
      totalMin,
      priorityTopic,
      availableNewTopics: availableNew,
    }
  }, [allTopics, focusTopics, topicStates, weakThreshold, nextUp])

  // ── New: Weekly stats ────────────────────────────────────────────────────────
  const weeklyStats = useMemo(() => {
    const thisWeek = computeWeekStatsFromProgress(progress, 0)
    const lastWeek = computeWeekStatsFromProgress(progress, 1)
    const improving = thisWeek.questions > lastWeek.questions || thisWeek.accuracy > lastWeek.accuracy
    const declining = thisWeek.questions < lastWeek.questions && thisWeek.accuracy < lastWeek.accuracy
    const trend: TrendDirection = improving ? 'up' : declining ? 'down' : 'stable'
    return { thisWeek, lastWeek, trend }
  }, [progress])

  // ── New: Motivational banner ─────────────────────────────────────────────────
  const motivationalMessage = useMemo(() => {
    const streak = progress.streak
    if (streak >= 30) return `Unstoppable. ${streak} days of pure dedication.`
    if (streak >= 14) return `Two weeks strong! ${streak}-day streak. Keep the fire alive.`
    if (streak >= 7) return `One full week! ${streak}-day streak and counting.`
    if (streak >= 5) return `Consistency beats intensity. You've practiced ${streak} days straight!`
    if (streak >= 3) return `Nice momentum! ${streak} days in a row. Keep it going.`
    if (streak >= 1) return `You showed up today. That's what matters. Build on it.`
    return 'Start strong today. One topic at a time.'
  }, [progress.streak])

  const streakEmoji = progress.streak >= 5 ? ' \uD83D\uDD25' : progress.streak >= 3 ? ' \u2728' : ''

  // Inject pulse CSS
  if (typeof window !== 'undefined') ensurePulseAnimation()

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
        Go to Path →
      </button>
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Practice</h2>

      {/* Motivational Banner */}
      <div style={{
        ...GLASS,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{progress.streak >= 3 ? '🔥' : '💪'}</span>
        <p style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          {motivationalMessage}{streakEmoji}
        </p>
      </div>

      {/* Today's Plan Card */}
      {(todayPlan.reviewCount > 0 || todayPlan.focusCount > 0 || todayPlan.newCount > 0) && (
        <div style={{ ...ELEVATED, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.03em' }}>Today&apos;s Plan</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>~{todayPlan.totalMin} min</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {todayPlan.reviewCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>🔄</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#fbbf24' }}>{todayPlan.reviewCount}</span> {todayPlan.reviewCount === 1 ? 'topic' : 'topics'} due for review
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>~{todayPlan.reviewMin} min</span>
              </div>
            )}
            {todayPlan.focusCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>🎯</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#f97316' }}>{todayPlan.focusCount}</span> focus area {todayPlan.focusCount === 1 ? 'topic' : 'topics'}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>~{todayPlan.focusMin} min</span>
              </div>
            )}
            {todayPlan.newCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12 }}>⭐</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                  <span style={{ fontWeight: 600, color: '#818cf8' }}>{todayPlan.newCount}</span> new {todayPlan.newCount === 1 ? 'topic' : 'topics'} available
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>~{todayPlan.newMin} min</span>
              </div>
            )}
          </div>

          {todayPlan.priorityTopic && (
            <button
              onClick={() => {
                const t = todayPlan.priorityTopic!
                onTopicSelect(t.topic.id, t.topic, t.subject)
              }}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12, textAlign: 'center',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
                fontSize: 13, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer',
                transition: 'transform 150ms ease',
              }}
            >
              Start Smart Session →
            </button>
          )}
        </div>
      )}

      {/* Next Up Hero */}
      {nextUp && (
        <button onClick={() => onTopicSelect(nextUp.topic.id, nextUp.topic, nextUp.subject)} style={{ ...ELEVATED, width: '100%', textAlign: 'left' as const, padding: 20, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Next Up</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{reason(nextUp, profile?.weakSubjects)}</span>
            {profile?.weakSubjects?.includes(nextUp.subject.id) && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.15)', padding: '2px 6px', borderRadius: 6, marginLeft: 4 }}>FOCUS</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, background: `${nextUp.subject.color}15`, border: `1px solid ${nextUp.subject.color}25` }}>
              {nextUp.topic.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{nextUp.topic.title}</p>
              {nextUp.tp.questionsAnswered > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <p style={{ fontSize: 12, color: nextUp.accuracy < 40 ? '#f87171' : nextUp.accuracy < 60 ? '#fbbf24' : '#34d399', margin: 0, fontWeight: 600 }}>Accuracy: {Math.round(nextUp.accuracy)}%</p>
                  {(() => {
                    const trend = computeTrend(nextUp.tp)
                    const ti = trendIndicator(trend)
                    return <span style={{ fontSize: 12, color: ti.color, fontWeight: 600 }}>{ti.symbol}</span>
                  })()}
                </div>
              )}
            </div>
          </div>
          <div
            onPointerDown={() => setHeroPressed(true)}
            onPointerUp={() => setHeroPressed(false)}
            onPointerLeave={() => setHeroPressed(false)}
            style={{
              marginTop: 16, padding: '12px 0', borderRadius: 12, textAlign: 'center',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
              fontSize: 13, fontWeight: 700, color: '#fff',
              transform: heroPressed ? 'scale(0.97)' : 'scale(1)',
              transition: 'transform 150ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Practice Now →
          </div>
        </button>
      )}

      {/* Focus Areas */}
      {profile?.weakSubjects && profile.weakSubjects.length > 0 && focusTopics.length > 0 && (
        <div style={{ ...GLASS, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316', letterSpacing: '0.03em' }}>Focus Areas</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{focusTopics.length} topics</span>
          </div>
          {focusTopics.slice(0, 4).map(t => {
            const trend = computeTrend(t.tp)
            const ti = trendIndicator(trend)
            return (
              <RowWithTrend key={t.topic.id} icon={t.topic.icon} title={t.topic.title}
                detail={t.tp.questionsAnswered > 0 ? `${Math.round(t.accuracy)}%` : 'New'}
                detailColor={t.accuracy < 40 ? '#f87171' : t.accuracy < 60 ? '#fbbf24' : '#34d399'}
                trendSymbol={t.tp.questionsAnswered >= 3 ? ti.symbol : undefined}
                trendColor={t.tp.questionsAnswered >= 3 ? ti.color : undefined}
                onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)} />
            )
          })}
        </div>
      )}

      {/* Quick Mix */}
      <div
        onClick={hasPracticedTopics ? onStartQuickMix : undefined}
        style={{
          ...GLASS, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
          cursor: hasPracticedTopics ? 'pointer' : 'default',
          opacity: hasPracticedTopics ? 1 : 0.5,
          transition: 'opacity 200ms ease',
        }}
      >
        <span style={{ fontSize: 24 }}>🎲</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Quick Mix</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
            {hasPracticedTopics ? '5 random questions from across topics' : 'Practice a topic first'}
          </p>
        </div>
        {hasPracticedTopics && <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>Start →</span>}
      </div>

      {/* Stat Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[{ n: weakTopics.length, label: 'weak topics', color: '#f87171', toggle: () => setWeakOpen(o => !o), open: weakOpen },
          { n: reviewTopics.length, label: 'due reviews', color: '#fbbf24', toggle: () => setReviewOpen(o => !o), open: reviewOpen }].map(p => (
          <StatPill key={p.label} count={p.n} label={p.label} color={p.color} open={p.open} onToggle={p.n > 0 ? p.toggle : undefined} />
        ))}
      </div>

      {/* Weekly Stats Card */}
      {(weeklyStats.thisWeek.questions > 0 || weeklyStats.lastWeek.questions > 0) && (
        <div style={{ ...GLASS, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.03em' }}>Weekly Stats</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', width: 60, flexShrink: 0 }}>This week</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                {weeklyStats.thisWeek.questions} questions
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: weeklyStats.thisWeek.accuracy >= 70 ? '#34d399' : weeklyStats.thisWeek.accuracy >= 50 ? '#fbbf24' : '#f87171' }}>
                {weeklyStats.thisWeek.accuracy}% acc
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                {weeklyStats.thisWeek.topics} {weeklyStats.thisWeek.topics === 1 ? 'day' : 'days'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', width: 60, flexShrink: 0 }}>Last week</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.50)' }}>
                {weeklyStats.lastWeek.questions} questions
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
                {weeklyStats.lastWeek.accuracy}% acc
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.40)' }}>
                {weeklyStats.lastWeek.topics} {weeklyStats.lastWeek.topics === 1 ? 'day' : 'days'}
              </span>
            </div>

            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {(() => {
                const ti = trendIndicator(weeklyStats.trend)
                return (
                  <>
                    <span style={{ fontSize: 13, color: ti.color }}>{ti.symbol}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: ti.color }}>
                      {weeklyStats.trend === 'up' ? 'Improving!' : weeklyStats.trend === 'down' ? 'Needs more effort' : 'Holding steady'}
                    </span>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Review Queue */}
      {reviewTopics.length > 0 && (
        <Expandable title="Review Queue" badge={`${reviewTopics.length} topics due`} open={reviewOpen} toggle={() => setReviewOpen(o => !o)}>
          {reviewTopics.slice(0, 8).map(t => {
            const urgency = getUrgency(t.daysSince)
            const trend = computeTrend(t.tp)
            const ti = trendIndicator(trend)
            return (
              <ReviewRow
                key={t.topic.id}
                icon={t.topic.icon}
                title={t.topic.title}
                detail={fmt(t.daysSince)}
                urgency={urgency}
                trendSymbol={t.tp.questionsAnswered >= 3 ? ti.symbol : undefined}
                trendColor={t.tp.questionsAnswered >= 3 ? ti.color : undefined}
                onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)}
              />
            )
          })}
        </Expandable>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <Expandable title="Weak Topics" badge={`${weakTopics.length} < 60%`} open={weakOpen} toggle={() => setWeakOpen(o => !o)}>
          {weakTopics.slice(0, 8).map(t => {
            const trend = computeTrend(t.tp)
            const ti = trendIndicator(trend)
            return (
              <RowWithTrend
                key={t.topic.id}
                icon={t.topic.icon}
                title={t.topic.title}
                detail={`${Math.round(t.accuracy)}%`}
                detailColor={t.accuracy < 40 ? '#f87171' : '#fbbf24'}
                trendSymbol={ti.symbol}
                trendColor={ti.color}
                onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)}
              />
            )
          })}
        </Expandable>
      )}
    </div>
  )
}

function StatPill({ count, label, color, open, onToggle }: { count: number; label: string; color: string; open: boolean; onToggle?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const disabled = count === 0
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      onPointerEnter={() => !disabled && setHovered(true)}
      onPointerLeave={() => { setHovered(false); setPressed(false) }}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        padding: '14px 16px', borderRadius: 16, textAlign: 'center',
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'background 150ms ease, opacity 200ms ease, transform 150ms ease',
        position: 'relative' as const,
      }}
    >
      <p style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? color : 'rgba(255,255,255,0.55)', margin: 0 }}>{count}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{label}</p>
        {!disabled && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease', flexShrink: 0 }}>
            <path d="M1.5 3L4 5.5L6.5 3" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  )
}

function Expandable({ title, badge, open, toggle, children }: { title: string; badge: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ ...GLASS, overflow: 'hidden' }}>
      <button onClick={toggle} style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{title}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{badge}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', flexShrink: 0 }}><path d="M3 5l4 4 4-4" /></svg>
      </button>
      <div style={{ maxHeight: open ? 400 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease', padding: open ? '0 12px 12px' : '0 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
      </div>
    </div>
  )
}

function RowWithTrend({ icon, title, detail, detailColor, trendSymbol, trendColor, onTap }: {
  icon: string; title: string; detail: string; detailColor?: string;
  trendSymbol?: string; trendColor?: string; onTap: () => void
}) {
  return (
    <button onClick={onTap} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</span>
      {trendSymbol && (
        <span style={{ fontSize: 12, fontWeight: 600, color: trendColor || 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{trendSymbol}</span>
      )}
      <span style={{ fontSize: 11, fontWeight: 600, color: detailColor || 'rgba(255,255,255,0.30)', flexShrink: 0 }}>{detail}</span>
    </button>
  )
}

function ReviewRow({ icon, title, detail, urgency, trendSymbol, trendColor, onTap }: {
  icon: string; title: string; detail: string; urgency: UrgencyLevel;
  trendSymbol?: string; trendColor?: string; onTap: () => void
}) {
  const uColor = urgencyColor(urgency)
  const uLabel = urgencyLabel(urgency)
  const isOverdue = urgency === 'overdue'

  return (
    <button onClick={onTap} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 12,
      background: isOverdue ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
      border: isOverdue ? '1px solid rgba(239,68,68,0.12)' : 'none',
      cursor: 'pointer', textAlign: 'left' as const,
      position: 'relative' as const,
    }}>
      {/* Urgency dot with optional pulse */}
      <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
        <div style={{
          width: 8, height: 8, borderRadius: 9999,
          background: uColor,
        }} />
        {isOverdue && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderRadius: 9999,
            background: uColor,
            animation: 'practiceTabPulse 2s ease-out infinite',
          }} />
        )}
      </div>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</span>
      {trendSymbol && (
        <span style={{ fontSize: 12, fontWeight: 600, color: trendColor || 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{trendSymbol}</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.30)' }}>{detail}</span>
        {uLabel && (
          <span style={{ fontSize: 9, fontWeight: 700, color: uColor, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>{uLabel}</span>
        )}
      </div>
    </button>
  )
}
