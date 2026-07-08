import { Fragment, useState } from 'react'
import { Lock, ClipboardCheck, Check, Plus } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import {
  rawMaterials, type PurchaseMatch, type RawKey, type ExtraRaw,
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
  const { invoices, reconcileInvoice, addPurchaseInvoice } = useOwnerState()
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
              onSubmit={(payload) => { addPurchaseInvoice(payload); flash(`${pick({ en: 'Invoice entered · stock updated', ar: 'أُدخلت الفاتورة · حُدّث المخزون' })}`) }} />
          )}
        </div>
      )}

      {view === 'raw' && <RawInventory flash={flash} />}

      {view === 'finished' && <FinishedGoods flash={flash} />}

      {view === 'suppliers' && <SuppliersDirectory flash={flash} />}
    </div>
  )
}

/** Enter a supplier invoice against a raw-material line. On submit it restocks that material and records the cost. */
function EnterInvoiceModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (p: { supplier: Bilingual; material: Bilingual; date: Bilingual; totalMinor: number; po?: string; rawKey: RawKey; qty: number }) => void }) {
  const { pick } = useLocale()
  const [supplier, setSupplier] = useState('')
  const [po, setPo] = useState('')
  const [rawKey, setRawKey] = useState<RawKey>('cacao')
  const [qty, setQty] = useState(0)
  const [value, setValue] = useState(0)
  const mat = rawMaterials.find((r) => r.key === rawKey)!
  const valid = supplier.trim() !== '' && qty > 0 && value > 0
  const reset = () => { setSupplier(''); setPo(''); setRawKey('cacao'); setQty(0); setValue(0) }

  const submit = () => {
    onSubmit({ supplier: { en: supplier.trim(), ar: supplier.trim() }, material: mat.name, date: { en: 'Today', ar: 'اليوم' }, totalMinor: value * 100, po: po.trim() || undefined, rawKey, qty })
    reset(); onClose()
  }

  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Supply', ar: 'الإمداد' })} title={pick({ en: 'Enter purchase invoice', ar: 'إدخال فاتورة مشتريات' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Enter invoice', ar: 'إدخال الفاتورة' })}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Supplier', ar: 'المورّد' })}</span><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Barry Callebaut', ar: 'مثال: باري كاليبو' })} /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'PO number (optional)', ar: 'أمر الشراء (اختياري)' })}</span><input value={po} onChange={(e) => setPo(e.target.value)} className="input" placeholder="PO-2048" /></label>
        </div>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Raw material', ar: 'المادة الخام' })}</span>
          <select value={rawKey} onChange={(e) => setRawKey(e.target.value as RawKey)} className="input cursor-pointer">{rawMaterials.map((r) => <option key={r.key} value={r.key}>{pick(r.name)}</option>)}</select>
        </label>
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Quantity received', ar: 'الكمية المستلمة' })} · {pick(mat.unit)}</span><input value={qty || ''} onChange={(e) => setQty(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Value incl. VAT (﷼)', ar: 'القيمة شامل الضريبة (﷼)' })}</span><input value={value || ''} onChange={(e) => setValue(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
        </div>
        <p className="font-sans text-caption rounded-lg bg-surface-2 border border-hairline p-md text-ink-subtle">
          {po.trim()
            ? pick({ en: `On entry: ${mat.name.en} stock rises by ${qty || 0} ${mat.unit.en} and the invoice awaits 3-way match.`, ar: `عند الإدخال: يرتفع مخزون ${mat.name.ar} بمقدار ${qty || 0} ${mat.unit.ar} وتنتظر الفاتورة المطابقة الثلاثية.` })
            : pick({ en: 'No PO — the invoice will be flagged as a variance for review (stock still updates).', ar: 'بدون أمر شراء — ستُعلَّم الفاتورة كفرق يتطلّب مراجعة (يُحدَّث المخزون رغم ذلك).' })}
        </p>
      </div>
    </Modal>
  )
}

const BATCH_SWATCHES = ['#2e1a10', '#6b4a2e', '#b08a57', '#9c5566', '#6b7a4a', '#365766']

/** Finished-goods stock: batches aggregated with system vs counted variance and its cost impact. */
function FinishedGoods({ flash }: { flash: (m: string) => void }) {
  const { pick, money } = useLocale()
  const { finished, addFinishedBatch, recordFinishedCount, finishedStockTakeDate } = useOwnerState()
  const [batchOpen, setBatchOpen] = useState(false)
  const [countOpen, setCountOpen] = useState(false)

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
  const printVariances = () => { if (typeof window !== 'undefined' && window.print) window.print(); flash(pick({ en: 'Opening print…', ar: 'جارٍ فتح الطباعة…' })) }

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
          <button onClick={printVariances} className={buttonClass('secondary', 'sm')}>{pick({ en: 'Print variances', ar: 'طباعة الفوارق' })}</button>
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

      {batchOpen && <AddBatchModal onClose={() => setBatchOpen(false)} onSubmit={(b) => { addFinishedBatch(b); flash(`${pick({ en: 'Production batch added', ar: 'أُضيفت دفعة الإنتاج' })} · ${pick(b.product)}`) }} />}
      {countOpen && <FinishedStockTakeModal onClose={() => setCountOpen(false)} onSubmit={(counts) => { recordFinishedCount(counts); flash(pick({ en: 'Stock-take recorded', ar: 'سُجّل الجرد' })) }} />}
    </div>
  )
}

