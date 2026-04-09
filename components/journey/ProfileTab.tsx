'use client'

import { useMemo, useState } from 'react'
import { UPSC_SYLLABUS } from '@/data/syllabus'
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

function getLevel(questionsAnswered: number): number { return Math.floor(questionsAnswered / 50) + 1 }
function getQuestionsInLevel(questionsAnswered: number): number { return questionsAnswered % 50 }

const GLASS = { ...GLASS_STYLE, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as const
const ELEVATED = { ...ELEVATED_STYLE } as const

// ── Component ───────────────────────────────────────────────────────────────────

export default function ProfileTab({ progress, subjects, onDailyGoalClick, profile, onProfileUpdate, onResetJourney }: ProfileTabProps) {
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(profile?.name || '')
  const [editExamYear, setEditExamYear] = useState<number>(profile?.examYear || 2026)
  const [editPrepStage, setEditPrepStage] = useState<string>(profile?.prepStage || 'beginner')
  const [editWeakSubjects, setEditWeakSubjects] = useState<string[]>(profile?.weakSubjects || [])
  const [editStrongSubjects, setEditStrongSubjects] = useState<string[]>(profile?.strongSubjects || [])
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // ── Inline edit modes for the Focus Areas / Strengths cards in SECTION 4
  // Each card has its own edit toggle so the user can change focus or
  // strengths in-place without going through the Settings → Edit Profile flow.
  const [editingFocusInline, setEditingFocusInline] = useState(false)
  const [editingStrengthsInline, setEditingStrengthsInline] = useState(false)
  const [draftWeakSubjects, setDraftWeakSubjects] = useState<string[]>(profile?.weakSubjects || [])
  const [draftStrongSubjects, setDraftStrongSubjects] = useState<string[]>(profile?.strongSubjects || [])

  // ── Achievement detail modal
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null)

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

  const level = getLevel(stats.totalAnswered)
  const questionsInLevel = getQuestionsInLevel(stats.totalAnswered)

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

  // Achievements — always show all, no slicing or "View All" toggle.
  const unlockedIds = new Set(progress.achievements?.map(a => a.id) || [])
  const unlockedAtMap = new Map(
    (progress.achievements || []).map(a => [a.id, a.unlockedAt] as const),
  )

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
        {/* Questions Progress Bar */}
        <div style={{ width: '100%', maxWidth: 240, marginTop: 14 }}>
          <div style={{ height: 8, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', borderRadius: 9999, width: `${(questionsInLevel / 50) * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.7s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', textAlign: 'center', margin: '6px 0 0' }}>
            {stats.totalAnswered.toLocaleString()} questions  ·  {50 - questionsInLevel} to next level
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

      {/* ── SECTION 4: Your Focus & Strengths ──
          Each subsection (Focus Areas / Strengths) has its own inline Edit
          button so the user can change them in-place without going through
          a separate Edit Profile flow. Always rendered (even when empty)
          so the user has somewhere to ADD subjects from. */}
      {profile && onProfileUpdate && (() => {
        const syllabusMap = new Map(syllabus.map(s => [s.id, s]))
        const focusSubjects = profile.weakSubjects.map(id => syllabusMap.get(id)).filter(Boolean) as LearningSubject[]
        const strongSubjects = profile.strongSubjects.map(id => syllabusMap.get(id)).filter(Boolean) as LearningSubject[]

        // Save handlers — commit drafts to the parent and exit edit mode.
        const saveFocus = () => {
          onProfileUpdate({ ...profile, weakSubjects: draftWeakSubjects, strongSubjects: draftStrongSubjects })
          setEditingFocusInline(false)
        }
        const saveStrengths = () => {
          onProfileUpdate({ ...profile, weakSubjects: draftWeakSubjects, strongSubjects: draftStrongSubjects })
          setEditingStrengthsInline(false)
        }

        // Reusable section-header row with title + Edit/Done button
        const sectionHeader = (
          title: string,
          isEditing: boolean,
          onStart: () => void,
          onSave: () => void,
          onCancel: () => void,
          headerColor: string,
        ) => (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: headerColor, margin: 0 }}>{title}</p>
            {isEditing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', padding: '5px 11px', borderRadius: 9,
                    fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
                    cursor: 'pointer', padding: '5px 12px', borderRadius: 9,
                    fontSize: 11, fontWeight: 800, color: '#fff',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    boxShadow: '0 3px 12px rgba(99,102,241,0.4)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStart}
                style={{
                  background: 'rgba(99,102,241,0.10)',
                  border: '1px solid rgba(99,102,241,0.22)',
                  cursor: 'pointer', padding: '5px 11px', borderRadius: 9,
                  fontSize: 10, fontWeight: 700, color: '#a5b4fc',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 4,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        )

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Focus Areas card ─────────────────────────────────────── */}
            <div>
              {sectionHeader(
                'Focus Areas',
                editingFocusInline,
                () => {
                  // Snapshot current profile into the drafts before entering
                  // edit mode so cancel can revert cleanly.
                  setDraftWeakSubjects([...profile.weakSubjects])
                  setDraftStrongSubjects([...profile.strongSubjects])
                  setEditingFocusInline(true)
                  setEditingStrengthsInline(false)
                },
                saveFocus,
                () => setEditingFocusInline(false),
                'rgba(255,255,255,0.85)',
              )}
              {editingFocusInline ? (
                <div style={{ ...GLASS, padding: 14 }}>
                  <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.45)',
                    margin: '0 0 10px', lineHeight: 1.4,
                  }}>
                    Tap subjects you want to focus on. They&apos;ll be prioritised in your Up Next list.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {syllabus.map(s => {
                      const isWeak = draftWeakSubjects.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isWeak) {
                              setDraftWeakSubjects(draftWeakSubjects.filter(id => id !== s.id))
                            } else {
                              setDraftWeakSubjects([...draftWeakSubjects, s.id])
                              // A subject can't be both focus and strength.
                              setDraftStrongSubjects(draftStrongSubjects.filter(id => id !== s.id))
                            }
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 11px', borderRadius: 9999,
                            fontSize: 11, fontWeight: 600,
                            background: isWeak ? `${s.color}18` : 'rgba(255,255,255,0.03)',
                            border: isWeak ? `1.5px solid ${s.color}60` : '1px solid rgba(255,255,255,0.08)',
                            color: isWeak ? s.color : 'rgba(255,255,255,0.55)',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <span>{s.icon}</span>
                          <span>{s.shortTitle}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : focusSubjects.length > 0 ? (
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
              ) : (
                <div style={{
                  ...GLASS, padding: '14px 16px',
                  fontSize: 12, color: 'rgba(255,255,255,0.40)',
                  textAlign: 'center',
                }}>
                  No focus areas yet. Tap Edit to add subjects you want to prioritise.
                </div>
              )}
            </div>

            {/* ── Strengths card ────────────────────────────────────────── */}
            <div>
              {sectionHeader(
                'Strengths',
                editingStrengthsInline,
                () => {
                  setDraftWeakSubjects([...profile.weakSubjects])
                  setDraftStrongSubjects([...profile.strongSubjects])
                  setEditingStrengthsInline(true)
                  setEditingFocusInline(false)
                },
                saveStrengths,
                () => setEditingStrengthsInline(false),
                'rgba(255,255,255,0.50)',
              )}
              {editingStrengthsInline ? (
                <div style={{ ...GLASS, padding: 14 }}>
                  <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.45)',
                    margin: '0 0 10px', lineHeight: 1.4,
                  }}>
                    Tap subjects you&apos;re already strong in. We&apos;ll keep them light in your daily plan.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {syllabus.map(s => {
                      const isStrong = draftStrongSubjects.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isStrong) {
                              setDraftStrongSubjects(draftStrongSubjects.filter(id => id !== s.id))
                            } else {
                              setDraftStrongSubjects([...draftStrongSubjects, s.id])
                              setDraftWeakSubjects(draftWeakSubjects.filter(id => id !== s.id))
                            }
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 11px', borderRadius: 9999,
                            fontSize: 11, fontWeight: 600,
                            background: isStrong ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                            border: isStrong ? '1.5px solid rgba(255,255,255,0.30)' : '1px solid rgba(255,255,255,0.08)',
                            color: isStrong ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <span>{s.icon}</span>
                          <span>{s.shortTitle}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : strongSubjects.length > 0 ? (
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
              ) : (
                <div style={{
                  ...GLASS, padding: '14px 16px',
                  fontSize: 12, color: 'rgba(255,255,255,0.40)',
                  textAlign: 'center',
                }}>
                  No strengths set. Tap Edit to mark subjects you&apos;re comfortable with.
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── SECTION 6: Daily Goal ── */}
      {(() => {
        const goalConfig = DAILY_GOALS[progress.dailyGoalTier]
        const todayStr = getLocalDate()
        const todayRead = progress.todayDate === todayStr ? (progress.todayTopicsRead || 0) : 0
        const todayPracticed = progress.todayDate === todayStr ? (progress.todayTopicsPracticed || 0) : 0
        const readMet = todayRead >= goalConfig.readTarget
        const practiceMet = todayPracticed >= goalConfig.practiceTarget
        const goalMet = readMet && practiceMet
        const readPct = goalConfig.readTarget > 0 ? Math.min(100, Math.round((todayRead / goalConfig.readTarget) * 100)) : 100
        const practicePct = goalConfig.practiceTarget > 0 ? Math.min(100, Math.round((todayPracticed / goalConfig.practiceTarget) * 100)) : 100
        return (
          <div style={{ ...GLASS, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{goalConfig.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  Daily Goal: {goalConfig.label}
                </span>
              </div>
              {goalMet && <span style={{ fontSize: 14 }}>&#10003;</span>}
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: readMet ? '#34d399' : 'rgba(255,255,255,0.50)' }}>Topics Read</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: readMet ? '#34d399' : 'rgba(255,255,255,0.60)', fontVariantNumeric: 'tabular-nums' }}>{todayRead}/{goalConfig.readTarget}</span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 9999, width: `${readPct}%`,
                  background: readMet ? 'linear-gradient(90deg, #22c55e, #34d399)' : 'linear-gradient(90deg, #6366f1, #a78bfa)',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: practiceMet ? '#34d399' : 'rgba(255,255,255,0.50)' }}>Practice Sessions</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: practiceMet ? '#34d399' : 'rgba(255,255,255,0.60)', fontVariantNumeric: 'tabular-nums' }}>{todayPracticed}/{goalConfig.practiceTarget}</span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 9999, width: `${practicePct}%`,
                  background: practiceMet ? 'linear-gradient(90deg, #22c55e, #34d399)' : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: goalMet ? '#34d399' : 'rgba(255,255,255,0.50)' }}>
                {goalMet ? 'Goal complete!' : `${goalConfig.readTarget} read · ${goalConfig.practiceTarget} practice`}
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

      {/* ── SECTION 9: Achievements ──
          Every badge is rendered (no "View All" hide), every badge is
          clickable (locked OR unlocked), and tapping opens a detail
          modal that explains how to unlock it (or when it was earned). */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Achievements</p>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>
            {unlockedIds.size}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div style={{ ...GLASS, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {ACHIEVEMENTS.map(ach => {
              const unlocked = unlockedIds.has(ach.id)
              return (
                <button
                  key={ach.id}
                  type="button"
                  onClick={() => setSelectedAchievementId(ach.id)}
                  aria-label={`${ach.title} — ${unlocked ? 'unlocked' : 'locked'}. Tap for details.`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 4px', borderRadius: 16,
                    background: unlocked ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${unlocked ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                    transition: 'transform 150ms ease, background 150ms ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)' }}
                  onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                >
                  <span style={{
                    fontSize: 22,
                    filter: unlocked ? 'none' : 'grayscale(1) brightness(0.5)',
                    opacity: unlocked ? 1 : 0.45,
                  }}>
                    {ach.icon}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    color: unlocked ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)',
                    textAlign: 'center', lineHeight: 1.2,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    minHeight: 22,
                  }}>
                    {ach.title}
                  </span>
                </button>
              )
            })}
          </div>
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

              {/* Focus Areas + Strengths editing moved to their own cards
                  in SECTION 4 above — see "Focus Areas" and "Strengths". */}

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
                This will clear your progress, knowledge levels, streaks, and achievements. This cannot be undone.
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

      {/* ── Achievement detail modal ─────────────────────────────────────
          Opens when the user taps any badge (locked or unlocked). Shows
          the icon, title, description ("how to unlock") and lock state.
          For unlocked badges, also shows the date earned. */}
      {selectedAchievementId && (() => {
        const ach = ACHIEVEMENTS.find(a => a.id === selectedAchievementId)
        if (!ach) return null
        const unlocked = unlockedIds.has(ach.id)
        const earnedAt = unlockedAtMap.get(ach.id)
        const earnedDate = earnedAt
          ? new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null
        const close = () => setSelectedAchievementId(null)
        return (
          <>
            <style>{`
              @keyframes prof-ach-fadeIn { from { opacity: 0 } to { opacity: 1 } }
              @keyframes prof-ach-cardIn {
                0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.86); }
                60%  { transform: translate(-50%, -50%) scale(1.02); }
                100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              }
            `}</style>
            <div
              onClick={close}
              style={{
                position: 'fixed', inset: 0, zIndex: 250,
                background: 'rgba(2, 4, 12, 0.78)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                animation: 'prof-ach-fadeIn 0.3s ease forwards',
              }}
            />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed', top: '50%', left: '50%', zIndex: 251,
                width: 'min(340px, calc(100vw - 32px))',
                padding: '28px 24px 22px',
                borderRadius: 24,
                background: 'linear-gradient(180deg, rgba(20, 18, 32, 0.98) 0%, rgba(10, 10, 18, 0.99) 100%)',
                border: unlocked
                  ? '1px solid rgba(99,102,241,0.45)'
                  : '1px solid rgba(255,255,255,0.10)',
                boxShadow: unlocked
                  ? '0 30px 80px rgba(0, 0, 0, 0.65), 0 0 80px rgba(99,102,241,0.30), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255,255,255,0.04)',
                transform: 'translate(-50%, -50%)',
                animation: 'prof-ach-cardIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              {/* Big icon */}
              <div style={{
                textAlign: 'center',
                fontSize: 64,
                lineHeight: 1,
                marginBottom: 14,
                filter: unlocked ? 'none' : 'grayscale(1) brightness(0.6)',
                opacity: unlocked ? 1 : 0.55,
              }}>
                {ach.icon}
              </div>

              {/* Status pill */}
              <div style={{
                display: 'flex', justifyContent: 'center', marginBottom: 12,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 9999,
                  background: unlocked ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)',
                  border: unlocked ? '1px solid rgba(34,197,94,0.32)' : '1px solid rgba(255,255,255,0.10)',
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
                  color: unlocked ? '#34d399' : 'rgba(255,255,255,0.50)',
                  textTransform: 'uppercase',
                }}>
                  {unlocked ? (
                    <>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      Unlocked
                    </>
                  ) : (
                    <>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      Locked
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <div style={{
                fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
                textAlign: 'center', letterSpacing: '-0.015em', lineHeight: 1.25,
                marginBottom: 8,
              }}>
                {ach.title}
              </div>

              {/* "How to unlock" / description */}
              <div style={{
                fontSize: 13, color: 'rgba(255,255,255,0.62)',
                textAlign: 'center', lineHeight: 1.5,
                marginBottom: 14, padding: '0 4px',
              }}>
                {unlocked ? ach.description : `How to unlock: ${ach.description}.`}
              </div>

              {/* Earned date footer */}
              {unlocked && earnedDate && (
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.35)', textAlign: 'center',
                  textTransform: 'uppercase', marginBottom: 16,
                }}>
                  Earned · {earnedDate}
                </div>
              )}

              {/* Close */}
              <button
                type="button"
                onClick={close}
                style={{
                  width: '100%', height: 46, borderRadius: 14,
                  background: unlocked
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'rgba(255,255,255,0.06)',
                  color: unlocked ? '#fff' : 'rgba(255,255,255,0.78)',
                  fontSize: 13.5, fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: unlocked ? '0 6px 22px rgba(99,102,241,0.35)' : 'none',
                  border: unlocked ? 'none' : '1px solid rgba(255,255,255,0.10)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {unlocked ? 'NICE' : 'GOT IT'}
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}

