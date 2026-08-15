import type { Bilingual } from './types'
import type { CostCenterKind } from './costCenters'

// ── Chart of accounts (دليل الحسابات) — isolated.
//
// The single spine of the accounting system. Every posting in the book names two or
// more of these accounts, and every financial statement is nothing but a reading of
// their balances. The numbering follows the ordinary Saudi/IFRS grouping:
//
//   1 أصول · 2 خصوم · 3 حقوق ملكية · 4 إيرادات · 5 تكاليف ومصروفات
//
// Header accounts (1000, 1100 …) exist to group and total; only `postable` accounts
// may carry a journal line. Control accounts (1200 receivables, 2100 payables) are
// owned by their subledger: their balance must always equal the sum of the aging
// they summarise, which `scripts/verify-accounting.mjs` asserts.

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type NormalBalance = 'debit' | 'credit'

export interface Account {
  /** Accounting code — what the entry is filed under, and the sort key of every report. */
  code: string
  name: Bilingual
  type: AccountType
  /** Which side increases this account. */
  normal: NormalBalance
  /** Parent header account, absent on the five roots. */
  parent?: string
  /** Header accounts group and total; only postable accounts may carry a journal line. */
  postable: boolean
  active: boolean
  /** Summarises a subledger — its balance must equal that subledger's total. */
  isControl?: boolean
  /** Sits inside its group but carries the opposite sign (accumulated depreciation, sales returns). */
  contra?: boolean
  /** Part of cash & equivalents — what the cash-flow statement measures the movement of. */
  cash?: boolean
  /** Role in the VAT return. */
  vatRole?: 'input' | 'output' | 'payable'
}

/** The statutory VAT rate, as a percentage. Kept here because the return is built from these accounts. */
export const VAT_RATE = 15

/** Split a VAT-inclusive amount into its net and its tax, without ever losing a halala. */
export function splitVatInclusive(grossMinor: number): { netMinor: number; vatMinor: number } {
  const netMinor = Math.round((grossMinor * 100) / (100 + VAT_RATE))
  return { netMinor, vatMinor: grossMinor - netMinor }
}

/** VAT charged on top of a net amount. */
export const vatOn = (netMinor: number): number => Math.round((netMinor * VAT_RATE) / 100)

/**
 * Named anchors for the accounts the posting rules reach for. Automatic postings name
 * these, never a bare string, so renumbering the chart is a one-line change here.
 */
export const ACC = {
  cash: '1110',
  bank: '1120',
  receivables: '1200',
  vatInput: '1250',
  rawInventory: '1310',
  finishedInventory: '1330',
  packagingInventory: '1340',
  equipment: '1410',
  vehicles: '1420',
  fixtures: '1430',
  accumDepreciation: '1490',
  payables: '2100',
  vatOutput: '2150',
  vatPayable: '2160',
  accrued: '2200',
  customerAdvances: '2300',
  capital: '3100',
  retained: '3200',
  incomeSummary: '3900',
  salesRetail: '4100',
  salesWholesale: '4200',
  salesExport: '4300',
  salesShipping: '4400',
  salesReturns: '4900',
  cogs: '5100',
  waste: '5200',
  salaries: '5310',
  rent: '5320',
  freight: '5330',
  marketing: '5340',
  bankFees: '5350',
  admin: '5360',
  quality: '5370',
  customs: '5380',
  depreciation: '5900',
} as const

const A = (
  code: string,
  en: string,
  ar: string,
  type: AccountType,
  normal: NormalBalance,
  parent: string | undefined,
  postable: boolean,
  extra: Partial<Account> = {},
): Account => ({ code, name: { en, ar }, type, normal, parent, postable, active: true, ...extra })

