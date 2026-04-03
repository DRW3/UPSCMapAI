'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import {
  type TopicProgress,
  type CrownLevel,
  QUESTIONS_PER_CROWN,
  CROWN_COLORS,
} from '@/components/journey/types'

// ── PYQ type ────────────────────────────────────────────────────────────────────

interface PYQ {
  id: number
  year: number
  question: string
  options: { a: string; b: string; c: string; d: string } | null
  answer: string | null
  explanation: string | null
  subject: string
  topic: string
  difficulty: string | null
  source?: string
}

// ── Props ───────────────────────────────────────────────────────────────────────

interface PracticeSheetProps {
  topic: LearningTopic
  subject: LearningSubject
  progress: TopicProgress
  hearts: number
  onClose: () => void
  onComplete: (result: {
    correct: number
    total: number
    newCrownLevel: CrownLevel
  }) => void
  onHeartLost: () => void
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function PracticeSheet({
  topic,
  subject,
  progress,
  hearts,
  onClose,
  onComplete,
  onHeartLost,
}: PracticeSheetProps) {
  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  // Quiz state
  const [pyqs, setPyqs] = useState<PYQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [localHearts, setLocalHearts] = useState(hearts)
  const [showExplanation, setShowExplanation] = useState(false)
  const [shakeWrong, setShakeWrong] = useState(false)

  // Consecutive correct streak
  const [streak, setStreak] = useState(0)
  const [streakPulse, setStreakPulse] = useState(false)

  // Drag-to-dismiss
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)
  const [dragTranslate, setDragTranslate] = useState(0)
  const isDragging = useRef(false)

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setSheetVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Fetch PYQs
  const fetchQuestions = useCallback(() => {
    setLoading(true)
    setError(false)
    const keywords = topic.concepts.slice(0, 4).join(',')
    fetch(
      `/api/journey/pyqs?subject=${subject.id}&topic=${topic.id}&keywords=${encodeURIComponent(keywords)}&limit=5`
    )
      .then((r) => r.json())
      .then((d) => {
        setPyqs(d.pyqs || [])
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [topic.id, subject.id, topic.concepts])

  useEffect(() => {
    if (sheetVisible) fetchQuestions()
  }, [sheetVisible, fetchQuestions])

  const current = pyqs[currentIdx]
  const isCorrect = revealed && selected === current?.answer
  const totalQuestions = pyqs.length
  const progressPercent = totalQuestions > 0 ? ((currentIdx + (revealed ? 1 : 0)) / totalQuestions) * 100 : 0

  // Calculate crown level result
  const calcNewCrownLevel = useCallback(
    (correctCount: number): CrownLevel => {
      const totalCorrect = progress.correctAnswers + correctCount
      const newLevel = Math.min(5, Math.floor(totalCorrect / QUESTIONS_PER_CROWN)) as CrownLevel
      return newLevel > progress.crownLevel ? newLevel : progress.crownLevel
    },
    [progress.correctAnswers, progress.crownLevel]
  )

  // Dismiss logic
  function handleDismiss() {
    setDismissing(true)
    setTimeout(() => onClose(), 350)
  }

  // Drag handlers for swipe-to-dismiss
  function handleDragStart(e: React.TouchEvent | React.MouseEvent) {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
    isDragging.current = true
  }

  function handleDragMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDragging.current) return
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const delta = Math.max(0, clientY - dragStartY.current)
    dragOffset.current = delta
    setDragTranslate(delta)
  }

  function handleDragEnd() {
    isDragging.current = false
    if (dragOffset.current > 150) {
      handleDismiss()
    } else {
      setDragTranslate(0)
    }
    dragOffset.current = 0
  }

  // Answer selection
  function handleSelect(opt: string) {
    if (revealed || localHearts <= 0) return
    setSelected(opt)
    setRevealed(true)

    const correct = opt === current?.answer
    const newScore = {
      correct: score.correct + (correct ? 1 : 0),
      total: score.total + 1,
    }
    setScore(newScore)

    if (correct) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak >= 2) {
        setStreakPulse(true)
        setTimeout(() => setStreakPulse(false), 500)
      }
    } else {
      const newHearts = localHearts - 1
      setLocalHearts(newHearts)
      onHeartLost()
      setShakeWrong(true)
      setTimeout(() => setShakeWrong(false), 600)
      setStreak(0)
    }
  }

  // Continue to next question or finish
  function handleContinue() {
    if (localHearts <= 0) {
      finishQuiz()
      return
    }

    if (currentIdx + 1 >= pyqs.length) {
      finishQuiz()
    } else {
      setCurrentIdx((i) => i + 1)
      setSelected(null)
      setRevealed(false)
      setShowExplanation(false)
    }
  }

  function finishQuiz() {
    setDone(true)
  }

  function handleFinish() {
    const newCrown = calcNewCrownLevel(score.correct)
    onComplete({
      correct: score.correct,
      total: score.total,
      newCrownLevel: newCrown,
    })
  }

  const optionLabels = ['a', 'b', 'c', 'd'] as const
  const isPerfect = done && score.correct === score.total && score.total > 0
  const crownedUp = done && calcNewCrownLevel(score.correct) > progress.crownLevel
  const newCrownLvl = calcNewCrownLevel(score.correct)

  return (
    <>
      {/* CSS Keyframe Animations */}
      <style jsx global>{`
        @keyframes ps-slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes ps-slideDown {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100%);
          }
        }
        @keyframes ps-fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes ps-fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes ps-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          50%,
          90% {
            transform: translateX(-4px);
          }
          30%,
          70% {
            transform: translateX(4px);
          }
        }
        @keyframes ps-popIn {
          0% {
            transform: scale(0.6);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes ps-feedbackSlide {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes ps-checkmark {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes ps-progressFill {
          from {
            width: 0%;
          }
        }
        @keyframes ps-starBurst {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.4) rotate(180deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
          }
        }
        @keyframes ps-confettiDot {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-30px) scale(0);
            opacity: 0;
          }
        }
        @keyframes ps-scoreCircle {
          from {
            stroke-dashoffset: 283;
          }
        }
        @keyframes ps-xpCount {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes ps-heartPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }
        @keyframes ps-crownGlow {
          0%,
          100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.5);
          }
        }
        @keyframes ps-streakPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.25);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80]"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          animation: dismissing ? 'ps-fadeOut 0.35s ease forwards' : 'ps-fadeIn 0.3s ease forwards',
        }}
        onClick={handleDismiss}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col"
        style={{
          height: '92vh',
          borderRadius: '24px 24px 0 0',
          background: 'linear-gradient(180deg, rgba(18,18,26,0.97) 0%, rgba(12,12,18,0.99) 100%)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderBottom: 'none',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          animation: dismissing
            ? 'ps-slideDown 0.35s ease forwards'
            : sheetVisible
            ? 'ps-slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards'
            : 'none',
          transform: sheetVisible && !dismissing ? `translateY(${dragTranslate}px)` : sheetVisible ? undefined : 'translateY(100%)',
          transition: isDragging.current ? 'none' : 'transform 0.3s ease',
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div
            className="rounded-full"
            style={{
              width: 40,
              height: 4,
              background: 'rgba(255,255,255,0.2)',
            }}
          />
        </div>

        {/* Quiz Header */}
        <div className="px-4 pb-3 flex flex-col gap-2">
          {/* Top row: close, XP, streak, hearts */}
          <div className="flex items-center justify-between">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>

            {/* Score Counter */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.1)' }}
            >
              <span className="text-[14px]">&#9989;</span>
              <span
                className="text-[13px] font-bold tabular-nums"
                style={{
                  color: '#34d399',
                }}
              >
                {score.correct}/{score.total}
              </span>
            </div>

            {/* Streak Counter (2c) */}
            {streak >= 2 && !done && (
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  animation: streakPulse ? 'ps-streakPulse 0.4s ease' : 'none',
                }}
              >
                <span className="text-[13px]">&#128293;</span>
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color: '#f87171' }}
                >
                  {streak}
                </span>
              </div>
            )}

            {/* Hearts */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="text-[16px]"
                  style={{
                    opacity: i < localHearts ? 1 : 0.2,
                    filter: i < localHearts ? 'none' : 'grayscale(1)',
                    animation:
                      i === localHearts && shakeWrong ? 'ps-heartPulse 0.4s ease' : 'none',
                  }}
                >
                  {i < localHearts ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {!done && (
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${subject.color}, ${subject.color}cc)`,
                  boxShadow: `0 0 8px ${subject.color}60`,
                }}
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: 'none', minHeight: 0 }}>
          {loading ? (
            <LoadingState color={subject.color} />
          ) : error && pyqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-center" style={{ height: '60%', padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;&#65039;</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
                Couldn&apos;t load questions
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
                Check your connection and try again
              </div>
              <button
                onClick={fetchQuestions}
                className="transition-all active:scale-[0.97]"
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : pyqs.length === 0 ? (
            <EmptyState topic={topic} subject={subject} onClose={handleDismiss} />
          ) : localHearts <= 0 && !done ? (
            <NoHeartsScreen onClose={handleDismiss} />
          ) : done ? (
            <ScoreScreen
              score={score}
              isPerfect={isPerfect}
              crownedUp={crownedUp}
              newCrownLvl={newCrownLvl}
              previousCrownLvl={progress.crownLevel}
              color={subject.color}
              onFinish={handleFinish}
              previousCorrectAnswers={progress.correctAnswers}
              previousQuestionsAnswered={progress.questionsAnswered}
            />
          ) : (
            /* Active Question */
            <div className="flex flex-col gap-4 pt-2">
              {/* Year badge + counter */}
              <div className="flex items-center gap-2">
                {current.year > 0 && (
                  <span
                    className="text-[11px] font-extrabold px-3 py-1 rounded-lg tracking-wide"
                    style={{
                      background: `${subject.color}18`,
                      color: subject.color,
                    }}
                  >
                    UPSC {current.year}
                  </span>
                )}
                {current.difficulty && (
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {current.difficulty}
                  </span>
                )}
                <span className="ml-auto text-[11px] text-white/25 font-medium">
                  {currentIdx + 1} / {pyqs.length}
                </span>
              </div>

              {/* Question text */}
              <p
                className="text-[16px] font-medium leading-[1.65] tracking-[-0.01em]"
                style={{ color: 'rgba(255,255,255,0.92)' }}
              >
                {current.question}
              </p>

              {/* Options */}
              {current.options && (
                <div className="flex flex-col gap-3 mt-1">
                  {optionLabels.map((opt) => {
                    const text = current.options?.[opt]
                    if (!text) return null

                    const isThisCorrect = opt === current.answer
                    const isThisSelected = opt === selected
                    const isThisWrong = revealed && isThisSelected && !isThisCorrect

                    // Determine visual state
                    let bg = 'rgba(255,255,255,0.03)'
                    let border = 'rgba(255,255,255,0.08)'
                    let textColor = 'rgba(255,255,255,0.78)'
                    let circleBg = 'rgba(255,255,255,0.08)'
                    let circleText = 'rgba(255,255,255,0.5)'

                    if (!revealed && isThisSelected) {
                      bg = `${subject.color}12`
                      border = `${subject.color}70`
                      textColor = 'rgba(255,255,255,0.92)'
                      circleBg = subject.color
                      circleText = '#fff'
                    } else if (revealed && isThisCorrect) {
                      bg = 'rgba(34,197,94,0.12)'
                      border = 'rgba(34,197,94,0.5)'
                      textColor = '#86efac'
                      circleBg = '#22c55e'
                      circleText = '#fff'
                    } else if (isThisWrong) {
                      bg = 'rgba(239,68,68,0.12)'
                      border = 'rgba(239,68,68,0.5)'
                      textColor = '#fca5a5'
                      circleBg = '#ef4444'
                      circleText = '#fff'
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        disabled={revealed}
                        className="flex items-center gap-3.5 px-4 rounded-2xl text-left transition-all duration-200 disabled:cursor-default"
                        style={{
                          minHeight: 56,
                          background: bg,
                          border: `1.5px solid ${border}`,
                          animation: isThisWrong && shakeWrong ? 'ps-shake 0.5s ease' : 'none',
                        }}
                      >
                        {/* Option letter circle */}
                        <span
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-200"
                          style={{ background: circleBg, color: circleText }}
                        >
                          {revealed && isThisCorrect ? (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ animation: 'ps-checkmark 0.4s ease' }}
                            >
                              <path d="M2 7l3.5 3.5L12 3" />
                            </svg>
                          ) : revealed && isThisWrong ? (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <path d="M1 1l10 10M11 1L1 11" />
                            </svg>
                          ) : (
                            opt.toUpperCase()
                          )}
                        </span>

                        {/* Option text */}
                        <span
                          className="text-[14px] leading-snug flex-1 py-3"
                          style={{ color: textColor }}
                        >
                          {text}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Bar (bottom, after answer reveal) */}
        {revealed && !done && localHearts > 0 && (
          <div
            style={{
              animation: 'ps-feedbackSlide 0.3s ease forwards',
              borderTop: `2px solid ${isCorrect ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              background: isCorrect
                ? 'linear-gradient(180deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)'
                : 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)',
            }}
          >
            <div className="px-5 pt-4 pb-2">
              {/* Feedback header */}
              <div className="flex items-center gap-2.5 mb-1">
                {isCorrect ? (
                  <>
                    <span
                      className="text-[20px]"
                      style={{ animation: 'ps-popIn 0.4s ease' }}
                    >
                      &#127881;
                    </span>
                    <span className="text-[17px] font-extrabold" style={{ color: '#22c55e' }}>
                      Correct!
                    </span>
                    {/* Confetti dots */}
                    <div className="flex gap-1 ml-1">
                      {['#22c55e', '#86efac', '#fbbf24', '#60a5fa', '#f472b6'].map(
                        (c, i) => (
                          <span
                            key={i}
                            className="rounded-full"
                            style={{
                              width: 5,
                              height: 5,
                              background: c,
                              animation: `ps-confettiDot 0.6s ease ${i * 0.08}s forwards`,
                              opacity: 0,
                              animationFillMode: 'backwards',
                            }}
                          />
                        )
                      )}
                    </div>
                    <span
                      className="ml-auto text-[13px] font-bold"
                      style={{ color: '#34d399', animation: 'ps-xpCount 0.3s ease 0.2s both' }}
                    >
                      Correct!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[20px]">&#128532;</span>
                    <span className="text-[17px] font-extrabold" style={{ color: '#ef4444' }}>
                      Incorrect
                    </span>
                    <span className="ml-auto text-[12px] font-semibold text-red-400/60">
                      -1 &#10084;&#65039;
                    </span>
                  </>
                )}
              </div>

              {/* Explanation preview / expandable */}
              {!isCorrect && current.explanation && (
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="mt-2 text-left w-full"
                >
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    <span className="font-semibold text-white/60">
                      Answer: ({current.answer?.toUpperCase()})
                    </span>
                    {' — '}
                    {showExplanation
                      ? current.explanation
                      : current.explanation.slice(0, 120) + (current.explanation.length > 120 ? '...' : '')}
                  </p>
                  {!showExplanation && current.explanation.length > 120 && (
                    <span className="text-[11px] font-semibold" style={{ color: subject.color }}>
                      Tap to read more
                    </span>
                  )}
                </button>
              )}

              {isCorrect && current.explanation && (
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="mt-1 text-left w-full"
                >
                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {showExplanation
                      ? current.explanation
                      : current.explanation.slice(0, 100) + (current.explanation.length > 100 ? '...' : '')}
                  </p>
                  {!showExplanation && current.explanation.length > 100 && (
                    <span className="text-[11px] font-semibold" style={{ color: subject.color }}>
                      Tap to read more
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* CONTINUE button */}
            <div className="px-5 pb-5 pt-3">
              <button
                onClick={handleContinue}
                className="w-full py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all active:scale-[0.97]"
                style={{
                  background: isCorrect
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: isCorrect
                    ? '0 4px 20px rgba(34,197,94,0.35)'
                    : '0 4px 20px rgba(239,68,68,0.35)',
                }}
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}

        {/* No hearts feedback bar */}
        {revealed && !done && localHearts <= 0 && (
          <div
            className="px-5 pb-5 pt-4"
            style={{
              borderTop: '2px solid rgba(239,68,68,0.3)',
              background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)',
              animation: 'ps-feedbackSlide 0.3s ease forwards',
            }}
          >
            <button
              onClick={handleContinue}
              className="w-full py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
              }}
            >
              SEE RESULTS
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function LoadingState({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div
        className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
        style={{ borderColor: `${color}30`, borderTopColor: color }}
      />
      <p className="text-[13px] text-white/30 font-medium">Loading questions...</p>
    </div>
  )
}

function EmptyState({
  topic,
  subject,
  onClose,
}: {
  topic: LearningTopic
  subject: LearningSubject
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <span className="text-5xl" style={{ animation: 'ps-popIn 0.5s ease' }}>
        &#128237;
      </span>
      <div>
        <p className="text-[16px] text-white/65 font-semibold">No questions available yet</p>
        <p className="text-[13px] text-white/30 mt-2 max-w-[260px]">
          We&apos;re still building the question bank for &ldquo;{topic.title}&rdquo;
        </p>
      </div>
      <button
        onClick={onClose}
        className="mt-3 px-6 py-3 rounded-2xl text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)`,
          boxShadow: `0 4px 20px ${subject.color}30`,
        }}
      >
        Go Back
      </button>
    </div>
  )
}

function NoHeartsScreen({ onClose }: { onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState('30:00')

  useEffect(() => {
    let seconds = 30 * 60 // 30 minutes
    const interval = setInterval(() => {
      seconds -= 1
      if (seconds <= 0) {
        clearInterval(interval)
        setTimeLeft('0:00')
        return
      }
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
      <div style={{ animation: 'ps-popIn 0.5s ease' }}>
        <span className="text-6xl">&#128148;</span>
      </div>
      <div>
        <p className="text-[20px] font-bold text-white/90">No hearts left!</p>
        <p className="text-[14px] text-white/40 mt-2">Hearts refill 1 every 30 minutes</p>
      </div>
      <div
        className="flex items-center gap-2 px-5 py-3 rounded-2xl mt-1"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <span className="text-[15px]">&#10084;&#65039;</span>
        <span className="text-[15px] font-bold tabular-nums text-red-400">{timeLeft}</span>
        <span className="text-[12px] text-white/30 ml-1">until next heart</span>
      </div>
      <button
        onClick={onClose}
        className="mt-4 px-8 py-3.5 rounded-2xl text-[14px] font-bold text-white/70 transition-all hover:text-white/90 active:scale-[0.97]"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        Close
      </button>
    </div>
  )
}

function ScoreScreen({
  score,
  isPerfect,
  crownedUp,
  newCrownLvl,
  previousCrownLvl,
  color,
  onFinish,
  previousCorrectAnswers,
  previousQuestionsAnswered,
}: {
  score: { correct: number; total: number }
  isPerfect: boolean
  crownedUp: boolean
  newCrownLvl: CrownLevel
  previousCrownLvl: CrownLevel
  color: string
  onFinish: () => void
  previousCorrectAnswers: number
  previousQuestionsAnswered: number
}) {
  const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0
  const circumference = 2 * Math.PI * 45 // radius 45
  const dashOffset = circumference - (circumference * percentage) / 100

  // Performance benchmark (2a)
  const previousAccuracy = previousQuestionsAnswered > 0
    ? Math.round((previousCorrectAnswers / previousQuestionsAnswered) * 100)
    : null
  const isNewBest = previousAccuracy !== null && percentage > previousAccuracy
  // Topic average: combine previous + current session
  const totalCorrectAll = previousCorrectAnswers + score.correct
  const totalAnsweredAll = previousQuestionsAnswered + score.total
  const topicAverage = totalAnsweredAll > 0 ? Math.round((totalCorrectAll / totalAnsweredAll) * 100) : percentage

  // Next review schedule (2b)
  let reviewText: string
  let reviewColor: string
  if (percentage >= 80) {
    reviewText = 'Review in 7 days'
    reviewColor = '#22c55e'
  } else if (percentage >= 60) {
    reviewText = 'Review in 3 days'
    reviewColor = '#fbbf24'
  } else {
    reviewText = 'Review tomorrow'
    reviewColor = '#f97316'
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-6 text-center">
      {/* Star burst for perfect */}
      {isPerfect && (
        <div className="relative">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <span
              key={deg}
              className="absolute text-[14px]"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${deg}deg) translateY(-60px)`,
                animation: `ps-starBurst 0.6s ease ${i * 0.06}s both`,
              }}
            >
              &#10024;
            </span>
          ))}
        </div>
      )}

      {/* Score circle */}
      <div className="relative" style={{ width: 130, height: 130, animation: 'ps-popIn 0.5s ease' }}>
        <svg
          width="130"
          height="130"
          viewBox="0 0 100 100"
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Score ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isPerfect ? '#22c55e' : percentage >= 60 ? color : '#ef4444'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              animation: `ps-scoreCircle 1s ease 0.3s both`,
              filter: `drop-shadow(0 0 8px ${isPerfect ? 'rgba(34,197,94,0.4)' : `${color}40`})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-black text-white" style={{ animation: 'ps-popIn 0.5s ease 0.5s both' }}>
            {score.correct}/{score.total}
          </span>
          <span className="text-[11px] font-semibold text-white/35 mt-0.5">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Message */}
      <div style={{ animation: 'ps-xpCount 0.4s ease 0.6s both' }}>
        <p className="text-[20px] font-bold text-white/90">
          {isPerfect
            ? 'Perfect Score!'
            : percentage >= 80
            ? 'Excellent Work!'
            : percentage >= 60
            ? 'Good Progress!'
            : 'Keep Practicing!'}
        </p>
        <p className="text-[13px] text-white/40 mt-1">
          {isPerfect
            ? 'You nailed every question!'
            : percentage >= 60
            ? 'You\'re getting the hang of it!'
            : 'Review the topic and try again.'}
        </p>
      </div>

      {/* Performance Benchmark (2a) */}
      {previousAccuracy !== null && (
        <div
          className="w-full max-w-[280px] rounded-2xl px-5 py-4 flex flex-col gap-2"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: 'ps-xpCount 0.4s ease 0.7s both',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">&#128202;</span>
            <span className="text-[13px] font-bold text-white/70">Your Progress</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/25" style={{ width: 6, textAlign: 'center' }}>&#9500;</span>
              <span className="text-[12px] text-white/50">This session:</span>
              <span className="text-[12px] font-bold ml-auto" style={{ color: percentage >= 60 ? '#22c55e' : '#ef4444' }}>
                {percentage}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/25" style={{ width: 6, textAlign: 'center' }}>&#9500;</span>
              <span className="text-[12px] text-white/50">Previous best:</span>
              <span className="text-[12px] font-bold text-white/60 ml-auto">{previousAccuracy}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/25" style={{ width: 6, textAlign: 'center' }}>&#9492;</span>
              <span className="text-[12px] text-white/50">Topic average:</span>
              <span className="text-[12px] font-bold text-white/60 ml-auto">{topicAverage}%</span>
            </div>
            {isNewBest && (
              <div
                className="flex items-center justify-center gap-1.5 mt-1.5 py-1.5 rounded-lg"
                style={{
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.15)',
                  animation: 'ps-popIn 0.5s ease 1s both',
                }}
              >
                <span className="text-[12px]">&#8599;&#65039;</span>
                <span className="text-[12px] font-bold" style={{ color: '#22c55e' }}>
                  New personal best!
                </span>
                <span className="text-[12px]">&#127881;</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crown level progress */}
      {crownedUp && (
        <div
          className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
          style={{
            background: `${CROWN_COLORS[newCrownLvl]}12`,
            border: `1.5px solid ${CROWN_COLORS[newCrownLvl]}35`,
            animation: 'ps-popIn 0.5s ease 0.8s both',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[28px]"
              style={{ animation: 'ps-crownGlow 1.5s ease infinite' }}
            >
              &#128081;
            </span>
            <span
              className="text-[15px] font-bold"
              style={{ color: CROWN_COLORS[newCrownLvl] }}
            >
              Crown Level {newCrownLvl}!
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: CROWN_COLORS[previousCrownLvl],
                color: '#fff',
              }}
            >
              {previousCrownLvl}
            </div>
            <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
              <path d="M0 4h16M13 1l3 3-3 3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: CROWN_COLORS[newCrownLvl],
                color: '#fff',
                boxShadow: `0 0 12px ${CROWN_COLORS[newCrownLvl]}60`,
              }}
            >
              {newCrownLvl}
            </div>
          </div>
        </div>
      )}

      {/* Session Summary */}
      <div
        className="w-full max-w-[280px] rounded-2xl px-5 py-4 flex flex-col gap-2.5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          animation: 'ps-xpCount 0.4s ease 1s both',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-white/40">Questions attempted</span>
          <span className="text-[12px] font-bold text-white/70">
            {score.total}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-white/40">Correct answers</span>
          <span className="text-[12px] font-bold" style={{ color: '#34d399' }}>
            {score.correct}
          </span>
        </div>
        <div
          className="flex items-center justify-between pt-2 mt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-[13px] text-white/70 font-semibold">Accuracy</span>
          <span className="text-[14px] font-extrabold" style={{ color: percentage >= 60 ? '#34d399' : '#f87171' }}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Next Review Schedule (2b) */}
      <div
        className="w-full max-w-[280px] rounded-2xl px-5 py-3.5 flex items-center gap-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${reviewColor}20`,
          animation: 'ps-xpCount 0.4s ease 1.1s both',
        }}
      >
        <span className="text-[16px]">&#128197;</span>
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-white/35">Next Review</span>
          <span className="text-[12px] font-bold" style={{ color: reviewColor }}>
            {reviewText}
          </span>
          <span className="text-[10px] text-white/25 mt-0.5">
            Based on your {percentage}% accuracy
          </span>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onFinish}
        className="w-full max-w-[280px] py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all hover:scale-[1.01] active:scale-[0.97]"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          boxShadow: `0 4px 24px ${color}35`,
          animation: 'ps-xpCount 0.4s ease 1.2s both',
        }}
      >
        CONTINUE
      </button>
    </div>
  )
}
