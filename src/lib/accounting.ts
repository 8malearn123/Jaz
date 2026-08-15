import type { Bilingual } from '@/data/types'
import { type Account, type AccountType, accountOf, VAT_RATE } from '@/data/coa'
import { ACC } from '@/data/coa'
import type { JournalEntry, JournalLine, JournalSource } from '@/data/ledger'
import { credit, debit } from '@/data/ledger'

// ── The accounting engine — pure functions over the book.
//
// Nothing here holds state or touches React: hand it the chart and the journal and it
// hands back a trial balance, a set of financial statements, a VAT return, an aging or
// a closing entry. That is what makes the numbers testable — scripts/verify-accounting
// asserts the invariants against these very functions, not against the screens.
//
// A reversed entry and the reversal that undid it BOTH stay in the book; their effects
// cancel. So every reading below walks all entries, exactly as a real ledger does.

/* ── filtering ────────────────────────────────────────────────────────────── */

export interface EntryFilter {
  /** Inclusive period bounds, YYYY-MM. */
  fromPeriod?: string
  toPeriod?: string
  source?: JournalSource
  /** Only entries touching this account. */
  accountCode?: string
  /** Only entries carrying a line on this cost centre. */
  centerId?: string
}

export function filterEntries(entries: JournalEntry[], f: EntryFilter = {}): JournalEntry[] {
  return entries.filter((e) => {
    if (f.fromPeriod && e.period < f.fromPeriod) return false
    if (f.toPeriod && e.period > f.toPeriod) return false
    if (f.source && e.source !== f.source) return false
    if (f.accountCode && !e.lines.some((l) => l.accountCode === f.accountCode)) return false
    if (f.centerId && !e.lines.some((l) => l.centerId === f.centerId)) return false
    return true
  })
}

/** Newest first — the order every register in the console reads in. */
export const byDateDesc = (a: JournalEntry, b: JournalEntry): number =>
  b.date === a.date ? b.no.localeCompare(a.no) : b.date.localeCompare(a.date)

/* ── account balances ─────────────────────────────────────────────────────── */

export interface Movement {
  debitMinor: number
  creditMinor: number
}

/** What was posted to one account across the given entries. */
export function movementOf(entries: JournalEntry[], code: string): Movement {
  let debitMinor = 0
  let creditMinor = 0
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.accountCode !== code) continue
      debitMinor += l.debitMinor
      creditMinor += l.creditMinor
    }
  }
  return { debitMinor, creditMinor }
}

/**
 * The account's balance, signed by its own normal side: positive means the account
 * stands where it should. A contra account (accumulated depreciation, sales returns)
 * carries its own normal side too, so it reads positive when it is doing its job.
 */
export function balanceOf(accounts: Account[], entries: JournalEntry[], code: string): number {
  const acc = accountOf(accounts, code)
  const m = movementOf(entries, code)
  return acc?.normal === 'credit' ? m.creditMinor - m.debitMinor : m.debitMinor - m.creditMinor
}

/** Balance of every postable descendant of a header account, added up. */
export function groupBalance(accounts: Account[], entries: JournalEntry[], parentCode: string): number {
  return accounts
    .filter((a) => a.postable && isUnder(accounts, a, parentCode))
    .reduce((sum, a) => sum + signedGroupContribution(accounts, entries, a), 0)
}

/** Is this account somewhere below the given header? */
export function isUnder(accounts: Account[], account: Account, parentCode: string): boolean {
  let cur: Account | undefined = account
  while (cur) {
    if (cur.code === parentCode) return true
    cur = cur.parent ? accountOf(accounts, cur.parent) : undefined
  }
  return false
}

/** A contra account reduces the group it sits in, so it contributes negatively to the total. */
function signedGroupContribution(accounts: Account[], entries: JournalEntry[], a: Account): number {
  const bal = balanceOf(accounts, entries, a.code)
  return a.contra ? -bal : bal
}

/* ── trial balance ────────────────────────────────────────────────────────── */

export interface TrialBalanceRow {
  account: Account
  debitMinor: number
  creditMinor: number
  /** Gross movement, for the "any activity at all" filter on screen. */
  movement: Movement
}

export interface TrialBalance {
  rows: TrialBalanceRow[]
  totalDebitMinor: number
  totalCreditMinor: number
  /** The whole point of the report: these two must be equal. */
  balanced: boolean
}

