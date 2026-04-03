'use client'

import { useEffect, useState } from 'react'

interface CelebrationOverlayProps {
  completedTopicTitle: string
  nextTopicTitle: string
  nextTopicIcon: string
  subjectColor: string
  onDismiss: () => void
}

// ---------------------------------------------------------------------------
// Confetti helpers
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  '#FFD700', '#FF6B9D', '#A855F7', '#22D3EE', '#34D399', '#FFFFFF',
  '#FCD34D', '#F472B6', '#818CF8', '#2DD4BF', '#86EFAC', '#FDE68A',
]

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

interface ConfettiParticle {
  id: number
  color: string
  size: number
  aspect: number       // height multiplier (0.5–1)
  angle: number        // degrees, direction of travel
  distance: number     // how far it flies
  rotation: number     // end rotation
  delay: number        // stagger
  duration: number
}

function generateConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: randomBetween(6, 12),
    aspect: randomBetween(0.5, 1),
    angle: (360 / count) * i + randomBetween(-15, 15),
    distance: randomBetween(90, 200),
    rotation: randomBetween(180, 720) * (Math.random() > 0.5 ? 1 : -1),
    delay: randomBetween(0, 0.25),
    duration: randomBetween(0.7, 1.2),
  }))
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CelebrationOverlay({
  completedTopicTitle,
  nextTopicTitle,
  nextTopicIcon,
  subjectColor,
  onDismiss,
}: CelebrationOverlayProps) {
  const [confetti] = useState(() => generateConfetti(24))
  const [visible, setVisible] = useState(true)

  // Auto-dismiss after 2200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 2200)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const rgb = hexToRgb(subjectColor)

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes cel-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cel-fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cel-starPop {
          0%   { opacity: 0; transform: scale(0) rotate(-180deg); }
          60%  { opacity: 1; transform: scale(1.15) rotate(15deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes cel-ring {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.7; }
          70%  { opacity: 0.25; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        ${confetti.map(p => `
        @keyframes cel-confetti-${p.id} {
          0% {
            transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%,-50%) translate(${Math.cos(p.angle * Math.PI / 180) * p.distance}px, ${Math.sin(p.angle * Math.PI / 180) * p.distance}px) rotate(${p.rotation}deg) scale(0.3);
            opacity: 0;
          }
        }
        `).join('')}
      `}</style>

      {/* Full-screen overlay */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5,5,16,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'cel-fadeIn 0.2s ease-out both',
          cursor: 'pointer',
        }}
      >
        {/* ---- Ring bursts ---- */}
        {[0, 1, 2].map(i => (
          <div
            key={`ring-${i}`}
            style={{
              position: 'absolute',
              top: '42%',
              left: '50%',
              width: 300 + i * 60,
              height: 300 + i * 60,
              borderRadius: '50%',
              border: `2px solid rgba(${rgb}, ${0.35 - i * 0.08})`,
              boxShadow: `0 0 20px rgba(${rgb}, ${0.15 - i * 0.03})`,
              pointerEvents: 'none',
              animation: `cel-ring ${0.9 + i * 0.2}s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 + i * 0.12}s both`,
            }}
          />
        ))}

        {/* ---- Confetti particles ---- */}
        {confetti.map(p => (
          <div
            key={`confetti-${p.id}`}
            style={{
              position: 'absolute',
              top: '42%',
              left: '50%',
              width: p.size,
              height: p.size * p.aspect,
              borderRadius: p.id % 3 === 0 ? '50%' : 2,
              background: p.color,
              pointerEvents: 'none',
              animation: `cel-confetti-${p.id} ${p.duration}s cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}s both`,
            }}
          />
        ))}

        {/* ---- Content container ---- */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 340,
            width: '100%',
            padding: '0 20px',
            position: 'relative',
          }}
        >
          {/* Star */}
          <div
            style={{
              fontSize: 56,
              lineHeight: 1,
              animation: 'cel-starPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
              filter: `drop-shadow(0 0 20px rgba(${rgb}, 0.6))`,
              marginBottom: 12,
            }}
          >
            ✦
          </div>

          {/* Topic Complete! */}
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              animation: 'cel-fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
              textShadow: `0 0 30px rgba(${rgb}, 0.4)`,
            }}
          >
            Topic Complete!
          </h2>

          {/* Completed topic name */}
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 14,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center',
              animation: 'cel-fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both',
              maxWidth: 280,
              lineHeight: 1.4,
            }}
          >
            {completedTopicTitle}
          </p>

          {/* ---- Up Next card ---- */}
          <div
            style={{
              marginTop: 28,
              width: '100%',
              animation: 'cel-fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both',
            }}
          >
            <p
              style={{
                margin: '0 0 10px',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
              }}
            >
              Up Next
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid rgba(${rgb}, 0.3)`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 16px rgba(${rgb}, 0.08)`,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `rgba(${rgb}, 0.12)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {nextTopicIcon}
              </div>

              {/* Title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nextTopicTitle}
                </p>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `rgba(${rgb}, 0.15)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: subjectColor,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                →
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
