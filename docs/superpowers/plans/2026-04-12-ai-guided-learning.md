# AI Guided Learning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI voice mentor to the mobile notes view that walks students through each section with narration, auto-scroll, glow highlights, push-to-talk doubts, and a practice CTA on completion.

**Architecture:** Three new files — a button component, an overlay component, and a hook that manages the state machine (idle→loading→playing→paused→doubt→complete). The hook uses Web Speech API for both TTS output and STT input. One new API endpoint generates conversational mentor scripts from notes content. All changes scoped to mobile variant of TopicDetailSheet.

**Tech Stack:** Web Speech API (speechSynthesis + SpeechRecognition), Groq/NVIDIA LLM for script generation, React hooks, CSS keyframe animations.

**Spec reference:** `docs/superpowers/specs/2026-04-12-ai-guided-learning-design.md`

---

## File Structure

| Path | Responsibility |
|---|---|
| `components/journey/AIGuideButton.tsx` | Glowing "AI Guided Learning" CTA button with shimmer animation. Transforms to loading spinner on tap. |
| `components/journey/AIGuideOverlay.tsx` | Floating bottom bar (play/pause, progress dots, mic button). Narration subtitle at top. Section glow manager. Practice CTA on completion. |
| `components/journey/hooks/useAIGuide.ts` | State machine hook. Manages: script fetching, speechSynthesis playback queue, scroll sync, SpeechRecognition for doubts, section progress tracking. |
| `app/api/journey/ai-guide/route.ts` | POST endpoint. Takes notes content → returns conversational mentor explanations per section via LLM. |
| `components/journey/TopicDetailSheet.tsx` | **Modified.** Add AIGuideButton after hero image. Pass sectionRefs + notes to AIGuideOverlay. Add glow CSS class support to section cards. |

---

## Pre-existing inventory

From the spec's codebase audit:

- **`components/journey/TopicDetailSheet.tsx:97-113`** — `sectionRefs` object with refs for all 16 sections (hook, overview, keyConcepts, timeline, etc.)
- **`components/journey/TopicDetailSheet.tsx:961-1027`** — Hero image section. AIGuideButton inserts after line 1027.
- **`components/journey/TopicDetailSheet.tsx:1190-2300`** — All notes section cards. Each wrapped in a `<div ref={sectionRefs.X}>`. Need to add conditional glow styles.
- **`components/journey/TopicDetailSheet.tsx:31-59`** — `StudyNotes` interface with all fields.
- **`components/journey/MobileLearningJourney.tsx:315-326`** — Where TopicDetailSheet is rendered on mobile (no variant prop = mobile default).
- **`app/api/journey/notes/route.ts`** — Existing notes generation endpoint using Groq. The ai-guide endpoint follows same pattern.

---

## Task 0: Pre-flight verification

**Files:** none — verification only.

- [ ] **Step 1: Confirm Web Speech API availability**

Run in browser console on the deployed app:
```js
console.log('TTS:', 'speechSynthesis' in window);
console.log('STT:', 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')).forEach(v => console.log(v.name, v.lang));
```

Expected: TTS = true, STT = true (Chrome/Safari), at least one `en-IN` or `en` voice listed.

- [ ] **Step 2: Confirm notes load correctly**

Open any topic on mobile → verify notes appear with all sections. The AI guide depends on notes being loaded.

---

## Task 1: AI Guide script generation API

**Files:**
- Create: `app/api/journey/ai-guide/route.ts`

- [ ] **Step 1: Create the API endpoint**

