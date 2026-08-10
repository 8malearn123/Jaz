// Mega Business · Export workspace verification: renders each tab's real panel
// (bypassing the auth gate) in English and Arabic, asserting expected content.
import { createServer } from 'vite'
import { checkPdfCoverage } from './pdf-items.mjs'

const EN = [
  ['overview', ['Gulf Export Partners', 'Open shipments', 'Export by market', 'Order draft', 'Export compliance']],
  ['catalog', ['Volume pricing', 'Assorted bar pallet', 'Bulk couverture', 'Per truck', 'Add MOQ']],
  ['orders', ['MEX-4021', 'Hamburg', 'Incoterm', 'export orders']],
  ['shipments', ['MEX-4021', 'In cold transit', 'pallets']],
  ['finance', ['Available', 'Outstanding', 'Statements', 'Export invoices', 'Export compliance']],
  // Company = the partner's entity file (this portal had no surface for it at all),
  // ending on a summary of the distributor file
  ['company', ['Legal entity', 'Gulf Export Partners', 'Export compliance',
    'Distributor file', 'Export distributor', 'required answers still missing',
    'Open the file', 'Request a change']],
  // Distributor file = its own tab, on the export side. Jaz writes it; the partner reads it.
  ['file', ['Jaz declares',
    'Distributor margin structure', 'Territory exclusivity model', 'HS codes', 'Duty-free merchandising',
    'Markets covered', 'Food import licence no.', 'Port of entry',
    'Loading table', 'PLT-ASSORTED']],
]

// The partner may not rewrite its own trading terms.
const READ_ONLY_LEAKS = ['>Edit<', 'Send for review', 'تعديل<', 'إرسال للمراجعة']

const AR = [
  ['overview', ['شحنات مفتوحة', 'التصدير حسب السوق', 'مسودّة الطلب', 'امتثال التصدير']],
  ['catalog', ['تسعير الكمية', 'طبلية ألواح مشكّلة']],
  ['orders', ['هامبورغ', 'الوجهة']],
  ['finance', ['كشوف الحساب', 'فواتير التصدير', 'المتاح']],
  ['company', ['الكيان القانوني', 'ملف الموزّع', 'فتح الملف', 'طلب تعديل']],
  ['file', ['تُعلن جاز', 'هيكل هامش الموزّع', 'الرموز الجمركية', 'العرض في الأسواق الحرّة',
    'الأسواق المغطّاة', 'ميناء الوصول', 'جدول التحميل']],
]

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let failures = 0

function check(label, html, markers) {
  const missing = markers.filter((m) => !html.includes(m))
  const ok = missing.length === 0 && html.length > 2000
  console.log(`${ok ? '✓' : '✗'}  ${label.padEnd(24)} ${html.length} chars${ok ? '' : `  MISSING: ${missing.join(' | ')}`}`)
  if (!ok) failures++
}

function checkReadOnly(label, html) {
  const leaks = READ_ONLY_LEAKS.filter((m) => html.includes(m))
  const ok = leaks.length === 0
  console.log(`${ok ? '✓' : '✗'}  ${label.padEnd(24)} read-only${ok ? '' : `  LEAKED: ${leaks.join(' | ')}`}`)
  return ok ? 0 : 1
}

try {
  const { renderMega } = await vite.ssrLoadModule('/scripts/mega-harness.tsx')

  console.log('— English —')
  for (const [tab, markers] of EN) {
    try { check(`en /${tab}`, renderMega(`/mega?tab=${tab}`), markers) }
    catch (err) { failures++; console.log(`✗  en /${tab} THREW: ${err?.message ?? err}`) }
  }

  // Force Arabic by stubbing a window/localStorage the providers read at render time.
  // every distributor requirement from the brief must be on the file tab
  failures += checkPdfCoverage('en /file coverage', renderMega('/mega?tab=file'))
  failures += checkReadOnly('en /file', renderMega('/mega?tab=file'))

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
  failures += checkPdfCoverage('ar /file coverage', renderMega('/mega?tab=file'), 'ar')
  failures += checkReadOnly('ar /file', renderMega('/mega?tab=file'))
} finally {
  await vite.close()
}

if (failures > 0) { console.error(`\n${failures} check(s) failed.`); process.exit(1) }
console.log('\nAll mega workspace panels rendered with expected content (EN + AR).')
