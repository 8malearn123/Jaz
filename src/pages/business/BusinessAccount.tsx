import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid, Landmark, Package, Building2, ShieldCheck, BadgeCheck, Download,
  ArrowUpRight, ArrowDownRight, MapPin, Plus, Lock, Plug, FileText, TrendingUp, ShoppingBag,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { OrgOrdersPanel, MyQuotes } from './OrderQuotePanels'
import { organization, availableCreditMinor } from '@/data/organization'
import type { CreditLedgerEntry, Bilingual } from '@/data/types'
import {
  members as memberData, accountOrders, orgAddresses as addressData, orgVerification, spendByMonth,
  type OrgMember, type OrgAddress, type AccountOrder,
} from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { AreaTrend, Sparkline, UtilizationGauge, TrendPill } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

const org = organization
const roleAccent: Record<OrgMember['role'], 'gold' | 'success' | 'neutral'> = { b2b_admin: 'gold', approver: 'success', buyer: 'neutral', viewer: 'neutral' }

const TABS = ['overview', 'orders', 'quotes', 'credit', 'company'] as const
type Tab = (typeof TABS)[number]

export function BusinessAccount() {
  const { t, pick } = useLocale()
  const [activeRaw, setActive] = useTab('overview')
  const active = (TABS.includes(activeRaw as Tab) ? activeRaw : 'overview') as Tab

  const verifiedCount = orgVerification.filter((v) => v.status === 'approved').length

  const tabs: TabDef[] = [
    { id: 'overview', label: t('business.tab.overview'), icon: LayoutGrid },
    { id: 'orders', label: t('business.tab.orders'), icon: Package },
    { id: 'quotes', label: t('business.tab.quotes'), icon: FileText },
    { id: 'credit', label: t('biz.tab.credit'), icon: Landmark },
    { id: 'company', label: t('biz.tab.company'), icon: Building2 },
  ]

  return (
    <AccountShell
      eyebrow={t('biz.account')}
      title={pick(org.legalName)}
      subtitle={`${pick(org.accountType)} · ${t('business.accountManager')}: ${pick(org.salesRep)}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={
        <span className="hidden sm:inline-flex items-center gap-xs rounded-pill bg-success/12 text-success px-3 py-1.5 font-sans text-caption">
          <BadgeCheck size={14} /> {verifiedCount}/3 {t('orgadmin.verified')}
        </span>
      }
    >
      {active === 'overview' && <Overview onTab={setActive} />}
      {active === 'orders' && <OrgOrdersPanel />}
      {active === 'quotes' && <MyQuotes />}
      {active === 'credit' && <Credit />}
      {active === 'company' && <Account />}
    </AccountShell>
  )
}

/* ═══════════════ Overview — account snapshot ═══════════════ */
function Overview({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick, money, locale } = useLocale()
  const available = availableCreditMinor(org)
  const spendSeries = spendByMonth.map((p) => p.amountMinor)
  const ytd = spendSeries.reduce((s, x) => s + x, 0)
  const mom = Math.round(((spendByMonth[6].amountMinor - spendByMonth[5].amountMinor) / spendByMonth[5].amountMinor) * 100)
  const recent = accountOrders.slice(0, 4)
  const orderVariant = (s: AccountOrder['status']): 'gold' | 'success' | 'danger' | 'neutral' =>
    s === 'delivered' ? 'success' : s === 'awaiting_approval' ? 'danger' : s === 'rejected' ? 'neutral' : 'gold'

  return (
    <div className="flex flex-col gap-lg">
      {/* identity */}
      <div className="rounded-xl bg-canvas-dark text-ink-on-dark p-xl flex flex-wrap items-center gap-md justify-between">
        <div className="flex items-center gap-md">
          <span className="grid place-items-center w-14 h-14 rounded-lg bg-surface-dark-1 border border-hairline-dark text-primary-bright shrink-0">
            <Building2 size={26} />
          </span>
          <div>
            <h2 className="font-serif text-headline text-ink-on-dark">{pick(org.legalName)}</h2>
            <p className="font-sans text-caption text-ink-on-dark-muted">CR {org.crNumber} · VAT {org.vatNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <StatusBadge variant="gold">{org.tier.toUpperCase()}</StatusBadge>
          <span className="inline-flex items-center gap-xxs font-sans text-caption text-success"><BadgeCheck size={14} /> {t('oa.fullyVerified')}</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-md grid-cols-2 lg:grid-cols-4">
        <Kpi label={t('credit.available')} value={money(available)} tone="gold" />
        <Kpi label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
        <Kpi label={t('oa.kpi.spendYtd')} value={money(ytd)} spark={spendSeries} />
        <Kpi label={t('business.tab.orders')} value={String(accountOrders.length)} />
      </div>

      {/* order on account */}
      <div className="rounded-xl bg-canvas-dark text-ink-on-dark p-xl flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink-on-dark">{t('buyer.orderTitle')}</h2>
          <p className="text-body text-ink-on-dark-muted mt-xs max-w-md">{t('buyer.orderBody')}</p>
        </div>
        <div className="flex items-center gap-sm shrink-0">
          <Link to="/shop" className={buttonClass('primary', 'md')}><ShoppingBag size={16} /> {t('buyer.browseCatalogue')}</Link>
          <button onClick={() => onTab('quotes')} className={buttonClass('secondary', 'md')}>{t('quotes.request')}</button>
        </div>
      </div>

      {/* spend trend + recent orders */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-lg items-start">
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

        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('buyer.recentOrders')}</h3>
            <button onClick={() => onTab('orders')} className="link-gold">{t('cta.viewAll')}</button>
          </div>
          <ul className="divide-y divide-hairline">
            {recent.map((o) => (
              <li key={o.orderNo} className="flex items-center gap-md px-lg py-md">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{o.orderNo}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate">
                    {pick(o.summary)} · {new Date(o.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="font-sans text-data text-ink tabular-nums shrink-0">{money(o.totalMinor)}</span>
                <StatusBadge variant={orderVariant(o.status)}>{t(`orders.status.${o.status}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ People — members, invitations, permissions ═══════════════ */

/* ═══════════════ Spend controls — policy + budgets ═══════════════ */

/* ═══════════════ Credit ═══════════════ */
function Credit() {
  const { t, pick, money, locale } = useLocale()
  const available = availableCreditMinor(org)
  const [reqOpen, setReqOpen] = useState(false)
  const [requested, setRequested] = useState(false)
  const utilPct = Math.round(((org.credit.outstandingMinor + org.credit.reservedMinor) / org.credit.limitMinor) * 100)
  const termLabel: Record<string, Bilingual> = {
    net_15: { en: 'Net 15', ar: 'صافي ١٥' }, net_30: { en: 'Net 30', ar: 'صافي ٣٠' }, net_60: { en: 'Net 60', ar: 'صافي ٦٠' }, prepaid: { en: 'Prepaid', ar: 'مسبق' },
  }
  const downloadStatement = (id: string) => {
    const s = org.statements.find((x) => x.id === id)!
    const doc = { period: s.period.en, opening_minor: s.openingMinor, charges_minor: s.chargesMinor, payments_minor: s.paymentsMinor, closing_minor: s.closingMinor, currency: 'SAR' }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `statement-${s.id}.json`; a.click(); URL.revokeObjectURL(url)
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
                <button onClick={() => downloadStatement(s.id)} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> PDF</button>
              </li>
            ))}
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
  const [integrations, setIntegrations] = useState({ punchout: false, erp: true })
  const sourceLabel: Record<string, string> = { wathq: 'Wathq', zatca: 'ZATCA', nafath: 'Nafath' }
  const checkLabel: Record<string, Bilingual> = {
    commercial_registration: { en: 'Commercial Registration', ar: 'السجل التجاري' },
    vat: { en: 'VAT registration', ar: 'التسجيل الضريبي' },
    authorized_signatory: { en: 'Authorized signatory', ar: 'المفوّض بالتوقيع' },
  }
  const signatories = memberData.filter((m) => m.role === 'b2b_admin' || m.role === 'approver')

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
          <Detail label={t('business.accountManager')} value={pick(org.salesRep)} />
        </div>
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
              <BadgeCheck size={18} className="text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink">{pick(checkLabel[v.check])}</p>
                <p className="font-sans text-caption text-ink-subtle">{sourceLabel[v.source]} · {t('accuracy.expires')} {new Date(v.expiresAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short', year: 'numeric' })}</p>
              </div>
              <StatusBadge variant="success">{t('inv.zatca.cleared')}</StatusBadge>
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

      {/* addresses */}
      <div className="flex items-center justify-between gap-md">
        <h3 className="font-serif text-card-title text-ink">{t('orgadmin.addresses')}</h3>
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
            {a.isDefault && <StatusBadge variant="gold" className="self-start">{t('addr.default')}</StatusBadge>}
          </div>
        ))}
      </div>

      {/* integrations */}
      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><Plug size={18} className="text-primary-hover" /> {t('oa.integrations')}</h3>
        <Toggle label={t('oa.punchout')} hint={t('oa.punchoutHint')} on={integrations.punchout} onToggle={() => setIntegrations((s) => ({ ...s, punchout: !s.punchout }))} />
        <Toggle label={t('oa.erp')} hint={t('oa.erpHint')} on={integrations.erp} onToggle={() => setIntegrations((s) => ({ ...s, erp: !s.erp }))} />
      </div>

      <AddAddressModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(a) => setAddresses((p) => [...p, a])} />
    </div>
  )
}

