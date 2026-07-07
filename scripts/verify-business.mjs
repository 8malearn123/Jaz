// Signed-in B2B portal verification: renders each tab's real panel (bypassing the
// auth gate) in English and Arabic, asserting expected content.
import { createServer } from 'vite'

const EN = [
  // Overview = ordering command center: build zone (matrix + reorder) | order rail (summary + tier ladder + next delivery + account manager)
  ['overview', ['Najd Hospitality Group', 'Available credit', 'Saved with wholesale', 'Quick order matrix', 'Minimum order (MOQ)', 'Total incl. VAT', 'Last order journey', 'Next delivery', 'Delivery schedule', 'Account manager', 'WhatsApp']],
  // Catalog = discovery only (no full matrix/rail; compact review bar)
  ['catalog', ['Catalog &amp; pricing', 'Dark couverture 70%', 'Bulk price', 'Review order']],
  ['orders', ['PO-2026', 'Reorder']],
  ['delivery', ['Delivery', 'Cold chain', 'Scheduled', 'Central warehouse']],
  // Finance = single money home (gauge + spend trend + ledger + statements + invoices + month)
  ['credit', ['Spend', 'Latest invoices', 'ZATCA', 'This month', 'INV-2026']],
  ['company', ['Legal entity', 'Notification preferences', 'Low-stock alerts', 'Central warehouse']],
]

const AR = [
  ['overview', ['الائتمان المتاح', 'وفّرت بالجملة', 'مصفوفة الطلب السريع', 'المجموع الفرعي', 'الإجمالي شامل الضريبة', 'رحلة آخر طلب', 'التوصيل القادم', 'مدير الحساب']],
  ['catalog', ['كوفرتور داكن ٧٠٪', 'سعر الكمية', 'مراجعة الطلب']],
  ['delivery', ['التوصيل', 'سلسلة التبريد', 'الطلبات المجدولة']],
  ['credit', ['أحدث الفواتير', 'متوافقة ZATCA', 'ملخّص الشهر']],
  ['company', ['تفضيلات الإشعارات', 'تنبيهات المخزون المنخفض']],
]

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let failures = 0

function check(label, html, markers) {
  const missing = markers.filter((m) => !html.includes(m))
  const ok = missing.length === 0 && html.length > 2000
  console.log(`${ok ? '✓' : '✗'}  ${label.padEnd(22)} ${html.length} chars${ok ? '' : `  MISSING: ${missing.join(' | ')}`}`)
  if (!ok) failures++
}

try {
  const { renderBusiness } = await vite.ssrLoadModule('/scripts/business-harness.tsx')

  console.log('— English —')
  for (const [tab, markers] of EN) {
    try { check(`en /${tab}`, renderBusiness(`/business?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  en /${tab} THREW: ${err?.message ?? err}`) }
  }

  globalThis.window = {
    localStorage: {
      store: { 'jaz.locale': 'ar', 'jaz.role': 'b2b', 'jaz.authed': '1' },
      getItem(k) { return this.store[k] ?? null },
      setItem() {}, removeItem() {},
    },
  }

  console.log('\n— Arabic (RTL) —')
  for (const [tab, markers] of AR) {
    try { check(`ar /${tab}`, renderBusiness(`/business?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  ar /${tab} THREW: ${err?.message ?? err}`) }
  }
} finally {
  await vite.close()
}

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1) }
console.log('\nAll B2B panels rendered with expected content (EN + AR).')