/** Record a production batch straight into finished goods. */
function AddBatchModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (b: { product: Bilingual; systemQty: number; unitMinor: number; color: string; expiryDays: number }) => void }) {
  const { pick } = useLocale()
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState(0)
  const [unitVal, setUnitVal] = useState(0)
  const [expiry, setExpiry] = useState(90)
  const [color, setColor] = useState(BATCH_SWATCHES[0])
  const valid = product.trim() !== '' && qty > 0 && unitVal > 0
  const submit = () => { onSubmit({ product: { en: product.trim(), ar: product.trim() }, systemQty: qty, unitMinor: unitVal * 100, color, expiryDays: expiry || 90 }); onClose() }
  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Production', ar: 'الإنتاج' })} title={pick({ en: 'New production batch', ar: 'دفعة إنتاج جديدة' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add batch', ar: 'إضافة الدفعة' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Product', ar: 'المنتج' })}</span><input value={product} onChange={(e) => setProduct(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Dark 70% bar', ar: 'مثال: لوح داكن ٧٠٪' })} /></label>
        <div className="grid grid-cols-3 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Quantity', ar: 'الكمية' })}</span><input value={qty || ''} onChange={(e) => setQty(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Unit value (﷼)', ar: 'قيمة الوحدة (﷼)' })}</span><input value={unitVal || ''} onChange={(e) => setUnitVal(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Expiry (days)', ar: 'الصلاحية (يوم)' })}</span><input value={expiry || ''} onChange={(e) => setExpiry(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="90" /></label>
        </div>
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Batch colour', ar: 'لون الدفعة' })}</span>
          <div className="flex flex-wrap gap-xs">{BATCH_SWATCHES.map((s) => <button key={s} type="button" onClick={() => setColor(s)} aria-label={s} className={cn('w-7 h-7 rounded-md border transition-transform', color === s ? 'ring-2 ring-primary ring-offset-1 border-transparent scale-105' : 'border-hairline hover:scale-105')} style={{ backgroundColor: s }} />)}</div>
        </div>
        <p className="font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md">{pick({ en: 'Adds a matched batch to finished goods (counted = system on entry).', ar: 'تُضيف دفعة مطابقة للمخزون المصنّع (الجرد = النظام عند الإدخال).' })}</p>
      </div>
    </Modal>
  )
}

