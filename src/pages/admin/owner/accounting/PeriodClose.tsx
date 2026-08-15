import { useMemo, useState } from 'react'
import { Lock, LockOpen, Check, AlertTriangle, Minus } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Bilingual } from '@/data/types'
import { ACC } from '@/data/coa'
import type { AccountingPeriod, JournalDraft } from '@/data/ledger'
import { closingLines, controlCheck, filterEntries, incomeStatement, trialBalance, vatReturn } from '@/lib/accounting'
import { payablesSubledgerMinor, receivablesSubledgerMinor } from '@/data/ledgerSeed'
import { useLedger } from '@/state/LedgerContext'
import { StatCard, Pill } from '../_shared'
import { LineTable } from './JournalPanel'

/**
 * Closing a period. Revenue and expense accounts are emptied into retained earnings, so the
 * period's profit becomes part of what the owners own, and the period stops accepting
 * postings altogether.
 *
 * Before that can be allowed to happen the book is checked: the trial balance must agree,
 * the control accounts must still match their subledgers, and the tax for the period must
 * have been filed. Each check is shown with its own figures — a close that is refused should
 * say exactly what is wrong, not merely that something is.
 */
export function PeriodClose() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { accounts, entries, periods, closePeriod, reopenPeriod } = useLedger()
  const [selected, setSelected] = useState(() => periods.find((p) => !p.closed)?.key ?? periods[0]?.key ?? '')
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState<AccountingPeriod | null>(null)

  const period = periods.find((p) => p.key === selected)
  const upTo = useMemo(() => filterEntries(entries, { toPeriod: selected }), [entries, selected])
  const inPeriod = useMemo(() => entries.filter((e) => e.period === selected), [entries, selected])

  const tb = useMemo(() => trialBalance(accounts, upTo), [accounts, upTo])
  const pnl = useMemo(() => incomeStatement(accounts, upTo), [accounts, upTo])
  const vat = useMemo(() => vatReturn(accounts, upTo), [accounts, upTo])
  const arCheck = useMemo(() => controlCheck(accounts, upTo, ACC.receivables, receivablesSubledgerMinor), [accounts, upTo])
  const apCheck = useMemo(() => controlCheck(accounts, upTo, ACC.payables, payablesSubledgerMinor), [accounts, upTo])

  const lines = useMemo(() => closingLines(accounts, upTo), [accounts, upTo])

  const checks: { label: Bilingual; detail: Bilingual; state: 'ok' | 'warn' | 'blocked' }[] = [
    {
      label: { en: 'The trial balance agrees', ar: 'ميزان المراجعة متوازن' },
      detail: {
        en: `Debits ${money(tb.totalDebitMinor)} · credits ${money(tb.totalCreditMinor)}`,
        ar: `المدين ${money(tb.totalDebitMinor)} · الدائن ${money(tb.totalCreditMinor)}`,
      },
      state: tb.balanced ? 'ok' : 'blocked',
    },
    {
      label: { en: 'Receivables match their subledger', ar: 'الذمم المدينة مطابقة لسجلها المساعد' },
      detail: {
        en: `Ledger ${money(arCheck.controlMinor)} · list ${money(arCheck.subledgerMinor)}`,
        ar: `الأستاذ ${money(arCheck.controlMinor)} · القائمة ${money(arCheck.subledgerMinor)}`,
      },
      state: arCheck.reconciled ? 'ok' : 'warn',
    },
    {
      label: { en: 'Payables match their subledger', ar: 'الذمم الدائنة مطابقة لسجلها المساعد' },
      detail: {
        en: `Ledger ${money(apCheck.controlMinor)} · list ${money(apCheck.subledgerMinor)}`,
        ar: `الأستاذ ${money(apCheck.controlMinor)} · القائمة ${money(apCheck.subledgerMinor)}`,
      },
      state: apCheck.reconciled ? 'ok' : 'warn',
    },
    {
      label: { en: 'VAT for the period has been filed', ar: 'ضريبة الفترة رُحّل إقرارها' },
      detail: vat.outputTaxMinor === 0 && vat.inputTaxMinor === 0
        ? { en: 'Nothing left in the tax accounts', ar: 'لم يبقَ شيء في حسابات الضريبة' }
        : { en: `${money(vat.netTaxMinor)} still sitting in the tax accounts`, ar: `${money(vat.netTaxMinor)} ما زال في حسابات الضريبة` },
      state: vat.outputTaxMinor === 0 && vat.inputTaxMinor === 0 ? 'ok' : 'warn',
    },
  ]

  const blocked = checks.some((c) => c.state === 'blocked')
  const canClose = period != null && !period.closed && lines.length > 0 && !blocked

  const closingDraft: JournalDraft | null = period && lines.length > 0
    ? {
      date: `${period.key}-28`,
      source: 'closing',
      sourceRef: `CLOSE-${period.key}`,
      memo: {
        en: `Closing entry for ${period.label.en}`,
        ar: `قيد إقفال ${period.label.ar}`,
      },
      lines,
    }
    : null

  const doClose = () => {
    if (!period || !closingDraft) return
    const r = closePeriod(period.key, closingDraft)
    if (r && !r.ok) {
      flash(pick(r.problems[0]))
      return
    }
    flash(pick({
      en: `${period.label.en} closed · profit of ${money(pnl.netProfitMinor)} carried to retained earnings`,
      ar: `أُقفلت فترة ${period.label.ar} · رُحّل ربح ${money(pnl.netProfitMinor)} إلى الأرباح المبقاة`,
    }))
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Period close', ar: 'إقفال الفترة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Closing empties the period’s revenue and expenses into retained earnings and stops the period accepting anything further. It is checked first — and every check shows its own figures, so a refusal says what is wrong rather than merely that something is.',
            ar: 'الإقفال يُفرِغ إيرادات الفترة ومصروفاتها في الأرباح المبقاة ويمنع أي ترحيل عليها بعد ذلك. ويسبقه فحص، وكل فحص يعرض أرقامه — فيقول الرفض ما الخطأ بالضبط لا مجرد وجوده.',
          })}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <label className="flex items-center gap-sm">
          <span className="label">{pick({ en: 'Period', ar: 'الفترة' })}</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input cursor-pointer w-auto py-1.5">
            {periods.map((p) => (
              <option key={p.key} value={p.key}>{pick(p.label)}{p.closed ? ` · ${pick({ en: 'closed', ar: 'مقفلة' })}` : ''}</option>
            ))}
          </select>
        </label>
        {period && (period.closed
          ? (
            <button onClick={() => setConfirmReopen(period)} className={buttonClass('secondary', 'sm')}>
              <LockOpen size={14} /> {pick({ en: 'Reopen the period', ar: 'إعادة فتح الفترة' })}
            </button>
          )
          : (
            <button onClick={() => setConfirmClose(true)} disabled={!canClose} className={buttonClass('primary', 'sm')}>
              <Lock size={15} /> {pick({ en: 'Close the period', ar: 'إقفال الفترة' })}
            </button>
          ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Entries in the period', ar: 'قيود الفترة' })} value={String(inPeriod.length)} sub={period ? pick(period.label) : '—'} tone="dark" />
        <StatCard label={pick({ en: 'Net revenue to date', ar: 'صافي الإيرادات حتى تاريخه' })} value={money(pnl.netRevenueMinor, { withSymbol: false })} sub={pick({ en: 'Cumulative', ar: 'تراكمي' })} />
        <StatCard label={pick({ en: 'Result to carry', ar: 'النتيجة المرحّلة' })} value={money(pnl.netProfitMinor, { withSymbol: false })} sub={pick(pnl.netProfitMinor >= 0 ? { en: 'Profit to retained earnings', ar: 'ربح إلى الأرباح المبقاة' } : { en: 'Loss against retained earnings', ar: 'خسارة من الأرباح المبقاة' })} tone="gold" />
        <StatCard label={pick({ en: 'Status', ar: 'الحالة' })} value={pick(period?.closed ? { en: 'Closed', ar: 'مقفلة' } : { en: 'Open', ar: 'مفتوحة' })} sub={period?.closedBy ? pick(period.closedBy) : pick({ en: 'Accepting postings', ar: 'تقبل الترحيل' })} tone={period?.closed ? 'green' : 'plain'} />
      </div>

      {/* the checks */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Before closing', ar: 'قبل الإقفال' })}</h4>
        </div>
        <ul className="divide-y divide-hairline">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-sm px-lg py-md">
              <span className={cn(
                'grid place-items-center w-7 h-7 rounded-md shrink-0',
                c.state === 'ok' && 'text-success bg-success/10',
                c.state === 'warn' && 'text-primary-hover bg-primary/10',
                c.state === 'blocked' && 'text-danger bg-danger/10',
              )}>
                {c.state === 'ok' ? <Check size={15} /> : c.state === 'warn' ? <Minus size={15} /> : <AlertTriangle size={15} />}
              </span>
              <div className="min-w-0">
                <p className="font-sans text-data text-ink">{pick(c.label)}</p>
                <p className="font-sans text-caption text-ink-subtle mt-xxs tabular-nums">{pick(c.detail)}</p>
              </div>
              {c.state !== 'ok' && (
                <span className="ms-auto">
                  <Pill color={c.state === 'blocked' ? '#b5403b' : '#8a6b3f'} bg={c.state === 'blocked' ? '#faeceb' : '#f6edde'}>
                    {pick(c.state === 'blocked' ? { en: 'Blocks the close', ar: 'يمنع الإقفال' } : { en: 'Worth reviewing', ar: 'يستحق المراجعة' })}
                  </Pill>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* the closing entry, shown in full before it is posted */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex flex-wrap items-center justify-between gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'The closing entry', ar: 'قيد الإقفال' })}</h4>
          <span className="font-sans text-caption text-ink-subtle">
            {lines.length > 0
              ? pick({ en: 'Exactly what will be posted', ar: 'ما سيُرحَّل بالضبط' })
              : pick({ en: 'Nothing to close — no revenue or expense is open', ar: 'لا شيء للإقفال — لا إيراد ولا مصروف مفتوح' })}
          </span>
        </div>
        <div className="p-lg">
          {lines.length > 0
            ? <LineTable lines={lines} />
            : (
              <p className="font-sans text-data text-ink-subtle">
                {pick({ en: 'Every revenue and expense account already stands at nil for this period.', ar: 'كل حسابات الإيرادات والمصروفات مصفّرة بالفعل لهذه الفترة.' })}
              </p>
            )}
          {lines.length > 0 && (
            <p className="font-sans text-caption text-ink-subtle mt-sm">
              {pick({
                en: 'Each revenue and expense account is posted flat into the income summary, and the summary is emptied into retained earnings — after which the income statement for this period reads nil, which is what a closed period means.',
                ar: 'يُقفل كل حساب إيراد ومصروف في ملخص الدخل، ثم يُفرَّغ الملخص في الأرباح المبقاة — فتقرأ قائمة دخل هذه الفترة صفرًا، وهذا هو معنى إقفال الفترة.',
              })}
            </p>
          )}
        </div>
      </div>

      {/* the periods themselves */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Periods', ar: 'الفترات' })}</h4>
        </div>
        <ul className="divide-y divide-hairline">
          {periods.map((p) => {
            const count = entries.filter((e) => e.period === p.key).length
            return (
              <li key={p.key} className="flex flex-wrap items-center justify-between gap-sm px-lg py-md">
                <div className="flex items-center gap-sm">
                  <span className="font-sans text-data text-ink tabular-nums">{p.key}</span>
                  <span className="font-sans text-data text-ink-muted">{pick(p.label)}</span>
                  {p.closed
                    ? <Pill color="#2f7d5b" bg="#e6f2ea"><Lock size={11} /> {pick({ en: 'Closed', ar: 'مقفلة' })}</Pill>
                    : <Pill color="#8a6b3f" bg="#f6edde"><LockOpen size={11} /> {pick({ en: 'Open', ar: 'مفتوحة' })}</Pill>}
                </div>
                <span className="font-sans text-caption text-ink-subtle">
                  {count} {pick({ en: 'entries', ar: 'قيد' })}
                  {p.closedBy && <> · {pick({ en: 'closed by', ar: 'أقفلها' })} {pick(p.closedBy)}</>}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {confirmClose && period && (
        <ConfirmDialog
          open
          onClose={() => setConfirmClose(false)}
          onConfirm={doClose}
          title={pick({ en: 'Close this period?', ar: 'إقفال هذه الفترة؟' })}
          message={pick({
            en: `${period.label.en} stops accepting postings, and ${money(Math.abs(pnl.netProfitMinor))} ${pnl.netProfitMinor >= 0 ? 'of profit is carried to' : 'of loss is charged against'} retained earnings. It can be reopened, but only deliberately.`,
            ar: `تتوقف فترة ${period.label.ar} عن قبول أي ترحيل، ويُرحَّل ${money(Math.abs(pnl.netProfitMinor))} ${pnl.netProfitMinor >= 0 ? 'ربحًا إلى' : 'خسارة على'} الأرباح المبقاة. ويمكن إعادة فتحها، لكن بقرار صريح.`,
          })}
          confirmLabel={pick({ en: 'Yes, close it', ar: 'نعم، أقفلها' })}
        />
      )}
      {confirmReopen && (
        <ConfirmDialog
          open
          onClose={() => setConfirmReopen(null)}
          onConfirm={() => {
            reopenPeriod(confirmReopen.key)
            flash(pick({ en: `${confirmReopen.label.en} reopened`, ar: `أُعيد فتح فترة ${confirmReopen.label.ar}` }))
          }}
          title={pick({ en: 'Reopen this period?', ar: 'إعادة فتح هذه الفترة؟' })}
          message={pick({
            en: `${confirmReopen.label.en} will accept postings again. Its closing entry stays in the book — reverse it from the journal if the period is to be closed again on different figures.`,
            ar: `ستقبل فترة ${confirmReopen.label.ar} الترحيل من جديد. ويبقى قيد إقفالها في الدفتر — اعكسه من دفتر اليومية إذا أُريد إقفالها مجددًا بأرقام مختلفة.`,
          })}
          confirmLabel={pick({ en: 'Yes, reopen it', ar: 'نعم، أعد فتحها' })}
        />
      )}
    </div>
  )
}
