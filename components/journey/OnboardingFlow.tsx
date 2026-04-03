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
const GOAL_TIME_ESTIMATES: Record<DailyGoalTier, string> = {
  casual: '~5 min/day',
  regular: '~10 min/day',
  serious: '~20 min/day',
  intense: '30+ min/day',
}

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
  const remainDays = days % 30
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const remMonths = months % 12
    return remMonths > 0 ? `~${years}y ${remMonths}m` : `~${years} year${years > 1 ? 's' : ''}`
  }
  return remainDays > 0 ? `${months}m ${remainDays}d` : `${months} month${months > 1 ? 's' : ''}`
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

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Animated map illustration */}
      <div style={{
        position: 'relative', width: 120, height: 120, marginBottom: 32,
        animation: 'ob-popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 28, margin: '10px auto',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.08))',
          border: '1.5px solid rgba(99,102,241,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 40px rgba(99,102,241,0.15)',
          animation: 'ob-breathe 3s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>🗺️</span>
        </div>
        {/* Floating markers */}
        {[
          { emoji: '📍', x: 8, y: 2, delay: 0.3 },
          { emoji: '🏛️', x: 92, y: 12, delay: 0.5 },
          { emoji: '✨', x: 2, y: 88, delay: 0.7 },
        ].map(m => (
          <span key={m.emoji} style={{
            position: 'absolute', fontSize: 16, left: m.x, top: m.y,
            opacity: 0, animation: `ob-popIn 0.5s ease ${m.delay}s forwards`,
          }}>
            {m.emoji}
          </span>
        ))}
      </div>

      <h1 style={{
        fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
        textAlign: 'center', margin: 0, lineHeight: 1.25,
        letterSpacing: '-0.02em',
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.2s forwards',
      }}>
        Welcome to PadhAI UPSC
      </h1>

      <p style={{
        fontSize: 15, color: 'rgba(255,255,255,0.45)',
        textAlign: 'center', margin: '12px 0 0', lineHeight: 1.6,
        maxWidth: 300,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.35s forwards',
      }}>
        Your personalized journey through the entire UPSC syllabus starts here.
      </p>

      {/* Name input */}
      <div style={{
        marginTop: 40, width: '100%', maxWidth: 280,
        opacity: 0, animation: 'ob-slideUp 0.5s ease 0.5s forwards',
      }}>
        <label style={{
          display: 'block', fontSize: 13, fontWeight: 600,
          color: 'rgba(255,255,255,0.4)', marginBottom: 16, textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          What should we call you?
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Your first name"
          maxLength={24}
          style={{
            width: '100%', background: 'transparent',
            border: 'none', borderBottom: '2px solid rgba(99,102,241,0.35)',
            outline: 'none', color: 'rgba(255,255,255,0.92)',
            fontSize: 24, fontWeight: 700, textAlign: 'center',
            padding: '8px 0 12px', letterSpacing: '-0.01em',
            caretColor: '#818cf8',
            transition: 'border-color 300ms',
          }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = '#818cf8' }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = 'rgba(99,102,241,0.35)' }}
        />
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
          return (
            <button
              key={year}
              onClick={() => onSelect(year)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '20px 12px', borderRadius: 20,
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
              }}
            >
              <span style={{
                fontSize: 28, fontWeight: 800,
                color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.7)',
                transition: 'color 200ms',
              }}>
                {year}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, marginTop: 6,
                color: isActive
                  ? 'rgba(165,180,252,0.7)'
                  : 'rgba(255,255,255,0.3)',
                transition: 'color 200ms',
              }}>
                {isPast ? 'Already passed' : `${formatDaysRemaining(days)} away`}
              </span>
              {isActive && (
                <div style={{
                  width: 6, height: 6, borderRadius: 3, marginTop: 8,
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
        Set a daily XP goal. You can always change this later.
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
                  {GOAL_TIME_ESTIMATES[tier]}
                </div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: 'right',
                color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                transition: 'color 200ms',
              }}>
                {cfg.xpTarget} XP
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
              {days > 0 ? `${days} days remaining` : 'Exam period'}
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
              {goalCfg.label} — {goalCfg.xpTarget} XP/day
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              {GOAL_TIME_ESTIMATES[profile.dailyGoalTier]}
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
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

      {/* Step content with slide transition */}
      <div
        onKeyDown={step === 0 ? handleNameKeyDown : undefined}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
          position: 'relative', zIndex: 1,
          opacity: transitioning ? 0 : 1,
          transform: transitioning
            ? `translateX(${slideDir === 'next' ? '-40px' : '40px'})`
            : 'translateX(0)',
          transition: 'opacity 280ms ease, transform 280ms ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
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

      {/* Bottom: CTA Button */}
      <div style={{
        padding: '16px 24px',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', zIndex: 10,
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
