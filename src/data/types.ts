// Domain types — a storefront-facing subset of the JAZ production data model.
// Money is stored as integer minor units (halalas), currency SAR, per the architecture doc.
// What a given buyer is quoted and billed in is a separate matter — see data/selling.ts.
import type { CountryCode } from './countries'

export type Bilingual = { en: string; ar: string }

export type FlavorId = 'milk' | 'lavender' | 'rose' | 'jasmine' | 'papaya' | 'mango' | 'coffee' | 'dark' | 'dark60' | 'seasalt' | 'chili' | 'banana'

export interface Flavor {
  id: FlavorId
  name: Bilingual
  /** Botanical / tasting note */
  note: Bilingual
  /**
   * The client's one line for the «نكهات من أرضٍ واحدة» section of /shop. Present only
   * on the seven Jazan-rooted flavours; a flavour without one simply renders no caption.
   */
  landLine?: Bilingual
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
  year?: number
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
  /** Product ids that pair well */
  pairsWith: string[]
  occasions: string[]
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
  country?: CountryCode // where the account operates — decides its selling currency (see data/selling.ts)
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

// ── The paintings, as things that are sold ───────────────────────────────────
// A bar's ArtCard credits the work printed on its wrapper. The canvas behind that
// print is a separate object with a separate life: it is one of one, it has a
// medium and a true size, and once it is acquired there is no second one.
export type ArtworkStatus = 'available' | 'reserved' | 'sold'

/** What selling an original needs, and a catalogue entry cannot know. */
export interface ArtworkFacts {
  year: number
  medium: Bilingual
  widthCm: number
  heightCm: number
  /** 0 = priced on request — never an invented number. */
  priceMinor: number
  status: ArtworkStatus
}

export interface Artwork extends ArtworkFacts {
  id: string
  title: Bilingual
  artist: Bilingual
  description: Bilingual
  /** Art key: the plate image and the accent both read off the bar's flavour. */
  flavorId: FlavorId
  /** The bars whose wrappers carry this painting. Empty for a work that was never printed. */
  barSlugs: string[]
  /** A photograph of the canvas itself, uploaded in the console (data URL). When a work
   *  has one it is shown whole; without one the plate is cropped out of the bar's photo. */
  image?: string
  /** Defined in the console rather than derived from the catalogue. */
  custom?: boolean
  /** Hidden from the public gallery — the console can hold a work back. */
  hidden?: boolean
}
