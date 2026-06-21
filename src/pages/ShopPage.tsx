import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { products } from '@/data/products'
import { flavorList } from '@/data/flavors'
import type { FlavorId } from '@/data/types'
import { ProductCard } from '@/components/ui/ProductCard'
import { FlavorChip } from '@/components/ui/FlavorChip'
import { Reveal } from '@/components/ui/Reveal'
import { Eyebrow } from '@/components/ui/Misc'
import { PatternBand } from '@/components/brand/PatternBand'
import { cn } from '@/lib/cn'

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating'

export function ShopPage() {
  const { t, pick, locale } = useLocale()
  const { channel } = useChannel()
  const [params, setParams] = useSearchParams()
  const flavorParam = params.get('flavor') as FlavorId | null

  const [flavor, setFlavor] = useState<FlavorId | 'all'>(flavorParam ?? 'all')
  const [type, setType] = useState<'all' | 'bar' | 'gift_box'>('all')
  const [sort, setSort] = useState<SortKey>('featured')

  useEffect(() => {
    if (flavorParam) setFlavor(flavorParam)
  }, [flavorParam])

  const selectFlavor = (f: FlavorId | 'all') => {
    setFlavor(f)
    const next = new URLSearchParams(params)
    if (f === 'all') next.delete('flavor')
    else next.set('flavor', f)
    setParams(next, { replace: true })
  }

  const priceOf = (p: (typeof products)[number]) => {
    const v = p.variants[0]
    return channel === 'b2b' ? v.b2bPriceMinor : v.retailPriceMinor
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (flavor !== 'all' && p.flavorId !== flavor) return false
      if (type === 'bar' && p.type !== 'bar') return false
      if (type === 'gift_box' && p.type !== 'gift_box') return false
      return true
    })
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return priceOf(a) - priceOf(b)
        case 'price-desc':
          return priceOf(b) - priceOf(a)
        case 'rating':
          return b.rating - a.rating
        default:
          return b.reviewCount - a.reviewCount
      }
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flavor, type, sort, channel])

  const sortLabels: Record<SortKey, { en: string; ar: string }> = {
    featured: { en: 'Featured', ar: 'مميز' },
    'price-asc': { en: 'Price: low to high', ar: 'السعر: من الأقل' },
    'price-desc': { en: 'Price: high to low', ar: 'السعر: من الأعلى' },
    rating: { en: 'Top rated', ar: 'الأعلى تقييمًا' },
  }

  return (
    <>
      {/* header */}
      <section className="bg-surface-2 border-b border-hairline">
        <PatternBand motif="coffee" height={56} opacity={0.1} />
        <div className="container-jaz py-xxl flex flex-col gap-md">
          <Eyebrow>{t('nav.shop')}</Eyebrow>
          <h1 className="font-serif text-display-lg text-ink max-w-2xl text-balance">{t('shop.title')}</h1>
          <p className="text-body-lg text-ink-muted max-w-prose">{t('shop.subtitle')}</p>
        </div>
      </section>

      <section className="container-jaz py-xl">
        {/* filter bar */}
        <div className="flex flex-col gap-md mb-xl">
          <div className="flex flex-wrap items-center gap-xs">
            <span className="me-sm font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('shop.filter.flavor')}</span>
            <FlavorChip label={t('shop.filter.all')} active={flavor === 'all'} onClick={() => selectFlavor('all')} />
            {flavorList.map((f) => (
              <FlavorChip key={f.id} label={pick(f.name)} accent={f.accent} active={flavor === f.id} onClick={() => selectFlavor(f.id)} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-md pt-sm border-t border-hairline">
            <div className="flex items-center gap-xs">
              {(['all', 'bar', 'gift_box'] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setType(tp)}
                  className={cn(
                    'font-sans text-caption uppercase tracking-[0.1em] px-3 py-2 rounded-md transition-colors',
                    type === tp ? 'bg-ink text-ink-on-dark' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {tp === 'all'
                    ? t('shop.filter.all')
                    : tp === 'bar'
                      ? pick({ en: 'Bars', ar: 'ألواح' })
                      : pick({ en: 'Gift boxes', ar: 'علب الهدايا' })}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-sm">
              <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">
                {filtered.length} {t('shop.results')}
              </span>
              <label className="sr-only" htmlFor="sort">
                {t('shop.sort')}
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="input py-2 ps-3 pe-8 font-sans text-data w-auto cursor-pointer"
              >
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {sortLabels[k][locale]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="py-xxl text-center text-ink-muted">{t('shop.empty')}</div>
        ) : (
          <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 60}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
