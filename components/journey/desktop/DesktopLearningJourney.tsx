'use client'

import { useState } from 'react'
import { useJourneyState } from '@/components/journey/hooks/useJourneyState'
import { DesktopShell } from './shell/DesktopShell'
import { DesktopTopBar } from './shell/DesktopTopBar'
import { DesktopNavRail } from './shell/DesktopNavRail'
import { DesktopMentorDock } from './shell/DesktopMentorDock'
import { DesktopStatusBar } from './shell/DesktopStatusBar'
import { DesktopTodayPane } from './panes/DesktopTodayPane'
import { DesktopPathPane } from './panes/DesktopPathPane'

export function DesktopLearningJourney() {
  const state = useJourneyState()
  const [_paletteOpen, _setPaletteOpen] = useState(false)
  void _paletteOpen

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

  const centerPane =
    state.activeTab === 'home' ? <DesktopTodayPane state={state} /> :
    state.activeTab === 'path' ? <DesktopPathPane state={state} /> :
    placeholderPane

  return (
    <DesktopShell
      topBar={<DesktopTopBar state={state} onOpenCommandPalette={() => _setPaletteOpen(true)} />}
      navRail={<DesktopNavRail state={state} />}
      centerPane={centerPane}
      mentorDock={<DesktopMentorDock state={state} />}
      statusBar={<DesktopStatusBar state={state} />}
    />
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
