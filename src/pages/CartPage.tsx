import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, X, ShoppingBag, ArrowRight, Snowflake, ShieldCheck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { useChannel } from '@/state/ChannelContext'
import { variantById } from '@/data/products'
import { wholesaleBySku, type WholesaleProduct } from '@/data/wholesale'
import { flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { ProductArt } from '@/components/brand/ProductArt'
import { OrderSummary } from '@/components/ui/OrderSummary'
import { tint } from '@/lib/cn'

export function CartPage() {
  const { t, pick, money, locale } = useLocale()
  const { channel, signedIn } = useChannel()
  const { lines, setQty, remove, unitPrice, hasColdChain } = useCart()
  const navigate = useNavigate()

  if (lines.length === 0) {
    return (
      <section className="container-narrow py-section min-h-[55vh] grid place-items-center text-center">
        <div className="flex flex-col items-center gap-md">
          <span className="grid place-items-center w-20 h-20 rounded-pill bg-surface-2 border border-hairline text-ink-subtle">
            <ShoppingBag size={28} />
          </span>
          <h1 className="font-serif text-display-md text-ink">{t('cart.empty')}</h1>
          <p className="text-body-lg text-ink-muted max-w-md">{t('cart.emptyBody')}</p>
          <Link to="/shop" className={buttonClass('primary', 'md', 'mt-sm')}>
            {t('cta.continueShopping')}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="container-jaz py-xl">
      <div className="flex flex-col gap-xs mb-xl">
        <Eyebrow>{channel === 'b2b' ? t('checkout.b2b') : t('checkout.b2c')}</Eyebrow>
        <h1 className="font-serif text-display-lg text-ink">{t('cart.title')}</h1>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-xl items-start">
        {/* lines */}
        <div className="flex flex-col">
          {hasColdChain && (
            <div className="flex items-center gap-sm rounded-lg bg-brand-blue/8 border border-brand-blue/20 p-md mb-md">
              <Snowflake size={18} className="text-brand-blue shrink-0" />
              <p className="font-sans text-data text-ink-muted">{t('product.coldChainNote')}</p>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-hairline border-y border-hairline">
            {lines.map((line) => {
              const found = variantById(line.variantId)
              if (!found) {
                const w = wholesaleBySku(line.variantId)
                return w ? <WholesaleCartLine key={line.variantId} product={w} qty={line.qty} /> : null
              }
              const { product, variant } = found
              const flavor = flavors[product.flavorId]
              const unit = unitPrice(line.variantId)
              return (
                <li key={line.variantId} className="flex gap-md py-lg">
                  <Link
                    to={`/product/${product.slug}`}
                    className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden border border-hairline"
                    style={{ backgroundColor: tint(flavor.accent, 14) }}
                  >
                    <ProductArt flavorId={product.flavorId} kind={product.type === 'gift_box' ? 'box' : 'bar'} branded={false} />
                  </Link>

                  <div className="flex-1 flex flex-col gap-xs min-w-0">
                    <div className="flex items-start justify-between gap-sm">
                      <div className="min-w-0">
                        <span className="font-sans text-caption uppercase tracking-[0.1em]" style={{ color: flavor.accent }}>
                          {pick(flavor.name)}
                        </span>
                        <Link to={`/product/${product.slug}`} className="block font-serif text-card-title text-ink truncate hover:text-primary-hover transition-colors">
                          {pick(product.title)}
                        </Link>
                        <span className="font-sans text-caption text-ink-subtle">
                          {variant.netWeightG}
                          {locale === 'ar' ? ' غ' : 'g'}
                          {variant.packaging === 'bulk_case' && ` · ${pick({ en: `Case ×${variant.caseQty}`, ar: `كرتون ×${variant.caseQty}` })}`}
                          {line.isGift && ` · ${t('cart.gift')}`}
                        </span>
                      </div>
                      <button onClick={() => remove(line.variantId)} className="grid place-items-center w-8 h-8 text-ink-subtle hover:text-danger transition-colors -me-1" aria-label={t('cart.remove')}>
                        <X size={17} />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-sm pt-xs">
                      <div className="flex items-center border border-hairline-strong rounded-md">
                        <button onClick={() => setQty(line.variantId, line.qty - 1)} className="grid place-items-center w-9 h-9 text-ink-muted hover:text-ink" aria-label="decrease">
                          <Minus size={14} />
                        </button>
                        <span className="w-9 text-center font-sans text-data tabular-nums">{line.qty}</span>
                        <button onClick={() => setQty(line.variantId, line.qty + 1)} className="grid place-items-center w-9 h-9 text-ink-muted hover:text-ink" aria-label="increase">
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-sans text-body text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                        {money(unit * line.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center justify-between mt-lg">
            <Link to="/shop" className="link-gold">
              <ArrowRight size={15} className="ltr:rotate-180" />
              {t('cta.continueShopping')}
            </Link>
            <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle">
              <ShieldCheck size={14} className="text-success" />
              {pick({ en: 'Secure checkout', ar: 'دفع آمن' })}
            </span>
          </div>
        </div>

        {/* summary */}
        <div className="lg:sticky lg:top-28">
          <OrderSummary>
            <button onClick={() => navigate('/checkout')} className={buttonClass('primary', 'md', 'w-full mt-md')}>
              {signedIn ? t('cta.checkout') : t('cart.signInToCheckout')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </button>
            {!signedIn && (
              <p className="text-center font-sans text-caption text-ink-subtle mt-xs">{t('cart.guestNote')}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-md gap-y-xs mt-md">
              {['mada', 'Visa', 'Apple Pay', 'tabby', 'tamara'].map((m) => (
                <StatusBadge key={m} variant="neutral" className="!text-ink-subtle">
                  {m}
                </StatusBadge>
              ))}
            </div>
          </OrderSummary>
        </div>
      </div>
    </section>
  )
}

/** Wholesale (foodservice) cart line — B2B only; retail lines render above. */
function WholesaleCartLine({ product, qty }: { product: WholesaleProduct; qty: number }) {
  const { t, pick, money, locale } = useLocale()
  const { setQty, remove, unitPrice } = useCart()
  const unit = unitPrice(product.sku, qty)
  return (
    <li className="flex gap-md py-lg">
      <span
        className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg border border-hairline"
        style={{ backgroundColor: product.accent, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.13) 0 2px, transparent 2px 9px)' }}
      />
      <div className="flex-1 flex flex-col gap-xs min-w-0">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-primary-hover">{pick(product.unit)}</span>
            <span className="block font-serif text-card-title text-ink truncate">{pick(product.name)}</span>
            <span className="font-sans text-caption text-ink-subtle tabular-nums">{product.sku}</span>
          </div>
          <button onClick={() => remove(product.sku)} className="grid place-items-center w-8 h-8 text-ink-subtle hover:text-danger transition-colors -me-1" aria-label={t('cart.remove')}>
            <X size={17} />
          </button>
        </div>
        <div className="mt-auto flex items-center justify-between gap-sm pt-xs">
          <div className="flex items-center border border-hairline-strong rounded-md">
            <button onClick={() => setQty(product.sku, Math.max(0, qty - 1))} className="grid place-items-center w-9 h-9 text-ink-muted hover:text-ink" aria-label="decrease">
              <Minus size={14} />
            </button>
            <span className="w-9 text-center font-sans text-data tabular-nums">{qty}</span>
            <button onClick={() => setQty(product.sku, qty + 1)} className="grid place-items-center w-9 h-9 text-ink-muted hover:text-ink" aria-label="increase">
              <Plus size={14} />
            </button>
          </div>
          <span className="font-sans text-body text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {money(unit * qty)}
          </span>
        </div>
      </div>
    </li>
  )
}
