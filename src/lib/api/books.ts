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
  AccountRow, AccountingPeriodRow, FixedAssetRow, JournalEntryRow, JournalLineRow,
  JournalSourceRow,
} from '@/lib/database.types'
import type { Account, AccountType, NormalBalance } from '@/data/coa'
import type { JournalEntry, JournalLine, AccountingPeriod, JournalSource } from '@/data/ledger'
import type { FixedAsset, AssetCategory } from '@/data/fixedAssets'
import { periodLabel } from '@/data/ledger'

export interface WriteResult { ok: boolean; error: string | null }
const OK: WriteResult = { ok: true, error: null }
const bad = (error: string): WriteResult => ({ ok: false, error })

/**
 * What RLS looks like on an UPDATE, and why every update here asks for its rows back.
 *
 * A write RLS forbids does not always fail. An INSERT blocked by WITH CHECK raises — an
 * auditor calling post_journal_entry() gets "new row violates row-level security policy"
 * and the client knows. But an UPDATE blocked by USING simply matches no rows: no error,
 * no change, and PostgREST reports success. An auditor closing a period was verified to
 * do exactly that against this database — the period stayed open and the client was told
 * the write had gone through.
 *
 * So each update returns the rows it touched and none of them means refused. The reload
 * that follows would put the screen right either way; this is what makes the person see
 * WHY it sprang back.
 */
const NOT_ALLOWED =
  'The books refused that write. Only finance, admin or the owner may keep the books.'
const tookEffect = (rows: unknown[] | null): WriteResult =>
  (rows && rows.length > 0 ? OK : bad(NOT_ALLOWED))

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
    ...(r.posted_by_en === null && r.posted_by_ar === null
      ? {}
      : { by: { en: r.posted_by_en ?? '', ar: r.posted_by_ar ?? '' } }),
  }
}

export function rowToPeriod(r: AccountingPeriodRow): AccountingPeriod {
  return {
    key: r.key,
    label: periodLabel(r.key),
    closed: r.closed,
    ...(r.closed_at === null ? {} : { closedAt: r.closed_at }),
    ...(r.closed_by_en === null && r.closed_by_ar === null
      ? {}
      : { closedBy: { en: r.closed_by_en ?? '', ar: r.closed_by_ar ?? '' } }),
  }
}

/**
 * The register. Depreciation is NOT read from here — there is nothing to read, because
 * the monthly charge, the accumulated total and the net book value are all derived from
 * cost and life by src/data/fixedAssets.ts. A derived figure stored twice is a figure
 * that can disagree with itself.
 */
export function rowToAsset(r: FixedAssetRow): FixedAsset {
  return {
    id: r.id,
    name: { en: r.name_en, ar: r.name_ar },
    category: r.category as AssetCategory,
    costMinor: Number(r.cost_minor),
    lifeMonths: r.life_months,
    inService: { en: r.in_service_en, ar: r.in_service_ar },
    openingMonths: r.opening_months,
    ...(r.center_id === null ? {} : { centerId: r.center_id }),
  }
}

// ---------------------------------------------------------------- reads

export interface BooksSnapshot {
  accounts: Account[]
  entries: JournalEntry[]
  periods: AccountingPeriod[]
  assets: FixedAsset[]
}

export const EMPTY_BOOKS: BooksSnapshot = { accounts: [], entries: [], periods: [], assets: [] }

/**
 * Empty for anyone outside finance / auditor / admin / owner — RLS filters it, which
 * is the intent rather than an error to report.
 */
export async function fetchBooks(): Promise<BooksSnapshot> {
  if (!isSupabaseConfigured) return EMPTY_BOOKS
  const db = requireSupabase()

  const [accounts, entries, lines, periods, assets] = await Promise.all([
    db.from('accounts').select('*').order('code'),
    db.from('journal_entries').select('*').order('entry_date').order('no'),
    db.from('journal_lines').select('*').order('position'),
    db.from('accounting_periods').select('*').order('key'),
    db.from('fixed_assets').select('*').order('id'),
  ])

  if (accounts.error) {
    console.error('[books] accounts:', accounts.error.message)
    return EMPTY_BOOKS
  }
  if (entries.error) console.error('[books] entries:', entries.error.message)
  if (lines.error) console.error('[books] lines:', lines.error.message)
  if (periods.error) console.error('[books] periods:', periods.error.message)
  if (assets.error) console.error('[books] assets:', assets.error.message)

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
    assets: (assets.data ?? []).map(rowToAsset),
  }
}

// ---------------------------------------------------------------- posting

