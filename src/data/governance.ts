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
    perms: ['reports', 'customers', 'suppliers'],
    approves: ['credit_limit', 'vendor_payment', 'price_change', 'fx_rate', 'stock_take', 'waste', 'invoice_match', 'order_cancel', 'loyalty', 'batch_disposition'],
    ceilingMinor: null,
  },
  {
    key: 'accountant',
    label: { en: 'Accountant', ar: 'محاسب' },
    desc: { en: 'Books, matching and settlements within a set ceiling.', ar: 'الدفاتر والمطابقة والسداد ضمن سقف محدد.' },
    perms: ['purchases', 'reports', 'suppliers'],
    approves: ['invoice_match', 'vendor_payment', 'waste', 'stock_take'],
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
  // production
  | 'batch_release' | 'recipe_change' | 'shelf_life' | 'batch_disposition' | 'yield_variance'

export interface DecisionPolicy {
  kind: DecisionKind
  label: Bilingual
  /** What is being decided, in the requester's words. */
  desc: Bilingual
  /** Off → the action always executes immediately and nothing is held. */
  enabled?: boolean
  /** Below this value the action executes immediately. null → always needs approval. */
  autoBelowMinor: number | null
  /** Roles competent to approve it, in escalation order. */
  approverRoles: JobRole[]
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
    approverRoles: ['accountant', 'finance_mgr'],
    dualAboveMinor: 25000000, // ﷼ 250,000 → owner co-signs
    requiresReason: true,
  },
  {
    kind: 'stock_take',
    label: { en: 'Stock-take variance', ar: 'فرق جرد' },
    desc: { en: 'Posting a counted variance to stock', ar: 'ترحيل فرق الجرد إلى المخزون' },
    autoBelowMinor: 200000, // ﷼ 2,000 net variance
    approverRoles: ['accountant', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
  },
  {
    kind: 'waste',
    label: { en: 'Waste write-off', ar: 'تسجيل هدر' },
    desc: { en: 'Writing stock off as waste', ar: 'إخراج مخزون كهدر' },
    autoBelowMinor: 50000, // ﷼ 500 per event
    approverRoles: ['chef', 'accountant', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
  },
  {
    kind: 'invoice_match',
    label: { en: 'Invoice reconciliation', ar: 'مطابقة فاتورة' },
    desc: { en: 'Closing a purchase invoice’s three-way match', ar: 'إغلاق المطابقة الثلاثية لفاتورة مشتريات' },
    autoBelowMinor: null, // whoever entered it may never close it — always a second person
    approverRoles: ['accountant', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: false,
  },
  {
    kind: 'price_change',
    label: { en: 'Price change', ar: 'تغيير سعر' },
    desc: { en: 'Changing a product’s selling price', ar: 'تغيير سعر بيع منتج' },
    autoBelowMinor: null, // gated on move size and on cost, not on value — see priceNeedsApproval
    approverRoles: ['finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'fx_rate',
    label: { en: 'Exchange rate change', ar: 'تغيير سعر صرف' },
    desc: { en: 'Moving a market rate beyond its tolerance', ar: 'تحريك سعر صرف سوقي خارج نطاق التسامح' },
    autoBelowMinor: null,
    approverRoles: ['accountant', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'perm_grant',
    label: { en: 'Sensitive permission', ar: 'صلاحية حساسة' },
    desc: { en: 'Granting purchases, waste or products access', ar: 'منح صلاحية المشتريات أو الهدر أو المنتجات' },
    autoBelowMinor: null,
    approverRoles: ['sys_admin', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'vendor_payment',
    label: { en: 'Settlement', ar: 'سداد' },
    desc: { en: 'Recording a payment against a partner balance', ar: 'تسجيل سداد على رصيد شريك' },
    autoBelowMinor: 5000000, // ﷼ 50,000
    approverRoles: ['accountant', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: false,
  },
  {
    kind: 'order_cancel',
    label: { en: 'Order cancellation', ar: 'إلغاء طلب' },
    desc: { en: 'Cancelling an order that already entered preparation', ar: 'إلغاء طلب دخل التجهيز' },
    autoBelowMinor: null,
    approverRoles: ['sales', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'loyalty',
    label: { en: 'Loyalty mechanics', ar: 'آلية الولاء' },
    desc: { en: 'Changing earning or redemption rates', ar: 'تغيير نسب الاكتساب أو الاستبدال' },
    autoBelowMinor: null,
    approverRoles: ['finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'batch_release',
    label: { en: 'Batch release', ar: 'إطلاق دفعة' },
    desc: { en: 'Releasing a produced batch from quarantine to sellable', ar: 'إطلاق دفعة من الحجر لتصبح قابلة للبيع' },
    autoBelowMinor: null, // nothing ships unreleased, whatever it is worth
    approverRoles: ['chef'],
    dualAboveMinor: null,
    requiresReason: false,
    valueless: true,
  },
  {
    kind: 'recipe_change',
    label: { en: 'Recipe change', ar: 'تغيير وصفة' },
    desc: { en: 'Changing a live product’s formulation', ar: 'تعديل تركيبة منتج قائم' },
    autoBelowMinor: null,
    approverRoles: ['chef', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'shelf_life',
    label: { en: 'Shelf life exception', ar: 'استثناء عمر افتراضي' },
    desc: { en: 'Giving a batch a shelf life other than its product’s', ar: 'منح دفعة عمرًا افتراضيًا مخالفًا لعمر منتجها' },
    autoBelowMinor: null,
    approverRoles: ['chef'],
    dualAboveMinor: null,
    requiresReason: true,
    valueless: true,
  },
  {
    kind: 'batch_disposition',
    label: { en: 'Rejected batch disposition', ar: 'مصير دفعة مرفوضة' },
    desc: { en: 'Rework, downgrade or write off a rejected batch', ar: 'إعادة تشغيل أو تنزيل درجة أو هدر دفعة مرفوضة' },
    autoBelowMinor: null,
    approverRoles: ['chef', 'finance_mgr'],
    dualAboveMinor: 1000000, // ﷼ 10,000 of batch value → owner co-signs
    requiresReason: true,
  },
  {
    kind: 'yield_variance',
    label: { en: 'Yield variance', ar: 'فرق عائد' },
    desc: { en: 'Confirming actual consumption against the recipe', ar: 'تأكيد المستهلك الفعلي مقابل الوصفة' },
    autoBelowMinor: 100000, // ﷼ 1,000 of extra draw passes as ordinary processing loss
    approverRoles: ['chef', 'finance_mgr'],
    dualAboveMinor: null,
    requiresReason: true,
  },
]

export const policyOf = (kind: DecisionKind): DecisionPolicy => decisionPolicies.find((p) => p.kind === kind)!

/** What the owner may change about a chain without touching code. */
export interface PolicyOverride {
  enabled?: boolean
  autoBelowMinor?: number | null
  dualAboveMinor?: number | null
}
/** The chain as it actually stands: its shipped defaults with the owner's edits on top. */
export function withOverride(base: DecisionPolicy, o?: PolicyOverride): DecisionPolicy {
  if (!o) return { ...base, enabled: base.enabled ?? true }
  return {
    ...base,
    enabled: o.enabled ?? base.enabled ?? true,
    autoBelowMinor: o.autoBelowMinor !== undefined ? o.autoBelowMinor : base.autoBelowMinor,
    dualAboveMinor: o.dualAboveMinor !== undefined ? o.dualAboveMinor : base.dualAboveMinor,
  }
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
export function roleMayApprove(role: JobRole | undefined, p: DecisionPolicy, amountMinor = 0): boolean {
  const def = jobRoleOf(role)
  if (!def || !def.approves.includes(p.kind)) return false
  if (def.ceilingMinor == null) return true
  if (p.valueless) return true
  return Math.abs(amountMinor) <= def.ceilingMinor
}
