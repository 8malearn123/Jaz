import type { Bilingual } from './types'
import type { TeamPermission } from './ownerTeam'

// ── Governance: who may decide what, and which decisions need a second pair of eyes ──
//
// Two ideas live here and they are deliberately separate:
//
//   A job role says what a person *is* — a chef, an accountant — and carries the
//   console sections they work in plus the decisions they are competent to approve
//   and up to what value.
//
//   A decision policy says what a given action *costs* — under its auto threshold it
//   goes straight through, above it the action is held and waits for an approver.
//
// Nothing here executes anything. The queue lives in state/GovernanceContext and the
// effects live in state/OwnerStateContext, so a held decision is genuinely held: the
// stock, the limit and the price stay untouched until somebody approves.

/* ── job roles ─────────────────────────────────────────────────────────────── */

export type JobRole =
  | 'sys_admin' | 'finance_mgr' | 'accountant' | 'chef'
  | 'production' | 'warehouse' | 'purchasing' | 'sales' | 'auditor'

export interface JobRoleDef {
  key: JobRole
  label: Bilingual
  desc: Bilingual
  /** Console sections the role works in — granted with the role, still editable per person. */
  perms: TeamPermission[]
  /** Decisions this role is competent to approve. */
  approves: DecisionKind[]
  /** Most it may approve on its own signature. null → no ceiling. 0 → value is not its axis. */
  ceilingMinor: number | null
}

export const jobRoles: JobRoleDef[] = [
  {
    key: 'sys_admin',
    label: { en: 'System administrator', ar: 'مدير النظام' },
    desc: { en: 'Manages accounts, roles and the org chart. Grants access, does not spend.', ar: 'يدير الحسابات والأدوار والهيكل. يمنح الوصول ولا يصرف.' },
    perms: ['reports'],
    approves: ['perm_grant'],
    ceilingMinor: 0,
  },
  {
    key: 'finance_mgr',
    label: { en: 'Finance manager', ar: 'مدير مالي' },
    desc: { en: 'Credit, settlements and pricing above the accountant’s ceiling.', ar: 'الائتمان والسداد والتسعير فوق سقف المحاسب.' },
    perms: ['reports', 'customers', 'suppliers', 'accounting', 'ledger'],
    approves: ['credit_limit', 'vendor_payment', 'price_change', 'fx_rate', 'stock_take', 'waste', 'invoice_match', 'order_cancel', 'loyalty', 'batch_disposition', 'journal_post', 'period_close', 'account_change'],
    ceilingMinor: null,
  },
  {
    key: 'accountant',
    label: { en: 'Accountant', ar: 'محاسب' },
    desc: { en: 'Books, matching and settlements within a set ceiling.', ar: 'الدفاتر والمطابقة والسداد ضمن سقف محدد.' },
    perms: ['purchases', 'reports', 'suppliers', 'accounting', 'ledger'],
    approves: ['invoice_match', 'vendor_payment', 'waste', 'stock_take', 'journal_post', 'account_change'],
    ceilingMinor: 5000000, // ﷼ 50,000
  },
  {
    key: 'chef',
    label: { en: 'Head chef / quality', ar: 'الشيف / الجودة' },
    desc: { en: 'Releases batches, owns recipes and shelf life. Nothing ships unreleased.', ar: 'يُطلق الدفعات ويملك الوصفات والعمر الافتراضي. لا يُباع غير المُطلَق.' },
    perms: ['production', 'raw', 'products', 'waste'],
    approves: ['batch_release', 'recipe_change', 'shelf_life', 'batch_disposition', 'yield_variance', 'waste'],
    ceilingMinor: null,
  },
  {
    key: 'production',
    label: { en: 'Production', ar: 'الإنتاج' },
    desc: { en: 'Runs batches against approved recipes. Cannot release its own output.', ar: 'ينفّذ الدفعات وفق الوصفات المعتمدة. لا يُطلق إنتاجه بنفسه.' },
    perms: ['production', 'raw', 'waste'],
    approves: [],
    ceilingMinor: 0,
  },
  {
    key: 'warehouse',
    label: { en: 'Warehouse', ar: 'أمين المستودع' },
    desc: { en: 'Receiving, stock balances and counts. Counts are approved by someone else.', ar: 'الاستلام والأرصدة والجرد. يعتمد فروقَه غيرُه.' },
    perms: ['raw', 'purchases', 'waste', 'reports'],
    approves: [],
    ceilingMinor: 0,
  },
  {
    key: 'purchasing',
    label: { en: 'Purchasing', ar: 'المشتريات' },
    desc: { en: 'Suppliers and invoice entry. Entry and matching stay separate.', ar: 'الموردون وإدخال الفواتير. الإدخال والمطابقة منفصلان.' },
    perms: ['purchases', 'suppliers', 'raw'],
    approves: [],
    ceilingMinor: 0,
  },
  {
    key: 'sales',
    label: { en: 'Sales', ar: 'المبيعات' },
    desc: { en: 'Orders and customers. Requests credit, never grants it.', ar: 'الطلبات والعملاء. يطلب الائتمان ولا يمنحه.' },
    perms: ['orders', 'customers'],
    approves: [],
    ceilingMinor: 0,
  },
  {
    key: 'auditor',
    label: { en: 'Internal auditor', ar: 'المدقّق الداخلي' },
    desc: { en: 'Reads everything, approves nothing — independence is the point.', ar: 'يطّلع على كل شيء ولا يعتمد شيئًا — استقلاله هو المقصود.' },
    perms: ['reports'],
    approves: [],
    ceilingMinor: 0,
  },
]

