# AI Guided Learning — Design Spec

## What This Is

An AI mentor that walks students through study notes section-by-section using voice narration, auto-scrolling, and interactive doubt-clearing. The AI speaks as a knowledgeable friend (Indian female voice), not a robotic reader. Students can pause anytime, hold a mic button to ask doubts, and get voice responses. After all sections are covered, the CTA to practice PYQs pulses.

## User Flow

1. Student opens a topic's notes in TopicDetailSheet
2. Below the hero image, a glowing "✨ AI Guided Learning" pill button appears
3. Student taps it → button transforms to loading ring ("Preparing your guide..." ~2-3s)
4. Audio begins playing. A floating bottom bar appears with pause, progress dots, and mic button
5. The notes auto-scroll to each section as the AI explains it. The active section gets a soft pulsing glow border
6. A narration subtitle shows at the top of the screen (what the AI is currently saying)
7. After each section, a 1-second pause. Student can hold the mic to ask a doubt
8. If student asks a doubt: voice → text (Web Speech API) → Groq generates answer → Edge TTS speaks it → resumes
9. After all sections complete: floating bar transforms into "🎯 Start Practice →" with pulse animation

## Architecture

### New Files

| File | Purpose |
|---|---|
| `components/journey/AIGuideButton.tsx` | Glowing CTA button with shimmer animation. Shows in TopicDetailSheet below hero image. |
| `components/journey/AIGuideOverlay.tsx` | Floating bottom bar: play/pause, progress dots, hold-to-talk mic, close button. Narration subtitle at top. Section glow manager. |
| `components/journey/hooks/useAIGuide.ts` | State machine hook: idle → loading → playing → paused → doubt → answering → complete. Manages audio playback, scroll sync, pre-fetching. |
| `app/api/journey/ai-guide/route.ts` | POST endpoint. Takes topic notes content, returns conversational explanations per section via Groq/NVIDIA LLM. |
| `app/api/journey/tts/route.ts` | POST endpoint. Takes text, returns Edge TTS audio as MP3 binary (via edge-tts Python subprocess or NVIDIA Riva). |

### Modified Files

| File | Change |
|---|---|
| `components/journey/TopicDetailSheet.tsx` | Add AIGuideButton below hero image. Pass section refs to AIGuideOverlay. Add glow styles to section cards when active. |

### State Machine

```
idle → (tap button) → loading
loading → (script + first 2 audios ready) → playing
playing → (tap pause) → paused
playing → (section ends, all done) → complete
playing → (hold mic) → doubt
paused → (tap resume) → playing
doubt → (release mic, speech captured) → answering
answering → (AI response audio finishes) → playing
complete → (tap practice CTA) → exits to PracticeSheet
```

### API: POST /api/journey/ai-guide

**Request:**
```json
{
  "topicId": "indus-valley",
  "topicTitle": "Indus Valley Civilisation",
  "subjectId": "ancient-history",
  "notes": {
    "hook": "Did you know...",
    "summary": "The Indus Valley...",
    "keyPoints": ["Point 1", "Point 2"],
    "timeline": [{"year": "2600 BCE", "event": "..."}],
    "examTip": "Focus on...",
    "keyTakeaways": ["..."]
  }
}
```

**Response:**
```json
{
  "sections": [
    {
      "sectionId": "hook",
      "speakText": "So here's something fascinating that most students miss...",
      "durationEstimate": 12
    },
    {
      "sectionId": "summary",
      "speakText": "Let me give you the big picture of the Indus Valley...",
      "durationEstimate": 18
    }
  ]
}
```

The LLM prompt instructs it to speak as a warm, experienced mentor. Use contractions, rhetorical questions, UPSC exam references. Each section explanation is 2-4 sentences (8-20 seconds spoken). Not verbatim notes — a conversational rewording.

### API: POST /api/journey/tts

**Request:**
```json
{
  "text": "So here's something fascinating...",
  "voice": "en-IN-NeerjaExpressiveNeural",
  "rate": "+5%",
  "pitch": "+2Hz"
}
```

**Response:** Binary MP3 audio (Content-Type: audio/mpeg)

Implementation: Runs `python3 -m edge_tts` as a subprocess. The TTS binary is already installed on the server. On Vercel, this will need a serverless function with Python runtime or a pre-generated audio cache approach.

**Vercel constraint:** Edge TTS requires Python. Two options:
1. Pre-generate audio at build time or via a separate worker
2. Use Web Speech API `speechSynthesis` as a client-side fallback (lower quality but zero server cost)

Recommended: Use Web Speech API `speechSynthesis` in the browser with the best available Indian English voice as the primary approach. It's instant (no API calls), works offline, and has zero cost. The quality is acceptable for guided learning (not a podcast). If the browser has no Indian English voice, fall back to the default English voice.

### Audio Pre-fetching Strategy (Hybrid)

1. When user taps "AI Guided Learning":
   - Call `/api/journey/ai-guide` to get all section scripts (1 API call)
   - Immediately start TTS for sections 1-2 using `speechSynthesis`
