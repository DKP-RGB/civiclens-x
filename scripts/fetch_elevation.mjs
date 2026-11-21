/**
 * Samples real elevation for every analysis-grid centroid from Open-Meteo's
 * free Elevation API (Copernicus DEM GLO-90). Cached to avoid repeat calls.
 * Source: https://open-meteo.com/ (CC-BY 4.0), Copernicus DEM.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const GRID = 'data/interim/indore_grid_centers.json'
const OUT = 'data/cache/indore_elevation.json'
const BATCH = 100

if (existsSync(OUT)) {
  const cached = JSON.parse(readFileSync(OUT, 'utf8'))
  console.log(`Cache hit: ${cached.cells.length} cells → ${OUT}`)
  process.exit(0)
}

const grid = JSON.parse(readFileSync(GRID, 'utf8'))
const cells = grid.cells
const results = []

for (let i = 0; i < cells.length; i += BATCH) {
  const batch = cells.slice(i, i + BATCH)
  const lat = batch.map((c) => c.lat).join(',')
  const lng = batch.map((c) => c.lng).join(',')
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`
  let data
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url)
    if (res.ok) {
      data = await res.json()
      break
    }
    if (res.status === 429 && attempt < 4) {
      process.stdout.write(`\nRate limited, waiting 65s (attempt ${attempt})…`)
      await new Promise((r) => setTimeout(r, 65_000))
      continue
    }
    throw new Error(`Elevation API ${res.status}: ${await res.text()}`)
  }
  if (!Array.isArray(data.elevation) || data.elevation.length !== batch.length) {
    throw new Error('Unexpected elevation response length')
  }
  batch.forEach((cell, idx) => {
    results.push({ id: cell.id, elevation: data.elevation[idx] })
  })
  process.stdout.write(`\rFetched ${results.length}/${cells.length}`)
  // Free tier is weighted by coordinate count (~600 points/minute).
  await new Promise((r) => setTimeout(r, 10_500))
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify({
    source: 'Open-Meteo Elevation API, Copernicus DEM GLO-90',
    fetchedAt: new Date().toISOString(),
    cells: results,
  }),
)
console.log(`\nSaved ${results.length} elevation samples → ${OUT}`)
