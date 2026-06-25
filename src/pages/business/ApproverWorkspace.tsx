import { useMemo, useState } from 'react'
import {
  ClipboardCheck, History, Wallet, AlertTriangle, Check, X, CheckCircle2, XCircle,
  ChevronRight, ShieldCheck, ShieldAlert, ArrowRight, BarChart3, Clock, Search,
  UserCheck, Layers, Gauge, TrendingUp, Building2,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { availableCreditMinor } from '@/data/organization'
import {
  accountOrders, accountOrderItems, members, memberById, costCenterById, orgPolicy,
  type AccountOrder,
} from '@/data/business'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { UtilizationGauge, Sparkline, RankedBars } from '@/components/charts/Charts'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn, tint } from '@/lib/cn'

const APPROVER_ID = 'm-2' // Sara Al-Dosari
const SLA_DAYS = 2
const TODAY = new Date('2026-06-21')

type Outcome = 'approved' | 'rejected' | 'escalated'

interface Decision {
  order: AccountOrder
  outcome: Outcome
  note: string
  decidedAt: string
  hoursToDecide: number
}

const mk = (orderNo: string, placedAt: string, totalMinor: number, summary: { en: string; ar: string }, poNumber: string): AccountOrder => ({
  orderNo, placedAt, status: 'confirmed', totalMinor, buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' }, buyerId: 'm-3', poNumber, requiresApproval: true, summary,
})

const seededHistory: Decision[] = [
  { order: mk('JAZ-2026-001102', '2026-06-14', 1450000, { en: '40 × amenity bars', ar: '٤٠ × لوح ضيافة' }, 'PO-2026-0438'), outcome: 'approved', note: 'Within the monthly amenities budget.', decidedAt: '2026-06-14', hoursToDecide: 3 },
  { order: mk('JAZ-2026-001088', '2026-06-11', 980000, { en: '24 × Jazan Five boxes', ar: '٢٤ × خماسية جازان' }, 'PO-2026-0433'), outcome: 'approved', note: '', decidedAt: '2026-06-11', hoursToDecide: 2 },
  { order: mk('JAZ-2026-001012', '2026-06-05', 2100000, { en: '80 × Harvest Ribbon', ar: '٨٠ × شريط الحصاد' }, 'PO-2026-0399'), outcome: 'approved', note: 'Within Q2 events budget.', decidedAt: '2026-06-05', hoursToDecide: 4 },
  { order: { ...mk('JAZ-2026-000995', '2026-05-24', 7200000, { en: '300 × signature towers', ar: '٣٠٠ × برج توقيعي' }, 'PO-2026-0388'), status: 'confirmed' }, outcome: 'escalated', note: 'Above my authority — routed to the admin.', decidedAt: '2026-05-24', hoursToDecide: 1 },
  { order: { ...mk('JAZ-2026-000940', '2026-05-18', 1650000, { en: '50 × gift boxes', ar: '٥٠ × علبة هدايا' }, 'PO-2026-0381'), status: 'rejected' }, outcome: 'rejected', note: 'Over the seasonal budget — please split across two POs.', decidedAt: '2026-05-18', hoursToDecide: 20 },
  { order: mk('JAZ-2026-000910', '2026-05-10', 1200000, { en: '36 × Damascena boxes', ar: '٣٦ × علبة دمشقية' }, 'PO-2026-0372'), outcome: 'approved', note: '', decidedAt: '2026-05-10', hoursToDecide: 5 },
]

const daysWaiting = (placedAt: string) => Math.max(0, Math.round((TODAY.getTime() - new Date(placedAt).getTime()) / 86400000))

