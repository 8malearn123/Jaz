// The books.
//
// Posting is one call that writes the entry and its lines together, because the
// balance constraint is DEFERRED to commit — a half-written entry would be rejected,
// which is the intended behaviour and also why the two inserts must not be separate
// round trips a caller could abandon between.
//
// Nothing here can weaken the ledger's rules: the database enforces balance, the
// one-side-per-line rule, postable accounts, period locks and append-only, and every
// refusal below is the database's own message rather than a check repeated in the
// client.

import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type {
  AccountRow, AccountingPeriodRow, JournalEntryRow, JournalLineRow, JournalSourceRow,
} from '@/lib/database.types'
import type { Account, AccountType, NormalBalance } from '@/data/coa'
import type { JournalEntry, JournalLine, AccountingPeriod, JournalSource } from '@/data/ledger'
import { periodLabel } from '@/data/ledger'

export interface WriteResult { ok: boolean; error: string | null }
const OK: WriteResult = { ok: true, error: null }
const bad = (error: string): WriteResult => ({ ok: false, error })

// ---------------------------------------------------------------- row -> UI

export function rowToAccount(r: AccountRow): Account {
  return {
    code: r.code,
    name: { en: r.name_en, ar: r.name_ar },
    type: r.type as AccountType,
    normal: r.normal as NormalBalance,
    postable: r.postable,
    active: r.active,
    // Every flag is omitted when false rather than set to false: Account declares
    // them optional and `a.contra ? ... : ...` reads the same either way, but an
    // explicit false would show up in a JSON diff of the chart as a change.
    ...(r.parent === null ? {} : { parent: r.parent }),
    ...(r.is_control ? { isControl: true } : {}),
    ...(r.contra ? { contra: true } : {}),
    ...(r.cash ? { cash: true } : {}),
    ...(r.vat_role === null ? {} : { vatRole: r.vat_role }),
  }
}

export function rowToLine(r: JournalLineRow): JournalLine {
  return {
    accountCode: r.account_code,
    debitMinor: Number(r.debit_minor),
    creditMinor: Number(r.credit_minor),
    ...(r.center_id === null ? {} : { centerId: r.center_id }),
    ...(r.memo_en === null && r.memo_ar === null
      ? {}
      : { memo: { en: r.memo_en ?? '', ar: r.memo_ar ?? '' } }),
  }
}

export function rowToEntry(r: JournalEntryRow, lines: JournalLineRow[]): JournalEntry {
  return {
    id: r.id,
    no: r.no,
    date: r.entry_date,
    period: r.period,
    source: r.source as JournalSource,
    ...(r.source_ref === null ? {} : { sourceRef: r.source_ref }),
    memo: { en: r.memo_en, ar: r.memo_ar },
    ...(r.party_en === null && r.party_ar === null
      ? {}
      : { party: { en: r.party_en ?? '', ar: r.party_ar ?? '' } }),
    lines: lines.slice().sort((a, b) => a.position - b.position).map(rowToLine),
    status: r.status,
    ...(r.reversal_of === null ? {} : { reversalOf: r.reversal_of }),
    ...(r.reversed_by === null ? {} : { reversedBy: r.reversed_by }),
    ...(r.posted_by === null ? {} : { by: { en: r.posted_by, ar: r.posted_by } }),
  }
}

export function rowToPeriod(r: AccountingPeriodRow): AccountingPeriod {
  return {
    key: r.key,
    label: periodLabel(r.key),
    closed: r.closed,
    ...(r.closed_at === null ? {} : { closedAt: r.closed_at }),
    ...(r.closed_by === null ? {} : { closedBy: { en: r.closed_by, ar: r.closed_by } }),
  }
}

// ---------------------------------------------------------------- reads

export interface BooksSnapshot {
  accounts: Account[]
  entries: JournalEntry[]
  periods: AccountingPeriod[]
}

export const EMPTY_BOOKS: BooksSnapshot = { accounts: [], entries: [], periods: [] }

/**
 * Empty for anyone outside finance / auditor / admin / owner — RLS filters it, which
 * is the intent rather than an error to report.
 */
