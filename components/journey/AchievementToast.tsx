'use client'

import { useState, useEffect } from 'react'
import { ACHIEVEMENTS } from './types'

interface AchievementToastProps {
  achievementId: string
  onDone: () => void
}

const CATEGORY_GLOW: Record<string, string> = {
  milestone: 'rgba(167,139,250,0.3)',
  streak: 'rgba(249,115,22,0.3)',
  mastery: 'rgba(251,191,36,0.3)',
  performance: 'rgba(52,211,153,0.3)',
}

const CATEGORY_COLOR: Record<string, string> = {
  milestone: '#a78bfa',
  streak: '#f97316',
  mastery: '#fbbf24',
  performance: '#34d399',
}

export default function AchievementToast({ achievementId, onDone }: AchievementToastProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  const def = ACHIEVEMENTS.find(a => a.id === achievementId)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('exit'), 3550)
    const t3 = setTimeout(onDone, 4300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  if (!def) return null

  const glow = CATEGORY_GLOW[def.category] || CATEGORY_GLOW.milestone
  const color = CATEGORY_COLOR[def.category] || CATEGORY_COLOR.milestone

  return (
    <>
      <style>{`
        @keyframes at-in { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes at-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-120%); opacity: 0; } }
        @keyframes at-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      <div
        className="fixed left-4 right-4 z-[100] flex items-center gap-3 px-4 py-3"
        style={{
          top: 16,
          maxWidth: 360,
          margin: '0 auto',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${glow}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${glow}`,
          animation: phase === 'exit'
            ? 'at-out 0.35s ease forwards'
            : 'at-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 16, opacity: 0.12 }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(90deg, transparent 25%, ${color}50 50%, transparent 75%)`,
            backgroundSize: '200% 100%',
            animation: 'at-shimmer 2s linear infinite',
          }} />
        </div>

        {/* Icon circle */}
        <div
          className="w-9 h-9 flex items-center justify-center text-[20px] flex-shrink-0 rounded-full"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          {def.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Achievement Unlocked
          </p>
          <p className="text-[14px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.92)' }}>{def.title}</p>
          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{def.description}</p>
        </div>
      </div>
    </>
  )
}
