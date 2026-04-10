// components/journey/desktop/shell/DesktopShell.tsx
'use client'

import type { ReactNode } from 'react'
import { DESKTOP_KEYFRAMES } from '@/components/journey/desktop/chrome/desktopKeyframes'
import { DesktopBackground } from './DesktopBackground'

interface DesktopShellProps {
  topBar: ReactNode
  navRail: ReactNode
  centerPane: ReactNode
  mentorDock: ReactNode
  statusBar: ReactNode
  /** Optional right-side overlay panel (e.g. topic notes) */
  overlayPanel?: ReactNode
  /** When true, collapses the right mentor dock column to 0 (for Today tab inline layout) */
  hideMentorDock?: boolean
}

/**
 * 12-column grid frame for the desktop journey + map.
 *
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │                       Top bar                            │ 56px
 *   ├────────┬─────────────────────────────────┬───────────────┤
 *   │  Nav   │         Center pane             │  Mentor dock  │ flex-1
 *   │  rail  │                                 │               │
 *   │  240px │       (active tab)              │     320px     │
 *   ├────────┴─────────────────────────────────┴───────────────┤
 *   │                       Status bar                         │ 32px
 *   └──────────────────────────────────────────────────────────┘
 *
 * Above the grid:
 *   - DesktopBackground (z-index 0, fixed inset 0)
 * Above the grid content (when present):
 *   - overlayPanel (z-index 30, slides in from right)
 */
export function DesktopShell({
  topBar, navRail, centerPane, mentorDock, statusBar, overlayPanel, hideMentorDock,
}: DesktopShellProps) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: 'inherit',
      }}
    >
      <style>{DESKTOP_KEYFRAMES}</style>
      <DesktopBackground />

      {/* Grid frame */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: hideMentorDock ? '240px minmax(0, 1fr) 0px' : '240px minmax(0, 1fr) 320px',
          gridTemplateRows: '56px minmax(0, 1fr) 32px',
          gridTemplateAreas: `
            "top    top     top"
            "nav    center  mentor"
            "status status  status"
          `,
          minHeight: '100vh',
          gap: 0,
          transition: 'grid-template-columns 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ gridArea: 'top' }}>{topBar}</div>
        <div style={{ gridArea: 'nav', overflowY: 'auto' }}>{navRail}</div>
        <div data-desktop-center-scroll="1" style={{ gridArea: 'center', overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px' }}>
          {centerPane}
        </div>
        <div style={{
          gridArea: 'mentor',
          overflowY: hideMentorDock ? 'hidden' : 'auto',
          width: hideMentorDock ? 0 : undefined,
          padding: hideMentorDock ? 0 : undefined,
          opacity: hideMentorDock ? 0 : 1,
          borderLeft: hideMentorDock ? 'none' : undefined,
          overflow: hideMentorDock ? 'hidden' : undefined,
          transition: 'width 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease, padding 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {mentorDock}
        </div>
        <div style={{ gridArea: 'status' }}>{statusBar}</div>
      </div>

      {overlayPanel}
    </div>
  )
}
