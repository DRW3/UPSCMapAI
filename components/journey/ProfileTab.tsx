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
  GLASS_STYLE,
  ELEVATED_STYLE,
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

function getLocalDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLevel(xp: number): number { return Math.floor(xp / 500) + 1 }
function getXpInLevel(xp: number): number { return xp % 500 }

const GLASS = { ...GLASS_STYLE, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as const
const ELEVATED = { ...ELEVATED_STYLE } as const

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
    return { accuracy, completedTopics, totalAnswered, totalCorrect }
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
      const dateStr = getLocalDate(d)
      const entry = calMap.get(dateStr)
      days.push({ date: dateStr, xp: entry?.xpEarned || 0 })
    }
    return days
  }, [progress.studyCalendar])

  // Journey Timeline
  const journeyTimeline = useMemo(() => {
    if (!profile?.examYear) return null

    const examDate = new Date(profile.examYear, 4, 25) // May 25
    const now = new Date()
    const daysLeft = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / 86400000))

    // Total prep span (assume ~1 year from onboarding)
    const onboardDate = profile.onboardedAt ? new Date(profile.onboardedAt) : new Date(now.getTime() - 30 * 86400000)
    const totalDays = Math.max(1, Math.ceil((examDate.getTime() - onboardDate.getTime()) / 86400000))
    const elapsed = totalDays - daysLeft
    const timeProgressPct = Math.min(100, Math.round((elapsed / totalDays) * 100))

    // Syllabus progress
    const totalTopics = syllabus.reduce((s, sub) => s + sub.units.reduce((s2, u) => s2 + u.topics.length, 0), 0)
    const completedTopics = Object.values(progress.topics).filter(t => t.state === 'completed').length
    const syllabusPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0

    const remaining = totalTopics - completedTopics
    const topicsPerWeek = daysLeft > 0 ? Math.round((remaining / daysLeft) * 7 * 10) / 10 : 0

    // Pace status
    let pace: 'ahead' | 'on_track' | 'behind' = 'on_track'
    if (timeProgressPct > 0 && syllabusPct > 0) {
      const ratio = syllabusPct / timeProgressPct
      if (ratio >= 1.1) pace = 'ahead'
      else if (ratio < 0.6) pace = 'behind'
    }

    // Per-subject data
    const subjectData = syllabus.map(sub => {
      const topics = sub.units.flatMap(u => u.topics)
      const done = topics.filter(t => (progress.topics[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed').length
      return {
        id: sub.id, title: sub.shortTitle, icon: sub.icon, color: sub.color,
        total: topics.length, done, pct: topics.length > 0 ? Math.round((done / topics.length) * 100) : 0,
      }
    }).sort((a, b) => a.pct - b.pct) // least complete first

    return { daysLeft, timeProgressPct, syllabusPct, topicsPerWeek, pace, subjectData, completedTopics, totalTopics }
  }, [profile, progress.topics, syllabus])

  // Exam Readiness Score
  const examReadiness = useMemo(() => {
    const totalTopics = syllabus.reduce((s, sub) => s + sub.units.reduce((s2, u) => s2 + u.topics.length, 0), 0)
    const completedTopics = Object.values(progress.topics).filter(t => t.state === 'completed').length
    const completionPct = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0

    const allTp = Object.values(progress.topics)
    const totalAnswered = allTp.reduce((s, t) => s + t.questionsAnswered, 0)
    const totalCorrect = allTp.reduce((s, t) => s + t.correctAnswers, 0)
    const accuracyPct = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0

    const crowns3Plus = allTp.filter(t => t.crownLevel >= 3).length
    const masteryPct = totalTopics > 0 ? (crowns3Plus / totalTopics) * 100 : 0

    // 50% completion + 30% accuracy + 20% mastery
    const score = Math.round(completionPct * 0.5 + accuracyPct * 0.3 + masteryPct * 0.2)

    let color: string
    let statusMsg: string
    if (score >= 60) {
      color = '#22c55e'
      statusMsg = 'Good progress — keep building momentum!'
    } else if (score >= 40) {
      color = '#eab308'
      statusMsg = 'Making headway — increase practice for better results.'
    } else {
      color = '#ef4444'
      statusMsg = 'Early stages — consistent daily study will get you there.'
    }

    return { score, color, statusMsg }
  }, [progress.topics, syllabus])

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

      {/* ── SECTION 1: Avatar Card ── */}
      <div style={{ ...ELEVATED, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, background: 'linear-gradient(145deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))',
          border: '2.5px solid rgba(99,102,241,0.3)',
        }}>
          {'\uD83C\uDF93'}
        </div>
        {profile ? (
          <>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: '12px 0 0' }}>{profile.name}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', margin: '3px 0 0' }}>
              Level {level} · UPSC CSE {profile.examYear}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '3px 0 0' }}>
              {PREP_STAGE_CONFIG[profile.prepStage].icon} {PREP_STAGE_CONFIG[profile.prepStage].label}
            </p>
            {(() => {
              const examDate = new Date(`${profile.examYear}-05-25`)
              const now = new Date()
              const diffMs = examDate.getTime() - now.getTime()
              const daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000))
              return daysRemaining > 0 ? (
                <p style={{ fontSize: 11, color: '#818cf8', margin: '5px 0 0', fontWeight: 600 }}>
                  {daysRemaining} days remaining
                </p>
              ) : null
            })()}
          </>
        ) : (
          <>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: '12px 0 0' }}>Level {level}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>UPSC Aspirant</p>
          </>
        )}
        {/* XP Bar */}
        <div style={{ width: '100%', maxWidth: 240, marginTop: 14 }}>
          <div style={{ height: 8, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 9999, width: `${(xpInLevel / 500) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.7s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'center', margin: '6px 0 0' }}>
            {progress.totalXp.toLocaleString()} XP  ·  {500 - xpInLevel} to next level
          </p>
        </div>
      </div>

      {/* ── SECTION 2: Journey Timeline (NEW) ── */}
      {journeyTimeline && (
        <div style={{ ...ELEVATED, padding: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '0 0 16px' }}>Your Journey Timeline</p>

          {/* Part A: Overall Progress Bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                {journeyTimeline.syllabusPct}% syllabus done
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
                {journeyTimeline.daysLeft} days left
              </span>
            </div>
            <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }}>
              {/* Syllabus fill */}
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 5,
                width: `${journeyTimeline.syllabusPct}%`,
                background: journeyTimeline.pace === 'behind'
                  ? 'linear-gradient(90deg, #ef4444, #f87171)'
                  : journeyTimeline.pace === 'ahead'
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, #22c55e, #34d399)',
                transition: 'width 0.7s ease',
              }} />
              {/* Time marker — vertical line showing how much time has elapsed */}
              <div style={{
                position: 'absolute', top: -3, left: `${journeyTimeline.timeProgressPct}%`,
                width: 2, height: 16, borderRadius: 1,
                background: 'rgba(255,255,255,0.70)',
                transform: 'translateX(-1px)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Start</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>Prelims {profile?.examYear}</span>
            </div>
          </div>

          {/* Part B: Pace Indicator */}
          <div style={{
            padding: '10px 14px', borderRadius: 12, marginBottom: 16,
            background: journeyTimeline.pace === 'behind'
              ? 'rgba(239,68,68,0.08)'
              : journeyTimeline.pace === 'ahead'
                ? 'rgba(34,197,94,0.08)'
                : 'rgba(34,197,94,0.06)',
            border: `1px solid ${
              journeyTimeline.pace === 'behind'
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(34,197,94,0.12)'
            }`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>
                Need {journeyTimeline.topicsPerWeek} topics/week
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: journeyTimeline.pace === 'behind' ? '#ef4444'
                  : journeyTimeline.pace === 'ahead' ? '#22c55e' : '#34d399',
              }}>
                {journeyTimeline.pace === 'behind'
                  ? 'Behind \u2014 need to speed up'
                  : journeyTimeline.pace === 'ahead'
                    ? 'Ahead \u2714'
                    : 'On Track \u2714'}
              </span>
            </div>
          </div>

          {/* Part C: Subject Timeline Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {journeyTimeline.subjectData.map(sub => (
              <div key={sub.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{sub.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>{sub.title}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                    {sub.done}/{sub.total}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{
                    height: '100%', borderRadius: 9999, width: `${sub.pct}%`,
                    background: `linear-gradient(90deg, ${sub.color}, ${sub.color}88)`,
                    boxShadow: sub.pct > 0 ? `0 0 6px ${sub.color}25` : 'none',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3: Exam Readiness Score (NEW) ── */}
      <div style={{ ...ELEVATED, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Exam Readiness</p>
          <span style={{ fontSize: 22, fontWeight: 800, color: examReadiness.color }}>
            {examReadiness.score}%
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 5, width: `${examReadiness.score}%`,
            background: examReadiness.color,
            boxShadow: `0 0 10px ${examReadiness.color}40`,
            transition: 'width 0.7s ease',
          }} />
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          {examReadiness.statusMsg}
        </p>
      </div>

      {/* ── SECTION 4: Your Focus ── */}
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

      {/* ── SECTION 5: Bento Grid 2x2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BentoCard icon="\uD83D\uDD25" value={progress.streak} label="streak" glow="rgba(249,115,22,0.12)" />
        <BentoCard icon="\uD83D\uDCCA" value={`${stats.accuracy}%`} label="accuracy" glow="rgba(99,102,241,0.12)" />
        <BentoCard icon="\uD83D\uDCDA" value={stats.completedTopics} label="topics" glow="rgba(139,92,246,0.12)" />
        <BentoCard icon="\uD83D\uDC8E" value={progress.gems} label="gems" glow="rgba(34,211,238,0.12)" />
      </div>

      {/* ── SECTION 6: Daily Goal ── */}
      {(() => {
        const goalConfig = DAILY_GOALS[progress.dailyGoalTier]
        const todayStr = getLocalDate()
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

      {/* ── SECTION 7: Subject Progress ── */}
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

      {/* ── SECTION 8: Study Activity Heatmap ── */}
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
              const isToday = day.date === getLocalDate()
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

      {/* ── SECTION 9: Achievements ── */}
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
              {showAllAchievements ? 'Show Less' : 'View All \u2192'}
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION 11: Settings ── */}
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

              {/* Strengths */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Strengths (strong subjects)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {syllabus.map(s => {
                    const isStrong = editStrongSubjects.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (isStrong) {
                            setEditStrongSubjects(editStrongSubjects.filter(id => id !== s.id))
                          } else {
                            setEditStrongSubjects([...editStrongSubjects, s.id])
                            setEditWeakSubjects(editWeakSubjects.filter(id => id !== s.id))
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                          background: isStrong ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                          border: isStrong ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.06)',
                          color: isStrong ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
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
