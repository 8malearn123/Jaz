// Public-catalogue invariants: the row->Product mapping, and the derivation /art
// depends on. No database, no network.
import { createServer } from 'vite'

let failures = 0
const check = (n, c, d = '') => { if (c) console.log(`✓  ${n}`); else { failures++; console.log(`✗  ${n}${d ? '  ' + d : ''}`) } }

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const api = await server.ssrLoadModule('/src/lib/api/catalogue.ts')
const aw  = await server.ssrLoadModule('/src/data/artworks.ts')
const pr  = await server.ssrLoadModule('/src/data/products.ts')
const { rowToPublicProduct } = api
const { deriveArtworks, seededArtworks } = aw

// ---------------------------------------------------------------- mapping
const row = {
  id: 'p-x', sku: 'SKU-X', slug: 'slug-x', type: 'bar', line: 'signature',
  title_en: 'T', title_ar: 'ت', flavor_id: 'rose', cocoa_pct: null,
  ingredients_en: 'i', ingredients_ar: 'ي', story_en: 's', story_ar: 'ص',
  allergens: [{ en: 'Milk', ar: 'حليب' }], badges: ['new'], art_card: null,
  rating: '4.5', review_count: 7, pairs_with: ['p-y'], occasions: ['eid'],
  sort_order: 0, created_at: 'a', updated_at: 'b',
}
const variantRow = {
  id: 'v-x', product_id: 'p-x', position: 0, net_weight_g: 90,
  packaging: 'standard', case_qty: null,
  retail_price_minor: '4400', b2b_price_minor: '3100',
  in_stock: true, requires_cold_chain: true,
}

const p = rowToPublicProduct(row, [variantRow], [])
check('rating comes back a number', typeof p.rating === 'number' && p.rating === 4.5, `got ${typeof p.rating}`)
check('variant prices come back numbers',
  typeof p.variants[0].retailPriceMinor === 'number' && p.variants[0].retailPriceMinor === 4400)
// `artCard: undefined` would still be an own key, and the gallery filters on
// truthiness while other code does `p.artCard!` — absent is the only safe shape.
check('a null art card is ABSENT, not null', !('artCard' in p), `keys: ${Object.keys(p).filter(k=>k==='artCard')}`)
check('a null cocoa_pct is absent', !('cocoaPct' in p))
check('a null case_qty is absent from the variant', !('caseQty' in p.variants[0]))

const withCard = rowToPublicProduct({ ...row, art_card: { artworkTitle: { en: 'A', ar: 'أ' }, artistName: { en: 'B', ar: 'ب' }, description: { en: 'c', ar: 'ج' } } }, [variantRow], [])
check('a present art card maps through', withCard.artCard?.artworkTitle.en === 'A')

const withReview = rowToPublicProduct(row, [variantRow], [{
  id: 'r1', product_id: 'p-x', author_en: 'N', author_ar: 'ن', rating: 5,
  body_en: 'b', body_ar: 'ب', verified: true, review_date: '2026-01-01', created_at: 'x',
}])
check('review_date maps onto date', withReview.reviews[0].date === '2026-01-01')
check('a verified review keeps its flag', withReview.reviews[0].verified === true)

// variants must come out in position order, not insertion order
const two = rowToPublicProduct(row, [{ ...variantRow, id: 'v-second', position: 1 }, { ...variantRow, id: 'v-first', position: 0 }], [])
check('variants sort by position', two.variants.map(v => v.id).join(',') === 'v-first,v-second',
  two.variants.map(v => v.id).join(','))

// ---------------------------------------------------------------- derivation
// This is what /art and slice 2's artwork_overrides rows depend on.
const derived = deriveArtworks(pr.products)
check('derivation reproduces the seeded gallery exactly',
  JSON.stringify(derived) === JSON.stringify(seededArtworks))
check('twelve commissions', derived.length === 12, String(derived.length))
check('every id is aw-<slug>', derived.every(a => a.id.startsWith('aw-')))
check('three paintings share «حين تزهر الحقول», not one',
  derived.filter(a => a.title.ar === 'حين تزهر الحقول').length === 3,
  String(derived.filter(a => a.title.ar === 'حين تزهر الحقول').length))

