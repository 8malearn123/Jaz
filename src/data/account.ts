import type { Bilingual } from './types'

export type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'
// Loyalty tiers mirror the owner-side program (ownerCustomers.ts) so a customer
// sees the same tier name/threshold the platform owner sees for them.
export type LoyaltyTier = 'basic' | 'silver' | 'gold' | 'elite'

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

/** Store-credit wallet — goodwill credits, refunds, and applied balances. */
export interface WalletEntry {
  reason: Bilingual
  /** Always a positive integer minor-unit amount; direction is on `kind`. */
  amountMinor: number
  kind: 'credit' | 'debit'
  at: string
}

export interface Wallet {
  balanceMinor: number
  log: WalletEntry[]
}

/** A saved favourite. Stock/price are derived live from the product variant. */
export interface WishlistItem {
  variantId: string
  /** For sold-out favourites: alert me when it is back in stock. */
  notifyOnRestock: boolean
}

export type OccasionChannel = 'whatsapp' | 'email'

/** A personal reminder in the occasions diary (birthday, anniversary…). */
export interface Occasion {
  id: string
  title: Bilingual
  /** ISO yyyy-mm-dd */
  date: string
  /** Reminder channel, fired 7 days before. */
  channel: OccasionChannel
  /** Optional link to a saved gift recipient. */
  recipientId?: string
}

/** A saved gift recipient — a re-usable "send to" identity for gifting. */
export interface GiftRecipient {
  id: string
  name: Bilingual
  relation: Bilingual
  city: Bilingual
  district: Bilingual
  phone: string
  /** When true, the gift card carries no sender name ("from a well-wisher"). */
  anonymous: boolean
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
  addresses: SavedAddress[]
  wallet: Wallet
  wishlist: WishlistItem[]
  occasions: Occasion[]
  giftRecipients: GiftRecipient[]
  consents: ConsentRecord[]
  notifications: { whatsapp: boolean; email: boolean; sms: boolean; push: boolean }
}

/** Fixed demo "today" so countdowns are stable across renders (matches subscriptions). */
export const DEMO_TODAY = '2026-06-21'

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
    tier: 'silver',
    lifetimeSpendMinor: 482000, // SAR 4,820 → Silver (≥ SAR 2,000); same classification the owner shows for Layla
    nextTier: 'gold',
    nextTierAtMinor: 800000, // SAR 8,000 lifetime for Gold — matches owner tier thresholds
    history: [
      { type: 'earn', points: 320, reason: { en: 'Order JAZ-2026-118540', ar: 'طلب JAZ-2026-118540' }, at: '2026-06-14' },
      { type: 'redeem', points: 500, reason: { en: '﷼ 25 reward redeemed', ar: 'استبدال مكافأة ٢٥ ﷼' }, at: '2026-05-28' },
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
  wallet: {
    balanceMinor: 18500, // SAR 185.00 store credit
    log: [
      { reason: { en: 'Late-delivery goodwill credit', ar: 'رصيد تعويض تأخّر التوصيل' }, amountMinor: 3500, kind: 'credit', at: '2026-06-15' },
      { reason: { en: 'Refund · one melted piece', ar: 'استرداد قطعة ذائبة' }, amountMinor: 5000, kind: 'credit', at: '2026-05-20' },
      { reason: { en: 'Applied to order JAZ-2026-104221', ar: 'استُخدم في الطلب JAZ-2026-104221' }, amountMinor: 10000, kind: 'debit', at: '2026-05-12' },
    ],
  },
  wishlist: [
    { variantId: 'v-lav-90', notifyOnRestock: false },
    { variantId: 'v-dark-90', notifyOnRestock: false },
    { variantId: 'v-rose-180', notifyOnRestock: false },
    { variantId: 'v-man-180', notifyOnRestock: true }, // out of stock — restock alert on
  ],
  occasions: [
    { id: 'occ-1', title: { en: "Sara's birthday", ar: 'عيد ميلاد سارة' }, date: '2026-07-09', channel: 'whatsapp', recipientId: 'gr-1' },
    { id: 'occ-2', title: { en: 'Wedding anniversary', ar: 'ذكرى الزواج' }, date: '2026-08-22', channel: 'email' },
    { id: 'occ-3', title: { en: "Ahmad's graduation", ar: 'تخرّج أحمد' }, date: '2026-09-01', channel: 'whatsapp', recipientId: 'gr-2' },
  ],
  giftRecipients: [
    { id: 'gr-1', name: { en: 'Sara Al-Ahmadi', ar: 'سارة الأحمدي' }, relation: { en: 'Sister', ar: 'أختي' }, city: { en: 'Jeddah', ar: 'جدة' }, district: { en: 'Al Shati', ar: 'الشاطئ' }, phone: '+966 50 338 7712', anonymous: false },
    { id: 'gr-2', name: { en: 'Ahmad Al-Faifi', ar: 'أحمد الفيفي' }, relation: { en: 'Colleague', ar: 'زميل' }, city: { en: 'Sabya', ar: 'صبيا' }, district: { en: 'Al Nahda', ar: 'النهضة' }, phone: '+966 56 990 4421', anonymous: true },
  ],
  consents: [
    { purpose: 'marketing_whatsapp', granted: true },
    { purpose: 'marketing_email', granted: true },
    { purpose: 'profiling', granted: false },
    { purpose: 'cookies', granted: true },
  ],
  notifications: { whatsapp: true, email: true, sms: false, push: true },
}

export const tierOrder: LoyaltyTier[] = ['basic', 'silver', 'gold', 'elite']
