'use client'

import { useMemo, useState, useEffect } from 'react'
import type { JourneyProgress, NodeState, UserProfile } from './types'
import { DAILY_GOALS, GLASS_STYLE, ELEVATED_STYLE } from './types'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TopicStateEntry {
  state: NodeState
  topic: LearningTopic
  subject: LearningSubject
}

interface HomeTabProps {
  progress: JourneyProgress
  subjects?: LearningSubject[]
  topicStates: Record<string, TopicStateEntry>
  onTopicTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onNavigateToPath: (focusSubjectId?: string) => void
  profile: UserProfile | null
  dailyTip?: string | null
  // Parent-computed continue target — the SINGLE source of truth for what
  // the "Your Next Step" CTA points at AND what the mentor's daily tip
  // recommends. Must be identical to guarantee the two never disagree.
  continueTarget?: TopicStateEntry | null
  // Opens the Daily Goal selector modal. Wired up to the same handler the
  // Profile tab uses so the user can change their goal from either screen.
  onChangeGoal?: () => void
  // Persists profile changes (currently used by the AI Focus Calibration
  // panel to update profile.weakSubjects without leaving the home tab).
  onProfileUpdate?: (updated: UserProfile) => void
}

// Convert "#abcdef" → "171,205,239" for use inside rgba() strings.
function hexToRgbCsv(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `${r},${g},${b}`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night grind'
}

function getToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Quotes removed — keeping landing lean and action-focused

// ── Shared Styles ──────────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  ...GLASS_STYLE,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding: '14px 16px',
  marginBottom: 14,
}

const elevatedGlassCard: React.CSSProperties = {
  ...ELEVATED_STYLE,
  padding: 20,
  marginBottom: 16,
}

// ── Mini Components ────────────────────────────────────────────────────────────

