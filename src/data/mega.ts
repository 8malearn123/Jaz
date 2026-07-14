import type { Bilingual } from './types'
import type { CountryCode } from './countries'

// ── Mega Business · Export account (isolated). This is the account-side portal
// for a large wholesale/export B2B buyer — pallet catalog, bulk orders,
// cold-chain export shipments, credit and compliance. It reuses NOTHING from the
// standard Business (organization) or Customer data, and mutates nothing shared.

export const megaAccount = {
  legalName: { en: 'Gulf Export Partners', ar: 'شركاء الخليج للتصدير' } as Bilingual,
  contact: { en: 'Sofia Bauer', ar: 'صوفيا باور' } as Bilingual,
  market: { en: 'GCC · EU cold-chain export', ar: 'الخليج · تصدير مبرّد لأوروبا' } as Bilingual,
  crNumber: '1010 554 921',
  vatNumber: '3115 0092 8800 003',
  incoterm: 'CIF',
  country: 'ae' as CountryCode, // where this partner operates — drives which catalog items they see
}

/* ── Pallet catalog ── */
export interface MegaProduct {
  sku: string
  name: Bilingual
  category: Bilingual
  pricePerPalletMinor: number
  cbm: number
  grossKg: number
  unitsPerPallet: number
  moq: number // minimum pallets
  color: string
  country?: CountryCode | 'all' // dedicated market — 'all' (default) shows to every partner
}
export const megaCatalog: MegaProduct[] = [
  { sku: 'PLT-ASSORTED', name: { en: 'Assorted bar pallet', ar: 'طبلية ألواح مشكّلة' }, category: { en: 'Retail pallets', ar: 'طبليات تجزئة' }, pricePerPalletMinor: 1100000, cbm: 1.2, grossKg: 480, unitsPerPallet: 1800, moq: 3, color: '#365766' },
  { sku: 'PLT-SEASON', name: { en: 'Seasonal assortment pallet', ar: 'طبلية تشكيلة موسمية' }, category: { en: 'Retail pallets', ar: 'طبليات تجزئة' }, pricePerPalletMinor: 1400000, cbm: 1.4, grossKg: 520, unitsPerPallet: 1600, moq: 3, color: '#8e2f55', country: 'ae' },
  { sku: 'PLT-GIFTBOX', name: { en: 'Luxury gift-box pallet', ar: 'طبلية بوكسات فاخرة' }, category: { en: 'Retail pallets', ar: 'طبليات تجزئة' }, pricePerPalletMinor: 2050000, cbm: 1.5, grossKg: 440, unitsPerPallet: 720, moq: 2, color: '#b5403b' },
  { sku: 'PLT-DATES', name: { en: 'Chocolate-dates pallet (KSA)', ar: 'طبلية تمور بالشوكولاتة (السعودية)' }, category: { en: 'Retail pallets', ar: 'طبليات تجزئة' }, pricePerPalletMinor: 1750000, cbm: 1.3, grossKg: 500, unitsPerPallet: 1200, moq: 2, color: '#7a5230', country: 'sa' },
  { sku: 'BULK-COUVERTURE', name: { en: 'Bulk couverture (ton)', ar: 'كوفرتور خام (طن)' }, category: { en: 'Raw by ton', ar: 'خام بالطن' }, pricePerPalletMinor: 2160000, cbm: 1.0, grossKg: 1000, unitsPerPallet: 1, moq: 1, color: '#3b241a' },
  { sku: 'BULK-COCOA', name: { en: 'Cocoa mass (ton)', ar: 'كتلة كاكاو (طن)' }, category: { en: 'Raw by ton', ar: 'خام بالطن' }, pricePerPalletMinor: 1840000, cbm: 1.0, grossKg: 1000, unitsPerPallet: 1, moq: 1, color: '#6b4a30' },
]

// Volume breaks apply per line once the pallet count is met.
export const megaVolumeTiers: { range: Bilingual; minPallets: number; discount: number }[] = [
  { range: { en: '1–4 pallets', ar: '١–٤ طبليات' }, minPallets: 1, discount: 0 },
  { range: { en: '5–9 pallets', ar: '٥–٩ طبليات' }, minPallets: 5, discount: 6 },
  { range: { en: '10+ pallets', ar: '١٠+ طبليات' }, minPallets: 10, discount: 12 },
]

export function volumeDiscount(pallets: number): number {
  return [...megaVolumeTiers].reverse().find((t) => pallets >= t.minPallets)?.discount ?? 0
}

const PALLETS_PER_TRUCK_CBM = 76 // usable reefer volume
export function trucksFor(cbm: number): number {
  return Math.max(1, Math.ceil(cbm / PALLETS_PER_TRUCK_CBM))
}

/* ── Pickup-only fulfilment: every MEGA order is received at the site (EXW) — no branch delivery. */
export const megaPickup: Bilingual = { en: 'Pickup — Jaz plant, Jazan', ar: 'استلام من الموقع — مصنع جاز، جيزان' }

/* ── Cold-chain order machine (ends at site pickup) ── */
export type ShipStage = 0 | 1 | 2 | 3 | 4
export const shipFlow: { key: string; label: Bilingual }[] = [
  { key: 'booked', label: { en: 'Booked', ar: 'محجوز' } },
  { key: 'packed', label: { en: 'Packed & flash-chilled', ar: 'التعبئة والتبريد السريع' } },
  { key: 'customs', label: { en: 'Ready for pickup', ar: 'جاهز للاستلام من الموقع' } },
  { key: 'transit', label: { en: 'Loading at site', ar: 'جارٍ التحميل في الموقع' } },
  { key: 'delivered', label: { en: 'Picked up', ar: 'تم الاستلام' } },
]
export const SHIP_LAST = (shipFlow.length - 1) as ShipStage