```typescript
// app/api/journey/ai-guide/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

let _nvidia: OpenAI | null = null
function getNvidia() {
  if (!_nvidia) _nvidia = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY,
  })
  return _nvidia
}

interface SectionScript {
  sectionId: string
  speakText: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topicTitle, subjectId, notes } = body

    if (!topicTitle || !notes) {
      return NextResponse.json({ error: 'Missing topicTitle or notes' }, { status: 400 })
    }

    // Build a summary of the notes content for the LLM
    const notesContext = [
      notes.hook ? `Hook: ${notes.hook}` : '',
      notes.summary ? `Overview: ${notes.summary}` : '',
      notes.keyPoints?.length ? `Key Points:\n${notes.keyPoints.join('\n')}` : '',
      notes.timeline?.length ? `Timeline:\n${notes.timeline.map((t: {year:string,event:string}) => `${t.year}: ${t.event}`).join('\n')}` : '',
      notes.examTip ? `Exam Tip: ${notes.examTip}` : '',
      notes.importantFacts?.length ? `Quick Facts:\n${notes.importantFacts.join('\n')}` : '',
      notes.keyTakeaways?.length ? `Key Takeaways:\n${notes.keyTakeaways.join('\n')}` : '',
      notes.connections ? `Connections: ${notes.connections}` : '',
    ].filter(Boolean).join('\n\n')

    // Determine which sections exist
    const availableSections: string[] = []
    if (notes.hook) availableSections.push('hook')
    if (notes.summary) availableSections.push('overview')
    if (notes.timeline?.length) availableSections.push('timeline')
    if (notes.keyPoints?.length) availableSections.push('keyConcepts')
    if (notes.examTip) availableSections.push('examStrategy')
    if (notes.importantFacts?.length) availableSections.push('quickFacts')
    if (notes.keyTakeaways?.length) availableSections.push('keyTakeaways')
    if (notes.connections) availableSections.push('connectedTopics')

    const prompt = `You are Priya, a warm and experienced UPSC mentor. You're guiding a student through study notes on "${topicTitle}" (${subjectId}).

For each section below, write a SHORT conversational explanation (2-4 sentences, ~10-15 seconds when spoken). Speak as a knowledgeable friend — use contractions, rhetorical questions, and reference the UPSC exam.

DO NOT read the notes verbatim. Rephrase in your own words, adding context and exam relevance.

Notes content:
${notesContext}

Sections to explain (in order): ${availableSections.join(', ')}

Return strict JSON:
{"sections": [
  {"sectionId": "${availableSections[0]}", "speakText": "Your conversational explanation here..."},
  ...one entry per section in the list above...
]}

Rules:
- Each speakText is 2-4 sentences MAX
- Use contractions: it's, don't, that's, wasn't
- Reference UPSC: "This comes up a lot in prelims", "UPSC loves testing this"
- Sound warm and encouraging, not robotic
- Strip all markdown, bold, brackets from your output — pure spoken English
- Return ONLY valid JSON`

    const nvidia = getNvidia()
    const resp = await nvidia.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 2000,
    })

    const raw = resp.choices[0].message.content || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI Guide error:', err)
    return NextResponse.json({ error: 'Failed to generate guide script' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test the endpoint locally**

Run: `npm run dev`

Then in another terminal:
```bash
curl -X POST http://localhost:3000/api/journey/ai-guide \
  -H "Content-Type: application/json" \
  -d '{"topicTitle":"Indus Valley Civilisation","subjectId":"ancient-history","notes":{"hook":"Did you know the IVC had drainage systems better than modern cities?","summary":"The Indus Valley Civilisation flourished between 2600-1900 BCE.","keyPoints":["Advanced urban planning","Undeciphered script","Trade with Mesopotamia"],"examTip":"Focus on town planning and Great Bath"}}'
```

Expected: JSON with `sections` array, each having `sectionId` and `speakText`.

- [ ] **Step 3: Commit**

```bash
git add app/api/journey/ai-guide/route.ts
git commit -m "feat(ai-guide): add script generation API endpoint"
```

---

## Task 2: useAIGuide hook — state machine + speech

**Files:**
- Create: `components/journey/hooks/useAIGuide.ts`

- [ ] **Step 1: Create the hook**

```typescript
// components/journey/hooks/useAIGuide.ts
import { useState, useRef, useCallback, useEffect } from 'react'

export type AIGuideState = 'idle' | 'loading' | 'playing' | 'paused' | 'doubt' | 'answering' | 'complete'

interface SectionScript {
  sectionId: string
  speakText: string
}

interface UseAIGuideProps {
  topicTitle: string
  subjectId: string
  notes: Record<string, unknown> | null
  sectionRefs: Record<string, React.RefObject<HTMLDivElement>>
  scrollContainer?: React.RefObject<HTMLElement>
}

