import { useState } from 'react'
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { RankedBars } from '@/components/charts/Charts'
import {
  finBase, finGrossMinor, opexRows, cogsProducts,
  collectionRows, taxCard, receivables,
} from '@/data/ownerFinance'
import { rawMaterials, stockUnits, unitFactor, type RawKey } from '@/data/ownerSupply'
import { RecordWasteModal } from './OwnerSupply'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, UtilBar } from './_shared'

type FinTab = 'overview' | 'cost' | 'tax' | 'waste'

const finNorm = (s: string) => s.trim().toLowerCase()
const finMatches = (q: string, name: { en: string; ar: string }) => finNorm(name.ar).includes(finNorm(q)) || finNorm(name.en).includes(finNorm(q))

/** Finance panel. The active sub-view is driven by the sidebar sub-nav (see AdminConsole). */
export function OwnerFinance({ view = 'overview' }: { view?: FinTab }) {
  const { pick, money } = useLocale()
  const { cocoaDelta: cocoa, setCocoa, netProfitMinor, wasteTotalMinor, products, bomOf } = useOwnerState()
  // Recalibration product picker (search-as-you-type over products that have a recipe).
  const [recalQ, setRecalQ] = useState('')
  const [recalSku, setRecalSku] = useState('BOX-JASMINE')

  const pctOfRev = (m: number) => `${Math.round((m / finBase.revenueMinor) * 100)}%`

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Finance & costs', ar: 'المالية والتكاليف' })} subtitle={pick({ en: 'P&L, cocoa-driven COGS, collection and waste', ar: 'الأرباح، تكلفة الكاكاو، التحصيل والهدر' })} />

      {view === 'overview' && (
        <div className="flex flex-col gap-lg">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-sm">
            <StatCard label={pick({ en: 'Revenue', ar: 'الإيراد' })} value={money(finBase.revenueMinor, { withSymbol: false })} sub="100%" tone="dark" />
            <StatCard label={pick({ en: 'COGS', ar: 'تكلفة البضاعة' })} value={money(finBase.cogsMinor, { withSymbol: false })} sub={pctOfRev(finBase.cogsMinor)} />
            <StatCard label={pick({ en: 'Gross profit', ar: 'الربح الإجمالي' })} value={money(finGrossMinor, { withSymbol: false })} sub={pctOfRev(finGrossMinor)} tone="green" />
            <StatCard label={pick({ en: 'Opex', ar: 'مصاريف تشغيلية' })} value={money(finBase.opexMinor, { withSymbol: false })} sub={pctOfRev(finBase.opexMinor)} />
            <StatCard label={pick({ en: 'Net profit', ar: 'صافي الربح' })} value={money(netProfitMinor, { withSymbol: false })} sub={pctOfRev(netProfitMinor)} tone="gold" />
          </div>
          <div className="grid lg:grid-cols-2 gap-lg items-start">
            <div className="card p-lg flex flex-col gap-sm">
              <h3 className="font-serif text-card-title text-ink mb-xs">{pick({ en: 'P&L statement', ar: 'قائمة الأرباح والخسائر' })}</h3>
              {([['Revenue', 'الإيراد', finBase.revenueMinor, 'add'], ['− COGS', '− تكلفة البضاعة', -finBase.cogsMinor, 'sub'], ['= Gross', '= إجمالي', finGrossMinor, 'total'], ['− Opex', '− تشغيلية', -finBase.opexMinor, 'sub'], ['− Waste', '− هدر', -wasteTotalMinor, 'sub'], ['= Net', '= صافي', netProfitMinor, 'net']] as const).map(([en, ar, v, kind], i) => (
                <div key={i} className={cn('flex items-center justify-between py-1.5', (kind === 'total' || kind === 'net') && 'border-t border-hairline mt-xs pt-sm')}>
                  <span className={cn('font-sans text-data', kind === 'net' ? 'text-ink font-medium' : 'text-ink-muted')}>{pick({ en, ar })}</span>
                  <span className={cn('font-sans text-data tabular-nums', kind === 'net' ? 'text-primary-hover font-semibold' : kind === 'total' ? 'text-success' : v < 0 ? 'text-ink-muted' : 'text-ink')}>{money(Math.abs(v))}</span>
                </div>
              ))}
            </div>
            <div className="card p-lg flex flex-col gap-md">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Operating expenses', ar: 'المصاريف التشغيلية' })}</h3>
              <RankedBars rows={opexRows.map((o) => ({ label: pick(o.label), value: o.amountMinor, display: money(o.amountMinor) }))} />
            </div>
          </div>
        </div>
      )}

      {view === 'cost' && (() => {
        const factor = 1 + cocoa / 100
        const up = cocoa >= 0
        // Recalibration rows come from the selected product's real recipe: qty per unit ×
        // the raw's purchase-derived unit cost (landed cost converted to the stock unit).
        const producible = [...products.b2c, ...products.b2b, ...products.mega].filter((p) => Object.keys(bomOf(p.sku)).length > 0)
        const selProd = producible.find((p) => p.sku === recalSku) ?? null
        const recalMatches = !selProd && recalQ.trim() !== '' ? producible.filter((p) => finMatches(recalQ, p.name)).slice(0, 6) : []
        const rawUnitCost = (k: RawKey) => {
          const r = rawMaterials.find((x) => x.key === k)!
          const cu = stockUnits.find((u) => u.label.en === r.costUnit.en || u.label.ar === r.costUnit.ar)
          const su = stockUnits.find((u) => u.label.en === r.unit.en || u.label.ar === r.unit.ar)
          return Math.round(r.landedMinor / Math.max(1, cu && su ? unitFactor(cu.key, su.key) : 1))
        }
        const rows = selProd
          ? (Object.keys(bomOf(selProd.sku)) as RawKey[]).map((k) => {
            const r = rawMaterials.find((x) => x.key === k)!
            const per = bomOf(selProd.sku)[k]!
            return { name: r.name, qty: per, unit: r.unit, costMinor: Math.round(per * rawUnitCost(k)), cocoaLinked: k === 'cacao' }
          })
          : []
        const oldCogs = rows.reduce((a, r) => a + r.costMinor, 0)
        const newCogs = rows.reduce((a, r) => a + (r.cocoaLinked ? Math.round(r.costMinor * factor) : r.costMinor), 0)
        return (
          <div className="flex flex-col gap-lg">
            <div className="rounded-xl p-lg text-ink-on-dark" style={{ background: 'linear-gradient(160deg,#2b2019,#17120f)' }}>
              <div className="flex items-center justify-between">
                <p className="font-sans text-caption uppercase tracking-[0.12em] text-primary-bright">{pick({ en: 'Cocoa price index', ar: 'مؤشّر سعر الكاكاو' })}</p>
                <span className={cn('inline-flex items-center gap-xxs font-sans text-data tabular-nums rounded-pill px-2.5 py-1', up ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success')}>{up ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {up ? '+' : ''}{cocoa}%</span>
              </div>
              <input type="range" min={-20} max={40} value={cocoa} onChange={(e) => setCocoa(Number(e.target.value))} className="w-full mt-md accent-primary" />
              <p className="font-sans text-caption text-ink-on-dark-muted mt-xs">{pick({ en: 'Drag to model cocoa price movement against COGS and margins.', ar: 'اسحب لمحاكاة حركة سعر الكاكاو على التكلفة والهوامش.' })}</p>
            </div>

            <div className="card p-lg flex flex-col gap-sm">
              {/* top search: pick the product to recalibrate */}
              <div className="flex flex-col gap-xs mb-xs">
                <input
                  value={selProd ? pick(selProd.name) : recalQ}
                  onChange={(e) => { setRecalSku(''); setRecalQ(e.target.value) }}
                  className="input"
                  placeholder={pick({ en: 'Search for a product to recalibrate…', ar: 'ابحث عن منتج لإعادة معايرته…' })}
                />
                {recalMatches.length > 0 && (
                  <div className="rounded-md border border-hairline bg-surface-1 shadow-soft max-h-40 overflow-y-auto divide-y divide-hairline">
                    {recalMatches.map((p) => (
                      <button key={p.sku} type="button" onClick={() => { setRecalSku(p.sku); setRecalQ('') }} className="w-full flex items-center justify-between gap-sm px-3 py-2 text-start hover:bg-surface-2 transition-colors">
                        <span className="font-sans text-data text-ink truncate">{pick(p.name)}</span>
                        <span className="font-sans text-caption text-ink-subtle shrink-0">{pick(p.category)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!selProd && recalQ.trim() !== '' && recalMatches.length === 0 && (
                  <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No product with a recipe matches', ar: 'لا يوجد منتج بوصفة مكونات مطابق' })}</p>
                )}
              </div>
              {selProd ? (
                <>
                  <h3 className="font-serif text-card-title text-ink mb-xs">{pick({ en: 'Recalibration', ar: 'إعادة معايرة' })} · {pick(selProd.name)}</h3>
                  {rows.map((r, i) => {
                    const nv = r.cocoaLinked ? Math.round(r.costMinor * factor) : r.costMinor
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="font-sans text-data text-ink-muted">{pick(r.name)} <span className="text-ink-subtle text-caption tabular-nums">· {r.qty.toLocaleString()} {pick(r.unit)}</span> {r.cocoaLinked && <span className="text-primary-hover text-caption">· {pick({ en: 'cocoa-linked', ar: 'مرتبط بالكاكاو' })}</span>}</span>
                        <span className="font-sans text-data tabular-nums text-ink">{r.cocoaLinked && nv !== r.costMinor ? <><span className="text-ink-subtle line-through me-1">{money(r.costMinor)}</span>{money(nv)}</> : money(nv)}</span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between border-t border-hairline pt-sm mt-xs">
                    <span className="font-sans text-data text-ink font-medium">{pick({ en: 'Unit COGS', ar: 'تكلفة الوحدة' })}</span>
                    <span className="font-sans text-data tabular-nums">{oldCogs !== newCogs ? <><span className="text-ink-subtle line-through me-1">{money(oldCogs)}</span><span className={cn('font-semibold', newCogs > oldCogs ? 'text-danger' : 'text-success')}>{money(newCogs)}</span></> : money(newCogs)}</span>
                  </div>
                </>
              ) : (
                <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Search and pick a product to see its ingredient costs.', ar: 'ابحث واختر منتجًا لعرض تكلفة مكوّناته.' })}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-sm">
              {cogsProducts.map((p, i) => {
                const cocoaNow = Math.round(p.cocoaCostMinor * factor)
                const cogs = p.fixedCostMinor + cocoaNow
                const margin = Math.round(((p.priceMinor - cogs) / p.priceMinor) * 100)
                const base = Math.round(((p.priceMinor - (p.fixedCostMinor + p.cocoaCostMinor)) / p.priceMinor) * 100)
                const col = margin >= 80 ? '#355c4b' : margin >= 65 ? '#b08a57' : '#b5403b'
                return (
                  <div key={i} className="card p-lg flex flex-col gap-xs">
                    <p className="font-sans text-data text-ink truncate">{pick(p.name)}</p>
                    <div className="flex items-baseline gap-xs">
                      <span className="font-serif text-headline tabular-nums" style={{ color: col }}>{margin}%</span>
                      {margin !== base && <span className="font-sans text-caption text-ink-subtle line-through">{base}%</span>}
                    </div>
                    <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'COGS', ar: 'التكلفة' })} {money(cogs)} · {pick({ en: 'price', ar: 'السعر' })} {money(p.priceMinor)}</span>
                    <UtilBar pct={margin} color={col} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {view === 'tax' && (
        <div className="flex flex-col gap-lg">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-lg items-start">
            <div className="card p-lg flex flex-col gap-md">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Collection by channel', ar: 'التحصيل حسب القناة' })}</h3>
              {collectionRows.map((c, i) => (
                <div key={i} className="flex flex-col gap-xxs">
                  <div className="flex items-center justify-between"><span className="font-sans text-data text-ink">{pick(c.label)} <span className="text-ink-subtle text-caption">· {pick(c.note)}</span></span><span className="font-sans text-data text-ink tabular-nums">{c.pct}%</span></div>
                  <UtilBar pct={c.pct} color={c.pct >= 90 ? '#355c4b' : c.pct >= 60 ? '#b08a57' : '#b5403b'} />
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-surface-dark-1 border border-hairline-dark p-lg text-ink-on-dark flex flex-col gap-sm">
              <p className="font-sans text-caption uppercase tracking-[0.12em] text-primary-bright">{pick({ en: 'ZATCA · VAT', ar: 'الهيئة · ضريبة القيمة المضافة' })}</p>
              <div className="flex items-center justify-between"><span className="font-sans text-data text-ink-on-dark-muted">{pick({ en: 'Output VAT', ar: 'ضريبة مخرجات' })}</span><span className="font-sans text-data tabular-nums">{money(taxCard.outputMinor)}</span></div>
              <div className="flex items-center justify-between"><span className="font-sans text-data text-ink-on-dark-muted">{pick({ en: 'Input VAT', ar: 'ضريبة مدخلات' })}</span><span className="font-sans text-data tabular-nums">−{money(taxCard.inputMinor)}</span></div>
              <div className="flex items-center justify-between border-t border-hairline-dark pt-sm mt-xs"><span className="font-sans text-data text-ink-on-dark">{pick({ en: 'Net due', ar: 'صافي المستحق' })}</span><span className="font-serif text-card-title text-primary-bright tabular-nums">{money(taxCard.netMinor)}</span></div>
              <p className="font-sans text-caption text-ink-on-dark-muted">{pick({ en: 'Due', ar: 'يستحق' })} {pick(taxCard.dueDate)}</p>
            </div>
          </div>

          {/* receivables by account — who owes what and how late */}
          <div className="card overflow-hidden">
            <div className="px-lg py-md border-b border-hairline">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Receivables by account', ar: 'التحصيل حسب الحساب' })}</h3>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Every account, its outstanding balance, due date and how late it is', ar: 'كل حساب ومبلغه المستحق وتاريخ استحقاقه وهل هو متأخر بالسداد وكم التأخير' })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline">
                    {[{ h: { en: 'Account', ar: 'الحساب' }, a: 'text-start' }, { h: { en: 'Outstanding', ar: 'المبلغ المستحق' }, a: 'text-end' }, { h: { en: 'Due date', ar: 'تاريخ الاستحقاق' }, a: 'text-start' }, { h: { en: 'Payment status', ar: 'حالة السداد' }, a: 'text-start' }].map((c, i) => (
                      <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...receivables].sort((a, b) => b.daysLate - a.daysLate).map((r) => (
                    <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                      <td className="px-lg py-md">
                        <p className="font-sans text-data text-ink truncate max-w-[240px]">{pick(r.account)}</p>
                        <p className="font-sans text-caption text-ink-subtle">{r.channel === 'MEGA' ? pick({ en: 'B2B MEGA', ar: 'B2B ضخم' }) : 'B2B'}</p>
                      </td>
                      <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums whitespace-nowrap">{money(r.outstandingMinor)}</td>
                      <td className="px-lg py-md font-sans text-data text-ink-muted">{pick(r.dueDate)}</td>
                      <td className="px-lg py-md">
                        {r.daysLate > 0
                          ? <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>{pick({ en: 'Late', ar: 'متأخر' })} · {r.daysLate} {pick({ en: 'days', ar: 'يوم' })}</span>
                          : <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium" style={{ color: '#2f7d5b', backgroundColor: '#e6f2ea' }}>{pick({ en: 'Within terms', ar: 'ضمن المدة' })}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
              <span className="font-sans text-caption text-ink-muted tabular-nums">{pick({ en: 'Total outstanding', ar: 'إجمالي المستحق' })}: {money(receivables.reduce((a, r) => a + r.outstandingMinor, 0))}</span>
              <span className="font-sans text-caption text-danger tabular-nums">{pick({ en: 'Overdue', ar: 'المتأخر' })}: {money(receivables.filter((r) => r.daysLate > 0).reduce((a, r) => a + r.outstandingMinor, 0))} · {receivables.filter((r) => r.daysLate > 0).length} {pick({ en: 'accounts', ar: 'حسابات' })}</span>
            </div>
          </div>
        </div>
      )}

      {view === 'waste' && <WasteTab />}
    </div>
  )
}

function WasteTab() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { wasteLog, wasteTotalMinor } = useOwnerState()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-lg">
      <div className="card p-lg flex flex-wrap items-center justify-between gap-md">
        <div className="min-w-0">
          <p className="font-sans text-data text-ink">{pick({ en: 'Waste is recorded against real stock', ar: 'الهدر يُسجَّل على منتجات المخزون الفعلية' })}</p>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Pick the wasted product (raw or finished) — the loss is valued automatically and stock is deducted.', ar: 'اختر المنتج الذي صار فيه الهدر (خام أو مصنّع) — تُحسب الخسارة تلقائيًا ويُخصم الرصيد من المخزون.' })}</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-sm bg-danger text-on-danger hover:bg-danger/90"><Trash2 size={15} /> {pick({ en: 'Record waste', ar: 'تسجيل هدر' })}</button>
      </div>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {wasteLog.map((w) => (
            <li key={w.id} className="flex items-center gap-md px-lg py-md">
              <span className="grid place-items-center w-9 h-9 rounded-pill bg-danger/10 text-danger shrink-0"><Trash2 size={15} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-data text-ink truncate">{pick(w.item)}{w.qty != null && <span className="text-ink-subtle"> · {w.qty.toLocaleString()} {w.unit ? pick(w.unit) : ''}</span>}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">{pick(w.reason)} · {pick(w.at)}{w.by && <> · {pick({ en: 'by', ar: 'بواسطة' })} {pick(w.by)}</>}</p>
              </div>
              <span className="font-sans text-data text-danger tabular-nums">−{money(w.lossMinor)}</span>
            </li>
          ))}
        </ul>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex items-center justify-between"><span className="font-sans text-data text-ink-muted">{pick({ en: 'Total waste', ar: 'إجمالي الهدر' })}</span><span className="font-serif text-card-title text-danger tabular-nums">−{money(wasteTotalMinor)}</span></div>
      </div>
      {open && <RecordWasteModal flash={flash} onClose={() => setOpen(false)} />}
    </div>
  )
}
