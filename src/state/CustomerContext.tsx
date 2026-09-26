import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  customer as seed,
  type ConsentRecord, type SavedAddress, type Subscription, type LoyaltyTier,
  type Wallet, type WishlistItem, type Occasion, type OccasionChannel, type GiftRecipient,
} from '@/data/account'
import type { Bilingual } from '@/data/types'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchOwnCustomer, fetchOrders, updateOwnContact, rowToLoyaltyEntry } from '@/lib/api/orders'

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

  /*
   * Only the parts with tables come from the server: identity (customers) and the
   * points balance and its history (loyalty_ledger). Subscriptions, addresses, the
   * wallet, the wishlist, occasions, gift recipients, consents and notification
   * preferences have no tables yet and stay on the seed — stated here rather than
   * left to be discovered.
   */
  const backed = isSupabaseConfigured
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [tier, setTier] = useState<LoyaltyTier>(seed.loyalty.tier)
  const [lifetimeSpendMinor, setLifetimeSpend] = useState(seed.loyalty.lifetimeSpendMinor)

  useEffect(() => {
    if (!backed) return
    let cancelled = false
    void (async () => {
      const [row, snap] = await Promise.all([fetchOwnCustomer(), fetchOrders()])
      if (cancelled) return
      if (row) {
        setCustomerId(row.id)
        setProfile({
          name: { en: row.name_en, ar: row.name_ar },
          email: row.email ?? '',
          phone: row.phone ?? '',
        })
        setTier(row.tier)
        setLifetimeSpend(Number(row.spend_minor))
      }
      // The balance is the sum of the ledger, not a stored number — a redemption is a
      // negative row, so summing is the only reading that cannot drift from its
      // sources.
      const mine = snap.ledger.filter((e) => !row || e.customer_id === row.id)
      if (mine.length > 0) {
        setPoints(mine.reduce((n, e) => n + e.points, 0))
        setPointsHistory(mine.map((e) => {
          const entry = rowToLoyaltyEntry(e)
          return {
            type: e.points < 0 ? ('redeem' as const) : ('earn' as const),
            points: Math.abs(e.points),
            reason: entry.source,
            at: e.at_date,
          }
        }))
      }
    })()
    return () => { cancelled = true }
  }, [backed])

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
    // Email and phone are the two fields the database lets a customer change about
    // themselves; the name is not one of them, and the guard refuses tier and spend.
    if (backed && customerId && (patch.email !== undefined || patch.phone !== undefined)) {
      void updateOwnContact(customerId, {
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      })
    }
  }, [backed, customerId])

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
      tier,
      lifetimeSpendMinor,
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
    [profile, tier, lifetimeSpendMinor, points, pointsHistory, subscriptions, addresses, wishlist, occasions, giftRecipients, generatedCode, consents, notifications, redeem, redeemPointsForCode, toggleSubscription, cancelSubscription, addAddress, updateAddress, makeDefaultAddress, updateProfile, toggleRestockNotify, removeFromWishlist, addOccasion, removeOccasion, toggleGiftAnonymous, addGiftRecipient, removeGiftRecipient, setConsent, setNotif],
  )

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
