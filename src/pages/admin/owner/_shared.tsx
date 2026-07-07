import type { ReactNode } from 'react'
import { useLocale } from '@/i18n/LocaleContext'
import { cn } from '@/lib/cn'

/** Interpolate `{name}` placeholders in a dictionary string. */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

/** Panel header — title + optional subtitle + optional right-side action. */
export function PanelHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-md">
      <div>
        <h2 className="font-serif text-headline text-ink">{title}</h2>
        {subtitle && <p className="font-sans text-caption text-ink-subtle mt-xxs">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type StatTone = 'plain' | 'dark' | 'gold' | 'green'
/** Stat strip card with tonal variants (mirrors the prototype's stripCard). */
export function StatCard({ label, value, unit, sub, tone = 'plain' }: { label: string; value: string; unit?: string; sub?: string; tone?: StatTone }) {
  const dark = tone === 'dark'
  return (
    <div className={cn('rounded-lg border p-lg flex flex-col gap-xs', dark ? 'bg-surface-dark-1 border-hairline-dark' : 'card', tone === 'gold' && 'ring-1 ring-primary/25')}>
      <span className={cn('font-sans text-caption uppercase tracking-[0.12em]', dark ? 'text-primary-bright' : 'text-ink-subtle')}>{label}</span>
      <span className={cn('font-serif text-headline tabular-nums leading-none', dark ? 'text-ink-on-dark' : tone === 'gold' ? 'text-primary-hover' : tone === 'green' ? 'text-success' : 'text-ink')}>
        {value}{unit && <span className={cn('font-sans text-data ms-1', dark ? 'text-primary-bright' : 'text-ink-subtle')}>{unit}</span>}
      </span>
      {sub && <span className={cn('font-sans text-caption', dark ? 'text-ink-on-dark-muted' : 'text-ink-subtle')}>{sub}</span>}
    </div>
  )
}

/** Colored status pill (owner statuses carry their own palette). */
export function Pill({ color, bg, children }: { color: string; bg: string; children: ReactNode }) {
  return <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium" style={{ color, backgroundColor: bg }}>{children}</span>
}

/** Segmented tab control. */
export function SegTabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-hairline-strong p-0.5 self-start bg-surface-1">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} aria-pressed={active === t.id} className={cn('inline-flex items-center gap-xs px-3.5 py-1.5 rounded-sm font-sans text-data transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40', active === t.id ? 'bg-ink text-ink-on-dark' : 'text-ink-muted hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Filter chips with counts — light, low-weight, toggle semantics. Optional lead label names the filter group. */
export function FilterChips<T extends string>({ chips, active, onChange, label }: { chips: { id: T; label: string; count: number }[]; active: T; onChange: (id: T) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {label && <span className="me-1.5 shrink-0 font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{label}</span>}
      {chips.map((c) => {
        const on = c.id === active
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-sans text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              on ? 'bg-ink text-ink-on-dark' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {c.label}
            <span className={cn('tabular-nums text-[0.7rem] leading-none', on ? 'text-ink-on-dark/55' : 'text-ink-subtle')}>{c.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Utilization bar with an optional reorder-point marker. */
export function UtilBar({ pct, color, marker }: { pct: number; color: string; marker?: number }) {
  return (
    <div className="relative h-2 rounded-pill bg-canvas-cool overflow-hidden">
      <span className="block h-full rounded-pill" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
      {marker != null && <span className="absolute top-0 bottom-0 w-0.5 bg-ink/40" style={{ insetInlineStart: `${Math.min(100, marker)}%` }} />}
    </div>
  )
}

/** Owner money — always minor→formatted via the shared formatter, tabular. */
export function useMoney() {
  const { money } = useLocale()
  return money
}
