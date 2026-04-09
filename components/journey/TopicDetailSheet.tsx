'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import { getBooksForSubject, getNCERTsForSubject, getGovSourcesForSubject } from '@/data/book-recommendations'
import {
  type TopicProgress,
  type CrownLevel,
  type UserProfile,
  CROWN_COLORS,
  QUESTIONS_PER_CROWN,
} from './types'
import { getMainsFramework } from './mains-frameworks'

interface TopicDetailSheetProps {
  topic: LearningTopic
  subject: LearningSubject
  progress: TopicProgress
  profile: UserProfile | null
  // Total DB PYQs available for this topic. Used to render the
  // "X of Y PYQs attempted" line so the user can see exactly how many
  // unique questions remain.
  dbQuestionCount?: number
  onClose: () => void
  onStartPractice: () => void
  onOpenMap: (context?: string) => void
}

interface StudyNotes {
  summary: string
  keyPoints: string[]
  importantFacts: string[]
  upscRelevance: string
  connections: string
  // New engaging fields (optional for backward compat with cached notes)
  hook?: string
  timeline?: { year: string; event: string }[]
  comparison?: { title: string; headers: [string, string]; rows: [string, string][] } | null
  mnemonic?: string | null
  examTip?: string
  keyTakeaways?: string[]
  // Enriched content fields
  pyqTrends?: { year: string; pattern: string }[]
  answerFramework?: {
    introduction: string
    bodyPoints: string[]
    conclusion: string
    wordLimit?: string
  } | null
  caseStudies?: { title: string; detail: string }[]
  commonMistakes?: string[]
  sourceRecommendations?: { source: string; why: string }[]
  mindMap?: {
    central: string
    branches: { name: string; sub: string[] }[]
  } | null
}

