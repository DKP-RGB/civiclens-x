import type {
  CellRisk,
  GridCellFeature,
  Locality,
  RiskCategory,
  RiskFactor,
  RiskLevel,
  RiskScenario,
  RiskSummary,
} from '@/types'
import { GRID_CELLS } from '@/data/indore-grid'
import { LOCALITIES } from '@/data/localities'
import { clamp, haversineMeters } from '@/lib/utils'
import { riskLevelFromProbability } from '@/lib/status'

// ---------------------------------------------------------------------------
// Illustrative frontend risk scoring.
//
// This is NOT the Phase 5 XGBoost model. It is a transparent, deterministic
// scoring rule that uses real terrain/road/drainage features and simulated
// incident history so the Phase 2 interface behaves like the final product.
// The Phase 5 model replaces this module behind the same CellRisk shape.
// ---------------------------------------------------------------------------

export interface RiskInputs {
  rain1h: number
  rain3h: number
  rain24h: number
  drainageMultiplier?: number
  imperviousOverride?: number
}

const LOCALITY_MAP = new Map(LOCALITIES.map((l) => [l.id, l]))
const CELL_MAP = new Map(GRID_CELLS.map((c) => [c.id, c]))
const ELEV_MIN = Math.min(...GRID_CELLS.map((c) => c.elevation))
const ELEV_MAX = Math.max(...GRID_CELLS.map((c) => c.elevation))

const RAIN1_REF = 25
const RAIN3_REF = 45
const RAIN24_REF = 120
const HIST_REF = 10
const HIST_ROAD_REF = 8

const DRAINAGE_MULTIPLIER = { poor: 0.55, fair: 1, good: 1.3 } as const

export const DEMO_RISK_INPUTS: RiskInputs = {
  rain1h: 12,
  rain3h: 30,
  rain24h: 105,
}

function elevationNorm(cell: GridCellFeature) {
  return clamp((cell.elevation - ELEV_MIN) / (ELEV_MAX - ELEV_MIN), 0, 1)
}

function drainageScore(cell: GridCellFeature, multiplier = 1) {
  return clamp((1 - cell.waterDistance / 1500) * multiplier, 0, 1.2)
}

function rainNorms(inputs: RiskInputs) {
  return {
    rain1: clamp(inputs.rain1h / RAIN1_REF, 0, 1.6),
    rain3: clamp(inputs.rain3h / RAIN3_REF, 0, 1.6),
    rain24: clamp(inputs.rain24h / RAIN24_REF, 0, 1.6),
  }
}

interface DraftFactor {
  key: string
  label: string
  detail: string
  value: number
  direction: 'increases' | 'reduces'
}

function finalizeFactors(drafts: DraftFactor[]): RiskFactor[] {
  const positives = drafts
    .filter((f) => f.direction === 'increases' && f.value > 0.01)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
  const reducing = drafts
    .filter((f) => f.direction === 'reduces' && f.value > 0.12)
    .sort((a, b) => b.value - a.value)
    .slice(0, 1)
  const selected = [...positives, ...reducing]
  const total = selected.reduce((acc, f) => acc + Math.abs(f.value), 0) || 1
  return selected.map((f) => ({
    key: f.key,
    label: f.label,
    detail: f.detail,
    direction: f.direction,
    contribution: Number((Math.abs(f.value) / total).toFixed(3)),
  }))
}

