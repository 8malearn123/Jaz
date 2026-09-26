// The storefront catalogue's endpoints, and the mapping between two flat tables
// and the nested StoreProduct the UI reads.
//
// The headline price_minor is NOT written from here. A database trigger derives it
// from the default (lowest-position) variant's retail price, so sending a value
// would either be ignored or paper over a broken trigger.

import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { StoreProductRow, StoreVariantRow, ProdChannelRow } from '@/lib/database.types'
import type { StoreProduct, StoreVariant, StoreBadge, StorePackaging } from '@/data/ownerCatalog'
import type { ProdChannel } from '@/data/ownerProducts'
import type { CountryCode } from '@/data/countries'

export interface WriteResult { ok: boolean; error: string | null }
const OK: WriteResult = { ok: true, error: null }
const bad = (error: string): WriteResult => ({ ok: false, error })

export const EMPTY_CATALOGUE: Record<ProdChannel, StoreProduct[]> = { b2c: [], b2b: [], mega: [] }

// ---------------------------------------------------------------- row -> UI

export function rowToVariant(r: StoreVariantRow): StoreVariant {
  return {
    id: r.id,
    netWeightG: r.net_weight_g,
    packaging: r.packaging,
    // Absent rather than null: the UI checks `caseQty !== undefined` in places.
    ...(r.case_qty === null ? {} : { caseQty: r.case_qty }),
    retailPriceMinor: Number(r.retail_price_minor),
    b2bPriceMinor: Number(r.b2b_price_minor),
    inStock: r.in_stock,
    requiresColdChain: r.requires_cold_chain,
  }
}

export function rowToProduct(r: StoreProductRow, variants: StoreVariantRow[]): StoreProduct {
  return {
    id: r.id,
    name: { en: r.name_en, ar: r.name_ar },
    desc: { en: r.desc_en, ar: r.desc_ar },
    category: { en: r.category_en, ar: r.category_ar },
    priceMinor: Number(r.price_minor),
    color: r.color,
    badges: r.badges as StoreBadge[],
    visible: r.visible,
    // Every optional field is omitted when null, never set to null: StoreProduct
    // declares them optional, and `image: null` would defeat `p.image ? ... : ...`.
    ...(r.image === null ? {} : { image: r.image }),
    ...(r.country === null ? {} : { country: r.country as CountryCode | 'all' }),
    ...(r.sku === null ? {} : { sku: r.sku }),
    ...(r.moq === null ? {} : { moq: r.moq }),
    ...(r.net_weight === null ? {} : { netWeight: r.net_weight }),
    ...(r.shelf_life === null ? {} : { shelfLife: r.shelf_life }),
    ...(r.barcode === null ? {} : { barcode: r.barcode }),
    ...(r.notes === null ? {} : { notes: r.notes }),
    ...(r.components.length === 0 ? {} : { components: r.components }),
    variants: variants
      .slice()
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map(rowToVariant),
  }
}

// ---------------------------------------------------------------- UI -> row

/** Everything except price_minor, which the trigger owns. */
export function productToRow(chan: ProdChannel, p: Omit<StoreProduct, 'id' | 'visible'> & { visible?: boolean }) {
  return {
    channel: chan as ProdChannelRow,
    name_en: p.name.en,
    name_ar: p.name.ar,
    desc_en: p.desc?.en ?? '',
    desc_ar: p.desc?.ar ?? '',
    category_en: p.category?.en ?? '',
    category_ar: p.category?.ar ?? '',
    color: p.color ?? '#4a2c1a',
    image: p.image ?? null,
    badges: p.badges ?? [],
    visible: p.visible ?? true,
    country: p.country ?? null,
    sku: p.sku ?? null,
    moq: p.moq ?? null,
    net_weight: p.netWeight ?? null,
    shelf_life: p.shelfLife ?? null,
    barcode: p.barcode ?? null,
    notes: p.notes ?? null,
    components: p.components ?? [],
  }
}

