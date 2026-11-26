import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Construction,
  Droplets,
  ExternalLink,
  Gauge,
  ImageIcon,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Waves,
  Wind,
  Wrench,
} from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LOCALITIES } from '@/data/localities'
import { useCityPulse } from '@/lib/use-city-pulse'
import { cn, formatDate, pct, timeAgo } from '@/lib/utils'
import type { CityProject, LiveWeather, SurfaceCell } from '@/lib/api'

const LOCALITY_NAME = new Map(LOCALITIES.map((item) => [item.id, item.name]))

const LEVEL_TONE: Record<SurfaceCell['level'], string> = {
  low: 'bg-emerald-500',
  moderate: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

const STATUS_LABEL: Record<CityProject['status'], string> = {
  operational: 'Open',
  under_construction: 'Under construction',
  planned: 'Planned',
  approved: 'Approved',
}

const STATUS_TONE: Record<CityProject['status'], string> = {
  operational: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  under_construction: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  planned: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  approved: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
}

function weatherGroup(code: number | null): string {
  if (code == null) return 'cloud'
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 95) return 'storm'
  if (code >= 51) return 'rain'
  return 'partly'
}

const WEATHER_ICONS: Record<string, typeof Cloud> = {
  clear: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  storm: CloudLightning,
  rain: CloudRain,
}

function WeatherGlyph({ code, className }: { code: number | null; className?: string }) {
  const Icon = WEATHER_ICONS[weatherGroup(code)] ?? Cloud
  return <Icon className={className} aria-hidden="true" />
}

function weatherLabel(code: number | null) {
  if (code == null) return 'Conditions unavailable'
  if (code === 0) return 'Clear sky'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 95) return 'Thunderstorm'
  if (code >= 80) return 'Rain showers'
  if (code >= 61) return 'Rain'
  if (code >= 51) return 'Drizzle'
  return 'Cloudy'
}

