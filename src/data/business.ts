import type { Bilingual } from './types'

export interface OrgMember {
  id: string
  name: Bilingual
  email: string
  role: 'b2b_admin' | 'buyer' | 'approver' | 'viewer'
  perOrderLimitMinor: number | null
  costCenter: string
  status: 'active' | 'invited'
}

export interface Quote {
  id: string
  ref: string
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'converted'
  validUntil: string
  totalMinor: number
  lineCount: number
  note: Bilingual
}

export type AccountOrderStatus = 'awaiting_approval' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'rejected'

export interface AccountOrder {
  orderNo: string
  placedAt: string
  status: AccountOrderStatus
  totalMinor: number
  buyer: Bilingual
  buyerId: string
  poNumber: string
  requiresApproval: boolean
  summary: Bilingual
}

export interface GiftBatch {
  id: string
  occasion: Bilingual
  recipientCount: number
  status: 'draft' | 'processing' | 'shipped' | 'delivered'
  createdAt: string
}

export const members: OrgMember[] = [
  {
    id: 'm-1',
    name: { en: 'Khalid Al-Otaibi', ar: 'خالد العتيبي' },
    email: 'khalid@najd-hospitality.sa',
    role: 'b2b_admin',
    perOrderLimitMinor: null,
    costCenter: 'HQ',
    status: 'active',
  },
  {
    id: 'm-2',
    name: { en: 'Sara Al-Dosari', ar: 'سارة الدوسري' },
    email: 'sara@najd-hospitality.sa',
    role: 'approver',
    perOrderLimitMinor: 5000000, // SAR 50,000
    costCenter: 'Procurement',
    status: 'active',
  },
  {
    id: 'm-3',
    name: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' },
    email: 'faisal@najd-hospitality.sa',
    role: 'buyer',
    perOrderLimitMinor: 1500000, // SAR 15,000
    costCenter: 'Events',
    status: 'active',
  },
  {
    id: 'm-4',
    name: { en: 'Reem Al-Qahtani', ar: 'ريم القحطاني' },
    email: 'reem@najd-hospitality.sa',
    role: 'viewer',
    perOrderLimitMinor: null,
    costCenter: 'Finance',
    status: 'invited',
  },
]

export const quotes: Quote[] = [
  {
    id: 'q-1',
    ref: 'RFQ-2026-0188',
    status: 'sent',
    validUntil: '2026-07-10',
    totalMinor: 4820000,
    lineCount: 6,
    note: { en: 'Ramadan corporate gifting — 400 boxes', ar: 'إهداء رمضان للشركات — ٤٠٠ علبة' },
  },
  {
    id: 'q-2',
    ref: 'RFQ-2026-0171',
    status: 'accepted',
    validUntil: '2026-06-30',
    totalMinor: 2140000,
    lineCount: 3,
    note: { en: 'Hotel amenity bars — monthly', ar: 'ألواح ضيافة الفندق — شهريًا' },
  },
  {
    id: 'q-3',
    ref: 'RFQ-2026-0150',
    status: 'expired',
    validUntil: '2026-05-20',
    totalMinor: 980000,
    lineCount: 2,
    note: { en: 'Conference welcome gifts', ar: 'هدايا ترحيب المؤتمر' },
  },
]

export const accountOrders: AccountOrder[] = [
  {
    orderNo: 'JAZ-2026-001188',
    placedAt: '2026-06-18',
    status: 'awaiting_approval',
    totalMinor: 2840000,
    buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' },
    buyerId: 'm-3',
    poNumber: 'PO-2026-0442',
    requiresApproval: true,
    summary: { en: '120 × Eid Maison boxes', ar: '١٢٠ × علبة العيد' },
  },
  {
    orderNo: 'JAZ-2026-001190',
    placedAt: '2026-06-19',
    status: 'awaiting_approval',
    totalMinor: 1820000,
    buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' },
    buyerId: 'm-3',
    poNumber: 'PO-2026-0445',
    requiresApproval: true,
    summary: { en: '60 × Corporate Crescent', ar: '٦٠ × هلال الشركات' },
  },
  {
    orderNo: 'JAZ-2026-001140',
    placedAt: '2026-06-09',
    status: 'processing',
    totalMinor: 3180000,
    buyer: { en: 'Sara Al-Dosari', ar: 'سارة الدوسري' },
    buyerId: 'm-2',
    poNumber: 'PO-2026-0431',
    requiresApproval: false,
    summary: { en: '200 × amenity bars', ar: '٢٠٠ × لوح ضيافة' },
  },
  {
    orderNo: 'JAZ-2026-001065',
    placedAt: '2026-06-02',
    status: 'delivered',
    totalMinor: 720000,
    buyer: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' },
    buyerId: 'm-3',
    poNumber: 'PO-2026-0421',
    requiresApproval: false,
    summary: { en: '24 × Jazan Five boxes', ar: '٢٤ × خماسية جازان' },
  },
  {
    orderNo: 'JAZ-2026-000981',
    placedAt: '2026-05-22',
    status: 'delivered',
    totalMinor: 4200000,
    buyer: { en: 'Khalid Al-Otaibi', ar: 'خالد العتيبي' },
    buyerId: 'm-1',
    poNumber: 'PO-2026-0410',
    requiresApproval: false,
    summary: { en: '300 × signature bars', ar: '٣٠٠ × لوح توقيعي' },
  },
]

