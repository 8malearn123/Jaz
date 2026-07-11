import { useState, useEffect } from 'react'
import { AlertTriangle, Repeat, Check, Eye, Download, Clock, X } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import {
  accountOrders, accountOrderItems, members, CANCEL_WINDOW_MS,
  type AccountOrder, type AccountOrderStatus,
} from '@/data/business'
import { variantById } from '@/data/products'
import { ProductThumb } from '@/components/ui/ProductPicker'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { orderStatusVariant, reorderToCart, OrderJourney, Row } from './shared'

// An order may be cancelled only while still early-stage (before it ships or is delivered).
const CANCELLABLE: ReadonlySet<AccountOrderStatus> = new Set(['awaiting_approval', 'confirmed', 'processing'])

/* ─────────── Org orders (unified B2B account — all orders, not just mine) ─────────── */
export function OrgOrdersPanel() {
  // Live copy so a cancellation persists in-session. Early-stage orders open a 30-min cancel window now.
  const [orders, setOrders] = useState<AccountOrder[]>(() =>
    accountOrders.map((o) => (CANCELLABLE.has(o.status) ? { ...o, placedTs: Date.now() } : o)))
  const [viewNo, setViewNo] = useState<string | null>(null)
  const viewOrder = orders.find((o) => o.orderNo === viewNo) ?? null
  const cancelOrder = (orderNo: string) => setOrders((prev) => prev.map((o) => (o.orderNo === orderNo ? { ...o, cancelled: true } : o)))
  return (
    <div className="flex flex-col gap-lg">
      <MyOrders orders={orders} onView={(o) => setViewNo(o.orderNo)} />
      <OrderDetailModal order={viewOrder} open={!!viewOrder} onClose={() => setViewNo(null)} onCancel={cancelOrder} />
    </div>
  )
}

