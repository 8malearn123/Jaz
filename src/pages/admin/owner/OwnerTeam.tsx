import { useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, Check, Network, ChevronDown, Lock } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { teamPermissions, type Employee, type TeamPermission } from '@/data/ownerTeam'
import { jobRoles, jobRoleOf, sensitivePerms, type JobRole } from '@/data/governance'
import { useOwnerState } from '@/state/OwnerStateContext'
import { useGovernance } from '@/state/GovernanceContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, Pill } from './_shared'

const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')

// Tree geometry, in pixels. A row is `py-1.5` around a 36px avatar, so its centre — where
// an elbow meets a node and where a last child's spine stops — sits at 24. BRANCH is what
// makes the lines actually connect: a child's spine has to fall under its parent's avatar
// centre, which is the button's own 8px padding plus half that avatar.
const RAIL = 30 // how far a node sits from the spine it hangs off
const BRANCH = 26 // 8px button padding + 18px half-avatar
const ROW_MID = 24
const permOf = (k: TeamPermission) => teamPermissions.find((p) => p.key === k)!

/** Team & staff: create accounts, give each one a job role and a place in the org chart,
 *  and grant per-section permissions. The role is what decides what a person may approve;
 *  the reporting line is who they answer to. */
export function OwnerTeam() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive } = useOwnerState()
  const { submit } = useGovernance()
  const [addOpen, setAddOpen] = useState(false)
  const [permsId, setPermsId] = useState<string | null>(null)
  const [roleId, setRoleId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const permsEmp = employees.find((e) => e.id === permsId) ?? null
  const roleEmp = employees.find((e) => e.id === roleId) ?? null
  const deleteEmp = employees.find((e) => e.id === deleteId) ?? null
  const activeCount = employees.filter((e) => e.active).length
  const roleCount = employees.filter((e) => e.role).length

  const stats = [
    { label: { en: 'Employees', ar: 'الموظفون' }, value: String(employees.length), sub: { en: 'On the team', ar: 'ضمن الفريق' }, tone: 'dark' as const },
    { label: { en: 'Active', ar: 'نشطون' }, value: String(activeCount), sub: { en: 'Can sign in', ar: 'يمكنهم الدخول' }, tone: 'green' as const },
    { label: { en: 'With a job role', ar: 'لديهم دور وظيفي' }, value: String(roleCount), sub: { en: 'Can be given authority', ar: 'يمكن منحهم صلاحية اعتماد' }, tone: 'gold' as const },
    { label: { en: 'Permission areas', ar: 'مجالات الصلاحيات' }, value: String(teamPermissions.length), sub: { en: 'Grantable sections', ar: 'أقسام قابلة للمنح' }, tone: 'plain' as const },
  ]

  // Granting leverage is itself a decision; taking it away never is.
  const onTogglePerm = (emp: Employee, perm: TeamPermission) => {
    const granting = !emp.perms.includes(perm)
    if (granting && sensitivePerms.includes(perm)) {
      const out = submit({
        kind: 'perm_grant',
        subject: { en: `${emp.name.en} · ${permOf(perm).label.en}`, ar: `${emp.name.ar} · ${permOf(perm).label.ar}` },
        detail: { en: `Grant ${permOf(perm).label.en} access to ${emp.name.en}`, ar: `منح صلاحية ${permOf(perm).label.ar} لـ${emp.name.ar}` },
        payload: { employeeId: emp.id, perm },
      })
      if (out.outcome === 'pending') { flash(pick({ en: 'Sent for approval — access unchanged', ar: 'رُفعت للاعتماد — لم تتغير الصلاحية' })); return }
    }
    toggleEmployeePerm(emp.id, perm)
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Team & staff', ar: 'الفريق والموظفون' })} subtitle={pick({ en: 'Accounts, job roles, reporting lines and per-section permissions', ar: 'الحسابات والأدوار الوظيفية وخطوط التبعية وصلاحيات الأقسام' })}
        action={<button onClick={() => setAddOpen(true)} className={buttonClass('primary', 'sm')}><UserPlus size={15} /> {pick({ en: 'Add employee', ar: 'إضافة موظف' })}</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      <OrgTree employees={employees} onPick={setRoleId} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                {[{ h: { en: 'Employee', ar: 'الموظف' }, a: 'text-start' }, { h: { en: 'Role · reports to', ar: 'الدور · التبعية' }, a: 'text-start' }, { h: { en: 'Permissions', ar: 'الصلاحيات' }, a: 'text-start' }, { h: { en: 'Status', ar: 'الحالة' }, a: 'text-start' }, { h: { en: 'Actions', ar: 'إجراءات' }, a: 'text-end' }].map((c, i) => (
                  <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan={5} className="px-lg py-md font-sans text-data text-ink-subtle">{pick({ en: 'No staff accounts yet — add one to start assigning roles.', ar: 'لا حسابات موظفين بعد — أضف حسابًا لتبدأ بإسناد الأدوار.' })}</td></tr>
              )}
              {employees.map((e) => {
                const def = jobRoleOf(e.role)
                const mgr = employees.find((m) => m.id === e.managerId) ?? null
                return (
                  <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-sm">
                        <span className="grid place-items-center w-10 h-10 rounded-pill bg-primary/10 text-primary-hover font-sans text-data font-semibold shrink-0">{initials(pick(e.name))}</span>
                        <div className="min-w-0">
                          <p className="font-sans text-data text-ink truncate">{pick(e.name)}</p>
                          <p className="font-sans text-caption text-ink-subtle truncate" dir="ltr">{e.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      {def
                        ? <Pill color="#355c4b" bg="#e8f0ec">{pick(def.label)}</Pill>
                        : <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'No role yet', ar: 'بلا دور بعد' })}</span>}
                      <p className="font-sans text-caption text-ink-subtle mt-xxs">
                        {mgr ? `${pick({ en: 'Reports to', ar: 'يتبع' })} ${pick(mgr.name)}` : pick({ en: 'Reports to the owner', ar: 'يتبع المالك' })}
                      </p>
                      {def && def.ceilingMinor != null && def.ceilingMinor > 0 && (
                        <p className="font-sans text-caption text-ink-subtle tabular-nums">{pick({ en: 'Signs up to', ar: 'يوقّع حتى' })} {money(def.ceilingMinor)}</p>
                      )}
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex flex-wrap gap-xxs max-w-[260px]">
                        {e.perms.length === 0
                          ? <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'No permissions yet', ar: 'بدون صلاحيات بعد' })}</span>
                          : e.perms.map((k) => <span key={k} className="rounded-pill border border-hairline-strong bg-surface-2 px-2 py-0.5 font-sans text-caption text-ink">{pick(permOf(k).label)}</span>)}
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <button onClick={() => { toggleEmployeeActive(e.id); flash(`${pick(e.name)} — ${pick(e.active ? { en: 'suspended', ar: 'أُوقف' } : { en: 'activated', ar: 'فُعّل' })}`) }} aria-label={pick({ en: 'Toggle status', ar: 'تبديل الحالة' })}>
                        {e.active ? <Pill color="#2f7d5b" bg="#e6f2ea">{pick({ en: 'Active', ar: 'نشط' })}</Pill> : <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Suspended', ar: 'موقوف' })}</Pill>}
                      </button>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center justify-end gap-xs">
                        <button onClick={() => setRoleId(e.id)} className="inline-flex items-center gap-xxs rounded-md border border-hairline px-2.5 py-1.5 font-sans text-caption text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"><Network size={14} /> {pick({ en: 'Role', ar: 'الدور' })}</button>
                        <button onClick={() => setPermsId(e.id)} className="inline-flex items-center gap-xxs rounded-md border border-hairline px-2.5 py-1.5 font-sans text-caption text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"><ShieldCheck size={14} /> {pick({ en: 'Permissions', ar: 'الصلاحيات' })}</button>
                        <button onClick={() => setDeleteId(e.id)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/10 transition-colors" aria-label={pick({ en: 'Remove employee', ar: 'حذف الموظف' })}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline font-sans text-caption text-ink-subtle">{employees.length} {pick({ en: 'employees · click the status pill to activate / suspend', ar: 'موظف · اضغط على شارة الحالة للتفعيل أو الإيقاف' })}</div>
      </div>

      {addOpen && <AddEmployeeModal employees={employees} onClose={() => setAddOpen(false)} onSubmit={(e) => { addEmployee(e); flash(`${pick({ en: 'Employee added', ar: 'أُضيف الموظف' })} · ${pick(e.name)}`) }} />}

      {roleEmp && <RoleModal emp={roleEmp} onClose={() => setRoleId(null)} />}

      {/* permissions editor — revoking applies live, granting a sensitive one goes for approval */}
      {permsEmp && (
        <Modal open onClose={() => setPermsId(null)} size="md" eyebrow={pick(permsEmp.title)} title={`${pick({ en: 'Permissions', ar: 'صلاحيات' })} · ${pick(permsEmp.name)}`}
          footer={<button onClick={() => setPermsId(null)} className={buttonClass('primary', 'sm')}>{pick({ en: 'Done', ar: 'تم' })}</button>}>
          <div className="flex flex-col gap-xs">
            {teamPermissions.map((p) => {
              const on = permsEmp.perms.includes(p.key)
              const guarded = sensitivePerms.includes(p.key)
              return (
                <button key={p.key} type="button" onClick={() => onTogglePerm(permsEmp, p.key)} className={cn('flex items-center gap-sm rounded-lg border px-md py-sm text-start transition-colors', on ? 'border-primary bg-primary/[0.06]' : 'border-hairline hover:border-ink/30')}>
                  <span className={cn('grid place-items-center w-5 h-5 rounded border shrink-0 transition-colors', on ? 'bg-primary border-primary text-on-primary' : 'border-hairline-strong')}>{on && <Check size={13} />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-data text-ink">{pick(p.label)}{guarded && <span className="text-ink-subtle text-caption"> · {pick({ en: 'needs approval to grant', ar: 'منحها يحتاج اعتمادًا' })}</span>}</span>
                    <span className="block font-sans text-caption text-ink-subtle">{pick(p.desc)}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="font-sans text-caption text-ink-subtle mt-md inline-flex items-start gap-xs"><Lock size={13} className="mt-0.5 shrink-0" /> {pick({ en: 'Purchases, waste and products hand over real leverage — granting one is raised as a decision, revoking one applies at once.', ar: 'المشتريات والهدر والمنتجات صلاحيات ذات أثر حقيقي — منحها يُرفع كقرار، وسحبها ينفذ فورًا.' })}</p>
        </Modal>
      )}

      {/* delete confirmation */}
      {deleteEmp && (
        <Modal open onClose={() => setDeleteId(null)} size="sm" eyebrow={pick({ en: 'Team', ar: 'الفريق' })} title={pick({ en: 'Remove employee?', ar: 'حذف الموظف؟' })}
          footer={<>
            <button onClick={() => setDeleteId(null)} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
            <button onClick={() => { removeEmployee(deleteEmp.id); setDeleteId(null); flash(`${pick({ en: 'Employee removed', ar: 'حُذف الموظف' })} · ${pick(deleteEmp.name)}`) }} className="btn btn-sm bg-danger text-on-danger hover:bg-danger/90"><Trash2 size={15} /> {pick({ en: 'Remove', ar: 'حذف' })}</button>
          </>}>
          <p className="font-sans text-data text-ink">{pick({ en: 'This removes', ar: 'سيُحذف' })} <b>{pick(deleteEmp.name)}</b> — {pick(deleteEmp.title)}.</p>
          <p className="font-sans text-caption text-ink-subtle mt-xs">{pick({ en: 'All granted permissions are revoked immediately, and anyone reporting to them moves up to their manager. This cannot be undone.', ar: 'تُسحب كل الصلاحيات فورًا، ويُنقل من يتبعونه إلى مديره. لا يمكن التراجع عن هذا الإجراء.' })}</p>
        </Modal>
      )}
    </div>
  )
}

/** The org chart, drawn as a tree: every person sits under whoever they report to,
 *  with their own people branching beneath them. The owner is the root, so the whole
 *  team reads as one structure rather than a list of names. */
function OrgTree({ employees, onPick }: { employees: Employee[]; onPick: (id: string) => void }) {
  const { pick } = useLocale()
  const [open, setOpen] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const ids = new Set(employees.map((e) => e.id))
  // A person whose manager is unset (or was removed) branches directly off the owner.
  const roots = employees.filter((e) => !e.managerId || !ids.has(e.managerId))
  const reportsOf = (id: string) => employees.filter((r) => r.managerId === id)
  const toggle = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Everyone beneath a person, however deep — the number that makes a branch worth collapsing.
  const teamSize = (id: string, seen = new Set<string>()): number => {
    if (seen.has(id)) return 0
    seen.add(id)
    return reportsOf(id).reduce((a, r) => a + 1 + teamSize(r.id, seen), 0)
  }

  const node = (e: Employee, isLast: boolean, seen: Set<string>): React.ReactNode => {
    if (seen.has(e.id)) return null
    const next = new Set(seen).add(e.id)
    const reports = reportsOf(e.id)
    const def = jobRoleOf(e.role)
    const shut = collapsed.has(e.id)
    const below = teamSize(e.id)
    return (
      <li key={e.id} className="relative" style={{ paddingInlineStart: RAIL }}>
        {/* the spine this node hangs from — it stops at the elbow when nothing follows */}
        <span aria-hidden className="absolute w-px bg-hairline-strong"
          style={{ insetInlineStart: 0, top: 0, ...(isLast ? { height: ROW_MID } : { bottom: 0 }) }} />
        {/* the elbow into the node itself */}
        <span aria-hidden className="absolute h-px bg-hairline-strong"
          style={{ insetInlineStart: 0, top: ROW_MID, width: RAIL - 6 }} />

        {/* the row hugs its node so the branch keeps its shape — a full-width row would
            stretch every level to the same edge and flatten the tree back into a list */}
        <div className="inline-flex items-center gap-xxs max-w-full">
          <button type="button" onClick={() => onPick(e.id)}
            className="min-w-0 flex items-center gap-sm rounded-lg border border-transparent px-2 py-1.5 text-start hover:border-hairline hover:bg-surface-2 transition-colors">
            <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0 font-sans text-caption font-semibold',
              e.active ? 'bg-primary/10 text-primary-hover' : 'bg-surface-2 text-ink-subtle')}>{initials(pick(e.name))}</span>
            <span className="min-w-0">
              <span className="block font-sans text-data text-ink truncate">
                {pick(e.name)}
                {!e.active && <span className="text-ink-subtle"> · {pick({ en: 'suspended', ar: 'موقوف' })}</span>}
              </span>
              <span className="block font-sans text-caption text-ink-subtle truncate">{def ? pick(def.label) : pick(e.title)}</span>
            </span>
            {reports.length > 0 && (
              <span className="shrink-0 rounded-pill border border-hairline-strong bg-surface-2 px-2 py-0.5 font-sans text-caption text-ink-muted tabular-nums">
                {reports.length} {pick({ en: 'direct', ar: 'مباشر' })}{below > reports.length && ` · ${below} ${pick({ en: 'total', ar: 'الإجمالي' })}`}
              </span>
            )}
          </button>
          {reports.length > 0 && (
            <button type="button" onClick={() => toggle(e.id)} aria-expanded={!shut}
              aria-label={pick({ en: 'Collapse branch', ar: 'طيّ الفرع' })}
              className="grid place-items-center w-7 h-7 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors shrink-0">
              <ChevronDown size={15} className={cn('transition-transform', shut && '-rotate-90 rtl:rotate-90')} />
            </button>
          )}
        </div>

        {reports.length > 0 && !shut && (
          <ul className="relative" style={{ marginInlineStart: BRANCH }}>
            {reports.map((r, i) => node(r, i === reports.length - 1, next))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-sm px-lg py-md border-b border-hairline text-start">
        <span className="min-w-0">
          <span className="block font-serif text-card-title text-ink inline-flex items-center gap-xs"><Network size={17} className="text-primary-hover" /> {pick({ en: 'Org chart', ar: 'الهيكل الإداري' })}</span>
          <span className="block font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Who reports to whom — a decision nobody on a branch can sign climbs it to the owner.', ar: 'من يتبع من — والقرار الذي لا يستطيع أحد في الفرع توقيعه يصعد إلى المالك.' })}</span>
        </span>
        <ChevronDown size={18} className={cn('shrink-0 text-ink-subtle transition-transform', !open && 'rotate-180')} />
      </button>
      {open && (
        <div className="p-lg overflow-x-auto">
          {/* the owner is the root — every branch ultimately hangs off it */}
          <div className="flex items-center gap-sm px-2 py-1.5">
            <span className="grid place-items-center w-9 h-9 rounded-pill bg-ink text-ink-on-dark shrink-0 font-sans text-caption font-semibold">JZ</span>
            <span className="min-w-0">
              <span className="block font-sans text-data text-ink">{pick({ en: 'Owner', ar: 'المالك' })}</span>
              <span className="block font-sans text-caption text-ink-subtle">{pick({ en: 'Top of every escalation line', ar: 'أعلى كل خط تصعيد' })}</span>
            </span>
            {employees.length > 0 && (
              <span className="shrink-0 rounded-pill border border-hairline-strong bg-surface-2 px-2 py-0.5 font-sans text-caption text-ink-muted tabular-nums">
                {employees.length} {pick({ en: 'in the team', ar: 'في الفريق' })}
              </span>
            )}
          </div>
          {roots.length === 0
            ? <p className="px-2 pt-sm font-sans text-caption text-ink-subtle">{pick({ en: 'No employees yet — add one and it appears on this chart.', ar: 'لا موظفين بعد — أضف موظفًا فيظهر في هذا الهيكل.' })}</p>
            : (
              <ul className="relative" style={{ marginInlineStart: BRANCH }}>
                {roots.map((e, i) => node(e, i === roots.length - 1, new Set()))}
              </ul>
            )}
        </div>
      )}
    </div>
  )
}

/** Assign a job role and a manager. The role is what grants authority to approve. */
function RoleModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { employees, setEmployeeRole, setEmployeeManager } = useOwnerState()
  const [role, setRole] = useState<JobRole | ''>(emp.role ?? '')
  const [manager, setManager] = useState<string>(emp.managerId ?? '')
  const def = jobRoleOf(role || undefined)
  // Anyone but this person and anyone already beneath them — a loop is not a hierarchy.
  const candidates = employees.filter((e) => e.id !== emp.id && !isBeneath(employees, e.id, emp.id))

  const save = () => {
    if (role) setEmployeeRole(emp.id, role)
    const ok = setEmployeeManager(emp.id, manager === '' ? null : manager)
    if (!ok) { flash(pick({ en: 'That would create a loop in the org chart', ar: 'هذا يُنشئ حلقة مغلقة في الهيكل' })); return }
    flash(`${pick(emp.name)} — ${pick({ en: 'role & reporting saved', ar: 'حُفظ الدور والتبعية' })}`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick(emp.title)} title={`${pick({ en: 'Role & reporting', ar: 'الدور والتبعية' })} · ${pick(emp.name)}`}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={save} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save', ar: 'حفظ' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Job role', ar: 'الدور الوظيفي' })}</span>
          <select value={role} onChange={(e) => setRole(e.target.value as JobRole | '')} className={cn('input cursor-pointer', role === '' && 'text-ink-subtle')}>
            <option value="" disabled>{pick({ en: 'Choose a role…', ar: 'اختر دورًا…' })}</option>
            {jobRoles.map((r) => <option key={r.key} value={r.key}>{pick(r.label)}</option>)}
          </select>
          {def && <span className="font-sans text-caption text-ink-subtle">{pick(def.desc)}</span>}
        </label>

        {def && (
          <div className="rounded-lg border border-hairline p-md flex flex-col gap-xs">
            <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'This role may approve', ar: 'يعتمد هذا الدور' })}</span>
            {def.approves.length === 0
              ? <span className="font-sans text-caption text-ink-muted">{pick({ en: 'Nothing — it raises decisions, it does not sign them.', ar: 'لا شيء — يرفع القرارات ولا يوقّعها.' })}</span>
              : <div className="flex flex-wrap gap-xxs">
                {def.approves.map((k) => <span key={k} className="rounded-pill border border-hairline-strong bg-surface-2 px-2 py-0.5 font-sans text-caption text-ink">{pick(policyLabel(k))}</span>)}
              </div>}
            <span className="font-sans text-caption text-ink-subtle tabular-nums">
              {def.ceilingMinor == null
                ? pick({ en: 'No value ceiling', ar: 'بلا سقف مالي' })
                : def.ceilingMinor === 0
                  ? pick({ en: 'Value is not its axis', ar: 'القيمة ليست معياره' })
                  : `${pick({ en: 'Signs up to', ar: 'يوقّع حتى' })} ${money(def.ceilingMinor)}`}
            </span>
            <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Its sections are added to this account’s permissions on save.', ar: 'تُضاف أقسام هذا الدور إلى صلاحيات الحساب عند الحفظ.' })}</span>
          </div>
        )}

        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Reports to', ar: 'يتبع' })}</span>
          <select value={manager} onChange={(e) => setManager(e.target.value)} className="input cursor-pointer">
            <option value="">{pick({ en: 'The owner', ar: 'المالك' })}</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{pick(c.name)}{c.role ? ` · ${pick(jobRoleOf(c.role)!.label)}` : ''}</option>)}
          </select>
          <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'People already reporting to this employee are not offered — that would close a loop.', ar: 'لا يُعرض من يتبعون هذا الموظف أصلًا — لأن ذلك يُغلق حلقة.' })}</span>
        </label>
      </div>
    </Modal>
  )
}

