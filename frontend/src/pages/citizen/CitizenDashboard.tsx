import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  CloudRain,
  Droplets,
  MapPin,
  Plus,
  Sparkles,
  Thermometer,
  Wind,
} from 'lucide-react'
import type { CellRisk } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Sheet, SheetBody } from '@/components/ui/dialog'
import { RiskBadge, ComplaintStatusBadge, InlineNote } from '@/components/domain/badges'
import { RiskGauge } from '@/components/domain/risk-gauge'
import { CellRiskPanel } from '@/components/domain/cell-risk-panel'
import { RainfallChart } from '@/components/charts/rainfall-chart'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import { LOCALITIES } from '@/data/localities'
import {
  computeCityRisks,
  getLocalityRiskSummaries,
  getLocalityById,
} from '@/lib/risk'
import { explainLocality } from '@/lib/explain'
import { useAppStore, DEMO_CITIZEN_NAME } from '@/store/app-store'
import { formatDate, pct, timeAgo } from '@/lib/utils'

export function CitizenDashboard() {
  const { complaints } = useAppStore()
  const [localityId, setLocalityId] = React.useState('vijay-nagar')
  const [selectedRisk, setSelectedRisk] = React.useState<CellRisk | null>(null)

  const weather = React.useMemo(() => getWeatherSnapshot(), [])
  const horizon = React.useMemo(() => getHorizonInputs(weather.hourly, '24h'), [weather])
  const risks = React.useMemo(
    () =>
      computeCityRisks('waterlogging', {
        rain1h: horizon.rain1h,
        rain3h: horizon.rain3h,
        rain24h: horizon.rain24h,
      }),
    [horizon],
  )
  const summaries = React.useMemo(() => getLocalityRiskSummaries(risks), [risks])
  const summary =
    summaries.find((item) => item.locality.id === localityId) ??
    summaries.find((item) => item.locality.id === 'vijay-nagar') ??
    summaries[0]
  const locality = getLocalityById(localityId) ?? summary.locality
  const localCells = React.useMemo(
    () =>
      risks
        .filter((risk) => risk.cell.localityId === summary.locality.id)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3),
    [risks, summary.locality.id],
  )
  const myComplaints = complaints.filter((complaint) => complaint.citizenName === DEMO_CITIZEN_NAME)
  const activeComplaints = myComplaints.filter((complaint) => complaint.status !== 'resolved').slice(0, 3)
  const firstName = DEMO_CITIZEN_NAME.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-primary" />
              Indore · citizen portal
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span>{formatDate(new Date().toISOString())}</span>
          </>
        }
        title={`${greeting}, ${firstName}.`}
        description="Here is the predicted waterlogging picture for your locality over the next 24 hours, plus the issues you have already reported."
        actions={
          <>
            <Select
              value={localityId}
              onChange={(event) => setLocalityId(event.target.value)}
              aria-label="Choose locality"
              className="w-[190px]"
            >
              {[...LOCALITIES]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
            <Link
              to="/citizen/report"
              className={buttonVariants({ size: 'sm', className: 'gap-1.5' })}
            >
              <Plus className="h-3.5 w-3.5" />
              Report an issue
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
            <div>
              <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                Your locality · next 24 h
              </p>
              <CardTitle className="mt-1 text-base">{locality.name}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {summary.cellCount} grid cells · peak {pct(summary.maxProbability)}
              </p>
            </div>
            <RiskBadge level={summary.level} />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <RiskGauge
                value={summary.meanProbability}
                level={summary.level}
                size={126}
                label="Waterlogging risk"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {explainLocality(summary, 'the next 24 hours')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    to="/citizen/risk"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Open locality risk map
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <span className="text-2xs text-muted-foreground">
                    · {horizon.rain24h.toFixed(0)} mm simulated rain
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {localCells.map((risk) => (
                <button
                  key={risk.cell.id}
                  type="button"
                  onClick={() => setSelectedRisk(risk)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">Cell {risk.cell.id}</p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {risk.factors[0]?.label ?? 'Risk drivers'} · {risk.level}
                    </p>
                  </div>
                  <span className="num text-sm font-semibold">{pct(risk.probability)}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>
                Risk values come from an illustrative frontend scorer, not a trained ML model. The trained
                waterlogging model and Gemini explanations arrive in later phases.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Rain ahead</CardTitle>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Simulated
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Demo monsoon spell · next 48 hours</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="num text-3xl font-semibold tracking-tight">
                  {weather.current.temperatureC.toFixed(0)}°
                </p>
                <p className="text-xs text-muted-foreground">{weather.current.condition}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-2xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {weather.current.humidity}% humidity
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  {weather.current.windKph} km/h
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  24 h rain {weather.current.rainfallLast24hMm} mm
                </span>
                <span className="flex items-center gap-1">
                  <CloudRain className="h-3 w-3" />
                  Peak {horizon.rain1h.toFixed(1)} mm/h
                </span>
              </div>
            </div>
            <div className="mt-3">
              <RainfallChart hours={weather.hourly} height={150} hoursToShow={48} />
            </div>
            <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
              <span>Next 24 h total</span>
              <span className="num font-medium text-foreground">{horizon.rain24h.toFixed(0)} mm</span>
            </div>
            <InlineNote className="mt-3">
              <CloudRain className="mt-0.5 h-3 w-3 shrink-0" />
              Live Open-Meteo forecast is connected in Phase 3/9. This demo uses a clearly labelled
              simulated scenario.
            </InlineNote>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Your active complaints</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeComplaints.length
                  ? `${activeComplaints.length} open · updates are visible in this browser`
                  : 'No open complaints right now'}
              </p>
            </div>
            <Link
              to="/citizen/complaints"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {activeComplaints.length ? (
              <div className="divide-y divide-border">
                {activeComplaints.map((complaint) => (
                  <Link
                    key={complaint.id}
                    to={`/citizen/complaints/${complaint.id}`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{complaint.title}</p>
                      <p className="truncate text-2xs text-muted-foreground">
                        {complaint.ref} · {complaint.address} · {timeAgo(complaint.createdAt)}
                      </p>
                    </div>
                    <ComplaintStatusBadge status={complaint.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">
                  No active complaints. If something needs attention, report it with a photo and map pin.
                </p>
                <Link
                  to="/citizen/report"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-3 gap-1.5' })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Report an issue
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle>See something in your area?</CardTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A photo and an exact map pin help the authority verify the issue faster. Your report is linked
              to the same 250 m grid used for prediction.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              to="/citizen/report"
              className={buttonVariants({ className: 'w-full gap-1.5' })}
            >
              <Plus className="h-3.5 w-3.5" />
              Report an issue
            </Link>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Demo data is stored locally in this browser.
            </p>
          </CardContent>
        </Card>
      </div>

      <Sheet open={Boolean(selectedRisk)} onOpenChange={(open) => !open && setSelectedRisk(null)}>
        <SheetBody>{selectedRisk ? <CellRiskPanel risk={selectedRisk} horizonLabel="Next 24 hours" /> : null}</SheetBody>
      </Sheet>
    </>
  )
}
