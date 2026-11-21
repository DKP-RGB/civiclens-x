import type { ReactNode } from 'react'
import type {
  ActionStatus,
  AssetCondition,
  ComplaintStatus,
  DataProvenance,
  Priority,
  RiskLevel,
} from '@/types'
import {
  ACTION_STATUS_META,
  ASSET_CONDITION_META,
  COMPLAINT_STATUS_META,
  PRIORITY_META,
  PROVENANCE_META,
  RISK_LEVEL_META,
} from '@/lib/status'
import { cn } from '@/lib/utils'

export function RiskBadge({
  level,
  className,
  showDot = true,
}: {
  level: RiskLevel
  className?: string
  showDot?: boolean
}) {
  const meta = RISK_LEVEL_META[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium',
        meta.className,
        className,
      )}
    >
      {showDot ? <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} /> : null}
      {meta.label}
    </span>
  )
}

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const meta = COMPLAINT_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  const meta = ACTION_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium capitalize',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

export function AssetConditionBadge({ condition }: { condition: AssetCondition }) {
  const meta = ASSET_CONDITION_META[condition]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  )
}

export function ProvenanceBadge({
  kind,
  label,
  className,
}: {
  kind: DataProvenance
  label?: string
  className?: string
}) {
  const meta = PROVENANCE_META[kind]
  return (
    <span
      title={meta.note}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
        meta.className,
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current opacity-70" />
      {label ?? meta.short}
    </span>
  )
}

export function InlineNote({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode
  tone?: 'muted' | 'warning' | 'info'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-2xs leading-relaxed',
        tone === 'muted' && 'border-border bg-muted/40 text-muted-foreground',
        tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        tone === 'info' && 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400',
        className,
      )}
    >
      {children}
    </div>
  )
}
