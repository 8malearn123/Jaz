import { useState } from 'react'
import { AlertCircle, Check, ClipboardList, Container, Download, Megaphone, Pencil, Percent, Send, Store } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { UtilizationGauge } from '@/components/charts/Charts'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { openDistributorFilePdf } from '@/lib/distributorFilePdf'
import type { Bilingual } from '@/data/types'
import {
  distributorPack, loadingColumns, loadingRows, packRevision, packValue,
  PALLET, CONTAINER, type PackChannel, type PackSection, type PackSectionId,
} from '@/data/distributorPack'
import {
  completeness, displayValue, distributorProfileSeed, fieldsForItem, sectionCompleteness,
  type ProfileField, type ProfileValues,
} from '@/data/distributorProfile'

const sectionIcon: Record<PackSectionId, typeof Percent> = {
  commercial: Percent,
  logistics: Container,
  marketing: Megaphone,
  merchandising: Store,
}

/**
 * The importer's file — every term Jaz declares, with the partner's answer beside it.
 * Commercial, logistics, marketing and merchandising in one place, so a clause and
 * the figure that settles it are never on two different screens.
 *
 * `channel` decides which side of a per-channel term is shown, which questions get
 * asked, and which catalogue the loading table is built from.
 */
export function DistributorProfile({ channel, accountName, entity = [] }: {
  channel: PackChannel
  /** Whose file this is — printed on the PDF. */
  accountName: Bilingual
  /** Legal-entity lines the portal already holds, carried onto the PDF. */
  entity?: { label: Bilingual; value: string }[]
}) {
  const { pick, locale } = useLocale()
  const { flash } = useToast()
  const [values, setValues] = useState<ProfileValues>(distributorProfileSeed[channel])
  const [editing, setEditing] = useState<PackSection | null>(null)
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
      {/* completeness — is this importer's file complete, and what is still owed */}
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
              {pick({ en: 'Distributor file', ar: 'ملف الموزّع' })}
            </h3>
            <StatusBadge variant={complete ? 'success' : 'gold'}>
              {done.filled}/{done.total} {pick({ en: 'answered', ar: 'مُجاب' })}
            </StatusBadge>
            <StatusBadge variant="neutral">
              {channel === 'export'
                ? pick({ en: 'Export distributor', ar: 'موزّع تصدير' })
                : pick({ en: 'HORECA operator', ar: 'منشأة ضيافة' })}
            </StatusBadge>
          </div>
          <p className="font-sans text-data text-ink-muted max-w-prose">
            {pick({
              en: 'Every term of the account, and your answer to it: what you earn and where you may sell, how the goods are packed and how you hold them, the marketing calendar and the shelf. Jaz declares the left of each pair; you declare the right.',
              ar: 'كل بند في الحساب، وردّكم عليه: ما تكسبونه وأين تبيعون، وكيف تُعبَّأ البضاعة وكيف تحفظونها، والتقويم التسويقي والرفّ. جاز تُعلن الطرف الأول من كل زوج، وأنتم تُعلنون الثاني.',
            })}
          </p>
          <span className="font-sans text-caption text-ink-subtle">{pick(packRevision)}</span>

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
              onClick={() => { setSubmitted(true); flash(pick({ en: 'File sent for review', ar: 'أُرسل الملف للمراجعة' })) }}
              disabled={!complete || submitted}
              className={buttonClass('primary', 'sm')}
            >
              <Send size={15} /> {pick({ en: 'Send for review', ar: 'إرسال للمراجعة' })}
            </button>
            {/* the whole file as a document — both columns, the loading table, and what is still owed */}
            <button
              onClick={() => openDistributorFilePdf({ channel, values, accountName, entity }, { locale, pick })}
              className={buttonClass('secondary', 'sm')}
            >
              <Download size={15} /> {pick({ en: 'Download the file (PDF)', ar: 'تنزيل ملف المنشأة (PDF)' })}
            </button>
            {!complete && (
              <span className="font-sans text-caption text-ink-subtle">
                {pick({ en: 'Answer what is missing above to enable this.', ar: 'أكملوا الناقص أعلاه لتفعيل الإرسال.' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {distributorPack.map((section) => {
        const Icon = sectionIcon[section.id]
        const s = sectionCompleteness(section.id, values, channel)
        return (
          <div key={section.id} className="card overflow-hidden">
            <div className="bg-surface-2 px-lg py-md border-b border-hairline flex flex-wrap items-center justify-between gap-sm">
              <div className="flex flex-wrap items-baseline gap-x-sm gap-y-xxs min-w-0">
                <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs">
                  <Icon size={17} className="text-primary-hover self-center" /> {pick(section.label)}
                </h3>
                <p className="font-sans text-caption text-ink-subtle">{pick(section.blurb)}</p>
              </div>
              {s.total > 0 && (
                <div className="flex items-center gap-sm shrink-0">
                  <StatusBadge variant={s.filled === s.total ? 'success' : 'neutral'}>{s.filled}/{s.total}</StatusBadge>
                  <button onClick={() => setEditing(section)} className={buttonClass('secondary', 'sm')}>
                    <Pencil size={14} /> {pick({ en: 'Edit', ar: 'تعديل' })}
                  </button>
                </div>
              )}
            </div>

            <ul className="divide-y divide-hairline">
              {section.items.map((item) => {
                const answers = fieldsForItem(item.key, channel)
                return (
                  <li key={item.key} className="px-lg py-md grid lg:grid-cols-[minmax(0,13rem)_1fr_1fr] gap-x-md gap-y-sm">
                    <span className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle lg:pt-0.5">{pick(item.label)}</span>

                    {/* what Jaz declares */}
                    <div className="flex flex-col gap-xxs min-w-0">
                      <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Jaz declares', ar: 'تُعلن جاز' })}</span>
                      <span className="font-sans text-data text-ink">{pick(packValue(item.value, channel))}</span>
                      {item.detail && <span className="font-sans text-caption text-ink-subtle">{pick(packValue(item.detail, channel))}</span>}
                    </div>

                    {/* what the partner declares back */}
                    <div className="flex flex-col gap-sm min-w-0 lg:border-s lg:border-hairline lg:ps-md">
                      {answers.length === 0 ? (
                        <span className="font-sans text-caption text-ink-subtle italic">{pick({ en: 'No answer needed', ar: 'لا يتطلّب ردًّا' })}</span>
                      ) : answers.map((f) => {
                        const shown = displayValue(f, values[f.id], channel, pick)
                        return (
                          <div key={f.id} className="flex flex-col gap-xxs">
                            <span className="font-sans text-caption text-ink-subtle">
                              {pick(packValue(f.label, channel))}
                              {f.required && !shown && <span className="text-primary-hover ms-1">*</span>}
                            </span>
                            <span className={cn('font-sans text-data', shown ? 'text-ink' : 'text-ink-subtle italic')}>
                              {shown ?? pick({ en: 'Not answered yet', ar: 'لم يُجب بعد' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* the packing figures the logistics terms keep pointing at */}
            {section.id === 'logistics' && <LoadingTable channel={channel} />}
          </div>
        )
      })}

      {/* keyed by section, so an abandoned edit never leaks into the next one */}
      {editing && <EditSectionModal key={editing.id} section={editing} channel={channel} values={values} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function LoadingTable({ channel }: { channel: PackChannel }) {
  const { pick } = useLocale()
  const rows = loadingRows(channel)
  const cols = loadingColumns[channel]
  return (
    <div className="border-t border-hairline">
      <div className="px-lg py-md flex flex-wrap items-baseline justify-between gap-sm">
        <h4 className="font-serif text-body text-ink">{pick({ en: 'Loading table', ar: 'جدول التحميل' })}</h4>
        <span className="font-sans text-caption text-ink-subtle">
          {channel === 'export'
            ? pick({ en: `20' reefer ${CONTAINER.twentyFtPallets} pallets · 40' reefer ${CONTAINER.fortyFtPallets}`, ar: `حاوية ٢٠ قدم ${CONTAINER.twentyFtPallets} طبليات · ٤٠ قدم ${CONTAINER.fortyFtPallets}` })
            : pick({ en: `Pallet ${PALLET.footprintMm} mm · max ${PALLET.maxGrossKg} kg`, ar: `طبلية ${PALLET.footprintMm} مم · بحد أقصى ${PALLET.maxGrossKg} كجم` })}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-2">
              <th className="px-lg py-sm text-start font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle font-normal">SKU</th>
              {[cols.unit, cols.moq, cols.packedIn, cols.dims, cols.grossKg, cols.perLoad].map((c, i) => (
                <th key={i} className="px-md py-sm text-start font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle font-normal whitespace-nowrap">{pick(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r) => (
              <tr key={r.sku}>
                <td className="px-lg py-sm align-top">
                  <span className="font-sans text-data text-ink block">{r.sku}</span>
                  <span className="font-sans text-caption text-ink-subtle block">{pick(r.name)}</span>
                </td>
                <td className="px-md py-sm align-top font-sans text-caption text-ink-muted">{pick(r.unit)}</td>
                <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums">{r.moq}</td>
                <td className="px-md py-sm align-top font-sans text-caption text-ink-muted whitespace-nowrap">{r.packedIn}</td>
                <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums whitespace-nowrap" dir="ltr">{r.dims}</td>
                <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums">{r.grossKg}</td>
                <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums">{r.perLoad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EditSectionModal({ section, channel, values, onClose, onSave }: {
  section: PackSection
  channel: PackChannel
  values: ProfileValues
  onClose: () => void
  onSave: (next: ProfileValues) => void
}) {
  const { pick } = useLocale()
  const [draft, setDraft] = useState<ProfileValues>(values)
  const set = (id: string, v: string) => setDraft((d) => ({ ...d, [id]: v }))

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      eyebrow={pick({ en: 'Distributor file', ar: 'ملف الموزّع' })}
      title={pick(section.label)}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={() => onSave(draft)} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save', ar: 'حفظ' })}</button>
      </>}
    >
      <div className="flex flex-col gap-lg">
        {section.items.map((item) => {
          const answers = fieldsForItem(item.key, channel)
          if (answers.length === 0) return null
          return (
            <div key={item.key} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xxs pb-xs border-b border-hairline">
                <span className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle">{pick(item.label)}</span>
                <span className="font-sans text-caption text-ink-muted">{pick(packValue(item.value, channel))}</span>
              </div>
              {answers.map((f) => (
                <FieldInput key={f.id} field={f} channel={channel} value={draft[f.id] ?? ''} onChange={(v) => set(f.id, v)} />
              ))}
            </div>
          )
        })}
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
    </label>
  )
}
