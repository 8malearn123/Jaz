import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid, Package, Gem, Repeat, Gift, MapPin, ShieldCheck,
  Snowflake, ChevronRight, Check, Plus, Download, Sparkles, ArrowRight, ArrowLeftRight,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { customer, tierOrder, type CustomerOrder, type LoyaltyTier, type OrderStatus } from '@/data/account'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { ProductArt } from '@/components/brand/ProductArt'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { useTab } from '@/lib/useTab'
import { cn, tint } from '@/lib/cn'

const statusVariant: Record<OrderStatus, 'gold' | 'success' | 'neutral'> = {
  confirmed: 'gold',
  processing: 'gold',
  shipped: 'gold',
  out_for_delivery: 'gold',
  delivered: 'success',
  cancelled: 'neutral',
}

export function AccountPage() {
  const { t, pick } = useLocale()
  const [active, setActive] = useTab('overview')

  const tabs: TabDef[] = [
    { id: 'overview', label: t('account.tab.overview'), icon: LayoutGrid },
    { id: 'orders', label: t('account.tab.orders'), icon: Package },
    { id: 'loyalty', label: t('account.tab.loyalty'), icon: Gem },
    { id: 'subscriptions', label: t('account.tab.subscriptions'), icon: Repeat },
    { id: 'giftcards', label: t('account.tab.giftcards'), icon: Gift },
    { id: 'addresses', label: t('account.tab.addresses'), icon: MapPin },
    { id: 'privacy', label: t('account.tab.privacy'), icon: ShieldCheck },
  ]

  return (
    <AccountShell
      eyebrow={t('role.individual')}
      title={`${t('account.greeting')}, ${pick(customer.name).split(' ')[0]}`}
      subtitle={t('account.title')}
      tone="light"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={
        <Link to="/roles" className={buttonClass('primary', 'sm')}>
          <ArrowLeftRight size={15} />
          {t('role.switch')}
        </Link>
      }
    >
      {active === 'overview' && <OverviewPanel onTab={setActive} />}
      {active === 'orders' && <OrdersPanel />}
      {active === 'loyalty' && <LoyaltyPanel />}
      {active === 'subscriptions' && <SubscriptionsPanel />}
      {active === 'giftcards' && <GiftCardsPanel />}
      {active === 'addresses' && <AddressesPanel />}
      {active === 'privacy' && <PrivacyPanel />}
    </AccountShell>
  )
}

