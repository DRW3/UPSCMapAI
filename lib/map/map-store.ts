import { create } from 'zustand'
import type { MapState, ParsedMapIntent, MapOperation, MapSession } from '@/types'

interface MapStore extends MapState {
  sidebarContent: string
  isSidebarLoading: boolean
  pendingMessage: string | null
  sessions: MapSession[]
  activeSessionId: string | null
  focusCoordinates: [number, number] | null
  // Notes panel dimensions — used by MapCanvas to compute correct fitBounds padding
  notesOpen: boolean
  notesWidth: number
  applyOperation: (op: MapOperation) => void
  setIntent: (intent: ParsedMapIntent) => void
  setSidebarContent: (content: string) => void
  setSidebarLoading: (loading: boolean) => void
  setPendingMessage: (msg: string | null) => void
  saveSession: (session: MapSession) => void
  loadSession: (id: string) => void
  setFocusCoordinates: (coords: [number, number] | null) => void
  setNotesState: (open: boolean, width: number) => void
  clearMapData: () => void
  resetMap: () => void
}

const defaultViewport = {
  center: [82.8, 22.5] as [number, number],
  zoom: 4.2,
}

export const useMapStore = create<MapStore>((set, get) => ({
  intent: null,
  layers: [],
  highlightedFeatures: [],
  viewport: defaultViewport,
  annotatedPoints: [],
  sidebarContent: '',
  isSidebarLoading: false,
  pendingMessage: null,
  sessions: [],
  activeSessionId: null,
  focusCoordinates: null,
  notesOpen: false,
  notesWidth: 340,

  setIntent: (intent) => set({ intent }),
  setSidebarContent: (content) => set({ sidebarContent: content }),
  setSidebarLoading: (loading) => set({ isSidebarLoading: loading }),
  setPendingMessage: (msg) => set({ pendingMessage: msg }),

  setFocusCoordinates: (coords) => set({ focusCoordinates: coords }),
  setNotesState: (open, width) => set({ notesOpen: open, notesWidth: width }),

  saveSession: (session) => set((state) => ({
    sessions: [session, ...state.sessions.filter(s => s.id !== session.id)],
    activeSessionId: session.id,
  })),

  loadSession: (id) => {
    const session = get().sessions.find(s => s.id === id)
    if (!session) return
    set({
      intent: session.intent,
      layers: session.layers,
      highlightedFeatures: session.highlightedFeatures,
      annotatedPoints: session.annotatedPoints,
      sidebarContent: session.sidebarContent,
      activeSessionId: id,
      isSidebarLoading: false,
    })
  },

  applyOperation: (op) =>
    set((state) => {
      switch (op.op) {
        case 'full_replace':
          return {
            intent: op.intent,
            layers: op.intent.data_layers,
            highlightedFeatures: op.intent.features_to_highlight,
            annotatedPoints: [],
          }
        case 'add_layer':
          return {
            layers: [...state.layers.filter((l) => l.layer_id !== op.layer.layer_id), op.layer],
          }
        case 'remove_layer':
          return { layers: state.layers.filter((l) => l.layer_id !== op.layer_id) }
        case 'highlight':
          return { highlightedFeatures: op.feature_ids }
        case 'add_markers': {
          const highlights = state.highlightedFeatures
          const mapType = state.intent?.map_type ?? ''
          let incoming = op.points
          // Only apply highlight-term filtering for political/economic/thematic maps
          // where the highlighted item name reliably appears in marker labels.
          // Physical queries (rivers, mountains) and historical queries generate markers
          // that are ALL relevant (e.g. points on a river, peaks in a range, empire cities)
          // but labels may not repeat the feature name verbatim.
          const shouldFilter = highlights.length > 0 && (
            mapType.startsWith('political') ||
            mapType.startsWith('economic') ||
            mapType.startsWith('thematic')
          )
          if (shouldFilter) {
            const terms = highlights.map(h => h.toLowerCase().trim())
            const relevant = incoming.filter(pt => {
              const haystack = `${pt.label} ${pt.id}`.toLowerCase()
              return terms.some(t => haystack.includes(t))
            })
            // Only filter if we'd keep at least 2 points — fallback to all if AI
            // didn't embed highlight terms in its labels at all
            if (relevant.length >= 2) incoming = relevant
          }
          return { annotatedPoints: [...state.annotatedPoints, ...incoming] }
        }
        case 'zoom_to':
          return {
            viewport: {
              center: [(op.bounds[0] + op.bounds[2]) / 2, (op.bounds[1] + op.bounds[3]) / 2],
              zoom: 5,
            },
          }
        default:
          return state
      }
    }),

  clearMapData: () =>
    set({
      intent: null,
      layers: [],
      highlightedFeatures: [],
      annotatedPoints: [],
      sidebarContent: '',
    }),

  resetMap: () =>
    set({
      intent: null,
      layers: [],
      highlightedFeatures: [],
      viewport: defaultViewport,
      annotatedPoints: [],
      sidebarContent: '',
      activeSessionId: null,
    }),
}))
