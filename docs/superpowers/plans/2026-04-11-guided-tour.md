# Post-Onboarding Guided Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a first-time user completes onboarding and lands on the Today tab, a 4-step spotlight tour walks them through the key features of the mobile app — Mentor, Next Step, Focus Subjects, and Tab Bar. Desktop is untouched.

**Architecture:** Install `driver.js` (~5KB) for the spotlight overlay + tooltip positioning. Create a single `GuidedTour.tsx` component that configures and fires the tour. Add `id` attributes to 4 target elements in the existing mobile components. The tour fires once (localStorage flag) and is only mounted inside `MobileLearningJourney`.

**Tech Stack:** driver.js (MIT, ~5KB gzip), React `useEffect`, `localStorage`, Next.js dynamic import with `ssr: false`

---

## File Structure

### New files
- `components/journey/GuidedTour.tsx` — the tour component (configures driver.js steps, custom CSS, fires on mount, sets localStorage flag)

### Modified files
- `package.json` — add `driver.js` dependency
- `components/journey/HomeTab.tsx` — add `id` attributes to 3 target elements (mentor card, continue card, focus panel)
- `components/journey/MobileLearningJourney.tsx` — add `id` attribute to tab bar, conditionally mount `<GuidedTour />`

### Untouched
- All desktop files (`components/journey/desktop/*`)
- `app/journey/client.tsx`
- `TopicDetailSheet.tsx`, `PracticeSheet.tsx`, `JourneyPath.tsx`

---

## Task 1: Install driver.js

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
cd /Users/abhishekverma/Documents/UPSCMapAI && npm install driver.js
```

- [ ] **Step 2: Verify it installed**

```bash
ls node_modules/driver.js/dist/driver.js.mjs && echo "OK"
```
Expected: file exists, prints "OK".

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install driver.js for guided tour"
```

---

## Task 2: Add `id` attributes to the 4 tour target elements

**Files:**
- Modify: `/Users/abhishekverma/Documents/UPSCMapAI/components/journey/HomeTab.tsx`
- Modify: `/Users/abhishekverma/Documents/UPSCMapAI/components/journey/MobileLearningJourney.tsx`

- [ ] **Step 1: Add `id="tour-mentor"` to the MentorsSuggestion wrapper in HomeTab.tsx**

Find line 913 (the `{/* Mentor's Suggestion */}` comment area). The `<MentorsSuggestion>` component is rendered at line 914. Wrap it OR find its parent `<div>` and add the id.

The MentorsSuggestion is rendered inside the greeting wrapper div. Find the div that contains it (around line 897-915). Add `id="tour-mentor"` to the outermost wrapper of the Mentor section. The simplest approach: wrap the `<MentorsSuggestion ... />` call in a div with the id:

```tsx
{/* Mentor's Suggestion — Apple-Intelligence-style AI brief */}
<div id="tour-mentor">
  <MentorsSuggestion tip={dailyTip} streak={progress.streak || 0} firstName={firstName} />
</div>
```

If `<MentorsSuggestion>` is already the direct child of a div, just add `id="tour-mentor"` to that parent div.

- [ ] **Step 2: Add `id="tour-next-step"` to the Continue Card / Hero CTA in HomeTab.tsx**

Find line 917 (`{/* ═══ 2. HERO CTA — one clear next action ═══ */}`). This section has multiple branches:
- `!hasStarted && !allCompleted` → welcome card
- `continueTopic` → continue card
- `allCompleted` → completed card

Add `id="tour-next-step"` to the OUTERMOST wrapper of this entire section. The simplest: wrap the conditional in a div:

```tsx
{/* ═══ 2. HERO CTA — one clear next action ═══ */}
<div id="tour-next-step">
  {!hasStarted && !allCompleted ? (
    /* ...welcome card... */
  ) : continueTopic ? (
    /* ...continue card... */
  ) : /* ...completed card... */ null}
</div>
```

- [ ] **Step 3: Add `id="tour-focus-subjects"` to the Focus Panel in HomeTab.tsx**

Find line 1324 (`{/* ═══ 5b. AI FOCUS CALIBRATION */}`). The `<FocusAreaPanel>` is rendered inside a wrapper div with an animation. Add `id="tour-focus-subjects"` to that wrapper:

Find the div that wraps `<FocusAreaPanel>` (should be around line 1325-1332) and add the id to it.

- [ ] **Step 4: Add `id="tour-tab-bar"` to the tab bar in MobileLearningJourney.tsx**

Find line 176 (`{/* Row 2: Segmented tab control */}`). The tab bar is a `<div>` with `height: 44, background: 'rgba(8,8,18,0.80)'`. Add `id="tour-tab-bar"` to this div:

```tsx
<div id="tour-tab-bar" style={{
  height: 44,
  background: 'rgba(8,8,18,0.80)',
  ...
}}>
```

- [ ] **Step 5: Verify build passes**

```bash
cd /Users/abhishekverma/Documents/UPSCMapAI && npm run build 2>&1 | tail -15
```
Expected: build succeeds. Adding `id` attributes has zero functional impact.

