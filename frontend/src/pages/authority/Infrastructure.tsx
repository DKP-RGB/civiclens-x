import * as React from 'react'
import {
  Building2,
  CalendarClock,
  Droplets,
  Filter,
  MapPin,
  Search,
  Waves,
  Wrench,
  AlertTriangle,
} from 'lucide-react'
import type { AssetCondition, AssetType, InfrastructureAsset } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { StatCard } from '@/components/domain/stat-card'
import {
  AssetConditionBadge,
  InlineNote,
  ProvenanceBadge,
} from '@/components/domain/badges'
import { IndoreMap } from '@/components/map/IndoreMap'
import { INFRASTRUCTURE_ASSETS } from '@/data/infrastructure'
import { LOCALITIES } from '@/data/localities'
import { ASSET_TYPE_META } from '@/lib/status'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import { computeCityRisks, getLocalityById } from '@/lib/risk'
import { cn, formatDate } from '@/lib/utils'

const TYPE_ORDER: AssetType[] = [
  'stormwater_drain',
  'culvert',
  'pumping_station',
  'retention_pond',
  'road_segment',
]

function daysSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

export function Infrastructure() {
  const [type, setType] = React.useState<AssetType | 'all'>('all')
  const [condition, setCondition] = React.useState<AssetCondition | 'all'>('all')
  const [query, setQuery] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string>(INFRASTRUCTURE_ASSETS[0].id)

  const horizon = React.useMemo(() => {
    const weather = getWeatherSnapshot()
    return getHorizonInputs(weather.hourly, '24h')
  }, [])
  const risks = React.useMemo(
    () =>
      computeCityRisks('waterlogging', {
        rain1h: horizon.rain1h,
        rain3h: horizon.rain3h,
        rain24h: horizon.rain24h,
      }),
    [horizon],
  )

  const assets = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return INFRASTRUCTURE_ASSETS.filter((asset) => {
      if (type !== 'all' && asset.type !== type) return false
      if (condition !== 'all' && asset.condition !== condition) return false
      if (!term) return true
      const locality = getLocalityById(asset.localityId)?.name.toLowerCase() ?? ''
      return asset.name.toLowerCase().includes(term) || locality.includes(term)
    }).sort((a, b) => {
      const rank: Record<AssetCondition, number> = { critical: 0, poor: 1, fair: 2, good: 3 }
      return rank[a.condition] - rank[b.condition]
    })
  }, [type, condition, query])

  const selected: InfrastructureAsset | undefined =
    assets.find((asset) => asset.id === selectedId) ?? assets[0] ?? INFRASTRUCTURE_ASSETS[0]
  const selectedLocality = getLocalityById(selected.localityId)
  const nearbyRisk = React.useMemo(() => {
    let best = risks[0]
    let bestDistance = Infinity
    for (const risk of risks) {
      const dx = (risk.cell.lng - selected.location.lng) * 111_320 * Math.cos((22.72 * Math.PI) / 180)
      const dy = (risk.cell.lat - selected.location.lat) * 111_320
      const d = Math.hypot(dx, dy)
      if (d < bestDistance) {
        bestDistance = d
        best = risk
      }
    }
    return best
  }, [risks, selected])

  const criticalCount = INFRASTRUCTURE_ASSETS.filter((asset) => asset.condition === 'critical').length
  const poorCount = INFRASTRUCTURE_ASSETS.filter((asset) => asset.condition === 'poor').length
  const overdue = INFRASTRUCTURE_ASSETS.filter((asset) => daysSince(asset.lastInspected) > 60).length
  const drains = INFRASTRUCTURE_ASSETS.filter((asset) => asset.type === 'stormwater_drain').length

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-primary" />
              Infrastructure intelligence
            </span>
            <ProvenanceBadge kind="simulated" label="Asset register" />
          </>
        }
        title="Drainage and road assets"
        description="A simulated municipal asset register joined to the risk grid. Use it to see which drains, culverts and road segments sit in high-risk cells and when they were last inspected."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assets tracked" value={INFRASTRUCTURE_ASSETS.length} icon={Building2} hint="Simulated register" />
        <StatCard
          label="Critical condition"
          value={criticalCount}
          icon={AlertTriangle}
          accent="danger"
          hint={`${poorCount} more rated poor`}
        />
        <StatCard
          label="Stormwater drains"
          value={drains}
          icon={Droplets}
          accent="warning"
          hint="Drains and inlets in the register"
        />
        <StatCard
          label="Inspection overdue"
          value={overdue}
          icon={CalendarClock}
          hint="More than 60 days since inspection"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr] xl:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle>Asset location</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.name} · {selectedLocality?.name ?? 'Indore'}
                </p>
              </div>
              <AssetConditionBadge condition={selected.condition} />
            </CardHeader>
            <CardContent className="pb-3">
              <IndoreMap
                riskCells={risks}
                localities={LOCALITIES}
                theme="dark"
                height={360}
                layers={{ grid: true, heatmap: false, incidents: false, labels: true }}
                pickedLocation={selected.location}
                focus={{ ...selected.location, zoom: 14.2 }}
                fitOnLoad={false}
                showLegend={false}
                ariaLabel={`Map showing ${selected.name}`}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {selected.location.lat.toFixed(5)}, {selected.location.lng.toFixed(5)}
                </span>
                <span>
                  Nearby cell {nearbyRisk.cell.id} · {(nearbyRisk.probability * 100).toFixed(0)}% waterlogging
                  risk
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-primary" />
                Asset detail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Asset ID" value={selected.id} mono />
                <Detail label="Type" value={ASSET_TYPE_META[selected.type].label} />
                <Detail label="Locality" value={selectedLocality?.name ?? '—'} />
                <Detail label="Criticality" value={selected.criticality} className="capitalize" />
                <Detail label="Last inspected" value={formatDate(selected.lastInspected)} />
                <Detail label="Days since inspection" value={`${daysSince(selected.lastInspected)} days`} />
                <Detail label="Capacity" value={selected.capacityNote} className="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <p className="text-2xs text-muted-foreground">Field notes</p>
                  <p className="mt-1 rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs leading-relaxed">
                    {selected.notes}
                  </p>
                </div>
              </div>
              <InlineNote className="mt-3" tone="warning">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Simulated asset record. No verified Indore Municipal Corporation inventory is connected in
                Phase 2, so condition and capacity are illustrative.
              </InlineNote>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Asset register
            </CardTitle>
            <p className="text-xs text-muted-foreground">{assets.length} matching assets</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search asset or locality"
                className="pl-9"
                aria-label="Search assets"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={type}
                onChange={(event) => setType(event.target.value as AssetType | 'all')}
                aria-label="Filter by asset type"
              >
                <option value="all">All types</option>
                {TYPE_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {ASSET_TYPE_META[item].label}
                  </option>
                ))}
              </Select>
              <Select
                value={condition}
                onChange={(event) => setCondition(event.target.value as AssetCondition | 'all')}
                aria-label="Filter by condition"
              >
                <option value="all">All conditions</option>
                <option value="critical">Critical</option>
                <option value="poor">Poor</option>
                <option value="fair">Fair</option>
                <option value="good">Good</option>
              </Select>
            </div>

            <div className="max-h-[560px] space-y-1 overflow-y-auto pt-1">
              {assets.map((asset) => {
                const locality = getLocalityById(asset.localityId)
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    className={cn(
                      'flex w-full items-start justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                      selected.id === asset.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-transparent hover:bg-muted/50',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{asset.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {ASSET_TYPE_META[asset.type].label} · {locality?.name ?? 'Indore'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Inspected {daysSince(asset.lastInspected)} d ago · {asset.criticality} criticality
                      </p>
                    </div>
                    <AssetConditionBadge condition={asset.condition} />
                  </button>
                )
              })}
              {!assets.length ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No assets match these filters.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Assets by condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(['critical', 'poor', 'fair', 'good'] as AssetCondition[]).map((item) => {
              const count = INFRASTRUCTURE_ASSETS.filter((asset) => asset.condition === item).length
              return (
                <div key={item} className="flex items-center gap-2">
                  <span className="w-16 text-2xs capitalize text-muted-foreground">{item}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item === 'critical' && 'bg-risk-critical',
                        item === 'poor' && 'bg-risk-high',
                        item === 'fair' && 'bg-risk-moderate',
                        item === 'good' && 'bg-risk-low',
                      )}
                      style={{ width: `${(count / INFRASTRUCTURE_ASSETS.length) * 100}%` }}
                    />
                  </div>
                  <span className="num w-6 text-right text-2xs font-medium">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Assets in high-risk cells</CardTitle>
            <p className="text-xs text-muted-foreground">
              Nearest grid cell is high or critical under the demo scenario
            </p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {INFRASTRUCTURE_ASSETS.filter((asset) => {
              let best = risks[0]
              let bestDistance = Infinity
              for (const risk of risks) {
                const dx =
                  (risk.cell.lng - asset.location.lng) * 111_320 * Math.cos((22.72 * Math.PI) / 180)
                const dy = (risk.cell.lat - asset.location.lat) * 111_320
                const d = Math.hypot(dx, dy)
                if (d < bestDistance) {
                  bestDistance = d
                  best = risk
                }
              }
              return best.level === 'high' || best.level === 'critical'
            })
              .slice(0, 6)
              .map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{asset.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {getLocalityById(asset.localityId)?.name} · {ASSET_TYPE_META[asset.type].label}
                    </p>
                  </div>
                  <AssetConditionBadge condition={asset.condition} />
                </button>
              ))}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Waves className="h-3 w-3" />
        Risk values are illustrative. Verified drain condition and telemetry would materially change these
        priorities.
      </p>
    </>
  )
}

function Detail({
  label,
  value,
  mono,
  className,
}: {
  label: string
  value: string
  mono?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-xs font-medium', mono && 'font-mono text-[11px]')}>{value}</p>
    </div>
  )
}
