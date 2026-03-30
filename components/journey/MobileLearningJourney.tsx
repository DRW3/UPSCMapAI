'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { UPSC_SYLLABUS, type LearningTopic, type LearningSubject } from '@/data/syllabus'
import {
  type JourneyProgress,
  type TopicProgress,
  type NodeState,
  type CrownLevel,
  type DailyGoalTier,
  DEFAULT_PROGRESS,
  DEFAULT_TOPIC_PROGRESS,
  XP_PER_CORRECT,
  XP_PER_PERFECT_ROUND,
  XP_PER_CROWN_LEVEL,
  QUESTIONS_PER_CROWN,
  DAILY_GOALS,
  checkAchievements,
} from '@/components/journey/types'
import { StatsHeader, STATS_HEADER_HEIGHT } from '@/components/journey/StatsHeader'
import JourneyPath from '@/components/journey/JourneyPath'
import PracticeSheet from '@/components/journey/PracticeSheet'
import { BottomNav, BOTTOM_NAV_HEIGHT } from '@/components/journey/BottomNav'
import HomeTab from '@/components/journey/HomeTab'
import TopicDetailSheet from '@/components/journey/TopicDetailSheet'
import PracticeTab from '@/components/journey/PracticeTab'
import ProfileTab from '@/components/journey/ProfileTab'
import DailyGoalModal from '@/components/journey/DailyGoalModal'
import AchievementToast from '@/components/journey/AchievementToast'

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
  const today = new Date().toISOString().slice(0, 10)
  const last = progress.lastStudyDate.slice(0, 10)
  if (last === today) return { streak: progress.streak, isToday: true }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (last === yesterday) return { streak: progress.streak, isToday: false }
  return { streak: 0, isToday: false }
}

// ── Daily reset ──────────────────────────────────────────────────────────────

function resetDailyIfNeeded(progress: JourneyProgress): JourneyProgress {
  const today = new Date().toISOString().slice(0, 10)
  if (progress.todayDate !== today) {
    return { ...progress, todayXp: 0, todayDate: today }
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

  // Daily goal XP target
  const dailyGoalXp = DAILY_GOALS[progress.dailyGoalTier].xpTarget

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
    xpEarned: number
    newCrownLevel: CrownLevel
  }) => {
    if (!practiceTarget) return
    const { topic } = practiceTarget
    const today = new Date().toISOString()
    const todayDate = today.slice(0, 10)
    const isPerfect = result.correct === result.total && result.total > 0

    setProgress(prev => {
      const existing = prev.topics[topic.id] || DEFAULT_TOPIC_PROGRESS
      const newCorrect = existing.correctAnswers + result.correct
      const newAnswered = existing.questionsAnswered + result.total

      let newCrown = existing.crownLevel
      const neededForNext = (newCrown + 1) * QUESTIONS_PER_CROWN
      if (newCorrect >= neededForNext && newCrown < 5) {
        newCrown = Math.min(5, newCrown + 1) as CrownLevel
      }

      const newState = newCrown >= 1 ? 'completed' : 'started'

      let xpGained = result.correct * XP_PER_CORRECT
      if (isPerfect) xpGained += XP_PER_PERFECT_ROUND
      if (newCrown > existing.crownLevel) xpGained += XP_PER_CROWN_LEVEL

      const { streak, isToday } = computeStreak(prev)
      const newStreak = isToday ? streak : streak + 1

      let gemsGained = 0
      if (isPerfect) gemsGained += 5
      if (newCrown > existing.crownLevel) gemsGained += 2

      const newTodayXp = (prev.todayDate === todayDate ? prev.todayXp : 0) + xpGained
      const goalXp = DAILY_GOALS[prev.dailyGoalTier].xpTarget
      const prevGoalMet = prev.todayDate === todayDate && prev.todayXp >= goalXp
      const nowGoalMet = newTodayXp >= goalXp
      const goalJustMet = !prevGoalMet && nowGoalMet
      const newGoalStreak = goalJustMet ? prev.goalStreakDays + 1 : prev.goalStreakDays

      const calendar = [...(prev.studyCalendar || [])]
      const existingDay = calendar.find(d => d.date === todayDate)
      if (existingDay) {
        existingDay.xpEarned += xpGained
        existingDay.questionsAnswered += result.total
        existingDay.goalMet = existingDay.goalMet || nowGoalMet
      } else {
        calendar.push({
          date: todayDate,
          xpEarned: xpGained,
          questionsAnswered: result.total,
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
            xpEarned: existing.xpEarned + xpGained,
            questionsAnswered: newAnswered,
            correctAnswers: newCorrect,
            lastPracticed: today,
          },
        },
        totalXp: prev.totalXp + xpGained,
        streak: newStreak,
        lastStudyDate: today,
        gems: prev.gems + gemsGained,
        todayXp: newTodayXp,
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

  const handleHeartLost = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1),
      heartsLastRefill: prev.hearts === 5 ? new Date().toISOString() : prev.heartsLastRefill,
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

      {/* Stats Header */}
      <StatsHeader
        streak={progress.streak}
        todayXp={progress.todayXp}
        dailyGoalXp={dailyGoalXp}
        onDailyGoalClick={() => setGoalModalOpen(true)}
      />

      {/* Main Content Area */}
      <div style={{
        marginTop: STATS_HEADER_HEIGHT,
        marginBottom: BOTTOM_NAV_HEIGHT,
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
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <ProfileTab
              progress={progress}
              subjects={UPSC_SYLLABUS}
              onDailyGoalClick={() => setGoalModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Topic Detail Sheet */}
      {detailTarget && (
        <TopicDetailSheet
          topic={detailTarget.topic}
          subject={detailTarget.subject}
          progress={topicStates[detailTarget.topic.id] || DEFAULT_TOPIC_PROGRESS}
          onClose={() => setDetailTarget(null)}
          onStartPractice={handleDetailStartPractice}
          onOpenMap={handleOpenMap}
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
        />
      )}

      {/* Daily Goal Modal */}
      {goalModalOpen && (
        <DailyGoalModal
          currentTier={progress.dailyGoalTier}
          todayXp={progress.todayXp}
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
    </div>
  )
}
