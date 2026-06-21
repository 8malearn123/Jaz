import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid, Wallet, FileText, Building2, Headset, PenTool, ScrollText, Users,
  CheckCircle2, X, Check, RefreshCw, QrCode, Lock, Mail, MessageCircle,
  MessagesSquare, ArrowRight, ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { personaList, type RoleId } from '@/data/roles'
import { roleIcons } from '@/components/roles/roleIcons'
import {
  creditApplications, invoices, tickets, articles, auditEvents, consentLedger, platformKpis, orgDirectory,
  type CreditApplication, type Invoice, type SupportTicket, type AuditEvent,
} from '@/data/staff'
import { products } from '@/data/products'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { StepUpGate } from '@/components/account/StepUpGate'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

type Section = 'overview' | 'credit' | 'invoicing' | 'accounts' | 'support' | 'catalogue' | 'audit' | 'users'

const SECTION_META: Record<Section, { key: string; icon: TabDef['icon'] }> = {
  overview: { key: 'admin.section.overview', icon: LayoutGrid },
  credit: { key: 'admin.section.credit', icon: Wallet },
  invoicing: { key: 'admin.section.invoicing', icon: FileText },
  accounts: { key: 'admin.section.accounts', icon: Building2 },
  support: { key: 'admin.section.support', icon: Headset },
  catalogue: { key: 'admin.section.catalogue', icon: PenTool },
  audit: { key: 'admin.section.audit', icon: ScrollText },
  users: { key: 'admin.section.users', icon: Users },
}

const ACCESS: Record<RoleId, Section[]> = {
  admin: ['overview', 'credit', 'invoicing', 'accounts', 'support', 'catalogue', 'audit', 'users'],
  finance: ['overview', 'credit', 'invoicing'],
  sales_agent: ['overview', 'accounts'],
  support_agent: ['overview', 'support'],
  content_editor: ['overview', 'catalogue'],
  auditor: ['overview', 'audit'],
  customer: [],
  b2b_buyer: [],
  b2b_approver: [],
  b2b_admin: [],
}

export function AdminConsole() {
  const { t, pick } = useLocale()
  const { role, persona, isStaff, isPrivileged } = useChannel()
  const allowed = ACCESS[role]
  const [activeRaw, setActive] = useTab('overview', 'section')

  if (!isStaff) return <Restricted />

  const active = (allowed.includes(activeRaw as Section) ? activeRaw : 'overview') as Section
  const tabs: TabDef[] = allowed.map((s) => ({ id: s, label: t(SECTION_META[s].key), icon: SECTION_META[s].icon }))

  return (
    <StepUpGate id={role} required={isPrivileged}>
      <AccountShell
        eyebrow={t('admin.platform')}
        title={t('admin.title')}
        subtitle={`${t('ov.signedInAs')}: ${pick(persona.name)} · ${pick(persona.roleLabel)}`}
        tone="dark"
        tabs={tabs}
        active={active}
        onSelect={setActive}
        headerExtra={
          <Link to="/roles" className={buttonClass('primary', 'sm')}>
            {t('role.switch')}
          </Link>
        }
      >
        {active === 'overview' && <OverviewPanel role={role} onSection={setActive} allowed={allowed} />}
        {active === 'credit' && <CreditPanel />}
        {active === 'invoicing' && <InvoicingPanel />}
        {active === 'accounts' && <AccountsPanel />}
        {active === 'support' && <SupportPanel />}
        {active === 'catalogue' && <CataloguePanel />}
        {active === 'audit' && <AuditPanel />}
        {active === 'users' && <UsersPanel />}
      </AccountShell>
    </StepUpGate>
  )
}

function Restricted() {
  const { t } = useLocale()
  return (
    <div className="container-narrow py-section min-h-[60vh] grid place-items-center text-center">
      <div className="flex flex-col items-center gap-md">
        <span className="grid place-items-center w-16 h-16 rounded-pill bg-danger/10 text-danger">
          <ShieldAlert size={30} />
        </span>
        <h1 className="font-serif text-headline text-ink">{t('admin.restricted')}</h1>
        <Link to="/roles" className={buttonClass('primary')}>
          {t('role.switch')} <ArrowRight size={15} className="rtl:rotate-180" />
        </Link>
      </div>
    </div>
  )
}

