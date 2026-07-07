import { Minus, Plus, Phone, MessageCircle, ClipboardCheck, Cog, Truck, PackageCheck, Check, AlertTriangle, CalendarClock, ArrowRight, MapPin, Clock } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { organization } from '@/data/organization'
import { scheduledDeliveries, accountOrders, accountOrderItems, orgAddressById, type AccountOrderStatus } from '@/data/business'
import { useToast } from '@/components/account/Toast'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'
import type { WholesaleStock } from '@/data/wholesale'

/** Interpolate `{name}` placeholders in a dictionary string. */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

/** Single account-order status → StatusBadge variant (Orders, Delivery, Overview all use this). */
export const orderStatusVariant: Record<AccountOrderStatus, 'gold' | 'success' | 'danger' | 'neutral'> = {
  awaiting_approval: 'danger', confirmed: 'gold', processing: 'gold', shipped: 'gold', delivered: 'success', rejected: 'neutral',
}

/** The one reorder path — copy a placed order's real line items into the shared cart. */
export function reorderToCart(orderNo: string, add: (variantId: string, qty: number) => void): number {
  const items = accountOrderItems[orderNo] ?? []
  items.forEach((it) => add(it.variantId, it.qty))
  return items.reduce((n, it) => n + it.qty, 0)
}

