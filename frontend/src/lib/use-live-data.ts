import * as React from 'react'
import {
  fetchFeatureSummary,
  fetchForecast,
  fetchIngestionRuns,
  type FeatureSummary,
  type ForecastResponse,
  type IngestionRun,
} from '@/lib/api'

export type LiveDataStatus = 'loading' | 'ready' | 'offline'

export interface LiveData {
  status: LiveDataStatus
  forecast: ForecastResponse | null
  runs: IngestionRun[]
  features: FeatureSummary | null
  error: string | null
  reload: () => void
}

const TIMEOUT_MS = 6000

/**
 * Read-only fetch of the ingested public data. All three requests run in
 * parallel and share one abort signal, so a stopped backend resolves quickly
 * to an "offline" state instead of hanging the page.
 */
export function useLiveData(): LiveData {
  const [nonce, setNonce] = React.useState(0)
  const [state, setState] = React.useState<Omit<LiveData, 'reload'>>({
    status: 'loading',
    forecast: null,
    runs: [],
    features: null,
    error: null,
  })

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    let active = true

    Promise.all([
      fetchForecast(controller.signal),
      fetchIngestionRuns(8, controller.signal),
      fetchFeatureSummary(controller.signal),
    ])
      .then(([forecast, runs, features]) => {
        if (!active) return
        setState({ status: 'ready', forecast, runs, features, error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message =
          error instanceof Error
            ? error.name === 'AbortError'
              ? `The API did not answer within ${TIMEOUT_MS / 1000} seconds.`
              : error.message
            : 'The API could not be reached.'
        setState({ status: 'offline', forecast: null, runs: [], features: null, error: message })
      })
      .finally(() => window.clearTimeout(timer))

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [nonce])

  return {
    ...state,
    reload: () => {
      setState((current) => ({ ...current, status: 'loading', error: null }))
      setNonce((value) => value + 1)
    },
  }
}
