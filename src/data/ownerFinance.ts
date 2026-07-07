import type { Bilingual } from './types'

// ── Owner finance & costs (isolated). Reads no shared price data; the cocoa
// slider recomputes COGS/margins into view-models only (never writes back).

export const finBase = {
  revenueMinor: 284750000,
  cogsMinor: 163100000,
  wasteMinor: 834000,
  opexMinor: 31500000,
}
export const finGrossMinor = finBase.revenueMinor - finBase.cogsMinor
export const finNetMinor = finGrossMinor - finBase.opexMinor - finBase.wasteMinor

export interface OpexRow { label: Bilingual; amountMinor: number }
export const opexRows: OpexRow[] = [
  { label: { en: 'Salaries', ar: 'الرواتب' }, amountMinor: 14200000 },
  { label: { en: 'Rent & utilities', ar: 'الإيجار والمرافق' }, amountMinor: 6800000 },
  { label: { en: 'Logistics', ar: 'اللوجستيات' }, amountMinor: 4900000 },
  { label: { en: 'Marketing', ar: 'التسويق' }, amountMinor: 3300000 },
  { label: { en: 'General & admin', ar: 'عمومية وإدارية' }, amountMinor: 1500000 },
]

// Cocoa-linked COGS recalibration for one reference product ("Jasmine luxury box").
export interface RecalIngredient { name: Bilingual; costMinor: number; cocoaLinked: boolean }
export const recalIngredients: RecalIngredient[] = [
  { name: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, costMinor: 4200, cocoaLinked: true },
  { name: { en: 'Milk powder', ar: 'حليب مجفف' }, costMinor: 1800, cocoaLinked: false },
  { name: { en: 'Sugar', ar: 'سكر' }, costMinor: 600, cocoaLinked: false },
  { name: { en: 'Gold foil', ar: 'ورق ذهبي' }, costMinor: 900, cocoaLinked: false },
  { name: { en: 'Packaging', ar: 'التغليف' }, costMinor: 1500, cocoaLinked: false },
]

// Per-product margin-impact cards; cocoa cost is the only slider-linked component.
export interface CogsProduct { name: Bilingual; priceMinor: number; fixedCostMinor: number; cocoaCostMinor: number }
export const cogsProducts: CogsProduct[] = [
  { name: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, priceMinor: 16800, fixedCostMinor: 4800, cocoaCostMinor: 4200 },
  { name: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, priceMinor: 4400, fixedCostMinor: 900, cocoaCostMinor: 1400 },
  { name: { en: 'Hotel amenity bar', ar: 'لوح ضيافة الفندق' }, priceMinor: 3800, fixedCostMinor: 1100, cocoaCostMinor: 900 },
]

export interface CollectionRow { label: Bilingual; pct: number; note: Bilingual }
export const collectionRows: CollectionRow[] = [
  { label: { en: 'Cash · B2C', ar: 'نقدًا · B2C' }, pct: 100, note: { en: 'Collected at checkout', ar: 'يُحصّل عند الدفع' } },
  { label: { en: 'Receivables · B2B std', ar: 'ذمم · B2B قياسي' }, pct: 68, note: { en: 'Net 30 terms', ar: 'شروط صافي ٣٠' } },
  { label: { en: 'Milestone · mega', ar: 'مراحل · ضخم' }, pct: 45, note: { en: 'On delivery milestones', ar: 'عند مراحل التسليم' } },
]

export const taxCard = { outputMinor: 4271200, inputMinor: 2798400, netMinor: 1472800, dueDate: { en: '31 Jul 2026', ar: '٣١ يوليو ٢٠٢٦' } }

export interface WasteEntry { id: string; item: Bilingual; reason: Bilingual; lossMinor: number; at: Bilingual }
export const wasteLog: WasteEntry[] = [
  { id: 'w-1', item: { en: 'Rose box · BATCH-FG-091', ar: 'بوكس الورد · BATCH-FG-091' }, reason: { en: 'Near expiry', ar: 'قرب الانتهاء' }, lossMinor: 372000, at: { en: '05 Jul', ar: '٠٥ يوليو' } },
  { id: 'w-2', item: { en: 'Milk bars', ar: 'ألواح حليب' }, reason: { en: 'Melted in transit', ar: 'ذابت أثناء النقل' }, lossMinor: 186000, at: { en: '04 Jul', ar: '٠٤ يوليو' } },
  { id: 'w-3', item: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, reason: { en: 'Processing loss', ar: 'فاقد تصنيع' }, lossMinor: 164000, at: { en: '03 Jul', ar: '٠٣ يوليو' } },
  { id: 'w-4', item: { en: 'Gold foil', ar: 'ورق ذهبي' }, reason: { en: 'Print defects', ar: 'عيوب طباعة' }, lossMinor: 112000, at: { en: '02 Jul', ar: '٠٢ يوليو' } },
]

export const wasteReasons: Bilingual[] = [
  { en: 'Near expiry', ar: 'قرب الانتهاء' },
  { en: 'Damaged / melted', ar: 'تالف / ذائب' },
  { en: 'Processing loss', ar: 'فاقد تصنيع' },
  { en: 'Print defects', ar: 'عيوب طباعة' },
]
