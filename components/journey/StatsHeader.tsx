'use client'

// ── Constants ─────────────────────────────────────────────────────────────────

export const STATS_HEADER_HEIGHT = 44

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatsHeaderProps {
  streak: number
  todayXp: number
  dailyGoalXp: number
  onDailyGoalClick: () => void
}

// ── Daily Goal Ring (28x28) ─────────────────────────────────────────────────

function GoalRing({ todayXp, goalXp, onClick }: { todayXp: number; goalXp: number; onClick: () => void }) {
  const pct = Math.min(100, goalXp > 0 ? (todayXp / goalXp) * 100 : 0)
  const goalMet = pct >= 100
  const r = 11
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * pct) / 100

  // Interpolate stroke color from #6366f1 (indigo) toward #34d399 (green) as it fills
  const strokeColor = goalMet ? '#34d399' : `hsl(${240 + (pct / 100) * 120}, 80%, 65%)`

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center transition-transform active:scale-95"
      style={{ width: 28, height: 28, position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      aria-label={`Daily goal: ${todayXp}/${goalXp} XP`}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle
          cx="14" cy="14" r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 500ms ease-out, stroke 300ms ease-out',
          }}
        />
      </svg>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {goalMet ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" fill="#FBBF24" />
          </svg>
        )}
      </div>
    </button>
  )
}

// ── Stats Header ────────────────────────────────────────────────────────────

export default function StatsHeader({ streak, todayXp, dailyGoalXp, onDailyGoalClick }: StatsHeaderProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[50]"
      style={{
        height: STATS_HEADER_HEIGHT,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes statsStreakGlow {
          0%, 100% { text-shadow: 0 0 6px rgba(249,115,22,0.35); }
          50% { text-shadow: 0 0 12px rgba(249,115,22,0.55); }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          height: STATS_HEADER_HEIGHT,
          background: 'rgba(10,10,20,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          pointerEvents: 'auto',
        }}
      >
        {/* Left: Streak flame + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              textShadow: streak > 0
                ? '0 0 8px rgba(249,115,22,0.5), 0 0 16px rgba(249,115,22,0.25)'
                : 'none',
            }}
          >
            🔥
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#f0f0f5',
              fontVariantNumeric: 'tabular-nums',
              animation: streak > 0 ? 'statsStreakGlow 2.5s ease-in-out infinite' : 'none',
            }}
          >
            {streak}
          </span>
        </div>

        {/* Right: Daily goal ring */}
        <GoalRing
          todayXp={todayXp}
          goalXp={dailyGoalXp}
          onClick={onDailyGoalClick}
        />
      </div>
    </div>
  )
}

// Named export for backward compatibility
export { StatsHeader }
