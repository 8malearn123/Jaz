import { useState } from 'react'
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { RankedBars } from '@/components/charts/Charts'
import {
  finBase, finGrossMinor, opexRows, recalIngredients, cogsProducts,
  collectionRows, taxCard, wasteReasons,
} from '@/data/ownerFinance'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, UtilBar } from './_shared'

type FinTab = 'overview' | 'cost' | 'tax' | 'waste'

/** Finance panel. The active sub-view is driven by the sidebar sub-nav (see AdminConsole). */
export function OwnerFinance({ view = 'overview' }: { view?: FinTab }) {
  const { pick, money } = useLocale()
  const { cocoaDelta: cocoa, setCocoa, netProfitMinor, wasteTotalMinor } = useOwnerState()

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
        const oldCogs = recalIngredients.reduce((a, r) => a + r.costMinor, 0)
        const newCogs = recalIngredients.reduce((a, r) => a + (r.cocoaLinked ? Math.round(r.costMinor * factor) : r.costMinor), 0)
        const up = cocoa >= 0
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
              <h3 className="font-serif text-card-title text-ink mb-xs">{pick({ en: 'Recalibration · Jasmine luxury box', ar: 'إعادة معايرة · بوكس الفُل الفاخر' })}</h3>
              {recalIngredients.map((r, i) => {
                const nv = r.cocoaLinked ? Math.round(r.costMinor * factor) : r.costMinor
                return (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="font-sans text-data text-ink-muted">{pick(r.name)} {r.cocoaLinked && <span className="text-primary-hover text-caption">· {pick({ en: 'cocoa-linked', ar: 'مرتبط بالكاكاو' })}</span>}</span>
                    <span className="font-sans text-data tabular-nums text-ink">{r.cocoaLinked && nv !== r.costMinor ? <><span className="text-ink-subtle line-through me-1">{money(r.costMinor, { withSymbol: false })}</span>{money(nv, { withSymbol: false })}</> : money(nv, { withSymbol: false })}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between border-t border-hairline pt-sm mt-xs">
                <span className="font-sans text-data text-ink font-medium">{pick({ en: 'Unit COGS', ar: 'تكلفة الوحدة' })}</span>
                <span className="font-sans text-data tabular-nums">{oldCogs !== newCogs ? <><span className="text-ink-subtle line-through me-1">{money(oldCogs)}</span><span className={cn('font-semibold', newCogs > oldCogs ? 'text-danger' : 'text-success')}>{money(newCogs)}</span></> : money(newCogs)}</span>
              </div>
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
      )}

      {view === 'waste' && <WasteTab />}
    </div>
  )
}

function WasteTab() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { wasteLog, logWaste, wasteTotalMinor } = useOwnerState()
  const [item, setItem] = useState('')
  const [reason, setReason] = useState(0)
  const [loss, setLoss] = useState(0)
  const total = wasteTotalMinor
  const submit = () => {
    if (!item.trim() || loss <= 0) return
    logWaste({ item: { en: item, ar: item }, reason: wasteReasons[reason], lossMinor: loss * 100 })
    flash(pick({ en: 'Logged — charged to operating account', ar: 'سُجّل — خُصم من الحساب التشغيلي' }))
    setItem(''); setLoss(0)
  }
  return (
    <div className="flex flex-col gap-lg">
      <div className="card p-lg flex flex-wrap items-end gap-md">
        <label className="flex flex-col gap-xs flex-1 min-w-[160px]"><span className="label">{pick({ en: 'Item', ar: 'الصنف' })}</span><input value={item} onChange={(e) => setItem(e.target.value)} className="input" placeholder={pick({ en: 'Batch / product', ar: 'دفعة / منتج' })} /></label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Reason', ar: 'السبب' })}</span>
          <select value={reason} onChange={(e) => setReason(Number(e.target.value))} className="input cursor-pointer">{wasteReasons.map((r, i) => <option key={i} value={i}>{pick(r)}</option>)}</select>
        </label>
        <label className="flex flex-col gap-xs w-28"><span className="label">{pick({ en: 'Loss (﷼)', ar: 'الخسارة (﷼)' })}</span><input value={loss || ''} onChange={(e) => setLoss(Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className="input tabular-nums" placeholder="0" inputMode="numeric" /></label>
        <button onClick={submit} disabled={!item.trim() || loss <= 0} className="btn btn-sm bg-danger text-on-danger hover:bg-danger/90">{pick({ en: 'Log waste', ar: 'تسجيل الهدر' })}</button>
      </div>
      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {wasteLog.map((w) => (
            <li key={w.id} className="flex items-center gap-md px-lg py-md">
              <span className="grid place-items-center w-9 h-9 rounded-pill bg-danger/10 text-danger shrink-0"><Trash2 size={15} /></span>
              <div className="flex-1 min-w-0"><p className="font-sans text-data text-ink truncate">{pick(w.item)}</p><p className="font-sans text-caption text-ink-subtle">{pick(w.reason)} · {pick(w.at)}</p></div>
              <span className="font-sans text-data text-danger tabular-nums">−{money(w.lossMinor)}</span>
            </li>
          ))}
        </ul>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex items-center justify-between"><span className="font-sans text-data text-ink-muted">{pick({ en: 'Total waste', ar: 'إجمالي الهدر' })}</span><span className="font-serif text-card-title text-danger tabular-nums">−{money(total)}</span></div>
      </div>
    </div>
  )
}
