import dynamic from 'next/dynamic'
import UPSCNotes from '@/components/UPSCNotes'
import ChatInterface from '@/components/ChatInterface'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0d1b2e]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-indigo-300 font-medium tracking-wide">Loading map…</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  return (
    <div className="map-page flex bg-[#070b14]">

      {/* Left — Chat */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-white/[0.06]">
        <ChatInterface />
      </aside>

      {/* Center — Map (fills all remaining width) */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-[5]"
          style={{ boxShadow: 'inset 0 0 60px rgba(99,102,241,0.04)' }} />
        <MapCanvas />
        <UPSCNotes />
      </main>

    </div>
  )
}
