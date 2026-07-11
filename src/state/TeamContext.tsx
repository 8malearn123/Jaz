import { createContext, useContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Employee, TeamPermission } from '@/data/ownerTeam'

// Staff accounts live above both the role picker and the admin console: the owner
// creates employees (with per-section permissions) from the console, and each one
// becomes a sign-in card on the role picker. No pre-seeded accounts.

interface TeamCtx {
  employees: Employee[]
  addEmployee: (e: Omit<Employee, 'id' | 'since'>) => string
  removeEmployee: (id: string) => void
  toggleEmployeePerm: (id: string, perm: TeamPermission) => void
  toggleEmployeeActive: (id: string) => void
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
    setEmployees((prev) => prev.filter((e) => e.id !== id))
    setActiveId((cur) => (cur === id ? null : cur))
  }, [])
  const toggleEmployeePerm = useCallback((id: string, perm: TeamPermission) =>
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, perms: e.perms.includes(perm) ? e.perms.filter((p) => p !== perm) : [...e.perms, perm] } : e))), [])
  const toggleEmployeeActive = useCallback((id: string) =>
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))), [])

  const signInEmployee = useCallback((id: string) => setActiveId(id), [])
  const clearEmployee = useCallback(() => setActiveId(null), [])

  // Suspending or removing an employee locks their session out immediately.
  const activeEmployee = useMemo(() => employees.find((e) => e.id === activeId && e.active) ?? null, [employees, activeId])

  const value = useMemo<TeamCtx>(() => ({
    employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive,
    activeEmployee, signInEmployee, clearEmployee,
  }), [employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive, activeEmployee, signInEmployee, clearEmployee])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTeam() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTeam must be used within TeamProvider')
  return ctx
}
