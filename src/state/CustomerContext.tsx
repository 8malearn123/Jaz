import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  customer as seed,
  type ConsentRecord, type SavedAddress, type Subscription, type LoyaltyTier,
  type Wallet, type WishlistItem, type Occasion, type OccasionChannel, type GiftRecipient,
} from '@/data/account'
import type { Bilingual } from '@/data/types'

export interface RedeemOption {
  id: string
  label: { en: string; ar: string }
  cost: number
  kind: 'voucher' | 'shipping' | 'artcard'
}

interface CustomerContextValue {
  name: Bilingual
  email: string
  phone: string
  points: number
  tier: LoyaltyTier
  lifetimeSpendMinor: number
  pointsHistory: typeof seed.loyalty.history
  subscriptions: Subscription[]
  addresses: SavedAddress[]
  wallet: Wallet
  wishlist: WishlistItem[]
  occasions: Occasion[]
  giftRecipients: GiftRecipient[]
  generatedCode: string | null
  consents: ConsentRecord[]
  notifications: typeof seed.notifications
  redeem: (opt: RedeemOption) => boolean
  redeemPointsForCode: (cost?: number) => string | null
  toggleSubscription: (id: string) => void
  cancelSubscription: (id: string) => void
  addAddress: (a: Omit<SavedAddress, 'id'>) => void
  updateAddress: (id: string, patch: Partial<SavedAddress>) => void
  makeDefaultAddress: (id: string) => void
  updateProfile: (patch: { name?: string; email?: string; phone?: string }) => void
  toggleRestockNotify: (variantId: string) => void
  removeFromWishlist: (variantId: string) => void
  addOccasion: (input: { title: string; date: string; channel: OccasionChannel; recipientId?: string }) => void
  removeOccasion: (id: string) => void
  toggleGiftAnonymous: (id: string) => void
  addGiftRecipient: (input: { name: string; relation: string; city: string; district: string; phone: string; anonymous: boolean }) => void
  removeGiftRecipient: (id: string) => void
  setConsent: (purpose: ConsentRecord['purpose'], granted: boolean) => void
  setNotif: (channel: keyof typeof seed.notifications, val: boolean) => void
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const genDiscountCode = () => 'JAZ-GOLD-' + Math.floor(100 + Math.random() * 899)

const DISCOUNT_CODE_COST = 500

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(seed.loyalty.points)
  const [pointsHistory, setPointsHistory] = useState(() => clone(seed.loyalty.history))
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => clone(seed.subscriptions))
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => clone(seed.addresses))
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => clone(seed.wishlist))
  const [occasions, setOccasions] = useState<Occasion[]>(() => clone(seed.occasions))
  const [giftRecipients, setGiftRecipients] = useState<GiftRecipient[]>(() => clone(seed.giftRecipients))
  const [profile, setProfile] = useState(() => ({ name: clone(seed.name), email: seed.email, phone: seed.phone }))
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [consents, setConsents] = useState<ConsentRecord[]>(() => clone(seed.consents))
  const [notifications, setNotifications] = useState(() => clone(seed.notifications))

  const redeem = useCallback((opt: RedeemOption) => {
    let ok = false
    setPoints((p) => {
      if (p < opt.cost) return p
      ok = true
      return p - opt.cost
    })
    if (ok) {
      setPointsHistory((h) => [{ type: 'redeem', points: opt.cost, reason: opt.label, at: '2026-06-21' }, ...h])
    }
    return ok
  }, [])

  const toggleSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s)))
  }, [])

  const cancelSubscription = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const addAddress = useCallback((a: Omit<SavedAddress, 'id'>) => {
    setAddresses((prev) => {
      const id = `addr-${Date.now()}`
      const next = [...prev, { ...a, id }]
      return a.isDefault ? next.map((x) => ({ ...x, isDefault: x.id === id })) : next
    })
  }, [])

  const updateAddress = useCallback((id: string, patch: Partial<SavedAddress>) => {
    setAddresses((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])

  const makeDefaultAddress = useCallback((id: string) => {
    setAddresses((prev) => prev.map((x) => ({ ...x, isDefault: x.id === id })))
  }, [])

  const setConsent = useCallback((purpose: ConsentRecord['purpose'], granted: boolean) => {
    setConsents((prev) => prev.map((c) => (c.purpose === purpose ? { ...c, granted } : c)))
  }, [])

  const setNotif = useCallback((channel: keyof typeof seed.notifications, val: boolean) => {
    setNotifications((prev) => ({ ...prev, [channel]: val }))
  }, [])

  const redeemPointsForCode = useCallback((cost: number = DISCOUNT_CODE_COST) => {
    let code: string | null = null
    setPoints((p) => {
      if (p < cost) return p
      code = genDiscountCode()
      return p - cost
    })
    if (code) {
      setGeneratedCode(code)
      setPointsHistory((h) => [{ type: 'redeem', points: cost, reason: { en: 'Points → discount code', ar: 'استبدال النقاط بكود خصم' }, at: '2026-06-21' }, ...h])
    }
    return code
  }, [])

  const updateProfile = useCallback((patch: { name?: string; email?: string; phone?: string }) => {
    setProfile((p) => ({
      name: patch.name !== undefined ? { en: patch.name, ar: patch.name } : p.name,
      email: patch.email ?? p.email,
      phone: patch.phone ?? p.phone,
    }))
  }, [])

  const toggleRestockNotify = useCallback((variantId: string) => {
    setWishlist((prev) => prev.map((w) => (w.variantId === variantId ? { ...w, notifyOnRestock: !w.notifyOnRestock } : w)))
  }, [])

  const removeFromWishlist = useCallback((variantId: string) => {
    setWishlist((prev) => prev.filter((w) => w.variantId !== variantId))
  }, [])

  const addOccasion = useCallback((input: { title: string; date: string; channel: OccasionChannel; recipientId?: string }) => {
    setOccasions((prev) => [
      ...prev,
      { id: `occ-${Date.now()}`, title: { en: input.title, ar: input.title }, date: input.date, channel: input.channel, recipientId: input.recipientId },
    ])
  }, [])

  const removeOccasion = useCallback((id: string) => {
    setOccasions((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const toggleGiftAnonymous = useCallback((id: string) => {
    setGiftRecipients((prev) => prev.map((g) => (g.id === id ? { ...g, anonymous: !g.anonymous } : g)))
  }, [])

  const addGiftRecipient = useCallback((input: { name: string; relation: string; city: string; district: string; phone: string; anonymous: boolean }) => {
    setGiftRecipients((prev) => [
      ...prev,
      {
        id: `gr-${Date.now()}`,
        name: { en: input.name, ar: input.name },
        relation: { en: input.relation, ar: input.relation },
        city: { en: input.city, ar: input.city },
        district: { en: input.district, ar: input.district },
        phone: input.phone,
        anonymous: input.anonymous,
      },
    ])
  }, [])

  const removeGiftRecipient = useCallback((id: string) => {
    setGiftRecipients((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const value = useMemo<CustomerContextValue>(
    () => ({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      points,
      tier: seed.loyalty.tier,
      lifetimeSpendMinor: seed.loyalty.lifetimeSpendMinor,
      pointsHistory,
      subscriptions,
      addresses,
      wallet: seed.wallet,
      wishlist,
      occasions,
      giftRecipients,
      generatedCode,
      consents,
      notifications,
      redeem,
      redeemPointsForCode,
      toggleSubscription,
      cancelSubscription,
      addAddress,
      updateAddress,
      makeDefaultAddress,
      updateProfile,
      toggleRestockNotify,
      removeFromWishlist,
      addOccasion,
      removeOccasion,
      toggleGiftAnonymous,
      addGiftRecipient,
      removeGiftRecipient,
      setConsent,
      setNotif,
    }),
    [profile, points, pointsHistory, subscriptions, addresses, wishlist, occasions, giftRecipients, generatedCode, consents, notifications, redeem, redeemPointsForCode, toggleSubscription, cancelSubscription, addAddress, updateAddress, makeDefaultAddress, updateProfile, toggleRestockNotify, removeFromWishlist, addOccasion, removeOccasion, toggleGiftAnonymous, addGiftRecipient, removeGiftRecipient, setConsent, setNotif],
  )

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