// Orders may be cancelled within this window of being placed (and before they ship).
export const CANCEL_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

/* ── Orders (own bulk/export orders) ── */
export interface MegaOrder {
  id: string
  items: Bilingual
  pallets: number
  destination: Bilingual
  valueMinor: number
  placedAt: Bilingual
  stage: ShipStage
  incoterm: string
  cancelled?: boolean
  placedTs?: number // epoch ms when placed in-session; seeds are historical (undefined → not cancellable)
}
export const megaOrdersSeed: MegaOrder[] = [
  { id: 'MEX-4021', items: { en: 'Assorted + seasonal pallets', ar: 'طبليات مشكّلة وموسمية' }, pallets: 12, destination: megaPickup, valueMinor: 15840000, placedAt: { en: '05 Jul', ar: '٠٥ يوليو' }, stage: 3, incoterm: 'EXW' },
  { id: 'MEX-4018', items: { en: 'Luxury gift-box pallets', ar: 'طبليات بوكسات فاخرة' }, pallets: 6, destination: megaPickup, valueMinor: 12300000, placedAt: { en: '04 Jul', ar: '٠٤ يوليو' }, stage: 2, incoterm: 'EXW' },
  { id: 'MEX-4014', items: { en: 'Bulk couverture · 8 ton', ar: 'كوفرتور خام · ٨ طن' }, pallets: 8, destination: megaPickup, valueMinor: 17280000, placedAt: { en: '02 Jul', ar: '٠٢ يوليو' }, stage: 4, incoterm: 'EXW' },
  { id: 'MEX-4009', items: { en: 'Seasonal assortment pallets', ar: 'طبليات تشكيلة موسمية' }, pallets: 5, destination: megaPickup, valueMinor: 7000000, placedAt: { en: '30 Jun', ar: '٣٠ يونيو' }, stage: 1, incoterm: 'EXW' },
]

/* ── Credit (large export limits) ── */
export const megaCredit = {
  limitMinor: 500000000, // SAR 5,000,000
  outstandingMinor: 182400000,
  reservedMinor: 44000000,
  terms: { en: 'Net 60', ar: 'صافي ٦٠' } as Bilingual,
  nextReview: '2026-09-01',
}
export function megaAvailableMinor(): number {
  return megaCredit.limitMinor - megaCredit.outstandingMinor - megaCredit.reservedMinor
}

export const megaStatements: { id: string; period: Bilingual; closingMinor: number }[] = [
  { id: 'st-06', period: { en: 'June 2026', ar: 'يونيو ٢٠٢٦' }, closingMinor: 182400000 },
  { id: 'st-05', period: { en: 'May 2026', ar: 'مايو ٢٠٢٦' }, closingMinor: 156200000 },
  { id: 'st-04', period: { en: 'April 2026', ar: 'أبريل ٢٠٢٦' }, closingMinor: 141900000 },
]

export const megaInvoices: { id: string; date: Bilingual; amountMinor: number; paid: boolean }[] = [
  { id: 'EXP-INV-9042', date: { en: '05 Jul', ar: '٠٥ يوليو' }, amountMinor: 15840000, paid: false },
  { id: 'EXP-INV-9038', date: { en: '02 Jul', ar: '٠٢ يوليو' }, amountMinor: 17280000, paid: true },
  { id: 'EXP-INV-9031', date: { en: '26 Jun', ar: '٢٦ يونيو' }, amountMinor: 9800000, paid: true },
]

/* ── Export compliance ── */
export const megaCompliance: { label: Bilingual; value: Bilingual; ok: boolean }[] = [
  { label: { en: 'Incoterms', ar: 'شروط الاستلام' }, value: { en: 'EXW — pickup at Jaz plant, Jazan', ar: 'EXW — استلام من موقع المصنع، جيزان' }, ok: true },
  { label: { en: 'Customs broker', ar: 'المخلّص الجمركي' }, value: { en: 'Bahri Logistics', ar: 'البحري اللوجستية' }, ok: true },
  { label: { en: 'Certificate of origin', ar: 'شهادة المنشأ' }, value: { en: 'Saudi CoO · valid to Dec', ar: 'شهادة سعودية · سارية حتى ديسمبر' }, ok: true },
  { label: { en: 'Health certificate (SFDA)', ar: 'الشهادة الصحية (الغذاء والدواء)' }, value: { en: 'Renews September', ar: 'تجديد في سبتمبر' }, ok: false },
]

/* ── Export markets + trend (overview analytics) ── */
export const megaMarkets: { label: Bilingual; pct: number; color: string; valueMinor: number }[] = [
  { label: { en: 'European Union', ar: 'الاتحاد الأوروبي' }, pct: 44, color: '#365766', valueMinor: 15840000 },
  { label: { en: 'GCC', ar: 'دول الخليج' }, pct: 38, color: '#b08a57', valueMinor: 13680000 },
  { label: { en: 'North Africa', ar: 'شمال أفريقيا' }, pct: 18, color: '#8e2f55', valueMinor: 6480000 },
]
export const megaExportTrend: { month: Bilingual; amountMinor: number }[] = [
  { month: { en: 'Feb', ar: 'فبراير' }, amountMinor: 24100000 },
  { month: { en: 'Mar', ar: 'مارس' }, amountMinor: 26800000 },
  { month: { en: 'Apr', ar: 'أبريل' }, amountMinor: 29400000 },
  { month: { en: 'May', ar: 'مايو' }, amountMinor: 31200000 },
  { month: { en: 'Jun', ar: 'يونيو' }, amountMinor: 36000000 },
]
