// Order mapping invariants. No database: the SQL side is compared against the
// migration's own text, so the two cannot drift without this failing.
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'

let failures = 0
const check = (n, c, d = '') => { if (c) console.log(`✓  ${n}`); else { failures++; console.log(`✗  ${n}${d ? '  ' + d : ''}`) } }

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const api = await server.ssrLoadModule('/src/lib/api/orders.ts')
const oo  = await server.ssrLoadModule('/src/data/ownerOrders.ts')
const { ownerStageOf, customerStatusOf, stepsOf, rowToCustomerOrder, rowToOwnerOrder, rowToOwnerCustomer } = api

const ALL = ['new','confirmed','processing','ready','shipped','out_for_delivery','delivered','cancelled']

// ---------------------------------------------------------------- stage parity
// The console's stage is computed twice — in SQL and in TS. If they disagree, an
// order shows one position to the owner and another to the query behind it.
const sql = await readFile('supabase/migrations/20260927010000_orders.sql', 'utf8')
const body = sql.slice(sql.indexOf('create or replace function public.order_owner_stage'))
const sqlMap = {}
for (const m of body.matchAll(/when '(\w+)'\s+then (\d)/g)) sqlMap[m[1]] = Number(m[2])

check('SQL declares a stage for every status',
  ALL.every((s) => s in sqlMap), JSON.stringify(Object.keys(sqlMap)))
check('TS stage map agrees with SQL for all eight',
  ALL.every((s) => ownerStageOf(s) === sqlMap[s]),
  ALL.filter((s) => ownerStageOf(s) !== sqlMap[s]).map((s) => `${s}: ts=${ownerStageOf(s)} sql=${sqlMap[s]}`).join('; '))

// Every stage the console renders must be reachable, or a column sits always empty.
const stages = new Set(ALL.map(ownerStageOf))
check('every console stage 0..5 is reachable',
  [0,1,2,3,4,5].every((n) => stages.has(n)), JSON.stringify([...stages].sort()))
check('the console has a label for each stage', oo.ownerOrderStatuses.length === 6, String(oo.ownerOrderStatuses.length))

// ---------------------------------------------------------------- status shown
// The two internal-only states must never reach a shopper's tracking page.
check('`new` is shown to a customer as confirmed', customerStatusOf('new') === 'confirmed')
check('`ready` is shown to a customer as processing', customerStatusOf('ready') === 'processing')
check('every status maps to a customer-facing one', ALL.every((s) => !!customerStatusOf(s)))

// ---------------------------------------------------------------- timeline
const t = stepsOf('out_for_delivery', '2026-06-14')
check('the timeline has five steps', t.length === 5, String(t.length))
check('the current step is the status itself', t.find((x) => x.current)?.key === 'out_for_delivery')
check('earlier steps are done', t.slice(0, 3).every((x) => x.done))
check('later steps carry no date', t[4].at === undefined)
check('the first step is dated the day it was placed', t[0].at === '2026-06-14', t[0].at)
// A cancelled order has no timeline: nothing past it is true.
check('a cancelled order has no timeline', stepsOf('cancelled', '2026-06-14').length === 0)
check('a `new` order marks confirmed as current', stepsOf('new', '2026-06-01')[0].current === true)

// ---------------------------------------------------------------- mapping
const orderRow = {
  id: 'o1', order_no: 'JAZ-1', customer_id: 'c-1', channel: 'B2C',
  status: 'out_for_delivery', placed_at: '2026-06-14', total_minor: '18515', qty: 3,
  is_gift: true, cold_chain: true, carrier_en: 'SMSA', carrier_ar: 'سمسا',
  tracking_no: 'T1', sla_met: true, department_en: null, department_ar: null,
  items_summary_en: null, items_summary_ar: null, created_at: 'a', updated_at: 'b',
}
const itemRows = [
  { id: 'i2', order_id: 'o1', variant_id: 'v-milk-90', qty: 2, unit_minor: 4800, position: 1 },
  { id: 'i1', order_id: 'o1', variant_id: 'v-rose-90', qty: 1, unit_minor: 6500, position: 0 },
]

const co = rowToCustomerOrder(orderRow, itemRows)
check('totals come back numbers', typeof co.totalMinor === 'number' && co.totalMinor === 18515)
check('line items sort by position', co.items.map((i) => i.variantId).join(',') === 'v-rose-90,v-milk-90',
  co.items.map((i) => i.variantId).join(','))
check('a null carrier becomes empty strings, never null',
  rowToCustomerOrder({ ...orderRow, carrier_en: null, carrier_ar: null }, []).carrier.en === '')

const titleOf = (id) => ({ 'v-rose-90': { en: 'Rose', ar: 'ورد' }, 'v-milk-90': { en: 'Milk', ar: 'حليب' } })[id]
const ow = rowToOwnerOrder(orderRow, itemRows, { name_en: 'Layla', name_ar: 'ليلى' }, titleOf)
check('the console summary is built from real line items', ow.items.en === '1 × Rose, 2 × Milk', ow.items.en)
check('the console qty is the sum of the lines', ow.qty === 3, String(ow.qty))
check('the console stage follows the status', ow.stage === 4, String(ow.stage))
check('an absent department is absent, not an empty object', !('department' in ow))

// An order that never had line items falls back to its stored summary.
const legacy = rowToOwnerOrder(
  { ...orderRow, items_summary_en: '12 × Assorted', items_summary_ar: '١٢ × مشكّل', qty: 12 }, [], null, titleOf)
check('a summary-only order uses its stored summary', legacy.items.en === '12 × Assorted', legacy.items.en)
check('and its stored qty', legacy.qty === 12, String(legacy.qty))
check('an unknown customer shows a dash, not "undefined"', legacy.customer.en === '—', legacy.customer.en)

const cancelled = rowToOwnerOrder({ ...orderRow, status: 'cancelled' }, itemRows, null, titleOf)
check('a cancelled order carries the flag the console reads', cancelled.cancelled === true)

const custRow = {
  id: 'c-1', profile_id: null, name_en: 'Layla', name_ar: 'ليلى', email: null, phone: null,
  kind: 'MEGA', tier: 'gold', spend_minor: '420000', member_since: null, created_at: 'a', updated_at: 'b',
}
// OwnerCustomer.type is only B2C|B2B, so a MEGA account must fold into B2B rather
// than leak a third value the console cannot render.
check('a MEGA customer folds to B2B for the console', rowToOwnerCustomer(custRow, 4).type === 'B2B')
check('spend comes back a number', rowToOwnerCustomer(custRow, 4).spendMinor === 420000)
check('the order count is passed through, not guessed', rowToOwnerCustomer(custRow, 4).orders === 4)

await server.close()
console.log('')
if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1) }
console.log('✓ all order invariants hold')
