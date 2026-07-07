import type { Bilingual } from './types'
import type { ProdChannel } from './ownerProducts'

// ── Owner catalog & pricing config per channel (isolated). Category tree,
// channel catalog items, volume pricing, contracts. All edits are local overlay.

export interface CatNode { id: string; label: Bilingual; count: number; depth: 0 | 1 }
export const catTree: Record<ProdChannel, CatNode[]> = {
  b2c: [
    { id: 'b2c-bars', label: { en: 'Single bars', ar: 'ألواح فردية' }, count: 9, depth: 0 },
    { id: 'b2c-dark', label: { en: 'Dark', ar: 'داكن' }, count: 4, depth: 1 },
    { id: 'b2c-milk', label: { en: 'Milk', ar: 'حليب' }, count: 5, depth: 1 },
    { id: 'b2c-boxes', label: { en: 'Gift boxes', ar: 'بوكسات هدايا' }, count: 8, depth: 0 },
    { id: 'b2c-season', label: { en: 'Seasonal', ar: 'موسمي' }, count: 7, depth: 0 },
  ],
  b2b: [
    { id: 'b2b-hotel', label: { en: 'Hospitality', ar: 'ضيافة الفنادق' }, count: 11, depth: 0 },
    { id: 'b2b-corp', label: { en: 'Corporate gifting', ar: 'هدايا مؤسسية' }, count: 9, depth: 0 },
  ],
  mega: [
    { id: 'mega-pallet', label: { en: 'Pallets', ar: 'طبليات' }, count: 5, depth: 0 },
    { id: 'mega-raw', label: { en: 'Raw by ton', ar: 'خام بالطن' }, count: 2, depth: 0 },
  ],
}

export const catCounts: Record<ProdChannel, number> = { b2c: 24, b2b: 20, mega: 7 }

export interface B2cCatalogItem { id: string; name: Bilingual; priceMinor: number; lowStock: boolean; visible: boolean }
export const b2cCatalog: B2cCatalogItem[] = [
  { id: 'ci-1', name: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, priceMinor: 4400, lowStock: false, visible: true },
  { id: 'ci-2', name: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, priceMinor: 3800, lowStock: true, visible: true },
  { id: 'ci-3', name: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, priceMinor: 16800, lowStock: false, visible: true },
  { id: 'ci-4', name: { en: 'Rose gift box', ar: 'بوكس الورد' }, priceMinor: 31000, lowStock: true, visible: false },
]

export interface StdCatalogItem { id: string; name: Bilingual; basePriceMinor: number; moq: number }
export const stdCatalog: StdCatalogItem[] = [
  { id: 'si-1', name: { en: 'Hotel amenity bar', ar: 'لوح ضيافة الفندق' }, basePriceMinor: 3800, moq: 20 },
  { id: 'si-2', name: { en: 'Corporate crescent', ar: 'هلال الشركات' }, basePriceMinor: 30300, moq: 12 },
  { id: 'si-3', name: { en: 'Founding Day hamper', ar: 'سلة يوم التأسيس' }, basePriceMinor: 26700, moq: 10 },
]
// Volume tiers: qty range → discount %. Discounts apply to the base price.
export const stdVolumeTiers: { range: Bilingual; discount: number }[] = [
  { range: { en: '1–5', ar: '١–٥' }, discount: 0 },
  { range: { en: '6–20', ar: '٦–٢٠' }, discount: 8 },
  { range: { en: '21+', ar: '٢١+' }, discount: 15 },
]

export interface MegaCatalogItem { id: string; name: Bilingual; priceMinor: number; cbm: number; grossKg: number; unitsPerPallet: number }
export const megaCatalog: MegaCatalogItem[] = [
  { id: 'mi-1', name: { en: 'Assorted bar pallet', ar: 'طبلية ألواح مشكّلة' }, priceMinor: 1100000, cbm: 1.2, grossKg: 480, unitsPerPallet: 1800 },
  { id: 'mi-2', name: { en: 'Seasonal pallet', ar: 'طبلية موسمية' }, priceMinor: 1400000, cbm: 1.4, grossKg: 520, unitsPerPallet: 1600 },
  { id: 'mi-3', name: { en: 'Bulk couverture (ton)', ar: 'كوفرتور خام بالطن' }, priceMinor: 21600000, cbm: 1.0, grossKg: 1000, unitsPerPallet: 1 },
]

export type ContractStatus = 'active' | 'renew'
export interface Contract { id: string; account: Bilingual; discount: number; terms: Bilingual; status: ContractStatus }
export const contracts: Contract[] = [
  { id: 'ct-1', account: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, discount: 18, terms: { en: 'Net 30', ar: 'صافي ٣٠' }, status: 'active' },
  { id: 'ct-2', account: { en: 'Ramz Café', ar: 'مقهى رمز' }, discount: 12, terms: { en: 'Net 15', ar: 'صافي ١٥' }, status: 'active' },
  { id: 'ct-3', account: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, discount: 22, terms: { en: 'Net 60', ar: 'صافي ٦٠' }, status: 'renew' },
  { id: 'ct-4', account: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, discount: 15, terms: { en: 'Net 30', ar: 'صافي ٣٠' }, status: 'active' },
]
