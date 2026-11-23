import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  HelpCircle,
  Layers,
  MapPin,
  MousePointerClick,
  Ruler,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { ProvenanceBadge } from '@/components/domain/badges'
import { RISK_LEVEL_META, PROVENANCE_META } from '@/lib/status'
import { buttonVariants } from '@/components/ui/button'
import type { DataProvenance, RiskLevel } from '@/types'

const RISK_ORDER: RiskLevel[] = ['low', 'moderate', 'high', 'critical']

const RISK_MEANING: Record<RiskLevel, string> = {
  low: 'Little sign of standing water under this scenario.',
  moderate: 'Some cells could collect water; keep an eye on drains.',
  high: 'Likely waterlogging in low or poorly drained spots.',
  critical: 'Strongest signal; inspect and clear drains first.',
}

const PROVENANCE_ORDER: DataProvenance[] = [
  'public_dataset',
  'simulated',
  'model_output',
  'verified',
]

const GLOSSARY = [
  {
    term: '250 m grid cell',
    text: 'Indore is divided into 1,887 squares of about 250 m. Predictions and complaints are linked to the same squares so they can be compared.',
  },
  {
    term: 'Waterlogging risk',
    text: 'An illustrative 0–100% score for the chance that a cell sees standing water within the selected horizon. It is a screening aid, not a forecast guarantee.',
  },
  {
    term: 'Risk drivers',
    text: 'The factors that push a cell’s score up or down: rainfall, low elevation, flat slope, drainage distance, built-up surface, road density and past reports.',
  },
  {
    term: 'Uncertainty',
    text: 'How much to trust a single cell score. It grows when data is incomplete or a cell has little history. A high score with high uncertainty deserves a field check.',
  },
  {
    term: 'What-if simulator',
    text: 'Re-runs the same scorer with different rainfall, drainage and built-up assumptions so you can compare scenarios before a real storm.',
  },
  {
    term: 'Preventive action',
    text: 'A proposed task such as desilting a drain or inspecting a road. Actions are linked to the cells that triggered them.',
  },
]

const FAQ = [
  {
    q: 'Is this live?',
    a: 'No. The rainfall scenario is a labelled demo, incidents and complaints are simulated, and the risk score is an illustrative rule. Real public layers are the OSM boundary, roads, waterways and Copernicus elevation.',
  },
  {
    q: 'Does it work for other cities?',
    a: 'No. CivicLens X is built only for Indore. Locations outside the Indore study boundary are rejected.',
  },
  {
    q: 'Is my complaint sent to the municipal corporation?',
    a: 'Not in this prototype. Complaints are stored in your browser so the full flow can be demonstrated. A backend API already exists, but the frontend is not connected to it yet.',
  },
  {
    q: 'Why are there no accuracy numbers?',
    a: 'Because no model has been trained and validated on Indore data yet. Precision, recall and PR-AUC stay blank until that happens. Claiming them now would be misleading.',
  },
  {
    q: 'Why is part of the map dimmed?',
    a: 'On the citizen locality page, the selected locality is shown at full strength and the rest of the city is dimmed so the local picture is easier to read.',
  },
]

