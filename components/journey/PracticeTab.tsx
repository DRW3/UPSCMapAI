'use client'

import { useMemo, useState } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import { type TopicProgress, type JourneyProgress, type NodeState, DEFAULT_TOPIC_PROGRESS } from './types'

interface PracticeTabProps {
  progress: JourneyProgress
  subjects: LearningSubject[]
  topicStates: Record<string, { state: NodeState; topic: LearningTopic; subject: LearningSubject }>
  onTopicSelect: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onStartQuickMix: () => void
  onNavigateToPath: () => void
}

interface TopicWithMeta {
  topic: LearningTopic; subject: LearningSubject; tp: TopicProgress; accuracy: number; daysSince: number
}

function buildTopicList(subjects: LearningSubject[], progress: JourneyProgress): TopicWithMeta[] {
  const now = Date.now(), result: TopicWithMeta[] = []
  for (const subject of subjects) for (const unit of subject.units) for (const topic of unit.topics) {
    const tp = progress.topics[topic.id] || DEFAULT_TOPIC_PROGRESS
    if (tp.state === 'started' || tp.state === 'completed') {
      const accuracy = tp.questionsAnswered > 0 ? (tp.correctAnswers / tp.questionsAnswered) * 100 : 0
      const daysSince = tp.lastPracticed ? Math.floor((now - new Date(tp.lastPracticed).getTime()) / 86400000) : 999
      result.push({ topic, subject, tp, accuracy, daysSince })
    }
  }
  return result
}

function pickNextUp(all: TopicWithMeta[]): TopicWithMeta | null {
  const weak = all.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < 40).sort((a, b) => a.accuracy - b.accuracy)
  if (weak[0]) return weak[0]
  const due = all.filter(t => t.tp.state === 'completed' && t.daysSince >= 3).sort((a, b) => b.daysSince - a.daysSince)
  if (due[0]) return due[0]
  const started = all.filter(t => t.tp.state === 'started')
  return started[0] || all[0] || null
}

function reason(t: TopicWithMeta): string {
  if (t.tp.questionsAnswered >= 3 && t.accuracy < 40) return 'Weakest topic'
  if (t.tp.state === 'completed' && t.daysSince >= 3) return 'Due for review'
  if (t.tp.state === 'started') return 'Continue learning'
  return 'Practice next'
}

const GLASS = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 } as const
const ELEVATED = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: 20 } as const

export default function PracticeTab({ progress, subjects, onTopicSelect, onStartQuickMix, onNavigateToPath }: PracticeTabProps) {
  const allTopics = useMemo(() => buildTopicList(subjects.length > 0 ? subjects : UPSC_SYLLABUS, progress), [subjects, progress])
  const nextUp = useMemo(() => pickNextUp(allTopics), [allTopics])
  const weakTopics = useMemo(() => allTopics.filter(t => t.tp.questionsAnswered >= 3 && t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy), [allTopics])
  const reviewTopics = useMemo(() => allTopics.filter(t => t.tp.state === 'completed' && t.daysSince >= 1).sort((a, b) => b.daysSince - a.daysSince), [allTopics])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [weakOpen, setWeakOpen] = useState(false)
  const fmt = (d: number) => d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`

  if (allTopics.length === 0) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px', textAlign: 'center' }}>
      <span style={{ fontSize: 64, lineHeight: 1 }}>🎯</span>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Start learning to unlock practice</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', maxWidth: 260, lineHeight: 1.6, margin: 0 }}>Complete at least one topic on the learning path to begin practicing.</p>
      <button onClick={onNavigateToPath} style={{ padding: '14px 32px', borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)', fontSize: 14, fontWeight: 700, color: '#fff', border: 'none', cursor: 'pointer' }}>
        Go to Path →
      </button>
    </div>
  )

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>Practice</h2>

      {/* Next Up Hero */}
      {nextUp && (
        <button onClick={() => onTopicSelect(nextUp.topic.id, nextUp.topic, nextUp.subject)} style={{ ...ELEVATED, width: '100%', textAlign: 'left' as const, padding: 20, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>Next Up</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{reason(nextUp)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, background: `${nextUp.subject.color}15`, border: `1px solid ${nextUp.subject.color}25` }}>
              {nextUp.topic.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{nextUp.topic.title}</p>
              {nextUp.tp.questionsAnswered > 0 && (
                <p style={{ fontSize: 12, color: nextUp.accuracy < 40 ? '#f87171' : nextUp.accuracy < 60 ? '#fbbf24' : '#34d399', margin: '4px 0 0', fontWeight: 600 }}>Accuracy: {Math.round(nextUp.accuracy)}%</p>
              )}
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '12px 0', borderRadius: 12, textAlign: 'center', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.25)', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Practice Now →
          </div>
        </button>
      )}

      {/* Quick Mix */}
      <div onClick={onStartQuickMix} style={{ ...GLASS, padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 24 }}>🎲</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0 }}>Quick Mix</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>5 random questions from across topics</p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>Start →</span>
      </div>

      {/* Stat Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[{ n: weakTopics.length, label: 'weak topics', color: '#f87171', toggle: () => setWeakOpen(o => !o) },
          { n: reviewTopics.length, label: 'due reviews', color: '#fbbf24', toggle: () => setReviewOpen(o => !o) }].map(p => (
          <div key={p.label} onClick={p.toggle} style={{ padding: '14px 16px', borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: p.n > 0 ? p.color : 'rgba(255,255,255,0.55)', margin: 0 }}>{p.n}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{p.label}</p>
          </div>
        ))}
      </div>

      {/* Review Queue */}
      {reviewTopics.length > 0 && (
        <Expandable title="Review Queue" badge={`${reviewTopics.length} topics due`} open={reviewOpen} toggle={() => setReviewOpen(o => !o)}>
          {reviewTopics.slice(0, 8).map(t => (
            <Row key={t.topic.id} icon={t.topic.icon} title={t.topic.title} detail={fmt(t.daysSince)} onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)} />
          ))}
        </Expandable>
      )}

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <Expandable title="Weak Topics" badge={`${weakTopics.length} < 60%`} open={weakOpen} toggle={() => setWeakOpen(o => !o)}>
          {weakTopics.slice(0, 8).map(t => (
            <Row key={t.topic.id} icon={t.topic.icon} title={t.topic.title} detail={`${Math.round(t.accuracy)}%`} detailColor={t.accuracy < 40 ? '#f87171' : '#fbbf24'} onTap={() => onTopicSelect(t.topic.id, t.topic, t.subject)} />
          ))}
        </Expandable>
      )}
    </div>
  )
}

function Expandable({ title, badge, open, toggle, children }: { title: string; badge: string; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ ...GLASS, overflow: 'hidden' }}>
      <button onClick={toggle} style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{title}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{badge}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease', flexShrink: 0 }}><path d="M3 5l4 4 4-4" /></svg>
      </button>
      <div style={{ maxHeight: open ? 400 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease', padding: open ? '0 12px 12px' : '0 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
      </div>
    </div>
  )
}

function Row({ icon, title, detail, detailColor, onTap }: { icon: string; title: string; detail: string; detailColor?: string; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: detailColor || 'rgba(255,255,255,0.30)', flexShrink: 0 }}>{detail}</span>
    </button>
  )
}
