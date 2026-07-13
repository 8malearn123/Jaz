import { useState } from 'react'
import { Heart, Plus, X, Bell, BellRing, Trash2, CalendarHeart, MessageCircle, Mail } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { useCustomer } from '@/state/CustomerContext'
import { type OccasionChannel } from '@/data/account'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { ProductArt } from '@/components/brand/ProductArt'
import { useToast } from '@/components/account/Toast'
import { cn, tint } from '@/lib/cn'
import { daysUntil, EmptyState } from './shared'

export function WishlistPanel() {
  const { t } = useLocale()
  return (
    <div className="flex flex-col gap-xl">
      <FavouritesSection />
      <OccasionsSection />
      <p className="font-sans text-caption text-ink-subtle leading-relaxed -mt-md">{t('occasions.note')}</p>
    </div>
  )
}

/* ── Favourites ─────────────────────────────────────────── */
function FavouritesSection() {
  const { t, pick, money } = useLocale()
  const { add } = useCart()
  const { wishlist, toggleRestockNotify } = useCustomer()
  const { flash } = useToast()

  if (wishlist.length === 0) return <EmptyState icon={Heart} title={t('wishlist.empty')} body={t('wishlist.emptyBody')} cta={{ to: '/shop', label: t('cta.shop') }} />

  return (
    <div className="flex flex-col gap-md">
      <p className="eyebrow text-ink-subtle inline-flex items-center gap-xs"><Heart size={13} className="text-primary-hover" /> {t('wishlist.title')}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        {wishlist.map((w) => {
          const found = variantById(w.variantId)
          if (!found) return null
          const { product, variant } = found
          const f = flavors[product.flavorId]
          const soldOut = !variant.inStock
          const addToCart = () => { add(w.variantId, 1); flash(t('wishlist.addedToast')) }
          const toggleNotify = () => {
            toggleRestockNotify(w.variantId)
            flash(w.notifyOnRestock ? t('wishlist.notifyOffToast') : t('wishlist.notifyOnToast'))
          }
          return (
            <div key={w.variantId} className="card overflow-hidden flex flex-col">
              <div className="relative aspect-square" style={{ backgroundColor: tint(f.accent, 14) }}>
                <ProductArt flavorId={product.flavorId} kind={product.type === 'gift_box' ? 'box' : 'bar'} branded={false} />
                {soldOut && <span className="absolute top-sm" style={{ insetInlineStart: 10 }}><StatusBadge variant="danger" solid>{t('wishlist.soldOut')}</StatusBadge></span>}
              </div>
              <div className="p-md flex flex-col gap-xs flex-1">
                <p className="font-sans text-data text-ink leading-tight">{pick(product.title)}</p>
                <p className="font-sans text-caption text-ink-subtle tabular-nums">{money(variant.retailPriceMinor)}</p>
                <div className="mt-auto pt-xs">
                  {soldOut ? (
                    <button onClick={toggleNotify} className={cn('w-full inline-flex items-center justify-center gap-xs rounded-md px-3 py-2 font-sans text-caption transition-colors', w.notifyOnRestock ? 'bg-success/10 text-success border border-success/30' : 'bg-primary/[0.06] text-primary-hover border border-primary/20 hover:bg-primary/10')}>
                      {w.notifyOnRestock ? <><BellRing size={13} /> {t('wishlist.notifyOn')}</> : <><Bell size={13} /> {t('wishlist.notifyMe')}</>}
                    </button>
                  ) : (
                    <button onClick={addToCart} className={buttonClass('primary', 'sm', 'w-full')}>{t('cta.addToCart')}</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Occasions diary ────────────────────────────────────── */
function OccasionsSection() {
  const { t, pick, locale } = useLocale()
  const { occasions, addOccasion, removeOccasion } = useCustomer()
  const { flash } = useToast()
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [channel, setChannel] = useState<OccasionChannel>('whatsapp')

  const dateLocale = locale === 'ar' ? 'ar' : 'en-GB'
  const arNum = (n: number) => n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')
  const valid = title.trim() !== '' && date !== ''

  const sorted = [...occasions].sort((a, b) => daysUntil(a.date) - daysUntil(b.date))

  const reset = () => { setTitle(''); setDate(''); setChannel('whatsapp'); setFormOpen(false) }
  const submit = () => {
    if (!valid) { flash(t('occasions.validation')); return }
    addOccasion({ title: title.trim(), date, channel })
    flash(`${t('occasions.added')} · ${title.trim()}`)
    reset()
  }

  const pillLabel = (days: number) => (days === 0 ? t('occasions.today') : `${t('occasions.inPrefix')} ${arNum(days)} ${t('occasions.daysWord')}`)

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p className="eyebrow text-ink-subtle inline-flex items-center gap-xs"><CalendarHeart size={13} className="text-primary-hover" /> {t('occasions.title')}</p>
        <button onClick={() => (formOpen ? reset() : setFormOpen(true))} className={buttonClass('secondary', 'sm')}>
          {formOpen ? <X size={15} /> : <Plus size={15} />} {t('occasions.add')}
        </button>
      </div>

      {formOpen && (
        <div className="card p-lg flex flex-col gap-md animate-scale-in">
          <div className="flex flex-col sm:flex-row gap-md">
            <label className="flex flex-col gap-xs flex-1">
              <span className="label">{t('occasions.name')}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('occasions.namePlaceholder')} className="input" />
            </label>
            <label className="flex flex-col gap-xs sm:w-52">
              <span className="label">{t('occasions.date')}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input tabular-nums" />
            </label>
          </div>
          <div className="flex flex-col gap-xs">
            <span className="label">{t('occasions.channel')}</span>
            <div className="flex gap-xs">
              {(['whatsapp', 'email'] as OccasionChannel[]).map((ch) => {
                const on = channel === ch
                return (
                  <button key={ch} onClick={() => setChannel(ch)} className={cn('inline-flex items-center gap-xs rounded-md border px-4 py-2 font-sans text-data transition-colors', on ? 'border-primary bg-primary/10 text-ink' : 'border-hairline-strong text-ink-muted hover:border-ink/30')}>
                    {ch === 'whatsapp' ? <MessageCircle size={14} /> : <Mail size={14} />}
                    {t(`notif.${ch}`)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-xs">
            <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('occasions.save')}</button>
            <button onClick={reset} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="font-sans text-data text-ink-subtle">{t('occasions.empty')}</p>
      ) : (
        <div className="flex flex-col gap-sm">
          {sorted.map((o) => {
            const days = daysUntil(o.date)
            const soon = days <= 7
            const d = new Date(o.date + 'T00:00:00')
            return (
              <div key={o.id} className={cn('card p-lg flex items-center gap-md', soon && 'ring-1 ring-primary/30')}>
                <div className="text-center w-14 shrink-0">
                  <div className="font-serif text-headline text-ink tabular-nums leading-none">{d.toLocaleDateString(dateLocale, { day: 'numeric' })}</div>
                  <div className="font-sans text-caption text-ink-subtle mt-0.5">{d.toLocaleDateString(dateLocale, { month: 'short' })}</div>
                </div>
                <span className="w-px self-stretch bg-hairline" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink">{pick(o.title)}</p>
                  <p className="font-sans text-caption text-ink-subtle mt-0.5 inline-flex items-center gap-xxs">
                    {o.channel === 'whatsapp' ? <MessageCircle size={12} /> : <Mail size={12} />} {t(`notif.${o.channel}`)}
                  </p>
                </div>
                <StatusBadge variant={soon ? 'gold' : 'neutral'}>{pillLabel(days)}</StatusBadge>
                <button onClick={() => removeOccasion(o.id)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/5 transition-colors shrink-0" aria-label={t('wishlist.remove')}>
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
