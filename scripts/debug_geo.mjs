import { readFileSync } from 'node:fs'
const osm = JSON.parse(readFileSync('data/raw/osm/indore_roads_waterways.json', 'utf8'))
const grid = JSON.parse(readFileSync('data/interim/indore_grid_centers.json', 'utf8'))
const boundary = JSON.parse(readFileSync('frontend/public/data/indore-boundary.geojson', 'utf8'))
const water = osm.elements.filter((e) => e.tags?.waterway && e.geometry?.length)
const roads = osm.elements.filter((e) => e.tags?.highway && e.geometry?.length)
console.log('water ways', water.length, 'road ways', roads.length)
console.log('first water', water[0]?.tags, water[0]?.geometry?.slice(0, 2))
console.log('first road', roads[0]?.tags, roads[0]?.geometry?.slice(0, 2))
console.log('grid sample', grid.cells[0], 'total', grid.cells.length)
const cell = grid.cells.find((c) => Math.abs(c.lat - 22.7186) < 0.003 && Math.abs(c.lng - 75.8552) < 0.003)
console.log('rajwada cell', cell)
const a = water[0].geometry[0]
const LAT_M = 111320, LNG_M = LAT_M * Math.cos((22.72 * Math.PI) / 180)
function dist(p, a, b) {
  const px = p.lng * LNG_M, py = p.lat * LAT_M
  const ax = a.lon * LNG_M, ay = a.lat * LAT_M
  const bx = b.lon * LNG_M, by = b.lat * LAT_M
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.min(1, Math.max(0, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
let best = Infinity
for (const el of water) {
  for (let i = 0; i < el.geometry.length - 1; i++) {
    const d = dist(cell, el.geometry[i], el.geometry[i + 1])
    if (d < best) best = d
  }
}
console.log('nearest water from rajwada cell (m):', Math.round(best))
const bounds = boundary.features[0].geometry.coordinates[0]
let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90
for (const [lng, lat] of bounds) { minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat) }
const col = Math.floor((cell.lng - minLng) / grid.lonStep)
const row = Math.floor((cell.lat - minLat) / grid.latStep)
console.log('bbox', minLng, minLat, maxLng, maxLat, 'steps', grid.latStep, grid.lonStep)
console.log('computed row/col', row, col, 'actual', cell.row, cell.col)
