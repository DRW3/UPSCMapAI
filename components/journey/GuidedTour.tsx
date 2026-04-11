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
    if (started.current) return
    if (typeof window === 'undefined') return
    if (localStorage.getItem(TOUR_DONE_KEY) === '1') return

    started.current = true

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
        overlayClickBehavior: 'nextStep',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: "Let's Go! 🚀",
        onDestroyed: () => {
          try { localStorage.setItem(TOUR_DONE_KEY, '1') } catch {}
        },
      })
      tourDriver.drive()
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [])

  return null
}
