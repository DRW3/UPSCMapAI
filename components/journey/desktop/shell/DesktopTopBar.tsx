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
  const totalCorrect = Object.values(progress.topics).reduce((s, t) => s + (t.correctAnswers || 0), 0)
  const acc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
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
      {/* LEFT — brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Brand orb */}
        <div style={{
          position: 'relative',
          width: 36, height: 36,
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
      </div>

      {/* CENTER — search bar (flex: 1, centered) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
        <div
          onClick={onOpenCommandPalette}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenCommandPalette() } }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%',
            maxWidth: 520,
            padding: '9px 16px',
            borderRadius: 14,
            background: 'rgba(167,139,250,0.06)',
            border: '1.5px solid rgba(167,139,250,0.25)',
            cursor: 'text',
            transition: 'all 200ms',
          }}
          aria-label="Search topics and subjects"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span style={{
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.35)',
            flex: 1,
          }}>
            Search topics, subjects...
          </span>
        </div>
      </div>

      {/* RIGHT — stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Streak — always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px',
          borderRadius: 10,
          background: (progress.streak || 0) > 0 ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.04)',
          border: (progress.streak || 0) > 0 ? '1px solid rgba(249,115,22,0.30)' : '1px solid rgba(255,255,255,0.08)',
          color: (progress.streak || 0) > 0 ? '#fb923c' : 'rgba(255,255,255,0.40)',
          fontSize: 12, fontWeight: 800,
        }}>
          🔥 {progress.streak || 0}
        </div>

        {/* Accuracy */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(52,211,153,0.10)',
          border: '1px solid rgba(52,211,153,0.30)',
          color: '#6ee7b7',
          fontSize: 12, fontWeight: 800,
        }}>
          {acc}%
        </div>

        {/* Questions answered */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(103,232,249,0.10)',
          border: '1px solid rgba(103,232,249,0.30)',
          color: '#67e8f9',
          fontSize: 12, fontWeight: 800,
        }}>
          {totalAnswered} Qs
        </div>

        {/* Level */}
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

        {/* Profile button — navigates to profile tab */}
        <button
          onClick={() => state.setActiveTab('profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginLeft: 10,
            padding: '5px 12px 5px 6px',
            borderRadius: 999,
            background: state.activeTab === 'profile' ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)',
            border: state.activeTab === 'profile' ? '1px solid rgba(167,139,250,0.30)' : '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          {/* Avatar circle */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
          }}>
            {(firstName || 'U').charAt(0).toUpperCase()}
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: state.activeTab === 'profile' ? '#c4b5fd' : 'rgba(255,255,255,0.65)',
          }}>
            {firstName || 'Profile'}
          </span>
        </button>
      </div>
    </div>
  )
}
