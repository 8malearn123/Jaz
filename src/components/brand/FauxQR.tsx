import { useMemo } from 'react'

/** A deterministic QR-like glyph derived from a string — stands in for the ZATCA TLV QR. */
export function FauxQR({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  const modules = 21
  const cells = useMemo(() => {
    // simple deterministic hash → bit grid
    const grid: boolean[] = []
    let h = 2166136261
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    let x = h >>> 0
    const rng = () => {
      x ^= x << 13
      x ^= x >>> 17
      x ^= x << 5
      return ((x >>> 0) % 1000) / 1000
    }
    for (let i = 0; i < modules * modules; i++) grid.push(rng() > 0.5)
    return grid
  }, [value])

  const cell = size / modules
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7
    return inBox(0, 0) || inBox(0, modules - 7) || inBox(modules - 7, 0)
  }
  const finderOn = (r: number, c: number) => {
    const ring = (br: number, bc: number) => {
      const rr = r - br, cc = c - bc
      if (rr < 0 || rr > 6 || cc < 0 || cc > 6) return null
      const edge = rr === 0 || rr === 6 || cc === 0 || cc === 6
      const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4
      return edge || core
    }
    return ring(0, 0) ?? ring(0, modules - 7) ?? ring(modules - 7, 0) ?? false
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label="QR code">
      <rect width={size} height={size} fill="#ffffff" />
      {Array.from({ length: modules }).map((_, r) =>
        Array.from({ length: modules }).map((_, c) => {
          const on = isFinder(r, c) ? finderOn(r, c) : cells[r * modules + c]
          return on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#241712" /> : null
        }),
      )}
    </svg>
  )
}
