import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid, Package, FileText, ShoppingBag, AlertTriangle, Repeat, Check, ArrowRight,
  Wallet, ClipboardList, Plus, Eye, Download, CheckCircle2, Trash2,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { useCart } from '@/state/CartContext'
import { availableCreditMinor } from '@/data/organization'
import { accountOrders, accountOrderItems, quotes as quoteSeed, memberById, type AccountOrder, type AccountOrderStatus, type Quote } from '@/data/business'
import { products, variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { AccountShell, type TabDef } from '@/components/account/AccountShell'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { useTab } from '@/lib/useTab'
import { cn, tint } from '@/lib/cn'

const BUYER_ID = 'm-3' // Faisal Al-Harbi

const statusVariant: Record<AccountOrderStatus, 'gold' | 'success' | 'danger' | 'neutral'> = {
  awaiting_approval: 'danger', confirmed: 'gold', processing: 'gold', shipped: 'gold', delivered: 'success', rejected: 'neutral',
}
const quoteVariant: Record<Quote['status'], 'gold' | 'success' | 'neutral' | 'danger'> = {
  sent: 'gold', accepted: 'success', converted: 'success', draft: 'neutral', expired: 'danger',
}

export function BuyerWorkspace() {
  const { t, pick } = useLocale()
  const { org, persona } = useChannel()
  const [activeRaw, setActive] = useTab('dashboard')
  const active = ['dashboard', 'orders', 'quotes'].includes(activeRaw) ? activeRaw : 'dashboard'
  const [viewOrder, setViewOrder] = useState<AccountOrder | null>(null)

  const me = memberById(BUYER_ID)
  const myOrders = accountOrders.filter((o) => o.buyerId === BUYER_ID)
  const awaiting = myOrders.filter((o) => o.status === 'awaiting_approval')

  const tabs: TabDef[] = [
    { id: 'dashboard', label: t('buyer.tab.dashboard'), icon: LayoutGrid },
    { id: 'orders', label: t('buyer.tab.myOrders'), icon: Package },
    { id: 'quotes', label: t('business.tab.quotes'), icon: FileText },
  ]

  return (
    <AccountShell
      eyebrow={pick(persona.roleLabel)}
      title={`${t('account.greeting')}, ${pick(persona.name).split(' ')[0]}`}
      subtitle={`${pick(org.legalName)} · ${t('buyer.subtitle')}`}
      tone="dark"
      tabs={tabs}
      active={active}
      onSelect={setActive}
    >
      {active === 'dashboard' && <Dashboard me={me} myOrders={myOrders} awaiting={awaiting} onTab={setActive} onView={setViewOrder} />}
      {active === 'orders' && <MyOrders orders={myOrders} onView={setViewOrder} />}
      {active === 'quotes' && <MyQuotes />}

      <OrderDetailModal order={viewOrder} open={!!viewOrder} onClose={() => setViewOrder(null)} />
    </AccountShell>
  )
}

/* ─────────── Dashboard ─────────── */
function Dashboard({
  me, myOrders, awaiting, onTab, onView,
}: {
  me: ReturnType<typeof memberById>
  myOrders: AccountOrder[]
  awaiting: AccountOrder[]
  onTab: (id: string) => void
  onView: (o: AccountOrder) => void
}) {
  const { t, money } = useLocale()
  const { org } = useChannel()
  const limit = me?.perOrderLimitMinor ?? null
  const available = availableCreditMinor(org)
  const monthSpend = myOrders.filter((o) => o.status !== 'rejected').reduce((s, o) => s + o.totalMinor, 0)

  return (
    <div className="flex flex-col gap-lg">
      {awaiting.length > 0 && (
        <div className="rounded-lg bg-danger/6 border border-danger/25 p-lg flex items-start gap-sm">
          <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-sans text-data font-medium text-ink">{awaiting.length} {t('buyer.awaiting')}</p>
            <p className="font-sans text-caption text-ink-muted mt-0.5">{t('buyer.awaitingBody')}</p>
          </div>
          <button onClick={() => onTab('orders')} className={buttonClass('secondary', 'sm', 'shrink-0')}>{t('cta.viewAll')}</button>
        </div>
      )}

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Wallet} label={t('buyer.myLimit')} value={limit ? money(limit) : t('team.noLimit')} hint={t('buyer.perOrder')} />
        <Stat icon={ClipboardList} label={t('buyer.orgAvailable')} value={money(available)} hint={t('buyer.readOnly')} />
        <Stat icon={Package} label={t('buyer.monthSpend')} value={money(monthSpend)} />
        <Stat icon={AlertTriangle} label={t('orders.status.awaiting_approval')} value={String(awaiting.length)} alert={awaiting.length > 0} />
      </div>

      <div className="rounded-xl bg-canvas-dark text-ink-on-dark p-xl flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink-on-dark">{t('buyer.orderTitle')}</h2>
          <p className="text-body text-ink-on-dark-muted mt-xs max-w-md">{t('buyer.orderBody')}</p>
        </div>
        <Link to="/shop" className={buttonClass('primary', 'md', 'shrink-0')}>
          <ShoppingBag size={16} /> {t('buyer.browseCatalogue')}
        </Link>
      </div>

      <div className="flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-headline text-ink">{t('buyer.recentOrders')}</h2>
          <button onClick={() => onTab('orders')} className="link-gold">{t('cta.viewAll')} <ArrowRight size={15} className="rtl:rotate-180" /></button>
        </div>
        <div className="flex flex-col divide-y divide-hairline border-y border-hairline">
          {myOrders.slice(0, 3).map((o) => (
            <button key={o.orderNo} onClick={() => onView(o)} className="flex items-center gap-md py-md text-start hover:bg-surface-2/60 transition-colors -mx-sm px-sm rounded-md">
              <OrderRowBody order={o} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────── My orders ─────────── */
function MyOrders({ orders, onView }: { orders: AccountOrder[]; onView: (o: AccountOrder) => void }) {
  const { t } = useLocale()
  const { add } = useCart()
  const reorder = (orderNo: string) => {
    (accountOrderItems[orderNo] ?? []).forEach((it) => add(it.variantId, it.qty))
  }
  return (
    <div className="flex flex-col gap-lg">
      <h2 className="font-serif text-headline text-ink">{t('buyer.tab.myOrders')}</h2>
      <div className="flex flex-col gap-md">
        {orders.map((o) => (
          <OrderCard key={o.orderNo} order={o} onReorder={() => reorder(o.orderNo)} onView={() => onView(o)} />
        ))}
      </div>
    </div>
  )
}

/* ─────────── My quotes ─────────── */
function MyQuotes() {
  const { t, pick, money, locale } = useLocale()
  const [list, setList] = useState<Quote[]>(quoteSeed)
  const [requestOpen, setRequestOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const accept = (id: string) => {
    setList((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'converted' } : q)))
    setToast(t('quotes.acceptedToast'))
    setTimeout(() => setToast(null), 2600)
  }
  const onCreated = (q: Quote) => {
    setList((prev) => [q, ...prev])
    setToast(t('quotes.requestedBody'))
    setTimeout(() => setToast(null), 2600)
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('quotes.title')}</h2>
        <button onClick={() => setRequestOpen(true)} className={buttonClass('primary', 'sm')}>
          <Plus size={15} /> {t('quotes.request')}
        </button>
      </div>

      {toast && (
        <div className="rounded-md bg-success/8 border border-success/25 p-md flex items-start gap-sm animate-fade-up">
          <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
          <p className="font-sans text-data text-ink">{toast}</p>
        </div>
      )}

      <div className="flex flex-col gap-md">
        {list.map((q) => (
          <div key={q.id} className="card p-lg flex flex-col sm:flex-row sm:items-center gap-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm">
                <span className="font-sans text-data text-ink">{q.ref}</span>
                <StatusBadge variant={quoteVariant[q.status]}>{t(`quotes.status.${q.status}`)}</StatusBadge>
              </div>
              <p className="font-sans text-caption text-ink-muted mt-xxs truncate">{pick(q.note)}</p>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">
                {q.lineCount} {t('quotes.lines')} · {t('quotes.validUntil')} {new Date(q.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-md shrink-0">
              <span className="font-serif text-card-title text-ink tabular-nums">{money(q.totalMinor)}</span>
              {(q.status === 'sent' || q.status === 'accepted') && (
                <button onClick={() => accept(q.id)} className={buttonClass('secondary', 'sm')}>{t('quotes.accept')}</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <RequestQuoteModal open={requestOpen} onClose={() => setRequestOpen(false)} onCreated={onCreated} />
    </div>
  )
}

function RequestQuoteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (q: Quote) => void }) {
  const { t, pick, money } = useLocale()
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([{ productId: '', qty: 50 }])
  const [note, setNote] = useState('')

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = products.find((x) => x.id === l.productId)
        if (!p) return sum
        return sum + p.variants[0].b2bPriceMinor * (l.qty || 0)
      }, 0),
    [lines],
  )
  const valid = lines.some((l) => l.productId && l.qty > 0)

  const setLine = (i: number, patch: Partial<{ productId: string; qty: number }>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLine = () => setLines((prev) => [...prev, { productId: '', qty: 25 }])
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const submit = () => {
    const filled = lines.filter((l) => l.productId && l.qty > 0)
    const q: Quote = {
      id: `q-${Date.now()}`,
      ref: 'RFQ-2026-' + String(Math.floor(1000 + Math.random() * 8999)),
      status: 'sent',
      validUntil: '2026-07-31',
      totalMinor: total,
      lineCount: filled.length,
      note: { en: note || 'Custom quote request', ar: note || 'طلب عرض سعر مخصّص' },
    }
    onCreated(q)
    setLines([{ productId: '', qty: 50 }])
    setNote('')
    onClose()
  }

  return (
    <Modal
      open={open} onClose={onClose} size="lg" eyebrow={t('business.tab.quotes')} title={t('quotes.request')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('rfq.submit')}</button>
      </>}
    >
      <div className="flex flex-col gap-md">
        <div className="flex flex-col gap-sm">
          <div className="hidden sm:flex items-center gap-sm px-xs">
            <span className="flex-1 font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('rfq.product')}</span>
            <span className="w-24 font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('rfq.qty')}</span>
            <span className="w-28 text-end font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('inv.lineTotal')}</span>
            <span className="w-8" />
          </div>
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId)
            const lineTotal = p ? p.variants[0].b2bPriceMinor * (l.qty || 0) : 0
            return (
              <div key={i} className="flex items-center gap-sm">
                <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })} className="input flex-1 cursor-pointer">
                  <option value="">{t('rfq.selectProduct')}</option>
                  {products.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pick(pr.title)} · {pick(flavors[pr.flavorId].name)}</option>
                  ))}
                </select>
                <input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(0, Number(e.target.value)) })} className="input w-24 text-center" />
                <span className="w-28 text-end font-sans text-data text-ink tabular-nums">{money(lineTotal, { withSymbol: false })}</span>
                <button onClick={() => removeLine(i)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger transition-colors shrink-0" aria-label="remove">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
          <button onClick={addLine} className={buttonClass('ghost', 'sm', 'self-start')}><Plus size={14} /> {t('rfq.addLine')}</button>
        </div>

        <label className="flex flex-col gap-xs">
          <span className="label">{t('rfq.notes')}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('rfq.notesPlaceholder')} className="input resize-none" />
        </label>

        <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline p-md">
          <span className="font-sans text-data text-ink-muted">{t('rfq.estTotal')}</span>
          <span className="font-serif text-headline text-ink tabular-nums">{money(total)}</span>
        </div>
        <p className="font-sans text-caption text-ink-subtle">{t('rfq.note')}</p>
      </div>
    </Modal>
  )
}

