import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useLocale, toArabicDigits } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { MotifGlyph, type Motif } from '@/components/brand/PatternBand'
import { flavorBarPhoto } from '@/components/brand/ProductArt'
import { products } from '@/data/products'
import { flavors } from '@/data/flavors'
import type { ArtCard, Product } from '@/data/types'
import { cn } from '@/lib/cn'

/*
 * قصة جاز — the descent. The page walks Jazan's real topography: it opens on the
 * Fayfa terraces (~1,800 m) and drops chapter by chapter to the salt flats at sea
 * level, then hands the gauge from metres to the cold chain's 18°. The commissioned
 * wrapper paintings hang at the altitude they depict, each with a museum wall label
 * typeset from the live artCard data — never hardcoded, so the artists' names and
 * counts can't drift from the catalogue.
 */

/** Descent order — the order works are hung and indexed in. */
const descentOrder = [
  'khawlani-coffee',
  'signature-milk',
  'dark-60',
  'chili-dark',
  'jazani-mango',
  'sun-papaya',
  'banana-dark',
  'jazan-jasmine',
  'damascena-rose',
  'lavender-milk',
  'sea-salt-dark',
  'single-origin-dark',
]

const bySlug = (slug: string): Product | undefined => products.find((p) => p.slug === slug)

/** A bar that can actually be hung: it exists, has a painting, and has a photo of it. */
interface HangableWork {
  product: Product
  art: ArtCard
  photo: string
}
function hangable(slug: string): HangableWork | undefined {
  const product = bySlug(slug)
  const photo = product && flavorBarPhoto[product.flavorId]
  if (!product?.artCard || !photo) return undefined
  return { product, art: product.artCard, photo }
}

const arDigits = (s: string | number) => toArabicDigits(String(s))

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
  ar: `طبعة من ${editionWord[n] ?? arDigits(n)}`,
})

const stations: { id: string; elevation: { en: string; ar: string }; name: { en: string; ar: string }; motif: Motif }[] = [
  { id: 'alt-1800', elevation: { en: '1,800', ar: '١٨٠٠' }, name: { en: 'The terraces', ar: 'المدرّجات' }, motif: 'mountain' },
  { id: 'alt-1100', elevation: { en: '1,100', ar: '١١٠٠' }, name: { en: 'The slopes', ar: 'السفوح' }, motif: 'coffee' },
  { id: 'alt-400', elevation: { en: '400', ar: '٤٠٠' }, name: { en: 'The orchards', ar: 'البساتين' }, motif: 'mango' },
  { id: 'alt-50', elevation: { en: '50', ar: '٥٠' }, name: { en: 'The jasmine plain', ar: 'سهل الفُل' }, motif: 'jasmine' },
  { id: 'alt-0', elevation: { en: '0', ar: '٠' }, name: { en: 'The salt flats', ar: 'الملّاحات' }, motif: 'wave' },
]