// ── AI Focus Calibration Panel ────────────────────────────────────────────────
// A futuristic-AI inline panel that lets the aspirant retune which subjects
// the system prioritises in recommendations. The "focus areas" map directly
// to profile.weakSubjects (set at onboarding), so retuning here updates the
// same source of truth ProfileTab edits.
//
// Visual register: animated conic-gradient outer ring (rotating slowly via
// the existing edgeRotate keyframe), opaque dark inner card with a low-key
// horizontal scan line, a pulsing status dot that breathes in violet, and
// a holographic-feeling Apply button that lights up only when there's an
// actual diff against the saved profile.
function FocusAreaPanel({
  profile,
  subjects,
  onProfileUpdate,
}: {
  profile: UserProfile | null
  subjects?: LearningSubject[]
  onProfileUpdate?: (updated: UserProfile) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftWeak, setDraftWeak] = useState<string[]>(profile?.weakSubjects ?? [])
  // Brief inline "Saved" pill + chip-glow burst that fires when the user
  // commits a change. No full-screen overlay — instead we scroll the
  // home tab back to the top so the user sees the Mentor's Suggestion
  // and Your Next Step rebuilding themselves in their existing
  // loading/refresh registers.
  const [savedFlash, setSavedFlash] = useState(false)
  const [chipBurst, setChipBurst] = useState(false)

  // Re-sync the draft any time the saved profile changes (e.g. ProfileTab
  // edited the same field on another screen).
  useEffect(() => {
    setDraftWeak(profile?.weakSubjects ?? [])
  }, [profile?.weakSubjects])

  if (!profile || !subjects?.length) return null

  const currentFocus = profile.weakSubjects ?? []
  // Order-insensitive diff (membership change)
  const sortedDraft = [...draftWeak].sort().join(',')
  const sortedSaved = [...currentFocus].sort().join(',')
  // Order-sensitive diff (priority change — e.g. user reordered picks
  // by toggling Economy off and back on so it leapfrogs Polity)
  const hasChanges = sortedDraft !== sortedSaved || draftWeak.join(',') !== currentFocus.join(',')

  // Display chips in PICK ORDER, not syllabus order, so the chip on the
  // left is always the most recently picked subject — matching the
  // priority order that drives Mentor's Suggestion (uses weakSubjects[0])
  // and Your Next Step (continueTarget Priority 2 walks the array in
  // order). The user can read priority off the chip row left-to-right.
  const focusedSubjects = currentFocus
    .map(id => subjects.find(s => s.id === id))
    .filter((s): s is LearningSubject => !!s)

  const toggle = (id: string) => {
    setDraftWeak(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      // PREPEND new picks so the most recently selected subject sits at
      // index 0. Mentor's Suggestion reads weakSubjects[0] for its `weak=`
      // param, and continueTarget walks the array in order and returns
      // the first match — so position 0 = highest priority = the subject
      // the user just picked.
      : [id, ...prev]
    )
  }

  const apply = () => {
    if (!onProfileUpdate || !hasChanges) return
    // 1. Push the new profile up — this triggers the parent's
    //    handleProfileUpdate, which writes to localStorage and updates
    //    React state. The dailyTip useEffect re-runs (clears tip → null,
    //    refetches), the continueTarget memo recomputes against the new
    //    weakSubjects, and the upNext memo in this component recomputes.
    onProfileUpdate({ ...profile, weakSubjects: draftWeak })
    // 2. Collapse the editor back to the compact chip view so the user
    //    can see the new focus subjects in place.
    setEditing(false)
    // 3. Fire two short inline confirmations: a "Saved" pill next to
    //    the header, and a glow burst on the chip row. Both are
    //    auto-dismissed after their animations finish.
    setSavedFlash(true)
    setChipBurst(true)
    window.setTimeout(() => setSavedFlash(false), 1700)
    window.setTimeout(() => setChipBurst(false), 1300)
    // 4. Smooth-scroll the home-tab scroll container back to the top
    //    so the user can SEE the Mentor's Suggestion card pulsing in
    //    its loading state and the Your Next Step card rebuilding
    //    against the new focus subjects.
    //
    //    Two layers of deferral are needed:
    //    - rAF (1) lets React commit the state changes from steps 1-3
    //      so the panel has collapsed back to compact height before
    //      we scroll. Otherwise the scrollTop calculation is off by
    //      whatever the editor was taking up.
    //    - rAF (2) lets the layout reflow against the collapsed
    //      panel so the new scrollHeight is accurate.
    //
    //    Inside, we try smooth scroll first; if the browser refuses
    //    (some iOS Safari versions ignore behavior:'smooth' when
    //    -webkit-overflow-scrolling: touch is on), we fall back to
    //    instant scrollTop = 0 so the user always lands at the top.
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const scroller = document.querySelector('[data-home-scroll]') as HTMLElement | null
          if (!scroller) return
          try {
            scroller.scrollTo({ top: 0, behavior: 'smooth' })
            // Belt and braces: if smooth scroll didn't kick in within
            // 60ms (some browsers silently no-op), force the position.
            window.setTimeout(() => {
              if (scroller.scrollTop > 4) scroller.scrollTop = 0
            }, 380)
          } catch {
            scroller.scrollTop = 0
          }
        })
      })
    }
  }

  const cancel = () => {
    setDraftWeak(currentFocus)
    setEditing(false)
  }

  return (
    <div style={{
      position: 'relative',
      borderRadius: 18,
      padding: 1.5,
      marginBottom: 10,
      // Conic-gradient animated border — the futuristic "AI is thinking"
      // signature. Uses --edge-angle (already declared via @property in
      // the parent style block) and the existing edgeRotate keyframe.
      background: 'conic-gradient(from var(--edge-angle, 0deg), rgba(99,102,241,0.55), rgba(56,189,248,0.55), rgba(168,85,247,0.55), rgba(244,114,182,0.45), rgba(99,102,241,0.55))',
      animation: 'edgeRotate 8s linear infinite, edgePulse 4s ease-in-out infinite',
      WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{
        background: '#0a0a14',
        borderRadius: 16.5,
        padding: '14px 16px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Diagonal scan line — slow, low opacity, evokes a scanner sweep */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.07), transparent)',
          animation: 'focusScan 5s ease-in-out infinite',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          position: 'relative', zIndex: 2,
        }}>
          {/* Pulsing status dot */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#a78bfa',
            boxShadow: '0 0 8px rgba(167,139,250,0.85), 0 0 16px rgba(167,139,250,0.35)',
            animation: 'focusDotPulse 2.4s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 15, fontWeight: 800,
            // Static premium gradient — no animation, no flicker. The
            // panel's outer conic-gradient ring already provides all
            // the motion this row needs.
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 60%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.015em',
            lineHeight: 1.2,
          }}>My Focus Subjects</span>
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
                animation: 'focusSavedFlash 1.6s ease-out both',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => editing ? cancel() : setEditing(true)}
            aria-label={editing ? 'Close focus picker' : 'Change focus subjects'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: editing
                ? 'rgba(244,114,182,0.12)'
                : 'rgba(99,102,241,0.14)',
              border: editing
                ? '1px solid rgba(244,114,182,0.40)'
                : '1px solid rgba(99,102,241,0.40)',
              color: editing ? '#f9a8d4' : '#c4b5fd',
              fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
              padding: '8px 16px', borderRadius: 999,
              cursor: 'pointer', textTransform: 'uppercase',
              transition: 'all 200ms ease-out',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: editing
                ? '0 2px 12px rgba(244,114,182,0.20)'
                : '0 2px 14px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {editing ? (
              <>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4M12 2v3.5h-3.5M4 14v-3.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Change
              </>
            )}
          </button>
        </div>

        {/* Body */}
        {!editing ? (
          <div style={{
            marginTop: 11,
            position: 'relative', zIndex: 2,
          }}>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.55)',
              marginBottom: 9, lineHeight: 1.55,
            }}>
              {focusedSubjects.length > 0
                ? (focusedSubjects.length > 1
                    ? 'Your daily tip and Your Next Step follow the chip on the left — your most recent pick.'
                    : 'Your daily tip and Your Next Step will focus on this subject.')
                : 'No focus subjects picked yet. Tap Change to pick what you want to study most.'}
            </div>
            {focusedSubjects.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {focusedSubjects.map((s, i) => {
                  const rgb = hexToRgbCsv(s.color)
                  return (
                    <span key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px',
                      borderRadius: 999,
                      background: `rgba(${rgb},0.12)`,
                      border: `1px solid rgba(${rgb},0.30)`,
                      color: `rgba(${rgb},0.95)`,
                      fontSize: 11, fontWeight: 650,
                      whiteSpace: 'nowrap',
                      boxShadow: `0 0 10px rgba(${rgb},0.10)`,
                      // Brief glow burst when the user just committed a change
                      ...(chipBurst ? {
                        animation: `focusChipBurst 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms both`,
                      } : {}),
                    }}>
                      <span style={{ fontSize: 12 }}>{s.icon}</span>
                      {s.shortTitle}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            marginTop: 12,
            position: 'relative', zIndex: 2,
            animation: 'focusExpand 350ms cubic-bezier(0.22,1,0.36,1) both',
          }}>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.55)',
              marginBottom: 11, lineHeight: 1.55,
            }}>
              Pick the subjects you want to study most. Tap any subject to add or remove. Your home screen will refresh after you save.
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14,
            }}>
              {subjects.map((s, i) => {
                const isOn = draftWeak.includes(s.id)
                const rgb = hexToRgbCsv(s.color)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    aria-pressed={isOn}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 11px',
                      borderRadius: 999,
                      background: isOn
                        ? `rgba(${rgb},0.18)`
                        : 'rgba(255,255,255,0.025)',
                      border: isOn
                        ? `1.5px solid rgba(${rgb},0.55)`
                        : '1.5px solid rgba(255,255,255,0.07)',
                      color: isOn
                        ? `rgba(${rgb},0.98)`
                        : 'rgba(255,255,255,0.55)',
                      fontSize: 11, fontWeight: isOn ? 750 : 550,
                      cursor: 'pointer',
                      transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                      WebkitTapHighlightColor: 'transparent',
                      boxShadow: isOn
                        ? `0 0 14px rgba(${rgb},0.20), inset 0 1px 0 rgba(255,255,255,0.05)`
                        : 'none',
                      animation: `focusChipIn 260ms cubic-bezier(0.16,1,0.3,1) ${i * 18}ms both`,
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

            <button
              onClick={apply}
              disabled={!hasChanges}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 14,
                background: hasChanges
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.95) 0%, rgba(168,85,247,0.95) 50%, rgba(56,189,248,0.95) 100%)'
                  : 'rgba(255,255,255,0.04)',
                backgroundSize: hasChanges ? '200% 100%' : undefined,
                border: hasChanges
                  ? '1px solid rgba(167,139,250,0.45)'
                  : '1px solid rgba(255,255,255,0.06)',
                color: hasChanges ? '#fff' : 'rgba(255,255,255,0.30)',
                fontSize: 12, fontWeight: 800,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                cursor: hasChanges ? 'pointer' : 'default',
                boxShadow: hasChanges
                  ? '0 6px 24px rgba(99,102,241,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset'
                  : 'none',
                transition: 'all 250ms ease-out',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                animation: hasChanges ? 'homeShimmer 4s linear infinite' : undefined,
              }}
            >
              {hasChanges ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M9 1L2 9h5l-1 6 7-8H8l1-6z" fill="currentColor" />
                  </svg>
                  Save & Update My Plan
                </>
              ) : (
                'Pick at least one change'
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

// Knowledge-level mini ring used inside cards on the HomeTab. Renders the
// user's current level on a topic as a small progress arc + numeric label.
// Internal name kept as `CrownMiniRing` so the rest of the file's call
// sites don't need a sweep — only the rendered label changed when we
// dropped the crown metaphor.
function CrownMiniRing({ level, maxLevel = 5 }: { level: number; maxLevel?: number }) {
  const pct = Math.min(100, (level / maxLevel) * 100)
  const r = 9
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * pct) / 100
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <circle
          cx="11" cy="11" r={r} fill="none" stroke="#a78bfa" strokeWidth="2"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Level {level}/{maxLevel}</span>
    </div>
  )
}

