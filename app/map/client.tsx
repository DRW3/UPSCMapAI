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
