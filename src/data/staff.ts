import type { Bilingual } from './types'

// ── Credit applications (segregation of duties: sales requests, finance approves) ──
export interface CreditApplication {
  id: string
  org: Bilingual
  kind: 'new' | 'limit_increase'
  requestedLimitMinor: number
  currentLimitMinor: number
  requestedBy: Bilingual // sales agent
  justification: Bilingual
  status: 'submitted' | 'in_review' | 'approved' | 'rejected'
  submittedAt: string
  riskRating: 'low' | 'medium' | 'high'
}

export const creditApplications: CreditApplication[] = [
  {
    id: 'ca-1',
    org: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' },
    kind: 'limit_increase',
    requestedLimitMinor: 25000000,
    currentLimitMinor: 15000000,
    requestedBy: { en: 'Majed Al-Shehri', ar: 'ماجد الشهري' },
    justification: { en: 'Ramadan seasonal gifting volume — 400+ boxes', ar: 'حجم إهداء موسم رمضان — أكثر من ٤٠٠ علبة' },
    status: 'submitted',
    submittedAt: '2026-06-18',
    riskRating: 'low',
  },
  {
    id: 'ca-2',
    org: { en: 'Rawabi Catering Co.', ar: 'شركة روابي للتموين' },
    kind: 'new',
    requestedLimitMinor: 8000000,
    currentLimitMinor: 0,
    requestedBy: { en: 'Majed Al-Shehri', ar: 'ماجد الشهري' },
    justification: { en: 'New reseller account, audited financials attached', ar: 'حساب موزّع جديد مع قوائم مالية مدققة' },
    status: 'in_review',
    submittedAt: '2026-06-16',
    riskRating: 'medium',
  },
  {
    id: 'ca-3',
    org: { en: 'Aseer Events LLC', ar: 'عسير للفعاليات' },
    kind: 'limit_increase',
    requestedLimitMinor: 12000000,
    currentLimitMinor: 6000000,
    requestedBy: { en: 'Majed Al-Shehri', ar: 'ماجد الشهري' },
    justification: { en: 'National Day campaign', ar: 'حملة اليوم الوطني' },
    status: 'submitted',
    submittedAt: '2026-06-14',
    riskRating: 'low',
  },
]

// ── Invoicing / ZATCA dashboard ──
export interface Invoice {
  id: string
  invoiceNo: string
  type: 'b2c_simplified' | 'b2b_standard'
  customer: Bilingual
  totalMinor: number
  vatMinor: number
  zatcaStatus: 'cleared' | 'reported' | 'pending' | 'rejected'
  issuedAt: string
}

