import type { Bilingual } from './types'
import { ACC, splitVatInclusive, vatOn } from './coa'
import { credit, debit, numberDrafts, type AccountingPeriod, type JournalDraft, type JournalEntry } from './ledger'
import { fixedAssetsSeed, openingAccumulated, assetCategoryMeta } from './fixedAssets'
import { finBase, receivables, wasteLog } from './ownerFinance'
import { purchaseInvoices } from './ownerSupply'
import { costCentersSeed, applyProcesses } from './costCenters'
import { saleEntry, purchaseEntry, receiptEntry, wasteEntry, depreciationEntry, costCenterEntry } from '@/lib/postingRules'

// ── The opening book — isolated.
//
// The console already showed money everywhere before it had a ledger: headline revenue
// and cost in `ownerFinance.finBase`, who owes what in `receivables`, supplier invoices
// in `ownerSupply.purchaseInvoices`, write-offs in `wasteLog`. Those figures were true
// but unbooked. This file books them, through the very same posting rules a live document
// goes through, so the general ledger opens agreeing with every screen that came before it.
//
// Two properties are structural, not coincidental:
//   · Trade receivables (1200) end at exactly the sum of `receivables` — each account is
//     invoiced and part-paid down to the outstanding balance the collection tab shows.
//   · Trade payables (2100) end at exactly the unpaid supplier invoices.
// `scripts/verify-accounting.mjs` asserts both, so a change to either seed that breaks the
// tie fails the build rather than quietly producing a wrong balance sheet.

/** June is closed and reconciled; July is the live period. */
export const OPENING_DATE = '2026-06-30'
export const OPEN_PERIOD = '2026-07'

export const periodsSeed: AccountingPeriod[] = [
  { key: '2026-05', label: { en: 'May 2026', ar: 'مايو ٢٠٢٦' }, closed: true, closedAt: '2026-06-03', closedBy: { en: 'Finance department', ar: 'قسم المالية' } },
  { key: '2026-06', label: { en: 'June 2026', ar: 'يونيو ٢٠٢٦' }, closed: true, closedAt: '2026-07-04', closedBy: { en: 'Finance department', ar: 'قسم المالية' } },
  { key: '2026-07', label: { en: 'July 2026', ar: 'يوليو ٢٠٢٦' }, closed: false },
  { key: '2026-08', label: { en: 'August 2026', ar: 'أغسطس ٢٠٢٦' }, closed: false },
]

/** Opening balances struck at 30 June. Values are the position the July book starts from. */
const OPENING = {
  cash: 1500000,
  bank: 48000000,
  rawInventory: 12600000,
  finishedInventory: 186400000,
}

const openedBy: Bilingual = { en: 'Finance department', ar: 'قسم المالية' }

/**
 * The opening balance sheet. Capital is the balancing figure — deliberately, so this
 * entry can never be out of balance no matter how the opening positions are edited.
 */
function openingEntry(): JournalDraft {
  const byAccount = new Map<string, number>()
  for (const a of fixedAssetsSeed) {
    const code = assetCategoryMeta[a.category].account
    byAccount.set(code, (byAccount.get(code) ?? 0) + a.costMinor)
  }
  const accumulated = fixedAssetsSeed.reduce((s, a) => s + openingAccumulated(a), 0)

  const debits = [
    debit(ACC.cash, OPENING.cash),
    debit(ACC.bank, OPENING.bank),
    debit(ACC.rawInventory, OPENING.rawInventory),
    debit(ACC.finishedInventory, OPENING.finishedInventory),
    ...[...byAccount.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, cost]) => debit(code, cost)),
  ]
  const totalDebit = debits.reduce((s, l) => s + l.debitMinor, 0)
  const capital = totalDebit - accumulated

  return {
    date: OPENING_DATE,
    source: 'opening',
    sourceRef: 'OB-2026-07',
    memo: { en: 'Opening balances at 30 June 2026', ar: 'الأرصدة الافتتاحية في ٣٠ يونيو ٢٠٢٦' },
    lines: [...debits, credit(ACC.accumDepreciation, accumulated), credit(ACC.capital, capital)],
    by: openedBy,
  }
}

