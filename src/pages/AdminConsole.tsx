import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  LayoutGrid, Wallet, FileText, Building2, Headset, PenTool, ScrollText, Users, Workflow,
  X, Check, RefreshCw, QrCode, Lock, ArrowRight, ShieldCheck, ShieldAlert, Target,
  Gauge, ClipboardList, Factory, UsersRound, UserCog, LayoutList, Handshake, Globe, Coins,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { personaList, type RoleId } from '@/data/roles'
import { roleIcons } from '@/components/roles/roleIcons'
import {
  creditApplications, invoices, articles, auditEvents, consentLedger, platformKpis,
  type CreditApplication, type Invoice, type AuditEvent,
} from '@/data/staff'
import { products } from '@/data/products'
import { prodChannelMeta, type ProdChannel } from '@/data/ownerProducts'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { StepUpGate } from '@/components/account/StepUpGate'
import { ToastProvider } from '@/components/account/Toast'
import { OwnerStateProvider } from '@/state/OwnerStateContext'
import { useTeam } from '@/state/TeamContext'
import type { TeamPermission } from '@/data/ownerTeam'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'
import { SupportDesk } from './admin/SupportDesk'
import { SalesPipeline } from './admin/SalesPipeline'
import { SalesPerformance } from './admin/SalesPerformance'
import { AccountsPanel } from './admin/AccountsPanel'
import { OwnerExec } from './admin/owner/OwnerExec'
import { OwnerOrders } from './admin/owner/OwnerOrders'
import { OwnerSupply } from './admin/owner/OwnerSupply'
import { OwnerCustomers } from './admin/owner/OwnerCustomers'
import { OwnerTeam } from './admin/owner/OwnerTeam'
import { OwnerCatalog } from './admin/owner/OwnerCatalog'
import { OwnerVendors } from './admin/owner/OwnerVendors'
import { OwnerExport } from './admin/owner/OwnerExport'
import { OwnerFinance } from './admin/owner/OwnerFinance'

type Section =
  | 'overview' | 'credit' | 'invoicing' | 'accounts' | 'pipeline' | 'performance' | 'support' | 'catalogue' | 'audit' | 'users'
  // Owner operational sections (owner role only)
  | 'owner_exec' | 'owner_orders' | 'owner_supply' | 'owner_customers' | 'owner_team' | 'owner_catalog' | 'owner_vendors' | 'owner_export' | 'owner_fin'

const SECTION_META: Record<Section, { key: string; icon: NonNullable<TabDef['icon']> }> = {
  overview: { key: 'admin.section.overview', icon: LayoutGrid },
  credit: { key: 'admin.section.credit', icon: Wallet },
  invoicing: { key: 'admin.section.invoicing', icon: FileText },
  accounts: { key: 'admin.section.accounts', icon: Building2 },
  pipeline: { key: 'admin.section.pipeline', icon: Workflow },
  performance: { key: 'perf.section', icon: Target },
  support: { key: 'admin.section.support', icon: Headset },
  catalogue: { key: 'admin.section.catalogue', icon: PenTool },
  audit: { key: 'admin.section.audit', icon: ScrollText },
  users: { key: 'admin.section.users', icon: Users },
  owner_exec: { key: 'owner.section.exec', icon: Gauge },
  owner_orders: { key: 'owner.section.orders', icon: ClipboardList },
  owner_supply: { key: 'owner.section.supply', icon: Factory },
  owner_customers: { key: 'owner.section.customers', icon: UsersRound },
  owner_team: { key: 'owner.section.team', icon: UserCog },
  owner_catalog: { key: 'owner.section.catalog', icon: LayoutList },
  owner_vendors: { key: 'owner.section.vendors', icon: Handshake },
  owner_export: { key: 'owner.section.export', icon: Globe },
  owner_fin: { key: 'owner.section.fin', icon: Coins },
}

const OWNER_SECTIONS: Section[] = ['owner_exec', 'owner_orders', 'owner_supply', 'owner_customers', 'owner_team', 'owner_catalog', 'owner_vendors', 'owner_export', 'owner_fin']

