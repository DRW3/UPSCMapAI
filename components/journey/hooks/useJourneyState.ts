// components/journey/hooks/useJourneyState.ts
'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type RefObject } from 'react'
import type { Dispatch, SetStateAction } from 'react'
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
  MAX_HEARTS,
  FREE_TOPIC_LIMIT,
  HEART_REFILL_MS,
  MAX_SEEN_IDS_PER_TOPIC,
} from '@/components/journey/types'
import { hasCompletedOnboarding } from '@/components/journey/OnboardingFlow'

export interface EnrichedTopicEntry {
  state: NodeState
  topic: LearningTopic
  subject: LearningSubject
}

export type TabId = 'home' | 'live' | 'path' | 'practice' | 'profile'

export type PaywallReason = 'topics' | 'hearts' | null

export interface CelebrationData {
  completedTopicTitle: string
  nextTopicTitle: string
  nextTopicIcon: string
  subjectColor: string
  nextTopic: LearningTopic
  nextSubject: LearningSubject
}

export interface PendingTopicTarget {
  topic: LearningTopic
  subject: LearningSubject
  intent: 'detail' | 'practice'
}

export interface JourneyStateValue {
  // ── Persistent state ─────────────────────────────────────────
  progress: JourneyProgress
  setProgress: Dispatch<SetStateAction<JourneyProgress>>
  profile: UserProfile | null
  setProfile: Dispatch<SetStateAction<UserProfile | null>>
  mounted: boolean
  showOnboarding: boolean
  setShowOnboarding: Dispatch<SetStateAction<boolean>>

  // ── UI state ─────────────────────────────────────────────────
  activeTab: TabId
  setActiveTab: Dispatch<SetStateAction<TabId>>
  tabTransition: boolean
  setTabTransition: Dispatch<SetStateAction<boolean>>

  // ── Derived state (memoized) ─────────────────────────────────
  topicStates: Record<string, TopicProgress>
  enrichedTopicStates: Record<string, EnrichedTopicEntry>
  continueTarget: EnrichedTopicEntry | null
  pyqCounts: Record<string, number>
  setPyqCounts: Dispatch<SetStateAction<Record<string, number>>>
  dailyTip: string | null
  setDailyTip: Dispatch<SetStateAction<string | null>>
  hearts: number

  // ── Modal / overlay queue ────────────────────────────────────
  detailTarget: { topic: LearningTopic; subject: LearningSubject } | null
  setDetailTarget: Dispatch<SetStateAction<{ topic: LearningTopic; subject: LearningSubject } | null>>
  practiceTarget: { topic: LearningTopic; subject: LearningSubject } | null
  setPracticeTarget: Dispatch<SetStateAction<{ topic: LearningTopic; subject: LearningSubject } | null>>
  goalModalOpen: boolean
  setGoalModalOpen: Dispatch<SetStateAction<boolean>>

  // ── Celebrations ─────────────────────────────────────────────
  celebrationData: CelebrationData | null
  setCelebrationData: Dispatch<SetStateAction<CelebrationData | null>>
  goalCelebrationOpen: boolean
  setGoalCelebrationOpen: Dispatch<SetStateAction<boolean>>
  achievementQueue: string[]
  setAchievementQueue: Dispatch<SetStateAction<string[]>>

  // ── Map / journey navigation ─────────────────────────────────
  activeSubjectId: string | null
  setActiveSubjectId: Dispatch<SetStateAction<string | null>>
  newlyUnlockedId: string | null
  setNewlyUnlockedId: Dispatch<SetStateAction<string | null>>

  // ── PadhAI Pro paywall ───────────────────────────────────────
  paywallReason: PaywallReason
  setPaywallReason: Dispatch<SetStateAction<PaywallReason>>
  pendingTopicTarget: PendingTopicTarget | null
  setPendingTopicTarget: Dispatch<SetStateAction<PendingTopicTarget | null>>
  didUpgradeInPaywall: boolean
  setDidUpgradeInPaywall: Dispatch<SetStateAction<boolean>>

  // ── Handlers (stable callbacks) ──────────────────────────────
  handleNodeTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  handleStartPractice: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  handlePracticeComplete: (result: {
    correct: number
    total: number
    newCrownLevel: CrownLevel
    keepOpen?: boolean
    seenIds?: number[]
    newWrongIds?: number[]
    resolvedWrongIds?: number[]
  }) => void
  handleDetailStartPractice: () => void
  handleOpenMap: (context?: string) => void
  handleAchievementDone: () => void
  handleOnboardingComplete: (profile: UserProfile) => void
  handleProfileUpdate: (profile: UserProfile) => void
  handleResetJourney: () => void
  handleTabChange: (tab: TabId) => void
  handleGoalTierChange: (tier: DailyGoalTier) => void
  handleNextTopic: () => void
  handleCelebrationDismiss: () => void
  handleHeartLost: () => void
  handleResetTopicSeenIds: (topicId: string) => void
  handleUpgradePro: () => void
  handlePaywallDismiss: () => void
  findNextTopic: (currentTopicId: string | undefined) => { topic: LearningTopic; subject: LearningSubject } | null
  closeDetail: () => void
  closePractice: () => void
  closeCelebration: () => void
  closeGoalCelebration: () => void
  goalCelebrationSnapshotRef: RefObject<{
    streak: number
    topicsRead: number
    practiceDone: number
    readTarget: number
    practiceTarget: number
  } | null>
}

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