/* ───────────── Overview ───────────── */
function OverviewPanel({ onTab }: { onTab: (id: string) => void }) {
  const { t, money } = useLocale()
  const l = customer.loyalty
  const progress = l.nextTierAtMinor ? Math.min(100, (l.lifetimeSpendMinor / l.nextTierAtMinor) * 100) : 100

  return (
    <div className="flex flex-col gap-lg">
      {/* loyalty hero card */}
      <div className="relative rounded-xl overflow-hidden bg-canvas-dark text-ink-on-dark p-xl">
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, #b08a57, transparent 60%)' }} />
        <div className="relative flex flex-col gap-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-primary-bright">{t('loyalty.tier')}</p>
              <p className="font-serif text-display-md text-ink-on-dark capitalize">{t(`loyalty.tier.${l.tier}`)}</p>
            </div>
            <Sparkles className="text-primary-bright" size={28} />
          </div>
          <div className="flex items-end gap-xs">
            <span className="font-serif text-display-md text-primary-bright tabular-nums">{l.points.toLocaleString()}</span>
            <span className="font-sans text-data text-ink-on-dark-muted mb-2">{t('loyalty.points')}</span>
          </div>
          {l.nextTier && (
            <div className="flex flex-col gap-xs">
              <div className="h-2 rounded-pill bg-surface-dark-1 overflow-hidden">
                <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-sans text-caption text-ink-on-dark-muted">
                {money(Math.max(0, (l.nextTierAtMinor ?? 0) - l.lifetimeSpendMinor))} {t('loyalty.toNext')} {t(`loyalty.tier.${l.nextTier}`)}
              </p>
            </div>
          )}
          <button onClick={() => onTab('loyalty')} className={buttonClass('primary', 'sm', 'self-start mt-xs')}>
            {t('loyalty.redeem')}
          </button>
        </div>
      </div>

      {/* recent orders */}
      <div className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-headline text-ink">{t('account.recentOrders')}</h2>
          <button onClick={() => onTab('orders')} className="link-gold">
            {t('cta.viewAll')} <ChevronRight size={15} className="rtl:rotate-180" />
          </button>
        </div>
        <div className="flex flex-col divide-y divide-hairline border-y border-hairline">
          {customer.orders.slice(0, 2).map((o) => (
            <button key={o.orderNo} onClick={() => onTab('orders')} className="flex items-center gap-md py-md text-start hover:bg-surface-2/60 transition-colors -mx-sm px-sm rounded-md">
              <OrderThumb order={o} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink">{o.orderNo}</p>
                <p className="font-sans text-caption text-ink-subtle">{o.items.length} {t('orders.items')} · {money(o.totalMinor)}</p>
              </div>
              <StatusBadge variant={statusVariant[o.status]}>{t(`orders.status.${o.status}`)}</StatusBadge>
            </button>
          ))}
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
        {([
          { id: 'subscriptions', icon: Repeat, label: t('account.tab.subscriptions') },
          { id: 'giftcards', icon: Gift, label: t('account.tab.giftcards') },
          { id: 'addresses', icon: MapPin, label: t('account.tab.addresses') },
          { id: 'privacy', icon: ShieldCheck, label: t('account.tab.privacy') },
        ] as const).map((a) => (
          <button key={a.id} onClick={() => onTab(a.id)} className="card card-hover p-lg flex flex-col items-start gap-sm">
            <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover">
              <a.icon size={18} />
            </span>
            <span className="font-sans text-data text-ink">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function OrderThumb({ order }: { order: CustomerOrder }) {
  const first = variantById(order.items[0].variantId)
  const flavor = first ? flavors[first.product.flavorId] : flavors.milk
  return (
    <span className="w-14 h-14 shrink-0 rounded-md overflow-hidden border border-hairline" style={{ backgroundColor: tint(flavor.accent, 14) }}>
      {first && <ProductArt flavorId={first.product.flavorId} kind={first.product.type === 'gift_box' ? 'box' : 'bar'} branded={false} />}
    </span>
  )
}

/* ───────────── Orders ───────────── */
function OrdersPanel() {
  const { t } = useLocale()
  if (customer.orders.length === 0)
    return <EmptyState icon={Package} title={t('orders.empty')} body={t('orders.emptyBody')} />
  return (
    <div className="flex flex-col gap-lg">
      {customer.orders.map((o) => (
        <OrderCard key={o.orderNo} order={o} />
      ))}
    </div>
  )
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const { t, pick, money, locale } = useLocale()
  const { add } = useCart()
  const [open, setOpen] = useState(order.status === 'out_for_delivery')
  const [reordered, setReordered] = useState(false)

  const reorder = () => {
    order.items.forEach((it) => add(it.variantId, it.qty))
    setReordered(true)
    setTimeout(() => setReordered(false), 1500)
  }

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
          {order.coldChain && (
            <span className="inline-flex items-center gap-xxs font-sans text-caption text-brand-blue">
              <Snowflake size={13} /> {t('badge.coldChain')}
            </span>
          )}
          <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
        </div>
      </div>

      <div className="p-lg flex flex-col gap-md">
        {/* items */}
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

        {/* tracking */}
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

        <div className="flex items-center justify-between gap-sm pt-sm border-t border-hairline">
          <span className="font-serif text-card-title text-ink tabular-nums">{money(order.totalMinor)}</span>
          <div className="flex items-center gap-xs">
            <button onClick={() => {}} className={buttonClass('ghost', 'sm')}>
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
        <span className="font-sans text-caption text-ink-muted">
          {t('orders.carrier')}: <span className="text-ink">{pick(order.carrier)}</span> · {order.trackingNo}
        </span>
        {order.coldChain && (
          <span className="inline-flex items-center gap-xxs font-sans text-caption text-success">
            <Check size={13} /> {t('orders.coldChainOk')}
          </span>
        )}
      </div>
      <ol className="relative flex flex-col gap-0">
        {order.steps.map((step, i) => {
          const isLast = i === order.steps.length - 1
          const reached = step.done || step.current
          return (
            <li key={step.key} className="relative flex gap-md pb-md last:pb-0">
              {!isLast && (
                <span className={cn('absolute top-5 w-px h-full', reached ? 'bg-primary' : 'bg-hairline-strong')} style={{ insetInlineStart: 9 }} />
              )}
              <span
                className={cn(
                  'relative z-10 grid place-items-center w-5 h-5 rounded-pill shrink-0 mt-0.5',
                  step.done ? 'bg-primary text-on-primary' : step.current ? 'bg-primary/20 ring-2 ring-primary' : 'bg-surface-1 border border-hairline-strong',
                )}
              >
                {step.done && <Check size={11} />}
              </span>
              <div className="flex-1 flex items-center justify-between gap-sm">
                <span className={cn('font-sans text-data', reached ? 'text-ink' : 'text-ink-subtle')}>{t(`orders.status.${step.key}`)}</span>
                {step.at && (
                  <span className="font-sans text-caption text-ink-subtle">
                    {new Date(step.at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ───────────── Loyalty ───────────── */
function LoyaltyPanel() {
  const { t, money, pick } = useLocale()
  const l = customer.loyalty
  const perks: Record<LoyaltyTier, { en: string; ar: string }[]> = {
    taster: [
      { en: 'Earn 1 point per SAR', ar: 'نقطة لكل ريال' },
      { en: 'Free shipping over SAR 200', ar: 'شحن مجاني فوق ٢٠٠ ر.س' },
    ],
    connoisseur: [
      { en: 'Earn 1.25 points per SAR', ar: '١٫٢٥ نقطة لكل ريال' },
      { en: 'Early access to limited art-cards', ar: 'وصول مبكر للبطاقات المحدودة' },
    ],
    maison: [
      { en: 'Earn 1.5 points per SAR', ar: '١٫٥ نقطة لكل ريال' },
      { en: 'Personal concierge & a birthday box', ar: 'كونسيرج شخصي وعلبة ميلاد' },
    ],
  }
  return (
    <div className="flex flex-col gap-lg">
      {/* points balance */}
      <div className="card p-lg flex flex-wrap items-center justify-between gap-md">
        <div>
          <p className="eyebrow text-primary-hover">{t('loyalty.tier')} · {t(`loyalty.tier.${l.tier}`)}</p>
          <p className="font-serif text-display-md text-ink tabular-nums leading-none mt-xs">
            {l.points.toLocaleString()} <span className="font-serif text-card-title text-ink-muted">{t('loyalty.points')}</span>
          </p>
        </div>
        <button className={buttonClass('primary', 'sm')}>{t('loyalty.redeem')}</button>
      </div>

      {/* tier ladder */}
      <div className="grid sm:grid-cols-3 gap-sm">
        {tierOrder.map((tier) => {
          const isCurrent = tier === l.tier
          const reached = tierOrder.indexOf(tier) <= tierOrder.indexOf(l.tier)
          return (
            <div key={tier} className={cn('rounded-xl border p-lg flex flex-col gap-sm', isCurrent ? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30' : 'border-hairline bg-surface-1')}>
              <div className="flex items-center justify-between">
                <span className="font-serif text-card-title text-ink capitalize">{t(`loyalty.tier.${tier}`)}</span>
                {isCurrent ? <StatusBadge variant="gold">{t('loyalty.tier')}</StatusBadge> : reached ? <Check size={16} className="text-success" /> : <Gem size={16} className="text-ink-subtle" />}
              </div>
              <ul className="flex flex-col gap-xs">
                {perks[tier].map((p, i) => (
                  <li key={i} className="flex items-start gap-xs font-sans text-caption text-ink-muted">
                    <Check size={13} className="text-primary-hover mt-0.5 shrink-0" /> {pick(p)}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* lifetime */}
      <div className="card p-lg flex items-center justify-between">
        <span className="font-sans text-data text-ink-muted">{t('loyalty.lifetime')}</span>
        <span className="font-serif text-headline text-ink tabular-nums">{money(l.lifetimeSpendMinor)}</span>
      </div>

      {/* history */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h3 className="font-serif text-card-title text-ink">{t('loyalty.history')}</h3>
        </div>
        <ul className="divide-y divide-hairline">
          {l.history.map((h, i) => (
            <li key={i} className="flex items-center justify-between gap-md px-lg py-md">
              <div className="flex items-center gap-sm min-w-0">
                <span className={cn('grid place-items-center w-8 h-8 rounded-pill shrink-0', h.type === 'earn' ? 'bg-success/12 text-success' : 'bg-primary/12 text-primary-hover')}>
                  {h.type === 'earn' ? <Plus size={14} /> : <Gift size={14} />}
                </span>
                <span className="font-sans text-data text-ink truncate">{pick(h.reason)}</span>
              </div>
              <span className={cn('font-sans text-data tabular-nums shrink-0', h.type === 'earn' ? 'text-success' : 'text-ink-muted')}>
                {h.type === 'earn' ? '+' : '−'}{h.points} {t('loyalty.points')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ───────────── Subscriptions ───────────── */
function SubscriptionsPanel() {
  const { t, pick, money, locale } = useLocale()
  const [subs, setSubs] = useState(customer.subscriptions)
  const toggle = (id: string) =>
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s)))

  if (subs.length === 0) return <EmptyState icon={Repeat} title={t('subs.empty')} body="" cta={{ to: '/shop', label: t('subs.startCta') }} />

  return (
    <div className="flex flex-col gap-lg">
      {subs.map((s) => {
        const found = variantById(s.variantId)
        const f = found ? flavors[found.product.flavorId] : flavors.milk
        return (
          <div key={s.id} className="card overflow-hidden flex flex-col sm:flex-row">
            <div className="sm:w-40 relative shrink-0" style={{ backgroundColor: tint(f.accent, 14) }}>
              <div className="aspect-square sm:h-full">
                {found && <ProductArt flavorId={found.product.flavorId} kind="box" />}
              </div>
            </div>
            <div className="flex-1 p-lg flex flex-col gap-sm">
              <div className="flex items-start justify-between gap-sm">
                <div>
                  <h3 className="font-serif text-card-title text-ink">{pick(s.title)}</h3>
                  <p className="font-sans text-caption text-ink-subtle">
                    {s.cadence === 'monthly' ? t('subs.everyMonth') : t('subs.everyQuarter')} · {money(s.priceMinor)}
                  </p>
                </div>
                <StatusBadge variant={s.status === 'active' ? 'success' : 'neutral'}>{t(`subs.status.${s.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-data text-ink-muted">
                {t('subs.next')}: {new Date(s.nextRenewal).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-xs mt-auto pt-xs">
                <button onClick={() => toggle(s.id)} className={buttonClass('secondary', 'sm')}>
                  {s.status === 'active' ? t('subs.pause') : t('subs.resume')}
                </button>
                <button className={buttonClass('ghost', 'sm')}>{t('subs.cancel')}</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────────── Gift cards ───────────── */
function GiftCardsPanel() {
  const { t, money } = useLocale()
  return (
    <div className="flex flex-col gap-lg">
      <div className="grid sm:grid-cols-2 gap-md">
        {customer.giftCards.map((g) => {
          const pct = g.initialMinor ? (g.balanceMinor / g.initialMinor) * 100 : 0
          return (
            <div key={g.code} className="relative rounded-xl overflow-hidden p-lg text-ink-on-dark" style={{ backgroundColor: '#3b241a' }}>
              <div className="absolute inset-0 opacity-30">
                <WaveDivider tone="gold" height={20} />
              </div>
              <div className="relative flex flex-col gap-md">
                <div className="flex items-center justify-between">
                  <Gift size={22} className="text-primary-bright" />
                  <StatusBadge variant={g.status === 'active' ? 'gold' : 'neutral'}>{t(`giftcard.status.${g.status}`)}</StatusBadge>
                </div>
                <div>
                  <p className="eyebrow text-primary-bright">{t('giftcard.balance')}</p>
                  <p className="font-serif text-display-md text-ink-on-dark tabular-nums">{money(g.balanceMinor)}</p>
                </div>
                <div className="h-1.5 rounded-pill bg-surface-dark-1 overflow-hidden">
                  <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="font-sans text-caption text-ink-on-dark-muted tracking-[0.1em]">{g.code}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-sm">
        <button className={buttonClass('primary')}>{t('giftcard.buy')}</button>
        <button className={buttonClass('secondary')}>{t('giftcard.redeem')}</button>
      </div>
    </div>
  )
}

/* ───────────── Addresses ───────────── */
function AddressesPanel() {
  const { t, pick } = useLocale()
  const [addresses, setAddresses] = useState(customer.addresses)
  const makeDefault = (id: string) => setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })))
  return (
    <div className="flex flex-col gap-lg">
      <div className="grid sm:grid-cols-2 gap-md">
        {addresses.map((a) => (
          <div key={a.id} className={cn('card p-lg flex flex-col gap-sm', a.isDefault && 'ring-1 ring-primary/30')}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink">
                <MapPin size={17} className="text-primary-hover" /> {pick(a.label)}
              </span>
              {a.isDefault && <StatusBadge variant="gold">{t('addr.default')}</StatusBadge>}
            </div>
            <p className="font-sans text-data text-ink-muted">
              {pick(a.district)}, {pick(a.city)} · {a.shortAddress}
            </p>
            <div className="flex items-center gap-xs mt-auto pt-xs">
              <button className={buttonClass('ghost', 'sm')}>{t('addr.edit')}</button>
              {!a.isDefault && (
                <button onClick={() => makeDefault(a.id)} className={buttonClass('ghost', 'sm')}>
                  {t('addr.makeDefault')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button className={buttonClass('secondary', 'md', 'self-start')}>
        <Plus size={16} /> {t('addr.add')}
      </button>
    </div>
  )
}

/* ───────────── Privacy / PDPL ───────────── */
function PrivacyPanel() {
  const { t, pick } = useLocale()
  const [consents, setConsents] = useState(customer.consents)
  const [notifs, setNotifs] = useState(customer.notifications)

  return (
    <div className="flex flex-col gap-lg">
      <div className="rounded-lg bg-brand-green/8 border border-brand-green/20 p-lg flex items-start gap-sm">
        <ShieldCheck size={20} className="text-brand-green shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted leading-relaxed">{t('privacy.body')}</p>
      </div>

      {/* consents */}
      <Section title={t('privacy.consents')}>
        {consents.map((c) => (
          <ToggleRow
            key={c.purpose}
            label={t(`consent.${c.purpose}`)}
            checked={c.granted}
            onChange={(v) => setConsents((prev) => prev.map((x) => (x.purpose === c.purpose ? { ...x, granted: v } : x)))}
          />
        ))}
      </Section>

      {/* notifications */}
      <Section title={t('privacy.notifs')}>
        {(Object.keys(notifs) as (keyof typeof notifs)[]).map((k) => (
          <ToggleRow key={k} label={t(`notif.${k}`)} checked={notifs[k]} onChange={(v) => setNotifs((prev) => ({ ...prev, [k]: v }))} />
        ))}
      </Section>

      {/* data rights */}
      <Section title={t('privacy.rights')}>
        <p className="font-sans text-caption text-ink-muted leading-relaxed pb-sm">{t('privacy.rightsNote')}</p>
        <div className="flex flex-wrap gap-sm">
          <button className={buttonClass('secondary', 'sm')}>
            <Download size={15} /> {t('privacy.export')}
          </button>
          <button className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5">
            {t('privacy.erase')}
          </button>
        </div>
      </Section>

      <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Logged out across all devices? Manage sessions in security settings.', ar: 'تسجيل الخروج من كل الأجهزة؟ من إعدادات الأمان.' })}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-lg py-md bg-surface-2 border-b border-hairline">
        <h3 className="font-serif text-card-title text-ink">{title}</h3>
      </div>
      <div className="p-lg flex flex-col">{children}</div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-md py-2.5 cursor-pointer">
      <span className="font-sans text-data text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative w-11 h-6 rounded-pill transition-colors shrink-0', checked ? 'bg-primary' : 'bg-hairline-strong')}
      >
        <span
          className={cn('absolute top-0.5 w-5 h-5 rounded-pill bg-surface-1 shadow-sm transition-all', checked ? 'start-[22px]' : 'start-0.5')}
        />
      </button>
    </label>
  )
}

/* ───────────── shared ───────────── */
function EmptyState({ icon: Icon, title, body, cta }: { icon: typeof Package; title: string; body: string; cta?: { to: string; label: string } }) {
  return (
    <div className="card p-xxl flex flex-col items-center text-center gap-sm">
      <span className="grid place-items-center w-16 h-16 rounded-pill bg-surface-2 border border-hairline text-ink-subtle">
        <Icon size={26} />
      </span>
      <h3 className="font-serif text-headline text-ink">{title}</h3>
      {body && <p className="text-body text-ink-muted max-w-sm">{body}</p>}
      {cta && (
        <Link to={cta.to} className={buttonClass('primary', 'md', 'mt-xs')}>
          {cta.label} <ArrowRight size={15} className="rtl:rotate-180" />
        </Link>
      )}
    </div>
  )
}
