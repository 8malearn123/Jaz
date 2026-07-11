import type { Bilingual } from './types'
import type { ProdChannel } from './ownerProducts'

// ── Owner catalog & pricing config per channel (isolated). Category tree,
// channel catalog items, volume pricing, contracts. All edits are local overlay.

export interface CatNode { id: string; label: Bilingual; count: number; depth: 0 | 1 }
export const catTree: Record<ProdChannel, CatNode[]> = {
  b2c: [
    { id: 'b2c-bars', label: { en: 'Single bars', ar: 'ألواح فردية' }, count: 9, depth: 0 },
    { id: 'b2c-dark', label: { en: 'Dark', ar: 'داكن' }, count: 4, depth: 1 },
    { id: 'b2c-milk', label: { en: 'Milk', ar: 'حليب' }, count: 5, depth: 1 },
    { id: 'b2c-boxes', label: { en: 'Gift boxes', ar: 'بوكسات هدايا' }, count: 8, depth: 0 },
    { id: 'b2c-season', label: { en: 'Seasonal', ar: 'موسمي' }, count: 7, depth: 0 },
  ],
  b2b: [
    { id: 'b2b-hotel', label: { en: 'Hospitality', ar: 'ضيافة الفنادق' }, count: 11, depth: 0 },
    { id: 'b2b-corp', label: { en: 'Corporate gifting', ar: 'هدايا مؤسسية' }, count: 9, depth: 0 },
  ],
  mega: [
    { id: 'mega-pallet', label: { en: 'Pallets', ar: 'طبليات' }, count: 5, depth: 0 },
    { id: 'mega-raw', label: { en: 'Raw by ton', ar: 'خام بالطن' }, count: 2, depth: 0 },
  ],
}

export const catCounts: Record<ProdChannel, number> = { b2c: 24, b2b: 20, mega: 7 }

export interface B2cCatalogItem { id: string; name: Bilingual; priceMinor: number; lowStock: boolean; visible: boolean }
export const b2cCatalog: B2cCatalogItem[] = [
  { id: 'ci-1', name: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, priceMinor: 4400, lowStock: false, visible: true },
  { id: 'ci-2', name: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, priceMinor: 3800, lowStock: true, visible: true },
  { id: 'ci-3', name: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, priceMinor: 16800, lowStock: false, visible: true },
  { id: 'ci-4', name: { en: 'Rose gift box', ar: 'بوكس الورد' }, priceMinor: 31000, lowStock: true, visible: false },
]

export interface StdCatalogItem { id: string; name: Bilingual; basePriceMinor: number; moq: number }
export const stdCatalog: StdCatalogItem[] = [
  { id: 'si-1', name: { en: 'Hotel amenity bar', ar: 'لوح ضيافة الفندق' }, basePriceMinor: 3800, moq: 20 },
  { id: 'si-2', name: { en: 'Corporate crescent', ar: 'هلال الشركات' }, basePriceMinor: 30300, moq: 12 },
  { id: 'si-3', name: { en: 'Founding Day hamper', ar: 'سلة يوم التأسيس' }, basePriceMinor: 26700, moq: 10 },
]
// Volume tiers: qty range → discount %. Discounts apply to the base price.
export const stdVolumeTiers: { range: Bilingual; discount: number }[] = [
  { range: { en: '1–5', ar: '١–٥' }, discount: 0 },
  { range: { en: '6–20', ar: '٦–٢٠' }, discount: 8 },
  { range: { en: '21+', ar: '٢١+' }, discount: 15 },
]

export interface MegaCatalogItem { id: string; name: Bilingual; priceMinor: number; cbm: number; grossKg: number; unitsPerPallet: number }
export const megaCatalog: MegaCatalogItem[] = [
  { id: 'mi-1', name: { en: 'Assorted bar pallet', ar: 'طبلية ألواح مشكّلة' }, priceMinor: 1100000, cbm: 1.2, grossKg: 480, unitsPerPallet: 1800 },
  { id: 'mi-2', name: { en: 'Seasonal pallet', ar: 'طبلية موسمية' }, priceMinor: 1400000, cbm: 1.4, grossKg: 520, unitsPerPallet: 1600 },
  { id: 'mi-3', name: { en: 'Bulk couverture (ton)', ar: 'كوفرتور خام بالطن' }, priceMinor: 21600000, cbm: 1.0, grossKg: 1000, unitsPerPallet: 1 },
]

