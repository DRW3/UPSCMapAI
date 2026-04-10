'use client'

import { useMemo } from 'react'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import type { StudyDay } from '@/components/journey/types'
import { PREP_STAGE_CONFIG } from '@/components/journey/types'
import { UPSC_SYLLABUS } from '@/data/syllabus'

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `${r},${g},${b}`
}

// ── SectionHeader ──────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 14,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.50)',
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.10) 0%, transparent 100%)',
      }} />
    </div>
  )
}

// ── IdentityCard ───────────────────────────────────────────────────────────────

interface IdentityCardProps {
  profile: NonNullable<JourneyStateValue['profile']>
  level: number
  onReset: () => void
}

function IdentityCard({ profile, level, onReset }: IdentityCardProps) {
  const initial = (profile.name || 'U').charAt(0).toUpperCase()
  const prepConfig = PREP_STAGE_CONFIG[profile.prepStage]

  function handleReset() {
    if (window.confirm('Reset all progress? This cannot be undone.')) {
      onReset()
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '28px 22px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
    }}>
      {/* Avatar orb */}
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 28,
          background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
          animation: 'dj-rotate 12s linear infinite',
          padding: 2.5,
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: 26,
            background: '#0a0a1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900,
              fontSize: 38,
              lineHeight: 1,
            }}>
              {initial}
            </span>
          </div>
        </div>
      </div>

      {/* Name */}
      <div style={{
        fontSize: 18, fontWeight: 800, color: '#fff',
        textAlign: 'center', lineHeight: 1.2,
      }}>
        {profile.name || 'Aspirant'}
      </div>

      {/* Exam year + prep stage */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.55)',
          fontWeight: 600,
        }}>
          UPSC {profile.examYear}
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.42)',
        }}>
          {prepConfig.icon} {prepConfig.label}
        </div>
      </div>

      {/* Level pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        borderRadius: 20,
        background: 'rgba(99,102,241,0.18)',
        border: '1px solid rgba(99,102,241,0.35)',
        fontSize: 12,
        fontWeight: 700,
        color: '#a5b4fc',
        letterSpacing: '0.02em',
      }}>
        ⚡ Level {level}
      </div>

      {/* Divider */}
      <div style={{
        width: '100%',
        height: 1,
        background: 'rgba(255,255,255,0.06)',
        margin: '4px 0',
      }} />

      {/* Edit profile button */}
      <button
        onClick={() => {/* no-op: edit modal in future phase */}}
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 12,
          background: 'rgba(167,139,250,0.12)',
          border: '1px solid rgba(167,139,250,0.25)',
          color: '#c4b5fd',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.02em',
          transition: 'background 0.15s',
        }}
      >
        Edit Profile
      </button>

      {/* Reset journey button */}
      <button
        onClick={handleReset}
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 12,
          background: 'rgba(244,63,94,0.10)',
          border: '1px solid rgba(244,63,94,0.20)',
          color: 'rgba(244,114,128,0.65)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.02em',
          transition: 'background 0.15s',
        }}
      >
        Reset Journey
      </button>
    </div>
  )
}

// ── StatsGrid ──────────────────────────────────────────────────────────────────

interface StatsGridProps {
  completed: number
  acc: number
  totalAnswered: number
  streak: number
}

