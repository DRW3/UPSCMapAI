'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  type DailyGoalTier,
  type UserProfile,
  type PrepStage,
  type ExamYear,
  DAILY_GOALS,
  PREP_STAGE_CONFIG,
  DEFAULT_PROFILE,
  PROFILE_STORAGE_KEY,
} from './types'
import { UPSC_SYLLABUS } from '@/data/syllabus'

// ── Storage ────────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = 'upsc-journey-onboarded'

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function markOnboardingComplete() {
  try { localStorage.setItem(ONBOARDING_KEY, '1') } catch {}
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7
const BG_COLOR = '#050510'
const EXAM_YEARS: ExamYear[] = [2026, 2027, 2028, 2029]
const PREP_STAGES: PrepStage[] = ['beginner', 'intermediate', 'advanced']
const GOAL_TIERS: DailyGoalTier[] = ['casual', 'regular', 'serious', 'intense']

// Subject list derived from syllabus
const SUBJECT_LIST = UPSC_SYLLABUS.map(s => ({
  id: s.id,
  icon: s.icon,
  label: s.shortTitle,
  color: s.color,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysUntilExam(year: ExamYear): number {
  // UPSC CSE Prelims is typically last Sunday of May
  const examDate = new Date(year, 4, 25) // approximate: May 25
  const now = new Date()
  const diff = examDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Exam imminent'
  if (days < 30) return `${days} days`
  const months = Math.floor(days / 30)
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const remMonths = months % 12
    if (remMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`
    return `${years} ${years === 1 ? 'year' : 'years'}, ${remMonths} ${remMonths === 1 ? 'month' : 'months'}`
  }
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

// ── Keyframes ──────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes ob-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ob-slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ob-slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ob-popIn {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ob-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}
@keyframes ob-fadeOrb {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ob-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes ob-pulse {
  0%, 100% { box-shadow: 0 4px 24px rgba(99,102,241,0.35); }
  50% { box-shadow: 0 4px 40px rgba(99,102,241,0.55), 0 0 60px rgba(99,102,241,0.15); }
}
@keyframes ob-pulseCta {
  0%, 100% { box-shadow: 0 4px 24px rgba(34,197,94,0.35); }
  50% { box-shadow: 0 4px 40px rgba(34,197,94,0.6), 0 0 60px rgba(34,197,94,0.2); }
}
@keyframes ob-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes ob-typewriterCursor {
  0%, 100% { border-color: rgba(99,102,241,0.8); }
  50% { border-color: transparent; }
}
@keyframes ob-ripple {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes ob-confetti1 {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-60px) rotate(360deg) translateX(20px); opacity: 0; }
}
@keyframes ob-confetti2 {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-50px) rotate(-270deg) translateX(-15px); opacity: 0; }
}
@keyframes ob-countUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ob-scaleIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ob-checkPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@property --ob-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes ob-orbRotate {
  to { --ob-angle: 360deg; }
}
@keyframes ob-orbBreathe {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.50;
    filter: blur(38px) hue-rotate(0deg);
  }
  50% {
    transform: scale(1.10) rotate(180deg);
    opacity: 0.75;
    filter: blur(44px) hue-rotate(30deg);
  }
}
/* ── Sentient AI core animations ─────────────────────────────────── */
@keyframes ob-ringSpin {
  to { transform: rotate(360deg); }
}
@keyframes ob-ringSpinReverse {
  to { transform: rotate(-360deg); }
}
@keyframes ob-corePulse {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 12px rgba(167,139,250,0.55));
  }
  50% {
    transform: scale(1.04);
    filter: drop-shadow(0 0 22px rgba(167,139,250,0.85));
  }
}
@keyframes ob-nodeBlink {
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 1; }
}
@keyframes ob-edgeFlow {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -16; }
}
@keyframes ob-hudScan {
  0%, 100% { transform: translateY(0); opacity: 0; }
  10%      { opacity: 0.55; }
  50%      { transform: translateY(150px); opacity: 0.55; }
  90%      { opacity: 0; }
}
@keyframes ob-orbitParticle {
  to { transform: rotate(360deg); }
}
`

// ── Background Orbs ────────────────────────────────────────────────────────────

function FloatingOrb({ color, size, x, y, delay }: {
  color: string; size: number; x: string; y: string; delay: number
}) {
  return (
    <div style={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      left: x, top: y, filter: 'blur(40px)', opacity: 0,
      animation: `ob-float 8s ease-in-out ${delay}s infinite, ob-fadeOrb 1.2s ease ${delay * 0.3}s forwards`,
    }} />
  )
}

function BackgroundOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <FloatingOrb color="rgba(99,102,241,0.08)" size={400} x="-10%" y="-10%" delay={0} />
      <FloatingOrb color="rgba(139,92,246,0.06)" size={350} x="60%" y="50%" delay={1} />
      <FloatingOrb color="rgba(52,211,153,0.04)" size={300} x="20%" y="75%" delay={2} />
    </div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const progress = ((step + 1) / total) * 100
  return (
    <div style={{
      width: '100%', height: 4, borderRadius: 2,
      background: 'rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: 2,
        background: 'linear-gradient(90deg, #6366f1, #a78bfa, #8b5cf6)',
        backgroundSize: '200% 100%',
        animation: 'ob-shimmer 3s linear infinite',
        width: `${progress}%`,
        transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
    </div>
  )
}

// ── Subject Pill ───────────────────────────────────────────────────────────────

function SubjectPill({ subject, selected, disabled, onToggle }: {
  subject: typeof SUBJECT_LIST[0]
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 14px', borderRadius: 14,
        background: selected
          ? `${subject.color}18`
          : disabled
            ? 'rgba(255,255,255,0.01)'
            : 'rgba(255,255,255,0.03)',
        border: selected
          ? `1.5px solid ${subject.color}50`
          : '1.5px solid rgba(255,255,255,0.06)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 200ms ease',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{subject.icon}</span>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: selected ? subject.color : 'rgba(255,255,255,0.55)',
        transition: 'color 200ms',
        whiteSpace: 'nowrap',
      }}>
        {subject.label}
      </span>
      {selected && (
        <span style={{
          width: 16, height: 16, borderRadius: 8, marginLeft: 2,
          background: `${subject.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'ob-checkPop 0.3s ease forwards',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke={subject.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  )
}

// ── Step Components ────────────────────────────────────────────────────────────

// Step 1: Welcome + Name
function WelcomeStep({ name, onNameChange }: { name: string; onNameChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const firstName = name.trim().split(' ')[0]

  // Auto-focus after intro animation; delay scrollIntoView so the keyboard
  // animation finishes before iOS measures.
  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 650)
    return () => clearTimeout(focusTimer)
  }, [])

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 320)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* ── Hero: breathing conic-gradient orb behind logo ─────────────── */}
      <div style={{
        position: 'relative',
        width: 'clamp(140px, 38vw, 180px)',
        height: 'clamp(140px, 38vw, 180px)',
        marginBottom: 28, marginTop: 4,
        animation: 'ob-popIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>
        {/* Outer breathing conic-gradient halo */}
        <div style={{
          position: 'absolute', inset: -26, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #6366f1, #ec4899, #f59e0b, #06b6d4, #6366f1)',
          filter: 'blur(38px)',
          opacity: 0.55,
          animation: 'ob-orbBreathe 7s ease-in-out infinite',
        }} />
        {/* Inner glass disc */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.18) 0%, rgba(15,15,28,0.92) 60%, rgba(8,8,16,0.98) 100%)',
          border: '1.5px solid rgba(167,139,250,0.28)',
          boxShadow: '0 12px 60px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Inner rotating conic shimmer */}
          <div style={{
            position: 'absolute', inset: '8%', borderRadius: '50%',
            background: 'conic-gradient(from var(--ob-angle, 0deg), transparent, rgba(167,139,250,0.10), transparent 30%)',
            animation: 'ob-orbRotate 6s linear infinite',
          }} />
          {/* ── AI Study Guide icon ──────────────────────────────────
              The Ashoka Chakra — the 24-spoke wheel of dharma at the
              centre of India's national flag and the visual signature
              of the Indian Republic and the Civil Services — re-imagined
              as the skeleton of an AI. 24 spokes converge from the rim
              into a glowing intelligence at the hub: the entire
              syllabus flowing inward into the model. The whole wheel
              rotates slowly forward, the way the Chakra has always
              represented continuous progress. Every element is
              load-bearing:
                • 24 spokes  = Chakra of Dharma — UPSC, India, the
                               syllabus arriving at the AI
                • Outer ring = the boundary of the syllabus
                • Tip nodes  = neural-net feel along the rim
                • Bright core = the AI insight at the centre of the wheel
                • Slow rotation = the aspirant's preparation, always moving forward
              Two colours total: cyan (#6EE7FF) + violet (#8B5CF6).
              Four animations: ringSpin, edgeFlow, nodeBlink, corePulse. */}
          <svg
            viewBox="0 0 100 100"
            width="86%"
            height="86%"
            fill="none"
            style={{
              position: 'relative', zIndex: 1,
              overflow: 'visible',
              filter: 'drop-shadow(0 0 26px rgba(110,231,255,0.42))',
            }}
          >
            <defs>
              {/* Shared cyan → violet stroke gradient */}
              <linearGradient id="ob-edu-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"  stopColor="#6EE7FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              {/* Central AI core radial gradient */}
              <radialGradient id="ob-edu-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%"  stopColor="#ffffff" stopOpacity="1" />
                <stop offset="55%" stopColor="#6EE7FF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.85" />
              </radialGradient>
            </defs>

            {/* ── The wheel: outer rim, inner hub, 24 spokes, 24 tip
                 nodes. The whole group rotates as one rigid wheel —
                 the Chakra's traditional reading of "dharma in
                 continuous motion" — at 36s per revolution, calm
                 but unmistakable. ── */}
            <g style={{
              transformOrigin: '50px 50px',
              animation: 'ob-ringSpin 36s linear infinite',
            }}>
              {/* Outer rim — the boundary of the syllabus */}
              <circle cx="50" cy="50" r="40"
                stroke="url(#ob-edu-grad)" strokeWidth="1.4" />
              {/* Faint inner halo ring, just inside the rim */}
              <circle cx="50" cy="50" r="37"
                stroke="url(#ob-edu-grad)" strokeWidth="0.5" opacity="0.35" />
              {/* Inner hub — the small central ring the spokes meet */}
              <circle cx="50" cy="50" r="9.5"
                stroke="url(#ob-edu-grad)" strokeWidth="1" opacity="0.85" />

              {/* 24 spokes — drawn rim → hub so the dashed flow
                  appears to travel inward, syllabus knowledge
                  arriving at the AI core. */}
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i * 15 * Math.PI) / 180
                const c = Math.cos(a)
                const s = Math.sin(a)
                return (
                  <line
                    key={`ob-chakra-spoke-${i}`}
                    x1={50 + 38 * c} y1={50 + 38 * s}
                    x2={50 + 9.5 * c} y2={50 + 9.5 * s}
                    stroke="url(#ob-edu-grad)"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                    strokeDasharray="2 3"
                    opacity="0.82"
                    style={{ animation: 'ob-edgeFlow 2.4s linear infinite' }}
                  />
                )
              })}

              {/* 24 tip nodes at the rim — subtle cyan dots, each
                  staggered into a slow blinking wave so the wheel
                  reads as a neural net as well as a chakra. */}
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i * 15 * Math.PI) / 180
                const cx = 50 + 40 * Math.cos(a)
                const cy = 50 + 40 * Math.sin(a)
                return (
                  <circle
                    key={`ob-chakra-tip-${i}`}
                    cx={cx} cy={cy} r="0.95"
                    fill="#6EE7FF"
                    style={{
                      filter: 'drop-shadow(0 0 3px rgba(110,231,255,0.95))',
                      animation: `ob-nodeBlink 3.6s ease-in-out ${(i % 6) * 0.18}s infinite`,
                    }}
                  />
                )
              })}
            </g>

            {/* ── Central AI core — the "insight" at the hub of the
                 Chakra. Soft halo + bright core dot, 2.4s heartbeat
                 pulse. Sits outside the rotating wheel so the eye has
                 a stable focal point in the centre. ── */}
            <g style={{
              transformOrigin: '50px 50px',
              animation: 'ob-corePulse 2.4s ease-in-out infinite',
            }}>
              <circle cx="50" cy="50" r="7"
                fill="url(#ob-edu-core)" opacity="0.55" />
              <circle cx="50" cy="50" r="3.2" fill="#ffffff"
                style={{ filter: 'drop-shadow(0 0 8px rgba(110,231,255,0.98))' }} />
            </g>
          </svg>
        </div>
        {/* (Minimal composition — the Ashoka Chakra reimagined as
            an AI brain reads as the only visual element.) */}
      </div>

      {/* ── Headline ─────────────────────────────────────────────────── */}
      <h1 style={{
        fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 800,
        color: 'rgba(255,255,255,0.97)',
        textAlign: 'center', margin: 0, lineHeight: 1.18,
        letterSpacing: '-0.025em',
        opacity: 0, animation: 'ob-slideUp 0.55s ease 0.2s forwards',
      }}>
        Welcome to{' '}
        <span style={{
          display: 'inline-block',
          background: 'linear-gradient(180deg, #ffffff 0%, #c4b5fd 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          paddingBottom: '0.08em',
          fontWeight: 900,
          letterSpacing: '-0.02em',
        }}>PadhAI</span>
      </h1>

      {/* ── Subtitle: simple plain English, morphs as user types ─────── */}
      <p style={{
        fontSize: 16, fontWeight: 500,
        color: firstName ? 'rgba(196,181,253,0.95)' : 'rgba(255,255,255,0.78)',
        textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5,
        maxWidth: 320, padding: '0 12px',
        letterSpacing: '-0.005em',
        transition: 'color 300ms ease',
        opacity: 0, animation: 'ob-slideUp 0.55s ease 0.32s forwards',
        minHeight: 48,
      }}>
        {firstName
          ? `Hi ${firstName}! Let's start your UPSC journey.`
          : 'Your AI study guide for the UPSC exam.'}
      </p>

      {/* ── Name input ───────────────────────────────────────────────── */}
      <div style={{
        marginTop: 32, width: '100%', maxWidth: 320,
        opacity: 0, animation: 'ob-slideUp 0.55s ease 0.45s forwards',
      }}>
        <label
          htmlFor="ob-name-input"
          style={{
            display: 'block', fontSize: 12, fontWeight: 700,
            color: 'rgba(167,139,250,0.85)', marginBottom: 14, textAlign: 'center',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}
        >
          What should we call you?
        </label>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            id="ob-name-input"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            onFocus={handleFocus}
            placeholder="Your first name"
            maxLength={24}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.025)',
              border: '1.5px solid rgba(167,139,250,0.30)',
              borderRadius: 16, outline: 'none',
              color: 'rgba(255,255,255,0.97)',
              fontSize: 22, fontWeight: 700, textAlign: 'center',
              padding: '16px 20px', letterSpacing: '-0.015em',
              caretColor: '#a78bfa',
              transition: 'all 250ms ease',
              boxShadow: '0 4px 24px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
              WebkitAppearance: 'none',
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.30)'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
            }}
            onFocusCapture={e => {
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.65)'
              e.currentTarget.style.boxShadow = '0 4px 32px rgba(167,139,250,0.20), inset 0 1px 0 rgba(255,255,255,0.06)'
            }}
          />
          {/* Animated underline accent */}
          <div style={{
            position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
            width: firstName ? '60%' : '0%',
            height: 2, borderRadius: 2,
            background: 'linear-gradient(90deg, #a78bfa, #ec4899, #06b6d4)',
            backgroundSize: '200% 100%',
            transition: 'width 400ms cubic-bezier(0.34,1.56,0.64,1)',
            animation: firstName ? 'ob-shimmer 2s linear infinite' : 'none',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    </div>
  )
}

// Step 2: Exam Year
function ExamYearStep({ selected, onSelect }: { selected: ExamYear; onSelect: (y: ExamYear) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{
        fontSize: 52, lineHeight: 1, marginBottom: 24,
        opacity: 0, animation: 'ob-popIn 0.5s ease 0.1s forwards',
      }}>
        📅
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', margin: 0, lineHeight: 1.3,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.15s forwards',
      }}>
        When are you appearing for UPSC CSE?
      </h1>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.4)',
        textAlign: 'center', margin: '8px 0 28px',
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.25s forwards',
      }}>
        We&apos;ll plan your preparation timeline accordingly
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 12, width: '100%', maxWidth: 320,
      }}>
        {EXAM_YEARS.map((year, i) => {
          const days = daysUntilExam(year)
          const isActive = year === selected
          const isPast = days === 0
          const months = Math.floor(days / 30)
          // Visual urgency: green (>18mo) → yellow (6-18mo) → orange (3-6mo) → red (<3mo)
          const urgencyColor = isPast ? 'rgba(255,255,255,0.2)'
            : months > 18 ? '#34d399'
            : months > 6 ? '#fbbf24'
            : months > 3 ? '#fb923c'
            : '#f87171'
          return (
            <button
              key={year}
              onClick={() => onSelect(year)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '20px 14px 16px', borderRadius: 20,
                background: isActive
                  ? 'rgba(99,102,241,0.12)'
                  : 'rgba(255,255,255,0.025)',
                border: isActive
                  ? '1.5px solid rgba(99,102,241,0.45)'
                  : '1.5px solid rgba(255,255,255,0.06)',
                boxShadow: isActive
                  ? '0 4px 24px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 250ms ease',
                opacity: 0,
                animation: `ob-scaleIn 0.4s ease ${0.2 + i * 0.08}s forwards`,
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Year */}
              <span style={{
                fontSize: 28, fontWeight: 800,
                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.7)',
                transition: 'color 200ms',
              }}>
                {year}
              </span>

              {/* Time remaining — clear, readable */}
              <span style={{
                fontSize: 12, fontWeight: 600, marginTop: 8,
                color: isActive ? urgencyColor : 'rgba(255,255,255,0.35)',
                transition: 'color 200ms',
                lineHeight: 1.3, textAlign: 'center',
              }}>
                {isPast ? 'Already passed' : formatDaysRemaining(days)}
              </span>

              {/* Days count */}
              {!isPast && (
                <span style={{
                  fontSize: 10, fontWeight: 500, marginTop: 3,
                  color: 'rgba(255,255,255,0.25)',
                }}>
                  {days.toLocaleString()} days
                </span>
              )}

              {/* Selected indicator */}
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: 0, left: '20%', right: '20%',
                  height: 3, borderRadius: '3px 3px 0 0',
                  background: '#818cf8',
                  animation: 'ob-popIn 0.3s ease forwards',
                }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Step 3: Prep Stage
function PrepStageStep({ selected, onSelect }: { selected: PrepStage; onSelect: (s: PrepStage) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{
        fontSize: 52, lineHeight: 1, marginBottom: 24,
        opacity: 0, animation: 'ob-popIn 0.5s ease 0.1s forwards',
      }}>
        🎓
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', margin: 0, lineHeight: 1.3,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.15s forwards',
      }}>
        Where are you in your preparation?
      </h1>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.4)',
        textAlign: 'center', margin: '8px 0 28px',
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.25s forwards',
      }}>
        This helps us calibrate difficulty and recommendations
      </p>

      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: 12, width: '100%', maxWidth: 320,
      }}>
        {PREP_STAGES.map((stage, i) => {
          const cfg = PREP_STAGE_CONFIG[stage]
          const isActive = stage === selected
          return (
            <button
              key={stage}
              onClick={() => onSelect(stage)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '18px 20px', borderRadius: 18,
                background: isActive
                  ? 'rgba(99,102,241,0.12)'
                  : 'rgba(255,255,255,0.025)',
                border: isActive
                  ? '1.5px solid rgba(99,102,241,0.45)'
                  : '1.5px solid rgba(255,255,255,0.06)',
                boxShadow: isActive
                  ? '0 4px 24px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 250ms ease',
                opacity: 0,
                animation: `ob-scaleIn 0.4s ease ${0.2 + i * 0.1}s forwards`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                fontSize: 28, lineHeight: 1, flexShrink: 0,
                animation: isActive ? 'ob-breathe 2s ease-in-out infinite' : 'none',
              }}>
                {cfg.icon}
              </span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.65)',
                  transition: 'color 200ms',
                }}>
                  {cfg.label}
                </div>
                <div style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2,
                  lineHeight: 1.3,
                }}>
                  {cfg.description}
                </div>
              </div>
              {/* Radio indicator */}
              <div style={{
                width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                border: isActive ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms',
              }}>
                {isActive && (
                  <div style={{
                    width: 10, height: 10, borderRadius: 5,
                    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                    animation: 'ob-popIn 0.25s ease forwards',
                  }} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Step 4 & 5: Subject Selection Grid
function SubjectSelectStep({ title, subtitle, icon, selected, onToggle, disabledIds, minCount, maxCount }: {
  title: string
  subtitle: string
  icon: string
  selected: string[]
  onToggle: (id: string) => void
  disabledIds: Set<string>
  minCount: number
  maxCount: number
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
    }}>
      <div style={{
        fontSize: 52, lineHeight: 1, marginBottom: 24,
        opacity: 0, animation: 'ob-popIn 0.5s ease 0.1s forwards',
      }}>
        {icon}
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', margin: 0, lineHeight: 1.3,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.15s forwards',
      }}>
        {title}
      </h1>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.4)',
        textAlign: 'center', margin: '8px 0 4px',
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.25s forwards',
      }}>
        {subtitle}
      </p>

      {/* Count indicator */}
      <div style={{
        fontSize: 12, fontWeight: 600, marginBottom: 20,
        color: selected.length >= minCount
          ? 'rgba(99,102,241,0.7)'
          : 'rgba(255,255,255,0.25)',
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.3s forwards',
        transition: 'color 200ms',
      }}>
        {selected.length} selected {maxCount < Infinity ? `(${minCount}-${maxCount} recommended)` : `(${minCount}+ recommended)`}
      </div>

      {/* Subject grid */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        justifyContent: 'center', width: '100%', maxWidth: 360,
        opacity: 0, animation: 'ob-fadeIn 0.4s ease 0.3s forwards',
        maxHeight: 280, overflowY: 'auto',
        padding: '4px 0',
        // Custom scrollbar hidden
        scrollbarWidth: 'none',
      }}>
        {SUBJECT_LIST.map(subject => (
          <SubjectPill
            key={subject.id}
            subject={subject}
            selected={selected.includes(subject.id)}
            disabled={disabledIds.has(subject.id)}
            onToggle={() => onToggle(subject.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Step 6: Daily Goal
function DailyGoalStep({ selected, onSelect }: {
  selected: DailyGoalTier; onSelect: (tier: DailyGoalTier) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{
        fontSize: 52, lineHeight: 1, marginBottom: 24,
        opacity: 0, animation: 'ob-popIn 0.5s ease 0.1s forwards',
      }}>
        🎯
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', margin: 0, lineHeight: 1.3,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.15s forwards',
      }}>
        How much can you study each day?
      </h1>

      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.4)',
        textAlign: 'center', margin: '8px 0 28px',
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.25s forwards',
      }}>
        Set daily reading and practice targets. You can change this later.
      </p>

      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: 10, width: '100%', maxWidth: 320,
      }}>
        {GOAL_TIERS.map((tier, i) => {
          const cfg = DAILY_GOALS[tier]
          const isActive = tier === selected
          return (
            <button
              key={tier}
              onClick={() => onSelect(tier)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 18,
                background: isActive
                  ? 'rgba(99,102,241,0.12)'
                  : 'rgba(255,255,255,0.025)',
                border: isActive
                  ? '1.5px solid rgba(99,102,241,0.45)'
                  : '1.5px solid rgba(255,255,255,0.06)',
                boxShadow: isActive
                  ? '0 4px 24px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 250ms ease',
                opacity: 0,
                animation: `ob-scaleIn 0.4s ease ${0.2 + i * 0.08}s forwards`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{cfg.icon}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: 15, fontWeight: 700,
                  color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                  transition: 'color 200ms',
                }}>
                  {cfg.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {cfg.timeEstimate}
                </div>
              </div>
              <div style={{
                textAlign: 'right', flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                  transition: 'color 200ms',
                }}>
                  {cfg.readTarget} read · {cfg.practiceTarget} practice
                </div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                border: isActive ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms',
              }}>
                {isActive && (
                  <div style={{
                    width: 10, height: 10, borderRadius: 5,
                    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                    animation: 'ob-popIn 0.25s ease forwards',
                  }} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Step 7: Summary
function SummaryStep({ profile }: { profile: UserProfile }) {
  const days = daysUntilExam(profile.examYear)
  const stageCfg = PREP_STAGE_CONFIG[profile.prepStage]
  const goalCfg = DAILY_GOALS[profile.dailyGoalTier]

  const strongLabels = profile.strongSubjects.map(id =>
    SUBJECT_LIST.find(s => s.id === id)
  ).filter(Boolean)

  const weakLabels = profile.weakSubjects.map(id =>
    SUBJECT_LIST.find(s => s.id === id)
  ).filter(Boolean)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
    }}>
      {/* Celebration header */}
      <div style={{
        position: 'relative', marginBottom: 20,
        opacity: 0, animation: 'ob-popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s forwards',
      }}>
        <span style={{ fontSize: 56, lineHeight: 1 }}>🚀</span>
        {/* Confetti particles */}
        {['🎉', '✨', '⭐', '💫'].map((e, i) => (
          <span key={i} style={{
            position: 'absolute', fontSize: 14,
            left: `${20 + i * 20}%`, top: -5,
            animation: `${i % 2 === 0 ? 'ob-confetti1' : 'ob-confetti2'} 1.2s ease ${0.4 + i * 0.15}s forwards`,
            opacity: 0,
          }}>
            {e}
          </span>
        ))}
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', margin: 0, lineHeight: 1.3,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.2s forwards',
      }}>
        You&apos;re all set, {profile.name || 'Aspirant'}!
      </h1>

      <p style={{
        fontSize: 14, color: 'rgba(255,255,255,0.45)',
        textAlign: 'center', margin: '8px 0 24px', lineHeight: 1.5,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.3s forwards',
      }}>
        Your personalized plan is ready
      </p>

      {/* Summary card */}
      <div style={{
        width: '100%', maxWidth: 320, borderRadius: 22,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 16,
        opacity: 0, animation: 'ob-scaleIn 0.5s ease 0.35s forwards',
      }}>
        {/* Exam countdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              UPSC CSE {profile.examYear}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              {days > 0 ? `${formatDaysRemaining(days)} (${days.toLocaleString()} days)` : 'Exam period'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* Prep stage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {stageCfg.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              {stageCfg.label}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              {stageCfg.description}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* Daily goal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {goalCfg.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              {goalCfg.label} — {goalCfg.readTarget} read, {goalCfg.practiceTarget} practice/day
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              {goalCfg.timeEstimate}
            </div>
          </div>
        </div>

        {/* Subjects row */}
        {(strongLabels.length > 0 || weakLabels.length > 0) && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {strongLabels.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(52,211,153,0.7)', letterSpacing: '0.06em', marginBottom: 4 }}>
                    STRONG IN
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {strongLabels.map(s => s && (
                      <span key={s.id} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 8,
                        background: 'rgba(52,211,153,0.08)',
                        color: 'rgba(52,211,153,0.8)', fontWeight: 600,
                      }}>
                        {s.icon} {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {weakLabels.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(251,146,60,0.7)', letterSpacing: '0.06em', marginBottom: 4 }}>
                    FOCUSING ON
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {weakLabels.map(s => s && (
                      <span key={s.id} style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 8,
                        background: 'rgba(251,146,60,0.08)',
                        color: 'rgba(251,146,60,0.8)', fontWeight: 600,
                      }}>
                        {s.icon} {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [slideDir, setSlideDir] = useState<'next' | 'prev'>('next')
  const containerRef = useRef<HTMLDivElement>(null)

  // Profile state
  const [name, setName] = useState(DEFAULT_PROFILE.name)
  const [examYear, setExamYear] = useState<ExamYear>(DEFAULT_PROFILE.examYear)
  const [prepStage, setPrepStage] = useState<PrepStage>(DEFAULT_PROFILE.prepStage)
  const [strongSubjects, setStrongSubjects] = useState<string[]>(DEFAULT_PROFILE.strongSubjects)
  const [weakSubjects, setWeakSubjects] = useState<string[]>(DEFAULT_PROFILE.weakSubjects)
  const [dailyGoalTier, setDailyGoalTier] = useState<DailyGoalTier>(DEFAULT_PROFILE.dailyGoalTier)

  // Touch swipe
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const isLastStep = step === TOTAL_STEPS - 1

  // Build profile object
  const profile = useMemo<UserProfile>(() => ({
    name: name.trim(),
    examYear,
    prepStage,
    strongSubjects,
    weakSubjects,
    dailyGoalTier,
    onboardedAt: new Date().toISOString(),
  }), [name, examYear, prepStage, strongSubjects, weakSubjects, dailyGoalTier])

  // Validation per step
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return name.trim().length > 0
      case 1: return true // exam year always has default
      case 2: return true // prep stage always has default
      case 3: return strongSubjects.length >= 1
      case 4: return weakSubjects.length >= 1
      case 5: return true // daily goal always has default
      case 6: return true // summary
      default: return true
    }
  }, [step, name, strongSubjects, weakSubjects])

  // Subject toggle helpers
  const toggleStrong = useCallback((id: string) => {
    setStrongSubjects(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : prev.length < 6 ? [...prev, id] : prev
    )
  }, [])

  const toggleWeak = useCallback((id: string) => {
    setWeakSubjects(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : prev.length < 6 ? [...prev, id] : prev
    )
  }, [])

  const strongSet = useMemo(() => new Set(strongSubjects), [strongSubjects])
  const weakSet = useMemo(() => new Set(weakSubjects), [weakSubjects])

  // Navigation
  const goNext = useCallback(() => {
    if (transitioning || !canProceed) return
    if (isLastStep) {
      // Save profile to localStorage
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
      } catch {}
      markOnboardingComplete()
      onComplete(profile)
      return
    }
    setSlideDir('next')
    setTransitioning(true)
    setTimeout(() => {
      setStep(s => Math.min(TOTAL_STEPS - 1, s + 1))
      setTransitioning(false)
    }, 280)
  }, [transitioning, canProceed, isLastStep, profile, onComplete])

  const goPrev = useCallback(() => {
    if (transitioning || step === 0) return
    setSlideDir('prev')
    setTransitioning(true)
    setTimeout(() => {
      setStep(s => Math.max(0, s - 1))
      setTransitioning(false)
    }, 280)
  }, [transitioning, step])

  const handleSkip = useCallback(() => {
    // Save whatever we have so far
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    } catch {}
    markOnboardingComplete()
    onComplete(profile)
  }, [profile, onComplete])

  // Touch handlers for swiping
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }, [goNext, goPrev])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') handleSkip()
      // Enter to proceed — but not if we're on step 0 (name input) and input is focused
      if (e.key === 'Enter' && step !== 0) goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, handleSkip, step])

  // Enter key on name input
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed) goNext()
  }, [canProceed, goNext])

  // Track soft-keyboard offset for iOS Safari (visualViewport) so the bottom CTA
  // floats above the keyboard. Android handles this via interactiveWidget meta + dvh.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--ob-kb-offset', `${offset}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.removeProperty('--ob-kb-offset')
    }
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        height: '100dvh', // dynamic viewport — shrinks when keyboard opens
        background: BG_COLOR,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'ob-fadeIn 0.3s ease',
      }}
    >
      <style>{KEYFRAMES}</style>

      <BackgroundOrbs />

      {/* Header: Back / Progress / Skip */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        position: 'relative', zIndex: 10,
      }}>
        {/* Top row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px 0',
          height: 44,
        }}>
          {/* Back button */}
          {step > 0 ? (
            <button
              onClick={goPrev}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                padding: '8px 10px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'color 200ms',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          ) : (
            <div style={{ width: 60 }} />
          )}

          {/* Step label */}
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.04em',
          }}>
            {step + 1} / {TOTAL_STEPS}
          </span>

          {/* Skip button */}
          {!isLastStep ? (
            <button
              onClick={handleSkip}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)',
                padding: '8px 10px', borderRadius: 8,
                transition: 'color 200ms',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Skip
            </button>
          ) : (
            <div style={{ width: 60 }} />
          )}
        </div>

        {/* Progress bar */}
        <div style={{ padding: '8px 20px 0' }}>
          <ProgressBar step={step} total={TOTAL_STEPS} />
        </div>
      </div>

      {/* Step content with slide transition.
          NOTE: justify-content removed in favor of `margin: auto 0` on each step's
          inner container — this centers content when there's room AND lets it
          scroll from the top when the keyboard squeezes the viewport. */}
      <div
        onKeyDown={step === 0 ? handleNameKeyDown : undefined}
        style={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'stretch',
          padding: '8px 24px 8px',
          position: 'relative', zIndex: 1,
          opacity: transitioning ? 0 : 1,
          transform: transitioning
            ? `translateX(${slideDir === 'next' ? '-40px' : '40px'})`
            : 'translateX(0)',
          transition: 'opacity 280ms ease, transform 280ms ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {/* margin:auto wrapper centers vertically when there's room AND
            allows top-anchored scrolling when the keyboard squeezes */}
        <div style={{
          margin: 'auto 0', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 16, paddingBottom: 16,
        }}>
          {step === 0 && (
            <WelcomeStep name={name} onNameChange={setName} />
          )}
          {step === 1 && (
            <ExamYearStep selected={examYear} onSelect={setExamYear} />
          )}
          {step === 2 && (
            <PrepStageStep selected={prepStage} onSelect={setPrepStage} />
          )}
          {step === 3 && (
            <SubjectSelectStep
              title="Which subjects are you confident in?"
              subtitle="Pick 2-4 subjects you feel good about"
              icon="💪"
              selected={strongSubjects}
              onToggle={toggleStrong}
              disabledIds={weakSet}
              minCount={2}
              maxCount={4}
            />
          )}
          {step === 4 && (
            <SubjectSelectStep
              title="Which subjects do you want to improve?"
              subtitle="We'll prioritize these in your practice"
              icon="🎯"
              selected={weakSubjects}
              onToggle={toggleWeak}
              disabledIds={strongSet}
              minCount={2}
              maxCount={4}
            />
          )}
          {step === 5 && (
            <DailyGoalStep selected={dailyGoalTier} onSelect={setDailyGoalTier} />
          )}
          {step === 6 && (
            <SummaryStep profile={profile} />
          )}
        </div>
      </div>

      {/* Bottom: CTA Button — keyboard-aware padding so it always floats
          above the soft keyboard on iOS + Android. */}
      <div style={{
        padding: '14px 24px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px), env(keyboard-inset-height, 0px), var(--ob-kb-offset, 0px))',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', zIndex: 10,
        background: 'linear-gradient(180deg, transparent, rgba(5,5,16,0.9) 30%, #050510)',
        transition: 'padding-bottom 180ms ease-out',
      }}>
        <button
          onClick={goNext}
          disabled={!canProceed}
          style={{
            width: '100%', maxWidth: 340, height: 56,
            borderRadius: 16, border: 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            background: !canProceed
              ? 'rgba(255,255,255,0.06)'
              : isLastStep
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: !canProceed ? 'rgba(255,255,255,0.25)' : '#fff',
            fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: !canProceed
              ? 'none'
              : isLastStep
                ? '0 4px 24px rgba(34,197,94,0.3)'
                : '0 4px 24px rgba(99,102,241,0.3)',
            animation: isLastStep && canProceed ? 'ob-pulseCta 2s ease-in-out infinite' : 'none',
            transition: 'all 300ms ease',
            WebkitTapHighlightColor: 'transparent',
            letterSpacing: '0.02em',
          }}
        >
          {isLastStep ? (
            <>
              Start Learning
              <span style={{ fontSize: 18 }}>🚀</span>
            </>
          ) : step === 0 ? (
            <>
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          ) : (
            <>
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
