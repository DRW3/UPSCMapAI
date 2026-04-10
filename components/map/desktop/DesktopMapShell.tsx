'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Suspense } from 'react'
import { DESKTOP_KEYFRAMES } from '@/components/journey/desktop/chrome/desktopKeyframes'
import { DesktopBackground } from '@/components/journey/desktop/shell/DesktopBackground'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })

export function DesktopMapShell() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: '#fff' }}>
      <style>{DESKTOP_KEYFRAMES}</style>
      <DesktopBackground />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: '360px minmax(0, 1fr) 300px',
        gridTemplateRows: '56px minmax(0, 1fr) 32px',
        gridTemplateAreas: `
          "top   top   top"
          "chat  stage info"
          "stat  stat  stat"
        `,
        minHeight: '100vh',
      }}>
        {/* Top bar */}
        <div style={{ gridArea: 'top' }}>
          <MapTopBar />
        </div>

        {/* Chat pane */}
        <div style={{
          gridArea: 'chat',
          borderRight: '1px solid rgba(167,139,250,0.10)',
          background: 'rgba(5,5,16,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          <Suspense fallback={<PaneLoader label="Loading chat…" />}>
            <ChatInterface />
          </Suspense>
        </div>

        {/* Map stage — the MapCanvas fills this area */}
        <div style={{ gridArea: 'stage', position: 'relative', overflow: 'hidden' }}>
          <Suspense fallback={<PaneLoader label="Loading map…" />}>
            <MapCanvas />
          </Suspense>
        </div>

        {/* Info pane — placeholder for now (shows hint text) */}
        <div style={{
          gridArea: 'info',
          borderLeft: '1px solid rgba(167,139,250,0.10)',
          background: 'rgba(5,5,16,0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '24px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12, lineHeight: 1.6,
            padding: '0 16px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontWeight: 700, color: 'rgba(255,255,255,0.50)', marginBottom: 6 }}>
              Map annotations
            </p>
            <p>
              Click a marker on the map to see its details here. Or type a query in the chat to generate a new map.
            </p>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ gridArea: 'stat' }}>
          <MapStatusBar />
        </div>
      </div>
    </div>
  )
}

// ── MapTopBar ─────────────────────────────────────────────────────────────────

function MapTopBar() {
  return (
    <div style={{
      height: 56,
      display: 'flex', alignItems: 'center',
      padding: '0 24px',
      borderBottom: '1px solid rgba(167,139,250,0.10)',
      background: 'rgba(5,5,16,0.78)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Brand orb — same as journey desktop top bar */}
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
        <div style={{
          fontSize: 10, fontWeight: 600,
          background: 'linear-gradient(90deg, #c4b5fd, #67e8f9, #f9a8d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginTop: 1,
        }}>
          Interactive Maps · Desktop
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Journey link */}
      <Link
        href="/journey"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          borderRadius: 10,
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.30)',
          color: '#a5b4fc',
          fontSize: 12, fontWeight: 700,
          textDecoration: 'none',
          transition: 'all 200ms',
        }}
      >
        🎯 Journey
      </Link>
    </div>
  )
}

// ── MapStatusBar ──────────────────────────────────────────────────────────────

function MapStatusBar() {
  return (
    <div style={{
      height: 32,
      display: 'flex', alignItems: 'center',
      padding: '0 18px',
      borderTop: '1px solid rgba(167,139,250,0.08)',
      background: 'rgba(3,3,12,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 10, fontWeight: 600,
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: '0.02em',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: '#34d399',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'currentColor',
          boxShadow: '0 0 6px currentColor',
          animation: 'dj-dotPulse 1.6s ease-in-out infinite',
        }} />
        MAP READY
      </span>
      <span style={{ margin: '0 12px', color: 'rgba(255,255,255,0.15)' }}>│</span>
      <span>AI Annotations</span>
      <div style={{ flex: 1 }} />
      <span style={{ color: 'rgba(255,255,255,0.30)' }}>PadhAI Maps v1</span>
    </div>
  )
}

// ── Fallback loader ───────────────────────────────────────────────────────────

function PaneLoader({ label }: { label: string }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '2px solid rgba(167,139,250,0.20)',
        borderTopColor: '#a78bfa',
        animation: 'dj-rotate 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{label}</span>
    </div>
  )
}