export const jobRoleOf = (key?: JobRole): JobRoleDef | null => jobRoles.find((r) => r.key === key) ?? null

/* ── decisions ─────────────────────────────────────────────────────────────── */

export type DecisionKind =
  // finance & stock
  | 'credit_limit' | 'stock_take' | 'waste' | 'invoice_match' | 'price_change'
  | 'fx_rate' | 'perm_grant' | 'vendor_payment' | 'order_cancel' | 'loyalty'
  // the books
  | 'journal_post' | 'period_close' | 'account_change'
  // production
  | 'batch_release' | 'recipe_change' | 'shelf_life' | 'batch_disposition' | 'yield_variance'

/** One rung of a chain: any of these roles may sign it, and the next rung waits for it. */
export interface ApprovalStep {
  roles: JobRole[]
}

export interface DecisionPolicy {
  kind: string
  label: Bilingual
  /** What is being decided, in the requester's words. */
  desc: Bilingual
  /** Off → the action always executes immediately and nothing is held. */
  enabled?: boolean
  /** Below this value the action executes immediately. null → always needs approval. */
  autoBelowMinor: number | null
  /** The chain itself: signed rung by rung, in order. */
  steps: ApprovalStep[]
  /** Above this value the first approver is not enough and the owner co-signs. */
  dualAboveMinor: number | null
  /** The requester must write why. */
  requiresReason: boolean
  /** Value is not the axis of this decision — it is always held (e.g. a recipe change). */
  valueless?: boolean
}