/** ISO dates for the July activity, so the seed is deterministic and never reads the clock. */
const D = {
  w1: '2026-07-06',
  w2: '2026-07-13',
  w3: '2026-07-20',
  depreciation: '2026-07-31',
}

/** Each open receivable, invoiced in full and then part-paid down to the balance still owed. */
const CREDIT_SALES = receivables.map((r) => {
  // Invoiced at two-and-a-half times what is still outstanding — the account has been
  // trading and settling, and this is the tail of it.
  const grossMinor = Math.round(r.outstandingMinor * 2.5)
  return {
    row: r,
    grossMinor,
    receiptMinor: grossMinor - r.outstandingMinor,
    channel: r.channel === 'MEGA' ? ('mega' as const) : ('b2b' as const),
  }
})

const creditNetTotal = CREDIT_SALES.reduce((s, c) => s + splitVatInclusive(c.grossMinor).netMinor, 0)

/**
 * Retail takings for the three weeks of July. The first two are the weeks as they were
 * banked; the third carries whatever is left so that total revenue across the book lands
 * on `finBase.revenueMinor` — the figure the executive overview has always shown.
 */
const RETAIL_NETS = (() => {
  const w1 = 40000000
  const w2 = 44000000
  const w3 = finBase.revenueMinor - creditNetTotal - w1 - w2
  return [
    { ref: 'RT-2607-W1', date: D.w1, netMinor: w1, label: { en: 'Boutique takings — week 1', ar: 'مبيعات المعارض — الأسبوع الأول' } },
    { ref: 'RT-2607-W2', date: D.w2, netMinor: w2, label: { en: 'Boutique takings — week 2', ar: 'مبيعات المعارض — الأسبوع الثاني' } },
    { ref: 'RT-2607-W3', date: D.w3, netMinor: w3, label: { en: 'Boutique takings — week 3', ar: 'مبيعات المعارض — الأسبوع الثالث' } },
  ]
})()

/**
 * Cost of goods sold, spread across every sale in proportion to its revenue so the total
 * lands exactly on `finBase.cogsMinor`. The last sale absorbs the rounding remainder,
 * which is how an allocation is made to tie rather than to nearly tie.
 */
function allocateCogs(netAmounts: number[]): number[] {
  const totalNet = netAmounts.reduce((s, n) => s + n, 0)
  if (totalNet === 0) return netAmounts.map(() => 0)
  const out = netAmounts.map((n) => Math.round((finBase.cogsMinor * n) / totalNet))
  const drift = finBase.cogsMinor - out.reduce((s, n) => s + n, 0)
  out[out.length - 1] += drift
  return out
}

/** Which target account a supplier invoice restocks. */
const purchaseTargetOf = (rawKey?: string) => (rawKey === 'foil' ? ('packaging' as const) : ('raw' as const))

/**
 * The whole opening book, in the order it is posted. Every entry here is produced by the
 * same posting rules a document raised in the console goes through today.
 */
