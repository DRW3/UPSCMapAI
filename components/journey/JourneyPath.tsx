'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import type { LearningSubject, LearningTopic, LearningUnit } from '@/data/syllabus'
import {
  type TopicProgress,
  type NodeState,
  type CrownLevel,
  DEFAULT_TOPIC_PROGRESS,
  CROWN_COLORS,
  PATH_POSITIONS,
} from '@/components/journey/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JourneyPathProps {
  subjects: LearningSubject[]
  progress: Record<string, TopicProgress>
  activeSubjectId: string | null // filter to show only one subject, or null for all
  onNodeTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
}

// ---------------------------------------------------------------------------
// Internal types for the flattened node list
// ---------------------------------------------------------------------------

interface TopicNode {
  kind: 'topic'
  topic: LearningTopic
  unit: LearningUnit
  subject: LearningSubject
  progress: TopicProgress
  state: NodeState
  isFirstAvailable: boolean
  globalIndex: number // position within all topic nodes (for path placement)
}

interface UnitHeader {
  kind: 'unit'
  unit: LearningUnit
  subject: LearningSubject
  completedCount: number
  totalCount: number
}

type PathItem = TopicNode | UnitHeader

// ---------------------------------------------------------------------------
// CSS keyframes injected once
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = 'journey-path-keyframes'

function ensureKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = `
    @keyframes jp-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes jp-pulse-ring {
      0% { transform: scale(1); opacity: 0.6; }
      70% { transform: scale(1.45); opacity: 0; }
      100% { transform: scale(1.45); opacity: 0; }
    }
    @keyframes jp-glow {
      0%, 100% { box-shadow: 0 0 12px 2px var(--glow-color); }
      50% { box-shadow: 0 0 22px 6px var(--glow-color); }
    }
    @keyframes jp-star-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes jp-fade-in {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const NODE_SIZE = 64
const VERTICAL_SPACING = 110
const CONTAINER_PADDING_X = 24
const HEADER_HEIGHT = 80
const PATH_WIDTH = 16
const SCROLL_OFFSET_TOP = 200 // px from top when auto-scrolling to available node

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodePosition(index: number, containerWidth: number) {
  const pattern = PATH_POSITIONS[index % PATH_POSITIONS.length]
  const usable = containerWidth - CONTAINER_PADDING_X * 2 - NODE_SIZE
  const x = CONTAINER_PADDING_X + pattern.x * usable
  return x
}

/** Build the SVG path "d" string that connects all topic nodes */
function buildPathD(
  nodePositions: Array<{ cx: number; cy: number }>,
): string {
  if (nodePositions.length === 0) return ''
  const pts = nodePositions
  let d = `M ${pts[0].cx} ${pts[0].cy}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    // Cubic bezier: the control points pull the curve horizontally at 40% and 60%
    const midY = (prev.cy + cur.cy) / 2
    d += ` C ${prev.cx} ${midY}, ${cur.cx} ${midY}, ${cur.cx} ${cur.cy}`
  }
  return d
}

function stateLabel(state: NodeState, crownLevel: CrownLevel): string {
  if (state === 'locked') return ''
  if (state === 'available') return 'START'
  if (state === 'started') return 'Continue'
  // completed — show crown level
  return `Crown ${crownLevel}`
}

