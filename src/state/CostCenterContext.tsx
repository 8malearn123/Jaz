import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import {
  costCentersSeed, applyProcesses, sumCharges, totalsOf,
  type CostCenter, type CostProcess, type CostEntry, type CostCenterTotals,
} from '@/data/costCenters'
import { useTeam } from '@/state/TeamContext'

// Cost centres live above the accounting section, the orders board and the purchase
// desk, because all three touch the same ledger: accounting defines the centres and
// their processes, a sale posts against one, a purchase posts against one.

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

/** What a caller hands over to post a document against a centre. */
export interface PostInput {
  side: 'sale' | 'purchase'
  centerId: string
  ref: string
  party: Bilingual
  baseMinor: number
  qty: number
  note?: Bilingual
}

interface CostCenterCtx {
  centers: CostCenter[]
  activeCenters: CostCenter[]
  centerOf: (id: string) => CostCenter | undefined
  addCenter: (c: Omit<CostCenter, 'id' | 'processes' | 'active'> & { processes?: CostProcess[] }) => string
  updateCenter: (id: string, patch: Partial<Omit<CostCenter, 'id' | 'processes'>>) => void
  toggleCenter: (id: string) => void
  removeCenter: (id: string) => void
  addProcess: (centerId: string, p: Omit<CostProcess, 'id'>) => string
  updateProcess: (centerId: string, processId: string, patch: Partial<Omit<CostProcess, 'id'>>) => void
  removeProcess: (centerId: string, processId: string) => void
  /** Entries, newest first. */
  entries: CostEntry[]
  entriesOf: (centerId: string) => CostEntry[]
  /** The posting a document already carries, if any — a document is filed once. */
  entryForRef: (ref: string) => CostEntry | undefined
  /** File a sale or a purchase against a centre. Returns the entry, or null if the centre is unknown. */
  post: (input: PostInput) => CostEntry | null
  /** Undo a posting (the document it rode on was cancelled or refiled). */
  unpost: (entryId: string) => void
  totalsOfCenter: (centerId: string) => CostCenterTotals
  totalProcessMinor: number
}

const Ctx = createContext<CostCenterCtx | null>(null)

export function CostCenterProvider({ children }: { children: ReactNode }) {
  const { activeEmployee } = useTeam()
  const [centers, setCenters] = useState<CostCenter[]>(() => clone(costCentersSeed))
  const [entries, setEntries] = useState<CostEntry[]>([])
  const [seq, setSeq] = useState({ center: costCentersSeed.length + 1, process: 1, entry: 1 })

  const actingAccount: Bilingual = activeEmployee
    ? { en: `${activeEmployee.name.en} — ${activeEmployee.title.en}`, ar: `${activeEmployee.name.ar} — ${activeEmployee.title.ar}` }
    : { en: 'Owner — admin console', ar: 'المالك — لوحة التحكم' }

  const centerOf = useCallback((id: string) => centers.find((c) => c.id === id), [centers])

  const addCenter = useCallback((c: Omit<CostCenter, 'id' | 'processes' | 'active'> & { processes?: CostProcess[] }) => {
    const n = seq.center
    const id = `CC-${String(n).padStart(2, '0')}`
    setSeq((s) => ({ ...s, center: s.center + 1 }))
    setCenters((prev) => [...prev, { ...c, id, active: true, processes: c.processes ?? [] }])
    return id
  }, [seq.center])

  const updateCenter = useCallback((id: string, patch: Partial<Omit<CostCenter, 'id' | 'processes'>>) =>
    setCenters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c))), [])
  const toggleCenter = useCallback((id: string) =>
    setCenters((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))), [])
  // Postings already made are history — removing the centre never removes them.
  const removeCenter = useCallback((id: string) => setCenters((prev) => prev.filter((c) => c.id !== id)), [])

  const addProcess = useCallback((centerId: string, p: Omit<CostProcess, 'id'>) => {
    const id = `p-new-${seq.process}`
    setSeq((s) => ({ ...s, process: s.process + 1 }))
    setCenters((prev) => prev.map((c) => (c.id === centerId ? { ...c, processes: [...c.processes, { ...p, id }] } : c)))
    return id
  }, [seq.process])
  const updateProcess = useCallback((centerId: string, processId: string, patch: Partial<Omit<CostProcess, 'id'>>) =>
    setCenters((prev) => prev.map((c) => (c.id === centerId
      ? { ...c, processes: c.processes.map((p) => (p.id === processId ? { ...p, ...patch } : p)) }
      : c))), [])
  const removeProcess = useCallback((centerId: string, processId: string) =>
    setCenters((prev) => prev.map((c) => (c.id === centerId ? { ...c, processes: c.processes.filter((p) => p.id !== processId) } : c))), [])

  const entriesOf = useCallback((centerId: string) => entries.filter((e) => e.centerId === centerId), [entries])
  const entryForRef = useCallback((ref: string) => entries.find((e) => e.ref === ref), [entries])

  const post = useCallback((input: PostInput): CostEntry | null => {
    const cc = centers.find((c) => c.id === input.centerId)
    if (!cc) return null
    // The processes are valued now and frozen onto the entry: changing a rate tomorrow
    // must not restate a document that was already filed today.
    const charges = applyProcesses(cc, input.side, { amountMinor: input.baseMinor, qty: input.qty })
    const entry: CostEntry = {
      id: `CE-${String(seq.entry).padStart(4, '0')}`,
      at: { en: 'Now', ar: 'الآن' },
      side: input.side, centerId: cc.id, ref: input.ref, party: input.party,
      baseMinor: input.baseMinor, qty: input.qty,
      charges, processMinor: sumCharges(charges),
      by: actingAccount, note: input.note,
    }
    setSeq((s) => ({ ...s, entry: s.entry + 1 }))
    // A document is filed against one centre — refiling replaces the earlier posting.
    setEntries((prev) => [entry, ...prev.filter((e) => e.ref !== input.ref)])
    return entry
  }, [centers, seq.entry, actingAccount])

  const unpost = useCallback((entryId: string) => setEntries((prev) => prev.filter((e) => e.id !== entryId)), [])

  const totalsOfCenter = useCallback((centerId: string) => totalsOf(entries.filter((e) => e.centerId === centerId)), [entries])
  const totalProcessMinor = useMemo(() => entries.reduce((a, e) => a + e.processMinor, 0), [entries])
  const activeCenters = useMemo(() => centers.filter((c) => c.active), [centers])

  const value = useMemo<CostCenterCtx>(() => ({
    centers, activeCenters, centerOf, addCenter, updateCenter, toggleCenter, removeCenter,
    addProcess, updateProcess, removeProcess,
    entries, entriesOf, entryForRef, post, unpost, totalsOfCenter, totalProcessMinor,
  }), [centers, activeCenters, centerOf, addCenter, updateCenter, toggleCenter, removeCenter, addProcess, updateProcess, removeProcess, entries, entriesOf, entryForRef, post, unpost, totalsOfCenter, totalProcessMinor])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCostCenters() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCostCenters must be used within CostCenterProvider')
  return ctx
}
