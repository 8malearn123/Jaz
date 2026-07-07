import { LayoutGrid, Package, Gem, Repeat, MapPin, Heart, ShieldCheck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { CustomerProvider, useCustomer } from '@/state/CustomerContext'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { ToastProvider } from '@/components/account/Toast'
import { useTab } from '@/lib/useTab'
import { OverviewPanel } from '@/pages/account/OverviewPanel'
import { OrdersPanel } from '@/pages/account/OrdersPanel'
import { WalletLoyaltyPanel } from '@/pages/account/WalletLoyaltyPanel'
import { SubscriptionsPanel } from '@/pages/account/SubscriptionsPanel'
import { AddressesPanel } from '@/pages/account/AddressesPanel'
import { WishlistPanel } from '@/pages/account/WishlistPanel'
import { SettingsPrivacyPanel } from '@/pages/account/SettingsPrivacyPanel'

export function AccountPage() {
  return (
    <CustomerProvider>
      <ToastProvider>
        <AccountContent />
      </ToastProvider>
    </CustomerProvider>
  )
}

function AccountContent() {
  const { t, pick } = useLocale()
  const { name } = useCustomer()
  const [activeTab, setActive] = useTab('overview')

  const tabs: TabDef[] = [
    { id: 'overview', label: t('account.tab.overview'), icon: LayoutGrid },
    { id: 'orders', label: t('account.tab.orders'), icon: Package },
    { id: 'loyalty', label: t('account.tab.loyalty'), icon: Gem },
    { id: 'subscriptions', label: t('account.tab.subscriptions'), icon: Repeat },
    { id: 'addresses', label: t('account.tab.addresses'), icon: MapPin },
    { id: 'wishlist', label: t('account.tab.wishlist'), icon: Heart },
    { id: 'privacy', label: t('account.tab.privacy'), icon: ShieldCheck },
  ]

  // Fall back to Overview for unknown/retired tabs (e.g. an old ?tab=giftcards link).
  const active = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'overview'

  return (
    <AccountShell
      eyebrow={t('role.individual')}
      title={`${t('account.greeting')}, ${pick(name).split(' ')[0]}`}
      subtitle={t('account.title')}
      tone="light"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={<HeaderChips />}
    >
      {active === 'overview' && <OverviewPanel onTab={setActive} />}
      {active === 'orders' && <OrdersPanel />}
      {active === 'loyalty' && <WalletLoyaltyPanel />}
      {active === 'subscriptions' && <SubscriptionsPanel />}
      {active === 'addresses' && <AddressesPanel />}
      {active === 'wishlist' && <WishlistPanel />}
      {active === 'privacy' && <SettingsPrivacyPanel />}
    </AccountShell>
  )
}

/** Wallet balance + loyalty points chips in the dashboard header. */
function HeaderChips() {
  const { t, money } = useLocale()
  const { wallet, points } = useCustomer()
  return (
    <div className="flex items-center gap-xs">
      <span className="inline-flex items-center gap-xs rounded-pill bg-surface-1 border border-hairline px-md py-2">
        <span className="w-2 h-2 rounded-pill bg-success" />
        <span className="font-sans text-data text-ink tabular-nums">{money(wallet.balanceMinor)}</span>
      </span>
      <span className="inline-flex items-center gap-xs rounded-pill bg-surface-1 border border-hairline px-md py-2">
        <span className="w-2 h-2 rounded-pill bg-primary" />
        <span className="font-sans text-data text-ink tabular-nums">{points.toLocaleString()}</span>
        <span className="font-sans text-caption text-ink-subtle">{t('loyalty.points')}</span>
      </span>
    </div>
  )
}
