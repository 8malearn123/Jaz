import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Package, FileText, ShoppingBag, AlertTriangle, Repeat, Check, ArrowRight, Wallet, ClipboardList } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { useCart } from '@/state/CartContext'
import { availableCreditMinor } from '@/data/organization'
import { accountOrders, accountOrderItems, quotes, memberById, type AccountOrder, type AccountOrderStatus } from '@/data/business'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'

const BUYER_ID = 'm-3' // Faisal Al-Harbi

const statusVariant: Record<AccountOrderStatus, 'gold' | 'success' | 'danger' | 'neutral'> = {
  awaiting_approval: 'danger',
  confirmed: 'gold',
  processing: 'gold',
  shipped: 'gold',
  delivered: 'success',
  rejected: 'neutral',
}

export function BuyerWorkspace() {
  const { t, pick } = useLocale()
  const { org, persona } = useChannel()
  const [activeRaw, setActive] = useTab('dashboard')
  const active = ['dashboard', 'orders', 'quotes'].includes(activeRaw) ? activeRaw : 'dashboard'

  const me = memberById(BUYER_ID)
  const myOrders = accountOrders.filter((o) => o.buyerId === BUYER_ID)
  const awaiting = myOrders.filter((o) => o.status === 'awaiting_approval')

  const tabs: TabDef[] = [
    { id: 'dashboard', label: t('buyer.tab.dashboard'), icon: LayoutGrid },
    { id: 'orders', label: t('buyer.tab.myOrders'), icon: Package },
    { id: 'quotes', label: t('business.tab.quotes'), icon: FileText },
  ]

  return (
    <AccountShell
      eyebrow={pick(persona.roleLabel)}
      title={`${t('account.greeting')}, ${pick(persona.name).split(' ')[0]}`}
      subtitle={`${pick(org.legalName)} · ${t('buyer.subtitle')}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
    >
      {active === 'dashboard' && <Dashboard me={me} myOrders={myOrders} awaiting={awaiting} onTab={setActive} />}
      {active === 'orders' && <MyOrders orders={myOrders} />}
      {active === 'quotes' && <MyQuotes />}
    </AccountShell>
  )
}

function Dashboard({
  me,
  myOrders,
  awaiting,
  onTab,
}: {
  me: ReturnType<typeof memberById>
  myOrders: AccountOrder[]
  awaiting: AccountOrder[]
  onTab: (id: string) => void
}) {
  const { t, money } = useLocale()
  const { org } = useChannel()
  const limit = me?.perOrderLimitMinor ?? null
  const available = availableCreditMinor(org)
  const monthSpend = myOrders.filter((o) => o.status !== 'rejected').reduce((s, o) => s + o.totalMinor, 0)

  return (
    <div className="flex flex-col gap-lg">
      {/* awaiting approval callout */}
      {awaiting.length > 0 && (
        <div className="rounded-lg bg-danger/6 border border-danger/25 p-lg flex items-start gap-sm">
          <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-sans text-data font-medium text-ink">
              {awaiting.length} {t('buyer.awaiting')}
            </p>
            <p className="font-sans text-caption text-ink-muted mt-0.5">{t('buyer.awaitingBody')}</p>
          </div>
          <button onClick={() => onTab('orders')} className={buttonClass('secondary', 'sm', 'shrink-0')}>
            {t('cta.viewAll')}
          </button>
        </div>
      )}

      {/* my stats */}
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Wallet} label={t('buyer.myLimit')} value={limit ? money(limit) : t('team.noLimit')} hint={t('buyer.perOrder')} />
        <Stat icon={ClipboardList} label={t('buyer.orgAvailable')} value={money(available)} hint={t('buyer.readOnly')} />
        <Stat icon={Package} label={t('buyer.monthSpend')} value={money(monthSpend)} />
        <Stat icon={AlertTriangle} label={t('orders.status.awaiting_approval')} value={String(awaiting.length)} alert={awaiting.length > 0} />
      </div>

      {/* order on account */}
      <div className="rounded-xl bg-canvas-dark text-ink-on-dark p-xl flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink-on-dark">{t('buyer.orderTitle')}</h2>
          <p className="text-body text-ink-on-dark-muted mt-xs max-w-md">{t('buyer.orderBody')}</p>
        </div>
        <Link to="/shop" className={buttonClass('primary', 'md', 'shrink-0')}>
          <ShoppingBag size={16} /> {t('buyer.browseCatalogue')}
        </Link>
      </div>

      {/* recent orders */}
      <div className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-headline text-ink">{t('buyer.recentOrders')}</h2>
          <button onClick={() => onTab('orders')} className="link-gold">{t('cta.viewAll')} <ArrowRight size={15} className="rtl:rotate-180" /></button>
        </div>
        <div className="flex flex-col divide-y divide-hairline border-y border-hairline">
          {myOrders.slice(0, 3).map((o) => (
            <OrderRow key={o.orderNo} order={o} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MyOrders({ orders }: { orders: AccountOrder[] }) {
  const { t } = useLocale()
  const { add } = useCart()
  const reorder = (orderNo: string) => {
    (accountOrderItems[orderNo] ?? []).forEach((it) => add(it.variantId, it.qty))
  }
  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('buyer.tab.myOrders')}</h2>
      <div className="flex flex-col gap-md">
        {orders.map((o) => (
          <OrderCard key={o.orderNo} order={o} onReorder={() => reorder(o.orderNo)} />
        ))}
      </div>
    </div>
  )
}

function MyQuotes() {
  const { t, pick, money, locale } = useLocale()
  const [requested, setRequested] = useState(false)
  const variant: Record<string, 'gold' | 'success' | 'neutral' | 'danger'> = {
    sent: 'gold', accepted: 'success', converted: 'success', draft: 'neutral', expired: 'danger',
  }
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('quotes.title')}</h2>
        <button onClick={() => setRequested(true)} className={buttonClass('primary', 'sm')}>{t('quotes.request')}</button>
      </div>
      {requested && (
        <div className="rounded-md bg-success/8 border border-success/25 p-md flex items-start gap-sm animate-fade-up">
          <Check size={18} className="text-success mt-0.5 shrink-0" />
          <div>
            <p className="font-sans text-data font-medium text-ink">{t('quotes.requested')}</p>
            <p className="font-sans text-caption text-ink-muted">{t('quotes.requestedBody')}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-md">
        {quotes.map((q) => (
          <div key={q.id} className="card p-lg flex flex-col sm:flex-row sm:items-center gap-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm">
                <span className="font-sans text-data text-ink">{q.ref}</span>
                <StatusBadge variant={variant[q.status]}>{t(`quotes.status.${q.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-muted mt-xxs truncate">{pick(q.note)}</p>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">
                {q.lineCount} {t('quotes.lines')} · {t('quotes.validUntil')} {new Date(q.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span className="font-serif text-card-title text-ink tabular-nums shrink-0">{money(q.totalMinor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── pieces ── */
function Stat({ icon: Icon, label, value, hint, alert }: { icon: typeof Wallet; label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', alert && 'ring-1 ring-danger/30')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs">
        <Icon size={17} />
      </span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', alert ? 'text-danger' : 'text-ink')}>{value}</span>
      {hint && <span className="font-sans text-caption text-ink-subtle">{hint}</span>}
    </div>
  )
}

function OrderRow({ order }: { order: AccountOrder }) {
  const { t, pick, money, locale } = useLocale()
  return (
    <div className="flex items-center gap-md py-md">
      <div className="flex-1 min-w-0">
        <p className="font-sans text-data text-ink">{order.orderNo}</p>
        <p className="font-sans text-caption text-ink-subtle truncate">
          {pick(order.summary)} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <span className="font-sans text-data text-ink tabular-nums">{money(order.totalMinor)}</span>
      <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
    </div>
  )
}

function OrderCard({ order, onReorder }: { order: AccountOrder; onReorder: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const [done, setDone] = useState(false)
  return (
    <div className="card p-lg flex flex-col gap-sm">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <div className="flex items-center gap-sm">
            <span className="font-sans text-data text-ink">{order.orderNo}</span>
            <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
          </div>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">
            {pick(order.summary)} · {t('border.po')} {order.poNumber} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <span className="font-serif text-card-title text-ink tabular-nums">{money(order.totalMinor)}</span>
      </div>
      {order.status === 'awaiting_approval' && (
        <p className="inline-flex items-center gap-xs font-sans text-caption text-danger">
          <AlertTriangle size={13} /> {t('buyer.overYourLimit')}
        </p>
      )}
      <div className="flex items-center gap-xs pt-xs">
        <button onClick={() => { onReorder(); setDone(true); setTimeout(() => setDone(false), 1400) }} className={buttonClass('secondary', 'sm')}>
          {done ? <><Check size={14} /> {t('cta.added')}</> : <><Repeat size={14} /> {t('orders.reorder')}</>}
        </button>
      </div>
    </div>
  )
}
