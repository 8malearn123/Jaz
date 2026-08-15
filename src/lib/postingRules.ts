import type { Bilingual } from '@/data/types'
import { ACC, centerKindAccount, splitVatInclusive, vatOn } from '@/data/coa'
import type { CostCenterKind, ProcessCharge } from '@/data/costCenters'
import { credit, debit, type JournalDraft, type JournalLine } from '@/data/ledger'
import { monthlyDepreciation, type FixedAsset } from '@/data/fixedAssets'
import { assetCategoryMeta } from '@/data/fixedAssets'

// ── Posting rules — the one place a business document becomes an accounting entry.
//
// Every automatic posting in the console routes through a function here, and the opening
// book is built from these same functions. That matters: it means the seeded figures and
// anything posted later in the session are produced by identical arithmetic, so the books
// can never disagree with themselves.
//
// Amounts follow the rest of the codebase: integer minor units (halalas). Where a document
// is quoted VAT-inclusive — as a customer invoice and a supplier invoice both are — the tax
// is split out with `splitVatInclusive`, never re-derived by a second rounding.

/** Which revenue account a channel sells into. */
export type SaleChannel = 'b2c' | 'b2b' | 'mega'

const revenueAccount: Record<SaleChannel, string> = {
  b2c: ACC.salesRetail,
  b2b: ACC.salesWholesale,
  mega: ACC.salesExport,
}

export interface SaleInput {
  date: string
  /** Order number — the document the entry accounts for. */
  ref: string
  party: Bilingual
  channel: SaleChannel
  /** VAT-inclusive total the customer is billed. */
  grossMinor: number
  /** Settled at the till (B2C) or billed to the account on terms (B2B/MEGA). */
  onCredit: boolean
  /** Cost of what left the shelf. Omit when the sale carries no inventory movement. */
  cogsMinor?: number
  centerId?: string
  by?: Bilingual
}

/**
 * A sale. The customer is charged VAT-inclusive; the revenue is recognised net and the
 * tax is held for ZATCA. When the cost of the goods is known it rides on the same entry,
 * so an order's margin is one document rather than two.
 */
export function saleEntry(input: SaleInput): JournalDraft {
  const { netMinor, vatMinor } = splitVatInclusive(input.grossMinor)
  const lines: JournalLine[] = [
    debit(input.onCredit ? ACC.receivables : ACC.bank, input.grossMinor, { centerId: input.centerId }),
    credit(revenueAccount[input.channel], netMinor, { centerId: input.centerId }),
    credit(ACC.vatOutput, vatMinor),
  ]
  if (input.cogsMinor && input.cogsMinor > 0) {
    lines.push(debit(ACC.cogs, input.cogsMinor, { centerId: input.centerId }))
    lines.push(credit(ACC.finishedInventory, input.cogsMinor))
  }
  return {
    date: input.date,
    source: 'sale',
    sourceRef: input.ref,
    party: input.party,
    memo: {
      en: `Sale ${input.ref}${input.onCredit ? ' on account' : ''}`,
      ar: `مبيعات ${input.ref}${input.onCredit ? ' على الحساب' : ''}`,
    },
    lines,
    by: input.by,
  }
}

/** Where a purchase is capitalised. */
export type PurchaseTarget = 'raw' | 'packaging' | 'finished'

const purchaseAccount: Record<PurchaseTarget, string> = {
  raw: ACC.rawInventory,
  packaging: ACC.packagingInventory,
  finished: ACC.finishedInventory,
}

export interface PurchaseInput {
  date: string
  /** Supplier invoice id. */
  ref: string
  supplier: Bilingual
  /** VAT-inclusive invoice total. */
  grossMinor: number
  target: PurchaseTarget
  /** Settled on the spot rather than taken on terms. */
  paid?: boolean
  centerId?: string
  by?: Bilingual
}

/** A supplier invoice: stock in, recoverable tax out, and the balance owed to the supplier. */
export function purchaseEntry(input: PurchaseInput): JournalDraft {
  const { netMinor, vatMinor } = splitVatInclusive(input.grossMinor)
  return {
    date: input.date,
    source: 'purchase',
    sourceRef: input.ref,
    party: input.supplier,
    memo: { en: `Purchase invoice ${input.ref}`, ar: `فاتورة شراء ${input.ref}` },
    lines: [
      debit(purchaseAccount[input.target], netMinor, { centerId: input.centerId }),
      debit(ACC.vatInput, vatMinor),
      credit(input.paid ? ACC.bank : ACC.payables, input.grossMinor),
    ],
    by: input.by,
  }
}

