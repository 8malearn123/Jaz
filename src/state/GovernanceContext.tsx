import { createContext, useContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import type { Employee } from '@/data/ownerTeam'
import {
  needsApproval, needsDualControl, policyOf, roleMayApprove,
  type DecisionKind, type JobRole,
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
  kind: DecisionKind
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
  /** Signatures collected so far. Dual control needs the owner on top of the first approver. */
  signatures: { by: Bilingual; role: JobRole | 'owner'; at: Bilingual }[]
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
    kind: DecisionKind
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

  const submit = useCallback((r: {
    kind: DecisionKind; subject: Bilingual; detail: Bilingual
    amountMinor?: number; reason?: string; payload?: unknown; force?: boolean
  }): SubmitOutcome => {
    const amountMinor = r.amountMinor ?? 0
    const gated = r.force || needsApproval(r.kind, amountMinor)
    const p = policyOf(r.kind)
    if (!gated) {
      log({ action: { en: `${p.label.en} — cleared automatically`, ar: `${p.label.ar} — مرّت تلقائيًا` }, resource: r.subject.en, sensitive: true })
      return { outcome: 'auto' }
    }
    const seq = seqRef.current++
    const id = `AP-${seq}`
    setRequests((prev) => [{
      id, seq, kind: r.kind, subject: r.subject, detail: r.detail, amountMinor,
      reason: r.reason ?? '', requestedBy: actor, requestedById: actorId, requestedRole: actorRole,
      at: NOW, status: 'pending', signatures: [], needsDual: needsDualControl(r.kind, amountMinor),
      payload: r.payload,
    }, ...prev])
    log({ action: { en: `${p.label.en} — submitted for approval`, ar: `${p.label.ar} — رُفعت للاعتماد` }, resource: r.subject.en, sensitive: true })
    return { outcome: 'pending', id }
  }, [actor, actorId, actorRole, log])

  // Who may sign: never the requester (that is the whole point), and only a role the
  // policy names — unless the request has already climbed past everyone who could sign it,
  // in which case it rests with the owner.
  const blockReason = useCallback((r: ApprovalRequest): Bilingual | null => {
    if (r.status !== 'pending') return { en: 'Already decided', ar: 'حُسمت مسبقًا' }
    if (r.requestedById != null && r.requestedById === actorId) {
      return { en: 'You raised this — someone else signs it', ar: 'أنت من رفعها — يوقّعها غيرك' }
    }
    if (r.requestedById == null && isOwner) {
      return { en: 'You raised this — someone else signs it', ar: 'أنت من رفعها — يوقّعها غيرك' }
    }
    if (isOwner) return null // the owner is the top of every escalation line
    if (r.signatures.some((s) => s.by.en === actor.en)) return { en: 'You already signed', ar: 'وقّعتها بالفعل' }
    if (!roleMayApprove(actorRole ?? undefined, r.kind, r.amountMinor)) {
      return { en: 'Outside your role’s authority', ar: 'خارج صلاحية دورك' }
    }
    return null
  }, [actorId, actorRole, actor, isOwner])

  const canSign = useCallback((r: ApprovalRequest) => blockReason(r) == null, [blockReason])

  const approve = useCallback((id: string, note?: string): ApprovalRequest | null => {
    let done: ApprovalRequest | null = null
    setRequests((prev) => prev.map((r) => {
      if (r.id !== id || r.status !== 'pending') return r
      const signatures = [...r.signatures, { by: actor, role: (actorRole ?? 'owner') as JobRole | 'owner', at: NOW }]
      // Dual control is satisfied only once the owner has signed too.
      const ownerSigned = signatures.some((s) => s.role === 'owner')
      const complete = !r.needsDual || ownerSigned
      const next: ApprovalRequest = complete
        ? { ...r, signatures, status: 'approved', decidedBy: actor, decidedAt: NOW, decidedReason: note }
        : { ...r, signatures }
      if (complete) done = next
      return next
    }))
    const p = requests.find((r) => r.id === id)
    if (p) {
      const label = policyOf(p.kind).label
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
    if (p) log({ action: { en: `Rejected ${policyOf(p.kind).label.en.toLowerCase()}`, ar: `رفض ${policyOf(p.kind).label.ar}` }, resource: `${p.id} · ${p.subject.en}`, sensitive: true })
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
    if (p) log({ action: { en: `Emergency override — ${policyOf(p.kind).label.en.toLowerCase()}`, ar: `تنفيذ استثنائي — ${policyOf(p.kind).label.ar}` }, resource: `${p.id} · ${p.subject.en}`, sensitive: true, emergency: true })
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

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests])
  const mine = useMemo(() => (isOwner ? requests : requests.filter((r) => r.requestedById === actorId)), [requests, isOwner, actorId])

  // Reading `managersOf` keeps the escalation line live in this context's identity even
  // though signing authority is decided by role — a report's manager is who they'd chase.
  void managersOf

  const value = useMemo<GovernanceCtx>(() => ({
    requests, pending, audit, submit, approve, reject, breakGlass, canSign, blockReason, mine, log, actor,
    scopedAudit, auditScope,
  }), [requests, pending, audit, submit, approve, reject, breakGlass, canSign, blockReason, mine, log, actor,
    scopedAudit, auditScope])

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
export function approversFor(employees: Employee[], kind: DecisionKind, amountMinor = 0): Employee[] {
  return employees.filter((e) => e.active && roleMayApprove(e.role, kind, amountMinor))
}
