import { useState } from 'react'
import { Lock, ClipboardCheck, Check } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { buttonClass } from '@/components/ui/Button'
import {
  rawMaterials, suppliers, type PurchaseMatch,
} from '@/data/ownerSupply'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, SegTabs, Pill, UtilBar } from './_shared'

const matchMeta: Record<PurchaseMatch, { label: { en: string; ar: string }; color: string; bg: string }> = {
  matched: { label: { en: 'Matched', ar: 'مطابقة تامة' }, color: '#355c4b', bg: '#e8f0ec' },
  pending: { label: { en: 'Pending match', ar: 'بانتظار المطابقة' }, color: '#8a6b3f', bg: '#f6edde' },
  flagged: { label: { en: 'Variance', ar: 'فرق يتطلّب مراجعة' }, color: '#b5403b', bg: '#faeceb' },
}

export function OwnerSupply() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { finished, invoices, reconcileInvoice } = useOwnerState()
  const [view, setView] = useState<'po' | 'raw' | 'finished' | 'suppliers'>('po')
  const tabs = [
    { id: 'po' as const, label: pick({ en: 'Purchases', ar: 'المشتريات' }) },
    { id: 'raw' as const, label: pick({ en: 'Raw materials', ar: 'المواد الخام' }) },
    { id: 'finished' as const, label: pick({ en: 'Finished goods', ar: 'المواد المصنعة' }) },
    { id: 'suppliers' as const, label: pick({ en: 'Suppliers', ar: 'دليل المورّدين' }) },
  ]

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Supply chain', ar: 'سلسلة الإمداد' })} subtitle={pick({ en: 'Procurement, inventory and suppliers', ar: 'المشتريات والمخزون والموردين' })} />
      <SegTabs tabs={tabs} active={view} onChange={setView} />

      {view === 'po' && (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-hairline">
            {invoices.map((iv) => {
              const m = matchMeta[iv.match]
              const canReconcile = iv.match !== 'matched'
              return (
                <li key={iv.id} className="flex flex-wrap items-center gap-md px-lg py-md">
                  <div className="flex-1 min-w-0"><p className="font-sans text-data text-ink tabular-nums">{iv.id}</p><p className="font-sans text-caption text-ink-subtle truncate">{pick(iv.supplier)} · {pick(iv.material)} · {pick(iv.date)}</p></div>
                  <span className="font-sans text-data text-ink tabular-nums">{money(iv.totalMinor)}</span>
                  <Pill color={m.color} bg={m.bg}>{pick(m.label)}</Pill>
                  {canReconcile && (
                    <button onClick={() => { reconcileInvoice(iv.id); flash(`${pick({ en: 'Reconciled', ar: 'طوبقت' })} · ${iv.id}`) }} className="inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption bg-success/10 text-success hover:bg-success/15 transition-colors"><Check size={13} /> {pick({ en: 'Reconcile', ar: 'مطابقة' })}</button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {view === 'raw' && <RawInventory flash={flash} />}

      {view === 'finished' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[560px]">
            <thead><tr className="bg-surface-2 border-b border-hairline">{[pick({ en: 'Batch', ar: 'الدفعة' }), pick({ en: 'System', ar: 'النظام' }), pick({ en: 'Counted', ar: 'المجرود' }), pick({ en: 'Variance', ar: 'الفرق' }), pick({ en: 'Expiry', ar: 'الصلاحية' })].map((h, i) => <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', i === 0 ? 'text-start' : 'text-end')}>{h}</th>)}</tr></thead>
            <tbody>{finished.map((b) => { const v = b.countedQty - b.systemQty; return (
              <tr key={b.code} className="border-b border-hairline last:border-0">
                <td className="px-lg py-md"><p className="font-sans text-data text-ink">{pick(b.product)}</p><p className="font-sans text-caption text-ink-subtle tabular-nums">{b.code}</p></td>
                <td className="px-lg py-md text-end font-sans text-data text-ink-muted tabular-nums">{b.systemQty.toLocaleString()}</td>
                <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums">{b.countedQty.toLocaleString()}</td>
                <td className={cn('px-lg py-md text-end font-sans text-data tabular-nums', v === 0 ? 'text-ink-subtle' : v < 0 ? 'text-danger' : 'text-success')}>{v > 0 ? '+' : ''}{v}</td>
                <td className={cn('px-lg py-md text-end font-sans text-caption tabular-nums', b.expiryDays <= 14 ? 'text-danger' : 'text-ink-subtle')}>{b.expiryDays} {pick({ en: 'd', ar: 'يوم' })}</td>
              </tr>
            )})}</tbody>
          </table></div>
        </div>
      )}

      {view === 'suppliers' && (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-hairline">
            {suppliers.map((s) => {
              const col = s.score >= 90 ? '#355c4b' : s.score >= 75 ? '#b08a57' : '#b5403b'
              return (
                <li key={s.id} className="flex items-center gap-md px-lg py-md">
                  <div className="flex-1 min-w-0"><p className="font-sans text-data text-ink truncate">{pick(s.name)}</p><p className="font-sans text-caption text-ink-subtle">{pick(s.material)} · {pick({ en: 'lead', ar: 'مهلة' })} {s.leadDays}{pick({ en: 'd', ar: 'ي' })} · {pick({ en: 'on-time', ar: 'الالتزام' })} {s.onTimePct}%</p></div>
                  <div className="w-28"><UtilBar pct={s.score} color={col} /></div>
                  <span className="font-serif text-card-title tabular-nums" style={{ color: col }}>{s.score}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function RawInventory({ flash }: { flash: (m: string) => void }) {
  const { pick, money } = useLocale()
  const { rawQty, rawPct, reorderRaw, finalizeStockTake } = useOwnerState()
  const [mode, setMode] = useState<'browse' | 'count'>('browse')
  const [counts, setCounts] = useState<Record<string, number>>({})

  const netLoss = rawMaterials.reduce((a, r) => {
    const c = counts[r.key]
    if (c == null) return a
    const variance = c - rawQty[r.key]
    return a + Math.round((variance / (rawMaterials.find((m) => m.key === r.key)!.systemQty || 1)) * r.landedMinor)
  }, 0)
  const finalize = () => { finalizeStockTake(counts); setCounts({}); flash(pick({ en: 'Stock-take finalized — inventory updated', ar: 'أُنهي الجرد — حُدّث المخزون' })) }
  const reorder = (key: string, name: { en: string; ar: string }) => { reorderRaw(key as never); flash(`${pick({ en: 'Reordered & restocked', ar: 'أُعيد الطلب وتم التوريد' })} · ${pick(name)}`) }
  // Build a real CSV of current inventory and trigger a browser download.
  const exportReport = () => {
    const header = ['Material', 'Quantity', 'Unit', 'Level %', 'Reorder %', 'Below reorder', 'Landed cost (SAR)']
    const rows = rawMaterials.map((r) => {
      const pct = rawPct(r.key)
      return [r.name.en, String(rawQty[r.key]), r.unit.en, String(pct), String(r.reorderPct), pct < r.reorderPct ? 'YES' : 'no', String(Math.round(r.landedMinor / 100))]
    })
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'jaz-inventory-report.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    flash(pick({ en: 'Inventory report downloaded (CSV)', ar: 'نُزّل تقرير المخزون (CSV)' }))
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between gap-sm">
        <SegTabs tabs={[{ id: 'browse', label: pick({ en: 'Browse', ar: 'تصفّح' }) }, { id: 'count', label: pick({ en: 'Stock-take', ar: 'جرد' }) }]} active={mode} onChange={setMode} />
        {mode === 'count' ? (
          <button onClick={finalize} disabled={Object.keys(counts).length === 0} className={buttonClass('primary', 'sm')}><ClipboardCheck size={15} /> {pick({ en: 'Finalize', ar: 'إنهاء الجرد' })}</button>
        ) : (
          <button onClick={exportReport} className={buttonClass('secondary', 'sm')}>{pick({ en: 'Inventory report', ar: 'تقرير المخزون' })}</button>
        )}
      </div>

      {mode === 'browse' ? (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-hairline">
            {rawMaterials.map((r) => {
              const pct = rawPct(r.key), low = pct < r.reorderPct
              return (
                <li key={r.key} className="flex flex-wrap items-center gap-md px-lg py-md">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-sm"><span className="font-sans text-data text-ink">{pick(r.name)}</span>{low && <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Below reorder', ar: 'دون نقطة الطلب' })}</Pill>}</div>
                    <p className="font-sans text-caption text-ink-subtle tabular-nums">{rawQty[r.key].toLocaleString()} {pick(r.unit)} · {pct}% · {pick({ en: 'landed', ar: 'التكلفة' })} {money(r.landedMinor)}</p>
                    <div className="mt-xs max-w-[280px]"><UtilBar pct={pct} color={low ? '#b5403b' : '#b08a57'} marker={r.reorderPct} /></div>
                  </div>
                  <button onClick={() => reorder(r.key, r.name)} className={cn('rounded-md px-3 py-1.5 font-sans text-caption', low ? 'bg-danger/10 text-danger hover:bg-danger/15' : 'bg-surface-2 text-ink-muted hover:text-ink border border-hairline')}>{low ? pick({ en: 'Reorder', ar: 'اطلب' }) : pick({ en: 'Restock', ar: 'توريد' })}</button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[560px]">
            <thead><tr className="bg-surface-2 border-b border-hairline">{[pick({ en: 'Material', ar: 'المادة' }), pick({ en: 'System', ar: 'النظام' }), pick({ en: 'Counted', ar: 'المجرود' }), pick({ en: 'Variance', ar: 'الفرق' }), pick({ en: 'Value', ar: 'القيمة' })].map((h, i) => <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', i === 0 ? 'text-start' : i === 2 ? 'text-center' : 'text-end')}>{h}</th>)}</tr></thead>
            <tbody>{rawMaterials.map((r) => {
              const sys = rawQty[r.key]; const c = counts[r.key]; const variance = c == null ? 0 : c - sys; const val = c == null ? 0 : Math.round((variance / (r.systemQty || 1)) * r.landedMinor)
              return (
                <tr key={r.key} className="border-b border-hairline last:border-0">
                  <td className="px-lg py-md font-sans text-data text-ink">{pick(r.name)}</td>
                  <td className="px-lg py-md text-end font-sans text-data text-ink-muted tabular-nums"><span className="inline-flex items-center gap-xxs"><Lock size={11} /> {sys.toLocaleString()}</span></td>
                  <td className="px-lg py-md text-center"><input value={c ?? ''} onChange={(e) => setCounts((p) => ({ ...p, [r.key]: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 }))} placeholder={String(sys)} className="input w-24 text-center py-1.5 tabular-nums" inputMode="numeric" /></td>
                  <td className={cn('px-lg py-md text-end font-sans text-data tabular-nums', variance === 0 ? 'text-ink-subtle' : variance < 0 ? 'text-danger' : 'text-success')}>{c == null ? '—' : (variance > 0 ? '+' : '') + variance}</td>
                  <td className={cn('px-lg py-md text-end font-sans text-data tabular-nums', val < 0 ? 'text-danger' : val > 0 ? 'text-success' : 'text-ink-subtle')}>{c == null ? '—' : money(val)}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
          <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex items-center justify-between"><span className="font-sans text-data text-ink-muted">{pick({ en: 'Net value impact', ar: 'صافي أثر القيمة' })}</span><span className={cn('font-serif text-card-title tabular-nums', netLoss < 0 ? 'text-danger' : netLoss > 0 ? 'text-success' : 'text-ink')}>{money(netLoss)}</span></div>
        </div>
      )}
    </div>
  )
}
