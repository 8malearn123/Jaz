import { useState, useEffect } from 'react'
import {
  LayoutGrid, Boxes, Package, Ship, Landmark, Plus, Minus, ArrowRight, Check, X,
  MapPin, Download, ShieldCheck, Snowflake, PackageCheck, Truck, Globe, FileText, Container, Clock,
  Upload, CheckCircle2,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { ToastProvider, useToast } from '@/components/account/Toast'
import { MegaStateProvider, useMegaState } from '@/state/MegaStateContext'
import { useBilling } from '@/state/BillingContext'
import { countryOf } from '@/data/countries'
import { openPrintWindow } from '@/lib/printWindow'
import { AreaTrend, UtilizationGauge } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { useTab } from '@/lib/useTab'
import { cn } from '@/lib/cn'
import { downloadExcel } from '@/lib/excel'
import {
  megaAccount, megaCatalog, megaVolumeTiers, volumeDiscount, trucksFor,
  shipFlow, SHIP_LAST, CANCEL_WINDOW_MS, megaCredit, megaStatements, megaInvoices, megaCompliance,
  megaMarkets, megaExportTrend, type MegaOrder, type ShipStage,
} from '@/data/mega'

const TABS = ['overview', 'catalog', 'orders', 'finance'] as const
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
  // 'shipments' merged into 'orders' — old links land on the merged board
  const active = (TABS.includes(activeRaw as Tab) ? activeRaw : activeRaw === 'shipments' ? 'orders' : 'overview') as Tab
  const { openShipments } = useMegaState()

  const tabs: TabDef[] = [
    { id: 'overview', label: pick({ en: 'Overview', ar: 'نظرة عامة' }), icon: LayoutGrid },
    { id: 'catalog', label: pick({ en: 'Pallet catalog', ar: 'كتالوج الطبليات' }), icon: Boxes },
    { id: 'orders', label: pick({ en: 'Orders & shipments', ar: 'الطلبات والشحنات' }), icon: Package },
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
        <button onClick={() => onTab('orders')} className="link-gold text-caption">{pick({ en: 'All orders & shipments', ar: 'كل الطلبات والشحنات' })}</button>
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
  // The catalog is country-scoped: this partner sees the products dedicated to
  // their country plus the global ones — other countries' products never show.
  const myCountry = countryOf(megaAccount.country)
  const myCatalog = megaCatalog.filter((p) => (p.country ?? 'all') === 'all' || p.country === megaAccount.country)
  const categories = [...new Set(myCatalog.map((p) => pick(p.category)))]

  return (
    <div className="flex flex-col gap-lg">
      {/* country notice */}
      {myCountry && (
        <div className="rounded-md border border-hairline bg-surface-2 px-md py-sm font-sans text-caption text-ink-muted inline-flex items-start gap-xs">
          <Globe size={13} className="shrink-0 mt-0.5" />
          <span>{pick({ en: `Your catalog for ${myCountry.label.en} ${myCountry.flag} — country-dedicated products plus the global range.`, ar: `كتالوجك لدولة ${myCountry.label.ar} ${myCountry.flag} — المنتجات المخصصة لدولتك إضافة إلى التشكيلة العامة.` })}</span>
        </div>
      )}

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
            {myCatalog.filter((p) => pick(p.category) === cat).map((p) => {
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

/* ═══════════ Orders & shipments — one board: commercial ledger + cold-chain tracking ═══════════ */
function Orders() {
  const { pick, money } = useLocale()
  const { orders, advanceShipment } = useMegaState()
  const { flash } = useToast()
  const [track, setTrack] = useState<string | null>(null)
  const tracked = orders.find((o) => o.id === track) ?? null
  const open = orders.filter((o) => !o.cancelled && o.stage < SHIP_LAST).length
  const delivered = orders.filter((o) => !o.cancelled && o.stage >= SHIP_LAST).length
  const cancelled = orders.filter((o) => o.cancelled).length

  return (
    <div className="flex flex-col gap-md">
      {/* one board: every export order with its commercial info and shipment progress */}
      <div className="flex flex-wrap items-center gap-xs font-sans text-caption">
        <span className="rounded-pill bg-surface-2 border border-hairline px-3 py-1 text-ink-muted tabular-nums">{orders.length} {pick({ en: 'export orders', ar: 'طلب تصدير' })}</span>
        <span className="rounded-pill px-3 py-1 font-medium tabular-nums" style={{ color: '#8a6b3f', backgroundColor: '#f6edde' }}>{open} {pick({ en: 'in progress', ar: 'قيد التنفيذ' })}</span>
        <span className="rounded-pill px-3 py-1 font-medium tabular-nums" style={{ color: '#2f7d5b', backgroundColor: '#e6f2ea' }}>{delivered} {pick({ en: 'delivered', ar: 'سُلّمت' })}</span>
        {cancelled > 0 && <span className="rounded-pill px-3 py-1 font-medium tabular-nums" style={{ color: '#b5403b', backgroundColor: '#faeceb' }}>{cancelled} {pick({ en: 'cancelled', ar: 'ملغاة' })}</span>}
      </div>

      {orders.map((o) => (
        <div key={o.id} className={cn('card p-lg flex flex-col gap-md', o.cancelled && 'opacity-60')}>
          <div className="flex flex-wrap items-center gap-md">
            <span className="grid place-items-center w-10 h-10 rounded-md bg-surface-2 border border-hairline text-primary-hover shrink-0"><Ship size={18} /></span>
            <div className="flex-1 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-sm">
                <span className="font-sans text-data text-ink tabular-nums">{o.id}</span>
                {o.cancelled ? <StatusBadge variant="danger">{pick({ en: 'Cancelled', ar: 'ملغى' })}</StatusBadge> : <StatusBadge variant={o.stage >= SHIP_LAST ? 'success' : 'gold'}>{pick(shipFlow[o.stage].label)}</StatusBadge>}
                <StatusBadge variant="neutral">{o.incoterm}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-subtle truncate">{pick(o.items)} · {pick(o.placedAt)}</p>
              <p className="font-sans text-caption text-ink-subtle inline-flex items-center gap-xxs"><MapPin size={11} /> {pick(o.destination)} · {o.pallets} {pick({ en: 'pallets', ar: 'طبلية' })}</p>
            </div>
            <span className="font-sans text-data text-ink tabular-nums">{money(o.valueMinor)}</span>
            <div className="flex items-center gap-xs">
              <button onClick={() => setTrack(o.id)} className={buttonClass('secondary', 'sm')}><FileText size={14} /> {pick({ en: 'Details & invoices', ar: 'التفاصيل والفواتير' })}</button>
              {!o.cancelled && (o.stage < SHIP_LAST
                ? <button onClick={() => { advanceShipment(o.id); flash(`${o.id} → ${pick(shipFlow[o.stage + 1].label)}`) }} className={buttonClass('primary', 'sm')}><ArrowRight size={14} className="rtl:rotate-180" /> {pick(shipFlow[o.stage + 1].label)}</button>
                : <span className="font-sans text-caption text-success whitespace-nowrap">{pick({ en: 'Delivered', ar: 'سُلّم' })} ✓</span>)}
            </div>
          </div>
          {!o.cancelled && <ShipTimeline stage={o.stage} />}
        </div>
      ))}
      {tracked && <TrackModal order={tracked} onClose={() => setTrack(null)} />}
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
    downloadExcel(`mega-statement-${s.id}`, pick({ en: 'Statement', ar: 'كشف الحساب' }), [
      [pick({ en: 'Item', ar: 'البند' }), pick({ en: 'Value', ar: 'القيمة' })],
      [pick({ en: 'Account', ar: 'الحساب' }), pick(megaAccount.legalName)],
      [pick({ en: 'Period', ar: 'الفترة' }), pick(s.period)],
      [pick({ en: 'Closing balance (SAR)', ar: 'الرصيد الختامي (ريال)' }), s.closingMinor / 100],
    ])
    flash(pick({ en: 'Statement downloaded (Excel)', ar: 'نُزّل كشف الحساب (إكسل)' }))
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
                <button onClick={() => downloadStatement(s.id)} className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink"><Download size={15} /> Excel</button>
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
  const { pick, money, locale } = useLocale()
  const { cancelOrder } = useMegaState()
  // Billing lives in the shared store, so receipts and the tax invoice are the
  // same trail the Jaz billing desk works with — exactly like the B2B account.
  const { billingFor, attachReceipt } = useBilling()
  const { flash } = useToast()
  const [now, setNow] = useState(() => Date.now())
  const billing = billingFor(order.id)

  // Printable invoice — the browser's "Save as PDF" produces the PDF. Exports
  // are zero-rated for VAT; the proforma is auto-issued with every order.
  const printDoc = (kind: 'proforma' | 'tax') => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    const L = (en: string, ar: string) => (locale === 'ar' ? ar : en)
    const title = kind === 'tax' ? L('Tax invoice', 'فاتورة ضريبية') : L('Proforma invoice', 'فاتورة أولية')
    const sub = kind === 'tax'
      ? `Jaz · ${L('ZATCA compliant', 'متوافقة مع هيئة الزكاة والضريبة والجمارك')}`
      : `Jaz · ${L('Not a tax invoice — the tax invoice is issued by Jaz after payment is confirmed', 'ليست فاتورة ضريبية — تُصدر جاز الفاتورة الضريبية بعد التحقق من السداد')}`
    openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${order.id}</title><style>
      @page{size:A4 portrait;margin:15mm}
      html,body{margin:0;width:auto}
      *{box-sizing:border-box}
      body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#2b2b2b;-webkit-print-color-adjust:exact}
      h1{font-size:20px;margin:0 0 4px} .sub{color:#777;font-size:12px;margin-bottom:16px}
      .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:13px;margin:14px 0}
      .meta b{display:block;color:#777;font-weight:600;font-size:11px;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;word-break:break-word;text-align:${locale === 'ar' ? 'right' : 'left'}}
      th{background:#f3efe8}
      .totals{margin-top:14px;font-size:13px} .totals div{display:flex;justify-content:space-between;padding:3px 0}
      .totals .net{font-weight:700;font-size:15px;border-top:1px solid #ccc;padding-top:8px;margin-top:6px}
      .foot{margin-top:24px;font-size:11px;color:#999}
      @media print{body{padding:0}}
    </style></head><body>
      <h1>${title} ${order.id}</h1>
      <div class="sub">${sub}</div>
      <div class="meta">
        <div><b>${L('Buyer', 'المشتري')}</b>${pick(megaAccount.legalName)}</div>
        <div><b>${L('Date', 'التاريخ')}</b>${pick(order.placedAt)}</div>
        <div><b>${L('Incoterm', 'شروط التسليم')}</b>${order.incoterm} — ${pick(order.destination)}</div>
        <div><b>${L('Pallets', 'الطبليات')}</b>${order.pallets}</div>
      </div>
      <table><thead><tr><th>${L('Item', 'الصنف')}</th><th>${L('Pallets', 'الطبليات')}</th><th>${L('Total', 'الإجمالي')}</th></tr></thead>
        <tbody><tr><td>${pick(order.items)}</td><td>${order.pallets}</td><td>${money(order.valueMinor)}</td></tr></tbody></table>
      <div class="totals">
        <div><span>${L('Subtotal', 'المجموع الفرعي')}</span><span>${money(order.valueMinor)}</span></div>
        <div><span>${L('VAT 0% — zero-rated export', 'ضريبة القيمة المضافة ٠٪ — تصدير')}</span><span>${money(0)}</span></div>
        <div class="net"><span>${L('Total', 'الإجمالي')}</span><span>${money(order.valueMinor)}</span></div>
      </div>
      <div class="foot">${L('Generated from the Jaz export portal.', 'صدرت من بوابة تصدير جاز.')}</div>
    </body></html>`)
  }

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

  const [confirmCancel, setConfirmCancel] = useState(false)
  const doCancel = () => { cancelOrder(order.id); flash(`${pick({ en: 'Order cancelled', ar: 'أُلغي الطلب' })} · ${order.id}`); onClose() }

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={order.id} title={pick({ en: 'Order details & invoices', ar: 'تفاصيل الطلب والفواتير' })}
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
          {canCancel && <button onClick={() => setConfirmCancel(true)} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={15} /> {pick({ en: 'Cancel order', ar: 'إلغاء الطلب' })}</button>}
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

            {/* billing process: proforma auto-issued → buyer attaches receipts → Jaz attaches the tax invoice */}
            <div className="rounded-lg border border-hairline overflow-hidden">
              <div className="px-md py-sm bg-surface-2 border-b border-hairline">
                <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Payment & invoices', ar: 'السداد والفواتير' })}</h4>
              </div>
              <div className="divide-y divide-hairline">
                {/* 1 — proforma, issued automatically with every order */}
                <div className="flex flex-wrap items-center gap-sm px-md py-sm">
                  <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover shrink-0"><FileText size={16} /></span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-sans text-data text-ink">{pick({ en: 'Proforma invoice', ar: 'الفاتورة الأولية' })} <CheckCircle2 size={13} className="inline text-success" /></p>
                    <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Issued automatically with the order', ar: 'تصدر تلقائيًا مع الطلب' })}</p>
                  </div>
                  <button onClick={() => printDoc('proforma')} className={buttonClass('secondary', 'sm')}><Download size={14} /> {pick({ en: 'Download', ar: 'تنزيل' })}</button>
                </div>

                {/* 2 — payment receipts attached by the buyer */}
                <div className="flex flex-col gap-xs px-md py-sm">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className="grid place-items-center w-9 h-9 rounded-md bg-surface-2 text-ink-muted shrink-0"><Upload size={16} /></span>
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-sans text-data text-ink">{pick({ en: 'Payment receipts', ar: 'إيصالات السداد' })}{billing.receipts.length > 0 && <span className="text-ink-subtle"> · {billing.receipts.length}</span>}</p>
                      <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Attach your transfer receipts for this order', ar: 'أرفق إيصالات التحويل الخاصة بهذا الطلب' })}</p>
                    </div>
                    <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
                      <Upload size={14} /> {pick({ en: 'Attach receipt', ar: 'إرفاق إيصال' })}
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) { attachReceipt(order.id, { name: f.name, url: URL.createObjectURL(f), at: new Date().toISOString() }); flash(pick({ en: 'Receipt attached', ar: 'أُرفق الإيصال' })) }
                        e.target.value = ''
                      }} />
                    </label>
                  </div>
                  {billing.receipts.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      {billing.receipts.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-xxs rounded-pill border border-success/25 bg-success/8 px-3 py-1 font-sans text-caption text-ink">
                          <CheckCircle2 size={12} className="text-success" /> <span dir="ltr">{r.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3 — the tax invoice, attached by Jaz once payment is confirmed */}
                <div className="flex flex-wrap items-center gap-sm px-md py-sm">
                  <span className={cn('grid place-items-center w-9 h-9 rounded-md shrink-0', billing.taxInvoice ? 'bg-success/10 text-success' : 'bg-surface-2 text-ink-subtle')}><FileText size={16} /></span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-sans text-data text-ink">{pick({ en: 'Tax invoice', ar: 'الفاتورة الضريبية' })} {billing.taxInvoice && <CheckCircle2 size={13} className="inline text-success" />}</p>
                    <p className="font-sans text-caption text-ink-subtle">
                      {billing.taxInvoice
                        ? <>{pick({ en: 'Attached by Jaz', ar: 'أرفقتها شركة جاز' })} · <span dir="ltr">{billing.taxInvoice.name}</span></>
                        : pick({ en: 'Issued by Jaz after payment is confirmed', ar: 'تصدرها شركة جاز بعد التحقق من السداد' })}
                    </p>
                  </div>
                  {billing.taxInvoice
                    ? (billing.taxInvoice.url
                      ? <a href={billing.taxInvoice.url} download={billing.taxInvoice.name} className={buttonClass('secondary', 'sm')}><Download size={14} /> {pick({ en: 'Download', ar: 'تنزيل' })}</a>
                      : <button onClick={() => printDoc('tax')} className={buttonClass('secondary', 'sm')}><Download size={14} /> {pick({ en: 'Download', ar: 'تنزيل' })}</button>)
                    : <span className="rounded-pill px-3 py-1 font-sans text-caption font-medium" style={{ color: '#8a6b3f', backgroundColor: '#f6edde' }}>{pick({ en: 'Awaiting issue', ar: 'بانتظار الإصدار' })}</span>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* cancelling is destructive — it never happens on one click */}
      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title={pick({ en: 'Cancel this export order?', ar: 'إلغاء طلب التصدير هذا؟' })}
        message={pick({ en: `Order ${order.id} (${order.pallets} pallets · ${money(order.valueMinor)}) will be cancelled and will not ship. This cannot be undone.`, ar: `سيُلغى الطلب ${order.id} (${order.pallets} طبلية · ${money(order.valueMinor)}) ولن يُشحن. لا يمكن التراجع عن الإلغاء.` })}
        confirmLabel={pick({ en: 'Yes, cancel the order', ar: 'نعم، إلغاء الطلب' })}
      />
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
