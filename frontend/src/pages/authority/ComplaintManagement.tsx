import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Filter, Search } from 'lucide-react'
import type { ComplaintStatus, Priority } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { StatCard } from '@/components/domain/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PriorityBadge } from '@/components/domain/badges'
import { CategoryIcon } from '@/components/domain/category-icon'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CATEGORY_META, COMPLAINT_STATUS_META } from '@/lib/status'
import { getLocalityById } from '@/lib/risk'
import { useAppStore } from '@/store/app-store'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'

const STATUS_ORDER: ComplaintStatus[] = [
  'submitted',
  'under_review',
  'inspection_scheduled',
  'in_progress',
  'resolved',
]
const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']

export function ComplaintManagement() {
  const { complaints, updateComplaintStatus, updateComplaintPriority } = useAppStore()
  const [status, setStatus] = React.useState<ComplaintStatus | 'all'>('all')
  const [priority, setPriority] = React.useState<Priority | 'all'>('all')
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return complaints
      .filter((complaint) => {
        if (status !== 'all' && complaint.status !== status) return false
        if (priority !== 'all' && complaint.priority !== priority) return false
        if (!term) return true
        const locality = getLocalityById(complaint.localityId)?.name.toLowerCase() ?? ''
        return (
          complaint.title.toLowerCase().includes(term) ||
          complaint.ref.toLowerCase().includes(term) ||
          complaint.address.toLowerCase().includes(term) ||
          locality.includes(term)
        )
      })
      .sort((a, b) => {
        const p = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
        if (p !== 0) return p
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [complaints, status, priority, query])

  const open = complaints.filter((complaint) => complaint.status !== 'resolved')
  const urgent = complaints.filter(
    (complaint) => complaint.priority === 'urgent' && complaint.status !== 'resolved',
  )
  const unassigned = complaints.filter((complaint) => complaint.status === 'submitted')
  const resolved = complaints.filter((complaint) => complaint.status === 'resolved')

  return (
    <>
      <PageHeader
        eyebrow="Authority console · complaints"
        title="Complaint management"
        description="Triage citizen reports, set priority and move each case through the same five-stage timeline the citizen sees. Every change is stored in this browser for the demo."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open complaints" value={open.length} icon={ClipboardList} hint="Not yet resolved" />
        <StatCard
          label="Urgent"
          value={urgent.length}
          icon={Filter}
          accent="danger"
          hint="Urgent priority and open"
        />
        <StatCard
          label="Awaiting review"
          value={unassigned.length}
          icon={ClipboardList}
          accent="warning"
          hint="Submitted, not yet reviewed"
        />
        <StatCard
          label="Resolved"
          value={resolved.length}
          icon={ClipboardList}
          accent="success"
          hint="Closed in the demo store"
        />
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <CardTitle>All complaints</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {filtered.length} of {complaints.length} reports · seeded and citizen-submitted
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reports"
                className="w-[200px] pl-9"
                aria-label="Search complaints"
              />
            </div>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as ComplaintStatus | 'all')}
              aria-label="Filter by status"
              className="w-[165px]"
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((item) => (
                <option key={item} value={item}>
                  {COMPLAINT_STATUS_META[item].label}
                </option>
              ))}
            </Select>
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority | 'all')}
              aria-label="Filter by priority"
              className="w-[145px]"
            >
              <option value="all">All priorities</option>
              {PRIORITY_ORDER.map((item) => (
                <option key={item} value={item} className="capitalize">
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Complaint</TableHead>
                  <TableHead>Locality</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="pr-5 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((complaint) => {
                  const locality = getLocalityById(complaint.localityId)
                  return (
                    <TableRow key={complaint.id}>
                      <TableCell className="max-w-[320px] pl-5">
                        <Link
                          to={`/authority/complaints/${complaint.id}`}
                          className="flex items-start gap-2.5 group"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <CategoryIcon category={complaint.category} className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium group-hover:text-primary">
                              {complaint.title}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {complaint.ref} · {CATEGORY_META[complaint.category].label} ·{' '}
                              {complaint.citizenName}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="block">{locality?.name ?? '—'}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          cell {complaint.linkedCellId ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={complaint.priority}
                          onChange={(event) =>
                            updateComplaintPriority(complaint.id, event.target.value as Priority)
                          }
                          aria-label={`Priority for ${complaint.ref}`}
                          className="h-7 w-[104px] text-2xs capitalize"
                        >
                          {PRIORITY_ORDER.map((item) => (
                            <option key={item} value={item} className="capitalize">
                              {item}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={complaint.status}
                          onChange={(event) =>
                            updateComplaintStatus(complaint.id, event.target.value as ComplaintStatus)
                          }
                          aria-label={`Status for ${complaint.ref}`}
                          className="h-7 w-[168px] text-2xs"
                        >
                          {STATUS_ORDER.map((item) => (
                            <option key={item} value={item}>
                              {COMPLAINT_STATUS_META[item].label}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-2xs text-muted-foreground">
                        <span className="block">{timeAgo(complaint.updatedAt)}</span>
                        <span className="block text-[10px]">{formatDateTime(complaint.updatedAt)}</span>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Link
                          to={`/authority/complaints/${complaint.id}`}
                          className="inline-flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={ClipboardList}
                title="No complaints match these filters"
                description="Try a different status, priority or search term."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Status pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">Counts across the five-stage timeline</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {STATUS_ORDER.map((item) => {
              const count = complaints.filter((complaint) => complaint.status === item).length
              return (
                <div key={item} className="flex items-center gap-2">
                  <span className="w-32 text-2xs text-muted-foreground">
                    {COMPLAINT_STATUS_META[item].label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / Math.max(1, complaints.length)) * 100}%` }}
                    />
                  </div>
                  <span className="num w-6 text-right text-2xs font-medium">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Priority mix</CardTitle>
            <p className="text-xs text-muted-foreground">Open complaints only</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {PRIORITY_ORDER.map((item) => {
              const count = open.filter((complaint) => complaint.priority === item).length
              return (
                <div key={item} className="flex items-center gap-2">
                  <PriorityBadge priority={item} />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        item === 'urgent'
                          ? 'bg-risk-critical'
                          : item === 'high'
                            ? 'bg-risk-high'
                            : item === 'medium'
                              ? 'bg-risk-moderate'
                              : 'bg-risk-low',
                      )}
                      style={{ width: `${(count / Math.max(1, open.length)) * 100}%` }}
                    />
                  </div>
                  <span className="num w-6 text-right text-2xs font-medium">{count}</span>
                </div>
              )
            })}
            <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
              Seeded complaints are simulated. Status and priority changes are local to this browser.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