// ── Storefront products (owner "Products" tab) — how each item appears to the
// end customer per channel: image tile, name, description, badges, price, visibility.
export type StoreBadge = 'bestseller' | 'new' | 'seasonal' | 'limited'
export const storeBadgeMeta: Record<StoreBadge, { label: Bilingual; color: string; bg: string }> = {
  bestseller: { label: { en: 'Bestseller', ar: 'الأكثر مبيعًا' }, color: '#8a6b3f', bg: '#f6edde' },
  new: { label: { en: 'New', ar: 'جديد' }, color: '#355c4b', bg: '#e8f0ec' },
  seasonal: { label: { en: 'Seasonal', ar: 'موسمي' }, color: '#365766', bg: '#e7eef1' },
  limited: { label: { en: 'Limited', ar: 'كمية محدودة' }, color: '#b5403b', bg: '#faeceb' },
}
export const storeBadgeKeys: StoreBadge[] = ['bestseller', 'new', 'seasonal', 'limited']

// Swatch palette used as the product "photo" tile (stand-in for an uploaded image).
export const storeSwatches = ['#2e1a10', '#4a2c1a', '#6b4a2e', '#8a5a3a', '#b08a57', '#c9a86a', '#d8c9b0', '#9c5566', '#6b7a4a', '#365766']

// Sellable variants — mirror the customer product-page shape (weight, packaging, dual pricing, stock, cold-chain).
export type StorePackaging = 'standard' | 'gift' | 'bulk_case'
export const storePackaging: { id: StorePackaging; label: Bilingual }[] = [
  { id: 'standard', label: { en: 'Bar', ar: 'لوح' } },
  { id: 'gift', label: { en: 'Gift', ar: 'هدية' } },
  { id: 'bulk_case', label: { en: 'Case', ar: 'كرتون' } },
]
export interface StoreVariant {
  id: string
  netWeightG: number
  packaging: StorePackaging
  caseQty?: number // units per case (packaging === 'bulk_case')
  retailPriceMinor: number
  b2bPriceMinor: number
  inStock: boolean
  requiresColdChain: boolean
}

// A bill-of-materials / ingredient line (display metadata — not tied to the production BOM system).
export interface StoreComponent { name: string; qty: number; unit: string }

export interface StoreProduct {
  id: string
  name: Bilingual
  desc: Bilingual
  category: Bilingual
  priceMinor: number // headline "from" price — kept in sync with the default (first) variant
  color: string // fallback image-tile colour (used when no image uploaded)
  image?: string // uploaded product photo (data URL); overrides the colour tile when present
  badges: StoreBadge[]
  variants: StoreVariant[]
  visible: boolean // shown on the storefront
  // extended metadata
  sku?: string
  moq?: number // minimum order quantity (B2B / MEGA)
  components?: StoreComponent[] // bill of materials / ingredients
  netWeight?: string
  shelfLife?: string
  barcode?: string
  notes?: string
}

const CAT = {
  bars: { en: 'Single bars', ar: 'ألواح فردية' },
  boxes: { en: 'Gift boxes', ar: 'بوكسات هدايا' },
  season: { en: 'Seasonal', ar: 'موسمي' },
  hotel: { en: 'Hospitality', ar: 'ضيافة الفنادق' },
  corp: { en: 'Corporate gifting', ar: 'هدايا مؤسسية' },
  pallet: { en: 'Pallets', ar: 'طبليات' },
  ton: { en: 'Raw by ton', ar: 'خام بالطن' },
}