export function productPatchToRow(patch: Partial<Omit<StoreProduct, 'id'>>): Partial<StoreProductRow> {
  const row: Partial<StoreProductRow> = {}
  if (patch.name) { row.name_en = patch.name.en; row.name_ar = patch.name.ar }
  if (patch.desc) { row.desc_en = patch.desc.en; row.desc_ar = patch.desc.ar }
  if (patch.category) { row.category_en = patch.category.en; row.category_ar = patch.category.ar }
  if (patch.color !== undefined) row.color = patch.color
  if ('image' in patch) row.image = patch.image ?? null
  if (patch.badges !== undefined) row.badges = patch.badges
  if (patch.visible !== undefined) row.visible = patch.visible
  if ('country' in patch) row.country = patch.country ?? null
  if ('sku' in patch) row.sku = patch.sku ?? null
  if ('moq' in patch) row.moq = patch.moq ?? null
  if ('netWeight' in patch) row.net_weight = patch.netWeight ?? null
  if ('shelfLife' in patch) row.shelf_life = patch.shelfLife ?? null
  if ('barcode' in patch) row.barcode = patch.barcode ?? null
  if ('notes' in patch) row.notes = patch.notes ?? null
  if (patch.components !== undefined) row.components = patch.components
  // priceMinor is intentionally ignored: the trigger derives it.
  return row
}

function variantToRow(productId: string, v: Omit<StoreVariant, 'id'>, position: number) {
  return {
    product_id: productId,
    position,
    net_weight_g: v.netWeightG,
    packaging: v.packaging as StorePackaging,
    // The column is constrained to cases only, so anything else must send null.
    case_qty: v.packaging === 'bulk_case' ? (v.caseQty ?? null) : null,
    retail_price_minor: v.retailPriceMinor,
    b2b_price_minor: v.b2bPriceMinor,
    in_stock: v.inStock,
    requires_cold_chain: v.requiresColdChain,
  }
}

// ---------------------------------------------------------------- reads

/** The whole catalogue, grouped by channel. A visitor sees only what is on sale. */
export async function fetchCatalogue(): Promise<Record<ProdChannel, StoreProduct[]>> {
  if (!isSupabaseConfigured) return { ...EMPTY_CATALOGUE }
  const db = requireSupabase()

  const [products, variants] = await Promise.all([
    db.from('store_products').select('*').order('channel').order('sort_order'),
    db.from('store_variants').select('*').order('position'),
  ])

  if (products.error) {
    console.error('[catalogue] products:', products.error.message)
    return { ...EMPTY_CATALOGUE }
  }
  if (variants.error) console.error('[catalogue] variants:', variants.error.message)

  const byProduct = new Map<string, StoreVariantRow[]>()
  for (const v of variants.data ?? []) {
    const list = byProduct.get(v.product_id)
    if (list) list.push(v)
    else byProduct.set(v.product_id, [v])
  }

  const out: Record<ProdChannel, StoreProduct[]> = { b2c: [], b2b: [], mega: [] }
  for (const r of products.data ?? []) {
    out[r.channel as ProdChannel].push(rowToProduct(r, byProduct.get(r.id) ?? []))
  }
  return out
}

// ---------------------------------------------------------------- writes

/**
 * Creates a product and its variants together. The variants are inserted second
 * because each one needs the product's id, and their insert is what sets the
 * headline price.
 */
export async function createProduct(
  chan: ProdChannel,
  p: Omit<StoreProduct, 'id' | 'visible'>,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('catalogue.notConfigured')
  const db = requireSupabase()

  const { data, error } = await db
    .from('store_products')
    .insert(productToRow(chan, p))
    .select('id')
    .single()

  if (error) return bad(error.message)
  if (!data) return bad('catalogue.insertReturnedNothing')

  const variants = (p.variants ?? []).map((v, i) => variantToRow(data.id, v, i))
  if (variants.length === 0) return OK

  const ins = await db.from('store_variants').insert(variants)
  if (ins.error) {
    // The product exists but has no variants, which would show a headline of zero.
    // Remove it rather than leave a product that reads as free.
    await db.from('store_products').delete().eq('id', data.id)
    return bad(ins.error.message)
  }
  return OK
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<StoreProduct, 'id'>>,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('catalogue.notConfigured')
  const db = requireSupabase()

  const row = productPatchToRow(patch)
  if (Object.keys(row).length > 0) {
    const { error } = await db.from('store_products').update(row).eq('id', id)
    if (error) return bad(error.message)
  }

  // Variants are replaced wholesale when the caller sends them: the editor hands
  // back the full list, and position is what the array order means.
  if (patch.variants !== undefined) {
    const del = await db.from('store_variants').delete().eq('product_id', id)
    if (del.error) return bad(del.error.message)
    if (patch.variants.length > 0) {
      const ins = await db
        .from('store_variants')
        .insert(patch.variants.map((v, i) => variantToRow(id, v, i)))
      if (ins.error) return bad(ins.error.message)
    }
  }
  return OK
}