export function useAIGuide({ topicTitle, subjectId, notes, sectionRefs, scrollContainer }: UseAIGuideProps) {
  const [state, setState] = useState<AIGuideState>('idle')
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [subtitle, setSubtitle] = useState('')
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [doubtAnswer, setDoubtAnswer] = useState('')

  const scriptsRef = useRef<SectionScript[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const resumeAfterDoubtRef = useRef(false)

  // Find best English voice (prefer en-IN)
  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices()
    return voices.find(v => v.lang === 'en-IN' && v.name.includes('Female')) ||
           voices.find(v => v.lang === 'en-IN') ||
           voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
           voices.find(v => v.lang.startsWith('en')) ||
           voices[0] || null
  }, [])

  // Scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const ref = sectionRefs[sectionId]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setActiveSectionId(sectionId)
  }, [sectionRefs])

  // Speak text and return a promise
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      const voice = getVoice()
      if (voice) utt.voice = voice
      utt.rate = 1.0
      utt.pitch = 1.0
      utt.lang = 'en-IN'
      utt.onend = () => resolve()
      utt.onerror = (e) => e.error === 'canceled' ? resolve() : reject(e)
      utteranceRef.current = utt
      setSubtitle(text)
      speechSynthesis.speak(utt)
    })
  }, [getVoice])

  // Play sections sequentially from the current index
  const playSections = useCallback(async (fromIdx: number) => {
    const scripts = scriptsRef.current
    for (let i = fromIdx; i < scripts.length; i++) {
      // Check if paused or in doubt mode
      if (state === 'paused' || state === 'doubt' || state === 'answering') break

      setCurrentSectionIdx(i)
      const section = scripts[i]
      scrollToSection(section.sectionId)

      // Small delay for scroll to settle
      await new Promise(r => setTimeout(r, 500))

      setState('playing')
      await speak(section.speakText)

      // Brief pause between sections
      await new Promise(r => setTimeout(r, 800))
    }

    // If we finished all sections
    if (state !== 'paused' && state !== 'doubt') {
      setSubtitle('')
      setActiveSectionId(null)
      setState('complete')
    }
  }, [scrollToSection, speak, state])

  // Start the guide
  const start = useCallback(async () => {
    if (!notes) return

    setState('loading')
    try {
      const resp = await fetch('/api/journey/ai-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle, subjectId, notes }),
      })
      const data = await resp.json()
      if (!data.sections?.length) throw new Error('No sections returned')

      scriptsRef.current = data.sections
      setCurrentSectionIdx(0)
      setState('playing')

      // Ensure voices are loaded
      if (speechSynthesis.getVoices().length === 0) {
        await new Promise<void>(resolve => {
          speechSynthesis.onvoiceschanged = () => resolve()
          setTimeout(resolve, 1000) // timeout fallback
        })
      }

      await playSections(0)
    } catch (err) {
      console.error('AI Guide start failed:', err)
      setState('idle')
    }
  }, [notes, topicTitle, subjectId, playSections])

  // Pause
  const pause = useCallback(() => {
    speechSynthesis.cancel()
    setState('paused')
  }, [])

  // Resume
  const resume = useCallback(() => {
    setState('playing')
    playSections(currentSectionIdx)
  }, [currentSectionIdx, playSections])

  // Start doubt recording (push-to-talk)
  const startDoubt = useCallback(() => {
    speechSynthesis.cancel()
    setState('doubt')

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) return

    const rec = new SpeechRec()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec
    rec.start()
  }, [])

  // Stop doubt recording and get answer
  const stopDoubt = useCallback(async () => {
    const rec = recognitionRef.current
    if (!rec) { setState('playing'); resume(); return }

    return new Promise<void>((resolve) => {
      rec.onresult = async (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript
        setDoubtAnswer('')
        setState('answering')
        setSubtitle(`You asked: "${transcript}"`)

        try {
          // Get AI answer
          const resp = await fetch('/api/journey/ai-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicTitle, subjectId, notes,
              doubt: transcript,
            }),
          })
          const data = await resp.json()
          const answer = data.answer || data.sections?.[0]?.speakText || "I'm not sure about that. Let's continue with the notes."

          setDoubtAnswer(answer)
          await speak(answer)
        } catch {
          await speak("Sorry, I couldn't process that. Let's continue.")
        }

        // Resume from next section
        setState('playing')
        await playSections(currentSectionIdx + 1)
        resolve()
      }

      rec.onerror = () => {
        setState('playing')
        playSections(currentSectionIdx)
        resolve()
      }

      rec.stop()
    })
  }, [topicTitle, subjectId, notes, currentSectionIdx, speak, playSections, resume])

  // Close / cleanup
  const close = useCallback(() => {
    speechSynthesis.cancel()
    recognitionRef.current?.stop()
    setState('idle')
    setSubtitle('')
    setActiveSectionId(null)
    setCurrentSectionIdx(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
      recognitionRef.current?.stop()
    }
  }, [])

  return {
    state,
    currentSectionIdx,
    totalSections: scriptsRef.current.length,
    subtitle,
    activeSectionId,
    doubtAnswer,
    start,
    pause,
    resume,
    startDoubt,
    stopDoubt,
    close,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/hooks/useAIGuide.ts
git commit -m "feat(ai-guide): add useAIGuide state machine hook"
```

---

## Task 3: AIGuideButton component

**Files:**
- Create: `components/journey/AIGuideButton.tsx`

- [ ] **Step 1: Create the button component**

```tsx
// components/journey/AIGuideButton.tsx
import { AIGuideState } from './hooks/useAIGuide'

interface AIGuideButtonProps {
  state: AIGuideState
  onStart: () => void
  subjectColor: string
}

export default function AIGuideButton({ state, onStart, subjectColor }: AIGuideButtonProps) {
  if (state !== 'idle' && state !== 'loading') return null

  const isLoading = state === 'loading'

  return (
    <button
      onClick={onStart}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '16px 20px',
        borderRadius: 16,
        border: `1.5px solid ${isLoading ? 'rgba(255,255,255,0.1)' : subjectColor + '50'}`,
        background: isLoading
          ? 'rgba(255,255,255,0.03)'
          : `linear-gradient(135deg, ${subjectColor}15, ${subjectColor}08)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        cursor: isLoading ? 'wait' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer animation */}
      {!isLoading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'aig-shimmer 2.5s ease-in-out infinite',
        }} />
      )}

      {isLoading ? (
        <div style={{
          width: 20, height: 20,
          border: '2px solid rgba(255,255,255,0.15)',
          borderTopColor: subjectColor,
          borderRadius: '50%',
          animation: 'aig-spin 0.8s linear infinite',
        }} />
      ) : (
        <span style={{ fontSize: 18 }}>✨</span>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: isLoading ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.92)',
          letterSpacing: '-0.01em',
        }}>
          {isLoading ? 'Preparing your guide...' : 'AI Guided Learning'}
        </div>
        {!isLoading && (
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 500,
            marginTop: 2,
          }}>
            Learn with your AI mentor
          </div>
        )}
      </div>

      <style>{`
        @keyframes aig-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes aig-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/AIGuideButton.tsx
git commit -m "feat(ai-guide): add AIGuideButton with shimmer animation"
```

---

## Task 4: AIGuideOverlay component

**Files:**
- Create: `components/journey/AIGuideOverlay.tsx`

- [ ] **Step 1: Create the overlay component**

```tsx
// components/journey/AIGuideOverlay.tsx
import { AIGuideState } from './hooks/useAIGuide'

interface AIGuideOverlayProps {
  state: AIGuideState
  subtitle: string
  currentSectionIdx: number
  totalSections: number
  activeSectionId: string | null
  subjectColor: string
  onPause: () => void
  onResume: () => void
  onStartDoubt: () => void
  onStopDoubt: () => void
  onClose: () => void
  onStartPractice: () => void
}

export default function AIGuideOverlay({
  state, subtitle, currentSectionIdx, totalSections,
  subjectColor, onPause, onResume, onStartDoubt, onStopDoubt,
  onClose, onStartPractice,
}: AIGuideOverlayProps) {
  if (state === 'idle' || state === 'loading') return null

  const isPlaying = state === 'playing'
  const isPaused = state === 'paused'
  const isDoubt = state === 'doubt'
  const isAnswering = state === 'answering'
  const isComplete = state === 'complete'

  return (
    <>
      {/* Narration subtitle at top */}
      {subtitle && !isComplete && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 200,
          padding: '48px 16px 12px',
          background: 'linear-gradient(180deg, rgba(5,5,16,0.92) 0%, rgba(5,5,16,0.6) 70%, transparent 100%)',
          animation: 'aig-fadeIn 0.3s ease',
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: 340,
            margin: '0 auto',
          }}>
            {isDoubt ? '🎤 Listening...' : isAnswering ? '🤔 Thinking...' : `"${subtitle}"`}
          </div>
        </div>
      )}

      {/* Floating bottom bar */}
      <div style={{
        position: 'fixed',
        bottom: 90,
        left: 12, right: 12,
        zIndex: 200,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20,
        padding: isComplete ? '16px 20px' : '12px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'aig-slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {isComplete ? (
          /* Complete: Practice CTA */
          <button
            onClick={onStartPractice}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 14,
              border: 'none',
              background: `linear-gradient(135deg, ${subjectColor}, ${subjectColor}cc)`,
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              animation: 'aig-breathe 2s ease-in-out infinite',
              boxShadow: `0 4px 20px ${subjectColor}40`,
            }}
          >
            🎯 Start Practice →
          </button>
        ) : (
          /* Playing/Paused/Doubt: Controls */
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Play/Pause */}
            <button
              onClick={isPlaying ? onPause : onResume}
              disabled={isDoubt || isAnswering}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `${subjectColor}25`,
                border: `1.5px solid ${subjectColor}50`,
                color: '#fff', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {isPlaying || isAnswering ? '⏸' : '▶️'}
            </button>

            {/* Progress dots */}
            <div style={{
              display: 'flex', gap: 5, flex: 1,
              justifyContent: 'center', flexWrap: 'wrap',
            }}>
              {Array.from({ length: totalSections }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < currentSectionIdx ? subjectColor
                      : i === currentSectionIdx ? subjectColor
                      : 'rgba(255,255,255,0.15)',
                    opacity: i === currentSectionIdx ? 1 : 0.7,
                    transition: 'all 0.3s',
                    animation: i === currentSectionIdx ? 'aig-dotPulse 1.5s ease-in-out infinite' : 'none',
                    boxShadow: i === currentSectionIdx ? `0 0 8px ${subjectColor}60` : 'none',
                  }}
                />
              ))}
            </div>

            {/* Mic button (push-to-talk) */}
            <button
              onTouchStart={(e) => { e.preventDefault(); onStartDoubt(); }}
              onTouchEnd={(e) => { e.preventDefault(); onStopDoubt(); }}
              onMouseDown={onStartDoubt}
              onMouseUp={onStopDoubt}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isDoubt
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'rgba(255,255,255,0.08)',
                border: isDoubt
                  ? '2px solid #fca5a5'
                  : '1.5px solid rgba(255,255,255,0.15)',
                color: '#fff', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {isDoubt ? (
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 3, borderRadius: 2,
                      background: '#fff',
                      animation: `aig-wave 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                    }} />
                  ))}
                </div>
              ) : '🎤'}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: 'none', color: 'rgba(255,255,255,0.4)',
                fontSize: 14, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

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
          from { height: 4px; }
          to { height: 14px; }
        }
      `}</style>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/AIGuideOverlay.tsx
git commit -m "feat(ai-guide): add floating overlay with controls + animations"
```

---

## Task 5: Integrate into TopicDetailSheet (mobile)

**Files:**
- Modify: `components/journey/TopicDetailSheet.tsx`

- [ ] **Step 1: Add imports at top of file**

At the top of TopicDetailSheet.tsx (after existing imports around line 12), add:

```typescript
import AIGuideButton from './AIGuideButton'
import AIGuideOverlay from './AIGuideOverlay'
import { useAIGuide } from './hooks/useAIGuide'
```

- [ ] **Step 2: Initialize useAIGuide hook inside the component**

After the existing `sectionRefs` definition (around line 114), add:

```typescript
  // AI Guide
  const aiGuide = useAIGuide({
    topicTitle: topic.title,
    subjectId: subject.id,
    notes,
    sectionRefs,
  })
```

- [ ] **Step 3: Add AIGuideButton after hero image**

Find the hero image section end (around line 1027). After the closing `})()}` of the hero image block, insert:

```tsx
              {/* AI Guided Learning button */}
              {notes && !notesLoading && variant !== 'inline' && variant !== 'desktop' && (
                <div style={{ padding: '0 20px', marginBottom: 8 }}>
                  <AIGuideButton
                    state={aiGuide.state}
                    onStart={aiGuide.start}
                    subjectColor={subject.color}
                  />
                </div>
              )}
