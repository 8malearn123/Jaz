import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { accountOrders } from '@/data/business'

// A file attached to an order's billing trail. Seed files have no URL (name only);
// files attached in-session carry an object URL so the other side can actually open them.
export type BillingFile = { name: string; url?: string; at?: string }

export interface OrderBilling {
  receipts: BillingFile[] // payment receipts attached by the buyer
  taxInvoice?: BillingFile // tax invoice attached by Jaz (absent → awaiting issue)
}

interface BillingCtx {
  billingFor: (orderNo: string) => OrderBilling
  attachReceipt: (orderNo: string, file: BillingFile) => void
  attachTaxInvoice: (orderNo: string, file: BillingFile) => void
}

const Ctx = createContext<BillingCtx | null>(null)

const EMPTY: OrderBilling = { receipts: [] }

// Billing state lives above both portals so the buyer's B2B account and the Jaz
// admin console see the same receipts and tax invoices, live.
export function BillingProvider({ children }: { children: ReactNode }) {
  const [billing, setBilling] = useState<Record<string, OrderBilling>>(() => {
    const seed: Record<string, OrderBilling> = {}
    for (const o of accountOrders) {
      seed[o.orderNo] = {
        receipts: (o.receipts ?? []).map((name) => ({ name })),
        taxInvoice: o.taxInvoiceFile ? { name: o.taxInvoiceFile } : undefined,
      }
    }
    return seed
  })

  const billingFor = useCallback((orderNo: string) => billing[orderNo] ?? EMPTY, [billing])
  const attachReceipt = useCallback((orderNo: string, file: BillingFile) =>
    setBilling((prev) => ({ ...prev, [orderNo]: { ...(prev[orderNo] ?? EMPTY), receipts: [...(prev[orderNo]?.receipts ?? []), file] } })), [])
  const attachTaxInvoice = useCallback((orderNo: string, file: BillingFile) =>
    setBilling((prev) => ({ ...prev, [orderNo]: { ...(prev[orderNo] ?? EMPTY), taxInvoice: file } })), [])

  return <Ctx.Provider value={{ billingFor, attachReceipt, attachTaxInvoice }}>{children}</Ctx.Provider>
}

export function useBilling() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBilling must be used within BillingProvider')
  return ctx
}
