'use client'

import { useMemo } from 'react'
import type { JourneyProgress, NodeState, UserProfile } from './types'
import { DAILY_GOALS, PREP_STAGE_CONFIG, ACHIEVEMENTS, GLASS_STYLE, ELEVATED_STYLE } from './types'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TopicStateEntry {
  state: NodeState
  topic: LearningTopic
  subject: LearningSubject
}

interface HomeTabProps {
  progress: JourneyProgress
  subjects?: LearningSubject[]
  topicStates: Record<string, TopicStateEntry>
  onTopicTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onNavigateToPath: () => void
  profile: UserProfile | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysBetween(dateStr: string, today: string): number {
  const d1 = new Date(dateStr)
  const d2 = new Date(today)
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000)
}

// ── Shared Card Styles ─────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  ...GLASS_STYLE,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding: '14px 16px',
  marginBottom: 16,
}

const elevatedGlassCard: React.CSSProperties = {
  ...ELEVATED_STYLE,
  padding: 20,
  marginBottom: 20,
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function MiniProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{
      flex: 1,
      height,
      borderRadius: height / 2,
      background: 'rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        borderRadius: height / 2,
        background: color,
        width: `${Math.min(100, Math.max(0, pct))}%`,
        transition: 'width 500ms ease-out',
      }} />
    </div>
  )
}

// ── Crown Mini Ring ────────────────────────────────────────────────────────────

