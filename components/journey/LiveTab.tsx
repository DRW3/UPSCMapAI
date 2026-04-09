'use client'

import { useEffect, useState } from 'react'

// ── Types — superset of both API response shapes ──────────────────────

type GsPaper = 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'CA'
type Source = 'hindu' | 'ie'

interface NewsArticle {
  source: Source
  title: string
  url: string
  desk: string
  page: string                       // print page no — Hindu only
  teaser: string                     // publisher-supplied — Hindu only
  image: string | null
  inPrint?: boolean                  // IE-only flag — true if also in IE Today's Paper
  publishedHHmm?: string             // IE-only — IST timestamp
  score: number
  gs: GsPaper
  gsTopic: string
  prepType: 'prelims' | 'mains' | 'both'
  whyItMatters: string
  readMinutes: number
}

interface ApiResponse {
  articles: Omit<NewsArticle, 'source'>[]
  cached?: boolean
  stale?: boolean
  error?: string
}

// ── GS paper colour palette — distinct enough that the eye sorts cards
//     into buckets without reading the label. Matches the philosophy
//     described in the LiveTab build-out: yellow for GS-1, indigo for
//     GS-2, green for GS-3, purple for GS-4, cyan for general CA. ─────
const GS_COLOR: Record<GsPaper, { bg: string; text: string; border: string; glow: string }> = {
  'GS-1': { bg: 'rgba(251,191,36,0.18)', text: '#fde68a', border: 'rgba(251,191,36,0.45)', glow: 'rgba(251,191,36,0.30)' },
  'GS-2': { bg: 'rgba(129,140,248,0.20)', text: '#c7d2fe', border: 'rgba(129,140,248,0.50)', glow: 'rgba(129,140,248,0.30)' },
  'GS-3': { bg: 'rgba(52,211,153,0.18)', text: '#a7f3d0', border: 'rgba(52,211,153,0.45)', glow: 'rgba(52,211,153,0.30)' },
  'GS-4': { bg: 'rgba(167,139,250,0.18)', text: '#e9d5ff', border: 'rgba(167,139,250,0.45)', glow: 'rgba(167,139,250,0.30)' },
  CA:     { bg: 'rgba(6,182,212,0.18)',   text: '#a5f3fc', border: 'rgba(6,182,212,0.45)',   glow: 'rgba(6,182,212,0.30)' },
}

const PREP_LABEL: Record<NewsArticle['prepType'], { icon: string; label: string }> = {
  prelims: { icon: '📋', label: 'Prelims' },
  mains:   { icon: '✍️', label: 'Mains' },
  both:    { icon: '🎯', label: 'Both' },
}

// ── Live tab ───────────────────────────────────────────────────────────

