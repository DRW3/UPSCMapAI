'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import type { JourneyStateValue, EnrichedTopicEntry } from '@/components/journey/hooks/useJourneyState'
import { DAILY_GOALS } from '@/components/journey/types'
import { UPSC_SYLLABUS, type LearningSubject } from '@/data/syllabus'
import { HoloFrame } from '@/components/journey/desktop/chrome/HoloFrame'
import { DesktopMentorDock } from '../shell/DesktopMentorDock'

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `${r},${g},${b}`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night grind'
}

// ── DesktopTodayPane ───────────────────────────────────────────────────────────

interface DesktopTodayPaneProps {
  state: JourneyStateValue
}

export function DesktopTodayPane({ state }: DesktopTodayPaneProps) {
  const { progress, profile, continueTarget, enrichedTopicStates } = state
  const subjects = UPSC_SYLLABUS

  const firstName = profile?.name ? profile.name.split(' ')[0] : null

  const greeting = useMemo(() => getGreeting(), [])
  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  [])

  // ── Up-next topics (inline, mirrors HomeTab logic) ──────────────────────────
  const upNextTopics = useMemo(() => {
    if (!subjects.length) return []
    const continueId = continueTarget?.topic.id
    const weakIds = profile?.weakSubjects || []
    const weakIdSet = new Set(weakIds)

    const collectFrom = (subjectList: LearningSubject[], limit: number) => {
      const out: typeof enrichedTopicStates[string][] = []
      for (const subject of subjectList) {
        for (const unit of subject.units) {
          for (const topic of unit.topics) {
            if (out.length >= limit) break
            if (topic.id === continueId) continue
            const entry = enrichedTopicStates[topic.id]
            if (entry && entry.state === 'available') out.push(entry)
          }
          if (out.length >= limit) break
        }
        if (out.length >= limit) break
      }
      return out
    }

    const incompleteWeakSubjects = subjects.filter(sub => {
      if (!weakIdSet.has(sub.id)) return false
      for (const u of sub.units) {
        for (const t of u.topics) {
          const entry = enrichedTopicStates[t.id]
          if (!entry || entry.state !== 'completed') return true
        }
      }
      return false
    })

    if (incompleteWeakSubjects.length > 0) {
      const ordered = [...incompleteWeakSubjects].sort((a, b) => {
        const ai = weakIds.indexOf(a.id)
        const bi = weakIds.indexOf(b.id)
        return ai - bi
      })
      return collectFrom(ordered, 3)
    }

    return collectFrom(subjects, 3)
  }, [subjects, enrichedTopicStates, continueTarget, profile])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 24,
        alignItems: 'start',
        animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both',
        minHeight: 0,
      }}
    >
      {/* LEFT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Greeting */}
        <div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.40)',
            marginTop: 5,
            letterSpacing: '0.01em',
          }}>
            {dateLabel}
          </div>
        </div>

        {/* Inline AI Mentor — only on Today tab */}
        <div style={{
          marginBottom: 18,
          borderRadius: 20,
          border: '1px solid rgba(167,139,250,0.15)',
          background: 'rgba(5,5,16,0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          overflow: 'hidden',
          maxHeight: 480,
          animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) 0.1s both',
        }}>
          <DesktopMentorDock state={state} inline />
        </div>

        {/* Continue Card */}
        <ContinueCard state={state} />

        {/* Daily Goal Panel */}
        <DailyGoalDesktopPanel progress={progress} />
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Up Next (includes focus subjects) */}
        <DesktopUpNextList upNextTopics={upNextTopics} state={state} subjects={subjects} />
      </div>
    </div>
  )
}

// ── ContinueCard ───────────────────────────────────────────────────────────────

function ContinueCard({ state }: { state: JourneyStateValue }) {
  const { continueTarget } = state

  if (!continueTarget) {
    return (
      <HoloFrame radius={20} thickness={1.5} padding={22}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 80,
          fontSize: 13, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.01em',
        }}>
          All topics completed — great work!
        </div>
      </HoloFrame>
    )
  }

  const { topic, subject } = continueTarget
  const rgb = hexToRgb(subject.color)

  return (
    <HoloFrame radius={20} thickness={1.5} padding={22}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{subject.icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: `rgba(${rgb},0.85)`,
          background: `rgba(${rgb},0.12)`,
          border: `1px solid rgba(${rgb},0.28)`,
          padding: '3px 9px', borderRadius: 999,
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {subject.shortTitle}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.30)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Continue
        </span>
      </div>

      {/* Topic title */}
      <div style={{
        fontSize: 18, fontWeight: 800,
        color: 'rgba(255,255,255,0.93)',
        letterSpacing: '-0.02em',
        lineHeight: 1.25,
        marginBottom: 18,
      }}>
        {topic.title}
      </div>

      {/* Start now button */}
      <button
        onClick={() => state.handleNodeTap(topic.id, topic, subject)}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: 14,
          background: `linear-gradient(135deg, rgba(${rgb},0.85) 0%, rgba(${rgb},0.65) 100%)`,
          border: `1px solid rgba(${rgb},0.45)`,
          color: '#fff',
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: `0 4px 20px rgba(${rgb},0.28), inset 0 1px 0 rgba(255,255,255,0.10)`,
          transition: 'all 200ms ease-out',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M5 3l7 5-7 5V3z" fill="currentColor" />
        </svg>
        Start Now
      </button>
    </HoloFrame>
  )
}

