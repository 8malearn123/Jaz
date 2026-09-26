import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Palette } from 'lucide-react'
import { useLocale, toArabicDigits } from '@/i18n/LocaleContext'
import { useArtworks } from '@/state/ArtworksContext'
import { artworkStatusMeta } from '@/data/artworks'
import { useCatalogue } from '@/state/CatalogueContext'
import { flavors } from '@/data/flavors'
import type { Artwork, ArtworkStatus } from '@/data/types'
import { flavorBarPhoto } from '@/components/brand/ProductArt'
import { FlavorChip } from '@/components/ui/FlavorChip'
import { Modal } from '@/components/ui/Modal'
import { Reveal } from '@/components/ui/Reveal'
import { Eyebrow } from '@/components/ui/Misc'
import { PatternBand } from '@/components/brand/PatternBand'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/*
 * «معرض اللوحات» — the canvases, not the chocolate.
 *
 * The distinction this page exists to hold: a bar carries a printed painting and can be
 * bought by the thousand; the canvas behind it exists once. So nothing here goes into the
 * cart. An original is asked for, and asking holds it — the piece turns «محجوزة» the
 * moment a request is sent, because two collectors must never be told the same one-of-one
 * is available. The console answers the request and marks the sale.
 */

type Filter = 'all' | ArtworkStatus

export function ArtGalleryPage() {
  const { t, pick, locale, money, isRTL } = useLocale()
  const { publicArtworks, requestAcquisition } = useArtworks()
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Artwork | null>(null)

  const num = (n: number | string) => (locale === 'ar' ? toArabicDigits(String(n)) : String(n))
  const availableCount = publicArtworks.filter((a) => a.status === 'available').length

  const shown = useMemo(
    () => (filter === 'all' ? publicArtworks : publicArtworks.filter((a) => a.status === filter)),
    [publicArtworks, filter],
  )

  const chips: { id: Filter; label: string; accent?: string }[] = [
    { id: 'all', label: t('art.filter.all') },
    { id: 'available', label: pick(artworkStatusMeta.available.label), accent: artworkStatusMeta.available.color },
    { id: 'reserved', label: pick(artworkStatusMeta.reserved.label), accent: artworkStatusMeta.reserved.color },
    { id: 'sold', label: pick(artworkStatusMeta.sold.label), accent: artworkStatusMeta.sold.color },
  ]

  return (
    <>
      {/* ── The wall ───────────────────────────────────────────── */}
      <section className="relative bg-canvas-dark text-ink-on-dark overflow-hidden">
        <div className="absolute inset-x-0 top-0 opacity-50">
          <PatternBand motif="jasmine" height={120} opacity={0.14} tone="on-dark" />
        </div>
        <div className="container-jaz relative py-section flex flex-col gap-md">
          <Eyebrow tone="on-dark">{t('art.eyebrow')}</Eyebrow>
          <h1 className="font-serif text-display-lg text-ink-on-dark max-w-2xl text-balance">{t('art.title')}</h1>
          <p className="text-body-lg text-ink-on-dark-muted max-w-prose">{t('art.lede')}</p>
          <p className="mt-sm font-sans text-caption uppercase tracking-[0.12em] text-primary-bright">
            {num(publicArtworks.length)} {t('art.count.works')} · {num(availableCount)} {t('art.count.available')}
          </p>
        </div>
        <WaveDivider tone="gold" height={20} />
      </section>

      {/* ── The hang ───────────────────────────────────────────── */}
      <section className="container-jaz py-xxl">
        <div className="flex flex-wrap items-center gap-xs pb-md border-b border-hairline">
          {chips.map((c) => (
            <FlavorChip key={c.id} label={c.label} accent={c.accent} active={filter === c.id} onClick={() => setFilter(c.id)} />
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-xxl text-center text-ink-muted">{t('art.empty')}</p>
        ) : (
          <ol className="mt-xl grid gap-xl sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a, i) => (
              <Reveal key={a.id} delay={(i % 3) * 80} as="li">
                <ArtPlate artwork={a} onOpen={() => setOpen(a)} />
              </Reveal>
            ))}
          </ol>
        )}

        <div className="mt-xxl flex justify-center">
          <Link to="/shop" className="link-gold">
            {t('art.backToShop')} <ArrowRight size={15} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>

      <ArtworkDialog
        artwork={open}
        onClose={() => setOpen(null)}
        onRequest={requestAcquisition}
        num={num}
        money={money}
        isRTL={isRTL}
      />
    </>
  )
}

