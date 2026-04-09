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