export function GuidePage() {
  return (
    <div className="theme-light min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4">
          <Brand to="/" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Portal selection
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-2xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          2-minute guide
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          How to use CivicLens X
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          CivicLens X shows where waterlogging and road damage are most likely in Indore, and lets
          citizens report issues that feed the same map. This page explains the score, the colours and
          which numbers are real.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/citizen" className={buttonVariants({ className: 'gap-1.5' })}>
            <UserRound className="h-4 w-4" />
            Open citizen portal
          </Link>
          <Link
            to="/authority"
            className={buttonVariants({ variant: 'outline', className: 'gap-1.5' })}
          >
            <ShieldCheck className="h-4 w-4" />
            Open authority console
          </Link>
        </div>

        <Section
          icon={MapPin}
          eyebrow="Start here"
          title="Choose the view that matches what you need"
          description="Both portals use the same Indore grid. Pick one; you can switch at any time."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <PathCard
              icon={UserRound}
              title="I live or work in Indore"
              points={[
                'Check the risk in your locality',
                'Report a pothole, drain or garbage issue',
                'Track the status of what you reported',
              ]}
              to="/citizen"
              cta="Go to citizen portal"
            />
            <PathCard
              icon={ShieldCheck}
              title="I plan or maintain the city"
              points={[
                'See tomorrow’s hotspots on the risk map',
                'Inspect the drivers behind a cell score',
                'Simulate rain and queue preventive work',
              ]}
              to="/authority"
              cta="Go to authority console"
            />
          </div>
        </Section>

        <Section
          icon={Activity}
          eyebrow="The score"
          title="What the risk percentage means"
          description="The score runs from 0% to 100% for a 250 m cell. It is a transparent prototype rule, not a trained model or an official warning."
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {RISK_ORDER.map((level) => {
              const meta = RISK_LEVEL_META[level]
              return (
                <div key={level} className="rounded-xl border border-border bg-card p-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium"
                    style={{ borderColor: `${meta.hex}55`, color: meta.hex, backgroundColor: `${meta.hex}12` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.hex }} />
                    {meta.label}
                  </span>
                  <p className="num mt-2 text-sm font-semibold">{meta.range}</p>
                  <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                    {RISK_MEANING[level]}
                  </p>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-2xs leading-relaxed text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Treat every score as a question, not an answer. The right response to a high score is an
              inspection, not an automatic closure or evacuation.
            </span>
          </div>
        </Section>

        <Section
          icon={Layers}
          eyebrow="The map"
          title="How to read the map"
          description="The same gestures work on every map in the app."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              {
                icon: MousePointerClick,
                title: 'Click a square',
                text: 'Opens the cell’s drivers, uncertainty and suggested next step.',
              },
              {
                icon: Ruler,
                title: 'Each square is 250 m',
                text: 'The grid is clipped to the OpenStreetMap Indore boundary.',
              },
              {
                icon: Layers,
                title: 'Use the layer switches',
                text: 'Turn the risk grid, heatmap, incidents and labels on or off.',
              },
              {
                icon: Sparkles,
                title: 'Darker means higher risk',
                text: 'Green is low, amber is moderate, orange is high and red is critical.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title} className="flex gap-2.5 rounded-lg border border-border bg-card p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-medium">{item.title}</p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section
          icon={Database}
          eyebrow="Trust labels"
          title="What each data label means"
          description="Every layer says where it came from. Nothing simulated is presented as official."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {PROVENANCE_ORDER.map((kind) => {
              const meta = PROVENANCE_META[kind]
              return (
                <div key={kind} className="rounded-lg border border-border bg-card p-3">
                  <ProvenanceBadge kind={kind} />
                  <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">{meta.note}</p>
                </div>
              )
            })}
          </div>
        </Section>

        <Section icon={BookOpen} eyebrow="Glossary" title="Terms used in the app">
          <dl className="divide-y divide-border rounded-xl border border-border bg-card">
            {GLOSSARY.map((item) => (
              <div key={item.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                <dt className="text-xs font-medium">{item.term}</dt>
                <dd className="text-2xs leading-relaxed text-muted-foreground">{item.text}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={HelpCircle} eyebrow="Questions" title="Common questions">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium marker:hidden">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-2xs leading-relaxed text-muted-foreground">
              Ready? Start with your locality risk, then report anything you see on the ground.
            </p>
          </div>
          <Link to="/citizen" className={buttonVariants({ size: 'sm', className: 'shrink-0 gap-1.5' })}>
            Check my locality
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
          CivicLens X · Indore Urban Intelligence · Prototype, not an operational warning system.
        </p>
      </main>
    </div>
  )
}

function Section({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function PathCard({
  icon: Icon,
  title,
  points,
  to,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  points: string[]
  to: string
  cta: string
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <ul className="mt-2 flex-1 space-y-1.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-2xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            {point}
          </li>
        ))}
      </ul>
      <Link to={to} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        {cta}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