/** The seeded chart. Postable leaves hang off header accounts that only ever total. */
export const chartOfAccounts: Account[] = [
  /* ── 1 · الأصول ───────────────────────────────────────────────────────── */
  A('1000', 'Assets', 'الأصول', 'asset', 'debit', undefined, false),
  A('1100', 'Cash & equivalents', 'النقد وما في حكمه', 'asset', 'debit', '1000', false),
  A('1110', 'Cash on hand', 'الصندوق', 'asset', 'debit', '1100', true, { cash: true }),
  A('1120', 'Bank — current account', 'البنك — الحساب الجاري', 'asset', 'debit', '1100', true, { cash: true }),
  A('1200', 'Trade receivables', 'الذمم المدينة التجارية', 'asset', 'debit', '1000', true, { isControl: true }),
  A('1250', 'VAT — input tax', 'ضريبة القيمة المضافة — مدخلات', 'asset', 'debit', '1000', true, { vatRole: 'input' }),
  A('1300', 'Inventory', 'المخزون', 'asset', 'debit', '1000', false),
  A('1310', 'Raw materials', 'مخزون المواد الخام', 'asset', 'debit', '1300', true),
  A('1330', 'Finished goods', 'مخزون البضاعة التامة', 'asset', 'debit', '1300', true),
  A('1340', 'Packaging materials', 'مخزون مواد التغليف', 'asset', 'debit', '1300', true),
  A('1400', 'Property, plant & equipment', 'الأصول الثابتة', 'asset', 'debit', '1000', false),
  A('1410', 'Production equipment', 'معدات الإنتاج', 'asset', 'debit', '1400', true),
  A('1420', 'Cold-chain vehicles', 'المركبات المبرّدة', 'asset', 'debit', '1400', true),
  A('1430', 'Fixtures & fittings', 'الأثاث والتجهيزات', 'asset', 'debit', '1400', true),
  A('1490', 'Accumulated depreciation', 'مجمع الإهلاك', 'asset', 'credit', '1400', true, { contra: true }),

  /* ── 2 · الخصوم ───────────────────────────────────────────────────────── */
  A('2000', 'Liabilities', 'الخصوم', 'liability', 'credit', undefined, false),
  A('2100', 'Trade payables', 'الذمم الدائنة التجارية', 'liability', 'credit', '2000', true, { isControl: true }),
  A('2150', 'VAT — output tax', 'ضريبة القيمة المضافة — مخرجات', 'liability', 'credit', '2000', true, { vatRole: 'output' }),
  A('2160', 'VAT payable to ZATCA', 'ضريبة القيمة المضافة المستحقة للهيئة', 'liability', 'credit', '2000', true, { vatRole: 'payable' }),
  A('2200', 'Accrued expenses', 'مصروفات مستحقة', 'liability', 'credit', '2000', true),
  A('2300', 'Customer advances', 'دفعات مقدمة من العملاء', 'liability', 'credit', '2000', true),

  /* ── 3 · حقوق الملكية ─────────────────────────────────────────────────── */
  A('3000', 'Equity', 'حقوق الملكية', 'equity', 'credit', undefined, false),
  A('3100', 'Share capital', 'رأس المال', 'equity', 'credit', '3000', true),
  A('3200', 'Retained earnings', 'الأرباح المبقاة', 'equity', 'credit', '3000', true),
  A('3900', 'Income summary', 'ملخص الدخل', 'equity', 'credit', '3000', true),

  /* ── 4 · الإيرادات ────────────────────────────────────────────────────── */
  A('4000', 'Revenue', 'الإيرادات', 'revenue', 'credit', undefined, false),
  A('4100', 'Retail sales — B2C', 'مبيعات التجزئة — B2C', 'revenue', 'credit', '4000', true),
  A('4200', 'Wholesale sales — B2B', 'مبيعات الجملة — B2B', 'revenue', 'credit', '4000', true),
  A('4300', 'Export sales — MEGA', 'مبيعات التصدير — MEGA', 'revenue', 'credit', '4000', true),
  A('4400', 'Shipping revenue', 'إيراد الشحن', 'revenue', 'credit', '4000', true),
  A('4900', 'Sales returns & discounts', 'مردودات وخصومات المبيعات', 'revenue', 'debit', '4000', true, { contra: true }),

  /* ── 5 · التكاليف والمصروفات ──────────────────────────────────────────── */
  A('5000', 'Costs & expenses', 'التكاليف والمصروفات', 'expense', 'debit', undefined, false),
  A('5100', 'Cost of goods sold', 'تكلفة البضاعة المباعة', 'expense', 'debit', '5000', true),
  A('5200', 'Waste & write-offs', 'الهدر والإتلاف', 'expense', 'debit', '5000', true),
  A('5300', 'Operating expenses', 'المصروفات التشغيلية', 'expense', 'debit', '5000', false),
  A('5310', 'Salaries & wages', 'الرواتب والأجور', 'expense', 'debit', '5300', true),
  A('5320', 'Rent', 'الإيجارات', 'expense', 'debit', '5300', true),
  A('5330', 'Freight & distribution', 'الشحن والتوزيع', 'expense', 'debit', '5300', true),
  A('5340', 'Marketing & brand', 'التسويق والعلامة', 'expense', 'debit', '5300', true),
  A('5350', 'Bank & card fees', 'الرسوم البنكية والشبكة', 'expense', 'debit', '5300', true),
  A('5360', 'Administrative expenses', 'المصروفات الإدارية', 'expense', 'debit', '5300', true),
  A('5370', 'Quality & inspection', 'الجودة والفحص', 'expense', 'debit', '5300', true),
  A('5380', 'Customs & export documentation', 'الجمارك ومستندات التصدير', 'expense', 'debit', '5300', true),
  A('5900', 'Depreciation', 'الإهلاك', 'expense', 'debit', '5000', true),
]

/**
 * Where a cost centre's absorbed load lands in the books when no process names its
 * own account. Every centre kind has a natural expense home, so a centre created in
 * the console posts correctly with no accounting setup at all.
 */
export const centerKindAccount: Record<CostCenterKind, string> = {
  production: ACC.cogs,
  packaging: ACC.cogs,
  logistics: ACC.freight,
  retail: ACC.bankFees,
  export: ACC.customs,
  marketing: ACC.marketing,
  admin: ACC.admin,
  quality: ACC.quality,
}

/* ── lookups ──────────────────────────────────────────────────────────────── */

export const accountOf = (accounts: Account[], code: string): Account | undefined =>
  accounts.find((a) => a.code === code)

/** Direct children of a header account, in code order. */
export const childrenOf = (accounts: Account[], code: string): Account[] =>
  accounts.filter((a) => a.parent === code)

/** The five roots, in statement order. */
export const rootAccounts = (accounts: Account[]): Account[] => accounts.filter((a) => !a.parent)

/** Every postable descendant of an account — itself included when it is a leaf. */
export function leavesOf(accounts: Account[], code: string): Account[] {
  const acc = accountOf(accounts, code)
  if (!acc) return []
  if (acc.postable) return [acc]
  return childrenOf(accounts, code).flatMap((c) => leavesOf(accounts, c.code))
}
