import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Uppercase functional label (Gotham voice). */
export function Eyebrow({ children, tone = 'gold', className }: { children: ReactNode; tone?: 'gold' | 'muted' | 'on-dark'; className?: string }) {
  const c = tone === 'gold' ? 'text-primary-hover' : tone === 'on-dark' ? 'text-primary-bright' : 'text-ink-subtle'
  return <span className={cn('eyebrow', c, className)}>{children}</span>
}

/** Rating stars. */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(value)
        return (
          <Star
            key={i}
            size={size}
            className={filled ? 'text-primary' : 'text-hairline-strong'}
            fill={filled ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        )
      })}
    </span>
  )
}

/** Small status / meta pill. */
export function StatusBadge({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode
  variant?: 'neutral' | 'gold' | 'success' | 'limited' | 'danger'
  className?: string
}) {
  const styles: Record<string, string> = {
    neutral: 'bg-surface-2 text-ink-muted border border-hairline',
    gold: 'bg-primary/12 text-primary-hover border border-primary/30',
    success: 'bg-success/12 text-success border border-success/30',
    limited: 'bg-flavor-rose/12 text-flavor-rose border border-flavor-rose/30',
    danger: 'bg-danger/10 text-danger border border-danger/30',
  }
  return <span className={cn('badge font-sans uppercase tracking-[0.08em]', styles[variant], className)}>{children}</span>
}

/** Oversized gold quotation glyph used to open pull quotes. */
export function QuoteGlyph({ className }: { className?: string }) {
  return (
    <span className={cn('font-serif text-primary leading-none select-none', className)} aria-hidden>
      &ldquo;
    </span>
  )
}
