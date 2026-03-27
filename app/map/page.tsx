'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
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

type Tab = 'chat' | 'map'

export default function MapPage() {
  const [activeTab, setActiveTab] = useState<Tab>('map')

  return (
    <div className="map-page flex flex-col md:flex-row bg-[#070b14]">

      {/* Left — Chat (desktop: always visible; mobile: shown when activeTab === 'chat') */}
      <aside className={[
        'flex-col border-r border-white/[0.06]',
        'md:w-[300px] md:flex-shrink-0 md:flex',
        activeTab === 'chat' ? 'flex flex-1' : 'hidden md:flex',
      ].join(' ')}>
        <ChatInterface />
      </aside>

      {/* Center — Map (desktop: always visible; mobile: shown when activeTab === 'map') */}
      <main className={[
        'relative overflow-hidden',
        'md:flex-1',
        activeTab === 'map' ? 'flex flex-1' : 'hidden md:block',
      ].join(' ')}>
        <div className="absolute inset-0 pointer-events-none z-[5]"
          style={{ boxShadow: 'inset 0 0 60px rgba(99,102,241,0.04)' }} />
        <MapCanvas />
        <UPSCNotes />
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
        style={{ background: 'rgba(7,11,22,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <button
          onClick={() => setActiveTab('chat')}
          className={[
            'flex-1 py-3 flex flex-col items-center gap-1 transition-colors',
            activeTab === 'chat' ? 'text-indigo-400' : 'text-gray-500',
          ].join(' ')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide uppercase">Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={[
            'flex-1 py-3 flex flex-col items-center gap-1 transition-colors',
            activeTab === 'map' ? 'text-indigo-400' : 'text-gray-500',
          ].join(' ')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide uppercase">Map</span>
        </button>
      </nav>

    </div>
  )
}
