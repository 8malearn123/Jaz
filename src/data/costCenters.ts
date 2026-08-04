import type { Bilingual } from './types'

// ── Cost centres (مراكز التكلفة) — isolated.
//
// A cost centre is a place in the business that consumes money. Each one carries its
// OWN set of cost processes (عمليات التكلفة): named charges that are added to a
// document at the moment it is raised — some on the selling side, some on the buying
// side, some on both. Two centres never share a process list; that is the whole point
// of the model. Posting a sale or a purchase against a centre freezes the processes as
// they stood at that moment onto the entry, so a later edit to a rate never restates a
// posting that has already been made.

/** Which side of the business a process fires on. */
export type ProcessSide = 'sale' | 'purchase' | 'both'

/** How a process values itself against the document it rides on. */
export type ProcessBasis =
  | 'pct' // percent of the document amount
  | 'per_unit' // minor units per unit on the document
  | 'fixed' // flat minor units per document

export interface CostProcess {
  id: string
  name: Bilingual
  side: ProcessSide
  basis: ProcessBasis
  /** pct → percent (4 = 4%); per_unit → minor per unit; fixed → minor per document. */
  rate: number
  note?: Bilingual
}

export type CostCenterKind = 'production' | 'packaging' | 'logistics' | 'retail' | 'export' | 'marketing' | 'admin' | 'quality'

export const costCenterKinds: Record<CostCenterKind, { label: Bilingual; color: string; bg: string }> = {
  production: { label: { en: 'Production', ar: 'التصنيع' }, color: '#8a6b3f', bg: '#f6edde' },
  packaging: { label: { en: 'Packaging', ar: 'التغليف' }, color: '#b08a57', bg: '#f7efe2' },
  logistics: { label: { en: 'Logistics', ar: 'اللوجستيات' }, color: '#365766', bg: '#e7eef1' },
  retail: { label: { en: 'Retail', ar: 'التجزئة' }, color: '#355c4b', bg: '#e8f0ec' },
  export: { label: { en: 'Export', ar: 'التصدير' }, color: '#2f7d5b', bg: '#e6f2ea' },
  marketing: { label: { en: 'Marketing', ar: 'التسويق' }, color: '#a4533f', bg: '#f7e9e4' },
  admin: { label: { en: 'Administration', ar: 'الإدارة' }, color: '#3b241a', bg: '#efe7df' },
  quality: { label: { en: 'Quality', ar: 'الجودة' }, color: '#5a4a86', bg: '#eeeaf6' },
}

export const processSideMeta: Record<ProcessSide, { label: Bilingual; color: string; bg: string }> = {
  sale: { label: { en: 'On sale', ar: 'عند البيع' }, color: '#355c4b', bg: '#e8f0ec' },
  purchase: { label: { en: 'On purchase', ar: 'عند الشراء' }, color: '#365766', bg: '#e7eef1' },
  both: { label: { en: 'Sale & purchase', ar: 'بيع وشراء' }, color: '#8a6b3f', bg: '#f6edde' },
}

export const processBasisMeta: Record<ProcessBasis, { label: Bilingual; hint: Bilingual }> = {
  pct: { label: { en: 'Percentage of amount', ar: 'نسبة من المبلغ' }, hint: { en: '% of the document amount', ar: '٪ من مبلغ المستند' } },
  per_unit: { label: { en: 'Per unit', ar: 'لكل وحدة' }, hint: { en: 'SAR for every unit on the document', ar: 'ريال عن كل وحدة في المستند' } },
  fixed: { label: { en: 'Fixed per document', ar: 'مبلغ ثابت للمستند' }, hint: { en: 'SAR once per document', ar: 'ريال مرة واحدة لكل مستند' } },
}

export interface CostCenter {
  id: string
  /** Short accounting code — what the entry is filed under. */
  code: string
  name: Bilingual
  kind: CostCenterKind
  manager?: Bilingual
  /** Period budget in minor units. 0 → no budget set. */
  budgetMinor: number
  active: boolean
  processes: CostProcess[]
}