function Stat({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string
  value: string
  unit?: string
  icon: typeof Droplets
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="num mt-1 text-xl font-semibold leading-none">
        {value}
        {unit ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  )
}

function RainBars({ hourly }: { hourly: LiveWeather['hourly'] }) {
  const max = Math.max(0, ...hourly.map((hour) => hour.precipitation))
  if (max < 0.1) {
    return (
      <div>
        <div className="relative flex h-24 items-end gap-[3px] rounded-lg bg-muted/10">
          <div className="absolute inset-x-0 bottom-2 border-t border-dashed border-border" />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
            No rain expected in the next 24 hours
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>now</span>
          <span>+6h</span>
          <span>+12h</span>
          <span>+18h</span>
          <span>+24h</span>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]">
        {hourly.map((hour, index) => (
          <div
            key={hour.time ?? index}
            className="group relative flex-1 rounded-t bg-sky-500/70 transition-colors hover:bg-sky-400"
            style={{ height: `${Math.max(3, (hour.precipitation / max) * 100)}%` }}
            title={`${hour.time ?? ''} · ${hour.precipitation.toFixed(1)} mm`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>now</span>
        <span>+6h</span>
        <span>+12h</span>
        <span>+18h</span>
        <span>+24h</span>
      </div>
    </div>
  )
}

function Ring({ value }: { value: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(2, value * circumference)} ${circumference}`}
          className="stroke-primary"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-xl font-semibold">{pct(value)}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">mean</span>
      </div>
    </div>
  )
}

function Hotspot({ cell, rank }: { cell: SurfaceCell; rank: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="num w-4 text-[10px] text-muted-foreground">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-medium">
            {LOCALITY_NAME.get(cell.localityId) ?? cell.localityId}
          </span>
          <span className="num text-xs font-semibold">{pct(cell.probability)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', LEVEL_TONE[cell.level])}
            style={{ width: `${Math.max(4, cell.probability * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function CityPulse() {
  const { weather, surface, works, photos, loading, errors, reload } = useCityPulse()
  const hotspots = surface?.topCells.slice(0, 5) ?? []
  const topLocality = hotspots[0] ? LOCALITY_NAME.get(hotspots[0].localityId) : null
  const dry = (weather?.nowcastMm.next24h ?? 0) < 0.1
  const projects = works?.projects ?? []
  const sites = works?.sites ?? []

  return (
    <div className="theme-dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10px] text-muted-foreground sm:inline-flex">
              <MapPin className="h-3 w-3 text-primary" />
              Indore · live
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/guide"
              className="hidden rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              Guide
            </Link>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={reload} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link to="/" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Portals
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-5">
        {errors.length > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
            <Gauge className="h-3.5 w-3.5" />
            {errors.join(' · ')}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live now
                </p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="num text-6xl font-semibold leading-none tracking-tight">
                    {weather?.current.temperature == null ? '—' : Math.round(weather.current.temperature)}
                  </span>
                  <span className="mb-1 text-2xl text-muted-foreground">°C</span>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <WeatherGlyph code={weather?.current.weatherCode ?? null} className="h-4 w-4 text-primary" />
                    {weatherLabel(weather?.current.weatherCode ?? null)}
                  </div>
                </div>
              </div>
              <Badge variant={weather ? 'success' : loading ? 'outline' : 'warning'}>
                {weather ? 'Open-Meteo' : loading ? 'Connecting' : 'Offline'}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Feels {weather?.current.humidity == null ? '—' : `${Math.round(weather.current.humidity)}% humidity`}
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                {weather?.current.wind == null ? '—' : `${Math.round(weather.current.wind)} km/h`}
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {weather?.current.precipitation == null ? '—' : `${weather.current.precipitation.toFixed(1)} mm now`}
              </span>
              {weather ? <span>updated {timeAgo(weather.fetchedAt)}</span> : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Next 1 h" value={(weather?.nowcastMm.next1h ?? 0).toFixed(1)} unit="mm" icon={Droplets} />
              <Stat label="Next 3 h" value={(weather?.nowcastMm.next3h ?? 0).toFixed(1)} unit="mm" icon={CloudRain} />
              <Stat label="Next 24 h" value={(weather?.nowcastMm.next24h ?? 0).toFixed(1)} unit="mm" icon={Waves} />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Hourly rainfall forecast</span>
                <span>{dry ? 'Dry for 24 h' : 'mm per hour'}</span>
              </div>
              {weather ? (
                <RainBars hourly={weather.hourly} />
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground">
                  {loading ? 'Loading the live forecast…' : 'Start the API to load the live forecast'}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Waterlogging risk now</h2>
                <p className="text-[10px] text-muted-foreground">
                  Terrain wetness + real land use +{' '}
                  {surface?.inputs.source === 'open-meteo-live' ? 'live rain' : 'demo rain'}
                </p>
              </div>
              <Badge variant={surface?.model.validated ? 'success' : 'outline'} title={surface?.model.note}>
                {surface?.model.trained ? 'Trained' : 'Physical model'}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <Ring value={surface?.summary.meanProbability ?? 0} />
              <div className="grid flex-1 grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Critical</p>
                  <p className="num text-sm font-semibold text-red-400">{surface?.summary.criticalCells ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">High</p>
                  <p className="num text-sm font-semibold text-orange-400">{surface?.summary.highCells ?? '—'}</p>
                </div>
                <div className="col-span-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Rain input</p>
                  <p className="num text-xs font-medium">
                    {(surface?.inputs.rain1h ?? 0).toFixed(1)} / {(surface?.inputs.rain3h ?? 0).toFixed(1)} /{' '}
                    {(surface?.inputs.rain24h ?? 0).toFixed(1)} mm
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">1 / 3 / 24 h</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <p className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Top hotspots</span>
                <span>{topLocality ? `near ${topLocality}` : ''}</span>
              </p>
              {hotspots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                  {loading ? 'Loading the risk surface…' : 'Risk surface unavailable'}
                </p>
              ) : (
                hotspots.map((cell, index) => <Hotspot key={cell.cellId} cell={cell} rank={index + 1} />)
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-panel">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Construction className="h-4 w-4 text-primary" />
                Works across Indore
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Sourced projects · mapped OSM construction sites · as of {works?.asOf ?? (loading ? 'loading' : '—')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {works?.siteCount ?? 0} mapped sites
              </span>
              {works?.lastIngestedAt ? <span>OSM check {timeAgo(works.lastIngestedAt)}</span> : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
            {projects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground md:col-span-2">
                {loading ? 'Loading sourced projects…' : 'No sourced projects available'}
              </p>
            ) : null}
            {projects.map((project) => (
              <a
                key={project.id}
                href={project.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-border bg-muted/15 p-3 transition-colors hover:border-primary/40 hover:bg-muted/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{project.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      {project.area}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium', STATUS_TONE[project.status])}>
                    {STATUS_LABEL[project.status]}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted-foreground">
                    {project.opened
                      ? `Opened ${formatDate(project.opened, { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : project.expectedCompletion
                        ? `Target ${formatDate(project.expectedCompletion, { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : project.targetWindow
                          ? project.targetWindow
                          : 'No completion date published'}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    {project.sourceName}
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-border bg-muted/10 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Wrench className="h-3 w-3" />
                Mapped construction sites
              </p>
              {works ? (
                <span className="text-[9px] text-muted-foreground">OpenStreetMap · ODbL</span>
              ) : null}
            </div>
            {sites.length === 0 ? (
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                {loading ? (
                  'Loading the mapped construction layer…'
                ) : (
                  <>
                    No construction sites stored yet. Run{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">python -m app.ingestion.cli works</code>{' '}
                    to load the live OpenStreetMap layer.
                  </>
                )}
              </p>
            ) : (
              <div className="mt-1.5 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {sites.slice(0, 6).map((site) => (
                  <a
                    key={site.osmId}
                    href={`https://www.openstreetmap.org/${site.osmId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-[10px] hover:bg-accent"
                  >
                    <span className="truncate">{site.name ?? `${site.kind} under construction`}</span>
                    <span className="shrink-0 capitalize text-muted-foreground">{site.kind}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-panel">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon className="h-4 w-4 text-primary" />
                {photos?.scope === 'city' ? 'Real Indore street photos' : `Real photos near ${topLocality ?? 'central Indore'}`}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {photos?.scope === 'city'
                  ? 'No relevant photos are geotagged at the top hotspot — showing licensed Indore street photos instead'
                  : 'Licensed place photographs taken near the top hotspot, from Wikimedia Commons'}
              </p>
            </div>
            {photos?.photos[0] ? (
              <a
                href={photos.photos[0].pageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                View on Commons
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>

          {photos && photos.photos.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {photos.photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted"
                  title={`${photo.title} · ${photo.author} · ${photo.license}`}
                >
                  <img
                    src={photo.thumbUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-[8px] leading-tight text-white">
                    <span className="block truncate">{photo.author}</span>
                    <span className="block truncate opacity-70">{photo.license}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
              {loading ? 'Loading licensed photos…' : 'No licensed photos found near this point.'}
            </p>
          )}
        </section>

        <footer className="flex flex-col gap-1.5 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Live rain and temperature: Open-Meteo. Photos: Wikimedia Commons (licence per image).
            Construction: OpenStreetMap contributors, ODbL. Project dates: cited sources only.
          </p>
          <p className="shrink-0">
            Risk index is physically based and <span className="font-medium text-foreground">not validated</span> — no
            verified Indore flood labels exist yet.
          </p>
        </footer>
      </main>
    </div>
  )
}
