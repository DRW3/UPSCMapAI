'use client'

import { UPSC_SYLLABUS } from '@/data/syllabus'
import {
  DEFAULT_TOPIC_PROGRESS,
} from '@/components/journey/types'
import JourneyPath from '@/components/journey/JourneyPath'
import PracticeSheet from '@/components/journey/PracticeSheet'
import HomeTab from '@/components/journey/HomeTab'
// Live tab disabled — re-enable by uncommenting this import, the tab-bar
// entry, and the render branch below. The component file and the
// /api/news/hindu-today route are still in the repo, untouched.
// import LiveTab from '@/components/journey/LiveTab'
import TopicDetailSheet from '@/components/journey/TopicDetailSheet'
import ProfileTab from '@/components/journey/ProfileTab'
import DailyGoalModal from '@/components/journey/DailyGoalModal'
import DailyGoalCelebration from '@/components/journey/DailyGoalCelebration'
import AchievementToast from '@/components/journey/AchievementToast'
import OnboardingFlow from '@/components/journey/OnboardingFlow'
import CelebrationOverlay from '@/components/journey/CelebrationOverlay'
import ProPaywall from '@/components/journey/ProPaywall'
import { useJourneyState, type TabId } from './hooks/useJourneyState'

// ── Main Component ────────────────────────────────────────────────────────────

