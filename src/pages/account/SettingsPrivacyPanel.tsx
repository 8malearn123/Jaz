import { useState } from 'react'
import { ShieldCheck, Check, Download, Trash2, UserCog } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCustomer } from '@/state/CustomerContext'
import { buttonClass } from '@/components/ui/Button'
import { useToast } from '@/components/account/Toast'
import { cn } from '@/lib/cn'
import { ConfirmDialog, Field } from './shared'

export function SettingsPrivacyPanel() {
  const { t, pick } = useLocale()
  const { name, email, phone, consents, notifications, setConsent, setNotif, updateProfile, tier, points, addresses } = useCustomer()
  const { flash } = useToast()
  const [eraseOpen, setEraseOpen] = useState(false)
  const [erased, setErased] = useState(false)

  // profile editor (single display name applied to both locales, mirroring AddressModal)
  const [form, setForm] = useState({ name: pick(name), email, phone })
  const dirty = form.name !== pick(name) || form.email !== email || form.phone !== phone
  const saveProfile = () => { updateProfile(form); flash(t('profile.saved')) }

  const exportData = () => {
    const doc = {
      profile: { name: name.en, email, phone, tier, points },
      addresses,
      consents,
      notifications,
      generatedAt: '2026-06-21',
    }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jaz-my-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* editable profile */}
      <Section title={t('profile.title')} icon={UserCog}>
        <div className="flex flex-col gap-md pt-sm">
          <Field label={t('profile.name')} value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <div className="flex flex-col sm:flex-row gap-md">
            <Field label={t('profile.phone')} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} type="tel" />
            <Field label={t('profile.email')} value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
          </div>
          <button onClick={saveProfile} disabled={!dirty} className={buttonClass('primary', 'sm', 'self-start')}>{t('profile.save')}</button>
        </div>
      </Section>

      <div className="rounded-lg bg-brand-green/8 border border-brand-green/20 p-lg flex items-start gap-sm">
        <ShieldCheck size={20} className="text-brand-green shrink-0 mt-0.5" />
        <p className="font-sans text-data text-ink-muted leading-relaxed">{t('privacy.body')}</p>
      </div>

      <Section title={t('privacy.consents')}>
        {consents.map((c) => (
          <ToggleRow key={c.purpose} label={t(`consent.${c.purpose}`)} checked={c.granted} onChange={(v) => setConsent(c.purpose, v)} />
        ))}
      </Section>

      <Section title={t('privacy.notifs')}>
        {(Object.keys(notifications) as (keyof typeof notifications)[]).map((k) => (
          <ToggleRow key={k} label={t(`notif.${k}`)} checked={notifications[k]} onChange={(v) => setNotif(k, v)} />
        ))}
      </Section>

      <Section title={t('privacy.rights')}>
        <p className="font-sans text-caption text-ink-muted leading-relaxed pb-sm">{t('privacy.rightsNote')}</p>
        <div className="flex flex-wrap gap-sm">
          <button onClick={exportData} className={buttonClass('secondary', 'sm')}><Download size={15} /> {t('privacy.export')}</button>
          {erased ? (
            <span className="inline-flex items-center gap-xs font-sans text-data text-success px-2"><Check size={15} /> {t('privacy.eraseSubmitted')}</span>
          ) : (
            <button onClick={() => setEraseOpen(true)} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><Trash2 size={15} /> {t('privacy.erase')}</button>
          )}
        </div>
      </Section>

      <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Logged out across all devices? Manage sessions in security settings.', ar: 'تسجيل الخروج من كل الأجهزة؟ من إعدادات الأمان.' })}</p>

      <ConfirmDialog
        open={eraseOpen}
        onClose={() => setEraseOpen(false)}
        eyebrow={t('privacy.title')}
        title={t('privacy.eraseTitle')}
        body={t('privacy.eraseBody')}
        confirmLabel={t('privacy.eraseConfirm')}
        danger
        onConfirm={() => { setErased(true); setEraseOpen(false) }}
      />
    </div>
  )
}

function Section({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof ShieldCheck }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-xs">
        {Icon && <Icon size={16} className="text-primary-hover" />}
        <h3 className="font-serif text-card-title text-ink">{title}</h3>
      </div>
      <div className="p-lg flex flex-col">{children}</div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-md py-2.5 cursor-pointer">
      <span className="font-sans text-data text-ink">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative w-11 h-6 rounded-pill transition-colors shrink-0', checked ? 'bg-primary' : 'bg-hairline-strong')}>
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-pill bg-surface-1 shadow-sm transition-all', checked ? 'start-[22px]' : 'start-0.5')} />
      </button>
    </label>
  )
}
