import { useState } from 'react'
import { Plus, Layers } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { prodChannelMeta, type ProdChannel, type OwnerProduct } from '@/data/ownerProducts'
import { rawMaterials, stockUnits, unitFactor, type RawKey } from '@/data/ownerSupply'
import { useOwnerState } from '@/state/OwnerStateContext'
import { useGovernance } from '@/state/GovernanceContext'
import { PRICE_MOVE_TOLERANCE } from '@/data/governance'
import { cn } from '@/lib/cn'
import { PanelHead, Pill } from './_shared'

const rawName = (k: string) => rawMaterials.find((m) => m.key === k)?.name ?? { en: k, ar: k }

/** Product management panel. The active sales channel is driven by the sidebar sub-nav (see AdminConsole). */
export function OwnerProducts({ view: chan }: { view: ProdChannel }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { products, buildable, addProduct } = useOwnerState()
  const [sel, setSel] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState<{ category?: string } | null>(null)

  const meta = prodChannelMeta[chan]
  const list = products[chan]
  const categories = [...new Set(list.map((p) => pick(p.category)))]
  const selected = list.find((p) => p.sku === sel) ?? null

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Production', ar: 'الإنتاج' })} subtitle={pick({ en: 'By sales channel · buildable qty from raw stock', ar: 'حسب قناة البيع · القابلية للإنتاج من المخزون الخام' })}
        action={<button onClick={() => setAddOpen({})} className={buttonClass('secondary', 'sm')}><Plus size={15} /> {pick({ en: 'Add product', ar: 'أضف منتجًا' })}</button>} />

      <div className="flex items-center gap-sm">
        <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-muted"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: meta.color }} /> {pick(meta.label)}</span>
        <Pill color={meta.color} bg={meta.color + '18'}>{meta.needsMoq ? pick({ en: 'Requires MOQ', ar: 'يتطلّب حدًّا أدنى' }) : pick({ en: 'Sold per piece', ar: 'بيع بالقطعة' })}</Pill>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-sm">
          <div className="flex items-center justify-between"><h3 className="font-serif text-card-title text-ink">{cat}</h3><button onClick={() => setAddOpen({ category: cat })} className="link-gold text-caption">＋ {pick({ en: 'Add', ar: 'أضف' })}</button></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-sm">
            {list.filter((p) => pick(p.category) === cat).map((p) => {
              const { qty, bottleneck } = buildable(p.sku)
              const low = qty < meta.threshold
              return (
                <button key={p.sku} onClick={() => setSel(p.sku)} className="card card-hover p-lg text-start flex flex-col gap-sm">
                  <div className="flex items-start gap-sm">
                    <span className="w-10 h-10 rounded-md shrink-0" style={{ backgroundColor: p.color, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.13) 0 2px, transparent 2px 9px)' }} />
                    <div className="min-w-0 flex-1"><p className="font-sans text-data text-ink truncate">{pick(p.name)}</p><p className="font-sans text-caption text-ink-subtle tabular-nums">{p.sku}</p></div>
                    <span className="font-sans text-data text-ink tabular-nums">{money(p.priceMinor)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-sm border-t border-hairline">
                    <span className="inline-flex items-center gap-xxs font-sans text-caption text-ink-subtle"><Layers size={12} /> {p.components} {pick({ en: 'components', ar: 'مكوّن' })}{meta.needsMoq && ` · MOQ ${p.moq}`}</span>
                    <span className={cn('font-sans text-caption tabular-nums', low ? 'text-danger' : 'text-success')}>{qty.toLocaleString()} {pick({ en: 'buildable', ar: 'قابل للإنتاج' })}</span>
                  </div>
                  {low && bottleneck && <p className="font-sans text-caption text-danger">{pick({ en: 'Limited by', ar: 'محدود بـ' })} {pick(rawName(bottleneck))}</p>}
                  {p.components === 0 && <p className="font-sans text-caption text-primary-hover">{pick({ en: 'No BOM yet — add components to build', ar: 'لا توجد قائمة مكوّنات — أضف مكوّنات للإنتاج' })}</p>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {selected && <ProductModal key={selected.sku} chan={chan} product={selected} onClose={() => setSel(null)} />}
      {/* key={chan} → remounts so MOQ/defaults re-init from the current channel's meta */}
      <AddProductModal key={chan} open={!!addOpen} category={addOpen?.category} chan={chan} onClose={() => setAddOpen(null)}
        onCreate={(p) => { addProduct(chan, p); flash(`${pick({ en: 'Product created', ar: 'أُنشئ المنتج' })} · ${pick(p.name)}`) }} />
    </div>
  )
}

function ProductModal({ chan, product, onClose }: { chan: ProdChannel; product: OwnerProduct; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { buildable, produceBatch, bomOf, updateProduct, addBomComponent, shelfLife, bomHistory } = useOwnerState()
  const { submit } = useGovernance()
  const meta = prodChannelMeta[chan]
  const [price, setPrice] = useState(Math.round(product.priceMinor / 100))
    const [moqVal, setMoqVal] = useState(product.moq)
    const [produceQty, setProduceQty] = useState(0)
    const [compKey, setCompKey] = useState<RawKey>('cacao')
    const [compPer, setCompPer] = useState('')
    const [shelf, setShelf] = useState(String(shelfLife[product.sku] ?? 90))
    const { qty, bottleneck } = buildable(product.sku)
    const bom = bomOf(product.sku)
    const versions = bomHistory[product.sku] ?? []
    // What the recipe costs to make one unit — the floor a price should not quietly fall below.
    const unitCostMinor = (Object.keys(bom) as RawKey[]).reduce((a, k) => {
      const m = rawMaterials.find((r) => r.key === k)
      if (!m) return a
      const cu = stockUnits.find((u) => u.label.en === m.costUnit.en)
      const su = stockUnits.find((u) => u.label.en === m.unit.en)
      const perUnit = Math.round(m.landedMinor / Math.max(1, cu && su ? unitFactor(cu.key, su.key) : 1))
      return a + Math.round((bom[k] ?? 0) * perUnit)
    }, 0)

    const save = () => {
      const nextMinor = price * 100
      const moved = Math.abs(nextMinor - product.priceMinor) / Math.max(product.priceMinor, 1)
      const belowCost = unitCostMinor > 0 && nextMinor < unitCostMinor
      // Two gates, and the second is the one that matters: a swing is worth a second look,
      // but a price under its own cost should never slip through unnoticed.
      if (nextMinor !== product.priceMinor && (moved > PRICE_MOVE_TOLERANCE || belowCost)) {
        submit({
          kind: 'price_change',
          subject: { en: product.name.en, ar: product.name.ar },
          detail: belowCost
            ? { en: `Set price to ${nextMinor / 100} — below its ${unitCostMinor / 100} unit cost`, ar: `ضبط السعر على ${nextMinor / 100} — دون تكلفته ${unitCostMinor / 100}` }
            : { en: `Move price from ${product.priceMinor / 100} to ${nextMinor / 100} (${Math.round(moved * 100)}%)`, ar: `تحريك السعر من ${product.priceMinor / 100} إلى ${nextMinor / 100} (${Math.round(moved * 100)}٪)` },
          reason: '', payload: { sku: product.sku, chan, priceMinor: nextMinor },
        })
        // MOQ is not a guarded field — it saves either way.
        if (moqVal !== product.moq) updateProduct(chan, product.sku, { moq: moqVal })
        flash(pick({ en: 'Price sent for approval — it is unchanged for now', ar: 'رُفع السعر للاعتماد — ولم يتغير بعد' }))
        onClose(); return
      }
      updateProduct(chan, product.sku, { priceMinor: nextMinor, moq: moqVal })
      flash(pick({ en: 'Product saved', ar: 'حُفظ المنتج' })); onClose()
    }

    // A live product's formulation is not an operational tweak: it moves taste, cost and
    // what the line can build. Editing one raises a decision; a product with no recipe yet
    // is still being defined, so its first components go in directly.
    const isLive = Object.keys(bom).length > 0
    const addComponent = () => {
      const per = parseFloat(compPer)
      if (!(per > 0)) return
      const name = rawName(compKey)
      if (isLive) {
        submit({
          kind: 'recipe_change',
          subject: { en: `${product.name.en} · ${name.en}`, ar: `${product.name.ar} · ${name.ar}` },
          detail: { en: `Set ${name.en} to ${per} per unit (was ${bom[compKey] ?? 0})`, ar: `ضبط ${name.ar} على ${per} لكل وحدة (كان ${bom[compKey] ?? 0})` },
          reason: '', payload: { sku: product.sku, rawKey: compKey, per },
        })
        flash(pick({ en: 'Sent to the chef — the recipe is unchanged', ar: 'أُرسلت للشيف — الوصفة لم تتغير' }))
      } else {
        addBomComponent(chan, product.sku, compKey, per)
        flash(`${pick({ en: 'Component added', ar: 'أُضيف مكوّن' })} · ${pick(name)}`)
      }
      setCompPer('')
    }

    const saveShelf = () => {
      const days = Math.max(1, parseInt(shelf.replace(/\D/g, ''), 10) || 0)
      submit({
        kind: 'shelf_life',
        subject: { en: product.name.en, ar: product.name.ar },
        detail: { en: `Set shelf life to ${days} days for every batch of this product`, ar: `ضبط العمر الافتراضي على ${days} يومًا لكل دفعة من هذا المنتج` },
        reason: '', payload: { sku: product.sku, days },
      })
      flash(pick({ en: 'Sent to the chef for approval', ar: 'أُرسلت للشيف للاعتماد' }))
    }

    return (
      <Modal open onClose={onClose} size="md" eyebrow={product.sku} title={pick(product.name)}
        footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={save} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save', ar: 'حفظ' })}</button></>}>
        <div className="flex flex-col gap-md">
          <div className="grid grid-cols-2 gap-md">
            <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Price (﷼)', ar: 'السعر (﷼)' })}</span>
              <input value={price} onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className={cn('input tabular-nums', unitCostMinor > 0 && price * 100 < unitCostMinor && 'border-danger')} inputMode="numeric" />
              {unitCostMinor > 0 && <span className={cn('font-sans text-caption tabular-nums', price * 100 < unitCostMinor ? 'text-danger' : 'text-ink-subtle')}>{pick({ en: 'Recipe cost', ar: 'تكلفة الوصفة' })}: {money(unitCostMinor)}{price * 100 < unitCostMinor && ` · ${pick({ en: 'below cost', ar: 'دون التكلفة' })}`}</span>}
            </label>
            {meta.needsMoq && <label className="flex flex-col gap-xs"><span className="label">MOQ</span><input value={moqVal} onChange={(e) => setMoqVal(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className="input tabular-nums" inputMode="numeric" /></label>}
          </div>
          <div className="rounded-lg bg-surface-2 border border-hairline p-md flex items-center justify-between">
            <span className="font-sans text-data text-ink-muted">{pick({ en: 'Buildable now', ar: 'قابل للإنتاج الآن' })}</span>
            <span className={cn('font-serif text-card-title tabular-nums', qty === 0 ? 'text-danger' : 'text-ink')}>{qty.toLocaleString()}</span>
          </div>

          {/* live BOM list */}
          <div className="rounded-lg border border-hairline overflow-hidden">
            <div className="px-md py-2 bg-surface-2 border-b border-hairline flex items-center justify-between"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Bill of materials', ar: 'قائمة المكوّنات' })}</span>{bottleneck && <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Bottleneck', ar: 'المُقيّد' })}: {pick(rawName(bottleneck))}</span>}</div>
            {Object.keys(bom).length === 0 ? (
              <p className="px-md py-sm font-sans text-caption text-ink-subtle">{pick({ en: 'No components yet.', ar: 'لا توجد مكوّنات بعد.' })}</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {(Object.keys(bom) as RawKey[]).map((k) => (
                  <li key={k} className="flex items-center justify-between px-md py-2 font-sans text-caption"><span className="text-ink">{pick(rawName(k))}</span><span className="text-ink-subtle tabular-nums">{bom[k]} {pick(rawMaterials.find((m) => m.key === k)!.unit)} / {pick({ en: 'unit', ar: 'وحدة' })}</span></li>
                ))}
              </ul>
            )}
          </div>

          {/* add component → extends BOM, updates buildable */}
          <div className="rounded-lg border border-hairline p-md flex flex-wrap items-end gap-sm">
            <label className="flex flex-col gap-xs flex-1 min-w-[120px]"><span className="label">{pick({ en: 'Raw material', ar: 'مادة خام' })}</span>
              <select value={compKey} onChange={(e) => setCompKey(e.target.value as RawKey)} className="input cursor-pointer">{rawMaterials.map((m) => <option key={m.key} value={m.key}>{pick(m.name)}</option>)}</select></label>
            <label className="flex flex-col gap-xs w-28"><span className="label">{pick({ en: 'Per unit', ar: 'لكل وحدة' })}</span><input value={compPer} onChange={(e) => setCompPer(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" className="input tabular-nums" inputMode="decimal" /></label>
            <button onClick={addComponent} disabled={!(parseFloat(compPer) > 0)} className={buttonClass('ghost', 'sm')}>
              <Plus size={14} /> {isLive ? pick({ en: 'Request change', ar: 'طلب تعديل' }) : pick({ en: 'Add component', ar: 'أضف مكوّنًا' })}</button>
            {isLive && <p className="w-full font-sans text-caption text-ink-subtle">{pick({ en: 'This product is live — a formulation change needs the chef’s approval, and the recipe it replaces is kept.', ar: 'هذا المنتج قائم — تعديل التركيبة يحتاج اعتماد الشيف، وتُحفظ الوصفة التي يستبدلها.' })}</p>}
          </div>

          {/* shelf life — a property of the product, inherited by every batch it produces */}
          <div className="rounded-lg border border-hairline p-md flex flex-wrap items-end gap-sm">
            <label className="flex flex-col gap-xs flex-1 min-w-[120px]"><span className="label">{pick({ en: 'Shelf life (days)', ar: 'العمر الافتراضي (يوم)' })}</span>
              <input value={shelf} onChange={(e) => setShelf(e.target.value.replace(/\D/g, ''))} className="input tabular-nums" inputMode="numeric" placeholder="90" /></label>
            <button onClick={saveShelf} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Request change', ar: 'طلب تعديل' })}</button>
            <p className="w-full font-sans text-caption text-ink-subtle">{pick({ en: 'Every batch produced from this product inherits it — nobody extends an expiry by typing a bigger number on a batch.', ar: 'ترثه كل دفعة تُنتج من هذا المنتج — فلا يمدّد أحد صلاحية بكتابة رقم أكبر على الدفعة.' })}</p>
          </div>

          {/* formulation history */}
          {versions.length > 0 && (
            <div className="rounded-lg border border-hairline overflow-hidden">
              <div className="px-md py-2 bg-surface-2 border-b border-hairline font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Recipe history', ar: 'سجل الوصفات' })} · {versions.length}</div>
              <ul className="divide-y divide-hairline">
                {versions.map((v, i) => (
                  <li key={i} className="px-md py-2 font-sans text-caption">
                    <span className="text-ink">{pick(v.by)}</span> <span className="text-ink-subtle">· {pick(v.at)}</span>
                    <span className="block text-ink-subtle tabular-nums">{(Object.keys(v.after) as RawKey[]).map((k) => `${pick(rawName(k))} ${v.before[k] ?? 0}→${v.after[k]}`).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* produce → consumes raw, adds finished stock */}
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-md flex flex-wrap items-end gap-sm">
            <label className="flex flex-col gap-xs flex-1 min-w-[120px]"><span className="label">{pick({ en: 'Produce qty', ar: 'كمية الإنتاج' })}</span>
              <input value={produceQty || ''} onChange={(e) => setProduceQty(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} placeholder="0" className="input tabular-nums" inputMode="numeric" /></label>
            <button
              onClick={() => {
                if (produceBatch(product.sku, produceQty)) { flash(`${pick({ en: 'Produced', ar: 'أُنتج' })} ${produceQty.toLocaleString()} · ${pick(product.name)}`); setProduceQty(0); onClose() }
                else flash(pick({ en: 'Not enough raw material', ar: 'المواد الخام غير كافية' }))
              }}
              disabled={produceQty <= 0 || produceQty > qty}
              className={buttonClass('primary', 'sm')}>{pick({ en: 'Produce batch', ar: 'إنتاج دفعة' })}</button>
          </div>
        </div>
      </Modal>
    )
}

function AddProductModal({ open, category, chan, onClose, onCreate }: { open: boolean; category?: string; chan: ProdChannel; onClose: () => void; onCreate: (p: { name: Bilingual; category: Bilingual; priceMinor: number; moq: number }) => void }) {
  const { pick } = useLocale()
  const meta = prodChannelMeta[chan]
  const [name, setName] = useState('')
  const [cat, setCat] = useState('')
  const [price, setPrice] = useState(0)
  const [moqVal, setMoqVal] = useState(meta.needsMoq ? 10 : 0)
  const catValue = category ?? cat
  const valid = name.trim() !== '' && catValue.trim() !== '' && price > 0
  const reset = () => { setName(''); setCat(''); setPrice(0); setMoqVal(meta.needsMoq ? 10 : 0) }
  const submit = () => { onCreate({ name: { en: name, ar: name }, category: { en: catValue, ar: catValue }, priceMinor: price * 100, moq: moqVal }); reset(); onClose() }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={pick(meta.label)} title={pick({ en: 'New product', ar: 'منتج جديد' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Create product', ar: 'إنشاء المنتج' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Product name', ar: 'اسم المنتج' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" /></label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Category', ar: 'التصنيف' })}</span>
          {category ? <input value={category} disabled className="input opacity-70" /> : <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder={pick({ en: 'e.g. Gift boxes', ar: 'مثال: بوكسات هدايا' })} className="input" />}</label>
        <div className="flex gap-md">
          <label className="flex flex-col gap-xs flex-1"><span className="label">{pick({ en: 'Price (﷼)', ar: 'السعر (﷼)' })}</span><input value={price || ''} onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} placeholder="0" className="input tabular-nums" inputMode="numeric" /></label>
          {meta.needsMoq && <label className="flex flex-col gap-xs flex-1"><span className="label">MOQ</span><input value={moqVal} onChange={(e) => setMoqVal(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className="input tabular-nums" inputMode="numeric" /></label>}
        </div>
        <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'After creating, open the product to add its bill of materials — buildable qty appears once components are set.', ar: 'بعد الإنشاء، افتح المنتج لإضافة قائمة مكوّناته — تظهر القابلية للإنتاج بعد تحديد المكوّنات.' })}</p>
      </div>
    </Modal>
  )
}
