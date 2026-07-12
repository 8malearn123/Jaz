import type { Bilingual } from './types'

// ── Owner cross-customer loyalty directory (isolated). Its OWN tier vocabulary —
// deliberately separate from Customer LoyaltyTier and OrgSummary.tier.

export type OwnerTier = 'basic' | 'silver' | 'gold' | 'elite'

export interface OwnerTierDef { key: OwnerTier; label: Bilingual; color: string; thresholdMinor: number; members: number; benefit: Bilingual }
export const ownerTiers: OwnerTierDef[] = [
  { key: 'basic', label: { en: 'Basic', ar: 'أساسي' }, color: '#9a8f84', thresholdMinor: 0, members: 1840, benefit: { en: 'Earn 1 point per ﷼', ar: 'نقطة لكل ريال' } },
  { key: 'silver', label: { en: 'Silver', ar: 'فضي' }, color: '#8a8f96', thresholdMinor: 200000, members: 612, benefit: { en: '5% off', ar: 'خصم ٥٪' } },
  { key: 'gold', label: { en: 'Gold', ar: 'ذهبي' }, color: '#b08a57', thresholdMinor: 800000, members: 208, benefit: { en: '10% off + gifts', ar: 'خصم ١٠٪ + هدايا' } },
  { key: 'elite', label: { en: 'Elite', ar: 'النخبة' }, color: '#355c4b', thresholdMinor: 2500000, members: 53, benefit: { en: 'Dedicated account manager', ar: 'مدير حساب مخصّص' } },
]

export interface LoyaltyStat { label: Bilingual; value: string; sub: Bilingual }
export const loyaltyStats: LoyaltyStat[] = [
  { label: { en: 'Loyalty members', ar: 'أعضاء الولاء' }, value: '2,713', sub: { en: 'Active this cycle', ar: 'نشطون هذه الدورة' } },
  { label: { en: 'Points issued', ar: 'نقاط مُصدرة' }, value: '1.9M', sub: { en: '1 point per ﷼', ar: 'نقطة لكل ريال' } },
  { label: { en: 'Points redeemed', ar: 'نقاط مُستبدلة' }, value: '428K', sub: { en: '22% redemption', ar: 'نسبة استبدال ٢٢٪' } },
  { label: { en: 'Avg spend', ar: 'متوسّط الإنفاق' }, value: '312', sub: { en: '﷼ / member', ar: '﷼ لكل عضو' } },
]

export interface OwnerCustomer {
  id: string
  name: Bilingual
  type: 'B2C' | 'B2B'
  orders: number
  spendMinor: number // == loyalty points issued
  tier: OwnerTier
}

