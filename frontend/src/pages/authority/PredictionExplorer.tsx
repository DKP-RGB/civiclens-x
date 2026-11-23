import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BrainCircuit,
  Crosshair,
  Info,
  Search,
  Sparkles,
  Waves,
  Construction,
} from 'lucide-react'
import type { RiskCategory } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { InfoTip } from '@/components/ui/info-tip'
import { buttonVariants } from '@/components/ui/button'
import { InlineNote, ProvenanceBadge, RiskBadge } from '@/components/domain/badges'
import { RiskGauge } from '@/components/domain/risk-gauge'
import { FactorBars } from '@/components/domain/factor-bars'
import { IndoreMap } from '@/components/map/IndoreMap'
import { LOCALITIES } from '@/data/localities'
import { MODEL_INFO, MODEL_METRIC_ROWS } from '@/data/model'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import { computeCityRisks, getTopRiskCells } from '@/lib/risk'
import { explainCell, recommendationsFor } from '@/lib/explain'
import { cn, pct } from '@/lib/utils'

export function PredictionExplorer() {
  const [category, setCategory] = React.useState<RiskCategory>('waterlogging')
  const [localityId, setLocalityId] = React.useState('vijay-nagar')
  const [query, setQuery] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const weather = React.useMemo(() => getWeatherSnapshot(), [])
  const horizon = React.useMemo(() => getHorizonInputs(weather.hourly, '24h'), [weather])

  const risks = React.useMemo(
    () =>
      computeCityRisks(category, {
        rain1h: horizon.rain1h,
        rain3h: horizon.rain3h,
        rain24h: horizon.rain24h,
      }),
    [category, horizon],
  )

  const localRisks = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return risks
      .filter((risk) => risk.cell.localityId === localityId)
      .filter((risk) => (term ? risk.cell.id.toLowerCase().includes(term) : true))
      .sort((a, b) => b.probability - a.probability)
  }, [risks, localityId, query])

  const selected = React.useMemo(() => {
    if (selectedId) {
      const found = risks.find((risk) => risk.cell.id === selectedId)
      if (found) return found
    }
    return localRisks[0] ?? getTopRiskCells(risks, 1)[0]
  }, [selectedId, risks, localRisks])

  const similar = React.useMemo(() => {
    if (!selected) return []
    return risks
      .filter(
        (risk) =>
          risk.cell.id !== selected.cell.id &&
          Math.abs(risk.probability - selected.probability) < 0.05 &&
          (risk.cell.localityId === selected.cell.localityId ||
            Math.abs(risk.cell.elevation - selected.cell.elevation) < 6),
      )
      .sort((a, b) => Math.abs(a.probability - selected.probability) - Math.abs(b.probability - selected.probability))
      .slice(0, 5)
  }, [risks, selected])

  const locality = LOCALITIES.find((item) => item.id === localityId)
  const isRoad = category === 'road_deterioration'

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <Crosshair className="h-3 w-3 text-primary" />
              Prediction explorer
            </span>
            <ProvenanceBadge kind="model_output" label="Illustrative scorer" />
          </>
        }
        title="Why is this cell at risk?"
        description="Inspect a single 250 m cell: its score, the drivers behind it, the uncertainty band and the recommended next step. This is the same context a future Gemini explanation will receive."
        actions={
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value as RiskCategory)}
            aria-label="Risk type"
            className="w-[200px]"
          >
            <option value="waterlogging">Waterlogging risk</option>
            <option value="road_deterioration">Road deterioration</option>
          </Select>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[300px_1fr_300px] xl:items-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5">
              {isRoad ? (
                <Construction className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Waves className="h-3.5 w-3.5 text-primary" />
              )}
              Cells
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {localRisks.length} cells in {locality?.name ?? 'the selected locality'}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select
              value={localityId}
              onChange={(event) => {
                setLocalityId(event.target.value)
                setSelectedId(null)
              }}
              aria-label="Choose locality"
            >
              {[...LOCALITIES]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by cell id"
                className="pl-9"
                aria-label="Filter cells"
              />
            </div>
            <div className="max-h-[520px] space-y-1 overflow-y-auto pt-1">
              {localRisks.map((risk) => (
                <button
                  key={risk.cell.id}
                  type="button"
                  onClick={() => setSelectedId(risk.cell.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                    selected?.cell.id === risk.cell.id ? 'bg-primary/10' : 'hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Cell {risk.cell.id}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {risk.cell.elevation.toFixed(0)} m · {risk.cell.waterDistance} m to drain
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="num text-2xs font-semibold">{pct(risk.probability)}</span>
                    <RiskBadge level={risk.level} showDot={false} />
                  </div>
                </button>
              ))}
              {!localRisks.length ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">No cells match.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                  <div>
                    <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                      {isRoad ? 'Road deterioration' : 'Waterlogging'} · next 24 h
                    </p>
                    <CardTitle className="mt-1 text-base">
                      {LOCALITIES.find((item) => item.id === selected.cell.localityId)?.name ?? 'Indore'}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cell {selected.cell.id} · 250 m · {selected.cell.lat.toFixed(4)},{' '}
                      {selected.cell.lng.toFixed(4)}
                    </p>
                  </div>
                  <RiskBadge level={selected.level} />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <RiskGauge
                      value={selected.probability}
                      level={selected.level}
                      size={132}
                      label={isRoad ? 'Pressure index' : 'Probability'}
                      display={isRoad ? `${Math.round(selected.probability * 100)}/100` : undefined}
                    />
                    <div className="grid flex-1 gap-2 text-xs sm:grid-cols-2">
                      <Metric
                        label="Uncertainty"
                        value={`±${(selected.uncertainty * 100).toFixed(0)} pp`}
                        hint={
                          <InfoTip label="Uncertainty">
                            How much the score could move because data is incomplete or the cell has
                            little history. A wide band means “go and check”.
                          </InfoTip>
                        }
                      />
                      <Metric
                        label="Data completeness"
                        value={`${Math.round(selected.dataCompleteness * 100)}%`}
                        hint={
                          <InfoTip label="Data completeness">
                            Share of expected inputs available for this cell. Lower completeness
                            increases the uncertainty band.
                          </InfoTip>
                        }
                      />
                      <Metric label="Elevation" value={`${selected.cell.elevation.toFixed(0)} m`} />
                      <Metric label="Slope" value={`${selected.cell.slope.toFixed(1)}°`} />
                      <Metric label="Nearest waterway" value={`${selected.cell.waterDistance} m`} />
                      <Metric
                        label="Impervious proxy"
                        value={`${Math.round(selected.cell.impervious * 100)}%`}
                        hint={
                          <InfoTip label="Impervious proxy">
                            Estimated share of hard surface that stops rain soaking in. It is derived
                            from distance to the centre and road density, not a land-cover raster.
                          </InfoTip>
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <IndoreMap
                      riskCells={risks}
                      localities={LOCALITIES}
                      theme="dark"
                      height={240}
                      layers={{ grid: true, heatmap: false, incidents: false, labels: true }}
                      selectedCellId={selected.cell.id}
                      focus={{ lng: selected.cell.lng, lat: selected.cell.lat, zoom: 14.6 }}
                      fitOnLoad={false}
                      showLegend={false}
                      ariaLabel={`Risk map focused on cell ${selected.cell.id}`}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Contributing factors</CardTitle>
                    <p className="text-xs text-muted-foreground">Normalised share of the score</p>
                  </CardHeader>
                  <CardContent>
                    <FactorBars factors={selected.factors} />
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs leading-relaxed text-foreground/90">
                        {explainCell(selected, 'the next 24 hours')}
                      </p>
                      <InlineNote className="mt-2" tone="info">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                        Rule-based narrative for now. Gemini will generate this text from the same
                        structured context after the backend is connected.
                      </InlineNote>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Suggested next steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {recommendationsFor(selected).map((recommendation, index) => (
                          <li key={recommendation} className="flex items-start gap-2 text-xs leading-relaxed">
                            <span className="num flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                              {index + 1}
                            </span>
                            {recommendation}
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {similar.length ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Similar cells</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Comparable score and terrain — useful for grouping inspections
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2">
                    {similar.map((risk) => (
                      <button
                        key={risk.cell.id}
                        type="button"
                        onClick={() => setSelectedId(risk.cell.id)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium">Cell {risk.cell.id}</p>
                          <p className="truncate text-2xs text-muted-foreground">
                            {LOCALITIES.find((item) => item.id === risk.cell.localityId)?.name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="num text-xs font-semibold">{pct(risk.probability)}</span>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-xs text-muted-foreground">
                Select a locality and a cell to inspect its prediction.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                Model card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="font-medium">{MODEL_INFO.name}</p>
              <p className="text-2xs leading-relaxed text-muted-foreground">{MODEL_INFO.algorithm}</p>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-2xs">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{MODEL_INFO.version}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-2xs">
                <span className="text-muted-foreground">Horizon</span>
                <span className="font-medium">{MODEL_INFO.horizonHours} h</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-2xs">
                <span className="text-muted-foreground">Trained</span>
                <span className="font-medium text-amber-600">Not yet</span>
              </div>
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-2xs font-medium">Reported metrics</p>
                {MODEL_METRIC_ROWS.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2 text-2xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-muted-foreground">Not available</span>
                  </div>
                ))}
                <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                  No precision, recall or PR-AUC is claimed before a trained and validated model exists.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Data sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {MODEL_INFO.dataSources.map((source) => (
                <div key={source.label} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-2xs font-medium">{source.label}</p>
                    <ProvenanceBadge kind={source.provenance} />
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{source.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Link
            to="/authority/simulator"
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full gap-1.5' })}
          >
            Try the what-if simulator
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {label}
        {hint}
      </p>
      <p className="num mt-0.5 text-xs font-semibold">{value}</p>
    </div>
  )
}