export default function TopicDetailSheet({
  topic,
  subject,
  progress,
  profile,
  dbQuestionCount,
  onClose,
  onStartPractice,
  onOpenMap,
}: TopicDetailSheetProps) {
  const [visible, setVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  // Study notes state
  const [notes, setNotes] = useState<StudyNotes | null>(null)
  const [notesLoading, setNotesLoading] = useState(true)

  // Topic images from Wikipedia
  const [images, setImages] = useState<{ url: string; desc: string }[]>([])


  // Drag-to-dismiss
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)
  const isDragging = useRef(false)
  const [dragTranslate, setDragTranslate] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Active TOC section tracking
  const [activeTocSection, setActiveTocSection] = useState<string>('overview')
  const tocStripRef = useRef<HTMLDivElement>(null)

  // Section refs for TOC navigation
  const sectionRefs = {
    hook: useRef<HTMLDivElement>(null),
    overview: useRef<HTMLDivElement>(null),
    timeline: useRef<HTMLDivElement>(null),
    keyConcepts: useRef<HTMLDivElement>(null),
    comparison: useRef<HTMLDivElement>(null),
    quickFacts: useRef<HTMLDivElement>(null),
    examStrategy: useRef<HTMLDivElement>(null),
    mnemonic: useRef<HTMLDivElement>(null),
    pyqTrends: useRef<HTMLDivElement>(null),
    answerFramework: useRef<HTMLDivElement>(null),
    caseStudies: useRef<HTMLDivElement>(null),
    commonMistakes: useRef<HTMLDivElement>(null),
    sourceRecommendations: useRef<HTMLDivElement>(null),
    mindMap: useRef<HTMLDivElement>(null),
    keyTakeaways: useRef<HTMLDivElement>(null),
    connectedTopics: useRef<HTMLDivElement>(null),
  }

  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current
    const container = scrollContainerRef.current
    if (!el || !container) return

    // Get the sticky TOC height so we scroll past it
    const tocBar = container.querySelector<HTMLElement>('[data-toc]')?.closest<HTMLElement>('div[style*="sticky"]')
    const tocHeight = tocBar ? tocBar.offsetHeight : 0

    // Calculate target scroll position within the scroll container
    const elTop = el.getBoundingClientRect().top
    const containerTop = container.getBoundingClientRect().top
    const offset = elTop - containerTop + container.scrollTop - tocHeight - 8

    container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  // ── Restore scroll position after returning from /map ─────────────────
  // When a Visualize-on-Map CTA is fired, the button stashes the clicked
  // bullet's id in sessionStorage under 'upsc-map-return-anchor'. Once the
  // notes have rendered and the sheet is visible, scroll that exact bullet
  // back into view (matching the offset math used by scrollToSection so
  // the sticky TOC doesn't cover it). Then clear the entry so a fresh
  // visit doesn't accidentally re-trigger.
  useEffect(() => {
    if (!notes || !visible) return
    let anchor: string | null = null
    try { anchor = sessionStorage.getItem('upsc-map-return-anchor') } catch {}
    if (!anchor) return
    try { sessionStorage.removeItem('upsc-map-return-anchor') } catch {}

    // Wait for the staggered card-in animations + sheet slide-up to
    // settle so getBoundingClientRect reports the bullet's final position.
    const anchorId = anchor
    const t = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) return
      const el = container.querySelector(`#${anchorId}`) as HTMLElement | null
      if (!el) return
      const tocBar = container.querySelector<HTMLElement>('[data-toc]')?.closest<HTMLElement>('div[style*="sticky"]')
      const tocHeight = tocBar ? tocBar.offsetHeight : 0
      const elTop = el.getBoundingClientRect().top
      const containerTop = container.getBoundingClientRect().top
      const offset = elTop - containerTop + container.scrollTop - tocHeight - 16
      container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
    }, 520)

    return () => clearTimeout(t)
  }, [notes, visible])

  // Fetch study notes: core first (fast render), then enhanced (lazy merge)
  useEffect(() => {
    const cacheKey = `upsc-notes-v4-${topic.id}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        setNotes(JSON.parse(cached))
        setNotesLoading(false)
        return
      } catch {
        // ignore bad cache
      }
    }

    const keywords = topic.concepts.slice(0, 6).join(',')
    const params = `topic=${topic.id}&subject=${subject.id}&title=${encodeURIComponent(topic.title)}&concepts=${encodeURIComponent(keywords)}`

    // 1. Fetch core notes — renders immediately
    fetch(`/api/journey/notes?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.notes) {
          setNotes(data.notes)
          setNotesLoading(false)

          // 2. Fetch enhanced notes in background — merges when ready
          fetch(`/api/journey/notes-enhanced?${params}`)
            .then((r) => r.json())
            .then((eData) => {
              if (eData.enhanced) {
                setNotes((prev) => {
                  const merged = { ...prev, ...eData.enhanced }
                  localStorage.setItem(cacheKey, JSON.stringify(merged))
                  return merged
                })
              } else if (data.notes) {
                // No enhanced data, cache core only
                localStorage.setItem(cacheKey, JSON.stringify(data.notes))
              }
            })
            .catch(() => {
              // Enhanced failed — cache core only
              if (data.notes) localStorage.setItem(cacheKey, JSON.stringify(data.notes))
            })
        } else {
          setNotesLoading(false)
        }
      })
      .catch(() => setNotesLoading(false))
  }, [topic.id, subject.id, topic.title, topic.concepts])

  // Fetch a single relevant hero image from Wikipedia summary API
  useEffect(() => {
    const imgCacheKey = `upsc-img-v4-${topic.id}`
    const cached = localStorage.getItem(imgCacheKey)

    if (cached && cached !== 'none') {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) { setImages(parsed); return }
        if (parsed.url) { setImages([parsed]); return }
      } catch { /* ignore bad cache */ }
    }
    if (cached === 'none') return

    // Extract first sentence from Wikipedia extract for a clean, relevant caption
    const firstSentence = (text: string): string => {
      if (!text) return ''
      // Strip HTML if any
      const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      // Find first sentence boundary (period followed by space + uppercase, or end)
      const m = clean.match(/^(.+?\.)\s+[A-Z]/)
      const sentence = m ? m[1] : (clean.length > 200 ? clean.slice(0, clean.lastIndexOf(' ', 200)) + '...' : clean)
      // Skip if it's just a disambiguation or redirect note
      if (/may refer to|disambiguation|redirect/i.test(sentence)) return ''
      return sentence
    }

    const fetchSummaryImage = async (title: string): Promise<{ url: string; desc: string } | null> => {
      try {
        const wt = title.replace(/ /g, '_')
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wt)}`)
        if (!r.ok) return null
        const data = await r.json()
        // Skip disambiguation pages
        if (data?.type === 'disambiguation') return null
        const src = data?.thumbnail?.source || data?.originalimage?.source || null
        if (!src) return null
        const desc = firstSentence(data?.extract || '') || data?.description || ''
        return { url: src.replace(/\/\d+px-/, '/600px-'), desc }
      } catch { return null }
    }

    const searchAndFetch = async (query: string): Promise<{ url: string; desc: string } | null> => {
      try {
        const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`)
        if (!r.ok) return null
        const title = (await r.json())?.query?.search?.[0]?.title
        return title ? fetchSummaryImage(title) : null
      } catch { return null }
    }

    const fetchImage = async () => {
      // Strategy 1: Direct title match (most reliable)
      let result = await fetchSummaryImage(topic.title)

      // Strategy 2: Cleaned title (remove parentheticals, suffixes)
      if (!result) {
        const cleaned = topic.title.replace(/\s*[—–-]\s*.+$/, '').replace(/\s*\(.*?\)\s*/g, '').trim()
        if (cleaned !== topic.title) result = await fetchSummaryImage(cleaned)
      }

      // Strategy 3: Search with title + subject for disambiguation
      if (!result) {
        result = await searchAndFetch(`${topic.title} ${subject.title}`)
      }

      // Strategy 4: First concept keyword
      if (!result && topic.concepts.length > 0) {
        result = await searchAndFetch(topic.concepts[0])
      }

      if (result) {
        setImages([result])
        localStorage.setItem(imgCacheKey, JSON.stringify([result]))
      } else {
        localStorage.setItem(imgCacheKey, 'none')
      }
    }

    fetchImage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id, topic.title])

  // IntersectionObserver: track which section is visible → highlight in TOC
  useEffect(() => {
    if (!notes || notesLoading) return
    const root = scrollContainerRef.current
    if (!root) return

    const observers: IntersectionObserver[] = []
    const allRefs = Object.entries(sectionRefs) as [string, React.RefObject<HTMLDivElement | null>][]

    for (const [id, ref] of allRefs) {
      const el = ref.current
      if (!el) continue
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveTocSection(id) },
        { root, rootMargin: '-10% 0px -75% 0px', threshold: 0 }
      )
      observer.observe(el)
      observers.push(observer)
    }
    return () => observers.forEach(o => o.disconnect())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, notesLoading])

  // Auto-scroll the TOC strip to keep active pill visible
  useEffect(() => {
    const strip = tocStripRef.current
    if (!strip) return
    const activeBtn = strip.querySelector(`[data-toc="${activeTocSection}"]`) as HTMLElement
    if (activeBtn) {
      const stripRect = strip.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      const offset = btnRect.left - stripRect.left - stripRect.width / 2 + btnRect.width / 2
      strip.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }, [activeTocSection])

  const handleDismiss = useCallback(() => {
    setDismissing(true)
    setTimeout(onClose, 350)
  }, [onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    // Only allow drag-to-dismiss if scroll container is at top
    const scrollEl = scrollContainerRef.current
    isDragging.current = !scrollEl || scrollEl.scrollTop <= 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const scrollEl = scrollContainerRef.current
    // If user scrolled down during this gesture, cancel drag
    if (scrollEl && scrollEl.scrollTop > 0) {
      isDragging.current = false
      dragOffset.current = 0
      setDragTranslate(0)
      return
    }
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) {
      dragOffset.current = delta
      setDragTranslate(delta)
    } else {
      // Upward movement — don't drag, let scroll happen
      isDragging.current = false
      dragOffset.current = 0
      setDragTranslate(0)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    if (dragOffset.current > 120) {
      handleDismiss()
    } else {
      setDragTranslate(0)
      dragOffset.current = 0
    }
  }, [handleDismiss])

  const color = subject.color
  const crown = progress.crownLevel
  const nextCrown = Math.min(5, crown + 1) as CrownLevel
  // Progress WITHIN the current level — not the cumulative progress
  // toward the next level from zero. The previous formula
  // (correctAnswers / nextCrownThreshold) made the bar/ring fill jump
  // erratically and read 80% when the user was only 40% through the
  // current level. Each level requires QUESTIONS_PER_CROWN correct
  // answers; we count how many of those the user has already collected.
  const correctNeeded = QUESTIONS_PER_CROWN
  const correctProgress = Math.max(
    0,
    Math.min(QUESTIONS_PER_CROWN, progress.correctAnswers - crown * QUESTIONS_PER_CROWN),
  )
  const progressPct = crown >= 5
    ? 100
    : (correctProgress / correctNeeded) * 100
  const accuracy =
    progress.questionsAnswered > 0
      ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100)
      : 0

  const isCompleted = progress.state === 'completed'
  const isStarted = progress.state === 'started'
  const hasProgress = isStarted || isCompleted
  const isFocusArea = profile?.weakSubjects?.includes(subject.id) ?? false

  // Button label logic
  const buttonLabel = isCompleted
    ? 'PRACTICE AGAIN'
    : isStarted
      ? 'START PRACTICE \u2192'
      : isFocusArea
        ? 'START FOCUS \u2192'
        : 'START STUDYING \u2192'
  const buttonIsOutline = isCompleted

  const diffLevel = topic.difficulty
  const diffColor = diffLevel === 1 ? '#34d399' : diffLevel === 2 ? '#fbbf24' : '#f87171'
  const diffLabel = diffLevel === 1 ? 'Easy' : diffLevel === 2 ? 'Medium' : 'Hard'

  const freq = topic.pyqFrequency
  const freqColor =
    freq === 'high' ? '#f87171' : freq === 'medium' ? '#fbbf24' : 'rgba(255,255,255,0.35)'
  const freqLabel = freq === 'high' ? 'Frequently' : freq === 'medium' ? 'Sometimes' : 'Rarely'

  // Fallback UPSC relevance text based on PYQ frequency
  const fallbackRelevance =
    freq === 'high'
      ? `This topic appears frequently in UPSC ${subject.paper}. Focus on key facts, dates, and analytical angles for both Prelims and Mains.`
      : freq === 'medium'
        ? `This topic has appeared in past UPSC papers for ${subject.paper}. Understanding core concepts will help across multiple questions.`
        : `While not frequently asked directly, this topic builds foundational understanding for ${subject.paper} and may appear as part of broader questions.`

  // Map relevance regex for inline map buttons
  const MAP_REGEX = /map|locat|region|river|site|city|cities|capital|border|coast|mountain|valley|penins|plateau|district|province|temple|fort|port/i

  // SVG ring for crown progress
  const ringSize = 48
  const ringStroke = 4
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (progressPct / 100) * ringCircumference

  // Track failed image URLs to skip them in gallery
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  // Active highlight explanation popover
  const [activeHighlight, setActiveHighlight] = useState<{ term: string; explanation: string } | null>(null)

  // Strip all inline markdown/highlight markers — used for plain-text
  // contexts like comparison table titles and headers, which have their
  // own styling and should NEVER render literal **asterisks** or
  // [[term||explanation]] tokens.
  function stripInlineMarkdown(raw: string): string {
    return raw
      .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold** → bold
      .replace(/\*\*/g, '')                        // orphan asterisks
      .replace(/\[\[([^|\]]+)\|\|[^\]]*\]\]/g, '$1') // [[term||explanation]] → term
      .replace(/\s+/g, ' ')
      .trim()
  }

  // ── Markdown asterisk cleanup (handles malformed LLM output) ──────────
  function cleanMarkdownAsterisks(raw: string): string {
    let s = raw
    // 1. Normalize triple+ asterisks to double (bold): ***text*** -> **text**
    s = s.replace(/\*{3,}(.*?)\*{3,}/g, '**$1**')
    // 2. Protect existing valid **bold** pairs with placeholders
    const boldPlaceholders: string[] = []
    s = s.replace(/\*\*(.*?)\*\*/g, (_match, content) => {
      boldPlaceholders.push(content)
      return `\x00BOLD${boldPlaceholders.length - 1}\x00`
    })
    // 3. Convert single-asterisk italic *text* to bold placeholder
    s = s.replace(/\*([^\s*][^*]*?[^\s*])\*/g, (_match, content) => {
      boldPlaceholders.push(content)
      return `\x00BOLD${boldPlaceholders.length - 1}\x00`
    })
    // Also handle single-word: *word*
    s = s.replace(/\*([^\s*]+)\*/g, (_match, content) => {
      boldPlaceholders.push(content)
      return `\x00BOLD${boldPlaceholders.length - 1}\x00`
    })
    // 4. Strip leading "* " bullet markers
    s = s.replace(/^\*\s+/gm, '')
    // 5. Remove any remaining orphan asterisks
    s = s.replace(/\*/g, '')
    // 6. Restore bold placeholders back to ** syntax
    s = s.replace(/\x00BOLD(\d+)\x00/g, (_match, idx) => `**${boldPlaceholders[parseInt(idx)]}**`)
    return s
  }

  // ── Rich text renderer with highlights, bold, and inline markers ──────────
  function renderRichText(text: string, color: string): React.ReactNode {
    const rgb = hexToRgb(color)
    // Pre-clean asterisk issues before parsing
    let cleaned = cleanMarkdownAsterisks(text)
    // Normalize LLM bracket quirks: "] ]" → "]]", "[ [" → "[["
    cleaned = cleaned.replace(/\]\s+\]/g, ']]').replace(/\[\s+\[/g, '[[')
    const parts = cleaned.split(/(\[\[.*?\|\|.*?\]\])/g)

    return parts.map((part, i) => {
      const highlightMatch = part.match(/^\[\[(.*?)\|\|(.*?)\]\]$/)
      if (highlightMatch) {
        const [, term, explanation] = highlightMatch
        const isActive = activeHighlight?.term === term
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              setActiveHighlight(prev =>
                prev?.term === term ? null : { term, explanation }
              )
            }}
            style={{
              display: 'inline',
              padding: '1px 8px 2px',
              margin: '0 1px',
              borderRadius: 7,
              background: isActive ? `rgba(${rgb},0.22)` : `rgba(${rgb},0.10)`,
              borderBottom: `2px solid rgba(${rgb},0.50)`,
              color: isActive ? color : `rgba(${rgb.split(',').map(c => Math.min(255, parseInt(c) + 40)).join(',')},1)`,
              fontSize: 'inherit',
              fontWeight: 650,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 180ms ease',
              lineHeight: 1.9,
              letterSpacing: '-0.01em',
            }}
          >
            {term}
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{
              display: 'inline-block', marginLeft: 3, verticalAlign: 'middle', opacity: 0.5,
            }}>
              <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
              <text x="8" y="12" textAnchor="middle" fill={color} fontSize="10" fontWeight="700">i</text>
            </svg>
          </span>
        )
      }

      // Bold parsing with enhanced styling + glow
      const boldParts = part.split(/\*\*(.*?)\*\*/g)
      return boldParts.map((bp, j) =>
        j % 2 === 1
          ? <strong key={`${i}-${j}`} style={{
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 700,
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              paddingBottom: 0,
              textShadow: '0 0 12px rgba(255,255,255,0.08)',
            }}>{bp}</strong>
          : <span key={`${i}-${j}`}>{bp}</span>
      )
    })
  }

  function hexToRgb(hex: string): string {
    const h = hex.replace('#', '')
    return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
  }

  return (
    <>
      <style>{`
        @keyframes tds-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes tds-slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes tds-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tds-fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes tds-cardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tds-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.5; } }
        @keyframes tds-accentPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes tds-gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes tds-termPopUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tds-termBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: dismissing
            ? 'tds-fadeOut 0.3s ease forwards'
            : 'tds-fadeIn 0.2s ease forwards',
        }}
      />

      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 71,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          borderRadius: '24px 24px 0 0',
          background: 'rgba(10,10,20,0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          transform:
            visible && !dismissing
              ? `translateY(${dragTranslate}px)`
              : 'translateY(100%)',
          transition: isDragging.current
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          animation: dismissing
            ? 'tds-slideDown 0.35s ease forwards'
            : visible && dragTranslate === 0
              ? 'tds-slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards'
              : 'none',
        }}
      >
        {/* 1. Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Scrollable content. `overflowX: 'hidden'` is critical: it
            prevents the sheet from ever scrolling sideways. Without
            this, any absolutely-positioned descendant that animates
            past the viewport edge (e.g. the TOC nav scanline shimmer
            below) leaks horizontal overflow up to this scroll
            container, letting the user pan the entire notes screen
            sideways. WebkitOverflowScrolling fixes a known iOS Safari
            quirk where position:sticky inside overflow:auto containers
            renders a 1-2px gap at the top during momentum scroll. */}
        <div
          ref={scrollContainerRef}
          onScroll={() => { if (activeHighlight) setActiveHighlight(null) }}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none' as const,
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 16,
          }}
        >
          {/* 2. Premium header */}
          <div style={{ position: 'relative', padding: '16px 20px 12px' }}>
            {/* Subtle gradient backdrop behind header */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 80,
              background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)`,
              pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
              <div style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${color}20, ${color}08)`,
                border: `2px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
                boxShadow: `0 4px 16px ${color}15`,
              }}>
                {topic.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: 18, fontWeight: 750,
                  color: 'rgba(255,255,255,0.95)',
                  margin: 0, lineHeight: 1.3,
                  letterSpacing: '-0.02em',
                }}>
                  {topic.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color, letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    background: `${color}12`,
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}>
                    {subject.shortTitle}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.02em',
                  }}>
                    {subject.paper}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2b. FUTURISTIC TOC NAV — moved here from inside the notes
              section so the user sees the available chapters right under
              the topic title. Glassmorphism + glowing active pill +
              shimmer scanline + slow drift entrance animation. */}
          {!notesLoading && notes && (() => {
            type TocItem = { id: string; label: string; icon: string; ref: React.RefObject<HTMLDivElement | null> }
            const tocItems: TocItem[] = []
            if (notes.examTip) tocItems.push({ id: 'examStrategy', label: 'Exam', icon: '\uD83C\uDFAF', ref: sectionRefs.examStrategy })
            if (notes.hook) tocItems.push({ id: 'hook', label: 'Hook', icon: '\uD83D\uDCA1', ref: sectionRefs.hook })
            tocItems.push({ id: 'overview', label: 'Overview', icon: '\uD83D\uDCDD', ref: sectionRefs.overview })
            if (notes.timeline && notes.timeline.length > 0) tocItems.push({ id: 'timeline', label: 'Timeline', icon: '\uD83D\uDCC5', ref: sectionRefs.timeline })
            if (notes.keyPoints && notes.keyPoints.length > 0) tocItems.push({ id: 'keyConcepts', label: 'Concepts', icon: '\uD83D\uDCCC', ref: sectionRefs.keyConcepts })
            if (notes.comparison && notes.comparison.rows && notes.comparison.rows.length > 0) tocItems.push({ id: 'comparison', label: 'Compare', icon: '\uD83D\uDCCA', ref: sectionRefs.comparison })
            if (notes.importantFacts && notes.importantFacts.length > 0) tocItems.push({ id: 'quickFacts', label: 'Facts', icon: '\u26A1', ref: sectionRefs.quickFacts })
            if (notes.mindMap && notes.mindMap.branches && notes.mindMap.branches.length > 0) tocItems.push({ id: 'mindMap', label: 'Map', icon: '\uD83D\uDD78\uFE0F', ref: sectionRefs.mindMap })
            if (notes.pyqTrends && notes.pyqTrends.length > 0) tocItems.push({ id: 'pyqTrends', label: 'PYQs', icon: '\uD83D\uDCCA', ref: sectionRefs.pyqTrends })
            if (subject.id !== 'csat') tocItems.push({ id: 'answerFramework', label: 'Answer', icon: '\u270D\uFE0F', ref: sectionRefs.answerFramework })
            if (notes.caseStudies && notes.caseStudies.length > 0) tocItems.push({ id: 'caseStudies', label: 'Cases', icon: '\uD83D\uDCBC', ref: sectionRefs.caseStudies })
            if (notes.commonMistakes && notes.commonMistakes.length > 0) tocItems.push({ id: 'commonMistakes', label: 'Avoid', icon: '\u26A0\uFE0F', ref: sectionRefs.commonMistakes })
            tocItems.push({ id: 'sourceRecommendations', label: 'Sources', icon: '\uD83D\uDCDA', ref: sectionRefs.sourceRecommendations })
            if (notes.keyTakeaways && notes.keyTakeaways.length > 0) tocItems.push({ id: 'keyTakeaways', label: 'Recap', icon: '\u2705', ref: sectionRefs.keyTakeaways })
            if (notes.connections) tocItems.push({ id: 'connectedTopics', label: 'Links', icon: '\uD83D\uDD17', ref: sectionRefs.connectedTopics })

            if (tocItems.length <= 1) return null

            return (
              <>
                <style>{`
                  @keyframes tds-toc-driftIn {
                    0% { opacity: 0; transform: translateX(28px); }
                    100% { opacity: 1; transform: translateX(0); }
                  }
                  @keyframes tds-toc-hint {
                    0%, 100% { transform: translateX(0); }
                    35%      { transform: translateX(-18px); }
                    65%      { transform: translateX(-18px); }
                  }
                  @keyframes tds-toc-edgePulse {
                    0%, 100% { opacity: 0.45; }
                    50%      { opacity: 0.85; }
                  }
                `}</style>
                <div style={{
                  // Sticky to the top of the notes scroll container so
                  // the chapter nav stays visible the entire time the
                  // user is reading.
                  //
                  // OVERLAP TRICK: top is -6px (not 0) and padding-top
                  // is 6px to compensate. This pins the wrapper 6px
                  // ABOVE the visible scroll area edge. The clipped
                  // top 6px guarantees that any 1-6px gap caused by
                  // sub-pixel rendering, mobile viewport changes, or
                  // iOS Safari sticky quirks is invisibly covered by
                  // the opaque wrapper background. The visible content
                  // stays in the same place because of the matching
                  // padding-top.
                  position: 'sticky',
                  top: -6,
                  zIndex: 10,
                  margin: 0,
                  // padding: top 6 (overlap), right 0, bottom 6 (the
                  // strip itself now carries 30px of padding-bottom to
                  // contain the active pill's glow shadow, so we only
                  // need a thin gutter here for the bottom hairline)
                  padding: '6px 0 6px',
                  // Clip absolutely-positioned children (the scanline
                  // shimmer animates to translateX(220%) which extends
                  // past the right edge of this wrapper). Without this,
                  // the entire notes screen could be scrolled sideways.
                  overflow: 'hidden',
                  // FULLY OPAQUE backdrop. Sticky bars MUST be solid or
                  // text under them shows.
                  background: '#06060e',
                }}>
                  {/* Top + bottom hairline edges with subject-color glow */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                    background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
                    animation: 'tds-toc-edgePulse 3s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                    background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
                    animation: 'tds-toc-edgePulse 3s ease-in-out infinite 1.5s',
                    pointerEvents: 'none',
                  }} />

                  {/* Background tint layer — fully opaque so nothing
                      bleeds through the sticky bar. The wrapper is
                      already #06060e; this adds the subtle gradient
                      lift on top of it. */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(180deg, rgba(20,20,32,1) 0%, rgba(8,8,18,1) 100%)`,
                    pointerEvents: 'none',
                  }} />

                  {/* (Scanline shimmer removed — was a moving gradient
                      that swept left to right behind the pills.) */}

                  {/* Left/right edge fade masks so items fade in/out at the
                      strip edges — communicates "this is scrollable" */}
                  <div style={{
                    position: 'absolute', top: 1, bottom: 1, left: 0, width: 24,
                    background: 'linear-gradient(90deg, rgba(10,10,20,1), transparent)',
                    pointerEvents: 'none', zIndex: 2,
                  }} />
                  <div style={{
                    position: 'absolute', top: 1, bottom: 1, right: 0, width: 24,
                    background: 'linear-gradient(270deg, rgba(10,10,20,1), transparent)',
                    pointerEvents: 'none', zIndex: 2,
                  }} />

                  {/* The actual scroll strip — tight padding hugs the
                      pills. `overflowX: 'auto'` forces overflowY to
                      also clip per CSS spec, so the active pill's
                      shadow needs to fit within the strip's padding
                      edge. The shadow has been shrunk to fit a compact
                      bar (see the active-pill boxShadow below). */}
                  <div
                    ref={tocStripRef}
                    style={{
                      position: 'relative', zIndex: 1,
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      scrollbarWidth: 'none',
                      WebkitOverflowScrolling: 'touch',
                      padding: '6px 24px 10px',
                      scrollBehavior: 'smooth',
                      // One-time slow drift hint on first mount: the
                      // strip slides 18px left and back so the user sees
                      // there's more to the right.
                      animation: 'tds-toc-hint 2.4s ease-in-out 0.6s 1',
                    }}
                  >
                    {tocItems.map((item, idx) => {
                      const isActive = item.id === activeTocSection
                      return (
                        <button
                          key={item.id}
                          data-toc={item.id}
                          onClick={() => scrollToSection(item.ref)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 11,
                            border: isActive
                              ? `1px solid ${color}`
                              : '1px solid rgba(255,255,255,0.07)',
                            background: isActive
                              ? `linear-gradient(135deg, ${color}, ${color}cc)`
                              : 'rgba(255,255,255,0.035)',
                            color: isActive
                              ? '#fff'
                              : 'rgba(255,255,255,0.55)',
                            fontSize: 12,
                            fontWeight: isActive ? 800 : 600,
                            letterSpacing: '0.01em',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'all 280ms cubic-bezier(0.16,1,0.3,1)',
                            // Compact shadow that fits within the
                            // strip's tight padding (6px top, 10px
                            // bottom). Going larger reintroduces the
                            // clip-cut bug we fixed earlier.
                            boxShadow: isActive
                              ? `0 2px 8px ${color}66, 0 0 0 2px ${color}30, inset 0 1px 0 rgba(255,255,255,0.25)`
                              : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                            opacity: 0,
                            // Stagger items in from the right — slow,
                            // smooth, futuristic.
                            animation: `tds-toc-driftIn 0.55s cubic-bezier(0.16,1,0.3,1) ${0.12 + idx * 0.06}s both`,
                          }}
                        >
                          <span style={{
                            fontSize: 13, lineHeight: 1,
                            filter: isActive ? 'none' : 'grayscale(0.4) brightness(0.85)',
                          }}>
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )
          })()}

          {/* 3. Hero Image — first image only, rest distributed in notes */}
          {(() => {
            const validImages = images.filter(img => !failedUrls.has(img.url))
            if (validImages.length === 0) return null
            const hero = validImages[0]

            return (
              <div style={{
                margin: '0 20px 16px',
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                animation: 'tds-cardIn 0.4s ease 0.12s both',
              }}>
                <img
                  src={hero.url}
                  alt={topic.title}
                  style={{
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'contain',
                    display: 'block',
                    background: 'rgba(0,0,0,0.3)',
                  }}
                  onError={() => setFailedUrls(prev => new Set(prev).add(hero.url))}
                />
                {hero.desc && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '20px 12px 8px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 8,
                    pointerEvents: 'none',
                  }}>
                    <span style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: 1.4,
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {hero.desc}
                    </span>
                    <span style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.35)',
                      fontWeight: 600,
                      flexShrink: 0,
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: 'rgba(0,0,0,0.3)',
                      letterSpacing: '0.03em',
                    }}>
                      CC
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 4. UPSC Relevance Banner */}
          {notesLoading ? (
            <div style={{
              margin: '0 20px 16px',
              height: 68,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.04)',
              animation: 'tds-shimmer 1.5s ease-in-out infinite',
            }} />
          ) : (
            <div style={{
              margin: '0 20px 16px',
              padding: '14px 16px',
              borderRadius: 16,
              background: `linear-gradient(135deg, ${color}0A 0%, rgba(255,255,255,0.02) 100%)`,
              border: `1px solid ${color}20`,
              display: 'flex', gap: 12, alignItems: 'flex-start',
              animation: 'tds-cardIn 0.35s ease 0.1s both',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Accent line left */}
              <div style={{
                position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
                background: `linear-gradient(180deg, ${color}, ${color}44)`,
                borderRadius: '0 2px 2px 0',
              }} />
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, marginLeft: 4,
              }}>
                {'\uD83C\uDFAF'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, color,
                  margin: '0 0 4px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  UPSC Relevance
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.70)', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
                  {renderRichText(notes?.upscRelevance || fallbackRelevance, color)}
                </p>
              </div>
            </div>
          )}

          {/* 5. Topic stats — descriptive badges */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8,
            padding: '0 20px', marginBottom: 16,
            animation: 'tds-cardIn 0.3s ease 0.15s both',
          }}>
            {/* Difficulty */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 12,
              background: `${diffColor}08`,
              border: `1px solid ${diffColor}18`,
              flex: 1, minWidth: 0,
            }}>
              <div style={{
                display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0,
              }}>
                {[1, 2, 3].map((d) => (
                  <div key={d} style={{
                    width: 6, height: d <= diffLevel ? 14 : 8,
                    borderRadius: 2,
                    background: d <= diffLevel ? diffColor : 'rgba(255,255,255,0.10)',
                    boxShadow: d <= diffLevel ? `0 0 4px ${diffColor}30` : 'none',
                    transition: 'all 200ms ease',
                    alignSelf: 'flex-end',
                  }} />
                ))}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: diffColor, letterSpacing: '0.03em' }}>
                  {diffLabel} Difficulty
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>
                  {diffLevel === 1 ? 'Good starting point' : diffLevel === 2 ? 'Moderate preparation needed' : 'Requires deep study'}
                </div>
              </div>
            </div>

            {/* PYQ Frequency */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 12,
              background: `${freqColor}08`,
              border: `1px solid ${typeof freqColor === 'string' && freqColor.startsWith('#') ? freqColor + '18' : 'rgba(255,255,255,0.06)'}`,
              flex: 1, minWidth: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={freqColor} opacity={0.8} style={{ flexShrink: 0 }}>
                <path d="M12 2C10.5 6 6 8.5 6 13c0 3.5 2.5 7 6 7s6-3.5 6-7c0-4.5-4.5-7-6-11z" />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: freqColor, letterSpacing: '0.03em' }}>
                  Asked {freqLabel}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>
                  {freq === 'high' ? 'Appears most years in UPSC' : freq === 'medium' ? 'Seen in past papers' : 'Rarely asked directly'}
                </div>
              </div>
            </div>

            {/* Focus Area */}
            {isFocusArea && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 12,
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.18)',
                width: '100%',
              }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{'\uD83C\uDFAF'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f97316', letterSpacing: '0.03em' }}>
                    Your Focus Area
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', marginTop: 1 }}>
                    You marked this subject for extra practice
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Study Notes Section ── */}
          <div style={{ padding: '0 20px', animation: 'tds-cardIn 0.35s ease 0.2s both' }}>

            {/* Loading skeleton */}
            {notesLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {[48, 32, 32, 24].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: h,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      animation: `tds-shimmer 1.5s ease-in-out infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Notes loaded successfully */}
            {!notesLoading && notes && (() => {
              return (
              <>
                {/* TOC nav has been moved up — it now lives right under
                    the topic header, see "2b. FUTURISTIC TOC NAV" above. */}

                {/* A. Exam Strategy Card — surfaces the "how UPSC tests this"
                     angle first, before the hook, so the aspirant sees the
                     exam-oriented framing at the very top of the notes. */}
                {notes.examTip && (
                  <div ref={sectionRefs.examStrategy} style={{
                    marginBottom: 24,
                    padding: '16px 16px 16px 18px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(246,173,85,0.06) 0%, rgba(246,173,85,0.02) 100%)',
                    border: '1px solid rgba(246,173,85,0.12)',
                    position: 'relative', overflow: 'hidden',
                    animation: 'tds-cardIn 0.3s ease 0.2s both',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
                      background: 'linear-gradient(180deg, #F6AD55, #F6AD5566)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(246,173,85,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83C\uDFAF'}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: '#F6AD55',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>Exam Strategy</span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: '#F6AD55',
                        background: 'rgba(246,173,85,0.10)',
                        border: '1px solid rgba(246,173,85,0.20)',
                        padding: '1px 6px', borderRadius: 5,
                        letterSpacing: '0.06em',
                      }}>IMPORTANT</span>
                    </div>
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.9, color: 'rgba(255,255,255,0.82)',
                      margin: 0, letterSpacing: '-0.01em',
                      WebkitFontSmoothing: 'antialiased' as const,
                    }}>
                      {renderRichText(notes.examTip, '#F6AD55')}
                    </p>
                  </div>
                )}

                {/* B. Hook Card — attention-grabbing callout */}
                {notes.hook && (
                  <div ref={sectionRefs.hook} style={{
                    marginBottom: 24,
                    padding: '16px 16px 16px 18px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(79,209,197,0.06) 0%, rgba(79,209,197,0.02) 100%)',
                    border: '1px solid rgba(79,209,197,0.12)',
                    position: 'relative', overflow: 'hidden',
                    animation: 'tds-cardIn 0.3s ease 0.25s both',
                  }}>
                    {/* Left accent bar */}
                    <div style={{
                      position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
                      background: 'linear-gradient(180deg, #4FD1C5, #4FD1C566)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(79,209,197,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}>{'\uD83D\uDCA1'}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: '#4FD1C5',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>Did You Know?</span>
                    </div>
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)',
                      margin: 0, letterSpacing: '-0.01em',
                      WebkitFontSmoothing: 'antialiased' as const,
                    }}>
                      {renderRichText(notes.hook, '#4FD1C5')}
                    </p>
                  </div>
                )}

                {/* C. Summary Card — overview section */}
                <div ref={sectionRefs.overview} style={{
                  padding: '16px 18px',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: 24,
                  animation: 'tds-cardIn 0.3s ease 0.3s both',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, ${color}60, ${color}15, transparent)`,
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.40)',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>Overview</span>
                  </div>
                  <p style={{
                    fontSize: 14.5, lineHeight: 1.9, color: 'rgba(255,255,255,0.82)',
                    margin: 0, letterSpacing: '-0.01em',
                    WebkitFontSmoothing: 'antialiased' as const,
                  }}>
                    {renderRichText(notes.summary, color)}
                  </p>
                </div>

                {/* D. Timeline */}
                {notes.timeline && notes.timeline.length > 0 && (
                  <div ref={sectionRefs.timeline} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.35s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83D\uDCC5'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>Timeline</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>
                    <div style={{
                      padding: '14px 14px 14px 16px',
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                    }}>
                      {/* Vertical line */}
                      <div style={{
                        position: 'absolute', left: 36, top: 18, bottom: 18,
                        width: 2, background: `linear-gradient(180deg, ${color}60, ${color}15)`, borderRadius: 1,
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {notes.timeline.map((entry, idx) => (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12, paddingLeft: 24,
                            position: 'relative',
                            animation: `tds-cardIn 0.3s ease ${0.4 + idx * 0.05}s both`,
                          }}>
                            <div style={{
                              position: 'absolute', left: 16, top: 6,
                              width: 10, height: 10, borderRadius: '50%',
                              background: color, boxShadow: `0 0 8px ${color}40`,
                              border: '2px solid rgba(10,10,20,0.9)',
                            }} />
                            <span style={{
                              fontSize: 11, fontWeight: 750, color,
                              background: `${color}12`,
                              border: `1px solid ${color}20`,
                              padding: '2px 10px', borderRadius: 7,
                              minWidth: 68, textAlign: 'center', flexShrink: 0, marginLeft: 8,
                              letterSpacing: '0.01em',
                            }}>
                              {entry.year}
                            </span>
                            <p style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
                              {renderRichText(entry.event, color)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* E. Key Concepts */}
                {notes.keyPoints && notes.keyPoints.length > 0 && (
                  <div ref={sectionRefs.keyConcepts} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83D\uDCCC'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>Key Concepts</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.04em',
                      }}>{notes.keyPoints.length} POINTS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notes.keyPoints.map((point, idx) => {
                        const hasMapRelevance = MAP_REGEX.test(point)
                        return (
                          <div key={idx}
                            // Stable id so the back-from-map restore effect
                            // can scroll the user back to THIS exact bullet.
                            id={`tds-keyconcept-${idx}`}
                            style={{
                            display: 'flex', flexDirection: 'column', gap: 8,
                            padding: '14px 16px 14px 14px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            position: 'relative', overflow: 'hidden',
                            animation: `tds-cardIn 0.3s ease ${0.25 + idx * 0.05}s both`,
                          }}>
                            {/* Left accent */}
                            <div style={{
                              position: 'absolute', left: 0, top: 10, bottom: 10, width: 3,
                              background: `linear-gradient(180deg, ${color}80, ${color}20)`,
                              borderRadius: '0 2px 2px 0',
                            }} />
                            <div style={{ display: 'flex', gap: 12, paddingLeft: 4 }}>
                              <span style={{
                                width: 22, height: 22, borderRadius: 7,
                                flexShrink: 0,
                                background: `${color}12`,
                                border: `1px solid ${color}20`,
                                color: `${color}cc`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800,
                              }}>
                                {idx + 1}
                              </span>
                              <p style={{
                                fontSize: 14, lineHeight: 1.9,
                                color: 'rgba(255,255,255,0.80)', margin: 0,
                                WebkitFontSmoothing: 'antialiased' as const,
                              }}>
                                {renderRichText(point, color)}
                              </p>
                            </div>
                            {hasMapRelevance && (
                              <button onClick={() => {
                                // Pass THIS specific key-concept bullet up to
                                // the parent so the map prompt is anchored on
                                // the exact sentence the user clicked beneath,
                                // not a topic-wide overview. Strip the inline
                                // highlight markers ([[term||explanation]])
                                // and **bold** so the intent parser sees clean
                                // natural language.
                                const cleaned = point
                                  .replace(/\[\[([^|\]]+)\|\|[^\]]*\]\]/g, '$1')
                                  .replace(/\*\*([^*]+)\*\*/g, '$1')
                                  .replace(/\s+/g, ' ')
                                  .trim()
                                // Stash the bullet's id so that when the user
                                // taps "back" on the map page, this exact
                                // bullet — not the top of the notes — is
                                // scrolled into view on remount.
                                try {
                                  sessionStorage.setItem('upsc-map-return-anchor', `tds-keyconcept-${idx}`)
                                } catch {}
                                onOpenMap(cleaned)
                              }} style={{
                                alignSelf: 'stretch',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '10px 14px', borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(139,92,246,0.10))',
                                border: '1px solid rgba(129,140,248,0.20)',
                                cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, color: '#a5b4fc',
                                marginTop: 2, marginLeft: 4,
                                WebkitTapHighlightColor: 'transparent',
                              }}>
                                {'\uD83D\uDDFA\uFE0F'} Visualize on Map
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* F. Comparison Table */}
                {notes.comparison && notes.comparison.rows && notes.comparison.rows.length > 0 && (
                  <div ref={sectionRefs.comparison} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.4s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83D\uDCCA'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>{stripInlineMarkdown(notes.comparison.title || 'Comparison')}</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>
                    <div style={{
                      borderRadius: 16, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{
                        display: 'flex',
                        background: `linear-gradient(135deg, ${color}10, ${color}05)`,
                        borderBottom: `1px solid ${color}18`,
                      }}>
                        {notes.comparison.headers.map((header, hIdx) => (
                          <div key={hIdx} style={{
                            flex: 1, padding: '10px 14px',
                            fontSize: 11, fontWeight: 750, color,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {stripInlineMarkdown(header)}
                          </div>
                        ))}
                      </div>
                      {notes.comparison.rows.map((row, rIdx) => (
                        <div key={rIdx} style={{
                          display: 'flex',
                          background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderBottom: rIdx < notes.comparison!.rows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        }}>
                          {row.map((cell, cIdx) => (
                            <div key={cIdx} style={{
                              flex: 1, padding: '10px 14px',
                              fontSize: 12.5, lineHeight: 1.55,
                              color: 'rgba(255,255,255,0.72)',
                            }}>
                              {renderRichText(cell, color)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* H. Quick Facts */}
                {notes.importantFacts && notes.importantFacts.length > 0 && (
                  <div ref={sectionRefs.quickFacts} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(251,191,36,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\u26A1'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>Quick Facts</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>
                    <div style={{
                      borderRadius: 16, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {notes.importantFacts.map((fact, idx) => {
                        const colonIdx = fact.indexOf(':')
                        const hasLabel = colonIdx > 0 && colonIdx < 40
                        const label = hasLabel ? fact.slice(0, colonIdx) : null
                        const detail = hasLabel ? fact.slice(colonIdx + 1).trim() : fact
                        return (
                          <div key={idx} style={{
                            padding: '10px 14px',
                            borderBottom: idx < notes.importantFacts.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            animation: `tds-cardIn 0.3s ease ${0.35 + idx * 0.04}s both`,
                          }}>
                            {label ? (
                              <>
                                <span style={{
                                  fontSize: 11, fontWeight: 750, color,
                                  background: `${color}10`,
                                  padding: '2px 8px', borderRadius: 6,
                                  whiteSpace: 'nowrap', flexShrink: 0,
                                  marginTop: 1,
                                  letterSpacing: '0.02em',
                                }}>{label}</span>
                                <p style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.72)', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
                                  {renderRichText(detail, color)}
                                </p>
                              </>
                            ) : (
                              <p style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.72)', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
                                {renderRichText(detail, color)}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* NEW-B. Concept Map — clean tree layout */}
                {notes.mindMap && notes.mindMap.branches && notes.mindMap.branches.length > 0 && (() => {
                  const branchColors = [color, '#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c']
                  const branches = notes.mindMap.branches
                  return (
                  <div ref={sectionRefs.mindMap} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.6s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83D\uDD78\uFE0F'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>Concept Map</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>

                    <div style={{
                      borderRadius: 20,
                      background: 'rgba(255,255,255,0.015)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '20px 14px 16px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {/* Subtle radial glow background */}
                      <div style={{
                        position: 'absolute', inset: 0, opacity: 0.07,
                        background: `radial-gradient(ellipse at 50% 0%, ${color}40, transparent 70%)`,
                        pointerEvents: 'none',
                      }} />

                      {/* Central node */}
                      <div style={{
                        display: 'flex', justifyContent: 'center', marginBottom: 0,
                        position: 'relative', zIndex: 1,
                      }}>
                        <div style={{
                          padding: '10px 24px',
                          borderRadius: 14,
                          background: `linear-gradient(135deg, ${color}28, ${color}10)`,
                          border: `1.5px solid ${color}45`,
                          fontSize: 14, fontWeight: 800, color,
                          letterSpacing: '-0.01em',
                          boxShadow: `0 0 24px ${color}20, 0 4px 16px rgba(0,0,0,0.3)`,
                          textAlign: 'center',
                        }}>
                          {notes.mindMap.central}
                        </div>
                      </div>

                      {/* Vertical trunk line from central node */}
                      <div style={{
                        width: 2, height: 18, margin: '0 auto',
                        background: `linear-gradient(180deg, ${color}40, ${color}15)`,
                        borderRadius: 1,
                      }} />

                      {/* Branch cards — vertical list */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                        position: 'relative',
                      }}>
                        {branches.map((branch, idx) => {
                          const bc = branchColors[idx % branchColors.length]
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex', alignItems: 'stretch', gap: 0,
                                animation: `tds-cardIn 0.35s ease ${0.7 + idx * 0.06}s both`,
                              }}
                            >
                              {/* Left connector: dot + vertical line */}
                              <div style={{
                                width: 20, flexShrink: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                paddingTop: 16,
                              }}>
                                <div style={{
                                  width: 8, height: 8, borderRadius: '50%',
                                  background: bc, opacity: 0.7,
                                  boxShadow: `0 0 8px ${bc}40`,
                                  flexShrink: 0,
                                }} />
                                {idx < branches.length - 1 && (
                                  <div style={{
                                    width: 1.5, flex: 1, marginTop: 4,
                                    background: `linear-gradient(180deg, ${bc}30, rgba(255,255,255,0.04))`,
                                    borderRadius: 1,
                                  }} />
                                )}
                              </div>

                              {/* Branch card */}
                              <div style={{
                                flex: 1, minWidth: 0,
                                padding: '11px 14px 10px',
                                borderRadius: 14,
                                background: `linear-gradient(160deg, ${bc}0A, rgba(255,255,255,0.018))`,
                                border: `1px solid ${bc}18`,
                                borderLeft: `3px solid ${bc}50`,
                                position: 'relative',
                              }}>
                                {/* Branch header */}
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6,
                                }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: 6,
                                    background: `${bc}15`,
                                    border: `1px solid ${bc}28`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 800, color: bc, flexShrink: 0,
                                  }}>{idx + 1}</div>
                                  <span style={{
                                    fontSize: 12.5, fontWeight: 720, color: bc,
                                    letterSpacing: '0.01em', lineHeight: 1.3,
                                  }}>{branch.name}</span>
                                </div>

                                {/* Sub-concepts as inline tags */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                  {branch.sub.map((item, sIdx) => (
                                    <span key={sIdx} style={{
                                      fontSize: 11, lineHeight: 1.35,
                                      color: 'rgba(255,255,255,0.55)',
                                      padding: '3px 8px',
                                      borderRadius: 8,
                                      background: 'rgba(255,255,255,0.03)',
                                      border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  )
                })()}

                {/* NEW-C. PYQ Trends */}
                {notes.pyqTrends && notes.pyqTrends.length > 0 && (
                  <div ref={sectionRefs.pyqTrends} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.65s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(244,114,182,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83D\uDCCA'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>How UPSC Asks This</span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: '#f472b6',
                        background: 'rgba(244,114,182,0.10)',
                        border: '1px solid rgba(244,114,182,0.20)',
                        padding: '1px 6px', borderRadius: 5,
                        letterSpacing: '0.06em',
                      }}>EXAM INTEL</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>
                    <div style={{
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      overflow: 'hidden',
                    }}>
                      {notes.pyqTrends.map((trend, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '11px 14px',
                          borderBottom: idx < notes.pyqTrends!.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                          animation: `tds-cardIn 0.3s ease ${0.7 + idx * 0.04}s both`,
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 750, color: '#f472b6',
                            background: 'rgba(244,114,182,0.10)',
                            border: '1px solid rgba(244,114,182,0.18)',
                            padding: '2px 10px', borderRadius: 7,
                            minWidth: 48, textAlign: 'center', flexShrink: 0,
                            letterSpacing: '0.01em',
                          }}>
                            {trend.year}
                          </span>
                          <p style={{
                            fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)',
                            margin: 0, WebkitFontSmoothing: 'antialiased' as const,
                          }}>
                            {renderRichText(trend.pattern, '#f472b6')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW-D. Mains Answer Framework — SUBJECT-SPECIFIC.
                     Each UPSC GS subject has its own answer-writing register
                     drawn from actual PYQ patterns. The framework that
                     renders here adapts to whichever subject the topic
                     belongs to: History uses chronology + sources; Polity
                     uses Articles + judgments + committees; Ethics uses
                     philosopher + case study + civil-service application.
                     Returns null for CSAT (not a Mains paper). */}
                {(() => {
                  const framework = getMainsFramework(subject.id, topic.id)
                  if (!framework) return null
                  return (
                  <div ref={sectionRefs.answerFramework} style={{
                    marginBottom: 24,
                    padding: '16px 16px 16px 18px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(96,165,250,0.02) 100%)',
                    border: '1px solid rgba(96,165,250,0.12)',
                    position: 'relative', overflow: 'hidden',
                    animation: 'tds-cardIn 0.3s ease 0.7s both',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
                      background: 'linear-gradient(180deg, #60a5fa, #60a5fa66)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(96,165,250,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\u270D\uFE0F'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.92)',
                        letterSpacing: '-0.01em',
                      }}>{framework.title}</span>
                      <span style={{
                        fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.40)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '1px 6px', borderRadius: 5,
                        letterSpacing: '0.04em',
                      }}>{framework.wordLimit}</span>
                    </div>
                    <p style={{
                      fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)',
                      margin: '0 0 14px', fontStyle: 'italic',
                    }}>
                      {framework.subtitle}
                    </p>
                    {/* Introduction */}
                    <div style={{ marginBottom: 14 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 750, color: '#60a5fa',
                        background: 'rgba(96,165,250,0.10)',
                        padding: '2px 8px', borderRadius: 6,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>1. OPENING</span>
                      <p style={{
                        fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.78)',
                        margin: '6px 0 0', WebkitFontSmoothing: 'antialiased' as const,
                      }}>
                        {renderRichText(framework.introduction, '#60a5fa')}
                      </p>
                    </div>
                    {/* Body Points */}
                    <div style={{ marginBottom: 14 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 750, color: '#60a5fa',
                        background: 'rgba(96,165,250,0.10)',
                        padding: '2px 8px', borderRadius: 6,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>2. BODY</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {framework.bodyPoints.map((point, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: 7,
                              flexShrink: 0,
                              background: 'rgba(96,165,250,0.10)',
                              border: '1px solid rgba(96,165,250,0.18)',
                              color: '#60a5fa',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800,
                            }}>
                              {idx + 1}
                            </span>
                            <p style={{
                              fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.78)',
                              margin: 0, WebkitFontSmoothing: 'antialiased' as const,
                            }}>
                              {renderRichText(point, '#60a5fa')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Conclusion */}
                    <div style={{ marginBottom: framework.pyqSamples.length > 0 ? 14 : 0 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 750, color: '#60a5fa',
                        background: 'rgba(96,165,250,0.10)',
                        padding: '2px 8px', borderRadius: 6,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>3. CLOSING</span>
                      <p style={{
                        fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.78)',
                        margin: '6px 0 0', WebkitFontSmoothing: 'antialiased' as const,
                      }}>
                        {renderRichText(framework.conclusion, '#60a5fa')}
                      </p>
                    </div>
                    {/* Real PYQ samples this framework targets */}
                    {framework.pyqSamples.length > 0 && (
                      <div style={{
                        paddingTop: 12,
                        borderTop: '1px solid rgba(96,165,250,0.12)',
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 750, color: '#60a5fa',
                          background: 'rgba(96,165,250,0.10)',
                          padding: '2px 8px', borderRadius: 6,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Tested in</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {framework.pyqSamples.map((pyq, idx) => (
                            <div key={idx} style={{
                              fontSize: 12.5, lineHeight: 1.55,
                              color: 'rgba(255,255,255,0.62)',
                              paddingLeft: 10,
                              borderLeft: '2px solid rgba(96,165,250,0.25)',
                            }}>
                              &ldquo;{pyq}&rdquo;
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })()}

                {/* NEW-E. Case Studies */}
                {notes.caseStudies && notes.caseStudies.length > 0 && (
                  <div ref={sectionRefs.caseStudies} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.75s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(251,146,60,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\uD83D\uDCBC'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>Real-World Examples</span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: '#fb923c',
                        background: 'rgba(251,146,60,0.10)',
                        border: '1px solid rgba(251,146,60,0.20)',
                        padding: '1px 6px', borderRadius: 5,
                        letterSpacing: '0.06em',
                      }}>USE IN ANSWERS</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notes.caseStudies.map((cs, idx) => (
                        <div key={idx} style={{
                          padding: '14px 16px 14px 16px',
                          borderRadius: 16,
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          position: 'relative', overflow: 'hidden',
                          animation: `tds-cardIn 0.3s ease ${0.8 + idx * 0.05}s both`,
                        }}>
                          <div style={{
                            position: 'absolute', left: 0, top: 10, bottom: 10, width: 3,
                            background: 'linear-gradient(180deg, #fb923c80, #fb923c20)',
                            borderRadius: '0 2px 2px 0',
                          }} />
                          <div style={{
                            fontSize: 13, fontWeight: 750, color: '#fb923c',
                            marginBottom: 6, paddingLeft: 4,
                          }}>
                            {cs.title}
                          </div>
                          <p style={{
                            fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)',
                            margin: 0, paddingLeft: 4,
                            WebkitFontSmoothing: 'antialiased' as const,
                          }}>
                            {renderRichText(cs.detail, '#fb923c')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW-F. Common Mistakes */}
                {notes.commonMistakes && notes.commonMistakes.length > 0 && (
                  <div ref={sectionRefs.commonMistakes} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.8s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(248,113,113,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\u26A0\uFE0F'}</div>
                      <span style={{
                        fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                        letterSpacing: '-0.01em',
                      }}>Common Mistakes</span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: '#f87171',
                        background: 'rgba(248,113,113,0.10)',
                        border: '1px solid rgba(248,113,113,0.20)',
                        padding: '1px 6px', borderRadius: 5,
                        letterSpacing: '0.06em',
                      }}>AVOID THESE</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                    </div>
                    <div style={{
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      overflow: 'hidden',
                    }}>
                      {notes.commonMistakes.map((mistake, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '11px 14px',
                          borderBottom: idx < notes.commonMistakes!.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                          animation: `tds-cardIn 0.3s ease ${0.85 + idx * 0.04}s both`,
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: 'rgba(248,113,113,0.10)',
                            border: '1px solid rgba(248,113,113,0.18)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 1,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={3} strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </div>
                          <p style={{
                            fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)',
                            margin: 0, WebkitFontSmoothing: 'antialiased' as const,
                          }}>
                            {renderRichText(mistake, '#f87171')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW-G. Source Recommendations */}
                {/* Curated Recommended Sources — from static book data */}
                {(() => {
                  const books = getBooksForSubject(subject.id).filter(b => b.priority <= 2)
                  const ncerts = getNCERTsForSubject(subject.id)
                  const govSources = getGovSourcesForSubject(subject.id)
                  const hasAny = books.length > 0 || ncerts.length > 0 || govSources.length > 0
                  if (!hasAny) return null

                  const typeIcon = (t: string) => {
                    switch (t) {
                      case 'ncert': return '\uD83C\uDFEB'
                      case 'government': return '\uD83C\uDFDB\uFE0F'
                      case 'coaching': return '\uD83C\uDFAF'
                      default: return '\uD83D\uDCD6'
                    }
                  }
                  const typeLabel = (t: string) => {
                    switch (t) {
                      case 'ncert': return 'NCERT'
                      case 'government': return 'GOVT'
                      case 'coaching': return 'COACHING'
                      case 'reference': return 'REFERENCE'
                      default: return 'STANDARD'
                    }
                  }
                  return (
                    <div ref={sectionRefs.sourceRecommendations} style={{ marginBottom: 24, animation: 'tds-cardIn 0.3s ease 0.85s both' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(163,230,53,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        }}>{'\uD83D\uDCDA'}</div>
                        <span style={{
                          fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.88)',
                          letterSpacing: '-0.01em',
                        }}>Must-Read Sources</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 4 }} />
                      </div>

                      {/* Books */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {books.slice(0, 4).map((book, idx) => (
                          <div key={`b-${idx}`} style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderLeft: `3px solid ${book.priority === 1 ? '#f59e0b' : 'rgba(163,230,53,0.4)'}`,
                            animation: `tds-cardIn 0.3s ease ${0.9 + idx * 0.04}s both`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 14, lineHeight: 1 }}>{typeIcon(book.type)}</span>
                              <span style={{
                                fontSize: 13, fontWeight: 720, color: 'rgba(255,255,255,0.90)',
                                flex: 1, minWidth: 0, lineHeight: 1.3,
                              }}>
                                {book.title}
                              </span>
                              {book.priority === 1 && (
                                <span style={{
                                  fontSize: 8, fontWeight: 800, letterSpacing: '0.06em',
                                  padding: '2px 6px', borderRadius: 5,
                                  background: 'rgba(245,158,11,0.12)',
                                  border: '1px solid rgba(245,158,11,0.25)',
                                  color: '#f59e0b', flexShrink: 0,
                                }}>MUST READ</span>
                              )}
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
                            }}>
                              <span style={{
                                fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600,
                              }}>
                                by {book.author}
                              </span>
                              <span style={{
                                fontSize: 8, fontWeight: 800, letterSpacing: '0.05em',
                                padding: '1px 5px', borderRadius: 4,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.35)',
                              }}>{typeLabel(book.type)}</span>
                            </div>
                            <p style={{
                              fontSize: 12, lineHeight: 1.65, margin: 0,
                              color: 'rgba(255,255,255,0.52)',
                            }}>
                              {book.detail}
                            </p>
                          </div>
                        ))}

                        {/* NCERTs */}
                        {ncerts.length > 0 && (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(96,165,250,0.04), rgba(96,165,250,0.01))',
                            border: '1px solid rgba(96,165,250,0.12)',
                            animation: `tds-cardIn 0.3s ease ${0.9 + books.length * 0.04}s both`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 13 }}>{'\uD83C\uDFEB'}</span>
                              <span style={{ fontSize: 12, fontWeight: 720, color: '#60a5fa' }}>NCERT Textbooks</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {ncerts.slice(0, 3).map((n, i) => (
                                <div key={`n-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, color: '#60a5fa',
                                    background: 'rgba(96,165,250,0.12)',
                                    padding: '2px 6px', borderRadius: 5, flexShrink: 0,
                                    marginTop: 1,
                                  }}>Class {n.class}</span>
                                  <div>
                                    <span style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3, display: 'block' }}>
                                      {n.title}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', lineHeight: 1.5 }}>
                                      {n.chapters}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Government Sources */}
                        {govSources.length > 0 && (
                          <div style={{
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(52,211,153,0.04), rgba(52,211,153,0.01))',
                            border: '1px solid rgba(52,211,153,0.12)',
                            animation: `tds-cardIn 0.3s ease ${0.9 + (books.length + 1) * 0.04}s both`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 13 }}>{'\uD83C\uDFDB\uFE0F'}</span>
                              <span style={{ fontSize: 12, fontWeight: 720, color: '#34d399' }}>Government Sources</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {govSources.slice(0, 4).map((g, i) => (
                                <div key={`g-${i}`} style={{
                                  padding: '6px 10px', borderRadius: 10,
                                  background: 'rgba(52,211,153,0.06)',
                                  border: '1px solid rgba(52,211,153,0.12)',
                                }}>
                                  <span style={{ fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.70)', display: 'block', lineHeight: 1.3 }}>
                                    {g.title}
                                  </span>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                                    {g.frequency}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* J. Key Takeaways */}
                {notes.keyTakeaways && notes.keyTakeaways.length > 0 && (
                  <div ref={sectionRefs.keyTakeaways} style={{
                    marginBottom: 24,
                    padding: '16px 16px 16px 18px',
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(52,211,153,0.05) 0%, rgba(52,211,153,0.02) 100%)',
                    border: '1px solid rgba(52,211,153,0.12)',
                    position: 'relative', overflow: 'hidden',
                    animation: 'tds-cardIn 0.3s ease 0.55s both',
                  }}>
                    <div style={{
                      position: 'absolute', left: 0, top: 12, bottom: 12, width: 3,
                      background: 'linear-gradient(180deg, #34d399, #34d39966)',
                      borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(52,211,153,0.10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      }}>{'\u2705'}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: '#34d399',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>Remember This</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {notes.keyTakeaways.map((takeaway, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 6,
                            background: 'rgba(52,211,153,0.12)',
                            border: '1px solid rgba(52,211,153,0.20)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 2,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.80)', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
                            {renderRichText(takeaway, '#34d399')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* K. Connections */}
                {notes.connections && (
                  <div ref={sectionRefs.connectedTopics} style={{
                    marginBottom: 16, padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round">
                        <circle cx="12" cy="12" r="3" /><path d="M12 3v6m0 6v6M3 12h6m6 0h6" />
                      </svg>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.40)',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>Connected Topics</span>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.9, color: 'rgba(255,255,255,0.50)', margin: 0, WebkitFontSmoothing: 'antialiased' as const }}>
                      {renderRichText(notes.connections, color)}
                    </p>
                  </div>
                )}
              </>
              )
            })()}

            {/* Fallback: API failed, show concepts */}
            {!notesLoading && !notes && (
              <div style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.88)',
                    margin: '0 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{'\uD83D\uDCD6'}</span> Key Areas to Cover
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topic.concepts.map((concept, idx) => (
                    <div
                      key={concept}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.025)',
                        borderLeft: `3px solid ${color}60`,
                        animation: `tds-cardIn 0.3s ease ${0.25 + idx * 0.06}s both`,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          flexShrink: 0,
                          background: `${color}15`,
                          color: `${color}cc`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                        {concept}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Spacer so sticky popup area doesn't overlap content */}
          {activeHighlight && <div style={{ height: 16 }} />}

          {/* 10. Knowledge Level Section */}
          {hasProgress && (
            <div style={{ padding: '0 20px' }}>
              <div
                style={{
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: 'tds-cardIn 0.35s ease 0.3s both',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.30)',
                    margin: '0 0 12px',
                  }}
                >
                  Your Progress
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Knowledge level ring — center shows the current level
                      number rather than the old crown glyph. */}
                  <div style={{ flexShrink: 0, position: 'relative' as const, width: ringSize, height: ringSize }}>
                    <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={ringStroke}
                      />
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        fill="none"
                        stroke={CROWN_COLORS[crown]}
                        strokeWidth={ringStroke}
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={crown >= 5 ? 0 : ringOffset}
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute' as const,
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        color: CROWN_COLORS[crown],
                      }}
                      aria-label={`Knowledge Level ${crown} of 5`}
                    >
                      <span style={{
                        fontSize: 7, fontWeight: 800,
                        letterSpacing: '0.08em', opacity: 0.75,
                        textTransform: 'uppercase', marginBottom: 1,
                      }}>
                        LV
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {crown}/5
                      </span>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: CROWN_COLORS[crown] }}>
                        Level {crown}/5
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color:
                            accuracy >= 70
                              ? '#34d399'
                              : accuracy >= 40
                                ? '#fbbf24'
                                : '#f87171',
                        }}
                      >
                        {accuracy}% accuracy
                      </span>
                    </div>

                    {crown < 5 && (
                      <div
                        style={{
                          height: 8,
                          borderRadius: 99,
                          overflow: 'hidden',
                          marginBottom: 6,
                          background: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: 99,
                            width: `${progressPct}%`,
                            background: `linear-gradient(90deg, ${CROWN_COLORS[crown]}, ${CROWN_COLORS[nextCrown]})`,
                            boxShadow: `0 0 8px ${CROWN_COLORS[crown]}40`,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    )}

                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                      {(() => {
                        // Use unique seen DB IDs (not cumulative answers, which
                        // counts re-attempts and can exceed dbQuestionCount).
                        const seen = (progress.seenQuestionIds?.length) || 0
                        const total = dbQuestionCount || 0
                        if (crown >= 5) return 'Legendary mastery achieved'
                        if (total === 0) {
                          // No DB pool — fall back to plain attempt count.
                          return `${progress.questionsAnswered} ${progress.questionsAnswered === 1 ? 'question' : 'questions'} attempted`
                        }
                        const capped = Math.min(seen, total)
                        if (capped >= total) return `All ${total} PYQs attempted`
                        return `${capped} of ${total} PYQs attempted`
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 11. Sticky bottom CTA */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, rgba(10,10,20,0.95), rgba(10,10,20,0.80))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          <button
            onClick={onStartPractice}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 52, borderRadius: 14,
              fontSize: 14, fontWeight: 800, letterSpacing: '0.03em',
              cursor: 'pointer',
              // The previous "completed" outline style was nearly
              // invisible (3% bg, 10% border, 50% text, no shadow).
              // Both states now use a clearly visible filled subject-
              // color treatment. For the completed state we mute the
              // gradient slightly and add a subject-color glow so it
              // still reads as "you've already done this once" without
              // disappearing into the sheet background.
              border: 'none',
              color: '#fff',
              background: buttonIsOutline
                ? `linear-gradient(135deg, ${color}cc, ${color}aa)`
                : `linear-gradient(135deg, ${color}dd, ${color})`,
              boxShadow: buttonIsOutline
                ? `0 6px 20px ${color}40, 0 1px 0 rgba(255,255,255,0.18) inset`
                : `0 4px 20px ${color}30, 0 1px 0 rgba(255,255,255,0.10) inset`,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {buttonIsOutline && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                <path d="M21 3v6h-6" />
              </svg>
            )}
            {buttonLabel}
          </button>
        </div>
      </div>

      {/* ── Key Term Popup (fixed overlay above sheet) ──────────────────── */}
      {activeHighlight && (
        <>
          {/* Dim backdrop — tap to dismiss */}
          <div
            onClick={() => setActiveHighlight(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 90,
              background: 'rgba(0,0,0,0.45)',
              animation: 'tds-termBackdrop 0.15s ease both',
            }}
          />

          {/* Floating card */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 91,
              padding: '0 12px',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              animation: 'tds-termPopUp 0.28s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            <div style={{
              maxWidth: 420,
              margin: '0 auto',
              borderRadius: 22,
              overflow: 'hidden',
              background: 'linear-gradient(170deg, rgba(22,22,42,0.99), rgba(12,12,24,0.99))',
              border: `1.5px solid ${color}35`,
              boxShadow: `
                0 -4px 48px rgba(0,0,0,0.65),
                0 0 0 1px rgba(255,255,255,0.06),
                0 0 40px ${color}12,
                inset 0 1px 0 rgba(255,255,255,0.06)
              `,
            }}>
              {/* Color accent bar at top */}
              <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${color}, ${color}60, transparent)`,
              }} />

              <div style={{ padding: '18px 20px 20px' }}>
                {/* Header row: term badge + UPSC label + close */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 14,
                }}>
                  {/* Book icon */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>

                  {/* Term name */}
                  <span style={{
                    fontSize: 15, fontWeight: 750,
                    color: '#f0f0ff',
                    flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {activeHighlight.term}
                  </span>

                  {/* UPSC badge */}
                  <span style={{
                    padding: '3px 8px', borderRadius: 6,
                    background: 'rgba(251,191,36,0.10)',
                    border: '1px solid rgba(251,191,36,0.22)',
                    fontSize: 9, fontWeight: 800, color: '#fbbf24',
                    letterSpacing: '0.08em',
                    flexShrink: 0,
                  }}>
                    UPSC
                  </span>

                  {/* Close button */}
                  <button
                    onClick={() => setActiveHighlight(null)}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.4)', fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >{'\u2715'}</button>
                </div>

                {/* Divider */}
                <div style={{
                  height: 1, marginBottom: 14,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03), transparent)',
                }} />

                {/* Explanation text */}
                <p style={{
                  fontSize: 14, lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.82)',
                  margin: 0,
                  letterSpacing: '0.005em',
                }}>
                  {activeHighlight.explanation}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
