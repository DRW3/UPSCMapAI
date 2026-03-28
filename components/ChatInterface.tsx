'use client'

import React, { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMapStore } from '@/lib/map/map-store'
import type { MapOperation, MapSession } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  isNotes?: boolean
  sessionId?: string
}

const SUGGESTED_QUERIES = [
  'Major rivers of India',
  'Mauryan Empire at its peak',
  'Western & Eastern Ghats',
  'Himalayan passes for UPSC',
  'Coal & iron ore deposits',
  'Battle of Plassey 1757',
  'North East India geography',
]

// Scrolling topic chips for the search bar — diverse UPSC-relevant topics
const SCROLL_TOPICS = [
  { label: 'Indus Valley Sites', icon: '🏛️', color: '#e07b39' },
  { label: 'Monsoon Patterns', icon: '🌧️', color: '#2980b9' },
  { label: 'Nuclear Power Plants', icon: '⚡', color: '#27ae60' },
  { label: 'Mughal Empire', icon: '⚔️', color: '#7c5cba' },
  { label: 'Tiger Reserves', icon: '🐅', color: '#e67e22' },
  { label: 'Straits & Channels', icon: '🌊', color: '#0891b2' },
  { label: 'Freedom Movement', icon: '🇮🇳', color: '#e74c3c' },
  { label: 'Earthquake Zones', icon: '🌍', color: '#c0392b' },
  { label: 'Ramsar Wetlands', icon: '🦢', color: '#16a085' },
  { label: 'Chola Dynasty', icon: '👑', color: '#c45c8a' },
  { label: 'Major Ports', icon: '🚢', color: '#34495e' },
  { label: 'Biosphere Reserves', icon: '🌿', color: '#27ae60' },
  { label: 'Gupta Empire', icon: '🏰', color: '#c4953a' },
  { label: 'Oil & Gas Fields', icon: '⛽', color: '#8e44ad' },
  { label: 'Peninsular Rivers', icon: '💧', color: '#3498db' },
  { label: 'Border Disputes', icon: '🗺️', color: '#e74c3c' },
]

// ── Map type helpers ───────────────────────────────────────────────────────────

function getMapTypeColor(mapType: string): string {
  if (mapType.startsWith('physical'))      return '#2980b9'
  if (mapType.startsWith('historical'))    return '#e07b39'
  if (mapType.startsWith('political'))     return '#4f46e5'
  if (mapType.startsWith('economic'))      return '#27ae60'
  if (mapType.startsWith('international')) return '#8e44ad'
  if (mapType.startsWith('thematic'))      return '#0891b2'
  return '#6b7280'
}

function getMapTypeEmoji(mapType: string): string {
  if (mapType.startsWith('physical'))      return '🏔️'
  if (mapType.startsWith('historical'))    return '⚔️'
  if (mapType.startsWith('political'))     return '🗺️'
  if (mapType.startsWith('economic'))      return '⛏️'
  if (mapType.startsWith('international')) return '🌍'
  if (mapType.startsWith('thematic'))      return '🌿'
  return '📍'
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000)     return 'just now'
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ── Session chip ───────────────────────────────────────────────────────────────

function InlineSessionChip({ session, isActive, onLoad }: {
  session: MapSession
  isActive: boolean
  onLoad: () => void
}) {
  const color = getMapTypeColor(session.mapType)
  return (
    <button
      onClick={onLoad}
      className="flex items-center gap-2 w-full text-left rounded-xl px-3 py-2.5 mt-1.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? `${color}55` : 'rgba(255,255,255,0.09)'}`,
        boxShadow: isActive ? `0 0 0 1px ${color}22, 0 2px 12px ${color}18` : 'none',
      }}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        {getMapTypeEmoji(session.mapType)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.75)' }}>
          {session.title}
        </p>
        <p className="text-[10px] mt-0.5 capitalize" style={{ color: `${color}bb` }}>
          {session.mapType.replace(/_/g, ' ')}
        </p>
      </div>
      <span
        className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded-md"
        style={{
          background: isActive ? `${color}25` : 'rgba(255,255,255,0.05)',
          color: isActive ? color : 'rgba(255,255,255,0.25)',
        }}
      >
        {isActive ? 'Active' : 'View'}
      </span>
    </button>
  )
}

// ── Session card (Maps tab) ───────────────────────────────────────────────────

