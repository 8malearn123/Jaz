import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import { ownerOrdersSeed, ownerOrderStatuses, type OwnerOrder, type OwnerChannel, type OwnerOrderStage } from '@/data/ownerOrders'
import { rawMaterials, finishedBatches, bomBySku, purchaseInvoices, suppliers as suppliersSeed, stockMovementsSeed, type RawKey, type FinishedBatch, type PurchaseInvoice, type ExtraRaw, type Supplier, type StockMovement, type StockTakeReport } from '@/data/ownerSupply'
import { ownerProductsByChannel, type OwnerProduct, type ProdChannel } from '@/data/ownerProducts'
import { ownerCustomers, ownerTiers, type OwnerCustomer, type OwnerTier } from '@/data/ownerCustomers'
import { wasteLog as wasteSeed, finNetMinor, finBase, type WasteEntry } from '@/data/ownerFinance'
import { contracts as contractsSeed, b2cCatalog, stdCatalog, catTree, storeProductsSeed, type Contract, type CatNode, type StoreProduct } from '@/data/ownerCatalog'
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
  // owner-added stock items (inventory overlay — not part of the production BOM/buildable system)
  extraRaws: ExtraRaw[]
  extraCats: Bilingual[]
  addRawMaterial: (m: Omit<ExtraRaw, 'id'>) => void
  addRawCategory: (name: Bilingual) => boolean
  reorderExtra: (id: string) => void
  buildable: (sku: string) => { qty: number; bottleneck: RawKey | null }
  bomOf: (sku: string) => BOM
  // products (live, editable)
  products: Record<ProdChannel, OwnerProduct[]>
  addProduct: (chan: ProdChannel, p: { name: Bilingual; category: Bilingual; priceMinor: number; moq: number }) => string
  updateProduct: (chan: ProdChannel, sku: string, patch: Partial<Pick<OwnerProduct, 'priceMinor' | 'moq'>>) => void
  addBomComponent: (chan: ProdChannel, sku: string, key: RawKey, per: number) => void
  // production / finished goods
  finished: FinishedBatch[]
  produceBatch: (sku: string, qty: number, expiryDays?: number) => boolean
  addFinishedBatch: (b: { product: Bilingual; systemQty: number; unitMinor: number; color: string; expiryDays: number }) => void
  recordFinishedCount: (counts: Record<string, number>) => void
  finishedStockTakeDate: Bilingual
  // stock-take reports: immutable audit log — no update/delete path by design
  stockTakeReports: StockTakeReport[]
  addStockTakeReport: (r: Omit<StockTakeReport, 'id'>) => void
  // per-item stock movement trail (raw materials + owner-added items)
  movements: StockMovement[]
  // suppliers directory (auto-scored)
  suppliers: Supplier[]
  addSupplier: (s: { name: Bilingual; country: Bilingual; material: Bilingual; leadDays: number; onTimePct: number }) => void
  // purchase invoices (3-way match)
  invoices: PurchaseInvoice[]
  reconcileInvoice: (id: string) => void
  addPurchaseInvoice: (inv: { supplier: Bilingual; material: Bilingual; date: Bilingual; totalMinor: number; po?: string; rawKey?: RawKey; qty?: number }) => void
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
  // storefront products (owner "Products" tab — customer-facing appearance, per channel)
  storeProducts: Record<ProdChannel, StoreProduct[]>
  addStoreProduct: (chan: ProdChannel, p: Omit<StoreProduct, 'id' | 'visible'>) => string
  updateStoreProduct: (chan: ProdChannel, id: string, patch: Partial<Omit<StoreProduct, 'id'>>) => void
  toggleStoreVisible: (chan: ProdChannel, id: string) => void
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
  const [finishedStockTakeDate, setFinishedStockTakeDate] = useState<Bilingual>({ en: '03 Jul 2026', ar: '٢٠٢٦-٠٧-٠٣' })
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => clone(suppliersSeed))
  const [supplierSeq, setSupplierSeq] = useState(5)
  const [products, setProducts] = useState<Record<ProdChannel, OwnerProduct[]>>(() => clone(ownerProductsByChannel))
  const [prodSeq, setProdSeq] = useState(1)
  const [bomOverride, setBomOverride] = useState<Record<string, BOM>>({})
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>(() => clone(purchaseInvoices))
  const [invSeq, setInvSeq] = useState(3313)
  const [extraRaws, setExtraRaws] = useState<ExtraRaw[]>([])
  const [extraCats, setExtraCats] = useState<Bilingual[]>([])
  const [extraSeq, setExtraSeq] = useState(1)
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
  const [storeProducts, setStoreProducts] = useState<Record<ProdChannel, StoreProduct[]>>(() => clone(storeProductsSeed))
  const [storeSeq, setStoreSeq] = useState(1)
  const [dismissedExpiry, setDismissedExpiry] = useState<string[]>([])
  const [cocoaDelta, setCocoa] = useState(8)

  const dismissExpiry = useCallback((key: string) => setDismissedExpiry((prev) => (prev.includes(key) ? prev : [...prev, key])), [])

  /* ── stock movements (audit trail) + stock-take reports (immutable) ── */
  const [movements, setMovements] = useState<StockMovement[]>(() => clone(stockMovementsSeed))
  const movSeqRef = useRef(100)
  const OWNER_BY: Bilingual = { en: 'Owner — admin console', ar: 'المالك — لوحة التحكم' }
  const logMovement = useCallback((m: Omit<StockMovement, 'id' | 'at' | 'by'> & { by?: Bilingual }) => {
    const id = `MV-${movSeqRef.current++}`
    setMovements((prev) => [{ itemId: m.itemId, kind: m.kind, qty: m.qty, note: m.note, by: m.by ?? OWNER_BY, id, at: { en: 'Now', ar: 'الآن' } }, ...prev])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [stockTakeReports, setStockTakeReports] = useState<StockTakeReport[]>([])
  const stkSeqRef = useRef(1)
  const addStockTakeReport = useCallback((r: Omit<StockTakeReport, 'id'>) => {
    const id = `STK-${String(stkSeqRef.current++).padStart(3, '0')}`
    setStockTakeReports((prev) => [{ ...r, id }, ...prev])
  }, [])

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
  // Top up to at least capacity — never reduce stock that a purchase already pushed above capacity.
  const reorderRaw = useCallback((key: RawKey) => {
    const added = Math.max(0, rawCapacity[key] - rawQty[key])
    setRawQty((prev) => ({ ...prev, [key]: Math.max(prev[key], rawCapacity[key]) }))
    if (added > 0) logMovement({ itemId: key, kind: 'in', qty: added, note: { en: 'Reorder received', ar: 'إعادة طلب وتوريد' } })
  }, [rawQty, logMovement])
  const finalizeStockTake = useCallback((counts: Partial<Record<RawKey, number>>) => {
    for (const k of Object.keys(counts) as RawKey[]) {
      const diff = (counts[k] ?? 0) - rawQty[k]
      if (diff !== 0) logMovement({ itemId: k, kind: 'adjust', qty: diff, note: { en: 'Stock-take adjustment', ar: 'تسوية جرد' } })
    }
    setRawQty((prev) => ({ ...prev, ...counts }))
  }, [rawQty, logMovement])
  const addRawMaterial = useCallback((m: Omit<ExtraRaw, 'id'>) => {
    const id = `xr-${extraSeq}`
    setExtraSeq((s) => s + 1)
    setExtraRaws((prev) => [{ ...m, id }, ...prev])
    logMovement({ itemId: id, kind: 'in', qty: m.qty, note: { en: 'Opening balance — purchase invoice', ar: 'رصيد افتتاحي — فاتورة مشتريات' } })
  }, [extraSeq, logMovement])
  // Dedup against every known category in BOTH languages (seed materials + extras + added cats) so a name
  // matching a seed category in one locale doesn't spawn a phantom empty group in the other. Returns whether it added.
  const addRawCategory = useCallback((name: Bilingual): boolean => {
    const known = new Set<string>()
    for (const c of [...rawMaterials.map((m) => m.category), ...extraRaws.map((r) => r.category), ...extraCats]) { known.add(c.en); known.add(c.ar) }
    if (known.has(name.en) || known.has(name.ar)) return false
    setExtraCats((prev) => [...prev, name])
    return true
  }, [extraRaws, extraCats])
  const reorderExtra = useCallback((id: string) => {
    const r = extraRaws.find((x) => x.id === id)
    setExtraRaws((prev) => prev.map((x) => (x.id === id ? { ...x, qty: x.reorderQty * 2 } : x)))
    if (r && r.reorderQty * 2 > r.qty) logMovement({ itemId: id, kind: 'in', qty: r.reorderQty * 2 - r.qty, note: { en: 'Reorder received', ar: 'إعادة طلب وتوريد' } })
  }, [extraRaws, logMovement])
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
  const productMetaBySku = useMemo(() => Object.values(products).flat().reduce((acc, p) => { acc[p.sku] = { name: p.name, priceMinor: p.priceMinor, color: p.color }; return acc }, {} as Record<string, { name: Bilingual; priceMinor: number; color: string }>), [products])
  const produceBatch = useCallback((sku: string, qty: number, expiryDays = 90): boolean => {
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
    const meta = productMetaBySku[sku]
    setFinished((prev) => [{ code, product: meta?.name ?? { en: sku, ar: sku }, systemQty: qty, countedQty: qty, expiryDays, unitMinor: meta?.priceMinor ?? 0, color: meta?.color ?? '#8a6b3f' }, ...prev])
    for (const k of Object.keys(bom) as RawKey[]) {
      const drawn = Math.round(bom[k]! * qty * 100) / 100
      if (drawn > 0) logMovement({ itemId: k, kind: 'out', qty: drawn, note: { en: `Production draw — ${meta?.name.en ?? sku} (${code})`, ar: `خصم إنتاج — ${meta?.name.ar ?? sku} (${code})` } })
    }
    return true
  }, [rawQty, batchSeq, bomOf, productMetaBySku, logMovement])
  // Record a production batch straight into finished goods (matched: counted = system on entry).
  const addFinishedBatch = useCallback((b: { product: Bilingual; systemQty: number; unitMinor: number; color: string; expiryDays: number }) => {
    const code = `BATCH-FG-${batchSeq}`
    setBatchSeq((s) => s + 1)
    setFinished((prev) => [{ code, product: b.product, systemQty: b.systemQty, countedQty: b.systemQty, expiryDays: b.expiryDays, unitMinor: b.unitMinor, color: b.color }, ...prev])
  }, [batchSeq])
  // Stock-take: record the physical count per batch (updates countedQty → variance) and stamp the date.
  const recordFinishedCount = useCallback((counts: Record<string, number>) => {
    setFinished((prev) => prev.map((b) => (counts[b.code] != null ? { ...b, countedQty: counts[b.code] } : b)))
    setFinishedStockTakeDate({ en: 'Today', ar: 'اليوم' })
  }, [])
  // Auto-score a new supplier from on-time compliance, penalised by long lead times.
  const addSupplier = useCallback((s: { name: Bilingual; country: Bilingual; material: Bilingual; leadDays: number; onTimePct: number }) => {
    const score = Math.max(0, Math.min(100, Math.round(s.onTimePct - Math.max(0, s.leadDays - 7) * 0.8)))
    const id = `S-${String(supplierSeq).padStart(2, '0')}`
    setSupplierSeq((n) => n + 1)
    setSuppliers((prev) => [{ id, name: s.name, country: s.country, material: s.material, leadDays: s.leadDays, onTimePct: s.onTimePct, score }, ...prev])
  }, [supplierSeq])

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
  // Entering a supplier invoice restocks its raw material automatically (rawQty) and records the imported cost.
  const addPurchaseInvoice = useCallback((inv: { supplier: Bilingual; material: Bilingual; date: Bilingual; totalMinor: number; po?: string; rawKey?: RawKey; qty?: number }) => {
    const id = `PINV-${invSeq}`
    setInvSeq((s) => s + 1)
    setInvoices((prev) => [{ id, supplier: inv.supplier, material: inv.material, date: inv.date, totalMinor: inv.totalMinor, match: inv.po ? 'pending' : 'flagged', po: inv.po, rawKey: inv.rawKey, qty: inv.qty }, ...prev])
    if (inv.rawKey != null && inv.qty != null) {
      const rawKey = inv.rawKey, qty = inv.qty
      setRawQty((prev) => ({ ...prev, [rawKey]: prev[rawKey] + qty }))
      logMovement({ itemId: rawKey, kind: 'in', qty, note: { en: `Purchase invoice ${id} received`, ar: `استلام فاتورة المشتريات ${id}` } })
    }
  }, [invSeq, logMovement])

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

  /* ── storefront products (per channel) ── */
  const addStoreProduct = useCallback((chan: ProdChannel, p: Omit<StoreProduct, 'id' | 'visible'>) => {
    const id = `sp-new-${storeSeq}`
    setStoreSeq((s) => s + 1)
    setStoreProducts((prev) => ({ ...prev, [chan]: [{ ...p, id, visible: true }, ...prev[chan]] }))
    return id
  }, [storeSeq])
  const updateStoreProduct = useCallback((chan: ProdChannel, id: string, patch: Partial<Omit<StoreProduct, 'id'>>) =>
    setStoreProducts((prev) => ({ ...prev, [chan]: prev[chan].map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) })), [])
  const toggleStoreVisible = useCallback((chan: ProdChannel, id: string) =>
    setStoreProducts((prev) => ({ ...prev, [chan]: prev[chan].map((sp) => (sp.id === id ? { ...sp, visible: !sp.visible } : sp)) })), [])

  const value = useMemo<OwnerStateValue>(() => ({
    orders, advanceOrder, setOrderStage, cancelOrder, createOrder, assignDepartment, pendingOrders, pipelineValueMinor,
    rawQty, rawCapacity, rawPct, reorderRaw, finalizeStockTake, lowRaw, buildable, bomOf,
    extraRaws, extraCats, addRawMaterial, addRawCategory, reorderExtra,
    products, addProduct, updateProduct, addBomComponent,
    finished, produceBatch, addFinishedBatch, recordFinishedCount, finishedStockTakeDate,
    stockTakeReports, addStockTakeReport, movements,
    suppliers, addSupplier,
    invoices, reconcileInvoice, addPurchaseInvoice,
    wasteLog, logWaste, wasteTotalMinor, netProfitMinor,
    customers, rewardCustomer,
    creditLimits, setCreditLimit,
    contracts, renewContract,
    approvals, advanceApproval,
    catalog, setCatalogPrice, toggleCatalogItem, setCatalogMoq, toggleCategory, renameCategory, addCategory, moveCategory, catNodes,
    storeProducts, addStoreProduct, updateStoreProduct, toggleStoreVisible,
    dismissedExpiry, dismissExpiry,
    cocoaDelta, setCocoa,
  }), [orders, advanceOrder, setOrderStage, cancelOrder, createOrder, assignDepartment, pendingOrders, pipelineValueMinor, rawQty, rawPct, reorderRaw, finalizeStockTake, lowRaw, buildable, bomOf, extraRaws, extraCats, addRawMaterial, addRawCategory, reorderExtra, products, addProduct, updateProduct, addBomComponent, finished, produceBatch, addFinishedBatch, recordFinishedCount, finishedStockTakeDate, stockTakeReports, addStockTakeReport, movements, suppliers, addSupplier, invoices, reconcileInvoice, addPurchaseInvoice, wasteLog, logWaste, wasteTotalMinor, netProfitMinor, customers, rewardCustomer, creditLimits, setCreditLimit, contracts, renewContract, approvals, advanceApproval, catalog, setCatalogPrice, toggleCatalogItem, setCatalogMoq, toggleCategory, renameCategory, addCategory, moveCategory, catNodes, storeProducts, addStoreProduct, updateStoreProduct, toggleStoreVisible, dismissedExpiry, dismissExpiry, cocoaDelta])

  return <OwnerStateContext.Provider value={value}>{children}</OwnerStateContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOwnerState() {
  const ctx = useContext(OwnerStateContext)
  if (!ctx) throw new Error('useOwnerState must be used within OwnerStateProvider')
  return ctx
}
