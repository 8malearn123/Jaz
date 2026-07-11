import { AlertTriangle, Flame, TrendingUp } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { AreaTrend, UtilizationGauge, TrendPill } from '@/components/charts/Charts'
import { execKpis, execChannels, execRevenueTotalMinor, factoryUtilPct, factoryLines, execTrend } from '@/data/ownerExec'
import { rawMaterials, stockUnits, unitFactor, type RawKey } from '@/data/ownerSupply'
import { platformKpis } from '@/data/staff'
import { useOwnerState } from '@/state/OwnerStateContext'
import { cn } from '@/lib/cn'
import { PanelHead, UtilBar } from './_shared'

export function OwnerExec() {
  const { t, pick, money } = useLocale()
  const { flash } = useToast()
  const { pendingOrders, lowRaw, rawQty, reorderRaw, dismissedExpiry, dismissExpiry, invoices } = useOwnerState()

  // Price-increase report — derived purely from purchase invoices: the latest
  // bought unit price of each material vs the previous one (or the recorded
  // landed cost when it's the first invoice).
  const baseUnitCost = (k: RawKey) => {
    const r = rawMaterials.find((x) => x.key === k)!
    const cu = stockUnits.find((u) => u.label.en === r.costUnit.en || u.label.ar === r.costUnit.ar)
    const su = stockUnits.find((u) => u.label.en === r.unit.en || u.label.ar === r.unit.ar)
    return r.landedMinor / Math.max(1, cu && su ? unitFactor(cu.key, su.key) : 1)
  }
  const priceRises = rawMaterials.map((r) => {
    const hist = invoices.filter((i) => i.rawKey === r.key && i.qty && i.qty > 0) // newest first
    if (hist.length === 0) return null
    const latest = hist[0]
    const latestUnit = latest.totalMinor / latest.qty!
    const prevUnit = hist.length > 1 ? hist[1].totalMinor / hist[1].qty! : baseUnitCost(r.key)
    if (prevUnit <= 0) return null
    const pct = ((latestUnit - prevUnit) / prevUnit) * 100
    if (pct < 1) return null // report only real increases
    return { raw: r, latest, latestUnit: Math.round(latestUnit), prevUnit: Math.round(prevUnit), pct: Math.round(pct * 10) / 10 }
  }).filter(Boolean) as { raw: (typeof rawMaterials)[number]; latest: (typeof invoices)[number]; latestUnit: number; prevUnit: number; pct: number }[]

  // Daily platform pulse — migrated from the former shared Overview tab (removed for the owner role).
  const k = platformKpis
  const todayKpis: { label: string; value: string; alert?: boolean }[] = [
    { label: t('ov.gmv'), value: money(k.gmvTodayMinor) },
    { label: t('ov.orders'), value: String(k.ordersToday) },
    { label: t('ov.b2bAccounts'), value: String(k.b2bAccounts) },
    { label: t('ov.pendingCredit'), value: String(k.pendingCreditApps), alert: k.pendingCreditApps > 0 },
    { label: t('ov.openTickets'), value: String(k.openTickets), alert: k.openTickets > 0 },
    { label: t('ov.zatcaPending'), value: String(k.zatcaPending), alert: k.zatcaPending > 0 },
  ]

  // Stock alerts derive from live inventory; reordering clears them. Plus batch-expiry warnings that Review acknowledges.
  const stockAlerts = lowRaw.map((key) => {
    const m = rawMaterials.find((x) => x.key === key)!
    return { key, title: { en: `${m.name.en} below reorder`, ar: `${m.name.ar} دون نقطة الطلب` }, detail: { en: `${rawQty[key].toLocaleString()} ${m.unit.en}`, ar: `${rawQty[key].toLocaleString()} ${m.unit.ar}` } }
  })
  const expiryAlerts = [
    { key: 'BATCH-MP-204', title: { en: 'Milk powder batch expiring', ar: 'دفعة الحليب المجفف قرب الانتهاء' }, detail: { en: 'BATCH-MP-204 · 6 days', ar: 'BATCH-MP-204 · ٦ أيام' } },
    { key: 'BATCH-FG-091', title: { en: 'Rose box near expiry', ar: 'بوكس الورد قرب الانتهاء' }, detail: { en: 'BATCH-FG-091 · 14 days', ar: 'BATCH-FG-091 · ١٤ يومًا' } },
  ].filter((a) => !dismissedExpiry.includes(a.key))

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Executive overview', ar: 'النظرة التنفيذية' })} subtitle={pick({ en: 'Company health this cycle · July 2026', ar: 'صحة الشركة هذه الدورة · دورة يوليو ٢٠٢٦' })} />

      {/* hero KPIs */}
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        {execKpis.map((k, i) => (
          <div key={i} className={cn('rounded-lg border p-lg flex flex-col gap-xs', k.tone === 'dark' ? 'bg-surface-dark-1 border-hairline-dark' : 'card')}>
            <span className={cn('font-sans text-caption uppercase tracking-[0.12em]', k.tone === 'dark' ? 'text-primary-bright' : 'text-ink-subtle')}>{pick(k.label)}</span>
            <div className="flex items-end justify-between gap-sm">
              <span className={cn('font-serif text-display-md tabular-nums leading-none', k.tone === 'dark' ? 'text-ink-on-dark' : 'text-ink')}>
                {k.label.en === 'Pending orders' ? pendingOrders : k.value}{k.unit && <span className={cn('font-sans text-data ms-1', k.tone === 'dark' ? 'text-primary-bright' : 'text-ink-subtle')}>{pick(k.unit)}</span>}
              </span>
              <TrendPill delta={k.delta} />
            </div>
            <span className={cn('font-sans text-caption', k.tone === 'dark' ? 'text-ink-on-dark-muted' : 'text-ink-subtle')}>{pick(k.sub)}</span>
          </div>
        ))}
      </div>

      {/* daily platform pulse (folded in from the former Overview tab) */}
      <div className="flex flex-col gap-sm">
        <h3 className="font-sans text-caption uppercase tracking-[0.14em] text-ink-subtle">{pick({ en: 'Today · platform', ar: 'اليوم · المنصة' })}</h3>
        <div className="grid gap-sm grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {todayKpis.map((kpi, i) => (
            <div key={i} className={cn('card p-md flex flex-col gap-xxs', kpi.alert && 'ring-1 ring-danger/30')}>
              <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle leading-tight">{kpi.label}</span>
              <span className={cn('font-serif text-card-title tabular-nums', kpi.alert ? 'text-danger' : 'text-ink')}>{kpi.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-lg items-start">
        {/* revenue by channel */}
        <div className="card p-lg flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Revenue by channel', ar: 'الإيراد حسب القناة' })}</h3>
          <div className="h-3 rounded-pill overflow-hidden flex">
            {execChannels.map((c, i) => <span key={i} className="h-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />)}
          </div>
          <div className="flex flex-col gap-sm">
            {execChannels.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-sm">
                <span className="inline-flex items-center gap-xs font-sans text-data text-ink"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} /> {pick(c.label)}</span>
                <span className="font-sans text-data text-ink tabular-nums">{money(c.amountMinor)} <span className="text-ink-subtle">· {c.pct}%</span></span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-sm border-t border-hairline">
            <span className="font-sans text-data text-ink-muted">{pick({ en: 'Total', ar: 'الإجمالي' })}</span>
            <span className="font-serif text-card-title text-ink tabular-nums">{money(execRevenueTotalMinor)}</span>
          </div>
        </div>

        {/* factory capacity */}
        <div className="card p-lg flex flex-col gap-md items-center">
          <h3 className="font-serif text-card-title text-ink self-start">{pick({ en: 'Factory capacity', ar: 'طاقة المصنع' })}</h3>
          <UtilizationGauge segments={[{ value: factoryUtilPct, color: '#b08a57' }, { value: 100 - factoryUtilPct, color: '#e6dfd3' }]} centerValue={`${factoryUtilPct}%`} centerLabel={pick({ en: 'utilized', ar: 'مستغَل' })} />
          <div className="w-full flex flex-col gap-sm">
            {factoryLines.map((l, i) => (
              <div key={i} className="flex flex-col gap-xxs">
                <div className="flex items-center justify-between font-sans text-caption"><span className="text-ink-muted">{pick(l.label)}</span><span className="text-ink tabular-nums">{l.pct}%</span></div>
                <UtilBar pct={l.pct} color={l.pct === 0 ? '#d2c7b4' : l.pct >= 85 ? '#355c4b' : '#b08a57'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-lg items-start">
        {/* critical alerts */}
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-xs">
            <AlertTriangle size={16} className="text-danger" />
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Critical alerts', ar: 'تنبيهات حرجة' })}</h3>
          </div>
          <ul className="divide-y divide-hairline">
            {stockAlerts.map((a) => (
              <li key={a.key} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-8 h-8 rounded-pill shrink-0 bg-danger/10 text-danger"><Flame size={15} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(a.title)}</p>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{pick(a.detail)}</p>
                </div>
                <button onClick={() => { reorderRaw(a.key); flash(`${pick({ en: 'Reordered', ar: 'أُعيد الطلب' })} · ${pick(a.title)}`) }} className="rounded-md px-3 py-1.5 font-sans text-caption bg-danger/10 text-danger hover:bg-danger/15 transition-colors">{pick({ en: 'Reorder', ar: 'أعد الطلب' })}</button>
              </li>
            ))}
            {expiryAlerts.map((a) => (
              <li key={a.key} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-8 h-8 rounded-pill shrink-0 bg-primary/10 text-primary-hover"><Flame size={15} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{pick(a.title)}</p>
                  <p className="font-sans text-caption text-ink-subtle">{pick(a.detail)}</p>
                </div>
                <button onClick={() => { dismissExpiry(a.key); flash(`${pick({ en: 'Reviewed', ar: 'تمت المراجعة' })} · ${pick(a.title)}`) }} className="rounded-md px-3 py-1.5 font-sans text-caption bg-primary/10 text-primary-hover hover:bg-primary/15 transition-colors">{pick({ en: 'Review', ar: 'مراجعة' })}</button>
              </li>
            ))}
            {stockAlerts.length === 0 && expiryAlerts.length === 0 && (
              <li className="px-lg py-md font-sans text-caption text-success">{pick({ en: '✓ No critical alerts — all materials above reorder, no expiries', ar: '✓ لا تنبيهات حرجة — كل المواد فوق نقطة الطلب ولا انتهاءات' })}</li>
            )}
          </ul>
        </div>

        {/* revenue trend */}
        <div className="card p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Revenue trend', ar: 'اتجاه الإيراد' })}</h3>
            <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Target', ar: 'المستهدف' })} {money(execTrend[execTrend.length - 1].amountMinor)}</span>
          </div>
          <AreaTrend points={execTrend.map((p) => p.amountMinor)} labels={execTrend.map((p) => pick(p.month))} format={(v) => money(v)} />
        </div>
      </div>

      {/* purchase price increases — straight from purchase invoices */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-xs">
          <TrendingUp size={16} className="text-danger" />
          <div>
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Purchase price increases', ar: 'تقرير ارتفاع أسعار المواد' })}</h3>
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Latest bought unit price vs the previous one — from purchase invoices', ar: 'آخر سعر شراء للوحدة مقابل السعر السابق — مبني على فواتير المشتريات' })}</p>
          </div>
        </div>
        <ul className="divide-y divide-hairline">
          {priceRises.map((row) => (
            <li key={row.raw.key} className="flex flex-wrap items-center gap-md px-lg py-md">
              <div className="flex-1 min-w-[180px]">
                <p className="font-sans text-data text-ink truncate">{pick(row.raw.name)}</p>
                <p className="font-sans text-caption text-ink-subtle truncate">{pick(row.latest.supplier)} · {row.latest.id} · {pick(row.latest.date)}</p>
              </div>
              <div className="text-end">
                <p className="font-sans text-data text-ink tabular-nums">
                  <span className="text-ink-subtle line-through me-1">{money(row.prevUnit)}</span>
                  {money(row.latestUnit)} <span className="text-ink-subtle">/ {pick(row.raw.unit)}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-xxs rounded-pill px-2.5 py-1 font-sans text-caption font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>
                <TrendingUp size={12} /> +{row.pct}%
              </span>
            </li>
          ))}
          {priceRises.length === 0 && (
            <li className="px-lg py-md font-sans text-caption text-success">{pick({ en: '✓ No purchase price increases in the recorded invoices', ar: '✓ لا ارتفاعات في أسعار الشراء ضمن الفواتير المسجلة' })}</li>
          )}
        </ul>
      </div>
    </div>
  )
}