function SessionCard({ session, isActive, onLoad }: {
  session: MapSession
  isActive: boolean
  onLoad: () => void
}) {
  const color = getMapTypeColor(session.mapType)
  return (
    <button
      onClick={onLoad}
      className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: isActive ? `${color}14` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isActive ? `0 0 0 1px ${color}22, 0 4px 20px ${color}14` : 'none',
      }}
    >
      <div style={{ height: 2.5, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      <div className="p-3">
        <div className="flex items-start gap-2.5 mb-2">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0 mt-0.5"
            style={{ background: `${color}1e`, border: `1px solid ${color}44` }}
          >
            {getMapTypeEmoji(session.mapType)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold leading-snug" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.82)' }}>
              {session.title}
            </p>
            <p className="text-[10px] mt-0.5 capitalize" style={{ color: `${color}cc` }}>
              {session.mapType.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-white/35 leading-relaxed truncate mb-2.5 italic">
          &ldquo;{session.query}&rdquo;
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/25">{formatTimeAgo(session.timestamp)}</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
            style={{
              background: isActive ? `${color}25` : 'rgba(255,255,255,0.06)',
              color: isActive ? color : 'rgba(255,255,255,0.35)',
            }}
          >
            {isActive ? '● Active' : 'Open'}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Reasoning steps ────────────────────────────────────────────────────────────

const INIT_STEPS = [
  'Reading your question…',
  'Finding the right map for this…',
  'Looking up the geography & history…',
  'Matching topics with UPSC syllabus…',
  'Getting the map ready…',
]

// ── Markdown components for notes ─────────────────────────────────────────────

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-[13px] font-bold text-white/90 mt-3 mb-1.5">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.18em] flex items-center gap-2 pt-4 pb-1.5 first:pt-1">
      <span className="w-3 h-px bg-indigo-500/50 flex-shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[11px] font-semibold text-white/55 pt-2.5 pb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[12px] leading-relaxed mb-1.5 text-white/75">{children}</p>
  ),
  ul: ({ children }) => <ul className="space-y-0.5 mb-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="space-y-0.5 mb-1.5 list-decimal list-inside">{children}</ol>,
  li: ({ children }) => (
    <div className="flex gap-2 text-[12px] leading-relaxed py-0.5 text-white/75">
      <span className="text-indigo-400/80 mt-[3px] flex-shrink-0 text-[7px]">◆</span>
      <span className="flex-1">{children}</span>
    </div>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'rgba(255,255,255,0.65)' }}>{children}</em>
  ),
  code: ({ children }) => (
    <code style={{
      background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
      padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace',
    }}>
      {children}
    </code>
  ),
  hr: () => <hr className="border-white/10 my-2" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500/40 pl-3 my-2 text-white/55 italic text-[12px]">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-[11px] w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-white/10 px-2 py-1 text-left font-semibold text-indigo-300 bg-indigo-900/20">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-white/10 px-2 py-1 text-white/70">{children}</td>
  ),
}

// ── Main Component ─────────────────────────────────────────────────────────────

type Tab = 'chat' | 'maps'

