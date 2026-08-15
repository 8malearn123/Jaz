import { useMemo, useState } from 'react'
import { Receipt, Send, HandCoins } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { openAccountingReportPdf } from '@/lib/accountingPdf'
import { vatCloseEntry, vatPaymentEntry } from '@/lib/postingRules'
import { ACC, VAT_RATE } from '@/data/coa'
import { journalSourceMeta } from '@/data/ledger'
import { filterEntries, vatReturn as buildVatReturn } from '@/lib/accounting'
import { useLedger } from '@/state/LedgerContext'
import { StatCard, Pill } from '../_shared'
import { Amount, EmptyRow, ExportBar, Head, useIssuedOn } from './_bits'

/** The three accounts a return is built from. */
const VAT_ACCOUNTS: string[] = [ACC.vatOutput, ACC.vatInput, ACC.vatPayable]

/**
 * The VAT return. Tax charged on sales less tax paid on purchases is what is owed to
 * ZATCA — and both halves are already in the book, because no sale or purchase can be
 * posted without splitting its tax out. Filing moves the two into a single payable; paying
 * clears it against the bank.
 */
export function VatReturn() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { accounts, entries, periods, post, isLocked } = useLedger()
  const issuedOn = useIssuedOn()

  const openPeriod = periods.find((p) => !p.closed)
  const [period, setPeriod] = useState(openPeriod?.key ?? periods[periods.length - 1]?.key ?? '')
  const [confirmFile, setConfirmFile] = useState(false)
  const [confirmPay, setConfirmPay] = useState(false)

  const scoped = useMemo(() => filterEntries(entries, { toPeriod: period }), [entries, period])
  const vat = useMemo(() => buildVatReturn(accounts, scoped), [accounts, scoped])

  // What is still sitting in the two tax accounts — the part a return has not yet swept up.
  const openOutput = vat.outputTaxMinor
  const openInput = vat.inputTaxMinor
  const canFile = (openOutput !== 0 || openInput !== 0) && !isLocked(period)
  const canPay = vat.dueMinor > 0 && !isLocked(period)

  const vatEntries = entries.filter((e) =>
    e.period <= period && e.lines.some((l) => VAT_ACCOUNTS.includes(l.accountCode)),
  )

  const periodName = pick(periods.find((p) => p.key === period)?.label ?? { en: period, ar: period })

  const file = () => {
    const draft = vatCloseEntry({
      date: `${period}-28`,
      period,
      outputMinor: openOutput,
      inputMinor: openInput,
    })
    if (!draft) return
    const r = post(draft)
    flash(r.ok
      ? `${pick({ en: 'Return filed', ar: 'رُحّل الإقرار' })} · ${r.entry.no}`
      : pick(r.problems[0]))
  }

  const pay = () => {
    const r = post(vatPaymentEntry({ date: `${period}-28`, period, amountMinor: vat.dueMinor }))
    flash(r.ok
      ? `${pick({ en: 'VAT settled', ar: 'سُدّدت الضريبة' })} · ${money(vat.dueMinor)}`
      : pick(r.problems[0]))
  }

  const exportPdf = () => {
    openAccountingReportPdf({
      title: pick({ en: 'VAT return', ar: 'إقرار ضريبة القيمة المضافة' }),
      subtitle: `Jaz · ${periodName}`,
      meta: [
        { label: pick({ en: 'Period', ar: 'الفترة' }), value: periodName },
        { label: pick({ en: 'Rate', ar: 'النسبة' }), value: `${VAT_RATE}%` },
        { label: pick({ en: 'Issued on', ar: 'تاريخ الإصدار' }), value: issuedOn },
      ],
      tables: [{
        head: [
          { label: pick({ en: 'Box', ar: 'الخانة' }) },
          { label: pick({ en: 'Amount excluding VAT', ar: 'المبلغ غير شامل الضريبة' }), num: true },
          { label: pick({ en: 'VAT', ar: 'الضريبة' }), num: true },
        ],
        rows: [
          { cells: [{ text: pick({ en: 'Standard-rated sales', ar: 'المبيعات الخاضعة بالنسبة الأساسية' }) }, { text: money(vat.salesBaseMinor), num: true }, { text: money(vat.outputTaxMinor), num: true }] },
          { cells: [{ text: pick({ en: 'Standard-rated purchases', ar: 'المشتريات الخاضعة بالنسبة الأساسية' }) }, { text: money(vat.purchaseBaseMinor), num: true }, { text: money(vat.inputTaxMinor), num: true }] },
          { cells: [{ text: pick({ en: 'Net tax for the period', ar: 'صافي ضريبة الفترة' }), strong: true }, { text: '', num: true }, { text: money(vat.netTaxMinor), num: true, strong: true }], tone: 'net' },
          { cells: [{ text: pick({ en: 'Already settled', ar: 'المسدَّد' }) }, { text: '', num: true }, { text: money(vat.settledMinor), num: true }] },
          { cells: [{ text: pick({ en: 'Due to ZATCA', ar: 'المستحق للهيئة' }), strong: true }, { text: '', num: true }, { text: money(vat.dueMinor), num: true, strong: true }], tone: 'grand' },
        ],
      }],
      footnote: pick({
        en: 'Generated from the Jaz platform · output and input tax are split off every sale and purchase at the moment it is posted, so this return is a reading of the book rather than a separate calculation.',
        ar: 'صدر من منصة جاز · تُفصل ضريبة المخرجات والمدخلات عن كل عملية بيع وشراء لحظة ترحيلها، فهذا الإقرار قراءة للدفتر لا احتساب منفصل عنه.',
      }),
    }, { rtl: locale === 'ar' })
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Value added tax', ar: 'ضريبة القيمة المضافة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: `Tax collected on sales, less tax paid on purchases, at ${VAT_RATE}%. Both sides are already in the book — every sale and purchase splits its tax out when it posts — so filing is a reading, not a re-calculation.`,
            ar: `الضريبة المُحصّلة على المبيعات مطروحًا منها المدفوعة على المشتريات بنسبة ${VAT_RATE}٪. الجانبان مسجّلان أصلًا في الدفتر — كل بيع وشراء يفصل ضريبته وقت الترحيل — فالإقرار قراءة لا إعادة احتساب.`,
          })}</p>
        </div>
        <ExportBar onPdf={exportPdf} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <label className="flex items-center gap-sm">
          <span className="label">{pick({ en: 'Return period', ar: 'فترة الإقرار' })}</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input cursor-pointer w-auto py-1.5">
            {periods.map((p) => <option key={p.key} value={p.key}>{pick(p.label)}{p.closed ? ` · ${pick({ en: 'closed', ar: 'مقفلة' })}` : ''}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-xs">
          <button onClick={() => setConfirmFile(true)} disabled={!canFile} className={buttonClass('secondary', 'sm')}>
            <Send size={14} /> {pick({ en: 'File the return', ar: 'ترحيل الإقرار' })}
          </button>
          <button onClick={() => setConfirmPay(true)} disabled={!canPay} className={buttonClass('primary', 'sm')}>
            <HandCoins size={15} /> {pick({ en: 'Settle with ZATCA', ar: 'سداد الهيئة' })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Output tax', ar: 'ضريبة المخرجات' })} value={money(vat.outputTaxMinor, { withSymbol: false })} sub={`${pick({ en: 'On sales of', ar: 'على مبيعات' })} ${money(vat.salesBaseMinor, { withSymbol: false })}`} tone="dark" />
        <StatCard label={pick({ en: 'Input tax', ar: 'ضريبة المدخلات' })} value={money(vat.inputTaxMinor, { withSymbol: false })} sub={`${pick({ en: 'On purchases of', ar: 'على مشتريات' })} ${money(vat.purchaseBaseMinor, { withSymbol: false })}`} />
        <StatCard label={pick({ en: 'Net tax', ar: 'صافي الضريبة' })} value={money(vat.netTaxMinor, { withSymbol: false })} sub={pick(vat.netTaxMinor >= 0 ? { en: 'Payable', ar: 'مستحق الدفع' } : { en: 'Recoverable', ar: 'قابل للاسترداد' })} tone="gold" />
        <StatCard label={pick({ en: 'Still due', ar: 'المتبقي المستحق' })} value={money(vat.dueMinor, { withSymbol: false })} sub={`${pick({ en: 'Settled', ar: 'المسدَّد' })} ${money(vat.settledMinor, { withSymbol: false })}`} tone={vat.dueMinor > 0 ? 'plain' : 'green'} />
      </div>

      {/* the return itself, laid out the way the form reads */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
          <Receipt size={16} className="text-ink-subtle" />
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'The return', ar: 'نموذج الإقرار' })} · {periodName}</h4>
          <Pill color="#2e5f8a" bg="#e7f0f8">{VAT_RATE}%</Pill>
        </div>
        <table className="w-full border-collapse">
          <Head cols={[
            { label: { en: 'Box', ar: 'الخانة' } },
            { label: { en: 'Amount excluding VAT', ar: 'المبلغ غير شامل الضريبة' }, num: true },
            { label: { en: 'VAT', ar: 'الضريبة' }, num: true },
          ]} />
          <tbody>
            <tr className="border-b border-hairline">
              <td className="px-lg py-sm font-sans text-data text-ink-muted">{pick({ en: 'Standard-rated sales', ar: 'المبيعات الخاضعة بالنسبة الأساسية' })}</td>
              <td className="px-lg py-sm text-end"><Amount minor={vat.salesBaseMinor} tone="muted" /></td>
              <td className="px-lg py-sm text-end"><Amount minor={vat.outputTaxMinor} /></td>
            </tr>
            <tr className="border-b border-hairline">
              <td className="px-lg py-sm font-sans text-data text-ink-muted">{pick({ en: 'Standard-rated purchases', ar: 'المشتريات الخاضعة بالنسبة الأساسية' })}</td>
              <td className="px-lg py-sm text-end"><Amount minor={vat.purchaseBaseMinor} tone="muted" /></td>
              <td className="px-lg py-sm text-end"><Amount minor={vat.inputTaxMinor} /></td>
            </tr>
            <tr className="border-b border-hairline bg-surface-2/50">
              <td className="px-lg py-sm font-sans text-data text-ink font-medium">{pick({ en: 'Net tax for the period', ar: 'صافي ضريبة الفترة' })}</td>
              <td />
              <td className="px-lg py-sm text-end"><Amount minor={vat.netTaxMinor} dash={false} /></td>
            </tr>
            <tr className="border-b border-hairline">
              <td className="px-lg py-sm font-sans text-data text-ink-muted">{pick({ en: 'Already settled', ar: 'المسدَّد' })}</td>
              <td />
              <td className="px-lg py-sm text-end"><Amount minor={vat.settledMinor} tone="success" /></td>
            </tr>
            <tr className="bg-surface-2">
              <td className="px-lg py-md font-sans text-data text-ink font-medium">{pick({ en: 'Due to ZATCA', ar: 'المستحق لهيئة الزكاة والضريبة والجمارك' })}</td>
              <td />
              <td className="px-lg py-md text-end"><Amount minor={vat.dueMinor} tone="gold" dash={false} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* everything that touched the tax accounts, so a figure above can be traced */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Entries behind the return', ar: 'القيود خلف الإقرار' })}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <Head cols={[
              { label: { en: 'Voucher', ar: 'القيد' } },
              { label: { en: 'Source', ar: 'المصدر' } },
              { label: { en: 'Description', ar: 'البيان' } },
              { label: { en: 'Output tax', ar: 'ضريبة مخرجات' }, num: true },
              { label: { en: 'Input tax', ar: 'ضريبة مدخلات' }, num: true },
            ]} />
            <tbody>
              {vatEntries.length === 0 && (
                <EmptyRow span={5}>{pick({ en: 'No tax has been posted in this period.', ar: 'لم تُرحَّل ضريبة في هذه الفترة.' })}</EmptyRow>
              )}
              {vatEntries.map((e) => {
                const meta = journalSourceMeta[e.source]
                const output = e.lines.filter((l) => l.accountCode === ACC.vatOutput).reduce((s, l) => s + l.creditMinor - l.debitMinor, 0)
                const input = e.lines.filter((l) => l.accountCode === ACC.vatInput).reduce((s, l) => s + l.debitMinor - l.creditMinor, 0)
                return (
                  <tr key={e.id} className={cn('border-b border-hairline last:border-0', e.status === 'reversed' && 'opacity-60')}>
                    <td className="px-lg py-sm font-sans text-data text-ink tabular-nums">{e.no}<span className="block font-sans text-caption text-ink-subtle">{e.date}</span></td>
                    <td className="px-lg py-sm"><Pill color={meta.color} bg={meta.bg}>{pick(meta.label)}</Pill></td>
                    <td className="px-lg py-sm font-sans text-data text-ink-muted">{pick(e.memo)}</td>
                    <td className="px-lg py-sm text-end"><Amount minor={output} /></td>
                    <td className="px-lg py-sm text-end"><Amount minor={input} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmFile && (
        <ConfirmDialog
          open
          onClose={() => setConfirmFile(false)}
          onConfirm={file}
          title={pick({ en: 'File the return for this period?', ar: 'ترحيل إقرار هذه الفترة؟' })}
          message={pick({
            en: `Output tax of ${money(openOutput)} and input tax of ${money(openInput)} are cleared into a single balance owed to ZATCA of ${money(openOutput - openInput)}. The entry is posted like any other and can be reversed if the return is refiled.`,
            ar: `تُقفل ضريبة المخرجات ${money(openOutput)} وضريبة المدخلات ${money(openInput)} في رصيد واحد مستحق للهيئة قدره ${money(openOutput - openInput)}. يُرحَّل القيد كأي قيد آخر ويمكن عكسه إذا أُعيد تقديم الإقرار.`,
          })}
          confirmLabel={pick({ en: 'Yes, file it', ar: 'نعم، رحّل الإقرار' })}
        />
      )}
      {confirmPay && (
        <ConfirmDialog
          open
          onClose={() => setConfirmPay(false)}
          onConfirm={pay}
          title={pick({ en: 'Settle the tax due?', ar: 'سداد الضريبة المستحقة؟' })}
          message={pick({
            en: `${money(vat.dueMinor)} leaves the bank and clears the balance owed to ZATCA.`,
            ar: `يخرج مبلغ ${money(vat.dueMinor)} من البنك ويُصفّي الرصيد المستحق للهيئة.`,
          })}
          confirmLabel={pick({ en: 'Yes, settle it', ar: 'نعم، سدّد' })}
        />
      )}
    </div>
  )
}
