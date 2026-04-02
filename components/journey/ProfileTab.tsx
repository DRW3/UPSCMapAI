'use client'

import { useMemo, useState } from 'react'
import { UPSC_SYLLABUS, TOTAL_TOPICS } from '@/data/syllabus'
import type { LearningSubject } from '@/data/syllabus'
import {
  type JourneyProgress,
  type UserProfile,
  DEFAULT_TOPIC_PROGRESS,
  ACHIEVEMENTS,
  DAILY_GOALS,
  PREP_STAGE_CONFIG,
} from './types'

// ── Props ───────────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  progress: JourneyProgress
  subjects: LearningSubject[]
  onDailyGoalClick: () => void
  profile: UserProfile | null
  onProfileUpdate?: (profile: UserProfile) => void
  onResetJourney?: () => void
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getLevel(xp: number): number { return Math.floor(xp / 500) + 1 }
function getXpInLevel(xp: number): number { return xp % 500 }

const GLASS = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 } as const
const ELEVATED = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: 20 } as const

// ── Component ───────────────────────────────────────────────────────────────────

export default function ProfileTab({ progress, subjects, onDailyGoalClick, profile, onProfileUpdate, onResetJourney }: ProfileTabProps) {
  const level = getLevel(progress.totalXp)
  const xpInLevel = getXpInLevel(progress.totalXp)
  const [showAllAchievements, setShowAllAchievements] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(profile?.name || '')
  const [editExamYear, setEditExamYear] = useState<number>(profile?.examYear || 2026)
  const [editPrepStage, setEditPrepStage] = useState<string>(profile?.prepStage || 'beginner')
  const [editWeakSubjects, setEditWeakSubjects] = useState<string[]>(profile?.weakSubjects || [])
  const [editStrongSubjects, setEditStrongSubjects] = useState<string[]>(profile?.strongSubjects || [])
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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
        {profile ? (
          <>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: '14px 0 0' }}>{profile.name}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', margin: '4px 0 0' }}>
              Level {level} · UPSC CSE {profile.examYear}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '4px 0 0' }}>
              {PREP_STAGE_CONFIG[profile.prepStage].icon} {PREP_STAGE_CONFIG[profile.prepStage].label}
            </p>
            {(() => {
              // Exam countdown: UPSC CSE Prelims are typically in late May
              const examDate = new Date(`${profile.examYear}-05-25`)
              const now = new Date()
              const diffMs = examDate.getTime() - now.getTime()
              const daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000))
              return daysRemaining > 0 ? (
                <p style={{ fontSize: 11, color: '#818cf8', margin: '6px 0 0', fontWeight: 600 }}>
                  {daysRemaining} days remaining
                </p>
              ) : null
            })()}
          </>
        ) : (
          <>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: '14px 0 0' }}>Level {level}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>UPSC Aspirant</p>
          </>
        )}
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

      {/* ── Your Focus ── */}
      {profile && (profile.weakSubjects.length > 0 || profile.strongSubjects.length > 0) && (() => {
        const syllabusMap = new Map(syllabus.map(s => [s.id, s]))
        const focusSubjects = profile.weakSubjects.map(id => syllabusMap.get(id)).filter(Boolean) as LearningSubject[]
        const strongSubjects = profile.strongSubjects.map(id => syllabusMap.get(id)).filter(Boolean) as LearningSubject[]
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {focusSubjects.length > 0 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>Focus Areas</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {focusSubjects.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 9999,
                        background: `${s.color}15`,
                        border: `1.5px solid ${s.color}50`,
                        boxShadow: `0 0 12px ${s.color}20`,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{s.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.shortTitle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {strongSubjects.length > 0 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.50)', marginBottom: 10 }}>Strengths</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {strongSubjects.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 9999,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{s.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>{s.shortTitle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

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

      {/* ── Settings ── */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 10 }}>Settings</p>
        <div style={{ ...GLASS, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profile && onProfileUpdate && !editMode && (
            <button
              onClick={() => {
                setEditName(profile.name)
                setEditExamYear(profile.examYear)
                setEditPrepStage(profile.prepStage)
                setEditWeakSubjects([...profile.weakSubjects])
                setEditStrongSubjects([...profile.strongSubjects])
                setEditMode(true)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16 }}>&#9998;</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.70)', flex: 1 }}>Edit Profile</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {editMode && profile && onProfileUpdate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={24}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
                    padding: '10px 12px', color: 'rgba(255,255,255,0.90)',
                    fontSize: 14, fontWeight: 600, outline: 'none',
                  }}
                />
              </div>

              {/* Exam Year */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Exam Year</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2026, 2027, 2028, 2029].map(y => (
                    <button
                      key={y}
                      onClick={() => setEditExamYear(y)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: editExamYear === y ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: editExamYear === y ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        color: editExamYear === y ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prep Stage */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Prep Stage</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['beginner', 'intermediate', 'advanced'] as const).map(stage => (
                    <button
                      key={stage}
                      onClick={() => setEditPrepStage(stage)}
                      style={{
                        flex: 1, padding: '8px 6px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: editPrepStage === stage ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: editPrepStage === stage ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        color: editPrepStage === stage ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                      }}
                    >
                      {PREP_STAGE_CONFIG[stage].icon} {PREP_STAGE_CONFIG[stage].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Focus Areas (weak subjects)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {syllabus.map(s => {
                    const isWeak = editWeakSubjects.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (isWeak) {
                            setEditWeakSubjects(editWeakSubjects.filter(id => id !== s.id))
                          } else {
                            setEditWeakSubjects([...editWeakSubjects, s.id])
                            setEditStrongSubjects(editStrongSubjects.filter(id => id !== s.id))
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                          background: isWeak ? `${s.color}15` : 'rgba(255,255,255,0.03)',
                          border: isWeak ? `1px solid ${s.color}50` : '1px solid rgba(255,255,255,0.06)',
                          color: isWeak ? s.color : 'rgba(255,255,255,0.45)',
                          cursor: 'pointer',
                        }}
                      >
                        {s.icon} {s.shortTitle}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save / Cancel */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setEditMode(false)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const updated: UserProfile = {
                      ...profile,
                      name: editName.trim() || profile.name,
                      examYear: editExamYear as UserProfile['examYear'],
                      prepStage: editPrepStage as UserProfile['prepStage'],
                      weakSubjects: editWeakSubjects,
                      strongSubjects: editStrongSubjects,
                    }
                    onProfileUpdate(updated)
                    setEditMode(false)
                  }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Reset Journey */}
          {onResetJourney && !showResetConfirm && (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '12px 14px', borderRadius: 14,
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.10)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16 }}>&#128260;</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(239,68,68,0.65)', flex: 1 }}>Reset Journey</span>
            </button>
          )}

          {showResetConfirm && onResetJourney && (
            <div style={{
              padding: 16, borderRadius: 14,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(239,68,68,0.85)', margin: '0 0 4px' }}>
                Reset all progress?
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '0 0 12px' }}>
                This will clear your XP, crowns, streaks, and achievements. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onResetJourney(); setShowResetConfirm(false) }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', cursor: 'pointer',
                  }}
                >
                  Reset Everything
                </button>
              </div>
            </div>
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
