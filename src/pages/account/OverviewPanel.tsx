import { CalendarHeart, Repeat, AlertCircle, ChevronRight, ArrowRight } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { useCustomer } from '@/state/CustomerContext'
import { customer, type CustomerOrder } from '@/data/account'
import { variantById } from '@/data/products'
import { buttonClass } from '@/components/ui/Button'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { daysUntil, HStepTracker, OrderThumb } from './shared'

export function OverviewPanel({ onTab }: { onTab: (id: string) => void }) {
  const { t, pick, money, locale } = useLocale()
  const { points, wallet, occasions } = useCustomer()
  const { add } = useCart()
  const { flash } = useToast()

  const orders = customer.orders
  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
  const liveOrder = orders.find((o) => o.status === 'out_for_delivery') ?? activeOrders[0]
  const sortedOccasions = [...occasions].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
  const nextOccasion = sortedOccasions[0]
  const arNum = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')

  const stats = [
    { label: t('overview.stat.activeOrders'), value: arNum(activeOrders.length), sub: t('overview.stat.activeOrdersSub'), dot: 'bg-primary' },
    { label: t('overview.stat.wallet'), value: money(wallet.balanceMinor, { withSymbol: false }), sub: t('overview.stat.walletSub'), dot: 'bg-success' },
    { label: t('overview.stat.points'), value: arNum(points), sub: t('overview.stat.pointsSub'), dot: 'bg-primary' },
    { label: t('overview.stat.occasions'), value: arNum(occasions.length), sub: t('overview.stat.occasionsSub'), dot: 'bg-brand-blue' },
  ]

  const reorder = (o: CustomerOrder) => {
    const allInStock = o.items.every((it) => variantById(it.variantId)?.variant.inStock)
    o.items.forEach((it) => add(it.variantId, it.qty))
    flash(allInStock ? `${t('orders.reorderedToast')} · ${o.orderNo}` : t('overview.reorderedPartial'))
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => (
          <div key={i} className="card p-lg flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-ink-subtle">{s.label}</span>
              <span className={cn('w-2 h-2 rounded-pill', s.dot)} />
            </div>
            <div className="font-serif text-display-md text-ink tabular-nums leading-none">{s.value}</div>
            <p className="font-sans text-caption text-ink-subtle">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* live tracking + occasion */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-md">
        {liveOrder ? (
          <div className="card p-lg flex flex-col gap-md">
            <div className="flex items-start justify-between gap-sm">
              <div>
                <p className="eyebrow text-primary-hover inline-flex items-center gap-xs"><span className="w-2 h-2 rounded-pill bg-primary" /> {t('overview.liveTracking')}</p>
                <h3 className="font-serif text-headline text-ink mt-xs">{t('overview.onTheWay')}</h3>
                <p className="font-sans text-caption text-ink-subtle mt-0.5 tabular-nums">{liveOrder.orderNo} · {liveOrder.items.reduce((n, it) => n + it.qty, 0)} {t('orders.items')}</p>
              </div>
              <div className="text-end shrink-0">
                <p className="font-sans text-caption text-ink-subtle">{t('overview.eta')}</p>
                <p className="font-sans text-data text-success mt-0.5">{t('overview.etaValue')}</p>
              </div>
            </div>
            <div className="pt-sm"><HStepTracker steps={liveOrder.steps} showTimes /></div>
            <div className="flex items-center gap-xs pt-md border-t border-hairline">
              <button onClick={() => reorder(liveOrder)} className={buttonClass('primary', 'sm')}><Repeat size={15} /> {t('orders.reorder')}</button>
              <button onClick={() => flash(`${t('orders.issueOpened')} · ${liveOrder.orderNo}`)} className={buttonClass('ghost', 'sm')}><AlertCircle size={15} /> {t('orders.reportIssue')}</button>
            </div>
          </div>
        ) : (
          <div className="card p-lg flex items-center justify-center text-center">
            <p className="font-sans text-data text-ink-subtle">{t('orders.emptyBody')}</p>
          </div>
        )}

        {/* nearest occasion */}
        <div className="relative rounded-xl overflow-hidden p-lg text-ink-on-dark flex flex-col" style={{ backgroundColor: '#221913' }}>
          <p className="eyebrow text-primary-bright inline-flex items-center gap-xs"><CalendarHeart size={13} /> {t('overview.upcomingOccasion')}</p>
          {nextOccasion ? (
            <>
              <h3 className="font-serif text-headline text-ink-on-dark mt-xs">{pick(nextOccasion.title)}</h3>
              <div className="flex items-end gap-xs mt-md">
                <span className="font-serif text-display-lg text-primary-bright tabular-nums leading-none">{arNum(daysUntil(nextOccasion.date))}</span>
                <span className="font-sans text-data text-ink-on-dark-muted mb-1">{t('overview.daysLeft')}</span>
              </div>
              <p className="font-sans text-caption text-ink-on-dark-muted leading-relaxed mt-sm">{t('overview.occasionSuggestion')}</p>
              <button onClick={() => onTab('wishlist')} className="mt-auto pt-md inline-flex items-center gap-xs font-sans text-button uppercase tracking-[0.06em] text-primary-bright hover:text-ink-on-dark transition-colors self-start">
                {t('overview.viewSuggested')} <ArrowRight size={14} className="rtl:rotate-180" />
              </button>
            </>
          ) : (
            <p className="font-sans text-data text-ink-on-dark-muted mt-md">{t('occasions.empty')}</p>
          )}
        </div>
      </div>

      {/* quick reorder */}
      <div className="card p-lg flex flex-col gap-md">
        <div className="flex items-center justify-between gap-sm">
          <div>
            <h3 className="font-serif text-card-title text-ink">{t('overview.quickReorder')}</h3>
            <p className="font-sans text-caption text-ink-subtle mt-0.5">{t('overview.quickReorderNote')}</p>
          </div>
          <button onClick={() => onTab('orders')} className="link-gold shrink-0">{t('overview.allOrders')} <ChevronRight size={15} className="rtl:rotate-180" /></button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-sm">
          {orders.slice(0, 3).map((o) => {
            const first = variantById(o.items[0]?.variantId)
            const allInStock = o.items.every((it) => variantById(it.variantId)?.variant.inStock)
            return (
              <div key={o.orderNo} className="flex items-center gap-sm border border-hairline rounded-lg p-sm">
                <OrderThumb order={o} size={12} />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-caption text-ink truncate">{first ? pick(first.product.title) : o.orderNo}</p>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{money(o.totalMinor)}</p>
                  <p className={cn('font-sans text-caption mt-0.5', allInStock ? 'text-success' : 'text-danger')}>● {allInStock ? t('overview.stockFull') : t('overview.stockPartial')}</p>
                </div>
                <button onClick={() => reorder(o)} className="grid place-items-center w-9 h-9 rounded-md bg-surface-2 border border-hairline-strong text-primary-hover hover:bg-primary hover:text-on-primary hover:border-primary transition-colors shrink-0" aria-label={t('orders.reorder')}>
                  <Repeat size={15} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