export default function LiveTab() {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Fetch both papers in parallel. Promise.allSettled so one paper
    // failing doesn't blank the entire feed.
    Promise.allSettled([
      fetch('/api/news/hindu-today').then(r => r.json() as Promise<ApiResponse>),
      fetch('/api/news/ie-today').then(r => r.json() as Promise<ApiResponse>),
    ])
      .then(([hinduRes, ieRes]) => {
        if (cancelled) return

        const merged: NewsArticle[] = []
        if (hinduRes.status === 'fulfilled' && Array.isArray(hinduRes.value.articles)) {
          for (const a of hinduRes.value.articles) merged.push({ ...a, source: 'hindu' })
        }
        if (ieRes.status === 'fulfilled' && Array.isArray(ieRes.value.articles)) {
          for (const a of ieRes.value.articles) merged.push({ ...a, source: 'ie' })
        }

        // Sort by score (highest first). Print-edition articles already
        // got their +5 boost in their respective API routes.
        merged.sort((a, b) => b.score - a.score)

        // Cross-source dedupe by URL and by title-token Jaccard.
        const seenUrls = new Set<string>()
        const seenTokens: Set<string>[] = []
        const tokens = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) || []))
        const jaccard = (a: Set<string>, b: Set<string>) => {
          if (!a.size || !b.size) return 0
          const arrA = Array.from(a)
          let inter = 0
          for (let i = 0; i < arrA.length; i++) if (b.has(arrA[i])) inter++
          return inter / (a.size + b.size - inter)
        }
        const final: NewsArticle[] = []
        for (const a of merged) {
          if (seenUrls.has(a.url)) continue
          const t = tokens(a.title)
          if (seenTokens.some(prev => jaccard(prev, t) >= 0.55)) continue
          seenUrls.add(a.url)
          seenTokens.push(t)
          final.push(a)
          if (final.length >= 25) break
        }

        const allErrors: string[] = []
        if (hinduRes.status === 'rejected') allErrors.push('Hindu: ' + String(hinduRes.reason))
        if (ieRes.status === 'rejected') allErrors.push('IE: ' + String(ieRes.reason))
        if (allErrors.length && final.length === 0) setError(allErrors.join(' · '))

        setArticles(final)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(String(e))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      paddingBottom: 24,
    }}>
      <style>{`
        @keyframes lt-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lt-shimmer {
          0%, 100% { background-position: -200% 0; }
          100%     { background-position: 200% 0; }
        }
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase',
            marginBottom: 3,
          }}>
            Today&apos;s Newspaper
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 12px rgba(52,211,153,0.85)',
              animation: 'lt-shimmer 2s linear infinite',
            }} />
            Live · Hindu + Indian Express
          </div>
        </div>
        {articles && (
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '6px 10px', borderRadius: 9,
          }}>
            {articles.length} curated
          </div>
        )}
      </div>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      {loading && <LoadingSkeleton />}

      {error && !loading && (
        <div style={{
          margin: '20px 16px', padding: 16, borderRadius: 14,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.20)',
          color: 'rgba(248,113,113,0.85)', fontSize: 13, lineHeight: 1.5,
        }}>
          Couldn&apos;t load today&apos;s paper. {error}
        </div>
      )}

      {!loading && !error && articles && articles.length === 0 && (
        <div style={{
          margin: '40px 16px', textAlign: 'center',
          color: 'rgba(255,255,255,0.40)', fontSize: 13,
        }}>
          No relevant articles in today&apos;s edition yet. Check back after 7:00 AM IST.
        </div>
      )}

      {!loading && !error && articles && articles.length > 0 && (
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map((a, i) => (
            <ArticleCard key={a.url} article={a} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────

function ArticleCard({ article, index }: { article: NewsArticle; index: number }) {
  const gsColor = GS_COLOR[article.gs]
  const prep = PREP_LABEL[article.prepType]

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        animation: `lt-fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) ${0.06 * index}s both`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Top accent line in the GS-paper colour */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${gsColor.border}, transparent)`,
      }} />

      <div style={{ display: 'flex', gap: 12, padding: 12 }}>
        {/* ── Left: image (or fallback gradient tile) ──────────── */}
        <div style={{
          width: 86, height: 86, borderRadius: 12, flexShrink: 0,
          overflow: 'hidden', position: 'relative',
          background: `linear-gradient(135deg, ${gsColor.bg}, rgba(0,0,0,0.4))`,
          border: `1px solid ${gsColor.border}`,
          boxShadow: `0 0 16px ${gsColor.glow}`,
        }}>
          {article.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image}
              alt=""
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, opacity: 0.55, color: gsColor.text,
            }}>
              📰
            </div>
          )}
        </div>

        {/* ── Right: content ─────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top row: GS pill + Prep type + source/print badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 6, flexWrap: 'wrap', rowGap: 4,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 7,
              background: gsColor.bg,
              border: `1px solid ${gsColor.border}`,
              fontSize: 9, fontWeight: 800,
              color: gsColor.text,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              {article.gs} · {article.gsTopic}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, lineHeight: 1 }}>{prep.icon}</span>
              {prep.label}
            </span>
            {/* IE-only print-edition badge — surfaces "★ in today's
                print" so the eye spots editor-curated print articles
                instantly. Only present when /api/news/ie-today
                returned inPrint: true (cross-referenced against IE
                Today's Paper HTML). */}
            {article.inPrint && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '3px 7px', borderRadius: 6,
                background: 'rgba(251,191,36,0.16)',
                border: '1px solid rgba(251,191,36,0.42)',
                fontSize: 9, fontWeight: 800,
                color: '#fde68a',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                ★ Print
              </span>
            )}
            {/* Page number for The Hindu (print index gives this) */}
            {article.page && (
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: 'rgba(255,255,255,0.32)',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}>
                pg {article.page}
              </span>
            )}
            {/* Source pill (always present, right-aligned) */}
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: article.source === 'hindu' ? '#fca5a5' : '#fcd34d',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              marginLeft: 'auto', flexShrink: 0,
              opacity: 0.85,
            }}>
              {article.source === 'hindu' ? 'The Hindu' : 'Indian Express'}
            </span>
          </div>

          {/* Title — 2 lines max */}
          <div style={{
            fontSize: 13.5, fontWeight: 700,
            color: 'rgba(255,255,255,0.94)',
            lineHeight: 1.32, letterSpacing: '-0.01em',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 4,
          }}>
            {article.title}
          </div>

          {/* Why it matters — 1 line */}
          <div style={{
            fontSize: 10.5, fontStyle: 'italic',
            color: 'rgba(255,255,255,0.50)',
            lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 6,
          }}>
            {article.whyItMatters}
          </div>

          {/* Footer: read time + IE timestamp (if present) + chevron */}
          <div style={{
            marginTop: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 9, fontWeight: 700,
            color: 'rgba(255,255,255,0.38)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <span>⏱ {article.readMinutes} min</span>
            {article.publishedHHmm && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{article.publishedHHmm}</span>
              </>
            )}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, color: gsColor.text }}>
              Read
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}

// ── Loading skeleton (4 cards) ─────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 12,
          display: 'flex', gap: 12,
          opacity: 0,
          animation: `lt-fadeUp 0.4s ease ${0.05 * i}s forwards`,
        }}>
          <div style={{
            width: 86, height: 86, borderRadius: 12,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
            backgroundSize: '200% 100%',
            animation: 'lt-shimmer 1.6s linear infinite',
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 12, width: '40%', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ height: 14, width: '90%', borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ height: 14, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ height: 10, width: '55%', borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginTop: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
