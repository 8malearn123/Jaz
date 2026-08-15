// Accounting verification: the invariants that make the books worth reading.
//
// This does not render a screen. It rebuilds the very book the console builds — same seed,
// same posting rules, same numbering — and checks the things that must be true of any
// ledger: entries balance, the trial balance agrees, the balance sheet equation holds, the
// control accounts equal their subledgers, closing a period moves exactly the profit into
// equity, and a reversal genuinely undoes its original.
//
// It also checks the book against the figures the console showed before it had a ledger,
// so the accounting layer can never quietly disagree with the rest of the app.
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let fails = 0

const money = (minor) => `${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function check(name, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'}  ${name.padEnd(52)} ${detail}`)
  if (!ok) fails++
}
const eq = (name, a, b, unit = '') =>
  check(name, a === b, a === b ? `${money(a)}${unit}` : `EXPECTED ${money(b)}${unit}, GOT ${money(a)}${unit} (off by ${money(a - b)})`)

try {
  const { ACC, chartOfAccounts, VAT_RATE, splitVatInclusive } = await vite.ssrLoadModule('/src/data/coa.ts')
  const { entryProblems, linesCredit, linesDebit, makeEntry, reversalLines } = await vite.ssrLoadModule('/src/data/ledger.ts')
  const seed = await vite.ssrLoadModule('/src/data/ledgerSeed.ts')
  const A = await vite.ssrLoadModule('/src/lib/accounting.ts')
  const { finBase, receivables, wasteLog } = await vite.ssrLoadModule('/src/data/ownerFinance.ts')
  const { purchaseInvoices } = await vite.ssrLoadModule('/src/data/ownerSupply.ts')
  const { fixedAssetsSeed, accumulatedAfter, monthlyDepreciation } = await vite.ssrLoadModule('/src/data/fixedAssets.ts')

  const drafts = seed.buildOpeningJournal()
  const { entries } = seed.openingBook()
  const accounts = chartOfAccounts

  console.log('\n— The book —')
  check('Every draft became a posted entry', entries.length === drafts.length, `${entries.length} of ${drafts.length}`)
  check('The book is not empty', entries.length > 0, `${entries.length} entries`)

  const unbalanced = entries.filter((e) => linesDebit(e.lines) !== linesCredit(e.lines))
  check('Every entry balances', unbalanced.length === 0, unbalanced.map((e) => e.no).join(', ') || 'all')

  const invalid = entries.filter((e) => entryProblems(e.lines).length > 0)
  check('Every entry passes the posting rules', invalid.length === 0, invalid.map((e) => e.no).join(', ') || 'all')

  const unknown = entries.flatMap((e) => e.lines).filter((l) => !accounts.some((a) => a.code === l.accountCode && a.postable))
  check('Every line names a postable account', unknown.length === 0, unknown.map((l) => l.accountCode).join(', ') || 'all')

  const bothSides = entries.flatMap((e) => e.lines).filter((l) => l.debitMinor > 0 && l.creditMinor > 0)
  check('No line carries a debit and a credit', bothSides.length === 0)

  console.log('\n— Trial balance —')
  const tb = A.trialBalance(accounts, entries)
  eq('Debits equal credits', tb.totalDebitMinor, tb.totalCreditMinor)
  check('The trial balance reports itself in balance', tb.balanced === true, `${tb.rows.length} accounts`)

  console.log('\n— Balance sheet —')
  const bs = A.balanceSheet(accounts, entries)
  eq('Assets = liabilities + equity', bs.totalAssetsMinor, bs.totalLiabilitiesAndEquityMinor)
  check('The sheet reports itself in balance', bs.balanced === true, `assets ${money(bs.totalAssetsMinor)}`)

  console.log('\n— Control accounts —')
  const ar = A.controlCheck(accounts, entries, ACC.receivables, seed.receivablesSubledgerMinor)
  const ap = A.controlCheck(accounts, entries, ACC.payables, seed.payablesSubledgerMinor)
  eq('Trade receivables = the collection list', ar.controlMinor, ar.subledgerMinor)
  eq('Trade payables = the unpaid supplier invoices', ap.controlMinor, ap.subledgerMinor)
  eq(
    'The collection list is what finance shows',
    seed.receivablesSubledgerMinor,
    receivables.reduce((s, r) => s + r.outstandingMinor, 0),
  )
  eq(
    'The payables list is the unmatched invoices',
    seed.payablesSubledgerMinor,
    purchaseInvoices.filter((i) => i.match !== 'matched').reduce((s, i) => s + i.totalMinor, 0),
  )

  console.log('\n— Agreement with the rest of the console —')
  const pnl = A.incomeStatement(accounts, entries)
  eq('Revenue matches the executive overview', pnl.netRevenueMinor, finBase.revenueMinor)
  eq('Cost of goods sold matches it too', pnl.cogsMinor, finBase.cogsMinor)
  eq('Waste matches the waste log', A.balanceOf(accounts, entries, ACC.waste), finBase.wasteMinor)
  eq('The waste log adds up to the same figure', wasteLog.reduce((s, w) => s + w.lossMinor, 0), finBase.wasteMinor)
  eq('Gross profit is revenue less cost', pnl.grossProfitMinor, finBase.revenueMinor - finBase.cogsMinor)

  console.log('\n— VAT —')
  const vat = A.vatReturn(accounts, entries)
  eq('Net tax = output less input', vat.netTaxMinor, vat.outputTaxMinor - vat.inputTaxMinor)
  check('The rate on the return is the statutory one', vat.rate === VAT_RATE, `${vat.rate}%`)
  // Every purchase invoice's tax was split off it, so the input tax must be the sum of those splits.
  eq(
    'Input tax = the tax inside the supplier invoices',
    vat.inputTaxMinor,
    purchaseInvoices.reduce((s, i) => s + splitVatInclusive(i.totalMinor).vatMinor, 0),
  )
  check('Output tax exceeds input tax', vat.outputTaxMinor > vat.inputTaxMinor, `${money(vat.outputTaxMinor)} vs ${money(vat.inputTaxMinor)}`)

  console.log('\n— Cash —')
  const cf = A.cashFlow(accounts, entries)
  const cashBalance = accounts.filter((a) => a.cash).reduce((s, a) => s + A.balanceOf(accounts, entries, a.code), 0)
  eq('Closing cash = the cash accounts’ balances', cf.closingCashMinor, cashBalance)
  check('Cash is not overdrawn', cashBalance >= 0, money(cashBalance))

  console.log('\n— Fixed assets —')
  const openingAccum = fixedAssetsSeed.reduce((s, a) => s + accumulatedAfter(a, a.openingMonths), 0)
  const oneRun = fixedAssetsSeed.reduce((s, a) => s + monthlyDepreciation(a), 0)
  eq('Depreciation charged = one run for the period', A.balanceOf(accounts, entries, ACC.depreciation), oneRun)
  eq('Accumulated = opening plus that run', A.balanceOf(accounts, entries, ACC.accumDepreciation), openingAccum + oneRun)
  const overRun = fixedAssetsSeed.filter((a) => accumulatedAfter(a, a.lifeMonths) !== a.costMinor)
  check('Every asset lands exactly on nil at end of life', overRun.length === 0, overRun.map((a) => a.id).join(', ') || 'all')

  console.log('\n— Reversal —')
  // Reverse the last sale in the book and prove the pair nets to nothing on every account.
  const target = entries.find((e) => e.source === 'sale')
  const reversal = makeEntry({
    date: target.date,
    source: 'reversal',
    sourceRef: target.sourceRef,
    memo: { en: 'test', ar: 'اختبار' },
    lines: reversalLines(target.lines),
  }, 9000)
  const withReversal = [...entries, reversal]
  const touched = [...new Set(target.lines.map((l) => l.accountCode))]
  const unchanged = touched.every((code) =>
    A.balanceOf(accounts, withReversal, code) ===
    A.balanceOf(accounts, entries.filter((e) => e.id !== target.id), code))
  check('A reversal cancels its original on every account', unchanged, `${target.no}, ${touched.length} accounts`)
  const tbAfter = A.trialBalance(accounts, withReversal)
  check('The book still balances after a reversal', tbAfter.balanced === true)

  console.log('\n— Period close —')
  const closing = A.closingLines(accounts, entries)
  check('The closing entry balances', linesDebit(closing) === linesCredit(closing), `${money(linesDebit(closing))}`)
  const closed = [...entries, makeEntry({
    date: '2026-07-28',
    source: 'closing',
    sourceRef: 'CLOSE-2026-07',
    memo: { en: 'close', ar: 'إقفال' },
    lines: closing,
  }, 9001)]
  const pnlAfter = A.incomeStatement(accounts, closed)
  eq('Income statement reads nil after the close', pnlAfter.netProfitMinor, 0)
  eq('Net revenue reads nil after the close', pnlAfter.netRevenueMinor, 0)
  eq(
    'Retained earnings moved by exactly the profit',
    A.balanceOf(accounts, closed, ACC.retained) - A.balanceOf(accounts, entries, ACC.retained),
    pnl.netProfitMinor,
  )
  eq('The income summary is left at nil', A.balanceOf(accounts, closed, ACC.incomeSummary), 0)
  const bsAfter = A.balanceSheet(accounts, closed)
  eq('The sheet still balances after the close', bsAfter.totalAssetsMinor, bsAfter.totalLiabilitiesAndEquityMinor)
  eq('Total assets are unchanged by the close', bsAfter.totalAssetsMinor, bs.totalAssetsMinor)

  console.log('\n— Aging —')
  const agingReport = A.aging(receivables.map((r) => ({
    id: r.id, party: r.account, amountMinor: r.outstandingMinor, daysLate: r.daysLate,
  })))
  eq('The bands add up to the total', agingReport.buckets.reduce((s, b) => s + b.amountMinor, 0), agingReport.totalMinor)
  eq('The aging total equals the control account', agingReport.totalMinor, A.balanceOf(accounts, entries, ACC.receivables))

  console.log('\n— The screens —')
  // Every accounting sub-view rendered server-side in both languages, signed in as the
  // owner. A panel that throws — a missing provider, a bad reduce — fails here.
  const store = {}
  const sess = {}
  globalThis.window = {
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v) }, removeItem: (k) => { delete store[k] } },
    sessionStorage: { getItem: (k) => sess[k] ?? null, setItem: (k, v) => { sess[k] = String(v) }, removeItem: (k) => { delete sess[k] } },
  }
  const { renderAdmin } = await vite.ssrLoadModule('/scripts/owner-harness.tsx')

  const VIEWS = [
    ['chart', { en: 'Chart of accounts', ar: 'دليل الحسابات' }],
    ['journal', { en: 'Journal', ar: 'دفتر اليومية' }],
    ['ledger', { en: 'General ledger', ar: 'الأستاذ العام' }],
    ['trial', { en: 'Trial balance', ar: 'ميزان المراجعة' }],
    ['statements', { en: 'Financial statements', ar: 'القوائم المالية' }],
    ['vat', { en: 'Value added tax', ar: 'ضريبة القيمة المضافة' }],
    ['aging', { en: 'Receivables &amp; payables', ar: 'الذمم المدينة والدائنة' }],
    ['assets', { en: 'Fixed assets', ar: 'الأصول الثابتة' }],
    ['close', { en: 'Period close', ar: 'إقفال الفترة' }],
    ['centers', { en: 'Cost centres', ar: 'مراكز التكلفة' }],
    ['entries', { en: 'Cost centre entries', ar: 'قيود مراكز التكلفة' }],
    ['reports', { en: 'Cost centre reports', ar: 'تقارير مراكز التكلفة' }],
  ]

  for (const locale of ['en', 'ar']) {
    for (const [view, marker] of VIEWS) {
      for (const k in store) delete store[k]
      for (const k in sess) delete sess[k]
      store['jaz.role'] = 'owner'
      store['jaz.authed'] = '1'
      store['jaz.locale'] = locale
      sess['jaz.mfa.owner'] = '1'
      let html = ''
      let threw = null
      try {
        html = renderAdmin(`/admin?section=owner_accounting&sub=${view}`)
      } catch (e) {
        threw = e
      }
      check(
        `${locale} ${view}`,
        threw === null && html.includes(marker[locale]),
        threw ? `THREW ${threw.message}` : html.includes(marker[locale]) ? `${html.length}c` : `MISSING[${marker[locale]}] ${html.length}c`,
      )
    }
  }

  console.log(`\n${fails === 0 ? '✓ all accounting invariants hold' : `✗ ${fails} check(s) failed`}`)
} catch (err) {
  console.error(err)
  fails++
} finally {
  await vite.close()
}

process.exit(fails === 0 ? 0 : 1)
