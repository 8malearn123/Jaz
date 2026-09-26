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
const seed = await server.ssrLoadModule('/src/data/ledgerSeed.ts')
const book = seed.openingBook()
const sql = await readFile('supabase/migrations/20260927020000_books.sql', 'utf8')
const sqlActor = await readFile('supabase/migrations/20260928000000_books_bilingual_actor.sql', 'utf8')
const sqlAtomic = await readFile('supabase/migrations/20260928010000_post_entry_atomically.sql', 'utf8')
const sqlSeed = await readFile('supabase/migrations/20260928020000_books_seed.sql', 'utf8')
const apiSrc = await readFile('src/lib/api/books.ts', 'utf8')
const ctxSrc = await readFile('src/state/LedgerContext.tsx', 'utf8')
const panelSrc = await readFile('src/pages/admin/owner/OwnerAccounting.tsx', 'utf8')

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
  status: 'posted', reversal_of: null, reversed_by: null,
  posted_by_en: null, posted_by_ar: null, created_at: 'x',
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

/* ── who posted it, in both languages ─────────────────────────────────────── */
// The books shipped with one `posted_by` column while everything else in the schema
// stores a bilingual name as a pair. One column meant an Arabic reader saw an English
// name, so both halves have to survive the round trip.
check('journal_entries stores the poster as a pair',
  /posted_by_en/.test(sqlActor) && /posted_by_ar/.test(sqlActor))
check('accounting_periods stores the closer as a pair',
  /closed_by_en/.test(sqlActor) && /closed_by_ar/.test(sqlActor))
const bilingualBy = api.rowToEntry({ ...entryRow, posted_by_en: 'Finance department', posted_by_ar: 'قسم المالية' }, lineRows)
check('a poster maps to both languages',
  bilingualBy.by?.en === 'Finance department' && bilingualBy.by?.ar === 'قسم المالية',
  JSON.stringify(bilingualBy.by))
check('no poster at all stays absent', !('by' in api.rowToEntry(entryRow, lineRows)))
const closer = api.rowToPeriod({ key: '2026-06', closed: true, closed_at: 'x', closed_by_en: 'Finance department', closed_by_ar: 'قسم المالية' })
check('a closer maps to both languages',
  closer.closedBy?.en === 'Finance department' && closer.closedBy?.ar === 'قسم المالية')

check('the immutable-column list guards BOTH poster columns',
  /new\.posted_by_en, new\.posted_by_ar/.test(sqlActor) && /old\.posted_by_en, old\.posted_by_ar/.test(sqlActor))

/* ── posting is one transaction ───────────────────────────────────────────── */
// postEntry() used to write the header, then the lines, and delete the header if the
// lines were refused. That delete was itself refused by the append-only trigger, so one
// refused posting left a zero-line entry in the journal that nothing could remove.
check('post_journal_entry exists', /create or replace function public\.post_journal_entry/.test(sqlAtomic))
check('it runs as the caller, so RLS and every trigger still apply',
  /security invoker/.test(sqlAtomic))
check('it writes the entry and the lines in one function body',
  /insert into public\.journal_entries[\s\S]*insert into public\.journal_lines/.test(sqlAtomic))
for (const col of ['status', 'period', 'reversed_by', 'created_at']) {
  check(`a caller cannot set ${col} through it`,
    !new RegExp(`p_${col}\\b`).test(sqlAtomic))
}
check('it refuses fewer than two lines by name, not only by constraint',
  /an entry needs at least two lines/.test(sqlAtomic))
check('only authenticated may call it',
  /grant execute on function public\.post_journal_entry[\s\S]*?to authenticated/.test(sqlAtomic)
  && /revoke all on function public\.post_journal_entry[\s\S]*?from public, anon/.test(sqlAtomic))
