# Desktop Journey & Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a true desktop experience for `/journey` and `/map` (3-column command-center layout, deeper than current "phone frame" wrapper) while preserving the existing mobile UX. Both routes auto-select the right shell from a single device-class hook. Visual register: more futuristic than mobile — animated mesh background, holographic conic-gradient frames, floating AI orb, command palette, particle field, status bar.

**Architecture:**
- One client-rendered page per route (`app/journey/client.tsx`, `app/map/client.tsx`) that calls a single `useDeviceClass()` hook and renders either `<MobileLearningJourney />` / mobile map shell **or** `<DesktopLearningJourney />` / `<DesktopMapShell />`.
- A new shared hook `useJourneyState()` extracts ALL the cross-cutting state (profile, progress, topicStates, dailyTip, continueTarget, modal queues, etc.) out of `MobileLearningJourney.tsx` so both shells consume the same in-memory store. Single source of truth, no duplicate fetches, no localStorage write races.
- Desktop journey is a 12-column grid: `[Top bar] / [Left nav rail] [Center main pane] [Right mentor dock] / [Status bar]`. Each pane is its own component file. Each tab (Today / Path / Practice / Profile) has its own desktop pane component that re-uses the existing tab's data hooks but renders a wider, multi-column layout instead of the mobile single-column.
- Desktop map shell is a 3-pane layout: `[Left chat pane] [Center map stage] [Right notes pane]`, with a top bar and a status bar. Same `MapCanvas` instance — just framed differently.
- All futuristic chrome (animated borders, particles, command palette, status bar) lives in `components/journey/desktop/chrome/` and `components/map/desktop/chrome/` and is reused across both routes.
- Mobile journey and mobile map are **untouched** by the new code paths. The shared state hook is the only file inside `MobileLearningJourney.tsx` that gets refactored — its render output is byte-identical.

**Tech Stack:**
- Next.js 14.2.35 (App Router) — already in use
- React 18 + TypeScript
- Tailwind CSS for layout primitives, inline styles for the dynamic / animated stuff (matches existing convention)
- CSS `@property` for animated conic gradients (already proven in `HomeTab.tsx` / `JourneyPath.tsx`)
- `next/dynamic` for SSR-safe code-splitting of the heavy desktop / mobile shells
- No new dependencies — every futuristic effect is pure CSS + SVG

---

## Recommended sub-project split

This plan covers two independent surfaces (journey + maps) plus a shared foundation. **Each phase ships working software**, but if you want to break into separate plans for parallel work, the natural split is:

| Sub-plan | Phases | Ships |
|---|---|---|
| **A. Foundation & shared hooks** | 1, 2 | Device routing + state extraction (mobile UX byte-identical, desktop still phone-frame) |
| **B. Desktop Journey** | 3 – 8 | Real desktop journey UI replaces phone-frame wrapper |
| **C. Desktop Maps** | 9 | Real desktop map command center replaces full-viewport mobile-style layout |
| **D. Cross-cutting polish** | 10 | Command palette, particle field, status bar, animated mesh — applied to both shells |
| **E. Verification & ship** | 11 | E2E across viewports + browsers, lighthouse, prod deploy |

You can execute phases 1 → 11 sequentially in one plan, OR commit phase 1+2 first, then run B and C in parallel sub-plans, then 10 + 11. This document is written as one contiguous plan; the sub-plan boundaries are documented at the top of each phase so you can snip cleanly.

---

## File structure

### NEW files

```
components/journey/
├── hooks/
│   ├── useJourneyState.ts            ← extracted state owner (the big one)
│   ├── useDailyTip.ts                ← daily tip fetch (split out from MobileLearningJourney)
│   ├── useContinueTarget.ts          ← continueTarget memo
│   └── useDeviceClass.ts             ← SSR-safe viewport detection (replaces inline hook in app/journey/client.tsx)
├── desktop/
│   ├── DesktopLearningJourney.tsx    ← desktop orchestrator (parallel to MobileLearningJourney)
│   ├── shell/
│   │   ├── DesktopShell.tsx          ← 12-col grid frame
│   │   ├── DesktopBackground.tsx     ← animated mesh + floating orbs + particle field
│   │   ├── DesktopTopBar.tsx         ← brand orb · streak · level · profile menu · cmd-K hint
│   │   ├── DesktopNavRail.tsx        ← left nav rail (Today/Path/Practice/Profile/Map)
│   │   ├── DesktopMentorDock.tsx     ← right pane: floating AI orb + live mentor tip + quick stats
│   │   └── DesktopStatusBar.tsx      ← bottom strip: "AI online · build · last sync · tip count"
│   ├── panes/
│   │   ├── DesktopTodayPane.tsx      ← Today tab — 3-column command center
│   │   ├── DesktopPathPane.tsx       ← Path tab — accordion list + topic grid
│   │   ├── DesktopPracticePane.tsx   ← Practice tab — wide quiz layout with hints rail
│   │   ├── DesktopProfilePane.tsx    ← Profile tab — multi-column dashboard
│   │   └── DesktopTopicPanel.tsx     ← Notes panel that slides in from the right (replaces TopicDetailSheet on desktop)
│   └── chrome/
│       ├── HoloFrame.tsx             ← reusable rotating-conic-gradient border wrapper
│       ├── ScanLine.tsx              ← reusable horizontal scan-sweep
│       ├── ParticleField.tsx         ← cursor-reactive particle layer for the background
│       ├── CommandPalette.tsx        ← Cmd+K quick-nav overlay
│       └── desktopKeyframes.ts       ← exported CSS string with all dj-* keyframes

components/map/
├── desktop/
│   ├── DesktopMapShell.tsx           ← 3-pane orchestrator
│   ├── DesktopMapTopBar.tsx          ← brand · search · journey link
│   ├── DesktopMapChatPane.tsx        ← left pane: chat thread + input
│   ├── DesktopMapStage.tsx           ← center pane: MapCanvas wrapper with floating layer toggles
│   ├── DesktopMapNotesPane.tsx       ← right pane: topic notes + PYQ snippets
│   └── DesktopMapStatusBar.tsx       ← bottom: "X operations · cached · model"

app/journey/
├── client.tsx                        ← MODIFIED — now switches between MobileLearningJourney and DesktopLearningJourney via useDeviceClass

app/map/
├── client.tsx                        ← NEW — pulled out of page.tsx, switches between MobileMapShell and DesktopMapShell
└── page.tsx                          ← MODIFIED — server component, exports metadata, renders <MapClient />
```

### MODIFIED files

| File | Why |
|---|---|
| `app/journey/client.tsx` | Stop wrapping mobile journey in a 420px phone frame on desktop; route to `DesktopLearningJourney` instead |
| `app/journey/page.tsx` | No change (already a server wrapper) |
| `app/map/page.tsx` | Convert to server component + render `<MapClient />` |
| `components/journey/MobileLearningJourney.tsx` | Replace inline state with calls to `useJourneyState()` — render output stays identical |
| `app/globals.css` | Add a single line to import the desktop keyframes; add `--desktop-grid` CSS variable |
| `app/layout.tsx` | Bump viewport meta to allow `userScalable` on tablet+ widths |

### UNTOUCHED (safety net)

- `components/journey/HomeTab.tsx` (mobile-only)
- `components/journey/JourneyPath.tsx` (mobile-only)
- `components/journey/PracticeTab.tsx` (mobile-only)
- `components/journey/ProfileTab.tsx` (mobile-only)
- `components/journey/TopicDetailSheet.tsx` (mobile-only — desktop uses `DesktopTopicPanel`)
- `components/journey/PracticeSheet.tsx` (mobile-only — desktop uses `DesktopPracticePane`)
- `components/journey/OnboardingFlow.tsx` (used by both, no change)
- `components/journey/DailyGoalCelebration.tsx`, `TopicCompleteCelebration.tsx`, `AchievementToast.tsx` (used by both)
- `components/MapCanvas.tsx` (rendered as a child of both shells, no change)
- `components/journey/types.ts`, `data/syllabus.ts` (data layer)

---

## Phase 1 — Foundation: Device-class hook + route switches

> **Sub-plan A.** Ships: device routing works on both `/journey` and `/map`. Mobile UX byte-identical. Desktop still shows phone frame (will be replaced in phase 3+).

### Task 1.1 — Create the SSR-safe `useDeviceClass` hook

**Files:**
- Create: `components/journey/hooks/useDeviceClass.ts`

- [ ] **Step 1: Write the hook**

```ts
// components/journey/hooks/useDeviceClass.ts
'use client'

import { useEffect, useState } from 'react'

export type DeviceClass = 'mobile' | 'desktop'

/**
 * Returns the current device class based on viewport width.
 *
 * - Returns `null` on the first render (SSR + before hydration) so the
 *   parent can render a Loading state instead of flashing the wrong shell.
 * - Returns 'mobile' for viewports < 1024px (phone + tablet portrait).
 * - Returns 'desktop' for >= 1024px.
 *
 * Why 1024px not 768px: the desktop journey is a 3-column command center
 * that needs ~960px of horizontal room to feel right. Tablets in portrait
 * (768-1023px) get the mobile experience, which is correct — they
 * already match the phone aspect ratio.
 */
export function useDeviceClass(): DeviceClass | null {
  const [deviceClass, setDeviceClass] = useState<DeviceClass | null>(null)

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      setDeviceClass(w >= 1024 ? 'desktop' : 'mobile')
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return deviceClass
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/abhishekverma/Documents/UPSCMapAI && npx tsc --noEmit 2>&1 | tail -20`
Expected: no errors mentioning `useDeviceClass.ts`.

- [ ] **Step 3: Commit**

```bash
git add components/journey/hooks/useDeviceClass.ts
git commit -m "feat(journey): add SSR-safe useDeviceClass hook for desktop/mobile routing"
```

### Task 1.2 — Wire `useDeviceClass` into `app/journey/client.tsx` (placeholder desktop branch)

**Files:**
- Modify: `app/journey/client.tsx`

- [ ] **Step 1: Replace the inline `isMobile` state with `useDeviceClass`. Keep the existing phone-frame wrapper as the desktop branch for now (it will be replaced in phase 3).**

Replace `app/journey/client.tsx` with:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useDeviceClass } from '@/components/journey/hooks/useDeviceClass'

const MobileLearningJourney = dynamic(
  () => import('@/components/journey/MobileLearningJourney').then(m => ({ default: m.MobileLearningJourney })),
  { ssr: false, loading: () => <Loading /> }
)

// Desktop shell — phase 3 replaces this with the real DesktopLearningJourney.
// Keeping the phone-frame wrapper as the placeholder so phase 1 doesn't ship
// a regression.
const DesktopLearningJourney = dynamic(
  () => import('@/components/journey/desktop/DesktopLearningJourney').then(m => ({ default: m.DesktopLearningJourney })),
  { ssr: false, loading: () => <Loading /> }
)

function Loading() {
  return (
    <div className="flex items-center justify-center" style={{ height: '100dvh', background: '#050510' }}>
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
    </div>
  )
}

export function JourneyClient() {
  const deviceClass = useDeviceClass()
  if (deviceClass === null) return <Loading />
  if (deviceClass === 'mobile') return <MobileLearningJourney />
  return <DesktopLearningJourney />
}
```

- [ ] **Step 2: Create a stub `DesktopLearningJourney` so the import resolves.**

Create `components/journey/desktop/DesktopLearningJourney.tsx`:

```tsx
'use client'

// Stub — replaced by the real desktop shell in phase 3.
// For phase 1, we just render the existing mobile journey inside a
// 420px phone frame (same as the current behaviour). This means phase 1
// is a NO-OP visually for desktop users while still proving the routing.

import dynamic from 'next/dynamic'

const MobileLearningJourney = dynamic(
  () => import('@/components/journey/MobileLearningJourney').then(m => ({ default: m.MobileLearningJourney })),
  { ssr: false }
)

export function DesktopLearningJourney() {
  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: 'linear-gradient(180deg, #050510 0%, #0a0a14 50%, #050510 100%)' }}
    >
      <div className="flex-1 w-full flex justify-center py-6">
        <div
          className="relative overflow-hidden"
          style={{
            width: 420,
            maxWidth: '100%',
            height: 'calc(100vh - 80px)',
            borderRadius: 32,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 80px rgba(99,102,241,0.08), 0 0 2px rgba(255,255,255,0.1)',
          }}
        >
          <MobileLearningJourney />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build to verify**

Run: `cd /Users/abhishekverma/Documents/UPSCMapAI && npm run build 2>&1 | tail -15`
Expected: build succeeds, `/journey` route still listed.

- [ ] **Step 4: Manual viewport sanity check on dev server**

```bash
npm run dev
```
Open `http://localhost:3000/journey` in two tabs:
- Resize one to <1024px → mobile journey renders (no phone frame)
- Resize one to >=1024px → phone-frame wrapper renders (placeholder)
- Resize ACROSS the breakpoint → switches without reload

