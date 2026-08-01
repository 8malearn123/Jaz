import { createContext, useContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import type { Employee } from '@/data/ownerTeam'
import {
  needsApproval, policyOf, roleMayApprove, roleMaySignStep, stepsFor, withOverride,
  chainToPolicy, decisionPolicies,
  type ApprovalStep, type CustomChain, type DecisionPolicy, type JobRole, type PolicyOverride,
} from '@/data/governance'
import { useTeam } from './TeamContext'

// ── The approval queue and the audit trail ──────────────────────────────────
//
// A guarded action calls `submit`. If its policy lets it through at that value it
// comes straight back as 'auto' and the caller executes it. Otherwise it is parked
// here as a pending request and the caller does nothing — the whole point is that a
// held decision leaves the books untouched until somebody signs it.
//
// The effects themselves are not here. They live with the state they change
// (OwnerStateContext.applyApproved), so this file never has to know what a batch or
// a credit limit is — only who may sign for one.

export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface ApprovalRequest {
  id: string
  kind: string
  /** One line naming the subject — "Batch BATCH-FG-12 · Dark 70% bar". */
  subject: Bilingual
  /** What changes if this is approved, in plain words. */
  detail: Bilingual
  /** What it is worth, for threshold and ceiling checks. 0 for decisions value doesn't govern. */
  amountMinor: number
  reason: string
  requestedBy: Bilingual
  requestedById: string | null // null → the owner raised it
  requestedRole: JobRole | null
  at: Bilingual
  seq: number
  status: RequestStatus
  /** Signatures collected so far — one per rung climbed, in order. */
  signatures: { by: Bilingual; role: JobRole | 'owner'; at: Bilingual }[]
  /** The rungs as they stood when this was raised. Editing the chain later cannot
   *  move the goalposts under a request that is already waiting. */
  steps: ApprovalStep[]
  needsDual: boolean
  decidedBy?: Bilingual
  decidedAt?: Bilingual
  decidedReason?: string
  /** Opaque to this file — handed back to the effect layer on approval. */
  payload: unknown
}

export interface AuditEntry {
  id: string
  actor: Bilingual
  /** Which account acted. null → the owner, who sits above every branch. */
  actorId: string | null
  actorRole: JobRole | null
  action: Bilingual
  resource: string
  at: Bilingual
  seq: number
  /** Money, credit, stock and access moves are flagged for the auditor's eye. */
  sensitive: boolean
  /** Set when the action went through under break-glass. */
  emergency?: boolean
}

/** What `submit` did: executed on the spot, or parked for a signature. */
export type SubmitOutcome = { outcome: 'auto' } | { outcome: 'pending'; id: string }

interface GovernanceCtx {
  requests: ApprovalRequest[]
  pending: ApprovalRequest[]
  audit: AuditEntry[]
  /** Raise a decision. Returns 'auto' when policy lets it through at this value. */
  submit: (r: {
    kind: string
    subject: Bilingual
    detail: Bilingual
    amountMinor?: number
    reason?: string
    payload?: unknown
    /** Force the queue even when the value is under the threshold (segregation of duties). */
    force?: boolean
  }) => SubmitOutcome
  /** Sign a pending request. Returns the request once fully approved, else null. */
  approve: (id: string, note?: string) => ApprovalRequest | null
  reject: (id: string, reason: string) => void
  /** Owner override — executes now, marked and logged as an exception. */
  breakGlass: (id: string, reason: string) => ApprovalRequest | null
  /** May the signed-in account sign this request? */
  canSign: (r: ApprovalRequest) => boolean
  /** Why not, when they cannot — shown next to a disabled button. */
  blockReason: (r: ApprovalRequest) => Bilingual | null
  /** Requests raised by the signed-in account (or all, for the owner). */
  mine: ApprovalRequest[]
  log: (e: { action: Bilingual; resource: string; sensitive?: boolean; emergency?: boolean }) => void
  actor: Bilingual
  /** A chain as it currently stands — shipped defaults with the owner's edits applied. */
  policyFor: (kind: string) => DecisionPolicy
  /** Change a chain's rungs, its thresholds, or switch it off entirely. */
  setPolicy: (kind: string, patch: PolicyOverride) => void
  /** Put a chain back to how it shipped. */
  resetPolicy: (kind: string) => void
  /** Which chains the owner has edited. */
  policyOverrides: Record<string, PolicyOverride>
  /** Every chain in force: the fifteen wired to actions, then the ones the owner added. */
  chains: DecisionPolicy[]
  customChains: CustomChain[]
  addChain: (c: Omit<CustomChain, 'id'>) => string
  removeChain: (id: string) => void
  /** Raise a request by hand — the only way a custom chain gets one, since no action performs it. */
  raiseManual: (r: { kind: string; subject: Bilingual; detail: Bilingual; amountMinor?: number; reason: string }) => SubmitOutcome
  /** Which rung a waiting request is on, and who may sign it. */
  stepStateOf: (r: ApprovalRequest) => { index: number; total: number; step: ApprovalStep | null }
  /** The trail as the signed-in account may see it — see `auditScope`. */
  scopedAudit: AuditEntry[]
  /** Whose actions that trail covers, said plainly. */
  auditScope: Bilingual
}

const Ctx = createContext<GovernanceCtx | null>(null)

const OWNER_ACTOR: Bilingual = { en: 'Owner — admin console', ar: 'المالك — لوحة التحكم' }
const NOW: Bilingual = { en: 'Just now', ar: 'الآن' }

export function GovernanceProvider({ children }: { children: ReactNode }) {
  const { activeEmployee, managersOf, descendantsOf } = useTeam()
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [policyOverrides, setPolicyOverrides] = useState<Record<string, PolicyOverride>>({})
  const [customChains, setCustomChains] = useState<CustomChain[]>([])
  const chainSeqRef = useRef(1)
  const seqRef = useRef(1)
  const auditSeqRef = useRef(1)

  const actor: Bilingual = activeEmployee
    ? { en: `${activeEmployee.name.en} — ${activeEmployee.title.en}`, ar: `${activeEmployee.name.ar} — ${activeEmployee.title.ar}` }
    : OWNER_ACTOR
  const actorId = activeEmployee?.id ?? null
  const actorRole = activeEmployee?.role ?? null
  const isOwner = activeEmployee == null

  const log = useCallback((e: { action: Bilingual; resource: string; sensitive?: boolean; emergency?: boolean }) => {
    const seq = auditSeqRef.current++
    setAudit((prev) => [{
      id: `AU-${seq}`, seq, actor, actorId, actorRole, action: e.action, resource: e.resource,
      at: NOW, sensitive: e.sensitive ?? false, emergency: e.emergency,
    }, ...prev])
  }, [actor, actorId, actorRole])

  const policyFor = useCallback((kind: string): DecisionPolicy => {
    const custom = customChains.find((c) => c.id === kind)
    const base = custom ? chainToPolicy(custom) : policyOf(kind)
    // A kind with no chain behind it should never silently pass, so it falls back to held.
    if (!base) return { kind, label: { en: kind, ar: kind }, desc: { en: '', ar: '' }, autoBelowMinor: null, steps: [], dualAboveMinor: null, requiresReason: false }
    return withOverride(base, policyOverrides[kind])
  }, [policyOverrides, customChains])

  const chains = useMemo(() => [
    ...decisionPolicies.map((b) => policyFor(b.kind)),
    ...customChains.map((c) => policyFor(c.id)),
  ], [policyFor, customChains])

  const submit = useCallback((r: {
    kind: string; subject: Bilingual; detail: Bilingual
    amountMinor?: number; reason?: string; payload?: unknown; force?: boolean
  }): SubmitOutcome => {
    const amountMinor = r.amountMinor ?? 0
    const p = policyFor(r.kind)
    // A chain switched off lets everything through — including anything forced, since the
    // point of switching it off is that this decision is not being held any more.
    const gated = p.enabled !== false && (r.force || needsApproval(p, amountMinor))
    if (!gated) {
      log({ action: { en: `${p.label.en} — cleared automatically`, ar: `${p.label.ar} — مرّت تلقائيًا` }, resource: r.subject.en, sensitive: true })
      return { outcome: 'auto' }
    }
    const seq = seqRef.current++
    const id = `AP-${seq}`
    setRequests((prev) => [{
      id, seq, kind: r.kind, subject: r.subject, detail: r.detail, amountMinor,
      reason: r.reason ?? '', requestedBy: actor, requestedById: actorId, requestedRole: actorRole,
      at: NOW, status: 'pending', signatures: [], steps: stepsFor(p, amountMinor), needsDual: false,
      payload: r.payload,
    }, ...prev])
    log({ action: { en: `${p.label.en} — submitted for approval`, ar: `${p.label.ar} — رُفعت للاعتماد` }, resource: r.subject.en, sensitive: true })
    return { outcome: 'pending', id }
  }, [actor, actorId, actorRole, log, policyFor])

  // Who may sign: never the requester (that is the whole point), and only a role the
  // policy names — unless the request has already climbed past everyone who could sign it,
  // in which case it rests with the owner.
  /** The rung a request is waiting on. */
  const stepStateOf = useCallback((r: ApprovalRequest) => {
    const total = r.steps.length
    const index = r.signatures.length
    return { index, total, step: index < total ? r.steps[index] : null }
  }, [])

  const blockReason = useCallback((r: ApprovalRequest): Bilingual | null => {
    if (r.status !== 'pending') return { en: 'Already decided', ar: 'حُسمت مسبقًا' }
    if (r.requestedById != null && r.requestedById === actorId) {
      return { en: 'You raised this — someone else signs it', ar: 'أنت من رفعها — يوقّعها غيرك' }
    }
    if (r.requestedById == null && isOwner) {
      return { en: 'You raised this — someone else signs it', ar: 'أنت من رفعها — يوقّعها غيرك' }
    }
    if (r.signatures.some((s) => s.by.en === actor.en)) return { en: 'You already signed', ar: 'وقّعتها بالفعل' }
    if (isOwner) return null // the owner sits above every rung
    const { step } = stepStateOf(r)
    if (!step) return { en: 'Already decided', ar: 'حُسمت مسبقًا' }
    if (step.roles.length === 0) return { en: 'This step is the owner’s to sign', ar: 'هذه الدرجة توقيعها للمالك' }
    if (!roleMaySignStep(actorRole ?? undefined, step, policyFor(r.kind), r.amountMinor)) {
      return { en: 'Not your step on this chain', ar: 'ليست درجتك في هذه السلسلة' }
    }
    return null
  }, [actorId, actorRole, actor, isOwner, policyFor, stepStateOf])

  const canSign = useCallback((r: ApprovalRequest) => blockReason(r) == null, [blockReason])

  const approve = useCallback((id: string, note?: string): ApprovalRequest | null => {
    let done: ApprovalRequest | null = null
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id || r.status !== 'pending') return r
      const signatures = [...r.signatures, { by: actor, role: (actorRole ?? 'owner') as JobRole | 'owner', at: NOW }]
      // A chain is done when every rung has been climbed, not when someone senior signs.
      const complete = signatures.length >= r.steps.length
      const next: ApprovalRequest = complete
        ? { ...r, signatures, status: 'approved', decidedBy: actor, decidedAt: NOW, decidedReason: note }
        : { ...r, signatures }
      if (complete) done = next
      return next
    }))
    const p = requests.find((r) => r.id === id)
    if (p) {
      const label = policyFor(p.kind).label
      log({
        action: done
          ? { en: `Approved ${label.en.toLowerCase()}`, ar: `اعتمد ${label.ar}` }
          : { en: `Signed ${label.en.toLowerCase()} — awaiting co-signature`, ar: `وقّع ${label.ar} — بانتظار التوقيع الثاني` },
        resource: `${p.id} · ${p.subject.en}`, sensitive: true,
      })
    }
    return done
  }, [actor, actorRole, requests, log])

  const reject = useCallback((id: string, reason: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id && r.status === 'pending'
      ? { ...r, status: 'rejected', decidedBy: actor, decidedAt: NOW, decidedReason: reason } : r)))
    const p = requests.find((r) => r.id === id)
    if (p) log({ action: { en: `Rejected ${policyFor(p.kind).label.en.toLowerCase()}`, ar: `رفض ${policyFor(p.kind).label.ar}` }, resource: `${p.id} · ${p.subject.en}`, sensitive: true })
  }, [actor, requests, log])

  // Break glass: the owner pushes a held decision through now. It still leaves a
  // reason and a flagged audit line — an override that hides itself is not an override.
  const breakGlass = useCallback((id: string, reason: string): ApprovalRequest | null => {
    if (!isOwner) return null
    let done: ApprovalRequest | null = null
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id || r.status !== 'pending') return r
      const next: ApprovalRequest = {
        ...r, status: 'approved', decidedBy: actor, decidedAt: NOW, decidedReason: reason,
        signatures: [...r.signatures, { by: actor, role: 'owner', at: NOW }],
      }
      done = next
      return next
    }))
    const p = requests.find((r) => r.id === id)
    if (p) log({ action: { en: `Emergency override — ${policyFor(p.kind).label.en.toLowerCase()}`, ar: `تنفيذ استثنائي — ${policyFor(p.kind).label.ar}` }, resource: `${p.id} · ${p.subject.en}`, sensitive: true, emergency: true })
    return done
  }, [isOwner, actor, requests, log])

  // You see what you did, plus what everyone in your branch did. The owner sits above every
  // branch and sees all of it; the auditor sees all of it too, which is the point of the role.
  const scopedAudit = useMemo(() => {
    if (isOwner || actorRole === 'auditor') return audit
    if (!actorId) return []
    const mineAndBelow = new Set<string>([actorId, ...descendantsOf(actorId).map((e) => e.id)])
    return audit.filter((e) => e.actorId != null && mineAndBelow.has(e.actorId))
  }, [audit, isOwner, actorRole, actorId, descendantsOf])

  const auditScope = useMemo<Bilingual>(() => {
    if (isOwner) return { en: 'Every action on the platform', ar: 'كل ما يجري في المنصة' }
    if (actorRole === 'auditor') return { en: 'Every action — auditor access', ar: 'كل ما يجري — صلاحية التدقيق' }
    const below = actorId ? descendantsOf(actorId).length : 0
    return below > 0
      ? { en: `Your own actions and those of the ${below} people in your branch`, ar: `أعمالك وأعمال ${below} من يتبعونك` }
      : { en: 'Your own actions', ar: 'أعمالك أنت' }
  }, [isOwner, actorRole, actorId, descendantsOf])

  const setPolicy = useCallback((kind: string, patch: PolicyOverride) => {
    setPolicyOverrides((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }))
    const label = policyOf(kind)?.label ?? { en: kind, ar: kind }
    log({ action: { en: `Changed the ${label.en.toLowerCase()} chain`, ar: `عدّل سلسلة ${label.ar}` }, resource: `Policy · ${kind}`, sensitive: true })
  }, [log])
  const resetPolicy = useCallback((kind: string) => {
    setPolicyOverrides((prev) => { const next = { ...prev }; delete next[kind]; return next })
    const label = policyOf(kind)?.label ?? { en: kind, ar: kind }
    log({ action: { en: `Restored the ${label.en.toLowerCase()} chain`, ar: `أعاد سلسلة ${label.ar} لأصلها` }, resource: `Policy · ${kind}`, sensitive: true })
  }, [log])

  const addChain = useCallback((c: Omit<CustomChain, 'id'>) => {
    const id = `custom:${chainSeqRef.current++}`
    setCustomChains((prev) => [...prev, { ...c, id }])
    log({ action: { en: `Added the ${c.label.en.toLowerCase()} chain`, ar: `أضاف سلسلة ${c.label.ar}` }, resource: `Policy · ${id}`, sensitive: true })
    return id
  }, [log])
  const removeChain = useCallback((id: string) => {
    setCustomChains((prev) => prev.filter((c) => c.id !== id))
    log({ action: { en: 'Removed a chain', ar: 'حذف سلسلة' }, resource: `Policy · ${id}`, sensitive: true })
  }, [log])

  const raiseManual = useCallback((r: { kind: string; subject: Bilingual; detail: Bilingual; amountMinor?: number; reason: string }) =>
    submit({ ...r, force: true }), [submit])

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])
  const mine = useMemo(() => (isOwner ? requests : requests.filter((r) => r.requestedById === actorId)), [requests, isOwner, actorId])

  // Reading `managersOf` keeps the escalation line live in this context's identity even
  // though signing authority is decided by role — a report's manager is who they'd chase.
  void managersOf

  const value = useMemo<GovernanceCtx>(() => ({
    requests, pending, audit, submit, approve, reject, breakGlass, canSign, blockReason, mine, log, actor,
    scopedAudit, auditScope, policyFor, setPolicy, resetPolicy, policyOverrides,
    chains, customChains, addChain, removeChain, raiseManual, stepStateOf,
  }), [requests, pending, audit, submit, approve, reject, breakGlass, canSign, blockReason, mine, log, actor,
    scopedAudit, auditScope, policyFor, setPolicy, resetPolicy, policyOverrides,
    chains, customChains, addChain, removeChain, raiseManual, stepStateOf])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGovernance() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGovernance must be used within GovernanceProvider')
  return ctx
}

/** Employees who could sign a given decision — shown to a requester so they know who to chase. */
// eslint-disable-next-line react-refresh/only-export-components
export function approversFor(employees: Employee[], policy: DecisionPolicy, amountMinor = 0): Employee[] {
  return employees.filter((e) => e.active && roleMayApprove(e.role, policy, amountMinor))
}
