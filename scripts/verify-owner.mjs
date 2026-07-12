// Owner console verification: (A) the security gates across roles, then
// (B) each owner panel rendered signed-in as owner+MFA, in English and Arabic.
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let fails = 0
const store = {}, sess = {}
globalThis.window = {
  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v) }, removeItem: (k) => { delete store[k] } },
  sessionStorage: { getItem: (k) => sess[k] ?? null, setItem: (k, v) => { sess[k] = String(v) }, removeItem: (k) => { delete sess[k] } },
}
function setup({ role, authed = true, mfa = false, locale = 'en' }) {
  for (const k in store) delete store[k]; for (const k in sess) delete sess[k]
  store['jaz.role'] = role; store['jaz.authed'] = authed ? '1' : '0'; store['jaz.locale'] = locale
  if (mfa) sess['jaz.mfa.' + role] = '1'
}
function check(name, html, { has = [], hasnt = [] }) {
  const miss = has.filter((m) => !html.includes(m)); const leak = hasnt.filter((m) => html.includes(m))
  const ok = miss.length === 0 && leak.length === 0
  console.log(`${ok ? '✓' : '✗'}  ${name.padEnd(34)} ${html.length}c${ok ? '' : `  ${miss.length ? 'MISSING[' + miss.join(', ') + ']' : ''} ${leak.length ? 'LEAK[' + leak.join(', ') + ']' : ''}`}`)
  if (!ok) fails++
}
const OWNER_EN = [
  ['owner_exec', ['Executive overview', 'Revenue by channel', 'Factory capacity', 'Critical alerts']],
  ['owner_orders', ['Orders inbox', 'Pipeline value', 'B2B MEGA', 'JZ-2618']],
  ['owner_supply', ['Supply chain', 'PINV-3312', 'Raw materials', 'Suppliers']],
  ['owner_products', ['Production', 'buildable', 'Dark 70% bar']],
  ['owner_customers', ['Customers &amp; loyalty', 'Loyalty members', 'Najd Hospitality Group']],
  ['owner_catalog', ['Products', 'Dark 70% bar', 'New product']],
  ['owner_vendors', ['Vendors &amp; credit', 'Outstanding', 'Credit limit']],
  ['owner_export', ['Export clients', 'EX-3081', 'Dubai']],
]
const OWNER_AR = [
  ['owner_exec', ['النظرة التنفيذية', 'الإيراد حسب القناة']],
  ['owner_orders', ['صندوق الطلبات', 'B2B ضخم']],
  ['owner_supply', ['سلسلة الإمداد', 'المواد الخام']],
  ['owner_customers', ['العملاء والولاء']],
]
try {
  const { renderAdmin } = await vite.ssrLoadModule('/scripts/owner-harness.tsx')

  console.log('— Security gates —')
  setup({ role: 'customer' }); check('customer → Restricted', renderAdmin('/admin'), { has: ['does not have access'], hasnt: ['Executive', 'Credit approvals'] })
  setup({ role: 'b2b' }); check('b2b → Restricted', renderAdmin('/admin'), { has: ['does not have access'], hasnt: ['Supply chain'] })
  setup({ role: 'owner', mfa: false }); check('owner (no MFA) → StepUpGate', renderAdmin('/admin?section=owner_exec'), { has: ['Step-up verification'], hasnt: ['Executive overview', 'Supply chain'] })
  setup({ role: 'owner', mfa: true }); check('owner → no governance leak', renderAdmin('/admin?section=owner_exec'), { hasnt: ['Credit approvals', 'Users &amp; roles', 'Audit &amp; consent'] })
  setup({ role: 'admin', mfa: true }); check('admin → no owner leak', renderAdmin('/admin'), { has: ['Credit approvals'], hasnt: ['Supply chain', 'Export clients'] })
  setup({ role: 'owner', mfa: true }); check('owner ?section=users clamp', renderAdmin('/admin?section=users'), { hasnt: ['Users &amp; roles'] })
  setup({ role: 'support_agent' }); check('support ?section=owner_orders clamp', renderAdmin('/admin?section=owner_orders'), { hasnt: ['Orders inbox'] })

  console.log('\n— Owner panels · English (owner + MFA) —')
  for (const [sec, has] of OWNER_EN) { setup({ role: 'owner', mfa: true, locale: 'en' }); check(`en /${sec}`, renderAdmin(`/admin?section=${sec}`), { has }) }

  console.log('\n— Owner panels · Arabic (RTL) —')
  for (const [sec, has] of OWNER_AR) { setup({ role: 'owner', mfa: true, locale: 'ar' }); check(`ar /${sec}`, renderAdmin(`/admin?section=${sec}`), { has }) }
} catch (e) { console.log('THREW:', e?.stack ?? e); fails++ } finally { await vite.close() }
console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll owner security gates + panels verified ✓')
process.exit(fails ? 1 : 0)
