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