/** Seeded centres — every one carries a different process list on each side. */
export const costCentersSeed: CostCenter[] = [
  {
    id: 'CC-01', code: 'CC-PROD', kind: 'production', budgetMinor: 4200000, active: true,
    name: { en: 'Production floor — Jazan', ar: 'صالة التصنيع — جازان' },
    manager: { en: 'Production department', ar: 'قسم التصنيع' },
    processes: [
      { id: 'p-01a', name: { en: 'Production overhead', ar: 'أعباء تصنيع غير مباشرة' }, side: 'sale', basis: 'pct', rate: 4 },
      { id: 'p-01b', name: { en: 'Machine hour absorption', ar: 'تحميل ساعات التشغيل' }, side: 'sale', basis: 'per_unit', rate: 120 },
      { id: 'p-01c', name: { en: 'Goods receiving & handling', ar: 'استلام ومناولة البضاعة' }, side: 'purchase', basis: 'pct', rate: 1.5 },
      { id: 'p-01d', name: { en: 'Batch setup', ar: 'تجهيز الدفعة' }, side: 'purchase', basis: 'fixed', rate: 25000 },
    ],
  },
  {
    id: 'CC-02', code: 'CC-PACK', kind: 'packaging', budgetMinor: 1850000, active: true,
    name: { en: 'Packaging & gift finishing', ar: 'التغليف والتشطيب الفاخر' },
    manager: { en: 'Packaging department', ar: 'قسم التغليف' },
    processes: [
      { id: 'p-02a', name: { en: 'Gift packaging', ar: 'تغليف الهدايا' }, side: 'sale', basis: 'per_unit', rate: 200 },
      { id: 'p-02b', name: { en: 'Foil & ribbon finishing', ar: 'تشطيب الورق الذهبي والشرائط' }, side: 'sale', basis: 'pct', rate: 1.2 },
      { id: 'p-02c', name: { en: 'Packaging material handling', ar: 'مناولة مواد التغليف' }, side: 'purchase', basis: 'pct', rate: 1 },
    ],
  },
  {
    id: 'CC-03', code: 'CC-COLD', kind: 'logistics', budgetMinor: 3100000, active: true,
    name: { en: 'Cold-chain & distribution', ar: 'سلسلة التبريد والتوزيع' },
    manager: { en: 'Shipping department', ar: 'قسم الشحن' },
    processes: [
      { id: 'p-03a', name: { en: 'Cold-chain shipping', ar: 'شحن مبرّد' }, side: 'sale', basis: 'pct', rate: 3.5 },
      { id: 'p-03b', name: { en: 'Ice-pack & insulation', ar: 'ثلج وعوازل' }, side: 'sale', basis: 'per_unit', rate: 90 },
      { id: 'p-03c', name: { en: 'Inbound freight', ar: 'نقل وارد' }, side: 'purchase', basis: 'pct', rate: 2 },
      { id: 'p-03d', name: { en: 'Warehouse storage', ar: 'تخزين بالمستودع' }, side: 'both', basis: 'pct', rate: 0.6 },
    ],
  },
  {
    id: 'CC-04', code: 'CC-BTQ', kind: 'retail', budgetMinor: 2450000, active: true,
    name: { en: 'Boutiques — retail floor', ar: 'المعارض — التجزئة' },
    manager: { en: 'Retail department', ar: 'قسم التجزئة' },
    processes: [
      { id: 'p-04a', name: { en: 'Boutique commission', ar: 'عمولة المعرض' }, side: 'sale', basis: 'pct', rate: 5 },
      { id: 'p-04b', name: { en: 'Card & POS fees', ar: 'رسوم الشبكة ونقاط البيع' }, side: 'sale', basis: 'pct', rate: 1.75 },
      { id: 'p-04c', name: { en: 'Branch transfer handling', ar: 'مناولة التحويل للفروع' }, side: 'purchase', basis: 'per_unit', rate: 50 },
    ],
  },
  {
    id: 'CC-05', code: 'CC-EXP', kind: 'export', budgetMinor: 2750000, active: true,
    name: { en: 'Export & GCC accounts', ar: 'التصدير وحسابات الخليج' },
    manager: { en: 'Export desk', ar: 'مكتب التصدير' },
    processes: [
      { id: 'p-05a', name: { en: 'Export documentation', ar: 'مستندات التصدير' }, side: 'sale', basis: 'fixed', rate: 40000 },
      { id: 'p-05b', name: { en: 'Cargo insurance', ar: 'تأمين الشحنة' }, side: 'sale', basis: 'pct', rate: 1.2 },
      { id: 'p-05c', name: { en: 'Customs clearance', ar: 'التخليص الجمركي' }, side: 'purchase', basis: 'fixed', rate: 65000 },
      { id: 'p-05d', name: { en: 'Import duty', ar: 'الرسوم الجمركية' }, side: 'purchase', basis: 'pct', rate: 5 },
    ],
  },
  {
    id: 'CC-06', code: 'CC-MKT', kind: 'marketing', budgetMinor: 1600000, active: true,
    name: { en: 'Marketing & brand', ar: 'التسويق والعلامة' },
    manager: { en: 'Marketing department', ar: 'قسم التسويق' },
    processes: [
      { id: 'p-06a', name: { en: 'Marketing levy', ar: 'اقتطاع تسويقي' }, side: 'sale', basis: 'pct', rate: 2 },
      { id: 'p-06b', name: { en: 'Sampling & tasting', ar: 'عينات وتذوق' }, side: 'sale', basis: 'per_unit', rate: 35 },
      { id: 'p-06c', name: { en: 'Supplier co-marketing', ar: 'تسويق مشترك مع المورّد' }, side: 'purchase', basis: 'pct', rate: 0.5 },
    ],
  },
  {
    id: 'CC-07', code: 'CC-ADM', kind: 'admin', budgetMinor: 2100000, active: true,
    name: { en: 'Administration & finance', ar: 'الإدارة والمالية' },
    manager: { en: 'Finance department', ar: 'قسم المالية' },
    processes: [
      { id: 'p-07a', name: { en: 'Administrative overhead', ar: 'أعباء إدارية' }, side: 'both', basis: 'pct', rate: 1 },
      { id: 'p-07b', name: { en: 'Invoice processing', ar: 'معالجة الفواتير' }, side: 'purchase', basis: 'fixed', rate: 7500 },
      { id: 'p-07c', name: { en: 'Collection & banking fees', ar: 'رسوم التحصيل والبنوك' }, side: 'sale', basis: 'pct', rate: 0.4 },
    ],
  },
  {
    id: 'CC-08', code: 'CC-QA', kind: 'quality', budgetMinor: 980000, active: true,
    name: { en: 'Quality & food safety', ar: 'الجودة وسلامة الغذاء' },
    manager: { en: 'Quality department', ar: 'قسم الجودة' },
    processes: [
      { id: 'p-08a', name: { en: 'Release inspection', ar: 'فحص الإفراج' }, side: 'sale', basis: 'pct', rate: 0.5 },
      { id: 'p-08b', name: { en: 'Incoming lab testing', ar: 'فحص مخبري للوارد' }, side: 'purchase', basis: 'fixed', rate: 18000 },
      { id: 'p-08c', name: { en: 'Cold-storage sampling', ar: 'سحب عينات التخزين المبرّد' }, side: 'purchase', basis: 'per_unit', rate: 15 },
    ],
  },
]

