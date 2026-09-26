// Staff endpoints. The org-chart reasoning (who reports to whom, who may sign
// what) stays in TeamContext where the UI reads it; this file is only the wire.

import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { EmployeeRow } from '@/lib/database.types'
import type { Employee, TeamPermission } from '@/data/ownerTeam'
import type { RoleId } from '@/data/roles'

export interface WriteResult { ok: boolean; error: string | null }
const OK: WriteResult = { ok: true, error: null }
const bad = (error: string): WriteResult => ({ ok: false, error })

// `since` is shown nowhere for an employee, but the Employee type requires it, so
// it is derived from created_at rather than invented or left blank.
function sinceOf(createdAt: string) {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return { en: '—', ar: '—' }
  const en = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const ar = d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })
  return { en, ar }
}

export function rowToEmployee(r: EmployeeRow): Employee {
  return {
    id: r.id,
    name: { en: r.name_en, ar: r.name_ar },
    title: { en: r.title_en, ar: r.title_ar },
    phone: r.phone,
    email: r.email,
    perms: r.perms as TeamPermission[],
    active: r.active,
    since: sinceOf(r.created_at),
    role: r.job_role ?? undefined,
    // The UI treats "reports to the owner" as undefined, not null.
    managerId: r.manager_id ?? undefined,
  }
}

export function employeeToRow(e: Omit<Employee, 'id' | 'since'>) {
  return {
    name_en: e.name.en,
    name_ar: e.name.ar,
    title_en: e.title.en,
    title_ar: e.title.ar,
    phone: e.phone,
    email: e.email,
    perms: e.perms,
    active: e.active,
    job_role: e.role ?? null,
    manager_id: e.managerId ?? null,
  }
}

/** Empty for anyone who is not staff — RLS filters it, which is the intent. */
export async function fetchEmployees(): Promise<Employee[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await requireSupabase()
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[team] employees:', error.message)
    return []
  }
  return (data ?? []).map(rowToEmployee)
}

export async function createEmployee(e: Omit<Employee, 'id' | 'since'>): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('team.notConfigured')
  const { error } = await requireSupabase().from('employees').insert(employeeToRow(e))
  return error ? bad(error.message) : OK
}

export async function updateEmployee(
  id: string,
  patch: Partial<Pick<Employee, 'perms' | 'active' | 'role' | 'managerId' | 'title' | 'phone' | 'email' | 'name'>>,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('team.notConfigured')

  const row: Partial<EmployeeRow> = {}
  if (patch.name) { row.name_en = patch.name.en; row.name_ar = patch.name.ar }
  if (patch.title) { row.title_en = patch.title.en; row.title_ar = patch.title.ar }
  if (patch.phone !== undefined) row.phone = patch.phone
  if (patch.email !== undefined) row.email = patch.email
  if (patch.perms !== undefined) row.perms = patch.perms
  if (patch.active !== undefined) row.active = patch.active
  if (patch.role !== undefined) row.job_role = patch.role ?? null
  // undefined means "reports to the owner", which is null in the column — so this
  // key must be written whenever it is present, including when it is undefined.
  if ('managerId' in patch) row.manager_id = patch.managerId ?? null

  if (Object.keys(row).length === 0) return OK
  const { error } = await requireSupabase().from('employees').update(row).eq('id', id)
  return error ? bad(error.message) : OK
}

/** Reports are lifted to the departing person's own manager by a database trigger. */
export async function deleteEmployee(id: string): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('team.notConfigured')
  const { error } = await requireSupabase().from('employees').delete().eq('id', id)
  return error ? bad(error.message) : OK
}

/** Links a staff record to a real account, so that person can actually sign in. */
export async function linkEmployeeToProfile(id: string, profileId: string | null): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('team.notConfigured')
  const { error } = await requireSupabase().from('employees').update({ profile_id: profileId }).eq('id', id)
  return error ? bad(error.message) : OK
}

// ---------------------------------------------------------------- app roles
//
// What this slice was for: granting the platform role from the console instead of
// the Supabase dashboard. The database refuses anyone who is not admin/owner.

export interface StaffAccount {
  profileId: string
  email: string | null
  nameEn: string | null
  nameAr: string | null
  role: RoleId
}

export async function fetchAccounts(): Promise<StaffAccount[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, email, full_name_en, full_name_ar, role')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[team] accounts:', error.message)
    return []
  }
  return (data ?? []).map((r) => ({
    profileId: r.id,
    email: r.email,
    nameEn: r.full_name_en,
    nameAr: r.full_name_ar,
    role: r.role,
  }))
}

export async function grantAppRole(profileId: string, role: RoleId): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('team.notConfigured')
  const { error } = await requireSupabase().from('profiles').update({ role }).eq('id', profileId)
  return error ? bad(error.message) : OK
}

/** Exported for scripts/verify-team.mjs. */
export const __test = { sinceOf }
