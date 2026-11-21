import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  trendLabel,
  className,
  accent,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  className?: string
  accent?: 'default' | 'danger' | 'warning' | 'success'
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground',
              accent === 'danger' && 'bg-risk-critical/10 text-risk-critical',
              accent === 'warning' && 'bg-risk-moderate/10 text-risk-moderate',
              accent === 'success' && 'bg-emerald-500/10 text-emerald-600',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className="num mt-2 text-[26px] font-semibold leading-none tracking-tight">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
        {trend && trend !== 'flat' ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trend === 'up' ? 'text-risk-critical' : 'text-emerald-600',
            )}
          >
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trendLabel}
          </span>
        ) : trendLabel ? (
          <span>{trendLabel}</span>
        ) : null}
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  )
}
