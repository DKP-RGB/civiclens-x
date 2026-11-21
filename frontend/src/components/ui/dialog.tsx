import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function useDismiss(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])
  useDismiss(open, close)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-0 text-card-foreground shadow-raised animate-slide-up"
      >
        {children}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3 text-muted-foreground"
          onClick={close}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex flex-col gap-1 p-5 pr-12', className)}>{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight">{children}</h2>
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
}

export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-border px-5 py-3', className)}>
      {children}
    </div>
  )
}

export function Sheet({
  open,
  onOpenChange,
  children,
  widthClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  widthClassName?: string
}) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])
  useDismiss(open, close)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px] animate-fade-in"
        onClick={close}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-raised animate-slide-up',
          widthClassName,
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3 z-10 text-muted-foreground"
          onClick={close}
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight">{children}</h2>
}

export function SheetHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('border-b border-border p-5 pr-12', className)}>{children}</div>
}

export function SheetBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex-1 overflow-y-auto p-5', className)}>{children}</div>
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 border-t border-border p-4', className)}>
      {children}
    </div>
  )
}
