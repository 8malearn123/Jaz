import type { Bilingual } from './types'

// ── The general ledger (دفتر الأستاذ العام) — isolated.
//
// One book, double entry, no exceptions. Every document raised anywhere in the console
// — a sale, a purchase, a receipt, a payment, a write-off, a production batch, a cost
// centre load, a depreciation charge — arrives here as a JournalEntry whose debits
// equal its credits to the halala. Nothing else is a valid posting.
//
// Two rules make the book trustworthy, and both are enforced in state/LedgerContext:
//   1. A posted entry is never edited and never deleted. A mistake is corrected by a
//      reversing entry that carries its own date, so the trail shows what happened.
//   2. Once a period is closed, it accepts nothing further.

/** What raised the entry. Manual entries are the accountant's own; the rest are automatic. */
export type JournalSource =
  | 'opening'
  | 'sale'
  | 'purchase'
  | 'receipt'
  | 'payment'
  | 'waste'
  | 'production'
  | 'cost_center'
  | 'depreciation'
  | 'vat'
  | 'closing'
  | 'manual'
  | 'reversal'

export const journalSourceMeta: Record<JournalSource, { label: Bilingual; color: string; bg: string }> = {
  opening: { label: { en: 'Opening balance', ar: 'رصيد افتتاحي' }, color: '#3b241a', bg: '#efe7df' },
  sale: { label: { en: 'Sale', ar: 'بيع' }, color: '#355c4b', bg: '#e8f0ec' },
  purchase: { label: { en: 'Purchase', ar: 'شراء' }, color: '#365766', bg: '#e7eef1' },
  receipt: { label: { en: 'Receipt', ar: 'تحصيل' }, color: '#2f7d5b', bg: '#e6f2ea' },
  payment: { label: { en: 'Payment', ar: 'سداد' }, color: '#a4533f', bg: '#f7e9e4' },
  waste: { label: { en: 'Waste', ar: 'هدر' }, color: '#b5403b', bg: '#faeceb' },
  production: { label: { en: 'Production', ar: 'إنتاج' }, color: '#8a6b3f', bg: '#f6edde' },
  cost_center: { label: { en: 'Cost centre', ar: 'مركز تكلفة' }, color: '#b08a57', bg: '#f7efe2' },
  depreciation: { label: { en: 'Depreciation', ar: 'إهلاك' }, color: '#5a4a86', bg: '#eeeaf6' },
  vat: { label: { en: 'VAT', ar: 'ضريبة' }, color: '#2e5f8a', bg: '#e7f0f8' },
  closing: { label: { en: 'Closing', ar: 'إقفال' }, color: '#3b241a', bg: '#efe7df' },
  manual: { label: { en: 'Manual entry', ar: 'قيد يدوي' }, color: '#8a6b3f', bg: '#f6edde' },
  reversal: { label: { en: 'Reversal', ar: 'قيد عكسي' }, color: '#b5403b', bg: '#faeceb' },
}

/** One side of one account in one entry. A line carries a debit or a credit, never both. */
export interface JournalLine {
  accountCode: string
  debitMinor: number
  creditMinor: number
  /** Analytical dimension — which cost centre this line belongs to, if any. */
  centerId?: string
  memo?: Bilingual
}

export interface JournalEntry {
  id: string
  /** Human reference — JV-0001. */
  no: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** Accounting period, YYYY-MM — derived from the date and used for locking. */
  period: string
  source: JournalSource
  /** The document this entry accounts for — an order no, a purchase invoice id, an asset id. */
  sourceRef?: string
  memo: Bilingual
  party?: Bilingual
  lines: JournalLine[]
  status: 'posted' | 'reversed'
  /** Set on a reversing entry — the entry it undoes. */
  reversalOf?: string
  /** Set on the entry that was undone — the reversal that undid it. */
  reversedBy?: string
  by?: Bilingual
}

/** What a caller hands over to post. The book assigns the id, the number and the period. */
export interface JournalDraft {
  date: string
  source: JournalSource
  sourceRef?: string
  memo: Bilingual
  party?: Bilingual
  lines: JournalLine[]
  by?: Bilingual
}

/** A period as the book knows it. */
export interface AccountingPeriod {
  /** YYYY-MM. */
  key: string
  label: Bilingual
  closed: boolean
  closedAt?: string
  closedBy?: Bilingual
}

