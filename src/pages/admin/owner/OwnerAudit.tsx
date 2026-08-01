import { useState } from 'react'
import { ScrollText, Search, Network } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useOwnerState } from '@/state/OwnerStateContext'
import { useGovernance } from '@/state/GovernanceContext'
import { useTeam } from '@/state/TeamContext'
import { jobRoleOf } from '@/data/governance'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, Pill } from './_shared'

/** The audit trail, scoped down the org chart: you see what you did and what everyone
 *  in your branch did, and nothing sideways. The owner sits above every branch, so the
 *  owner sees all of it — as does the auditor, whose whole job is to look. */
export function OwnerAudit() {
  const { pick } = useLocale()
  const { employees } = useOwnerState()
  const { scopedAudit, auditScope } = useGovernance()
  const { activeEmployee, descendantsOf } = useTeam()
  const [query, setQuery] = useState('')
  const [who, setWho] = useState<'all' | string>('all')

  // The people whose entries this account may filter by — itself plus its branch.
  const branch = activeEmployee ? [activeEmployee, ...descendantsOf(activeEmployee.id)] : employees
  const actors = branch.filter((e) => scopedAudit.some((a) => a.actorId === e.id))
  const ownerHasEntries = scopedAudit.some((a) => a.actorId == null)

  const q = query.trim().toLowerCase()
  const shown = scopedAudit
    .filter((a) => who === 'all' || (who === 'owner' ? a.actorId == null : a.actorId === who))
    .filter((a) => q === '' || [a.action.en, a.action.ar, a.resource, a.actor.en, a.actor.ar, a.id].some((t) => t.toLowerCase().includes(q)))

  const stats = [
    { label: { en: 'Entries in view', ar: 'القيود المعروضة' }, value: String(scopedAudit.length), sub: auditScope, tone: 'dark' as const },
    { label: { en: 'Sensitive', ar: 'حسّاسة' }, value: String(scopedAudit.filter((a) => a.sensitive).length), sub: { en: 'Money, stock or access', ar: 'مال أو مخزون أو صلاحية' }, tone: 'gold' as const },
    { label: { en: 'Overrides', ar: 'تنفيذ استثنائي' }, value: String(scopedAudit.filter((a) => a.emergency).length), sub: { en: 'Pushed through unsigned', ar: 'نُفّذت دون توقيع' }, tone: 'plain' as const },
    { label: { en: 'People in view', ar: 'أشخاص ضمن نطاقك' }, value: String(actors.length + (ownerHasEntries ? 1 : 0)), sub: { en: 'You and your branch', ar: 'أنت ومن يتبعك' }, tone: 'green' as const },
  ]

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Audit trail', ar: 'سجل التدقيق' })}
        subtitle={pick({ en: 'Written as it happens · scoped to you and the people who report to you', ar: 'يُكتب لحظة وقوعه · ضمن نطاقك ونطاق من يتبعونك' })} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      {/* what this account is allowed to see, said out loud rather than left to be inferred */}
      <p className="inline-flex items-start gap-xs font-sans text-caption text-ink-muted rounded-lg bg-surface-2 border border-hairline p-md">
        <Network size={14} className="mt-0.5 shrink-0 text-primary-hover" />
        <span>
          {pick({ en: 'Scope', ar: 'النطاق' })}: {pick(auditScope)}.
          {activeEmployee && jobRoleOf(activeEmployee.role)?.key !== 'auditor' && (
            <> {pick({ en: 'Actions by people outside your branch are not shown here.', ar: 'أعمال من هم خارج فرعك لا تظهر هنا.' })}</>
          )}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-ink-subtle pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input ps-10"
            placeholder={pick({ en: 'Search the action, the resource or who did it…', ar: 'ابحث في الإجراء أو المورد أو من قام به…' })} />
        </div>
        {(actors.length > 0 || ownerHasEntries) && (
          <select value={who} onChange={(e) => setWho(e.target.value)} className="input cursor-pointer w-auto min-w-[180px]">
            <option value="all">{pick({ en: 'Everyone in scope', ar: 'كل من في نطاقك' })}</option>
            {ownerHasEntries && <option value="owner">{pick({ en: 'Owner', ar: 'المالك' })}</option>}
            {actors.map((e) => <option key={e.id} value={e.id}>{pick(e.name)}{e.role ? ` · ${pick(jobRoleOf(e.role)!.label)}` : ''}</option>)}
          </select>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-lg py-md border-b border-hairline">
          <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><ScrollText size={17} className="text-primary-hover" /> {pick({ en: 'Entries', ar: 'القيود' })} · {shown.length}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Who acted, on what, and whether it was sensitive. Newest first.', ar: 'من تصرّف، وعلى ماذا، وهل كان حساسًا. الأحدث أولًا.' })}</p>
        </div>
        {shown.length === 0
          ? (
            <p className="px-lg py-md font-sans text-data text-ink-subtle">
              {scopedAudit.length === 0
                ? pick({ en: 'Nothing recorded in your scope yet this session.', ar: 'لم يُسجَّل شيء ضمن نطاقك في هذه الجلسة بعد.' })
                : pick({ en: 'No entry matches this search.', ar: 'لا يوجد قيد مطابق لهذا البحث.' })}
            </p>
          )
          : (
            <ul className="divide-y divide-hairline">
              {shown.map((e) => (
                <li key={e.id} className={cn('flex flex-wrap items-center gap-sm px-lg py-md', e.emergency && 'bg-danger/5')}>
                  <span className="font-sans text-caption text-ink-subtle tabular-nums w-16 shrink-0">{e.id}</span>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-sans text-data text-ink">{pick(e.action)}</p>
                    <p className="font-sans text-caption text-ink-subtle truncate">{e.resource}</p>
                  </div>
                  <span className="font-sans text-caption text-ink-muted">
                    {pick(e.actor)}
                    {e.actorRole && <span className="text-ink-subtle"> · {pick(jobRoleOf(e.actorRole)!.label)}</span>}
                  </span>
                  <span className="font-sans text-caption text-ink-subtle">{pick(e.at)}</span>
                  {e.emergency
                    ? <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Override', ar: 'استثنائي' })}</Pill>
                    : e.sensitive && <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Sensitive', ar: 'حسّاس' })}</Pill>}
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )
}