function crownEmoji(level: CrownLevel): string {
  if (level <= 0) return ''
  if (level === 1) return '👑'
  if (level === 2) return '👑'
  if (level === 3) return '👑'
  if (level === 4) return '👑'
  return '💎' // level 5 legendary
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CrownBadge({ level }: { level: CrownLevel; color: string }) {
  if (level <= 0) return null
  const bgColor = CROWN_COLORS[level]
  return (
    <div
      style={{
        position: 'absolute',
        top: -8,
        right: -6,
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: bgColor,
        border: '2.5px solid #080810',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        zIndex: 3,
        boxShadow: `0 2px 8px ${bgColor}66`,
      }}
    >
      {crownEmoji(level)}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Topic Node component
// ---------------------------------------------------------------------------

function TopicNodeView({
  node,
  x,
  y,
  onTap,
}: {
  node: TopicNode
  x: number
  y: number
  onTap: () => void
}) {
  const { topic, subject, state, isFirstAvailable } = node
  const crown = node.progress.crownLevel
  const color = subject.color

  const isInteractive = state === 'available' || state === 'started' || state === 'completed'

  // --- Node circle style ---
  const circleStyle: React.CSSProperties = {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    position: 'relative',
    cursor: isInteractive ? 'pointer' : 'default',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }

  if (state === 'locked') {
    Object.assign(circleStyle, {
      background: 'linear-gradient(145deg, #1e1e2e 0%, #14141e 100%)',
      border: '3px solid rgba(255,255,255,0.08)',
      opacity: 0.55,
    })
  } else if (state === 'available') {
    Object.assign(circleStyle, {
      background: `linear-gradient(145deg, ${color} 0%, ${color}cc 100%)`,
      border: `3px solid ${color}`,
      boxShadow: `0 0 18px 4px ${color}55`,
      ['--glow-color' as string]: `${color}88`,
      animation: isFirstAvailable ? 'jp-bounce 1.8s ease-in-out infinite, jp-glow 2s ease-in-out infinite' : 'jp-glow 2s ease-in-out infinite',
    })
  } else if (state === 'started') {
    Object.assign(circleStyle, {
      background: `linear-gradient(145deg, ${color}ee 0%, ${color}aa 100%)`,
      border: `3px solid ${color}cc`,
      boxShadow: `0 4px 16px ${color}33`,
    })
  } else {
    // completed
    Object.assign(circleStyle, {
      background: `linear-gradient(145deg, ${color} 0%, ${color}dd 100%)`,
      border: `3px solid ${color}`,
      boxShadow: `0 4px 12px ${color}44`,
    })
  }

  // --- Label below ---
  const label = stateLabel(state, crown)

  return (
    <div
      style={{
        position: 'absolute',
        left: x - NODE_SIZE / 2,
        top: y - NODE_SIZE / 2,
        width: NODE_SIZE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 2,
        animation: 'jp-fade-in 0.4s ease-out both',
        animationDelay: `${node.globalIndex * 40}ms`,
      }}
    >
      {/* Pulse ring for available */}
      {state === 'available' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: '50%',
            border: `3px solid ${color}`,
            animation: 'jp-pulse-ring 2s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Circle */}
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={topic.title}
        onClick={isInteractive ? onTap : undefined}
        onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onTap() } : undefined}
        style={circleStyle}
      >
        {state === 'locked' && <LockIcon />}
        {state === 'available' && <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{topic.icon}</span>}
        {state === 'started' && <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{topic.icon}</span>}
        {state === 'completed' && <CheckIcon />}

        {/* Crown badge */}
        <CrownBadge level={crown} color={color} />
      </div>

      {/* Topic title */}
      <span
        style={{
          marginTop: 6,
          fontSize: 11,
          fontWeight: 600,
          color: state === 'locked' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
          textAlign: 'center',
          maxWidth: 110,
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {topic.title}
      </span>

      {/* State label */}
      {label && (
        <span
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: state === 'available'
              ? color
              : state === 'started'
                ? `${color}cc`
                : CROWN_COLORS[crown],
            textShadow: state === 'available' ? `0 0 8px ${color}88` : undefined,
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Unit Header component
// ---------------------------------------------------------------------------

function UnitHeaderView({
  header,
  y,
}: {
  header: UnitHeader
  y: number
}) {
  const { unit, subject, completedCount, totalCount } = header
  const color = subject.color
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top: y,
        height: HEADER_HEIGHT,
        borderRadius: 16,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}0a 100%)`,
        border: `1.5px solid ${color}33`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 14,
        zIndex: 3,
        animation: 'jp-fade-in 0.4s ease-out both',
      }}
    >
      {/* Gate / checkpoint accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          borderRadius: '16px 0 0 16px',
          background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}1a`,
          border: `2px solid ${color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {unit.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.92)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {unit.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontWeight: 500 }}>
          {subject.shortTitle} &middot; {subject.paper}
        </div>
      </div>

      {/* Progress pill */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: color,
          }}
        >
          {completedCount}/{totalCount}
        </span>
        {/* Mini progress bar */}
        <div
          style={{
            width: 56,
            height: 5,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JourneyPath({
  subjects,
  progress,
  activeSubjectId,
  onNodeTap,
}: JourneyPathProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const firstAvailableRef = useRef<number | null>(null) // y position

  // Inject CSS keyframes
  useEffect(() => {
    ensureKeyframes()
  }, [])

  // --- Flatten subjects into PathItems ---
  const { items, topicPositions, totalHeight, firstAvailableY } = useMemo(() => {
    const filtered = activeSubjectId
      ? subjects.filter((s) => s.id === activeSubjectId)
      : subjects

    const result: PathItem[] = []
    const positions: Array<{ cx: number; cy: number; progressRatio: number }> = []
    let currentY = 40 // starting top padding
    let globalTopicIndex = 0
    let foundFirstAvailable = false
    let firstAvailY: number | null = null

    // Fixed layout width matching the SVG viewBox
    const containerWidth = 480

    for (const subject of filtered) {
      for (const unit of subject.units) {
        // Unit header
        const completedInUnit = unit.topics.filter(
          (t) => (progress[t.id] || DEFAULT_TOPIC_PROGRESS).state === 'completed'
        ).length

        result.push({
          kind: 'unit',
          unit,
          subject,
          completedCount: completedInUnit,
          totalCount: unit.topics.length,
        })
        currentY += HEADER_HEIGHT + 24 // header + gap

        // Topic nodes
        for (const topic of unit.topics) {
          const tp = progress[topic.id] || DEFAULT_TOPIC_PROGRESS
          const state = tp.state
          const isFA = !foundFirstAvailable && (state === 'available' || state === 'started')
          if (isFA) {
            foundFirstAvailable = true
            firstAvailY = currentY
          }

          const x = getNodePosition(globalTopicIndex, containerWidth)
          const cy = currentY + NODE_SIZE / 2

          positions.push({
            cx: x,
            cy,
            progressRatio: state === 'completed' ? 1 : state === 'started' ? 0.5 : 0,
          })

          result.push({
            kind: 'topic',
            topic,
            unit,
            subject,
            progress: tp,
            state,
            isFirstAvailable: isFA,
            globalIndex: globalTopicIndex,
          })

          currentY += VERTICAL_SPACING
          globalTopicIndex++
        }

        // Add gap between units
        currentY += 20
      }
    }

    return {
      items: result,
      topicPositions: positions,
      totalHeight: currentY + 80,
      firstAvailableY: firstAvailY,
    }
  }, [subjects, progress, activeSubjectId])

  // Store firstAvailableY for scroll
  firstAvailableRef.current = firstAvailableY

  // --- Auto-scroll to first available on mount ---
  useEffect(() => {
    const el = scrollRef.current
    if (!el || firstAvailableRef.current == null) return
    const targetScroll = Math.max(0, firstAvailableRef.current - SCROLL_OFFSET_TOP)
    // Small delay so the DOM has painted
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: targetScroll, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [activeSubjectId]) // re-scroll when subject filter changes

  // --- Compute SVG path data ---
  const { pathD, progressPathD } = useMemo(() => {
    if (topicPositions.length === 0) return { pathD: '', progressPathD: '' }

    const pts = topicPositions.map((p) => ({ cx: p.cx, cy: p.cy }))
    const fullD = buildPathD(pts)

    // Find the last completed or started node to know where to cut the progress path
    let lastProgressIdx = -1
    for (let i = 0; i < topicPositions.length; i++) {
      if (topicPositions[i].progressRatio > 0) {
        lastProgressIdx = i
      }
    }

    let progD = ''
    if (lastProgressIdx >= 0) {
      // Include one extra node so the path leads to the current node
      const progressPts = pts.slice(0, lastProgressIdx + 1)
      // If the last node is "started" (not complete), extend halfway to next node
      if (lastProgressIdx < pts.length - 1 && topicPositions[lastProgressIdx].progressRatio < 1) {
        const cur = pts[lastProgressIdx]
        const next = pts[lastProgressIdx + 1]
        progressPts.push({
          cx: (cur.cx + next.cx) / 2,
          cy: (cur.cy + next.cy) / 2,
        })
      }
      progD = buildPathD(progressPts)
    }

    return { pathD: fullD, progressPathD: progD }
  }, [topicPositions])

  // --- Handle node tap ---
  const handleNodeTap = useCallback(
    (node: TopicNode) => {
      onNodeTap(node.topic.id, node.topic, node.subject)
    },
    [onNodeTap]
  )

  // --- Pre-compute render positions for each item ---
  const itemPositions = useMemo(() => {
    const positions: Array<{ y: number; x?: number }> = []
    let y = 40
    let tIdx = 0
    const cw = 480

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'unit') {
        positions.push({ y })
        y += HEADER_HEIGHT + 24
      } else {
        const x = getNodePosition(tIdx, cw)
        positions.push({ y: y + NODE_SIZE / 2, x })
        y += VERTICAL_SPACING
        tIdx++
        const next = items[i + 1]
        if (!next || next.kind === 'unit') {
          y += 20
        }
      }
    }
    return positions
  }, [items])

  return (
    <div
      ref={scrollRef}
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Scrollable inner container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: totalHeight,
          minHeight: '100%',
        }}
      >
        {/* SVG Path behind everything */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: totalHeight,
            pointerEvents: 'none',
            zIndex: 1,
          }}
          viewBox={`0 0 480 ${totalHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background (unfilled) path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={PATH_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Progress (filled) path */}
          {progressPathD && (
            <path
              d={progressPathD}
              fill="none"
              stroke="url(#progressGrad)"
              strokeWidth={PATH_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Gradient definition for progress */}
          <defs>
            <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>

        {/* Render all items using pre-computed positions */}
        {items.map((item, i) => {
          const pos = itemPositions[i]
          if (item.kind === 'unit') {
            return (
              <UnitHeaderView
                key={`unit-${item.unit.id}-${item.subject.id}`}
                header={item}
                y={pos.y}
              />
            )
          }
          return (
            <TopicNodeView
              key={`topic-${item.topic.id}`}
              node={item}
              x={pos.x!}
              y={pos.y}
              onTap={() => handleNodeTap(item)}
            />
          )
        })}

        {/* Decorative sparkle dots along the path */}
        {topicPositions
          .filter((_, i) => i % 3 === 1)
          .map((pos, i) => (
            <div
              key={`star-${i}`}
              style={{
                position: 'absolute',
                left: pos.cx + (i % 2 === 0 ? 38 : -50),
                top: pos.cy - 10,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                animation: `jp-star-spin ${3 + i}s linear infinite`,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          ))}
      </div>
    </div>
  )
}
