import { Link } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { useState } from 'react'
import type { Product } from '@/data/types'
import { flavors } from '@/data/flavors'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { useCart } from '@/state/CartContext'
import { cn, tint } from '@/lib/cn'
import { ProductArt } from '@/components/brand/ProductArt'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { StatusBadge, Stars } from './Misc'

const badgeVariant = { new: 'gold', bestseller: 'gold', limited: 'limited', seasonal: 'success' } as const

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { t, pick, money, locale } = useLocale()
  const { channel } = useChannel()
  const { add } = useCart()
  const [added, setAdded] = useState(false)

  const flavor = flavors[product.flavorId]
  const firstInStock = product.variants.find((v) => v.inStock) ?? product.variants[0]
  const priceMinor = channel === 'b2b' ? firstInStock.b2bPriceMinor : firstInStock.retailPriceMinor
  const multi = product.variants.length > 1
  const soldOut = !product.variants.some((v) => v.inStock)

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (soldOut) return
    add(firstInStock.id, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className={cn('group card card-hover overflow-hidden flex flex-col', className)}
      aria-label={pick(product.title)}
    >
      {/* art */}
      <div className="relative aspect-[5/6] overflow-hidden" style={{ backgroundColor: tint(flavor.accent, 14) }}>
        <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
          <ProductArt flavorId={product.flavorId} kind={product.type === 'gift_box' ? 'box' : 'bar'} />
        </div>

        {/* badges */}
        <div className="absolute flex flex-col gap-xs items-start" style={{ insetInlineStart: 16, top: 16 }}>
          {soldOut ? (
            <StatusBadge variant="neutral" solid>{t('badge.outOfStock')}</StatusBadge>
          ) : (
            product.badges.slice(0, 1).map((b) => (
              <StatusBadge key={b} variant={badgeVariant[b]} solid>
                {t(`badge.${b}`)}
              </StatusBadge>
            ))
          )}
        </div>

        {/* quick add */}
        {!soldOut && (
          <button
            onClick={quickAdd}
            aria-label={t('cta.addToCart')}
            className={cn(
              'absolute bottom-md grid place-items-center w-11 h-11 rounded-pill bg-surface-1/95 text-ink',
              'shadow-soft transition-all duration-300 ease-editorial',
              'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
              'hover:bg-primary hover:text-on-primary',
            )}
            style={{ insetInlineEnd: 16 }}
          >
            {added ? <Check size={18} /> : <Plus size={18} />}
          </button>
        )}
      </div>

      {/* gold wave seam */}
      <WaveDivider tone="gold" height={16} />

      {/* body */}
      <div className="flex flex-col gap-xs p-lg flex-1">
        <div className="flex items-center justify-between gap-sm">
          <span
            className="font-sans text-caption uppercase tracking-[0.12em]"
            style={{ color: flavor.accent === '#c8bbb1' || flavor.accent === '#d0a86b' ? '#6e6258' : flavor.accent }}
          >
            {pick(flavor.name)}
          </span>
          <Stars value={product.rating} size={12} />
        </div>

        <h3 className="font-serif text-card-title text-ink leading-snug">{pick(product.title)}</h3>

        <div className="mt-auto flex items-end justify-between gap-sm pt-sm">
          <div className="flex flex-col">
            {multi && <span className="font-sans text-caption text-ink-subtle uppercase tracking-wide">{t('common.from')}</span>}
            <span className="font-sans text-body text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              {money(priceMinor)}
            </span>
          </div>
          <span className="font-sans text-caption text-ink-subtle">
            {firstInStock.netWeightG}
            {locale === 'ar' ? ' غ' : 'g'}
          </span>
        </div>
      </div>

      {/* flavor-accent keyline */}
      <div className="h-1 w-full" style={{ backgroundColor: flavor.accent }} />
    </Link>
  )
}
