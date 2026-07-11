import { useState } from 'react'
import { Gift, Eye, Settings2, Check } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { loyaltyStats, ownerTiers, type OwnerTier, type OwnerCustomer } from '@/data/ownerCustomers'
import { useOwnerState, type LoyaltyConfig } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, FilterChips, Pill, UtilBar } from './_shared'

const tierOf = (k: OwnerTier) => ownerTiers.find((t) => t.key === k)!

export function OwnerCustomers() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { customers: allCustomers, rewardCustomer, loyalty, setLoyalty } = useOwnerState()
  // Loyalty is a B2C program — business (B2B) accounts live under their own sections.
  const customers = allCustomers.filter((c) => c.type === 'B2C')
  const [tier, setTier] = useState<OwnerTier | 'all'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [rewardId, setRewardId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const detail = customers.find((c) => c.id === detailId) ?? null
  const rewardTarget = customers.find((c) => c.id === rewardId) ?? null

  const chips = [
    { id: 'all' as const, label: pick({ en: 'All', ar: 'الكل' }), count: customers.length },
    ...ownerTiers.map((t) => ({ id: t.key, label: pick(t.label), count: customers.filter((c) => c.tier === t.key).length })),
  ]
  const shown = tier === 'all' ? customers : customers.filter((c) => c.tier === tier)

  const grant = (c: OwnerCustomer, pts: number, note?: string) => {
    rewardCustomer(c.id, pts * 100)
    flash(`+${pts.toLocaleString()} ${pick({ en: 'pts to', ar: 'نقطة لـ' })} ${pick(c.name)}${note ? ` · ${note}` : ''}`)
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Customers & loyalty', ar: 'العملاء والولاء' })}
        subtitle={pick({ en: `Accounts, spend and loyalty tiers · ${loyalty.earnPerRiyal} pt per ﷼`, ar: `الحسابات والإنفاق وفئات الولاء · ${loyalty.earnPerRiyal} نقطة لكل ريال` })}
        action={<button onClick={() => setSettingsOpen(true)} className={buttonClass('secondary', 'sm')}><Settings2 size={15} /> {pick({ en: 'Loyalty settings', ar: 'إعدادات الولاء' })}</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {loyaltyStats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={i === 0 ? 'dark' : 'plain'} />)}
      </div>

      {/* tiers — thresholds come from the owner's loyalty settings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        {ownerTiers.map((t) => (
          <div key={t.key} className="card p-lg flex flex-col gap-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink"><span className="w-2.5 h-2.5 rounded-pill" style={{ backgroundColor: t.color }} /> {pick(t.label)}</span>
              <span className="font-sans text-caption text-ink-subtle tabular-nums">{t.members}</span>
            </div>
            <span className="font-sans text-caption text-ink-subtle">{loyalty.thresholds[t.key] > 0 ? `${money(loyalty.thresholds[t.key])}+` : pick({ en: 'Entry', ar: 'مبتدئ' })}</span>
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
                  <button onClick={() => setRewardId(c.id)} className={cn('inline-flex items-center gap-xxs rounded-md px-3 py-1.5 font-sans text-caption bg-primary/10 text-primary-hover hover:bg-primary/15')}><Gift size={13} /> {pick({ en: 'Reward', ar: 'منح نقاط' })}</button>
                  <button onClick={() => setDetailId(c.id)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30" aria-label={pick({ en: 'View', ar: 'عرض' })}><Eye size={15} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* points are granted explicitly: pick the amount, confirm, then it applies */}
      {rewardTarget && <RewardModal customer={rewardTarget} onClose={() => setRewardId(null)} onGrant={(pts, note) => grant(rewardTarget, pts, note)} />}

      {detail && <CustomerDetail customer={detail} loyalty={loyalty} onClose={() => setDetailId(null)} onReward={() => { setRewardId(detail.id) }} />}

      {settingsOpen && <LoyaltySettingsModal loyalty={loyalty} onClose={() => setSettingsOpen(false)} onSave={(patch) => { setLoyalty(patch); flash(pick({ en: 'Loyalty settings saved', ar: 'حُفظت إعدادات الولاء' })) }} />}
    </div>
  )
}

