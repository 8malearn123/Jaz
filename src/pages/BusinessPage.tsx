import { useState } from 'react'
import {
  LayoutGrid, Landmark, FileText, Package, Users, Gift,
  TrendingUp, ShieldCheck, Download, CheckCircle2, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Plus, Check, X, ArrowRight,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { organization, availableCreditMinor } from '@/data/organization'
import type { CreditLedgerEntry } from '@/data/types'
import { members, quotes as quoteData, accountOrders as orderData, giftBatches, type AccountOrderStatus } from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

const org = organization

export function BusinessPage() {
  const { t, pick } = useLocale()
  const [active, setActive] = useTab('overview')
  const available = availableCreditMinor(org)

  const tabs: TabDef[] = [
    { id: 'overview', label: t('business.tab.overview'), icon: LayoutGrid },
    { id: 'credit', label: t('business.tab.credit'), icon: Landmark },
    { id: 'quotes', label: t('business.tab.quotes'), icon: FileText },
    { id: 'orders', label: t('business.tab.orders'), icon: Package },
    { id: 'team', label: t('business.tab.team'), icon: Users },
    { id: 'gifting', label: t('business.tab.gifting'), icon: Gift },
  ]

  return (
    <AccountShell
      eyebrow={t('role.businessPortal')}
      title={pick(org.legalName)}
      subtitle={`${pick(org.accountType)} · ${t('business.accountManager')}: ${pick(org.salesRep)}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={<RoleSwitcher tone="light" />}
    >
      {active === 'overview' && <OverviewPanel available={available} onTab={setActive} />}
      {active === 'credit' && <CreditPanel available={available} />}
      {active === 'quotes' && <QuotesPanel />}
      {active === 'orders' && <OrdersPanel />}
      {active === 'team' && <TeamPanel />}
      {active === 'gifting' && <GiftingPanel />}
    </AccountShell>
  )
}

/* ───────────── Overview ───────────── */
function OverviewPanel({ available, onTab }: { available: number; onTab: (id: string) => void }) {
  const { t, money } = useLocale()
  const pendingApprovals = orderData.filter((o) => o.status === 'awaiting_approval').length
  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('credit.available')} value={money(available)} tone="gold" emphasis />
        <Stat label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
        <Stat label={t('business.priceList')} value={org.tier.toUpperCase()} />
        <Stat label={t('orders.status.awaiting_approval')} value={String(pendingApprovals)} tone={pendingApprovals ? 'danger' : 'ink'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-lg">
        {/* recent activity */}
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('business.recentActivity')}</h3>
            <button onClick={() => onTab('credit')} className="link-gold">{t('cta.viewAll')}</button>
          </div>
          <ul className="divide-y divide-hairline">
            {org.ledger.slice(0, 4).map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </ul>
        </div>

        {/* quick links */}
        <div className="grid grid-cols-2 gap-sm content-start">
          {([
            { id: 'quotes', icon: FileText, label: t('business.tab.quotes'), meta: `${quoteData.length}` },
            { id: 'orders', icon: Package, label: t('business.tab.orders'), meta: `${orderData.length}` },
            { id: 'team', icon: Users, label: t('business.tab.team'), meta: `${members.length}` },
            { id: 'gifting', icon: Gift, label: t('business.tab.gifting'), meta: `${giftBatches.length}` },
          ] as const).map((q) => (
            <button key={q.id} onClick={() => onTab(q.id)} className="card card-hover p-lg flex flex-col gap-sm items-start">
              <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover">
                <q.icon size={18} />
              </span>
              <span className="font-sans text-data text-ink">{q.label}</span>
              <span className="font-serif text-headline text-ink tabular-nums">{q.meta}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────── Credit ───────────── */
function CreditPanel({ available }: { available: number }) {
  const { t, pick, money, locale } = useLocale()
  const termLabel: Record<string, { en: string; ar: string }> = {
    net_15: { en: 'Net 15', ar: 'صافي ١٥' }, net_30: { en: 'Net 30', ar: 'صافي ٣٠' },
    net_60: { en: 'Net 60', ar: 'صافي ٦٠' }, prepaid: { en: 'Prepaid', ar: 'مسبق' },
  }
  const riskLabel: Record<string, { en: string; ar: string }> = {
    low: { en: 'Low', ar: 'منخفض' }, medium: { en: 'Medium', ar: 'متوسط' }, high: { en: 'High', ar: 'مرتفع' },
  }
  const pct = (n: number) => `${Math.min(100, (n / org.credit.limitMinor) * 100)}%`

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md md:grid-cols-4">
        <Stat label={t('credit.limit')} value={money(org.credit.limitMinor)} />
        <Stat label={t('credit.available')} value={money(available)} tone="gold" emphasis />
        <Stat label={t('credit.reserved')} value={money(org.credit.reservedMinor)} />
        <Stat label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
      </div>

      <div className="card p-lg flex flex-col gap-md">
        <div className="h-3 rounded-pill bg-canvas-cool overflow-hidden flex">
          <span className="h-full bg-danger/70" style={{ width: pct(org.credit.outstandingMinor) }} />
          <span className="h-full bg-primary/70" style={{ width: pct(org.credit.reservedMinor) }} />
          <span className="h-full bg-success/60" style={{ width: pct(available) }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className="flex flex-wrap gap-x-lg gap-y-xs font-sans text-caption">
            <Legend c="#b5403b" label={`${t('credit.outstanding')} · ${money(org.credit.outstandingMinor)}`} />
            <Legend c="#b08a57" label={`${t('credit.reserved')} · ${money(org.credit.reservedMinor)}`} />
            <Legend c="#355c4b" label={`${t('credit.available')} · ${money(available)}`} />
          </div>
          <div className="flex flex-wrap items-center gap-md font-sans text-caption text-ink-muted">
            <span className="inline-flex items-center gap-xs"><FileText size={14} className="text-ink-subtle" /> {t('credit.terms')}: <strong className="text-ink">{pick(termLabel[org.credit.paymentTerms])}</strong></span>
            <span className="inline-flex items-center gap-xs"><ShieldCheck size={14} className="text-success" /> {t('credit.riskRating')}: <strong className="text-ink">{pick(riskLabel[org.credit.riskRating])}</strong></span>
            <span className="inline-flex items-center gap-xs"><TrendingUp size={14} className="text-ink-subtle" /> {t('credit.nextReview')}: <strong className="text-ink">{new Date(org.credit.nextReview).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
          </div>
        </div>
        <LimitIncrease />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-lg items-start">
        {/* ledger */}
        <div className="card overflow-hidden">
          <div className="bg-surface-2 px-lg py-md border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('credit.ledger')}</h3>
            <StatusBadge variant="neutral">{pick({ en: 'Append-only', ar: 'إضافة فقط' })}</StatusBadge>
          </div>
          <ul className="divide-y divide-hairline">
            {org.ledger.map((e) => <LedgerRow key={e.id} entry={e} showBalance />)}
          </ul>
        </div>
        {/* statements */}
        <div className="card overflow-hidden">
          <div className="bg-surface-2 px-lg py-md border-b border-hairline">
            <h3 className="font-serif text-card-title text-ink">{t('credit.statements')}</h3>
          </div>
          <ul className="divide-y divide-hairline">
            {org.statements.map((s) => (
              <li key={s.id} className="px-lg py-md flex items-center justify-between gap-md">
                <div className="flex flex-col gap-xxs min-w-0">
                  <span className="font-serif text-body text-ink">{pick(s.period)}</span>
                  <span className="font-sans text-caption text-ink-subtle tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    {pick({ en: 'Closing', ar: 'الختامي' })} {money(s.closingMinor)}
                  </span>
                </div>
                <button className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink transition-colors">
                  <Download size={15} /> PDF
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function LedgerRow({ entry, showBalance }: { entry: CreditLedgerEntry; showBalance?: boolean }) {
  const { pick, money, locale } = useLocale()
  const typeLabel: Record<CreditLedgerEntry['type'], { en: string; ar: string }> = {
    reservation: { en: 'Reservation', ar: 'حجز' }, release: { en: 'Release', ar: 'تحرير' },
    charge: { en: 'Charge', ar: 'استحقاق' }, payment: { en: 'Payment', ar: 'سداد' }, adjustment: { en: 'Adjustment', ar: 'تسوية' },
  }
  const isCredit = entry.type === 'payment' || entry.type === 'release'
  return (
    <li className="flex items-center gap-md px-lg py-md">
      <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', isCredit ? 'bg-success/12 text-success' : 'bg-primary/12 text-primary-hover')}>
        {isCredit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-data text-ink truncate">{pick(entry.reference)}</p>
        <p className="font-sans text-caption text-ink-subtle">
          {pick(typeLabel[entry.type])} · {new Date(entry.occurredAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <div className="text-end shrink-0">
        <p className={cn('font-sans text-data tabular-nums', isCredit ? 'text-success' : 'text-ink')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          {isCredit ? '−' : '+'}{money(entry.amountMinor, { withSymbol: false })}
        </p>
        {showBalance && <p className="font-sans text-caption text-ink-subtle tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(entry.balanceAfterMinor)}</p>}
      </div>
    </li>
  )
}

function LimitIncrease() {
  const { t, money, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [amount, setAmount] = useState(20000000)

  if (sent)
    return (
      <div className="rounded-md bg-success/8 border border-success/25 p-md flex items-start gap-sm">
        <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
        <div>
          <p className="font-sans text-data font-medium text-ink">{t('credit.app.submitted')}</p>
          <p className="font-sans text-caption text-ink-muted">{t('credit.app.submittedBody')}</p>
        </div>
      </div>
    )

  if (!open)
    return (
      <div className="pt-sm border-t border-hairline flex items-center justify-between gap-md">
        <p className="font-sans text-caption text-ink-subtle max-w-md">{t('credit.overLimit.requestNote')}</p>
        <button onClick={() => setOpen(true)} className={buttonClass('secondary', 'sm', 'shrink-0')}>
          <TrendingUp size={15} /> {t('credit.requestIncrease')}
        </button>
      </div>
    )

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="pt-md border-t border-hairline flex flex-col gap-sm animate-fade-up">
      <p className="font-serif text-card-title text-ink">{t('credit.app.title')}</p>
      <label className="flex flex-col gap-xs">
        <span className="label">{t('credit.app.requested')}</span>
        <input type="number" value={Math.round(amount / 100)} onChange={(e) => setAmount(Number(e.target.value) * 100)} step={1000} className="input max-w-xs" dir={locale === 'ar' ? 'rtl' : 'ltr'} />
      </label>
      <div className="flex items-center gap-sm">
        <button type="submit" className={buttonClass('primary', 'sm')}>{t('credit.app.submit')} · {money(amount)}</button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>
      </div>
    </form>
  )
}

/* ───────────── Quotes ───────────── */
function QuotesPanel() {
  const { t, pick, money, locale } = useLocale()
  const [requested, setRequested] = useState(false)
  const [list, setList] = useState(quoteData)
  const accept = (id: string) => setList((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'converted' } : q)))

  const variant: Record<string, 'gold' | 'success' | 'neutral' | 'danger'> = {
    sent: 'gold', accepted: 'success', converted: 'success', draft: 'neutral', expired: 'danger',
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('quotes.title')}</h2>
        <button onClick={() => setRequested(true)} className={buttonClass('primary', 'sm')}>
          <Plus size={15} /> {t('quotes.request')}
        </button>
      </div>

      {requested && (
        <div className="rounded-md bg-success/8 border border-success/25 p-md flex items-start gap-sm animate-fade-up">
          <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
          <div>
            <p className="font-sans text-data font-medium text-ink">{t('quotes.requested')}</p>
            <p className="font-sans text-caption text-ink-muted">{t('quotes.requestedBody')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-md">
        {list.map((q) => (
          <div key={q.id} className="card p-lg flex flex-col sm:flex-row sm:items-center gap-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm">
                <span className="font-sans text-data text-ink">{q.ref}</span>
                <StatusBadge variant={variant[q.status]}>{t(`quotes.status.${q.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-muted mt-xxs truncate">{pick(q.note)}</p>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">
                {q.lineCount} {t('quotes.lines')} · {t('quotes.validUntil')} {new Date(q.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-md shrink-0">
              <span className="font-serif text-card-title text-ink tabular-nums">{money(q.totalMinor)}</span>
              {(q.status === 'sent' || q.status === 'accepted') && (
                <button onClick={() => accept(q.id)} className={buttonClass('secondary', 'sm')}>
                  {t('quotes.accept')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────── Account orders ───────────── */
function OrdersPanel() {
  const { t, pick, money, locale } = useLocale()
  const [orders, setOrders] = useState(orderData)
  const decide = (orderNo: string, decision: 'approved' | 'rejected') =>
    setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, status: decision === 'approved' ? 'confirmed' : 'processing', requiresApproval: false } : o)))

  const variant: Record<AccountOrderStatus, 'gold' | 'success' | 'neutral' | 'danger'> = {
    awaiting_approval: 'danger', confirmed: 'gold', processing: 'gold', shipped: 'gold', delivered: 'success',
  }

  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('border.title')}</h2>
      <div className="flex flex-col gap-md">
        {orders.map((o) => (
          <div key={o.orderNo} className={cn('card p-lg flex flex-col gap-md', o.status === 'awaiting_approval' && 'ring-1 ring-danger/30')}>
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div>
                <div className="flex items-center gap-sm">
                  <span className="font-sans text-data text-ink">{o.orderNo}</span>
                  <StatusBadge variant={variant[o.status]}>{t(`orders.status.${o.status}`)}</StatusBadge>
                </div>
                <p className="font-sans text-caption text-ink-subtle mt-xxs">
                  {t('border.buyer')}: {pick(o.buyer)} · {t('border.po')} {o.poNumber} · {new Date(o.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className="font-serif text-card-title text-ink tabular-nums">{money(o.totalMinor)}</span>
            </div>

            {o.requiresApproval && o.status === 'awaiting_approval' && (
              <div className="rounded-md bg-danger/6 border border-danger/25 p-md flex flex-wrap items-center justify-between gap-sm">
                <span className="inline-flex items-center gap-xs font-sans text-data text-ink">
                  <AlertTriangle size={16} className="text-danger" /> {t('border.needsApproval')} <span className="text-ink-subtle">({t('border.overLimit')})</span>
                </span>
                <div className="flex items-center gap-xs">
                  <button onClick={() => decide(o.orderNo, 'rejected')} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5">
                    <X size={15} /> {t('border.reject')}
                  </button>
                  <button onClick={() => decide(o.orderNo, 'approved')} className={buttonClass('primary', 'sm')}>
                    <Check size={15} /> {t('border.approve')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────── Team ───────────── */
function TeamPanel() {
  const { t, pick, money } = useLocale()
  const roleVariant: Record<string, 'gold' | 'success' | 'neutral'> = {
    b2b_admin: 'gold', approver: 'success', buyer: 'neutral', viewer: 'neutral',
  }
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('team.title')}</h2>
        <button className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('team.invite')}</button>
      </div>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-md px-lg py-md">
              <span className="grid place-items-center w-10 h-10 rounded-pill bg-surface-2 border border-hairline font-serif text-card-title text-ink shrink-0">
                {pick(m.name).charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{pick(m.name)}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">{m.email} · {m.costCenter}</p>
              </div>
              <div className="flex items-center gap-md">
                <span className="text-end hidden sm:block">
                  <span className="block font-sans text-caption text-ink-subtle uppercase tracking-wide">{t('team.perOrderLimit')}</span>
                  <span className="font-sans text-data text-ink tabular-nums">{m.perOrderLimitMinor ? money(m.perOrderLimitMinor) : t('team.noLimit')}</span>
                </span>
                <StatusBadge variant={roleVariant[m.role]}>{t(`team.role.${m.role}`)}</StatusBadge>
                <StatusBadge variant={m.status === 'active' ? 'success' : 'neutral'}>{t(`team.status.${m.status}`)}</StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── Gifting ───────────── */
function GiftingPanel() {
  const { t, pick, locale } = useLocale()
  const variant: Record<string, 'gold' | 'success' | 'neutral'> = {
    draft: 'neutral', processing: 'gold', shipped: 'gold', delivered: 'success',
  }
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('gift.batches')}</h2>
        <button className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('gift.newBatch')}</button>
      </div>

      <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-lg flex items-start gap-sm">
        <Gift size={20} className="text-primary-hover shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted leading-relaxed">{t('corp.feature.gifting.body')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-md">
        {giftBatches.map((b) => (
          <div key={b.id} className="card p-lg flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-card-title text-ink">{pick(b.occasion)}</h3>
              <StatusBadge variant={variant[b.status]}>{t(`gift.batchStatus.${b.status}`)}</StatusBadge>
            </div>
            <p className="font-sans text-data text-ink-muted">
              <span className="font-serif text-headline text-ink tabular-nums">{b.recipientCount}</span> {t('gift.recipients')}
            </p>
            <p className="font-sans text-caption text-ink-subtle">
              {new Date(b.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <button className={buttonClass('ghost', 'sm', 'self-start mt-xs')}>
              {t('cta.viewDetails')} <ArrowRight size={14} className="rtl:rotate-180" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───────────── shared ───────────── */
function Stat({ label, value, tone = 'ink', emphasis }: { label: string; value: string; tone?: 'ink' | 'gold' | 'danger'; emphasis?: boolean }) {
  const { locale } = useLocale()
  const color = tone === 'gold' ? 'text-primary-hover' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', emphasis && 'ring-1 ring-primary/30 bg-primary/[0.04]')}>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', color)} dir={locale === 'ar' ? 'rtl' : 'ltr'}>{value}</span>
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
