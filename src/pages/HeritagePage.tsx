import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useLocale, toArabicDigits } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { PatternBand, type Motif } from '@/components/brand/PatternBand'
import { flavorBarPhoto } from '@/components/brand/ProductArt'
import { useCatalogue } from '@/state/CatalogueContext'
import type { ArtCard, Bilingual, Product } from '@/data/types'
import { cn } from '@/lib/cn'

/*
 * قصة جاز — the story in three chapters, «بشكل مختصر», as the client signed it off:
 * the selection, the Swiss hand, and the return to Jazan. The chapters' copy lives in
 * the dictionary under 'heritage.*', so a content edit is a one-line change.
 *
 * Chapter three's body is the commissioned wrapper paintings, read live off the
 * catalogue: grouped by painting, numbered, credited, editioned and counted from the
 * data itself. No artist name, artwork title or count is ever written into this file —
 * a new painted bar in products.ts joins the index on its own.
 */

/** A bar that can actually be hung: it has a painting, and a photo of it. */
interface HangableWork {
  product: Product
  art: ArtCard
  photo: string
}
function hangable(product: Product): HangableWork | undefined {
  const photo = flavorBarPhoto[product.flavorId]
  if (!product.artCard || !photo) return undefined
  return { product, art: product.artCard, photo }
}

/** One painting, and every bar the catalogue prints it on. */
interface WorkGroup {
  title: Bilingual
  artist: Bilingual
  description: Bilingual
  photo: string
  bars: Product[]
}

const arDigits = (s: string | number) => toArabicDigits(String(s))
/** Two-digit plate/chapter numeral — «٠١» in Arabic, "01" in English. */
const numeral2 = (n: number, isRTL: boolean) => {
  const s = String(n).padStart(2, '0')
  return isRTL ? arDigits(s) : s
}

/**
 * Every count on this page is read off the catalogue, so the counted nouns have to
 * inflect. Arabic needs four cases — singular, dual, the 3–10 plural, and the 11+
 * accusative singular (تمييز) — and each noun carries its own forms.
 */
interface CountedNoun {
  one: string
  two: string
  few: string
  many: string
  en: [string, string]
}
const BAR: CountedNoun = { one: 'لوحٌ واحد', two: 'لوحان', few: 'ألواح', many: 'لوحًا', en: ['bar', 'bars'] }
const PAINTING: CountedNoun = { one: 'لوحة واحدة', two: 'لوحتان', few: 'لوحات', many: 'لوحةً', en: ['painting', 'paintings'] }
const ARTIST: CountedNoun = { one: 'فنانة واحدة', two: 'فنانتان', few: 'فنانات', many: 'فنانةً', en: ['artist', 'artists'] }

function countPhrase(n: number, noun: CountedNoun, isRTL: boolean): string {
  if (!isRTL) return `${n} ${noun.en[n === 1 ? 0 : 1]}`
  if (n === 1) return noun.one
  if (n === 2) return noun.two
  return `${arDigits(n)} ${n <= 10 ? noun.few : noun.many}`
}

/** «طبعة من ثلاث» — a painting printed across more than one bar. */
const editionWord: Record<number, string> = { 2: 'اثنتين', 3: 'ثلاث', 4: 'أربع', 5: 'خمس' }
const editionLabel = (n: number) => ({
  en: `Edition of ${n}`,
  ar: `طبعة من ${editionWord[n] ?? arDigits(n)} نسخ`,
})

