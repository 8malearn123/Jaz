import { useState, type ReactNode } from 'react'
import { X, Tag } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { cn } from '@/lib/cn'

/** Shared order-summary panel: subtotal, discount, VAT, shipping, cold-chain, total. */
export function OrderSummary({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
  const { t, money, locale } = useLocale()
  const { subtotalMinor, discountMinor, vatMinor, shippingMinor, coldChainMinor, totalMinor, hasColdChain, promoCode, applyPromo, clearPromo } = useCart()
  const [promo, setPromo] = useState('')
  const [invalid, setInvalid] = useState(false)

  const onApply = () => {
    if (!promo.trim()) return
    const ok = applyPromo(promo)
    setInvalid(!ok)
    if (ok) setPromo('')
  }

  const Row = ({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) => (
    <div className="flex items-center justify-between">
      <span className={cn('font-sans text-data', accent ? 'text-success' : muted ? 'text-ink-subtle' : 'text-ink-muted')}>{label}</span>
      <span className={cn('font-sans text-data tabular-nums', accent ? 'text-success' : 'text-ink')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>{value}</span>
    </div>
  )

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 overflow-hidden">
      <div className="bg-surface-2 px-lg py-md border-b border-hairline">
        <h2 className="font-serif text-card-title text-ink">{t('cart.summary')}</h2>
      </div>
      <div className="p-lg flex flex-col gap-sm">
        {!compact && (
          <div className="mb-xs flex flex-col gap-xxs">
            {promoCode ? (
              <div className="flex items-center justify-between rounded-md bg-success/8 border border-success/25 px-md py-2.5">
                <span className="inline-flex items-center gap-xs font-sans text-data text-success">
                  <Tag size={14} /> {promoCode} · {t('cart.promoApplied')}
                </span>
                <button onClick={clearPromo} className="text-ink-subtle hover:text-danger transition-colors" aria-label={t('cart.remove')}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-xs">
                  <input
                    value={promo}
                    onChange={(e) => { setPromo(e.target.value); setInvalid(false) }}
                    onKeyDown={(e) => e.key === 'Enter' && onApply()}
                    placeholder={t('cart.promo')}
                    className="input py-2.5 flex-1 uppercase tracking-[0.06em]"
                    aria-label={t('cart.promo')}
                  />
                  <button className="btn-secondary btn-sm shrink-0" type="button" onClick={onApply}>{t('cart.apply')}</button>
                </div>
                {invalid
                  ? <span className="font-sans text-caption text-danger">{t('cart.promoInvalid')}</span>
                  : <span className="font-sans text-caption text-ink-subtle">{t('cart.promoHint')}</span>}
              </>
            )}
          </div>
        )}
        <Row label={t('cart.subtotal')} value={money(subtotalMinor)} />
        {discountMinor > 0 && <Row label={t('cart.discount')} value={`− ${money(discountMinor)}`} accent />}
        <Row label={t('cart.vat')} value={money(vatMinor)} />
        <Row label={t('cart.shipping')} value={shippingMinor === 0 ? t('cart.shippingFree') : money(shippingMinor)} muted={shippingMinor === 0} />
        {hasColdChain && coldChainMinor > 0 && <Row label={t('cart.coldChainFee')} value={money(coldChainMinor)} />}

        <div className="my-xs -mx-lg">
          <WaveDivider tone="gold" height={14} className="opacity-60" />
        </div>

        <div className="flex items-center justify-between">
          <span className="font-serif text-card-title text-ink">{t('cart.total')}</span>
          <span className="font-serif text-headline text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(totalMinor)}</span>
        </div>

        {children}

        <p className="font-sans text-caption text-ink-subtle text-center mt-xs leading-relaxed">{t('cart.taxNote')}</p>
      </div>
    </div>
  )
}
