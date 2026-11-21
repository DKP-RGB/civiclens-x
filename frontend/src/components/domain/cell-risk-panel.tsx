import type { ReactNode } from 'react'
import { AlertTriangle, ArrowUpRight, Sparkles, Wrench, X } from 'lucide-react'
import type { CellRisk } from '@/types'
import { FactorBars } from '@/components/domain/factor-bars'
import { RiskBadge } from '@/components/domain/badges'
import { RiskGauge } from '@/components/domain/risk-gauge'
import { Button } from '@/components/ui/button'
import { explainCell, recommendationsFor } from '@/lib/explain'
import { getLocalityById } from '@/lib/risk'
import { pct } from '@/lib/utils'

export function CellRiskPanel({
  risk,
  horizonLabel,
  onClose,
  action,
  className,
}: {
  risk: CellRisk
  horizonLabel: string
  onClose?: () => void
  action?: ReactNode
  className?: string
}) {
  const locality = getLocalityById(risk.cell.localityId)
  const isRoad = risk.category === 'road_deterioration'
  const display = isRoad ? `${Math.round(risk.probability * 100)}/100` : pct(risk.probability)
  const recommendations = recommendationsFor(risk)

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            {isRoad ? 'Road deterioration' : 'Waterlogging'} · {horizonLabel}
          </p>
          <h3 className="mt-1 text-sm font-semibold">{locality?.name ?? 'Indore'}</h3>
          <p className="text-2xs text-muted-foreground">Cell {risk.cell.id} · 250 m</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={risk.level} />
          {onClose ? (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details">
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3">
        <RiskGauge
          value={risk.probability}
          level={risk.level}
          size={104}
          label={isRoad ? 'Pressure index' : 'Probability'}
          display={display}
        />
        <div className="grid flex-1 gap-2 text-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Horizon</span>
            <span className="font-medium">{horizonLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Uncertainty</span>
            <span className="font-medium">±{(risk.uncertainty * 100).toFixed(0)} pp</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Data completeness</span>
            <span className="font-medium">{Math.round(risk.dataCompleteness * 100)}%</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Elevation</span>
            <span className="font-medium">{risk.cell.elevation.toFixed(0)} m</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Contributing factors
        </p>
        <FactorBars factors={risk.factors} />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            Plain-language explanation
          </p>
          <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400">
            Prototype
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-foreground/90">
          {explainCell(risk, horizonLabel)}
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Rule-based narrative. Gemini integration is enabled after backend connection and will receive only
          this structured risk context.
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          Suggested next steps
        </p>
        <ul className="space-y-2">
          {recommendations.map((recommendation) => (
            <li key={recommendation} className="flex items-start gap-2 text-xs leading-relaxed">
              <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {recommendation}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Terrain: Copernicus DEM via Open-Meteo. Roads &amp; waterways: OpenStreetMap. Incident history,
          weather and impervious proxy: simulated. Municipal drain conditions are not connected.
        </span>
      </div>

      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function InlineCellLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {children}
      <ArrowUpRight className="h-3 w-3" />
    </button>
  )
}
