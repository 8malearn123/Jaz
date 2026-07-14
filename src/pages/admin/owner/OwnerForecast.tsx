import { useState } from 'react'
import { CalendarRange, Check, Percent } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { buttonClass } from '@/components/ui/Button'
import { megaCatalog } from '@/data/mega'
import { forecastMonths, FORECAST_NEAR_MONTHS, type ClientForecast } from '@/data/forecasts'
import { useForecast } from '@/state/ForecastContext'
import { cn } from '@/lib/cn'
import { StatCard, Pill } from './_shared'

const bySku = Object.fromEntries(megaCatalog.map((p) => [p.sku, p]))

/** Owner/export-manager view of the yearly forecasts: every client, a month
 *  calendar with expected sales value & purchase cost, and the per-client
 *  change tolerance that governs the partners' near-window edits. */
export function OwnerForecastPanel() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { forecasts, setChangeLimit } = useForecast()
  const [draftPct, setDraftPct] = useState<Record<string, string>>({})

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

      {/* the calendar: a card per month with totals and the client breakdown */}
      <div className="flex flex-col gap-sm">
        <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Forecast calendar', ar: 'تقويم التنبؤات' })}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {forecastMonths.map((m, i) => {
            const a = monthAgg(m.key)
            return (
              <div key={m.key} className={cn('card p-lg flex flex-col gap-sm', i < FORECAST_NEAR_MONTHS && 'ring-1 ring-primary/20')}>
                <div className="flex items-center justify-between gap-sm">
                  <span className="font-serif text-card-title text-ink">{pick(m.label)}</span>
                  {i < FORECAST_NEAR_MONTHS
                    ? <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Near window', ar: 'ضمن نافذة التقييد' })}</Pill>
                    : a.pallets === 0 ? <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Awaiting fill', ar: 'بانتظار التعبئة' })}</Pill> : null}
                </div>
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
    </div>
  )
}