export function buildOpeningJournal(): JournalDraft[] {
  const drafts: JournalDraft[] = [openingEntry()]

  const netAmounts = [
    ...CREDIT_SALES.map((c) => splitVatInclusive(c.grossMinor).netMinor),
    ...RETAIL_NETS.map((r) => r.netMinor),
  ]
  const cogs = allocateCogs(netAmounts)

  // ── sales on account, each followed by the payment that brought it down to its balance ──
  CREDIT_SALES.forEach((c, i) => {
    const ref = `INV-${c.row.id}`
    drafts.push(
      saleEntry({
        date: D.w1,
        ref,
        party: c.row.account,
        channel: c.channel,
        grossMinor: c.grossMinor,
        onCredit: true,
        cogsMinor: cogs[i],
        by: openedBy,
      }),
    )
    if (c.receiptMinor > 0) {
      drafts.push(
        receiptEntry({
          date: D.w2,
          ref: `RCPT-${c.row.id}`,
          party: c.row.account,
          amountMinor: c.receiptMinor,
          by: openedBy,
        }),
      )
    }
  })

  // ── retail takings, banked as they were collected ──
  RETAIL_NETS.forEach((r, i) => {
    drafts.push(
      saleEntry({
        date: r.date,
        ref: r.ref,
        party: r.label,
        channel: 'b2c',
        grossMinor: r.netMinor + vatOn(r.netMinor),
        onCredit: false,
        cogsMinor: cogs[CREDIT_SALES.length + i],
        centerId: 'CC-04',
        by: openedBy,
      }),
    )
  })

  // ── supplier invoices; a matched invoice was settled, the rest are still owed ──
  for (const inv of purchaseInvoices) {
    drafts.push(
      purchaseEntry({
        date: D.w1,
        ref: inv.id,
        supplier: inv.supplier,
        grossMinor: inv.totalMinor,
        target: purchaseTargetOf(inv.rawKey),
        paid: inv.match === 'matched',
        by: openedBy,
      }),
    )
  }

  // ── write-offs, exactly as the waste log records them ──
  for (const w of wasteLog) {
    drafts.push(
      wasteEntry({
        date: D.w2,
        ref: w.id.toUpperCase(),
        item: w.item,
        lossMinor: w.lossMinor,
        scope: w.scope,
        reason: w.reason,
        by: w.by ?? openedBy,
      }),
    )
  }

  // ── the cost centres' own load on that trading, valued by their real processes ──
  const boutique = costCentersSeed.find((c) => c.id === 'CC-04')
  if (boutique) {
    const retailGross = RETAIL_NETS.reduce((s, r) => s + r.netMinor, 0)
    const load = costCenterEntry({
      date: D.w3,
      ref: 'RT-2607-W1..W3',
      party: { en: 'Boutique retail floor', ar: 'أرضية المعارض' },
      centerId: boutique.id,
      centerKind: boutique.kind,
      centerName: boutique.name,
      side: 'sale',
      charges: applyProcesses(boutique, 'sale', { amountMinor: retailGross, qty: 4200 }),
      by: openedBy,
    })
    if (load) drafts.push(load)
  }

  const coldChain = costCentersSeed.find((c) => c.id === 'CC-03')
  if (coldChain) {
    const load = costCenterEntry({
      date: D.w3,
      ref: 'INV-AR-03',
      party: { en: 'Hyper Panda', ar: 'هايبر بنده' },
      centerId: coldChain.id,
      centerKind: coldChain.kind,
      centerName: coldChain.name,
      side: 'sale',
      charges: applyProcesses(coldChain, 'sale', { amountMinor: 88000000, qty: 2600 }),
      by: openedBy,
    })
    if (load) drafts.push(load)
  }

  const exportDesk = costCentersSeed.find((c) => c.id === 'CC-05')
  if (exportDesk) {
    const load = costCenterEntry({
      date: D.w3,
      ref: 'INV-AR-01',
      party: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' },
      centerId: exportDesk.id,
      centerKind: exportDesk.kind,
      centerName: exportDesk.name,
      side: 'sale',
      charges: applyProcesses(exportDesk, 'sale', { amountMinor: 66000000, qty: 1800 }),
      by: openedBy,
    })
    if (load) drafts.push(load)
  }

  // ── the month's depreciation ──
  const dep = depreciationEntry({
    date: D.depreciation,
    period: OPEN_PERIOD,
    assets: fixedAssetsSeed,
    monthsPosted: 0,
    by: openedBy,
  })
  if (dep) drafts.push(dep)

  return drafts
}

/**
 * The opening book as posted entries, numbered from JV-0001. The provider starts from this
 * and `scripts/verify-accounting.mjs` rebuilds the very same thing to check its invariants,
 * so what is verified is exactly what the console shows.
 */
export function openingBook(): { entries: JournalEntry[]; nextSeq: number } {
  return numberDrafts(buildOpeningJournal())
}

/* ── the subledgers the control accounts must agree with ─────────────────── */

/** What the collection tab says is owed to Jaz, as the ledger must also say. */
export const receivablesSubledgerMinor = receivables.reduce((s, r) => s + r.outstandingMinor, 0)

/** Supplier invoices not yet settled. */
export const payablesSubledgerMinor = purchaseInvoices
  .filter((i) => i.match !== 'matched')
  .reduce((s, i) => s + i.totalMinor, 0)
