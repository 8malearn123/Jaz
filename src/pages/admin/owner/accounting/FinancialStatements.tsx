import { Fragment, useMemo, useState } from 'react'
import { TrendingUp, Landmark, Waves } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { downloadExcel } from '@/lib/excel'
import { openAccountingReportPdf, type ReportRow } from '@/lib/accountingPdf'
import type { Bilingual } from '@/data/types'
import { balanceSheet, cashFlow, filterEntries, incomeStatement, type StatementLine } from '@/lib/accounting'
import { useLedger } from '@/state/LedgerContext'
import { StatCard, SegTabs } from '../_shared'
import { Amount, BalanceBadge, ExportBar, sheetAmount, useIssuedOn } from './_bits'

export type StatementView = 'income' | 'balance' | 'cash'

/**
 * The three statements, all read from the same journal: what the period earned, what the
 * business is worth at the end of it, and where the cash actually went. Nothing here is
 * estimated or entered separately — change one entry and all three move together.
 */
export function FinancialStatements() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { accounts, entries, periods } = useLedger()
  const issuedOn = useIssuedOn()
  const [view, setView] = useState<StatementView>('income')
  const [upTo, setUpTo] = useState('all')

  const scoped = useMemo(
    () => filterEntries(entries, { toPeriod: upTo === 'all' ? undefined : upTo }),
    [entries, upTo],
  )
  const pnl = useMemo(() => incomeStatement(accounts, scoped), [accounts, scoped])
  const bs = useMemo(() => balanceSheet(accounts, scoped), [accounts, scoped])
  const cf = useMemo(() => cashFlow(accounts, scoped), [accounts, scoped])

  const asOf = upTo === 'all'
    ? pick({ en: 'All periods to date', ar: 'كل الفترات حتى تاريخه' })
    : pick(periods.find((p) => p.key === upTo)?.label ?? { en: upTo, ar: upTo })

  const viewMeta: Record<StatementView, { title: Bilingual; icon: typeof TrendingUp }> = {
    income: { title: { en: 'Income statement', ar: 'قائمة الدخل' }, icon: TrendingUp },
    balance: { title: { en: 'Balance sheet', ar: 'قائمة المركز المالي' }, icon: Landmark },
    cash: { title: { en: 'Cash flow', ar: 'قائمة التدفقات النقدية' }, icon: Waves },
  }

  const exportPdf = () => {
    const shared = {
      meta: [
        { label: pick({ en: 'Period', ar: 'الفترة' }), value: asOf },
        { label: pick({ en: 'Entries', ar: 'عدد القيود' }), value: String(scoped.length) },
        { label: pick({ en: 'Issued on', ar: 'تاريخ الإصدار' }), value: issuedOn },
      ],
      footnote: pick({
        en: 'Generated from the Jaz platform · every figure is the sum of posted journal entries and can be traced to the documents behind them.',
        ar: 'صدر من منصة جاز · كل رقم هنا حصيلة قيود مُرحّلة، ويمكن تتبعه حتى المستندات التي وراءه.',
      }),
    }
    const line = (label: string, amount: number, tone?: ReportRow['tone']): ReportRow =>
      ({ cells: [{ text: label, strong: tone != null }, { text: money(amount), num: true, strong: tone != null }], tone })

    if (view === 'income') {
      openAccountingReportPdf({
        title: pick(viewMeta.income.title), subtitle: `Jaz · ${asOf}`, ...shared,
        tables: [{
          head: [{ label: pick({ en: 'Item', ar: 'البند' }) }, { label: pick({ en: 'Amount', ar: 'المبلغ' }), num: true }],
          rows: [
            ...pnl.revenue.map((l) => line(`${l.code} · ${pick(l.label)}`, l.amountMinor)),
            ...(pnl.returnsMinor !== 0 ? [line(pick({ en: 'Less: returns & discounts', ar: 'يُخصم: المردودات والخصومات' }), -pnl.returnsMinor)] : []),
            line(pick({ en: 'Net revenue', ar: 'صافي الإيرادات' }), pnl.netRevenueMinor, 'net'),
            line(pick({ en: 'Cost of goods sold', ar: 'تكلفة البضاعة المباعة' }), -pnl.cogsMinor),
            line(pick({ en: 'Gross profit', ar: 'مجمل الربح' }), pnl.grossProfitMinor, 'net'),
            ...pnl.operatingExpenses.map((l) => line(`${l.code} · ${pick(l.label)}`, -l.amountMinor)),
            ...pnl.otherExpenses.map((l) => line(`${l.code} · ${pick(l.label)}`, -l.amountMinor)),
            line(pick({ en: 'Net profit for the period', ar: 'صافي ربح الفترة' }), pnl.netProfitMinor, 'grand'),
          ],
        }],
      }, { rtl: locale === 'ar' })
    } else if (view === 'balance') {
      openAccountingReportPdf({
        title: pick(viewMeta.balance.title), subtitle: `Jaz · ${asOf}`, ...shared,
        tables: [
          {
            caption: pick({ en: 'Assets', ar: 'الأصول' }),
            head: [{ label: pick({ en: 'Account', ar: 'الحساب' }) }, { label: pick({ en: 'Amount', ar: 'المبلغ' }), num: true }],
            rows: [
              ...bs.assets.lines.map((l) => line(`${l.code} · ${pick(l.label)}`, l.amountMinor)),
              line(pick({ en: 'Total assets', ar: 'إجمالي الأصول' }), bs.totalAssetsMinor, 'grand'),
            ],
          },
          {
            caption: pick({ en: 'Liabilities & equity', ar: 'الخصوم وحقوق الملكية' }),
            head: [{ label: pick({ en: 'Account', ar: 'الحساب' }) }, { label: pick({ en: 'Amount', ar: 'المبلغ' }), num: true }],
            rows: [
              ...bs.liabilities.lines.map((l) => line(`${l.code} · ${pick(l.label)}`, l.amountMinor)),
              line(pick({ en: 'Total liabilities', ar: 'إجمالي الخصوم' }), bs.liabilities.totalMinor, 'net'),
              ...bs.equity.lines.map((l) => line(`${l.code} · ${pick(l.label)}`, l.amountMinor)),
              line(pick({ en: 'Total equity', ar: 'إجمالي حقوق الملكية' }), bs.equity.totalMinor, 'net'),
              line(pick({ en: 'Total liabilities & equity', ar: 'إجمالي الخصوم وحقوق الملكية' }), bs.totalLiabilitiesAndEquityMinor, 'grand'),
            ],
          },
        ],
      }, { rtl: locale === 'ar' })
    } else {
      const activity = (key: 'operating' | 'investing' | 'financing', label: Bilingual, total: number) => ({
        caption: pick(label),
        head: [
          { label: pick({ en: 'Item', ar: 'البند' }) },
          { label: pick({ en: 'In', ar: 'وارد' }), num: true },
          { label: pick({ en: 'Out', ar: 'صادر' }), num: true },
        ],
        rows: [
          ...cf.lines.filter((l) => l.activity === key).map((l) => ({
            cells: [
              { text: pick(l.label) },
              { text: l.inMinor > 0 ? money(l.inMinor) : '', num: true },
              { text: l.outMinor > 0 ? money(l.outMinor) : '', num: true },
            ],
          })),
          { cells: [{ text: pick({ en: 'Net', ar: 'الصافي' }), strong: true }, { text: money(total), num: true, strong: true }, { text: '', num: true }], tone: 'net' as const },
        ],
        empty: pick({ en: 'No movement', ar: 'لا توجد حركة' }),
      })
      openAccountingReportPdf({
        title: pick(viewMeta.cash.title), subtitle: `Jaz · ${asOf}`, ...shared,
        tables: [
          activity('operating', { en: 'Operating activities', ar: 'الأنشطة التشغيلية' }, cf.operatingMinor),
          activity('investing', { en: 'Investing activities', ar: 'الأنشطة الاستثمارية' }, cf.investingMinor),
          activity('financing', { en: 'Financing activities', ar: 'الأنشطة التمويلية' }, cf.financingMinor),
          {
            head: [{ label: pick({ en: 'Item', ar: 'البند' }) }, { label: pick({ en: 'Amount', ar: 'المبلغ' }), num: true }],
            rows: [
              line(pick({ en: 'Net movement in cash', ar: 'صافي الحركة النقدية' }), cf.netMovementMinor, 'net'),
              line(pick({ en: 'Cash & equivalents at the end', ar: 'النقد وما في حكمه في النهاية' }), cf.closingCashMinor, 'grand'),
            ],
          },
        ],
      }, { rtl: locale === 'ar' })
    }
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  const exportExcel = () => {
    const header = [pick({ en: 'Item', ar: 'البند' }), pick({ en: 'Amount', ar: 'المبلغ' })]
    const rows: (string | number)[][] = view === 'income'
      ? [
        header,
        ...pnl.revenue.map((l) => [pick(l.label), sheetAmount(l.amountMinor)]),
        [pick({ en: 'Net revenue', ar: 'صافي الإيرادات' }), sheetAmount(pnl.netRevenueMinor)],
        [pick({ en: 'Cost of goods sold', ar: 'تكلفة البضاعة المباعة' }), sheetAmount(-pnl.cogsMinor)],
        [pick({ en: 'Gross profit', ar: 'مجمل الربح' }), sheetAmount(pnl.grossProfitMinor)],
        ...pnl.operatingExpenses.map((l) => [pick(l.label), sheetAmount(-l.amountMinor)]),
        ...pnl.otherExpenses.map((l) => [pick(l.label), sheetAmount(-l.amountMinor)]),
        [pick({ en: 'Net profit', ar: 'صافي الربح' }), sheetAmount(pnl.netProfitMinor)],
      ]
      : view === 'balance'
        ? [
          header,
          ...bs.assets.lines.map((l) => [pick(l.label), sheetAmount(l.amountMinor)]),
          [pick({ en: 'Total assets', ar: 'إجمالي الأصول' }), sheetAmount(bs.totalAssetsMinor)],
          ...bs.liabilities.lines.map((l) => [pick(l.label), sheetAmount(l.amountMinor)]),
          ...bs.equity.lines.map((l) => [pick(l.label), sheetAmount(l.amountMinor)]),
          [pick({ en: 'Total liabilities & equity', ar: 'إجمالي الخصوم وحقوق الملكية' }), sheetAmount(bs.totalLiabilitiesAndEquityMinor)],
        ]
        : [
          [pick({ en: 'Item', ar: 'البند' }), pick({ en: 'Activity', ar: 'النشاط' }), pick({ en: 'In', ar: 'وارد' }), pick({ en: 'Out', ar: 'صادر' })],
          ...cf.lines.map((l) => [pick(l.label), l.activity, sheetAmount(l.inMinor), sheetAmount(l.outMinor)]),
          [pick({ en: 'Closing cash', ar: 'النقد الختامي' }), '', sheetAmount(cf.closingCashMinor), 0],
        ]
    downloadExcel(`statement-${view}`, pick(viewMeta[view].title), rows)
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Financial statements', ar: 'القوائم المالية' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'What the period earned, what the business stands at, and where the cash moved — all three read from the same journal, so they can never tell three different stories.',
            ar: 'ما حققته الفترة، وما عليه المنشأة في نهايتها، وأين تحرّك النقد — ثلاثتها تُقرأ من الدفتر نفسه، فلا يمكن أن تروي ثلاث روايات مختلفة.',
          })}</p>
        </div>
        <ExportBar onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <SegTabs
          tabs={[
            { id: 'income' as const, label: pick(viewMeta.income.title) },
            { id: 'balance' as const, label: pick(viewMeta.balance.title) },
            { id: 'cash' as const, label: pick(viewMeta.cash.title) },
          ]}
          active={view}
          onChange={setView}
        />
        <label className="flex items-center gap-sm">
          <span className="label">{pick({ en: 'As at end of', ar: 'حتى نهاية' })}</span>
          <select value={upTo} onChange={(e) => setUpTo(e.target.value)} className="input cursor-pointer w-auto py-1.5">
            <option value="all">{pick({ en: 'Latest period', ar: 'أحدث فترة' })}</option>
            {periods.map((p) => <option key={p.key} value={p.key}>{pick(p.label)}</option>)}
          </select>
        </label>
      </div>

      {view === 'income' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
            <StatCard label={pick({ en: 'Net revenue', ar: 'صافي الإيرادات' })} value={money(pnl.netRevenueMinor, { withSymbol: false })} sub={asOf} tone="dark" />
            <StatCard label={pick({ en: 'Gross profit', ar: 'مجمل الربح' })} value={money(pnl.grossProfitMinor, { withSymbol: false })} sub={`${pnl.grossMarginPct}% ${pick({ en: 'margin', ar: 'هامش' })}`} tone="gold" />
            <StatCard label={pick({ en: 'Total expenses', ar: 'إجمالي التكاليف' })} value={money(pnl.totalExpensesMinor, { withSymbol: false })} sub={pick({ en: 'Cost, operating & other', ar: 'التكلفة والتشغيل وغيرها' })} />
            <StatCard label={pick({ en: 'Net profit', ar: 'صافي الربح' })} value={money(pnl.netProfitMinor, { withSymbol: false })} sub={`${pnl.netMarginPct}% ${pick({ en: 'of revenue', ar: 'من الإيراد' })}`} tone={pnl.netProfitMinor >= 0 ? 'green' : 'gold'} />
          </div>
          <IncomeTable pnl={pnl} />
        </>
      )}

      {view === 'balance' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-sm flex-1">
              <StatCard label={pick({ en: 'Total assets', ar: 'إجمالي الأصول' })} value={money(bs.totalAssetsMinor, { withSymbol: false })} sub={asOf} tone="dark" />
              <StatCard label={pick({ en: 'Total liabilities', ar: 'إجمالي الخصوم' })} value={money(bs.liabilities.totalMinor, { withSymbol: false })} sub={pick({ en: 'Owed to others', ar: 'مستحق للغير' })} />
              <StatCard label={pick({ en: 'Total equity', ar: 'حقوق الملكية' })} value={money(bs.equity.totalMinor, { withSymbol: false })} sub={pick({ en: 'Including the period result', ar: 'شاملة نتيجة الفترة' })} tone="gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <BalanceBadge
              balanced={bs.balanced}
              okLabel={{ en: 'Assets = liabilities + equity', ar: 'الأصول = الخصوم + حقوق الملكية' }}
              badLabel={{ en: 'The sheet does not balance', ar: 'القائمة غير متوازنة' }}
              differenceMinor={bs.differenceMinor}
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-md items-start">
            <StatementCard title={{ en: 'Assets', ar: 'الأصول' }} lines={bs.assets.lines} total={bs.totalAssetsMinor} totalLabel={{ en: 'Total assets', ar: 'إجمالي الأصول' }} />
            <div className="flex flex-col gap-md">
              <StatementCard title={{ en: 'Liabilities', ar: 'الخصوم' }} lines={bs.liabilities.lines} total={bs.liabilities.totalMinor} totalLabel={{ en: 'Total liabilities', ar: 'إجمالي الخصوم' }} />
              <StatementCard title={{ en: 'Equity', ar: 'حقوق الملكية' }} lines={bs.equity.lines} total={bs.equity.totalMinor} totalLabel={{ en: 'Total equity', ar: 'إجمالي حقوق الملكية' }} />
            </div>
          </div>
        </>
      )}

      {view === 'cash' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
            <StatCard label={pick({ en: 'Operating', ar: 'التشغيل' })} value={money(cf.operatingMinor, { withSymbol: false })} sub={pick({ en: 'From trading', ar: 'من النشاط' })} tone="dark" />
            <StatCard label={pick({ en: 'Investing', ar: 'الاستثمار' })} value={money(cf.investingMinor, { withSymbol: false })} sub={pick({ en: 'Assets bought & sold', ar: 'شراء وبيع الأصول' })} />
            <StatCard label={pick({ en: 'Financing', ar: 'التمويل' })} value={money(cf.financingMinor, { withSymbol: false })} sub={pick({ en: 'Capital movements', ar: 'حركة رأس المال' })} />
            <StatCard label={pick({ en: 'Cash on hand & at bank', ar: 'النقد والبنك' })} value={money(cf.closingCashMinor, { withSymbol: false })} sub={pick({ en: 'Closing position', ar: 'الرصيد الختامي' })} tone="green" />
          </div>
          <CashFlowTable cf={cf} />
        </>
      )}
    </div>
  )
}

