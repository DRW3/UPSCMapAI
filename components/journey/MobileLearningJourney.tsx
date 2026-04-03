'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { UPSC_SYLLABUS, type LearningTopic, type LearningSubject } from '@/data/syllabus'
import {
  type JourneyProgress,
  type TopicProgress,
  type NodeState,
  type CrownLevel,
  type DailyGoalTier,
  type UserProfile,
  DEFAULT_PROGRESS,
  DEFAULT_TOPIC_PROGRESS,
  QUESTIONS_PER_CROWN,
  DAILY_GOALS,
  PROFILE_STORAGE_KEY,
  checkAchievements,
} from '@/components/journey/types'
import JourneyPath from '@/components/journey/JourneyPath'
import PracticeSheet from '@/components/journey/PracticeSheet'
import HomeTab from '@/components/journey/HomeTab'
import TopicDetailSheet from '@/components/journey/TopicDetailSheet'
import PracticeTab from '@/components/journey/PracticeTab'
import ProfileTab from '@/components/journey/ProfileTab'
import DailyGoalModal from '@/components/journey/DailyGoalModal'
import AchievementToast from '@/components/journey/AchievementToast'
import OnboardingFlow, { hasCompletedOnboarding } from '@/components/journey/OnboardingFlow'
import CelebrationOverlay from '@/components/journey/CelebrationOverlay'

// ── Date helpers (local timezone, not UTC) ───────────────────────────────────

function getLocalDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getLocalYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── LocalStorage ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'upsc-journey-v2'

function loadJourneyProgress(): JourneyProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Migrate from v1 if exists
      const v1 = localStorage.getItem('upsc-journey-v1')
      if (v1) {
        const old = JSON.parse(v1) as Record<string, boolean>
        const topics: Record<string, TopicProgress> = {}
        for (const [id, done] of Object.entries(old)) {
          if (done) {
            topics[id] = {
              ...DEFAULT_TOPIC_PROGRESS,
              state: 'completed',
              crownLevel: 1,
              xpEarned: 50,
              questionsAnswered: 5,
              correctAnswers: 5,
              lastPracticed: new Date().toISOString(),
            }
          }
        }
        const migrated: JourneyProgress = {
          ...DEFAULT_PROGRESS,
          topics,
          totalXp: Object.keys(topics).length * 50,
        }
        const streak = parseInt(localStorage.getItem('upsc-streak-v1') || '0')
        migrated.streak = streak
        migrated.lastStudyDate = localStorage.getItem('upsc-last-day')
        return migrated
      }
      return DEFAULT_PROGRESS
    }
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PROGRESS
  }
}

function saveJourneyProgress(p: JourneyProgress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

// ── Compute topic availability ────────────────────────────────────────────────

function computeTopicStates(
  subjects: LearningSubject[],
  progress: JourneyProgress
): Record<string, TopicProgress> {
  const result: Record<string, TopicProgress> = {}
  let prevDone = true

  for (const subject of subjects) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const existing = progress.topics[topic.id]
        if (existing && (existing.state === 'completed' || existing.state === 'started')) {
          result[topic.id] = existing
          prevDone = existing.state === 'completed'
        } else if (prevDone) {
          result[topic.id] = {
            ...(existing || DEFAULT_TOPIC_PROGRESS),
            state: 'available',
          }
          prevDone = false
        } else {
          result[topic.id] = {
            ...(existing || DEFAULT_TOPIC_PROGRESS),
            state: 'locked',
          }
        }
      }
    }
  }

  return result
}

// ── Hearts refill logic ───────────────────────────────────────────────────────

const HEART_REFILL_MS = 30 * 60 * 1000

function computeHearts(progress: JourneyProgress): number {
  if (progress.hearts >= 5) return 5
  if (!progress.heartsLastRefill) return progress.hearts
  const elapsed = Date.now() - new Date(progress.heartsLastRefill).getTime()
  const refilled = Math.floor(elapsed / HEART_REFILL_MS)
  return Math.min(5, progress.hearts + refilled)
}

// ── Streak logic ──────────────────────────────────────────────────────────────

