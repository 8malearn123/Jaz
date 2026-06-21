import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Search, X, CornerDownLeft } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { products } from '@/data/products'
import { flavors, flavorList } from '@/data/flavors'
import { ProductArt } from '@/components/brand/ProductArt'
import { tint } from '@/lib/cn'

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const { channel } = useChannel()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    const focus = setTimeout(() => inputRef.current?.focus(), 40)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(focus)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return products.filter((p) => p.badges.includes('bestseller')).slice(0, 4)
    return products
      .filter((p) =>
        p.title.en.toLowerCase().includes(query) ||
        p.title.ar.includes(q.trim()) ||
        flavors[p.flavorId].name.en.toLowerCase().includes(query) ||
        flavors[p.flavorId].name.ar.includes(q.trim()) ||
        p.sku.toLowerCase().includes(query),
      )
      .slice(0, 6)
  }, [q])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center px-lg pt-[10vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-overlay/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-surface-1 rounded-xl shadow-soft-lg overflow-hidden animate-scale-in">
        {/* input */}
        <div className="flex items-center gap-sm px-lg border-b border-hairline">
          <Search size={20} className="text-ink-subtle shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={pick({ en: 'Search flavors, bars, gifts…', ar: 'ابحث عن النكهات والألواح والهدايا…' })}
            className="flex-1 bg-transparent py-4 font-serif text-body-lg text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* results */}
        <div className="max-h-[52vh] overflow-y-auto">
          {!q.trim() && (
            <p className="px-lg pt-md font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('badge.bestseller')}</p>
          )}
          {results.length === 0 ? (
            <p className="px-lg py-xl text-center font-sans text-data text-ink-muted">{t('shop.empty')}</p>
          ) : (
            <ul className="p-sm">
              {results.map((p) => {
                const f = flavors[p.flavorId]
                const v = p.variants.find((x) => x.inStock) ?? p.variants[0]
                const price = channel === 'b2b' ? v.b2bPriceMinor : v.retailPriceMinor
                return (
                  <li key={p.id}>
                    <Link
                      to={`/product/${p.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-md p-sm rounded-lg hover:bg-surface-2 transition-colors group"
                    >
                      <span className="w-12 h-12 rounded-md overflow-hidden border border-hairline shrink-0" style={{ backgroundColor: tint(f.accent, 14) }}>
                        <ProductArt flavorId={p.flavorId} kind={p.type === 'gift_box' ? 'box' : 'bar'} branded={false} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-serif text-card-title text-ink truncate group-hover:text-primary-hover transition-colors">{pick(p.title)}</span>
                        <span className="block font-sans text-caption text-ink-subtle">{pick(f.name)}</span>
                      </span>
                      <span className="font-sans text-data text-ink tabular-nums shrink-0" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(price)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* footer: flavor jumps */}
        <div className="px-lg py-md border-t border-hairline flex flex-wrap items-center gap-xs">
          <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle me-xs">{t('shop.filter.flavor')}</span>
          {flavorList.slice(0, 6).map((f) => (
            <Link key={f.id} to={`/shop?flavor=${f.id}`} onClick={onClose} className="inline-flex items-center gap-xs rounded-pill border border-hairline px-2.5 py-1 hover:border-hairline-strong transition-colors">
              <span className="w-2 h-2 rounded-pill" style={{ backgroundColor: f.accent }} />
              <span className="font-sans text-caption text-ink-muted">{pick(f.name)}</span>
            </Link>
          ))}
          <span className="ms-auto inline-flex items-center gap-xxs font-sans text-caption text-ink-subtle">
            <CornerDownLeft size={12} /> {pick({ en: 'to open', ar: 'للفتح' })}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
