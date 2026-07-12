import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import {
  megaOrdersSeed, megaCatalog, megaCredit, volumeDiscount, SHIP_LAST, megaPickup,
  type MegaOrder, type ShipStage,
} from '@/data/mega'

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

interface MegaStateValue {
  // orders + shipments
  orders: MegaOrder[]
  advanceShipment: (id: string) => void
  cancelOrder: (id: string) => void
  openShipments: number
  palletsInTransit: number
  cycleValueMinor: number
  // draft pallet order (catalog → overview → place)
  draft: Record<string, number> // sku → pallets
  setDraftPallets: (sku: string, pallets: number) => void
  addPallets: (sku: string, delta: number) => void
  clearDraft: () => void
  draftPallets: number
  draftCbm: number
  draftValueMinor: number
  lineValueMinor: (sku: string, pallets: number) => number
  placeOrder: () => string | null // fulfilment is fixed: pickup at the site (EXW) — no branch delivery
  // credit
  availableMinor: number
  reserveMinor: number
}

const MegaStateContext = createContext<MegaStateValue | null>(null)

export function MegaStateProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<MegaOrder[]>(() => clone(megaOrdersSeed))
  const [seq, setSeq] = useState(4022)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [reserveMinor, setReserve] = useState(megaCredit.reservedMinor)

  const advanceShipment = useCallback((id: string) => setOrders((prev) => prev.map((o) => (o.id === id && !o.cancelled && o.stage < SHIP_LAST ? { ...o, stage: (o.stage + 1) as ShipStage } : o))), [])
  const cancelOrder = useCallback((id: string) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, cancelled: true } : o))), [])
  const openShipments = orders.filter((o) => !o.cancelled && o.stage < SHIP_LAST).length
  const palletsInTransit = orders.filter((o) => !o.cancelled && o.stage < SHIP_LAST).reduce((a, o) => a + o.pallets, 0)
  const cycleValueMinor = orders.filter((o) => !o.cancelled).reduce((a, o) => a + o.valueMinor, 0)

  const lineValueMinor = useCallback((sku: string, pallets: number) => {
    const p = megaCatalog.find((x) => x.sku === sku)
    if (!p || pallets <= 0) return 0
    const disc = volumeDiscount(pallets)
    return Math.round(p.pricePerPalletMinor * pallets * (1 - disc / 100))
  }, [])

  // The MOQ is a hard floor: a draft line either doesn't exist or holds at
  // least the SKU's minimum — quantities between 1 and MOQ−1 are impossible.
  const moqOf = (sku: string) => megaCatalog.find((x) => x.sku === sku)?.moq ?? 1
  const setDraftPallets = useCallback((sku: string, pallets: number) => setDraft((d) => {
    const next = { ...d }
    if (pallets < moqOf(sku)) delete next[sku]
    else next[sku] = pallets
    return next
  }), [])
  const addPallets = useCallback((sku: string, delta: number) => setDraft((d) => {
    const moq = moqOf(sku)
    const cur = d[sku] ?? 0
    // stepping up from empty jumps straight to the MOQ; dropping below it clears the line
    let next = cur === 0 && delta > 0 ? Math.max(moq, delta) : cur + delta
    if (next < moq) next = 0
    const out = { ...d }
    if (next <= 0) delete out[sku]
    else out[sku] = next
    return out
  }), [])
  const clearDraft = useCallback(() => setDraft({}), [])

  const draftPallets = Object.values(draft).reduce((a, n) => a + n, 0)
  const draftCbm = Object.entries(draft).reduce((a, [sku, n]) => a + (megaCatalog.find((x) => x.sku === sku)?.cbm ?? 0) * n, 0)
  const draftValueMinor = Object.entries(draft).reduce((a, [sku, n]) => a + lineValueMinor(sku, n), 0)

  const placeOrder = useCallback((): string | null => {
    const entries = Object.entries(draft).filter(([, n]) => n > 0)
    if (entries.length === 0) return null
    const pallets = entries.reduce((a, [, n]) => a + n, 0)
    const valueMinor = entries.reduce((a, [sku, n]) => a + lineValueMinor(sku, n), 0)
    const names = entries.map(([sku]) => megaCatalog.find((x) => x.sku === sku)!).filter(Boolean)
    const items: Bilingual = names.length === 1
      ? names[0].name
      : { en: `${names.length} lines · ${pallets} pallets`, ar: `${names.length} أصناف · ${pallets} طبلية` }
    const id = `MEX-${seq}`
    setSeq((s) => s + 1)
    setOrders((prev) => [{ id, items, pallets, destination: megaPickup, valueMinor, placedAt: { en: 'Now', ar: 'الآن' }, stage: 0, incoterm: 'EXW', placedTs: Date.now() }, ...prev])
    setReserve((r) => r + valueMinor) // reserve credit against the new order
    setDraft({})
    return id
  }, [draft, seq, lineValueMinor])

  const availableMinor = megaCredit.limitMinor - megaCredit.outstandingMinor - reserveMinor

  const value = useMemo<MegaStateValue>(() => ({
    orders, advanceShipment, cancelOrder, openShipments, palletsInTransit, cycleValueMinor,
    draft, setDraftPallets, addPallets, clearDraft, draftPallets, draftCbm, draftValueMinor, lineValueMinor, placeOrder,
    availableMinor, reserveMinor,
  }), [orders, advanceShipment, cancelOrder, openShipments, palletsInTransit, cycleValueMinor, draft, setDraftPallets, addPallets, clearDraft, draftPallets, draftCbm, draftValueMinor, lineValueMinor, placeOrder, availableMinor, reserveMinor])

  return <MegaStateContext.Provider value={value}>{children}</MegaStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMegaState() {
  const ctx = useContext(MegaStateContext)
  if (!ctx) throw new Error('useMegaState must be used within MegaStateProvider')
  return ctx
}
