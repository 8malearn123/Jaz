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

// ── Concierge conversation threads (sender customer / ai / agent) ──
export interface ChatMessage {
  id: string
  sender: 'customer' | 'ai' | 'agent'
  body: Bilingual
  at: string
  citations?: Bilingual[]
}

export interface AiSuggestion {
  reply: Bilingual
  confidence: number
  citations: Bilingual[]
  routeTo?: Bilingual // B2B escalation target (account manager)
}

export const ticketThreads: Record<string, ChatMessage[]> = {
  't-1': [
    { id: 'm1', sender: 'customer', at: '2026-06-19T08:10', body: { en: 'My order arrived warm and two bars had melted. Very disappointed.', ar: 'وصل طلبي دافئًا وذاب لوحان. خيبة أمل كبيرة.' } },
    { id: 'm2', sender: 'ai', at: '2026-06-19T08:10', citations: [{ en: 'Returns policy — melted / damaged', ar: 'سياسة الإرجاع — ذائب / تالف' }, { en: 'Cold-chain carrier SLA', ar: 'اتفاقية مستوى خدمة سلسلة التبريد' }], body: { en: "I'm so sorry. JAZ ships heat-sensitive bars in temperature-controlled packaging. I can arrange a free cold-chain replacement — shall I proceed?", ar: 'آسفة جدًا. تُشحن ألواح جاز الحساسة للحرارة بتغليف مبرّد. يمكنني ترتيب استبدال مجاني بسلسلة تبريد — هل أتابع؟' } },
    { id: 'm3', sender: 'customer', at: '2026-06-19T08:14', body: { en: 'Yes please, and make sure it stays cold this time.', ar: 'نعم من فضلك، وتأكدي أن تبقى باردة هذه المرة.' } },
  ],
  't-2': [
    { id: 'm1', sender: 'customer', at: '2026-06-18T13:02', body: { en: 'When will the Damascena Rose bar be back in stock?', ar: 'متى يعود لوح الورد الدمشقي للتوفّر؟' } },
    { id: 'm2', sender: 'ai', at: '2026-06-18T13:02', citations: [{ en: 'Product — Damascena Rose', ar: 'منتج — الورد الدمشقي' }, { en: 'Restock calendar', ar: 'تقويم إعادة التوريد' }], body: { en: 'The Rose is a limited run; the next batch lands 28 June 2026. Want a WhatsApp alert when it is live?', ar: 'الورد إصدار محدود؛ الدفعة القادمة في ٢٨ يونيو ٢٠٢٦. أرسل تنبيه واتساب عند توفّره؟' } },
    { id: 'm3', sender: 'customer', at: '2026-06-18T13:05', body: { en: 'Yes, notify me.', ar: 'نعم، أبلغيني.' } },
    { id: 'm4', sender: 'ai', at: '2026-06-18T13:05', body: { en: "Done — you're on the list. 🌹", ar: 'تم — أنتِ على القائمة. 🌹' } },
  ],
  't-3': [
    { id: 'm1', sender: 'customer', at: '2026-06-17T10:30', body: { en: 'We need a copy of the ZATCA invoice for order JAZ-2026-001140.', ar: 'نحتاج نسخة فاتورة هيئة الزكاة للطلب JAZ-2026-001140.' } },
    { id: 'm2', sender: 'ai', at: '2026-06-17T10:30', citations: [{ en: 'ZATCA standard invoicing', ar: 'فوترة هيئة الزكاة المعيارية' }, { en: 'Invoice JAZ-2026-001140', ar: 'فاتورة JAZ-2026-001140' }], body: { en: 'Standard B2B invoices are cleared with ZATCA as a bilingual PDF with QR. I can email it — confirm the finance address?', ar: 'الفواتير المعيارية تُجاز مع الهيئة كملف PDF بلغتين مع QR. يمكنني إرسالها — أكّد بريد المالية؟' } },
  ],
  't-4': [
    { id: 'm1', sender: 'customer', at: '2026-06-19T09:00', body: { en: 'Can we change the delivery address for the Eid gift batch to our Jeddah branch?', ar: 'هل يمكن تغيير عنوان توصيل دفعة هدايا العيد إلى فرع جدة؟' } },
    { id: 'm2', sender: 'ai', at: '2026-06-19T09:01', citations: [{ en: 'Gift batch — Eid Al-Fitr', ar: 'دفعة إهداء — عيد الفطر' }, { en: 'Saudi National Address (SPL)', ar: 'العنوان الوطني السعودي' }], body: { en: 'I can update the shipping address to a verified national address. Please share the short address (e.g., HMRA1180).', ar: 'يمكنني تحديث عنوان الشحن لعنوان وطني موثّق. شاركيني العنوان المختصر (مثل HMRA1180).' } },
  ],
}