export async function setProductVisible(id: string, visible: boolean): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('catalogue.notConfigured')
  const { error } = await requireSupabase().from('store_products').update({ visible }).eq('id', id)
  return error ? bad(error.message) : OK
}

export async function deleteProduct(id: string): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('catalogue.notConfigured')
  // Variants go with it: the foreign key cascades.
  const { error } = await requireSupabase().from('store_products').delete().eq('id', id)
  return error ? bad(error.message) : OK
}

// ---------------------------------------------------------------- public catalogue
//
// The storefront's own read. Separate from fetchCatalogue() above, which serves the
// console's per-channel listings: this one returns the Product shape that /shop,
// /product/:slug, the cart and checkout speak.

import type { Product, ProductVariant, ArtCard, Review, ProductType, ProductLine, BadgeKind, FlavorId } from '@/data/types'
import type { ProductRow, ProductVariantFullRow, ProductReviewRow } from '@/lib/database.types'

function rowToProductVariant(r: ProductVariantFullRow): ProductVariant {
  return {
    id: r.id,
    netWeightG: r.net_weight_g,
    packaging: r.packaging,
    ...(r.case_qty === null ? {} : { caseQty: r.case_qty }),
    requiresColdChain: r.requires_cold_chain,
    retailPriceMinor: Number(r.retail_price_minor),
    b2bPriceMinor: Number(r.b2b_price_minor),
    inStock: r.in_stock,
  }
}

function rowToReview(r: ProductReviewRow): Review {
  return {
    author: { en: r.author_en, ar: r.author_ar },
    rating: r.rating,
    body: { en: r.body_en, ar: r.body_ar },
    verified: r.verified,
    date: r.review_date,
  }
}

export function rowToPublicProduct(
  r: ProductRow,
  variants: ProductVariantFullRow[],
  reviews: ProductReviewRow[],
): Product {
  return {
    id: r.id,
    sku: r.sku,
    slug: r.slug,
    type: r.type as ProductType,
    line: r.line as ProductLine,
    title: { en: r.title_en, ar: r.title_ar },
    flavorId: r.flavor_id as FlavorId,
    ...(r.cocoa_pct === null ? {} : { cocoaPct: r.cocoa_pct }),
    allergens: r.allergens,
    ingredients: { en: r.ingredients_en, ar: r.ingredients_ar },
    story: { en: r.story_en, ar: r.story_ar },
    badges: r.badges as BadgeKind[],
    variants: variants
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(rowToProductVariant),
    // Absent, not null: `p.artCard!` is used after a truthiness check in several
    // places, and the gallery derivation filters on it.
    ...(r.art_card === null ? {} : { artCard: r.art_card as ArtCard }),
    rating: Number(r.rating),
    reviewCount: r.review_count,
    reviews: reviews.map(rowToReview),
    pairsWith: r.pairs_with,
    occasions: r.occasions,
  }
}

/**
 * The public catalogue, ordered as the storefront expects. Returns null — not an
 * empty array — when the read fails, so a caller can tell "no backend / broken
 * read" from "a catalogue with nothing in it" and fall back to the seed rather
 * than showing an empty shop.
 */
export async function fetchPublicProducts(): Promise<Product[] | null> {
  if (!isSupabaseConfigured) return null
  const db = requireSupabase()

  const [products, variants, reviews] = await Promise.all([
    db.from('products').select('*').order('sort_order'),
    db.from('product_variants').select('*').order('position'),
    db.from('product_reviews').select('*').order('review_date', { ascending: false }),
  ])

  if (products.error) {
    console.error('[catalogue] public products:', products.error.message)
    return null
  }
  if (variants.error) console.error('[catalogue] public variants:', variants.error.message)
  if (reviews.error) console.error('[catalogue] public reviews:', reviews.error.message)

  // An empty table is also treated as "no data": the storefront should show the
  // seeded catalogue rather than nothing at all.
  if ((products.data ?? []).length === 0) return null

  const vByProduct = new Map<string, ProductVariantFullRow[]>()
  for (const v of variants.data ?? []) {
    const list = vByProduct.get(v.product_id)
    if (list) list.push(v)
    else vByProduct.set(v.product_id, [v])
  }
  const rByProduct = new Map<string, ProductReviewRow[]>()
  for (const r of reviews.data ?? []) {
    const list = rByProduct.get(r.product_id)
    if (list) list.push(r)
    else rByProduct.set(r.product_id, [r])
  }

  return (products.data ?? []).map((r) =>
    rowToPublicProduct(r, vByProduct.get(r.id) ?? [], rByProduct.get(r.id) ?? []),
  )
}
