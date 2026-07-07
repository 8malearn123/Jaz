import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Snowflake, ChevronRight, Check, Download, Repeat, AlertCircle } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { type CustomerOrder } from '@/data/account'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { InvoiceModal } from '@/components/account/InvoiceModal'
import { ProductArt } from '@/components/brand/ProductArt'
import { useToast } from '@/components/account/Toast'
import { cn, tint } from '@/lib/cn'
import { customer, statusVariant, EmptyState } from './shared'

export function OrdersPanel() {
  const { t } = useLocale()
  const [invoiceOrder, setInvoiceOrder] = useState<CustomerOrder | null>(null)
  if (customer.orders.length === 0) return <EmptyState icon={Package} title={t('orders.empty')} body={t('orders.emptyBody')} />
  return (
    <>
      <div className="flex flex-col gap-lg">
        {customer.orders.map((o) => (
          <OrderCard key={o.orderNo} order={o} onInvoice={() => setInvoiceOrder(o)} />
        ))}
      </div>
      <InvoiceModal order={invoiceOrder} open={!!invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </>
  )
}

function OrderCard({ order, onInvoice }: { order: CustomerOrder; onInvoice: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const { add } = useCart()
  const { flash } = useToast()
  const [open, setOpen] = useState(order.status === 'out_for_delivery')
  const [reordered, setReordered] = useState(false)

  const reorder = () => {
    order.items.forEach((it) => add(it.variantId, it.qty))
    setReordered(true)
    flash(t('orders.reorderedToast'))
    setTimeout(() => setReordered(false), 1500)
  }

  const report = () => flash(`${t('orders.issueOpened')} · ${order.orderNo}`)

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-sm p-lg bg-surface-2 border-b border-hairline">
        <div className="flex flex-col">
          <span className="font-sans text-data text-ink">{order.orderNo}</span>
          <span className="font-sans text-caption text-ink-subtle">
            {t('orders.placed')} {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-sm">
          {order.coldChain && <span className="inline-flex items-center gap-xxs font-sans text-caption text-brand-blue"><Snowflake size={13} /> {t('badge.coldChain')}</span>}
          <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
        </div>
      </div>

      <div className="p-lg flex flex-col gap-md">
        <div className="flex flex-wrap gap-md">
          {order.items.map((it) => {
            const found = variantById(it.variantId)
            if (!found) return null
            const f = flavors[found.product.flavorId]
            return (
              <Link key={it.variantId} to={`/product/${found.product.slug}`} className="flex items-center gap-sm group">
                <span className="w-12 h-12 rounded-md overflow-hidden border border-hairline shrink-0" style={{ backgroundColor: tint(f.accent, 14) }}>
                  <ProductArt flavorId={found.product.flavorId} kind={found.product.type === 'gift_box' ? 'box' : 'bar'} branded={false} />
                </span>
                <span className="flex flex-col">
                  <span className="font-sans text-caption text-ink group-hover:text-primary-hover transition-colors">{pick(found.product.title)}</span>
                  <span className="font-sans text-caption text-ink-subtle">×{it.qty}</span>
                </span>
              </Link>
            )
          })}
        </div>

        {order.status !== 'cancelled' && (
          <div>
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-xs font-sans text-caption uppercase tracking-[0.1em] text-ink-muted hover:text-ink">
              <Snowflake size={14} className="text-brand-blue" />
              {t('orders.tracking')}
              <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />
            </button>
            {open && <TrackTimeline order={order} />}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-sm pt-sm border-t border-hairline">
          <span className="font-serif text-card-title text-ink tabular-nums">{money(order.totalMinor)}</span>
          <div className="flex items-center gap-xs">
            <button onClick={report} className={buttonClass('ghost', 'sm')}>
              <AlertCircle size={15} /> {t('orders.reportIssue')}
            </button>
            <button onClick={onInvoice} className={buttonClass('ghost', 'sm')}>
              <Download size={15} /> {t('orders.invoice')}
            </button>
            <button onClick={reorder} className={buttonClass('secondary', 'sm')}>
              {reordered ? <><Check size={15} /> {t('cta.added')}</> : <><Repeat size={15} /> {t('orders.reorder')}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackTimeline({ order }: { order: CustomerOrder }) {
  const { t, pick, locale } = useLocale()
  return (
    <div className="mt-md rounded-lg bg-surface-2 border border-hairline p-lg">
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
