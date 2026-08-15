import { useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { downloadExcel } from '@/lib/excel'
import { openAccountingReportPdf } from '@/lib/accountingPdf'
import { journalSourceMeta } from '@/data/ledger'
import { balanceOf, filterEntries, ledgerRows, movementOf } from '@/lib/accounting'
import { useLedger } from '@/state/LedgerContext'
import { useCostCenters } from '@/state/CostCenterContext'
import { StatCard, Pill } from '../_shared'
import { Amount, EmptyRow, ExportBar, Head, sheetAmount, useIssuedOn } from './_bits'

/**
 * The general ledger: one account at a time, in date order, with the balance carried
 * down the page. Every row names the entry it came from and the document behind it, so a
 * figure on a statement can always be walked back to the thing that caused it.
 */
export function GeneralLedger() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { accounts, postableAccounts, entries, periods, accountOf } = useLedger()
  const { centerOf } = useCostCenters()
  const issuedOn = useIssuedOn()

  // Accounts that carry movement come first — the ledger is almost always opened for one of those.
  const options = useMemo(() => {
    const withMovement = postableAccounts.filter((a) => movementOf(entries, a.code).debitMinor + movementOf(entries, a.code).creditMinor > 0)
    const rest = postableAccounts.filter((a) => !withMovement.includes(a))
    return { withMovement, rest }
  }, [postableAccounts, entries])

  const [code, setCode] = useState(options.withMovement[0]?.code ?? postableAccounts[0]?.code ?? '')
  const [fromPeriod, setFromPeriod] = useState('all')
  const [toPeriod, setToPeriod] = useState('all')

  const account = accountOf(code)
  const inRange = useMemo(
    () => filterEntries(entries, {
      fromPeriod: fromPeriod === 'all' ? undefined : fromPeriod,
      toPeriod: toPeriod === 'all' ? undefined : toPeriod,
      accountCode: code,
    }),
    [entries, fromPeriod, toPeriod, code],
  )

  // What the account already stood at before the window opened.
  const openingMinor = useMemo(() => {
    if (fromPeriod === 'all') return 0
    return balanceOf(accounts, entries.filter((e) => e.period < fromPeriod), code)
  }, [accounts, entries, fromPeriod, code])

  const rows = useMemo(() => ledgerRows(accounts, inRange, code), [accounts, inRange, code])
  const movement = useMemo(() => movementOf(inRange, code), [inRange, code])
  const closingMinor = openingMinor + (account?.normal === 'credit'
    ? movement.creditMinor - movement.debitMinor
    : movement.debitMinor - movement.creditMinor)

  const title = account ? `${account.code} · ${pick(account.name)}` : ''
  const rangeLabel = fromPeriod === 'all' && toPeriod === 'all'
    ? pick({ en: 'Since the book opened', ar: 'منذ افتتاح الدفتر' })
    : `${fromPeriod === 'all' ? pick({ en: 'Start', ar: 'البداية' }) : fromPeriod} → ${toPeriod === 'all' ? pick({ en: 'Latest', ar: 'الأحدث' }) : toPeriod}`

  const exportPdf = () => {
    if (!account) return
    openAccountingReportPdf({
      title: pick({ en: 'Account ledger', ar: 'كشف حساب الأستاذ' }),
      subtitle: `Jaz · ${title}`,
      meta: [
        { label: pick({ en: 'Account', ar: 'الحساب' }), value: title },
        { label: pick({ en: 'Period', ar: 'الفترة' }), value: rangeLabel },
        { label: pick({ en: 'Opening balance', ar: 'الرصيد الافتتاحي' }), value: money(openingMinor) },
        { label: pick({ en: 'Movements', ar: 'عدد الحركات' }), value: String(rows.length) },
        { label: pick({ en: 'Closing balance', ar: 'الرصيد الختامي' }), value: money(closingMinor) },
        { label: pick({ en: 'Issued on', ar: 'تاريخ الإصدار' }), value: issuedOn },
      ],
      tables: [{
        head: [
          { label: pick({ en: 'Date', ar: 'التاريخ' }) },
          { label: pick({ en: 'Voucher', ar: 'القيد' }) },
          { label: pick({ en: 'Description', ar: 'البيان' }) },
          { label: pick({ en: 'Debit', ar: 'مدين' }), num: true },
          { label: pick({ en: 'Credit', ar: 'دائن' }), num: true },
          { label: pick({ en: 'Balance', ar: 'الرصيد' }), num: true },
        ],
        empty: pick({ en: 'No movement on this account in the period', ar: 'لا توجد حركة على هذا الحساب في الفترة' }),
        rows: [
          {
            cells: [
              { text: '' }, { text: '' },
              { text: pick({ en: 'Opening balance', ar: 'الرصيد الافتتاحي' }), strong: true },
              { text: '', num: true }, { text: '', num: true },
              { text: money(openingMinor), num: true, strong: true },
            ],
            tone: 'net' as const,
          },
          ...rows.map((r) => ({
            cells: [
              { text: r.entry.date },
              { text: r.entry.no },
              { text: pick(r.entry.memo), sub: r.entry.sourceRef },
              { text: r.debitMinor > 0 ? money(r.debitMinor) : '', num: true },
              { text: r.creditMinor > 0 ? money(r.creditMinor) : '', num: true },
              { text: money(openingMinor + r.balanceMinor), num: true },
            ],
          })),
          {
            cells: [
              { text: '' }, { text: '' },
              { text: pick({ en: 'Closing balance', ar: 'الرصيد الختامي' }), strong: true },
              { text: money(movement.debitMinor), num: true, strong: true },
              { text: money(movement.creditMinor), num: true, strong: true },
              { text: money(closingMinor), num: true, strong: true },
            ],
            tone: 'grand' as const,
          },
        ],
      }],
      footnote: pick({
        en: 'Generated from the Jaz platform · a posted entry is never edited; corrections appear as their own reversing entries.',
        ar: 'صدر من منصة جاز · لا يُعدّل القيد المُرحّل، وتظهر التصحيحات كقيود عكسية مستقلة.',
      }),
    }, { rtl: locale === 'ar' })
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  const exportExcel = () => {
    if (!account) return
    downloadExcel(
      `ledger-${account.code}`,
      pick({ en: 'Ledger', ar: 'الأستاذ' }),
      [
        [pick({ en: 'Date', ar: 'التاريخ' }), pick({ en: 'Voucher', ar: 'القيد' }), pick({ en: 'Description', ar: 'البيان' }), pick({ en: 'Document', ar: 'المستند' }), pick({ en: 'Debit', ar: 'مدين' }), pick({ en: 'Credit', ar: 'دائن' }), pick({ en: 'Balance', ar: 'الرصيد' })],
        ['', '', pick({ en: 'Opening balance', ar: 'الرصيد الافتتاحي' }), '', 0, 0, sheetAmount(openingMinor)],
        ...rows.map((r) => [
          r.entry.date, r.entry.no, pick(r.entry.memo), r.entry.sourceRef ?? '',
          sheetAmount(r.debitMinor), sheetAmount(r.creditMinor), sheetAmount(openingMinor + r.balanceMinor),
        ]),
        ['', '', pick({ en: 'Closing balance', ar: 'الرصيد الختامي' }), '', sheetAmount(movement.debitMinor), sheetAmount(movement.creditMinor), sheetAmount(closingMinor)],
      ],
    )
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'General ledger', ar: 'الأستاذ العام' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'One account, every movement against it, and the balance after each one — with the entry and the document that caused it named on the row.',
            ar: 'حساب واحد وكل حركة عليه والرصيد بعد كل حركة — ومعها القيد والمستند الذي سبّبها في السطر نفسه.',
          })}</p>
        </div>
        <ExportBar onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="card p-lg grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-xs sm:col-span-2 lg:col-span-1"><span className="label">{pick({ en: 'Account', ar: 'الحساب' })}</span>
          <select value={code} onChange={(e) => setCode(e.target.value)} className="input cursor-pointer">
            {options.withMovement.length > 0 && (
              <optgroup label={pick({ en: 'With movement', ar: 'عليها حركة' })}>
                {options.withMovement.map((a) => <option key={a.code} value={a.code}>{a.code} · {pick(a.name)}</option>)}
              </optgroup>
            )}
            {options.rest.length > 0 && (
              <optgroup label={pick({ en: 'No movement yet', ar: 'بلا حركة بعد' })}>
                {options.rest.map((a) => <option key={a.code} value={a.code}>{a.code} · {pick(a.name)}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'From period', ar: 'من فترة' })}</span>
          <select value={fromPeriod} onChange={(e) => setFromPeriod(e.target.value)} className="input cursor-pointer">
            <option value="all">{pick({ en: 'Since the book opened', ar: 'منذ افتتاح الدفتر' })}</option>
            {periods.map((p) => <option key={p.key} value={p.key}>{pick(p.label)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'To period', ar: 'إلى فترة' })}</span>
          <select value={toPeriod} onChange={(e) => setToPeriod(e.target.value)} className="input cursor-pointer">
            <option value="all">{pick({ en: 'Latest', ar: 'الأحدث' })}</option>
            {periods.map((p) => <option key={p.key} value={p.key}>{pick(p.label)}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Opening balance', ar: 'الرصيد الافتتاحي' })} value={money(openingMinor, { withSymbol: false })} sub={rangeLabel} />
        <StatCard label={pick({ en: 'Total debits', ar: 'إجمالي المدين' })} value={money(movement.debitMinor, { withSymbol: false })} sub={`${rows.filter((r) => r.debitMinor > 0).length} ${pick({ en: 'movements', ar: 'حركة' })}`} />
        <StatCard label={pick({ en: 'Total credits', ar: 'إجمالي الدائن' })} value={money(movement.creditMinor, { withSymbol: false })} sub={`${rows.filter((r) => r.creditMinor > 0).length} ${pick({ en: 'movements', ar: 'حركة' })}`} />
        <StatCard label={pick({ en: 'Closing balance', ar: 'الرصيد الختامي' })} value={money(closingMinor, { withSymbol: false })} sub={pick(account?.normal === 'credit' ? { en: 'Credit balance', ar: 'رصيد دائن' } : { en: 'Debit balance', ar: 'رصيد مدين' })} tone="gold" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex flex-wrap items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <BookOpen size={16} className="text-ink-subtle" />
            <h4 className="font-serif text-card-title text-ink">{title}</h4>
            {account?.isControl && <Pill color="#2e5f8a" bg="#e7f0f8">{pick({ en: 'Control account', ar: 'حساب مراقبة' })}</Pill>}
          </div>
          <span className="font-sans text-caption text-ink-subtle">{rangeLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[880px]">
            <Head cols={[
              { label: { en: 'Date', ar: 'التاريخ' } },
              { label: { en: 'Voucher', ar: 'القيد' } },
              { label: { en: 'Description', ar: 'البيان' } },
              { label: { en: 'Cost centre', ar: 'مركز التكلفة' } },
              { label: { en: 'Debit', ar: 'مدين' }, num: true },
              { label: { en: 'Credit', ar: 'دائن' }, num: true },
              { label: { en: 'Balance', ar: 'الرصيد' }, num: true },
            ]} />
            <tbody>
              <tr className="border-b border-hairline bg-surface-2/40">
                <td colSpan={4} className="px-lg py-sm font-sans text-caption uppercase tracking-wide text-ink-subtle">
                  {pick({ en: 'Opening balance', ar: 'الرصيد الافتتاحي' })}
                </td>
                <td /><td />
                <td className="px-lg py-sm text-end"><Amount minor={openingMinor} tone="muted" dash={false} /></td>
              </tr>
              {rows.length === 0 && (
                <EmptyRow span={7}>
                  {pick({ en: 'Nothing has been posted to this account in the period.', ar: 'لم يُرحَّل شيء على هذا الحساب في الفترة.' })}
                </EmptyRow>
              )}
              {rows.map((r, i) => {
                const meta = journalSourceMeta[r.entry.source]
                const cc = r.line.centerId ? centerOf(r.line.centerId) : undefined
                return (
                  <tr key={`${r.entry.id}-${i}`} className={cn('border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors', r.entry.status === 'reversed' && 'opacity-60')}>
                    <td className="px-lg py-sm font-sans text-caption text-ink-muted tabular-nums whitespace-nowrap">{r.entry.date}</td>
                    <td className="px-lg py-sm">
                      <span className="font-sans text-data text-ink tabular-nums">{r.entry.no}</span>
                      <span className="block mt-xxs"><Pill color={meta.color} bg={meta.bg}>{pick(meta.label)}</Pill></span>
                    </td>
                    <td className="px-lg py-sm">
                      <span className="font-sans text-data text-ink">{pick(r.entry.memo)}</span>
                      {r.entry.sourceRef && <span className="block font-sans text-caption text-ink-subtle tabular-nums">{r.entry.sourceRef}</span>}
                    </td>
                    <td className="px-lg py-sm font-sans text-caption text-ink-muted">{cc ? cc.code : '—'}</td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.debitMinor} /></td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.creditMinor} /></td>
                    <td className="px-lg py-sm text-end"><Amount minor={openingMinor + r.balanceMinor} tone="muted" dash={false} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
          <span className="font-sans text-caption text-ink-muted">{rows.length} {pick({ en: 'movements', ar: 'حركة' })}</span>
          <span className="font-sans text-caption text-ink-muted tabular-nums">
            {pick({ en: 'Closing balance', ar: 'الرصيد الختامي' })} <Amount minor={closingMinor} tone="gold" dash={false} />
          </span>
        </div>
      </div>
    </div>
  )
}
