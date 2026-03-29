'use client'

import { useMemo } from 'react'
import { UPSC_SYLLABUS, TOTAL_TOPICS } from '@/data/syllabus'
import {
  type JourneyProgress,
  type TopicProgress,
  type AchievementCategory,
  DEFAULT_TOPIC_PROGRESS,
  ACHIEVEMENTS,
  CROWN_COLORS,
} from '@/components/journey/types'

// ── Props ───────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  progress: JourneyProgress
  topicStates: Record<string, TopicProgress>
  completedTopics: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getLevel(xp: number): number {
  return Math.floor(xp / 500) + 1
}

function getXpInLevel(xp: number): number {
  return xp % 500
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function ProfileTab({ progress, topicStates, completedTopics }: ProfileTabProps) {
  const level = getLevel(progress.totalXp)
  const xpInLevel = getXpInLevel(progress.totalXp)

  // Subject-wise progress
  const subjectProgress = useMemo(() => {
    return UPSC_SYLLABUS.map(subject => {
      const allTopics = subject.units.flatMap(u => u.topics)
      const completed = allTopics.filter(t => (topicStates[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed').length
      const started = allTopics.filter(t => (topicStates[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'started').length
      return {
        id: subject.id,
        title: subject.shortTitle,
        icon: subject.icon,
        color: subject.color,
        total: allTopics.length,
        completed,
        started,
        pct: allTopics.length > 0 ? Math.round((completed / allTopics.length) * 100) : 0,
      }
    })
  }, [topicStates])

  // Overall stats
  const stats = useMemo(() => {
    const allTp = Object.values(topicStates)
    const totalAnswered = allTp.reduce((s, t) => s + t.questionsAnswered, 0)
    const totalCorrect = allTp.reduce((s, t) => s + t.correctAnswers, 0)
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const maxCrown = Math.max(0, ...allTp.map(t => t.crownLevel))
    const totalCrowns = allTp.filter(t => t.crownLevel >= 1).length
    return { totalAnswered, totalCorrect, accuracy, maxCrown, totalCrowns }
  }, [topicStates])

  // Study calendar (last 30 days)
  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; xp: number; active: boolean }> = []
    const calMap = new Map(progress.studyCalendar?.map(d => [d.date, d]) || [])
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const entry = calMap.get(dateStr)
      days.push({ date: dateStr, xp: entry?.xpEarned || 0, active: !!entry && entry.xpEarned > 0 })
    }
    return days
  }, [progress.studyCalendar])

  const activeDays = calendarDays.filter(d => d.active).length

  // Achievements
  const unlockedIds = new Set(progress.achievements?.map(a => a.id) || [])
  const categories: AchievementCategory[] = ['milestone', 'streak', 'mastery', 'performance']

  return (
    <div className="h-full overflow-y-auto px-4" style={{ scrollbarWidth: 'none', paddingTop: 108, paddingBottom: 96 }}>
      {/* Profile Header */}
      <div className="flex flex-col items-center pt-4 pb-5">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
            style={{ background: 'rgba(99,102,241,0.15)', border: '3px solid rgba(99,102,241,0.3)' }}
          >
            🎓
          </div>
          {/* Level badge */}
          <div
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: '2.5px solid #080810',
              boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
            }}
          >
            {level}
          </div>
        </div>
        <p className="text-[16px] font-bold text-white/90 mt-3">UPSC Aspirant</p>
        <p className="text-[11px] text-white/35 mt-0.5">Level {level} &middot; {progress.totalXp} XP</p>

        {/* XP progress bar */}
        <div className="w-full max-w-[220px] mt-3">
          <div className="flex justify-between text-[9px] text-white/30 mb-1">
            <span>Level {level}</span>
            <span>{xpInLevel}/500 XP → Level {level + 1}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(xpInLevel / 500) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <StatCard value={`${completedTopics}`} label="Topics" icon="📚" />
        <StatCard value={`${progress.streak}`} label="Streak" icon="🔥" />
        <StatCard value={`${stats.accuracy}%`} label="Accuracy" icon="🎯" />
        <StatCard value={`${progress.gems}`} label="Gems" icon="💎" />
      </div>

      {/* Detailed Stats */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-[13px] font-bold text-white/70 mb-3">Performance Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Questions Attempted" value={stats.totalAnswered} />
          <MiniStat label="Correct Answers" value={stats.totalCorrect} />
          <MiniStat label="Perfect Sessions" value={progress.perfectScores || 0} />
          <MiniStat label="Crown Topics" value={stats.totalCrowns} />
          <MiniStat label="Highest Crown" value={`Lv ${stats.maxCrown}`} color={CROWN_COLORS[stats.maxCrown as 0|1|2|3|4|5] || '#4b5563'} />
          <MiniStat label="Active Days (30d)" value={activeDays} />
        </div>
      </div>

      {/* Study Calendar */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-white/70">Study Calendar</h3>
          <span className="text-[11px] text-white/30">{activeDays} of 30 days</span>
        </div>
        {/* Day labels */}
        <div className="flex gap-0.5 mb-1 ml-0.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-[8px] text-white/20 font-medium" style={{ width: 'calc((100% - 3px) / 7)', textAlign: 'center' }}>{d}</span>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="flex flex-wrap gap-[3px]">
          {/* Offset for first day alignment */}
          {(() => {
            const firstDay = new Date(calendarDays[0]?.date || Date.now())
            const dow = (firstDay.getDay() + 6) % 7 // Mon=0
            const offset = Array.from({ length: dow }, (_, i) => (
              <div key={`off-${i}`} className="rounded-[3px]" style={{ width: 'calc((100% - 18px) / 7)', aspectRatio: '1', background: 'transparent' }} />
            ))
            return offset
          })()}
          {calendarDays.map(day => {
            const intensity = day.xp === 0 ? 0 : day.xp < 20 ? 1 : day.xp < 50 ? 2 : day.xp < 100 ? 3 : 4
            const colors = ['rgba(255,255,255,0.03)', 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.35)', 'rgba(99,102,241,0.55)', 'rgba(99,102,241,0.8)']
            return (
              <div
                key={day.date}
                className="rounded-[3px] transition-colors duration-200"
                title={`${day.date}: ${day.xp} XP`}
                style={{
                  width: 'calc((100% - 18px) / 7)',
                  aspectRatio: '1',
                  background: colors[intensity],
                  border: day.date === new Date().toISOString().slice(0, 10) ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
                }}
              />
            )
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[8px] text-white/20">Less</span>
          {['rgba(255,255,255,0.03)', 'rgba(99,102,241,0.2)', 'rgba(99,102,241,0.35)', 'rgba(99,102,241,0.55)', 'rgba(99,102,241,0.8)'].map((c, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          <span className="text-[8px] text-white/20">More</span>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-[13px] font-bold text-white/70 mb-3">Subject Progress</h3>
        <div className="flex flex-col gap-3">
          {subjectProgress.map(s => (
            <div key={s.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{s.icon}</span>
                  <span className="text-[12px] font-semibold text-white/70">{s.title}</span>
                </div>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>
                  {s.completed}/{s.total}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)` }}
                />
              </div>
              {s.started > 0 && (
                <p className="text-[9px] text-white/25 mt-0.5">{s.started} in progress</p>
              )}
            </div>
          ))}
        </div>

        {/* Overall */}
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-white/60">Total Syllabus</span>
            <span className="text-[12px] font-bold text-white/70">{completedTopics}/{TOTAL_TOPICS}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(completedTopics / Math.max(1, TOTAL_TOPICS)) * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #a78bfa, #8b5cf6)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-white/70">Achievements</h3>
          <span className="text-[11px] text-white/30">{unlockedIds.size}/{ACHIEVEMENTS.length} unlocked</span>
        </div>

        {categories.map(cat => {
          const items = ACHIEVEMENTS.filter(a => a.category === cat)
          const catLabel = cat === 'milestone' ? 'Milestones' : cat === 'streak' ? 'Streaks' : cat === 'mastery' ? 'Mastery' : 'Performance'
          return (
            <div key={cat} className="mb-4 last:mb-0">
              <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-2">{catLabel}</p>
              <div className="grid grid-cols-4 gap-2">
                {items.map(ach => {
                  const isUnlocked = unlockedIds.has(ach.id)
                  return (
                    <div
                      key={ach.id}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                      style={{
                        background: isUnlocked ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isUnlocked ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'}`,
                        opacity: isUnlocked ? 1 : 0.4,
                      }}
                    >
                      <span className="text-[20px]" style={{ filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                        {ach.icon}
                      </span>
                      <span className="text-[9px] font-semibold text-white/60 text-center leading-tight px-1">
                        {ach.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Syllabus completion message */}
      {completedTopics >= TOTAL_TOPICS && (
        <div className="text-center py-6 mb-4">
          <span className="text-5xl">🏆</span>
          <p className="text-[16px] font-bold text-white/90 mt-2">Syllabus Complete!</p>
          <p className="text-[12px] text-white/40 mt-1">You&apos;ve mastered the entire UPSC syllabus. Keep practicing to level up your crowns!</p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-3 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="text-[14px] mb-1">{icon}</span>
      <p className="text-[16px] font-bold text-white tabular-nums">{value}</p>
      <p className="text-[9px] text-white/30 mt-0.5">{label}</p>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-[12px] font-bold tabular-nums" style={{ color: color || 'rgba(255,255,255,0.8)' }}>{value}</span>
    </div>
  )
}