/** Grant loyalty points explicitly — the owner types the amount (quick chips just fill the field). */
function RewardModal({ customer, onClose, onGrant }: { customer: OwnerCustomer; onClose: () => void; onGrant: (pts: number, note?: string) => void }) {
  const { pick } = useLocale() // money not needed here — points only
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const pts = parseInt(amount.replace(/\D/g, ''), 10) || 0
  const submit = () => {
    if (pts <= 0) return
    onGrant(pts, note.trim() || undefined)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="sm" eyebrow={pick({ en: 'Loyalty', ar: 'الولاء' })} title={`${pick({ en: 'Grant points', ar: 'منح نقاط' })} · ${pick(customer.name)}`}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={pts <= 0} className={buttonClass('primary', 'sm')}><Gift size={15} /> {pick({ en: 'Grant', ar: 'منح' })}{pts > 0 && ` +${pts.toLocaleString()}`}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Points', ar: 'عدد النقاط' })}</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className="input tabular-nums" dir="ltr" inputMode="numeric" placeholder="0" autoFocus />
        </label>
        <div className="flex flex-wrap gap-xs">
          {[100, 500, 1000].map((v) => (
            <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-pill border border-hairline-strong px-3 py-1 font-sans text-caption text-ink-muted hover:text-ink hover:border-ink/30 tabular-nums">+{v.toLocaleString()}</button>
          ))}
        </div>
        <label className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Reason (optional)', ar: 'سبب المنح (اختياري)' })}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder={pick({ en: 'e.g. service recovery, campaign…', ar: 'مثال: تعويض، حملة تسويقية…' })} />
        </label>
        <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Points apply immediately and the customer’s tier is recalculated.', ar: 'تُضاف النقاط فورًا ويُعاد احتساب فئة العميل تلقائيًا.' })}</p>
      </div>
    </Modal>
  )
}

