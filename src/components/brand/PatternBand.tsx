import { useId } from 'react'
import { cn } from '@/lib/cn'

export type Motif = 'jasmine' | 'coffee' | 'mango' | 'wave' | 'mountain'

// Gold line-patterns drawn from five Jazan motifs. Rendered at low contrast,
// never behind body text — used as section breaks, hero texture, and panel seams.
const MOTIF_TILE: Record<Motif, { size: number; paths: string[] }> = {
  jasmine: {
    size: 56,
    paths: [
      // five-petal jasmine (الفُل)
      'M28 18 C 24 12, 16 14, 18 22 C 12 22, 12 30, 19 31 C 16 38, 23 42, 28 36 C 33 42, 40 38, 37 31 C 44 30, 44 22, 38 22 C 40 14, 32 12, 28 18 Z',
      'M28 26 a 2 2 0 1 0 0.1 0 Z',
    ],
  },
  coffee: {
    size: 44,
    paths: [
      // Khawlani coffee bean
      'M22 8 C 31 8, 36 16, 36 22 C 36 28, 31 36, 22 36 C 13 36, 8 28, 8 22 C 8 16, 13 8, 22 8 Z',
      'M16 12 C 22 18, 22 26, 16 32',
    ],
  },
  mango: {
    size: 50,
    paths: [
      // Jazani mango
      'M25 10 C 36 10, 42 20, 38 30 C 34 39, 22 42, 15 35 C 9 29, 11 16, 25 10 Z',
      'M25 10 C 25 6, 28 5, 31 6',
    ],
  },
  wave: {
    size: 60,
    paths: [
      'M2 22 Q 17 10, 32 22 T 60 22',
      'M2 34 Q 17 22, 32 34 T 60 34',
    ],
  },
  mountain: {
    size: 64,
    paths: [
      // Jazan mountains
      'M2 44 L 18 18 L 30 34 L 44 12 L 62 44',
      'M2 50 L 62 50',
    ],
  },
}

interface PatternBandProps {
  motif?: Motif
  height?: number
  opacity?: number
  tone?: 'gold' | 'on-dark' | 'ink'
  scale?: number
  className?: string
}

const toneClass = {
  gold: 'text-primary',
  'on-dark': 'text-ink-on-dark',
  ink: 'text-ink',
} as const

/** A decorative band of Jazan-motif gold line-work. */
export function PatternBand({
  motif = 'jasmine',
  height = 96,
  opacity = 0.16,
  tone = 'gold',
  scale = 1,
  className,
}: PatternBandProps) {
  const id = useId().replace(/:/g, '')
  const tile = MOTIF_TILE[motif]
  const size = tile.size * scale
  return (
    <div
      className={cn('w-full overflow-hidden', toneClass[tone], className)}
      style={{ height }}
      aria-hidden
      role="presentation"
    >
      <svg className="w-full h-full" style={{ opacity }}>
        <defs>
          <pattern
            id={`pat-${id}`}
            width={size}
            height={size}
            patternUnits="userSpaceOnUse"
            patternTransform={`scale(${scale})`}
          >
            {tile.paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#pat-${id})`} />
      </svg>
    </div>
  )
}

/** A single motif glyph, e.g. for inline accents and bullets. */
export function MotifGlyph({ motif, size = 22, className }: { motif: Motif; size?: number; className?: string }) {
  const tile = MOTIF_TILE[motif]
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${tile.size} ${tile.size}`}
      className={cn('text-primary', className)}
      fill="none"
      aria-hidden
    >
      {tile.paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}
