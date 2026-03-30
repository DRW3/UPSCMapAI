'use client'

import { useEffect, useRef, useMemo, useCallback, useState } from 'react'
import type { LearningSubject, LearningTopic, LearningUnit } from '@/data/syllabus'
import {
  type TopicProgress, type NodeState, type CrownLevel,
  DEFAULT_TOPIC_PROGRESS, CROWN_COLORS, PATH_POSITIONS,
} from '@/components/journey/types'

// ---------------------------------------------------------------------------
// Props & Internal types
// ---------------------------------------------------------------------------

export interface JourneyPathProps {
  subjects: LearningSubject[]
  progress: Record<string, TopicProgress>
  activeSubjectId: string | null
  onNodeTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  onSubjectChange: (subjectId: string | null) => void
}

interface FlatTopicNode {
  kind: 'topic'; topic: LearningTopic; unit: LearningUnit
  subject: LearningSubject; progress: TopicProgress; state: NodeState
  isFirstAvailable: boolean; globalIndex: number
}
interface UnitHeaderData {
  kind: 'unit'; unit: LearningUnit; subject: LearningSubject
  completedCount: number; totalCount: number
}
type ListItem = FlatTopicNode | UnitHeaderData

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
}

const NODE_SIZE = 56
const LINE_H = 36

const KEYFRAMES = `
@keyframes jp-pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.8);opacity:0}}
@keyframes jp-fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes jp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
`

// ---------------------------------------------------------------------------
// SubjectFilterPills
// ---------------------------------------------------------------------------

