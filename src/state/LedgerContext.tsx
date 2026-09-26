import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import { chartOfAccounts, type Account, type AccountType, type NormalBalance } from '@/data/coa'
import {
  entryProblems, makeEntry, nextVoucherSeq, periodOf, periodLabel, realLines,
  reversalLines, type AccountingPeriod, type JournalDraft, type JournalEntry,
} from '@/data/ledger'
import { openingBook, periodsSeed } from '@/data/ledgerSeed'
import { fixedAssetsSeed, type FixedAsset } from '@/data/fixedAssets'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useOptionalAuth } from '@/state/AuthContext'
import {
  fetchBooks, postEntry, markReversed, setPeriodClosed, upsertAccount,
  type WriteResult,
} from '@/lib/api/books'
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
//
// WHERE THE BOOK LIVES. With Supabase configured, the chart, the journal and the periods
// are the database's: accounts, journal_entries, journal_lines, accounting_periods, all
// behind RLS that only finance, the auditor, admin and the owner get past. Without it,
// the in-code opening book is the whole story, exactly as before — which is what keeps
// a fresh clone and the SSR harnesses working.
//
// POSTING IS OPTIMISTIC, AND HAS TO BE. post() returns the entry synchronously because
// fifteen call sites read its number the moment it is raised — an order that has just
// been invoiced shows "JV-0042" on the spot. So the entry is added locally first and
// written after. Three things keep that honest:
//
//   · The id is minted here, not by the database, so the entry the console is holding
//     and the row that lands share an id — otherwise reversing it later would name a
//     row that does not exist.
//   · The client checks the same rules the database enforces (problemsWith), so a
//     server refusal is the exception, not the routine case.
//   · When the server does refuse, the error is surfaced AND the book is reloaded, so
//     what the screen shows goes back to being what the database holds. The optimism
//     never outlives the round trip.
//
// STILL SEED-ONLY: the fixed-asset register. There is no table for it yet, so assets,
// addAsset and removeAsset work on local state in both modes. depreciationRuns is
// derived from the journal, so that half is real.

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

  /* where the book is */
  /** True when the chart, the journal and the periods come from the database. */
  booksAreServerOwned: boolean
  /** False while the first read is in flight; always true when there is no server. */
  booksReady: boolean
  /** The database's own words when it refused a write, or null. */
  booksError: string | null
}