/** Is `candidate` somewhere beneath `root` in the reporting tree? */
function isBeneath(employees: Employee[], candidate: string, root: string): boolean {
  let cursor: string | undefined = candidate
  const seen = new Set<string>()
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const m: string | undefined = employees.find((e) => e.id === cursor)?.managerId
    if (m === root) return true
    cursor = m
  }
  return false
}

// Local label lookup so the modal doesn't need the whole policy table.
function policyLabel(kind: string): Bilingual {
  const found = jobRoles.flatMap((r) => r.approves).includes(kind as never)
  void found
  return DECISION_LABELS[kind] ?? { en: kind, ar: kind }
}
const DECISION_LABELS: Record<string, Bilingual> = {
  credit_limit: { en: 'Credit limits', ar: 'الحدود الائتمانية' },
  stock_take: { en: 'Stock-take variances', ar: 'فروقات الجرد' },
  waste: { en: 'Waste', ar: 'الهدر' },
  invoice_match: { en: 'Invoice matching', ar: 'مطابقة الفواتير' },
  price_change: { en: 'Price changes', ar: 'تغيير الأسعار' },
  fx_rate: { en: 'Exchange rates', ar: 'أسعار الصرف' },
  perm_grant: { en: 'Sensitive permissions', ar: 'الصلاحيات الحساسة' },
  vendor_payment: { en: 'Settlements', ar: 'السداد' },
  order_cancel: { en: 'Order cancellations', ar: 'إلغاء الطلبات' },
  loyalty: { en: 'Loyalty mechanics', ar: 'آلية الولاء' },
  batch_release: { en: 'Batch release', ar: 'إطلاق الدفعات' },
  recipe_change: { en: 'Recipe changes', ar: 'تغيير الوصفات' },
  shelf_life: { en: 'Shelf life', ar: 'العمر الافتراضي' },
  batch_disposition: { en: 'Rejected batches', ar: 'الدفعات المرفوضة' },
  yield_variance: { en: 'Yield variances', ar: 'فروقات العائد' },
}

