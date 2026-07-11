import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

// Owner-controlled brand identity: the system accent color and the logo.
// Colors are applied as CSS variables (see index.css / tailwind.config.js),
// so every primary-toned surface across the platform retints live.

export const DEFAULT_PRIMARY = '#b08a57'

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]
}
const scale = (rgb: [number, number, number], f: number): [number, number, number] =>
  rgb.map((c) => Math.max(0, Math.min(255, Math.round(f > 1 ? c + (255 - c) * (f - 1) : c * f)))) as [number, number, number]
const chan = (rgb: [number, number, number]) => rgb.join(' ')

interface BrandCtx {
  primary: string // hex
  setPrimary: (hex: string) => void
  resetPrimary: () => void
  logoUrl: string | null
  logoName: string | null
  setLogo: (url: string, name: string) => void
  clearLogo: () => void
}

const Ctx = createContext<BrandCtx | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [primary, setPrimaryState] = useState(DEFAULT_PRIMARY)
  const [logo, setLogoState] = useState<{ url: string; name: string } | null>(null)

  // Hover (darker) and bright (lighter) shades derive from the chosen accent,
  // exactly like the default gold family.
  useEffect(() => {
    const rgb = hexToRgb(primary)
    const root = document.documentElement
    root.style.setProperty('--brand-primary', chan(rgb))
    root.style.setProperty('--brand-primary-hover', chan(scale(rgb, 0.78)))
    root.style.setProperty('--brand-primary-bright', chan(scale(rgb, 1.16)))
    root.style.setProperty('--focus-ring', `rgba(${rgb.join(', ')}, 0.6)`)
  }, [primary])

  const setPrimary = useCallback((hex: string) => { if (/^#[0-9a-fA-F]{6}$/.test(hex) || /^#[0-9a-fA-F]{3}$/.test(hex)) setPrimaryState(hex) }, [])
  const resetPrimary = useCallback(() => setPrimaryState(DEFAULT_PRIMARY), [])
  const setLogo = useCallback((url: string, name: string) => setLogoState({ url, name }), [])
  const clearLogo = useCallback(() => setLogoState(null), [])

  const value = useMemo<BrandCtx>(() => ({
    primary, setPrimary, resetPrimary,
    logoUrl: logo?.url ?? null, logoName: logo?.name ?? null, setLogo, clearLogo,
  }), [primary, setPrimary, resetPrimary, logo, setLogo, clearLogo])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBrand() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
