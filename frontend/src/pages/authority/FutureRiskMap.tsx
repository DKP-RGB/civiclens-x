import * as React from 'react'
import { Layers, MapPinned, RefreshCw, Waves, Construction, Info } from 'lucide-react'
import type { CellRisk, RiskCategory } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetBody } from '@/components/ui/dialog'
import { InlineNote, ProvenanceBadge, RiskBadge } from '@/components/domain/badges'
import { CellRiskPanel } from '@/components/domain/cell-risk-panel'
import { RiskDistribution } from '@/components/domain/risk-distribution'
import { IndoreMap } from '@/components/map/IndoreMap'
import { INCIDENTS } from '@/data/incidents'
import { LOCALITIES } from '@/data/localities'
import {
  getWeatherSnapshot,
  getHorizonInputs,
  HORIZON_LABEL,
  type Horizon,
} from '@/data/weather'
import {
  computeCityRisks,
  getLocalityRiskSummaries,
  getTopRiskCells,
  summarizeRisks,
} from '@/lib/risk'
import { riskLevelFromProbability } from '@/lib/status'
import { cn, formatNumber, pct } from '@/lib/utils'

const HORIZONS: Horizon[] = ['now', '24h', '72h']

export function FutureRiskMap() {
  const [horizon, setHorizon] = React.useState<Horizon>('24h')
  const [category, setCategory] = React.useState<RiskCategory>('waterlogging')
  const [localityFilter, setLocalityFilter] = React.useState<string>('all')
  const [selectedRisk, setSelectedRisk] = React.useState<CellRisk | null>(null)
  const [layers, setLayers] = React.useState({
    grid: true,
    heatmap: true,
    incidents: true,
    labels: true,
  })

  const weather = React.useMemo(() => getWeatherSnapshot(), [])
  const inputs = React.useMemo(() => getHorizonInputs(weather.hourly, horizon), [weather, horizon])

  const risks = React.useMemo(
    () =>
      computeCityRisks(category, {
        rain1h: inputs.rain1h,
        rain3h: inputs.rain3h,
        rain24h: inputs.rain24h,
      }),
    [category, inputs],
  )
  const summary = React.useMemo(() => summarizeRisks(risks), [risks])
  const localities = React.useMemo(() => getLocalityRiskSummaries(risks), [risks])

  const displayRisks = React.useMemo(() => {
    if (localityFilter === 'all') return risks
    return risks.map((risk) =>
      risk.cell.localityId === localityFilter
        ? risk
        : {
            ...risk,
            probability: risk.probability * 0.25,
            level: riskLevelFromProbability(risk.probability * 0.25),
          },
    )
  }, [risks, localityFilter])

  const topCells = React.useMemo(() => getTopRiskCells(risks, 10), [risks])
  const focus = React.useMemo(() => {
    if (localityFilter === 'all') return null
    const locality = LOCALITIES.find((item) => item.id === localityFilter)
    return locality ? { ...locality.centroid, zoom: 13.4 } : null
  }, [localityFilter])

  const horizonLabel = HORIZON_LABEL[horizon]

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <MapPinned className="h-3 w-3 text-primary" />
              Future risk map
            </span>
            <ProvenanceBadge kind="model_output" label="Scored" />
            <ProvenanceBadge kind="simulated" label="Weather" />
          </>
        }
        title="Predicted risk surface"
        description="Switch horizon, risk type and map layers. Select a cell to see the drivers, uncertainty and suggested next steps."
        actions={
          <>
            <Select
              value={horizon}
              onChange={(event) => setHorizon(event.target.value as Horizon)}
              aria-label="Forecast horizon"
              className="w-[180px]"
            >
              {HORIZONS.map((item) => (
                <option key={item} value={item}>
                  {HORIZON_LABEL[item]}
                </option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value as RiskCategory)}
              aria-label="Risk type"
              className="w-[190px]"
            >
              <option value="waterlogging">Waterlogging risk</option>
              <option value="road_deterioration">Road deterioration</option>
            </Select>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            Mean probability
          </p>
          <p className="num mt-2 text-[26px] font-semibold leading-none">{pct(summary.meanProbability)}</p>
          <p className="mt-2 text-2xs text-muted-foreground">{horizonLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            Critical cells
          </p>
          <p className="num mt-2 text-[26px] font-semibold leading-none">
            {formatNumber(summary.criticalCells)}
          </p>
          <p className="mt-2 text-2xs text-muted-foreground">
            {formatNumber(summary.highCells)} high · {formatNumber(summary.totalCells)} total
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            Forecast rain
          </p>
          <p className="num mt-2 text-[26px] font-semibold leading-none">
            {inputs.rain24h.toFixed(0)} mm
          </p>
          <p className="mt-2 text-2xs text-muted-foreground">
            peak {inputs.rain1h.toFixed(1)} mm/h
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            Localities affected
          </p>
          <p className="num mt-2 text-[26px] font-semibold leading-none">
            {localities.filter((item) => item.level !== 'low').length}
          </p>
          <p className="mt-2 text-2xs text-muted-foreground">moderate or above</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px] xl:items-start">
        <Card>
          <CardContent className="p-3">
            <IndoreMap
              riskCells={displayRisks}
              incidents={layers.incidents ? INCIDENTS : []}
              localities={LOCALITIES}
              theme="dark"
              height={600}
              layers={layers}
              selectedCellId={selectedRisk?.cell.id}
              onSelectCell={(cellId) => {
                const next = risks.find((risk) => risk.cell.id === cellId)
                if (next) setSelectedRisk(next)
              }}
              focus={focus}
              legendLabel={category === 'waterlogging' ? 'Waterlogging risk' : 'Road deterioration'}
              ariaLabel={`${category === 'waterlogging' ? 'Waterlogging' : 'Road deterioration'} risk map`}
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Map layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(
                [
                  ['grid', '250 m risk grid'],
                  ['heatmap', 'Risk heatmap'],
                  ['incidents', 'Simulated incidents'],
                  ['labels', 'Locality labels'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs">{label}</span>
                  <Switch
                    checked={layers[key]}
                    onCheckedChange={(checked) => setLayers((current) => ({ ...current, [key]: checked }))}
                    label={label}
                  />
                </div>
              ))}
              <div className="border-t border-border pt-2.5">
                <label htmlFor="locality-filter" className="text-2xs font-medium text-muted-foreground">
                  Focus locality
                </label>
                <Select
                  id="locality-filter"
                  value={localityFilter}
                  onChange={(event) => setLocalityFilter(event.target.value)}
                  className="mt-1.5"
                >
                  <option value="all">All Indore</option>
                  {[...LOCALITIES]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  setHorizon('24h')
                  setCategory('waterlogging')
                  setLocalityFilter('all')
                  setLayers({ grid: true, heatmap: true, incidents: true, labels: true })
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset view
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskDistribution summary={summary} compact />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5">
                {category === 'waterlogging' ? (
                  <Waves className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Construction className="h-3.5 w-3.5 text-primary" />
                )}
                Top cells
              </CardTitle>
              <p className="text-xs text-muted-foreground">{horizonLabel}</p>
            </CardHeader>
            <CardContent className="max-h-[300px] space-y-1 overflow-y-auto">
              {topCells.map((risk) => {
                const locality = LOCALITIES.find((item) => item.id === risk.cell.localityId)
                return (
                  <button
                    key={risk.cell.id}
                    type="button"
                    onClick={() => setSelectedRisk(risk)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                      selectedRisk?.cell.id === risk.cell.id ? 'bg-primary/10' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{locality?.name ?? 'Indore'}</p>
                      <p className="text-[10px] text-muted-foreground">Cell {risk.cell.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="num text-xs font-semibold">{pct(risk.probability)}</span>
                      <RiskBadge level={risk.level} showDot={false} />
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <InlineNote>
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Weather is a simulated scenario. Terrain, roads and drainage distance come from public
            datasets. Risk scores are illustrative, not a validated forecast.
          </InlineNote>
        </div>
      </div>

      <Sheet open={Boolean(selectedRisk)} onOpenChange={(open) => !open && setSelectedRisk(null)}>
        <SheetBody>
          {selectedRisk ? <CellRiskPanel risk={selectedRisk} horizonLabel={horizonLabel} /> : null}
        </SheetBody>
      </Sheet>
    </>
  )
}
