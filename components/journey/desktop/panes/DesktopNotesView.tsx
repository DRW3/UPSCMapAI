'use client'

import dynamic from 'next/dynamic'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { DEFAULT_TOPIC_PROGRESS } from '@/components/journey/types'

const TopicDetailSheet = dynamic(
  () => import('@/components/journey/TopicDetailSheet'),
  { ssr: false }
)

interface Props { state: JourneyStateValue }

export function DesktopNotesView({ state }: Props) {
  const { detailTarget } = state
  if (!detailTarget) return null
  const { topic, subject } = detailTarget

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      animation: 'dj-fadeUp 300ms cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* Back bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 16, flexShrink: 0,
      }}>
        <button
          onClick={() => state.setDetailTarget(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.70)',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18, fontWeight: 800,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {topic.title}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: subject.color, marginTop: 2 }}>
            {subject.shortTitle}
          </div>
        </div>
        <button
          onClick={() => state.handleDetailStartPractice()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff',
            fontSize: 13, fontWeight: 800,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          🎯 Practice this topic
        </button>
      </div>

      {/* Notes — full width, inline (no overlay) */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
      }}>
        <TopicDetailSheet
          topic={topic}
          subject={subject}
          progress={state.progress.topics[topic.id] ?? DEFAULT_TOPIC_PROGRESS}
          dbQuestionCount={state.pyqCounts[topic.id] ?? 0}
          onClose={() => state.setDetailTarget(null)}
          onStartPractice={state.handleDetailStartPractice}
          onOpenMap={state.handleOpenMap}
          profile={state.profile}
          variant="inline"
        />
      </div>
    </div>
  )
}
