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

export const employeesSeed: Employee[] = [
  { id: 'E-01', name: { en: 'Salem Al-Ghamdi', ar: 'سالم الغامدي' }, title: { en: 'Warehouse keeper', ar: 'أمين المستودع' }, phone: '+966 55 210 4471', email: 'salem@jaz.sa', perms: ['raw', 'purchases', 'waste', 'reports'], active: true, since: { en: 'Mar 2024', ar: 'مارس ٢٠٢٤' } },
  { id: 'E-02', name: { en: 'Hind Al-Asiri', ar: 'هند العسيري' }, title: { en: 'Production supervisor', ar: 'مشرفة الإنتاج' }, phone: '+966 50 883 9024', email: 'hind@jaz.sa', perms: ['production', 'raw', 'waste', 'reports'], active: true, since: { en: 'Jan 2023', ar: 'يناير ٢٠٢٣' } },
  { id: 'E-03', name: { en: 'Majed Al-Shehri', ar: 'ماجد الشهري' }, title: { en: 'B2B sales', ar: 'مبيعات الشركات' }, phone: '+966 54 662 7315', email: 'majed@jaz.sa', perms: ['orders', 'customers'], active: true, since: { en: 'Sep 2024', ar: 'سبتمبر ٢٠٢٤' } },
  { id: 'E-04', name: { en: 'Noura Al-Zahrani', ar: 'نورة الزهراني' }, title: { en: 'Accountant', ar: 'محاسبة' }, phone: '+966 56 447 1180', email: 'noura@jaz.sa', perms: ['finance', 'purchases', 'reports'], active: false, since: { en: 'Jun 2025', ar: 'يونيو ٢٠٢٥' } },
]
