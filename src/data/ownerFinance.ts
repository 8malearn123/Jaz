import type { Bilingual } from './types'

// ── Owner finance & costs (isolated).

export const finBase = {
  revenueMinor: 284750000,
  cogsMinor: 163100000,
  wasteMinor: 834000,
}
export const finGrossMinor = finBase.revenueMinor - finBase.cogsMinor

// Operating expenses are NOT seeded — salaries, rent and the like are the owner's
// own affairs; the platform can't know them.
export interface ExpenseEntry { id: string; category: Bilingual; amountMinor: number; note?: string; at: Bilingual }

export interface CollectionRow { label: Bilingual; pct: number; note: Bilingual }
export const collectionRows: CollectionRow[] = [
  { label: { en: 'Cash · B2C', ar: 'نقدًا · B2C' }, pct: 100, note: { en: 'Collected at checkout', ar: 'يُحصّل عند الدفع' } },
  { label: { en: 'Receivables · HoReCa', ar: 'ذمم · HoReCa' }, pct: 68, note: { en: 'Net 30 terms', ar: 'شروط صافي ٣٠' } },
  { label: { en: 'Milestone · B2B', ar: 'مراحل · B2B' }, pct: 45, note: { en: 'On delivery milestones', ar: 'عند مراحل التسليم' } },
]

// ── Receivables by account (collection tab): who owes what, and how late ──
export interface ReceivableRow {
  id: string
  account: Bilingual
  channel: 'B2B' | 'MEGA'
  outstandingMinor: number
  dueDate: Bilingual
  daysLate: number // 0 = within terms
}
export const receivables: ReceivableRow[] = [
  { id: 'AR-01', account: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, channel: 'MEGA', outstandingMinor: 26400000, dueDate: { en: '12 Jun', ar: '١٢ يونيو' }, daysLate: 27 },
  { id: 'AR-02', account: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, channel: 'B2B', outstandingMinor: 4820000, dueDate: { en: '28 Jun', ar: '٢٨ يونيو' }, daysLate: 11 },
  { id: 'AR-03', account: { en: 'Hyper Panda', ar: 'هايبر بنده' }, channel: 'MEGA', outstandingMinor: 35200000, dueDate: { en: '02 Aug', ar: '٠٢ أغسطس' }, daysLate: 0 },
  { id: 'AR-04', account: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, channel: 'B2B', outstandingMinor: 3180000, dueDate: { en: '25 Jul', ar: '٢٥ يوليو' }, daysLate: 0 },
  { id: 'AR-05', account: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, channel: 'B2B', outstandingMinor: 1240000, dueDate: { en: '05 Jul', ar: '٠٥ يوليو' }, daysLate: 4 },
  { id: 'AR-06', account: { en: 'Aseer Events LLC', ar: 'عسير للفعاليات' }, channel: 'B2B', outstandingMinor: 2760000, dueDate: { en: '30 Jul', ar: '٣٠ يوليو' }, daysLate: 0 },
]

export interface WasteEntry {
  id: string
  item: Bilingual
  reason: Bilingual // justification for the waste
  lossMinor: number
  at: Bilingual
  by?: Bilingual // account that recorded the waste
  qty?: number
  unit?: Bilingual
  scope?: 'raw' | 'finished'
}
export const wasteLog: WasteEntry[] = [
  { id: 'w-1', item: { en: 'Rose box · BATCH-FG-091', ar: 'بوكس الورد · BATCH-FG-091' }, reason: { en: 'Near expiry', ar: 'قرب الانتهاء' }, lossMinor: 372000, at: { en: '05 Jul', ar: '٠٥ يوليو' }, by: { en: 'Hind Al-Asiri — production', ar: 'هند العسيري — الإنتاج' }, qty: 12, unit: { en: 'unit', ar: 'وحدة' }, scope: 'finished' },
  { id: 'w-2', item: { en: 'Milk bars', ar: 'ألواح حليب' }, reason: { en: 'Melted in transit', ar: 'ذابت أثناء النقل' }, lossMinor: 186000, at: { en: '04 Jul', ar: '٠٤ يوليو' }, by: { en: 'Salem Al-Ghamdi — warehouse', ar: 'سالم الغامدي — أمين المستودع' }, qty: 49, unit: { en: 'unit', ar: 'وحدة' }, scope: 'finished' },
  { id: 'w-3', item: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, reason: { en: 'Processing loss', ar: 'فاقد تصنيع' }, lossMinor: 164000, at: { en: '03 Jul', ar: '٠٣ يوليو' }, by: { en: 'Hind Al-Asiri — production', ar: 'هند العسيري — الإنتاج' }, qty: 36, unit: { en: 'kg', ar: 'كجم' }, scope: 'raw' },
  { id: 'w-4', item: { en: 'Gold foil', ar: 'ورق ذهبي' }, reason: { en: 'Print defects', ar: 'عيوب طباعة' }, lossMinor: 112000, at: { en: '02 Jul', ar: '٠٢ يوليو' }, by: { en: 'Salem Al-Ghamdi — warehouse', ar: 'سالم الغامدي — أمين المستودع' }, qty: 350, unit: { en: 'roll', ar: 'لفة' }, scope: 'raw' },
]

export const wasteReasons: Bilingual[] = [
  { en: 'Near expiry', ar: 'قرب الانتهاء' },
  { en: 'Damaged / melted', ar: 'تالف / ذائب' },
  { en: 'Processing loss', ar: 'فاقد تصنيع' },
  { en: 'Print defects', ar: 'عيوب طباعة' },
]