export function ApproverWorkspace() {
  const { t, pick } = useLocale()
  const { org, persona } = useChannel()
  const [activeRaw, setActive] = useTab('queue')
  const active = ['queue', 'insights', 'history', 'authority'].includes(activeRaw) ? activeRaw : 'queue'
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [delegateTo, setDelegateTo] = useState<string | null>(null)

  const pending = useMemo(
    () => accountOrders.filter((o) => o.status === 'awaiting_approval' && !decisions[o.orderNo]),
    [decisions],
  )
  const decided = useMemo(() => [...Object.values(decisions), ...seededHistory], [decisions])

  const decide = (order: AccountOrder, outcome: Outcome, note: string) =>
    setDecisions((prev) => ({ ...prev, [order.orderNo]: { order, outcome, note, decidedAt: '2026-06-21', hoursToDecide: 1 } }))
  const decideBatch = (orders: AccountOrder[]) =>
    setDecisions((prev) => {
      const next = { ...prev }
      orders.forEach((o) => { next[o.orderNo] = { order: o, outcome: 'approved', note: 'Batch approved', decidedAt: '2026-06-21', hoursToDecide: 1 } })
      return next
    })

  const tabs: TabDef[] = [
    { id: 'queue', label: `${t('approver.tab.queue')}${pending.length ? ` · ${pending.length}` : ''}`, icon: ClipboardCheck },
    { id: 'insights', label: t('approver.tab.insights'), icon: BarChart3 },
    { id: 'history', label: t('approver.tab.decided'), icon: History },
    { id: 'authority', label: t('approver.tab.authority'), icon: ShieldCheck },
  ]

  return (
    <AccountShell
      eyebrow={pick(persona.roleLabel)}
      title={t('approver.title')}
      subtitle={`${pick(org.legalName)} · ${t('approver.subtitle')}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={delegateTo
        ? <span className="hidden sm:inline-flex items-center gap-xs rounded-pill bg-primary/12 text-primary-hover px-3 py-1.5 font-sans text-caption"><UserCheck size={14} /> {t('approver.delegatedTo')} {pick(memberById(delegateTo)?.name ?? { en: '', ar: '' })}</span>
        : undefined}
    >
      {active === 'queue' && <Queue pending={pending} onDecide={decide} onBatch={decideBatch} delegated={!!delegateTo} />}
      {active === 'insights' && <Insights pending={pending} decided={decided} />}
      {active === 'history' && <Decided decided={decided} />}
      {active === 'authority' && <Authority delegateTo={delegateTo} onDelegate={setDelegateTo} />}
    </AccountShell>
  )
}

/** Self-contained approvals surface for the unified B2B account — the account
 *  holder approves on the org's behalf, so they carry full authority. */
export function ApprovalsPanel() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const pending = useMemo(() => accountOrders.filter((o) => o.status === 'awaiting_approval' && !decisions[o.orderNo]), [decisions])
  const decided = useMemo(() => [...Object.values(decisions), ...seededHistory], [decisions])
  const decide = (order: AccountOrder, outcome: Outcome, note: string) =>
    setDecisions((prev) => ({ ...prev, [order.orderNo]: { order, outcome, note, decidedAt: '2026-06-21', hoursToDecide: 1 } }))
  const decideBatch = (orders: AccountOrder[]) =>
    setDecisions((prev) => { const next = { ...prev }; orders.forEach((o) => { next[o.orderNo] = { order: o, outcome: 'approved', note: 'Batch approved', decidedAt: '2026-06-21', hoursToDecide: 1 } }); return next })
  return (
    <div className="flex flex-col gap-xl">
      <Queue pending={pending} onDecide={decide} onBatch={decideBatch} delegated={false} authority={null} />
      <Decided decided={decided} />
    </div>
  )
}

/* ═══════════════ Queue ═══════════════ */
function Queue({ pending, onDecide, onBatch, delegated, authority: authorityProp }: {
  pending: AccountOrder[]
  onDecide: (o: AccountOrder, d: Outcome, note: string) => void
  onBatch: (orders: AccountOrder[]) => void
  delegated: boolean
  authority?: number | null
}) {
  const { t, money } = useLocale()
  const { org } = useChannel()
  const authority = authorityProp !== undefined ? authorityProp : (memberById(APPROVER_ID)?.perOrderLimitMinor ?? null)
  const available = availableCreditMinor(org)
  const [sort, setSort] = useState<'age' | 'value'>('age')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const totalAwaiting = pending.reduce((s, o) => s + o.totalMinor, 0)
  const oldest = pending.reduce((max, o) => Math.max(max, daysWaiting(o.placedAt)), 0)

  const sorted = useMemo(() => {
    const arr = [...pending]
    arr.sort((a, b) => (sort === 'age' ? new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime() : b.totalMinor - a.totalMinor))
    return arr
  }, [pending, sort])

  const canBatch = (o: AccountOrder) => authority === null || o.totalMinor <= authority
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectedOrders = sorted.filter((o) => selected.has(o.orderNo))
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.totalMinor, 0)

  return (
    <div className="flex flex-col gap-lg">
      {delegated && (
        <div className="rounded-lg bg-primary/6 border border-primary/25 p-md flex items-start gap-sm">
          <UserCheck size={18} className="text-primary-hover shrink-0 mt-0.5" />
          <p className="font-sans text-data text-ink-muted">{t('approver.delegatedNote')}</p>
        </div>
      )}

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ClipboardCheck} label={t('approver.pending')} value={String(pending.length)} alert={pending.length > 0} />
        <Stat icon={AlertTriangle} label={t('approver.valueAwaiting')} value={money(totalAwaiting)} />
        <Stat icon={Clock} label={t('approver.oldestWaiting')} value={oldest ? `${oldest} ${t('approver.days')}` : '—'} alert={oldest > SLA_DAYS} />
        <Stat icon={ShieldCheck} label={t('approver.authority')} value={authority ? money(authority) : t('team.noLimit')} />
      </div>

      {pending.length === 0 ? (
        <div className="card p-xxl flex flex-col items-center text-center gap-sm">
          <span className="grid place-items-center w-16 h-16 rounded-pill bg-success/12 text-success"><CheckCircle2 size={26} /></span>
          <h3 className="font-serif text-headline text-ink">{t('approver.empty')}</h3>
          <p className="text-body text-ink-muted">{t('approver.emptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-md">
            <p className="font-sans text-caption text-ink-subtle">{t('approver.explainer')}</p>
            <div className="flex items-center gap-xs shrink-0">
              <span className="font-sans text-caption text-ink-subtle">{t('approver.sortBy')}</span>
              {(['age', 'value'] as const).map((s) => (
                <button key={s} onClick={() => setSort(s)}
                  className={cn('rounded-pill px-3 py-1 font-sans text-caption border transition-colors',
                    sort === s ? 'bg-ink text-ink-on-dark border-ink' : 'bg-surface-1 text-ink-muted border-hairline-strong hover:border-ink/40')}>
                  {t(`approver.sort.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-md">
            {sorted.map((o) => (
              <ApprovalCard
                key={o.orderNo}
                order={o}
                authority={authority}
                available={available}
                selectable={canBatch(o)}
                selected={selected.has(o.orderNo)}
                onToggle={() => toggle(o.orderNo)}
                onDecide={onDecide}
              />
            ))}
          </div>
        </>
      )}

      {/* sticky batch bar */}
      {selectedOrders.length > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto w-full max-w-2xl rounded-pill bg-canvas-dark text-ink-on-dark shadow-lg px-lg py-sm flex items-center gap-md animate-fade-up">
          <Layers size={18} className="text-primary-bright shrink-0" />
          <span className="font-sans text-data">{selectedOrders.length} {t('approver.selected')} · <span className="tabular-nums">{money(selectedTotal)}</span></span>
          <button onClick={() => { setSelected(new Set()) }} className="ms-auto font-sans text-caption text-ink-on-dark-muted hover:text-ink-on-dark">{t('common.cancel')}</button>
          <button onClick={() => { onBatch(selectedOrders); setSelected(new Set()) }} className={buttonClass('primary', 'sm')}>
            <Check size={15} /> {t('approver.approveSelected')}
          </button>
        </div>
      )}
    </div>
  )
}

