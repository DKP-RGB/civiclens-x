import * as React from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson'
import { Loader2, MapPin } from 'lucide-react'
import type { CellRisk, Incident, LatLng, Locality, RiskLevel } from '@/types'
import { RISK_LEVEL_META } from '@/lib/status'
import { cn } from '@/lib/utils'

export type MapColorMode = 'risk' | 'delta'

export interface MapLayers {
  grid: boolean
  heatmap: boolean
  incidents: boolean
  labels: boolean
}

export interface IndoreMapProps {
  riskCells?: CellRisk[]
  deltaCells?: CellRisk[]
  /** Baseline probabilities keyed by cell id, used by the simulator map. */
  deltaBaseline?: Map<string, number>
  incidents?: Incident[]
  localities?: Locality[]
  theme?: 'light' | 'dark'
  layers?: MapLayers
  selectedCellId?: string
  onSelectCell?: (cellId: string) => void
  onSelectIncident?: (incident: Incident) => void
  colorMode?: MapColorMode
  legendLabel?: string
  picker?: boolean
  pickedLocation?: LatLng | null
  onPickLocation?: (location: LatLng) => void
  className?: string
  height?: number | string
  showLegend?: boolean
  fitOnLoad?: boolean
  interactive?: boolean
  focus?: { lng: number; lat: number; zoom?: number } | null
  ariaLabel?: string
}

const STYLE_URLS = {
  dark: import.meta.env.VITE_MAP_STYLE_DARK || 'https://tiles.openfreemap.org/styles/dark',
  light: import.meta.env.VITE_MAP_STYLE_LIGHT || 'https://tiles.openfreemap.org/styles/positron',
}

const HALF_LAT = 0.0022457779374775422 / 2
const HALF_LNG = 0.002434737142139972 / 2

const INDORE_CENTER: [number, number] = [75.8624, 22.7218]

function cellPolygon(lng: number, lat: number): Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - HALF_LNG, lat - HALF_LAT],
        [lng + HALF_LNG, lat - HALF_LAT],
        [lng + HALF_LNG, lat + HALF_LAT],
        [lng - HALF_LNG, lat + HALF_LAT],
        [lng - HALF_LNG, lat - HALF_LAT],
      ],
    ],
  }
}

function buildGrid(
  cells: CellRisk[],
  mode: MapColorMode,
  baseline?: Map<string, number>,
): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: cells.map((risk) => ({
      type: 'Feature',
      properties: {
        id: risk.cell.id,
        risk: Number(risk.probability.toFixed(3)),
        level: risk.level,
        category: risk.category,
        localityId: risk.cell.localityId,
        delta:
          mode === 'delta'
            ? Number((risk.probability - (baseline?.get(risk.cell.id) ?? risk.probability)).toFixed(3))
            : 0,
      },
      geometry: cellPolygon(risk.cell.lng, risk.cell.lat),
    })),
  }
}

function buildHeat(cells: CellRisk[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: cells.map((risk) => ({
      type: 'Feature',
      properties: { risk: risk.probability },
      geometry: { type: 'Point', coordinates: [risk.cell.lng, risk.cell.lat] },
    })),
  }
}

function buildIncidents(incidents: Incident[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      properties: {
        id: incident.id,
        category: incident.category,
        severity: incident.severity,
        occurredAt: incident.occurredAt,
      },
      geometry: { type: 'Point', coordinates: [incident.lng, incident.lat] },
    })),
  }
}

function buildLocalities(localities: Locality[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: localities.map((locality) => ({
      type: 'Feature',
      properties: { name: locality.name },
      geometry: { type: 'Point', coordinates: [locality.centroid.lng, locality.centroid.lat] },
    })),
  }
}