- [ ] **Step 6: Commit**

```bash
git add components/journey/HomeTab.tsx components/journey/MobileLearningJourney.tsx
git commit -m "feat(tour): add id attributes to 4 tour target elements"
```

---

## Task 3: Create the GuidedTour component

**Files:**
- Create: `/Users/abhishekverma/Documents/UPSCMapAI/components/journey/GuidedTour.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/journey/GuidedTour.tsx
'use client'

import { useEffect, useRef } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_DONE_KEY = 'padhai-tour-done'

const STEPS: DriveStep[] = [
  {
    element: '#tour-mentor',
    popover: {
      title: 'Meet Your AI Mentor',
      description:
        "Think of this as your personal UPSC coach. Every morning, it looks at what you've studied, where you're strong, where you need work — and tells you exactly what to do today. No more guessing what to study next.",
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-next-step',
    popover: {
      title: 'Start Here, Every Day',
      description:
        "This is your #1 action for right now. We've picked the topic that'll move the needle most for your preparation. Just tap and go — notes, PYQs, everything is ready inside.",
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '#tour-focus-subjects',
    popover: {
      title: 'Your Weak Areas, Your Rules',
      description:
        "You told us which subjects feel tough. We put them first in everything — your mentor tip, your next topic, your Up Next list. Changed your mind? Tap Change and we'll re-plan instantly.",
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '#tour-tab-bar',
    popover: {
      title: 'Your Entire Syllabus is Here',
      description:
        "Today gives you the daily plan. Syllabus shows you every single topic across GS I to IV — 280 topics, organised exactly like the UPSC syllabus. Open any topic to read AI notes and practice real PYQs.",
      side: 'top',
      align: 'center',
    },
  },
]

export function GuidedTour() {
  const started = useRef(false)

  useEffect(() => {
    // Only run once per mount, and only if the tour hasn't been completed
    if (started.current) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(TOUR_DONE_KEY) === '1') return

    started.current = true

    // Delay slightly so the HomeTab content has rendered and the
    // daily-tip API has had a moment to respond. The tour highlights
    // the mentor card even if it's still in loading state.
    const timer = window.setTimeout(() => {
      const tourDriver = driver({
        showProgress: true,
        steps: STEPS,
        overlayColor: 'black',
        overlayOpacity: 0.65,
        stagePadding: 10,
        stageRadius: 12,
        smoothScroll: true,
        allowKeyboardControl: true,
        // Tap the overlay to advance (mobile-friendly — no precise button taps needed)
        overlayClickBehavior: 'nextStep',
        // Custom button labels
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: "Let's Go! 🚀",
        // When the tour finishes or is dismissed, mark it done
        onDestroyed: () => {
          try { localStorage.setItem(TOUR_DONE_KEY, '1') } catch {}
        },
      })
      tourDriver.drive()
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [])

  return null // No visible DOM — driver.js creates its own overlay
}
```

- [ ] **Step 2: Add custom CSS to override driver.js defaults**

The driver.js default theme is light. We need dark styling to match the app. Add a global CSS import or inject styles. The cleanest approach: add the overrides to `app/globals.css` at the end of the file.

Open `/Users/abhishekverma/Documents/UPSCMapAI/app/globals.css` and append at the very end:

```css
/* ── Guided Tour (driver.js) — dark theme overrides ─────────────────── */
.driver-popover {
  background: rgba(10, 10, 20, 0.97) !important;
  border: 1.5px solid rgba(167, 139, 250, 0.30) !important;
  border-radius: 18px !important;
  padding: 20px !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04) inset !important;
  color: #fff !important;
  max-width: 320px !important;
}
.driver-popover * {
  font-family: inherit !important;
}
.driver-popover-title {
  font-size: 16px !important;
  font-weight: 800 !important;
  color: #fff !important;
  margin-bottom: 8px !important;
  letter-spacing: -0.01em !important;
}
.driver-popover-description {
  font-size: 13px !important;
  font-weight: 500 !important;
  color: rgba(255, 255, 255, 0.75) !important;
  line-height: 1.6 !important;
}
.driver-popover-progress-text {
  font-size: 10px !important;
  color: rgba(255, 255, 255, 0.35) !important;
  font-weight: 600 !important;
}
.driver-popover-navigation-btns {
  gap: 8px !important;
}
.driver-popover-next-btn,
.driver-popover-prev-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 10px 20px !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35) !important;
  text-shadow: none !important;
}
.driver-popover-prev-btn {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: none !important;
  color: rgba(255, 255, 255, 0.60) !important;
}
.driver-popover-close-btn {
  color: rgba(255, 255, 255, 0.40) !important;
}
.driver-popover-close-btn:hover {
  color: rgba(255, 255, 255, 0.80) !important;
}
.driver-popover-arrow-side-bottom .driver-popover-arrow,
.driver-popover-arrow-side-top .driver-popover-arrow,
.driver-popover-arrow-side-left .driver-popover-arrow,
.driver-popover-arrow-side-right .driver-popover-arrow {
  border-color: rgba(167, 139, 250, 0.30) !important;
}
/* Step dots — active is violet, inactive is dim */
.driver-popover-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.20) !important;
  border: none !important;
}
.driver-popover-dot.active {
  background: #a78bfa !important;
  box-shadow: 0 0 6px rgba(167, 139, 250, 0.6) !important;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/abhishekverma/Documents/UPSCMapAI && npx tsc --noEmit 2>&1 | grep -i "GuidedTour\|driver" | head -10
```
Expected: no errors mentioning GuidedTour or driver.

