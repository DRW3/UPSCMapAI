'use client'

type AIGuideState = 'idle' | 'loading' | 'playing' | 'paused' | 'doubt' | 'answering' | 'complete'

interface AIGuideButtonProps {
  state: AIGuideState
  onStart: () => void
  subjectColor: string
}

export default function AIGuideButton({ state, onStart, subjectColor }: AIGuideButtonProps) {
  if (state !== 'idle' && state !== 'loading') return null

  const isLoading = state === 'loading'

  return (
    <>
      <style>{`
        @keyframes aig-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes aig-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <button
        onClick={isLoading ? undefined : onStart}
        disabled={isLoading}
        style={{
          position: 'relative',
          width: '100%',
          height: 56,
          borderRadius: 16,
          background: `${subjectColor}26`,
          border: `1px solid ${subjectColor}30`,
          cursor: isLoading ? 'default' : 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '0 20px',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Shimmer overlay — only when idle */}
        {!isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              borderRadius: 16,
              opacity: 0.15,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(90deg, transparent 25%, ${subjectColor}60 50%, transparent 75%)`,
                backgroundSize: '200% 100%',
                animation: 'aig-shimmer 2.5s linear infinite',
              }}
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2.5px solid ${subjectColor}30`,
                borderTop: `2.5px solid ${subjectColor}`,
                animation: 'aig-spin 0.8s linear infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.70)',
              }}
            >
              Preparing your guide...
            </span>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              ✨ AI Guided Learning
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              Learn with your AI mentor
            </span>
          </div>
        )}
      </button>
    </>
  )
}
