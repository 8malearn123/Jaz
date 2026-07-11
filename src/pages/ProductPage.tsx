import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Minus, Plus, Check, ChevronRight, Snowflake, ShieldCheck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { useCart } from '@/state/CartContext'
import { getProduct, getProductById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Stars, StatusBadge, Eyebrow, QuoteGlyph } from '@/components/ui/Misc'
import { ProductCard } from '@/components/ui/ProductCard'
import { ProductArt } from '@/components/brand/ProductArt'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { MotifGlyph } from '@/components/brand/PatternBand'
import { NotFoundPage } from './NotFoundPage'
import { cn, tint } from '@/lib/cn'

export function ProductPage() {
  const { slug } = useParams()
  const product = slug ? getProduct(slug) : undefined
  const { t, pick, money, locale } = useLocale()
  const { channel } = useChannel()
  const { add } = useCart()

  const [variantId, setVariantId] = useState(() => (product?.variants.find((v) => v.inStock) ?? product?.variants[0])?.id)
  const [qty, setQty] = useState(1)
  const [isGift, setIsGift] = useState(false)
  const [added, setAdded] = useState(false)

  if (!product) return <NotFoundPage />

  const flavor = flavors[product.flavorId]
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const priceMinor = channel === 'b2b' ? variant.b2bPriceMinor : variant.retailPriceMinor
  const savingPct = Math.round((1 - variant.b2bPriceMinor / variant.retailPriceMinor) * 100)
  const related = product.pairsWith.map(getProductById).filter(Boolean).slice(0, 4) as NonNullable<ReturnType<typeof getProductById>>[]

  const onAdd = () => {
    if (!variant.inStock) return
    add(variant.id, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <>
      {/* breadcrumb */}
      <div className="container-jaz pt-lg">
        <nav className="flex items-center gap-xs font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">
          <Link to="/shop" className="hover:text-ink transition-colors">
            {t('nav.shop')}
          </Link>
          <ChevronRight size={13} className="rtl:rotate-180" />
          <span className="text-ink-muted">{pick(product.title)}</span>
        </nav>
      </div>

      {/* main */}
      <section className="container-jaz py-lg grid lg:grid-cols-2 gap-xl items-start">
        {/* gallery */}
        <div className="lg:sticky lg:top-28 flex flex-col gap-md">
          <div className="relative rounded-xl overflow-hidden shadow-soft" style={{ backgroundColor: tint(flavor.accent, 14) }}>
            <div className="aspect-[4/5]">
              <ProductArt flavorId={product.flavorId} kind={product.type === 'gift_box' ? 'box' : 'bar'} />
            </div>
            <div className="absolute top-md flex flex-col gap-xs" style={{ insetInlineStart: 16 }}>
              {product.badges.map((b) => (
                <StatusBadge key={b} variant={b === 'limited' ? 'limited' : b === 'seasonal' ? 'success' : 'gold'}>
                  {t(`badge.${b}`)}
                </StatusBadge>
              ))}
            </div>
            <div className="absolute bottom-0 inset-x-0">
              <WaveDivider tone="gold" height={18} />
            </div>
          </div>
          {/* thumbnails */}
          <div className="grid grid-cols-3 gap-sm">
            {(['bar', 'box', 'motif'] as const).map((kind) => (
              <div key={kind} className="aspect-square rounded-md overflow-hidden border border-hairline" style={{ backgroundColor: tint(flavor.accent, 10) }}>
                {kind === 'motif' ? (
                  <div className="w-full h-full grid place-items-center" style={{ color: flavor.accent }}>
                    <MotifGlyph motif="jasmine" size={36} className="opacity-70" />
                  </div>
                ) : (
                  <ProductArt flavorId={product.flavorId} kind={kind} branded={false} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* info */}
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-sm">
              <span className="font-sans text-caption uppercase tracking-[0.14em]" style={{ color: flavor.accent }}>
                {pick(flavor.name)}
              </span>
              {product.cocoaPct && (
                <span className="font-sans text-caption text-ink-subtle">
                  · {product.cocoaPct}% {t('product.cocoa')}
                </span>
              )}
            </div>
            <h1 className="font-serif text-display-md md:text-display-lg text-ink text-balance leading-tight">{pick(product.title)}</h1>
            <div className="flex items-center gap-sm">
              <Stars value={product.rating} />
              <span className="font-sans text-data text-ink-muted">
                {product.rating} · {product.reviewCount} {t('product.reviews')}
              </span>
            </div>
          </div>

          <p className="text-body-lg text-ink-muted">{pick(product.story)}</p>

          {/* price */}
          <div className="flex items-end gap-md">
            <span className="font-serif text-headline text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              {money(priceMinor)}
            </span>
            {channel === 'b2b' && savingPct > 0 && (
              <span className="mb-1">
                <StatusBadge variant="success">
                  {pick({ en: `Account price · −${savingPct}%`, ar: `سعر الحساب · −${savingPct}٪` })}
                </StatusBadge>
              </span>
            )}
          </div>

          {/* variant selector */}
          <div className="flex flex-col gap-sm">
            <span className="label">{t('product.weight')}</span>
            <div className="flex flex-wrap gap-sm">
              {product.variants.map((v) => {
                const active = v.id === variant.id
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    disabled={!v.inStock}
                    className={cn(
                      'px-4 py-3 rounded-md border font-sans text-data transition-all min-w-[88px]',
                      active ? 'border-primary bg-primary/10 text-ink' : 'border-hairline-strong text-ink-muted hover:border-ink/40',
                      !v.inStock && 'opacity-40 line-through cursor-not-allowed',
                    )}
                  >
                    <span className="block text-ink font-medium">
                      {v.netWeightG}
                      {locale === 'ar' ? ' غ' : 'g'}
                    </span>
                    <span className="block text-caption text-ink-subtle mt-0.5">
                      {v.packaging === 'bulk_case'
                        ? pick({ en: `Case ×${v.caseQty}`, ar: `كرتون ×${v.caseQty}` })
                        : v.packaging === 'gift'
                          ? pick({ en: 'Gift', ar: 'هدية' })
                          : pick({ en: 'Bar', ar: 'لوح' })}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* qty + add */}
          <div className="flex flex-col sm:flex-row gap-sm">
            <div className="flex items-center border border-hairline-strong rounded-md self-start">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid place-items-center w-12 h-12 text-ink-muted hover:text-ink" aria-label="decrease">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-sans text-body tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="grid place-items-center w-12 h-12 text-ink-muted hover:text-ink" aria-label="increase">
                <Plus size={16} />
              </button>
            </div>
            <button onClick={onAdd} disabled={!variant.inStock} className={buttonClass('primary', 'md', 'flex-1 sm:flex-none sm:min-w-[260px]')}>
              {added ? (
                <>
                  <Check size={16} /> {t('cta.added')}
                </>
              ) : variant.inStock ? (
                <>
                  {t('cta.addToCart')} · {money(priceMinor * qty)}
                </>
              ) : (
                t('badge.outOfStock')
              )}
            </button>
          </div>

          {/* gift toggle */}
          <label className="flex items-center gap-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isGift}
              onChange={(e) => setIsGift(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="font-sans text-data text-ink-muted">{t('cart.gift')}</span>
          </label>

          {/* cold-chain note */}
          {variant.requiresColdChain && (
            <div className="flex items-start gap-sm rounded-lg bg-brand-blue/8 border border-brand-blue/20 p-md">
              <Snowflake size={18} className="text-brand-blue mt-0.5 shrink-0" />
              <p className="font-sans text-data text-ink-muted">{t('product.coldChainNote')}</p>
            </div>
          )}

          {/* spec accordions */}
          <div className="border-t border-hairline divide-y divide-hairline">
            <Spec title={t('product.ingredients')} body={pick(product.ingredients)} defaultOpen />
            <Spec
              title={t('product.allergens')}
              body={product.allergens.map((a) => pick(a)).join(locale === 'ar' ? '، ' : ', ')}
            />
          </div>
        </div>
      </section>

      {/* art-card */}
      {product.artCard && (
        <section className="container-jaz py-section">
          <Reveal>
            <ArtCardFeature product={product} />
          </Reveal>
        </section>
      )}

      {/* reviews */}
      {product.reviews.length > 0 && (
        <section className="container-jaz py-xl">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-serif text-display-md text-ink">{t('product.reviews')}</h2>
            <div className="flex items-center gap-sm">
              <Stars value={product.rating} size={18} />
              <span className="font-sans text-data text-ink-muted">
                {product.rating} / 5 · {product.reviewCount}
              </span>
            </div>
          </div>
          <div className="grid gap-md md:grid-cols-2">
            {product.reviews.map((r, i) => (
              <Reveal key={i} delay={i * 70}>
                <figure className="card p-lg flex flex-col gap-sm h-full">
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} />
                    {r.verified && (
                      <span className="inline-flex items-center gap-xxs font-sans text-caption text-success">
                        <ShieldCheck size={13} /> {t('product.verifiedPurchase')}
                      </span>
                    )}
                  </div>
                  <blockquote className="font-serif text-body-lg text-ink leading-relaxed">{pick(r.body)}</blockquote>
                  <figcaption className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle mt-auto">
                    {pick(r.author)} · {new Date(r.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short', year: 'numeric' })}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* related */}
      {related.length > 0 && (
        <section className="container-jaz pb-section">
          <h2 className="font-serif text-display-md text-ink mb-lg">{t('product.related')}</h2>
          <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function Spec({ title, body, defaultOpen = false }: { title: string; body: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="py-md">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-sm text-start">
        <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink">{title}</span>
        <Plus size={16} className={cn('text-ink-subtle transition-transform', open && 'rotate-45')} />
      </button>
      {open && <p className="mt-sm font-sans text-data text-ink-muted leading-relaxed">{body}</p>}
    </div>
  )
}

function ArtCardFeature({ product }: { product: NonNullable<ReturnType<typeof getProduct>> }) {
  const { t, pick } = useLocale()
  const flavor = flavors[product.flavorId]
  const card = product.artCard!
  return (
    <div className="grid lg:grid-cols-2 rounded-xl overflow-hidden shadow-soft">
      {/* illustration face */}
      <div className="relative min-h-[320px]" style={{ backgroundColor: flavor.accent }}>
        <ProductArt flavorId={product.flavorId} />
        <div className="absolute bottom-0 inset-x-0">
          <WaveDivider tone="on-dark" height={18} />
        </div>
      </div>
      {/* info face */}
      <div className="relative p-xl lg:p-xxl flex flex-col gap-md" style={{ backgroundColor: flavor.accent, color: flavor.onAccent }}>
        <QuoteGlyph className="text-[52px] opacity-50" />
        <Eyebrow tone="on-dark" className="!text-current opacity-80">
          {t('product.artcard')}
        </Eyebrow>
        <h3 className="font-serif text-display-md leading-tight" style={{ color: flavor.onAccent }}>
          {pick(card.artworkTitle)}
        </h3>
        <p className="text-body-lg opacity-90">{pick(card.description)}</p>
        <div className="mt-auto pt-md border-t border-current/20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-sans text-caption uppercase tracking-[0.1em] opacity-70">{t('product.artcardBy')}</span>
            <span className="font-serif text-card-title">{pick(card.artistName)}</span>
          </div>
          {card.year != null && <span className="font-sans text-data opacity-80 tabular-nums">{card.year}</span>}
        </div>
      </div>
    </div>
  )
}
