'use client'

import type { JourneyStateValue, EnrichedTopicEntry } from '@/components/journey/hooks/useJourneyState'
import type { LearningSubject } from '@/data/syllabus'
import { UPSC_SYLLABUS } from '@/data/syllabus'

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `${r},${g},${b}`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ label, hint }: { label: string; hint?: string }) {
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
      {hint && (
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.28)',
          fontStyle: 'italic',
        }}>
          — {hint}
        </span>
      )}
      <div style={{
        flex: 1,
        height: 1,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.10) 0%, transparent 100%)',
      }} />
    </div>
  )
}

function RecommendationCard({
  entry,
  acc,
  onStart,
}: {
  entry: EnrichedTopicEntry
  acc: number
  onStart: (topicId: string, topic: EnrichedTopicEntry['topic'], subject: EnrichedTopicEntry['subject']) => void
}) {
  const rgb = hexToRgb(entry.subject.color)
  const pct = Math.round(acc * 100)

  return (
    <button
      onClick={() => onStart(entry.topic.id, entry.topic, entry.subject)}
      style={{
        background: `rgba(${rgb},0.08)`,
        border: `1.5px solid rgba(${rgb},0.22)`,
        borderRadius: 14,
        padding: '14px 16px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 200ms, border-color 200ms, transform 120ms',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.16)`
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.40)`
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.08)`
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.22)`
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Topic icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{entry.topic.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: 'rgba(255,255,255,0.90)',
            lineHeight: 1.3,
          }}>
            {entry.topic.title}
          </div>
          <div style={{
            fontSize: 11, color: `rgba(${rgb},0.80)`,
            marginTop: 2, fontWeight: 600,
          }}>
            {entry.subject.shortTitle}
          </div>
        </div>
      </div>

      {/* Accuracy bar */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, marginBottom: 5,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>Accuracy</span>
          <span style={{
            fontWeight: 700,
            color: pct < 50 ? '#f87171' : pct < 75 ? '#fb923c' : '#4ade80',
          }}>
            {pct}%
          </span>
        </div>
        <div style={{
          height: 4, borderRadius: 4,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 4,
            background: pct < 50
              ? 'linear-gradient(90deg, #ef4444, #f87171)'
              : pct < 75
              ? 'linear-gradient(90deg, #f97316, #fb923c)'
              : 'linear-gradient(90deg, #22c55e, #4ade80)',
            transition: 'width 600ms ease',
          }} />
        </div>
      </div>

      {/* CTA */}
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: `rgba(${rgb},0.90)`,
        letterSpacing: '0.02em',
      }}>
        Practice now →
      </div>
    </button>
  )
}

function SubjectBrowseCard({ subject, onSelect }: { subject: LearningSubject; onSelect: (id: string) => void }) {
  const rgb = hexToRgb(subject.color)
  const topicCount = subject.units.reduce((acc, u) => acc + u.topics.length, 0)

  return (
    <button
      onClick={() => onSelect(subject.id)}
      style={{
        background: `rgba(${rgb},0.06)`,
        border: `1px solid rgba(${rgb},0.18)`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 200ms',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.14)`
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.35)`
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.06)`
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.18)`
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{subject.icon}</span>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 1.3,
      }}>
        {subject.shortTitle}
      </div>
      <div style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.38)',
      }}>
        {topicCount} topic{topicCount !== 1 ? 's' : ''}
      </div>
    </button>
  )
}

// ── DesktopPracticePane ────────────────────────────────────────────────────────

interface Props {
  state: JourneyStateValue
}

export function DesktopPracticePane({ state }: Props) {
  const { enrichedTopicStates, progress, handleStartPractice, setActiveTab, setActiveSubjectId } = state

  // Smart recommendation: pick up to 6 started/completed topics with the
  // LOWEST accuracy. Only recommend topics where the user has answered at
  // least one question so we have a real accuracy signal.
  const recs = Object.values(enrichedTopicStates)
    .filter(e => e.state === 'started' || e.state === 'completed')
    .map(e => {
      const tp = progress.topics[e.topic.id]
      const acc =
        tp && tp.questionsAnswered > 0
          ? tp.correctAnswers / tp.questionsAnswered
          : 1
      return { entry: e, acc, answered: tp?.questionsAnswered ?? 0 }
    })
    .filter(r => r.answered > 0)
    .sort((a, b) => a.acc - b.acc) // worst accuracy first
    .slice(0, 6)

  return (
    <div style={{ animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{
          fontSize: 26, fontWeight: 900,
          background: 'linear-gradient(135deg, #ffffff 0%, #fb923c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>
          Practice arena
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          3,000+ Previous Year Questions across the full UPSC syllabus. The AI picks the topics where you&apos;ll get the biggest score lift.
        </p>
      </div>

      {/* Recommended topics — up to 3 columns */}
      {recs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader label="Recommended for you" hint="Lowest accuracy first" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {recs.map(({ entry, acc }) => (
              <RecommendationCard
                key={entry.topic.id}
                entry={entry}
                acc={acc}
                onStart={handleStartPractice}
              />
            ))}
          </div>
        </div>
      )}

      {/* Browse by subject */}
      <div>
        <SectionHeader label="Browse by subject" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
        }}>
          {UPSC_SYLLABUS.map(s => (
            <SubjectBrowseCard
              key={s.id}
              subject={s}
              onSelect={(id) => {
                setActiveTab('path')
                setActiveSubjectId(id)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
