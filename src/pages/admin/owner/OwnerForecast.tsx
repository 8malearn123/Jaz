import { useState } from 'react'
import { CalendarRange, Check, Percent, Eye, TrendingUp, Printer } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { buttonClass } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { megaCatalog } from '@/data/mega'
import { forecastMonths, forecastActualsSeed, FORECAST_NEAR_MONTHS, type ClientForecast, type ForecastMonthDef } from '@/data/forecasts'
import { useForecast } from '@/state/ForecastContext'
import { openPrintWindow } from '@/lib/printWindow'
import { cn } from '@/lib/cn'
import { StatCard, Pill, UtilBar } from './_shared'

const bySku = Object.fromEntries(megaCatalog.map((p) => [p.sku, p]))

// Fulfillment tone: green when the month is essentially delivered on plan.
const fulfillColor = (pct: number) => (pct >= 90 ? '#2f7d5b' : pct >= 60 ? '#8a6b3f' : '#b5403b')

/** Owner/export-manager view of the yearly forecasts: every client, a month
 *  calendar with expected sales value & purchase cost, and the per-client
 *  change tolerance that governs the partners' near-window edits. */
export function OwnerForecastPanel() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { forecasts, setChangeLimit } = useForecast()
  const [draftPct, setDraftPct] = useState<Record<string, string>>({})
  const [viewMonth, setViewMonth] = useState<ForecastMonthDef | null>(null)

  const cellQty = (f: ClientForecast, mk: string) =>
    Object.entries(f.qty[mk] ?? {}).reduce((a, [, q]) => a + q, 0)
  const monthAgg = (mk: string) => {
    let pallets = 0, sales = 0, cost = 0
    for (const f of forecasts) {
      for (const [sku, q] of Object.entries(f.qty[mk] ?? {})) {
        const p = bySku[sku]
        if (!p || !q) continue
        pallets += q; sales += q * p.pricePerPalletMinor; cost += q * p.costPerPalletMinor
      }
    }
    return { pallets, sales, cost }
  }
  const year = forecastMonths.reduce((acc, m) => {
    const a = monthAgg(m.key)
    return { pallets: acc.pallets + a.pallets, sales: acc.sales + a.sales, cost: acc.cost + a.cost }
  }, { pallets: 0, sales: 0, cost: 0 })

  const savePct = (f: ClientForecast) => {
    const raw = draftPct[f.clientId]
    if (raw == null) return
    const pct = Math.max(0, Math.min(100, parseInt(raw.replace(/\D/g, ''), 10) || 0))
    setChangeLimit(f.clientId, pct)
    setDraftPct((prev) => { const next = { ...prev }; delete next[f.clientId]; return next })
    flash(`${pick({ en: 'Change tolerance saved', ar: 'حُفظت نسبة التغيير' })} · ${pick(f.client)} · ±${pct}%`)
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* how the plan works */}
      <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-md flex items-start gap-sm">
        <CalendarRange size={18} className="text-primary-hover shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted">
          {pick({ en: `Every partner commits a rolling 12-month order forecast. The nearest ${FORECAST_NEAR_MONTHS} months are locked to a per-client change tolerance you set below; when a month ends, a new month opens at the end of the horizon for the partner to fill.`, ar: `كل شريك يلتزم بخطة طلبات متجددة لـ ١٢ شهرًا. آخر ${FORECAST_NEAR_MONTHS} أشهر قادمة مقيدة بنسبة تغيير تحددها لكل عميل أدناه؛ وعند انتهاء شهر يُفتح شهر جديد في نهاية الأفق ليعبّئه الشريك.` })}
        </p>
      </div>

      {/* year totals: pallets, expected sales (price) and expected purchase cost (cost) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Forecast pallets · year', ar: 'طبليات السنة المتوقعة' })} value={year.pallets.toLocaleString()} sub={pick({ en: 'All clients', ar: 'كل العملاء' })} tone="dark" />
        <StatCard label={pick({ en: 'Expected sales', ar: 'المبيعات المتوقعة' })} value={money(year.sales, { withSymbol: false })} sub={pick({ en: 'By selected products', ar: 'حسب المنتجات المختارة' })} tone="gold" />
        <StatCard label={pick({ en: 'Expected purchase cost', ar: 'تكاليف الشراء المتوقعة' })} value={money(year.cost, { withSymbol: false })} sub={pick({ en: 'By production cost', ar: 'حسب التكلفة' })} tone="plain" />
        <StatCard label={pick({ en: 'Expected margin', ar: 'الهامش المتوقع' })} value={money(year.sales - year.cost, { withSymbol: false })} sub={`${year.sales > 0 ? Math.round(((year.sales - year.cost) / year.sales) * 100) : 0}%`} tone="green" />
      </div>

      {/* export-manager control: per-client change tolerance for the near window */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Clients & change tolerance', ar: 'العملاء ونسب التغيير المسموحة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: `The ±% each client may adjust within the nearest ${FORECAST_NEAR_MONTHS} months`, ar: `النسبة (±) المسموح لكل عميل تعديلها خلال آخر ${FORECAST_NEAR_MONTHS} أشهر قادمة` })}</p>
        </div>
        <ul className="divide-y divide-hairline">
          {forecasts.map((f) => {
            const yearQty = forecastMonths.reduce((a, m) => a + cellQty(f, m.key), 0)
            const yearVal = forecastMonths.reduce((a, m) => a + Object.entries(f.qty[m.key] ?? {}).reduce((s, [sku, q]) => s + q * (bySku[sku]?.pricePerPalletMinor ?? 0), 0), 0)
            return (
              <li key={f.clientId} className="flex flex-wrap items-center gap-md px-lg py-md">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-sans text-data text-ink truncate">{pick(f.client)}</p>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{f.clientId} · {yearQty.toLocaleString()} {pick({ en: 'pallets / year', ar: 'طبلية / سنة' })} · {money(yearVal)}</p>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="font-sans text-caption text-ink-subtle">±</span>
                  <input value={draftPct[f.clientId] ?? String(f.changeLimitPct)} onChange={(e) => setDraftPct((prev) => ({ ...prev, [f.clientId]: e.target.value.replace(/\D/g, '') }))} className="input w-20 py-1.5 text-center tabular-nums" inputMode="numeric" aria-label={pick({ en: 'Change tolerance %', ar: 'نسبة التغيير %' })} />
                  <Percent size={13} className="text-ink-subtle" />
                  <button onClick={() => savePct(f)} disabled={draftPct[f.clientId] == null || draftPct[f.clientId] === String(f.changeLimitPct)} className={buttonClass('primary', 'sm')}><Check size={14} /> {pick({ en: 'Save', ar: 'حفظ' })}</button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* orders vs forecast — how much of the committed plan actually landed as orders */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-xs">
          <TrendingUp size={16} className="text-primary-hover" />
          <div>
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Orders vs forecast', ar: 'تحليل الطلبات مقابل التنبؤات' })}</h3>
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Booked order pallets against the committed plan, per month', ar: 'طبليات الطلبات الفعلية مقابل الخطة الملتزم بها، لكل شهر' })}</p>
          </div>
        </div>
        <ul className="divide-y divide-hairline">
          {forecastMonths.filter((m) => forecastActualsSeed[m.key]).map((m) => {
            const planned = monthAgg(m.key).pallets
            const actual = Object.values(forecastActualsSeed[m.key]).reduce((a, q) => a + q, 0)
            const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0
            return (
              <li key={m.key} className="flex flex-wrap items-center gap-md px-lg py-md">
                <span className="font-sans text-data text-ink w-28 shrink-0">{pick(m.label)}</span>
                <div className="flex-1 min-w-[160px]"><UtilBar pct={Math.min(100, pct)} color={fulfillColor(pct)} /></div>
                <span className="font-sans text-caption text-ink-subtle tabular-nums">{actual} / {planned} {pick({ en: 'plt', ar: 'طبلية' })}</span>
                <Pill color={fulfillColor(pct)} bg={fulfillColor(pct) + '1a'}>{pct}%</Pill>
              </li>
            )
          })}
          {forecastMonths.every((m) => !forecastActualsSeed[m.key]) && (
            <li className="px-lg py-md font-sans text-caption text-ink-subtle">{pick({ en: 'No booked orders inside the forecast horizon yet.', ar: 'لا طلبات فعلية ضمن أفق الخطة بعد.' })}</li>
          )}
        </ul>
      </div>

      {/* the calendar: a card per month with totals and the client breakdown */}
      <div className="flex flex-col gap-sm">
        <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Forecast calendar', ar: 'تقويم التنبؤات' })}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {forecastMonths.map((m, i) => {
            const a = monthAgg(m.key)
            const actuals = forecastActualsSeed[m.key]
            const actualTotal = actuals ? Object.values(actuals).reduce((x, q) => x + q, 0) : 0
            const pct = actuals && a.pallets > 0 ? Math.round((actualTotal / a.pallets) * 100) : null
            return (
              <div key={m.key} className={cn('card p-lg flex flex-col gap-sm', i < FORECAST_NEAR_MONTHS && 'ring-1 ring-primary/20')}>
                {/* title row stays clean: month + eye; the state pills get their own line */}
                <div className="flex items-center justify-between gap-sm">
                  <span className="font-serif text-card-title text-ink whitespace-nowrap">{pick(m.label)}</span>
                  <button onClick={() => setViewMonth(m)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30 transition-colors shrink-0" aria-label={pick({ en: 'View month details', ar: 'عرض تفاصيل الشهر' })}><Eye size={15} /></button>
                </div>
                {(pct != null || i < FORECAST_NEAR_MONTHS || a.pallets === 0) && (
                  <div className="flex flex-wrap items-center gap-xs -mt-xs">
                    {pct != null && <Pill color={fulfillColor(pct)} bg={fulfillColor(pct) + '1a'}>{pick({ en: 'Fulfilled', ar: 'التنفيذ' })} {pct}%</Pill>}
                    {i < FORECAST_NEAR_MONTHS
                      ? <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Near window', ar: 'ضمن نافذة التقييد' })}</Pill>
                      : a.pallets === 0 ? <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Awaiting fill', ar: 'بانتظار التعبئة' })}</Pill> : null}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-xs">
                  <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Pallets', ar: 'طبليات' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{a.pallets}</span></div>
                  <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Sales', ar: 'مبيعات' })}</span><span className="font-sans text-data text-success tabular-nums">{money(a.sales, { withSymbol: false })}</span></div>
                  <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Cost', ar: 'تكلفة' })}</span><span className="font-sans text-data text-ink-muted tabular-nums">{money(a.cost, { withSymbol: false })}</span></div>
                </div>
                <div className="flex flex-col gap-xxs pt-sm border-t border-hairline">
                  {forecasts.map((f) => {
                    const q = cellQty(f, m.key)
                    return q > 0
                      ? <div key={f.clientId} className="flex items-center justify-between font-sans text-caption"><span className="text-ink-muted truncate">{pick(f.client)}</span><span className="text-ink tabular-nums shrink-0">{q} {pick({ en: 'plt', ar: 'طبلية' })}</span></div>
                      : <div key={f.clientId} className="flex items-center justify-between font-sans text-caption"><span className="text-ink-subtle truncate">{pick(f.client)}</span><span className="text-ink-subtle">—</span></div>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {viewMonth && <MonthDetailModal month={viewMonth} forecasts={forecasts} onClose={() => setViewMonth(null)} />}
    </div>
  )
}

/** Month drill-down: the requested products (aggregated across clients), each
 *  client's plan, and — when orders exist — actual vs forecast with a fulfillment %. */
function MonthDetailModal({ month, forecasts, onClose }: { month: ForecastMonthDef; forecasts: ClientForecast[]; onClose: () => void }) {
  const { pick, money, locale } = useLocale()
  const actuals = forecastActualsSeed[month.key]

  // Aggregate the requested products for this month across all clients.
  const skuTotals = new Map<string, number>()
  for (const f of forecasts) {
    for (const [sku, q] of Object.entries(f.qty[month.key] ?? {})) {
      if (q > 0) skuTotals.set(sku, (skuTotals.get(sku) ?? 0) + q)
    }
  }
  const skuRows = [...skuTotals.entries()]
    .map(([sku, q]) => ({ sku, q, p: bySku[sku] }))
    .filter((r) => r.p)
    .sort((a, b) => b.q - a.q)
  const totals = skuRows.reduce((acc, r) => ({ pallets: acc.pallets + r.q, sales: acc.sales + r.q * r.p.pricePerPalletMinor, cost: acc.cost + r.q * r.p.costPerPalletMinor }), { pallets: 0, sales: 0, cost: 0 })

  // Month-level fulfillment: planned vs booked vs what's still left to order.
  const actualTotal = actuals ? Object.values(actuals).reduce((a, q) => a + q, 0) : null
  const remainingTotal = actualTotal != null ? Math.max(0, totals.pallets - actualTotal) : null
  const monthPct = actualTotal != null && totals.pallets > 0 ? Math.round((actualTotal / totals.pallets) * 100) : null

  // Printable monthly report — the browser's "Save as PDF" produces the file.
  const printReport = () => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    const L = (en: string, ar: string) => (locale === 'ar' ? ar : en)
    const skuRowsHtml = skuRows.map((r) => `<tr><td>${pick(r.p.name)}</td><td>${r.q}</td><td>${money(r.q * r.p.pricePerPalletMinor)}</td><td>${money(r.q * r.p.costPerPalletMinor)}</td></tr>`).join('')
    const clientRowsHtml = forecasts.map((f) => {
      const planned = Object.values(f.qty[month.key] ?? {}).reduce((a, q) => a + q, 0)
      const actual = actuals?.[f.clientId]
      const remaining = actual != null ? Math.max(0, planned - actual) : null
      const pct = actual != null && planned > 0 ? Math.round((actual / planned) * 100) : null
      return `<tr><td>${pick(f.client)}</td><td>${planned}</td><td>${actual ?? '—'}</td><td>${remaining ?? '—'}</td><td>${pct != null ? pct + '%' : '—'}</td></tr>`
    }).join('')
    openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${pick(month.label)}</title><style>
      @page{size:A4 portrait;margin:15mm}
      html,body{margin:0;width:auto}
      *{box-sizing:border-box}
      body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#2b2b2b;-webkit-print-color-adjust:exact}
      h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:18px 0 6px} .sub{color:#777;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:6px}
      th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;word-break:break-word;text-align:${locale === 'ar' ? 'right' : 'left'}}
      th{background:#f3efe8}
      tfoot td{font-weight:700;background:#faf7f1}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
      .kpis div{border:1px solid #e0d8ca;border-radius:8px;padding:8px 10px}
      .kpis b{display:block;color:#777;font-weight:600;font-size:11px;text-transform:uppercase;margin-bottom:2px}
      .foot{margin-top:24px;font-size:11px;color:#999}
      @media print{body{padding:0}}
    </style></head><body>
      <h1>${L('Monthly forecast report', 'تقرير التنبؤات الشهري')} — ${pick(month.label)}</h1>
      <div class="sub">Jaz · ${L('Order forecasts vs booked orders', 'خطة الطلبات مقابل الطلبات الفعلية')}</div>
      <div class="kpis">
        <div><b>${L('Planned pallets', 'الطبليات المخططة')}</b>${totals.pallets}</div>
        <div><b>${L('Booked orders', 'الطلبات الفعلية')}</b>${actualTotal ?? '—'}</div>
        <div><b>${L('Remaining', 'المتبقي')}</b>${remainingTotal ?? '—'}</div>
        <div><b>${L('Fulfillment', 'نسبة التنفيذ')}</b>${monthPct != null ? monthPct + '%' : '—'}</div>
      </div>
      <h2>${L('Requested products', 'الأصناف المطلوبة')}</h2>
      <table><thead><tr><th>${L('Product', 'الصنف')}</th><th>${L('Pallets', 'الطبليات')}</th><th>${L('Sales', 'المبيعات')}</th><th>${L('Cost', 'التكلفة')}</th></tr></thead>
        <tbody>${skuRowsHtml}</tbody>
        <tfoot><tr><td>${L('Total', 'الإجمالي')}</td><td>${totals.pallets}</td><td>${money(totals.sales)}</td><td>${money(totals.cost)}</td></tr></tfoot></table>
      <h2>${L('Clients — forecast vs orders', 'العملاء — التنبؤ مقابل الطلبات')}</h2>
      <table><thead><tr><th>${L('Client', 'العميل')}</th><th>${L('Forecast', 'التنبؤ')}</th><th>${L('Orders', 'الطلبات')}</th><th>${L('Remaining', 'المتبقي')}</th><th>${L('Fulfillment', 'التنفيذ')}</th></tr></thead>
        <tbody>${clientRowsHtml}</tbody></table>
      <div class="foot">${L('Generated from the Jaz owner console.', 'صدر من لوحة تحكم جاز.')}</div>
    </body></html>`)
  }

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Forecast month', ar: 'شهر التنبؤ' })} title={pick(month.label)}
      footer={<div className="flex items-center justify-between w-full">
        <button onClick={printReport} className={buttonClass('secondary', 'sm')}><Printer size={15} /> {pick({ en: 'Print report', ar: 'طباعة التقرير' })}</button>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>
      </div>}>
      <div className="flex flex-col gap-lg">
        {/* month summary: planned vs booked vs remaining */}
        {actualTotal != null && (
          <div className="rounded-lg border border-hairline divide-x divide-hairline rtl:divide-x-reverse grid grid-cols-4 overflow-hidden">
            <div className="px-md py-sm flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Planned', ar: 'المخطط' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{totals.pallets}</span></div>
            <div className="px-md py-sm flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Booked', ar: 'الطلبات الفعلية' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{actualTotal}</span></div>
            <div className="px-md py-sm flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Remaining', ar: 'المتبقي' })}</span><span className={cn('font-serif text-card-title tabular-nums', (remainingTotal ?? 0) > 0 ? 'text-primary-hover' : 'text-success')}>{remainingTotal}</span></div>
            <div className="px-md py-sm flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Fulfillment', ar: 'نسبة التنفيذ' })}</span><span className="font-serif text-card-title tabular-nums" style={{ color: fulfillColor(monthPct ?? 0) }}>{monthPct}%</span></div>
          </div>
        )}
        {/* requested products */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Requested products', ar: 'الأصناف المطلوبة' })}</h4>
          {skuRows.length === 0 ? (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No products planned for this month yet.', ar: 'لا أصناف مخططة لهذا الشهر بعد.' })}</p>
          ) : (
            <div className="rounded-lg border border-hairline overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline">
                    <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{pick({ en: 'Product', ar: 'الصنف' })}</th>
                    <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{pick({ en: 'Pallets', ar: 'طبليات' })}</th>
                    <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{pick({ en: 'Sales', ar: 'مبيعات' })}</th>
                    <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{pick({ en: 'Cost', ar: 'تكلفة' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {skuRows.map((r) => (
                    <tr key={r.sku} className="border-b border-hairline last:border-0">
                      <td className="px-md py-2.5 font-sans text-data text-ink">{pick(r.p.name)}</td>
                      <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{r.q}</td>
                      <td className="px-md py-2.5 text-end font-sans text-data text-success tabular-nums">{money(r.q * r.p.pricePerPalletMinor, { withSymbol: false })}</td>
                      <td className="px-md py-2.5 text-end font-sans text-data text-ink-muted tabular-nums">{money(r.q * r.p.costPerPalletMinor, { withSymbol: false })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-2 border-t border-hairline">
                    <td className="px-md py-2 font-sans text-data font-medium text-ink">{pick({ en: 'Total', ar: 'الإجمالي' })}</td>
                    <td className="px-md py-2 text-end font-sans text-data font-medium text-ink tabular-nums">{totals.pallets}</td>
                    <td className="px-md py-2 text-end font-sans text-data font-medium text-success tabular-nums">{money(totals.sales, { withSymbol: false })}</td>
                    <td className="px-md py-2 text-end font-sans text-data font-medium text-ink-muted tabular-nums">{money(totals.cost, { withSymbol: false })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* per-client plan + fulfillment */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Clients — orders vs forecast', ar: 'العملاء — الطلبات مقابل التنبؤ' })}</h4>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            {forecasts.map((f) => {
              const planned = Object.values(f.qty[month.key] ?? {}).reduce((a, q) => a + q, 0)
              const actual = actuals?.[f.clientId] ?? null
              const remaining = actual != null ? Math.max(0, planned - actual) : null
              const pct = actual != null && planned > 0 ? Math.round((actual / planned) * 100) : null
              const items = Object.entries(f.qty[month.key] ?? {}).filter(([, q]) => q > 0)
              return (
                <div key={f.clientId} className="px-md py-sm flex flex-col gap-xs">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className="font-sans text-data text-ink flex-1 min-w-[140px] truncate">{pick(f.client)}</span>
                    <span className="font-sans text-caption text-ink-subtle tabular-nums">{pick({ en: 'Forecast', ar: 'التنبؤ' })}: {planned} {pick({ en: 'plt', ar: 'طبلية' })}</span>
                    {actual != null && <span className="font-sans text-caption text-ink-subtle tabular-nums">{pick({ en: 'Orders', ar: 'الطلبات' })}: {actual}</span>}
                    {remaining != null && (
                      remaining > 0
                        ? <span className="font-sans text-caption text-primary-hover tabular-nums">{pick({ en: 'Remaining', ar: 'المتبقي' })}: {remaining}</span>
                        : <span className="font-sans text-caption text-success">{pick({ en: 'Plan complete', ar: 'اكتملت الخطة' })} ✓</span>
                    )}
                    {pct != null
                      ? <Pill color={fulfillColor(pct)} bg={fulfillColor(pct) + '1a'}>{pct}%</Pill>
                      : <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'No orders yet', ar: 'لا طلبات بعد' })}</span>}
                  </div>
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      {items.map(([sku, q]) => (
                        <span key={sku} className="rounded-pill border border-hairline-strong bg-surface-2 px-2.5 py-0.5 font-sans text-caption text-ink-muted">{pick(bySku[sku]?.name ?? { en: sku, ar: sku })} · <span className="tabular-nums">{q}</span></span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
