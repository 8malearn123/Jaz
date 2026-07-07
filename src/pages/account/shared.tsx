import { Link } from 'react-router-dom'
import { Package, ArrowRight } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { customer, DEMO_TODAY, type CustomerOrder, type TrackStep } from '@/data/account'
import { variantById } from '@/data/products'
import { flavors } from '@/data/flavors'
import { ProductArt } from '@/components/brand/ProductArt'
import { buttonClass } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, tint } from '@/lib/cn'

/** Status → StatusBadge variant, shared by Overview and Orders. */
export const statusVariant: Record<CustomerOrder['status'], 'gold' | 'success' | 'neutral'> = {
  confirmed: 'gold', processing: 'gold', shipped: 'gold', out_for_delivery: 'gold', delivered: 'success', cancelled: 'neutral',
}

/** Whole days between the demo "today" and an ISO date (never negative). */
export function daysUntil(dateISO: string): number {
  const today = new Date(DEMO_TODAY + 'T00:00:00')
  const target = new Date(dateISO + 'T00:00:00')
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000))
}

/** Tinted square thumbnail for an order's first item. */
export function OrderThumb({ order, size = 14 }: { order: CustomerOrder; size?: number }) {
  const first = variantById(order.items[0]?.variantId)
  const flavor = first ? flavors[first.product.flavorId] : flavors.milk
  return (
    <span
      className={cn('shrink-0 rounded-md overflow-hidden border border-hairline', size === 12 ? 'w-12 h-12' : 'w-14 h-14')}
      style={{ backgroundColor: tint(flavor.accent, 14) }}
    >
      {first && <ProductArt flavorId={first.product.flavorId} kind={first.product.type === 'gift_box' ? 'box' : 'bar'} branded={false} />}
    </span>
  )
}

/**
 * Compact horizontal step tracker (from the prototype's live-tracking view).
 * Reads the same TrackStep[] used by the vertical timeline.
 */
export function HStepTracker({ steps, showTimes = false }: { steps: TrackStep[]; showTimes?: boolean }) {
  const { t, locale } = useLocale()
  return (
    <div className="flex items-start">
      {steps.map((s, i) => {
        const reached = s.done || s.current
        const isFirst = i === 0
        const isLast = i === steps.length - 1
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center min-w-0">
            <div className="flex items-center w-full">
              <span className={cn('flex-1 h-0.5 rounded-pill', isFirst ? 'bg-transparent' : reached ? 'bg-primary-hover' : 'bg-hairline-strong')} />
              <span
                className={cn(
                  'shrink-0 rounded-pill',
                  s.current ? 'w-4 h-4 bg-primary ring-4 ring-primary/20' : s.done ? 'w-3.5 h-3.5 bg-primary-hover' : 'w-3.5 h-3.5 bg-surface-1 border-2 border-hairline-strong',
                )}
              />
              <span className={cn('flex-1 h-0.5 rounded-pill', isLast ? 'bg-transparent' : s.done ? 'bg-primary-hover' : 'bg-hairline-strong')} />
            </div>
            <div className={cn('mt-2 text-center leading-tight font-sans text-caption px-0.5', s.current ? 'text-primary-hover font-semibold' : reached ? 'text-ink' : 'text-ink-subtle')}>
              {t(`orders.status.${s.key}`)}
            </div>
            {showTimes && s.at && (
              <div className="mt-0.5 text-center font-sans text-caption text-ink-subtle tabular-nums">
                {new Date(s.at).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Labelled text input used across address and profile forms. */
export function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="flex flex-col gap-xs flex-1">
      <span className="label">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </label>
  )
}

/** Confirm/deny dialog shared by subscriptions and privacy. */
export function ConfirmDialog({ open, onClose, title, body, confirmLabel, onConfirm, danger, eyebrow }: {
  open: boolean; onClose: () => void; title: string; body: string; confirmLabel: string; onConfirm: () => void; danger?: boolean; eyebrow?: string
}) {
  const { t } = useLocale()
  return (
    <Modal open={open} onClose={onClose} title={title} eyebrow={eyebrow} size="sm"
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={onConfirm} className={danger ? 'btn btn-sm bg-danger text-on-danger hover:bg-danger/90' : buttonClass('primary', 'sm')}>{confirmLabel}</button>
      </>}>
      <p className="font-sans text-body text-ink-muted leading-relaxed">{body}</p>
    </Modal>
  )
}

/** Empty-state card shared by orders, subscriptions and wishlist. */
export function EmptyState({ icon: Icon, title, body, cta }: { icon: typeof Package; title: string; body: string; cta?: { to: string; label: string } }) {
  return (
    <div className="card p-xxl flex flex-col items-center text-center gap-sm">
      <span className="grid place-items-center w-16 h-16 rounded-pill bg-surface-2 border border-hairline text-ink-subtle"><Icon size={26} /></span>
      <h3 className="font-serif text-headline text-ink">{title}</h3>
      {body && <p className="text-body text-ink-muted max-w-sm">{body}</p>}
      {cta && <Link to={cta.to} className={buttonClass('primary', 'md', 'mt-xs')}>{cta.label} <ArrowRight size={15} className="rtl:rotate-180" /></Link>}
    </div>
  )
}

// re-export the seed for panels that read static order/data slices
export { customer }
