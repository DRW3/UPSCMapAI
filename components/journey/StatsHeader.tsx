'use client'

import { useState, useRef, useEffect } from 'react'
import type { JourneyProgress } from '@/components/journey/types'
import { DAILY_GOALS } from '@/components/journey/types'
import type { LearningSubject } from '@/data/syllabus'

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatsHeaderProps {
  progress: JourneyProgress
  subjects: LearningSubject[]
  activeSubjectId: string | null
  onSubjectChange: (id: string | null) => void
  totalTopics: number
  completedTopics: number
  onOpenGoalModal?: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLevel(xp: number): number {
  // Every 500 XP = 1 level
  return Math.floor(xp / 500) + 1
}

function getXpInLevel(xp: number): number {
  return xp % 500
}

// ── Inline SVG Icons ───────────────────────────────────────────────────────────

function FireIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C10.5 6 6 8.5 6 13c0 3.5 2.5 7 6 7s6-3.5 6-7c0-4.5-4.5-7-6-11z"
        fill="url(#fireGrad)"
      />
      <path
        d="M12 10c-1 2-3 3.5-3 5.5C9 17.5 10.3 19 12 19s3-1.5 3-3.5c0-2-2-3.5-3-5.5z"
        fill="#FBBF24"
        opacity={0.9}
      />
      <defs>
        <linearGradient id="fireGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function GemIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h12l4 7-10 12L2 10l4-7z" fill="url(#gemGrad)" />
      <path d="M2 10h20L12 22 2 10z" fill="url(#gemGrad2)" opacity={0.8} />
      <path d="M8 3l4 7-4 0L6 3h2z" fill="#67E8F9" opacity={0.5} />
      <path d="M16 3l-4 7 4 0 2-7h-2z" fill="#22D3EE" opacity={0.3} />
      <defs>
        <linearGradient id="gemGrad" x1="12" y1="3" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67E8F9" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="gemGrad2" x1="12" y1="10" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function HeartIcon({ size = 20, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? 'url(#heartGrad)' : 'none'}
        stroke={filled ? 'none' : 'rgba(255,255,255,0.2)'}
        strokeWidth={filled ? 0 : 1.5}
      />
      {filled && (
        <defs>
          <linearGradient id="heartGrad" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FB7185" />
            <stop offset="1" stopColor="#E11D48" />
          </linearGradient>
        </defs>
      )}
    </svg>
  )
}

function LightningIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2L4 14h7l-2 8 9-12h-7l2-8z"
        fill="url(#boltGrad)"
      />
      <defs>
        <linearGradient id="boltGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Hearts Row (for < 5 hearts) ────────────────────────────────────────────────

function HeartsRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map(i => (
        <HeartIcon key={i} size={10} filled={i < count} />
      ))}
    </div>
  )
}

// ── Stat Item ──────────────────────────────────────────────────────────────────

function StatItem({
  icon,
  value,
  color,
  subContent,
  onClick,
}: {
  icon: React.ReactNode
  value: string
  color: string
  subContent?: React.ReactNode
  onClick?: () => void
}) {
  const [tapped, setTapped] = useState(false)

  const handleTap = () => {
    setTapped(true)
    setTimeout(() => setTapped(false), 200)
    onClick?.()
  }

  return (
    <button
      onClick={handleTap}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-transform duration-150"
      style={{
        transform: tapped ? 'scale(0.9)' : 'scale(1)',
      }}
    >
      <div
        className="relative"
        style={{
          filter: `drop-shadow(0 0 6px ${color}40)`,
        }}
      >
        {icon}
      </div>
      <span
        className="text-[12px] font-bold leading-tight tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
      {subContent}
    </button>
  )
}

// ── Vertical Divider ───────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      className="w-px self-stretch my-2"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    />
  )
}

// ── Subject Tab ────────────────────────────────────────────────────────────────

