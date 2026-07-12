import { useState, type ReactNode } from 'react'
import { ShieldCheck, Check, X, Send, UserPlus, HandCoins, Upload, CheckCircle2, Eye, Search, FileText } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { poByVendor, onboardingStages, vendorDocMeta, type PoPayStatus, type OwnerVendor, type VendorDoc, type VendorDocKind } from '@/data/ownerVendors'
import { collectionRows, receivables, type ReceivableRow } from '@/data/ownerFinance'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, SegTabs, Pill, UtilBar } from './_shared'

const poMeta: Record<PoPayStatus, { label: { en: string; ar: string }; color: string; bg: string }> = {
  paid: { label: { en: 'Paid', ar: 'مسدّدة' }, color: '#355c4b', bg: '#e8f0ec' },
  net: { label: { en: 'On terms', ar: 'آجل' }, color: '#8a6b3f', bg: '#f6edde' },
  overdue: { label: { en: 'Overdue', ar: 'متأخر' }, color: '#b5403b', bg: '#faeceb' },
  preparing: { label: { en: 'Preparing', ar: 'قيد التجهيز' }, color: '#365766', bg: '#e7eef1' },
}

const utilColor = (pct: number) => (pct >= 100 ? '#b5403b' : pct >= 85 ? '#b08a57' : '#355c4b')

