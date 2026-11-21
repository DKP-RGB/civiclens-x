import * as React from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Waves,
} from 'lucide-react'
import type { CellRisk, RiskScenario } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Sheet, SheetBody } from '@/components/ui/dialog'
import { InlineNote, ProvenanceBadge, RiskBadge } from '@/components/domain/badges'
import { CellRiskPanel } from '@/components/domain/cell-risk-panel'
import { IndoreMap } from '@/components/map/IndoreMap'
import { LOCALITIES } from '@/data/localities'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import {
  computeCityRisks,
  getLocalityRiskSummaries,
  getTopRiskCells,
  simulateScenario,
  summarizeRisks,
} from '@/lib/risk'
import { cn, pct } from '@/lib/utils'

const DEFAULT_SCENARIO: RiskScenario = {
  rainfallMmPerHour: 18,
  rainfallDurationHours: 8,
  drainageCondition: 'fair',
  imperviousPct: 72,
}

export function Simulator() {
  const [scenario, setScenario] = React.useState<RiskScenario>(DEFAULT_SCENARIO)
  const [selectedRisk, setSelectedRisk] = React.useState<CellRisk | null>(null)

  const weather = React.useMemo(() => getWeatherSnapshot(), [])
  const horizon = React.useMemo(() => getHorizonInputs(weather.hourly, '24h'), [weather])

  const baseline = React.useMemo(
    () =>
      computeCityRisks('waterlogging', {
        rain1h: horizon.rain1h,
        rain3h: horizon.rain3h,
        rain24h: horizon.rain24h,
      }),
    [horizon],
  )
  const baselineSummary = React.useMemo(() => summarizeRisks(baseline), [baseline])
  const baselineByCell = React.useMemo(
    () => new Map(baseline.map((risk) => [risk.cell.id, risk.probability])),
    [baseline],
  )

  const scenarioRisks = React.useMemo(() => simulateScenario(baseline, scenario), [baseline, scenario])
  const scenarioSummary = React.useMemo(() => summarizeRisks(scenarioRisks), [scenarioRisks])
  const scenarioLocalities = React.useMemo(() => getLocalityRiskSummaries(scenarioRisks), [scenarioRisks])
  const baselineLocalities = React.useMemo(() => getLocalityRiskSummaries(baseline), [baseline])

  const meanDelta = scenarioSummary.meanProbability - baselineSummary.meanProbability
  const criticalDelta = scenarioSummary.criticalCells - baselineSummary.criticalCells
  const highDelta = scenarioSummary.highCells - baselineSummary.highCells

  const localityDeltas = React.useMemo(() => {
    return scenarioLocalities
      .map((item) => {
        const base = baselineLocalities.find((entry) => entry.locality.id === item.locality.id)
        return {
          ...item,
          delta: item.meanProbability - (base?.meanProbability ?? item.meanProbability),
        }
      })
      .sort((a, b) => b.delta - a.delta)
  }, [scenarioLocalities, baselineLocalities])

  const topScenarioCells = React.useMemo(() => getTopRiskCells(scenarioRisks, 8), [scenarioRisks])

  const update = <K extends keyof RiskScenario>(key: K, value: RiskScenario[K]) =>
    setScenario((current) => ({ ...current, [key]: value }))

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3 w-3 text-primary" />
              What-if simulator
            </span>
            <ProvenanceBadge kind="model_output" label="Scenario re-score" />
          </>
        }
        title="Test a rainfall scenario"
        description="Change rainfall intensity, duration, drainage condition and impervious cover to see how the illustrative risk surface responds. This is a sensitivity tool, not a forecast."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setScenario(DEFAULT_SCENARIO)}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset scenario
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr] xl:items-start">
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Scenario controls</CardTitle>
              <p className="text-xs text-muted-foreground">
                Baseline: current 24 h demo scenario
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <SliderControl
                label="Rainfall intensity"
                value={scenario.rainfallMmPerHour}
                min={1}
                max={60}
                step={1}
                suffix=" mm/h"
                onChange={(value) => update('rainfallMmPerHour', value)}
                hint="Hourly peak used to drive the score"
              />
              <SliderControl
                label="Duration"
                value={scenario.rainfallDurationHours}
                min={1}
                max={24}
                step={1}
                suffix=" h"
                onChange={(value) => update('rainfallDurationHours', value)}
                hint="Total event length"
              />
              <SliderControl
                label="Impervious cover"
                value={scenario.imperviousPct}
                min={30}
                max={95}
                step={1}
                suffix="%"
                onChange={(value) => update('imperviousPct', value)}
                hint="Overrides the simulated built-up proxy"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="drainage-condition" className="text-xs font-medium">
                    Drainage condition
                  </label>
                  <span className="text-2xs capitalize text-muted-foreground">
                    {scenario.drainageCondition}
                  </span>
                </div>
                <Select
                  id="drainage-condition"
                  value={scenario.drainageCondition}
                  onChange={(event) =>
                    update('drainageCondition', event.target.value as RiskScenario['drainageCondition'])
                  }
                >
                  <option value="poor">Poor — choked or undersized</option>
                  <option value="fair">Fair — current assumed condition</option>
                  <option value="good">Good — recently desilted</option>
                </Select>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  A multiplier on the drainage-gap term. It does not model pipe hydraulics.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Scenario summary</CardTitle>
              <p className="text-xs text-muted-foreground">
                {scenario.rainfallMmPerHour} mm/h for {scenario.rainfallDurationHours} h
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <CompareRow
                label="Mean probability"
                baseline={pct(baselineSummary.meanProbability)}
                scenario={pct(scenarioSummary.meanProbability)}
                delta={meanDelta}
                deltaLabel={`${(meanDelta * 100).toFixed(1)} pp`}
              />
              <CompareRow
                label="Critical cells"
                baseline={String(baselineSummary.criticalCells)}
                scenario={String(scenarioSummary.criticalCells)}
                delta={criticalDelta}
                deltaLabel={`${criticalDelta > 0 ? '+' : ''}${criticalDelta}`}
              />
              <CompareRow
                label="High-risk cells"
                baseline={String(baselineSummary.highCells)}
                scenario={String(scenarioSummary.highCells)}
                delta={highDelta}
                deltaLabel={`${highDelta > 0 ? '+' : ''}${highDelta}`}
              />
              <div className="border-t border-border pt-2.5">
                <p className="text-2xs font-medium text-muted-foreground">Total event rainfall</p>
                <p className="num mt-0.5 text-lg font-semibold">
                  {(scenario.rainfallMmPerHour * scenario.rainfallDurationHours).toFixed(0)} mm
                </p>
              </div>
              <InlineNote tone="info">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Scenario values are illustrative. A trained model with verified drainage and asset data is
                required before this can inform real operational decisions.
              </InlineNote>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle>Risk change map</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Red = higher risk than baseline · blue = lower
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <ProvenanceBadge kind="model_output" label="Delta" />
                <ProvenanceBadge kind="simulated" label="Scenario" />
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <IndoreMap
                riskCells={scenarioRisks}
                deltaCells={scenarioRisks}
                deltaBaseline={baselineByCell}
                colorMode="delta"
                localities={LOCALITIES}
                theme="dark"
                height={440}
                layers={{ grid: true, heatmap: false, incidents: false, labels: true }}
                onSelectCell={(cellId) => {
                  const next = scenarioRisks.find((risk) => risk.cell.id === cellId)
                  if (next) setSelectedRisk(next)
                }}
                ariaLabel="Simulated change in waterlogging risk"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                <span>Click any cell for the scenario factor breakdown.</span>
                <span>
                  {scenarioSummary.totalCells.toLocaleString('en-IN')} cells re-scored
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Localities most affected</CardTitle>
                <p className="text-xs text-muted-foreground">Change in mean probability vs baseline</p>
              </CardHeader>
              <CardContent className="space-y-1">
                {localityDeltas.slice(0, 8).map((item) => (
                  <div key={item.locality.id} className="flex items-center gap-2 px-1 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.locality.name}</p>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(3, item.meanProbability * 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="num w-9 text-right text-2xs font-medium">
                      {pct(item.meanProbability)}
                    </span>
                    <span
                      className={cn(
                        'num flex w-14 items-center justify-end gap-0.5 text-2xs font-medium',
                        item.delta > 0.002
                          ? 'text-risk-high'
                          : item.delta < -0.002
                            ? 'text-sky-500'
                            : 'text-muted-foreground',
                      )}
                    >
                      {item.delta > 0.002 ? (
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      ) : item.delta < -0.002 ? (
                        <ArrowDownRight className="h-2.5 w-2.5" />
                      ) : null}
                      {item.delta > 0 ? '+' : ''}
                      {(item.delta * 100).toFixed(1)} pp
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5">
                  <Waves className="h-3.5 w-3.5 text-primary" />
                  Scenario hotspots
                </CardTitle>
                <p className="text-xs text-muted-foreground">Highest scenario probabilities</p>
              </CardHeader>
              <CardContent className="space-y-1">
                {topScenarioCells.map((risk) => (
                  <button
                    key={risk.cell.id}
                    type="button"
                    onClick={() => setSelectedRisk(risk)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {LOCALITIES.find((item) => item.id === risk.cell.localityId)?.name ?? 'Indore'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Cell {risk.cell.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="num text-2xs font-semibold">{pct(risk.probability)}</span>
                      <RiskBadge level={risk.level} showDot={false} />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Sheet open={Boolean(selectedRisk)} onOpenChange={(open) => !open && setSelectedRisk(null)}>
        <SheetBody>
          {selectedRisk ? (
            <CellRiskPanel risk={selectedRisk} horizonLabel="Simulated scenario" />
          ) : null}
        </SheetBody>
      </Sheet>
    </>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium" htmlFor={`slider-${label}`}>
          {label}
        </label>
        <span className="num rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-2xs font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        aria-label={label}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {min}
          {suffix}
        </span>
        {hint ? <span className="text-center">{hint}</span> : null}
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  )
}

function CompareRow({
  label,
  baseline,
  scenario,
  delta,
  deltaLabel,
}: {
  label: string
  baseline: string
  scenario: string
  delta: number
  deltaLabel: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="num text-2xs text-muted-foreground">{baseline}</span>
        <span className="text-2xs text-muted-foreground">→</span>
        <span className="num text-xs font-semibold">{scenario}</span>
        <span
          className={cn(
            'num w-14 text-right text-2xs font-medium',
            delta > 0.001 ? 'text-risk-high' : delta < -0.001 ? 'text-sky-500' : 'text-muted-foreground',
          )}
        >
          {deltaLabel}
        </span>
      </div>
    </div>
  )
}
