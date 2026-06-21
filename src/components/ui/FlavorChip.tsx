import { cn } from '@/lib/cn'

interface FlavorChipProps {
  label: string
  accent?: string
  active?: boolean
  onClick?: () => void
  className?: string
}

/** Flavor / category selector pill. Grows to a comfortable touch target. */
export function FlavorChip({ label, accent, active = false, onClick, className }: FlavorChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'chip font-sans uppercase tracking-[0.08em] min-h-[40px]',
        active
          ? 'bg-ink text-ink-on-dark border-ink'
          : 'bg-canvas-cool text-ink-muted border-hairline hover:border-hairline-strong hover:text-ink',
        className,
      )}
      style={active && accent ? { backgroundColor: accent, borderColor: accent, color: '#fff' } : undefined}
    >
      {accent && (
        <span
          className="inline-block w-2 h-2 rounded-pill"
          style={{ backgroundColor: active ? '#ffffff' : accent }}
          aria-hidden
        />
      )}
      {label}
    </button>
  )
}