const baseSeed: Record<ProdChannel, Omit<StoreProduct, 'variants'>[]> = {
  b2c: [
    { id: 'bar-dark-70', name: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, desc: { en: 'Single-origin Jazan cacao, slow-conched to a clean snap.', ar: 'كاكاو جازان أحادي المصدر، مُملّس ببطء حتى قرمشة نقية.' }, category: CAT.bars, priceMinor: 4400, color: '#2e1a10', image: '/products/bar-dark-70.jpg', badges: ['bestseller'], visible: true },
    { id: 'bar-dark-60', name: { en: 'Dark 60% bar', ar: 'لوح داكن ٦٠٪' }, desc: { en: 'Rounder, gentler dark — 60% cacao with a soft finish.', ar: 'داكن أنعم وأكثر توازنًا — ٦٠٪ كاكاو بنهاية ناعمة.' }, category: CAT.bars, priceMinor: 4000, color: '#3b241a', image: '/products/bar-dark-60.jpg', badges: [], visible: true },
    { id: 'bar-milk', name: { en: 'Milk chocolate bar', ar: 'لوح حليب' }, desc: { en: 'Creamy milk chocolate, smooth and comforting.', ar: 'شوكولاتة حليب كريمية، ناعمة ومريحة.' }, category: CAT.bars, priceMinor: 3800, color: '#8a6b3f', image: '/products/bar-milk.jpg', badges: ['bestseller'], visible: true },
    { id: 'bar-dark-jasmine', name: { en: 'Dark chocolate with Arabian jasmine', ar: 'لوح داكن بالفل العربي' }, desc: { en: 'Dark chocolate perfumed with Arabian jasmine.', ar: 'شوكولاتة داكنة معطّرة بالفل العربي.' }, category: CAT.bars, priceMinor: 4800, color: '#6b5a3a', image: '/products/bar-dark-jasmine.jpg', badges: ['new'], visible: true },
    { id: 'bar-dark-rose', name: { en: 'Dark chocolate with rose', ar: 'لوح داكن بالورد' }, desc: { en: 'Dark chocolate with the delicate scent of rose.', ar: 'شوكولاتة داكنة بعبق الورد الرقيق.' }, category: CAT.bars, priceMinor: 4800, color: '#7a4551', image: '/products/bar-dark-rose.jpg', badges: [], visible: true },
    { id: 'bar-dark-coffee', name: { en: 'Dark chocolate with coffee', ar: 'لوح داكن بالقهوة' }, desc: { en: 'Dark chocolate deepened with roasted coffee.', ar: 'شوكولاتة داكنة بعمق القهوة المحمّصة.' }, category: CAT.bars, priceMinor: 4600, color: '#3a2418', image: '/products/bar-dark-coffee.jpg', badges: [], visible: true },
    { id: 'bar-dark-seasalt', name: { en: 'Dark chocolate with sea salt', ar: 'لوح داكن بملح البحر' }, desc: { en: 'Dark chocolate with a bright hit of sea salt.', ar: 'شوكولاتة داكنة بلمسة منعشة من ملح البحر.' }, category: CAT.bars, priceMinor: 4400, color: '#4a3626', image: '/products/bar-dark-seasalt.jpg', badges: ['new'], visible: true },
    { id: 'bar-dark-chili', name: { en: 'Dark chocolate with chili', ar: 'لوح داكن بالفلفل الحار' }, desc: { en: 'Dark chocolate with a warm chili finish.', ar: 'شوكولاتة داكنة بنهاية دافئة من الفلفل الحار.' }, category: CAT.bars, priceMinor: 4600, color: '#6b2e1e', image: '/products/bar-dark-chili.jpg', badges: [], visible: true },
    { id: 'bar-dark-lavender', name: { en: 'Dark chocolate with lavender', ar: 'لوح داكن باللافندر' }, desc: { en: 'Dark chocolate infused with fragrant lavender.', ar: 'شوكولاتة داكنة منقوعة باللافندر العطري.' }, category: CAT.bars, priceMinor: 4800, color: '#6a5a7a', image: '/products/bar-dark-lavender.jpg', badges: [], visible: true },
    { id: 'bar-dark-mango', name: { en: 'Dark chocolate with mango', ar: 'لوح داكن بالمانجو' }, desc: { en: 'Dark chocolate with sun-ripe mango.', ar: 'شوكولاتة داكنة بالمانجو الناضجة.' }, category: CAT.bars, priceMinor: 4400, color: '#b5792e', image: '/products/bar-dark-mango.jpg', badges: [], visible: true },
    { id: 'bar-dark-papaya', name: { en: 'Dark chocolate with papaya', ar: 'لوح داكن بالبابايا' }, desc: { en: 'Dark chocolate with sweet tropical papaya.', ar: 'شوكولاتة داكنة بالبابايا الاستوائية الحلوة.' }, category: CAT.bars, priceMinor: 4400, color: '#b5562e', image: '/products/bar-dark-papaya.jpg', badges: [], visible: true },
    { id: 'bar-dark-banana', name: { en: 'Dark chocolate with banana', ar: 'لوح داكن بالموز' }, desc: { en: 'Dark chocolate with mellow ripe banana.', ar: 'شوكولاتة داكنة بالموز الناضج.' }, category: CAT.bars, priceMinor: 4200, color: '#a8862e', image: '/products/bar-dark-banana.jpg', badges: [], visible: true },
    { id: 'sp-b2c-4', name: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, desc: { en: 'A curated dozen — our jasmine collection, boxed to gift.', ar: 'اثنتا عشرة قطعة منتقاة — مجموعة الفُل في علبة هدية.' }, category: CAT.boxes, priceMinor: 16800, color: '#b08a57', badges: ['bestseller'], visible: true },
    { id: 'sp-b2c-5', name: { en: 'Rose gift box', ar: 'بوكس الورد' }, desc: { en: 'Damascena rose ganache in a keepsake case.', ar: 'غاناش ورد دمشقي في علبة تُقتنى.' }, category: CAT.boxes, priceMinor: 31000, color: '#9c5566', badges: ['limited'], visible: false },
    { id: 'sp-b2c-6', name: { en: 'Founding Day box', ar: 'بوكس يوم التأسيس' }, desc: { en: 'Limited seasonal assortment for Founding Day.', ar: 'تشكيلة موسمية محدودة ليوم التأسيس.' }, category: CAT.season, priceMinor: 22000, color: '#8a5a3a', badges: ['seasonal'], visible: true },
  ],
  b2b: [
    { id: 'sp-b2b-1', name: { en: 'Hotel amenity bar', ar: 'لوح ضيافة الفندق' }, desc: { en: 'Turn-down amenity bar, cold-chain ready.', ar: 'لوح ضيافة للغرف، جاهز لسلسلة التبريد.' }, category: CAT.hotel, priceMinor: 3800, color: '#6b4a2e', badges: [], visible: true },
    { id: 'sp-b2b-2', name: { en: 'Café couverture drops', ar: 'قطرات كوفرتور للمقاهي' }, desc: { en: 'Bulk couverture drops for café kitchens.', ar: 'قطرات كوفرتور بالجملة لمطابخ المقاهي.' }, category: CAT.hotel, priceMinor: 21000, color: '#4a2c1a', badges: [], visible: true },
    { id: 'sp-b2b-3', name: { en: 'Corporate crescent', ar: 'هلال الشركات' }, desc: { en: 'Branded crescent centerpiece for corporate gifting.', ar: 'قطعة هلال مُخصّصة لهدايا الشركات.' }, category: CAT.corp, priceMinor: 30300, color: '#b08a57', badges: ['bestseller'], visible: true },
    { id: 'sp-b2b-4', name: { en: 'Founding Day hamper', ar: 'سلة يوم التأسيس' }, desc: { en: 'Seasonal hamper for corporate orders.', ar: 'سلة موسمية لطلبات الشركات.' }, category: CAT.corp, priceMinor: 26700, color: '#8a5a3a', badges: ['seasonal'], visible: true },
  ],
  mega: [
    { id: 'sp-mega-1', name: { en: 'Assorted bar pallet', ar: 'طبلية ألواح مشكّلة' }, desc: { en: 'Mixed retail bars, palletised for distribution.', ar: 'ألواح تجزئة مشكّلة، مرصوصة للتوزيع.' }, category: CAT.pallet, priceMinor: 1100000, color: '#6b4a2e', badges: ['bestseller'], visible: true },
    { id: 'sp-mega-2', name: { en: 'Seasonal pallet', ar: 'طبلية موسمية' }, desc: { en: 'Seasonal SKUs consolidated per pallet.', ar: 'أصناف موسمية مجمّعة لكل طبلية.' }, category: CAT.pallet, priceMinor: 1400000, color: '#8a5a3a', badges: ['seasonal'], visible: true },
    { id: 'sp-mega-3', name: { en: 'Bulk couverture (ton)', ar: 'كوفرتور خام بالطن' }, desc: { en: 'Industrial couverture by the metric ton.', ar: 'كوفرتور صناعي بالطن المتري.' }, category: CAT.ton, priceMinor: 21600000, color: '#2e1a10', badges: [], visible: true },
  ],
}