function SubjectFilterTab({
  label,
  icon,
  color,
  active,
  onClick,
}: {
  label: string
  icon: string
  color: string
  active: boolean
  onClick: () => void
}) {
  const [tapped, setTapped] = useState(false)

  const handleTap = () => {
    setTapped(true)
    setTimeout(() => setTapped(false), 150)
    onClick()
  }

  return (
    <button
      onClick={handleTap}
      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 whitespace-nowrap"
      style={{
        background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
        color: active ? color : 'rgba(255,255,255,0.4)',
        border: `1.5px solid ${active ? color + '55' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: active ? `0 0 16px ${color}15, inset 0 1px 0 ${color}10` : 'none',
        transform: tapped ? 'scale(0.95)' : active ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// ── Daily Goal Stat with ring ─────────────────────────────────────────────────

function DailyGoalStat({
  todayXp,
  goalXp,
  level,
  onClick,
}: {
  todayXp: number
  goalXp: number
  totalXp: number
  level: number
  onClick?: () => void
}) {
  const [tapped, setTapped] = useState(false)
  const pct = Math.min(100, (todayXp / goalXp) * 100)
  const goalMet = pct >= 100
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (circumference * pct) / 100

  const handleTap = () => {
    setTapped(true)
    setTimeout(() => setTapped(false), 200)
    onClick?.()
  }

  return (
    <button
      onClick={handleTap}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-transform duration-150"
      style={{ transform: tapped ? 'scale(0.9)' : 'scale(1)' }}
    >
      {/* Ring around lightning icon */}
      <div className="relative" style={{ width: 34, height: 34 }}>
        <svg width="34" height="34" viewBox="0 0 34 34" className="absolute inset-0">
          {/* Background ring */}
          <circle cx="17" cy="17" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          {/* Progress ring */}
          <circle
            cx="17" cy="17" r={radius}
            fill="none"
            stroke={goalMet ? '#34d399' : '#fbbf24'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-500"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', filter: goalMet ? 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' : undefined }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' }}>
          {goalMet ? (
            <span className="text-[14px]">✅</span>
          ) : (
            <LightningIcon size={18} />
          )}
        </div>
      </div>
      <span className="text-[12px] font-bold leading-tight tabular-nums" style={{ color: goalMet ? '#34d399' : '#FBBF24' }}>
        {todayXp}/{goalXp}
      </span>
      <span className="text-[8px] font-medium" style={{ color: 'rgba(251,191,36,0.5)' }}>
        LV {level}
      </span>
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StatsHeader({
  progress,
  subjects,
  activeSubjectId,
  onSubjectChange,
  totalTopics,
  completedTopics,
  onOpenGoalModal,
}: StatsHeaderProps) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const [streakDetailOpen, setStreakDetailOpen] = useState(false)

  const level = getLevel(progress.totalXp)
  const xpInLevel = getXpInLevel(progress.totalXp)
  const heartsDisplay = progress.hearts >= 99 ? '∞' : String(progress.hearts)
  const isUnlimitedHearts = progress.hearts >= 99
  const showHeartsRow = !isUnlimitedHearts && progress.hearts < 5

  // Scroll active tab into view
  useEffect(() => {
    if (tabsRef.current && activeSubjectId) {
      const activeEl = tabsRef.current.querySelector('[data-active="true"]') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [activeSubjectId])

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Stats Row */}
      <div
        className="flex items-center px-1"
        style={{
          height: 56,
          background: 'rgba(8,8,16,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Streak */}
        <StatItem
          icon={<FireIcon size={22} />}
          value={`${progress.streak}`}
          color="#F97316"
          onClick={() => setStreakDetailOpen(v => !v)}
        />
        <Divider />

        {/* Gems */}
        <StatItem
          icon={<GemIcon size={22} />}
          value={`${progress.gems}`}
          color="#22D3EE"
        />
        <Divider />

        {/* Hearts */}
        <StatItem
          icon={<HeartIcon size={22} />}
          value={heartsDisplay}
          color="#FB7185"
          subContent={showHeartsRow ? <HeartsRow count={progress.hearts} /> : undefined}
        />
        <Divider />

        {/* XP with daily goal ring */}
        <DailyGoalStat
          todayXp={progress.todayXp || 0}
          goalXp={DAILY_GOALS[progress.dailyGoalTier || 'regular'].xpTarget}
          totalXp={progress.totalXp}
          level={level}
          onClick={onOpenGoalModal}
        />
      </div>

      {/* Streak Detail Tooltip */}
      {streakDetailOpen && (
        <div
          className="mx-4 mt-1 p-3 rounded-xl text-center"
          style={{
            background: 'rgba(8,8,16,0.97)',
            border: '1px solid rgba(249,115,22,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <FireIcon size={28} />
            <span className="text-2xl font-black text-orange-400">{progress.streak}</span>
          </div>
          <p className="text-[11px] text-white/60">
            {progress.streak > 0
              ? `${progress.streak} day streak! Keep studying daily.`
              : 'Start studying today to begin your streak!'}
          </p>
          {progress.lastStudyDate && (
            <p className="text-[9px] text-white/30 mt-1">
              Last studied: {new Date(progress.lastStudyDate).toLocaleDateString()}
            </p>
          )}
          {/* XP Progress to next level */}
          <div className="mt-2 mx-auto" style={{ maxWidth: 200 }}>
            <div className="flex justify-between text-[9px] text-white/30 mb-1">
              <span>Level {level}</span>
              <span>{xpInLevel}/500 XP</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(xpInLevel / 500) * 100}%`,
                  background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Subject Tabs Row */}
      <div
        className="overflow-x-auto scrollbar-hide"
        ref={tabsRef}
        style={{
          background: 'rgba(8,8,16,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-2 px-4 py-2.5">
          {/* "All" tab */}
          <SubjectFilterTab
            label="All"
            icon="📚"
            color="#A78BFA"
            active={activeSubjectId === null}
            onClick={() => onSubjectChange(null)}
          />

          {/* Subject tabs */}
          {subjects.map(subject => (
            <SubjectFilterTab
              key={subject.id}
              label={subject.shortTitle}
              icon={subject.icon}
              color={subject.color}
              active={activeSubjectId === subject.id}
              onClick={() => onSubjectChange(subject.id)}
            />
          ))}
        </div>
      </div>

      {/* Topic progress mini-bar */}
      <div className="h-0.5" style={{ background: 'rgba(8,8,16,0.8)' }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: totalTopics > 0 ? `${(completedTopics / totalTopics) * 100}%` : '0%',
            background: activeSubjectId
              ? subjects.find(s => s.id === activeSubjectId)?.color || '#6366f1'
              : 'linear-gradient(90deg, #A78BFA, #6366f1)',
            borderRadius: '0 2px 2px 0',
            boxShadow: `0 0 8px ${activeSubjectId ? subjects.find(s => s.id === activeSubjectId)?.color + '60' : '#6366f160'}`,
          }}
        />
      </div>
    </div>
  )
}

// ── CSS for hiding scrollbar ───────────────────────────────────────────────────
// Add to your global CSS or a style tag:
// .scrollbar-hide::-webkit-scrollbar { display: none; }
// .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
