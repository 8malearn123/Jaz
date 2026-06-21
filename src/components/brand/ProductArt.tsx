import { useId } from 'react'
import { cn } from '@/lib/cn'
import { flavors } from '@/data/flavors'
import type { FlavorId } from '@/data/types'
import { tint, shade } from '@/lib/cn'
import type { Motif } from './PatternBand'

const flavorMotif: Record<FlavorId, Motif> = {
  milk: 'wave',
  lavender: 'jasmine',
  rose: 'jasmine',
  jasmine: 'jasmine',
  papaya: 'mango',
  mango: 'mango',
  coffee: 'coffee',
  dark: 'mountain',
}

interface ProductArtProps {
  flavorId: FlavorId
  kind?: 'bar' | 'box'
  className?: string
  /** Render the embossed JAZ wordmark on the bar */
  branded?: boolean
}

/**
 * Illustration that stands in for the cinematic product photography described in the
 * design system: an embossed, flavor-keyed chocolate bar (or gift box) on a tinted panel.
 * Gradients are permitted here — they live *inside* the flavor art surface only.
 */
export function ProductArt({ flavorId, kind = 'bar', className, branded = true }: ProductArtProps) {
  const id = useId().replace(/:/g, '')
  const f = flavors[flavorId]
  const accent = f.accent
  const light = tint(accent, 42)
  const dark = shade(accent, 78)
  const panelA = tint(accent, 16)
  const panelB = tint(accent, 6)

  // 3 columns × 4 rows of embossed squares
  const cols = 3
  const rows = 4
  const bx = 116
  const by = 78
  const bw = 168
  const bh = 244
  const cw = bw / cols
  const ch = bh / rows

  return (
    <svg
      viewBox="0 0 400 400"
      className={cn('w-full h-full', className)}
      role="img"
      aria-label={`${f.name.en} chocolate`}
    >
      <defs>
        <linearGradient id={`panel-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={panelA} />
          <stop offset="100%" stopColor={panelB} />
        </linearGradient>
        <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={accent} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`sheen-${id}`} cx="0.32" cy="0.2" r="0.8">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* tinted panel */}
      <rect x="0" y="0" width="400" height="400" fill={`url(#panel-${id})`} />

      {/* faint motif watermark */}
      <g style={{ color: accent, opacity: 0.1 }}>
        <MotifWatermark motif={flavorMotif[flavorId]} />
      </g>

      {/* soft ground shadow */}
      <ellipse cx="200" cy="344" rx="104" ry="18" fill={dark} opacity="0.18" />

      {kind === 'bar' ? (
        <g>
          {/* bar body */}
          <rect x={bx} y={by} width={bw} height={bh} rx="14" fill={`url(#bar-${id})`} />
          {/* embossed squares */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const x = bx + c * cw + 6
              const y = by + r * ch + 6
              const w = cw - 12
              const h = ch - 12
              return (
                <g key={`${r}-${c}`}>
                  {/* top-left light bevel */}
                  <path d={`M${x} ${y + h} L${x} ${y} L${x + w} ${y}`} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" />
                  {/* bottom-right dark bevel */}
                  <path d={`M${x} ${y + h} L${x + w} ${y + h} L${x + w} ${y}`} fill="none" stroke={dark} strokeOpacity="0.55" strokeWidth="2" />
                </g>
              )
            }),
          )}
          {/* embossed wordmark */}
          {branded && (
            <g>
              <text
                x={bx + bw / 2}
                y={by + bh / 2 + 6}
                textAnchor="middle"
                fontFamily="Fraunces, Georgia, serif"
                fontSize="30"
                fontWeight={500}
                letterSpacing="2"
                fill={dark}
                opacity="0.5"
              >
                JAZ
              </text>
              <text
                x={bx + bw / 2}
                y={by + bh / 2 + 5}
                textAnchor="middle"
                fontFamily="Fraunces, Georgia, serif"
                fontSize="30"
                fontWeight={500}
                letterSpacing="2"
                fill="#ffffff"
                opacity="0.22"
              >
                JAZ
              </text>
            </g>
          )}
          {/* sheen */}
          <rect x={bx} y={by} width={bw} height={bh} rx="14" fill={`url(#sheen-${id})`} />
        </g>
      ) : (
        <g>
          {/* gift box base */}
          <rect x="98" y="150" width="204" height="170" rx="12" fill={`url(#bar-${id})`} />
          {/* lid */}
          <rect x="86" y="120" width="228" height="52" rx="10" fill={accent} />
          <rect x="86" y="120" width="228" height="52" rx="10" fill="#ffffff" opacity="0.08" />
          {/* ribbon */}
          <rect x="188" y="120" width="24" height="200" fill={dark} opacity="0.5" />
          <path d="M200 120 C 168 92, 150 116, 188 132 M200 120 C 232 92, 250 116, 212 132" fill="none" stroke={dark} strokeOpacity="0.6" strokeWidth="6" strokeLinecap="round" />
          <circle cx="200" cy="124" r="9" fill={light} />
          {branded && (
            <text x="200" y="206" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="22" letterSpacing="2" fill="#ffffff" opacity="0.85">
              JAZ
            </text>
          )}
          <rect x="98" y="150" width="204" height="170" rx="12" fill={`url(#sheen-${id})`} />
        </g>
      )}
    </svg>
  )
}

function MotifWatermark({ motif }: { motif: Motif }) {
  // a single large motif centered as a watermark
  const map: Record<Motif, string[]> = {
    jasmine: [
      'M200 120 C 176 84, 128 96, 140 144 C 104 144, 104 192, 146 198 C 128 240, 170 264, 200 228 C 230 264, 272 240, 254 198 C 296 192, 296 144, 260 144 C 272 96, 224 84, 200 120 Z',
    ],
    coffee: ['M200 96 C 256 96, 290 140, 290 176 C 290 212, 256 256, 200 256 C 144 256, 110 212, 110 176 C 110 140, 144 96, 200 96 Z', 'M164 120 C 200 160, 200 200, 164 232'],
    mango: ['M210 92 C 280 92, 320 156, 296 216 C 270 270, 168 286, 126 240 C 88 200, 110 120, 210 92 Z'],
    wave: ['M40 200 Q 130 140, 220 200 T 400 200', 'M0 250 Q 90 190, 180 250 T 360 250'],
    mountain: ['M30 300 L 130 120 L 210 230 L 300 90 L 380 300'],
  }
  return (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {map[motif].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  )
}
