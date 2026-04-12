'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Web Speech API type shims (not all TS libs include these) ────────────────

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  readonly isFinal: boolean
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognition extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

// ── Types ────────────────────────────────────────────────────────────────────

export type AIGuideState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'doubt'
  | 'answering'
  | 'complete'

interface ScriptSection {
  sectionId: string
  speakText: string
}

interface UseAIGuideProps {
  topicTitle: string
  subjectId: string
  notes: Record<string, unknown> | null
  sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>>
}

interface UseAIGuideReturn {
  state: AIGuideState
  currentSectionIdx: number
  totalSections: number
  subtitle: string
  activeSectionId: string | null
  start: () => void
  pause: () => void
  resume: () => void
  startDoubt: () => void
  stopDoubt: () => void
  close: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Time between sections in ms */
const SECTION_GAP_MS = 800

/**
 * Pick the best en-IN voice, falling back to any English voice, then default.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  // Prefer en-IN
  const enIN = voices.find(
    (v) => v.lang === 'en-IN' || v.lang.startsWith('en-IN')
  )
  if (enIN) return enIN
  // Fallback to any English
  const en = voices.find((v) => v.lang.startsWith('en'))
  if (en) return en
  return voices[0] ?? null
}

/**
 * Cross-browser SpeechRecognition constructor.
 */
function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = window as any
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognition)
    | null
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAIGuide({
  topicTitle,
  subjectId,
  notes,
  sectionRefs,
}: UseAIGuideProps): UseAIGuideReturn {
  // ── State (useState for React re-renders, useRef for async callbacks) ────
  const [state, _setState] = useState<AIGuideState>('idle')
  const stateRef = useRef<AIGuideState>('idle')

  const setState = useCallback((next: AIGuideState) => {
    stateRef.current = next
    _setState(next)
  }, [])

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const currentSectionIdxRef = useRef(0)

  const [subtitle, setSubtitle] = useState('')
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  const scriptRef = useRef<ScriptSection[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const mountedRef = useRef(true)

  // ── Load voices (may arrive async) ───────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      voiceRef.current = pickVoice()
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      window.speechSynthesis?.cancel()
      recognitionRef.current?.abort()
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current)
    }
  }, [])

  // ── Speak a single section and resolve when done ─────────────────────────

  const speakSection = useCallback(
    (section: ScriptSection): Promise<void> =>
      new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
          reject(new Error('speechSynthesis not available'))
          return
        }

        const utterance = new SpeechSynthesisUtterance(section.speakText)
        if (voiceRef.current) utterance.voice = voiceRef.current
        utterance.rate = 1.0
        utterance.pitch = 1.0

        utterance.onend = () => resolve()
        utterance.onerror = (e) => {
          // 'interrupted' and 'canceled' are expected when we pause/close
          if (e.error === 'interrupted' || e.error === 'canceled') {
            reject(new Error(e.error))
          } else {
            reject(new Error(e.error || 'speech error'))
          }
        }

        window.speechSynthesis.speak(utterance)
      }),
    []
  )

  // ── Play sections sequentially from a given index ────────────────────────

  const playFrom = useCallback(
    async (fromIdx: number) => {
      const sections = scriptRef.current
      if (!sections.length) return

      for (let i = fromIdx; i < sections.length; i++) {
        // Check if we should stop (paused, doubt, idle — anything except playing)
        if (stateRef.current !== 'playing') return
        if (!mountedRef.current) return

        const section = sections[i]

        // Update UI
        currentSectionIdxRef.current = i
        setCurrentSectionIdx(i)
        setSubtitle(section.speakText)
        setActiveSectionId(section.sectionId)

        // Scroll section into view
        const ref = sectionRefs[section.sectionId]
        if (ref?.current) {
          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }

        try {
          await speakSection(section)
        } catch {
          // Speech was interrupted (pause/close) — stop the loop
          return
        }

        if (!mountedRef.current) return
        if (stateRef.current !== 'playing') return

        // Pause between sections (except after the last one)
        if (i < sections.length - 1) {
          await new Promise<void>((resolve) => {
            gapTimerRef.current = setTimeout(() => {
              gapTimerRef.current = null
              resolve()
            }, SECTION_GAP_MS)
          })
        }
      }

      // All sections played
      if (mountedRef.current && stateRef.current === 'playing') {
        setState('complete')
        setSubtitle('')
        setActiveSectionId(null)
      }
    },
    [sectionRefs, speakSection, setState]
  )

  // ── Public API ───────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!notes) return
    if (stateRef.current === 'loading' || stateRef.current === 'playing') return

    setState('loading')
    setCurrentSectionIdx(0)
    currentSectionIdxRef.current = 0
    setSubtitle('')
    setActiveSectionId(null)

    try {
      const res = await fetch('/api/journey/ai-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle, subjectId, notes }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)

      const data = await res.json()
      const sections: ScriptSection[] = Array.isArray(data.sections)
        ? data.sections
        : []

      if (!sections.length) {
        setState('idle')
        return
      }

      scriptRef.current = sections

      if (!mountedRef.current) return

      setState('playing')
      playFrom(0)
    } catch (err) {
      console.error('useAIGuide start error:', err)
      if (mountedRef.current) setState('idle')
    }
  }, [notes, topicTitle, subjectId, setState, playFrom])

  const pause = useCallback(() => {
    if (stateRef.current !== 'playing') return
    window.speechSynthesis?.cancel()
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
    setState('paused')
  }, [setState])

  const resume = useCallback(() => {
    if (stateRef.current !== 'paused') return
    setState('playing')
    playFrom(currentSectionIdxRef.current)
  }, [setState, playFrom])

  const startDoubt = useCallback(() => {
    if (stateRef.current !== 'playing' && stateRef.current !== 'paused') return

    // Stop speech
    window.speechSynthesis?.cancel()
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      console.warn('SpeechRecognition not available')
      return
    }

    setState('doubt')

    const recognition = new Ctor()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    recognition.start()
  }, [setState])

  const stopDoubt = useCallback(async () => {
    if (stateRef.current !== 'doubt') return

    const recognition = recognitionRef.current
    if (!recognition) {
      setState('paused')
      return
    }

    setState('answering')

    // Get transcript from the recognition result
    const transcript = await new Promise<string>((resolve) => {
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const t = event.results[0]?.[0]?.transcript ?? ''
        resolve(t)
      }
      recognition.onerror = () => resolve('')
      recognition.onend = () => {
        // If neither onresult nor onerror fired yet, resolve empty
        resolve('')
      }
      recognition.stop()
    })

    recognitionRef.current = null

    if (!transcript.trim() || !mountedRef.current) {
      // No doubt captured — resume playback
      if (mountedRef.current) {
        setState('playing')
        playFrom(currentSectionIdxRef.current)
      }
      return
    }

    setSubtitle(`You asked: "${transcript}"`)

    try {
      const res = await fetch('/api/journey/ai-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle,
          subjectId,
          notes,
          doubt: transcript,
        }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)

      const data = await res.json()
      const answer: string = data.answer || ''

      if (!mountedRef.current) return

      if (answer) {
        setSubtitle(answer)

        // Speak the answer
        try {
          await new Promise<void>((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(answer)
            if (voiceRef.current) utterance.voice = voiceRef.current
            utterance.rate = 1.0
            utterance.pitch = 1.0
            utterance.onend = () => resolve()
            utterance.onerror = (e) => reject(new Error(e.error))
            window.speechSynthesis.speak(utterance)
          })
        } catch {
          // Speech interrupted — that's ok
        }
      }
    } catch (err) {
      console.error('useAIGuide doubt error:', err)
    }

    // Resume playback from where we left off
    if (mountedRef.current) {
      setState('playing')
      playFrom(currentSectionIdxRef.current)
    }
  }, [topicTitle, subjectId, notes, setState, playFrom])

  const close = useCallback(() => {
    window.speechSynthesis?.cancel()
    recognitionRef.current?.abort()
    recognitionRef.current = null
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
    scriptRef.current = []
    currentSectionIdxRef.current = 0
    setCurrentSectionIdx(0)
    setSubtitle('')
    setActiveSectionId(null)
    setState('idle')
  }, [setState])

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    state,
    currentSectionIdx,
    totalSections: scriptRef.current.length,
    subtitle,
    activeSectionId,
    start,
    pause,
    resume,
    startDoubt,
    stopDoubt,
    close,
  }
}
