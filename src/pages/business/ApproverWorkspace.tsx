import { useMemo, useState } from 'react'
import {
  ClipboardCheck, History, Wallet, AlertTriangle, Check, X, CheckCircle2, XCircle,
  ChevronRight, ShieldCheck, ShieldAlert, ArrowRight,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { availableCreditMinor } from '@/data/organization'
import { accountOrders, accountOrderItems, memberById, type AccountOrder } from '@/data/business'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn, tint } from '@/lib/cn'

const APPROVER_ID = 'm-2' // Sara Al-Dosari

interface Decision {
  order: AccountOrder
  decision: 'approved' | 'rejected'
  note: string
  decidedAt: string
}

const seededHistory: Decision[] = [
  {
    order: { orderNo: 'JAZ-2026-001012', placedAt: '2026-06-05', status: 'confirmed', totalMinor: 2100000, buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' }, buyerId: 'm-3', poNumber: 'PO-2026-0399', requiresApproval: true, summary: { en: '80 × Harvest Ribbon', ar: '٨٠ × شريط الحصاد' } },
    decision: 'approved', note: 'Within Q2 events budget.', decidedAt: '2026-06-05',
  },
  {
    order: { orderNo: 'JAZ-2026-000940', placedAt: '2026-05-18', status: 'rejected', totalMinor: 1650000, buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' }, buyerId: 'm-3', poNumber: 'PO-2026-0381', requiresApproval: true, summary: { en: '50 × gift boxes', ar: '٥٠ × علبة هدايا' } },
    decision: 'rejected', note: 'Over the seasonal budget — please split.', decidedAt: '2026-05-18',
  },
]

export function ApproverWorkspace() {
  const { t, pick } = useLocale()
  const { org, persona } = useChannel()
  const [activeRaw, setActive] = useTab('approvals')
  const active = ['approvals', 'decided'].includes(activeRaw) ? activeRaw : 'approvals'
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  const pending = useMemo(
    () => accountOrders.filter((o) => o.status === 'awaiting_approval' && !decisions[o.orderNo]),
    [decisions],
  )
  const decided = [...Object.values(decisions), ...seededHistory]

  const decide = (order: AccountOrder, decision: 'approved' | 'rejected', note: string) =>
    setDecisions((prev) => ({ ...prev, [order.orderNo]: { order, decision, note, decidedAt: '2026-06-21' } }))

  const tabs: TabDef[] = [
    { id: 'approvals', label: `${t('approver.tab.queue')}${pending.length ? ` · ${pending.length}` : ''}`, icon: ClipboardCheck },
    { id: 'decided', label: t('approver.tab.decided'), icon: History },
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
    >
      {active === 'approvals' && <Queue pending={pending} onDecide={decide} />}
      {active === 'decided' && <Decided decided={decided} />}
    </AccountShell>
  )
}

function Queue({ pending, onDecide }: { pending: AccountOrder[]; onDecide: (o: AccountOrder, d: 'approved' | 'rejected', note: string) => void }) {
  const { t, money } = useLocale()
  const { org } = useChannel()
  const totalAwaiting = pending.reduce((s, o) => s + o.totalMinor, 0)
  const authority = memberById(APPROVER_ID)?.perOrderLimitMinor ?? null

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ClipboardCheck} label={t('approver.pending')} value={String(pending.length)} alert={pending.length > 0} />
        <Stat icon={AlertTriangle} label={t('approver.valueAwaiting')} value={money(totalAwaiting)} />
        <Stat icon={Wallet} label={t('credit.available')} value={money(availableCreditMinor(org))} />
        <Stat icon={ShieldCheck} label={t('approver.authority')} value={authority ? money(authority) : t('team.noLimit')} />
      </div>

      <div className="rounded-lg bg-surface-2 border border-hairline p-md flex items-start gap-sm">
        <ClipboardCheck size={18} className="text-primary-hover shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted">{t('approver.explainer')}</p>
      </div>

      {pending.length === 0 ? (
        <div className="card p-xxl flex flex-col items-center text-center gap-sm">
          <span className="grid place-items-center w-16 h-16 rounded-pill bg-success/12 text-success">
            <CheckCircle2 size={26} />
          </span>
          <h3 className="font-serif text-headline text-ink">{t('approver.empty')}</h3>
          <p className="text-body text-ink-muted">{t('approver.emptyBody')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {pending.map((o) => (
            <ApprovalCard key={o.orderNo} order={o} authority={authority} onDecide={onDecide} />
          ))}
        </div>
      )}
    </div>
  )
}

function ApprovalCard({ order, authority, onDecide }: { order: AccountOrder; authority: number | null; onDecide: (o: AccountOrder, d: 'approved' | 'rejected', note: string) => void }) {
  const { t, pick, money, locale } = useLocale()
  const { org } = useChannel()
  const [note, setNote] = useState('')
  const [reasonNeeded, setReasonNeeded] = useState(false)
  const [showItems, setShowItems] = useState(false)

  const buyer = memberById(order.buyerId)
  const limit = buyer?.perOrderLimitMinor ?? 0
  const overage = Math.max(0, order.totalMinor - limit)
  const available = availableCreditMinor(org)
  const after = available - order.totalMinor
  const exceedsCredit = after < 0
  const withinAuthority = authority === null || order.totalMinor <= authority

  const items = (accountOrderItems[order.orderNo] ?? [])
    .map((it) => {
      const found = variantById(it.variantId)
      return found ? { found, qty: it.qty, total: found.variant.b2bPriceMinor * it.qty } : null
    })
    .filter(Boolean) as { found: NonNullable<ReturnType<typeof variantById>>; qty: number; total: number }[]

  const tryReject = () => {
    if (!note.trim()) { setReasonNeeded(true); return }
    onDecide(order, 'rejected', note)
  }

  return (
    <div className="card p-lg flex flex-col gap-md ring-1 ring-danger/20">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex items-start gap-sm min-w-0">
          <span className="grid place-items-center w-10 h-10 rounded-pill bg-surface-2 border border-hairline font-serif text-card-title text-ink shrink-0">
            {pick(order.buyer).charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-sm">
              <span className="font-sans text-data text-ink">{order.orderNo}</span>
              <StatusBadge variant="danger">{t('orders.status.awaiting_approval')}</StatusBadge>
            </div>
            <p className="font-sans text-caption text-ink-subtle mt-xxs">
              {pick(order.buyer)} · {pick(order.summary)} · {t('border.po')} {order.poNumber}
            </p>
          </div>
        </div>
        <span className="font-serif text-headline text-ink tabular-nums">{money(order.totalMinor)}</span>
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

      {/* the why: over the buyer's per-order limit */}
      <div className="grid sm:grid-cols-3 gap-sm rounded-md bg-surface-2 border border-hairline p-md">
        <Field label={t('approver.buyerLimit')} value={money(limit)} />
        <Field label={t('approver.orderTotal')} value={money(order.totalMinor)} />
        <Field label={t('approver.overBy')} value={money(overage)} danger />
      </div>

      {/* credit impact + authority */}
      <div className="flex flex-col gap-sm">
        <div className={cn('flex items-center justify-between gap-sm rounded-md border p-md', exceedsCredit ? 'bg-danger/6 border-danger/25' : 'bg-success/6 border-success/20')}>
          <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('approver.creditImpact')}</span>
          <span className="inline-flex items-center gap-xs font-sans text-data">
            <span className="text-ink-muted">{money(available)}</span>
            <ArrowRight size={13} className="text-ink-subtle rtl:rotate-180" />
            <span className={cn('tabular-nums font-medium', exceedsCredit ? 'text-danger' : 'text-success')}>{money(after)}</span>
          </span>
        </div>
        {exceedsCredit && (
          <p className="inline-flex items-center gap-xs font-sans text-caption text-danger"><AlertTriangle size={13} /> {t('approver.exceedsCredit')}</p>
        )}
        <p className={cn('inline-flex items-center gap-xs font-sans text-caption', withinAuthority ? 'text-success' : 'text-danger')}>
          {withinAuthority ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
          {withinAuthority ? t('approver.withinAuthority') : t('approver.exceedsAuthority')}
        </p>
      </div>

      {/* note */}
      <div className="flex flex-col gap-xxs">
        <input
          value={note}
          onChange={(e) => { setNote(e.target.value); setReasonNeeded(false) }}
          placeholder={t('approver.notePlaceholder')}
          className={cn('input', reasonNeeded && 'border-danger')}
          aria-label={t('approver.notePlaceholder')}
        />
        {reasonNeeded && <span className="font-sans text-caption text-danger">{t('approver.rejectReason')}</span>}
      </div>

      {/* actions */}
      <div className="flex items-center gap-xs">
        <button onClick={tryReject} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5">
          <X size={15} /> {t('border.reject')}
        </button>
        {withinAuthority ? (
          <button onClick={() => onDecide(order, 'approved', note)} className={buttonClass('primary', 'sm')}>
            <Check size={15} /> {t('approver.approveOrder')}
          </button>
        ) : (
          <button onClick={() => onDecide(order, 'rejected', note || 'Escalated — above approver authority')} className={buttonClass('dark', 'sm')}>
            <ShieldAlert size={15} /> {t('approver.escalate')}
          </button>
        )}
        <span className="ms-auto font-sans text-caption text-ink-subtle">
          {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}

function Decided({ decided }: { decided: Decision[] }) {
  const { t, pick, money, locale } = useLocale()
  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('approver.tab.decided')}</h2>
      <div className="flex flex-col gap-md">
        {decided.map((d) => (
          <div key={d.order.orderNo} className="card p-lg flex flex-col gap-sm">
            <div className="flex items-center gap-md">
              <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', d.decision === 'approved' ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger')}>
                {d.decision === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{d.order.orderNo} · {pick(d.order.buyer)}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">
                  {pick(d.order.summary)} · {new Date(d.decidedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <span className="font-sans text-data text-ink tabular-nums">{money(d.order.totalMinor)}</span>
              <StatusBadge variant={d.decision === 'approved' ? 'success' : 'danger'}>{t(`capp.${d.decision}`)}</StatusBadge>
            </div>
            {d.note && (
              <p className="font-sans text-caption text-ink-muted ps-[52px] italic">“{d.note}”</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── pieces ── */
function Stat({ icon: Icon, label, value, alert }: { icon: typeof Wallet; label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', alert && 'ring-1 ring-danger/30')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs">
        <Icon size={17} />
      </span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', alert ? 'text-danger' : 'text-ink')}>{value}</span>
    </div>
  )
}

function Field({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-card-title tabular-nums', danger ? 'text-danger' : 'text-ink')}>{value}</span>
    </div>
  )
}
