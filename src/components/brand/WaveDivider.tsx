import { useId } from 'react'
import { cn } from '@/lib/cn'

interface WaveDividerProps {
  tone?: 'gold' | 'on-dark' | 'ink' | 'current'
  /** Scallop unit width in px (amplitude stays fixed regardless of panel width). */
  unit?: number
  height?: number
  flip?: boolean
  className?: string
}

const toneClass: Record<NonNullable<WaveDividerProps['tone']>, string> = {
  gold: 'text-primary',
  'on-dark': 'text-ink-on-dark',
  ink: 'text-ink',
  current: 'text-current',
}

/**
 * The signature scalloped seam — JAZ's defining non-type device.
 * Renders as a tiling SVG so amplitude stays fixed while it spans the full panel width.
 * Use it to transition image → text or color → white.
 */
export function WaveDivider({ tone = 'gold', unit = 26, height = 18, flip = false, className }: WaveDividerProps) {
  const id = useId().replace(/:/g, '')
  const mid = height / 2
  const amp = Math.min(mid - 2, 7)
  const top = flip ? mid + amp : mid - amp
  // one scallop bump
  const d = `M0 ${mid} Q ${unit / 2} ${top} ${unit} ${mid}`
  return (
    <svg
      className={cn('block w-full', toneClass[tone], className)}
      width="100%"
      height={height}
      aria-hidden
      role="presentation"
    >
      <defs>
        <pattern id={`wave-${id}`} width={unit} height={height} patternUnits="userSpaceOnUse">
          <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#wave-${id})`} />
    </svg>
  )
}
