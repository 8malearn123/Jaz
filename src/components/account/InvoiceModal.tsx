import { Download, ShieldCheck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCustomer } from '@/state/CustomerContext'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import type { Bilingual, Flavor } from '@/data/types'
import type { CustomerOrder } from '@/data/account'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { Wordmark } from '@/components/brand/Wordmark'
import { FauxQR } from '@/components/brand/FauxQR'

const VAT_RATE = 0.15

export function InvoiceModal({ order, open, onClose }: { order: CustomerOrder | null; open: boolean; onClose: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const { name, addresses } = useCustomer()

  if (!order) return null
  const billTo = addresses.find((a) => a.isDefault) ?? addresses[0]

  type InvoiceLine = { title: Bilingual; flavor: Flavor; weight: number; qty: number; unit: number; total: number }
  const lines: InvoiceLine[] = order.items
    .map((it): InvoiceLine | null => {
      const found = variantById(it.variantId)
      if (!found) return null
      const unit = found.variant.retailPriceMinor
      return { title: found.product.title, flavor: flavors[found.product.flavorId], weight: found.variant.netWeightG, qty: it.qty, unit, total: unit * it.qty }
    })
    .filter((l): l is InvoiceLine => l !== null)

  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const vat = Math.round(subtotal * VAT_RATE)
  const total = subtotal + vat
  const invoiceNo = order.orderNo.replace('JAZ-', 'INV-')
  const qrPayload = `${invoiceNo}|JAZ Chocolate|VAT:300012345600003|${money(total, { withSymbol: false })}|${order.placedAt}`

  const download = () => {
    const doc = {
      invoiceNo, type: 'b2c_simplified', issuedAt: order.placedAt, seller: 'JAZ Chocolate Food Industries Co.', vat_number: '300012345600003',
      buyer: name.en, lines: lines.map((l) => ({ item: l.title.en, qty: l.qty, unit_minor: l.unit, total_minor: l.total })),
      subtotal_minor: subtotal, vat_minor: vat, total_minor: total, currency: 'SAR', zatca_status: order.coldChain ? 'reported' : 'reported',
    }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoiceNo}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow={t('inv.taxInvoice')}
      title={invoiceNo}
      footer={
        <>
          <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>
          <button onClick={download} className={buttonClass('primary', 'sm')}>
            <Download size={15} /> {t('inv.download')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-lg">
        {/* header */}
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-xs">
            <Wordmark tone="gold" size="md" />
            <p className="font-sans text-caption text-ink-muted leading-relaxed">
              {pick({ en: 'JAZ Chocolate Food Industries Co.', ar: 'شركة جاز للصناعات الغذائية' })}<br />
              {pick({ en: 'Abu Arish, Jazan, KSA', ar: 'أبو عريش، جازان، السعودية' })}<br />
              {t('inv.vatNo')}: 300012345600003
            </p>
          </div>
          <div className="text-end flex flex-col items-end gap-xs">
            <StatusBadge variant="success">
              <ShieldCheck size={12} /> {t('inv.zatca.reported')}
            </StatusBadge>
            <p className="font-sans text-caption text-ink-subtle">
              {t('inv.type.b2c_simplified')}<br />
              {new Date(order.placedAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* bill to */}
        <div className="rounded-lg bg-surface-2 border border-hairline p-md">
          <p className="eyebrow text-ink-subtle mb-xxs">{t('inv.billTo')}</p>
          <p className="font-serif text-body text-ink">{pick(name)}</p>
          {billTo && <p className="font-sans text-caption text-ink-muted">{pick(billTo.district)}, {pick(billTo.city)} · {billTo.shortAddress}</p>}
        </div>

        {/* lines */}
        <div className="overflow-hidden rounded-lg border border-hairline">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-2 text-start">
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
                    <span className="font-sans text-data text-ink">{pick(l.title)}</span>
                    <span className="block font-sans text-caption text-ink-subtle">{pick(l.flavor.name)} · {l.weight}{locale === 'ar' ? ' غ' : 'g'}</span>
                  </td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{l.qty}</td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink-muted tabular-nums hidden sm:table-cell">{money(l.unit, { withSymbol: false })}</td>
                  <td className="px-md py-2.5 text-end font-sans text-data text-ink tabular-nums">{money(l.total, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* totals + QR */}
        <div className="flex flex-col sm:flex-row gap-lg items-start justify-between">
          <div className="flex flex-col items-center gap-xs">
            <FauxQR value={qrPayload} size={104} className="rounded-md border border-hairline" />
            <span className="font-sans text-caption text-ink-subtle">{t('inv.qrNote')}</span>
          </div>
          <div className="w-full sm:w-64 flex flex-col gap-xs">
            <Row label={t('cart.subtotal')} value={money(subtotal)} />
            <Row label={t('cart.vat')} value={money(vat)} />
            <div className="flex items-center justify-between pt-xs mt-xs border-t border-hairline-strong">
              <span className="font-serif text-card-title text-ink">{t('cart.total')}</span>
              <span className="font-serif text-card-title text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{money(total)}</span>
            </div>
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
