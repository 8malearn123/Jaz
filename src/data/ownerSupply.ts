import type { Bilingual } from './types'

// ── Owner supply chain (isolated). Raw materials, finished batches, purchase
// invoices, suppliers — plus raw availability + BOMs that feed product buildable qty.

export type RawKey = 'cacao' | 'milk' | 'sugar' | 'foil'

export interface RawMaterial {
  key: RawKey
  name: Bilingual
  category: Bilingual
  qtyLabel: Bilingual // e.g. "0.8 ton" / "1,900 rolls"
  pct: number // level %
  reorderPct: number // reorder-point marker %
  landedMinor: number // landed cost
  low: boolean
  systemQty: number // for stock-take
  unit: Bilingual
}

export const rawMaterials: RawMaterial[] = [
  { key: 'cacao', name: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, category: { en: 'Core', ar: 'أساسية' }, qtyLabel: { en: '0.8 ton', ar: '٠٫٨ طن' }, pct: 16, reorderPct: 30, landedMinor: 4600000, low: true, systemQty: 800, unit: { en: 'kg', ar: 'كجم' } },
  { key: 'milk', name: { en: 'Milk powder', ar: 'حليب مجفف' }, category: { en: 'Core', ar: 'أساسية' }, qtyLabel: { en: '2.4 ton', ar: '٢٫٤ طن' }, pct: 62, reorderPct: 30, landedMinor: 1980000, low: false, systemQty: 2400, unit: { en: 'kg', ar: 'كجم' } },
  { key: 'sugar', name: { en: 'Fine sugar', ar: 'سكر ناعم' }, category: { en: 'Core', ar: 'أساسية' }, qtyLabel: { en: '5.1 ton', ar: '٥٫١ طن' }, pct: 84, reorderPct: 25, landedMinor: 850000, low: false, systemQty: 5100, unit: { en: 'kg', ar: 'كجم' } },
  { key: 'foil', name: { en: 'Gold wrapping foil', ar: 'ورق تغليف ذهبي' }, category: { en: 'Packaging', ar: 'تغليف' }, qtyLabel: { en: '1,900 rolls', ar: '١٬٩٠٠ لفة' }, pct: 22, reorderPct: 40, landedMinor: 320000, low: true, systemQty: 1900, unit: { en: 'roll', ar: 'لفة' } },
]

// Raw availability (kg / units) the product buildable computation reads.
export const rawAvail: Record<RawKey, number> = { cacao: 800, milk: 2400, sugar: 5100, foil: 1900 }

// Per-unit bill of materials by product SKU (grams/units of each raw per finished unit).
export const bomBySku: Record<string, Partial<Record<RawKey, number>>> = {
  'BAR-DARK-70': { cacao: 0.07, sugar: 0.02, foil: 1 },
  'BAR-MILK': { cacao: 0.03, milk: 0.03, sugar: 0.02, foil: 1 },
  'BOX-JASMINE': { cacao: 0.28, milk: 0.1, sugar: 0.08, foil: 12 },
  'HOTEL-AMENITY': { cacao: 0.02, milk: 0.02, foil: 1 },
  'PALLET-ASSORTED': { cacao: 22, milk: 8, sugar: 6, foil: 480 },
}

export interface FinishedBatch { code: string; product: Bilingual; systemQty: number; countedQty: number; expiryDays: number }
export const finishedBatches: FinishedBatch[] = [
  { code: 'BATCH-FG-018', product: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, systemQty: 1240, countedQty: 1240, expiryDays: 92 },
  { code: 'BATCH-FG-044', product: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, systemQty: 860, countedQty: 852, expiryDays: 61 },
  { code: 'BATCH-FG-091', product: { en: 'Rose gift box', ar: 'بوكس الورد' }, systemQty: 210, countedQty: 198, expiryDays: 14 },
  { code: 'BATCH-FG-063', product: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, systemQty: 540, countedQty: 545, expiryDays: 47 },
]

export type PurchaseMatch = 'matched' | 'pending' | 'flagged'
export interface PurchaseInvoice { id: string; supplier: Bilingual; material: Bilingual; date: Bilingual; totalMinor: number; match: PurchaseMatch }
export const purchaseInvoices: PurchaseInvoice[] = [
  { id: 'PINV-3312', supplier: { en: 'Barry Callebaut', ar: 'باري كاليبو' }, material: { en: 'Cocoa mass · 5 ton', ar: 'كتلة كاكاو · ٥ طن' }, date: { en: '04 Jul', ar: '٠٤ يوليو' }, totalMinor: 26450000, match: 'matched' },
  { id: 'PINV-3310', supplier: { en: 'Almarai', ar: 'المراعي' }, material: { en: 'Milk powder · 3 ton', ar: 'حليب مجفف · ٣ طن' }, date: { en: '03 Jul', ar: '٠٣ يوليو' }, totalMinor: 6831000, match: 'pending' },
  { id: 'PINV-3307', supplier: { en: 'Jizan Press', ar: 'مطابع جيزان' }, material: { en: 'Gold foil · 4,000 rolls', ar: 'ورق ذهبي · ٤٬٠٠٠ لفة' }, date: { en: '01 Jul', ar: '٠١ يوليو' }, totalMinor: 1288000, match: 'flagged' },
  { id: 'PINV-3301', supplier: { en: 'Nut Traders', ar: 'تجار المكسّرات' }, material: { en: 'Raw sugar · 8 ton', ar: 'سكر خام · ٨ طن' }, date: { en: '28 Jun', ar: '٢٨ يونيو' }, totalMinor: 1564000, match: 'matched' },
]

export interface Supplier { id: string; name: Bilingual; material: Bilingual; score: number; leadDays: number; onTimePct: number }
export const suppliers: Supplier[] = [
  { id: 'S-01', name: { en: 'Barry Callebaut', ar: 'باري كاليبو' }, material: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, score: 94, leadDays: 21, onTimePct: 97 },
  { id: 'S-02', name: { en: 'Almarai', ar: 'المراعي' }, material: { en: 'Milk powder', ar: 'حليب مجفف' }, score: 88, leadDays: 7, onTimePct: 92 },
  { id: 'S-03', name: { en: 'Jizan Press', ar: 'مطابع جيزان' }, material: { en: 'Gold foil', ar: 'ورق تغليف ذهبي' }, score: 72, leadDays: 14, onTimePct: 78 },
  { id: 'S-04', name: { en: 'Nut Traders', ar: 'تجار المكسّرات' }, material: { en: 'Sugar & nuts', ar: 'سكر ومكسّرات' }, score: 81, leadDays: 10, onTimePct: 85 },
]