export interface PostInput {
  /**
   * Minted by the caller, not the database. The provider shows the entry the moment it
   * is posted and only then writes it, so the id it hands the console must be the id
   * the row ends up carrying — otherwise reversing that entry later would name a row
   * that does not exist.
   */
  id: string
  no: string
  date: string
  source: JournalSourceRow
  memo: { en: string; ar: string }
  lines: JournalLine[]
  sourceRef?: string
  party?: { en: string; ar: string }
  reversalOf?: string
  postedBy?: { en: string; ar: string }
}

/**
 * Posts an entry and its lines in one call, which is one transaction: a refusal — out
 * of balance, a header account, a closed period, fewer than two lines — leaves nothing
 * behind at all.
 *
 * It used to be two inserts with a delete to clean up after a refused second one, and
 * that delete could never work: the append-only trigger raises on every DELETE, so a
 * single refused posting left a zero-line entry in the journal that nothing short of
 * disabling a trigger could remove. post_journal_entry() is SECURITY INVOKER, so RLS
 * and every trigger still apply exactly as they would to a direct insert.
 */
export async function postEntry(input: PostInput): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')

  // Zero lines are dropped here, matching realLines() in the UI. The function refuses
  // them anyway; this keeps the refusal from being confusing.
  const real = input.lines.filter((l) => l.debitMinor > 0 || l.creditMinor > 0)
  if (real.length < 2) return bad('books.needsTwoLines')

  const { error } = await requireSupabase().rpc('post_journal_entry', {
    p_id: input.id,
    p_no: input.no,
    p_date: input.date,
    p_source: input.source,
    p_memo_en: input.memo.en,
    p_memo_ar: input.memo.ar,
    p_lines: real.map((l) => ({
      account_code: l.accountCode,
      debit_minor: l.debitMinor,
      credit_minor: l.creditMinor,
      center_id: l.centerId ?? null,
      memo_en: l.memo?.en ?? null,
      memo_ar: l.memo?.ar ?? null,
    })),
    p_source_ref: input.sourceRef ?? null,
    p_party_en: input.party?.en ?? null,
    p_party_ar: input.party?.ar ?? null,
    p_reversal_of: input.reversalOf ?? null,
    p_posted_by_en: input.postedBy?.en ?? null,
    p_posted_by_ar: input.postedBy?.ar ?? null,
  })

  return error ? bad(error.message) : OK
}

/**
 * Records that an entry has been reversed. The reversing entry is posted first with
 * postEntry(); this is the one mutation the append-only guard allows.
 */
export async function markReversed(entryId: string, reversalId: string): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { data, error } = await requireSupabase()
    .from('journal_entries')
    .update({ status: 'reversed', reversed_by: reversalId })
    .eq('id', entryId)
    .select('id')
  return error ? bad(error.message) : tookEffect(data)
}

export async function setPeriodClosed(
  key: string,
  closed: boolean,
  by?: { en: string; ar: string },
  closedAt?: string,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { data, error } = await requireSupabase()
    .from('accounting_periods')
    .upsert({
      key,
      closed,
      // Reopening clears the record of the close rather than leaving a stale one:
      // a period that is open was not closed by anybody.
      closed_at: closed ? (closedAt ?? new Date().toISOString()) : null,
      closed_by_en: closed ? (by?.en ?? null) : null,
      closed_by_ar: closed ? (by?.ar ?? null) : null,
    }, { onConflict: 'key' })
    .select('key')
  return error ? bad(error.message) : tookEffect(data)
}

/** Puts an asset into the register. Only finance/admin/owner get past RLS. */
export async function upsertAsset(a: FixedAsset): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { data, error } = await requireSupabase().from('fixed_assets').upsert({
    id: a.id,
    name_en: a.name.en,
    name_ar: a.name.ar,
    category: a.category,
    cost_minor: a.costMinor,
    life_months: a.lifeMonths,
    in_service_en: a.inService.en,
    in_service_ar: a.inService.ar,
    opening_months: a.openingMonths,
    center_id: a.centerId ?? null,
  }, { onConflict: 'id' })
    .select('id')
  return error ? bad(error.message) : tookEffect(data)
}

/**
 * Removes an asset from the register. The database refuses this once the journal accounts
 * for the asset — an entry filed under its id, or an opening balance that capitalised it —
 * because then deleting the row would leave the books carrying a cost the register does
 * not list. The refusal is the database's own message, and it says which of the two it is.
 */
export async function deleteAsset(id: string): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { data, error } = await requireSupabase()
    .from('fixed_assets').delete().eq('id', id).select('id')
  return error ? bad(error.message) : tookEffect(data)
}

/** Adds or updates a chart account. Only finance/admin/owner get past RLS. */
export async function upsertAccount(a: Account, sortOrder = 0): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('books.notConfigured')
  const { data, error } = await requireSupabase().from('accounts').upsert({
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
    .select('code')
  return error ? bad(error.message) : tookEffect(data)
}
