/**
 * Minimal typed client for the read-only Phase 4 endpoints.
 *
 * Only the data-health page uses this today; the risk screens still run on
 * bundled data. Every call is short-lived and fails softly so an offline API
 * never blocks the rest of the demo.
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