// Seed variants per product (b2b price ≈ 30% off retail, rounded to whole riyals to match the price inputs).
let vseq = 0
const mkV = (netWeightG: number, packaging: StorePackaging, retailMinor: number, extra?: Partial<StoreVariant>): StoreVariant => ({
  id: `sv-${++vseq}`, netWeightG, packaging, retailPriceMinor: retailMinor, b2bPriceMinor: Math.round(retailMinor * 0.7 / 100) * 100, inStock: true, requiresColdChain: true, ...extra,
})
const seedVariants: Record<string, StoreVariant[]> = {
  'sp-b2c-1': [mkV(90, 'standard', 4400), mkV(180, 'gift', 8200), mkV(90, 'bulk_case', 96000, { caseQty: 24 })],
  'sp-b2c-2': [mkV(90, 'standard', 3800), mkV(180, 'gift', 7200)],
  'sp-b2c-3': [mkV(90, 'standard', 4600), mkV(180, 'gift', 8600)],
  'sp-b2c-4': [mkV(220, 'gift', 16800)],
  'sp-b2c-5': [mkV(260, 'gift', 31000)],
  'sp-b2c-6': [mkV(300, 'gift', 22000)],
  'sp-b2b-1': [mkV(40, 'standard', 3800), mkV(40, 'bulk_case', 168000, { caseQty: 48 })],
  'sp-b2b-2': [mkV(2500, 'bulk_case', 21000, { requiresColdChain: false })],
  'sp-b2b-3': [mkV(500, 'gift', 30300)],
  'sp-b2b-4': [mkV(1200, 'gift', 26700)],
  'sp-mega-1': [mkV(480000, 'bulk_case', 1100000, { caseQty: 1800 })],
  'sp-mega-2': [mkV(520000, 'bulk_case', 1400000, { caseQty: 1600 })],
  'sp-mega-3': [mkV(1000000, 'bulk_case', 21600000, { caseQty: 1, requiresColdChain: false })],
}
function withVariants(p: Omit<StoreProduct, 'variants'>): StoreProduct {
  return { ...p, variants: seedVariants[p.id] ?? [mkV(90, 'standard', p.priceMinor)] }
}
export const storeProductsSeed: Record<ProdChannel, StoreProduct[]> = {
  b2c: baseSeed.b2c.map(withVariants),
  b2b: baseSeed.b2b.map(withVariants),
  mega: baseSeed.mega.map(withVariants),
}

export type ContractStatus = 'active' | 'renew'
export interface Contract { id: string; account: Bilingual; discount: number; terms: Bilingual; status: ContractStatus }
export const contracts: Contract[] = [
  { id: 'ct-1', account: { en: 'Jeddah Grand Hotel', ar: 'فندق جدة الكبير' }, discount: 18, terms: { en: 'Net 30', ar: 'صافي ٣٠' }, status: 'active' },
  { id: 'ct-2', account: { en: 'Ramz Café', ar: 'مقهى رمز' }, discount: 12, terms: { en: 'Net 15', ar: 'صافي ١٥' }, status: 'active' },
  { id: 'ct-3', account: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, discount: 22, terms: { en: 'Net 60', ar: 'صافي ٦٠' }, status: 'renew' },
  { id: 'ct-4', account: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, discount: 15, terms: { en: 'Net 30', ar: 'صافي ٣٠' }, status: 'active' },
]