```

- [ ] **Step 4: Add section glow styles**

Find each notes section card. They are wrapped in `<div ref={sectionRefs.X} ...>` elements. Add a conditional glow style to each section wrapper.

The simplest approach: add a CSS class. At the bottom of the component (before the final closing `</>`), add a global style block:

```tsx
      {/* AI Guide glow styles */}
      <style>{`
        .aig-section-active {
          box-shadow: 0 0 0 2px ${subject.color}40, 0 0 24px ${subject.color}15 !important;
          transition: box-shadow 0.5s ease !important;
        }
      `}</style>
```

Then for each section `ref` div, add a className:

For example, find the Hook section div (around line 1234):
```tsx
<div ref={sectionRefs.hook} className={aiGuide.activeSectionId === 'hook' ? 'aig-section-active' : ''}>
```

Repeat for all section refs: `overview`, `keyConcepts`, `timeline`, `examStrategy`, `quickFacts`, `keyTakeaways`, `connectedTopics`, `comparison`, `mindMap`, `pyqTrends`, `caseStudies`, `commonMistakes`, `mnemonic`, `answerFramework`, `sourceRecommendations`.

- [ ] **Step 5: Add AIGuideOverlay at the end of the component**

Before the closing `</>` of the component (last line), insert:

```tsx
      <AIGuideOverlay
        state={aiGuide.state}
        subtitle={aiGuide.subtitle}
        currentSectionIdx={aiGuide.currentSectionIdx}
        totalSections={aiGuide.totalSections}
        activeSectionId={aiGuide.activeSectionId}
        subjectColor={subject.color}
        onPause={aiGuide.pause}
        onResume={aiGuide.resume}
        onStartDoubt={aiGuide.startDoubt}
        onStopDoubt={aiGuide.stopDoubt}
        onClose={aiGuide.close}
        onStartPractice={onStartPractice}
      />
