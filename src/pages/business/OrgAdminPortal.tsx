import { useMemo, useState } from 'react'
import {
  LayoutGrid, Users, SlidersHorizontal, Landmark, Package, BarChart3, Gift, Building2,
  ShieldCheck, BadgeCheck, Download, ArrowUpRight, ArrowDownRight, MapPin, Plus, Check,
  Pencil, Trash2, TrendingUp, AlertTriangle, FileText, Wallet, Lock, ArrowRight, Mail,
  Plug, ClipboardCheck, CornerDownRight,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { organization, availableCreditMinor } from '@/data/organization'
import type { CreditLedgerEntry, Bilingual } from '@/data/types'
import {
  members as memberData, accountOrders, giftBatches as batchData,
  orgAddresses as addressData, orgVerification, costCenters as ccData, orgPolicy as policyData,
  spendByMonth, spendByCategory, rolePermissions, capabilityOrder, memberById,
  type OrgMember, type AccountOrder, type OrgAddress, type GiftBatch, type CostCenter,
  type OrgPolicy, type Capability,
} from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { AreaTrend, Sparkline, UtilizationGauge, RankedBars, TrendPill } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

const org = organization
const ROLES: OrgMember['role'][] = ['b2b_admin', 'approver', 'buyer', 'viewer']
const roleAccent: Record<OrgMember['role'], 'gold' | 'success' | 'neutral'> = { b2b_admin: 'gold', approver: 'success', buyer: 'neutral', viewer: 'neutral' }
const orderVariant: Record<AccountOrder['status'], 'gold' | 'success' | 'danger' | 'neutral'> = {
  awaiting_approval: 'danger', confirmed: 'gold', processing: 'gold', shipped: 'gold', delivered: 'success', rejected: 'neutral',
}

/** Budget burn → traffic-light tone. */
function budgetTone(consumed: number, budget: number): 'success' | 'gold' | 'danger' {
  const r = consumed / budget
  return r >= 0.9 ? 'danger' : r >= 0.75 ? 'gold' : 'success'
}

const TABS = ['overview', 'people', 'controls', 'credit', 'orders', 'analytics', 'gifting', 'account'] as const
type Tab = (typeof TABS)[number]

export function OrgAdminPortal() {
  const { t, pick } = useLocale()
  const [activeRaw, setActive] = useTab('overview')
  const active = (TABS.includes(activeRaw as Tab) ? activeRaw : 'overview') as Tab

  const verifiedCount = orgVerification.filter((v) => v.status === 'approved').length

  const tabs: TabDef[] = [
    { id: 'overview', label: t('business.tab.overview'), icon: LayoutGrid },
    { id: 'people', label: t('oa.tab.people'), icon: Users },
    { id: 'controls', label: t('oa.tab.controls'), icon: SlidersHorizontal },
    { id: 'credit', label: t('business.tab.credit'), icon: Landmark },
    { id: 'orders', label: t('business.tab.orders'), icon: Package },
    { id: 'analytics', label: t('oa.tab.analytics'), icon: BarChart3 },
    { id: 'gifting', label: t('business.tab.gifting'), icon: Gift },
    { id: 'account', label: t('oa.tab.account'), icon: Building2 },
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
      headerExtra={
        <span className="hidden sm:inline-flex items-center gap-xs rounded-pill bg-success/12 text-success px-3 py-1.5 font-sans text-caption">
          <BadgeCheck size={14} /> {verifiedCount}/3 {t('orgadmin.verified')}
        </span>
      }
    >
      {active === 'overview' && <Overview onTab={setActive} />}
      {active === 'people' && <People />}
      {active === 'controls' && <SpendControls />}
      {active === 'credit' && <Credit />}
      {active === 'orders' && <Orders />}
      {active === 'analytics' && <Analytics />}
      {active === 'gifting' && <Gifting />}
      {active === 'account' && <Account />}
    </AccountShell>
  )
}

/* ═══════════════ Overview — command centre ═══════════════ */
function Overview({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick, money, locale } = useLocale()
  const available = availableCreditMinor(org)
  const pending = accountOrders.filter((o) => o.status === 'awaiting_approval')
  const activeMembers = memberData.filter((m) => m.status === 'active').length
  const totalBudget = ccData.reduce((s, c) => s + c.budgetMinor, 0)
  const totalConsumed = ccData.reduce((s, c) => s + c.consumedMinor, 0)
  const budgetPct = Math.round((totalConsumed / totalBudget) * 100)
  const spendSeries = spendByMonth.map((p) => p.amountMinor)
  const ytd = spendSeries.reduce((s, x) => s + x, 0)
  const mom = Math.round(((spendByMonth[6].amountMinor - spendByMonth[5].amountMinor) / spendByMonth[5].amountMinor) * 100)

  // What an admin should act on this morning.
  const vat = orgVerification.find((v) => v.check === 'vat')
  const overBudget = ccData.filter((c) => c.consumedMinor / c.budgetMinor >= 0.9)
  const alerts: { tone: 'danger' | 'gold'; icon: typeof AlertTriangle; text: string; cta: string; to: Tab }[] = []
  if (pending.length) alerts.push({ tone: 'danger', icon: ClipboardCheck, text: `${pending.length} ${t('oa.alert.pending')}`, cta: t('oa.alert.review'), to: 'orders' })
  overBudget.forEach((c) => alerts.push({ tone: 'gold', icon: Wallet, text: `${pick(c.name)} · ${Math.round((c.consumedMinor / c.budgetMinor) * 100)}% ${t('oa.alert.ofBudget')}`, cta: t('oa.alert.adjust'), to: 'controls' }))
  if (vat) alerts.push({ tone: 'gold', icon: ShieldCheck, text: `${t('oa.alert.vatExpires')} ${new Date(vat.expiresAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short', year: 'numeric' })}`, cta: t('oa.alert.view'), to: 'account' })
  alerts.push({ tone: 'gold', icon: TrendingUp, text: `${t('oa.alert.creditReview')} ${new Date(org.credit.nextReview).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}`, cta: t('oa.alert.view'), to: 'credit' })

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
      <div className="grid gap-md grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('credit.available')} value={money(available)} tone="gold" />
        <Kpi label={t('credit.outstanding')} value={money(org.credit.outstandingMinor)} tone="danger" />
        <Kpi label={t('oa.kpi.spendYtd')} value={money(ytd)} spark={spendSeries} />
        <Kpi label={t('orders.status.awaiting_approval')} value={String(pending.length)} alert={pending.length > 0} />
        <Kpi label={t('oa.kpi.activeMembers')} value={String(activeMembers)} />
        <Kpi label={t('oa.kpi.budgetUsed')} value={`${budgetPct}%`} alert={budgetPct > 85} />
      </div>

      {/* trend + alerts */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-lg items-start">
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
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
            <AlertTriangle size={16} className="text-primary-hover" />
            <h3 className="font-serif text-card-title text-ink">{t('oa.needsAttention')}</h3>
          </div>
          <ul className="divide-y divide-hairline">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-center gap-sm px-lg py-md">
                <span className={cn('grid place-items-center w-8 h-8 rounded-md shrink-0', a.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary-hover')}>
                  <a.icon size={15} />
                </span>
                <p className="flex-1 font-sans text-data text-ink leading-snug">{a.text}</p>
                <button onClick={() => onTab(a.to)} className="font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink shrink-0">{a.cta}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* budget burn */}
      <div className="card p-lg flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-card-title text-ink">{t('oa.budgetBurn')}</h3>
          <button onClick={() => onTab('controls')} className="link-gold">{t('cta.viewAll')} <ArrowRight size={14} className="rtl:rotate-180" /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-xl gap-y-md">
          {ccData.map((c) => <BudgetBar key={c.id} cc={c} />)}
        </div>
      </div>

      {/* recent ledger */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between">
          <h3 className="font-serif text-card-title text-ink">{t('business.recentActivity')}</h3>
          <button onClick={() => onTab('credit')} className="link-gold">{t('cta.viewAll')}</button>
        </div>
        <ul className="divide-y divide-hairline">{org.ledger.slice(0, 4).map((e) => <LedgerRow key={e.id} entry={e} />)}</ul>
      </div>
    </div>
  )
}

/* ═══════════════ People — members, invitations, permissions ═══════════════ */
function People() {
  const { t, pick, money } = useLocale()
  const [members, setMembers] = useState<OrgMember[]>(memberData)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const activeMembers = members.filter((m) => m.status === 'active')
  const invited = members.filter((m) => m.status === 'invited')
  const removing = members.find((m) => m.id === removeId)

  const startEdit = (m: OrgMember) => { setEditing(m.id); setDraft(m.perOrderLimitMinor ? String(Math.round(m.perOrderLimitMinor / 100)) : '') }
  const save = (id: string) => { setMembers((p) => p.map((m) => (m.id === id ? { ...m, perOrderLimitMinor: draft ? Number(draft) * 100 : null } : m))); setEditing(null) }
  const changeRole = (id: string, role: OrgMember['role']) => setMembers((p) => p.map((m) => (m.id === id ? { ...m, role } : m)))
  const removeMember = (id: string) => setMembers((p) => p.filter((m) => m.id !== id))

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink">{t('oa.tab.people')}</h2>
          <p className="font-sans text-data text-ink-muted mt-xxs">{t('orgadmin.teamNote')}</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className={buttonClass('primary', 'sm', 'shrink-0')}><Plus size={15} /> {t('team.invite')}</button>
      </div>

      {/* active members */}
      <div className="card overflow-hidden">
        <div className="px-lg py-sm bg-surface-2 border-b border-hairline grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_0.8fr_0.9fr_0.6fr_auto] gap-md font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">
          <span>{t('oa.col.member')}</span>
          <span className="hidden sm:block">{t('team.costCenter')}</span>
          <span className="hidden sm:block">{t('team.roleField')}</span>
          <span className="hidden sm:block text-end">{t('team.perOrderLimit')}</span>
          <span className="text-end">{t('oa.col.actions')}</span>
        </div>
        <ul className="divide-y divide-hairline">
          {activeMembers.map((m) => (
            <li key={m.id} className="px-lg py-md grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_0.8fr_0.9fr_0.6fr_auto] gap-md items-center">
              <div className="flex items-center gap-sm min-w-0">
                <span className="grid place-items-center w-9 h-9 rounded-pill bg-primary/10 border border-hairline font-serif text-card-title text-primary-hover shrink-0">{pick(m.name).charAt(0)}</span>
                <div className="min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(m.name)}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate">{m.email}</p>
                </div>
              </div>
              <span className="hidden sm:block font-sans text-caption text-ink-muted">{m.costCenter}</span>
              <div className="hidden sm:block">
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as OrgMember['role'])}
                  className="rounded-md border border-hairline-strong bg-surface-1 font-sans text-caption py-1.5 ps-2 pe-7 cursor-pointer text-ink hover:border-ink/40"
                  aria-label={t('team.roleField')}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{t(`team.role.${r}`)}</option>)}
                </select>
              </div>
              <div className="hidden sm:block text-end">
                {editing === m.id ? (
                  <span className="inline-flex items-center gap-xs">
                    <input value={draft} onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))} className="input py-1 w-20 text-end" inputMode="numeric" autoFocus />
                    <button onClick={() => save(m.id)} className="text-success" aria-label={t('addr.save')}><Check size={16} /></button>
                  </span>
                ) : (
                  <button onClick={() => startEdit(m)} className="inline-flex items-center gap-xs font-sans text-data text-ink hover:text-primary-hover tabular-nums">
                    {m.perOrderLimitMinor ? money(m.perOrderLimitMinor) : t('team.noLimit')}
                    <Pencil size={11} className="text-ink-subtle" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-end gap-xs">
                <span className="sm:hidden"><StatusBadge variant={roleAccent[m.role]}>{t(`team.role.${m.role}`)}</StatusBadge></span>
                <button
                  onClick={() => setRemoveId(m.id)}
                  disabled={m.role === 'b2b_admin'}
                  className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label={t('team.remove')}
                  title={m.role === 'b2b_admin' ? t('oa.adminProtected') : t('team.remove')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* pending invitations */}
      {invited.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
            <Mail size={16} className="text-ink-subtle" />
            <h3 className="font-serif text-card-title text-ink">{t('oa.pendingInvites')}</h3>
            <StatusBadge variant="neutral" className="ms-auto">{invited.length}</StatusBadge>
          </div>
          <ul className="divide-y divide-hairline">
            {invited.map((m) => (
              <li key={m.id} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-9 h-9 rounded-pill bg-surface-2 border border-dashed border-hairline-strong text-ink-subtle shrink-0"><Mail size={15} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(m.name)}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate">{m.email} · {t(`team.role.${m.role}`)}</p>
                </div>
                <StatusBadge variant="gold">{t('team.status.invited')}</StatusBadge>
                <button onClick={() => removeMember(m.id)} className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle hover:text-danger">{t('oa.revoke')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* permission matrix */}
      <PermissionMatrix />

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} onAdd={(m) => setMembers((p) => [...p, m])} />
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

function PermissionMatrix() {
  const { t } = useLocale()
  return (
    <div className="card overflow-hidden">
      <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
        <Lock size={16} className="text-ink-subtle" />
        <h3 className="font-serif text-card-title text-ink">{t('oa.permissions')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle font-medium px-lg py-sm">{t('oa.capability')}</th>
              {ROLES.map((r) => (
                <th key={r} className="font-sans text-caption uppercase tracking-wide text-ink-subtle font-medium px-sm py-sm text-center">{t(`team.role.${r}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {capabilityOrder.map((cap: Capability) => (
              <tr key={cap} className="border-b border-hairline last:border-0">
                <td className="px-lg py-sm font-sans text-data text-ink">{t(`oa.cap.${cap}`)}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-sm py-sm text-center">
                    {rolePermissions[r][cap]
                      ? <Check size={16} className="inline text-success" aria-label={t('oa.allowed')} />
                      : <span className="inline-block w-3 h-px bg-hairline-strong align-middle" aria-label={t('oa.denied')} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════ Spend controls — policy + budgets ═══════════════ */
function SpendControls() {
  const { t, pick } = useLocale()
  const [policy, setPolicy] = useState<OrgPolicy>(policyData)
  const [budgets, setBudgets] = useState<CostCenter[]>(ccData)
  const [saved, setSaved] = useState(false)
  const [editCc, setEditCc] = useState<string | null>(null)

  const sar = (minor: number) => String(Math.round(minor / 100))
  const setField = (k: keyof OrgPolicy, v: number | boolean) => { setPolicy((p) => ({ ...p, [k]: v })); setSaved(false) }

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="font-serif text-headline text-ink">{t('oa.tab.controls')}</h2>
        <p className="font-sans text-data text-ink-muted mt-xxs">{t('oa.controlsNote')}</p>
      </div>

      {/* approval policy + live chain */}
      <div className="card p-lg flex flex-col gap-lg">
        <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><ClipboardCheck size={18} className="text-primary-hover" /> {t('oa.approvalPolicy')}</h3>

        <ApprovalChain policy={policy} />

        <div className="grid sm:grid-cols-3 gap-md pt-sm border-t border-hairline">
          <PolicyNumber label={t('oa.autoApproveBelow')} hint={t('oa.autoApproveHint')} value={sar(policy.autoApproveBelowMinor)} onChange={(v) => setField('autoApproveBelowMinor', Number(v) * 100)} />
          <PolicyNumber label={t('oa.dualControlAbove')} hint={t('oa.dualControlHint')} value={sar(policy.dualControlAboveMinor)} onChange={(v) => setField('dualControlAboveMinor', Number(v) * 100)} />
          <PolicyNumber label={t('oa.requirePOAbove')} hint={t('oa.requirePOHint')} value={sar(policy.requirePOAboveMinor)} onChange={(v) => setField('requirePOAboveMinor', Number(v) * 100)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-md">
          <Toggle label={t('oa.restrictCatalogue')} hint={t('oa.restrictCatalogueHint')} on={policy.restrictToCatalogue} onToggle={() => setField('restrictToCatalogue', !policy.restrictToCatalogue)} />
          <PolicyNumber label={t('oa.defaultLimit')} hint={t('oa.defaultLimitHint')} value={sar(policy.newMemberDefaultLimitMinor)} onChange={(v) => setField('newMemberDefaultLimitMinor', Number(v) * 100)} />
        </div>

        <div className="flex items-center gap-md pt-sm border-t border-hairline">
          <button onClick={() => setSaved(true)} className={buttonClass('primary', 'sm')}>{t('oa.savePolicy')}</button>
          {saved && <span className="inline-flex items-center gap-xs font-sans text-caption text-success animate-fade-up"><Check size={14} /> {t('oa.policySaved')}</span>}
        </div>
      </div>

      {/* cost-centre budgets */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-card-title text-ink">{t('oa.costCentres')}</h3>
        <span className="font-sans text-caption text-ink-subtle">{t('oa.fyBudget')}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-md">
        {budgets.map((c) => (
          <div key={c.id} className="card p-lg flex flex-col gap-sm">
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <h4 className="font-serif text-card-title text-ink">{pick(c.name)} <span className="font-sans text-caption text-ink-subtle">· {c.code}</span></h4>
                <p className="font-sans text-caption text-ink-subtle">{t('oa.owner')}: {pick(memberById(c.ownerId)?.name ?? { en: '—', ar: '—' })}</p>
              </div>
              <button onClick={() => setEditCc(c.id)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-primary-hover hover:bg-primary/5" aria-label={t('oa.adjustBudget')}><Pencil size={14} /></button>
            </div>
            <BudgetBar cc={c} />
          </div>
        ))}
      </div>

      <EditBudgetModal
        cc={budgets.find((c) => c.id === editCc) ?? null}
        onClose={() => setEditCc(null)}
        onSave={(id, budgetMinor) => { setBudgets((p) => p.map((c) => (c.id === id ? { ...c, budgetMinor } : c))); setEditCc(null) }}
      />
    </div>
  )
}

function ApprovalChain({ policy }: { policy: OrgPolicy }) {
  const { t, money } = useLocale()
  const stages = [
    { icon: Wallet, label: t('oa.chain.auto'), sub: `≤ ${money(policy.autoApproveBelowMinor)}`, tone: 'success' as const },
    { icon: ClipboardCheck, label: t('oa.chain.approver'), sub: `> ${money(policy.autoApproveBelowMinor)}`, tone: 'gold' as const },
    { icon: Lock, label: t('oa.chain.dual'), sub: `≥ ${money(policy.dualControlAboveMinor)}`, tone: 'danger' as const },
  ]
  const toneCls = { success: 'bg-success/10 text-success border-success/30', gold: 'bg-primary/10 text-primary-hover border-primary/30', danger: 'bg-danger/10 text-danger border-danger/30' }
  return (
    <div className="flex items-stretch gap-xs overflow-x-auto pb-xs">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-xs shrink-0">
          <div className={cn('flex flex-col gap-xxs rounded-lg border p-md min-w-[150px]', toneCls[s.tone])}>
            <s.icon size={18} />
            <span className="font-sans text-data font-medium">{s.label}</span>
            <span className="font-sans text-caption tabular-nums opacity-90">{s.sub}</span>
          </div>
          {i < stages.length - 1 && <ArrowRight size={16} className="text-ink-subtle rtl:rotate-180 shrink-0" />}
        </div>
      ))}
    </div>
  )
}

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

/* ═══════════════ Orders — org-wide oversight ═══════════════ */
function Orders() {
  const { t, pick, money, locale } = useLocale()
  const [filter, setFilter] = useState<'all' | 'awaiting_approval' | 'processing' | 'delivered'>('all')
  const filters: typeof filter[] = ['all', 'awaiting_approval', 'processing', 'delivered']
  const shown = filter === 'all' ? accountOrders : accountOrders.filter((o) => o.status === filter)

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('oa.allOrders')}</h2>
        <div className="flex items-center gap-xs flex-wrap">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-pill px-3 py-1.5 font-sans text-caption transition-colors border',
                filter === f ? 'bg-ink text-ink-on-dark border-ink' : 'bg-surface-1 text-ink-muted border-hairline-strong hover:border-ink/40')}>
              {f === 'all' ? t('oa.filterAll') : t(`orders.status.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-md">
        {shown.map((o) => (
          <div key={o.orderNo} className="card p-lg flex flex-wrap items-center justify-between gap-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-sm">
                <span className="font-sans text-data text-ink">{o.orderNo}</span>
                <StatusBadge variant={orderVariant[o.status]}>{t(`orders.status.${o.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">
                {t('border.buyer')}: {pick(o.buyer)} · {pick(o.summary)} · {new Date(o.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
              {o.status === 'awaiting_approval' && (
                <p className="inline-flex items-center gap-xs font-sans text-caption text-danger mt-xxs"><CornerDownRight size={13} /> {t('orgadmin.withApprover')}</p>
              )}
            </div>
            <span className="font-serif text-card-title text-ink tabular-nums">{money(o.totalMinor)}</span>
          </div>
        ))}
        {shown.length === 0 && <p className="font-sans text-data text-ink-subtle py-xl text-center">{t('oa.noOrders')}</p>}
      </div>
    </div>
  )
}

/* ═══════════════ Analytics ═══════════════ */
function Analytics() {
  const { t, pick, money } = useLocale()
  const ytd = spendByCategory.reduce((s, c) => s + c.amountMinor, 0)

  // spend by buyer, derived from the order book (committed orders only)
  const byBuyer = useMemo(() => {
    const map = new Map<string, number>()
    accountOrders.filter((o) => o.status !== 'rejected').forEach((o) => map.set(o.buyerId, (map.get(o.buyerId) ?? 0) + o.totalMinor))
    return [...map.entries()].map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v)
  }, [])
  const buyerTotal = byBuyer.reduce((s, b) => s + b.v, 0)

  const exportReport = () => {
    const report = {
      organization: org.legalName.en, generated: '2026-06-21', currency: 'SAR',
      ytd_spend_minor: ytd,
      by_category: spendByCategory.map((c) => ({ category: c.name.en, amount_minor: c.amountMinor })),
      by_cost_center: ccData.map((c) => ({ code: c.code, budget_minor: c.budgetMinor, consumed_minor: c.consumedMinor })),
      by_month: spendByMonth.map((m) => ({ month: m.month.en, amount_minor: m.amountMinor })),
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'jaz-spend-report.json'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink">{t('oa.tab.analytics')}</h2>
          <p className="font-sans text-data text-ink-muted mt-xxs">{t('oa.analyticsNote')}</p>
        </div>
        <button onClick={exportReport} className={buttonClass('secondary', 'sm', 'shrink-0')}><Download size={15} /> {t('oa.export')}</button>
      </div>

      <div className="grid gap-md sm:grid-cols-3">
        <Kpi label={t('oa.kpi.spendYtd')} value={money(ytd)} tone="gold" />
        <Kpi label={t('oa.avgOrder')} value={money(Math.round(buyerTotal / Math.max(1, accountOrders.length)))} />
        <Kpi label={t('oa.topCategory')} value={pick(spendByCategory[0].name)} small />
      </div>

      <div className="grid lg:grid-cols-2 gap-lg items-start">
        <div className="card p-lg flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{t('oa.byCategory')}</h3>
          <RankedBars rows={spendByCategory.map((c) => ({ label: pick(c.name), value: c.amountMinor, display: money(c.amountMinor) }))} />
        </div>
        <div className="card p-lg flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{t('oa.byDepartment')}</h3>
          <RankedBars rows={ccData.map((c) => ({ label: pick(c.name), value: c.consumedMinor, display: money(c.consumedMinor), tone: budgetTone(c.consumedMinor, c.budgetMinor) }))} />
        </div>
      </div>

      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink">{t('oa.byBuyer')}</h3>
        <RankedBars
          accent="#8a6b3f"
          rows={byBuyer.map((b) => ({ label: pick(memberById(b.id)?.name ?? { en: b.id, ar: b.id }), value: b.v, display: money(b.v) }))}
        />
      </div>
    </div>
  )
}

/* ═══════════════ Gifting ═══════════════ */
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {batches.map((b) => (
          <div key={b.id} className="card p-lg flex flex-col gap-sm animate-fade-up">
            <div className="flex items-center justify-between">
              <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover"><Gift size={18} /></span>
              <StatusBadge variant={variant[b.status]}>{t(`gift.batchStatus.${b.status}`)}</StatusBadge>
            </div>
            <h3 className="font-serif text-card-title text-ink">{pick(b.occasion)}</h3>
            <p className="font-sans text-data text-ink-muted"><span className="font-serif text-headline text-ink tabular-nums">{b.recipientCount}</span> {t('gift.recipients')}</p>
            <p className="font-sans text-caption text-ink-subtle">{new Date(b.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        ))}
      </div>
      <NewBatchModal open={open} onClose={() => setOpen(false)} onAdd={(b) => setBatches((p) => [b, ...p])} />
    </div>
  )
}

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
function InviteMemberModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (m: OrgMember) => void }) {
  const { t } = useLocale()
  const [form, setForm] = useState({ name: '', email: '', role: 'buyer' as OrgMember['role'], limit: '', costCenter: '' })
  const valid = form.name.trim() && /.+@.+\..+/.test(form.email)
  const submit = () => {
    onAdd({
      id: `m-${Date.now()}`, name: { en: form.name, ar: form.name }, email: form.email, role: form.role,
      perOrderLimitMinor: form.limit ? Number(form.limit) * 100 : null, costCenter: form.costCenter || '—', status: 'invited',
    })
    setForm({ name: '', email: '', role: 'buyer', limit: '', costCenter: '' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={t('oa.tab.people')} title={t('team.inviteTitle')}
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

function EditBudgetModal({ cc, onClose, onSave }: { cc: CostCenter | null; onClose: () => void; onSave: (id: string, budgetMinor: number) => void }) {
  const { t, pick } = useLocale()
  const [value, setValue] = useState('')
  const open = !!cc
  // seed the field the first time it opens for a given cost centre
  if (cc && value === '') setValue(String(Math.round(cc.budgetMinor / 100)))
  const close = () => { setValue(''); onClose() }
  return (
    <Modal open={open} onClose={close} size="sm" eyebrow={t('oa.costCentres')} title={cc ? `${pick(cc.name)} · ${cc.code}` : ''}
      footer={<>
        <button onClick={close} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={() => { if (cc) onSave(cc.id, Number(value) * 100); setValue('') }} className={buttonClass('primary', 'sm')}>{t('oa.saveBudget')}</button>
      </>}>
      <Field label={`${t('oa.annualBudget')} (SAR)`} value={value} onChange={(v) => setValue(v.replace(/\D/g, ''))} />
    </Modal>
  )
}

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

function BudgetBar({ cc }: { cc: CostCenter }) {
  const { t, pick, money } = useLocale()
  const pct = Math.min(100, Math.round((cc.consumedMinor / cc.budgetMinor) * 100))
  const tone = budgetTone(cc.consumedMinor, cc.budgetMinor)
  const barColor = tone === 'danger' ? 'bg-danger' : tone === 'gold' ? 'bg-primary' : 'bg-success'
  const txtColor = tone === 'danger' ? 'text-danger' : tone === 'gold' ? 'text-primary-hover' : 'text-success'
  return (
    <div className="flex flex-col gap-xxs">
      <div className="flex items-baseline justify-between gap-md">
        <span className="font-sans text-data text-ink truncate">{pick(cc.name)}</span>
        <span className={cn('font-sans text-caption tabular-nums shrink-0', txtColor)}>{pct}%</span>
      </div>
      <div className="h-2 rounded-pill bg-canvas-cool overflow-hidden">
        <span className={cn('block h-full rounded-pill', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-sans text-caption text-ink-subtle tabular-nums">{money(cc.consumedMinor)} / {money(cc.budgetMinor)} {t('oa.spent')}</span>
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

function PolicyNumber({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="font-sans text-data text-ink">{label}</span>
      <div className="relative">
        <span className="absolute inset-y-0 start-3 grid place-items-center font-sans text-caption text-ink-subtle pointer-events-none">SAR</span>
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="input ps-12 tabular-nums" />
      </div>
      <span className="font-sans text-caption text-ink-subtle">{hint}</span>
    </label>
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
