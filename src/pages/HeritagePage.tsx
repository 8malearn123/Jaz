import { Link } from 'react-router-dom'
import { ArrowRight, Snowflake, Palette, Sprout } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, QuoteGlyph } from '@/components/ui/Misc'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { JazanScene } from '@/components/brand/JazanScene'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { PatternBand, MotifGlyph, type Motif } from '@/components/brand/PatternBand'
import { ProductArt } from '@/components/brand/ProductArt'

const motifs: { m: Motif; en: string; ar: string; enNote: string; arNote: string }[] = [
  { m: 'jasmine', en: 'Jasmine', ar: 'الفُل', enNote: 'Scenting southern evenings', arNote: 'يعطّر أمسيات الجنوب' },
  { m: 'coffee', en: 'Khawlani coffee', ar: 'البن الخولاني', enNote: 'Six centuries in the highlands', arNote: 'ستة قرون في المرتفعات' },
  { m: 'mango', en: 'Jazani mango', ar: 'المانجو الجيزاني', enNote: 'The pride of the orchards', arNote: 'فخر البساتين' },
  { m: 'wave', en: 'The Red Sea', ar: 'البحر الأحمر', enNote: 'A coastline of light', arNote: 'ساحلٌ من الضوء' },
  { m: 'mountain', en: 'Fayfa mountains', ar: 'جبال فيفاء', enNote: 'Terraced and green', arNote: 'مدرّجة وخضراء' },
]

