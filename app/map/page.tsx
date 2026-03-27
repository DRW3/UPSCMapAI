'use client'

import dynamic from 'next/dynamic'
import ChatInterface from '@/components/ChatInterface'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d1b2e]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-indigo-300 font-medium tracking-wide">Loading map…</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  return (
    <div className="map-page">
      {/* Map fills the entire viewport */}
      <MapCanvas />
      {/* Chat panel floats over the map as a slide-up panel */}
      <ChatInterface />
    </div>
  )
}