/* ───────────── Overview ───────────── */
function OverviewPanel({ role, onSection, allowed }: { role: RoleId; onSection: (s: string) => void; allowed: Section[] }) {
  const { t, money } = useLocale()
  const k = platformKpis
  const allKpis: Record<string, { label: string; value: string; alert?: boolean }> = {
    gmv: { label: t('ov.gmv'), value: money(k.gmvTodayMinor) },
    orders: { label: t('ov.orders'), value: String(k.ordersToday) },
    pendingCredit: { label: t('ov.pendingCredit'), value: String(k.pendingCreditApps), alert: k.pendingCreditApps > 0 },
    openTickets: { label: t('ov.openTickets'), value: String(k.openTickets), alert: k.openTickets > 0 },
    b2bAccounts: { label: t('ov.b2bAccounts'), value: String(k.b2bAccounts) },
    zatcaPending: { label: t('ov.zatcaPending'), value: String(k.zatcaPending), alert: k.zatcaPending > 0 },
  }
  const kpisByRole: Record<RoleId, string[]> = {
    admin: ['gmv', 'orders', 'pendingCredit', 'openTickets', 'b2bAccounts', 'zatcaPending'],
    finance: ['gmv', 'pendingCredit', 'zatcaPending', 'b2bAccounts'],
    sales_agent: ['b2bAccounts', 'pendingCredit', 'gmv', 'orders'],
    support_agent: ['openTickets', 'orders'],
    content_editor: ['orders', 'gmv'],
    auditor: ['pendingCredit', 'zatcaPending'],
    customer: [], b2b_buyer: [], b2b_approver: [], b2b_admin: [],
  }
  const keys = kpisByRole[role].length ? kpisByRole[role] : ['gmv', 'orders']

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        {keys.map((key) => {
          const kpi = allKpis[key]
          return (
            <div key={key} className={cn('card p-lg flex flex-col gap-xs', kpi.alert && 'ring-1 ring-danger/30')}>
              <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{kpi.label}</span>
              <span className={cn('font-serif text-headline tabular-nums', kpi.alert ? 'text-danger' : 'text-ink')}>{kpi.value}</span>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="font-serif text-headline text-ink">{t('ov.workspace')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-sm">
          {allowed.filter((s) => s !== 'overview').map((s) => {
            const Icon = SECTION_META[s].icon
            return (
              <button key={s} onClick={() => onSection(s)} className="card card-hover p-lg flex items-center gap-sm">
                <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover shrink-0">
                  <Icon size={18} />
                </span>
                <span className="font-sans text-data text-ink flex-1 text-start">{t(SECTION_META[s].key)}</span>
                <ArrowRight size={15} className="text-ink-subtle rtl:rotate-180" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ───────────── Credit approvals (finance) ───────────── */
function CreditPanel() {
  const { t, pick, money, locale } = useLocale()
  const [apps, setApps] = useState(creditApplications)
  const decide = (id: string, status: 'approved' | 'rejected') =>
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))

  const riskVariant = { low: 'success', medium: 'gold', high: 'danger' } as const

  return (
    <div className="flex flex-col gap-lg">
      <div className="rounded-lg bg-brand-green/8 border border-brand-green/20 p-md flex items-start gap-sm">
        <ShieldCheck size={18} className="text-brand-green shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted">{t('capp.sod')}</p>
      </div>
      <h2 className="font-serif text-headline text-ink">{t('capp.title')}</h2>
      <div className="flex flex-col gap-md">
        {apps.map((a: CreditApplication) => {
          const decided = a.status === 'approved' || a.status === 'rejected'
          return (
            <div key={a.id} className={cn('card p-lg flex flex-col gap-md', a.status === 'submitted' && 'ring-1 ring-primary/20')}>
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div>
                  <div className="flex items-center gap-sm">
                    <h3 className="font-serif text-card-title text-ink">{pick(a.org)}</h3>
                    <StatusBadge variant="neutral">{t(`capp.kind.${a.kind}`)}</StatusBadge>
                  </div>
                  <p className="font-sans text-caption text-ink-subtle mt-xxs">
                    {t('capp.requestedBy')}: {pick(a.requestedBy)} · {new Date(a.submittedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <StatusBadge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'danger' : 'gold'}>
                  {decided ? t(`capp.${a.status}`) : t(`capp.status.${a.status}`)}
                </StatusBadge>
              </div>

              <p className="font-sans text-data text-ink-muted">{pick(a.justification)}</p>

              <div className="flex flex-wrap items-center gap-lg">
                <Field label={t('capp.current')} value={money(a.currentLimitMinor)} />
                <ArrowRight size={16} className="text-ink-subtle rtl:rotate-180 mt-3" />
                <Field label={t('capp.requested')} value={money(a.requestedLimitMinor)} emphasis />
                <div className="flex flex-col gap-xxs">
                  <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('capp.risk')}</span>
                  <StatusBadge variant={riskVariant[a.riskRating]}>{a.riskRating}</StatusBadge>
                </div>
              </div>

              {!decided && (
                <div className="flex items-center gap-xs pt-sm border-t border-hairline">
                  <button onClick={() => decide(a.id, 'rejected')} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5">
                    <X size={15} /> {t('capp.reject')}
                  </button>
                  <button onClick={() => decide(a.id, 'approved')} className={buttonClass('primary', 'sm')}>
                    <Check size={15} /> {t('capp.approve')}
                  </button>
                  <span className="ms-auto inline-flex items-center gap-xxs font-sans text-caption text-ink-subtle">
                    <Lock size={12} /> MFA
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── Invoicing / ZATCA ───────────── */
function InvoicingPanel() {
  const { t, pick, money, locale } = useLocale()
  const [list, setList] = useState(invoices)
  const retry = (id: string) => setList((prev) => prev.map((i) => (i.id === id ? { ...i, zatcaStatus: 'cleared' } : i)))
  const zatcaVariant = { cleared: 'success', reported: 'gold', pending: 'neutral', rejected: 'danger' } as const

  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('inv.title')}</h2>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {list.map((inv: Invoice) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-md px-lg py-md">
              <span className="grid place-items-center w-10 h-10 rounded-md bg-surface-2 border border-hairline text-ink-subtle shrink-0">
                <QrCode size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm">
                  <span className="font-sans text-data text-ink">{inv.invoiceNo}</span>
                  <StatusBadge variant="neutral">{t(`inv.type.${inv.type}`)}</StatusBadge>
                </div>
                <p className="font-sans text-caption text-ink-subtle truncate">
                  {pick(inv.customer)} · {new Date(inv.issuedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="text-end">
                <p className="font-sans text-data text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(inv.totalMinor)}</p>
                <p className="font-sans text-caption text-ink-subtle">{t('inv.vatOf')} {money(inv.vatMinor, { withSymbol: false })}</p>
              </div>
              <div className="flex items-center gap-sm">
                <StatusBadge variant={zatcaVariant[inv.zatcaStatus]}>{t(`inv.zatca.${inv.zatcaStatus}`)}</StatusBadge>
                {(inv.zatcaStatus === 'pending' || inv.zatcaStatus === 'rejected') && (
                  <button onClick={() => retry(inv.id)} className="inline-flex items-center gap-xxs font-sans text-caption uppercase tracking-wide text-primary-hover hover:text-ink">
                    <RefreshCw size={13} /> {t('inv.retry')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── B2B accounts (sales) ───────────── */
function AccountsPanel() {
  const { t, pick, money } = useLocale()
  const [raised, setRaised] = useState<Record<string, boolean>>({})
  const tierVariant = { platinum: 'gold', gold: 'gold', silver: 'neutral', bronze: 'neutral' } as const
  const statusVariant = { active: 'success', pending: 'gold', suspended: 'danger' } as const

  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('accts.title')}</h2>
      <div className="grid gap-md sm:grid-cols-2">
        {orgDirectory.map((o) => {
          const pct = Math.round((o.availableMinor / o.limitMinor) * 100)
          return (
            <div key={o.id} className="card p-lg flex flex-col gap-sm">
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0">
                  <h3 className="font-serif text-card-title text-ink truncate">{pick(o.name)}</h3>
                  <p className="font-sans text-caption text-ink-subtle">{pick(o.type)}</p>
                </div>
                <div className="flex flex-col items-end gap-xxs shrink-0">
                  <StatusBadge variant={tierVariant[o.tier]}>{o.tier}</StatusBadge>
                  <StatusBadge variant={statusVariant[o.status]}>{t(`accts.status.${o.status}`)}</StatusBadge>
                </div>
              </div>
              <div className="flex flex-col gap-xxs">
                <div className="flex items-center justify-between font-sans text-caption text-ink-muted">
                  <span>{t('accts.available')}</span>
                  <span className="tabular-nums text-ink">{money(o.availableMinor)} / {money(o.limitMinor)}</span>
                </div>
                <div className="h-1.5 rounded-pill bg-canvas-cool overflow-hidden">
                  <span className="block h-full bg-success/60" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {raised[o.id] ? (
                <p className="inline-flex items-center gap-xs font-sans text-caption text-success pt-xs">
                  <CheckCircle2 size={14} /> {t('accts.raised')}
                </p>
              ) : (
                <button onClick={() => setRaised((p) => ({ ...p, [o.id]: true }))} className={buttonClass('secondary', 'sm', 'self-start mt-xs')}>
                  {t('accts.raise')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── Support (support agent) ───────────── */
function SupportPanel() {
  const { t, pick, locale } = useLocale()
  const [list, setList] = useState(tickets)
  const setStatus = (id: string, status: SupportTicket['status']) =>
    setList((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)))

  const chIcon = { chat: MessagesSquare, email: Mail, whatsapp: MessageCircle }
  const stVariant = { open: 'danger', pending: 'gold', resolved: 'success' } as const
  const prVariant = { high: 'danger', normal: 'gold', low: 'neutral' } as const

  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('sup.title')}</h2>
      <div className="flex flex-col gap-md">
        {list.map((ti) => {
          const Ch = chIcon[ti.channel]
          return (
            <div key={ti.id} className="card p-lg flex flex-col gap-sm">
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div className="flex items-start gap-sm min-w-0">
                  <span className="grid place-items-center w-9 h-9 rounded-md bg-surface-2 border border-hairline text-ink-muted shrink-0">
                    <Ch size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-card-title text-ink">{pick(ti.subject)}</p>
                    <p className="font-sans text-caption text-ink-subtle">
                      {pick(ti.requester)} · {t(`sup.channel.${ti.channel}`)} · {new Date(ti.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-xs shrink-0">
                  {ti.aiHandled && <StatusBadge variant="gold">{t('sup.ai')}</StatusBadge>}
                  <StatusBadge variant={prVariant[ti.priority]}>{t(`sup.priority.${ti.priority}`)}</StatusBadge>
                  <StatusBadge variant={stVariant[ti.status]}>{t(`sup.status.${ti.status}`)}</StatusBadge>
                </div>
              </div>
              {ti.status !== 'resolved' && (
                <div className="flex items-center gap-xs pt-sm border-t border-hairline">
                  <button onClick={() => setStatus(ti.id, 'pending')} className={buttonClass('ghost', 'sm')}>
                    <ArrowRight size={14} className="rtl:rotate-180" /> {t('sup.escalate')}
                  </button>
                  <button onClick={() => setStatus(ti.id, 'resolved')} className={buttonClass('secondary', 'sm')}>
                    <Check size={14} /> {t('sup.resolve')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────── Catalogue & CMS (content editor) ───────────── */
function CataloguePanel() {
  const { t, pick, locale } = useLocale()
  const [prodStatus, setProdStatus] = useState<Record<string, 'active' | 'draft'>>(
    Object.fromEntries(products.map((p) => [p.id, 'active'])),
  )
  const [artStatus, setArtStatus] = useState<Record<string, 'published' | 'draft'>>(
    Object.fromEntries(articles.map((a) => [a.id, a.status])),
  )

  return (
    <div className="flex flex-col gap-lg">
      <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-md flex items-start gap-sm">
        <PenTool size={18} className="text-primary-hover shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted">{t('cms.aiDraft')}</p>
      </div>

      {/* products */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h3 className="font-serif text-card-title text-ink">{t('cms.products')}</h3>
        </div>
        <ul className="divide-y divide-hairline">
          {products.slice(0, 6).map((p) => {
            const st = prodStatus[p.id]
            return (
              <li key={p.id} className="flex items-center gap-md px-lg py-md">
                <span className="w-2 h-8 rounded-pill shrink-0" style={{ backgroundColor: st === 'active' ? '#355c4b' : '#d2c7b4' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(p.title)}</p>
                  <p className="font-sans text-caption text-ink-subtle">{p.sku}</p>
                </div>
                <StatusBadge variant={st === 'active' ? 'success' : 'neutral'}>{t(`cms.status.${st}`)}</StatusBadge>
                <button
                  onClick={() => setProdStatus((s) => ({ ...s, [p.id]: st === 'active' ? 'draft' : 'active' }))}
                  className={buttonClass('ghost', 'sm')}
                >
                  {st === 'active' ? t('cms.unpublish') : t('cms.publish')}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* articles */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h3 className="font-serif text-card-title text-ink">{t('cms.articles')}</h3>
        </div>
        <ul className="divide-y divide-hairline">
          {articles.map((a) => {
            const st = artStatus[a.id]
            return (
              <li key={a.id} className="flex items-center gap-md px-lg py-md">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(a.title)}</p>
                  <p className="font-sans text-caption text-ink-subtle">
                    {t(`cms.kind.${a.kind}`)} · {new Date(a.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <StatusBadge variant={st === 'published' ? 'success' : 'neutral'}>{t(`cms.status.${st}`)}</StatusBadge>
                <button
                  onClick={() => setArtStatus((s) => ({ ...s, [a.id]: st === 'published' ? 'draft' : 'published' }))}
                  className={buttonClass('ghost', 'sm')}
                >
                  {st === 'published' ? t('cms.unpublish') : t('cms.publish')}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── Audit & consent (auditor, read-only) ───────────── */
function AuditPanel() {
  const { t, pick, locale } = useLocale()
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-headline text-ink">{t('audit.title')}</h2>
        <StatusBadge variant="neutral">{t('audit.readonly')}</StatusBadge>
      </div>

      {/* audit log */}
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {auditEvents.map((e: AuditEvent) => (
            <li key={e.id} className="flex items-start gap-md px-lg py-md">
              <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', e.sensitive ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-ink-subtle')}>
                {e.sensitive ? <Lock size={15} /> : <ScrollText size={15} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink">
                  <span className="text-ink-muted">{pick(e.actor)}</span> — {pick(e.action)}
                </p>
                <p className="font-sans text-caption text-ink-subtle truncate">{e.resource} · {e.ip}</p>
              </div>
              <div className="text-end shrink-0">
                {e.sensitive && <StatusBadge variant="danger" className="mb-1">{t('audit.sensitive')}</StatusBadge>}
                <p className="font-sans text-caption text-ink-subtle">
                  {new Date(e.at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* consent ledger */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h3 className="font-serif text-card-title text-ink">{t('audit.consent')}</h3>
        </div>
        <ul className="divide-y divide-hairline">
          {consentLedger.map((c) => (
            <li key={c.id} className="flex items-center gap-md px-lg py-md">
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{pick(c.subject)}</p>
                <p className="font-sans text-caption text-ink-subtle">{pick(c.purpose)} · {c.version}</p>
              </div>
              <StatusBadge variant={c.granted ? 'success' : 'neutral'}>{c.granted ? t('audit.granted') : t('audit.withdrawn')}</StatusBadge>
              <span className="font-sans text-caption text-ink-subtle tabular-nums">{c.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── Users & roles (admin) ───────────── */
function UsersPanel() {
  const { t, pick } = useLocale()
  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('users.title')}</h2>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {personaList.map((p) => {
            const Icon = roleIcons[p.id]
            return (
              <li key={p.id} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-10 h-10 rounded-md shrink-0" style={{ backgroundColor: p.accent, color: p.onAccent }}>
                  <Icon size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(p.name)}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate">{pick(p.roleLabel)}</p>
                </div>
                <StatusBadge variant="neutral">{p.scope === 'platform' ? t('users.scopePlatform') : t('users.scopeOrg')}</StatusBadge>
                {p.requiresMFA && (
                  <span className="inline-flex items-center gap-xxs font-sans text-caption text-primary-hover">
                    <Lock size={12} /> MFA
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── shared ───────────── */
function Field({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-card-title tabular-nums', emphasis ? 'text-primary-hover' : 'text-ink')}>{value}</span>
    </div>
  )
}