- [ ] **Step 4: Commit**

```bash
git add components/journey/GuidedTour.tsx app/globals.css
git commit -m "feat(tour): create GuidedTour component + dark theme CSS overrides"
```

---

## Task 4: Mount the tour in MobileLearningJourney

**Files:**
- Modify: `/Users/abhishekverma/Documents/UPSCMapAI/components/journey/MobileLearningJourney.tsx`

- [ ] **Step 1: Import GuidedTour with dynamic import (ssr: false)**

At the top of `MobileLearningJourney.tsx`, after the existing imports, add:

```tsx
import dynamic from 'next/dynamic'

const GuidedTour = dynamic(
  () => import('./GuidedTour').then(m => ({ default: m.GuidedTour })),
  { ssr: false }
)
```

Check if `dynamic` is already imported from `next/dynamic` — if so, just add the `GuidedTour` const.

- [ ] **Step 2: Render the tour conditionally**

Find the end of the component's return JSX in `MobileLearningJourney.tsx` — just before the closing fragment (`</>` or `</div>`). Add:

```tsx
{/* Guided tour — fires once for new users after onboarding */}
{mounted && !showOnboarding && activeTab === 'home' && (
  <GuidedTour />
)}
```

This ensures:
- `mounted` — component has hydrated (localStorage is available)
- `!showOnboarding` — onboarding is complete (user has a profile)
- `activeTab === 'home'` — user is on the Today tab (where the tour targets are)

The `GuidedTour` component handles the localStorage check internally and renders nothing (`return null`) — it only triggers the driver.js overlay via `useEffect`.

- [ ] **Step 3: Verify build**

```bash
cd /Users/abhishekverma/Documents/UPSCMapAI && npm run build 2>&1 | tail -15
```
Expected: build succeeds, `/journey` route present.

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

Open `http://localhost:3000/journey` on a mobile viewport (<1024px).

Test scenario 1 — Fresh user:
1. Clear localStorage: run `localStorage.clear()` in browser console
2. Refresh → onboarding should appear
3. Complete onboarding → Today tab loads → after ~1.2s the tour should start
4. Verify: dark overlay appears with a spotlight on the Mentor's Suggestion card
5. Tap "Next →" → spotlight moves to the Next Step card
6. Tap "Next →" → spotlight moves to the Focus Subjects panel
7. Tap "Next →" → spotlight moves to the Tab bar, button says "Let's Go! 🚀"
8. Tap "Let's Go!" → tour dismisses
9. Refresh → tour should NOT appear again (localStorage flag set)

Test scenario 2 — Returning user:
1. Without clearing localStorage, refresh
2. Tour should NOT appear

Test scenario 3 — Skip:
1. Clear localStorage, complete onboarding again
2. When tour starts, tap the X (close) button on the first tooltip
3. Tour should dismiss and NOT appear on refresh

- [ ] **Step 5: Commit**

```bash
git add components/journey/MobileLearningJourney.tsx
git commit -m "feat(tour): mount GuidedTour in MobileLearningJourney (mobile only)"
```

---

## Task 5: Build + deploy

- [ ] **Step 1: Final production build**

```bash
cd /Users/abhishekverma/Documents/UPSCMapAI && npm run build 2>&1 | tail -20
```
Expected: build succeeds, no errors.

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod 2>&1 | grep -E "(Production:|Aliased:|ready)" | tail -5
```

- [ ] **Step 3: Commit tag**

```bash
git tag v2.1-guided-tour
```

---

## Self-Review

- [x] Spec coverage: all 4 steps mapped to tasks, localStorage flag, skip support, custom CSS, mobile-only
- [x] No placeholders: every step has exact code or commands
- [x] Type consistency: `GuidedTour` export name, `DriveStep` type from driver.js, `TOUR_DONE_KEY` constant
- [x] Desktop untouched: `GuidedTour` only mounts inside `MobileLearningJourney`, which only renders on mobile viewports
- [x] Spec requirement: "fires once after onboarding" → Task 4 step 2 gates on `mounted && !showOnboarding && activeTab === 'home'`, and the component checks localStorage internally
- [x] Spec requirement: "custom CSS matching dark theme" → Task 3 step 2 adds globals.css overrides
- [x] Spec requirement: "4 steps with specific copy" → Task 3 step 1 defines all 4 steps with exact titles + descriptions
