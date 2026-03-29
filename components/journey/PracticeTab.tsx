'use client'

import { useMemo } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import {
  type TopicProgress,
  type JourneyProgress,
  DEFAULT_TOPIC_PROGRESS,
  CROWN_COLORS,
} from '@/components/journey/types'

// ── Props ───────────────────────────────────────────────────────────────────────

interface PracticeTabProps {
  progress: JourneyProgress
  topicStates: Record<string, TopicProgress>
  onStartPractice: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onSwitchToLearn: () => void
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

interface TopicWithMeta {
  topic: LearningTopic
  subject: LearningSubject
  progress: TopicProgress
  accuracy: number
  daysSincePractice: number
}

function getTopicMeta(subjects: LearningSubject[], topicStates: Record<string, TopicProgress>): TopicWithMeta[] {
  const now = Date.now()
  const result: TopicWithMeta[] = []
  for (const subject of subjects) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const tp = topicStates[topic.id] || DEFAULT_TOPIC_PROGRESS
        if (tp.state === 'started' || tp.state === 'completed') {
          const accuracy = tp.questionsAnswered > 0
            ? (tp.correctAnswers / tp.questionsAnswered) * 100
            : 0
          const daysSince = tp.lastPracticed
            ? Math.floor((now - new Date(tp.lastPracticed).getTime()) / 86400000)
            : 999
          result.push({ topic, subject, progress: tp as TopicProgress, accuracy, daysSincePractice: daysSince })
        }
      }
    }
  }
  return result
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function PracticeTab({ topicStates, onStartPractice, onSwitchToLearn }: PracticeTabProps) {
  const allTopics = useMemo(() => getTopicMeta(UPSC_SYLLABUS, topicStates), [topicStates])

  // Weak topics: accuracy < 60%, sorted by worst
  const weakTopics = useMemo(
    () => allTopics
      .filter(t => t.progress.questionsAnswered >= 3 && t.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5),
    [allTopics]
  )

  // Review topics: completed topics sorted by longest time since practice
  const reviewTopics = useMemo(
    () => allTopics
      .filter(t => t.progress.state === 'completed')
      .sort((a, b) => b.daysSincePractice - a.daysSincePractice)
      .slice(0, 6),
    [allTopics]
  )

  // Random daily challenge candidates: any started or completed topic
  const dailyChallengeTopics = useMemo(
    () => allTopics.length > 0
      ? allTopics.sort(() => Math.random() - 0.5).slice(0, 3)
      : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTopics.length]
  )

  // In-progress topics (started but not completed)
  const inProgressTopics = useMemo(
    () => allTopics.filter(t => t.progress.state === 'started').slice(0, 4),
    [allTopics]
  )

  if (allTopics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <span className="text-5xl">🏋️</span>
        <p className="text-[15px] font-semibold text-white/80">No topics to practice yet</p>
        <p className="text-[12px] text-white/40 max-w-[280px]">
          Start learning topics on the path to unlock practice mode. Complete at least one topic to begin reviewing.
        </p>
        <button
          onClick={onSwitchToLearn}
          className="mt-2 px-5 py-2.5 rounded-2xl text-[13px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Go to Path →
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4" style={{ scrollbarWidth: 'none', paddingTop: 108, paddingBottom: 96 }}>
      {/* Daily Challenge */}
      {dailyChallengeTopics.length > 0 && (
        <Section title="Daily Challenge" icon="⚡" subtitle="Random mix to test your knowledge">
          <div
            className="rounded-2xl p-4 mb-1"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 100%)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px]"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                🎲
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-white/90">Quick Mix</p>
                <p className="text-[11px] text-white/40">{dailyChallengeTopics.length} random topics &middot; 5 questions each</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {dailyChallengeTopics.map(t => (
                <span key={t.topic.id} className="text-[10px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: `${t.subject.color}15`, color: `${t.subject.color}cc` }}>
                  {t.topic.icon} {t.topic.title}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                const t = dailyChallengeTopics[0]
                onStartPractice(t.topic.id, t.topic, t.subject)
              }}
              className="w-full py-3 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }}
            >
              Start Challenge
            </button>
          </div>
        </Section>
      )}

      {/* In Progress */}
      {inProgressTopics.length > 0 && (
        <Section title="Continue Learning" icon="📝" subtitle="Topics you've started">
          <div className="flex flex-col gap-2">
            {inProgressTopics.map(t => (
              <TopicCard key={t.topic.id} item={t} onTap={() => onStartPractice(t.topic.id, t.topic, t.subject)} />
            ))}
          </div>
        </Section>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <Section title="Needs Improvement" icon="🔴" subtitle="Topics with under 60% accuracy">
          <div className="flex flex-col gap-2">
            {weakTopics.map(t => (
              <TopicCard key={t.topic.id} item={t} onTap={() => onStartPractice(t.topic.id, t.topic, t.subject)} showAccuracy />
            ))}
          </div>
        </Section>
      )}

      {/* Review */}
      {reviewTopics.length > 0 && (
        <Section title="Review & Level Up" icon="🔄" subtitle="Revisit completed topics to earn more crowns">
          <div className="flex flex-col gap-2">
            {reviewTopics.map(t => (
              <TopicCard key={t.topic.id} item={t} onTap={() => onStartPractice(t.topic.id, t.topic, t.subject)} showDaysSince />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function Section({ title, icon, subtitle, children }: { title: string; icon: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[16px]">{icon}</span>
        <h3 className="text-[14px] font-bold text-white/85">{title}</h3>
      </div>
      <p className="text-[11px] text-white/30 mb-3 ml-7">{subtitle}</p>
      {children}
    </div>
  )
}

function TopicCard({
  item,
  onTap,
  showAccuracy,
  showDaysSince,
}: {
  item: TopicWithMeta
  onTap: () => void
  showAccuracy?: boolean
  showDaysSince?: boolean
}) {
  const { topic, subject, progress, accuracy, daysSincePractice } = item
  const color = subject.color
  const crown = progress.crownLevel

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0"
        style={{ background: `${color}15`, border: `1.5px solid ${color}25` }}
      >
        {topic.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white/85 truncate">{topic.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-medium" style={{ color }}>{subject.shortTitle}</span>
          {crown > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: CROWN_COLORS[crown] }}>
              👑 {crown}
            </span>
          )}
          {showAccuracy && (
            <span className="text-[10px] font-bold" style={{ color: accuracy < 40 ? '#f87171' : '#fbbf24' }}>
              {Math.round(accuracy)}% acc
            </span>
          )}
          {showDaysSince && daysSincePractice > 0 && (
            <span className="text-[10px] text-white/30">
              {daysSincePractice === 1 ? 'yesterday' : `${daysSincePractice}d ago`}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
        <path d="M5 2l5 5-5 5" />
      </svg>
    </button>
  )
}