/* ─────────── Order detail / invoice ─────────── */
function OrderDetailModal({ order, open, onClose }: { order: AccountOrder | null; open: boolean; onClose: () => void }) {
  const { t, pick, money, locale } = useLocale()
  if (!order) return null

  const lines = (accountOrderItems[order.orderNo] ?? [])
    .map((it) => {
      const found = variantById(it.variantId)
      if (!found) return null
      return { found, qty: it.qty, unit: found.variant.b2bPriceMinor, total: found.variant.b2bPriceMinor * it.qty }
    })
    .filter(Boolean) as { found: NonNullable<ReturnType<typeof variantById>>; qty: number; unit: number; total: number }[]

  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const vat = Math.round(subtotal * 0.15)
  const total = subtotal + vat
  const awaiting = order.status === 'awaiting_approval'

  const download = () => {
    const doc = { orderNo: order.orderNo, po: order.poNumber, status: order.status, buyer: order.buyer.en, lines: lines.map((l) => ({ item: l.found.product.title.en, qty: l.qty, unit_minor: l.unit, total_minor: l.total })), subtotal_minor: subtotal, vat_minor: vat, total_minor: total, currency: 'SAR' }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${order.orderNo}.json`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open={open} onClose={onClose} size="lg" eyebrow={t('order.details')} title={order.orderNo}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>
        {!awaiting && <button onClick={download} className={buttonClass('primary', 'sm')}><Download size={15} /> {t('inv.download')}</button>}
      </>}
    >
      <div className="flex flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
            <span className="font-sans text-caption text-ink-subtle">{t('border.po')} {order.poNumber}</span>
          </div>
          <span className="font-sans text-caption text-ink-subtle">
            {t('border.buyer')}: {pick(order.buyer)} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {awaiting && (
          <div className="rounded-md bg-danger/6 border border-danger/25 p-md flex items-start gap-sm">
            <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
            <p className="font-sans text-data text-ink-muted">{t('buyer.awaitingDetail')}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-hairline">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2">
                <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{t('inv.item')}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{t('inv.qty')}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2 hidden sm:table-cell">{t('inv.unit')}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-md py-2">{t('inv.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-hairline">
                  <td className="px-md py-2.5">
                    <div className="flex items-center gap-sm">
                      <span className="w-8 h-8 rounded-md overflow-hidden border border-hairline shrink-0" style={{ backgroundColor: tint(flavors[l.found.product.flavorId].accent, 14) }} />
                      <span className="font-sans text-data text-ink">{pick(l.found.product.title)}</span>
                    </div>
                  </td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{l.qty}</td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink-muted tabular-nums hidden sm:table-cell">{money(l.unit, { withSymbol: false })}</td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{money(l.total, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-xs sm:w-64 sm:ms-auto">
          <Row label={t('cart.subtotal')} value={money(subtotal)} />
          <Row label={t('cart.vat')} value={money(vat)} />
          <div className="flex items-center justify-between pt-xs mt-xs border-t border-hairline-strong">
            <span className="font-serif text-card-title text-ink">{t('cart.total')}</span>
            <span className="font-serif text-card-title text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const { locale } = useLocale()
  return (
    <div className="flex items-center justify-between">
      <span className="font-sans text-data text-ink-muted">{label}</span>
      <span className="font-sans text-data text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{value}</span>
    </div>
  )
}

/* ─────────── pieces ─────────── */
function Stat({ icon: Icon, label, value, hint, alert }: { icon: typeof Wallet; label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', alert && 'ring-1 ring-danger/30')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs"><Icon size={17} /></span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', alert ? 'text-danger' : 'text-ink')}>{value}</span>
      {hint && <span className="font-sans text-caption text-ink-subtle">{hint}</span>}
    </div>
  )
}

function OrderRowBody({ order }: { order: AccountOrder }) {
  const { t, pick, money, locale } = useLocale()
  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-data text-ink">{order.orderNo}</p>
        <p className="font-sans text-caption text-ink-subtle truncate">
          {pick(order.summary)} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <span className="font-sans text-data text-ink tabular-nums">{money(order.totalMinor)}</span>
      <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
      <Eye size={15} className="text-ink-subtle shrink-0" />
    </>
  )
}

function OrderCard({ order, onReorder, onView }: { order: AccountOrder; onReorder: () => void; onView: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const [done, setDone] = useState(false)
  return (
    <div className="card p-lg flex flex-col gap-sm">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div>
          <div className="flex items-center gap-sm">
            <span className="font-sans text-data text-ink">{order.orderNo}</span>
            <StatusBadge variant={statusVariant[order.status]}>{t(`orders.status.${order.status}`)}</StatusBadge>
          </div>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">
            {pick(order.summary)} · {t('border.po')} {order.poNumber} · {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <span className="font-serif text-card-title text-ink tabular-nums">{money(order.totalMinor)}</span>
      </div>
      {order.status === 'awaiting_approval' && (
        <p className="inline-flex items-center gap-xs font-sans text-caption text-danger">
          <AlertTriangle size={13} /> {t('buyer.overYourLimit')}
        </p>
      )}
      <div className="flex items-center gap-xs pt-xs border-t border-hairline">
        <button onClick={onView} className={buttonClass('secondary', 'sm')}><Eye size={14} /> {t('order.view')}</button>
        <button onClick={() => { onReorder(); setDone(true); setTimeout(() => setDone(false), 1400) }} className={buttonClass('ghost', 'sm')}>
          {done ? <><Check size={14} /> {t('cta.added')}</> : <><Repeat size={14} /> {t('orders.reorder')}</>}
        </button>
      </div>
    </div>
  )
}
