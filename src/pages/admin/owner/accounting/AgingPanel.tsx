import { useMemo, useState } from 'react'
import { Check, AlertTriangle, Clock } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { downloadExcel } from '@/lib/excel'
import { openAccountingReportPdf } from '@/lib/accountingPdf'
import type { Bilingual } from '@/data/types'
import { ACC } from '@/data/coa'
import { receivables } from '@/data/ownerFinance'
import { purchaseInvoices } from '@/data/ownerSupply'
import { aging, agingBucketMeta, controlCheck, type AgingInput } from '@/lib/accounting'
import { useLedger } from '@/state/LedgerContext'
import { StatCard, SegTabs, Pill, UtilBar } from '../_shared'
import { Amount, EmptyRow, ExportBar, Head, sheetAmount, useIssuedOn } from './_bits'

export type AgingView = 'receivable' | 'payable'

/**
 * Who owes the business and who the business owes, banded by how late each balance is —
 * and, at the top of each, whether the control account in the ledger still equals the list
 * beneath it. A control account that has drifted from its subledger is the single most
 * useful thing an accountant can be told, so it is stated rather than left to be discovered.
 */
export function AgingPanel() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { accounts, entries } = useLedger()
  const issuedOn = useIssuedOn()
  const [view, setView] = useState<AgingView>('receivable')

  // Receivables come from the collection list; payables from supplier invoices not yet
  // matched and settled. Both are the subledgers their control accounts summarise.
  const arRows: AgingInput[] = useMemo(
    () => receivables.map((r) => ({
      id: r.id,
      party: r.account,
      amountMinor: r.outstandingMinor,
      daysLate: r.daysLate,
      due: r.dueDate,
      note: { en: r.channel, ar: r.channel },
    })),
    [],
  )

  const apRows: AgingInput[] = useMemo(
    () => purchaseInvoices
      .filter((i) => i.match !== 'matched')
      .map((i) => ({
        id: i.id,
        party: i.supplier,
        amountMinor: i.totalMinor,
        // An invoice that could not be three-way matched is the one holding the payment up.
        daysLate: i.match === 'flagged' ? 12 : 0,
        due: i.date,
        note: i.material,
      })),
    [],
  )

  const rows = view === 'receivable' ? arRows : apRows
  const report = useMemo(() => aging(rows), [rows])
  const control = useMemo(
    () => controlCheck(accounts, entries, view === 'receivable' ? ACC.receivables : ACC.payables, report.totalMinor),
    [accounts, entries, view, report.totalMinor],
  )

  const title: Bilingual = view === 'receivable'
    ? { en: 'Receivables aging', ar: 'أعمار الذمم المدينة' }
    : { en: 'Payables aging', ar: 'أعمار الذمم الدائنة' }

  const partyLabel: Bilingual = view === 'receivable'
    ? { en: 'Account', ar: 'الحساب' }
    : { en: 'Supplier', ar: 'المورّد' }

  const exportPdf = () => {
    openAccountingReportPdf({
      title: pick(title),
      subtitle: `Jaz · ${pick(control.label)} (${control.code})`,
      meta: [
        { label: pick({ en: 'Balances', ar: 'عدد الأرصدة' }), value: String(report.rows.length) },
        { label: pick({ en: 'Total', ar: 'الإجمالي' }), value: money(report.totalMinor) },
        { label: pick({ en: 'Overdue', ar: 'المتأخر' }), value: money(report.overdueMinor) },
        { label: pick({ en: 'Control account', ar: 'حساب المراقبة' }), value: money(control.controlMinor) },
        { label: pick({ en: 'Reconciled', ar: 'المطابقة' }), value: pick(control.reconciled ? { en: 'Yes', ar: 'نعم' } : { en: 'No', ar: 'لا' }) },
        { label: pick({ en: 'Issued on', ar: 'تاريخ الإصدار' }), value: issuedOn },
      ],
      tables: [
        {
          caption: pick({ en: 'By age', ar: 'حسب العمر' }),
          head: [
            { label: pick({ en: 'Band', ar: 'الفئة' }) },
            { label: pick({ en: 'Balances', ar: 'عدد الأرصدة' }), num: true },
            { label: pick({ en: 'Amount', ar: 'المبلغ' }), num: true },
          ],
          rows: [
            ...report.buckets.map((b) => ({
              cells: [
                { text: pick(agingBucketMeta[b.key].label) },
                { text: String(b.count), num: true },
                { text: money(b.amountMinor), num: true },
              ],
            })),
            { cells: [{ text: pick({ en: 'Total', ar: 'الإجمالي' }), strong: true }, { text: String(report.rows.length), num: true, strong: true }, { text: money(report.totalMinor), num: true, strong: true }], tone: 'grand' as const },
          ],
        },
        {
          caption: pick({ en: 'Balance by balance', ar: 'تفصيل الأرصدة' }),
          head: [
            { label: pick({ en: 'Reference', ar: 'المرجع' }) },
            { label: pick(partyLabel) },
            { label: pick({ en: 'Due', ar: 'الاستحقاق' }) },
            { label: pick({ en: 'Days late', ar: 'أيام التأخير' }), num: true },
            { label: pick({ en: 'Amount', ar: 'المبلغ' }), num: true },
          ],
          empty: pick({ en: 'Nothing outstanding', ar: 'لا توجد أرصدة قائمة' }),
          rows: report.rows.map((r) => ({
            cells: [
              { text: r.id },
              { text: pick(r.party) },
              { text: r.due ? pick(r.due) : '—' },
              { text: r.daysLate > 0 ? String(r.daysLate) : '—', num: true },
              { text: money(r.amountMinor), num: true },
            ],
          })),
        },
      ],
      footnote: pick({
        en: 'Generated from the Jaz platform · the control account and this list are two readings of the same obligations; when they differ, the ledger is right and the difference must be found.',
        ar: 'صدر من منصة جاز · حساب المراقبة وهذه القائمة قراءتان لالتزامات واحدة؛ وعند اختلافهما فالدفتر هو المرجع ويجب تتبّع الفرق.',
      }),
    }, { rtl: locale === 'ar' })
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  const exportExcel = () => downloadExcel(
    view === 'receivable' ? 'receivables-aging' : 'payables-aging',
    pick(title),
    [
      [pick({ en: 'Reference', ar: 'المرجع' }), pick(partyLabel), pick({ en: 'Due', ar: 'الاستحقاق' }), pick({ en: 'Days late', ar: 'أيام التأخير' }), pick({ en: 'Band', ar: 'الفئة' }), pick({ en: 'Amount', ar: 'المبلغ' })],
      ...report.rows.map((r) => [r.id, pick(r.party), r.due ? pick(r.due) : '', r.daysLate, pick(agingBucketMeta[r.bucket].label), sheetAmount(r.amountMinor)]),
      ['', '', '', '', pick({ en: 'Total', ar: 'الإجمالي' }), sheetAmount(report.totalMinor)],
    ],
  )

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Receivables & payables', ar: 'الذمم المدينة والدائنة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Every open balance banded by how late it is, checked against the control account that summarises it in the ledger.',
            ar: 'كل رصيد قائم مصنّفًا بحسب تأخره، ومطابَقًا مع حساب المراقبة الذي يلخّصه في الأستاذ العام.',
          })}</p>
        </div>
        <ExportBar onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <SegTabs
        tabs={[
          { id: 'receivable' as const, label: pick({ en: 'Owed to us', ar: 'لنا' }) },
          { id: 'payable' as const, label: pick({ en: 'Owed by us', ar: 'علينا' }) },
        ]}
        active={view}
        onChange={setView}
      />

      {/* the reconciliation, stated first because everything below depends on it */}
      <div className={cn(
        'card p-lg flex flex-wrap items-center justify-between gap-md border',
        control.reconciled ? 'border-success/30' : 'border-danger/40',
      )}>
        <div className="flex items-start gap-sm min-w-0">
          <span className={cn('grid place-items-center w-8 h-8 rounded-md shrink-0', control.reconciled ? 'text-success bg-success/10' : 'text-danger bg-danger/10')}>
            {control.reconciled ? <Check size={16} /> : <AlertTriangle size={16} />}
          </span>
          <div className="min-w-0">
            <p className="font-sans text-data text-ink">
              {control.reconciled
                ? pick({ en: 'The control account agrees with this list.', ar: 'حساب المراقبة مطابق لهذه القائمة.' })
                : pick({ en: 'The control account has drifted from this list.', ar: 'حساب المراقبة يختلف عن هذه القائمة.' })}
            </p>
            <p className="font-sans text-caption text-ink-subtle mt-xxs">
              {control.code} · {pick(control.label)} — {pick({ en: 'ledger', ar: 'الأستاذ' })} {money(control.controlMinor)} · {pick({ en: 'subledger', ar: 'السجل المساعد' })} {money(control.subledgerMinor)}
              {!control.reconciled && <> · <span className="text-danger">{pick({ en: 'difference', ar: 'الفرق' })} {money(control.differenceMinor)}</span></>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Total outstanding', ar: 'إجمالي القائم' })} value={money(report.totalMinor, { withSymbol: false })} sub={`${report.rows.length} ${pick({ en: 'balances', ar: 'رصيد' })}`} tone="dark" />
        <StatCard label={pick({ en: 'Overdue', ar: 'المتأخر' })} value={money(report.overdueMinor, { withSymbol: false })} sub={`${report.rows.filter((r) => r.daysLate > 0).length} ${pick({ en: 'past their date', ar: 'تجاوز موعده' })}`} tone={report.overdueMinor > 0 ? 'gold' : 'green'} />
        <StatCard label={pick({ en: 'Within terms', ar: 'ضمن المهلة' })} value={money(report.totalMinor - report.overdueMinor, { withSymbol: false })} sub={pick({ en: 'Not yet due', ar: 'لم يحل موعده' })} tone="green" />
        <StatCard label={pick({ en: 'Oldest balance', ar: 'أقدم رصيد' })} value={String(report.rows[0]?.daysLate ?? 0)} unit={pick({ en: 'days', ar: 'يومًا' })} sub={report.rows[0] ? pick(report.rows[0].party) : '—'} />
      </div>

      {/* the bands */}
      <div className="card p-lg flex flex-col gap-sm">
        <h4 className="font-serif text-card-title text-ink">{pick({ en: 'By age', ar: 'حسب العمر' })}</h4>
        <div className="flex flex-col gap-xs">
          {report.buckets.map((b) => {
            const meta = agingBucketMeta[b.key]
            const pct = report.totalMinor > 0 ? Math.round((b.amountMinor / report.totalMinor) * 100) : 0
            return (
              <div key={b.key} className="grid grid-cols-12 items-center gap-sm">
                <span className="col-span-4 sm:col-span-3"><Pill color={meta.color} bg={meta.bg}>{pick(meta.label)}</Pill></span>
                <span className="col-span-2 sm:col-span-1 font-sans text-caption text-ink-subtle tabular-nums">{b.count}</span>
                <span className="col-span-4 sm:col-span-6"><UtilBar pct={pct} color={meta.color} /></span>
                <span className="col-span-2 text-end"><Amount minor={b.amountMinor} tone="muted" /></span>
              </div>
            )
          })}
        </div>
      </div>

      {/* the balances themselves */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
          <Clock size={16} className="text-ink-subtle" />
          <h4 className="font-serif text-card-title text-ink">{pick(title)}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <Head cols={[
              { label: { en: 'Reference', ar: 'المرجع' } },
              { label: partyLabel },
              { label: { en: 'Due', ar: 'الاستحقاق' } },
              { label: { en: 'Age', ar: 'العمر' } },
              { label: { en: 'Amount', ar: 'المبلغ' }, num: true },
            ]} />
            <tbody>
              {report.rows.length === 0 && (
                <EmptyRow span={5}>{pick({ en: 'Nothing outstanding.', ar: 'لا توجد أرصدة قائمة.' })}</EmptyRow>
              )}
              {report.rows.map((r) => {
                const meta = agingBucketMeta[r.bucket]
                return (
                  <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                    <td className="px-lg py-sm font-sans text-data text-ink tabular-nums">{r.id}</td>
                    <td className="px-lg py-sm">
                      <span className="font-sans text-data text-ink">{pick(r.party)}</span>
                      {r.note && <span className="block font-sans text-caption text-ink-subtle">{pick(r.note)}</span>}
                    </td>
                    <td className="px-lg py-sm font-sans text-caption text-ink-muted">{r.due ? pick(r.due) : '—'}</td>
                    <td className="px-lg py-sm">
                      <Pill color={meta.color} bg={meta.bg}>
                        {r.daysLate > 0 ? `${r.daysLate} ${pick({ en: 'days late', ar: 'يوم تأخير' })}` : pick(meta.label)}
                      </Pill>
                    </td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.amountMinor} /></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2 border-t border-hairline-strong">
                <td colSpan={4} className="px-lg py-md font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Total', ar: 'الإجمالي' })}</td>
                <td className="px-lg py-md text-end"><Amount minor={report.totalMinor} tone="gold" dash={false} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
