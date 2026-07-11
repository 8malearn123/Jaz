import { useState } from 'react'
import {
  LayoutGrid, Landmark, Package, Building2, ShieldCheck, BadgeCheck, Download,
  ArrowUpRight, ArrowDownRight, MapPin, Plus, Lock, FileText, TrendingUp,
  Store, Bell, Phone,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { WholesaleOrderProvider } from '@/state/WholesaleOrderContext'
import { OrgOrdersPanel } from './OrderQuotePanels'
import { CatalogPanel } from './CatalogPanel'
import { AccountManagerCard, LastOrderCard, NextDeliveryCard } from './shared'
import { organization, availableCreditMinor } from '@/data/organization'
import type { CreditLedgerEntry, Bilingual } from '@/data/types'
import {
  members as memberData, orgAddresses as addressData, orgVerification, spendByMonth,
  b2bInvoices, b2bMonthSummary, orgNotificationDefaults,
  type OrgMember, type OrgAddress,
} from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { ToastProvider, useToast } from '@/components/account/Toast'
import { AreaTrend, UtilizationGauge, TrendPill } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'
import { downloadExcel } from '@/lib/excel'
import { openPrintWindow } from '@/lib/printWindow'

const org = organization
const roleAccent: Record<OrgMember['role'], 'gold' | 'success' | 'neutral'> = { b2b_admin: 'gold', approver: 'success', buyer: 'neutral', viewer: 'neutral' }

const TABS = ['overview', 'catalog', 'orders', 'credit', 'company'] as const
type Tab = (typeof TABS)[number]

export function BusinessAccount() {
  return (
    <WholesaleOrderProvider>
      <ToastProvider>
        <BusinessContent />
      </ToastProvider>
    </WholesaleOrderProvider>
  )
}

function BusinessContent() {
  const { t, pick } = useLocale()
  const [activeRaw, setActive] = useTab('overview')
  const active = (TABS.includes(activeRaw as Tab) ? activeRaw : 'overview') as Tab

  const verifiedCount = orgVerification.filter((v) => v.status === 'approved').length

  const tabs: TabDef[] = [
    { id: 'overview', label: t('business.tab.overview'), icon: LayoutGrid },
    { id: 'catalog', label: t('biz.tab.catalog'), icon: Store },
    { id: 'orders', label: t('business.tab.orders'), icon: Package },
    { id: 'credit', label: t('biz.tab.finance'), icon: Landmark },
    { id: 'company', label: t('biz.tab.company'), icon: Building2 },
  ]

  return (
    <AccountShell
      eyebrow={t('biz.account')}
      title={pick(org.legalName)}
      subtitle={`${pick(org.accountType)} · ${org.tier.toUpperCase()} ${t('business.tier')}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={
        <span className="hidden sm:inline-flex items-center gap-xs rounded-pill bg-success/12 text-success px-3 py-1.5 font-sans text-caption">
          <BadgeCheck size={14} /> {verifiedCount}/3 {t('orgadmin.verified')}
        </span>
      }
      navFooter={<AccountManagerCard />}
    >
      {active === 'overview' && <Overview onTab={setActive} />}
      {active === 'catalog' && <CatalogPanel />}
      {active === 'orders' && <OrgOrdersPanel />}
      {active === 'credit' && <Credit />}
      {active === 'company' && <Account />}
    </AccountShell>
  )
}

/* ═══════════════ Overview — the ordering command center ═══════════════ */
function Overview({ onTab }: { onTab: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-lg">
      {/* account-health at a glance — credit headroom + this-cycle spend/savings */}
      <KpiStrip />

      {/* last-order journey + next delivery, side by side */}
      <div className="grid lg:grid-cols-2 gap-lg">
        <LastOrderCard onTab={onTab} />
        <NextDeliveryCard onTab={onTab} />
      </div>
    </div>
  )
}

/* Account-health KPI strip — credit headroom + this-cycle orders / spend / bulk savings. */
function KpiStrip() {
  const { t, pick, money } = useLocale()
  const available = availableCreditMinor(org)
  const sar = pick({ en: '﷼', ar: '﷼' })
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
      <StatCell tone="gold" label={pick({ en: 'Available credit', ar: 'الائتمان المتاح' })} value={money(available, { withSymbol: false })} unit={sar} sub={`${pick({ en: 'of', ar: 'من' })} ${money(org.credit.limitMinor)}`} />
      <StatCell label={t('bmonth.orders')} value={String(b2bMonthSummary.orders)} sub={pick({ en: 'this cycle', ar: 'هذه الدورة' })} />
      <StatCell label={t('bmonth.purchases')} value={money(b2bMonthSummary.purchasesMinor, { withSymbol: false })} unit={sar} sub={pick({ en: 'this cycle', ar: 'هذه الدورة' })} />
      <StatCell tone="success" label={t('bmonth.saved')} value={money(b2bMonthSummary.savedMinor, { withSymbol: false })} unit={sar} sub={pick({ en: 'via volume pricing', ar: 'بأسعار الكمية' })} />
    </div>
  )
}

function StatCell({ label, value, unit, sub, tone = 'plain' }: { label: string; value: string; unit?: string; sub?: string; tone?: 'plain' | 'gold' | 'success' }) {
  return (
    <div className="card p-md flex flex-col gap-xxs">
      <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle truncate">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums leading-none', tone === 'gold' ? 'text-primary-hover' : tone === 'success' ? 'text-success' : 'text-ink')}>
        {value}{unit && <span className="font-sans text-caption text-ink-subtle ms-1">{unit}</span>}
      </span>
      {sub && <span className="font-sans text-caption text-ink-subtle truncate">{sub}</span>}
    </div>
  )
}

/* ═══════════════ People — members, invitations, permissions ═══════════════ */

/* ═══════════════ Spend controls — policy + budgets ═══════════════ */

/* ═══════════════ Credit ═══════════════ */
function Credit() {
  const { t, pick, money, locale } = useLocale()
  const { flash } = useToast()
  const available = availableCreditMinor(org)
  const spendSeries = spendByMonth.map((p) => p.amountMinor)
  const ytd = spendSeries.reduce((s, x) => s + x, 0)
  const n = spendByMonth.length // latest month vs the one before (rot-proof if a month is appended)
  const mom = n >= 2 ? Math.round(((spendByMonth[n - 1].amountMinor - spendByMonth[n - 2].amountMinor) / spendByMonth[n - 2].amountMinor) * 100) : 0
  const [reqOpen, setReqOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const utilPct = Math.round(((org.credit.outstandingMinor + org.credit.reservedMinor) / org.credit.limitMinor) * 100)
  const termLabel: Record<string, Bilingual> = {
    net_15: { en: 'Net 15', ar: 'صافي ١٥' }, net_30: { en: 'Net 30', ar: 'صافي ٣٠' }, net_60: { en: 'Net 60', ar: 'صافي ٦٠' }, prepaid: { en: 'Prepaid', ar: 'مسبق' },
  }
  const downloadStatement = (id: string) => {
    const s = org.statements.find((x) => x.id === id)!
    downloadExcel(`statement-${s.id}`, pick({ en: 'Statement', ar: 'كشف الحساب' }), [
      [pick({ en: 'Item', ar: 'البند' }), pick({ en: 'Value', ar: 'القيمة' })],
      [pick({ en: 'Period', ar: 'الفترة' }), pick(s.period)],
      [pick({ en: 'Opening balance (SAR)', ar: 'الرصيد الافتتاحي (ريال)' }), s.openingMinor / 100],
      [pick({ en: 'Charges (SAR)', ar: 'المشتريات (ريال)' }), s.chargesMinor / 100],
      [pick({ en: 'Payments (SAR)', ar: 'المدفوعات (ريال)' }), s.paymentsMinor / 100],
      [pick({ en: 'Closing balance (SAR)', ar: 'الرصيد الختامي (ريال)' }), s.closingMinor / 100],
    ])
    flash(pick({ en: 'Statement downloaded (Excel)', ar: 'نُزّل كشف الحساب (إكسل)' }))
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid lg:grid-cols-[auto_1fr] gap-lg items-center card p-lg">
        <div className="grid place-items-center">
          <UtilizationGauge
            segments={[
              { value: org.credit.outstandingMinor, color: '#b5403b' },
              { value: org.credit.reservedMinor, color: '#b08a57' },
              { value: available, color: '#355c4b' },
            ]}
            centerValue={`${utilPct}%`}
            centerLabel={t('oa.utilised')}
          />
        </div>
        <div className="flex flex-col gap-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
            <LegendStat color="#355c4b" label={t('credit.available')} value={money(available)} />
            <LegendStat color="#b08a57" label={t('credit.reserved')} value={money(org.credit.reservedMinor)} />
            <LegendStat color="#b5403b" label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} />
            <LegendStat label={t('credit.limit')} value={money(org.credit.limitMinor)} />
          </div>
          <div className="flex flex-wrap items-center gap-md pt-sm border-t border-hairline font-sans text-caption text-ink-muted">
            <span className="inline-flex items-center gap-xs"><FileText size={14} className="text-ink-subtle" /> {t('credit.terms')}: <strong className="text-ink">{pick(termLabel[org.credit.paymentTerms])}</strong></span>
            <span className="inline-flex items-center gap-xs"><TrendingUp size={14} className="text-ink-subtle" /> {t('credit.nextReview')}: <strong className="text-ink">{new Date(org.credit.nextReview).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
            <button onClick={() => setReqOpen(true)} className={buttonClass('secondary', 'sm', 'ms-auto')}><ArrowUpRight size={15} /> {t('oa.requestIncrease')}</button>
          </div>
        </div>
      </div>

      {requested && (
        <div className="rounded-lg bg-success/8 border border-success/25 p-md flex items-start gap-sm animate-fade-up">
          <ShieldCheck size={18} className="text-success mt-0.5 shrink-0" />
          <div>
            <p className="font-sans text-data font-medium text-ink">{t('oa.increaseSent')}</p>
            <p className="font-sans text-caption text-ink-muted">{t('oa.increaseSentBody')}</p>
          </div>
        </div>
      )}

      {/* spend trend (the single analytics home) */}
      <div className="card p-lg flex flex-col gap-md">
        <div className="flex items-center justify-between gap-sm">
          <div>
            <h3 className="font-serif text-card-title text-ink">{t('oa.spendTrend')}</h3>
            <p className="font-sans text-caption text-ink-subtle">{t('oa.last8months')}</p>
          </div>
          <div className="text-end">
            <span className="font-serif text-headline text-ink tabular-nums block">{money(ytd)}</span>
            <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle">{t('oa.momChange')} <TrendPill delta={mom} /></span>
          </div>
        </div>
        <AreaTrend points={spendSeries} labels={spendByMonth.map((p) => pick(p.month))} format={(v) => money(v)} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-lg items-start">
        <div className="card overflow-hidden">
          <div className="bg-surface-2 px-lg py-md border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('credit.ledger')}</h3>
            <StatusBadge variant="neutral">{pick({ en: 'Append-only', ar: 'إضافة فقط' })}</StatusBadge>
          </div>
          <ul className="divide-y divide-hairline">{org.ledger.map((e) => <LedgerRow key={e.id} entry={e} showBalance />)}</ul>
        </div>
        <div className="card overflow-hidden">
          <div className="bg-surface-2 px-lg py-md border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{t('credit.statements')}</h3></div>
          <ul className="divide-y divide-hairline">
            {org.statements.map((s) => (
              <li key={s.id} className="px-lg py-md flex items-center justify-between gap-md">
                <div className="flex flex-col gap-xxs min-w-0">
                  <span className="font-serif text-body text-ink">{pick(s.period)}</span>
                  <span className="font-sans text-caption text-ink-subtle tabular-nums">{pick({ en: 'Closing', ar: 'الختامي' })} {money(s.closingMinor)}</span>
                </div>
                <button onClick={() => downloadStatement(s.id)} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> Excel</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ZATCA invoices + this-month rollup */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-lg items-start">
        <div className="card overflow-hidden">
          <div className="bg-surface-2 px-lg py-md border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('binv.title')}</h3>
            <StatusBadge variant="success">{t('binv.zatca')}</StatusBadge>
          </div>
          <ul className="divide-y divide-hairline">
            {b2bInvoices.map((iv) => (
              <li key={iv.id} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-9 h-9 rounded-md bg-ink text-ink-on-dark shrink-0"><FileText size={16} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm">
                    <span className="font-sans text-data text-ink tabular-nums">{iv.id}</span>
                    <StatusBadge variant={iv.paid ? 'success' : 'gold'}>{iv.paid ? t('binv.paid') : t('binv.net30')}</StatusBadge>
                  </div>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{new Date(iv.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {money(iv.amountMinor)}</p>
                </div>
                <button onClick={() => {
                  const dir = locale === 'ar' ? 'rtl' : 'ltr'
                  const L = (en: string, ar: string) => (locale === 'ar' ? ar : en)
                  openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${iv.id}</title><style>
                    @page{size:A4 portrait;margin:12mm}
                    body{font-family:'Segoe UI',Tahoma,sans-serif;padding:32px;color:#2b2b2b}
                    h1{font-size:20px;margin:0 0 4px} .sub{color:#777;font-size:12px;margin-bottom:16px}
                    table{width:100%;border-collapse:collapse;margin-top:10px}
                    th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;text-align:${locale === 'ar' ? 'right' : 'left'}}
                    th{background:#f3efe8}
                    @media print{body{padding:0}}
                  </style></head><body>
                    <h1>${L('Tax invoice', 'فاتورة ضريبية')} ${iv.id}</h1>
                    <div class="sub">Jaz · ${L('ZATCA compliant', 'متوافقة مع هيئة الزكاة والضريبة والجمارك')}</div>
                    <table><tbody>
                      <tr><th>${L('Date', 'التاريخ')}</th><td>${new Date(iv.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
                      <tr><th>${L('Amount', 'المبلغ')}</th><td>${money(iv.amountMinor)}</td></tr>
                      <tr><th>${L('Status', 'الحالة')}</th><td>${iv.paid ? L('Paid', 'مسدّدة') : L('Net 30', 'صافي ٣٠')}</td></tr>
                    </tbody></table>
                  </body></html>`)
                }} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> PDF</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card overflow-hidden">
          <div className="bg-surface-2 px-lg py-md border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{t('bmonth.title')}</h3></div>
          <ul className="divide-y divide-hairline">
            <li className="flex items-center justify-between px-lg py-md"><span className="font-sans text-data text-ink-muted">{t('bmonth.orders')}</span><span className="font-serif text-card-title text-ink tabular-nums">{b2bMonthSummary.orders}</span></li>
            <li className="flex items-center justify-between px-lg py-md"><span className="font-sans text-data text-ink-muted">{t('bmonth.purchases')}</span><span className="font-serif text-card-title text-ink tabular-nums">{money(b2bMonthSummary.purchasesMinor)}</span></li>
            <li className="flex items-center justify-between px-lg py-md"><span className="font-sans text-data text-ink-muted">{t('bmonth.saved')}</span><span className="font-serif text-card-title text-success tabular-nums">{money(b2bMonthSummary.savedMinor)}</span></li>
          </ul>
        </div>
      </div>

      <RequestCreditModal open={reqOpen} onClose={() => setReqOpen(false)} onSubmit={() => { setReqOpen(false); setRequested(true) }} />
    </div>
  )
}

