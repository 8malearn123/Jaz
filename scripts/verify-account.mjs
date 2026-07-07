// Signed-in Customer account verification: renders each account tab's real panel
// (bypassing the auth gate) in English and Arabic, asserting expected content.
import { createServer } from 'vite'

const EN = [
  ['overview', ['Live tracking', 'Wallet balance', 'days left', 'Reorder']],
  ['orders', ['Report an issue', 'JAZ-2026-118540', 'Invoice']],
  ['loyalty', ['Redeem points for a discount code', 'Points history', 'Lifetime spend']],
  ['subscriptions', ['The Maison Monthly']],
  ['addresses', ['Gift addresses', 'Sara Al-Ahmadi', 'Anonymous', 'Add recipient']],
  ['wishlist', ['Occasions diary', 'Sold out', 'Add occasion']],
  ['privacy', ['Basic details', 'Export my data', 'Request erasure']],
]

const AR = [
  ['overview', ['تتبّع حيّ', 'رصيد المحفظة']],
  ['loyalty', ['استبدل النقاط بكود خصم', 'سجل النقاط']],
  ['addresses', ['عناوين الإهداء', 'مجهول الهوية']],
  ['wishlist', ['مفكرة المناسبات', 'نفد المخزون', 'إضافة مناسبة']],
  ['privacy', ['البيانات الأساسية', 'تصدير بياناتي']],
]

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let failures = 0

function check(label, html, markers) {
  const missing = markers.filter((m) => !html.includes(m))
  const ok = missing.length === 0 && html.length > 2000
  console.log(`${ok ? '✓' : '✗'}  ${label.padEnd(24)} ${html.length} chars${ok ? '' : `  MISSING: ${missing.join(' | ')}`}`)
  if (!ok) failures++
}

try {
  const { renderAccount } = await vite.ssrLoadModule('/scripts/account-harness.tsx')

  console.log('— English —')
  for (const [tab, markers] of EN) {
    try { check(`en /${tab}`, renderAccount(`/account?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  en /${tab} THREW: ${err?.message ?? err}`) }
  }

  // Force Arabic by stubbing a window/localStorage the providers read at render time.
  globalThis.window = {
    localStorage: {
      store: { 'jaz.locale': 'ar', 'jaz.role': 'customer', 'jaz.authed': '1' },
      getItem(k) { return this.store[k] ?? null },
      setItem() {}, removeItem() {},
    },
  }

  console.log('\n— Arabic (RTL) —')
  for (const [tab, markers] of AR) {
    try { check(`ar /${tab}`, renderAccount(`/account?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  ar /${tab} THREW: ${err?.message ?? err}`) }
  }
} finally {
  await vite.close()
}

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1) }
console.log('\nAll account panels rendered with expected content (EN + AR).')
