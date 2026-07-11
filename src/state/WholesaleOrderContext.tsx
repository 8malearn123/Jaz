import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useCart } from '@/state/CartContext'
import { MOQ_MINOR, wholesaleBySku, wholesaleProducts, wholesaleUnitPrice } from '@/data/wholesale'

const VAT_RATE = 0.15

interface WholesaleOrderValue {
  /** Draft quantities keyed by SKU (the wholesale basket, before it hits the cart). */
  qty: Record<string, number>
  setQty: (sku: string, n: number) => void
  inc: (sku: string) => void
  dec: (sku: string) => void
  clear: () => void
  lineCount: number
  subtotalMinor: number
  savingsMinor: number
  vatMinor: number
  totalMinor: number
  moqMet: boolean
  moqRemainingMinor: number
  /** Push the draft lines into the shared cart (exact quantities). Returns line count, then clears the draft. */
  commitToCart: () => number
}

const WholesaleOrderContext = createContext<WholesaleOrderValue | null>(null)

export function WholesaleOrderProvider({ children }: { children: ReactNode }) {
  const cart = useCart()
  // Quantities always start at zero — the buyer builds the order from scratch.
  const [qty, setQtyState] = useState<Record<string, number>>({})

  // Clamp to [0,999]; snap a positive value up to the product's minimum order qty.
  const setQty = useCallback((sku: string, n: number) => {
    const p = wholesaleBySku(sku)
    const min = p ? p.minQty : 1
    let v = Math.round(Number.isFinite(n) ? n : 0) || 0
    if (v <= 0) v = 0
    else v = Math.min(999, Math.max(v, min))
    setQtyState((s) => ({ ...s, [sku]: v }))
  }, [])

  const inc = useCallback((sku: string) => {
    setQty(sku, (qty[sku] || 0) + 1)
  }, [qty, setQty])

  // Stepping down from the minimum drops the line to zero (matches the prototype).
  const dec = useCallback((sku: string) => {
    const p = wholesaleBySku(sku)
    const min = p ? p.minQty : 1
    const cur = qty[sku] || 0
    const next = cur <= min ? 0 : cur - 1
    setQtyState((s) => ({ ...s, [sku]: next }))
  }, [qty])

  const clear = useCallback(() => setQtyState({}), [])

  const { lineCount, subtotalMinor, savingsMinor } = useMemo(() => {
    let subtotal = 0, base = 0, count = 0
    for (const p of wholesaleProducts) {
      const q = qty[p.sku] || 0
      if (q <= 0) continue
      subtotal += q * wholesaleUnitPrice(p, q)
      base += q * p.priceMinor
      count++
    }
    return { lineCount: count, subtotalMinor: subtotal, savingsMinor: base - subtotal }
  }, [qty])

  const vatMinor = Math.round(subtotalMinor * VAT_RATE)
  const totalMinor = subtotalMinor + vatMinor
  const moqMet = subtotalMinor >= MOQ_MINOR
  const moqRemainingMinor = Math.max(0, MOQ_MINOR - subtotalMinor)

  const commitToCart = useCallback(() => {
    let count = 0
    for (const p of wholesaleProducts) {
      const q = qty[p.sku] || 0
      if (q <= 0) continue
      const existing = cart.lines.find((l) => l.variantId === p.sku)
      if (existing) cart.setQty(p.sku, q)
      else cart.add(p.sku, q)
      count++
    }
    setQtyState({})
    return count
  }, [qty, cart])

  const value = useMemo<WholesaleOrderValue>(
    () => ({ qty, setQty, inc, dec, clear, lineCount, subtotalMinor, savingsMinor, vatMinor, totalMinor, moqMet, moqRemainingMinor, commitToCart }),
    [qty, setQty, inc, dec, clear, lineCount, subtotalMinor, savingsMinor, vatMinor, totalMinor, moqMet, moqRemainingMinor, commitToCart],
  )

  return <WholesaleOrderContext.Provider value={value}>{children}</WholesaleOrderContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWholesaleOrder() {
  const ctx = useContext(WholesaleOrderContext)
  if (!ctx) throw new Error('useWholesaleOrder must be used within WholesaleOrderProvider')
  return ctx
}
