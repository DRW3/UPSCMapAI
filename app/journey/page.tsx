import type { Metadata } from 'next'
import Link from 'next/link'
import { LearningJourney } from '@/components/LearningJourney'

export const metadata: Metadata = {
  title: 'Learning Journey · UPSCMap AI',
  description: 'Master the entire UPSC syllabus topic by topic with interactive maps, PYQ practice, and AI-powered notes.',
}

export default function JourneyPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #080810 0%, #0a0a14 50%, #080810 100%)' }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 h-14"
        style={{ background: 'rgba(8,8,16,0.88)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-[12px]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 2L4 7l5 5" />
          </svg>
          Home
        </Link>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span className="text-[13px] font-semibold text-white/85">Learning Journey</span>
        </div>

        <div className="flex-1" />

        <Link
          href="/map"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
        >
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
          </svg>
          Open Map
        </Link>
      </nav>

      {/* Journey Content */}
      <main>
        <LearningJourney />
      </main>
    </div>
  )
}
