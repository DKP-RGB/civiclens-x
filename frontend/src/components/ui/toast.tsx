import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

let toastCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const remove = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback<ToastContextValue['toast']>(
    ({ title, description, variant = 'default' }) => {
      const id = ++toastCounter
      setItems((current) => [...current.slice(-2), { id, title, description, variant }])
      window.setTimeout(() => remove(id), 5000)
    },
    [remove],
  )

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((item) => {
          const Icon =
            item.variant === 'success'
              ? CheckCircle2
              : item.variant === 'error'
                ? AlertTriangle
                : Info
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-raised animate-slide-up',
                item.variant === 'success' && 'border-emerald-500/30',
                item.variant === 'error' && 'border-destructive/40',
              )}
              role="status"
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  item.variant === 'success' && 'text-emerald-600',
                  item.variant === 'error' && 'text-destructive',
                  item.variant === 'default' && 'text-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
