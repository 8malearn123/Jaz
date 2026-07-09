import { useEffect, useRef, useState } from 'react'
import { Plus, Eye, EyeOff, Pencil, Check, Upload, Trash2, Snowflake, ChevronDown } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { storeBadgeMeta, storeBadgeKeys, storeSwatches, storePackaging, type StoreProduct, type StoreBadge, type StoreVariant, type StoreComponent } from '@/data/ownerCatalog'
import { rawMaterials, stockUnits, unitFactor } from '@/data/ownerSupply'
import type { ProdChannel } from '@/data/ownerProducts'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { readResizedImage } from '@/lib/image'
import { PanelHead, Pill } from './_shared'

// Fallback "photo" — a colour tile with a subtle chocolate weave, used when no image is uploaded.
const tile = (color: string) => ({ backgroundColor: color, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 3px, transparent 3px 12px)' })

type Draft = { name: string; desc: string; category: string; variants: StoreVariant[]; color: string; image: string | null; badges: StoreBadge[]; visible: boolean; sku: string; moq: number; components: StoreComponent[]; netWeight: string; shelfLife: string; barcode: string; notes: string }
type CompRow = { id: number; name: string; qty: string; unit: string } // qty kept as raw text so decimals type cleanly

// Numeric-input parser: normalize Arabic-Indic digits, take the integer part (a stray "30.5" can't concatenate to 305).
const parseNum = (s: string) => Math.max(0, parseInt(toAsciiDigits(s).replace(/[^\d.]/g, '').split('.')[0] || '0', 10) || 0)
// Decimal parser for component quantities (e.g. 1.8 kg per unit).
const parseDec = (s: string) => { const n = parseFloat(toAsciiDigits(s).replace(/[^\d.]/g, '')); return Number.isFinite(n) && n >= 0 ? n : 0 }
const blankVariant = (id: string, retailMinor = 0): StoreVariant => ({ id, netWeightG: 90, packaging: 'standard', retailPriceMinor: retailMinor, b2bPriceMinor: Math.round(retailMinor * 0.7 / 100) * 100, inStock: true, requiresColdChain: false })

/** "Products" panel — add products and manage how they appear to the end customer, per channel (see AdminConsole). */
export function OwnerCatalog({ view: chan }: { view: ProdChannel }) {
  const { pick, locale } = useLocale()
  const { flash } = useToast()
  const { storeProducts, addStoreProduct, updateStoreProduct, toggleStoreVisible } = useOwnerState()
  const [editing, setEditing] = useState<{ id: string } | 'new' | null>(null)
  // Close any open editor when the channel changes — its target product is channel-scoped, so it
  // would otherwise go stale (a keyboard user can tab out of the modal to the sidebar sub-nav).
  useEffect(() => setEditing(null), [chan])

  const list = storeProducts[chan]
  const visibleCount = list.filter((p) => p.visible).length
  const hiddenCount = list.length - visibleCount
  // distinct categories (localized), each keeping its bilingual value for the editor's suggestions
  const catOptions = [...new Map(list.map((p) => [pick(p.category), p.category])).values()]
  const categories = catOptions.map((c) => pick(c))

  // Merge a typed (single-locale) value into a bilingual field, preserving the other language on edit.
  const bi = (typed: string, orig?: Bilingual): Bilingual => (orig ? { ...orig, [locale]: typed } : { en: typed, ar: typed })
  // Resolve a typed category to its canonical bilingual value when it matches an existing one,
  // so a picked/renamed category keeps its translation instead of collapsing to the typed locale.
  const resolveCategory = (typed: string): Bilingual => catOptions.find((c) => pick(c) === typed.trim()) ?? { en: typed.trim(), ar: typed.trim() }

  const save = (d: Draft) => {
    const orig = editing !== 'new' && editing ? list.find((p) => p.id === editing.id) : undefined
    // headline "from" price = cheapest variant retail
    const priceMinor = d.variants.length ? Math.min(...d.variants.map((v) => v.retailPriceMinor)) : 0
    const fields = { name: bi(d.name, orig?.name), desc: bi(d.desc, orig?.desc), category: resolveCategory(d.category), priceMinor, color: d.color, image: d.image ?? undefined, badges: d.badges, variants: d.variants, sku: d.sku.trim() || undefined, moq: d.moq || undefined, components: d.components.length ? d.components : undefined, netWeight: d.netWeight.trim() || undefined, shelfLife: d.shelfLife.trim() || undefined, barcode: d.barcode.trim() || undefined, notes: d.notes.trim() || undefined }
    if (editing === 'new') { addStoreProduct(chan, fields); flash(`${pick({ en: 'Product added', ar: 'أُضيف المنتج' })} · ${d.name}`) }
    else if (editing) { updateStoreProduct(chan, editing.id, { ...fields, visible: d.visible }); flash(pick({ en: 'Product updated', ar: 'حُدّث المنتج' })) }
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Products', ar: 'المنتجات' })} subtitle={pick({ en: 'Add products and manage how they appear to your customers', ar: 'أضف المنتجات وتحكّم بطريقة ظهورها لعملائك' })}
        action={<button onClick={() => setEditing('new')} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'New product', ar: 'منتج جديد' })}</button>} />

      {/* storefront summary */}
      <div className="flex flex-wrap items-center gap-sm">
        <Pill color="#355c4b" bg="#e8f0ec">{visibleCount} {pick({ en: 'on storefront', ar: 'في المتجر' })}</Pill>
        {hiddenCount > 0 && <Pill color="#8a6b3f" bg="#f6edde">{hiddenCount} {pick({ en: 'hidden', ar: 'مخفي' })}</Pill>}
        <span className="font-sans text-caption text-ink-subtle">{list.length} {pick({ en: 'products in this channel', ar: 'منتجًا في هذه القناة' })}</span>
      </div>

      {list.length === 0 ? (
        <div className="card p-xl grid place-items-center text-center gap-sm">
          <p className="font-serif text-card-title text-ink">{pick({ en: 'No products yet', ar: 'لا توجد منتجات بعد' })}</p>
          <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Add your first product to this channel.', ar: 'أضف أول منتج لهذه القناة.' })}</p>
          <button onClick={() => setEditing('new')} className={buttonClass('primary', 'sm', 'mt-xs')}><Plus size={15} /> {pick({ en: 'New product', ar: 'منتج جديد' })}</button>
        </div>
      ) : (
        categories.map((cat) => {
          const inCat = list.filter((p) => pick(p.category) === cat)
          return (
            <div key={cat} className="flex flex-col gap-sm">
              <h3 className="font-serif text-card-title text-ink">{cat} <span className="font-sans text-caption text-ink-subtle">· {inCat.length}</span></h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-md">
                {inCat.map((p) => (
                  <ProductCard key={p.id} p={p} onEdit={() => setEditing({ id: p.id })}
                    onToggle={() => { toggleStoreVisible(chan, p.id); flash(p.visible ? pick({ en: 'Hidden from storefront', ar: 'أُخفي من المتجر' }) : pick({ en: 'Now on storefront', ar: 'ظاهر في المتجر' })) }} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {editing && (
        <ProductEditor
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : list.find((p) => p.id === editing.id) ?? null}
          catOptions={catOptions}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function ProductCard({ p, onEdit, onToggle }: { p: StoreProduct; onEdit: () => void; onToggle: () => void }) {
  const { pick, money } = useLocale()
  const multi = p.variants.length > 1
  const anyInStock = p.variants.some((v) => v.inStock)
  const coldChain = p.variants.some((v) => v.requiresColdChain)
  return (
    <div className={cn('card overflow-hidden flex flex-col transition-opacity', !p.visible && 'opacity-70')}>
      {/* image — how the card reads on the storefront (uploaded photo, else colour tile) */}
      <div className="relative aspect-[4/3]" style={p.image ? undefined : tile(p.color)}>
        {p.image && <img src={p.image} alt={pick(p.name)} className="absolute inset-0 w-full h-full object-cover" />}
        {p.badges.length > 0 && (
          <div className="absolute top-2 start-2 flex flex-wrap gap-xxs">
            {p.badges.map((b) => { const m = storeBadgeMeta[b]; return <span key={b} className="rounded-pill px-2 py-0.5 font-sans text-caption shadow-sm" style={{ color: m.color, backgroundColor: m.bg }}>{pick(m.label)}</span> })}
          </div>
        )}
        {!p.visible && (
          <div className="absolute inset-0 grid place-items-center bg-canvas-dark/45">
            <span className="inline-flex items-center gap-xxs rounded-pill bg-ink/80 text-ink-on-dark px-3 py-1 font-sans text-caption"><EyeOff size={12} /> {pick({ en: 'Hidden', ar: 'مخفي' })}</span>
          </div>
        )}
      </div>
      {/* body */}
      <div className="flex flex-col gap-xs p-lg flex-1">
        <div className="flex items-start justify-between gap-sm">
          <p className="font-serif text-card-title text-ink leading-tight">{pick(p.name)}</p>
          <span className="font-sans text-data text-ink tabular-nums shrink-0 text-end">
            {multi && <span className="text-caption text-ink-subtle">{pick({ en: 'from ', ar: 'من ' })}</span>}{money(p.priceMinor)}
          </span>
        </div>
        <p className="font-sans text-caption text-ink-subtle line-clamp-2">{pick(p.desc)}</p>
        <div className="flex flex-wrap items-center gap-x-sm gap-y-xxs">
          <span className="font-sans text-caption text-ink-subtle">{p.variants.length} {pick(p.variants.length === 1 ? { en: 'size', ar: 'مقاس' } : { en: 'sizes', ar: 'مقاسات' })}</span>
          {coldChain && <Snowflake size={12} className="text-brand-blue" />}
          {!anyInStock && <span className="font-sans text-caption text-danger">{pick({ en: 'Out of stock', ar: 'غير متوفر' })}</span>}
        </div>
        <div className="flex items-center gap-xs mt-auto pt-sm border-t border-hairline">
          <button onClick={onEdit} className="inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption bg-surface-2 text-ink hover:bg-hairline/60 transition-colors"><Pencil size={13} /> {pick({ en: 'Edit', ar: 'تعديل' })}</button>
          <button onClick={onToggle} className={cn('inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption transition-colors ms-auto', p.visible ? 'text-ink-subtle hover:text-ink hover:bg-surface-2' : 'bg-success/10 text-success hover:bg-success/15')}>
            {p.visible ? <><EyeOff size={13} /> {pick({ en: 'Hide', ar: 'إخفاء' })}</> : <><Eye size={13} /> {pick({ en: 'Show', ar: 'إظهار' })}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const bomNorm = (s: string) => s.trim().toLowerCase()
const bomMatches = (q: string, name: Bilingual) => bomNorm(name.ar).includes(bomNorm(q)) || bomNorm(name.en).includes(bomNorm(q))

function ProductEditor({ product, catOptions, onClose, onSave }: { product: StoreProduct | null; catOptions: Bilingual[]; onClose: () => void; onSave: (d: Draft) => void }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { extraRaws } = useOwnerState()

  // Raw stock products the BOM can draw from, with a per-stock-unit cost derived from purchases
  // (seed raws quote landed cost per costUnit — convert; owner-added items already carry it per unit).
  const bomItems: { name: Bilingual; unit: Bilingual; costPerUnitMinor: number }[] = [
    ...rawMaterials.map((r) => {
      const cu = stockUnits.find((u) => u.label.en === r.costUnit.en || u.label.ar === r.costUnit.ar)
      const su = stockUnits.find((u) => u.label.en === r.unit.en || u.label.ar === r.unit.ar)
      const f = cu && su ? unitFactor(cu.key, su.key) : 1
      return { name: r.name, unit: r.unit, costPerUnitMinor: Math.round(r.landedMinor / Math.max(1, f)) }
    }),
    ...extraRaws.map((x) => ({ name: x.name, unit: x.unit, costPerUnitMinor: x.costMinor })),
  ]
  const bomItemOf = (name: string) => bomItems.find((b) => b.name.en === name || b.name.ar === name)
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(product ? pick(product.name) : '')
  const [desc, setDesc] = useState(product ? pick(product.desc) : '')
  const [category, setCategory] = useState(product ? pick(product.category) : (catOptions[0] ? pick(catOptions[0]) : ''))
  const [variants, setVariants] = useState<StoreVariant[]>(() => (product?.variants?.length ? product.variants.map((v) => ({ ...v })) : [blankVariant('nv-0', product?.priceMinor)]))
  // Seed the new-variant id counter past any existing nv- id, so re-opening a saved product never collides.
  const vid = useRef<number | null>(null)
  if (vid.current === null) vid.current = 1 + variants.reduce((m, v) => (v.id.startsWith('nv-') ? Math.max(m, parseInt(v.id.slice(3), 10) || 0) : m), 0)
  const [color, setColor] = useState(product ? product.color : storeSwatches[0])
  const [image, setImage] = useState<string | null>(product?.image ?? null)
  const [badges, setBadges] = useState<StoreBadge[]>(product ? product.badges : [])
  const [visible, setVisible] = useState(product ? product.visible : true)
  const [sku, setSku] = useState(product?.sku ?? '')
  const [moq, setMoq] = useState(product?.moq ?? 0)
  const [comps, setComps] = useState<CompRow[]>(() => (product?.components ?? []).map((c, i) => ({ id: i, name: c.name, qty: String(c.qty), unit: c.unit })))
  const compId = useRef(product?.components?.length ?? 0)
  const [netWeight, setNetWeight] = useState(product?.netWeight ?? '')
  const [shelfLife, setShelfLife] = useState(product?.shelfLife ?? '')
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const [notes, setNotes] = useState(product?.notes ?? '')
  const valid = name.trim() !== '' && category.trim() !== '' && variants.length > 0 && variants.every((v) => v.netWeightG > 0 && v.retailPriceMinor > 0)
  const toggleBadge = (b: StoreBadge) => setBadges((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
  const setVar = (id: string, patch: Partial<StoreVariant>) => setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  const addVar = () => setVariants((vs) => [...vs, blankVariant(`nv-${vid.current!++}`)])
  const removeVar = (id: string) => setVariants((vs) => (vs.length > 1 ? vs.filter((v) => v.id !== id) : vs))
  const addComp = () => setComps((cs) => [...cs, { id: compId.current++, name: '', qty: '', unit: '' }])
  const setComp = (id: number, patch: Partial<CompRow>) => setComps((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const removeComp = (id: number) => setComps((cs) => cs.filter((c) => c.id !== id))

  const onPick = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { flash(pick({ en: 'Please choose an image file', ar: 'اختر ملف صورة' })); return }
    readResizedImage(file).then(setImage).catch(() => flash(pick({ en: 'Could not read that image', ar: 'تعذّرت قراءة الصورة' })))
  }
  // clean the BOM rows into StoreComponent[] — only rows matched to a raw stock product count,
  // and the unit always comes from that product (never typed).
  const cleanComps = (): StoreComponent[] => comps.filter((c) => bomItemOf(c.name) && parseDec(c.qty) > 0).map((c) => ({ name: c.name.trim(), qty: parseDec(c.qty), unit: pick(bomItemOf(c.name)!.unit) }))

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick(product ? { en: 'Edit product', ar: 'تعديل منتج' } : { en: 'New product', ar: 'منتج جديد' })} title={product ? pick(product.name) : pick({ en: 'New product', ar: 'منتج جديد' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={() => onSave({ name, desc, category, variants, color, image, badges, visible, sku, moq, components: cleanComps(), netWeight, shelfLife, barcode, notes })} disabled={!valid} className={buttonClass('primary', 'sm')}>{product ? pick({ en: 'Save', ar: 'حفظ' }) : pick({ en: 'Create product', ar: 'إنشاء المنتج' })}</button>
      </>}>
      <div className="flex flex-col gap-md">
        {/* product image — upload a photo, or fall back to a colour tile */}
        <div className="flex items-start gap-md">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }} />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={pick({ en: 'Upload product image', ar: 'رفع صورة المنتج' })}
            className="relative w-24 h-24 rounded-lg shrink-0 border border-hairline overflow-hidden group" style={image ? undefined : tile(color)}>
            {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <span className="absolute inset-0 grid place-items-center transition-colors group-hover:bg-canvas-dark/35">
              <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-xxs rounded-pill bg-ink/80 text-ink-on-dark px-2.5 py-1 font-sans text-caption transition-opacity"><Upload size={12} /> {pick(image ? { en: 'Replace', ar: 'استبدال' } : { en: 'Upload', ar: 'رفع' })}</span>
            </span>
          </button>
          <div className="flex flex-col gap-xs flex-1 min-w-0">
            <span className="label">{pick({ en: 'Product image', ar: 'صورة المنتج' })}</span>
            <div className="flex flex-wrap items-center gap-xs">
              <button type="button" onClick={() => fileRef.current?.click()} className={buttonClass('secondary', 'sm')}><Upload size={14} /> {pick(image ? { en: 'Replace image', ar: 'استبدال الصورة' } : { en: 'Upload image', ar: 'رفع صورة' })}</button>
              {image && <button type="button" onClick={() => setImage(null)} className="inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption text-danger hover:bg-danger/10 transition-colors"><Trash2 size={13} /> {pick({ en: 'Remove', ar: 'إزالة' })}</button>}
            </div>
            <span className="font-sans text-caption text-ink-subtle mt-xxs">{pick(image ? { en: 'Shown to customers. Remove to use a colour tile.', ar: 'تظهر للعملاء. أزلها لاستخدام لون البطاقة.' } : { en: 'Or pick a colour tile:', ar: 'أو اختر لون البطاقة:' })}</span>
            <div className={cn('flex flex-wrap gap-xs', image && 'opacity-50')}>
              {storeSwatches.map((s) => (
                <button key={s} type="button" onClick={() => setColor(s)} aria-label={s} className={cn('w-6 h-6 rounded-md border transition-transform', color === s && !image ? 'ring-2 ring-primary ring-offset-1 border-transparent scale-105' : 'border-hairline hover:scale-105')} style={{ backgroundColor: s }} />
              ))}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Product name', ar: 'اسم المنتج' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Short description', ar: 'وصف مختصر' })}</span><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="input resize-none" placeholder={pick({ en: 'One line shown on the product card', ar: 'سطر واحد يظهر على بطاقة المنتج' })} /></label>

        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Category', ar: 'التصنيف' })}</span>
          <CategoryField value={category} onChange={setCategory} options={catOptions.map((c) => pick(c))} placeholder={pick({ en: 'e.g. Gift boxes', ar: 'مثال: بوكسات هدايا' })} />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'SKU', ar: 'رمز الصنف SKU' })}</span><input value={sku} onChange={(e) => setSku(e.target.value)} className="input tabular-nums" placeholder={pick({ en: 'e.g. JAZ-BAR-01', ar: 'مثال: JAZ-BAR-01' })} /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'MOQ (min order)', ar: 'الحد الأدنى للشراء' })}</span><input value={moq || ''} onChange={(e) => setMoq(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
        </div>

        {/* variants & pricing — mirrors the customer product page: weight, packaging, dual pricing, stock, cold chain */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">{pick({ en: 'Variants & pricing', ar: 'الأصناف والتسعير' })}</span>
            <button type="button" onClick={addVar} className="link-gold text-caption inline-flex items-center gap-xxs"><Plus size={13} /> {pick({ en: 'Add variant', ar: 'أضف صنفًا' })}</button>
          </div>
          {variants.map((v, i) => (
            <div key={v.id} className="rounded-lg border border-hairline bg-surface-2/40 p-md flex flex-col gap-sm">
              <div className="flex items-end gap-sm">
                <span className="font-sans text-caption text-ink-subtle pb-2 shrink-0">#{i + 1}</span>
                <label className="flex flex-col gap-xxs flex-1 min-w-0"><span className="label !mb-0">{pick({ en: 'Weight (g)', ar: 'الوزن (غ)' })}</span>
                  <input value={v.netWeightG || ''} onChange={(e) => setVar(v.id, { netWeightG: parseNum(e.target.value) })} className="input py-1.5 tabular-nums" inputMode="numeric" /></label>
                <label className="flex flex-col gap-xxs flex-1 min-w-0"><span className="label !mb-0">{pick({ en: 'Packaging', ar: 'التغليف' })}</span>
                  <select value={v.packaging} onChange={(e) => { const pk = e.target.value as StoreVariant['packaging']; setVar(v.id, pk === 'bulk_case' ? { packaging: pk } : { packaging: pk, caseQty: undefined }) }} className="input py-1.5 cursor-pointer">{storePackaging.map((pk) => <option key={pk.id} value={pk.id}>{pick(pk.label)}</option>)}</select></label>
                {v.packaging === 'bulk_case' && (
                  <label className="flex flex-col gap-xxs w-20 shrink-0"><span className="label !mb-0">{pick({ en: 'Units', ar: 'الوحدات' })}</span>
                    <input value={v.caseQty || ''} onChange={(e) => setVar(v.id, { caseQty: parseNum(e.target.value) || undefined })} className="input py-1.5 tabular-nums" inputMode="numeric" /></label>
                )}
                <button type="button" onClick={() => removeVar(v.id)} disabled={variants.length === 1} aria-label={pick({ en: 'Remove variant', ar: 'حذف الصنف' })} className="grid place-items-center w-9 h-9 shrink-0 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-subtle transition-colors"><Trash2 size={15} /></button>
              </div>
              <div className="flex items-end gap-sm flex-wrap">
                <label className="flex flex-col gap-xxs flex-1 min-w-[92px]"><span className="label !mb-0">{pick({ en: 'Retail (﷼)', ar: 'التجزئة (﷼)' })}</span>
                  <input value={v.retailPriceMinor ? Math.round(v.retailPriceMinor / 100) : ''} onChange={(e) => setVar(v.id, { retailPriceMinor: parseNum(e.target.value) * 100 })} placeholder="0" className="input py-1.5 tabular-nums" inputMode="numeric" /></label>
                <label className="flex flex-col gap-xxs flex-1 min-w-[92px]"><span className="label !mb-0">{pick({ en: 'B2B (﷼)', ar: 'الجملة (﷼)' })}</span>
                  <input value={v.b2bPriceMinor ? Math.round(v.b2bPriceMinor / 100) : ''} onChange={(e) => setVar(v.id, { b2bPriceMinor: parseNum(e.target.value) * 100 })} placeholder="0" className="input py-1.5 tabular-nums" inputMode="numeric" /></label>
                <button type="button" role="switch" aria-checked={v.inStock} onClick={() => setVar(v.id, { inStock: !v.inStock })} className={cn('inline-flex items-center gap-xxs rounded-md px-2.5 py-2 font-sans text-caption border transition-colors', v.inStock ? 'border-success/30 bg-success/10 text-success' : 'border-hairline-strong text-ink-subtle hover:text-ink')}>
                  {v.inStock ? <Check size={12} /> : <EyeOff size={12} />} {pick(v.inStock ? { en: 'In stock', ar: 'متوفر' } : { en: 'Sold out', ar: 'نفد' })}
                </button>
                <button type="button" role="switch" aria-checked={v.requiresColdChain} onClick={() => setVar(v.id, { requiresColdChain: !v.requiresColdChain })} className={cn('inline-flex items-center gap-xxs rounded-md px-2.5 py-2 font-sans text-caption border transition-colors', v.requiresColdChain ? 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue' : 'border-hairline-strong text-ink-subtle hover:text-ink')}>
                  <Snowflake size={12} /> {pick({ en: 'Cold chain', ar: 'تبريد' })}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* components / bill of materials — drawn from raw stock products; cost derives from purchases */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">{pick({ en: 'Components (BOM)', ar: 'مكوّنات المنتج (BOM)' })}</span>
            <button type="button" onClick={addComp} className="link-gold text-caption inline-flex items-center gap-xxs"><Plus size={13} /> {pick({ en: 'Add component', ar: 'إضافة مكوّن' })}</button>
          </div>
          {comps.length === 0
            ? <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Optional — components are picked from raw stock; their cost comes from purchases.', ar: 'اختياري — المكوّنات تُختار من المخزون الخام وتكلفتها من واقع المشتريات.' })}</p>
            : comps.map((c) => {
              const it = bomItemOf(c.name)
              const sugg = !it && c.name.trim() !== '' ? bomItems.filter((b) => bomMatches(c.name, b.name) && !comps.some((o) => o.id !== c.id && bomItemOf(o.name) === b)).slice(0, 6) : []
              const qty = parseDec(c.qty)
              return (
                <div key={c.id} className="flex flex-col gap-xs rounded-lg border border-hairline bg-surface-2/40 px-md py-2">
                  <div className="flex items-center gap-sm">
                    <button type="button" onClick={() => removeComp(c.id)} aria-label={pick({ en: 'Remove', ar: 'حذف' })} className="grid place-items-center w-7 h-7 rounded-md text-danger hover:bg-danger/10 transition-colors shrink-0"><Trash2 size={13} /></button>
                    <input value={c.name} onChange={(e) => setComp(c.id, { name: e.target.value, unit: '' })} placeholder={pick({ en: 'Type to search raw stock…', ar: 'اكتب للبحث في المخزون الخام…' })} className="input flex-1 min-w-0 py-1.5" />
                    <input value={c.qty} onChange={(e) => setComp(c.id, { qty: e.target.value.replace(/[^\d.٠-٩۰-۹]/g, '') })} placeholder="0" className="input w-20 py-1.5 tabular-nums" inputMode="decimal" disabled={!it} />
                    <span className="input w-20 py-1.5 bg-surface-2 text-ink-muted text-center cursor-default select-none">{it ? pick(it.unit) : '—'}</span>
                    <span className="font-sans text-data text-ink tabular-nums w-24 text-end shrink-0">{it && qty > 0 ? money(Math.round(qty * it.costPerUnitMinor)) : '—'}</span>
                  </div>
                  {sugg.length > 0 && (
                    <div className="rounded-md border border-hairline bg-surface-1 shadow-soft max-h-40 overflow-y-auto divide-y divide-hairline">
                      {sugg.map((b) => (
                        <button key={b.name.en} type="button" onClick={() => setComp(c.id, { name: pick(b.name), unit: pick(b.unit) })} className="w-full flex items-center justify-between gap-sm px-3 py-2 text-start hover:bg-surface-2 transition-colors">
                          <span className="font-sans text-data text-ink truncate">{pick(b.name)}</span>
                          <span className="font-sans text-caption text-ink-subtle shrink-0 tabular-nums">{money(b.costPerUnitMinor)} / {pick(b.unit)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!it && c.name.trim() !== '' && sugg.length === 0 && (
                    <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No matching raw stock product', ar: 'لا يوجد منتج مخزون خام مطابق' })}</p>
                  )}
                </div>
              )
            })}
          {(() => {
            const totalMinor = comps.reduce((a, c) => { const it = bomItemOf(c.name); return a + (it ? Math.round(parseDec(c.qty) * it.costPerUnitMinor) : 0) }, 0)
            return totalMinor > 0 ? (
              <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline px-md py-sm">
                <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Components cost — from purchases', ar: 'تكلفة المكوّنات — من واقع المشتريات' })}</span>
                <span className="font-sans text-data text-ink tabular-nums">{money(totalMinor)}</span>
              </div>
            ) : null
          })()}
        </div>

        {/* badges */}
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Badges', ar: 'الشارات' })}</span>
          <div className="flex flex-wrap gap-xs">
            {storeBadgeKeys.map((b) => {
              const m = storeBadgeMeta[b]; const on = badges.includes(b)
              return (
                <button key={b} type="button" onClick={() => toggleBadge(b)} className={cn('inline-flex items-center gap-xxs rounded-pill px-3 py-1 font-sans text-caption border transition-colors', on ? 'border-transparent' : 'border-hairline-strong text-ink-subtle hover:text-ink')} style={on ? { color: m.color, backgroundColor: m.bg } : undefined}>
                  {on && <Check size={12} />} {pick(m.label)}
                </button>
              )
            })}
          </div>
        </div>

        {/* visibility — new products publish by default; edit exposes the toggle */}
        {product && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline p-md">
            <div className="flex flex-col"><span className="font-sans text-data text-ink">{pick({ en: 'Visible on storefront', ar: 'ظاهر في المتجر' })}</span><span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Customers can see and buy this product', ar: 'يمكن للعملاء رؤيته وشراؤه' })}</span></div>
            <button type="button" role="switch" aria-checked={visible} onClick={() => setVisible((v) => !v)} className={cn('relative w-11 h-6 rounded-pill transition-colors shrink-0', visible ? 'bg-success' : 'bg-hairline-strong')}><span className={cn('absolute top-0.5 w-5 h-5 rounded-pill bg-surface-1 shadow-sm transition-all', visible ? 'start-[22px]' : 'start-0.5')} /></button>
          </div>
        )}

        {/* additional properties */}
        <div className="flex flex-col gap-md pt-sm border-t border-hairline">
          <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{pick({ en: 'Other · additional properties', ar: 'أخرى · خصائص إضافية' })}</span>
          <div className="grid grid-cols-2 gap-md">
            <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Net weight', ar: 'الوزن الصافي' })}</span><input value={netWeight} onChange={(e) => setNetWeight(e.target.value)} className="input" placeholder={pick({ en: 'e.g. 90 g', ar: 'مثال: 90 غ' })} /></label>
            <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Shelf life', ar: 'مدة الصلاحية' })}</span><input value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} className="input" placeholder={pick({ en: 'e.g. 12 months', ar: 'مثال: 12 شهرًا' })} /></label>
          </div>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Barcode', ar: 'الباركود' })}</span><input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input tabular-nums" placeholder="628…" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Notes', ar: 'ملاحظات' })}</span><input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder={pick({ en: 'Internal notes about the product', ar: 'ملاحظات داخلية عن المنتج' })} /></label>
        </div>
      </div>
    </Modal>
  )
}

/** RTL-aware category combobox — type to filter/add, or pick an existing one. Replaces the glitchy native <datalist>. */
function CategoryField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const q = value.trim().toLowerCase()
  const shown = q ? options.filter((o) => o.toLowerCase().includes(q)) : options

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() } }}
        placeholder={placeholder}
        className="input pe-9"
        role="combobox" aria-expanded={open} aria-autocomplete="list"
      />
      <button type="button" tabIndex={-1} onClick={() => setOpen((o) => !o)} aria-label="toggle list"
        className="absolute inset-y-0 end-0 grid place-items-center w-9 text-ink-subtle hover:text-ink">
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && shown.length > 0 && (
        <ul className="absolute z-20 top-full inset-x-0 mt-xxs max-h-52 overflow-y-auto rounded-md border border-hairline bg-surface-1 shadow-soft-lg py-xs">
          {shown.map((o) => (
            <li key={o}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false) }}
                className={cn('w-full text-start px-md py-2 font-sans text-data transition-colors hover:bg-surface-2', o === value ? 'text-primary-hover' : 'text-ink')}>
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
