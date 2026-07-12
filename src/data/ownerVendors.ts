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
  // profile & verification data (filled in during onboarding)
  contact?: Bilingual
  phone?: string
  crNumber?: string // commercial registration
  vatNumber?: string
  address?: Bilingual
  since?: Bilingual // partner since
}

export const ownerVendors: OwnerVendor[] = [
  { id: 'V-01', name: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, type: { en: 'Hospitality', ar: 'ضيافة' }, outstandingMinor: 8960000, limitMinor: 15000000, status: 'active', email: 'finance@najd-hg.sa', contact: { en: 'Faisal Al-Otaibi', ar: 'فيصل العتيبي' }, phone: '+966 55 214 8890', crNumber: '1010584312', vatNumber: '300458712400003', address: { en: 'King Fahd Rd, Riyadh 12271', ar: 'طريق الملك فهد، الرياض ١٢٢٧١' }, since: { en: 'Mar 2024', ar: 'مارس ٢٠٢٤' } },
  { id: 'V-02', name: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, type: { en: 'Hospitality', ar: 'ضيافة' }, outstandingMinor: 11600000, limitMinor: 30000000, status: 'active', email: 'purchasing@jgh.sa', contact: { en: 'Reem Baeshen', ar: 'ريم باعشن' }, phone: '+966 54 903 2217', crNumber: '4030177845', vatNumber: '310079215800003', address: { en: 'Corniche Rd, Jeddah 23412', ar: 'طريق الكورنيش، جدة ٢٣٤١٢' }, since: { en: 'Jan 2024', ar: 'يناير ٢٠٢٤' } },
  { id: 'V-03', name: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, type: { en: 'Retail chain', ar: 'سلسلة تجزئة' }, outstandingMinor: 26400000, limitMinor: 25000000, status: 'active', email: 'supply@aldana.sa', contact: { en: 'Mansour Al-Harbi', ar: 'منصور الحربي' }, phone: '+966 50 671 4453', crNumber: '2050091236', vatNumber: '302214598700003', address: { en: 'Prince Sultan St, Dammam 32241', ar: 'شارع الأمير سلطان، الدمام ٣٢٢٤١' }, since: { en: 'Sep 2024', ar: 'سبتمبر ٢٠٢٤' } },
  { id: 'V-04', name: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, type: { en: 'Restaurants', ar: 'مطاعم' }, outstandingMinor: 4200000, limitMinor: 6000000, status: 'active', email: 'ops@altazaj.sa', contact: { en: 'Khalid Fakieh', ar: 'خالد فقيه' }, phone: '+966 56 118 7702', crNumber: '4030022917', vatNumber: '300871345600003', address: { en: 'Al-Tahlia St, Jeddah 23321', ar: 'شارع التحلية، جدة ٢٣٣٢١' }, since: { en: 'Nov 2024', ar: 'نوفمبر ٢٠٢٤' } },
  { id: 'V-05', name: { en: 'Rawabi Catering Co.', ar: 'شركة روابي للتموين' }, type: { en: 'Reseller', ar: 'موزّع' }, outstandingMinor: 900000, limitMinor: 5000000, status: 'pending', email: 'accounts@rawabi.sa', stage: 1, contact: { en: 'Sara Al-Dossari', ar: 'سارة الدوسري' }, phone: '+966 53 442 9018' },
  { id: 'V-06', name: { en: 'Al-Murjan Sweets', ar: 'حلويات المرجان' }, type: { en: 'Retail chain', ar: 'سلسلة تجزئة' }, outstandingMinor: 0, limitMinor: 0, status: 'invited', email: 'buy@murjan.sa' },
  { id: 'V-07', name: { en: 'Basmah Gifting Co.', ar: 'شركة بسمة للهدايا' }, type: { en: 'Corporate gifting', ar: 'هدايا شركات' }, outstandingMinor: 0, limitMinor: 0, status: 'pending', email: 'hello@basmah.sa', stage: 3, contact: { en: 'Nouf Al-Shehri', ar: 'نوف الشهري' }, phone: '+966 59 320 6641', crNumber: '1010773204', vatNumber: '311542880900003', address: { en: 'Olaya St, Riyadh 12213', ar: 'شارع العليا، الرياض ١٢٢١٣' } },
]

// ── Vendor documents (contract + verification papers). Seeded for accounts
// that already passed the relevant onboarding stage; the owner attaches or
// replaces files from the vendor profile.
export type VendorDocKind = 'contract' | 'cr' | 'vat'
export const vendorDocMeta: Record<VendorDocKind, { label: Bilingual; desc: Bilingual }> = {
  contract: { label: { en: 'Signed contract', ar: 'العقد الموقّع' }, desc: { en: 'Commercial terms signed by both parties', ar: 'الشروط التجارية بتوقيع الطرفين' } },
  cr: { label: { en: 'Commercial registration', ar: 'السجل التجاري' }, desc: { en: 'CR certificate from the Ministry of Commerce', ar: 'شهادة السجل من وزارة التجارة' } },
  vat: { label: { en: 'VAT certificate', ar: 'شهادة التسجيل الضريبي' }, desc: { en: 'ZATCA VAT registration certificate', ar: 'شهادة التسجيل في ضريبة القيمة المضافة (زاتكا)' } },
}
export const vendorDocsSeed: Record<string, Partial<Record<VendorDocKind, string>>> = {
  'V-01': { contract: 'JAZ-V01-contract-2024.pdf', cr: 'najd-cr-1010584312.pdf', vat: 'najd-vat-cert.pdf' },
  'V-02': { contract: 'JAZ-V02-contract-2024.pdf', cr: 'jgh-cr-4030177845.pdf', vat: 'jgh-vat-cert.pdf' },
  'V-03': { contract: 'JAZ-V03-contract-2024.pdf', cr: 'aldana-cr-2050091236.pdf', vat: 'aldana-vat-cert.pdf' },
  'V-04': { contract: 'JAZ-V04-contract-2024.pdf', cr: 'altazaj-cr-4030022917.pdf', vat: 'altazaj-vat-cert.pdf' },
  // V-07 is at the contract-signing stage: papers are in, the contract isn't signed yet.
  'V-07': { cr: 'basmah-cr-1010773204.pdf', vat: 'basmah-vat-cert.pdf' },
}

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