check('a lineless header can be deleted; one with lines cannot',
  /if exists \(select 1 from public\.journal_lines where entry_id = old\.id\) then[\s\S]*?raise exception 'a posted entry is never deleted/.test(sqlAtomic))
check('postEntry sends the id it minted, so the row carries the entry the console holds',
  /p_id: input\.id/.test(apiSrc) && /id: string/.test(apiSrc))
check('postEntry no longer deletes anything to clean up after itself',
  !/\.delete\(\)/.test(apiSrc))

/* ── a write RLS filters away is a refusal, not a success ─────────────────── */
// An INSERT blocked by WITH CHECK raises; an UPDATE blocked by USING matches no rows and
// reports success. Verified against the live project: an auditor closing a period left it
// open and got no error. Every update therefore asks for its rows back.
for (const fn of ['markReversed', 'setPeriodClosed', 'upsertAccount']) {
  const body = apiSrc.slice(apiSrc.indexOf(`export async function ${fn}`))
    .split('\nexport ')[0]
  check(`${fn} asks the database which rows it touched`, /\.select\(/.test(body))
  check(`${fn} treats zero rows as a refusal`, /tookEffect\(data\)/.test(body))
}
check('the refusal names who may keep the books',
  /Only finance, admin or the owner may keep the books/.test(apiSrc))

/* ── numbering resumes above the book, not from one ───────────────────────── */
check('an empty book starts at 1', led.nextVoucherSeq([]) === 1)
check('numbering continues above the highest number',
  led.nextVoucherSeq([{ no: 'JV-0001' }, { no: 'JV-0028' }]) === 29,
  String(led.nextVoucherSeq([{ no: 'JV-0001' }, { no: 'JV-0028' }])))
// The case a count would get wrong, and the reason this reads the numbers.
check('a GAP does not hand out a number twice',
  led.nextVoucherSeq([{ no: 'JV-0001' }, { no: 'JV-0003' }]) === 4,
  String(led.nextVoucherSeq([{ no: 'JV-0001' }, { no: 'JV-0003' }])))
check('order does not matter', led.nextVoucherSeq([{ no: 'JV-0009' }, { no: 'JV-0002' }]) === 10)
check('anything not shaped JV-nnnn is ignored, not guessed at',
  led.nextVoucherSeq([{ no: 'OPENING' }, { no: 'JV-0002' }]) === 3)
check('the seeded book hands the next posting JV-0029',
  led.nextVoucherSeq(book.entries) === book.nextSeq, `${led.nextVoucherSeq(book.entries)} vs ${book.nextSeq}`)

/* ── the generated seed IS the TypeScript book ─────────────────────────────── */
// The migration is generated from coa.ts and ledgerSeed.ts. These checks are what stops
// it from drifting after someone edits either one and forgets to regenerate.
const seedCodes = [...sqlSeed.matchAll(/^ {2}\('(\d{4})','/gm)].map((m) => m[1])
const chartCodes = coa.chartOfAccounts.map((a) => a.code).sort()
check('the seed carries every account in the chart, and no others',
  seedCodes.slice().sort().join(',') === chartCodes.join(','),
  `sql=${seedCodes.length} chart=${chartCodes.length}`)
check('the seed inserts parents before children',
  (() => {
    const seen = new Set()
    for (const c of seedCodes) {
      const a = coa.chartOfAccounts.find((x) => x.code === c)
      if (a?.parent && !seen.has(a.parent)) return false
      seen.add(c)
    }
    return true
  })())

const seedNos = [...sqlSeed.matchAll(/'(JV-\d{4})'/g)].map((m) => m[1])
check('the seed carries every entry the opening book builds',
  seedNos.join(',') === book.entries.map((e) => e.no).join(','),
  `sql=${seedNos.length} ts=${book.entries.length}`)

const seedLines = [...sqlSeed.matchAll(/^ {2}\('[0-9a-f-]{36}','[0-9a-f-]{36}','(\d{4})',(\d+),(\d+),/gm)]
check('the seed carries every line the opening book builds',
  seedLines.length === book.entries.reduce((n, e) => n + e.lines.length, 0),
  `sql=${seedLines.length} ts=${book.entries.reduce((n, e) => n + e.lines.length, 0)}`)
check('the seed and the TypeScript agree on total debits',
  seedLines.reduce((t, m) => t + Number(m[2]), 0) === book.entries.reduce((t, e) => t + e.lines.reduce((x, l) => x + l.debitMinor, 0), 0))
check('debits equal credits across the whole seed',
  seedLines.reduce((t, m) => t + Number(m[2]), 0) === seedLines.reduce((t, m) => t + Number(m[3]), 0))
check('every account a seeded line names is postable',
  seedLines.every((m) => coa.chartOfAccounts.find((a) => a.code === m[1])?.postable === true))
const seedIds = [...sqlSeed.matchAll(/\('([0-9a-f-]{36})'/g)].map((m) => m[1])
check('every derived id is distinct', new Set(seedIds).size === seedIds.length,
  `${seedIds.length} ids, ${new Set(seedIds).size} distinct`)

// The one ordering the seed cannot get wrong: the opening entry is dated 30 June and
// June is closed, so closing before writing would have the period lock refuse it.
check('periods are seeded open',
  /insert into public\.accounting_periods \(key, closed\)[\s\S]*?\('2026-06',false\)/.test(sqlSeed))
check('and closed only AFTER the journal is written',
  sqlSeed.indexOf('set closed = true') > sqlSeed.lastIndexOf('insert into public.journal_lines'))
check('the closed periods are the ones the seed says are closed',
  [...sqlSeed.matchAll(/set closed = true[^;]*where key = '([\d-]+)'/g)].map((m) => m[1]).join(',')
  === seed.periodsSeed.filter((p) => p.closed).map((p) => p.key).join(','))
check('the closer is recorded in both languages',
  /closed_by_en = 'Finance department', closed_by_ar = 'قسم المالية'/.test(sqlSeed))

/* ── the provider hands the book over, and says when it cannot ─────────────── */
check('the provider reads the book when Supabase is configured', /fetchBooks\(\)/.test(ctxSrc))
check('it starts empty rather than showing the seed as if it were the server’s',
  /booksAreServerOwned \? \[\] : clone\(chartOfAccounts\)/.test(ctxSrc))
check('it waits for the session before reading, or RLS would return an empty book',
  /if \(!authReady\) return/.test(ctxSrc))
check('it re-reads when the signed-in user changes', /session\?\.user\.id/.test(ctxSrc))
check('a refused write is surfaced AND the book re-read',
  /setBooksError\(res\.error\)/.test(ctxSrc) && /await reloadBooks\(\)/.test(ctxSrc))
check('the entry id is minted locally so the row and the screen share one',
  /crypto\.randomUUID\(\)/.test(ctxSrc))
check('a reversal posts the reversing entry BEFORE marking the original',
  ctxSrc.indexOf('const posted = await writeEntry(entry)') < ctxSrc.indexOf('return markReversed(original.id, entry.id)'))
check('closing writes the closing entry before shutting the period',
  ctxSrc.indexOf('result = post(closingDraft)') < ctxSrc.indexOf('setPeriodClosed(period, true'))
check('reopening clears who closed it', /setPeriodClosed\(period, false\)/.test(ctxSrc))
check('the fixed-asset register is admitted as still seed-only',
  /no table for it yet/i.test(ctxSrc) || /STILL SEED-ONLY/.test(ctxSrc))
check('the accounting section shows the book’s state rather than silent zeros',
  /booksReady/.test(panelSrc) && /booksError/.test(panelSrc))

await server.close()
console.log('')
if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1) }
console.log('✓ all ledger invariants hold')
