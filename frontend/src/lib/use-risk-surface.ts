import * as React from 'react'
import { fetchRiskSurface, type RiskSurface } from '@/lib/api'

export interface RiskSurfaceState {
  data: RiskSurface | null
  status: 'loading' | 'live' | 'offline'
  reload: () => void
}

const TIMEOUT_MS = 15000

/** Live terrain-wetness surface from the API, with a soft offline state. */
export function useRiskSurface(): RiskSurfaceState {
  const [nonce, setNonce] = React.useState(0)
  const [state, setState] = React.useState<Omit<RiskSurfaceState, 'reload'>>({
    data: null,
    status: 'loading',
  })

  React.useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    let active = true

    fetchRiskSurface(controller.signal)
      .then((data) => {
        if (active) setState({ data, status: 'live' })
      })
      .catch(() => {
        if (active) setState({ data: null, status: 'offline' })
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
