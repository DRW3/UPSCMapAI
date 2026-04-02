'use client'

import { useMemo } from 'react'
import type { JourneyProgress, NodeState, UserProfile, CrownLevel } from './types'
import { DAILY_GOALS, PREP_STAGE_CONFIG, ACHIEVEMENTS, CROWN_COLORS } from './types'
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
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(dateStr: string, today: string): number {
  const d1 = new Date(dateStr)
  const d2 = new Date(today)
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000)
}

// ── Shared Card Style ──────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 20,
  padding: '14px 16px',
  marginBottom: 16,
}

const elevatedGlassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  borderRadius: 20,
  padding: 20,
  marginBottom: 24,
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

// ── Progress Bar Component ─────────────────────────────────────────────────────

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
  const todayXp = progress.todayXp || 0
  const goalXp = DAILY_GOALS[progress.dailyGoalTier || 'regular'].xpTarget

  const { accuracy, totalQuestions, totalCorrect } = useMemo(() => {
    let totalQ = 0
    let totalC = 0
    for (const tp of Object.values(progress.topics)) {
      totalQ += tp.questionsAnswered
      totalC += tp.correctAnswers
    }
    return {
      accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
      totalQuestions: totalQ,
      totalCorrect: totalC,
    }
  }, [progress.topics])

  // ── Today's calendar entry ─────────────────────────────────────────────────
  const todayCalendar = useMemo(() => {
    return progress.studyCalendar.find(d => d.date === today) || null
  }, [progress.studyCalendar, today])

  // ── Syllabus completion stats ──────────────────────────────────────────────
  const { completedTopics, totalTopics } = useMemo(() => {
    const states = Object.values(topicStates)
    return {
      completedTopics: states.filter(s => s.state === 'completed').length,
      totalTopics: states.length,
    }
  }, [topicStates])

  // ── Crown distribution ────────────────────────────────────────────────────
  const crownDistribution = useMemo(() => {
    const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const tp of Object.values(progress.topics)) {
      const cl = tp.crownLevel || 0
      dist[cl] = (dist[cl] || 0) + 1
    }
    // count all topics not in progress.topics as crown 0
    const trackedCount = Object.keys(progress.topics).length
    const untrackedCount = Object.keys(topicStates).length - trackedCount
    dist[0] += Math.max(0, untrackedCount)
    return dist
  }, [progress.topics, topicStates])

  const crowns3Plus = useMemo(() => {
    return Object.values(progress.topics).filter(t => t.crownLevel >= 3).length
  }, [progress.topics])

  // ── Exam readiness gauge ──────────────────────────────────────────────────
  const examReadiness = useMemo(() => {
    if (totalTopics === 0) return null
    const completionScore = (completedTopics / totalTopics) * 0.5
    const accuracyScore = (accuracy / 100) * 0.3
    const masteryScore = (crowns3Plus / totalTopics) * 0.2
    const readiness = Math.round((completionScore + accuracyScore + masteryScore) * 100)
    return Math.min(100, readiness)
  }, [completedTopics, totalTopics, accuracy, crowns3Plus])

  const readinessColor = useMemo(() => {
    if (examReadiness === null) return '#6366f1'
    if (examReadiness > 60) return '#34d399'
    if (examReadiness >= 40) return '#fbbf24'
    return '#ef4444'
  }, [examReadiness])

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

  // ── Weekly momentum ───────────────────────────────────────────────────────
  const weeklyMomentum = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10)

    const thisWeekEntries = progress.studyCalendar.filter(d => d.date >= cutoff && d.date <= today)
    const weekXp = thisWeekEntries.reduce((s, d) => s + d.xpEarned, 0)
    const weekQuestions = thisWeekEntries.reduce((s, d) => s + d.questionsAnswered, 0)
    const daysActive = thisWeekEntries.length

    // Count topics practiced this week by checking lastPracticed dates
    let topicsPracticedThisWeek = 0
    for (const tp of Object.values(progress.topics)) {
      if (tp.lastPracticed && tp.lastPracticed >= cutoff && tp.lastPracticed <= today) {
        topicsPracticedThisWeek++
      }
    }

    // Previous week for comparison
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const prevCutoff = fourteenDaysAgo.toISOString().slice(0, 10)
    const prevWeekEntries = progress.studyCalendar.filter(d => d.date >= prevCutoff && d.date < cutoff)
    const prevWeekXp = prevWeekEntries.reduce((s, d) => s + d.xpEarned, 0)

    const isBestWeek = weekXp > prevWeekXp && prevWeekXp > 0

    return {
      topicsPracticed: topicsPracticedThisWeek,
      questions: weekQuestions,
      xp: weekXp,
      daysActive,
      isBestWeek,
    }
  }, [progress.studyCalendar, progress.topics, today])

  // ── Next achievements ─────────────────────────────────────────────────────
  const nextAchievements = useMemo(() => {
    const unlockedIds = new Set(progress.achievements.map(a => a.id))
    const maxCrown = Math.max(0, ...Object.values(progress.topics).map(t => t.crownLevel))

    // For each locked achievement, compute progress percentage
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
        case 'five-hundred-xp': current = progress.totalXp; target = 500; break
        case 'two-thousand-xp': current = progress.totalXp; target = 2000; break
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
        case 'daily-goal-met': current = todayXp >= goalXp ? 1 : 0; target = 1; break
        case 'daily-goal-7': current = progress.goalStreakDays; target = 7; break
        default: continue
      }

      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      if (pct > 0 && pct < 100) {
        candidates.push({ id: ach.id, title: ach.title, icon: ach.icon, current, target, pct })
      }
    }

    // Sort by highest progress, take top 3
    candidates.sort((a, b) => b.pct - a.pct)
    return candidates.slice(0, 3)
  }, [progress, completedTopics, crowns3Plus, totalCorrect, todayXp, goalXp])

  // ── Spaced repetition queue ───────────────────────────────────────────────
  const spacedRepetitionQueue = useMemo(() => {
    const queue: Array<{
      topicId: string
      title: string
      icon: string
      subjectColor: string
      daysAgo: number
    }> = []

    for (const [topicId, tp] of Object.entries(progress.topics)) {
      if (tp.state !== 'completed' && tp.state !== 'started') continue
      if (!tp.lastPracticed) continue

      const daysAgo = daysBetween(tp.lastPracticed, today)
      if (daysAgo < 3) continue

      const entry = topicStates[topicId]
      if (!entry) continue

      queue.push({
        topicId,
        title: entry.topic.title,
        icon: entry.topic.icon,
        subjectColor: entry.subject.color,
        daysAgo,
      })
    }

    queue.sort((a, b) => b.daysAgo - a.daysAgo)
    return queue.slice(0, 5)
  }, [progress.topics, topicStates, today])

  // ── Motivational insight ──────────────────────────────────────────────────
  const motivationalInsight = useMemo(() => {
    // Check accuracy trend (compare this week vs last week)
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const prevCutoff = fourteenDaysAgo.toISOString().slice(0, 10)

    const thisWeek = progress.studyCalendar.filter(d => d.date >= cutoff && d.date <= today)
    const prevWeek = progress.studyCalendar.filter(d => d.date >= prevCutoff && d.date < cutoff)

    const thisWeekQ = thisWeek.reduce((s, d) => s + d.questionsAnswered, 0)
    const prevWeekQ = prevWeek.reduce((s, d) => s + d.questionsAnswered, 0)

    // Over halfway
    if (totalTopics > 0 && completedTopics / totalTopics > 0.5) {
      return { emoji: '\uD83C\uDFAF', text: `Over halfway there! ${completedTopics} of ${totalTopics} topics done. The finish line is in sight.` }
    }

    // Long streak
    if (progress.streak >= 7) {
      return { emoji: '\uD83D\uDD25', text: `Your ${progress.streak}-day streak puts you in the top 15% of consistent learners.` }
    }

    // Ahead of schedule
    if (paceStatus?.status === 'ahead') {
      const weeksAhead = paceStatus.remaining > 0 && paceStatus.topicsPerWeek > 0
        ? Math.round(((paceStatus.syllabusPercent - paceStatus.timeElapsed) / 100) * (daysUntilExam || 365) / 7)
        : 0
      return { emoji: '\uD83D\uDE80', text: `You're ${Math.max(1, weeksAhead)} week${weeksAhead !== 1 ? 's' : ''} ahead of schedule. Keep this energy!` }
    }

    // Behind pace
    if (paceStatus?.status === 'behind') {
      const topicsBehind = Math.max(1, Math.round(
        (paceStatus.timeElapsed / 100 * totalTopics) - completedTopics
      ))
      return { emoji: '\u23F0', text: `You're ${topicsBehind} topics behind pace. A focused weekend can fix this!` }
    }

    // Improving activity
    if (thisWeekQ > prevWeekQ && prevWeekQ > 0) {
      const pctImprove = Math.round(((thisWeekQ - prevWeekQ) / prevWeekQ) * 100)
      return { emoji: '\uD83D\uDCC8', text: `Your activity improved ${pctImprove}% this week. You're getting sharper!` }
    }

    // Default encouraging message
    if (progress.streak > 0) {
      return { emoji: '\uD83D\uDCAA', text: `${progress.streak}-day streak and counting. Every topic brings you closer to your goal.` }
    }

    return { emoji: '\u2728', text: 'Start studying today to build momentum. Consistency beats intensity!' }
  }, [progress, paceStatus, totalTopics, completedTopics, daysUntilExam, today])

  // ── Streak milestone progress ──────────────────────────────────────────────
  const streakMilestones = [3, 7, 14, 30, 50, 100]
  const nextMilestone = streakMilestones.find(m => m > progress.streak) || streakMilestones[streakMilestones.length - 1]
  const prevMilestone = streakMilestones.filter(m => m <= progress.streak).pop() || 0
  const milestoneProgress = nextMilestone > prevMilestone
    ? ((progress.streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100

  // ── Crown level for continue topic ────────────────────────────────────────
  const continueTopicProgress = continueTopic
    ? progress.topics[continueTopic.topic.id]
    : null
  const crownLevel = continueTopicProgress?.crownLevel || 0

  // Whether any topic has been started or completed
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

  const weakSubjectNames = useMemo(() => {
    if (!profile?.weakSubjects?.length || !subjects?.length) return null
    const names = profile.weakSubjects
      .map(id => subjects.find(s => s.id === id)?.shortTitle || subjects.find(s => s.id === id)?.title)
      .filter(Boolean) as string[]
    return names.length > 0 ? names : null
  }, [profile?.weakSubjects, subjects])

  // ── Focus subject progress (weak subjects) ────────────────────────────────
  const focusSubjectProgress = useMemo(() => {
    if (!profile?.weakSubjects?.length || !subjects?.length) return null
    return profile.weakSubjects.map(id => {
      const subject = subjects.find(s => s.id === id)
      if (!subject) return null
      const allTopics = subject.units.flatMap(u => u.topics)
      const completed = allTopics.filter(t => {
        const tp = progress.topics[t.id]
        return tp && tp.state === 'completed'
      }).length
      const totalQ = allTopics.reduce((sum, t) => sum + (progress.topics[t.id]?.questionsAnswered || 0), 0)
      const totalC = allTopics.reduce((sum, t) => sum + (progress.topics[t.id]?.correctAnswers || 0), 0)
      const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : null
      return { subject, total: allTopics.length, completed, accuracy: acc, pct: allTopics.length > 0 ? Math.round((completed / allTopics.length) * 100) : 0 }
    }).filter(Boolean) as Array<{ subject: LearningSubject; total: number; completed: number; accuracy: number | null; pct: number }>
  }, [profile?.weakSubjects, subjects, progress.topics])

  // ── Strong subject review check ───────────────────────────────────────────
  const strongSubjectReview = useMemo(() => {
    if (!profile?.strongSubjects?.length || !subjects?.length) return null
    const now = Date.now()
    const needsReview = profile.strongSubjects.map(id => {
      const subject = subjects.find(s => s.id === id)
      if (!subject) return null
      const practiced = subject.units.flatMap(u => u.topics).filter(t => progress.topics[t.id]?.lastPracticed)
      if (practiced.length === 0) return null
      const latestPractice = Math.max(...practiced.map(t => new Date(progress.topics[t.id].lastPracticed!).getTime()))
      const daysSince = Math.floor((now - latestPractice) / 86400000)
      return daysSince >= 5 ? { subject, daysSince } : null
    }).filter(Boolean) as Array<{ subject: LearningSubject; daysSince: number }>
    return needsReview.length > 0 ? needsReview : null
  }, [profile?.strongSubjects, subjects, progress.topics])

  // ── Goal streak milestones ────────────────────────────────────────────────
  const goalStreakInfo = useMemo(() => {
    const gs = progress.goalStreakDays || 0
    if (gs <= 0) return null
    const milestones = [3, 7, 14, 30, 50]
    const nextGoalMilestone = milestones.find(m => m > gs) || milestones[milestones.length - 1]
    const daysToNext = Math.max(0, nextGoalMilestone - gs)
    // Determine the achievement tied to goal streak
    let nextBadge = 'Goal Getter'
    if (gs < 7) nextBadge = 'Goal Streak (7 days)'
    else nextBadge = 'Consistent Achiever'
    const pct = Math.round((gs / nextGoalMilestone) * 100)
    return { days: gs, nextMilestone: nextGoalMilestone, daysToNext, nextBadge, pct }
  }, [progress.goalStreakDays])

  // ── Readiness message ─────────────────────────────────────────────────────
  const readinessMessage = useMemo(() => {
    if (paceStatus?.status === 'ahead') return 'Ahead of schedule'
    if (paceStatus?.status === 'on_track') return `On track to be ready by May ${profile?.examYear || 2026}`
    if (paceStatus?.status === 'behind') return 'Behind schedule — time to accelerate'
    return `On track to be ready by May ${profile?.examYear || 2026}`
  }, [paceStatus, profile?.examYear])

  // ── Animation delay counter ───────────────────────────────────────────────
  let animDelay = 0
  const nextDelay = () => {
    animDelay += 100
    return animDelay
  }

  return (
    <div style={{ minHeight: '100vh', padding: '16px 16px 100px 16px' }}>
      <style>{`
        @keyframes homeStreakPulse {
          0%, 100% { text-shadow: 0 0 8px rgba(249,115,22,0.4), 0 0 20px rgba(249,115,22,0.15); }
          50% { text-shadow: 0 0 14px rgba(249,115,22,0.6), 0 0 28px rgba(249,115,22,0.25); }
        }
        @keyframes homeGlowIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes readinessPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0); }
          50% { box-shadow: 0 0 20px 4px rgba(99,102,241,0.12); }
        }
      `}</style>

      {/* ═══ 1. Greeting + Exam Countdown ═══ */}
      <div
        style={{
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          marginBottom: 20,
          paddingTop: 8,
        }}
      >
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {getGreeting()}{firstName ? `, ${firstName}` : ''}! <span role="img" aria-label="wave">{'\uD83D\uDC4B'}</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {prepStage && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '4px 10px',
            }}>
              {prepStage.icon} {prepStage.label}
            </span>
          )}
          {daysUntilExam != null && profile && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(129,140,248,0.85)',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.20)',
              borderRadius: 20,
              padding: '4px 10px',
              boxShadow: '0 0 12px rgba(99,102,241,0.10)',
            }}>
              {daysUntilExam} days until UPSC CSE {profile.examYear}
            </span>
          )}
        </div>
      </div>

      {/* ═══ 2. Exam Readiness Gauge ═══ */}
      {examReadiness !== null && totalTopics > 0 && (
        <div
          style={{
            ...glassCard,
            border: `1px solid ${readinessColor}20`,
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both, readinessPulse 3s ease-in-out infinite`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow accent */}
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${readinessColor}15, transparent)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase' }}>
                Exam Readiness
              </span>
            </div>
            <span style={{
              fontSize: 28,
              fontWeight: 800,
              color: readinessColor,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {examReadiness}%
            </span>
          </div>

          {/* Readiness bar */}
          <div style={{
            height: 10,
            borderRadius: 5,
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <div style={{
              height: '100%',
              borderRadius: 5,
              background: `linear-gradient(90deg, ${readinessColor}88, ${readinessColor})`,
              width: `${examReadiness}%`,
              transition: 'width 800ms ease-out',
            }} />
          </div>

          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 500,
          }}>
            {readinessMessage}
          </div>
        </div>
      )}

      {/* ═══ 3. Streak Card ═══ */}
      {progress.streak > 0 ? (
        <div
          style={{
            ...glassCard,
            padding: '16px 20px',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                fontSize: 24,
                lineHeight: 1,
                animation: 'homeStreakPulse 2s ease-in-out infinite',
              }}
            >
              {'\uD83D\uDD25'}
            </span>
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#f97316',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {progress.streak}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginLeft: 2 }}>
              day streak
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(90deg, #f97316, #fbbf24)',
                width: `${Math.min(100, milestoneProgress)}%`,
                transition: 'width 500ms ease-out',
              }} />
            </div>
            <span style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.40)',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}>
              {progress.streak}/{nextMilestone} goal
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...glassCard,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            padding: '14px 20px',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, lineHeight: 1, opacity: 0.5 }}>{'\uD83D\uDD25'}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
              Start a streak!
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginTop: 6, paddingLeft: 28 }}>
            Study today to begin your streak journey
          </div>
        </div>
      )}

      {/* ═══ 4. Goal Streak Card ═══ */}
      {goalStreakInfo && (
        <div
          style={{
            ...glassCard,
            border: '1px solid rgba(99,102,241,0.15)',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{'\uD83C\uDFAF'}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
              {goalStreakInfo.days}-Day Goal Streak!
            </span>
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(129,140,248,0.75)',
            marginBottom: 10,
            fontWeight: 500,
          }}>
            {goalStreakInfo.daysToNext > 0
              ? `${goalStreakInfo.daysToNext} more day${goalStreakInfo.daysToNext !== 1 ? 's' : ''} until ${goalStreakInfo.nextMilestone}-day milestone`
              : 'Milestone reached!'
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MiniProgressBar
              pct={goalStreakInfo.pct}
              color="linear-gradient(90deg, #6366f1, #a78bfa)"
            />
            <span style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.40)',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}>
              {goalStreakInfo.days}/{goalStreakInfo.nextMilestone}
            </span>
          </div>
        </div>
      )}

      {/* ═══ 5. Hero Card — Continue/Welcome ═══ */}
      {!hasStarted && !allCompleted ? (
        <div
          style={{
            ...elevatedGlassCard,
            padding: 24,
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            marginBottom: 8,
          }}>
            Welcome{firstName ? `, ${firstName}` : ', Aspirant'}! <span role="img" aria-label="wave">{'\uD83D\uDC4B'}</span>
          </div>
          {prepStage && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '4px 10px',
              marginBottom: 10,
            }}>
              {prepStage.icon} {prepStage.label}
            </div>
          )}
          <div style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
            marginBottom: weakSubjectNames ? 6 : 20,
          }}>
            280 topics across the UPSC syllabus await you.
          </div>
          {weakSubjectNames && (
            <div style={{
              fontSize: 14,
              color: 'rgba(129,140,248,0.85)',
              lineHeight: 1.5,
              marginBottom: 20,
              fontWeight: 500,
            }}>
              We&apos;ll focus on {weakSubjectNames.join(', ')}
            </div>
          )}
          <button
            onClick={onNavigateToPath}
            style={{
              width: '100%',
              height: 44,
              border: 'none',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'transform 150ms ease, opacity 150ms ease',
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
        <div
          style={{
            ...elevatedGlassCard,
            position: 'relative',
            overflow: 'hidden',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          {/* Accent edge */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            borderRadius: '20px 0 0 20px',
            background: continueTopic.subject.color,
          }} />

          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.40)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Continue
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{continueTopic.topic.icon}</span>
            <span style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
            }}>
              {continueTopic.topic.title}
            </span>
          </div>

          <div style={{
            fontSize: 13,
            color: continueTopic.subject.color,
            marginBottom: profile?.weakSubjects?.includes(continueTopic.subject.id) ? 4 : 14,
            fontWeight: 500,
          }}>
            {continueTopic.subject.title}
          </div>
          {profile?.weakSubjects?.includes(continueTopic.subject.id) && (
            <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, marginTop: 2, marginBottom: 10 }}>
              Focus Area
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <CrownMiniRing level={crownLevel} />
          </div>

          <button
            onClick={() => onTopicTap(continueTopic.topic.id, continueTopic.topic, continueTopic.subject)}
            style={{
              width: '100%',
              height: 44,
              border: 'none',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'transform 150ms ease, opacity 150ms ease',
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
        <div
          style={{
            ...elevatedGlassCard,
            padding: 24,
            textAlign: 'center',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83C\uDF89'}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 6 }}>
            You&apos;re all caught up!
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            All topics are completed. Great work!
          </div>
        </div>
      ) : null}

      {/* ═══ 6. Today Stats (expanded) ═══ */}
      <div style={{
        marginBottom: 24,
        animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 12,
        }}>
          Today
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* XP */}
          <div style={{
            flex: 1,
            minWidth: 0,
            ...glassCard,
            marginBottom: 0,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {todayXp}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              XP
            </div>
          </div>

          {/* Accuracy */}
          <div style={{
            flex: 1,
            minWidth: 0,
            ...glassCard,
            marginBottom: 0,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {totalQuestions > 0 ? `${accuracy}%` : '\u2014'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              Acc
            </div>
          </div>

          {/* Goal */}
          <div style={{
            flex: 1,
            minWidth: 0,
            ...glassCard,
            marginBottom: 0,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: todayXp >= goalXp ? '#34d399' : 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {todayXp}/{goalXp}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              Goal
            </div>
          </div>
        </div>

        {/* Second row: Questions Today + Perfect Rounds */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <div style={{
            flex: 1,
            ...glassCard,
            marginBottom: 0,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {todayCalendar?.questionsAnswered || 0}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              Questions
            </div>
          </div>

          <div style={{
            flex: 1,
            ...glassCard,
            marginBottom: 0,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: progress.perfectScores > 0 ? '#a78bfa' : 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {progress.perfectScores}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              Perfect Rounds
            </div>
          </div>
        </div>

        {todayXp === 0 && totalQuestions === 0 && (
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.28)',
            textAlign: 'center',
            marginTop: 8,
          }}>
            Complete a topic to start tracking
          </div>
        )}

        {/* ═══ 7. Study Pace ═══ */}
        {profile && daysUntilExam && daysUntilExam > 0 && totalTopics > 0 && paceStatus && (() => {
          const { topicsPerWeek, syllabusPercent, timeElapsed, remaining } = paceStatus
          const paceRatio = paceStatus.paceRatio
          const paceColor = remaining === 0 ? '#34d399' : paceRatio >= 0.8 ? '#34d399' : paceRatio >= 0.4 ? '#f97316' : '#ef4444'

          return (
            <div style={{
              ...glassCard,
              marginBottom: 0,
              marginTop: 12,
              animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M12 2v10l4.5 4.5" stroke={paceColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="10" stroke={paceColor} strokeWidth="2" fill="none" opacity="0.3"/>
                </svg>
                <span style={{ fontSize: 13, color: paceColor, fontWeight: 600 }}>
                  {remaining === 0
                    ? 'Syllabus complete!'
                    : `${topicsPerWeek} topics/week needed to finish by UPSC ${profile.examYear}`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                  <span>{syllabusPercent}% syllabus done</span>
                  <span>{timeElapsed}% time elapsed</span>
                </div>
                <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute',
                    left: `${timeElapsed}%`,
                    top: 0, bottom: 0,
                    width: 1.5,
                    background: 'rgba(255,255,255,0.25)',
                    zIndex: 1,
                  }} />
                  <div style={{
                    height: '100%',
                    borderRadius: 3,
                    background: paceColor,
                    width: `${syllabusPercent}%`,
                    transition: 'width 500ms ease-out',
                  }} />
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ═══ 8. Weekly Momentum ═══ */}
      {(weeklyMomentum.xp > 0 || weeklyMomentum.questions > 0) && (
        <div
          style={{
            ...glassCard,
            border: '1px solid rgba(139,92,246,0.12)',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase' }}>
              This Week
            </span>
            {weeklyMomentum.isBestWeek && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#34d399',
                background: 'rgba(52,211,153,0.12)',
                padding: '2px 6px',
                borderRadius: 6,
                letterSpacing: '0.03em',
              }}>
                BEST WEEK
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Topics practiced', value: weeklyMomentum.topicsPracticed, icon: '\uD83D\uDCDA' },
              { label: 'Questions answered', value: weeklyMomentum.questions, icon: '\u2753' },
              { label: 'XP earned', value: weeklyMomentum.xp, icon: '\u26A1' },
              { label: 'Days active', value: `${weeklyMomentum.daysActive}/7`, icon: '\uD83D\uDCC5' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{row.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', flex: 1 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: 12,
            color: weeklyMomentum.isBestWeek ? '#34d399' : 'rgba(139,92,246,0.70)',
            fontWeight: 600,
            marginTop: 10,
            textAlign: 'center',
          }}>
            {weeklyMomentum.isBestWeek ? 'Your best week yet!' : weeklyMomentum.daysActive >= 5 ? 'Incredible consistency!' : 'Keep pushing!'}
          </div>
        </div>
      )}

      {/* ═══ 9. Next Achievements ═══ */}
      {nextAchievements.length > 0 && (
        <div
          style={{
            ...glassCard,
            border: '1px solid rgba(251,191,36,0.12)',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.40)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Almost There!
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {nextAchievements.map(ach => (
              <div key={ach.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{ach.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', flex: 1 }}>
                    {ach.title}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: ach.pct >= 90 ? '#fbbf24' : 'rgba(255,255,255,0.50)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {ach.current}/{ach.target}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniProgressBar
                    pct={ach.pct}
                    color={ach.pct >= 90 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #6366f1, #a78bfa)'}
                  />
                  <span style={{
                    fontSize: 11,
                    color: ach.pct >= 90 ? '#fbbf24' : 'rgba(255,255,255,0.35)',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}>
                    {ach.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 10. Spaced Repetition Queue ═══ */}
      {spacedRepetitionQueue.length > 0 && (
        <div
          style={{
            ...glassCard,
            border: '1px solid rgba(244,114,182,0.12)',
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>{'\uD83D\uDCDA'}</span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'rgba(255,255,255,0.40)',
              textTransform: 'uppercase',
            }}>
              Due for Review ({spacedRepetitionQueue.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {spacedRepetitionQueue.map((item) => {
              const overdue = item.daysAgo > 7
              const urgentColor = overdue ? '#ef4444' : item.daysAgo > 5 ? '#f97316' : 'rgba(255,255,255,0.45)'

              return (
                <button
                  key={item.topicId}
                  onClick={() => {
                    const entry = topicStates[item.topicId]
                    if (entry) onTopicTap(item.topicId, entry.topic, entry.subject)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 150ms ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                  onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.85)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: urgentColor, fontWeight: 600 }}>
                      {item.daysAgo}d ago
                    </span>
                    {overdue && (
                      <span style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: '#ef4444',
                        background: 'rgba(239,68,68,0.12)',
                        padding: '1px 4px',
                        borderRadius: 4,
                        letterSpacing: '0.03em',
                      }}>
                        OVERDUE
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {spacedRepetitionQueue.length > 0 && (
            <button
              onClick={() => {
                const first = spacedRepetitionQueue[0]
                const entry = topicStates[first.topicId]
                if (entry) onTopicTap(first.topicId, entry.topic, entry.subject)
              }}
              style={{
                width: '100%',
                marginTop: 12,
                height: 38,
                border: 'none',
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(139,92,246,0.15))',
                color: '#f472b6',
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
              Start Review Session
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ═══ 11. Crown Distribution ═══ */}
      {Object.values(crownDistribution).some(v => v > 0) && (
        <div
          style={{
            ...glassCard,
            animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          }}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.40)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Your Mastery
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {([0, 1, 2, 3, 4, 5] as CrownLevel[]).map(level => {
              const count = crownDistribution[level] || 0
              const color = CROWN_COLORS[level]
              const isActive = count > 0

              return (
                <div key={level} style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 4px',
                  borderRadius: 12,
                  background: isActive ? `${color}12` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? `${color}25` : 'rgba(255,255,255,0.04)'}`,
                }}>
                  {/* Crown dot */}
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: isActive ? color : 'rgba(255,255,255,0.08)',
                    margin: '0 auto 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {level > 0 && (
                      <span style={{ fontSize: 9, lineHeight: 1 }}>{'\uD83D\uDC51'}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isActive ? color : 'rgba(255,255,255,0.25)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.2,
                  }}>
                    {count}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.30)',
                    marginTop: 1,
                    fontWeight: 500,
                  }}>
                    Lv{level}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ 12. Up Next ═══ */}
      {upNext.length > 0 && (
        <div style={{ animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both` }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 12,
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
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 150ms ease, opacity 150ms ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
                  {entry.topic.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.92)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.topic.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: entry.subject.color,
                    marginTop: 2,
                    fontWeight: 500,
                  }}>
                    {entry.subject.title}
                  </div>
                  {profile?.weakSubjects?.includes(entry.subject.id) && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                      color: '#f97316', background: 'rgba(249,115,22,0.12)',
                      padding: '2px 6px', borderRadius: 6, marginTop: 2,
                      display: 'inline-block',
                    }}>
                      FOCUS
                    </span>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                  <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>

          <button
            onClick={onNavigateToPath}
            style={{
              marginTop: 12,
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

      {/* ═══ 13. Focus Areas ═══ */}
      {focusSubjectProgress && focusSubjectProgress.length > 0 && (
        <div style={{ animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`, marginTop: 16 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 12,
          }}>
            Focus Areas
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {focusSubjectProgress.map(fp => (
              <div
                key={fp.subject.id}
                style={{
                  ...glassCard,
                  marginBottom: 0,
                  border: `1px solid ${fp.subject.color}20`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{fp.subject.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                      {fp.subject.shortTitle}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {fp.accuracy !== null && (
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: fp.accuracy >= 70 ? '#34d399' : fp.accuracy >= 40 ? '#fbbf24' : '#f87171',
                      }}>
                        {fp.accuracy}% acc
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: fp.subject.color }}>
                      {fp.completed}/{fp.total}
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${fp.pct}%`,
                    background: `linear-gradient(90deg, ${fp.subject.color}, ${fp.subject.color}88)`,
                    transition: 'width 500ms ease-out',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 14. Strong Subject Review ═══ */}
      {strongSubjectReview && strongSubjectReview.length > 0 && (
        <div style={{
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          background: 'rgba(52,211,153,0.04)',
          border: '1px solid rgba(52,211,153,0.12)',
          borderRadius: 16,
          padding: '14px 16px',
          marginTop: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>{'\uD83D\uDCAA'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(52,211,153,0.85)' }}>
              Time to review your strengths
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {strongSubjectReview.map(sr => (
              <div key={sr.subject.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{sr.subject.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                  {sr.subject.shortTitle}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {sr.daysSince}d since last practice
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 15. Motivational Insight ═══ */}
      <div
        style={{
          ...glassCard,
          marginTop: 16,
          border: '1px solid rgba(99,102,241,0.10)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))',
          animation: `homeGlowIn 600ms ease-out ${nextDelay()}ms both`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>
          {motivationalInsight.emoji}
        </div>
        <div style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.70)',
          lineHeight: 1.5,
          fontWeight: 500,
        }}>
          {motivationalInsight.text}
        </div>
      </div>
    </div>
  )
}
