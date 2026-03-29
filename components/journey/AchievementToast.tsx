'use client'

import { useState, useEffect } from 'react'
import { ACHIEVEMENTS } from '@/components/journey/types'

interface AchievementToastProps {
  achievementId: string
  onDone: () => void
}

export default function AchievementToast({ achievementId, onDone }: AchievementToastProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  const def = ACHIEVEMENTS.find(a => a.id === achievementId)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('exit'), 3500)
    const t3 = setTimeout(onDone, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  if (!def) return null

  const categoryColors: Record<string, string> = {
    milestone: '#a78bfa',
    streak: '#f97316',
    mastery: '#fbbf24',
    performance: '#34d399',
  }
  const color = categoryColors[def.category] || '#a78bfa'

  return (
    <>
      <style jsx global>{`
        @keyframes at-slideIn { from { transform: translateY(-120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes at-slideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-120%); opacity: 0; } }
        @keyframes at-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes at-iconPop { 0% { transform: scale(0.5) rotate(-10deg); } 50% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0); } }
      `}</style>
      <div
        className="fixed top-3 left-4 right-4 z-[200] flex items-center gap-3 px-4 py-3.5 rounded-2xl"
        style={{
          maxWidth: 380,
          margin: '0 auto',
          background: 'linear-gradient(135deg, rgba(20,20,32,0.97) 0%, rgba(14,14,22,0.97) 100%)',
          border: `1.5px solid ${color}40`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${color}15`,
          animation: phase === 'enter' || phase === 'show'
            ? 'at-slideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards'
            : 'at-slideOut 0.35s ease forwards',
        }}
      >
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
          style={{ opacity: 0.15 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 25%, ${color}40 50%, transparent 75%)`,
              backgroundSize: '200% 100%',
              animation: 'at-shimmer 2s linear infinite',
            }}
          />
        </div>

        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[24px] flex-shrink-0 relative"
          style={{
            background: `${color}18`,
            border: `1.5px solid ${color}30`,
            animation: 'at-iconPop 0.5s ease 0.2s both',
          }}
        >
          {def.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
            Achievement Unlocked
          </p>
          <p className="text-[14px] font-bold text-white/90 mt-0.5 truncate">{def.title}</p>
          <p className="text-[11px] text-white/40 truncate">{def.description}</p>
        </div>
      </div>
    </>
  )
}
