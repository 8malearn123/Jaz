import { useState } from 'react'
import { Download, TrendingUp, ShieldCheck, FileText, CheckCircle2, Building2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { organization, availableCreditMinor } from '@/data/organization'
import type { CreditLedgerEntry } from '@/data/types'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { cn } from '@/lib/cn'

export function AccountPage() {
  const { t, pick, money, locale } = useLocale()
  const { channel, setChannel } = useChannel()
  const org = organization
  const available = availableCreditMinor(org)

  const termLabel: Record<string, { en: string; ar: string }> = {
    net_15: { en: 'Net 15', ar: 'صافي ١٥' },
    net_30: { en: 'Net 30', ar: 'صافي ٣٠' },
    net_60: { en: 'Net 60', ar: 'صافي ٦٠' },
    prepaid: { en: 'Prepaid', ar: 'مسبق' },
  }
  const riskLabel: Record<string, { en: string; ar: string }> = {
    low: { en: 'Low', ar: 'منخفض' },
    medium: { en: 'Medium', ar: 'متوسط' },
    high: { en: 'High', ar: 'مرتفع' },
  }

  const usedPct = (n: number) => `${Math.min(100, (n / org.credit.limitMinor) * 100)}%`

  return (
    <>
      {/* header */}
      <section className="bg-canvas-dark text-ink-on-dark">
        <div className="container-jaz pt-xxl pb-xl">
          <Eyebrow tone="on-dark">{t('nav.business')}</Eyebrow>
          <div className="mt-md flex flex-col lg:flex-row lg:items-end justify-between gap-lg">
            <div className="flex items-start gap-md">
              <span className="grid place-items-center w-14 h-14 rounded-lg bg-surface-dark-1 border border-hairline-dark text-primary-bright shrink-0">
                <Building2 size={26} />
              </span>
              <div className="flex flex-col gap-xs">
                <h1 className="font-serif text-display-md text-ink-on-dark leading-tight">{pick(org.legalName)}</h1>
                <div className="flex flex-wrap items-center gap-x-md gap-y-xs font-sans text-caption text-ink-on-dark-muted">
                  <span className="inline-flex items-center gap-xs">
                    <StatusBadge variant="gold">{org.tier.toUpperCase()}</StatusBadge>
                    {pick(org.accountType)}
                  </span>
                  <span>CR {org.crNumber}</span>
                  <span>VAT {org.vatNumber}</span>
                </div>
              </div>
            </div>

            {/* channel toggle */}
            <div className="flex flex-col gap-xs">
              <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-on-dark-muted">
                {pick({ en: 'Store pricing mode', ar: 'وضع تسعير المتجر' })}
              </span>
              <div className="inline-flex p-1 rounded-md bg-surface-dark-1 border border-hairline-dark">
                {(['b2c', 'b2b'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={cn(
                      'px-4 py-2 rounded-sm font-sans text-button uppercase transition-all',
                      channel === c ? 'bg-primary text-on-primary' : 'text-ink-on-dark-muted hover:text-ink-on-dark',
                    )}
                  >
                    {c === 'b2c' ? t('checkout.b2c') : t('checkout.b2b')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <WaveDivider tone="gold" height={18} />
      </section>

      <section className="container-jaz py-xl flex flex-col gap-xl">
        {/* credit overview */}
        <div>
          <div className="flex items-center justify-between mb-md">
            <h2 className="font-serif text-headline text-ink">{t('credit.title')}</h2>
            <span className="font-sans text-caption text-ink-subtle">
              {pick({ en: 'Account manager', ar: 'مدير الحساب' })}: <span className="text-ink-muted">{pick(org.salesRep)}</span>
            </span>
          </div>

          <div className="grid gap-md md:grid-cols-4">
            <StatCard label={t('credit.limit')} value={money(org.credit.limitMinor)} tone="ink" />
            <StatCard label={t('credit.available')} value={money(available)} tone="gold" emphasis />
            <StatCard label={t('credit.reserved')} value={money(org.credit.reservedMinor)} tone="ink" />
            <StatCard label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
          </div>

          {/* meter + meta */}
          <div className="mt-md card p-lg flex flex-col gap-md">
            <div className="h-3 rounded-pill bg-canvas-cool overflow-hidden flex">
              <span className="h-full bg-danger/70" style={{ width: usedPct(org.credit.outstandingMinor) }} />
              <span className="h-full bg-primary/70" style={{ width: usedPct(org.credit.reservedMinor) }} />
              <span className="h-full bg-success/60" style={{ width: usedPct(available) }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-md">
              <div className="flex flex-wrap gap-x-lg gap-y-xs font-sans text-caption">
                <Legend c="#b5403b" label={`${t('credit.outstanding')} · ${money(org.credit.outstandingMinor)}`} />
                <Legend c="#b08a57" label={`${t('credit.reserved')} · ${money(org.credit.reservedMinor)}`} />
                <Legend c="#355c4b" label={`${t('credit.available')} · ${money(available)}`} />
              </div>
              <div className="flex flex-wrap items-center gap-md font-sans text-caption text-ink-muted">
                <span className="inline-flex items-center gap-xs">
                  <FileText size={14} className="text-ink-subtle" />
                  {t('credit.terms')}: <strong className="text-ink">{pick(termLabel[org.credit.paymentTerms])}</strong>
                </span>
                <span className="inline-flex items-center gap-xs">
                  <ShieldCheck size={14} className="text-success" />
                  {t('credit.riskRating')}: <strong className="text-ink">{pick(riskLabel[org.credit.riskRating])}</strong>
                </span>
                <span className="inline-flex items-center gap-xs">
                  <TrendingUp size={14} className="text-ink-subtle" />
                  {t('credit.nextReview')}:{' '}
                  <strong className="text-ink">
                    {new Date(org.credit.nextReview).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </strong>
                </span>
              </div>
            </div>
            <LimitIncrease />
          </div>
        </div>

        {/* ledger + statements */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-xl items-start">
          <Ledger entries={org.ledger} />
          <Statements />
        </div>
      </section>
    </>
  )
}

function StatCard({ label, value, tone, emphasis }: { label: string; value: string; tone: 'ink' | 'gold' | 'danger'; emphasis?: boolean }) {
  const { locale } = useLocale()
  const color = tone === 'gold' ? 'text-primary-hover' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', emphasis && 'ring-1 ring-primary/30 bg-primary/[0.04]')}>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', color)} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {value}
      </span>
    </div>
  )
}

function Legend({ c, label }: { c: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-xs text-ink-muted">
      <span className="inline-block w-2.5 h-2.5 rounded-pill" style={{ backgroundColor: c }} />
      {label}
    </span>
  )
}

function Ledger({ entries }: { entries: CreditLedgerEntry[] }) {
  const { t, pick, money, locale } = useLocale()
  const typeLabel: Record<CreditLedgerEntry['type'], { en: string; ar: string }> = {
    reservation: { en: 'Reservation', ar: 'حجز' },
    release: { en: 'Release', ar: 'تحرير' },
    charge: { en: 'Charge', ar: 'استحقاق' },
    payment: { en: 'Payment', ar: 'سداد' },
    adjustment: { en: 'Adjustment', ar: 'تسوية' },
  }
  const isCredit = (e: CreditLedgerEntry) => e.type === 'payment' || e.type === 'release'

  return (
    <div className="card overflow-hidden">
      <div className="bg-surface-2 px-lg py-md border-b border-hairline flex items-center justify-between">
        <h3 className="font-serif text-card-title text-ink">{t('credit.ledger')}</h3>
        <StatusBadge variant="neutral">{pick({ en: 'Append-only', ar: 'إضافة فقط' })}</StatusBadge>
      </div>
      <ul className="divide-y divide-hairline">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-md px-lg py-md">
            <span
              className={cn(
                'grid place-items-center w-9 h-9 rounded-pill shrink-0',
                isCredit(e) ? 'bg-success/12 text-success' : 'bg-primary/12 text-primary-hover',
              )}
            >
              {isCredit(e) ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-data text-ink truncate">{pick(e.reference)}</p>
              <p className="font-sans text-caption text-ink-subtle">
                {pick(typeLabel[e.type])} ·{' '}
                {new Date(e.occurredAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="text-end shrink-0">
              <p className={cn('font-sans text-data tabular-nums', isCredit(e) ? 'text-success' : 'text-ink')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                {isCredit(e) ? '−' : '+'}
                {money(e.amountMinor, { withSymbol: false })}
              </p>
              <p className="font-sans text-caption text-ink-subtle tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                {money(e.balanceAfterMinor)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Statements() {
  const { t, pick, money, locale } = useLocale()
  return (
    <div className="card overflow-hidden">
      <div className="bg-surface-2 px-lg py-md border-b border-hairline">
        <h3 className="font-serif text-card-title text-ink">{t('credit.statements')}</h3>
      </div>
      <ul className="divide-y divide-hairline">
        {organization.statements.map((s) => (
          <li key={s.id} className="px-lg py-md flex items-center justify-between gap-md">
            <div className="flex flex-col gap-xxs min-w-0">
              <span className="font-serif text-body text-ink">{pick(s.period)}</span>
              <span className="font-sans text-caption text-ink-subtle tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                {pick({ en: 'Closing', ar: 'الختامي' })} {money(s.closingMinor)}
              </span>
            </div>
            <button
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink transition-colors"
            >
              <Download size={15} /> PDF
            </button>
          </li>
        ))}
      </ul>
      <div className="px-lg py-md border-t border-hairline">
        <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'ZATCA-compliant · bilingual', ar: 'معتمدة من هيئة الزكاة · بلغتين' })}</span>
      </div>
    </div>
  )
}

function LimitIncrease() {
  const { t, money, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [amount, setAmount] = useState(20000000)
  const [justification, setJustification] = useState('')

  if (sent) {
    return (
      <div className="rounded-md bg-success/8 border border-success/25 p-md flex items-start gap-sm">
        <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
        <div>
          <p className="font-sans text-data font-medium text-ink">{t('credit.app.submitted')}</p>
          <p className="font-sans text-caption text-ink-muted">{t('credit.app.submittedBody')}</p>
        </div>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="pt-sm border-t border-hairline flex items-center justify-between gap-md">
        <p className="font-sans text-caption text-ink-subtle max-w-md">{t('credit.overLimit.requestNote')}</p>
        <button onClick={() => setOpen(true)} className={buttonClass('secondary', 'sm', 'shrink-0')}>
          <TrendingUp size={15} />
          {t('credit.requestIncrease')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="pt-md border-t border-hairline flex flex-col gap-sm animate-fade-up">
      <p className="font-serif text-card-title text-ink">{t('credit.app.title')}</p>
      <div className="grid sm:grid-cols-2 gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{t('credit.app.requested')}</span>
          <input type="number" value={Math.round(amount / 100)} onChange={(e) => setAmount(Number(e.target.value) * 100)} step={1000} className="input" dir={locale === 'ar' ? 'rtl' : 'ltr'} />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="label">{t('credit.app.justification')}</span>
          <input value={justification} onChange={(e) => setJustification(e.target.value)} placeholder={t('credit.app.justificationPlaceholder')} className="input" />
        </label>
      </div>
      <div className="flex items-center gap-sm">
        <button type="submit" className={buttonClass('primary', 'sm')}>
          {t('credit.app.submit')} · {money(amount)}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass('ghost', 'sm')}>
          {t('cta.back')}
        </button>
      </div>
    </form>
  )
}
