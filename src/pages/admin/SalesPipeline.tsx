import { useState } from 'react'
import { Plus, ArrowRight, X, CalendarClock, TrendingUp, Wallet, Trophy } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { salesPipeline, type PipelineQuote } from '@/data/staff'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

type Stage = PipelineQuote['stage']
const COLUMNS: Stage[] = ['draft', 'sent', 'accepted', 'won']
const NEXT: Record<string, Stage> = { draft: 'sent', sent: 'accepted', accepted: 'won' }
const ACTION_KEY: Record<string, string> = { draft: 'pipe.send', sent: 'pipe.accept', accepted: 'pipe.convert' }

export function SalesPipeline() {
  const { t, pick, money } = useLocale()
  const [items, setItems] = useState<PipelineQuote[]>(salesPipeline)

  const advance = (id: string) => setItems((p) => p.map((q) => (q.id === id && NEXT[q.stage] ? { ...q, stage: NEXT[q.stage] } : q)))
  const markLost = (id: string) => setItems((p) => p.map((q) => (q.id === id ? { ...q, stage: 'lost' } : q)))

  const openValue = items.filter((q) => q.stage === 'draft' || q.stage === 'sent' || q.stage === 'accepted').reduce((s, q) => s + q.valueMinor, 0)
  const wonValue = items.filter((q) => q.stage === 'won').reduce((s, q) => s + q.valueMinor, 0)
  const wonCount = items.filter((q) => q.stage === 'won').length
  const lostCount = items.filter((q) => q.stage === 'lost').length
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0
  const lost = items.filter((q) => q.stage === 'lost')

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('pipe.title')}</h2>
        <button className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('quotes.request')}</button>
      </div>

      {/* metrics */}
      <div className="grid gap-md sm:grid-cols-3">
        <Metric icon={Wallet} label={t('pipe.openValue')} value={money(openValue)} tone="gold" />
        <Metric icon={Trophy} label={t('pipe.wonValue')} value={money(wonValue)} />
        <Metric icon={TrendingUp} label={t('pipe.winRate')} value={`${winRate}%`} />
      </div>

      {/* board */}
      <div className="flex gap-md overflow-x-auto no-scrollbar pb-sm -mx-lg px-lg lg:mx-0 lg:px-0">
        {COLUMNS.map((stage) => {
          const col = items.filter((q) => q.stage === stage)
          const total = col.reduce((s, q) => s + q.valueMinor, 0)
          return (
            <div key={stage} className="flex flex-col gap-sm w-[270px] shrink-0">
              <div className="flex items-center justify-between px-xs">
                <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.1em] text-ink">
                  <span className={cn('w-2 h-2 rounded-pill', stage === 'won' ? 'bg-success' : stage === 'accepted' ? 'bg-primary' : stage === 'sent' ? 'bg-brand-blue' : 'bg-hairline-strong')} />
                  {t(`pipe.stage.${stage}`)}
                  <span className="text-ink-subtle">· {col.length}</span>
                </span>
                <span className="font-sans text-caption text-ink-subtle tabular-nums">{money(total, { withSymbol: false })}</span>
              </div>
              <div className="flex flex-col gap-sm min-h-[80px] rounded-lg bg-surface-2/60 border border-hairline p-sm">
                {col.length === 0 ? (
                  <p className="font-sans text-caption text-ink-subtle text-center py-md">{t('pipe.empty')}</p>
                ) : (
                  col.map((q) => <Card key={q.id} quote={q} onAdvance={() => advance(q.id)} onLost={() => markLost(q.id)} />)
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* lost / closed */}
      {lost.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-lg py-md bg-surface-2 border-b border-hairline">
            <h3 className="font-serif text-card-title text-ink">{t('pipe.lostSection')} · {lost.length}</h3>
          </div>
          <ul className="divide-y divide-hairline">
            {lost.map((q) => (
              <li key={q.id} className="flex items-center gap-md px-lg py-md opacity-70">
                <X size={16} className="text-ink-subtle shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-data text-ink truncate">{q.ref} · {pick(q.account)}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate">{pick(q.note)}</p>
                </div>
                <span className="font-sans text-data text-ink-subtle tabular-nums line-through">{money(q.valueMinor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Card({ quote, onAdvance, onLost }: { quote: PipelineQuote; onAdvance: () => void; onLost: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const isWon = quote.stage === 'won'
  return (
    <div className="rounded-md bg-surface-1 border border-hairline p-md flex flex-col gap-xs shadow-lift">
      <div className="flex items-center justify-between gap-sm">
        <span className="font-sans text-caption text-ink-subtle">{quote.ref}</span>
        {isWon && <StatusBadge variant="success">{t('pipe.stage.won')}</StatusBadge>}
      </div>
      <p className="font-serif text-card-title text-ink leading-snug">{pick(quote.account)}</p>
      <p className="font-sans text-caption text-ink-muted line-clamp-2">{pick(quote.note)}</p>
      <div className="flex items-center justify-between gap-sm pt-xxs">
        <span className="font-serif text-body text-ink tabular-nums">{money(quote.valueMinor)}</span>
        <span className="inline-flex items-center gap-xxs font-sans text-caption text-ink-subtle">
          <CalendarClock size={12} /> {new Date(quote.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      {!isWon && (
        <div className="flex items-center gap-xs pt-xs border-t border-hairline mt-xxs">
          <button onClick={onAdvance} className={buttonClass('primary', 'sm', 'flex-1')}>
            {t(ACTION_KEY[quote.stage])} <ArrowRight size={13} className="rtl:rotate-180" />
          </button>
          <button onClick={onLost} className="grid place-items-center w-8 h-8 rounded-md text-ink-subtle hover:text-danger hover:bg-danger/5 transition-colors" aria-label={t('pipe.markLost')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone = 'ink' }: { icon: typeof Wallet; label: string; value: string; tone?: 'ink' | 'gold' }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', tone === 'gold' && 'ring-1 ring-primary/30 bg-primary/[0.04]')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs"><Icon size={17} /></span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', tone === 'gold' ? 'text-primary-hover' : 'text-ink')}>{value}</span>
    </div>
  )
}