/* ═══════════════ Modals ═══════════════ */

function AddAddressModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (a: OrgAddress) => void }) {
  const { t } = useLocale()
  const [form, setForm] = useState({ type: 'shipping' as OrgAddress['type'], label: '', city: '', district: '', shortAddress: '', isDefault: false })
  const valid = form.label.trim() && form.city.trim() && form.shortAddress.trim()
  const submit = () => {
    onAdd({
      id: `oa-${Date.now()}`, type: form.type,
      label: { en: form.label, ar: form.label }, city: { en: form.city, ar: form.city }, district: { en: form.district, ar: form.district },
      shortAddress: form.shortAddress.toUpperCase(), isDefault: form.isDefault,
    })
    setForm({ type: 'shipping', label: '', city: '', district: '', shortAddress: '', isDefault: false })
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
        <Field label={`${t('oa.requestedLimit')} (SAR)`} value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} placeholder="200000" />
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
function Kpi({ label, value, tone = 'ink', alert, spark, small }: { label: string; value: string; tone?: 'ink' | 'gold' | 'danger'; alert?: boolean; spark?: number[]; small?: boolean }) {
  const color = alert ? 'text-danger' : tone === 'gold' ? 'text-primary-hover' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', tone === 'gold' && 'ring-1 ring-primary/30 bg-primary/[0.04]', alert && 'ring-1 ring-danger/30')}>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif tabular-nums', small ? 'text-card-title' : 'text-headline', color)}>{value}</span>
      {spark && <span className="text-primary-hover/70 mt-xxs"><Sparkline points={spark} /></span>}
    </div>
  )
}

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