/* ═══════════════ Analytics ═══════════════ */

/* ═══════════════ Gifting ═══════════════ */

/* ═══════════════ Account — legal entity, verification, addresses, integrations ═══════════════ */
function Account() {
  const { t, pick, locale } = useLocale()
  const [addresses, setAddresses] = useState<OrgAddress[]>(addressData)
  const [addOpen, setAddOpen] = useState(false)
  const [notif, setNotif] = useState(orgNotificationDefaults)
  const sourceLabel: Record<string, string> = { wathq: 'Wathq', zatca: 'ZATCA', nafath: 'Nafath' }
  const checkLabel: Record<string, Bilingual> = {
    commercial_registration: { en: 'Commercial Registration', ar: 'السجل التجاري' },
    vat: { en: 'VAT registration', ar: 'التسجيل الضريبي' },
    authorized_signatory: { en: 'Authorized signatory', ar: 'المفوّض بالتوقيع' },
  }
  const signatories = memberData.filter((m) => m.role === 'b2b_admin' || m.role === 'approver')
  const verifBadge: Record<string, { variant: 'success' | 'gold' | 'danger'; label: Bilingual }> = {
    approved: { variant: 'success', label: { en: 'Verified', ar: 'موثّق' } },
    in_review: { variant: 'gold', label: { en: 'In review', ar: 'قيد المراجعة' } },
    expired: { variant: 'danger', label: { en: 'Expired', ar: 'منتهٍ' } },
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* legal entity */}
      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><Building2 size={18} className="text-primary-hover" /> {t('oa.legalEntity')}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-md">
          <Detail label={t('oa.legalName')} value={pick(org.legalName)} />
          <Detail label={t('oa.accountType')} value={pick(org.accountType)} />
          <Detail label={t('oa.tier')} value={org.tier.toUpperCase()} />
          <Detail label="CR" value={org.crNumber} />
          <Detail label="VAT" value={org.vatNumber} />
          <Detail label={t('credit.terms')} value={pick({ en: 'Net 30', ar: 'صافي ٣٠' })} />
        </div>
      </div>

      {/* addresses & warehouses — warehouse details live here, in the facility tab */}
      <div className="flex items-center justify-between gap-md">
        <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Addresses & warehouses', ar: 'العناوين والمستودعات' })}</h3>
        <button onClick={() => setAddOpen(true)} className={buttonClass('secondary', 'sm')}><Plus size={15} /> {t('addr.add')}</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-md">
        {addresses.map((a) => (
          <div key={a.id} className={cn('card p-lg flex flex-col gap-sm', a.isDefault && 'ring-1 ring-primary/30')}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink"><MapPin size={16} className="text-primary-hover" /> {pick(a.label)}</span>
              <StatusBadge variant="neutral">{a.type === 'billing' ? t('addr.billing') : t('addr.shipping')}</StatusBadge>
            </div>
            <p className="font-sans text-data text-ink-muted">{pick(a.district)}, {pick(a.city)} · {a.shortAddress}</p>
            {a.phone && <p className="font-sans text-caption text-ink-subtle inline-flex items-center gap-xxs tabular-nums" dir="ltr"><Phone size={12} /> {a.phone}</p>}
            {a.isDefault && <StatusBadge variant="gold" className="self-start">{t('addr.default')}</StatusBadge>}
          </div>
        ))}
      </div>

      {/* notification preferences */}
      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><Bell size={18} className="text-primary-hover" /> {t('bizsettings.notifs')}</h3>
        {([
          ['orders', t('bizsettings.notif.orders'), t('bizsettings.notif.ordersDesc')],
          ['invoices', t('bizsettings.notif.invoices'), t('bizsettings.notif.invoicesDesc')],
          ['lowStock', t('bizsettings.notif.lowStock'), t('bizsettings.notif.lowStockDesc')],
          ['marketing', t('bizsettings.notif.marketing'), t('bizsettings.notif.marketingDesc')],
        ] as const).map(([key, label, hint]) => (
          <Toggle key={key} label={label} hint={hint} on={notif[key]} onToggle={() => setNotif((s) => ({ ...s, [key]: !s[key] }))} />
        ))}
      </div>

      {/* verification */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
          <ShieldCheck size={17} className="text-success" />
          <h3 className="font-serif text-card-title text-ink">{t('orgadmin.verification')}</h3>
        </div>
        <ul className="divide-y divide-hairline">
          {orgVerification.map((v) => (
            <li key={v.check} className="flex items-center gap-md px-lg py-md">
              <BadgeCheck size={18} className={cn('shrink-0', v.status === 'approved' ? 'text-success' : v.status === 'expired' ? 'text-danger' : 'text-primary-hover')} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink">{pick(checkLabel[v.check])}</p>
                <p className="font-sans text-caption text-ink-subtle">{sourceLabel[v.source]} · {t('accuracy.expires')} {new Date(v.expiresAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short', year: 'numeric' })}</p>
              </div>
              <StatusBadge variant={verifBadge[v.status].variant}>{pick(verifBadge[v.status].label)}</StatusBadge>
            </li>
          ))}
        </ul>
      </div>

      {/* signatories */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{t('oa.signatories')}</h3></div>
        <ul className="divide-y divide-hairline">
          {signatories.map((m) => (
            <li key={m.id} className="flex items-center gap-md px-lg py-md">
              <span className="grid place-items-center w-9 h-9 rounded-pill bg-primary/10 border border-hairline font-serif text-card-title text-primary-hover shrink-0">{pick(m.name).charAt(0)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{pick(m.name)}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">{m.email}</p>
              </div>
              <StatusBadge variant={roleAccent[m.role]}>{t(`team.role.${m.role}`)}</StatusBadge>
            </li>
          ))}
        </ul>
      </div>

      <AddAddressModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(a) => setAddresses((p) => [...p, a])} />
    </div>
  )
}

/* ═══════════════ Modals ═══════════════ */

function AddAddressModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (a: OrgAddress) => void }) {
  const { t, pick } = useLocale()
  const [form, setForm] = useState({ type: 'shipping' as OrgAddress['type'], label: '', city: '', district: '', shortAddress: '', phone: '', isDefault: false })
  const valid = form.label.trim() && form.city.trim() && form.shortAddress.trim() && form.phone.trim()
  const submit = () => {
    onAdd({
      id: `oa-${Date.now()}`, type: form.type,
      label: { en: form.label, ar: form.label }, city: { en: form.city, ar: form.city }, district: { en: form.district, ar: form.district },
      shortAddress: form.shortAddress.toUpperCase(), isDefault: form.isDefault, phone: form.phone.trim(),
    })
    setForm({ type: 'shipping', label: '', city: '', district: '', shortAddress: '', phone: '', isDefault: false })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={t('checkout.nationalAddress')} title={t('addr.addTitle')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('addr.save')}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{t('addr.type')}</span>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OrgAddress['type'] }))} className="input cursor-pointer">
            <option value="shipping">{t('addr.shipping')}</option>
            <option value="billing">{t('addr.billing')}</option>
          </select>
        </label>
        <Field label={t('addr.label')} value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} placeholder="Central warehouse" />
        <div className="flex flex-col sm:flex-row gap-md">
          <Field label={t('checkout.city')} value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          <Field label={t('checkout.district')} value={form.district} onChange={(v) => setForm((f) => ({ ...f, district: v }))} />
        </div>
        <Field label={t('checkout.shortAddress')} value={form.shortAddress} onChange={(v) => setForm((f) => ({ ...f, shortAddress: v }))} placeholder="RWAB1234" />
        <Field label={pick({ en: 'Contact number', ar: 'رقم التواصل' })} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+9665XXXXXXXX" type="tel" />
        <label className="flex items-center gap-sm cursor-pointer">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-primary" />
          <span className="font-sans text-data text-ink-muted">{t('addr.setDefault')}</span>
        </label>
      </div>
    </Modal>
  )
}

function RequestCreditModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: () => void }) {
  const { t, money } = useLocale()
  const [amount, setAmount] = useState('200000')
  const [reason, setReason] = useState('')
  const valid = Number(amount) * 100 > org.credit.limitMinor && reason.trim().length > 4
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={t('business.tab.credit')} title={t('oa.requestIncrease')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={onSubmit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('oa.submitRequest')}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="rounded-md bg-surface-2 border border-hairline p-md flex items-center justify-between">
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('oa.currentLimit')}</span>
          <span className="font-serif text-card-title text-ink tabular-nums">{money(org.credit.limitMinor)}</span>
        </div>
        <Field label={`${t('oa.requestedLimit')} (﷼)`} value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} placeholder="200000" />
        <label className="flex flex-col gap-xs">
          <span className="label">{t('oa.justification')}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input resize-none" placeholder={t('oa.justificationHint')} />
        </label>
        <p className="inline-flex items-start gap-xs font-sans text-caption text-ink-subtle"><Lock size={13} className="mt-0.5 shrink-0" /> {t('oa.sodNote')}</p>
      </div>
    </Modal>
  )
}

/* ═══════════════ shared pieces ═══════════════ */
function LegendStat({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-wide text-ink-subtle">
        {color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />}{label}
      </span>
      <span className="font-serif text-card-title text-ink tabular-nums">{value}</span>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span>
      <span className="font-sans text-data text-ink">{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="flex flex-col gap-xs flex-1">
      <span className="label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} className="input" />
    </label>
  )
}

function LedgerRow({ entry, showBalance }: { entry: CreditLedgerEntry; showBalance?: boolean }) {
  const { pick, money, locale } = useLocale()
  const typeLabel: Record<CreditLedgerEntry['type'], Bilingual> = {
    reservation: { en: 'Reservation', ar: 'حجز' }, release: { en: 'Release', ar: 'تحرير' }, charge: { en: 'Charge', ar: 'استحقاق' }, payment: { en: 'Payment', ar: 'سداد' }, adjustment: { en: 'Adjustment', ar: 'تسوية' },
  }
  const isCredit = entry.type === 'payment' || entry.type === 'release'
  return (
    <li className="flex items-center gap-md px-lg py-md">
      <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', isCredit ? 'bg-success/12 text-success' : 'bg-primary/12 text-primary-hover')}>
        {isCredit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-data text-ink truncate">{pick(entry.reference)}</p>
        <p className="font-sans text-caption text-ink-subtle">{pick(typeLabel[entry.type])} · {new Date(entry.occurredAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}</p>
      </div>
      <div className="text-end shrink-0">
        <p className={cn('font-sans text-data tabular-nums', isCredit ? 'text-success' : 'text-ink')}>{isCredit ? '−' : '+'}{money(entry.amountMinor, { withSymbol: false })}</p>
        {showBalance && <p className="font-sans text-caption text-ink-subtle tabular-nums">{money(entry.balanceAfterMinor)}</p>}
      </div>
    </li>
  )
}

function Toggle({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-md text-start rounded-lg border border-hairline p-md hover:border-ink/30 transition-colors">
      <span className={cn('relative w-10 h-6 rounded-pill transition-colors shrink-0', on ? 'bg-success' : 'bg-hairline-strong')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-pill bg-white transition-all', on ? 'start-[18px]' : 'start-0.5')} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-sans text-data text-ink">{label}</span>
        <span className="block font-sans text-caption text-ink-subtle">{hint}</span>
      </span>
    </button>
  )
}
