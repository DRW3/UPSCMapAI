'use client'

import { useEffect, useRef, useState, useMemo } from 'react'

// ── DailyGoalCelebration ────────────────────────────────────────────────────
// Fires the moment a user completes their self-set daily goal (read +
// practice targets both met for today). Restrained, premium aesthetic
// in the Apple/Cred register — NOT cartoon Duolingo. The streak number
// is the hero ("identity proof, not achievement"), copy is calm and
// factual, particles are subtle, no sound, optional haptic.
//
// Streak escalation:
//   day 1   → cream + minimal, no particles
//   day 3+  → indigo + gold particle starburst
//   day 7+  → amber gradient + stronger particle field
//   day 30+ → gold gradient + larger field + ribbon
//   day 100+→ premium dark gold + slowest, most rewarding animation
//
// Triggered once per day per user (parent guards via lastGoalCelebratedDate
// in localStorage).

interface DailyGoalCelebrationProps {
  streakDays: number          // including today (1+)
  topicsRead: number          // today
  practiceDone: number        // today
  readTarget: number          // tier read target
  practiceTarget: number      // tier practice target
  firstName: string | null
  onDismiss: () => void
}

// ── Microcopy banks ────────────────────────────────────────────────────
const HEADLINES = [
  "Today's goal — done.",
  'You showed up today.',
  'Done for today.',
  'Today is in the books.',
  'Today: complete.',
]

const SUBTITLES = [
  'Small steps. Every day. This is how it is done.',
  'Tomorrow is waiting. Rest tonight.',
  'Same time tomorrow.',
  'Keep going.',
  'You are building the habit that gets you through.',
  'This is what topper hours look like.',
]

// Stable per-day pick so the message does not flicker on remount.
function pickStableLine<T>(bank: T[], seed: string): T {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  return bank[Math.abs(h) % bank.length]
}

// ── Streak tier ───────────────────────────────────────────────────────
type Tier = 'day1' | 'day3' | 'week' | 'month' | 'century'
function streakTier(n: number): Tier {
  if (n >= 100) return 'century'
  if (n >= 30) return 'month'
  if (n >= 7) return 'week'
  if (n >= 3) return 'day3'
  return 'day1'
}
function tierColors(t: Tier) {
  switch (t) {
    case 'century':
      return {
        ring: '#fbbf24',
        glow: 'rgba(251,191,36,0.55)',
        bloom: 'radial-gradient(circle, rgba(251,191,36,0.40) 0%, rgba(245,158,11,0.18) 35%, transparent 75%)',
        accent: '#fde68a',
        particles: ['#fbbf24', '#fcd34d', '#fde68a', '#f59e0b', '#fff7e6'],
      }
    case 'month':
      return {
        ring: '#f59e0b',
        glow: 'rgba(245,158,11,0.45)',
        bloom: 'radial-gradient(circle, rgba(245,158,11,0.32) 0%, rgba(245,158,11,0.10) 40%, transparent 75%)',
        accent: '#fcd34d',
        particles: ['#f59e0b', '#fcd34d', '#fbbf24', '#fde68a'],
      }
    case 'week':
      return {
        ring: '#fbbf24',
        glow: 'rgba(251,191,36,0.40)',
        bloom: 'radial-gradient(circle, rgba(251,191,36,0.26) 0%, rgba(245,158,11,0.08) 40%, transparent 75%)',
        accent: '#fef3c7',
        particles: ['#fbbf24', '#fde68a', '#fef3c7', '#a78bfa'],
      }
    case 'day3':
      return {
        ring: '#a78bfa',
        glow: 'rgba(167,139,250,0.40)',
        bloom: 'radial-gradient(circle, rgba(167,139,250,0.24) 0%, rgba(99,102,241,0.06) 40%, transparent 75%)',
        accent: '#c4b5fd',
        particles: ['#a78bfa', '#c4b5fd', '#fbbf24', '#34d399'],
      }
    default:
      return {
        ring: '#a78bfa',
        glow: 'rgba(167,139,250,0.30)',
        bloom: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
        accent: '#c4b5fd',
        particles: [],
      }
  }
}

// ── Count-up hook ─────────────────────────────────────────────────────
function useCountUp(target: number, durationMs: number, startDelayMs: number = 0): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf: number | null = null
    let cancelled = false
    const start = performance.now() + startDelayMs
    const tick = (now: number) => {
      if (cancelled) return
      const t = Math.max(0, Math.min(1, (now - start) / durationMs))
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [target, durationMs, startDelayMs])
  return value
}