function CrownMiniRing({ level, maxLevel = 5 }: { level: number; maxLevel?: number }) {
  const pct = Math.min(100, (level / maxLevel) * 100)
  const r = 9
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * pct) / 100

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle
          cx="11" cy="11" r={r}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
        Crown {level}/{maxLevel}
      </span>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HomeTab({
  progress,
  subjects,
  topicStates,
  onTopicTap,
  onNavigateToPath,
  profile,
}: HomeTabProps) {

  const today = getToday()

  // ── Compute continue topic ─────────────────────────────────────────────────
  const continueTopic = useMemo(() => {
    let best: TopicStateEntry | null = null
    let bestDate = ''
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'started') {
        const tp = progress.topics[entry.topic.id]
        const lastPrac = tp?.lastPracticed || ''
        if (!best || lastPrac > bestDate) {
          best = entry
          bestDate = lastPrac
        }
      }
    }
    if (best) return best
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'available') return entry
    }
    return null
  }, [topicStates, progress.topics])

  // ── Up next topics ─────────────────────────────────────────────────────────
  const upNext = useMemo(() => {
    const available: TopicStateEntry[] = []
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'available' && entry.topic.id !== continueTopic?.topic.id) {
        available.push(entry)
      }
    }
    if (profile?.weakSubjects?.length) {
      const weakSet = new Set(profile.weakSubjects)
      available.sort((a, b) => {
        const aWeak = weakSet.has(a.subject.id) ? 0 : 1
        const bWeak = weakSet.has(b.subject.id) ? 0 : 1
        return aWeak - bWeak
      })
    }
    return available.slice(0, 3)
  }, [topicStates, continueTopic, profile])

  // ── Today stats ────────────────────────────────────────────────────────────
  const goalCfg = DAILY_GOALS[progress.dailyGoalTier || 'regular']
  const todayRead = progress.todayTopicsRead || 0
  const todayPracticed = progress.todayTopicsPracticed || 0
  const readMet = todayRead >= goalCfg.readTarget
  const practiceMet = todayPracticed >= goalCfg.practiceTarget
  const goalMet = readMet && practiceMet

  const totalCorrect = useMemo(() => {
    let totalC = 0
    for (const tp of Object.values(progress.topics)) {
      totalC += tp.correctAnswers
    }
    return totalC
  }, [progress.topics])

  // ── Syllabus completion stats ──────────────────────────────────────────────
  const { completedTopics, totalTopics } = useMemo(() => {
    const states = Object.values(topicStates)
    return {
      completedTopics: states.filter(s => s.state === 'completed').length,
      totalTopics: states.length,
    }
  }, [topicStates])

  const crowns3Plus = useMemo(() => {
    return Object.values(progress.topics).filter(t => t.crownLevel >= 3).length
  }, [progress.topics])

  // ── Study pace calculations ───────────────────────────────────────────────
  const daysUntilExam = useMemo(() => {
    if (!profile?.examYear) return null
    const prelimsDate = new Date(profile.examYear, 4, 25)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.ceil((prelimsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : null
  }, [profile?.examYear])

  const paceStatus = useMemo(() => {
    if (!profile || !daysUntilExam || daysUntilExam <= 0 || totalTopics === 0) return null
    const remaining = totalTopics - completedTopics
    const topicsPerWeek = remaining > 0 ? Math.ceil((remaining / daysUntilExam) * 7 * 10) / 10 : 0
    const prelimsDate = new Date(profile.examYear!, 4, 25)
    const startOfPrep = new Date(prelimsDate)
    startOfPrep.setFullYear(startOfPrep.getFullYear() - 1)
    const totalDays = Math.ceil((prelimsDate.getTime() - startOfPrep.getTime()) / (1000 * 60 * 60 * 24))
    const timeElapsed = Math.max(0, Math.min(100, Math.round(((totalDays - daysUntilExam) / totalDays) * 100)))
    const syllabusPercent = Math.round((completedTopics / totalTopics) * 100)
    const paceRatio = syllabusPercent > 0 && timeElapsed > 0 ? syllabusPercent / timeElapsed : 0

    let status: 'ahead' | 'on_track' | 'behind' = 'on_track'
    if (paceRatio >= 1.2) status = 'ahead'
    else if (paceRatio < 0.6) status = 'behind'

    return { topicsPerWeek, syllabusPercent, timeElapsed, paceRatio, status, remaining }
  }, [profile, daysUntilExam, totalTopics, completedTopics])

  // ── Motivational insight ──────────────────────────────────────────────────
  const motivationalInsight = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = toLocalDateString(sevenDaysAgo)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const prevCutoff = toLocalDateString(fourteenDaysAgo)

    const thisWeek = progress.studyCalendar.filter(d => d.date >= cutoff && d.date <= today)
    const prevWeek = progress.studyCalendar.filter(d => d.date >= prevCutoff && d.date < cutoff)

    const thisWeekQ = thisWeek.reduce((s, d) => s + d.questionsAnswered, 0)
    const prevWeekQ = prevWeek.reduce((s, d) => s + d.questionsAnswered, 0)

    if (totalTopics > 0 && completedTopics / totalTopics > 0.5) {
      return { emoji: '\uD83C\uDFAF', text: `Over halfway there! ${completedTopics} of ${totalTopics} topics done. The finish line is in sight.` }
    }
    if (progress.streak >= 7) {
      return { emoji: '\uD83D\uDD25', text: `Your ${progress.streak}-day streak puts you in the top 15% of consistent learners.` }
    }
    if (paceStatus?.status === 'ahead') {
      const weeksAhead = paceStatus.remaining > 0 && paceStatus.topicsPerWeek > 0
        ? Math.round(((paceStatus.syllabusPercent - paceStatus.timeElapsed) / 100) * (daysUntilExam || 365) / 7)
        : 0
      return { emoji: '\uD83D\uDE80', text: `You're ${Math.max(1, weeksAhead)} week${weeksAhead !== 1 ? 's' : ''} ahead of schedule. Keep this energy!` }
    }
    if (paceStatus?.status === 'behind') {
      const topicsBehind = Math.max(1, Math.round(
        (paceStatus.timeElapsed / 100 * totalTopics) - completedTopics
      ))
      return { emoji: '\u23F0', text: `You're ${topicsBehind} topics behind pace. A focused weekend can fix this!` }
    }
    if (thisWeekQ > prevWeekQ && prevWeekQ > 0) {
      const pctImprove = Math.round(((thisWeekQ - prevWeekQ) / prevWeekQ) * 100)
      return { emoji: '\uD83D\uDCC8', text: `Your activity improved ${pctImprove}% this week. You're getting sharper!` }
    }
    if (progress.streak > 0) {
      return { emoji: '\uD83D\uDCAA', text: `${progress.streak}-day streak and counting. Every topic brings you closer to your goal.` }
    }
    return { emoji: '\u2728', text: 'Start studying today to build momentum. Consistency beats intensity!' }
  }, [progress, paceStatus, totalTopics, completedTopics, daysUntilExam, today])

  // ── Next achievements (filtered to >75%, max 2) ───────────────────────────
  const nextAchievements = useMemo(() => {
    const unlockedIds = new Set(progress.achievements.map(a => a.id))
    const maxCrown = Math.max(0, ...Object.values(progress.topics).map(t => t.crownLevel))

    type AchProg = { id: string; title: string; icon: string; current: number; target: number; pct: number }
    const candidates: AchProg[] = []

    for (const ach of ACHIEVEMENTS) {
      if (unlockedIds.has(ach.id)) continue
      let current = 0
      let target = 1

      switch (ach.id) {
        case 'first-topic': current = completedTopics; target = 1; break
        case 'ten-topics': current = completedTopics; target = 10; break
        case 'twentyfive-topics': current = completedTopics; target = 25; break
        case 'fifty-topics': current = completedTopics; target = 50; break
        case 'hundred-topics': current = completedTopics; target = 100; break
        case 'hundred-questions': current = totalCorrect; target = 100; break
        case 'five-hundred-questions': current = totalCorrect; target = 500; break
        case 'fifty-gems': current = progress.gems; target = 50; break
        case 'streak-3': current = progress.streak; target = 3; break
        case 'streak-7': current = progress.streak; target = 7; break
        case 'streak-14': current = progress.streak; target = 14; break
        case 'streak-30': current = progress.streak; target = 30; break
        case 'streak-100': current = progress.streak; target = 100; break
        case 'first-crown': current = maxCrown >= 1 ? 1 : 0; target = 1; break
        case 'crown-3': current = maxCrown; target = 3; break
        case 'crown-5': current = maxCrown; target = 5; break
        case 'five-crowns': current = crowns3Plus; target = 5; break
        case 'ten-crowns': current = crowns3Plus; target = 10; break
        case 'first-perfect': current = progress.perfectScores; target = 1; break
        case 'five-perfects': current = progress.perfectScores; target = 5; break
        case 'fifty-correct': current = totalCorrect; target = 50; break
        case 'hundred-correct': current = totalCorrect; target = 100; break
        case 'two-fifty-correct': current = totalCorrect; target = 250; break
        case 'daily-goal-met': current = goalMet ? 1 : 0; target = 1; break
        case 'daily-goal-7': current = progress.goalStreakDays; target = 7; break
        default: continue
      }

      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      if (pct > 75 && pct < 100) {
        candidates.push({ id: ach.id, title: ach.title, icon: ach.icon, current, target, pct })
      }
    }

    candidates.sort((a, b) => b.pct - a.pct)
    return candidates.slice(0, 2)
  }, [progress, completedTopics, crowns3Plus, totalCorrect, goalMet])

  // ── Today's Plan ──────────────────────────────────────────────────────────
  const todayPlan = useMemo(() => {
    // Review due: completed topics with lastPracticed >= 3 days ago
    const reviewDue: Array<{ topicId: string; entry: TopicStateEntry; daysAgo: number }> = []
    for (const [topicId, tp] of Object.entries(progress.topics)) {
      if (tp.state !== 'completed') continue
      if (!tp.lastPracticed) continue
      const daysAgo = daysBetween(tp.lastPracticed, today)
      if (daysAgo < 3) continue
      const entry = topicStates[topicId]
      if (entry) reviewDue.push({ topicId, entry, daysAgo })
    }
    reviewDue.sort((a, b) => b.daysAgo - a.daysAgo)

    // Focus area weak topics
    const weakSet = new Set(profile?.weakSubjects || [])
    const focusWeak: TopicStateEntry[] = []
    for (const [topicId, tp] of Object.entries(progress.topics)) {
      if (tp.questionsAnswered < 3) continue
      const acc = tp.correctAnswers / tp.questionsAnswered
      if (acc >= 0.6) continue
      const entry = topicStates[topicId]
      if (entry && weakSet.has(entry.subject.id)) focusWeak.push(entry)
    }

    // New available topics
    const availableNew = Object.values(topicStates).filter(e => e.state === 'available')

    const reviewCount = reviewDue.length
    const focusCount = Math.min(focusWeak.length, 2)
    const newCount = Math.min(availableNew.length, 2)
    const totalMin = reviewCount * 5 + focusCount * 8 + newCount * 6

    // Priority topic for smart session
    let priorityEntry: TopicStateEntry | null = null
    if (reviewDue[0]) priorityEntry = reviewDue[0].entry
    else if (focusWeak[0]) priorityEntry = focusWeak[0]
    else if (availableNew[0]) priorityEntry = availableNew[0]

    return { reviewCount, focusCount, newCount, totalMin, priorityEntry }
  }, [progress.topics, topicStates, profile, today])

  // ── Whether user has started / all completed ──────────────────────────────
  const hasStarted = useMemo(() => {
    return Object.values(topicStates).some(
      (s) => s.state === 'started' || s.state === 'completed'
    )
  }, [topicStates])

  const allCompleted = useMemo(() => {
    const states = Object.values(topicStates)
    const completed = states.filter((s) => s.state === 'completed').length
    return completed > 0 && states.every((s) => s.state === 'completed' || s.state === 'locked')
  }, [topicStates])

  // ── Profile-derived personalization ────────────────────────────────────────
  const firstName = profile?.name ? profile.name.split(' ')[0] : null
  const prepStage = profile ? PREP_STAGE_CONFIG[profile.prepStage] : null
  const crownLevel = continueTopic ? (progress.topics[continueTopic.topic.id]?.crownLevel || 0) : 0

  const weakSubjectNames = useMemo(() => {
    if (!profile?.weakSubjects?.length || !subjects?.length) return null
    const names = profile.weakSubjects
      .map(id => subjects.find(s => s.id === id)?.shortTitle || subjects.find(s => s.id === id)?.title)
      .filter(Boolean) as string[]
    return names.length > 0 ? names : null
  }, [profile?.weakSubjects, subjects])

  // ── Animation delay counter ───────────────────────────────────────────────
  let animDelay = 0
  const nextDelay = () => {
    animDelay += 100
    return animDelay
  }

  // ── Daily goal progress ────────────────────────────────────────────────────
  const readPct = goalCfg.readTarget > 0 ? Math.min(100, (todayRead / goalCfg.readTarget) * 100) : 100
  const practicePct = goalCfg.practiceTarget > 0 ? Math.min(100, (todayPracticed / goalCfg.practiceTarget) * 100) : 100

  const hasPlanItems = todayPlan.reviewCount > 0 || todayPlan.focusCount > 0 || todayPlan.newCount > 0

  return (
    <div style={{ minHeight: '100vh', padding: '16px 16px 100px 16px' }}>
      <style>{`
        @keyframes homeGlowIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══ SECTION 1: Compact Header ═══ */}
      <div style={{
        animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
        marginBottom: 16,
        paddingTop: 4,
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {getGreeting()}{firstName ? `, ${firstName}` : ''}!
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {prepStage && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '3px 8px',
            }}>
              {prepStage.icon} {prepStage.label}
            </span>
          )}
          {daysUntilExam != null && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(129,140,248,0.85)',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.20)',
              borderRadius: 20,
              padding: '3px 8px',
            }}>
              {daysUntilExam} days to Prelims
            </span>
          )}
        </div>
      </div>

      {/* ═══ SECTION 2: Daily Progress Card ═══ */}
      <div style={{
        ...elevatedGlassCard,
        animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* SVG Ring */}
          {(() => {
            const combinedPct = Math.round((readPct + practicePct) / 2)
            const ringR = 26
            const ringCirc = 2 * Math.PI * ringR
            const ringOffset = ringCirc - (ringCirc * combinedPct) / 100
            return (
              <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={ringR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r={ringR}
                    fill="none"
                    stroke={goalMet ? '#34d399' : '#6366f1'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringOffset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 500ms ease-out' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: goalMet ? 20 : 14,
                  fontWeight: 700,
                  color: goalMet ? '#34d399' : 'rgba(255,255,255,0.92)',
                }}>
                  {goalMet ? '\u2713' : `${combinedPct}%`}
                </div>
              </div>
            )
          })()}

          {/* Right side info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.70)',
              marginBottom: 8,
            }}>
              Daily Goal
            </div>

            {/* Read progress */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: readMet ? '#34d399' : 'rgba(255,255,255,0.50)', fontWeight: 600 }}>
                  Topics Read
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: readMet ? '#34d399' : 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>
                  {todayRead}/{goalCfg.readTarget}
                </span>
              </div>
              <MiniProgressBar pct={readPct} color={readMet ? '#34d399' : 'linear-gradient(90deg, #6366f1, #a78bfa)'} height={5} />
            </div>

            {/* Practice progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: practiceMet ? '#34d399' : 'rgba(255,255,255,0.50)', fontWeight: 600 }}>
                  Practice Sessions
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: practiceMet ? '#34d399' : 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>
                  {todayPracticed}/{goalCfg.practiceTarget}
                </span>
              </div>
              <MiniProgressBar pct={practicePct} color={practiceMet ? '#34d399' : 'linear-gradient(90deg, #8b5cf6, #a78bfa)'} height={5} />
            </div>

            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Streak badge */}
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: progress.streak > 0 ? '#f97316' : 'rgba(255,255,255,0.35)',
              }}>
                {progress.streak > 0 ? `\uD83D\uDD25 ${progress.streak}-day streak` : 'Start a streak!'}
              </span>

              {/* Goal met indicator */}
              {goalMet && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#34d399',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Goal complete!
                </span>
              )}
            </div>

            {/* Goal streak row */}
            {progress.goalStreakDays > 0 && (
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.40)',
                marginTop: 4,
              }}>
                \uD83C\uDFAF {progress.goalStreakDays}d meeting goal in a row
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: Action Card (Primary CTA) ═══ */}
      {!hasStarted && !allCompleted ? (
        /* Welcome card */
        <div style={{
          ...elevatedGlassCard,
          padding: 24,
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            marginBottom: 6,
          }}>
            Welcome{firstName ? `, ${firstName}` : ', Aspirant'}! {'\uD83D\uDC4B'}
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
            marginBottom: weakSubjectNames ? 6 : 16,
          }}>
            280 topics across the UPSC syllabus await you.
          </div>
          {weakSubjectNames && (
            <div style={{
              fontSize: 13,
              color: 'rgba(129,140,248,0.85)',
              lineHeight: 1.5,
              marginBottom: 16,
              fontWeight: 500,
            }}>
              We&apos;ll focus on {weakSubjectNames.join(', ')}
            </div>
          )}
          <button
            onClick={onNavigateToPath}
            style={{
              width: '100%',
              height: 48,
              border: 'none',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              transition: 'transform 150ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            Begin Your Journey
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : continueTopic ? (
        /* Continue / Resume card */
        <div style={{
          ...elevatedGlassCard,
          position: 'relative',
          overflow: 'hidden',
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
        }}>
          {/* Accent edge */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0, width: 3,
            borderRadius: '20px 0 0 20px',
            background: continueTopic.subject.color,
          }} />

          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.40)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Continue
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{continueTopic.topic.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
              {continueTopic.topic.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: continueTopic.subject.color, fontWeight: 500 }}>
              {continueTopic.subject.title}
            </span>
            <CrownMiniRing level={crownLevel} />
          </div>

          <button
            onClick={() => onTopicTap(continueTopic.topic.id, continueTopic.topic, continueTopic.subject)}
            style={{
              width: '100%',
              height: 48,
              border: 'none',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              transition: 'transform 150ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            Resume
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : allCompleted ? (
        /* Celebration card */
        <div style={{
          ...elevatedGlassCard,
          padding: 24,
          textAlign: 'center',
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83C\uDF89'}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 6 }}>
            You&apos;re all caught up!
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            All topics are completed. Great work!
          </div>
        </div>
      ) : null}

      {/* ═══ SECTION 4: Today's Plan Checklist ═══ */}
      {hasPlanItems && (
        <div style={{
          ...glassCard,
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>{'\uD83D\uDCCB'}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                Today&apos;s Plan
              </span>
            </div>
            {todayPlan.totalMin > 0 && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                ~{todayPlan.totalMin} min
              </span>
            )}
          </div>

          {/* Checklist items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayPlan.reviewCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{'\uD83D\uDD04'}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>
                  Review {todayPlan.reviewCount} overdue topic{todayPlan.reviewCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {todayPlan.focusCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{'\uD83C\uDFAF'}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>
                  Practice {todayPlan.focusCount} focus area topic{todayPlan.focusCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            {todayPlan.newCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>{'\u2B50'}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>
                  Start {todayPlan.newCount} new topic{todayPlan.newCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Smart Session CTA */}
          {todayPlan.priorityEntry && (
            <button
              onClick={() => {
                const e = todayPlan.priorityEntry!
                onTopicTap(e.topic.id, e.topic, e.subject)
              }}
              style={{
                width: '100%',
                marginTop: 14,
                height: 40,
                border: 'none',
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(99,102,241,0.15))',
                color: '#34d399',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'transform 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
              onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              Start Smart Session
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ═══ SECTION 5: Up Next (3 topics) ═══ */}
      {upNext.length > 0 && (
        <div style={{ animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`, marginBottom: 16 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 10,
          }}>
            Up Next
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upNext.map((entry: TopicStateEntry) => (
              <button
                key={entry.topic.id}
                onClick={() => onTopicTap(entry.topic.id, entry.topic, entry.subject)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  ...GLASS_STYLE,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 16,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 150ms ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{entry.topic.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.92)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.topic.title}
                  </div>
                  <div style={{ fontSize: 11, color: entry.subject.color, marginTop: 2, fontWeight: 500 }}>
                    {entry.subject.title}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                  <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>

          <button
            onClick={onNavigateToPath}
            style={{
              marginTop: 10,
              background: 'none',
              border: 'none',
              color: '#818cf8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View all topics
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* ═══ SECTION 6: Motivational Insight + Near Achievements ═══ */}
      <div style={{
        ...glassCard,
        marginTop: 4,
        border: '1px solid rgba(99,102,241,0.12)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))',
        animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
      }}>
        {/* Motivational insight */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: nextAchievements.length > 0 ? 14 : 0 }}>
          <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
            {motivationalInsight.emoji}
          </span>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.70)',
            lineHeight: 1.5,
            fontWeight: 500,
          }}>
            {motivationalInsight.text}
          </div>
        </div>

        {/* Near achievements (>75% progress, max 2) */}
        {nextAchievements.length > 0 && (
          <div style={{
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Almost There
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nextAchievements.map(ach => (
                <div key={ach.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{ach.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', flex: 1 }}>
                      {ach.title}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: ach.pct >= 90 ? '#fbbf24' : 'rgba(255,255,255,0.45)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {ach.current}/{ach.target}
                    </span>
                  </div>
                  <MiniProgressBar
                    pct={ach.pct}
                    color={ach.pct >= 90 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #6366f1, #a78bfa)'}
                    height={4}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
