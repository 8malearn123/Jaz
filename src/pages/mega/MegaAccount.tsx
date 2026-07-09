import { useState, useEffect } from 'react'
import {
  LayoutGrid, Boxes, Package, Ship, Landmark, Plus, Minus, ArrowRight, Check, X,
  MapPin, Download, ShieldCheck, Snowflake, PackageCheck, Truck, Globe, FileText, Container, Clock,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { ToastProvider, useToast } from '@/components/account/Toast'
import { MegaStateProvider, useMegaState } from '@/state/MegaStateContext'
import { AreaTrend, UtilizationGauge } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'
import {
  megaAccount, megaCatalog, megaVolumeTiers, volumeDiscount, trucksFor,
  shipFlow, SHIP_LAST, CANCEL_WINDOW_MS, megaCredit, megaStatements, megaInvoices, megaCompliance,
  megaMarkets, megaExportTrend, type MegaOrder, type ShipStage,
} from '@/data/mega'

const TABS = ['overview', 'catalog', 'orders', 'shipments', 'finance'] as const
type Tab = (typeof TABS)[number]

/** Fixed fulfilment notice: all MEGA orders are picked up at the site — no branch delivery. */
function PickupNotice() {
  const { pick } = useLocale()
  return (
    <div className="rounded-md border border-hairline bg-surface-2 px-md py-sm font-sans text-caption text-ink-muted inline-flex items-start gap-xs">
      <MapPin size={13} className="shrink-0 mt-0.5" />
      <span>{pick({ en: 'Receiving: pickup from the site — Jaz plant, Jazan (EXW). No branch delivery.', ar: 'الاستلام: من الموقع — مصنع جاز، جيزان (EXW). لا يوجد تسليم للفرع.' })}</span>
    </div>
  )
}

export function MegaAccount() {
  return (
    <MegaStateProvider>
      <ToastProvider>
        <MegaContent />
      </ToastProvider>
    </MegaStateProvider>
  )
}

function MegaContent() {
  const { pick } = useLocale()
  const [activeRaw, setActive] = useTab('overview')
  const active = (TABS.includes(activeRaw as Tab) ? activeRaw : 'overview') as Tab
  const { openShipments } = useMegaState()

  const tabs: TabDef[] = [
    { id: 'overview', label: pick({ en: 'Overview', ar: 'نظرة عامة' }), icon: LayoutGrid },
    { id: 'catalog', label: pick({ en: 'Pallet catalog', ar: 'كتالوج الطبليات' }), icon: Boxes },
    { id: 'orders', label: pick({ en: 'Orders', ar: 'الطلبات' }), icon: Package },
    { id: 'shipments', label: pick({ en: 'Shipments', ar: 'الشحنات' }), icon: Ship },
    { id: 'finance', label: pick({ en: 'Finance', ar: 'المالية' }), icon: Landmark },
  ]

  return (
    <AccountShell
      eyebrow={pick({ en: 'Mega Business · Export', ar: 'الأعمال الكبرى · التصدير' })}
      title={pick(megaAccount.legalName)}
      subtitle={`${pick(megaAccount.market)} · ${megaAccount.incoterm}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
      headerExtra={
        <span className="hidden sm:inline-flex items-center gap-xs rounded-pill bg-primary-bright/15 text-primary-bright px-3 py-1.5 font-sans text-caption">
          <Ship size={14} /> {openShipments} {pick({ en: 'shipments in progress', ar: 'شحنة قيد التنفيذ' })}
        </span>
      }
    >
      {active === 'overview' && <Overview onTab={setActive} />}
      {active === 'catalog' && <Catalog onTab={setActive} />}
      {active === 'orders' && <Orders />}
      {active === 'shipments' && <Shipments />}
      {active === 'finance' && <Finance />}
    </AccountShell>
  )
}

/* ═══════════ Overview — export command center ═══════════ */
function Overview({ onTab }: { onTab: (id: string) => void }) {
  const { pick, money } = useLocale()
  const { openShipments, palletsInTransit, availableMinor, cycleValueMinor, orders } = useMegaState()
  const trendTotal = megaExportTrend[megaExportTrend.length - 1].amountMinor
  const active = orders.find((o) => !o.cancelled && o.stage < SHIP_LAST) ?? null

  return (
    <div className="flex flex-col gap-lg">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard tone="dark" label={pick({ en: 'Open shipments', ar: 'شحنات مفتوحة' })} value={String(openShipments)} sub={pick({ en: 'Cold-chain', ar: 'سلسلة تبريد' })} />
        <StatCard label={pick({ en: 'Pallets in transit', ar: 'طبليات قيد النقل' })} value={String(palletsInTransit)} sub={pick({ en: `${trucksFor(palletsInTransit * 1.3)} reefer trucks`, ar: `${trucksFor(palletsInTransit * 1.3)} شاحنة مبرّدة` })} />
        <StatCard tone="green" label={pick({ en: 'Credit available', ar: 'الائتمان المتاح' })} value={money(availableMinor, { withSymbol: false })} unit={pick({ en: '﷼', ar: '﷼' })} sub={pick(megaCredit.terms)} />
        <StatCard tone="gold" label={pick({ en: 'Export this cycle', ar: 'تصدير هذه الدورة' })} value={money(cycleValueMinor, { withSymbol: false })} unit={pick({ en: '﷼', ar: '﷼' })} sub={pick({ en: 'All markets', ar: 'كل الأسواق' })} />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-lg items-start">
        <div className="flex flex-col gap-lg min-w-0">
          {/* markets */}
          <div className="card p-lg flex flex-col gap-md">
            <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><Globe size={17} className="text-primary-hover" /> {pick({ en: 'Export by market', ar: 'التصدير حسب السوق' })}</h3>
            <div className="h-3 rounded-pill overflow-hidden flex">
              {megaMarkets.map((m, i) => <span key={i} className="h-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />)}
            </div>
            <div className="flex flex-col gap-sm">
              {megaMarkets.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-sm">
                  <span className="inline-flex items-center gap-xs font-sans text-data text-ink"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: m.color }} /> {pick(m.label)}</span>
                  <span className="font-sans text-data text-ink tabular-nums">{money(m.valueMinor)} <span className="text-ink-subtle">· {m.pct}%</span></span>
                </div>
              ))}
            </div>
          </div>
          {/* trend */}
          <div className="card p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Export value trend', ar: 'اتجاه قيمة التصدير' })}</h3>
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Latest', ar: 'الأحدث' })} {money(trendTotal)}</span>
            </div>
            <AreaTrend points={megaExportTrend.map((p) => p.amountMinor)} labels={megaExportTrend.map((p) => pick(p.month))} format={(v) => money(v)} />
          </div>
          {/* active shipment */}
          {active && <ActiveShipmentCard order={active} onTab={onTab} />}
        </div>

        {/* right rail */}
        <div className="lg:sticky lg:top-28 flex flex-col gap-md">
          <DraftCard onTab={onTab} />
          <ComplianceSnapshot />
        </div>
      </div>
    </div>
  )
}

function ActiveShipmentCard({ order, onTab }: { order: MegaOrder; onTab: (id: string) => void }) {
  const { pick, money } = useLocale()
  const { advanceShipment } = useMegaState()
  const { flash } = useToast()
  return (
    <div className="card p-lg flex flex-col gap-sm">
      <div className="flex items-center justify-between gap-sm">
        <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{pick({ en: 'Active shipment', ar: 'الشحنة النشطة' })}</p>
        <StatusBadge variant="gold">{pick(shipFlow[order.stage].label)}</StatusBadge>
      </div>
      <p className="font-sans text-data text-ink tabular-nums">{order.id} · {order.pallets} {pick({ en: 'pallets', ar: 'طبلية' })}</p>
      <p className="font-sans text-caption text-ink-subtle inline-flex items-center gap-xxs"><MapPin size={12} /> {pick(order.destination)} · {money(order.valueMinor)}</p>
      <ShipTimeline stage={order.stage} compact />
      <div className="flex items-center gap-sm mt-xs">
        {order.stage < SHIP_LAST
          ? <button onClick={() => { advanceShipment(order.id); flash(`${order.id} → ${pick(shipFlow[order.stage + 1].label)}`) }} className={buttonClass('primary', 'sm')}><ArrowRight size={14} className="rtl:rotate-180" /> {pick({ en: 'Advance', ar: 'تقديم' })}</button>
          : <span className="font-sans text-caption text-success">{pick({ en: 'Delivered', ar: 'تم التسليم' })} ✓</span>}
        <button onClick={() => onTab('shipments')} className="link-gold text-caption">{pick({ en: 'All shipments', ar: 'كل الشحنات' })}</button>
      </div>
    </div>
  )
}

function DraftCard({ onTab }: { onTab: (id: string) => void }) {
  const { pick, money } = useLocale()
  const { draft, draftPallets, draftCbm, draftValueMinor, placeOrder, clearDraft } = useMegaState()
  const { flash } = useToast()
  const lines = Object.entries(draft)

  return (
    <div className="card p-lg flex flex-col gap-md">
      <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><Boxes size={17} className="text-primary-hover" /> {pick({ en: 'Order draft', ar: 'مسودّة الطلب' })}</h3>
      {lines.length === 0 ? (
        <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No pallets yet — add from the catalog.', ar: 'لا طبليات بعد — أضف من الكتالوج.' })}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-xs">
            {lines.map(([sku, n]) => {
              const p = megaCatalog.find((x) => x.sku === sku)!
              return (
                <li key={sku} className="flex items-center justify-between gap-sm font-sans text-caption">
                  <span className="text-ink truncate">{pick(p.name)}</span>
                  <span className="text-ink-subtle tabular-nums shrink-0">{n}× · {money(p.pricePerPalletMinor * n, { withSymbol: false })}</span>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between pt-sm border-t border-hairline font-sans text-caption text-ink-muted">
            <span>{draftPallets} {pick({ en: 'pallets', ar: 'طبلية' })} · {draftCbm.toFixed(1)} m³ · {trucksFor(draftCbm)} {pick({ en: 'trucks', ar: 'شاحنة' })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-sans text-data text-ink-muted">{pick({ en: 'Total', ar: 'الإجمالي' })}</span>
            <span className="font-serif text-card-title text-ink tabular-nums">{money(draftValueMinor)}</span>
          </div>
          <PickupNotice />
          <div className="flex items-center gap-sm">
            <button onClick={() => { const id = placeOrder(); if (id) { flash(`${pick({ en: 'Export order placed', ar: 'تم تقديم طلب التصدير' })} · ${id}`); onTab('orders') } }} className={buttonClass('primary', 'sm', 'flex-1')}>{pick({ en: 'Place export order', ar: 'تقديم طلب تصدير' })}</button>
            <button onClick={clearDraft} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Clear', ar: 'مسح' })}</button>
          </div>
        </>
      )}
    </div>
  )
}

function ComplianceSnapshot() {
  const { pick } = useLocale()
  return (
    <div className="card p-lg flex flex-col gap-sm">
      <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs"><ShieldCheck size={17} className="text-primary-hover" /> {pick({ en: 'Export compliance', ar: 'امتثال التصدير' })}</h3>
      <ul className="flex flex-col gap-xs">
        {megaCompliance.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-sm">
            <span className="font-sans text-caption text-ink-muted">{pick(c.label)}</span>
            <span className={cn('inline-flex items-center gap-xxs font-sans text-caption', c.ok ? 'text-success' : 'text-primary-hover')}>{c.ok ? <Check size={12} /> : '•'} {pick(c.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ═══════════ Catalog — pallet catalog + volume pricing ═══════════ */
function Catalog({ onTab }: { onTab: (id: string) => void }) {
  const { pick, money } = useLocale()
  const { draft, addPallets, setDraftPallets, lineValueMinor, draftPallets, draftValueMinor } = useMegaState()
  const { flash } = useToast()
  const [reviewOpen, setReviewOpen] = useState(false)
  const categories = [...new Set(megaCatalog.map((p) => pick(p.category)))]

  return (
    <div className="flex flex-col gap-lg">
      {/* volume ladder */}
      <div className="card p-lg flex flex-col gap-sm">
        <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Volume pricing', ar: 'تسعير الكمية' })}</h3>
        <div className="grid grid-cols-3 gap-sm">
          {megaVolumeTiers.map((t, i) => (
            <div key={i} className={cn('rounded-lg border p-md text-center', t.discount > 0 ? 'border-success/30 bg-success/8' : 'border-hairline')}>
              <p className="font-sans text-caption text-ink-subtle">{pick(t.range)}</p>
              <p className="font-serif text-card-title tabular-nums" style={{ color: t.discount > 0 ? '#355c4b' : '#241712' }}>{t.discount > 0 ? `−${t.discount}%` : pick({ en: 'List', ar: 'قائمة' })}</p>
            </div>
          ))}
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-sm">
          <h3 className="font-serif text-card-title text-ink">{cat}</h3>
          <div className="grid md:grid-cols-2 gap-sm">
            {megaCatalog.filter((p) => pick(p.category) === cat).map((p) => {
              const n = draft[p.sku] ?? 0
              const disc = volumeDiscount(Math.max(n, 1))
              return (
                <div key={p.sku} className="card p-lg flex flex-col gap-md">
                  <div className="flex items-start gap-sm">
                    <span className="w-11 h-11 rounded-md shrink-0" style={{ backgroundColor: p.color, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.13) 0 2px, transparent 2px 9px)' }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-data text-ink truncate">{pick(p.name)}</p>
                      <p className="font-sans text-caption text-ink-subtle tabular-nums">{p.sku} · {pick({ en: 'MOQ', ar: 'حد أدنى' })} {p.moq}</p>
                    </div>
                    <span className="font-sans text-data text-ink tabular-nums">{money(p.pricePerPalletMinor)}<span className="text-ink-subtle text-caption">/{pick({ en: 'pallet', ar: 'طبلية' })}</span></span>
                  </div>
                  <div className="grid grid-cols-4 gap-xs pt-sm border-t border-hairline">
                    {([[{ en: 'CBM', ar: 'م³' }, `${p.cbm}`], [{ en: 'Gross', ar: 'وزن' }, `${p.grossKg}kg`], [{ en: 'Units', ar: 'وحدات' }, p.unitsPerPallet.toLocaleString()], [{ en: 'Per truck', ar: 'لكل شاحنة' }, String(Math.floor(76 / p.cbm))]] as const).map(([l, v], i) => (
                      <div key={i} className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(l)}</span><span className="font-sans text-caption text-ink tabular-nums">{v}</span></div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-sm">
                    <div className="inline-flex items-center bg-surface-2 border border-hairline-strong rounded-md overflow-hidden">
                      <button onClick={() => addPallets(p.sku, -1)} className="grid place-items-center w-9 h-9 text-primary-hover hover:bg-hairline/50" aria-label="−"><Minus size={15} /></button>
                      <span className="w-12 text-center font-sans font-semibold tabular-nums">{n}</span>
                      <button onClick={() => addPallets(p.sku, 1)} className="grid place-items-center w-9 h-9 text-primary-hover hover:bg-hairline/50" aria-label="+"><Plus size={15} /></button>
                    </div>
                    {n > 0
                      ? <span className="font-sans text-data tabular-nums text-ink">{money(lineValueMinor(p.sku, n))}{disc > 0 && <span className="text-success text-caption"> · −{disc}%</span>}</span>
                      : <button onClick={() => { setDraftPallets(p.sku, p.moq); flash(`${p.moq}× ${pick(p.name)} ${pick({ en: 'added', ar: 'أُضيف' })}`) }} className={buttonClass('secondary', 'sm')}><Plus size={14} /> {pick({ en: 'Add MOQ', ar: 'أضف الحد الأدنى' })}</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* sticky draft bar */}
      {draftPallets > 0 && (
        <div className="sticky bottom-4 card p-md flex items-center justify-between gap-md shadow-soft-lg">
          <span className="font-sans text-data text-ink-muted">{draftPallets} {pick({ en: 'pallets', ar: 'طبلية' })} · <span className="font-serif text-card-title text-ink tabular-nums">{money(draftValueMinor)}</span></span>
          <button onClick={() => setReviewOpen(true)} className={buttonClass('primary', 'sm')}>{pick({ en: 'Review order', ar: 'مراجعة الطلب' })} <ArrowRight size={14} className="rtl:rotate-180" /></button>
        </div>
      )}

      <ReviewOrderModal open={reviewOpen} onClose={() => setReviewOpen(false)} onTab={onTab} />
    </div>
  )
}

/* Review-and-place popup — opened from the catalog draft bar so the buyer never
   has to leave to find the draft. */
function ReviewOrderModal({ open, onClose, onTab }: { open: boolean; onClose: () => void; onTab: (id: string) => void }) {
  const { pick, money } = useLocale()
  const { draft, draftPallets, draftCbm, draftValueMinor, lineValueMinor, placeOrder } = useMegaState()
  const { flash } = useToast()
  const lines = Object.entries(draft)
  const place = () => {
    const id = placeOrder()
    if (id) { flash(`${pick({ en: 'Export order placed', ar: 'تم تقديم طلب التصدير' })} · ${id}`); onClose(); onTab('orders') }
  }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={pick({ en: 'Mega Business · Export', ar: 'الأعمال الكبرى · التصدير' })} title={pick({ en: 'Review order', ar: 'مراجعة الطلب' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Keep editing', ar: 'متابعة التعديل' })}</button>
        <button onClick={place} disabled={lines.length === 0} className={buttonClass('primary', 'sm')}>{pick({ en: 'Place export order', ar: 'تقديم طلب التصدير' })}</button>
      </>}>
      {lines.length === 0 ? (
        <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No pallets in the draft.', ar: 'لا طبليات في المسودّة.' })}</p>
      ) : (
        <div className="flex flex-col gap-md">
          <ul className="rounded-lg border border-hairline overflow-hidden divide-y divide-hairline">
            {lines.map(([sku, n]) => {
              const p = megaCatalog.find((x) => x.sku === sku)!
              const disc = volumeDiscount(n)
              return (
                <li key={sku} className="flex items-center gap-md px-md py-2.5">
                  <span className="w-8 h-8 rounded-md shrink-0" style={{ backgroundColor: p.color, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.13) 0 2px, transparent 2px 9px)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-data text-ink truncate">{pick(p.name)}</p>
                    <p className="font-sans text-caption text-ink-subtle tabular-nums">{n} × {money(p.pricePerPalletMinor, { withSymbol: false })}{disc > 0 && <span className="text-success"> · −{disc}%</span>}</p>
                  </div>
                  <span className="font-sans text-data text-ink tabular-nums shrink-0">{money(lineValueMinor(sku, n))}</span>
                </li>
              )
            })}
          </ul>
          <div className="grid grid-cols-3 gap-sm">
            <Detail label={pick({ en: 'Pallets', ar: 'طبليات' })} value={String(draftPallets)} />
            <Detail label={pick({ en: 'Volume', ar: 'الحجم' })} value={`${draftCbm.toFixed(1)} m³`} />
            <Detail label={pick({ en: 'Reefer trucks', ar: 'شاحنات مبرّدة' })} value={String(trucksFor(draftCbm))} />
          </div>
          <PickupNotice />
          <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline px-md py-sm">
            <span className="font-sans text-data text-ink-muted">{pick({ en: 'Order total', ar: 'إجمالي الطلب' })} · {pick(megaCredit.terms)}</span>
            <span className="font-serif text-headline text-ink tabular-nums">{money(draftValueMinor)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ═══════════ Orders — commercial ledger ═══════════ */
function Orders() {
  const { pick, money } = useLocale()
  const { orders } = useMegaState()
  const [track, setTrack] = useState<string | null>(null)
  const tracked = orders.find((o) => o.id === track) ?? null

  return (
    <div className="flex flex-col gap-lg">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[680px]">
            <thead><tr className="bg-surface-2 border-b border-hairline">
              {[{ en: 'Order', ar: 'الطلب' }, { en: 'Pallets', ar: 'طبليات' }, { en: 'Receiving', ar: 'الاستلام' }, { en: 'Incoterm', ar: 'الشروط' }, { en: 'Value', ar: 'القيمة' }, { en: 'Status', ar: 'الحالة' }].map((h, i) => (
                <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', i > 0 && i < 4 ? 'text-center' : i >= 4 ? 'text-end' : 'text-start')}>{pick(h)}</th>
              ))}
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={cn('border-b border-hairline last:border-0 hover:bg-surface-2/50 cursor-pointer', o.cancelled && 'opacity-60')} onClick={() => setTrack(o.id)}>
                  <td className="px-lg py-md"><p className="font-sans text-data text-ink tabular-nums">{o.id}</p><p className="font-sans text-caption text-ink-subtle truncate max-w-[220px]">{pick(o.items)} · {pick(o.placedAt)}</p></td>
                  <td className="px-lg py-md text-center font-sans text-data text-ink tabular-nums">{o.pallets}</td>
                  <td className="px-lg py-md text-center font-sans text-caption text-ink-muted">{pick(o.destination)}</td>
                  <td className="px-lg py-md text-center"><StatusBadge variant="neutral">{o.incoterm}</StatusBadge></td>
                  <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums">{money(o.valueMinor)}</td>
                  <td className="px-lg py-md text-end">{o.cancelled ? <StatusBadge variant="danger">{pick({ en: 'Cancelled', ar: 'ملغى' })}</StatusBadge> : <StatusBadge variant={o.stage >= SHIP_LAST ? 'success' : 'gold'}>{pick(shipFlow[o.stage].label)}</StatusBadge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline font-sans text-caption text-ink-subtle">{orders.length} {pick({ en: 'export orders · tap a row to track', ar: 'طلب تصدير · اضغط صفًّا للتتبّع' })}</div>
      </div>
      {tracked && <TrackModal order={tracked} onClose={() => setTrack(null)} />}
    </div>
  )
}

/* ═══════════ Shipments — cold-chain ops board ═══════════ */
function Shipments() {
  const { pick, money } = useLocale()
  const { orders, advanceShipment } = useMegaState()
  const { flash } = useToast()

  return (
    <div className="flex flex-col gap-md">
      {orders.map((o) => (
        <div key={o.id} className={cn('card p-lg flex flex-col gap-md', o.cancelled && 'opacity-60')}>
          <div className="flex flex-wrap items-center gap-md">
            <span className="grid place-items-center w-10 h-10 rounded-md bg-surface-2 border border-hairline text-primary-hover shrink-0"><Ship size={18} /></span>
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-sm"><span className="font-sans text-data text-ink tabular-nums">{o.id}</span>{o.cancelled ? <StatusBadge variant="danger">{pick({ en: 'Cancelled', ar: 'ملغى' })}</StatusBadge> : <StatusBadge variant={o.stage >= SHIP_LAST ? 'success' : 'gold'}>{pick(shipFlow[o.stage].label)}</StatusBadge>}</div>
              <p className="font-sans text-caption text-ink-subtle inline-flex items-center gap-xxs"><MapPin size={11} /> {pick(o.destination)} · {o.pallets} {pick({ en: 'pallets', ar: 'طبلية' })} · {o.incoterm}</p>
            </div>
            <span className="font-sans text-data text-ink tabular-nums">{money(o.valueMinor)}</span>
            {o.cancelled
              ? <span className="font-sans text-caption text-danger whitespace-nowrap">{pick({ en: 'Cancelled', ar: 'ملغى' })}</span>
              : o.stage < SHIP_LAST
                ? <button onClick={() => { advanceShipment(o.id); flash(`${o.id} → ${pick(shipFlow[o.stage + 1].label)}`) }} className={buttonClass('primary', 'sm')}><ArrowRight size={14} className="rtl:rotate-180" /> {pick(shipFlow[o.stage + 1].label)}</button>
                : <span className="font-sans text-caption text-success whitespace-nowrap">{pick({ en: 'Delivered', ar: 'سُلّم' })} ✓</span>}
          </div>
          {!o.cancelled && <ShipTimeline stage={o.stage} />}
        </div>
      ))}
    </div>
  )
}

/* ═══════════ Finance — credit, statements, invoices, compliance ═══════════ */
function Finance() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { availableMinor, reserveMinor } = useMegaState()
  const utilPct = Math.round(((megaCredit.outstandingMinor + reserveMinor) / megaCredit.limitMinor) * 100)

  const downloadStatement = (id: string) => {
    const s = megaStatements.find((x) => x.id === id)!
    const doc = { period: s.period.en, closing_minor: s.closingMinor, currency: 'SAR', account: megaAccount.legalName.en }
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `mega-statement-${s.id}.json`; a.click(); URL.revokeObjectURL(url)
    flash(pick({ en: 'Statement downloaded', ar: 'نُزّل كشف الحساب' }))
  }

  return (
    <div className="flex flex-col gap-lg">
      {/* credit */}
      <div className="grid lg:grid-cols-[auto_1fr] gap-lg items-center card p-lg">
        <div className="grid place-items-center">
          <UtilizationGauge
            segments={[
              { value: megaCredit.outstandingMinor, color: '#b5403b' },
              { value: reserveMinor, color: '#b08a57' },
              { value: availableMinor, color: '#355c4b' },
            ]}
            centerValue={`${utilPct}%`}
            centerLabel={pick({ en: 'utilised', ar: 'مستغَل' })}
          />
        </div>
        <div className="flex flex-col gap-md">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
            <Legend color="#355c4b" label={pick({ en: 'Available', ar: 'المتاح' })} value={money(availableMinor)} />
            <Legend color="#b08a57" label={pick({ en: 'Reserved', ar: 'محجوز' })} value={money(reserveMinor)} />
            <Legend color="#b5403b" label={pick({ en: 'Outstanding', ar: 'المستحق' })} value={money(megaCredit.outstandingMinor)} />
            <Legend label={pick({ en: 'Limit', ar: 'الحد' })} value={money(megaCredit.limitMinor)} />
          </div>
          <div className="flex flex-wrap items-center gap-md pt-sm border-t border-hairline font-sans text-caption text-ink-muted">
            <span className="inline-flex items-center gap-xs"><FileText size={14} className="text-ink-subtle" /> {pick({ en: 'Terms', ar: 'الشروط' })}: <strong className="text-ink">{pick(megaCredit.terms)}</strong></span>
            <span className="inline-flex items-center gap-xs"><Container size={14} className="text-ink-subtle" /> {pick({ en: 'Next review', ar: 'المراجعة القادمة' })}: <strong className="text-ink">{new Date(megaCredit.nextReview).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-lg items-start">
        {/* statements */}
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Statements', ar: 'كشوف الحساب' })}</h3></div>
          <ul className="divide-y divide-hairline">
            {megaStatements.map((s) => (
              <li key={s.id} className="px-lg py-md flex items-center justify-between gap-md">
                <div className="flex flex-col gap-xxs min-w-0"><span className="font-serif text-body text-ink">{pick(s.period)}</span><span className="font-sans text-caption text-ink-subtle tabular-nums">{pick({ en: 'Closing', ar: 'الختامي' })} {money(s.closingMinor)}</span></div>
                <button onClick={() => downloadStatement(s.id)} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> JSON</button>
              </li>
            ))}
          </ul>
        </div>
        {/* invoices */}
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center justify-between"><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Export invoices', ar: 'فواتير التصدير' })}</h3><StatusBadge variant="success">ZATCA</StatusBadge></div>
          <ul className="divide-y divide-hairline">
            {megaInvoices.map((iv) => (
              <li key={iv.id} className="flex items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-9 h-9 rounded-md bg-ink text-ink-on-dark shrink-0"><FileText size={16} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm"><span className="font-sans text-data text-ink tabular-nums">{iv.id}</span><StatusBadge variant={iv.paid ? 'success' : 'gold'}>{iv.paid ? pick({ en: 'Paid', ar: 'مسدّدة' }) : pick(megaCredit.terms)}</StatusBadge></div>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{pick(iv.date)} · {money(iv.amountMinor)}</p>
                </div>
                <button onClick={() => flash(`${pick({ en: 'Downloading', ar: 'جارٍ التنزيل' })} ${iv.id}`)} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> PDF</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* compliance */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-xs"><ShieldCheck size={17} className="text-success" /><h3 className="font-serif text-card-title text-ink">{pick({ en: 'Export compliance', ar: 'امتثال التصدير' })}</h3></div>
        <ul className="divide-y divide-hairline">
          {megaCompliance.map((c, i) => (
            <li key={i} className="flex items-center gap-md px-lg py-md">
              <span className={cn('grid place-items-center w-9 h-9 rounded-pill shrink-0', c.ok ? 'bg-success/12 text-success' : 'bg-primary/12 text-primary-hover')}>{c.ok ? <Check size={16} /> : <FileText size={15} />}</span>
              <div className="flex-1 min-w-0"><p className="font-sans text-data text-ink">{pick(c.label)}</p><p className="font-sans text-caption text-ink-subtle">{pick(c.value)}</p></div>
              <StatusBadge variant={c.ok ? 'success' : 'gold'}>{c.ok ? pick({ en: 'Valid', ar: 'سارية' }) : pick({ en: 'Renewing', ar: 'قيد التجديد' })}</StatusBadge>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ═══════════ shared pieces ═══════════ */
function ShipTimeline({ stage, compact }: { stage: ShipStage; compact?: boolean }) {
  const { pick } = useLocale()
  const icons = [PackageCheck, Snowflake, ShieldCheck, Truck, Check]
  return (
    <div className="flex items-center">
      {shipFlow.map((s, i) => {
        const done = i < stage, cur = i === stage
        const Icon = icons[i]
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <span className={cn('grid place-items-center rounded-pill border-2 shrink-0', compact ? 'w-7 h-7' : 'w-9 h-9', done ? 'bg-success/15 border-success text-success' : cur ? 'bg-primary/10 border-primary text-primary-hover' : 'bg-surface-2 border-hairline-strong text-ink-subtle')} title={pick(s.label)}>
              {done ? <Check size={compact ? 12 : 15} /> : <Icon size={compact ? 12 : 15} />}
            </span>
            {i < shipFlow.length - 1 && <span className={cn('h-0.5 flex-1 mx-1 rounded-pill', i < stage ? 'bg-success/50' : 'bg-hairline')} />}
          </div>
        )
      })}
    </div>
  )
}

function TrackModal({ order, onClose }: { order: MegaOrder; onClose: () => void }) {
  const { pick, money } = useLocale()
  const { cancelOrder } = useMegaState()
  const { flash } = useToast()
  const [now, setNow] = useState(() => Date.now())

  const remaining = order.placedTs != null ? order.placedTs + CANCEL_WINDOW_MS - now : -1
  const withinWindow = remaining > 0
  const canCancel = !order.cancelled && order.stage < SHIP_LAST && withinWindow
  // Tick the countdown while the window is open so the buyer sees time running out.
  useEffect(() => {
    if (!canCancel) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [canCancel])

  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0')
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')

  const doCancel = () => { cancelOrder(order.id); flash(`${pick({ en: 'Order cancelled', ar: 'أُلغي الطلب' })} · ${order.id}`); onClose() }

  return (
    <Modal open onClose={onClose} size="md" eyebrow={order.id} title={pick({ en: 'Shipment tracking', ar: 'تتبّع الشحنة' })}
      footer={<div className="flex items-center justify-between w-full gap-md">
        <div className="min-w-0">
          {order.cancelled ? (
            <span className="inline-flex items-center gap-xs font-sans text-caption text-danger"><X size={14} /> {pick({ en: 'Order cancelled', ar: 'الطلب ملغى' })}</span>
          ) : canCancel ? (
            <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle tabular-nums"><Clock size={13} /> {pick({ en: 'Cancel window', ar: 'نافذة الإلغاء' })} {mm}:{ss}</span>
          ) : order.stage < SHIP_LAST ? (
            <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Cancellation window closed', ar: 'انتهت نافذة الإلغاء' })}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-sm shrink-0">
          {canCancel && <button onClick={doCancel} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={15} /> {pick({ en: 'Cancel order', ar: 'إلغاء الطلب' })}</button>}
          <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>
        </div>
      </div>}>
      <div className="flex flex-col gap-lg">
        <div className="grid grid-cols-3 gap-md">
          <Detail label={pick({ en: 'Destination', ar: 'الوجهة' })} value={pick(order.destination)} />
          <Detail label={pick({ en: 'Pallets', ar: 'طبليات' })} value={String(order.pallets)} />
          <Detail label={pick({ en: 'Value', ar: 'القيمة' })} value={money(order.valueMinor)} />
        </div>
        {order.cancelled ? (
          <div className="rounded-lg bg-danger/8 border border-danger/25 px-md py-sm font-sans text-caption text-danger inline-flex items-center gap-xs"><X size={14} /> {pick({ en: 'This order was cancelled and will not ship.', ar: 'أُلغي هذا الطلب ولن يُشحن.' })}</div>
        ) : (
          <>
            <ShipTimeline stage={order.stage} />
            <ul className="flex flex-col gap-xs">
              {shipFlow.map((s, i) => (
                <li key={s.key} className={cn('flex items-center gap-sm font-sans text-caption', i <= order.stage ? 'text-ink' : 'text-ink-subtle')}>
                  <span className={cn('w-1.5 h-1.5 rounded-pill', i < order.stage ? 'bg-success' : i === order.stage ? 'bg-primary' : 'bg-hairline-strong')} />
                  {pick(s.label)}{i === order.stage && <span className="text-primary-hover">· {pick({ en: 'current', ar: 'الحالية' })}</span>}
                </li>
              ))}
            </ul>
            {canCancel && <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'You can cancel this order free of charge within 30 minutes of placing it, before it ships.', ar: 'يمكنك إلغاء هذا الطلب مجانًا خلال ٣٠ دقيقة من تقديمه وقبل شحنه.' })}</p>}
          </>
        )}
      </div>
    </Modal>
  )
}

function StatCard({ label, value, unit, sub, tone = 'plain' }: { label: string; value: string; unit?: string; sub?: string; tone?: 'plain' | 'dark' | 'gold' | 'green' }) {
  const dark = tone === 'dark'
  return (
    <div className={cn('rounded-lg border p-lg flex flex-col gap-xs', dark ? 'bg-surface-dark-1 border-hairline-dark' : 'card', tone === 'gold' && 'ring-1 ring-primary/25')}>
      <span className={cn('font-sans text-caption uppercase tracking-[0.12em]', dark ? 'text-primary-bright' : 'text-ink-subtle')}>{label}</span>
      <span className={cn('font-serif text-headline tabular-nums leading-none', dark ? 'text-ink-on-dark' : tone === 'gold' ? 'text-primary-hover' : tone === 'green' ? 'text-success' : 'text-ink')}>
        {value}{unit && <span className={cn('font-sans text-data ms-1', dark ? 'text-primary-bright' : 'text-ink-subtle')}>{unit}</span>}
      </span>
      {sub && <span className={cn('font-sans text-caption', dark ? 'text-ink-on-dark-muted' : 'text-ink-subtle')}>{sub}</span>}
    </div>
  )
}

function Legend({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-wide text-ink-subtle">{color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />}{label}</span>
      <span className="font-serif text-card-title text-ink tabular-nums">{value}</span>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="label !mb-0">{label}</span>
      <span className="font-sans text-data text-ink">{value}</span>
    </div>
  )
}
