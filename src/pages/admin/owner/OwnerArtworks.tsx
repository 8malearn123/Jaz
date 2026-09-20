import { useState } from 'react'
import { Plus, Pencil, Trash2, Upload, Eye, EyeOff, Check, Frame, Package } from 'lucide-react'
import { useLocale, toAsciiDigits, toArabicDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { useArtworks } from '@/state/ArtworksContext'
import { artworkStatuses, artworkStatusMeta } from '@/data/artworks'
import { flavorList } from '@/data/flavors'
import { flavorBarPhoto } from '@/components/brand/ProductArt'
import type { Artwork, ArtworkStatus, Bilingual, FlavorId } from '@/data/types'
import { readResizedImage } from '@/lib/image'
import { cn } from '@/lib/cn'
import { PanelHead, Pill, FilterChips } from './_shared'

/*
 * «اللوحات» — the canvases, run from the same console as the chocolate.
 *
 * Two things are deliberately kept apart here. A product is stocked, priced per variant
 * and sold by the thousand; a painting is one object with an artist's name on it, and
 * selling it once ends it. So defining something new starts by asking which it is, and
 * the two never share an editor — a painting has no variants, no MOQ and no cold chain,
 * and a product has no artist.
 *
 * A work seeded from the catalogue is edited as an overlay, so its title and story still
 * follow the commission on the wrapper; only a work defined here can be deleted.
 */

export type ArtView = 'works' | 'requests'

type Draft = {
  title: string
  artist: string
  description: string
  medium: string
  year: string
  widthCm: string
  heightCm: string
  price: string
  status: ArtworkStatus
  flavorId: FlavorId
  image: string | null
  hidden: boolean
}

const parseNum = (s: string) => Math.max(0, parseInt(toAsciiDigits(s).replace(/[^\d]/g, '') || '0', 10) || 0)

export function OwnerArtworks({ view = 'works', onProducts }: { view?: ArtView; onProducts?: () => void }) {
  const { pick, locale, money } = useLocale()
  const { flash } = useToast()
  const { artworks, addArtwork, updateArtwork, removeArtwork, setStatus, requests, setRequestHandled } = useArtworks()
  const [editing, setEditing] = useState<Artwork | 'new' | null>(null)
  const [choosingKind, setChoosingKind] = useState(false)
  const [statusF, setStatusF] = useState<'all' | ArtworkStatus>('all')

  const num = (n: number | string) => (locale === 'ar' ? toArabicDigits(String(n)) : String(n))
  // Typed text is single-locale; keep the other language rather than flattening the pair.
  const bi = (typed: string, orig?: Bilingual): Bilingual => (orig ? { ...orig, [locale]: typed } : { en: typed, ar: typed })

  const list = statusF === 'all' ? artworks : artworks.filter((a) => a.status === statusF)
  const countOf = (s: ArtworkStatus) => artworks.filter((a) => a.status === s).length

  const save = (d: Draft) => {
    const orig = editing !== 'new' && editing ? editing : undefined
    const fields = {
      title: bi(d.title, orig?.title),
      artist: bi(d.artist, orig?.artist),
      description: bi(d.description, orig?.description),
      medium: bi(d.medium, orig?.medium),
      year: parseNum(d.year) || new Date().getFullYear(),
      widthCm: parseNum(d.widthCm),
      heightCm: parseNum(d.heightCm),
      priceMinor: parseNum(d.price) * 100,
      status: d.status,
      flavorId: d.flavorId,
      image: d.image ?? undefined,
      hidden: d.hidden,
    }
    if (editing === 'new') {
      addArtwork({ ...fields, barSlugs: [] })
      flash(`${pick({ en: 'Painting added', ar: 'أُضيفت اللوحة' })} · ${d.title}`)
    } else if (orig) {
      updateArtwork(orig.id, fields)
      flash(pick({ en: 'Painting updated', ar: 'حُدّثت اللوحة' }))
    }
    setEditing(null)
  }

  const openRequests = requests.filter((r) => !r.handled).length

  if (view === 'requests') {
    return (
      <div className="flex flex-col gap-lg">
        <PanelHead
          title={pick({ en: 'Acquisition requests', ar: 'طلبات الاقتناء' })}
          subtitle={pick({ en: 'Collectors who asked for a canvas from the gallery', ar: 'مقتنون طلبوا لوحةً من المعرض' })}
        />
        {requests.length === 0 ? (
          <div className="card p-xl grid place-items-center text-center gap-sm">
            <p className="font-serif text-card-title text-ink">{pick({ en: 'No requests yet', ar: 'لا توجد طلبات بعد' })}</p>
            <p className="font-sans text-caption text-ink-subtle">
              {pick({ en: 'A request from /art arrives here, and holds its painting.', ar: 'كل طلب من صفحة المعرض يصل هنا، ويحجز لوحته.' })}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-sm">
            {requests.map((r) => {
              const work = artworks.find((a) => a.id === r.artworkId)
              return (
                <li key={r.id} className={cn('card p-md flex flex-wrap items-start justify-between gap-md', r.handled && 'opacity-60')}>
                  <div className="flex flex-col gap-xxs min-w-0">
                    <span className="font-serif text-card-title text-ink">{work ? pick(work.title) : r.artworkId}</span>
                    <span className="font-sans text-data text-ink-muted">
                      {r.name} · <span dir="ltr">{r.email}</span> · <span dir="ltr">{r.phone}</span>
                    </span>
                    {r.note && <p className="font-sans text-caption text-ink-subtle max-w-prose">{r.note}</p>}
                    <span className="font-sans text-caption text-ink-subtle tabular-nums">{new Date(r.at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB')}</span>
                  </div>
                  <button onClick={() => setRequestHandled(r.id, !r.handled)} className={buttonClass(r.handled ? 'ghost' : 'secondary', 'sm')}>
                    <Check size={15} /> {r.handled ? pick({ en: 'Handled', ar: 'تمت المعالجة' }) : pick({ en: 'Mark handled', ar: 'تم التعامل معه' })}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead
        title={pick({ en: 'Paintings', ar: 'اللوحات' })}
        subtitle={pick({ en: 'The originals behind the wrappers — what the gallery hangs and sells', ar: 'اللوحات الأصلية خلف الأغلفة — ما يعرضه المعرض ويبيعه' })}
        action={
          <button onClick={() => setChoosingKind(true)} className={buttonClass('primary', 'sm')}>
            <Plus size={15} /> {pick({ en: 'New item', ar: 'عنصر جديد' })}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-sm">
        <Pill color={artworkStatusMeta.available.color} bg={artworkStatusMeta.available.bg}>
          {num(countOf('available'))} {pick(artworkStatusMeta.available.label)}
        </Pill>
        <Pill color={artworkStatusMeta.reserved.color} bg={artworkStatusMeta.reserved.bg}>
          {num(countOf('reserved'))} {pick(artworkStatusMeta.reserved.label)}
        </Pill>
        <Pill color={artworkStatusMeta.sold.color} bg={artworkStatusMeta.sold.bg}>
          {num(countOf('sold'))} {pick(artworkStatusMeta.sold.label)}
        </Pill>
        {openRequests > 0 && (
          <span className="font-sans text-caption text-primary-hover">
            {num(openRequests)} {pick({ en: 'open acquisition requests', ar: 'طلب اقتناء مفتوح' })}
          </span>
        )}
      </div>

      <FilterChips
        chips={[
          { id: 'all' as const, label: pick({ en: 'All', ar: 'الكل' }), count: artworks.length },
          ...artworkStatuses.map((s) => ({ id: s, label: pick(artworkStatusMeta[s].label), count: countOf(s) })),
        ]}
        active={statusF}
        onChange={setStatusF}
        label={pick({ en: 'Status', ar: 'الحالة' })}
      />

      <ul className="flex flex-col gap-sm">
        {list.map((a) => {
          const photo = a.image ?? flavorBarPhoto[a.flavorId]
          return (
            <li key={a.id} className="card p-md flex flex-wrap items-center gap-md">
              <span className="w-14 h-14 rounded-md overflow-hidden border border-hairline shrink-0 bg-surface-2">
                {photo && <img src={photo} alt="" className={cn('w-full h-full object-cover', !a.image && 'scale-[2.7] origin-[50%_52%]')} />}
              </span>

              <div className="flex flex-col gap-xxs min-w-0 flex-1">
                <span className="font-serif text-card-title text-ink truncate">{pick(a.title)}</span>
                <span className="font-sans text-caption text-ink-subtle truncate">
                  {pick(a.artist)} · {num(a.year)} · {pick(a.medium)} · {num(a.widthCm)}×{num(a.heightCm)} {locale === 'ar' ? 'سم' : 'cm'}
                  {a.custom && ` · ${pick({ en: 'defined here', ar: 'مُعرّفة هنا' })}`}
                </span>
              </div>

              <span className="font-sans text-data text-ink tabular-nums">
                {a.priceMinor > 0 ? money(a.priceMinor) : pick({ en: 'On request', ar: 'عند الطلب' })}
              </span>

              <label className="sr-only" htmlFor={`st-${a.id}`}>
                {pick({ en: 'Status', ar: 'الحالة' })}
              </label>
              <select
                id={`st-${a.id}`}
                value={a.status}
                onChange={(e) => setStatus(a.id, e.target.value as ArtworkStatus)}
                className="input py-1.5 w-auto font-sans text-data cursor-pointer"
              >
                {artworkStatuses.map((s) => (
                  <option key={s} value={s}>
                    {pick(artworkStatusMeta[s].label)}
                  </option>
                ))}
              </select>

              <button
                onClick={() => updateArtwork(a.id, { hidden: !a.hidden })}
                title={a.hidden ? pick({ en: 'Show in the gallery', ar: 'إظهار في المعرض' }) : pick({ en: 'Hold back from the gallery', ar: 'إخفاء من المعرض' })}
                className="grid place-items-center w-9 h-9 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
              >
                {a.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                onClick={() => setEditing(a)}
                title={pick({ en: 'Edit', ar: 'تعديل' })}
                className="grid place-items-center w-9 h-9 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
              >
                <Pencil size={15} />
              </button>
              {a.custom && (
                <button
                  onClick={() => { removeArtwork(a.id); flash(pick({ en: 'Painting removed', ar: 'حُذفت اللوحة' })) }}
                  title={pick({ en: 'Delete', ar: 'حذف' })}
                  className="grid place-items-center w-9 h-9 rounded-md border border-hairline text-danger hover:border-danger/40 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {/* The question the console asks before anything is defined. */}
      <Modal
        open={choosingKind}
        onClose={() => setChoosingKind(false)}
        size="md"
        eyebrow={pick({ en: 'New item', ar: 'عنصر جديد' })}
        title={pick({ en: 'What are you defining?', ar: 'ما الذي تُعرّفه؟' })}
      >
        <div className="grid gap-sm sm:grid-cols-2">
          <button
            onClick={() => { setChoosingKind(false); setEditing('new') }}
            className="card card-hover p-lg flex flex-col items-start gap-xs text-start"
          >
            <Frame size={20} className="text-primary-hover" />
            <span className="font-serif text-card-title text-ink">{pick({ en: 'A painting', ar: 'لوحة' })}</span>
            <span className="font-sans text-caption text-ink-subtle">
              {pick({ en: 'One canvas, one artist, sold once. Hangs in the gallery — never in the shop.', ar: 'لوحة واحدة باسم فنانتها، تُباع مرة واحدة. تُعرض في معرض اللوحات — لا في المتجر.' })}
            </span>
          </button>
          <button
            onClick={() => { setChoosingKind(false); onProducts?.() }}
            className="card card-hover p-lg flex flex-col items-start gap-xs text-start"
          >
            <Package size={20} className="text-ink-muted" />
            <span className="font-serif text-card-title text-ink">{pick({ en: 'A product', ar: 'منتج' })}</span>
            <span className="font-sans text-caption text-ink-subtle">
              {pick({ en: 'Stocked and priced per variant, sold by the piece. Opens the Products panel.', ar: 'له مخزون وأسعار لكل حجم، ويُباع بالقطعة. يفتح قسم المنتجات.' })}
            </span>
          </button>
        </div>
      </Modal>

      {editing && (
        <ArtworkEditor
          artwork={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function ArtworkEditor({ artwork, onClose, onSave }: { artwork?: Artwork; onClose: () => void; onSave: (d: Draft) => void }) {
  const { pick, locale } = useLocale()
  const { flash } = useToast()
  const [d, setD] = useState<Draft>({
    title: artwork ? pick(artwork.title) : '',
    artist: artwork ? pick(artwork.artist) : '',
    description: artwork ? pick(artwork.description) : '',
    medium: artwork ? pick(artwork.medium) : locale === 'ar' ? 'أكريليك على قماش' : 'Acrylic on canvas',
    year: artwork ? String(artwork.year) : String(new Date().getFullYear()),
    widthCm: artwork ? String(artwork.widthCm) : '70',
    heightCm: artwork ? String(artwork.heightCm) : '100',
    price: artwork ? String(Math.round(artwork.priceMinor / 100)) : '',
    status: artwork?.status ?? 'available',
    flavorId: artwork?.flavorId ?? flavorList[0].id,
    image: artwork?.image ?? null,
    hidden: artwork?.hidden ?? false,
  })
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }))

  const onPick = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { flash(pick({ en: 'Please choose an image file', ar: 'اختر ملف صورة' })); return }
    readResizedImage(file).then((img) => set('image', img)).catch(() => flash(pick({ en: 'Could not read that image', ar: 'تعذّرت قراءة الصورة' })))
  }

  const field = (label: string, node: React.ReactNode) => (
    <label className="flex flex-col gap-xxs">
      <span className="label mb-0">{label}</span>
      {node}
    </label>
  )

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      eyebrow={pick(artwork ? { en: 'Edit painting', ar: 'تعديل لوحة' } : { en: 'New painting', ar: 'لوحة جديدة' })}
      title={artwork ? pick(artwork.title) : pick({ en: 'New painting', ar: 'لوحة جديدة' })}
      footer={
        <>
          <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
          <button
            onClick={() => d.title.trim() && d.artist.trim() ? onSave(d) : flash(pick({ en: 'A painting needs a title and an artist', ar: 'اللوحة تحتاج عنوانًا واسم فنانة' }))}
            className={buttonClass('primary', 'sm')}
          >
            {pick({ en: 'Save', ar: 'حفظ' })}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-md">
        {field(pick({ en: 'Title', ar: 'عنوان اللوحة' }), <input value={d.title} onChange={(e) => set('title', e.target.value)} className="input py-2" />)}
        {field(pick({ en: 'Artist', ar: 'الفنانة' }), <input value={d.artist} onChange={(e) => set('artist', e.target.value)} className="input py-2" />)}
        {field(pick({ en: 'Story', ar: 'نص اللوحة' }), <textarea rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} className="input py-2 resize-none" />)}

        <div className="grid gap-sm sm:grid-cols-2">
          {field(pick({ en: 'Medium', ar: 'الخامة' }), <input value={d.medium} onChange={(e) => set('medium', e.target.value)} className="input py-2" />)}
          {field(pick({ en: 'Year', ar: 'السنة' }), <input inputMode="numeric" value={d.year} onChange={(e) => set('year', e.target.value)} className="input py-2 tabular-nums" />)}
          {field(pick({ en: 'Width (cm)', ar: 'العرض (سم)' }), <input inputMode="numeric" value={d.widthCm} onChange={(e) => set('widthCm', e.target.value)} className="input py-2 tabular-nums" />)}
          {field(pick({ en: 'Height (cm)', ar: 'الارتفاع (سم)' }), <input inputMode="numeric" value={d.heightCm} onChange={(e) => set('heightCm', e.target.value)} className="input py-2 tabular-nums" />)}
          {field(
            pick({ en: 'Price (SAR) — empty means on request', ar: 'السعر (ر.س) — اتركه فارغًا ليكون عند الطلب' }),
            <input inputMode="numeric" value={d.price} onChange={(e) => set('price', e.target.value)} className="input py-2 tabular-nums" />,
          )}
          {field(
            pick({ en: 'Status', ar: 'الحالة' }),
            <select value={d.status} onChange={(e) => set('status', e.target.value as ArtworkStatus)} className="input py-2 cursor-pointer">
              {artworkStatuses.map((s) => (
                <option key={s} value={s}>{pick(artworkStatusMeta[s].label)}</option>
              ))}
            </select>,
          )}
        </div>

        {/* Without a photograph of the canvas the gallery falls back to the wrapper that
            prints it, so the flavour decides which plate and accent a work borrows. */}
        {field(
          pick({ en: 'Art key (plate & accent)', ar: 'مفتاح العرض (الصورة واللون)' }),
          <select value={d.flavorId} onChange={(e) => set('flavorId', e.target.value as FlavorId)} className="input py-2 cursor-pointer">
            {flavorList.map((f) => (
              <option key={f.id} value={f.id}>{pick(f.name)}</option>
            ))}
          </select>,
        )}

        <div className="flex flex-wrap items-center gap-md">
          <span className="w-20 h-20 rounded-md overflow-hidden border border-hairline bg-surface-2 shrink-0">
            {(d.image ?? flavorBarPhoto[d.flavorId]) && (
              <img src={d.image ?? flavorBarPhoto[d.flavorId]} alt="" className={cn('w-full h-full object-cover', !d.image && 'scale-[2.7] origin-[50%_52%]')} />
            )}
          </span>
          <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
            <Upload size={15} /> {pick({ en: 'Photograph of the canvas', ar: 'صورة اللوحة' })}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
          </label>
          {d.image && (
            <button onClick={() => set('image', null)} className={buttonClass('ghost', 'sm')}>
              {pick({ en: 'Remove photo', ar: 'إزالة الصورة' })}
            </button>
          )}
        </div>

        <label className="flex items-center gap-sm">
          <input type="checkbox" checked={!d.hidden} onChange={(e) => set('hidden', !e.target.checked)} className="w-4 h-4 accent-[#b08a57]" />
          <span className="font-sans text-data text-ink">{pick({ en: 'Hang it in the public gallery', ar: 'اعرضها في معرض اللوحات' })}</span>
        </label>
      </div>
    </Modal>
  )
}