function computeStreak(progress: JourneyProgress): { streak: number; isToday: boolean } {
  if (!progress.lastStudyDate) return { streak: 0, isToday: false }
  const today = getLocalDate()
  const last = progress.lastStudyDate.slice(0, 10)
  if (last === today) return { streak: progress.streak, isToday: true }
  const yesterday = getLocalYesterday()
  if (last === yesterday) return { streak: progress.streak, isToday: false }
  return { streak: 0, isToday: false }
}

// ── Daily reset ──────────────────────────────────────────────────────────────

function resetDailyIfNeeded(progress: JourneyProgress): JourneyProgress {
  const today = getLocalDate()
  if (progress.todayDate !== today) {
    return { ...progress, todayXp: 0, todayTopicsRead: 0, todayTopicsPracticed: 0, todayDate: today }
  }
  return progress
}

// ── Enriched topic state (includes topic + subject refs for HomeTab/PracticeTab)

type EnrichedTopicState = { state: NodeState; topic: LearningTopic; subject: LearningSubject }

function buildEnrichedStates(
  subjects: LearningSubject[],
  topicStates: Record<string, TopicProgress>,
): Record<string, EnrichedTopicState> {
  const result: Record<string, EnrichedTopicState> = {}
  for (const subject of subjects) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const tp = topicStates[topic.id]
        if (tp) result[topic.id] = { state: tp.state, topic, subject }
      }
    }
  }
  return result
}

// ── Tab type ─────────────────────────────────────────────────────────────────

type TabId = 'home' | 'path' | 'practice' | 'profile'

// ── Main Component ────────────────────────────────────────────────────────────

