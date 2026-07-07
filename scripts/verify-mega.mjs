// Mega Business · Export workspace verification: renders each tab's real panel
// (bypassing the auth gate) in English and Arabic, asserting expected content.
import { createServer } from 'vite'

const EN = [
  ['overview', ['Gulf Export Partners', 'Open shipments', 'Export by market', 'Order draft', 'Export compliance']],
  ['catalog', ['Volume pricing', 'Assorted bar pallet', 'Bulk couverture', 'Per truck', 'Add MOQ']],
  ['orders', ['MEX-4021', 'Hamburg', 'Incoterm', 'export orders']],
  ['shipments', ['MEX-4021', 'In cold transit', 'pallets']],
  ['finance', ['Available', 'Outstanding', 'Statements', 'Export invoices', 'Export compliance']],
]

const AR = [
  ['overview', ['شحنات مفتوحة', 'التصدير حسب السوق', 'مسودّة الطلب', 'امتثال التصدير']],
  ['catalog', ['تسعير الكمية', 'طبلية ألواح مشكّلة']],
  ['orders', ['هامبورغ', 'الوجهة']],
  ['finance', ['كشوف الحساب', 'فواتير التصدير', 'المتاح']],
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
  const { renderMega } = await vite.ssrLoadModule('/scripts/mega-harness.tsx')

  console.log('— English —')
  for (const [tab, markers] of EN) {
    try { check(`en /${tab}`, renderMega(`/mega?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  en /${tab} THREW: ${err?.message ?? err}`) }
  }

  // Force Arabic by stubbing a window/localStorage the providers read at render time.
  globalThis.window = {
    localStorage: {
      store: { 'jaz.locale': 'ar', 'jaz.role': 'mega_business', 'jaz.authed': '1' },
      getItem(k) { return this.store[k] ?? null },
      setItem() {}, removeItem() {},
    },
  }

  console.log('\n— Arabic (RTL) —')
  for (const [tab, markers] of AR) {
    try { check(`ar /${tab}`, renderMega(`/mega?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  ar /${tab} THREW: ${err?.message ?? err}`) }
  }
} finally {
  await vite.close()
}

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1) }
console.log('\nAll mega workspace panels rendered with expected content (EN + AR).')
