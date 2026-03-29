'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { UPSC_SYLLABUS, TOTAL_TOPICS, type LearningTopic, type LearningSubject } from '@/data/syllabus'
import {
  type JourneyProgress,
  type TopicProgress,
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
import { StatsHeader } from '@/components/journey/StatsHeader'
import JourneyPath from '@/components/journey/JourneyPath'
import PracticeSheet from '@/components/journey/PracticeSheet'
import { BottomNav } from '@/components/journey/BottomNav'
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
        // Migrate streak
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
  let prevDone = true // first topic is always available

  for (const subject of subjects) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const existing = progress.topics[topic.id]
        if (existing && (existing.state === 'completed' || existing.state === 'started')) {
          result[topic.id] = existing
          prevDone = existing.state === 'completed'
        } else if (prevDone) {
          // This topic is available (previous was completed or this is first)
          result[topic.id] = {
            ...(existing || DEFAULT_TOPIC_PROGRESS),
            state: 'available',
          }
          prevDone = false // subsequent ones are locked until this is done
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

const HEART_REFILL_MS = 30 * 60 * 1000 // 30 minutes per heart

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

  // Streak broken
  return { streak: 0, isToday: false }
}

// ── Daily reset ──────────────────────────────────────────────────────────────

function resetDailyIfNeeded(progress: JourneyProgress): JourneyProgress {
  const today = new Date().toISOString().slice(0, 10)
  if (progress.todayDate !== today) {
    return {
      ...progress,
      todayXp: 0,
      todayDate: today,
    }
  }
  return progress
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MobileLearningJourney() {
  const [progress, setProgress] = useState<JourneyProgress>(DEFAULT_PROGRESS)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'learn' | 'practice' | 'map' | 'profile'>('learn')

  // Topic detail sheet (pre-practice)
  const [detailTarget, setDetailTarget] = useState<{
    topic: LearningTopic
    subject: LearningSubject
  } | null>(null)

  // Practice sheet (quiz)
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
    // Compute current hearts
    loaded.hearts = computeHearts(loaded)
    // Compute streak
    const { streak } = computeStreak(loaded)
    loaded.streak = streak
    // Reset daily XP if new day
    loaded = resetDailyIfNeeded(loaded)
    setProgress(loaded)
    setMounted(true)
  }, [])

  // Save progress on change
  useEffect(() => {
    if (mounted) saveJourneyProgress(progress)
  }, [progress, mounted])

  // Computed topic states (with availability)
  const topicStates = useMemo(
    () => computeTopicStates(UPSC_SYLLABUS, progress),
    [progress]
  )

  // Completed count
  const completedTopics = useMemo(
    () => Object.values(topicStates).filter(t => t.state === 'completed').length,
    [topicStates]
  )

  // Active subject color
  const accentColor = useMemo(() => {
    if (activeSubjectId) {
      const s = UPSC_SYLLABUS.find(s => s.id === activeSubjectId)
      return s?.color || '#6366f1'
    }
    return '#6366f1'
  }, [activeSubjectId])

  // Current hearts
  const hearts = useMemo(() => computeHearts(progress), [progress])

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Handle node tap → show topic detail sheet
  const handleNodeTap = useCallback((topicId: string, topic: LearningTopic, subject: LearningSubject) => {
    const state = topicStates[topicId]
    if (!state || state.state === 'locked') return

    // Mark as started if available
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

    // Open topic detail sheet
    setDetailTarget({ topic, subject })
  }, [topicStates])

  // Handle start practice from detail sheet or practice tab
  const handleStartPractice = useCallback((topicId: string, topic: LearningTopic, subject: LearningSubject) => {
    const state = topicStates[topicId]
    if (!state || state.state === 'locked') return

    // Mark as started if available
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

    setDetailTarget(null) // close detail if open
    setPracticeTarget({ topic, subject })
  }, [topicStates])

  // Handle practice from detail sheet
  const handleDetailStartPractice = useCallback(() => {
    if (!detailTarget) return
    handleStartPractice(detailTarget.topic.id, detailTarget.topic, detailTarget.subject)
  }, [detailTarget, handleStartPractice])

  // Open map for topic
  const handleOpenMap = useCallback(() => {
    if (detailTarget) {
      window.location.href = `/map?q=${encodeURIComponent(detailTarget.topic.mapQuery)}`
    }
  }, [detailTarget])

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

      // Crown level: level up every QUESTIONS_PER_CROWN correct answers
      let newCrown = existing.crownLevel
      const neededForNext = (newCrown + 1) * QUESTIONS_PER_CROWN
      if (newCorrect >= neededForNext && newCrown < 5) {
        newCrown = Math.min(5, newCrown + 1) as CrownLevel
      }

      // State: completed if at least crown 1
      const newState = newCrown >= 1 ? 'completed' : 'started'

      // XP
      let xpGained = result.correct * XP_PER_CORRECT
      if (isPerfect) xpGained += XP_PER_PERFECT_ROUND
      if (newCrown > existing.crownLevel) xpGained += XP_PER_CROWN_LEVEL

      // Streak
      const { streak, isToday } = computeStreak(prev)
      const newStreak = isToday ? streak : streak + 1

      // Gems: +5 for perfect, +2 for crown up
      let gemsGained = 0
      if (isPerfect) gemsGained += 5
      if (newCrown > existing.crownLevel) gemsGained += 2

      // Daily goal tracking
      const newTodayXp = (prev.todayDate === todayDate ? prev.todayXp : 0) + xpGained
      const goalXp = DAILY_GOALS[prev.dailyGoalTier].xpTarget
      const prevGoalMet = prev.todayDate === todayDate && prev.todayXp >= goalXp
      const nowGoalMet = newTodayXp >= goalXp
      const goalJustMet = !prevGoalMet && nowGoalMet
      const newGoalStreak = goalJustMet ? prev.goalStreakDays + 1 : prev.goalStreakDays

      // Study calendar
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
      // Keep only last 90 days
      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
      const trimmedCalendar = calendar.filter(d => d.date >= cutoff)

      // Perfect scores
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

      // Check achievements
      const newAchievements = checkAchievements(updated, UPSC_SYLLABUS)
      if (newAchievements.length > 0) {
        updated.achievements = [
          ...updated.achievements,
          ...newAchievements.map(id => ({ id, unlockedAt: today })),
        ]
        // Queue toasts (via setTimeout to avoid setState-in-setState)
        setTimeout(() => {
          setAchievementQueue(prev => [...prev, ...newAchievements])
        }, 500)
      }

      return updated
    })

    setPracticeTarget(null)
  }, [practiceTarget])

  // Handle heart lost
  const handleHeartLost = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1),
      heartsLastRefill: prev.hearts === 5 ? new Date().toISOString() : prev.heartsLastRefill,
    }))
  }, [])

  // Handle tab change
  const handleTabChange = useCallback((tab: 'learn' | 'practice' | 'map' | 'profile') => {
    if (tab === 'map') {
      window.location.href = '/map'
      return
    }
    setActiveTab(tab)
  }, [])

  // Handle daily goal tier change
  const handleGoalTierChange = useCallback((tier: DailyGoalTier) => {
    setProgress(prev => ({ ...prev, dailyGoalTier: tier }))
  }, [])

  // Handle achievement toast dismiss
  const handleAchievementDone = useCallback(() => {
    setAchievementQueue(prev => prev.slice(1))
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100dvh', background: '#080810' }}>
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: '#080810', overflow: 'hidden' }}>
      {/* Stats Header + Subject Tabs */}
      <StatsHeader
        progress={progress}
        subjects={UPSC_SYLLABUS}
        activeSubjectId={activeSubjectId}
        onSubjectChange={setActiveSubjectId}
        totalTopics={TOTAL_TOPICS}
        completedTopics={completedTopics}
        onOpenGoalModal={() => setGoalModalOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'learn' && (
          <JourneyPath
            subjects={UPSC_SYLLABUS}
            progress={topicStates}
            activeSubjectId={activeSubjectId}
            onNodeTap={handleNodeTap}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeTab
            progress={progress}
            topicStates={topicStates}
            onStartPractice={handleStartPractice}
            onSwitchToLearn={() => setActiveTab('learn')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            progress={progress}
            topicStates={topicStates}
            completedTopics={completedTopics}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        accentColor={accentColor}
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
