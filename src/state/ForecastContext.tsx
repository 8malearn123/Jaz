import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clientForecastsSeed, forecastMonths, FORECAST_NEAR_MONTHS, type ClientForecast } from '@/data/forecasts'

// Yearly order forecasts live above both portals: the partner edits their own
// plan, the export manager tunes each client's change tolerance, and the owner
// calendar reads everything — one shared state.

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

interface ForecastCtx {
  forecasts: ClientForecast[]
  // the committed baseline (what tolerance is measured against) — frozen at plan submission
  committedOf: (clientId: string, monthKey: string, sku: string) => number
  // allowed range for a cell; null = free edit (outside the near window)
  allowedRange: (clientId: string, monthKey: string, sku: string) => { min: number; max: number } | null
  // set a forecast quantity — clamped to the allowed range inside the near window
  setQty: (clientId: string, monthKey: string, sku: string, qty: number) => void
  // export-manager control: per-client change tolerance (±%)
  setChangeLimit: (clientId: string, pct: number) => void
}

const Ctx = createContext<ForecastCtx | null>(null)

export function ForecastProvider({ children }: { children: ReactNode }) {
  const [forecasts, setForecasts] = useState<ClientForecast[]>(() => clone(clientForecastsSeed))
  // committed baseline never changes in-session — tolerance is measured against it
  const [committed] = useState<ClientForecast[]>(() => clone(clientForecastsSeed))

  const committedOf = useCallback((clientId: string, monthKey: string, sku: string) =>
    committed.find((f) => f.clientId === clientId)?.qty[monthKey]?.[sku] ?? 0, [committed])

  const allowedRange = useCallback((clientId: string, monthKey: string, sku: string) => {
    const idx = forecastMonths.findIndex((m) => m.key === monthKey)
    if (idx < 0 || idx >= FORECAST_NEAR_MONTHS) return null
    const f = forecasts.find((x) => x.clientId === clientId)
    if (!f) return null
    const base = committedOf(clientId, monthKey, sku)
    const delta = base * (f.changeLimitPct / 100)
    return { min: Math.max(0, Math.floor(base - delta)), max: Math.ceil(base + delta) }
  }, [forecasts, committedOf])

  const setQty = useCallback((clientId: string, monthKey: string, sku: string, qty: number) => {
    const range = allowedRange(clientId, monthKey, sku)
    const next = Math.max(0, range ? Math.min(range.max, Math.max(range.min, qty)) : qty)
    setForecasts((prev) => prev.map((f) => f.clientId === clientId
      ? { ...f, qty: { ...f.qty, [monthKey]: { ...f.qty[monthKey], [sku]: next } } }
      : f))
  }, [allowedRange])

  const setChangeLimit = useCallback((clientId: string, pct: number) =>
    setForecasts((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, changeLimitPct: Math.max(0, Math.min(100, pct)) } : f))), [])

  return <Ctx.Provider value={{ forecasts, committedOf, allowedRange, setQty, setChangeLimit }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useForecast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useForecast must be used within ForecastProvider')
  return ctx
}
