// Targeted SSR render: seeds a persona via stubbed localStorage so role-gated
// portals (OrgAdminPortal, ApproverWorkspace, admin, …) actually mount.
// Usage: node scripts/smoke-role.mjs <roleId> [route ...]
import { createServer } from 'vite'

const role = process.argv[2] || 'b2b_admin'
const routes = process.argv.slice(3)
if (routes.length === 0) {
  routes.push('/business', '/business?tab=team', '/business?tab=credit', '/business?tab=orders', '/business?tab=quotes', '/business?tab=gifting', '/business?tab=settings')
}

// Minimal browser stubs so ChannelProvider reads the seeded role as a signed-in session.
const store = new Map([['jaz.role', role], ['jaz.authed', '1']])
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
globalThis.window = {
  localStorage,
  sessionStorage: localStorage,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {}, removeEventListener() {}, scrollTo() {},
  location: { href: '', pathname: '/' },
}
globalThis.localStorage = localStorage
globalThis.sessionStorage = localStorage

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let failures = 0
try {
  const { render } = await vite.ssrLoadModule('/scripts/ssr-entry.tsx')
  console.log(`Persona: ${role}\n`)
  for (const route of routes) {
    try {
      const html = render(route)
      const ok = typeof html === 'string' && html.length > 120
      console.log(`${ok ? '✓' : '✗'}  ${route.padEnd(30)} ${html.length} chars`)
      if (!ok) failures++
    } catch (err) {
      failures++
      console.log(`✗  ${route.padEnd(30)} THREW: ${err?.stack ?? err}`)
    }
  }
} finally {
  await vite.close()
}
if (failures > 0) { console.error(`\n${failures} route(s) failed.`); process.exit(1) }
console.log('\nAll routes rendered cleanly.')
