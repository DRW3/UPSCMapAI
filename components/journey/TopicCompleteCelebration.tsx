'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// ── TopicCompleteCelebration ────────────────────────────────────────────
// Fires inside the practice sheet when the user has attempted every PYQ
// in the database for the current topic. Premium overlay in the same
// Apple/Cred register as DailyGoalCelebration — restrained motion,
// hero stat (PYQs attempted), two clear action options.
//
// Two CTAs:
//  - "Practice wrong questions" — replays the in-memory `wrongPyqs`
//    queue from this session (parent provides). Hidden if no wrongs.
//  - "Restart all questions"   — clears the topic's seenQuestionIds
//    and fetches a fresh batch from the full DB pool.

interface TopicCompleteCelebrationProps {
  topicTitle: string
  subjectShortTitle: string
  subjectColor: string
  totalAttempted: number       // count of distinct DB PYQs attempted on this topic
  wrongCount: number           // wrong-replay queue length (in-memory this session)
  onPracticeWrong: () => void
  onRestartAll: () => void
  onDismiss: () => void
}

const HEADLINES = [
  'All Questions Attempted',
  'Every PYQ Done',
  'Topic Mastered',
  'You Did Them All',
  'Full Topic Complete',
]
const SUBTITLES = [
  'Every Prelims question we have for this topic. The hard part is over.',
  'You read every question we had. Now sharpen the ones you missed.',
  'You did the work. Every single question for this topic.',
  'This is what mastery looks like. Keep the wrong ones in your sights.',
]

function pickStable<T>(bank: T[], seed: string): T {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  return bank[Math.abs(h) % bank.length]
}

function useCountUp(target: number, durationMs: number, startDelayMs: number = 0): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf: number | null = null
    let cancelled = false
    const start = performance.now() + startDelayMs
    const tick = (now: number) => {
      if (cancelled) return
      const t = Math.max(0, Math.min(1, (now - start) / durationMs))
      const eased = 1 - Math.pow(1 - t, 3)
      setV(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [target, durationMs, startDelayMs])
  return v
}

