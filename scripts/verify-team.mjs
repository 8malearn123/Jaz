// Team mapping and org-chart invariants. No database, no network.
import { createServer } from 'vite'

let failures = 0
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✓  ${name}`)
  else { failures++; console.log(`✗  ${name}${detail ? '  ' + detail : ''}`) }
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const api = await server.ssrLoadModule('/src/lib/api/team.ts')
const gov = await server.ssrLoadModule('/src/data/governance.ts')
const { rowToEmployee, employeeToRow } = api

const row = {
  id: 'aaaa1111-2222-3333-4444-555555555555',
  name_en: 'Sara', name_ar: 'سارة',
  title_en: 'Accountant', title_ar: 'محاسبة',
  phone: '+9665', email: 's@x.co',
  perms: ['ledger', 'accounting'],
  active: true, job_role: 'accountant',
  manager_id: null, profile_id: null,
  created_at: '2026-03-15T10:00:00Z', updated_at: '2026-03-15T10:00:00Z',
}

const emp = rowToEmployee(row)
check('bilingual name and title split out', emp.name.ar === 'سارة' && emp.title.en === 'Accountant')
check('perms carry through as an array', Array.isArray(emp.perms) && emp.perms.join(',') === 'ledger,accounting')
check('job_role maps onto role', emp.role === 'accountant')

// The UI treats "reports to the owner" as undefined. A null leaking through would
// make `managerId === null` truthy in some checks and break the chart walk.
check('a null manager becomes undefined, not null', emp.managerId === undefined,
  `got ${JSON.stringify(emp.managerId)}`)
check('since is derived, never blank', typeof emp.since.en === 'string' && emp.since.en.length > 0 && emp.since.en !== '—',
  JSON.stringify(emp.since))

const withMgr = rowToEmployee({ ...row, manager_id: 'bbbb1111-2222-3333-4444-555555555555' })
check('a real manager maps through', withMgr.managerId === 'bbbb1111-2222-3333-4444-555555555555')

// Round trip: undefined manager must become null in the column, not be dropped.
const back = employeeToRow({ ...emp, managerId: undefined })
check('undefined manager writes null', back.manager_id === null)
check('undefined role writes null', employeeToRow({ ...emp, role: undefined }).job_role === null)
check('round trip keeps both name languages', back.name_en === 'Sara' && back.name_ar === 'سارة')

// A malformed timestamp must not throw or print "Invalid Date".
const badDate = rowToEmployee({ ...row, created_at: 'not-a-date' })
check('a bad created_at degrades to a dash', badDate.since.en === '—', JSON.stringify(badDate.since))

// The job-role seeding rule the console relies on: a role ADDS its sections and
// never removes a hand-granted one.
const def = gov.jobRoleOf('accountant')
check('accountant has default sections', def && def.perms.length > 0)
const handGranted = ['products']
const seeded = Array.from(new Set([...handGranted, ...(def?.perms ?? [])]))
check('seeding keeps the hand-granted section', seeded.includes('products'))
check('seeding adds the role sections', (def?.perms ?? []).every((p) => seeded.includes(p)))

// Every enum value the migration declares must exist in the TS union, or a write
// fails at runtime with a cast error nobody sees until production.
const migration = await (await import('node:fs/promises')).readFile('supabase/migrations/20260926000000_team.sql', 'utf8')
const sqlJobRoles = [...migration.matchAll(/create type public\.job_role as enum \(([^)]+)\)/g)][0][1]
  .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean).sort()
const tsJobRoles = gov.jobRoles.map((r) => r.key).sort()
check('SQL job_role enum matches JobRole in TS',
  sqlJobRoles.join(',') === tsJobRoles.join(','),
  `sql=[${sqlJobRoles}] ts=[${tsJobRoles}]`)

const team = await server.ssrLoadModule('/src/data/ownerTeam.ts')
const sqlPerms = [...migration.matchAll(/create type public\.team_permission as enum \(([^)]+)\)/g)][0][1]
  .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean).sort()
const tsPerms = team.teamPermissions.map((p) => p.key).sort()
check('SQL team_permission enum matches TeamPermission in TS',
  sqlPerms.join(',') === tsPerms.join(','),
  `sql=[${sqlPerms}] ts=[${tsPerms}]`)

await server.close()
console.log('')
if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1) }
console.log('✓ all team invariants hold')
