import * as React from 'react'
import { ArrowUpRight, CloudRain, Info, Layers, MapPin, Search, Waves } from 'lucide-react'
import type { CellRisk } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Sheet, SheetBody } from '@/components/ui/dialog'
import { InlineNote, RiskBadge } from '@/components/domain/badges'
import { CellRiskPanel } from '@/components/domain/cell-risk-panel'
import { RiskGauge } from '@/components/domain/risk-gauge'
import { RiskDistribution } from '@/components/domain/risk-distribution'
import { IndoreMap } from '@/components/map/IndoreMap'
import { RainfallChart, DailyRainfallChart } from '@/components/charts/rainfall-chart'
import { RiskTrendChart } from '@/components/charts/risk-trend-chart'
import { LOCALITIES } from '@/data/localities'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import {
  computeCityRisks,
  getLocalityRiskSummaries,
  summarizeRisks,
} from '@/lib/risk'
import { explainLocality } from '@/lib/explain'
import { riskLevelFromProbability } from '@/lib/status'
import { cn, pct } from '@/lib/utils'

export function LocalityRisk() {
  const [localityId, setLocalityId] = React.useState('vijay-nagar')
  const [selectedRisk, setSelectedRisk] = React.useState<CellRisk | null>(null)
  const [query, setQuery] = React.useState('')

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
    summaries.find((item) => item.locality.id === localityId) ?? summaries[0]

  const localRisks = React.useMemo(
    () =>
      risks
        .filter((risk) => risk.cell.localityId === summary.locality.id)
        .sort((a, b) => b.probability - a.probability),
    [risks, summary.locality.id],
  )
  const localSummary = React.useMemo(() => summarizeRisks(localRisks), [localRisks])

  const trend = React.useMemo(() => {
    const labels = ['Now', '+12 h', '+24 h', '+48 h', '+72 h']
    const rainSteps = [
      { rain24h: 18, rain3h: 4, rain1h: 1.5 },
      {
        rain24h: horizon.rain24h * 0.7,
        rain3h: horizon.rain3h * 0.7,
        rain1h: horizon.rain1h * 0.7,
      },
      { rain24h: horizon.rain24h, rain3h: horizon.rain3h, rain1h: horizon.rain1h },
      {
        rain24h: horizon.rain24h * 0.75,
        rain3h: horizon.rain3h * 0.8,
        rain1h: horizon.rain1h * 0.8,
      },
      {
        rain24h: horizon.rain24h * 0.4,
        rain3h: horizon.rain3h * 0.4,
        rain1h: horizon.rain1h * 0.4,
      },
    ]
    return labels.map((label, index) => {
      const step = rainSteps[index]
      const stepRisks = localRisks.map((risk) => {
        const z =
          Math.log(Math.max(risk.probability, 0.01) / (1 - Math.min(risk.probability, 0.99))) +
          (step.rain24h - horizon.rain24h) * 0.012
        return 1 / (1 + Math.exp(-z))
      })
      const mean = stepRisks.reduce((acc, value) => acc + value, 0) / (stepRisks.length || 1)
      return {
        label,
        waterlogging: Math.round(mean * 1000) / 10,
        road: Math.round(Math.min(96, mean * 100 * 0.82 + 6) * 10) / 10,
      }
    })
  }, [localRisks, horizon])

  const filteredLocalities = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = term
      ? LOCALITIES.filter((item) => item.name.toLowerCase().includes(term))
      : [...LOCALITIES]
    return list.sort((a, b) => {
      const rankA = summaries.findIndex((s) => s.locality.id === a.id)
      const rankB = summaries.findIndex((s) => s.locality.id === b.id)
      return rankA - rankB
    })
  }, [query, summaries])

  const mapRisks = React.useMemo(() => {
    const local = new Set(localRisks.map((risk) => risk.cell.id))
    return risks.map((risk) =>
      local.has(risk.cell.id)
        ? risk
        : {
            ...risk,
            probability: risk.probability * 0.35,
            level: riskLevelFromProbability(risk.probability * 0.35),
          }
    )
  }, [risks, localRisks])

  return (
    <>
      <PageHeader
        eyebrow="Citizen portal · locality risk"
        title="Risk in your locality"
        description="Explore the predicted waterlogging risk for the next 24 hours, cell by cell. Pick a locality, then select any 250 m cell to see what is driving its score."
        actions={
          <Select
            value={localityId}
            onChange={(event) => setLocalityId(event.target.value)}
            aria-label="Choose locality"
            className="w-[210px]"
          >
            {[...LOCALITIES]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div>
                <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                  {summary.locality.name} · next 24 h
                </p>
                <CardTitle className="mt-1 text-base">Waterlogging risk map</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {summary.cellCount} cells · click any cell for the factor breakdown
                </p>
              </div>
              <RiskBadge level={summary.level} />
            </CardHeader>
            <CardContent className="pb-3">
              <IndoreMap
                theme="light"
                height={400}
                riskCells={mapRisks}
                localities={LOCALITIES}
                layers={{ grid: true, heatmap: true, incidents: false, labels: true }}
                selectedCellId={selectedRisk?.cell.id}
                onSelectCell={(cellId) => {
                  const next = risks.find((risk) => risk.cell.id === cellId)
                  if (next) setSelectedRisk(next)
                }}
                focus={{
                  ...summary.locality.centroid,
                  zoom: 13.6,
                }}
                ariaLabel={`Waterlogging risk map for ${summary.locality.name}`}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3" />
                  Locality cells shown at full risk; rest of Indore dimmed
                </span>
                <span className="flex items-center gap-1.5">
                  <CloudRain className="h-3 w-3" />
                  {horizon.rain24h.toFixed(0)} mm simulated 24 h rain
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-1.5">
                    <Waves className="h-3.5 w-3.5 text-primary" />
                    Highest-risk cells
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ranked by illustrative waterlogging probability
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {localRisks.slice(0, 6).map((risk) => (
                  <button
                    key={risk.cell.id}
                    type="button"
                    onClick={() => setSelectedRisk(risk)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium">Cell {risk.cell.id}</p>
                      <p className="truncate text-2xs text-muted-foreground">
                        {risk.factors[0]?.label ?? 'Risk drivers'} · {risk.cell.elevation.toFixed(0)} m
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="num text-sm font-semibold">{pct(risk.probability)}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{summary.locality.name} at a glance</CardTitle>
              <p className="text-xs text-muted-foreground">Mean and peak risk across the locality</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <RiskGauge
                  value={summary.meanProbability}
                  level={summary.level}
                  size={118}
                  label="Mean risk"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Peak cell</span>
                    <span className="num font-semibold">{pct(summary.maxProbability)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Grid cells</span>
                    <span className="num font-semibold">{summary.cellCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Population estimate</span>
                    <span className="num font-semibold">
                      {summary.locality.populationEstimate.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Population is a simulated estimate, not a census figure.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cell distribution
                </p>
                <RiskDistribution summary={localSummary} compact />
              </div>

              <p className="mt-4 text-2xs leading-relaxed text-muted-foreground">
                {explainLocality(summary, 'the next 24 hours')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Rain ahead</CardTitle>
              <p className="text-xs text-muted-foreground">Demo monsoon spell · hourly rainfall</p>
            </CardHeader>
            <CardContent>
              <RainfallChart hours={weather.hourly} height={140} hoursToShow={36} />
              <div className="mt-3 border-t border-border pt-2">
                <p className="mb-1 text-2xs font-medium text-muted-foreground">Next 7 days</p>
                <DailyRainfallChart daily={weather.daily} height={96} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Risk trend</CardTitle>
              <p className="text-xs text-muted-foreground">
                Locality mean under the simulated spell
              </p>
            </CardHeader>
            <CardContent>
              <RiskTrendChart data={trend} height={150} />
              <InlineNote className="mt-2">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Trend is a scenario re-scoring of the same illustrative formula, not a time-series model.
              </InlineNote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" />
                Compare localities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a locality"
                  className="pl-9"
                  aria-label="Find a locality"
                />
              </div>
              <Select
                value={localityId}
                onChange={(event) => setLocalityId(event.target.value)}
                aria-label="Switch locality"
              >
                {[...LOCALITIES]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
              <div className="max-h-64 space-y-1 overflow-y-auto pt-1">
                {filteredLocalities.slice(0, 12).map((item) => {
                  const itemSummary = summaries.find((s) => s.locality.id === item.id)
                  if (!itemSummary) return null
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLocalityId(item.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                        item.id === localityId ? 'bg-primary/10' : 'hover:bg-muted',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs">{item.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="num text-2xs font-medium">{pct(itemSummary.meanProbability)}</span>
                        <RiskBadge level={itemSummary.level} showDot={false} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={Boolean(selectedRisk)} onOpenChange={(open) => !open && setSelectedRisk(null)}>
        <SheetBody>
          {selectedRisk ? (
            <CellRiskPanel risk={selectedRisk} horizonLabel="Next 24 hours" />
          ) : null}
        </SheetBody>
      </Sheet>
    </>
  )
}