export const aiSuggestions: Record<string, AiSuggestion> = {
  't-1': {
    reply: { en: "Hi Layla — I've approved a complimentary cold-chain replacement with a gel-pack upgrade, arriving within 2 business days. A WhatsApp tracking link is on the way. Apologies again.", ar: 'مرحبًا ليلى — اعتمدت استبدالًا مجانيًا بسلسلة تبريد مع تحسين عبوة التبريد، يصل خلال يومي عمل. رابط تتبّع واتساب في الطريق. آسفة مجددًا.' },
    confidence: 0.92,
    citations: [{ en: 'Returns policy — melted', ar: 'سياسة الإرجاع — ذائب' }, { en: 'Cold-chain SLA', ar: 'اتفاقية سلسلة التبريد' }],
  },
  't-3': {
    reply: { en: 'Attached is the ZATCA-cleared bilingual invoice (PDF + QR) for JAZ-2026-001140. I have CC’d your account manager Majed Al-Shehri. Let me know if you also need the credit note.', ar: 'مرفق الفاتورة المعتمدة من الهيئة بلغتين (PDF + QR) للطلب JAZ-2026-001140. أضفت مدير حسابك ماجد الشهري نسخةً. أخبرني إن احتجت الإشعار الدائن.' },
    confidence: 0.88,
    citations: [{ en: 'ZATCA invoice — JAZ-2026-001140', ar: 'فاتورة الهيئة — JAZ-2026-001140' }],
    routeTo: { en: 'Majed Al-Shehri (account manager)', ar: 'ماجد الشهري (مدير الحساب)' },
  },
  't-4': {
    reply: { en: 'Updated the Eid batch shipping to your Jeddah branch (HMRA1180). Recipients in that batch now route there; tracking links refresh within an hour.', ar: 'حدّثت شحن دفعة العيد إلى فرع جدة (HMRA1180). يتوجّه المستفيدون في الدفعة إلى هناك؛ تتحدث روابط التتبّع خلال ساعة.' },
    confidence: 0.85,
    citations: [{ en: 'SPL national address', ar: 'العنوان الوطني SPL' }, { en: 'Gift batch gb-2', ar: 'دفعة الإهداء gb-2' }],
    routeTo: { en: 'Sara Al-Dosari (org approver)', ar: 'سارة الدوسري (معتمِدة المنشأة)' },
  },
}

// ── Sales quote pipeline (sales agent) ──
export interface PipelineQuote {
  id: string
  ref: string
  account: Bilingual
  accountId: string // → orgDirectory
  stage: 'draft' | 'sent' | 'accepted' | 'won' | 'lost'
  valueMinor: number
  createdAt: string
  validUntil: string
  note: Bilingual
}

export const salesPipeline: PipelineQuote[] = [
  { id: 'pq-4', ref: 'RFQ-2026-0192', account: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, accountId: 'o-4', stage: 'draft', valueMinor: 6300000, createdAt: '2026-06-19', validUntil: '2026-07-20', note: { en: 'Platinum amenity programme', ar: 'برنامج ضيافة بلاتيني' } },
  { id: 'pq-1', ref: 'RFQ-2026-0188', account: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, accountId: 'o-1', stage: 'sent', valueMinor: 4820000, createdAt: '2026-06-08', validUntil: '2026-07-10', note: { en: 'Ramadan gifting — 400 boxes', ar: 'إهداء رمضان — ٤٠٠ علبة' } },
  { id: 'pq-5', ref: 'RFQ-2026-0190', account: { en: 'Rawabi Catering', ar: 'روابي للتموين' }, accountId: 'o-2', stage: 'sent', valueMinor: 1560000, createdAt: '2026-06-17', validUntil: '2026-07-05', note: { en: 'Reseller starter order', ar: 'طلب موزّع مبدئي' } },
  { id: 'pq-2', ref: 'RFQ-2026-0171', account: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, accountId: 'o-1', stage: 'accepted', valueMinor: 2140000, createdAt: '2026-06-12', validUntil: '2026-06-30', note: { en: 'Hotel amenity bars — monthly', ar: 'ألواح ضيافة الفندق — شهريًا' } },
  { id: 'pq-6', ref: 'RFQ-2026-0185', account: { en: 'Aseer Events', ar: 'عسير للفعاليات' }, accountId: 'o-3', stage: 'accepted', valueMinor: 1200000, createdAt: '2026-06-15', validUntil: '2026-07-02', note: { en: 'National Day campaign', ar: 'حملة اليوم الوطني' } },
  { id: 'pq-7', ref: 'RFQ-2026-0179', account: { en: 'Najd Hospitality', ar: 'نجد للضيافة' }, accountId: 'o-1', stage: 'won', valueMinor: 3180000, createdAt: '2026-06-01', validUntil: '2026-06-09', note: { en: 'Amenity bars — converted', ar: 'ألواح ضيافة — محوّلة' } },
  { id: 'pq-8', ref: 'RFQ-2026-0168', account: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, accountId: 'o-4', stage: 'won', valueMinor: 2750000, createdAt: '2026-05-20', validUntil: '2026-05-28', note: { en: 'Eid corporate gifting', ar: 'إهداء العيد المؤسسي' } },
  { id: 'pq-3', ref: 'RFQ-2026-0150', account: { en: 'Aseer Events', ar: 'عسير للفعاليات' }, accountId: 'o-3', stage: 'lost', valueMinor: 980000, createdAt: '2026-05-10', validUntil: '2026-05-20', note: { en: 'Conference welcome gifts', ar: 'هدايا ترحيب المؤتمر' } },
]

// Sales target & won-trend for the performance dashboard.
export const salesQuotaMinor = 10000000 // SAR 100,000 quarter quota
export const salesWonByMonth: { month: Bilingual; valueMinor: number }[] = [
  { month: { en: 'Jan', ar: 'ينا' }, valueMinor: 2100000 },
  { month: { en: 'Feb', ar: 'فبر' }, valueMinor: 3400000 },
  { month: { en: 'Mar', ar: 'مار' }, valueMinor: 5200000 },
  { month: { en: 'Apr', ar: 'أبر' }, valueMinor: 2800000 },
  { month: { en: 'May', ar: 'ماي' }, valueMinor: 2750000 },
  { month: { en: 'Jun', ar: 'يون' }, valueMinor: 3180000 },
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