function waterloggingFactors(
  cell: GridCellFeature,
  locality: Locality,
  inputs: RiskInputs,
): { factors: RiskFactor[]; probability: number; uncertainty: number } {
  const elev = elevationNorm(cell)
  const lowElev = 1 - elev
  const flatness = 1 - clamp(cell.slope / 6, 0, 1)
  const drainage = drainageScore(cell, inputs.drainageMultiplier)
  const impervious = inputs.imperviousOverride ?? cell.impervious
  const history = clamp(cell.histWaterlogging / HIST_REF, 0, 1)
  const rain = rainNorms(inputs)
  const localityBias = locality.baseSusceptibility - 0.5

  const z =
    -5.35 +
    1.2 * rain.rain24 +
    0.5 * rain.rain3 +
    0.3 * rain.rain1 +
    2.6 * lowElev +
    0.3 * flatness +
    0.55 * (1 - drainage) +
    0.7 * impervious +
    0.3 * cell.roadDensity +
    1.0 * history +
    1.0 * localityBias

  const probability = 1 / (1 + Math.exp(-z))

  const drafts: DraftFactor[] = [
    {
      key: 'rain24',
      label: '24 h forecast rainfall',
      detail: `${inputs.rain24h.toFixed(0)} mm expected`,
      value: 1.2 * rain.rain24,
      direction: 'increases',
    },
    {
      key: 'rain3',
      label: '3 h rainfall peak',
      detail: `${inputs.rain3h.toFixed(0)} mm in the wettest 3 h`,
      value: 0.5 * rain.rain3,
      direction: 'increases',
    },
    {
      key: 'rain1',
      label: '1 h rainfall intensity',
      detail: `${inputs.rain1h.toFixed(0)} mm/h peak`,
      value: 0.3 * rain.rain1,
      direction: 'increases',
    },
    {
      key: 'elevation',
      label: 'Low elevation',
      detail: `${cell.elevation.toFixed(0)} m · lower ground`,
      value: 2.6 * lowElev,
      direction: 'increases',
    },
    {
      key: 'slope',
      label: 'Flat terrain',
      detail: `${cell.slope.toFixed(1)}° slope slows runoff`,
      value: 0.3 * flatness,
      direction: 'increases',
    },
    {
      key: 'drainage',
      label: 'Drainage gap',
      detail: `${cell.waterDistance} m to mapped waterway`,
      value: 0.55 * (1 - drainage),
      direction: 'increases',
    },
    {
      key: 'impervious',
      label: 'Built-up surface',
      detail: `${(impervious * 100).toFixed(0)}% impervious proxy`,
      value: 0.7 * impervious,
      direction: 'increases',
    },
    {
      key: 'roads',
      label: 'Road density',
      detail: `${(cell.roadDensity * 100).toFixed(0)}% of cell maximum`,
      value: 0.3 * cell.roadDensity,
      direction: 'increases',
    },
    {
      key: 'history',
      label: 'Recent incident history',
      detail: `${cell.histWaterlogging} waterlogging/drainage reports within 750 m`,
      value: 1.0 * history,
      direction: 'increases',
    },
    {
      key: 'locality',
      label: 'Locality susceptibility',
      detail: `${locality.name} baseline weight`,
      value: 1.0 * Math.max(0, localityBias),
      direction: 'increases',
    },
    {
      key: 'elevation_ok',
      label: 'Higher elevation',
      detail: `${cell.elevation.toFixed(0)} m reduces exposure`,
      value: 2.6 * elev,
      direction: 'reduces',
    },
    {
      key: 'drainage_ok',
      label: 'Mapped drainage proximity',
      detail: `${cell.waterDistance} m from a mapped waterway`,
      value: 0.55 * drainage,
      direction: 'reduces',
    },
  ]

  const uncertainty = clamp(
    0.06 + 0.16 * (1 - cell.dataCompleteness) + 0.05 * (1 - history),
    0.05,
    0.24,
  )

  return { factors: finalizeFactors(drafts), probability, uncertainty }
}

function roadFactors(
  cell: GridCellFeature,
  locality: Locality,
  inputs: RiskInputs,
): { factors: RiskFactor[]; probability: number; uncertainty: number } {
  const drainage = drainageScore(cell, inputs.drainageMultiplier)
  const impervious = inputs.imperviousOverride ?? cell.impervious
  const history = clamp(cell.histRoadDamage / HIST_ROAD_REF, 0, 1)
  const rain = rainNorms(inputs)
  const slope = clamp(cell.slope / 6, 0, 1)
  const localityBias = locality.baseSusceptibility - 0.5

  const z =
    -2.6 +
    1.0 * cell.roadDensity +
    0.9 * impervious +
    0.75 * (1 - drainage) +
    0.6 * rain.rain24 +
    0.4 * slope +
    0.9 * history +
    0.8 * localityBias

  const probability = 1 / (1 + Math.exp(-z))

  const drafts: DraftFactor[] = [
    {
      key: 'roads',
      label: 'Road density',
      detail: `${(cell.roadDensity * 100).toFixed(0)}% of cell maximum`,
      value: 1.0 * cell.roadDensity,
      direction: 'increases',
    },
    {
      key: 'impervious',
      label: 'Built-up surface',
      detail: `${(impervious * 100).toFixed(0)}% impervious proxy`,
      value: 0.9 * impervious,
      direction: 'increases',
    },
    {
      key: 'drainage',
      label: 'Drainage gap',
      detail: `${cell.waterDistance} m to mapped waterway`,
      value: 0.75 * (1 - drainage),
      direction: 'increases',
    },
    {
      key: 'rain',
      label: 'Wetting load',
      detail: `${inputs.rain24h.toFixed(0)} mm forecast in 24 h`,
      value: 0.6 * rain.rain24,
      direction: 'increases',
    },
    {
      key: 'slope',
      label: 'Gradient stress',
      detail: `${cell.slope.toFixed(1)}° slope`,
      value: 0.4 * slope,
      direction: 'increases',
    },
    {
      key: 'history',
      label: 'Pothole & damage history',
      detail: `${cell.histRoadDamage} road damage reports within 750 m`,
      value: 0.9 * history,
      direction: 'increases',
    },
    {
      key: 'locality',
      label: 'Locality road pressure',
      detail: `${locality.name} baseline weight`,
      value: 0.8 * Math.max(0, localityBias),
      direction: 'increases',
    },
    {
      key: 'drainage_ok',
      label: 'Mapped drainage proximity',
      detail: `${cell.waterDistance} m from a mapped waterway`,
      value: 0.75 * drainage,
      direction: 'reduces',
    },
  ]

  return {
    factors: finalizeFactors(drafts),
    probability,
    uncertainty: clamp(0.07 + 0.18 * (1 - cell.dataCompleteness), 0.06, 0.25),
  }
}

