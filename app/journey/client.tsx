'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Lazy-load to avoid SSR issues with localStorage
const MobileLearningJourney = dynamic(
  () => import('@/components/journey/MobileLearningJourney').then(m => ({ default: m.MobileLearningJourney })),
  { ssr: false, loading: () => <Loading /> }
)

// Desktop fallback — original component
const LearningJourneyDesktop = dynamic(
  () => import('@/components/LearningJourney').then(m => ({ default: m.LearningJourney })),
  { ssr: false, loading: () => <Loading /> }
)

function Loading() {
  return (
    <div className="flex items-center justify-center" style={{ height: '100dvh', background: '#080810' }}>
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
    </div>
  )
}

export function JourneyClient() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile === null) return <Loading />

  if (isMobile) {
    return <MobileLearningJourney />
  }

  // Desktop: use original layout with nav
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #080810 0%, #0a0a14 50%, #080810 100%)' }}
    >
      <nav
        className="sticky top-0 z-40 flex items-center gap-4 px-6 h-14"
        style={{ background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <a href="/" className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-[12px]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 2L4 7l5 5" />
          </svg>
          Home
        </a>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span className="text-[13px] font-semibold text-white/85">Learning Journey</span>
        </div>
        <div className="flex-1" />
        <a
          href="/map"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
        >
          Open Map
        </a>
      </nav>
      <main>
        <LearningJourneyDesktop />
      </main>
    </div>
  )
}
