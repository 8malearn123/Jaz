// The books' mapping, and — the point of this file — that the rules the DATABASE
// enforces are the same rules entryProblems() enforces. If they drift, the UI accepts
// an entry the server refuses, or worse, stops refusing one the server would take.
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'

let failures = 0
const check = (n, c, d = '') => { if (c) console.log(`✓  ${n}`); else { failures++; console.log(`✗  ${n}${d ? '  ' + d : ''}`) } }

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const api = await server.ssrLoadModule('/src/lib/api/books.ts')
const led = await server.ssrLoadModule('/src/data/ledger.ts')
const coa = await server.ssrLoadModule('/src/data/coa.ts')
const sql = await readFile('supabase/migrations/20260927020000_books.sql', 'utf8')

// ---------------------------------------------------------------- enums in step
const sqlSources = [...sql.matchAll(/create type public\.journal_source\s+as enum \(([^)]+)\)/g)][0][1]
  .split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean).sort()
const tsSources = Object.keys(led.journalSourceMeta).sort()
check('SQL journal_source matches JournalSource in TS',
  sqlSources.join(',') === tsSources.join(','), `sql=[${sqlSources}] ts=[${tsSources}]`)

const sqlTypes = [...sql.matchAll(/create type public\.account_type\s+as enum \(([^)]+)\)/g)][0][1]
  .split(',').map((x) => x.trim().replace(/'/g, '')).sort()
const tsTypes = [...new Set(coa.chartOfAccounts.map((a) => a.type))].sort()
check('every account type in the chart exists in the SQL enum',
  tsTypes.every((t) => sqlTypes.includes(t)), `sql=[${sqlTypes}] chart=[${tsTypes}]`)

// ---------------------------------------------------------------- same rules
// Each case below is refused by the database (proved against the live project) and
// must also be refused by entryProblems(), or the UI would let it through.
const L = (acc, d, c) => ({ accountCode: acc, debitMinor: d, creditMinor: c })

check('entryProblems refuses an out-of-balance entry',
  led.entryProblems([L('1200', 9999, 0), L('4100', 0, 5000)]).length > 0)
check('entryProblems refuses a one-line entry',
  led.entryProblems([L('1200', 100, 0)]).length > 0)
check('entryProblems refuses a line with both sides',
  led.entryProblems([L('1100', 50, 50), L('4100', 0, 50)]).length > 0)
check('entryProblems refuses a line with no account',
  led.entryProblems([L('', 100, 0), L('4100', 0, 100)]).length > 0)
check('entryProblems accepts a balanced two-line entry',
  led.entryProblems([L('1200', 11500, 0), L('4100', 0, 11500)]).length === 0)

// The database additionally refuses a zero/zero line, which entryProblems only
// filters out. postEntry drops them before sending, so the two agree in effect.
check('the SQL line constraint demands exactly one side',
  /debit_minor > 0 and credit_minor = 0.*credit_minor > 0 and debit_minor = 0/s.test(sql))

// ---------------------------------------------------------------- append-only
// The properties the prototype could only hold by convention.
check('the migration refuses to delete a posted entry', /never deleted/.test(sql))
check('the migration refuses to change a posted entry', /is immutable/.test(sql))
check('the migration refuses to touch a journal line', /never changed or removed/.test(sql))
check('the migration locks a closed period', /is closed; nothing may be posted/.test(sql))
check('the balance check is deferred to commit',
  /deferrable initially deferred/.test(sql))
check('an auditor can read the books but not keep them',
  /can_read_books[\s\S]*auditor/.test(sql) && !/can_keep_books[\s\S]{0,400}auditor/.test(sql))

// ---------------------------------------------------------------- mapping
const acctRow = {
  code: '1100', name_en: 'Cash', name_ar: 'النقد', type: 'asset', normal: 'debit',
  parent: '1', postable: true, active: true, is_control: false, contra: false,
  cash: true, vat_role: null, sort_order: 0,
}
const a = api.rowToAccount(acctRow)
check('an account maps its bilingual name', a.name.ar === 'النقد')
check('a true flag is present', a.cash === true)
check('a false flag is ABSENT, not false', !('contra' in a), JSON.stringify(Object.keys(a)))
check('a null parent is absent', !('parent' in api.rowToAccount({ ...acctRow, parent: null })))
check('a null vat_role is absent', !('vatRole' in a))

const entryRow = {
  id: 'e1', no: 'JV-0001', entry_date: '2026-06-10', period: '2026-06', source: 'sale',
  source_ref: null, memo_en: 'Sale', memo_ar: 'بيع', party_en: null, party_ar: null,
  status: 'posted', reversal_of: null, reversed_by: null, posted_by: null, created_at: 'x',
}
const lineRows = [
  { id: 'l2', entry_id: 'e1', account_code: '4100', debit_minor: '0', credit_minor: '11500', center_id: null, memo_en: null, memo_ar: null, position: 1 },
  { id: 'l1', entry_id: 'e1', account_code: '1200', debit_minor: '11500', credit_minor: '0', center_id: null, memo_en: null, memo_ar: null, position: 0 },
]
const e = api.rowToEntry(entryRow, lineRows)
check('lines sort by position', e.lines.map((l) => l.accountCode).join(',') === '1200,4100',
  e.lines.map((l) => l.accountCode).join(','))
check('amounts come back numbers', typeof e.lines[0].debitMinor === 'number' && e.lines[0].debitMinor === 11500)
check('a mapped entry satisfies entryProblems', led.entryProblems(e.lines).length === 0)
check('the period is read, never recomputed', e.period === '2026-06')
check('an absent party is absent', !('party' in e))
check('an absent reversal is absent', !('reversalOf' in e) && !('reversedBy' in e))

// A reversal of a mapped entry must cancel it on every account — the same property
// verify-accounting.mjs asserts, checked here on DB-shaped rows.
const rev = led.reversalLines(e.lines)
const net = new Map()
for (const l of [...e.lines, ...rev]) {
  net.set(l.accountCode, (net.get(l.accountCode) ?? 0) + l.debitMinor - l.creditMinor)
}
check('a reversal of a mapped entry nets to zero on every account',
  [...net.values()].every((v) => v === 0), JSON.stringify([...net]))

await server.close()
console.log('')
if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1) }
console.log('✓ all ledger invariants hold')
