import * as React from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  MapPin,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import {
  ComplaintStatusBadge,
  InlineNote,
  PriorityBadge,
  RiskBadge,
} from '@/components/domain/badges'
import { CategoryIcon } from '@/components/domain/category-icon'
import { IndoreMap } from '@/components/map/IndoreMap'
import { CATEGORY_META, COMPLAINT_STATUS_META } from '@/lib/status'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import { computeCellRisk, getCellById, getLocalityById } from '@/lib/risk'
import { useAppStore } from '@/store/app-store'
import { cn, formatDateTime, pct, timeAgo } from '@/lib/utils'

export function ComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { complaints, addComplaintNote } = useAppStore()
  const { toast } = useToast()
  const [note, setNote] = React.useState('')

  const complaint = complaints.find((item) => item.id === id)
  const isNew = searchParams.get('new') === '1'

  const horizon = React.useMemo(() => {
    const weather = getWeatherSnapshot()
    return getHorizonInputs(weather.hourly, '24h')
  }, [])

  const cell = complaint?.linkedCellId ? getCellById(complaint.linkedCellId) : undefined
  const riskCategory =
    complaint?.category === 'potholes' || complaint?.category === 'road_damage'
      ? 'road_deterioration'
      : 'waterlogging'
  const risk = React.useMemo(() => {
    if (!cell) return null
    return computeCellRisk(cell, riskCategory, {
      rain1h: horizon.rain1h,
      rain3h: horizon.rain3h,
      rain24h: horizon.rain24h,
    })
  }, [cell, riskCategory, horizon])

  if (!complaint) {
    return (
      <>
        <PageHeader eyebrow="Citizen portal" title="Complaint not found" />
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={MessageSquarePlus}
              title="This complaint is not in the local demo store"
              description="It may have been removed when the demo data was reset. Your other complaints are still available."
              action={
                <Link to="/citizen/complaints" className={buttonVariants({ size: 'sm' })}>
                  Back to my complaints
                </Link>
              }
            />
          </CardContent>
        </Card>
      </>
    )
  }

  const locality = getLocalityById(complaint.localityId)
  const timeline = [...complaint.timeline].sort((a, b) => a.at.localeCompare(b.at))
  const currentIndex = COMPLAINT_STATUS_META[complaint.status].order

  const handleAddNote = (event: React.FormEvent) => {
    event.preventDefault()
    if (!note.trim()) return
    addComplaintNote(complaint.id, note)
    setNote('')
    toast({
      title: 'Information added',
      description: 'The note is attached to the complaint timeline in this browser.',
      variant: 'success',
    })
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Link
          to="/citizen/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My complaints
        </Link>
        <span className="text-2xs text-muted-foreground">/</span>
        <span className="text-2xs font-medium text-muted-foreground">{complaint.ref}</span>
      </div>

      {isNew ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Complaint submitted successfully
            </p>
            <p className="mt-0.5 text-2xs leading-relaxed text-emerald-700/80 dark:text-emerald-400/80">
              Reference {complaint.ref} is linked to cell {complaint.linkedCellId ?? '—'}. You can add more
              information below at any time.
            </p>
          </div>
        </div>
      ) : null}

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

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Complaint timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Last update {timeAgo(complaint.updatedAt)} · {formatDateTime(complaint.updatedAt)}
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

              <form onSubmit={handleAddNote} className="mt-5 space-y-2 border-t border-border pt-4">
                <label htmlFor="complaint-note" className="text-xs font-medium">
                  Add information
                </label>
                <Textarea
                  id="complaint-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 600))}
                  placeholder="For example: the water is deeper in the evening, or the drain cover has been removed completely."
                  rows={3}
                  maxLength={600}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">{note.length}/600</span>
                  <Button type="submit" size="sm" disabled={!note.trim()} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Add note
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Location
              </CardTitle>
              <p className="text-xs text-muted-foreground">{complaint.address}</p>
            </CardHeader>
            <CardContent>
              <IndoreMap
                theme="light"
                height={280}
                riskCells={risk ? [risk] : []}
                localities={locality ? [locality] : []}
                layers={{ grid: true, heatmap: false, incidents: false, labels: true }}
                pickedLocation={complaint.location}
                focus={{ ...complaint.location, zoom: 14.4 }}
                fitOnLoad={false}
                showLegend={false}
                ariaLabel="Complaint location on the Indore map"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                <span>
                  {complaint.location.lat.toFixed(5)}, {complaint.location.lng.toFixed(5)}
                </span>
                <span>
                  {locality?.name ?? 'Indore'} · cell {complaint.linkedCellId ?? 'unlinked'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Case details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <DetailRow label="Reference" value={complaint.ref} mono />
              <DetailRow label="Category" value={CATEGORY_META[complaint.category].label} />
              <DetailRow label="Locality" value={locality?.name ?? '—'} />
              <DetailRow label="Department" value={complaint.assignedDepartment} />
              <DetailRow label="Submitted" value={formatDateTime(complaint.createdAt)} />
              <DetailRow
                label="Status"
                value={<ComplaintStatusBadge status={complaint.status} />}
              />
              {complaint.resolutionNote ? (
                <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                  <p className="text-2xs font-medium text-emerald-700 dark:text-emerald-400">
                    Resolution note
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-emerald-700/85 dark:text-emerald-400/85">
                    {complaint.resolutionNote}
                  </p>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                Progress {currentIndex + 1} of 5 stages
              </div>
            </CardContent>
          </Card>

          {complaint.imageUrl ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Photo</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={complaint.imageUrl}
                  alt={`Photo attached to ${complaint.ref}`}
                  className="w-full rounded-lg border border-border object-cover"
                />
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Citizen-uploaded photo. Stored locally in this browser for the demo.
                </p>
              </CardContent>
            </Card>
          ) : null}

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
                  <span className="text-muted-foreground">Nearest mapped waterway</span>
                  <span className="font-medium">{risk.cell.waterDistance} m</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Top driver</span>
                  <span className="font-medium">{risk.factors[0]?.label ?? '—'}</span>
                </div>
                {complaint.riskAtReport !== undefined ? (
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-muted-foreground">Risk at report time</span>
                    <span className="num font-medium">{pct(complaint.riskAtReport)}</span>
                  </div>
                ) : null}
                <InlineNote className="mt-1">
                  Illustrative scorer, not a trained ML model. Risk is context for the authority review, not
                  the reason the complaint was accepted.
                </InlineNote>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-2">
            <Link to="/citizen/report" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Report another issue
            </Link>
            <Link
              to="/citizen/risk"
              className="text-center text-2xs font-medium text-primary hover:underline"
            >
              See risk across your locality
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