function ChatInterfaceInner() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask me anything — show me rivers, mountains, battles, empires, minerals, borders, or any topic from your UPSC syllabus. I\'ll put it on the map with notes.',
    },
  ])
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sheetState, setSheetState] = useState<'closed' | 'peek' | 'open' | 'expanded'>('closed')
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [reasoningStep, setReasoningStep] = useState('')
  const [isMobile, setIsMobile]   = useState(false)
  const [notesCardText, setNotesCardText]       = useState('')
  const stepTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepIndexRef   = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const sheetRef       = useRef<HTMLDivElement>(null)
  const isDraggingRef  = useRef(false)

  function startStepCycle() {
    stepIndexRef.current = 0
    setReasoningStep(INIT_STEPS[0])
    stepTimerRef.current = setInterval(() => {
      stepIndexRef.current = (stepIndexRef.current + 1) % INIT_STEPS.length
      setReasoningStep(INIT_STEPS[stepIndexRef.current])
    }, 1300)
  }

  function jumpStep(text: string) {
    if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null }
    setReasoningStep(text)
  }

  function stopSteps() {
    if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null }
    setReasoningStep('')
  }

  const {
    applyOperation, setSidebarContent, setSidebarLoading, resetMap, clearMapData,
    pendingMessage, setPendingMessage,
    saveSession, loadSession, sessions, activeSessionId,
    annotatedPoints, setFocusCoordinates,
  } = useMapStore()

  // Fly to a location on the map and collapse sheet on mobile
  function flyToLocation(coords: [number, number]) {
    setFocusCoordinates(coords)
    if (isMobile) setSheetState('peek')
  }

  // ── Bottom sheet drag-to-resize ──────────────────────────────────────────
  // Uses touch events on mobile and mouse events on desktop (pointer events
  // are unreliable for touch on some browsers). Listeners are attached to
  // `document` so the finger/cursor is tracked even outside the handle.
  function startSheetDrag(clientY: number, inputType: 'touch' | 'mouse') {
    if (isDraggingRef.current) return
    isDraggingRef.current = true

    if (!sheetRef.current) { isDraggingRef.current = false; return }
    const sheet: HTMLDivElement = sheetRef.current

    // Resolve current translateY from computed style — handle "none" (identity)
    let startTranslateY = 0
    try {
      const tv = window.getComputedStyle(sheet).transform
      if (tv && tv !== 'none') startTranslateY = new DOMMatrix(tv).m42
    } catch { /* identity → 0 */ }

    const sheetHeight = sheet.offsetHeight
    const maxHeight = window.innerHeight * 0.8   // 80vh max
    const drag = { startY: clientY, lastY: clientY, lastTime: Date.now(), velocity: 0 }

    sheet.style.transition = 'none'

    function move(y: number) {
      const delta = y - drag.startY

      if (startTranslateY + delta < 0) {
        // Dragging UP past translateY(0) → expand height instead
        const extraUp = -(startTranslateY + delta)
        const newHeight = Math.min(maxHeight, sheetHeight + extraUp)
        sheet.style.height = `${newHeight}px`
        sheet.style.transform = 'translateY(0px)'
      } else {
        // Dragging DOWN → normal translateY
        sheet.style.height = ''  // reset to CSS-driven height
        const newY = Math.min(sheetHeight, startTranslateY + delta)
        sheet.style.transform = `translateY(${newY}px)`
      }

      const now = Date.now()
      const dt = now - drag.lastTime
      if (dt > 10) {
        drag.velocity = (y - drag.lastY) / dt
        drag.lastY = y
        drag.lastTime = now
      }
    }

    function snap(y: number) {
      cleanup()
      sheet.style.transition = ''
      sheet.style.transform = ''
      sheet.style.height = ''

      const totalMove = Math.abs(y - drag.startY)
      if (totalMove < 5) {
        // Tap toggle: expanded→open→peek→closed (or open on desktop)
        setSheetState(prev => {
          if (prev === 'expanded') return 'open'
          if (prev === 'open') return isMobile ? 'peek' : 'closed'
          return 'open'
        })
      } else {
        const delta = y - drag.startY
        const draggedUp = delta < 0
        const swipeDown = drag.velocity > 0.4
        const swipeUp = drag.velocity < -0.4

        if (draggedUp || swipeUp) {
          // User dragged/swiped up — expand or open
          const currentHeight = sheet.offsetHeight
          if (swipeUp && currentHeight > sheetHeight * 1.1) setSheetState('expanded')
          else if (swipeUp) setSheetState(startTranslateY > 0 ? 'open' : 'expanded')
          else if (currentHeight >= maxHeight * 0.9) setSheetState('expanded')
          else setSheetState('open')
        } else {
          // User dragged/swiped down
          const finalY = Math.max(0, startTranslateY + delta)
          const ratio = finalY / sheetHeight
          if (isMobile) {
            if (swipeDown && ratio < 0.35) setSheetState('open')
            else if (swipeDown && ratio < 0.8) setSheetState('peek')
            else if (swipeDown) setSheetState('closed')
            else if (ratio < 0.35) setSheetState('open')
            else if (ratio < 0.8) setSheetState('peek')
            else setSheetState('closed')
          } else {
            if (swipeDown || ratio > 0.4) setSheetState('closed')
            else setSheetState('open')
          }
        }
      }
      isDraggingRef.current = false
    }

    // ── Touch listeners ──
    function onTouchMove(e: TouchEvent) { e.preventDefault(); move(e.touches[0].clientY) }
    function onTouchEnd(e: TouchEvent) { snap(e.changedTouches[0].clientY) }
    function onTouchCancel() { cleanup(); sheet.style.transition = ''; sheet.style.transform = ''; isDraggingRef.current = false }
    // ── Mouse listeners ──
    function onMouseMove(e: MouseEvent) { move(e.clientY) }
    function onMouseUp(e: MouseEvent) { snap(e.clientY) }

    function cleanup() {
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    if (inputType === 'touch') {
      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd)
      document.addEventListener('touchcancel', onTouchCancel)
    } else {
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
  }

  // Called from the drag handle + header area
  function onDragTouchStart(e: React.TouchEvent) {
    startSheetDrag(e.touches[0].clientY, 'touch')
  }
  function onDragMouseDown(e: React.MouseEvent) {
    // Don't hijack clicks on buttons, tabs, or other interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('textarea')) return
    e.preventDefault()
    startSheetDrag(e.clientY, 'mouse')
  }

  // Clickable location pill style — distinct, tappable
  // Uses <span> instead of <button> so iOS Safari doesn't apply UA button styles
  const locPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    color: '#f1f5f9',
    background: 'rgba(99,102,241,0.28)',
    border: '1px solid rgba(99,102,241,0.55)',
    padding: '1px 8px 2px 5px',
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    fontWeight: 600,
    verticalAlign: 'baseline',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, border-color 0.15s',
    WebkitTapHighlightColor: 'transparent',
  }

  // Scan text for ANY annotated point label and make matches clickable
  function linkifyLocations(text: string): React.ReactNode {
    try {
      if (!annotatedPoints.length || !text || text.length < 2) return text

      // Build regex from labels (3+ chars, longest first to avoid partial matches)
      const valid = [...annotatedPoints]
        .filter(p => p.label && p.label.length >= 3)
        .sort((a, b) => b.label.length - a.label.length)
      if (!valid.length) return text

      const pattern = valid.map(p => p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
      const regex = new RegExp(`(${pattern})`, 'gi')

      const parts = text.split(regex)
      if (parts.length <= 1) return text

      return parts.map((part, i) => {
        const point = valid.find(p => p.label.toLowerCase() === part.toLowerCase())
        if (point) {
          const color = point.color ?? '#818cf8'
          return (
            <span key={i} role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); flyToLocation(point.coordinates) }}
              onKeyDown={(e) => { if (e.key === 'Enter') flyToLocation(point.coordinates) }}
              style={{ ...locPillStyle, background: `${color}3a`, borderColor: `${color}80` }}>
              <svg width="5" height="5" viewBox="0 0 5 5" style={{ flexShrink: 0 }}>
                <circle cx="2.5" cy="2.5" r="2.5" fill={color} />
              </svg>
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })
    } catch {
      return text // fallback: return plain text if regex fails
    }
  }

  // Preprocess markdown text: inject [label](loc:lng,lat) links for map pins
  function injectLocationLinks(markdown: string): string {
    try {
      if (!annotatedPoints.length || !markdown) return markdown
      const valid = [...annotatedPoints]
        .filter(p => p.label && p.label.length >= 3)
        .sort((a, b) => b.label.length - a.label.length)
      if (!valid.length) return markdown

      // Single-pass replace — no lookbehinds (Safari compat)
      const pattern = valid.map(p => p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
      const regex = new RegExp(`(${pattern})`, 'gi')
      return markdown.replace(regex, (match) => {
        const pt = valid.find(p => p.label.toLowerCase() === match.toLowerCase())
        if (pt) return `[${match}](loc:${pt.coordinates[0]},${pt.coordinates[1]})`
        return match
      })
    } catch {
      return markdown
    }
  }

  // Parse chat text: render **bold** and make matching locations clickable
  function renderChatContent(content: string) {
    const parts = content.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/)
      if (boldMatch) {
        const text = boldMatch[1]
        return <strong key={i}>{linkifyLocations(text)}</strong>
      }
      return <span key={i}>{linkifyLocations(part)}</span>
    })
  }

  const sendMessageRef = useRef(sendMessage)
  sendMessageRef.current = sendMessage

  const searchParams = useSearchParams()
  const autoQueryFiredRef = useRef(false)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !autoQueryFiredRef.current && !isLoading) {
      autoQueryFiredRef.current = true
      setSheetState('open')
      sendMessageRef.current(decodeURIComponent(q))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingMessage || isLoading) return
    setSheetState('open')
    sendMessageRef.current(pendingMessage)
    setPendingMessage(null)
  }, [pendingMessage, isLoading, setPendingMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-switch to chat tab on new message
  useEffect(() => {
    if (messages.length > 1) setActiveTab('chat')
  }, [messages.length])

  // Focus input when panel opens — works on both desktop and mobile.
  // On mobile, the keyboard auto-opens because focus is triggered from a user tap.
  useEffect(() => {
    if (sheetState === 'open' || sheetState === 'expanded') {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [sheetState])

  // Detect mobile viewport
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMsg: Message      = { id: Date.now().toString(), role: 'user', content: text }
    const assistantMsgId        = `${Date.now()}-assistant`
    const loadingMsg: Message   = { id: assistantMsgId, role: 'assistant', content: '', isLoading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)
    setSheetState('open')
    clearMapData()
    setNotesCardText('')
    setSidebarLoading(true)
    startStepCycle()

    // Track notes message
    let notesStarted = false
    const notesMsgId = `${Date.now()}-notes`
    let notesText    = ''

    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok || !response.body) throw new Error(`API error ${response.status}: ${response.statusText}`)

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let sseBuffer = '' // buffer for partial SSE lines split across TCP chunks

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split('\n')
        sseBuffer = lines.pop() ?? '' // keep the last (possibly incomplete) line for next read

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break

          // ── Parse JSON separately so intentional throws propagate out ──────
          let event: Record<string, unknown>
          try {
            event = JSON.parse(data)
          } catch {
            continue // non-JSON line, skip silently
          }

          // ── Handle each event type ─────────────────────────────────────────
          if (event.type === 'error') {
            // Surface API errors (e.g. Gemini 429 rate limit) to the user
            throw new Error(event.message as string)
          } else if (event.type === 'map_operation') {
            const op = event.operation as MapOperation
            applyOperation(op)
            if (op.op === 'full_replace') {
              jumpStep('Drawing the map…')
            } else if (op.op === 'add_markers') {
              jumpStep(`Pinning ${op.points.length} important place${op.points.length !== 1 ? 's' : ''}…`)
            }
          } else if (event.type === 'chat_text') {
            stopSteps()
            assistantText = event.text as string
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, content: assistantText, isLoading: false } : m
            ))
          } else if (event.type === 'chat_text_append') {
            stopSteps()
            assistantText += event.text as string
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, content: assistantText, isLoading: false } : m
            ))
          } else if (event.type === 'sidebar_text') {
            // Add notes as a chat message (streaming)
            if (!notesStarted) {
              notesStarted = true
              jumpStep('Writing your study notes…')
              setMessages(prev => [...prev, {
                id: notesMsgId,
                role: 'assistant',
                content: '',
                isLoading: true,
                isNotes: true,
              }])
            }
            notesText += event.text as string
            setSidebarContent(notesText) // keep store in sync for session persistence
            setNotesCardText(notesText)
            setMessages(prev => prev.map(m =>
              m.id === notesMsgId ? { ...m, content: notesText, isLoading: false } : m
            ))
          } else if (event.type === 'sidebar_done') {
            setSidebarLoading(false)

            // Save session snapshot
            const storeState = useMapStore.getState()
            if (storeState.intent) {
              const sessionId = `session-${Date.now()}`
              saveSession({
                id: sessionId,
                query: text,
                title: storeState.intent.title,
                mapType: storeState.intent.map_type,
                timestamp: Date.now(),
                intent: storeState.intent,
                layers: storeState.layers,
                highlightedFeatures: storeState.highlightedFeatures,
                annotatedPoints: storeState.annotatedPoints,
                sidebarContent: notesText,
              })
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, sessionId } : m
              ))
            }
          }
        }
      }

      // Fallback if no chat_text event was emitted
      if (!assistantText) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: 'Map loaded. Study notes are streaming below ↓', isLoading: false }
            : m
        ))
      }
    } catch (err) {
      stopSteps()
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, content: `⚠️ ${msg}`, isLoading: false } : m
      ))
      setSidebarLoading(false)
    } finally {
      stopSteps()
      setIsLoading(false)
      // Auto-collapse to peek on mobile so map is visible
      if (window.matchMedia('(max-width: 768px)').matches) {
        setTimeout(() => setSheetState('peek'), 600)
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  // Compute current map title for peek state
  // Last searched topic — shown in the header instead of "UPSC Map AI"
  const lastUserQuery = messages.filter(m => m.role === 'user').pop()?.content ?? ''
  const currentMapTitle = useMapStore.getState().intent?.title || lastUserQuery || ''

  // Location-aware markdown: handle loc: links as clickable map buttons
  const notesMdComponents: Components = {
    ...mdComponents,
    a: ({ href, children }) => {
      if (href?.startsWith('loc:')) {
        const coords = href.slice(4).split(',').map(Number) as [number, number]
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          // Find matching annotated point for its marker color
          const pt = annotatedPoints.find(p => {
            const c = p.coordinates
            return Math.abs(c[0] - coords[0]) < 0.001 && Math.abs(c[1] - coords[1]) < 0.001
          })
          const color = pt?.color ?? '#818cf8'
          return (
            <span role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); flyToLocation(coords) }}
              onKeyDown={(e) => { if (e.key === 'Enter') flyToLocation(coords) }}
              style={{ ...locPillStyle, background: `${color}3a`, borderColor: `${color}80` }}>
              <svg width="5" height="5" viewBox="0 0 5 5" style={{ flexShrink: 0 }}>
                <circle cx="2.5" cy="2.5" r="2.5" fill={color} />
              </svg>
              {children}
            </span>
          )
        }
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#a5b4fc' }}>{children}</a>
    },
  }

  // Back button style — shared between mobile and desktop
  const backBtnStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(10, 14, 28, 0.88)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(99,102,241,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 6px rgba(99,102,241,0.1)',
    transition: 'border-color 0.15s, background 0.15s',
  }

  return (
    <>
      {/* ── Back button — always visible ──────────────────────────────────── */}
      <button
        onClick={() => router.push('/')}
        aria-label="Back to home"
        style={{
          ...backBtnStyle,
          position: 'fixed',
          top: isMobile ? 'calc(env(safe-area-inset-top, 10px) + 12px)' : '20px',
          left: 12,
          zIndex: 35,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'rgba(10, 14, 28, 0.88)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4L6 9l5 5" />
        </svg>
      </button>

      {/* ── Mobile: Futuristic search bar + scrolling topic chips ────────── */}
      {isMobile && sheetState !== 'open' && sheetState !== 'expanded' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, paddingTop: 'env(safe-area-inset-top, 10px)' }}>
          {/* Search bar with animated gradient border — left margin accounts for back button */}
          <div
            onClick={() => { setSheetState('open'); setTimeout(() => inputRef.current?.focus(), 100) }}
            className="search-bar-border"
            style={{
              margin: '8px 12px 0 60px',
              borderRadius: 20,
              padding: 1.5, // border thickness
              cursor: 'pointer',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              height: 48, padding: '0 14px',
              borderRadius: 18.5,
              background: 'rgba(10, 14, 28, 0.92)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(99,102,241,0.5)',
              }}>
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.4">
                  <circle cx="7.5" cy="7.5" r="5.5"/><path d="M12 12l4 4" strokeLinecap="round"/>
                </svg>
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>
                Search UPSC topics...
              </span>
              {isLoading && (
                <span className="search-spinner" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#818cf8', flexShrink: 0 }} />
              )}
            </div>
          </div>

          {/* Scrolling topic chips */}
          <div className="topic-scroll-container" style={{
            overflow: 'hidden',
            padding: '8px 0 8px',
            maskImage: 'linear-gradient(90deg, transparent 0%, black 12px, black calc(100% - 12px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 12px, black calc(100% - 12px), transparent 100%)',
          }}>
            <div className="topic-scroll-track" style={{
              display: 'flex', gap: 7,
              paddingLeft: 12,
              width: 'max-content',
            }}>
              {/* Duplicate the topics for seamless infinite scroll */}
              {[...SCROLL_TOPICS, ...SCROLL_TOPICS].map((topic, i) => (
                <button
                  key={`${topic.label}-${i}`}
                  onClick={(e) => { e.stopPropagation(); sendMessage(topic.label) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px 6px 8px',
                    borderRadius: 12,
                    background: `rgba(10,14,28,0.88)`,
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${topic.color}50`,
                    color: '#e2e8f0',
                    fontSize: 12, fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s, transform 0.15s',
                    boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 4px ${topic.color}20`,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{topic.icon}</span>
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop: Futuristic floating search bar + scrolling chips ──────── */}
      {!isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
          transform: sheetState !== 'closed' ? 'translateY(-100%)' : 'translateY(0)',
          opacity: sheetState !== 'closed' ? 0 : 1,
          transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1), opacity 250ms ease',
          pointerEvents: sheetState !== 'closed' ? 'none' : 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 16,
        }}>
          {/* Search bar with animated gradient border */}
          <div
            onClick={() => { setSheetState('open'); setTimeout(() => inputRef.current?.focus(), 100) }}
            className="search-bar-border"
            style={{
              borderRadius: 24,
              padding: 2, // border thickness
              cursor: 'pointer',
              maxWidth: 520,
              width: 'calc(100% - 48px)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              height: 52, padding: '0 18px',
              borderRadius: 22,
              background: 'rgba(10, 14, 28, 0.94)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(99,102,241,0.5)',
              }}>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.2">
                  <circle cx="7.5" cy="7.5" r="5.5"/><path d="M12 12l4 4" strokeLinecap="round"/>
                </svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em' }}>
                Search UPSC topics...
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                ↵ Enter
              </span>
            </div>
          </div>

          {/* Scrolling topic chips */}
          <div className="topic-scroll-container" style={{
            overflow: 'hidden', width: '100%',
            padding: '12px 0 8px',
            maskImage: 'linear-gradient(90deg, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)',
          }}>
            <div className="topic-scroll-track" style={{
              display: 'flex', gap: 8,
              paddingLeft: 40,
              width: 'max-content',
            }}>
              {[...SCROLL_TOPICS, ...SCROLL_TOPICS].map((topic, i) => (
                <button
                  key={`${topic.label}-${i}`}
                  onClick={(e) => { e.stopPropagation(); sendMessage(topic.label) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px 7px 10px',
                    borderRadius: 14,
                    background: 'rgba(10,14,28,0.88)',
                    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${topic.color}50`,
                    color: '#e2e8f0',
                    fontSize: 13, fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                    boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 4px ${topic.color}20`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.background = `${topic.color}30`
                    el.style.borderColor = `${topic.color}70`
                    el.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.background = 'rgba(10,14,28,0.88)'
                    el.style.borderColor = `${topic.color}50`
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  <span style={{ fontSize: 14 }}>{topic.icon}</span>
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-up chat panel (3-state: closed / peek / open) ─────────── */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: sheetState === 'expanded' ? '80vh' : '60vh',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          transform: isMobile
            ? ({
                closed: 'translateY(100%)',
                peek: `translateY(calc(100% - ${notesCardText ? '200px' : '112px'}))`,
                open: 'translateY(0)',
                expanded: 'translateY(0)',
              })[sheetState]
            : (sheetState === 'closed' ? 'translateY(100%)' : 'translateY(0)'),
          transition: 'transform 300ms cubic-bezier(0.2, 0, 0, 1), height 300ms cubic-bezier(0.2, 0, 0, 1)',
          background: 'rgba(8, 12, 24, 0.96)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(99,102,241,0.15)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 -2px 20px rgba(99,102,241,0.08)',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle — drag to resize, tap to toggle */}
        <div
          onTouchStart={onDragTouchStart}
          onMouseDown={onDragMouseDown}
          style={{
            display: 'flex', justifyContent: 'center',
            padding: '14px 0 10px', flexShrink: 0,
            cursor: 'grab', touchAction: 'none',
          }}
        >
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.25)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Peek content (mobile only) ─────────────────────────────────── */}
        {isMobile && sheetState === 'peek' && (
          <div
            onClick={() => { setSheetState('open'); setTimeout(() => inputRef.current?.focus(), 100) }}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '2px 14px 14px',
              cursor: 'pointer',
            }}
          >
            {/* Row 1: Last topic + marker count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 24 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(167,139,250,0.3))',
                border: '1px solid rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, flexShrink: 0, color: '#a78bfa',
              }}>✦</span>
              <span style={{
                flex: 1, fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {currentMapTitle || 'UPSC Map AI'}
              </span>
              {annotatedPoints.length > 0 && (
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.35)',
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 7px', borderRadius: 8,
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399' }} />
                  {annotatedPoints.length}
                </span>
              )}
            </div>

            {/* Notes preview — shows when notes are available, otherwise show search input */}
            {notesCardText ? (
              <div style={{
                borderRadius: 14,
                padding: '10px 12px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.18)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Notes icon + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="notes-icon-glow" style={{
                    width: 20, height: 20, borderRadius: 5,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(167,139,250,0.25))',
                    border: '1px solid rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0,
                  }}>📖</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Study Notes
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(129,140,248,0.6)', fontWeight: 500 }}>
                    Swipe up ↑
                  </span>
                </div>
                {/* Preview text — 3 lines with fade */}
                <div style={{
                  fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)',
                  maxHeight: 58, overflow: 'hidden',
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                }}>
                  {notesCardText.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').replace(/[-•]\s/g, '').trim().slice(0, 200)}
                </div>
              </div>
            ) : (
              /* No notes — show search input */
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="rgba(129,140,248,0.6)" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="7.5" cy="7.5" r="5.5"/><path d="M12 12l4 4" strokeLinecap="round"/>
                </svg>
                <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  Ask a follow-up question...
                </span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(129,140,248,0.5)" strokeWidth="1.8" style={{ flexShrink: 0 }}>
                  <path d="M14 2L2 8.5l4.5 1.8L9 14.5l5-12.5z" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* ── Full sheet content (when open) ──────────────────────────── */}
        {(sheetState === 'open' || sheetState === 'expanded' || !isMobile) && (
        <>
        {/* ── Header (also draggable — drag from brand bar to resize) ──── */}
        <div
          onTouchStart={onDragTouchStart}
          onMouseDown={onDragMouseDown}
          style={{ flexShrink: 0, borderBottom: '1px solid rgba(99,102,241,0.1)', touchAction: 'none', cursor: 'grab' }}
        >
          {/* Brand + controls */}
          <div style={{ padding: '0px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 7,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(167,139,250,0.3))',
                border: '1px solid rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, flexShrink: 0,
                boxShadow: '0 0 8px rgba(99,102,241,0.2)',
              }}>
                <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="#a78bfa" strokeWidth="2">
                  <circle cx="7.5" cy="7.5" r="5.5"/><path d="M12 12l4 4" strokeLinecap="round"/>
                </svg>
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: currentMapTitle ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
              }}>
                {currentMapTitle || 'Search any UPSC topic'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              <button
                onClick={() => {
                  resetMap()
                  setMessages([{ id: 'welcome', role: 'assistant', content: 'All cleared. What topic do you want to study next?' }])
                  setActiveTab('chat')
                }}
                style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', padding: '4px 10px', borderRadius: 8,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.color = 'rgba(255,255,255,0.7)'; el.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.color = 'rgba(255,255,255,0.3)'; el.style.background = 'rgba(255,255,255,0.04)' }}
              >
                Clear
              </button>
              {isMobile && (
                <button
                  onClick={() => setSheetState('closed')}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >×</button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 12px', display: 'flex', gap: 2 }}>
            {(
              [
                { id: 'chat' as Tab, label: 'Chat', badge: undefined },
                { id: 'maps' as Tab, label: 'Maps', badge: sessions.length > 0 ? sessions.length : undefined },
              ]
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  borderRadius: '10px 10px 0 0',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                  color: activeTab === tab.id ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
                  background: activeTab === tab.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #818cf8' : '2px solid transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                {tab.badge != null && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 8,
                    padding: '0 5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    background: activeTab === tab.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map(msg => {
                const linkedSession = msg.sessionId
                  ? sessions.find(s => s.id === msg.sessionId)
                  : null

                // ── Notes message ────────────────────────────────────────────
                if (msg.isNotes) {
                  return (
                    <div key={msg.id} className="chat-msg-enter" style={{ width: '100%' }}>
                      {/* Notes header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: 'rgba(99,102,241,0.2)',
                          border: '1px solid rgba(99,102,241,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, flexShrink: 0,
                        }}>📖</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                          Study Notes
                        </span>
                        {msg.isLoading && (
                          <div style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
                            {[0, 1, 2].map(i => (
                              <span key={i} style={{
                                width: 4, height: 4, borderRadius: '50%',
                                background: '#818cf8',
                                animation: 'bounce 0.6s ease-in-out infinite',
                                animationDelay: `${i * 0.15}s`,
                              }} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes content */}
                      <div style={{
                        borderRadius: 16,
                        padding: '12px 14px',
                        background: 'rgba(99,102,241,0.06)',
                        border: '1px solid rgba(99,102,241,0.16)',
                        boxShadow: 'inset 0 1px 0 rgba(99,102,241,0.1)',
                      }}>
                        {msg.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={notesMdComponents}>
                            {injectLocationLinks(msg.content)}
                          </ReactMarkdown>
                        ) : (
                          /* Skeleton while streaming starts */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'pulse 1.5s ease-in-out infinite' }}>
                            {[72, 55, 83, 48, 68].map((w, i) => (
                              <div key={i} style={{ height: 8, borderRadius: 4, width: `${w}%`, background: 'rgba(255,255,255,0.07)' }} />
                            ))}
                          </div>
                        )}
                        {msg.isLoading && msg.content && (
                          <span style={{
                            display: 'inline-block', width: 2, height: 14,
                            background: '#818cf8',
                            borderRadius: 2, marginLeft: 2,
                            animation: 'pulse 1s ease-in-out infinite',
                            verticalAlign: 'middle',
                          }} />
                        )}
                      </div>
                    </div>
                  )
                }

                // ── Regular chat message ──────────────────────────────────────
                return (
                  <div key={msg.id} className="chat-msg-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, width: '100%' }}>
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(167,139,250,0.5))',
                          border: '1px solid rgba(99,102,241,0.35)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, flexShrink: 0, marginTop: 2,
                          color: '#c4b5fd',
                          boxShadow: '0 0 8px rgba(99,102,241,0.2)',
                        }}>
                          ✦
                        </div>
                      )}
                      <div style={{
                        maxWidth: '82%',
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '10px 14px',
                        fontSize: 13,
                        lineHeight: 1.55,
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, rgba(99,102,241,0.85), rgba(79,70,229,0.85))'
                          : 'rgba(255,255,255,0.04)',
                        color: msg.role === 'user' ? 'white' : 'rgba(229,231,235,1)',
                        border: msg.role === 'user' ? '1px solid rgba(129,140,248,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: msg.role === 'user' ? '0 2px 12px rgba(99,102,241,0.2)' : 'none',
                      }}>
                        {msg.isLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#818cf8',
                              animation: 'pulse 1s ease-in-out infinite',
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 12, color: 'rgba(165,180,252,0.7)', fontStyle: 'italic' }}>
                              {reasoningStep}
                            </span>
                          </div>
                        ) : (
                          <span>{renderChatContent(msg.content)}</span>
                        )}
                      </div>
                    </div>

                    {/* Inline session chip */}
                    {linkedSession && (
                      <div style={{ width: '100%', paddingLeft: 32, marginTop: 0 }}>
                        <InlineSessionChip
                          session={linkedSession}
                          isActive={linkedSession.id === activeSessionId}
                          onLoad={() => loadSession(linkedSession.id)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Suggested queries — inside scroll area so they don't overlap input */}
              {messages.length === 1 && (
                <div style={{ padding: '8px 0 4px' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                    Try a topic
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SUGGESTED_QUERIES.map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        style={{
                          fontSize: 12, padding: '8px 12px', borderRadius: 16, cursor: 'pointer',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — futuristic dark glass with gradient border on focus */}
            <div style={{ padding: '10px 14px 16px', flexShrink: 0, borderTop: '1px solid rgba(99,102,241,0.1)' }}>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-end',
                padding: 1.5,
                borderRadius: 16,
                background: 'rgba(99,102,241,0.12)',
                transition: 'background 0.2s',
              }}>
                <div style={{
                  flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end',
                  background: 'rgba(8, 12, 24, 0.95)',
                  borderRadius: 14.5,
                  padding: '4px 4px 4px 14px',
                }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about any UPSC topic…"
                    rows={1}
                    disabled={isLoading}
                    className="scrollbar-thin"
                    style={{
                      flex: 1, resize: 'none',
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 0',
                      fontSize: 15, color: 'white',
                      outline: 'none',
                      opacity: isLoading ? 0.4 : 1,
                      lineHeight: 1.5,
                      maxHeight: 96,
                      fontFamily: 'inherit',
                      fieldSizing: 'content',
                    } as React.CSSProperties}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    style={{
                      width: 36, height: 36, flexShrink: 0, borderRadius: 11,
                      background: !input.trim() || isLoading
                        ? 'rgba(99,102,241,0.15)'
                        : 'linear-gradient(135deg, #6366f1, #818cf8)',
                      border: 'none',
                      cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: !input.trim() || isLoading ? 'none' : '0 2px 12px rgba(99,102,241,0.4)',
                    }}
                  >
                    {isLoading ? (
                      <span className="search-spinner" style={{
                        width: 14, height: 14,
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#a5b4fc',
                        borderRadius: '50%',
                        display: 'block',
                      }} />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="white" style={{ opacity: !input.trim() ? 0.25 : 1, transform: 'rotate(90deg)' }}>
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Maps tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'maps' && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {sessions.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '24px 24px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 14,
                }}>
                  🗺️
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>No maps studied yet</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                  Every question you ask creates a map you can come back to.
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  style={{
                    marginTop: 16, padding: '8px 16px', borderRadius: 12,
                    fontSize: 12, fontWeight: 600,
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc', cursor: 'pointer',
                  }}
                >
                  Go to Chat
                </button>
              </div>
            ) : (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 2 }}>
                  {sessions.length} topic{sessions.length !== 1 ? 's' : ''} studied
                </p>
                {sessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isActive={session.id === activeSessionId}
                    onLoad={() => {
                      loadSession(session.id)
                      setActiveTab('chat')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </>
  )
}

export default function ChatInterface() {
  return (
    <Suspense fallback={null}>
      <ChatInterfaceInner />
    </Suspense>
  )
}
