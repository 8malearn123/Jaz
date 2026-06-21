import { useMemo, useState } from 'react'
import { ClipboardCheck, History, Wallet, AlertTriangle, Check, X, CheckCircle2, XCircle } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { availableCreditMinor } from '@/data/organization'
import { accountOrders, memberById, type AccountOrder } from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

interface Decision {
  order: AccountOrder
  decision: 'approved' | 'rejected'
  note: string
  decidedAt: string
}

const seededHistory: Decision[] = [
  {
    order: { orderNo: 'JAZ-2026-001012', placedAt: '2026-06-05', status: 'confirmed', totalMinor: 2100000, buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' }, buyerId: 'm-3', poNumber: 'PO-2026-0399', requiresApproval: true, summary: { en: '80 × Harvest Ribbon', ar: '٨٠ × شريط الحصاد' } },
    decision: 'approved', note: '', decidedAt: '2026-06-05',
  },
  {
    order: { orderNo: 'JAZ-2026-000940', placedAt: '2026-05-18', status: 'rejected', totalMinor: 1650000, buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' }, buyerId: 'm-3', poNumber: 'PO-2026-0381', requiresApproval: true, summary: { en: '50 × gift boxes', ar: '٥٠ × علبة هدايا' } },
    decision: 'rejected', note: '', decidedAt: '2026-05-18',
  },
]

export function ApproverWorkspace({ headerExtra }: { headerExtra: React.ReactNode }) {
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
      headerExtra={headerExtra}
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

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid gap-md sm:grid-cols-3">
        <Stat icon={ClipboardCheck} label={t('approver.pending')} value={String(pending.length)} alert={pending.length > 0} />
        <Stat icon={AlertTriangle} label={t('approver.valueAwaiting')} value={money(totalAwaiting)} />
        <Stat icon={Wallet} label={t('credit.available')} value={money(availableCreditMinor(org))} />
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
            <ApprovalCard key={o.orderNo} order={o} onDecide={onDecide} />
          ))}
        </div>
      )}
    </div>
  )
}

function ApprovalCard({ order, onDecide }: { order: AccountOrder; onDecide: (o: AccountOrder, d: 'approved' | 'rejected', note: string) => void }) {
  const { t, pick, money, locale } = useLocale()
  const [note, setNote] = useState('')
  const buyer = memberById(order.buyerId)
  const limit = buyer?.perOrderLimitMinor ?? 0
  const overage = Math.max(0, order.totalMinor - limit)

  return (
    <div className="card p-lg flex flex-col gap-md ring-1 ring-danger/20">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <div className="flex items-center gap-sm">
            <span className="font-sans text-data text-ink">{order.orderNo}</span>
            <StatusBadge variant="danger">{t('orders.status.awaiting_approval')}</StatusBadge>
          </div>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">
            {t('border.buyer')}: {pick(order.buyer)} · {pick(order.summary)} · {t('border.po')} {order.poNumber}
          </p>
        </div>
        <span className="font-serif text-headline text-ink tabular-nums">{money(order.totalMinor)}</span>
      </div>

      {/* the why: over the buyer's per-order limit */}
      <div className="grid sm:grid-cols-3 gap-sm rounded-md bg-surface-2 border border-hairline p-md">
        <Field label={t('approver.buyerLimit')} value={money(limit)} />
        <Field label={t('approver.orderTotal')} value={money(order.totalMinor)} />
        <Field label={t('approver.overBy')} value={money(overage)} danger />
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('approver.notePlaceholder')}
        className="input"
        aria-label={t('approver.notePlaceholder')}
      />

      <div className="flex items-center gap-xs">
        <button onClick={() => onDecide(order, 'rejected', note)} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5">
          <X size={15} /> {t('border.reject')}
        </button>
        <button onClick={() => onDecide(order, 'approved', note)} className={buttonClass('primary', 'sm')}>
          <Check size={15} /> {t('approver.approveOrder')}
        </button>
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
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {decided.map((d) => (
            <li key={d.order.orderNo} className="flex items-center gap-md px-lg py-md">
              <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', d.decision === 'approved' ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger')}>
                {d.decision === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{d.order.orderNo} · {pick(d.order.buyer)}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">
                  {pick(d.order.summary)} · {new Date(d.decidedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className="font-sans text-data text-ink tabular-nums">{money(d.order.totalMinor)}</span>
              <StatusBadge variant={d.decision === 'approved' ? 'success' : 'danger'}>{t(`capp.${d.decision}`)}</StatusBadge>
            </li>
          ))}
        </ul>
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
