import type { DailyWeather, HourlyWeather, WeatherSnapshot } from '@/types'
import { clamp } from '@/lib/utils'

// Phase 2 demo weather: a deterministic monsoon spell anchored to "now" so the
// forecast always looks live. Clearly labelled simulated in the UI. Phase 3
// replaces this with the Open-Meteo backend integration.

export const WEATHER_SCENARIO_NOTE =
  'Simulated monsoon spell for the CivicLens X demo. Live Open-Meteo forecast replaces this in Phase 3/9.'

function startOfHour(date = new Date()) {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d
}

function buildHourly(): HourlyWeather[] {
  const start = startOfHour()
  const hours: HourlyWeather[] = []
  for (let h = 0; h < 72; h++) {
    const time = new Date(start.getTime() + h * 3_600_000)
    const primary = 10.2 * Math.exp(-((h - 14) ** 2) / (2 * 3.8 ** 2))
    const secondary = 4.4 * Math.exp(-((h - 34) ** 2) / (2 * 4.5 ** 2))
    const texture = 0.86 + 0.28 * Math.abs(Math.sin(h * 1.7 + 0.4))
    const rainfallMm = Math.max(0, Number(((primary + secondary) * texture).toFixed(1)))
    const temperatureC = Number(
      (23.4 + 3.1 * Math.sin(((h - 9) / 24) * Math.PI * 2) - rainfallMm * 0.12).toFixed(1),
    )
    const humidity = Math.round(
      clamp(73 + rainfallMm * 1.3 + 5 * Math.sin(((h - 6) / 24) * Math.PI * 2), 56, 97),
    )
    const probability = Math.round(clamp(18 + rainfallMm * 6.4, 10, 96))
    hours.push({
      time: time.toISOString(),
      rainfallMm,
      probability,
      temperatureC,
      humidity,
    })
  }
  return hours
}

function sum(hours: HourlyWeather[], from: number, count: number) {
  return hours.slice(from, from + count).reduce((acc, h) => acc + h.rainfallMm, 0)
}

function maxRolling(hours: HourlyWeather[], window: number, limit = hours.length) {
  let best = 0
  for (let i = 0; i < Math.min(limit, hours.length); i++) {
    const value = sum(hours, i, Math.min(window, limit - i))
    if (value > best) best = value
  }
  return best
}

export interface HorizonInputs {
  rain1h: number
  rain3h: number
  rain24h: number
  totalRain: number
  peakIntensity: number
}

export type Horizon = 'now' | '24h' | '72h'

export const HORIZON_LABEL: Record<Horizon, string> = {
  now: 'Current conditions',
  '24h': 'Next 24 hours',
  '72h': 'Next 72 hours',
}

export function getHorizonInputs(hours: HourlyWeather[], horizon: Horizon): HorizonInputs {
  if (horizon === 'now') {
    return {
      rain1h: 1.4,
      rain3h: 4.2,
      rain24h: 18,
      totalRain: 18,
      peakIntensity: 2.1,
    }
  }
  const limit = horizon === '24h' ? 24 : 72
  return {
    rain1h: maxRolling(hours, 1, limit),
    rain3h: maxRolling(hours, 3, limit),
    rain24h: sum(hours, 0, Math.min(24, limit)),
    totalRain: sum(hours, 0, limit),
    peakIntensity: Math.max(...hours.slice(0, limit).map((h) => h.rainfallMm)),
  }
}

function buildDaily(hours: HourlyWeather[]): DailyWeather[] {
  const daily: DailyWeather[] = []
  const start = startOfHour()
  for (let day = 0; day < 7; day++) {
    const dayStart = new Date(start)
    dayStart.setDate(dayStart.getDate() + day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const dayHours = hours.filter((h) => {
      const t = new Date(h.time)
      return t >= dayStart && t < dayEnd
    })
    let rainfallMm = dayHours.reduce((acc, h) => acc + h.rainfallMm, 0)
    if (day >= 3) rainfallMm = [18, 7, 2, 0][day - 3] ?? 0
    const temps = dayHours.map((h) => h.temperatureC)
    daily.push({
      date: dayStart.toISOString(),
      rainfallMm: Number(rainfallMm.toFixed(1)),
      maxTempC: temps.length ? Math.max(...temps) : 27.5 - day * 0.2,
      minTempC: temps.length ? Math.min(...temps) : 18.4 - day * 0.1,
      probability: Math.round(clamp(20 + rainfallMm * 1.8, 8, 95)),
    })
  }
  return daily
}

export function getWeatherSnapshot(): WeatherSnapshot {
  const hourly = buildHourly()
  const next24 = sum(hourly, 0, 24)
  return {
    current: {
      temperatureC: 24.6,
      humidity: 82,
      windKph: 13,
      condition: next24 > 60 ? 'Overcast · rain likely' : 'Partly cloudy',
      rainfallLast24hMm: 18,
      observedAt: new Date().toISOString(),
    },
    hourly,
    daily: buildDaily(hourly),
    scenario: {
      label: 'Demo monsoon spell',
      provenance: 'simulated',
      note: WEATHER_SCENARIO_NOTE,
    },
  }
}
