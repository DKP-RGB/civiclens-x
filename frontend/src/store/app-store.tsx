import * as React from 'react'
import type {
  ActionStatus,
  Complaint,
  ComplaintStatus,
  IncidentCategory,
  LatLng,
  PreventiveAction,
  Priority,
} from '@/types'
import { SEEDED_COMPLAINTS, DEMO_CITIZEN_NAME } from '@/data/complaints'
import { SEEDED_ACTIONS } from '@/data/actions'
import { DEMO_RISK_INPUTS, computeCellRisk, getNearestCell } from '@/lib/risk'
import { COMPLAINT_STATUS_META } from '@/lib/status'

const STORAGE_KEY = 'civiclens-x-demo-v1'

const DEPARTMENT_BY_CATEGORY: Record<IncidentCategory, string> = {
  waterlogging: 'Stormwater & Drainage Cell',
  drainage: 'Stormwater & Drainage Cell',
  potholes: 'Roads & Bridges Department',
  road_damage: 'Roads & Bridges Department',
  garbage: 'Solid Waste Management',
  other: 'Indore Municipal Corporation — Zone Office',
}

export interface NewComplaintInput {
  category: IncidentCategory
  title: string
  description: string
  address: string
  localityId: string
  location: LatLng
  citizenName: string
  citizenPhone?: string
  imageUrl?: string
}

interface StoreState {
  complaints: Complaint[]
  actions: PreventiveAction[]
}

interface AppStoreValue extends StoreState {
  addComplaint: (input: NewComplaintInput) => Complaint
  updateComplaintStatus: (id: string, status: ComplaintStatus, note?: string) => void
  updateComplaintPriority: (id: string, priority: Priority) => void
  addComplaintNote: (id: string, note: string) => void
  updateActionStatus: (id: string, status: ActionStatus) => void
  resetDemoData: () => void
}

const AppStoreContext = React.createContext<AppStoreValue | null>(null)

function loadInitialState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreState>
      if (Array.isArray(parsed.complaints) && Array.isArray(parsed.actions)) {
        return { complaints: parsed.complaints, actions: parsed.actions }
      }
    }
  } catch {
    // Corrupt or unavailable storage → fall back to seeds.
  }
  return { complaints: SEEDED_COMPLAINTS, actions: SEEDED_ACTIONS }
}

function nextRef(complaints: Complaint[]) {
  const year = new Date().getFullYear()
  const highest = complaints.reduce((max, complaint) => {
    const match = complaint.ref.match(/(\d{4})$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 120)
  return `CLX-${year}-${String(highest + 1).padStart(4, '0')}`
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<StoreState>(loadInitialState)

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('CivicLens X: could not persist demo state', error)
    }
  }, [state])

  const addComplaint = React.useCallback<AppStoreValue['addComplaint']>(
    (input) => {
      const nearest = getNearestCell(input.location.lng, input.location.lat)
      const riskCategory =
        input.category === 'potholes' || input.category === 'road_damage'
          ? 'road_deterioration'
          : 'waterlogging'
      const risk = computeCellRisk(nearest.cell, riskCategory, DEMO_RISK_INPUTS)
      const priority: Priority =
        risk.probability >= 0.7
          ? 'urgent'
          : risk.probability >= 0.5
            ? 'high'
            : risk.probability >= 0.3
              ? 'medium'
              : 'low'
      const now = new Date().toISOString()

      const complaint: Complaint = {
        id: `cmp-${Date.now()}`,
        ref: nextRef(state.complaints),
        category: input.category,
        title: input.title.trim(),
        description: input.description.trim(),
        address: input.address.trim(),
        localityId: input.localityId,
        location: input.location,
        status: 'submitted',
        priority,
        createdAt: now,
        updatedAt: now,
        assignedDepartment: DEPARTMENT_BY_CATEGORY[input.category],
        citizenName: input.citizenName.trim() || DEMO_CITIZEN_NAME,
        citizenPhone: input.citizenPhone?.trim() || undefined,
        imageUrl: input.imageUrl,
        imageProvenance: input.imageUrl ? 'citizen_upload' : undefined,
        linkedCellId: nearest.cell.id,
        riskAtReport: risk.probability,
        timeline: [
          {
            status: 'submitted',
            label: 'Complaint received, validated and geo-tagged to a 250 m grid cell.',
            at: now,
            actor: 'citizen',
          },
        ],
      }
      setState((current) => ({ ...current, complaints: [complaint, ...current.complaints] }))
      return complaint
    },
    [state.complaints],
  )

  const updateComplaintStatus = React.useCallback<AppStoreValue['updateComplaintStatus']>(
    (id, status, note) => {
      setState((current) => ({
        ...current,
        complaints: current.complaints.map((complaint) => {
          if (complaint.id !== id) return complaint
          const at = new Date().toISOString()
          const cleanNote = note?.trim()
          return {
            ...complaint,
            status,
            updatedAt: at,
            resolutionNote:
              status === 'resolved' ? cleanNote || complaint.resolutionNote : complaint.resolutionNote,
            timeline: [
              ...complaint.timeline,
              {
                status,
                label: cleanNote || COMPLAINT_STATUS_META[status].label,
                at,
                actor: 'authority',
                note: cleanNote,
              },
            ],
          }
        }),
      }))
    },
    [],
  )

  const updateComplaintPriority = React.useCallback<AppStoreValue['updateComplaintPriority']>(
    (id, priority) => {
      setState((current) => ({
        ...current,
        complaints: current.complaints.map((complaint) =>
          complaint.id === id ? { ...complaint, priority, updatedAt: new Date().toISOString() } : complaint,
        ),
      }))
    },
    [],
  )

  const addComplaintNote = React.useCallback<AppStoreValue['addComplaintNote']>((id, note) => {
    const clean = note.trim()
    if (!clean) return
    setState((current) => ({
      ...current,
      complaints: current.complaints.map((complaint) => {
        if (complaint.id !== id) return complaint
        const at = new Date().toISOString()
        return {
          ...complaint,
          updatedAt: at,
          timeline: [
            ...complaint.timeline,
            {
              status: complaint.status,
              label: clean,
              at,
              actor: 'citizen',
              note: 'Citizen added information',
            },
          ],
        }
      }),
    }))
  }, [])

  const updateActionStatus = React.useCallback<AppStoreValue['updateActionStatus']>((id, status) => {
    setState((current) => ({
      ...current,
      actions: current.actions.map((action) => (action.id === id ? { ...action, status } : action)),
    }))
  }, [])

  const resetDemoData = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({ complaints: SEEDED_COMPLAINTS, actions: SEEDED_ACTIONS })
  }, [])

  const value = React.useMemo<AppStoreValue>(
    () => ({
      ...state,
      addComplaint,
      updateComplaintStatus,
      updateComplaintPriority,
      addComplaintNote,
      updateActionStatus,
      resetDemoData,
    }),
    [
      state,
      addComplaint,
      updateComplaintStatus,
      updateComplaintPriority,
      addComplaintNote,
      updateActionStatus,
      resetDemoData,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = React.useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}

export { DEMO_CITIZEN_NAME }
