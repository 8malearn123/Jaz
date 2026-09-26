import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Employee, TeamPermission } from '@/data/ownerTeam'
import { jobRoleOf, type JobRole } from '@/data/governance'
import { isSupabaseConfigured } from '@/lib/supabase'
import {
  fetchEmployees, createEmployee, updateEmployee, deleteEmployee,
  type WriteResult,
} from '@/lib/api/team'

// Staff accounts live above both the role picker and the admin console: the owner
// creates employees (with a job role, a manager and per-section permissions) from the
// console, and each one becomes a sign-in card on the role picker. No pre-seeded accounts.
//
// Employees form an org chart: everyone may report to someone, and an approval that a
// person cannot sign climbs that line until it reaches somebody who can — or the owner.

interface TeamCtx {
  employees: Employee[]
  /** The id is assigned by the database, so nothing is returned — read it back from `employees`. */
  addEmployee: (e: Omit<Employee, 'id' | 'since'>) => void
  removeEmployee: (id: string) => void
  toggleEmployeePerm: (id: string, perm: TeamPermission) => void
  toggleEmployeeActive: (id: string) => void
  /** Assign a job role — its default permissions are added, never removing what was granted by hand. */
  setEmployeeRole: (id: string, role: JobRole) => void
  /** Set who this person reports to. Rejects a cycle and rejects reporting to oneself. */
  setEmployeeManager: (id: string, managerId: string | null) => boolean
  /** Direct reports. */
  reportsOf: (id: string) => Employee[]
  /** The reporting line upward, nearest manager first. */
  managersOf: (id: string) => Employee[]
  /** Everyone beneath this person, however deep — their whole branch of the chart. */
  descendantsOf: (id: string) => Employee[]
  /** Would making `managerId` the manager of `id` close a loop? */
  wouldCycle: (id: string, managerId: string) => boolean
  /** Employee currently signed in through the role picker (null → owner/persona session). */
  activeEmployee: Employee | null
  signInEmployee: (id: string) => void
  clearEmployee: () => void
  /** False while the first read from the server is still in flight. */
  ready: boolean
  /** The server's refusal, when one arrives — otherwise null. */
  error: string | null
}

const Ctx = createContext<TeamCtx | null>(null)

