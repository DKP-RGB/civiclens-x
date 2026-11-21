import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, MapPin, Plus, Search } from 'lucide-react'
import type { ComplaintStatus } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { ComplaintStatusBadge, PriorityBadge } from '@/components/domain/badges'
import { CategoryIcon } from '@/components/domain/category-icon'
import { COMPLAINT_STATUS_META, CATEGORY_META } from '@/lib/status'
import { getLocalityById } from '@/lib/risk'
import { useAppStore, DEMO_CITIZEN_NAME } from '@/store/app-store'
import { cn, timeAgo } from '@/lib/utils'

const STATUS_ORDER: ComplaintStatus[] = [
  'submitted',
  'under_review',
  'inspection_scheduled',
  'in_progress',
  'resolved',
]

export function MyComplaints() {
  const { complaints } = useAppStore()
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState<ComplaintStatus | 'all'>('all')

  const mine = React.useMemo(
    () =>
      complaints
        .filter((complaint) => complaint.citizenName === DEMO_CITIZEN_NAME)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [complaints],
  )

  const counts = React.useMemo(() => {
    const result: Record<string, number> = { all: mine.length }
    for (const step of STATUS_ORDER) result[step] = 0
    for (const complaint of mine) result[complaint.status]++
    return result
  }, [mine])

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return mine.filter((complaint) => {
      if (status !== 'all' && complaint.status !== status) return false
      if (!term) return true
      return (
        complaint.title.toLowerCase().includes(term) ||
        complaint.ref.toLowerCase().includes(term) ||
        complaint.address.toLowerCase().includes(term)
      )
    })
  }, [mine, query, status])

  return (
    <>
      <PageHeader
        eyebrow="Citizen portal · complaints"
        title="My complaints"
        description="Every report you submit is linked to a 250 m grid cell and follows the same status timeline the authority console uses."
        actions={
          <Link to="/citizen/report" className={buttonVariants({ size: 'sm', className: 'gap-1.5' })}>
            <Plus className="h-3.5 w-3.5" />
            Report an issue
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatus('all')}
          className={cn(
            'rounded-full border px-3 py-1 text-2xs font-medium transition-colors',
            status === 'all'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          All · {counts.all}
        </button>
        {STATUS_ORDER.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => setStatus(step)}
            className={cn(
              'rounded-full border px-3 py-1 text-2xs font-medium transition-colors',
              status === step
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {COMPLAINT_STATUS_META[step].label} · {counts[step]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, reference or address"
            className="pl-9"
            aria-label="Search complaints"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as ComplaintStatus | 'all')}
          aria-label="Filter by status"
          className="sm:w-[200px]"
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((step) => (
            <option key={step} value={step}>
              {COMPLAINT_STATUS_META[step].label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length ? (
        <div className="space-y-2.5">
          {filtered.map((complaint) => {
            const locality = getLocalityById(complaint.localityId)
            return (
              <Link
                key={complaint.id}
                to={`/citizen/complaints/${complaint.id}`}
                className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <CategoryIcon category={complaint.category} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {complaint.ref}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {CATEGORY_META[complaint.category].label}
                        </span>
                        <PriorityBadge priority={complaint.priority} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium group-hover:text-primary">
                        {complaint.title}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {locality?.name ?? complaint.address}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{timeAgo(complaint.createdAt)}</span>
                        {complaint.linkedCellId ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>cell {complaint.linkedCellId}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <ComplaintStatusBadge status={complaint.status} />
                    <span className="hidden items-center gap-1 text-2xs font-medium text-primary sm:inline-flex">
                      View details
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={ClipboardList}
              title={mine.length ? 'No complaints match these filters' : 'No complaints yet'}
              description={
                mine.length
                  ? 'Try a different status or clear the search term.'
                  : 'Report a pothole, waterlogging, garbage or drainage issue and it will appear here with a status timeline.'
              }
              action={
                mine.length ? null : (
                  <Link to="/citizen/report" className={buttonVariants({ size: 'sm', className: 'gap-1.5' })}>
                    <Plus className="h-3.5 w-3.5" />
                    Report an issue
                  </Link>
                )
              }
            />
          </CardContent>
        </Card>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
        Seeded demo complaints plus anything you submit in this browser. Nothing is sent to Indore
        Municipal Corporation. The seeded records are simulated and labelled accordingly.
      </p>
    </>
  )
}
