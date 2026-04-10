'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useJourneyState } from '@/components/journey/hooks/useJourneyState'
import { DEFAULT_TOPIC_PROGRESS } from '@/components/journey/types'
import { DesktopShell } from './shell/DesktopShell'
import { DesktopTopBar } from './shell/DesktopTopBar'
import { DesktopNavRail } from './shell/DesktopNavRail'
import { DesktopMentorDock } from './shell/DesktopMentorDock'
import { DesktopStatusBar } from './shell/DesktopStatusBar'
import { DesktopTodayPane } from './panes/DesktopTodayPane'
import { DesktopPathPane } from './panes/DesktopPathPane'
import { DesktopPracticePane } from './panes/DesktopPracticePane'
import { DesktopProfilePane } from './panes/DesktopProfilePane'
import CommandPalette from './chrome/CommandPalette'

const PracticeSheet = dynamic(
  () => import('@/components/journey/PracticeSheet').then(m => ({ default: m.default })),
  { ssr: false }
)

const TopicDetailSheet = dynamic(
  () => import('@/components/journey/TopicDetailSheet'),
  { ssr: false }
)

export function DesktopLearningJourney() {
  const state = useJourneyState()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ── Global Cmd+K / Ctrl+K shortcut ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Tab number shortcuts (1/2/3/4) ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input, textarea, [contenteditable]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '1') { e.preventDefault(); state.setActiveTab('home') }
      if (e.key === '2') { e.preventDefault(); state.setActiveTab('path') }
      if (e.key === '3') { e.preventDefault(); state.setActiveTab('practice') }
      if (e.key === '4') { e.preventDefault(); state.setActiveTab('profile') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state])

  // Phase 3 placeholder — center pane shows the active tab name only.
  // Phases 4-7 replace this with real DesktopTodayPane / DesktopPathPane / etc.
  const placeholderPane = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%',
      fontSize: 14, fontWeight: 700,
      color: 'rgba(255,255,255,0.40)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {state.activeTab} pane — coming in phase {tabPhase(state.activeTab)}
    </div>
  )

  const rawCenterPane =
    state.activeTab === 'home' ? <DesktopTodayPane state={state} /> :
    state.activeTab === 'path' ? <DesktopPathPane state={state} /> :
    state.activeTab === 'practice' ? <DesktopPracticePane state={state} /> :
    state.activeTab === 'profile' ? <DesktopProfilePane state={state} /> :
    placeholderPane

  // Keyed so React remounts on tab switch — triggers dj-fadeUp entrance
  const centerPane = (
    <div key={state.activeTab} style={{ animation: 'dj-fadeUp 380ms cubic-bezier(0.16,1,0.3,1) both' }}>
      {rawCenterPane}
    </div>
  )

  return (
    <>
      <DesktopShell
        topBar={<DesktopTopBar state={state} onOpenCommandPalette={() => setPaletteOpen(true)} />}
        navRail={<DesktopNavRail state={state} />}
        centerPane={centerPane}
        mentorDock={<DesktopMentorDock state={state} />}
        statusBar={<DesktopStatusBar state={state} />}
      />

      {state.practiceTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(2,4,12,0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}>
          <div style={{
            width: '100%', maxWidth: 760,
            maxHeight: 'calc(100vh - 64px)',
            borderRadius: 24,
            overflow: 'hidden',
            border: '1.5px solid rgba(167,139,250,0.30)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset',
          }}>
            <PracticeSheet
              topic={state.practiceTarget.topic}
              subject={state.practiceTarget.subject}
              progress={state.progress.topics[state.practiceTarget.topic.id] || DEFAULT_TOPIC_PROGRESS}
              hearts={state.hearts}
              isPro={state.progress.isPro}
              seenQuestionIds={state.progress.topics[state.practiceTarget.topic.id]?.seenQuestionIds || []}
              wrongQuestionIds={state.progress.topics[state.practiceTarget.topic.id]?.wrongQuestionIds || []}
              topicDbCount={state.pyqCounts[state.practiceTarget.topic.id] || 0}
              onResetSeenIds={state.handleResetTopicSeenIds}
              onClose={() => state.setPracticeTarget(null)}
              onComplete={state.handlePracticeComplete}
              onHeartLost={state.handleHeartLost}
              onNextTopic={state.handleNextTopic}
              nextTopicName={state.findNextTopic(state.practiceTarget.topic.id)?.topic.title}
              onUpgradePro={() => {
                const t = state.practiceTarget!
                state.setPendingTopicTarget({
                  topic: t.topic,
                  subject: t.subject,
                  intent: 'practice',
                })
                state.setPaywallReason('hearts')
              }}
              onReviseNotes={() => {
                const t = state.practiceTarget!
                state.setPracticeTarget(null)
                setTimeout(() => state.setDetailTarget({ topic: t.topic, subject: t.subject }), 200)
              }}
            />
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        state={state}
      />

      {state.detailTarget && (
        <TopicDetailSheet
          topic={state.detailTarget.topic}
          subject={state.detailTarget.subject}
          progress={state.progress.topics[state.detailTarget.topic.id] ?? DEFAULT_TOPIC_PROGRESS}
          dbQuestionCount={state.pyqCounts[state.detailTarget.topic.id] ?? 0}
          onClose={() => state.setDetailTarget(null)}
          onStartPractice={state.handleDetailStartPractice}
          onOpenMap={state.handleOpenMap}
          profile={state.profile}
          variant="desktop"
        />
      )}
    </>
  )
}

function tabPhase(tab: string): number {
  switch (tab) {
    case 'home':     return 4
    case 'path':     return 5
    case 'practice': return 6
    case 'profile':  return 7
    default:         return 4
  }
}