/* ── the income statement, set the way one is read ── */
function IncomeTable({ pnl }: { pnl: ReturnType<typeof incomeStatement> }) {
  const { pick } = useLocale()
  return (
    <div className="card overflow-hidden">
      <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
        <TrendingUp size={16} className="text-ink-subtle" />
        <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Income statement', ar: 'قائمة الدخل' })}</h4>
      </div>
      <table className="w-full border-collapse">
        <tbody>
          {pnl.revenue.map((l) => <Row key={l.code} code={l.code} label={l.label} minor={l.amountMinor} />)}
          {pnl.returnsMinor !== 0 && <Row label={{ en: 'Less: returns & discounts', ar: 'يُخصم: المردودات والخصومات' }} minor={-pnl.returnsMinor} />}
          <Row label={{ en: 'Net revenue', ar: 'صافي الإيرادات' }} minor={pnl.netRevenueMinor} tone="sub" />
          <Row label={{ en: 'Cost of goods sold', ar: 'تكلفة البضاعة المباعة' }} minor={-pnl.cogsMinor} />
          <Row label={{ en: 'Gross profit', ar: 'مجمل الربح' }} minor={pnl.grossProfitMinor} tone="sub" />
          {pnl.operatingExpenses.length === 0 && (
            <tr className="border-b border-hairline">
              <td colSpan={2} className="px-lg py-sm font-sans text-caption text-ink-subtle">
                {pick({
                  en: 'No operating expenses have been posted for this period — salaries, rent and the like are entered from the journal when they fall due.',
                  ar: 'لم تُرحَّل مصروفات تشغيلية لهذه الفترة — الرواتب والإيجارات وما شابهها تُدخل من دفتر اليومية عند استحقاقها.',
                })}
              </td>
            </tr>
          )}
          {pnl.operatingExpenses.map((l) => <Row key={l.code} code={l.code} label={l.label} minor={-l.amountMinor} />)}
          {pnl.otherExpenses.map((l) => <Row key={l.code} code={l.code} label={l.label} minor={-l.amountMinor} />)}
          <Row label={{ en: 'Net profit for the period', ar: 'صافي ربح الفترة' }} minor={pnl.netProfitMinor} tone="grand" />
        </tbody>
      </table>
    </div>
  )
}

