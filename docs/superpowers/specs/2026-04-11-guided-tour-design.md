# Post-Onboarding Guided Tour — Design Spec

## Goal

After a first-time user completes onboarding and lands on the Today tab, a 4-step spotlight tour walks them through the most important parts of the mobile app. Each step highlights one element, blurs everything else, and shows a friendly explainer written in a senior-mentor voice. Mobile only — desktop is untouched.

## Trigger

- Fires ONCE, immediately after onboarding completes (first render of HomeTab when `mounted && !showOnboarding && !localStorage.getItem('padhai-tour-done')`)
- On completion or skip, sets `localStorage.setItem('padhai-tour-done', '1')` — never shows again
- Does NOT fire for returning users (the localStorage flag persists)

## Tech

- **Library:** `driver.js` (~5KB gzip, MIT license)
- **Why not custom:** driver.js handles overlay rendering, cutout positioning, scroll-to-target, tooltip placement, keyboard nav, and responsive repositioning. Building this from scratch would be 300+ lines of edge-case code for no benefit.
- **Integration:** `'use client'` component, dynamic import with `ssr: false` to avoid hydration issues

## Visual Design

- **Overlay:** `rgba(0, 0, 0, 0.65)` — dark enough to clearly separate the spotlight from the background
- **Spotlight cutout:** 10px padding around the target element, 12px border-radius
- **Tooltip card:** Matches the app's existing dark glass aesthetic:
  - `background: rgba(10, 10, 20, 0.97)`
  - `border: 1.5px solid rgba(167, 139, 250, 0.30)`
  - `border-radius: 18px`
  - `padding: 20px`
  - `box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5)`
- **"Next" button:** Indigo gradient (`linear-gradient(135deg, #6366f1, #8b5cf6)`), white text, 12px border-radius, full width
- **"Skip tour" link:** Subtle `rgba(255,255,255,0.40)` text below the Next button
- **Step indicator:** Small dots (4 dots, active one is violet `#a78bfa`, inactive are `rgba(255,255,255,0.20)`)
- **Title:** 16px, weight 800, white
- **Description:** 13px, weight 500, `rgba(255,255,255,0.75)`, line-height 1.6

## Tour Steps (4 total)

### Step 1 — Meet Your AI Mentor
- **Target:** Mentor's Suggestion card (`#tour-mentor`)
- **Tooltip position:** bottom
- **Title:** "Meet Your AI Mentor"
- **Description:** "Think of this as your personal UPSC coach. Every morning, it looks at what you've studied, where you're strong, where you need work — and tells you exactly what to do today. No more guessing what to study next."

### Step 2 — Start Here, Every Day
- **Target:** Continue / Next Step card (`#tour-next-step`)
- **Tooltip position:** bottom
- **Title:** "Start Here, Every Day"
- **Description:** "This is your #1 action for right now. We've picked the topic that'll move the needle most for your preparation. Just tap and go — notes, PYQs, everything is ready inside."

### Step 3 — Your Weak Areas, Your Rules
- **Target:** Focus Subjects panel (`#tour-focus-subjects`)
- **Tooltip position:** top
- **Title:** "Your Weak Areas, Your Rules"
- **Description:** "You told us which subjects feel tough. We put them first in everything — your mentor tip, your next topic, your Up Next list. Changed your mind? Tap Change and we'll re-plan instantly."

### Step 4 — Your Entire Syllabus is Here
- **Target:** Tab bar (`#tour-tab-bar`)
- **Tooltip position:** top
- **Title:** "Your Entire Syllabus is Here"
- **Description:** "Today gives you the daily plan. Syllabus shows you every single topic across GS I to IV — 280 topics, organised exactly like the UPSC syllabus. Open any topic to read AI notes and practice real PYQs."

## User Interaction

- **Advance:** Tap "Next" button in the tooltip, OR tap the dark overlay area
- **Skip:** "Skip tour" link visible on every step — dismisses immediately and sets the localStorage flag
- **Last step:** "Next" button label changes to "Let's Go!" and dismisses the tour
- **Keyboard:** Arrow keys work (driver.js built-in) but not critical for mobile

## Files to Create/Modify

### New files
- `components/journey/GuidedTour.tsx` — the tour component. Imports driver.js, configures 4 steps with custom CSS theme, starts the tour on mount, sets localStorage on complete/skip.

### Modified files (mobile only)
- `package.json` — add `driver.js` as a dependency
- `components/journey/HomeTab.tsx` — add `id` attributes to the 4 target elements:
  - Mentor's Suggestion wrapper → `id="tour-mentor"`
  - Continue card / Your Next Step → `id="tour-next-step"`
  - Focus Subjects / Up Next panel → `id="tour-focus-subjects"`
  - Tab bar container (in MobileLearningJourney) → `id="tour-tab-bar"`
- `components/journey/MobileLearningJourney.tsx` — add `id="tour-tab-bar"` to the tab bar div, mount `<GuidedTour />` conditionally when `mounted && !showOnboarding && activeTab === 'home'`

### Untouched
- ALL desktop files (`components/journey/desktop/*`)
- `app/journey/client.tsx` (routing unchanged)
- All mobile component internals (only `id` attributes added — no styling or logic changes)

## Custom CSS Theme for driver.js

Override driver.js default styles to match the app's dark aesthetic:

```css
.driver-popover {
  background: rgba(10, 10, 20, 0.97) !important;
  border: 1.5px solid rgba(167, 139, 250, 0.30) !important;
  border-radius: 18px !important;
  padding: 20px !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
  color: #fff !important;
  max-width: 320px !important;
}
.driver-popover-title {
  font-size: 16px !important;
  font-weight: 800 !important;
  color: #fff !important;
}
.driver-popover-description {
  font-size: 13px !important;
  font-weight: 500 !important;
  color: rgba(255, 255, 255, 0.75) !important;
  line-height: 1.6 !important;
}
.driver-popover-footer button {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 10px 20px !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35) !important;
}
.driver-overlay {
  background: rgba(0, 0, 0, 0.65) !important;
}
```

## Edge Cases

- **Mentor tip not loaded yet:** The tour fires after a 1-second delay to give the daily tip API time to respond. If the mentor card is still in loading state, the tour still highlights it — the loading spinner is visible and the tooltip explains what will appear.
- **No continue target:** If `continueTarget` is null (all topics completed or fresh user with no started topic), step 2 targets the welcome/stats card instead.
- **Mobile keyboard open:** driver.js handles this — the overlay covers the keyboard area.
- **Scroll position:** driver.js smoothly scrolls to bring each target into view before highlighting.

## Success Criteria

- Tour fires exactly once for new users, immediately after onboarding
- All 4 spotlights correctly highlight their target elements
- Tooltips are readable on mobile (320px max width, large enough touch targets)
- "Skip tour" works on every step
- localStorage flag prevents the tour from ever showing again
- Desktop is completely unaffected
- No performance impact on subsequent app loads (driver.js only imported when tour is needed)
