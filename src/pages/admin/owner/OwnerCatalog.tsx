import { useState } from 'react'
import { Eye, EyeOff, Minus, Plus, GripVertical, Pencil, Check, X } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { catCounts, b2cCatalog, stdCatalog, stdVolumeTiers, megaCatalog } from '@/data/ownerCatalog'
import type { ProdChannel } from '@/data/ownerProducts'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, SegTabs, Pill } from './_shared'

export function OwnerCatalog() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { catalog, catNodes, toggleCategory, renameCategory, addCategory, moveCategory, setCatalogPrice, toggleCatalogItem, setCatalogMoq, contracts } = useOwnerState()
  const [chan, setChan] = useState<ProdChannel>('b2c')
  const [contractsOpen, setContractsOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [adding, setAdding] = useState(false)
  const [addVal, setAddVal] = useState('')

  const tabs = [
    { id: 'b2c' as const, label: `${pick({ en: 'B2C', ar: 'B2C' })} · ${catCounts.b2c}` },
    { id: 'b2b' as const, label: `${pick({ en: 'B2B std', ar: 'B2B قياسي' })} · ${catCounts.b2b}` },
    { id: 'mega' as const, label: `${pick({ en: 'B2B mega', ar: 'B2B ضخم' })} · ${catCounts.mega}` },
  ]
  const nodes = catNodes(chan)
  const commitAdd = () => { if (addVal.trim()) { addCategory(chan, { en: addVal.trim(), ar: addVal.trim() }); flash(pick({ en: 'Category added', ar: 'أُضيف التصنيف' })) } setAdding(false); setAddVal('') }
  const commitRename = (id: string) => { if (renameVal.trim()) { renameCategory(id, { en: renameVal.trim(), ar: renameVal.trim() }); flash(pick({ en: 'Category renamed', ar: 'أُعيدت التسمية' })) } setRenaming(null); setRenameVal('') }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Catalog & pricing', ar: 'الكتالوج والأسعار' })} subtitle={pick({ en: 'Category tree, per-channel pricing and contracts', ar: 'شجرة التصنيفات والتسعير لكل قناة والعقود' })}
        action={<button onClick={() => setContractsOpen(true)} className={buttonClass('secondary', 'sm')}>{pick({ en: 'Manage contracts', ar: 'إدارة العقود' })}</button>} />
      <SegTabs tabs={tabs} active={chan} onChange={setChan} />

      <div className="grid lg:grid-cols-[300px_1fr] gap-lg items-start">
        {/* category tree — drag to reorder, rename, hide, add */}
        <div className="card overflow-hidden lg:sticky lg:top-28">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Categories', ar: 'التصنيفات' })}</h3>
            <button onClick={() => { setAdding(true); setAddVal('') }} className="link-gold text-caption" aria-label={pick({ en: 'Add category', ar: 'أضف تصنيفًا' })}>＋</button>
          </div>
          {adding && (
            <div className="flex items-center gap-xs px-lg py-2.5 bg-primary/[0.04] border-b border-hairline">
              <input autoFocus value={addVal} onChange={(e) => setAddVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setAdding(false); setAddVal('') } }} placeholder={pick({ en: 'New category name', ar: 'اسم التصنيف الجديد' })} className="input flex-1 py-1.5" />
              <button onClick={commitAdd} className="grid place-items-center w-8 h-8 rounded-md bg-primary/10 text-primary-hover hover:bg-primary/15"><Check size={15} /></button>
              <button onClick={() => { setAdding(false); setAddVal('') }} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-ink"><X size={15} /></button>
            </div>
          )}
          <ul className="divide-y divide-hairline">
            {nodes.map((n) => {
              const isHidden = catalog.catHidden[n.id]
              const isRenaming = renaming === n.id
              return (
                <li key={n.id}
                  draggable={!isRenaming}
                  onDragStart={() => setDragId(n.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragId) { moveCategory(chan, dragId, n.id); setDragId(null) } }}
                  className={cn('flex items-center gap-sm px-lg py-2.5 transition-colors', isHidden && 'opacity-50', dragId === n.id && 'bg-primary/[0.06]', !isRenaming && 'cursor-grab active:cursor-grabbing')}
                  style={{ paddingInlineStart: 16 + n.depth * 20 }}>
                  <GripVertical size={13} className="text-ink-subtle shrink-0" />
                  {isRenaming ? (
                    <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(n.id); if (e.key === 'Escape') { setRenaming(null); setRenameVal('') } }} onBlur={() => commitRename(n.id)} className="input flex-1 py-1 text-data" />
                  ) : (
                    <span className="flex-1 min-w-0 font-sans text-data text-ink truncate">{pick(n.label)}</span>
                  )}
                  <span className="font-sans text-caption text-ink-subtle tabular-nums">{n.count}</span>
                  <button onClick={() => { setRenaming(n.id); setRenameVal(pick(n.label)) }} className="text-ink-subtle hover:text-ink" aria-label={pick({ en: 'Rename', ar: 'إعادة تسمية' })}><Pencil size={13} /></button>
                  <button onClick={() => { toggleCategory(n.id); flash(isHidden ? pick({ en: 'Category shown', ar: 'أُظهر التصنيف' }) : pick({ en: 'Category hidden', ar: 'أُخفي التصنيف' })) }} className="text-ink-subtle hover:text-ink" aria-label={pick({ en: 'Toggle visibility', ar: 'إظهار/إخفاء' })}>{isHidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* channel config */}
        <div className="flex flex-col gap-md">
          {chan === 'b2c' && b2cCatalog.map((it) => {
            const hid = catalog.itemHidden[it.id]
            const priceMinor = catalog.price[it.id] ?? it.priceMinor
            return (
              <div key={it.id} className="card p-lg flex flex-wrap items-center gap-md">
                <div className="flex-1 min-w-[160px]">
                  <p className="font-sans text-data text-ink">{pick(it.name)}</p>
                  {it.lowStock && <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Low stock', ar: 'مخزون منخفض' })}</Pill>}
                </div>
                <label className="flex flex-col gap-xs w-32"><span className="label">{pick({ en: 'Price', ar: 'السعر' })}</span><input value={Math.round(priceMinor / 100)} onChange={(e) => setCatalogPrice(it.id, (parseInt(e.target.value.replace(/\D/g, ''), 10) || 0) * 100)} className="input tabular-nums py-1.5" inputMode="numeric" /></label>
                <button type="button" role="switch" aria-checked={!hid} onClick={() => { toggleCatalogItem(it.id); flash(hid ? pick({ en: 'Published', ar: 'نُشر' }) : pick({ en: 'Unpublished', ar: 'أُلغي النشر' })) }} className={cn('relative w-11 h-6 rounded-pill transition-colors shrink-0', !hid ? 'bg-success' : 'bg-hairline-strong')}><span className={cn('absolute top-0.5 w-5 h-5 rounded-pill bg-surface-1 shadow-sm transition-all', !hid ? 'start-[22px]' : 'start-0.5')} /></button>
              </div>
            )
          })}

          {chan === 'b2b' && stdCatalog.map((it) => {
            const q = catalog.moq[it.id] ?? it.moq
            return (
              <div key={it.id} className="card p-lg flex flex-col gap-md">
                <div className="flex items-center justify-between gap-sm">
                  <p className="font-sans text-data text-ink">{pick(it.name)}</p>
                  <span className="font-sans text-data text-ink tabular-nums">{money(it.basePriceMinor)}</span>
                </div>
                <div className="flex items-center gap-md flex-wrap">
                  <div className="flex items-center gap-xs"><span className="label !mb-0">MOQ</span>
                    <div className="inline-flex items-center bg-surface-2 border border-hairline-strong rounded-md overflow-hidden">
                      <button onClick={() => setCatalogMoq(it.id, Math.max(1, q - 1))} className="grid place-items-center w-8 h-9 text-primary-hover hover:bg-hairline/50"><Minus size={14} /></button>
                      <span className="w-10 text-center font-sans font-semibold tabular-nums">{q}</span>
                      <button onClick={() => setCatalogMoq(it.id, q + 1)} className="grid place-items-center w-8 h-9 text-primary-hover hover:bg-hairline/50"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-xs flex-1 justify-end">
                    {stdVolumeTiers.map((tier, i) => (
                      <div key={i} className={cn('rounded-md border px-3 py-1.5 text-center', tier.discount > 0 ? 'border-success/30 bg-success/8' : 'border-hairline')}>
                        <p className="font-sans text-caption text-ink-subtle tabular-nums">{pick(tier.range)}</p>
                        <p className="font-sans text-data tabular-nums" style={{ color: tier.discount > 0 ? '#355c4b' : '#241712' }}>{money(Math.round(it.basePriceMinor * (1 - tier.discount / 100)), { withSymbol: false })}{tier.discount > 0 && <span className="text-caption"> −{tier.discount}%</span>}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {chan === 'mega' && megaCatalog.map((it) => {
            const pallets = Math.floor(76 / it.cbm)
            const perKg = it.priceMinor / it.grossKg
            return (
              <div key={it.id} className="card p-lg flex flex-col gap-sm">
                <div className="flex items-center justify-between"><p className="font-sans text-data text-ink">{pick(it.name)}</p><span className="font-sans text-data text-ink tabular-nums">{money(it.priceMinor)}</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-md pt-sm border-t border-hairline">
                  {([[{ en: 'CBM', ar: 'م³' }, `${it.cbm}`], [{ en: 'Gross kg', ar: 'وزن كجم' }, `${it.grossKg}`], [{ en: 'Per truck', ar: 'لكل شاحنة' }, `${pallets} ${pick({ en: 'pallets', ar: 'طبلية' })}`], [{ en: 'Per kg', ar: 'لكل كجم' }, money(Math.round(perKg))]] as const).map(([l, v], i) => (
                    <div key={i} className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(l)}</span><span className="font-sans text-data text-ink tabular-nums">{v}</span></div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* active contracts summary — Manage contracts opens the editor */}
          <div className="card overflow-hidden mt-sm">
            <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Active contracts', ar: 'العقود الفعّالة' })}</h3>
              <button onClick={() => setContractsOpen(true)} className="link-gold text-caption">{pick({ en: 'Manage', ar: 'إدارة' })}</button>
            </div>
            <ul className="divide-y divide-hairline">
              {contracts.map((c) => (
                <li key={c.id} className="flex items-center gap-md px-lg py-md">
                  <div className="flex-1 min-w-0"><p className="font-sans text-data text-ink truncate">{pick(c.account)}</p><p className="font-sans text-caption text-ink-subtle">−{c.discount}% · {pick(c.terms)}</p></div>
                  <Pill color={c.status === 'active' ? '#355c4b' : '#8a6b3f'} bg={c.status === 'active' ? '#e8f0ec' : '#f6edde'}>{c.status === 'active' ? pick({ en: 'Active', ar: 'فعّال' }) : pick({ en: 'Renew', ar: 'تجديد' })}</Pill>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ContractsModal open={contractsOpen} onClose={() => setContractsOpen(false)} />
    </div>
  )
}

function ContractsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { contracts, renewContract } = useOwnerState()
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={pick({ en: 'B2B', ar: 'B2B' })} title={pick({ en: 'Contracts', ar: 'العقود' })}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      <ul className="divide-y divide-hairline -my-1">
        {contracts.map((c) => (
          <li key={c.id} className="flex items-center gap-md py-md">
            <div className="flex-1 min-w-0"><p className="font-sans text-data text-ink truncate">{pick(c.account)}</p><p className="font-sans text-caption text-ink-subtle">−{c.discount}% · {pick(c.terms)}</p></div>
            {c.status === 'active'
              ? <Pill color="#355c4b" bg="#e8f0ec">{pick({ en: 'Active', ar: 'فعّال' })}</Pill>
              : <button onClick={() => { renewContract(c.id); flash(`${pick({ en: 'Renewed', ar: 'جُدّد' })} · ${pick(c.account)}`) }} className="inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption bg-primary/10 text-primary-hover hover:bg-primary/15 transition-colors">{pick({ en: 'Renew', ar: 'تجديد' })}</button>}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