function StatsGrid({ completed, acc, totalAnswered, streak }: StatsGridProps) {
  const stats: Array<{ value: string | number; label: string; accent: string }> = [
    { value: completed, label: 'Topics Done',  accent: '#34d399' },
    { value: `${acc}%`, label: 'Accuracy',     accent: '#67e8f9' },
    { value: totalAnswered, label: 'Questions', accent: '#fb923c' },
    { value: `${streak}d`, label: 'Streak',    accent: '#f472b6' },
  ]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '20px 20px 18px',
    }}>
      <SectionHeader label="Stats" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}>
        {stats.map(({ value, label, accent }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <span style={{
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1,
              background: `linear-gradient(135deg, #fff, ${accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {value}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.40)',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Heatmap ────────────────────────────────────────────────────────────────────

interface HeatmapProps {
  studyCalendar: StudyDay[]
}

function Heatmap({ studyCalendar }: HeatmapProps) {
  const cells = useMemo(() => {
    // Build lookup from studyCalendar
    const calMap = new Map<string, StudyDay>()
    for (const day of studyCalendar) {
      calMap.set(day.date, day)
    }

    // Build the last 84 days (12 weeks × 7 days), oldest first
    const now = new Date()
    const dates: string[] = []
    for (let i = 83; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      )
    }

    // Find max questions in this window for intensity scaling
    let max = 0
    for (const date of dates) {
      const day = calMap.get(date)
      if (day && day.questionsAnswered > max) max = day.questionsAnswered
    }

    return dates.map(date => {
      const day = calMap.get(date)
      const q = day?.questionsAnswered ?? 0
      const intensity = max > 0 ? Math.min(q / max, 1) : 0
      return { date, q, intensity, correct: day?.correctAnswers ?? 0 }
    })
  }, [studyCalendar])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '20px 20px 18px',
    }}>
      <SectionHeader label="Last 12 weeks" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'repeat(7, 1fr)',
        gap: 3,
        gridAutoFlow: 'column',
      }}>
        {cells.map(({ date, q, intensity }) => (
          <div
            key={date}
            title={`${date} · ${q} question${q !== 1 ? 's' : ''}`}
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 3,
              background: q > 0
                ? `rgba(167,139,250,${(0.20 + intensity * 0.65).toFixed(2)})`
                : 'rgba(255,255,255,0.04)',
              cursor: 'default',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── SubjectProgressList ────────────────────────────────────────────────────────

interface SubjectProgressListProps {
  enrichedTopicStates: JourneyStateValue['enrichedTopicStates']
}

function SubjectProgressList({ enrichedTopicStates }: SubjectProgressListProps) {
  const rows = useMemo(() => {
    return UPSC_SYLLABUS.map(subject => {
      const allTopicIds = subject.units.flatMap(u => u.topics.map(t => t.id))
      const total = allTopicIds.length
      const done = allTopicIds.filter(id => {
        const entry = enrichedTopicStates[id]
        return entry?.state === 'completed'
      }).length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return { subject, pct }
    })
  }, [enrichedTopicStates])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '20px 20px 18px',
      flex: 1,
    }}>
      <SectionHeader label="By subject" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(({ subject, pct }) => {
          const rgb = hexToRgb(subject.color)
          return (
            <div key={subject.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Icon */}
              <span style={{ fontSize: 14, flexShrink: 0, width: 20, textAlign: 'center' }}>
                {subject.icon}
              </span>
              {/* Label */}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.65)',
                width: 110,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {subject.shortTitle}
              </span>
              {/* Progress bar */}
              <div style={{
                flex: 1,
                height: 6,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: `rgba(${rgb},0.80)`,
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              {/* Percentage */}
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: pct > 0 ? `rgba(${rgb},0.90)` : 'rgba(255,255,255,0.28)',
                width: 32,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── RecentMilestones ───────────────────────────────────────────────────────────

interface RecentMilestonesProps {
  studyCalendar: StudyDay[]
}

function RecentMilestones({ studyCalendar }: RecentMilestonesProps) {
  const recent = useMemo(() => {
    return [...studyCalendar]
      .filter(d => d.questionsAnswered > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  }, [studyCalendar])

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: '20px 20px 18px',
    }}>
      <SectionHeader label="Recent Activity" />
      {recent.length === 0 ? (
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.30)',
          textAlign: 'center',
          padding: '16px 0',
          fontStyle: 'italic',
        }}>
          No activity recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map(day => {
            const acc = day.questionsAnswered > 0
              ? Math.round((day.correctAnswers / day.questionsAnswered) * 100)
              : 0
            const [, mm, dd] = day.date.split('-')
            const label = `${parseInt(mm)}/${parseInt(dd)}`
            return (
              <div key={day.date} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {/* Date dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'rgba(167,139,250,0.70)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: 'rgba(255,255,255,0.60)',
                  width: 36, flexShrink: 0,
                }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', flex: 1 }}>
                  {day.questionsAnswered} answered
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: acc >= 70 ? '#34d399' : acc >= 40 ? '#fb923c' : '#f472b6',
                  background: acc >= 70 ? 'rgba(52,211,153,0.12)' : acc >= 40 ? 'rgba(251,146,60,0.12)' : 'rgba(244,114,182,0.12)',
                  borderRadius: 6,
                  padding: '2px 7px',
                }}>
                  {acc}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── DesktopProfilePane ─────────────────────────────────────────────────────────

interface Props {
  state: JourneyStateValue
}

export function DesktopProfilePane({ state }: Props) {
  const { profile, progress, enrichedTopicStates, handleResetJourney } = state
  if (!profile) return null

  // Compute stats
  const totalAnswered = Object.values(progress.topics).reduce((s, t) => s + (t.questionsAnswered || 0), 0)
  const totalCorrect = Object.values(progress.topics).reduce((s, t) => s + (t.correctAnswers || 0), 0)
  const acc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const level = Math.floor(totalAnswered / 50) + 1
  const completed = Object.values(progress.topics).filter(t => t.state === 'completed').length

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1.2fr 1fr',
      gap: 22,
      animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both',
      alignItems: 'start',
    }}>
      {/* COL 1 — Identity */}
      <IdentityCard profile={profile} level={level} onReset={handleResetJourney} />

      {/* COL 2 — Stats + Heatmap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <StatsGrid
          completed={completed}
          acc={acc}
          totalAnswered={totalAnswered}
          streak={progress.streak ?? 0}
        />
        <Heatmap studyCalendar={progress.studyCalendar} />
      </div>

      {/* COL 3 — Subject progress + Recent activity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <SubjectProgressList enrichedTopicStates={enrichedTopicStates} />
        <RecentMilestones studyCalendar={progress.studyCalendar} />
      </div>
    </div>
  )
}
