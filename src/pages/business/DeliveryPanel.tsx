import { Clock, Snowflake } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { scheduledDeliveries, accountOrders, accountOrderItems, orgAddressById } from '@/data/business'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

const statusVariant = { scheduled: 'gold', in_transit: 'gold', delivered: 'success' } as const

/** Delivery tracking, embedded at the top of the Orders tab: scheduled orders with
 *  their branch-arrival windows, plus the cold-chain assurance strip. */
export function DeliverySchedule() {
  const { t, pick } = useLocale()

  return (
    <div className="flex flex-col gap-lg">
      <div className="card p-lg">
        <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle mb-md">{t('delivery.scheduled')}</p>
        <div className="flex flex-col gap-sm">
          {scheduledDeliveries.map((d) => {
            const order = accountOrders.find((o) => o.orderNo === d.orderNo)
            const count = (accountOrderItems[d.orderNo] ?? []).reduce((n, it) => n + it.qty, 0)
            const dest = orgAddressById(d.branchId)
            const near = d.status !== 'scheduled'
            const arrivedLabel = d.status === 'delivered' ? t('delivery.deliveredOn') : t('delivery.arriving')
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
                  <p className="font-sans text-caption text-primary-hover mt-0.5 inline-flex items-center gap-xxs">
                    <Clock size={12} /> {arrivedLabel} {pick(d.dow)} · {pick(d.window)}{dest ? ` · ${pick(dest.label)}` : ''}
                  </p>
                </div>
                <StatusBadge variant={statusVariant[d.status]}>{t(`delivery.status.${d.status}`)}</StatusBadge>
              </div>
            )
          })}
        </div>
      </div>

      {/* cold-chain assurance — secondary to the schedule above */}
      <div className="rounded-xl p-lg text-ink-on-dark flex flex-col sm:flex-row sm:items-center gap-lg" style={{ backgroundColor: '#221913' }}>
        <div className="shrink-0">
          <p className="font-sans text-caption uppercase tracking-[0.12em] text-primary-bright inline-flex items-center gap-xs"><Snowflake size={14} /> {t('delivery.coldChain')}</p>
          <div className="flex items-baseline gap-xs mt-sm">
            <span className="font-serif text-display-md text-primary-bright tabular-nums leading-none">{pick({ en: '4°', ar: '٤°' })}</span>
            <span className="font-sans text-data text-ink-on-dark-muted">{t('delivery.coldChainRange')}</span>
          </div>
        </div>
        <p className="flex-1 font-sans text-caption text-ink-on-dark-muted leading-relaxed sm:border-s sm:border-hairline-dark sm:ps-lg">{t('delivery.coldChainNote')}</p>
        <div className="inline-flex items-center gap-sm shrink-0 sm:border-s sm:border-hairline-dark sm:ps-lg">
          <span className="w-2 h-2 rounded-pill bg-success" />
          <span className="font-sans text-caption text-ink-on-dark-muted whitespace-nowrap">{t('delivery.driver')}</span>
        </div>
      </div>
    </div>
  )
}