/** Stock-take: enter the physical count per batch → records the count and its value impact. */
function FinishedStockTakeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (counts: Record<string, number>) => void }) {
  const { pick, money } = useLocale()
  const { finished } = useOwnerState()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const netValue = finished.reduce((a, b) => { const c = counts[b.code]; if (c == null) return a; return a + (c - b.systemQty) * b.unitMinor }, 0)
  const submit = () => { onSubmit(counts); onClose() }
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
                {[{ en: 'Supplier', ar: 'المورّد' }, { en: 'Category', ar: 'الفئة' }, { en: 'Lead time', ar: 'مهلة التوريد' }, { en: 'On-time', ar: 'الالتزام' }, { en: 'Score', ar: 'التقييم' }].map((h, i) => (
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && <AddSupplierModal onClose={() => setAddOpen(false)} onSubmit={(s) => { addSupplier(s); flash(`${pick({ en: 'Supplier added', ar: 'أُضيف المورّد' })} · ${pick(s.name)}`) }} />}
    </div>
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
  const { rawQty, rawPct, reorderRaw, extraRaws, extraCats, addRawMaterial, addRawCategory, reorderExtra } = useOwnerState()
  const [stockTakeOpen, setStockTakeOpen] = useState(false)
  const [addOpen, setAddOpen] = useState<{ category?: Bilingual } | null>(null)
  const [catOpen, setCatOpen] = useState(false)
  const [viewRow, setViewRow] = useState<StockRow | null>(null)

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
  const order = (row: StockRow) => { if (row.isSeed && row.rawKey) reorderRaw(row.rawKey); else reorderExtra(row.id); flash(`${pick({ en: 'Reordered & restocked', ar: 'أُعيد الطلب وتم التوريد' })} · ${pick(row.name)}`) }

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
                        <div className="flex items-center justify-between gap-sm">
                          <span className="inline-flex items-center gap-xs font-sans text-data text-ink"><span className="w-2 h-2 rounded-sm bg-primary/70" /> {pick(cat)} <span className="rounded-pill border border-hairline-strong px-2 py-0.5 font-sans text-caption text-ink-subtle tabular-nums">{inCat.length} {pick({ en: 'items', ar: 'أصناف' })}</span></span>
                          <button onClick={() => setAddOpen({ category: cat })} className="link-gold text-caption">＋ {pick({ en: 'Add to this category', ar: 'أضف لهذا التصنيف' })}</button>
                        </div>
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
                          {row.below
                            ? <button onClick={() => order(row)} className="rounded-md px-3 py-1.5 font-sans text-caption bg-primary/15 text-primary-hover hover:bg-primary/25 transition-colors">{pick({ en: 'Order', ar: 'اطلب' })}</button>
                            : <button onClick={() => setViewRow(row)} className="rounded-md px-3 py-1.5 font-sans text-caption bg-surface-2 text-ink-muted hover:text-ink border border-hairline transition-colors">{pick({ en: 'View', ar: 'عرض' })}</button>}
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
    </div>
  )
}

/** Stock-take: enter counted quantities against the system for the tracked raw materials → finalize updates stock. */
function StockTakeModal({ flash, onClose }: { flash: (m: string) => void; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { rawQty, finalizeStockTake } = useOwnerState()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const netLoss = rawMaterials.reduce((a, r) => { const c = counts[r.key]; if (c == null) return a; const variance = c - rawQty[r.key]; return a + Math.round((variance / (r.systemQty || 1)) * r.landedMinor) }, 0)
  const finalize = () => { finalizeStockTake(counts); flash(pick({ en: 'Stock-take finalized — inventory updated', ar: 'أُنهي الجرد — حُدّث المخزون' })); onClose() }
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

/** Add an owner-tracked stock product (inventory overlay — not part of the production recipe). */
function AddMaterialModal({ category, cats, onClose, onSubmit }: { category?: Bilingual; cats: Bilingual[]; onClose: () => void; onSubmit: (m: Omit<ExtraRaw, 'id'>) => void }) {
  const { pick } = useLocale()
  const [name, setName] = useState('')
  const [catStr, setCatStr] = useState(category ? pick(category) : (cats[0] ? pick(cats[0]) : ''))
  const [unit, setUnit] = useState('')
  const [qty, setQty] = useState(0)
  const [reorderQty, setReorderQty] = useState(0)
  const [cost, setCost] = useState(0)
  const valid = name.trim() !== '' && catStr.trim() !== '' && unit.trim() !== '' && cost > 0 && reorderQty > 0
  const submit = () => {
    const catBi = cats.find((c) => pick(c) === catStr.trim()) ?? { en: catStr.trim(), ar: catStr.trim() }
    const unitBi = { en: unit.trim(), ar: unit.trim() }
    onSubmit({ name: { en: name.trim(), ar: name.trim() }, category: catBi, unit: unitBi, costUnit: unitBi, costMinor: cost * 100, qty, reorderQty })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Raw stock', ar: 'المخزون الخام' })} title={pick({ en: 'Add stock product', ar: 'إضافة منتج مخزون' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add', ar: 'إضافة' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Material name', ar: 'اسم المادة' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Hazelnut paste', ar: 'مثال: معجون بندق' })} /></label>
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Category', ar: 'التصنيف' })}</span><select value={catStr} onChange={(e) => setCatStr(e.target.value)} className="input cursor-pointer">{cats.map((c, i) => <option key={i} value={pick(c)}>{pick(c)}</option>)}</select></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Unit', ar: 'الوحدة' })}</span><input value={unit} onChange={(e) => setUnit(e.target.value)} className="input" placeholder={pick({ en: 'kg / roll / ton', ar: 'كجم / لفة / طن' })} /></label>
        </div>
        <div className="grid grid-cols-3 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'On hand', ar: 'المتوفر' })}</span><input value={qty || ''} onChange={(e) => setQty(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Reorder at', ar: 'نقطة الطلب' })}</span><input value={reorderQty || ''} onChange={(e) => setReorderQty(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Cost (﷼)', ar: 'التكلفة (﷼)' })}</span><input value={cost || ''} onChange={(e) => setCost(parseNum(e.target.value))} className="input tabular-nums" inputMode="numeric" placeholder="0" /></label>
        </div>
        <p className="font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md">{pick({ en: 'Tracked for inventory only (balance, reorder point, cost) — not linked to the production recipe.', ar: 'يُتتبَّع للمخزون فقط (الرصيد ونقطة الطلب والتكلفة) — غير مرتبط بوصفة الإنتاج.' })}</p>
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

/** Read-only detail for a safe stock item. */
function ViewMaterialModal({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const { pick, money } = useLocale()
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-xxs rounded-lg bg-surface-2 border border-hairline p-md"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span><span className="font-serif text-card-title text-ink tabular-nums">{value}</span></div>
  )
  return (
    <Modal open onClose={onClose} size="sm" eyebrow={pick(row.category)} title={pick(row.name)}
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
      </div>
    </Modal>
  )
}
