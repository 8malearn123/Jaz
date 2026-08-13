import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, Leaf, Palette } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { products } from '@/data/products'
import { collections } from '@/data/collections'
import { flavorList, flavors } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Reveal } from '@/components/ui/Reveal'
import { ProductCard } from '@/components/ui/ProductCard'
import { Eyebrow, QuoteGlyph, Stars, StatusBadge } from '@/components/ui/Misc'
import { ProductArt } from '@/components/brand/ProductArt'
import { JazanScene } from '@/components/brand/JazanScene'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { PatternBand, MotifGlyph } from '@/components/brand/PatternBand'
import { cn, tint } from '@/lib/cn'

/** Scroll position for subtle parallax. SSR-safe (starts at 0), honours reduced motion. */
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setY(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
  return y
}

/** Auto-discovers how many /hero/hero-N-*.jpg pairs exist and crossfade-loops them.
 *  Drop another pair (hero-4-ltr.jpg / hero-4-rtl.jpg) and it joins the loop — no code change. */
function useHeroCarousel() {
  const [count, setCount] = useState(1)
  const [active, setActive] = useState(0)
  useEffect(() => {
    let cancelled = false
    const exists = (n: number) =>
      new Promise<boolean>((res) => {
        const img = new Image()
        img.onload = () => res(true)
        img.onerror = () => res(false)
        img.src = `/hero/hero-${n}-ltr.jpg`
      })
    ;(async () => {
      let n = 1
      while (n < 12 && (await exists(n + 1))) n++
      if (!cancelled) setCount(n)
    })()
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    if (count <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setActive((a) => (a + 1) % count), 6000)
    return () => clearInterval(id)
  }, [count])
  return { count, active }
}

export function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <ShowcaseSection />
      <ArtSection />
      <CollectionsSection />
      <HeritageSection />
      <ReviewsSection />
      <NewsletterSection />
    </>
  )
}

