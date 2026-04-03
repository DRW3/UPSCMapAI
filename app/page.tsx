'use client'

import Link from 'next/link'
import { useState } from 'react'

// ── Curated UPSC map catalogue ────────────────────────────────────────────────

interface MapCard {
  title: string
  description: string
  query: string
  icon: string
  color: string
  tags: string[]
}

interface MapSection {
  id: string
  label: string
  gs: string
  gsColor: string
  cards: MapCard[]
}

const CATALOGUE: MapSection[] = [
  {
    id: 'physical',
    label: 'Physical Geography',
    gs: 'GS-I',
    gsColor: '#2980b9',
    cards: [
      {
        title: 'Rivers of India',
        description: 'Major river systems, tributaries, and drainage basins across India.',
        query: 'Show all major rivers of India with their tributaries and drainage basins',
        icon: '🌊',
        color: '#2980b9',
        tags: ['Prelims', 'Mains'],
      },
      {
        title: 'Himalayan Ranges & Passes',
        description: 'Great Himalayas, Karakoram, and strategic passes like Nathu La, Shipki La.',
        query: 'Show Himalayan mountain ranges and all important passes of India for UPSC',
        icon: '⛰️',
        color: '#5a7bb5',
        tags: ['Prelims', 'Geography'],
      },
      {
        title: 'Western & Eastern Ghats',
        description: 'Biodiversity hotspots, peaks, rivers, and their UPSC significance.',
        query: 'Show Western Ghats and Eastern Ghats of India with major peaks and rivers',
        icon: '🌿',
        color: '#27ae60',
        tags: ['Prelims', 'Environment'],
      },
      {
        title: 'Soil Types of India',
        description: 'Alluvial, black, red, laterite, arid, and forest soils across regions.',
        query: 'Show different soil types of India — alluvial, black cotton, red, laterite, arid soils',
        icon: '🏜️',
        color: '#b07050',
        tags: ['Prelims', 'Agriculture'],
      },
      {
        title: 'Climate Zones of India',
        description: 'Koppen climate zones, monsoon patterns, and rainfall distribution.',
        query: 'Show climate zones and monsoon rainfall distribution of India',
        icon: '🌧️',
        color: '#0891b2',
        tags: ['Prelims', 'Geography'],
      },
      {
        title: 'Deccan Plateau',
        description: 'Peninsular India\'s plateau geography, rivers, and physical features.',
        query: 'Show the physical geography of Deccan Plateau with rivers and major features',
        icon: '🏔️',
        color: '#8a6a4a',
        tags: ['GS-I', 'Geography'],
      },
    ],
  },
  {
    id: 'history',
    label: 'Ancient & Medieval History',
    gs: 'GS-I',
    gsColor: '#e07b39',
    cards: [
      {
        title: 'Mauryan Empire',
        description: 'Chandragupta to Ashoka — India\'s first pan-Indian empire at its peak.',
        query: 'Show the Mauryan Empire under Ashoka with provinces, capitals, and rock edicts',
        icon: '🦁',
        color: '#e07b39',
        tags: ['Mains', 'Ancient'],
      },
      {
        title: 'Gupta Empire',
        description: 'The Golden Age of India — territory, trade routes, and cultural centres.',
        query: 'Show the Gupta Empire at its peak with major kingdoms, universities, and trade routes',
        icon: '☸️',
        color: '#c4953a',
        tags: ['Mains', 'Ancient'],
      },
      {
        title: 'Mughal Empire',
        description: 'From Babur to Aurangzeb — territorial expansion, battles, and capitals.',
        query: 'Show the Mughal Empire at its peak under Aurangzeb with provinces and major battles',
        icon: '🕌',
        color: '#7c5cba',
        tags: ['Mains', 'Medieval'],
      },
      {
        title: 'Maratha Empire',
        description: 'Shivaji to the Peshwas — the rise of the Maratha confederacy.',
        query: 'Show the Maratha Empire extent under the Peshwas with key battles and forts',
        icon: '⚔️',
        color: '#e06c5a',
        tags: ['Mains', 'Medieval'],
      },
      {
        title: 'Vijayanagara Empire',
        description: 'South India\'s powerful Hindu kingdom — from Hampi to the Battle of Talikota.',
        query: 'Show the Vijayanagara Empire with Hampi capital, territories, and important sites',
        icon: '🏛️',
        color: '#4a9e6e',
        tags: ['Mains', 'Medieval'],
      },
      {
        title: 'Ancient Trade Routes',
        description: 'Silk Road, maritime routes, and India\'s trade with Rome and Southeast Asia.',
        query: 'Show ancient Indian trade routes — Silk Road, maritime routes to Rome and Southeast Asia',
        icon: '🚢',
        color: '#0369a1',
        tags: ['GS-I', 'Ancient'],
      },
    ],
  },
  {
    id: 'colonial',
    label: 'Modern History & Freedom Struggle',
    gs: 'GS-I',
    gsColor: '#c0392b',
    cards: [
      {
        title: 'British India 1857',
        description: 'Colonial territory at the time of the First War of Independence.',
        query: 'Show British India colonial territory in 1857 at the time of the Revolt',
        icon: '🏴',
        color: '#c0392b',
        tags: ['Mains', 'Colonial'],
      },
      {
        title: 'Revolt of 1857',
        description: 'Key centres of the revolt — Meerut, Delhi, Lucknow, Jhansi, Kanpur.',
        query: 'Show the 1857 Revolt of India with all key battle centres and leaders',
        icon: '🔥',
        color: '#e63946',
        tags: ['Prelims', 'Mains'],
      },
      {
        title: 'Partition of India 1947',
        description: 'Radcliffe Line, princely states integration, and new international borders.',
        query: 'Show the partition of India in 1947 — Radcliffe Line, Pakistan, and princely states',
        icon: '🗓️',
        color: '#8e44ad',
        tags: ['Mains', 'Modern'],
      },
    ],
  },
  {
    id: 'political',
    label: 'Political Geography',
    gs: 'GS-II',
    gsColor: '#4f46e5',
    cards: [
      {
        title: 'India Political Map',
        description: 'All 28 states and 8 union territories with capitals.',
        query: 'Show India political map with all states union territories and their capitals',
        icon: '🗺️',
        color: '#4f46e5',
        tags: ['Prelims', 'Must-Know'],
      },
      {
        title: 'India\'s Neighbors',
        description: 'International borders with Pakistan, China, Bangladesh, and other neighbors.',
        query: 'Show India international borders and all neighboring countries with capitals',
        icon: '🌍',
        color: '#6d28d9',
        tags: ['Prelims', 'IR'],
      },
      {
        title: 'Northeast India',
        description: 'The Seven Sisters + Sikkim — states, capitals, and strategic significance.',
        query: 'Show northeast India seven sisters states with capitals and international borders',
        icon: '🏞️',
        color: '#0891b2',
        tags: ['Prelims', 'Geography'],
      },
      {
        title: 'Indian Ocean Region',
        description: 'India\'s maritime boundary, EEZ, island territories, and strategic chokepoints.',
        query: 'Show India maritime boundary EEZ Andaman Nicobar Lakshadweep and Indian Ocean',
        icon: '⚓',
        color: '#0369a1',
        tags: ['GS-II', 'IR'],
      },
    ],
  },
  {
    id: 'economic',
    label: 'Economic Geography',
    gs: 'GS-III',
    gsColor: '#27ae60',
    cards: [
      {
        title: 'Mineral Resources',
        description: 'Coal, iron ore, bauxite, copper, and manganese deposit locations.',
        query: 'Show coal iron ore bauxite copper and mineral deposits of India',
        icon: '⛏️',
        color: '#5d4037',
        tags: ['Prelims', 'Economy'],
      },
      {
        title: 'Major Ports of India',
        description: '13 major ports — from Kandla to Kolkata — and their trade significance.',
        query: 'Show all major ports of India with their location and trade significance',
        icon: '🚢',
        color: '#0369a1',
        tags: ['Prelims', 'Trade'],
      },
      {
        title: 'Agricultural Zones',
        description: 'Rice, wheat, cotton, sugarcane, and other crop-growing regions.',
        query: 'Show major agricultural zones of India — rice wheat cotton sugarcane jute regions',
        icon: '🌾',
        color: '#65a30d',
        tags: ['Prelims', 'Agriculture'],
      },
      {
        title: 'Major Dams of India',
        description: 'Bhakra Nangal, Hirakud, Sardar Sarovar — India\'s major dam projects.',
        query: 'Show all major dams of India with rivers and states',
        icon: '🏗️',
        color: '#2c3e50',
        tags: ['Prelims', 'Infrastructure'],
      },
      {
        title: 'National Highways',
        description: 'Golden Quadrilateral, North-South East-West corridors, and major NHs.',
        query: 'Show major national highways of India — Golden Quadrilateral and key corridors',
        icon: '🛣️',
        color: '#f39c12',
        tags: ['Prelims', 'Infrastructure'],
      },
      {
        title: 'Industrial Regions',
        description: 'Mumbai-Pune, Delhi-Meerut, Chota Nagpur, and other industrial belts.',
        query: 'Show major industrial regions and corridors of India',
        icon: '🏭',
        color: '#7f8c8d',
        tags: ['GS-III', 'Economy'],
      },
    ],
  },
  {
    id: 'environment',
    label: 'Environment & Ecology',
    gs: 'GS-III',
    gsColor: '#16a085',
    cards: [
      {
        title: 'Tiger Reserves',
        description: 'All Project Tiger reserves — from Jim Corbett to Sundarbans.',
        query: 'Show all tiger reserves of India under Project Tiger',
        icon: '🐯',
        color: '#e67e22',
        tags: ['Prelims', 'Environment'],
      },
      {
        title: 'National Parks',
        description: 'India\'s 106 national parks across all biographic zones.',
        query: 'Show all national parks of India',
        icon: '🌿',
        color: '#27ae60',
        tags: ['Prelims', 'Environment'],
      },
      {
        title: 'Ramsar Wetlands',
        description: 'India\'s internationally recognised wetlands of importance.',
        query: 'Show all Ramsar wetland sites of India',
        icon: '🦢',
        color: '#2980b9',
        tags: ['Prelims', 'Environment'],
      },
      {
        title: 'Biosphere Reserves',
        description: 'UNESCO-recognised biosphere reserves and biodiversity hotspots.',
        query: 'Show all UNESCO biosphere reserves of India',
        icon: '🌍',
        color: '#16a085',
        tags: ['Prelims', 'Environment'],
      },
      {
        title: 'Disaster Prone Zones',
        description: 'Earthquake, flood, cyclone, and drought-vulnerable regions of India.',
        query: 'Show disaster prone zones of India — earthquake cyclone flood drought areas',
        icon: '⚠️',
        color: '#e74c3c',
        tags: ['Prelims', 'Disaster Mgmt'],
      },
    ],
  },
  {
    id: 'prelims',
    label: 'Prelims Special',
    gs: 'Prelims',
    gsColor: '#d97706',
    cards: [
      {
        title: 'Nuclear Power Plants',
        description: 'All operational nuclear plants — Tarapur, Kudankulam, Rawatbhata and more.',
        query: 'Show all nuclear power plants of India',
        icon: '⚛️',
        color: '#e74c3c',
        tags: ['Prelims', 'Energy'],
      },
      {
        title: 'IIT Locations',
        description: 'All Indian Institutes of Technology across the country.',
        query: 'Show all IIT colleges in India with their locations',
        icon: '🎓',
        color: '#8e44ad',
        tags: ['Prelims', 'Education'],
      },
      {
        title: 'Thermal Power Plants',
        description: 'Major coal-based and thermal power stations of India.',
        query: 'Show major thermal power plants of India',
        icon: '🏭',
        color: '#7f8c8d',
        tags: ['Prelims', 'Energy'],
      },
      {
        title: 'Hydroelectric Projects',
        description: 'Major hydel projects — Tehri, Bhakra, Koyna and other power stations.',
        query: 'Show major hydroelectric power projects of India',
        icon: '💧',
        color: '#3498db',
        tags: ['Prelims', 'Energy'],
      },
    ],
  },
]

