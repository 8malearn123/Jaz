import { createContext, useContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Employee, TeamPermission } from '@/data/ownerTeam'
import { jobRoleOf, type JobRole } from '@/data/governance'

// Staff accounts live above both the role picker and the admin console: the owner
// creates employees (with a job role, a manager and per-section permissions) from the
// console, and each one becomes a sign-in card on the role picker. No pre-seeded accounts.
//
// Employees form an org chart: everyone may report to someone, and an approval that a
// person cannot sign climbs that line until it reaches somebody who can — or the owner.

interface TeamCtx {
  employees: Employee[]
  addEmployee: (e: Omit<Employee, 'id' | 'since'>) => string
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
  /** Would making `managerId` the manager of `id` close a loop? */
  wouldCycle: (id: string, managerId: string) => boolean
  /** Employee currently signed in through the role picker (null → owner/persona session). */
  activeEmployee: Employee | null
  signInEmployee: (id: string) => void
  clearEmployee: () => void
}

const Ctx = createContext<TeamCtx | null>(null)

export function TeamProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const seqRef = useRef(1)

  const addEmployee = useCallback((e: Omit<Employee, 'id' | 'since'>) => {
    const id = `E-${String(seqRef.current++).padStart(2, '0')}`
    setEmployees((prev) => [{ ...e, id, since: { en: 'Now', ar: 'الآن' } }, ...prev])
    return id
  }, [])
  const removeEmployee = useCallback((id: string) => {
    // Reports are not orphaned: they move up to the removed person's own manager.
    setEmployees((prev) => {
      const gone = prev.find((e) => e.id === id)
      return prev.filter((e) => e.id !== id).map((e) => (e.managerId === id ? { ...e, managerId: gone?.managerId } : e))
    })
    setActiveId((cur) => (cur === id ? null : cur))
  }, [])
  const toggleEmployeePerm = useCallback((id: string, perm: TeamPermission) =>
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, perms: e.perms.includes(perm) ? e.perms.filter((p) => p !== perm) : [...e.perms, perm] } : e))), [])
  const toggleEmployeeActive = useCallback((id: string) =>
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))), [])

  const setEmployeeRole = useCallback((id: string, role: JobRole) =>
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== id) return e
      const def = jobRoleOf(role)
      const perms = def ? Array.from(new Set([...e.perms, ...def.perms])) : e.perms
      return { ...e, role, perms }
    })), [])

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
    let ok = true
    setEmployees((prev) => {
      if (managerId && wouldCycleIn(prev, id, managerId)) { ok = false; return prev }
      return prev.map((e) => (e.id === id ? { ...e, managerId: managerId ?? undefined } : e))
    })
    return ok
  }, [])

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
  const wouldCycle = useCallback((id: string, managerId: string) => wouldCycleIn(employees, id, managerId), [employees])

  const signInEmployee = useCallback((id: string) => setActiveId(id), [])
  const clearEmployee = useCallback(() => setActiveId(null), [])

  // Suspending or removing an employee locks their session out immediately.
  const activeEmployee = useMemo(() => employees.find((e) => e.id === activeId && e.active) ?? null, [employees, activeId])

  const value = useMemo<TeamCtx>(() => ({
    employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive,
    setEmployeeRole, setEmployeeManager, reportsOf, managersOf, wouldCycle,
    activeEmployee, signInEmployee, clearEmployee,
  }), [employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive,
    setEmployeeRole, setEmployeeManager, reportsOf, managersOf, wouldCycle,
    activeEmployee, signInEmployee, clearEmployee])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTeam() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTeam must be used within TeamProvider')
  return ctx
}
