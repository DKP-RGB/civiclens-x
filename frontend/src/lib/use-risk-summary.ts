import * as React from 'react'
import {
  fetchRiskSummary,
  type RiskSummaryQuery,
  type RiskSummaryResponse,
} from '@/lib/api'

export type RiskSummaryStatus = 'loading' | 'api' | 'fallback'

export interface LiveRiskSummary {
  data: RiskSummaryResponse | null
  status: RiskSummaryStatus
  error: string | null
}

const TIMEOUT_MS = 5000

/**
 * Fetches the backend risk summary for the same rainfall inputs the page uses
 * locally. If the API is slow or offline, the caller keeps the bundled scorer
 * result and the status becomes "fallback" instead of showing a spinner.
 */
export function useRiskSummary(query: RiskSummaryQuery): LiveRiskSummary {
  const [state, setState] = React.useState<LiveRiskSummary>({
    data: null,
    status: 'loading',
    error: null,
  })

  const { category, rain1h, rain3h, rain24h } = query

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    let active = true

    fetchRiskSummary({ category, rain1h, rain3h, rain24h }, controller.signal)
      .then((data) => {
        if (active) setState({ data, status: 'api', error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message =
          error instanceof Error
            ? error.name === 'AbortError'
              ? `The API did not answer within ${TIMEOUT_MS / 1000} seconds.`
              : error.message
            : 'The API could not be reached.'
        setState({ data: null, status: 'fallback', error: message })
      })
      .finally(() => window.clearTimeout(timer))

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [category, rain1h, rain3h, rain24h])

  return state
}