/* ── the invariants ───────────────────────────────────────────────────────── */

export const linesDebit = (lines: JournalLine[]): number => lines.reduce((a, l) => a + l.debitMinor, 0)
export const linesCredit = (lines: JournalLine[]): number => lines.reduce((a, l) => a + l.creditMinor, 0)

/** Why a draft cannot be posted — empty when it can. */
export function entryProblems(lines: JournalLine[]): Bilingual[] {
  const problems: Bilingual[] = []
  const real = lines.filter((l) => l.debitMinor > 0 || l.creditMinor > 0)
  if (real.length < 2) problems.push({ en: 'An entry needs at least two lines.', ar: 'القيد يحتاج سطرين على الأقل.' })
  if (real.some((l) => l.accountCode === '')) problems.push({ en: 'Every line needs an account.', ar: 'كل سطر يحتاج حسابًا.' })
  if (real.some((l) => l.debitMinor > 0 && l.creditMinor > 0)) {
    problems.push({ en: 'A line carries a debit or a credit, never both.', ar: 'السطر يحمل مدينًا أو دائنًا، لا الاثنين.' })
  }
  const d = linesDebit(real)
  const c = linesCredit(real)
  if (d !== c) problems.push({ en: 'Debits and credits must be equal.', ar: 'يجب أن يتساوى المدين مع الدائن.' })
  return problems
}

export const isBalanced = (lines: JournalLine[]): boolean => entryProblems(lines).length === 0

/** The accounting period an ISO date falls in. */
export const periodOf = (isoDate: string): string => isoDate.slice(0, 7)

/** Readable month label for a YYYY-MM period key. */
export function periodLabel(key: string): Bilingual {
  const [y, m] = key.split('-')
  const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const ar = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const i = Math.max(0, Math.min(11, parseInt(m, 10) - 1))
  return { en: `${en[i]} ${y}`, ar: `${ar[i]} ${y}` }
}

/** Build the reversing image of an entry — every debit becomes a credit and back. */
export function reversalLines(lines: JournalLine[]): JournalLine[] {
  return lines.map((l) => ({ ...l, debitMinor: l.creditMinor, creditMinor: l.debitMinor }))
}

/** Convenience builders, so posting rules read like the entry they make. */
export const debit = (accountCode: string, amountMinor: number, extra: Partial<JournalLine> = {}): JournalLine =>
  ({ accountCode, debitMinor: amountMinor, creditMinor: 0, ...extra })
export const credit = (accountCode: string, amountMinor: number, extra: Partial<JournalLine> = {}): JournalLine =>
  ({ accountCode, debitMinor: 0, creditMinor: amountMinor, ...extra })

/** Drop the empty lines a form leaves behind. */
export const realLines = (lines: JournalLine[]): JournalLine[] =>
  lines.filter((l) => l.debitMinor > 0 || l.creditMinor > 0)

/**
 * Turn a draft into a numbered entry. The book uses this for live postings and the opening
 * seed uses it too, so the seeded entries and anything posted afterwards are numbered and
 * shaped identically — and the verification script can rebuild the same book to check it.
 */
export function makeEntry(draft: JournalDraft, seq: number): JournalEntry {
  return {
    id: `JE-${String(seq).padStart(4, '0')}`,
    no: `JV-${String(seq).padStart(4, '0')}`,
    date: draft.date,
    period: periodOf(draft.date),
    source: draft.source,
    sourceRef: draft.sourceRef,
    memo: draft.memo,
    party: draft.party,
    lines: realLines(draft.lines),
    status: 'posted',
    by: draft.by,
  }
}

/**
 * Number a run of drafts, skipping any that would not balance. A rule that produced a
 * lopsided entry is dropped here rather than allowed to corrupt the book — and the
 * verification script asserts that nothing was in fact dropped.
 */
export function numberDrafts(drafts: JournalDraft[], startSeq = 1): { entries: JournalEntry[]; nextSeq: number } {
  const entries: JournalEntry[] = []
  let seq = startSeq
  for (const d of drafts) {
    if (entryProblems(d.lines).length > 0) continue
    entries.push(makeEntry(d, seq))
    seq += 1
  }
  return { entries, nextSeq: seq }
}
