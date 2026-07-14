import type { Bilingual } from './types'

// ── Yearly order forecasts (rolling 12-month horizon) ──
// Each contracted partner commits a 12-month order forecast (pallets per
// product per month). The nearest N months are locked to a change tolerance
// (±%) that the export manager sets per client; further months edit freely.
// The horizon rolls: when a month ends, a new 12th month opens at the end of
// the plan and the partner is asked to fill it (July 2026 just ended → the
// freshly-opened Jul 2027 is seeded empty for the export partner).

export const FORECAST_NEAR_MONTHS = 3

export interface ForecastMonthDef { key: string; label: Bilingual }
export const forecastMonths: ForecastMonthDef[] = [
  { key: '2026-08', label: { en: 'Aug 2026', ar: 'أغسطس ٢٠٢٦' } },
  { key: '2026-09', label: { en: 'Sep 2026', ar: 'سبتمبر ٢٠٢٦' } },
  { key: '2026-10', label: { en: 'Oct 2026', ar: 'أكتوبر ٢٠٢٦' } },
  { key: '2026-11', label: { en: 'Nov 2026', ar: 'نوفمبر ٢٠٢٦' } },
  { key: '2026-12', label: { en: 'Dec 2026', ar: 'ديسمبر ٢٠٢٦' } },
  { key: '2027-01', label: { en: 'Jan 2027', ar: 'يناير ٢٠٢٧' } },
  { key: '2027-02', label: { en: 'Feb 2027', ar: 'فبراير ٢٠٢٧' } },
  { key: '2027-03', label: { en: 'Mar 2027', ar: 'مارس ٢٠٢٧' } },
  { key: '2027-04', label: { en: 'Apr 2027', ar: 'أبريل ٢٠٢٧' } },
  { key: '2027-05', label: { en: 'May 2027', ar: 'مايو ٢٠٢٧' } },
  { key: '2027-06', label: { en: 'Jun 2027', ar: 'يونيو ٢٠٢٧' } },
  { key: '2027-07', label: { en: 'Jul 2027', ar: 'يوليو ٢٠٢٧' } },
]

// month → sku → pallets
export type ForecastPlan = Record<string, Record<string, number>>

export interface ClientForecast {
  clientId: string
  client: Bilingual
  changeLimitPct: number // ± tolerance inside the near window — export manager sets this per client
  qty: ForecastPlan
}

// Build a plan from 12-entry arrays keyed by SKU.
const plan = (skus: Record<string, number[]>): ForecastPlan => {
  const out: ForecastPlan = {}
  forecastMonths.forEach((m, i) => {
    out[m.key] = {}
    for (const [sku, arr] of Object.entries(skus)) out[m.key][sku] = arr[i] ?? 0
  })
  return out
}

export const clientForecastsSeed: ClientForecast[] = [
  {
    clientId: 'MEGA-01', client: { en: 'Gulf Export Partners', ar: 'شركاء الخليج للتصدير' }, changeLimitPct: 10,
    // the last month just opened (rolling horizon) — awaiting the partner's numbers
    qty: plan({
      'PLT-ASSORTED': [6, 6, 7, 8, 9, 10, 8, 7, 6, 6, 7, 0],
      'PLT-SEASON': [3, 3, 4, 5, 6, 8, 5, 4, 3, 3, 4, 0],
      'PLT-GIFTBOX': [2, 2, 3, 4, 5, 6, 4, 3, 2, 2, 3, 0],
      'BULK-COUVERTURE': [4, 4, 4, 5, 5, 6, 5, 4, 4, 4, 5, 0],
    }),
  },
  {
    clientId: 'V-03', client: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, changeLimitPct: 15,
    qty: plan({
      'PLT-ASSORTED': [10, 10, 11, 12, 14, 16, 12, 11, 10, 10, 11, 12],
      'PLT-SEASON': [4, 4, 5, 6, 8, 10, 6, 5, 4, 4, 5, 6],
      'PLT-GIFTBOX': [3, 3, 4, 5, 6, 8, 5, 4, 3, 3, 4, 5],
    }),
  },
  {
    clientId: 'V-01', client: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, changeLimitPct: 20,
    qty: plan({
      'PLT-GIFTBOX': [2, 2, 2, 3, 4, 5, 3, 2, 2, 2, 3, 3],
      'PLT-DATES': [3, 3, 4, 5, 6, 7, 5, 4, 3, 3, 4, 5],
      'BULK-COCOA': [2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 3, 3],
    }),
  },
]