export function OwnerVendors() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { creditLimits: limits, setCreditLimit, vendors, advanceVendorStage, rejectVendor, inviteVendor, recordVendorPayment, vendorDocs, attachVendorDoc } = useOwnerState() // limits are overlay only — never written to shared org credit
  const [subTab, setSubTab] = useState<'accounts' | 'collection' | 'credit'>('accounts')
  const [query, setQuery] = useState('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [viewRec, setViewRec] = useState<ReceivableRow | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const tabs = [
    { id: 'accounts' as const, label: pick({ en: 'Accounts', ar: 'الحسابات' }) },
    { id: 'collection' as const, label: pick({ en: 'Collection', ar: 'التحصيل' }) },
    { id: 'credit' as const, label: pick({ en: 'Join requests', ar: 'طلبات الانضمام' }) },
  ]
  const activeVendors = vendors.filter((v) => v.status === 'active')
  const requests = vendors.filter((v) => v.status === 'pending')
  const invitations = vendors.filter((v) => v.status === 'invited')

  // directory search — matches name, activity, id, email or CR number in either language
  const q = query.trim().toLowerCase()
  const shownVendors = q === ''
    ? activeVendors
    : activeVendors.filter((v) => [v.name.en, v.name.ar, v.type.en, v.type.ar, v.id, v.email ?? '', v.crNumber ?? ''].some((s) => s.toLowerCase().includes(q)))

  const profileVendor = vendors.find((v) => v.id === profileId) ?? null
  const payVendor = vendors.find((v) => v.id === payId) ?? null

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Vendors & credit', ar: 'الموردين والائتمان' })} subtitle={pick({ en: 'B2B credit accounts, limits and policy', ar: 'حسابات الائتمان التجارية والحدود والسياسة' })}
        action={<button onClick={() => setInviteOpen(true)} className={buttonClass('primary', 'sm')}><UserPlus size={15} /> {pick({ en: 'Invite vendor', ar: 'دعوة مورّد' })}</button>} />
      <SegTabs tabs={tabs} active={subTab} onChange={setSubTab} />

      {subTab === 'accounts' ? (
        <div className="flex flex-col gap-lg">
          {/* searchable directory — same pattern as the customers list */}
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-ink-subtle pointer-events-none" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="input ps-10" placeholder={pick({ en: 'Search by name, activity, ID, email or CR number…', ar: 'ابحث بالاسم أو النشاط أو الرقم أو البريد أو السجل التجاري…' })} />
          </div>

          <div className="card overflow-hidden">
            <ul className="divide-y divide-hairline">
              {shownVendors.length === 0 && (
                <li className="px-lg py-md font-sans text-data text-ink-subtle">{pick({ en: 'No vendors match this search.', ar: 'لا يوجد مورّد مطابق لهذا البحث.' })}</li>
              )}
              {shownVendors.map((v) => {
                const lm = limits[v.id] ?? v.limitMinor
                const up = lm > 0 ? Math.round((v.outstandingMinor / lm) * 100) : 0
                const col = utilColor(up)
                const initials = pick(v.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
                return (
                  <li key={v.id} className="flex flex-wrap items-center gap-md px-lg py-md">
                    <span className="grid place-items-center w-10 h-10 rounded-pill shrink-0 font-serif text-card-title" style={{ backgroundColor: col + '22', color: col }}>{initials}</span>
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-sans text-data text-ink truncate">{pick(v.name)} <span className="text-ink-subtle">· {pick(v.type)}</span></p>
                      <p className="font-sans text-caption text-ink-subtle tabular-nums truncate">{v.id} · {pick({ en: 'Outstanding', ar: 'المستحق' })} {money(v.outstandingMinor)} · {pick({ en: 'Limit', ar: 'الحد' })} {money(lm)}</p>
                    </div>
                    <div className="hidden sm:flex flex-col gap-xxs w-28 shrink-0">
                      <span className="font-sans text-caption text-ink-subtle tabular-nums text-end">{up}%</span>
                      <UtilBar pct={up} color={col} />
                    </div>
                    {/* actions: view profile, then payment last */}
                    <div className="flex items-center gap-xs">
                      <button onClick={() => setProfileId(v.id)} className={buttonClass('secondary', 'sm')}><Eye size={14} /> {pick({ en: 'View', ar: 'عرض' })}</button>
                      <button onClick={() => setPayId(v.id)} className={buttonClass('primary', 'sm')}><HandCoins size={14} /> {pick({ en: 'Payment', ar: 'سداد' })}</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ) : subTab === 'collection' ? (
        <div className="flex flex-col gap-lg">
          {/* moved here from Finance — collection is a vendors/accounts affair */}
          <div className="card p-lg flex flex-col gap-md">
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Collection by channel', ar: 'التحصيل حسب القناة' })}</h3>
            {collectionRows.map((c, i) => (
              <div key={i} className="flex flex-col gap-xxs">
                <div className="flex items-center justify-between"><span className="font-sans text-data text-ink">{pick(c.label)} <span className="text-ink-subtle text-caption">· {pick(c.note)}</span></span><span className="font-sans text-data text-ink tabular-nums">{c.pct}%</span></div>
                <UtilBar pct={c.pct} color={c.pct >= 90 ? '#355c4b' : c.pct >= 60 ? '#b08a57' : '#b5403b'} />
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-lg py-md border-b border-hairline">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Receivables by account', ar: 'التحصيل حسب الحساب' })}</h3>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({ en: 'Every account, its outstanding balance, due date and how late it is', ar: 'كل حساب ومبلغه المستحق وتاريخ استحقاقه وهل هو متأخر بالسداد وكم التأخير' })}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-hairline">
                    {[{ h: { en: 'Account', ar: 'الحساب' }, a: 'text-start' }, { h: { en: 'Outstanding', ar: 'المبلغ المستحق' }, a: 'text-end' }, { h: { en: 'Due date', ar: 'تاريخ الاستحقاق' }, a: 'text-start' }, { h: { en: 'Payment status', ar: 'حالة السداد' }, a: 'text-start' }, { h: { en: 'View', ar: 'اطلاع' }, a: 'text-end' }].map((c, i) => (
                      <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.a)}>{pick(c.h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...receivables].sort((a, b) => b.daysLate - a.daysLate).map((r) => (
                    <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors">
                      <td className="px-lg py-md">
                        <p className="font-sans text-data text-ink truncate max-w-[240px]">{pick(r.account)}</p>
                        <p className="font-sans text-caption text-ink-subtle">{r.channel === 'MEGA' ? 'B2B' : 'HoReCa'}</p>
                      </td>
                      <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums whitespace-nowrap">{money(r.outstandingMinor)}</td>
                      <td className="px-lg py-md font-sans text-data text-ink-muted">{pick(r.dueDate)}</td>
                      <td className="px-lg py-md">
                        {r.daysLate > 0
                          ? <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>{pick({ en: 'Late', ar: 'متأخر' })} · {r.daysLate} {pick({ en: 'days', ar: 'يوم' })}</span>
                          : <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium" style={{ color: '#2f7d5b', backgroundColor: '#e6f2ea' }}>{pick({ en: 'Within terms', ar: 'ضمن المدة' })}</span>}
                      </td>
                      <td className="px-lg py-md text-end">
                        <button onClick={() => setViewRec(r)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30 transition-colors ms-auto" aria-label={pick({ en: 'View details', ar: 'اطلاع' })}><Eye size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
              <span className="font-sans text-caption text-ink-muted tabular-nums">{pick({ en: 'Total outstanding', ar: 'إجمالي المستحق' })}: {money(receivables.reduce((a, r) => a + r.outstandingMinor, 0))}</span>
              <span className="font-sans text-caption text-danger tabular-nums">{pick({ en: 'Overdue', ar: 'المتأخر' })}: {money(receivables.filter((r) => r.daysLate > 0).reduce((a, r) => a + r.outstandingMinor, 0))} · {receivables.filter((r) => r.daysLate > 0).length} {pick({ en: 'accounts', ar: 'حسابات' })}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-lg">
          {/* B2B partner registration (SOP 3.2.1): every join request walks the
              same approval chain, and permissions unlock only at the last stage. */}
          <div className="rounded-lg bg-primary/[0.05] border border-primary/20 p-md flex items-start gap-sm">
            <ShieldCheck size={18} className="text-primary-hover shrink-0 mt-0.5" />
            <p className="font-sans text-data text-ink-muted">
              {pick({ en: 'Partner registration (B2B): ', ar: 'تسجيل الشركاء (B2B): ' })}
              {onboardingStages.map((s) => pick(s.label)).join(pick({ en: ' → ', ar: ' ← ' }))}
            </p>
          </div>

          {requests.length === 0 && invitations.length === 0 && (
            <div className="card p-lg font-sans text-data text-ink-subtle">{pick({ en: 'No join requests right now — new requests and invitations appear here with their approval chain.', ar: 'لا توجد طلبات انضمام حاليًا — الطلبات والدعوات الجديدة تظهر هنا مع سلسلة اعتمادها.' })}</div>
          )}

          {/* one card per join request, with its position in the chain */}
          <div className="grid lg:grid-cols-2 gap-lg items-start">
            {requests.map((v) => {
              const stage = Math.min(v.stage ?? 0, onboardingStages.length - 1)
              const last = stage === onboardingStages.length - 1
              return (
                <div key={v.id} className="card p-lg flex flex-col gap-md">
                  <div className="flex flex-wrap items-start justify-between gap-sm">
                    <div>
                      <h3 className="font-serif text-card-title text-ink">{pick(v.name)}</h3>
                      <p className="font-sans text-caption text-ink-subtle">{pick(v.type)} · {v.id}{v.email && <span dir="ltr"> · {v.email}</span>}</p>
                    </div>
                    <div className="flex items-center gap-xs">
                      <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Stage', ar: 'المرحلة' })} {stage + 1}/{onboardingStages.length}</Pill>
                      <button onClick={() => setProfileId(v.id)} className={buttonClass('secondary', 'sm')}><Eye size={14} /> {pick({ en: 'View', ar: 'عرض' })}</button>
                    </div>
                  </div>
                  <ol className="flex flex-col gap-0">
                    {onboardingStages.map((s, i) => (
                      <li key={i} className="flex items-start gap-md pb-md last:pb-0">
                        <span className={cn('grid place-items-center w-8 h-8 rounded-pill border-2 shrink-0', i < stage ? 'bg-success/15 border-success text-success' : i === stage ? 'bg-primary/10 border-primary text-primary-hover animate-pulse' : 'bg-surface-2 border-hairline-strong text-ink-subtle')}>{i < stage ? <Check size={14} /> : i + 1}</span>
                        <span className="flex flex-col gap-xxs min-w-0">
                          <span className={cn('font-sans text-data', i <= stage ? 'text-ink' : 'text-ink-subtle')}>{pick(s.label)}</span>
                          <span className="font-sans text-caption text-ink-subtle">{pick(s.desc)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  {/* onboarding papers — attached right on the request, stored in the vendor file */}
                  <div className="flex flex-col gap-xs pt-sm border-t border-hairline">
                    <span className="label !mb-0">{pick({ en: 'Registration documents', ar: 'مستندات التسجيل' })}</span>
                    <div className="flex flex-wrap gap-xs">
                      {(Object.keys(vendorDocMeta) as VendorDocKind[]).map((kind) => {
                        const file = (vendorDocs[v.id] ?? {})[kind]
                        return (
                          <label key={kind} className={cn('inline-flex items-center gap-xs rounded-pill border px-3 py-1.5 font-sans text-caption cursor-pointer transition-colors', file ? 'border-success/30 bg-success/8 text-ink' : 'border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/30')}>
                            {file ? <CheckCircle2 size={13} className="text-success" /> : <Upload size={13} />}
                            {pick(vendorDocMeta[kind].label)}
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) { attachVendorDoc(v.id, kind, { name: f.name, url: URL.createObjectURL(f) }); flash(`${pick({ en: 'Attached', ar: 'أُرفق' })} · ${pick(vendorDocMeta[kind].label)} · ${pick(v.name)}`) }
                              e.target.value = ''
                            }} />
                          </label>
                        )
                      })}
                    </div>
                    <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Attached files land in the vendor profile — open View to preview them.', ar: 'الملفات المرفقة تُحفظ في ملف المورّد — افتح "عرض" لمعاينتها.' })}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-xs pt-sm border-t border-hairline">
                    <button
                      onClick={() => {
                        advanceVendorStage(v.id)
                        if (last) { setProfileId(v.id); setSubTab('accounts'); flash(`${pick({ en: 'Account activated', ar: 'فُعّل الحساب وأُتيحت صلاحياته' })} · ${pick(v.name)}`) }
                        else flash(`${pick({ en: 'Stage approved →', ar: 'اعتُمدت المرحلة ←' })} ${pick(onboardingStages[stage + 1].label)}`)
                      }}
                      className={buttonClass('primary', 'sm')}
                    >
                      <Check size={14} /> {last ? pick({ en: 'Activate & grant permissions', ar: 'تفعيل الحساب وإتاحة الصلاحيات' }) : `${pick({ en: 'Approve', ar: 'اعتماد' })}: ${pick(onboardingStages[stage].label)}`}
                    </button>
                    <button onClick={() => { rejectVendor(v.id); flash(`${pick({ en: 'Request rejected', ar: 'رُفض الطلب' })} · ${pick(v.name)}`) }} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={14} /> {pick({ en: 'Reject request', ar: 'رفض الطلب' })}</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* invitations sent but not yet registered — the chain starts once the account is created */}
          {invitations.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Invitations awaiting registration', ar: 'دعوات بانتظار التسجيل' })}</h3></div>
              <ul className="divide-y divide-hairline">
                {invitations.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-md px-lg py-md">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-sans text-data text-ink truncate">{pick(v.name)}</p>
                      <p className="font-sans text-caption text-ink-subtle truncate">{pick(v.type)} · {v.id}{v.email && <span dir="ltr"> · {v.email}</span>}</p>
                    </div>
                    <div className="flex items-center gap-xs">
                      <Pill color="#365766" bg="#e7eef1">{pick({ en: 'Awaiting initial account', ar: 'بانتظار إنشاء الحساب الأولي' })}</Pill>
                      <button onClick={() => { advanceVendorStage(v.id); flash(`${pick({ en: 'Account created — chain started', ar: 'أُنشئ الحساب — بدأت سلسلة الاعتماد' })} · ${pick(v.name)}`) }} className={buttonClass('secondary', 'sm')}><Check size={14} /> {pick({ en: 'Registered', ar: 'تم التسجيل' })}</button>
                      <button onClick={() => flash(`${pick({ en: 'Invitation resent to', ar: 'أُعيد إرسال الدعوة إلى' })} ${pick(v.name)}`)} className={buttonClass('secondary', 'sm')}><Send size={14} /> {pick({ en: 'Resend', ar: 'إعادة إرسال' })}</button>
                      <button onClick={() => { rejectVendor(v.id); flash(`${pick({ en: 'Invitation cancelled', ar: 'أُلغيت الدعوة' })} · ${pick(v.name)}`) }} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={14} /> {pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {inviteOpen && <InviteVendorModal onClose={() => setInviteOpen(false)} onSubmit={(v) => { inviteVendor(v); flash(`${pick({ en: 'Invitation sent to', ar: 'أُرسلت الدعوة إلى' })} ${pick(v.name)}`) }} />}

      {/* full vendor profile — verification data, contract & documents, credit and POs */}
      {profileVendor && (
        <VendorProfileModal
          vendor={profileVendor}
          limitMinor={limits[profileVendor.id] ?? profileVendor.limitMinor}
          docs={vendorDocs[profileVendor.id] ?? {}}
          onClose={() => setProfileId(null)}
          onSaveLimit={(minor) => { setCreditLimit(profileVendor.id, minor); flash(`${pick({ en: 'Credit limit saved for', ar: 'حُفظ الحد الائتماني لـ' })} ${pick(profileVendor.name)}`) }}
          onAttachDoc={(kind, doc) => { attachVendorDoc(profileVendor.id, kind, doc); flash(`${pick({ en: 'Attached', ar: 'أُرفق' })} · ${pick(vendorDocMeta[kind].label)}`) }}
          onPay={profileVendor.status === 'active' ? () => setPayId(profileVendor.id) : undefined}
        />
      )}

      {/* record a settlement — the receipt attachment is MANDATORY */}
      {payVendor && (
        <RecordPaymentModal
          vendor={payVendor}
          onClose={() => setPayId(null)}
          onRecord={(minor) => { recordVendorPayment(payVendor.id, minor); flash(`${pick({ en: 'Payment recorded', ar: 'سُجّل سداد' })} ${money(minor)} · ${pick(payVendor.name)}`) }}
        />
      )}

      {/* receivable inspection — opened from the eye button */}
      {viewRec && (
        <Modal open onClose={() => setViewRec(null)} size="sm" eyebrow={pick({ en: 'Receivable', ar: 'مستحق تحصيل' })} title={pick(viewRec.account)}
          footer={<button onClick={() => setViewRec(null)} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
          <div className="flex flex-col gap-md">
            <div className="rounded-lg border border-hairline divide-y divide-hairline">
              {[
                { k: pick({ en: 'Channel', ar: 'القناة' }), v: viewRec.channel === 'MEGA' ? 'B2B' : 'HoReCa' },
                { k: pick({ en: 'Outstanding', ar: 'المبلغ المستحق' }), v: money(viewRec.outstandingMinor) },
                { k: pick({ en: 'Due date', ar: 'تاريخ الاستحقاق' }), v: pick(viewRec.dueDate) },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between px-md py-2">
                  <span className="font-sans text-caption text-ink-subtle">{r.k}</span>
                  <span className="font-sans text-data text-ink tabular-nums">{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-md py-2">
                <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Payment status', ar: 'حالة السداد' })}</span>
                {viewRec.daysLate > 0
                  ? <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>{pick({ en: 'Late', ar: 'متأخر' })} · {viewRec.daysLate} {pick({ en: 'days', ar: 'يوم' })}</span>
                  : <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium" style={{ color: '#2f7d5b', backgroundColor: '#e6f2ea' }}>{pick({ en: 'Within terms', ar: 'ضمن المدة' })}</span>}
              </div>
            </div>
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'The balance is the sum of this account’s unpaid invoices. It clears automatically once payments are recorded.', ar: 'المبلغ هو مجموع فواتير هذا الحساب غير المسددة، ويُصفَّر تلقائيًا عند تسجيل السداد.' })}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Comprehensive vendor profile: identity & contact, verification data (CR, VAT,
 *  address), attached documents (contract + certificates), credit account and POs. */
function VendorProfileModal({ vendor, limitMinor, docs, onClose, onSaveLimit, onAttachDoc, onPay }: {
  vendor: OwnerVendor
  limitMinor: number
  docs: Partial<Record<VendorDocKind, VendorDoc>>
  onClose: () => void
  onSaveLimit: (minor: number) => void
  onAttachDoc: (kind: VendorDocKind, doc: VendorDoc) => void
  onPay?: () => void
}) {
  const { pick, money } = useLocale()
  const [draft, setDraft] = useState<number | null>(null)
  const [preview, setPreview] = useState<VendorDocKind | null>(null)
  const active = vendor.status === 'active'
  const availableMinor = limitMinor - vendor.outstandingMinor
  const utilPct = limitMinor > 0 ? Math.round((vendor.outstandingMinor / limitMinor) * 100) : 0
  const col = utilColor(utilPct)
  const initials = pick(vendor.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
  const missing = pick({ en: 'Not provided yet', ar: 'غير مستكمل بعد' })
  const pos = poByVendor[vendor.id] ?? []

  const infoRow = (k: string, v: ReactNode) => (
    <div className="flex items-center justify-between gap-sm px-md py-2">
      <span className="font-sans text-caption text-ink-subtle shrink-0">{k}</span>
      <span className="font-sans text-data text-ink text-end truncate">{v}</span>
    </div>
  )

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={vendor.id} title={pick(vendor.name)}
      footer={<div className="flex items-center justify-between w-full">
        {onPay ? <button onClick={onPay} className={buttonClass('primary', 'sm')}><HandCoins size={14} /> {pick({ en: 'Payment', ar: 'سداد' })}</button> : <span />}
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>
      </div>}>
      <div className="flex flex-col gap-lg">
        {/* identity & contact */}
        <div className="flex items-center gap-md">
          <span className="grid place-items-center w-14 h-14 rounded-pill shrink-0 font-serif text-headline" style={{ backgroundColor: col + '22', color: col }}>{initials}</span>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-data text-ink">{pick(vendor.type)}{vendor.since && <span className="text-ink-subtle"> · {pick({ en: 'Partner since', ar: 'شريك منذ' })} {pick(vendor.since)}</span>}</p>
            <Pill color={active ? '#355c4b' : '#8a6b3f'} bg={active ? '#e8f0ec' : '#f6edde'}>{active ? pick({ en: 'Active account', ar: 'حساب نشط' }) : pick({ en: 'In registration', ar: 'تحت التسجيل' })}</Pill>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-lg items-start">
          {/* contact details */}
          <div className="flex flex-col gap-sm">
            <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Contact', ar: 'بيانات التواصل' })}</h4>
            <div className="rounded-lg border border-hairline divide-y divide-hairline">
              {infoRow(pick({ en: 'Contact person', ar: 'جهة الاتصال' }), vendor.contact ? pick(vendor.contact) : missing)}
              {infoRow(pick({ en: 'Phone', ar: 'الجوال' }), vendor.phone ? <span dir="ltr" className="tabular-nums">{vendor.phone}</span> : missing)}
              {infoRow(pick({ en: 'Email', ar: 'البريد الإلكتروني' }), vendor.email ? <span dir="ltr">{vendor.email}</span> : missing)}
            </div>
          </div>

          {/* verification data */}
          <div className="flex flex-col gap-sm">
            <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Verification data', ar: 'بيانات التوثيق' })}</h4>
            <div className="rounded-lg border border-hairline divide-y divide-hairline">
              {infoRow(pick({ en: 'Commercial registration', ar: 'السجل التجاري' }), vendor.crNumber ? <span dir="ltr" className="tabular-nums">{vendor.crNumber}</span> : missing)}
              {infoRow(pick({ en: 'VAT number', ar: 'الرقم الضريبي' }), vendor.vatNumber ? <span dir="ltr" className="tabular-nums">{vendor.vatNumber}</span> : missing)}
              {infoRow(pick({ en: 'National address', ar: 'العنوان الوطني' }), vendor.address ? pick(vendor.address) : missing)}
            </div>
          </div>
        </div>

        {/* documents: signed contract + verification papers */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Documents', ar: 'المستندات والعقد' })}</h4>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            {(Object.keys(vendorDocMeta) as VendorDocKind[]).map((kind) => {
              const meta = vendorDocMeta[kind]
              const file = docs[kind]
              return (
                <div key={kind} className="flex flex-wrap items-center gap-sm px-md py-sm">
                  <span className={cn('grid place-items-center w-9 h-9 rounded-md shrink-0', file ? 'bg-success/10 text-success' : 'bg-surface-2 text-ink-subtle')}><FileText size={16} /></span>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-sans text-data text-ink">{pick(meta.label)}</p>
                    <p className="font-sans text-caption text-ink-subtle">{file ? <span dir="ltr">{file.name}</span> : pick(meta.desc)}</p>
                  </div>
                  {file
                    ? <span className="inline-flex items-center gap-xxs rounded-pill border border-success/25 bg-success/8 px-2.5 py-1 font-sans text-caption text-ink"><CheckCircle2 size={12} className="text-success" /> {pick({ en: 'Attached', ar: 'مرفق' })}</span>
                    : <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Missing', ar: 'غير مرفق' })}</Pill>}
                  {file && <button onClick={() => setPreview(kind)} className={buttonClass('secondary', 'sm')}><Eye size={13} /> {pick({ en: 'View', ar: 'عرض' })}</button>}
                  <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
                    <Upload size={13} /> {file ? pick({ en: 'Replace', ar: 'استبدال' }) : pick({ en: 'Attach', ar: 'إرفاق' })}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onAttachDoc(kind, { name: f.name, url: URL.createObjectURL(f) })
                      e.target.value = ''
                    }} />
                  </label>
                </div>
              )
            })}
          </div>
          <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'The signed contract and verification papers live on the vendor profile — attach or replace them here any time.', ar: 'العقد الموقّع وأوراق التوثيق محفوظة في ملف المورّد — يمكن إرفاقها أو استبدالها هنا في أي وقت.' })}</p>
        </div>

        {/* credit account */}
        {active && (
          <div className="flex flex-col gap-sm">
            <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Credit account', ar: 'الحساب الائتماني' })}</h4>
            <div className="rounded-lg border border-hairline p-md flex flex-col gap-md">
              <div className="grid grid-cols-3 gap-md">
                <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Outstanding', ar: 'المستحق' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{money(vendor.outstandingMinor)}</span></div>
                <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Available', ar: 'المتاح' })}</span><span className={cn('font-serif text-card-title tabular-nums', availableMinor < 0 ? 'text-danger' : 'text-success')}>{money(availableMinor)}</span></div>
                <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Utilization', ar: 'الاستغلال' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{utilPct}%</span></div>
              </div>
              <UtilBar pct={utilPct} color={col} />
              <div className="flex flex-wrap items-end gap-sm pt-sm border-t border-hairline">
                <label className="flex flex-col gap-xs flex-1 min-w-[160px]"><span className="label">{pick({ en: 'Credit limit (﷼)', ar: 'الحد الائتماني (﷼)' })}</span>
                  <input value={draft ?? Math.round(limitMinor / 100)} onChange={(e) => setDraft(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} className="input tabular-nums" inputMode="numeric" /></label>
                <button onClick={() => { if (draft != null) { onSaveLimit(draft * 100); setDraft(null) } }} disabled={draft == null || draft * 100 === limitMinor} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save limit', ar: 'حفظ الحد' })}</button>
              </div>
            </div>
          </div>
        )}

        {/* purchase orders */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Purchase orders', ar: 'أوامر الشراء' })}</h4>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            {pos.length === 0 && <p className="px-md py-sm font-sans text-caption text-ink-subtle">{pick({ en: 'No purchase orders yet.', ar: 'لا أوامر شراء بعد.' })}</p>}
            {pos.map((po) => {
              const m = poMeta[po.status]
              return (
                <div key={po.id} className="flex items-center gap-md px-md py-sm">
                  <span className="font-sans text-data text-ink tabular-nums flex-1">{po.id} <span className="text-ink-subtle text-caption">· {pick(po.date)}</span></span>
                  <span className="font-sans text-data text-ink tabular-nums">{money(po.amountMinor)}</span>
                  <Pill color={m.color} bg={m.bg}>{pick(m.label)}</Pill>
                </div>
              )
            })}
          </div>
        </div>

        {/* document preview — freshly attached files render as-is (object URL);
            stored copies render as a formatted document card */}
        {preview && docs[preview] && (
          <DocPreviewModal vendor={vendor} kind={preview} doc={docs[preview]!} onClose={() => setPreview(null)} />
        )}
      </div>
    </Modal>
  )
}

/** Preview a vendor document. Files attached in this session carry an object
 *  URL and render directly (PDF in a frame, images inline); seeded copies get
 *  a formatted paper view built from the vendor's verification data. */
function DocPreviewModal({ vendor, kind, doc, onClose }: { vendor: OwnerVendor; kind: VendorDocKind; doc: VendorDoc; onClose: () => void }) {
  const { pick } = useLocale()
  const meta = vendorDocMeta[kind]
  const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.name)
  const row = (k: string, v: ReactNode) => (
    <div className="flex items-center justify-between gap-sm py-2 border-b border-hairline last:border-0">
      <span className="font-sans text-caption text-ink-subtle">{k}</span>
      <span className="font-sans text-data text-ink text-end">{v}</span>
    </div>
  )
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick(meta.label)} title={pick(vendor.name)}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      {doc.url ? (
        isImage
          ? <img src={doc.url} alt={doc.name} className="w-full max-h-[70vh] object-contain rounded-lg border border-hairline bg-surface-2" />
          : <iframe src={doc.url} title={doc.name} className="w-full h-[70vh] rounded-lg border border-hairline bg-white" />
      ) : (
        <div className="rounded-lg border border-hairline bg-surface-1 p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between border-b-2 border-ink/80 pb-md">
            <div>
              <p className="font-serif text-headline text-ink">{pick(meta.label)}</p>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick(meta.desc)}</p>
            </div>
            <span className="grid place-items-center w-12 h-12 rounded-md bg-primary/10 text-primary-hover"><FileText size={22} /></span>
          </div>
          <div className="flex flex-col">
            {row(pick({ en: 'Business name', ar: 'اسم المنشأة' }), pick(vendor.name))}
            {row(pick({ en: 'Activity', ar: 'النشاط' }), pick(vendor.type))}
            {kind !== 'vat' && vendor.crNumber && row(pick({ en: 'CR number', ar: 'رقم السجل التجاري' }), <span dir="ltr" className="tabular-nums">{vendor.crNumber}</span>)}
            {kind !== 'cr' && vendor.vatNumber && row(pick({ en: 'VAT number', ar: 'الرقم الضريبي' }), <span dir="ltr" className="tabular-nums">{vendor.vatNumber}</span>)}
            {vendor.address && row(pick({ en: 'National address', ar: 'العنوان الوطني' }), pick(vendor.address))}
            {kind === 'contract' && vendor.since && row(pick({ en: 'Contract effective since', ar: 'سريان العقد منذ' }), pick(vendor.since))}
            {kind === 'contract' && row(pick({ en: 'Signatories', ar: 'الموقّعون' }), `${pick({ en: 'JAZ Chocolate', ar: 'جاز للشوكولاتة' })} · ${vendor.contact ? pick(vendor.contact) : pick(vendor.name)}`)}
            {row(pick({ en: 'File', ar: 'الملف' }), <span dir="ltr">{doc.name}</span>)}
          </div>
          <p className="font-sans text-caption text-ink-subtle rounded-lg bg-surface-2 border border-hairline p-md">
            {pick({ en: 'A stored copy from the vendor file, captured during onboarding. Replace it any time to preview the original file itself.', ar: 'نسخة محفوظة من ملف المورّد أُرفقت أثناء التسجيل. عند استبدالها بملف جديد تُعرض معاينة الملف الأصلي نفسه.' })}
          </p>
        </div>
      )}
    </Modal>
  )
}

/** Record a settlement against the vendor's outstanding balance — the receipt
 *  attachment is MANDATORY: no receipt, no recorded payment. */
function RecordPaymentModal({ vendor, onClose, onRecord }: { vendor: OwnerVendor; onClose: () => void; onRecord: (amountMinor: number) => void }) {
  const { pick, money } = useLocale()
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState<string | null>(null)
  const minor = (parseInt(amount.replace(/\D/g, ''), 10) || 0) * 100
  const over = minor > vendor.outstandingMinor
  const valid = minor > 0 && !over && receipt != null
  const submit = () => {
    if (!valid) return
    onRecord(minor)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="sm" eyebrow={vendor.id} title={`${pick({ en: 'Record payment', ar: 'تسجيل سداد' })} · ${pick(vendor.name)}`}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}><HandCoins size={15} /> {pick({ en: 'Record payment', ar: 'تسجيل السداد' })}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Amount (﷼)', ar: 'المبلغ (﷼)' })}</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className={cn('input tabular-nums', over && 'border-danger')} dir="ltr" inputMode="numeric" placeholder="0" autoFocus />
          <span className={cn('font-sans text-caption tabular-nums', over ? 'text-danger' : 'text-ink-subtle')}>{pick({ en: 'Outstanding', ar: 'المستحق حاليًا' })}: {money(vendor.outstandingMinor)}</span>
        </label>
        <div className="flex flex-wrap items-center gap-sm">
          <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
            <Upload size={14} /> {receipt ? pick({ en: 'Replace receipt', ar: 'استبدال الإيصال' }) : pick({ en: 'Attach receipt', ar: 'إرفاق الإيصال' })}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setReceipt(f.name)
              e.target.value = ''
            }} />
          </label>
          {receipt && <span className="inline-flex items-center gap-xxs rounded-pill border border-success/25 bg-success/8 px-3 py-1 font-sans text-caption text-ink"><CheckCircle2 size={12} className="text-success" /> <span dir="ltr">{receipt}</span></span>}
        </div>
        {!receipt && <p className="font-sans text-caption text-danger">{pick({ en: 'No payment can be recorded without attaching the settlement receipt.', ar: 'لا يُقبل تسجيل أي سداد بدون إرفاق ملف الإيصال.' })}</p>}
      </div>
    </Modal>
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