```

- [ ] **Step 6: Build and verify**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add components/journey/TopicDetailSheet.tsx
git commit -m "feat(ai-guide): integrate button + overlay into mobile TopicDetailSheet"
```

---

## Task 6: Handle doubt mode in API

**Files:**
- Modify: `app/api/journey/ai-guide/route.ts`

- [ ] **Step 1: Add doubt handling to the API**

In `app/api/journey/ai-guide/route.ts`, before the `try` block closes, add a doubt handler. After parsing the body, check for a `doubt` field:

```typescript
    // Handle doubt mode
    if (body.doubt) {
      const doubtPrompt = `You are Priya, a UPSC mentor. The student is studying "${topicTitle}" and asked:
"${body.doubt}"

Give a brief, helpful answer (2-3 sentences max). Be warm and encouraging. Reference the UPSC exam if relevant.
If you don't know, say so honestly.
Return strict JSON: {"answer": "Your answer here"}`

      const nvidia = getNvidia()
      const doubtResp = await nvidia.chat.completions.create({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: doubtPrompt }],
        temperature: 0.5,
        max_tokens: 300,
      })

      const doubtRaw = doubtResp.choices[0].message.content || ''
      const doubtMatch = doubtRaw.match(/\{[\s\S]*\}/)
      const doubtParsed = JSON.parse(doubtMatch ? doubtMatch[0] : `{"answer":"${doubtRaw}"}`)
      return NextResponse.json(doubtParsed)
    }
```

