// components/journey/desktop/chrome/HoloFrame.tsx
'use client'

import type { CSSProperties, ReactNode } from 'react'

interface HoloFrameProps {
  children: ReactNode
  /** Border gradient stops — defaults to indigo→cyan→violet→pink */
  gradient?: string
  /** Outer rotation period in seconds */
  speed?: number
  /** Inner background — defaults to opaque #07071a */
  innerBackground?: string
  /** Border radius (frame) */
  radius?: number
  /** Padding of the inner panel */
  padding?: number | string
  /** Frame thickness */
  thickness?: number
  /** Optional className passed to the outer wrapper */
  className?: string
  /** Inline style override for the inner panel */
  innerStyle?: CSSProperties
}

const DEFAULT_GRADIENT =
  'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)'

export function HoloFrame({
  children,
  gradient = DEFAULT_GRADIENT,
  speed = 12,
  innerBackground = '#07071a',
  radius = 18,
  padding = 18,
  thickness = 1.5,
  className,
  innerStyle,
}: HoloFrameProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: radius,
        padding: thickness,
        background: gradient,
        animation: `dj-rotate ${speed}s linear infinite, dj-pulse ${speed * 0.5}s ease-in-out infinite`,
      }}
    >
      <div
        style={{
          background: innerBackground,
          borderRadius: radius - thickness,
          padding,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          ...innerStyle,
        }}
      >
        {children}
      </div>
    </div>
  )
}
