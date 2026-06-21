import { useMemo } from 'react'
import { Trophy, Percent, Wallet, TrendingUp } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { salesPipeline, salesQuotaMinor, salesWonByMonth, orgDirectory, type PipelineQuote } from '@/data/staff'
import { AreaTrend, UtilizationGauge, RankedBars } from '@/components/charts/Charts'
import { cn } from '@/lib/cn'

const STAGE_PROB: Record<PipelineQuote['stage'], number> = { draft: 0.2, sent: 0.5, accepted: 0.8, won: 1, lost: 0 }

export function SalesPerformance() {
  const { t, pick, money } = useLocale()

  const won = salesPipeline.filter((q) => q.stage === 'won')
  const lost = salesPipeline.filter((q) => q.stage === 'lost')
  const open = salesPipeline.filter((q) => ['draft', 'sent', 'accepted'].includes(q.stage))
  const wonValue = won.reduce((s, q) => s + q.valueMinor, 0)
  const weightedOpen = open.reduce((s, q) => s + q.valueMinor * STAGE_PROB[q.stage], 0)
  const forecast = wonValue + weightedOpen
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0
  const avgDeal = won.length ? Math.round(wonValue / won.length) : 0
  const attainment = Math.round((wonValue / salesQuotaMinor) * 100)
  const remaining = Math.max(0, salesQuotaMinor - wonValue)

  const byStage = (['draft', 'sent', 'accepted'] as const).map((stage) => ({
    label: t(`pipe.stage.${stage}`),
    value: open.filter((q) => q.stage === stage).reduce((s, q) => s + q.valueMinor * STAGE_PROB[stage], 0),
  }))

  const byAccount = useMemo(() => {
    const map = new Map<string, number>()
    salesPipeline.filter((q) => q.stage !== 'lost').forEach((q) => map.set(q.accountId, (map.get(q.accountId) ?? 0) + q.valueMinor))
    return [...map.entries()].map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v)
  }, [])

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h2 className="font-serif text-headline text-ink">{t('perf.title')}</h2>
        <p className="font-sans text-data text-ink-muted mt-xxs">{t('perf.subtitle')}</p>
      </div>

      <div className="grid gap-md grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Trophy} label={t('pipe.wonValue')} value={money(wonValue)} sub={`${won.length} ${t('pipe.deals')}`} tone="gold" />
        <Kpi icon={Percent} label={t('pipe.winRate')} value={`${winRate}%`} sub={`${won.length}/${won.length + lost.length}`} />
        <Kpi icon={Wallet} label={t('perf.avgDeal')} value={money(avgDeal)} />
        <Kpi icon={TrendingUp} label={t('perf.forecast')} value={money(forecast)} sub={t('perf.forecastSub')} />
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-lg items-center card p-lg">
        <div className="grid place-items-center">
          <UtilizationGauge
            segments={[{ value: wonValue, color: '#b08a57' }, { value: remaining, color: '#e7ddc9' }]}
            centerValue={`${attainment}%`}
            centerLabel={t('pipe.quota')}
          />
        </div>
        <div className="flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{t('perf.quotaTitle')}</h3>
          <div className="grid grid-cols-3 gap-md">
            <Legend color="#b08a57" label={t('perf.attained')} value={money(wonValue)} />
            <Legend color="#e7ddc9" label={t('perf.remaining')} value={money(remaining)} />
            <Legend label={t('pipe.quota')} value={money(salesQuotaMinor)} />
          </div>
          <p className="font-sans text-caption text-ink-subtle">{t('perf.quotaNote')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-lg items-start">
        <div className="card p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-card-title text-ink">{t('perf.wonTrend')}</h3>
            <span className="font-sans text-caption text-ink-subtle">{t('oa.last8months').replace('8', '6')}</span>
          </div>
          <AreaTrend points={salesWonByMonth.map((m) => m.valueMinor)} labels={salesWonByMonth.map((m) => pick(m.month))} format={(v) => money(v)} />
        </div>
        <div className="card p-lg flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{t('perf.byStage')}</h3>
          <RankedBars rows={byStage.map((s) => ({ label: s.label, value: s.value, display: money(s.value) }))} />
        </div>
      </div>

      <div className="card p-lg flex flex-col gap-md">
        <h3 className="font-serif text-card-title text-ink">{t('perf.topAccounts')}</h3>
        <RankedBars
          accent="#8a6b3f"
          rows={byAccount.map((a) => ({ label: pick(orgDirectory.find((o) => o.id === a.id)?.name ?? { en: a.id, ar: a.id }), value: a.v, display: money(a.v) }))}
        />
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, tone = 'ink' }: { icon: typeof Wallet; label: string; value: string; sub?: string; tone?: 'ink' | 'gold' }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', tone === 'gold' && 'ring-1 ring-primary/30 bg-primary/[0.04]')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs"><Icon size={17} /></span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', tone === 'gold' ? 'text-primary-hover' : 'text-ink')}>{value}</span>
      {sub && <span className="font-sans text-caption text-ink-subtle tabular-nums">{sub}</span>}
    </div>
  )
}

function Legend({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-wide text-ink-subtle">
        {color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />}{label}
      </span>
      <span className="font-serif text-card-title text-ink tabular-nums">{value}</span>
    </div>
  )
}
