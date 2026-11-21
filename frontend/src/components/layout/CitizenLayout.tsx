import * as React from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  Home,
  MapPin,
  Menu,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { Sheet, SheetBody, SheetHeader, SheetTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/citizen', label: 'Overview', icon: Home, end: true },
  { to: '/citizen/report', label: 'Report issue', icon: PlusCircle },
  { to: '/citizen/complaints', label: 'My complaints', icon: FileText },
  { to: '/citizen/risk', label: 'Locality risk', icon: MapPin },
]

export function CitizenLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const location = useLocation()

  React.useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="theme-light min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Brand to="/citizen" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Citizen portal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Citizen demo
            </span>
            <Link
              to="/authority"
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Authority
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open citizen navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mt-8 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-2xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            CivicLens X · Indore Urban Intelligence. Demo access only — this portal is not authenticated.
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>OSM boundary & roads</span>
            <span aria-hidden="true">·</span>
            <span>Copernicus DEM</span>
            <span aria-hidden="true">·</span>
            <span>Open-Meteo</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-600">Simulated layers labelled</span>
          </p>
        </div>
      </footer>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} widthClassName="max-w-xs theme-light">
        <SheetHeader>
          <SheetTitle>Citizen portal</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
          <div className="my-3 h-px bg-border" />
          <Link
            to="/authority"
            className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm font-medium"
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Authority portal
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link to="/" className="mt-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Exit to portal selection
          </Link>
        </SheetBody>
      </Sheet>
    </div>
  )
}