// Owner sections that expand into nested sidebar sub-tabs, mapped to their sub-views (id + bilingual label).
// The active sub-view is carried in a shared `?sub=` URL param and passed down to the panel as `view`.
type SubView = { id: string; label: { en: string; ar: string } }
export type SupplyView = 'po' | 'raw' | 'finished' | 'suppliers' | 'waste'
const SUPPLY_VIEWS: SubView[] = [
  { id: 'po', label: { en: 'Purchases', ar: 'المشتريات' } },
  { id: 'raw', label: { en: 'Raw materials', ar: 'المواد الخام' } },
  { id: 'finished', label: { en: 'Finished goods', ar: 'المواد المصنعة' } },
  { id: 'suppliers', label: { en: 'Suppliers directory', ar: 'دليل المورّدين' } },
  { id: 'waste', label: { en: 'Waste', ar: 'الهدر' } },
]
// Products & Catalog both pivot on the three sales channels — reuse the shared channel labels.
const CHANNEL_VIEWS: SubView[] = (['b2c', 'b2b', 'mega'] as ProdChannel[]).map((c) => ({ id: c, label: prodChannelMeta[c].label }))
// Cost recalibration was removed (unit costs come from purchase invoices) and the
// waste log lives in Supply chain — finance keeps the overview and collection/tax.
export type FinView = 'overview' | 'tax'
const FIN_VIEWS: SubView[] = [
  { id: 'overview', label: { en: 'Financial overview', ar: 'نظرة مالية' } },
  { id: 'tax', label: { en: 'Collection & tax', ar: 'التحصيل والضريبة' } },
]
const SUB_NAVS: Partial<Record<Section, SubView[]>> = {
  owner_supply: SUPPLY_VIEWS,
  owner_catalog: CHANNEL_VIEWS,
  owner_fin: FIN_VIEWS,
}

// Which owner-console section each grantable team permission opens up.
const PERM_SECTIONS: Record<TeamPermission, Section> = {
  orders: 'owner_orders',
  purchases: 'owner_supply',
  raw: 'owner_supply',
  production: 'owner_supply',
  waste: 'owner_supply',
  products: 'owner_catalog',
  customers: 'owner_customers',
  suppliers: 'owner_vendors',
  finance: 'owner_fin',
  reports: 'owner_supply',
}

const ACCESS: Record<RoleId, Section[]> = {
  admin: ['overview', 'credit', 'invoicing', 'accounts', 'pipeline', 'performance', 'support', 'catalogue', 'audit', 'users'],
  finance: ['overview', 'credit', 'invoicing'],
  sales_agent: ['overview', 'pipeline', 'performance', 'accounts'],
  support_agent: ['overview', 'support'],
  content_editor: ['overview', 'catalogue'],
  auditor: ['overview', 'audit'],
  // Owner: its operational sections only (owner-exclusive). No shared overview — its KPIs live in Executive overview.
  owner: [...OWNER_SECTIONS],
  customer: [],
  b2b: [],
  mega_business: [],
}