// Real line items per account order, so "reorder" adds actual variants to the cart.
export const accountOrderItems: Record<string, { variantId: string; qty: number }[]> = {
  'JAZ-2026-001188': [{ variantId: 'v-rose-180', qty: 60 }, { variantId: 'v-jas-90', qty: 60 }],
  'JAZ-2026-001190': [{ variantId: 'v-milk-case', qty: 8 }, { variantId: 'v-cof-case', qty: 6 }],
  'JAZ-2026-001140': [{ variantId: 'v-milk-case', qty: 20 }, { variantId: 'v-dark-90', qty: 100 }],
  'JAZ-2026-001065': [{ variantId: 'v-milk-90', qty: 24 }, { variantId: 'v-lav-90', qty: 24 }],
  'JAZ-2026-000981': [{ variantId: 'v-milk-case', qty: 40 }],
}

// ── Organization addresses & verification (org admin) ──
export interface OrgAddress {
  id: string
  type: 'billing' | 'shipping'
  label: Bilingual
  city: Bilingual
  district: Bilingual
  shortAddress: string
  isDefault: boolean
}

export const orgAddresses: OrgAddress[] = [
  { id: 'oa-1', type: 'billing', label: { en: 'Head office', ar: 'المقر الرئيسي' }, city: { en: 'Riyadh', ar: 'الرياض' }, district: { en: 'Al Olaya', ar: 'العليا' }, shortAddress: 'OLYA2231', isDefault: true },
  { id: 'oa-2', type: 'shipping', label: { en: 'Central warehouse', ar: 'المستودع المركزي' }, city: { en: 'Riyadh', ar: 'الرياض' }, district: { en: 'Al Sulay', ar: 'السلي' }, shortAddress: 'SULY7740', isDefault: true },
  { id: 'oa-3', type: 'shipping', label: { en: 'Jeddah branch', ar: 'فرع جدة' }, city: { en: 'Jeddah', ar: 'جدة' }, district: { en: 'Al Hamra', ar: 'الحمراء' }, shortAddress: 'HMRA1180', isDefault: false },
]

export interface OrgVerificationCase {
  check: 'commercial_registration' | 'vat' | 'authorized_signatory'
  status: 'approved' | 'in_review' | 'expired'
  source: 'wathq' | 'zatca' | 'nafath'
  decidedAt: string
  expiresAt: string
}

export const orgVerification: OrgVerificationCase[] = [
  { check: 'commercial_registration', status: 'approved', source: 'wathq', decidedAt: '2025-09-12', expiresAt: '2027-09-11' },
  { check: 'vat', status: 'approved', source: 'zatca', decidedAt: '2025-09-12', expiresAt: '2026-12-31' },
  { check: 'authorized_signatory', status: 'approved', source: 'nafath', decidedAt: '2025-09-12', expiresAt: '2027-09-11' },
]

export function memberById(id: string): OrgMember | undefined {
  return members.find((m) => m.id === id)
}

export const giftBatches: GiftBatch[] = [
  {
    id: 'gb-1',
    occasion: { en: 'Founding Day', ar: 'يوم التأسيس' },
    recipientCount: 240,
    status: 'delivered',
    createdAt: '2026-02-10',
  },
  {
    id: 'gb-2',
    occasion: { en: 'Eid Al-Fitr', ar: 'عيد الفطر' },
    recipientCount: 412,
    status: 'shipped',
    createdAt: '2026-03-25',
  },
  {
    id: 'gb-3',
    occasion: { en: 'Q3 Client Appreciation', ar: 'تقدير العملاء — الربع الثالث' },
    recipientCount: 180,
    status: 'draft',
    createdAt: '2026-06-15',
  },
]
