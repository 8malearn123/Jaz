import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import { ownerOrdersSeed, ownerOrderStatuses, type OwnerOrder, type OwnerChannel, type OwnerOrderStage } from '@/data/ownerOrders'
import { rawMaterials, finishedBatches, bomBySku, purchaseInvoices, type RawKey, type FinishedBatch, type PurchaseInvoice } from '@/data/ownerSupply'
import { ownerProductsByChannel, type OwnerProduct, type ProdChannel } from '@/data/ownerProducts'
import { ownerCustomers, ownerTiers, type OwnerCustomer, type OwnerTier } from '@/data/ownerCustomers'
import { wasteLog as wasteSeed, finNetMinor, finBase, type WasteEntry } from '@/data/ownerFinance'
import { contracts as contractsSeed, b2cCatalog, stdCatalog, catTree, type Contract, type CatNode } from '@/data/ownerCatalog'
import { approvalStages as approvalSeed, type ApprovalStage } from '@/data/ownerVendors'

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const LAST = (ownerOrderStatuses.length - 1) as OwnerOrderStage

// capacity so a live % can be derived and reorders/production move the bar.
const rawCapacity: Record<RawKey, number> = rawMaterials.reduce((acc, m) => {
  acc[m.key] = Math.round(m.systemQty / (m.pct / 100))
  return acc
}, {} as Record<RawKey, number>)

type BOM = Partial<Record<RawKey, number>>
type ProdChannelOrder = Record<ProdChannel, string[]>
type Catalog = {
  price: Record<string, number> // item id → minor
  itemHidden: Record<string, boolean> // catalog item id → hidden
  moq: Record<string, number> // item id → moq
  catHidden: Record<string, boolean> // category node id → hidden
  catName: Record<string, Bilingual> // category node id → renamed label
  order: ProdChannelOrder // category node ids in display order (per channel)
  added: Record<string, CatNode> // owner-created category nodes by id
}
const catIds = (Object.keys(catTree) as ProdChannel[]).reduce((acc, ch) => { acc[ch] = catTree[ch].map((n) => n.id); return acc }, {} as ProdChannelOrder)

interface OwnerStateValue {
  // orders
  orders: OwnerOrder[]
  advanceOrder: (id: string) => void
  setOrderStage: (id: string, stage: OwnerOrderStage) => void
  cancelOrder: (id: string) => void
  createOrder: (o: { customer: Bilingual; chan: OwnerChannel; items: Bilingual; qty: number; amountMinor: number }) => string
  assignDepartment: (id: string, dept: Bilingual) => void
  pendingOrders: number
  pipelineValueMinor: number
  // raw inventory (live)
  rawQty: Record<RawKey, number>
  rawCapacity: Record<RawKey, number>
  rawPct: (key: RawKey) => number
  reorderRaw: (key: RawKey) => void
  finalizeStockTake: (counts: Partial<Record<RawKey, number>>) => void
  lowRaw: RawKey[]
  buildable: (sku: string) => { qty: number; bottleneck: RawKey | null }
  bomOf: (sku: string) => BOM
  // products (live, editable)
  products: Record<ProdChannel, OwnerProduct[]>
  addProduct: (chan: ProdChannel, p: { name: Bilingual; category: Bilingual; priceMinor: number; moq: number }) => string
  updateProduct: (chan: ProdChannel, sku: string, patch: Partial<Pick<OwnerProduct, 'priceMinor' | 'moq'>>) => void
  addBomComponent: (chan: ProdChannel, sku: string, key: RawKey, per: number) => void
  // production / finished goods
  finished: FinishedBatch[]
  produceBatch: (sku: string, qty: number) => boolean
  // purchase invoices (3-way match)
  invoices: PurchaseInvoice[]
  reconcileInvoice: (id: string) => void
  // waste → finance
  wasteLog: WasteEntry[]
  logWaste: (e: { item: Bilingual; reason: Bilingual; lossMinor: number }) => void
  wasteTotalMinor: number
  netProfitMinor: number
  // customers loyalty
  customers: OwnerCustomer[]
  rewardCustomer: (id: string, points: number) => void
  // credit limits (overlay)
  creditLimits: Record<string, number>
  setCreditLimit: (id: string, limitMinor: number) => void
  // contracts
  contracts: Contract[]
  renewContract: (id: string) => void
  // merchant onboarding approvals
  approvals: ApprovalStage[]
  advanceApproval: () => boolean
  // catalog overlay (persisted across navigation)
  catalog: Catalog
  setCatalogPrice: (id: string, minor: number) => void
  toggleCatalogItem: (id: string) => void
  setCatalogMoq: (id: string, moq: number) => void
  toggleCategory: (id: string) => void
  renameCategory: (id: string, label: Bilingual) => void
  addCategory: (chan: ProdChannel, label: Bilingual) => void
  moveCategory: (chan: ProdChannel, fromId: string, toId: string) => void
  catNodes: (chan: ProdChannel) => CatNode[]
  // exec alerts
  dismissedExpiry: string[]
  dismissExpiry: (key: string) => void
  // cost model
  cocoaDelta: number
  setCocoa: (n: number) => void
}