/** Add an employee with contact details, a job role, a reporting line and initial permissions. */
function AddEmployeeModal({ employees, onClose, onSubmit }: { employees: Employee[]; onClose: () => void; onSubmit: (e: Omit<Employee, 'id' | 'since'>) => void }) {
  const { pick } = useLocale()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<JobRole | ''>('')
  const [manager, setManager] = useState('')
  const [perms, setPerms] = useState<TeamPermission[]>([])

  const emailOk = email.trim() === '' || /^\S+@\S+\.\S+$/.test(email.trim())
  const valid = name.trim() !== '' && title.trim() !== '' && phone.trim() !== '' && emailOk
  const def = jobRoleOf(role || undefined)
  const toggle = (k: TeamPermission) => setPerms((prev) => (prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]))
  const submit = () => {
    // The role's own sections come with it; anything ticked by hand is added on top.
    const merged = Array.from(new Set([...(def?.perms ?? []), ...perms]))
    onSubmit({
      name: { en: name.trim(), ar: name.trim() }, title: { en: title.trim(), ar: title.trim() },
      phone: phone.trim(), email: email.trim(), perms: merged, active: true,
      role: role || undefined, managerId: manager || undefined,
    })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Team', ar: 'الفريق' })} title={pick({ en: 'Add employee', ar: 'إضافة موظف' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}><UserPlus size={15} /> {pick({ en: 'Add employee', ar: 'إضافة الموظف' })}</button></>}>
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Full name', ar: 'الاسم الكامل' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Salem Al-Ghamdi', ar: 'مثال: سالم الغامدي' })} /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Job title', ar: 'المسمى الوظيفي' })}</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Warehouse keeper', ar: 'مثال: أمين المستودع' })} /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Phone', ar: 'الهاتف' })}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input tabular-nums" dir="ltr" inputMode="tel" placeholder="+966 5X XXX XXXX" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Email (optional)', ar: 'البريد الإلكتروني (اختياري)' })}</span><input value={email} onChange={(e) => setEmail(e.target.value)} className={cn('input', !emailOk && 'border-danger')} dir="ltr" inputMode="email" placeholder="name@jaz.sa" /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Job role', ar: 'الدور الوظيفي' })}</span>
            <select value={role} onChange={(e) => setRole(e.target.value as JobRole | '')} className={cn('input cursor-pointer', role === '' && 'text-ink-subtle')}>
              <option value="">{pick({ en: 'No role yet', ar: 'بلا دور بعد' })}</option>
              {jobRoles.map((r) => <option key={r.key} value={r.key}>{pick(r.label)}</option>)}
            </select>
            {def && <span className="font-sans text-caption text-ink-subtle">{pick(def.desc)}</span>}
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Reports to', ar: 'يتبع' })}</span>
            <select value={manager} onChange={(e) => setManager(e.target.value)} className="input cursor-pointer">
              <option value="">{pick({ en: 'The owner', ar: 'المالك' })}</option>
              {employees.map((c) => <option key={c.id} value={c.id}>{pick(c.name)}{c.role ? ` · ${pick(jobRoleOf(c.role)!.label)}` : ''}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Extra permissions', ar: 'صلاحيات إضافية' })}{perms.length > 0 && <span className="text-ink-subtle"> · {perms.length}</span>}</span>
          <div className="grid sm:grid-cols-2 gap-xs">
            {teamPermissions.map((p) => {
              const fromRole = def?.perms.includes(p.key) ?? false
              const on = fromRole || perms.includes(p.key)
              return (
                <button key={p.key} type="button" onClick={() => !fromRole && toggle(p.key)} disabled={fromRole} className={cn('flex items-center gap-sm rounded-lg border px-md py-sm text-start transition-colors', on ? 'border-primary bg-primary/[0.06]' : 'border-hairline hover:border-ink/30', fromRole && 'opacity-70 cursor-default')}>
                  <span className={cn('grid place-items-center w-5 h-5 rounded border shrink-0 transition-colors', on ? 'bg-primary border-primary text-on-primary' : 'border-hairline-strong')}>{on && <Check size={13} />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-data text-ink truncate">{pick(p.label)}{fromRole && <span className="text-ink-subtle text-caption"> · {pick({ en: 'from the role', ar: 'من الدور' })}</span>}</span>
                    <span className="block font-sans text-caption text-ink-subtle truncate">{pick(p.desc)}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'The role brings its own sections. Anything else can be changed later from the employee row.', ar: 'الدور يجلب أقسامه معه. وما عداها يمكن تعديله لاحقًا من صف الموظف.' })}</p>
        </div>
      </div>
    </Modal>
  )
}
