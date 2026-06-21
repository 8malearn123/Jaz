import { useState, type ReactNode } from 'react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { WaveDivider } from '@/components/brand/WaveDivider'

/** Shared order-summary panel: subtotal, VAT, shipping, cold-chain, total. */
export function OrderSummary({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
  const { t, money, locale } = useLocale()
  const { subtotalMinor, vatMinor, shippingMinor, coldChainMinor, totalMinor, hasColdChain } = useCart()
  const [promo, setPromo] = useState('')

  const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
    <div className="flex items-center justify-between">
      <span className={`font-sans text-data ${muted ? 'text-ink-subtle' : 'text-ink-muted'}`}>{label}</span>
      <span className="font-sans text-data text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {value}
      </span>
    </div>
  )

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 overflow-hidden">
      <div className="bg-surface-2 px-lg py-md border-b border-hairline">
        <h2 className="font-serif text-card-title text-ink">{t('cart.summary')}</h2>
      </div>
      <div className="p-lg flex flex-col gap-sm">
        {!compact && (
          <div className="flex gap-xs mb-xs">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder={t('cart.promo')} className="input py-2.5 flex-1" aria-label={t('cart.promo')} />
            <button className="btn-secondary btn-sm shrink-0" type="button">
              {t('cart.apply')}
            </button>
          </div>
        )}
        <Row label={t('cart.subtotal')} value={money(subtotalMinor)} />
        <Row label={t('cart.vat')} value={money(vatMinor)} />
        <Row
          label={t('cart.shipping')}
          value={shippingMinor === 0 ? t('cart.shippingFree') : money(shippingMinor)}
          muted={shippingMinor === 0}
        />
        {hasColdChain && coldChainMinor > 0 && <Row label={t('cart.coldChainFee')} value={money(coldChainMinor)} />}

        <div className="my-xs -mx-lg">
          <WaveDivider tone="gold" height={14} className="opacity-60" />
        </div>

        <div className="flex items-center justify-between">
          <span className="font-serif text-card-title text-ink">{t('cart.total')}</span>
          <span className="font-serif text-headline text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {money(totalMinor)}
          </span>
        </div>

        {children}

        <p className="font-sans text-caption text-ink-subtle text-center mt-xs leading-relaxed">{t('cart.taxNote')}</p>
      </div>
    </div>
  )
}