const OwnerStateContext = createContext<OwnerStateValue | null>(null)

export function OwnerStateProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<OwnerOrder[]>(() => clone(ownerOrdersSeed))
  const [seq, setSeq] = useState(2619)
  const [rawQty, setRawQty] = useState<Record<RawKey, number>>(() => rawMaterials.reduce((a, m) => { a[m.key] = m.systemQty; return a }, {} as Record<RawKey, number>))
  const [finished, setFinished] = useState<FinishedBatch[]>(() => clone(finishedBatches))
  const [batchSeq, setBatchSeq] = useState(100)
  const [products, setProducts] = useState<Record<ProdChannel, OwnerProduct[]>>(() => clone(ownerProductsByChannel))
  const [prodSeq, setProdSeq] = useState(1)
  const [bomOverride, setBomOverride] = useState<Record<string, BOM>>({})
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(() => clone(purchaseInvoices))
  const [wasteLog, setWasteLog] = useState<WasteEntry[]>(() => clone(wasteSeed))
  const [wasteSeq, setWasteSeq] = useState(100)
  const [customers, setCustomers] = useState<OwnerCustomer[]>(() => clone(ownerCustomers))
  const [creditLimits, setCreditLimits] = useState<Record<string, number>>({})
  const [contracts, setContracts] = useState<Contract[]>(() => clone(contractsSeed))
  const [approvals, setApprovals] = useState<ApprovalStage[]>(() => clone(approvalSeed))
  const [catSeq, setCatSeq] = useState(1)
  const [catalog, setCatalog] = useState<Catalog>(() => ({
    price: {},
    itemHidden: Object.fromEntries(b2cCatalog.map((i) => [i.id, !i.visible])),
    moq: Object.fromEntries(stdCatalog.map((i) => [i.id, i.moq])),
    catHidden: {},
    catName: {},
    order: clone(catIds),
    added: {},
  }))
  const [dismissedExpiry, setDismissedExpiry] = useState<string[]>([])
  const [cocoaDelta, setCocoa] = useState(8)

  const dismissExpiry = useCallback((key: string) => setDismissedExpiry((prev) => (prev.includes(key) ? prev : [...prev, key])), [])

  /* ── BOM (override wins over seed) ── */
  const bomOf = useCallback((sku: string): BOM => bomOverride[sku] ?? bomBySku[sku] ?? {}, [bomOverride])

  /* ── orders ── */
  const advanceOrder = useCallback((id: string) => setOrders((prev) => prev.map((o) => (o.id === id && !o.cancelled && o.stage < LAST ? { ...o, stage: (o.stage + 1) as OwnerOrderStage } : o))), [])
  const setOrderStage = useCallback((id: string, stage: OwnerOrderStage) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, stage, cancelled: false } : o))), [])
  const cancelOrder = useCallback((id: string) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, cancelled: true } : o))), [])
  const assignDepartment = useCallback((id: string, dept: Bilingual) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, department: dept } : o))), [])
  const createOrder = useCallback((o: { customer: Bilingual; chan: OwnerChannel; items: Bilingual; qty: number; amountMinor: number }) => {
    const id = `JZ-${seq}`
    setSeq((s) => s + 1)
    setOrders((prev) => [{ id, customer: o.customer, chan: o.chan, items: o.items, qty: o.qty, amountMinor: o.amountMinor, date: { en: 'Now', ar: 'الآن' }, stage: 0, sla: false }, ...prev])
    return id
  }, [seq])
  const pendingOrders = orders.filter((o) => !o.cancelled && o.stage < LAST).length
  const pipelineValueMinor = orders.filter((o) => !o.cancelled && o.stage < LAST).reduce((a, o) => a + o.amountMinor, 0)

  /* ── raw inventory ── */
  const rawPct = useCallback((key: RawKey) => Math.min(100, Math.round((rawQty[key] / rawCapacity[key]) * 100)), [rawQty])
  const reorderRaw = useCallback((key: RawKey) => setRawQty((prev) => ({ ...prev, [key]: rawCapacity[key] })), [])
  const finalizeStockTake = useCallback((counts: Partial<Record<RawKey, number>>) => setRawQty((prev) => ({ ...prev, ...counts })), [])
  const lowRaw = (Object.keys(rawQty) as RawKey[]).filter((k) => {
    const m = rawMaterials.find((x) => x.key === k)!
    return rawPct(k) < m.reorderPct
  })
  const buildable = useCallback((sku: string): { qty: number; bottleneck: RawKey | null } => {
    const bom = bomOf(sku)
    const keys = Object.keys(bom) as RawKey[]
    if (keys.length === 0) return { qty: 0, bottleneck: null }
    let qty = Infinity
    let bottleneck: RawKey | null = null
    for (const k of keys) {
      const per = bom[k]!
      if (per <= 0) continue
      const canMake = Math.floor(rawQty[k] / per)
      if (canMake < qty) { qty = canMake; bottleneck = k }
    }
    return { qty: qty === Infinity ? 0 : qty, bottleneck }
  }, [rawQty, bomOf])

  /* ── production ── */
  const productNameBySku = useMemo(() => Object.values(products).flat().reduce((acc, p) => { acc[p.sku] = p.name; return acc }, {} as Record<string, Bilingual>), [products])
  const produceBatch = useCallback((sku: string, qty: number): boolean => {
    const bom = bomOf(sku)
    if (Object.keys(bom).length === 0 || qty <= 0) return false
    for (const k of Object.keys(bom) as RawKey[]) { if (rawQty[k] < bom[k]! * qty) return false }
    setRawQty((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(bom) as RawKey[]) next[k] = Math.max(0, Math.round(next[k] - bom[k]! * qty))
      return next
    })
    const code = `BATCH-FG-${batchSeq}`
    setBatchSeq((s) => s + 1)
    setFinished((prev) => [{ code, product: productNameBySku[sku] ?? { en: sku, ar: sku }, systemQty: qty, countedQty: qty, expiryDays: 90 }, ...prev])
    return true
  }, [rawQty, batchSeq, bomOf, productNameBySku])

  /* ── products ── */
  const addProduct = useCallback((chan: ProdChannel, p: { name: Bilingual; category: Bilingual; priceMinor: number; moq: number }) => {
    const sku = `NEW-${prodSeq}`
    setProdSeq((s) => s + 1)
    setProducts((prev) => ({ ...prev, [chan]: [{ sku, name: p.name, category: p.category, priceMinor: p.priceMinor, moq: p.moq, components: 0, color: '#8a6b3f' }, ...prev[chan]] }))
    return sku
  }, [prodSeq])
  const updateProduct = useCallback((chan: ProdChannel, sku: string, patch: Partial<Pick<OwnerProduct, 'priceMinor' | 'moq'>>) =>
    setProducts((prev) => ({ ...prev, [chan]: prev[chan].map((p) => (p.sku === sku ? { ...p, ...patch } : p)) })), [])
  const addBomComponent = useCallback((chan: ProdChannel, sku: string, key: RawKey, per: number) => {
    setBomOverride((prev) => ({ ...prev, [sku]: { ...(prev[sku] ?? bomBySku[sku] ?? {}), [key]: per } }))
    setProducts((prev) => ({ ...prev, [chan]: prev[chan].map((p) => (p.sku === sku ? { ...p, components: p.components + 1 } : p)) }))
  }, [])

  /* ── purchase invoices ── */
  const reconcileInvoice = useCallback((id: string) => setInvoices((prev) => prev.map((iv) => (iv.id === id ? { ...iv, match: 'matched' } : iv))), [])

  /* ── waste → finance ── */
  const logWaste = useCallback((e: { item: Bilingual; reason: Bilingual; lossMinor: number }) => {
    const id = `w-${wasteSeq}`
    setWasteSeq((s) => s + 1)
    setWasteLog((prev) => [{ id, item: e.item, reason: e.reason, lossMinor: e.lossMinor, at: { en: 'Now', ar: 'الآن' } }, ...prev])
  }, [wasteSeq])
  const wasteTotalMinor = wasteLog.reduce((a, w) => a + w.lossMinor, 0)
  const netProfitMinor = finNetMinor + (finBase.wasteMinor - wasteTotalMinor) // base already subtracted seed waste; adjust to live

  /* ── customers ── */
  const rewardCustomer = useCallback((id: string, points: number) => setCustomers((prev) => prev.map((c) => {
    if (c.id !== id) return c
    const spend = c.spendMinor + points
    const tier = ([...ownerTiers].reverse().find((t) => spend >= t.thresholdMinor)?.key ?? 'basic') as OwnerTier
    return { ...c, spendMinor: spend, tier }
  })), [])

  /* ── credit ── */
  const setCreditLimit = useCallback((id: string, limitMinor: number) => setCreditLimits((prev) => ({ ...prev, [id]: limitMinor })), [])

  /* ── contracts ── */
  const renewContract = useCallback((id: string) => setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c))), [])

  /* ── approvals: advance the current stage forward one step ── */
  const advanceApproval = useCallback((): boolean => {
    let advanced = false
    setApprovals((prev) => {
      const i = prev.findIndex((s) => s.current)
      if (i < 0 || i >= prev.length - 1) return prev
      advanced = true
      return prev.map((s, idx) => idx === i ? { ...s, done: true, current: false } : idx === i + 1 ? { ...s, current: true } : s)
    })
    return advanced
  }, [])

  /* ── catalog overlay ── */
  const setCatalogPrice = useCallback((id: string, minor: number) => setCatalog((p) => ({ ...p, price: { ...p.price, [id]: minor } })), [])
  const toggleCatalogItem = useCallback((id: string) => setCatalog((p) => ({ ...p, itemHidden: { ...p.itemHidden, [id]: !p.itemHidden[id] } })), [])
  const setCatalogMoq = useCallback((id: string, moq: number) => setCatalog((p) => ({ ...p, moq: { ...p.moq, [id]: moq } })), [])
  const toggleCategory = useCallback((id: string) => setCatalog((p) => ({ ...p, catHidden: { ...p.catHidden, [id]: !p.catHidden[id] } })), [])
  const renameCategory = useCallback((id: string, label: Bilingual) => setCatalog((p) => ({ ...p, catName: { ...p.catName, [id]: label } })), [])
  const addCategory = useCallback((chan: ProdChannel, label: Bilingual) => {
    const id = `cat-new-${catSeq}`
    setCatSeq((s) => s + 1)
    setCatalog((p) => ({ ...p, added: { ...p.added, [id]: { id, label, count: 0, depth: 0 } }, order: { ...p.order, [chan]: [...p.order[chan], id] } }))
  }, [catSeq])
  const moveCategory = useCallback((chan: ProdChannel, fromId: string, toId: string) => setCatalog((p) => {
    if (fromId === toId) return p
    const arr = [...p.order[chan]]
    const from = arr.indexOf(fromId), to = arr.indexOf(toId)
    if (from < 0 || to < 0) return p
    arr.splice(to, 0, arr.splice(from, 1)[0])
    return { ...p, order: { ...p.order, [chan]: arr } }
  }), [])
  const catNodes = useCallback((chan: ProdChannel): CatNode[] => {
    const base: Record<string, CatNode> = {}
    for (const n of catTree[chan]) base[n.id] = n
    return catalog.order[chan]
      .map((id) => catalog.added[id] ?? base[id])
      .filter((n): n is CatNode => !!n)
      .map((n) => (catalog.catName[n.id] ? { ...n, label: catalog.catName[n.id] } : n))
  }, [catalog])

  const value = useMemo<OwnerStateValue>(() => ({
    orders, advanceOrder, setOrderStage, cancelOrder, createOrder, assignDepartment, pendingOrders, pipelineValueMinor,
    rawQty, rawCapacity, rawPct, reorderRaw, finalizeStockTake, lowRaw, buildable, bomOf,
    products, addProduct, updateProduct, addBomComponent,
    finished, produceBatch,
    invoices, reconcileInvoice,
    wasteLog, logWaste, wasteTotalMinor, netProfitMinor,
    customers, rewardCustomer,
    creditLimits, setCreditLimit,
    contracts, renewContract,
    approvals, advanceApproval,
    catalog, setCatalogPrice, toggleCatalogItem, setCatalogMoq, toggleCategory, renameCategory, addCategory, moveCategory, catNodes,
    dismissedExpiry, dismissExpiry,
    cocoaDelta, setCocoa,
  }), [orders, advanceOrder, setOrderStage, cancelOrder, createOrder, assignDepartment, pendingOrders, pipelineValueMinor, rawQty, rawPct, reorderRaw, finalizeStockTake, lowRaw, buildable, bomOf, products, addProduct, updateProduct, addBomComponent, finished, produceBatch, invoices, reconcileInvoice, wasteLog, logWaste, wasteTotalMinor, netProfitMinor, customers, rewardCustomer, creditLimits, setCreditLimit, contracts, renewContract, approvals, advanceApproval, catalog, setCatalogPrice, toggleCatalogItem, setCatalogMoq, toggleCategory, renameCategory, addCategory, moveCategory, catNodes, dismissedExpiry, dismissExpiry, cocoaDelta])

  return <OwnerStateContext.Provider value={value}>{children}</OwnerStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOwnerState() {
  const ctx = useContext(OwnerStateContext)
  if (!ctx) throw new Error('useOwnerState must be used within OwnerStateProvider')
  return ctx
}
