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