/*
 * The catalogue photographs the bar, not the canvas — the painting sits in the middle
 * band of every wrapper shot. A gallery plate has to show the work, so the photo is
 * zoomed onto that band: 2.7× about a point just below centre puts the visible window
 * at roughly 34–70% of the frame's height, which is where the printed painting falls in
 * all twelve shots. The wrapper's gold type stays above it and the weight line below it,
 * so what hangs here is the work, never the product shot.
 */
const PLATE_CROP = 'scale-[2.7] origin-[50%_52%]'

function Plate({ artwork, className, zoomOnHover = false }: { artwork: Artwork; className?: string; zoomOnHover?: boolean }) {
  const { pick } = useLocale()
  // A work photographed for the gallery is shown whole; only a plate lifted out of a
  // bar's product shot needs the crop.
  const photo = artwork.image ?? flavorBarPhoto[artwork.flavorId]
  const cropped = !artwork.image
  const accent = flavors[artwork.flavorId].accent

  return (
    <div className={cn('relative overflow-hidden border border-hairline', className)} style={{ backgroundColor: accent }}>
      {photo ? (
        <img
          src={photo}
          alt={`${pick(artwork.title)} — ${pick(artwork.artist)}`}
          loading="lazy"
          className={cn(
            'block w-full h-full object-cover transition-transform duration-700 ease-editorial',
            cropped && PLATE_CROP,
            zoomOnHover && (cropped ? 'group-hover:scale-[2.85]' : 'group-hover:scale-[1.04]'),
            artwork.status === 'sold' && 'opacity-90',
          )}
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  )
}

/** The plate on the wall: the painting, framed, over a museum label. */
function ArtPlate({ artwork, onOpen }: { artwork: Artwork; onOpen: () => void }) {
  const { t, pick, locale, money } = useLocale()
  const status = artworkStatusMeta[artwork.status]
  const num = (n: number | string) => (locale === 'ar' ? toArabicDigits(String(n)) : String(n))

  return (
    <figure className="flex h-full flex-col gap-md">
      <button
        type="button"
        onClick={onOpen}
        className="group block text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
      >
        <div className="relative bg-surface-1 border border-hairline p-sm sm:p-md shadow-soft-lg">
          <Plate artwork={artwork} className="aspect-square" zoomOnHover />
          <span
            className="absolute top-md end-md inline-flex items-center rounded-pill px-2.5 py-1 font-sans text-caption shadow-lift"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            {pick(status.label)}
          </span>
        </div>
      </button>

      <figcaption className="flex flex-col gap-xxs px-xxs">
        <h2 className="font-serif text-card-title leading-snug text-ink">{pick(artwork.title)}</h2>
        <span className="inline-flex items-center gap-xs font-sans text-data text-ink-muted">
          <Palette size={13} className="text-primary-hover" aria-hidden /> {pick(artwork.artist)}
        </span>
        <span className="font-sans text-caption text-ink-subtle">
          {num(artwork.year)} · {pick(artwork.medium)} · {num(artwork.widthCm)} × {num(artwork.heightCm)} {locale === 'ar' ? 'سم' : 'cm'}
        </span>
        <span className="mt-xxs font-sans text-data text-ink tabular-nums">
          {artwork.priceMinor > 0 ? money(artwork.priceMinor) : t('art.price.request')}
        </span>
      </figcaption>
    </figure>
  )
}

/** The label, the story, and the one way to buy a canvas: ask for it. */
function ArtworkDialog({
  artwork,
  onClose,
  onRequest,
  num,
  money,
  isRTL,
}: {
  artwork: Artwork | null
  onClose: () => void
  onRequest: (r: { artworkId: string; name: string; email: string; phone: string; note: string }) => void
  num: (n: number | string) => string
  money: (minor: number) => string
  isRTL: boolean
}) {
  const { bySlug } = useCatalogue()
  const { t, pick, locale } = useLocale()
  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' })
  const [sent, setSent] = useState(false)

  // Each opening starts clean: a request typed for one canvas must not follow the
  // collector to the next one.
  const close = () => {
    setForm({ name: '', email: '', phone: '', note: '' })
    setSent(false)
    onClose()
  }

  if (!artwork) return null

  const status = artworkStatusMeta[artwork.status]
  const bars = artwork.barSlugs.map((s) => bySlug(s)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const canAsk = artwork.status !== 'sold'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onRequest({ artworkId: artwork.id, ...form })
    setSent(true)
  }

  const fact = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-md border-b border-hairline py-xs">
      <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{label}</span>
      <span className="font-sans text-data text-ink text-end">{value}</span>
    </div>
  )

  return (
    <Modal open onClose={close} size="xl" eyebrow={pick(status.label)} title={pick(artwork.title)}>
      <div className="grid gap-lg md:grid-cols-2">
        <div className="bg-surface-2 border border-hairline p-sm self-start">
          <Plate artwork={artwork} className="aspect-square" />
        </div>

        <div className="flex flex-col gap-md">
          <p className={cn('font-serif text-body text-ink-muted leading-relaxed', !isRTL && 'italic')}>{pick(artwork.description)}</p>

          <div className="flex flex-col">
            {fact(t('art.fact.artist'), pick(artwork.artist))}
            {fact(t('art.fact.year'), num(artwork.year))}
            {fact(t('art.fact.medium'), pick(artwork.medium))}
            {fact(t('art.fact.size'), `${num(artwork.widthCm)} × ${num(artwork.heightCm)} ${locale === 'ar' ? 'سم' : 'cm'}`)}
            {fact(t('art.fact.edition'), t('art.fact.editionOne'))}
            {bars.length > 0 && fact(t('art.card.printedOn'), bars.map((b) => pick(b.title)).join(' · '))}
          </div>

          <p className="font-serif text-headline text-ink tabular-nums">
            {artwork.priceMinor > 0 ? money(artwork.priceMinor) : t('art.price.request')}
          </p>

          {sent ? (
            <p className="rounded-md border border-success/30 bg-success/10 p-md font-sans text-data text-success">{t('art.form.sent')}</p>
          ) : canAsk ? (
            <form onSubmit={submit} className="flex flex-col gap-sm">
              <p className="font-sans text-caption text-ink-subtle leading-relaxed">{t('art.form.note')}</p>
              <label className="flex flex-col gap-xxs">
                <span className="label mb-0">{t('art.form.name')}</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input py-2" />
              </label>
              <div className="grid gap-sm sm:grid-cols-2">
                <label className="flex flex-col gap-xxs">
                  <span className="label mb-0">{t('art.form.email')}</span>
                  <input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input py-2" />
                </label>
                <label className="flex flex-col gap-xxs">
                  <span className="label mb-0">{t('art.form.phone')}</span>
                  <input required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input py-2" />
                </label>
              </div>
              <label className="flex flex-col gap-xxs">
                <span className="label mb-0">{t('art.form.message')}</span>
                <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input py-2 resize-none" />
              </label>
              <button type="submit" className={buttonClass('primary', 'sm', 'mt-xxs self-start')}>
                {t('art.form.send')}
              </button>
            </form>
          ) : (
            <p className="rounded-md border border-hairline bg-surface-2 p-md font-sans text-data text-ink-muted">{t('art.acquire.sold')}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
