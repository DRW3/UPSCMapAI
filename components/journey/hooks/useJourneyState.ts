// components/journey/hooks/useJourneyState.ts
'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import type { JourneyProgress, NodeState, UserProfile } from '@/components/journey/types'

export interface EnrichedTopicEntry {
  state: NodeState
  topic: LearningTopic
  subject: LearningSubject
}

export type TabId = 'home' | 'path' | 'practice' | 'profile'

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
  enrichedTopicStates: Record<string, EnrichedTopicEntry>
  continueTarget: EnrichedTopicEntry | null
  pyqCounts: Record<string, number>
  setPyqCounts: Dispatch<SetStateAction<Record<string, number>>>
  dailyTip: string | null
  setDailyTip: Dispatch<SetStateAction<string | null>>

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
  handlePracticeComplete: (result: { topicId: string; correct: number; answered: number; seenIds: string[] }) => void
  handleDetailStartPractice: () => void
  handleOpenMap: (context?: string) => void
  handleAchievementDone: () => void
  handleOnboardingComplete: (profile: UserProfile) => void
  handleProfileUpdate: (profile: UserProfile) => void
  handleResetJourney: () => void
  closeDetail: () => void
  closePractice: () => void
  closeCelebration: () => void
  closeGoalCelebration: () => void
}

export function useJourneyState(): JourneyStateValue {
  throw new Error('useJourneyState: not yet implemented (phase 2.3)')
}
