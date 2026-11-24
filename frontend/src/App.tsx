import * as React from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { AppStoreProvider } from '@/store/app-store'
import { ToastProvider } from '@/components/ui/toast'
import { CitizenLayout } from '@/components/layout/CitizenLayout'
import { AuthorityLayout } from '@/components/layout/AuthorityLayout'
import { LandingPage } from '@/pages/LandingPage'
import { GuidePage } from '@/pages/GuidePage'
import { CitizenDashboard } from '@/pages/citizen/CitizenDashboard'
import { CitizenReport } from '@/pages/citizen/CitizenReport'
import { MyComplaints } from '@/pages/citizen/MyComplaints'
import { ComplaintDetail } from '@/pages/citizen/ComplaintDetail'
import { LocalityRisk } from '@/pages/citizen/LocalityRisk'
import { AuthorityDashboard } from '@/pages/authority/AuthorityDashboard'
import { FutureRiskMap } from '@/pages/authority/FutureRiskMap'
import { PredictionExplorer } from '@/pages/authority/PredictionExplorer'
import { DataHealth } from '@/pages/authority/DataHealth'
import { Infrastructure } from '@/pages/authority/Infrastructure'
import { Simulator } from '@/pages/authority/Simulator'
import { PreventiveActions } from '@/pages/authority/PreventiveActions'
import { ComplaintManagement } from '@/pages/authority/ComplaintManagement'
import { AuthorityComplaintDetail } from '@/pages/authority/AuthorityComplaintDetail'
import { buttonVariants } from '@/components/ui/button'

function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="theme-dark flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">This page is outside the map</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          CivicLens X only covers Indore. The link may be old, or the page may not exist in this prototype.
        </p>
        <Link to="/" className={buttonVariants({ className: 'mt-5 gap-1.5' })}>
          <ArrowLeft className="h-4 w-4" />
          Back to portal selection
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppStoreProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/guide" element={<GuidePage />} />

            <Route path="/citizen" element={<CitizenLayout />}>
              <Route index element={<CitizenDashboard />} />
              <Route path="report" element={<CitizenReport />} />
              <Route path="complaints" element={<MyComplaints />} />
              <Route path="complaints/:id" element={<ComplaintDetail />} />
              <Route path="risk" element={<LocalityRisk />} />
            </Route>

            <Route path="/authority" element={<AuthorityLayout />}>
              <Route index element={<AuthorityDashboard />} />
              <Route path="risk-map" element={<FutureRiskMap />} />
              <Route path="predictions" element={<PredictionExplorer />} />
              <Route path="infrastructure" element={<Infrastructure />} />
              <Route path="data" element={<DataHealth />} />
              <Route path="simulator" element={<Simulator />} />
              <Route path="actions" element={<PreventiveActions />} />
              <Route path="complaints" element={<ComplaintManagement />} />
              <Route path="complaints/:id" element={<AuthorityComplaintDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppStoreProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