export default function DailyGoalCelebration({
  streakDays,
  topicsRead,
  practiceDone,
  readTarget,
  practiceTarget,
  firstName,
  onDismiss,
}: DailyGoalCelebrationProps) {
  const tier = streakTier(streakDays)
  const colors = tierColors(tier)
  const countedStreak = useCountUp(streakDays, 900, 200)
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const dismissedRef = useRef(false)

  // Stable seed so headline + subtitle do not flicker on re-render
  const seed = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${streakDays}`
  }, [streakDays])
  const headline = useMemo(() => {
    if (tier === 'century') return `100 days. You are in the top 1% of aspirants.`
    if (tier === 'month') return `One month. This is rare.`
    if (tier === 'week') return `One week. ${streakDays} days strong.`
    if (tier === 'day3') return `${streakDays} days in a row.`
    return pickStableLine(HEADLINES, seed)
  }, [tier, streakDays, seed])
  const subtitle = useMemo(() => pickStableLine(SUBTITLES, seed), [seed])

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Soft success haptic — Android only, iOS Safari ignores it silently
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (tier === 'century' || tier === 'month') {
          navigator.vibrate([12, 40, 18, 40, 24])
        } else if (tier === 'week' || tier === 'day3') {
          navigator.vibrate([10, 50, 20])
        } else {
          navigator.vibrate(15)
        }
      }
    } catch {
      // Ignore — vibration is best-effort
    }
  }, [tier])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleDismiss() {
    if (dismissedRef.current) return
    dismissedRef.current = true
    setDismissing(true)
    setTimeout(onDismiss, 320)
  }

  // Particle field — simple absolutely-positioned spans, CSS keyframed.
  const particles = useMemo(() => {
    const count = tier === 'century' ? 28 : tier === 'month' ? 22 : tier === 'week' ? 18 : tier === 'day3' ? 14 : 0
    if (count === 0) return []
    return Array.from({ length: count }).map((_, i) => {
      // Spread particles in a cone above the card
      const angle = -90 + (Math.random() * 160 - 80) // -170 to +10 deg around top
      const distance = 80 + Math.random() * 140
      const dx = Math.cos((angle * Math.PI) / 180) * distance
      const dy = Math.sin((angle * Math.PI) / 180) * distance
      return {
        id: i,
        color: colors.particles[i % colors.particles.length],
        size: 4 + Math.random() * 5,
        delay: Math.random() * 0.25,
        dx, dy,
        rotate: Math.random() * 360,
      }
    })
  }, [tier, colors.particles])

  return (
    <>
      <style>{`
        @keyframes dgc-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dgc-fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        /* Keyframes MUST include translate(-50%, -50%) to preserve the
           card's centering — any transform declared here completely
           overrides the element's inline transform, so the centering
           offset has to live inside every step or the card jumps to
           the bottom-right quadrant (top-left corner pinned at 50%,50%). */
        @keyframes dgc-cardIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.78); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes dgc-cardOut {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to   { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
        }
        @keyframes dgc-bloom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }
        @keyframes dgc-bloomLoop {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.10); }
        }
        @keyframes dgc-ringFill {
          from { stroke-dashoffset: 283; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes dgc-checkDraw {
          from { stroke-dashoffset: 28; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes dgc-particleBurst {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.4) rotate(0deg);
          }
          15% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) scale(0.2) rotate(var(--rot));
          }
        }
        @keyframes dgc-statSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(2, 4, 12, 0.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          animation: dismissing
            ? 'dgc-fadeOut 0.3s ease forwards'
            : 'dgc-fadeIn 0.35s ease forwards',
        }}
      />

      {/* Radial bloom — full-screen pulsing gradient behind everything */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 201,
          width: 700, height: 700, pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          background: colors.bloom,
          filter: 'blur(20px)',
          animation: visible && !dismissing
            ? 'dgc-bloom 1.4s ease-out forwards, dgc-bloomLoop 4s ease-in-out 1.4s infinite'
            : 'none',
        }}
      />

      {/* Particle field */}
      {particles.length > 0 && (
        <div
          style={{
            position: 'fixed', top: '38%', left: '50%', zIndex: 202,
            width: 0, height: 0, pointerEvents: 'none',
          }}
        >
          {particles.map(p => (
            <span
              key={p.id}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: p.size, height: p.size,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                opacity: 0,
                ['--dx' as string]: `${p.dx}px`,
                ['--dy' as string]: `${p.dy}px`,
                ['--rot' as string]: `${p.rotate}deg`,
                animation: `dgc-particleBurst 1.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.35 + p.delay}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 203,
          width: 'min(360px, calc(100vw - 32px))',
          padding: '32px 28px 28px',
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(20, 18, 32, 0.98) 0%, rgba(10, 10, 18, 0.99) 100%)',
          border: `1px solid ${colors.glow.replace('0.30', '0.30').replace('0.40', '0.40').replace('0.45', '0.45').replace('0.55', '0.55')}`,
          boxShadow: `0 30px 80px rgba(0, 0, 0, 0.65), 0 0 80px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          transform: 'translate(-50%, -50%)',
          animation: dismissing
            ? 'dgc-cardOut 0.3s ease forwards'
            : visible
              ? 'dgc-cardIn 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : 'none',
          opacity: visible ? undefined : 0,
        }}
      >
        {/* Animated check ring */}
        <div style={{
          width: 88, height: 88, margin: '0 auto 22px', position: 'relative',
        }}>
          <svg width="88" height="88" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            {/* Background ring */}
            <circle cx="50" cy="50" r="45" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            {/* Animated fill ring */}
            <circle cx="50" cy="50" r="45" fill="none"
              stroke={colors.ring} strokeWidth="6" strokeLinecap="round"
              strokeDasharray="283" strokeDashoffset="283"
              transform="rotate(-90 50 50)"
              style={{
                animation: 'dgc-ringFill 0.9s cubic-bezier(0.65, 0, 0.35, 1) 0.15s forwards',
                filter: `drop-shadow(0 0 14px ${colors.glow})`,
              }}
            />
            {/* Checkmark */}
            <path d="M30 51 L45 66 L72 35"
              fill="none" stroke={colors.accent} strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="60" strokeDashoffset="60"
              style={{
                animation: 'dgc-checkDraw 0.45s cubic-bezier(0.65, 0, 0.35, 1) 0.85s forwards',
                filter: `drop-shadow(0 0 8px ${colors.glow})`,
              }}
            />
          </svg>
        </div>

        {/* Streak hero number — the identity proof */}
        <div style={{
          textAlign: 'center', marginBottom: 4,
          opacity: 0, animation: 'dgc-statSlide 0.55s ease 0.25s forwards',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            {streakDays === 1 ? 'Goal Streak' : 'Goal Streak'}
          </div>
          <div style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            color: '#fff', letterSpacing: '-0.04em',
            background: `linear-gradient(180deg, #ffffff 0%, ${colors.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block', paddingBottom: '0.06em',
          }}>
            {countedStreak}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.40)',
            marginTop: 2, letterSpacing: '0.02em',
          }}>
            {streakDays === 1 ? 'day' : 'days in a row'}
          </div>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.96)',
          textAlign: 'center', marginTop: 18, marginBottom: 6,
          letterSpacing: '-0.015em', lineHeight: 1.3,
          opacity: 0, animation: 'dgc-statSlide 0.55s ease 0.40s forwards',
        }}>
          {firstName ? `${headline.replace(/^(\w)/, c => c)}` : headline}
        </div>

        {/* Subtitle — calm, factual */}
        <div style={{
          fontSize: 13.5, color: 'rgba(255,255,255,0.55)',
          textAlign: 'center', lineHeight: 1.5, marginBottom: 18,
          padding: '0 8px',
          opacity: 0, animation: 'dgc-statSlide 0.55s ease 0.50s forwards',
        }}>
          {subtitle}
        </div>

        {/* Stat row — what they actually did today */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 22,
          opacity: 0, animation: 'dgc-statSlide 0.55s ease 0.60s forwards',
        }}>
          {[
            { label: 'Topics read', n: topicsRead, target: readTarget },
            { label: 'Practice done', n: practiceDone, target: practiceTarget },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '12px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.07)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
                lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              }}>
                {s.n}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', fontWeight: 600 }}>/{s.target}</span>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.40)',
                marginTop: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none',
            background: `linear-gradient(135deg, ${colors.ring}, ${colors.accent})`,
            color: '#0a0a14', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.03em',
            boxShadow: `0 6px 24px ${colors.glow}`,
            opacity: 0, animation: 'dgc-statSlide 0.55s ease 0.70s forwards',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          KEEP GOING
        </button>
      </div>
    </>
  )
}
