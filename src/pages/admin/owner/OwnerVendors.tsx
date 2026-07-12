import { useState } from 'react'
import { ShieldCheck, Check, X, Send, UserPlus, HandCoins, Upload, CheckCircle2, Eye } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import { poByVendor, onboardingStages, type PoPayStatus } from '@/data/ownerVendors'
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

export function OwnerVendors() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { creditLimits: limits, setCreditLimit, vendors, advanceVendorStage, rejectVendor, inviteVendor, recordVendorPayment } = useOwnerState() // limits are overlay only — never written to shared org credit
  const [subTab, setSubTab] = useState<'accounts' | 'collection' | 'credit'>('accounts')
  const [sel, setSel] = useState('V-01')
  const [draft, setDraft] = useState<{ id: string; val: number } | null>(null)
  const [payDraft, setPayDraft] = useState<{ id: string; val: number } | null>(null)
  // Payments can NEVER be recorded without the settlement receipt attached.
  const [payReceipt, setPayReceipt] = useState<{ id: string; name: string } | null>(null)
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
  const vendor = activeVendors.find((v) => v.id === sel) ?? activeVendors[0]
  const limitMinor = vendor ? (limits[vendor.id] ?? vendor.limitMinor) : 0
  const availableMinor = vendor ? limitMinor - vendor.outstandingMinor : 0
  const utilPct = vendor && limitMinor > 0 ? Math.round((vendor.outstandingMinor / limitMinor) * 100) : 0
  const statusInfo = utilPct >= 100 ? { en: 'Over limit · orders blocked', ar: 'تجاوز الحد · إيقاف الطلبات', col: '#b5403b' } : utilPct >= 85 ? { en: 'Near limit', ar: 'قريب من الحد', col: '#b08a57' } : { en: 'Within limit', ar: 'ضمن الحد', col: '#355c4b' }
  const payVal = vendor && payDraft && payDraft.id === vendor.id ? payDraft.val : 0
  const receiptName = vendor && payReceipt && payReceipt.id === vendor.id ? payReceipt.name : null

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Vendors & credit', ar: 'الموردين والائتمان' })} subtitle={pick({ en: 'B2B credit accounts, limits and policy', ar: 'حسابات الائتمان التجارية والحدود والسياسة' })}
        action={<button onClick={() => setInviteOpen(true)} className={buttonClass('primary', 'sm')}><UserPlus size={15} /> {pick({ en: 'Invite vendor', ar: 'دعوة مورّد' })}</button>} />
      <SegTabs tabs={tabs} active={subTab} onChange={setSubTab} />

      {subTab === 'accounts' ? (
        <div className="flex flex-col gap-lg">
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
              {/* record a settlement against the outstanding balance — the receipt
                  attachment is MANDATORY: no receipt, no recorded payment. */}
              <div className="flex flex-col gap-sm pt-sm border-t border-hairline">
                <div className="flex flex-wrap items-end gap-sm">
                  <label className="flex flex-col gap-xs flex-1 min-w-[160px]"><span className="label">{pick({ en: 'Record payment (﷼)', ar: 'تسجيل سداد (﷼)' })}</span>
                    <input value={payVal || ''} onChange={(e) => setPayDraft({ id: vendor.id, val: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} className={cn('input tabular-nums', payVal * 100 > vendor.outstandingMinor && 'border-danger')} inputMode="numeric" placeholder="0" />
                    <span className={cn('font-sans text-caption tabular-nums', payVal * 100 > vendor.outstandingMinor ? 'text-danger' : 'text-ink-subtle')}>{pick({ en: 'Outstanding', ar: 'المستحق حاليًا' })}: {money(vendor.outstandingMinor)}</span>
                  </label>
                  <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
                    <Upload size={14} /> {receiptName ? pick({ en: 'Replace receipt', ar: 'استبدال الإيصال' }) : pick({ en: 'Attach receipt', ar: 'إرفاق الإيصال' })}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setPayReceipt({ id: vendor.id, name: f.name })
                      e.target.value = ''
                    }} />
                  </label>
                  <button onClick={() => { recordVendorPayment(vendor.id, payVal * 100); setPayDraft(null); setPayReceipt(null); flash(`${pick({ en: 'Payment recorded', ar: 'سُجّل سداد' })} ${money(payVal * 100)} · ${pick(vendor.name)}`) }} disabled={payVal <= 0 || payVal * 100 > vendor.outstandingMinor || !receiptName} className={buttonClass('secondary', 'sm')}><HandCoins size={15} /> {pick({ en: 'Record payment', ar: 'تسجيل السداد' })}</button>
                </div>
                {receiptName ? (
                  <span className="inline-flex items-center gap-xxs self-start rounded-pill border border-success/25 bg-success/8 px-3 py-1 font-sans text-caption text-ink"><CheckCircle2 size={12} className="text-success" /> <span dir="ltr">{receiptName}</span></span>
                ) : (
                  <p className="font-sans text-caption text-danger">{pick({ en: 'No payment can be recorded without attaching the settlement receipt.', ar: 'لا يُقبل تسجيل أي سداد بدون إرفاق ملف الإيصال.' })}</p>
                )}
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
                    <Pill color="#8a6b3f" bg="#f6edde">{pick({ en: 'Stage', ar: 'المرحلة' })} {stage + 1}/{onboardingStages.length}</Pill>
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
                  <div className="flex flex-wrap items-center gap-xs pt-sm border-t border-hairline">
                    <button
                      onClick={() => {
                        advanceVendorStage(v.id)
                        if (last) { setSel(v.id); setSubTab('accounts'); flash(`${pick({ en: 'Account activated', ar: 'فُعّل الحساب وأُتيحت صلاحياته' })} · ${pick(v.name)}`) }
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
