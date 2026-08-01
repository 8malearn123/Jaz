import type { CountryCode } from './countries'

// ── Selling currency ────────────────────────────────────────────────────────
// What a buyer is quoted, invoiced and credit-limited in.
//
// Sales outside the Kingdom — B2B, HORECA and export alike — are transacted in
// US dollars rather than the buyer's local currency, so one export price list
// and one credit limit serve every market instead of a separate pair per country.
// Everything sold inside the Kingdom — HORECA, wholesale and retail — is in
// Saudi riyals.
//
// This is the *selling* side only. The company's own books stay in SAR: amounts
// are stored in riyal minor units throughout, and totals across accounts (net
// profit, receivables, pipeline) are riyal figures. A buyer's currency decides
// how their own figures are presented and captured, not how the company reports.
export type SellingCurrency = 'SAR' | 'USD'

// The riyal is pegged to the dollar by SAMA, so the export list converts at a
// fixed rate — a product's dollar price moves only when its riyal price does,
// and a limit set in dollars is worth the same riyals tomorrow.
export const SAR_PER_USD = 3.75

/** The currency a buyer in this country sells in. No country (retail) → home market. */
export function sellingCurrencyFor(country?: CountryCode): SellingCurrency {
  return country && country !== 'sa' ? 'USD' : 'SAR'
}

/** A stored riyal amount (minor units) expressed in the selling currency's minor units. */
export function toSelling(sarMinor: number, currency: SellingCurrency): number {
  return currency === 'USD' ? Math.round(sarMinor / SAR_PER_USD) : sarMinor
}

/** Inverse of `toSelling` — a figure captured from the buyer, stored back as riyals. */
export function fromSelling(minor: number, currency: SellingCurrency): number {
  return currency === 'USD' ? Math.round(minor * SAR_PER_USD) : minor
}
