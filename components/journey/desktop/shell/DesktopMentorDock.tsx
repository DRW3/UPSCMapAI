// components/journey/desktop/shell/DesktopMentorDock.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

const TAB_HINTS: Record<string, string> = {
  home: "Start your next topic or change your focus subjects to adjust your plan.",
  path: "Tap any topic to open study notes. Green topics are done, amber ones need focus.",
  practice: "Your weakest topics are shown first. Pick one to practice real PYQs.",
  profile: "Track your journey — stats, streaks, and subject progress all in one place.",
}

interface Props {
  state: JourneyStateValue
}

export function DesktopMentorDock({ state }: Props) {
  const { dailyTip, progress, continueTarget, activeTab } = state
  const totalAnswered = Object.values(progress.topics).reduce((s, t) => s + (t.questionsAnswered || 0), 0)
  const totalCorrect = Object.values(progress.topics).reduce((s, t) => s + (t.correctAnswers || 0), 0)
  const acc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  return (
    <aside
      style={{
        height: '100%',
        padding: '24px 18px',
        borderLeft: '1px solid rgba(167,139,250,0.08)',
        background: 'rgba(5,5,16,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', gap: 16,
        overflow: 'hidden',
      }}
    >
      {/* Compact AI orb + label row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 8,
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

      {/* Screen-contextual hint — changes per tab */}
      <div style={{
        fontSize: 12, lineHeight: 1.55,
        color: 'rgba(255,255,255,0.65)',
        padding: '10px 14px',
        borderRadius: 12,
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.15)',
        marginBottom: 10,
      }}>
        {TAB_HINTS[activeTab] ?? TAB_HINTS.home}
      </div>

      {/* Daily tip — typewriter not needed; just show the text */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        fontSize: 13, lineHeight: 1.65,
        color: 'rgba(255,255,255,0.78)',
        padding: '14px 16px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(167,139,250,0.18)',
        position: 'relative',
      }}>
        {dailyTip ? dailyTip : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.40)',
            fontSize: 12,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              border: '2px solid rgba(167,139,250,0.20)',
              borderTopColor: '#a78bfa',
              animation: 'dj-rotate 0.8s linear infinite',
            }} />
            Mentor is thinking…
          </div>
        )}
      </div>

      {/* Quick stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Accuracy', value: `${acc}%`, color: '#34d399' },
          { label: 'Questions', value: String(totalAnswered), color: '#67e8f9' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 16, fontWeight: 800,
              background: `linear-gradient(135deg, #fff, ${stat.color})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>{stat.value}</div>
            <div style={{
              fontSize: 9, fontWeight: 700,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Optional: continue target — shows next step in the dock */}
      {continueTarget && (
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.42)',
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(99,102,241,0.04)',
          border: '1px dashed rgba(99,102,241,0.20)',
        }}>
          Next: <span style={{ color: '#c4b5fd', fontWeight: 700 }}>{continueTarget.topic.title}</span>
        </div>
      )}
    </aside>
  )
}