export interface SettlementInput {
  date: string
  ref: string
  party: Bilingual
  amountMinor: number
  /** Cash drawer instead of the bank. */
  toCash?: boolean
  by?: Bilingual
}

/** Money in from a customer — the receivable clears, the bank rises. */
export function receiptEntry(input: SettlementInput): JournalDraft {
  return {
    date: input.date,
    source: 'receipt',
    sourceRef: input.ref,
    party: input.party,
    memo: { en: `Receipt ${input.ref}`, ar: `تحصيل ${input.ref}` },
    lines: [
      debit(input.toCash ? ACC.cash : ACC.bank, input.amountMinor),
      credit(ACC.receivables, input.amountMinor),
    ],
    by: input.by,
  }
}

/** Money out to a supplier — the payable clears, the bank falls. */
export function paymentEntry(input: SettlementInput): JournalDraft {
  return {
    date: input.date,
    source: 'payment',
    sourceRef: input.ref,
    party: input.party,
    memo: { en: `Payment ${input.ref}`, ar: `سداد ${input.ref}` },
    lines: [
      debit(ACC.payables, input.amountMinor),
      credit(input.toCash ? ACC.cash : ACC.bank, input.amountMinor),
    ],
    by: input.by,
  }
}

export interface WasteInput {
  date: string
  ref: string
  item: Bilingual
  lossMinor: number
  /** Raw material written off, or finished stock. */
  scope?: 'raw' | 'finished'
  reason?: Bilingual
  centerId?: string
  by?: Bilingual
}

/** A write-off: stock leaves without a sale, so its cost becomes an expense on the spot. */
export function wasteEntry(input: WasteInput): JournalDraft {
  return {
    date: input.date,
    source: 'waste',
    sourceRef: input.ref,
    party: input.item,
    memo: input.reason
      ? { en: `Write-off — ${input.reason.en}`, ar: `هدر — ${input.reason.ar}` }
      : { en: 'Write-off', ar: 'هدر' },
    lines: [
      debit(ACC.waste, input.lossMinor, { centerId: input.centerId, memo: input.item }),
      credit(input.scope === 'raw' ? ACC.rawInventory : ACC.finishedInventory, input.lossMinor),
    ],
    by: input.by,
  }
}

export interface ProductionInput {
  date: string
  /** Batch code. */
  ref: string
  product: Bilingual
  /** Raw material consumed, at cost. */
  rawCostMinor: number
  centerId?: string
  by?: Bilingual
}

/** A production batch moves value from raw stock into finished stock. Nothing is earned yet. */
export function productionEntry(input: ProductionInput): JournalDraft {
  return {
    date: input.date,
    source: 'production',
    sourceRef: input.ref,
    party: input.product,
    memo: { en: `Batch ${input.ref} produced`, ar: `إنتاج الدفعة ${input.ref}` },
    lines: [
      debit(ACC.finishedInventory, input.rawCostMinor, { centerId: input.centerId }),
      credit(ACC.rawInventory, input.rawCostMinor),
    ],
    by: input.by,
  }
}

export interface CostCenterInput {
  date: string
  ref: string
  party: Bilingual
  centerId: string
  centerKind: CostCenterKind
  centerName: Bilingual
  side: 'sale' | 'purchase'
  /** The processes as they were valued onto the document. */
  charges: ProcessCharge[]
  by?: Bilingual
}

/**
 * A cost centre's absorbed load. Each process is a real charge the business has taken on
 * — a commission, a freight bill, a card fee — so it is expensed to the account its centre
 * belongs to and accrued as owed. Every line keeps the centre on it, which is what lets a
 * cost-centre report and the general ledger be reconciled against each other.
 */
export function costCenterEntry(input: CostCenterInput): JournalDraft | null {
  const charges = input.charges.filter((c) => c.amountMinor > 0)
  if (charges.length === 0) return null
  const account = centerKindAccount[input.centerKind]
  const total = charges.reduce((s, c) => s + c.amountMinor, 0)
  return {
    date: input.date,
    source: 'cost_center',
    sourceRef: input.ref,
    party: input.party,
    memo: {
      en: `${input.centerName.en} — load on ${input.ref}`,
      ar: `${input.centerName.ar} — تحميل على ${input.ref}`,
    },
    lines: [
      ...charges.map((c) => debit(account, c.amountMinor, { centerId: input.centerId, memo: c.name })),
      credit(ACC.accrued, total),
    ],
    by: input.by,
  }
}