export function AdminConsole() {
  const { t, pick } = useLocale()
  const { role, persona, isStaff, isPrivileged } = useChannel()
  const { activeEmployee } = useTeam()
  // An employee session sees only the owner sections their granted permissions map to.
  const allowed = activeEmployee
    ? OWNER_SECTIONS.filter((s) => activeEmployee.perms.some((p) => PERM_SECTIONS[p] === s))
    : ACCESS[role]
  const [params, setParams] = useSearchParams()

  if (!isStaff) return <Restricted />
  if (activeEmployee && allowed.length === 0) return <Restricted />

  // Each role's landing section is its first allowed one (owner has no shared overview → lands on owner_exec).
  const defaultSection = (allowed[0] ?? 'overview') as Section
  const activeRaw = params.get('section') ?? defaultSection
  const active = (allowed.includes(activeRaw as Section) ? activeRaw : defaultSection) as Section
  // Resolve the active section's sub-view (if it has a sub-nav) from the shared `?sub=` param.
  const subViews = SUB_NAVS[active]
  const subRaw = params.get('sub')
  const sub = subViews ? (subViews.some((v) => v.id === subRaw) ? (subRaw as string) : subViews[0].id) : undefined

  // Navigate to a top-level section (clears any sub-view).
  const setActive = (id: string) => {
    const next = new URLSearchParams(params)
    if (id === defaultSection) next.delete('section')
    else next.set('section', id)
    next.delete('sub')
    setParams(next, { replace: false })
  }
  // Nested nav select — a `<section>:<view>` id switches that section's sub-view; anything else is a plain section.
  const setNav = (id: string) => {
    const [sec, view] = id.split(':')
    if (view && SUB_NAVS[sec as Section]) {
      const next = new URLSearchParams(params)
      next.set('section', sec)
      next.set('sub', view)
      setParams(next, { replace: false })
    } else setActive(id)
  }

  // On a section with a sub-nav, the active nav id is its current sub-view child.
  const navActive = subViews ? `${active}:${sub}` : active
  const tabs: TabDef[] = allowed.map((s) => {
    const base: TabDef = { id: s, label: t(SECTION_META[s].key), icon: SECTION_META[s].icon }
    const sv = SUB_NAVS[s]
    if (sv) return { ...base, children: sv.map((v) => ({ id: `${s}:${v.id}`, label: pick(v.label) })) }
    return base
  })

  return (
    <StepUpGate id={activeEmployee ? `emp-${activeEmployee.id}` : role} required={isPrivileged && !activeEmployee}>
     <ToastProvider>
      <OwnerStateProvider>
      <AccountShell
        eyebrow={t('admin.platform')}
        title={t('admin.title')}
        subtitle={`${t('ov.signedInAs')}: ${activeEmployee ? `${pick(activeEmployee.name)} · ${pick(activeEmployee.title)}` : `${pick(persona.name)} · ${pick(persona.roleLabel)}`}`}
        tone="dark"
        tabs={tabs}
        active={navActive}
        onSelect={setNav}
      >
        {active === 'overview' && <OverviewPanel role={role} onSection={setActive} allowed={allowed} />}
        {active === 'credit' && <CreditPanel />}
        {active === 'invoicing' && <InvoicingPanel />}
        {active === 'accounts' && <AccountsPanel />}
        {active === 'pipeline' && <SalesPipeline />}
        {active === 'performance' && <SalesPerformance />}
        {active === 'support' && <SupportDesk />}
        {active === 'catalogue' && <CataloguePanel />}
        {active === 'audit' && <AuditPanel />}
        {active === 'users' && <UsersPanel />}
        {active === 'owner_exec' && <OwnerExec />}
        {active === 'owner_orders' && <OwnerOrders />}
        {active === 'owner_supply' && <OwnerSupply view={(sub ?? 'po') as SupplyView} />}
        {active === 'owner_customers' && <OwnerCustomers />}
        {active === 'owner_team' && <OwnerTeam />}
        {active === 'owner_catalog' && <OwnerCatalog view={(sub ?? 'b2c') as ProdChannel} />}
        {active === 'owner_vendors' && <OwnerVendors />}
        {active === 'owner_export' && <OwnerExport />}
        {active === 'owner_fin' && <OwnerFinance view={(sub ?? 'overview') as FinView} />}
      </AccountShell>
      </OwnerStateProvider>
     </ToastProvider>
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
        <p className="font-sans text-data text-ink-muted max-w-sm">{t('admin.restrictedHint')}</p>
        <Link to="/" className={buttonClass('primary')}>
          {t('notFound.cta')} <ArrowRight size={15} className="rtl:rotate-180" />
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
    owner: ['gmv', 'orders', 'pendingCredit', 'openTickets', 'b2bAccounts', 'zatcaPending'],
    customer: [], b2b: [], mega_business: [],
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
