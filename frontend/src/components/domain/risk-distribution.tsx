import type { RiskLevel, RiskSummary } from '@/types'
import { RISK_LEVEL_META } from '@/lib/status'
import { cn } from '@/lib/utils'

const LEVELS: RiskLevel[] = ['low', 'moderate', 'high', 'critical']

export function RiskDistribution({
  summary,
  className,
  compact = false,
}: {
  summary: RiskSummary
  className?: string
  compact?: boolean
}) {
  const total = summary.totalCells || 1
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {LEVELS.map((level) => (
          <div
            key={level}
            className={cn(
              'h-full transition-[width] duration-500',
              level === 'low' && 'bg-risk-low',
              level === 'moderate' && 'bg-risk-moderate',
              level === 'high' && 'bg-risk-high',
              level === 'critical' && 'bg-risk-critical',
            )}
            style={{ width: `${(summary.counts[level] / total) * 100}%` }}
            title={`${RISK_LEVEL_META[level].label}: ${summary.counts[level]} cells`}
          />
        ))}
      </div>
      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
        {LEVELS.map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', RISK_LEVEL_META[level].dot)} />
            <span className="text-2xs text-muted-foreground">{RISK_LEVEL_META[level].label}</span>
            <span className="num ml-auto text-2xs font-medium">{summary.counts[level]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