2. While section 1 plays:
   - Pre-synthesize sections 3-4 in background
3. Continue pre-fetching 2 sections ahead of current playback
4. Result: no upfront wait, no gaps between sections

### Doubt Handling

1. User holds mic button → `SpeechRecognition` starts (Web Speech API, browser-native)
2. User speaks their doubt, releases button → recognition stops, text captured
3. Text sent to `/api/journey/ai-guide` with `mode: "doubt"` + topic context
4. LLM generates a brief answer (1-3 sentences)
5. Answer spoken via `speechSynthesis`
6. After answer audio finishes → resume next section

### Scroll + Highlight Sync

The TopicDetailSheet already has:
- `sectionRefs` object mapping section IDs to DOM elements
- `IntersectionObserver` for TOC tracking

For AI Guide, reuse these refs:
1. When a section starts playing, call `sectionRefs[sectionId].scrollIntoView({ behavior: 'smooth', block: 'center' })`
2. Add a CSS class `ai-guide-active` to the section card that applies:
   - `box-shadow: 0 0 0 2px ${subjectColor}40, 0 0 20px ${subjectColor}20`
   - `transition: box-shadow 0.5s ease`
3. Remove class when moving to next section

### Component: AIGuideButton

Position: Below hero image in TopicDetailSheet, before the TOC.

```
┌─────────────────────────────────┐
│  ✨  AI Guided Learning         │  ← shimmer gradient sweep
│     Learn with your AI mentor   │
└─────────────────────────────────┘
```

- Full width, 56px height, rounded-2xl
- Background: subject color at 15% opacity
- Border: subject color at 30%
- Shimmer: CSS `@keyframes` gradient sweep left→right, 2s infinite
- Text: 16px bold "AI Guided Learning", 12px subtitle
- On tap: transforms into 48px circle with spinning progress ring

### Component: AIGuideOverlay

Floating bar fixed at bottom, above safe zone (bottom: 90px on mobile to avoid nav).

```
Playing state:
┌──────────────────────────────────────┐
│ ⏸  ● ● ○ ○ ○ ○ ○ ○ ○ ○       🎤  │
│     Hook  Overview  Keys...   Hold  │
└──────────────────────────────────────┘

Narration subtitle (top):
┌──────────────────────────────────────┐
│ "The Indus Valley had drainage       │
│  systems better than modern cities"  │
└──────────────────────────────────────┘

Complete state:
┌──────────────────────────────────────┐
│     🎯  Start Practice  →           │  ← breathing pulse
└──────────────────────────────────────┘
```

- Background: rgba(0,0,0,0.8) + backdrop-filter: blur(20px)
- Border-radius: 20px
- Padding: 12px 16px
- Progress dots: 8px circles, filled = completed sections, current = pulsing
- Mic button: 44px circle, hold state shows waveform animation
- Close (X) button: top-right corner, subtle

### Animations

| Animation | CSS |
|---|---|
| Button shimmer | `background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); background-size: 200%; animation: shimmer 2s infinite` |
| Section glow | `box-shadow: 0 0 0 2px ${color}40, 0 0 24px ${color}15; animation: glow-pulse 2s ease-in-out infinite` |
| Progress dot fill | `transform: scale(0) → scale(1); background: transparent → ${color}` |
| Mic waveform | 3 bars with `animation: wave 0.6s ease-in-out infinite` at different delays |
| CTA pulse | `animation: breathe 2s ease-in-out infinite` (scale 1 → 1.04 → 1) |
| Subtitle fade | `animation: fadeInUp 0.3s ease` on text change |
| Overlay slide-up | `animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1)` on mount |

### Voice Configuration

- **AI narration**: `window.speechSynthesis` with best available `en-IN` voice
- **Rate**: 1.0 (normal speed) — can be adjusted via settings
- **Pitch**: 1.0 (normal)
- **Fallback**: If no Indian English voice, use default English voice
- **User input**: `webkitSpeechRecognition` / `SpeechRecognition` with `lang: 'en-IN'`

### Mobile vs Desktop

- **Mobile**: Overlay at bottom (fixed), subtitle at top (fixed), notes scroll in middle
- **Desktop (inline variant)**: Same overlay + subtitle, positioned within the notes pane. Scroll happens within the pane container, not the window.

### Edge Cases

- **No microphone permission**: Hide mic button, show text input fallback for doubts
- **speechSynthesis not supported**: Show error "AI Guide requires Chrome or Safari"
- **Notes not loaded yet**: Disable button, show "Loading notes..." tooltip
- **User navigates away mid-guide**: Pause and save progress to localStorage. Resume on return.
- **Section has no content**: Skip section, move to next
- **LLM rate limit on doubt**: Show "Thinking..." for up to 10s, then fallback text response

### No New Dependencies

Everything uses browser-native APIs:
- `window.speechSynthesis` for TTS (no Edge TTS server needed)
- `SpeechRecognition` for voice input
- `Audio` element for playback control
- Existing Groq/NVIDIA API for LLM calls
