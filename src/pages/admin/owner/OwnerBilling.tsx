import { useState } from 'react'
import { Eye, Upload, FileText, CheckCircle2, RefreshCw, Download } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { accountOrders } from '@/data/business'
import { useBilling, type BillingFile } from '@/state/BillingContext'
import { PanelHead, StatCard, Pill } from './_shared'

/* ─────────── Billing desk (Jaz side of the billing process) ───────────
   The buyer attaches transfer receipts from the business portal; here the Jaz
   team reviews those receipts and attaches the final tax invoice, which then
   appears instantly on the buyer's order (shared BillingContext). */

type BillState = 'awaiting_receipt' | 'awaiting_invoice' | 'complete'

const STATE_META: Record<BillState, { label: { en: string; ar: string }; color: string; bg: string }> = {
  awaiting_receipt: { label: { en: 'Awaiting receipt', ar: 'بانتظار الإيصال' }, color: '#8a6b3f', bg: '#f6edde' },
  awaiting_invoice: { label: { en: 'Awaiting tax invoice', ar: 'بانتظار الفاتورة الضريبية' }, color: '#2e5f8a', bg: '#e7f0f8' },
  complete: { label: { en: 'Complete', ar: 'مكتملة' }, color: '#3f7d4e', bg: '#e9f4ec' },
}

