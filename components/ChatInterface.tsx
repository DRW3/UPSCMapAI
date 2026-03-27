'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask me anything — show me rivers, mountains, battles, empires, minerals, borders, or any topic from your UPSC syllabus. I\'ll put it on the map with notes.',
    },
  ])
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen]       = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [reasoningStep, setReasoningStep] = useState('')
  const stepTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepIndexRef   = useRef(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)

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
  } = useMapStore()

  const sendMessageRef = useRef(sendMessage)
  sendMessageRef.current = sendMessage

  const searchParams = useSearchParams()
  const autoQueryFiredRef = useRef(false)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !autoQueryFiredRef.current && !isLoading) {
      autoQueryFiredRef.current = true
      setIsOpen(true)
      sendMessageRef.current(decodeURIComponent(q))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingMessage || isLoading) return
    setIsOpen(true)
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

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [isOpen])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMsg: Message      = { id: Date.now().toString(), role: 'user', content: text }
    const assistantMsgId        = `${Date.now()}-assistant`
    const loadingMsg: Message   = { id: assistantMsgId, role: 'assistant', content: '', isLoading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)
    setIsOpen(true)
    clearMapData()
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
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
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <>
      {/* ── Floating open button (collapsed state) ──────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
        className="chat-open-btn"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: isOpen ? 'translateX(-50%) translateY(80px)' : 'translateX(-50%) translateY(0)',
          opacity: isOpen ? 0 : 1,
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease',
          pointerEvents: isOpen ? 'none' : 'auto',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          borderRadius: 32,
          background: 'rgba(7, 11, 22, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99,102,241,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15)',
          color: 'white',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Map icon */}
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(99,102,241,0.25)',
          border: '1px solid rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>🗺</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
          Ask about UPSC…
        </span>
        {/* Pulse dot when loading */}
        {isLoading && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#818cf8', animation: 'pulse 1s ease-in-out infinite',
          }} />
        )}
      </button>

      {/* ── Slide-up chat panel ────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '58vh',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          background: 'rgba(7, 11, 22, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div
          style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}
        >
          <button
            onClick={() => setIsOpen(false)}
            title="Close panel"
            style={{
              width: 40, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.18)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.35)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)' }}
          />
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Brand + controls */}
          <div style={{ padding: '4px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'rgba(99,102,241,0.25)',
                border: '1px solid rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>🗺</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>UPSC Map AI</span>
            </div>
            <button
              onClick={() => {
                resetMap()
                setMessages([{ id: 'welcome', role: 'assistant', content: 'All cleared. What topic do you want to study next?' }])
                setActiveTab('chat')
              }}
              style={{
                fontSize: 11, color: 'rgba(255,255,255,0.3)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 8px', borderRadius: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}
            >
              Clear
            </button>
          </div>

          {/* Tabs */}
          <div style={{ padding: '0 12px', display: 'flex', gap: 4 }}>
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
                  padding: '7px 12px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: 11, fontWeight: 600,
                  color: activeTab === tab.id ? 'rgba(165,180,252,1)' : 'rgba(255,255,255,0.3)',
                  background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid rgba(99,102,241,0.7)' : '2px solid transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                {tab.badge != null && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 8,
                    padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    background: activeTab === tab.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.1)',
                    color: activeTab === tab.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {msg.content}
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
                          background: 'rgba(79,70,229,0.6)',
                          border: '1px solid rgba(99,102,241,0.4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, flexShrink: 0, marginTop: 2,
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
                          ? 'rgba(79,70,229,0.85)'
                          : 'rgba(255,255,255,0.06)',
                        color: msg.role === 'user' ? 'white' : 'rgba(229,231,235,1)',
                        border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
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
                          <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
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
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested queries */}
            {messages.length === 1 && (
              <div style={{ padding: '0 14px 10px', flexShrink: 0 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Popular topics
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTED_QUERIES.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.6)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = 'rgba(99,102,241,0.2)'
                        el.style.borderColor = 'rgba(99,102,241,0.4)'
                        el.style.color = '#a5b4fc'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = 'rgba(255,255,255,0.05)'
                        el.style.borderColor = 'rgba(255,255,255,0.08)'
                        el.style.color = 'rgba(255,255,255,0.6)'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 14px 16px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any UPSC topic… (Enter to send)"
                  rows={1}
                  disabled={isLoading}
                  className="scrollbar-thin"
                  style={{
                    flex: 1, resize: 'none', borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '10px 14px',
                    fontSize: 13, color: 'white',
                    outline: 'none',
                    opacity: isLoading ? 0.4 : 1,
                    lineHeight: 1.5,
                    maxHeight: 96,
                    fontFamily: 'inherit',
                    // @ts-ignore
                    fieldSizing: 'content',
                  } as React.CSSProperties}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  style={{
                    width: 40, height: 40, flexShrink: 0, borderRadius: 12,
                    background: 'rgba(79,70,229,0.9)',
                    border: 'none', cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: !input.trim() || isLoading ? 0.35 : 1,
                    transition: 'opacity 0.15s, background 0.15s',
                    boxShadow: '0 4px 16px rgba(79,70,229,0.35)',
                  }}
                  onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.95)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,70,229,0.9)' }}
                >
                  {isLoading ? (
                    <span style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      display: 'block',
                    }} />
                  ) : (
                    <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20" style={{ width: 16, height: 16, transform: 'rotate(90deg)', color: 'white' }}>
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
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