function Row({ code, label, minor, tone = 'plain' }: { code?: string; label: Bilingual; minor: number; tone?: 'plain' | 'sub' | 'grand' }) {
  const { pick } = useLocale()
  return (
    <tr className={cn('border-b border-hairline last:border-0', tone === 'sub' && 'bg-surface-2/50', tone === 'grand' && 'bg-surface-2')}>
      <td className={cn('px-lg py-sm font-sans text-data', tone === 'plain' ? 'text-ink-muted' : 'text-ink font-medium')}>
        {code && <span className="tabular-nums text-ink-subtle me-2">{code}</span>}
        {pick(label)}
      </td>
      <td className="px-lg py-sm text-end">
        <Amount minor={minor} tone={tone === 'grand' ? 'gold' : minor < 0 ? 'muted' : 'plain'} dash={false} />
      </td>
    </tr>
  )
}

/** One side of the balance sheet. */
function StatementCard({ title, lines, total, totalLabel }: { title: Bilingual; lines: StatementLine[]; total: number; totalLabel: Bilingual }) {
  const { pick } = useLocale()
  return (
    <div className="card overflow-hidden">
      <div className="px-lg py-md bg-surface-2 border-b border-hairline">
        <h4 className="font-serif text-card-title text-ink">{pick(title)}</h4>
      </div>
      <table className="w-full border-collapse">
        <tbody>
          {lines.length === 0 && (
            <tr><td className="px-lg py-md font-sans text-caption text-ink-subtle">{pick({ en: 'Nothing here yet.', ar: 'لا يوجد شيء هنا بعد.' })}</td></tr>
          )}
          {lines.map((l, i) => <Row key={`${l.code}-${i}`} code={l.code === '—' ? undefined : l.code} label={l.label} minor={l.amountMinor} />)}
          <Row label={totalLabel} minor={total} tone="grand" />
        </tbody>
      </table>
    </div>
  )
}

