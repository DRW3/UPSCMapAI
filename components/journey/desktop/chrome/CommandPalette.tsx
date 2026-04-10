// components/journey/desktop/chrome/CommandPalette.tsx
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

interface Props {
  open: boolean
  onClose: () => void
  state: JourneyStateValue
}

interface PaletteItem {
  id: string
  icon: string
  label: string
  hint: string
  group: 'action' | 'subject' | 'topic'
  onSelect: () => void
}

export default function CommandPalette({ open, onClose, state }: Props) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Build all items once
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = []

    // ── Tab actions ──────────────────────────────────────────────
    items.push({
      id: 'action-today',
      icon: '☀️',
      label: 'Today',
      hint: "Go to today's dashboard",
      group: 'action',
      onSelect: () => { state.setActiveTab('home'); onClose() },
    })
    items.push({
      id: 'action-syllabus',
      icon: '🗺️',
      label: 'Syllabus',
      hint: 'Browse learning path',
      group: 'action',
      onSelect: () => { state.setActiveTab('path'); onClose() },
    })
    items.push({
      id: 'action-practice',
      icon: '⚡',
      label: 'Practice',
      hint: 'Timed mock questions',
      group: 'action',
      onSelect: () => { state.setActiveTab('practice'); onClose() },
    })
    items.push({
      id: 'action-profile',
      icon: '👤',
      label: 'Profile',
      hint: 'Your progress & settings',
      group: 'action',
      onSelect: () => { state.setActiveTab('profile'); onClose() },
    })
    items.push({
      id: 'action-maps',
      icon: '🌐',
      label: 'Maps',
      hint: 'Open AI Map tool',
      group: 'action',
      onSelect: () => { window.location.href = '/map'; onClose() },
    })

    // ── Subjects ─────────────────────────────────────────────────
    for (const subject of UPSC_SYLLABUS) {
      items.push({
        id: `subject-${subject.id}`,
        icon: subject.icon,
        label: subject.shortTitle,
        hint: subject.paper,
        group: 'subject',
        onSelect: () => {
          state.setActiveTab('path')
          state.setActiveSubjectId(subject.id)
          onClose()
        },
      })
    }

    // ── Topics ───────────────────────────────────────────────────
    for (const subject of UPSC_SYLLABUS) {
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          items.push({
            id: `topic-${topic.id}`,
            icon: topic.icon,
            label: topic.title,
            hint: subject.shortTitle,
            group: 'topic',
            onSelect: () => {
              state.handleNodeTap(topic.id, topic, subject)
              onClose()
            },
          })
        }
      }
    }

    return items
  }, [state, onClose])

  // Filter results
  const results = useMemo<PaletteItem[]>(() => {
    if (!query.trim()) return allItems.slice(0, 30)
    const q = query.toLowerCase()
    return allItems
      .filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q)
      )
      .slice(0, 60)
  }, [allItems, query])

  // Reset cursor when query changes
  useEffect(() => {
    setCursor(0)
  }, [query])

  // Focus input on open; clear query on close
  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor(c => Math.min(c + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor(c => Math.max(c - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        results[cursor]?.onSelect()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, cursor, results, onClose])

  // Scroll active row into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const active = list.children[cursor] as HTMLElement | undefined
    active?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  const groupLabel: Record<PaletteItem['group'], string> = {
    action: 'Action',
    subject: 'Subject',
    topic: 'Topic',
  }

  const groupColor: Record<PaletteItem['group'], string> = {
    action:  'rgba(99,102,241,0.25)',
    subject: 'rgba(167,139,250,0.20)',
    topic:   'rgba(52,211,153,0.18)',
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(2,4,12,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      {/* Modal wrapper — rotating conic border */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          borderRadius: 18,
          padding: 1.5,
          background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
          animation: 'dj-rotate 12s linear infinite, dj-paletteIn 280ms cubic-bezier(0.16,1,0.3,1) both',
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* Inner panel */}
        <div
          style={{
            background: '#08081e',
            borderRadius: 16.5,
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search topics, subjects, actions…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e8e8f0',
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: '2px 7px',
                }}
              >
                ✕
              </button>
            )}
            <kbd style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5,
              color: 'rgba(255,255,255,0.40)',
              fontSize: 11,
              padding: '2px 6px',
              fontFamily: 'inherit',
            }}>
              esc
            </kbd>
          </div>

          {/* Results list */}
          <ul
            ref={listRef}
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '6px 0',
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            {results.length === 0 && (
              <li style={{
                padding: '24px 18px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.30)',
                fontSize: 13,
              }}>
                No results for &ldquo;{query}&rdquo;
              </li>
            )}
            {results.map((item, i) => (
              <li
                key={item.id}
                onClick={item.onSelect}
                onMouseEnter={() => setCursor(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 18px',
                  cursor: 'pointer',
                  background: i === cursor
                    ? 'rgba(167,139,250,0.12)'
                    : 'transparent',
                  transition: 'background 80ms',
                }}
              >
                {/* Icon */}
                <span style={{
                  fontSize: 18,
                  width: 28,
                  textAlign: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </span>

                {/* Label + hint */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#e8e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.40)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.hint}
                  </div>
                </div>

                {/* Group badge */}
                <span style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.50)',
                  background: groupColor[item.group],
                  borderRadius: 5,
                  padding: '2px 7px',
                }}>
                  {groupLabel[item.group]}
                </span>
              </li>
            ))}
          </ul>

          {/* Footer hint */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '8px 18px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}>
            {[
              ['↑↓', 'navigate'],
              ['↵', 'select'],
              ['esc', 'close'],
            ].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <kbd style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 4,
                  color: 'rgba(255,255,255,0.40)',
                  fontSize: 11,
                  padding: '1px 5px',
                  fontFamily: 'inherit',
                }}>
                  {key}
                </kbd>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>{label}</span>
              </span>
            ))}
            <span style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'rgba(255,255,255,0.20)',
            }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
