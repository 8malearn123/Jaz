import { Clock, Snowflake, MapPin } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { scheduledPickups, accountOrders, accountOrderItems } from '@/data/business'
import { plantSite, pickupNotice } from '@/data/fulfilment'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

const statusVariant = { scheduled: 'gold', ready: 'gold', collected: 'success' } as const

/** Fulfilment, embedded at the top of the Orders tab. Wholesale is collected at the
 *  plant rather than delivered, so an order carries a slot to come and take it — the
 *  cold chain still matters, it just has to hold from the line to the buyer's own truck. */
export function DeliverySchedule() {
  const { t, pick } = useLocale()

  return (
    <div className="flex flex-col gap-lg">
      {/* the rule, stated before the schedule that follows from it */}
      <div className="rounded-lg border border-hairline bg-surface-2 px-lg py-md flex items-start gap-sm">
        <MapPin size={15} className="shrink-0 mt-0.5 text-primary-hover" />
        <div className="min-w-0">
          <p className="font-sans text-data text-ink">{pick(pickupNotice)}</p>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick(plantSite.region)} · {pick(plantSite.hours)}</p>
        </div>
      </div>

      <div className="card p-lg">
        <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle mb-md">{t('pickup.scheduled')}</p>
        <div className="flex flex-col gap-sm">
          {scheduledPickups.map((d) => {
            const order = accountOrders.find((o) => o.orderNo === d.orderNo)
            const count = (accountOrderItems[d.orderNo] ?? []).reduce((n, it) => n + it.qty, 0)
            const near = d.status !== 'scheduled'
            const whenLabel = d.status === 'collected' ? t('pickup.collectedOn') : t('pickup.collectFrom')
            return (
              <div
                key={d.orderNo}
                className={cn('flex items-center gap-md rounded-lg border p-md', near ? 'border-primary/25 bg-primary/[0.03]' : 'border-hairline')}
              >
                <div className="w-12 text-center shrink-0">
                  <div className={cn('font-serif text-headline tabular-nums leading-none', near ? 'text-primary-hover' : 'text-ink-muted')}>{d.day}</div>
                  <div className="font-sans text-caption text-ink-subtle mt-0.5">{pick(d.dow)}</div>
                </div>
                <span className="w-px self-stretch bg-hairline" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm">
                    <span className="font-sans text-data text-ink tabular-nums">{d.orderNo}</span>
                    <span className="font-sans text-caption text-ink-subtle">· {count} {t('orders.items')}</span>
                  </div>
                  <p className="font-sans text-caption text-ink-muted truncate mt-0.5">{order ? pick(order.summary) : ''}</p>
                  <p className="font-sans text-caption text-ink-subtle mt-0.5 inline-flex items-center gap-xxs">
                    <Clock size={12} /> {whenLabel} {pick(d.window)} · {pick(plantSite.label)}
                  </p>
                </div>
                <StatusBadge variant={statusVariant[d.status]}>{t(`pickup.status.${d.status}`)}</StatusBadge>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg bg-surface-dark-1 border border-hairline-dark p-lg flex flex-col sm:flex-row gap-lg">
        <div className="sm:w-56 shrink-0">
          <p className="font-sans text-caption uppercase tracking-[0.12em] text-primary-bright inline-flex items-center gap-xs"><Snowflake size={14} /> {t('delivery.coldChain')}</p>
          <div className="mt-sm">
            <span className="font-serif text-headline text-ink-on-dark tabular-nums">{t('delivery.coldChainTemp')}</span>
            <span className="font-sans text-data text-ink-on-dark-muted">{t('delivery.coldChainRange')}</span>
          </div>
        </div>
        <p className="flex-1 font-sans text-caption text-ink-on-dark-muted leading-relaxed sm:border-s sm:border-hairline-dark sm:ps-lg">{t('pickup.coldChainNote')}</p>
      </div>
    </div>
  )
}
