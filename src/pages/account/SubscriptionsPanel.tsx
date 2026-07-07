import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Repeat, Plus, CalendarClock, Pause, Play } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCustomer } from '@/state/CustomerContext'
import { type Subscription } from '@/data/account'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { ProductArt } from '@/components/brand/ProductArt'
import { cn, tint } from '@/lib/cn'
import { ConfirmDialog, EmptyState } from './shared'

export function SubscriptionsPanel() {
  const { t, pick } = useLocale()
  const { subscriptions, toggleSubscription, cancelSubscription } = useCustomer()
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  if (subscriptions.length === 0)
    return <EmptyState icon={Repeat} title={t('subs.empty')} body="" cta={{ to: '/shop', label: t('subs.startCta') }} />

  const activeCount = subscriptions.filter((s) => s.status === 'active').length

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink">{t('subs.title')}</h2>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{activeCount} {t('subs.activeLabel')}</p>
        </div>
        <Link to="/shop" className={buttonClass('secondary', 'sm')}>
          <Plus size={15} /> {t('subs.startCta')}
        </Link>
      </div>

      <div className="grid gap-lg">
        {subscriptions.map((s) => (
          <SubCard key={s.id} sub={s} onToggle={() => toggleSubscription(s.id)} onCancel={() => setConfirmCancel(s.id)} />
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title={t('subs.cancel')}
        body={pick({ en: 'Cancel this subscription? You can re-subscribe anytime.', ar: 'إلغاء هذا الاشتراك؟ يمكنك إعادة الاشتراك في أي وقت.' })}
        confirmLabel={t('subs.cancel')}
        danger
        onConfirm={() => { if (confirmCancel) cancelSubscription(confirmCancel); setConfirmCancel(null) }}
      />
    </div>
  )
}

function SubCard({ sub, onToggle, onCancel }: { sub: Subscription; onToggle: () => void; onCancel: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const found = variantById(sub.variantId)
  const f = found ? flavors[found.product.flavorId] : flavors.milk
  const active = sub.status === 'active'

  const today = new Date('2026-06-21')
  const next = new Date(sub.nextRenewal)
  const cycle = sub.cadence === 'monthly' ? 30 : 90
  const daysUntil = Math.max(0, Math.round((next.getTime() - today.getTime()) / 86_400_000))
  const pct = Math.min(100, Math.max(5, ((cycle - daysUntil) / cycle) * 100))
  const dateStr = next.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const inDays = locale === 'ar' ? `العلبة القادمة بعد ${daysUntil} يومًا` : `Next box in ${daysUntil} days`

  return (
    <div className={cn('card overflow-hidden flex flex-col sm:flex-row transition-opacity', !active && 'opacity-[0.92]')}>
      {/* tinted product panel */}
      <div className="relative shrink-0 sm:w-44 grid place-items-center p-lg min-h-[168px]" style={{ backgroundColor: tint(f.accent, 16) }}>
        <div className="w-28 sm:w-32 aspect-square">{found && <ProductArt flavorId={found.product.flavorId} kind="box" />}</div>
        <span className="absolute top-md" style={{ insetInlineStart: 14 }}>
          <StatusBadge variant={active ? 'success' : 'neutral'}>{t(`subs.status.${sub.status}`)}</StatusBadge>
        </span>
      </div>

      {/* body */}
      <div className="flex-1 p-lg flex flex-col gap-md min-w-0">
        <div>
          <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">
            {pick(f.name)} · {sub.cadence === 'monthly' ? t('subs.everyMonth') : t('subs.everyQuarter')}
          </p>
          <h3 className="font-serif text-headline text-ink leading-tight mt-xxs">{pick(sub.title)}</h3>
        </div>

        {/* next delivery */}
        <div className="rounded-lg bg-surface-2 border border-hairline p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between gap-sm">
            <span className="inline-flex items-center gap-xs font-sans text-data text-ink">
              <CalendarClock size={15} className="text-primary-hover" /> {t('subs.next')}
            </span>
            <span className="font-sans text-data text-ink">{dateStr}</span>
          </div>
          {active ? (
            <>
              <div className="h-1.5 rounded-pill bg-canvas-cool overflow-hidden">
                <span className="block h-full rounded-pill bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="font-sans text-caption text-ink-subtle">{inDays}</span>
            </>
          ) : (
            <span className="font-sans text-caption text-ink-subtle">{t('subs.pausedNote')}</span>
          )}
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-sm mt-auto pt-xs">
          <span className="font-serif text-card-title text-ink tabular-nums">
            {money(sub.priceMinor)}{' '}
            <span className="font-sans text-caption text-ink-subtle">/ {sub.cadence === 'monthly' ? t('subs.perMonth') : t('subs.perQuarter')}</span>
          </span>
          <div className="flex items-center gap-xs">
            <button onClick={onToggle} className={buttonClass(active ? 'secondary' : 'primary', 'sm')}>
              {active ? <><Pause size={14} /> {t('subs.pause')}</> : <><Play size={14} /> {t('subs.resume')}</>}
            </button>
            <button onClick={onCancel} className={buttonClass('ghost', 'sm')}>{t('subs.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