/* ── the engine ─────────────────────────────────────────────────────────────── */

/** One process as it was computed against a document. */
export interface ProcessCharge {
  processId: string
  name: Bilingual
  basis: ProcessBasis
  rate: number
  amountMinor: number
}

/** A posting: a sale or a purchase filed against a centre, with its processes frozen on it. */
export interface CostEntry {
  id: string
  at: Bilingual
  side: 'sale' | 'purchase'
  centerId: string
  /** The document this rode on — an order id or a purchase-invoice id. */
  ref: string
  party: Bilingual
  /** The document amount the processes were computed against. */
  baseMinor: number
  qty: number
  charges: ProcessCharge[]
  processMinor: number
  by?: Bilingual
  note?: Bilingual
}

/** The processes of a centre that fire on the given side. */
export function processesFor(cc: CostCenter, side: 'sale' | 'purchase'): CostProcess[] {
  return cc.processes.filter((p) => p.side === side || p.side === 'both')
}

/** Value one process against a document. */
export function chargeOf(p: CostProcess, doc: { amountMinor: number; qty: number }): number {
  if (p.basis === 'pct') return Math.round((doc.amountMinor * p.rate) / 100)
  if (p.basis === 'per_unit') return Math.round(Math.max(0, doc.qty) * p.rate)
  return Math.round(p.rate)
}

/** Value every process of a centre that fires on this side. */
export function applyProcesses(cc: CostCenter, side: 'sale' | 'purchase', doc: { amountMinor: number; qty: number }): ProcessCharge[] {
  return processesFor(cc, side).map((p) => ({
    processId: p.id, name: p.name, basis: p.basis, rate: p.rate, amountMinor: chargeOf(p, doc),
  }))
}

export const sumCharges = (charges: ProcessCharge[]): number => charges.reduce((a, c) => a + c.amountMinor, 0)

/** What a centre has absorbed — the shape every report and PDF is built from. */
export interface CostCenterTotals {
  saleCount: number
  purchaseCount: number
  saleBaseMinor: number
  purchaseBaseMinor: number
  saleProcessMinor: number
  purchaseProcessMinor: number
  totalProcessMinor: number
  /** Process load per process id, so a report can show where the money went. */
  byProcess: { processId: string; name: Bilingual; side: 'sale' | 'purchase'; amountMinor: number; count: number }[]
}

export function totalsOf(entries: CostEntry[]): CostCenterTotals {
  const byProcess = new Map<string, { processId: string; name: Bilingual; side: 'sale' | 'purchase'; amountMinor: number; count: number }>()
  const t: CostCenterTotals = {
    saleCount: 0, purchaseCount: 0, saleBaseMinor: 0, purchaseBaseMinor: 0,
    saleProcessMinor: 0, purchaseProcessMinor: 0, totalProcessMinor: 0, byProcess: [],
  }
  for (const e of entries) {
    if (e.side === 'sale') { t.saleCount++; t.saleBaseMinor += e.baseMinor; t.saleProcessMinor += e.processMinor }
    else { t.purchaseCount++; t.purchaseBaseMinor += e.baseMinor; t.purchaseProcessMinor += e.processMinor }
    for (const c of e.charges) {
      // A process that fires on both sides is reported per side — that is where the reader looks.
      const key = `${e.side}:${c.processId}`
      const row = byProcess.get(key) ?? { processId: c.processId, name: c.name, side: e.side, amountMinor: 0, count: 0 }
      row.amountMinor += c.amountMinor
      row.count++
      byProcess.set(key, row)
    }
  }
  t.totalProcessMinor = t.saleProcessMinor + t.purchaseProcessMinor
  t.byProcess = [...byProcess.values()].sort((a, b) => b.amountMinor - a.amountMinor)
  return t
}
