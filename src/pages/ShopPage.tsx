import { useMemo, useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLocale, toArabicDigits } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { products, getProductById } from '@/data/products'
import { flavors, flavorList } from '@/data/flavors'
import { directProductIds, oneLandProductIds, repeatedProductIds } from '@/data/shopSections'
import type { FlavorId, Product } from '@/data/types'
import { ProductCard } from '@/components/ui/ProductCard'
import { FlavorChip } from '@/components/ui/FlavorChip'
import { Reveal } from '@/components/ui/Reveal'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { PatternBand } from '@/components/brand/PatternBand'
import { cn } from '@/lib/cn'

/*
 * The client laid this page out as two sections: the bars stated plainly, then the
 * seven Jazan-rooted flavours under «نكهات من أرضٍ واحدة», each carrying a line of
 * their own copy. That curation is the page's resting state.
 *
 * The filters didn't survive as a permanent bar above it — a curated page with a
 * chip rail on top is not "مباشر". They fold into a disclosure instead, and any
 * narrowing at all swaps the two curated sections for one flat grid. That keeps the
 * ?flavor= deep links (the home rail, the search overlay) landing where they always
 * did: a filtered list, not a section with one card in it and another with none.
 */

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'rating'

export function ShopPage() {
  const { t, pick, locale, isRTL } = useLocale()
  const { channel } = useChannel()
  const [params, setParams] = useSearchParams()
  // Validated, not cast: ?flavor= and ?flavor=bogus must fall back to the curated page
  // rather than stranding a shopper on an empty grid with the chips collapsed.
  const raw = params.get('flavor')
  const flavorParam: FlavorId | null = raw && raw in flavors ? (raw as FlavorId) : null

  const [flavor, setFlavor] = useState<FlavorId | 'all'>(flavorParam ?? 'all')
  const [sort, setSort] = useState<SortKey>('featured')
  const [filtersOpen, setFiltersOpen] = useState(Boolean(flavorParam))

  // The URL is the source of truth for which view is on screen, so leaving
  // /shop?flavor=rose for a bare /shop puts the curated page — and the collapsed
  // disclosure — back exactly as they were.
  useEffect(() => {
    setFlavor(flavorParam ?? 'all')
    setFiltersOpen(Boolean(flavorParam))
  }, [flavorParam])

  const selectFlavor = (f: FlavorId | 'all') => {
    setFlavor(f)
    const next = new URLSearchParams(params)
    if (f === 'all') next.delete('flavor')
    else next.set('flavor', f)
    // Entering the filtered view pushes, so Back undoes the filter and returns to the
    // curated page; moving between flavours replaces, so Back isn't a chip-by-chip rewind.
    setParams(next, { replace: flavor !== 'all' })
  }

  /** Choosing a flavour is what collapses the two curated sections into one flat grid. */
  const isFiltered = flavor !== 'all'

  const resetFilters = () => {
    setSort('featured')
    selectFlavor('all')
  }

  const priceOf = (p: Product) => {
    const v = p.variants[0]
    return channel === 'b2b' ? v.b2bPriceMinor : v.retailPriceMinor
  }

  // The curated lists are the client's order — never sorted.
  const directProducts = useMemo(
    () => directProductIds.map((id) => getProductById(id)).filter((p): p is Product => Boolean(p)),
    [],
  )
  const landProducts = useMemo(
    () => oneLandProductIds.map((id) => getProductById(id)).filter((p): p is Product => Boolean(p)),
    [],
  )

  // Bars only. The gift boxes carry a flavour id purely as an art key, so a "Rose" chip
  // would otherwise surface The Orchard Box — and they have their own page anyway.
  const bars = useMemo(() => products.filter((p) => p.type === 'bar'), [])

  const filtered = useMemo(() => {
    const list = bars.filter((p) => flavor === 'all' || p.flavorId === flavor)
    return [...list].sort((a, b) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flavor, sort, channel, bars])

  const sortLabels: Record<SortKey, { en: string; ar: string }> = {
    featured: { en: 'Featured', ar: 'مميز' },
    'price-asc': { en: 'Price: low to high', ar: 'السعر: من الأقل' },
    'price-desc': { en: 'Price: high to low', ar: 'السعر: من الأعلى' },
    rating: { en: 'Top rated', ar: 'الأعلى تقييمًا' },
  }

  // Arabic script has no italic; a browser-synthesized oblique reads as broken type.
  const italicLatin = isRTL ? '' : 'italic'

  return (
    <>
      {/* page header */}
      <section className="bg-surface-2 border-b border-hairline">
        <PatternBand motif="coffee" height={56} opacity={0.1} />
        <div className="container-jaz py-xxl flex flex-col gap-md">
          <Eyebrow>{t('nav.shop')}</Eyebrow>
          <h1 className="font-serif text-display-lg text-ink max-w-2xl text-balance">{t('shop.title')}</h1>
          <p className="text-body-lg text-ink-muted max-w-prose">{t('shop.subtitle')}</p>
        </div>
      </section>

      {/* filter & sort — folded away until asked for */}
      <section className="container-jaz pt-lg">
        <div className="flex items-center justify-end gap-md">
          {isFiltered && (
            <button type="button" onClick={resetFilters} className="link-gold">
              {t('shop.filter.reset')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="shop-filters"
            className="font-sans text-caption uppercase tracking-[0.12em] text-ink-muted hover:text-ink transition-colors py-2"
          >
            {t('shop.filter.toggle')}
          </button>
        </div>

        {filtersOpen && (
          <div id="shop-filters" className="flex flex-col gap-md mt-md pt-md border-t border-hairline">
            <div className="flex flex-wrap items-center gap-xs">
              <span className="me-sm font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('shop.filter.flavor')}</span>
              <FlavorChip label={t('shop.filter.all')} active={flavor === 'all'} onClick={() => selectFlavor('all')} />
              {flavorList.map((f) => (
                <FlavorChip key={f.id} label={pick(f.name)} accent={f.accent} active={flavor === f.id} onClick={() => selectFlavor(f.id)} />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-md">
              <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">
                {isFiltered ? `${locale === 'ar' ? toArabicDigits(String(filtered.length)) : filtered.length} ${t('shop.results')}` : ''}
              </span>
              {/* Sorting only means something over a flat list — the curated page is
                  in the client's order, and reordering it would discard their curation. */}
              {isFiltered && (
                <div className="flex items-center gap-sm">
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
              )}
            </div>
          </div>
        )}
      </section>

      {isFiltered ? (
        /* one flat grid — where every ?flavor= link lands */
        <section className="container-jaz py-xl">
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
      ) : (
        <>
          {/* ── «المنتجات بشكل مباشر» ──────────────────────────── */}
          <section className="container-jaz py-xxl">
            <Reveal>
              <h2 className="font-serif text-display-md md:text-display-lg text-ink text-center text-balance">
                {t('shop.section.direct.title')}
              </h2>
            </Reveal>

            <div className="mt-xl grid gap-lg grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {directProducts.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 60}>
                  <ProductCard product={p} variant="plain" />
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── «نكهات من أرضٍ واحدة» ──────────────────────────── */}
          <section className="bg-surface-2 border-y border-hairline">
            <PatternBand motif="mango" height={56} opacity={0.1} />
            <div className="container-jaz py-xxl">
              <Reveal>
                <div className="flex flex-col gap-md items-center text-center">
                  <Eyebrow>{t('shop.section.land.eyebrow')}</Eyebrow>
                  <h2 className="font-serif text-display-md md:text-display-lg text-ink text-balance max-w-3xl">
                    {t('shop.section.land.title')}
                  </h2>
                  <p className="text-body-lg text-ink-muted max-w-prose">
                    {repeatedProductIds.size > 0 ? t('shop.section.land.body') : t('shop.section.land.bodyPlain')}
                  </p>
                </div>
              </Reveal>

              <div className="mt-xl grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
                {landProducts.map((p, i) => {
                  const line = flavors[p.flavorId].landLine
                  const alsoAbove = repeatedProductIds.has(p.id)
                  return (
                    <Reveal key={p.id} delay={(i % 3) * 60}>
                      <figure className="flex flex-col gap-md h-full">
                        <ProductCard product={p} />
                        <figcaption className="flex flex-col items-start gap-xs px-xs">
                          {line && (
                            <p className={cn('font-serif text-body text-ink-muted leading-relaxed text-balance', italicLatin)}>{pick(line)}</p>
                          )}
                          {alsoAbove && <StatusBadge variant="neutral">{t('shop.section.land.alsoAbove')}</StatusBadge>}
                        </figcaption>
                      </figure>
                    </Reveal>
                  )
                })}
              </div>

              {/* The boxes aren't on this page, so the page says where they are. */}
              <Reveal delay={200}>
                <div className="mt-xl flex justify-center">
                  <Link to="/gifts" className="link-gold">
                    {t('shop.giftsLink')} <ArrowRight size={15} className="rtl:rotate-180" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        </>
      )}
    </>
  )
}
