import { useMemo, useState } from 'react'
import {
  AlertTriangle, Repeat, Check, Plus, Eye, Download, CheckCircle2, Trash2, Bookmark, Pencil,
  ClipboardCheck, Cog, Truck, PackageCheck, Clock, ShoppingCart,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import {
  accountOrders, accountOrderItems, quotes as quoteSeed, members,
  savedLists as savedListsSeed,
  type AccountOrder, type AccountOrderStatus, type Quote, type SavedList,
} from '@/data/business'
import { products, variantById } from '@/data/products'
import { ProductPicker, ProductThumb } from '@/components/ui/ProductPicker'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'

const BUYER_ID = 'm-3' // Faisal Al-Harbi

const statusVariant: Record<AccountOrderStatus, 'gold' | 'success' | 'danger' | 'neutral'> = {
  awaiting_approval: 'danger', confirmed: 'gold', processing: 'gold', shipped: 'gold', delivered: 'success', rejected: 'neutral',
}
const quoteVariant: Record<Quote['status'], 'gold' | 'success' | 'neutral' | 'danger'> = {
  sent: 'gold', accepted: 'success', converted: 'success', draft: 'neutral', expired: 'danger',
}

/* ─────────── Org orders (unified B2B account — all orders, not just mine) ─────────── */
export function OrgOrdersPanel() {
  const [viewOrder, setViewOrder] = useState<AccountOrder | null>(null)
  return (
    <>
      <MyOrders orders={accountOrders} onView={setViewOrder} />
      <OrderDetailModal order={viewOrder} open={!!viewOrder} onClose={() => setViewOrder(null)} />
    </>
  )
}

/* ─────────── My orders ─────────── */
function MyOrders({ orders, onView }: { orders: AccountOrder[]; onView: (o: AccountOrder) => void }) {
  const { t } = useLocale()
  const { add } = useCart()
  const [filter, setFilter] = useState<'all' | 'awaiting_approval' | 'processing' | 'delivered'>('all')
  const filters: typeof filter[] = ['all', 'awaiting_approval', 'processing', 'delivered']
  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  const reorder = (orderNo: string) => { (accountOrderItems[orderNo] ?? []).forEach((it) => add(it.variantId, it.qty)) }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('buyer.tab.myOrders')}</h2>
        <div className="flex items-center gap-xs flex-wrap">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-pill px-3 py-1.5 font-sans text-caption border transition-colors',
                filter === f ? 'bg-ink text-ink-on-dark border-ink' : 'bg-surface-1 text-ink-muted border-hairline-strong hover:border-ink/40')}>
              {f === 'all' ? t('oa.filterAll') : t(`orders.status.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-md">
        {shown.map((o) => (
          <OrderCard key={o.orderNo} order={o} onReorder={() => reorder(o.orderNo)} onView={() => onView(o)} />
        ))}
        {shown.length === 0 && <p className="font-sans text-data text-ink-subtle py-xl text-center">{t('buyer.noOrders')}</p>}
      </div>
    </div>
  )
}

function OrderCard({ order, onReorder, onView }: { order: AccountOrder; onReorder: () => void; onView: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const [done, setDone] = useState(false)
  return (
    <div className="card p-lg flex flex-col gap-md">
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

      <OrderTimeline status={order.status} />

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

/* fulfillment stepper */
const STEP_ICONS = [ClipboardCheck, Cog, Truck, PackageCheck]
function OrderTimeline({ status, compact }: { status: AccountOrderStatus; compact?: boolean }) {
  const { t } = useLocale()
  if (status === 'rejected') {
    return (
      <div className="inline-flex items-center gap-xs rounded-md bg-danger/8 border border-danger/20 px-md py-2 font-sans text-caption text-danger self-start">
        <AlertTriangle size={13} /> {t('orders.status.rejected')}
      </div>
    )
  }
  const labels = [t('buyer.step.approval'), t('buyer.step.processing'), t('buyer.step.shipped'), t('buyer.step.delivered')]
  const current = status === 'awaiting_approval' ? 0 : status === 'shipped' ? 2 : status === 'delivered' ? 3 : 1
  const delivered = status === 'delivered'
  const pendingApproval = status === 'awaiting_approval'

  return (
    <div className={cn('flex items-center', compact ? 'gap-0' : 'gap-0')}>
      {labels.map((label, i) => {
        const state = i < current ? 'done' : i === current ? (pendingApproval ? 'pending' : delivered ? 'done' : 'current') : 'todo'
        const Icon = STEP_ICONS[i]
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-xxs">
              <span className={cn('grid place-items-center w-8 h-8 rounded-pill border-2 transition-colors',
                state === 'done' ? 'bg-success/15 border-success text-success'
                : state === 'current' ? 'bg-primary/10 border-primary text-primary-hover'
                : state === 'pending' ? 'bg-danger/10 border-danger text-danger animate-pulse'
                : 'bg-surface-2 border-hairline-strong text-ink-subtle')}>
                {state === 'done' ? <Check size={15} /> : <Icon size={14} />}
              </span>
              {!compact && <span className={cn('font-sans text-[10px] uppercase tracking-wide whitespace-nowrap', state === 'todo' ? 'text-ink-subtle' : 'text-ink-muted')}>{label}</span>}
            </div>
            {i < labels.length - 1 && <span className={cn('h-0.5 flex-1 mx-1 rounded-pill', i < current ? 'bg-success/50' : 'bg-hairline')} />}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────── My quotes ─────────── */
export function MyQuotes() {
  const { t, pick, money, locale } = useLocale()
  const { add } = useCart()
  const [list, setList] = useState<Quote[]>(quoteSeed)
  const [requestOpen, setRequestOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600) }
  const accept = (id: string) => { setList((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'converted' } : q))); flash(t('quotes.acceptedToast')) }
  const onCreated = (q: Quote) => { setList((prev) => [q, ...prev]); flash(t('quotes.requestedBody')) }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('quotes.title')}</h2>
        <button onClick={() => setRequestOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('quotes.request')}</button>
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
              {q.status === 'converted' && (
                <span className="inline-flex items-center gap-xs font-sans text-caption text-success"><Check size={14} /> {t('quotes.status.converted')}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <RequestQuoteModal open={requestOpen} onClose={() => setRequestOpen(false)} onCreated={onCreated} onAddToCart={add} />
    </div>
  )
}

function RequestQuoteModal({ open, onClose, onCreated, onAddToCart }: { open: boolean; onClose: () => void; onCreated: (q: Quote) => void; onAddToCart: (variantId: string, qty: number) => void }) {
  const { t, money } = useLocale()
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([{ productId: '', qty: 50 }])
  const [note, setNote] = useState('')

  const total = useMemo(
    () => lines.reduce((sum, l) => { const p = products.find((x) => x.id === l.productId); return p ? sum + p.variants[0].b2bPriceMinor * (l.qty || 0) : sum }, 0),
    [lines],
  )
  const valid = lines.some((l) => l.productId && l.qty > 0)
  const setLine = (i: number, patch: Partial<{ productId: string; qty: number }>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLine = () => setLines((prev) => [...prev, { productId: '', qty: 25 }])
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const reset = () => { setLines([{ productId: '', qty: 50 }]); setNote('') }
  const submit = () => {
    const filled = lines.filter((l) => l.productId && l.qty > 0)
    onCreated({
      id: `q-${Date.now()}`, ref: 'RFQ-2026-' + String(Math.floor(1000 + Math.random() * 8999)), status: 'sent',
      validUntil: '2026-07-31', totalMinor: total, lineCount: filled.length,
      note: { en: note || 'Custom quote request', ar: note || 'طلب عرض سعر مخصّص' },
    })
    reset(); onClose()
  }
  const orderNow = () => {
    lines.filter((l) => l.productId && l.qty > 0).forEach((l) => { const p = products.find((x) => x.id === l.productId); if (p) onAddToCart(p.variants[0].id, l.qty) })
    reset(); onClose()
  }

  return (
    <Modal
      open={open} onClose={onClose} size="lg" eyebrow={t('business.tab.quotes')} title={t('quotes.request')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={orderNow} disabled={!valid} className={buttonClass('secondary', 'sm')}><ShoppingCart size={15} /> {t('rfq.orderNow')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('rfq.submit')}</button>
      </>}
    >
      <div className="flex flex-col gap-md">
        <div className="flex flex-col gap-sm">
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId)
            const lineTotal = p ? p.variants[0].b2bPriceMinor * (l.qty || 0) : 0
            return (
              <div key={i} className="rounded-lg border border-hairline p-sm flex flex-col gap-sm">
                <ProductPicker value={l.productId} onChange={(id) => setLine(i, { productId: id })} />
                <div className="flex items-center gap-sm">
                  <label className="inline-flex items-center gap-xs">
                    <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('rfq.qty')}</span>
                    <input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(0, Number(e.target.value)) })} className="input w-20 text-center py-1.5" />
                  </label>
                  <span className="ms-auto font-sans text-data text-ink tabular-nums">{money(lineTotal, { withSymbol: false })}</span>
                  <button onClick={() => removeLine(i)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger transition-colors shrink-0" aria-label={t('rfq.removeLine')}><Trash2 size={15} /></button>
                </div>
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

/* ─────────── Lists ─────────── */
export function Lists() {
  const { t, pick, money } = useLocale()
  const { add } = useCart()
  const [lists, setLists] = useState<SavedList[]>(savedListsSeed.filter((l) => l.ownerId === BUYER_ID))
  const [editor, setEditor] = useState<{ list: SavedList | null } | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)

  const listTotal = (l: SavedList) => l.items.reduce((s, it) => { const v = variantById(it.variantId); return v ? s + v.variant.b2bPriceMinor * it.qty : s }, 0)
  const addAll = (l: SavedList) => { l.items.forEach((it) => add(it.variantId, it.qty)); setAddedId(l.id); setTimeout(() => setAddedId(null), 1500) }
  const upsert = (saved: SavedList) => setLists((prev) => (prev.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev]))

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink">{t('buyer.lists.title')}</h2>
          <p className="font-sans text-data text-ink-muted mt-xxs">{t('buyer.lists.subtitle')}</p>
        </div>
        <button onClick={() => setEditor({ list: null })} className={buttonClass('primary', 'sm', 'shrink-0')}><Plus size={15} /> {t('buyer.lists.new')}</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-md">
        {lists.map((l) => {
          const items = l.items.map((it) => ({ it, v: variantById(it.variantId) })).filter((x) => x.v) as { it: { variantId: string; qty: number }; v: NonNullable<ReturnType<typeof variantById>> }[]
          return (
            <div key={l.id} className="card p-lg flex flex-col gap-md">
              <div className="flex items-start justify-between gap-sm">
                <div className="flex items-center gap-sm min-w-0">
                  <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover shrink-0"><Bookmark size={18} /></span>
                  <div className="min-w-0">
                    <h3 className="font-serif text-card-title text-ink truncate">{pick(l.name)}</h3>
                    <p className="font-sans text-caption text-ink-subtle">{l.items.length} {t('buyer.lists.items')} · {money(listTotal(l))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-xxs shrink-0">
                  <button onClick={() => setEditor({ list: l })} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-primary-hover hover:bg-primary/5" aria-label={t('buyer.lists.edit')}><Pencil size={15} /></button>
                  <button onClick={() => setLists((prev) => prev.filter((x) => x.id !== l.id))} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/5" aria-label={t('buyer.lists.delete')}><Trash2 size={15} /></button>
                </div>
              </div>

              <ul className="flex flex-col gap-xs">
                {items.map(({ it, v }, i) => (
                  <li key={i} className="flex items-center gap-sm">
                    <ProductThumb flavorId={v.product.flavorId} type={v.product.type} className="w-7 h-7" />
                    <span className="flex-1 font-sans text-caption text-ink truncate">{pick(v.product.title)}</span>
                    <span className="font-sans text-caption text-ink-subtle tabular-nums">×{it.qty}</span>
                  </li>
                ))}
              </ul>

              <button onClick={() => addAll(l)} className={buttonClass(addedId === l.id ? 'secondary' : 'primary', 'sm', 'self-start')}>
                {addedId === l.id ? <><Check size={14} /> {t('cta.added')}</> : <><ShoppingCart size={14} /> {t('buyer.lists.addAll')}</>}
              </button>
            </div>
          )
        })}
        {lists.length === 0 && (
          <div className="card p-xxl flex flex-col items-center text-center gap-sm sm:col-span-2">
            <span className="grid place-items-center w-14 h-14 rounded-pill bg-surface-2 text-ink-subtle"><Bookmark size={24} /></span>
            <p className="font-sans text-data text-ink-muted">{t('buyer.lists.empty')}</p>
          </div>
        )}
      </div>

      {editor && (
        <ListEditorModal
          key={editor.list?.id ?? 'new'}
          list={editor.list}
          onClose={() => setEditor(null)}
          onSave={(l) => { upsert(l); setEditor(null) }}
        />
      )}
    </div>
  )
}

function ListEditorModal({ list, onClose, onSave }: { list: SavedList | null; onClose: () => void; onSave: (l: SavedList) => void }) {
  const { t, pick, locale, money } = useLocale()
  const editing = !!list
  const [name, setName] = useState(list ? pick(list.name) : '')
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>(
    list && list.items.length
      ? list.items.map((it) => ({ productId: variantById(it.variantId)?.product.id ?? '', qty: it.qty }))
      : [{ productId: '', qty: 24 }],
  )
  const valid = name.trim() && lines.some((l) => l.productId && l.qty > 0)
  const setLine = (i: number, patch: Partial<{ productId: string; qty: number }>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const submit = () => {
    const items = lines.filter((l) => l.productId && l.qty > 0).map((l) => ({ variantId: products.find((p) => p.id === l.productId)!.variants[0].id, qty: l.qty }))
    const nm = list ? { ...list.name, [locale]: name } : { en: name, ar: name }
    onSave({ id: list?.id ?? `sl-${Date.now()}`, name: nm, ownerId: BUYER_ID, items })
  }

  return (
    <Modal open onClose={onClose} size="md" eyebrow={t('buyer.tab.lists')} title={editing ? t('buyer.lists.editTitle') : t('buyer.lists.newTitle')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{editing ? t('buyer.lists.save') : t('buyer.lists.create')}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{t('buyer.lists.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly amenities" className="input" />
        </label>
        <div className="flex flex-col gap-sm">
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId)
            return (
              <div key={i} className="rounded-lg border border-hairline p-sm flex flex-col gap-sm">
                <ProductPicker value={l.productId} onChange={(id) => setLine(i, { productId: id })} />
                <div className="flex items-center gap-sm">
                  <label className="inline-flex items-center gap-xs">
                    <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('rfq.qty')}</span>
                    <input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(0, Number(e.target.value)) })} className="input w-20 text-center py-1.5" />
                  </label>
                  <span className="ms-auto font-sans text-data text-ink-subtle tabular-nums">{p ? money(p.variants[0].b2bPriceMinor * l.qty, { withSymbol: false }) : '—'}</span>
                  <button onClick={() => removeLine(i)} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger transition-colors shrink-0" aria-label={t('rfq.removeLine')}><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
          <button onClick={() => setLines((prev) => [...prev, { productId: '', qty: 24 }])} className={buttonClass('ghost', 'sm', 'self-start')}><Plus size={14} /> {t('rfq.addLine')}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────── Order detail / invoice ─────────── */
function OrderDetailModal({ order, open, onClose }: { order: AccountOrder | null; open: boolean; onClose: () => void }) {
  const { t, pick, money, locale } = useLocale()
  if (!order) return null

  const approver = members.find((m) => m.role === 'approver')
  const lines = (accountOrderItems[order.orderNo] ?? [])
    .map((it) => { const found = variantById(it.variantId); return found ? { found, qty: it.qty, unit: found.variant.b2bPriceMinor, total: found.variant.b2bPriceMinor * it.qty } : null })
    .filter(Boolean) as { found: NonNullable<ReturnType<typeof variantById>>; qty: number; unit: number; total: number }[]

  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const vat = Math.round(subtotal * 0.15)
  const total = subtotal + vat
  const awaiting = order.status === 'awaiting_approval'

  const download = () => {
    const doc = { orderNo: order.orderNo, po: order.poNumber, status: order.status, buyer: order.buyer.en, lines: lines.map((l) => ({ item: l.found.product.title.en, qty: l.qty, unit_minor: l.unit, total_minor: l.total })), subtotal_minor: subtotal, vat_minor: vat, total_minor: total, currency: 'SAR' }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${order.orderNo}.json`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open={open} onClose={onClose} size="lg" eyebrow={t('order.details')} title={order.orderNo}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>
        {!awaiting && order.status !== 'rejected' && <button onClick={download} className={buttonClass('primary', 'sm')}><Download size={15} /> {t('inv.download')}</button>}
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

        {/* fulfillment tracking */}
        <div className="rounded-lg bg-surface-2 border border-hairline p-lg">
          <OrderTimeline status={order.status} />
        </div>

        {awaiting && (
          <div className="rounded-md bg-danger/6 border border-danger/25 p-md flex items-start gap-sm">
            <Clock size={18} className="text-danger mt-0.5 shrink-0" />
            <p className="font-sans text-data text-ink-muted">
              {t('buyer.awaitingDetail')}{approver ? ` ${t('buyer.pendingWith')} ${pick(approver.name)}.` : ''}
            </p>
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
                      <ProductThumb flavorId={l.found.product.flavorId} type={l.found.product.type} className="w-9 h-9" />
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

