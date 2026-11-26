import * as React from 'react'
import {
  fetchCityWorks,
  fetchLiveWeather,
  fetchNearbyPhotos,
  fetchRiskSurface,
  type CityWorks,
  type LiveWeather,
  type NearbyPhotos,
  type RiskSurface,
} from '@/lib/api'

export interface CityPulse {
  weather: LiveWeather | null
  surface: RiskSurface | null
  works: CityWorks | null
  photos: NearbyPhotos | null
  loading: boolean
  errors: string[]
  reload: () => void
}

const TIMEOUT_MS = 12000

/**
 * One parallel read of every live layer the city page needs. Each source fails
 * independently, so a flaky photo or works service never blanks the page.
 */
export function useCityPulse(): CityPulse {
  const [nonce, setNonce] = React.useState(0)
  const [state, setState] = React.useState<Omit<CityPulse, 'reload'>>({
    weather: null,
    surface: null,
    works: null,
    photos: null,
    loading: true,
    errors: [],
  })

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    let active = true

    const run = async () => {
      const [weather, surface, works] = await Promise.allSettled([
        fetchLiveWeather(controller.signal),
        fetchRiskSurface(controller.signal),
        fetchCityWorks(controller.signal),
      ])

      const surfaceData = surface.status === 'fulfilled' ? surface.value : null
      const hotspot = surfaceData?.topCells[0]
      const photos = await fetchNearbyPhotos(
        hotspot?.lat ?? 22.7186,
        hotspot?.lng ?? 75.8552,
        1500,
        6,
        controller.signal,
      ).catch(() => null)

      if (!active) return
      const errors: string[] = []
      if (weather.status === 'rejected') errors.push('Live weather unavailable')
      if (surface.status === 'rejected') errors.push('Risk surface unavailable')
      if (works.status === 'rejected') errors.push('Works layer unavailable')
      if (!photos) errors.push('Nearby photos unavailable')

      setState({
        weather: weather.status === 'fulfilled' ? weather.value : null,
        surface: surfaceData,
        works: works.status === 'fulfilled' ? works.value : null,
        photos,
        loading: false,
        errors,
      })
    }

    void run().finally(() => window.clearTimeout(timer))

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [nonce])

  return { ...state, reload: () => setNonce((value) => value + 1) }
}
