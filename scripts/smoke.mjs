// Headless render smoke test: renders every route via Vite SSR and asserts
// each produces meaningful HTML without throwing. No browser required.
import { createServer } from 'vite'

const routes = [
  '/',
  '/shop',
  '/shop?flavor=rose',
  '/product/damascena-rose',
  '/product/signature-milk',
  '/product/orchard-box-250',
  '/product/mountain-box-250',
  '/product/full-library-500',
  '/gifts',
  // The retired URL. Under StaticRouter <Navigate> renders nothing, so this only proves
  // the route still resolves — the redirect itself is a browser/vercel.json concern.
  '/collections',
  '/corporate',
  '/heritage',
  '/art',
  '/cart',
  '/checkout',
  '/account',
  '/account?tab=orders',
  '/account?tab=loyalty',
  '/account?tab=subscriptions',
  '/account?tab=addresses',
  '/account?tab=wishlist',
  '/account?tab=privacy',
  '/business',
  '/business?tab=catalog',
  '/business?tab=orders',
  '/business?tab=quotes',
  '/business?tab=delivery',
  '/business?tab=credit',
  '/business?tab=company',
  '/signin',
  '/signup',
  '/roles',
  '/admin',
  '/this-route-does-not-exist',
]

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let failures = 0
try {
  const { render } = await vite.ssrLoadModule('/scripts/ssr-entry.tsx')
  for (const route of routes) {
    try {
      const html = render(route)
      const ok = typeof html === 'string' && html.length > 120
      console.log(`${ok ? '✓' : '✗'}  ${route.padEnd(34)} ${html.length} chars`)
      if (!ok) failures++
    } catch (err) {
      failures++
      console.log(`✗  ${route.padEnd(34)} THREW: ${err?.message ?? err}`)
    }
  }
} finally {
  await vite.close()
}

if (failures > 0) {
  console.error(`\n${failures} route(s) failed to render.`)
  process.exit(1)
}
console.log('\nAll routes rendered cleanly.')
