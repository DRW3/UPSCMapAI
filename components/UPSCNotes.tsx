'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMapStore } from '@/lib/map/map-store'
import type { AnnotatedPoint } from '@/types'

const MIN_WIDTH = 240
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 340

export default function UPSCNotes() {
  const { sidebarContent, isSidebarLoading, intent, annotatedPoints, setFocusCoordinates, setNotesState } = useMapStore()
  const contentRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [open, setOpen] = useState(false)

  // Keep the store in sync whenever open or width changes
  useEffect(() => {
    setNotesState(open, width)
  }, [open, width, setNotesState])

  // Auto-open when content starts streaming
  useEffect(() => {
    if (isSidebarLoading || sidebarContent) setOpen(true)
  }, [isSidebarLoading, sidebarContent])

  // Auto-scroll as content streams in
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [sidebarContent])

  // Build a label → point lookup map.
  // Keys are CLEAN names (no parentheticals) so the regex word-boundary works.
  const pointsByLabel = useMemo(() => {
    const map = new Map<string, AnnotatedPoint>()
    const add = (key: string, pt: AnnotatedPoint) => {
      const k = key.trim().toLowerCase()
      if (k.length >= 3) map.set(k, pt)
    }
    for (const pt of annotatedPoints) {
      // 1. Full label as-is
      add(pt.label, pt)
      // 2. Strip parentheticals: "New Delhi (Capital)" → "New Delhi"
      const stripped = pt.label.replace(/\s*\([^)]*\)/g, '').replace(/\s*[:—–].*$/, '').trim()
      add(stripped, pt)
      // 3. ID as words: "new_delhi" → "new delhi"
      add(pt.id.replace(/_/g, ' '), pt)
    }
    return map
  }, [annotatedPoints])

  function handlePointClick(pt: AnnotatedPoint) {
    setFocusCoordinates(pt.coordinates)
  }

  // Drag-to-resize from left edge
  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    function onMove(ev: MouseEvent) {
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + (startX - ev.clientX))))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const glassPanel: React.CSSProperties = {
    background: 'rgba(7, 11, 22, 0.86)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '-12px 0 48px rgba(0,0,0,0.45)',
  }

  // Collapsed tab
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open UPSC Notes"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 py-5 px-2.5 rounded-l-2xl transition-all hover:px-3"
        style={{
          background: 'rgba(7,11,22,0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRight: 'none',
          boxShadow: '-6px 0 24px rgba(0,0,0,0.35)',
        }}
      >
        <span className="text-base leading-none">📖</span>
        <span
          className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.18em] whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          UPSC Notes
        </span>
        {isSidebarLoading && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        )}
      </button>
    )
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 z-20 flex select-none" style={{ width }}>

      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="w-3 flex-shrink-0 cursor-col-resize group flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="w-0.5 h-20 rounded-full bg-white/[0.08] group-hover:bg-indigo-500/60 group-active:bg-indigo-400 transition-colors duration-150" />
      </div>

      {/* Panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={glassPanel}>

        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs flex-shrink-0">
            📖
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1">
              UPSC Study Notes
            </p>
            {intent && (
              <p className="text-[11px] font-medium text-white/65 truncate leading-none">{intent.title}</p>
            )}
          </div>

          {/* Hint badge — shown when there are plottable points */}
          {annotatedPoints.length > 0 && !isSidebarLoading && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="3" stroke="#818cf8" strokeWidth="1.2"/>
                <circle cx="4" cy="4" r="1.2" fill="#818cf8"/>
              </svg>
              <span className="text-[8px] font-semibold text-indigo-400 uppercase tracking-wide">
                Click places
              </span>
            </div>
          )}

          {isSidebarLoading && (
            <div className="flex gap-0.5 flex-shrink-0 mr-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          <button
            onClick={() => setOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.07] transition-all flex-shrink-0"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 1l7 7M8 1L1 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: '14px 16px' }}>
          {sidebarContent ? (
            <MarkdownRenderer
              content={sidebarContent}
              isStreaming={isSidebarLoading}
              pointsByLabel={pointsByLabel}
              onPointClick={handlePointClick}
            />
          ) : isSidebarLoading ? (
            <div className="space-y-2.5 animate-pulse mt-1">
              {[72, 55, 83, 48, 68, 58, 78, 42, 65].map((w, i) => (
                <div key={i} className="h-2 rounded-full"
                  style={{ width: `${w}%`, background: 'rgba(255,255,255,0.07)' }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xl mb-4">
                📚
              </div>
              <p className="text-[12px] font-semibold text-white/40">No notes yet</p>
              <p className="text-[11px] text-white/20 mt-1.5 leading-relaxed">
                Ask for any map in the chat.<br />Notes stream here automatically.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Inline content parser ─────────────────────────────────────────────────────
// Splits a plain-text string into formatting segments (bold/italic/code/text)

type FmtSeg = { type: 'text' | 'bold' | 'italic' | 'code'; content: string }

function parseFormatting(text: string): FmtSeg[] {
  const segs: FmtSeg[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) })
    if (m[1] != null)      segs.push({ type: 'bold',   content: m[1] })
    else if (m[2] != null) segs.push({ type: 'italic', content: m[2] })
    else if (m[3] != null) segs.push({ type: 'code',   content: m[3] })
    last = re.lastIndex
  }
  if (last < text.length) segs.push({ type: 'text', content: text.slice(last) })
  return segs
}

// Splits a plain text segment into point-match and non-match spans

type PointSeg = { type: 'text'; content: string } | { type: 'point'; content: string; point: AnnotatedPoint }

function parsePoints(text: string, pointsByLabel: Map<string, AnnotatedPoint>): PointSeg[] {
  if (pointsByLabel.size === 0) return [{ type: 'text', content: text }]

  // Only use clean keys (no parentheticals) — \b breaks on escaped parens
  const labels = Array.from(pointsByLabel.keys())
    .filter(k => !k.includes('(') && !k.includes(')'))
    .sort((a, b) => b.length - a.length)
    .map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (labels.length === 0) return [{ type: 'text', content: text }]

  // Use letter-only lookahead/lookbehind instead of \b so multi-word names
  // like "New Delhi" work correctly even after commas, colons, etc.
  const re = new RegExp(`(?<![a-zA-Z])(${labels.join('|')})(?![a-zA-Z])`, 'gi')
  const segs: PointSeg[] = []
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', content: text.slice(last, m.index) })
    const pt = pointsByLabel.get(m[1].toLowerCase())
    if (pt) {
      segs.push({ type: 'point', content: m[1], point: pt })
    } else {
      segs.push({ type: 'text', content: m[1] })
    }
    last = re.lastIndex
  }
  if (last < text.length) segs.push({ type: 'text', content: text.slice(last) })
  return segs
}

// ── Inline renderer ───────────────────────────────────────────────────────────
// Converts a raw markdown line into React nodes with formatting + clickable points

function renderInline(
  text: string,
  pointsByLabel: Map<string, AnnotatedPoint>,
  onPointClick: (pt: AnnotatedPoint) => void,
  keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []

  parseFormatting(text).forEach((seg, fi) => {
    const k = `${keyPrefix}-${fi}`

    if (seg.type === 'bold') {
      // Bold text can also contain place names — recurse
      nodes.push(
        <strong key={k} style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
          {renderInline(seg.content, pointsByLabel, onPointClick, k)}
        </strong>
      )
    } else if (seg.type === 'italic') {
      nodes.push(
        <em key={k} style={{ color: 'rgba(255,255,255,0.65)' }}>
          {renderInline(seg.content, pointsByLabel, onPointClick, k)}
        </em>
      )
    } else if (seg.type === 'code') {
      nodes.push(
        <code key={k} style={{
          background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
          padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace',
        }}>
          {seg.content}
        </code>
      )
    } else {
      // Plain text — scan for point names
      parsePoints(seg.content, pointsByLabel).forEach((part, pi) => {
        const pk = `${k}-${pi}`
        if (part.type === 'point') {
          const color = part.point.color ?? '#818cf8'
          nodes.push(
            <span
              key={pk}
              onClick={() => onPointClick(part.point)}
              title={`Go to ${part.point.label} on map`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                color: '#f1f5f9',          // always bright white-ish text
                background: `${color}28`,  // tinted background from marker color
                border: `1px solid ${color}60`,
                borderRadius: '5px',
                padding: '0px 5px 1px 4px',
                cursor: 'pointer',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                transition: 'background 0.15s, border-color 0.15s',
                verticalAlign: 'baseline',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = `${color}45`
                el.style.borderColor = `${color}99`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = `${color}28`
                el.style.borderColor = `${color}60`
              }}
            >
              {/* Coloured dot matching the marker */}
              <svg width="5" height="5" viewBox="0 0 5 5" style={{ flexShrink: 0, marginBottom: '0.5px' }}>
                <circle cx="2.5" cy="2.5" r="2.5" fill={color} />
              </svg>
              {part.content}
            </span>
          )
        } else {
          nodes.push(<React.Fragment key={pk}>{part.content}</React.Fragment>)
        }
      })
    }
  })

  return nodes
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string
  isStreaming: boolean
  pointsByLabel: Map<string, AnnotatedPoint>
  onPointClick: (pt: AnnotatedPoint) => void
}

function MarkdownRenderer({ content, isStreaming, pointsByLabel, onPointClick }: MarkdownRendererProps) {
  const lines = content.split('\n')

  return (
    <div className="space-y-0.5 text-white/75">
      {lines.map((line, i) => {
        const key = `l${i}`

        if (line.startsWith('## ')) {
          return (
            <h2 key={key}
              className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.18em] flex items-center gap-2 pt-5 pb-1.5 first:pt-1"
            >
              <span className="w-3 h-px bg-indigo-500/50 flex-shrink-0" />
              {line.slice(3)}
            </h2>
          )
        }

        if (line.startsWith('### ')) {
          return (
            <h3 key={key} className="text-[11px] font-semibold text-white/55 pt-3 pb-1">
              {renderInline(line.slice(4), pointsByLabel, onPointClick, key)}
            </h3>
          )
        }

        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          return (
            <div key={key} className="flex gap-2 text-[12px] leading-relaxed py-0.5">
              <span className="text-indigo-400/80 mt-[3px] flex-shrink-0 text-[7px]">◆</span>
              <span>{renderInline(line.replace(/^[-*•]\s/, ''), pointsByLabel, onPointClick, key)}</span>
            </div>
          )
        }

        if (line.trim() === '') return <div key={key} className="h-2" />

        return (
          <p key={key} className="text-[12px] leading-relaxed">
            {renderInline(line, pointsByLabel, onPointClick, key)}
          </p>
        )
      })}
      {isStreaming && (
        <span className="inline-block w-0.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-full" />
      )}
    </div>
  )
}