const Ctx = createContext<LedgerCtx | null>(null)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { activeEmployee } = useTeam()
  // The session decides what the book reads: RLS shows finance/auditor/admin/owner the
  // whole book and everyone else nothing, so the read is redone when the user changes.
  const { ready: authReady, session } = useOptionalAuth()
  const booksAreServerOwned = isSupabaseConfigured

  const [accounts, setAccounts] = useState<Account[]>(
    () => (booksAreServerOwned ? [] : clone(chartOfAccounts)),
  )
  // The opening book is built once, by the same numbering the live postings use. With a
  // server it is only the fallback shape, never the displayed book.
  const seeded = useMemo(openingBook, [])
  const [entries, setEntries] = useState<JournalEntry[]>(
    () => (booksAreServerOwned ? [] : seeded.entries),
  )
  // The voucher counter is a ref, not state: one document often produces several entries in
  // a single handler — a sale and the cost-centre load it carries — and state would not have
  // advanced between them, so both would be numbered the same.
  const seq = useRef(booksAreServerOwned ? 1 : seeded.nextSeq)
  const nextNo = useCallback(() => {
    const n = seq.current
    seq.current = n + 1
    return n
  }, [])
  const [periods, setPeriods] = useState<AccountingPeriod[]>(
    () => (booksAreServerOwned ? [] : clone(periodsSeed)),
  )
  // No table for the register yet, so this half stays local in both modes.
  const [assets, setAssets] = useState<FixedAsset[]>(() => clone(fixedAssetsSeed))
  const [assetSeq, setAssetSeq] = useState(fixedAssetsSeed.length + 1)
  const [booksReady, setBooksReady] = useState(!booksAreServerOwned)
  const [booksError, setBooksError] = useState<string | null>(null)

  const actingAccount: Bilingual = activeEmployee
    ? { en: `${activeEmployee.name.en} — ${activeEmployee.title.en}`, ar: `${activeEmployee.name.ar} — ${activeEmployee.title.ar}` }
    : { en: 'Owner — admin console', ar: 'المالك — لوحة التحكم' }

  /* ── reading the book ──────────────────────────────────────────────────── */

  const reloadBooks = useCallback(async () => {
    if (!booksAreServerOwned) return
    const snap = await fetchBooks()
    setAccounts(snap.accounts)
    // fetchBooks returns them oldest first; the journal reads newest first.
    setEntries(snap.entries.slice().reverse())
    setPeriods(snap.periods)
    // Numbering resumes above whatever the book already holds — see nextVoucherSeq.
    seq.current = nextVoucherSeq(snap.entries)
    setBooksReady(true)
  }, [booksAreServerOwned])

  // Waits for the session to settle first: reading before then would run as the
  // anonymous user, get nothing back from RLS, and report an empty book as the truth.
  useEffect(() => {
    if (!authReady) return
    void reloadBooks()
  }, [authReady, session?.user.id, reloadBooks])

  /**
   * Sends one write, then re-reads. `revert` undoes the optimistic local change when
   * the server refuses — needed because the reload that follows is what restores the
   * truth, and a caller must not be left looking at an entry that was never accepted.
   */
  const commitBooks = useCallback(async (write: () => Promise<WriteResult>) => {
    const res = await write()
    if (!res.ok) setBooksError(res.error)
    else setBooksError(null)
    await reloadBooks()
  }, [reloadBooks])

  /* ── the chart ─────────────────────────────────────────────────────────── */

  const accountOf = useCallback((code: string) => accounts.find((a) => a.code === code), [accounts])
  const postableAccounts = useMemo(() => accounts.filter((a) => a.postable && a.active), [accounts])

  const addAccount = useCallback((a: Omit<Account, 'active'>) => {
    if (accounts.some((x) => x.code === a.code)) return
    const added: Account = { ...a, active: true }
    setAccounts((prev) => [...prev, added].sort((x, y) => x.code.localeCompare(y.code)))
    // sort_order follows the code, which is how the chart is read anyway.
    if (booksAreServerOwned) void commitBooks(() => upsertAccount(added, accounts.length))
  }, [accounts, booksAreServerOwned, commitBooks])

  const updateAccount = useCallback((code: string, patch: Partial<Omit<Account, 'code'>>) => {
    const cur = accounts.find((a) => a.code === code)
    if (!cur) return
    const next: Account = { ...cur, ...patch }
    setAccounts((prev) => prev.map((a) => (a.code === code ? next : a)))
    if (booksAreServerOwned) void commitBooks(() => upsertAccount(next))
  }, [accounts, booksAreServerOwned, commitBooks])

  const toggleAccount = useCallback((code: string) => {
    const cur = accounts.find((a) => a.code === code)
    if (!cur) return
    const next: Account = { ...cur, active: !cur.active }
    setAccounts((prev) => prev.map((a) => (a.code === code ? next : a)))
    if (booksAreServerOwned) void commitBooks(() => upsertAccount(next))
  }, [accounts, booksAreServerOwned, commitBooks])

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

  /**
   * Numbers a draft into an entry. Against a server the id is a uuid minted HERE rather
   * than the seed's JE-0001 shape, because journal_entries.id is a uuid and the console
   * hands that id straight back when it reverses the entry — so the two must be the
   * same value, not merely the same entry.
   */
  const numbered = useCallback((draft: JournalDraft): JournalEntry => {
    const entry = makeEntry({ ...draft, by: draft.by ?? actingAccount }, nextNo())
    return booksAreServerOwned ? { ...entry, id: crypto.randomUUID() } : entry
  }, [actingAccount, nextNo, booksAreServerOwned])

  /** The write behind one entry — used by post(), postMany() and reverse() alike. */
  const writeEntry = useCallback((e: JournalEntry) => postEntry({
    id: e.id,
    no: e.no,
    date: e.date,
    source: e.source,
    memo: e.memo,
    lines: e.lines,
    sourceRef: e.sourceRef,
    party: e.party,
    reversalOf: e.reversalOf,
    postedBy: e.by,
  }), [])

  const post = useCallback((draft: JournalDraft): PostResult => {
    const problems = problemsWith(draft)
    if (problems.length > 0) return { ok: false, problems }
    const entry = numbered(draft)
    setEntries((prev) => [entry, ...prev])
    registerPeriod(entry.period)
    if (booksAreServerOwned) void commitBooks(() => writeEntry(entry))
    return { ok: true, entry }
  }, [problemsWith, numbered, registerPeriod, booksAreServerOwned, commitBooks, writeEntry])

  /**
   * Post a run of drafts as one commit, so a document that makes several entries makes
   * them together. Each entry is still its own transaction on the server — the database
   * has no notion of "these three belong to one document" — so they are written in
   * sequence and the first refusal is what the console is told about. That is weaker
   * than the local behaviour, and deliberately not hidden: a partially posted run is
   * visible in the journal, where a reversal can correct it.
   */
  const postMany = useCallback((drafts: JournalDraft[]): PostResult[] => {
    const results: PostResult[] = []
    const made: JournalEntry[] = []
    for (const d of drafts) {
      const problems = problemsWith(d)
      if (problems.length > 0) {
        results.push({ ok: false, problems })
        continue
      }
      const entry = numbered(d)
      made.push(entry)
      results.push({ ok: true, entry })
    }
    if (made.length > 0) {
      setEntries((prev) => [...made.slice().reverse(), ...prev])
      for (const e of made) registerPeriod(e.period)
      if (booksAreServerOwned) {
        void commitBooks(async () => {
          for (const e of made) {
            const res = await writeEntry(e)
            if (!res.ok) return res
          }
          return { ok: true, error: null }
        })
      }
    }
    return results
  }, [problemsWith, numbered, registerPeriod, booksAreServerOwned, commitBooks, writeEntry])

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
      ...numbered({
        date: original.date,
        source: 'reversal',
        sourceRef: original.sourceRef,
        memo: reason
          ? { en: `Reversal of ${original.no} — ${reason.en}`, ar: `عكس القيد ${original.no} — ${reason.ar}` }
          : { en: `Reversal of ${original.no}`, ar: `عكس القيد ${original.no}` },
        party: original.party,
        lines: reversalLines(original.lines),
        by: actingAccount,
      }),
      reversalOf: original.id,
    }
    setEntries((prev) => [entry, ...prev.map((e) => (e.id === original.id ? { ...e, status: 'reversed' as const, reversedBy: entry.id } : e))])
    // Two writes, in this order. The reversing entry has to exist before the original
    // can point at it: reversed_by is a foreign key, and the append-only trigger lets
    // that one field be set exactly once.
    if (booksAreServerOwned) {
      void commitBooks(async () => {
        const posted = await writeEntry(entry)
        if (!posted.ok) return posted
        return markReversed(original.id, entry.id)
      })
    }
    return { ok: true, entry }
  }, [entries, isLocked, numbered, actingAccount, booksAreServerOwned, commitBooks, writeEntry])

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
    // After the closing entry, never before it: closing first would have the period lock
    // refuse the very entry that closes the period.
    if (booksAreServerOwned) void commitBooks(() => setPeriodClosed(period, true, actingAccount, closedAt))
    return result
  }, [post, actingAccount, booksAreServerOwned, commitBooks])

  const reopenPeriod = useCallback((period: string) => {
    setPeriods((prev) => prev.map((p) => (p.key === period ? { ...p, closed: false, closedAt: undefined, closedBy: undefined } : p)))
    if (booksAreServerOwned) void commitBooks(() => setPeriodClosed(period, false))
  }, [booksAreServerOwned, commitBooks])

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
    booksAreServerOwned, booksReady, booksError,
  }), [
    accounts, postableAccounts, accountOf, addAccount, updateAccount, toggleAccount,
    entries, post, postMany, reverse, entryOf, entryForRef, alreadyBooked,
    periods, isLocked, bookDate, closePeriod, reopenPeriod,
    assets, addAsset, removeAsset, depreciationRuns,
    balanceOf, rowsOf, tb, pnl, bs, cf, vat, actingAccount,
    booksAreServerOwned, booksReady, booksError,
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
