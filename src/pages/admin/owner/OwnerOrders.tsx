import { useState } from 'react'
import { Eye, ArrowRight, Check, X, AlertTriangle, Plus, Upload, Download, CheckCircle2, FileText, RefreshCw } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import {
  ownerOrderStatuses, ownerChannelMeta, ownerDepartments,
  type OwnerChannel, type OwnerOrderStage,
} from '@/data/ownerOrders'
import type { OwnerProduct, ProdChannel } from '@/data/ownerProducts'
import { useOwnerState } from '@/state/OwnerStateContext'
import { useGovernance } from '@/state/GovernanceContext'
import { useBilling } from '@/state/BillingContext'
import { useCostCenters } from '@/state/CostCenterContext'
import { useLedger } from '@/state/LedgerContext'
import { saleEntry, type SaleChannel } from '@/lib/postingRules'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, FilterChips, Pill } from './_shared'
import { BillingDesk } from './OwnerBilling'
import { CostCenterField } from './OwnerAccounting'

const LAST = (ownerOrderStatuses.length - 1) as OwnerOrderStage

/** The board's channels, as the revenue accounts know them. */
const saleChannelOf = (chan: OwnerChannel): SaleChannel =>
  chan === 'B2C' ? 'b2c' : chan === 'B2B' ? 'b2b' : 'mega'

