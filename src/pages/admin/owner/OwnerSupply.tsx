import { Fragment, useState } from 'react'
import { Lock, ClipboardCheck, Check, Plus, Eye, FileText, X } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import {
  rawMaterials, stockUnits, unitFactor, type PurchaseMatch, type RawKey, type ExtraRaw, type Supplier,
} from '@/data/ownerSupply'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, Pill, UtilBar } from './_shared'

// Whole-number parser: normalize Arabic digits, take the integer part (so a stray "1500.50" can't concatenate to 150050).
const parseNum = (s: string) => Math.max(0, parseInt(toAsciiDigits(s).replace(/[^\d.]/g, '').split('.')[0] || '0', 10) || 0)

const matchMeta: Record<PurchaseMatch, { label: { en: string; ar: string }; color: string; bg: string }> = {
  matched: { label: { en: 'Matched', ar: 'مطابقة تامة' }, color: '#355c4b', bg: '#e8f0ec' },
  pending: { label: { en: 'Pending match', ar: 'بانتظار المطابقة' }, color: '#8a6b3f', bg: '#f6edde' },
  flagged: { label: { en: 'Variance', ar: 'فرق يتطلّب مراجعة' }, color: '#b5403b', bg: '#faeceb' },
}

/** Supply chain panel. The active sub-view is driven by the sidebar sub-nav (see AdminConsole). */
export function OwnerSupply({ view = 'po' }: { view?: 'po' | 'raw' | 'finished' | 'suppliers' }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { invoices, reconcileInvoice, receivePurchase } = useOwnerState()
  const [invoiceOpen, setInvoiceOpen] = useState(false)

  const matched = invoices.filter((iv) => iv.match === 'matched').length
  const pending = invoices.filter((iv) => iv.match === 'pending').length
  const flagged = invoices.filter((iv) => iv.match === 'flagged').length

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Supply chain', ar: 'سلسلة الإمداد' })} subtitle={pick({ en: 'Procurement, inventory and suppliers', ar: 'المشتريات والمخزون والموردين' })} />

      {view === 'po' && (
        <div className="flex flex-col gap-md">
          {/* section header */}
          <div className="flex flex-wrap items-start justify-between gap-md">
            <div className="min-w-0">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Purchase invoices', ar: 'فواتير المشتريات' })}</h3>
              <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-xl">{pick({ en: 'Enter supplier invoices against raw-material lines · imported cost and stock balance update automatically', ar: 'إدخال فواتير الموردين على بنود المواد الخام · تُحدّث التكلفة المستوردة ورصيد المخزون آليًا' })}</p>
            </div>
            <button onClick={() => setInvoiceOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'Enter purchase invoice', ar: 'إدخال فاتورة مشتريات' })}</button>
          </div>

          {/* match summary */}
          <div className="flex flex-wrap items-center gap-sm">
            <Pill color="#355c4b" bg="#e8f0ec">{matched} {pick({ en: 'matched', ar: 'مطابقة' })}</Pill>
            {pending > 0 && <Pill color="#8a6b3f" bg="#f6edde">{pending} {pick({ en: 'awaiting match', ar: 'بانتظار المطابقة' })}</Pill>}
            {flagged > 0 && <Pill color="#b5403b" bg="#faeceb">{flagged} {pick({ en: 'variance', ar: 'فرق يتطلّب مراجعة' })}</Pill>}
          </div>

          {/* invoices table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline">
                    {[{ en: 'Invoice #', ar: 'رقم الفاتورة' }, { en: 'Supplier · raw material', ar: 'المورّد · المادة الخام' }, { en: 'Date', ar: 'التاريخ' }, { en: 'Value (incl. VAT)', ar: 'القيمة (شامل الضريبة)' }, { en: 'Status', ar: 'الحالة' }].map((h, i) => (
                      <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', i === 2 || i === 3 ? 'text-end' : 'text-start')}>{pick(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((iv) => {
                    const m = matchMeta[iv.match]
                    return (
                      <tr key={iv.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/40 transition-colors">
                        <td className="px-lg py-md font-sans text-data text-ink tabular-nums whitespace-nowrap align-top">{iv.id}</td>
                        <td className="px-lg py-md align-top">
                          <p className="font-sans text-data text-ink">{pick(iv.supplier)}</p>
                          <p className="font-sans text-caption text-ink-subtle">{iv.po ?? pick({ en: 'No PO', ar: 'بدون أمر شراء' })} · {pick(iv.material)}</p>
                        </td>
                        <td className="px-lg py-md text-end font-sans text-data text-ink-muted tabular-nums whitespace-nowrap align-top">{pick(iv.date)}</td>
                        <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums whitespace-nowrap align-top">{money(iv.totalMinor)}</td>
                        <td className="px-lg py-md align-top">
                          <div className="flex items-center gap-sm">
                            <Pill color={m.color} bg={m.bg}>{pick(m.label)}</Pill>
                            {iv.match !== 'matched' && (
                              <button onClick={() => { reconcileInvoice(iv.id); flash(`${pick({ en: 'Reconciled', ar: 'طوبقت' })} · ${iv.id}`) }} className="inline-flex items-center gap-xxs rounded-md px-2.5 py-1 font-sans text-caption bg-success/10 text-success hover:bg-success/15 transition-colors"><Check size={12} /> {pick({ en: 'Reconcile', ar: 'مطابقة' })}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {invoiceOpen && (
            <EnterInvoiceModal onClose={() => setInvoiceOpen(false)}
              onSubmit={(payload) => { receivePurchase(payload); flash(`${pick({ en: 'Invoice entered · stock updated', ar: 'أُدخلت الفاتورة · حُدّث المخزون' })}`) }} />
          )}
        </div>
      )}

      {view === 'raw' && <RawInventory flash={flash} />}

      {view === 'finished' && <FinishedGoods flash={flash} />}

      {view === 'suppliers' && <SuppliersDirectory flash={flash} />}
    </div>
  )
}

/** Enter a supplier invoice with line items — each line is assigned to a stock product
 *  and restocks it on entry; totals (subtotal, VAT, extra cost) are computed live. */
function EnterInvoiceModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (p: { supplier: Bilingual; po?: string; totalMinor: number; lines: { itemId: string; qty: number; costMinor: number }[] }) => void }) {
  const { pick, money } = useLocale()
  const { suppliers, extraRaws } = useOwnerState()
  type Line = { itemId: string; qty: number; cost: number }
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [po, setPo] = useState('')
  const [extraCost, setExtraCost] = useState(0)
  const [lines, setLines] = useState<Line[]>([{ itemId: 'cacao', qty: 0, cost: 0 }])

  const items = [
    ...rawMaterials.map((r) => ({ id: r.key as string, name: r.name, unit: r.unit })),
    ...extraRaws.map((x) => ({ id: x.id, name: x.name, unit: x.unit })),
  ]
  const itemOf = (id: string) => items.find((i) => i.id === id)
  const supplier = suppliers.find((s) => s.id === supplierId) ?? null
  const subtotal = lines.reduce((a, l) => a + l.cost, 0)
  const vat = Math.round(subtotal * 0.15)
  const total = subtotal + vat + extraCost
  const valid = !!supplier && lines.length > 0 && lines.every((l) => itemOf(l.itemId) && l.qty > 0 && l.cost > 0)

  const setLine = (i: number, patch: Partial<Line>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLine = () => setLines((prev) => [...prev, { itemId: items[0].id, qty: 0, cost: 0 }])
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i))

  const submit = () => {
    if (!supplier) return
    onSubmit({ supplier: supplier.name, po: po.trim() || undefined, totalMinor: total * 100, lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, costMinor: l.cost * 100 })) })
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Supply', ar: 'الإمداد' })} title={pick({ en: 'Enter purchase invoice', ar: 'إدخال فاتورة مشتريات' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Enter invoice', ar: 'إدخال الفاتورة' })}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Supplier', ar: 'المورّد' })}</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input cursor-pointer">
              {suppliers.map((s) => <option key={s.id} value={s.id}>{pick(s.name)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'PO number (optional)', ar: 'أمر الشراء (اختياري)' })}</span><input value={po} onChange={(e) => setPo(e.target.value)} className="input" placeholder="PO-2048" /></label>
        </div>

        {/* invoice lines — each assigned to a stock item */}
        <div className="flex flex-col gap-xs">
          <div className="flex items-center justify-between">
            <span className="label">{pick({ en: 'Stock items', ar: 'مواد المخزون' })} · {lines.length}</span>
            <button type="button" onClick={addLine} className="link-gold text-caption">＋ {pick({ en: 'Add line', ar: 'إضافة صنف' })}</button>
          </div>
          <div className="rounded-md border border-hairline-strong divide-y divide-hairline">
            {lines.map((l, i) => {
              const it = itemOf(l.itemId)
              return (
                <div key={i} className="flex flex-wrap items-end gap-sm px-3 py-2">
                  <label className="flex flex-col gap-xxs flex-1 min-w-[160px]"><span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Assigned to stock product', ar: 'مُسكَّن على منتج المخزون' })}</span>
                    <select value={l.itemId} onChange={(e) => setLine(i, { itemId: e.target.value })} className="input py-1.5 cursor-pointer">
                      {items.map((it2) => <option key={it2.id} value={it2.id}>{pick(it2.name)}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-xxs w-24"><span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Qty', ar: 'الكمية' })}{it && ` (${pick(it.unit)})`}</span>
                    <input value={l.qty || ''} onChange={(e) => setLine(i, { qty: parseNum(e.target.value) })} className="input py-1.5 tabular-nums" inputMode="numeric" placeholder="0" />
                  </label>
                  <label className="flex flex-col gap-xxs w-28"><span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Cost (﷼)', ar: 'التكلفة (﷼)' })}</span>
                    <input value={l.cost || ''} onChange={(e) => setLine(i, { cost: parseNum(e.target.value) })} className="input py-1.5 tabular-nums" inputMode="numeric" placeholder="0" />
                  </label>
                  <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger disabled:opacity-30 shrink-0 mb-0.5" aria-label={pick({ en: 'Remove line', ar: 'إزالة الصنف' })}><X size={15} /></button>
                </div>
              )
            })}
          </div>
        </div>

        {/* computed totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-md rounded-lg bg-surface-2 border border-hairline p-md">
          <div className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Subtotal', ar: 'المجموع الفرعي' })}</span><span className="font-sans text-data text-ink tabular-nums">{money(subtotal * 100)}</span></div>
          <div className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'VAT 15%', ar: 'الضريبة ١٥٪' })}</span><span className="font-sans text-data text-ink tabular-nums">{money(vat * 100)}</span></div>
          <label className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Extra cost (﷼)', ar: 'التكلفة الإضافية (﷼)' })}</span><input value={extraCost || ''} onChange={(e) => setExtraCost(parseNum(e.target.value))} className="input py-1.5 tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <div className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Total', ar: 'الإجمالي' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{money(total * 100)}</span></div>
        </div>

        <p className="font-sans text-caption rounded-lg bg-surface-2 border border-hairline p-md text-ink-subtle">
          {po.trim()
            ? pick({ en: 'On entry: every line restocks its assigned stock product, and the invoice awaits 3-way match.', ar: 'عند الإدخال: يرتفع رصيد كل منتج مخزون مُسكَّن عليه صنف، وتنتظر الفاتورة المطابقة الثلاثية.' })
            : pick({ en: 'No PO — the invoice will be flagged as a variance for review (stock still updates).', ar: 'بدون أمر شراء — ستُعلَّم الفاتورة كفرق يتطلّب مراجعة (يُحدَّث المخزون رغم ذلك).' })}
        </p>
      </div>
    </Modal>
  )
}

/** Finished-goods stock: batches aggregated with system vs counted variance and its cost impact. */
function FinishedGoods({ flash }: { flash: (m: string) => void }) {
  const { pick, money } = useLocale()
  const { finished, recordFinishedCount, finishedStockTakeDate } = useOwnerState()
  const [batchOpen, setBatchOpen] = useState(false)
  const [countOpen, setCountOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)

  const rows = finished.map((b) => { const variance = b.countedQty - b.systemQty; return { ...b, variance, valueMinor: variance * b.unitMinor } })
  const varianceCount = rows.filter((r) => r.variance !== 0).length
  const netValueMinor = rows.reduce((a, r) => a + r.valueMinor, 0)

  const exportReport = () => {
    const header = ['Batch', 'Product', 'System', 'Counted', 'Variance', 'Variance value (SAR)', 'Expiry (days)']
    const csvRows = rows.map((r) => [r.code, r.product.en, String(r.systemQty), String(r.countedQty), String(r.variance), String(Math.round(r.valueMinor / 100)), String(r.expiryDays)])
    const csv = [header, ...csvRows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'jaz-finished-goods.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    flash(pick({ en: 'Finished-goods report downloaded (CSV)', ar: 'نُزّل تقرير المخزون المصنّع (CSV)' }))
  }

  return (
    <div className="flex flex-col gap-md">
      {/* header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Finished stock management', ar: 'إدارة المخزون المصنّع' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Aggregated by batch · FIFO issuance · variance stock-take', ar: 'مجمّع حسب الدفعة · صرف FIFO · جرد الفروقات' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <button onClick={() => setBatchOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'Production batch', ar: 'دفعة إنتاج' })}</button>
          <button onClick={exportReport} className={buttonClass('secondary', 'sm')}>{pick({ en: 'Report', ar: 'تقرير' })}</button>
          <button onClick={() => setCountOpen(true)} className={buttonClass('secondary', 'sm')}><ClipboardCheck size={15} /> {pick({ en: 'Start stock-take', ar: 'بدء جرد' })}</button>
          <button onClick={() => setReportsOpen(true)} className={buttonClass('secondary', 'sm')}><FileText size={15} /> {pick({ en: 'Stock-take reports', ar: 'تقارير الجرد' })}</button>
        </div>
      </div>

      {/* batches table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                {[{ h: { en: 'Batch · product', ar: 'رمز الدفعة · المنتج' }, a: 'text-start' }, { h: { en: 'System', ar: 'رصيد النظام' }, a: 'text-end' }, { h: { en: 'Counted', ar: 'الجرد الفعلي' }, a: 'text-end' }, { h: { en: 'Variance', ar: 'الفرق' }, a: 'text-center' }, { h: { en: 'Variance value', ar: 'قيمة الفرق' }, a: 'text-end' }].map((c, i) => (
                  <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                  <td className="px-lg py-md align-top">
                    <div className="flex items-start gap-sm">
                      <span className="w-2.5 h-2.5 rounded-pill mt-1.5 shrink-0" style={{ backgroundColor: r.color }} />
                      <div className="min-w-0">
                        <p className="font-sans text-data text-ink tabular-nums">{r.code}</p>
                        <p className="font-sans text-caption text-ink-subtle">{pick(r.product)}{r.expiryDays <= 14 && <span className="text-danger"> · {r.expiryDays} {pick({ en: 'd left', ar: 'يوم متبقٍ' })}</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md text-end align-top font-sans text-data text-ink-muted tabular-nums">{r.systemQty.toLocaleString()}</td>
                  <td className="px-lg py-md text-end align-top font-sans text-data text-ink tabular-nums">{r.countedQty.toLocaleString()}</td>
                  <td className="px-lg py-md text-center align-top">
                    {r.variance === 0
                      ? <Pill color="#355c4b" bg="#e8f0ec">{pick({ en: 'Matched', ar: 'مطابق' })}</Pill>
                      : <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: r.variance < 0 ? '#b5403b' : '#8a6b3f', backgroundColor: r.variance < 0 ? '#faeceb' : '#f6edde' }}>{Math.abs(r.variance)} {r.variance < 0 ? '▼' : '▲'}</span>}
                  </td>
                  <td className={cn('px-lg py-md text-end align-top font-sans text-data tabular-nums whitespace-nowrap', r.valueMinor < 0 ? 'text-danger' : r.valueMinor > 0 ? 'text-success' : 'text-ink-subtle')}>{r.variance === 0 ? '—' : money(r.valueMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
          <span className="font-sans text-caption text-ink-muted">{pick({ en: 'Last stock-take', ar: 'آخر جرد' })} {pick(finishedStockTakeDate)} · {varianceCount} {pick({ en: 'batches with variances', ar: 'دفعات بها فروقات' })}</span>
          <span className={cn('font-sans text-caption tabular-nums', netValueMinor < 0 ? 'text-danger' : netValueMinor > 0 ? 'text-success' : 'text-ink-muted')}>{pick({ en: 'Net value variance', ar: 'صافي فرق القيمة' })} {money(netValueMinor)}</span>
        </div>
      </div>

      {batchOpen && <AddBatchModal onClose={() => setBatchOpen(false)} flash={flash} />}
      {countOpen && <FinishedStockTakeModal onClose={() => setCountOpen(false)} onSubmit={(counts) => { recordFinishedCount(counts); flash(pick({ en: 'Stock-take recorded', ar: 'سُجّل الجرد' })) }} />}
      {reportsOpen && <StockTakeReportsModal onClose={() => setReportsOpen(false)} />}
    </div>
  )
}

const normName = (s: string) => s.trim().toLowerCase()
const productMatches = (q: string, name: Bilingual) => normName(name.ar).includes(normName(q)) || normName(name.en).includes(normName(q))

/** Record a production batch: pick a previously defined product (one with a recipe),
 *  the raw materials are deducted from stock per its BOM. */
function AddBatchModal({ onClose, flash }: { onClose: () => void; flash: (m: string) => void }) {
  const { pick, money } = useLocale()
  const { products, produceBatch, buildable, bomOf, rawQty } = useOwnerState()
  const [q, setQ] = useState('')
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState(0)
  const [expiry, setExpiry] = useState(90)

  const producible = [...products.b2c, ...products.b2b, ...products.mega].filter((p) => Object.keys(bomOf(p.sku)).length > 0)
  const sel = producible.find((p) => p.sku === sku) ?? null
  const matches = !sel && q.trim() !== '' ? producible.filter((p) => productMatches(q, p.name)).slice(0, 6) : []
  const max = sel ? buildable(sel.sku).qty : 0
  const bottleneckKey = sel ? buildable(sel.sku).bottleneck : null
  const bottleneck = bottleneckKey ? rawMaterials.find((m) => m.key === bottleneckKey) : null
  const bom = sel ? bomOf(sel.sku) : {}
  const over = sel != null && qty > max

  const valid = !!sel && qty > 0 && qty <= max && expiry > 0
  const submit = () => {
    if (!sel) return
    if (produceBatch(sel.sku, qty, expiry)) {
      flash(`${pick({ en: 'Produced', ar: 'أُنتج' })} ${qty.toLocaleString()} · ${pick(sel.name)} — ${pick({ en: 'raw stock deducted', ar: 'خُصمت المواد الخام' })}`)
      onClose()
    }
  }
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Production', ar: 'الإنتاج' })} title={pick({ en: 'New production batch', ar: 'دفعة إنتاج جديدة' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add batch', ar: 'إضافة الدفعة' })}</button></>}>
      <div className="flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Product', ar: 'المنتج' })}</span>
          <input
            value={sel ? pick(sel.name) : q}
            onChange={(e) => { setSku(''); setQty(0); setQ(e.target.value) }}
            placeholder={pick({ en: 'Type a product name…', ar: 'اكتب اسم المنتج…' })}
            className="input"
          />
          {matches.length > 0 && (
            <div className="rounded-md border border-hairline bg-surface-1 shadow-soft max-h-44 overflow-y-auto divide-y divide-hairline">
              {matches.map((p) => {
                const b = buildable(p.sku)
                return (
                  <button key={p.sku} type="button" onClick={() => { setSku(p.sku); setQ('') }} className="w-full flex items-center gap-sm px-3 py-2 text-start hover:bg-surface-2 transition-colors">
                    <span className="w-3 h-3 rounded-pill shrink-0" style={{ background: p.color }} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block font-sans text-data text-ink truncate">{pick(p.name)}</span>
                      <span className="block font-sans text-caption text-ink-subtle truncate">{pick(p.category)} · {money(p.priceMinor)}</span>
                    </span>
                    <span className="font-sans text-caption text-ink-subtle shrink-0 tabular-nums">{pick({ en: 'buildable', ar: 'قابل للإنتاج' })} {b.qty.toLocaleString()}</span>
                  </button>
                )
              })}
            </div>
          )}
          {!sel && q.trim() !== '' && matches.length === 0 && (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No product with a recipe matches', ar: 'لا يوجد منتج بوصفة مكونات مطابق' })}</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Quantity', ar: 'الكمية' })}</span>
            <input value={qty || ''} onChange={(e) => setQty(parseNum(e.target.value))} className={cn('input tabular-nums', over && 'border-danger')} inputMode="numeric" placeholder="0" disabled={!sel} />
            {sel && <span className={cn('font-sans text-caption tabular-nums', over ? 'text-danger' : 'text-ink-subtle')}>{pick({ en: 'Max buildable', ar: 'الحد الأقصى القابل للإنتاج' })}: {max.toLocaleString()}{bottleneck && <> · {pick({ en: 'limited by', ar: 'يحدّه' })} {pick(bottleneck.name)}</>}</span>}
          </label>
          <div className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Unit value (﷼)', ar: 'قيمة الوحدة (﷼)' })}</span>
            <div className="input bg-surface-2 text-ink-muted tabular-nums cursor-default select-none">{sel ? money(sel.priceMinor, { withSymbol: false }) : '—'}</div>
          </div>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Expiry (days)', ar: 'الصلاحية (يوم)' })}</span><input value={expiry || ''} onChange={(e) => setExpiry(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="90" /></label>
        </div>
        {sel && qty > 0 && (
          <div className="rounded-lg border border-hairline overflow-hidden">
            <div className="px-md py-2 bg-surface-2 border-b border-hairline font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Raw materials to deduct', ar: 'المواد الخام التي ستُخصم' })}</div>
            <div className="divide-y divide-hairline">
              {(Object.keys(bom) as RawKey[]).map((k) => {
                const m = rawMaterials.find((x) => x.key === k)
                if (!m) return null
                const need = bom[k]! * qty
                const avail = rawQty[k]
                const short = need > avail
                return (
                  <div key={k} className="flex items-center justify-between gap-sm px-md py-2">
                    <span className="font-sans text-data text-ink">{pick(m.name)}</span>
                    <span className={cn('font-sans text-caption tabular-nums', short ? 'text-danger' : 'text-ink-subtle')}>
                      −{need.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pick(m.unit)} · {pick({ en: 'available', ar: 'المتوفر' })} {avail.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <p className="font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md">{pick({ en: 'Producing this batch deducts raw materials per the product recipe and adds a matched batch to finished goods.', ar: 'إضافة الدفعة تخصم المواد الخام من المخزون حسب مكونات المنتج وتُضيف دفعة مطابقة للمخزون المصنّع.' })}</p>
      </div>
    </Modal>
  )
}

/** Stock-take: enter the physical count per batch → records the count and its value impact. */
function FinishedStockTakeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (counts: Record<string, number>) => void }) {
  const { pick, money } = useLocale()
  const { finished, addStockTakeReport } = useOwnerState()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [startedAt] = useState(() => Date.now())
  const netValue = finished.reduce((a, b) => { const c = counts[b.code]; if (c == null) return a; return a + (c - b.systemQty) * b.unitMinor }, 0)
  const submit = () => {
    const lines = finished.filter((b) => counts[b.code] != null).map((b) => {
      const c = counts[b.code], variance = c - b.systemQty
      return { name: { en: `${b.code} · ${b.product.en}`, ar: `${b.code} · ${b.product.ar}` }, system: b.systemQty, counted: c, variance, valueMinor: variance * b.unitMinor }
    })
    addStockTakeReport({
      scope: 'finished', startedAt, endedAt: Date.now(), lines, netValueMinor: netValue,
      method: { en: 'Manual count — physical quantities recorded per production batch against system balances; variances valued at unit value.', ar: 'جرد يدوي — سُجّلت الكميات الفعلية لكل دفعة إنتاج مقابل رصيد النظام، وقُيّمت الفروقات بقيمة الوحدة.' },
    })
    onSubmit(counts); onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Production', ar: 'الإنتاج' })} title={pick({ en: 'Finished-goods stock-take', ar: 'جرد المخزون المصنّع' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={Object.keys(counts).length === 0} className={buttonClass('primary', 'sm')}><ClipboardCheck size={15} /> {pick({ en: 'Finalize', ar: 'إنهاء الجرد' })}</button></>}>
      <div className="flex flex-col gap-md">
        <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[520px]">
          <thead><tr className="border-b border-hairline">{[{ h: { en: 'Batch', ar: 'الدفعة' }, a: 'text-start' }, { h: { en: 'System', ar: 'النظام' }, a: 'text-end' }, { h: { en: 'Counted', ar: 'المجرود' }, a: 'text-center' }, { h: { en: 'Variance', ar: 'الفرق' }, a: 'text-end' }, { h: { en: 'Value', ar: 'القيمة' }, a: 'text-end' }].map((c, i) => <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2.5', c.a)}>{pick(c.h)}</th>)}</tr></thead>
          <tbody>{finished.map((b) => { const c = counts[b.code]; const variance = c == null ? 0 : c - b.systemQty; const val = c == null ? 0 : variance * b.unitMinor; return (
            <tr key={b.code} className="border-b border-hairline last:border-0">
              <td className="px-md py-sm"><p className="font-sans text-data text-ink">{pick(b.product)}</p><p className="font-sans text-caption text-ink-subtle tabular-nums">{b.code}</p></td>
              <td className="px-md py-sm text-end font-sans text-data text-ink-muted tabular-nums"><span className="inline-flex items-center gap-xxs"><Lock size={11} /> {b.systemQty.toLocaleString()}</span></td>
              <td className="px-md py-sm text-center"><input value={c ?? ''} onChange={(e) => setCounts((p) => { const next = { ...p }; if (e.target.value.trim() === '') delete next[b.code]; else next[b.code] = parseNum(e.target.value); return next })} placeholder={String(b.systemQty)} className="input w-24 text-center py-1.5 tabular-nums" inputMode="numeric" /></td>
              <td className={cn('px-md py-sm text-end font-sans text-data tabular-nums', variance === 0 ? 'text-ink-subtle' : variance < 0 ? 'text-danger' : 'text-success')}>{c == null ? '—' : (variance > 0 ? '+' : '') + variance}</td>
              <td className={cn('px-md py-sm text-end font-sans text-data tabular-nums', val < 0 ? 'text-danger' : val > 0 ? 'text-success' : 'text-ink-subtle')}>{c == null ? '—' : money(val)}</td>
            </tr>
          )})}</tbody>
        </table></div>
        <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline p-md"><span className="font-sans text-data text-ink-muted">{pick({ en: 'Net value impact', ar: 'صافي أثر القيمة' })}</span><span className={cn('font-serif text-card-title tabular-nums', netValue < 0 ? 'text-danger' : netValue > 0 ? 'text-success' : 'text-ink')}>{money(netValue)}</span></div>
      </div>
    </Modal>
  )
}

const scoreColor = (n: number) => (n >= 90 ? '#355c4b' : n >= 75 ? '#b08a57' : '#b5403b')
// Avatar initials from the localized name (first letters of the first two words; strips the Arabic article).
const initials = (name: string) => {
  const clean = name.replace(/^ال/, '').trim()
  const words = clean.split(/\s+/).filter(Boolean)
  return (words.length >= 2 ? (words[0][0] ?? '') + (words[1][0] ?? '') : clean.slice(0, 2)).toUpperCase()
}

/** Suppliers directory: auto-scored performance table with lead time, on-time compliance and category. */
function SuppliersDirectory({ flash }: { flash: (m: string) => void }) {
  const { pick } = useLocale()
  const { suppliers, addSupplier } = useOwnerState()
  const [addOpen, setAddOpen] = useState(false)
  const [sel, setSel] = useState<Supplier | null>(null)
  const leadLabel = (d: number) => `${d} ${pick({ en: d === 1 ? 'day' : 'days', ar: d >= 3 && d <= 10 ? 'أيام' : 'يوم' })}`

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Suppliers directory', ar: 'دليل الموردّين' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Auto-scored performance · quality · on-time · price · lead time', ar: 'تقييم أداء آلي · الجودة · الالتزام · السعر · مهلة التوريد' })}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'New supplier', ar: 'مورّد جديد' })}</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                {[{ en: 'Supplier', ar: 'المورّد' }, { en: 'Category', ar: 'الفئة' }, { en: 'Lead time', ar: 'مهلة التوريد' }, { en: 'On-time', ar: 'الالتزام' }, { en: 'Score', ar: 'التقييم' }, { en: 'Details', ar: 'تفاصيل' }].map((h, i) => (
                  <th key={i} className="font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5 text-start">{pick(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const col = scoreColor(s.score)
                return (
                  <tr key={s.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                    <td className="px-lg py-md align-middle">
                      <div className="flex items-center gap-sm">
                        <span className="grid place-items-center w-11 h-11 rounded-lg bg-primary/10 text-primary-hover font-sans text-data font-semibold shrink-0">{initials(pick(s.name))}</span>
                        <div className="min-w-0"><p className="font-sans text-data text-ink truncate">{pick(s.name)}</p><p className="font-sans text-caption text-ink-subtle">{pick(s.country)}</p></div>
                      </div>
                    </td>
                    <td className="px-lg py-md align-middle font-sans text-data text-ink-muted">{pick(s.material)}</td>
                    <td className="px-lg py-md align-middle font-sans text-data text-ink-muted tabular-nums whitespace-nowrap">{leadLabel(s.leadDays)}</td>
                    <td className={cn('px-lg py-md align-middle font-sans text-data tabular-nums', s.onTimePct < 80 ? 'text-danger' : 'text-ink')}>{s.onTimePct}%</td>
                    <td className="px-lg py-md align-middle">
                      <div className="flex items-center gap-sm">
                        <span className="font-serif text-card-title tabular-nums" style={{ color: col }}>{s.score}</span>
                        <div className="w-24 h-1.5 rounded-pill bg-hairline overflow-hidden"><div className="h-full rounded-pill" style={{ width: `${s.score}%`, backgroundColor: col }} /></div>
                      </div>
                    </td>
                    <td className="px-lg py-md align-middle">
                      <button onClick={() => setSel(s)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30 transition-colors" aria-label={pick({ en: 'Supplier details', ar: 'تفاصيل المورّد' })}><Eye size={15} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && <AddSupplierModal onClose={() => setAddOpen(false)} onSubmit={(s) => { addSupplier(s); flash(`${pick({ en: 'Supplier added', ar: 'أُضيف المورّد' })} · ${pick(s.name)}`) }} />}
      {sel && <SupplierDetailModal s={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

/** Supplier profile: contact details, performance, the raw products we order from them and their current invoices. */
function SupplierDetailModal({ s, onClose }: { s: Supplier; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { invoices } = useOwnerState()
  const sInvoices = invoices.filter((iv) => iv.supplier.en === s.name.en || iv.supplier.ar === s.name.ar)
  const col = scoreColor(s.score)
  const Row = ({ label, value, ltr }: { label: Bilingual; value: string; ltr?: boolean }) => (
    <div className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(label)}</span><span className="font-sans text-data text-ink" dir={ltr ? 'ltr' : undefined}>{value}</span></div>
  )
  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Supplier', ar: 'المورّد' })} title={pick(s.name)}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      <div className="flex flex-col gap-md">
        {/* performance strip */}
        <div className="flex flex-wrap items-center gap-md rounded-lg bg-surface-2 border border-hairline p-md">
          <span className="font-serif text-card-title tabular-nums" style={{ color: col }}>{s.score}</span>
          <span className="font-sans text-caption text-ink-muted">{pick({ en: 'Score', ar: 'التقييم' })}</span>
          <span className="font-sans text-caption text-ink-muted tabular-nums">{pick({ en: 'On-time', ar: 'الالتزام' })} {s.onTimePct}%</span>
          <span className="font-sans text-caption text-ink-muted tabular-nums">{pick({ en: 'Lead time', ar: 'مهلة التوريد' })} {s.leadDays} {pick({ en: 'days', ar: 'يوم' })}</span>
        </div>
        {/* contact details */}
        <div className="flex flex-col gap-xs">
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Contact details', ar: 'بيانات التواصل' })}</span>
          {s.contact ? (
            <div className="grid grid-cols-2 gap-md rounded-lg border border-hairline p-md">
              <Row label={{ en: 'Contact person', ar: 'الشخص المسؤول' }} value={pick(s.contact.person)} />
              <Row label={{ en: 'City', ar: 'المدينة' }} value={`${pick(s.contact.city)} · ${pick(s.country)}`} />
              <Row label={{ en: 'Phone', ar: 'الهاتف' }} value={s.contact.phone} ltr />
              <Row label={{ en: 'Email', ar: 'البريد الإلكتروني' }} value={s.contact.email} ltr />
            </div>
          ) : (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No contact details on file yet.', ar: 'لا توجد بيانات تواصل مسجّلة بعد.' })}</p>
          )}
        </div>
        {/* raw products we order from this supplier */}
        <div className="flex flex-col gap-xs">
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Raw products we order from them', ar: 'المواد الخام التي نطلبها منه' })}</span>
          {s.supplies && s.supplies.length > 0 ? (
            <div className="flex flex-wrap gap-xs">{s.supplies.map((p, i) => <span key={i} className="rounded-pill border border-hairline-strong bg-surface-2 px-3 py-1 font-sans text-caption text-ink">{pick(p)}</span>)}</div>
          ) : (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No linked products yet.', ar: 'لا مواد مرتبطة بعد.' })}</p>
          )}
        </div>
        {/* open purchase invoices from this supplier */}
        <div className="flex flex-col gap-xs">
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Purchase invoices from this supplier', ar: 'فواتير المشتريات من هذا المورّد' })}</span>
          {sInvoices.length === 0 ? (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No recorded invoices.', ar: 'لا فواتير مسجّلة.' })}</p>
          ) : (
            <div className="rounded-md border border-hairline divide-y divide-hairline">
              {sInvoices.map((iv) => {
                const mm = matchMeta[iv.match]
                return (
                  <div key={iv.id} className="px-md py-2 flex flex-wrap items-center justify-between gap-sm">
                    <div className="min-w-0">
                      <p className="font-sans text-data text-ink tabular-nums truncate">{iv.id} · {pick(iv.material)}</p>
                      <p className="font-sans text-caption text-ink-subtle">{pick(iv.date)}</p>
                    </div>
                    <div className="flex items-center gap-sm shrink-0">
                      <span className="font-sans text-data text-ink tabular-nums">{money(iv.totalMinor)}</span>
                      <Pill color={mm.color} bg={mm.bg}>{pick(mm.label)}</Pill>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/** Add a supplier — the performance score is auto-computed from on-time compliance and lead time. */
function AddSupplierModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (s: { name: Bilingual; country: Bilingual; material: Bilingual; leadDays: number; onTimePct: number }) => void }) {
  const { pick } = useLocale()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [material, setMaterial] = useState('')
  const [leadDays, setLeadDays] = useState(0)
  const [onTimePct, setOnTimePct] = useState(0)
  const valid = name.trim() !== '' && country.trim() !== '' && material.trim() !== '' && leadDays > 0 && onTimePct > 0
  const previewScore = Math.max(0, Math.min(100, Math.round(onTimePct - Math.max(0, leadDays - 7) * 0.8)))
  const submit = () => { onSubmit({ name: { en: name.trim(), ar: name.trim() }, country: { en: country.trim(), ar: country.trim() }, material: { en: material.trim(), ar: material.trim() }, leadDays, onTimePct: Math.min(100, onTimePct) }); onClose() }
  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Suppliers', ar: 'الموردون' })} title={pick({ en: 'New supplier', ar: 'مورّد جديد' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add supplier', ar: 'إضافة المورّد' })}</button></>}>
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Supplier name', ar: 'اسم المورّد' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Cocoa House', ar: 'مثال: بيت الكاكاو' })} /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Country', ar: 'الدولة' })}</span><input value={country} onChange={(e) => setCountry(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Saudi Arabia', ar: 'مثال: السعودية' })} /></label>
        </div>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Category', ar: 'الفئة' })}</span><input value={material} onChange={(e) => setMaterial(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Cocoa / Dairy / Packaging', ar: 'مثال: كاكاو / ألبان / تغليف' })} /></label>
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Lead time (days)', ar: 'مهلة التوريد (يوم)' })}</span><input value={leadDays || ''} onChange={(e) => setLeadDays(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'On-time %', ar: 'الالتزام %' })}</span><input value={onTimePct || ''} onChange={(e) => setOnTimePct(Math.min(100, parseNum(e.target.value)))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline p-md">
          <div className="flex flex-col"><span className="font-sans text-data text-ink">{pick({ en: 'Auto-scored rating', ar: 'التقييم الآلي' })}</span><span className="font-sans text-caption text-ink-subtle">{pick({ en: 'From on-time compliance & lead time', ar: 'من الالتزام ومهلة التوريد' })}</span></div>
          <span className="font-serif text-headline tabular-nums" style={{ color: valid ? scoreColor(previewScore) : '#8a7d6a' }}>{valid ? previewScore : '—'}</span>
        </div>
      </div>
    </Modal>
  )
}

type StockRow = { id: string; name: Bilingual; category: Bilingual; unit: Bilingual; balance: string; levelPct: number; reorderPct: number; below: boolean; costMinor: number; costUnit: Bilingual; isSeed: boolean; rawKey?: RawKey }

function RawInventory({ flash }: { flash: (m: string) => void }) {
  const { pick, money } = useLocale()
  const { rawQty, rawPct, extraRaws, extraCats, addRawMaterial, addRawCategory } = useOwnerState()
  const [stockTakeOpen, setStockTakeOpen] = useState(false)
  const [addOpen, setAddOpen] = useState<{ category?: Bilingual } | null>(null)
  const [catOpen, setCatOpen] = useState(false)
  const [viewRow, setViewRow] = useState<StockRow | null>(null)
  const [reportsOpen, setReportsOpen] = useState(false)

  const seedRows: StockRow[] = rawMaterials.map((r) => {
    const levelPct = rawPct(r.key), below = levelPct < r.reorderPct
    return { id: r.key, name: r.name, category: r.category, unit: r.unit, balance: `${rawQty[r.key].toLocaleString()} ${pick(r.unit)}`, levelPct, reorderPct: r.reorderPct, below, costMinor: r.landedMinor, costUnit: r.costUnit, isSeed: true, rawKey: r.key }
  })
  const extraRows: StockRow[] = extraRaws.map((r) => {
    const cap = Math.max(1, r.reorderQty * 2), levelPct = Math.min(100, Math.round((r.qty / cap) * 100)), below = r.qty < r.reorderQty
    return { id: r.id, name: r.name, category: r.category, unit: r.unit, balance: `${r.qty.toLocaleString()} ${pick(r.unit)}`, levelPct, reorderPct: 50, below, costMinor: r.costMinor, costUnit: r.costUnit, isSeed: false }
  })
  const rows = [...seedRows, ...extraRows]

  // Distinct categories in first-seen order (from materials + owner-added empty categories).
  const cats: Bilingual[] = []
  const seen = new Set<string>()
  for (const c of [...rows.map((r) => r.category), ...extraCats]) { const k = pick(c); if (!seen.has(k)) { seen.add(k); cats.push(c) } }

  const belowCount = rows.filter((r) => r.below).length

  // Build a real CSV of current inventory and trigger a browser download.
  const exportReport = () => {
    const header = ['Material', 'Category', 'Balance', 'Level %', 'Reorder %', 'Below reorder', 'Cost (SAR)']
    const csvRows = rows.map((r) => [r.name.en, r.category.en, r.balance, String(r.levelPct), String(r.reorderPct), r.below ? 'YES' : 'no', String(Math.round(r.costMinor / 100))])
    const csv = [header, ...csvRows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'jaz-inventory-report.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    flash(pick({ en: 'Inventory report downloaded (CSV)', ar: 'نُزّل تقرير المخزون (CSV)' }))
  }

  return (
    <div className="flex flex-col gap-md">
      {/* header + actions */}
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Raw stock management', ar: 'إدارة المخزون الخام' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Categorised stock · balance, reorder point and imported cost', ar: 'منتجات المخزون مصنّفة · الرصيد ونقطة الطلب والتكلفة' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <button onClick={() => setAddOpen({})} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'Add stock product', ar: 'منتج مخزون' })}</button>
          <button onClick={() => setCatOpen(true)} className={buttonClass('secondary', 'sm')}><Plus size={14} /> {pick({ en: 'Category', ar: 'تصنيف' })}</button>
          <button onClick={exportReport} className={buttonClass('secondary', 'sm')}>{pick({ en: 'Stock report', ar: 'تقرير المخزون' })}</button>
          <button onClick={() => setStockTakeOpen(true)} className={buttonClass('secondary', 'sm')}><ClipboardCheck size={15} /> {pick({ en: 'Start stock-take', ar: 'بدء جرد' })}</button>
          <button onClick={() => setReportsOpen(true)} className={buttonClass('secondary', 'sm')}><FileText size={15} /> {pick({ en: 'Stock-take reports', ar: 'تقارير الجرد' })}</button>
        </div>
      </div>

      {/* grouped stock table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                {[{ h: { en: 'Material · balance', ar: 'المادة · الرصيد' }, a: 'text-start' }, { h: { en: 'Level vs reorder point', ar: 'المستوى مقابل نقطة الطلب' }, a: 'text-start' }, { h: { en: 'Imported cost', ar: 'التكلفة المستوردة' }, a: 'text-end' }, { h: { en: 'Action', ar: 'إجراء' }, a: 'text-start' }].map((c, i) => (
                  <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cats.map((cat) => {
                const inCat = rows.filter((r) => pick(r.category) === pick(cat))
                return (
                  <Fragment key={pick(cat)}>
                    <tr className="bg-surface-2/40 border-b border-hairline">
                      <td colSpan={4} className="px-lg py-2.5">
                        <span className="inline-flex items-center gap-xs font-sans text-data text-ink"><span className="w-2 h-2 rounded-sm bg-primary/70" /> {pick(cat)} <span className="rounded-pill border border-hairline-strong px-2 py-0.5 font-sans text-caption text-ink-subtle tabular-nums">{inCat.length} {pick({ en: 'items', ar: 'أصناف' })}</span></span>
                      </td>
                    </tr>
                    {inCat.length === 0 ? (
                      <tr className="border-b border-hairline last:border-0"><td colSpan={4} className="px-lg py-md font-sans text-caption text-ink-subtle">{pick({ en: 'No items in this category yet.', ar: 'لا أصناف في هذا التصنيف بعد.' })}</td></tr>
                    ) : inCat.map((row) => (
                      <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                        <td className="px-lg py-md align-top">
                          <p className="font-sans text-data text-ink">{pick(row.name)}</p>
                          <p className="font-sans text-caption text-ink-subtle tabular-nums">{row.balance}</p>
                        </td>
                        <td className="px-lg py-md align-middle min-w-[220px]">
                          <UtilBar pct={row.levelPct} color={row.below ? '#b5403b' : '#b08a57'} marker={row.reorderPct} />
                          <span className="inline-flex items-center gap-xxs mt-xs font-sans text-caption" style={{ color: row.below ? '#b5403b' : '#355c4b' }}><span className="w-1.5 h-1.5 rounded-pill" style={{ backgroundColor: row.below ? '#b5403b' : '#355c4b' }} /> {pick(row.below ? { en: 'Below reorder', ar: 'دون نقطة الطلب' } : { en: 'Within safe', ar: 'ضمن الآمن' })}</span>
                        </td>
                        <td className="px-lg py-md text-end align-top font-sans text-data text-ink tabular-nums whitespace-nowrap">{money(row.costMinor)}<span className="text-ink-subtle text-caption">/{pick(row.costUnit)}</span></td>
                        <td className="px-lg py-md align-top">
                          <button onClick={() => setViewRow(row)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30 transition-colors" aria-label={pick({ en: 'Movements & details', ar: 'التحركات والتفاصيل' })}><Eye size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
          <span className="font-sans text-caption text-ink-muted tabular-nums">{rows.length} {pick({ en: 'raw items across', ar: 'صنف خام ضمن' })} {cats.length} {pick({ en: 'categories', ar: 'تصنيفات' })}</span>
          {belowCount > 0 && <span className="font-sans text-caption text-danger tabular-nums">{belowCount} {pick({ en: 'below reorder point', ar: 'دون نقطة الطلب' })}</span>}
        </div>
      </div>

      {stockTakeOpen && <StockTakeModal flash={flash} onClose={() => setStockTakeOpen(false)} />}
      {addOpen && <AddMaterialModal category={addOpen.category} cats={cats} onClose={() => setAddOpen(null)} onSubmit={(m) => { addRawMaterial(m); flash(`${pick({ en: 'Stock product added', ar: 'أُضيف منتج المخزون' })} · ${pick(m.name)}`) }} />}
      {catOpen && <AddCategoryModal onClose={() => setCatOpen(false)} onSubmit={(name) => { const added = addRawCategory(name); flash(added ? pick({ en: 'Category added', ar: 'أُضيف التصنيف' }) : pick({ en: 'Category already exists', ar: 'التصنيف موجود مسبقًا' })) }} />}
      {viewRow && <ViewMaterialModal row={viewRow} onClose={() => setViewRow(null)} />}
      {reportsOpen && <StockTakeReportsModal onClose={() => setReportsOpen(false)} />}
    </div>
  )
}

/** Stock-take: enter counted quantities against the system for the tracked raw materials → finalize updates stock. */
function StockTakeModal({ flash, onClose }: { flash: (m: string) => void; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { rawQty, finalizeStockTake, addStockTakeReport } = useOwnerState()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [startedAt] = useState(() => Date.now())
  const netLoss = rawMaterials.reduce((a, r) => { const c = counts[r.key]; if (c == null) return a; const variance = c - rawQty[r.key]; return a + Math.round((variance / (r.systemQty || 1)) * r.landedMinor) }, 0)
  const finalize = () => {
    const lines = rawMaterials.filter((r) => counts[r.key] != null).map((r) => {
      const c = counts[r.key], variance = c - rawQty[r.key]
      return { name: r.name, system: rawQty[r.key], counted: c, variance, valueMinor: Math.round((variance / (r.systemQty || 1)) * r.landedMinor) }
    })
    addStockTakeReport({
      scope: 'raw', startedAt, endedAt: Date.now(), lines, netValueMinor: netLoss,
      method: { en: 'Manual count — counted quantities entered against locked system balances; variances valued at landed cost and posted to inventory on finalize.', ar: 'جرد يدوي — أُدخلت الكميات المجرودة مقابل رصيد النظام المقفول، وقُيّمت الفروقات بالتكلفة المستوردة ورُحّلت للمخزون عند الإنهاء.' },
    })
    finalizeStockTake(counts); flash(pick({ en: 'Stock-take finalized — inventory updated', ar: 'أُنهي الجرد — حُدّث المخزون' })); onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Supply', ar: 'الإمداد' })} title={pick({ en: 'Stock-take', ar: 'جرد المخزون' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={finalize} disabled={Object.keys(counts).length === 0} className={buttonClass('primary', 'sm')}><ClipboardCheck size={15} /> {pick({ en: 'Finalize', ar: 'إنهاء الجرد' })}</button></>}>
      <div className="flex flex-col gap-md">
        <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[500px]">
          <thead><tr className="border-b border-hairline">{[{ h: { en: 'Material', ar: 'المادة' }, a: 'text-start' }, { h: { en: 'System', ar: 'النظام' }, a: 'text-end' }, { h: { en: 'Counted', ar: 'المجرود' }, a: 'text-center' }, { h: { en: 'Variance', ar: 'الفرق' }, a: 'text-end' }, { h: { en: 'Value', ar: 'القيمة' }, a: 'text-end' }].map((c, i) => <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2.5', c.a)}>{pick(c.h)}</th>)}</tr></thead>
          <tbody>{rawMaterials.map((r) => { const sys = rawQty[r.key]; const c = counts[r.key]; const variance = c == null ? 0 : c - sys; const val = c == null ? 0 : Math.round((variance / (r.systemQty || 1)) * r.landedMinor); return (
            <tr key={r.key} className="border-b border-hairline last:border-0">
              <td className="px-md py-sm font-sans text-data text-ink">{pick(r.name)}</td>
              <td className="px-md py-sm text-end font-sans text-data text-ink-muted tabular-nums"><span className="inline-flex items-center gap-xxs"><Lock size={11} /> {sys.toLocaleString()}</span></td>
              <td className="px-md py-sm text-center"><input value={c ?? ''} onChange={(e) => setCounts((p) => { const next = { ...p }; if (e.target.value.trim() === '') delete next[r.key]; else next[r.key] = parseNum(e.target.value); return next })} placeholder={String(sys)} className="input w-24 text-center py-1.5 tabular-nums" inputMode="numeric" /></td>
              <td className={cn('px-md py-sm text-end font-sans text-data tabular-nums', variance === 0 ? 'text-ink-subtle' : variance < 0 ? 'text-danger' : 'text-success')}>{c == null ? '—' : (variance > 0 ? '+' : '') + variance}</td>
              <td className={cn('px-md py-sm text-end font-sans text-data tabular-nums', val < 0 ? 'text-danger' : val > 0 ? 'text-success' : 'text-ink-subtle')}>{c == null ? '—' : money(val)}</td>
            </tr>
          )})}</tbody>
        </table></div>
        <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline p-md"><span className="font-sans text-data text-ink-muted">{pick({ en: 'Net value impact', ar: 'صافي أثر القيمة' })}</span><span className={cn('font-serif text-card-title tabular-nums', netLoss < 0 ? 'text-danger' : netLoss > 0 ? 'text-success' : 'text-ink')}>{money(netLoss)}</span></div>
      </div>
    </Modal>
  )
}

const NEW_CAT = '__new__'
// Decimal-friendly parser (the conversion factor and purchased qty can be fractional, e.g. 0.8 ton).
const parseDec = (s: string) => Math.max(0, parseFloat(toAsciiDigits(s).replace(/[^\d.]/g, '')) || 0)

/** Add an owner-tracked stock product (inventory overlay — not part of the production recipe).
 *  Units come from a fixed list with a purchase→stock conversion factor; the unit cost is
 *  derived from the entered purchase invoice, never typed by hand. */
function AddMaterialModal({ category, cats, onClose, onSubmit }: { category?: Bilingual; cats: Bilingual[]; onClose: () => void; onSubmit: (m: Omit<ExtraRaw, 'id'>) => void }) {
  const { pick, money } = useLocale()
  const { suppliers, addPurchaseInvoice } = useOwnerState()
  const [name, setName] = useState('')
  const [catStr, setCatStr] = useState(category ? pick(category) : (cats[0] ? pick(cats[0]) : NEW_CAT))
  const [newCat, setNewCat] = useState('')
  const [stockUnit, setStockUnit] = useState('kg')
  const [buyUnit, setBuyUnit] = useState('ton')
  const [factorStr, setFactorStr] = useState(String(unitFactor('ton', 'kg')))
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [buyQtyStr, setBuyQtyStr] = useState('')
  const [total, setTotal] = useState(0)
  const [reorderQty, setReorderQty] = useState(0)

  const su = stockUnits.find((u) => u.key === stockUnit)!
  const bu = stockUnits.find((u) => u.key === buyUnit)!
  const factor = parseDec(factorStr)
  const buyQty = parseDec(buyQtyStr)
  const stockQty = Math.round(buyQty * factor)
  const costMinor = stockQty > 0 && total > 0 ? Math.round((total * 100) / stockQty) : 0
  const supplier = suppliers.find((s) => s.id === supplierId) ?? null
  const catName = catStr === NEW_CAT ? newCat.trim() : catStr.trim()

  const changeUnit = (kind: 'stock' | 'buy', key: string) => {
    const nextStock = kind === 'stock' ? key : stockUnit
    const nextBuy = kind === 'buy' ? key : buyUnit
    if (kind === 'stock') setStockUnit(key); else setBuyUnit(key)
    setFactorStr(String(unitFactor(nextBuy, nextStock)))
  }

  const valid = name.trim() !== '' && catName !== '' && !!supplier && factor > 0 && buyQty > 0 && total > 0 && reorderQty > 0
  const submit = () => {
    if (!supplier) return
    const nameBi = { en: name.trim(), ar: name.trim() }
    const catBi = cats.find((c) => pick(c) === catName) ?? { en: catName, ar: catName }
    onSubmit({ name: nameBi, category: catBi, unit: su.label, costUnit: su.label, costMinor, qty: stockQty, reorderQty })
    addPurchaseInvoice({ supplier: supplier.name, material: nameBi, date: { en: 'Now', ar: 'الآن' }, totalMinor: total * 100 })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Raw stock', ar: 'المخزون الخام' })} title={pick({ en: 'Add stock product', ar: 'إضافة منتج مخزون' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add', ar: 'إضافة' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Material name', ar: 'اسم المادة' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Hazelnut paste', ar: 'مثال: معجون بندق' })} /></label>
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Category', ar: 'التصنيف' })}</span>
            <select value={catStr} onChange={(e) => setCatStr(e.target.value)} className="input cursor-pointer">
              {cats.map((c, i) => <option key={i} value={pick(c)}>{pick(c)}</option>)}
              <option value={NEW_CAT}>+ {pick({ en: 'New category…', ar: 'تصنيف جديد…' })}</option>
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Supplier', ar: 'المورّد' })}</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input cursor-pointer">
              {suppliers.map((s) => <option key={s.id} value={s.id}>{pick(s.name)}</option>)}
            </select>
          </label>
        </div>
        {catStr === NEW_CAT && (
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'New category name', ar: 'اسم التصنيف الجديد' })}</span><input value={newCat} onChange={(e) => setNewCat(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Inclusions', ar: 'مثال: إضافات' })} /></label>
        )}
        <div className="grid grid-cols-3 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Stock unit', ar: 'وحدة المخزون' })}</span>
            <select value={stockUnit} onChange={(e) => changeUnit('stock', e.target.value)} className="input cursor-pointer">
              {stockUnits.map((u) => <option key={u.key} value={u.key}>{pick(u.label)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Purchase unit', ar: 'وحدة الشراء' })}</span>
            <select value={buyUnit} onChange={(e) => changeUnit('buy', e.target.value)} className="input cursor-pointer">
              {stockUnits.map((u) => <option key={u.key} value={u.key}>{pick(u.label)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Conversion factor', ar: 'معامل التحويل' })}</span>
            <input value={factorStr} onChange={(e) => setFactorStr(e.target.value)} className="input tabular-nums" inputMode="decimal" />
            <span className="font-sans text-caption text-ink-subtle tabular-nums">1 {pick(bu.label)} = {factor.toLocaleString()} {pick(su.label)}</span>
          </label>
        </div>
        <div className="grid grid-cols-3 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Purchased qty', ar: 'الكمية المشتراة' })} ({pick(bu.label)})</span><input value={buyQtyStr} onChange={(e) => setBuyQtyStr(e.target.value)} className="input tabular-nums" inputMode="decimal" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Invoice total (﷼)', ar: 'إجمالي الفاتورة (﷼)' })}</span><input value={total || ''} onChange={(e) => setTotal(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Reorder at', ar: 'نقطة الطلب' })} ({pick(su.label)})</span><input value={reorderQty || ''} onChange={(e) => setReorderQty(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
        </div>
        <div className="flex flex-wrap items-center gap-md rounded-lg bg-surface-2 border border-hairline p-md font-sans text-caption text-ink-muted">
          <span className="inline-flex items-center gap-xxs"><Lock size={12} /> {pick({ en: 'Auto-calculated from the invoice', ar: 'تُحسب تلقائيًا من الفاتورة' })}:</span>
          <span className="tabular-nums text-ink">{pick({ en: 'On hand', ar: 'المتوفر' })}: {stockQty.toLocaleString()} {pick(su.label)}</span>
          <span className="tabular-nums text-ink">{pick({ en: 'Unit cost', ar: 'تكلفة الوحدة' })}: {costMinor > 0 ? `${money(costMinor)} / ${pick(su.label)}` : '—'}</span>
        </div>
        <p className="font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md">{pick({ en: 'The purchase invoice is recorded in procurement and the unit cost is derived from it automatically. Tracked for inventory only — not linked to the production recipe.', ar: 'تُسجَّل فاتورة المشتريات في سجل المشتريات وتُحسب تكلفة الوحدة منها تلقائيًا. يُتتبَّع للمخزون فقط — غير مرتبط بوصفة الإنتاج.' })}</p>
      </div>
    </Modal>
  )
}

/** Add an empty raw-stock category. */
function AddCategoryModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: Bilingual) => void }) {
  const { pick } = useLocale()
  const [name, setName] = useState('')
  const submit = () => { if (name.trim()) { onSubmit({ en: name.trim(), ar: name.trim() }); onClose() } }
  return (
    <Modal open onClose={onClose} size="sm" eyebrow={pick({ en: 'Raw stock', ar: 'المخزون الخام' })} title={pick({ en: 'New category', ar: 'تصنيف جديد' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!name.trim()} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add category', ar: 'إضافة التصنيف' })}</button></>}>
      <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Category name', ar: 'اسم التصنيف' })}</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} className="input" placeholder={pick({ en: 'e.g. Inclusions', ar: 'مثال: إضافات' })} /></label>
    </Modal>
  )
}

/** Immutable stock-take reports: audit log of every finalized stock-take (raw + finished).
 *  Read-only by design — there is no edit or delete action. */
function StockTakeReportsModal({ onClose }: { onClose: () => void }) {
  const { pick, money, locale } = useLocale()
  const { stockTakeReports } = useOwnerState()
  const [openId, setOpenId] = useState<string | null>(null)
  const fmt = (ts: number) => new Date(ts).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const dur = (r: { startedAt: number; endedAt: number }) => {
    const s = Math.max(1, Math.round((r.endedAt - r.startedAt) / 1000)), m = Math.floor(s / 60)
    return m > 0 ? `${m} ${pick({ en: 'min', ar: 'د' })} ${s % 60} ${pick({ en: 's', ar: 'ث' })}` : `${s} ${pick({ en: 's', ar: 'ث' })}`
  }
  const scopeMeta = { raw: { label: { en: 'Raw stock', ar: 'المخزون الخام' }, color: '#8a6b3f', bg: '#f6edde' }, finished: { label: { en: 'Finished goods', ar: 'المخزون المصنّع' }, color: '#355c4b', bg: '#e8f0ec' } } as const
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Stock-take', ar: 'الجرد' })} title={pick({ en: 'Stock-take reports', ar: 'تقارير الجرد' })}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      <div className="flex flex-col gap-md">
        <p className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md"><Lock size={13} className="shrink-0" /> {pick({ en: 'Audit records created automatically when a stock-take is finalized — they cannot be edited or deleted.', ar: 'سجلات توثيقية تُنشأ تلقائيًا عند إنهاء أي جرد — لا يمكن تعديلها أو حذفها.' })}</p>
        {stockTakeReports.length === 0 ? (
          <p className="font-sans text-data text-ink-subtle text-center py-lg">{pick({ en: 'No stock-take reports yet. Finalize a stock-take to create one.', ar: 'لا توجد تقارير جرد بعد. أنهِ أي جرد ليُنشأ تقرير تلقائيًا.' })}</p>
        ) : stockTakeReports.map((r) => {
          const sm = scopeMeta[r.scope]
          const open = openId === r.id
          return (
            <div key={r.id} className="rounded-lg border border-hairline overflow-hidden">
              <button onClick={() => setOpenId(open ? null : r.id)} className="w-full flex flex-wrap items-center justify-between gap-sm px-md py-sm text-start hover:bg-surface-2 transition-colors">
                <span className="inline-flex items-center gap-sm">
                  <span className="font-sans text-data text-ink tabular-nums">{r.id}</span>
                  <Pill color={sm.color} bg={sm.bg}>{pick(sm.label)}</Pill>
                </span>
                <span className="font-sans text-caption text-ink-subtle tabular-nums">{fmt(r.endedAt)} · {pick({ en: 'net', ar: 'الصافي' })} <span className={cn(r.netValueMinor < 0 ? 'text-danger' : r.netValueMinor > 0 ? 'text-success' : 'text-ink-subtle')}>{money(r.netValueMinor)}</span></span>
              </button>
              {open && (
                <div className="border-t border-hairline p-md flex flex-col gap-md">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
                    {([[{ en: 'Started', ar: 'بدأ' }, fmt(r.startedAt)], [{ en: 'Ended', ar: 'انتهى' }, fmt(r.endedAt)], [{ en: 'Duration', ar: 'المدة' }, dur(r)], [{ en: 'Net value impact', ar: 'صافي أثر القيمة' }, money(r.netValueMinor)]] as const).map(([l, v], i) => (
                      <div key={i} className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(l)}</span><span className="font-sans text-data text-ink tabular-nums">{v}</span></div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-xxs">
                    <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'How the count was performed', ar: 'كيف تمت عملية الجرد' })}</span>
                    <p className="font-sans text-caption text-ink-muted">{pick(r.method)}</p>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-hairline">
                    <table className="w-full border-collapse min-w-[460px]">
                      <thead><tr className="bg-surface-2 border-b border-hairline">{[{ h: { en: 'Item', ar: 'الصنف' }, a: 'text-start' }, { h: { en: 'System', ar: 'النظام' }, a: 'text-end' }, { h: { en: 'Counted', ar: 'المجرود' }, a: 'text-end' }, { h: { en: 'Variance', ar: 'الفرق' }, a: 'text-end' }, { h: { en: 'Value', ar: 'القيمة' }, a: 'text-end' }].map((c, i) => <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2', c.a)}>{pick(c.h)}</th>)}</tr></thead>
                      <tbody>{r.lines.map((ln, i) => (
                        <tr key={i} className="border-b border-hairline last:border-0">
                          <td className="px-md py-2 font-sans text-data text-ink">{pick(ln.name)}</td>
                          <td className="px-md py-2 text-end font-sans text-data text-ink-muted tabular-nums">{ln.system.toLocaleString()}</td>
                          <td className="px-md py-2 text-end font-sans text-data text-ink tabular-nums">{ln.counted.toLocaleString()}</td>
                          <td className={cn('px-md py-2 text-end font-sans text-data tabular-nums', ln.variance === 0 ? 'text-ink-subtle' : ln.variance < 0 ? 'text-danger' : 'text-success')}>{(ln.variance > 0 ? '+' : '') + ln.variance}</td>
                          <td className={cn('px-md py-2 text-end font-sans text-data tabular-nums', ln.valueMinor < 0 ? 'text-danger' : ln.valueMinor > 0 ? 'text-success' : 'text-ink-subtle')}>{ln.variance === 0 ? '—' : money(ln.valueMinor)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

/** Read-only detail for a stock item: balance stats + who moved it and why (movement trail). */
function ViewMaterialModal({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { movements } = useOwnerState()
  const moves = movements.filter((m) => m.itemId === row.id)
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-xxs rounded-lg bg-surface-2 border border-hairline p-md"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span><span className="font-serif text-card-title text-ink tabular-nums">{value}</span></div>
  )
  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick(row.category)} title={pick(row.name)}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-2 gap-sm">
          <Stat label={pick({ en: 'Balance', ar: 'الرصيد' })} value={row.balance} />
          <Stat label={pick({ en: 'Level', ar: 'المستوى' })} value={`${row.levelPct}%`} />
          <Stat label={pick({ en: 'Reorder point', ar: 'نقطة الطلب' })} value={`${row.reorderPct}%`} />
          <Stat label={pick({ en: 'Imported cost', ar: 'التكلفة المستوردة' })} value={`${money(row.costMinor)}/${pick(row.costUnit)}`} />
        </div>
        <UtilBar pct={row.levelPct} color={row.below ? '#b5403b' : '#b08a57'} marker={row.reorderPct} />
        <span className="inline-flex items-center gap-xxs font-sans text-caption" style={{ color: row.below ? '#b5403b' : '#355c4b' }}><span className="w-1.5 h-1.5 rounded-pill" style={{ backgroundColor: row.below ? '#b5403b' : '#355c4b' }} /> {pick(row.below ? { en: 'Below reorder', ar: 'دون نقطة الطلب' } : { en: 'Within safe', ar: 'ضمن الآمن' })}</span>
        <div className="flex flex-col gap-xs">
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Stock movements — who & why', ar: 'تحركات المخزون — المسؤول والسبب' })}</span>
          {moves.length === 0 ? (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No movements recorded yet.', ar: 'لا تحركات مسجّلة بعد.' })}</p>
          ) : (
            <div className="rounded-md border border-hairline divide-y divide-hairline max-h-56 overflow-y-auto">
              {moves.map((m) => (
                <div key={m.id} className="px-md py-2 flex items-start justify-between gap-sm">
                  <div className="min-w-0">
                    <p className="font-sans text-data text-ink truncate">{pick(m.note)}</p>
                    <p className="font-sans text-caption text-ink-subtle truncate">{pick(m.at)} · {pick({ en: 'by', ar: 'بواسطة' })} {pick(m.by)}</p>
                  </div>
                  <span className={cn('font-sans text-data tabular-nums shrink-0', m.kind === 'out' || (m.kind === 'adjust' && m.qty < 0) ? 'text-danger' : 'text-success')}>
                    {m.kind === 'out' ? '−' : m.kind === 'in' ? '+' : m.qty < 0 ? '−' : '+'}{Math.abs(m.qty).toLocaleString()} {pick(row.unit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