/** Every postable account with a balance, each on the side it actually stands. */
export function trialBalance(accounts: Account[], entries: JournalEntry[]): TrialBalance {
  const rows: TrialBalanceRow[] = []
  for (const a of accounts) {
    if (!a.postable) continue
    const m = movementOf(entries, a.code)
    const net = m.debitMinor - m.creditMinor
    if (net === 0 && m.debitMinor === 0) continue
    rows.push({
      account: a,
      debitMinor: net > 0 ? net : 0,
      creditMinor: net < 0 ? -net : 0,
      movement: m,
    })
  }
  const totalDebitMinor = rows.reduce((s, r) => s + r.debitMinor, 0)
  const totalCreditMinor = rows.reduce((s, r) => s + r.creditMinor, 0)
  return { rows, totalDebitMinor, totalCreditMinor, balanced: totalDebitMinor === totalCreditMinor }
}

/* ── general ledger ───────────────────────────────────────────────────────── */

export interface LedgerRow {
  entry: JournalEntry
  line: JournalLine
  debitMinor: number
  creditMinor: number
  /** Balance after this movement, on the account's normal side. */
  balanceMinor: number
}

/** One account's history in date order, with the balance carried down. */
export function ledgerRows(accounts: Account[], entries: JournalEntry[], code: string): LedgerRow[] {
  const acc = accountOf(accounts, code)
  const creditNormal = acc?.normal === 'credit'
  const hits: { entry: JournalEntry; line: JournalLine }[] = []
  for (const e of entries) for (const l of e.lines) if (l.accountCode === code) hits.push({ entry: e, line: l })
  hits.sort((a, b) => (a.entry.date === b.entry.date ? a.entry.no.localeCompare(b.entry.no) : a.entry.date.localeCompare(b.entry.date)))
  let running = 0
  return hits.map(({ entry, line }) => {
    running += creditNormal ? line.creditMinor - line.debitMinor : line.debitMinor - line.creditMinor
    return { entry, line, debitMinor: line.debitMinor, creditMinor: line.creditMinor, balanceMinor: running }
  })
}

/* ── income statement ─────────────────────────────────────────────────────── */

export interface StatementLine {
  code: string
  label: Bilingual
  amountMinor: number
}

export interface IncomeStatement {
  revenue: StatementLine[]
  grossRevenueMinor: number
  returnsMinor: number
  netRevenueMinor: number
  cogsMinor: number
  grossProfitMinor: number
  operatingExpenses: StatementLine[]
  operatingExpensesMinor: number
  otherExpenses: StatementLine[]
  otherExpensesMinor: number
  totalExpensesMinor: number
  netProfitMinor: number
  /** Gross margin as a percentage of net revenue, 0 when there is no revenue yet. */
  grossMarginPct: number
  netMarginPct: number
}

const lineOf = (a: Account, amountMinor: number): StatementLine => ({ code: a.code, label: a.name, amountMinor })

export function incomeStatement(accounts: Account[], entries: JournalEntry[]): IncomeStatement {
  const revenueAccounts = accounts.filter((a) => a.postable && a.type === 'revenue' && !a.contra)
  const returnAccounts = accounts.filter((a) => a.postable && a.type === 'revenue' && a.contra)

  const revenue = revenueAccounts
    .map((a) => lineOf(a, balanceOf(accounts, entries, a.code)))
    .filter((l) => l.amountMinor !== 0)
  const grossRevenueMinor = revenue.reduce((s, l) => s + l.amountMinor, 0)
  const returnsMinor = returnAccounts.reduce((s, a) => s + balanceOf(accounts, entries, a.code), 0)
  const netRevenueMinor = grossRevenueMinor - returnsMinor

  const cogsMinor = balanceOf(accounts, entries, ACC.cogs)
  const grossProfitMinor = netRevenueMinor - cogsMinor

  // Operating expenses are everything under 5300 — the running cost of the business.
  const operatingExpenses = accounts
    .filter((a) => a.postable && isUnder(accounts, a, '5300'))
    .map((a) => lineOf(a, balanceOf(accounts, entries, a.code)))
    .filter((l) => l.amountMinor !== 0)
  const operatingExpensesMinor = operatingExpenses.reduce((s, l) => s + l.amountMinor, 0)

  // Waste and depreciation sit outside the operating block so they can be read on their own.
  const otherExpenses = [ACC.waste, ACC.depreciation]
    .map((code) => {
      const a = accountOf(accounts, code)
      return a ? lineOf(a, balanceOf(accounts, entries, code)) : null
    })
    .filter((l): l is StatementLine => l !== null && l.amountMinor !== 0)
  const otherExpensesMinor = otherExpenses.reduce((s, l) => s + l.amountMinor, 0)

  const totalExpensesMinor = cogsMinor + operatingExpensesMinor + otherExpensesMinor
  const netProfitMinor = netRevenueMinor - totalExpensesMinor
  const pct = (part: number) => (netRevenueMinor > 0 ? Math.round((part / netRevenueMinor) * 1000) / 10 : 0)

  return {
    revenue, grossRevenueMinor, returnsMinor, netRevenueMinor,
    cogsMinor, grossProfitMinor,
    operatingExpenses, operatingExpensesMinor,
    otherExpenses, otherExpensesMinor,
    totalExpensesMinor, netProfitMinor,
    grossMarginPct: pct(grossProfitMinor),
    netMarginPct: pct(netProfitMinor),
  }
}

