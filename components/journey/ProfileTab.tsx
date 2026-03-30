'use client'

import { useMemo, useState } from 'react'
import { UPSC_SYLLABUS, TOTAL_TOPICS } from '@/data/syllabus'
import type { LearningSubject } from '@/data/syllabus'
import {
  type JourneyProgress,
  DEFAULT_TOPIC_PROGRESS,
  ACHIEVEMENTS,
  DAILY_GOALS,
} from './types'

// ── Props ───────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  progress: JourneyProgress
  subjects: LearningSubject[]
  onDailyGoalClick: () => void
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getLevel(xp: number): number { return Math.floor(xp / 500) + 1 }
function getXpInLevel(xp: number): number { return xp % 500 }

const GLASS = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 } as const
const ELEVATED = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: 20 } as const

// ── Component ───────────────────────────────────────────────────────────────────

export default function ProfileTab({ progress, subjects, onDailyGoalClick }: ProfileTabProps) {
  const level = getLevel(progress.totalXp)
  const xpInLevel = getXpInLevel(progress.totalXp)
  const [showAllAchievements, setShowAllAchievements] = useState(false)

  const syllabus = subjects.length > 0 ? subjects : UPSC_SYLLABUS

  // Stats
  const stats = useMemo(() => {
    const allTp = Object.values(progress.topics)
    const totalAnswered = allTp.reduce((s, t) => s + t.questionsAnswered, 0)
    const totalCorrect = allTp.reduce((s, t) => s + t.correctAnswers, 0)
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    const completedTopics = allTp.filter(t => t.state === 'completed').length
    return { accuracy, completedTopics }
  }, [progress.topics])

  // Subject progress
  const subjectProgress = useMemo(() => {
    return syllabus.map(subject => {
      const allTopics = subject.units.flatMap(u => u.topics)
      const completed = allTopics.filter(t => (progress.topics[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed').length
      return {
        id: subject.id, title: subject.shortTitle, icon: subject.icon, color: subject.color,
        total: allTopics.length, completed,
        pct: allTopics.length > 0 ? Math.round((completed / allTopics.length) * 100) : 0,
      }
    })
  }, [syllabus, progress.topics])

  // Study heatmap (last 30 days)
  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; xp: number }> = []
    const calMap = new Map(progress.studyCalendar?.map(d => [d.date, d]) || [])
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const entry = calMap.get(dateStr)
      days.push({ date: dateStr, xp: entry?.xpEarned || 0 })
    }
    return days
  }, [progress.studyCalendar])

  // Achievements
  const unlockedIds = new Set(progress.achievements?.map(a => a.id) || [])
  const displayAchievements = showAllAchievements ? ACHIEVEMENTS : ACHIEVEMENTS.slice(0, 8)

  const heatColors = [
    'rgba(255,255,255,0.03)',
    'rgba(99,102,241,0.15)',
    'rgba(99,102,241,0.30)',
    'rgba(99,102,241,0.50)',
    'rgba(99,102,241,0.75)',
  ]

  return (
    <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Avatar Card ── */}
      <div style={{ ...ELEVATED, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, background: 'linear-gradient(145deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))',
          border: '2.5px solid rgba(99,102,241,0.3)',
        }}>
          🎓
        </div>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: '14px 0 0' }}>Level {level}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>UPSC Aspirant</p>
        {/* XP Bar */}
        <div style={{ width: '100%', maxWidth: 240, marginTop: 16 }}>
          <div style={{ height: 8, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 9999, width: `${(xpInLevel / 500) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.7s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'center', margin: '8px 0 0' }}>
            {progress.totalXp.toLocaleString()} XP  ·  {500 - xpInLevel} to next level
          </p>
        </div>
      </div>

      {/* ── Bento Grid 2x2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BentoCard icon="🔥" value={progress.streak} label="streak" glow="rgba(249,115,22,0.12)" />
        <BentoCard icon="📊" value={`${stats.accuracy}%`} label="accuracy" glow="rgba(99,102,241,0.12)" />
        <BentoCard icon="📚" value={stats.completedTopics} label="topics" glow="rgba(139,92,246,0.12)" />
        <BentoCard icon="💎" value={progress.gems} label="gems" glow="rgba(34,211,238,0.12)" />
      </div>

      {/* ── Daily Goal ── */}
      {(() => {
        const goalConfig = DAILY_GOALS[progress.dailyGoalTier]
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayXp = progress.todayDate === todayStr ? progress.todayXp : 0
        const goalMet = todayXp >= goalConfig.xpTarget
        const pct = Math.min(100, Math.round((todayXp / goalConfig.xpTarget) * 100))
        return (
          <div style={{ ...GLASS, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{goalConfig.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  Daily Goal: {goalConfig.label} ({goalConfig.xpTarget} XP)
                </span>
              </div>
              {goalMet && <span style={{ fontSize: 14 }}>&#10003;</span>}
            </div>
            <div style={{ height: 10, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', marginBottom: 10 }}>
              <div style={{
                height: '100%', borderRadius: 9999, width: `${pct}%`,
                background: goalMet
                  ? 'linear-gradient(90deg, #22c55e, #34d399)'
                  : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                boxShadow: goalMet ? '0 0 12px rgba(34,197,94,0.3)' : '0 0 12px rgba(99,102,241,0.2)',
                transition: 'width 0.7s ease',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: goalMet ? '#34d399' : 'rgba(255,255,255,0.50)' }}>
                {todayXp}/{goalConfig.xpTarget} XP today
              </span>
              <button
                onClick={onDailyGoalClick}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 12, fontWeight: 600, color: '#818cf8',
                }}
              >
                Change Goal
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Study Activity Heatmap ── */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>Study Activity</p>
        <div style={{ ...GLASS, padding: 16 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} style={{ width: 'calc((100% - 18px) / 7)', fontSize: 9, color: 'rgba(255,255,255,0.20)', textAlign: 'center', fontWeight: 500 }}>
                {d}
              </span>
            ))}
          </div>
          {/* Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {(() => {
              const firstDay = new Date(calendarDays[0]?.date || Date.now())
              const dow = (firstDay.getDay() + 6) % 7
              return Array.from({ length: dow }, (_, i) => (
                <div key={`off-${i}`} style={{ width: 'calc((100% - 18px) / 7)', aspectRatio: '1', borderRadius: 4 }} />
              ))
            })()}
            {calendarDays.map(day => {
              const intensity = day.xp === 0 ? 0 : day.xp <= 30 ? 1 : day.xp <= 60 ? 2 : day.xp <= 100 ? 3 : 4
              const isToday = day.date === new Date().toISOString().slice(0, 10)
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.xp} XP`}
                  style={{
                    width: 'calc((100% - 18px) / 7)', aspectRatio: '1', borderRadius: 4,
                    background: heatColors[intensity],
                    border: isToday ? '1.5px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                    boxShadow: isToday ? '0 0 6px rgba(255,255,255,0.1)' : 'none',
                    transition: 'background 0.2s',
                  }}
                />
              )
            })}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.20)' }}>Less</span>
            {heatColors.map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
            ))}
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.20)' }}>More</span>
          </div>
        </div>
      </div>

      {/* ── Subjects ── */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>Subjects</p>
        <div style={{ ...GLASS, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {subjectProgress.map(s => (
            <div key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>{s.title}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>
                  {s.completed}/{s.total} <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>{s.pct}%</span>
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{
                  height: '100%', borderRadius: 9999, width: `${s.pct}%`,
                  background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                  boxShadow: s.pct > 0 ? `0 0 8px ${s.color}30` : 'none',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
          {/* Overall */}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Total Syllabus</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.70)' }}>
                {stats.completedTopics}/{TOTAL_TOPICS}{' '}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                  ({TOTAL_TOPICS > 0 ? Math.round((stats.completedTopics / TOTAL_TOPICS) * 100) : 0}%)
                </span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{
                height: '100%', borderRadius: 9999,
                width: `${(stats.completedTopics / Math.max(1, TOTAL_TOPICS)) * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                transition: 'width 0.7s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Achievements ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Achievements</p>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>
            {unlockedIds.size}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div style={{ ...GLASS, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {displayAchievements.map(ach => {
              const unlocked = unlockedIds.has(ach.id)
              return (
                <div
                  key={ach.id}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 4px', borderRadius: 16,
                    background: unlocked ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${unlocked ? 'rgba(99,102,241,0.20)' : 'rgba(255,255,255,0.04)'}`,
                    opacity: unlocked ? 1 : 0.3,
                  }}
                >
                  <span style={{
                    fontSize: 22,
                    filter: unlocked ? 'none' : 'grayscale(1) brightness(0.4)',
                    opacity: unlocked ? 1 : 0.3,
                  }}>
                    {ach.icon}
                  </span>
                  {unlocked && (
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 1.2 }}>
                      {ach.title}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {ACHIEVEMENTS.length > 8 && (
            <button
              onClick={() => setShowAllAchievements(v => !v)}
              style={{
                display: 'block', width: '100%', marginTop: 12, padding: '10px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: '#818cf8', textAlign: 'center',
              }}
            >
              {showAllAchievements ? 'Show Less' : 'View All →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function BentoCard({ icon, value, label, glow }: { icon: string; value: number | string; label: string; glow: string }) {
  return (
    <div style={{
      padding: '18px 12px', borderRadius: 20, textAlign: 'center',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: `0 4px 24px ${glow}`,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <p style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: '6px 0 0' }}>{value}</p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: '2px 0 0' }}>{label}</p>
    </div>
  )
}
