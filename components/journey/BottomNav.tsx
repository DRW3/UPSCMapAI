'use client'

import { useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'learn' | 'practice' | 'map' | 'profile'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  accentColor: string
}

// ── Inline SVG Icons ───────────────────────────────────────────────────────────

function BookIcon({ active, color }: { active: boolean; color: string }) {
  const fill = active ? color : 'rgba(255,255,255,0.35)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Open book with path/road motif */}
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H12v-2H6.5A2.5 2.5 0 014 17.5V6a2 2 0 012-2h5v11l-2.5-1.5L6 15V4h6v13h6a2 2 0 002-2V6a2 2 0 00-2-2h-5v11l2.5-1.5L18 15V4h-6"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Simplified path icon */}
      <path
        d="M3 19h18"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 4v12.5"
        stroke={fill}
        strokeWidth="0"
      />
      {/* Book shape */}
      <rect x="3" y="3" width="18" height="15" rx="2" fill="none" stroke={fill} strokeWidth="1.5" />
      <line x1="12" y1="3" x2="12" y2="18" stroke={fill} strokeWidth="1.5" />
      {/* Page lines */}
      <line x1="7" y1="7" x2="10" y2="7" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="7" y1="10" x2="10" y2="10" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="7" y1="13" x2="9" y2="13" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="14" y1="7" x2="17" y2="7" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="14" y1="10" x2="17" y2="10" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Bottom bar */}
      <path d="M3 18h18v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1z" fill={fill} opacity="0.15" />
    </svg>
  )
}

function DumbbellIcon({ active, color }: { active: boolean; color: string }) {
  const fill = active ? color : 'rgba(255,255,255,0.35)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Dumbbell / strength icon */}
      <rect x="3" y="9" width="3" height="6" rx="1" fill={fill} opacity={active ? 1 : 0.6} />
      <rect x="18" y="9" width="3" height="6" rx="1" fill={fill} opacity={active ? 1 : 0.6} />
      <rect x="6" y="7" width="3" height="10" rx="1.5" fill={fill} opacity={active ? 0.85 : 0.45} />
      <rect x="15" y="7" width="3" height="10" rx="1.5" fill={fill} opacity={active ? 0.85 : 0.45} />
      <rect x="9" y="10.5" width="6" height="3" rx="1" fill={fill} opacity={active ? 0.7 : 0.35} />
      {/* Sparkle for active */}
      {active && (
        <>
          <circle cx="12" cy="5" r="1" fill={fill} opacity="0.5" />
          <circle cx="9" cy="6" r="0.5" fill={fill} opacity="0.3" />
          <circle cx="15" cy="6" r="0.5" fill={fill} opacity="0.3" />
        </>
      )}
    </svg>
  )
}

function GlobeIcon({ active, color }: { active: boolean; color: string }) {
  const fill = active ? color : 'rgba(255,255,255,0.35)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Globe */}
      <circle cx="12" cy="12" r="9" fill="none" stroke={fill} strokeWidth="1.5" />
      {/* Horizontal lines */}
      <ellipse cx="12" cy="12" rx="9" ry="3.5" fill="none" stroke={fill} strokeWidth="1" opacity="0.5" />
      <ellipse cx="12" cy="12" rx="9" ry="7" fill="none" stroke={fill} strokeWidth="0" />
      {/* Vertical meridian */}
      <ellipse cx="12" cy="12" rx="3.5" ry="9" fill="none" stroke={fill} strokeWidth="1" opacity="0.5" />
      {/* Equator */}
      <line x1="3" y1="12" x2="21" y2="12" stroke={fill} strokeWidth="0.75" opacity="0.3" />
      {/* Continent hint shapes */}
      <path d="M8 7c1-1 3-1 4 0s2 2 1 3-3 1-4 0-2-2-1-3z" fill={fill} opacity="0.2" />
      <path d="M13 14c1 0 2 1 2 2s-1 2-2 1-1-2 0-3z" fill={fill} opacity="0.15" />
      {/* Map pin for active state */}
      {active && (
        <g>
          <path d="M15 8a2 2 0 11-4 0 2 2 0 014 0z" fill={fill} opacity="0.6" />
          <path d="M13 10l-1 3" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        </g>
      )}
    </svg>
  )
}

function PersonIcon({ active, color }: { active: boolean; color: string }) {
  const fill = active ? color : 'rgba(255,255,255,0.35)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Head */}
      <circle cx="12" cy="8" r="3.5" fill="none" stroke={fill} strokeWidth="1.5" />
      {active && <circle cx="12" cy="8" r="3.5" fill={fill} opacity="0.15" />}
      {/* Body */}
      <path
        d="M5.5 20c0-3.5 2.9-6.5 6.5-6.5s6.5 3 6.5 6.5"
        fill="none"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {active && (
        <path
          d="M5.5 20c0-3.5 2.9-6.5 6.5-6.5s6.5 3 6.5 6.5"
          fill={fill}
          opacity="0.1"
        />
      )}
    </svg>
  )
}

// ── Tab Config ─────────────────────────────────────────────────────────────────

const TABS: Array<{ id: TabId; label: string; Icon: typeof BookIcon }> = [
  { id: 'learn', label: 'Learn', Icon: BookIcon },
  { id: 'practice', label: 'Practice', Icon: DumbbellIcon },
  { id: 'map', label: 'Map', Icon: GlobeIcon },
  { id: 'profile', label: 'Profile', Icon: PersonIcon },
]

// ── Tab Button ─────────────────────────────────────────────────────────────────

function NavTab({
  label,
  Icon,
  active,
  accentColor,
  onTap,
}: {
  id: TabId
  label: string
  Icon: typeof BookIcon
  active: boolean
  accentColor: string
  onTap: () => void
}) {
  const [bounce, setBounce] = useState(false)

  const handleTap = () => {
    if (!active) {
      setBounce(true)
      setTimeout(() => setBounce(false), 400)
    }
    onTap()
  }

  return (
    <button
      onClick={handleTap}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 relative"
      style={{
        transform: bounce ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Active indicator dot */}
      {active && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
          style={{
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}80`,
          }}
        />
      )}

      {/* Icon with glow */}
      <div
        style={{
          filter: active ? `drop-shadow(0 0 6px ${accentColor}50)` : 'none',
          transition: 'filter 0.2s ease',
        }}
      >
        <Icon active={active} color={accentColor} />
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-semibold leading-tight transition-all duration-200"
        style={{
          color: active ? accentColor : 'rgba(255,255,255,0.25)',
          opacity: active ? 1 : 0.8,
          transform: active ? 'translateY(0)' : 'translateY(0)',
        }}
      >
        {label}
      </span>
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BottomNav({ activeTab, onTabChange, accentColor }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(8,8,16,0.98)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Tab Row */}
      <div
        className="flex items-center justify-around"
        style={{ height: 64 }}
      >
        {TABS.map(tab => (
          <NavTab
            key={tab.id}
            id={tab.id}
            label={tab.label}
            Icon={tab.Icon}
            active={activeTab === tab.id}
            accentColor={accentColor}
            onTap={() => onTabChange(tab.id)}
          />
        ))}
      </div>

      {/* Safe area spacer (for devices with home indicator) */}
      <div
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(8,8,16,0.98)',
        }}
      />
    </div>
  )
}
