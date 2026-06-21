import type { Organization } from './types'

// Illustrative B2B account used by the business portal & the credit-checkout flow.
export const organization: Organization = {
  id: 'org-najd-hospitality',
  legalName: { en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' },
  accountType: { en: 'Hospitality', ar: 'ضيافة' },
  crNumber: '1010256744',
  vatNumber: '300012345600003',
  tier: 'gold',
  salesRep: { en: 'Khalid Al-Otaibi', ar: 'خالد العتيبي' },
  credit: {
    limitMinor: 15000000, // SAR 150,000
    reservedMinor: 2840000, // SAR 28,400
    outstandingMinor: 6120000, // SAR 61,200
    paymentTerms: 'net_30',
    riskRating: 'low',
    nextReview: '2026-09-01',
  },
  ledger: [
    {
      id: 'tx-1',
      type: 'payment',
      amountMinor: 4200000,
      balanceAfterMinor: 6020000,
      reference: { en: 'Settlement — Invoice JAZ-2026-000981', ar: 'سداد — فاتورة JAZ-2026-000981' },
      occurredAt: '2026-06-12',
    },
    {
      id: 'tx-2',
      type: 'charge',
      amountMinor: 3180000,
      balanceAfterMinor: 10220000,
      reference: { en: 'Invoice JAZ-2026-001140 · Net 30', ar: 'فاتورة JAZ-2026-001140 · صافي ٣٠' },
      occurredAt: '2026-06-09',
    },
    {
      id: 'tx-3',
      type: 'reservation',
      amountMinor: 2840000,
      balanceAfterMinor: 7040000,
      reference: { en: 'Order JAZ-2026-001188 · awaiting fulfilment', ar: 'طلب JAZ-2026-001188 · بانتظار التجهيز' },
      occurredAt: '2026-06-18',
    },
    {
      id: 'tx-4',
      type: 'release',
      amountMinor: 900000,
      balanceAfterMinor: 7940000,
      reference: { en: 'Cancelled line · Order JAZ-2026-001150', ar: 'بند ملغى · طلب JAZ-2026-001150' },
      occurredAt: '2026-06-15',
    },
  ],
  statements: [
    {
      id: 'st-may',
      period: { en: 'May 2026', ar: 'مايو ٢٠٢٦' },
      openingMinor: 5400000,
      chargesMinor: 7300000,
      paymentsMinor: 6580000,
      closingMinor: 6120000,
      issuedAt: '2026-06-01',
    },
    {
      id: 'st-apr',
      period: { en: 'April 2026', ar: 'أبريل ٢٠٢٦' },
      openingMinor: 4100000,
      chargesMinor: 6900000,
      paymentsMinor: 5600000,
      closingMinor: 5400000,
      issuedAt: '2026-05-01',
    },
    {
      id: 'st-mar',
      period: { en: 'March 2026', ar: 'مارس ٢٠٢٦' },
      openingMinor: 3800000,
      chargesMinor: 5200000,
      paymentsMinor: 4900000,
      closingMinor: 4100000,
      issuedAt: '2026-04-01',
    },
  ],
}

export function availableCreditMinor(org: Organization): number {
  return org.credit.limitMinor - org.credit.reservedMinor - org.credit.outstandingMinor
}
