import type { CellRisk, RiskCategory, RiskSummary } from '@/types'

/**
 * Minimal typed client for the read-only Phase 4 endpoints.
 *
 * The Data health page and the authority overview use this; the other risk
 * screens still run on bundled data. Every call is short-lived and fails softly
 * so an offline API never blocks the rest of the demo.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/+$/, '')

export const API_DOCS_URL = API_BASE_URL.replace(/\/api\/v1$/, '/docs')

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface DailyWeather {
  date: string
  precipitationSum: number | null
  rainSum: number | null
  precipitationProbability: number | null
  precipitationHours: number | null
  tempMax: number | null
  tempMin: number | null
  windMax: number | null
  source: string
  fetchedAt: string
}

export interface ForecastResponse {
  city: string
  timezone: string
  provenance: 'public_dataset'
  days: DailyWeather[]
  stale: boolean
  staleHours: number
  lastSuccessAt: string | null
}

export type IngestionStatus = 'running' | 'success' | 'failed'

export interface IngestionRun {
  id: string
  source: string
  status: IngestionStatus
  startedAt: string
  finishedAt: string | null
  recordsWritten: number
  detail: string | null
}

export interface FeatureSummary {
  cells: number
  cellsWithBuiltUp: number
  meanBuiltUpShare: number | null
  meanGreenShare: number | null
  meanWaterShare: number | null
  samplesPerCell: number | null
  source: string | null
  fetchedAt: string | null
  lastSuccessAt: string | null
}

export interface RiskInputs {
  rain1h: number
  rain3h: number
  rain24h: number
}

export interface RiskSummaryResponse {
  category: RiskCategory
  inputs: RiskInputs
  summary: RiskSummary
  topCells: CellRisk[]
}

export interface RiskSummaryQuery {
  category?: RiskCategory
  rain1h: number
  rain3h: number
  rain24h: number
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new ApiError(`Request failed with HTTP ${response.status}`, response.status)
  }
  return (await response.json()) as T
}

export function fetchForecast(signal?: AbortSignal) {
  return getJson<ForecastResponse>('/weather/forecast', signal)
}

export function fetchIngestionRuns(limit = 8, signal?: AbortSignal) {
  return getJson<IngestionRun[]>(`/ingestion/runs?limit=${limit}`, signal)
}

export function fetchFeatureSummary(signal?: AbortSignal) {
  return getJson<FeatureSummary>('/ingestion/features/summary', signal)
}

export function fetchRiskSummary(query: RiskSummaryQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    category: query.category ?? 'waterlogging',
    rain1h: query.rain1h.toFixed(2),
    rain3h: query.rain3h.toFixed(2),
    rain24h: query.rain24h.toFixed(2),
  })
  return getJson<RiskSummaryResponse>(`/risk/summary?${params.toString()}`, signal)
}
