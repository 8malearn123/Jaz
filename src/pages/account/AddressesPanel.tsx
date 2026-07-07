import { useState } from 'react'
import { MapPin, Plus, Gift, EyeOff, Trash2 } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCustomer } from '@/state/CustomerContext'
import { type SavedAddress, type GiftRecipient } from '@/data/account'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { Field } from './shared'

export function AddressesPanel() {
  const { t, pick } = useLocale()
  const { addresses, makeDefaultAddress, giftRecipients, toggleGiftAnonymous, removeGiftRecipient } = useCustomer()
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null)
  const [addingGift, setAddingGift] = useState(false)

  return (
    <div className="flex flex-col gap-lg">
      {/* personal addresses */}
      <div className="flex flex-col gap-md">
        <p className="eyebrow text-ink-subtle">{t('giftaddr.personal')}</p>
        <div className="grid sm:grid-cols-2 gap-md">
          {addresses.map((a) => (
            <div key={a.id} className={cn('card p-lg flex flex-col gap-sm', a.isDefault && 'ring-1 ring-primary/30')}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink"><MapPin size={17} className="text-primary-hover" /> {pick(a.label)}</span>
                {a.isDefault && <StatusBadge variant="gold">{t('addr.default')}</StatusBadge>}
              </div>
              <p className="font-sans text-data text-ink-muted">{pick(a.district)}, {pick(a.city)} · {a.shortAddress}</p>
              <div className="flex items-center gap-xs mt-auto pt-xs">
                <button onClick={() => setEditing(a)} className={buttonClass('ghost', 'sm')}>{t('addr.edit')}</button>
                {!a.isDefault && <button onClick={() => makeDefaultAddress(a.id)} className={buttonClass('ghost', 'sm')}>{t('addr.makeDefault')}</button>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setEditing('new')} className={buttonClass('secondary', 'md', 'self-start')}><Plus size={16} /> {t('addr.add')}</button>
      </div>

      {/* gift recipient book */}
      <div className="flex flex-col gap-md">
        <div className="flex flex-wrap items-baseline justify-between gap-sm">
          <p className="eyebrow text-ink-subtle inline-flex items-center gap-xs"><Gift size={13} className="text-primary-hover" /> {t('giftaddr.title')}</p>
          <span className="font-sans text-caption text-ink-subtle">{t('giftaddr.subtitle')}</span>
        </div>
        <div className="flex flex-col gap-sm">
          {giftRecipients.map((g) => (
            <GiftRecipientCard key={g.id} recipient={g} onToggle={() => toggleGiftAnonymous(g.id)} onRemove={() => removeGiftRecipient(g.id)} />
          ))}
        </div>
        <button onClick={() => setAddingGift(true)} className={buttonClass('secondary', 'md', 'self-start')}><Plus size={16} /> {t('giftaddr.add')}</button>
        <p className="font-sans text-caption text-ink-subtle leading-relaxed">{t('giftaddr.note')}</p>
      </div>

      <AddressModal open={editing !== null} editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <GiftRecipientModal open={addingGift} onClose={() => setAddingGift(false)} />
    </div>
  )
}

function GiftRecipientCard({ recipient: g, onToggle, onRemove }: { recipient: GiftRecipient; onToggle: () => void; onRemove: () => void }) {
  const { t, pick } = useLocale()
  const on = g.anonymous
  const initials = pick(g.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div className="card p-lg flex items-center gap-md flex-wrap">
      <span className="grid place-items-center w-11 h-11 rounded-pill bg-primary/10 border border-primary/20 text-primary-hover font-serif text-card-title shrink-0">{initials}</span>
      <div className="flex-1 min-w-[200px]">
        <p className="font-sans text-data text-ink">{pick(g.name)} <span className="text-ink-subtle">· {pick(g.relation)}</span></p>
        <p className="font-sans text-caption text-ink-muted mt-0.5">{pick(g.district)}, {pick(g.city)}</p>
        <p className="font-sans text-caption text-ink-subtle mt-0.5 tabular-nums">{g.phone}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn('inline-flex items-center gap-sm rounded-pill border px-sm py-2 transition-colors shrink-0', on ? 'border-primary/40 bg-primary/[0.06]' : 'border-hairline bg-surface-2')}
      >
        <span className={cn('relative w-10 h-6 rounded-pill transition-colors shrink-0', on ? 'bg-primary' : 'bg-hairline-strong')}>
          <span className={cn('absolute top-0.5 w-5 h-5 rounded-pill bg-surface-1 shadow-sm transition-all', on ? 'start-[18px]' : 'start-0.5')} />
        </span>
        <span className={cn('inline-flex items-center gap-xxs font-sans text-caption', on ? 'text-primary-hover' : 'text-ink-subtle')}>
          {on && <EyeOff size={13} />}
          {on ? t('giftaddr.anonymous') : t('giftaddr.showsName')}
        </span>
      </button>
      <button onClick={onRemove} className="grid place-items-center w-9 h-9 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/5 transition-colors shrink-0" aria-label={t('giftaddr.remove')}>
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function AddressModal({ open, editing, onClose }: { open: boolean; editing: SavedAddress | null; onClose: () => void }) {
  const { t, locale } = useLocale()
  const { addAddress, updateAddress } = useCustomer()
  const blank = { label: '', city: '', district: '', shortAddress: '', isDefault: false }
  const [form, setForm] = useState(blank)

  // sync form when opening
  const key = editing?.id ?? 'new'
  const [lastKey, setLastKey] = useState<string | null>(null)
  if (open && lastKey !== key) {
    setLastKey(key)
    setForm(editing
      ? { label: editing.label[locale], city: editing.city[locale], district: editing.district[locale], shortAddress: editing.shortAddress, isDefault: editing.isDefault }
      : blank)
  }
  if (!open && lastKey !== null) setLastKey(null)

  const save = () => {
    const payload = {
      label: { en: form.label, ar: form.label },
      city: { en: form.city, ar: form.city },
      district: { en: form.district, ar: form.district },
      shortAddress: form.shortAddress.toUpperCase(),
      isDefault: form.isDefault,
    }
    if (editing) updateAddress(editing.id, payload)
    else addAddress(payload)
    onClose()
  }

  const valid = form.label && form.city && form.shortAddress

  return (
    <Modal open={open} onClose={onClose} eyebrow={t('checkout.nationalAddress')} title={editing ? t('addr.editTitle') : t('addr.addTitle')} size="md"
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button><button onClick={save} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('addr.save')}</button></>}>
      <div className="flex flex-col gap-md">
        <Field label={t('addr.label')} value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} placeholder={locale === 'ar' ? 'المنزل' : 'Home'} />
        <div className="flex flex-col sm:flex-row gap-md">
          <Field label={t('checkout.city')} value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          <Field label={t('checkout.district')} value={form.district} onChange={(v) => setForm((f) => ({ ...f, district: v }))} />
        </div>
        <Field label={t('checkout.shortAddress')} value={form.shortAddress} onChange={(v) => setForm((f) => ({ ...f, shortAddress: v }))} placeholder="RWAB1234" />
        <label className="flex items-center gap-sm cursor-pointer">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-primary" />
          <span className="font-sans text-data text-ink-muted">{t('addr.setDefault')}</span>
        </label>
      </div>
    </Modal>
  )
}

function GiftRecipientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useLocale()
  const { addGiftRecipient } = useCustomer()
  const { flash } = useToast()
  const blank = { name: '', relation: '', city: '', district: '', phone: '', anonymous: false }
  const [form, setForm] = useState(blank)

  // reset the form each time the modal opens
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) { setWasOpen(true); setForm(blank) }
  if (!open && wasOpen) setWasOpen(false)

  const valid = form.name.trim() !== '' && form.phone.trim() !== ''
  const save = () => {
    addGiftRecipient({
      name: form.name.trim(),
      relation: form.relation.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      phone: form.phone.trim(),
      anonymous: form.anonymous,
    })
    flash(`${t('giftaddr.added')} · ${form.name.trim()}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow={t('giftaddr.title')} title={t('giftaddr.addTitle')} size="md"
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button><button onClick={save} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('giftaddr.save')}</button></>}>
      <div className="flex flex-col gap-md">
        <div className="flex flex-col sm:flex-row gap-md">
          <Field label={t('giftaddr.name')} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder={locale === 'ar' ? 'سارة العمري' : 'Sara Al-Ahmadi'} />
          <Field label={t('giftaddr.relation')} value={form.relation} onChange={(v) => setForm((f) => ({ ...f, relation: v }))} placeholder={locale === 'ar' ? 'أختي' : 'Sister'} />
        </div>
        <div className="flex flex-col sm:flex-row gap-md">
          <Field label={t('checkout.city')} value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          <Field label={t('checkout.district')} value={form.district} onChange={(v) => setForm((f) => ({ ...f, district: v }))} />
        </div>
        <Field label={t('giftaddr.phone')} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} type="tel" placeholder="+966 5X XXX XXXX" />
        <label className="flex items-center gap-sm cursor-pointer">
          <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))} className="w-4 h-4 accent-primary" />
          <span className="font-sans text-data text-ink-muted">{t('giftaddr.sendAnon')}</span>
        </label>
      </div>
    </Modal>
  )
}