// ── DailyGoalDesktopPanel ──────────────────────────────────────────────────────

function DailyGoalDesktopPanel({ progress }: { progress: JourneyStateValue['progress'] }) {
  const goalCfg = DAILY_GOALS[progress.dailyGoalTier ?? 'regular']
  const todayRead = progress.todayTopicsRead || 0
  const todayPracticed = progress.todayTopicsPracticed || 0

  const readPct = Math.min(100, goalCfg.readTarget > 0 ? (todayRead / goalCfg.readTarget) * 100 : 0)
  const practicePct = Math.min(100, goalCfg.practiceTarget > 0 ? (todayPracticed / goalCfg.practiceTarget) * 100 : 0)

  const readMet = todayRead >= goalCfg.readTarget
  const practiceMet = todayPracticed >= goalCfg.practiceTarget

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18,
      padding: '18px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>{goalCfg.icon}</span>
        <span style={{
          fontSize: 13, fontWeight: 800,
          color: 'rgba(255,255,255,0.80)',
          letterSpacing: '-0.01em',
        }}>
          Daily Goal
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {goalCfg.label} · {goalCfg.timeEstimate}
        </span>
      </div>

      {/* Read bar */}
      <ProgressBar
        label="Read"
        current={todayRead}
        target={goalCfg.readTarget}
        pct={readPct}
        met={readMet}
        color="167,139,250"
      />

      <div style={{ height: 10 }} />

      {/* Practice bar */}
      <ProgressBar
        label="Practice"
        current={todayPracticed}
        target={goalCfg.practiceTarget}
        pct={practicePct}
        met={practiceMet}
        color="56,189,248"
      />
    </div>
  )
}

