import { useState } from 'react'
import {
  LayoutGrid, Users, Landmark, Package, FileText, Gift, Settings,
  ShieldCheck, TrendingUp, Download, ArrowUpRight, ArrowDownRight,
  MapPin, Plus, Check, Pencil, Building2, BadgeCheck, Trash2,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { organization, availableCreditMinor } from '@/data/organization'
import type { CreditLedgerEntry } from '@/data/types'
import {
  members as memberData, accountOrders, quotes as quoteData, giftBatches as batchData, orgAddresses as addressData, orgVerification,
  type OrgMember, type AccountOrder, type OrgAddress, type GiftBatch,
} from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

const org = organization
const ROLES: OrgMember['role'][] = ['b2b_admin', 'approver', 'buyer', 'viewer']
const roleVariant: Record<string, 'gold' | 'success' | 'neutral'> = { b2b_admin: 'gold', approver: 'success', buyer: 'neutral', viewer: 'neutral' }

const orderVariant: Record<AccountOrder['status'], 'gold' | 'success' | 'danger' | 'neutral'> = {
  awaiting_approval: 'danger', confirmed: 'gold', processing: 'gold', shipped: 'gold', delivered: 'success', rejected: 'neutral',
}

export function OrgAdminPortal() {
  const { t, pick } = useLocale()
  const [activeRaw, setActive] = useTab('overview')
  const active = ['overview', 'team', 'credit', 'orders', 'quotes', 'gifting', 'settings'].includes(activeRaw) ? activeRaw : 'overview'

  const tabs: TabDef[] = [
    { id: 'overview', label: t('business.tab.overview'), icon: LayoutGrid },
    { id: 'team', label: t('business.tab.team'), icon: Users },
    { id: 'credit', label: t('business.tab.credit'), icon: Landmark },
    { id: 'orders', label: t('business.tab.orders'), icon: Package },
    { id: 'quotes', label: t('business.tab.quotes'), icon: FileText },
    { id: 'gifting', label: t('business.tab.gifting'), icon: Gift },
    { id: 'settings', label: t('orgadmin.tab.settings'), icon: Settings },
  ]

  return (
    <AccountShell
      eyebrow={pick(org.legalName)}
      title={t('orgadmin.title')}
      subtitle={`${pick(org.accountType)} · ${t('business.accountManager')}: ${pick(org.salesRep)}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
    >
      {active === 'overview' && <Overview onTab={setActive} />}
      {active === 'team' && <Team />}
      {active === 'credit' && <Credit />}
      {active === 'orders' && <Orders />}
      {active === 'quotes' && <Quotes />}
      {active === 'gifting' && <Gifting />}
      {active === 'settings' && <SettingsPanel />}
    </AccountShell>
  )
}

/* ── Overview ── */
function Overview({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick, money } = useLocale()
  const available = availableCreditMinor(org)
  const pending = accountOrders.filter((o) => o.status === 'awaiting_approval').length
  const verifiedCount = orgVerification.filter((v) => v.status === 'approved').length

  return (
    <div className="flex flex-col gap-lg">
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
          <span className="inline-flex items-center gap-xxs font-sans text-caption text-success">
            <BadgeCheck size={14} /> {verifiedCount}/3 {t('orgadmin.verified')}
          </span>
        </div>
      </div>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('credit.available')} value={money(available)} tone="gold" />
        <Stat label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
        <Stat label={t('business.tab.team')} value={String(memberData.length)} />
        <Stat label={t('orders.status.awaiting_approval')} value={String(pending)} tone={pending ? 'danger' : 'ink'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-lg">
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('business.recentActivity')}</h3>
            <button onClick={() => onTab('credit')} className="link-gold">{t('cta.viewAll')}</button>
          </div>
          <ul className="divide-y divide-hairline">
            {org.ledger.slice(0, 4).map((e) => <LedgerRow key={e.id} entry={e} />)}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-sm content-start">
          {([
            { id: 'team', icon: Users, label: t('business.tab.team') },
            { id: 'orders', icon: Package, label: t('business.tab.orders') },
            { id: 'credit', icon: Landmark, label: t('business.tab.credit') },
            { id: 'settings', icon: Settings, label: t('orgadmin.tab.settings') },
          ] as const).map((q) => (
            <button key={q.id} onClick={() => onTab(q.id)} className="card card-hover p-lg flex flex-col gap-sm items-start">
              <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover"><q.icon size={18} /></span>
              <span className="font-sans text-data text-ink">{q.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Team ── */
function Team() {
  const { t, pick, money } = useLocale()
  const [members, setMembers] = useState<OrgMember[]>(memberData)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const startEdit = (m: OrgMember) => { setEditing(m.id); setDraft(m.perOrderLimitMinor ? String(Math.round(m.perOrderLimitMinor / 100)) : '') }
  const save = (id: string) => { setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, perOrderLimitMinor: draft ? Number(draft) * 100 : null } : m))); setEditing(null) }
  const changeRole = (id: string, role: OrgMember['role']) => setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id))
  const removing = members.find((m) => m.id === removeId)

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('team.title')}</h2>
        <button onClick={() => setInviteOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('team.invite')}</button>
      </div>
      <p className="font-sans text-data text-ink-muted">{t('orgadmin.teamNote')}</p>
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
                <div className="text-end hidden sm:block min-w-[116px]">
                  <span className="block font-sans text-caption text-ink-subtle uppercase tracking-wide">{t('team.perOrderLimit')}</span>
                  {editing === m.id ? (
                    <span className="inline-flex items-center gap-xs">
                      <input value={draft} onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))} className="input py-1 w-24 text-end" inputMode="numeric" />
                      <button onClick={() => save(m.id)} className="text-success"><Check size={16} /></button>
                    </span>
                  ) : (
                    <button onClick={() => startEdit(m)} className="inline-flex items-center gap-xs font-sans text-data text-ink hover:text-primary-hover">
                      {m.perOrderLimitMinor ? money(m.perOrderLimitMinor) : t('team.noLimit')}
                      <Pencil size={12} className="text-ink-subtle" />
                    </button>
                  )}
                </div>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as OrgMember['role'])}
                  className={cn('rounded-md border border-hairline-strong bg-surface-1 font-sans text-caption uppercase tracking-[0.06em] py-1.5 ps-2 pe-7 cursor-pointer', `text-${roleVariant[m.role] === 'gold' ? 'primary-hover' : 'ink'}`)}
                  aria-label={t('team.roleField')}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{t(`team.role.${r}`)}</option>)}
                </select>
                <StatusBadge variant={m.status === 'active' ? 'success' : 'neutral'}>{t(`team.status.${m.status}`)}</StatusBadge>
                <button
                  onClick={() => setRemoveId(m.id)}
                  disabled={m.role === 'b2b_admin'}
                  className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label={t('team.remove')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onAdd={(m) => setMembers((prev) => [...prev, m])} />
      <Confirm
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        title={t('team.remove')}
        body={removing ? `${t('team.removeBody')} — ${pick(removing.name)}` : ''}
        onConfirm={() => { if (removeId) removeMember(removeId); setRemoveId(null) }}
      />
    </div>
  )
}

function InviteMemberModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (m: OrgMember) => void }) {
  const { t } = useLocale()
  const [form, setForm] = useState({ name: '', email: '', role: 'buyer' as OrgMember['role'], limit: '', costCenter: '' })
  const valid = form.name.trim() && /.+@.+\..+/.test(form.email)
  const submit = () => {
    onAdd({
      id: `m-${Date.now()}`,
      name: { en: form.name, ar: form.name },
      email: form.email,
      role: form.role,
      perOrderLimitMinor: form.limit ? Number(form.limit) * 100 : null,
      costCenter: form.costCenter || '—',
      status: 'invited',
    })
    setForm({ name: '', email: '', role: 'buyer', limit: '', costCenter: '' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={t('business.tab.team')} title={t('team.inviteTitle')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('team.send')}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <Field label={t('team.name')} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label={t('team.email')} value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" placeholder="name@company.sa" />
        <div className="flex flex-col sm:flex-row gap-md">
          <label className="flex flex-col gap-xs flex-1">
            <span className="label">{t('team.roleField')}</span>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as OrgMember['role'] }))} className="input cursor-pointer">
              {ROLES.map((r) => <option key={r} value={r}>{t(`team.role.${r}`)}</option>)}
            </select>
          </label>
          <Field label={t('team.costCenter')} value={form.costCenter} onChange={(v) => setForm((f) => ({ ...f, costCenter: v }))} />
        </div>
        <Field label={`${t('team.perOrderLimit')} (SAR)`} value={form.limit} onChange={(v) => setForm((f) => ({ ...f, limit: v.replace(/\D/g, '') }))} placeholder="15000" />
      </div>
    </Modal>
  )
}

/* ── Credit ── */
function Credit() {
  const { t, pick, money, locale } = useLocale()
  const available = availableCreditMinor(org)
  const termLabel: Record<string, { en: string; ar: string }> = {
    net_15: { en: 'Net 15', ar: 'صافي ١٥' }, net_30: { en: 'Net 30', ar: 'صافي ٣٠' }, net_60: { en: 'Net 60', ar: 'صافي ٦٠' }, prepaid: { en: 'Prepaid', ar: 'مسبق' },
  }
  const pct = (n: number) => `${Math.min(100, (n / org.credit.limitMinor) * 100)}%`
  const downloadStatement = (id: string) => {
    const s = org.statements.find((x) => x.id === id)!
    const doc = { period: s.period.en, opening_minor: s.openingMinor, charges_minor: s.chargesMinor, payments_minor: s.paymentsMinor, closing_minor: s.closingMinor, currency: 'SAR' }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `statement-${s.id}.json`; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md md:grid-cols-4">
        <Stat label={t('credit.limit')} value={money(org.credit.limitMinor)} />
        <Stat label={t('credit.available')} value={money(available)} tone="gold" />
        <Stat label={t('credit.reserved')} value={money(org.credit.reservedMinor)} />
        <Stat label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
      </div>
      <div className="card p-lg flex flex-col gap-md">
        <div className="h-3 rounded-pill bg-canvas-cool overflow-hidden flex">
          <span className="h-full bg-danger/70" style={{ width: pct(org.credit.outstandingMinor) }} />
          <span className="h-full bg-primary/70" style={{ width: pct(org.credit.reservedMinor) }} />
          <span className="h-full bg-success/60" style={{ width: pct(available) }} />
        </div>
        <div className="flex flex-wrap items-center gap-md font-sans text-caption text-ink-muted">
          <span className="inline-flex items-center gap-xs"><FileText size={14} className="text-ink-subtle" /> {t('credit.terms')}: <strong className="text-ink">{pick(termLabel[org.credit.paymentTerms])}</strong></span>
          <span className="inline-flex items-center gap-xs"><TrendingUp size={14} className="text-ink-subtle" /> {t('credit.nextReview')}: <strong className="text-ink">{new Date(org.credit.nextReview).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
        </div>
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
                <button onClick={() => downloadStatement(s.id)} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> PDF</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ── Orders (read oversight; approvals belong to the approver) ── */
function Orders() {
  const { t, pick, money, locale } = useLocale()
  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('border.title')}</h2>
      <div className="flex flex-col gap-md">
        {accountOrders.map((o) => (
          <div key={o.orderNo} className="card p-lg flex flex-wrap items-center justify-between gap-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-sm">
                <span className="font-sans text-data text-ink">{o.orderNo}</span>
                <StatusBadge variant={orderVariant[o.status]}>{t(`orders.status.${o.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">
                {t('border.buyer')}: {pick(o.buyer)} · {pick(o.summary)} · {new Date(o.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
              {o.status === 'awaiting_approval' && <p className="font-sans text-caption text-danger mt-xxs">{t('orgadmin.withApprover')}</p>}
            </div>
            <span className="font-serif text-card-title text-ink tabular-nums">{money(o.totalMinor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Quotes ── */
function Quotes() {
  const { t, pick, money, locale } = useLocale()
  const variant: Record<string, 'gold' | 'success' | 'neutral' | 'danger'> = { sent: 'gold', accepted: 'success', converted: 'success', draft: 'neutral', expired: 'danger' }
  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('quotes.title')}</h2>
      <div className="flex flex-col gap-md">
        {quoteData.map((q) => (
          <div key={q.id} className="card p-lg flex flex-col sm:flex-row sm:items-center gap-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm">
                <span className="font-sans text-data text-ink">{q.ref}</span>
                <StatusBadge variant={variant[q.status]}>{t(`quotes.status.${q.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-muted mt-xxs truncate">{pick(q.note)}</p>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">{q.lineCount} {t('quotes.lines')} · {t('quotes.validUntil')} {new Date(q.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}</p>
            </div>
            <span className="font-serif text-card-title text-ink tabular-nums shrink-0">{money(q.totalMinor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Gifting ── */
function Gifting() {
  const { t, pick, locale } = useLocale()
  const [batches, setBatches] = useState<GiftBatch[]>(batchData)
  const [open, setOpen] = useState(false)
  const variant: Record<string, 'gold' | 'success' | 'neutral'> = { draft: 'neutral', processing: 'gold', shipped: 'gold', delivered: 'success' }
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('gift.batches')}</h2>
        <button onClick={() => setOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('gift.newBatch')}</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-md">
        {batches.map((b) => (
          <div key={b.id} className="card p-lg flex flex-col gap-sm animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-card-title text-ink">{pick(b.occasion)}</h3>
              <StatusBadge variant={variant[b.status]}>{t(`gift.batchStatus.${b.status}`)}</StatusBadge>
            </div>
            <p className="font-sans text-data text-ink-muted"><span className="font-serif text-headline text-ink tabular-nums">{b.recipientCount}</span> {t('gift.recipients')}</p>
            <p className="font-sans text-caption text-ink-subtle">{new Date(b.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        ))}
      </div>
      <NewBatchModal open={open} onClose={() => setOpen(false)} onAdd={(b) => setBatches((prev) => [b, ...prev])} />
    </div>
  )
}

function NewBatchModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (b: GiftBatch) => void }) {
  const { t } = useLocale()
  const [occasion, setOccasion] = useState('')
  const [count, setCount] = useState('100')
  const valid = occasion.trim() && Number(count) > 0
  const submit = () => {
    onAdd({ id: `gb-${Date.now()}`, occasion: { en: occasion, ar: occasion }, recipientCount: Number(count) || 0, status: 'draft', createdAt: '2026-06-21' })
    setOccasion(''); setCount('100'); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={t('business.tab.gifting')} title={t('gift.newBatchTitle')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('gift.create')}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <Field label={t('gift.occasion')} value={occasion} onChange={setOccasion} placeholder="Eid Al-Adha" />
        <Field label={t('gift.recipientCount')} value={count} onChange={(v) => setCount(v.replace(/\D/g, ''))} placeholder="240" />
        <div className="rounded-md bg-surface-2 border border-hairline border-dashed p-md text-center">
          <p className="font-sans text-caption text-ink-subtle">{t('gift.uploadRecipients')}</p>
        </div>
      </div>
    </Modal>
  )
}

/* ── Settings ── */
function SettingsPanel() {
  const { t, pick, locale } = useLocale()
  const [addresses, setAddresses] = useState<OrgAddress[]>(addressData)
  const [addOpen, setAddOpen] = useState(false)
  const sourceLabel: Record<string, string> = { wathq: 'Wathq', zatca: 'ZATCA', nafath: 'Nafath' }
  const checkLabel: Record<string, { en: string; ar: string }> = {
    commercial_registration: { en: 'Commercial Registration', ar: 'السجل التجاري' },
    vat: { en: 'VAT registration', ar: 'التسجيل الضريبي' },
    authorized_signatory: { en: 'Authorized signatory', ar: 'المفوّض بالتوقيع' },
  }
  return (
    <div className="flex flex-col gap-lg">
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

      <div className="flex items-center justify-between gap-md">
        <h3 className="font-serif text-card-title text-ink">{t('orgadmin.addresses')}</h3>
        <button onClick={() => setAddOpen(true)} className={buttonClass('secondary', 'sm')}><Plus size={15} /> {t('addr.add')}</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-md">
        {addresses.map((a) => (
          <div key={a.id} className={cn('card p-lg flex flex-col gap-sm', a.isDefault && 'ring-1 ring-primary/30')}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink">
                <MapPin size={16} className="text-primary-hover" /> {pick(a.label)}
              </span>
              <StatusBadge variant="neutral">{a.type === 'billing' ? t('addr.billing') : t('addr.shipping')}</StatusBadge>
            </div>
            <p className="font-sans text-data text-ink-muted">{pick(a.district)}, {pick(a.city)} · {a.shortAddress}</p>
            {a.isDefault && <StatusBadge variant="gold" className="self-start">{t('addr.default')}</StatusBadge>}
          </div>
        ))}
      </div>

      <AddAddressModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(a) => setAddresses((prev) => [...prev, a])} />
    </div>
  )
}

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

/* ── shared ── */
function Confirm({ open, onClose, title, body, onConfirm }: { open: boolean; onClose: () => void; title: string; body: string; onConfirm: () => void }) {
  const { t } = useLocale()
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={onConfirm} className="btn btn-sm bg-danger text-on-danger hover:bg-danger/90">{t('common.confirm')}</button>
      </>}>
      <p className="font-sans text-body text-ink-muted leading-relaxed">{body}</p>
    </Modal>
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

function Stat({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'gold' | 'danger' }) {
  const color = tone === 'gold' ? 'text-primary-hover' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', tone === 'gold' && 'ring-1 ring-primary/30 bg-primary/[0.04]')}>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', color)}>{value}</span>
    </div>
  )
}

function LedgerRow({ entry, showBalance }: { entry: CreditLedgerEntry; showBalance?: boolean }) {
  const { pick, money, locale } = useLocale()
  const typeLabel: Record<CreditLedgerEntry['type'], { en: string; ar: string }> = {
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
