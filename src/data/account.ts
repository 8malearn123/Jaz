import type { Bilingual } from './types'

export type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type LoyaltyTier = 'taster' | 'connoisseur' | 'maison'

export interface TrackStep {
  key: OrderStatus
  at?: string
  done: boolean
  current?: boolean
}

export interface CustomerOrder {
  orderNo: string
  placedAt: string
  status: OrderStatus
  totalMinor: number
  items: { variantId: string; qty: number }[]
  isGift: boolean
  carrier: Bilingual
  trackingNo: string
  coldChain: boolean
  steps: TrackStep[]
}

export interface Subscription {
  id: string
  title: Bilingual
  variantId: string
  cadence: 'monthly' | 'quarterly'
  nextRenewal: string
  status: 'active' | 'paused'
  priceMinor: number
}

export interface GiftCard {
  code: string
  initialMinor: number
  balanceMinor: number
  status: 'active' | 'redeemed'
}

export interface SavedAddress {
  id: string
  label: Bilingual
  city: Bilingual
  district: Bilingual
  shortAddress: string
  isDefault: boolean
}

export interface ConsentRecord {
  purpose: 'marketing_whatsapp' | 'marketing_email' | 'profiling' | 'cookies'
  granted: boolean
}

export interface Customer {
  name: Bilingual
  email: string
  phone: string
  memberSince: string
  loyalty: {
    points: number
    tier: LoyaltyTier
    lifetimeSpendMinor: number
    nextTier?: LoyaltyTier
    nextTierAtMinor?: number
    history: { type: 'earn' | 'redeem'; points: number; reason: Bilingual; at: string }[]
  }
  orders: CustomerOrder[]
  subscriptions: Subscription[]
  giftCards: GiftCard[]
  addresses: SavedAddress[]
  consents: ConsentRecord[]
  notifications: { whatsapp: boolean; email: boolean; sms: boolean; push: boolean }
}

const steps = (status: OrderStatus): TrackStep[] => {
  const order: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
  const idx = order.indexOf(status)
  const dates = ['2026-06-14', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-17']
  return order.map((key, i) => ({
    key,
    at: i <= idx ? dates[i] : undefined,
    done: i < idx,
    current: i === idx,
  }))
}

export const customer: Customer = {
  name: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' },
  email: 'layla@example.com',
  phone: '+966 55 091 2837',
  memberSince: '2024-11-02',
  loyalty: {
    points: 1840,
    tier: 'connoisseur',
    lifetimeSpendMinor: 482000, // SAR 4,820
    nextTier: 'maison',
    nextTierAtMinor: 750000, // SAR 7,500 lifetime for Maison
    history: [
      { type: 'earn', points: 320, reason: { en: 'Order JAZ-2026-118540', ar: 'طلب JAZ-2026-118540' }, at: '2026-06-14' },
      { type: 'redeem', points: 500, reason: { en: 'SAR 25 reward redeemed', ar: 'استبدال مكافأة ٢٥ ر.س' }, at: '2026-05-28' },
      { type: 'earn', points: 210, reason: { en: 'Order JAZ-2026-104221', ar: 'طلب JAZ-2026-104221' }, at: '2026-05-12' },
      { type: 'earn', points: 140, reason: { en: 'Review bonus · Damascena Rose', ar: 'مكافأة تقييم · الورد الدمشقي' }, at: '2026-05-02' },
    ],
  },
  orders: [
    {
      orderNo: 'JAZ-2026-118540',
      placedAt: '2026-06-14',
      status: 'out_for_delivery',
      totalMinor: 18860,
      items: [
        { variantId: 'v-rose-90', qty: 1 },
        { variantId: 'v-milk-90', qty: 2 },
      ],
      isGift: true,
      carrier: { en: 'SMSA Express', ar: 'سمسا إكسبريس' },
      trackingNo: 'SMSA994201773',
      coldChain: true,
      steps: steps('out_for_delivery'),
    },
    {
      orderNo: 'JAZ-2026-104221',
      placedAt: '2026-05-12',
      status: 'delivered',
      totalMinor: 12190,
      items: [{ variantId: 'v-coffee-90', qty: 2 }],
      isGift: false,
      carrier: { en: 'Aramex', ar: 'أرامكس' },
      trackingNo: 'ARX55120934',
      coldChain: false,
      steps: steps('delivered'),
    },
    {
      orderNo: 'JAZ-2026-098114',
      placedAt: '2026-04-20',
      status: 'delivered',
      totalMinor: 24500,
      items: [{ variantId: 'v-jas-90', qty: 1 }, { variantId: 'v-lav-90', qty: 1 }, { variantId: 'v-pap-90', qty: 1 }],
      isGift: true,
      carrier: { en: 'Naqel', ar: 'ناقل' },
      trackingNo: 'NQL71338820',
      coldChain: true,
      steps: steps('delivered'),
    },
  ],
  subscriptions: [
    {
      id: 'sub-1',
      title: { en: 'The Maison Monthly', ar: 'علبة المنزل الشهرية' },
      variantId: 'v-milk-180',
      cadence: 'monthly',
      nextRenewal: '2026-07-05',
      status: 'active',
      priceMinor: 16000,
    },
    {
      id: 'sub-2',
      title: { en: 'Seasonal Harvest Quarterly', ar: 'حصاد الموسم الفصلي' },
      variantId: 'v-man-90',
      cadence: 'quarterly',
      nextRenewal: '2026-08-15',
      status: 'paused',
      priceMinor: 21000,
    },
  ],
  giftCards: [
    { code: 'JAZ-GIFT-7741', initialMinor: 30000, balanceMinor: 12500, status: 'active' },
    { code: 'JAZ-GIFT-2093', initialMinor: 20000, balanceMinor: 0, status: 'redeemed' },
  ],
  addresses: [
    {
      id: 'addr-1',
      label: { en: 'Home', ar: 'المنزل' },
      city: { en: 'Jeddah', ar: 'جدة' },
      district: { en: 'Al Rawdah', ar: 'الروضة' },
      shortAddress: 'RWAB4521',
      isDefault: true,
    },
    {
      id: 'addr-2',
      label: { en: 'Office', ar: 'المكتب' },
      city: { en: 'Riyadh', ar: 'الرياض' },
      district: { en: 'Al Olaya', ar: 'العليا' },
      shortAddress: 'OLYA8830',
      isDefault: false,
    },
  ],
  consents: [
    { purpose: 'marketing_whatsapp', granted: true },
    { purpose: 'marketing_email', granted: true },
    { purpose: 'profiling', granted: false },
    { purpose: 'cookies', granted: true },
  ],
  notifications: { whatsapp: true, email: true, sms: false, push: true },
}

export const tierOrder: LoyaltyTier[] = ['taster', 'connoisseur', 'maison']
