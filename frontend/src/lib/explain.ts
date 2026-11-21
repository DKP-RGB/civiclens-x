import type { CellRisk, Complaint } from '@/types'
import type { LocalityRiskSummary } from '@/lib/risk'
import { getLocalityById } from '@/lib/risk'
import { pct } from '@/lib/utils'

// Rule-based narrative layer for Phase 2. It only restates values that already
// exist in the risk object — it does not invent locations, incidents or model
// outputs. Phase 3/6 swaps this for Gemini with the same structured input.

export function explainCell(risk: CellRisk, horizonLabel: string): string {
  const locality = getLocalityById(risk.cell.localityId)
  const name = locality?.name ?? 'this locality'
  const isWater = risk.category === 'waterlogging'
  const headline = isWater
    ? `${name} cell ${risk.cell.id} is estimated at ${pct(risk.probability)} waterlogging probability for ${horizonLabel.toLowerCase()}.`
    : `${name} cell ${risk.cell.id} has a road deterioration pressure index of ${Math.round(risk.probability * 100)}/100.`

  const drivers = risk.factors
    .filter((f) => f.direction === 'increases')
    .slice(0, 3)
    .map((f) => `${f.label.toLowerCase()} (${Math.round(f.contribution * 100)}%)`)
  const driverText = drivers.length
    ? ` The largest contributors are ${drivers.join(', ')}.`
    : ''

  const reduce = risk.factors.find((f) => f.direction === 'reduces')
  const reduceText = reduce
    ? ` ${reduce.label} (${reduce.detail}) partially offsets the score.`
    : ''

  const uncertaintyText = ` Uncertainty is ±${(risk.uncertainty * 100).toFixed(0)} percentage points; municipal drain condition and asset data are not yet connected (data completeness ${Math.round(risk.dataCompleteness * 100)}%).`

  return `${headline}${driverText}${reduceText}${uncertaintyText}`
}

export function explainLocality(summary: LocalityRiskSummary, horizonLabel: string): string {
  const { locality } = summary
  const level = summary.level
  const cells = summary.cellCount
  return `${locality.name} averages ${pct(summary.meanProbability)} waterlogging risk across ${cells} grid cells for ${horizonLabel.toLowerCase()}, with a peak of ${pct(summary.maxProbability)} in cell ${summary.topCell.cell.id}. The locality is classified ${level.toUpperCase()} in the current demo scenario. Locality weights are simulated; terrain, road and drainage features are derived from public datasets.`
}

export function recommendationsFor(risk: CellRisk): string[] {
  const keys = new Set(risk.factors.map((f) => f.key))
  const recommendations: string[] = []
  if (risk.category === 'waterlogging') {
    if (keys.has('drainage')) {
      recommendations.push('Inspect and desilt the nearest stormwater drain before the forecast peak.')
    }
    if (keys.has('rain24') || keys.has('rain3')) {
      recommendations.push('Pre-position pumps and barricades; issue a locality-level standing-water advisory.')
    }
    if (keys.has('elevation')) {
      recommendations.push('Check low-lying pockets and clear roadside inlet gratings.')
    }
    if (keys.has('history')) {
      recommendations.push('Review repeat incident reports within 750 m to identify the recurring choke point.')
    }
    if (keys.has('impervious')) {
      recommendations.push('Identify small retention or infiltration opportunities in the built-up pocket.')
    }
  } else {
    recommendations.push('Schedule a pavement condition survey and rank patches by traffic exposure.')
    if (keys.has('drainage')) {
      recommendations.push('Clear side drains so water does not pond at the pavement edge.')
    }
    if (keys.has('history')) {
      recommendations.push('Inspect the recurring pothole cluster and check sub-base moisture.')
    }
    recommendations.push('Log the segment for longitudinal monitoring before resurfacing decisions.')
  }
  recommendations.push('Record the inspection outcome so the next prediction can use verified condition data.')
  return recommendations.slice(0, 4)
}

export function complaintSummary(complaint: Complaint, risk?: CellRisk): string {
  const locality = getLocalityById(complaint.localityId)
  const base = `${complaint.title} reported at ${complaint.address}${locality ? `, ${locality.name}` : ''}.`
  if (!risk) return `${base} The linked grid cell is awaiting risk calculation.`
  const isWater = complaint.category === 'waterlogging' || complaint.category === 'drainage'
  const context = isWater
    ? `The linked cell ${risk.cell.id} currently carries ${pct(risk.probability)} waterlogging risk for the next 24 hours.`
    : `The linked cell ${risk.cell.id} carries a road deterioration pressure index of ${Math.round(risk.probability * 100)}/100.`
  return `${base} ${context} This summary is rule-based; Gemini narrative generation is enabled after backend integration.`
}

export function cityBrief(
  meanProbability: number,
  criticalCells: number,
  highCells: number,
  totalRain: number,
  horizonLabel: string,
): string {
  return `Across Indore's 250 m analysis grid, the average waterlogging probability is ${pct(meanProbability)} for ${horizonLabel.toLowerCase()}, with ${criticalCells} critical and ${highCells} high-risk cells under ${totalRain.toFixed(0)} mm of forecast rainfall. The pattern is driven by low elevation, impervious cover, drainage gaps and repeat incident history. This is a prototype scenario, not an operational warning.`
}
