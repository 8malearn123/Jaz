import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import { chartOfAccounts, type Account, type AccountType, type NormalBalance } from '@/data/coa'
import {
  entryProblems, makeEntry, periodOf, periodLabel, realLines,
  reversalLines, type AccountingPeriod, type JournalDraft, type JournalEntry,
} from '@/data/ledger'
import { openingBook, periodsSeed } from '@/data/ledgerSeed'
import { fixedAssetsSeed, type FixedAsset } from '@/data/fixedAssets'
import {
  balanceOf as balanceOfEntries, balanceSheet, cashFlow, incomeStatement,
  ledgerRows as ledgerRowsOf, movementOf, trialBalance, vatReturn,
  type BalanceSheet, type CashFlow, type IncomeStatement, type LedgerRow, type TrialBalance, type VatReturn,
} from '@/lib/accounting'
import { useTeam } from '@/state/TeamContext'

// ── The book. One provider, one journal, one set of rules.
//
// This sits above the accounting section, the orders board, the purchase desk and the
// vendor ledger, because every one of them raises documents that must be accounted for.
// It deliberately exposes no way to edit or delete a posted entry: the only corrections
// are reversals, and the only bar to posting is a closed period. Those two rules are what
// separate a ledger from a list.

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

/** Posting either succeeds and yields the entry, or fails and says why. */
export type PostResult =
  | { ok: true; entry: JournalEntry }
  | { ok: false; problems: Bilingual[] }

interface LedgerCtx {
  /* the chart */
  accounts: Account[]
  postableAccounts: Account[]
  accountOf: (code: string) => Account | undefined
  addAccount: (a: Omit<Account, 'active'>) => void
  updateAccount: (code: string, patch: Partial<Omit<Account, 'code'>>) => void
  toggleAccount: (code: string) => void

  /* the journal */
  entries: JournalEntry[]
  post: (draft: JournalDraft) => PostResult
  /** Post several drafts as one run — used when a document produces more than one entry. */
  postMany: (drafts: JournalDraft[]) => PostResult[]
  reverse: (entryId: string, reason?: Bilingual) => PostResult
  entryOf: (id: string) => JournalEntry | undefined
  /** The entry that already accounts for a document, if it has been booked. */
  entryForRef: (sourceRef: string) => JournalEntry | undefined
  alreadyBooked: (sourceRef: string) => boolean

  /* periods */
  periods: AccountingPeriod[]
  isLocked: (period: string) => boolean
  /** The date an automatic posting should carry — today, unless today's period is closed. */
  bookDate: string
  closePeriod: (period: string, closingDraft?: JournalDraft) => PostResult | null
  reopenPeriod: (period: string) => void

  /* fixed assets */
  assets: FixedAsset[]
  addAsset: (a: Omit<FixedAsset, 'id'>) => string
  removeAsset: (id: string) => void
  /** Depreciation runs posted since the book opened — what the schedule advances by. */
  depreciationRuns: number

  /* readings */
  balanceOf: (code: string) => number
  ledgerRowsOf: (code: string) => LedgerRow[]
  trialBalance: TrialBalance
  incomeStatement: IncomeStatement
  balanceSheet: BalanceSheet
  cashFlow: CashFlow
  vatReturn: VatReturn
  /** Who the book will record as having made the next posting. */
  actingAccount: Bilingual
}

