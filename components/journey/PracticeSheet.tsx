'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import {
  type TopicProgress,
  type CrownLevel,
  QUESTIONS_PER_CROWN,
  CROWN_COLORS,
} from '@/components/journey/types'
import TopicCompleteCelebration from '@/components/journey/TopicCompleteCelebration'

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
  isPro?: boolean
  // DB question IDs the user has been shown for this topic across all
  // sessions. Used to power "Try Again with New Questions".
  seenQuestionIds?: number[]
  // DB question IDs the user has answered INCORRECTLY for this topic
  // across all sessions. Drives the "Practice only Wrong Questions" CTA.
  wrongQuestionIds?: number[]
  // Authoritative count of all DB PYQs for this topic, sourced from
  // pyqCounts on the parent (the same number the path card shows). Used
  // both as the celebration's denominator AND as the strict trigger for
  // the celebration so it never fires before the user has actually
  // attempted every question the topic card claims exists.
  topicDbCount?: number
  onClose: () => void
  onComplete: (result: {
    correct: number
    total: number
    newCrownLevel: CrownLevel
    keepOpen?: boolean
    // DB IDs displayed during the session that just finished — parent
    // merges them into TopicProgress.seenQuestionIds.
    seenIds?: number[]
    // DB IDs the user got WRONG during this session — parent appends
    // these to TopicProgress.wrongQuestionIds.
    newWrongIds?: number[]
    // DB IDs the user just got RIGHT this session that were previously
    // in the wrong list — parent removes them from wrongQuestionIds
    // (spaced-repetition: a question stops being "wrong" once mastered).
    resolvedWrongIds?: number[]
  }) => void
  onHeartLost: () => void
  onNextTopic?: () => void
  nextTopicName?: string
  onUpgradePro?: () => void
  onReviseNotes?: () => void
  // Called when the user taps "Restart All Questions" on the topic-complete
  // celebration. Parent must clear seenQuestionIds for this topic in
  // TopicProgress so the next fetch gets the full pool again.
  onResetSeenIds?: (topicId: string) => void
}

// ── Component ───────────────────────────────────────────────────────────────────

// DB-sourced PYQs use stable small integer IDs from Supabase. AI-generated
// fallbacks use Date.now()+i, which lands above 1e12. We only persist DB IDs
// in the "seen" set so the cross-session "new questions" filter is meaningful.
const isDbId = (id: number) => Number.isFinite(id) && id > 0 && id < 1_000_000_000

// ── Perfect-score headlines ──────────────────────────────────────────────
// Shown when the user gets every question right. Picked at random per
// score-screen mount so the user sees something different across rounds
// instead of the same "Every answer nailed!" line.
//
// Rules these lines follow:
//   - Plain English. ~10-year-old vocabulary. No jargon, no idioms a non-
//     native speaker would trip on (most UPSC aspirants are not native
//     English speakers).
//   - Short. Fits on one line of the score screen at fontSize 20.
//   - Positive but not generic motivation ("believe in yourself" → no).
//   - UPSC-specific where it adds something the user can relate to
//     (Prelims pace, exam-day form, topper-level), avoiding the same
//     coach-speak clichés banned by the daily-tip system.
//   - Varied in tone — some are celebratory ("Perfect score!"), some are
//     calm-confident ("Zero misses. Sharp."), some name-check the UPSC
//     journey directly ("This is Prelims pace.").
const PERFECT_HEADLINES: string[] = [
  'Every single one right!',
  'Full marks. Just like that.',
  'Clean round!',
  'Topper-level answers.',
  'This is Prelims pace.',
  'Zero misses. Sharp.',
  'Perfect score!',
  'No slips. Solid round.',
  'All correct. Stay sharp.',
  'Clear thinking. Right answers.',
  'You read every one right.',
  'All right. No misses.',
  'This is exam-day form.',
  'Strong round!',
  'Spot on, every time.',
  'Prelims-ready answers.',
]