// ── Compute topic availability (all topics open, no sequential locking) ──────

function computeTopicStates(
  subjects: LearningSubject[],
  progress: JourneyProgress
): Record<string, TopicProgress> {
  const result: Record<string, TopicProgress> = {}

  for (const subject of subjects) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const existing = progress.topics[topic.id]
        if (existing && (existing.state === 'completed' || existing.state === 'started')) {
          result[topic.id] = existing
        } else {
          result[topic.id] = {
            ...(existing || DEFAULT_TOPIC_PROGRESS),
            state: 'available',
          }
        }
      }
    }
  }

  return result
}

// ── Hearts refill logic (1 heart per hour, max 10) ──────────────────────────

function computeHearts(progress: JourneyProgress): number {
  if (progress.hearts >= MAX_HEARTS) return MAX_HEARTS
  if (!progress.heartsLastRefill) return progress.hearts
  const elapsed = Date.now() - new Date(progress.heartsLastRefill).getTime()
  const refilled = Math.floor(elapsed / HEART_REFILL_MS)
  return Math.min(MAX_HEARTS, progress.hearts + refilled)
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

export function useJourneyState(): JourneyStateValue {
  const [progress, setProgress] = useState<JourneyProgress>(DEFAULT_PROGRESS)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [tabTransition, setTabTransition] = useState(false)

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

  // PadhAI Pro paywall
  const [paywallReason, setPaywallReason] = useState<'topics' | 'hearts' | null>(null)
  // Topic the user was trying to open when the paywall fired — so we can
  // drop them right back into it after they upgrade (or were practicing it
  // when hearts ran out).
  const [pendingTopicTarget, setPendingTopicTarget] = useState<{
    topic: LearningTopic
    subject: LearningSubject
    intent: 'detail' | 'practice'
  } | null>(null)
  // Tracks whether the user actually completed an upgrade in the most recent
  // paywall session (vs just dismissing). Used by the dismiss handler to
  // decide whether to auto-resume the blocked screen.
  const [didUpgradeInPaywall, setDidUpgradeInPaywall] = useState(false)

  // Real PYQ counts from database
  const [pyqCounts, setPyqCounts] = useState<Record<string, number>>({})

  // Daily-goal celebration overlay — fires once per day the moment the user
  // hits both the read AND practice targets. Detected by a useEffect that
  // watches today's counts; once-per-day guard via localStorage.
  const [goalCelebrationOpen, setGoalCelebrationOpen] = useState(false)
  const goalCelebrationSnapshotRef = useRef<{
    streak: number
    topicsRead: number
    practiceDone: number
    readTarget: number
    practiceTarget: number
  } | null>(null)
  // Tracks whether the goal was already met on the previous render so we
  // only fire the celebration on the rising edge (not-met → met).
  const goalMetPrevRef = useRef<boolean | null>(null)

  // Tracks the topic the user just finished practicing every available
  // question for. Set in handlePracticeComplete on the round that pushes
  // the seen-IDs count up to the topic's full PYQ pool, consumed once by
  // handleNextTopic to fire the topic-complete celebration. Anything else
  // (closing the sheet, switching topics) resets it via subsequent rounds.
  // Stored in a ref (not state) so the value is synchronously available
  // across the deferred onFinish → setTimeout(onNextTopic) chain that the
  // score-screen CTA uses.
  const justCompletedTopicRef = useRef<string | null>(null)

  // AI-generated daily mentor tip
  const [dailyTip, setDailyTip] = useState<string | null>(null)

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

    // Fetch real PYQ counts from database (cached 1hr server-side)
    const cachedCounts = localStorage.getItem('upsc-pyq-counts')
    if (cachedCounts) {
      try { setPyqCounts(JSON.parse(cachedCounts)) } catch {}
    }
    fetch('/api/journey/pyq-counts')
      .then(r => r.json())
      .then(d => {
        if (d.counts) {
          setPyqCounts(d.counts)
          localStorage.setItem('upsc-pyq-counts', JSON.stringify(d.counts))
        }
      })
      .catch(() => {})
  }, [])

  // Save progress on change
  useEffect(() => {
    if (mounted) saveJourneyProgress(progress)
  }, [progress, mounted])

  // ── Daily-goal completion detector ──────────────────────────────────────
  // Watches today's read/practice counts and the active goal tier. The
  // moment the user crosses BOTH targets in a single render (rising edge),
  // we open the celebration overlay — but only if it has not already fired
  // for this calendar day (localStorage guard) and only if no full-screen
  // sheet is currently in the way (we queue it via state and the existing
  // effect will fire it once the sheet closes).
  useEffect(() => {
    if (!mounted) return
    const todayDate = getLocalDate()
    if (progress.todayDate !== todayDate) {
      // Day rolled over since last check; counters will reset.
      goalMetPrevRef.current = false
      return
    }
    const cfg = DAILY_GOALS[progress.dailyGoalTier || 'regular']
    const isMet = (progress.todayTopicsRead || 0) >= cfg.readTarget &&
                  (progress.todayTopicsPracticed || 0) >= cfg.practiceTarget

    // First run after mount: snapshot whatever the current state is so we
    // never fire on app load (only on a real not-met → met transition).
    if (goalMetPrevRef.current === null) {
      goalMetPrevRef.current = isMet
      return
    }

    // Rising edge: not-met → met
    if (isMet && !goalMetPrevRef.current) {
      // Once-per-day guard via localStorage so a refresh won't re-fire.
      try {
        const lastFired = localStorage.getItem('upsc-goal-celebrated-date')
        if (lastFired === todayDate) {
          goalMetPrevRef.current = true
          return
        }
        localStorage.setItem('upsc-goal-celebrated-date', todayDate)
      } catch {}

      // The practice path may have already bumped goalStreakDays + marked
      // today's calendar as goalMet. The read paths do NOT — so we need to
      // detect which case we're in and bump the streak ourselves if the
      // calendar hasn't been marked yet for today.
      const todayCalendarEntry = (progress.studyCalendar || []).find(d => d.date === todayDate)
      const alreadyMarked = !!todayCalendarEntry?.goalMet
      const effectiveStreak = alreadyMarked
        ? Math.max(1, progress.goalStreakDays || 0)
        : (progress.goalStreakDays || 0) + 1

      if (!alreadyMarked) {
        // Commit the streak bump + calendar mark for read-driven completions.
        setProgress(prev => {
          const calendar = [...(prev.studyCalendar || [])]
          const existing = calendar.find(d => d.date === todayDate)
          if (existing) {
            existing.goalMet = true
          } else {
            calendar.push({
              date: todayDate,
              questionsAnswered: 0,
              correctAnswers: 0,
              goalMet: true,
            })
          }
          return {
            ...prev,
            studyCalendar: calendar,
            goalStreakDays: (prev.goalStreakDays || 0) + 1,
          }
        })
      }

      // Snapshot frozen at the moment of completion so the overlay shows
      // a consistent picture even if the user keeps studying after.
      goalCelebrationSnapshotRef.current = {
        streak: effectiveStreak,
        topicsRead: progress.todayTopicsRead || 0,
        practiceDone: progress.todayTopicsPracticed || 0,
        readTarget: cfg.readTarget,
        practiceTarget: cfg.practiceTarget,
      }
      setGoalCelebrationOpen(true)
    }
    goalMetPrevRef.current = isMet
  }, [
    mounted,
    progress.todayTopicsRead,
    progress.todayTopicsPracticed,
    progress.todayDate,
    progress.dailyGoalTier,
    progress.goalStreakDays,
    progress.studyCalendar,
  ])

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

  // ── Continue target — single source of truth ──────────────────────────────
  // Computed once here, then used BOTH for the HomeTab CTA (passed as a
  // prop) AND for the daily-tip API call (so the mentor's recommendation
  // always names the exact same topic the button opens).
  //
  // Priority order:
  //   1. Most-recently-practiced started topic (returning user)
  //   2. First available topic in the user's chosen weak subject
  //      (welcome state — respects what they picked at onboarding)
  //   3. First available topic in overall syllabus order (fallback)
  //   4. null (everything completed)
  const continueTarget = useMemo(() => {
    type Entry = { state: NodeState; topic: LearningTopic; subject: LearningSubject }
    const focusIds = profile?.weakSubjects ?? []
    const focusSet = new Set(focusIds)
    const hasFocus = focusSet.size > 0

    const findMostRecentStarted = (filterByFocus: boolean): Entry | null => {
      let best: Entry | null = null
      let bestDate = ''
      for (const sub of UPSC_SYLLABUS) {
        if (filterByFocus && !focusSet.has(sub.id)) continue
        for (const u of sub.units) {
          for (const t of u.topics) {
            const entry = enrichedTopicStates[t.id]
            if (!entry || entry.state !== 'started') continue
            const tp = progress.topics[t.id]
            const lastPrac = tp?.lastPracticed || ''
            if (!best || lastPrac > bestDate) {
              best = entry
              bestDate = lastPrac
            }
          }
        }
      }
      return best
    }

    // Priority 1: most recent IN-PROGRESS topic that ALSO belongs to one
    // of the user's currently picked focus subjects. This is the smart
    // case — if the user changes their focus subjects, the next-step
    // card jumps to a topic from the new focus set, EVEN IF they had
    // a different topic in progress before. Without this filter the
    // CTA gets stuck on whatever the user last touched and never
    // reflects the focus change the user just made.
    if (hasFocus) {
      const inFocus = findMostRecentStarted(true)
      if (inFocus) return inFocus
    }

    // Priority 2: first AVAILABLE topic inside the user's focus subjects,
    // walked in the exact order the user picked them at onboarding /
    // updated via the Change Focus panel. So their first pick gets the
    // next-step slot if they haven't started anything in focus yet.
    if (hasFocus) {
      for (const focusId of focusIds) {
        const focusSub = UPSC_SYLLABUS.find(s => s.id === focusId)
        if (!focusSub) continue
        for (const u of focusSub.units) {
          for (const t of u.topics) {
            const entry = enrichedTopicStates[t.id]
            if (entry && entry.state === 'available') return entry
          }
        }
      }
    }

    // Priority 3: most recent in-progress topic ANYWHERE — fallback for
    // users who've started topics outside their focus subjects. Better
    // than dropping them on a brand-new available topic.
    const anyStarted = findMostRecentStarted(false)
    if (anyStarted) return anyStarted

    // Priority 4: first available in raw syllabus order
    for (const sub of UPSC_SYLLABUS) {
      for (const u of sub.units) {
        for (const t of u.topics) {
          const entry = enrichedTopicStates[t.id]
          if (entry && entry.state === 'available') return entry
        }
      }
    }
    return null
  }, [enrichedTopicStates, progress.topics, profile])

  // Fetch AI mentor tip — uses enrichedTopicStates to match the "Your Next Step" card exactly
  useEffect(() => {
    if (!mounted || activeTab !== 'home') return
    setDailyTip(null)
    const abort = new AbortController()

    const completed = Object.values(progress.topics).filter(t => t.state === 'completed').length
    const started = Object.values(progress.topics).filter(t => t.state === 'started' || t.state === 'completed').length
    const totalQuestionsAnswered = Object.values(progress.topics).reduce((s, t) => s + (t.questionsAnswered || 0), 0)
    const total = UPSC_SYLLABUS.reduce((s, sub) => s + sub.units.reduce((s2, u) => s2 + u.topics.length, 0), 0)
    const h = new Date().getHours()
    const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'
    const goalCfg = DAILY_GOALS[progress.dailyGoalTier || 'regular']

    const resolveNames = (ids: string[]) => ids
      .map(id => UPSC_SYLLABUS.find(s => s.id === id)?.shortTitle)
      .filter(Boolean).join(', ')

    let weakName = '', weakAcc = ''
    if (profile?.weakSubjects?.length) {
      const s = UPSC_SYLLABUS.find(sub => sub.id === profile.weakSubjects[0])
      if (s) {
        weakName = s.shortTitle
        let correct = 0, answered = 0
        for (const u of s.units) for (const t of u.topics) {
          const tp = progress.topics[t.id]
          if (tp) { correct += tp.correctAnswers; answered += tp.questionsAnswered }
        }
        if (answered > 0) weakAcc = String(Math.round((correct / answered) * 100))
      }
    }

    // SINGLE source of truth: use the parent-computed continueTarget. This
    // is the EXACT same value passed to HomeTab as a prop, so the mentor's
    // sentence and the "Your Next Step" CTA can never disagree.
    const nextTopicName = continueTarget?.topic.title || ''
    const nextTopicSubject = continueTarget?.subject.shortTitle || ''
    const ctaLabel = nextTopicName
      ? (continueTarget?.state === 'started' ? `Continue ${nextTopicName}` : `Start ${nextTopicName}`)
      : 'Begin'

    let pace = 'just_starting'
    if (profile?.examYear) {
      const daysLeft = Math.ceil((new Date(profile.examYear, 4, 25).getTime() - Date.now()) / 86400000)
      if (daysLeft > 0 && total > 0) {
        const tpw = Math.ceil(((total - completed) / daysLeft) * 7 * 10) / 10
        pace = tpw <= 3 ? 'ahead' : tpw <= 6 ? 'on_track' : 'needs_acceleration'
      }
    }

    // ── Today's micro-stats (from the study calendar entry for today) ──
    // Falls back to zero if the user hasn't practiced today yet, which is
    // a meaningful signal in itself.
    const todayKey = getLocalDate()
    const todayCal = (progress.studyCalendar || []).find(d => d.date === todayKey)
    const todayQa = todayCal?.questionsAnswered || 0
    const todayCorrect = todayCal?.correctAnswers || 0
    const todayAcc = todayQa > 0 ? Math.round((todayCorrect / todayQa) * 100) : 0

    // ── Last-7-days momentum ──────────────────────────────────────────
    // Distinct days the user touched the app and total questions answered
    // in that window. Drives the "you studied 5 of the last 7 days" signal.
    let weekDays = 0
    let weekQa = 0
    {
      const cutoffMs = Date.now() - 7 * 86400000
      for (const d of progress.studyCalendar || []) {
        const t = new Date(d.date).getTime()
        if (Number.isFinite(t) && t >= cutoffMs && (d.questionsAnswered || 0) > 0) {
          weekDays += 1
          weekQa += d.questionsAnswered || 0
        }
      }
    }

    // ── Next topic specifics (only if the user has touched it before) ──
    // Lets the server suggest "your last try on X was 55% — re-read first"
    // or "you're 2 correct from Crown 3 on X". Resolved by topic title
    // since that's what we already pass to the API.
    let ntAnswered = 0, ntCorrect = 0, ntAcc = 0, ntCrown = 0, ntToCrown = 0
    let nextTopicId = ''
    if (nextTopicName) {
      // Find the topic by title (we already iterated to pick it above).
      for (const sub of UPSC_SYLLABUS) {
        let hit = false
        for (const u of sub.units) {
          for (const t of u.topics) {
            if (t.title === nextTopicName) { nextTopicId = t.id; hit = true; break }
          }
          if (hit) break
        }
        if (hit) break
      }
      if (nextTopicId) {
        const tp = progress.topics[nextTopicId]
        if (tp) {
          ntAnswered = tp.questionsAnswered || 0
          ntCorrect = tp.correctAnswers || 0
          ntAcc = ntAnswered > 0 ? Math.round((ntCorrect / ntAnswered) * 100) : 0
          ntCrown = tp.crownLevel || 0
          // Crown jumps every QUESTIONS_PER_CROWN correct answers.
          if (ntCrown < 5) {
            const need = (ntCrown + 1) * QUESTIONS_PER_CROWN
            ntToCrown = Math.max(0, need - ntCorrect)
          }
        }
      }
    }

    // ── Subject accuracy (across the full subject of the next topic) ──
    // Powers the "your Polity is at 78%" signal. Uses the next topic's
    // subject so it stays aligned with the action button.
    let subAnswered = 0, subCorrect = 0, subAcc = 0
    if (nextTopicSubject) {
      const sub = UPSC_SYLLABUS.find(s => s.shortTitle === nextTopicSubject)
      if (sub) {
        for (const u of sub.units) for (const t of u.topics) {
          const tp = progress.topics[t.id]
          if (tp) { subAnswered += tp.questionsAnswered || 0; subCorrect += tp.correctAnswers || 0 }
        }
        if (subAnswered > 0) subAcc = Math.round((subCorrect / subAnswered) * 100)
      }
    }

    const params = new URLSearchParams({
      name: profile?.name?.split(' ')[0] || '',
      done: String(completed),
      started: String(started),
      qa: String(totalQuestionsAnswered),
      total: String(total),
      ...(profile?.examYear ? { days: String(Math.ceil((new Date(profile.examYear, 4, 25).getTime() - Date.now()) / 86400000)) } : {}),
      streak: String(progress.streak || 0),
      pace,
      weak: weakName,
      weakAcc,
      strong: profile?.strongSubjects?.length ? resolveNames(profile.strongSubjects) : '',
      nextTopic: nextTopicName,
      nextSubject: nextTopicSubject,
      cta: ctaLabel,
      time,
      stage: profile?.prepStage || '',
      gr: `${progress.todayTopicsRead || 0}/${goalCfg.readTarget}`,
      gp: `${progress.todayTopicsPracticed || 0}/${goalCfg.practiceTarget}`,
      // ── New, precise metrics powering the priority cascade ──
      todayQa: String(todayQa),
      todayCorrect: String(todayCorrect),
      todayAcc: String(todayAcc),
      weekDays: String(weekDays),
      weekQa: String(weekQa),
      ntAnswered: String(ntAnswered),
      ntCorrect: String(ntCorrect),
      ntAcc: String(ntAcc),
      ntCrown: String(ntCrown),
      ntToCrown: String(ntToCrown),
      subAnswered: String(subAnswered),
      subAcc: String(subAcc),
    })
    fetch(`/api/journey/daily-tip?${params}`, { signal: abort.signal })
      .then(r => r.json())
      .then(d => { if (d.tip) setDailyTip(d.tip) })
      .catch(() => {})
    return () => abort.abort()
  }, [mounted, profile, activeTab, progress, enrichedTopicStates, continueTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  // Current hearts
  const hearts = useMemo(() => computeHearts(progress), [progress])

  // ── Restore notes view when returning from map via back button ─────────────
  useEffect(() => {
    if (!mounted) return
    try {
      const saved = sessionStorage.getItem('upsc-map-return')
      if (!saved) return
      sessionStorage.removeItem('upsc-map-return')
      const { topicId, subjectId } = JSON.parse(saved)
      // Find the topic and subject in syllabus
      for (const subject of UPSC_SYLLABUS) {
        if (subject.id !== subjectId) continue
        for (const unit of subject.units) {
          for (const topic of unit.topics) {
            if (topic.id === topicId) {
              setDetailTarget({ topic, subject })
              setActiveTab('path')
              return
            }
          }
        }
      }
    } catch {}
  }, [mounted])

  // ── Free-topic gating ──────────────────────────────────────────────────────

  const canOpenTopic = useCallback((topicId: string): boolean => {
    if (progress.isPro) return true
    const state = topicStates[topicId]
    // Already started/completed topics are always accessible
    if (state && (state.state === 'completed' || state.state === 'started')) return true
    // Already in free opened list
    if (progress.freeTopicsOpened.includes(topicId)) return true
    // Under the free limit
    if (progress.freeTopicsOpened.length < FREE_TOPIC_LIMIT) return true
    return false
  }, [progress.isPro, progress.freeTopicsOpened, topicStates])

  const trackFreeOpen = useCallback((topicId: string) => {
    if (progress.isPro) return
    if (progress.freeTopicsOpened.includes(topicId)) return
    const state = topicStates[topicId]
    if (state && (state.state === 'completed' || state.state === 'started')) return
    setProgress(prev => ({
      ...prev,
      freeTopicsOpened: [...prev.freeTopicsOpened, topicId],
    }))
  }, [progress.isPro, progress.freeTopicsOpened, topicStates])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNodeTap = useCallback((topicId: string, topic: LearningTopic, subject: LearningSubject) => {
    // Check free-topic limit
    if (!canOpenTopic(topicId)) {
      setPendingTopicTarget({ topic, subject, intent: 'detail' })
      setPaywallReason('topics')
      return
    }

    const state = topicStates[topicId]
    if (state && state.state === 'available') {
      trackFreeOpen(topicId)
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
  }, [topicStates, canOpenTopic, trackFreeOpen])

  const handleStartPractice = useCallback((topicId: string, topic: LearningTopic, subject: LearningSubject) => {
    if (!canOpenTopic(topicId)) {
      setPendingTopicTarget({ topic, subject, intent: 'practice' })
      setPaywallReason('topics')
      return
    }

    const state = topicStates[topicId]
    if (state && state.state === 'available') {
      trackFreeOpen(topicId)
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
  }, [topicStates, canOpenTopic, trackFreeOpen])

  const handleDetailStartPractice = useCallback(() => {
    if (!detailTarget) return
    handleStartPractice(detailTarget.topic.id, detailTarget.topic, detailTarget.subject)
  }, [detailTarget, handleStartPractice])

  const handleOpenMap = useCallback((context?: string) => {
    if (!detailTarget) return
    // Save state so the back button returns to this exact notes view
    try {
      sessionStorage.setItem('upsc-map-return', JSON.stringify({
        topicId: detailTarget.topic.id,
        subjectId: detailTarget.subject.id,
      }))
    } catch {}

    // If the CTA came from a specific spot in the notes (e.g. a Key
    // Concept bullet about "Bhakra Nangal Dam on the Sutlej"), build a
    // focused prompt anchored on THAT exact sentence so the map plots
    // only the places mentioned there. Otherwise fall back to the
    // topic's general mapQuery (used by the big "Study on Map" button
    // at the top of the notes).
    const trimmed = context?.trim() ?? ''
    const query = trimmed.length > 0
      ? `Mark on the map the specific UPSC-relevant places, rivers, dams, sites, landmarks or regions mentioned in this note: "${trimmed}". Context — topic: ${detailTarget.topic.title} (${detailTarget.subject.shortTitle}). Only plot the features mentioned above; do not plot a broad overview.`
      : detailTarget.topic.mapQuery

    window.location.href = `/map?q=${encodeURIComponent(query)}`
  }, [detailTarget])

  // Handle practice complete
  const handlePracticeComplete = useCallback((result: {
    correct: number
    total: number
    newCrownLevel: CrownLevel
    keepOpen?: boolean
    seenIds?: number[]
    newWrongIds?: number[]
    resolvedWrongIds?: number[]
  }) => {
    if (!practiceTarget) return
    const { topic } = practiceTarget
    const today = new Date().toISOString()
    const todayDate = getLocalDate()
    const isPerfect = result.correct === result.total && result.total > 0

    // ── Topic-completion check (drives the celebration overlay) ──────────
    // We arm `justCompletedTopicRef` ONLY on the round that pushes the
    // user's per-topic seen-IDs count from "below the DB pool" up to
    // "covers the entire DB pool". Any further rounds on a topic that's
    // already complete won't re-fire the celebration.
    //
    // Computed BEFORE setProgress so we have a synchronous answer ready
    // for the score-screen CTA's deferred handleNextTopic call. We read
    // `progress` and `pyqCounts` from closure — both are snapshots from
    // the last render and are correct because this is the first commit
    // for the round in flight.
    //
    // Intermediate rounds (Try Again with New / Practice More — flagged
    // with keepOpen) never fire celebration even if they incidentally
    // hit the threshold; the user is still mid-session, the celebration
    // belongs to the moment they navigate away.
    {
      const existingForCheck = progress.topics[topic.id] || DEFAULT_TOPIC_PROGRESS
      const prevSeen = existingForCheck.seenQuestionIds || []
      const incomingSeen = (result.seenIds || []).filter(n => Number.isFinite(n) && n > 0)
      const known = new Set(prevSeen)
      const additions = incomingSeen.filter(id => !known.has(id))
      const dbCount = pyqCounts[topic.id] || 0
      const wasComplete = dbCount > 0 && prevSeen.length >= dbCount
      const willBeComplete = dbCount > 0 && (prevSeen.length + additions.length) >= dbCount
      const justCompleted = !wasComplete && willBeComplete && !result.keepOpen
      justCompletedTopicRef.current = justCompleted ? topic.id : null
    }

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

      // Merge incoming seen-question IDs with the topic's existing
      // persisted set, dedupe, and cap to MAX_SEEN_IDS_PER_TOPIC. We append
      // to the END so the cap acts as an LRU (oldest IDs roll off first).
      const incomingSeen = (result.seenIds || []).filter(n => Number.isFinite(n) && n > 0)
      const prevSeen = existing.seenQuestionIds || []
      let mergedSeen = prevSeen
      if (incomingSeen.length > 0) {
        const known = new Set(prevSeen)
        const additions = incomingSeen.filter(id => !known.has(id))
        if (additions.length > 0) {
          mergedSeen = [...prevSeen, ...additions]
          if (mergedSeen.length > MAX_SEEN_IDS_PER_TOPIC) {
            mergedSeen = mergedSeen.slice(mergedSeen.length - MAX_SEEN_IDS_PER_TOPIC)
          }
        }
      }

      // Merge wrong-question IDs: add new ones, remove resolved ones.
      const incomingNewWrong = (result.newWrongIds || []).filter(n => Number.isFinite(n) && n > 0)
      const incomingResolved = (result.resolvedWrongIds || []).filter(n => Number.isFinite(n) && n > 0)
      const prevWrong = existing.wrongQuestionIds || []
      let mergedWrong = prevWrong
      if (incomingNewWrong.length > 0 || incomingResolved.length > 0) {
        const wrongSet = new Set(prevWrong)
        for (const id of incomingNewWrong) wrongSet.add(id)
        for (const id of incomingResolved) wrongSet.delete(id)
        mergedWrong = Array.from(wrongSet)
        if (mergedWrong.length > MAX_SEEN_IDS_PER_TOPIC) {
          mergedWrong = mergedWrong.slice(mergedWrong.length - MAX_SEEN_IDS_PER_TOPIC)
        }
      }

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
            seenQuestionIds: mergedSeen,
            wrongQuestionIds: mergedWrong,
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

    if (!result.keepOpen) {
      setPracticeTarget(null)
    }
  }, [practiceTarget, progress, pyqCounts])

  // Find next sequential topic in syllabus (regardless of state — it will unlock after completion)
  const findNextTopic = useCallback((currentTopicId: string | undefined): { topic: LearningTopic; subject: LearningSubject } | null => {
    if (!currentTopicId) return null
    let passedCurrent = false
    for (const subject of UPSC_SYLLABUS) {
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          if (topic.id === currentTopicId) { passedCurrent = true; continue }
          if (passedCurrent) {
            return { topic, subject }
          }
        }
      }
    }
    return null
  }, [])

  // Find and open the next topic after practice.
  //
  // Two distinct outcomes:
  //
  //   A. Topic-complete celebration overlay
  //      Fires only when the user just finished the LAST available
  //      question for the current topic this round (the
  //      `justCompletedTopicRef` was armed by handlePracticeComplete).
  //      The overlay congratulates them and then routes them into the
  //      next topic's notes via handleCelebrationDismiss.
  //
  //   B. Direct navigation to the next topic's notes
  //      Default for every other call. Closes the practice sheet, marks
  //      the next topic as 'started' (so it shows up in today's read
  //      count), and immediately opens its TopicDetailSheet — which is
  //      "the note" the CTA label refers to. No animation, no path-tab
  //      detour, no glow. The user picked "Continue to <next>"; we just
  //      take them there.
  const handleNextTopic = useCallback(() => {
    const completedTitle = practiceTarget?.topic.title || 'Topic'
    const currentTopicId = practiceTarget?.topic.id
    const subjectColor = practiceTarget?.subject.color || '#6366f1'

    // Read + clear the completion flag synchronously. One-shot: even if
    // the user re-enters and finishes another round on the same topic
    // later (a no-op for completion), we won't fire the overlay twice.
    const isFullyCompleted =
      !!currentTopicId && justCompletedTopicRef.current === currentTopicId
    justCompletedTopicRef.current = null

    // Close the practice sheet first — both branches need it gone.
    setPracticeTarget(null)

    const next = findNextTopic(currentTopicId)

    // No next topic at all (end of syllabus) — bounce back to the path.
    if (!next) {
      setActiveTab('path')
      return
    }

    if (isFullyCompleted) {
      // ── Branch A: celebration overlay ────────────────────────────────
      setCelebrationData({
        completedTopicTitle: completedTitle,
        nextTopicTitle: next.topic.title,
        nextTopicIcon: next.topic.icon,
        subjectColor,
        nextTopic: next.topic,
        nextSubject: next.subject,
      })
      setNewlyUnlockedId(next.topic.id)
      return
    }

    // ── Branch B: direct navigation to the next topic's notes ───────
    // Mark the next topic as 'started' if it isn't already, so today's
    // read counter ticks up the same way it would if the user opened
    // the topic from the syllabus path. Functional update so we read
    // the latest progress at commit time, not the closure snapshot.
    setProgress(prev => {
      const existing = prev.topics[next.topic.id]
      const alreadyOpened = existing && (existing.state === 'started' || existing.state === 'completed')
      if (alreadyOpened) return prev
      return {
        ...prev,
        topics: {
          ...prev.topics,
          [next.topic.id]: {
            ...(existing || DEFAULT_TOPIC_PROGRESS),
            state: 'started' as const,
          },
        },
        todayTopicsRead: (prev.todayTopicsRead || 0) + 1,
      }
    })
    // Open the next topic's notes — exactly what the CTA label promises.
    setDetailTarget({ topic: next.topic, subject: next.subject })
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
      // Mark as started (use functional update to read latest state)
      setProgress(prev => {
        const existing = prev.topics[data.nextTopic.id]
        const currentState = existing?.state
        if (currentState === 'available' || currentState === 'locked' || !currentState) {
          return {
            ...prev,
            topics: {
              ...prev.topics,
              [data.nextTopic.id]: {
                ...(existing || DEFAULT_TOPIC_PROGRESS),
                state: 'started' as const,
              },
            },
            todayTopicsRead: (prev.todayTopicsRead || 0) + 1,
          }
        }
        return prev
      })

      // Open detail sheet for the next topic
      setDetailTarget({ topic: data.nextTopic, subject: data.nextSubject })

      // Clear newly unlocked after animation has played
      setTimeout(() => setNewlyUnlockedId(null), 3000)
    }, 800)
  }, [celebrationData])

  const handleHeartLost = useCallback(() => {
    setProgress(prev => {
      // Pro users have unlimited hearts — never decrement.
      if (prev.isPro) return prev
      return {
        ...prev,
        hearts: Math.max(0, prev.hearts - 1),
        heartsLastRefill: prev.hearts >= MAX_HEARTS ? new Date().toISOString() : (prev.heartsLastRefill || new Date().toISOString()),
      }
    })
  }, [])

  // Called by PracticeSheet when the user taps "Restart All Questions" on
  // the topic-complete celebration. Wipes seenQuestionIds for that topic so
  // the entire DB pool becomes available again.
  const handleResetTopicSeenIds = useCallback((topicId: string) => {
    setProgress(prev => {
      const existing = prev.topics[topicId]
      if (!existing) return prev
      return {
        ...prev,
        topics: {
          ...prev.topics,
          [topicId]: { ...existing, seenQuestionIds: [] },
        },
      }
    })
  }, [])

  const handleUpgradePro = useCallback(() => {
    // Activate Pro immediately. The ProPaywall component shows its own
    // success state and self-dismisses after ~1.6s, so we do NOT clear
    // paywallReason here. We mark didUpgradeInPaywall so handlePaywallDismiss
    // can decide whether to auto-resume the screen the user was on.
    setProgress(prev => ({ ...prev, isPro: true, hearts: MAX_HEARTS }))
    setDidUpgradeInPaywall(true)
  }, [])

  // Called when the ProPaywall fully dismisses (either after a successful
  // upgrade or after the user tapped "Maybe Later" / dragged it away). If the
  // user upgraded, we put them right back into whatever they were trying to
  // do — opening the blocked topic, or letting them keep practicing.
  const handlePaywallDismiss = useCallback(() => {
    const reason = paywallReason
    const pending = pendingTopicTarget
    const upgraded = didUpgradeInPaywall

    setPaywallReason(null)
    setPendingTopicTarget(null)
    setDidUpgradeInPaywall(false)

    if (!upgraded) return

    if (reason === 'topics' && pending) {
      // Mark the topic as started (it was blocked before, so it's certainly
      // not in `started`/`completed`) and open the appropriate sheet.
      setProgress(prev => {
        const existing = prev.topics[pending.topic.id]
        const alreadyOpened = existing && (existing.state === 'started' || existing.state === 'completed')
        if (alreadyOpened) return prev
        return {
          ...prev,
          topics: {
            ...prev.topics,
            [pending.topic.id]: {
              ...(existing || DEFAULT_TOPIC_PROGRESS),
              state: 'started' as const,
            },
          },
          todayTopicsRead: (prev.todayTopicsRead || 0) + 1,
        }
      })

      if (pending.intent === 'practice') {
        setDetailTarget(null)
        setPracticeTarget({ topic: pending.topic, subject: pending.subject })
      } else {
        setDetailTarget({ topic: pending.topic, subject: pending.subject })
      }
    }
    // For reason === 'hearts': the PracticeSheet was already mounted behind
    // the paywall and stays mounted. Its internal `isPro`/`hearts` sync
    // effect will lift the No-Hearts screen automatically.
  }, [paywallReason, pendingTopicTarget, didUpgradeInPaywall])

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
    setActiveTab('home')
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

  const closeDetail = useCallback(() => setDetailTarget(null), [])
  const closePractice = useCallback(() => setPracticeTarget(null), [])
  const closeCelebration = useCallback(() => setCelebrationData(null), [])
  const closeGoalCelebration = useCallback(() => setGoalCelebrationOpen(false), [])

  return {
    progress, setProgress, profile, setProfile, mounted, showOnboarding, setShowOnboarding,
    activeTab, setActiveTab, tabTransition, setTabTransition,
    topicStates, enrichedTopicStates, continueTarget, pyqCounts, setPyqCounts, dailyTip, setDailyTip,
    hearts,
    detailTarget, setDetailTarget, practiceTarget, setPracticeTarget, goalModalOpen, setGoalModalOpen,
    celebrationData, setCelebrationData, goalCelebrationOpen, setGoalCelebrationOpen, achievementQueue, setAchievementQueue,
    activeSubjectId, setActiveSubjectId, newlyUnlockedId, setNewlyUnlockedId,
    paywallReason, setPaywallReason, pendingTopicTarget, setPendingTopicTarget, didUpgradeInPaywall, setDidUpgradeInPaywall,
    handleNodeTap, handleStartPractice, handlePracticeComplete,
    handleDetailStartPractice, handleOpenMap, handleAchievementDone,
    handleOnboardingComplete, handleProfileUpdate, handleResetJourney,
    handleTabChange, handleGoalTierChange, handleNextTopic, handleCelebrationDismiss,
    handleHeartLost, handleResetTopicSeenIds, handleUpgradePro, handlePaywallDismiss,
    findNextTopic,
    closeDetail, closePractice, closeCelebration, closeGoalCelebration,
    goalCelebrationSnapshotRef,
  }
}
