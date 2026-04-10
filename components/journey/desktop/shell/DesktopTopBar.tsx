// components/journey/desktop/shell/DesktopTopBar.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

interface Props {
  state: JourneyStateValue
  onOpenCommandPalette: () => void
}

export function DesktopTopBar({ state, onOpenCommandPalette }: Props) {
  const { profile, progress } = state
  const firstName = profile?.name?.split(' ')[0] ?? ''
  const totalAnswered = Object.values(progress.topics).reduce((s, t) => s + (t.questionsAnswered || 0), 0)
  const level = Math.floor(totalAnswered / 50) + 1

  return (
    <div
      style={{
        height: 56,
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid rgba(167,139,250,0.10)',
        background: 'rgba(5,5,16,0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Brand orb */}
      <div style={{
        position: 'relative',
        width: 36, height: 36,
        marginRight: 12,
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
          animation: 'dj-rotate 10s linear infinite',
          padding: 1.5,
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 11,
            background: '#050510',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900, fontSize: 14,
            }}>P</span>
          </div>
        </div>
      </div>

      {/* Brand label */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
          PadhAI UPSC
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Cmd-K command palette opener */}
      <button
        onClick={onOpenCommandPalette}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.20)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11, fontWeight: 600,
          marginRight: 14,
          cursor: 'pointer',
          transition: 'all 200ms',
        }}
        aria-label="Open command palette (Cmd+K)"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M7 2L2 7l5 5M14 7H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Search
        <kbd style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'ui-monospace, monospace',
        }}>⌘K</kbd>
      </button>

      {/* Stats */}
      {(progress.streak || 0) > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(249,115,22,0.10)',
          border: '1px solid rgba(249,115,22,0.30)',
          color: '#fb923c',
          fontSize: 12, fontWeight: 800,
          marginRight: 8,
        }}>
          🔥 {progress.streak}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 12px',
        borderRadius: 10,
        background: 'rgba(99,102,241,0.10)',
        border: '1px solid rgba(99,102,241,0.30)',
        color: '#a5b4fc',
        fontSize: 12, fontWeight: 800,
      }}>
        ⚡ Lv {level}
      </div>

      {firstName && (
        <div style={{
          marginLeft: 14,
          fontSize: 12, fontWeight: 700,
          color: 'rgba(255,255,255,0.65)',
        }}>
          Hi, {firstName}
        </div>
      )}
    </div>
  )
}
