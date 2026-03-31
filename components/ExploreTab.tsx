'use client'

import React, { useState } from 'react'
import type { MapSession } from '@/types'

// ── Popular topics organized by category ────────────────────────────────────

interface TopicItem {
  icon: string
  label: string
  query: string
}

interface TopicSection {
  title: string
  color: string
  emoji: string
  topics: TopicItem[]
}

const SECTIONS: TopicSection[] = [
  {
    title: 'Physical Geography',
    color: '#2980b9',
    emoji: '🏔️',
    topics: [
      { icon: '🏔️', label: 'Himalayan Passes', query: 'Important Himalayan passes for UPSC' },
      { icon: '💧', label: 'Rivers of India', query: 'Major rivers of India and their tributaries' },
      { icon: '⛰️', label: 'Western & Eastern Ghats', query: 'Western and Eastern Ghats mountain ranges' },
      { icon: '🌧️', label: 'Monsoon Patterns', query: 'Indian monsoon patterns and rainfall distribution' },
      { icon: '🏝️', label: 'Islands of India', query: 'Andaman Nicobar and Lakshadweep islands' },
      { icon: '🌊', label: 'Ocean Currents', query: 'Major ocean currents of the world' },
    ],
  },
  {
    title: 'Ancient & Medieval History',
    color: '#e07b39',
    emoji: '🏛️',
    topics: [
      { icon: '🏺', label: 'Indus Valley Sites', query: 'Indus Valley Civilisation sites — Harappa, Mohenjo-daro, Lothal, Dholavira' },
      { icon: '⚔️', label: 'Mauryan Empire', query: 'Mauryan Empire at its peak under Ashoka' },
      { icon: '🏰', label: 'Gupta Empire', query: 'Gupta Empire extent and important centres' },
      { icon: '👑', label: 'Chola Dynasty', query: 'Chola Dynasty empire and maritime trade routes' },
      { icon: '🕌', label: 'Mughal Empire', query: 'Mughal Empire under Akbar — extent and major cities' },
      { icon: '🗡️', label: 'Maratha Empire', query: 'Maratha Empire expansion under Shivaji and Peshwas' },
    ],
  },
  {
    title: 'Modern History',
    color: '#e74c3c',
    emoji: '🇮🇳',
    topics: [
      { icon: '⚓', label: 'Battle of Plassey', query: 'Battle of Plassey 1757 and British expansion' },
      { icon: '🔥', label: 'Revolt of 1857', query: 'Revolt of 1857 major centres and leaders' },
      { icon: '🕊️', label: 'Freedom Movement', query: 'Indian freedom movement — major events and locations' },
      { icon: '✊', label: 'Gandhian Era', query: 'Gandhian movement — Champaran, Dandi, Quit India locations' },
    ],
  },
  {
    title: 'Economy & Resources',
    color: '#27ae60',
    emoji: '⛏️',
    topics: [
      { icon: '⛏️', label: 'Coal & Iron Ore', query: 'Coal and iron ore deposits in India' },
      { icon: '⚡', label: 'Nuclear Power Plants', query: 'Nuclear power plants in India' },
      { icon: '🚢', label: 'Major Ports', query: 'Major ports of India — 13 major ports' },
      { icon: '🛤️', label: 'Industrial Corridors', query: 'Industrial corridors — DMIC, CBIC, freight corridors' },
    ],
  },
  {
    title: 'Environment & Ecology',
    color: '#16a085',
    emoji: '🌿',
    topics: [
      { icon: '🐅', label: 'Tiger Reserves', query: 'Tiger reserves and Project Tiger in India' },
      { icon: '🦢', label: 'Ramsar Wetlands', query: 'Ramsar wetland sites in India' },
      { icon: '🌳', label: 'Biosphere Reserves', query: 'Biosphere reserves of India' },
      { icon: '🌍', label: 'Earthquake Zones', query: 'Seismic zones of India — earthquake vulnerability map' },
    ],
  },
  {
    title: 'Geopolitics',
    color: '#8e44ad',
    emoji: '🌐',
    topics: [
      { icon: '🗺️', label: 'Border Disputes', query: 'India border disputes — LAC, LOC, McMahon Line' },
      { icon: '🚪', label: 'Strategic Straits', query: 'Important straits and chokepoints of the world' },
      { icon: '🤝', label: 'India & Neighbours', query: 'India and its neighboring countries — borders and relations' },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function ExploreTab({
  sessions,
  activeSessionId,
  onSendMessage,
  onLoadSession,
}: {
  sessions: MapSession[]
  activeSessionId: string | null
  onSendMessage: (text: string) => void
  onLoadSession: (id: string) => void
}) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: '12px 14px' }}>

      {/* ── Section Filter ── */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveSection(null)}
          style={{
            padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
            background: !activeSection ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${!activeSection ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: !activeSection ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
            whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
          }}
        >
          All
        </button>
        {SECTIONS.map(s => (
          <button
            key={s.title}
            onClick={() => setActiveSection(activeSection === s.title ? null : s.title)}
            style={{
              padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: activeSection === s.title ? `${s.color}20` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeSection === s.title ? `${s.color}55` : 'rgba(255,255,255,0.08)'}`,
              color: activeSection === s.title ? s.color : 'rgba(255,255,255,0.4)',
              whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 12 }}>{s.emoji}</span>
            {s.title.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* ── Topic Grid ── */}
      {SECTIONS.filter(s => !activeSection || s.title === activeSection).map(section => (
        <div key={section.title} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 8, paddingLeft: 2,
          }}>
            <span style={{
              width: 3, height: 14, borderRadius: 2,
              background: section.color,
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {section.title}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 6,
          }}>
            {section.topics.map(topic => (
              <button
                key={topic.label}
                onClick={() => onSendMessage(topic.query)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 10px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${section.color}14`
                  e.currentTarget.style.borderColor = `${section.color}40`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                }}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${section.color}15`,
                  border: `1px solid ${section.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {topic.icon}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: 1.3,
                }}>
                  {topic.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* ── Your Maps ── */}
      {sessions.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 10, paddingLeft: 2,
          }}>
            <span style={{
              width: 3, height: 14, borderRadius: 2,
              background: '#6366f1',
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Your Maps
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
              padding: '2px 6px', borderRadius: 6,
            }}>
              {sessions.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sessions.map(session => {
              const color = getMapTypeColor(session.mapType)
              const isActive = session.id === activeSessionId
              return (
                <button
                  key={session.id}
                  onClick={() => onLoadSession(session.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: isActive ? `${color}14` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? `${color}45` : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: `${color}18`, border: `1px solid ${color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, flexShrink: 0,
                  }}>
                    {getMapTypeEmoji(session.mapType)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, fontWeight: 600,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {session.title}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                      {formatTimeAgo(session.timestamp)}
                    </p>
                  </div>
                  {isActive && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color, padding: '2px 6px',
                      borderRadius: 6, background: `${color}20`,
                    }}>
                      Active
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}