export function HeritagePage() {
  const { t, pick } = useLocale()
  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden bg-canvas-dark text-ink-on-dark">
        <div className="absolute inset-0 opacity-50">
          <JazanScene tone="dark" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-canvas-dark/20 to-canvas-dark" />
        <div className="container-jaz relative py-section flex flex-col items-center text-center gap-md max-w-3xl mx-auto">
          <Reveal>
            <Eyebrow tone="on-dark">{t('heritage.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-serif text-[clamp(2.6rem,7vw,4.4rem)] leading-[1.05] text-ink-on-dark whitespace-pre-line text-balance">
              {t('heritage.hero.title')}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-body-lg text-ink-on-dark-muted max-w-prose">{t('home.story.body')}</p>
          </Reveal>
        </div>
        <WaveDivider tone="gold" height={20} />
      </section>

      {/* the region — split */}
      <section className="container-jaz py-section">
        <div className="grid lg:grid-cols-2 gap-xl items-center">
          <Reveal>
            <SectionHeader
              number="01"
              eyebrow={pick({ en: 'The place', ar: 'المكان' })}
              title={pick({ en: 'Jazan, the green\ncorner of the Kingdom', ar: 'جازان، الركن\nالأخضر من المملكة' })}
              body={pick({
                en: 'In the far southwest, between the Red Sea and the Fayfa mountains, Jazan is the Kingdom’s garden — coffee terraces, mango orchards, and jasmine that perfumes the dusk. JAZ begins here, with growers we know by name.',
                ar: 'في أقصى الجنوب الغربي، بين البحر الأحمر وجبال فيفاء، جازان حديقة المملكة — مدرّجات البن، وبساتين المانجو، والفُل الذي يعطّر المغيب. من هنا تبدأ جاز، مع مزارعين نعرفهم بأسمائهم.',
              })}
            />
          </Reveal>
          <Reveal delay={100}>
            <figure className="quote-block bg-surface-2 rounded-xl p-xl border border-hairline relative">
              <QuoteGlyph className="text-[56px] absolute -top-3 ms-2" />
              <blockquote className="font-serif text-subhead text-ink leading-relaxed pt-lg">
                {pick({
                  en: 'A bar should taste of somewhere. Ours tastes of the south — of harvest, of warm light, of home.',
                  ar: 'ينبغي للوح الشوكولاتة أن يحمل طعم مكان. لوحنا يحمل طعم الجنوب — طعم الحصاد، والضوء الدافئ، والبيت.',
                })}
              </blockquote>
              <figcaption className="mt-md font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">
                {pick({ en: 'The JAZ founders', ar: 'مؤسّسو جاز' })}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* the five motifs */}
      <section className="bg-surface-2 border-y border-hairline">
        <PatternBand motif="mountain" height={56} opacity={0.1} />
        <div className="container-jaz py-section">
          <Reveal>
            <SectionHeader
              number="02"
              eyebrow={pick({ en: 'The motifs', ar: 'الرموز' })}
              title={pick({ en: 'Five marks of a region', ar: 'خمسة رموز لإقليم' })}
              body={pick({
                en: 'Our gold line-patterns are drawn from five things that make Jazan itself. They run across every wrapper in place of ornament.',
                ar: 'رموزنا الذهبية مستلهَمة من خمسة أشياء تصنع جازان. تمتدّ على كل غلافٍ بدل الزخرفة.',
              })}
            />
          </Reveal>
          <div className="mt-xl grid gap-md grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {motifs.map((mo, i) => (
              <Reveal key={mo.m} delay={i * 60}>
                <div className="card card-hover p-lg flex flex-col items-center text-center gap-sm h-full">
                  <span className="grid place-items-center w-16 h-16 rounded-pill bg-primary/8">
                    <MotifGlyph motif={mo.m} size={36} />
                  </span>
                  <h3 className="font-serif text-card-title text-ink">{pick({ en: mo.en, ar: mo.ar })}</h3>
                  <p className="font-sans text-caption text-ink-subtle">{pick({ en: mo.enNote, ar: mo.arNote })}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* the artists */}
      <section className="container-jaz py-section">
        <div className="grid lg:grid-cols-2 gap-xl items-center">
          <Reveal>
            <div className="relative rounded-xl overflow-hidden aspect-[4/5] shadow-soft" style={{ backgroundColor: '#8e2f55' }}>
              <ProductArt flavorId="rose" />
              <div className="absolute bottom-0 inset-x-0">
                <WaveDivider tone="on-dark" height={18} />
              </div>
            </div>
          </Reveal>
          <div className="flex flex-col gap-md">
            <Reveal>
              <SectionHeader
                number="03"
                eyebrow={pick({ en: 'The artists', ar: 'الفنانون' })}
                title={pick({ en: 'Every wrapper is\noriginal artwork', ar: 'كل غلافٍ\nعملٌ فنيٌّ أصلي' })}
                body={pick({
                  en: 'We commission contemporary Saudi artists to paint the Jazan harvest. Each limited bar carries a collectible art-card crediting the hand that made it — the chocolate is the gallery.',
                  ar: 'نكلّف فنانين سعوديين معاصرين برسم حصاد جازان. يحمل كل لوحٍ محدود بطاقةً فنية مقتناة تنسب الفضل لليد التي صنعتها — فالشوكولاتة هي المعرض.',
                })}
              />
            </Reveal>
            <Reveal delay={120}>
              <div className="flex items-center gap-md">
                <Palette size={20} className="text-primary-hover" />
                <span className="font-sans text-data text-ink-muted">
                  {pick({ en: 'Reem Al-Faifi · Yasser Hakami · Sara Madkhali', ar: 'ريم الفيفي · ياسر حكمي · سارة مدخلي' })}
                </span>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <Link to="/shop" className="link-gold">
                {pick({ en: 'Shop the limited bars', ar: 'تسوّق الألواح المحدودة' })} <ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* sourcing / cold chain band */}
      <section className="bg-canvas-dark text-ink-on-dark">
        <WaveDivider tone="gold" height={20} flip />
        <div className="container-jaz py-section grid gap-md sm:grid-cols-3">
          {[
            { icon: Sprout, en: 'Known growers', ar: 'مزارعون معروفون', enb: 'Botanicals sourced from named Jazan farms, re-verified each season.', arb: 'نكهات من مزارع جازان معروفة، يُعاد التحقق منها كل موسم.' },
            { icon: Snowflake, en: 'Cold-chain care', ar: 'عناية التبريد', enb: 'Heat-sensitive bars ship in temperature-controlled packaging, Kingdom-wide.', arb: 'الألواح الحساسة للحرارة تُشحن بتغليف مبرّد في كل المملكة.' },
            { icon: Palette, en: 'Licensed artwork', ar: 'أعمال مرخّصة', enb: 'Original paintings, licensed and credited — never stock imagery.', arb: 'لوحات أصلية مرخّصة ومنسوبة — لا صور جاهزة أبدًا.' },
          ].map((it, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="flex flex-col gap-sm h-full">
                <span className="grid place-items-center w-12 h-12 rounded-pill bg-primary/15 text-primary-bright">
                  <it.icon size={22} />
                </span>
                <h3 className="font-serif text-card-title text-ink-on-dark mt-xs">{pick({ en: it.en, ar: it.ar })}</h3>
                <p className="text-body-sm text-ink-on-dark-muted">{pick({ en: it.enb, ar: it.arb })}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* closing CTA */}
      <section className="container-jaz py-section text-center">
        <Reveal>
          <div className="flex flex-col items-center gap-md">
            <MotifGlyph motif="jasmine" size={36} />
            <h2 className="font-serif text-display-md text-ink max-w-xl text-balance">
              {pick({ en: 'Taste the south for yourself', ar: 'تذوّق الجنوب بنفسك' })}
            </h2>
            <Link to="/shop" className={buttonClass('primary', 'md', 'mt-xs')}>
              {t('cta.shop')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}
