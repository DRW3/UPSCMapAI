'use client'

import { useState, useEffect } from 'react'
import { useJourneyState } from '@/components/journey/hooks/useJourneyState'
import { DesktopShell } from './shell/DesktopShell'
import { DesktopTopBar } from './shell/DesktopTopBar'
import { DesktopNavRail } from './shell/DesktopNavRail'
import { DesktopMentorDock } from './shell/DesktopMentorDock'
import { DesktopStatusBar } from './shell/DesktopStatusBar'
import { DesktopTodayPane } from './panes/DesktopTodayPane'
import { DesktopPathPane } from './panes/DesktopPathPane'
import { DesktopPracticePane } from './panes/DesktopPracticePane'
import { DesktopProfilePane } from './panes/DesktopProfilePane'
import { DesktopNotesView } from './panes/DesktopNotesView'
import { DesktopPracticeView } from './panes/DesktopPracticeView'
import CommandPalette from './chrome/CommandPalette'

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

  // Notes and Practice take over the entire center pane when active (inline, no overlay).
  // Otherwise, fall through to the active tab pane.
  // Key changes on the discriminator so React remounts and triggers dj-fadeUp.
  const paneKey =
    state.practiceTarget ? `practice-${state.practiceTarget.topic.id}` :
    state.detailTarget ? `notes-${state.detailTarget.topic.id}` :
    state.activeTab

  const rawCenterPane =
    state.practiceTarget ? <DesktopPracticeView state={state} /> :
    state.detailTarget ? <DesktopNotesView state={state} /> :
    state.activeTab === 'home' ? <DesktopTodayPane state={state} /> :
    state.activeTab === 'path' ? <DesktopPathPane state={state} /> :
    state.activeTab === 'practice' ? <DesktopPracticePane state={state} /> :
    state.activeTab === 'profile' ? <DesktopProfilePane state={state} /> :
    placeholderPane

  // Keyed so React remounts on pane switch — triggers dj-fadeUp entrance
  const centerPane = (
    <div key={paneKey} style={{ height: '100%', animation: 'dj-fadeUp 380ms cubic-bezier(0.16,1,0.3,1) both' }}>
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

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        state={state}
      />
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
