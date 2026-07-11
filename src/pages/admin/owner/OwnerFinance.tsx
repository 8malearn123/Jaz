import { useState } from 'react'
import { Eye, Plus, Wallet } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { RankedBars } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import {
  finBase, finGrossMinor, expenseCategories,
  collectionRows, taxCard, receivables, type ReceivableRow,
} from '@/data/ownerFinance'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, UtilBar } from './_shared'

// Cost recalibration was removed — unit costs derive from purchase invoices.
// The waste log lives in Supply chain, not here.
type FinTab = 'overview' | 'tax'

/** Finance panel. The active sub-view is driven by the sidebar sub-nav (see AdminConsole). */
export function OwnerFinance({ view = 'overview' }: { view?: FinTab }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { netProfitMinor, wasteTotalMinor, expenses, recordExpense, opexTotalMinor } = useOwnerState()
  // Receivable row opened for inspection via the eye button.
  const [viewRec, setViewRec] = useState<ReceivableRow | null>(null)
  const [expenseOpen, setExpenseOpen] = useState(false)

  const pctOfRev = (m: number) => `${Math.round((m / finBase.revenueMinor) * 100)}%`

  // Group recorded expenses by category for the ranked bars.
  const opexByCat = expenses.reduce<{ label: { en: string; ar: string }; amountMinor: number }[]>((acc, e) => {
    const hit = acc.find((r) => r.label.en === e.category.en && r.label.ar === e.category.ar)
    if (hit) hit.amountMinor += e.amountMinor
    else acc.push({ label: e.category, amountMinor: e.amountMinor })
    return acc
  }, [])

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Finance & costs', ar: 'المالية والتكاليف' })} subtitle={pick({ en: 'P&L, collection and tax', ar: 'الأرباح والتحصيل والضريبة' })} />

      {view === 'overview' && (
        <div className="flex flex-col gap-lg">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-sm">
            <StatCard label={pick({ en: 'Revenue', ar: 'الإيراد' })} value={money(finBase.revenueMinor, { withSymbol: false })} sub="100%" tone="dark" />
            <StatCard label={pick({ en: 'COGS', ar: 'تكلفة البضاعة' })} value={money(finBase.cogsMinor, { withSymbol: false })} sub={pctOfRev(finBase.cogsMinor)} />
            <StatCard label={pick({ en: 'Gross profit', ar: 'الربح الإجمالي' })} value={money(finGrossMinor, { withSymbol: false })} sub={pctOfRev(finGrossMinor)} tone="green" />
            <StatCard label={pick({ en: 'Opex', ar: 'مصاريف تشغيلية' })} value={money(opexTotalMinor, { withSymbol: false })} sub={opexTotalMinor > 0 ? pctOfRev(opexTotalMinor) : pick({ en: 'Nothing recorded', ar: 'لا شيء مسجل' })} />
            <StatCard label={pick({ en: 'Net profit', ar: 'صافي الربح' })} value={money(netProfitMinor, { withSymbol: false })} sub={pctOfRev(netProfitMinor)} tone="gold" />
          </div>
          <div className="grid lg:grid-cols-2 gap-lg items-start">
            <div className="card p-lg flex flex-col gap-sm">
              <h3 className="font-serif text-card-title text-ink mb-xs">{pick({ en: 'P&L statement', ar: 'قائمة الأرباح والخسائر' })}</h3>
              {([['Revenue', 'الإيراد', finBase.revenueMinor, 'add'], ['− COGS', '− تكلفة البضاعة', -finBase.cogsMinor, 'sub'], ['= Gross', '= إجمالي', finGrossMinor, 'total'], ['− Opex', '− تشغيلية', -opexTotalMinor, 'sub'], ['− Waste', '− هدر', -wasteTotalMinor, 'sub'], ['= Net', '= صافي', netProfitMinor, 'net']] as const).map(([en, ar, v, kind], i) => (
                <div key={i} className={cn('flex items-center justify-between py-1.5', (kind === 'total' || kind === 'net') && 'border-t border-hairline mt-xs pt-sm')}>
                  <span className={cn('font-sans text-data', kind === 'net' ? 'text-ink font-medium' : 'text-ink-muted')}>{pick({ en, ar })}</span>
                  <span className={cn('font-sans text-data tabular-nums', kind === 'net' ? 'text-primary-hover font-semibold' : kind === 'total' ? 'text-success' : v < 0 ? 'text-ink-muted' : 'text-ink')}>{money(Math.abs(v))}</span>
                </div>
              ))}
            </div>
            <div className="card p-lg flex flex-col gap-md">
              <div className="flex items-center justify-between gap-sm">
                <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Operating expenses', ar: 'المصاريف التشغيلية' })}</h3>
                <button onClick={() => setExpenseOpen(true)} className={buttonClass('secondary', 'sm')}><Plus size={14} /> {pick({ en: 'Record expense', ar: 'تسجيل مصروف' })}</button>
              </div>
              {expenses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-hairline-strong bg-surface-2/50 p-lg flex flex-col items-center gap-sm text-center">
                  <span className="grid place-items-center w-11 h-11 rounded-md bg-surface-2 text-ink-subtle"><Wallet size={20} /></span>
                  <p className="font-sans text-data text-ink-muted">{pick({ en: 'Salaries, rent and the like are your own affairs — the platform doesn’t assume them.', ar: 'الرواتب والإيجار وأمثالها شؤونك الخاصة — المنصة لا تفترضها.' })}</p>
                  <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Record each expense here and the P&L updates instantly.', ar: 'سجّل كل مصروف من هنا وتتحدث قائمة الأرباح مباشرة.' })}</p>
                </div>
              ) : (
                <>
                  <RankedBars rows={opexByCat.map((o) => ({ label: pick(o.label), value: o.amountMinor, display: money(o.amountMinor) }))} />
                  <ul className="divide-y divide-hairline border-t border-hairline pt-xs">
                    {expenses.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-sm py-2">
                        <span className="font-sans text-data text-ink-muted truncate">{pick(e.category)}{e.note && <span className="text-ink-subtle text-caption"> · {e.note}</span>}</span>
                        <span className="font-sans text-data text-ink tabular-nums shrink-0">−{money(e.amountMinor)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'tax' && (
        <div className="flex flex-col gap-lg">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-lg items-start">
            <div className="card p-lg flex flex-col gap-md">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Collection by channel', ar: 'التحصيل حسب القناة' })}</h3>
              {collectionRows.map((c, i) => (
                <div key={i} className="flex flex-col gap-xxs">
                  <div className="flex items-center justify-between"><span className="font-sans text-data text-ink">{pick(c.label)} <span className="text-ink-subtle text-caption">· {pick(c.note)}</span></span><span className="font-sans text-data text-ink tabular-nums">{c.pct}%</span></div>
                  <UtilBar pct={c.pct} color={c.pct >= 90 ? '#355c4b' : c.pct >= 60 ? '#b08a57' : '#b5403b'} />
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-surface-dark-1 border border-hairline-dark p-lg text-ink-on-dark flex flex-col gap-sm">
              <p className="font-sans text-caption uppercase tracking-[0.12em] text-primary-bright">{pick({ en: 'ZATCA · VAT', ar: 'الهيئة · ضريبة القيمة المضافة' })}</p>
              <div className="flex items-center justify-between"><span className="font-sans text-data text-ink-on-dark-muted">{pick({ en: 'Output VAT', ar: 'ضريبة مخرجات' })}</span><span className="font-sans text-data tabular-nums">{money(taxCard.outputMinor)}</span></div>
              <div className="flex items-center justify-between"><span className="font-sans text-data text-ink-on-dark-muted">{pick({ en: 'Input VAT', ar: 'ضريبة مدخلات' })}</span><span className="font-sans text-data tabular-nums">−{money(taxCard.inputMinor)}</span></div>
              <div className="flex items-center justify-between border-t border-hairline-dark pt-sm mt-xs"><span className="font-sans text-data text-ink-on-dark">{pick({ en: 'Net due', ar: 'صافي المستحق' })}</span><span className="font-serif text-card-title text-primary-bright tabular-nums">{money(taxCard.netMinor)}</span></div>
              <p className="font-sans text-caption text-ink-on-dark-muted">{pick({ en: 'Due', ar: 'يستحق' })} {pick(taxCard.dueDate)}</p>
            </div>
          </div>

          {/* receivables by account — who owes what and how late */}
          <div className="card overflow-hidden">
            <div className="px-lg py-md border-b border-hairline">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Receivables by account', ar: 'التحصيل حسب الحساب' })}</h3>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Every account, its outstanding balance, due date and how late it is', ar: 'كل حساب ومبلغه المستحق وتاريخ استحقاقه وهل هو متأخر بالسداد وكم التأخير' })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline">
                    {[{ h: { en: 'Account', ar: 'الحساب' }, a: 'text-start' }, { h: { en: 'Outstanding', ar: 'المبلغ المستحق' }, a: 'text-end' }, { h: { en: 'Due date', ar: 'تاريخ الاستحقاق' }, a: 'text-start' }, { h: { en: 'Payment status', ar: 'حالة السداد' }, a: 'text-start' }, { h: { en: 'View', ar: 'اطلاع' }, a: 'text-end' }].map((c, i) => (
                      <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...receivables].sort((a, b) => b.daysLate - a.daysLate).map((r) => (
                    <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                      <td className="px-lg py-md">
                        <p className="font-sans text-data text-ink truncate max-w-[240px]">{pick(r.account)}</p>
                        <p className="font-sans text-caption text-ink-subtle">{r.channel === 'MEGA' ? 'B2B' : 'HoReCa'}</p>
                      </td>
                      <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums whitespace-nowrap">{money(r.outstandingMinor)}</td>
                      <td className="px-lg py-md font-sans text-data text-ink-muted">{pick(r.dueDate)}</td>
                      <td className="px-lg py-md">
                        {r.daysLate > 0
                          ? <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>{pick({ en: 'Late', ar: 'متأخر' })} · {r.daysLate} {pick({ en: 'days', ar: 'يوم' })}</span>
                          : <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium" style={{ color: '#2f7d5b', backgroundColor: '#e6f2ea' }}>{pick({ en: 'Within terms', ar: 'ضمن المدة' })}</span>}
                      </td>
                      <td className="px-lg py-md text-end">
                        <button onClick={() => setViewRec(r)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30 transition-colors ms-auto" aria-label={pick({ en: 'View details', ar: 'اطلاع' })}><Eye size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
              <span className="font-sans text-caption text-ink-muted tabular-nums">{pick({ en: 'Total outstanding', ar: 'إجمالي المستحق' })}: {money(receivables.reduce((a, r) => a + r.outstandingMinor, 0))}</span>
              <span className="font-sans text-caption text-danger tabular-nums">{pick({ en: 'Overdue', ar: 'المتأخر' })}: {money(receivables.filter((r) => r.daysLate > 0).reduce((a, r) => a + r.outstandingMinor, 0))} · {receivables.filter((r) => r.daysLate > 0).length} {pick({ en: 'accounts', ar: 'حسابات' })}</span>
            </div>
          </div>
        </div>
      )}

      {expenseOpen && (
        <RecordExpenseModal
          onClose={() => setExpenseOpen(false)}
          onSubmit={(e) => { recordExpense(e); flash(pick({ en: 'Expense recorded', ar: 'سُجّل المصروف' })) }}
        />
      )}

      {/* receivable inspection — opened from the eye button */}
      {viewRec && (
        <Modal open onClose={() => setViewRec(null)} size="sm" eyebrow={pick({ en: 'Receivable', ar: 'مستحق تحصيل' })} title={pick(viewRec.account)}
          footer={<button onClick={() => setViewRec(null)} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
          <div className="flex flex-col gap-md">
            <div className="rounded-lg border border-hairline divide-y divide-hairline">
              {[
                { k: pick({ en: 'Channel', ar: 'القناة' }), v: viewRec.channel === 'MEGA' ? 'B2B' : 'HoReCa' },
                { k: pick({ en: 'Outstanding', ar: 'المبلغ المستحق' }), v: money(viewRec.outstandingMinor) },
                { k: pick({ en: 'Due date', ar: 'تاريخ الاستحقاق' }), v: pick(viewRec.dueDate) },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between px-md py-2">
                  <span className="font-sans text-caption text-ink-subtle">{r.k}</span>
                  <span className="font-sans text-data text-ink tabular-nums">{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-md py-2">
                <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Payment status', ar: 'حالة السداد' })}</span>
                {viewRec.daysLate > 0
                  ? <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>{pick({ en: 'Late', ar: 'متأخر' })} · {viewRec.daysLate} {pick({ en: 'days', ar: 'يوم' })}</span>
                  : <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium" style={{ color: '#2f7d5b', backgroundColor: '#e6f2ea' }}>{pick({ en: 'Within terms', ar: 'ضمن المدة' })}</span>}
              </div>
            </div>
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'The balance is the sum of this account’s unpaid invoices. It clears automatically once payments are recorded.', ar: 'المبلغ هو مجموع فواتير هذا الحساب غير المسددة، ويُصفَّر تلقائيًا عند تسجيل السداد.' })}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Record an operating expense (salaries, rent, …) — category + amount + optional note. */
function RecordExpenseModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (e: { category: { en: string; ar: string }; amountMinor: number; note?: string }) => void }) {
  const { pick, money } = useLocale()
  const [catIdx, setCatIdx] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const amountMinor = Math.round((parseFloat(amount) || 0) * 100)
  const category = custom.trim() !== ''
    ? { en: custom.trim(), ar: custom.trim() }
    : catIdx != null ? expenseCategories[catIdx] : null
  const valid = category != null && amountMinor > 0

  const submit = () => {
    if (!valid || !category) return
    onSubmit({ category, amountMinor, note: note.trim() || undefined })
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Finance', ar: 'المالية' })} title={pick({ en: 'Record expense', ar: 'تسجيل مصروف' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'Record', ar: 'تسجيل' })}{valid && ` · ${money(amountMinor)}`}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Category', ar: 'الفئة' })}</span>
          <div className="flex flex-wrap gap-xs">
            {expenseCategories.map((c, i) => {
              const on = custom.trim() === '' && catIdx === i
              return (
                <button key={i} type="button" onClick={() => { setCatIdx(i); setCustom('') }}
                  className={cn('rounded-pill border px-3 py-1.5 font-sans text-caption transition-colors', on ? 'bg-primary/10 border-primary text-primary-hover' : 'border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/30')}>
                  {on && '✓ '}{pick(c)}
                </button>
              )
            })}
          </div>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} className="input" placeholder={pick({ en: 'Or type a new category…', ar: 'أو اكتب فئة جديدة…' })} />
        </div>
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs">
            <span className="label">{pick({ en: 'Amount (SAR)', ar: 'المبلغ (ر.س)' })}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="input tabular-nums" dir="ltr" inputMode="decimal" placeholder="0.00" />
          </label>
          <label className="flex flex-col gap-xs">
            <span className="label">{pick({ en: 'Note (optional)', ar: 'ملاحظة (اختياري)' })}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder={pick({ en: 'e.g. July payroll', ar: 'مثال: رواتب يوليو' })} />
          </label>
        </div>
        <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'The expense is deducted in the P&L immediately and rolls up by category.', ar: 'يُخصم المصروف في قائمة الأرباح فورًا ويُجمَّع حسب الفئة.' })}</p>
      </div>
    </Modal>
  )
}
