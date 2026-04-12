'use client'

interface AIGuideOverlayProps {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'doubt' | 'answering' | 'complete'
  subtitle: string
  currentSectionIdx: number
  totalSections: number
  subjectColor: string
  onPause: () => void
  onResume: () => void
  onStartDoubt: () => void
  onStopDoubt: () => void
  onClose: () => void
  onStartPractice: () => void
}

export default function AIGuideOverlay({
  state,
  subtitle,
  currentSectionIdx,
  totalSections,
  subjectColor,
  onPause,
  onResume,
  onStartDoubt,
  onStopDoubt,
  onClose,
  onStartPractice,
}: AIGuideOverlayProps) {
  if (state === 'idle' || state === 'loading') return null

  const isPlaying = state === 'playing'
  const isPaused = state === 'paused'
  const isDoubt = state === 'doubt'
  const isAnswering = state === 'answering'
  const isComplete = state === 'complete'

  const subtitleText =
    isDoubt ? '🎤 Listening...' :
    isAnswering ? '🤔 Thinking...' :
    (isPlaying || isPaused) ? `"${subtitle}"` :
    null

  return (
    <>
      <style>{`
        @keyframes aig-slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes aig-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes aig-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes aig-dotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.4); }
        }
        @keyframes aig-wave {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
      `}</style>

      {/* Narration subtitle at top */}
      {subtitleText && !isComplete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 200,
            display: 'flex',
            justifyContent: 'center',
            padding: '48px 20px 24px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
            animation: 'aig-fadeIn 0.3s ease',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              textAlign: 'center',
              maxWidth: 340,
              lineHeight: 1.5,
              margin: 0,
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}
          >
            {subtitleText}
          </p>
        </div>
      )}

      {/* Floating bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 90,
          left: 12,
          right: 12,
          zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 20,
          padding: '12px 16px',
          animation: 'aig-slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {!isComplete ? (
          /* Control row */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {/* Play/Pause button */}
            <button
              onClick={isPlaying || isAnswering ? onPause : onResume}
              disabled={isDoubt || isAnswering}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: subjectColor,
                color: '#fff',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isDoubt || isAnswering ? 'not-allowed' : 'pointer',
                opacity: isDoubt || isAnswering ? 0.5 : 1,
                flexShrink: 0,
                transition: 'opacity 0.2s',
              }}
            >
              {isPlaying || isAnswering ? '⏸' : '▶️'}
            </button>

            {/* Progress dots */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              {Array.from({ length: totalSections }, (_, i) => {
                const isCompleted = i < currentSectionIdx
                const isCurrent = i === currentSectionIdx
                return (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isCompleted
                        ? subjectColor
                        : isCurrent
                          ? subjectColor
                          : 'rgba(255,255,255,0.15)',
                      animation: isCurrent ? 'aig-dotPulse 1.2s ease-in-out infinite' : undefined,
                      transition: 'background 0.3s',
                    }}
                  />
                )
              })}
            </div>

            {/* Mic button — push to talk */}
            <button
              onTouchStart={onStartDoubt}
              onTouchEnd={onStopDoubt}
              onMouseDown={onStartDoubt}
              onMouseUp={onStopDoubt}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: isDoubt ? '#ef4444' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              {isDoubt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 3,
                        height: 4,
                        borderRadius: 2,
                        background: '#fff',
                        animation: `aig-wave 0.6s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                '🎤'
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          /* Practice CTA when complete */
          <button
            onClick={onStartPractice}
            style={{
              width: '100%',
              padding: '14px 20px',
              border: 'none',
              borderRadius: 14,
              background: `linear-gradient(135deg, ${subjectColor}, ${subjectColor}dd)`,
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              animation: 'aig-breathe 2s infinite',
              boxShadow: `0 4px 20px ${subjectColor}66`,
              letterSpacing: 0.3,
            }}
          >
            🎯 Start Practice →
          </button>
        )}
      </div>
    </>
  )
}
