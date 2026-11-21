import type { CellRisk, PreventiveAction, Priority } from '@/types'
import { DEMO_RISK_INPUTS, computeCityRisks, getLocalityById } from '@/lib/risk'
import { pct } from '@/lib/utils'

// Rule-based preventive action generation for Phase 2.
// Ranks cells by illustrative risk, selects the top cell per locality, and
// produces transparent, editable action records. Phase 7 replaces the ranking
// with the trained model + optimisation layer.

const waterRisks = computeCityRisks('waterlogging', DEMO_RISK_INPUTS)
const roadRisks = computeCityRisks('road_deterioration', DEMO_RISK_INPUTS)

function topPerLocality(risks: CellRisk[]): CellRisk[] {
  const best = new Map<string, CellRisk>()
  for (const risk of risks) {
    const current = best.get(risk.cell.localityId)
    if (!current || risk.probability > current.probability) best.set(risk.cell.localityId, risk)
  }
  return [...best.values()].sort((a, b) => b.probability - a.probability)
}

function priorityFor(risk: CellRisk): Priority {
  if (risk.level === 'critical') return 'urgent'
  if (risk.level === 'high') return 'high'
  if (risk.level === 'moderate') return 'medium'
  return 'low'
}

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(17, 0, 0, 0)
  return d.toISOString()
}

const STATUS_CYCLE = ['proposed', 'approved', 'scheduled', 'completed'] as const

function makeWaterAction(risk: CellRisk, index: number): PreventiveAction {
  const locality = getLocalityById(risk.cell.localityId)
  const name = locality?.name ?? 'Indore'
  const drivers = risk.factors.filter((f) => f.direction === 'increases').slice(0, 2)
  const driverText = drivers.map((d) => `${d.label.toLowerCase()} (${Math.round(d.contribution * 100)}%)`).join(' and ')
  return {
    id: `ACT-2026-${String(index + 1).padStart(3, '0')}`,
    ref: `PA-2026-${String(index + 1).padStart(3, '0')}`,
    cellId: risk.cell.id,
    localityId: risk.cell.localityId,
    title: `Pre-rain drain inspection — ${name}`,
    description: `Clear inlets and desilt the stormwater line serving cell ${risk.cell.id} before the forecast peak. Verify the outfall and pre-position a pump if the inspection finds standing water.`,
    department: 'Stormwater & Drainage Cell',
    priority: priorityFor(risk),
    status: STATUS_CYCLE[index % STATUS_CYCLE.length],
    category: 'waterlogging',
    riskReductionPct: Math.round(8 + risk.probability * 14),
    populationBenefit: Math.round((locality?.populationEstimate ?? 30000) * (0.18 + risk.probability * 0.22)),
    estimatedCostInr: Math.round((180_000 + risk.probability * 1_100_000) / 10_000) * 10_000,
    dueDate: daysFromNow(3 + (index % 5) * 3),
    rationale: `Cell ${risk.cell.id} in ${name} is at ${pct(risk.probability)} waterlogging risk. The main contributors are ${driverText}. The action targets the drainage gap before rainfall arrives.`,
    evidence: [
      `Cell risk ${pct(risk.probability)} (${risk.level})`,
      `Nearest mapped drainage ${risk.cell.waterDistance} m`,
      `${risk.cell.histWaterlogging} waterlogging/drainage reports within 750 m`,
      `Elevation ${risk.cell.elevation.toFixed(0)} m · slope ${risk.cell.slope.toFixed(1)}°`,
    ],
    createdAt: daysFromNow(-(2 + (index % 6))),
    origin: 'rule_engine',
  }
}

function makeRoadAction(risk: CellRisk, index: number): PreventiveAction {
  const locality = getLocalityById(risk.cell.localityId)
  const name = locality?.name ?? 'Indore'
  const drivers = risk.factors.filter((f) => f.direction === 'increases').slice(0, 2)
  const driverText = drivers.map((d) => `${d.label.toLowerCase()} (${Math.round(d.contribution * 100)}%)`).join(' and ')
  return {
    id: `ACT-2026-R${String(index + 1).padStart(2, '0')}`,
    ref: `PA-2026-R${String(index + 1).padStart(2, '0')}`,
    cellId: risk.cell.id,
    localityId: risk.cell.localityId,
    title: `Pavement inspection — ${name}`,
    description: `Inspect the stretch in cell ${risk.cell.id} for potholes, cracking and edge failure. Rank patches by traffic exposure and schedule before the next wet spell.`,
    department: 'Roads & Bridges Department',
    priority: priorityFor(risk),
    status: STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length],
    category: 'road_deterioration',
    riskReductionPct: Math.round(6 + risk.probability * 12),
    populationBenefit: Math.round((locality?.populationEstimate ?? 30000) * (0.12 + risk.probability * 0.16)),
    estimatedCostInr: Math.round((260_000 + risk.probability * 1_400_000) / 10_000) * 10_000,
    dueDate: daysFromNow(7 + (index % 4) * 4),
    rationale: `Cell ${risk.cell.id} in ${name} has a road deterioration pressure index of ${Math.round(risk.probability * 100)}/100. ${driverText ? `The leading pressures are ${driverText}.` : ''} A pavement survey is the smallest next step before committing resurfacing funds.`,
    evidence: [
      `Deterioration index ${Math.round(risk.probability * 100)}/100`,
      `Road density ${(risk.cell.roadDensity * 100).toFixed(0)}% of cell maximum`,
      `${risk.cell.histRoadDamage} pothole/road damage reports within 750 m`,
      `Impervious proxy ${(risk.cell.impervious * 100).toFixed(0)}%`,
    ],
    createdAt: daysFromNow(-(3 + (index % 5))),
    origin: 'rule_engine',
  }
}

const waterActions = topPerLocality(waterRisks).slice(0, 9).map(makeWaterAction)
const roadActions = topPerLocality(roadRisks).slice(0, 5).map(makeRoadAction)

export const SEEDED_ACTIONS: PreventiveAction[] = [...waterActions, ...roadActions].sort((a, b) => {
  const rank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  return rank[a.priority] - rank[b.priority]
})
