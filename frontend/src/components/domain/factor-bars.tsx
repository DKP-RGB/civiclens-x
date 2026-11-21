import type { RiskFactor } from '@/types'
import { pct } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function FactorBars({ factors, className }: { factors: RiskFactor[]; className?: string }) {
  if (!factors.length) {
    return <p className="text-xs text-muted-foreground">No factor breakdown available.</p>
  }
  const max = Math.max(...factors.map((f) => f.contribution), 0.01)
  return (
    <div className={cn('space-y-3', className)}>
      {factors.map((factor) => (
        <div key={factor.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium">{factor.label}</span>
            <span
              className={cn(
                'num shrink-0 text-2xs font-medium',
                factor.direction === 'increases' ? 'text-risk-high' : 'text-emerald-600',
              )}
            >
              {factor.direction === 'increases' ? '+' : '−'}
              {pct(factor.contribution)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full',
                factor.direction === 'increases' ? 'bg-risk-high' : 'bg-emerald-500',
              )}
              style={{ width: `${Math.max(4, (factor.contribution / max) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-2xs text-muted-foreground">{factor.detail}</p>
        </div>
      ))}
      <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
        Shares are normalised across the displayed drivers. Illustrative scoring, not a trained SHAP
        explanation.
      </p>
    </div>
  )
}
