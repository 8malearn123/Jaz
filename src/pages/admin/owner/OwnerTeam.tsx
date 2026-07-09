import { useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, Check } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { teamPermissions, type TeamPermission } from '@/data/ownerTeam'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, Pill } from './_shared'

const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')
const permOf = (k: TeamPermission) => teamPermissions.find((p) => p.key === k)!

/** Team & staff: add/remove employees and grant or revoke their per-section permissions. */
export function OwnerTeam() {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { employees, addEmployee, removeEmployee, toggleEmployeePerm, toggleEmployeeActive } = useOwnerState()
  const [addOpen, setAddOpen] = useState(false)
  const [permsId, setPermsId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const permsEmp = employees.find((e) => e.id === permsId) ?? null
  const deleteEmp = employees.find((e) => e.id === deleteId) ?? null
  const activeCount = employees.filter((e) => e.active).length

  const stats = [
    { label: { en: 'Employees', ar: 'الموظفون' }, value: String(employees.length), sub: { en: 'On the team', ar: 'ضمن الفريق' }, tone: 'dark' as const },
    { label: { en: 'Active', ar: 'نشطون' }, value: String(activeCount), sub: { en: 'Can sign in', ar: 'يمكنهم الدخول' }, tone: 'green' as const },
    { label: { en: 'Suspended', ar: 'موقوفون' }, value: String(employees.length - activeCount), sub: { en: 'Access paused', ar: 'وصول موقوف' }, tone: 'plain' as const },
    { label: { en: 'Permission areas', ar: 'مجالات الصلاحيات' }, value: String(teamPermissions.length), sub: { en: 'Grantable sections', ar: 'أقسام قابلة للمنح' }, tone: 'gold' as const },
  ]

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Team & staff', ar: 'الفريق والموظفون' })} subtitle={pick({ en: 'Add or remove employees · grant per-section permissions', ar: 'إضافة الموظفين وحذفهم · منح صلاحيات محددة لكل قسم' })}
        action={<button onClick={() => setAddOpen(true)} className={buttonClass('primary', 'sm')}><UserPlus size={15} /> {pick({ en: 'Add employee', ar: 'إضافة موظف' })}</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                {[{ h: { en: 'Employee', ar: 'الموظف' }, a: 'text-start' }, { h: { en: 'Contact', ar: 'التواصل' }, a: 'text-start' }, { h: { en: 'Permissions', ar: 'الصلاحيات' }, a: 'text-start' }, { h: { en: 'Status', ar: 'الحالة' }, a: 'text-start' }, { h: { en: 'Actions', ar: 'إجراءات' }, a: 'text-end' }].map((c, i) => (
                  <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <span className="grid place-items-center w-10 h-10 rounded-pill bg-primary/10 text-primary-hover font-sans text-data font-semibold shrink-0">{initials(pick(e.name))}</span>
                      <div className="min-w-0">
                        <p className="font-sans text-data text-ink truncate">{pick(e.name)}</p>
                        <p className="font-sans text-caption text-ink-subtle truncate">{pick(e.title)} · {pick({ en: 'since', ar: 'منذ' })} {pick(e.since)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-md">
                    <p className="font-sans text-caption text-ink tabular-nums" dir="ltr">{e.phone}</p>
                    <p className="font-sans text-caption text-ink-subtle" dir="ltr">{e.email}</p>
                  </td>
                  <td className="px-lg py-md">
                    <div className="flex flex-wrap gap-xxs max-w-[280px]">
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
                      <button onClick={() => setPermsId(e.id)} className="inline-flex items-center gap-xxs rounded-md border border-hairline px-2.5 py-1.5 font-sans text-caption text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"><ShieldCheck size={14} /> {pick({ en: 'Permissions', ar: 'الصلاحيات' })}</button>
                      <button onClick={() => setDeleteId(e.id)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/10 transition-colors" aria-label={pick({ en: 'Remove employee', ar: 'حذف الموظف' })}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline font-sans text-caption text-ink-subtle">{employees.length} {pick({ en: 'employees · click the status pill to activate / suspend', ar: 'موظف · اضغط على شارة الحالة للتفعيل أو الإيقاف' })}</div>
      </div>

      {addOpen && <AddEmployeeModal onClose={() => setAddOpen(false)} onSubmit={(e) => { addEmployee(e); flash(`${pick({ en: 'Employee added', ar: 'أُضيف الموظف' })} · ${pick(e.name)}`) }} />}

      {/* permissions editor — toggles apply live */}
      {permsEmp && (
        <Modal open onClose={() => setPermsId(null)} size="md" eyebrow={pick(permsEmp.title)} title={`${pick({ en: 'Permissions', ar: 'صلاحيات' })} · ${pick(permsEmp.name)}`}
          footer={<button onClick={() => setPermsId(null)} className={buttonClass('primary', 'sm')}>{pick({ en: 'Done', ar: 'تم' })}</button>}>
          <div className="flex flex-col gap-xs">
            {teamPermissions.map((p) => {
              const on = permsEmp.perms.includes(p.key)
              return (
                <button key={p.key} type="button" onClick={() => toggleEmployeePerm(permsEmp.id, p.key)} className={cn('flex items-center gap-sm rounded-lg border px-md py-sm text-start transition-colors', on ? 'border-primary bg-primary/[0.06]' : 'border-hairline hover:border-ink/30')}>
                  <span className={cn('grid place-items-center w-5 h-5 rounded border shrink-0 transition-colors', on ? 'bg-primary border-primary text-on-primary' : 'border-hairline-strong')}>{on && <Check size={13} />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-data text-ink">{pick(p.label)}</span>
                    <span className="block font-sans text-caption text-ink-subtle">{pick(p.desc)}</span>
                  </span>
                </button>
              )
            })}
          </div>
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
          <p className="font-sans text-caption text-ink-subtle mt-xs">{pick({ en: 'All granted permissions are revoked immediately. This cannot be undone.', ar: 'تُسحب كل الصلاحيات الممنوحة فورًا. لا يمكن التراجع عن هذا الإجراء.' })}</p>
        </Modal>
      )}
    </div>
  )
}

/** Add an employee with contact details and an initial permission set. */
function AddEmployeeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (e: { name: Bilingual; title: Bilingual; phone: string; email: string; perms: TeamPermission[]; active: boolean }) => void }) {
  const { pick } = useLocale()
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [perms, setPerms] = useState<TeamPermission[]>([])

  const emailOk = email.trim() === '' || /^\S+@\S+\.\S+$/.test(email.trim())
  const valid = name.trim() !== '' && title.trim() !== '' && phone.trim() !== '' && emailOk
  const toggle = (k: TeamPermission) => setPerms((prev) => (prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]))
  const submit = () => {
    onSubmit({ name: { en: name.trim(), ar: name.trim() }, title: { en: title.trim(), ar: title.trim() }, phone: phone.trim(), email: email.trim(), perms, active: true })
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
        </div>
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Permissions', ar: 'الصلاحيات' })}{perms.length > 0 && <span className="text-ink-subtle"> · {perms.length}</span>}</span>
          <div className="grid sm:grid-cols-2 gap-xs">
            {teamPermissions.map((p) => {
              const on = perms.includes(p.key)
              return (
                <button key={p.key} type="button" onClick={() => toggle(p.key)} className={cn('flex items-center gap-sm rounded-lg border px-md py-sm text-start transition-colors', on ? 'border-primary bg-primary/[0.06]' : 'border-hairline hover:border-ink/30')}>
                  <span className={cn('grid place-items-center w-5 h-5 rounded border shrink-0 transition-colors', on ? 'bg-primary border-primary text-on-primary' : 'border-hairline-strong')}>{on && <Check size={13} />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-data text-ink truncate">{pick(p.label)}</span>
                    <span className="block font-sans text-caption text-ink-subtle truncate">{pick(p.desc)}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Permissions can be changed any time from the employee row.', ar: 'يمكن تعديل الصلاحيات في أي وقت من صف الموظف.' })}</p>
        </div>
      </div>
    </Modal>
  )
}
