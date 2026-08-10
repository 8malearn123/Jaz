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
  // The export partner is in the directory too — otherwise the export distributor
  // file has no profile to be maintained from.
  ['owner_vendors', ['Vendors &amp; credit', 'Outstanding', 'Payment', 'Gulf Export Partners']],
  ['owner_export', ['Export clients', 'EX-3081', 'Dubai']],
]
const OWNER_AR = [
  ['owner_exec', ['النظرة التنفيذية', 'الإيراد حسب القناة']],
  ['owner_orders', ['صندوق الطلبات', 'B2B ضخم']],
  ['owner_supply', ['سلسلة الإمداد', 'المواد الخام']],
  ['owner_customers', ['العملاء والولاء']],
]
try {
  const { renderAdmin, renderFile } = await vite.ssrLoadModule('/scripts/owner-harness.tsx')

  console.log('— Security gates —')
  setup({ role: 'customer' }); check('customer → Restricted', renderAdmin('/admin'), { has: ['does not have access'], hasnt: ['Executive', 'Credit approvals'] })
  setup({ role: 'b2b' }); check('b2b → Restricted', renderAdmin('/admin'), { has: ['does not have access'], hasnt: ['Supply chain'] })
  setup({ role: 'owner', mfa: false }); check('owner (no MFA) → StepUpGate', renderAdmin('/admin?section=owner_exec'), { has: ['Step-up verification'], hasnt: ['Executive overview', 'Supply chain'] })
  setup({ role: 'owner', mfa: true }); check('owner → no governance leak', renderAdmin('/admin?section=owner_exec'), { hasnt: ['Credit approvals', 'Users &amp; roles', 'Audit &amp; consent'] })
  setup({ role: 'admin', mfa: true }); check('admin → no owner leak', renderAdmin('/admin'), { has: ['Credit approvals'], hasnt: ['Supply chain', 'Export clients'] })
  setup({ role: 'owner', mfa: true }); check('owner ?section=users clamp', renderAdmin('/admin?section=users'), { hasnt: ['Users &amp; roles'] })
  setup({ role: 'support_agent' }); check('support ?section=owner_orders clamp', renderAdmin('/admin?section=owner_orders'), { hasnt: ['Orders inbox'] })

  // Accounts directory — every account's distributor file is reviewable from its record
  console.log('\n— Accounts · distributor file (admin + MFA) —')
  setup({ role: 'admin', mfa: true, locale: 'en' })
  check('en /accounts', renderAdmin('/admin?section=accounts'), {
    has: ['Najd Hospitality Group', 'Gulf Export Partners', 'file 72%', 'file 78%', 'not started'],
  })
  setup({ role: 'admin', mfa: true, locale: 'ar' })
  check('ar /accounts', renderAdmin('/admin?section=accounts'), {
    has: ['شركاء الخليج للتصدير', 'لم يبدأ'],
  })

  // Who may rewrite the distributor file. One component, one flag: the owner's copy
  // carries the section editor, everyone else's carries the same terms without it.
  console.log('\n— Distributor file · edit rights —')
  setup({ role: 'owner', mfa: true, locale: 'en' })
  for (const ch of ['horeca', 'export']) {
    check(`${ch} · owner may edit`, renderFile(ch, true), { has: ['Jaz declares', '>Edit<'] })
    check(`${ch} · read-only`, renderFile(ch, false), { has: ['Jaz declares'], hasnt: ['>Edit<'] })
  }

  // The owner's own way in: a Distributor files screen under Vendors, editable in place.
  setup({ role: 'owner', mfa: true, locale: 'en' })
  check('en owner files screen', renderAdmin('/admin?section=owner_vendors&sub=files'), {
    has: ['Distributor files', 'Najd Hospitality Group', 'Gulf Export Partners', 'Jaz declares', 'Distributor margin structure', 'Loading table', '>Edit<'],
  })
  setup({ role: 'owner', mfa: true, locale: 'ar' })
  check('ar owner files screen', renderAdmin('/admin?section=owner_vendors&sub=files'), {
    has: ['ملفات الموزّعين', 'تُعلن جاز', 'هيكل هامش الموزّع', 'جدول التحميل', 'تعديل'],
  })

  console.log('\n— Owner panels · English (owner + MFA) —')
  for (const [sec, has] of OWNER_EN) { setup({ role: 'owner', mfa: true, locale: 'en' }); check(`en /${sec}`, renderAdmin(`/admin?section=${sec}`), { has }) }

  console.log('\n— Owner panels · Arabic (RTL) —')
  for (const [sec, has] of OWNER_AR) { setup({ role: 'owner', mfa: true, locale: 'ar' }); check(`ar /${sec}`, renderAdmin(`/admin?section=${sec}`), { has }) }
} catch (e) { console.log('THREW:', e?.stack ?? e); fails++ } finally { await vite.close() }
console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll owner security gates + panels verified ✓')
process.exit(fails ? 1 : 0)
