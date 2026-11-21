import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Filter,
  IndianRupee,
  Search,
  Users,
  Wrench,
  Sparkles,
} from 'lucide-react'
import type { ActionStatus, PreventiveAction, Priority } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/domain/stat-card'
import {
  ActionStatusBadge,
  InlineNote,
  PriorityBadge,
  ProvenanceBadge,
} from '@/components/domain/badges'
import { ACTION_STATUS_META } from '@/lib/status'
import { getLocalityById } from '@/lib/risk'
import { useAppStore } from '@/store/app-store'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatInr, formatNumber } from '@/lib/utils'

const STATUS_ORDER: ActionStatus[] = ['proposed', 'approved', 'scheduled', 'completed']
const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']

export function PreventiveActions() {
  const { actions, updateActionStatus } = useAppStore()
  const { toast } = useToast()
  const [status, setStatus] = React.useState<ActionStatus | 'all'>('all')
  const [priority, setPriority] = React.useState<Priority | 'all'>('all')
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return actions
      .filter((action) => {
        if (status !== 'all' && action.status !== status) return false
        if (priority !== 'all' && action.priority !== priority) return false
        if (!term) return true
        const locality = getLocalityById(action.localityId)?.name.toLowerCase() ?? ''
        return (
          action.title.toLowerCase().includes(term) ||
          action.department.toLowerCase().includes(term) ||
          locality.includes(term)
        )
      })
      .sort((a, b) => {
        const p = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
        if (p !== 0) return p
        return a.dueDate.localeCompare(b.dueDate)
      })
  }, [actions, status, priority, query])

  const openActions = actions.filter((action) => action.status !== 'completed')
  const urgent = actions.filter(
    (action) => action.priority === 'urgent' && action.status !== 'completed',
  )
  const totalCost = openActions.reduce((acc, action) => acc + action.estimatedCostInr, 0)
  const totalBenefit = openActions.reduce((acc, action) => acc + action.populationBenefit, 0)

  const advance = (action: PreventiveAction) => {
    const index = STATUS_ORDER.indexOf(action.status)
    const next = STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, index + 1)]
    if (next === action.status) return
    updateActionStatus(action.id, next)
    toast({
      title: 'Action updated',
      description: `${action.ref} is now ${ACTION_STATUS_META[next].label.toLowerCase()}.`,
      variant: 'success',
    })
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-primary" />
              Preventive action centre
            </span>
            <ProvenanceBadge kind="model_output" label="Rule-based queue" />
          </>
        }
        title="Prevent before the complaint"
        description="Ranked, department-owned actions generated from the current risk surface. Approve, schedule and close work here; the queue is a transparent rule engine, not an optimiser."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open actions" value={openActions.length} icon={Wrench} hint="Proposed, approved or scheduled" />
        <StatCard
          label="Urgent"
          value={urgent.length}
          icon={Sparkles}
          accent="danger"
          hint="Critical cells in the current scenario"
        />
        <StatCard
          label="Estimated cost"
          value={formatInr(totalCost)}
          icon={IndianRupee}
          accent="warning"
          hint="Open actions · indicative only"
        />
        <StatCard
          label="People benefiting"
          value={formatNumber(totalBenefit)}
          icon={Users}
          hint="Simulated population estimate"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions, departments or localities"
            className="pl-9"
            aria-label="Search actions"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as ActionStatus | 'all')}
            aria-label="Filter by status"
            className="w-[170px]"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((item) => (
              <option key={item} value={item}>
                {ACTION_STATUS_META[item].label}
              </option>
            ))}
          </Select>
          <Select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority | 'all')}
            aria-label="Filter by priority"
            className="w-[150px]"
          >
            <option value="all">All priorities</option>
            {PRIORITY_ORDER.map((item) => (
              <option key={item} value={item} className="capitalize">
                {item}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Filter className="h-3 w-3" />
          {filtered.length} of {actions.length} actions
        </span>
        <span aria-hidden="true">·</span>
        <span>Sorted by priority, then due date</span>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((action) => {
          const locality = getLocalityById(action.localityId)
          const nextIndex = STATUS_ORDER.indexOf(action.status) + 1
          const nextStatus = STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, nextIndex)]
          return (
            <Card key={action.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {action.ref}
                      </span>
                      <PriorityBadge priority={action.priority} />
                      <ActionStatusBadge status={action.status} />
                      <span className="text-[10px] text-muted-foreground">
                        {action.category === 'waterlogging' ? 'Waterlogging' : 'Road deterioration'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold">{action.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {action.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                      <span>{action.department}</span>
                      <span aria-hidden="true">·</span>
                      <span>{locality?.name ?? 'Indore'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Cell {action.cellId}</span>
                      <span aria-hidden="true">·</span>
                      <span>Due {formatDate(action.dueDate)}</span>
                    </div>

                    <details className="group mt-3">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-2xs font-medium text-primary">
                        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                        Rationale and evidence
                      </summary>
                      <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-2xs leading-relaxed text-foreground/85">{action.rationale}</p>
                        <ul className="space-y-1">
                          {action.evidence.map((item) => (
                            <li key={item} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                              {item}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-muted-foreground">
                          Generated by the Phase 2 rule engine from the illustrative risk score. Not an
                          optimised work order.
                        </p>
                      </div>
                    </details>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 lg:w-[230px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground">Risk reduction</p>
                        <p className="num mt-0.5 text-sm font-semibold">−{action.riskReductionPct}%</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground">Cost</p>
                        <p className="num mt-0.5 text-sm font-semibold">
                          {formatInr(action.estimatedCostInr)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground">People</p>
                        <p className="num mt-0.5 text-sm font-semibold">
                          {formatNumber(action.populationBenefit)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground">Created</p>
                        <p className="mt-0.5 text-2xs font-medium">{formatDate(action.createdAt)}</p>
                      </div>
                    </div>
                    {action.status === 'completed' ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-2xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed
                      </div>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={() => advance(action)}>
                        {action.status === 'proposed' ? 'Approve action' : action.status === 'approved' ? 'Schedule action' : 'Mark completed'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <p className="text-center text-[10px] text-muted-foreground">
                      Next: {ACTION_STATUS_META[nextStatus].label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {!filtered.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm font-medium">No actions match these filters</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clear the search or switch the status filter.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <InlineNote className="mt-4" tone="warning">
        <Wrench className="mt-0.5 h-3 w-3 shrink-0" />
        Cost, risk reduction and population benefit are heuristic estimates. They are not a business case
        and must not be used for budget commitments.
      </InlineNote>

      <div className="mt-3 text-right">
        <Link to="/authority/complaints" className="text-2xs font-medium text-primary hover:underline">
          Manage incoming complaints
        </Link>
      </div>
    </>
  )
}
