import type { RiskLevel } from '@/types'
import { RISK_LEVEL_META } from '@/lib/status'
import { cn, pct } from '@/lib/utils'

const STROKE: Record<RiskLevel, string> = {
  low: 'hsl(var(--risk-low))',
  moderate: 'hsl(var(--risk-moderate))',
  high: 'hsl(var(--risk-high))',
  critical: 'hsl(var(--risk-critical))',
}

export function RiskGauge({
  value,
  level,
  size = 132,
  label = 'Risk',
  display,
  className,
}: {
  value: number
  level: RiskLevel
  size?: number
  label?: string
  display?: string
  className?: string
}) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const dash = circumference * Math.max(0, Math.min(1, value))
  return (
    <div className={cn('flex flex-col items-center', className)} style={{ width: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label}: ${display ?? pct(value)}`}>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={STROKE[level]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 500ms cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
        >
          {display ?? pct(value)}
        </text>
        <text
          x="60"
          y="75"
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          {RISK_LEVEL_META[level].label}
        </text>
      </svg>
      <p className="-mt-1 text-2xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