function ProgressBar({
  label,
  current,
  target,
  pct,
  met,
  color,
}: {
  label: string
  current: number
  target: number
  pct: number
  met: boolean
  color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: met ? `rgba(${color},0.95)` : 'rgba(255,255,255,0.45)',
        }}>
          {current} / {target}
          {met && (
            <span style={{ marginLeft: 5 }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle' }}>
                <path d="M3 8.5l3.2 3.2L13 5" stroke={`rgba(${color},0.95)`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </span>
      </div>
      <div style={{
        height: 7,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          borderRadius: 999,
          width: `${pct}%`,
          background: met
            ? `linear-gradient(90deg, rgba(${color},0.75), rgba(${color},1.0))`
            : `linear-gradient(90deg, rgba(${color},0.50), rgba(${color},0.80))`,
          transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
          boxShadow: met ? `0 0 10px rgba(${color},0.45)` : 'none',
        }} />
      </div>
    </div>
  )
}

// ── DesktopUpNextList (with focus subjects merged in) ──────────────────────────

interface DesktopUpNextListProps {
  upNextTopics: EnrichedTopicEntry[]
  state: JourneyStateValue
  subjects: LearningSubject[]
}

function DesktopUpNextList({ upNextTopics, state, subjects }: DesktopUpNextListProps) {
  const { profile } = state

  // Focus-subjects state (previously in DesktopFocusSubjects)
  const [editing, setEditing] = useState(false)
  const [draftWeak, setDraftWeak] = useState<string[]>(profile?.weakSubjects ?? [])
  const [savedFlash, setSavedFlash] = useState(false)
  const [chipBurst, setChipBurst] = useState(false)

  useEffect(() => {
    setDraftWeak(profile?.weakSubjects ?? [])
  }, [profile?.weakSubjects])

  const currentFocus = useMemo(() => profile?.weakSubjects ?? [], [profile?.weakSubjects])
  const sortedDraft = [...draftWeak].sort().join(',')
  const sortedSaved = [...currentFocus].sort().join(',')
  const hasChanges = sortedDraft !== sortedSaved || draftWeak.join(',') !== currentFocus.join(',')

  const focusedSubjects = currentFocus
    .map(id => subjects.find(s => s.id === id))
    .filter((s): s is LearningSubject => !!s)

  const toggle = useCallback((id: string) => {
    setDraftWeak(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [id, ...prev]
    )
  }, [])

  const apply = useCallback(() => {
    if (!profile || !hasChanges) return
    state.handleProfileUpdate({ ...profile, weakSubjects: draftWeak })
    setEditing(false)
    setSavedFlash(true)
    setChipBurst(true)
    window.setTimeout(() => setSavedFlash(false), 1700)
    window.setTimeout(() => setChipBurst(false), 1300)
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const scroller = document.querySelector('[data-desktop-center-scroll]') as HTMLElement | null
          if (!scroller) return
          try {
            scroller.scrollTo({ top: 0, behavior: 'smooth' })
            window.setTimeout(() => {
              if (scroller.scrollTop > 4) scroller.scrollTop = 0
            }, 380)
          } catch {
            scroller.scrollTop = 0
          }
        })
      })
    }
  }, [profile, hasChanges, draftWeak, state])

  const cancel = useCallback(() => {
    setDraftWeak(currentFocus)
    setEditing(false)
  }, [currentFocus])

  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Up Next
        </span>
        <div style={{ flex: 1 }} />
        {savedFlash && (
          <span
            role="status"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 800,
              color: '#6ee7b7',
              background: 'rgba(52,211,153,0.14)',
              border: '1px solid rgba(52,211,153,0.40)',
              padding: '3px 8px', borderRadius: 999,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              boxShadow: '0 0 12px rgba(52,211,153,0.30)',
              animation: 'dj-shimmer 1.6s ease-out both',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved
          </span>
        )}
      </div>

      {/* Focus subject chips */}
      {profile && subjects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {!editing ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {focusedSubjects.map((s, i) => {
                const rgb = hexToRgb(s.color)
                return (
                  <span key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: `rgba(${rgb},0.12)`,
                    border: `1px solid rgba(${rgb},0.30)`,
                    color: `rgba(${rgb},0.95)`,
                    fontSize: 11, fontWeight: 650,
                    whiteSpace: 'nowrap',
                    boxShadow: `0 0 10px rgba(${rgb},0.10)`,
                    ...(chipBurst ? {
                      animation: `dj-pulse 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
                    } : {}),
                  }}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>
                    {s.shortTitle}
                  </span>
                )
              })}
              {focusedSubjects.length === 0 && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                  No focus subjects selected
                </span>
              )}
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: '#a5b4fc',
                  fontSize: 10, fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div style={{ animation: 'dj-fadeUp 350ms cubic-bezier(0.22,1,0.36,1) both' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', marginBottom: 10, lineHeight: 1.55 }}>
                Pick the subjects you want to study most. Tap to add or remove.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {subjects.map((s, i) => {
                  const isOn = draftWeak.includes(s.id)
                  const rgb = hexToRgb(s.color)
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      aria-pressed={isOn}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 10px', borderRadius: 999,
                        background: isOn ? `rgba(${rgb},0.18)` : 'rgba(255,255,255,0.025)',
                        border: isOn ? `1.5px solid rgba(${rgb},0.55)` : '1.5px solid rgba(255,255,255,0.07)',
                        color: isOn ? `rgba(${rgb},0.98)` : 'rgba(255,255,255,0.55)',
                        fontSize: 11, fontWeight: isOn ? 750 : 550,
                        cursor: 'pointer',
                        transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                        WebkitTapHighlightColor: 'transparent',
                        boxShadow: isOn ? `0 0 14px rgba(${rgb},0.20), inset 0 1px 0 rgba(255,255,255,0.05)` : 'none',
                        animation: `dj-fadeUp 260ms cubic-bezier(0.16,1,0.3,1) ${i * 18}ms both`,
                      }}
                    >
                      <span style={{ fontSize: 12 }}>{s.icon}</span>
                      {s.shortTitle}
                      {isOn && (
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 1 }}>
                          <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  onClick={apply}
                  disabled={!hasChanges}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: hasChanges
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(168,85,247,0.95) 50%, rgba(56,189,248,0.95) 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: hasChanges
                      ? '1px solid rgba(167,139,250,0.45)'
                      : '1px solid rgba(255,255,255,0.06)',
                    color: hasChanges ? '#fff' : 'rgba(255,255,255,0.30)',
                    fontSize: 11, fontWeight: 800,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: hasChanges ? 'pointer' : 'default',
                    transition: 'all 250ms ease-out',
                    WebkitTapHighlightColor: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {hasChanges ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <path d="M9 1L2 9h5l-1 6 7-8H8l1-6z" fill="currentColor" />
                      </svg>
                      Save
                    </>
                  ) : (
                    'No changes'
                  )}
                </button>
                <button
                  onClick={cancel}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.50)',
                    fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Up Next topic list */}
      {upNextTopics.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', paddingBottom: 4 }}>
          No available topics right now.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upNextTopics.map((entry, i) => {
            const { topic, subject } = entry
            const rgb = hexToRgb(subject.color)
            return (
              <button
                key={topic.id}
                onClick={() => state.handleNodeTap(topic.id, topic, subject)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 180ms ease-out',
                  WebkitTapHighlightColor: 'transparent',
                  animation: `dj-fadeUp 300ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.08)`
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.22)`
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.025)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `rgba(${rgb},0.12)`,
                  border: `1px solid rgba(${rgb},0.22)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {subject.icon}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    color: 'rgba(255,255,255,0.88)',
                    letterSpacing: '-0.01em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {topic.title}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    color: `rgba(${rgb},0.75)`,
                    marginTop: 2, letterSpacing: '0.03em',
                  }}>
                    {subject.shortTitle}
                  </div>
                </div>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
                  <path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

