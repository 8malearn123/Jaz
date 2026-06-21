import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { WaveDivider } from '@/components/brand/WaveDivider'

type Size = 'sm' | 'md' | 'lg' | 'xl'
const sizeClass: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  size?: Size
}

/** Brand-styled, RTL-aware dialog rendered in a portal. */
export function Modal({ open, onClose, title, eyebrow, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-lg" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-overlay/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-surface-1 shadow-soft-lg overflow-hidden flex flex-col max-h-[92vh]',
          'rounded-t-xl sm:rounded-xl animate-scale-in',
          sizeClass[size],
        )}
      >
        <WaveDivider tone="gold" height={14} />
        <div className="flex items-start justify-between gap-md px-lg pt-md pb-sm">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow text-primary-hover">{eyebrow}</p>}
            {title && <h2 className="font-serif text-headline text-ink leading-tight">{title}</h2>}
          </div>
          <button onClick={onClose} className="grid place-items-center w-9 h-9 -me-1 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="px-lg pb-lg overflow-y-auto">{children}</div>
        {footer && <div className="px-lg py-md border-t border-hairline bg-surface-2/60 flex items-center justify-end gap-sm">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