export function MobileLearningJourney() {
  const [progress, setProgress] = useState<JourneyProgress>(DEFAULT_PROGRESS)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('home')

  // Topic detail sheet
  const [detailTarget, setDetailTarget] = useState<{
    topic: LearningTopic
    subject: LearningSubject
  } | null>(null)

  // Practice sheet
  const [practiceTarget, setPracticeTarget] = useState<{
    topic: LearningTopic
    subject: LearningSubject
  } | null>(null)

  // Daily goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  // Achievement toast queue
  const [achievementQueue, setAchievementQueue] = useState<string[]>([])

  // User profile
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Celebration overlay
  const [celebrationData, setCelebrationData] = useState<{
    completedTopicTitle: string
    nextTopicTitle: string
    nextTopicIcon: string
    subjectColor: string
    nextTopic: LearningTopic
    nextSubject: LearningSubject
  } | null>(null)

  // Track newly unlocked topic for JourneyPath animation
  const [newlyUnlockedId, setNewlyUnlockedId] = useState<string | null>(null)

  const [mounted, setMounted] = useState(false)

  // Load progress on mount
  useEffect(() => {
    let loaded = loadJourneyProgress()
    loaded.hearts = computeHearts(loaded)
    const { streak } = computeStreak(loaded)
    loaded.streak = streak
    loaded = resetDailyIfNeeded(loaded)
    setProgress(loaded)
    setMounted(true)

    // Load user profile
    try {
      const rawProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (rawProfile) setProfile(JSON.parse(rawProfile))
    } catch {}

    // Show onboarding for first-time users
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true)
    }
  }, [])

  // Save progress on change
  useEffect(() => {
    if (mounted) saveJourneyProgress(progress)
  }, [progress, mounted])

  // Computed topic states
  const topicStates = useMemo(
    () => computeTopicStates(UPSC_SYLLABUS, progress),
    [progress]
  )

  // Enriched topic states (with topic + subject refs)
  const enrichedTopicStates = useMemo(
    () => buildEnrichedStates(UPSC_SYLLABUS, topicStates),
    [topicStates]
  )

  // Current hearts
  const hearts = useMemo(() => computeHearts(progress), [progress])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNodeTap = useCallback((topicId: string, topic: LearningTopic, subject: LearningSubject) => {
    const state = topicStates[topicId]
    if (!state || state.state === 'locked') return

    if (state.state === 'available') {
      setProgress(prev => ({
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: {
            ...(prev.topics[topicId] || DEFAULT_TOPIC_PROGRESS),
            state: 'started' as const,
          },
        },
        todayTopicsRead: (prev.todayTopicsRead || 0) + 1,
      }))
    }

    setDetailTarget({ topic, subject })
  }, [topicStates])

  const handleStartPractice = useCallback((topicId: string, topic: LearningTopic, subject: LearningSubject) => {
    const state = topicStates[topicId]
    if (!state || state.state === 'locked') return

    if (state.state === 'available') {
      setProgress(prev => ({
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: {
            ...(prev.topics[topicId] || DEFAULT_TOPIC_PROGRESS),
            state: 'started' as const,
          },
        },
        todayTopicsRead: (prev.todayTopicsRead || 0) + 1,
      }))
    }

    setDetailTarget(null)
    setPracticeTarget({ topic, subject })
  }, [topicStates])

  const handleDetailStartPractice = useCallback(() => {
    if (!detailTarget) return
    handleStartPractice(detailTarget.topic.id, detailTarget.topic, detailTarget.subject)
  }, [detailTarget, handleStartPractice])

  const handleOpenMap = useCallback(() => {
    if (detailTarget) {
      window.location.href = `/map?q=${encodeURIComponent(detailTarget.topic.mapQuery)}`
    }
  }, [detailTarget])

  // Quick mix: pick a random practiced topic
  const handleStartQuickMix = useCallback(() => {
    const practiced = Object.entries(topicStates)
      .filter(([, tp]) => tp.state === 'started' || tp.state === 'completed')
    if (practiced.length === 0) return

    const [topicId] = practiced[Math.floor(Math.random() * practiced.length)]
    for (const subject of UPSC_SYLLABUS) {
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          if (topic.id === topicId) {
            setPracticeTarget({ topic, subject })
            return
          }
        }
      }
    }
  }, [topicStates])

  // Handle practice complete
  const handlePracticeComplete = useCallback((result: {
    correct: number
    total: number
    newCrownLevel: CrownLevel
  }) => {
    if (!practiceTarget) return
    const { topic } = practiceTarget
    const today = new Date().toISOString()
    const todayDate = getLocalDate()
    const isPerfect = result.correct === result.total && result.total > 0

    setProgress(prev => {
      const existing = prev.topics[topic.id] || DEFAULT_TOPIC_PROGRESS
      const newCorrect = existing.correctAnswers + result.correct
      const newAnswered = existing.questionsAnswered + result.total

      let newCrown = existing.crownLevel
      while (newCrown < 5 && newCorrect >= (newCrown + 1) * QUESTIONS_PER_CROWN) {
        newCrown = (newCrown + 1) as CrownLevel
      }

      const newState = newCrown >= 1 ? 'completed' : 'started'

      const { streak, isToday } = computeStreak(prev)
      const newStreak = isToday ? streak : streak + 1

      let gemsGained = 0
      if (isPerfect) gemsGained += 5
      if (newCrown > existing.crownLevel) gemsGained += 2

      const goalCfg = DAILY_GOALS[prev.dailyGoalTier]
      const prevReadCount = prev.todayDate === todayDate ? (prev.todayTopicsRead || 0) : 0
      const prevPracticeCount = prev.todayDate === todayDate ? (prev.todayTopicsPracticed || 0) : 0
      const newPracticeCount = prevPracticeCount + 1
      const prevGoalMet = prevReadCount >= goalCfg.readTarget && prevPracticeCount >= goalCfg.practiceTarget
      const nowGoalMet = prevReadCount >= goalCfg.readTarget && newPracticeCount >= goalCfg.practiceTarget
      const goalJustMet = !prevGoalMet && nowGoalMet

      // Reset goal streak if user missed a day (gap > 1 day since last goal date)
      let baseGoalStreak = prev.goalStreakDays
      const prevDate = prev.todayDate
      if (prevDate && prevDate !== todayDate) {
        const prevDateObj = new Date(prevDate)
        const todayObj = new Date(todayDate)
        const dayGap = Math.floor((todayObj.getTime() - prevDateObj.getTime()) / 86400000)
        // If more than 1 day gap, or previous day goal wasn't met, reset
        const prevDayGoalMet = (prev.todayTopicsRead || 0) >= goalCfg.readTarget && (prev.todayTopicsPracticed || 0) >= goalCfg.practiceTarget
        if (dayGap > 1 || !prevDayGoalMet) {
          baseGoalStreak = 0
        }
      }
      const newGoalStreak = goalJustMet ? baseGoalStreak + 1 : baseGoalStreak

      const calendar = [...(prev.studyCalendar || [])]
      const existingDay = calendar.find(d => d.date === todayDate)
      if (existingDay) {
        existingDay.questionsAnswered += result.total
        existingDay.correctAnswers = (existingDay.correctAnswers || 0) + result.correct
        existingDay.goalMet = existingDay.goalMet || nowGoalMet
      } else {
        calendar.push({
          date: todayDate,
          questionsAnswered: result.total,
          correctAnswers: result.correct,
          goalMet: nowGoalMet,
        })
      }
      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
      const trimmedCalendar = calendar.filter(d => d.date >= cutoff)

      const newPerfects = (prev.perfectScores || 0) + (isPerfect ? 1 : 0)

      const updated: JourneyProgress = {
        ...prev,
        topics: {
          ...prev.topics,
          [topic.id]: {
            state: newState as TopicProgress['state'],
            crownLevel: newCrown,
            xpEarned: 0,
            questionsAnswered: newAnswered,
            correctAnswers: newCorrect,
            lastPracticed: today,
          },
        },
        totalXp: prev.totalXp,
        streak: newStreak,
        lastStudyDate: today,
        gems: prev.gems + gemsGained,
        todayXp: 0,
        todayTopicsPracticed: (prev.todayDate === todayDate ? prev.todayTopicsPracticed || 0 : 0) + 1,
        todayDate: todayDate,
        goalStreakDays: newGoalStreak,
        perfectScores: newPerfects,
        studyCalendar: trimmedCalendar,
        achievements: prev.achievements || [],
      }

      const newAchievements = checkAchievements(updated, UPSC_SYLLABUS)
      if (newAchievements.length > 0) {
        updated.achievements = [
          ...updated.achievements,
          ...newAchievements.map(id => ({ id, unlockedAt: today })),
        ]
        queueMicrotask(() => {
          setAchievementQueue(prev => [...prev, ...newAchievements])
        })
      }

      return updated
    })

    setPracticeTarget(null)
  }, [practiceTarget])

  // Find next available topic helper
  const findNextTopic = useCallback((currentTopicId: string | undefined): { topic: LearningTopic; subject: LearningSubject } | null => {
    let passedCurrent = false
    for (const subject of UPSC_SYLLABUS) {
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          if (topic.id === currentTopicId) { passedCurrent = true; continue }
          if (!passedCurrent) continue
          const tp = topicStates[topic.id]
          if (tp && (tp.state === 'available' || tp.state === 'started')) {
            return { topic, subject }
          }
        }
      }
    }
    // Wrap around
    for (const subject of UPSC_SYLLABUS) {
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          if (topic.id === currentTopicId) continue
          const tp = topicStates[topic.id]
          if (tp && tp.state === 'available') return { topic, subject }
        }
      }
    }
    return null
  }, [topicStates])

  // Find and open next available topic after practice — with celebration overlay
  const handleNextTopic = useCallback(() => {
    const completedTitle = practiceTarget?.topic.title || 'Topic'
    const currentTopicId = practiceTarget?.topic.id
    const subjectColor = practiceTarget?.subject.color || '#6366f1'

    // Close practice sheet
    setPracticeTarget(null)

    // Find next topic
    const next = findNextTopic(currentTopicId)

    if (next) {
      // Show celebration overlay
      setCelebrationData({
        completedTopicTitle: completedTitle,
        nextTopicTitle: next.topic.title,
        nextTopicIcon: next.topic.icon,
        subjectColor,
        nextTopic: next.topic,
        nextSubject: next.subject,
      })
      // Set newly unlocked for path animation
      setNewlyUnlockedId(next.topic.id)
    } else {
      // No next topic — just go to path
      setActiveTab('path')
    }
  }, [practiceTarget, findNextTopic])

  // Handle celebration overlay dismiss → transition to next topic
  const handleCelebrationDismiss = useCallback(() => {
    const data = celebrationData
    setCelebrationData(null)

    if (!data) return

    // Switch to path tab to show the unlocked topic animation
    setActiveTab('path')

    // After a brief delay for scroll animation, open the detail sheet
    setTimeout(() => {
      // Mark as started if available
      const tp = topicStates[data.nextTopic.id]
      if (tp && tp.state === 'available') {
        setProgress(prev => ({
          ...prev,
          topics: {
            ...prev.topics,
            [data.nextTopic.id]: {
              ...(prev.topics[data.nextTopic.id] || DEFAULT_TOPIC_PROGRESS),
              state: 'started' as const,
            },
          },
          todayTopicsRead: (prev.todayTopicsRead || 0) + 1,
        }))
      }

      // Open detail sheet for the next topic
      setDetailTarget({ topic: data.nextTopic, subject: data.nextSubject })

      // Clear newly unlocked after animation has played
      setTimeout(() => setNewlyUnlockedId(null), 3000)
    }, 800)
  }, [celebrationData, topicStates])

  const handleHeartLost = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1),
      heartsLastRefill: prev.hearts >= 5 ? new Date().toISOString() : (prev.heartsLastRefill || new Date().toISOString()),
    }))
  }, [])

  const handleTabChange = useCallback((tab: TabId) => {
    // Don't switch tabs while overlays are open
    if (practiceTarget || detailTarget) return
    setActiveTab(tab)
  }, [practiceTarget, detailTarget])

  const handleGoalTierChange = useCallback((tier: DailyGoalTier) => {
    setProgress(prev => ({ ...prev, dailyGoalTier: tier }))
  }, [])

  const handleAchievementDone = useCallback(() => {
    setAchievementQueue(prev => prev.slice(1))
  }, [])

  const handleOnboardingComplete = useCallback((userProfile: UserProfile) => {
    setProfile(userProfile)
    setProgress(prev => ({ ...prev, dailyGoalTier: userProfile.dailyGoalTier }))
    try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile)) } catch {}
    setShowOnboarding(false)
  }, [])

  const handleProfileUpdate = useCallback((updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
    try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile)) } catch {}
  }, [])

  const handleResetJourney = useCallback(() => {
    setProgress(DEFAULT_PROGRESS)
    setProfile(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('upsc-journey-v1')
      localStorage.removeItem(PROFILE_STORAGE_KEY)
      localStorage.removeItem('upsc-journey-onboarded')
    } catch {}
    setShowOnboarding(true)
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: '100dvh', background: '#050510' }}>
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <div style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          Loading your journey...
        </div>
      </div>
    )
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100dvh', background: '#050510', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Aurora background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          top: -200, left: -100, filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
          bottom: -100, right: -150, filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 70%)',
          top: '40%', right: -50, filter: 'blur(60px)',
        }} />
      </div>

      {/* ── Unified Top Bar: stats + back/map buttons ───────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[51]"
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          margin: '0 12px',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'auto',
        }}>
          {/* Row 1: Back + Stats + Map button */}
          <div style={{
            height: 44,
            background: 'rgba(10,10,20,0.7)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center',
            padding: '0 6px',
            gap: 4,
          }}>
            {/* Back */}
            <a
              href="/"
              style={{
                width: 32, height: 32, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)', flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 2L4 7l5 5" />
              </svg>
            </a>

            {/* Streak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
              <span style={{ fontSize: 16, lineHeight: 1, textShadow: progress.streak > 0 ? '0 0 8px rgba(249,115,22,0.5)' : 'none' }}>🔥</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', opacity: progress.streak > 0 ? 1 : 0.3 }}>
                {progress.streak}
              </span>
            </div>

            <div style={{ flex: 1 }} />

            {/* Daily Goal Ring */}
            <button
              onClick={() => setGoalModalOpen(true)}
              style={{
                width: 28, height: 28, position: 'relative',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {(() => {
                const goalCfg = DAILY_GOALS[progress.dailyGoalTier]
                const readPct = goalCfg.readTarget > 0 ? Math.min(100, ((progress.todayTopicsRead || 0) / goalCfg.readTarget) * 100) : 100
                const practicePct = goalCfg.practiceTarget > 0 ? Math.min(100, ((progress.todayTopicsPracticed || 0) / goalCfg.practiceTarget) * 100) : 100
                const pct = Math.round((readPct + practicePct) / 2)
                const goalMet = readPct >= 100 && practicePct >= 100
                const r = 11, circ = 2 * Math.PI * r
                return (
                  <>
                    <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: 'absolute', inset: 0 }}>
                      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                      <circle cx="14" cy="14" r={r} fill="none"
                        stroke={goalMet ? '#34d399' : `hsl(${240 + (pct / 100) * 120}, 80%, 65%)`}
                        strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray={circ} strokeDashoffset={circ - (circ * pct) / 100}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 500ms ease-out' }}
                      />
                    </svg>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ position: 'relative' }}>
                      {goalMet
                        ? <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        : <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" fill="#FBBF24" />}
                    </svg>
                  </>
                )
              })()}
            </button>

            {/* Map link */}
            <a
              href="/map"
              style={{
                width: 32, height: 32, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
              </svg>
            </a>
          </div>

          {/* Row 2: Segmented tab control */}
          <div style={{
            height: 38,
            background: 'rgba(10,10,20,0.65)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center',
            padding: 3,
            gap: 2,
          }}>
            {([
              { id: 'home' as TabId, label: 'Home', icon: '🏠' },
              { id: 'path' as TabId, label: 'Path', icon: '📍' },
              { id: 'practice' as TabId, label: 'Practice', icon: '⚡' },
              { id: 'profile' as TabId, label: 'You', icon: '👤' },
            ]).map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 9,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600,
                    background: isActive
                      ? 'rgba(99,102,241,0.2)'
                      : 'transparent',
                    color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                    transition: 'all 200ms ease',
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 12, lineHeight: 1 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginTop: 'calc(env(safe-area-inset-top, 0px) + 96px)',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {activeTab === 'home' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <HomeTab
              progress={progress}
              subjects={UPSC_SYLLABUS}
              topicStates={enrichedTopicStates}
              onTopicTap={handleNodeTap}
              onNavigateToPath={() => setActiveTab('path')}
              profile={profile}
            />
          </div>
        )}

        {activeTab === 'path' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <JourneyPath
              subjects={UPSC_SYLLABUS}
              progress={topicStates}
              activeSubjectId={activeSubjectId}
              onNodeTap={handleNodeTap}
              onSubjectChange={setActiveSubjectId}
              profile={profile}
              studyCalendar={progress.studyCalendar}
              newlyUnlockedId={newlyUnlockedId ?? undefined}
            />
          </div>
        )}

        {activeTab === 'practice' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <PracticeTab
              progress={progress}
              subjects={UPSC_SYLLABUS}
              topicStates={enrichedTopicStates}
              onTopicSelect={handleNodeTap}
              onStartQuickMix={handleStartQuickMix}
              onNavigateToPath={() => setActiveTab('path')}
              profile={profile}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <ProfileTab
              progress={progress}
              subjects={UPSC_SYLLABUS}
              onDailyGoalClick={() => setGoalModalOpen(true)}
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
              onResetJourney={handleResetJourney}
            />
          </div>
        )}
      </div>

      {/* Topic Detail Sheet */}
      {detailTarget && (
        <TopicDetailSheet
          topic={detailTarget.topic}
          subject={detailTarget.subject}
          progress={topicStates[detailTarget.topic.id] || DEFAULT_TOPIC_PROGRESS}
          onClose={() => setDetailTarget(null)}
          onStartPractice={handleDetailStartPractice}
          onOpenMap={handleOpenMap}
          profile={profile}
        />
      )}

      {/* Practice Sheet Overlay */}
      {practiceTarget && (
        <PracticeSheet
          topic={practiceTarget.topic}
          subject={practiceTarget.subject}
          progress={topicStates[practiceTarget.topic.id] || DEFAULT_TOPIC_PROGRESS}
          hearts={hearts}
          onClose={() => setPracticeTarget(null)}
          onComplete={handlePracticeComplete}
          onHeartLost={handleHeartLost}
          onNextTopic={handleNextTopic}
          nextTopicName={findNextTopic(practiceTarget.topic.id)?.topic.title}
        />
      )}

      {/* Daily Goal Modal */}
      {goalModalOpen && (
        <DailyGoalModal
          currentTier={progress.dailyGoalTier}
          onSelect={handleGoalTierChange}
          onClose={() => setGoalModalOpen(false)}
        />
      )}

      {/* Achievement Toasts */}
      {achievementQueue.length > 0 && (
        <AchievementToast
          achievementId={achievementQueue[0]}
          onDone={handleAchievementDone}
        />
      )}

      {/* Celebration Overlay — Angry Birds style unlock */}
      {celebrationData && (
        <CelebrationOverlay
          completedTopicTitle={celebrationData.completedTopicTitle}
          nextTopicTitle={celebrationData.nextTopicTitle}
          nextTopicIcon={celebrationData.nextTopicIcon}
          subjectColor={celebrationData.subjectColor}
          onDismiss={handleCelebrationDismiss}
        />
      )}

    </div>
  )
}
