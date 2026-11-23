import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  CloudRain,
  Database,
  MapPin,
  ShieldCheck,
  UserRound,
  Waves,
  Wrench,
} from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { IndoreMap } from '@/components/map/IndoreMap'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import { computeCityRisks, summarizeRisks } from '@/lib/risk'
import { formatNumber, pct } from '@/lib/utils'

const CITIZEN_POINTS = [
  'Report potholes, waterlogging, garbage or drainage issues',
  'Attach a photo and pin the exact location on the map',
  'Track status and see AI-style risk context for your area',
]

const AUTHORITY_POINTS = [
  'City-wide 250 m risk grid with rainfall and terrain drivers',
  'Prediction explorer with contributing factors and uncertainty',
  'What-if simulator and rule-based preventive action queue',
]

const STEPS = [
  { title: 'Observe', text: 'Rainfall, terrain, roads, drainage proxies and incident history.' },
  { title: 'Predict', text: 'A 24–72 h waterlogging and road-deterioration risk surface.' },
  { title: 'Prioritise', text: 'Rank cells and inspections by probability, severity and impact.' },
  { title: 'Prevent', text: 'Turn the ranking into department-owned preventive actions.' },
]

export function LandingPage() {
  const snapshot = React.useMemo(() => {
    const weather = getWeatherSnapshot()
    const horizon = getHorizonInputs(weather.hourly, '24h')
    const risks = computeCityRisks('waterlogging', {
      rain1h: horizon.rain1h,
      rain3h: horizon.rain3h,
      rain24h: horizon.rain24h,
    })
    return { weather, horizon, risks, summary: summarizeRisks(risks) }
  }, [])

  return (
    <div className="theme-dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <div className="flex items-center gap-2">
          <Link
            to="/guide"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
          >
            <BookOpen className="h-3.5 w-3.5" />
            How it works
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10px] text-muted-foreground sm:inline-flex">
            <MapPin className="h-3 w-3 text-primary" />
            Indore · Madhya Pradesh
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Prototype
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-2xs text-muted-foreground">
              <Waves className="h-3.5 w-3.5 text-primary" />
              Indore Urban Intelligence · prediction before complaint
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.4rem]">
              Predicting Problems.
              <br />
              <span className="text-primary">Protecting Indore.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              CivicLens X turns rainfall, elevation, drainage proximity, road density and incident history
              into block-level waterlogging and road-deterioration risk — so the city can act before the
              complaint arrives.
            </p>

            <div className="mt-7 grid max-w-md grid-cols-3 gap-3">
              <div>
                <p className="num text-xl font-semibold tracking-tight">
                  {formatNumber(snapshot.summary.totalCells)}
                </p>
                <p className="mt-0.5 text-2xs text-muted-foreground">250 m grid cells</p>
              </div>
              <div>
                <p className="num text-xl font-semibold tracking-tight">{pct(snapshot.summary.meanProbability)}</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">demo city risk · 24 h</p>
              </div>
              <div>
                <p className="num text-xl font-semibold tracking-tight">{snapshot.horizon.rain24h.toFixed(0)} mm</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">simulated 24 h rain</p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/authority"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ShieldCheck className="h-4 w-4" />
                Enter authority console
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/citizen"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <UserRound className="h-4 w-4" />
                Report as a citizen
              </Link>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Demo access only. No login, no personal data collection. Indore is the only supported city.
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
                    <p className="text-[10px] text-muted-foreground">Waterlogging · next 24 h</p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Simulated
                </span>
              </div>
              <IndoreMap
                riskCells={snapshot.risks}
                theme="dark"
                height={322}
                interactive={false}
                showLegend={false}
                fitOnLoad
                layers={{ grid: false, heatmap: true, incidents: false, labels: false }}
                className="rounded-xl border-border/70"
                ariaLabel="Indore waterlogging risk snapshot"
              />
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border px-1 py-2.5">
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground">Critical cells</p>
                  <p className="num text-sm font-semibold">{snapshot.summary.criticalCells}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground">High risk</p>
                  <p className="num text-sm font-semibold">{snapshot.summary.highCells}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-muted-foreground">Peak 1 h</p>
                  <p className="num text-sm font-semibold">{snapshot.horizon.rain1h.toFixed(1)} mm</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CloudRain className="h-3 w-3" />
                Demo monsoon scenario · not a live warning
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                OSM + DEM
              </span>
            </div>
          </div>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-2" aria-label="Choose a portal">
          <Link
            to="/citizen"
            className="theme-light group relative flex flex-col rounded-2xl border border-slate-200 bg-card p-5 text-card-foreground shadow-panel transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-raised"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                Public access
              </span>
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Citizen portal</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Report a civic issue, follow its status, and understand the risk in your own locality.
            </p>
            <ul className="mt-4 space-y-2">
              {CITIZEN_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              Enter citizen portal
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            to="/authority"
            className="theme-dark group relative flex flex-col overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 text-card-foreground shadow-panel transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-raised"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Authority console
              </span>
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Authority portal</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Explore predicted hotspots, inspect drivers, simulate rainfall scenarios and manage prevention.
            </p>
            <ul className="mt-4 space-y-2">
              {AUTHORITY_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-foreground/90">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              Enter authority console
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </section>

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Not sure which portal to use?</span> The guide
            explains the risk score, the map colours and the data labels in plain language.
          </p>
          <Link
            to="/guide"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read the 2-minute guide
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-2xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                How it works
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight">
                Prediction before complaint, not automation after complaint.
              </h2>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Wrench className="h-3 w-3" />
              Built for Indore&apos;s 250 m analysis grid
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative">
                <span className="num text-2xs font-medium text-primary/80">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 text-sm font-medium">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border pt-5 text-[10px] leading-relaxed text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl">
            Real layers: OSM Indore boundary, major roads and mapped waterways (ODbL); Copernicus DEM
            sampled through Open-Meteo. Simulated layers: incidents, weather scenario, municipal assets and
            the illustrative risk score. No paid APIs or map keys are used.
          </p>
          <p className="shrink-0 text-right">
            CivicLens X · Indore Urban Intelligence
            <br />
            Prototype · not an operational warning system
          </p>
        </footer>
      </main>
    </div>
  )
}
