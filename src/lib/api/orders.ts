// Orders, customers and the loyalty ledger.
//
// The tracking timeline is derived, not stored: account.ts computes the steps from
// the status, and keeping a copy in the database would be a second source of truth
// for the same fact. The console's 0..5 stage is derived too — by SQL
// (order_owner_stage) and here, and a test asserts the two agree.

import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { CustomerRow, OrderRow, OrderItemRow, LoyaltyLedgerRow, OrderStatusRow } from '@/lib/database.types'
import type { CustomerOrder, OrderStatus, TrackStep } from '@/data/account'
import type { OwnerOrder, OwnerOrderStage, OwnerChannel } from '@/data/ownerOrders'
import type { OwnerCustomer, OwnerTier, LoyaltyLedgerEntry } from '@/data/ownerCustomers'

export interface WriteResult { ok: boolean; error: string | null }
const OK: WriteResult = { ok: true, error: null }
const bad = (error: string): WriteResult => ({ ok: false, error })

// ---------------------------------------------------------------- stage
//
// Must match public.order_owner_stage() exactly. out_for_delivery reads as shipped
// from the console's side; cancelled has no stage of its own and is shown by status.

const OWNER_STAGE: Record<OrderStatusRow, OwnerOrderStage> = {
  new: 0,
  confirmed: 1,
  processing: 2,
  ready: 3,
  shipped: 4,
  out_for_delivery: 4,
  delivered: 5,
  cancelled: 5,
}

export const ownerStageOf = (s: OrderStatusRow): OwnerOrderStage => OWNER_STAGE[s]

/**
 * The customer-facing status. `new` and `ready` exist only in the console's
 * vocabulary, so they are shown as the nearest thing a shopper understands rather
 * than leaking an internal state onto a tracking page.
 */
const CUSTOMER_STATUS: Record<OrderStatusRow, OrderStatus> = {
  new: 'confirmed',
  confirmed: 'confirmed',
  processing: 'processing',
  ready: 'processing',
  shipped: 'shipped',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

export const customerStatusOf = (s: OrderStatusRow): OrderStatus => CUSTOMER_STATUS[s]

/**
 * The timeline, from the status and the date the order was placed. Same shape
 * account.ts builds, but dated off the real order rather than fixed demo dates.
 */
export function stepsOf(status: OrderStatusRow, placedAt: string): TrackStep[] {
  const order: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
  const shown = customerStatusOf(status)
  // A cancelled order has no timeline to walk — nothing after it is true.
  if (shown === 'cancelled') return []
  const idx = order.indexOf(shown)
  const placed = new Date(placedAt + 'T00:00:00')
  const dayAfter = (n: number) => {
    const d = new Date(placed)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  return order.map((key, i) => ({
    key,
    at: i <= idx ? dayAfter(i) : undefined,
    done: i < idx,
    current: i === idx,
  }))
}

// ---------------------------------------------------------------- row -> UI

export function rowToCustomerOrder(r: OrderRow, items: OrderItemRow[]): CustomerOrder {
  return {
    orderNo: r.order_no,
    placedAt: r.placed_at,
    status: customerStatusOf(r.status),
    totalMinor: Number(r.total_minor),
    items: items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ variantId: i.variant_id, qty: i.qty })),
    isGift: r.is_gift,
    carrier: { en: r.carrier_en ?? '', ar: r.carrier_ar ?? '' },
    trackingNo: r.tracking_no ?? '',
    coldChain: r.cold_chain,
    steps: stepsOf(r.status, r.placed_at),
  }
}

export function rowToOwnerOrder(
  r: OrderRow,
  items: OrderItemRow[],
  customerName?: { name_en: string; name_ar: string } | null,
  /** Resolves a variant id to its bilingual title, for building the items summary. */
  titleOf?: (variantId: string) => { en: string; ar: string } | undefined,
): OwnerOrder {
  // Position, not arrival order: the rows come back from one query covering every
  // order, so their order within an order is not guaranteed.
  const ordered = items.slice().sort((a, b) => a.position - b.position)

  // Prefer real line items; fall back to the stored summary for an order that never
  // had any (the console's seeded rows).
  const summary = ordered.length > 0 && titleOf
    ? {
        en: ordered.map((i) => `${i.qty} × ${titleOf(i.variant_id)?.en ?? i.variant_id}`).join(', '),
        ar: ordered.map((i) => `${i.qty} × ${titleOf(i.variant_id)?.ar ?? i.variant_id}`).join('، '),
      }
    : { en: r.items_summary_en ?? '', ar: r.items_summary_ar ?? '' }

  return {
    id: r.order_no,
    customer: customerName
      ? { en: customerName.name_en, ar: customerName.name_ar }
      : { en: '—', ar: '—' },
    chan: r.channel as OwnerChannel,
    items: summary,
    qty: ordered.length > 0 ? ordered.reduce((n, i) => n + i.qty, 0) : r.qty,
    amountMinor: Number(r.total_minor),
    // The console shows a short date; the locale formats it at render time.
    date: { en: r.placed_at, ar: r.placed_at },
    stage: ownerStageOf(r.status),
    sla: r.sla_met,
    ...(r.status === 'cancelled' ? { cancelled: true } : {}),
    ...(r.department_en === null && r.department_ar === null
      ? {}
      : { department: { en: r.department_en ?? '', ar: r.department_ar ?? '' } }),
  }
}