/* ─────────── My orders ─────────── */
function MyOrders({ orders, onView }: { orders: AccountOrder[]; onView: (o: AccountOrder) => void }) {
  const { t } = useLocale()
  const { add } = useCart()
  const [filter, setFilter] = useState<'all' | 'awaiting_approval' | 'processing' | 'delivered'>('all')
  const filters: typeof filter[] = ['all', 'awaiting_approval', 'processing', 'delivered']
  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  const reorder = (orderNo: string) => { reorderToCart(orderNo, add) }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('buyer.tab.myOrders')}</h2>
        <div className="flex items-center gap-xs flex-wrap">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-pill px-3 py-1.5 font-sans text-caption border transition-colors',
                filter === f ? 'bg-ink text-ink-on-dark border-ink' : 'bg-surface-1 text-ink-muted border-hairline-strong hover:border-ink/40')}>
              {f === 'all' ? t('oa.filterAll') : t(`orders.status.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-md">
        {shown.map((o) => (
          <OrderCard key={o.orderNo} order={o} onReorder={() => reorder(o.orderNo)} onView={() => onView(o)} />
        ))}
        {shown.length === 0 && <p className="font-sans text-data text-ink-subtle py-xl text-center">{t('buyer.noOrders')}</p>}
      </div>
    </div>
  )
}

/** Compact, scannable order card: id + date on one side, prominent total on the other,
 *  a minimalist progress bar instead of the wide stepper, and an inline soft alert. */
function OrderCard({ order, onReorder, onView }: { order: AccountOrder; onReorder: () => void; onView: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const [done, setDone] = useState(false)
  const journey = order.cancelled
    ? <p className="inline-flex items-center gap-xs font-sans text-caption text-danger"><X size={13} /> {pick({ en: 'This order was cancelled.', ar: 'أُلغي هذا الطلب.' })}</p>
    : <OrderJourney status={order.status} variant="mini" />
  return (
    <div className={cn('rounded-2xl bg-surface-1 border border-hairline shadow-soft px-lg py-md flex flex-col gap-sm', order.cancelled && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-md">
        {/* order id · status · meta */}
        <div className="flex-1 min-w-[190px]">
          <div className="flex items-center gap-sm">
            <span className="font-sans text-data font-semibold text-ink tabular-nums">{order.orderNo}</span>
            {order.cancelled
              ? <StatusBadge variant="danger">{pick({ en: 'Cancelled', ar: 'ملغى' })}</StatusBadge>
              : <StatusBadge variant={orderStatusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>}
          </div>
          <p className="font-sans text-caption text-ink-subtle mt-xxs truncate max-w-[420px]">
            {pick(order.summary)} · {t('border.po')} {order.poNumber} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* minimalist progress (hidden on small screens — repeated below) */}
        <div className="w-44 shrink-0 hidden md:block">{journey}</div>

        {/* prominent total */}
        <span className="font-serif text-card-title text-ink tabular-nums ms-auto">{money(order.totalMinor)}</span>

        {/* actions */}
        <div className="flex items-center gap-xs shrink-0">
          <button onClick={onView} className={buttonClass('secondary', 'sm')}><Eye size={14} /> {t('order.view')}</button>
          <button onClick={() => { onReorder(); setDone(true); setTimeout(() => setDone(false), 1400) }} className={buttonClass('secondary', 'sm')}>
            {done ? <><Check size={14} /> {t('cta.added')}</> : <><Repeat size={14} /> {t('orders.reorder')}</>}
          </button>
        </div>
      </div>

      {/* progress on small screens */}
      <div className="md:hidden">{journey}</div>

      {/* inline soft alert */}
      {!order.cancelled && order.status === 'awaiting_approval' && (
        <div className="inline-flex items-center gap-xs self-start rounded-lg bg-danger/8 border border-danger/15 px-md py-1.5 font-sans text-caption font-medium text-danger">
          <AlertTriangle size={13} className="shrink-0" /> {t('buyer.overYourLimit')}
        </div>
      )}
    </div>
  )
}


/* ─────────── Lists ─────────── */

/* ─────────── Order detail / invoice ─────────── */
function OrderDetailModal({ order, open, onClose, onCancel }: { order: AccountOrder | null; open: boolean; onClose: () => void; onCancel: (orderNo: string) => void }) {
  const { t, pick, money, locale } = useLocale()
  const [now, setNow] = useState(() => Date.now())
  const canCancel = !!order && !order.cancelled && CANCELLABLE.has(order.status) && order.placedTs != null && (order.placedTs + CANCEL_WINDOW_MS - now) > 0
  // Tick the countdown while the window is open.
  useEffect(() => {
    if (!canCancel) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [canCancel])
  if (!order) return null

  const remaining = order.placedTs != null ? order.placedTs + CANCEL_WINDOW_MS - now : -1
  const mm = String(Math.max(0, Math.floor(remaining / 60000))).padStart(2, '0')
  const ss = String(Math.max(0, Math.floor((remaining % 60000) / 1000))).padStart(2, '0')
  const windowClosed = !order.cancelled && CANCELLABLE.has(order.status) && !canCancel
  const doCancel = () => { onCancel(order.orderNo); onClose() }

  const approver = members.find((m) => m.role === 'approver')
  const lines = (accountOrderItems[order.orderNo] ?? [])
    .map((it) => { const found = variantById(it.variantId); return found ? { found, qty: it.qty, unit: found.variant.b2bPriceMinor, total: found.variant.b2bPriceMinor * it.qty } : null })
    .filter(Boolean) as { found: NonNullable<ReturnType<typeof variantById>>; qty: number; unit: number; total: number }[]

  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const vat = Math.round(subtotal * 0.15)
  const total = subtotal + vat
  const awaiting = order.status === 'awaiting_approval'

  const download = () => {
    const doc = { orderNo: order.orderNo, po: order.poNumber, status: order.status, buyer: order.buyer.en, lines: lines.map((l) => ({ item: l.found.product.title.en, qty: l.qty, unit_minor: l.unit, total_minor: l.total })), subtotal_minor: subtotal, vat_minor: vat, total_minor: total, currency: 'SAR' }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${order.orderNo}.json`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open={open} onClose={onClose} size="lg" eyebrow={t('order.details')} title={order.orderNo}
      footer={<div className="flex items-center justify-between w-full gap-md">
        <div className="min-w-0">
          {order.cancelled ? (
            <span className="inline-flex items-center gap-xs font-sans text-caption text-danger"><X size={14} /> {pick({ en: 'Order cancelled', ar: 'الطلب ملغى' })}</span>
          ) : canCancel ? (
            <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle tabular-nums"><Clock size={13} /> {pick({ en: 'Cancel window', ar: 'نافذة الإلغاء' })} {mm}:{ss}</span>
          ) : windowClosed ? (
            <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Cancellation window closed', ar: 'انتهت نافذة الإلغاء' })}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-sm shrink-0">
          {canCancel && <button onClick={doCancel} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={15} /> {pick({ en: 'Cancel order', ar: 'إلغاء الطلب' })}</button>}
          {!awaiting && order.status !== 'rejected' && !order.cancelled && <button onClick={download} className={buttonClass('primary', 'sm')}><Download size={15} /> {t('inv.download')}</button>}
          <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>
        </div>
      </div>}
    >
      <div className="flex flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            {order.cancelled
              ? <StatusBadge variant="danger">{pick({ en: 'Cancelled', ar: 'ملغى' })}</StatusBadge>
              : <StatusBadge variant={orderStatusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>}
            <span className="font-sans text-caption text-ink-subtle">{t('border.po')} {order.poNumber}</span>
          </div>
          <span className="font-sans text-caption text-ink-subtle">
            {t('border.buyer')}: {pick(order.buyer)} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* fulfillment tracking */}
        {order.cancelled ? (
          <div className="rounded-md bg-danger/8 border border-danger/25 px-md py-sm font-sans text-caption text-danger inline-flex items-center gap-xs self-start"><X size={14} /> {pick({ en: 'This order was cancelled and will not be fulfilled.', ar: 'أُلغي هذا الطلب ولن يُنفَّذ.' })}</div>
        ) : (
          <div className="rounded-lg bg-surface-2 border border-hairline p-lg">
            <OrderJourney status={order.status} variant="full" />
          </div>
        )}
        {canCancel && <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'You can cancel this order free of charge within 30 minutes, before it ships.', ar: 'يمكنك إلغاء هذا الطلب مجانًا خلال ٣٠ دقيقة، قبل شحنه.' })}</p>}

        {awaiting && !order.cancelled && (
          <div className="rounded-md bg-danger/6 border border-danger/25 p-md flex items-start gap-sm">
            <Clock size={18} className="text-danger mt-0.5 shrink-0" />
            <p className="font-sans text-data text-ink-muted">
              {t('buyer.awaitingDetail')}{approver ? ` ${t('buyer.pendingWith')} ${pick(approver.name)}.` : ''}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-hairline">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{t('inv.item')}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{t('inv.qty')}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2 hidden sm:table-cell">{t('inv.unit')}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{t('inv.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-hairline">
                  <td className="px-md py-2.5">
                    <div className="flex items-center gap-sm">
                      <ProductThumb flavorId={l.found.product.flavorId} type={l.found.product.type} className="w-9 h-9" />
                      <span className="font-sans text-data text-ink">{pick(l.found.product.title)}</span>
                    </div>
                  </td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{l.qty}</td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink-muted tabular-nums hidden sm:table-cell">{money(l.unit, { withSymbol: false })}</td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{money(l.total, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-xs sm:w-64 sm:ms-auto">
          <Row label={t('cart.subtotal')} value={money(subtotal)} />
          <Row label={t('cart.vat')} value={money(vat)} />
          <div className="flex items-center justify-between pt-xs mt-xs border-t border-hairline-strong">
            <span className="font-serif text-card-title text-ink">{t('cart.total')}</span>
            <span className="font-serif text-card-title text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

