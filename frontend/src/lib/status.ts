import type {
  ActionStatus,
  AssetCondition,
  AssetType,
  ComplaintStatus,
  DataProvenance,
  IncidentCategory,
  Priority,
  RiskCategory,
  RiskLevel,
} from '@/types'

export const CATEGORY_META: Record<
  IncidentCategory,
  { label: string; short: string; description: string }
> = {
  potholes: {
    label: 'Potholes',
    short: 'Pothole',
    description: 'Road surface cavities that can damage vehicles and trap water.',
  },
  waterlogging: {
    label: 'Waterlogging',
    short: 'Waterlogging',
    description: 'Standing water after rain, often caused by blocked or undersized drains.',
  },
  garbage: {
    label: 'Garbage',
    short: 'Garbage',
    description: 'Uncollected waste or illegal dumping that can block drains.',
  },
  drainage: {
    label: 'Drainage',
    short: 'Drainage',
    description: 'Blocked, broken or missing stormwater drains and culverts.',
  },
  road_damage: {
    label: 'Road damage',
    short: 'Road damage',
    description: 'Cracks, subsidence or broken surfaces beyond potholes.',
  },
  other: {
    label: 'Other',
    short: 'Other',
    description: 'Any other civic infrastructure issue.',
  },
}

export const RISK_CATEGORY_META: Record<
  RiskCategory,
  { label: string; short: string; unit: string }
> = {
  waterlogging: {
    label: 'Waterlogging risk',
    short: 'Waterlogging',
    unit: 'probability of standing water within 24 h',
  },
  road_deterioration: {
    label: 'Road deterioration risk',
    short: 'Road deterioration',
    unit: 'relative deterioration pressure',
  },
}

export const RISK_LEVEL_META: Record<
  RiskLevel,
  { label: string; className: string; dot: string; hex: string; range: string }
> = {
  low: {
    label: 'Low',
    className: 'bg-risk-low/10 text-risk-low border-risk-low/25',
    dot: 'bg-risk-low',
    hex: '#16a34a',
    range: '0–25%',
  },
  moderate: {
    label: 'Moderate',
    className: 'bg-risk-moderate/10 text-risk-moderate border-risk-moderate/30',
    dot: 'bg-risk-moderate',
    hex: '#d97706',
    range: '25–50%',
  },
  high: {
    label: 'High',
    className: 'bg-risk-high/10 text-risk-high border-risk-high/30',
    dot: 'bg-risk-high',
    hex: '#ea580c',
    range: '50–70%',
  },
  critical: {
    label: 'Critical',
    className: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30',
    dot: 'bg-risk-critical',
    hex: '#dc2626',
    range: '70–100%',
  },
}

export const COMPLAINT_STATUS_META: Record<
  ComplaintStatus,
  { label: string; className: string; order: number }
> = {
  submitted: {
    label: 'Submitted',
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400',
    order: 0,
  },
  under_review: {
    label: 'Under review',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
    order: 1,
  },
  inspection_scheduled: {
    label: 'Inspection scheduled',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400',
    order: 2,
  },
  in_progress: {
    label: 'Work in progress',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400',
    order: 3,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
    order: 4,
  },
}

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground border-border' },
  medium: { label: 'Medium', className: 'bg-sky-500/10 text-sky-600 border-sky-500/25' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
}

export const ACTION_STATUS_META: Record<ActionStatus, { label: string; className: string }> = {
  proposed: { label: 'Proposed', className: 'bg-amber-500/10 text-amber-600 border-amber-500/25' },
  approved: { label: 'Approved', className: 'bg-sky-500/10 text-sky-600 border-sky-500/25' },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/25',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
  },
}

export const ASSET_TYPE_META: Record<AssetType, { label: string }> = {
  stormwater_drain: { label: 'Stormwater drain' },
  pumping_station: { label: 'Pumping station' },
  road_segment: { label: 'Road segment' },
  culvert: { label: 'Culvert' },
  retention_pond: { label: 'Retention pond' },
}

export const ASSET_CONDITION_META: Record<
  AssetCondition,
  { label: string; className: string }
> = {
  good: { label: 'Good', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' },
  fair: { label: 'Fair', className: 'bg-amber-500/10 text-amber-600 border-amber-500/25' },
  poor: { label: 'Poor', className: 'bg-orange-500/10 text-orange-600 border-orange-500/25' },
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
}

export const PROVENANCE_META: Record<
  DataProvenance,
  { label: string; short: string; className: string; note: string }
> = {
  verified: {
    label: 'Verified',
    short: 'Verified',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
    note: 'Verified against an authoritative or field-confirmed source.',
  },
  public_dataset: {
    label: 'Public dataset',
    short: 'Public data',
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/25',
    note: 'Derived from an open public dataset (OSM, Copernicus, Open-Meteo).',
  },
  simulated: {
    label: 'Simulated',
    short: 'Simulated',
    className: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    note: 'Demonstration data created for this prototype. Not a real municipal record.',
  },
  model_output: {
    label: 'Model output',
    short: 'Model',
    className: 'bg-violet-500/10 text-violet-600 border-violet-500/25',
    note: 'Produced by a model or scoring rule, not directly observed.',
  },
}

export const DEPARTMENTS = [
  'Stormwater & Drainage Cell',
  'Roads & Bridges Department',
  'Solid Waste Management',
  'Traffic & Transport',
  'Indore Municipal Corporation — Zone Office',
] as const

export function riskLevelFromProbability(probability: number): RiskLevel {
  if (probability >= 0.7) return 'critical'
  if (probability >= 0.5) return 'high'
  if (probability >= 0.25) return 'moderate'
  return 'low'
}
