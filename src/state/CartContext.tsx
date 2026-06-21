import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { variantById } from '@/data/products'
import { useChannel } from './ChannelContext'

export interface CartLine {
  variantId: string
  qty: number
  isGift?: boolean
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  add: (variantId: string, qty?: number) => void
  setQty: (variantId: string, qty: number) => void
  remove: (variantId: string) => void
  clear: () => void
  toggleGift: (variantId: string, isGift: boolean) => void
  /** Unit price for a variant in the active channel (B2C retail vs B2B account). */
  unitPrice: (variantId: string) => number
  subtotalMinor: number
  discountMinor: number
  vatMinor: number
  shippingMinor: number
  coldChainMinor: number
  totalMinor: number
  hasColdChain: boolean
  promoCode: string | null
  /** Apply a promo code; returns whether it was valid. */
  applyPromo: (code: string) => boolean
  clearPromo: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'jaz.cart'
const VAT_RATE = 0.15
const FREE_SHIPPING_THRESHOLD = 20000 // SAR 200 (in halalas)
const SHIPPING_MINOR = 2500 // SAR 25
const COLD_CHAIN_MINOR = 1500 // SAR 15 handling

// Demo promo codes: percentage off, or a fixed amount in halalas.
const PROMOS: Record<string, { pct?: number; fixed?: number }> = {
  JAZ10: { pct: 0.1 },
  RAMADAN15: { pct: 0.15 },
  WELCOME20: { fixed: 2000 },
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { channel } = useChannel()
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as CartLine[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const add = useCallback((variantId: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === variantId)
      if (existing) {
        return prev.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
      }
      return [...prev, { variantId, qty }]
    })
  }, [])

  const setQty = useCallback((variantId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
    )
  }, [])

  const remove = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId))
  }, [])

  const [promoCode, setPromoCode] = useState<string | null>(null)

  const clear = useCallback(() => {
    setLines([])
    setPromoCode(null)
  }, [])

  const applyPromo = useCallback((code: string) => {
    const key = code.trim().toUpperCase()
    if (PROMOS[key]) {
      setPromoCode(key)
      return true
    }
    return false
  }, [])

  const clearPromo = useCallback(() => setPromoCode(null), [])

  const toggleGift = useCallback((variantId: string, isGift: boolean) => {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, isGift } : l)))
  }, [])

  const unitPrice = useCallback(
    (variantId: string) => {
      const found = variantById(variantId)
      if (!found) return 0
      return channel === 'b2b' ? found.variant.b2bPriceMinor : found.variant.retailPriceMinor
    },
    [channel],
  )

  const { subtotalMinor, hasColdChain } = useMemo(() => {
    let subtotal = 0
    let cold = false
    for (const line of lines) {
      const found = variantById(line.variantId)
      if (!found) continue
      subtotal += unitPrice(line.variantId) * line.qty
      if (found.variant.requiresColdChain) cold = true
    }
    return { subtotalMinor: subtotal, hasColdChain: cold }
  }, [lines, unitPrice])

  const promo = promoCode ? PROMOS[promoCode] : null
  const discountMinor = !promo || subtotalMinor === 0 ? 0 : Math.min(subtotalMinor, promo.pct ? Math.round(subtotalMinor * promo.pct) : promo.fixed ?? 0)
  const discountedSubtotal = subtotalMinor - discountMinor

  const shippingMinor = lines.length === 0 || subtotalMinor >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_MINOR
  const coldChainMinor = hasColdChain && lines.length > 0 ? COLD_CHAIN_MINOR : 0
  const vatMinor = Math.round(discountedSubtotal * VAT_RATE)
  const totalMinor = discountedSubtotal + vatMinor + shippingMinor + coldChainMinor
  const count = lines.reduce((n, l) => n + l.qty, 0)

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      add,
      setQty,
      remove,
      clear,
      toggleGift,
      unitPrice,
      subtotalMinor,
      discountMinor,
      vatMinor,
      shippingMinor,
      coldChainMinor,
      totalMinor,
      hasColdChain,
      promoCode,
      applyPromo,
      clearPromo,
    }),
    [
      lines,
      count,
      add,
      setQty,
      remove,
      clear,
      toggleGift,
      unitPrice,
      subtotalMinor,
      discountMinor,
      vatMinor,
      shippingMinor,
      coldChainMinor,
      totalMinor,
      hasColdChain,
      promoCode,
      applyPromo,
      clearPromo,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
