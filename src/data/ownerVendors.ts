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
  stage?: number // index into onboardingStages — the step currently in progress (pending accounts only)
}

export const ownerVendors: OwnerVendor[] = [
  { id: 'V-01', name: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, type: { en: 'Hospitality', ar: 'ضيافة' }, outstandingMinor: 8960000, limitMinor: 15000000, status: 'active' },
  { id: 'V-02', name: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, type: { en: 'Hospitality', ar: 'ضيافة' }, outstandingMinor: 11600000, limitMinor: 30000000, status: 'active' },
  { id: 'V-03', name: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, type: { en: 'Retail chain', ar: 'سلسلة تجزئة' }, outstandingMinor: 26400000, limitMinor: 25000000, status: 'active' },
  { id: 'V-04', name: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, type: { en: 'Restaurants', ar: 'مطاعم' }, outstandingMinor: 4200000, limitMinor: 6000000, status: 'active' },
  { id: 'V-05', name: { en: 'Rawabi Catering Co.', ar: 'شركة روابي للتموين' }, type: { en: 'Reseller', ar: 'موزّع' }, outstandingMinor: 900000, limitMinor: 5000000, status: 'pending', email: 'accounts@rawabi.sa', stage: 1 },
  { id: 'V-06', name: { en: 'Al-Murjan Sweets', ar: 'حلويات المرجان' }, type: { en: 'Retail chain', ar: 'سلسلة تجزئة' }, outstandingMinor: 0, limitMinor: 0, status: 'invited', email: 'buy@murjan.sa' },
  { id: 'V-07', name: { en: 'Basmah Gifting Co.', ar: 'شركة بسمة للهدايا' }, type: { en: 'Corporate gifting', ar: 'هدايا شركات' }, outstandingMinor: 0, limitMinor: 0, status: 'pending', email: 'hello@basmah.sa', stage: 3 },
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

// ── B2B partner registration (SOP 3.2.1): the approval chain every join
// request walks. Permissions are only granted at the final stage.
export interface OnboardingStage { label: Bilingual; desc: Bilingual }
export const onboardingStages: OnboardingStage[] = [
  { label: { en: 'Initial account — no permissions', ar: 'إنشاء الحساب الأولي بدون صلاحيات' }, desc: { en: 'The partner registers; the account starts with no permissions', ar: 'يسجّل الشريك ويُنشأ حسابه الأولي بدون أي صلاحيات' } },
  { label: { en: 'Application form', ar: 'تعبئة النموذج' }, desc: { en: 'Business details and documents are submitted', ar: 'تعبئة بيانات المنشأة وإرفاق المستندات' } },
  { label: { en: 'Meeting', ar: 'الاجتماع' }, desc: { en: 'Introductory meeting and needs assessment', ar: 'اجتماع تعريفي وتقييم الاحتياج' } },
  { label: { en: 'Contract signing', ar: 'توقيع العقود' }, desc: { en: 'Commercial terms and contracts are signed', ar: 'توقيع الشروط التجارية والعقود' } },
  { label: { en: 'Permissions enabled', ar: 'إتاحة الصلاحيات للحساب' }, desc: { en: 'The account is activated and granted its permissions', ar: 'تفعيل الحساب وإتاحة صلاحياته وتحديد حده الائتماني' } },
]