export interface DepreciationInput {
  date: string
  /** Period being charged, YYYY-MM. */
  period: string
  assets: FixedAsset[]
  /** Months already posted since the book opened, so a retired asset stops being charged. */
  monthsPosted: number
  by?: Bilingual
}

/** One month of straight-line depreciation across the register, a line per asset. */
export function depreciationEntry(input: DepreciationInput): JournalDraft | null {
  const charges = input.assets
    .filter((a) => a.openingMonths + input.monthsPosted < a.lifeMonths)
    .map((a) => ({ asset: a, amountMinor: monthlyDepreciation(a) }))
    .filter((c) => c.amountMinor > 0)
  if (charges.length === 0) return null
  const total = charges.reduce((s, c) => s + c.amountMinor, 0)
  return {
    date: input.date,
    source: 'depreciation',
    sourceRef: `DEP-${input.period}`,
    memo: { en: `Depreciation for ${input.period}`, ar: `إهلاك الفترة ${input.period}` },
    lines: [
      ...charges.map((c) =>
        debit(ACC.depreciation, c.amountMinor, { centerId: c.asset.centerId, memo: c.asset.name }),
      ),
      credit(ACC.accumDepreciation, total),
    ],
    by: input.by,
  }
}

/** Which balance-sheet account an asset is capitalised in. */
export const assetAccountOf = (a: FixedAsset): string => assetCategoryMeta[a.category].account

export interface AssetPurchaseInput {
  date: string
  asset: FixedAsset
  /** VAT-inclusive purchase price. Omit to capitalise the net cost with no tax. */
  grossMinor?: number
  paid?: boolean
  by?: Bilingual
}

/** Buying an asset — capitalised, not expensed. Its cost reaches the income statement only through depreciation. */
export function assetPurchaseEntry(input: AssetPurchaseInput): JournalDraft {
  const gross = input.grossMinor ?? input.asset.costMinor + vatOn(input.asset.costMinor)
  const { netMinor, vatMinor } = splitVatInclusive(gross)
  return {
    date: input.date,
    source: 'purchase',
    sourceRef: input.asset.id,
    party: input.asset.name,
    memo: { en: `Asset acquired — ${input.asset.name.en}`, ar: `اقتناء أصل — ${input.asset.name.ar}` },
    lines: [
      debit(assetAccountOf(input.asset), netMinor, { centerId: input.asset.centerId }),
      debit(ACC.vatInput, vatMinor),
      credit(input.paid ? ACC.bank : ACC.payables, gross),
    ],
    by: input.by,
  }
}

export interface VatCloseInput {
  date: string
  period: string
  outputMinor: number
  inputMinor: number
  by?: Bilingual
}

/**
 * Closing the VAT accounts for a period: what was collected less what was paid becomes a
 * single balance owed to — or recoverable from — ZATCA.
 */
export function vatCloseEntry(input: VatCloseInput): JournalDraft | null {
  if (input.outputMinor === 0 && input.inputMinor === 0) return null
  const net = input.outputMinor - input.inputMinor
  const lines: JournalLine[] = [
    debit(ACC.vatOutput, input.outputMinor),
    credit(ACC.vatInput, input.inputMinor),
  ]
  lines.push(net >= 0 ? credit(ACC.vatPayable, net) : debit(ACC.vatPayable, -net))
  return {
    date: input.date,
    source: 'vat',
    sourceRef: `VAT-${input.period}`,
    memo: { en: `VAT return ${input.period}`, ar: `إقرار ضريبة القيمة المضافة ${input.period}` },
    lines: lines.filter((l) => l.debitMinor > 0 || l.creditMinor > 0),
    by: input.by,
  }
}

/** Paying ZATCA what the return said was due. */
export function vatPaymentEntry(input: { date: string; period: string; amountMinor: number; by?: Bilingual }): JournalDraft {
  return {
    date: input.date,
    source: 'vat',
    sourceRef: `VAT-PAY-${input.period}`,
    memo: { en: `VAT settled for ${input.period}`, ar: `سداد ضريبة الفترة ${input.period}` },
    lines: [debit(ACC.vatPayable, input.amountMinor), credit(ACC.bank, input.amountMinor)],
    by: input.by,
  }
}
