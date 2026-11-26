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

export interface LiveWeather {
  city: string
  timezone: string
  provenance: 'public_dataset'
  source: string
  fetchedAt: string
  current: {
    time: string | null
    temperature: number | null
    humidity: number | null
    precipitation: number | null
    rain: number | null
    weatherCode: number | null
    wind: number | null
  }
  nowcastMm: { next1h: number; next3h: number; next24h: number }
  hourly: Array<{ time: string | null; precipitation: number; probability: number | null }>
  stale: boolean
  cacheSeconds: number
}

export interface CommonsPhoto {
  id: string
  title: string
  author: string
  license: string
  licenseUrl: string
  pageUrl: string
  imageUrl: string
  thumbUrl: string
  width: number
  height: number
}

export interface NearbyPhotos {
  lat: number
  lng: number
  radius: number
  scope: 'nearby' | 'city'
  provenance: 'public_dataset'
  source: string
  fetchedAt: string
  note: string
  photos: CommonsPhoto[]
}

export type ProjectStatus = 'operational' | 'under_construction' | 'planned' | 'approved'

export interface CityProject {
  id: string
  name: string
  category: string
  status: ProjectStatus
  area: string
  summary: string
  started: string | null
  opened: string | null
  expectedCompletion: string | null
  targetWindow?: string
  sourceName: string
  sourceUrl: string
  asOf: string
}

export interface ConstructionSite {
  osmId: string
  kind: string
  name: string | null
  lat: number
  lng: number
  tags: Record<string, string>
}

export interface CityWorks {
  asOf: string
  notes: string
  provenance: 'public_dataset'
  projects: CityProject[]
  sites: ConstructionSite[]
  siteCount: number
  lastIngestedAt: string | null
  sources: Array<{ name: string; url: string; license: string }>
}

export interface SurfaceCell {
  cellId: string
  lng: number
  lat: number
  localityId: string
  probability: number
  level: 'low' | 'moderate' | 'high' | 'critical'
  wetness: number
  builtUpShare: number
  builtUpSource: 'osm_landuse' | 'simulated_proxy'
  rainFactor: number
}

export interface RiskSurface {
  model: {
    id: string
    name: string
    kind: string
    trained: boolean
    validated: boolean
    note: string
  }
  inputs: { rain1h: number; rain3h: number; rain24h: number; source: string }
  summary: {
    meanProbability: number
    counts: Record<'low' | 'moderate' | 'high' | 'critical', number>
    criticalCells: number
    highCells: number
    totalCells: number
    cellsWithMeasuredBuiltUp: number
  }
  topCells: SurfaceCell[]
  cells: SurfaceCell[]
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

export function fetchLiveWeather(signal?: AbortSignal) {
  return getJson<LiveWeather>('/live/weather', signal)
}

export function fetchRiskSurface(signal?: AbortSignal) {
  return getJson<RiskSurface>('/risk/surface', signal)
}

export function fetchCityWorks(signal?: AbortSignal) {
  return getJson<CityWorks>('/city/works', signal)
}

export function fetchNearbyPhotos(
  lat: number,
  lng: number,
  radius = 1500,
  limit = 6,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    lat: lat.toFixed(5),
    lng: lng.toFixed(5),
    radius: String(radius),
    limit: String(limit),
  })
  return getJson<NearbyPhotos>(`/media/nearby?${params.toString()}`, signal)
}