export function computeCellRisk(
  cell: GridCellFeature,
  category: RiskCategory,
  inputs: RiskInputs,
): CellRisk {
  const locality = LOCALITY_MAP.get(cell.localityId) ?? LOCALITIES[0]
  const result =
    category === 'waterlogging'
      ? waterloggingFactors(cell, locality, inputs)
      : roadFactors(cell, locality, inputs)
  return {
    cell,
    category,
    probability: Number(result.probability.toFixed(4)),
    level: riskLevelFromProbability(result.probability),
    factors: result.factors,
    uncertainty: Number(result.uncertainty.toFixed(2)),
    dataCompleteness: cell.dataCompleteness,
  }
}

export function computeCityRisks(category: RiskCategory, inputs: RiskInputs): CellRisk[] {
  return GRID_CELLS.map((cell) => computeCellRisk(cell, category, inputs))
}

export function summarizeRisks(risks: CellRisk[]): RiskSummary {
  const counts: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0, critical: 0 }
  let total = 0
  for (const risk of risks) {
    counts[risk.level]++
    total += risk.probability
  }
  return {
    meanProbability: risks.length ? total / risks.length : 0,
    counts,
    criticalCells: counts.critical,
    highCells: counts.high,
    totalCells: risks.length,
  }
}

export interface LocalityRiskSummary {
  locality: Locality
  meanProbability: number
  maxProbability: number
  level: RiskLevel
  cellCount: number
  topCell: CellRisk
}

export function getLocalityRiskSummaries(risks: CellRisk[]): LocalityRiskSummary[] {
  const groups = new Map<string, CellRisk[]>()
  for (const risk of risks) {
    const list = groups.get(risk.cell.localityId)
    if (list) list.push(risk)
    else groups.set(risk.cell.localityId, [risk])
  }
  const summaries: LocalityRiskSummary[] = []
  for (const [localityId, cells] of groups) {
    const locality = LOCALITY_MAP.get(localityId)
    if (!locality) continue
    const mean = cells.reduce((acc, c) => acc + c.probability, 0) / cells.length
    const topCell = cells.reduce((a, b) => (a.probability > b.probability ? a : b))
    summaries.push({
      locality,
      meanProbability: mean,
      maxProbability: topCell.probability,
      level: riskLevelFromProbability(mean),
      cellCount: cells.length,
      topCell,
    })
  }
  return summaries.sort((a, b) => b.meanProbability - a.meanProbability)
}

export function getTopRiskCells(risks: CellRisk[], count = 8) {
  return [...risks].sort((a, b) => b.probability - a.probability).slice(0, count)
}

export function getNearestCell(lng: number, lat: number) {
  let best = GRID_CELLS[0]
  let bestDistance = Infinity
  for (const cell of GRID_CELLS) {
    const d = haversineMeters({ lng, lat }, cell)
    if (d < bestDistance) {
      bestDistance = d
      best = cell
    }
  }
  return { cell: best, distanceMeters: Math.round(bestDistance) }
}

export function getNearestLocality(lng: number, lat: number) {
  let best = LOCALITIES[0]
  let bestDistance = Infinity
  for (const locality of LOCALITIES) {
    const d = haversineMeters({ lng, lat }, locality.centroid)
    if (d < bestDistance) {
      bestDistance = d
      best = locality
    }
  }
  return { locality: best, distanceMeters: Math.round(bestDistance) }
}

export function getCellById(id: string) {
  return CELL_MAP.get(id)
}

export function getLocalityById(id: string) {
  return LOCALITY_MAP.get(id)
}

export function getCellCenter(cell: GridCellFeature) {
  return { lng: cell.lng, lat: cell.lat }
}

export function drainageMultiplierFor(condition: RiskScenario['drainageCondition']) {
  return DRAINAGE_MULTIPLIER[condition]
}

export function simulateScenario(
  baseRisks: CellRisk[],
  scenario: RiskScenario,
): CellRisk[] {
  const duration = Math.max(1, scenario.rainfallDurationHours)
  const inputs: RiskInputs = {
    rain1h: scenario.rainfallMmPerHour,
    rain3h: scenario.rainfallMmPerHour * Math.min(3, duration),
    rain24h: scenario.rainfallMmPerHour * Math.min(24, duration),
    drainageMultiplier: drainageMultiplierFor(scenario.drainageCondition),
    imperviousOverride: scenario.imperviousPct / 100,
  }
  return baseRisks.map((risk) => computeCellRisk(risk.cell, risk.category, inputs))
}

export { ELEV_MIN, ELEV_MAX }
