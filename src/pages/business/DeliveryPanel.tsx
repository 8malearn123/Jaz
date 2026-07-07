import { MapPin, Clock, Snowflake } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { scheduledDeliveries, accountOrders, accountOrderItems, orgAddresses, orgAddressById } from '@/data/business'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

const statusVariant = { scheduled: 'gold', in_transit: 'gold', delivered: 'success' } as const

export function DeliveryPanel({ onTab }: { onTab?: (id: string) => void }) {
  const { t, pick } = useLocale()
  const branch = orgAddresses.find((a) => a.type === 'shipping' && a.isDefault) ?? orgAddresses[0]

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="font-serif text-headline text-ink">{t('delivery.title')}</h2>
        <p className="font-sans text-caption text-ink-subtle mt-xxs">{t('delivery.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-lg">
        {/* schedule — full width, the priority */}
        <div className="card p-lg">
          <div className="flex items-center gap-md pb-lg border-b border-hairline">
            <span className="grid place-items-center w-12 h-12 rounded-lg bg-primary text-on-primary shrink-0"><MapPin size={22} /></span>
            <div className="min-w-0">
              <p className="font-serif text-card-title text-ink">{pick(branch.label)}</p>
              <p className="font-sans text-caption text-ink-subtle">{pick(branch.district)}, {pick(branch.city)} · {branch.shortAddress}</p>
            </div>
          </div>

          <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle mt-lg mb-md">{t('delivery.scheduled')}</p>
          <div className="flex flex-col gap-sm">
            {scheduledDeliveries.map((d) => {
              const order = accountOrders.find((o) => o.orderNo === d.orderNo)
              const count = (accountOrderItems[d.orderNo] ?? []).reduce((n, it) => n + it.qty, 0)
              const dest = orgAddressById(d.branchId)
              const near = d.status !== 'scheduled'
              const arrivedLabel = d.status === 'delivered' ? t('delivery.deliveredOn') : t('delivery.arriving')
              return (
                <button
                  key={d.orderNo}
                  onClick={() => onTab?.('orders')}
                  className={cn('flex items-center gap-md text-start rounded-lg border p-md transition-colors hover:border-primary/50', near ? 'border-primary/25 bg-primary/[0.03]' : 'border-hairline')}
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
                </button>
              )
            })}
          </div>
        </div>

        {/* cold-chain assurance — full-width banner, secondary to the schedule above */}
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
    </div>
  )
}
