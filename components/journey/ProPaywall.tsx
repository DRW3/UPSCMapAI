'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ProPaywallProps {
  reason: 'topics' | 'hearts'
  onDismiss: () => void
  onUpgrade: () => void
}

const FEATURES = [
  { icon: '📚', text: 'Unlimited topic access (280+ topics)' },
  { icon: '❤️', text: 'Unlimited hearts — never stop practicing' },
  { icon: '📊', text: 'AI-powered weak area analysis' },
  { icon: '📝', text: 'Detailed answer explanations' },
  { icon: '🎯', text: 'Personalized study plans' },
  { icon: '⚡', text: 'Priority AI note generation' },
]

export default function ProPaywall({ reason, onDismiss, onUpgrade }: ProPaywallProps) {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [activated, setActivated] = useState(false)

  // Drag-to-dismiss refs
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)
  const isDragging = useRef(false)
  const [dragTranslate, setDragTranslate] = useState(0)

  // Stagger features in
  const [visibleFeatures, setVisibleFeatures] = useState(0)

  // Activation handler — show success state, then run parent upgrade
  const handleActivate = useCallback(() => {
    if (activated) return
    setActivated(true)
    // Run parent state update immediately so isPro flips, but keep the modal
    // visible for ~1.6s to show the success confirmation.
    onUpgrade()
  }, [activated, onUpgrade])

  // Auto-dismiss success state after a beat
  useEffect(() => {
    if (!activated) return
    const t = setTimeout(() => {
      setDismissing(true)
      setTimeout(onDismiss, 350)
    }, 1700)
    return () => clearTimeout(t)
  }, [activated, onDismiss])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  // Stagger feature items after sheet is visible
  useEffect(() => {
    if (!visible) return
    let count = 0
    const interval = setInterval(() => {
      count++
      setVisibleFeatures(count)
      if (count >= FEATURES.length) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [visible])

  const handleDismiss = useCallback(() => {
    setDismissing(true)
    setTimeout(onDismiss, 350)
  }, [onDismiss])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    isDragging.current = true
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) {
      dragOffset.current = delta
      setDragTranslate(delta)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    if (dragOffset.current > 120) {
      handleDismiss()
    } else {
      setDragTranslate(0)
      dragOffset.current = 0
    }
  }, [handleDismiss])

  const subtitle =
    reason === 'topics'
      ? "You've explored your 2 free topics. Unlock the entire UPSC syllabus."
      : 'Out of hearts? Get unlimited practice with Pro.'

  const sheetTransform = dismissing
    ? 'translateY(100%)'
    : visible
      ? `translateY(${dragTranslate}px)`
      : 'translateY(100%)'

  const backdropOpacity = dismissing ? 0 : visible ? 1 : 0

  return (
    <>
      <style>{`
        @keyframes pw-slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pw-slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        @keyframes pw-badgePulse {
          0%, 100% { box-shadow: 0 0 30px rgba(99,102,241,0.4), 0 0 60px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 50px rgba(99,102,241,0.6), 0 0 90px rgba(139,92,246,0.35); }
        }
        @keyframes pw-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pw-featureIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pw-trialBadgePop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Backdrop overlay */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: backdropOpacity,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Bottom sheet */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 81,
          maxHeight: '85vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'rgba(10,10,20,0.98)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transform: sheetTransform,
          transition: isDragging.current
            ? 'none'
            : dismissing
              ? 'transform 0.35s ease-in'
              : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        </div>

        {/* ── Success state — shown after user taps Start Free Trial ─────── */}
        {activated && (
          <div
            style={{
              padding: '40px 28px 56px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'pw-trialBadgePop 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Animated success ring */}
            <div
              style={{
                position: 'relative',
                width: 96, height: 96, marginBottom: 24,
              }}
            >
              {/* Glow halo */}
              <div
                style={{
                  position: 'absolute', inset: -20, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(34,197,94,0.35), transparent 70%)',
                  filter: 'blur(20px)',
                  animation: 'pw-badgePulse 2s ease-in-out infinite',
                }}
              />
              {/* Solid green disc */}
              <div
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 12px 40px rgba(34,197,94,0.45)',
                }}
              >
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" style={{ animation: 'ps-checkmark 0.5s ease 0.15s both' }} />
                </svg>
              </div>
            </div>

            <div
              style={{
                fontSize: 22, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 6,
              }}
            >
              PadhAI Pro is Active
            </div>
            <div
              style={{
                fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5,
                maxWidth: 260,
              }}
            >
              Your 7-day free trial has started. All topics and unlimited hearts are unlocked.
            </div>

            {/* Tiny chips for what just unlocked */}
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['280+ topics', 'Unlimited hearts', 'AI explanations'].map((label, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '6px 11px', borderRadius: 12,
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.30)',
                    color: '#86efac',
                    letterSpacing: '0.02em',
                    opacity: 0,
                    animation: `pw-featureIn 0.4s ease ${0.3 + i * 0.1}s forwards`,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content — hidden during success state */}
        {!activated && (
        <div style={{ padding: '8px 24px 24px' }}>
          {/* Pro badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pw-badgePulse 2.5s ease-in-out infinite',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              margin: 0,
              marginBottom: 8,
            }}
          >
            Upgrade to PadhAI Pro
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              margin: 0,
              marginBottom: 28,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>

          {/* Features list */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16,
              padding: '16px 18px',
              marginBottom: 28,
            }}
          >
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: i < FEATURES.length - 1 ? 14 : 0,
                  opacity: i < visibleFeatures ? 1 : 0,
                  transform: i < visibleFeatures ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                }}
              >
                {/* Green checkmark */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="12" fill="rgba(34,197,94,0.15)" />
                  <path
                    d="M7 12.5l3 3 7-7"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.80)', lineHeight: 1.4 }}>
                  {feature.icon} {feature.text}
                </span>
              </div>
            ))}
          </div>

          {/* Price section */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              ₹299/month
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              Less than ₹10/day
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 20,
                padding: '6px 14px',
                animation: 'pw-trialBadgePop 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>
                7-day free trial
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleActivate()
            }}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 16,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              backgroundSize: '200% 100%',
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 12,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Shimmer overlay — must NOT intercept taps, otherwise the button
                becomes unclickable on iOS Safari. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'pw-shimmer 2.5s linear infinite',
                pointerEvents: 'none',
              }}
            />
            <span style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>Start Free Trial</span>
          </button>

          {/* Maybe Later */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 14,
              cursor: 'pointer',
              padding: '10px 0',
              fontWeight: 500,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Maybe Later
          </button>
        </div>
        )}
      </div>
    </>
  )
}