export function rowToOwnerCustomer(r: CustomerRow, orderCount: number): OwnerCustomer {
  return {
    id: r.id,
    name: { en: r.name_en, ar: r.name_ar },
    type: r.kind === 'MEGA' ? 'B2B' : (r.kind as 'B2C' | 'B2B'),
    orders: orderCount,
    spendMinor: Number(r.spend_minor),
    tier: r.tier as OwnerTier,
  }
}

export function rowToLoyaltyEntry(r: LoyaltyLedgerRow): LoyaltyLedgerEntry {
  return {
    id: r.id,
    kind: r.kind,
    source: { en: r.source_en, ar: r.source_ar },
    points: r.points,
    at: { en: r.at_date, ar: r.at_date },
  }
}

// ---------------------------------------------------------------- reads

export interface OrdersSnapshot {
  /** Every order the caller may see — their own, or all of them for staff. */
  orders: OrderRow[]
  itemsByOrder: Map<string, OrderItemRow[]>
  customers: CustomerRow[]
  ledger: LoyaltyLedgerRow[]
}

export const EMPTY_SNAPSHOT: OrdersSnapshot = {
  orders: [], itemsByOrder: new Map(), customers: [], ledger: [],
}

/**
 * One read for both views. RLS decides the scope: a customer gets their own rows, a
 * staff member gets everything, and neither query says which — the same call serves
 * both, so the client cannot widen it.
 */
export async function fetchOrders(): Promise<OrdersSnapshot> {
  if (!isSupabaseConfigured) return EMPTY_SNAPSHOT
  const db = requireSupabase()

  const [orders, items, customers, ledger] = await Promise.all([
    db.from('orders').select('*').order('placed_at', { ascending: false }),
    db.from('order_items').select('*').order('position'),
    db.from('customers').select('*').order('spend_minor', { ascending: false }),
    db.from('loyalty_ledger').select('*').order('at_date', { ascending: false }),
  ])

  if (orders.error) {
    console.error('[orders]', orders.error.message)
    return EMPTY_SNAPSHOT
  }
  if (items.error) console.error('[orders] items:', items.error.message)
  if (customers.error) console.error('[orders] customers:', customers.error.message)
  if (ledger.error) console.error('[orders] ledger:', ledger.error.message)

  const itemsByOrder = new Map<string, OrderItemRow[]>()
  for (const i of items.data ?? []) {
    const list = itemsByOrder.get(i.order_id)
    if (list) list.push(i)
    else itemsByOrder.set(i.order_id, [i])
  }

  return {
    orders: orders.data ?? [],
    itemsByOrder,
    customers: customers.data ?? [],
    ledger: ledger.data ?? [],
  }
}

// ---------------------------------------------------------------- writes
// All staff-only at the database. A customer cannot advance their own order, which
// was tested by trying.

export async function setOrderStatus(orderId: string, status: OrderStatusRow): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('orders.notConfigured')
  const { error } = await requireSupabase().from('orders').update({ status }).eq('id', orderId)
  return error ? bad(error.message) : OK
}

export async function assignDepartment(
  orderId: string,
  department: { en: string; ar: string } | null,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('orders.notConfigured')
  const { error } = await requireSupabase()
    .from('orders')
    .update({ department_en: department?.en ?? null, department_ar: department?.ar ?? null })
    .eq('id', orderId)
  return error ? bad(error.message) : OK
}

export async function recordLoyalty(
  customerId: string,
  kind: LoyaltyLedgerRow['kind'],
  points: number,
  source: { en: string; ar: string },
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('orders.notConfigured')
  const { error } = await requireSupabase().from('loyalty_ledger').insert({
    customer_id: customerId, kind, points, source_en: source.en, source_ar: source.ar,
  })
  return error ? bad(error.message) : OK
}

export async function setCustomerTier(customerId: string, tier: LoyaltyTierRowLike): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('orders.notConfigured')
  const { error } = await requireSupabase().from('customers').update({ tier }).eq('id', customerId)
  return error ? bad(error.message) : OK
}

type LoyaltyTierRowLike = CustomerRow['tier']

/** The one field a customer may correct about themselves. */
export async function updateOwnContact(
  customerId: string,
  patch: { email?: string; phone?: string },
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('orders.notConfigured')
  const { error } = await requireSupabase().from('customers').update(patch).eq('id', customerId)
  return error ? bad(error.message) : OK
}