export default function TopicCompleteCelebration({
  topicTitle,
  subjectShortTitle,
  subjectColor,
  totalAttempted,
  wrongCount,
  onPracticeWrong,
  onRestartAll,
  onDismiss,
}: TopicCompleteCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const dismissedRef = useRef(false)
  const countedTotal = useCountUp(totalAttempted, 1100, 250)

  const headline = useMemo(() => pickStable(HEADLINES, topicTitle), [topicTitle])
  const subtitle = useMemo(() => pickStable(SUBTITLES, topicTitle + 'sub'), [topicTitle])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Soft success haptic — Android only, iOS Safari ignores
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([14, 50, 22, 50, 30])
      }
    } catch { /* best-effort */ }
  }, [])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function close() {
    if (dismissedRef.current) return
    dismissedRef.current = true
    setDismissing(true)
    setTimeout(onDismiss, 320)
  }

  // Particle burst — subtle gold sparks
  const particles = useMemo(() => {
    const count = 22
    return Array.from({ length: count }).map((_, i) => {
      const angle = -90 + (Math.random() * 200 - 100)
      const distance = 100 + Math.random() * 160
      return {
        id: i,
        color: ['#fbbf24', '#fcd34d', '#fde68a', subjectColor][i % 4],
        size: 4 + Math.random() * 5,
        delay: Math.random() * 0.3,
        dx: Math.cos((angle * Math.PI) / 180) * distance,
        dy: Math.sin((angle * Math.PI) / 180) * distance,
        rotate: Math.random() * 360,
      }
    })
  }, [subjectColor])

  return (
    <>
      <style>{`
        @keyframes tcc-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tcc-fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes tcc-sheetIn {
          0%   { opacity: 0; transform: translateY(100%); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes tcc-sheetOut {
          to { opacity: 0; transform: translateY(100%); }
        }
        @keyframes tcc-bloom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40%  { opacity: 0.7; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }
        @keyframes tcc-bloomLoop {
          0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.65; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes tcc-ringFill {
          from { stroke-dashoffset: 283; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes tcc-checkDraw {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes tcc-particle {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4) rotate(0deg); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.2) rotate(var(--rot)); }
        }
        @keyframes tcc-slide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 240,
          background: 'rgba(2, 4, 12, 0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          animation: dismissing ? 'tcc-fadeOut 0.3s ease forwards' : 'tcc-fadeIn 0.35s ease forwards',
        }}
      />

      {/* Radial bloom — sized in viewport units so it never overflows */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 241,
          width: 'min(720px, 130vw)', height: 'min(720px, 130vw)', pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${subjectColor}40 0%, rgba(245,158,11,0.16) 35%, transparent 75%)`,
          filter: 'blur(28px)',
          animation: visible && !dismissing
            ? 'tcc-bloom 1.5s ease-out forwards, tcc-bloomLoop 4.5s ease-in-out 1.5s infinite'
            : 'none',
        }}
      />

      {/* Particle field — anchored above the sheet's hero ring */}
      <div
        style={{
          position: 'fixed', bottom: '60vh', left: '50%', zIndex: 242,
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
              animation: `tcc-particle 1.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + p.delay}s forwards`,
            }}
          />
        ))}
      </div>

      {/* Bottom sheet — anchored to the viewport bottom so it always fits.
          Width is full viewport (no horizontal squeeze), height is auto with
          a maxHeight cap of 92dvh and an internal scroll fallback. The sheet
          slides up from below on open and back down on dismiss. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 243,
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          padding: '24px 22px max(22px, env(safe-area-inset-bottom, 18px))',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          background: 'linear-gradient(180deg, rgba(20, 18, 32, 0.98) 0%, rgba(10, 10, 18, 0.99) 100%)',
          borderTop: `1px solid ${subjectColor}55`,
          boxShadow: `0 -20px 60px rgba(0, 0, 0, 0.65), 0 0 80px ${subjectColor}40, inset 0 1px 0 rgba(255,255,255,0.06)`,
          animation: dismissing
            ? 'tcc-sheetOut 0.32s ease forwards'
            : visible
              ? 'tcc-sheetIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              : 'none',
          opacity: visible ? undefined : 0,
          transform: visible ? undefined : 'translateY(100%)',
        }}
      >
        {/* Drag handle — visual affordance for the bottom sheet */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.18)',
          margin: '0 auto 16px',
        }} />

        {/* Animated check ring — smaller, more compact */}
        <div style={{ width: 72, height: 72, margin: '0 auto 14px', position: 'relative' }}>
          <svg width="72" height="72" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
            <circle cx="50" cy="50" r="45" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none"
              stroke={subjectColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray="283" strokeDashoffset="283"
              transform="rotate(-90 50 50)"
              style={{
                animation: 'tcc-ringFill 0.95s cubic-bezier(0.65, 0, 0.35, 1) 0.15s forwards',
                filter: `drop-shadow(0 0 12px ${subjectColor}aa)`,
              }}
            />
            <path d="M30 51 L45 66 L72 35"
              fill="none" stroke="#fde68a" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="60" strokeDashoffset="60"
              style={{
                animation: 'tcc-checkDraw 0.45s cubic-bezier(0.65, 0, 0.35, 1) 0.95s forwards',
                filter: 'drop-shadow(0 0 8px rgba(253,230,138,0.6))',
              }}
            />
          </svg>
        </div>

        {/* Hero stat — total PYQs attempted, shown as N/N so the user
            sees the full proportion (e.g. "12/12") instead of a bare
            number with no denominator. */}
        <div style={{
          textAlign: 'center', marginBottom: 4,
          opacity: 0, animation: 'tcc-slide 0.5s ease 0.25s forwards',
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            PYQs Attempted
          </div>
          <div style={{
            fontSize: 'clamp(44px, 12vw, 56px)', fontWeight: 900, lineHeight: 1,
            color: '#fff', letterSpacing: '-0.035em',
            background: `linear-gradient(180deg, #ffffff 0%, ${subjectColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block', paddingBottom: '0.05em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {countedTotal}
            <span style={{
              opacity: 0.78,
              fontWeight: 800,
              fontSize: '0.65em',
              marginLeft: '0.04em',
            }}>
              {'/'}{totalAttempted}
            </span>
          </div>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.96)',
          textAlign: 'center', marginTop: 8, marginBottom: 8,
          letterSpacing: '-0.018em', lineHeight: 1.3,
          padding: '0 4px',
          opacity: 0, animation: 'tcc-slide 0.5s ease 0.38s forwards',
        }}>
          {headline}
        </div>

        {/* Topic chip — wraps to multi-line on narrow phones so the topic
            title is never truncated mid-word. */}
        <div style={{
          display: 'flex', justifyContent: 'center', marginBottom: 10,
          padding: '0 8px',
          opacity: 0, animation: 'tcc-slide 0.5s ease 0.48s forwards',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 11,
            background: `${subjectColor}18`,
            border: `1px solid ${subjectColor}40`,
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.01em',
            maxWidth: '100%',
            flexWrap: 'wrap', justifyContent: 'center',
            rowGap: 2,
          }}>
            <span style={{ color: subjectColor, opacity: 0.85 }}>{subjectShortTitle}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{
              color: 'rgba(255,255,255,0.92)',
              wordBreak: 'break-word',
              textAlign: 'center',
            }}>{topicTitle}</span>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.58)',
          textAlign: 'center', lineHeight: 1.45, marginBottom: 16,
          padding: '0 12px',
          opacity: 0, animation: 'tcc-slide 0.5s ease 0.58s forwards',
        }}>
          {subtitle}
        </div>

        {/* Action choices.
            When the user has tracked wrong answers (wrongCount > 0):
              Primary  → "Practice Only Wrong Questions" (filled, glowing)
              Secondary→ "Restart All Questions" (outlined)
            When wrongCount === 0:
              Primary  → "Restart All Questions" (filled, glowing)
              Wrong CTA hidden — replaced by a tiny one-line note so the
              user understands why there's no wrong-only option yet.
            This avoids the inactive/loading-looking disabled button. */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 9,
          opacity: 0, animation: 'tcc-slide 0.5s ease 0.68s forwards',
        }}>
          {wrongCount > 0 ? (
            <>
              {/* PRIMARY: Practice Only Wrong Questions */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPracticeWrong()
                }}
                style={{
                  width: '100%', height: 56, borderRadius: 16, border: 'none',
                  background: `linear-gradient(135deg, ${subjectColor}, ${subjectColor}cc)`,
                  color: '#fff',
                  fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  letterSpacing: '0.02em',
                  boxShadow: `0 8px 28px ${subjectColor}66`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 1,
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 45%)',
                }} />
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  position: 'relative', zIndex: 1,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Practice Only Wrong Questions
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, opacity: 0.85,
                  letterSpacing: '0.04em',
                  position: 'relative', zIndex: 1,
                }}>
                  {wrongCount} {wrongCount === 1 ? 'question' : 'questions'} to fix
                </span>
              </button>

              {/* SECONDARY: Restart All Questions */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestartAll() }}
                style={{
                  width: '100%', height: 48, borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '0.02em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                  <path d="M21 3v6h-6" />
                </svg>
                Restart All Questions
              </button>
            </>
          ) : (
            <>
              {/* PRIMARY (no wrongs case): Restart All Questions */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestartAll() }}
                style={{
                  width: '100%', height: 56, borderRadius: 16, border: 'none',
                  background: `linear-gradient(135deg, ${subjectColor}, ${subjectColor}cc)`,
                  color: '#fff',
                  fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  letterSpacing: '0.02em',
                  boxShadow: `0 8px 28px ${subjectColor}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 45%)',
                }} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 1 }}>
                  <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                  <path d="M21 3v6h-6" />
                </svg>
                <span style={{ position: 'relative', zIndex: 1 }}>Restart All Questions</span>
              </button>
              {/* Note explaining why the wrong-only CTA is missing today */}
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.42)',
                textAlign: 'center', lineHeight: 1.45,
                padding: '4px 8px 0',
              }}>
                Wrong-only practice will appear here once you miss a question on this topic.
              </div>
            </>
          )}

          {/* TEXT-ONLY DISMISS */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); close() }}
            style={{
              width: '100%', height: 38, borderRadius: 12, border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.40)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              marginTop: 1,
            }}
          >
            Done for now
          </button>
        </div>
      </div>
    </>
  )
}