/* ── balance sheet ────────────────────────────────────────────────────────── */

export interface BalanceSheetGroup {
  label: Bilingual
  lines: StatementLine[]
  totalMinor: number
}

export interface BalanceSheet {
  assets: BalanceSheetGroup
  liabilities: BalanceSheetGroup
  equity: BalanceSheetGroup
  /** Profit for the period, carried into equity until the period is closed. */
  periodResultMinor: number
  totalAssetsMinor: number
  totalLiabilitiesAndEquityMinor: number
  /** Assets = liabilities + equity. */
  balanced: boolean
  differenceMinor: number
}

function groupOf(accounts: Account[], entries: JournalEntry[], type: AccountType, label: Bilingual): BalanceSheetGroup {
  const lines = accounts
    .filter((a) => a.postable && a.type === type)
    .map((a) => {
      const bal = balanceOf(accounts, entries, a.code)
      // A contra account is shown as the negative it is, so the group adds up on screen.
      return lineOf(a, a.contra ? -bal : bal)
    })
    .filter((l) => l.amountMinor !== 0)
  return { label, lines, totalMinor: lines.reduce((s, l) => s + l.amountMinor, 0) }
}

export function balanceSheet(accounts: Account[], entries: JournalEntry[]): BalanceSheet {
  const assets = groupOf(accounts, entries, 'asset', { en: 'Assets', ar: 'الأصول' })
  const liabilities = groupOf(accounts, entries, 'liability', { en: 'Liabilities', ar: 'الخصوم' })
  const equityBase = groupOf(accounts, entries, 'equity', { en: 'Equity', ar: 'حقوق الملكية' })

  // Revenue and expenses have not been closed to equity yet, so the period's result is
  // added here — that is what makes the sheet balance mid-period.
  const periodResultMinor = incomeStatement(accounts, entries).netProfitMinor
  const equity: BalanceSheetGroup = {
    ...equityBase,
    lines: periodResultMinor !== 0
      ? [...equityBase.lines, { code: '—', label: { en: 'Result for the period', ar: 'نتيجة الفترة' }, amountMinor: periodResultMinor }]
      : equityBase.lines,
    totalMinor: equityBase.totalMinor + periodResultMinor,
  }

  const totalAssetsMinor = assets.totalMinor
  const totalLiabilitiesAndEquityMinor = liabilities.totalMinor + equity.totalMinor
  return {
    assets, liabilities, equity, periodResultMinor,
    totalAssetsMinor, totalLiabilitiesAndEquityMinor,
    balanced: totalAssetsMinor === totalLiabilitiesAndEquityMinor,
    differenceMinor: totalAssetsMinor - totalLiabilitiesAndEquityMinor,
  }
}

/* ── cash flow (direct) ───────────────────────────────────────────────────── */

export type CashActivity = 'operating' | 'investing' | 'financing'

export interface CashFlowLine {
  label: Bilingual
  activity: CashActivity
  inMinor: number
  outMinor: number
}

export interface CashFlow {
  lines: CashFlowLine[]
  operatingMinor: number
  investingMinor: number
  financingMinor: number
  netMovementMinor: number
  closingCashMinor: number
}

/** Which activity a movement on cash belongs to, read from the account on the other side. */
function activityOf(accounts: Account[], counterCode: string): CashActivity {
  const a = accountOf(accounts, counterCode)
  if (!a) return 'operating'
  if (isUnder(accounts, a, '1400')) return 'investing'
  if (a.type === 'equity') return 'financing'
  return 'operating'
}

