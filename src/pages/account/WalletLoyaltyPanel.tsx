import { Gem, Check, Plus, Gift, Ticket, Sparkles, Wallet as WalletIcon } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCustomer } from '@/state/CustomerContext'
import { customer, tierOrder, type LoyaltyTier } from '@/data/account'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'

// Tiers + headline benefits mirror the owner-side program (ownerCustomers.ts).
const PERKS: Record<LoyaltyTier, { en: string; ar: string }[]> = {
  basic: [{ en: 'Earn 1 point per ﷼', ar: 'نقطة لكل ريال' }, { en: 'Free shipping over ﷼ 200', ar: 'شحن مجاني فوق ٢٠٠ ﷼' }],
  silver: [{ en: '5% off', ar: 'خصم ٥٪' }, { en: 'Early access to limited art-cards', ar: 'وصول مبكر للبطاقات المحدودة' }],
  gold: [{ en: '10% off + gifts', ar: 'خصم ١٠٪ + هدايا' }, { en: 'Early access to seasonal releases', ar: 'وصول مبكر للإصدارات الموسمية' }],
  elite: [{ en: 'Dedicated account manager', ar: 'مدير حساب مخصّص' }, { en: 'Personal concierge & a birthday box', ar: 'كونسيرج شخصي وعلبة ميلاد' }],
}

export function WalletLoyaltyPanel() {
  const { t, money, pick } = useLocale()
  const { points, tier, lifetimeSpendMinor, pointsHistory, wallet, generatedCode, redeemPointsForCode } = useCustomer()
  const { flash } = useToast()

  const nextTierAt = customer.loyalty.nextTierAtMinor
  const nextTier = customer.loyalty.nextTier
  const progress = nextTierAt ? Math.min(100, (lifetimeSpendMinor / nextTierAt) * 100) : 100

  const generateCode = () => {
    const code = redeemPointsForCode()
    if (code) flash(`${t('loyalty.codeToast')} · ${code}`)
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* wallet + loyalty summary */}
      <div className="grid lg:grid-cols-2 gap-md">
        {/* store-credit wallet */}
        <div className="relative rounded-xl overflow-hidden p-lg text-ink-on-dark" style={{ background: 'linear-gradient(155deg,#2b2019,#17120f)' }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow text-primary-bright">{t('wallet.balance')}</p>
            <WalletIcon size={20} className="text-primary-bright" />
          </div>
          <div className="flex items-end gap-xs mt-md">
            <span className="font-serif text-display-md text-ink-on-dark tabular-nums leading-none">{money(wallet.balanceMinor, { withSymbol: false })}</span>
            <span className="font-sans text-data text-primary-bright mb-1">{pick({ en: '﷼', ar: '﷼' })}</span>
          </div>
          <p className="font-sans text-caption text-ink-on-dark-muted mt-xs">{t('wallet.balanceNote')}</p>
          <div className="mt-md pt-md border-t border-hairline-dark flex flex-col gap-sm">
            {wallet.log.map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-sm">
                <span className="font-sans text-caption text-ink-on-dark-muted truncate">{pick(w.reason)}</span>
                <span className={cn('font-sans text-data tabular-nums shrink-0', w.kind === 'credit' ? 'text-success' : 'text-ink-on-dark-muted')}>
                  {w.kind === 'credit' ? '+' : '−'}{money(w.amountMinor, { withSymbol: false })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* loyalty summary */}
        <div className="card p-lg flex flex-col gap-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow text-primary-hover">{t('loyalty.tier')} · {t(`loyalty.tier.${tier}`)}</p>
              <p className="font-serif text-display-md text-ink tabular-nums leading-none mt-xs">
                {points.toLocaleString()} <span className="font-serif text-card-title text-ink-muted">{t('loyalty.points')}</span>
              </p>
            </div>
            <Sparkles className="text-primary" size={24} />
          </div>
          {nextTier && (
            <div className="flex flex-col gap-xs">
              <div className="h-2 rounded-pill bg-surface-2 overflow-hidden">
                <span className="block h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-sans text-caption text-ink-subtle">
                {money(Math.max(0, (nextTierAt ?? 0) - lifetimeSpendMinor))} {t('loyalty.toNext')} {t(`loyalty.tier.${nextTier}`)}
              </p>
            </div>
          )}
          <div className="mt-auto pt-sm border-t border-hairline flex flex-col gap-sm">
            {generatedCode ? (
              <div className="flex items-center justify-between gap-sm rounded-lg border border-dashed border-primary bg-primary/[0.06] px-md py-sm">
                <div>
                  <p className="font-sans text-caption text-ink-subtle">{t('loyalty.codeGenerated')}</p>
                  <p className="font-sans text-card-title text-primary-hover tracking-[0.1em] tabular-nums">{generatedCode}</p>
                </div>
                <span className="inline-flex items-center gap-xxs font-sans text-caption text-success"><Check size={13} /> {t('loyalty.codeReady')}</span>
              </div>
            ) : (
              <button onClick={generateCode} className={buttonClass('primary', 'sm', 'w-full')}>
                <Ticket size={15} /> {t('loyalty.generateCode')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* tiers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {tierOrder.map((tr) => {
          const isCurrent = tr === tier
          const reached = tierOrder.indexOf(tr) <= tierOrder.indexOf(tier)
          return (
            <div key={tr} className={cn('rounded-xl border p-lg flex flex-col gap-sm', isCurrent ? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30' : 'border-hairline bg-surface-1')}>
              <div className="flex items-center justify-between">
                <span className="font-serif text-card-title text-ink capitalize">{t(`loyalty.tier.${tr}`)}</span>
                {isCurrent ? <StatusBadge variant="gold">{t('loyalty.tier')}</StatusBadge> : reached ? <Check size={16} className="text-success" /> : <Gem size={16} className="text-ink-subtle" />}
              </div>
              <ul className="flex flex-col gap-xs">
                {PERKS[tr].map((p, i) => (
                  <li key={i} className="flex items-start gap-xs font-sans text-caption text-ink-muted"><Check size={13} className="text-primary-hover mt-0.5 shrink-0" /> {pick(p)}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="card p-lg flex items-center justify-between">
        <span className="font-sans text-data text-ink-muted">{t('loyalty.lifetime')}</span>
        <span className="font-serif text-headline text-ink tabular-nums">{money(lifetimeSpendMinor)}</span>
      </div>

      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{t('loyalty.history')}</h3></div>
        <ul className="divide-y divide-hairline">
          {pointsHistory.map((h, i) => (
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
