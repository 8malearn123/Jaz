// Lightweight, dependency-free SVG charts for the data surfaces (org admin,
// staff console). Pure presentational — no state, SSR-safe. Colours come from
// the JAZ palette; pass `accent` to override. SVG is unaffected by `dir`, so
// time axes read consistently; surrounding labels follow the document locale.
import { cn } from '@/lib/cn'

const GOLD = '#b08a57'

/** Tiny inline trend line for KPI cards. */
export function Sparkline({ points, className, stroke = 'currentColor' }: { points: number[]; className?: string; stroke?: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const w = 100
  const h = 28
  const step = w / (points.length - 1)
  const d = points.map((p, i) => `${i * step},${h - ((p - min) / span) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('w-full h-7', className)} aria-hidden>
      <polyline points={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Filled area trend with a gradient, baseline grid and a marked last point. */
export function AreaTrend({
  points,
  labels,
  height = 132,
  accent = GOLD,
  format,
}: {
  points: number[]
  labels?: string[]
  height?: number
  accent?: string
  format?: (v: number) => string
}) {
  const max = Math.max(...points)
  const min = Math.min(...points, 0)
  const span = max - min || 1
  const w = 320
  const h = height
  const padTop = 10
  const padBottom = 4
  const plotH = h - padTop - padBottom
  const step = w / (points.length - 1)
  const x = (i: number) => i * step
  const y = (p: number) => padTop + plotH - ((p - min) / span) * plotH
  const line = points.map((p, i) => `${x(i)},${y(p)}`).join(' ')
  const area = `${x(0)},${h} ${line} ${x(points.length - 1)},${h}`
  const id = `area-${accent.replace('#', '')}`
  const lastX = x(points.length - 1)
  const lastY = y(points[points.length - 1])
  const peak = points.indexOf(max)

  return (
    <div className="flex flex-col gap-xs">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.26} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.5].map((g) => (
          <line key={g} x1="0" x2={w} y1={padTop + plotH * g} y2={padTop + plotH * g} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <polygon points={area} fill={`url(#${id})`} />
        <polyline points={line} fill="none" stroke={accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(peak)} cy={y(max)} r={3} fill="#fff" stroke={accent} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <circle cx={lastX} cy={lastY} r={4} fill={accent} vectorEffect="non-scaling-stroke" />
      </svg>
      {labels && (
        <div className="flex justify-between font-sans text-[10px] uppercase tracking-wide text-ink-subtle tabular-nums">
          {labels.map((l, i) => (
            <span key={i} className={cn(i === peak && 'text-primary-hover font-medium')}>{l}</span>
          ))}
        </div>
      )}
      {format && (
        <div className="flex justify-between font-sans text-caption text-ink-subtle">
          <span>{format(min)}</span>
          <span className="text-primary-hover">{format(max)}</span>
        </div>
      )}
    </div>
  )
}

/** Donut gauge — segmented ring (e.g. outstanding / reserved / available). */
export function UtilizationGauge({
  segments,
  centerValue,
  centerLabel,
  size = 160,
}: {
  segments: { value: number; color: string; label?: string }[]
  centerValue: string
  centerLabel: string
  size?: number
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = 52
  const c = 2 * Math.PI * r
  const stroke = 14
  let offset = 0
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const dash = `${len} ${c - len}`
          const el = (
            <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="flex flex-col">
          <span className="font-serif text-headline text-ink tabular-nums leading-none">{centerValue}</span>
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle mt-xs">{centerLabel}</span>
        </div>
      </div>
    </div>
  )
}

/** Horizontal ranked bars, normalised to the largest value. RTL-safe (flex). */
export function RankedBars({
  rows,
  accent = GOLD,
}: {
  rows: { label: string; value: number; display: string; tone?: 'gold' | 'success' | 'danger' }[]
  accent?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  const toneColor = (t?: string) => (t === 'success' ? '#355c4b' : t === 'danger' ? '#b5403b' : accent)
  return (
    <div className="flex flex-col gap-md">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-xxs">
          <div className="flex items-baseline justify-between gap-md">
            <span className="font-sans text-data text-ink truncate">{r.label}</span>
            <span className="font-sans text-data text-ink tabular-nums shrink-0">{r.display}</span>
          </div>
          <div className="h-2 rounded-pill bg-canvas-cool overflow-hidden">
            <span className="block h-full rounded-pill" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: toneColor(r.tone) }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** ↑/↓ delta chip for KPI cards. */
export function TrendPill({ delta }: { delta: number }) {
  const up = delta >= 0
  return (
    <span className={cn('inline-flex items-center gap-xxs font-sans text-caption tabular-nums rounded-pill px-1.5 py-0.5',
      up ? 'text-success bg-success/10' : 'text-danger bg-danger/10')}>
      {up ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  )
}