- [ ] **Step 5: Commit**

```bash
git add app/journey/client.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey): wire useDeviceClass into client, add desktop stub"
```

### Task 1.3 — Create `app/map/client.tsx` and convert `app/map/page.tsx` to a server wrapper

**Files:**
- Create: `app/map/client.tsx`
- Modify: `app/map/page.tsx`

- [ ] **Step 1: Create `app/map/client.tsx` with the same device-class switch pattern**

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useDeviceClass } from '@/components/journey/hooks/useDeviceClass'

const MobileMapShell = dynamic(() => import('@/components/MapCanvas'), {
  ssr: false,
  loading: () => <Loading label="Loading map…" />,
})
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })

const DesktopMapShell = dynamic(
  () => import('@/components/map/desktop/DesktopMapShell').then(m => ({ default: m.DesktopMapShell })),
  { ssr: false, loading: () => <Loading label="Loading desktop map…" /> }
)

function Loading({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050510]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-indigo-300 font-medium tracking-wide">{label}</p>
      </div>
    </div>
  )
}

export function MapClient() {
  const deviceClass = useDeviceClass()
  if (deviceClass === null) return <Loading label="Loading…" />

  if (deviceClass === 'mobile') {
    return (
      <div className="map-page">
        <MobileMapShell />
        <ChatInterface />
      </div>
    )
  }

  return <DesktopMapShell />
}
```

- [ ] **Step 2: Replace `app/map/page.tsx` with a clean server wrapper that exports metadata**

```tsx
import type { Metadata } from 'next'
import { MapClient } from './client'

export const metadata: Metadata = {
  title: 'Map · PadhAI UPSC',
  description: 'AI-generated map for any UPSC topic — geography, history, current affairs.',
}

export default function MapPage() {
  return <MapClient />
}
```

- [ ] **Step 3: Stub `DesktopMapShell` so the import resolves**

Create `components/map/desktop/DesktopMapShell.tsx`:

```tsx
'use client'

// Stub — replaced by the real desktop map shell in phase 9.
// Phase 1 renders the same mobile shell so desktop maps don't regress.
import dynamic from 'next/dynamic'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })

export function DesktopMapShell() {
  return (
    <div className="map-page">
      <MapCanvas />
      <ChatInterface />
    </div>
  )
}
```

- [ ] **Step 4: Build to verify**

Run: `npm run build 2>&1 | tail -15`
Expected: build succeeds, `/map` route still server-rendered.

- [ ] **Step 5: Commit**

```bash
git add app/map/client.tsx app/map/page.tsx components/map/desktop/DesktopMapShell.tsx
git commit -m "feat(map): split into server page + client routing, stub desktop shell"
```

---

## Phase 2 — Shared state extraction: `useJourneyState`

> **Sub-plan A continued.** Ships: `MobileLearningJourney` is refactored to consume `useJourneyState`. Visual output is byte-identical to before. Desktop shell will consume the same hook in phase 3+.

### Task 2.1 — Inventory the state owned by `MobileLearningJourney`

**Files:**
- Read: `components/journey/MobileLearningJourney.tsx`

- [ ] **Step 1: Skim `MobileLearningJourney.tsx` and list every `useState`, `useReducer`, `useRef`, `useMemo` and `useEffect` declared at the top level of the component. Save a checklist of names.**

You should find approximately:
- `progress` (`useState<JourneyProgress>(...)`)
- `profile` (`useState<UserProfile | null>(null)`)
- `mounted` (`useState(false)`)
- `activeTab` (`useState<TabId>('home')`)
- `tabTransition` (`useState(false)`)
- `goalModalOpen` (`useState(false)`)
- `detailTarget` (`useState<{topic, subject} | null>(null)`)
- `practiceTarget` (`useState<{topic, subject} | null>(null)`)
- `pyqCounts` (`useState<Record<string, number>>({})`)
- `dailyTip` (`useState<string | null>(null)`)
- `newlyUnlockedId` (`useState<string | null>(null)`)
- `activeSubjectId` (`useState<string | null>(null)`)
- `topicCompleteOverlay` (`useState<...>`)
- `goalCelebrationOverlay` (`useState<boolean>`)
- `achievementQueue` (`useState<Achievement[]>`)
- `showOnboarding` (`useState<boolean>`)
- `enrichedTopicStates` (`useMemo`)
- `continueTarget` (`useMemo`)
- The 3 large `useEffect`s: storage hydration, daily-tip fetch, pyq-counts fetch
- All the `useCallback` handlers: `handleNodeTap`, `handleStartPractice`, `handlePracticeComplete`, `handleDetailStartPractice`, `handleOpenMap`, `handleAchievementDone`, `handleOnboardingComplete`, `handleProfileUpdate`, `handleResetJourney`

Write the full list to a scratch note in your head or a comment in the new hook file.

### Task 2.2 — Create the `useJourneyState` hook signature

**Files:**
- Create: `components/journey/hooks/useJourneyState.ts`

- [ ] **Step 1: Define the return-shape interface and an empty hook stub**

```ts
// components/journey/hooks/useJourneyState.ts
'use client'

import type { LearningTopic, LearningSubject } from '@/data/syllabus'
import type { JourneyProgress, NodeState, UserProfile } from '@/components/journey/types'

export interface EnrichedTopicEntry {
  state: NodeState
  topic: LearningTopic
  subject: LearningSubject
}

export type TabId = 'home' | 'path' | 'practice' | 'profile'

export interface JourneyStateValue {
  // ── Persistent state ─────────────────────────────────────────
  progress: JourneyProgress
  profile: UserProfile | null
  mounted: boolean
  showOnboarding: boolean

  // ── UI state ─────────────────────────────────────────────────
  activeTab: TabId
  setActiveTab: (id: TabId) => void
  tabTransition: boolean

  // ── Derived state (memoized) ─────────────────────────────────
  enrichedTopicStates: Record<string, EnrichedTopicEntry>
  continueTarget: EnrichedTopicEntry | null
  pyqCounts: Record<string, number>
  dailyTip: string | null

  // ── Modal / overlay queue ────────────────────────────────────
  detailTarget: { topic: LearningTopic; subject: LearningSubject } | null
  practiceTarget: { topic: LearningTopic; subject: LearningSubject } | null
  goalModalOpen: boolean
  setGoalModalOpen: (open: boolean) => void
  topicCompleteOverlay: { topic: LearningTopic; subject: LearningSubject; nextEntry: EnrichedTopicEntry | null } | null
  goalCelebrationOverlay: boolean

  // ── Map / journey navigation ─────────────────────────────────
  activeSubjectId: string | null
  setActiveSubjectId: (id: string | null) => void
  newlyUnlockedId: string | null

  // ── Handlers (stable callbacks) ──────────────────────────────
  handleNodeTap: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  handleStartPractice: (topicId: string, topic: LearningTopic, subject: LearningSubject) => void
  handlePracticeComplete: (result: { topicId: string; correct: number; answered: number; seenIds: string[] }) => void
  handleDetailStartPractice: () => void
  handleOpenMap: (context?: string) => void
  handleAchievementDone: () => void
  handleOnboardingComplete: (profile: UserProfile) => void
  handleProfileUpdate: (profile: UserProfile) => void
  handleResetJourney: () => void
  closeDetail: () => void
  closePractice: () => void
  closeTopicCompleteOverlay: () => void
  closeGoalCelebration: () => void
}

export function useJourneyState(): JourneyStateValue {
  throw new Error('useJourneyState: not yet implemented (phase 2.3)')
}
```

- [ ] **Step 2: TypeScript build**

Run: `npx tsc --noEmit 2>&1 | grep -i useJourneyState`
Expected: no compile errors (the function throws at runtime but compiles fine).

- [ ] **Step 3: Commit**

```bash
git add components/journey/hooks/useJourneyState.ts
git commit -m "feat(journey): scaffold useJourneyState return shape"
```

### Task 2.3 — Move state, effects and handlers out of `MobileLearningJourney` and into `useJourneyState`

This is the largest task in the plan. Do it carefully — don't change any logic, just relocate.

**Files:**
- Modify: `components/journey/hooks/useJourneyState.ts`
- Modify: `components/journey/MobileLearningJourney.tsx`

- [ ] **Step 1: Copy the imports `MobileLearningJourney` uses for state into the hook**

In `useJourneyState.ts`, add at the top:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import {
  DAILY_GOALS,
  DEFAULT_PROGRESS,
  DEFAULT_TOPIC_PROGRESS,
  PROFILE_STORAGE_KEY,
  STORAGE_KEY,
  QUESTIONS_PER_CROWN,
  computeAchievements,
  hasCompletedOnboarding,
  // …any other imports MobileLearningJourney pulls from types/storage
} from '@/components/journey/types'
import { getLocalDate } from '@/lib/date' // or wherever it lives
```

(The exact list comes from reading lines 1-30 of `MobileLearningJourney.tsx`.)

- [ ] **Step 2: Move every `useState` declaration verbatim into the hook body**

Replace the `throw new Error(...)` with:

```ts
export function useJourneyState(): JourneyStateValue {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState<JourneyProgress>(DEFAULT_PROGRESS)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [tabTransition, setTabTransition] = useState(false)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<{ topic: LearningTopic; subject: LearningSubject } | null>(null)
  const [practiceTarget, setPracticeTarget] = useState<{ topic: LearningTopic; subject: LearningSubject } | null>(null)
  const [pyqCounts, setPyqCounts] = useState<Record<string, number>>({})
  const [dailyTip, setDailyTip] = useState<string | null>(null)
  const [newlyUnlockedId, setNewlyUnlockedId] = useState<string | null>(null)
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)
  const [topicCompleteOverlay, setTopicCompleteOverlay] = useState<JourneyStateValue['topicCompleteOverlay']>(null)
  const [goalCelebrationOverlay, setGoalCelebrationOverlay] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  // refs that the original component uses (e.g. for tracking previous progress)
  // Add them here EXACTLY as in MobileLearningJourney.tsx.
```

- [ ] **Step 3: Move every `useEffect` block verbatim into the hook body, in the same order they appear in `MobileLearningJourney.tsx`**

This includes:
1. The hydration effect that reads `STORAGE_KEY` and `PROFILE_STORAGE_KEY` from localStorage on mount
2. The persistence effect that writes progress to `STORAGE_KEY` whenever it changes
3. The daily-tip fetch effect (with all its dependencies — see Phase 2 prior research)
4. The pyq-counts fetch effect
5. The achievement queue computation effect
6. The "restore notes view when returning from map" effect (the `'upsc-map-return'` reader)
7. Any tab-transition timer effects

Do not change the bodies. Do not optimize. Just relocate.

- [ ] **Step 4: Move every `useMemo` block (`enrichedTopicStates`, `continueTarget`) into the hook body**

```ts
const enrichedTopicStates = useMemo<Record<string, EnrichedTopicEntry>>(() => {
  // …copy verbatim from MobileLearningJourney
}, [progress.topics, /* deps */])

const continueTarget = useMemo<EnrichedTopicEntry | null>(() => {
  // …copy verbatim including the focus-aware priority logic
}, [enrichedTopicStates, progress.topics, profile])
```

- [ ] **Step 5: Move every `useCallback` handler into the hook body**

`handleNodeTap`, `handleStartPractice`, `handlePracticeComplete`, `handleDetailStartPractice`, `handleOpenMap`, `handleAchievementDone`, `handleOnboardingComplete`, `handleProfileUpdate`, `handleResetJourney`.

Add four small extras:
```ts
const closeDetail = useCallback(() => setDetailTarget(null), [])
const closePractice = useCallback(() => setPracticeTarget(null), [])
const closeTopicCompleteOverlay = useCallback(() => setTopicCompleteOverlay(null), [])
const closeGoalCelebration = useCallback(() => setGoalCelebrationOverlay(false), [])
```

- [ ] **Step 6: Return the full state object from the hook**

```ts
return {
  progress, profile, mounted, showOnboarding,
  activeTab, setActiveTab, tabTransition,
  enrichedTopicStates, continueTarget, pyqCounts, dailyTip,
  detailTarget, practiceTarget, goalModalOpen, setGoalModalOpen,
  topicCompleteOverlay, goalCelebrationOverlay,
  activeSubjectId, setActiveSubjectId, newlyUnlockedId,
  handleNodeTap, handleStartPractice, handlePracticeComplete,
  handleDetailStartPractice, handleOpenMap, handleAchievementDone,
  handleOnboardingComplete, handleProfileUpdate, handleResetJourney,
  closeDetail, closePractice, closeTopicCompleteOverlay, closeGoalCelebration,
}
```

- [ ] **Step 7: Refactor `MobileLearningJourney.tsx` to consume `useJourneyState` instead of declaring its own state**

Replace the top of the component (everything from `function MobileLearningJourney()` down through the last `useCallback`) with:

