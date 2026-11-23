import * as React from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Small accessible help affordance. Opens on hover or keyboard focus, so it
 * works for mouse, touch (tap focuses the button) and screen readers.
 */
export function InfoTip({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  const id = React.useId()
  return (
    <span className={cn('group relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={`More information: ${label}`}
        aria-describedby={id}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-left text-2xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-raised transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  )
}