// In the current catalogue no painting is printed on more than one bar, so the
// grouping logic is exercised directly rather than through the seed: two products
// carrying the SAME card must collapse to one canvas with both slugs. Getting this
// wrong would delete a commission and sell one canvas twice.
const sharedCard = { artworkTitle: { en: 'Shared', ar: 'مشترك' }, artistName: { en: 'Same', ar: 'نفسه' }, description: { en: 'one work', ar: 'عمل واحد' } }
const twinned = deriveArtworks([
  { ...pr.products[0], id: 'a', slug: 'bar-a', artCard: sharedCard },
  { ...pr.products[1], id: 'b', slug: 'bar-b', artCard: sharedCard },
])
check('two bars carrying one card collapse to one canvas', twinned.length === 1, String(twinned.length))
check('and that canvas carries both slugs',
  twinned[0]?.barSlugs.join(',') === 'bar-a,bar-b', twinned[0]?.barSlugs.join(','))

// The inverse: same title, different artist/story stays two canvases.
const sameTitleOnly = deriveArtworks([
  { ...pr.products[0], id: 'a', slug: 'bar-a', artCard: { ...sharedCard, artistName: { en: 'One', ar: '١' } } },
  { ...pr.products[1], id: 'b', slug: 'bar-b', artCard: { ...sharedCard, artistName: { en: 'Two', ar: '٢' } } },
])
check('same title but a different artist stays two canvases', sameTitleOnly.length === 2, String(sameTitleOnly.length))

check('no painting in the real catalogue spans two bars (data fact, not a rule)',
  derived.every(a => a.barSlugs.length === 1))
check('no slug is claimed by two canvases',
  new Set(derived.flatMap(a => a.barSlugs)).size === derived.flatMap(a => a.barSlugs).length)

// The derivation must survive being handed a DB-shaped catalogue, not just the seed.
const fromRows = pr.products.map((sp) => rowToPublicProduct({
  ...row, id: sp.id, sku: sp.sku, slug: sp.slug, type: sp.type, line: sp.line,
  title_en: sp.title.en, title_ar: sp.title.ar, flavor_id: sp.flavorId,
  art_card: sp.artCard ?? null,
}, [variantRow], []))
const derivedFromRows = deriveArtworks(fromRows)
check('derivation from DB-shaped rows yields the same twelve ids',
  derivedFromRows.map(a => a.id).sort().join(',') === derived.map(a => a.id).sort().join(','),
  `${derivedFromRows.length} vs ${derived.length}`)

// ---------------------------------------------------------------- listings
// A linked listing must take its copy from the catalogue, and an unlinked one from
// its own columns. Getting this backwards puts the wrong name on a product card, or
// an empty one.
const listingRow = {
  id: 'sp-1', channel: 'b2c', product_id: 'p-rose',
  name_en: null, name_ar: null, desc_en: '', desc_ar: '',
  category_en: 'Bars', category_ar: 'ألواح', price_minor: 6500,
  color: '#000', image: null, badges: [], visible: true, country: null,
  sku: null, moq: null, net_weight: null, shelf_life: null, barcode: null,
  notes: null, components: [], sort_order: 0, created_at: 'a', updated_at: 'b',
}
const storeVariantRow = {
  id: 'sv-1', product_id: 'sp-1', position: 0, net_weight_g: 90,
  packaging: 'standard', case_qty: null,
  retail_price_minor: 6500, b2b_price_minor: 4550, in_stock: true, requires_cold_chain: true,
}
const linkedProduct = { title_en: 'Damascena Rose', title_ar: 'الورد الدمشقي', story_en: 'petals', story_ar: 'بتلات' }

const linked = api.rowToProduct(listingRow, [storeVariantRow], linkedProduct)
check('a linked listing takes the catalogue name', linked.name.en === 'Damascena Rose', linked.name.en)
check('a linked listing takes the catalogue story', linked.desc.ar === 'بتلات')

const standalone = api.rowToProduct(
  { ...listingRow, product_id: null, name_en: 'Hotel amenity bar', name_ar: 'لوح ضيافة', desc_en: 'turn-down', desc_ar: 'للغرف' },
  [storeVariantRow], null,
)
check('a channel-only listing keeps its own name', standalone.name.en === 'Hotel amenity bar', standalone.name.en)
check('a channel-only listing keeps its own copy', standalone.desc.en === 'turn-down')

// The dangerous case: linked in the row but the join missed. Falling through to the
// nulled-out columns must not produce a card titled "".
const orphaned = api.rowToProduct(listingRow, [storeVariantRow], null)
check('a linked row with no join yields empty strings, never null',
  orphaned.name.en === '' && orphaned.name.ar === '', JSON.stringify(orphaned.name))

await server.close()
console.log('')
if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1) }
console.log('✓ all public-catalogue invariants hold')