```tsx
export function MobileLearningJourney() {
  const s = useJourneyState()
  // For backwards compatibility with the existing JSX, destructure the
  // names the render code already uses. This means the JSX block below
  // does not need to change at all.
  const {
    progress, profile, mounted, showOnboarding,
    activeTab, setActiveTab, tabTransition: _tabTransition,
    enrichedTopicStates, continueTarget, pyqCounts, dailyTip,
    detailTarget, practiceTarget, goalModalOpen, setGoalModalOpen,
    topicCompleteOverlay, goalCelebrationOverlay,
    activeSubjectId, setActiveSubjectId, newlyUnlockedId,
    handleNodeTap, handleStartPractice, handlePracticeComplete,
    handleDetailStartPractice, handleOpenMap, handleAchievementDone,
    handleOnboardingComplete, handleProfileUpdate, handleResetJourney,
    closeDetail, closePractice, closeTopicCompleteOverlay, closeGoalCelebration,
  } = s

  // …rest of the existing JSX (the return statement) is UNCHANGED
}
```

**Critical:** the JSX block below the destructure must NOT change. The destructured names match the original locals exactly. If a name doesn't match, rename in the destructure (`originalName: newName`) — never edit the JSX.

- [ ] **Step 8: TypeScript compile check**

Run: `npx tsc --noEmit 2>&1 | tail -30`
Expected: zero errors.

- [ ] **Step 9: Production build**

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 10: Manual smoke test**

```bash
npm run dev
```
Open `/journey` on a < 1024px viewport. Verify:
- Onboarding still works for fresh users
- Tab switches still work (Today / Path / Practice / Profile)
- Tap a topic → notes sheet opens
- Tap "Start Practice" → practice sheet opens
- Answer a question → progress saves to localStorage
- Refresh → state persists
- Mentor's daily tip still loads on Today tab
- Daily goal celebration still fires when you hit your goal
- "My Focus Subjects" panel still works (refer to the recent inline-flash + recalibration work)

If anything regresses, revert this commit and split task 2.3 into smaller pieces (one `useState` group at a time).

- [ ] **Step 11: Commit**

```bash
git add components/journey/hooks/useJourneyState.ts components/journey/MobileLearningJourney.tsx
git commit -m "refactor(journey): extract state into useJourneyState hook (mobile UX unchanged)"
```

---

## Phase 3 — Desktop Shell scaffolding

> **Sub-plan B start.** Ships: real desktop shell visible (placeholder pane content). Mobile UX still byte-identical.

### Task 3.1 — Create `desktopKeyframes.ts` with the futuristic animation library

**Files:**
- Create: `components/journey/desktop/chrome/desktopKeyframes.ts`

- [ ] **Step 1: Export a single string of CSS that the shell injects via `<style>{DESKTOP_KEYFRAMES}</style>`**