export function MobileLearningJourney() {
  const s = useJourneyState()
  const {
    progress, profile, mounted, showOnboarding,
    activeTab, setActiveTab, tabTransition, setTabTransition,
    topicStates, enrichedTopicStates, continueTarget, pyqCounts, dailyTip,
    hearts,
    detailTarget, setDetailTarget, practiceTarget, setPracticeTarget, goalModalOpen, setGoalModalOpen,
    celebrationData, goalCelebrationOpen, setGoalCelebrationOpen, achievementQueue,
    activeSubjectId, setActiveSubjectId, newlyUnlockedId,
    paywallReason, setPaywallReason, setPendingTopicTarget,
    handleNodeTap, handlePracticeComplete,
    handleDetailStartPractice, handleOpenMap, handleAchievementDone,
    handleOnboardingComplete, handleProfileUpdate, handleResetJourney,
    handleTabChange, handleGoalTierChange, handleNextTopic, handleCelebrationDismiss,
    handleHeartLost, handleResetTopicSeenIds, handleUpgradePro, handlePaywallDismiss,
    findNextTopic,
    goalCelebrationSnapshotRef,
  } = s
  void s

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

            {/* Profile */}
            <button
              onClick={() => handleTabChange(activeTab === 'profile' ? 'home' : 'profile')}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: activeTab === 'profile'
                  ? 'rgba(99,102,241,0.25)'
                  : 'rgba(255,255,255,0.06)',
                border: activeTab === 'profile'
                  ? '1.5px solid rgba(99,102,241,0.5)'
                  : '1.5px solid rgba(255,255,255,0.10)',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                padding: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {profile?.name ? (
                <span style={{
                  fontSize: 13, fontWeight: 700, lineHeight: 1,
                  color: activeTab === 'profile' ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                }}>
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={activeTab === 'profile' ? '#a5b4fc' : 'rgba(255,255,255,0.5)'}
                  strokeWidth="2" strokeLinecap="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
          </div>

          {/* Row 2: Segmented tab control */}
          <div style={{
            height: 44,
            background: 'rgba(8,8,18,0.80)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center',
            padding: 4,
            gap: 4,
          }}>
            {([
              { id: 'home' as TabId, label: 'Today', icon: '📋' },
              // { id: 'live' as TabId, label: 'Live', icon: '📰' }, // disabled — see import comment above
              { id: 'path' as TabId, label: 'Syllabus', icon: '📍' },
            ]).map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 10,
                    border: isActive ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontSize: 13, fontWeight: isActive ? 700 : 600,
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.14))'
                      : 'transparent',
                    color: isActive ? '#c7d2fe' : 'rgba(255,255,255,0.40)',
                    transition: 'all 250ms cubic-bezier(0.22,1,0.36,1)',
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: isActive
                      ? '0 2px 12px rgba(99,102,241,0.20), inset 0 1px 0 rgba(255,255,255,0.06)'
                      : 'none',
                    letterSpacing: isActive ? '0.01em' : '0',
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginTop: 'calc(env(safe-area-inset-top, 0px) + 110px)',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        opacity: tabTransition ? 0 : 1,
        transform: tabTransition ? 'scale(0.97) translateY(8px)' : 'scale(1) translateY(0)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}>
        {activeTab === 'home' && (
          <div data-home-scroll="1" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <HomeTab
              progress={progress}
              subjects={UPSC_SYLLABUS}
              topicStates={enrichedTopicStates}
              onTopicTap={handleNodeTap}
              onNavigateToPath={(focusSubjectId) => {
                setTabTransition(true)
                setTimeout(() => {
                  if (focusSubjectId) setActiveSubjectId(focusSubjectId)
                  setActiveTab('path')
                  setTimeout(() => setTabTransition(false), 50)
                }, 300)
              }}
              profile={profile}
              dailyTip={dailyTip}
              continueTarget={continueTarget}
              onChangeGoal={() => setGoalModalOpen(true)}
              onProfileUpdate={handleProfileUpdate}
            />
          </div>
        )}

        {/* Live tab disabled — re-enable by uncommenting the import,
            tab-bar entry, and this render branch:
            {activeTab === 'live' && <LiveTab />}
        */}

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
              isPro={progress.isPro}
              freeTopicIds={progress.freeTopicsOpened}
              pyqCounts={pyqCounts}
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
          dbQuestionCount={pyqCounts[detailTarget.topic.id] || 0}
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
          isPro={progress.isPro}
          seenQuestionIds={topicStates[practiceTarget.topic.id]?.seenQuestionIds || []}
          wrongQuestionIds={topicStates[practiceTarget.topic.id]?.wrongQuestionIds || []}
          topicDbCount={pyqCounts[practiceTarget.topic.id] || 0}
          onResetSeenIds={handleResetTopicSeenIds}
          onClose={() => setPracticeTarget(null)}
          onComplete={handlePracticeComplete}
          onHeartLost={handleHeartLost}
          onNextTopic={handleNextTopic}
          nextTopicName={findNextTopic(practiceTarget.topic.id)?.topic.title}
          onUpgradePro={() => {
            // Remember which topic the user was practicing so we don't lose
            // their place when the paywall closes.
            setPendingTopicTarget({
              topic: practiceTarget.topic,
              subject: practiceTarget.subject,
              intent: 'practice',
            })
            setPaywallReason('hearts')
          }}
          onReviseNotes={() => {
            // Close practice and open topic notes for the same topic
            const t = practiceTarget
            setPracticeTarget(null)
            setTimeout(() => setDetailTarget({ topic: t.topic, subject: t.subject }), 200)
          }}
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

      {/* PadhAI Pro Paywall */}
      {paywallReason && (
        <ProPaywall
          reason={paywallReason}
          onDismiss={handlePaywallDismiss}
          onUpgrade={handleUpgradePro}
        />
      )}

      {/* Daily-goal completion celebration — fires once per day on the
          rising edge from "goal not met" to "goal met". */}
      {goalCelebrationOpen && goalCelebrationSnapshotRef.current && (
        <DailyGoalCelebration
          streakDays={goalCelebrationSnapshotRef.current.streak}
          topicsRead={goalCelebrationSnapshotRef.current.topicsRead}
          practiceDone={goalCelebrationSnapshotRef.current.practiceDone}
          readTarget={goalCelebrationSnapshotRef.current.readTarget}
          practiceTarget={goalCelebrationSnapshotRef.current.practiceTarget}
          firstName={profile?.name?.split(' ')[0] || null}
          onDismiss={() => setGoalCelebrationOpen(false)}
        />
      )}

    </div>
  )
}
