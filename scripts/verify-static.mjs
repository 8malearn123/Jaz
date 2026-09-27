// Does the BUILT site work in a real browser?
//
// Every other suite here runs the components through vite's SSR loader, which proves the
// data and the markup but never executes the bundle a visitor downloads. This one loads
// dist/ over HTTP in Chromium and checks each route actually mounts — the failure it
// exists to catch is a site that builds cleanly, serves 200 on every URL, and renders
// nothing, which is what a broken base path or a missing rewrite looks like.
//
//   npm run smoke:browser                        # against http://127.0.0.1:8088
//   npm run smoke:browser -- http://localhost:5173
//
// Playwright is NOT a dependency of this project — it is a browser download, and the
// other eleven suites need no browser at all. Install it where you want to run this
// (`npm i -D playwright`) and the script picks it up; without it, it says so and stops
// rather than pretending to have checked.
//
// Serving dist/ the way production does, with Apache and the shipped .htaccess:
//
//   a2enmod rewrite headers deflate mime
//   # a vhost on :8088 with DocumentRoot <repo>/dist and AllowOverride All
//   apache2ctl start
//
// The .htaccess forces HTTPS, so requests must carry X-Forwarded-Proto: https or the
// redirect sends the browser to a port that speaks plain HTTP. That header is set below,
// which also exercises the proxy guard in the redirect.

const BASE = process.argv[2] ?? 'http://127.0.0.1:8088'

let chromium
try {
  ({ chromium } = await import('playwright'))
} catch {
  console.log('playwright is not installed here — skipping the browser check.')
  console.log('Install it with `npm i -D playwright` to run this suite.')
  process.exit(0)
}

// Every route in App.tsx, plus three that are not routes at all.
//
// The slugs are real ones from the catalogue. `/product/no-such-bar` and `/no-such-page`
// must render the 404 PAGE — a blank product is a different bug from a route that does
// not resolve, and both come back 200 from a SPA, so only the browser can tell them
// apart. `/admin/accounting/journal` is deliberately not a route: the console switches
// its panels in state, the table is flat, and a deep path under /admin must land on the
// 404 page rather than a blank screen.
//
// `/collections` is a <Navigate> to /gifts, so identical output there is correct.
const ROUTES = [
  '/', '/shop', '/product/signature-milk', '/product/damascena-rose', '/product/no-such-bar',
  '/gifts', '/collections', '/corporate', '/heritage', '/art', '/cart', '/checkout',
  '/account', '/business', '/mega', '/admin', '/signin', '/signup', '/roles',
  '/no-such-page', '/admin/accounting/journal',
]

/** Paths that should land on the 404 page, not on content. */
const SHOULD_BE_404 = new Set(['/product/no-such-bar', '/no-such-page', '/admin/accounting/journal'])

const EXECUTABLE = process.env.CHROMIUM_PATH
const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})
const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-Proto': 'https' } })

let failures = 0
const blockedHosts = new Set()

for (const path of ROUTES) {
  const page = await ctx.newPage()
  const crashes = []
  page.on('pageerror', (e) => crashes.push(e.message.slice(0, 160)))
  page.on('requestfailed', (r) => {
    try { blockedHosts.add(new URL(r.url()).host) } catch { /* opaque url */ }
  })

  let status = 'nav failed'
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 25000 })
    status = res?.status() ?? '—'
  } catch (e) {
    crashes.push(`navigation: ${e.message.slice(0, 120)}`)
  }

  const mounted = await page.$eval('#root', (el) => el.childElementCount).catch(() => 0)
  const chars = ((await page.textContent('body').catch(() => '')) ?? '').trim().length

  // A blocked request is NOT a failure. With Supabase configured but unreachable — a
  // wrong key, a firewall, a paused project — the app is meant to fall back to its seed,
  // and it does: the same routes render the same content. Only an uncaught exception or
  // an empty #root means the page is actually broken.
  const is404 = /melted away|غير موجودة|لم نجد/.test(((await page.textContent('body').catch(() => '')) ?? ''))
  const expected404 = SHOULD_BE_404.has(path)
  const ok = crashes.length === 0 && mounted > 0 && chars > 100 && is404 === expected404
  if (!ok) failures++
  const note = expected404 ? (is404 ? ' → 404 page' : ' → EXPECTED THE 404 PAGE') : (is404 ? ' → UNEXPECTED 404' : '')
  console.log(`${ok ? '✓' : '✗'}  ${String(status).padEnd(4)} mounted=${mounted} chars=${String(chars).padEnd(6)} ${path}${note}`)
  for (const c of crashes) console.log(`      ${c}`)
  await page.close()
}

await browser.close()

console.log('')
if (blockedHosts.size > 0) {
  console.log(`requests that could not be reached from here: ${[...blockedHosts].join(', ')}`)
  console.log('(expected when the database is unreachable — the pages above still rendered)')
  console.log('')
}
if (failures) { console.log(`${failures} route(s) failed.`); process.exit(1) }
console.log(`✓ all ${ROUTES.length} routes mounted and rendered`)
