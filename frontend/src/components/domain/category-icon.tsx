import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CircleDot, Construction, Droplets, Trash2, Waves } from 'lucide-react'
import type { IncidentCategory, RiskCategory } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORY_ICONS: Record<IncidentCategory, LucideIcon> = {
  potholes: CircleDot,
  waterlogging: Waves,
  garbage: Trash2,
  drainage: Droplets,
  road_damage: Construction,
  other: AlertTriangle,
}

export function CategoryIcon({
  category,
  className,
}: {
  category: IncidentCategory
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category]
  return <Icon className={cn('h-4 w-4', className)} />
}

export function RiskCategoryIcon({
  category,
  className,
}: {
  category: RiskCategory
  className?: string
}) {
  const Icon = category === 'waterlogging' ? Waves : Construction
  return <Icon className={cn('h-4 w-4', className)} />
}

export { CATEGORY_ICONS }
