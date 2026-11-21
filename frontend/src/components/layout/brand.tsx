import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Brand({
  to = '/',
  compact = false,
  className,
}: {
  to?: string
  compact?: boolean
  className?: string
}) {
  return (
    <Link to={to} className={cn('group flex items-center gap-2.5', className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="1.8" className="text-primary" />
          <path d="M14.7 14.7 19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-primary" />
          <path d="M10.5 7.8v5.4M7.8 10.5h5.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-foreground/70" />
        </svg>
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight">CivicLens X</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Indore Urban Intelligence
          </span>
        </span>
      ) : null}
    </Link>
  )
}