export default function PracticeSheet({
  topic,
  subject,
  progress,
  hearts,
  isPro = false,
  seenQuestionIds: seenQuestionIdsProp,
  onClose,
  onComplete,
  onHeartLost,
  onNextTopic,
  nextTopicName,
  onUpgradePro,
  onReviseNotes: onReviseNotesProp,
  onResetSeenIds,
  wrongQuestionIds: wrongQuestionIdsProp,
  topicDbCount,
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

  // ── Session tracking for "Try Again with New Questions" / "Practice Wrong" ──
  // Across-session DB IDs the user has been shown for this topic. Combined
  // with `sessionSeenIds` to drive the API exclusion list.
  const persistedSeenIds = useMemo(
    () => (seenQuestionIdsProp || []).filter(isDbId),
    [seenQuestionIdsProp],
  )
  // Across-session DB IDs the user has answered INCORRECTLY for this
  // topic. Drives the celebration's "Practice only Wrong Questions" CTA.
  const persistedWrongIds = useMemo(
    () => (wrongQuestionIdsProp || []).filter(isDbId),
    [wrongQuestionIdsProp],
  )
  // Question IDs displayed during *this* session — flushed up to the parent
  // when the session ends so they get persisted into TopicProgress.
  const [sessionSeenIds, setSessionSeenIds] = useState<number[]>([])
  // DB IDs answered incorrectly during *this* session. Merged into
  // TopicProgress.wrongQuestionIds via onComplete.
  const [sessionWrongIds, setSessionWrongIds] = useState<number[]>([])
  // DB IDs that were previously wrong but answered correctly THIS session.
  // Removed from TopicProgress.wrongQuestionIds via onComplete.
  const [resolvedWrongIds, setResolvedWrongIds] = useState<number[]>([])
  // Full PYQ objects the user got wrong in this session — kept in memory so
  // the wrong-replay round doesn't need a fetch and works for AI-generated
  // questions too.
  const [wrongPyqs, setWrongPyqs] = useState<PYQ[]>([])
  // (Practice-mode tracking removed: fetchQuestions always excludes seen IDs,
  // and wrong-replay is detected by inspecting `wrongPyqs` directly when
  // needed.)
  // Used to gate the empty-pool message after a "new questions" round
  // returned nothing (i.e. they've exhausted the DB pool).
  const [exhaustedNew, setExhaustedNew] = useState(false)
  // True when the API's `exhausted` flag came back true — i.e. the topic
  // has DB questions and the user has attempted every single one. Drives
  // the TopicCompleteCelebration overlay.
  const [topicComplete, setTopicComplete] = useState(false)
  // Total DB PYQs available for this topic (from the API). Used by the
  // celebration as the "PYQs attempted" hero number.
  const [topicTotalDbCount, setTopicTotalDbCount] = useState(0)
  // Pro users get unlimited hearts (represented as Infinity internally,
  // displayed as ∞ in the UI). Non-Pro users start from the prop value.
  const [localHearts, setLocalHearts] = useState<number>(isPro ? Infinity : hearts)

  // Re-sync hearts when:
  //   1. The user upgrades to Pro mid-practice (hearts go infinite immediately).
  //   2. Hearts refilled in the parent (e.g. after the No-Hearts screen waits
  //      out the timer or after returning from the paywall).
  useEffect(() => {
    if (isPro) {
      setLocalHearts(Infinity)
      return
    }
    setLocalHearts(prev => (hearts > prev ? hearts : prev))
  }, [isPro, hearts])
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

  // Fetch PYQs from the API. ALWAYS excludes every DB question the user
  // has ever been shown for this topic — across all past sessions
  // (`persistedSeenIds` from TopicProgress.seenQuestionIds) AND within the
  // current session (`sessionSeenIds`). This guarantees the user never
  // re-sees an attempted DB question, whether it is the first round on a
  // freshly opened sheet or a "Try Again with New Questions" round.
  //
  // Wrong-replay never calls this — it uses the in-memory `wrongPyqs`.
  // `forceRestart` skips the seen-IDs exclusion entirely. Used by the
  // "Restart All Questions" CTA on the TopicCompleteCelebration so the
  // user gets the full DB pool back even before the parent's seen list
  // has cleared.
  const fetchQuestions = useCallback((opts?: { forceRestart?: boolean }) => {
    const forceRestart = opts?.forceRestart === true
    setLoading(true)
    setError(false)
    setExhaustedNew(false)
    setTopicComplete(false)
    const keywords = topic.concepts.slice(0, 4).join(',')
    const excludeAll = forceRestart
      ? []
      : Array.from(
          new Set<number>([...persistedSeenIds, ...sessionSeenIds].filter(isDbId)),
        )
    const params = new URLSearchParams({
      subject: subject.id,
      topic: topic.id,
      keywords,
      limit: '5',
    })
    if (excludeAll.length > 0) {
      params.set('excludeIds', excludeAll.join(','))
    }
    const excludeSet = new Set(excludeAll)
    fetch(`/api/journey/pyqs?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const fetched: PYQ[] = d.pyqs || []
        const apiExhausted: boolean = d.exhausted === true
        const totalDb: number = typeof d.totalDbAvailable === 'number' ? d.totalDbAvailable : 0
        // Defense-in-depth: even if the API exclusion missed something,
        // we never show a question whose DB ID is in the exclude set.
        // AI-generated questions have synthetic IDs that fail isDbId() and
        // are always allowed through.
        const safe = forceRestart
          ? fetched
          : fetched.filter(q => !isDbId(q.id) || !excludeSet.has(q.id))
        setPyqs(safe)
        setLoading(false)
        setTopicTotalDbCount(totalDb)
        // Strict celebration trigger:
        //   1. API must have explicitly returned exhausted: true
        //   2. There must be a real DB pool (totalDb > 0)
        //   3. The user's actual seen set must cover the entire DB pool
        //      (defensive double-check — never fire on partial progress)
        //   4. The user's seen set must ALSO cover the parent's authoritative
        //      topicDbCount (sourced from pyqCounts, the same number the
        //      topic card shows). This prevents the celebration from firing
        //      on e.g. 4 of 6 when 2 questions failed isValidQuestion() but
        //      the topic card still shows them as part of the pool.
        //   5. Only when not in forceRestart mode (the celebration shouldn't
        //      re-fire immediately after the user just chose to restart)
        const totalSeen = excludeSet.size
        const localCoversPool = totalDb > 0 && totalSeen >= totalDb
        const coversTopicCard = !topicDbCount || totalSeen >= topicDbCount
        const fireCelebration =
          !forceRestart && apiExhausted && localCoversPool && coversTopicCard
        if (fireCelebration) {
          setTopicComplete(true)
        } else if (safe.length === 0) {
          // Anything else with an empty result set — whether the API said
          // exhausted or not — should fall through to the actionable
          // ExhaustedNewQuestionsScreen (with Restart / Practice Wrong /
          // Back options) instead of the dead "No questions available yet"
          // empty state. This catches the edge case where the API claims
          // exhausted but the strict celebration guard fails (e.g. when
          // pyqCounts > allValid because some rows failed validation).
          setExhaustedNew(true)
        }
        // Add every DB-sourced ID we just showed to the session set so the
        // next round inside this same sheet excludes them too.
        const newDbIds = safe.map(q => q.id).filter(isDbId)
        if (newDbIds.length > 0) {
          setSessionSeenIds(prev => Array.from(new Set([...prev, ...newDbIds])))
        }
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [topic.id, subject.id, topic.concepts, persistedSeenIds, sessionSeenIds])

  useEffect(() => {
    if (sheetVisible) fetchQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetVisible])

  const current = pyqs[currentIdx]
  const isCorrect = revealed && selected === current?.answer
  const totalQuestions = pyqs.length
  const progressPercent = totalQuestions > 0 ? ((currentIdx + (revealed ? 1 : 0)) / totalQuestions) * 100 : 0

  // ── Rotating plain-English microcopy (research-backed, 10-yr-old vocabulary) ──
  // Reasearch sources: Carol Dweck "not yet" growth mindset, Khan Academy neutral
  // grey, Duolingo gentle feedback, ClearIAS topper messaging on mistake handling.
  const HOPE_LINES = [
    'One mistake here means one less in the real exam.',
    'Good try. Now you will remember this one.',
    'This is how toppers learn. One question at a time.',
    'Your brain just got a little stronger.',
    'Mocks are for mistakes. Save your best for exam day.',
    'Tough one. Read the answer below and move on.',
    'You did not know this yet. Now you will.',
    'Every wrong answer today is a right answer in Prelims.',
  ]
  const WIN_LINES = [
    'Nice. You knew this one.',
    'Clean answer. Keep going.',
    'Solid. This is exam-ready thinking.',
    'Good work. Your reading is paying off.',
    'Sharp. You spotted the trick.',
    'That is the kind of answer that clears Prelims.',
    'Easy for you. On to the next.',
    'Yes! That is the right pick.',
  ]
  const STREAK_LINES = [
    'You are in the zone.',
    'This is what topper hours look like.',
    'Five straight. Do not stop now.',
  ]

  // Pick a stable line per question (so it doesn't flicker on re-render)
  const feedbackLine = useMemo(() => {
    if (!current) return ''
    // Use question id (or index) as seed so the line is stable per question
    const seedStr = String(current.id || current.question || currentIdx)
    let seed = 0
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
    if (isCorrect) {
      // Streak escalation (use streak BEFORE the increment, i.e. streak+1 reflects current count)
      const liveStreak = streak // already updated by handleSelect
      if (liveStreak >= 5) return STREAK_LINES[seed % STREAK_LINES.length]
      return WIN_LINES[seed % WIN_LINES.length]
    }
    return HOPE_LINES[seed % HOPE_LINES.length]
  }, [current, currentIdx, isCorrect, streak]) // eslint-disable-line react-hooks/exhaustive-deps

  // Headline escalates with streak for correct answers
  const correctHeadline = useMemo(() => {
    if (streak >= 10) return 'Ten straight. Topper mode.'
    if (streak >= 5) return 'Five straight. Sharp.'
    if (streak >= 3) return 'On a roll.'
    if (streak >= 2) return 'Two in a row.'
    return 'Correct!'
  }, [streak])

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
      // If the user previously got this question wrong (and it's queued for
      // wrong-replay), drop it now — they've mastered it.
      if (current) {
        const correctId = current.id
        setWrongPyqs(prev => prev.filter(p => p.id !== correctId))
        // Track that a previously-wrong DB question is now resolved so the
        // parent can remove it from the persisted wrongQuestionIds list.
        if (isDbId(correctId)) {
          const wasWrong =
            persistedWrongIds.includes(correctId) ||
            sessionWrongIds.includes(correctId)
          if (wasWrong) {
            setResolvedWrongIds(prev =>
              prev.includes(correctId) ? prev : [...prev, correctId],
            )
            // Also remove it from sessionWrongIds in case the same Q was
            // wrong earlier in the same sitting and is now resolved.
            setSessionWrongIds(prev => prev.filter(id => id !== correctId))
          }
        }
      }
    } else {
      // Pro users never lose hearts.
      if (!isPro) {
        const newHearts = localHearts - 1
        setLocalHearts(newHearts)
        onHeartLost()
      }
      setShakeWrong(true)
      setTimeout(() => setShakeWrong(false), 600)
      setStreak(0)
      // Remember this PYQ so the user can re-attempt it via "Practice Wrong
      // Questions" at the end. We dedupe by question id so a wrong answer
      // during wrong-replay doesn't bloat the queue.
      if (current) {
        const wrongQ = current
        setWrongPyqs(prev =>
          prev.some(p => p.id === wrongQ.id) ? prev : [...prev, wrongQ],
        )
        // Track wrong DB IDs for cross-session persistence.
        if (isDbId(wrongQ.id)) {
          const wrongId = wrongQ.id
          setSessionWrongIds(prev =>
            prev.includes(wrongId) ? prev : [...prev, wrongId],
          )
          // If this was previously resolved this session, undo the resolution.
          setResolvedWrongIds(prev => prev.filter(id => id !== wrongId))
        }
      }
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

  // DB IDs displayed during this session — only these get persisted in the
  // parent's TopicProgress.seenQuestionIds via onComplete.
  const dbSeenThisSession = useMemo(
    () => sessionSeenIds.filter(isDbId),
    [sessionSeenIds],
  )

  function handleFinish() {
    const newCrown = calcNewCrownLevel(score.correct)
    onComplete({
      correct: score.correct,
      total: score.total,
      newCrownLevel: newCrown,
      seenIds: dbSeenThisSession,
      newWrongIds: sessionWrongIds,
      resolvedWrongIds: resolvedWrongIds,
    })
  }

  // Helper used by all "next round" CTAs to wipe the per-question state
  // without disturbing session-level tracking (wrongPyqs / sessionSeenIds).
  function resetQuestionState() {
    setDone(false)
    setCurrentIdx(0)
    setSelected(null)
    setRevealed(false)
    setScore({ correct: 0, total: 0 })
    setShowExplanation(false)
    setStreak(0)
  }

  // ── "Try Again with New Questions" — fetch a fresh batch with every DB
  // ID we've ever shown the user excluded server-side. AI fallback covers
  // the case where the topic's DB pool is exhausted.
  function handlePracticeNew() {
    const newCrown = calcNewCrownLevel(score.correct)
    onComplete({
      correct: score.correct,
      total: score.total,
      newCrownLevel: newCrown,
      keepOpen: true,
      seenIds: dbSeenThisSession,
      newWrongIds: sessionWrongIds,
      resolvedWrongIds: resolvedWrongIds,
    })
    // The intra-round wrong/resolved deltas have been flushed to the
    // parent — clear the local session ledger so the same IDs aren't
    // re-flushed on the next round's onComplete call.
    setSessionWrongIds([])
    setResolvedWrongIds([])
    resetQuestionState()
    setPyqs([])
    fetchQuestions()
  }

  // ── "Practice Wrong Questions" — Duolingo-style. Replays exactly the
  // PYQs the user got wrong this session, in memory, no fetch. Wrong
  // questions are removed as the user gets them right (handled in
  // handleSelect's correct branch).
  function handlePracticeWrong() {
    if (wrongPyqs.length === 0) return
    const newCrown = calcNewCrownLevel(score.correct)
    onComplete({
      correct: score.correct,
      total: score.total,
      newCrownLevel: newCrown,
      keepOpen: true,
      seenIds: dbSeenThisSession,
      newWrongIds: sessionWrongIds,
      resolvedWrongIds: resolvedWrongIds,
    })
    setSessionWrongIds([])
    setResolvedWrongIds([])
    // Snapshot the wrong queue, shuffle so the order isn't predictable.
    const queue = [...wrongPyqs]
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[queue[i], queue[j]] = [queue[j], queue[i]]
    }
    resetQuestionState()
    setPyqs(queue)
    setLoading(false)
    setError(false)
  }

  // ── "Restart All Questions" — fired from the TopicCompleteCelebration
  // overlay. Clears the topic's seenQuestionIds in the parent and locally,
  // then refetches with `forceRestart` so the user gets the full DB pool
  // back regardless of when the parent state propagates.
  function handleRestartAllQuestions() {
    setTopicComplete(false)
    setSessionSeenIds([])
    setWrongPyqs([])
    if (onResetSeenIds) {
      onResetSeenIds(topic.id)
    }
    resetQuestionState()
    setPyqs([])
    fetchQuestions({ forceRestart: true })
  }

  // Practice ONLY questions the user has answered wrong on this topic —
  // across every past session. Pulls the persisted wrong IDs from the
  // parent (TopicProgress.wrongQuestionIds) and asks the API to fetch
  // those exact rows by id. Falls back to the in-memory wrongPyqs queue
  // when the persisted list is empty (e.g. older saves before the
  // feature shipped).
  function handlePracticeWrongFromCelebration() {
    setTopicComplete(false)
    // Combine cross-session persisted wrongs with anything we've added
    // this session. Dedupe.
    const allWrongIds = Array.from(
      new Set<number>([...persistedWrongIds, ...sessionWrongIds].filter(isDbId)),
    )
    // Fast path: nothing to practice — open the in-memory queue if we
    // have full PYQ objects, otherwise just dismiss.
    if (allWrongIds.length === 0) {
      if (wrongPyqs.length === 0) {
        handleDismiss()
        return
      }
      const queue = [...wrongPyqs]
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[queue[i], queue[j]] = [queue[j], queue[i]]
      }
      resetQuestionState()
      setPyqs(queue)
      setLoading(false)
      setError(false)
      return
    }
    // Fetch the wrong questions back from the DB by ID, so the user can
    // see questions from earlier sessions too — not just the current sitting.
    setLoading(true)
    setError(false)
    setPyqs([])
    resetQuestionState()
    const params = new URLSearchParams({
      subject: subject.id,
      topic: topic.id,
      ids: allWrongIds.join(','),
      limit: String(Math.min(20, allWrongIds.length)),
    })
    fetch(`/api/journey/pyqs?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        const fetched: PYQ[] = d.pyqs || []
        if (fetched.length === 0) {
          // API couldn't return any of the wrongs (maybe DB rows were
          // deleted). Fall back to whatever's in memory.
          if (wrongPyqs.length > 0) {
            setPyqs([...wrongPyqs])
          } else {
            setError(true)
          }
          setLoading(false)
          return
        }
        // Shuffle so the user doesn't see them in deterministic order.
        const shuffled = [...fetched]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        setPyqs(shuffled)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }


  // Close practice, go back to topic notes
  function handleReviseNotes() {
    handleFinish()
    // Small delay so onComplete processes first, then open notes
    if (onReviseNotesProp) {
      setTimeout(onReviseNotesProp, 150)
    }
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
        className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col overflow-x-hidden"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 16 }}>❤️</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isPro
                    ? '#a78bfa'
                    : localHearts <= 2 ? '#ef4444' : localHearts <= 5 ? '#fbbf24' : 'rgba(255,255,255,0.8)',
                  fontVariantNumeric: 'tabular-nums',
                  animation: shakeWrong && !isPro ? 'ps-heartPulse 0.4s ease' : 'none',
                }}
              >
                {isPro ? '∞' : localHearts}
              </span>
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

        {/* Body — `overflow-x-hidden` is critical: the celebration
            sticker on the score-screen pokes a few pixels past the score
            ring's right edge (especially on narrow viewports like the
            iPhone SE), and without a horizontal clip here it pushes the
            sheet body's scroll width past the viewport and lets the
            user pan the page sideways. */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4" style={{ scrollbarWidth: 'none', minHeight: 0 }}>
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
                onClick={() => fetchQuestions()}
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
            exhaustedNew ? (
              <ExhaustedNewQuestionsScreen
                topic={topic}
                subject={subject}
                hasWrongs={wrongPyqs.length > 0}
                wrongCount={wrongPyqs.length}
                onPracticeWrong={handlePracticeWrong}
                onRestartAll={handleRestartAllQuestions}
                onClose={handleDismiss}
              />
            ) : (
              <EmptyState topic={topic} subject={subject} onClose={handleDismiss} />
            )
          ) : localHearts <= 0 && !done ? (
            <NoHeartsScreen onClose={handleDismiss} onUpgradePro={onUpgradePro} />
          ) : done ? (
            <ScoreScreen
              score={score}
              isPerfect={isPerfect}
              onNextTopic={onNextTopic}
              nextTopicName={nextTopicName}
              crownedUp={crownedUp}
              newCrownLvl={newCrownLvl}
              previousCrownLvl={progress.crownLevel}
              color={subject.color}
              onFinish={handleFinish}
              previousCorrectAnswers={progress.correctAnswers}
              previousQuestionsAnswered={progress.questionsAnswered}
              onPracticeMore={handlePracticeNew}
              onPracticeWrong={handlePracticeWrong}
              wrongCount={wrongPyqs.length}
              onReviseNotes={handleReviseNotes}
              currentTopicTitle={topic.title}
              currentTopicIcon={topic.icon}
              currentSubjectShortTitle={subject.shortTitle}
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
                style={{ color: 'rgba(255,255,255,0.92)', whiteSpace: 'pre-wrap' }}
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
                      // Softer green so the right answer feels welcoming, not alarming
                      bg = 'rgba(16,185,129,0.13)'
                      border = 'rgba(16,185,129,0.55)'
                      textColor = '#a7f3d0'
                      circleBg = '#10b981'
                      circleText = '#fff'
                    } else if (isThisWrong) {
                      // Amber instead of red — Khan Academy / Dweck research
                      // pattern: avoid threat-response colors in self-paced practice
                      bg = 'rgba(245,158,11,0.10)'
                      border = 'rgba(245,158,11,0.45)'
                      textColor = 'rgba(255,255,255,0.78)'
                      circleBg = 'rgba(245,158,11,0.20)'
                      circleText = '#fbbf24'
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
                          // shake animation removed — it reads as punishment
                        }}
                      >
                        {/* Option letter circle */}
                        <span
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-200"
                          style={{
                            background: circleBg,
                            color: circleText,
                            border: revealed && isThisWrong ? '1.5px solid rgba(245,158,11,0.55)' : 'none',
                          }}
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
                            // Soft dot instead of harsh X — option chosen but not right
                            <span style={{
                              width: 6, height: 6, borderRadius: 3,
                              background: '#fbbf24',
                            }} />
                          ) : (
                            opt.toUpperCase()
                          )}
                        </span>

                        {/* Option text */}
                        <span
                          className="text-[14px] leading-snug flex-1 py-3"
                          style={{ color: textColor, whiteSpace: 'pre-wrap' }}
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
              borderTop: `1.5px solid ${isCorrect ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
              background: isCorrect
                ? 'linear-gradient(180deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.02) 100%)'
                : 'linear-gradient(180deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.02) 100%)',
            }}
          >
            <div className="px-5 pt-4 pb-2">
              {/* Feedback header */}
              <div className="flex items-start gap-3 mb-2">
                {isCorrect ? (
                  <>
                    {/* Soft green check icon (no neon emoji) */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 30, height: 30, borderRadius: 15,
                        background: 'rgba(16,185,129,0.18)',
                        border: '1.5px solid rgba(16,185,129,0.45)',
                        animation: 'ps-popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 7l3.5 3.5L12 3" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-extrabold leading-tight" style={{ color: '#34d399', letterSpacing: '-0.01em' }}>
                        {correctHeadline}
                      </div>
                      <div className="text-[12.5px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {feedbackLine}
                      </div>
                    </div>
                    {/* Streak chip on combos (3+) */}
                    {streak >= 3 && (
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
                        style={{
                          background: 'rgba(245,158,11,0.18)',
                          border: '1px solid rgba(245,158,11,0.4)',
                          animation: 'ps-popIn 0.4s ease',
                        }}
                      >
                        <span style={{ fontSize: 11 }}>&#128293;</span>
                        <span className="text-[11px] font-extrabold" style={{ color: '#fbbf24' }}>
                          {streak}
                        </span>
                      </div>
                    )}
                    {/* Confetti only on milestone streaks (3+) */}
                    {streak >= 3 && (
                      <div className="absolute" style={{ top: 0, left: 0, right: 0, height: 0, pointerEvents: 'none' }}>
                        {['#10b981', '#34d399', '#fbbf24', '#a78bfa', '#60a5fa'].map((c, i) => (
                          <span
                            key={i}
                            className="rounded-full"
                            style={{
                              position: 'absolute',
                              left: `${20 + i * 15}%`,
                              width: 5, height: 5, background: c,
                              animation: `ps-confettiDot 0.7s ease ${i * 0.07}s forwards`,
                              opacity: 0,
                              animationFillMode: 'backwards',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Lightbulb icon — signals "learn", not "fail" */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 30, height: 30, borderRadius: 15,
                        background: 'rgba(245,158,11,0.18)',
                        border: '1.5px solid rgba(245,158,11,0.45)',
                        animation: 'ps-popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-extrabold leading-tight" style={{ color: '#fbbf24', letterSpacing: '-0.01em' }}>
                        Not yet
                      </div>
                      <div className="text-[12.5px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {feedbackLine}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Show the correct answer + explanation prominently — biggest learning lever */}
              {!isCorrect && (
                <div className="mt-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase" style={{ color: '#10b981', letterSpacing: '0.06em' }}>
                      Right answer
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {current.answer?.toUpperCase()}
                    </span>
                  </div>
                  {current.explanation && (
                    <button onClick={() => setShowExplanation(!showExplanation)} className="mt-1.5 text-left w-full">
                      <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', whiteSpace: 'pre-wrap' }}>
                        {showExplanation
                          ? current.explanation
                          : current.explanation.slice(0, 130) + (current.explanation.length > 130 ? '...' : '')}
                      </p>
                      {!showExplanation && current.explanation.length > 130 && (
                        <span className="text-[11px] font-semibold mt-1 inline-block" style={{ color: subject.color }}>
                          Tap to read more
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}

              {isCorrect && current.explanation && (
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="mt-1 text-left w-full"
                >
                  <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)', whiteSpace: 'pre-wrap' }}>
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

            {/* CONTINUE button — calm indigo when wrong, green when right */}
            <div className="px-5 pb-5 pt-3">
              <button
                onClick={handleContinue}
                className="w-full py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all active:scale-[0.97]"
                style={{
                  background: isCorrect
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: isCorrect
                    ? '0 4px 20px rgba(16,185,129,0.30)'
                    : '0 4px 20px rgba(99,102,241,0.30)',
                }}
              >
                {isCorrect ? 'NEXT QUESTION' : 'GOT IT, NEXT'}
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

      {/* Topic-complete celebration — fires when the API reports the user
          has attempted every PYQ in the DB for this topic. */}
      {topicComplete && (() => {
        // Total wrong = persisted (cross-session) ∪ session, deduped, minus
        // anything resolved this session.
        const allWrongSet = new Set<number>()
        for (const id of persistedWrongIds) if (isDbId(id)) allWrongSet.add(id)
        for (const id of sessionWrongIds) if (isDbId(id)) allWrongSet.add(id)
        for (const id of resolvedWrongIds) allWrongSet.delete(id)
        const wrongCount = allWrongSet.size
        // Authoritative denominator: prefer the parent's topicDbCount
        // (matches the topic card's count), then fall back to the API's
        // filtered count, then to the user's seen count.
        const denominator = topicDbCount && topicDbCount > 0
          ? topicDbCount
          : topicTotalDbCount > 0
            ? topicTotalDbCount
            : (persistedSeenIds.length + sessionSeenIds.length)
        return (
          <TopicCompleteCelebration
            topicTitle={topic.title}
            subjectShortTitle={subject.shortTitle}
            subjectColor={subject.color}
            totalAttempted={denominator}
            wrongCount={wrongCount}
            onPracticeWrong={handlePracticeWrongFromCelebration}
            onRestartAll={handleRestartAllQuestions}
            onDismiss={() => { setTopicComplete(false); handleDismiss() }}
          />
        )
      })()}
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

// Pre-computed offsets for the 8 confetti dots that drift outward from
// the celebration sticker. Kept module-scope so we don't recompute on
// every render. Upward offsets are intentionally smaller than sideways
// offsets — the sticker sits near the top of the practice sheet body
// scroll container, so any dot that travels too far up gets clipped.
const STICKER_CONFETTI: Array<{ dx: number; dy: number; delay: number; size: number; color: string }> = [
  { dx:  38, dy: -28, delay: 0.05, size: 5, color: '#fbbf24' },
  { dx:  52, dy:   4, delay: 0.10, size: 4, color: '#a78bfa' },
  { dx:  40, dy:  36, delay: 0.15, size: 5, color: '#34d399' },
  { dx:   6, dy:  48, delay: 0.08, size: 4, color: '#60a5fa' },
  { dx: -36, dy:  38, delay: 0.12, size: 5, color: '#f472b6' },
  { dx: -50, dy:   4, delay: 0.06, size: 4, color: '#fbbf24' },
  { dx: -34, dy: -28, delay: 0.14, size: 5, color: '#34d399' },
  { dx:  -4, dy: -36, delay: 0.09, size: 4, color: '#a78bfa' },
]

// Knowledge-level celebration sticker. Renders as an absolutely-positioned
// element on the upper-right of the score ring container — caller is
// responsible for placing it inside a `position: relative` parent.
//
// Stack (back → front):
//   1. Expanding aura ring (fast)
//   2. Expanding aura ring (slow, longer travel)
//   3. 8 confetti dots drifting outward
//   4. The sticker pill itself with the level number + sparkle icon
function KnowledgeLevelSticker({ level }: { level: CrownLevel }) {
  const accent = CROWN_COLORS[level]
  return (
    <div
      aria-label={`Knowledge level ${level} reached`}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* Aura burst ring 1 — fast pop. Sized so the maximum upward
          extent (radius * scale_peak) fits within the parent scroll
          container's top boundary plus the ScoreScreen top padding. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 72, height: 72,
          marginLeft: -8, marginTop: -8,
          borderRadius: '50%',
          border: `2px solid ${accent}`,
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.4)',
          animation: 'ps-badgeBurst 0.85s cubic-bezier(0.16,1,0.3,1) 0.15s forwards',
        }}
      />
      {/* Aura burst ring 2 — slower, wider but still bounded. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 84, height: 84,
          marginLeft: -8, marginTop: -8,
          borderRadius: '50%',
          border: `1.5px solid ${accent}`,
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.6)',
          animation: 'ps-badgeBurstSlow 1.3s cubic-bezier(0.22,1,0.36,1) 0.25s forwards',
        }}
      />
      {/* Soft glow halo behind the sticker (stays) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 68, height: 68,
          marginLeft: -8, marginTop: -8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
          filter: 'blur(8px)',
          transform: 'translate(-50%, -50%)',
          opacity: 0.85,
        }}
      />
      {/* Confetti dots — drift outward from the badge once */}
      {STICKER_CONFETTI.map((c, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: c.size, height: c.size,
            marginLeft: -8, marginTop: -8,
            borderRadius: '50%',
            background: c.color,
            boxShadow: `0 0 6px ${c.color}99`,
            ['--dx' as string]: `${c.dx}px`,
            ['--dy' as string]: `${c.dy}px`,
            opacity: 0,
            transform: 'translate(-50%, -50%)',
            animation: `ps-badgeConfetti 1.2s cubic-bezier(0.16,1,0.3,1) ${0.25 + c.delay}s forwards`,
          }}
        />
      ))}
      {/* Twinkling micro-stars at three fixed offsets */}
      {[
        { x:  18, y: -34, size: 6, delay: 0.55 },
        { x:  34, y:  -8, size: 5, delay: 0.75 },
        { x: -28, y:  22, size: 5, delay: 0.65 },
      ].map((s, i) => (
        <div
          key={`s${i}`}
          aria-hidden
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: s.size, height: s.size,
            marginLeft: -8 + s.x, marginTop: -8 + s.y,
            color: accent,
            transform: 'translate(-50%, -50%)',
            animation: `ps-badgeStarTwinkle 1.6s ease-in-out ${s.delay}s infinite`,
          }}
        >
          <svg width={s.size * 2} height={s.size * 2} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.5 9L21 10.5L13.5 12L12 19L10.5 12L3 10.5L10.5 9L12 2Z" />
          </svg>
        </div>
      ))}
      {/* The sticker pill */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          marginLeft: -8, marginTop: -8,
          padding: '6px 11px',
          borderRadius: 999,
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
          color: '#0a0a14',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          boxShadow:
            `0 6px 20px ${accent}66,` +
            `0 0 0 2px rgba(255,255,255,0.20) inset,` +
            `0 2px 0 ${accent}88`,
          // Two-stage animation: pop in → wobble forever
          opacity: 0,
          transform: 'translate(40%, -45%) scale(0.2) rotate(-65deg)',
          animation:
            'ps-badgePopIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s forwards,' +
            ' ps-badgeWobble 3.2s ease-in-out 1.2s infinite',
        }}
      >
        {/* Sparkle icon — replaces the old crown emoji */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#0a0a14">
          <path d="M12 2L13.5 9L21 10.5L13.5 12L12 19L10.5 12L3 10.5L10.5 9L12 2Z" />
        </svg>
        Level {level}
      </div>
    </div>
  )
}

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

function NoHeartsScreen({ onClose, onUpgradePro }: { onClose: () => void; onUpgradePro?: () => void }) {
  const [timeLeft, setTimeLeft] = useState('60:00')

  useEffect(() => {
    let seconds = 60 * 60 // 60 minutes
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
        <p className="text-[14px] text-white/40 mt-2">Hearts refill 1 every hour</p>
      </div>
      <div
        className="flex items-center gap-2 px-5 py-3 rounded-2xl mt-1"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <span className="text-[15px]">&#10084;&#65039;</span>
        <span className="text-[15px] font-bold tabular-nums text-red-400">{timeLeft}</span>
        <span className="text-[12px] text-white/30 ml-1">until next heart</span>
      </div>
      {onUpgradePro && (
        <button
          onClick={onUpgradePro}
          className="w-full max-w-[280px] py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all hover:scale-[1.01] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
          }}
        >
          Get PadhAI Pro — Unlimited ❤️
        </button>
      )}
      <button
        onClick={onClose}
        className="mt-4 px-8 py-3.5 rounded-2xl text-[14px] font-bold text-white/70 transition-all hover:text-white/90 active:scale-[0.97]"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {onUpgradePro ? 'Wait for Hearts' : 'Close'}
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
  onNextTopic,
  nextTopicName,
  onPracticeMore,
  onPracticeWrong,
  wrongCount,
  onReviseNotes,
  currentTopicTitle,
  currentTopicIcon,
  currentSubjectShortTitle,
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
  onNextTopic?: () => void
  nextTopicName?: string
  onPracticeMore: () => void
  onPracticeWrong: () => void
  wrongCount: number
  onReviseNotes: () => void
  // Topic + subject the next "Practice More Questions" round will pull
  // from. Rendered as a small card visually attached to the CTA so the
  // user knows exactly what they're about to practice.
  currentTopicTitle: string
  currentTopicIcon: string
  currentSubjectShortTitle: string
}) {
  const hasWrongs = wrongCount > 0
  // Pick a perfect-score headline once when the score screen mounts. Stable
  // across React re-renders within the round, fresh for every new round.
  const perfectHeadline = useMemo(
    () => PERFECT_HEADLINES[Math.floor(Math.random() * PERFECT_HEADLINES.length)],
    [],
  )
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
  void totalCorrectAll; void totalAnsweredAll; void previousCrownLvl

  // Mastery framing
  const missed = score.total - score.correct
  const isHigh = percentage >= 75
  const isMid = percentage >= 50 && percentage < 75
  const isLow = percentage < 50

  // Near-miss / Zeigarnik trigger
  const nearMissText = missed === 1
    ? 'Just 1 question away from a perfect round.'
    : missed <= 3 && missed > 0
    ? `${missed} concepts need one more look.`
    : null

  // Growth trend
  const improved = previousAccuracy !== null && percentage > previousAccuracy
  const trendDelta = previousAccuracy !== null ? percentage - previousAccuracy : 0

  // UPSC motivational quotes — aspirant-specific, growth-oriented
  const quotes = isHigh ? [
    { text: 'The price of success is hard work, dedication, and the determination that whether we win or lose, we have applied the best of ourselves.', author: 'Vince Lombardi' },
    { text: 'Dream is not that which you see while sleeping, it is something that does not let you sleep.', author: 'A.P.J. Abdul Kalam' },
    { text: 'Success usually comes to those who are too busy to be looking for it.', author: 'Henry David Thoreau' },
  ] : isMid ? [
    { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
    { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
    { text: 'Continuous effort — not strength or intelligence — is the key to unlocking our potential.', author: 'Winston Churchill' },
  ] : [
    { text: 'Every master was once a disaster. Keep going.', author: 'T. Harv Eker' },
    { text: 'The only way to guarantee failure is to quit.', author: 'UPSC Topper Wisdom' },
    { text: 'This is one of the hardest exams in the world. Every attempt builds your foundation.', author: 'PadhAI' },
  ]
  const quote = quotes[Math.floor((score.correct + score.total) % quotes.length)]

  const ringColor = isPerfect ? '#22c55e' : isHigh ? color : isMid ? '#f59e0b' : '#ef4444'
  const glowColor = isPerfect ? 'rgba(34,197,94,0.25)' : isHigh ? `${color}25` : isMid ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      // Extra top padding (was 20) so the celebration sticker that
      // peeks off the upper-right corner of the score ring has room
      // ABOVE the ring within the parent scroll container — without
      // this the sticker pill's top edge gets clipped by the practice
      // sheet body's overflow-y-auto boundary.
      padding: '52px 20px 32px', gap: 0, textAlign: 'center',
      // No `overflow: hidden` here — we need the celebration sticker's
      // burst rings and confetti to extend outside ScoreScreen's box.
      // The background glow below uses `radial-gradient(... transparent
      // 70%)` and `filter: blur(40px)` so it self-contains visually
      // even without a hard clip.
      position: 'relative',
    }}>
      <style>{`
        @keyframes ps-btnShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes ps-ringDraw { from { stroke-dashoffset: ${circumference}; } to { stroke-dashoffset: ${dashOffset}; } }
        @keyframes ps-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ps-glow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes ps-countUp { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        /* One-shot primary entrance — scale + fade + small lift. NO continuous
           pulse: NN/g and Refactoring UI both call out perpetual motion as a
           desperation signal that trains users to ignore the element. */
        @keyframes ps-primaryEntrance {
          0% { opacity: 0; transform: translateY(14px) scale(0.94); }
          60% { transform: translateY(-2px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Subtle one-time aura behind the dominant CTA — fades out after the
           entrance so the eye is drawn there once, then the button is calm. */
        @keyframes ps-primaryAura {
          0% { opacity: 0; transform: scale(0.85); }
          40% { opacity: 0.55; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.18); }
        }
        /* ── Knowledge-level celebration sticker ──────────────────────
           Multi-stage entrance for the level-up badge that sits as a
           sticker on the upper-right of the score ring. Pop in fast and
           overshoot, settle into a slight tilt, then a continuous very
           subtle wobble + sparkle to keep it alive without being noisy. */
        @keyframes ps-badgePopIn {
          0%   { opacity: 0; transform: translate(40%, -45%) scale(0.2) rotate(-65deg); }
          45%  { opacity: 1; transform: translate(40%, -45%) scale(1.35) rotate(22deg); }
          65%  { transform: translate(40%, -45%) scale(0.88) rotate(6deg); }
          85%  { transform: translate(40%, -45%) scale(1.04) rotate(14deg); }
          100% { opacity: 1; transform: translate(40%, -45%) scale(1) rotate(12deg); }
        }
        @keyframes ps-badgeWobble {
          0%, 100% { transform: translate(40%, -45%) scale(1) rotate(12deg); }
          50%      { transform: translate(40%, -45%) scale(1.03) rotate(15deg); }
        }
        /* Two concentric expanding rings that fire once when the badge
           lands. Pure CSS, no DOM churn. Peak scale chosen so the ring's
           upward extent (radius * scale) stays within the ScoreScreen
           top padding plus the parent scroll boundary. */
        @keyframes ps-badgeBurst {
          0%   { opacity: 0.85; transform: translate(-50%, -50%) scale(0.4); }
          100% { opacity: 0;    transform: translate(-50%, -50%) scale(1.9); }
        }
        @keyframes ps-badgeBurstSlow {
          0%   { opacity: 0;    transform: translate(-50%, -50%) scale(0.6); }
          30%  { opacity: 0.55; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0;    transform: translate(-50%, -50%) scale(1.7); }
        }
        /* Tiny twinkling stars around the badge. */
        @keyframes ps-badgeStarTwinkle {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          50%      { opacity: 1; transform: scale(1); }
        }
        /* Confetti dot drift outward from the badge center. */
        @keyframes ps-badgeConfetti {
          0%   { opacity: 0; transform: translate(-50%, -50%) translate(0, 0) scale(0.6); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1); }
        }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
        width: 260, height: 260, borderRadius: '50%',
        background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
        filter: 'blur(40px)', pointerEvents: 'none',
        animation: 'ps-glow 3s ease-in-out infinite',
      }} />

      {/* Score ring — `overflow: visible` so the celebration sticker can
          peek off the upper-right corner without getting clipped. */}
      <div style={{
        position: 'relative', width: 140, height: 140, marginBottom: 16,
        animation: 'ps-countUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both',
        overflow: 'visible',
      }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
          <circle cx="50" cy="50" r="45" fill="none"
            stroke={ringColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            style={{
              animation: `ps-ringDraw 1.2s cubic-bezier(0.22,1,0.36,1) 0.3s both`,
              filter: `drop-shadow(0 0 10px ${ringColor}50)`,
            }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1,
            animation: 'ps-countUp 0.5s ease 0.6s both',
          }}>
            {score.correct}<span style={{ fontSize: 16, fontWeight: 600, opacity: 0.35 }}>/{score.total}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>
            {percentage}% accuracy
          </span>
        </div>

        {/* ── KNOWLEDGE-LEVEL CELEBRATION STICKER ─────────────────────
            Only renders when the user just leveled up this round. Sits as
            an absolutely-positioned sticker peeking off the upper-right
            corner of the score ring — moved out of the ring center where
            it was crowding the accuracy text.

            Layered animation:
              1. A pair of expanding aura rings burst outward from the
                 sticker center (one fast, one slow) when it lands.
              2. Confetti dots drift outward in 8 directions.
              3. The sticker itself pops in with a scale + rotation
                 overshoot, then settles into a slight tilt and a slow
                 ongoing wobble + sparkle so the eye keeps tracking it.

            All pure CSS keyframes, no JS animation loop, no DOM churn. */}
        {crownedUp && (
          <KnowledgeLevelSticker level={newCrownLvl} />
        )}
      </div>

      {/* Mastery-framed headline */}
      <div style={{ marginBottom: 6, animation: 'ps-fadeUp 0.5s ease 0.5s both' }}>
        <p style={{
          fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.2,
          color: isPerfect ? '#22c55e' : 'rgba(255,255,255,0.92)',
          letterSpacing: '-0.02em',
        }}>
          {isPerfect
            ? perfectHeadline
            : isHigh
            ? `${score.correct} concepts strengthened`
            : isMid
            ? `${score.correct} down, ${missed} to sharpen`
            : `${score.correct} concepts covered`}
        </p>
      </div>

      {/* Growth insight — trend or near-miss */}
      <div style={{ marginBottom: 18, animation: 'ps-fadeUp 0.5s ease 0.6s both' }}>
        {improved && trendDelta > 0 ? (
          <p style={{ fontSize: 13, color: '#34d399', margin: 0, fontWeight: 600 }}>
            Accuracy up {trendDelta}% from last session
          </p>
        ) : nearMissText ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {nearMissText}
          </p>
        ) : isLow ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: 0 }}>
            Most aspirants need 3-4 rounds on tough topics. You&apos;re building the base.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: 0 }}>
            {isPerfect ? 'You\'re ready to move forward.' : 'One more round can lock this in.'}
          </p>
        )}
      </div>

      {/* Compact stats row */}
      <div style={{
        display: 'flex', gap: 8, width: '100%', maxWidth: 320, marginBottom: 14,
        animation: 'ps-fadeUp 0.5s ease 0.65s both',
      }}>
        {[
          { label: 'Correct', value: `${score.correct}`, clr: '#34d399' },
          { label: 'Missed', value: `${missed}`, clr: missed === 0 ? '#34d399' : '#f87171' },
          { label: 'Accuracy', value: `${percentage}%`, clr: isHigh ? '#34d399' : isMid ? '#f59e0b' : '#f87171' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px 6px', borderRadius: 14,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.clr, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.28)', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress trend (if has history) */}
      {previousAccuracy !== null && (
        <div style={{
          width: '100%', maxWidth: 320, marginBottom: 14,
          padding: '12px 16px', borderRadius: 14,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          animation: 'ps-fadeUp 0.5s ease 0.7s both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>Your trend</span>
            {isNewBest && (
              <span style={{
                fontSize: 9, fontWeight: 800, color: '#22c55e',
                background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.20)',
                padding: '2px 7px', borderRadius: 5,
              }}>PERSONAL BEST</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Previous</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.40)' }}>{previousAccuracy}%</span>
            <svg width="16" height="8" viewBox="0 0 16 8" fill="none" style={{ margin: '0 2px' }}>
              <path d="M0 4h12M9 1l3 3-3 3" stroke="rgba(255,255,255,0.20)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>Now</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: percentage >= previousAccuracy ? '#34d399' : '#f87171' }}>{percentage}%</span>
          </div>
        </div>
      )}

      {/* Knowledge-level celebration sticker now lives on the upper-right
          corner of the score ring as an absolutely-positioned badge (see
          KnowledgeLevelSticker above). The big standalone card was
          removed to free up vertical space.
          The motivational quote card was moved to the very bottom of the
          screen, after all CTAs — see the bottom of this component. */}

      {/* ── PRIORITIZED CTAs — single-primary hierarchy ────────────────
          Design rules (sourced from Material 3, Apple HIG, NN/g, Refactoring
          UI, and competitor analysis of Duolingo / Quizlet / Brilliant /
          Khan / Memrise):

            1. Exactly ONE filled button per screen (the "primary"). Never
               two filled, never three equal-weight buttons. Material 3 +
               Refactoring UI are emphatic about this.
            2. Emphasis by de-emphasis — the primary dominates because the
               others are quieter, not because the primary is louder. So
               secondary = outlined-low-contrast, tertiary = text only.
            3. Group secondary + tertiary together with tight spacing,
               separated from the primary by extra whitespace (Gestalt
               proximity → "the filled button is THE answer; everything
               else is an alternative if you don't want that").
            4. Primary lives at the bottom in the thumb zone (Hoober).
            5. One-time entrance animation only. Continuous pulse looks
               desperate and gets ignored ("animation blindness").
            6. Dynamic count ("Practice 3 Wrong Questions") — specificity
               converts (Booking.com pattern).
            7. Don't make a tappable button red. Red is reserved for the
               WRONG-answer indicator inside the question, never for the
               action that fixes it. Duolingo's rule. We use a warm amber
               instead → reads as "needs attention" without alarm.

          PRIMARY:
            - hasWrongs           → "Practice N Wrong Questions" (amber)
            - !hasWrongs          → "Try Again with New Questions" (subject color)
          SECONDARY (outlined, sub-row):
            - The other practice option (the one that wasn't promoted)
            - Revise Notes
          TERTIARY (text link, separate):
            - Continue to next topic / Back to syllabus
      */}
      <div style={{
        width: '100%', maxWidth: 340,
        display: 'flex', flexDirection: 'column',
        animation: 'ps-fadeUp 0.5s ease 0.95s both',
      }}>

        {/* ════════════════════════════════════════════════════════════
            PRIMARY  — exactly one filled button.
            ════════════════════════════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          marginBottom: 22, // big gap → primary reads as its own group
        }}>
          {/* One-time aura halo behind the primary. Plays once on entrance
              then fades. Reinforces "look here first" without creating a
              perpetual motion sink. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -16,
              borderRadius: 28,
              background: hasWrongs
                ? 'radial-gradient(ellipse at center, rgba(245,158,11,0.45), transparent 70%)'
                : `radial-gradient(ellipse at center, ${color}55, transparent 70%)`,
              filter: 'blur(20px)',
              opacity: 0,
              animation: 'ps-primaryAura 1.6s ease-out 0.4s both',
              pointerEvents: 'none',
            }}
          />

          {hasWrongs ? (
            // ── PRIMARY: PRACTICE WRONG QUESTIONS ──────────────────────
            // Amber/gold gradient, NOT red. Red is the wrong-answer signal
            // inside the question — a button you want users to *tap*
            // should never wear it (Duolingo's lesson). Amber maps to the
            // semantic "needs work" cue without alarm.
            <button
              onClick={onPracticeWrong}
              aria-label={`Practice ${wrongCount} wrong question${wrongCount === 1 ? '' : 's'} again`}
              style={{
                width: '100%', height: 60,
                borderRadius: 18, border: 'none',
                fontSize: 16, fontWeight: 800, color: '#1a1300', cursor: 'pointer',
                letterSpacing: '-0.01em',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #f97316 100%)',
                // Layered shadow: ambient depth + amber glow + Duolingo-style
                // 4px solid bottom border (lighter amber) for tactile lift.
                boxShadow:
                  '0 10px 28px rgba(245,158,11,0.40),' +
                  '0 4px 0 rgba(180,83,9,0.55),' +
                  'inset 0 1px 0 rgba(255,255,255,0.45)',
                position: 'relative', overflow: 'hidden',
                animation: 'ps-primaryEntrance 0.55s cubic-bezier(0.16,1,0.3,1) 0.4s both',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{
                position: 'relative', zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                {/* Target icon — the leading icon belongs ONLY on the primary.
                    Adds visual weight and signals "fix the misses". */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                Practice {wrongCount} Wrong Question{wrongCount === 1 ? '' : 's'}
              </span>
              {/* Soft top highlight — pure CSS, gives the button a sheen
                  without animating. */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 45%)',
                pointerEvents: 'none',
              }} />
            </button>
          ) : (
            // ── PRIMARY: PRACTICE MORE QUESTIONS (no wrongs) ───────────
            // Topic-card-attached CTA. The card on top shows the EXACT
            // topic the next round will pull from (icon + title +
            // subject pill), and the filled CTA below it is visually
            // fused — same width, no gap, matching subject border color,
            // top-rounded card flowing into bottom-rounded button. The
            // user knows exactly what they're tapping into.
            <button
              type="button"
              onClick={onPracticeMore}
              aria-label={`Practice more questions from ${currentTopicTitle}`}
              style={{
                width: '100%',
                padding: 0, border: 'none', cursor: 'pointer',
                background: 'transparent',
                borderRadius: 20,
                position: 'relative',
                animation: 'ps-primaryEntrance 0.55s cubic-bezier(0.16,1,0.3,1) 0.4s both',
                WebkitTapHighlightColor: 'transparent',
                // Outer glow on the WHOLE composite card so the topic
                // chip + button read as one unit
                boxShadow:
                  `0 14px 36px ${color}50,` +
                  `0 4px 0 ${color}55`,
              }}
            >
              {/* ── TOPIC PREVIEW CARD ─────────────────────────────────
                  Top section. Renders the exact topic + subject the
                  next round will use. Border-radius is rounded ONLY on
                  top so it visually fuses with the CTA below. */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 14px 12px',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                background: `linear-gradient(180deg, ${color}1a 0%, ${color}10 100%)`,
                border: `1.5px solid ${color}55`,
                borderBottom: 'none',
                position: 'relative',
                textAlign: 'left',
              }}>
                {/* Topic icon tile */}
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: `linear-gradient(135deg, ${color}30, ${color}18)`,
                  border: `1px solid ${color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10)`,
                }}>
                  {currentTopicIcon}
                </div>
                {/* Topic + subject text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.10em',
                    color: 'rgba(255,255,255,0.42)',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}>
                    From this topic
                  </div>
                  <div style={{
                    fontSize: 13.5, fontWeight: 700,
                    color: 'rgba(255,255,255,0.95)',
                    lineHeight: 1.25,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}>
                    {currentTopicTitle}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: color,
                    marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {currentSubjectShortTitle}
                  </div>
                </div>
                {/* (Sparkle chip removed — looked like an unrelated
                    decorative circle on the right side of the topic
                    name and added visual noise.) */}
              </div>

              {/* ── CTA BUTTON ──────────────────────────────────────────
                  Bottom section. Bottom-rounded so it fuses with the
                  topic card above. Filled subject color, the actual
                  primary action. */}
              <div style={{
                width: '100%', height: 60,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                fontSize: 16, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.01em',
                background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)',
              }}>
                <span style={{
                  position: 'relative', zIndex: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  Practice New Questions
                </span>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 45%)',
                  pointerEvents: 'none',
                }} />
              </div>
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════
            ALTERNATIVES — visually grouped together as one cluster.
            Tight spacing within (8px) signals "this is one group of
            things you can also do." Refactoring UI's "secondary chunk"
            pattern.
            ════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          animation: 'ps-fadeUp 0.5s ease 1.05s both',
        }}>

          {/* ── SECONDARY: PRACTICE MORE FROM THIS TOPIC ───────────────
              Same topic-card-attached composite design as the no-wrongs
              primary CTA, but rendered slightly smaller (smaller icon
              tile, shorter button) so it stays visually subordinate to
              the amber "Practice Wrong" primary above. The topic
              preview card on top shows the exact topic the next round
              will pull from, fused to a filled CTA below. */}
          {hasWrongs && (
            <button
              type="button"
              onClick={onPracticeMore}
              aria-label={`Practice more questions from ${currentTopicTitle}`}
              style={{
                width: '100%',
                padding: 0, border: 'none', cursor: 'pointer',
                background: 'transparent',
                borderRadius: 16,
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                // Toned-down shadow so the amber "Practice Wrong"
                // primary above gets the lion's share of attention.
                // No coloured glow, just a soft neutral lift.
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              }}
            >
              {/* Topic preview card (top, fused to button below).
                  Subdued styling: lower-opacity background, dim border,
                  smaller subject pill — looks like a quiet badge, not
                  a competing primary action. */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px 10px',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                position: 'relative',
                textAlign: 'left',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {currentTopicIcon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 8.5, fontWeight: 800, letterSpacing: '0.10em',
                    color: 'rgba(255,255,255,0.32)',
                    textTransform: 'uppercase',
                    marginBottom: 1,
                  }}>
                    From this topic
                  </div>
                  <div style={{
                    fontSize: 12.5, fontWeight: 700,
                    color: 'rgba(255,255,255,0.78)',
                    lineHeight: 1.25,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}>
                    {currentTopicTitle}
                  </div>
                  <div style={{
                    fontSize: 9.5, fontWeight: 700,
                    color: 'rgba(255,255,255,0.40)',
                    marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {currentSubjectShortTitle}
                  </div>
                </div>
                {/* (Sparkle chip removed — looked like an unrelated
                    decorative circle on the right of the topic name.) */}
              </div>

              {/* CTA button (bottom, fused to topic card above).
                  Outlined / muted background instead of filled subject
                  gradient so the amber primary remains visually
                  dominant. Same height + same fused-edge geometry. */}
              <div style={{
                width: '100%', height: 48,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                fontSize: 14, fontWeight: 700,
                color: 'rgba(255,255,255,0.80)',
                letterSpacing: '-0.005em',
                background: 'rgba(255,255,255,0.04)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  position: 'relative', zIndex: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  Practice New Questions
                </span>
              </div>
            </button>
          )}

          {/* ── TERTIARY: REVISE NOTES — text link with leading icon ───
              No background, no border. Sits visually below the secondary
              as part of the same "alternatives" cluster. Tap area is
              still 44pt high for accessibility. */}
          <button
            onClick={onReviseNotes}
            aria-label="Revise the topic notes"
            style={{
              width: '100%', height: 44,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {isLow ? 'Review the notes' : 'Revise notes'}
          </button>

          {/* ── ESCAPE HATCH: Continue / Back ──────────────────────────
              Hidden when the user has wrong answers — on that screen
              we don't want a "continue anyway" out, we want them to
              fix the wrongs first. Only renders when hasWrongs is
              false (perfect or near-perfect round). */}
          {!hasWrongs && (onNextTopic ? (
            <button
              onClick={() => { onFinish(); setTimeout(onNextTopic, 100) }}
              style={{
                width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 0 4px',
                fontSize: 11.5, fontWeight: 600,
                color: 'rgba(255,255,255,0.32)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                WebkitTapHighlightColor: 'transparent',
                letterSpacing: '0.01em',
              }}
            >
              {nextTopicName ? `Continue to ${nextTopicName}` : 'Continue to next topic'}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onFinish}
              style={{
                width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 0 4px',
                fontSize: 11.5, fontWeight: 600,
                color: 'rgba(255,255,255,0.32)',
                WebkitTapHighlightColor: 'transparent',
                letterSpacing: '0.01em',
              }}
            >
              Back to syllabus
            </button>
          ))}
        </div>
      </div>

      {/* ── MOTIVATIONAL QUOTE — anchored to the very bottom of the
          ScoreScreen, after every CTA. Sits as a calm "footer" so the
          user reads it only after they've already decided their next
          action — never competes with the buttons. Subdued styling
          (opacity + small font + thin left border) keeps it quiet. */}
      <div style={{
        width: '100%', maxWidth: 340, marginTop: 24,
        padding: '12px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.015)',
        borderLeft: `3px solid ${color}30`,
        animation: 'ps-fadeUp 0.5s ease 1.2s both',
      }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, color: 'rgba(255,255,255,0.42)', fontStyle: 'italic' }}>
          &ldquo;{quote.text}&rdquo;
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 5, fontWeight: 600 }}>
          &mdash; {quote.author}
        </p>
      </div>
    </div>
  )
}

// ── Exhausted-pool screen ──────────────────────────────────────────────
// Shown when "Try Again with New Questions" returned zero — i.e. the user
// has worked through every PYQ in our DB for this topic AND the AI fallback
// failed to produce more. Offers wrong-replay as the only sensible next
// action when there are wrongs queued up.
function ExhaustedNewQuestionsScreen({
  topic,
  subject,
  hasWrongs,
  wrongCount,
  onPracticeWrong,
  onRestartAll,
  onClose,
}: {
  topic: LearningTopic
  subject: LearningSubject
  hasWrongs: boolean
  wrongCount: number
  onPracticeWrong: () => void
  onRestartAll: () => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-5 text-center px-6">
      <span className="text-5xl" style={{ animation: 'ps-popIn 0.5s ease' }}>&#127881;</span>
      <div>
        <p className="text-[18px] font-bold text-white/90">You&apos;ve seen them all</p>
        <p className="text-[13px] text-white/45 mt-2 max-w-[280px]">
          Every question we have for &ldquo;{topic.title}&rdquo; has been served up.
          {hasWrongs ? ' Lock in the ones you missed.' : ' Restart the pool to revise from scratch.'}
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
        {hasWrongs && (
          <button
            onClick={onPracticeWrong}
            className="w-full py-4 rounded-2xl text-[15px] font-extrabold text-white tracking-wide transition-all active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)`,
              boxShadow: `0 6px 24px ${subject.color}55`,
            }}
          >
            Practice {wrongCount} Wrong Question{wrongCount === 1 ? '' : 's'}
          </button>
        )}
        <button
          onClick={onRestartAll}
          className="w-full py-4 rounded-2xl text-[14px] font-extrabold tracking-wide transition-all active:scale-[0.97]"
          style={hasWrongs ? {
            // Secondary when there are wrongs above
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.90)',
          } : {
            // Primary when there are no wrongs
            background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)`,
            boxShadow: `0 6px 24px ${subject.color}55`,
            color: '#fff',
            border: 'none',
          }}
        >
          Restart All Questions
        </button>
        <button
          onClick={onClose}
          className="w-full mt-1 py-3 rounded-2xl text-[13px] font-semibold transition-all active:scale-[0.97]"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.40)',
          }}
        >
          Done for now
        </button>
      </div>
    </div>
  )
}