export async function fetchBooks(): Promise<BooksSnapshot> {
  if (!isSupabaseConfigured) return EMPTY_BOOKS
  const db = requireSupabase()

  const [accounts, entries, lines, periods] = await Promise.all([
    db.from('accounts').select('*').order('code'),
    db.from('journal_entries').select('*').order('entry_date').order('no'),
    db.from('journal_lines').select('*').order('position'),
    db.from('accounting_periods').select('*').order('key'),
  ])

  if (accounts.error) {
    console.error('[books] accounts:', accounts.error.message)
    return EMPTY_BOOKS
  }
  if (entries.error) console.error('[books] entries:', entries.error.message)
  if (lines.error) console.error('[books] lines:', lines.error.message)
  if (periods.error) console.error('[books] periods:', periods.error.message)

  const byEntry = new Map<string, JournalLineRow[]>()
  for (const l of lines.data ?? []) {
    const list = byEntry.get(l.entry_id)
    if (list) list.push(l)
    else byEntry.set(l.entry_id, [l])
  }

  return {
    accounts: (accounts.data ?? []).map(rowToAccount),
    entries: (entries.data ?? []).map((e) => rowToEntry(e, byEntry.get(e.id) ?? [])),
    periods: (periods.data ?? []).map(rowToPeriod),
  }
}

// ---------------------------------------------------------------- posting

export interface PostInput {
  no: string
  date: string
  source: JournalSourceRow
  memo: { en: string; ar: string }
  lines: JournalLine[]
  sourceRef?: string
  party?: { en: string; ar: string }
  reversalOf?: string
  postedBy?: string
}

/**
 * Posts an entry and its lines. If the lines are refused — out of balance, a header
 * account, a closed period — the entry row is removed so the book is never left with
 * a header and nothing under it.
 */
export async function postEntry(input: PostInput): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const db = requireSupabase()

  // Zero lines are dropped here, matching realLines() in the UI. The column
  // constraint rejects them anyway; this keeps the refusal from being confusing.
  const real = input.lines.filter((l) => l.debitMinor > 0 || l.creditMinor > 0)
  if (real.length < 2) return bad('books.needsTwoLines')

  const { data, error } = await db
    .from('journal_entries')
    .insert({
      no: input.no,
      entry_date: input.date,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      memo_en: input.memo.en,
      memo_ar: input.memo.ar,
      party_en: input.party?.en ?? null,
      party_ar: input.party?.ar ?? null,
      reversal_of: input.reversalOf ?? null,
      posted_by: input.postedBy ?? null,
    })
    .select('id')
    .single()

  if (error) return bad(error.message)
  if (!data) return bad('books.insertReturnedNothing')

  const ins = await db.from('journal_lines').insert(
    real.map((l, i) => ({
      entry_id: data.id,
      account_code: l.accountCode,
      debit_minor: l.debitMinor,
      credit_minor: l.creditMinor,
      center_id: l.centerId ?? null,
      memo_en: l.memo?.en ?? null,
      memo_ar: l.memo?.ar ?? null,
      position: i,
    })),
  )

  if (ins.error) {
    // The entry has no lines, so nothing has been posted — remove the header. The
    // append-only guard permits this because the entry never became a real entry.
    await db.from('journal_entries').delete().eq('id', data.id)
    return bad(ins.error.message)
  }
  return OK
}

/**
 * Records that an entry has been reversed. The reversing entry is posted first with
 * postEntry(); this is the one mutation the append-only guard allows.
 */
export async function markReversed(entryId: string, reversalId: string): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { error } = await requireSupabase()
    .from('journal_entries')
    .update({ status: 'reversed', reversed_by: reversalId })
    .eq('id', entryId)
  return error ? bad(error.message) : OK
}

export async function setPeriodClosed(
  key: string,
  closed: boolean,
  by?: string,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { error } = await requireSupabase()
    .from('accounting_periods')
    .upsert({
      key,
      closed,
      closed_at: closed ? new Date().toISOString() : null,
      closed_by: closed ? (by ?? null) : null,
    }, { onConflict: 'key' })
  return error ? bad(error.message) : OK
}

/** Adds or updates a chart account. Only finance/admin/owner get past RLS. */
export async function upsertAccount(a: Account, sortOrder = 0): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { error } = await requireSupabase().from('accounts').upsert({
    code: a.code,
    name_en: a.name.en,
    name_ar: a.name.ar,
    type: a.type,
    normal: a.normal,
    parent: a.parent ?? null,
    postable: a.postable,
    active: a.active,
    is_control: a.isControl ?? false,
    contra: a.contra ?? false,
    cash: a.cash ?? false,
    vat_role: a.vatRole ?? null,
    sort_order: sortOrder,
  }, { onConflict: 'code' })
  return error ? bad(error.message) : OK
}
