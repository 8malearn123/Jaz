import { useId } from 'react'
import { cn } from '@/lib/cn'

interface JazanSceneProps {
  className?: string
  /** 'dark' draws gold line-work for dark panels; 'light' draws on canvas. */
  tone?: 'dark' | 'light'
}

/**
 * A painterly-by-suggestion line illustration of Jazan agricultural life:
 * the southern mountains, a low sun, jasmine vines, and the sea. Original-feeling
 * brand artwork standing in for the licensed packaging illustration.
 */
export function JazanScene({ className, tone = 'dark' }: JazanSceneProps) {
  const id = useId().replace(/:/g, '')
  const line = tone === 'dark' ? '#b08a57' : '#8a6b3f'
  const fill = tone === 'dark' ? '#cdaa77' : '#b08a57'
  return (
    <svg viewBox="0 0 720 480" className={cn('w-full h-full', className)} aria-hidden role="presentation" fill="none">
      <defs>
        <linearGradient id={`sun-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.62" cy="0.42" r="0.5">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="720" height="480" fill={`url(#glow-${id})`} />

      {/* low sun */}
      <circle cx="448" cy="208" r="64" fill={`url(#sun-${id})`} opacity="0.5" />
      <circle cx="448" cy="208" r="64" stroke={line} strokeWidth="1.5" opacity="0.7" />

      {/* sun rays / latitude lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1="120" y1={150 + i * 18} x2="600" y2={150 + i * 18} stroke={line} strokeWidth="0.8" opacity={0.18 - i * 0.02} />
      ))}

      {/* far mountains (Jazan range) */}
      <path d="M0 300 L 90 232 L 168 290 L 250 214 L 340 296 L 430 236 L 540 300 L 640 244 L 720 300 L 720 480 L 0 480 Z" fill={line} opacity="0.1" />
      <path d="M0 300 L 90 232 L 168 290 L 250 214 L 340 296 L 430 236 L 540 300 L 640 244 L 720 300" stroke={line} strokeWidth="1.4" opacity="0.55" />

      {/* sea waves */}
      {Array.from({ length: 3 }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${360 + i * 26} Q 120 ${344 + i * 26}, 240 ${360 + i * 26} T 480 ${360 + i * 26} T 720 ${360 + i * 26}`}
          stroke={line}
          strokeWidth="1.2"
          opacity={0.4 - i * 0.08}
          strokeLinecap="round"
        />
      ))}

      {/* jasmine vine, inline-start */}
      <g stroke={line} strokeWidth="1.4" opacity="0.7" strokeLinecap="round">
        <path d="M70 480 C 96 400, 60 340, 96 280 C 120 240, 96 200, 120 160" fill="none" />
        {[300, 250, 200, 170].map((y, i) => (
          <g key={i} transform={`translate(${96 + (i % 2 === 0 ? -2 : 18)}, ${y})`}>
            <path d="M0 0 C -8 -10, -22 -6, -18 6 C -28 6, -28 18, -16 19 C -20 30, -8 34, 0 26 C 8 34, 20 30, 16 19 C 28 18, 28 6, 18 6 C 22 -6, 8 -10, 0 0 Z" fill={fill} fillOpacity="0.12" />
          </g>
        ))}
      </g>

      {/* coffee branch, inline-end */}
      <g stroke={line} strokeWidth="1.4" opacity="0.6" strokeLinecap="round">
        <path d="M650 480 C 624 410, 664 360, 632 300" fill="none" />
        {[420, 372, 330].map((y, i) => (
          <ellipse key={i} cx={i % 2 === 0 ? 636 : 648} cy={y} rx="9" ry="13" fill={fill} fillOpacity="0.14" transform={`rotate(${i % 2 === 0 ? -18 : 18} ${i % 2 === 0 ? 636 : 648} ${y})`} />
        ))}
      </g>
    </svg>
  )
}
