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

export type AccountOrderStatus = 'awaiting_approval' | 'confirmed' | 'processing' | 'shipped' | 'delivered'

export interface AccountOrder {
  orderNo: string
  placedAt: string
  status: AccountOrderStatus
  totalMinor: number
  buyer: Bilingual
  poNumber: string
  requiresApproval: boolean
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
    poNumber: 'PO-2026-0442',
    requiresApproval: true,
  },
  {
    orderNo: 'JAZ-2026-001140',
    placedAt: '2026-06-09',
    status: 'processing',
    totalMinor: 3180000,
    buyer: { en: 'Sara Al-Dosari', ar: 'سارة الدوسري' },
    poNumber: 'PO-2026-0431',
    requiresApproval: false,
  },
  {
    orderNo: 'JAZ-2026-000981',
    placedAt: '2026-05-22',
    status: 'delivered',
    totalMinor: 4200000,
    buyer: { en: 'Khalid Al-Otaibi', ar: 'خالد العتيبي' },
    poNumber: 'PO-2026-0410',
    requiresApproval: false,
  },
]

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
