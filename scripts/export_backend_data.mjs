// Export the generated frontend datasets into plain JSON for the FastAPI
// backend. The frontend files are generated TypeScript with JSON-shaped
// literals, so we extract the arrays and re-serialise them rather than
// duplicating the data by hand.
//
// Usage: node scripts/export_backend_data.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dataDir = resolve(root, 'frontend/src/data')
const outDir = resolve(root, 'backend/app/data')

mkdirSync(outDir, { recursive: true })

/** Return the balanced [ ... ] literal that starts after `marker`. */
function extractLiteral(file, marker) {
  const text = readFileSync(file, 'utf8')
  const markerAt = text.indexOf(marker)
  if (markerAt === -1) throw new Error(`marker not found in ${file}: ${marker}`)
  const open = text.indexOf('[', markerAt + marker.length)
  if (open === -1) throw new Error(`no array after marker in ${file}`)

  let depth = 0
  let inString = false
  let quote = ''
  let escaped = false

  for (let i = open; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) inString = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = true
      quote = ch
    } else if (ch === '[') {
      depth += 1
    } else if (ch === ']') {
      depth -= 1
      if (depth === 0) return text.slice(open, i + 1)
    }
  }
  throw new Error(`unbalanced array in ${file}`)
}

/** Evaluate a JS literal (the generated files allow trailing commas). */
function evalLiteral(literal) {
  return new Function(`return ${literal}`)()
}

function writeJson(name, value) {
  const path = resolve(outDir, name)
  writeFileSync(path, `${JSON.stringify(value)}\n`, 'utf8')
  const size = (readFileSync(path).length / 1024).toFixed(1)
  console.log(`  ${name.padEnd(26)} ${size} KB`)
}

// --- Grid ------------------------------------------------------------------
const gridCells = evalLiteral(
  extractLiteral(resolve(dataDir, 'indore-grid.ts'), 'export const GRID_CELLS: GridCellFeature[] ='),
)
const gridMetaSrc = readFileSync(resolve(dataDir, 'indore-grid.ts'), 'utf8')
const metaStart = gridMetaSrc.indexOf('GRID_META = {')
const metaOpen = gridMetaSrc.indexOf('{', metaStart)
const metaClose = gridMetaSrc.indexOf('\n}', metaOpen)
const gridMeta = evalLiteral(gridMetaSrc.slice(metaOpen, metaClose + 2))

// --- Localities and incidents ---------------------------------------------
const localities = evalLiteral(
  extractLiteral(resolve(dataDir, 'localities.ts'), 'export const LOCALITIES: Locality[] ='),
)
const incidents = evalLiteral(
  extractLiteral(resolve(dataDir, 'incidents.ts'), 'export const INCIDENTS: Incident[] ='),
)

// --- Complaint seeds -------------------------------------------------------
// The seed array is plain JS object literals (single quotes, trailing commas),
// so it can be evaluated directly.
const seedSrc = extractLiteral(resolve(dataDir, 'complaints.ts'), 'const SEEDS: Seed[] =')
const seeds = new Function(`return ${seedSrc}`)()

const STATUS_SEQUENCE = [
  'submitted',
  'under_review',
  'inspection_scheduled',
  'in_progress',
  'resolved',
]

const STEP_NOTE = {
  submitted: 'Complaint received, validated and geo-tagged to a 250 m grid cell.',
  under_review: 'Zone office reviewing the report and linked risk context.',
  inspection_scheduled: 'Field inspection scheduled with the responsible department.',
  in_progress: 'Maintenance crew assigned and work order opened.',
  resolved: 'Work completed and marked resolved by the authority.',
}

const R = 6_371_000
function haversineMeters(a, b) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function nearestCell(lng, lat) {
  let best = gridCells[0]
  let bestDistance = Infinity
  for (const cell of gridCells) {
    const d = haversineMeters({ lng, lat }, cell)
    if (d < bestDistance) {
      bestDistance = d
      best = cell
    }
  }
  return best
}

function isoDaysAgo(days, hour = 10, minute = 20) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function buildTimeline(status, createdAt, department, resolutionNote) {
  const end = STATUS_SEQUENCE.indexOf(status)
  return STATUS_SEQUENCE.slice(0, end + 1).map((step, index) => ({
    status: step,
    label: STEP_NOTE[step],
    at: new Date(new Date(createdAt).getTime() + index * 18 * 3_600_000).toISOString(),
    actor: index === 0 ? 'citizen' : 'authority',
    note:
      step === 'in_progress'
        ? `Assigned to ${department}.`
        : step === 'resolved'
          ? resolutionNote
          : undefined,
  }))
}

const complaints = seeds.map((seed) => {
  const createdAt = isoDaysAgo(seed.daysAgo)
  const timeline = buildTimeline(seed.status, createdAt, seed.department, seed.resolutionNote)
  const updatedAt = timeline[timeline.length - 1]?.at ?? createdAt
  const cell = nearestCell(seed.location.lng, seed.location.lat)
  return {
    id: seed.id,
    ref: seed.ref,
    category: seed.category,
    title: seed.title,
    description: seed.description,
    address: seed.address,
    localityId: seed.localityId,
    location: seed.location,
    status: seed.status,
    priority: seed.priority,
    createdAt,
    updatedAt,
    assignedDepartment: seed.department,
    citizenName: seed.citizen,
    citizenPhone: null,
    linkedCellId: cell.id,
    timeline,
    resolutionNote: seed.resolutionNote ?? null,
    imageProvenance: null,
  }
})

console.log('Exporting backend data:')
writeJson('grid-meta.json', gridMeta)
writeJson('indore-grid.json', gridCells)
writeJson('localities.json', localities)
writeJson('incidents.json', incidents)
writeJson('complaints.seed.json', complaints)
console.log(`  cells=${gridCells.length} localities=${localities.length} incidents=${incidents.length} complaints=${complaints.length}`)