/* ─────────────────────────── Hero ─────────────────────────── */
function Hero() {
  const { t, pick, locale } = useLocale()
  const y = useScrollY()
  const { count, active } = useHeroCarousel()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(r)
  }, [])
  const reviewTotal = products.reduce((s, p) => s + p.reviewCount, 0)
  const ratingAvg = products.reduce((s, p) => s + p.rating * p.reviewCount, 0) / reviewTotal
  // Language-swapped artwork: LTR keeps the open space on the left, RTL on the right —
  // so the copy always lands on the calm side. Scrim direction follows suit.
  const side = locale === 'ar' ? 'rtl' : 'ltr'
  const scrimDir = locale === 'ar' ? 'to left' : 'to right'

  return (
    <section className="relative isolate overflow-hidden text-ink-on-dark -mt-[112px] pt-[132px] pb-xxl min-h-[92vh] flex flex-col justify-center">
      {/* full-bleed artwork — auto-discovered set, crossfading loop, ken-burns + parallax */}
      <div className="absolute inset-0 -z-10 bg-canvas-dark" style={{ transform: `translateY(${y * 0.12}px)` }}>
        {Array.from({ length: count }).map((_, i) => (
          <img
            key={i}
            src={`/hero/hero-${i + 1}-${side}.jpg`}
            alt=""
            aria-hidden
            className={cn('absolute inset-0 w-full h-full object-cover', i === active ? 'opacity-100' : 'opacity-0')}
            style={{
              transform: i === active && mounted ? 'scale(1.06)' : 'scale(1)',
              transition: 'opacity 1200ms ease, transform 7000ms ease-out',
            }}
          />
        ))}
      </div>
      {/* scrims: text side (locale-aware), header top, page-blend bottom */}
      <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(${scrimDir}, rgba(23,18,15,0.80), rgba(23,18,15,0.34) 40%, transparent 68%)` }} />
      <div className="absolute inset-x-0 top-0 h-44 -z-10" style={{ background: 'linear-gradient(to bottom, rgba(23,18,15,0.62), transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 h-40 -z-10" style={{ background: 'linear-gradient(to top, rgba(23,18,15,0.5), transparent)' }} />

      {/* copy — sits in the artwork's open side */}
      <div className="container-jaz relative w-full">
        <div className="max-w-xl flex flex-col gap-lg">
          <Reveal>
            <Eyebrow tone="on-dark">{t('home.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className={cn(
                'font-serif text-ink-on-dark whitespace-pre-line text-balance',
                'text-[clamp(2.8rem,7vw,5.3rem)] leading-[86px]',
                '[text-shadow:0_2px_28px_rgba(23,18,15,0.42)]',
                locale === 'en' && 'tracking-[-0.02em]',
              )}
            >
              {t('home.hero.title')}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-body-lg text-ink-on-dark-muted max-w-prose [text-shadow:0_1px_14px_rgba(23,18,15,0.4)]">{t('home.hero.body')}</p>
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap items-center gap-sm pt-xs">
            <Link to="/shop" className={buttonClass('primary')}>
              {t('cta.shop')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
            <Link
              to="/collections"
              className="btn bg-ink-on-dark/10 backdrop-blur-sm text-ink-on-dark border border-ink-on-dark/25 hover:bg-ink-on-dark/20 hover:border-ink-on-dark/40"
            >
              {t('nav.collections')}
            </Link>
          </Reveal>
          {/* trust row */}
          <Reveal delay={320} className="flex flex-wrap items-center gap-md pt-md mt-xs border-t border-ink-on-dark/15">
            <div className="flex items-center gap-sm pt-md">
              <Stars value={ratingAvg} size={15} />
              <span className="font-sans text-data text-ink-on-dark tabular-nums">{ratingAvg.toFixed(1)}</span>
            </div>
            <span className="font-sans text-caption text-ink-on-dark-muted pt-md">
              {reviewTotal.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} {t('home.hero.reviews')}
            </span>
            <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-on-dark-muted pt-md">
              <Leaf size={13} className="text-primary-bright" />
              {pick({ en: 'Jazan-grown ingredients', ar: 'مكوّنات من جازان' })}
            </span>
          </Reveal>
        </div>
      </div>

      {/* gold seam into the page */}
      <div className="absolute bottom-0 inset-x-0">
        <WaveDivider tone="gold" height={22} />
      </div>
    </section>
  )
}

/* ─────────────────────────── Marquee ─────────────────────────── */
function Marquee() {
  const { t } = useLocale()
  const text = t('home.marquee')
  const items = [text, text, text]
  return (
    <div className="bg-chocolate text-ink-on-dark-muted py-md overflow-hidden border-b border-hairline-dark">
      <div className="flex w-max animate-marquee gap-xl">
        {[...items, ...items].map((s, i) => (
          <div key={i} className="flex items-center gap-xl">
            <MotifGlyph motif="jasmine" size={18} className="text-primary shrink-0" />
            <span className="font-sans text-caption uppercase tracking-[0.18em] whitespace-nowrap">{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── Showcase (flavors + spotlight + rail) ─────────────────────────── */
function ShowcaseSection() {
  const { t, pick, money } = useLocale()
  const spotlight = products.find((p) => p.id === 'p-milk') ?? products[0]
  const sFlavor = flavors[spotlight.flavorId]
  const sVariant = spotlight.variants.find((v) => v.inStock) ?? spotlight.variants[0]

  return (
    <section className="container-jaz py-section">
      <Reveal>
        <SectionHeader
          number="01"
          eyebrow={t('home.flavors.eyebrow')}
          label="The Flavor Library"
          title={t('home.flavors.title')}
          body={t('home.flavors.body')}
        />
      </Reveal>

      {/* flavor pills rail */}
      <Reveal delay={80} className="mt-xl flex flex-wrap gap-sm">
        {flavorList.map((f) => (
          <Link
            key={f.id}
            to={`/shop?flavor=${f.id}`}
            className="group flex items-center gap-xs rounded-pill border border-hairline bg-surface-1 ps-2 pe-4 py-2 hover:border-hairline-strong hover:-translate-y-0.5 transition-all duration-300 ease-editorial"
          >
            <span className="w-7 h-7 rounded-pill grid place-items-center" style={{ backgroundColor: tint(f.accent, 26) }}>
              <span className="w-3 h-3 rounded-pill" style={{ backgroundColor: f.accent }} />
            </span>
            <span className="font-sans text-data text-ink group-hover:text-primary-hover transition-colors">{pick(f.name)}</span>
          </Link>
        ))}
      </Reveal>

      {/* bestseller spotlight */}
      <Reveal delay={120} className="mt-xl">
        <div className="grid lg:grid-cols-2 rounded-xl overflow-hidden border border-hairline shadow-lift card-hover bg-surface-1">
          <Link
            to={`/product/${spotlight.slug}`}
            className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] overflow-hidden group"
            style={{ backgroundColor: tint(sFlavor.accent, 12) }}
          >
            <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
              <ProductArt flavorId={spotlight.flavorId} />
            </div>
            <div className="absolute" style={{ insetInlineStart: 20, top: 20 }}>
              <StatusBadge variant="gold" solid>{t('badge.bestseller')}</StatusBadge>
            </div>
          </Link>
          <div className="flex flex-col justify-center gap-md p-xl lg:p-xxl">
            <div className="flex items-center gap-sm">
              <span className="font-sans text-caption uppercase tracking-[0.12em]" style={{ color: sFlavor.accent }}>
                {pick(sFlavor.name)}
              </span>
              <Stars value={spotlight.rating} size={13} />
              <span className="font-sans text-caption text-ink-subtle tabular-nums">
                {spotlight.rating.toFixed(1)} · {spotlight.reviewCount}
              </span>
            </div>
            <h3 className="font-serif text-display-md text-ink leading-tight">{pick(spotlight.title)}</h3>
            <p className="text-body text-ink-muted max-w-prose">{pick(spotlight.story)}</p>
            <div className="flex items-center gap-md mt-xs">
              <span className="font-serif text-headline text-ink tabular-nums">{money(sVariant.retailPriceMinor)}</span>
              <Link to={`/product/${spotlight.slug}`} className={buttonClass('primary')}>
                {t('cta.viewDetails')}
                <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* full library rail */}
      <Reveal delay={80} className="mt-xxl flex items-end justify-between gap-md">
        <h3 className="font-serif text-headline text-ink">{t('home.flavors.railTitle')}</h3>
        <Link to="/shop" className="link-gold shrink-0">
          {t('cta.viewAll')}
          <ArrowRight size={15} className="rtl:rotate-180" />
        </Link>
      </Reveal>
      <div className="mt-lg -mx-lg px-lg md:-mx-xl md:px-xl overflow-x-auto no-scrollbar">
        <div className="flex gap-lg snap-x snap-mandatory pb-xs">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 6) * 60} className="snap-start shrink-0 w-[248px] sm:w-[268px]">
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Art on every wrapper ─────────────────────────── */
function ArtSection() {
  const { t, pick } = useLocale()
  const featured = ['p-dark60', 'p-coffee', 'p-mango']
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is (typeof products)[number] => !!p && !!p.artCard)

  return (
    <section className="relative bg-canvas-dark text-ink-on-dark overflow-hidden">
      <WaveDivider tone="gold" height={20} flip />
      <div className="absolute inset-x-0 top-0 opacity-[0.5]">
        <PatternBand motif="jasmine" height={120} opacity={0.14} tone="on-dark" />
      </div>
      <div className="container-jaz relative py-section">
        <Reveal>
          <SectionHeader
            number="02"
            eyebrow={t('home.art.eyebrow')}
            label="Collector Series"
            title={t('home.art.title')}
            body={t('home.art.body')}
            tone="on-dark"
          />
        </Reveal>

        <div className="mt-xl grid gap-lg md:grid-cols-3">
          {featured.map((p, i) => {
            const card = p.artCard!
            const flavor = flavors[p.flavorId]
            return (
              <Reveal key={p.id} delay={i * 90}>
                <Link
                  to={`/product/${p.slug}`}
                  className="group block rounded-xl overflow-hidden border border-hairline-dark bg-surface-dark-1 card-hover h-full"
                >
                  <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: tint(flavor.accent, 10) }}>
                    <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.05]">
                      <ProductArt flavorId={p.flavorId} />
                    </div>
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(23,18,15,0.82), rgba(23,18,15,0.05) 46%, transparent)' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-lg">
                      <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.12em] text-primary-bright">
                        <Palette size={13} /> {t('home.art.by')} {pick(card.artistName)}
                      </span>
                      <h3 className="font-serif text-card-title text-ink-on-dark mt-xxs leading-snug">{pick(card.artworkTitle)}</h3>
                    </div>
                  </div>
                  <div className="p-lg flex items-center justify-between gap-sm">
                    <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-on-dark-muted">{pick(p.title)}</span>
                    <ArrowUpRight
                      size={18}
                      className="text-ink-on-dark-muted group-hover:text-primary-bright transition-colors rtl:rotate-[-90deg]"
                    />
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={120} className="mt-xl flex justify-center">
          <Link
            to="/shop"
            className="btn bg-transparent text-ink-on-dark border border-hairline-dark hover:border-primary/60 hover:text-primary-bright"
          >
            {t('home.art.cta')}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </Reveal>
      </div>
      <WaveDivider tone="gold" height={20} />
    </section>
  )
}

/* ─────────────────────────── Collections ─────────────────────────── */
function CollectionsSection() {
  const { t, pick, money } = useLocale()
  const [feature, ...rest] = collections
  return (
    <section className="bg-surface-2 border-y border-hairline bg-grain">
      <PatternBand motif="wave" height={64} opacity={0.12} />
      <div className="container-jaz py-section">
        <Reveal>
          <SectionHeader number="03" eyebrow={t('home.collections.eyebrow')} label="Gifting" title={t('home.collections.title')} />
        </Reveal>

        <div className="mt-xl grid gap-lg lg:grid-cols-2">
          {/* feature collection */}
          <Reveal>
            <Link
              to="/collections"
              className="group relative block rounded-xl overflow-hidden h-full min-h-[420px] shadow-lift card-hover"
              style={{ backgroundColor: feature.accent }}
            >
              <div className="absolute inset-0 opacity-90 transition-transform duration-700 ease-editorial group-hover:scale-[1.03]">
                <ProductArt flavorId="rose" kind="box" />
              </div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(23,18,15,0.78), rgba(23,18,15,0.12) 60%, transparent)' }} />
              <div className="absolute inset-x-0 bottom-0 p-xl flex flex-col gap-sm text-ink-on-dark">
                <span className="eyebrow text-primary-bright">{t(`badge.${feature.kind === 'corporate' ? 'limited' : 'new'}`)}</span>
                <h3 className="font-serif text-display-md text-ink-on-dark">{pick(feature.title)}</h3>
                <p className="text-body-sm text-ink-on-dark-muted max-w-md">{pick(feature.description)}</p>
                <div className="flex items-center gap-md mt-xs">
                  <span className="font-sans text-body text-ink-on-dark">{money(feature.priceMinor)}</span>
                  <span className="inline-flex items-center gap-xs font-sans text-button uppercase text-primary-bright">
                    {t('cta.explore')} <ArrowUpRight size={15} className="rtl:rotate-[-90deg]" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>

          {/* rest list */}
          <div className="grid gap-lg">
            {rest.map((c, i) => (
              <Reveal key={c.id} delay={i * 80}>
                <Link to="/collections" className="group card card-hover flex items-stretch overflow-hidden min-h-[124px]">
                  <div className="w-32 shrink-0 relative overflow-hidden" style={{ backgroundColor: tint(c.accent, 16) }}>
                    <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.06]">
                      <ProductArt flavorId={c.id === 'c-harvest-ribbon' ? 'mango' : c.id === 'c-corporate-crescent' ? 'coffee' : 'milk'} kind="box" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-xxs p-lg flex-1">
                    <div className="flex items-center justify-between gap-sm">
                      <h4 className="font-serif text-card-title text-ink">{pick(c.title)}</h4>
                      <ArrowUpRight size={18} className="text-ink-subtle group-hover:text-primary-hover transition-colors rtl:rotate-[-90deg]" />
                    </div>
                    <p className="text-body-sm text-ink-muted line-clamp-2">{pick(c.description)}</p>
                    <span className="font-sans text-data text-ink-subtle mt-xxs">
                      {money(c.priceMinor)} · {c.pieceCount} {t('shop.results')}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Heritage ─────────────────────────── */
function HeritageSection() {
  const { t, pick } = useLocale()
  return (
    <section className="container-jaz py-section">
      <div className="grid lg:grid-cols-2 gap-xl items-center">
        <Reveal className="order-2 lg:order-1">
          <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-canvas-dark shadow-soft">
            <JazanScene tone="dark" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-[42%] aspect-[5/6] rounded-lg overflow-hidden shadow-soft-lg rotate-[-4deg] ring-1 ring-hairline-dark/50">
                <ProductArt flavorId="jasmine" />
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0">
              <WaveDivider tone="gold" height={18} />
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2 flex flex-col gap-lg">
          <Reveal>
            <SectionHeader number="04" eyebrow={t('home.story.eyebrow')} title={t('home.story.title')} />
          </Reveal>
          <Reveal delay={80}>
            <p className="text-body-lg text-ink-muted">{t('home.story.body')}</p>
          </Reveal>
          <Reveal delay={140}>
            <figure className="quote-block bg-surface-2 rounded-lg p-xl border border-hairline relative">
              <QuoteGlyph className="text-[44px] absolute -top-2 ms-2" />
              <blockquote className="font-serif text-subhead text-ink leading-relaxed pt-md">
                {pick({
                  en: 'We did not want a chocolate that could be from anywhere. We wanted one that could only be from Jazan.',
                  ar: 'لم نُرد شوكولاتة قد تكون من أي مكان. أردنا واحدةً لا يمكن أن تكون إلا من جازان.',
                })}
              </blockquote>
              <figcaption className="mt-md font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">
                {pick({ en: 'The JAZ founders', ar: 'مؤسّسو جاز' })}
              </figcaption>
            </figure>
          </Reveal>
          <Reveal delay={200}>
            <Link to="/heritage" className="link-gold">
              {t('cta.learnMore')} <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Reviews ─────────────────────────── */
type ReviewProduct = (typeof products)[number]

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => [...w][0])
    .join('')
    .toUpperCase()
}

function ReviewsSection() {
  const { t } = useLocale()
  const items = products.flatMap((p) => p.reviews.map((review) => ({ review, product: p })))
  const railRef = useRef<HTMLDivElement>(null)
  const nudge = (dir: number) => railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.85, behavior: 'smooth' })

  return (
    <section className="bg-surface-2 border-y border-hairline bg-grain">
      <div className="container-jaz py-section">
        <Reveal>
          <SectionHeader number="05" eyebrow={t('home.reviews.eyebrow')} label="Testimonials" title={t('home.reviews.title')} />
        </Reveal>

        <div
          ref={railRef}
          className="mt-xl -mx-lg px-lg md:-mx-xl md:px-xl flex items-stretch gap-lg overflow-x-auto no-scrollbar snap-x snap-mandatory pb-md"
        >
          {items.map(({ review, product }, i) => (
            <Reveal key={`${product.id}-${i}`} delay={Math.min(i, 4) * 70} className="snap-start shrink-0 w-[300px] sm:w-[368px] h-auto">
              <ReviewCard review={review} product={product} />
            </Reveal>
          ))}
        </div>

        {/* pager — sits at the reading-end (right in LTR, left in RTL); icons stay physical ← → */}
        <div className="mt-xl flex justify-end">
          <div dir="ltr" className="flex items-center gap-sm">
            <CarouselButton dir={-1} onClick={() => nudge(-1)} label={t('cta.back')} />
            <CarouselButton dir={1} onClick={() => nudge(1)} label={t('cta.continue')} />
          </div>
        </div>
      </div>
    </section>
  )
}

function CarouselButton({ dir, onClick, label }: { dir: number; onClick: () => void; label: string }) {
  const Icon = dir < 0 ? ArrowLeft : ArrowRight
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid place-items-center w-12 h-12 rounded-pill border border-hairline-strong text-ink-muted transition-all duration-300 ease-editorial hover:bg-primary hover:text-on-primary hover:border-primary hover:shadow-soft active:scale-95"
    >
      <Icon size={18} />
    </button>
  )
}

function ReviewCard({ review, product }: { review: ReviewProduct['reviews'][number]; product: ReviewProduct }) {
  const { pick } = useLocale()
  const flavor = flavors[product.flavorId]
  const name = pick(review.author)
  return (
    <figure className="group card card-hover overflow-hidden flex flex-col h-full">
      {/* product photo */}
      <div className="relative aspect-[16/10] overflow-hidden" style={{ backgroundColor: tint(flavor.accent, 12) }}>
        <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-[1.04]">
          <ProductArt flavorId={product.flavorId} />
        </div>
      </div>
      {/* gold wave seam — the house signature */}
      <WaveDivider tone="gold" height={16} />
      {/* body */}
      <div className="flex flex-col gap-sm p-lg flex-1">
        <QuoteGlyph className="text-[42px] leading-none -mb-3" />
        <blockquote className="font-serif text-body text-ink leading-relaxed flex-1">{pick(review.body)}</blockquote>
        <figcaption className="mt-sm pt-md border-t border-hairline flex items-center justify-between gap-sm">
          <span className="flex items-center gap-sm min-w-0">
            <span
              className="grid place-items-center w-10 h-10 rounded-pill shrink-0 font-sans text-caption font-semibold"
              style={{ backgroundColor: tint(flavor.accent, 24), color: flavor.accent }}
              aria-hidden
            >
              {initialsOf(name)}
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-card-title text-ink leading-tight truncate">{name}</span>
              <span className="block font-sans text-caption text-ink-subtle truncate">{pick(product.title)}</span>
            </span>
          </span>
          <Stars value={review.rating} size={14} className="shrink-0" />
        </figcaption>
      </div>
      {/* flavor-accent keyline */}
      <div className="h-1 w-full" style={{ backgroundColor: flavor.accent }} />
    </figure>
  )
}

/* ─────────────────────────── Newsletter — Letter № 001 ─────────────────────────── */

/** Circular Jazan postmark. Ring text stays Latin in both locales — a philatelic
 *  artifact, and Arabic on an SVG textPath renders unreliably across browsers. */
function Postmark({ label }: { label: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <div className="relative w-[84px] h-[84px] text-ink-subtle opacity-60 rotate-[-8deg] rtl:rotate-[8deg]" aria-hidden>
      {/* direction pinned: under an inherited RTL base direction, Chromium renders
          zero glyphs on a textPath — the ring would be blank in Arabic */}
      <svg viewBox="0 0 84 84" className="w-full h-full" style={{ direction: 'ltr' }}>
        <circle cx="42" cy="42" r="40" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="42" cy="42" r="33" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <defs>
          <path id={`postmark-${id}`} d="M 42 5.5 a 36.5 36.5 0 1 1 -0.01 0" fill="none" />
        </defs>
        <text fontSize="7.5" letterSpacing="2" fill="currentColor" className="font-sans uppercase">
          {/* label repeated so the ring is full; overflow past the path end clips */}
          <textPath href={`#postmark-${id}`}>{label + label}</textPath>
        </text>
      </svg>
      <MotifGlyph motif="mountain" size={26} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-ink-subtle" />
    </div>
  )
}

