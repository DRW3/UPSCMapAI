// components/journey/desktop/shell/DesktopMentorDock.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

interface Props {
  state: JourneyStateValue
  inline?: boolean
}

export function DesktopMentorDock({ state, inline }: Props) {
  const { dailyTip, progress, profile } = state
  const [messages, setMessages] = useState<Array<{ role: 'mentor' | 'user', text: string }>>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // When dailyTip arrives, set it as the first mentor message (only once)
  useEffect(() => {
    if (dailyTip && messages.length === 0) {
      setMessages([{ role: 'mentor', text: dailyTip }])
    }
  }, [dailyTip]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = chatContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setSending(true)
    try {
      const res = await fetch('/api/journey/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          context: {
            streak: progress.streak ?? 0,
            name: profile?.name?.split(' ')[0] ?? '',
          },
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'mentor', text: data.answer ?? "I couldn't process that. Try again!" }])
    } catch {
      setMessages(prev => [...prev, { role: 'mentor', text: "Something went wrong. Try again!" }])
    } finally {
      setSending(false)
    }
  }

  return (
    <aside
      style={{
        height: inline ? 'auto' : '100%',
        padding: '24px 18px',
        borderLeft: '1px solid rgba(167,139,250,0.08)',
        background: 'rgba(5,5,16,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      {/* Header — compact sparkle for inline, full orb for dock */}
      {inline ? (
        // Inline (Today tab): tiny sparkle icon + label in one tight row
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="mentor-sparkle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M12 2L13.5 9L21 10.5L13.5 12L12 19L10.5 12L3 10.5L10.5 9L12 2Z" fill="url(#mentor-sparkle)" />
          </svg>
          <span style={{
            fontSize: 11, fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Mentor&apos;s Suggestion
          </span>
        </div>
      ) : (
        // Dock (other tabs): full 56px orb + label
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 8,
          flexShrink: 0,
        }}>
          {/* Mini orb — 56px */}
          <div style={{
            position: 'relative',
            width: 56, height: 56,
            flexShrink: 0,
          }}>
            {/* Outer rotating ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
              animation: 'dj-rotate 10s linear infinite',
              padding: 1.5,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#050510' }} />
            </div>
            {/* Core */}
            <div style={{
              position: 'absolute', inset: '14%', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #e0e7ff 0%, #818cf8 35%, #4338ca 80%, #1e1b4b 100%)',
              boxShadow: '0 0 20px rgba(99,102,241,0.50)',
              animation: 'dj-corePulse 2.2s ease-in-out infinite',
            }} />
            {/* Bright center */}
            <div style={{
              position: 'absolute', inset: '36%', borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 10px rgba(255,255,255,0.95)',
            }} />
          </div>

          {/* Label */}
          <div>
            <div style={{
              fontSize: 13, fontWeight: 800,
              background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}>
              Your AI Mentor
            </div>
            <div style={{
              fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.40)',
              marginTop: 2,
            }}>
              Always here to guide you
            </div>
          </div>
        </div>
      )}

      {/* Chat bubble with animated border — inspired by mobile MentorsSuggestion */}
      {(() => {
        const isThinking = sending || (messages.length === 0 && !dailyTip)
        return (
          <div style={{
            position: 'relative',
            borderRadius: 18,
            padding: 1.5,
            background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #ec4899, #06b6d4, #a78bfa, #6366f1)',
            animation: `dj-rotate 8s linear infinite${isThinking ? ', dj-pulse 1.6s ease-in-out infinite' : ''}`,
            flex: '0 1 auto',
            maxHeight: 'min(340px, 40vh)',
          }}>
            {/* Outer glow */}
            <div style={{
              position: 'absolute', inset: -6, borderRadius: 24,
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18), transparent 70%)',
              filter: 'blur(12px)', pointerEvents: 'none', zIndex: -1,
              opacity: isThinking ? 0.9 : 0.4,
              transition: 'opacity 600ms ease',
            }} />

            {/* Inner card */}
            <div
              ref={chatContainerRef}
              style={{
                position: 'relative',
                background: 'linear-gradient(180deg, rgba(10,10,16,0.97) 0%, rgba(6,6,12,0.99) 100%)',
                borderRadius: 16.5,
                padding: '12px 14px',
                overflowY: 'auto',
                maxHeight: '100%',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              {/* Scan line when thinking */}
              {isThinking && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent)',
                  animation: 'dj-scanX 3s ease-in-out infinite',
                  pointerEvents: 'none', zIndex: 1,
                }} />
              )}

              {messages.length === 0 && !dailyTip && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: 'rgba(255,255,255,0.40)',
                  fontSize: 12,
                  padding: '10px 14px',
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '2px solid rgba(167,139,250,0.20)',
                    borderTopColor: '#a78bfa',
                    animation: 'dj-rotate 0.8s linear infinite',
                    flexShrink: 0,
                  }} />
                  Mentor is thinking…
                </div>
              )}
              {messages.map((msg, i) => (
                msg.role === 'mentor' ? (
                  // Mentor messages: plain text, no bubble — just the label + text
                  <div key={i} style={{
                    fontSize: 12.5, lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.78)',
                    padding: '4px 2px',
                  }}>
                    {i === 0 && (
                      <div style={{
                        fontSize: 9, fontWeight: 800,
                        color: '#a78bfa',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}>
                        AI Mentor
                      </div>
                    )}
                    {msg.text}
                  </div>
                ) : (
                  // User messages: keep the chat bubble
                  <div key={i} style={{
                    padding: '10px 14px',
                    borderRadius: '14px 14px 4px 14px',
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.30)',
                    alignSelf: 'flex-end',
                    maxWidth: '92%',
                    fontSize: 12.5, lineHeight: 1.55,
                    color: 'rgba(255,255,255,0.90)',
                  }}>
                    {msg.text}
                  </div>
                )
              ))}
            </div>
          </div>
        )
      })()}

      {/* Chat input */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '10px 0 6px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Ask your mentor..."
          disabled={sending}
          style={{
            flex: 1, minWidth: 0,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(167,139,250,0.20)',
            color: '#fff',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: sending || !input.trim() ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.30)',
            border: '1px solid rgba(99,102,241,0.30)',
            color: sending || !input.trim() ? 'rgba(255,255,255,0.30)' : '#a5b4fc',
            fontSize: 12, fontWeight: 700,
            cursor: sending || !input.trim() ? 'default' : 'pointer',
          }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>

    </aside>
  )
}