// Thresholds are set against this business's own scale: a cycle turns over ~﷼ 2.85M,
// partner limits run ﷼ 50k–300k, purchase invoices ﷼ 13k–265k and a waste event ﷼ 1k–4k.
export const decisionPolicies: DecisionPolicy[] = [
  {
    kind: 'credit_limit',
    label: { en: 'Credit limit raise', ar: 'رفع حد ائتماني' },
    desc: { en: 'Raising a partner’s credit limit', ar: 'رفع الحد الائتماني لشريك' },
    autoBelowMinor: 5000000, // ﷼ 50,000 — lowering a limit never needs approval
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: 25000000, // ﷼ 250,000 → owner co-signs
    requiresReason: true,
  },
  {
    kind: 'stock_take',
    label: { en: 'Stock-take variance', ar: 'فرق جرد' },
    desc: { en: 'Posting a counted variance to stock', ar: 'ترحيل فرق الجرد إلى المخزون' },
    autoBelowMinor: 200000, // ﷼ 2,000 net variance
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
  },
  {
    kind: 'waste',
    label: { en: 'Waste write-off', ar: 'تسجيل هدر' },
    desc: { en: 'Writing stock off as waste', ar: 'إخراج مخزون كهدر' },
    autoBelowMinor: 50000, // ﷼ 500 per event
    steps: [{ roles: ['chef', 'accountant', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
  },
  {
    kind: 'invoice_match',
    label: { en: 'Invoice reconciliation', ar: 'مطابقة فاتورة' },
    desc: { en: 'Closing a purchase invoice’s three-way match', ar: 'إغلاق المطابقة الثلاثية لفاتورة مشتريات' },
    autoBelowMinor: null, // whoever entered it may never close it — always a second person
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: false,
  },
  {
    kind: 'price_change',
    label: { en: 'Price change', ar: 'تغيير سعر' },
    desc: { en: 'Changing a product’s selling price', ar: 'تغيير سعر بيع منتج' },
    autoBelowMinor: null, // gated on move size and on cost, not on value — see priceNeedsApproval
    steps: [{ roles: ['finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'fx_rate',
    label: { en: 'Exchange rate change', ar: 'تغيير سعر صرف' },
    desc: { en: 'Moving a market rate beyond its tolerance', ar: 'تحريك سعر صرف سوقي خارج نطاق التسامح' },
    autoBelowMinor: null,
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'perm_grant',
    label: { en: 'Sensitive permission', ar: 'صلاحية حساسة' },
    desc: { en: 'Granting purchases, waste or products access', ar: 'منح صلاحية المشتريات أو الهدر أو المنتجات' },
    autoBelowMinor: null,
    steps: [{ roles: ['sys_admin', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'vendor_payment',
    label: { en: 'Settlement', ar: 'سداد' },
    desc: { en: 'Recording a payment against a partner balance', ar: 'تسجيل سداد على رصيد شريك' },
    autoBelowMinor: 5000000, // ﷼ 50,000
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: false,
  },
  {
    kind: 'order_cancel',
    label: { en: 'Order cancellation', ar: 'إلغاء طلب' },
    desc: { en: 'Cancelling an order that already entered preparation', ar: 'إلغاء طلب دخل التجهيز' },
    autoBelowMinor: null,
    steps: [{ roles: ['sales', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'loyalty',
    label: { en: 'Loyalty mechanics', ar: 'آلية الولاء' },
    desc: { en: 'Changing earning or redemption rates', ar: 'تغيير نسب الاكتساب أو الاستبدال' },
    autoBelowMinor: null,
    steps: [{ roles: ['finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'journal_post',
    label: { en: 'Manual journal entry', ar: 'قيد يومية يدوي' },
    desc: { en: 'Posting an entry by hand rather than from a document', ar: 'ترحيل قيد يدويًا لا من مستند' },
    autoBelowMinor: 500000, // ﷼ 5,000 — an accrual or a correction of this size is routine
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: 5000000, // ﷼ 50,000 → the owner co-signs; a hand-made entry moves real money
    requiresReason: true,
  },
  {
    kind: 'period_close',
    label: { en: 'Period close', ar: 'إقفال فترة' },
    desc: { en: 'Closing a period and carrying its result to retained earnings', ar: 'إقفال فترة وترحيل نتيجتها إلى الأرباح المبقاة' },
    autoBelowMinor: null, // a close is never routine, whatever the period earned
    steps: [{ roles: ['finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: false,
    valueless: true,
  },
  {
    kind: 'account_change',
    label: { en: 'Chart of accounts change', ar: 'تعديل دليل الحسابات' },
    desc: { en: 'Adding or deactivating an account in the chart', ar: 'إضافة حساب أو إيقافه في الدليل' },
    autoBelowMinor: null,
    steps: [{ roles: ['accountant', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'batch_release',
    label: { en: 'Batch release', ar: 'إطلاق دفعة' },
    desc: { en: 'Releasing a produced batch from quarantine to sellable', ar: 'إطلاق دفعة من الحجر لتصبح قابلة للبيع' },
    autoBelowMinor: null, // nothing ships unreleased, whatever it is worth
    steps: [{ roles: ['chef'] }],
    dualAboveMinor: null,
    requiresReason: false,
    valueless: true,
  },
  {
    kind: 'recipe_change',
    label: { en: 'Recipe change', ar: 'تغيير وصفة' },
    desc: { en: 'Changing a live product’s formulation', ar: 'تعديل تركيبة منتج قائم' },
    autoBelowMinor: null,
    steps: [{ roles: ['chef', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'shelf_life',
    label: { en: 'Shelf life exception', ar: 'استثناء عمر افتراضي' },
    desc: { en: 'Giving a batch a shelf life other than its product’s', ar: 'منح دفعة عمرًا افتراضيًا مخالفًا لعمر منتجها' },
    autoBelowMinor: null,
    steps: [{ roles: ['chef'] }],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'batch_disposition',
    label: { en: 'Rejected batch disposition', ar: 'مصير دفعة مرفوضة' },
    desc: { en: 'Rework, downgrade or write off a rejected batch', ar: 'إعادة تشغيل أو تنزيل درجة أو هدر دفعة مرفوضة' },
    autoBelowMinor: null,
    steps: [{ roles: ['chef', 'finance_mgr'] }],
    dualAboveMinor: 1000000, // ﷼ 10,000 of batch value → owner co-signs
    requiresReason: true,
  },
  {
    kind: 'yield_variance',
    label: { en: 'Yield variance', ar: 'فرق عائد' },
    desc: { en: 'Confirming actual consumption against the recipe', ar: 'تأكيد المستهلك الفعلي مقابل الوصفة' },
    autoBelowMinor: 100000, // ﷼ 1,000 of extra draw passes as ordinary processing loss
    steps: [{ roles: ['chef', 'finance_mgr'] }],
    dualAboveMinor: null,
    requiresReason: true,
  },
]

export const policyOf = (kind: string): DecisionPolicy | undefined => decisionPolicies.find((p) => p.kind === kind)

/** What the owner may change about a chain without touching code. */
export interface PolicyOverride {
  enabled?: boolean
  autoBelowMinor?: number | null
  dualAboveMinor?: number | null
  /** Who signs it, rung by rung — the part an owner most often wants to change. */
  steps?: ApprovalStep[]
}
/** The chain as it actually stands: its shipped defaults with the owner's edits on top. */
export function withOverride(base: DecisionPolicy, o?: PolicyOverride): DecisionPolicy {
  if (!o) return { ...base, enabled: base.enabled ?? true }
  return {
    ...base,
    enabled: o.enabled ?? base.enabled ?? true,
    autoBelowMinor: o.autoBelowMinor !== undefined ? o.autoBelowMinor : base.autoBelowMinor,
    dualAboveMinor: o.dualAboveMinor !== undefined ? o.dualAboveMinor : base.dualAboveMinor,
    steps: o.steps ?? base.steps,
  }
}

/** The rungs a request actually has to climb, given what it is worth: the chain as
 *  configured, plus the owner on top when the value crosses the dual-control point. */
export function stepsFor(p: DecisionPolicy, amountMinor = 0): ApprovalStep[] {
  const base = p.steps.length > 0 ? p.steps : [{ roles: [] as JobRole[] }]
  return needsDualControl(p, amountMinor) ? [...base, { roles: [] as JobRole[] }] : base
}

/** Permissions that hand someone real leverage — granting one is itself a decision. */
export const sensitivePerms: TeamPermission[] = ['purchases', 'waste', 'products']

/** A price move needs approval if it swings more than this, whatever its direction. */
export const PRICE_MOVE_TOLERANCE = 0.15
/** A market rate move beyond this is either a typo or a decision — either way, a second look. */
export const FX_MOVE_TOLERANCE = 0.05

/** Does this decision clear on its own, given what it is worth? */
export function needsApproval(p: DecisionPolicy, amountMinor = 0): boolean {
  if (p.enabled === false) return false
  if (p.autoBelowMinor == null) return true
  return Math.abs(amountMinor) >= p.autoBelowMinor
}

/** Does it need the owner's co-signature on top of the first approver? */
export function needsDualControl(p: DecisionPolicy, amountMinor = 0): boolean {
  return p.dualAboveMinor != null && Math.abs(amountMinor) >= p.dualAboveMinor
}

/** May this role approve this decision at this value? */
/** May this role sign this rung, at this value? A rung with no roles is the owner's. */
export function roleMaySignStep(role: JobRole | undefined, step: ApprovalStep, p: DecisionPolicy, amountMinor = 0): boolean {
  if (step.roles.length === 0) return false // owner-only rung
  if (!role || !step.roles.includes(role)) return false
  const def = jobRoleOf(role)
  if (!def) return false
  if (def.ceilingMinor == null) return true
  if (p.valueless) return true
  return Math.abs(amountMinor) <= def.ceilingMinor
}

/** May this role sign anywhere on this chain? Used to name who to chase. */
export function roleMayApprove(role: JobRole | undefined, p: DecisionPolicy, amountMinor = 0): boolean {
  return stepsFor(p, amountMinor).some((st) => roleMaySignStep(role, st, p, amountMinor))
}

/* ── chains the owner can add ───────────────────────────────────────────────
   The fifteen above are wired to actions in the console: the action raises its own
   request. These are the rest of a business's approvals — the ones that live in
   people's heads, in messages and in verbal say-so. Adding one gives that decision
   a named chain, a limit and a signature trail; requests against it are raised by
   hand from Approvals, because nothing in the console performs them. */

export interface ChainTemplate {
  key: string
  label: Bilingual
  desc: Bilingual
  group: Bilingual
  autoBelowMinor: number | null
  dualAboveMinor: number | null
  steps: ApprovalStep[]
  valueless?: boolean
}

const G = {
  money: { en: 'Money out', ar: 'صرف ومال' } as Bilingual,
  commercial: { en: 'Commercial', ar: 'تجاري' } as Bilingual,
  people: { en: 'People', ar: 'الموظفون' } as Bilingual,
  ops: { en: 'Operations', ar: 'التشغيل' } as Bilingual,
  quality: { en: 'Quality & product', ar: 'الجودة والمنتج' } as Bilingual,
}

export const chainTemplates: ChainTemplate[] = [
  // ── money out ──
  { key: 'capex', group: G.money, label: { en: 'Capital spend', ar: 'مصروف رأسمالي' }, desc: { en: 'Buying equipment, a vehicle or a fit-out', ar: 'شراء معدة أو مركبة أو تجهيز موقع' }, autoBelowMinor: 500000, dualAboveMinor: 5000000, steps: [{ roles: ['accountant'] }, { roles: ['finance_mgr'] }] },
  { key: 'opex_bill', group: G.money, label: { en: 'Operating bill', ar: 'فاتورة تشغيلية' }, desc: { en: 'Rent, utilities, services and the like', ar: 'إيجار ومرافق وخدمات وما شابهها' }, autoBelowMinor: 300000, dualAboveMinor: null, steps: [{ roles: ['accountant'] }] },
  { key: 'petty_cash', group: G.money, label: { en: 'Petty cash', ar: 'عهدة نقدية' }, desc: { en: 'Cash handed out and settled later', ar: 'نقد يُصرف ويُسوّى لاحقًا' }, autoBelowMinor: 50000, dualAboveMinor: null, steps: [{ roles: ['accountant'] }] },
  { key: 'refund', group: G.money, label: { en: 'Customer refund', ar: 'ردّ مبلغ لعميل' }, desc: { en: 'Money returned against an order', ar: 'إعادة مبلغ مقابل طلب' }, autoBelowMinor: 100000, dualAboveMinor: 1000000, steps: [{ roles: ['accountant'] }, { roles: ['finance_mgr'] }] },
  { key: 'writeoff_debt', group: G.money, label: { en: 'Bad debt write-off', ar: 'إعدام دين' }, desc: { en: 'Giving up on collecting a balance', ar: 'التوقف عن تحصيل رصيد' }, autoBelowMinor: null, dualAboveMinor: 500000, steps: [{ roles: ['finance_mgr'] }] },
  { key: 'payroll_run', group: G.money, label: { en: 'Payroll run', ar: 'مسيّر الرواتب' }, desc: { en: 'Releasing the month’s salaries', ar: 'اعتماد صرف رواتب الشهر' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['accountant'] }, { roles: ['finance_mgr'] }], valueless: true },
  // ── commercial ──
  { key: 'discount', group: G.commercial, label: { en: 'Discount beyond policy', ar: 'خصم يتجاوز السياسة' }, desc: { en: 'A price cut past what the price list allows', ar: 'تخفيض سعر يتجاوز ما تسمح به القائمة' }, autoBelowMinor: 50000, dualAboveMinor: 500000, steps: [{ roles: ['sales' ] }, { roles: ['finance_mgr'] }] },
  { key: 'contract', group: G.commercial, label: { en: 'Contract signing', ar: 'توقيع عقد' }, desc: { en: 'Committing the company to terms', ar: 'إلزام الشركة بشروط' }, autoBelowMinor: null, dualAboveMinor: 2000000, steps: [{ roles: ['finance_mgr'] }], valueless: true },
  { key: 'payment_terms', group: G.commercial, label: { en: 'Payment terms change', ar: 'تغيير شروط السداد' }, desc: { en: 'Moving a partner to longer or shorter terms', ar: 'تعديل أجل السداد لشريك' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['accountant'] }, { roles: ['finance_mgr'] }], valueless: true },
  { key: 'new_supplier', group: G.commercial, label: { en: 'New supplier', ar: 'اعتماد مورّد جديد' }, desc: { en: 'Adding a source to buy from', ar: 'إضافة مصدر شراء' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['purchasing'] }, { roles: ['finance_mgr'] }], valueless: true },
  { key: 'marketing_spend', group: G.commercial, label: { en: 'Marketing spend', ar: 'إنفاق تسويقي' }, desc: { en: 'A campaign, a sponsorship, an activation', ar: 'حملة أو رعاية أو تفعيل' }, autoBelowMinor: 200000, dualAboveMinor: 2000000, steps: [{ roles: ['finance_mgr'] }] },
  { key: 'export_shipment', group: G.commercial, label: { en: 'Export shipment release', ar: 'إفراج شحنة تصدير' }, desc: { en: 'Letting a cold-chain export leave the site', ar: 'السماح بمغادرة شحنة مبرّدة للتصدير' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['warehouse'] }, { roles: ['finance_mgr'] }], valueless: true },
  // ── people ──
  { key: 'hire', group: G.people, label: { en: 'Hiring', ar: 'توظيف' }, desc: { en: 'Adding a head to the payroll', ar: 'إضافة موظف على المسيّر' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['sys_admin'] }, { roles: ['finance_mgr'] }], valueless: true },
  { key: 'salary_change', group: G.people, label: { en: 'Salary change', ar: 'تعديل راتب' }, desc: { en: 'A raise, a cut or a new package', ar: 'زيادة أو خفض أو حزمة جديدة' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['finance_mgr'] }], valueless: true },
  { key: 'overtime', group: G.people, label: { en: 'Overtime', ar: 'عمل إضافي' }, desc: { en: 'Hours beyond the shift, and their cost', ar: 'ساعات خارج الدوام وتكلفتها' }, autoBelowMinor: 30000, dualAboveMinor: null, steps: [{ roles: ['production'] }, { roles: ['accountant'] }] },
  { key: 'leave', group: G.people, label: { en: 'Leave request', ar: 'طلب إجازة' }, desc: { en: 'Time off that has to be covered', ar: 'إجازة تحتاج تغطية' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['sys_admin'] }], valueless: true },
  { key: 'termination', group: G.people, label: { en: 'Termination', ar: 'إنهاء خدمة' }, desc: { en: 'Ending someone’s employment', ar: 'إنهاء علاقة موظف بالعمل' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['sys_admin'] }, { roles: ['finance_mgr'] }], valueless: true },
  // ── operations & quality ──
  { key: 'new_branch', group: G.ops, label: { en: 'Opening a branch', ar: 'افتتاح فرع' }, desc: { en: 'A new site, with everything it drags along', ar: 'موقع جديد بما يستتبعه' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['finance_mgr'] }], valueless: true },
  { key: 'maintenance', group: G.ops, label: { en: 'Line maintenance stop', ar: 'إيقاف خط للصيانة' }, desc: { en: 'Taking production down on purpose', ar: 'إيقاف الإنتاج عمدًا' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['production'] }, { roles: ['chef'] }], valueless: true },
  { key: 'recall', group: G.quality, label: { en: 'Product recall', ar: 'سحب منتج من السوق' }, desc: { en: 'Pulling sold stock back in', ar: 'استرجاع بضاعة بيعت' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['chef'] }, { roles: ['finance_mgr'] }], valueless: true },
  { key: 'new_product', group: G.quality, label: { en: 'New product launch', ar: 'إطلاق منتج جديد' }, desc: { en: 'Putting a new item in front of customers', ar: 'طرح صنف جديد للعملاء' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['chef'] }, { roles: ['finance_mgr'] }], valueless: true },
  { key: 'supplier_swap', group: G.quality, label: { en: 'Ingredient substitution', ar: 'استبدال مكوّن' }, desc: { en: 'Running a batch on a different input', ar: 'تشغيل دفعة بمكوّن مختلف' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['chef'] }], valueless: true },
  { key: 'lab_result', group: G.quality, label: { en: 'Lab result sign-off', ar: 'اعتماد نتيجة مختبر' }, desc: { en: 'Accepting a test that clears a batch', ar: 'قبول فحص يُجيز دفعة' }, autoBelowMinor: null, dualAboveMinor: null, steps: [{ roles: ['chef'] }], valueless: true },
]

/** A chain the owner added. It has no action wired to it, so its requests are raised by hand. */
export interface CustomChain {
  id: string // `custom:1`
  label: Bilingual
  desc: Bilingual
  autoBelowMinor: number | null
  dualAboveMinor: number | null
  steps: ApprovalStep[]
  valueless?: boolean
  enabled?: boolean
}

export const isCustomChain = (kind: string) => kind.startsWith('custom:')

/** A custom chain shaped like the built-in ones so everything downstream treats them alike. */
export function chainToPolicy(c: CustomChain): DecisionPolicy {
  return {
    kind: c.id, label: c.label, desc: c.desc, enabled: c.enabled ?? true,
    autoBelowMinor: c.autoBelowMinor, dualAboveMinor: c.dualAboveMinor,
    steps: c.steps, requiresReason: true, valueless: c.valueless,
  }
}
