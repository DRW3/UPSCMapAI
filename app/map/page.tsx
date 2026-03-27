'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import UPSCNotes from '@/components/UPSCNotes'
import ChatInterface from '@/components/ChatInterface'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0d1b2e]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-indigo-300 font-medium tracking-wide">Loading map…</p>
      </div>
    </div>
  ),
})

type MobileTab = 'map' | 'chat' | 'notes'

export default function MapPage() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('map')

  return (
    <div className="map-page flex flex-col md:flex-row bg-[#070b14]">

      {/* Left — Chat sidebar
          Mobile: full panel, visible only on chat tab
          Desktop: fixed 300px sidebar, always visible */}
      <aside
        className={[
          'flex-col overflow-hidden border-white/[0.06]',
          'md:flex md:w-[300px] md:flex-none md:border-r',
          mobileTab === 'chat' ? 'flex flex-1' : 'hidden',
        ].join(' ')}
      >
        <ChatInterface />
      </aside>

      {/* Center — Map canvas + Notes panel overlay
          Mobile: full panel, visible on map/notes tabs
          Desktop: takes remaining width, always visible */}
      <main
        className={[
          'relative overflow-hidden',
          'md:flex-1',
          mobileTab !== 'chat' ? 'flex-1' : 'hidden md:block',
        ].join(' ')}
      >
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{ boxShadow: 'inset 0 0 60px rgba(99,102,241,0.04)' }}
        />
        <MapCanvas />
        <UPSCNotes mobileFullscreen={mobileTab === 'notes'} />
      </main>

      {/* ── Mobile bottom tab bar (hidden on md+) ─────────────────────────── */}
      <nav
        className="md:hidden flex-shrink-0 flex items-stretch border-t border-white/[0.08]"
        style={{
          height: 56,
          background: 'rgba(7,11,22,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {(
          [
            {
              tab: 'map' as MobileTab,
              label: 'Map',
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4l5-2.5 6 2.5 5-2.5V14.5l-5 2.5-6-2.5-5 2.5V4z" />
                  <path d="M6 1.5v13M12 4v13" />
                </svg>
              ),
            },
            {
              tab: 'chat' as MobileTab,
              label: 'Chat',
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 2C5.13 2 2 4.91 2 8.5c0 1.28.4 2.48 1.08 3.47L2 16l5.12-1.02A7.36 7.36 0 009 15.25c3.87 0 7-2.91 7-6.75S12.87 2 9 2z" />
                </svg>
              ),
            },
            {
              tab: 'notes' as MobileTab,
              label: 'Notes',
              icon: (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="2" width="12" height="14" rx="2" />
                  <path d="M6 7h6M6 10h4" />
                </svg>
              ),
            },
          ] as const
        ).map(({ tab, label, icon }) => {
          const isActive = mobileTab === tab
          return (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{
                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                minHeight: 44,
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65 }}>{icon}</span>
              <span className="text-[10px] font-semibold mt-0.5">{label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 rounded-full"
                  style={{ width: 20, height: 2, background: '#a5b4fc', marginBottom: 0 }}
                />
              )}
            </button>
          )
        })}
      </nav>

    </div>
  )
}