const Ctx = createContext<LedgerCtx | null>(null)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { activeEmployee } = useTeam()
  const [accounts, setAccounts] = useState<Account[]>(() => clone(chartOfAccounts))
  // The opening book is built once, by the same numbering the live postings use.
  const seeded = useMemo(openingBook, [])
  const [entries, setEntries] = useState<JournalEntry[]>(() => seeded.entries)
  // The voucher counter is a ref, not state: one document often produces several entries in
  // a single handler — a sale and the cost-centre load it carries — and state would not have
  // advanced between them, so both would be numbered the same.
  const seq = useRef(seeded.nextSeq)
  const nextNo = useCallback(() => {
    const n = seq.current
    seq.current = n + 1
    return n
  }, [])
  const [periods, setPeriods] = useState<AccountingPeriod[]>(() => clone(periodsSeed))
  const [assets, setAssets] = useState<FixedAsset[]>(() => clone(fixedAssetsSeed))
  const [assetSeq, setAssetSeq] = useState(fixedAssetsSeed.length + 1)

  const actingAccount: Bilingual = activeEmployee
    ? { en: `${activeEmployee.name.en} — ${activeEmployee.title.en}`, ar: `${activeEmployee.name.ar} — ${activeEmployee.title.ar}` }
    : { en: 'Owner — admin console', ar: 'المالك — لوحة التحكم' }

  /* ── the chart ─────────────────────────────────────────────────────────── */

  const accountOf = useCallback((code: string) => accounts.find((a) => a.code === code), [accounts])
  const postableAccounts = useMemo(() => accounts.filter((a) => a.postable && a.active), [accounts])

  const addAccount = useCallback((a: Omit<Account, 'active'>) => {
    setAccounts((prev) => (prev.some((x) => x.code === a.code) ? prev : [...prev, { ...a, active: true }].sort((x, y) => x.code.localeCompare(y.code))))
  }, [])
  const updateAccount = useCallback((code: string, patch: Partial<Omit<Account, 'code'>>) => {
    setAccounts((prev) => prev.map((a) => (a.code === code ? { ...a, ...patch } : a)))
  }, [])
  const toggleAccount = useCallback((code: string) => {
    setAccounts((prev) => prev.map((a) => (a.code === code ? { ...a, active: !a.active } : a)))
  }, [])

  /* ── periods ───────────────────────────────────────────────────────────── */

  const isLocked = useCallback((period: string) => periods.some((p) => p.key === period && p.closed), [periods])

  /**
   * Where an automatic posting lands. Normally today — but if today's period has been
   * closed, a document raised now must not be pushed into a closed period, so it falls
   * back to the latest period still open.
   */
  const bookDate = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (!isLocked(periodOf(today))) return today
    const open = [...periods].reverse().find((p) => !p.closed)
    return open ? `${open.key}-15` : today
  }, [periods, isLocked])

  /** A period the book has never seen opens itself the first time something is posted into it. */
  const registerPeriod = useCallback((key: string) => {
    setPeriods((prev) => (prev.some((p) => p.key === key)
      ? prev
      : [...prev, { key, label: periodLabel(key), closed: false }].sort((a, b) => a.key.localeCompare(b.key))))
  }, [])

  /* ── posting ───────────────────────────────────────────────────────────── */

  /** Everything that would stop this draft from being posted. */
  const problemsWith = useCallback((draft: JournalDraft): Bilingual[] => {
    const problems = entryProblems(draft.lines)
    const period = periodOf(draft.date)
    if (isLocked(period)) {
      const label = periodLabel(period)
      problems.push({
        en: `${label.en} is closed — nothing further can be posted into it.`,
        ar: `فترة ${label.ar} مقفلة — لا يمكن الترحيل عليها.`,
      })
    }
    for (const l of realLines(draft.lines)) {
      const acc = accounts.find((a) => a.code === l.accountCode)
      if (!acc) problems.push({ en: `Account ${l.accountCode} is not in the chart.`, ar: `الحساب ${l.accountCode} غير موجود في الدليل.` })
      else if (!acc.postable) problems.push({ en: `${acc.name.en} is a heading — it cannot carry a posting.`, ar: `${acc.name.ar} حساب تجميعي — لا يقبل الترحيل.` })
      else if (!acc.active) problems.push({ en: `${acc.name.en} is inactive.`, ar: `${acc.name.ar} حساب موقوف.` })
    }
    return problems
  }, [accounts, isLocked])

  const post = useCallback((draft: JournalDraft): PostResult => {
    const problems = problemsWith(draft)
    if (problems.length > 0) return { ok: false, problems }
    const entry = makeEntry({ ...draft, by: draft.by ?? actingAccount }, nextNo())
    setEntries((prev) => [entry, ...prev])
    registerPeriod(entry.period)
    return { ok: true, entry }
  }, [problemsWith, nextNo, actingAccount, registerPeriod])

  /** Post a run of drafts as one commit, so a document that makes several entries makes them together. */
  const postMany = useCallback((drafts: JournalDraft[]): PostResult[] => {
    const results: PostResult[] = []
    const made: JournalEntry[] = []
    for (const d of drafts) {
      const problems = problemsWith(d)
      if (problems.length > 0) {
        results.push({ ok: false, problems })
        continue
      }
      const entry = makeEntry({ ...d, by: d.by ?? actingAccount }, nextNo())
      made.push(entry)
      results.push({ ok: true, entry })
    }
    if (made.length > 0) {
      setEntries((prev) => [...made.slice().reverse(), ...prev])
      for (const e of made) registerPeriod(e.period)
    }
    return results
  }, [problemsWith, nextNo, actingAccount, registerPeriod])

  const entryOf = useCallback((id: string) => entries.find((e) => e.id === id), [entries])
  const entryForRef = useCallback(
    (sourceRef: string) => entries.find((e) => e.sourceRef === sourceRef && e.source !== 'reversal'),
    [entries],
  )
  const alreadyBooked = useCallback((sourceRef: string) => entries.some((e) => e.sourceRef === sourceRef), [entries])

  /**
   * The only correction the book allows. The original stays exactly as it was posted and
   * is marked reversed; the mirror image is posted as its own dated entry.
   */
  const reverse = useCallback((entryId: string, reason?: Bilingual): PostResult => {
    const original = entries.find((e) => e.id === entryId)
    if (!original) return { ok: false, problems: [{ en: 'That entry is not in the book.', ar: 'هذا القيد غير موجود في الدفتر.' }] }
    if (original.status === 'reversed') {
      return { ok: false, problems: [{ en: 'That entry has already been reversed.', ar: 'سبق عكس هذا القيد.' }] }
    }
    if (isLocked(original.period)) {
      const label = periodLabel(original.period)
      return { ok: false, problems: [{ en: `${label.en} is closed.`, ar: `فترة ${label.ar} مقفلة.` }] }
    }
    const entry: JournalEntry = {
      ...makeEntry({
        date: original.date,
        source: 'reversal',
        sourceRef: original.sourceRef,
        memo: reason
          ? { en: `Reversal of ${original.no} — ${reason.en}`, ar: `عكس القيد ${original.no} — ${reason.ar}` }
          : { en: `Reversal of ${original.no}`, ar: `عكس القيد ${original.no}` },
        party: original.party,
        lines: reversalLines(original.lines),
        by: actingAccount,
      }, nextNo()),
      reversalOf: original.id,
    }
    setEntries((prev) => [entry, ...prev.map((e) => (e.id === original.id ? { ...e, status: 'reversed' as const, reversedBy: entry.id } : e))])
    return { ok: true, entry }
  }, [entries, isLocked, nextNo, actingAccount])

  const closePeriod = useCallback((period: string, closingDraft?: JournalDraft): PostResult | null => {
    let result: PostResult | null = null
    if (closingDraft) {
      result = post(closingDraft)
      if (!result.ok) return result
    }
    const closedAt = closingDraft?.date ?? `${period}-01`
    setPeriods((prev) => {
      const known = prev.some((p) => p.key === period)
      const closed: AccountingPeriod = {
        key: period,
        label: periodLabel(period),
        closed: true,
        closedAt,
        closedBy: actingAccount,
      }
      return known
        ? prev.map((p) => (p.key === period ? { ...p, closed: true, closedAt, closedBy: actingAccount } : p))
        : [...prev, closed].sort((a, b) => a.key.localeCompare(b.key))
    })
    return result
  }, [post, actingAccount])

  const reopenPeriod = useCallback((period: string) => {
    setPeriods((prev) => prev.map((p) => (p.key === period ? { ...p, closed: false, closedAt: undefined, closedBy: undefined } : p)))
  }, [])

  /* ── fixed assets ──────────────────────────────────────────────────────── */

  const addAsset = useCallback((a: Omit<FixedAsset, 'id'>) => {
    const id = `FA-${String(assetSeq).padStart(2, '0')}`
    setAssetSeq((n) => n + 1)
    setAssets((prev) => [...prev, { ...a, id }])
    return id
  }, [assetSeq])
  const removeAsset = useCallback((id: string) => setAssets((prev) => prev.filter((a) => a.id !== id)), [])
  // The opening book already charged one month, so the register stands that many months
  // further on than the assets' own opening position — and the next run continues from here.
  const depreciationRuns = useMemo(
    () => entries.filter((e) => e.source === 'depreciation' && e.status === 'posted').length,
    [entries],
  )

  /* ── readings ──────────────────────────────────────────────────────────── */

  const balanceOf = useCallback((code: string) => balanceOfEntries(accounts, entries, code), [accounts, entries])
  const rowsOf = useCallback((code: string) => ledgerRowsOf(accounts, entries, code), [accounts, entries])

  const tb = useMemo(() => trialBalance(accounts, entries), [accounts, entries])
  const pnl = useMemo(() => incomeStatement(accounts, entries), [accounts, entries])
  const bs = useMemo(() => balanceSheet(accounts, entries), [accounts, entries])
  const cf = useMemo(() => cashFlow(accounts, entries), [accounts, entries])
  const vat = useMemo(() => vatReturn(accounts, entries), [accounts, entries])

  const value = useMemo<LedgerCtx>(() => ({
    accounts, postableAccounts, accountOf, addAccount, updateAccount, toggleAccount,
    entries, post, postMany, reverse, entryOf, entryForRef, alreadyBooked,
    periods, isLocked, bookDate, closePeriod, reopenPeriod,
    assets, addAsset, removeAsset, depreciationRuns,
    balanceOf, ledgerRowsOf: rowsOf,
    trialBalance: tb, incomeStatement: pnl, balanceSheet: bs, cashFlow: cf, vatReturn: vat,
    actingAccount,
  }), [
    accounts, postableAccounts, accountOf, addAccount, updateAccount, toggleAccount,
    entries, post, postMany, reverse, entryOf, entryForRef, alreadyBooked,
    periods, isLocked, bookDate, closePeriod, reopenPeriod,
    assets, addAsset, removeAsset, depreciationRuns,
    balanceOf, rowsOf, tb, pnl, bs, cf, vat, actingAccount,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLedger() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLedger must be used within LedgerProvider')
  return ctx
}

/** Re-exported so panels can build an account without importing the data module directly. */
export type { Account, AccountType, NormalBalance }
/** Movement of one account across a set of entries — used by the chart's balance column. */
export { movementOf }