function NewsletterSection() {
  const { t, locale } = useLocale()
  const [stage, setStage] = useState<'idle' | 'sealing' | 'sent'>('idle')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const sealTimer = useRef<number>()
  const copyTimer = useRef<number>()
  useEffect(
    () => () => {
      window.clearTimeout(sealTimer.current)
      window.clearTimeout(copyTimer.current)
    },
    [],
  )

  // Same source as the Hero trust row, so the number is consistent site-wide.
  const readers = products.reduce((s, p) => s + p.reviewCount, 0)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (stage !== 'idle') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage('sent')
      return
    }
    setStage('sealing') // seal holds pressed, envelope settles flat, teaser slips inside
    sealTimer.current = window.setTimeout(() => setStage('sent'), 380)
  }

  // The seal disables itself on submit, which drops keyboard focus to <body>;
  // hand it to the risen letter so Tab continues from the new content.
  const letterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stage === 'sent') letterRef.current?.focus()
  }, [stage])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(t('home.letters.code'))
    } catch {
      return // no false "Copied" — the select-all span stays as the manual fallback
    }
    setCopied(true)
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  // ca-gregory is required: bare 'ar-SA' silently formats in the Hijri calendar.
  // Keeping the ar-SA base restores Eastern-Arabic digits, matching the rest of the UI.
  const dateline = t('home.letters.dateline').replace(
    '{date}',
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', { dateStyle: 'long' }).format(new Date()),
  )
  const [welcomeStart, welcomeEnd] = t('home.letters.welcome').split('{email}')

  return (
    <section className="relative bg-canvas-dark text-ink-on-dark overflow-hidden">
      <WaveDivider tone="gold" height={20} flip />
      <div className="absolute inset-x-0 top-0 opacity-50 pointer-events-none">
        <PatternBand motif="mountain" height={110} opacity={0.12} tone="on-dark" />
      </div>

      <div className="container-jaz relative py-section lg:py-xxl xl:py-section grid lg:grid-cols-[1fr_1.1fr] gap-xl xl:gap-xxl items-center">
        {/* the pitch — every reason to subscribe, readable with zero interaction */}
        <div className="flex flex-col gap-lg">
          <Reveal>
            <SectionHeader
              number="06"
              tone="on-dark"
              eyebrow={t('home.letters.eyebrow')}
              label={t('home.letters.label')}
              title={t('home.newsletter.title')}
              body={t('home.letters.body')}
            />
          </Reveal>
          <Reveal delay={80}>
            <div className="flex items-center gap-sm flex-wrap">
              <p className="eyebrow text-primary-bright">{t('home.letters.manifestTitle')}</p>
              <span className="badge font-sans uppercase tracking-[0.08em] bg-primary/15 text-primary-bright border border-primary/40">
                {t('home.letters.nextBadge')}
              </span>
            </div>
            <ul className="mt-xs">
              {(['mango', 'jasmine', 'coffee'] as const).map((motif, i) => (
                <li key={motif} className={cn('flex items-center gap-sm py-sm', i > 0 && 'border-t border-hairline-dark')}>
                  <MotifGlyph motif={motif} size={20} className="shrink-0 text-primary-bright" />
                  <span className="text-body-sm text-ink-on-dark-muted">{t(`home.letters.item${i + 1}`)}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={160}>
            <p className="font-sans text-caption text-primary-bright">
              {t('home.letters.readers').replace('{count}', readers.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US'))}
            </p>
          </Reveal>
        </div>

        {/* the object — an envelope from the maison, addressed by the visitor.
            No ancestor of this wrapper may clip: the tilted corners, the seal at
            -bottom-9, and the risen letter all overflow their boxes. */}
        <Reveal delay={120}>
          <div className="group relative max-w-[560px] mx-auto lg:mx-0 pt-24">
            {/* Letter № 001 peeking out, its opening line cut off by the envelope's edge */}
            <div
              aria-hidden
              className={cn(
                'absolute inset-x-6 sm:inset-x-10 top-4 z-0 rounded-sm bg-surface-2 text-ink shadow-soft-lg transition-all duration-500 ease-editorial',
                stage === 'idle' ? 'translate-y-6 group-hover:translate-y-4' : 'translate-y-6 opacity-0',
              )}
            >
              <WaveDivider tone="ink" unit={14} height={10} className="opacity-25" />
              <div className="px-lg pt-sm pb-lg">
                <p className="font-serif italic rtl:not-italic text-body text-ink-muted truncate">{t('home.letters.teaser')}</p>
              </div>
            </div>

            {/* envelope face = the form */}
            <form
              onSubmit={onSubmit}
              aria-hidden={stage === 'sent'}
              className={cn(
                'relative z-20 rounded-md bg-surface-2 bg-grain text-ink border border-hairline-strong shadow-soft-lg',
                'p-lg pb-xxl sm:p-xl sm:pb-xxl',
                'transition-transform duration-500 ease-editorial focus-within:rotate-0',
                stage === 'idle' ? 'rotate-[-1.2deg] rtl:rotate-[1.2deg]' : 'rotate-0',
              )}
            >
              {/* flap crease */}
              <svg
                aria-hidden
                className="absolute inset-x-0 top-0 h-16 w-full text-hairline-strong pointer-events-none"
                viewBox="0 0 100 24"
                preserveAspectRatio="none"
                fill="none"
              >
                <path d="M 0 0 L 50 24 L 100 0" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </svg>

              {/* postmark + stamp cluster */}
              <div className="absolute top-4 end-4 flex items-start gap-sm">
                <Postmark label={t('home.letters.postmark')} />
                <span className="relative block w-[46px] h-[56px] bg-surface-1 p-[3px] rotate-2 shadow-lift" aria-hidden>
                  <span className="grid place-items-center w-full h-full" style={{ backgroundColor: tint(flavors.jasmine.accent, 30) }}>
                    <MotifGlyph motif="jasmine" size={34} className="text-primary-hover" />
                  </span>
                  <span className="absolute inset-0 border border-dashed border-hairline-strong" />
                </span>
              </div>

              <p className="mt-md font-sans text-caption uppercase tracking-[0.12em] text-ink-muted max-w-[55%]">
                {t('home.letters.from')}
              </p>

              <label className="mt-xl block">
                <span className="font-serif italic rtl:not-italic text-subhead text-ink-muted">{t('home.letters.to')}</span>
                <span className="relative block [&:focus-within_.pen]:opacity-100">
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={stage !== 'idle'}
                    tabIndex={stage !== 'idle' ? -1 : undefined}
                    placeholder={t('home.letters.placeholder')}
                    aria-label={t('home.newsletter.placeholder')}
                    className="mt-xs w-full bg-transparent font-serif italic rtl:not-italic rtl:text-right text-body-lg text-ink placeholder:text-ink-muted border-0 border-b border-hairline-strong focus:border-primary focus:outline-none pb-2 transition-colors duration-200"
                  />
                  <MotifGlyph motif="jasmine" size={16} className="pen absolute end-0 bottom-3 opacity-0 transition-opacity duration-200" />
                </span>
              </label>

              {/* empty ruled line, for balance */}
              <div className="mt-lg w-2/3 border-b border-hairline" aria-hidden />

              {/* wax seal = submit; center-bottom, so RTL-neutral. Native submit keeps
                  Enter-in-the-field working — the seal is the visible affordance. */}
              <button
                type="submit"
                disabled={stage !== 'idle'}
                aria-label={t('home.letters.sealAria')}
                className="group/seal absolute left-1/2 -translate-x-1/2 -bottom-9"
              >
                <span
                  className={cn(
                    'relative grid place-items-center w-[72px] h-[72px] transition-transform duration-300 ease-editorial',
                    stage === 'idle' ? 'group-hover/seal:-translate-y-0.5 group-active/seal:scale-90' : 'scale-90',
                  )}
                >
                  <span className="absolute inset-0 rotate-12 bg-primary-hover rounded-[46%_54%_52%_48%]" aria-hidden />
                  <span
                    className="absolute inset-[6px] rounded-pill bg-primary shadow-[inset_0_2px_6px_rgba(42,26,18,0.45),inset_0_-1px_2px_rgba(255,255,255,0.25)]"
                    aria-hidden
                  />
                  {stage === 'sent' ? (
                    <Check size={26} className="relative text-on-primary/90" />
                  ) : (
                    <MotifGlyph motif="jasmine" size={30} className="relative text-on-primary/85" />
                  )}
                </span>
              </button>
            </form>

            {/* Letter № 001, risen — crossfades in over the (now inert) envelope */}
            {stage === 'sent' && (
              <div
                ref={letterRef}
                tabIndex={-1}
                className="absolute inset-x-2 sm:inset-x-8 top-0 z-30 rounded-sm bg-surface-2 text-ink shadow-soft-lg animate-fade-up"
              >
                <WaveDivider tone="ink" unit={14} height={10} className="opacity-25" />
                <div className="px-lg pt-sm pb-lg flex flex-col gap-sm">
                  <div className="flex items-baseline justify-between gap-sm flex-wrap">
                    <span className="font-serif text-card-title text-primary-hover">{t('home.letters.letterNo')}</span>
                    <span className="font-sans text-caption text-ink-muted">{dateline}</span>
                  </div>
                  <p className="font-serif italic rtl:not-italic text-body text-ink leading-relaxed">
                    {welcomeStart}
                    <bdi dir="ltr" className="font-sans text-body-sm">{email}</bdi>
                    {welcomeEnd}
                  </p>
                  <div className="flex items-center gap-sm flex-wrap">
                    <StatusBadge variant="gold" className="border-dashed">
                      {t('home.letters.giftLabel')} ·{' '}
                      <span dir="ltr" className="font-sans tabular-nums select-all">{t('home.letters.code')}</span>
                    </StatusBadge>
                    <button type="button" onClick={copyCode} className="link-gold text-caption inline-flex items-center gap-xs">
                      {copied ? <Check size={13} className="animate-scale-in" /> : <Copy size={13} />}
                      {t(copied ? 'home.letters.copied' : 'home.letters.copy')}
                    </button>
                  </div>
                  <p className="font-serif italic rtl:not-italic text-body-sm text-ink-muted self-end">{t('home.letters.signature')}</p>
                </div>
              </div>
            )}

            {/* hint + reassurance, at the exact moment of hesitation */}
            <p
              className={cn(
                'mt-xl text-center font-sans text-caption uppercase tracking-[0.15em] text-ink-on-dark-muted transition-opacity duration-300',
                stage !== 'idle' && 'opacity-0',
              )}
              aria-hidden={stage !== 'idle'}
            >
              {t('home.letters.sealHint')}
            </p>
            <p
              className={cn(
                'mt-xs text-center font-sans text-caption text-ink-on-dark-muted/80 transition-opacity duration-300',
                stage !== 'idle' && 'opacity-0',
              )}
              aria-hidden={stage !== 'idle'}
            >
              {t('home.letters.promise')}
            </p>
            <div aria-live="polite" className="sr-only">
              {stage === 'sent' ? t('home.letters.successAria') : ''}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
