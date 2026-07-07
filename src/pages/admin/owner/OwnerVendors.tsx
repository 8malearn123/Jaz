import { useState } from 'react'
import { ShieldCheck, Check } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { buttonClass } from '@/components/ui/Button'
import { ownerVendors, poByVendor, creditRules, type PoPayStatus } from '@/data/ownerVendors'
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
  const { creditLimits: limits, setCreditLimit, approvals, advanceApproval } = useOwnerState() // overlay only — never written to shared org credit
  const [subTab, setSubTab] = useState<'accounts' | 'credit'>('accounts')
  const [sel, setSel] = useState('V-01')
  const [draft, setDraft] = useState<{ id: string; val: number } | null>(null)

  const tabs = [{ id: 'accounts' as const, label: pick({ en: 'Accounts', ar: 'الحسابات' }) }, { id: 'credit' as const, label: pick({ en: 'Credit policy', ar: 'سياسة الائتمان' }) }]
  const vendor = ownerVendors.find((v) => v.id === sel)!
  const limitMinor = limits[sel] ?? vendor.limitMinor
  const availableMinor = limitMinor - vendor.outstandingMinor
  const utilPct = Math.round((vendor.outstandingMinor / limitMinor) * 100)
  const statusInfo = utilPct >= 100 ? { en: 'Over limit · orders blocked', ar: 'تجاوز الحد · إيقاف الطلبات', col: '#b5403b' } : utilPct >= 85 ? { en: 'Near limit', ar: 'قريب من الحد', col: '#b08a57' } : { en: 'Within limit', ar: 'ضمن الحد', col: '#355c4b' }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Vendors & credit', ar: 'الموردين والائتمان' })} subtitle={pick({ en: 'B2B credit accounts, limits and policy', ar: 'حسابات الائتمان التجارية والحدود والسياسة' })} />
      <SegTabs tabs={tabs} active={subTab} onChange={setSubTab} />

      {subTab === 'accounts' ? (
        <div className="grid lg:grid-cols-[300px_1fr] gap-lg items-start">
          {/* vendor list */}
          <div className="card overflow-hidden">
            <ul className="divide-y divide-hairline">
              {ownerVendors.map((v) => {
                const lm = limits[v.id] ?? v.limitMinor
                const up = Math.round((v.outstandingMinor / lm) * 100)
                const on = v.id === sel
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
                  <input value={draft && draft.id === sel ? draft.val : Math.round(limitMinor / 100)} onChange={(e) => setDraft({ id: sel, val: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} className="input tabular-nums" inputMode="numeric" /></label>
                <button onClick={() => { if (draft && draft.id === sel) { setCreditLimit(sel, draft.val * 100); setDraft(null); flash(`${pick({ en: 'Credit limit saved for', ar: 'حُفظ الحد الائتماني لـ' })} ${pick(vendor.name)}`) } }} disabled={!draft || draft.id !== sel || draft.val * 100 === limitMinor} className={buttonClass('primary', 'sm')}>{pick({ en: 'Save limit', ar: 'حفظ الحد' })}</button>
              </div>
            </div>

            {/* vendor POs */}
            <div className="card overflow-hidden">
              <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Purchase orders', ar: 'أوامر الشراء' })}</h3></div>
              <ul className="divide-y divide-hairline">
                {(poByVendor[sel] ?? []).map((po) => {
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
    </div>
  )
}