/**
 * Built directly from what actually moved through the cash and bank accounts, with each
 * movement classified by the account on the other side of its entry. No estimates.
 */
export function cashFlow(accounts: Account[], entries: JournalEntry[]): CashFlow {
  const cashCodes = accounts.filter((a) => a.cash).map((a) => a.code)
  const buckets = new Map<string, CashFlowLine>()

  for (const e of entries) {
    const cashLines = e.lines.filter((l) => cashCodes.includes(l.accountCode))
    if (cashLines.length === 0) continue
    const counters = e.lines.filter((l) => !cashCodes.includes(l.accountCode))
    const counterTotal = counters.reduce((s, l) => s + l.debitMinor + l.creditMinor, 0)
    const cashIn = cashLines.reduce((s, l) => s + l.debitMinor, 0)
    const cashOut = cashLines.reduce((s, l) => s + l.creditMinor, 0)
    if (counterTotal === 0) continue

    // Split the cash movement across the counter accounts in proportion to their size,
    // so an entry that touches several accounts is reported where the money truly went.
    for (const c of counters) {
      const share = (c.debitMinor + c.creditMinor) / counterTotal
      const acc = accountOf(accounts, c.accountCode)
      const activity = activityOf(accounts, c.accountCode)
      const key = `${activity}:${c.accountCode}`
      const row = buckets.get(key) ?? { label: acc?.name ?? { en: c.accountCode, ar: c.accountCode }, activity, inMinor: 0, outMinor: 0 }
      row.inMinor += Math.round(cashIn * share)
      row.outMinor += Math.round(cashOut * share)
      buckets.set(key, row)
    }
  }

  const lines = [...buckets.values()].filter((l) => l.inMinor !== 0 || l.outMinor !== 0)
  const netOf = (activity: CashActivity) =>
    lines.filter((l) => l.activity === activity).reduce((s, l) => s + l.inMinor - l.outMinor, 0)

  const operatingMinor = netOf('operating')
  const investingMinor = netOf('investing')
  const financingMinor = netOf('financing')
  const closingCashMinor = cashCodes.reduce((s, c) => s + balanceOf(accounts, entries, c), 0)

  return {
    lines: lines.sort((a, b) => b.inMinor + b.outMinor - (a.inMinor + a.outMinor)),
    operatingMinor, investingMinor, financingMinor,
    netMovementMinor: operatingMinor + investingMinor + financingMinor,
    closingCashMinor,
  }
}

/* ── VAT return ───────────────────────────────────────────────────────────── */

export interface VatReturn {
  rate: number
  /** Net sales that carried output tax. */
  salesBaseMinor: number
  outputTaxMinor: number
  /** Net purchases that carried input tax. */
  purchaseBaseMinor: number
  inputTaxMinor: number
  /** Positive → payable to ZATCA. Negative → refundable. */
  netTaxMinor: number
  /** Already settled to ZATCA in this book. */
  settledMinor: number
  dueMinor: number
}

export function vatReturn(accounts: Account[], entries: JournalEntry[]): VatReturn {
  const outputTaxMinor = balanceOf(accounts, entries, ACC.vatOutput)
  const inputTaxMinor = balanceOf(accounts, entries, ACC.vatInput)
  // The base is recovered from the tax at the statutory rate — the same arithmetic the
  // return itself is checked with.
  const baseOf = (tax: number) => Math.round((tax * 100) / VAT_RATE)
  const settledMinor = movementOf(entries, ACC.vatPayable).debitMinor
  const netTaxMinor = outputTaxMinor - inputTaxMinor
  return {
    rate: VAT_RATE,
    salesBaseMinor: baseOf(outputTaxMinor),
    outputTaxMinor,
    purchaseBaseMinor: baseOf(inputTaxMinor),
    inputTaxMinor,
    netTaxMinor,
    settledMinor,
    dueMinor: netTaxMinor - settledMinor,
  }
}

/* ── aging ────────────────────────────────────────────────────────────────── */

export interface AgingInput {
  id: string
  party: Bilingual
  amountMinor: number
  /** 0 → still within terms. */
  daysLate: number
  due?: Bilingual
  note?: Bilingual
}

export type AgingBucketKey = 'current' | 'd30' | 'd60' | 'd90' | 'over90'