function selectedFeature(cellId: string | undefined, cells: CellRisk[]): FeatureCollection<Polygon> {
  const cell = cells.find((c) => c.cell.id === cellId)
  if (!cell) return { type: 'FeatureCollection', features: [] }
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: { id: cell.cell.id },
    geometry: cellPolygon(cell.cell.lng, cell.cell.lat),
  }
  return { type: 'FeatureCollection', features: [feature] }
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export function IndoreMap({
  riskCells = [],
  deltaCells,
  deltaBaseline,
  incidents = [],
  localities = [],
  theme = 'dark',
  layers = { grid: true, heatmap: false, incidents: true, labels: true },
  selectedCellId,
  onSelectCell,
  onSelectIncident,
  colorMode = 'risk',
  legendLabel = 'Waterlogging risk',
  picker = false,
  pickedLocation,
  onPickLocation,
  className,
  height = 480,
  showLegend = true,
  fitOnLoad = true,
  interactive = true,
  focus,
  ariaLabel = 'Indore risk map',
}: IndoreMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const markerRef = React.useRef<maplibregl.Marker | null>(null)
  const [ready, setReady] = React.useState(false)
  const [boundary, setBoundary] = React.useState<FeatureCollection | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const hasFit = React.useRef(false)

  const selectCellRef = React.useRef(onSelectCell)
  const pickRef = React.useRef(onPickLocation)
  const incidentRef = React.useRef(onSelectIncident)
  React.useEffect(() => {
    selectCellRef.current = onSelectCell
    pickRef.current = onPickLocation
    incidentRef.current = onSelectIncident
  }, [onSelectCell, onPickLocation, onSelectIncident])

  const displayCells = colorMode === 'delta' ? (deltaCells ?? riskCells) : riskCells
  const gridData = React.useMemo(
    () => buildGrid(displayCells, colorMode, deltaBaseline),
    [displayCells, colorMode, deltaBaseline],
  )
  const heatData = React.useMemo(() => buildHeat(displayCells), [displayCells])
  const incidentData = React.useMemo(() => buildIncidents(incidents), [incidents])
  const localityData = React.useMemo(() => buildLocalities(localities), [localities])
  const selectedData = React.useMemo(
    () => selectedFeature(selectedCellId, displayCells),
    [selectedCellId, displayCells],
  )

  React.useEffect(() => {
    fetch('/data/indore-boundary.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`Boundary ${res.status}`)
        return res.json() as Promise<FeatureCollection>
      })
      .then(setBoundary)
      .catch(() => setError('Indore boundary could not be loaded.'))
  }, [])

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URLS[theme],
      center: INDORE_CENTER,
      zoom: 12.1,
      minZoom: 9.5,
      maxZoom: 18,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      interactive,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 90 }), 'bottom-left')
    }
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: 'CivicLens X · Indore' }),
      'bottom-right',
    )

    let overlaysAdded = false
    const addOverlays = () => {
      if (overlaysAdded) return
      overlaysAdded = true

      map.addSource('boundary', { type: 'geojson', data: EMPTY })
      map.addSource('grid', { type: 'geojson', data: EMPTY })
      map.addSource('heat', { type: 'geojson', data: EMPTY })
      map.addSource('incidents', { type: 'geojson', data: EMPTY })
      map.addSource('localities', { type: 'geojson', data: EMPTY })
      map.addSource('selected', { type: 'geojson', data: EMPTY })

      map.addLayer({
        id: 'boundary-fill',
        type: 'fill',
        source: 'boundary',
        paint: { 'fill-color': '#14b8a6', 'fill-opacity': 0.04 },
      })
      map.addLayer({
        id: 'boundary-line',
        type: 'line',
        source: 'boundary',
        paint: { 'line-color': theme === 'dark' ? '#2dd4bf' : '#0f766e', 'line-width': 1.2, 'line-opacity': 0.8 },
      })
      map.addLayer({
        id: 'heatmap',
        type: 'heatmap',
        source: 'heat',
        layout: { visibility: layers.heatmap ? 'visible' : 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'risk'], 0, 0.1, 1, 1],
          'heatmap-intensity': 0.85,
          'heatmap-radius': 22,
          'heatmap-opacity': 0.55,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(15,118,110,0)',
            0.2,
            'rgba(34,197,94,0.35)',
            0.45,
            'rgba(234,179,8,0.55)',
            0.7,
            'rgba(249,115,22,0.7)',
            0.9,
            'rgba(220,38,38,0.8)',
          ],
        },
      })
      map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid',
        paint: {
          'fill-color':
            colorMode === 'delta'
              ? [
                  'case',
                  ['>=', ['get', 'delta'], 0],
                  ['interpolate', ['linear'], ['get', 'delta'], 0, 'rgba(220,38,38,0)', 0.08, '#f59e0b', 0.25, '#dc2626'],
                  ['interpolate', ['linear'], ['get', 'delta'], -0.25, '#2563eb', -0.02, 'rgba(37,99,235,0)'],
                ]
              : [
                  'interpolate',
                  ['linear'],
                  ['get', 'risk'],
                  0,
                  '#15803d',
                  0.25,
                  '#ca8a04',
                  0.5,
                  '#ea580c',
                  0.7,
                  '#dc2626',
                  0.9,
                  '#991b1b',
                ],
          'fill-opacity': 0.58,
        },
      })
      map.addLayer({
        id: 'selected-cell',
        type: 'line',
        source: 'selected',
        paint: { 'line-color': theme === 'dark' ? '#f8fafc' : '#0f172a', 'line-width': 2.4 },
      })
      map.addLayer({
        id: 'incident-points',
        type: 'circle',
        source: 'incidents',
        paint: {
          'circle-radius': ['match', ['get', 'severity'], 'major', 5.5, 'moderate', 4.2, 3.2],
          'circle-color': [
            'match',
            ['get', 'category'],
            'waterlogging',
            '#0ea5e9',
            'drainage',
            '#6366f1',
            'potholes',
            '#f59e0b',
            'road_damage',
            '#ef4444',
            'garbage',
            '#84cc16',
            '#94a3b8',
          ],
          'circle-stroke-color': theme === 'dark' ? '#0b1220' : '#ffffff',
          'circle-stroke-width': 1.4,
          'circle-opacity': 0.92,
        },
      })
      map.addLayer({
        id: 'locality-dots',
        type: 'circle',
        source: 'localities',
        paint: {
          'circle-radius': 2.6,
          'circle-color': theme === 'dark' ? '#e2e8f0' : '#1e293b',
          'circle-opacity': 0.75,
          'circle-stroke-color': theme === 'dark' ? '#0b1220' : '#ffffff',
          'circle-stroke-width': 1,
        },
      })
      map.addLayer({
        id: 'locality-labels',
        type: 'symbol',
        source: 'localities',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 0.9],
          'text-anchor': 'top',
          'text-font': ['Noto Sans Regular'],
          'text-allow-overlap': false,
          'text-padding': 4,
        },
        paint: {
          'text-color': theme === 'dark' ? '#cbd5e1' : '#334155',
          'text-halo-color': theme === 'dark' ? '#0b1220' : '#ffffff',
          'text-halo-width': 1.4,
        },
      })

      map.on('click', 'grid-fill', (event: maplibregl.MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id as string | undefined
        if (id) selectCellRef.current?.(id)
      })
      map.on('click', 'incident-points', (event: maplibregl.MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id as string | undefined
        const incident = incidents.find((item) => item.id === id)
        if (incident) incidentRef.current?.(incident)
      })
      map.on('click', (event: maplibregl.MapMouseEvent) => {
        if (!picker) return
        pickRef.current?.({ lng: event.lngLat.lng, lat: event.lngLat.lat })
      })
      map.on('mouseenter', 'grid-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'grid-fill', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'incident-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'incident-points', () => {
        map.getCanvas().style.cursor = ''
      })

      setReady(true)
      // The container can be measured before layout settles; resize once the
      // next frame paints so the canvas fills the card.
      window.requestAnimationFrame(() => map.resize())
    }

    // `style.load` fires for both the initial style and the plain fallback
    // style, so overlays are added in either case.
    map.on('style.load', addOverlays)

    // If OpenFreeMap is unreachable, fall back to a plain background style so
    // the boundary, risk grid and incidents still render instead of an endless
    // spinner. The legend and data layers stay usable without basemap tiles.
    let fallbackApplied = false
    const applyFallback = () => {
      if (fallbackApplied || overlaysAdded) return
      fallbackApplied = true
      setError('Basemap tiles unavailable — showing the risk grid only.')
      map.setStyle({
        version: 8,
        sources: {},
        layers: [
          {
            id: 'fallback-bg',
            type: 'background',
            paint: { 'background-color': theme === 'dark' ? '#0b1220' : '#e9edf0' },
          },
        ],
      })
      map.once('style.load', addOverlays)
      map.once('idle', addOverlays)
    }

    const styleTimeout = window.setTimeout(applyFallback, 8000)

    map.on('error', (event: maplibregl.ErrorEvent) => {
      const message = event.error?.message ?? ''
      if (!map.isStyleLoaded() && /style|fetch|load/i.test(message)) {
        applyFallback()
      } else if (!map.isStyleLoaded()) {
        setError('The basemap style could not be loaded.')
      }
      console.warn('CivicLens X map:', message || event)
    })

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)

    return () => {
      window.clearTimeout(styleTimeout)
      observer.disconnect()
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // Map is intentionally initialized once per mounted theme/layer defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('grid') as maplibregl.GeoJSONSource | undefined)?.setData(gridData)
    ;(map.getSource('heat') as maplibregl.GeoJSONSource | undefined)?.setData(heatData)
  }, [gridData, heatData, ready])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('incidents') as maplibregl.GeoJSONSource | undefined)?.setData(incidentData)
  }, [incidentData, ready])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('localities') as maplibregl.GeoJSONSource | undefined)?.setData(localityData)
  }, [localityData, ready])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('selected') as maplibregl.GeoJSONSource | undefined)?.setData(selectedData)
  }, [selectedData, ready])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !boundary) return
    ;(map.getSource('boundary') as maplibregl.GeoJSONSource | undefined)?.setData(boundary)
    if (fitOnLoad && !hasFit.current) {
      hasFit.current = true
      const coords = boundary.features.flatMap((feature) => {
        const geometry = feature.geometry
        if (geometry.type === 'Polygon') return geometry.coordinates[0]
        if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap((poly) => poly[0])
        return []
      })
      if (coords.length) {
        const lngs = coords.map((c) => c[0])
        const lats = coords.map((c) => c[1])
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: { top: 32, bottom: 32, left: 32, right: 32 }, duration: 700 },
        )
      }
    }
  }, [boundary, ready, fitOnLoad])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setLayoutProperty('heatmap', 'visibility', layers.heatmap ? 'visible' : 'none')
    map.setLayoutProperty('grid-fill', 'visibility', layers.grid ? 'visible' : 'none')
    map.setLayoutProperty('incident-points', 'visibility', layers.incidents ? 'visible' : 'none')
    map.setLayoutProperty('locality-labels', 'visibility', layers.labels ? 'visible' : 'none')
    map.setLayoutProperty('locality-dots', 'visibility', layers.labels ? 'visible' : 'none')
  }, [layers, ready])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !focus) return
    map.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom ?? 13.2, duration: 800 })
    // Depend on the coordinates, not the object identity: callers often build
    // the focus object inline, and re-flying on every render would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.lng, focus?.lat, focus?.zoom, ready])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (!pickedLocation) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.className = 'map-pin'
      el.setAttribute('aria-label', 'Selected report location')
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pickedLocation.lng, pickedLocation.lat])
        .addTo(map)
    } else {
      markerRef.current.setLngLat([pickedLocation.lng, pickedLocation.lat])
    }
  }, [pickedLocation, ready])

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-xl border border-border bg-[var(--map-bg)]', className)}
      style={{ height }}
    >
      <div
        ref={containerRef}
        className={cn('h-full w-full', !interactive && 'pointer-events-none')}
        role="application"
        aria-label={ariaLabel}
      />
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading Indore map…
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-2xs text-amber-700">
          {error}
        </div>
      ) : null}
      {showLegend ? <MapLegend colorMode={colorMode} label={legendLabel} /> : null}
      {picker ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-2xs text-muted-foreground shadow-sm backdrop-blur">
          <MapPin className="h-3 w-3" />
          Click anywhere inside Indore to set the location
        </div>
      ) : null}
    </div>
  )
}

function MapLegend({ colorMode, label }: { colorMode: MapColorMode; label: string }) {
  if (colorMode === 'delta') {
    return (
      <div className="absolute bottom-8 left-3 z-10 rounded-lg border border-border bg-card/90 p-2.5 shadow-sm backdrop-blur">
        <p className="mb-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Risk change
        </p>
        <div className="h-1.5 w-36 rounded-full bg-gradient-to-r from-blue-600 via-slate-400/40 to-red-600" />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Lower</span>
          <span>No change</span>
          <span>Higher</span>
        </div>
      </div>
    )
  }
  const levels: RiskLevel[] = ['low', 'moderate', 'high', 'critical']
  return (
    <div className="absolute bottom-8 left-3 z-10 rounded-lg border border-border bg-card/95 p-2.5 shadow-sm backdrop-blur">
      <p className="mb-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-1">
        {levels.map((level) => (
          <div key={level} className="flex flex-col items-center gap-1">
            <span
              className="h-2 w-9 rounded-sm"
              style={{ backgroundColor: RISK_LEVEL_META[level].hex }}
            />
            <span className="text-[10px] text-muted-foreground">{RISK_LEVEL_META[level].label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