export function OwnerOrders() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { orders, advanceOrder, setOrderStage, cancelOrder, createOrder, assignDepartment, pipelineValueMinor } = useOwnerState()
  const { submit } = useGovernance()
  const { post, entryForRef, centerOf } = useCostCenters()
  const ledger = useLedger()
  const { billingFor, attachTaxInvoice } = useBilling()
  const [chan, setChan] = useState<OwnerChannel | 'all'>('all')
  const [status, setStatus] = useState<string>('all')
  const [sel, setSel] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  const advance = (id: string) => {
    const o = orders.find((x) => x.id === id)
    if (!o || o.cancelled || o.stage >= LAST) return
    advanceOrder(id)
    flash(`${id} → ${pick(ownerOrderStatuses[o.stage + 1].label)}`)
  }
  const setStage = (id: string, s: OwnerOrderStage) => { setOrderStage(id, s); flash(`${id} → ${pick(ownerOrderStatuses[s].label)}`) }
  // Cancelling before production is routine housekeeping; after it, stock and revenue have
  // already moved, so the reversal is a decision someone signs for.
  const cancel = (id: string) => {
    const o = orders.find((x) => x.id === id)
    if (o && o.stage >= 2) {
      submit({
        kind: 'order_cancel',
        subject: { en: `${o.id} · ${o.customer.en}`, ar: `${o.id} · ${o.customer.ar}` },
        detail: { en: `Cancel an order already in ${ownerOrderStatuses[o.stage].label.en.toLowerCase()}`, ar: `إلغاء طلب في مرحلة ${ownerOrderStatuses[o.stage].label.ar}` },
        amountMinor: o.amountMinor, reason: '', payload: { orderId: id },
      })
      setSel(null)
      flash(pick({ en: 'Sent for approval — the order is untouched', ar: 'رُفع للاعتماد — لم يتغير الطلب' }))
      return
    }
    cancelOrder(id); setSel(null); flash(`${pick({ en: 'Cancelled', ar: 'أُلغي' })} ${id}`)
  }

  const cnt = (k: string) => orders.filter((o) => !o.cancelled && ownerOrderStatuses[o.stage].key === k).length
  const stats: { label: { en: string; ar: string }; value: string; sub: { en: string; ar: string }; tone: 'dark' | 'plain' | 'green' | 'gold' }[] = [
    { label: { en: 'New', ar: 'طلبات جديدة' }, value: String(cnt('new')), sub: { en: 'Awaiting confirm', ar: 'بانتظار التأكيد' }, tone: 'dark' },
    { label: { en: 'In prep', ar: 'قيد التجهيز' }, value: String(cnt('confirmed') + cnt('prod')), sub: { en: 'Confirm · produce', ar: 'تأكيد · تصنيع' }, tone: 'plain' },
    { label: { en: 'Ready / shipped', ar: 'جاهزة / مشحونة' }, value: String(cnt('ready') + cnt('shipped')), sub: { en: 'Awaiting delivery', ar: 'بانتظار التسليم' }, tone: 'plain' },
    { label: { en: 'Completed', ar: 'مكتملة' }, value: String(cnt('done')), sub: { en: 'This cycle', ar: 'هذه الدورة' }, tone: 'green' },
    { label: { en: 'Pipeline value', ar: 'قيمة قيد التنفيذ' }, value: money(pipelineValueMinor, { withSymbol: false }), sub: { en: 'Open orders', ar: 'طلبات مفتوحة' }, tone: 'gold' },
  ]

  const chanChips = [{ id: 'all' as const, label: pick({ en: 'All', ar: 'الكل' }), count: orders.length }, ...(['B2C', 'B2B', 'MEGA'] as OwnerChannel[]).map((c) => ({ id: c, label: pick(ownerChannelMeta[c].label), count: orders.filter((o) => o.chan === c).length }))]
  const statusChips = [
    { id: 'all', label: pick({ en: 'All', ar: 'الكل' }), count: orders.length },
    ...ownerOrderStatuses.map((s) => ({ id: s.key, label: pick(s.label), count: orders.filter((o) => !o.cancelled && ownerOrderStatuses[o.stage].key === s.key).length })),
    { id: 'cancelled', label: pick({ en: 'Cancelled', ar: 'ملغى' }), count: orders.filter((o) => o.cancelled).length },
  ]
  const shown = orders.filter((o) => {
    if (chan !== 'all' && o.chan !== chan) return false
    if (status === 'all') return true
    if (status === 'cancelled') return !!o.cancelled
    return !o.cancelled && ownerOrderStatuses[o.stage].key === status
  })

  const order = orders.find((o) => o.id === sel) ?? null

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Orders inbox', ar: 'صندوق الطلبات' })} subtitle={pick({ en: 'All channels · advance, transfer or cancel', ar: 'كل القنوات · تقديم أو تحويل أو إلغاء' })}
        action={<button onClick={() => setNewOpen(true)} className={buttonClass('secondary', 'sm')}>{pick({ en: 'Manual order', ar: 'طلب يدوي' })}</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-sm">
        {stats.map((s, i) => <StatCard key={i} label={pick(s.label)} value={s.value} sub={pick(s.sub)} tone={s.tone} />)}
      </div>

      <div className="flex flex-col gap-sm">
        <FilterChips chips={chanChips} active={chan} onChange={setChan} label={pick({ en: 'Channel', ar: 'القناة' })} />
        <FilterChips chips={statusChips} active={status} onChange={setStatus} label={pick({ en: 'Status', ar: 'الحالة' })} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <tbody>
              {shown.map((o) => {
                const s = ownerOrderStatuses[o.stage]
                const cm = ownerChannelMeta[o.chan]
                const canAdv = !o.cancelled && o.stage < LAST
                return (
                  <tr key={o.id} className="border-b border-hairline last:border-0">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-sm">
                        <span className="font-sans text-data text-ink tabular-nums">{o.id}</span>
                        {o.sla && !o.cancelled && <span className="inline-flex items-center gap-xxs text-danger" title="SLA"><AlertTriangle size={13} /></span>}
                      </div>
                      <p className="font-sans text-caption text-ink-subtle truncate max-w-[180px]">{pick(o.customer)}</p>
                    </td>
                    <td className="px-lg py-md"><Pill color={cm.color} bg={cm.bg}>{pick(cm.label)}</Pill></td>
                    <td className="px-lg py-md">
                      <p className="font-sans text-data text-ink truncate max-w-[220px]">{pick(o.items)}</p>
                      <p className="font-sans text-caption text-ink-subtle tabular-nums">{o.qty.toLocaleString()} {pick({ en: 'units', ar: 'وحدة' })} · {pick(o.date)}{o.department && <span className="text-primary-hover"> · {pick(o.department)}</span>}{(() => {
                        const e = entryForRef(o.id)
                        return e ? <span className="text-ink-muted"> · {centerOf(e.centerId)?.code ?? e.centerId}</span> : null
                      })()}</p>
                    </td>
                    <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums">{money(o.amountMinor)}</td>
                    <td className="px-lg py-md">{o.cancelled ? <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Cancelled', ar: 'ملغى' })}</Pill> : <Pill color={s.color} bg={s.bg}>{pick(s.label)}</Pill>}</td>
                    <td className="px-lg py-md">
                      <div className="flex items-center justify-end gap-xs">
                        {canAdv ? (
                          <button onClick={() => advance(o.id)} className="inline-flex items-center gap-xxs rounded-md bg-primary text-on-primary px-3 py-1.5 font-sans text-caption hover:bg-primary-hover whitespace-nowrap"><ArrowRight size={13} className="rtl:rotate-180" /> {pick(ownerOrderStatuses[o.stage + 1].label)}</button>
                        ) : (
                          <span className={cn('font-sans text-caption', o.cancelled ? 'text-danger' : 'text-success')}>{o.cancelled ? '—' : `${pick({ en: 'Done', ar: 'مكتمل' })} ✓`}</span>
                        )}
                        <button onClick={() => setSel(o.id)} className="grid place-items-center w-8 h-8 rounded-md border border-hairline text-ink-muted hover:text-ink hover:border-ink/30" aria-label={pick({ en: 'Details', ar: 'تفاصيل' })}><Eye size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline font-sans text-caption text-ink-subtle">{shown.length} {pick({ en: 'of', ar: 'من' })} {orders.length} {pick({ en: 'orders', ar: 'طلب' })}</div>
      </div>

      {/* Jaz side of the billing process — buyer receipts in, tax invoices out */}
      <BillingDesk />

      {/* detail modal */}
      <Modal open={!!order} onClose={() => { setSel(null); setConfirmCancel(false) }} size="lg" eyebrow={order ? pick(ownerChannelMeta[order.chan].label) : ''} title={order?.id ?? ''}
        footer={order && !order.cancelled ? <>
          <button onClick={() => setConfirmCancel(true)} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={15} /> {pick({ en: 'Cancel order', ar: 'إلغاء الطلب' })}</button>
          {order.stage < LAST && <button onClick={() => advance(order.id)} className={buttonClass('primary', 'sm')}><ArrowRight size={15} className="rtl:rotate-180" /> {pick({ en: 'Advance to', ar: 'تقديم إلى' })}: {pick(ownerOrderStatuses[order.stage + 1].label)}</button>}
        </> : undefined}>
        {order && (
          <div className="flex flex-col gap-lg">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
              {([[{ en: 'Customer', ar: 'العميل' }, pick(order.customer)], [{ en: 'Date', ar: 'التاريخ' }, pick(order.date)], [{ en: 'Qty', ar: 'الكمية' }, order.qty.toLocaleString()], [{ en: 'Value', ar: 'القيمة' }, money(order.amountMinor)]] as const).map(([l, v], i) => (
                <div key={i} className="flex flex-col gap-xxs"><span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick(l)}</span><span className="font-sans text-data text-ink">{v}</span></div>
              ))}
            </div>
            {/* clickable stepper */}
            <div>
              <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Pipeline', ar: 'خط الإنتاج' })}</span>
              <div className="flex items-center mt-sm">
                {ownerOrderStatuses.map((s, i) => {
                  const done = !order.cancelled && i < order.stage, cur = !order.cancelled && i === order.stage
                  return (
                    <div key={s.key} className="flex items-center flex-1 last:flex-none">
                      <button onClick={() => setStage(order.id, i as OwnerOrderStage)} className={cn('grid place-items-center w-8 h-8 rounded-pill border-2 shrink-0 font-sans text-caption transition-colors', done ? 'bg-success/15 border-success text-success' : cur ? 'bg-primary/10 border-primary text-primary-hover' : 'bg-surface-2 border-hairline-strong text-ink-subtle')}>{done ? <Check size={14} /> : i + 1}</button>
                      {i < ownerOrderStatuses.length - 1 && <span className={cn('h-0.5 flex-1 mx-1 rounded-pill', i < order.stage ? 'bg-success/50' : 'bg-hairline')} />}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* department transfer */}
            <div>
              <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Transfer to department', ar: 'تحويل إلى قسم' })}{order.department && <span className="text-primary-hover"> · {pick({ en: 'assigned to', ar: 'مُسند إلى' })} {pick(order.department)}</span>}</span>
              <div className="flex flex-wrap gap-xs mt-sm">
                {ownerDepartments.map((d, i) => {
                  const on = order.department && pick(order.department) === pick(d)
                  return (
                    <button key={i} onClick={() => { assignDepartment(order.id, d); flash(`${order.id} → ${pick(d)}`) }} className={cn('rounded-md border px-3 py-2 font-sans text-caption transition-colors', on ? 'bg-primary/10 border-primary text-primary-hover' : 'border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/30')}>{on && '✓ '}{pick(d)}</button>
                  )
                })}
              </div>
            </div>
            <div className="rounded-lg bg-surface-2 border border-hairline p-md">
              <p className="font-sans text-data text-ink">{pick(order.items)}</p>
              <p className="font-sans text-caption text-ink-subtle tabular-nums mt-xxs">{order.qty.toLocaleString()} {pick({ en: 'units', ar: 'وحدة' })} · {money(order.amountMinor)}</p>
            </div>

            {/* the sale side of the cost model — which centre carries this order, and what its processes add */}
            {!order.cancelled && <OrderCostCenter key={order.id} order={order} />}

            {/* billing trail for this order — buyer receipts in, tax invoice out (shared store) */}
            {!order.cancelled && (() => {
              const b = billingFor(order.id)
              return (
                <div className="rounded-lg border border-hairline overflow-hidden">
                  <div className="px-md py-sm bg-surface-2 border-b border-hairline">
                    <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Payment & invoices', ar: 'السداد والفواتير' })}</h4>
                  </div>
                  <div className="divide-y divide-hairline">
                    {/* buyer receipts */}
                    <div className="flex flex-col gap-xs px-md py-sm">
                      <div className="flex items-center gap-sm">
                        <span className="grid place-items-center w-9 h-9 rounded-md bg-surface-2 text-ink-muted shrink-0"><FileText size={16} /></span>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-data text-ink">{pick({ en: 'Payment receipts', ar: 'إيصالات السداد' })}{b.receipts.length > 0 && <span className="text-ink-subtle"> · {b.receipts.length}</span>}</p>
                          <p className="font-sans text-caption text-ink-subtle">{b.receipts.length === 0 ? pick({ en: 'Nothing attached by the buyer yet', ar: 'لم يُرفق العميل شيئًا بعد' }) : pick({ en: 'Attached by the buyer — click to open', ar: 'أرفقها العميل — اضغط للاطلاع' })}</p>
                        </div>
                      </div>
                      {b.receipts.length > 0 && (
                        <div className="flex flex-wrap gap-xs">
                          {b.receipts.map((r, i) => r.url
                            ? <button key={i} onClick={() => window.open(r.url, '_blank', 'noopener')} className="inline-flex items-center gap-xs rounded-pill border border-hairline-strong bg-surface-1 px-3 py-1 font-sans text-caption text-ink hover:border-ink/40 transition-colors"><Eye size={12} className="text-ink-subtle" /> <span dir="ltr">{r.name}</span></button>
                            : <span key={i} className="inline-flex items-center gap-xxs rounded-pill border border-success/25 bg-success/8 px-3 py-1 font-sans text-caption text-ink"><CheckCircle2 size={12} className="text-success" /> <span dir="ltr">{r.name}</span></span>)}
                        </div>
                      )}
                    </div>
                    {/* tax invoice */}
                    <div className="flex flex-wrap items-center gap-sm px-md py-sm">
                      <span className={cn('grid place-items-center w-9 h-9 rounded-md shrink-0', b.taxInvoice ? 'bg-success/10 text-success' : 'bg-surface-2 text-ink-subtle')}><FileText size={16} /></span>
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-sans text-data text-ink">{pick({ en: 'Tax invoice', ar: 'الفاتورة الضريبية' })} {b.taxInvoice && <CheckCircle2 size={13} className="inline text-success" />}</p>
                        <p className="font-sans text-caption text-ink-subtle">{b.taxInvoice ? <span dir="ltr">{b.taxInvoice.name}</span> : pick({ en: 'Attach it here — it appears on the buyer’s order instantly', ar: 'أرفقها هنا — تظهر على طلب العميل فورًا' })}</p>
                      </div>
                      {b.taxInvoice?.url && (
                        <a href={b.taxInvoice.url} download={b.taxInvoice.name} title={pick({ en: 'Download', ar: 'تنزيل' })} className="grid place-items-center w-8 h-8 rounded-md border border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/40 transition-colors"><Download size={14} /></a>
                      )}
                      <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
                        {b.taxInvoice ? <><RefreshCw size={14} /> {pick({ en: 'Replace', ar: 'استبدال' })}</> : <><Upload size={14} /> {pick({ en: 'Attach tax invoice', ar: 'إرفاق الفاتورة الضريبية' })}</>}
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) { attachTaxInvoice(order.id, { name: f.name, url: URL.createObjectURL(f), at: new Date().toISOString() }); flash(pick({ en: `Tax invoice attached to ${order.id}`, ar: `أُرفقت الفاتورة الضريبية للطلب ${order.id}` })) }
                          e.target.value = ''
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      {/* cancelling is destructive — it never happens on one click */}
      {order && (
        <ConfirmDialog
          open={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => cancel(order.id)}
          title={pick({ en: 'Cancel this order?', ar: 'إلغاء هذا الطلب؟' })}
          message={pick({ en: `Order ${order.id} for ${pick(order.customer)} (${money(order.amountMinor)}) will be cancelled and will not be fulfilled. This cannot be undone.`, ar: `سيُلغى الطلب ${order.id} الخاص بـ${pick(order.customer)} (${money(order.amountMinor)}) ولن يُنفَّذ. لا يمكن التراجع عن الإلغاء.` })}
          confirmLabel={pick({ en: 'Yes, cancel the order', ar: 'نعم، إلغاء الطلب' })}
        />
      )}

      <ManualOrderModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={(o) => {
        const id = createOrder(o)
        // The sale is accounted for the moment it exists: revenue is recognised net, the
        // tax is held for ZATCA, and a business order goes to the account rather than the till.
        const booked = ledger.post(saleEntry({
          date: ledger.bookDate,
          ref: id,
          party: o.customer,
          channel: saleChannelOf(o.chan),
          grossMinor: o.amountMinor,
          onCredit: o.chan !== 'B2C',
          centerId: o.costCenterId,
        }))
        // The sale is filed against its cost centre in the same breath it is created —
        // the centre's sale-side processes are valued on the order and frozen onto the entry.
        const e = o.costCenterId ? post({ side: 'sale', centerId: o.costCenterId, ref: id, party: o.customer, baseMinor: o.amountMinor, qty: o.qty }) : null
        const centre = e ? ` · ${centerOf(e.centerId)?.code ?? ''} ${money(e.processMinor)}` : ''
        flash(`${pick({ en: 'Order created', ar: 'أُنشئ الطلب' })} ${id}${booked.ok ? ` · ${booked.entry.no}` : ''}${centre}`)
      }} />
    </div>
  )
}

/** Assign (or refile) an order against a cost centre — the sale-side half of the cost model. */
function OrderCostCenter({ order }: { order: { id: string; customer: { en: string; ar: string }; qty: number; amountMinor: number } }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { post, unpost, entryForRef, centerOf } = useCostCenters()
  const existing = entryForRef(order.id)
  const [sel, setSel] = useState(existing?.centerId ?? '')
  const center = existing ? centerOf(existing.centerId) : undefined
  const dirty = sel !== '' && sel !== existing?.centerId

  return (
    <div className="rounded-lg border border-hairline overflow-hidden">
      <div className="px-md py-sm bg-surface-2 border-b border-hairline flex flex-wrap items-center justify-between gap-sm">
        <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Cost centre', ar: 'مركز التكلفة' })}</h4>
        {existing && (
          <span className="font-sans text-caption text-ink-muted tabular-nums">
            {existing.id} · {center ? `${center.code} · ${pick(center.name)}` : existing.centerId} · <span className="text-primary-hover">{money(existing.processMinor)}</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-sm px-md py-sm">
        <CostCenterField side="sale" value={sel} onChange={setSel} doc={{ amountMinor: order.amountMinor, qty: order.qty }} />
        <div className="flex flex-wrap items-center gap-xs">
          <button
            disabled={!dirty}
            onClick={() => {
              const e = post({ side: 'sale', centerId: sel, ref: order.id, party: order.customer, baseMinor: order.amountMinor, qty: order.qty })
              if (e) flash(`${order.id} → ${centerOf(e.centerId)?.code ?? ''} · ${money(e.processMinor)}`)
            }}
            className={buttonClass('primary', 'sm')}
          >
            {existing ? pick({ en: 'Refile against this centre', ar: 'إعادة الترحيل على هذا المركز' }) : pick({ en: 'File against this centre', ar: 'ترحيل على هذا المركز' })}
          </button>
          {existing && (
            <button onClick={() => { unpost(existing.id); setSel(''); flash(pick({ en: 'Posting removed', ar: 'أُلغي الترحيل' })) }} className="font-sans text-caption text-danger hover:underline ms-xs">
              {pick({ en: 'Remove posting', ar: 'إلغاء الترحيل' })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const chanToProd: Record<OwnerChannel, ProdChannel> = { B2C: 'b2c', B2B: 'b2b', MEGA: 'mega' }
const norm = (s: string) => s.trim().toLowerCase()
const nameMatches = (q: string, name: { en: string; ar: string }) => norm(name.ar).includes(norm(q)) || norm(name.en).includes(norm(q))

function ManualOrderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (o: { customer: { en: string; ar: string }; chan: OwnerChannel; items: { en: string; ar: string }; qty: number; amountMinor: number; costCenterId: string }) => void }) {
  const { pick, money } = useLocale()
  const { customers, products } = useOwnerState()
  const [chan, setChan] = useState<OwnerChannel>('B2C')
  const [customerId, setCustomerId] = useState('')
  const [custQ, setCustQ] = useState('')
  const [prodQ, setProdQ] = useState('')
  const [lines, setLines] = useState<Record<string, number>>({}) // sku → qty
  const [costCenterId, setCostCenterId] = useState('')

  const chanProducts = products[chanToProd[chan]]
  const chanCustomers = customers.filter((c) => (chan === 'B2C' ? c.type === 'B2C' : c.type === 'B2B'))
  const customer = chanCustomers.find((c) => c.id === customerId) ?? null
  const picked = chanProducts.filter((p) => lines[p.sku] != null)

  const custMatches = !customer && custQ.trim() !== '' ? chanCustomers.filter((c) => nameMatches(custQ, c.name)).slice(0, 6) : []
  const prodMatches = prodQ.trim() !== '' ? chanProducts.filter((p) => lines[p.sku] == null && nameMatches(prodQ, p.name)).slice(0, 6) : []

  const minQty = (p: OwnerProduct) => Math.max(1, p.moq)
  const totalQty = picked.reduce((a, p) => a + lines[p.sku], 0)
  const totalMinor = picked.reduce((a, p) => a + lines[p.sku] * p.priceMinor, 0)
  const valid = !!customer && picked.length > 0 && picked.every((p) => lines[p.sku] >= minQty(p))

  const switchChan = (c: OwnerChannel) => { setChan(c); setCustomerId(''); setCustQ(''); setProdQ(''); setLines({}) }
  const addLine = (p: OwnerProduct) => { setLines((prev) => ({ ...prev, [p.sku]: minQty(p) })); setProdQ('') }
  const removeLine = (sku: string) => setLines((prev) => { const next = { ...prev }; delete next[sku]; return next })
  const setQty = (sku: string, raw: string) => setLines((prev) => ({ ...prev, [sku]: Math.max(0, parseInt(raw.replace(/\D/g, ''), 10) || 0) }))

  const reset = () => { setChan('B2C'); setCustomerId(''); setCustQ(''); setProdQ(''); setLines({}); setCostCenterId('') }
  const submit = () => {
    if (!customer) return
    onCreate({
      customer: customer.name,
      chan,
      items: {
        en: picked.map((p) => `${p.name.en} ×${lines[p.sku]}`).join(' + '),
        ar: picked.map((p) => `${p.name.ar} ×${lines[p.sku]}`).join(' + '),
      },
      qty: totalQty,
      amountMinor: totalMinor,
      costCenterId,
    })
    reset(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="lg" eyebrow={pick({ en: 'New order', ar: 'طلب جديد' })} title={pick({ en: 'Manual order', ar: 'طلب يدوي' })}
      footer={<><button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button><button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Create order', ar: 'إنشاء الطلب' })}</button></>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Channel', ar: 'القناة' })}</span>
          <select value={chan} onChange={(e) => switchChan(e.target.value as OwnerChannel)} className="input cursor-pointer">
            {(['B2C', 'B2B', 'MEGA'] as OwnerChannel[]).map((c) => <option key={c} value={c}>{pick(ownerChannelMeta[c].label)}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Customer', ar: 'العميل' })}</span>
          <input
            value={customer ? pick(customer.name) : custQ}
            onChange={(e) => { setCustomerId(''); setCustQ(e.target.value) }}
            placeholder={pick({ en: 'Type a customer name…', ar: 'اكتب اسم العميل…' })}
            className="input"
          />
          {custMatches.length > 0 && (
            <div className="rounded-md border border-hairline bg-surface-1 shadow-soft max-h-44 overflow-y-auto divide-y divide-hairline">
              {custMatches.map((c) => (
                <button key={c.id} type="button" onClick={() => { setCustomerId(c.id); setCustQ('') }} className="w-full flex items-center justify-between gap-sm px-3 py-2 text-start hover:bg-surface-2 transition-colors">
                  <span className="font-sans text-data text-ink truncate">{pick(c.name)}</span>
                  <span className="font-sans text-caption text-ink-subtle shrink-0 tabular-nums">{c.orders} {pick({ en: 'orders', ar: 'طلب' })}</span>
                </button>
              ))}
            </div>
          )}
          {!customer && custQ.trim() !== '' && custMatches.length === 0 && (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No matching customer for this channel', ar: 'لا يوجد عميل مطابق لهذه القناة' })}</p>
          )}
        </div>
        <div className="flex flex-col gap-xs">
          <span className="label">{pick({ en: 'Items', ar: 'الأصناف' })}{picked.length > 0 && <span className="text-ink-subtle"> · {picked.length}</span>}</span>
          <input value={prodQ} onChange={(e) => setProdQ(e.target.value)} placeholder={pick({ en: 'Type a product name…', ar: 'اكتب اسم المنتج…' })} className="input" />
          {prodMatches.length > 0 && (
            <div className="rounded-md border border-hairline bg-surface-1 shadow-soft max-h-44 overflow-y-auto divide-y divide-hairline">
              {prodMatches.map((p) => (
                <button key={p.sku} type="button" onClick={() => addLine(p)} className="w-full flex items-center gap-sm px-3 py-2 text-start hover:bg-surface-2 transition-colors">
                  <span className="w-3 h-3 rounded-pill shrink-0" style={{ background: p.color }} aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-data text-ink truncate">{pick(p.name)}</span>
                    <span className="block font-sans text-caption text-ink-subtle truncate">{pick(p.category)} · {money(p.priceMinor)}{p.moq > 0 && ` · ${pick({ en: 'MOQ', ar: 'حد أدنى' })} ${p.moq}`}</span>
                  </span>
                  <Plus size={15} className="text-ink-subtle shrink-0" />
                </button>
              ))}
            </div>
          )}
          {prodQ.trim() !== '' && prodMatches.length === 0 && (
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'No matching product for this channel', ar: 'لا يوجد منتج مطابق لهذه القناة' })}</p>
          )}
          {picked.length > 0 && (
            <div className="rounded-md border border-hairline-strong divide-y divide-hairline">
              {picked.map((p) => {
                const below = lines[p.sku] < minQty(p)
                return (
                  <div key={p.sku} className="flex items-center gap-sm px-3 py-2">
                    <span className="w-3 h-3 rounded-pill shrink-0" style={{ background: p.color }} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block font-sans text-data text-ink truncate">{pick(p.name)}</span>
                      <span className="block font-sans text-caption text-ink-subtle truncate">{money(p.priceMinor)}{p.moq > 0 && ` · ${pick({ en: 'MOQ', ar: 'حد أدنى' })} ${p.moq}`}</span>
                    </span>
                    <input value={lines[p.sku]} onChange={(e) => setQty(p.sku, e.target.value)} className={cn('input w-20 py-1.5 text-center tabular-nums', below && 'border-danger')} inputMode="numeric" aria-label={pick({ en: 'Qty', ar: 'الكمية' })} />
                    <span className="font-sans text-data text-ink tabular-nums w-24 text-end">{money(lines[p.sku] * p.priceMinor)}</span>
                    <button type="button" onClick={() => removeLine(p.sku)} className="grid place-items-center w-7 h-7 rounded-md text-ink-subtle hover:text-danger shrink-0" aria-label={pick({ en: 'Remove', ar: 'إزالة' })}><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* the sale side of the cost model — the centre's processes are added the moment the order is created */}
        <CostCenterField side="sale" value={costCenterId} onChange={setCostCenterId} doc={{ amountMinor: totalMinor, qty: totalQty }} />

        <div className="flex items-center justify-between rounded-lg bg-surface-2 border border-hairline px-md py-sm">
          <span className="font-sans text-caption text-ink-subtle">{totalQty.toLocaleString()} {pick({ en: 'units', ar: 'وحدة' })}</span>
          <span className="font-sans text-data text-ink tabular-nums">{pick({ en: 'Total', ar: 'الإجمالي' })}: {money(totalMinor)}</span>
        </div>
      </div>
    </Modal>
  )
}
