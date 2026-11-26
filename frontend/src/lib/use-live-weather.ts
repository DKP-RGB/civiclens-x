import * as React from 'react'
import { fetchLiveWeather, type LiveWeather } from '@/lib/api'

export type LiveWeatherStatus = 'loading' | 'live' | 'offline'

export interface LiveWeatherState {
  data: LiveWeather | null
  status: LiveWeatherStatus
  error: string | null
  reload: () => void
}

const TIMEOUT_MS = 8000

/** Live Open-Meteo conditions for Indore, with a soft offline state. */
export function useLiveWeather(): LiveWeatherState {
  const [nonce, setNonce] = React.useState(0)
  const [state, setState] = React.useState<Omit<LiveWeatherState, 'reload'>>({
    data: null,
    status: 'loading',
    error: null,
  })

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    let active = true

    fetchLiveWeather(controller.signal)
      .then((data) => {
        if (active) setState({ data, status: 'live', error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message =
          error instanceof Error
            ? error.name === 'AbortError'
              ? 'The weather service did not answer in time.'
              : error.message
            : 'The weather service could not be reached.'
        setState({ data: null, status: 'offline', error: message })
      })
      .finally(() => window.clearTimeout(timer))

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [nonce])

  return { ...state, reload: () => setNonce((value) => value + 1) }
}
