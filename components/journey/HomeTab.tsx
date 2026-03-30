'use client'

import { useMemo } from 'react'
import type { JourneyProgress, NodeState } from './types'
import { DAILY_GOALS } from './types'
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
  onNavigateToPath: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Crown Mini Ring ────────────────────────────────────────────────────────────

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
          cx="11" cy="11" r={r}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
        Crown {level}/{maxLevel}
      </span>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HomeTab({
  progress,
  topicStates,
  onTopicTap,
  onNavigateToPath,
}: HomeTabProps) {

  // ── Compute continue topic ─────────────────────────────────────────────────
  const continueTopic = useMemo(() => {
    // Find most recently practiced 'started' topic
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

    // Fallback: first available topic
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'available') return entry
    }

    return null
  }, [topicStates, progress.topics])

  // ── Up next topics ─────────────────────────────────────────────────────────
  const upNext = useMemo(() => {
    const available: TopicStateEntry[] = []
    for (const entry of Object.values(topicStates)) {
      if (entry.state === 'available' && entry.topic.id !== continueTopic?.topic.id) {
        available.push(entry)
      }
    }
    return available.slice(0, 3)
  }, [topicStates, continueTopic])

  // ── Today stats ────────────────────────────────────────────────────────────
  const todayXp = progress.todayXp || 0
  const goalXp = DAILY_GOALS[progress.dailyGoalTier || 'regular'].xpTarget

  const { accuracy, totalQuestions } = useMemo(() => {
    let totalQ = 0
    let totalC = 0
    for (const tp of Object.values(progress.topics)) {
      totalQ += tp.questionsAnswered
      totalC += tp.correctAnswers
    }
    return {
      accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
      totalQuestions: totalQ,
    }
  }, [progress.topics])

  // ── Streak milestone progress ──────────────────────────────────────────────
  const streakMilestones = [3, 7, 14, 30, 50, 100]
  const nextMilestone = streakMilestones.find(m => m > progress.streak) || streakMilestones[streakMilestones.length - 1]
  const prevMilestone = streakMilestones.filter(m => m <= progress.streak).pop() || 0
  const milestoneProgress = nextMilestone > prevMilestone
    ? ((progress.streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100

  // ── Crown level for continue topic ────────────────────────────────────────
  const continueTopicProgress = continueTopic
    ? progress.topics[continueTopic.topic.id]
    : null
  const crownLevel = continueTopicProgress?.crownLevel || 0

  // Whether any topic has been started or completed (i.e. not a brand-new user)
  const hasStarted = useMemo(() => {
    return Object.values(topicStates).some(
      (s) => s.state === 'started' || s.state === 'completed'
    )
  }, [topicStates])

  // All-complete only when there are completed topics AND nothing else is pending
  const allCompleted = useMemo(() => {
    const states = Object.values(topicStates)
    const completed = states.filter((s) => s.state === 'completed').length
    return completed > 0 && states.every((s) => s.state === 'completed' || s.state === 'locked')
  }, [topicStates])

  return (
    <div style={{ minHeight: '100vh', padding: '16px 16px 100px 16px' }}>
      <style>{`
        @keyframes homeStreakPulse {
          0%, 100% { text-shadow: 0 0 8px rgba(249,115,22,0.4), 0 0 20px rgba(249,115,22,0.15); }
          50% { text-shadow: 0 0 14px rgba(249,115,22,0.6), 0 0 28px rgba(249,115,22,0.25); }
        }
        @keyframes homeGlowIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Greeting */}
      <div
        style={{
          animation: 'homeGlowIn 600ms ease-out',
          marginBottom: 20,
          paddingTop: 8,
        }}
      >
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {getGreeting()} <span role="img" aria-label="wave">👋</span>
        </h1>
      </div>

      {/* Streak Card */}
      {progress.streak > 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '16px 20px',
            marginBottom: 16,
            animation: 'homeGlowIn 600ms ease-out 100ms both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                fontSize: 24,
                lineHeight: 1,
                animation: 'homeStreakPulse 2s ease-in-out infinite',
              }}
            >
              🔥
            </span>
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#f97316',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {progress.streak}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginLeft: 2 }}>
              day streak
            </span>
          </div>

          {/* Mini progress bar to next milestone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 3,
                background: 'linear-gradient(90deg, #f97316, #fbbf24)',
                width: `${Math.min(100, milestoneProgress)}%`,
                transition: 'width 500ms ease-out',
              }} />
            </div>
            <span style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.40)',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}>
              {progress.streak}/{nextMilestone} goal
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 20,
            padding: '14px 20px',
            marginBottom: 16,
            animation: 'homeGlowIn 600ms ease-out 100ms both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, lineHeight: 1, opacity: 0.5 }}>🔥</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
              Start a streak!
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)', marginTop: 6, paddingLeft: 28 }}>
            Study today to begin your streak journey
          </div>
        </div>
      )}

      {/* Welcome / Continue / Hero Card */}
      {!hasStarted && !allCompleted ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            animation: 'homeGlowIn 600ms ease-out 200ms both',
          }}
        >
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            marginBottom: 8,
          }}>
            Welcome, Aspirant! <span role="img" aria-label="wave">👋</span>
          </div>
          <div style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            280 topics across the UPSC syllabus await you.
          </div>
          <button
            onClick={onNavigateToPath}
            style={{
              width: '100%',
              height: 44,
              border: 'none',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'transform 150ms ease, opacity 150ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            Begin Your Journey
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : continueTopic ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            animation: 'homeGlowIn 600ms ease-out 200ms both',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Accent edge */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            borderRadius: '20px 0 0 20px',
            background: continueTopic.subject.color,
          }} />

          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'rgba(255,255,255,0.40)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Continue
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{continueTopic.topic.icon}</span>
            <span style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
            }}>
              {continueTopic.topic.title}
            </span>
          </div>

          <div style={{
            fontSize: 13,
            color: continueTopic.subject.color,
            marginBottom: 14,
            fontWeight: 500,
          }}>
            {continueTopic.subject.title}
          </div>

          <div style={{ marginBottom: 16 }}>
            <CrownMiniRing level={crownLevel} />
          </div>

          <button
            onClick={() => onTopicTap(continueTopic.topic.id, continueTopic.topic, continueTopic.subject)}
            style={{
              width: '100%',
              height: 44,
              border: 'none',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'transform 150ms ease, opacity 150ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
            onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            Resume
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : allCompleted ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            textAlign: 'center',
            animation: 'homeGlowIn 600ms ease-out 200ms both',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginBottom: 6 }}>
            You&apos;re all caught up!
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            All topics are completed. Great work!
          </div>
        </div>
      ) : null}

      {/* Today Stats */}
      <div style={{
        marginBottom: 24,
        animation: 'homeGlowIn 600ms ease-out 300ms both',
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 12,
        }}>
          Today
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* XP */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {todayXp}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              XP
            </div>
          </div>

          {/* Accuracy */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {totalQuestions > 0 ? `${accuracy}%` : '\u2014'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              Acc
            </div>
          </div>

          {/* Goal */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: todayXp >= goalXp ? '#34d399' : 'rgba(255,255,255,0.92)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}>
              {todayXp}/{goalXp}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 2, fontWeight: 500 }}>
              Goal
            </div>
          </div>
        </div>
        {todayXp === 0 && totalQuestions === 0 && (
          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.28)',
            textAlign: 'center',
            marginTop: 8,
          }}>
            Complete a topic to start tracking
          </div>
        )}
      </div>

      {/* Up Next */}
      {upNext.length > 0 && (
        <div style={{ animation: 'homeGlowIn 600ms ease-out 400ms both' }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 12,
          }}>
            Up Next
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upNext.map((entry: TopicStateEntry) => (
              <button
                key={entry.topic.id}
                onClick={() => onTopicTap(entry.topic.id, entry.topic, entry.subject)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 150ms ease, opacity 150ms ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)' }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                onPointerCancel={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
                  {entry.topic.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.92)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.topic.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: entry.subject.color,
                    marginTop: 2,
                    fontWeight: 500,
                  }}>
                    {entry.subject.title}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                  <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>

          <button
            onClick={onNavigateToPath}
            style={{
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: '#818cf8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View all topics
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
