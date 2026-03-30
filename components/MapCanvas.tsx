'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl'
import { useMapStore } from '@/lib/map/map-store'
import { buildMapLibreStyle, resolveDataPath, getHistoricalGeoJSON, detectEmpire, getLayerGeoBounds } from '@/lib/ai/data-resolver'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ML = any

const EMPIRE_COLORS: Record<string, string> = {
  mauryan: '#e07b39', gupta: '#c4953a', mughal: '#7c5cba',
  maratha: '#e06c5a', vijayanagara: '#4a9e6e', chola: '#c45c8a',
  delhi_sultanate: '#5a7bb5', pallava: '#6aab8a', rashtrakuta: '#a06040',
  pala: '#8a6aab', satavahana: '#b07050', kushana: '#6080a0',
  british: '#c0392b', ancient: '#c8965a', medieval: '#7a9ab5', colonial: '#c0392b',
}

type LayerType = 'base_political' | 'rivers' | 'relief' | 'historical_boundary'
  | 'thematic_choropleth' | 'routes' | 'event_markers' | 'points_of_interest'

const LAYER_META: Record<LayerType, { label: string; swatch: (color?: string) => React.ReactNode }> = {
  base_political: {
    label: 'State Boundaries',
    swatch: () => (
      <span className="flex items-center gap-1">
        <span className="w-5 h-3.5 rounded-sm border border-[#a09080]" style={{ background: '#ddd5c8' }} />
      </span>
    ),
  },
  rivers: {
    label: 'Rivers',
    swatch: () => (
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <path d="M1 9 Q4 5 8 7 Q12 9 16 5 Q18 3 19 4"
          stroke="#3a9bd5" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  historical_boundary: {
    label: 'Empire Extent',
    swatch: (color = '#c4953a') => (
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <rect x="1" y="1" width="18" height="10" rx="1"
          fill={color} fillOpacity="0.22"
          stroke={color} strokeWidth="1.5" strokeDasharray="4 2" />
      </svg>
    ),
  },
  relief: {
    label: 'Terrain Relief',
    swatch: () => (
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <path d="M1 10 Q4 5 7 7 Q10 9 13 4 Q16 1 19 3"
          stroke="#b8956a" strokeWidth="1.5" />
      </svg>
    ),
  },
  thematic_choropleth: {
    label: 'Thematic Data',
    swatch: () => (
      <span className="flex gap-0.5">
        {['#ffffcc','#fd8d3c','#800026'].map((c, i) => (
          <span key={i} className="w-2 h-3.5 rounded-sm" style={{ background: c }} />
        ))}
      </span>
    ),
  },
  routes: {
    label: 'Trade / Military Routes',
    swatch: () => (
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <line x1="1" y1="6" x2="19" y2="6"
          stroke="#e63946" strokeWidth="2" strokeDasharray="5 2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  event_markers: {
    label: 'Key Events',
    swatch: () => <span className="text-sm leading-none">⚔️</span>,
  },
  points_of_interest: {
    label: 'Points of Interest',
    swatch: () => <span className="text-sm leading-none">📍</span>,
  },
}

const MARKER_ICON_LEGEND = [
  { icon: '🏛️', label: 'Capital / City' },
  { icon: '⚔️', label: 'Battle Site' },
  { icon: '🌊', label: 'River / Lake' },
  { icon: '⛰️', label: 'Mountain Range' },
  { icon: '🏔️', label: 'Peak / Pass' },
  { icon: '⚓', label: 'Port / Trade' },
  { icon: '☸️', label: 'Religious Site' },
  { icon: '🎓', label: 'Learning Centre' },
  { icon: '⛏️', label: 'Mineral / Industry' },
  { icon: '🌿', label: 'Protected Area' },
  { icon: '🌍', label: 'Country' },
  { icon: '🦢', label: 'Ramsar Wetland' },
  { icon: '🐯', label: 'Tiger Reserve' },
  { icon: '⚛️', label: 'Nuclear Plant' },
  { icon: '🏗️', label: 'Dam / Infrastructure' },
]

interface MarkerPopup {
  name: string; icon: string; color: string
  x: number; y: number; lat: number; lng: number
}
interface StatePopup {
  name: string; x: number; y: number
}
interface ContextMenu {
  lat: number; lng: number; x: number; y: number
}

// Glassmorphism panel style (shared)
const glassStyle: React.CSSProperties = {
  background: 'rgba(10,14,26,0.82)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
}

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<MapLibreMap | null>(null)
  const mlRef        = useRef<ML>(null)
  const mountedSourceIds  = useRef<Set<string>>(new Set())
  const wasLoadingRef     = useRef(false)
  const loadedSpriteIds   = useRef<Set<string>>(new Set())
  const isFirstLoad       = useRef(true)        // true until first search lands
  const flyAnimationRef   = useRef<number | null>(null) // rAF id for staged animation
  const [mapReady, setMapReady]       = useState(false)
  const [legendOpen, setLegendOpen]     = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true)
  const [simplified, setSimplified]     = useState(false)
  const [hiddenIcons, setHiddenIcons]   = useState<Set<string>>(new Set())

  // Interactive overlay states
  const [markerPopup, setMarkerPopup]       = useState<MarkerPopup | null>(null)
  const [statePopup, setStatePopup]         = useState<StatePopup | null>(null)
  const [contextMenu, setContextMenu]       = useState<ContextMenu | null>(null)
  const [detailsMarker, setDetailsMarker]   = useState<MarkerPopup | null>(null)

  const { layers, highlightedFeatures, viewport, annotatedPoints, intent, isSidebarLoading, setPendingMessage, focusCoordinates, setFocusCoordinates, notesOpen, notesWidth, targetBounds } = useMapStore()

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    let mapInstance: MapLibreMap

    async function initMap() {
      const ml = await import('maplibre-gl')
      mlRef.current = ml

      mapInstance = new ml.Map({
        container: mapContainer.current!,
        // CARTO Voyager — high-quality free vector tiles with detailed coastlines & boundaries
        style: {
          version: 8,
          sources: {
            'carto-voyager': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}@2x.png',
              ],
              tileSize: 256,
              attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            },
          },
          layers: [
            {
              id: 'carto-voyager-tiles',
              type: 'raster',
              source: 'carto-voyager',
              minzoom: 0,
              maxzoom: 20,
            },
          ],
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        },
        center: [78.9, 22.5],   // Center on India
        zoom: 1.8,              // Start zoomed out to show the globe
        attributionControl: false,
        maxPitch: 0,
      })

      mapInstance.on('load', () => {

        mapRef.current = mapInstance
        setMapReady(true)

        // ── Cursor management (mousemove) ───────────────────────────────────
        mapInstance.on('mousemove', (e) => {
          const map = mapRef.current
          if (!map) return
          const canvas = map.getCanvas()

          if (map.getLayer('pts-marker')) {
            const f = map.queryRenderedFeatures(e.point, { layers: ['pts-marker'] })
            if (f.length) { canvas.style.cursor = 'pointer'; return }
          }

          const fillLayers = (map.getStyle()?.layers ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter(l => (l as any).source && mountedSourceIds.current.has((l as any).source as string) && l.id.endsWith('-fill'))
            .map(l => l.id)

          if (fillLayers.length) {
            const f = map.queryRenderedFeatures(e.point, { layers: fillLayers })
            if (f.length) { canvas.style.cursor = 'pointer'; return }
          }

          canvas.style.cursor = ''
        })

        // ── Click handler (all features) ────────────────────────────────────
        mapInstance.on('click', (e) => {
          const map = mapRef.current
          if (!map) return

          setContextMenu(null)

          // 1. Check markers first — open the details panel
          if (map.getLayer('pts-marker')) {
            const feats = map.queryRenderedFeatures(e.point, { layers: ['pts-marker'] })
            if (feats.length) {
              const props = feats[0].properties as {
                name: string; icon: string; color: string; pyq_count: number
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const geom = feats[0].geometry as any
              const [lng, lat] = geom.coordinates
              const p = map.project([lng, lat])
              setDetailsMarker({ name: props.name, icon: props.icon, color: props.color, x: p.x, y: p.y, lat, lng })
              setMarkerPopup(null)
              setStatePopup(null)
              return
            }
          }

          // 2. Check political state layers
          const fillLayers = (map.getStyle()?.layers ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter(l => (l as any).source && mountedSourceIds.current.has((l as any).source as string) && l.id.endsWith('-fill'))
            .map(l => l.id)

          if (fillLayers.length) {
            const feats = map.queryRenderedFeatures(e.point, { layers: fillLayers })
            if (feats.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = feats[0].properties as any
              const name = p?.ST_NM || p?.NAME_1 || p?.NAME || p?.name
              if (name) {
                const sp = map.project(e.lngLat)
                setStatePopup({ name, x: sp.x, y: sp.y })
                setMarkerPopup(null)
                return
              }
            }
          }

          // 3. Nothing hit — close all
          setMarkerPopup(null)
          setStatePopup(null)
        })

        // ── Right-click / context menu ──────────────────────────────────────
        mapInstance.on('contextmenu', (e) => {
          const map = mapRef.current
          if (!map) return
          const p = map.project(e.lngLat)
          setContextMenu({ lat: e.lngLat.lat, lng: e.lngLat.lng, x: p.x, y: p.y })
          setMarkerPopup(null)
          setStatePopup(null)
        })

        // ── Dismiss popups on map move ──────────────────────────────────────
        mapInstance.on('movestart', () => {
          setMarkerPopup(null)
          setStatePopup(null)
          setContextMenu(null)
        })
      })
    }

    initMap()
    return () => {
      mapRef.current = null
      mountedSourceIds.current.clear()
      setMapReady(false)
      mapInstance?.remove()
    }
  }, [])

  // ── Sync GeoJSON layers ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const newSourceIds = new Set(layers.filter(l => l.visible).map(l => l.layer_id))

    for (const sourceId of Array.from(mountedSourceIds.current)) {
      if (!newSourceIds.has(sourceId)) {
        const styleLayers = map.getStyle()?.layers ?? []
        for (const sl of styleLayers) {
          if ('source' in sl && sl.source === sourceId) {
            try { map.removeLayer(sl.id) } catch {}
          }
        }
        try { map.removeSource(sourceId) } catch {}
        mountedSourceIds.current.delete(sourceId)
      }
    }

    for (const layer of layers) {
      if (!layer.visible) continue
      const filePath   = resolveDataPath(layer.data_source)
      const inlineData = filePath ? null : getHistoricalGeoJSON(
        layer.data_source, intent?.title ?? '', intent?.features_to_show ?? []
      )
      if (!filePath && !inlineData) continue

      if (!map.getSource(layer.layer_id)) {
        map.addSource(layer.layer_id, {
          type: 'geojson',
          data: (filePath ?? inlineData) as string | GeoJSON.FeatureCollection,
        })
        mountedSourceIds.current.add(layer.layer_id)
      } else if (inlineData) {
        (map.getSource(layer.layer_id) as GeoJSONSource).setData(inlineData)
      }

      const styleSpecs = buildMapLibreStyle(layer)
      for (const spec of styleSpecs) {
        const specId = spec.id as string
        try { if (map.getLayer(specId)) map.removeLayer(specId) } catch {}
        try { map.addLayer(spec as Parameters<typeof map.addLayer>[0]) } catch {}
      }

      // Apply river visibility / filter immediately after adding the layers — three cases:
      // 1. Not a river query → hide completely
      // 2. Specific river highlighted → filter to just that river
      // 3. General river overview (physical_rivers, no highlight) → show all India rivers
      if (layer.layer_type === 'rivers') {
        const isRiverQuery = intent?.map_type === 'physical_rivers'

        // Treat any highlighted feature as a potential river when on a river query,
        // or match against known aliases for non-river queries
        const knownRiverFeatures = highlightedFeatures.filter(f => {
          const key = f.toLowerCase().replace(/\s+river$/i, '').replace(/\s+/g, '_').trim()
          return key in RIVER_GEO_ALIASES || isRiverQuery
        })
        const hasHighlightedRiver = knownRiverFeatures.length > 0

        const glowId   = `${layer.layer_id}-glow`
        const casingId = `${layer.layer_id}-casing`
        const lineId   = `${layer.layer_id}-line`
        const labelsId = `${layer.layer_id}-labels`

        if (!isRiverQuery && !hasHighlightedRiver) {
          // Case 1: rivers layer was added but this isn't a river query → hide everything
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hideAll: any = ['==', ['literal', true], ['literal', false]]
          for (const id of [glowId, casingId, lineId, labelsId]) {
            try { if (map.getLayer(id)) map.setFilter(id, hideAll) } catch {}
          }
        } else if (hasHighlightedRiver) {
          // Case 2: specific river — filter to matching features
          const riverFragments = expandToGeoRiverNames(knownRiverFeatures)
          // Check name, name_alt, name_ascii (diacritic-free), and namelong for robustness
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const matchFilter: any = ['any',
            ...riverFragments.flatMap(frag => [
              ['>=', ['index-of', frag, ['downcase', ['coalesce', ['get', 'name_ascii'], '']]], 0],
              ['>=', ['index-of', frag, ['downcase', ['coalesce', ['get', 'name_alt_ascii'], '']]], 0],
              ['>=', ['index-of', frag, ['downcase', ['coalesce', ['get', 'name'], '']]], 0],
              ['>=', ['index-of', frag, ['downcase', ['coalesce', ['get', 'name_alt'], '']]], 0],
            ]),
          ]
          for (const id of [glowId, casingId, lineId, labelsId]) {
            try { if (map.getLayer(id)) map.setFilter(id, matchFilter) } catch {}
          }
          // Boost the highlighted river's width so it reads clearly
          try {
            if (map.getLayer(lineId)) {
              map.setPaintProperty(lineId, 'line-width',
                ['interpolate', ['linear'], ['zoom'], 3, 3.5, 5, 5.5, 7, 7, 10, 10])
              map.setPaintProperty(lineId, 'line-opacity', 1)
            }
            if (map.getLayer(glowId)) {
              map.setPaintProperty(glowId, 'line-width',
                ['interpolate', ['linear'], ['zoom'], 3, 18, 7, 36, 10, 52])
              map.setPaintProperty(glowId, 'line-opacity', 0.18)
            }
          } catch {}
        } else {
          // Case 3: general river overview — show all India rivers (GeoJSON is India-only)
          for (const id of [glowId, casingId, lineId, labelsId]) {
            try { if (map.getLayer(id)) map.setFilter(id, null) } catch {}
          }
        }
      }
    }
  }, [layers, highlightedFeatures, mapReady, intent])

  // ── Selective highlighting: only the queried item stands out ─────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const mapType = intent?.map_type ?? ''
    const hasHighlights = highlightedFeatures.length > 0

    // ── States ──────────────────────────────────────────────────────────────
    const baseLayer = layers.find(l => l.layer_type === 'base_political')
    if (baseLayer) {
      const fillId = `${baseLayer.layer_id}-fill`
      const lineId = `${baseLayer.layer_id}-line`
      if (map.getLayer(fillId)) {
        const isPolitical = mapType.startsWith('political') || mapType.startsWith('thematic')
        if (hasHighlights && isPolitical) {
          // Expand highlighted features with GeoJSON-compatible name variants
          // (GeoJSON uses old names: Orissa, Uttaranchal; AI generates modern: Odisha, Uttarakhand)
          const expandedFeatures = expandStateNames(highlightedFeatures)
          const matched = ['in', ['get', 'NAME_1'], ['literal', expandedFeatures]]
          // Highlighted state → indigo tint; others → transparent so base map shows
          map.setPaintProperty(fillId, 'fill-color',
            ['case', matched, '#b8d0f8', '#d8d3cb'])
          map.setPaintProperty(fillId, 'fill-opacity',
            ['case', matched, 0.7, 0])
          if (map.getLayer(lineId))
            map.setPaintProperty(lineId, 'line-opacity',
              ['case', matched, 0.95, 0.15])
        } else {
          // Default: transparent fill so detailed CARTO base map shows through
          map.setPaintProperty(fillId, 'fill-color', '#e2dbd0')
          map.setPaintProperty(fillId, 'fill-opacity', 0.35)
          if (map.getLayer(lineId))
            map.setPaintProperty(lineId, 'line-opacity', 0.6)
        }
      }
    }

    // ── Markers — selective opacity for every specific-focus query ────────
    if (map.getSource('annotated-points')) {
      if (hasHighlights) {
        const normalised = highlightedFeatures.map(f => f.toLowerCase().trim())
        // Match if any highlight term appears as substring in the marker's name or id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchExpr: any = ['any',
          ...normalised.flatMap(h => [
            ['>=', ['index-of', h, ['downcase', ['coalesce', ['get', 'name'], '']]], 0],
            ['>=', ['index-of', h, ['downcase', ['coalesce', ['get', 'id'],   '']]], 0],
          ]),
        ]
        if (map.getLayer('pts-marker'))
          map.setPaintProperty('pts-marker', 'icon-opacity',   ['case', matchExpr, 1, 0])
        if (map.getLayer('pts-halo'))
          map.setPaintProperty('pts-halo',   'circle-opacity', ['case', matchExpr, 0.14, 0])
        if (map.getLayer('pts-label'))
          map.setPaintProperty('pts-label',  'text-opacity',   ['case', matchExpr, 1, 0])
      } else {
        // Restore full opacity when no specific focus
        if (map.getLayer('pts-marker'))
          map.setPaintProperty('pts-marker', 'icon-opacity', 1)
        if (map.getLayer('pts-halo'))
          map.setPaintProperty('pts-halo', 'circle-opacity',
            ['interpolate', ['linear'], ['zoom'], 2, 0.07, 5, 0.10, 8, 0.14])
        if (map.getLayer('pts-label'))
          map.setPaintProperty('pts-label', 'text-opacity', 1)
      }
    }
  }, [highlightedFeatures, layers, mapReady, intent])

  // ── Sync annotated points (canvas sprite icons) ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Pre-load canvas sprites for each unique (icon, color) combination
    for (const pt of annotatedPoints) {
      const icon  = pt.icon  ?? '📍'
      const color = pt.color ?? '#e63946'
      const spriteId = markerSpriteId(icon, color)
      if (!map.hasImage(spriteId)) {
        // pixelRatio:2 tells MapLibre the image is 2× resolution (retina-quality emoji)
        map.addImage(spriteId, buildMarkerSprite(icon, color), { pixelRatio: 2 })
        loadedSpriteIds.current.add(spriteId)
      }
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: annotatedPoints.map(pt => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: pt.coordinates },
        properties: {
          id:        pt.id,
          name:      pt.label,
          icon:      pt.icon ?? '📍',
          color:     pt.color ?? '#e63946',
          pyq_count: pt.pyq_count ?? 0,
          sprite:    markerSpriteId(pt.icon ?? '📍', pt.color ?? '#e63946'),
        },
      })),
    }

    if (map.getSource('annotated-points')) {
      ;(map.getSource('annotated-points') as GeoJSONSource).setData(geojson)
    } else if (annotatedPoints.length > 0) {
      map.addSource('annotated-points', { type: 'geojson', data: geojson, cluster: false })
      mountedSourceIds.current.add('annotated-points')

      // ── Layer 1: Outer glow / pulse (more visible) ──────────────────────
      map.addLayer({
        id: 'pts-halo', type: 'circle', source: 'annotated-points',
        paint: {
          'circle-radius':          ['interpolate', ['linear'], ['zoom'], 2, 22, 4, 30, 7, 42, 10, 56],
          'circle-color':           ['get', 'color'],
          'circle-opacity':         ['interpolate', ['linear'], ['zoom'], 2, 0.12, 5, 0.18, 8, 0.22],
          'circle-blur':            0.7,
          'circle-stroke-width':    0,
          'circle-pitch-alignment': 'map',
        },
      })

      // ── Layer 2: Teardrop pin sprite — bigger at low zoom ────────────────
      map.addLayer({
        id: 'pts-marker', type: 'symbol', source: 'annotated-points',
        layout: {
          'icon-image':            ['get', 'sprite'],
          'icon-size':             ['interpolate', ['linear'], ['zoom'], 2, 0.6, 4, 0.75, 6, 0.85, 9, 0.95, 12, 1.0],
          'icon-anchor':           'bottom',
          'icon-allow-overlap':    true,
          'icon-ignore-placement': true,
          'symbol-placement':      'point',
          'symbol-sort-key':       ['-', 0, ['get', 'pyq_count']],
        },
      })

      // ── Layer 3: Name label — visible at all zoom levels, prominent ──────
      map.addLayer({
        id: 'pts-label', type: 'symbol', source: 'annotated-points',
        minzoom: 2,
        layout: {
          'text-field':          ['get', 'name'],
          'text-anchor':         'top',
          'text-offset':         [0, 0.4],
          'text-size':           ['interpolate', ['linear'], ['zoom'], 2, 10, 5, 12, 8, 14, 12, 15],
          'text-font':           ['Open Sans Regular'],
          'text-max-width':      10,
          'text-allow-overlap':  false,
          'text-optional':       true,
          'symbol-sort-key':     ['-', 0, ['get', 'pyq_count']],
        },
        paint: {
          'text-color':       '#ffffff',
          'text-halo-color':  'rgba(0,0,0,0.85)',
          'text-halo-width':  2,
          'text-opacity':     ['interpolate', ['linear'], ['zoom'], 2, 0.7, 4, 0.85, 6, 1],
        },
      })
    }
  }, [annotatedPoints, mapReady])

  // ── Simplified / less-detail mode ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const vis = (v: boolean) => v ? 'visible' : 'none'
    const setL = (id: string, value: string) => {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', value) } catch {}
    }
    // Marker decoration layers (pts-marker stays visible, halo/label toggle)
    setL('pts-halo',  vis(!simplified))
    setL('pts-label', vis(!simplified))
    // GeoJSON fill layers (state/region fills) — keep borders visible
    const fillLayers = (map.getStyle()?.layers ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter(l => (l as any).source && mountedSourceIds.current.has((l as any).source as string) && l.id.endsWith('-fill'))
      .map(l => l.id)
    for (const id of fillLayers) setL(id, vis(!simplified))
    // State/region labels
    const labelLayers = (map.getStyle()?.layers ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter(l => (l as any).source && mountedSourceIds.current.has((l as any).source as string) && l.id.endsWith('-labels'))
      .map(l => l.id)
    for (const id of labelLayers) setL(id, vis(!simplified))
  }, [simplified, mapReady])

  // ── Google Earth-style swoop to viewport ─────────────────────────────────
  // Uses fitBounds so the zoom adapts to the user's screen size automatically.
  // When targetBounds is available (from zoom_to op), swoop to those bounds
  // so the plotted area fits the screen. Falls back to India bounds.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (flyAnimationRef.current) {
      cancelAnimationFrame(flyAnimationRef.current)
      flyAnimationRef.current = null
    }

    const currentZoom = map.getZoom()

    // Compute swoop target: prefer area-aware bounds (polygon + targetBounds),
    // fall back to targetBounds from zoom_to, then India bounds.
    // Start from targetBounds (region-level) or India
    const baseBounds = targetBounds
      ? [[targetBounds[0], targetBounds[1]], [targetBounds[2], targetBounds[3]]] as [[number, number], [number, number]]
      : [[68, 6.5], [97.5, 37]] as [[number, number], [number, number]]

    // Expand to include polygon layer geometry (e.g. empire boundaries)
    let minLng = baseBounds[0][0], minLat = baseBounds[0][1]
    let maxLng = baseBounds[1][0], maxLat = baseBounds[1][1]

    for (const layer of layers) {
      if (!layer.visible) continue
      const lb = getLayerGeoBounds(layer, intent?.title ?? '', intent?.features_to_show ?? [])
      if (lb) {
        minLng = Math.min(minLng, lb[0])
        minLat = Math.min(minLat, lb[1])
        maxLng = Math.max(maxLng, lb[2])
        maxLat = Math.max(maxLat, lb[3])
      }
    }

    const swoopBounds: [[number, number], [number, number]] = [[minLng, minLat], [maxLng, maxLat]]

    const isMobileView = window.matchMedia('(max-width: 768px)').matches
    const fitPadding = { top: isMobileView ? 100 : 80, bottom: isMobileView ? 130 : 80, left: 20, right: 20 }

    function swoopToTarget() {
      map!.fitBounds(swoopBounds, {
        padding: fitPadding,
        duration: 2200,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ essential: true, curve: 1.6, speed: 0.7 }) as any),
      })
    }

    // First search: single swoop from globe
    if (isFirstLoad.current && currentZoom < 3) {
      isFirstLoad.current = false
      swoopToTarget()
      return
    }

    isFirstLoad.current = false

    // Subsequent searches: pull back to globe, then swoop
    if (currentZoom > 4) {
      map.flyTo({
        center: map.getCenter(),
        zoom: 2.2,
        speed: 1.5,
        curve: 1.2,
        essential: true,
      })
      map.once('moveend', () => swoopToTarget())
    } else {
      swoopToTarget()
    }
  }, [viewport, mapReady, targetBounds, layers, intent])

  // ── Focus on a specific point (triggered from notes click) ───────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !focusCoordinates) return
    // Offset the target so the pin lands in visible area (above sheet on mobile, beside notes on desktop)
    const isMobileView3 = window.matchMedia('(max-width: 768px)').matches
    const rightPadFocus = notesOpen ? notesWidth + 24 : 40
    const bottomPadFocus = isMobileView3 ? 140 : 60
    map.flyTo({
      center: focusCoordinates,
      zoom: Math.min(Math.max(map.getZoom(), 5.5), 7),
      duration: 900,
      essential: true,
      padding: { top: 80, right: rightPadFocus, bottom: bottomPadFocus, left: 50 },
    })
    setFocusCoordinates(null)
  }, [focusCoordinates, mapReady, setFocusCoordinates, notesOpen, notesWidth])

  // ── Zoom-to-fit: fit all markers + polygon areas once loading finishes ────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Fire only on the loading→done transition
    const justFinished = wasLoadingRef.current && !isSidebarLoading
    wasLoadingRef.current = isSidebarLoading

    if (!justFinished) return

    // Collect coordinates from annotated points
    const allLngs = annotatedPoints.map(p => p.coordinates[0])
    const allLats = annotatedPoints.map(p => p.coordinates[1])

    // Also include polygon layer bounds so plotted areas aren't clipped
    for (const layer of layers) {
      if (!layer.visible) continue
      const lb = getLayerGeoBounds(layer, intent?.title ?? '', intent?.features_to_show ?? [])
      if (lb) {
        allLngs.push(lb[0], lb[2])
        allLats.push(lb[1], lb[3])
      }
    }

    // Nothing to fit
    if (allLngs.length === 0) return

    const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs)
    const minLat = Math.min(...allLats), maxLat = Math.max(...allLats)

    // Add margin around the bounds so content doesn't sit at the very edge
    const lngSpan = Math.max(maxLng - minLng, 1)  // at least 1 degree span
    const latSpan = Math.max(maxLat - minLat, 1)
    const margin = 0.10  // 10% breathing room on each side
    const expandedBounds: [[number, number], [number, number]] = [
      [minLng - lngSpan * margin, minLat - latSpan * margin],
      [maxLng + lngSpan * margin, maxLat + latSpan * margin],
    ]

    // Padding: account for notes panel (desktop) or bottom sheet (mobile)
    const isMobileView = window.matchMedia('(max-width: 768px)').matches
    const rightPad = notesOpen ? notesWidth + 40 : 60
    const bottomPad = isMobileView ? 160 : 100  // peek bar on mobile

    map.fitBounds(
      expandedBounds,
      {
        padding: { top: 100, right: rightPad, bottom: bottomPad, left: 50 },
        duration: 1800,
        maxZoom: 7,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ animate: true, essential: true, curve: 1.4, speed: 0.9 }) as any),
      },
    )
  }, [isSidebarLoading, annotatedPoints, mapReady, notesOpen, notesWidth, layers, intent])

  // ── Re-fit when notes panel opens/closes or is resized ───────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || isSidebarLoading) return

    // Collect bounds from markers AND polygon layers
    const allLngs2 = annotatedPoints.map(p => p.coordinates[0])
    const allLats2 = annotatedPoints.map(p => p.coordinates[1])
    for (const layer of layers) {
      if (!layer.visible) continue
      const lb = getLayerGeoBounds(layer, intent?.title ?? '', intent?.features_to_show ?? [])
      if (lb) {
        allLngs2.push(lb[0], lb[2])
        allLats2.push(lb[1], lb[3])
      }
    }
    if (allLngs2.length === 0) return

    const minLng = Math.min(...allLngs2), maxLng = Math.max(...allLngs2)
    const minLat = Math.min(...allLats2), maxLat = Math.max(...allLats2)
    const lngSpan2 = Math.max(maxLng - minLng, 1)
    const latSpan2 = Math.max(maxLat - minLat, 1)
    const m2 = 0.10
    const isMobileView2 = window.matchMedia('(max-width: 768px)').matches
    const rightPad2 = notesOpen ? notesWidth + 40 : 60
    const bottomPad2 = isMobileView2 ? 160 : 100

    map.fitBounds(
      [[minLng - lngSpan2 * m2, minLat - latSpan2 * m2], [maxLng + lngSpan2 * m2, maxLat + latSpan2 * m2]],
      { padding: { top: 100, right: rightPad2, bottom: bottomPad2, left: 50 }, duration: 600, maxZoom: 7 },
    )
  // Only re-trigger on notes state changes, not every point update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesOpen, notesWidth])

  // ── Reset hidden icons when new map loads ────────────────────────────────
  useEffect(() => { setHiddenIcons(new Set()) }, [annotatedPoints])

  // ── Apply icon type filter to map layers ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const filter = hiddenIcons.size === 0
      ? null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (['!', ['in', ['get', 'icon'], ['literal', Array.from(hiddenIcons)]]] as any)
    if (map.getLayer('pts-marker')) map.setFilter('pts-marker', filter)
    if (map.getLayer('pts-label'))  map.setFilter('pts-label',  filter)
  }, [hiddenIcons, mapReady])

  // ── Legend data ───────────────────────────────────────────────────────────
  // Only show layers that are meaningful to the student — skip the always-present base map
  // and thematic_choropleth (currently unused / too vague to label)
  const LEGEND_SKIP: string[] = ['base_political', 'thematic_choropleth', 'labels', 'points_of_interest', 'event_markers']
  const visibleLayers = layers.filter(l => l.visible && !LEGEND_SKIP.includes(l.layer_type))

  // Group actual plotted points by icon → drives legend + filter
  const iconGroups = useMemo(() => {
    const groups = new Map<string, { icon: string; label: string; count: number; color: string }>()
    for (const pt of annotatedPoints) {
      const icon = pt.icon ?? '📍'
      const meta = MARKER_ICON_LEGEND.find(r => r.icon === icon)
      const label = meta?.label ?? 'Location'
      const existing = groups.get(icon)
      if (existing) { existing.count++ }
      else { groups.set(icon, { icon, label, count: 1, color: pt.color ?? '#e63946' }) }
    }
    return Array.from(groups.values())
  }, [annotatedPoints])

  // ── Popup action helpers ──────────────────────────────────────────────────
  function askAI(msg: string) {
    setPendingMessage(msg)
    setMarkerPopup(null)
    setStatePopup(null)
    setContextMenu(null)
  }

  // Clamp popup to keep it inside map container
  function clampX(x: number) { return Math.max(120, Math.min(x, (mapContainer.current?.clientWidth ?? 600) - 120)) }
  function clampY(y: number) { return Math.max(160, y) }

  return (
    <div className="relative w-full h-full" onContextMenu={e => e.preventDefault()}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1b2e]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-indigo-300 font-medium tracking-wide">Initialising map…</p>
          </div>
        </div>
      )}

      {/* ── Map title (hidden on mobile — search bar occupies that space) ── */}
      {intent && mapReady && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
          <div className="rounded-2xl px-5 py-2.5 text-center" style={glassStyle}>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5">
              {intent.map_type.replace(/_/g, ' ')}
            </p>
            <p className="text-sm font-semibold text-white leading-tight">{intent.title}</p>
          </div>
        </div>
      )}

      {/* ── Marker popup ──────────────────────────────────────────────────── */}
      {markerPopup && (
        <div
          className="absolute z-30 pointer-events-auto"
          style={{
            left: clampX(markerPopup.x),
            top:  clampY(markerPopup.y) - 14,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="rounded-2xl overflow-hidden w-[240px]"
            style={{
              background: 'rgba(10, 14, 28, 0.94)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${markerPopup.color}40`,
              boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${markerPopup.color}15`,
            }}>
            {/* Colored top accent */}
            <div style={{ height: 2.5, background: `linear-gradient(90deg, ${markerPopup.color}, ${markerPopup.color}60)` }} />
            <div className="p-3.5">
              {/* Name + icon */}
              <div className="flex items-start gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] flex-shrink-0"
                  style={{ background: `${markerPopup.color}18`, border: `1px solid ${markerPopup.color}35` }}>
                  {markerPopup.icon}
                </div>
                <p className="text-[13px] font-semibold text-white/90 leading-snug flex-1 pt-1">{markerPopup.name}</p>
                <button
                  onClick={() => setMarkerPopup(null)}
                  className="text-white/25 hover:text-white/60 flex-shrink-0 -mt-0.5 -mr-0.5 text-lg leading-none transition-colors"
                >×</button>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => askAI(`Tell me about "${markerPopup.name}" and its importance for UPSC`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-white text-[11px] font-semibold transition-colors"
                  style={{ background: markerPopup.color, boxShadow: `0 2px 10px ${markerPopup.color}40` }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                    <path d="M6 1C3.24 1 1 3.02 1 5.5c0 .95.3 1.83.8 2.56L1 11l3.2-.76A5.1 5.1 0 006 10.5c2.76 0 5-2.02 5-4.5S8.76 1 6 1z" strokeLinejoin="round"/>
                  </svg>
                  Ask AI
                </button>
                <button
                  onClick={() => askAI(`Show a detailed UPSC map focused on ${markerPopup.name} and surrounding region`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                    <circle cx="5" cy="5" r="4"/><path d="M8.5 8.5L11 11" strokeLinecap="round"/>
                  </svg>
                  Detail Map
                </button>
              </div>
            </div>
            {/* Down arrow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full overflow-hidden w-4 h-2">
              <div className="w-3 h-3 rotate-45 translate-x-0.5 -translate-y-1.5"
                style={{ background: 'rgba(10, 14, 28, 0.94)', boxShadow: `1px 1px 3px ${markerPopup.color}20` }} />
            </div>
          </div>
        </div>
      )}

      {/* ── State / region popup ───────────────────────────────────────────── */}
      {statePopup && (
        <div
          className="absolute z-30 pointer-events-auto"
          style={{
            left: clampX(statePopup.x),
            top:  clampY(statePopup.y) - 10,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="rounded-xl overflow-hidden w-[220px]"
            style={{
              background: 'rgba(10, 14, 28, 0.94)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 0 16px rgba(99,102,241,0.1)',
            }}>
            <div style={{ height: 2.5, background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }} />
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-[12px]"
                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>🗺️</span>
                  <p className="text-[13px] font-bold text-white/90 leading-none">{statePopup.name}</p>
                </div>
                <button
                  onClick={() => setStatePopup(null)}
                  className="text-white/25 hover:text-white/60 text-lg leading-none ml-2 transition-colors"
                >×</button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => askAI(`Tell me about ${statePopup.name} — geography, economy, and UPSC significance`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-white text-[11px] font-semibold transition-colors"
                  style={{ background: '#6366f1', boxShadow: '0 2px 10px rgba(99,102,241,0.4)' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                    <path d="M6 1C3.24 1 1 3.02 1 5.5c0 .95.3 1.83.8 2.56L1 11l3.2-.76A5.1 5.1 0 006 10.5c2.76 0 5-2.02 5-4.5S8.76 1 6 1z" strokeLinejoin="round"/>
                  </svg>
                  Ask AI
                </button>
                <button
                  onClick={() => askAI(`Show me a detailed UPSC map of ${statePopup.name} — rivers, districts, historical sites, minerals`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="1" width="10" height="10" rx="1.5"/><path d="M4 6h4M6 4v4" strokeLinecap="round"/>
                  </svg>
                  Map State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Right-click context menu ───────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="absolute z-30 pointer-events-auto"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="rounded-xl overflow-hidden w-[210px]" style={{
            background: 'rgba(10,14,26,0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          }}>
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] text-white/35 uppercase tracking-widest font-medium">
                {contextMenu.lat.toFixed(2)}°N {contextMenu.lng.toFixed(2)}°E
              </p>
            </div>
            <div className="py-1">
              {[
                {
                  icon: (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8">
                      <path d="M7 1C4.24 1 2 3.02 2 5.5c0 .95.3 1.83.8 2.56L2 12l3.2-.76A5.1 5.1 0 007 11.5c2.76 0 5-2.02 5-4.5S9.76 1 7 1z" strokeLinejoin="round"/>
                    </svg>
                  ),
                  label: 'Ask AI about this area',
                  action: () => askAI(`What is significant at coordinates ${contextMenu.lat.toFixed(1)}°N, ${contextMenu.lng.toFixed(1)}°E in India for UPSC?`),
                },
                {
                  icon: (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L12.5 12.5" strokeLinecap="round"/>
                      <path d="M6 4v4M4 6h4" strokeLinecap="round"/>
                    </svg>
                  ),
                  label: 'Generate detailed map here',
                  action: () => askAI(`Generate a detailed UPSC map of the area around ${contextMenu.lat.toFixed(1)}°N, ${contextMenu.lng.toFixed(1)}°E`),
                },
                {
                  icon: (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8">
                      <path d="M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9.1 3.5 11.4l1.3-4L1.5 5H5.5z" strokeLinejoin="round"/>
                    </svg>
                  ),
                  label: intent ? `More detail: ${intent.title}` : 'Explore this region',
                  action: () => askAI(intent
                    ? `Give me a more zoomed-in, more detailed map focused on this part of the "${intent.title}" map`
                    : `Show a detailed UPSC map of this region`
                  ),
                },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-white/75 hover:text-white hover:bg-white/[0.07] transition-colors"
                >
                  <span className="text-white/50 flex-shrink-0">{item.icon}</span>
                  <span className="text-[12px] font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Marker Details Panel ─────────────────────────────────────────── */}
      {detailsMarker && (
        <MarkerDetailsPanel
          marker={detailsMarker}
          mapContext={intent?.title ?? ''}
          onClose={() => setDetailsMarker(null)}
          onAskAI={(msg) => { askAI(msg); setDetailsMarker(null) }}
        />
      )}

      {/* ── Legend (hidden on mobile — peek bar shows key info) ────────── */}
      {(visibleLayers.length > 0 || annotatedPoints.length > 0) && mapReady && (
        <div className="absolute bottom-5 left-4 z-10 w-[215px] hidden md:block">
          <div className="rounded-2xl overflow-hidden" style={glassStyle}>
            {/* Header */}
            <button
              onClick={() => setLegendOpen(o => !o)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
            >
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em]">Legend</span>
              <svg className={`w-3 h-3 text-white/30 transition-transform ${legendOpen ? '' : 'rotate-180'}`}
                fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {legendOpen && (
              <>
                {/* ── Map layers section ───────────────────────────────── */}
                {visibleLayers.length > 0 && (
                  <div className="px-3.5 pb-2.5 space-y-2 border-t border-white/[0.06]">
                    <div className="pt-2.5 space-y-2">
                      {visibleLayers.map(l => {
                        const meta = LAYER_META[l.layer_type as LayerType]
                        if (!meta) return null
                        const empireColor = l.layer_type === 'historical_boundary' && intent
                          ? EMPIRE_COLORS[detectEmpire(intent.title, intent.features_to_show, l.data_source)] ?? '#c4953a'
                          : undefined
                        return (
                          <div key={l.layer_id} className="flex items-center gap-2.5">
                            <div className="w-5 h-4 flex items-center justify-center flex-shrink-0">
                              {meta.swatch(empireColor)}
                            </div>
                            <span className="text-[11px] text-white/65 font-medium leading-none">{meta.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Marker type filters ──────────────────────────────── */}
                {iconGroups.length > 0 && (
                  <div className="px-3.5 py-2.5 border-t border-white/[0.06]">
                    {/* Sub-header: total count + show/hide all toggle */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] text-white/35 uppercase tracking-[0.15em] font-semibold">
                        {annotatedPoints.filter(p => !hiddenIcons.has(p.icon ?? '📍')).length}
                        {' / '}{annotatedPoints.length} shown
                      </span>
                      {iconGroups.length > 1 && (
                        <button
                          onClick={() => setHiddenIcons(
                            hiddenIcons.size === 0
                              ? new Set(iconGroups.map(g => g.icon))
                              : new Set()
                          )}
                          className="text-[10px] text-indigo-400/70 hover:text-indigo-300 transition-colors font-medium"
                        >
                          {hiddenIcons.size === 0 ? 'Hide all' : 'Show all'}
                        </button>
                      )}
                    </div>

                    {/* One row per icon type — clickable to toggle */}
                    <div className="space-y-1">
                      {iconGroups.map(g => {
                        const hidden = hiddenIcons.has(g.icon)
                        return (
                          <button
                            key={g.icon}
                            onClick={() => setHiddenIcons(prev => {
                              const next = new Set(prev)
                              if (next.has(g.icon)) next.delete(g.icon)
                              else next.add(g.icon)
                              return next
                            })}
                            className={`w-full flex items-center gap-2 text-left rounded-lg px-1.5 py-1 transition-all hover:bg-white/[0.05] ${hidden ? 'opacity-35' : 'opacity-100'}`}
                          >
                            {/* Colored dot indicator */}
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all"
                              style={{ background: hidden ? 'rgba(255,255,255,0.15)' : g.color }}
                            />
                            {/* Icon emoji */}
                            <span className="text-[13px] leading-none flex-shrink-0 w-5 text-center">{g.icon}</span>
                            {/* Label */}
                            <span className="flex-1 text-[11px] text-white/65 font-medium leading-none truncate">{g.label}</span>
                            {/* Count badge */}
                            <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: hidden ? 'rgba(255,255,255,0.06)' : g.color + '22',
                                color: hidden ? 'rgba(255,255,255,0.25)' : g.color,
                              }}>
                              {g.count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Map controls (top-right, simplified on mobile) ─────────────────── */}
      {mapReady && (
        <div className="absolute right-3 md:right-4 z-10 flex flex-col gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 140px)' }}>
          {/* Compass — desktop only */}
          <div className="w-9 h-9 rounded-xl items-center justify-center hidden md:flex" style={glassStyle}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <polygon points="9,2 11,9 9,8 7,9" fill="#e63946" />
              <polygon points="9,16 7,9 9,10 11,9" fill="#ffffff" fillOpacity="0.4" />
              <circle cx="9" cy="9" r="1.5" fill="white" fillOpacity="0.7" />
            </svg>
          </div>
          {/* Zoom */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={glassStyle}>
            <button onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
              className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors text-lg font-light border-b border-white/[0.06]"
            >+</button>
            <button onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
              className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors text-lg font-light"
            >−</button>
          </div>
          {/* Reset to India */}
          <button
            onClick={() => mapRef.current?.fitBounds([[68,8],[97.5,37.5]], { duration: 800, padding: 20 })}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
            style={glassStyle} title="Reset to India"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7.5" cy="7.5" r="6" />
              <line x1="7.5" y1="2" x2="7.5" y2="13" />
              <line x1="2" y1="7.5" x2="13" y2="7.5" />
            </svg>
          </button>
          {/* Detail toggle — desktop only */}
          <button
            onClick={() => setSimplified(s => !s)}
            title={simplified ? 'Show full detail' : 'Less detail'}
            className="w-9 h-9 rounded-xl items-center justify-center transition-all hidden md:flex"
            style={{
              ...glassStyle,
              ...(simplified
                ? { border: '1px solid rgba(99,102,241,0.5)', color: 'rgba(165,180,252,0.9)' }
                : { color: 'rgba(255,255,255,0.45)' }),
            }}
          >
            {simplified ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="2" y1="4.5" x2="13" y2="4.5" />
                <line x1="2" y1="7.5" x2="13" y2="7.5" />
                <line x1="2" y1="10.5" x2="13" y2="10.5" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="11" height="7" rx="1" />
                <path d="M4.5 5V3.5a1 1 0 011-1h4a1 1 0 011 1V5" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* ── "Ask about this map" floating bar (desktop only — mobile uses peek bar) */}
      {intent && mapReady && annotatedPoints.length > 0 && !markerPopup && !statePopup && !contextMenu && !detailsMarker && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 hidden md:flex gap-2">
          <button
            onClick={() => askAI(`Based on the current map "${intent.title}", what are the 5 most important UPSC points I should focus on?`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/80 hover:text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(10,14,26,0.82)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
              <path d="M7 1C4.24 1 2 3.02 2 5.5c0 .95.3 1.83.8 2.56L2 12l3.2-.76A5.1 5.1 0 007 11.5c2.76 0 5-2.02 5-4.5S9.76 1 7 1z" strokeLinejoin="round"/>
            </svg>
            Ask AI about this map
          </button>
          <button
            onClick={() => askAI(`Show me a more detailed, zoomed-in version of "${intent.title}" with additional locations`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white/80 hover:text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(10,14,26,0.82)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L12.5 12.5" strokeLinecap="round"/>
              <path d="M6 4v4M4 6h4" strokeLinecap="round"/>
            </svg>
            More detail
          </button>
        </div>
      )}

      {/* ── Marker count badge (desktop only — mobile shows count in peek bar) */}
      {annotatedPoints.length > 0 && mapReady && !detailsMarker && (
        <div className="absolute bottom-5 right-4 z-10 hidden md:block">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={glassStyle}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-medium text-white/60">
              {annotatedPoints.length} markers
            </span>
          </div>
        </div>
      )}

    </div>
  )
}


// ── Marker Details Panel ──────────────────────────────────────────────────────

interface MarkerDetailsPanelProps {
  marker: { name: string; icon: string; color: string; lat: number; lng: number }
  mapContext: string
  onClose: () => void
  onAskAI: (msg: string) => void
}

function MarkerDetailsPanel({ marker, mapContext, onClose, onAskAI }: MarkerDetailsPanelProps) {
  const [content, setContent] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState('')

  React.useEffect(() => {
    setContent('')
    setLoading(true)
    setError('')

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: marker.name, icon: marker.icon, mapContext }),
        })
        if (!res.ok || !res.body) throw new Error('Failed to load details')

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const ev = JSON.parse(data)
              if (ev.text && !cancelled) setContent(prev => prev + ev.text)
              if (ev.error) throw new Error(ev.error)
            } catch { /* skip bad lines */ }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker.name])

  // ── Render markdown sections ────────────────────────────────────────────
  function renderMarkdown(md: string): React.ReactNode {
    const lines = md.split('\n')
    const nodes: React.ReactNode[] = []
    let key = 0

    for (const line of lines) {
      if (line.startsWith('## ')) {
        nodes.push(
          <p key={key++} className="text-[9px] font-bold uppercase tracking-widest mt-3 mb-1 first:mt-0"
            style={{ color: marker.color }}>
            {line.slice(3)}
          </p>
        )
      } else if (line.startsWith('- ')) {
        nodes.push(
          <div key={key++} className="flex gap-2 mb-1">
            <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: marker.color }} />
            <span className="text-[12px] text-white/75 leading-relaxed">{line.slice(2)}</span>
          </div>
        )
      } else if (line.trim()) {
        nodes.push(
          <p key={key++} className="text-[12px] text-white/70 leading-relaxed mb-1">{line}</p>
        )
      }
    }
    return nodes
  }

  const panelStyle: React.CSSProperties = {
    background: 'rgba(8,12,24,0.96)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${marker.color}40`,
    boxShadow: `0 0 0 1px ${marker.color}20, 0 24px 60px rgba(0,0,0,0.55), 0 0 40px ${marker.color}12`,
  }

  return (
    <div
      className="absolute z-40 flex flex-col rounded-2xl overflow-hidden details-panel-enter"
      style={{
        ...panelStyle,
        top: 'calc(env(safe-area-inset-top, 0px) + 150px)',
        right: 12,
        bottom: 'auto',
        width: 'min(calc(100% - 24px), 320px)',
        maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - 280px)',
      } as React.CSSProperties}
    >
      {/* Colour accent top bar */}
      <div style={{ height: 2.5, background: `linear-gradient(90deg, ${marker.color}, ${marker.color}60)`, flexShrink: 0 }} />

      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${marker.color}20` }}>
        {/* Emoji badge */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${marker.color}18`, border: `1.5px solid ${marker.color}45` }}>
          {marker.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-white leading-snug">{marker.name}</h3>
          <p className="text-[10px] mt-1" style={{ color: marker.color + 'aa' }}>
            {mapContext || 'UPSC Geography'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.08] flex-shrink-0 transition-colors text-lg leading-none -mt-0.5"
        >×</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {loading && content === '' && (
          <div className="flex items-center gap-2.5 py-6 justify-center">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: marker.color }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse [animation-delay:0.2s]" style={{ background: marker.color }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse [animation-delay:0.4s]" style={{ background: marker.color }} />
          </div>
        )}
        {error && <p className="text-[12px] text-red-400">{error}</p>}
        {content && renderMarkdown(content)}
        {loading && content && (
          <span className="inline-block w-1 h-3.5 rounded-sm animate-pulse ml-0.5 align-middle" style={{ background: marker.color }} />
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 pb-4 pt-2 flex gap-2 flex-shrink-0" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
        <button
          onClick={() => onAskAI(`Tell me more about "${marker.name}" — geography, history, and UPSC exam importance`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold text-white transition-colors"
          style={{ background: marker.color, boxShadow: `0 4px 14px ${marker.color}40` }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
            <path d="M6 1C3.24 1 1 3.02 1 5.5c0 .95.3 1.83.8 2.56L1 11l3.2-.76A5.1 5.1 0 006 10.5c2.76 0 5-2.02 5-4.5S8.76 1 6 1z" strokeLinejoin="round"/>
          </svg>
          Ask AI
        </button>
        <button
          onClick={() => onAskAI(`Show a detailed UPSC map focused on ${marker.name}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
            <path d="M1 2.5l3-1.5 3 1.5 3-1.5V9.5L7 11 4 9.5 1 11V2.5z"/><path d="M4 1v10M7 2.5v9"/>
          </svg>
          Detail Map
        </button>
      </div>
    </div>
  )
}

// ── Canvas sprite helpers for marker icons ────────────────────────────────────

function markerSpriteId(icon: string, color: string): string {
  const cp = icon.codePointAt(0)?.toString(16) ?? 'xx'
  return `sprite_${cp}_${color.replace('#', '')}`
}

/**
 * Draws a teardrop map pin: dark circle with a colored border ring,
 * large centered emoji, and a pointed tail at the bottom.
 * Text labels are rendered separately by MapLibre (pts-label layer).
 * Returns ImageData required by MapLibre addImage().
 */
function buildMarkerSprite(icon: string, color: string): ImageData {
  // Draw at 2× resolution so the emoji is crisp on retina screens
  const SCALE  = 2
  const D      = 44    // circle diameter (logical px)
  const TAIL   = 15    // tail height (logical px)
  const W      = D
  const H      = D + TAIL

  const canvas  = document.createElement('canvas')
  canvas.width  = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  const cx = W / 2
  const cy = D / 2
  const r  = D / 2 - 2.5   // inner radius (leaves room for border)

  // ── Subtle outer glow around the circle ──────────────────────────────────
  ctx.shadowColor   = color
  ctx.shadowBlur    = 9
  ctx.shadowOffsetY = 2

  // ── Circle fill (dark, near-opaque) ──────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  const grad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, r)
  grad.addColorStop(0, 'rgba(28,34,56,0.97)')
  grad.addColorStop(1, 'rgba(8,12,24,0.97)')
  ctx.fillStyle = grad
  ctx.fill()

  // ── Colored border ring ───────────────────────────────────────────────────
  ctx.shadowBlur    = 0
  ctx.shadowOffsetY = 0
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.stroke()

  // ── Subtle inner accent ring ──────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2)
  ctx.strokeStyle = color + '30'
  ctx.lineWidth   = 1
  ctx.stroke()

  // ── Teardrop tail ────────────────────────────────────────────────────────
  // Two angled lines from the circle bottom to a sharp tip
  const tailTopY = cy + r - 1   // where tail meets circle
  const tipY     = H - 1

  // Fill tail to match circle background (covers the circle border at junction)
  ctx.beginPath()
  ctx.moveTo(cx - 6.5, tailTopY)
  ctx.lineTo(cx, tipY)
  ctx.lineTo(cx + 6.5, tailTopY)
  ctx.closePath()
  ctx.fillStyle = 'rgba(8,12,24,0.97)'
  ctx.fill()

  // Colored tail border
  ctx.shadowColor   = color
  ctx.shadowBlur    = 5
  ctx.beginPath()
  ctx.moveTo(cx - 6.5, tailTopY)
  ctx.lineTo(cx, tipY)
  ctx.lineTo(cx + 6.5, tailTopY)
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.lineJoin    = 'round'
  ctx.stroke()
  ctx.shadowBlur = 0

  // ── Emoji — big and centered in the circle ────────────────────────────────
  // Explicit color-emoji font stack ensures the emoji renders with full color
  const emojiPx = Math.round(r * 1.05)   // ~19px at D=44 → very visible
  ctx.font         = `${emojiPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#ffffff'   // fallback for mono emoji
  ctx.fillText(icon, cx, cy + 1)

  // Return the 2× pixel data — pass { pixelRatio: 2 } to addImage so MapLibre
  // knows the logical size is half the canvas dimensions.
  return ctx.getImageData(0, 0, W * SCALE, H * SCALE)
}

// ── State name normalization ──────────────────────────────────────────────────
// Maps modern state/UT names (used by the AI model) → GeoJSON NAME_1 field values.
// The GeoJSON uses older GADM names that predate several Indian state reorganizations.
const STATE_NAME_MAP: Record<string, string[]> = {
  // Modern name → [GeoJSON NAME_1 variants to match]
  'odisha':           ['Orissa', 'Odisha'],
  'uttarakhand':      ['Uttaranchal', 'Uttarakhand'],
  'telangana':        ['Andhra Pradesh', 'Telangana'],  // Telangana carved from AP in 2014
  'ladakh':           ['Jammu and Kashmir', 'Ladakh'],   // Ladakh carved from J&K in 2019
  'j&k':              ['Jammu and Kashmir'],
  'jammu & kashmir':  ['Jammu and Kashmir'],
  'jammu and kashmir': ['Jammu and Kashmir'],
  'andhra pradesh':   ['Andhra Pradesh'],
  // Merged UTs
  'dadra and nagar haveli and daman and diu': ['Dadra and Nagar Haveli', 'Daman and Diu'],
  'dnh and dd':       ['Dadra and Nagar Haveli', 'Daman and Diu'],
  // Common shorthand
  'hp':               ['Himachal Pradesh'],
  'mp':               ['Madhya Pradesh'],
  'up':               ['Uttar Pradesh'],
  'ap':               ['Andhra Pradesh'],
  'wb':               ['West Bengal'],
  'tn':               ['Tamil Nadu'],
  'jk':               ['Jammu and Kashmir'],
  'a&n':              ['Andaman and Nicobar'],
  'andaman':          ['Andaman and Nicobar'],
  'nicobar':          ['Andaman and Nicobar'],
}

/**
 * Expand highlighted feature names to include GeoJSON-compatible variants.
 * Ensures "Odisha" matches GeoJSON's "Orissa", "Telangana" matches "Andhra Pradesh", etc.
 */
function expandStateNames(features: string[]): string[] {
  const result = new Set<string>()
  for (const f of features) {
    result.add(f) // keep original
    const key = f.toLowerCase().trim()
    const mapped = STATE_NAME_MAP[key]
    if (mapped) {
      mapped.forEach(m => result.add(m))
    }
    // Also try partial match for compound names like "Jammu and Kashmir"
    for (const [k, vals] of Object.entries(STATE_NAME_MAP)) {
      if (key.includes(k) || k.includes(key)) {
        vals.forEach(v => result.add(v))
      }
    }
  }
  return Array.from(result)
}

// ── River name alias expansion ────────────────────────────────────────────────
// Maps common query names → lowercase fragments found in the rivers GeoJSON name/name_alt fields.
// Include both the English (Natural Earth) and Hindi/native spellings for each river.
const RIVER_GEO_ALIASES: Record<string, string[]> = {
  // Major peninsular rivers
  ganga:        ['ganges', 'ganga'],
  ganges:       ['ganges', 'ganga'],
  yamuna:       ['yamuna', 'jumna'],
  brahmaputra:  ['brahmaputra', 'dihang', 'yarlung'],
  godavari:     ['godavari', 'godavari'],
  krishna:      ['krishna', 'kistna'],
  cauvery:      ['cauvery', 'kaveri', 'kavery', 'kolidam'],
  kaveri:       ['cauvery', 'kaveri', 'kavery', 'kolidam'],
  narmada:      ['narmada', 'nerbudda'],
  indus:        ['indus', 'sindhu'],
  mahanadi:     ['mahana nadi', 'mahanadi', 'mahana'],
  // Punjab rivers
  sutlej:       ['sutlej', 'satluj'],
  chenab:       ['chenab', 'chanab'],
  jhelum:       ['jhelum', 'vitasta'],
  beas:         ['beas', 'vipasa'],
  ravi:         ['ravi'],
  // Central & Western
  chambal:      ['chambal'],
  betwa:        ['betwa'],
  tapti:        ['tapi', 'tapti'],
  tapi:         ['tapi', 'tapti'],
  mahi:         ['mahi'],
  son:          ['son'],
  parbati:      ['parbati'],
  // Deccan tributaries
  tungabhadra:  ['tungabhadra'],
  bhima:        ['bhima'],
  indravati:    ['indravati'],
  wainganga:    ['wainganga'],
  penna:        ['penner', 'penna', 'pennar'],
  penner:       ['penner', 'penna', 'pennar'],
  palar:        ['palar'],
  kolidam:      ['kolidam', 'cauvery'],
  tel:          ['tel'],
  sankh:        ['sankh'],
  brahmani:     ['brahmani'],
  // Northeast
  teesta:       ['tista', 'teesta'],
  tista:        ['tista', 'teesta'],
  luhit:        ['luhit'],
  gandak:       ['gandak'],
  ghaghra:      ['ghaghara', 'ghaghra', 'ghaggar'],
  ghaghara:     ['ghaghara', 'ghaghra'],
  sapt:         ['sapt'],
  // Western
  banas:        ['banas'],
  sabarmati:    ['sabarmati'],
  luni:         ['luni'],
  // Other UPSC-relevant
  damodar:      ['damodar'],
  mahananda:    ['mahananda'],
  ghaggar:      ['ghaggar', 'hakra', 'ghaghara'],
  periyar:      ['periyar'],
  sharavati:    ['sharavati'],
  koyna:        ['koyna'],
  subansiri:    ['subansiri'],
  manas:        ['manas'],
}

function expandToGeoRiverNames(features: string[]): string[] {
  const result = new Set<string>()
  for (const f of features) {
    const key = f.toLowerCase().replace(/\s+river$/i, '').replace(/\s+/g, '_').trim()
    const aliases = RIVER_GEO_ALIASES[key]
    if (aliases) {
      aliases.forEach(a => result.add(a))
    } else {
      // fallback: use both underscore and space variants as substrings to search
      const spaced = key.replace(/_/g, ' ')
      result.add(spaced)
      result.add(key)
    }
    // Always add the raw query term so even unknown rivers get a match attempt
    result.add(f.toLowerCase().replace(/\s+river$/i, '').trim())
  }
  return Array.from(result)
}
