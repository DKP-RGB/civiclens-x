import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { ComplaintStatus, Priority } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { ComplaintStatusBadge, InlineNote, PriorityBadge, RiskBadge } from '@/components/domain/badges'
import { CategoryIcon } from '@/components/domain/category-icon'
import { FactorBars } from '@/components/domain/factor-bars'
import { IndoreMap } from '@/components/map/IndoreMap'
import { CATEGORY_META, COMPLAINT_STATUS_META } from '@/lib/status'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import { computeCellRisk, getCellById, getLocalityById } from '@/lib/risk'
import { complaintSummary } from '@/lib/explain'
import { useAppStore } from '@/store/app-store'
import { cn, formatDateTime, pct, timeAgo } from '@/lib/utils'

const STATUS_ORDER: ComplaintStatus[] = [
  'submitted',
  'under_review',
  'inspection_scheduled',
  'in_progress',
  'resolved',
]
const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high', 'urgent']

export function AuthorityComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const { complaints, updateComplaintStatus, updateComplaintPriority, addComplaintNote } = useAppStore()
  const { toast } = useToast()
  const [statusDraft, setStatusDraft] = React.useState<ComplaintStatus | ''>('')
  const [priorityDraft, setPriorityDraft] = React.useState<Priority | ''>('')
  const [note, setNote] = React.useState('')

  const complaint = complaints.find((item) => item.id === id)

  const horizon = React.useMemo(() => {
    const weather = getWeatherSnapshot()
    return getHorizonInputs(weather.hourly, '24h')
  }, [])

  React.useEffect(() => {
    if (!complaint) return
    setStatusDraft(complaint.status)
    setPriorityDraft(complaint.priority)
    setNote('')
  }, [complaint?.id, complaint?.status, complaint?.priority])

  if (!complaint) {
    return (
      <>
        <PageHeader eyebrow="Authority console" title="Complaint not found" />
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={Building2}
              title="This complaint is not in the demo store"
              description="It may have been removed by a demo reset."
              action={
                <Link to="/authority/complaints" className={buttonVariants({ size: 'sm' })}>
                  Back to complaints
                </Link>
              }
            />
          </CardContent>
        </Card>
      </>
    )
  }

  const locality = getLocalityById(complaint.localityId)
  const cell = complaint.linkedCellId ? getCellById(complaint.linkedCellId) : undefined
  const riskCategory =
    complaint.category === 'potholes' || complaint.category === 'road_damage'
      ? 'road_deterioration'
      : 'waterlogging'
  const risk = cell
    ? computeCellRisk(cell, riskCategory, {
        rain1h: horizon.rain1h,
        rain3h: horizon.rain3h,
        rain24h: horizon.rain24h,
      })
    : null

  const timeline = [...complaint.timeline].sort((a, b) => a.at.localeCompare(b.at))
  const currentIndex = COMPLAINT_STATUS_META[complaint.status].order

  const applyStatus = () => {
    if (!statusDraft) return
    updateComplaintStatus(complaint.id, statusDraft, note || undefined)
    toast({
      title: 'Status updated',
      description: `${complaint.ref} is now ${COMPLAINT_STATUS_META[statusDraft].label.toLowerCase()}.`,
      variant: 'success',
    })
    setNote('')
  }

  const applyPriority = () => {
    if (!priorityDraft) return
    updateComplaintPriority(complaint.id, priorityDraft)
    toast({
      title: 'Priority updated',
      description: `${complaint.ref} priority is now ${priorityDraft}.`,
      variant: 'success',
    })
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Link
          to="/authority/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Complaints
        </Link>
        <span className="text-2xs text-muted-foreground">/</span>
        <span className="font-mono text-2xs font-medium text-muted-foreground">{complaint.ref}</span>
      </div>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <CategoryIcon category={complaint.category} className="h-3 w-3 text-primary" />
            {CATEGORY_META[complaint.category].label}
          </span>
        }
        title={complaint.title}
        description={complaint.description}
        actions={
          <div className="flex items-center gap-2">
            <PriorityBadge priority={complaint.priority} />
            <ComplaintStatusBadge status={complaint.status} />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Case summary</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last updated {timeAgo(complaint.updatedAt)} · {formatDateTime(complaint.updatedAt)}
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <DetailRow label="Reference" value={complaint.ref} mono />
              <DetailRow label="Citizen" value={complaint.citizenName} />
              {complaint.citizenPhone ? <DetailRow label="Mobile" value={complaint.citizenPhone} /> : null}
              <DetailRow label="Locality" value={locality?.name ?? '—'} />
              <DetailRow label="Address" value={complaint.address} />
              <DetailRow label="Department" value={complaint.assignedDepartment} />
              <DetailRow label="Linked cell" value={complaint.linkedCellId ?? '—'} mono />
              <DetailRow label="Submitted" value={formatDateTime(complaint.createdAt)} />
              <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Rule-based case context
                </p>
                <p className="mt-1 text-2xs leading-relaxed text-foreground/85">
                  {complaintSummary(complaint, risk ?? undefined)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Progress {currentIndex + 1} of 5 stages
              </p>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-border pl-5">
                {timeline.map((entry, index) => {
                  const meta = COMPLAINT_STATUS_META[entry.status]
                  const isLatest = index === timeline.length - 1
                  return (
                    <li key={`${entry.at}-${index}`} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[27px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-background',
                          isLatest ? 'border-primary' : 'border-border',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isLatest ? 'bg-primary' : 'bg-muted-foreground/50',
                          )}
                        />
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-medium">{meta.label}</span>
                        {isLatest ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                            Current
                          </span>
                        ) : null}
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(entry.at)}</span>
                      </div>
                      <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{entry.label}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
                        {entry.actor === 'citizen' ? (
                          <UserRound className="h-2.5 w-2.5" />
                        ) : entry.actor === 'authority' ? (
                          <ShieldCheck className="h-2.5 w-2.5" />
                        ) : (
                          <Building2 className="h-2.5 w-2.5" />
                        )}
                        {entry.actor === 'citizen'
                          ? 'Citizen'
                          : entry.actor === 'authority'
                            ? 'Authority'
                            : 'System'}
                      </p>
                    </li>
                  )
                })}
              </ol>
              {complaint.resolutionNote ? (
                <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                  <p className="flex items-center gap-1.5 text-2xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolution note
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-emerald-700/85 dark:text-emerald-400/85">
                    {complaint.resolutionNote}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Location</CardTitle>
              <p className="text-xs text-muted-foreground">{complaint.address}</p>
            </CardHeader>
            <CardContent>
              <IndoreMap
                riskCells={risk ? [risk] : []}
                localities={locality ? [locality] : []}
                theme="dark"
                height={300}
                layers={{ grid: true, heatmap: false, incidents: false, labels: true }}
                pickedLocation={complaint.location}
                focus={{ ...complaint.location, zoom: 14.4 }}
                fitOnLoad={false}
                showLegend={false}
                ariaLabel={`Location of ${complaint.ref}`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Update case</CardTitle>
              <p className="text-xs text-muted-foreground">
                Changes appear on the citizen timeline immediately.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="case-status" className="text-xs font-medium">
                  Status
                </label>
                <Select
                  id="case-status"
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value as ComplaintStatus)}
                >
                  {STATUS_ORDER.map((item) => (
                    <option key={item} value={item}>
                      {COMPLAINT_STATUS_META[item].label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="case-priority" className="text-xs font-medium">
                  Priority
                </label>
                <div className="flex gap-2">
                  <Select
                    id="case-priority"
                    value={priorityDraft}
                    onChange={(event) => setPriorityDraft(event.target.value as Priority)}
                  >
                    {PRIORITY_ORDER.map((item) => (
                      <option key={item} value={item} className="capitalize">
                        {item}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPriority}
                    disabled={priorityDraft === complaint.priority}
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="case-note" className="text-xs font-medium">
                  Note for the timeline (optional)
                </label>
                <Textarea
                  id="case-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 600))}
                  placeholder="e.g. Crew assigned; inspection scheduled for tomorrow morning."
                  rows={3}
                  maxLength={600}
                />
              </div>
              <Button className="w-full gap-1.5" onClick={applyStatus}>
                <Send className="h-3.5 w-3.5" />
                Save status update
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  if (!note.trim()) return
                  addComplaintNote(complaint.id, note)
                  setNote('')
                  toast({ title: 'Note added to timeline', variant: 'success' })
                }}
                disabled={!note.trim()}
              >
                Add note only
              </Button>
              <InlineNote>
                <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                Demo store only. No notification is sent to the citizen outside this browser.
              </InlineNote>
            </CardContent>
          </Card>

          {risk ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>Linked cell risk</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cell {risk.cell.id} · next 24 hours
                    </p>
                  </div>
                  <RiskBadge level={risk.level} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {risk.category === 'waterlogging' ? 'Waterlogging probability' : 'Road pressure index'}
                  </span>
                  <span className="num font-semibold">
                    {risk.category === 'waterlogging'
                      ? pct(risk.probability)
                      : `${Math.round(risk.probability * 100)}/100`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Elevation</span>
                  <span className="font-medium">{risk.cell.elevation.toFixed(0)} m</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Nearest waterway</span>
                  <span className="font-medium">{risk.cell.waterDistance} m</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Uncertainty</span>
                  <span className="font-medium">±{(risk.uncertainty * 100).toFixed(0)} pp</span>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                    Drivers
                  </p>
                  <FactorBars factors={risk.factors.slice(0, 4)} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-2">
            <Link
              to="/authority/actions"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
            >
              Open preventive actions
            </Link>
            <Link
              to="/authority/risk-map"
              className="inline-flex items-center justify-center gap-1.5 text-2xs font-medium text-primary hover:underline"
            >
              <MapPin className="h-3 w-3" />
              View on the city risk map
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 text-right font-medium', mono && 'font-mono text-[11px]')}>
        {value}
      </span>
    </div>
  )
}
