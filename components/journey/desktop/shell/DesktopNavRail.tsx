// components/journey/desktop/shell/DesktopNavRail.tsx
'use client'

import Link from 'next/link'
import type { JourneyStateValue, TabId } from '@/components/journey/hooks/useJourneyState'

interface NavItem {
  id: TabId | 'map'
  label: string
  hint: string
  icon: string
  color: string
}

// Profile is accessed from the top-right avatar button in DesktopTopBar,
// NOT from this nav rail. Removed per user request.
const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Today',    hint: 'Mentor & next step',    icon: '🏠', color: '#a78bfa' },
  { id: 'path',     label: 'Syllabus', hint: '280+ topics',           icon: '🪜', color: '#67e8f9' },
  { id: 'practice', label: 'Practice', hint: '3000+ PYQs',            icon: '🎯', color: '#fb923c' },
  { id: 'map',      label: 'Maps',     hint: 'Interactive maps',      icon: '🗺️', color: '#34d399' },
]

interface Props {
  state: JourneyStateValue
}

export function DesktopNavRail({ state }: Props) {
  const { activeTab, setActiveTab } = state
  return (
    <nav
      style={{
        height: '100%',
        padding: '24px 16px',
        borderRight: '1px solid rgba(167,139,250,0.08)',
        background: 'rgba(5,5,16,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{
        fontSize: 9, fontWeight: 800,
        color: 'rgba(167,139,250,0.55)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 12, paddingLeft: 12,
      }}>
        Workspace
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => {
          const active = item.id !== 'map' && item.id === activeTab
          const rgb = hexToRgb(item.color)
          // Map nav item is a Link to /map; the rest are buttons that switch tabs.
          if (item.id === 'map') {
            return (
              <Link
                key={item.id}
                href="/map"
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 12px',
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'rgba(255,255,255,0.62)',
                  fontSize: 13, fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                  position: 'relative',
                  width: '100%',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ lineHeight: 1.15 }}>{item.label}</div>
                  <div style={{
                    fontSize: 10, fontWeight: 500,
                    color: 'rgba(255,255,255,0.32)',
                    marginTop: 1,
                  }}>{item.hint}</div>
                </div>
              </Link>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as TabId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 12px',
                borderRadius: 12,
                background: active ? `rgba(${rgb},0.12)` : 'transparent',
                border: active ? `1px solid rgba(${rgb},0.30)` : '1px solid transparent',
                color: active ? item.color : 'rgba(255,255,255,0.62)',
                fontSize: 13, fontWeight: active ? 750 : 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                position: 'relative',
                width: '100%',
                boxShadow: active ? `0 0 14px rgba(${rgb},0.18)` : 'none',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)',
                  width: 4, height: 24, borderRadius: '0 4px 4px 0',
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}`,
                }} />
              )}
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ lineHeight: 1.15 }}>{item.label}</div>
                <div style={{
                  fontSize: 10, fontWeight: 500,
                  color: active ? `rgba(${rgb},0.65)` : 'rgba(255,255,255,0.32)',
                  marginTop: 1,
                }}>{item.hint}</div>
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}
