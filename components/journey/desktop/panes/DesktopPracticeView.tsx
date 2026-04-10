'use client'

import dynamic from 'next/dynamic'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { DEFAULT_TOPIC_PROGRESS } from '@/components/journey/types'

const PracticeSheet = dynamic(
  () => import('@/components/journey/PracticeSheet').then(m => ({ default: m.default })),
  { ssr: false }
)

interface Props { state: JourneyStateValue }

export function DesktopPracticeView({ state }: Props) {
  const { practiceTarget } = state
  if (!practiceTarget) return null
  const { topic, subject } = practiceTarget

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
          onClick={() => state.setPracticeTarget(null)}
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
            Practice: {topic.title}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: subject.color, marginTop: 2 }}>
            {subject.shortTitle}
          </div>
        </div>
      </div>

      {/* Practice — full center pane, desktop-native proportions */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.06)',
        maxWidth: 920,
        margin: '0 auto',
        width: '100%',
      }}>
        <PracticeSheet
          topic={topic}
          subject={subject}
          progress={state.progress.topics[topic.id] || DEFAULT_TOPIC_PROGRESS}
          hearts={state.hearts}
          isPro={state.progress.isPro}
          seenQuestionIds={state.progress.topics[topic.id]?.seenQuestionIds || []}
          wrongQuestionIds={state.progress.topics[topic.id]?.wrongQuestionIds || []}
          topicDbCount={state.pyqCounts[topic.id] || 0}
          onResetSeenIds={state.handleResetTopicSeenIds}
          onClose={() => state.setPracticeTarget(null)}
          onComplete={state.handlePracticeComplete}
          onHeartLost={state.handleHeartLost}
          onNextTopic={state.handleNextTopic}
          nextTopicName={state.findNextTopic(topic.id)?.topic.title}
          onUpgradePro={() => {
            const t = practiceTarget
            state.setPendingTopicTarget({
              topic: t.topic,
              subject: t.subject,
              intent: 'practice',
            })
            state.setPaywallReason('hearts')
          }}
          onReviseNotes={() => {
            state.setPracticeTarget(null)
            setTimeout(() => state.setDetailTarget({ topic, subject }), 200)
          }}
        />
      </div>
    </div>
  )
}
