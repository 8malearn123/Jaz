// Gallery mapping invariants. No database, no network: this asserts the rules the
// overlay depends on, which are the easiest thing in the slice to get quietly
// wrong and the hardest to notice in the UI.
import { createServer } from 'vite'

let failures = 0
const check = (name, cond, detail = '') => {
  if (cond) {
    console.log(`✓  ${name}`)
  } else {
    failures++
    console.log(`✗  ${name}${detail ? '  ' + detail : ''}`)
  }
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const api = await server.ssrLoadModule('/src/lib/api/artworks.ts')
const { seededArtworks } = await server.ssrLoadModule('/src/data/artworks.ts')

const { rowToOverride, patchToOverrideRow, rowToArtwork, rowToRequest } = api

// ---------------------------------------------------------------- the big one
//
// A null column means "not overridden". If the mapper turned it into an explicit
// undefined, spreading the patch over a seeded work would ERASE the catalogue's
// value — the commission would lose its title or its story with no edit made.
const allNull = {
  artwork_id: 'aw-roses',
  title_en: null, title_ar: null, artist_en: null, artist_ar: null,
  description_en: null, description_ar: null, medium_en: null, medium_ar: null,
  year: null, width_cm: null, height_cm: null, price_minor: null,
  status: null, image: null, hidden: null, updated_at: 'now',
}
const emptyPatch = rowToOverride(allNull)
check('an all-null override yields no keys at all', Object.keys(emptyPatch).length === 0,
  `got ${JSON.stringify(Object.keys(emptyPatch))}`)

const seeded = seededArtworks[0]
const merged = { ...seeded, ...emptyPatch }
check('merging it leaves the seeded work untouched',
  merged.title.ar === seeded.title.ar && merged.description.ar === seeded.description.ar && merged.priceMinor === seeded.priceMinor)

// ---------------------------------------------------------------- partial edits
const priceOnly = rowToOverride({ ...allNull, price_minor: 4500000 })
check('a price-only override carries only the price',
  Object.keys(priceOnly).length === 1 && priceOnly.priceMinor === 4500000,
  JSON.stringify(priceOnly))
check('and merging it keeps the catalogue title',
  { ...seeded, ...priceOnly }.title.ar === seeded.title.ar)

const hiddenFalse = rowToOverride({ ...allNull, hidden: false })
check('hidden:false is an override, not an absence',
  Object.keys(hiddenFalse).length === 1 && hiddenFalse.hidden === false)

const statusOnly = rowToOverride({ ...allNull, status: 'reserved' })
check('a reserved status maps through', statusOnly.status === 'reserved')

// ---------------------------------------------------------------- round trip
const roundTrip = patchToOverrideRow(rowToOverride({ ...allNull, price_minor: 999, status: 'sold', hidden: true }))
check('patch -> row keeps exactly the three edited columns',
  Object.keys(roundTrip).sort().join(',') === 'hidden,price_minor,status',
  JSON.stringify(roundTrip))

const emptyRow = patchToOverrideRow({})
check('an empty patch writes nothing', Object.keys(emptyRow).length === 0)

// A bilingual field must write BOTH halves or neither, or one language silently
// keeps a stale value.
const titleRow = patchToOverrideRow({ title: { en: 'A', ar: 'ب' } })
check('a bilingual edit writes both languages',
  titleRow.title_en === 'A' && titleRow.title_ar === 'ب' && Object.keys(titleRow).length === 2)

// ---------------------------------------------------------------- custom works
const custom = rowToArtwork({
  id: 'de305d54-75b4-431b-adb2-eb6b9e546014',
  title_en: 'T', title_ar: 'ت', artist_en: 'A', artist_ar: 'أ',
  description_en: 'd', description_ar: 'د', medium_en: 'm', medium_ar: 'م',
  flavor_id: 'rose', bar_slugs: ['damascena-rose'],
  year: 2024, width_cm: '50.00', height_cm: '70.00', price_minor: '900000',
  status: 'available', image: null, hidden: false,
  created_at: 'x', updated_at: 'y',
})
check('a custom row is marked custom', custom.custom === true)
check('numerics come back as numbers, not strings',
  typeof custom.widthCm === 'number' && typeof custom.priceMinor === 'number' && custom.priceMinor === 900000,
  `widthCm=${typeof custom.widthCm} priceMinor=${typeof custom.priceMinor}`)
check('a null image becomes undefined, not null', custom.image === undefined)

const req = rowToRequest({ id: 'r1', artwork_id: 'aw-roses', name: 'N', email: 'e@x.co', phone: '', note: '', handled: false, created_at: '2026-01-01T00:00:00Z' })
check('a request maps created_at onto at', req.at === '2026-01-01T00:00:00Z' && req.artworkId === 'aw-roses')

await server.close()

console.log('')
if (failures) {
  console.log(`${failures} check(s) failed.`)
  process.exit(1)
}
console.log('✓ all gallery mapping invariants hold')