Insert this block right after `const { topicTitle, subjectId, notes } = body` and the validation check, before the main script generation logic.

- [ ] **Step 2: Commit**

```bash
git add app/api/journey/ai-guide/route.ts
git commit -m "feat(ai-guide): add doubt-answering mode to API"
```

---

## Task 7: Deploy and test on mobile

**Files:** none — testing only.

- [ ] **Step 1: Build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build passes.

- [ ] **Step 2: Deploy to Vercel**

Run: `npx vercel --prod 2>&1 | grep Aliased`
Expected: Deployment succeeds.

- [ ] **Step 3: Test on mobile**

Open https://loving-golick.vercel.app/journey on your phone:
1. Open any topic (e.g., Indus Valley Civilisation)
2. Scroll past the hero image
3. Verify "✨ AI Guided Learning" button appears with shimmer animation
4. Tap it → verify it shows "Preparing your guide..." spinner
5. After 2-3s → verify narration starts, subtitle appears at top
6. Verify auto-scroll to each section as it's discussed
7. Verify section glow effect on the active section
8. Tap pause → verify speech stops
9. Tap resume → verify speech continues
10. Hold mic → speak a question → release → verify AI answers
11. After all sections → verify "🎯 Start Practice →" CTA pulses

- [ ] **Step 4: Commit all changes**

```bash
git add -A
git commit -m "feat(ai-guide): complete AI Guided Learning for mobile notes"
```
