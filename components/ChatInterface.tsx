'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMapStore } from '@/lib/map/map-store'
import type { MapOperation, MapSession } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
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

// ── Inline session chip (compact, used inside chat thread) ────────────────────

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

// ── Full session card (used in Maps tab) ──────────────────────────────────────

function SessionCard({ session, isActive, onLoad }: {
  session: MapSession
  isActive: boolean
  onLoad: () => void
}) {
  const color = getMapTypeColor(session.mapType)
  return (
    <button
      onClick={onLoad}
      className="w-full text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] group"
      style={{
        background: isActive ? `${color}14` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isActive ? `0 0 0 1px ${color}22, 0 4px 20px ${color}14` : 'none',
      }}
    >
      {/* Top colour bar */}
      <div style={{ height: 2.5, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div className="p-3">
        {/* Icon + title row */}
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

        {/* Query preview */}
        <p className="text-[11px] text-white/35 leading-relaxed truncate mb-2.5 italic">
          &ldquo;{session.query}&rdquo;
        </p>

        {/* Footer */}
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

// ── Reasoning steps shown while the AI processes ─────────────────────────────

const INIT_STEPS = [
  'Reading your question…',
  'Finding the right map for this…',
  'Looking up the geography & history…',
  'Matching topics with UPSC syllabus…',
  'Getting the map ready…',
]

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

  // Auto-send query from URL ?q= param (used when navigating from dashboard)
  const searchParams = useSearchParams()
  const autoQueryFiredRef = useRef(false)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !autoQueryFiredRef.current && !isLoading) {
      autoQueryFiredRef.current = true
      sendMessageRef.current(decodeURIComponent(q))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingMessage || isLoading) return
    sendMessageRef.current(pendingMessage)
    setPendingMessage(null)
  }, [pendingMessage, isLoading, setPendingMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Switch to chat tab when a new message arrives
  useEffect(() => {
    if (messages.length > 1) setActiveTab('chat')
  }, [messages.length])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMsg: Message      = { id: Date.now().toString(), role: 'user', content: text }
    const assistantMsgId        = `${Date.now()}-assistant`
    const loadingMsg: Message   = { id: assistantMsgId, role: 'assistant', content: '', isLoading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)
    clearMapData()
    setSidebarLoading(true)
    startStepCycle()

    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok || !response.body) throw new Error(`API error: ${response.status}`)

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let sidebarText   = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const event = JSON.parse(data)
            if (event.type === 'map_operation') {
              const op = event.operation as MapOperation
              applyOperation(op)
              if (op.op === 'full_replace') {
                jumpStep(`Drawing the map…`)
              } else if (op.op === 'add_markers') {
                jumpStep(`Pinning ${op.points.length} important place${op.points.length !== 1 ? 's' : ''}…`)
              }
            } else if (event.type === 'chat_text') {
              stopSteps()
              assistantText = event.text
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: assistantText, isLoading: false } : m
              ))
            } else if (event.type === 'chat_text_append') {
              stopSteps()
              assistantText += event.text
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: assistantText, isLoading: false } : m
              ))
            } else if (event.type === 'sidebar_text') {
              if (!sidebarText) jumpStep('Writing your study notes…')
              sidebarText += event.text
              setSidebarContent(sidebarText)
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
                  sidebarContent: sidebarText,
                })
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId ? { ...m, sessionId } : m
                ))
              }
            } else if (event.type === 'error') {
              throw new Error(event.message)
            }
          } catch { /* non-JSON line */ }
        }
      }

      if (!assistantText) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: 'Your map is ready — open the notes panel on the right to read the study material.', isLoading: false }
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
    <div className="h-full flex flex-col bg-[#0a0e1a]" id="chat-interface">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Brand row */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm flex-shrink-0">
              🗺
            </div>
            <p className="text-sm font-semibold text-white leading-none">UPSC Map AI</p>
          </div>
          <button
            onClick={() => {
              resetMap()
              setMessages([{ id: 'welcome', role: 'assistant', content: 'All cleared. What topic do you want to study next?' }])
              setActiveTab('chat')
            }}
            className="text-[11px] text-white/30 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-3 pb-0 flex gap-1">
          {(
            [
              { id: 'chat' as Tab, label: 'Chat',   icon: (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5.5 1C3.02 1 1 2.79 1 5c0 .78.24 1.5.65 2.1L1 10l3.1-.62A4.8 4.8 0 005.5 9.5c2.48 0 4.5-2.02 4.5-4.5S7.98 1 5.5 1z"/>
                </svg>
              )},
              { id: 'maps' as Tab, label: 'Maps',   badge: sessions.length || undefined, icon: (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 2.5l3-1.5 3 1.5 3-1.5V9l-3 1.5-3-1.5-3 1.5V2.5z"/>
                  <path d="M4 1v8M7 2.5v8"/>
                </svg>
              )},
            ] as { id: Tab; label: string; badge?: number; icon: React.ReactNode }[]
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-semibold transition-all"
              style={{
                color: activeTab === tab.id ? 'rgba(165,180,252,1)' : 'rgba(255,255,255,0.3)',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid rgba(99,102,241,0.7)' : '2px solid transparent',
              }}
            >
              <span style={{ color: activeTab === tab.id ? 'rgba(165,180,252,0.8)' : 'rgba(255,255,255,0.25)' }}>
                {tab.icon}
              </span>
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="ml-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
                  style={{
                    background: activeTab === tab.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.1)',
                    color: activeTab === tab.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin">
            {messages.map(msg => {
              const linkedSession = msg.sessionId
                ? sessions.find(s => s.id === msg.sessionId)
                : null
              return (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2 w-full`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600/80 border border-indigo-500/40 flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">
                        ✦
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-white/[0.06] text-gray-200 border border-white/[0.08] rounded-tl-sm'
                      }`}
                    >
                      {msg.isLoading ? (
                        <div className="flex items-center gap-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                          <span className="text-[12px] text-indigo-300/70 italic leading-snug">
                            {reasoningStep}
                          </span>
                        </div>
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                      )}
                    </div>
                  </div>

                  {/* Inline map chip — appears below assistant message */}
                  {linkedSession && (
                    <div className="w-full pl-8 mt-0">
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
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider font-medium">Popular topics</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUERIES.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-[11px] bg-white/[0.05] hover:bg-indigo-600/20 border border-white/[0.08] hover:border-indigo-500/40 text-white/60 hover:text-indigo-300 rounded-lg px-2.5 py-1.5 transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any UPSC topic… (Enter to send)"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl bg-white/[0.06] border border-white/[0.1] focus:border-indigo-500/60 focus:bg-white/[0.08] px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-40 leading-relaxed transition-all max-h-28"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-lg shadow-indigo-900/40"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Maps tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'maps' && (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {sessions.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-2xl mb-4">
                🗺️
              </div>
              <p className="text-[13px] font-semibold text-white/40">No maps studied yet</p>
              <p className="text-[11px] text-white/20 mt-2 leading-relaxed">
                Every question you ask creates a map you can come back to — like bookmarked study material.
              </p>
              <button
                onClick={() => setActiveTab('chat')}
                className="mt-5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition-colors"
              >
                Go to Chat
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">
                  {sessions.length} topic{sessions.length !== 1 ? 's' : ''} studied
                </p>
              </div>
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
  )
}

export default function ChatInterface() {
  return (
    <Suspense fallback={<div className="h-full bg-[#0a0e1a]" />}>
      <ChatInterfaceInner />
    </Suspense>
  )
}
