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
