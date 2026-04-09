// components/journey/desktop/shell/DesktopStatusBar.tsx
'use client'

import { useEffect, useState } from 'react'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

interface Props {
  state: JourneyStateValue
}

export function DesktopStatusBar({ state }: Props) {
  const { dailyTip, progress } = state
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      setTime(`${hh}:${mm}:${ss}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      height: 32,
      display: 'flex', alignItems: 'center',
      padding: '0 18px',
      borderTop: '1px solid rgba(167,139,250,0.08)',
      background: 'rgba(3,3,12,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 10, fontWeight: 600,
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: '0.02em',
    }}>
      {/* AI status dot */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: dailyTip ? '#34d399' : '#fb923c',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'currentColor',
          boxShadow: '0 0 6px currentColor',
          animation: 'dj-dotPulse 1.6s ease-in-out infinite',
        }} />
        AI {dailyTip ? 'ONLINE' : 'THINKING'}
      </span>

      <span style={{ margin: '0 12px', color: 'rgba(255,255,255,0.15)' }}>│</span>

      <span>Streak {progress.streak ?? 0}d</span>

      <span style={{ margin: '0 12px', color: 'rgba(255,255,255,0.15)' }}>│</span>

      <span>Topics done {Object.values(progress.topics).filter(t => t.state === 'completed').length}</span>

      <div style={{ flex: 1 }} />

      <span style={{ color: 'rgba(255,255,255,0.30)' }}>PadhAI v1 · {time}</span>
    </div>
  )
}