export const agingBucketMeta: Record<AgingBucketKey, { label: Bilingual; color: string; bg: string }> = {
  current: { label: { en: 'Within terms', ar: 'ضمن المهلة' }, color: '#2f7d5b', bg: '#e6f2ea' },
  d30: { label: { en: '1–30 days', ar: '١–٣٠ يومًا' }, color: '#8a6b3f', bg: '#f6edde' },
  d60: { label: { en: '31–60 days', ar: '٣١–٦٠ يومًا' }, color: '#b08a57', bg: '#f7efe2' },
  d90: { label: { en: '61–90 days', ar: '٦١–٩٠ يومًا' }, color: '#a4533f', bg: '#f7e9e4' },
  over90: { label: { en: 'Over 90 days', ar: 'أكثر من ٩٠ يومًا' }, color: '#b5403b', bg: '#faeceb' },
}

export const bucketOf = (daysLate: number): AgingBucketKey =>
  daysLate <= 0 ? 'current' : daysLate <= 30 ? 'd30' : daysLate <= 60 ? 'd60' : daysLate <= 90 ? 'd90' : 'over90'

export interface Aging {
  rows: (AgingInput & { bucket: AgingBucketKey })[]
  buckets: { key: AgingBucketKey; amountMinor: number; count: number }[]
  totalMinor: number
  overdueMinor: number
}

export function aging(rows: AgingInput[]): Aging {
  const withBucket = rows.map((r) => ({ ...r, bucket: bucketOf(r.daysLate) }))
  const keys: AgingBucketKey[] = ['current', 'd30', 'd60', 'd90', 'over90']
  return {
    rows: withBucket.sort((a, b) => b.daysLate - a.daysLate),
    buckets: keys.map((key) => {
      const inBucket = withBucket.filter((r) => r.bucket === key)
      return { key, amountMinor: inBucket.reduce((s, r) => s + r.amountMinor, 0), count: inBucket.length }
    }),
    totalMinor: withBucket.reduce((s, r) => s + r.amountMinor, 0),
    overdueMinor: withBucket.filter((r) => r.daysLate > 0).reduce((s, r) => s + r.amountMinor, 0),
  }
}

/* ── period close ─────────────────────────────────────────────────────────── */

/**
 * The closing entry: every revenue and expense account is emptied into the income
 * summary, and the summary is emptied into retained earnings. After it posts, the
 * period's profit lives in equity and the income statement for that period reads zero
 * — which is exactly what closing a period means.
 */
export function closingLines(accounts: Account[], entries: JournalEntry[]): JournalLine[] {
  const lines: JournalLine[] = []
  let expenseTotal = 0
  let revenueTotal = 0

  for (const a of accounts) {
    if (!a.postable || (a.type !== 'revenue' && a.type !== 'expense')) continue
    const m = movementOf(entries, a.code)
    const net = m.debitMinor - m.creditMinor
    if (net === 0) continue
    if (net > 0) {
      // Debit balance (an expense, or a contra-revenue) — credited flat.
      lines.push(credit(a.code, net))
      expenseTotal += net
    } else {
      // Credit balance (revenue) — debited flat.
      lines.push(debit(a.code, -net))
      revenueTotal += -net
    }
  }
  if (lines.length === 0) return []

  // Everything lands in the summary, which then empties into retained earnings and
  // leaves itself at nil — the definition of a closed period.
  if (expenseTotal > 0) lines.push(debit(ACC.incomeSummary, expenseTotal))
  if (revenueTotal > 0) lines.push(credit(ACC.incomeSummary, revenueTotal))

  const profit = revenueTotal - expenseTotal
  if (profit > 0) {
    lines.push(debit(ACC.incomeSummary, profit))
    lines.push(credit(ACC.retained, profit))
  } else if (profit < 0) {
    lines.push(credit(ACC.incomeSummary, -profit))
    lines.push(debit(ACC.retained, -profit))
  }
  return lines
}

/* ── reconciliation ───────────────────────────────────────────────────────── */

export interface ControlCheck {
  code: string
  label: Bilingual
  controlMinor: number
  subledgerMinor: number
  differenceMinor: number
  reconciled: boolean
}

/** Does a control account still equal the subledger it summarises? */
export function controlCheck(
  accounts: Account[],
  entries: JournalEntry[],
  code: string,
  subledgerMinor: number,
): ControlCheck {
  const acc = accountOf(accounts, code)
  const controlMinor = balanceOf(accounts, entries, code)
  return {
    code,
    label: acc?.name ?? { en: code, ar: code },
    controlMinor,
    subledgerMinor,
    differenceMinor: controlMinor - subledgerMinor,
    reconciled: controlMinor === subledgerMinor,
  }
}