/* ── the cash flow, grouped by what the money was doing ── */
function CashFlowTable({ cf }: { cf: ReturnType<typeof cashFlow> }) {
  const { pick } = useLocale()
  const groups: { key: 'operating' | 'investing' | 'financing'; label: Bilingual; total: number }[] = [
    { key: 'operating', label: { en: 'Operating activities', ar: 'الأنشطة التشغيلية' }, total: cf.operatingMinor },
    { key: 'investing', label: { en: 'Investing activities', ar: 'الأنشطة الاستثمارية' }, total: cf.investingMinor },
    { key: 'financing', label: { en: 'Financing activities', ar: 'الأنشطة التمويلية' }, total: cf.financingMinor },
  ]
  return (
    <div className="card overflow-hidden">
      <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
        <Waves size={16} className="text-ink-subtle" />
        <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Cash flow', ar: 'التدفقات النقدية' })}</h4>
        <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Built from what actually moved through cash and bank', ar: 'مبنية على ما تحرّك فعلًا عبر الصندوق والبنك' })}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[620px]">
          <tbody>
            {groups.map((g) => {
              const lines = cf.lines.filter((l) => l.activity === g.key)
              return (
                <Fragment key={g.key}>
                  <tr className="bg-surface-2/60 border-b border-hairline">
                    <td colSpan={3} className="px-lg py-sm font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(g.label)}</td>
                  </tr>
                  {lines.length === 0 && (
                    <tr className="border-b border-hairline">
                      <td colSpan={3} className="px-lg py-sm font-sans text-caption text-ink-subtle">{pick({ en: 'No movement', ar: 'لا توجد حركة' })}</td>
                    </tr>
                  )}
                  {lines.map((l, i) => (
                    <tr key={`${g.key}-${i}`} className="border-b border-hairline">
                      <td className="px-lg py-sm font-sans text-data text-ink-muted">{pick(l.label)}</td>
                      <td className="px-lg py-sm text-end"><Amount minor={l.inMinor} tone="success" /></td>
                      <td className="px-lg py-sm text-end"><Amount minor={l.outMinor} tone="danger" /></td>
                    </tr>
                  ))}
                  <tr className="border-b border-hairline bg-surface-2/30">
                    <td className="px-lg py-sm font-sans text-data text-ink font-medium">{pick({ en: 'Net', ar: 'الصافي' })}</td>
                    <td colSpan={2} className="px-lg py-sm text-end"><Amount minor={g.total} tone="muted" dash={false} /></td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-2 border-t border-hairline-strong">
              <td className="px-lg py-md font-sans text-data text-ink font-medium">{pick({ en: 'Cash & equivalents at the end of the period', ar: 'النقد وما في حكمه في نهاية الفترة' })}</td>
              <td colSpan={2} className="px-lg py-md text-end"><Amount minor={cf.closingCashMinor} tone="gold" dash={false} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