export function BillingDesk() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { billingFor, attachTaxInvoice } = useBilling()
  const [viewReceipt, setViewReceipt] = useState<{ file: BillingFile; orderNo: string } | null>(null)

  // Only orders in the billing flow — cancelled/rejected orders have nothing to bill.
  const rows = accountOrders
    .filter((o) => o.status !== 'rejected')
    .map((o) => {
      const b = billingFor(o.orderNo)
      const state: BillState = b.taxInvoice ? 'complete' : b.receipts.length > 0 ? 'awaiting_invoice' : 'awaiting_receipt'
      return { o, b, state }
    })

  const count = (s: BillState) => rows.filter((r) => r.state === s).length

  const openReceipt = (file: BillingFile, orderNo: string) => {
    // Receipts uploaded in-session carry a real object URL — open the actual file.
    // Seeded receipts are name-only, so show the structured preview instead.
    if (file.url) window.open(file.url, '_blank', 'noopener')
    else setViewReceipt({ file, orderNo })
  }

  const onAttachInvoice = (orderNo: string, f: File) => {
    attachTaxInvoice(orderNo, { name: f.name, url: URL.createObjectURL(f), at: new Date().toISOString() })
    flash(pick({ en: `Tax invoice attached to ${orderNo}`, ar: `أُرفقت الفاتورة الضريبية للطلب ${orderNo}` }))
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead
        title={pick({ en: 'Payments & invoices', ar: 'السداد والفواتير' })}
        subtitle={pick({ en: 'Business-portal orders · review buyer receipts, then attach the tax invoice', ar: 'طلبات بوابة الأعمال · راجع إيصالات العملاء ثم أرفق الفاتورة الضريبية' })}
      />

      <div className="grid grid-cols-3 gap-sm">
        <StatCard label={pick({ en: 'Awaiting receipt', ar: 'بانتظار الإيصال' })} value={String(count('awaiting_receipt'))} sub={pick({ en: 'No payment proof yet', ar: 'لا يوجد إثبات سداد بعد' })} tone="plain" />
        <StatCard label={pick({ en: 'Awaiting tax invoice', ar: 'بانتظار الفاتورة' })} value={String(count('awaiting_invoice'))} sub={pick({ en: 'Receipt in — attach invoice', ar: 'وصل الإيصال — أرفق الفاتورة' })} tone="gold" />
        <StatCard label={pick({ en: 'Complete', ar: 'مكتملة' })} value={String(count('complete'))} sub={pick({ en: 'Invoice delivered to buyer', ar: 'وصلت الفاتورة للعميل' })} tone="green" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2">{pick({ en: 'Order', ar: 'الطلب' })}</th>
                <th className="text-end font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2">{pick({ en: 'Total', ar: 'الإجمالي' })}</th>
                <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2">{pick({ en: 'Payment receipts', ar: 'إيصالات السداد' })}</th>
                <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2">{pick({ en: 'Tax invoice', ar: 'الفاتورة الضريبية' })}</th>
                <th className="text-start font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2">{pick({ en: 'Status', ar: 'الحالة' })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ o, b, state }) => {
                const sm = STATE_META[state]
                return (
                  <tr key={o.orderNo} className="border-b border-hairline last:border-0 align-top">
                    <td className="px-lg py-md">
                      <span className="font-sans text-data text-ink tabular-nums">{o.orderNo}</span>
                      <p className="font-sans text-caption text-ink-subtle truncate max-w-[200px]">
                        {pick(o.buyer)} · {o.poNumber} · {new Date(o.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </td>
                    <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums">{money(o.totalMinor)}</td>
                    <td className="px-lg py-md">
                      {b.receipts.length === 0 ? (
                        <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'None attached yet', ar: 'لم يُرفق بعد' })}</span>
                      ) : (
                        <div className="flex flex-col gap-xs">
                          {b.receipts.map((r, i) => (
                            <button key={i} onClick={() => openReceipt(r, o.orderNo)}
                              className="inline-flex items-center gap-xs self-start rounded-pill border border-hairline-strong bg-surface-1 px-3 py-1 font-sans text-caption text-ink hover:border-ink/40 transition-colors">
                              <Eye size={12} className="text-ink-subtle" /> <span dir="ltr">{r.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-lg py-md">
                      {b.taxInvoice ? (
                        <div className="flex items-center gap-xs flex-wrap">
                          <span className="inline-flex items-center gap-xxs rounded-pill border border-success/25 bg-success/8 px-3 py-1 font-sans text-caption text-ink">
                            <CheckCircle2 size={12} className="text-success" /> <span dir="ltr">{b.taxInvoice.name}</span>
                          </span>
                          {b.taxInvoice.url && (
                            <a href={b.taxInvoice.url} download={b.taxInvoice.name} title={pick({ en: 'Download', ar: 'تنزيل' })}
                              className="grid place-items-center w-7 h-7 rounded-md border border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/40 transition-colors">
                              <Download size={13} />
                            </a>
                          )}
                          <label title={pick({ en: 'Replace', ar: 'استبدال' })}
                            className="grid place-items-center w-7 h-7 rounded-md border border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/40 transition-colors cursor-pointer">
                            <RefreshCw size={13} />
                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachInvoice(o.orderNo, f); e.target.value = '' }} />
                          </label>
                        </div>
                      ) : (
                        <label className={buttonClass('secondary', 'sm', 'cursor-pointer')}>
                          <Upload size={14} /> {pick({ en: 'Attach tax invoice', ar: 'إرفاق الفاتورة الضريبية' })}
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachInvoice(o.orderNo, f); e.target.value = '' }} />
                        </label>
                      )}
                    </td>
                    <td className="px-lg py-md"><Pill color={sm.color} bg={sm.bg}>{pick(sm.label)}</Pill></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptPreviewModal
        item={viewReceipt}
        onClose={() => setViewReceipt(null)}
      />
    </div>
  )
}

/** Structured preview for seeded receipts that have no underlying file. */
function ReceiptPreviewModal({ item, onClose }: { item: { file: BillingFile; orderNo: string } | null; onClose: () => void }) {
  const { pick, money, locale } = useLocale()
  const order = item ? accountOrders.find((o) => o.orderNo === item.orderNo) : null
  return (
    <Modal open={!!item} onClose={onClose} size="sm" eyebrow={pick({ en: 'Payment receipt', ar: 'إيصال سداد' })} title={item?.file.name ?? ''}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      {item && order && (
        <div className="flex flex-col gap-md">
          <div className="rounded-lg border border-hairline bg-surface-2 p-lg flex flex-col items-center gap-sm text-center">
            <span className="grid place-items-center w-12 h-12 rounded-md bg-primary/10 text-primary-hover"><FileText size={22} /></span>
            <p className="font-sans text-data text-ink" dir="ltr">{item.file.name}</p>
            <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'Bank transfer receipt attached by the buyer', ar: 'إيصال تحويل بنكي أرفقه العميل' })}</p>
          </div>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            {[
              { k: pick({ en: 'Order', ar: 'الطلب' }), v: order.orderNo },
              { k: pick({ en: 'Buyer', ar: 'العميل' }), v: pick(order.buyer) },
              { k: pick({ en: 'PO number', ar: 'أمر الشراء' }), v: order.poNumber },
              { k: pick({ en: 'Order total', ar: 'إجمالي الطلب' }), v: money(order.totalMinor) },
              { k: pick({ en: 'Order date', ar: 'تاريخ الطلب' }), v: new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between px-md py-2">
                <span className="font-sans text-caption text-ink-subtle">{r.k}</span>
                <span className="font-sans text-data text-ink tabular-nums">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
