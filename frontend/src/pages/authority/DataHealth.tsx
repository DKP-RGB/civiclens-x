import {
  AlertTriangle,
  CloudRain,
  Database,
  ExternalLink,
  Layers,
  Loader2,
  RefreshCw,
  ServerOff,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineNote, ProvenanceBadge } from '@/components/domain/badges'
import { API_BASE_URL, API_DOCS_URL, type IngestionRun } from '@/lib/api'
import { useLiveData } from '@/lib/use-live-data'
import { cn, formatDate, formatDateTime, formatNumber, timeAgo } from '@/lib/utils'

const SOURCE_LABELS: Record<string, string> = {
  'open-meteo-archive': 'Weather archive',
  'open-meteo-forecast': 'Weather forecast',
  'osm-landuse': 'OSM landuse',
}

function SourceLabel({ source }: { source: string }) {
  return (
    <span>
      <span className="font-medium">{SOURCE_LABELS[source] ?? source}</span>
      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/70">{source}</span>
    </span>
  )
}

function RunStatus({ status }: { status: IngestionRun['status'] }) {
  if (status === 'success') return <Badge variant="success">Success</Badge>
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="warning">Running</Badge>
}

function ShareBar({ label, value, className }: { label: string; value: number | null; className?: string }) {
  const share = Math.max(0, Math.min(1, value ?? 0))
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="num font-medium">{value == null ? '—' : `${Math.round(share * 100)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full bg-primary', className)} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  )
}

function Command({ children }: { children: string }) {
  return (
    <code className="block overflow-x-auto rounded-md border border-border bg-muted/50 px-2.5 py-1.5 font-mono text-[11px] text-foreground">
      {children}
    </code>
  )
}

function SectionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-3.5 w-3.5" />
    </span>
  )
}

export function DataHealth() {
  const { status, forecast, runs, features, error, reload } = useLiveData()
  const days = forecast?.days.slice(0, 7) ?? []
  const maxRain = Math.max(1, ...days.map((day) => day.precipitationSum ?? 0))

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3 text-primary" />
            Data &amp; provenance
          </span>
        }
        title="Live data health"
        description="What the backend has actually ingested from free public sources, when it last ran, and what is still simulated. This page reads the API; the risk screens still run on bundled demo data."
        actions={
          <>
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              API docs
            </a>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={reload}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </>
        }
      />

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs',
          status === 'ready' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          status === 'offline' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          status === 'loading' && 'border-border bg-muted/40 text-muted-foreground',
        )}
      >
        {status === 'ready' ? <Wifi className="h-3.5 w-3.5" /> : null}
        {status === 'offline' ? <ServerOff className="h-3.5 w-3.5" /> : null}
        {status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        <span className="font-medium">
          {status === 'ready'
            ? 'Connected to the API'
            : status === 'offline'
              ? 'API not reachable'
              : 'Checking the API…'}
        </span>
        <span className="font-mono text-[10px] opacity-80">{API_BASE_URL}</span>
        {status === 'offline' && error ? <span className="opacity-90">· {error}</span> : null}
      </div>

      {status === 'offline' ? (
        <InlineNote tone="warning" className="mb-4">
          Start the backend and run an import to see real data here. The citizen and authority demo
          screens do not depend on this page and keep working on bundled data.
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <Command>cd backend</Command>
            <Command>python -m app.ingestion.cli all</Command>
          </div>
        </InlineNote>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <SectionIcon icon={CloudRain} />
                  7-day rainfall forecast
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {days.length > 0 ? <ProvenanceBadge kind="public_dataset" /> : null}
                  {forecast?.stale ? <Badge variant="warning">Stale</Badge> : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {forecast
                  ? `${forecast.city} · ${forecast.timezone} · fetched ${
                      forecast.lastSuccessAt ? timeAgo(forecast.lastSuccessAt) : 'unknown'
                    }`
                  : 'Open-Meteo daily forecast stored by the ingestion CLI.'}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {days.length === 0 ? (
                <EmptyState
                  icon={CloudRain}
                  title="No forecast stored yet"
                  description="Run the weather import once. The API stays online and the rest of the demo is unaffected."
                  action={<Command>python -m app.ingestion.cli weather</Command>}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Rain</TableHead>
                        <TableHead className="w-[35%]">Amount</TableHead>
                        <TableHead>Chance</TableHead>
                        <TableHead>Temperature</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatDate(day.date, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: undefined,
                            })}
                          </TableCell>
                          <TableCell className="num whitespace-nowrap">
                            {day.precipitationSum == null
                              ? '—'
                              : `${day.precipitationSum.toFixed(1)} mm`}
                          </TableCell>
                          <TableCell>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{
                                  width: `${((day.precipitationSum ?? 0) / maxRain) * 100}%`,
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="num">
                            {day.precipitationProbability == null
                              ? '—'
                              : `${day.precipitationProbability}%`}
                          </TableCell>
                          <TableCell className="num whitespace-nowrap text-muted-foreground">
                            {day.tempMin == null || day.tempMax == null
                              ? '—'
                              : `${day.tempMin.toFixed(0)}–${day.tempMax.toFixed(0)} °C`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Rainfall is real public data, but the risk scorer still applies its demo monsoon
                    scenario. Do not read a risk score as a forecast for these days.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <SectionIcon icon={Layers} />
                Ingestion runs
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                One row per import attempt. Failures stay visible with their HTTP error.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {runs.length === 0 ? (
                <EmptyState
                  icon={Database}
                  title="No import has run yet"
                  description="Each run records its source, row count, status and duration in the backend database."
                  action={<Command>python -m app.ingestion.cli all</Command>}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Finished</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="max-w-[280px]">
                          <SourceLabel source={run.source} />
                          {run.detail ? (
                            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                              {run.detail}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <RunStatus status={run.status} />
                        </TableCell>
                        <TableCell className="num">{formatNumber(run.recordsWritten)}</TableCell>
                        <TableCell
                          className="whitespace-nowrap text-xs text-muted-foreground"
                          title={run.finishedAt ? formatDateTime(run.finishedAt) : undefined}
                        >
                          {run.finishedAt ? timeAgo(run.finishedAt) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <SectionIcon icon={Layers} />
                  Land-use coverage
                </CardTitle>
                {features?.cells ? <ProvenanceBadge kind="public_dataset" /> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                OSM polygons sampled at nine points per 250 m cell.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cells sampled
                </p>
                <p className="num text-lg font-semibold">
                  {features?.cells ? formatNumber(features.cells) : '—'}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">of 1,887</span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {features?.cells
                    ? `${formatNumber(features.cellsWithBuiltUp)} contain a mapped built-up polygon`
                    : 'No landuse import stored yet'}
                </p>
              </div>
              <ShareBar label="Built-up" value={features?.meanBuiltUpShare ?? null} />
              <ShareBar label="Green" value={features?.meanGreenShare ?? null} className="bg-emerald-500" />
              <ShareBar label="Water" value={features?.meanWaterShare ?? null} className="bg-sky-500" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Shares are means across all cells, including cells with no mapped landuse. OSM coverage
                is partial, so a zero means “not mapped”, not “no buildings”.
              </p>
              {features?.fetchedAt ? (
                <p className="text-[10px] text-muted-foreground">
                  Last successful import {timeAgo(features.lastSuccessAt ?? features.fetchedAt)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <SectionIcon icon={RefreshCw} />
                Refresh the data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Command>cd backend</Command>
              <Command>python -m app.ingestion.cli weather</Command>
              <Command>python -m app.ingestion.cli landuse</Command>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Keyless and manual by design. Weather takes seconds; Overpass can take a minute and
                retries one mirror. A failed run is recorded, not hidden.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <InlineNote tone="muted" className="mt-4">
        These layers are real public data, but the risk scorer and maps still use bundled demo inputs
        until Phase 7. That separation is deliberate: it keeps a prototype score from being mistaken
        for a live forecast.
      </InlineNote>
    </>
  )
}
