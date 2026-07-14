import type { Bilingual } from './types'

// ── Monthly vendor statements of account ──
// One statement per credit partner is issued automatically on the 1st of every
// month. Flow: accountant reviews & approves → sent to the partner → the
// partner approves it back. Seeds cover the last three months.

export type StatementStatus = 'review' | 'sent' | 'confirmed'

export interface VendorStatement {
  id: string
  vendorId: string
  vendor: Bilingual
  month: string // filter key, e.g. '2026-07'
  monthLabel: Bilingual
  issuedOn: Bilingual // always the 1st of the month
  openingMinor: number
  chargesMinor: number // purchases during the month
  paymentsMinor: number
  closingMinor: number
  status: StatementStatus
  accountantAt?: Bilingual // when the accountant approved & sent
  partnerAt?: Bilingual // when the partner approved
}

export const statementMonths: { key: string; label: Bilingual }[] = [
  { key: '2026-07', label: { en: 'July 2026', ar: 'يوليو ٢٠٢٦' } },
  { key: '2026-06', label: { en: 'June 2026', ar: 'يونيو ٢٠٢٦' } },
  { key: '2026-05', label: { en: 'May 2026', ar: 'مايو ٢٠٢٦' } },
]

const M = statementMonths
const V = {
  v1: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' },
  v2: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' },
  v3: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' },
  v4: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' },
}

export const vendorStatementsSeed: VendorStatement[] = [
  // ── July 2026 — freshly issued on 01 Jul, awaiting the accountant ──
  { id: 'ST-2607-V01', vendorId: 'V-01', vendor: V.v1, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, openingMinor: 7240000, chargesMinor: 6201000, paymentsMinor: 4481000, closingMinor: 8960000, status: 'review' },
  { id: 'ST-2607-V02', vendorId: 'V-02', vendor: V.v2, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, openingMinor: 9400000, chargesMinor: 11600000, paymentsMinor: 9400000, closingMinor: 11600000, status: 'review' },
  { id: 'ST-2607-V03', vendorId: 'V-03', vendor: V.v3, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, openingMinor: 19840000, chargesMinor: 26400000, paymentsMinor: 19840000, closingMinor: 26400000, status: 'review' },
  { id: 'ST-2607-V04', vendorId: 'V-04', vendor: V.v4, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, openingMinor: 3150000, chargesMinor: 4200000, paymentsMinor: 3150000, closingMinor: 4200000, status: 'review' },
  // ── June 2026 — approved by the accountant; two still await the partner ──
  { id: 'ST-2606-V01', vendorId: 'V-01', vendor: V.v1, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, openingMinor: 6180000, chargesMinor: 5540000, paymentsMinor: 4480000, closingMinor: 7240000, status: 'sent', accountantAt: { en: '02 Jun', ar: '٠٢ يونيو' } },
  { id: 'ST-2606-V02', vendorId: 'V-02', vendor: V.v2, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, openingMinor: 8150000, chargesMinor: 9400000, paymentsMinor: 8150000, closingMinor: 9400000, status: 'confirmed', accountantAt: { en: '02 Jun', ar: '٠٢ يونيو' }, partnerAt: { en: '05 Jun', ar: '٠٥ يونيو' } },
  { id: 'ST-2606-V03', vendorId: 'V-03', vendor: V.v3, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, openingMinor: 14200000, chargesMinor: 19840000, paymentsMinor: 14200000, closingMinor: 19840000, status: 'sent', accountantAt: { en: '03 Jun', ar: '٠٣ يونيو' } },
  { id: 'ST-2606-V04', vendorId: 'V-04', vendor: V.v4, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, openingMinor: 2760000, chargesMinor: 3150000, paymentsMinor: 2760000, closingMinor: 3150000, status: 'confirmed', accountantAt: { en: '02 Jun', ar: '٠٢ يونيو' }, partnerAt: { en: '04 Jun', ar: '٠٤ يونيو' } },
  // ── May 2026 — fully reconciled ──
  { id: 'ST-2605-V01', vendorId: 'V-01', vendor: V.v1, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, openingMinor: 5320000, chargesMinor: 4860000, paymentsMinor: 4000000, closingMinor: 6180000, status: 'confirmed', accountantAt: { en: '02 May', ar: '٠٢ مايو' }, partnerAt: { en: '06 May', ar: '٠٦ مايو' } },
  { id: 'ST-2605-V02', vendorId: 'V-02', vendor: V.v2, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, openingMinor: 7000000, chargesMinor: 8150000, paymentsMinor: 7000000, closingMinor: 8150000, status: 'confirmed', accountantAt: { en: '01 May', ar: '٠١ مايو' }, partnerAt: { en: '03 May', ar: '٠٣ مايو' } },
  { id: 'ST-2605-V03', vendorId: 'V-03', vendor: V.v3, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, openingMinor: 12000000, chargesMinor: 14200000, paymentsMinor: 12000000, closingMinor: 14200000, status: 'confirmed', accountantAt: { en: '02 May', ar: '٠٢ مايو' }, partnerAt: { en: '05 May', ar: '٠٥ مايو' } },
  { id: 'ST-2605-V04', vendorId: 'V-04', vendor: V.v4, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, openingMinor: 2300000, chargesMinor: 2760000, paymentsMinor: 2300000, closingMinor: 2760000, status: 'confirmed', accountantAt: { en: '01 May', ar: '٠١ مايو' }, partnerAt: { en: '02 May', ar: '٠٢ مايو' } },
]
