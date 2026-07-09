import { useState } from 'react'
import { ShieldCheck, Check, X, Send, UserPlus, HandCoins } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { poByVendor, creditRules, type PoPayStatus } from '@/data/ownerVendors'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, SegTabs, Pill, UtilBar } from './_shared'

const poMeta: Record<PoPayStatus, { label: { en: string; ar: string }; color: string; bg: string }> = {
  paid: { label: { en: 'Paid', ar: 'مسدّدة' }, color: '#355c4b', bg: '#e8f0ec' },
  net: { label: { en: 'On terms', ar: 'آجل' }, color: '#8a6b3f', bg: '#f6edde' },
  overdue: { label: { en: 'Overdue', ar: 'متأخر' }, color: '#b5403b', bg: '#faeceb' },
  preparing: { label: { en: 'Preparing', ar: 'قيد التجهيز' }, color: '#365766', bg: '#e7eef1' },
}

export function OwnerVendors() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { creditLimits: limits, setCreditLimit, approvals, advanceApproval, vendors, approveVendor, rejectVendor, inviteVendor, recordVendorPayment } = useOwnerState() // limits are overlay only — never written to shared org credit
  const [subTab, setSubTab] = useState<'accounts' | 'credit'>('accounts')
  const [sel, setSel] = useState('V-01')
  const [draft, setDraft] = useState<{ id: string; val: number } | null>(null)
  const [payDraft, setPayDraft] = useState<{ id: string; val: number } | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const tabs = [{ id: 'accounts' as const, label: pick({ en: 'Accounts', ar: 'الحسابات' }) }, { id: 'credit' as const, label: pick({ en: 'Credit policy', ar: 'سياسة الائتمان' }) }]
  const activeVendors = vendors.filter((v) => v.status === 'active')
  const requests = vendors.filter((v) => v.status !== 'active')
  const vendor = activeVendors.find((v) => v.id === sel) ?? activeVendors[0]
  const limitMinor = vendor ? (limits[vendor.id] ?? vendor.limitMinor) : 0
  const availableMinor = vendor ? limitMinor - vendor.outstandingMinor : 0
  const utilPct = vendor && limitMinor > 0 ? Math.round((vendor.outstandingMinor / limitMinor) * 100) : 0
  const statusInfo = utilPct >= 100 ? { en: 'Over limit · orders blocked', ar: 'تجاوز الحد · إيقاف الطلبات', col: '#b5403b' } : utilPct >= 85 ? { en: 'Near limit', ar: 'قريب من الحد', col: '#b08a57' } : { en: 'Within limit', ar: 'ضمن الحد', col: '#355c4b' }
  const payVal = vendor && payDraft && payDraft.id === vendor.id ? payDraft.val : 0

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Vendors & credit', ar: 'الموردين والائتمان' })} subtitle={pick({ en: 'B2B credit accounts, limits and policy', ar: 'حسابات الائتمان التجارية والحدود والسياسة' })}
        action={<button onClick={() => setInviteOpen(true)} className={buttonClass('primary', 'sm')}><UserPlus size={15} /> {pick({ en: 'Invite vendor', ar: 'دعوة مورّد' })}</button>} />
      <SegTabs tabs={tabs} active={subTab} onChange={setSubTab} />

      {subTab === 'accounts' ? (
        <div className="flex flex-col gap-lg">
          {/* join requests & pending invitations — accept, reject or resend */}
          {requests.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Join requests & invitations', ar: 'طلبات الانضمام والدعوات' })}</h3></div>
              <ul className="divide-y divide-hairline">
                {requests.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-md px-lg py-md">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-sans text-data text-ink truncate">{pick(v.name)}</p>
                      <p className="font-sans text-caption text-ink-subtle truncate">{pick(v.type)} · {v.id}{v.email && <span dir="ltr"> · {v.email}</span>}</p>
                    </div>
                    {v.status === 'pending' ? (
                      <div className="flex items-center gap-xs">
                        <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Awaiting approval', ar: 'بانتظار الاعتماد' })}</Pill>
                        <button onClick={() => { approveVendor(v.id); setSel(v.id); flash(`${pick({ en: 'Approved', ar: 'اعتُمد' })} · ${pick(v.name)}`) }} className={buttonClass('primary', 'sm')}><Check size={14} /> {pick({ en: 'Approve', ar: 'اعتماد' })}</button>
                        <button onClick={() => { rejectVendor(v.id); flash(`${pick({ en: 'Rejected', ar: 'رُفض' })} · ${pick(v.name)}`) }} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={14} /> {pick({ en: 'Reject', ar: 'رفض' })}</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-xs">
                        <Pill color="#365766" bg="#e7eef1">{pick({ en: 'Invitation sent', ar: 'دعوة مُرسلة' })}</Pill>
                        <button onClick={() => flash(`${pick({ en: 'Invitation resent to', ar: 'أُعيد إرسال الدعوة إلى' })} ${pick(v.name)}`)} className={buttonClass('secondary', 'sm')}><Send size={14} /> {pick({ en: 'Resend', ar: 'إعادة إرسال' })}</button>
                        <button onClick={() => { rejectVendor(v.id); flash(`${pick({ en: 'Invitation cancelled', ar: 'أُلغيت الدعوة' })} · ${pick(v.name)}`) }} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={14} /> {pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid lg:grid-cols-[300px_1fr] gap-lg items-start">
          {/* vendor list */}
          <div className="card overflow-hidden">
            <ul className="divide-y divide-hairline">
              {activeVendors.map((v) => {
                const lm = limits[v.id] ?? v.limitMinor
                const up = lm > 0 ? Math.round((v.outstandingMinor / lm) * 100) : 0
                const on = vendor && v.id === vendor.id
                return (
                  <li key={v.id}>
                    <button onClick={() => setSel(v.id)} className={cn('w-full text-start px-lg py-md flex flex-col gap-xs transition-colors', on ? 'bg-primary/[0.06]' : 'hover:bg-surface-2')}>
                      <div className="flex items-center justify-between gap-sm"><span className="font-sans text-data text-ink truncate">{pick(v.name)}</span><span className="font-sans text-caption text-ink-subtle tabular-nums">{up}%</span></div>
                      <UtilBar pct={up} color={up >= 100 ? '#b5403b' : up >= 85 ? '#b08a57' : '#355c4b'} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* credit account detail */}
          {vendor && (
          <div className="flex flex-col gap-lg">
            <div className="card p-lg flex flex-col gap-md">
              <div className="flex items-center justify-between">
                <div><h3 className="font-serif text-card-title text-ink">{pick(vendor.name)}</h3><p className="font-sans text-caption text-ink-subtle">{pick(vendor.type)} · {vendor.id}</p></div>
                <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption" style={{ color: statusInfo.col, backgroundColor: statusInfo.col + '18' }}>{pick({ en: statusInfo.en, ar: statusInfo.ar })}</span>
              </div>
              <div className="grid grid-cols-3 gap-md">
                <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Outstanding', ar: 'المستحق' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{money(vendor.outstandingMinor)}</span></div>
                <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Available', ar: 'المتاح' })}</span><span className={cn('font-serif text-card-title tabular-nums', availableMinor < 0 ? 'text-danger' : 'text-success')}>{money(availableMinor)}</span></div>
                <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Utilization', ar: 'الاستغلال' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{utilPct}%</span></div>
              </div>
              <UtilBar pct={utilPct} color={statusInfo.col} />
              <div className="flex flex-wrap items-end gap-sm pt-sm border-t border-hairline">
                <label className="flex flex-col gap-xs flex-1 min-w-[160px]"><span className="label">{pick({ en: 'Credit limit (﷼)', ar: 'الحد الائتماني (﷼)' })}</span>
                  <input value={draft && draft.id === vendor.id ? draft.val : Math.round(limitMinor / 100)} onChange={(e) => setDraft({ id: vendor.id, val: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} className="input tabular-nums" inputMode="numeric" /></label>
                <button onClick={() => { if (draft && draft.id === vendor.id) { setCreditLimit(vendor.id, draft.val * 100); setDraft(null); flash(`${pick({ en: 'Credit limit saved for', ar: 'حُفظ الحد الائتماني لـ' })} ${pick(vendor.name)}`) } }} disabled={!draft || draft.id !== vendor.id || draft.val * 100 === limitMinor} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save limit', ar: 'حفظ الحد' })}</button>
              </div>
              {/* record a settlement against the outstanding balance */}
              <div className="flex flex-wrap items-end gap-sm pt-sm border-t border-hairline">
                <label className="flex flex-col gap-xs flex-1 min-w-[160px]"><span className="label">{pick({ en: 'Record payment (﷼)', ar: 'تسجيل سداد (﷼)' })}</span>
                  <input value={payVal || ''} onChange={(e) => setPayDraft({ id: vendor.id, val: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} className={cn('input tabular-nums', payVal * 100 > vendor.outstandingMinor && 'border-danger')} inputMode="numeric" placeholder="0" />
                  <span className={cn('font-sans text-caption tabular-nums', payVal * 100 > vendor.outstandingMinor ? 'text-danger' : 'text-ink-subtle')}>{pick({ en: 'Outstanding', ar: 'المستحق حاليًا' })}: {money(vendor.outstandingMinor)}</span>
                </label>
                <button onClick={() => { recordVendorPayment(vendor.id, payVal * 100); setPayDraft(null); flash(`${pick({ en: 'Payment recorded', ar: 'سُجّل سداد' })} ${money(payVal * 100)} · ${pick(vendor.name)}`) }} disabled={payVal <= 0 || payVal * 100 > vendor.outstandingMinor} className={buttonClass('secondary', 'sm')}><HandCoins size={15} /> {pick({ en: 'Record payment', ar: 'تسجيل السداد' })}</button>
              </div>
            </div>

            {/* vendor POs */}
            <div className="card overflow-hidden">
              <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Purchase orders', ar: 'أوامر الشراء' })} · {pick(vendor.name)}</h3></div>
              <ul className="divide-y divide-hairline">
                {(poByVendor[vendor.id] ?? []).length === 0 && <li className="px-lg py-md font-sans text-caption text-ink-subtle">{pick({ en: 'No purchase orders yet.', ar: 'لا أوامر شراء بعد.' })}</li>}
                {(poByVendor[vendor.id] ?? []).map((po) => {
                  const m = poMeta[po.status]
                  return (
                    <li key={po.id} className="flex items-center gap-md px-lg py-md">
                      <span className="font-sans text-data text-ink tabular-nums flex-1">{po.id} <span className="text-ink-subtle text-caption">· {pick(po.date)}</span></span>
                      <span className="font-sans text-data text-ink tabular-nums">{money(po.amountMinor)}</span>
                      <Pill color={m.color} bg={m.bg}>{pick(m.label)}</Pill>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
          )}
          </div>

        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-lg items-start">
          <div className="card overflow-hidden">
            <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Credit rules', ar: 'قواعد الائتمان' })}</h3></div>
            <ul className="divide-y divide-hairline">
              {creditRules.map((r, i) => (
                <li key={i} className="px-lg py-md"><p className="font-sans text-data text-ink">{pick(r.title)}</p><p className="font-sans text-caption text-ink-subtle mt-xxs">{pick(r.detail)}</p></li>
              ))}
            </ul>
          </div>
          <div className="card p-lg flex flex-col gap-md">
            <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><ShieldCheck size={17} className="text-primary-hover" /> {pick({ en: 'Merchant onboarding', ar: 'اعتماد التجار' })}</h3>
            <ol className="flex flex-col gap-0">
              {approvals.map((s, i) => (
                <li key={i} className="flex items-center gap-md pb-md last:pb-0">
                  <span className={cn('grid place-items-center w-8 h-8 rounded-pill border-2 shrink-0', s.done ? 'bg-success/15 border-success text-success' : s.current ? 'bg-primary/10 border-primary text-primary-hover animate-pulse' : 'bg-surface-2 border-hairline-strong text-ink-subtle')}>{s.done ? <Check size={14} /> : i + 1}</span>
                  <span className={cn('font-sans text-data', s.done || s.current ? 'text-ink' : 'text-ink-subtle')}>{pick(s.label)}</span>
                </li>
              ))}
            </ol>
            {(() => {
              const cur = approvals.find((s) => s.current)
              const atEnd = !cur || cur === approvals[approvals.length - 1]
              const next = cur ? approvals[approvals.indexOf(cur) + 1] : undefined
              return (
                <button onClick={() => { if (advanceApproval() && next) flash(`${pick({ en: 'Approved →', ar: 'اعتُمد ←' })} ${pick(next.label)}`) }} disabled={atEnd} className={buttonClass('secondary', 'sm', 'self-start')}>
                  {atEnd ? pick({ en: 'Onboarding complete', ar: 'اكتمل الاعتماد' }) : `${pick({ en: 'Approve', ar: 'اعتماد' })}: ${pick(cur!.label)}`}
                </button>
              )
            })()}
          </div>
        </div>
      )}

      {inviteOpen && <InviteVendorModal onClose={() => setInviteOpen(false)} onSubmit={(v) => { inviteVendor(v); flash(`${pick({ en: 'Invitation sent to', ar: 'أُرسلت الدعوة إلى' })} ${pick(v.name)}`) }} />}
    </div>
  )
}

/** Invite a vendor to open a credit account: name, activity and email — lands in
 *  'Join requests & invitations' until they accept and get approved. */
function InviteVendorModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (v: { name: Bilingual; type: Bilingual; email: string }) => void }) {
  const { pick } = useLocale()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [email, setEmail] = useState('')
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())
  const valid = name.trim() !== '' && type.trim() !== '' && emailOk
  const submit = () => {
    onSubmit({ name: { en: name.trim(), ar: name.trim() }, type: { en: type.trim(), ar: type.trim() }, email: email.trim() })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" eyebrow={pick({ en: 'Vendors', ar: 'الموردون' })} title={pick({ en: 'Invite vendor', ar: 'دعوة مورّد' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}><Send size={15} /> {pick({ en: 'Send invitation', ar: 'إرسال الدعوة' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Business name', ar: 'اسم المنشأة' })}</span><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Al-Murjan Sweets', ar: 'مثال: حلويات المرجان' })} /></label>
        <div className="grid grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Activity', ar: 'النشاط' })}</span><input value={type} onChange={(e) => setType(e.target.value)} className="input" placeholder={pick({ en: 'e.g. Retail chain', ar: 'مثال: سلسلة تجزئة' })} /></label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Email', ar: 'البريد الإلكتروني' })}</span><input value={email} onChange={(e) => setEmail(e.target.value)} className={cn('input', email.trim() !== '' && !emailOk && 'border-danger')} dir="ltr" inputMode="email" placeholder="orders@vendor.sa" /></label>
        </div>
        <p className="font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md">{pick({ en: 'The vendor receives an invitation to open a credit account. Once they accept, the request appears here for your approval, then you set their credit limit.', ar: 'يستلم المورّد دعوة لفتح حساب ائتماني. عند قبوله تظهر لك هنا كطلب انضمام لاعتماده، ثم تحدد له الحد الائتماني.' })}</p>
      </div>
    </Modal>
  )
}
