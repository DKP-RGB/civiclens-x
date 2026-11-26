import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  CloudRain,
  MapPin,
  Radio,
  ShieldCheck,
  UserRound,
  Waves,
} from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { IndoreMap } from '@/components/map/IndoreMap'
import { GRID_CELLS } from '@/data/indore-grid'
import { getHorizonInputs, getWeatherSnapshot } from '@/data/weather'
import { computeCityRisks, summarizeRisks } from '@/lib/risk'
import { useLiveWeather } from '@/lib/use-live-weather'
import { useRiskSurface } from '@/lib/use-risk-surface'
import { formatNumber, pct } from '@/lib/utils'
import type { CellRisk, GridCellFeature } from '@/types'

const GRID_BY_ID = new Map<string, GridCellFeature>(GRID_CELLS.map((cell) => [cell.id, cell]))

const PORTALS = [
  {
    to: '/citizen',
    title: 'Citizen',
    line: 'Report a pothole, drain or waterlogging issue and follow it.',
    chips: ['Photo + pin', 'Track status'],
    icon: UserRound,
  },
  {
    to: '/authority',
    title: 'Authority',
    line: 'See hotspots, inspect drivers and queue prevention work.',
    chips: ['Risk map', 'Works queue'],
    icon: ShieldCheck,
  },
]

export function LandingPage() {
  const live = useLiveWeather()
  const surface = useRiskSurface()

  const snapshot = React.useMemo(() => {
    const weather = getWeatherSnapshot()
    const demo = getHorizonInputs(weather.hourly, '24h')

    // Prefer the live terrain-wetness model so this page and /city agree.
    if (surface.data) {
      const risks: CellRisk[] = surface.data.cells.map((cell) => {
        const grid = GRID_BY_ID.get(cell.cellId)
        return {
          cell:
            grid ?? {
              id: cell.cellId,
              lng: cell.lng,
              lat: cell.lat,
              localityId: cell.localityId,
              elevation: 0,
              slope: 0,
              waterDistance: 0,
              roadDensity: 0,
              impervious: cell.builtUpShare,
              histWaterlogging: 0,
              histRoadDamage: 0,
              dataCompleteness: 0,
            },
          probability: cell.probability,
          level: cell.level,
          category: 'waterlogging',
          factors: [],
          uncertainty: 0,
          dataCompleteness: 0,
        }
      })
      return {
        risks,
        inputs: {
          rain1h: surface.data.inputs.rain1h,
          rain3h: surface.data.inputs.rain3h,
          rain24h: surface.data.inputs.rain24h,
        },
        summary: surface.data.summary,
        liveModel: true,
      }
    }

    const inputs = live.data
      ? {
          rain1h: live.data.nowcastMm.next1h,
          rain3h: live.data.nowcastMm.next3h,
          rain24h: live.data.nowcastMm.next24h,
        }
      : demo
    const risks = computeCityRisks('waterlogging', inputs)
    return { risks, inputs, summary: summarizeRisks(risks), liveModel: false }
  }, [live.data, surface.data])

  const rain24 = snapshot.inputs.rain24h
  const isLive = Boolean(live.data)
  const isLiveModel = snapshot.liveModel

  return (
    <div className="theme-dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <div className="flex items-center gap-1.5">
          <Link
            to="/city"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
          >
            <Radio className="h-3.5 w-3.5" />
            Live city pulse
          </Link>
          <Link
            to="/guide"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Guide
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10px] text-muted-foreground md:inline-flex">
            <MapPin className="h-3 w-3 text-primary" />
            Indore only
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-12 pt-6">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.4rem]">
              Predicting problems.
              <br />
              <span className="text-primary">Protecting Indore.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Live rain, real terrain, block-level risk — before the complaint arrives.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/authority"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ShieldCheck className="h-4 w-4" />
                Authority console
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/citizen"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card/60 px-4 text-sm font-medium hover:bg-accent"
              >
                <UserRound className="h-4 w-4" />
                Report an issue
              </Link>
            </div>

            <div className="mt-7 grid max-w-md grid-cols-3 gap-3">
              <div>
                <p className="num text-xl font-semibold tracking-tight">{formatNumber(snapshot.summary.totalCells)}</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">grid cells</p>
              </div>
              <div>
                <p className="num text-xl font-semibold tracking-tight">{pct(snapshot.summary.meanProbability)}</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">mean risk now</p>
              </div>
              <div>
                <p className="num text-xl font-semibold tracking-tight">{rain24.toFixed(1)} mm</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">rain next 24 h</p>
              </div>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isLiveModel
                ? 'Terrain-wetness model with live Open-Meteo rain'
                : isLive
                  ? `Rain input is live from Open-Meteo · updated ${new Date(live.data!.fetchedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
                  : 'Live model unavailable · showing the demo scenario'}
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-raised">
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Waves className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium">Indore risk snapshot</p>
                    <p className="text-[10px] text-muted-foreground">Waterlogging · 250 m grid</p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    isLiveModel
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : isLive
                        ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {isLiveModel ? 'Live model' : isLive ? 'Live rain' : 'Demo rain'}
                </span>
              </div>
              <IndoreMap
                riskCells={snapshot.risks}
                theme="dark"
                height={322}
                interactive={false}
                showLegend={false}
                fitOnLoad
                layers={{ grid: true, heatmap: false, incidents: false, labels: false }}
                className="rounded-xl border-border/70"
                ariaLabel="Indore waterlogging risk snapshot"
              />
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border px-1 py-2.5">
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground">Critical</p>
                  <p className="num text-sm font-semibold">{snapshot.summary.criticalCells}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground">High</p>
                  <p className="num text-sm font-semibold">{snapshot.summary.highCells}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground">Peak 1 h</p>
                  <p className="num text-sm font-semibold">{snapshot.inputs.rain1h.toFixed(1)} mm</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CloudRain className="h-3 w-3" />
                {isLiveModel ? 'Open-Meteo + terrain model' : isLive ? 'Open-Meteo nowcast' : 'Demo monsoon scenario'}
              </span>
              <Link to="/city" className="flex items-center gap-1 text-primary hover:underline">
                Open live city pulse
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-10 grid gap-3 md:grid-cols-2" aria-label="Choose a portal">
          {PORTALS.map((portal) => (
            <Link
              key={portal.to}
              to={portal.to}
              className="group relative flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-panel transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-raised"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <portal.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold tracking-tight">{portal.title}</h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{portal.line}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {portal.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {chip === 'Track status' ? <ClipboardList className="h-2.5 w-2.5" /> : null}
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </section>

        <footer className="mt-8 flex flex-col gap-1.5 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Open data: OpenStreetMap · Copernicus DEM · Open-Meteo · Wikimedia Commons. No paid APIs, no
            map keys.
          </p>
          <p className="shrink-0">Prototype · not an operational warning system</p>
        </footer>
      </main>
    </div>
  )
}
