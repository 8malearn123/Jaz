import type { Bilingual } from './types'

// ── Owner vendor credit accounts + export clients (isolated). Credit-limit edits
// are LOCAL overlay only — never written back to organization.credit / OrgSummary.

export interface OwnerVendor {
  id: string
  name: Bilingual
  type: Bilingual
  outstandingMinor: number
  limitMinor: number
  status: 'active' | 'pending' | 'invited'
  email?: string
}

export const ownerVendors: OwnerVendor[] = [
  { id: 'V-01', name: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, type: { en: 'Hospitality', ar: 'ضيافة' }, outstandingMinor: 8960000, limitMinor: 15000000, status: 'active' },
  { id: 'V-02', name: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, type: { en: 'Hospitality', ar: 'ضيافة' }, outstandingMinor: 11600000, limitMinor: 30000000, status: 'active' },
  { id: 'V-03', name: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, type: { en: 'Retail chain', ar: 'سلسلة تجزئة' }, outstandingMinor: 26400000, limitMinor: 25000000, status: 'active' },
  { id: 'V-04', name: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, type: { en: 'Restaurants', ar: 'مطاعم' }, outstandingMinor: 4200000, limitMinor: 6000000, status: 'active' },
  { id: 'V-05', name: { en: 'Rawabi Catering Co.', ar: 'شركة روابي للتموين' }, type: { en: 'Reseller', ar: 'موزّع' }, outstandingMinor: 900000, limitMinor: 5000000, status: 'pending', email: 'accounts@rawabi.sa' },
  { id: 'V-06', name: { en: 'Al-Murjan Sweets', ar: 'حلويات المرجان' }, type: { en: 'Retail chain', ar: 'سلسلة تجزئة' }, outstandingMinor: 0, limitMinor: 0, status: 'invited', email: 'buy@murjan.sa' },
]

export type PoPayStatus = 'paid' | 'net' | 'overdue' | 'preparing'
export interface VendorPo { id: string; date: Bilingual; amountMinor: number; status: PoPayStatus }
export const poByVendor: Record<string, VendorPo[]> = {
  'V-01': [
    { id: 'PO-8841', date: { en: '02 Jul', ar: '٠٢ يوليو' }, amountMinor: 2016000, status: 'net' },
    { id: 'PO-8790', date: { en: '24 Jun', ar: '٢٤ يونيو' }, amountMinor: 4185000, status: 'paid' },
    { id: 'PO-8722', date: { en: '12 Jun', ar: '١٢ يونيو' }, amountMinor: 1760000, status: 'overdue' },
  ],
  'V-02': [
    { id: 'PO-8838', date: { en: '01 Jul', ar: '٠١ يوليو' }, amountMinor: 6400000, status: 'preparing' },
    { id: 'PO-8801', date: { en: '26 Jun', ar: '٢٦ يونيو' }, amountMinor: 5200000, status: 'net' },
  ],
  'V-03': [
    { id: 'PO-8845', date: { en: '05 Jul', ar: '٠٥ يوليو' }, amountMinor: 19840000, status: 'net' },
    { id: 'PO-8700', date: { en: '10 Jun', ar: '١٠ يونيو' }, amountMinor: 6560000, status: 'overdue' },
  ],
  'V-04': [{ id: 'PO-8799', date: { en: '02 Jul', ar: '٠٢ يوليو' }, amountMinor: 3150000, status: 'paid' }],
  'V-05': [{ id: 'PO-8850', date: { en: '06 Jul', ar: '٠٦ يوليو' }, amountMinor: 900000, status: 'preparing' }],
}

export interface CreditRule { title: Bilingual; detail: Bilingual }
export const creditRules: CreditRule[] = [
  { title: { en: 'Limit calculation', ar: 'احتساب الحد' }, detail: { en: '3× average monthly volume, capped by risk rating', ar: '٣× متوسط الحجم الشهري، مقيّدًا بتصنيف المخاطر' } },
  { title: { en: 'Usage thresholds', ar: 'عتبات الاستخدام' }, detail: { en: 'Alert at 85%, block new orders at 100%', ar: 'تنبيه عند ٨٥٪، إيقاف الطلبات عند ١٠٠٪' } },
  { title: { en: 'Quarterly review', ar: 'مراجعة ربع سنوية' }, detail: { en: 'Limits re-evaluated against payment history', ar: 'تُراجَع الحدود مقابل سجل السداد' } },
  { title: { en: 'Escalation to owner', ar: 'التصعيد للمالك' }, detail: { en: 'Increases above ﷼ 200,000 need owner approval', ar: 'الزيادات فوق ٢٠٠٬٠٠٠ ﷼ تتطلب اعتماد المالك' } },
]

export interface ApprovalStage { label: Bilingual; done: boolean; current?: boolean }
export const approvalStages: ApprovalStage[] = [
  { label: { en: 'Account request', ar: 'طلب فتح حساب' }, done: true },
  { label: { en: 'Document audit', ar: 'تدقيق المستندات' }, done: true },
  { label: { en: 'Credit evaluation', ar: 'تقييم الائتمان' }, done: true },
  { label: { en: 'Sales approval', ar: 'اعتماد المبيعات' }, done: false, current: true },
  { label: { en: 'Owner approval', ar: 'اعتماد المالك' }, done: false },
  { label: { en: 'Active', ar: 'مفعّل' }, done: false },
]
