import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Snowflake, FileCheck2, Gift, Sparkles } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { products } from '@/data/products'
import { collections } from '@/data/collections'
import { flavorList } from '@/data/flavors'
import { buttonClass } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Reveal } from '@/components/ui/Reveal'
import { ProductCard } from '@/components/ui/ProductCard'
import { Eyebrow, QuoteGlyph } from '@/components/ui/Misc'
import { ProductArt } from '@/components/brand/ProductArt'
import { JazanScene } from '@/components/brand/JazanScene'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { PatternBand, MotifGlyph } from '@/components/brand/PatternBand'
import { cn, tint } from '@/lib/cn'

export function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <FlavorsSection />
      <CollectionsSection />
      <HeritageSection />
      <CorporateBand />
      <NewsletterSection />
    </>
  )
}

/* ─────────────────────────── Hero ─────────────────────────── */
function Hero() {
  const { t, locale } = useLocale()
  const title = t('home.hero.title')
  return (
    <section className="relative overflow-hidden bg-canvas-dark text-ink-on-dark">
      {/* atmosphere */}
      <div className="absolute inset-0 opacity-[0.5]">
        <JazanScene tone="dark" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-canvas-dark/30 via-transparent to-canvas-dark" />

      <div className="container-jaz relative grid lg:grid-cols-[1.1fr_0.9fr] gap-xl items-center pt-xxl pb-xl lg:py-section">
        {/* copy */}
        <div className="flex flex-col gap-lg max-w-2xl">
          <Reveal>
            <Eyebrow tone="on-dark">{t('home.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className={cn(
                'font-serif text-ink-on-dark whitespace-pre-line text-balance',
                'text-[clamp(2.6rem,7vw,4.6rem)] leading-[1.05]',
                locale === 'en' && 'tracking-[-0.02em]',
              )}
            >
              {title}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-body-lg text-ink-on-dark-muted max-w-prose">{t('home.hero.body')}</p>
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap items-center gap-sm pt-xs">
            <Link to="/shop" className={buttonClass('primary')}>
              {t('cta.shop')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
            <Link
              to="/collections"
              className="btn bg-transparent text-ink-on-dark border border-hairline-dark hover:border-primary/60 hover:text-primary-bright"
            >
              {t('nav.collections')}
            </Link>
          </Reveal>
        </div>

        {/* hero art composition */}
        <Reveal delay={200} className="relative hidden lg:block">
          <HeroBars />
        </Reveal>
      </div>

      <WaveDivider tone="gold" height={22} />
    </section>
  )
}

function HeroBars() {
  return (
    <div className="relative aspect-square max-w-[440px] mx-auto">
      {/* glow */}
      <div className="absolute inset-8 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(176,138,87,0.28), transparent 65%)' }} />
      {/* back bar */}
      <div className="absolute top-0 w-[64%] aspect-[5/6] rounded-xl overflow-hidden shadow-soft-lg rotate-[-7deg]" style={{ insetInlineEnd: 0 }}>
        <ProductArt flavorId="rose" />
      </div>
      {/* front bar */}
      <div className="absolute bottom-0 w-[66%] aspect-[5/6] rounded-xl overflow-hidden shadow-soft-lg rotate-[5deg]" style={{ insetInlineStart: 0 }}>
        <ProductArt flavorId="milk" />
      </div>
      {/* floating chip */}
      <div className="absolute bottom-6 bg-surface-1 text-ink rounded-pill ps-2 pe-4 py-2 shadow-soft flex items-center gap-xs" style={{ insetInlineEnd: 8 }}>
        <span className="grid place-items-center w-7 h-7 rounded-pill bg-primary text-on-primary">
          <Sparkles size={14} />
        </span>
        <span className="font-sans text-caption uppercase tracking-[0.1em]">Jazan-grown</span>
      </div>
    </div>
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

/* ─────────────────────────── Flavors ─────────────────────────── */
function FlavorsSection() {
  const { t, pick } = useLocale()
  const featured = products.filter((p) => ['p-milk', 'p-rose', 'p-coffee', 'p-mango'].includes(p.id))
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
            className="group flex items-center gap-xs rounded-pill border border-hairline bg-surface-1 ps-2 pe-4 py-2 hover:border-hairline-strong transition-colors"
          >
            <span className="w-7 h-7 rounded-pill grid place-items-center" style={{ backgroundColor: tint(f.accent, 26) }}>
              <span className="w-3 h-3 rounded-pill" style={{ backgroundColor: f.accent }} />
            </span>
            <span className="font-sans text-data text-ink group-hover:text-primary-hover transition-colors">{pick(f.name)}</span>
          </Link>
        ))}
      </Reveal>

      <div className="mt-xl grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((p, i) => (
          <Reveal key={p.id} delay={i * 70}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={120} className="mt-xl flex justify-center">
        <Link to="/shop" className={buttonClass('secondary')}>
          {t('cta.viewAll')}
          <ArrowRight size={16} className="rtl:rotate-180" />
        </Link>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── Collections ─────────────────────────── */
function CollectionsSection() {
  const { t, pick, money } = useLocale()
  const [feature, ...rest] = collections
  return (
    <section className="bg-surface-2 border-y border-hairline">
      <PatternBand motif="wave" height={64} opacity={0.12} />
      <div className="container-jaz py-section">
        <Reveal>
          <SectionHeader number="02" eyebrow={t('home.collections.eyebrow')} label="Gifting" title={t('home.collections.title')} />
        </Reveal>

        <div className="mt-xl grid gap-lg lg:grid-cols-2">
          {/* feature collection */}
          <Reveal>
            <Link
              to="/collections"
              className="group relative block rounded-xl overflow-hidden h-full min-h-[420px] shadow-lift card-hover"
              style={{ backgroundColor: feature.accent }}
            >
              <div className="absolute inset-0 opacity-90">
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
                  <div className="w-32 shrink-0 relative" style={{ backgroundColor: tint(c.accent, 16) }}>
                    <ProductArt flavorId={c.id === 'c-harvest-ribbon' ? 'mango' : c.id === 'c-corporate-crescent' ? 'coffee' : 'milk'} kind="box" />
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
              <div className="w-[42%] aspect-[5/6] rounded-lg overflow-hidden shadow-soft-lg rotate-[-4deg]">
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
            <SectionHeader number="03" eyebrow={t('home.story.eyebrow')} title={t('home.story.title')} />
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

/* ─────────────────────────── Corporate band ─────────────────────────── */
function CorporateBand() {
  const { t } = useLocale()
  const features = [
    { icon: FileCheck2, key: 'corp.feature.invoicing' },
    { icon: Gift, key: 'corp.feature.gifting' },
    { icon: Snowflake, key: 'badge.coldChain' },
  ]
  return (
    <section className="bg-canvas-dark text-ink-on-dark">
      <WaveDivider tone="gold" height={20} flip />
      <div className="container-jaz py-section grid lg:grid-cols-2 gap-xl items-center">
        <div className="flex flex-col gap-lg">
          <Reveal>
            <SectionHeader number="04" eyebrow={t('home.corporate.eyebrow')} title={t('home.corporate.title')} tone="on-dark" />
          </Reveal>
          <Reveal delay={80}>
            <p className="text-body-lg text-ink-on-dark-muted max-w-prose">{t('home.corporate.body')}</p>
          </Reveal>
          <Reveal delay={140} className="flex flex-wrap gap-sm">
            <Link to="/corporate" className={buttonClass('primary')}>
              {t('home.corporate.cta')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
            <Link to="/business" className="btn bg-transparent text-ink-on-dark border border-hairline-dark hover:border-primary/60 hover:text-primary-bright">
              {t('nav.business')}
            </Link>
          </Reveal>
        </div>

        <Reveal delay={120} className="grid sm:grid-cols-2 gap-md">
          {/* credit highlight card */}
          <div className="sm:col-span-2 rounded-xl border border-hairline-dark bg-surface-dark-1 p-xl flex flex-col gap-sm">
            <span className="eyebrow text-primary-bright">{t('corp.feature.credit.title')}</span>
            <p className="font-serif text-headline text-ink-on-dark">{t('corp.feature.credit.body')}</p>
          </div>
          {features.map((f) => (
            <div key={f.key} className="rounded-lg border border-hairline-dark bg-surface-dark-1/60 p-lg flex flex-col gap-xs">
              <span className="grid place-items-center w-10 h-10 rounded-pill bg-primary/15 text-primary-bright">
                <f.icon size={18} />
              </span>
              <span className="font-serif text-card-title text-ink-on-dark mt-xs">{t(`${f.key}.title`)}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────────────────── Newsletter ─────────────────────────── */
function NewsletterSection() {
  const { t } = useLocale()
  return (
    <section className="container-jaz pt-section">
      <Reveal>
        <div className="relative rounded-xxl overflow-hidden bg-surface-1 border border-hairline px-lg py-xxl sm:px-xxl text-center">
          <div className="absolute inset-x-0 top-0">
            <PatternBand motif="jasmine" height={72} opacity={0.1} />
          </div>
          <div className="relative max-w-xl mx-auto flex flex-col items-center gap-md">
            <MotifGlyph motif="jasmine" size={32} />
            <h2 className="font-serif text-display-md text-ink text-balance">{t('home.newsletter.title')}</h2>
            <p className="text-body text-ink-muted">{t('home.newsletter.body')}</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-sm w-full flex flex-col sm:flex-row gap-sm max-w-md mx-auto"
            >
              <input
                type="email"
                required
                placeholder={t('home.newsletter.placeholder')}
                className="input flex-1 text-center sm:text-start"
                aria-label={t('home.newsletter.placeholder')}
              />
              <button type="submit" className={buttonClass('primary')}>
                {t('home.newsletter.cta')}
              </button>
            </form>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