export function HeritagePage() {
  const { products } = useCatalogue()
  const { t, pick, isRTL } = useLocale()
  // Arabic script has no italic; a browser-synthesized oblique reads as broken type.
  const italicLatin = isRTL ? '' : 'italic'

  // The hang order is the catalogue's own order — nothing is listed by hand here.
  const works = products.map(hangable).filter((w): w is HangableWork => !!w)
  // Grouped so one painting printed on several bars reads as one entry — an edition —
  // rather than a repeated row. Keyed by title *and* artist *and* description, because
  // the catalogue holds three different paintings that share the title «حين تزهر الحقول»:
  // matching on the title alone would merge them and quietly delete two commissions.
  const workGroups = works.reduce<WorkGroup[]>((groups, { product, art, photo }) => {
    const g = groups.find(
      (x) => x.title.en === art.artworkTitle.en && x.artist.en === art.artistName.en && x.description.en === art.description.en,
    )
    if (g) g.bars.push(product)
    else groups.push({ title: art.artworkTitle, artist: art.artistName, description: art.description, photo, bars: [product] })
    return groups
  }, [])
  const artistNames = [...new Set(works.map((w) => w.art.artistName.en))]
  const worksCount = (artistEn: string) => workGroups.filter((g) => g.artist.en === artistEn).length
  // The painting hung large beside chapter three is chosen by a rule — the one the
  // catalogue prints on the most bars — never by name. Numbering stays catalogue-order,
  // so the lead keeps its own plate number and the grid runs around it.
  const lead = workGroups.reduce<WorkGroup | undefined>(
    (best, g) => (best && best.bars.length >= g.bars.length ? best : g),
    undefined,
  )
  // The lead hangs beside the chapter as an image, unnumbered, so the index below it can
  // run 01..N with no hole where the lead's own catalogue number would have been.
  const rest = workGroups.filter((g) => g !== lead)
  // The closing line counts itself from the catalogue rather than asserting a number.
  const tally = [
    countPhrase(works.length, BAR, isRTL),
    countPhrase(workGroups.length, PAINTING, isRTL),
    countPhrase(artistNames.length, ARTIST, isRTL),
  ]

  return (
    <>
      {/* ── Masthead ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-canvas-dark text-ink-on-dark">
        <div className="absolute inset-x-0 top-0 opacity-[0.5]">
          <PatternBand motif="jasmine" height={140} opacity={0.14} tone="on-dark" />
        </div>
        <div className="container-jaz relative pt-xl pb-xxl lg:pt-xxl lg:pb-section">
          <Reveal>
            <div className="flex items-baseline justify-between gap-md border-b border-ink-on-dark/15 pb-sm font-sans text-caption uppercase tracking-[0.14em] text-ink-on-dark-muted">
              <span>{pick({ en: 'Jazan · 16.89° N, 42.55° E', ar: 'جازان · ١٦٫٨٩° شمالًا، ٤٢٫٥٥° شرقًا' })}</span>
              <span className="text-primary-bright">{t('heritage.hero.eyebrow')}</span>
            </div>
          </Reveal>
          <div className="mt-xl max-w-3xl flex flex-col gap-lg">
            <Reveal delay={80}>
              <h1 className="font-serif text-[clamp(2.8rem,8vw,5rem)] leading-[1.04] whitespace-pre-line text-balance">
                {t('heritage.hero.title')}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className={cn('font-serif text-subhead text-ink-on-dark-muted max-w-prose', italicLatin)}>{t('heritage.hero.lede')}</p>
            </Reveal>
          </div>
        </div>
        <WaveDivider tone="gold" height={20} />
      </section>

      {/* ── 01 — الانتقاء أولًا ───────────────────────────────── */}
      <section className="container-jaz py-xxl lg:py-section">
        <div className="grid gap-xl lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <ChapterText n={1} title={t('heritage.ch1.title')} lede={t('heritage.ch1.lede')} body={t('heritage.ch1.body')} />
          </div>
          <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
            <ChapterFigure
              src="/story/selection.jpg"
              alt={t('heritage.ch1.imageAlt')}
              plate={<ChapterPlate motif="coffee" eyebrow={t('heritage.ch1.plateEyebrow')} title={t('heritage.ch1.title')} />}
            />
          </Reveal>
        </div>
      </section>

      {/* ── 02 — الحرفية السويسرية ────────────────────────────── */}
      <section className="bg-surface-2 border-y border-hairline">
        <div className="container-jaz py-xxl lg:py-section">
          <div className="grid gap-xl lg:grid-cols-12 lg:items-center">
            <Reveal delay={120} className="lg:col-span-5">
              <ChapterFigure
                src="/story/george.jpg"
                alt={t('heritage.ch2.portraitAlt')}
                plate={
                  <ChapterPlate
                    motif="mountain"
                    eyebrow={t('heritage.ch2.plateRole')}
                    title={t('heritage.ch2.plateName')}
                    note={t('heritage.ch2.plateNote')}
                  />
                }
              />
            </Reveal>
            <div className="lg:col-span-6 lg:col-start-7">
              <ChapterText n={2} title={t('heritage.ch2.title')} lede={t('heritage.ch2.lede')} body={t('heritage.ch2.body')} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 — روح جازان ───────────────────────────────────── */}
      <section className="container-jaz py-xxl lg:py-section">
        <div className="grid gap-xl lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <ChapterText n={3} title={t('heritage.ch3.title')} lede={t('heritage.ch3.lede')} body={t('heritage.ch3.body')} />
          </div>
          {lead && (
            <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
              <ArtFigure work={lead} />
            </Reveal>
          )}
        </div>

        {/* the index of works — «اللوحات بأيدي الفنانين», generated from the catalogue */}
        {rest.length > 0 && (
          <div id="paintings" className="mt-xxl scroll-mt-lg">
            <Reveal>
              <h3 className="font-serif text-headline text-ink border-t border-hairline pt-lg">{t('heritage.ch3.galleryTitle')}</h3>
            </Reveal>
            <ol className="mt-xl grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
              {rest.map((g, i) => (
                <Reveal key={`${g.title.en}|${g.artist.en}`} delay={Math.min(i * 60, 300)} as="li">
                  <ArtFigure work={g} n={i + 1} />
                </Reveal>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* ── The colophon ──────────────────────────────────────── */}
      <section className="bg-canvas-dark text-ink-on-dark">
        <WaveDivider tone="gold" height={20} flip />
        <div className="container-jaz py-xxl lg:py-section flex flex-col gap-xxl">
          {/* contributors, counted from the same data the index is built from */}
          <Reveal>
            <div className="flex flex-wrap items-baseline gap-x-xl gap-y-sm border-t border-b border-hairline-dark py-lg">
              <span className="font-sans text-caption uppercase tracking-[0.14em] text-ink-on-dark-muted">
                {pick({ en: 'Contributors', ar: 'شاركت في هذا الإصدار' })}
              </span>
              {artistNames.map((en) => {
                const artist = workGroups.find((g) => g.artist.en === en)?.artist
                if (!artist) return null
                return (
                  <span key={en} className="font-serif text-body text-ink-on-dark">
                    {pick(artist)}{' '}
                    <span className="font-sans text-data text-ink-on-dark-muted">— {countPhrase(worksCount(en), PAINTING, isRTL)}</span>
                  </span>
                )
              })}
            </div>
          </Reveal>

          <div className="flex flex-col items-center gap-lg text-center">
            <Reveal>
              <p className="font-serif text-display-md text-ink-on-dark text-balance max-w-2xl">
                {pick({
                  en: `${tally.join(', ')} — one region.`,
                  ar: `${tally.join('، و')} — ومنطقةٌ واحدة.`,
                })}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <Link to="/shop" className={buttonClass('primary', 'md')}>
                {pick({ en: 'Collect the bars', ar: 'اقتنِ الألواح' })}
                <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </Reveal>
            <Reveal delay={180}>
              <p className="font-sans text-caption uppercase tracking-[0.14em] text-ink-on-dark-muted">
                {pick({ en: 'Set down and completed at Abu Arish, Jazan', ar: 'تمّت بعون الله في أبي عريش، جازان' })}
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}

/* ── Page-local set pieces ───────────────────────────────────── */

/**
 * The chapter opener from the client's reference: a small gold «— ٠١», then the
 * serif headline. The dash and the numeral are both direction-neutral, so RTL
 * mirrors the pair without help.
 */
function ChapterHead({ n, title }: { n: number; title: string }) {
  const { isRTL } = useLocale()
  return (
    <Reveal>
      <header className="flex flex-col gap-md">
        <span className="font-sans text-data uppercase tracking-[0.18em] text-primary-hover tabular-nums">— {numeral2(n, isRTL)}</span>
        <h2 className="font-serif text-display-md lg:text-display-lg text-ink text-balance">{title}</h2>
      </header>
    </Reveal>
  )
}

/** Head, then the lede in bold, then one short paragraph — the reference layout. */
function ChapterText({ n, title, lede, body }: { n: number; title: string; lede: string; body: string }) {
  return (
    <div className="flex flex-col gap-lg">
      <ChapterHead n={n} title={title} />
      <Reveal delay={80}>
        <p className="font-serif text-body-lg font-medium text-ink max-w-prose">{lede}</p>
      </Reveal>
      <Reveal delay={140}>
        <p className="text-body text-ink-muted max-w-prose">{body}</p>
      </Reveal>
    </div>
  )
}

/**
 * A chapter's image, over the plate that stands in for it.
 *
 * Both story photographs are still owed by the client, so the plate is what renders
 * today — and it is a designed object, not a hole. The photo sits on top at opacity 0
 * and fades in only once the browser has actually decoded it, so a missing file shows
 * the plate and nothing else, and a present one arrives without a flash of placeholder.
 */
function ChapterFigure({ src, alt, plate }: { src: string; alt: string; plate: ReactNode }) {
  const [state, setState] = useState<'pending' | 'loaded' | 'missing'>('pending')
  return (
    <div className="relative">
      {plate}
      {state !== 'missing' && (
        <img
          src={src}
          alt={state === 'loaded' ? alt : ''}
          loading="lazy"
          onLoad={() => setState('loaded')}
          onError={() => setState('missing')}
          className={cn(
            'absolute inset-0 block w-full h-full rounded-lg object-cover shadow-soft-lg transition-opacity duration-500',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  )
}

/**
 * The stand-in for a chapter photograph: the chapter's own words set on the house's
 * dark ground, at exactly the 4:5 the photo will occupy, so the swap costs no reflow.
 */
function ChapterPlate({ motif, eyebrow, title, note }: { motif: Motif; eyebrow: string; title: string; note?: string }) {
  const { isRTL } = useLocale()
  return (
    <div className="relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg bg-canvas-dark p-xl text-ink-on-dark shadow-soft-lg">
      <div className="absolute inset-x-0 top-0 -z-10 opacity-60">
        <PatternBand motif={motif} height={180} opacity={0.14} tone="on-dark" />
      </div>
      <span className="font-sans text-caption uppercase tracking-[0.14em] text-primary-bright">{eyebrow}</span>
      <span className={cn('mt-xs font-serif text-display-md text-ink-on-dark', isRTL ? '' : 'italic')}>{title}</span>
      {note && <span className="mt-md font-sans text-caption text-ink-on-dark-muted/70">{note}</span>}
    </div>
  )
}

/**
 * A commissioned wrapper painting, hung: white mat, warm shadow, and a museum wall
 * label typeset straight from the catalogue — plate number, title, painter, the
 * edition if the catalogue prints it on more than one bar, and which bars those are.
 */
function ArtFigure({ work, n }: { work: WorkGroup; n?: number }) {
  const { pick, isRTL } = useLocale()
  return (
    <figure className="flex h-full flex-col gap-md">
      <div className="bg-surface-1 border border-hairline p-sm sm:p-md shadow-soft-lg">
        {/* One aspect for every plate: the source photos are a mix of 1:1 and 5:4, and a
            museum wall aligns its labels. */}
        <img
          src={work.photo}
          alt={`${pick(work.title)} — ${pick(work.artist)}`}
          loading="lazy"
          className="block w-full aspect-square object-cover border border-hairline"
        />
      </div>
      <figcaption className="flex flex-col gap-xxs px-xxs">
        {n !== undefined && <span className="font-sans text-data text-primary-hover tabular-nums">{numeral2(n, isRTL)}</span>}
        <span className="font-serif text-card-title leading-snug text-ink">{pick(work.title)}</span>
        <span className="font-sans text-data text-ink-muted">{pick(work.artist)}</span>
        {work.bars.length > 1 && (
          <span className="font-sans text-caption uppercase tracking-[0.12em] text-primary-hover">{pick(editionLabel(work.bars.length))}</span>
        )}
        <span className="font-sans text-caption text-ink-subtle">
          {pick({ en: 'on', ar: 'على' })} {work.bars.map((b) => pick(b.title)).join(' · ')}
        </span>
      </figcaption>
    </figure>
  )
}
