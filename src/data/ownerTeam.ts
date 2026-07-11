import type { Bilingual } from './types'

// ── Owner team & staff (isolated). Employees with per-section permissions the
// owner grants/revokes — mirrors the operational areas of the admin console.

export type TeamPermission =
  | 'orders' | 'purchases' | 'raw' | 'production' | 'waste'
  | 'products' | 'customers' | 'suppliers' | 'finance' | 'reports'

export interface TeamPermDef { key: TeamPermission; label: Bilingual; desc: Bilingual }
export const teamPermissions: TeamPermDef[] = [
  { key: 'orders', label: { en: 'Orders', ar: 'الطلبات' }, desc: { en: 'View & advance customer orders', ar: 'عرض طلبات العملاء وتقديمها' } },
  { key: 'purchases', label: { en: 'Purchases', ar: 'المشتريات' }, desc: { en: 'Enter supplier invoices', ar: 'إدخال فواتير الموردين' } },
  { key: 'raw', label: { en: 'Raw stock', ar: 'المخزون الخام' }, desc: { en: 'Stock balances & stock-takes', ar: 'أرصدة المخزون والجرد' } },
  { key: 'production', label: { en: 'Production', ar: 'الإنتاج' }, desc: { en: 'Production batches & finished goods', ar: 'دفعات الإنتاج والمواد المصنعة' } },
  { key: 'waste', label: { en: 'Waste', ar: 'الهدر' }, desc: { en: 'Record justified write-offs', ar: 'تسجيل الهدر بمبرراته' } },
  { key: 'products', label: { en: 'Products', ar: 'المنتجات' }, desc: { en: 'Products, variants & pricing', ar: 'المنتجات والأصناف والتسعير' } },
  { key: 'customers', label: { en: 'Customers', ar: 'العملاء' }, desc: { en: 'Customers & loyalty', ar: 'العملاء والولاء' } },
  { key: 'suppliers', label: { en: 'Suppliers', ar: 'الموردون' }, desc: { en: 'Suppliers directory', ar: 'دليل الموردين' } },
  { key: 'finance', label: { en: 'Finance', ar: 'المالية' }, desc: { en: 'P&L, costs & collection', ar: 'الأرباح والتكاليف والتحصيل' } },
  { key: 'reports', label: { en: 'Reports', ar: 'التقارير' }, desc: { en: 'Stock-take reports & printing', ar: 'تقارير الجرد والطباعة' } },
]

export interface Employee {
  id: string
  name: Bilingual
  title: Bilingual
  phone: string
  email: string
  perms: TeamPermission[]
  active: boolean
  since: Bilingual
}

// No pre-seeded accounts — the owner creates every staff account from the
// Team & staff section, and each one becomes a sign-in card on the role picker.