function SubjectFilterPills({ subjects, activeSubjectId, onSubjectChange }: {
  subjects: LearningSubject[]; activeSubjectId: string | null
  onSubjectChange: (id: string | null) => void
}) {
  const pill = (active: boolean, color: string, rgb: string): React.CSSProperties => ({
    height: 32, padding: '0 12px', borderRadius: 9999, fontSize: 12,
    fontWeight: active ? 600 : 500, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
    border: active ? `1px solid rgba(${rgb},0.4)` : '1px solid rgba(255,255,255,0.06)',
    background: active ? `rgba(${rgb},0.12)` : 'rgba(255,255,255,0.02)',
    color: active ? color : 'rgba(255,255,255,0.45)',
    boxShadow: active ? `0 0 10px rgba(${rgb},0.2)` : 'none',
    transition: 'all 200ms ease-out',
  })

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '8px 0 12px',
      background: 'linear-gradient(to bottom, #050510 60%, transparent)' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 4px' }}>
        <button onClick={() => onSubjectChange(null)}
          style={{ ...pill(activeSubjectId === null, '#818cf8', '99,102,241'), padding: '0 14px', fontWeight: 600 }}>
          All
        </button>
        {subjects.map((s) => {
          const active = activeSubjectId === s.id
          return (
            <button key={s.id} onClick={() => onSubjectChange(active ? null : s.id)}
              style={pill(active, s.color, hexToRgb(s.color))}>
              {s.icon} {s.shortTitle}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UnitHeader (minimal glass divider)
// ---------------------------------------------------------------------------

function UnitHeader({ data }: { data: UnitHeaderData }) {
  const { unit, subject, completedCount, totalCount } = data
  const line: React.CSSProperties = { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }
  return (
    <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 8px' }}>
      <div style={line} />
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
        {subject.icon} {unit.title}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.04)',
        padding: '2px 8px', borderRadius: 9999 }}>
        {completedCount}/{totalCount}
      </span>
      <div style={line} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConnectingLine (SVG bezier between consecutive nodes)
// ---------------------------------------------------------------------------

function ConnectingLine({ prevX, currX, filled, w, index }: {
  prevX: number; currX: number; filled: boolean; w: number; index: number
}) {
  const clamp = (v: number) => Math.max(NODE_SIZE / 2, Math.min(w - NODE_SIZE / 2, v * (w - NODE_SIZE) + NODE_SIZE / 2))
  const x0 = clamp(prevX), x1 = clamp(currX), my = LINE_H / 2
  const d = `M ${x0} 0 C ${x0} ${my}, ${x1} ${my}, ${x1} ${LINE_H}`
  const base = { fill: 'none' as const, strokeWidth: 6, strokeLinecap: 'round' as const }
  const gId = `cl-g-${index}`
  const fId = `cl-glow-${index}`
  return (
    <svg width={w} height={LINE_H} style={{ display: 'block' }}>
      <path d={d} {...base} stroke="rgba(255,255,255,0.08)" />
      {filled && (
        <>
          <defs>
            <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id={fId}>
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#6366f1" floodOpacity="0.35" />
            </filter>
          </defs>
          <path d={d} {...base} stroke={`url(#${gId})`} filter={`url(#${fId})`} />
        </>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// TopicNode (56x56 glassmorphic circle on winding path)
// ---------------------------------------------------------------------------

function TopicNode({ node, onTap, w }: { node: FlatTopicNode; onTap: () => void; w: number }) {
  const { topic, subject, state, isFirstAvailable, globalIndex, progress: tp } = node
  const crown = tp.crownLevel
  const rgb = hexToRgb(subject.color)
  const isInteractive = state !== 'locked'
  const pos = PATH_POSITIONS[globalIndex % PATH_POSITIONS.length]
  const leftPx = Math.max(0, Math.min(w - NODE_SIZE - 60, (w - NODE_SIZE - 60) * pos.x))

  // Progress ring for started nodes
  const progressRing = state === 'started' && crown > 0 ? (() => {
    const r = 30, C = 2 * Math.PI * r
    return (
      <svg width={64} height={64} style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
        <circle cx={32} cy={32} r={r} fill="none" stroke={subject.color} strokeWidth={2}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - crown / 5)}
          transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 500ms ease-out' }} />
      </svg>
    )
  })() : null

  const stateLabel =
    state === 'available' ? { text: 'Start', color: '#6366f1', wt: 700 } :
    state === 'started'   ? { text: 'Continue', color: 'rgba(255,255,255,0.55)', wt: 500 } :
    state === 'completed' ? { text: `Crown ${crown}`, color: CROWN_COLORS[crown], wt: 500 } : null

  const press = isInteractive ? {
    onPointerDown: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)' },
    onPointerUp: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' },
    onPointerLeave: (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' },
  } : {}

  const cs: React.CSSProperties = {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: '50%', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
    transition: 'transform 150ms ease-out',
    userSelect: 'none', WebkitTapHighlightColor: 'transparent',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    ...(state === 'locked'    ? { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' } :
       state === 'available'  ? { background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${rgb},0.2)` } :
       state === 'started'    ? { background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${rgb},0.15)` } :
                                { background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.2)` }),
  }

  return (
    <div style={{ paddingLeft: leftPx, animation: 'jp-fadeUp 400ms cubic-bezier(0.16,1,0.3,1) both',
      animationDelay: `${globalIndex * 30}ms` }}>
      {/* Issue 7: onClick on outer wrapper so text label is part of tap target */}
      <div role={isInteractive ? 'button' : undefined} tabIndex={isInteractive ? 0 : undefined}
        aria-label={topic.title} onClick={isInteractive ? onTap : undefined}
        onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onTap() } : undefined}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: NODE_SIZE + 60,
          cursor: isInteractive ? 'pointer' : 'default',
          /* Issue 5: locked nodes get 0.5 opacity on entire wrapper */
          ...(state === 'locked' ? { opacity: 0.5 } : {}) }}>

        <div style={{ position: 'relative' }} {...press}>
          {progressRing}
          {/* Issue 6: Pulse ring as child of node circle wrapper, using inset */}
          {state === 'available' && isFirstAvailable && (
            <div style={{ position: 'absolute', inset: -8,
              borderRadius: '50%', border: `2px solid rgba(${rgb},0.3)`,
              animation: 'jp-pulse 2s ease-in-out infinite', pointerEvents: 'none' }} />
          )}
          <div style={cs}>
            {state === 'locked'
              ? <span style={{ opacity: 0.3, filter: 'grayscale(1)' }}>🔒</span>
              : state === 'completed'
                ? <><span>{topic.icon}</span>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#34d399"
                        strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div></>
                : <span>{topic.icon}</span>}

            {crown > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%',
                background: CROWN_COLORS[crown as CrownLevel], border: '2px solid #050510',
                fontSize: 9, fontWeight: 700, color: '#fff', zIndex: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 6px ${CROWN_COLORS[crown as CrownLevel]}66`,
                ...(crown === 5 ? { backgroundImage: 'linear-gradient(90deg, #f472b6, #c084fc, #f472b6)',
                  backgroundSize: '200% 100%', animation: 'jp-shimmer 2s linear infinite' } : {}),
              }}>
                {crown}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 4, textAlign: 'center', maxWidth: NODE_SIZE + 56 }}>
          <div style={{ fontSize: 12, lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            color: state === 'locked' ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.55)' }}>
            {topic.title}
          </div>
          {stateLabel && (
            <span style={{ fontSize: 10, fontWeight: stateLabel.wt, color: stateLabel.color,
              marginTop: 2, display: 'inline-block' }}>
              {stateLabel.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JourneyPath({ subjects, progress, activeSubjectId, onNodeTap, onSubjectChange }: JourneyPathProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstAvailableRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(360)
  const [ready, setReady] = useState(false)

  useEffect(() => { setReady(true) }, [])

  // Measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { if (e) setCw(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Flatten subjects → ListItems
  const items = useMemo<ListItem[]>(() => {
    const filtered = activeSubjectId ? subjects.filter((s) => s.id === activeSubjectId) : subjects
    const result: ListItem[] = []
    let gi = 0, foundFirst = false
    for (const subject of filtered) {
      for (const unit of subject.units) {
        let done = 0
        for (const t of unit.topics) if ((progress[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed') done++
        result.push({ kind: 'unit', unit, subject, completedCount: done, totalCount: unit.topics.length })
        for (const topic of unit.topics) {
          const tp = progress[topic.id] || DEFAULT_TOPIC_PROGRESS
          const isFA = !foundFirst && (tp.state === 'available' || tp.state === 'started')
          if (isFA) foundFirst = true
          result.push({ kind: 'topic', topic, unit, subject, progress: tp, state: tp.state, isFirstAvailable: isFA, globalIndex: gi++ })
        }
      }
    }
    return result
  }, [subjects, progress, activeSubjectId])

  const completedIds = useMemo(() => {
    const s = new Set<string>()
    for (const it of items) if (it.kind === 'topic' && it.state === 'completed') s.add(it.topic.id)
    return s
  }, [items])

  // Auto-scroll to first available
  useEffect(() => {
    if (!ready) return
    const id = requestAnimationFrame(() => {
      const n = firstAvailableRef.current, c = scrollRef.current
      if (!n || !c) return
      const cr = c.getBoundingClientRect(), nr = n.getBoundingClientRect()
      c.scrollTo({ top: Math.max(0, c.scrollTop + nr.top - cr.top - 140), behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [activeSubjectId, ready])

  const handleTap = useCallback((n: FlatTopicNode) => onNodeTap(n.topic.id, n.topic, n.subject), [onNodeTap])

  let prev: FlatTopicNode | null = null

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div ref={scrollRef} style={{ width: '100%', maxWidth: 400, margin: '0 auto', height: '100%',
        overflowY: 'auto', overflowX: 'hidden', padding: '0 20px 120px', WebkitOverflowScrolling: 'touch' }}>
        <SubjectFilterPills subjects={subjects} activeSubjectId={activeSubjectId} onSubjectChange={onSubjectChange} />
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
          {items.map((item) => {
            if (item.kind === 'unit') { prev = null; return <UnitHeader key={`u-${item.unit.id}`} data={item} /> }
            const node = item
            const showLine = prev !== null
            const filled = showLine && prev !== null && completedIds.has(prev.topic.id)
            const pPos = prev ? PATH_POSITIONS[prev.globalIndex % PATH_POSITIONS.length] : null
            const cPos = PATH_POSITIONS[node.globalIndex % PATH_POSITIONS.length]
            const line = showLine && pPos
              ? <ConnectingLine prevX={pPos.x} currX={cPos.x} filled={filled} w={cw} index={node.globalIndex} /> : null
            prev = node
            return (
              <div key={`t-${node.topic.id}`} ref={node.isFirstAvailable ? firstAvailableRef : undefined}>
                {line}
                <TopicNode node={node} onTap={() => handleTap(node)} w={cw} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
