import { useLocale } from '@/i18n/LocaleContext'
import { products } from '@/data/products'
import { ProductCard } from '@/components/ui/ProductCard'
import { Reveal } from '@/components/ui/Reveal'
import { Eyebrow } from '@/components/ui/Misc'
import { PatternBand } from '@/components/brand/PatternBand'

/*
 * الهدايا — «لا يوجد محتوى نصّي مطلوب لهذه الصفحة»: the client asked for no copy here
 * beyond the products, laid out «بنفس ترتيب المنتجات المتبقية». So the page carries only
 * its own name, and the three boxes are set in the catalogue's own card.
 *
 * They keep the full card rather than the plain one /shop's first section uses, because
 * the plain card drops the net weight — and 250 g / 250 g / 500 g is the one detail the
 * client named for these three.
 */

/** The three gift boxes, in catalogue order: 250 g, 250 g, 500 g. */
const giftBoxes = products.filter((p) => p.type === 'gift_box')

export function GiftsPage() {
  const { t } = useLocale()
  return (
    <>
      <section className="bg-surface-2 border-b border-hairline">
        <PatternBand motif="jasmine" height={56} opacity={0.1} />
        <div className="container-jaz py-xxl flex flex-col gap-md">
          <Eyebrow>{t('gifts.eyebrow')}</Eyebrow>
          <h1 className="font-serif text-display-lg text-ink max-w-2xl text-balance">{t('gifts.title')}</h1>
        </div>
      </section>

      <section className="container-jaz py-xl">
        <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {giftBoxes.map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