// ── Small helper: encode query for URL ────────────────────────────────────────

function encodeQuery(q: string) {
  return encodeURIComponent(q)
}

// ── MapCard component ─────────────────────────────────────────────────────────

function MapCardItem({ card }: { card: MapCard }) {
  const [hovered, setHovered] = useState(false)
  const href = `/map?q=${encodeQuery(card.query)}`

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: hovered ? `${card.color}12` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? `${card.color}50` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? `0 8px 32px ${card.color}18, 0 0 0 1px ${card.color}28` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 2.5, background: `linear-gradient(90deg, ${card.color}, ${card.color}55)` }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Icon + title */}
        <div className="flex items-start gap-3 mb-2.5">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${card.color}18`, border: `1px solid ${card.color}35` }}
          >
            {card.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-white/90 leading-snug">{card.title}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {card.tags.map(t => (
                <span
                  key={t}
                  className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
                  style={{ background: `${card.color}18`, color: `${card.color}cc` }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed flex-1">{card.description}</p>

        {/* Open button */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold transition-colors"
            style={{ color: hovered ? card.color : 'rgba(255,255,255,0.25)' }}>
            Open on Map →
          </span>
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: hovered ? `${card.color}22` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${hovered ? `${card.color}50` : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={hovered ? card.color : 'rgba(255,255,255,0.3)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5.5h7M6.5 3l2.5 2.5L6.5 8" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const visibleSections = activeSection
    ? CATALOGUE.filter(s => s.id === activeSection)
    : CATALOGUE

  const totalMaps = CATALOGUE.reduce((sum, s) => sum + s.cards.length, 0)

  return (
    <div className="min-h-screen bg-[#070b14] text-white overflow-y-auto scrollbar-thin">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5"
        style={{
          background: 'rgba(7,11,20,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-base flex-shrink-0">
            🗺️
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">PadhAI UPSC</p>
            <p className="text-[10px] text-white/30 leading-none mt-0.5">Learn geography visually</p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => setActiveSection(null)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: activeSection === null ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: activeSection === null ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${activeSection === null ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            All Maps
          </button>
          {CATALOGUE.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: activeSection === s.id ? `${s.gsColor}22` : 'rgba(255,255,255,0.05)',
                color: activeSection === s.id ? s.gsColor : 'rgba(255,255,255,0.4)',
                border: `1px solid ${activeSection === s.id ? `${s.gsColor}50` : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {s.gs !== 'Prelims' ? s.gs : 'Prelims'}
            </button>
          ))}
        </div>

        <Link
          href="/map"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-[12px] font-semibold text-white shadow-lg shadow-indigo-900/40"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 3l3.5-2L8 3l4.5-2V10.5L8 12.5 4.5 11 1 12.5V3z" />
            <path d="M4.5 1v10M8 3v9" />
          </svg>
          Open Map
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative px-6 pt-16 pb-14 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #6366f1 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6 text-[11px] font-semibold"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered · {totalMaps} Pre-built Maps · UPSC 2025–26
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            <span className="text-white">Study UPSC Geography</span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 40%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              with Interactive Maps
            </span>
          </h1>

          <p className="text-white/50 text-[15px] leading-relaxed mb-8 max-w-lg mx-auto">
            Every topic from the UPSC syllabus — visualised on a live map with AI-generated study notes.
            Click any map below, or ask your own question.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/map"
              className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[14px] font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
                <path d="M5 1.5v12M10 3.5v10" />
              </svg>
              Learn with Maps
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                <path d="M2 6h8M7 3l3 3-3 3" />
              </svg>
            </Link>

            <a
              href="#journey"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-semibold text-white/60 hover:text-white/90 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              🎯 Learning Journey
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 2v8M3 7l3 3 3-3" />
              </svg>
            </a>

            <a
              href="#maps"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-semibold text-white/60 hover:text-white/90 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Browse {totalMaps} Maps
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 2v8M3 7l3 3 3-3" />
              </svg>
            </a>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {[
              { value: `${totalMaps}+`, label: 'Ready Maps' },
              { value: 'GS I–IV', label: 'Full Syllabus' },
              { value: '100+', label: 'Syllabus Topics' },
              { value: 'AI Notes', label: 'Per Topic' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold text-indigo-300">{stat.value}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Map catalogue ─────────────────────────────────────────────────── */}
      <div id="maps" className="max-w-7xl mx-auto px-4 md:px-6 pb-20">

        {/* Mobile section filter */}
        <div className="flex md:hidden gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setActiveSection(null)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: activeSection === null ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: activeSection === null ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${activeSection === null ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            All
          </button>
          {CATALOGUE.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: activeSection === s.id ? `${s.gsColor}22` : 'rgba(255,255,255,0.05)',
                color: activeSection === s.id ? s.gsColor : 'rgba(255,255,255,0.4)',
                border: `1px solid ${activeSection === s.id ? `${s.gsColor}50` : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {s.gs}
            </button>
          ))}
        </div>

        {visibleSections.map(section => (
          <div key={section.id} className="mb-12">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                style={{ background: `${section.gsColor}20`, color: section.gsColor, border: `1px solid ${section.gsColor}35` }}
              >
                {section.gs}
              </span>
              <h2 className="text-[16px] font-bold text-white/90">{section.label}</h2>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-[11px] text-white/25">{section.cards.length} maps</span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {section.cards.map(card => (
                <MapCardItem key={card.title} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Learning Journey CTA ──────────────────────────────────────────── */}
      <div
        id="journey"
        className="border-t border-white/[0.05] mt-4 py-16 px-4"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.04) 50%, rgba(99,102,241,0.07) 100%)' }}
      >
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.22)' }}>
            🎯 Learning Journey
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Master the{' '}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #a5b4fc, #6366f1)' }}>
              Entire Syllabus
            </span>
            <br />
            <span className="text-white/50 text-2xl font-semibold">topic by topic</span>
          </h2>
          <p className="text-white/40 text-[14px] max-w-sm">
            100+ topics across GS I–IV. Each opens an AI map with notes. Hover any topic to practice PYQs from 2011–2024.
          </p>
          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Duolingo-style path', 'PYQ Practice', 'AI Maps', 'Streak tracking', '100+ topics'].map(f => (
              <span key={f} className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {f}
              </span>
            ))}
          </div>
          <Link
            href="/journey"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-[14px] font-bold text-white transition-all hover:scale-[1.03] hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            }}
          >
            <span className="text-lg">🎯</span>
            Start Learning Journey
          </Link>
        </div>
      </div>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] py-14 px-6 text-center"
        style={{ background: 'rgba(99,102,241,0.04)' }}>
        <h2 className="text-2xl font-bold text-white mb-3">Don&apos;t see your topic?</h2>
        <p className="text-white/40 text-[14px] mb-7 max-w-md mx-auto">
          Ask anything — battles, rivers, empires, minerals, borders, disasters. The AI will build the map live.
        </p>
        <Link
          href="/map"
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-[14px] font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            boxShadow: '0 4px 24px rgba(99,102,241,0.3)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 3.5l4-2 5 2 4-2V12L10 14 5 12 1 14V3.5z" />
            <path d="M5 1.5v12M10 3.5v10" />
          </svg>
          Open the Map Interface
        </Link>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.04] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-white/20">
        <span>PadhAI UPSC · Built for serious aspirants</span>
        <span>Maps · Notes · AI · Free</span>
      </div>
    </div>
  )
}
