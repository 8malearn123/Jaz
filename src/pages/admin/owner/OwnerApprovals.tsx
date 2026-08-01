import { useState } from 'react'
import { Check, X, ShieldAlert, Inbox, Lock, Zap, Settings2, Plus, Trash2, Search } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { useOwnerState } from '@/state/OwnerStateContext'
import { useGovernance, approversFor, type ApprovalRequest } from '@/state/GovernanceContext'
import { chainTemplates, isCustomChain, jobRoleOf, jobRoles, type ApprovalStep, type ChainTemplate } from '@/data/governance'
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
export function OwnerApprovals({ view = 'inbox' }: { view?: 'inbox' | 'policies' }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { applyApproved, employees } = useOwnerState()
  const { requests, pending, approve, reject, breakGlass, canSign, blockReason, actor, policyFor } = useGovernance()
  const [decide, setDecide] = useState<{ r: ApprovalRequest; mode: 'approve' | 'reject' | 'glass' } | null>(null)

  const decided = requests.filter((r) => r.status !== 'pending')
  const signable = pending.filter((r) => canSign(r)).length

  const stats = [
    { label: { en: 'Awaiting signature', ar: 'بانتظار التوقيع' }, value: String(pending.length), sub: { en: 'Nothing has taken effect yet', ar: 'لم يُنفَّذ منها شيء بعد' }, tone: 'dark' as const },
    { label: { en: 'You can sign', ar: 'يمكنك توقيعها' }, value: String(signable), sub: { en: 'Within your authority', ar: 'ضمن صلاحيتك' }, tone: 'gold' as const },
    { label: { en: 'Approved', ar: 'معتمدة' }, value: String(requests.filter((r) => r.status === 'approved').length), sub: { en: 'Executed', ar: 'نُفّذت' }, tone: 'green' as const },
    { label: { en: 'Rejected', ar: 'مرفوضة' }, value: String(requests.filter((r) => r.status === 'rejected').length), sub: { en: 'Turned down', ar: 'رُدّت' }, tone: 'plain' as const },
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
    const p = policyFor(r.kind)
    const block = blockReason(r)
    const who = approversFor(employees, p, r.amountMinor)
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

        {r.steps.length > 1 && (
          <div className="flex flex-wrap items-center gap-xs">
            {r.steps.map((st, i) => {
              const done = i < r.signatures.length
              const now = i === r.signatures.length && r.status === 'pending'
              return (
                <span key={i} className={cn('inline-flex items-center gap-xxs rounded-pill border px-2 py-0.5 font-sans text-caption',
                  done ? 'border-success/30 bg-success/10 text-success' : now ? 'border-primary bg-primary/[0.08] text-primary-hover' : 'border-hairline text-ink-subtle')}>
                  {done && <Check size={11} />}
                  {i + 1}. {st.roles.length === 0 ? pick({ en: 'Owner', ar: 'المالك' }) : st.roles.map((x) => pick(jobRoleOf(x)!.label)).join(' / ')}
                </span>
              )
            })}
          </div>
        )}

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
      <PanelHead title={pick({ en: 'Approvals', ar: 'الاعتمادات' })}
        subtitle={pick({ en: 'Decisions waiting on a signature · nothing takes effect until it is signed', ar: 'قرارات بانتظار التوقيع · لا ينفذ منها شيء قبل اعتماده' })} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      {view === 'policies' ? <ChainsView /> : (
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><Inbox size={17} className="text-primary-hover" /> {pick({ en: 'Awaiting signature', ar: 'بانتظار التوقيع' })} · {pending.length}</h3>
          {pending.length === 0
            ? (
              <div className="card p-lg flex flex-col gap-xs">
                <p className="font-sans text-data text-ink-subtle">{pick({ en: 'Nothing is waiting.', ar: 'لا يوجد ما ينتظر.' })}</p>
                <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Requests are not created here — a guarded action raises one by itself once it passes its chain’s limit. Open Approval chains to see every chain, what it costs to trigger it, and who may sign it.', ar: 'الطلبات لا تُنشأ من هنا — الإجراء المحكوم يرفع طلبه بنفسه متى تجاوز حدّ سلسلته. افتح «سلاسل الاعتماد» لترى كل سلسلة وحدّها ومن يوقّعها.' })}</p>
              </div>
            )
            : pending.map(card)}
        </div>
        {decided.length > 0 && (
          <div className="flex flex-col gap-md">
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Decided', ar: 'محسومة' })} · {decided.length}</h3>
            {decided.map(card)}
          </div>
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

/** Every approval chain in one place: what triggers it, what it lets through untouched,
 *  who may sign it, and whether anyone actually holds that role right now. Chains are not
 *  created here — the fifteen guarded decisions each own one — but their limits are set
 *  here, and a chain can be switched off entirely when it is more friction than it is worth. */
function ChainsView() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { employees } = useOwnerState()
  const { chains, setPolicy, policyOverrides, removeChain } = useGovernance()
  const [editing, setEditing] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [raising, setRaising] = useState<string | null>(null)

  const active = chains.filter((p) => p.enabled !== false).length
  const unstaffed = chains.filter((p) => p.enabled !== false && approversFor(employees, p).length === 0)

  const stats = [
    { label: { en: 'Chains', ar: 'السلاسل' }, value: String(chains.length), sub: { en: 'Wired to actions, plus your own', ar: 'موصولة بإجراءات، وما أضفته' }, tone: 'dark' as const },
    { label: { en: 'Switched on', ar: 'مفعّلة' }, value: String(active), sub: { en: 'Holding decisions', ar: 'تحجز القرارات' }, tone: 'green' as const },
    { label: { en: 'Edited', ar: 'معدّلة' }, value: String(Object.keys(policyOverrides).length), sub: { en: 'Changed from the defaults', ar: 'غُيّرت عن الأصل' }, tone: 'gold' as const },
    { label: { en: 'Without a signer', ar: 'بلا موقّع' }, value: String(unstaffed.length), sub: { en: 'Only the owner can sign', ar: 'لا يوقّعها إلا المالك' }, tone: 'plain' as const },
  ]

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      <p className="inline-flex items-start gap-xs font-sans text-caption text-ink-muted rounded-lg bg-surface-2 border border-hairline p-md">
        <Lock size={14} className="mt-0.5 shrink-0 text-primary-hover" />
        <span>{pick({
          en: 'A chain runs by itself: do the guarded action, and if its value passes the limit below, it is held here for a signature instead of taking effect. Under the limit it simply goes through. Nobody signs what they raised, so a chain with no one but the owner in its roles will stall on anything the owner starts.',
          ar: 'السلسلة تعمل من تلقاء نفسها: نفّذ الإجراء المحكوم، فإن تجاوزت قيمته الحدّ أدناه حُجز للتوقيع بدل أن ينفذ، وإن كان دونه مرّ مباشرة. ولا أحد يوقّع ما رفعه، فالسلسلة التي لا يحمل أدوارها أحد غير المالك ستتعطّل على ما يبدأه المالك نفسه.',
        })}</span>
      </p>

      {unstaffed.length > 0 && (
        <p className="inline-flex items-start gap-xs font-sans text-caption text-ink rounded-lg bg-primary/[0.06] border border-primary/25 p-md">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-primary-hover" />
          <span>{pick({ en: `${unstaffed.length} chain(s) have nobody in a signing role. Give an employee the matching job role in Team & staff, or those decisions can only ever be signed by the owner.`, ar: `${unstaffed.length} سلسلة لا يحمل أدوارها أحد. أسنِد الدور المناسب لموظف من «الفريق والموظفون»، وإلا لن يوقّع تلك القرارات إلا المالك.` })}</span>
        </p>
      )}

      <div className="flex items-center justify-between gap-sm">
        <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Chains in force', ar: 'السلاسل السارية' })} · {chains.length}</h3>
        <button onClick={() => setLibraryOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'Add a chain', ar: 'إضافة سلسلة' })}</button>
      </div>

      <div className="flex flex-col gap-sm">
        {chains.map((p) => {
          const base = { kind: p.kind }
          const custom = isCustomChain(p.kind)
          const off = p.enabled === false
          const signers = approversFor(employees, p)
          const edited = policyOverrides[base.kind] != null
          const roleNames = p.steps.length === 0
            ? pick({ en: 'Owner only', ar: 'المالك فقط' })
            : p.steps.map((st, i) => `${i + 1}. ${st.roles.length === 0 ? pick({ en: 'Owner', ar: 'المالك' }) : st.roles.map((r) => pick(jobRoleOf(r)!.label)).join(' / ')}`).join(' → ')
          return (
            <div key={base.kind} className={cn('card p-lg flex flex-col gap-sm', off && 'opacity-70')}>
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-xs">
                    <h4 className="font-serif text-card-title text-ink">{pick(p.label)}</h4>
                    {off
                      ? <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Switched off', ar: 'موقوفة' })}</Pill>
                      : <Pill color="#2f7d5b" bg="#e6f2ea">{pick({ en: 'On', ar: 'مفعّلة' })}</Pill>}
                    {edited && <Pill color="#2e5f8a" bg="#e7f0f8">{pick({ en: 'Edited', ar: 'معدّلة' })}</Pill>}
                    {custom && <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Raised by hand', ar: 'تُرفع يدويًا' })}</Pill>}
                  </div>
                  <p className="font-sans text-data text-ink-muted mt-xxs">{pick(p.desc)}</p>
                </div>
                <div className="flex items-center gap-xs shrink-0">
                  {custom && !off && (
                    <button onClick={() => setRaising(p.kind)} className={buttonClass('secondary', 'sm')}>
                      <Inbox size={14} /> {pick({ en: 'Raise a request', ar: 'رفع طلب' })}
                    </button>
                  )}
                  <button onClick={() => setEditing(editing === base.kind ? null : base.kind)} className={buttonClass('secondary', 'sm')}>
                    <Settings2 size={14} /> {pick({ en: 'Adjust', ar: 'ضبط' })}
                  </button>
                  <button onClick={() => { setPolicy(base.kind, { enabled: off }); flash(pick(off ? { en: 'Chain switched on', ar: 'فُعّلت السلسلة' } : { en: 'Chain switched off', ar: 'أُوقفت السلسلة' })) }}
                    className={buttonClass(off ? 'primary' : 'ghost', 'sm')}>
                    {off ? pick({ en: 'Switch on', ar: 'تفعيل' }) : pick({ en: 'Switch off', ar: 'إيقاف' })}
                  </button>
                  {custom && (
                    <button onClick={() => { removeChain(p.kind); flash(pick({ en: 'Chain removed', ar: 'حُذفت السلسلة' })) }}
                      className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/10 transition-colors" aria-label={pick({ en: 'Remove chain', ar: 'حذف السلسلة' })}><Trash2 size={15} /></button>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-md rounded-lg bg-surface-2 border border-hairline p-md">
                <div className="flex flex-col gap-xxs">
                  <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Passes untouched below', ar: 'يمرّ بلا حجز تحت' })}</span>
                  <span className="font-sans text-data text-ink tabular-nums">
                    {off ? pick({ en: 'Everything', ar: 'كل شيء' })
                      : p.autoBelowMinor == null ? pick({ en: 'Nothing — always held', ar: 'لا شيء — يُحجز دائمًا' })
                        : money(p.autoBelowMinor)}
                  </span>
                </div>
                <div className="flex flex-col gap-xxs">
                  <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Owner co-signs above', ar: 'توقيع المالك فوق' })}</span>
                  <span className="font-sans text-data text-ink tabular-nums">{p.dualAboveMinor == null ? '—' : money(p.dualAboveMinor)}</span>
                </div>
                <div className="flex flex-col gap-xxs">
                  <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Signed by', ar: 'يوقّعها' })}</span>
                  <span className="font-sans text-data text-ink">{roleNames}</span>
                </div>
              </div>

              <div className="font-sans text-caption text-ink-subtle">
                {signers.length > 0
                  ? <>{pick({ en: 'Right now', ar: 'حاليًا' })}: {signers.map((e) => pick(e.name)).join(' · ')}</>
                  : <span className="text-ink-muted">{pick({ en: 'No employee holds a signing role for this — it rests with the owner.', ar: 'لا موظف يحمل دور توقيعها — تبقى لدى المالك.' })}</span>}
              </div>

              {editing === base.kind && (
                <ChainEditor kind={base.kind} onClose={() => setEditing(null)} />
              )}
            </div>
          )
        })}
      </div>

      {libraryOpen && <ChainLibrary onClose={() => setLibraryOpen(false)} />}
      {raising && <RaiseRequestModal kind={raising} onClose={() => setRaising(null)} />}
    </div>
  )
}

/** The chains a business runs on that no screen performs: spending, hiring, contracts,
 *  recalls. Adding one gives that decision a limit, a signer and a trail; its requests are
 *  raised by hand, because nothing in the console can raise them for you. */
function ChainLibrary({ onClose }: { onClose: () => void }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { addChain, customChains } = useGovernance()
  const [q, setQ] = useState('')
  const taken = new Set(customChains.map((c) => c.label.en))
  const query = q.trim().toLowerCase()
  const shown = chainTemplates.filter((t) => query === '' || [t.label.en, t.label.ar, t.desc.en, t.desc.ar, t.group.en, t.group.ar].some((x) => x.toLowerCase().includes(query)))
  const groups = Array.from(new Set(shown.map((t) => t.group.en)))

  const add = (t: ChainTemplate) => {
    addChain({ label: t.label, desc: t.desc, autoBelowMinor: t.autoBelowMinor, dualAboveMinor: t.dualAboveMinor, steps: t.steps, valueless: t.valueless, enabled: true })
    flash(`${pick({ en: 'Chain added', ar: 'أُضيفت السلسلة' })} · ${pick(t.label)}`)
  }

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Approvals', ar: 'الاعتمادات' })} title={pick({ en: 'Add an approval chain', ar: 'إضافة سلسلة اعتماد' })}
      footer={<button onClick={onClose} className={buttonClass('primary', 'sm')}>{pick({ en: 'Done', ar: 'تم' })}</button>}>
      <div className="flex flex-col gap-md">
        <p className="font-sans text-caption text-ink-subtle">{pick({
          en: 'These are decisions the console does not perform, so nothing raises them on its own — you raise a request against the chain when the decision comes up. Everything else works the same: a limit, an order of signers, and a trail.',
          ar: 'هذه قرارات لا تنفّذها اللوحة، فلا شيء يرفعها تلقائيًا — أنت ترفع الطلب على السلسلة حين يحين القرار. وما عدا ذلك يعمل كالمعتاد: حدّ، وترتيب موقّعين، وأثر مسجّل.',
        })}</p>
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-ink-subtle pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input ps-10" placeholder={pick({ en: 'Search the library…', ar: 'ابحث في المكتبة…' })} />
        </div>
        {groups.map((g) => (
          <div key={g} className="flex flex-col gap-xs">
            <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(shown.find((t) => t.group.en === g)!.group)}</span>
            <div className="rounded-md border border-hairline-strong divide-y divide-hairline">
              {shown.filter((t) => t.group.en === g).map((t) => (
                <div key={t.key} className="flex flex-wrap items-center justify-between gap-sm px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-data text-ink">{pick(t.label)}</span>
                    <span className="block font-sans text-caption text-ink-subtle">{pick(t.desc)}</span>
                    <span className="block font-sans text-caption text-ink-subtle tabular-nums">
                      {t.steps.map((st, i) => `${i + 1}. ${st.roles.map((r) => pick(jobRoleOf(r)!.label)).join(' / ')}`).join(' → ')}
                      {t.autoBelowMinor != null && ` · ${pick({ en: 'passes below', ar: 'يمرّ تحت' })} ${money(t.autoBelowMinor)}`}
                    </span>
                  </span>
                  <button onClick={() => add(t)} className={buttonClass(taken.has(t.label.en) ? 'ghost' : 'secondary', 'sm')}>
                    <Plus size={14} /> {taken.has(t.label.en) ? pick({ en: 'Add again', ar: 'إضافة أخرى' }) : pick({ en: 'Add', ar: 'إضافة' })}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Nothing in the library matches that.', ar: 'لا شيء في المكتبة يطابق ذلك.' })}</p>}
      </div>
    </Modal>
  )
}

/** Raise a request against a chain the owner added. */
function RaiseRequestModal({ kind, onClose }: { kind: string; onClose: () => void }) {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { policyFor, raiseManual } = useGovernance()
  const p = policyFor(kind)
  const [subject, setSubject] = useState('')
  const [detail, setDetail] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const valid = subject.trim() !== '' && reason.trim().length > 3

  const send = () => {
    raiseManual({
      kind,
      subject: { en: subject.trim(), ar: subject.trim() },
      detail: { en: detail.trim() || p.desc.en, ar: detail.trim() || p.desc.ar },
      amountMinor: (parseInt(amount.replace(/\D/g, ''), 10) || 0) * 100,
      reason: reason.trim(),
    })
    flash(pick({ en: 'Raised — waiting for its first signature', ar: 'رُفع — بانتظار أول توقيع' }))
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick(p.label)} title={pick({ en: 'Raise a request', ar: 'رفع طلب' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={send} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Raise', ar: 'رفع' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'What is being decided', ar: 'ما المطلوب إقراره' })}</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Cold room compressor', ar: 'مثال: ضاغط غرفة التبريد' })} autoFocus /></label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Detail (optional)', ar: 'التفصيل (اختياري)' })}</span>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} className="input" placeholder={pick(p.desc)} /></label>
        {!p.valueless && (
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Value (﷼)', ar: 'القيمة (﷼)' })}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className="input tabular-nums" inputMode="numeric" placeholder="0" />
            <span className="font-sans text-caption text-ink-subtle">{p.autoBelowMinor == null
              ? pick({ en: 'This chain holds every request, whatever it is worth.', ar: 'هذه السلسلة تحجز كل طلب مهما كانت قيمته.' })
              : pick({ en: 'Below the chain’s limit it would clear on its own — raised by hand, it is held either way.', ar: 'تحت حدّ السلسلة يمرّ تلقائيًا — أما المرفوع يدويًا فيُحجز في الحالتين.' })}</span>
          </label>
        )}
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Why (required)', ar: 'المبرر (إلزامي)' })}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input resize-none" /></label>
      </div>
    </Modal>
  )
}

/** Set a chain's two numbers. Both accept a blank, which means "no threshold" — and for the
 *  pass-through limit that reads as: hold every one of these, whatever it is worth. */
function ChainEditor({ kind, onClose }: { kind: string; onClose: () => void }) {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { policyFor, setPolicy, resetPolicy, policyOverrides } = useGovernance()
  const p = policyFor(kind)
  const [steps, setSteps] = useState<ApprovalStep[]>(() => p.steps.map((st) => ({ roles: [...st.roles] })))
  const [auto, setAuto] = useState(p.autoBelowMinor == null ? '' : String(Math.round(p.autoBelowMinor / 100)))
  const [dual, setDual] = useState(p.dualAboveMinor == null ? '' : String(Math.round(p.dualAboveMinor / 100)))
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0) * 100)

  const save = () => {
    setPolicy(kind, { autoBelowMinor: num(auto), dualAboveMinor: num(dual), steps })
    flash(pick({ en: 'Chain updated', ar: 'حُدّثت السلسلة' }))
    onClose()
  }

  return (
    <div className="flex flex-col gap-md rounded-lg border border-hairline-strong p-md">
      {p.valueless && (
        <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'This decision is not governed by a value — it is always held while the chain is on. The limits below have no effect on it.', ar: 'هذا القرار لا تحكمه قيمة — يُحجز دائمًا ما دامت السلسلة مفعّلة، ولا أثر للحدّين أدناه عليه.' })}</p>
      )}
      {/* the chain itself: who signs, and in what order */}
      <div className="flex flex-col gap-xs">
        <span className="label">{pick({ en: 'Who signs it, in order', ar: 'من يوقّعها، بالترتيب' })}</span>
        {steps.length === 0 && <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No steps — only the owner can sign it.', ar: 'بلا درجات — لا يوقّعها إلا المالك.' })}</p>}
        {steps.map((st, i) => (
          <div key={i} className="rounded-lg border border-hairline p-md flex flex-col gap-xs">
            <div className="flex items-center justify-between gap-sm">
              <span className="font-sans text-caption text-ink-muted">{pick({ en: 'Step', ar: 'الدرجة' })} {i + 1}{st.roles.length === 0 && ` · ${pick({ en: 'owner', ar: 'المالك' })}`}</span>
              <button onClick={() => setSteps(steps.filter((_, x) => x !== i))} className="grid place-items-center w-7 h-7 rounded-md text-ink-subtle hover:text-danger transition-colors" aria-label={pick({ en: 'Remove step', ar: 'حذف الدرجة' })}><Trash2 size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-xxs">
              {jobRoles.filter((r) => r.key !== 'auditor').map((r) => {
                const on = st.roles.includes(r.key)
                return (
                  <button key={r.key} type="button"
                    onClick={() => setSteps(steps.map((x, xi) => (xi === i ? { roles: on ? x.roles.filter((k) => k !== r.key) : [...x.roles, r.key] } : x)))}
                    className={cn('rounded-pill border px-2.5 py-1 font-sans text-caption transition-colors',
                      on ? 'border-primary bg-primary/[0.08] text-primary-hover' : 'border-hairline-strong text-ink-muted hover:text-ink')}>
                    {on && '✓ '}{pick(r.label)}
                  </button>
                )
              })}
            </div>
            <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Any one of the ticked roles signs this step. Leave it empty and it becomes the owner’s.', ar: 'يوقّع هذه الدرجة أيٌّ من الأدوار المحددة. واتركها فارغة فتصير للمالك.' })}</span>
          </div>
        ))}
        <button onClick={() => setSteps([...steps, { roles: [] }])} className={buttonClass('ghost', 'sm')}><Plus size={14} /> {pick({ en: 'Add a step', ar: 'إضافة درجة' })}</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Passes untouched below (﷼)', ar: 'يمرّ بلا حجز تحت (﷼)' })}</span>
          <input value={auto} onChange={(e) => setAuto(e.target.value.replace(/\D/g, ''))} className="input tabular-nums" inputMode="numeric" placeholder={pick({ en: 'blank = always held', ar: 'اتركه فارغًا = يُحجز دائمًا' })} />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Owner co-signs above (﷼)', ar: 'توقيع المالك فوق (﷼)' })}</span>
          <input value={dual} onChange={(e) => setDual(e.target.value.replace(/\D/g, ''))} className="input tabular-nums" inputMode="numeric" placeholder={pick({ en: 'blank = never', ar: 'اتركه فارغًا = لا يلزم' })} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-sm">
        <button onClick={save} className={buttonClass('primary', 'sm')}><Check size={15} /> {pick({ en: 'Save chain', ar: 'حفظ السلسلة' })}</button>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        {policyOverrides[kind] && (
          <button onClick={() => { resetPolicy(kind); flash(pick({ en: 'Chain restored to its default', ar: 'أُعيدت السلسلة لأصلها' })); onClose() }}
            className="link-gold text-caption">{pick({ en: 'Restore the default', ar: 'استعادة الأصل' })}</button>
        )}
      </div>
    </div>
  )
}
