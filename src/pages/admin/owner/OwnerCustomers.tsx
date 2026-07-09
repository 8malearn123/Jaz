import { useState } from 'react'
import { Gift, Eye } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { loyaltyStats, ownerTiers, type OwnerTier, type OwnerCustomer } from '@/data/ownerCustomers'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, FilterChips, Pill, UtilBar } from './_shared'

const tierOf = (k: OwnerTier) => ownerTiers.find((t) => t.key === k)!

export function OwnerCustomers() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { customers: allCustomers, rewardCustomer } = useOwnerState()
  // Loyalty is a B2C program — business (B2B) accounts live under their own sections.
  const customers = allCustomers.filter((c) => c.type === 'B2C')
  const [tier, setTier] = useState<OwnerTier | 'all'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = customers.find((c) => c.id === detailId) ?? null

  const chips = [
    { id: 'all' as const, label: pick({ en: 'All', ar: 'الكل' }), count: customers.length },
    ...ownerTiers.map((t) => ({ id: t.key, label: pick(t.label), count: customers.filter((c) => c.tier === t.key).length })),
  ]
  const shown = tier === 'all' ? customers : customers.filter((c) => c.tier === tier)

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Customers & loyalty', ar: 'العملاء والولاء' })} subtitle={pick({ en: 'Accounts, spend and loyalty tiers · 1 point per ﷼', ar: 'الحسابات والإنفاق وفئات الولاء · نقطة لكل ريال' })} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {loyaltyStats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={i === 0 ? 'dark' : 'plain'} />)}
      </div>

      {/* tiers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {ownerTiers.map((t) => (
          <div key={t.key} className="card p-lg flex flex-col gap-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink"><span className="w-2.5 h-2.5 rounded-pill" style={{ backgroundColor: t.color }} /> {pick(t.label)}</span>
              <span className="font-sans text-caption text-ink-subtle tabular-nums">{t.members}</span>
            </div>
            <span className="font-sans text-caption text-ink-subtle">{t.thresholdMinor > 0 ? `${money(t.thresholdMinor)}+` : pick({ en: 'Entry', ar: 'مبتدئ' })}</span>
            <span className="font-sans text-caption text-ink-muted">{pick(t.benefit)}</span>
          </div>
        ))}
      </div>

      <FilterChips chips={chips} active={tier} onChange={setTier} label={pick({ en: 'Tier', ar: 'الفئة' })} />

      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {shown.map((c) => {
            const td = tierOf(c.tier)
            const initials = pick(c.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
            return (
              <li key={c.id} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-10 h-10 rounded-pill shrink-0 font-serif text-card-title" style={{ backgroundColor: td.color + '22', color: td.color }}>{initials}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(c.name)} <span className="text-ink-subtle">· {c.type}</span></p>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{c.orders} {pick({ en: 'orders', ar: 'طلب' })} · {money(c.spendMinor)}</p>
                </div>
                <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption" style={{ backgroundColor: td.color + '18', color: td.color }}>{pick(td.label)}</span>
                <div className="flex items-center gap-xs">
                  <button onClick={() => { rewardCustomer(c.id, 50000); flash(`${pick({ en: '+500 pts to', ar: '+٥٠٠ نقطة لـ' })} ${pick(c.name)}`) }} className={cn('inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption bg-primary/10 text-primary-hover hover:bg-primary/15')}><Gift size={13} /> {pick({ en: 'Reward', ar: 'منح نقاط' })}</button>
                  <button onClick={() => setDetailId(c.id)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30" aria-label={pick({ en: 'View', ar: 'عرض' })}><Eye size={15} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {detail && <CustomerDetail customer={detail} onClose={() => setDetailId(null)} onReward={(pts) => { rewardCustomer(detail.id, pts); flash(`${pick({ en: '+', ar: '+' })}${(pts / 100).toLocaleString()} ${pick({ en: 'pts to', ar: 'نقطة لـ' })} ${pick(detail.name)}`) }} />}
    </div>
  )
}

function CustomerDetail({ customer, onClose, onReward }: { customer: OwnerCustomer; onClose: () => void; onReward: (pts: number) => void }) {
  const { pick, money } = useLocale()
  const td = tierOf(customer.tier)
  const idx = ownerTiers.findIndex((t) => t.key === customer.tier)
  const next = ownerTiers[idx + 1]
  const toNext = next ? next.thresholdMinor - customer.spendMinor : 0
  const progress = next ? Math.min(100, Math.round(((customer.spendMinor - td.thresholdMinor) / (next.thresholdMinor - td.thresholdMinor)) * 100)) : 100
  const initials = pick(customer.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <Modal open onClose={onClose} size="md" eyebrow={customer.id} title={pick(customer.name)}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      <div className="flex flex-col gap-lg">
        <div className="flex items-center gap-md">
          <span className="grid place-items-center w-14 h-14 rounded-pill shrink-0 font-serif text-headline" style={{ backgroundColor: td.color + '22', color: td.color }}>{initials}</span>
          <div className="flex-1">
            <p className="font-sans text-data text-ink">{customer.type} · {customer.orders} {pick({ en: 'orders', ar: 'طلب' })}</p>
            <Pill color={td.color} bg={td.color + '18'}>{pick(td.label)} · {pick(td.benefit)}</Pill>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-md">
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Lifetime spend', ar: 'إجمالي الإنفاق' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{money(customer.spendMinor)}</span></div>
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Points', ar: 'النقاط' })}</span><span className="font-serif text-card-title text-primary-hover tabular-nums">{Math.round(customer.spendMinor / 100).toLocaleString()}</span></div>
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Orders', ar: 'الطلبات' })}</span><span className="font-serif text-card-title text-ink tabular-nums">{customer.orders}</span></div>
        </div>

        {/* tier progress */}
        <div className="rounded-lg bg-surface-2 border border-hairline p-md flex flex-col gap-xs">
          <div className="flex items-center justify-between font-sans text-caption">
            <span className="text-ink-muted">{pick(td.label)}</span>
            {next ? <span className="text-ink-subtle">{pick(next.label)} · {money(toNext)} {pick({ en: 'to go', ar: 'متبقٍّ' })}</span> : <span className="text-success">{pick({ en: 'Top tier', ar: 'أعلى فئة' })}</span>}
          </div>
          <UtilBar pct={progress} color={td.color} />
        </div>

        {/* reward actions — real, recompute tier */}
        <div className="flex flex-wrap items-center gap-sm">
          <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Grant loyalty points:', ar: 'منح نقاط ولاء:' })}</span>
          {[10000, 50000, 100000].map((pts) => (
            <button key={pts} onClick={() => onReward(pts)} className="inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption bg-primary/10 text-primary-hover hover:bg-primary/15 transition-colors"><Gift size={13} /> +{(pts / 100).toLocaleString()}</button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