export function HeritagePage() {
  const { t, pick, isRTL } = useLocale()
  // Arabic script has no italic; a browser-synthesized oblique reads as broken type.
  const italicLatin = isRTL ? '' : 'italic'

  const works = descentOrder.map(hangable).filter((w): w is HangableWork => !!w)
  // Index of works, grouped so the shared «حين تزهر الحقول» reads as one entry — an
  // edition of three — instead of a repeated row. Keyed by title *and* artist, so two
  // painters who happen to share a title are never merged into one attribution.
  const workGroups = works.reduce<{ title: { en: string; ar: string }; artist: { en: string; ar: string }; bars: Product[] }[]>(
    (groups, { product, art }) => {
      const g = groups.find((x) => x.title.en === art.artworkTitle.en && x.artist.en === art.artistName.en)
      if (g) g.bars.push(product)
      else groups.push({ title: art.artworkTitle, artist: art.artistName, bars: [product] })
      return groups
    },
    [],
  )
  const artistNames = [...new Set(works.map((w) => w.art.artistName.en))]
  const worksCount = (artistEn: string) => workGroups.filter((g) => g.artist.en === artistEn).length
  const jasmineEdition = workGroups.find((g) => g.bars.some((b) => b.slug === 'jazan-jasmine'))
  // The closing line counts itself from the catalogue rather than asserting a number.
  const tally = [
    countPhrase(works.length, BAR, isRTL),
    countPhrase(workGroups.length, PAINTING, isRTL),
    countPhrase(artistNames.length, ARTIST, isRTL),
  ]

  return (
    <>
      {/* ── The summit — ~1,800 m ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-canvas-dark text-ink-on-dark">
        <SummitContours className="absolute inset-0 opacity-60" />
        <div className="container-jaz relative pt-xl pb-xxl lg:pt-xxl lg:pb-section">
          {/* dateline rule */}
          <Reveal>
            <div className="flex items-baseline justify-between gap-md border-b border-ink-on-dark/15 pb-sm font-sans text-caption uppercase tracking-[0.14em] text-ink-on-dark-muted">
              <span>{pick({ en: 'Jazan · 16.89° N, 42.55° E', ar: 'جازان · ١٦٫٨٩° شمالًا، ٤٢٫٥٥° شرقًا' })}</span>
              <span className="text-primary-bright">{t('heritage.hero.eyebrow')}</span>
            </div>
          </Reveal>
          <div className="mt-xl grid gap-xl lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8 flex flex-col gap-lg">
              <Reveal delay={80}>
                <h1 className="font-serif text-[clamp(2.8rem,8vw,5rem)] leading-[1.04] whitespace-pre-line text-balance">
                  {t('heritage.hero.title')}
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className={cn('font-serif text-subhead text-ink-on-dark-muted max-w-prose', italicLatin)}>
                  {pick({
                    en: 'In Arabic, to descend from a place is also to be descended from it. This page does both: it drops one thousand eight hundred metres, from the coffee terraces of Fayfa to the salt flats of the Red Sea — without ever leaving Jazan.',
                    ar: '«ينحدر من» تعني أن تهبط من علوّ، وتعني أيضًا أن تكون من سلالة مكان. هذه الصفحة تفعل الاثنين: تهبط ألفًا وثمانمئة متر، من مدرّجات البن في فيفاء إلى ملّاحات البحر الأحمر — دون أن تغادر جازان أبدًا.',
                  })}
                </p>
              </Reveal>
              <Reveal delay={240}>
                <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-on-dark-muted">
                  {pick({ en: 'Paintings by', ar: 'اللوحات بريشة' })}{' '}
                  <span className="text-primary-bright">
                    {pick({ en: 'Afnan Ali · Wajd Jandali · Rehab Zakri', ar: 'أفنان علي · وجد جندلي · رحاب زكري' })}
                  </span>
                </p>
              </Reveal>
            </div>
            {/* the gauge — stations of the descent */}
            <Reveal delay={300} className="lg:col-span-3 lg:col-start-10">
              <nav aria-label={pick({ en: 'Stations of the descent', ar: 'محطات النزول' })} className="flex flex-col">
                <span className="font-sans text-caption uppercase tracking-[0.14em] text-ink-on-dark-muted pb-xs">
                  {pick({ en: 'Metres above the sea', ar: 'مترًا فوق سطح البحر' })}
                </span>
                {stations.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="group flex items-baseline gap-md border-t border-ink-on-dark/10 py-sm transition-colors hover:border-primary/50"
                  >
                    <span className="w-14 shrink-0 font-serif text-subhead leading-none text-primary-bright tabular-nums">
                      {pick(s.elevation)}
                    </span>
                    <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-on-dark-muted transition-colors group-hover:text-ink-on-dark">
                      {pick(s.name)}
                    </span>
                    <MotifGlyph motif={s.motif} size={15} className="ms-auto self-center opacity-50" />
                  </a>
                ))}
              </nav>
            </Reveal>
          </div>
        </div>
        <WaveDivider tone="gold" height={20} />
      </section>

      {/* ── ~1,800 m — the terraces ───────────────────────────── */}
      <section id="alt-1800" className="container-jaz py-xxl lg:py-section scroll-mt-lg">
        <div className="grid gap-xl lg:grid-cols-12">
          <div className="lg:col-span-6 flex flex-col gap-lg">
            <ElevationMark
              elevation={{ en: '1,800', ar: '١٨٠٠' }}
              unit={{ en: 'm above the sea', ar: 'م فوق سطح البحر' }}
              motif="mountain"
              title={{ en: 'The terraces', ar: 'المدرّجات' }}
            />
            <Reveal delay={80}>
              <p className="text-body-lg text-ink-muted max-w-prose">
                {/* Arabic connects, so the opening flourish is a whole word, not a
                    single letter — and it is read aloud with the sentence it starts. */}
                <span className="float-start me-sm mt-[0.06em] font-serif text-[2.6em] leading-[0.85] text-primary-hover">
                  {pick({ en: 'In', ar: 'في' })}
                </span>
                {pick({
                  en: ' the highlands, everything begins before the sun. Coffee terraces wind around the mountains of Fayfa like rings on the mountain’s fingers, and for six centuries Khawlani coffee has been handed down here the way names are handed down. Our first flavor comes down from these terraces.',
                  ar: ' المرتفعات يبدأ كل شيء قبل الشمس. تلتفّ مدرّجات البن حول جبال فيفاء كخواتم في أصابع الجبل، وستة قرون والبن الخولاني يُورَّث هنا كما تُورَّث الأسماء. من هذه المدرّجات تنزل أولى نكهاتنا.',
                })}
              </p>
            </Reveal>
            {/* marginalia — facts in the functional voice, then the founders in the serif one */}
            <Reveal delay={140}>
              <dl className="flex flex-col border-t border-hairline max-w-prose">
                {[
                  { k: { en: 'Khawlani coffee', ar: 'البن الخولاني' }, v: { en: 'picked in winter', ar: 'يُقطف شتاءً' } },
                  { k: { en: 'The terraces', ar: 'المدرّجات' }, v: { en: 'six centuries, father to son', ar: 'ستة قرون، أبًا عن جد' } },
                ].map((f, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-md border-b border-hairline py-sm font-sans text-data">
                    <dt className="uppercase tracking-[0.1em] text-ink-subtle">{pick(f.k)}</dt>
                    <dd className="text-ink-muted">{pick(f.v)}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={200}>
              <blockquote className={cn('border-s-2 border-primary/50 ps-md font-serif text-subhead text-ink max-w-prose', italicLatin)}>
                {pick({ en: 'A bar should taste of somewhere.', ar: 'ينبغي للوح الشوكولاتة أن يحمل طعم مكان.' })}
                <footer className="mt-xs font-sans not-italic text-caption uppercase tracking-[0.12em] text-ink-subtle">
                  {pick({ en: 'The JAZ founders', ar: 'مؤسّسو جاز' })}
                </footer>
              </blockquote>
            </Reveal>
          </div>
          <Reveal delay={120} className="lg:col-span-5 lg:col-start-8 lg:-mt-xl">
            <ArtFigure slug="khawlani-coffee" />
          </Reveal>
        </div>
      </section>

      {/* ── ~1,100 m — the slopes ─────────────────────────────── */}
      <section id="alt-1100" className="bg-grain">
        <div className="container-jaz py-xxl lg:py-section scroll-mt-lg">
          <div className="grid gap-xl lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ElevationMark
                elevation={{ en: '1,100', ar: '١١٠٠' }}
                unit={{ en: 'm above the sea', ar: 'م فوق سطح البحر' }}
                motif="coffee"
                title={{ en: 'The slopes', ar: 'السفوح' }}
              />
              <Reveal delay={80}>
                <p className="mt-lg text-body-lg text-ink-muted max-w-prose">
                  {pick({
                    en: 'Below the terraces begin the villages, where the details are kept: a Meel ornament worn on feast days, a stone mill turning in the afternoon, flocks coming home before dusk. Wajd and Afnan painted these details the way they are told at home — not the way they are displayed.',
                    ar: 'تحت المدرّجات تبدأ القرى، وفيها تُحفَظ التفاصيل: ميلٌ يُلبَس في العيد، ومطحنة حجرية تدور في العصر، وقطعان تعود قبل المغيب. رسمت وجد وأفنان هذه التفاصيل كما تُروى في البيوت — لا كما تُعرَض.',
                  })}
                </p>
              </Reveal>
            </div>
            {/* salon hang — three works at three heights */}
            <div className="lg:col-span-7 grid gap-lg sm:grid-cols-3 sm:items-start">
              <Reveal delay={100}>
                <ArtFigure slug="signature-milk" compact />
              </Reveal>
              <Reveal delay={180} className="sm:mt-xxl">
                <ArtFigure slug="dark-60" compact />
              </Reveal>
              <Reveal delay={260} className="sm:mt-xl">
                <ArtFigure slug="chili-dark" compact />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── ~400 m — the orchards ─────────────────────────────── */}
      <section id="alt-400" className="bg-surface-2 border-y border-hairline">
        <div className="container-jaz py-xxl lg:py-section scroll-mt-lg">
          <div className="grid gap-xl lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <ElevationMark
                elevation={{ en: '400', ar: '٤٠٠' }}
                unit={{ en: 'm above the sea', ar: 'م فوق سطح البحر' }}
                motif="mango"
                title={{ en: 'The orchards', ar: 'البساتين' }}
              />
            </div>
            <Reveal delay={60} className="lg:col-span-5">
              <p className="text-body-lg text-ink-muted max-w-prose">
                {pick({
                  en: 'On the plain, heat becomes fruit: Jazani mango picked in spring, papaya drying in the sun, banana shading the road to the sea. All three paintings in this chapter are by Rehab Zakri.',
                  ar: 'في السهل تصير الحرارة ثمرًا: مانجو جيزاني يُقطَف في الربيع، وبابايا تجفّ في الشمس، وموز يظلّل الطريق إلى البحر. لوحات هذا الفصل الثلاث بريشة رحاب زكري.',
                })}
              </p>
            </Reveal>
          </div>
          <div className="mt-xl grid gap-lg sm:grid-cols-3 sm:items-start">
            <Reveal delay={80} className="sm:mt-lg">
              <ArtFigure slug="jazani-mango" compact />
            </Reveal>
            <Reveal delay={160}>
              <ArtFigure slug="sun-papaya" compact />
            </Reveal>
            <Reveal delay={240} className="sm:mt-xxl">
              <ArtFigure slug="banana-dark" compact />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── ~50 m — the jasmine plain ─────────────────────────── */}
      <section id="alt-50" className="container-jaz py-xxl lg:py-section scroll-mt-lg">
        <div className="grid gap-xl lg:grid-cols-12 lg:items-center">
          <Reveal delay={120} className="lg:col-span-5 order-last lg:order-first">
            <ArtFigure slug="jazan-jasmine" />
          </Reveal>
          <div className="lg:col-span-6 lg:col-start-7 flex flex-col gap-lg">
            <ElevationMark
              elevation={{ en: '50', ar: '٥٠' }}
              unit={{ en: 'm above the sea', ar: 'م فوق سطح البحر' }}
              motif="jasmine"
              title={{ en: 'The jasmine plain', ar: 'سهل الفُل' }}
            />
            <Reveal delay={80}>
              <p className="text-body-lg text-ink-muted max-w-prose">
                {pick({
                  en: 'Near the sea, evening settles on a plain white with jasmine. It is braided into garlands, given at doorsteps, and it perfumes every southern evening. Afnan Ali painted this season in When the Fields Bloom — one painting, printed as an edition of three.',
                  ar: 'قرب البحر يهبط المساء على سهل أبيض من الفُل. يُجدَل عقودًا وقلائد، ويُهدى على أبواب البيوت، ويعطّر أمسيات الجنوب كلها. رسمت أفنان علي هذا الموسم في «حين تزهر الحقول» — لوحة واحدة، طُبعت في طبعة من ثلاث.',
                })}
              </p>
            </Reveal>
            {/* the edition, typeset like catalogue practice — the bars are the ones the
                catalogue actually prints this painting on */}
            {jasmineEdition && jasmineEdition.bars.length > 1 && (
              <Reveal delay={140}>
                <div className="max-w-prose">
                  <span className="font-sans text-caption uppercase tracking-[0.14em] text-primary-hover">
                    {pick(editionLabel(jasmineEdition.bars.length))}
                  </span>
                  <ol className="mt-xs border-t border-hairline">
                    {jasmineEdition.bars.map((p) => (
                      <li key={p.slug} className="flex items-baseline gap-sm border-b border-hairline py-sm">
                        <span className="font-serif text-body text-ink">{pick(flavors[p.flavorId].name)}</span>
                        <span className="flex-1 border-b border-dotted border-hairline-strong translate-y-[-0.3em]" aria-hidden />
                        <span className="font-sans text-data text-ink-muted">{pick(p.title)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ── 0 m — the salt flats ──────────────────────────────── */}
      <section id="alt-0" className="bg-canvas-cool border-y border-hairline">
        <div className="container-jaz py-xxl lg:py-section scroll-mt-lg">
          <div className="grid gap-xl lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 flex flex-col gap-lg">
              <ElevationMark
                elevation={{ en: '0', ar: '٠' }}
                unit={{ en: 'sea level', ar: 'سطح البحر' }}
                motif="wave"
                title={{ en: 'The salt flats', ar: 'الملّاحات' }}
              />
              <Reveal delay={80}>
                <p className="text-body-lg text-ink-muted max-w-prose">
                  {pick({
                    en: 'At zero, the province meets the sea. In the old salt flats, salt is still gathered white out of the tide — the scene Afnan painted in White Tide. This is where our sea-salt bar takes its crystals, and where the story turns toward the rest of the Kingdom.',
                    ar: 'عند الصفر يلتقي الإقليم بالبحر. في الملّاحات القديمة ما زال الملح يُجمَع أبيض من ماء المدّ — وهو المشهد الذي رسمته أفنان في «أبيض المدّ». من هنا يأخذ لوح الملح البحري حبّاته، ومن هنا تلتفت الحكاية نحو بقية المملكة.',
                  })}
                </p>
              </Reveal>
            </div>
            <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
              <ArtFigure slug="sea-salt-dark" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── +18° — the gauge changes units ────────────────────── */}
      <section className="container-jaz py-xxl lg:py-section">
        <div className="max-w-3xl">
          <ElevationMark
            elevation={{ en: '+18°', ar: '+١٨°' }}
            unit={{ en: 'the cold chain', ar: 'سلسلة التبريد' }}
            title={{ en: 'The road to you', ar: 'الطريق إليك' }}
          />
          <Reveal delay={60}>
            <p className={cn('mt-lg font-serif text-subhead text-ink-muted', italicLatin)}>
              {pick({
                en: 'Here the altitude gauge stops, and the temperature gauge begins.',
                ar: 'هنا يتوقف عدّاد الأمتار، ويبدأ عدّاد الحرارة.',
              })}
            </p>
          </Reveal>
        </div>
        <div className="mt-xl border-t border-hairline">
          {[
            {
              n: { en: '01', ar: '٠١' },
              title: { en: 'Known growers', ar: 'مزارعون معروفون' },
              body: {
                en: 'Our flavors come from named Jazan farms we return to every season, at harvest.',
                ar: 'نكهاتنا من مزارع جازانية مسمّاة، نعود إليها كل موسم في وقت القطاف.',
              },
            },
            {
              n: { en: '02', ar: '٠٢' },
              title: { en: 'A full cold chain', ar: 'سلسلة تبريد كاملة' },
              body: {
                en: 'Heat-sensitive bars travel chilled at eighteen degrees to every region of the Kingdom.',
                ar: 'الألواح الحسّاسة للحرارة تسافر مبرّدة عند ثماني عشرة درجة إلى كل مناطق المملكة.',
              },
            },
            {
              n: { en: '03', ar: '٠٣' },
              title: { en: 'Licensed artwork', ar: 'فنٌّ مرخّص' },
              body: {
                en: 'Every wrapper is an original licensed painting, credited on its card to the artist who made it.',
                ar: 'كل غلاف لوحة أصلية مرخّصة، تُنسَب في بطاقتها إلى الفنانة التي رسمتها.',
              },
            },
          ].map((row, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="grid items-baseline gap-x-lg gap-y-xs border-b border-hairline py-lg sm:grid-cols-[3rem_14rem_1fr]">
                <span className="font-sans text-data text-primary-hover tabular-nums">{pick(row.n)}</span>
                <h3 className="font-serif text-card-title text-ink">{pick(row.title)}</h3>
                <p className="text-body-sm text-ink-muted max-w-prose">{pick(row.body)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── The colophon ──────────────────────────────────────── */}
      <section className="bg-canvas-dark text-ink-on-dark">
        <WaveDivider tone="gold" height={20} flip />
        <div className="container-jaz py-xxl lg:py-section flex flex-col gap-xxl">
          {/* the artist speaks the thesis */}
          <div className="grid gap-xl lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <blockquote className={cn('font-serif text-display-md lg:text-display-lg text-ink-on-dark text-balance', italicLatin)}>
                  {pick({
                    en: '“What truly remains is the legacy we preserve and pass on.”',
                    ar: '«ما يبقى حقًا هو الإرث الذي نحفظه ونتناقله عبر الأجيال.»',
                  })}
                  <footer className="mt-md font-sans not-italic text-caption uppercase tracking-[0.12em] text-ink-on-dark-muted">
                    {pick({ en: 'Afnan Ali — from the card of “What Remains of Us”', ar: 'أفنان علي — من بطاقة «ما يبقى منا»' })}
                  </footer>
                </blockquote>
              </Reveal>
            </div>
            <Reveal delay={140} className="lg:col-span-4 lg:col-start-9">
              <ArtFigure slug="single-origin-dark" compact tone="on-dark" />
            </Reveal>
          </div>

          {/* index of works — generated from the catalogue, grouped by painting */}
          <div>
            <Reveal>
              <h2 className="font-serif text-headline text-ink-on-dark">{pick({ en: 'Index of works', ar: 'فهرس اللوحات' })}</h2>
            </Reveal>
            <ol className="mt-md border-t border-hairline-dark">
              {workGroups.map((g, i) => (
                <Reveal key={g.title.en} delay={Math.min(i * 40, 240)} as="li">
                  <div className="flex flex-wrap items-baseline gap-x-sm gap-y-xxs border-b border-hairline-dark py-sm">
                    <span className="w-8 shrink-0 font-sans text-data text-primary-bright tabular-nums">
                      {isRTL ? arDigits(i + 1) : i + 1}
                    </span>
                    <span className="font-serif text-body text-ink-on-dark">{pick(g.title)}</span>
                    <span className="hidden sm:block flex-1 border-b border-dotted border-hairline-dark translate-y-[-0.3em]" aria-hidden />
                    <span className="font-sans text-data text-ink-on-dark-muted">
                      {pick(g.artist)}
                      {g.bars.length > 1 && (
                        <span className="text-primary-bright">
                          {' '}
                          · {pick(editionLabel(g.bars.length)).toLocaleLowerCase(isRTL ? 'ar' : 'en')}
                        </span>
                      )}
                    </span>
                    <span className="w-full ps-8 font-sans text-caption text-ink-on-dark-muted/70">
                      {pick({ en: 'on', ar: 'على' })} {g.bars.map((b) => pick(b.title)).join(' · ')}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>

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

          {/* signature, khatm, and the one commercial door */}
          <div className="flex flex-col items-center gap-lg text-center">
            <Reveal>
              <p className="font-serif text-display-md text-ink-on-dark text-balance max-w-2xl">
                {pick({
                  en: `${tally.join(', ')} — one province.`,
                  ar: `${tally.join('، و')} — وإقليم واحد.`,
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
                <span className="block mt-xxs text-ink-on-dark-muted/60 normal-case">
                  {pick({ en: '16.89° N, 42.55° E — where you started', ar: '١٦٫٨٩° شمالًا، ٤٢٫٥٥° شرقًا — حيث بدأت' })}
                </span>
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
 * Chapter opener: the elevation is the section numeral. A short plumb line drops
 * in from the previous chapter, the reading holds the baseline, and the motif
 * glyph sits at the end of the rule as the station's wayfinding mark.
 */
function ElevationMark({
  elevation,
  unit,
  motif,
  title,
}: {
  elevation: { en: string; ar: string }
  unit: { en: string; ar: string }
  motif?: Motif
  title: { en: string; ar: string }
}) {
  const { pick } = useLocale()
  return (
    <Reveal>
      <header>
        <span className="block h-10 w-px bg-primary/40" aria-hidden />
        <div className="mt-sm flex items-baseline gap-md">
          <span className="font-serif text-[clamp(2.2rem,4vw,3rem)] leading-none text-primary tabular-nums">{pick(elevation)}</span>
          <span className="font-sans text-caption uppercase tracking-[0.14em] text-ink-subtle">{pick(unit)}</span>
          <span className="flex-1 border-b border-hairline" aria-hidden />
          {motif && <MotifGlyph motif={motif} size={22} className="shrink-0" />}
        </div>
        <h2 className="mt-md font-serif text-display-md text-ink whitespace-pre-line text-balance">{pick(title)}</h2>
      </header>
    </Reveal>
  )
}

/**
 * A commissioned wrapper painting, hung: white double mat, warm shadow, and a
 * museum wall label typeset straight from the bar's artCard. A bar that loses its
 * painting simply comes off the wall — the chapter around it still stands.
 */
function ArtFigure({ slug, compact = false, tone = 'ink' }: { slug: string; compact?: boolean; tone?: 'ink' | 'on-dark' }) {
  const { pick } = useLocale()
  const work = hangable(slug)
  if (!work) return null
  const { product: p, art } = work
  const onDark = tone === 'on-dark'
  return (
    <figure className="flex flex-col gap-md">
      <div className={cn('p-sm sm:p-md shadow-soft-lg', onDark ? 'bg-surface-dark-1 border border-hairline-dark' : 'bg-surface-1 border border-hairline')}>
        <img
          src={work.photo}
          alt={`${pick(art.artworkTitle)} — ${pick(art.artistName)}`}
          loading="lazy"
          className={cn('block w-full h-auto border', onDark ? 'border-hairline-dark' : 'border-hairline')}
        />
      </div>
      <figcaption className="flex flex-col gap-xxs px-xxs">
        <span className={cn('font-serif text-card-title leading-snug', onDark ? 'text-ink-on-dark' : 'text-ink')}>
          {pick(art.artworkTitle)}
          <span className={cn('font-sans text-data ms-sm', onDark ? 'text-primary-bright' : 'text-primary-hover')}>{pick(art.artistName)}</span>
        </span>
        <span className={cn('font-sans text-caption', onDark ? 'text-ink-on-dark-muted' : 'text-ink-subtle')}>
          {pick({
            en: `Medium: chocolate — the ${p.title.en} bar`,
            ar: `الوسيط: شوكولاتة — لوح «${p.title.ar}»`,
          })}
        </span>
        {!compact && (
          <p className={cn('mt-xs text-body-sm max-w-prose', onDark ? 'text-ink-on-dark-muted' : 'text-ink-muted')}>{pick(art.description)}</p>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * The summit, drawn as its own map: topographic contour rings around the peak of
 * Fayfa with a faint graticule — the cartographic register the dateline and the
 * altitude gauge belong to. Hand-authored for this page; nowhere else on the site.
 */
function SummitContours({ className }: { className?: string }) {
  const line = '#b08a57'
  return (
    <svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice" className={cn('w-full h-full', className)} aria-hidden role="presentation" fill="none">
      {/* graticule */}
      {[140, 320, 500].map((y) => (
        <line key={y} x1="0" y1={y} x2="900" y2={y} stroke={line} strokeWidth="0.6" opacity="0.12" />
      ))}
      {[180, 450, 720].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="560" stroke={line} strokeWidth="0.6" opacity="0.12" />
      ))}
      {/* graticule crosses */}
      {[
        [180, 140], [450, 140], [720, 140],
        [180, 320], [450, 320], [720, 320],
        [180, 500], [450, 500], [720, 500],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} stroke={line} strokeWidth="1" opacity="0.28">
          <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
          <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
        </g>
      ))}
      {/* contour rings — the peak of Fayfa */}
      <g stroke={line} strokeLinecap="round">
        <path d="M652 218 C 668 210, 690 216, 692 232 C 694 248, 676 258, 658 254 C 640 250, 638 226, 652 218 Z" strokeWidth="1.3" opacity="0.5" />
        <path d="M630 196 C 664 180, 716 192, 722 230 C 728 268, 690 288, 650 280 C 610 272, 598 214, 630 196 Z" strokeWidth="1.2" opacity="0.42" />
        <path d="M606 172 C 660 146, 748 164, 756 228 C 764 292, 704 322, 640 310 C 576 298, 556 200, 606 172 Z" strokeWidth="1.1" opacity="0.34" />
        <path d="M578 146 C 652 108, 786 136, 794 226 C 802 316, 716 356, 626 340 C 536 324, 508 186, 578 146 Z" strokeWidth="1" opacity="0.26" />
        <path d="M544 118 C 642 68, 830 106, 838 224 C 846 342, 730 392, 610 372 C 490 352, 452 168, 544 118 Z" strokeWidth="1" opacity="0.19" />
        <path d="M504 88 C 630 26, 880 74, 886 222 C 892 370, 746 430, 592 406 C 438 382, 390 148, 504 88 Z" strokeWidth="1" opacity="0.13" />
        {/* a second, lower summit falling toward the sea */}
        <path d="M232 342 C 260 330, 300 338, 302 362 C 304 386, 272 398, 244 392 C 216 386, 210 352, 232 342 Z" strokeWidth="1.1" opacity="0.3" />
        <path d="M204 318 C 252 296, 336 310, 340 360 C 344 410, 284 430, 232 420 C 180 410, 162 338, 204 318 Z" strokeWidth="1" opacity="0.22" />
        <path d="M172 292 C 240 258, 372 278, 378 356 C 384 434, 300 464, 220 450 C 140 436, 112 322, 172 292 Z" strokeWidth="1" opacity="0.15" />
      </g>
      {/* peak markers */}
      <g stroke={line} opacity="0.7" strokeWidth="1.4">
        <path d="M664 230 l 6 10 h -12 Z" fill={line} fillOpacity="0.5" />
        <path d="M262 362 l 5 8 h -10 Z" fill={line} fillOpacity="0.4" />
      </g>
    </svg>
  )
}
