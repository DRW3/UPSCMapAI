'use client'

import { useState } from 'react'
import { type DailyGoalTier, DAILY_GOALS } from '@/components/journey/types'

interface DailyGoalModalProps {
  currentTier: DailyGoalTier
  todayXp: number
  onSelect: (tier: DailyGoalTier) => void
  onClose: () => void
}

const TIERS: DailyGoalTier[] = ['casual', 'regular', 'serious', 'intense']

export default function DailyGoalModal({ currentTier, todayXp, onSelect, onClose }: DailyGoalModalProps) {
  const [selected, setSelected] = useState<DailyGoalTier>(currentTier)

  return (
    <>
      <style jsx global>{`
        @keyframes dgm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dgm-scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[110]"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', animation: 'dgm-fadeIn 0.2s ease' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-4 right-4 z-[111] rounded-3xl overflow-hidden"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 380,
          margin: '0 auto',
          background: 'linear-gradient(180deg, rgba(20,20,32,0.99) 0%, rgba(14,14,22,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
          animation: 'dgm-scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="px-6 pt-6 pb-2 text-center">
          <p className="text-[24px] mb-1">🎯</p>
          <h3 className="text-[18px] font-bold text-white/90">Daily XP Goal</h3>
          <p className="text-[12px] text-white/40 mt-1">How much do you want to study each day?</p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-2.5">
          {TIERS.map(tier => {
            const cfg = DAILY_GOALS[tier]
            const isActive = tier === selected
            const isCurrent = tier === currentTier
            const progressPct = Math.min(100, (todayXp / cfg.xpTarget) * 100)

            return (
              <button
                key={tier}
                onClick={() => setSelected(tier)}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <span className="text-[22px] flex-shrink-0">{cfg.icon}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold" style={{ color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.7)' }}>
                      {cfg.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-white/35">{cfg.xpTarget} XP per day</span>
                </div>
                {/* Mini progress for today */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: progressPct >= 100 ? '#34d399' : '#fbbf24' }}>
                    {todayXp}/{cfg.xpTarget}
                  </span>
                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${progressPct}%`,
                      background: progressPct >= 100 ? '#34d399' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="px-5 pb-5 pt-1 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white/50 transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSelect(selected); onClose() }}
            className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            Set Goal
          </button>
        </div>
      </div>
    </>
  )
}