export const ownerCustomers: OwnerCustomer[] = [
  { id: 'c-1', name: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, type: 'B2B', orders: 42, spendMinor: 4820000, tier: 'elite' },
  { id: 'c-2', name: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, type: 'B2B', orders: 31, spendMinor: 3180000, tier: 'elite' },
  { id: 'c-3', name: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' }, type: 'B2C', orders: 18, spendMinor: 482000, tier: 'silver' },
  { id: 'c-4', name: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, type: 'B2B', orders: 27, spendMinor: 1240000, tier: 'gold' },
  { id: 'c-5', name: { en: 'Noura Al-Qahtani', ar: 'نورة القحطاني' }, type: 'B2C', orders: 24, spendMinor: 936000, tier: 'gold' },
  { id: 'c-6', name: { en: 'Ramz Café', ar: 'مقهى رمز' }, type: 'B2B', orders: 15, spendMinor: 312000, tier: 'silver' },
  { id: 'c-7', name: { en: 'Omar Binmahfouz', ar: 'عمر بن محفوظ' }, type: 'B2C', orders: 9, spendMinor: 168000, tier: 'basic' },
  { id: 'c-8', name: { en: 'Aseer Events LLC', ar: 'عسير للفعاليات' }, type: 'B2B', orders: 12, spendMinor: 2760000, tier: 'elite' },
  { id: 'c-9', name: { en: 'Salma Al-Otaibi', ar: 'سلمى العتيبي' }, type: 'B2C', orders: 6, spendMinor: 84000, tier: 'basic' },
  { id: 'c-10', name: { en: 'Khalid Al-Mutairi', ar: 'خالد المطيري' }, type: 'B2C', orders: 4, spendMinor: 41000, tier: 'basic' },
]

// ── Per-customer recent orders (loyalty file) ──
export interface CustomerOrder { id: string; date: Bilingual; amountMinor: number; status: 'delivered' | 'shipped' | 'preparing' }
export const customerOrders: Record<string, CustomerOrder[]> = {
  'c-3': [
    { id: 'JZ-2731', date: { en: '08 Jul', ar: '٠٨ يوليو' }, amountMinor: 42000, status: 'preparing' },
    { id: 'JZ-2694', date: { en: '02 Jul', ar: '٠٢ يوليو' }, amountMinor: 61500, status: 'shipped' },
    { id: 'JZ-2618', date: { en: '24 Jun', ar: '٢٤ يونيو' }, amountMinor: 38000, status: 'delivered' },
    { id: 'JZ-2547', date: { en: '12 Jun', ar: '١٢ يونيو' }, amountMinor: 27500, status: 'delivered' },
    { id: 'JZ-2489', date: { en: '30 May', ar: '٣٠ مايو' }, amountMinor: 54000, status: 'delivered' },
  ],
  'c-5': [
    { id: 'JZ-2744', date: { en: '10 Jul', ar: '١٠ يوليو' }, amountMinor: 88000, status: 'preparing' },
    { id: 'JZ-2661', date: { en: '28 Jun', ar: '٢٨ يونيو' }, amountMinor: 46500, status: 'delivered' },
    { id: 'JZ-2590', date: { en: '18 Jun', ar: '١٨ يونيو' }, amountMinor: 72000, status: 'delivered' },
    { id: 'JZ-2502', date: { en: '02 Jun', ar: '٠٢ يونيو' }, amountMinor: 39500, status: 'delivered' },
  ],
  'c-7': [
    { id: 'JZ-2705', date: { en: '04 Jul', ar: '٠٤ يوليو' }, amountMinor: 21500, status: 'shipped' },
    { id: 'JZ-2611', date: { en: '22 Jun', ar: '٢٢ يونيو' }, amountMinor: 18000, status: 'delivered' },
    { id: 'JZ-2533', date: { en: '08 Jun', ar: '٠٨ يونيو' }, amountMinor: 26000, status: 'delivered' },
  ],
  'c-9': [
    { id: 'JZ-2688', date: { en: '01 Jul', ar: '٠١ يوليو' }, amountMinor: 14500, status: 'delivered' },
    { id: 'JZ-2570', date: { en: '15 Jun', ar: '١٥ يونيو' }, amountMinor: 19000, status: 'delivered' },
  ],
  'c-10': [
    { id: 'JZ-2726', date: { en: '07 Jul', ar: '٠٧ يوليو' }, amountMinor: 12500, status: 'shipped' },
    { id: 'JZ-2498', date: { en: '01 Jun', ar: '٠١ يونيو' }, amountMinor: 9800, status: 'delivered' },
  ],
}

// ── Loyalty point sources (the ledger behind each balance): order earns,
// owner grants, campaigns and redemptions. Owner grants append live.
export type LoyaltySourceKind = 'order' | 'grant' | 'campaign' | 'redeem'
export interface LoyaltyLedgerEntry { id: string; kind: LoyaltySourceKind; source: Bilingual; points: number; at: Bilingual }
export const loyaltyLedgerSeed: Record<string, LoyaltyLedgerEntry[]> = {
  'c-3': [
    { id: 'lg-31', kind: 'order', source: { en: 'Order JZ-2731', ar: 'طلب JZ-2731' }, points: 420, at: { en: '08 Jul', ar: '٠٨ يوليو' } },
    { id: 'lg-30', kind: 'order', source: { en: 'Order JZ-2694', ar: 'طلب JZ-2694' }, points: 615, at: { en: '02 Jul', ar: '٠٢ يوليو' } },
    { id: 'lg-29', kind: 'campaign', source: { en: 'Eid campaign — double points', ar: 'حملة العيد — نقاط مضاعفة' }, points: 380, at: { en: '24 Jun', ar: '٢٤ يونيو' } },
    { id: 'lg-28', kind: 'order', source: { en: 'Order JZ-2618', ar: 'طلب JZ-2618' }, points: 380, at: { en: '24 Jun', ar: '٢٤ يونيو' } },
    { id: 'lg-27', kind: 'redeem', source: { en: 'Redeemed at checkout', ar: 'استبدال عند الدفع' }, points: -500, at: { en: '18 Jun', ar: '١٨ يونيو' } },
    { id: 'lg-26', kind: 'order', source: { en: 'Order JZ-2547', ar: 'طلب JZ-2547' }, points: 275, at: { en: '12 Jun', ar: '١٢ يونيو' } },
  ],
  'c-5': [
    { id: 'lg-45', kind: 'order', source: { en: 'Order JZ-2744', ar: 'طلب JZ-2744' }, points: 880, at: { en: '10 Jul', ar: '١٠ يوليو' } },
    { id: 'lg-44', kind: 'grant', source: { en: 'Service recovery', ar: 'تعويض خدمة' }, points: 500, at: { en: '30 Jun', ar: '٣٠ يونيو' } },
    { id: 'lg-43', kind: 'order', source: { en: 'Order JZ-2661', ar: 'طلب JZ-2661' }, points: 465, at: { en: '28 Jun', ar: '٢٨ يونيو' } },
    { id: 'lg-42', kind: 'order', source: { en: 'Order JZ-2590', ar: 'طلب JZ-2590' }, points: 720, at: { en: '18 Jun', ar: '١٨ يونيو' } },
    { id: 'lg-41', kind: 'redeem', source: { en: 'Redeemed at checkout', ar: 'استبدال عند الدفع' }, points: -1000, at: { en: '05 Jun', ar: '٠٥ يونيو' } },
  ],
  'c-7': [
    { id: 'lg-52', kind: 'order', source: { en: 'Order JZ-2705', ar: 'طلب JZ-2705' }, points: 215, at: { en: '04 Jul', ar: '٠٤ يوليو' } },
    { id: 'lg-51', kind: 'order', source: { en: 'Order JZ-2611', ar: 'طلب JZ-2611' }, points: 180, at: { en: '22 Jun', ar: '٢٢ يونيو' } },
    { id: 'lg-50', kind: 'campaign', source: { en: 'Welcome bonus', ar: 'مكافأة الانضمام' }, points: 100, at: { en: '08 Jun', ar: '٠٨ يونيو' } },
  ],
  'c-9': [
    { id: 'lg-61', kind: 'order', source: { en: 'Order JZ-2688', ar: 'طلب JZ-2688' }, points: 145, at: { en: '01 Jul', ar: '٠١ يوليو' } },
    { id: 'lg-60', kind: 'order', source: { en: 'Order JZ-2570', ar: 'طلب JZ-2570' }, points: 190, at: { en: '15 Jun', ar: '١٥ يونيو' } },
  ],
  'c-10': [
    { id: 'lg-71', kind: 'order', source: { en: 'Order JZ-2726', ar: 'طلب JZ-2726' }, points: 125, at: { en: '07 Jul', ar: '٠٧ يوليو' } },
    { id: 'lg-70', kind: 'campaign', source: { en: 'Welcome bonus', ar: 'مكافأة الانضمام' }, points: 100, at: { en: '01 Jun', ar: '٠١ يونيو' } },
  ],
}
