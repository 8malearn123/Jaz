import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { downloadExcel } from '@/lib/excel'
import { openAccountingReportPdf } from '@/lib/accountingPdf'
import { filterEntries, trialBalance } from '@/lib/accounting'
import { useLedger } from '@/state/LedgerContext'
import { StatCard } from '../_shared'
import { AccountTypePill, Amount, BalanceBadge, EmptyRow, ExportBar, Head, sheetAmount, useIssuedOn } from './_bits'

/**
 * The trial balance — every account with a balance, on the side it stands, and the proof
 * that the two columns agree. If they ever disagree, something was posted that was not an
 * entry, and every statement built on top of it would be wrong.
 */
export function TrialBalance() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { accounts, entries, periods } = useLedger()
  const issuedOn = useIssuedOn()
  const [upTo, setUpTo] = useState('all')

  const scoped = useMemo(
    () => filterEntries(entries, { toPeriod: upTo === 'all' ? undefined : upTo }),
    [entries, upTo],
  )
  const tb = useMemo(() => trialBalance(accounts, scoped), [accounts, scoped])

  const asOf = upTo === 'all'
    ? pick({ en: 'All periods to date', ar: 'كل الفترات حتى تاريخه' })
    : pick(periods.find((p) => p.key === upTo)?.label ?? { en: upTo, ar: upTo })

  const exportPdf = () => {
    openAccountingReportPdf({
      title: pick({ en: 'Trial balance', ar: 'ميزان المراجعة' }),
      subtitle: `Jaz · ${asOf}`,
      meta: [
        { label: pick({ en: 'As at', ar: 'حتى' }), value: asOf },
        { label: pick({ en: 'Accounts', ar: 'عدد الحسابات' }), value: String(tb.rows.length) },
        { label: pick({ en: 'Entries', ar: 'عدد القيود' }), value: String(scoped.length) },
        { label: pick({ en: 'Total debits', ar: 'إجمالي المدين' }), value: money(tb.totalDebitMinor) },
        { label: pick({ en: 'Total credits', ar: 'إجمالي الدائن' }), value: money(tb.totalCreditMinor) },
        { label: pick({ en: 'Issued on', ar: 'تاريخ الإصدار' }), value: issuedOn },
      ],
      tables: [{
        head: [
          { label: pick({ en: 'Code', ar: 'الرمز' }) },
          { label: pick({ en: 'Account', ar: 'الحساب' }) },
          { label: pick({ en: 'Debit', ar: 'مدين' }), num: true },
          { label: pick({ en: 'Credit', ar: 'دائن' }), num: true },
        ],
        empty: pick({ en: 'Nothing has been posted yet', ar: 'لم يُرحَّل شيء بعد' }),
        rows: [
          ...tb.rows.map((r) => ({
            cells: [
              { text: r.account.code },
              { text: pick(r.account.name) },
              { text: r.debitMinor > 0 ? money(r.debitMinor) : '', num: true },
              { text: r.creditMinor > 0 ? money(r.creditMinor) : '', num: true },
            ],
          })),
          {
            cells: [
              { text: '' },
              { text: pick({ en: 'Totals', ar: 'الإجماليات' }), strong: true },
              { text: money(tb.totalDebitMinor), num: true, strong: true },
              { text: money(tb.totalCreditMinor), num: true, strong: true },
            ],
            tone: 'grand' as const,
          },
        ],
      }],
      footnote: pick({
        en: 'Generated from the Jaz platform · the two columns are equal because every entry in the book was posted balanced, which the book refuses to do otherwise.',
        ar: 'صدر من منصة جاز · تتساوى الخانتان لأن كل قيد في الدفتر رُحّل متوازنًا، ولا يقبل الدفتر خلاف ذلك.',
      }),
    }, { rtl: locale === 'ar' })
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  const exportExcel = () => downloadExcel(
    'trial-balance',
    pick({ en: 'Trial balance', ar: 'ميزان المراجعة' }),
    [
      [pick({ en: 'Code', ar: 'الرمز' }), pick({ en: 'Account', ar: 'الحساب' }), pick({ en: 'Nature', ar: 'الطبيعة' }), pick({ en: 'Debit', ar: 'مدين' }), pick({ en: 'Credit', ar: 'دائن' })],
      ...tb.rows.map((r) => [r.account.code, pick(r.account.name), r.account.type, sheetAmount(r.debitMinor), sheetAmount(r.creditMinor)]),
      ['', pick({ en: 'Totals', ar: 'الإجماليات' }), '', sheetAmount(tb.totalDebitMinor), sheetAmount(tb.totalCreditMinor)],
    ],
  )

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Trial balance', ar: 'ميزان المراجعة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Every account that carries a balance, on the side it stands. The two columns must agree to the halala — that agreement is what makes the statements below it worth reading.',
            ar: 'كل حساب له رصيد، على الجانب الذي يقف عليه. يجب أن تتطابق الخانتان حتى الهللة — وهذا التطابق هو ما يجعل القوائم المبنية عليه ذات قيمة.',
          })}</p>
        </div>
        <ExportBar onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <label className="flex items-center gap-sm">
          <span className="label">{pick({ en: 'As at end of', ar: 'حتى نهاية' })}</span>
          <select value={upTo} onChange={(e) => setUpTo(e.target.value)} className="input cursor-pointer w-auto py-1.5">
            <option value="all">{pick({ en: 'Latest period', ar: 'أحدث فترة' })}</option>
            {periods.map((p) => <option key={p.key} value={p.key}>{pick(p.label)}</option>)}
          </select>
        </label>
        <BalanceBadge
          balanced={tb.balanced}
          okLabel={{ en: 'In balance', ar: 'الميزان متوازن' }}
          badLabel={{ en: 'Out of balance', ar: 'الميزان غير متوازن' }}
          differenceMinor={tb.totalDebitMinor - tb.totalCreditMinor}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Accounts with a balance', ar: 'حسابات لها رصيد' })} value={String(tb.rows.length)} sub={asOf} tone="dark" />
        <StatCard label={pick({ en: 'Total debits', ar: 'إجمالي المدين' })} value={money(tb.totalDebitMinor, { withSymbol: false })} sub={pick({ en: 'Debit column', ar: 'خانة المدين' })} />
        <StatCard label={pick({ en: 'Total credits', ar: 'إجمالي الدائن' })} value={money(tb.totalCreditMinor, { withSymbol: false })} sub={pick({ en: 'Credit column', ar: 'خانة الدائن' })} />
        <StatCard
          label={pick({ en: 'Difference', ar: 'الفرق' })}
          value={money(Math.abs(tb.totalDebitMinor - tb.totalCreditMinor), { withSymbol: false })}
          sub={pick(tb.balanced ? { en: 'The book agrees with itself', ar: 'الدفتر متوافق مع نفسه' } : { en: 'Investigate before reporting', ar: 'يجب الفحص قبل الاعتماد' })}
          tone={tb.balanced ? 'green' : 'gold'}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
          <Scale size={16} className="text-ink-subtle" />
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Balances', ar: 'الأرصدة' })}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <Head cols={[
              { label: { en: 'Code', ar: 'الرمز' } },
              { label: { en: 'Account', ar: 'الحساب' } },
              { label: { en: 'Nature', ar: 'الطبيعة' } },
              { label: { en: 'Debit', ar: 'مدين' }, num: true },
              { label: { en: 'Credit', ar: 'دائن' }, num: true },
            ]} />
            <tbody>
              {tb.rows.length === 0 && (
                <EmptyRow span={5}>{pick({ en: 'Nothing has been posted yet.', ar: 'لم يُرحَّل شيء بعد.' })}</EmptyRow>
              )}
              {tb.rows.map((r) => (
                <tr key={r.account.code} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                  <td className="px-lg py-sm font-sans text-data text-ink tabular-nums">{r.account.code}</td>
                  <td className="px-lg py-sm font-sans text-data text-ink">{pick(r.account.name)}</td>
                  <td className="px-lg py-sm"><AccountTypePill type={r.account.type} /></td>
                  <td className="px-lg py-sm text-end"><Amount minor={r.debitMinor} /></td>
                  <td className="px-lg py-sm text-end"><Amount minor={r.creditMinor} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2 border-t border-hairline-strong">
                <td colSpan={3} className="px-lg py-md font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Totals', ar: 'الإجماليات' })}</td>
                <td className="px-lg py-md text-end"><Amount minor={tb.totalDebitMinor} tone="gold" dash={false} /></td>
                <td className="px-lg py-md text-end"><Amount minor={tb.totalCreditMinor} tone="gold" dash={false} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
