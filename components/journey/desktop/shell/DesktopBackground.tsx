// components/journey/desktop/shell/DesktopBackground.tsx
'use client'

// Animated background for the desktop shell. Three layers:
//
//   1. Static SVG grid mesh that slowly pans diagonally (dj-meshPan)
//   2. Three large blurred radial orbs that breathe (dj-orbBreathe)
//   3. ~24 fixed-position twinkling stars (dj-twinkle)
//
// All layers are pointer-events:none and live behind the shell content
// at z-index 0.

export function DesktopBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at top, #0a0a18 0%, #050510 60%, #030308 100%)',
      }}
    >
      {/* Layer 1 — SVG grid mesh, panning */}
      <svg
        width="200%" height="200%"
        style={{
          position: 'absolute', top: '-50%', left: '-50%',
          opacity: 0.10,
          animation: 'dj-meshPan 24s linear infinite',
        }}
      >
        <defs>
          <pattern id="dj-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dj-grid)" />
      </svg>

      {/* Layer 2 — three breathing orbs */}
      <div style={{
        position: 'absolute', top: '5%', left: '12%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'dj-orbBreathe 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '25%', right: '8%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,232,249,0.18) 0%, rgba(103,232,249,0.05) 40%, transparent 70%)',
        filter: 'blur(44px)',
        animation: 'dj-orbBreathe 9s ease-in-out infinite',
        animationDelay: '2s',
      }} />
      <div style={{
        position: 'absolute', bottom: '8%', left: '32%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,114,182,0.16) 0%, rgba(244,114,182,0.04) 40%, transparent 70%)',
        filter: 'blur(48px)',
        animation: 'dj-orbBreathe 10s ease-in-out infinite',
        animationDelay: '4s',
      }} />

      {/* Layer 3 — twinkling stars */}
      {STAR_FIELD.map((s, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 6px rgba(255,255,255,0.85)',
            opacity: 0.4,
            animation: `dj-twinkle ${2.5 + (i % 4) * 0.4}s ease-in-out infinite`,
            animationDelay: `${(i * 0.13).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  )
}

// 24 fixed star positions — deterministic, not random, so the layout
// doesn't shift between renders.
const STAR_FIELD = [
  { top: '6%',  left: '10%', size: 1.5 },
  { top: '12%', left: '78%', size: 1   },
  { top: '18%', left: '32%', size: 1.5 },
  { top: '22%', left: '55%', size: 1   },
  { top: '28%', left: '88%', size: 1.5 },
  { top: '34%', left: '14%', size: 1   },
  { top: '40%', left: '46%', size: 1.5 },
  { top: '46%', left: '72%', size: 1   },
  { top: '52%', left: '8%',  size: 1.5 },
  { top: '58%', left: '90%', size: 1   },
  { top: '64%', left: '28%', size: 1.5 },
  { top: '70%', left: '60%', size: 1   },
  { top: '76%', left: '12%', size: 1.5 },
  { top: '82%', left: '82%', size: 1   },
  { top: '88%', left: '40%', size: 1.5 },
  { top: '4%',  left: '52%', size: 1   },
  { top: '14%', left: '6%',  size: 1.5 },
  { top: '24%', left: '20%', size: 1   },
  { top: '36%', left: '94%', size: 1.5 },
  { top: '48%', left: '36%', size: 1   },
  { top: '62%', left: '76%', size: 1.5 },
  { top: '74%', left: '50%', size: 1   },
  { top: '86%', left: '18%', size: 1.5 },
  { top: '92%', left: '70%', size: 1   },
]
