import { Fragment, useMemo, useState } from 'react'
import { Plus, Trash2, Undo2, ChevronDown, ChevronRight, Search, AlertTriangle } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  entryProblems, journalSourceMeta, linesCredit, linesDebit, periodLabel,
  type JournalEntry, type JournalLine, type JournalSource,
} from '@/data/ledger'
import { useLedger } from '@/state/LedgerContext'
import { useCostCenters } from '@/state/CostCenterContext'
import { StatCard, Pill } from '../_shared'
import { Amount, EmptyRow, Head } from './_bits'

/** Amounts are typed in riyals and held in halalas, tolerating Arabic digits like every owner form. */
const parseMinor = (s: string) => {
  const [whole, frac = ''] = toAsciiDigits(s).replace(/[^\d.]/g, '').split('.')
  return Math.max(0, (parseInt(whole || '0', 10) || 0) * 100 + (parseInt((frac + '00').slice(0, 2), 10) || 0))
}

/**
 * The journal — every entry in the book, newest first, and the one place an entry can be
 * made by hand. Nothing here edits or deletes: a posted entry is corrected by reversing it,
 * which posts its mirror image and leaves both in the record.
 */
export function JournalPanel() {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { entries, periods, reverse } = useLedger()
  const [source, setSource] = useState<'all' | JournalSource>('all')
  const [period, setPeriod] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [confirmReverse, setConfirmReverse] = useState<JournalEntry | null>(null)

  const query = toAsciiDigits(q.trim().toLowerCase())
  const shown = entries.filter((e) => {
    if (source !== 'all' && e.source !== source) return false
    if (period !== 'all' && e.period !== period) return false
    if (query === '') return true
    return [e.no, e.sourceRef ?? '', e.memo.en, e.party?.en ?? ''].some((s) => s.toLowerCase().includes(query))
      || [e.memo.ar, e.party?.ar ?? ''].some((s) => s.includes(q.trim()))
  })

  const totalPosted = shown.reduce((s, e) => s + linesDebit(e.lines), 0)
  const reversed = entries.filter((e) => e.status === 'reversed').length
  const manual = entries.filter((e) => e.source === 'manual').length

  // Sources that actually occur in the book — no point offering a filter that finds nothing.
  const sources = useMemo(() => {
    const seen = new Set(entries.map((e) => e.source))
    return (Object.keys(journalSourceMeta) as JournalSource[]).filter((s) => seen.has(s))
  }, [entries])

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Journal', ar: 'دفتر اليومية' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Every entry in the book, in the order it was posted. Sales, purchases, receipts, payments and write-offs arrive here on their own; anything else is entered by hand.',
            ar: 'كل قيد في الدفتر بترتيب ترحيله. المبيعات والمشتريات والتحصيل والسداد والهدر تصل تلقائيًا، وما عداها يُدخَل يدويًا.',
          })}</p>
        </div>
        <button onClick={() => setManualOpen(true)} className={buttonClass('primary', 'sm')}>
          <Plus size={15} /> {pick({ en: 'Manual entry', ar: 'قيد يدوي' })}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Entries', ar: 'القيود' })} value={String(entries.length)} sub={pick({ en: 'In the book', ar: 'في الدفتر' })} tone="dark" />
        <StatCard label={pick({ en: 'Manual entries', ar: 'قيود يدوية' })} value={String(manual)} sub={pick({ en: 'Made by hand', ar: 'أُدخلت يدويًا' })} />
        <StatCard label={pick({ en: 'Reversed', ar: 'قيود معكوسة' })} value={String(reversed)} sub={pick({ en: 'Corrected, never erased', ar: 'صُحّحت ولم تُمحَ' })} tone={reversed > 0 ? 'gold' : 'plain'} />
        <StatCard label={pick({ en: 'Shown', ar: 'المعروض' })} value={String(shown.length)} sub={pick({ en: 'Matching the filters', ar: 'مطابق للتصفية' })} tone="green" />
      </div>

      <div className="flex flex-wrap items-center gap-sm">
        <select value={source} onChange={(e) => setSource(e.target.value as 'all' | JournalSource)} className="input cursor-pointer w-auto py-1.5">
          <option value="all">{pick({ en: 'All sources', ar: 'كل المصادر' })}</option>
          {sources.map((s) => <option key={s} value={s}>{pick(journalSourceMeta[s].label)}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input cursor-pointer w-auto py-1.5">
          <option value="all">{pick({ en: 'All periods', ar: 'كل الفترات' })}</option>
          {periods.map((p) => <option key={p.key} value={p.key}>{pick(p.label)}{p.closed ? ` · ${pick({ en: 'closed', ar: 'مقفلة' })}` : ''}</option>)}
        </select>
        <label className="relative">
          <Search size={15} className="absolute inset-inline-start-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input ps-9 w-56" placeholder={pick({ en: 'Voucher, document, party…', ar: 'رقم القيد أو المستند أو الطرف…' })} />
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <Head cols={[
              { label: { en: 'Voucher', ar: 'القيد' } },
              { label: { en: 'Source', ar: 'المصدر' } },
              { label: { en: 'Description', ar: 'البيان' } },
              { label: { en: 'Document', ar: 'المستند' } },
              { label: { en: 'Amount', ar: 'المبلغ' }, num: true },
              { label: { en: '', ar: '' }, num: true },
            ]} />
            <tbody>
              {shown.length === 0 && (
                <EmptyRow span={6}>
                  {pick({ en: 'No entry matches these filters.', ar: 'لا يوجد قيد مطابق لهذه التصفية.' })}
                </EmptyRow>
              )}
              {shown.map((e) => {
                const meta = journalSourceMeta[e.source]
                const expanded = open === e.id
                return (
                  <Fragment key={e.id}>
                    <tr
                      className={cn('border-b border-hairline hover:bg-surface-2/30 transition-colors cursor-pointer align-top', expanded && 'bg-surface-2/40')}
                      onClick={() => setOpen(expanded ? null : e.id)}
                    >
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-xs">
                          {expanded ? <ChevronDown size={14} className="text-ink-subtle" /> : <ChevronRight size={14} className="text-ink-subtle rtl:-scale-x-100" />}
                          <span className="font-sans text-data text-ink tabular-nums">{e.no}</span>
                        </div>
                        <p className="font-sans text-caption text-ink-subtle ms-5">{e.date}</p>
                      </td>
                      <td className="px-lg py-md">
                        <Pill color={meta.color} bg={meta.bg}>{pick(meta.label)}</Pill>
                        {e.status === 'reversed' && (
                          <span className="block mt-xxs"><Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Reversed', ar: 'معكوس' })}</Pill></span>
                        )}
                      </td>
                      <td className="px-lg py-md">
                        <span className="font-sans text-data text-ink">{pick(e.memo)}</span>
                        {e.party && <span className="block font-sans text-caption text-ink-subtle">{pick(e.party)}</span>}
                      </td>
                      <td className="px-lg py-md font-sans text-caption text-ink-muted tabular-nums">{e.sourceRef ?? '—'}</td>
                      <td className="px-lg py-md text-end"><Amount minor={linesDebit(e.lines)} /></td>
                      <td className="px-lg py-md text-end" onClick={(ev) => ev.stopPropagation()}>
                        {e.status === 'posted' && e.source !== 'opening' && (
                          <button
                            onClick={() => setConfirmReverse(e)}
                            title={pick({ en: 'Reverse this entry', ar: 'عكس هذا القيد' })}
                            className="grid place-items-center w-7 h-7 rounded-md text-ink-subtle hover:text-danger ms-auto transition-colors"
                          ><Undo2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-hairline bg-surface-2/20">
                        <td colSpan={6} className="px-lg py-md">
                          <LineTable lines={e.lines} />
                          <p className="font-sans text-caption text-ink-subtle mt-sm">
                            {e.by && <>{pick({ en: 'Posted by', ar: 'رحّله' })} {pick(e.by)} · </>}
                            {pick(periodLabel(e.period))}
                            {e.reversalOf && <> · {pick({ en: 'Reverses', ar: 'يعكس القيد' })} {e.reversalOf}</>}
                            {e.reversedBy && <> · {pick({ en: 'Reversed by', ar: 'عُكس بالقيد' })} {e.reversedBy}</>}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
          <span className="font-sans text-caption text-ink-muted">{shown.length} {pick({ en: 'entries', ar: 'قيد' })}</span>
          <span className="font-sans text-caption text-ink-muted">
            {pick({ en: 'Total posted', ar: 'إجمالي المُرحّل' })} <Amount minor={totalPosted} tone="gold" />
          </span>
        </div>
      </div>

      {manualOpen && <ManualEntryModal onClose={() => setManualOpen(false)} />}
      {confirmReverse && (
        <ConfirmDialog
          open
          onClose={() => setConfirmReverse(null)}
          onConfirm={() => {
            const r = reverse(confirmReverse.id)
            flash(r.ok
              ? `${pick({ en: 'Reversed by', ar: 'عُكس بالقيد' })} ${r.entry.no}`
              : pick(r.problems[0] ?? { en: 'Could not reverse.', ar: 'تعذّر عكس القيد.' }))
          }}
          title={pick({ en: 'Reverse this entry?', ar: 'عكس هذا القيد؟' })}
          message={pick({
            en: `${confirmReverse.no} stays in the book exactly as it was posted. A mirror entry is posted against it, so both the mistake and its correction remain visible.`,
            ar: `يبقى القيد ${confirmReverse.no} في الدفتر كما رُحّل تمامًا، ويُرحَّل مقابله قيد عكسي — فيبقى الخطأ وتصحيحه ظاهرين معًا.`,
          })}
          confirmLabel={pick({ en: 'Yes, reverse it', ar: 'نعم، اعكسه' })}
        />
      )}
    </div>
  )
}

/** The lines of one entry — the debit and credit that make it an entry at all. */
function LineTable({ lines }: { lines: JournalLine[] }) {
  const { pick } = useLocale()
  const { accountOf } = useLedger()
  const { centerOf } = useCostCenters()
  return (
    <div className="rounded-md border border-hairline overflow-hidden bg-surface-1">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            {[
              { h: { en: 'Account', ar: 'الحساب' }, a: 'text-start' },
              { h: { en: 'Cost centre', ar: 'مركز التكلفة' }, a: 'text-start' },
              { h: { en: 'Debit', ar: 'مدين' }, a: 'text-end' },
              { h: { en: 'Credit', ar: 'دائن' }, a: 'text-end' },
            ].map((x, i) => (
              <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-1.5', x.a)}>{pick(x.h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const acc = accountOf(l.accountCode)
            const cc = l.centerId ? centerOf(l.centerId) : undefined
            return (
              <tr key={i} className="border-b border-hairline last:border-0">
                <td className="px-md py-1.5">
                  <span className="font-sans text-data text-ink tabular-nums me-2">{l.accountCode}</span>
                  <span className="font-sans text-data text-ink-muted">{acc ? pick(acc.name) : '—'}</span>
                  {l.memo && <span className="block font-sans text-caption text-ink-subtle">{pick(l.memo)}</span>}
                </td>
                <td className="px-md py-1.5 font-sans text-caption text-ink-muted">{cc ? `${cc.code} · ${pick(cc.name)}` : '—'}</td>
                <td className="px-md py-1.5 text-end"><Amount minor={l.debitMinor} /></td>
                <td className="px-md py-1.5 text-end"><Amount minor={l.creditMinor} /></td>
              </tr>
            )
          })}
          <tr className="bg-surface-2">
            <td colSpan={2} className="px-md py-1.5 font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Totals', ar: 'الإجماليات' })}</td>
            <td className="px-md py-1.5 text-end"><Amount minor={linesDebit(lines)} tone="gold" dash={false} /></td>
            <td className="px-md py-1.5 text-end"><Amount minor={linesCredit(lines)} tone="gold" dash={false} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/* ───────────── manual entry ───────────── */

interface DraftLine {
  accountCode: string
  debit: string
  credit: string
  centerId: string
}

const emptyLine = (): DraftLine => ({ accountCode: '', debit: '', credit: '', centerId: '' })

/**
 * A journal entry made by hand — an accrual, a correction, a transfer between accounts.
 * It cannot be filed until the debits equal the credits, which is not a nicety of the form
 * but the rule the book itself enforces on the way in.
 */
function ManualEntryModal({ onClose }: { onClose: () => void }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { postableAccounts, post, periods } = useLedger()
  const { activeCenters } = useCostCenters()

  const openPeriod = periods.find((p) => !p.closed)
  const [date, setDate] = useState(openPeriod ? `${openPeriod.key}-15` : '')
  const [memoAr, setMemoAr] = useState('')
  const [memoEn, setMemoEn] = useState('')
  const [party, setParty] = useState('')
  const [rows, setRows] = useState<DraftLine[]>([emptyLine(), emptyLine()])

  const lines: JournalLine[] = rows.map((r) => ({
    accountCode: r.accountCode,
    debitMinor: parseMinor(r.debit),
    creditMinor: parseMinor(r.credit),
    centerId: r.centerId === '' ? undefined : r.centerId,
  }))

  const totalDebit = linesDebit(lines)
  const totalCredit = linesCredit(lines)
  const difference = totalDebit - totalCredit
  const problems = entryProblems(lines)
  const missingText = memoAr.trim() === '' || memoEn.trim() === ''
  const valid = problems.length === 0 && !missingText && date !== ''

  const setRow = (i: number, patch: Partial<DraftLine>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const submit = () => {
    if (!valid) return
    const result = post({
      date,
      source: 'manual',
      memo: { en: memoEn.trim(), ar: memoAr.trim() },
      party: party.trim() === '' ? undefined : { en: party.trim(), ar: party.trim() },
      lines,
    })
    if (result.ok) {
      flash(`${result.entry.no} · ${money(totalDebit)}`)
      onClose()
    } else {
      flash(pick(result.problems[0]))
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      eyebrow={pick({ en: 'Journal', ar: 'دفتر اليومية' })}
      title={pick({ en: 'Manual journal entry', ar: 'قيد يومية يدوي' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Post the entry', ar: 'ترحيل القيد' })}</button>
      </>}
    >
      <div className="flex flex-col gap-md">
        <div className="grid sm:grid-cols-3 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Date', ar: 'التاريخ' })}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input tabular-nums" dir="ltr" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Description (Arabic)', ar: 'البيان بالعربية' })}</span>
            <input value={memoAr} onChange={(e) => setMemoAr(e.target.value)} className="input" placeholder="سبب القيد…" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Description (English)', ar: 'البيان بالإنجليزية' })}</span>
            <input value={memoEn} onChange={(e) => setMemoEn(e.target.value)} className="input" placeholder="What this entry is for…" dir="ltr" />
          </label>
        </div>

        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Party (optional)', ar: 'الطرف (اختياري)' })}</span>
          <input value={party} onChange={(e) => setParty(e.target.value)} className="input" placeholder={pick({ en: 'Customer, supplier, employee…', ar: 'عميل أو مورّد أو موظف…' })} />
        </label>

        <div className="rounded-lg border border-hairline-strong overflow-hidden">
          <div className="px-md py-2 bg-surface-2 border-b border-hairline flex items-center justify-between">
            <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Lines', ar: 'سطور القيد' })}</span>
            <button onClick={() => setRows((prev) => [...prev, emptyLine()])} className={buttonClass('ghost', 'sm')}>
              <Plus size={14} /> {pick({ en: 'Add line', ar: 'إضافة سطر' })}
            </button>
          </div>
          <div className="divide-y divide-hairline">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-sm items-end p-md">
                <label className="col-span-12 sm:col-span-5 flex flex-col gap-xs">
                  <span className="label">{pick({ en: 'Account', ar: 'الحساب' })}</span>
                  <select value={r.accountCode} onChange={(e) => setRow(i, { accountCode: e.target.value })} className="input cursor-pointer">
                    <option value="">{pick({ en: 'Choose…', ar: 'اختر…' })}</option>
                    {postableAccounts.map((a) => <option key={a.code} value={a.code}>{a.code} · {pick(a.name)}</option>)}
                  </select>
                </label>
                <label className="col-span-6 sm:col-span-3 flex flex-col gap-xs">
                  <span className="label">{pick({ en: 'Cost centre', ar: 'مركز التكلفة' })}</span>
                  <select value={r.centerId} onChange={(e) => setRow(i, { centerId: e.target.value })} className="input cursor-pointer">
                    <option value="">{pick({ en: 'None', ar: 'بدون' })}</option>
                    {activeCenters.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
                  </select>
                </label>
                <label className="col-span-3 sm:col-span-2 flex flex-col gap-xs">
                  <span className="label">{pick({ en: 'Debit', ar: 'مدين' })}</span>
                  {/* One side only: typing in one column clears the other, because a line
                      that is both is not a line. */}
                  <input
                    value={r.debit}
                    onChange={(e) => setRow(i, { debit: e.target.value, credit: '' })}
                    className="input tabular-nums" inputMode="decimal" placeholder="0"
                  />
                </label>
                <div className="col-span-3 sm:col-span-2 flex items-end gap-xs">
                  <label className="flex-1 flex flex-col gap-xs">
                    <span className="label">{pick({ en: 'Credit', ar: 'دائن' })}</span>
                    <input
                      value={r.credit}
                      onChange={(e) => setRow(i, { credit: e.target.value, debit: '' })}
                      className="input tabular-nums" inputMode="decimal" placeholder="0"
                    />
                  </label>
                  {rows.length > 2 && (
                    <button
                      onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      className="grid place-items-center w-9 h-9 rounded-md text-ink-subtle hover:text-danger shrink-0"
                      aria-label={pick({ en: 'Remove line', ar: 'حذف السطر' })}
                    ><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-md py-2 bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
            <span className="font-sans text-caption text-ink-muted tabular-nums">
              {pick({ en: 'Debits', ar: 'المدين' })} {money(totalDebit)} · {pick({ en: 'Credits', ar: 'الدائن' })} {money(totalCredit)}
            </span>
            <span className={cn('font-sans text-data tabular-nums', difference === 0 ? 'text-success' : 'text-danger')}>
              {difference === 0
                ? pick({ en: 'Balanced', ar: 'متوازن' })
                : `${pick({ en: 'Difference', ar: 'الفرق' })} ${money(Math.abs(difference))}`}
            </span>
          </div>
        </div>

        {(problems.length > 0 || missingText) && (
          <ul className="rounded-lg bg-danger/[0.06] border border-danger/25 p-md flex flex-col gap-xxs">
            {missingText && (
              <li className="flex items-start gap-xs font-sans text-caption text-danger">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {pick({ en: 'The entry needs a description in both languages.', ar: 'القيد يحتاج بيانًا باللغتين.' })}
              </li>
            )}
            {problems.map((p, i) => (
              <li key={i} className="flex items-start gap-xs font-sans text-caption text-danger">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />{pick(p)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/** Exported for the period-close panel, which shows the closing entry before it posts. */
export { LineTable }