function ApprovalCard({ order, authority, available, selectable, selected, onToggle, onDecide }: {
  order: AccountOrder
  authority: number | null
  available: number
  selectable: boolean
  selected: boolean
  onToggle: () => void
  onDecide: (o: AccountOrder, d: Outcome, note: string) => void
}) {
  const { t, pick, money, locale } = useLocale()
  const [note, setNote] = useState('')
  const [reasonNeeded, setReasonNeeded] = useState(false)
  const [showItems, setShowItems] = useState(false)

  const buyer = memberById(order.buyerId)
  const limit = buyer?.perOrderLimitMinor ?? 0
  const overage = Math.max(0, order.totalMinor - limit)
  const after = available - order.totalMinor
  const exceedsCredit = after < 0
  const withinAuthority = authority === null || order.totalMinor <= authority
  const needsDual = order.totalMinor >= orgPolicy.dualControlAboveMinor
  const aging = daysWaiting(order.placedAt)
  const overdue = aging > SLA_DAYS

  // cost-centre budget impact — does approving this blow the department budget?
  const cc = costCenterById(buyer?.costCenterId)
  const ccAfter = cc ? cc.consumedMinor + order.totalMinor : 0
  const ccOver = cc ? ccAfter > cc.budgetMinor : false
  const ccPct = cc ? Math.min(100, Math.round((ccAfter / cc.budgetMinor) * 100)) : 0

  const items = (accountOrderItems[order.orderNo] ?? [])
    .map((it) => { const found = variantById(it.variantId); return found ? { found, qty: it.qty, total: found.variant.b2bPriceMinor * it.qty } : null })
    .filter(Boolean) as { found: NonNullable<ReturnType<typeof variantById>>; qty: number; total: number }[]

  const tryReject = () => { if (!note.trim()) { setReasonNeeded(true); return } onDecide(order, 'rejected', note) }

  return (
    <div className={cn('card p-lg flex flex-col gap-md transition-shadow', selected ? 'ring-2 ring-primary/50' : overdue ? 'ring-1 ring-danger/30' : 'ring-1 ring-danger/15')}>
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex items-start gap-sm min-w-0">
          {selectable && (
            <button onClick={onToggle} aria-label={t('approver.select')}
              className={cn('grid place-items-center w-5 h-5 rounded border mt-1 shrink-0 transition-colors', selected ? 'bg-primary border-primary text-on-primary' : 'border-hairline-strong hover:border-ink/50')}>
              {selected && <Check size={13} />}
            </button>
          )}
          <span className="grid place-items-center w-10 h-10 rounded-pill bg-primary/10 border border-hairline font-serif text-card-title text-primary-hover shrink-0">{pick(order.buyer).charAt(0)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <span className="font-sans text-data text-ink">{order.orderNo}</span>
              <StatusBadge variant={overdue ? 'danger' : 'neutral'}>
                <Clock size={11} className="inline -mt-px me-0.5" />{aging} {t('approver.days')}{overdue ? ` · ${t('approver.overdue')}` : ''}
              </StatusBadge>
            </div>
            <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick(order.buyer)} · {pick(order.summary)} · {t('border.po')} {order.poNumber}</p>
          </div>
        </div>
        <span className="font-serif text-headline text-ink tabular-nums">{money(order.totalMinor)}</span>
      </div>

      {/* why this needs approval */}
      <div className="flex flex-wrap items-center gap-xs">
        <span className="inline-flex items-center gap-xs rounded-pill bg-danger/8 text-danger px-2.5 py-1 font-sans text-caption">
          <AlertTriangle size={12} /> {t('approver.overLimitBy')} {money(overage)}
        </span>
        {needsDual && (
          <span className="inline-flex items-center gap-xs rounded-pill bg-primary/10 text-primary-hover px-2.5 py-1 font-sans text-caption">
            <ShieldCheck size={12} /> {t('approver.needsDual')}
          </span>
        )}
      </div>

      {/* review items */}
      <div className="rounded-md border border-hairline overflow-hidden">
        <button onClick={() => setShowItems((s) => !s)} className="w-full flex items-center justify-between gap-sm px-md py-2.5 bg-surface-2 hover:bg-surface-2/70 transition-colors">
          <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-muted">{t('approver.reviewItems')} · {items.length}</span>
          <ChevronRight size={15} className={cn('text-ink-subtle transition-transform', showItems && 'rotate-90')} />
        </button>
        {showItems && (
          <ul className="divide-y divide-hairline">
            {items.map((l, i) => (
              <li key={i} className="flex items-center gap-sm px-md py-2.5">
                <span className="w-7 h-7 rounded-md overflow-hidden border border-hairline shrink-0" style={{ backgroundColor: tint(flavors[l.found.product.flavorId].accent, 14) }} />
                <span className="flex-1 font-sans text-data text-ink truncate">{pick(l.found.product.title)}</span>
                <span className="font-sans text-caption text-ink-subtle tabular-nums">×{l.qty}</span>
                <span className="font-sans text-data text-ink tabular-nums w-24 text-end">{money(l.total, { withSymbol: false })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* decision context */}
      <div className="grid sm:grid-cols-3 gap-sm rounded-md bg-surface-2 border border-hairline p-md">
        <Field label={t('approver.buyerLimit')} value={money(limit)} />
        <Field label={t('approver.orderTotal')} value={money(order.totalMinor)} />
        <Field label={t('approver.overBy')} value={money(overage)} danger />
      </div>

      {/* impacts: credit + cost-centre budget */}
      <div className="grid sm:grid-cols-2 gap-sm">
        <div className={cn('flex flex-col gap-xxs rounded-md border p-md', exceedsCredit ? 'bg-danger/6 border-danger/25' : 'bg-success/6 border-success/20')}>
          <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('approver.creditImpact')}</span>
          <span className="inline-flex items-center gap-xs font-sans text-data">
            <span className="text-ink-muted tabular-nums">{money(available)}</span>
            <ArrowRight size={13} className="text-ink-subtle rtl:rotate-180" />
            <span className={cn('tabular-nums font-medium', exceedsCredit ? 'text-danger' : 'text-success')}>{money(after)}</span>
          </span>
        </div>
        {cc && (
          <div className={cn('flex flex-col gap-xxs rounded-md border p-md', ccOver ? 'bg-danger/6 border-danger/25' : 'bg-surface-2 border-hairline')}>
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle inline-flex items-center gap-xs"><Building2 size={12} /> {pick(cc.name)} · {ccPct}%</span>
            <div className="h-1.5 rounded-pill bg-canvas-cool overflow-hidden">
              <span className={cn('block h-full rounded-pill', ccOver ? 'bg-danger' : ccPct >= 75 ? 'bg-primary' : 'bg-success')} style={{ width: `${ccPct}%` }} />
            </div>
            <span className={cn('font-sans text-caption', ccOver ? 'text-danger' : 'text-ink-subtle')}>{ccOver ? t('approver.overBudget') : t('approver.withinBudget')}</span>
          </div>
        )}
      </div>

      {/* authority verdict */}
      <p className={cn('inline-flex items-center gap-xs font-sans text-caption', withinAuthority ? 'text-success' : 'text-danger')}>
        {withinAuthority ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
        {withinAuthority ? t('approver.withinAuthority') : t('approver.exceedsAuthority')}
      </p>

      {/* note */}
      <div className="flex flex-col gap-xxs">
        <input value={note} onChange={(e) => { setNote(e.target.value); setReasonNeeded(false) }} placeholder={t('approver.notePlaceholder')}
          className={cn('input', reasonNeeded && 'border-danger')} aria-label={t('approver.notePlaceholder')} />
        {reasonNeeded && <span className="font-sans text-caption text-danger">{t('approver.rejectReason')}</span>}
      </div>

      {/* actions */}
      <div className="flex items-center gap-xs">
        <button onClick={tryReject} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={15} /> {t('border.reject')}</button>
        {withinAuthority ? (
          <button onClick={() => onDecide(order, 'approved', note)} className={buttonClass('primary', 'sm')}>
            <Check size={15} /> {needsDual ? t('approver.approveToFinance') : t('approver.approveOrder')}
          </button>
        ) : (
          <button onClick={() => onDecide(order, 'escalated', note || 'Escalated — above approver authority')} className={buttonClass('dark', 'sm')}>
            <ShieldAlert size={15} /> {t('approver.escalate')}
          </button>
        )}
        <span className="ms-auto font-sans text-caption text-ink-subtle">{new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

/* ═══════════════ Insights ═══════════════ */
function Insights({ pending, decided }: { pending: AccountOrder[]; decided: Decision[] }) {
  const { t, pick, money } = useLocale()
  const approved = decided.filter((d) => d.outcome === 'approved')
  const rejected = decided.filter((d) => d.outcome === 'rejected')
  const escalated = decided.filter((d) => d.outcome === 'escalated')
  const rate = decided.length ? Math.round((approved.length / decided.length) * 100) : 0
  const avgHours = decided.length ? Math.round(decided.reduce((s, d) => s + d.hoursToDecide, 0) / decided.length) : 0
  const valueApproved = approved.reduce((s, d) => s + d.order.totalMinor, 0)
  const totalAwaiting = pending.reduce((s, o) => s + o.totalMinor, 0)

  // value processed over the decided timeline (oldest → newest)
  const series = [...decided].sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime()).map((d) => d.order.totalMinor)

  // submissions by buyer (awaiting + decided)
  const byBuyer = useMemo(() => {
    const map = new Map<string, number>()
    ;[...pending, ...decided.map((d) => d.order)].forEach((o) => map.set(o.buyerId, (map.get(o.buyerId) ?? 0) + 1))
    return [...map.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n)
  }, [pending, decided])
  const maxBuyer = Math.max(...byBuyer.map((b) => b.n), 1)

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md grid-cols-2 lg:grid-cols-4">
        <Kpi label={t('approver.pending')} value={String(pending.length)} sub={money(totalAwaiting)} alert={pending.length > 0} />
        <Kpi label={t('approver.approvedMtd')} value={String(approved.length)} sub={money(valueApproved)} tone="success" />
        <Kpi label={t('approver.rejectedMtd')} value={String(rejected.length)} tone="danger" />
        <Kpi label={t('approver.avgDecision')} value={`${avgHours}${t('approver.hoursShort')}`} sub={t('approver.perOrder')} />
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-lg items-center card p-lg">
        <div className="grid place-items-center">
          <UtilizationGauge
            segments={[
              { value: approved.length, color: '#355c4b' },
              { value: escalated.length, color: '#b08a57' },
              { value: rejected.length, color: '#b5403b' },
            ]}
            centerValue={`${rate}%`}
            centerLabel={t('approver.approvalRate')}
          />
        </div>
        <div className="flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{t('approver.decisionMix')}</h3>
          <div className="grid grid-cols-3 gap-md">
            <LegendStat color="#355c4b" label={t('capp.approved')} value={String(approved.length)} />
            <LegendStat color="#b08a57" label={t('approver.escalatedLabel')} value={String(escalated.length)} />
            <LegendStat color="#b5403b" label={t('capp.rejected')} value={String(rejected.length)} />
          </div>
          <div className="flex flex-col gap-xs pt-sm border-t border-hairline">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle"><TrendingUp size={13} /> {t('approver.valueProcessed')}</span>
              <span className="font-sans text-data text-ink tabular-nums">{money(series.reduce((s, x) => s + x, 0))}</span>
            </div>
            <span className="text-primary-hover/70"><Sparkline points={series} /></span>
          </div>
        </div>
      </div>

      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><Gauge size={18} className="text-primary-hover" /> {t('approver.submissionsByBuyer')}</h3>
        <RankedBars rows={byBuyer.map((b) => ({ label: pick(memberById(b.id)?.name ?? { en: b.id, ar: b.id }), value: b.n, display: `${b.n} · ${Math.round((b.n / maxBuyer) * 100)}%` }))} />
      </div>
    </div>
  )
}

/* ═══════════════ History ═══════════════ */
function Decided({ decided }: { decided: Decision[] }) {
  const { t, pick, money, locale } = useLocale()
  const [filter, setFilter] = useState<'all' | Outcome>('all')
  const [q, setQ] = useState('')
  const filters: ('all' | Outcome)[] = ['all', 'approved', 'rejected', 'escalated']

  const shown = decided
    .filter((d) => filter === 'all' || d.outcome === filter)
    .filter((d) => !q.trim() || d.order.orderNo.toLowerCase().includes(q.toLowerCase()) || pick(d.order.buyer).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime())

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('approver.tab.decided')}</h2>
        <div className="relative">
          <Search size={15} className="absolute inset-y-0 my-auto start-3 text-ink-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('approver.searchDecided')} className="input ps-9 py-1.5 w-full sm:w-64" />
        </div>
      </div>

      <div className="flex items-center gap-xs flex-wrap">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('rounded-pill px-3 py-1.5 font-sans text-caption border transition-colors',
              filter === f ? 'bg-ink text-ink-on-dark border-ink' : 'bg-surface-1 text-ink-muted border-hairline-strong hover:border-ink/40')}>
            {f === 'all' ? t('oa.filterAll') : f === 'escalated' ? t('approver.escalatedLabel') : t(`capp.${f}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-md">
        {shown.map((d) => (
          <div key={d.order.orderNo} className="card p-lg flex flex-col gap-sm">
            <div className="flex items-center gap-md">
              <OutcomeIcon outcome={d.outcome} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{d.order.orderNo} · {pick(d.order.buyer)}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">
                  {pick(d.order.summary)} · {new Date(d.decidedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {d.hoursToDecide}{t('approver.hoursShort')}
                </p>
              </div>
              <span className="font-sans text-data text-ink tabular-nums">{money(d.order.totalMinor)}</span>
              <StatusBadge variant={d.outcome === 'approved' ? 'success' : d.outcome === 'escalated' ? 'gold' : 'danger'}>
                {d.outcome === 'escalated' ? t('approver.escalatedLabel') : t(`capp.${d.outcome}`)}
              </StatusBadge>
            </div>
            {d.note && <p className="font-sans text-caption text-ink-muted ps-[52px] italic">“{d.note}”</p>}
          </div>
        ))}
        {shown.length === 0 && <p className="font-sans text-data text-ink-subtle py-xl text-center">{t('approver.noResults')}</p>}
      </div>
    </div>
  )
}

/* ═══════════════ Authority — policy reference + delegation ═══════════════ */
function Authority({ delegateTo, onDelegate }: { delegateTo: string | null; onDelegate: (id: string | null) => void }) {
  const { t, pick, money } = useLocale()
  const me = memberById(APPROVER_ID)
  const authority = me?.perOrderLimitMinor ?? null
  const delegates = members.filter((m) => m.status === 'active' && m.id !== APPROVER_ID && (m.role === 'b2b_admin' || m.role === 'approver'))
  // buyers whose over-limit orders route to this approver
  const actingFor = members.filter((m) => m.role === 'buyer')

  const chain = [
    { label: t('oa.chain.auto'), sub: `≤ ${money(orgPolicy.autoApproveBelowMinor)}`, tone: 'success' as const },
    { label: t('approver.youApprove'), sub: `> ${money(orgPolicy.autoApproveBelowMinor)}`, tone: 'gold' as const },
    { label: t('oa.chain.dual'), sub: `≥ ${money(orgPolicy.dualControlAboveMinor)}`, tone: 'danger' as const },
  ]
  const toneCls = { success: 'bg-success/10 text-success border-success/30', gold: 'bg-primary/10 text-primary-hover border-primary/30', danger: 'bg-danger/10 text-danger border-danger/30' }

  return (
    <div className="flex flex-col gap-lg">
      {/* my authority */}
      <div className="rounded-xl bg-canvas-dark text-ink-on-dark p-xl flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <span className="grid place-items-center w-14 h-14 rounded-lg bg-surface-dark-1 border border-hairline-dark text-primary-bright shrink-0"><ShieldCheck size={26} /></span>
          <div>
            <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-on-dark-muted">{t('approver.yourAuthority')}</p>
            <p className="font-serif text-display-md text-ink-on-dark tabular-nums">{authority ? money(authority) : t('team.noLimit')}</p>
          </div>
        </div>
        <p className="font-sans text-caption text-ink-on-dark-muted max-w-xs">{t('approver.authorityNote')}</p>
      </div>

      {/* the policy you enforce (set by the admin) */}
      <div className="card p-lg flex flex-col gap-md">
        <div className="flex items-center justify-between gap-sm">
          <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><ClipboardCheck size={18} className="text-primary-hover" /> {t('approver.policyEnforced')}</h3>
          <StatusBadge variant="neutral">{t('approver.setByAdmin')}</StatusBadge>
        </div>
        <div className="flex items-stretch gap-xs overflow-x-auto pb-xs">
          {chain.map((s, i) => (
            <div key={i} className="flex items-center gap-xs shrink-0">
              <div className={cn('flex flex-col gap-xxs rounded-lg border p-md min-w-[150px]', toneCls[s.tone])}>
                <span className="font-sans text-data font-medium">{s.label}</span>
                <span className="font-sans text-caption tabular-nums opacity-90">{s.sub}</span>
              </div>
              {i < chain.length - 1 && <ArrowRight size={16} className="text-ink-subtle rtl:rotate-180 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* delegation */}
      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><UserCheck size={18} className="text-primary-hover" /> {t('approver.delegation')}</h3>
        <p className="font-sans text-data text-ink-muted">{t('approver.delegationNote')}</p>
        {delegateTo ? (
          <div className="flex flex-wrap items-center gap-md rounded-lg bg-primary/6 border border-primary/25 p-md">
            <UserCheck size={18} className="text-primary-hover" />
            <span className="font-sans text-data text-ink flex-1">{t('approver.currentlyDelegated')} <strong>{pick(memberById(delegateTo)?.name ?? { en: '', ar: '' })}</strong></span>
            <button onClick={() => onDelegate(null)} className={buttonClass('secondary', 'sm')}>{t('approver.endDelegation')}</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-sm">
            {delegates.map((m) => (
              <button key={m.id} onClick={() => onDelegate(m.id)} className="inline-flex items-center gap-sm rounded-lg border border-hairline-strong bg-surface-1 px-md py-2.5 hover:border-ink/40 transition-colors">
                <span className="grid place-items-center w-8 h-8 rounded-pill bg-primary/10 font-serif text-body text-primary-hover">{pick(m.name).charAt(0)}</span>
                <span className="text-start">
                  <span className="block font-sans text-data text-ink">{pick(m.name)}</span>
                  <span className="block font-sans text-caption text-ink-subtle">{t(`team.role.${m.role}`)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* acting for */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{t('approver.actingFor')}</h3></div>
        <ul className="divide-y divide-hairline">
          {actingFor.map((m) => {
            const cc = costCenterById(m.costCenterId)
            return (
              <li key={m.id} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-9 h-9 rounded-pill bg-primary/10 border border-hairline font-serif text-card-title text-primary-hover shrink-0">{pick(m.name).charAt(0)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(m.name)}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate">{cc ? pick(cc.name) : m.costCenter}</p>
                </div>
                <span className="font-sans text-caption text-ink-subtle">{t('approver.limit')} {m.perOrderLimitMinor ? money(m.perOrderLimitMinor) : t('team.noLimit')}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ═══════════════ pieces ═══════════════ */
function Stat({ icon: Icon, label, value, alert }: { icon: typeof Wallet; label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', alert && 'ring-1 ring-danger/30')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs"><Icon size={17} /></span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', alert ? 'text-danger' : 'text-ink')}>{value}</span>
    </div>
  )
}

function Kpi({ label, value, sub, tone = 'ink', alert }: { label: string; value: string; sub?: string; tone?: 'ink' | 'success' | 'danger'; alert?: boolean }) {
  const color = alert ? 'text-danger' : tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', alert && 'ring-1 ring-danger/30')}>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', color)}>{value}</span>
      {sub && <span className="font-sans text-caption text-ink-subtle tabular-nums">{sub}</span>}
    </div>
  )
}

function LegendStat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-wide text-ink-subtle">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />{label}
      </span>
      <span className="font-serif text-card-title text-ink tabular-nums">{value}</span>
    </div>
  )
}

function OutcomeIcon({ outcome }: { outcome: Outcome }) {
  const map = {
    approved: { cls: 'bg-success/12 text-success', icon: <CheckCircle2 size={16} /> },
    rejected: { cls: 'bg-danger/10 text-danger', icon: <XCircle size={16} /> },
    escalated: { cls: 'bg-primary/12 text-primary-hover', icon: <ShieldAlert size={16} /> },
  }[outcome]
  return <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', map.cls)}>{map.icon}</span>
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-card-title tabular-nums', danger ? 'text-danger' : 'text-ink')}>{value}</span>
    </div>
  )
}
