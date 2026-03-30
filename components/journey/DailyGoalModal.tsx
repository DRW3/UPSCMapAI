'use client'

import { useState } from 'react'
import { type DailyGoalTier, DAILY_GOALS } from './types'

interface DailyGoalModalProps {
  currentTier: DailyGoalTier
  todayXp: number
  onSelect: (tier: DailyGoalTier) => void
  onClose: () => void
}

const TIERS: DailyGoalTier[] = ['casual', 'regular', 'serious', 'intense']

export default function DailyGoalModal({ currentTier, onSelect, onClose }: DailyGoalModalProps) {
  const [selected, setSelected] = useState<DailyGoalTier>(currentTier)

  return (
    <>
      <style>{`
        @keyframes dgm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dgm-scaleIn {
          from { transform: scale(0.95) translateY(-50%); opacity: 0; }
          to   { transform: scale(1) translateY(-50%); opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90]"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'dgm-fadeIn 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-4 right-4 z-[91]"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 360,
          margin: '0 auto',
          background: 'rgba(10,10,20,0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
          animation: 'dgm-scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-3 text-center">
          <p className="text-[28px] mb-1.5">🎯</p>
          <h3 className="text-[18px] font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
            Set Your Daily Goal
          </h3>
          <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Study consistently to build your streak
          </p>
        </div>

        {/* Tier options */}
        <div className="px-5 py-3 flex flex-col gap-2">
          {TIERS.map(tier => {
            const cfg = DAILY_GOALS[tier]
            const isActive = tier === selected
            const isCurrent = tier === currentTier

            return (
              <button
                key={tier}
                onClick={() => setSelected(tier)}
                className="flex items-center gap-3 px-4 transition-all duration-200"
                style={{
                  height: 56,
                  borderRadius: 16,
                  background: isActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  border: isActive
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isActive ? '0 0 20px rgba(99,102,241,0.1)' : 'none',
                  transform: isActive ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <span className="text-[20px] flex-shrink-0">{cfg.icon}</span>
                <div className="flex-1 text-left flex items-center gap-2">
                  <span
                    className="text-[14px] font-bold"
                    style={{ color: isActive ? '#818cf8' : 'rgba(255,255,255,0.55)' }}
                  >
                    {cfg.label}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.30)' }}
                >
                  {cfg.xpTarget} XP
                </span>
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 pt-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-[14px] font-semibold transition-all active:scale-[0.97]"
            style={{ color: 'rgba(255,255,255,0.55)', background: 'transparent', borderRadius: 9999 }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSelect(selected); onClose() }}
            className="flex-1 py-3.5 text-[14px] font-bold text-white transition-all active:scale-[0.97]"
            style={{
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
          >
            Set Goal
          </button>
        </div>
      </div>
    </>
  )
}