export function TeamProvider({ children }: { children: ReactNode }) {
  const backed = isSupabaseConfigured
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(!backed)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(1)

  const reload = useCallback(async () => {
    if (!backed) return
    setEmployees(await fetchEmployees())
    setReady(true)
  }, [backed])

  useEffect(() => {
    void reload()
  }, [reload])

  /** Runs a write, then re-reads so the UI shows what the server actually kept. */
  const commit = useCallback(async (write: () => Promise<WriteResult>) => {
    const res = await write()
    if (!res.ok) {
      setError(res.error)
      return
    }
    setError(null)
    await reload()
  }, [reload])

  const addEmployee = useCallback((e: Omit<Employee, 'id' | 'since'>) => {
    if (backed) {
      void commit(() => createEmployee(e))
      return
    }
    const id = `E-${String(seqRef.current++).padStart(2, '0')}`
    setEmployees((prev) => [{ ...e, id, since: { en: 'Now', ar: 'الآن' } }, ...prev])
  }, [backed, commit])

  const removeEmployee = useCallback((id: string) => {
    setActiveId((cur) => (cur === id ? null : cur))
    if (backed) {
      // Reports are lifted to the departing person's manager by a trigger, so this
      // is one call rather than a read-modify-write that could race.
      void commit(() => deleteEmployee(id))
      return
    }
    // Reports are not orphaned: they move up to the removed person's own manager.
    setEmployees((prev) => {
      const gone = prev.find((e) => e.id === id)
      return prev.filter((e) => e.id !== id).map((e) => (e.managerId === id ? { ...e, managerId: gone?.managerId } : e))
    })
  }, [backed, commit])

  const toggleEmployeePerm = useCallback((id: string, perm: TeamPermission) => {
    if (backed) {
      const cur = employees.find((e) => e.id === id)
      if (!cur) return
      const perms = cur.perms.includes(perm) ? cur.perms.filter((p) => p !== perm) : [...cur.perms, perm]
      void commit(() => updateEmployee(id, { perms }))
      return
    }
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, perms: e.perms.includes(perm) ? e.perms.filter((p) => p !== perm) : [...e.perms, perm] } : e)))
  }, [backed, commit, employees])

  const toggleEmployeeActive = useCallback((id: string) => {
    if (backed) {
      const cur = employees.find((e) => e.id === id)
      if (!cur) return
      void commit(() => updateEmployee(id, { active: !cur.active }))
      return
    }
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e)))
  }, [backed, commit, employees])

  const setEmployeeRole = useCallback((id: string, role: JobRole) => {
    // A job role seeds its sections; it never takes away what was granted by hand.
    if (backed) {
      const cur = employees.find((e) => e.id === id)
      if (!cur) return
      const def = jobRoleOf(role)
      const perms = def ? Array.from(new Set([...cur.perms, ...def.perms])) : cur.perms
      void commit(() => updateEmployee(id, { role, perms }))
      return
    }
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e
      const def = jobRoleOf(role)
      const perms = def ? Array.from(new Set([...e.perms, ...def.perms])) : e.perms
      return { ...e, role, perms }
    }))
  }, [backed, commit, employees])

  // Walk up from `managerId`; if we meet `id` on the way, the link would close a loop.
  const wouldCycleIn = (list: Employee[], id: string, managerId: string): boolean => {
    if (id === managerId) return true
    let cursor: string | undefined = managerId
    const seen = new Set<string>()
    while (cursor && !seen.has(cursor)) {
      if (cursor === id) return true
      seen.add(cursor)
      cursor = list.find((e) => e.id === cursor)?.managerId
    }
    return false
  }

  const setEmployeeManager = useCallback((id: string, managerId: string | null): boolean => {
    // Checked here so the UI can refuse immediately and say why. The database
    // checks it again, because a direct API call never passes through this.
    if (backed) {
      if (managerId && wouldCycleIn(employees, id, managerId)) return false
      void commit(() => updateEmployee(id, { managerId: managerId ?? undefined }))
      return true
    }
    let ok = true
    setEmployees((prev) => {
      if (managerId && wouldCycleIn(prev, id, managerId)) { ok = false; return prev }
      return prev.map((e) => (e.id === id ? { ...e, managerId: managerId ?? undefined } : e))
    })
    return ok
  }, [backed, commit, employees])

  const reportsOf = useCallback((id: string) => employees.filter((e) => e.managerId === id), [employees])
  const managersOf = useCallback((id: string) => {
    const line: Employee[] = []
    const seen = new Set<string>([id])
    let cursor = employees.find((e) => e.id === id)?.managerId
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor)
      const m = employees.find((e) => e.id === cursor)
      if (!m) break
      line.push(m)
      cursor = m.managerId
    }
    return line
  }, [employees])
  const descendantsOf = useCallback((id: string) => {
    const out: Employee[] = []
    const seen = new Set<string>([id])
    const walk = (parent: string) => {
      for (const e of employees) {
        if (e.managerId !== parent || seen.has(e.id)) continue
        seen.add(e.id)
        out.push(e)
        walk(e.id)
      }
    }
    walk(id)
    return out
  }, [employees])
  const wouldCycle = useCallback((id: string, managerId: string) => wouldCycleIn(employees, id, managerId), [employees])

  const signInEmployee = useCallback((id: string) => setActiveId(id), [])
  const clearEmployee = useCallback(() => setActiveId(null), [])

  // Suspending or removing an employee locks their session out immediately.
  const activeEmployee = useMemo(() => employees.find((e) => e.id === activeId && e.active) ?? null, [employees, activeId])

  const value = useMemo<TeamCtx>(() => ({
    employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive,
    setEmployeeRole, setEmployeeManager, reportsOf, managersOf, descendantsOf, wouldCycle,
    activeEmployee, signInEmployee, clearEmployee, ready, error,
  }), [employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive,
    setEmployeeRole, setEmployeeManager, reportsOf, managersOf, descendantsOf, wouldCycle,
    activeEmployee, signInEmployee, clearEmployee, ready, error])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTeam() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTeam must be used within TeamProvider')
  return ctx
}
