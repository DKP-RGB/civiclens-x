/**
 * Phase 2 frontend data builder.
 *
 * Combines real, openly licensed Indore layers with clearly-labelled simulated
 * incident records to produce typed frontend data:
 *   - 250 m grid cells clipped to the OSM Indore City boundary
 *   - real elevation (Copernicus DEM via Open-Meteo) and slope
 *   - road density + drainage proximity from OpenStreetMap
 *   - simulated built-up proxy, incident history and locality weights
 *
 * No municipal drainage, ward or incident dataset is fabricated as real.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const BOUNDARY = 'frontend/public/data/indore-boundary.geojson'
const GRID = 'data/interim/indore_grid_centers.json'
const ELEVATION = 'data/cache/indore_elevation.json'
const OSM = 'data/raw/osm/indore_roads_waterways.json'
const OUT_GRID = 'frontend/src/data/indore-grid.ts'
const OUT_LOCALITIES = 'frontend/src/data/localities.ts'
const OUT_INCIDENTS = 'frontend/src/data/incidents.ts'

const CENTER = { lat: 22.7218, lng: 75.8624 }
const LAT_M = 111_320
const LNG_M = LAT_M * Math.cos((CENTER.lat * Math.PI) / 180)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261121)

function haversine(a, b) {
  const R = 6_371_000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
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

function pointInGeometry(point, geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.some((poly) => {
    if (!pointInRing(point, poly[0])) return false
    for (let i = 1; i < poly.length; i++) if (pointInRing(point, poly[i])) return false
    return true
  })
}

function segmentDistanceMeters(p, a, b) {
  const px = p.lng * LNG_M
  const py = p.lat * LAT_M
  const ax = a.lon * LNG_M
  const ay = a.lat * LAT_M
  const bx = b.lon * LNG_M
  const by = b.lat * LAT_M
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = clamp(t, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const boundary = JSON.parse(readFileSync(BOUNDARY, 'utf8'))
const boundaryGeom = boundary.features[0].geometry
const grid = JSON.parse(readFileSync(GRID, 'utf8'))
const elevation = JSON.parse(readFileSync(ELEVATION, 'utf8'))
const osm = JSON.parse(readFileSync(OSM, 'utf8'))

let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90
const polys = boundaryGeom.type === 'Polygon' ? [boundaryGeom.coordinates] : boundaryGeom.coordinates
for (const poly of polys) {
  for (const [lng, lat] of poly[0]) {
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
  }
}

const LOCALITIES = [
  { id: 'rajwada', name: 'Rajwada', lat: 22.7186, lng: 75.8552, baseSusceptibility: 0.82, populationEstimate: 42000, description: 'Historic core around the Rajwada palace, with dense mixed-use streets and older drainage.' },
  { id: 'palasia', name: 'Palasia', lat: 22.7245, lng: 75.8837, baseSusceptibility: 0.72, populationEstimate: 51000, description: 'Central commercial district along AB Road with heavy daytime footfall.' },
  { id: 'vijay-nagar', name: 'Vijay Nagar', lat: 22.7533, lng: 75.8937, baseSusceptibility: 0.68, populationEstimate: 88000, description: 'Large northern residential and commercial hub around Scheme 54 and MR-10.' },
  { id: 'bhawarkuan', name: 'Bhawarkuan', lat: 22.6889, lng: 75.8677, baseSusceptibility: 0.74, populationEstimate: 63000, description: 'Southern university and residential area around the Bhawarkuan intersection.' },
  { id: 'sudama-nagar', name: 'Sudama Nagar', lat: 22.6864, lng: 75.8306, baseSusceptibility: 0.7, populationEstimate: 47000, description: 'Western residential neighbourhood near the Annapurna industrial belt.' },
  { id: 'annapurna', name: 'Annapurna Road', lat: 22.7024, lng: 75.829, baseSusceptibility: 0.62, populationEstimate: 39000, description: 'Residential corridor along Annapurna Road in west Indore.' },
  { id: 'khajrana', name: 'Khajrana', lat: 22.7256, lng: 75.9085, baseSusceptibility: 0.66, populationEstimate: 58000, description: 'Eastern residential area around the Khajrana temple and nearby colonies.' },
  { id: 'nanda-nagar', name: 'Nanda Nagar', lat: 22.7005, lng: 75.896, baseSusceptibility: 0.64, populationEstimate: 44000, description: 'Eastern residential neighbourhood between Nanda Nagar and Bengali Square.' },
  { id: 'malharganj', name: 'Malharganj', lat: 22.7157, lng: 75.844, baseSusceptibility: 0.8, populationEstimate: 52000, description: 'Old-city neighbourhood with narrow lanes and mixed residential-commercial use.' },
  { id: 'juni-indore', name: 'Juni Indore', lat: 22.714, lng: 75.86, baseSusceptibility: 0.84, populationEstimate: 46000, description: 'Dense old-city area south of Rajwada with historic street patterns.' },
  { id: 'scheme-78', name: 'Scheme 78', lat: 22.75, lng: 75.887, baseSusceptibility: 0.6, populationEstimate: 36000, description: 'Planned residential scheme in the Vijay Nagar belt.' },
  { id: 'silicon-city', name: 'Silicon City', lat: 22.772, lng: 75.872, baseSusceptibility: 0.5, populationEstimate: 28000, description: 'Northern peripheral residential development.' },
  { id: 'super-corridor', name: 'Super Corridor', lat: 22.735, lng: 75.805, baseSusceptibility: 0.55, populationEstimate: 24000, description: 'Western growth corridor with large-plot development and open land.' },
  { id: 'airport-road', name: 'Airport Road', lat: 22.729, lng: 75.802, baseSusceptibility: 0.52, populationEstimate: 21000, description: 'Western approach road serving the airport and surrounding colonies.' },
  { id: 'mr-10', name: 'MR-10', lat: 22.746, lng: 75.906, baseSusceptibility: 0.58, populationEstimate: 34000, description: 'Eastern arterial corridor connecting Vijay Nagar with the ring road.' },
  { id: 'mhow-naka', name: 'Mhow Naka', lat: 22.69, lng: 75.845, baseSusceptibility: 0.7, populationEstimate: 41000, description: 'South-western junction area with mixed residential and transport use.' },
  { id: 'vallabh-nagar', name: 'Vallabh Nagar', lat: 22.71, lng: 75.872, baseSusceptibility: 0.66, populationEstimate: 38000, description: 'Central residential neighbourhood east of the old city.' },
  { id: 'tilak-nagar', name: 'Tilak Nagar', lat: 22.7, lng: 75.88, baseSusceptibility: 0.68, populationEstimate: 35000, description: 'South-central residential area near Bhawarkuan.' },
  { id: 'pipliyahana', name: 'Pipliyahana', lat: 22.74, lng: 75.91, baseSusceptibility: 0.54, populationEstimate: 30000, description: 'Eastern peripheral residential area near Pipliyahana lake.' },
  { id: 'bengali-square', name: 'Bengali Square', lat: 22.71, lng: 75.9, baseSusceptibility: 0.6, populationEstimate: 33000, description: 'South-eastern junction and residential neighbourhood.' },
  { id: 'bicholi-mardana', name: 'Bicholi Mardana', lat: 22.77, lng: 75.89, baseSusceptibility: 0.48, populationEstimate: 26000, description: 'Northern peripheral village-to-urban transition area.' },
  { id: 'rau', name: 'Rau', lat: 22.633, lng: 75.8, baseSusceptibility: 0.62, populationEstimate: 30000, description: 'Southern peri-urban town; verify boundary coverage before operational use.' },
]

const keptLocalities = LOCALITIES.filter((l) => pointInGeometry([l.lng, l.lat], boundaryGeom))
const droppedLocalities = LOCALITIES.filter((l) => !pointInGeometry([l.lng, l.lat], boundaryGeom))
if (droppedLocalities.length) {
  console.log(`Dropped localities outside OSM Indore City boundary: ${droppedLocalities.map((l) => l.name).join(', ')}`)
}

const elevationById = new Map(elevation.cells.map((c) => [c.id, c.elevation]))
const waterSegments = []
const roadSegments = []
for (const el of osm.elements) {
  if (!el.geometry || el.geometry.length < 2) continue
  const segs = []
  for (let i = 0; i < el.geometry.length - 1; i++) {
    const a = el.geometry[i]
    const b = el.geometry[i + 1]
    if (!a || !b) continue
    segs.push([a, b])
  }
  if (el.tags?.waterway) waterSegments.push(...segs)
  if (el.tags?.highway) roadSegments.push(...segs)
}

console.log(`Waterway segments: ${waterSegments.length}; major-road segments: ${roadSegments.length}`)

// ---- Road density per cell (major roads only) ----
const latStep = grid.latStep
const lonStep = grid.lonStep
const cellByRowCol = new Map()
for (const cell of grid.cells) cellByRowCol.set(`${cell.row}:${cell.col}`, cell)
const roadMeters = new Map()
for (const [a, b] of roadSegments) {
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lon + b.lon) / 2 }
  const col = Math.floor((mid.lng - minLng) / lonStep)
  const row = Math.floor((mid.lat - minLat) / latStep)
  const cell = cellByRowCol.get(`${row}:${col}`)
  if (!cell) continue
  const length = haversine({ lat: a.lat, lng: a.lon }, { lat: b.lat, lng: b.lon })
  roadMeters.set(cell.id, (roadMeters.get(cell.id) ?? 0) + length)
}

// ---- Waterway distance per cell ----
const waterDistance = new Map()
for (const cell of grid.cells) {
  let best = Infinity
  for (const [a, b] of waterSegments) {
    const d = segmentDistanceMeters(cell, a, b)
    if (d < best) best = d
    if (best < 25) break
  }
  waterDistance.set(cell.id, Number.isFinite(best) ? Math.round(best) : 3000)
}

// ---- Slope from neighbouring cells (central differences) ----
const byRowCol = cellByRowCol
function elevAt(row, col) {
  const cell = byRowCol.get(`${row}:${col}`)
  return cell ? elevationById.get(cell.id) ?? null : null
}

// ---- Build features ----
const cells = grid.cells.map((cell) => {
  const elev = elevationById.get(cell.id) ?? 560
  const e = elevAt(cell.row, cell.col)
  const east = elevAt(cell.row, cell.col + 1)
  const west = elevAt(cell.row, cell.col - 1)
  const north = elevAt(cell.row - 1, cell.col)
  const south = elevAt(cell.row + 1, cell.col)
  const dzdx = east !== null && west !== null ? (east - west) / (2 * 250) : east !== null && e !== null ? (east - e) / 250 : west !== null && e !== null ? (e - west) / 250 : 0
  const dzdy = north !== null && south !== null ? (north - south) / (2 * 250) : north !== null && e !== null ? (north - e) / 250 : south !== null && e !== null ? (e - south) / 250 : 0
  const slope = Number(((Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI).toFixed(3))

  let nearest = keptLocalities[0]
  let nearestDistance = Infinity
  for (const locality of keptLocalities) {
    const d = haversine(cell, locality)
    if (d < nearestDistance) {
      nearestDistance = d
      nearest = locality
    }
  }

  const roadM = roadMeters.get(cell.id) ?? 0
  const roadDensity = Number(clamp(roadM / 250, 0, 1).toFixed(3))
  const distKm = haversine(cell, CENTER) / 1000
  const impervious = Number(
    clamp(
      0.68 - distKm * 0.03 + roadDensity * 0.15 + nearest.baseSusceptibility * 0.05 + (rand() - 0.5) * 0.07,
      0.15,
      0.92,
    ).toFixed(3),
  )
  const wd = waterDistance.get(cell.id) ?? 3000
  const dataCompleteness = Number(
    clamp(0.56 + 0.1 + (wd < 2500 ? 0.07 : 0.03) + (roadM > 0 ? 0.05 : 0.02), 0.55, 0.82).toFixed(2),
  )

  return {
    id: cell.id,
    lng: cell.lng,
    lat: cell.lat,
    localityId: nearest.id,
    elevation: Math.round(elev * 10) / 10,
    slope,
    waterDistance: wd,
    roadDensity,
    impervious,
    histWaterlogging: 0,
    histRoadDamage: 0,
    dataCompleteness,
  }
})

// ---- Preliminary susceptibility → simulated incident history ----
function preliminarySusceptibility(cell) {
  const elevNorm = clamp((cell.elevation - 535) / 60, 0, 1)
  const drainage = clamp(1 - cell.waterDistance / 1500, 0, 1)
  const locality = keptLocalities.find((l) => l.id === cell.localityId)
  return (
    0.42 * (1 - elevNorm) +
    0.18 * (1 - drainage) +
    0.22 * cell.impervious +
    0.18 * (locality?.baseSusceptibility ?? 0.5)
  )
}

const incidents = []
const today = new Date('2026-11-21T09:00:00+05:30')
const categoryWeights = [
  ['waterlogging', 0.58],
  ['potholes', 0.22],
  ['drainage', 0.1],
  ['road_damage', 0.07],
  ['garbage', 0.03],
]
function pickCategory() {
  const r = rand()
  let acc = 0
  for (const [cat, w] of categoryWeights) {
    acc += w
    if (r <= acc) return cat
  }
  return 'waterlogging'
}

for (const cell of cells) {
  const s = preliminarySusceptibility(cell)
  const lambda = 0.02 + 0.35 * s * s + (keptLocalities.find((l) => l.id === cell.localityId)?.baseSusceptibility > 0.78 ? 0.06 : 0)
  let count = 0
  // Knuth Poisson sample
  const L = Math.exp(-lambda)
  let p = 1
  do {
    p *= rand()
    count++
  } while (p > L && count < 6)
  count -= 1
  for (let i = 0; i < count; i++) {
    const category = pickCategory()
    const daysAgo = Math.floor(rand() * 540)
    const occurred = new Date(today.getTime() - daysAgo * 86_400_000 - Math.floor(rand() * 86_400_000))
    const major = rand() < 0.14 + s * 0.3
    incidents.push({
      id: `INC-${String(incidents.length + 1).padStart(4, '0')}`,
      category,
      lng: Number((cell.lng + (rand() - 0.5) * 0.0018).toFixed(6)),
      lat: Number((cell.lat + (rand() - 0.5) * 0.0016).toFixed(6)),
      localityId: cell.localityId,
      occurredAt: occurred.toISOString(),
      severity: major ? 'major' : rand() < 0.55 ? 'moderate' : 'minor',
      status: rand() < 0.84 ? 'resolved' : 'open',
      source: 'simulated',
    })
  }
}
incidents.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

// Neighbourhood history: incidents within 750 m over the trailing 18 months.
// A spatial lag is more informative than a single 250 m cell count.
const waterIncidents = incidents.filter(
  (i) => i.category === 'waterlogging' || i.category === 'drainage',
)
const roadIncidents = incidents.filter(
  (i) => i.category === 'potholes' || i.category === 'road_damage',
)
for (const cell of cells) {
  let waterCount = 0
  for (const inc of waterIncidents) {
    if (haversine(cell, inc) <= 750) waterCount++
  }
  let roadCount = 0
  for (const inc of roadIncidents) {
    if (haversine(cell, inc) <= 750) roadCount++
  }
  cell.histWaterlogging = waterCount
  cell.histRoadDamage = roadCount
}

// ---- Distribution preview using the same illustrative formula as the UI ----
const rain24Norm = 112 / 120
const rain3Norm = 45 / 45
const rain1Norm = 18 / 25
const risks = cells.map((cell) => {
  const elevNorm = clamp((cell.elevation - 535) / 60, 0, 1)
  const drainage = clamp(1 - cell.waterDistance / 1500, 0, 1)
  const histNorm = Math.min(cell.histWaterlogging / 10, 1)
  const locality = keptLocalities.find((l) => l.id === cell.localityId)
  const z =
    -5.35 +
    1.2 * rain24Norm +
    0.5 * rain3Norm +
    0.3 * rain1Norm +
    2.6 * (1 - elevNorm) +
    0.3 * (1 - clamp(cell.slope / 6, 0, 1)) +
    0.55 * (1 - drainage) +
    0.7 * cell.impervious +
    0.3 * cell.roadDensity +
    1.0 * histNorm +
    1.0 * ((locality?.baseSusceptibility ?? 0.5) - 0.5)
  return 1 / (1 + Math.exp(-z))
})
const sorted = [...risks].sort((a, b) => a - b)
const q = (p) => sorted[Math.floor(p * (sorted.length - 1))]
const featureStats = (key) => {
  const values = cells.map((c) => c[key]).sort((a, b) => a - b)
  return {
    min: values[0],
    p50: values[Math.floor(values.length / 2)],
    max: values[values.length - 1],
  }
}
console.log('Feature ranges:', {
  elevation: featureStats('elevation'),
  slope: featureStats('slope'),
  waterDistance: featureStats('waterDistance'),
  roadDensity: featureStats('roadDensity'),
  impervious: featureStats('impervious'),
  histWaterlogging: featureStats('histWaterlogging'),
})
const counts = { low: 0, moderate: 0, high: 0, critical: 0 }
for (const r of risks) {
  if (r >= 0.7) counts.critical++
  else if (r >= 0.5) counts.high++
  else if (r >= 0.25) counts.moderate++
  else counts.low++
}
console.log('Risk preview quantiles:', {
  p10: q(0.1).toFixed(2), p50: q(0.5).toFixed(2), p90: q(0.9).toFixed(2), max: q(1).toFixed(2),
})
console.log('Risk preview counts:', counts)

// ---- Write typed frontend data ----
const localitiesOut = keptLocalities.map((l) => ({
  id: l.id,
  name: l.name,
  centroid: { lng: l.lng, lat: l.lat },
  coordinatesNote: 'Approximate locality centroid from public place data; not an official ward boundary.',
  description: l.description,
  baseSusceptibility: l.baseSusceptibility,
  populationEstimate: l.populationEstimate,
}))

writeFileSync(
  OUT_LOCALITIES,
  `// Generated by scripts/build_frontend_data.mjs — do not edit by hand.\n` +
    `import type { Locality } from '@/types'\n\n` +
    `export const LOCALITIES: Locality[] = ${JSON.stringify(localitiesOut, null, 2)}\n`,
)

writeFileSync(
  OUT_GRID,
  `// Generated by scripts/build_frontend_data.mjs — do not edit by hand.\n` +
    `import type { GridCellFeature } from '@/types'\n\n` +
    `export const GRID_META = ${JSON.stringify(
      {
        city: 'Indore',
        cellSizeMeters: 250,
        totalCells: cells.length,
        elevationSource: 'Copernicus DEM GLO-90 via Open-Meteo (CC-BY 4.0)',
        boundarySource: 'OpenStreetMap relation 16636427 (ODbL 1.0)',
        roadSource: 'OpenStreetMap major roads (ODbL 1.0)',
        waterSource: 'OpenStreetMap waterways (ODbL 1.0)',
        builtUpNote: 'Impervious surface is a simulated built-up proxy; land-cover raster integration is pending.',
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n\n` +
    `export const GRID_CELLS: GridCellFeature[] = [\n` +
    cells.map((c) => `  ${JSON.stringify(c)},`).join('\n') +
    `\n]\n`,
)

writeFileSync(
  OUT_INCIDENTS,
  `// Generated by scripts/build_frontend_data.mjs — do not edit by hand.\n` +
    `// SIMULATED incident history for prototype demonstration. Not municipal records.\n` +
    `import type { Incident } from '@/types'\n\n` +
    `export const INCIDENTS: Incident[] = [\n` +
    incidents.map((i) => `  ${JSON.stringify(i)},`).join('\n') +
    `\n]\n`,
)

console.log(
  `Wrote ${cells.length} cells, ${incidents.length} simulated incidents, ${keptLocalities.length} localities`,
)
