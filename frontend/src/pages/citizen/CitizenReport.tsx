import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  Check,
  Crosshair,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import type { CellRisk, IncidentCategory, LatLng } from '@/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { CategoryIcon } from '@/components/domain/category-icon'
import { RiskBadge, InlineNote } from '@/components/domain/badges'
import { IndoreMap } from '@/components/map/IndoreMap'
import { CATEGORY_META } from '@/lib/status'
import { LOCALITIES } from '@/data/localities'
import { getWeatherSnapshot, getHorizonInputs } from '@/data/weather'
import {
  computeCellRisk,
  computeCityRisks,
  getNearestCell,
  getNearestLocality,
} from '@/lib/risk'
import { compressImage } from '@/lib/image'
import { useAppStore, DEMO_CITIZEN_NAME } from '@/store/app-store'
import { cn, pct } from '@/lib/utils'

const CATEGORY_ORDER: IncidentCategory[] = [
  'potholes',
  'waterlogging',
  'garbage',
  'drainage',
  'road_damage',
  'other',
]

interface FormErrors {
  category?: string
  title?: string
  description?: string
  address?: string
  location?: string
  name?: string
  phone?: string
  image?: string
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5" id={`field-${htmlFor}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  )
}

export function CitizenReport() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addComplaint } = useAppStore()

  const [category, setCategory] = React.useState<IncidentCategory | null>(null)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [localityId, setLocalityId] = React.useState('')
  const [location, setLocation] = React.useState<LatLng | null>(null)
  const [name, setName] = React.useState(DEMO_CITIZEN_NAME)
  const [phone, setPhone] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState<string | undefined>()
  const [imageName, setImageName] = React.useState<string | undefined>()
  const [uploading, setUploading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [focus, setFocus] = React.useState<{ lng: number; lat: number; zoom?: number } | null>(null)
  const fileRef = React.useRef<HTMLInputElement | null>(null)

  const weather = React.useMemo(() => getWeatherSnapshot(), [])
  const horizon = React.useMemo(() => getHorizonInputs(weather.hourly, '24h'), [weather])
  const cityRisks = React.useMemo(
    () =>
      computeCityRisks('waterlogging', {
        rain1h: horizon.rain1h,
        rain3h: horizon.rain3h,
        rain24h: horizon.rain24h,
      }),
    [horizon],
  )

  const nearest = React.useMemo(
    () => (location ? getNearestCell(location.lng, location.lat) : null),
    [location],
  )
  const selectedCell = nearest?.cell ?? null
  const riskCategory =
    category === 'potholes' || category === 'road_damage' ? 'road_deterioration' : 'waterlogging'
  const cellRisk: CellRisk | null = React.useMemo(() => {
    if (!selectedCell) return null
    return computeCellRisk(selectedCell, riskCategory, {
      rain1h: horizon.rain1h,
      rain3h: horizon.rain3h,
      rain24h: horizon.rain24h,
    })
  }, [selectedCell, riskCategory, horizon])

  const handlePick = React.useCallback(
    (next: LatLng) => {
      const result = getNearestCell(next.lng, next.lat)
      if (result.distanceMeters > 2000) {
        toast({
          title: 'Outside the supported area',
          description: 'CivicLens X currently accepts reports inside the Indore City study boundary only.',
          variant: 'error',
        })
        return
      }
      setLocation(next)
      const locality = getNearestLocality(next.lng, next.lat).locality
      setLocalityId(locality.id)
      setErrors((current) => ({ ...current, location: undefined }))
    },
    [toast],
  )

  const handleLocality = (id: string) => {
    const locality = LOCALITIES.find((item) => item.id === id)
    if (!locality) return
    setLocalityId(id)
    setLocation({ ...locality.centroid })
    setFocus({ ...locality.centroid, zoom: 13.4 })
    setErrors((current) => ({ ...current, location: undefined }))
  }

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Location unavailable', description: 'This browser does not expose geolocation.', variant: 'error' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePick({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => {
        toast({
          title: 'Could not get your location',
          description: 'Choose a locality or click the map instead.',
          variant: 'error',
        })
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setErrors((current) => ({ ...current, image: undefined }))
    try {
      const dataUrl = await compressImage(file)
      setImageUrl(dataUrl)
      setImageName(file.name)
    } catch (error) {
      setErrors((current) => ({
        ...current,
        image: error instanceof Error ? error.message : 'Could not process the image.',
      }))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const validate = (): FormErrors => {
    const next: FormErrors = {}
    if (!category) next.category = 'Choose the issue category.'
    if (title.trim().length < 6) next.title = 'Add a short title of at least 6 characters.'
    if (description.trim().length < 20)
      next.description = 'Describe the issue in at least 20 characters so it can be triaged.'
    if (!location) next.location = 'Pick the exact location on the map.'
    if (address.trim().length < 6) next.address = 'Add a landmark or street address.'
    if (!name.trim()) next.name = 'Add your name.'
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.replace(/\s+/g, '')))
      next.phone = 'Enter a valid 10-digit Indian mobile number, or leave it blank.'
    return next
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) {
      document.getElementById(`field-${firstError === 'location' ? 'address' : firstError}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      return
    }
    if (!category || !location) return

    setSubmitting(true)
    try {
      const complaint = addComplaint({
        category,
        title,
        description,
        address,
        localityId,
        location,
        citizenName: name,
        citizenPhone: phone || undefined,
        imageUrl,
      })
      toast({
        title: 'Complaint submitted',
        description: `${complaint.ref} is now linked to cell ${complaint.linkedCellId}.`,
        variant: 'success',
      })
      navigate(`/citizen/complaints/${complaint.id}?new=1`)
    } catch {
      toast({
        title: 'Could not submit the complaint',
        description: 'Please try again. Demo data is stored in this browser.',
        variant: 'error',
      })
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-2">
        <Link
          to="/citizen"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to overview
        </Link>
      </div>
      <PageHeader
        eyebrow="Citizen portal · new report"
        title="Report a civic issue"
        description="Tell us what is wrong, add a photo if you have one, and pin the location. The report is linked to the same 250 m grid the city uses for risk prediction."
      />

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>1 · What is the issue?</CardTitle>
              <p className="text-xs text-muted-foreground">Choose the closest category.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" id="field-category">
                {CATEGORY_ORDER.map((value) => {
                  const selected = category === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setCategory(value)
                        setErrors((current) => ({ ...current, category: undefined }))
                      }}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors',
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border bg-background hover:bg-muted/50',
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-md',
                          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <CategoryIcon category={value} className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-medium">{CATEGORY_META[value].label}</span>
                      <span className="text-[10px] leading-relaxed text-muted-foreground">
                        {CATEGORY_META[value].description}
                      </span>
                    </button>
                  )
                })}
              </div>
              <FieldError>{errors.category}</FieldError>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>2 · Where is it?</CardTitle>
              <p className="text-xs text-muted-foreground">
                Click the map to drop a pin, or start from a locality.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {['vijay-nagar', 'palasia', 'rajwada', 'bhawarkuan', 'sudama-nagar', 'khajrana'].map((id) => {
                  const locality = LOCALITIES.find((item) => item.id === id)
                  if (!locality) return null
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleLocality(id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors',
                        localityId === id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {locality.name}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={handleLocate}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-2xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  <LocateFixed className="h-3 w-3" />
                  Use my location
                </button>
              </div>

              <div id="field-location">
                <IndoreMap
                  theme="light"
                  height={330}
                  riskCells={cityRisks}
                  localities={LOCALITIES}
                  layers={{ grid: true, heatmap: false, incidents: false, labels: true }}
                  picker
                  pickedLocation={location}
                  onPickLocation={handlePick}
                  focus={focus}
                  showLegend
                  ariaLabel="Pick the complaint location in Indore"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Crosshair className="h-3 w-3" />
                    {location
                      ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} · cell ${nearest?.cell.id}`
                      : 'No location selected yet'}
                  </span>
                  <span>Indore study area only</span>
                </div>
                <FieldError>{errors.location}</FieldError>
              </div>

              <Field label="Address or nearest landmark" htmlFor="address" error={errors.address} required>
                <Input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="e.g. Scheme 54, near Satya Sai Square"
                  maxLength={160}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Locality" htmlFor="locality" hint="Auto-detected from the pin">
                  <Select
                    id="locality"
                    value={localityId}
                    onChange={(event) => handleLocality(event.target.value)}
                  >
                    <option value="">Select locality</option>
                    {[...LOCALITIES]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <div className="flex items-end">
                  {cellRisk ? (
                    <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <div>
                        <p className="text-2xs text-muted-foreground">Linked cell risk</p>
                        <p className="text-xs font-medium">
                          {riskCategory === 'waterlogging' ? 'Waterlogging' : 'Road deterioration'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="num text-sm font-semibold">
                          {riskCategory === 'waterlogging'
                            ? pct(cellRisk.probability)
                            : `${Math.round(cellRisk.probability * 100)}/100`}
                        </span>
                        <RiskBadge level={cellRisk.level} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>3 · Describe it</CardTitle>
              <p className="text-xs text-muted-foreground">
                Specific details help the inspection team arrive prepared.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Short title"
                htmlFor="title"
                error={errors.title}
                hint={`${title.length}/90`}
                required
              >
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value.slice(0, 90))}
                  placeholder="e.g. Water pooling in front of the market"
                  maxLength={90}
                />
              </Field>
              <Field
                label="What did you observe?"
                htmlFor="description"
                error={errors.description}
                hint={`${description.length}/800`}
                required
              >
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 800))}
                  placeholder="When does it happen? How deep or large is it? Is it blocking traffic or entering homes?"
                  rows={5}
                  maxLength={800}
                />
              </Field>

              <div className="space-y-1.5">
                <Label>Photo (optional)</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
                {imageUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-border">
                    <img src={imageUrl} alt="Complaint attachment preview" className="h-44 w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-2">
                      <span className="truncate text-2xs text-muted-foreground">{imageName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl(undefined)
                          setImageName(undefined)
                        }}
                        className="inline-flex items-center gap-1 text-2xs font-medium text-destructive"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:bg-muted/40 disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">
                      {uploading ? 'Processing image…' : 'Add a road or site photo'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">JPG, PNG or WebP · up to 8 MB</span>
                  </button>
                )}
                <FieldError>{errors.image}</FieldError>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>4 · Your details</CardTitle>
              <p className="text-xs text-muted-foreground">
                Used only to reference the complaint in this demo. No account is created.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={errors.name} required>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
              </Field>
              <Field label="Mobile (optional)" htmlFor="phone" error={errors.phone} hint="10 digits">
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^\d\s]/g, '').slice(0, 12))}
                  placeholder="e.g. 98765 43210"
                  inputMode="tel"
                />
              </Field>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/citizen"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted-foreground' })}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={submitting || uploading} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle>What happens next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: 'Validated & geo-tagged', text: 'The report is linked to a 250 m grid cell and its risk context.' },
                { title: 'Zone review', text: 'The responsible department reviews the report and schedules an inspection.' },
                { title: 'Inspection & work', text: 'Status updates appear in My complaints. You can add more information at any time.' },
              ].map((step, index) => (
                <div key={step.title} className="flex gap-2.5">
                  <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="text-2xs leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              ))}
              <InlineNote className="mt-1">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Demo only: this report is stored in your browser and is not sent to Indore Municipal
                Corporation.
              </InlineNote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" />
                A useful photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-2xs leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  Show the full width of the road or drain, not just the damage.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  Include a landmark if it is safe to do so.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  Avoid photographing people&apos;s faces or vehicle number plates.
                </li>
              </ul>
            </CardContent>
          </Card>

          {cellRisk ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Why this cell matters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs text-muted-foreground">Linked cell</span>
                  <span className="text-xs font-medium">{cellRisk.cell.id}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs text-muted-foreground">
                    {riskCategory === 'waterlogging' ? 'Waterlogging risk' : 'Road pressure index'}
                  </span>
                  <span className="num text-xs font-semibold">
                    {riskCategory === 'waterlogging'
                      ? pct(cellRisk.probability)
                      : `${Math.round(cellRisk.probability * 100)}/100`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs text-muted-foreground">Top driver</span>
                  <span className="text-xs font-medium">{cellRisk.factors[0]?.label ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs text-muted-foreground">Elevation</span>
                  <span className="text-xs font-medium">{cellRisk.cell.elevation.toFixed(0)} m</span>
                </div>
                <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Illustrative scorer, not a trained model. The pin location is stored with the complaint.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-start gap-2 pt-5 text-2xs leading-relaxed text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Pick a location to see the linked cell&apos;s terrain and risk context.
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </>
  )
}