/** Label/value row, tone-aware (dark rails vs light cards). */
export function Row({ label, value, tone = 'light', accent }: { label: string; value: string; tone?: 'light' | 'dark'; accent?: boolean }) {
  const { locale } = useLocale()
  return (
    <div className="flex items-center justify-between">
      <span className={cn('font-sans text-data', tone === 'dark' ? 'text-ink-on-dark-muted' : 'text-ink-muted')}>{label}</span>
      <span className={cn('font-sans text-data tabular-nums', accent ? 'text-success' : tone === 'dark' ? 'text-ink-on-dark' : 'text-ink')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>{value}</span>
    </div>
  )
}

/** In-stock / low-stock pill. */
export function StockBadge({ stock }: { stock: WholesaleStock }) {
  const { t } = useLocale()
  const inStock = stock === 'in'
  return (
    <span className={cn('inline-flex items-center gap-xs rounded-pill border px-2.5 py-1 font-sans text-caption', inStock ? 'bg-success/10 text-success border-success/25' : 'bg-danger/8 text-danger border-danger/25')}>
      <span className={cn('w-1.5 h-1.5 rounded-pill', inStock ? 'bg-success' : 'bg-danger')} />
      {inStock ? t('wholesale.inStock') : t('wholesale.lowStock')}
    </span>
  )
}

/** −  [qty]  +  stepper used across the matrix, catalog cards and detail modal. */
export function QtyStepper({ qty, onDec, onInc, onSet, size = 'md' }: { qty: number; onDec: () => void; onInc: () => void; onSet: (n: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-11' : size === 'sm' ? 'h-9' : 'h-10'
  const w = size === 'lg' ? 'w-12' : 'w-10'
  return (
    <div className={cn('inline-flex items-center bg-surface-2 border border-hairline-strong rounded-md overflow-hidden', h)}>
      <button onClick={onDec} className={cn('grid place-items-center text-primary-hover hover:bg-hairline/50', h, size === 'sm' ? 'w-8' : 'w-9')} aria-label="decrease"><Minus size={15} /></button>
      <input
        type="number"
        value={qty}
        onChange={(e) => onSet(parseInt(e.target.value, 10))}
        className={cn('bg-transparent text-center font-sans font-semibold text-ink tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none', w, h)}
      />
      <button onClick={onInc} className={cn('grid place-items-center text-primary-hover hover:bg-hairline/50', h, size === 'sm' ? 'w-8' : 'w-9')} aria-label="increase"><Plus size={15} /></button>
    </div>
  )
}

/* ── The single order-journey tracker (mini + full), replacing OrderTimeline ── */
const STEP_ICONS = [ClipboardCheck, Cog, Truck, PackageCheck]

function journeyState(status: AccountOrderStatus) {
  // 4 fulfillment stages; awaiting_approval sits at stage 0 (pending), rejected is a dead-end.
  const current = status === 'awaiting_approval' ? 0 : status === 'shipped' ? 2 : status === 'delivered' ? 3 : 1
  return { current, delivered: status === 'delivered', pendingApproval: status === 'awaiting_approval' }
}

export function OrderJourney({ status, variant = 'full' }: { status: AccountOrderStatus; variant?: 'full' | 'mini' }) {
  const { t } = useLocale()
  const labels = [t('buyer.step.approval'), t('buyer.step.processing'), t('buyer.step.shipped'), t('buyer.step.delivered')]

  if (status === 'rejected') {
    return (
      <div className="inline-flex items-center gap-xs rounded-md bg-danger/8 border border-danger/20 px-md py-2 font-sans text-caption text-danger self-start">
        <AlertTriangle size={13} /> {t('orders.status.rejected')}
      </div>
    )
  }

  const { current, delivered, pendingApproval } = journeyState(status)

  if (variant === 'mini') {
    return (
      <div className="flex flex-col gap-xs">
        <div className="flex gap-1">
          {labels.map((_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-pill', i <= current ? 'bg-primary' : 'bg-hairline')} />)}
        </div>
        <span className={cn('font-sans text-caption', pendingApproval ? 'text-danger' : 'text-primary-hover')}>{labels[current]}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center">
      {labels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? (pendingApproval ? 'pending' : delivered ? 'done' : 'current') : 'todo'
        const Icon = STEP_ICONS[i]
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-xxs">
              <span className={cn('grid place-items-center w-8 h-8 rounded-pill border-2 transition-colors',
                state === 'done' ? 'bg-success/15 border-success text-success'
                : state === 'current' ? 'bg-primary/10 border-primary text-primary-hover'
                : state === 'pending' ? 'bg-danger/10 border-danger text-danger animate-pulse'
                : 'bg-surface-2 border-hairline-strong text-ink-subtle')}>
                {state === 'done' ? <Check size={15} /> : <Icon size={14} />}
              </span>
              <span className={cn('font-sans text-[10px] uppercase tracking-wide whitespace-nowrap', state === 'todo' ? 'text-ink-subtle' : 'text-ink-muted')}>{label}</span>
            </div>
            {i < labels.length - 1 && <span className={cn('h-0.5 flex-1 mx-1 rounded-pill', i < current ? 'bg-success/50' : 'bg-hairline')} />}
          </div>
        )
      })}
    </div>
  )
}

/** Compact "next delivery" pointer for the overview — links into the Delivery tab (not a duplicate schedule). */
export function NextDeliveryStrip({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick } = useLocale()
  const next = scheduledDeliveries.find((d) => d.status !== 'delivered') ?? scheduledDeliveries[0]
  if (!next) return null
  const dest = orgAddressById(next.branchId)
  const order = accountOrders.find((o) => o.orderNo === next.orderNo)
  return (
    <button onClick={() => onTab('delivery')} className="card p-lg flex items-center gap-md text-start hover:border-primary/40 transition-colors">
      <span className="grid place-items-center w-10 h-10 rounded-md bg-primary text-on-primary shrink-0"><CalendarClock size={20} /></span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('delivery.nextTitle')}</p>
        <p className="font-sans text-data text-ink truncate">{dest ? pick(dest.label) : ''} — {pick(next.dow)} · {pick(next.window)}</p>
        {order && <p className="font-sans text-caption text-ink-subtle truncate">{next.orderNo} · {pick(order.summary)}</p>}
      </div>
      <ArrowRight size={16} className="text-primary-hover rtl:rotate-180 shrink-0" />
    </button>
  )
}

/** Wholesale account-manager contact card (call / WhatsApp) — shown once, on the overview rail. */
export function AccountManagerCard() {
  const { t, pick } = useLocale()
  const { flash } = useToast()
  const name = pick(organization.salesRep)
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div className="card p-lg flex flex-col gap-md">
      <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('acctmgr.title')}</p>
      <div className="flex items-center gap-sm">
        <span className="grid place-items-center w-10 h-10 rounded-pill bg-primary/10 border border-hairline text-primary-hover font-serif text-card-title shrink-0">{initials}</span>
        <div className="min-w-0">
          <p className="font-sans text-data text-ink truncate">{name}</p>
          <p className="font-sans text-caption text-ink-subtle">{t('acctmgr.role')}</p>
        </div>
      </div>
      <div className="flex items-center gap-xs">
        <button onClick={() => flash(t('acctmgr.calling'))} className="flex-1 inline-flex items-center justify-center gap-xs rounded-md border border-hairline px-3 py-2 font-sans text-caption text-ink-muted hover:text-ink hover:border-ink/30 transition-colors">
          <Phone size={14} /> {t('acctmgr.call')}
        </button>
        <button onClick={() => flash(t('acctmgr.waOpened'))} className="flex-1 inline-flex items-center justify-center gap-xs rounded-md bg-primary text-on-primary px-3 py-2 font-sans text-caption hover:bg-primary-hover transition-colors">
          <MessageCircle size={14} /> {t('acctmgr.whatsapp')}
        </button>
      </div>
    </div>
  )
}

/** Overview "last order journey" card — status, PO, delivery window, journey bar, items → deep-links to Orders. */
export function LastOrderCard({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick } = useLocale()
  const next = scheduledDeliveries.find((d) => d.status !== 'delivered')
  const order = (next && accountOrders.find((o) => o.orderNo === next.orderNo))
    ?? accountOrders.find((o) => o.status === 'processing' || o.status === 'shipped')
    ?? accountOrders[0]
  if (!order) return null
  return (
    <div className="card p-lg flex flex-col gap-md">
      <div className="flex items-start justify-between gap-sm">
        <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('overview.lastOrder')}</p>
        <StatusBadge variant={orderStatusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
      </div>
      <div className="flex items-baseline justify-between gap-sm">
        <span className="font-serif text-card-title text-ink tabular-nums">{order.poNumber}</span>
        {next && <span className="inline-flex items-center gap-xxs font-sans text-caption text-ink-subtle tabular-nums"><Clock size={12} /> {pick(next.dow)} · {pick(next.window)}</span>}
      </div>
      <OrderJourney status={order.status} variant="mini" />
      <p className="font-sans text-caption text-ink-subtle truncate">{pick(order.summary)}</p>
      <button onClick={() => onTab('orders')} className="mt-auto w-full inline-flex items-center justify-center gap-xs rounded-md bg-primary/10 text-primary-hover hover:bg-primary/15 px-4 py-2.5 font-sans text-button uppercase tracking-[0.06em] transition-colors">
        {t('overview.trackOrder')} <ArrowRight size={15} className="rtl:rotate-180" />
      </button>
    </div>
  )
}

/** Overview "next delivery" card — branch, arrival window, address → deep-links to the Delivery schedule. */
export function NextDeliveryCard({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick } = useLocale()
  const next = scheduledDeliveries.find((d) => d.status !== 'delivered') ?? scheduledDeliveries[0]
  if (!next) return null
  const dest = orgAddressById(next.branchId)
  return (
    <div className="card p-lg flex flex-col gap-md">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('delivery.nextTitle')}</p>
          <h3 className="font-serif text-card-title text-ink mt-xs">{dest ? pick(dest.label) : ''} — {pick(next.dow)} {pick(next.window)}</h3>
          {dest && <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick(dest.district)}، {pick(dest.city)} · {dest.shortAddress}</p>}
        </div>
        <span className="grid place-items-center w-10 h-10 rounded-md bg-primary text-on-primary shrink-0"><MapPin size={20} /></span>
      </div>
      <button onClick={() => onTab('delivery')} className="mt-auto w-full inline-flex items-center justify-center gap-xs rounded-md bg-primary/10 text-primary-hover hover:bg-primary/15 px-4 py-2.5 font-sans text-button uppercase tracking-[0.06em] transition-colors">
        {t('delivery.schedule')} <ArrowRight size={15} className="rtl:rotate-180" />
      </button>
    </div>
  )
}