export const invoices: Invoice[] = [
  { id: 'inv-1', invoiceNo: 'JAZ-2026-001188', type: 'b2b_standard', customer: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, totalMinor: 2840000, vatMinor: 370434, zatcaStatus: 'cleared', issuedAt: '2026-06-18' },
  { id: 'inv-2', invoiceNo: 'JAZ-2026-118540', type: 'b2c_simplified', customer: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' }, totalMinor: 18860, vatMinor: 2460, zatcaStatus: 'reported', issuedAt: '2026-06-14' },
  { id: 'inv-3', invoiceNo: 'JAZ-2026-001140', type: 'b2b_standard', customer: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, totalMinor: 3180000, vatMinor: 414783, zatcaStatus: 'cleared', issuedAt: '2026-06-09' },
  { id: 'inv-4', invoiceNo: 'JAZ-2026-118221', type: 'b2c_simplified', customer: { en: 'Omar Binmahfouz', ar: 'عمر بن محفوظ' }, totalMinor: 11600, vatMinor: 1513, zatcaStatus: 'pending', issuedAt: '2026-06-19' },
  { id: 'inv-5', invoiceNo: 'JAZ-2026-001097', type: 'b2b_standard', customer: { en: 'Rawabi Catering', ar: 'روابي للتموين' }, totalMinor: 1560000, vatMinor: 203478, zatcaStatus: 'rejected', issuedAt: '2026-06-08' },
]

// ── Support tickets ──
export interface SupportTicket {
  id: string
  subject: Bilingual
  requester: Bilingual
  channel: 'chat' | 'email' | 'whatsapp'
  status: 'open' | 'pending' | 'resolved'
  priority: 'low' | 'normal' | 'high'
  aiHandled: boolean
  createdAt: string
}

export const tickets: SupportTicket[] = [
  { id: 't-1', subject: { en: 'Order arrived warm — melted bars', ar: 'وصل الطلب دافئًا — ألواح ذائبة' }, requester: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' }, channel: 'whatsapp', status: 'open', priority: 'high', aiHandled: false, createdAt: '2026-06-19' },
  { id: 't-2', subject: { en: 'When will the Rose bar restock?', ar: 'متى يعود توفّر لوح الورد؟' }, requester: { en: 'Noura K.', ar: 'نورة ك.' }, channel: 'chat', status: 'resolved', priority: 'low', aiHandled: true, createdAt: '2026-06-18' },
  { id: 't-3', subject: { en: 'Need a ZATCA invoice copy', ar: 'أحتاج نسخة فاتورة معتمدة' }, requester: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, channel: 'email', status: 'pending', priority: 'normal', aiHandled: false, createdAt: '2026-06-17' },
  { id: 't-4', subject: { en: 'Change delivery address for gift batch', ar: 'تغيير عنوان توصيل دفعة الإهداء' }, requester: { en: 'Sara Al-Dosari', ar: 'سارة الدوسري' }, channel: 'whatsapp', status: 'open', priority: 'normal', aiHandled: false, createdAt: '2026-06-19' },
]

// ── Catalogue & CMS (content editor) ──
export interface CmsArticle {
  id: string
  title: Bilingual
  kind: 'story' | 'recipe' | 'page'
  status: 'draft' | 'published'
  author: Bilingual
  updatedAt: string
}

export const articles: CmsArticle[] = [
  { id: 'art-1', title: { en: 'The Khawlani coffee terraces', ar: 'مدرّجات البن الخولاني' }, kind: 'story', status: 'published', author: { en: 'Yousef Al-Maliki', ar: 'يوسف المالكي' }, updatedAt: '2026-06-10' },
  { id: 'art-2', title: { en: 'Pairing chocolate with Saudi coffee', ar: 'تناغم الشوكولاتة مع القهوة السعودية' }, kind: 'recipe', status: 'published', author: { en: 'Yousef Al-Maliki', ar: 'يوسف المالكي' }, updatedAt: '2026-06-05' },
  { id: 'art-3', title: { en: 'Behind the Eid Maison box', ar: 'خلف علبة العيد' }, kind: 'story', status: 'draft', author: { en: 'Yousef Al-Maliki', ar: 'يوسف المالكي' }, updatedAt: '2026-06-18' },
  { id: 'art-4', title: { en: 'Shipping & cold-chain policy', ar: 'سياسة الشحن وسلسلة التبريد' }, kind: 'page', status: 'published', author: { en: 'Yousef Al-Maliki', ar: 'يوسف المالكي' }, updatedAt: '2026-05-22' },
]

// ── Audit log (auditor, read-only) ──
export interface AuditEvent {
  id: string
  actor: Bilingual
  action: Bilingual
  resource: string
  ip: string
  at: string
  sensitive: boolean
}

export const auditEvents: AuditEvent[] = [
  { id: 'au-1', actor: { en: 'Aisha Al-Subaie', ar: 'عائشة السبيعي' }, action: { en: 'Approved credit limit increase', ar: 'اعتمدت رفع حد الائتمان' }, resource: 'CreditAccount · Najd Hospitality', ip: '212.118.x.x', at: '2026-06-18T10:24:00', sensitive: true },
  { id: 'au-2', actor: { en: 'Majed Al-Shehri', ar: 'ماجد الشهري' }, action: { en: 'Submitted credit application', ar: 'قدّم طلب ائتمان' }, resource: 'CreditApplication · ca-1', ip: '95.177.x.x', at: '2026-06-18T09:02:00', sensitive: true },
  { id: 'au-3', actor: { en: 'Yousef Al-Maliki', ar: 'يوسف المالكي' }, action: { en: 'Published article', ar: 'نشر مقالًا' }, resource: 'Article · art-2', ip: '5.42.x.x', at: '2026-06-05T14:10:00', sensitive: false },
  { id: 'au-4', actor: { en: 'Omar Al-Rashid', ar: 'عمر الراشد' }, action: { en: 'Edited price list (Gold tier)', ar: 'عدّل قائمة الأسعار (فئة ذهبي)' }, resource: 'PriceList · gold', ip: '188.55.x.x', at: '2026-06-12T11:48:00', sensitive: true },
  { id: 'au-5', actor: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' }, action: { en: 'Withdrew WhatsApp marketing consent', ar: 'سحبت موافقة تسويق واتساب' }, resource: 'ConsentRecord · marketing_whatsapp', ip: '37.224.x.x', at: '2026-05-28T19:30:00', sensitive: false },
]

// ── Consent ledger (auditor) ──
export interface ConsentLedgerEntry {
  id: string
  subject: Bilingual
  purpose: Bilingual
  granted: boolean
  version: string
  at: string
}

export const consentLedger: ConsentLedgerEntry[] = [
  { id: 'cl-1', subject: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' }, purpose: { en: 'WhatsApp marketing', ar: 'تسويق واتساب' }, granted: false, version: 'v2.1', at: '2026-05-28' },
  { id: 'cl-2', subject: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' }, purpose: { en: 'Email newsletter', ar: 'النشرة البريدية' }, granted: true, version: 'v2.1', at: '2024-11-02' },
  { id: 'cl-3', subject: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, purpose: { en: 'Data processing', ar: 'معالجة البيانات' }, granted: true, version: 'v1.4', at: '2025-09-12' },
  { id: 'cl-4', subject: { en: 'Omar Binmahfouz', ar: 'عمر بن محفوظ' }, purpose: { en: 'Profiling / recommendations', ar: 'التحليل والتوصيات' }, granted: false, version: 'v2.1', at: '2026-06-01' },
]

// ── Platform overview KPIs (admin) ──
export const platformKpis = {
  gmvTodayMinor: 4820000,
  ordersToday: 138,
  pendingCreditApps: creditApplications.filter((c) => c.status === 'submitted').length,
  openTickets: tickets.filter((t) => t.status === 'open').length,
  b2bAccounts: 24,
  zatcaPending: invoices.filter((i) => i.zatcaStatus === 'pending' || i.zatcaStatus === 'rejected').length,
}

// ── Organizations directory (sales/admin) ──
export interface OrgSummary {
  id: string
  name: Bilingual
  type: Bilingual
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  availableMinor: number
  limitMinor: number
  status: 'active' | 'pending' | 'suspended'
}

export const orgDirectory: OrgSummary[] = [
  { id: 'o-1', name: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, type: { en: 'Hospitality', ar: 'ضيافة' }, tier: 'gold', availableMinor: 6040000, limitMinor: 15000000, status: 'active' },
  { id: 'o-2', name: { en: 'Rawabi Catering Co.', ar: 'شركة روابي للتموين' }, type: { en: 'Reseller', ar: 'موزّع' }, tier: 'silver', availableMinor: 2200000, limitMinor: 5000000, status: 'pending' },
  { id: 'o-3', name: { en: 'Aseer Events LLC', ar: 'عسير للفعاليات' }, type: { en: 'Events', ar: 'فعاليات' }, tier: 'bronze', availableMinor: 1800000, limitMinor: 6000000, status: 'active' },
  { id: 'o-4', name: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, type: { en: 'Hospitality', ar: 'ضيافة' }, tier: 'platinum', availableMinor: 18400000, limitMinor: 30000000, status: 'active' },
]
