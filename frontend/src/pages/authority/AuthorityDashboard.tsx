import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  ClipboardList,
  CloudRain,
  Crosshair,
  Droplets,
  Gauge,
  MapPinned,
  ShieldAlert,
  Waves,
  Wrench,
} from 'lucide-react'
import type { CellRisk } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetBody } from '@/components/ui/dialog'
import { StatCard } from '@/components/domain/stat-card'
import { RiskBadge, InlineNote, ProvenanceBadge, ComplaintStatusBadge } from '@/components/domain/badges'
import { RiskDistribution } from '@/components/domain/risk-distribution'
import { CellRiskPanel } from '@/components/domain/cell-risk-panel'
import { IndoreMap } from '@/components/map/IndoreMap'
import { RainfallChart } from '@/components/charts/rainfall-chart'
import { INCIDENTS } from '@/data/incidents'
import { LOCALITIES } from '@/data/localities'
import { MODEL_INFO } from '@/data/model'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import {
  computeCityRisks,
  getLocalityRiskSummaries,
  getTopRiskCells,
  summarizeRisks,
} from '@/lib/risk'
import { cityBrief } from '@/lib/explain'
import { useAppStore } from '@/store/app-store'
import { formatNumber, pct, timeAgo } from '@/lib/utils'

export function AuthorityDashboard() {
  const { complaints, actions } = useAppStore()
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
  const summary = React.useMemo(() => summarizeRisks(risks), [risks])
  const localities = React.useMemo(() => getLocalityRiskSummaries(risks), [risks])
  const topCells = React.useMemo(() => getTopRiskCells(risks, 6), [risks])

  const openComplaints = complaints.filter((complaint) => complaint.status !== 'resolved')
  const urgentComplaints = openComplaints.filter(
    (complaint) => complaint.priority === 'urgent' || complaint.priority === 'high',
  )
  const pendingActions = actions.filter((action) => action.status !== 'completed')
  const exposedPopulation = React.useMemo(() => {
    const cellPop = new Map<string, number>()
    for (const item of localities) {
      const perCell = item.locality.populationEstimate / Math.max(1, item.cellCount)
      for (const risk of risks) {
        if (risk.cell.localityId === item.locality.id && risk.level !== 'low') {
          cellPop.set(risk.cell.id, perCell)
        }
      }
    }
    return Math.round([...cellPop.values()].reduce((acc, value) => acc + value, 0))
  }, [localities, risks])

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3 text-primary" />
              Authority console
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span>Next 24 hours</span>
            <ProvenanceBadge kind="simulated" label="Demo scenario" />
          </>
        }
        title="Indore risk overview"
        description="A city-wide view of predicted waterlogging risk, open complaints and preventive work. Every number is traceable to its source layer."
        actions={
          <>
            <Link
              to="/authority/risk-map"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              <MapPinned className="h-3.5 w-3.5" />
              Risk map
            </Link>
            <Link to="/authority/predictions" className={buttonVariants({ size: 'sm', className: 'gap-1.5' })}>
              <Crosshair className="h-3.5 w-3.5" />
              Explore predictions
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mean city risk"
          value={pct(summary.meanProbability)}
          icon={Gauge}
          accent="warning"
          trendLabel="24 h horizon"
          hint="Illustrative scorer"
        />
        <StatCard
          label="Critical cells"
          value={formatNumber(summary.criticalCells)}
          icon={AlertTriangle}
          accent="danger"
          hint={`${formatNumber(summary.highCells)} high · of ${formatNumber(summary.totalCells)}`}
        />
        <StatCard
          label="People in at-risk cells"
          value={formatNumber(exposedPopulation)}
          icon={Waves}
          accent="warning"
          hint="Simulated population estimate"
        />
        <StatCard
          label="Open complaints"
          value={formatNumber(openComplaints.length)}
          icon={ClipboardList}
          hint={`${urgentComplaints.length} high or urgent priority`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr] xl:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">City risk surface</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Waterlogging probability · {horizon.rain24h.toFixed(0)} mm simulated rain in 24 h
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <ProvenanceBadge kind="model_output" label="Scored" />
                <ProvenanceBadge kind="simulated" label="Weather" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <IndoreMap
                riskCells={risks}
                incidents={INCIDENTS}
                localities={LOCALITIES}
                theme="dark"
                height={430}
                layers={{ grid: true, heatmap: true, incidents: true, labels: true }}
                onSelectCell={(cellId) => {
                  const next = risks.find((risk) => risk.cell.id === cellId)
                  if (next) setSelectedRisk(next)
                }}
                ariaLabel="Indore city-wide waterlogging risk surface"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                <span>Click any cell to open its factor breakdown.</span>
                <span>{formatNumber(summary.totalCells)} cells · 250 m resolution</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Risk distribution</CardTitle>
                <p className="text-xs text-muted-foreground">Cells by classification</p>
              </CardHeader>
              <CardContent>
                <RiskDistribution summary={summary} />
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    {cityBrief(
                      summary.meanProbability,
                      summary.criticalCells,
                      summary.highCells,
                      horizon.rain24h,
                      'the next 24 hours',
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Rain ahead</CardTitle>
                  <p className="text-xs text-muted-foreground">Simulated monsoon spell</p>
                </div>
                <ProvenanceBadge kind="simulated" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="num text-2xl font-semibold tracking-tight">
                      {horizon.rain24h.toFixed(0)} mm
                    </p>
                    <p className="text-2xs text-muted-foreground">next 24 h total</p>
                  </div>
                  <div className="text-right text-2xs text-muted-foreground">
                    <p className="flex items-center justify-end gap-1">
                      <CloudRain className="h-3 w-3" />
                      Peak {horizon.rain1h.toFixed(1)} mm/h
                    </p>
                    <p className="mt-0.5 flex items-center justify-end gap-1">
                      <Droplets className="h-3 w-3" />
                      3 h max {horizon.rain3h.toFixed(0)} mm
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <RainfallChart hours={weather.hourly} height={132} hoursToShow={48} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Localities by risk</CardTitle>
                <p className="text-xs text-muted-foreground">Mean probability per locality</p>
              </div>
              <Link
                to="/authority/risk-map"
                className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
              >
                Map
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {localities.slice(0, 7).map((item, index) => (
                <div
                  key={item.locality.id}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/40"
                >
                  <span className="num w-4 text-[10px] text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{item.locality.name}</p>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, item.meanProbability * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="num w-9 text-right text-2xs font-medium">
                    {pct(item.meanProbability)}
                  </span>
                  <RiskBadge level={item.level} showDot={false} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Priority cells</CardTitle>
              <p className="text-xs text-muted-foreground">Highest predicted probability right now</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {topCells.map((risk) => (
                <button
                  key={risk.cell.id}
                  type="button"
                  onClick={() => setSelectedRisk(risk)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {LOCALITIES.find((item) => item.id === risk.cell.localityId)?.name ?? 'Indore'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Cell {risk.cell.id} · {risk.cell.elevation.toFixed(0)} m
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="num text-xs font-semibold">{pct(risk.probability)}</span>
                    <RiskBadge level={risk.level} showDot={false} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Recent complaints</CardTitle>
                <p className="text-xs text-muted-foreground">Open reports needing triage</p>
              </div>
              <Link
                to="/authority/complaints"
                className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
              >
                All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {openComplaints.slice(0, 5).map((complaint) => (
                <Link
                  key={complaint.id}
                  to={`/authority/complaints/${complaint.id}`}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/40"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{complaint.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {complaint.ref} · {timeAgo(complaint.createdAt)}
                    </p>
                  </div>
                  <ComplaintStatusBadge status={complaint.status} />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Preventive pipeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                {pendingActions.length} actions open · rule-based queue
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => {
                const count = pendingActions.filter((action) => action.priority === priority).length
                return (
                  <div key={priority} className="flex items-center justify-between gap-2 text-xs">
                    <span className="capitalize text-muted-foreground">{priority}</span>
                    <span className="num font-medium">{count}</span>
                  </div>
                )
              })}
              <Link
                to="/authority/actions"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-1 w-full gap-1.5' })}
              >
                <Wrench className="h-3.5 w-3.5" />
                Open action centre
              </Link>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                Model status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-medium">{MODEL_INFO.name}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">{MODEL_INFO.algorithm}</p>
              <InlineNote tone="warning" className="mt-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {MODEL_INFO.status}. No accuracy metrics are claimed until a trained, validated model
                exists.
              </InlineNote>
              <Link
                to="/authority/predictions"
                className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
              >
                <Building2 className="h-3 w-3" />
                Inspect model context
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={Boolean(selectedRisk)} onOpenChange={(open) => !open && setSelectedRisk(null)}>
        <SheetBody>
          {selectedRisk ? <CellRiskPanel risk={selectedRisk} horizonLabel="Next 24 hours" /> : null}
        </SheetBody>
      </Sheet>
    </>
  )
}
