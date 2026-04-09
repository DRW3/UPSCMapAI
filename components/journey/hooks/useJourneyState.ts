'use client'

import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import type { JourneyProgress, NodeState, UserProfile } from '@/components/journey/types'

export interface EnrichedTopicEntry {
  state: NodeState
  topic: LearningTopic
  subject: LearningSubject
}

export type TabId = 'home' | 'path' | 'practice' | 'profile'

export interface JourneyStateValue {
  // ── Persistent state ─────────────────────────────────────────
  progress: JourneyProgress
  profile: UserProfile | null
  mounted: boolean
  showOnboarding: boolean

  // ── UI state ─────────────────────────────────────────────────
  activeTab: TabId
  setActiveTab: (id: TabId) => void
  tabTransition: boolean

  // ── Derived state (memoized) ─────────────────────────────────
  enrichedTopicStates: Record<string, EnrichedTopicEntry>
  continueTarget: EnrichedTopicEntry | null
  pyqCounts: Record<string, number>
  dailyTip: string | null

  // ── Modal / overlay queue ────────────────────────────────────
  detailTarget: { topic: LearningTopic; subject: LearningSubject } | null
  practiceTarget: { topic: LearningTopic; subject: LearningSubject } | null
  goalModalOpen: boolean
  setGoalModalOpen: (open: boolean) => void
  topicCompleteOverlay: { topic: LearningTopic; subject: LearningSubject; nextEntry: EnrichedTopicEntry | null } | null
  goalCelebrationOverlay: boolean

  // ── Map / journey navigation ─────────────────────────────────
  activeSubjectId: string | null
  setActiveSubjectId: (id: string | null) => void
  newlyUnlockedId: string | null

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
  closeTopicCompleteOverlay: () => void
  closeGoalCelebration: () => void
}

export function useJourneyState(): JourneyStateValue {
  throw new Error('useJourneyState: not yet implemented (phase 2.3)')
}
