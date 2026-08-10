import { useState } from 'react'
import { AlertCircle, Check, ClipboardList, Pencil, Send } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { UtilizationGauge } from '@/components/charts/Charts'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { packValue, type PackChannel } from '@/data/distributorPack'
import {
  completeness, displayValue, distributorProfileGroups, distributorProfileSeed,
  groupCompleteness, groupFields,
  type ProfileField, type ProfileGroup, type ProfileValues,
} from '@/data/distributorProfile'

/**
 * The importer's own file — the inbound half of the distributor pack. The partner
 * fills it in themselves; every answer is tied to the pack term it satisfies, and
 * the meter at the top says exactly what is still owed before the file is complete.
 */
export function DistributorProfile({ channel }: { channel: PackChannel }) {
  const { pick } = useLocale()
  const { flash } = useToast()
  const [values, setValues] = useState<ProfileValues>(distributorProfileSeed[channel])
  const [editing, setEditing] = useState<ProfileGroup | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const done = completeness(values, channel)
  const complete = done.missing.length === 0

  const save = (next: ProfileValues) => {
    setValues(next)
    setSubmitted(false)
    setEditing(null)
    flash(pick({ en: 'Profile updated', ar: 'حُدِّث ملف المنشأة' }))
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* completeness — the answer to "is this importer's file complete?" */}
      <div className="card p-lg grid lg:grid-cols-[auto_1fr] gap-lg items-center">
        <div className="grid place-items-center">
          <UtilizationGauge
            segments={[
              { value: done.filled, color: '#355c4b' },
              { value: Math.max(0, done.total - done.filled), color: '#e3ddd2' },
            ]}
            centerValue={`${done.pct}%`}
            centerLabel={pick({ en: 'complete', ar: 'مكتمل' })}
          />
        </div>
        <div className="flex flex-col gap-sm min-w-0">
          <div className="flex flex-wrap items-center gap-sm">
            <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs">
              <ClipboardList size={18} className="text-primary-hover" />
              {pick({ en: 'Importer profile', ar: 'ملف المستورد' })}
            </h3>
            <StatusBadge variant={complete ? 'success' : 'gold'}>
              {done.filled}/{done.total} {pick({ en: 'answered', ar: 'مُجاب' })}
            </StatusBadge>
          </div>
          <p className="font-sans text-data text-ink-muted max-w-prose">
            {pick({
              en: 'Each answer here settles a term in the distributor pack — which markets the territory clause covers, which number the annual target is, whether your store actually holds the range the goods need. Jaz reviews the file; the account keeps trading while it is open.',
              ar: 'كل إجابة هنا تحسم بندًا في حقيبة الموزّع — أي أسواق يغطّيها شرط الإقليم، وما الرقم الذي يمثّله الهدف السنوي، وهل مستودعكم يحفظ فعلًا النطاق الحراري الذي تحتاجه البضاعة. تراجع جاز الملف، ويستمر الحساب في التعامل ما دام مفتوحًا.',
            })}
          </p>

          {done.missing.length > 0 ? (
            <div className="rounded-lg border border-primary/25 bg-primary/8 p-md flex flex-col gap-xs">
              <span className="inline-flex items-center gap-xs font-sans text-data font-medium text-ink">
                <AlertCircle size={15} className="text-primary-hover" />
                {done.missing.length} {pick({ en: 'required answers still missing', ar: 'إجابة مطلوبة ما زالت ناقصة' })}
              </span>
              <ul className="flex flex-wrap gap-xs">
                {done.missing.map((f) => (
                  <li key={f.id} className="rounded-pill border border-hairline bg-surface-1 px-3 py-1 font-sans text-caption text-ink-muted">
                    {pick(packValue(f.label, channel))}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-success/25 bg-success/8 p-md flex items-start gap-sm">
              <Check size={16} className="text-success mt-0.5 shrink-0" />
              <p className="font-sans text-data text-ink">
                {submitted
                  ? pick({ en: 'Sent to Jaz for review — you will be notified when it is approved.', ar: 'أُرسل إلى جاز للمراجعة — ستصلكم الإفادة عند الاعتماد.' })
                  : pick({ en: 'Every required answer is in. Send the file for review.', ar: 'كل الإجابات المطلوبة مكتملة. أرسلوا الملف للمراجعة.' })}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-sm">
            <button
              onClick={() => { setSubmitted(true); flash(pick({ en: 'Profile sent for review', ar: 'أُرسل الملف للمراجعة' })) }}
              disabled={!complete || submitted}
              className={buttonClass('primary', 'sm')}
            >
              <Send size={15} /> {pick({ en: 'Send for review', ar: 'إرسال للمراجعة' })}
            </button>
            {!complete && (
              <span className="font-sans text-caption text-ink-subtle">
                {pick({ en: 'Answer what is missing above to enable this.', ar: 'أكملوا الناقص أعلاه لتفعيل الإرسال.' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {distributorProfileGroups.map((group) => {
        const fields = groupFields(group, channel)
        const g = groupCompleteness(group, values, channel)
        return (
          <div key={group.id} className="card overflow-hidden">
            <div className="bg-surface-2 px-lg py-md border-b border-hairline flex flex-wrap items-center justify-between gap-sm">
              <div className="flex flex-wrap items-baseline gap-x-sm gap-y-xxs min-w-0">
                <h3 className="font-serif text-card-title text-ink">{pick(group.label)}</h3>
                <p className="font-sans text-caption text-ink-subtle">{pick(group.blurb)}</p>
              </div>
              <div className="flex items-center gap-sm shrink-0">
                <StatusBadge variant={g.filled === g.total ? 'success' : 'neutral'}>{g.filled}/{g.total}</StatusBadge>
                <button onClick={() => setEditing(group)} className={buttonClass('secondary', 'sm')}>
                  <Pencil size={14} /> {pick({ en: 'Edit', ar: 'تعديل' })}
                </button>
              </div>
            </div>
            <dl className="grid sm:grid-cols-2 divide-y sm:divide-y-0 divide-hairline">
              {fields.map((f) => {
                const shown = displayValue(f, values[f.id], channel, pick)
                return (
                  <div key={f.id} className="px-lg py-md flex flex-col gap-xxs sm:border-b sm:border-hairline">
                    <dt className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle">
                      {pick(packValue(f.label, channel))}
                      {f.required && !shown && <span className="text-primary-hover ms-1">*</span>}
                    </dt>
                    <dd className={cn('font-sans text-data', shown ? 'text-ink' : 'text-ink-subtle italic')}>
                      {shown ?? pick({ en: 'Not answered yet', ar: 'لم يُجب بعد' })}
                    </dd>
                    <span className="font-sans text-caption text-ink-subtle">
                      {pick({ en: 'Pack term', ar: 'بند الحقيبة' })}: {pick(packValue(f.mirrors, channel))}
                    </span>
                  </div>
                )
              })}
            </dl>
          </div>
        )
      })}

      {/* keyed by group, so an abandoned edit never leaks into the next one */}
      {editing && <EditGroupModal key={editing.id} group={editing} channel={channel} values={values} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function EditGroupModal({ group, channel, values, onClose, onSave }: {
  group: ProfileGroup
  channel: PackChannel
  values: ProfileValues
  onClose: () => void
  onSave: (next: ProfileValues) => void
}) {
  const { pick } = useLocale()
  const [draft, setDraft] = useState<ProfileValues>(values)
  const fields = groupFields(group, channel)
  const set = (id: string, v: string) => setDraft((d) => ({ ...d, [id]: v }))

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      eyebrow={pick({ en: 'Importer profile', ar: 'ملف المستورد' })}
      title={pick(group.label)}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={() => onSave(draft)} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save', ar: 'حفظ' })}</button>
      </>}
    >
      <div className="flex flex-col gap-md">
        {fields.map((f) => (
          <FieldInput key={f.id} field={f} channel={channel} value={draft[f.id] ?? ''} onChange={(v) => set(f.id, v)} />
        ))}
      </div>
    </Modal>
  )
}

function FieldInput({ field, channel, value, onChange }: {
  field: ProfileField
  channel: PackChannel
  value: string
  onChange: (v: string) => void
}) {
  const { pick } = useLocale()
  const label = pick(packValue(field.label, channel))
  const unit = field.unit ? pick(packValue(field.unit, channel)) : null
  const placeholder = field.placeholder ? pick(packValue(field.placeholder, channel)) : undefined

  return (
    <label className="flex flex-col gap-xs">
      <span className="label">
        {label}{unit && <span className="text-ink-subtle"> ({unit})</span>}
        {field.required && <span className="text-primary-hover ms-1">*</span>}
      </span>
      {field.kind === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input cursor-pointer">
          <option value="">{pick({ en: '— Select —', ar: '— اختر —' })}</option>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{pick(o.label)}</option>)}
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(field.kind === 'number' ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)}
          inputMode={field.kind === 'number' ? 'numeric' : undefined}
          placeholder={placeholder}
          className="input"
        />
      )}
      <span className="font-sans text-caption text-ink-subtle">
        {pick({ en: 'Answers', ar: 'يُجيب على' })}: {pick(packValue(field.mirrors, channel))}
      </span>
    </label>
  )
}
