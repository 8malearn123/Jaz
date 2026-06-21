// Domain types — a storefront-facing subset of the JAZ production data model.
// Money is stored as integer minor units (halalas), currency SAR, per the architecture doc.

export type Bilingual = { en: string; ar: string }

export type FlavorId = 'milk' | 'lavender' | 'rose' | 'jasmine' | 'papaya' | 'mango' | 'coffee' | 'dark'

export interface Flavor {
  id: FlavorId
  name: Bilingual
  /** Botanical / tasting note */
  note: Bilingual
  /** Product-layer accent (hex). Not a core UI token — applied via style. */
  accent: string
  /** Foreground that reads on the accent at full strength */
  onAccent: string
}

export type ProductType = 'bar' | 'gift_box' | 'bundle' | 'collection'
export type ProductLine = 'signature' | 'seasonal' | 'corporate_gifting' | 'limited'
export type BadgeKind = 'new' | 'bestseller' | 'limited' | 'seasonal'

export interface ProductVariant {
  id: string
  netWeightG: number
  packaging: 'standard' | 'gift' | 'bulk_case'
  caseQty?: number
  requiresColdChain: boolean
  retailPriceMinor: number
  /** Negotiated account price (gold-tier illustrative) */
  b2bPriceMinor: number
  inStock: boolean
}

export interface ArtCard {
  artworkTitle: Bilingual
  artistName: Bilingual
  year: number
  description: Bilingual
}

export interface Review {
  author: Bilingual
  rating: number
  body: Bilingual
  verified: boolean
  date: string
}

export interface Product {
  id: string
  sku: string
  slug: string
  type: ProductType
  line: ProductLine
  title: Bilingual
  flavorId: FlavorId
  cocoaPct?: number
  allergens: Bilingual[]
  ingredients: Bilingual
  story: Bilingual
  badges: BadgeKind[]
  variants: ProductVariant[]
  artCard?: ArtCard
  rating: number
  reviewCount: number
  reviews: Review[]
  /** Variant ids that pair well */
  pairsWith: string[]
  occasions: string[]
}

export interface Collection {
  id: string
  slug: string
  title: Bilingual
  kind: 'signature' | 'seasonal' | 'corporate'
  description: Bilingual
  accent: string
  priceMinor: number
  pieceCount: number
  productIds: string[]
}

// ── B2B / Credit ──────────────────────────────────────────
export interface CreditLedgerEntry {
  id: string
  type: 'reservation' | 'release' | 'charge' | 'payment' | 'adjustment'
  amountMinor: number
  balanceAfterMinor: number
  reference: Bilingual
  occurredAt: string
}

export interface CreditStatement {
  id: string
  period: Bilingual
  openingMinor: number
  chargesMinor: number
  paymentsMinor: number
  closingMinor: number
  issuedAt: string
}

export interface Organization {
  id: string
  legalName: Bilingual
  accountType: Bilingual
  crNumber: string
  vatNumber: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  salesRep: Bilingual
  credit: {
    limitMinor: number
    reservedMinor: number
    outstandingMinor: number
    paymentTerms: 'prepaid' | 'net_15' | 'net_30' | 'net_60'
    riskRating: 'low' | 'medium' | 'high'
    nextReview: string
  }
  ledger: CreditLedgerEntry[]
  statements: CreditStatement[]
}
