import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Gift, ArrowRight } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { collections } from '@/data/collections'
import { getProductById } from '@/data/products'
import { flavors } from '@/data/flavors'
import type { Collection } from '@/data/types'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { Reveal } from '@/components/ui/Reveal'
import { ProductArt } from '@/components/brand/ProductArt'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { PatternBand } from '@/components/brand/PatternBand'
import { cn, tint } from '@/lib/cn'

export function CollectionsPage() {
  const { t } = useLocale()
  return (
    <>
      <section className="bg-surface-2 border-b border-hairline">
        <PatternBand motif="jasmine" height={56} opacity={0.1} />
        <div className="container-jaz py-xxl flex flex-col gap-md">
          <Eyebrow>{t('home.collections.eyebrow')}</Eyebrow>
          <h1 className="font-serif text-display-lg text-ink max-w-2xl text-balance">{t('home.collections.title')}</h1>
        </div>
      </section>

      <section className="container-jaz py-xl flex flex-col gap-section">
        {collections.map((c, i) => (
          <CollectionFeature key={c.id} collection={c} flip={i % 2 === 1} index={i} />
        ))}
      </section>
    </>
  )
}

function CollectionFeature({ collection, flip, index }: { collection: Collection; flip: boolean; index: number }) {
  const { t, pick, money } = useLocale()
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const items = collection.productIds.map(getProductById).filter(Boolean) as NonNullable<ReturnType<typeof getProductById>>[]
  const boxFlavor = items[0]?.flavorId ?? 'milk'

  const addBox = () => {
    items.forEach((p) => {
      const v = p.variants.find((x) => x.inStock) ?? p.variants[0]
      if (v) add(v.id, 1)
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const kindBadge = collection.kind === 'seasonal' ? 'success' : collection.kind === 'corporate' ? 'gold' : 'limited'

  return (
    <Reveal>
      <div className="grid lg:grid-cols-2 gap-xl items-center">
        {/* art face */}
        <div
          className={cn('relative rounded-xl overflow-hidden shadow-soft aspect-[4/3]', flip && 'lg:order-2')}
          style={{ backgroundColor: collection.accent }}
        >
          <ProductArt flavorId={boxFlavor} kind="box" />
          <div className="absolute top-md" style={{ insetInlineStart: 16 }}>
            <span className="font-serif text-section-number text-ink-on-dark/80">0{index + 1}</span>
          </div>
          <div className="absolute bottom-0 inset-x-0">
            <WaveDivider tone="on-dark" height={18} />
          </div>
        </div>

        {/* detail face */}
        <div className={cn('flex flex-col gap-md', flip && 'lg:order-1')}>
          <div className="flex items-center gap-sm">
            <StatusBadge variant={kindBadge}>{t(`badge.${collection.kind === 'corporate' ? 'limited' : collection.kind === 'seasonal' ? 'seasonal' : 'new'}`)}</StatusBadge>
            <span className="font-sans text-caption text-ink-subtle">
              {collection.pieceCount} {t('shop.results')}
            </span>
          </div>
          <h2 className="font-serif text-display-md text-ink text-balance">{pick(collection.title)}</h2>
          <p className="text-body-lg text-ink-muted">{pick(collection.description)}</p>

          {/* included flavors */}
          <div className="flex flex-wrap gap-xs pt-xs">
            {items.map((p) => {
              const f = flavors[p.flavorId]
              return (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="flex items-center gap-xs rounded-pill border border-hairline bg-surface-1 ps-1.5 pe-3 py-1.5 hover:border-hairline-strong transition-colors"
                >
                  <span className="w-5 h-5 rounded-pill" style={{ backgroundColor: tint(f.accent, 24) }}>
                    <span className="block w-full h-full rounded-pill scale-50" style={{ backgroundColor: f.accent }} />
                  </span>
                  <span className="font-sans text-caption text-ink">{pick(f.name)}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-md pt-sm">
            <span className="font-serif text-headline text-ink tabular-nums">{money(collection.priceMinor)}</span>
            <button onClick={addBox} className={buttonClass('primary')}>
              {added ? (
                <>
                  <Check size={16} /> {t('cta.added')}
                </>
              ) : (
                <>
                  <Gift size={16} /> {pick({ en: 'Add gift box', ar: 'أضف علبة الهدية' })}
                </>
              )}
            </button>
            <Link to="/shop" className="link-gold">
              {t('cta.viewAll')} <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
