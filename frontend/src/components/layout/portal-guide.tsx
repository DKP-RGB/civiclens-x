import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface GuideStep {
  icon: LucideIcon
  title: string
  text: string
}

const STORAGE_PREFIX = 'civiclens-x:portal-guide:'

/**
 * Dismissible first-visit orientation. Shown once per portal until the visitor
 * closes it; the preference lives in localStorage so it survives reloads.
 */
export function PortalGuide({
  portal,
  title,
  steps,
  primaryTo,
  primaryLabel,
  className,
}: {
  portal: 'citizen' | 'authority'
  title: string
  steps: GuideStep[]
  primaryTo: string
  primaryLabel: string
  className?: string
}) {
  const storageKey = `${STORAGE_PREFIX}${portal}`
  const [open, setOpen] = React.useState(() => {
    try {
      return window.localStorage.getItem(storageKey) !== 'dismissed'
    } catch {
      return true
    }
  })

  const dismiss = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(storageKey, 'dismissed')
    } catch {
      // Private mode or blocked storage: hiding for this session is enough.
    }
  }

  if (!open) return null

  return (
    <section
      aria-label="Getting started"
      className={cn(
        'relative mb-5 rounded-xl border border-primary/25 bg-primary/[0.045] p-4',
        className,
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Dismiss getting started guide"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-wrap items-center gap-2 pr-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
          <BookOpen className="h-3 w-3" />
          New here
        </span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <li
              key={step.title}
              className="flex gap-2.5 rounded-lg border border-border/80 bg-card/70 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  <span className="num mr-1 text-muted-foreground/70">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link to={primaryTo} className={buttonVariants({ size: 'sm', className: 'gap-1.5' })}>
          {primaryLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/guide"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Read the 2-minute guide
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  )
}