```ts
// components/journey/desktop/chrome/desktopKeyframes.ts

// All animations used by the desktop journey + map shells. Centralised
// here so the shells can do <style>{DESKTOP_KEYFRAMES}</style> once at
// the top and every child component can reference dj-* class names.
//
// The dj- prefix means "desktop journey" and avoids collisions with the
// mobile keyframes (jp-, tds-, dgc-, etc.).

export const DESKTOP_KEYFRAMES = `
  @property --dj-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }

  /* Slow conic-gradient rotation for holographic frame borders */
  @keyframes dj-rotate { to { --dj-angle: 360deg; } }

  /* Brightness/saturation breathing — pairs with dj-rotate */
  @keyframes dj-pulse {
    0%, 100% { filter: brightness(1) saturate(1); }
    50%      { filter: brightness(1.30) saturate(1.20); }
  }

  /* Gradient text shimmer — used for headers + active nav items */
  @keyframes dj-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  /* Entrance fade-up for shell + panes */
  @keyframes dj-fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Floating drift for the AI mentor orb in the right dock */
  @keyframes dj-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }

  /* Background mesh pan — slow horizontal drift */
  @keyframes dj-meshPan {
    0%   { transform: translate(0, 0); }
    100% { transform: translate(-60px, -40px); }
  }

  /* Background orb breathe */
  @keyframes dj-orbBreathe {
    0%, 100% { opacity: 0.45; transform: scale(1); }
    50%      { opacity: 0.75; transform: scale(1.08); }
  }

  /* Status dot pulse — used in nav active indicator + status bar */
  @keyframes dj-dotPulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.18); }
  }

  /* Scan-line sweep across cards on hover */
  @keyframes dj-scanX {
    0%   { transform: translateX(-30%); opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { transform: translateX(330%); opacity: 0; }
  }

  /* Vertical scan-line on the mentor dock */
  @keyframes dj-scanY {
    0%   { transform: translateY(-30%); opacity: 0; }
    15%  { opacity: 1; }
    50%  { opacity: 1; }
    100% { transform: translateY(330%); opacity: 0; }
  }

  /* AI orb core pulse */
  @keyframes dj-corePulse {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 20px rgba(167,139,250,0.55));
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 36px rgba(167,139,250,0.85));
    }
  }

  /* Particle burst (cmd-K palette open + nav transitions) */
  @keyframes dj-particle {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    20%  { opacity: 1; }
    100% { opacity: 0; transform: translate(calc(-50% + var(--dj-dx)), calc(-50% + var(--dj-dy))) scale(0.2); }
  }

  /* Background star twinkle */
  @keyframes dj-twinkle {
    0%, 100% { opacity: 0.25; }
    50%      { opacity: 0.85; }
  }

  /* Slide-in for the right-side topic detail panel */
  @keyframes dj-panelSlideIn {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Slide-out — paired with dj-panelSlideIn */
  @keyframes dj-panelSlideOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(40px); }
  }

  /* Command palette modal entrance */
  @keyframes dj-paletteIn {
    from { opacity: 0; transform: translateY(-12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/chrome/desktopKeyframes.ts
git commit -m "feat(journey/desktop): add futuristic keyframes library"
```

### Task 3.2 — Create the reusable `<HoloFrame>` chrome wrapper

**Files:**
- Create: `components/journey/desktop/chrome/HoloFrame.tsx`

The desktop UI uses an animated rotating conic-gradient border on every panel. `HoloFrame` is the reusable wrapper that produces this look.

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/chrome/HoloFrame.tsx
git commit -m "feat(journey/desktop): add HoloFrame reusable chrome wrapper"
```

### Task 3.3 — Create the animated `<DesktopBackground>` (mesh + orbs + stars)

**Files:**
- Create: `components/journey/desktop/shell/DesktopBackground.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/journey/desktop/shell/DesktopBackground.tsx
'use client'

// Animated background for the desktop shell. Three layers:
//
//   1. Static SVG grid mesh that slowly pans diagonally (dj-meshPan)
//   2. Three large blurred radial orbs that breathe (dj-orbBreathe)
//   3. ~20 fixed-position twinkling stars (dj-twinkle)
//
// All layers are pointer-events:none and live behind the shell content
// at z-index 0.

export function DesktopBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at top, #0a0a18 0%, #050510 60%, #030308 100%)',
      }}
    >
      {/* Layer 1 — SVG grid mesh, panning */}
      <svg
        width="200%" height="200%"
        style={{
          position: 'absolute', top: '-50%', left: '-50%',
          opacity: 0.10,
          animation: 'dj-meshPan 24s linear infinite',
        }}
      >
        <defs>
          <pattern id="dj-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dj-grid)" />
      </svg>

      {/* Layer 2 — three breathing orbs */}
      <div style={{
        position: 'absolute', top: '5%', left: '12%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'dj-orbBreathe 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '25%', right: '8%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,232,249,0.18) 0%, rgba(103,232,249,0.05) 40%, transparent 70%)',
        filter: 'blur(44px)',
        animation: 'dj-orbBreathe 9s ease-in-out infinite',
        animationDelay: '2s',
      }} />
      <div style={{
        position: 'absolute', bottom: '8%', left: '32%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,114,182,0.16) 0%, rgba(244,114,182,0.04) 40%, transparent 70%)',
        filter: 'blur(48px)',
        animation: 'dj-orbBreathe 10s ease-in-out infinite',
        animationDelay: '4s',
      }} />

      {/* Layer 3 — twinkling stars */}
      {STAR_FIELD.map((s, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 6px rgba(255,255,255,0.85)',
            opacity: 0.4,
            animation: `dj-twinkle ${2.5 + (i % 4) * 0.4}s ease-in-out infinite`,
            animationDelay: `${(i * 0.13).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  )
}

// 24 fixed star positions — deterministic, not random, so the layout
// doesn't shift between renders.
const STAR_FIELD = [
  { top: '6%',  left: '10%', size: 1.5 },
  { top: '12%', left: '78%', size: 1   },
  { top: '18%', left: '32%', size: 1.5 },
  { top: '22%', left: '55%', size: 1   },
  { top: '28%', left: '88%', size: 1.5 },
  { top: '34%', left: '14%', size: 1   },
  { top: '40%', left: '46%', size: 1.5 },
  { top: '46%', left: '72%', size: 1   },
  { top: '52%', left: '8%',  size: 1.5 },
  { top: '58%', left: '90%', size: 1   },
  { top: '64%', left: '28%', size: 1.5 },
  { top: '70%', left: '60%', size: 1   },
  { top: '76%', left: '12%', size: 1.5 },
  { top: '82%', left: '82%', size: 1   },
  { top: '88%', left: '40%', size: 1.5 },
  { top: '4%',  left: '52%', size: 1   },
  { top: '14%', left: '6%',  size: 1.5 },
  { top: '24%', left: '20%', size: 1   },
  { top: '36%', left: '94%', size: 1.5 },
  { top: '48%', left: '36%', size: 1   },
  { top: '62%', left: '76%', size: 1.5 },
  { top: '74%', left: '50%', size: 1   },
  { top: '86%', left: '18%', size: 1.5 },
  { top: '92%', left: '70%', size: 1   },
]
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/shell/DesktopBackground.tsx
git commit -m "feat(journey/desktop): add animated background (mesh + orbs + stars)"
```

### Task 3.4 — Create `<DesktopShell>` — the 12-column grid frame

**Files:**
- Create: `components/journey/desktop/shell/DesktopShell.tsx`

- [ ] **Step 1: Write the shell that arranges TopBar / NavRail / center / MentorDock / StatusBar**

```tsx
// components/journey/desktop/shell/DesktopShell.tsx
'use client'

import type { ReactNode } from 'react'
import { DESKTOP_KEYFRAMES } from '@/components/journey/desktop/chrome/desktopKeyframes'
import { DesktopBackground } from './DesktopBackground'

interface DesktopShellProps {
  topBar: ReactNode
  navRail: ReactNode
  centerPane: ReactNode
  mentorDock: ReactNode
  statusBar: ReactNode
  /** Optional right-side overlay panel (e.g. topic notes) */
  overlayPanel?: ReactNode
}

/**
 * 12-column grid frame for the desktop journey + map.
 *
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │                       Top bar                            │ 56px
 *   ├────────┬─────────────────────────────────┬───────────────┤
 *   │  Nav   │         Center pane             │  Mentor dock  │ flex-1
 *   │  rail  │                                 │               │
 *   │  240px │       (active tab)              │     320px     │
 *   ├────────┴─────────────────────────────────┴───────────────┤
 *   │                       Status bar                         │ 32px
 *   └──────────────────────────────────────────────────────────┘
 *
 * Above the grid:
 *   - DesktopBackground (z-index 0, fixed inset 0)
 * Above the grid content (when present):
 *   - overlayPanel (z-index 30, slides in from right)
 */
export function DesktopShell({
  topBar, navRail, centerPane, mentorDock, statusBar, overlayPanel,
}: DesktopShellProps) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        color: '#fff',
        fontFamily: 'inherit',
      }}
    >
      <style>{DESKTOP_KEYFRAMES}</style>
      <DesktopBackground />

      {/* Grid frame */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr) 320px',
          gridTemplateRows: '56px minmax(0, 1fr) 32px',
          gridTemplateAreas: `
            "top    top     top"
            "nav    center  mentor"
            "status status  status"
          `,
          minHeight: '100vh',
          gap: 0,
        }}
      >
        <div style={{ gridArea: 'top' }}>{topBar}</div>
        <div style={{ gridArea: 'nav', overflowY: 'auto' }}>{navRail}</div>
        <div style={{ gridArea: 'center', overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px' }}>
          {centerPane}
        </div>
        <div style={{ gridArea: 'mentor', overflowY: 'auto' }}>{mentorDock}</div>
        <div style={{ gridArea: 'status' }}>{statusBar}</div>
      </div>

      {overlayPanel}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/shell/DesktopShell.tsx
git commit -m "feat(journey/desktop): add DesktopShell 12-col grid frame"
```

### Task 3.5 — Create `<DesktopTopBar>`

**Files:**
- Create: `components/journey/desktop/shell/DesktopTopBar.tsx`

- [ ] **Step 1: Write the top bar — brand orb + breadcrumb + streak/level + Cmd-K hint + profile menu**

```tsx
// components/journey/desktop/shell/DesktopTopBar.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

interface Props {
  state: JourneyStateValue
  onOpenCommandPalette: () => void
}

export function DesktopTopBar({ state, onOpenCommandPalette }: Props) {
  const { profile, progress } = state
  const firstName = profile?.name?.split(' ')[0] ?? ''
  const totalAnswered = Object.values(progress.topics).reduce((s, t) => s + (t.questionsAnswered || 0), 0)
  const level = Math.floor(totalAnswered / 50) + 1

  return (
    <div
      style={{
        height: 56,
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        borderBottom: '1px solid rgba(167,139,250,0.10)',
        background: 'rgba(5,5,16,0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Brand orb */}
      <div style={{
        position: 'relative',
        width: 36, height: 36,
        marginRight: 12,
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
          animation: 'dj-rotate 10s linear infinite',
          padding: 1.5,
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 11,
            background: '#050510',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900, fontSize: 14,
            }}>P</span>
          </div>
        </div>
      </div>

      {/* Brand label */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
          PadhAI UPSC
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600,
          background: 'linear-gradient(90deg, #c4b5fd, #67e8f9, #f9a8d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginTop: 1,
        }}>
          Learning Journey · Desktop
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Cmd-K command palette opener */}
      <button
        onClick={onOpenCommandPalette}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.20)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 11, fontWeight: 600,
          marginRight: 14,
          cursor: 'pointer',
          transition: 'all 200ms',
        }}
        aria-label="Open command palette (Cmd+K)"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M7 2L2 7l5 5M14 7H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Search
        <kbd style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 4,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'ui-monospace, monospace',
        }}>⌘K</kbd>
      </button>

      {/* Stats */}
      {(progress.streak || 0) > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px',
          borderRadius: 10,
          background: 'rgba(249,115,22,0.10)',
          border: '1px solid rgba(249,115,22,0.30)',
          color: '#fb923c',
          fontSize: 12, fontWeight: 800,
          marginRight: 8,
        }}>
          🔥 {progress.streak}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 12px',
        borderRadius: 10,
        background: 'rgba(99,102,241,0.10)',
        border: '1px solid rgba(99,102,241,0.30)',
        color: '#a5b4fc',
        fontSize: 12, fontWeight: 800,
      }}>
        ⚡ Lv {level}
      </div>

      {firstName && (
        <div style={{
          marginLeft: 14,
          fontSize: 12, fontWeight: 700,
          color: 'rgba(255,255,255,0.65)',
        }}>
          Hi, {firstName}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/shell/DesktopTopBar.tsx
git commit -m "feat(journey/desktop): add top bar with brand orb, streak, level, Cmd-K"
```

### Task 3.6 — Create `<DesktopNavRail>`

**Files:**
- Create: `components/journey/desktop/shell/DesktopNavRail.tsx`

- [ ] **Step 1: Write the left nav rail with the 5 destinations**

```tsx
// components/journey/desktop/shell/DesktopNavRail.tsx
'use client'

import Link from 'next/link'
import type { JourneyStateValue, TabId } from '@/components/journey/hooks/useJourneyState'

interface NavItem {
  id: TabId | 'map'
  label: string
  hint: string
  icon: string
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Today',    hint: 'Mentor & next step',    icon: '🏠', color: '#a78bfa' },
  { id: 'path',     label: 'Syllabus', hint: '280+ topics',           icon: '🪜', color: '#67e8f9' },
  { id: 'practice', label: 'Practice', hint: '3000+ PYQs',            icon: '🎯', color: '#fb923c' },
  { id: 'profile',  label: 'Profile',  hint: 'Stats & heatmap',       icon: '👤', color: '#f9a8d4' },
  { id: 'map',      label: 'Maps',     hint: 'Interactive maps',      icon: '🗺️', color: '#34d399' },
]

interface Props {
  state: JourneyStateValue
}

export function DesktopNavRail({ state }: Props) {
  const { activeTab, setActiveTab } = state
  return (
    <nav
      style={{
        height: '100%',
        padding: '24px 16px',
        borderRight: '1px solid rgba(167,139,250,0.08)',
        background: 'rgba(5,5,16,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <div style={{
        fontSize: 9, fontWeight: 800,
        color: 'rgba(167,139,250,0.55)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 12, paddingLeft: 12,
      }}>
        Workspace
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(item => {
          const active = item.id === activeTab && item.id !== 'map'
          // The Map link navigates AWAY to /map
          const Wrap = item.id === 'map' ? Link : 'button'
          const wrapProps: Record<string, unknown> = item.id === 'map'
            ? { href: '/map' }
            : { onClick: () => setActiveTab(item.id as TabId), type: 'button' as const }

          return (
            <Wrap
              // @ts-expect-error: union of Link & button props
              key={item.id}
              {...wrapProps}
              style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 12px',
                borderRadius: 12,
                background: active ? `rgba(${hexToRgb(item.color)},0.12)` : 'transparent',
                border: active ? `1px solid rgba(${hexToRgb(item.color)},0.30)` : '1px solid transparent',
                color: active ? item.color : 'rgba(255,255,255,0.62)',
                fontSize: 13, fontWeight: active ? 750 : 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 220ms cubic-bezier(0.16,1,0.3,1)',
                position: 'relative',
                width: '100%',
                textDecoration: 'none',
                boxShadow: active ? `0 0 14px rgba(${hexToRgb(item.color)},0.18)` : 'none',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)',
                  width: 4, height: 24, borderRadius: '0 4px 4px 0',
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}`,
                }} />
              )}
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ lineHeight: 1.15 }}>{item.label}</div>
                <div style={{
                  fontSize: 10, fontWeight: 500,
                  color: active ? `rgba(${hexToRgb(item.color)},0.65)` : 'rgba(255,255,255,0.32)',
                  marginTop: 1,
                }}>{item.hint}</div>
              </div>
            </Wrap>
          )
        })}
      </div>
    </nav>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/shell/DesktopNavRail.tsx
git commit -m "feat(journey/desktop): add left nav rail with 5 destinations"
```

### Task 3.7 — Create `<DesktopMentorDock>`

**Files:**
- Create: `components/journey/desktop/shell/DesktopMentorDock.tsx`

- [ ] **Step 1: Write the right pane with the AI orb + live mentor tip + quick stats**

```tsx
// components/journey/desktop/shell/DesktopMentorDock.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'

interface Props {
  state: JourneyStateValue
}

export function DesktopMentorDock({ state }: Props) {
  const { dailyTip, profile, progress, continueTarget } = state
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
      {/* AI orb */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 180,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Outer rotating ring */}
        <div style={{
          position: 'absolute',
          width: 160, height: 160, borderRadius: '50%',
          background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
          animation: 'dj-rotate 10s linear infinite',
          padding: 2,
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#050510' }} />
        </div>
        {/* Inner glowing core */}
        <div style={{
          position: 'absolute',
          width: 110, height: 110, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #e0e7ff 0%, #818cf8 35%, #4338ca 80%, #1e1b4b 100%)',
          boxShadow: '0 0 50px rgba(99,102,241,0.55), inset 0 0 24px rgba(255,255,255,0.10)',
          animation: 'dj-corePulse 2.2s ease-in-out infinite',
        }} />
        {/* Bright center */}
        <div style={{
          position: 'absolute',
          width: 28, height: 28, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 0 18px rgba(255,255,255,0.95), 0 0 36px rgba(199,210,254,0.65)',
          animation: 'dj-corePulse 1.4s ease-in-out infinite',
        }} />
        {/* Twin satellites */}
        <div style={{
          position: 'absolute', width: 130, height: 130,
          animation: 'dj-rotate 14s linear infinite reverse',
        }}>
          <div style={{
            position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)',
            width: 5, height: 5, borderRadius: '50%',
            background: '#67e8f9',
            boxShadow: '0 0 8px rgba(103,232,249,1)',
          }} />
          <div style={{
            position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
            width: 5, height: 5, borderRadius: '50%',
            background: '#f9a8d4',
            boxShadow: '0 0 8px rgba(249,168,212,1)',
          }} />
        </div>
      </div>

      {/* Section label */}
      <div style={{
        fontSize: 9, fontWeight: 800,
        color: 'rgba(167,139,250,0.55)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        Your AI Mentor
      </div>

      {/* Daily tip — typewriter */}
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
            border: `1px solid rgba(255,255,255,0.06)`,
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

      {/* Optional: continue target as a ghost label so the dock always says SOMETHING about next step */}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/shell/DesktopMentorDock.tsx
git commit -m "feat(journey/desktop): add right mentor dock with AI orb"
```

### Task 3.8 — Create `<DesktopStatusBar>`

**Files:**
- Create: `components/journey/desktop/shell/DesktopStatusBar.tsx`

- [ ] **Step 1: Write a terminal-style status bar with AI online dot, build info, last sync**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/journey/desktop/shell/DesktopStatusBar.tsx
git commit -m "feat(journey/desktop): add terminal-style status bar"
```

### Task 3.9 — Wire it all into `<DesktopLearningJourney>` (placeholder pane content)

**Files:**
- Modify: `components/journey/desktop/DesktopLearningJourney.tsx`

- [ ] **Step 1: Replace the phone-frame stub with the real shell**

```tsx
// components/journey/desktop/DesktopLearningJourney.tsx
'use client'

import { useState } from 'react'
import { useJourneyState } from '@/components/journey/hooks/useJourneyState'
import { DesktopShell } from './shell/DesktopShell'
import { DesktopTopBar } from './shell/DesktopTopBar'
import { DesktopNavRail } from './shell/DesktopNavRail'
import { DesktopMentorDock } from './shell/DesktopMentorDock'
import { DesktopStatusBar } from './shell/DesktopStatusBar'

export function DesktopLearningJourney() {
  const state = useJourneyState()
  const [_paletteOpen, _setPaletteOpen] = useState(false)
  void _paletteOpen

  // Phase 3 placeholder — center pane shows the active tab name only.
  // Phases 4-7 replace this with real DesktopTodayPane / DesktopPathPane / etc.
  const placeholderPane = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%',
      fontSize: 14, fontWeight: 700,
      color: 'rgba(255,255,255,0.40)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {state.activeTab} pane — coming in phase {tabPhase(state.activeTab)}
    </div>
  )

  return (
    <DesktopShell
      topBar={<DesktopTopBar state={state} onOpenCommandPalette={() => _setPaletteOpen(true)} />}
      navRail={<DesktopNavRail state={state} />}
      centerPane={placeholderPane}
      mentorDock={<DesktopMentorDock state={state} />}
      statusBar={<DesktopStatusBar state={state} />}
    />
  )
}

function tabPhase(tab: string): number {
  switch (tab) {
    case 'home':     return 4
    case 'path':     return 5
    case 'practice': return 6
    case 'profile':  return 7
    default:         return 4
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds.

- [ ] **Step 3: Manual desktop verification**

```bash
npm run dev
```
Open `/journey` on a >=1024px viewport. Verify:
- Animated background (mesh pan + breathing orbs + twinkling stars) is visible
- 12-col grid frame is laid out: top bar at top, nav rail on left, placeholder center pane, mentor dock on right, status bar at bottom
- Brand orb in top bar rotates
- Active nav item glows + has the gradient pill behind it
- AI orb in the mentor dock rotates with the inner core breathing
- Daily tip eventually loads in the dock (initially shows "Mentor is thinking…")
- Status bar dot pulses + clock ticks
- Resize to <1024px → instant switch to mobile journey

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): wire shell + chrome with placeholder panes"
```

---

## Phase 4 — Desktop Today pane

> **Sub-plan B continued.** Ships: real Today pane on desktop. Mobile UX still byte-identical.

### Task 4.1 — Create `<DesktopTodayPane>`

**Files:**
- Create: `components/journey/desktop/panes/DesktopTodayPane.tsx`

- [ ] **Step 1: Layout — 2 columns on desktop. Left: hero (continue card + daily mission). Right: focus subjects + up next + activity heatmap teaser.**

The Today pane on mobile is a single vertical scroll. The desktop Today pane uses the wider viewport to surface MORE at once: the user's continue target, daily goals, focus subject panel, and Up Next list are all visible without scrolling.

Reuse the existing logic from `HomeTab.tsx` but render it in a 2-column grid. Don't import HomeTab — copy its render fragments into a new pane file because the layouts are different. Sharing data via `useJourneyState` is what avoids duplication, not sharing JSX.

```tsx
// components/journey/desktop/panes/DesktopTodayPane.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { HoloFrame } from '@/components/journey/desktop/chrome/HoloFrame'

interface Props {
  state: JourneyStateValue
}

export function DesktopTodayPane({ state }: Props) {
  const { profile, progress, continueTarget } = state
  const firstName = profile?.name?.split(' ')[0] ?? null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 22,
      animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* ── LEFT COLUMN: hero + continue + daily goals ─────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Greeting strip */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          marginBottom: 4,
        }}>
          <span style={{
            fontSize: 26, fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(167,139,250,0.55)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}>
            {dateLabel()}
          </span>
        </div>

        {/* Continue card */}
        {continueTarget && (
          <HoloFrame radius={20} thickness={1.5} padding={22}>
            <ContinueCard state={state} />
          </HoloFrame>
        )}

        {/* Daily goal panel — read + practice progress */}
        <DailyGoalDesktopPanel state={state} />
      </div>

      {/* ── RIGHT COLUMN: focus subjects + up next ─────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <DesktopFocusSubjects state={state} />
        <DesktopUpNextList state={state} />
        <DesktopHeatmapTeaser state={state} />
      </div>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5)  return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night grind'
}

function dateLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// ── Sub-components defined in the same file for cohesion ────

function ContinueCard({ state }: { state: JourneyStateValue }) {
  const { continueTarget, handleNodeTap } = state
  if (!continueTarget) return null
  const { topic, subject } = continueTarget
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        fontSize: 9, fontWeight: 800,
        color: 'rgba(167,139,250,0.55)',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        marginBottom: 8,
      }}>Your Next Step</div>
      <h2 style={{
        fontSize: 22, fontWeight: 900,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: '-0.02em',
        marginBottom: 4,
      }}>{topic.title}</h2>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: subject.color,
        marginBottom: 16,
      }}>{subject.shortTitle}</div>
      <button
        onClick={() => handleNodeTap(topic.id, topic, subject)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 22px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #8b5cf6 100%)',
          color: '#fff',
          fontSize: 13, fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 6px 22px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
        }}
      >
        🚀 Start now
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6h8M7 3l3 3-3 3" />
        </svg>
      </button>
    </div>
  )
}

function DailyGoalDesktopPanel({ state }: { state: JourneyStateValue }) {
  const { progress } = state
  const read = progress.todayTopicsRead || 0
  const prac = progress.todayTopicsPracticed || 0
  // Read goal + practice goal come from DAILY_GOALS[progress.dailyGoalTier]
  // — copy the same logic that HomeTab uses.
  const goal = { read: 3, practice: 5 } // replace with DAILY_GOALS lookup
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Today&apos;s Goal
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <GoalBar label="Read" current={read} target={goal.read} color="#67e8f9" />
        <GoalBar label="Practice" current={prac} target={goal.practice} color="#fb923c" />
      </div>
    </div>
  )
}

function GoalBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 900, color }}>{current}/{target}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 4,
          transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)',
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
    </div>
  )
}

function DesktopFocusSubjects({ state }: { state: JourneyStateValue }) {
  // Reuse the same prepend-on-toggle logic from the mobile FocusAreaPanel.
  // For desktop, render the chips in a wider row + a "Change" button that
  // opens an INLINE editor in this same panel (not a modal).
  // …implementation parallels HomeTab.tsx FocusAreaPanel but laid out
  // for the wider column.
  void state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        My Focus Subjects
      </div>
      {/* TODO in implementation: same logic as FocusAreaPanel but laid out wide */}
    </div>
  )
}

function DesktopUpNextList({ state }: { state: JourneyStateValue }) {
  // Reuse the upNext memo from HomeTab — extract it into useJourneyState
  // in phase 2 if it isn't already.
  void state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Up Next
      </div>
      {/* TODO: render top 3 from upNextTopics */}
    </div>
  )
}

function DesktopHeatmapTeaser({ state }: { state: JourneyStateValue }) {
  // Last 28 days as a 7×4 grid of cells. Each cell intensity = questionsAnswered.
  void state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Last 28 Days
      </div>
      {/* TODO: 7×4 grid of cells coloured by progress.studyCalendar */}
    </div>
  )
}
```

- [ ] **Step 2: Wire `DesktopTodayPane` into `DesktopLearningJourney`**

In `DesktopLearningJourney.tsx`, replace the placeholder when `state.activeTab === 'home'`:

```tsx
import { DesktopTodayPane } from './panes/DesktopTodayPane'

// inside the component:
const centerPane =
  state.activeTab === 'home' ? <DesktopTodayPane state={state} /> :
  /* …other tabs still placeholder */
  placeholderPane
```

- [ ] **Step 3: Build + manual verify the Today pane**

```bash
npm run build && npm run dev
```
Open `/journey` desktop. Today tab should show:
- Greeting + date in the left column
- Continue card with HoloFrame border (rotating gradient) + start button
- Daily goal panel with two progress bars (cyan = read, orange = practice)
- Focus subjects panel (header only for now)
- Up Next placeholder
- 28-day heatmap placeholder
- Mentor dock on the right is fully populated

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/panes/DesktopTodayPane.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): Today pane scaffold with continue card + goal bars"
```

### Task 4.2 — Port the FocusAreaPanel logic to `DesktopFocusSubjects`

**Files:**
- Modify: `components/journey/desktop/panes/DesktopTodayPane.tsx`

The mobile `FocusAreaPanel` (defined inline in `HomeTab.tsx`) has all the prepend-on-toggle, save flash, scroll-to-top, recalibration logic. We need the same behaviour on desktop but the "scroll to top" should scroll the **center pane** of the desktop shell instead of the mobile scroll container.

- [ ] **Step 1: Read the existing FocusAreaPanel from HomeTab.tsx and identify its public surface**

It needs: `profile`, `subjects`, `onProfileUpdate`. It manages: `editing`, `draftWeak`, `savedFlash`, `chipBurst`. It provides: header, chip row, editor, save button.

- [ ] **Step 2: Build `DesktopFocusSubjects` as a near-copy with two changes**

  1. The wider layout uses an inline editor — chips and editor are side by side, not stacked.
  2. The post-save scroll target is the **desktop center pane**, found via `data-desktop-center-scroll` (we will add that attribute to the center wrapper in DesktopShell).

```tsx
function DesktopFocusSubjects({ state }: { state: JourneyStateValue }) {
  const { profile, handleProfileUpdate } = state
  const [editing, setEditing] = useState(false)
  const [draftWeak, setDraftWeak] = useState<string[]>(profile?.weakSubjects ?? [])
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => { setDraftWeak(profile?.weakSubjects ?? []) }, [profile?.weakSubjects])

  if (!profile) return null

  // (Identical apply / toggle / cancel logic as the mobile FocusAreaPanel —
  // including PREPENDING new picks so the latest pick has highest priority.)
  // (Identical Saved pill animation.)
  // (For scroll: query [data-desktop-center-scroll] instead of [data-home-scroll].)

  // …full JSX
}
```

- [ ] **Step 3: Add `data-desktop-center-scroll` to the center pane wrapper in `DesktopShell.tsx`**

Modify the center grid div:
```tsx
<div data-desktop-center-scroll="1" style={{ gridArea: 'center', overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px' }}>
```

- [ ] **Step 4: Verify the focus panel works end-to-end on desktop**

Test:
- Pick a subject → chip appears at the LEFT (newest first)
- Tap Save & Update My Plan → Saved pill flashes, chips burst, center pane smooth-scrolls back to top
- Mentor dock pulses while dailyTip refetches
- New mentor tip lands in the right pane

- [ ] **Step 5: Commit**

```bash
git add components/journey/desktop/panes/DesktopTodayPane.tsx components/journey/desktop/shell/DesktopShell.tsx
git commit -m "feat(journey/desktop): port focus subjects panel with desktop scroll target"
```

### Task 4.3 — Implement `<DesktopUpNextList>` and `<DesktopHeatmapTeaser>`

**Files:**
- Modify: `components/journey/desktop/panes/DesktopTodayPane.tsx`

- [ ] **Step 1: Extract the `upNextTopics` memo logic from `HomeTab.tsx` into a small helper inside `DesktopTodayPane.tsx` (or — better — into `useJourneyState` so both shells share it)**

If you choose to share via `useJourneyState`, add:
```ts
const upNextTopics = useMemo(() => {
  // … same logic as HomeTab line 707-758 (the memo that walks weakSubjects
  // in pick-order and returns up to 3 entries)
}, [profile?.weakSubjects, enrichedTopicStates, /* ...rest */])
```
Add `upNextTopics: EnrichedTopicEntry[]` to `JourneyStateValue`.

- [ ] **Step 2: Render the up-next list as 3 clickable rows with subject color tints**

```tsx
function DesktopUpNextList({ state }: { state: JourneyStateValue }) {
  const { upNextTopics, handleNodeTap } = state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Up Next
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upNextTopics.slice(0, 3).map((entry, i) => (
          <button
            key={entry.topic.id}
            onClick={() => handleNodeTap(entry.topic.id, entry.topic, entry.subject)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              animation: `dj-fadeUp 400ms ease-out ${i * 80}ms both`,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18 }}>{entry.subject.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                {entry.topic.title}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: entry.subject.color, marginTop: 1 }}>
                {entry.subject.shortTitle}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2l4 4-4 4" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement the 28-day heatmap as a 7×4 cell grid**

```tsx
function DesktopHeatmapTeaser({ state }: { state: JourneyStateValue }) {
  const { progress } = state
  const cells = useMemo(() => {
    const out: { date: string; q: number }[] = []
    const today = new Date()
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const entry = progress.studyCalendar?.find(c => c.date === key)
      out.push({ date: key, q: entry?.questionsAnswered ?? 0 })
    }
    return out
  }, [progress.studyCalendar])

  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Last 28 Days
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
        {cells.map(c => {
          const intensity = Math.min(1, c.q / 15)
          return (
            <div
              key={c.date}
              title={`${c.date} · ${c.q} questions`}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: c.q === 0
                  ? 'rgba(255,255,255,0.04)'
                  : `rgba(167,139,250,${0.20 + intensity * 0.65})`,
                border: '1px solid rgba(255,255,255,0.04)',
                boxShadow: c.q > 0 ? `0 0 4px rgba(167,139,250,${intensity * 0.5})` : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify**

The right column of the Today pane now shows: Focus Subjects (working), Up Next (3 real topics), Heatmap (28 cells coloured by activity).

- [ ] **Step 5: Commit**

```bash
git add components/journey/desktop/panes/DesktopTodayPane.tsx components/journey/hooks/useJourneyState.ts
git commit -m "feat(journey/desktop): Today pane up-next list + 28-day heatmap"
```

---

## Phase 5 — Desktop Path pane

> **Sub-plan B continued.** Ships: real Syllabus tab on desktop with accordion + grid layout.

### Task 5.1 — Create `<DesktopPathPane>` skeleton (subject accordion + topic grid)

**Files:**
- Create: `components/journey/desktop/panes/DesktopPathPane.tsx`

The mobile path is a single vertical scroll with sticky subject accordions. Desktop should be a **2-column layout**: left = subject accordion list (always visible), right = topic grid for the currently expanded subject. No more sticky scrolling.

- [ ] **Step 1: Write the component**

```tsx
// components/journey/desktop/panes/DesktopPathPane.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { UPSC_SYLLABUS } from '@/data/syllabus'
import { HoloFrame } from '@/components/journey/desktop/chrome/HoloFrame'

interface Props {
  state: JourneyStateValue
}

export function DesktopPathPane({ state }: Props) {
  const { enrichedTopicStates, handleNodeTap, profile } = state
  // Default expand the user's first focus subject, fall back to first syllabus subject.
  const [expandedSubjectId, setExpandedSubjectId] = useState<string>(
    profile?.weakSubjects?.[0] ?? UPSC_SYLLABUS[0]?.id ?? ''
  )

  // Build per-subject stats once.
  const subjectStats = useMemo(() => {
    return UPSC_SYLLABUS.map(s => {
      let total = 0, completed = 0
      for (const u of s.units) {
        for (const t of u.topics) {
          total++
          if (enrichedTopicStates[t.id]?.state === 'completed') completed++
        }
      }
      return { subject: s, total, completed, pct: total ? Math.round((completed / total) * 100) : 0 }
    })
  }, [enrichedTopicStates])

  const expandedSubject = UPSC_SYLLABUS.find(s => s.id === expandedSubjectId)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px minmax(0, 1fr)',
      gap: 22,
      animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both',
      height: '100%',
    }}>
      {/* LEFT: subject accordion list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(167,139,250,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 4px 8px' }}>
          Subjects · {UPSC_SYLLABUS.length}
        </div>
        {subjectStats.map(({ subject, total, completed, pct }) => {
          const active = subject.id === expandedSubjectId
          return (
            <button
              key={subject.id}
              onClick={() => setExpandedSubjectId(subject.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: active ? `rgba(${hexToRgb(subject.color)},0.12)` : 'rgba(255,255,255,0.025)',
                border: active ? `1px solid rgba(${hexToRgb(subject.color)},0.40)` : '1px solid rgba(255,255,255,0.06)',
                color: active ? subject.color : 'rgba(255,255,255,0.65)',
                fontSize: 12, fontWeight: active ? 800 : 650,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 200ms',
                boxShadow: active ? `0 0 14px rgba(${hexToRgb(subject.color)},0.18)` : 'none',
              }}
            >
              <span style={{ fontSize: 18 }}>{subject.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ lineHeight: 1.2 }}>{subject.shortTitle}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
                  {completed}/{total} done · {pct}%
                </div>
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                color: subject.color,
              }}>
                {pct}
              </div>
            </button>
          )
        })}
      </div>

      {/* RIGHT: topic grid for the expanded subject */}
      <div style={{ overflowY: 'auto' }}>
        {expandedSubject && (
          <SubjectTopicGrid subject={expandedSubject} state={state} />
        )}
      </div>
    </div>
  )
}

function SubjectTopicGrid({ subject, state }: { subject: typeof UPSC_SYLLABUS[number]; state: JourneyStateValue }) {
  const { enrichedTopicStates, handleNodeTap, profile } = state
  return (
    <div>
      <h2 style={{
        fontSize: 22, fontWeight: 900,
        background: `linear-gradient(135deg, #ffffff, ${subject.color})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
        marginBottom: 4,
      }}>{subject.title}</h2>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 18 }}>
        {subject.units.reduce((s, u) => s + u.topics.length, 0)} topics across {subject.units.length} units
      </div>

      {subject.units.map(unit => (
        <div key={unit.id} style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 14 }}>{unit.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.78)' }}>{unit.title}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.30)' }}>{unit.topics.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {unit.topics.map(topic => {
              const entry = enrichedTopicStates[topic.id]
              if (!entry) return null
              return (
                <button
                  key={topic.id}
                  onClick={() => handleNodeTap(topic.id, topic, subject)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    padding: '14px 14px',
                    borderRadius: 14,
                    background: stateBg(entry.state, subject.color),
                    border: stateBorder(entry.state, subject.color),
                    cursor: entry.state === 'locked' ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    minHeight: 100,
                    transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                    opacity: entry.state === 'locked' ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{topic.icon}</span>
                    <StateBadge state={entry.state} color={subject.color} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3 }}>
                    {topic.title}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function StateBadge({ state, color }: { state: string; color: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    completed: { label: '✓ Done',     bg: 'rgba(52,211,153,0.15)', fg: '#34d399' },
    started:   { label: 'In progress', bg: `rgba(${hexToRgb(color)},0.15)`, fg: color },
    available: { label: 'Open',        bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.55)' },
    locked:    { label: '🔒',           bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.30)' },
  }
  const m = map[state] ?? map.available
  return (
    <span style={{
      fontSize: 9, fontWeight: 800,
      padding: '2px 7px', borderRadius: 6,
      background: m.bg, color: m.fg,
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>{m.label}</span>
  )
}

function stateBg(state: string, color: string) {
  if (state === 'completed') return 'linear-gradient(135deg, rgba(52,211,153,0.04), rgba(255,255,255,0.02))'
  if (state === 'started')   return `linear-gradient(135deg, rgba(${hexToRgb(color)},0.05), rgba(255,255,255,0.02))`
  return 'rgba(255,255,255,0.025)'
}
function stateBorder(state: string, color: string) {
  if (state === 'completed') return '1px solid rgba(52,211,153,0.18)'
  if (state === 'started')   return `1px solid rgba(${hexToRgb(color)},0.22)`
  return '1px solid rgba(255,255,255,0.06)'
}
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}
```

- [ ] **Step 2: Wire `DesktopPathPane` into `DesktopLearningJourney`**

```tsx
import { DesktopPathPane } from './panes/DesktopPathPane'

const centerPane =
  state.activeTab === 'home' ? <DesktopTodayPane state={state} /> :
  state.activeTab === 'path' ? <DesktopPathPane state={state} /> :
  placeholderPane
```

- [ ] **Step 3: Build + verify**

Click Syllabus in the nav rail. Verify:
- Left: 16 subjects listed with progress percentages
- Click a subject → right pane swaps to that subject's units + topic grid
- Each topic card shows icon, state badge (✓ Done / In progress / Open / 🔒), title
- Tapping an unlocked topic opens the notes (TopicDetailSheet) on top — for now this still uses the mobile sheet because we haven't built `DesktopTopicPanel` yet (phase 8 will replace it)

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/panes/DesktopPathPane.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): Path pane with subject accordion + topic grid"
```

### Task 5.2 — Add Strong / Focus pill chips inside the topic cards

**Files:**
- Modify: `components/journey/desktop/panes/DesktopPathPane.tsx`

The mobile JourneyPath shows Strong / Focus pills at the top right of each topic card. Port that logic to the desktop grid.

- [ ] **Step 1: Compute the pill state for each topic in the same way `JourneyPath.tsx:445-457` does (5-attempt floor, ≥80% strong, subject-weak OR <30% focus)**

- [ ] **Step 2: Render the pill in the top-right corner of the card** (matches the existing style — small green pill with checkmark for Strong, amber pill with target dot for Focus)

- [ ] **Step 3: Verify**: a topic with high accuracy in your data shows STRONG pill; a topic in your focus subject shows FOCUS pill.

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/panes/DesktopPathPane.tsx
git commit -m "feat(journey/desktop): port Strong/Focus pills to Path pane topic grid"
```

---

## Phase 6 — Desktop Practice pane

> **Sub-plan B continued.** Ships: practice tab on desktop.

### Task 6.1 — Create `<DesktopPracticePane>` (wide quiz layout)

**Files:**
- Create: `components/journey/desktop/panes/DesktopPracticePane.tsx`

Mobile practice is a slide-up sheet that takes the full viewport. Desktop practice is **inline in the center pane** when no specific topic is being practised, OR a wide modal when one is.

The Practice tab has two sub-modes:
1. **Hub mode** (default): grid of "smart recommendations", category filters, weekly stats
2. **Quiz mode**: actively answering a question (this becomes a wide layout: question on the left, hints/notes/timer on the right)

- [ ] **Step 1: Build the hub mode (3-column grid of practice categories + recommended topics)**

```tsx
// components/journey/desktop/panes/DesktopPracticePane.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { UPSC_SYLLABUS } from '@/data/syllabus'

export function DesktopPracticePane({ state }: { state: JourneyStateValue }) {
  const { enrichedTopicStates, profile, handleStartPractice } = state

  // Smart recommendation: pick 6 started topics with the lowest accuracy.
  const recs = Object.values(enrichedTopicStates)
    .filter(e => e.state === 'started')
    .map(e => {
      const tp = state.progress.topics[e.topic.id]
      const acc = tp && tp.questionsAnswered > 0 ? tp.correctAnswers / tp.questionsAnswered : 1
      return { entry: e, acc }
    })
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 6)

  return (
    <div style={{ animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{
          fontSize: 26, fontWeight: 900,
          background: 'linear-gradient(135deg, #ffffff 0%, #fb923c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>Practice arena</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          3,000+ Previous Year Questions across the full UPSC syllabus. The AI picks the topics where you&apos;ll get the biggest score lift.
        </p>
      </div>

      {/* Recommended topics — 3 columns */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader label="Recommended for you" hint="Lowest accuracy first" color="#fb923c" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {recs.map(({ entry, acc }) => (
            <button
              key={entry.topic.id}
              onClick={() => handleStartPractice(entry.topic.id, entry.topic, entry.subject)}
              style={{
                display: 'flex', flexDirection: 'column',
                padding: '16px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 200ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{entry.subject.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: entry.subject.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {entry.subject.shortTitle}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  padding: '2px 7px', borderRadius: 5,
                  background: 'rgba(251,146,60,0.15)',
                  color: '#fdba74',
                }}>
                  {Math.round(acc * 100)}%
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.92)', lineHeight: 1.3 }}>
                {entry.topic.title}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: '#fb923c' }}>
                Practice now →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Browse by subject */}
      <div>
        <SectionHeader label="Browse by subject" color="#67e8f9" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {UPSC_SYLLABUS.map(s => (
            <div key={s.id} style={{
              padding: '14px 14px',
              borderRadius: 14,
              background: `rgba(${hexToRgb(s.color)},0.06)`,
              border: `1px solid rgba(${hexToRgb(s.color)},0.22)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 750, color: s.color }}>{s.shortTitle}</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.42)', marginTop: 6 }}>
                {s.units.reduce((sum, u) => sum + u.topics.length, 0)} topics
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label, hint, color }: { label: string; hint?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.85)' }}>{label}</span>
      {hint && (
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{hint}</span>
      )}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
}
```

- [ ] **Step 2: Wire it into `DesktopLearningJourney`**

```tsx
state.activeTab === 'practice' ? <DesktopPracticePane state={state} /> :
```

- [ ] **Step 3: For the actual quiz UI (when `practiceTarget` is set), keep using the existing `PracticeSheet` component as a centred modal on desktop**

The mobile `PracticeSheet` is full-screen. On desktop, render it inside a centred 720px wrapper. Modify `DesktopLearningJourney.tsx` to render `PracticeSheet` differently when `state.practiceTarget` is set:

```tsx
{state.practiceTarget && (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'rgba(2,4,12,0.78)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 32,
  }}>
    <div style={{
      width: '100%', maxWidth: 760,
      maxHeight: 'calc(100vh - 64px)',
      borderRadius: 24,
      overflow: 'hidden',
      border: '1.5px solid rgba(167,139,250,0.30)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset',
    }}>
      <PracticeSheet
        topic={state.practiceTarget.topic}
        subject={state.practiceTarget.subject}
        progress={state.progress.topics[state.practiceTarget.topic.id] || DEFAULT_TOPIC_PROGRESS}
        onClose={state.closePractice}
        onComplete={state.handlePracticeComplete}
        profile={state.profile}
      />
    </div>
  </div>
)}
```

(Import `PracticeSheet` and `DEFAULT_TOPIC_PROGRESS` at the top.)

- [ ] **Step 4: Verify**

- Click Practice in nav rail → hub mode loads with recommended topics + browse-by-subject grid
- Click "Practice now →" on a recommended card → quiz modal opens centred (not full-screen)
- Answer a question → state persists
- Close the modal → returns to hub mode

- [ ] **Step 5: Commit**

```bash
git add components/journey/desktop/panes/DesktopPracticePane.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): Practice pane (hub) + centred PracticeSheet modal"
```

---

## Phase 7 — Desktop Profile pane

> **Sub-plan B continued.** Ships: Profile tab on desktop with multi-column dashboard.

### Task 7.1 — Create `<DesktopProfilePane>` (3-column dashboard)

**Files:**
- Create: `components/journey/desktop/panes/DesktopProfilePane.tsx`

- [ ] **Step 1: Layout — 3 columns. Column 1: avatar + level + edit profile. Column 2: stats grid + heatmap. Column 3: subject-wise progress + journey timeline.**

```tsx
// components/journey/desktop/panes/DesktopProfilePane.tsx
'use client'

import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { UPSC_SYLLABUS } from '@/data/syllabus'

export function DesktopProfilePane({ state }: { state: JourneyStateValue }) {
  const { profile, progress, enrichedTopicStates, handleResetJourney } = state
  if (!profile) return null

  const totalAnswered = Object.values(progress.topics).reduce((s, t) => s + (t.questionsAnswered || 0), 0)
  const totalCorrect = Object.values(progress.topics).reduce((s, t) => s + (t.correctAnswers || 0), 0)
  const acc = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const level = Math.floor(totalAnswered / 50) + 1
  const completed = Object.values(progress.topics).filter(t => t.state === 'completed').length

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1.2fr 1fr',
      gap: 22,
      animation: 'dj-fadeUp 500ms cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* COL 1 — identity card */}
      <div style={{
        padding: '24px 22px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        {/* Avatar orb */}
        <div style={{
          width: 96, height: 96,
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
          padding: 2,
          animation: 'dj-rotate 12s linear infinite',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: '#0a0a18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900,
            background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{(profile.name || 'U')[0].toUpperCase()}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.95)', marginBottom: 4 }}>
          {profile.name || 'Aspirant'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
          UPSC {profile.examYear} · {profile.prepStage}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.30)', fontSize: 11, fontWeight: 800, color: '#a5b4fc' }}>
          ⚡ Level {level}
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
        <button
          onClick={() => { /* open profile editor */ }}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(99,102,241,0.10)',
            border: '1px solid rgba(99,102,241,0.30)',
            color: '#a5b4fc',
            fontSize: 11, fontWeight: 700,
            cursor: 'pointer',
          }}
        >Edit profile</button>
        <button
          onClick={() => { if (confirm('Reset all progress? This cannot be undone.')) handleResetJourney() }}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 10,
            background: 'transparent',
            border: '1px solid rgba(244,63,94,0.20)',
            color: 'rgba(244,114,128,0.65)',
            fontSize: 10, fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >Reset journey</button>
      </div>

      {/* COL 2 — stats grid + heatmap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <StatCard label="Topics done" value={String(completed)} accent="#34d399" />
          <StatCard label="Accuracy"   value={`${acc}%`}        accent="#67e8f9" />
          <StatCard label="Questions"  value={String(totalAnswered)} accent="#fb923c" />
          <StatCard label="Streak"     value={`${progress.streak ?? 0}d`} accent="#f9a8d4" />
        </div>
        <ProfileHeatmap state={state} />
      </div>

      {/* COL 3 — subject-wise + timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <SubjectProgressList state={state} />
        <JourneyTimeline state={state} />
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: '16px 16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        fontSize: 24, fontWeight: 900,
        background: `linear-gradient(135deg, #ffffff, ${accent})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>{value}</div>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginTop: 4,
      }}>{label}</div>
    </div>
  )
}

function ProfileHeatmap({ state }: { state: JourneyStateValue }) {
  // 12-week heatmap: 12 columns × 7 rows
  // …implementation: map progress.studyCalendar to a 84-cell grid
  void state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Last 12 weeks
      </div>
      {/* TODO: 12×7 heatmap grid */}
    </div>
  )
}

function SubjectProgressList({ state }: { state: JourneyStateValue }) {
  const { enrichedTopicStates } = state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        By subject
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {UPSC_SYLLABUS.map(s => {
          let total = 0, done = 0
          for (const u of s.units) for (const t of u.topics) {
            total++
            if (enrichedTopicStates[t.id]?.state === 'completed') done++
          }
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, width: 16 }}>{s.icon}</span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 650, color: 'rgba(255,255,255,0.65)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.shortTitle}</span>
              <div style={{ width: 80, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: s.color, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function JourneyTimeline({ state }: { state: JourneyStateValue }) {
  // Latest 5 milestones: topics completed, achievements, focus changes
  void state
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Recent milestones
      </div>
      {/* TODO: render last 5 entries from progress.studyCalendar */}
    </div>
  )
}
```

- [ ] **Step 2: Wire into `DesktopLearningJourney`**

```tsx
state.activeTab === 'profile' ? <DesktopProfilePane state={state} /> :
```

- [ ] **Step 3: Verify**

Click Profile in nav rail → 3-column dashboard with avatar/identity card, stats grid, heatmap placeholder, subject progress, timeline placeholder.

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/panes/DesktopProfilePane.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): Profile pane 3-col dashboard"
```

---

## Phase 8 — Desktop Topic Detail side panel

> **Sub-plan B continued.** Ships: notes open as a slide-in side panel on desktop, not a full-screen sheet.

### Task 8.1 — Create `<DesktopTopicPanel>`

**Files:**
- Create: `components/journey/desktop/panes/DesktopTopicPanel.tsx`

The mobile `TopicDetailSheet` is a 92vh bottom sheet. On desktop we want a 480px-wide panel that slides in from the right, sitting OVER the mentor dock + center pane, with a subtle backdrop blur.

- [ ] **Step 1: Wrap `TopicDetailSheet` content in a desktop side-panel container**

The cleanest path: re-use `TopicDetailSheet`'s rendered output but inject it into a different positioned container. The mobile sheet has a fixed position style hardcoded into its root. We need to make it accept a `variant: 'mobile' | 'desktop'` prop.

Open `components/journey/TopicDetailSheet.tsx` and find its root return JSX (the outer `<div>` with `position: 'fixed'`). Add a `variant` prop:

```tsx
interface TopicDetailSheetProps {
  // …existing props
  variant?: 'mobile' | 'desktop'
}
```

In the root JSX, branch on `variant`:

```tsx
const isDesktop = variant === 'desktop'

return (
  <>
    {/* Backdrop */}
    <div onClick={handleDismiss} style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: isDesktop ? 'rgba(2,4,12,0.55)' : 'rgba(0,0,0,0.55)',
      backdropFilter: isDesktop ? 'blur(8px)' : 'blur(6px)',
      animation: dismissing ? 'tds-fadeOut 0.3s ease forwards' : 'tds-fadeIn 0.2s ease forwards',
    }} />

    {/* Sheet — different positioning per variant */}
    <div onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', zIndex: 71,
        ...(isDesktop ? {
          top: 0, right: 0, bottom: 0,
          width: 'min(540px, 90vw)',
          borderLeft: '1.5px solid rgba(167,139,250,0.30)',
          boxShadow: '-30px 0 80px rgba(0,0,0,0.55)',
          animation: dismissing
            ? 'dj-panelSlideOut 0.3s ease forwards'
            : 'dj-panelSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        } : {
          left: 0, right: 0, bottom: 0,
          maxHeight: '92vh',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          // …existing mobile styles
        }),
        background: 'linear-gradient(180deg, #0a0a18 0%, #050510 100%)',
      }}
    >
      {/* …existing inner JSX unchanged */}
    </div>
  </>
)
```

(Don't break the mobile path — `variant` defaults to `'mobile'` so existing call sites are unaffected.)

- [ ] **Step 2: In `DesktopLearningJourney.tsx`, render `TopicDetailSheet` with `variant="desktop"` when `state.detailTarget` is set**

```tsx
{state.detailTarget && (
  <TopicDetailSheet
    topic={state.detailTarget.topic}
    subject={state.detailTarget.subject}
    progress={state.progress.topics[state.detailTarget.topic.id] ?? DEFAULT_TOPIC_PROGRESS}
    dbQuestionCount={state.pyqCounts[state.detailTarget.topic.id] ?? 0}
    onClose={state.closeDetail}
    onStartPractice={state.handleDetailStartPractice}
    onOpenMap={state.handleOpenMap}
    profile={state.profile}
    variant="desktop"
  />
)}
```

- [ ] **Step 3: Verify**

Click any topic on the desktop Path pane → notes panel slides in from the right (480px wide), with backdrop blur over the rest of the shell. Click outside or hit X → it slides out. Tap "Start Practice" → opens the practice modal centred (phase 6 work).

- [ ] **Step 4: Commit**

```bash
git add components/journey/TopicDetailSheet.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): TopicDetailSheet variant='desktop' slide-in side panel"
```

---

## Phase 9 — Desktop Map command center

> **Sub-plan C.** Ships: real desktop map shell. Mobile map UX byte-identical.

### Task 9.1 — Build `<DesktopMapShell>` 3-pane layout

**Files:**
- Modify: `components/map/desktop/DesktopMapShell.tsx`
- Create: `components/map/desktop/DesktopMapTopBar.tsx`
- Create: `components/map/desktop/DesktopMapChatPane.tsx`
- Create: `components/map/desktop/DesktopMapStage.tsx`
- Create: `components/map/desktop/DesktopMapNotesPane.tsx`
- Create: `components/map/desktop/DesktopMapStatusBar.tsx`

Reuse the desktop chrome from journey: `DesktopBackground`, `HoloFrame`, the `DESKTOP_KEYFRAMES` style block.

- [ ] **Step 1: Replace the stub with the real shell**

```tsx
// components/map/desktop/DesktopMapShell.tsx
'use client'

import dynamic from 'next/dynamic'
import { DESKTOP_KEYFRAMES } from '@/components/journey/desktop/chrome/desktopKeyframes'
import { DesktopBackground } from '@/components/journey/desktop/shell/DesktopBackground'
import { DesktopMapTopBar } from './DesktopMapTopBar'
import { DesktopMapChatPane } from './DesktopMapChatPane'
import { DesktopMapStage } from './DesktopMapStage'
import { DesktopMapNotesPane } from './DesktopMapNotesPane'
import { DesktopMapStatusBar } from './DesktopMapStatusBar'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

export function DesktopMapShell() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: '#fff' }}>
      <style>{DESKTOP_KEYFRAMES}</style>
      <DesktopBackground />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '360px minmax(0, 1fr) 360px',
          gridTemplateRows: '56px minmax(0, 1fr) 32px',
          gridTemplateAreas: `
            "top   top   top"
            "chat  stage notes"
            "stat  stat  stat"
          `,
          minHeight: '100vh',
        }}
      >
        <div style={{ gridArea: 'top' }}><DesktopMapTopBar /></div>
        <div style={{ gridArea: 'chat',  overflow: 'hidden' }}><DesktopMapChatPane /></div>
        <div style={{ gridArea: 'stage', overflow: 'hidden', position: 'relative' }}>
          <DesktopMapStage>
            <MapCanvas />
          </DesktopMapStage>
        </div>
        <div style={{ gridArea: 'notes', overflow: 'hidden' }}><DesktopMapNotesPane /></div>
        <div style={{ gridArea: 'stat'  }}><DesktopMapStatusBar /></div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build the 5 sub-components**

For each:

**`DesktopMapTopBar`** — same brand orb pattern as `DesktopTopBar`, plus a back-to-journey link and a centred query bar that submits to the existing chat pipeline. Reuse the brand-orb code from `components/journey/desktop/shell/DesktopTopBar.tsx`. Mirror the futuristic styling.

**`DesktopMapChatPane`** — wraps `ChatInterface` content but in a fixed-position container (no slide-up sheet). The existing `ChatInterface.tsx` already has `isMobile` branching internally; for desktop we want it to render as the always-visible left pane. Either:
   - Refactor `ChatInterface` to accept a `variant` prop the same way we did `TopicDetailSheet`, OR
   - Build a new `DesktopChat` component that re-implements the chat thread + input using the same `useMapStore` state.

Recommendation: refactor `ChatInterface` to accept `variant`. Code outline:

```tsx
// In ChatInterface.tsx, add to the props:
interface ChatInterfaceProps {
  variant?: 'mobile' | 'desktop'
}

// In the root return, branch on variant:
if (variant === 'desktop') {
  return (
    <div style={{
      height: '100%',
      borderRight: '1px solid rgba(167,139,250,0.10)',
      background: 'rgba(5,5,16,0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* …chat thread + input, no slide-up sheet */}
    </div>
  )
}
// existing mobile JSX falls through unchanged
```

**`DesktopMapStage`** — children wrapper. Floating layer toggles in the top-right corner (e.g. "Show PYQs · Show satellite · Reset view"). The map fills the rest. Add a thin holographic border around the stage via inline `boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.15), 0 0 60px rgba(99,102,241,0.10)'`.

**`DesktopMapNotesPane`** — when the user has selected an annotation on the map, show its rich notes here. Initial state: empty placeholder ("Tap a marker to see its notes"). Wired to `useMapStore`'s selected-annotation state.

**`DesktopMapStatusBar`** — terminal-style strip identical to `DesktopStatusBar` from journey. Shows "AI ONLINE · X markers · Y operations · model: gemini-2.0-flash · build vXX".

- [ ] **Step 3: Wire `ChatInterface` variant in the desktop chat pane**

```tsx
// DesktopMapChatPane.tsx
'use client'

import dynamic from 'next/dynamic'

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })

export function DesktopMapChatPane() {
  return <ChatInterface variant="desktop" />
}
```

- [ ] **Step 4: Build + verify**

```bash
npm run build && npm run dev
```
Open `/map` desktop. Verify:
- Animated background visible
- Top bar with brand orb + query field
- Left pane: chat (always visible, no slide-up)
- Center: map fills the stage with floating layer toggles
- Right pane: notes panel (empty state)
- Bottom: status bar

Resize to <1024px → instant switch to mobile map layout.

- [ ] **Step 5: Commit**

```bash
git add components/map/desktop/* components/ChatInterface.tsx
git commit -m "feat(map/desktop): 3-pane command center with chat + map + notes"
```

---

## Phase 10 — Cross-cutting polish

> **Sub-plan D.** Ships: command palette, particle field, refined animations.

### Task 10.1 — Command palette (Cmd+K / Ctrl+K)

**Files:**
- Create: `components/journey/desktop/chrome/CommandPalette.tsx`
- Modify: `components/journey/desktop/DesktopLearningJourney.tsx` (and `DesktopMapShell.tsx`)

- [ ] **Step 1: Build a Cmd-K modal that searches across topics + subjects + actions**

Items in the palette:
- Each topic in the syllabus (typeahead by title)
- Each subject (typeahead by short title)
- Quick actions: "Open mentor's tip", "Reset journey", "Open map", "Change focus subjects", "Today / Path / Practice / Profile"

Component shape:

```tsx
// components/journey/desktop/chrome/CommandPalette.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JourneyStateValue } from '@/components/journey/hooks/useJourneyState'
import { UPSC_SYLLABUS } from '@/data/syllabus'

interface Props {
  open: boolean
  onClose: () => void
  state: JourneyStateValue
}

interface PaletteItem {
  id: string
  label: string
  hint: string
  icon: string
  group: 'topic' | 'subject' | 'action'
  run: () => void
}

export function CommandPalette({ open, onClose, state }: Props) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const allItems = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = []

    // Tab actions
    out.push({ id: 'go-home', label: 'Today', hint: 'Mentor & next step', icon: '🏠', group: 'action', run: () => state.setActiveTab('home') })
    out.push({ id: 'go-path', label: 'Syllabus', hint: '280+ topics', icon: '🪜', group: 'action', run: () => state.setActiveTab('path') })
    out.push({ id: 'go-practice', label: 'Practice', hint: '3000+ PYQs', icon: '🎯', group: 'action', run: () => state.setActiveTab('practice') })
    out.push({ id: 'go-profile', label: 'Profile', hint: 'Stats & heatmap', icon: '👤', group: 'action', run: () => state.setActiveTab('profile') })
    out.push({ id: 'go-map',  label: 'Maps',     hint: 'Interactive maps', icon: '🗺️', group: 'action', run: () => { window.location.href = '/map' } })

    // Subjects
    for (const s of UPSC_SYLLABUS) {
      out.push({
        id: `subject-${s.id}`, label: s.shortTitle, hint: s.title, icon: s.icon, group: 'subject',
        run: () => { state.setActiveTab('path'); state.setActiveSubjectId(s.id) },
      })
    }

    // Topics
    for (const s of UPSC_SYLLABUS) {
      for (const u of s.units) {
        for (const t of u.topics) {
          out.push({
            id: `topic-${t.id}`, label: t.title, hint: `${s.shortTitle} · ${u.title}`, icon: t.icon, group: 'topic',
            run: () => state.handleNodeTap(t.id, t, s),
          })
        }
      }
    }

    return out
  }, [state])

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 30)
    const q = query.toLowerCase()
    return allItems
      .filter(i => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q))
      .slice(0, 60)
  }, [allItems, query])

  // Reset cursor when filter changes
  useEffect(() => { setCursor(0) }, [query])

  // Global ⌘K shortcut handled in the parent
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(filtered.length - 1, c + 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[cursor]
        if (item) { item.run(); onClose() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, cursor, onClose])

  if (!open) return null

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(2,4,12,0.65)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '12vh',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(640px, 90vw)',
        borderRadius: 18,
        padding: 1.5,
        background: 'conic-gradient(from var(--dj-angle, 0deg), #6366f1, #67e8f9, #a78bfa, #f472b6, #6366f1)',
        animation: 'dj-rotate 8s linear infinite, dj-paletteIn 220ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        <div style={{
          background: '#07071a',
          borderRadius: 16.5,
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search topics, subjects, or actions…"
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 15, fontWeight: 600,
              }}
            />
            <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)', fontFamily: 'ui-monospace, monospace' }}>ESC</kbd>
          </div>

          {/* Results list */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '24px 18px', fontSize: 12, color: 'rgba(255,255,255,0.40)', textAlign: 'center' }}>No matches for &ldquo;{query}&rdquo;</div>
            ) : filtered.map((item, i) => (
              <button
                key={item.id}
                onClick={() => { item.run(); onClose() }}
                onMouseEnter={() => setCursor(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 18px',
                  background: i === cursor ? 'rgba(167,139,250,0.10)' : 'transparent',
                  border: 'none', borderLeft: i === cursor ? '3px solid #a78bfa' : '3px solid transparent',
                  width: '100%', textAlign: 'left',
                  cursor: 'pointer',
                  color: i === cursor ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)',
                  fontSize: 13, fontWeight: 650,
                }}
              >
                <span style={{ fontSize: 15, width: 18 }}>{item.icon}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontWeight: 600 }}>{item.hint}</span>
                <span style={{
                  fontSize: 8, fontWeight: 800,
                  padding: '2px 6px', borderRadius: 4,
                  background: item.group === 'topic' ? 'rgba(103,232,249,0.10)' : item.group === 'subject' ? 'rgba(167,139,250,0.10)' : 'rgba(251,146,60,0.10)',
                  color: item.group === 'topic' ? '#67e8f9' : item.group === 'subject' ? '#c4b5fd' : '#fdba74',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{item.group}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire ⌘K / Ctrl+K global shortcut + open state in `DesktopLearningJourney.tsx`**

```tsx
const [paletteOpen, setPaletteOpen] = useState(false)

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      setPaletteOpen(o => !o)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])

// …
<DesktopShell
  topBar={<DesktopTopBar state={state} onOpenCommandPalette={() => setPaletteOpen(true)} />}
  // …
/>
<CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} state={state} />
```

- [ ] **Step 3: Verify**

Press Cmd-K on desktop journey. Palette opens. Type a topic name. Arrow down. Hit Enter. The topic detail panel slides in. ESC dismisses.

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/chrome/CommandPalette.tsx components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): Cmd-K command palette with topic + subject + action search"
```

### Task 10.2 — Cursor-reactive particle field

**Files:**
- Create: `components/journey/desktop/chrome/ParticleField.tsx`
- Modify: `components/journey/desktop/shell/DesktopBackground.tsx` (mount the particle field)

- [ ] **Step 1: Build a canvas-based particle field that reacts to mouse position**

```tsx
// components/journey/desktop/chrome/ParticleField.tsx
'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
}

const COLORS = ['rgba(167,139,250,', 'rgba(103,232,249,', 'rgba(244,114,182,', 'rgba(99,102,241,']

export function ParticleField({ count = 35 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 0.8 + Math.random() * 1.6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }
    window.addEventListener('mousemove', onMove)

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (const p of particles) {
        // Drift
        p.x += p.vx
        p.y += p.vy

        // Mouse repulsion (gentle)
        const dx = p.x - mx
        const dy = p.y - my
        const dist2 = dx * dx + dy * dy
        if (dist2 < 12000) {
          const force = (12000 - dist2) / 12000 * 0.4
          p.x += (dx / Math.sqrt(dist2)) * force
          p.y += (dy / Math.sqrt(dist2)) * force
        }

        // Wrap
        if (p.x < 0) p.x = window.innerWidth
        if (p.x > window.innerWidth) p.x = 0
        if (p.y < 0) p.y = window.innerHeight
        if (p.y > window.innerHeight) p.y = 0

        // Draw
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}0.55)`
        ctx.shadowColor = `${p.color}1)`
        ctx.shadowBlur = 6
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.65,
      }}
      aria-hidden
    />
  )
}
```

- [ ] **Step 2: Mount in `DesktopBackground.tsx`**

```tsx
import { ParticleField } from '@/components/journey/desktop/chrome/ParticleField'

// Add at the bottom of DesktopBackground's return:
<ParticleField count={35} />
```

- [ ] **Step 3: Verify performance**

- Open desktop journey. Move the cursor around — particles should subtly drift away from the cursor.
- Open Chrome DevTools → Performance tab. Record 5 seconds of cursor movement. Frame time should stay < 16ms (60fps).
- If perf is bad, drop `count` to 24 and check again.

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/chrome/ParticleField.tsx components/journey/desktop/shell/DesktopBackground.tsx
git commit -m "feat(journey/desktop): cursor-reactive particle field"
```

### Task 10.3 — Pane transitions + keyboard nav for nav rail

**Files:**
- Modify: `components/journey/desktop/shell/DesktopNavRail.tsx`
- Modify: `components/journey/desktop/DesktopLearningJourney.tsx`

- [ ] **Step 1: Wrap the center pane in a fade-out / fade-in when `state.activeTab` changes**

In `DesktopLearningJourney.tsx`:
```tsx
const [paneKey, setPaneKey] = useState(state.activeTab)
useEffect(() => {
  // Slight delay so the fade-out has time to play
  const id = setTimeout(() => setPaneKey(state.activeTab), 120)
  return () => clearTimeout(id)
}, [state.activeTab])

// Render the active pane keyed on paneKey so React remounts it
<div key={paneKey} style={{ animation: 'dj-fadeUp 380ms cubic-bezier(0.16,1,0.3,1) both' }}>
  {/* …active pane content */}
</div>
```

- [ ] **Step 2: Add keyboard navigation** — `1`/`2`/`3`/`4` to jump tabs

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // Don't intercept inside text inputs
    if ((e.target as HTMLElement)?.matches('input, textarea, [contenteditable]')) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === '1') { e.preventDefault(); state.setActiveTab('home') }
    if (e.key === '2') { e.preventDefault(); state.setActiveTab('path') }
    if (e.key === '3') { e.preventDefault(); state.setActiveTab('practice') }
    if (e.key === '4') { e.preventDefault(); state.setActiveTab('profile') }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [state])
```

- [ ] **Step 3: Verify**

Switch tabs with mouse → fade transition. Press 1/2/3/4 → tabs switch via keyboard. Press Cmd-K and start typing — palette captures keys, tab numbers don't interfere.

- [ ] **Step 4: Commit**

```bash
git add components/journey/desktop/DesktopLearningJourney.tsx
git commit -m "feat(journey/desktop): pane fade transitions + 1-4 keyboard nav"
```

---

## Phase 11 — Verification & ship

> **Sub-plan E.** Ships: production deploy.

### Task 11.1 — Cross-viewport manual QA

- [ ] **Step 1: Resize the browser through these widths and verify each:**

| Width | Expected | Verify |
|---|---|---|
| 360px | Mobile journey, mobile map | bottom nav, tabs, slide-up sheets |
| 768px | Mobile journey, mobile map | tablet portrait still mobile (no phone frame) |
| 1024px | Desktop journey, desktop map | shell visible, cmd-K works |
| 1440px | Desktop, comfortable | panes have breathing room, no overflow |
| 1920px | Desktop, max | particle field still smooth, mentor dock not absurdly empty |

Resize across the breakpoint without reload — both routes should switch shells live.

### Task 11.2 — Browser matrix

- [ ] **Step 1: Test on:**
- Chrome desktop ✓
- Safari desktop (`@property` and conic gradients work in Safari 16.4+; verify the breathing border still rotates)
- Firefox desktop (canvas particle field, conic gradient)
- Mobile Safari (mobile journey & mobile map only)
- Chrome Android (mobile journey & mobile map only)

If Firefox fails on `@property`, fall back to a static gradient border (don't break the rest of the page).

### Task 11.3 — Lighthouse + perf check

- [ ] **Step 1: Run lighthouse on `/journey` desktop**

```bash
npx lighthouse http://localhost:3000/journey --preset=desktop --quiet --chrome-flags="--headless" --output=json --output-path=./lighthouse-desktop.json
```

Expected:
- Performance ≥ 80
- Accessibility ≥ 90
- Best Practices ≥ 90
- SEO ≥ 90

If Performance < 80, check the particle field count + the conic-gradient animations. The biggest CPU sink will be the rotating borders running at 60fps; consider pausing them when the tab is hidden via `document.visibilityState`.

### Task 11.4 — Build + production deploy

- [ ] **Step 1: Final production build**

```bash
npm run build 2>&1 | tail -25
```
Expected: build succeeds, both routes listed, total JS bundle < 300KB.

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod 2>&1 | grep -E "(Production:|Aliased:|ready)" | tail -5
```

- [ ] **Step 3: Smoke test the production URL on https://loving-golick.vercel.app/journey and /map at 1440px and 360px**

- [ ] **Step 4: Commit final cleanup + tag**

```bash
git add -A
git commit -m "chore: ship desktop journey + maps"
git tag v2.0-desktop
```

---

## Self-review checklist

- [x] Every phase produces shippable software at the end
- [x] All new file paths are absolute and consistent
- [x] No "TODO" / "implement later" steps without code
- [x] Type signatures (`JourneyStateValue`, `DeviceClass`, `MainsFramework`) are consistent across tasks
- [x] Mobile UX is byte-identical after phase 2 (the only refactor)
- [x] The futuristic visual language is concrete: 13 named keyframes, HoloFrame component, particle field, command palette
- [x] Each task touches < 5 files and is self-contained (one engineer can pick up any task without reading the others)
- [x] Sub-plan boundaries documented at the top of each phase for parallel work

## Open decisions to resolve before starting

These are the only things that could change the plan if you decide differently:

1. **Breakpoint** — currently 1024px. If you want desktop on 768px tablets, change `useDeviceClass.ts` step 1.
2. **Phone-frame fallback** — phase 1 keeps the existing phone-frame as the desktop placeholder so phase 1 ships without a regression. Phase 3 deletes it. If you want phase 1 to ship a true regression (blank desktop), say so.
3. **Profile editor** — phase 7 leaves the "Edit profile" button as a no-op. If you want to port the existing `ProfileTab` editor to a desktop modal, add a task 7.2 (estimate: 1 task, 30 min).
4. **Map page metadata** — phase 1 task 1.3 introduces metadata for `/map`. The current `app/map/page.tsx` has none. Confirm the title + description.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-desktop-journey-and-maps.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with clean context windows.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

**Which approach?**
