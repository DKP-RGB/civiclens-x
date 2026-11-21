/**
 * Builds a 250 m analysis grid clipped to the Indore City boundary.
 * This is a Phase 2 frontend prototype grid; Phase 4 rebuilds it with the
 * production geospatial pipeline. Coordinates are WGS84 (EPSG:4326).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const BOUNDARY = 'frontend/public/data/indore-boundary.geojson'
const OUT = 'data/interim/indore_grid_centers.json'
const CELL_M = 250
const LAT_M = 111_320

const boundary = JSON.parse(readFileSync(BOUNDARY, 'utf8'))
const geom = boundary.features[0].geometry

function ringsOf(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

function pointInRing(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false
  for (let i = 1; i < polygon.length; i++) if (pointInRing(point, polygon[i])) return false
  return true
}

function pointInGeometry(point, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates)
  return geometry.coordinates.some((poly) => pointInPolygon(point, poly))
}

// bbox
let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90
for (const poly of ringsOf(geom)) {
  for (const [lng, lat] of poly[0]) {
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
  }
}

const latStep = CELL_M / LAT_M
const lonStep = CELL_M / (LAT_M * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180))

const cells = []
let row = 0
for (let lat = minLat + latStep / 2; lat < maxLat; lat += latStep, row++) {
  let col = 0
  for (let lng = minLng + lonStep / 2; lng < maxLng; lng += lonStep, col++) {
    if (!pointInGeometry([lng, lat], geom)) continue
    cells.push({
      id: `I${String(cells.length + 1).padStart(4, '0')}`,
      lng: Math.round(lng * 1e6) / 1e6,
      lat: Math.round(lat * 1e6) / 1e6,
      row,
      col,
    })
  }
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify({
    meta: {
      city: 'Indore',
      boundarySource: 'OpenStreetMap relation 16636427 (ODbL 1.0)',
      cellSizeMeters: CELL_M,
      crs: 'EPSG:4326',
      generatedAt: new Date().toISOString(),
      note: 'Prototype analysis grid clipped to the OSM Indore City boundary.',
    },
    latStep,
    lonStep,
    cells,
  }),
)
console.log(`Generated ${cells.length} cells (${CELL_M} m) → ${OUT}`)
