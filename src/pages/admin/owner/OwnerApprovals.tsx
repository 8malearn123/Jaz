import { useState } from 'react'
import { Check, X, ShieldAlert, Inbox, ScrollText, Lock, Zap } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { useOwnerState } from '@/state/OwnerStateContext'
import { useGovernance, approversFor, type ApprovalRequest } from '@/state/GovernanceContext'
import { policyOf, jobRoleOf } from '@/data/governance'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, Pill } from './_shared'

const statusPill = {
  pending: { label: { en: 'Awaiting signature', ar: 'بانتظار التوقيع' }, color: '#8a6b3f', bg: '#f6edde' },
  approved: { label: { en: 'Approved', ar: 'معتمدة' }, color: '#355c4b', bg: '#e8f0ec' },
  rejected: { label: { en: 'Rejected', ar: 'مرفوضة' }, color: '#b5403b', bg: '#faeceb' },
} as const

/** Approvals & audit: the queue of decisions waiting on a signature, and the live
 *  trail of everything that was decided. A held decision has changed nothing yet —
 *  approving it here is what makes it happen. */
export function OwnerApprovals({ view = 'inbox' }: { view?: 'inbox' | 'audit' }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { applyApproved, employees } = useOwnerState()
  const { requests, pending, audit, approve, reject, breakGlass, canSign, blockReason, actor } = useGovernance()
  const [decide, setDecide] = useState<{ r: ApprovalRequest; mode: 'approve' | 'reject' | 'glass' } | null>(null)

  const decided = requests.filter((r) => r.status !== 'pending')
  const signable = pending.filter((r) => canSign(r)).length

  const stats = [
    { label: { en: 'Awaiting signature', ar: 'بانتظار التوقيع' }, value: String(pending.length), sub: { en: 'Nothing has taken effect yet', ar: 'لم يُنفَّذ منها شيء بعد' }, tone: 'dark' as const },
    { label: { en: 'You can sign', ar: 'يمكنك توقيعها' }, value: String(signable), sub: { en: 'Within your authority', ar: 'ضمن صلاحيتك' }, tone: 'gold' as const },
    { label: { en: 'Approved', ar: 'معتمدة' }, value: String(requests.filter((r) => r.status === 'approved').length), sub: { en: 'Executed', ar: 'نُفّذت' }, tone: 'green' as const },
    { label: { en: 'Audit entries', ar: 'قيود التدقيق' }, value: String(audit.length), sub: { en: 'This session', ar: 'في هذه الجلسة' }, tone: 'plain' as const },
  ]

  const submit = (note: string) => {
    if (!decide) return
    const { r, mode } = decide
    if (mode === 'reject') {
      reject(r.id, note)
      flash(`${pick({ en: 'Rejected', ar: 'رُفضت' })} · ${r.id}`)
    } else {
      const done = mode === 'glass' ? breakGlass(r.id, note) : approve(r.id, note)
      if (done) {
        // Only now does anything actually change.
        applyApproved(done.kind, done.payload, actor)
        flash(`${pick({ en: 'Approved & applied', ar: 'اعتُمدت ونُفّذت' })} · ${r.id}`)
      } else {
        flash(pick({ en: 'Signed — still needs a co-signature', ar: 'وُقّعت — وتنتظر توقيعًا ثانيًا' }))
      }
    }
    setDecide(null)
  }

  const card = (r: ApprovalRequest) => {
    const p = policyOf(r.kind)
    const block = blockReason(r)
    const who = approversFor(employees, r.kind, r.amountMinor)
    return (
      <div key={r.id} className="card p-lg flex flex-col gap-sm">
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-xs">
              <span className="font-sans text-caption text-ink-subtle tabular-nums">{r.id}</span>
              <Pill color={statusPill[r.status].color} bg={statusPill[r.status].bg}>{pick(statusPill[r.status].label)}</Pill>
              <span className="rounded-pill border border-hairline-strong bg-surface-2 px-2 py-0.5 font-sans text-caption text-ink">{pick(p.label)}</span>
              {r.needsDual && <Pill color="#2e5f8a" bg="#e7f0f8">{pick({ en: 'Dual control', ar: 'رقابة مزدوجة' })}</Pill>}
            </div>
            <p className="font-serif text-card-title text-ink mt-xs">{pick(r.subject)}</p>
            <p className="font-sans text-data text-ink-muted mt-xxs">{pick(r.detail)}</p>
          </div>
          {r.amountMinor > 0 && !p.valueless && (
            <span className="font-serif text-card-title text-ink tabular-nums shrink-0">{money(r.amountMinor)}</span>
          )}
        </div>

        {r.reason && <p className="font-sans text-caption text-ink-muted rounded-lg bg-surface-2 border border-hairline p-md">{pick({ en: 'Reason', ar: 'المبرر' })}: {r.reason}</p>}

        <div className="flex flex-wrap items-center gap-x-md gap-y-xxs font-sans text-caption text-ink-subtle">
          <span>{pick({ en: 'Raised by', ar: 'رفعها' })}: {pick(r.requestedBy)}{r.requestedRole && ` · ${pick(jobRoleOf(r.requestedRole)!.label)}`}</span>
          <span>{pick(r.at)}</span>
          {r.signatures.length > 0 && (
            <span className="inline-flex items-center gap-xxs"><Check size={12} className="text-success" /> {r.signatures.map((s) => pick(s.by)).join(' · ')}</span>
          )}
        </div>

        {r.status === 'pending' && (
          <div className="flex flex-wrap items-center gap-sm pt-sm border-t border-hairline">
            <button onClick={() => setDecide({ r, mode: 'approve' })} disabled={!!block} className={buttonClass('primary', 'sm')}><Check size={15} /> {pick({ en: 'Approve', ar: 'اعتماد' })}</button>
            <button onClick={() => setDecide({ r, mode: 'reject' })} disabled={!!block} className={buttonClass('secondary', 'sm')}><X size={15} /> {pick({ en: 'Reject', ar: 'رفض' })}</button>
            {block && <span className="inline-flex items-center gap-xxs font-sans text-caption text-ink-subtle"><Lock size={12} /> {pick(block)}</span>}
            {block && (
              <button onClick={() => setDecide({ r, mode: 'glass' })} className="inline-flex items-center gap-xxs font-sans text-caption text-danger hover:underline"><Zap size={12} /> {pick({ en: 'Emergency override', ar: 'تنفيذ استثنائي' })}</button>
            )}
            {who.length > 0 && (
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Can sign', ar: 'يستطيع التوقيع' })}: {who.map((e) => pick(e.name)).join(' · ')}</span>
            )}
            {who.length === 0 && (
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'No employee holds this authority — it rests with the owner.', ar: 'لا موظف يحمل هذه الصلاحية — تبقى لدى المالك.' })}</span>
            )}
          </div>
        )}
        {r.status !== 'pending' && r.decidedBy && (
          <p className="font-sans text-caption text-ink-subtle pt-sm border-t border-hairline">
            {r.status === 'approved' ? pick({ en: 'Approved by', ar: 'اعتمدها' }) : pick({ en: 'Rejected by', ar: 'رفضها' })} {pick(r.decidedBy)} · {r.decidedAt && pick(r.decidedAt)}
            {r.decidedReason && ` — ${r.decidedReason}`}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Approvals & audit', ar: 'الاعتمادات والتدقيق' })}
        subtitle={pick({ en: 'Decisions waiting on a signature · nothing takes effect until it is signed', ar: 'قرارات بانتظار التوقيع · لا ينفذ منها شيء قبل اعتماده' })} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      {view === 'inbox' ? (
        <div className="flex flex-col gap-lg">
          <div className="flex flex-col gap-md">
            <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><Inbox size={17} className="text-primary-hover" /> {pick({ en: 'Awaiting signature', ar: 'بانتظار التوقيع' })} · {pending.length}</h3>
            {pending.length === 0
              ? <p className="card p-lg font-sans text-data text-ink-subtle">{pick({ en: 'Nothing is waiting. Guarded actions that exceed their threshold land here.', ar: 'لا يوجد ما ينتظر. تصل إلى هنا الإجراءات التي تتجاوز حدّها المسموح.' })}</p>
              : pending.map(card)}
          </div>
          {decided.length > 0 && (
            <div className="flex flex-col gap-md">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Decided', ar: 'محسومة' })} · {decided.length}</h3>
              {decided.map(card)}
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-lg py-md border-b border-hairline">
            <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><ScrollText size={17} className="text-primary-hover" /> {pick({ en: 'Audit trail', ar: 'سجل التدقيق' })}</h3>
            <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Written as it happens — who acted, on what, and whether it was sensitive.', ar: 'يُكتب لحظة وقوعه — من تصرّف، وعلى ماذا، وهل كان حساسًا.' })}</p>
          </div>
          {audit.length === 0
            ? <p className="px-lg py-md font-sans text-data text-ink-subtle">{pick({ en: 'No entries yet in this session.', ar: 'لا قيود في هذه الجلسة بعد.' })}</p>
            : (
              <ul className="divide-y divide-hairline">
                {audit.map((e) => (
                  <li key={e.id} className={cn('flex flex-wrap items-center gap-sm px-lg py-md', e.emergency && 'bg-danger/5')}>
                    <span className="font-sans text-caption text-ink-subtle tabular-nums w-16 shrink-0">{e.id}</span>
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-sans text-data text-ink">{pick(e.action)}</p>
                      <p className="font-sans text-caption text-ink-subtle truncate">{e.resource}</p>
                    </div>
                    <span className="font-sans text-caption text-ink-muted">{pick(e.actor)}</span>
                    <span className="font-sans text-caption text-ink-subtle">{pick(e.at)}</span>
                    {e.emergency
                      ? <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Override', ar: 'استثنائي' })}</Pill>
                      : e.sensitive && <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Sensitive', ar: 'حسّاس' })}</Pill>}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      {decide && <DecideModal state={decide} onClose={() => setDecide(null)} onSubmit={submit} />}
    </div>
  )
}

/** Approve, reject or override — a reason is mandatory for anything but a plain approval. */
function DecideModal({ state, onClose, onSubmit }: { state: { r: ApprovalRequest; mode: 'approve' | 'reject' | 'glass' }; onClose: () => void; onSubmit: (note: string) => void }) {
  const { pick } = useLocale()
  const [note, setNote] = useState('')
  const { r, mode } = state
  const needsNote = mode !== 'approve'
  const valid = !needsNote || note.trim().length > 3
  const title = mode === 'approve' ? { en: 'Approve decision', ar: 'اعتماد القرار' }
    : mode === 'reject' ? { en: 'Reject decision', ar: 'رفض القرار' }
      : { en: 'Emergency override', ar: 'تنفيذ استثنائي' }
  return (
    <Modal open onClose={onClose} size="sm" eyebrow={r.id} title={pick(title)}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={() => onSubmit(note.trim())} disabled={!valid} className={buttonClass(mode === 'reject' ? 'secondary' : 'primary', 'sm')}>
          {mode === 'approve' ? <><Check size={15} /> {pick({ en: 'Approve', ar: 'اعتماد' })}</> : mode === 'reject' ? <><X size={15} /> {pick({ en: 'Reject', ar: 'رفض' })}</> : <><Zap size={15} /> {pick({ en: 'Override', ar: 'تنفيذ' })}</>}
        </button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="rounded-lg bg-surface-2 border border-hairline p-md">
          <p className="font-sans text-data text-ink">{pick(r.subject)}</p>
          <p className="font-sans text-caption text-ink-muted mt-xxs">{pick(r.detail)}</p>
        </div>
        {mode === 'glass' && (
          <p className="inline-flex items-start gap-xs font-sans text-caption text-danger rounded-lg bg-danger/5 border border-danger/20 p-md">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            {pick({ en: 'This pushes the decision through without the signature its policy asks for. It is flagged in the audit trail as an exception and cannot be hidden.', ar: 'هذا ينفّذ القرار دون التوقيع الذي تطلبه سياسته. يُوسم في سجل التدقيق كاستثناء ولا يمكن إخفاؤه.' })}
          </p>
        )}
        <label className="flex flex-col gap-xs">
          <span className="label">{needsNote ? pick({ en: 'Reason (required)', ar: 'المبرر (إلزامي)' }) : pick({ en: 'Note (optional)', ar: 'ملاحظة (اختيارية)' })}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={cn('input resize-none', needsNote && !valid && note !== '' && 'border-danger')}
            placeholder={pick({ en: 'Why is this the right call?', ar: 'لماذا هذا هو القرار الصحيح؟' })} autoFocus />
        </label>
      </div>
    </Modal>
  )
}
