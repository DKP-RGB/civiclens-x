import * as React from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  Building2,
  ClipboardList,
  CloudRain,
  Crosshair,
  Database,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { PortalGuide } from '@/components/layout/portal-guide'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetBody,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Intelligence',
    items: [
      { to: '/authority', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/city', label: 'Live city pulse', icon: Activity },
      { to: '/authority/risk-map', label: 'Future risk map', icon: Map },
      { to: '/authority/predictions', label: 'Prediction explorer', icon: Crosshair },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/authority/infrastructure', label: 'Infrastructure', icon: Building2 },
      { to: '/authority/actions', label: 'Preventive actions', icon: Wrench },
      { to: '/authority/complaints', label: 'Complaints', icon: ClipboardList },
      { to: '/authority/data', label: 'Data health', icon: Database },
    ],
  },
  {
    label: 'Planning',
    items: [{ to: '/authority/simulator', label: 'Risk simulator', icon: SlidersHorizontal }],
  },
]

const ALL_ITEMS = SECTIONS.flatMap((section) => section.items)

function useCurrentItem() {
  const { pathname } = useLocation()
  return (
    ALL_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to))) ??
    ALL_ITEMS[0]
  )
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Authority portal">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function AuthorityLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [resetOpen, setResetOpen] = React.useState(false)
  const location = useLocation()
  const current = useCurrentItem()
  const { resetDemoData } = useAppStore()
  const { toast } = useToast()

  React.useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date())

  return (
    <div className="theme-dark min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/30 lg:flex">
          <div className="flex h-14 items-center border-b border-border px-4">
            <Brand to="/authority" />
          </div>
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Map className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">Indore</p>
                <p className="truncate text-[10px] text-muted-foreground">Madhya Pradesh · 250 m grid</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-1">
            <NavContent />
            <div className="mt-4 px-1">
              <Link
                to="/guide"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                <BookOpen className="h-4 w-4 shrink-0 opacity-80" />
                How to use
              </Link>
            </div>
          </div>
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-2">
              <Database className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                OSM · Copernicus DEM · Open-Meteo. Simulated incident and weather layers are labelled.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start text-muted-foreground"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset demo
              </Button>
              <Link
                to="/"
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-2xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Exit
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open authority navigation"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{current?.label ?? 'Overview'}</p>
                  <p className="hidden text-[10px] text-muted-foreground sm:block">
                    Indore Urban Intelligence · Authority console
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] text-muted-foreground md:inline-flex">
                  <CloudRain className="h-3 w-3 text-primary" />
                  Simulated forecast scenario
                </span>
                <span className="hidden text-[10px] text-muted-foreground sm:inline">{dateLabel}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  Authority demo
                </span>
                <Link
                  to="/citizen"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-2xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  <span className="hidden sm:inline">Citizen</span>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-7">
            <div className="mx-auto w-full max-w-[1440px]">
              <PortalGuide
                portal="authority"
                title="How to get from a hotspot to an action"
                steps={[
                  {
                    icon: Map,
                    title: 'See tomorrow’s hotspots',
                    text: 'Open the future risk map to see the city-wide surface and top cells.',
                  },
                  {
                    icon: Crosshair,
                    title: 'Inspect the drivers',
                    text: 'Click any cell to see rainfall, terrain, drainage and history factors.',
                  },
                  {
                    icon: SlidersHorizontal,
                    title: 'Test a scenario',
                    text: 'Change rain, drainage or built-up cover in the simulator before committing work.',
                  },
                ]}
                primaryTo="/authority/risk-map"
                primaryLabel="Open the risk map"
              />
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-border px-4 py-4 lg:px-6">
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Prototype decision-support interface. Risk scores are illustrative and must not be used for
              operational warnings. Data provenance is shown on every screen.
            </p>
          </footer>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} widthClassName="max-w-xs theme-dark">
        <SheetHeader>
          <SheetTitle>Authority console</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col">
          <NavContent onNavigate={() => setMobileOpen(false)} />
          <div className="my-4 h-px bg-border" />
          <div className="flex flex-col gap-1">
            <Link
              to="/citizen"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Switch to citizen portal
            </Link>
            <Link
              to="/guide"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" />
              How to use CivicLens X
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Exit to portal selection
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                setResetOpen(true)
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Reset demo data
            </button>
          </div>
        </SheetBody>
      </Sheet>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogHeader>
          <DialogTitle>Reset demo data?</DialogTitle>
          <DialogDescription>
            This restores the seeded complaints and preventive actions. Any complaints you submitted and any
            status changes you made in this browser will be discarded.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-2xs leading-relaxed text-amber-700 dark:text-amber-400">
            The reset only affects local demo state in this browser. It does not touch any external data.
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetDemoData()
              setResetOpen(false)
              toast({
                title: 'Demo data reset',
                description: 'Seeded complaints and preventive actions have been restored.',
                variant: 'success',
              })
            }}
          >
            Reset demo data
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
