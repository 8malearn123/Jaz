import type { Bilingual } from './types'

// ── Cumulative vendor statements of account ──
// Each statement covers the FULL period from the start of the relationship up
// to the end of the previous month, and is issued automatically on the 1st of
// every month. Flow: accountant reviews & approves → sent to the partner →
// the partner approves it back. Seeds cover the last three issues.

export type StatementStatus = 'review' | 'sent' | 'confirmed'

export interface VendorStatement {
  id: string
  vendorId: string
  vendor: Bilingual
  month: string // issue-month filter key, e.g. '2026-07'
  monthLabel: Bilingual // issue month
  issuedOn: Bilingual // always the 1st of the month
  periodLabel: Bilingual // covered period: from account opening → end of previous month
  sinceLabel: Bilingual // when the relationship started
  chargesMinor: number // TOTAL purchases since the start of the relationship
  paymentsMinor: number // TOTAL payments since the start of the relationship
  closingMinor: number // balance at the period end (= charges − payments)
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
const PERIOD = {
  jul: { en: 'From account opening to 30 Jun 2026', ar: 'من بداية التعامل حتى ٣٠ يونيو ٢٠٢٦' },
  jun: { en: 'From account opening to 31 May 2026', ar: 'من بداية التعامل حتى ٣١ مايو ٢٠٢٦' },
  may: { en: 'From account opening to 30 Apr 2026', ar: 'من بداية التعامل حتى ٣٠ أبريل ٢٠٢٦' },
}
const V = {
  v1: { name: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' }, since: { en: 'Mar 2024', ar: 'مارس ٢٠٢٤' } },
  v2: { name: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, since: { en: 'Jan 2024', ar: 'يناير ٢٠٢٤' } },
  v3: { name: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, since: { en: 'Sep 2024', ar: 'سبتمبر ٢٠٢٤' } },
  v4: { name: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, since: { en: 'Nov 2024', ar: 'نوفمبر ٢٠٢٤' } },
}

export const vendorStatementsSeed: VendorStatement[] = [
  // ── issued 01 Jul 2026 (covers everything up to 30 Jun) — awaiting the accountant ──
  { id: 'ST-2607-V01', vendorId: 'V-01', vendor: V.v1.name, sinceLabel: V.v1.since, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, periodLabel: PERIOD.jul, chargesMinor: 129080000, paymentsMinor: 120120000, closingMinor: 8960000, status: 'review' },
  { id: 'ST-2607-V02', vendorId: 'V-02', vendor: V.v2.name, sinceLabel: V.v2.since, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, periodLabel: PERIOD.jul, chargesMinor: 117400000, paymentsMinor: 105800000, closingMinor: 11600000, status: 'review' },
  { id: 'ST-2607-V03', vendorId: 'V-03', vendor: V.v3.name, sinceLabel: V.v3.since, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, periodLabel: PERIOD.jul, chargesMinor: 130440000, paymentsMinor: 104040000, closingMinor: 26400000, status: 'review' },
  { id: 'ST-2607-V04', vendorId: 'V-04', vendor: V.v4.name, sinceLabel: V.v4.since, month: M[0].key, monthLabel: M[0].label, issuedOn: { en: '01 Jul 2026', ar: '٠١ يوليو ٢٠٢٦' }, periodLabel: PERIOD.jul, chargesMinor: 26110000, paymentsMinor: 21910000, closingMinor: 4200000, status: 'review' },
  // ── issued 01 Jun 2026 (up to 31 May) — approved; two still await the partner ──
  { id: 'ST-2606-V01', vendorId: 'V-01', vendor: V.v1.name, sinceLabel: V.v1.since, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, periodLabel: PERIOD.jun, chargesMinor: 122879000, paymentsMinor: 115639000, closingMinor: 7240000, status: 'sent', accountantAt: { en: '02 Jun', ar: '٠٢ يونيو' } },
  { id: 'ST-2606-V02', vendorId: 'V-02', vendor: V.v2.name, sinceLabel: V.v2.since, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, periodLabel: PERIOD.jun, chargesMinor: 105800000, paymentsMinor: 96400000, closingMinor: 9400000, status: 'confirmed', accountantAt: { en: '02 Jun', ar: '٠٢ يونيو' }, partnerAt: { en: '05 Jun', ar: '٠٥ يونيو' } },
  { id: 'ST-2606-V03', vendorId: 'V-03', vendor: V.v3.name, sinceLabel: V.v3.since, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, periodLabel: PERIOD.jun, chargesMinor: 104040000, paymentsMinor: 84200000, closingMinor: 19840000, status: 'sent', accountantAt: { en: '03 Jun', ar: '٠٣ يونيو' } },
  { id: 'ST-2606-V04', vendorId: 'V-04', vendor: V.v4.name, sinceLabel: V.v4.since, month: M[1].key, monthLabel: M[1].label, issuedOn: { en: '01 Jun 2026', ar: '٠١ يونيو ٢٠٢٦' }, periodLabel: PERIOD.jun, chargesMinor: 21910000, paymentsMinor: 18760000, closingMinor: 3150000, status: 'confirmed', accountantAt: { en: '02 Jun', ar: '٠٢ يونيو' }, partnerAt: { en: '04 Jun', ar: '٠٤ يونيو' } },
  // ── issued 01 May 2026 (up to 30 Apr) — fully reconciled ──
  { id: 'ST-2605-V01', vendorId: 'V-01', vendor: V.v1.name, sinceLabel: V.v1.since, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, periodLabel: PERIOD.may, chargesMinor: 117339000, paymentsMinor: 111159000, closingMinor: 6180000, status: 'confirmed', accountantAt: { en: '02 May', ar: '٠٢ مايو' }, partnerAt: { en: '06 May', ar: '٠٦ مايو' } },
  { id: 'ST-2605-V02', vendorId: 'V-02', vendor: V.v2.name, sinceLabel: V.v2.since, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, periodLabel: PERIOD.may, chargesMinor: 96400000, paymentsMinor: 88250000, closingMinor: 8150000, status: 'confirmed', accountantAt: { en: '01 May', ar: '٠١ مايو' }, partnerAt: { en: '03 May', ar: '٠٣ مايو' } },
  { id: 'ST-2605-V03', vendorId: 'V-03', vendor: V.v3.name, sinceLabel: V.v3.since, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, periodLabel: PERIOD.may, chargesMinor: 84200000, paymentsMinor: 70000000, closingMinor: 14200000, status: 'confirmed', accountantAt: { en: '02 May', ar: '٠٢ مايو' }, partnerAt: { en: '05 May', ar: '٠٥ مايو' } },
  { id: 'ST-2605-V04', vendorId: 'V-04', vendor: V.v4.name, sinceLabel: V.v4.since, month: M[2].key, monthLabel: M[2].label, issuedOn: { en: '01 May 2026', ar: '٠١ مايو ٢٠٢٦' }, periodLabel: PERIOD.may, chargesMinor: 18760000, paymentsMinor: 16000000, closingMinor: 2760000, status: 'confirmed', accountantAt: { en: '01 May', ar: '٠١ مايو' }, partnerAt: { en: '02 May', ar: '٠٢ مايو' } },
]
