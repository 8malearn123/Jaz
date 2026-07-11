import type { Bilingual } from './types'

// ── Owner executive overview (isolated admin/owner dataset; read-only display) ──
// Money is minor units (halalas) to match the shared money() formatter.

export interface OwnerKpi {
  label: Bilingual
  value: string
  unit?: Bilingual
  delta: number // percent, sign drives up/down colour
  sub: Bilingual
  tone?: 'plain' | 'dark'
}

export const execKpis: OwnerKpi[] = [
  { label: { en: 'Total revenue', ar: 'إجمالي الإيراد' }, value: '2.85M', unit: { en: '﷼', ar: '﷼' }, delta: 12.4, sub: { en: 'This cycle', ar: 'هذه الدورة' } },
  { label: { en: 'Pending orders', ar: 'الطلبات المعلّقة' }, value: '38', delta: 6, sub: { en: '5 over SLA', ar: '٥ تجاوزت المهلة' } },
  { label: { en: 'Factory utilization', ar: 'استغلال المصنع' }, value: '78%', delta: 4.1, sub: { en: 'of 12 t/day', ar: 'من ١٢ طن/يوم' } },
  { label: { en: 'Net margin', ar: 'صافي الهامش' }, value: '31.4%', delta: -1.2, sub: { en: 'Cocoa price pressure', ar: 'متأثّر بارتفاع الكاكاو' }, tone: 'dark' },
]

export interface ChannelRevenue { label: Bilingual; amountMinor: number; pct: number; color: string }
export const execChannels: ChannelRevenue[] = [
  { label: { en: 'B2C retail', ar: 'التجزئة B2C' }, amountMinor: 119595000, pct: 42, color: '#b08a57' },
  { label: { en: 'HoReCa', ar: 'HoReCa' }, amountMinor: 93967500, pct: 33, color: '#355c4b' },
  { label: { en: 'B2B', ar: 'B2B' }, amountMinor: 71187500, pct: 25, color: '#365766' },
]
export const execRevenueTotalMinor = 284750000

export interface FactoryLine { label: Bilingual; pct: number }
export const factoryUtilPct = 78
export const factoryLines: FactoryLine[] = [
  { label: { en: 'Packaging', ar: 'التغليف' }, pct: 92 },
  { label: { en: 'Moulding', ar: 'الصبّ' }, pct: 84 },
  { label: { en: 'Filling', ar: 'الحشو' }, pct: 58 },
  { label: { en: 'Batches', ar: 'الدفعات' }, pct: 0 },
]

export interface OwnerAlert { kind: 'critical' | 'warning'; title: Bilingual; detail: Bilingual; cta: Bilingual }
export const execAlerts: OwnerAlert[] = [
  { kind: 'critical', title: { en: 'Cocoa mass below reorder point', ar: 'كتلة الكاكاو دون نقطة الطلب' }, detail: { en: '0.8 / 1.5 ton', ar: '٠٫٨ / ١٫٥ طن' }, cta: { en: 'Reorder', ar: 'أعد الطلب' } },
  { kind: 'warning', title: { en: 'Milk powder batch expiring', ar: 'دفعة الحليب المجفف قرب الانتهاء' }, detail: { en: 'BATCH-MP-204 · 6 days', ar: 'BATCH-MP-204 · ٦ أيام' }, cta: { en: 'Review', ar: 'مراجعة' } },
  { kind: 'warning', title: { en: 'Gold foil running low', ar: 'ورق التغليف الذهبي منخفض' }, detail: { en: '12% remaining', ar: 'المتبقّي ١٢٪' }, cta: { en: 'Reorder', ar: 'أعد الطلب' } },
  { kind: 'warning', title: { en: 'Rose box near expiry', ar: 'بوكس الورد قرب الانتهاء' }, detail: { en: 'BATCH-FG-091 · 14 days', ar: 'BATCH-FG-091 · ١٤ يومًا' }, cta: { en: 'Discount', ar: 'خصم' } },
]

// 7-month revenue trend (minor units) + target.
export const execTrend: { month: Bilingual; amountMinor: number }[] = [
  { month: { en: 'Jan', ar: 'ينا' }, amountMinor: 210000000 },
  { month: { en: 'Feb', ar: 'فبر' }, amountMinor: 230000000 },
  { month: { en: 'Mar', ar: 'مار' }, amountMinor: 220000000 },
  { month: { en: 'Apr', ar: 'أبر' }, amountMinor: 250000000 },
  { month: { en: 'May', ar: 'ماي' }, amountMinor: 260000000 },
  { month: { en: 'Jun', ar: 'يون' }, amountMinor: 253000000 },
  { month: { en: 'Jul', ar: 'يول' }, amountMinor: 285000000 },
]
export const execTargetMinor = 260000000