// ── Mentor's Suggestion — Apple-Intelligence-style AI brief card ──────────

function MentorsSuggestion({ tip, streak, firstName }: { tip: string | null | undefined; streak: number; firstName: string | null }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!tip) { setDisplayed(''); setDone(false); return }
    setDisplayed('')
    setDone(false)
    // Reveal multiple chars per tick so longer mentor messages don't take
    // 7+ seconds to render. ~6 chars / 22ms = ~270 chars/sec, so a 350-char
    // message lands in ~1.3s while still feeling like AI typing.
    let i = 0
    const STEP = 6
    const id = setInterval(() => {
      i = Math.min(i + STEP, tip.length)
      setDisplayed(tip.slice(0, i))
      if (i >= tip.length) { clearInterval(id); setDone(true) }
    }, 22)
    return () => clearInterval(id)
  }, [tip])

  const dateLabel = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  }, [])

  const isLoading = !tip

  return (
    <div style={{
      marginTop: 12,
      position: 'relative',
      borderRadius: 18,
      padding: 1.5,
      background: 'conic-gradient(from var(--edge-angle, 0deg), #6366f1, #ec4899, #06b6d4, #a78bfa, #6366f1)',
      animation: `edgeRotate 8s linear infinite${isLoading ? ', edgePulse 1.6s ease-in-out infinite' : ''}`,
      isolation: 'isolate',
    }}>
      {/* Subtle outer glow */}
      <div style={{
        position: 'absolute', inset: -8, borderRadius: 24,
        background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18), transparent 70%)',
        filter: 'blur(14px)', pointerEvents: 'none', zIndex: -1,
        opacity: isLoading ? 0.9 : 0.5,
        transition: 'opacity 600ms ease',
      }} />

      <div style={{
        background: 'linear-gradient(180deg, rgba(10,10,16,0.97) 0%, rgba(6,6,12,0.99) 100%)',
        borderRadius: 16.5,
        padding: '14px 16px 12px',
        // No minHeight — card hugs whatever the mentor writes today, so
        // there's never trailing empty space below the signature.
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* HEADER — sparkle + label + date */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11,
          flexWrap: 'wrap', rowGap: 4,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="edgeSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M12 2L13.5 9L21 10.5L13.5 12L12 19L10.5 12L3 10.5L10.5 9L12 2Z" fill="url(#edgeSparkleGrad)" />
            <path d="M19 3L19.6 5.4L22 6L19.6 6.6L19 9L18.4 6.6L16 6L18.4 5.4L19 3Z" fill="url(#edgeSparkleGrad)" opacity="0.7" />
          </svg>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.10em',
            color: 'rgba(255,255,255,0.62)', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            Mentor&apos;s Suggestion{firstName ? ` for ${firstName}` : ''}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', margin: '0 1px' }}>·</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            color: 'rgba(255,255,255,0.34)',
            whiteSpace: 'nowrap',
          }}>
            {dateLabel}
          </span>
        </div>

        {/* BODY — serif AI prose OR shimmer skeleton.
            Reserves the FULL final-text layout from the moment the tip
            arrives so the card never grows during typing AND there's no
            trailing empty space after typing finishes. The unrevealed
            characters are rendered with opacity:0 (still in layout flow). */}
        {tip ? (
          <div style={{
            fontSize: 15.5, fontWeight: 400, color: 'rgba(255,255,255,0.94)',
            lineHeight: 1.55, letterSpacing: '-0.012em',
            fontFamily: '"Iowan Old Style", "Charter", "Georgia", ui-serif, serif',
            animation: 'homeGlowIn 400ms ease-out both',
          }}>
            <span>{displayed}</span>
            {!done && (
              <span style={{
                display: 'inline-block', width: 2, height: 17,
                marginLeft: 3, verticalAlign: 'text-bottom',
                background: 'linear-gradient(180deg, #a78bfa, #ec4899)',
                borderRadius: 1,
                animation: 'homePulse 0.7s step-end infinite',
              }} />
            )}
            {/* Invisible tail of the tip — preserves layout space so the
                card is sized to the full text from the first frame. */}
            {!done && (
              <span aria-hidden style={{ opacity: 0 }}>
                {tip.slice(displayed.length)}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 3, paddingBottom: 4 }}>
            {[94, 76].map((w, i) => (
              <div key={i} style={{
                height: 12, borderRadius: 6, width: `${w}%`,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(167,139,250,0.18) 50%, rgba(255,255,255,0.04) 100%)',
                backgroundSize: '200% 100%',
                animation: `homeShimmer 1.4s ease-in-out ${i * 0.18}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* SIGNATURE — Day count footer */}
        {tip && streak > 0 && (
          <div style={{
            marginTop: 11, textAlign: 'right',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
            color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase',
            opacity: done ? 1 : 0,
            transition: 'opacity 500ms ease 200ms',
          }}>
            &mdash; Day {streak}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HomeTab({
  progress,
  subjects,
  topicStates,
  onTopicTap,
  onNavigateToPath,
  profile,
  dailyTip,
  continueTarget,
  onChangeGoal,
  onProfileUpdate,
}: HomeTabProps) {

  const today = getToday()

  // ── Continue topic ─────────────────────────────────────────────────────────
  // Source of truth: the parent computes this in MobileLearningJourney and
  // passes it down. The same computed value is also fed to the daily-tip API
  // as `nextTopic`, so the mentor's recommendation can never disagree with
  // what this card shows. We keep a local fallback (using identical logic
  // to the parent) for safety in case the prop ever isn't supplied.
  const continueTopic: TopicStateEntry | null = useMemo(() => {
    if (continueTarget !== undefined) return continueTarget
    let best: TopicStateEntry | null = null
    let bestDate = ''
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'started') {
        const tp = progress.topics[entry.topic.id]
        const lastPrac = tp?.lastPracticed || ''
        if (!best || lastPrac > bestDate) {
          best = entry
          bestDate = lastPrac
        }
      }
    }
    if (best) return best
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'available') return entry
    }
    return null
  }, [continueTarget, topicStates, progress.topics])

  // ── Up next topics ─────────────────────────────────────────────────────────
  // Strict priority: if the user picked weak subjects at onboarding, the
  // "Up Next" list pulls EXCLUSIVELY from those subjects until every topic
  // in every weak subject is completed. Only then does it fall back to the
  // overall syllabus order. The previous version walked the entire syllabus
  // first and then "sorted" by weak-subject membership, which meant the
  // first 3 hits (always Ancient History) filled the slots before the sort
  // could matter.
  const upNext = useMemo(() => {
    if (!subjects?.length) return []
    const continueId = continueTopic?.topic.id
    const weakIds = profile?.weakSubjects || []
    const weakIdSet = new Set(weakIds)

    // Helper: walk a list of subjects in order and collect up to `limit`
    // available topics (skipping the continueTopic that's already in the
    // hero CTA above this section).
    const collectFrom = (subjectList: LearningSubject[], limit: number): TopicStateEntry[] => {
      const out: TopicStateEntry[] = []
      for (const subject of subjectList) {
        for (const unit of subject.units) {
          for (const topic of unit.topics) {
            if (out.length >= limit) break
            if (topic.id === continueId) continue
            const entry = topicStates[topic.id]
            if (entry && entry.state === 'available') out.push(entry)
          }
          if (out.length >= limit) break
        }
        if (out.length >= limit) break
      }
      return out
    }

    // Step 1: Are any of the user's weak subjects still incomplete? A weak
    // subject is "still incomplete" if it has at least one topic that is NOT
    // in the 'completed' state. If yes, we restrict upNext to those subjects.
    const incompleteWeakSubjects: LearningSubject[] = subjects.filter(sub => {
      if (!weakIdSet.has(sub.id)) return false
      for (const u of sub.units) {
        for (const t of u.topics) {
          const entry = topicStates[t.id]
          if (!entry || entry.state !== 'completed') return true
        }
      }
      return false
    })

    if (incompleteWeakSubjects.length > 0) {
      // Strict mode: only weak subjects until they're all complete.
      // Order weak subjects by the order the user picked them in profile,
      // not by syllabus order, so their first pick gets priority.
      const ordered = [...incompleteWeakSubjects].sort((a, b) => {
        const ai = weakIds.indexOf(a.id)
        const bi = weakIds.indexOf(b.id)
        return ai - bi
      })
      return collectFrom(ordered, 3)
    }

    // Step 2: Either no weak subjects picked, or every weak subject is
    // fully completed — fall back to overall syllabus order.
    return collectFrom(subjects, 3)
  }, [subjects, topicStates, continueTopic, profile])

  // ── Today stats ──────────────────────────────────────────────────────────────
  const goalCfg = DAILY_GOALS[progress.dailyGoalTier || 'regular']
  const todayRead = progress.todayTopicsRead || 0
  const todayPracticed = progress.todayTopicsPracticed || 0
  const readMet = todayRead >= goalCfg.readTarget
  const practiceMet = todayPracticed >= goalCfg.practiceTarget
  const goalMet = readMet && practiceMet

  // accuracy is computed per-subject inside weakAreaNudge

  // ── Syllabus completion stats ──────────────────────────────────────────────
  const { completedTopics, totalTopics } = useMemo(() => {
    const states = Object.values(topicStates)
    return {
      completedTopics: states.filter(s => s.state === 'completed').length,
      totalTopics: states.length,
    }
  }, [topicStates])

  // crowns3Plus shown in Profile tab

  // ── Study pace calculations ─────────────────────────────────────────────────
  const daysUntilExam = useMemo(() => {
    if (!profile?.examYear) return null
    const prelimsDate = new Date(profile.examYear, 4, 25)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.ceil((prelimsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : null
  }, [profile?.examYear])

  const paceStatus = useMemo(() => {
    if (!profile || !daysUntilExam || daysUntilExam <= 0 || totalTopics === 0) return null
    const remaining = totalTopics - completedTopics
    const topicsPerWeek = remaining > 0 ? Math.ceil((remaining / daysUntilExam) * 7 * 10) / 10 : 0
    const prelimsDate = new Date(profile.examYear!, 4, 25)
    const startOfPrep = new Date(prelimsDate)
    startOfPrep.setFullYear(startOfPrep.getFullYear() - 1)
    const totalDays = Math.ceil((prelimsDate.getTime() - startOfPrep.getTime()) / (1000 * 60 * 60 * 24))
    const timeElapsed = Math.max(0, Math.min(100, Math.round(((totalDays - daysUntilExam) / totalDays) * 100)))
    const syllabusPercent = Math.round((completedTopics / totalTopics) * 100)
    const paceRatio = syllabusPercent > 0 && timeElapsed > 0 ? syllabusPercent / timeElapsed : 0
    let status: 'ahead' | 'on_track' | 'behind' = 'on_track'
    if (paceRatio >= 1.2) status = 'ahead'
    else if (paceRatio < 0.6) status = 'behind'
    return { topicsPerWeek, syllabusPercent, timeElapsed, paceRatio, status, remaining }
  }, [profile, daysUntilExam, totalTopics, completedTopics])

  // ── Motivational insight ──────────────────────────────────────────────────
  const motivationalInsight = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = toLocalDateString(sevenDaysAgo)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const prevCutoff = toLocalDateString(fourteenDaysAgo)
    const thisWeek = progress.studyCalendar.filter(d => d.date >= cutoff && d.date <= today)
    const prevWeek = progress.studyCalendar.filter(d => d.date >= prevCutoff && d.date < cutoff)
    const thisWeekQ = thisWeek.reduce((s, d) => s + d.questionsAnswered, 0)
    const prevWeekQ = prevWeek.reduce((s, d) => s + d.questionsAnswered, 0)

    if (totalTopics > 0 && completedTopics / totalTopics > 0.5) {
      return { emoji: '\uD83C\uDFAF', text: `Over halfway! ${completedTopics} of ${totalTopics} topics done. The finish line is in sight.` }
    }
    if (progress.streak >= 7) {
      return { emoji: '\uD83D\uDD25', text: `${progress.streak}-day streak puts you in the top 15% of consistent learners.` }
    }
    if (paceStatus?.status === 'ahead') {
      const weeksAhead = paceStatus.remaining > 0 && paceStatus.topicsPerWeek > 0
        ? Math.round(((paceStatus.syllabusPercent - paceStatus.timeElapsed) / 100) * (daysUntilExam || 365) / 7) : 0
      return { emoji: '\uD83D\uDE80', text: `${Math.max(1, weeksAhead)} week${weeksAhead !== 1 ? 's' : ''} ahead of schedule. Keep this energy!` }
    }
    if (paceStatus?.status === 'behind') {
      const topicsBehind = Math.max(1, Math.round((paceStatus.timeElapsed / 100 * totalTopics) - completedTopics))
      return { emoji: '\u23F0', text: `${topicsBehind} topics behind pace. A focused weekend can fix this!` }
    }
    if (thisWeekQ > prevWeekQ && prevWeekQ > 0) {
      const pctImprove = Math.round(((thisWeekQ - prevWeekQ) / prevWeekQ) * 100)
      return { emoji: '\uD83D\uDCC8', text: `Activity improved ${pctImprove}% this week. You're getting sharper!` }
    }
    if (progress.streak > 0) {
      return { emoji: '\uD83D\uDCAA', text: `${progress.streak}-day streak and counting. Every topic brings you closer.` }
    }
    return { emoji: '\u2728', text: 'Start studying today to build momentum. Consistency beats intensity!' }
  }, [progress, paceStatus, totalTopics, completedTopics, daysUntilExam, today])

  // Achievements shown in Profile tab, not here

  // ── Started / All completed ────────────────────────────────────────────────
  const hasStarted = useMemo(() => {
    return Object.values(topicStates).some(s => s.state === 'started' || s.state === 'completed')
  }, [topicStates])

  const allCompleted = useMemo(() => {
    const states = Object.values(topicStates)
    return states.length > 0 && states.every(s => s.state === 'completed')
  }, [topicStates])

  // ── Profile-derived personalization ────────────────────────────────────────
  const firstName = profile?.name ? profile.name.split(' ')[0] : null
  // prepStage shown in greeting badges only when needed
  const crownLevel = continueTopic ? (progress.topics[continueTopic.topic.id]?.crownLevel || 0) : 0

  // Subject progress rings moved to Syllabus tab

  // Week activity + quotes removed — keeping landing lean

  // ── Weak area nudge (subject with lowest accuracy, min 5 Qs answered) ────
  const weakAreaNudge = useMemo(() => {
    if (!subjects?.length) return null
    let worst: { subject: LearningSubject; accuracy: number; answered: number } | null = null
    for (const s of subjects) {
      let correct = 0, answered = 0
      for (const unit of s.units) {
        for (const t of unit.topics) {
          const tp = progress.topics[t.id]
          if (tp) { correct += tp.correctAnswers; answered += tp.questionsAnswered }
        }
      }
      if (answered >= 5) {
        const acc = Math.round((correct / answered) * 100)
        if (!worst || acc < worst.accuracy) worst = { subject: s, accuracy: acc, answered }
      }
    }
    return worst && worst.accuracy < 65 ? worst : null
  }, [subjects, progress.topics])

  // ── Animation delay counter ───────────────────────────────────────────────
  let animDelay = 0
  const nextDelay = () => { animDelay += 80; return animDelay }

  // ── Daily goal progress ──────────────────────────────────────────────────
  // smartSubtitle removed — AI mentor tip handles this now

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', padding: '8px 16px 100px 16px' }}>
      <style>{`
        @property --edge-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes homeGlowIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes homeShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes homePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes edgeRotate {
          to { --edge-angle: 360deg; }
        }
        @keyframes edgePulse {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.35) saturate(1.25); }
        }
        /* AI Focus Calibration scan-line sweep */
        @keyframes focusScan {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(280%); opacity: 1; }
          85% { opacity: 0; }
        }
        /* Pulsing status dot in the focus panel header */
        @keyframes focusDotPulse {
          0%, 100% {
            opacity: 0.8;
            box-shadow: 0 0 6px rgba(167,139,250,0.6), 0 0 12px rgba(167,139,250,0.25);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 12px rgba(167,139,250,1), 0 0 22px rgba(167,139,250,0.55);
          }
        }
        /* Expand reveal when entering edit mode */
        @keyframes focusExpand {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Stagger-in for individual subject chips while editing */
        @keyframes focusChipIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        /* ── Inline "Saved" pill — slides in next to the header ── */
        @keyframes focusSavedFlash {
          0%   { opacity: 0; transform: translateY(-4px) scale(0.85); }
          12%  { opacity: 1; transform: translateY(0) scale(1.05); }
          22%  { transform: translateY(0) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-3px) scale(0.92); }
        }
        /* ── Brief glow burst on each focus chip after a save ── */
        @keyframes focusChipBurst {
          0%   { transform: scale(1); filter: brightness(1); }
          25%  { transform: scale(1.06); filter: brightness(1.45) saturate(1.4); }
          50%  { transform: scale(1.02); filter: brightness(1.20) saturate(1.20); }
          100% { transform: scale(1); filter: brightness(1); }
        }
      `}</style>

      {/* ═══ 1. GREETING — 2 lines max ═══ */}
      <div style={{
        marginBottom: 14,
        paddingTop: 4,
        animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </span>
          {progress.streak > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: progress.streak >= 7 ? '#f59e0b' : '#f97316' }}>
              {'\uD83D\uDD25'}{progress.streak}
            </span>
          )}
        </div>
        {/* Mentor's Suggestion — Apple-Intelligence-style AI brief */}
        <MentorsSuggestion tip={dailyTip} streak={progress.streak || 0} firstName={firstName} />
      </div>

      {/* ═══ 2. HERO CTA — one clear next action ═══ */}
      {!hasStarted && !allCompleted ? (
        /* ── Welcome — scannable, no paragraphs ── */
        <div style={{
          ...elevatedGlassCard,
          padding: '20px 18px',
          animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
        }}>
          {/* Stats row — scannable at a glance */}
          <div style={{
            display: 'flex', gap: 0, marginBottom: 16,
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {[
              { n: totalTopics, l: 'Topics' },
              { n: subjects?.length || 16, l: 'Subjects' },
              { n: '3000+', l: 'PYQs' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '10px 0',
                background: 'rgba(255,255,255,0.03)',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{s.n}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginTop: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Flow: Read → Practice → Master */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 16, padding: '0 4px',
          }}>
            {[
              { icon: '\uD83D\uDCD6', label: 'Read' },
              { icon: '\uD83D\uDCDD', label: 'Practice' },
              { icon: '\uD83D\uDC51', label: 'Master' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
                }}>
                  <span style={{ fontSize: 14 }}>{step.icon}</span>
                  {step.label}
                </div>
                {i < 2 && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.2 }}>
                    <path d="M4 2l4 4-4 4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* (Focus chip removed: it showed the user's chosen weak subjects
              as static text above the CTA, which conflicted with the
              specific topic the CTA actually opens. The mentor's suggestion
              and the CTA together carry the same information without the
              confusing pre-context.) */}

          {/* CTA — opens the EXACT topic the mentor recommends. Uses the
              shared continueTopic so the welcome button label and the
              mentor's sentence always reference the same target. Tap goes
              straight to the topic detail (no detour through the syllabus
              list). */}
          <button
            onClick={() => {
              if (continueTopic) {
                onTopicTap(continueTopic.topic.id, continueTopic.topic, continueTopic.subject)
              } else {
                onNavigateToPath(profile?.weakSubjects?.[0] || undefined)
              }
            }}
            style={{
              width: '100%', height: 50, border: 'none', borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '0 16px',
              boxShadow: '0 4px 24px rgba(99,102,241,0.4), 0 1px 3px rgba(0,0,0,0.2)',
              position: 'relative', overflow: 'hidden',
              transition: 'transform 150ms ease', WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
              backgroundSize: '200% 100%', animation: 'homeShimmer 3s linear infinite',
            }} />
            <span style={{
              position: 'relative', zIndex: 1, pointerEvents: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              {continueTopic
                ? `Start with ${continueTopic.topic.title}`
                : 'Start First Topic'}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : continueTopic ? (
        /* ── Continue card — returning user ── */
        <div style={{
          ...elevatedGlassCard,
          padding: 0, overflow: 'hidden',
          animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
        }}>
          {/* Topic info area — tappable */}
          <button
            onClick={() => onTopicTap(continueTopic.topic.id, continueTopic.topic, continueTopic.subject)}
            style={{
              width: '100%', cursor: 'pointer', textAlign: 'left',
              padding: '18px 18px 14px', border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', gap: 14,
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 150ms ease',
            }}
          >
            {/* Topic icon */}
            <div style={{
              width: 50, height: 50, borderRadius: 16, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              background: `${continueTopic.subject.color}15`,
              border: `1.5px solid ${continueTopic.subject.color}25`,
            }}>
              {continueTopic.topic.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
                marginBottom: 3,
              }}>
                YOUR NEXT STEP
              </div>
              <div style={{
                fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.95)',
                lineHeight: 1.25,
              }}>
                {continueTopic.topic.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <span style={{
                  fontSize: 12, color: continueTopic.subject.color, fontWeight: 600,
                }}>
                  {continueTopic.subject.shortTitle}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>&middot;</span>
                <CrownMiniRing level={crownLevel} />
              </div>
            </div>
          </button>

          {/* Big resume button — full width, visually dominant */}
          <div style={{ padding: '0 18px 18px' }}>
            <button
              onClick={() => onTopicTap(continueTopic.topic.id, continueTopic.topic, continueTopic.subject)}
              style={{
                width: '100%', height: 48, border: 'none', borderRadius: 14,
                background: `linear-gradient(135deg, ${continueTopic.subject.color}, ${continueTopic.subject.color}cc)`,
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `0 4px 20px ${continueTopic.subject.color}35, 0 1px 3px rgba(0,0,0,0.2)`,
                position: 'relative', overflow: 'hidden',
                transition: 'transform 150ms ease', WebkitTapHighlightColor: 'transparent',
              }}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
              onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                backgroundSize: '200% 100%', animation: 'homeShimmer 3s linear infinite',
              }} />
              <span style={{ position: 'relative', zIndex: 1 }}>Continue Studying</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      ) : allCompleted ? (
        <div style={{
          ...elevatedGlassCard,
          padding: 24, textAlign: 'center',
          animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{'\uD83C\uDF89'}</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 4 }}>
            Full syllabus covered.
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            Now deepen your mastery — revisit topics to raise knowledge levels and sharpen accuracy.
          </div>
        </div>
      ) : null}

      {/* ═══ 3. TODAY'S MISSION — task checklist with CTA ═══ */}
      <div style={{
        ...glassCard,
        padding: '14px 16px',
        animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
          }}>
            Today&apos;s Mission
          </div>
          {onChangeGoal && (
            <button
              type="button"
              onClick={onChangeGoal}
              aria-label="Change daily goal"
              style={{
                background: 'rgba(99,102,241,0.10)',
                border: '1px solid rgba(99,102,241,0.22)',
                cursor: 'pointer',
                padding: '4px 9px',
                borderRadius: 8,
                fontSize: 10, fontWeight: 700,
                color: '#a5b4fc',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 4,
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 150ms ease',
              }}
              onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)' }}
              onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.10)' }}
              onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.10)' }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Change goal
            </button>
          )}
        </div>

        {/* Task 1: Read */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            background: readMet ? '#34d399' : 'rgba(99,102,241,0.15)',
            color: readMet ? '#fff' : '#a5b4fc',
          }}>
            {readMet ? '\u2713' : '1'}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600, flex: 1,
            color: readMet ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)',
            textDecoration: readMet ? 'line-through' : 'none',
          }}>
            Read {goalCfg.readTarget} topic{goalCfg.readTarget > 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: readMet ? '#34d399' : 'rgba(255,255,255,0.45)',
          }}>
            {todayRead}/{goalCfg.readTarget}
          </span>
        </div>

        {/* Task 2: Practice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            background: practiceMet ? '#34d399' : 'rgba(99,102,241,0.15)',
            color: practiceMet ? '#fff' : '#a5b4fc',
          }}>
            {practiceMet ? '\u2713' : '2'}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600, flex: 1,
            color: practiceMet ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)',
            textDecoration: practiceMet ? 'line-through' : 'none',
          }}>
            Complete {goalCfg.practiceTarget} practice round{goalCfg.practiceTarget > 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: practiceMet ? '#34d399' : 'rgba(255,255,255,0.45)',
          }}>
            {todayPracticed}/{goalCfg.practiceTarget}
          </span>
        </div>

        {/* Status — no CTA, the Continue card above IS the action */}
        {goalMet && (
          <div style={{
            marginTop: 10, fontSize: 11, fontWeight: 700, color: '#34d399',
            textAlign: 'center',
          }}>
            {'\u2713'} All done for today
          </div>
        )}
      </div>

      {/* ═══ 4. WEAK AREA — one-tap fix ═══ */}
      {weakAreaNudge && (
        <button
          onClick={() => onNavigateToPath(weakAreaNudge.subject.id)}
          style={{
            ...glassCard,
            width: '100%', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1px solid rgba(245,158,11,0.12)',
            background: 'rgba(245,158,11,0.04)',
            animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
            transition: 'transform 150ms ease', WebkitTapHighlightColor: 'transparent',
          }}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
          onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>{weakAreaNudge.subject.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              {weakAreaNudge.subject.shortTitle}
            </span>
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
              {' '}{weakAreaNudge.accuracy}% accuracy
            </span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#f59e0b',
            padding: '3px 10px', borderRadius: 8,
            background: 'rgba(245,158,11,0.1)',
          }}>
            Practice
          </span>
        </button>
      )}

      {/* ═══ 5. UP NEXT ═══ */}
      {upNext.length > 0 && (
        <div style={{ animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>
            Up Next
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upNext.map((entry: TopicStateEntry) => (
              <button
                key={entry.topic.id}
                onClick={() => onTopicTap(entry.topic.id, entry.topic, entry.subject)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  ...GLASS_STYLE, borderRadius: 14, padding: '10px 12px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'transform 150ms ease', WebkitTapHighlightColor: 'transparent',
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{entry.topic.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {entry.topic.title}
                  </div>
                  <div style={{ fontSize: 10, color: entry.subject.color, marginTop: 1, fontWeight: 500 }}>
                    {entry.subject.shortTitle}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.25 }}>
                  <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
          <button
            onClick={() => onNavigateToPath()}
            style={{
              marginTop: 8, background: 'none', border: 'none',
              color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            View all topics
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* ═══ 5b. AI FOCUS CALIBRATION — sits right above the insight line ═══ */}
      <div style={{
        animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
      }}>
        <FocusAreaPanel
          profile={profile}
          subjects={subjects}
          onProfileUpdate={onProfileUpdate}
        />
      </div>

      {/* ═══ 6. FOOTER — trust line ═══ */}
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5,
        padding: '14px 2px 4px',
        textAlign: 'center',
        animation: `homeGlowIn 500ms ease-out ${nextDelay()}ms both`,
        letterSpacing: '0.01em',
      }}>
        Made with ❤️ by Top UPSC Mentors & AI
      </div>
    </div>
  )
}
