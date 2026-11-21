/**
 * Extracts the OpenStreetMap boundary for Indore City (relation 16636427)
 * from a cached Nominatim lookup response and writes a compact GeoJSON file.
 *
 * Source: OpenStreetMap contributors, ODbL 1.0.
 * Run: node scripts/extract_boundary.mjs <nominatim.json> <out.geojson>
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('Usage: node scripts/extract_boundary.mjs <nominatim.json> <out.geojson>')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(input, 'utf8'))
const entry = Array.isArray(raw) ? raw[0] : raw
if (!entry?.geojson) throw new Error('No GeoJSON geometry in input')

const round = (coords) => {
  if (typeof coords[0] === 'number') return coords.map((n) => Math.round(n * 1e6) / 1e6)
  return coords.map(round)
}

const geometry = {
  type: entry.geojson.type,
  coordinates: round(entry.geojson.coordinates),
}

const feature = {
  type: 'Feature',
  properties: {
    name: entry.name ?? 'Indore City',
    osm_type: entry.osm_type,
    osm_id: entry.osm_id,
    admin_level: '9',
    source: 'OpenStreetMap contributors (ODbL 1.0)',
    note: 'Indore City administrative boundary as mapped in OSM. Not an official municipal notification boundary.',
  },
  geometry,
}

writeFileSync(
  output,
  JSON.stringify({ type: 'FeatureCollection', features: [feature] }),
  'utf8',
)

// Report bbox and ring sizes
let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90
let points = 0
const walk = (c) => {
  if (typeof c[0] === 'number') {
    points++
    minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0])
    minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1])
    return
  }
  c.forEach(walk)
}
walk(geometry.coordinates)
console.log(JSON.stringify({ type: geometry.type, points, bbox: [minLng, minLat, maxLng, maxLat] }, null, 2))
