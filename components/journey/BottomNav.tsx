'use client'

import { useState } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────

export const BOTTOM_NAV_HEIGHT = 72

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'home' | 'path' | 'practice' | 'profile'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

// ── SVG Icons (20x20, stroke-based) ─────────────────────────────────────────

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10.5z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PathIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C8 2 4 6 4 10c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

function PracticeIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <path
        d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Tab Definitions ─────────────────────────────────────────────────────────

const TABS: Array<{
  id: TabId
  label: string
  Icon: React.FC<{ color: string }>
}> = [
  { id: 'home',     label: 'Home',     Icon: HomeIcon },
  { id: 'path',     label: 'Path',     Icon: PathIcon },
  { id: 'practice', label: 'Practice', Icon: PracticeIcon },
  { id: 'profile',  label: 'You',      Icon: ProfileIcon },
]

// ── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({
  tab,
  active,
  onTap,
}: {
  tab: (typeof TABS)[number]
  active: boolean
  onTap: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const { Icon } = tab
  const activeColor = '#6366f1'
  const inactiveColor = 'rgba(255,255,255,0.4)'

  return (
    <button
      onClick={() => {
        setPressed(true)
        setTimeout(() => setPressed(false), 200)
        onTap()
      }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '0 4px',
        transform: pressed ? 'scale(0.90)' : 'scale(1)',
        transition: 'transform 200ms ease',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
      }}
    >
      {/* Icon with optional glow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 999,
          boxShadow: active ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
          transition: 'box-shadow 200ms ease',
        }}
      >
        <Icon color={active ? activeColor : inactiveColor} />
      </div>

      {/* Label: only shown when active */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: activeColor,
          lineHeight: 1,
          opacity: active ? 1 : 0,
          maxHeight: active ? 12 : 0,
          overflow: 'hidden',
          transition: 'opacity 200ms ease, max-height 200ms ease',
        }}
      >
        {tab.label}
      </span>

      {/* Active dot indicator */}
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: 999,
          background: active ? 'linear-gradient(135deg, #6366f1, #a78bfa)' : 'transparent',
          boxShadow: active ? '0 0 8px rgba(99,102,241,0.6)' : 'none',
          opacity: active ? 1 : 0,
          transition: 'opacity 200ms ease',
          marginTop: 1,
        }}
      />
    </button>
  )
}

// ── BottomNav ───────────────────────────────────────────────────────────────

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[50]"
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          marginLeft: 16,
          marginRight: 16,
          marginBottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
          height: 60,
          background: 'rgba(10,10,20,0.75)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <NavItem
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onTap={() => onTabChange(tab.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Named export for backward compatibility
export { BottomNav }
