import type { Bilingual } from './types'
import { bomBySku, rawAvail, type RawKey } from './ownerSupply'

// ── Owner product management by sales channel (isolated). Buildable qty is
// derived read-only from raw availability + BOMs (never writes shared prices).

export type ProdChannel = 'b2c' | 'b2b' | 'mega'

export const prodChannelMeta: Record<ProdChannel, { label: Bilingual; color: string; unit: Bilingual; needsMoq: boolean; threshold: number }> = {
  b2c: { label: { en: 'B2C · retail', ar: 'B2C · تجزئة' }, color: '#b08a57', unit: { en: 'piece', ar: 'قطعة' }, needsMoq: false, threshold: 200 },
  b2b: { label: { en: 'HoReCa', ar: 'HoReCa' }, color: '#355c4b', unit: { en: 'carton', ar: 'كرتون' }, needsMoq: true, threshold: 20 },
  mega: { label: { en: 'B2B', ar: 'B2B' }, color: '#365766', unit: { en: 'pallet', ar: 'طبلية' }, needsMoq: true, threshold: 3 },
}

export interface OwnerProduct {
  sku: string
  name: Bilingual
  category: Bilingual
  priceMinor: number
  moq: number
  components: number
  color: string
}

export const ownerProductsByChannel: Record<ProdChannel, OwnerProduct[]> = {
  b2c: [
    { sku: 'BAR-DARK-70', name: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, category: { en: 'Single bars', ar: 'ألواح فردية' }, priceMinor: 4400, moq: 0, components: 3, color: '#3b241a' },
    { sku: 'BAR-MILK', name: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, category: { en: 'Single bars', ar: 'ألواح فردية' }, priceMinor: 3800, moq: 0, components: 4, color: '#8a6b3f' },
    { sku: 'BOX-JASMINE', name: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, category: { en: 'Gift boxes', ar: 'بوكسات هدايا' }, priceMinor: 16800, moq: 0, components: 6, color: '#8e2f55' },
    { sku: 'BOX-ROSE', name: { en: 'Rose gift box', ar: 'بوكس الورد' }, category: { en: 'Gift boxes', ar: 'بوكسات هدايا' }, priceMinor: 31000, moq: 0, components: 5, color: '#b5403b' },
    { sku: 'SEASON-EID', name: { en: 'Eid Maison box', ar: 'علبة العيد' }, category: { en: 'Seasonal', ar: 'إصدارات موسمية' }, priceMinor: 22000, moq: 0, components: 7, color: '#cdaa77' },
    { sku: 'SEASON-DATE', name: { en: 'Luxury date selection', ar: 'تشكيلة التمر الفاخرة' }, category: { en: 'Seasonal', ar: 'إصدارات موسمية' }, priceMinor: 21000, moq: 0, components: 4, color: '#6b4a30' },
  ],
  b2b: [
    { sku: 'HOTEL-AMENITY', name: { en: 'Hotel amenity bar', ar: 'لوح ضيافة الفندق' }, category: { en: 'Hospitality', ar: 'ضيافة الفنادق' }, priceMinor: 3800, moq: 20, components: 3, color: '#355c4b' },
    { sku: 'CORP-CRESCENT', name: { en: 'Corporate crescent', ar: 'هلال الشركات' }, category: { en: 'Corporate gifting', ar: 'هدايا مؤسسية' }, priceMinor: 30300, moq: 12, components: 6, color: '#8a6b3f' },
    { sku: 'CORP-HAMPER', name: { en: 'Founding Day hamper', ar: 'سلة يوم التأسيس' }, category: { en: 'Corporate gifting', ar: 'هدايا مؤسسية' }, priceMinor: 26700, moq: 10, components: 8, color: '#365766' },
  ],
  mega: [
    { sku: 'PALLET-ASSORTED', name: { en: 'Assorted bar pallet', ar: 'طبلية ألواح مشكّلة' }, category: { en: 'Pallets', ar: 'طبليات' }, priceMinor: 1100000, moq: 3, components: 5, color: '#365766' },
    { sku: 'PALLET-SEASON', name: { en: 'Seasonal pallet', ar: 'طبلية موسمية' }, category: { en: 'Pallets', ar: 'طبليات' }, priceMinor: 1400000, moq: 3, components: 4, color: '#8e2f55' },
    { sku: 'BULK-COUVERTURE', name: { en: 'Bulk couverture (ton)', ar: 'كوفرتور خام بالطن' }, category: { en: 'Raw by ton', ar: 'خام بالطن' }, priceMinor: 21600000, moq: 1, components: 2, color: '#3b241a' },
  ],
}

/** Buildable units + the bottleneck raw, derived from BOM vs current raw availability. */
export function buildableOf(sku: string): { qty: number; bottleneck: RawKey | null } {
  const bom = bomBySku[sku]
  if (!bom) return { qty: Infinity, bottleneck: null }
  let qty = Infinity
  let bottleneck: RawKey | null = null
  for (const k of Object.keys(bom) as RawKey[]) {
    const per = bom[k]!
    if (per <= 0) continue
    const canMake = Math.floor(rawAvail[k] / per)
    if (canMake < qty) { qty = canMake; bottleneck = k }
  }
  return { qty: qty === Infinity ? 0 : qty, bottleneck }
}
