import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Snowflake, Check, Download, Repeat, AlertCircle, Eye, Truck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { type CustomerOrder } from '@/data/account'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Misc'
import { InvoiceModal } from '@/components/account/InvoiceModal'
import { ProductArt } from '@/components/brand/ProductArt'
import { useToast } from '@/components/account/Toast'
import { cn, tint } from '@/lib/cn'
import { customer, statusVariant, EmptyState } from './shared'

/** Orders as compact rows — details and tracking open on demand (عرض / تتبع). */
export function OrdersPanel() {
  const { t, pick, money, locale } = useLocale()
  const [invoiceOrder, setInvoiceOrder] = useState<CustomerOrder | null>(null)
  const [viewNo, setViewNo] = useState<string | null>(null)
  const [trackNo, setTrackNo] = useState<string | null>(null)
  const viewOrder = customer.orders.find((o) => o.orderNo === viewNo) ?? null
  const trackOrder = customer.orders.find((o) => o.orderNo === trackNo) ?? null

  if (customer.orders.length === 0) return <EmptyState icon={Package} title={t('orders.empty')} body={t('orders.emptyBody')} />

  return (
    <>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {customer.orders.map((o) => {
            const count = o.items.reduce((a, it) => a + it.qty, 0)
            return (
              <li key={o.orderNo} className="flex flex-wrap items-center gap-md px-lg py-md hover:bg-surface-2/40 transition-colors">
                <div className="flex-1 min-w-[160px]">
                  <div className="flex items-center gap-xs">
                    <span className="font-sans text-data text-ink tabular-nums">{o.orderNo}</span>
                    {o.coldChain && <Snowflake size={13} className="text-brand-blue shrink-0" aria-label={t('badge.coldChain')} />}
                  </div>
                  <p className="font-sans text-caption text-ink-subtle">
                    {new Date(o.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {count} {pick({ en: 'items', ar: 'قطعة' })}
                  </p>
                </div>
                <StatusBadge variant={statusVariant[o.status]}>{t(`orders.status.${o.status}`)}</StatusBadge>
                <span className="font-sans text-data text-ink tabular-nums w-24 text-end">{money(o.totalMinor)}</span>
                <div className="flex items-center gap-xs">
                  <button onClick={() => setViewNo(o.orderNo)} className={buttonClass('ghost', 'sm')}>
                    <Eye size={15} /> {pick({ en: 'View', ar: 'عرض' })}
                  </button>
                  <button onClick={() => setTrackNo(o.orderNo)} disabled={o.status === 'cancelled'} className={buttonClass('secondary', 'sm')}>
                    <Truck size={15} /> {pick({ en: 'Track', ar: 'تتبع' })}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {viewOrder && <OrderViewModal order={viewOrder} onClose={() => setViewNo(null)} onInvoice={() => setInvoiceOrder(viewOrder)} onTrack={() => { setTrackNo(viewOrder.orderNo); setViewNo(null) }} />}
      {trackOrder && (
        <Modal open onClose={() => setTrackNo(null)} size="md" eyebrow={pick({ en: 'Tracking', ar: 'التتبع' })} title={trackOrder.orderNo}
          footer={<button onClick={() => setTrackNo(null)} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
          <TrackTimeline order={trackOrder} />
        </Modal>
      )}
      <InvoiceModal order={invoiceOrder} open={!!invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </>
  )
}

/** Full order detail — items, total and the actions (invoice, reorder, report). */
function OrderViewModal({ order, onClose, onInvoice, onTrack }: { order: CustomerOrder; onClose: () => void; onInvoice: () => void; onTrack: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const { add } = useCart()
  const { flash } = useToast()
  const [reordered, setReordered] = useState(false)

  const reorder = () => {
    order.items.forEach((it) => add(it.variantId, it.qty))
    setReordered(true)
    flash(t('orders.reorderedToast'))
    setTimeout(() => setReordered(false), 1500)
  }
  const report = () => flash(`${t('orders.issueOpened')} · ${order.orderNo}`)

  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Order', ar: 'الطلب' })} title={order.orderNo}
      footer={<div className="flex items-center justify-between w-full gap-sm">
        <button onClick={report} className={buttonClass('ghost', 'sm')}><AlertCircle size={15} /> {t('orders.reportIssue')}</button>
        <div className="flex items-center gap-xs">
          <button onClick={onInvoice} className={buttonClass('ghost', 'sm')}><Download size={15} /> {t('orders.invoice')}</button>
          <button onClick={reorder} className={buttonClass('secondary', 'sm')}>
            {reordered ? <><Check size={15} /> {t('cta.added')}</> : <><Repeat size={15} /> {t('orders.reorder')}</>}
          </button>
        </div>
      </div>}>
      <div className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
            {order.coldChain && <span className="inline-flex items-center gap-xxs font-sans text-caption text-brand-blue"><Snowflake size={13} /> {t('badge.coldChain')}</span>}
          </div>
          <span className="font-sans text-caption text-ink-subtle">
            {t('orders.placed')} {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="rounded-lg border border-hairline divide-y divide-hairline">
          {order.items.map((it) => {
            const found = variantById(it.variantId)
            if (!found) return null
            const f = flavors[found.product.flavorId]
            return (
              <Link key={it.variantId} to={`/product/${found.product.slug}`} className="flex items-center gap-sm px-md py-2.5 group">
                <span className="w-11 h-11 rounded-md overflow-hidden border border-hairline shrink-0" style={{ backgroundColor: tint(f.accent, 14) }}>
                  <ProductArt flavorId={found.product.flavorId} kind={found.product.type === 'gift_box' ? 'box' : 'bar'} branded={false} />
                </span>
                <span className="flex-1 font-sans text-data text-ink group-hover:text-primary-hover transition-colors">{pick(found.product.title)}</span>
                <span className="font-sans text-caption text-ink-subtle">×{it.qty}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={onTrack} disabled={order.status === 'cancelled'} className={buttonClass('ghost', 'sm')}><Truck size={15} /> {pick({ en: 'Track shipment', ar: 'تتبع الشحنة' })}</button>
          <span className="font-serif text-card-title text-ink tabular-nums">{money(order.totalMinor)}</span>
        </div>
      </div>
    </Modal>
  )
}

function TrackTimeline({ order }: { order: CustomerOrder }) {
  const { t, pick, locale } = useLocale()
  return (
    <div className="rounded-lg bg-surface-2 border border-hairline p-lg">
      <div className="flex items-center justify-between mb-md">
        <span className="font-sans text-caption text-ink-muted">{t('orders.carrier')}: <span className="text-ink">{pick(order.carrier)}</span> · {order.trackingNo}</span>
        {order.coldChain && <span className="inline-flex items-center gap-xxs font-sans text-caption text-success"><Check size={13} /> {t('orders.coldChainOk')}</span>}
      </div>
      <ol className="relative flex flex-col gap-0">
        {order.steps.map((step, i) => {
          const isLast = i === order.steps.length - 1
          const reached = step.done || step.current
          return (
            <li key={step.key} className="relative flex gap-md pb-md last:pb-0">
              {!isLast && <span className={cn('absolute top-5 w-px h-full', reached ? 'bg-primary' : 'bg-hairline-strong')} style={{ insetInlineStart: 9 }} />}
              <span className={cn('relative z-10 grid place-items-center w-5 h-5 rounded-pill shrink-0 mt-0.5', step.done ? 'bg-primary text-on-primary' : step.current ? 'bg-primary/20 ring-2 ring-primary' : 'bg-surface-1 border border-hairline-strong')}>
                {step.done && <Check size={11} />}
              </span>
              <div className="flex-1 flex items-center justify-between gap-sm">
                <span className={cn('font-sans text-data', reached ? 'text-ink' : 'text-ink-subtle')}>{t(`orders.status.${step.key}`)}</span>
                {step.at && <span className="font-sans text-caption text-ink-subtle">{new Date(step.at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