/** Owner control over the whole loyalty mechanic: earn rate, redemption, expiry and tier thresholds. */
function LoyaltySettingsModal({ loyalty, onClose, onSave }: { loyalty: LoyaltyConfig; onClose: () => void; onSave: (patch: Partial<LoyaltyConfig>) => void }) {
  const { pick } = useLocale()
  const [earn, setEarn] = useState(String(loyalty.earnPerRiyal))
  const [redeem, setRedeem] = useState(String(loyalty.riyalPer100Points))
  const [minRedeem, setMinRedeem] = useState(String(loyalty.minRedeemPoints))
  const [expiry, setExpiry] = useState(String(loyalty.expiryMonths))
  const [thresholds, setThresholds] = useState<Record<OwnerTier, string>>(
    Object.fromEntries(ownerTiers.map((t) => [t.key, String(Math.round(loyalty.thresholds[t.key] / 100))])) as Record<OwnerTier, string>,
  )

  const n = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0
  const valid = n(earn) > 0 && n(redeem) > 0
  const save = () => {
    onSave({
      earnPerRiyal: n(earn),
      riyalPer100Points: n(redeem),
      minRedeemPoints: n(minRedeem),
      expiryMonths: n(expiry),
      thresholds: Object.fromEntries(ownerTiers.map((t) => [t.key, t.key === 'basic' ? 0 : n(thresholds[t.key]) * 100])) as Record<OwnerTier, number>,
    })
    onClose()
  }

  const numInput = (val: string, set: (s: string) => void, suffix: string) => (
    <div className="flex items-center gap-xs">
      <input value={val} onChange={(e) => set(e.target.value.replace(/\D/g, ''))} className="input tabular-nums w-28" dir="ltr" inputMode="numeric" />
      <span className="font-sans text-caption text-ink-subtle shrink-0">{suffix}</span>
    </div>
  )

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Loyalty', ar: 'الولاء' })} title={pick({ en: 'Loyalty settings', ar: 'إعدادات الولاء' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={save} disabled={!valid} className={buttonClass('primary', 'sm')}><Check size={15} /> {pick({ en: 'Save settings', ar: 'حفظ الإعدادات' })}</button>
      </>}>
      <div className="flex flex-col gap-lg">
        {/* earning */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Earning points', ar: 'آلية كسب النقاط' })}</h4>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            <div className="flex flex-wrap items-center justify-between gap-sm px-md py-sm">
              <div>
                <p className="font-sans text-data text-ink">{pick({ en: 'Points per riyal spent', ar: 'نقاط لكل ريال إنفاق' })}</p>
                <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Earned automatically on every completed order', ar: 'تُكسب تلقائيًا مع كل طلب مكتمل' })}</p>
              </div>
              {numInput(earn, setEarn, pick({ en: 'pt / ﷼', ar: 'نقطة / ريال' }))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-sm px-md py-sm">
              <div>
                <p className="font-sans text-data text-ink">{pick({ en: 'Points expiry', ar: 'صلاحية النقاط' })}</p>
                <p className="font-sans text-caption text-ink-subtle">{pick({ en: '0 = points never expire', ar: '٠ = النقاط لا تنتهي' })}</p>
              </div>
              {numInput(expiry, setExpiry, pick({ en: 'months', ar: 'شهرًا' }))}
            </div>
          </div>
        </div>

        {/* redemption */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Redemption', ar: 'استبدال النقاط' })}</h4>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            <div className="flex flex-wrap items-center justify-between gap-sm px-md py-sm">
              <div>
                <p className="font-sans text-data text-ink">{pick({ en: 'Value of 100 points', ar: 'قيمة كل ١٠٠ نقطة' })}</p>
                <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Applied as a discount at checkout', ar: 'تُطبق كخصم عند الدفع' })}</p>
              </div>
              {numInput(redeem, setRedeem, pick({ en: '﷼', ar: 'ريال' }))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-sm px-md py-sm">
              <div>
                <p className="font-sans text-data text-ink">{pick({ en: 'Minimum balance to redeem', ar: 'الحد الأدنى للاستبدال' })}</p>
                <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Below this, points accumulate only', ar: 'دون ذلك تتراكم النقاط فقط' })}</p>
              </div>
              {numInput(minRedeem, setMinRedeem, pick({ en: 'pts', ar: 'نقطة' }))}
            </div>
          </div>
        </div>

        {/* tier thresholds */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Tier thresholds', ar: 'عتبات الفئات' })}</h4>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            {ownerTiers.map((t) => (
              <div key={t.key} className="flex flex-wrap items-center justify-between gap-sm px-md py-sm">
                <div className="flex items-center gap-xs">
                  <span className="w-2.5 h-2.5 rounded-pill" style={{ backgroundColor: t.color }} />
                  <p className="font-sans text-data text-ink">{pick(t.label)}</p>
                  <span className="font-sans text-caption text-ink-subtle">· {pick(t.benefit)}</span>
                </div>
                {t.key === 'basic'
                  ? <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Entry tier — from zero', ar: 'فئة الدخول — من الصفر' })}</span>
                  : numInput(thresholds[t.key], (s) => setThresholds((prev) => ({ ...prev, [t.key]: s })), pick({ en: '﷼ lifetime spend', ar: 'ريال إنفاق تراكمي' }))}
              </div>
            ))}
          </div>
          <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Customers move between tiers automatically as their lifetime spend crosses these thresholds.', ar: 'ينتقل العملاء بين الفئات تلقائيًا عندما يتجاوز إنفاقهم التراكمي هذه العتبات.' })}</p>
        </div>
      </div>
    </Modal>
  )
}

function CustomerDetail({ customer, loyalty, onClose, onReward }: { customer: OwnerCustomer; loyalty: LoyaltyConfig; onClose: () => void; onReward: () => void }) {
  const { pick, money } = useLocale()
  const td = tierOf(customer.tier)
  const idx = ownerTiers.findIndex((t) => t.key === customer.tier)
  const next = ownerTiers[idx + 1]
  const nextThreshold = next ? loyalty.thresholds[next.key] : 0
  const curThreshold = loyalty.thresholds[td.key]
  const toNext = next ? nextThreshold - customer.spendMinor : 0
  const progress = next ? Math.min(100, Math.round(((customer.spendMinor - curThreshold) / (nextThreshold - curThreshold)) * 100)) : 100
  const initials = pick(customer.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <Modal open onClose={onClose} size="md" eyebrow={customer.id} title={pick(customer.name)}
      footer={<div className="flex items-center justify-between w-full">
        <button onClick={onReward} className={buttonClass('secondary', 'sm')}><Gift size={14} /> {pick({ en: 'Grant points', ar: 'منح نقاط' })}</button>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>
      </div>}>
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
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Points', ar: 'النقاط' })}</span><span className="font-serif text-card-title text-primary-hover tabular-nums">{Math.round((customer.spendMinor / 100) * loyalty.earnPerRiyal).toLocaleString()}</span></div>
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
      </div>
    </Modal>
  )
}
