import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  customer as seed,
  type ConsentRecord, type GiftCard, type SavedAddress, type Subscription, type LoyaltyTier,
} from '@/data/account'

export interface RedeemOption {
  id: string
  label: { en: string; ar: string }
  cost: number
  kind: 'voucher' | 'shipping' | 'artcard'
}

interface CustomerContextValue {
  name: { en: string; ar: string }
  points: number
  tier: LoyaltyTier
  lifetimeSpendMinor: number
  pointsHistory: typeof seed.loyalty.history
  subscriptions: Subscription[]
  giftCards: GiftCard[]
  addresses: SavedAddress[]
  consents: ConsentRecord[]
  notifications: typeof seed.notifications
  redeem: (opt: RedeemOption) => boolean
  toggleSubscription: (id: string) => void
  cancelSubscription: (id: string) => void
  addAddress: (a: Omit<SavedAddress, 'id'>) => void
  updateAddress: (id: string, patch: Partial<SavedAddress>) => void
  makeDefaultAddress: (id: string) => void
  buyGiftCard: (amountMinor: number, recipient?: string) => GiftCard
  redeemGiftCard: (code: string) => { ok: boolean; minor: number }
  setConsent: (purpose: ConsentRecord['purpose'], granted: boolean) => void
  setNotif: (channel: keyof typeof seed.notifications, val: boolean) => void
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const genCode = () => 'JAZ-GIFT-' + Math.floor(1000 + Math.random() * 8999)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(seed.loyalty.points)
  const [pointsHistory, setPointsHistory] = useState(() => clone(seed.loyalty.history))
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => clone(seed.subscriptions))
  const [giftCards, setGiftCards] = useState<GiftCard[]>(() => clone(seed.giftCards))
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => clone(seed.addresses))
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

  const buyGiftCard = useCallback((amountMinor: number) => {
    const card: GiftCard = { code: genCode(), initialMinor: amountMinor, balanceMinor: amountMinor, status: 'active' }
    setGiftCards((prev) => [card, ...prev])
    return card
  }, [])

  const redeemGiftCard = useCallback((code: string) => {
    // demo: any well-formed code adds a SAR 50 credit card
    const minor = 5000
    if (code.trim().length < 4) return { ok: false, minor: 0 }
    setGiftCards((prev) => [{ code: code.toUpperCase(), initialMinor: minor, balanceMinor: minor, status: 'active' }, ...prev])
    return { ok: true, minor }
  }, [])

  const setConsent = useCallback((purpose: ConsentRecord['purpose'], granted: boolean) => {
    setConsents((prev) => prev.map((c) => (c.purpose === purpose ? { ...c, granted } : c)))
  }, [])

  const setNotif = useCallback((channel: keyof typeof seed.notifications, val: boolean) => {
    setNotifications((prev) => ({ ...prev, [channel]: val }))
  }, [])

  const value = useMemo<CustomerContextValue>(
    () => ({
      name: seed.name,
      points,
      tier: seed.loyalty.tier,
      lifetimeSpendMinor: seed.loyalty.lifetimeSpendMinor,
      pointsHistory,
      subscriptions,
      giftCards,
      addresses,
      consents,
      notifications,
      redeem,
      toggleSubscription,
      cancelSubscription,
      addAddress,
      updateAddress,
      makeDefaultAddress,
      buyGiftCard,
      redeemGiftCard,
      setConsent,
      setNotif,
    }),
    [points, pointsHistory, subscriptions, giftCards, addresses, consents, notifications, redeem, toggleSubscription, cancelSubscription, addAddress, updateAddress, makeDefaultAddress, buyGiftCard, redeemGiftCard, setConsent, setNotif],
  )

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
