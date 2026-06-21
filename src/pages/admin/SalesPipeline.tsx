import { useState } from 'react'
import {
  Plus, ArrowRight, X, CalendarClock, TrendingUp, Wallet, Trophy, Target,
  Clock, Check,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { salesPipeline, salesQuotaMinor, orgDirectory, type PipelineQuote } from '@/data/staff'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

type Stage = PipelineQuote['stage']
const COLUMNS: Stage[] = ['draft', 'sent', 'accepted', 'won']
const NEXT: Record<string, Stage> = { draft: 'sent', sent: 'accepted', accepted: 'won' }
const ACTION_KEY: Record<string, string> = { draft: 'pipe.send', sent: 'pipe.accept', accepted: 'pipe.convert' }
const STAGE_PROB: Record<Stage, number> = { draft: 0.2, sent: 0.5, accepted: 0.8, won: 1, lost: 0 }
const STALE_DAYS = 10
const TODAY = new Date('2026-06-21')
const ageDays = (d: string) => Math.max(0, Math.round((TODAY.getTime() - new Date(d).getTime()) / 86400000))
const stageDot: Record<Stage, string> = { won: 'bg-success', accepted: 'bg-primary', sent: 'bg-brand-blue', draft: 'bg-hairline-strong', lost: 'bg-danger' }

export function SalesPipeline() {
  const { t, money } = useLocale()
  const [items, setItems] = useState<PipelineQuote[]>(salesPipeline)
  const [newOpen, setNewOpen] = useState(false)
  const [detail, setDetail] = useState<PipelineQuote | null>(null)

  const advance = (id: string) => setItems((p) => p.map((q) => (q.id === id && NEXT[q.stage] ? { ...q, stage: NEXT[q.stage] } : q)))
  const markLost = (id: string) => setItems((p) => p.map((q) => (q.id === id ? { ...q, stage: 'lost' } : q)))
  const addDeal = (q: PipelineQuote) => setItems((p) => [q, ...p])

  const open = items.filter((q) => q.stage === 'draft' || q.stage === 'sent' || q.stage === 'accepted')
  const openValue = open.reduce((s, q) => s + q.valueMinor, 0)
  const weighted = open.reduce((s, q) => s + q.valueMinor * STAGE_PROB[q.stage], 0)
  const won = items.filter((q) => q.stage === 'won')
  const wonValue = won.reduce((s, q) => s + q.valueMinor, 0)
  const attainment = Math.round((wonValue / salesQuotaMinor) * 100)

  // keep the detail card in sync with edits
  const live = detail ? items.find((q) => q.id === detail.id) ?? null : null

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('pipe.title')}</h2>
        <button onClick={() => setNewOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {t('pipe.newDeal')}</button>
      </div>

      {/* metrics */}
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Wallet} label={t('pipe.openValue')} value={money(openValue)} tone="gold" />
        <Metric icon={TrendingUp} label={t('pipe.weighted')} value={money(weighted)} />
        <Metric icon={Trophy} label={t('pipe.wonValue')} value={money(wonValue)} sub={`${won.length} ${t('pipe.deals')}`} />
        <QuotaMetric attained={wonValue} quota={salesQuotaMinor} pct={attainment} />
      </div>

      {/* board */}
      <div className="flex gap-md overflow-x-auto no-scrollbar pb-sm -mx-lg px-lg lg:mx-0 lg:px-0">
        {COLUMNS.map((stage) => {
          const col = items.filter((q) => q.stage === stage)
          const total = col.reduce((s, q) => s + q.valueMinor, 0)
          return (
            <div key={stage} className="flex flex-col gap-sm w-[280px] shrink-0">
              <div className="flex items-center justify-between px-xs">
                <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.1em] text-ink">
                  <span className={cn('w-2 h-2 rounded-pill', stageDot[stage])} />
                  {t(`pipe.stage.${stage}`)}
                  <span className="text-ink-subtle">· {col.length}</span>
                </span>
                <span className="font-sans text-caption text-ink-subtle tabular-nums">{money(total, { withSymbol: false })}</span>
              </div>
              <div className="flex flex-col gap-sm min-h-[80px] rounded-lg bg-surface-2/60 border border-hairline p-sm">
                {col.length === 0 ? (
                  <p className="font-sans text-caption text-ink-subtle text-center py-md">{t('pipe.empty')}</p>
                ) : (
                  col.map((q) => <Card key={q.id} quote={q} onOpen={() => setDetail(q)} onAdvance={() => advance(q.id)} onLost={() => markLost(q.id)} />)
                )}
              </div>
            </div>
          )
        })}
      </div>

      <LostSection items={items} />

      <NewDealModal open={newOpen} onClose={() => setNewOpen(false)} onAdd={addDeal} />
      <DealDetailModal quote={live} onClose={() => setDetail(null)} onAdvance={() => live && advance(live.id)} onLost={() => { if (live) { markLost(live.id) } }} />
    </div>
  )
}

function Card({ quote, onOpen, onAdvance, onLost }: { quote: PipelineQuote; onOpen: () => void; onAdvance: () => void; onLost: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const isWon = quote.stage === 'won'
  const age = ageDays(quote.createdAt)
  const stale = !isWon && age > STALE_DAYS
  return (
    <div className="rounded-md bg-surface-1 border border-hairline p-md flex flex-col gap-xs shadow-lift">
      <div className="flex items-center justify-between gap-sm">
        <button onClick={onOpen} className="font-sans text-caption text-ink-subtle hover:text-primary-hover">{quote.ref}</button>
        {isWon ? <StatusBadge variant="success">{t('pipe.stage.won')}</StatusBadge>
          : stale ? <span className="inline-flex items-center gap-xxs font-sans text-caption text-danger"><Clock size={11} /> {age}{t('pipe.daysShort')}</span>
          : <span className="font-sans text-caption text-ink-subtle tabular-nums">{age}{t('pipe.daysShort')}</span>}
      </div>
      <button onClick={onOpen} className="text-start">
        <p className="font-serif text-card-title text-ink leading-snug hover:text-primary-hover transition-colors">{pick(quote.account)}</p>
      </button>
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

function LostSection({ items }: { items: PipelineQuote[] }) {
  const { t, pick, money } = useLocale()
  const lost = items.filter((q) => q.stage === 'lost')
  if (lost.length === 0) return null
  return (
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
  )
}

function DealDetailModal({ quote, onClose, onAdvance, onLost }: { quote: PipelineQuote | null; onClose: () => void; onAdvance: () => void; onLost: () => void }) {
  const { t, pick, money, locale } = useLocale()
  if (!quote) return null
  const isWon = quote.stage === 'won'
  const isLost = quote.stage === 'lost'
  const age = ageDays(quote.createdAt)
  const prob = Math.round(STAGE_PROB[quote.stage] * 100)

  return (
    <Modal open onClose={onClose} size="md" eyebrow={quote.ref} title={pick(quote.account)}
      footer={isWon || isLost ? <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>
        : <>
          <button onClick={() => { onLost(); onClose() }} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><X size={15} /> {t('pipe.markLost')}</button>
          <button onClick={onAdvance} className={buttonClass('primary', 'sm')}>{t(ACTION_KEY[quote.stage])} <ArrowRight size={14} className="rtl:rotate-180" /></button>
        </>}>
      <div className="flex flex-col gap-md">
        <div className="flex items-center gap-sm">
          <span className={cn('w-2.5 h-2.5 rounded-pill', stageDot[quote.stage])} />
          <StatusBadge variant={isWon ? 'success' : isLost ? 'danger' : quote.stage === 'accepted' ? 'gold' : 'neutral'}>{t(`pipe.stage.${quote.stage}`)}</StatusBadge>
          {!isWon && !isLost && <span className="font-sans text-caption text-ink-subtle">· {prob}% {t('pipe.probability')}</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
          <Detail label={t('pipe.dealValue')} value={money(quote.valueMinor)} emphasis />
          <Detail label={t('pipe.weightedValue')} value={money(Math.round(quote.valueMinor * STAGE_PROB[quote.stage]))} />
          <Detail label={t('pipe.age')} value={`${age} ${t('pipe.daysShort')}`} />
          <Detail label={t('quotes.validUntil')} value={new Date(quote.validUntil).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
          <Detail label={t('accts.title')} value={pick(quote.account)} />
        </div>

        <div className="rounded-md bg-surface-2 border border-hairline p-md">
          <p className="font-sans text-caption uppercase tracking-wide text-ink-subtle mb-xxs">{t('rfq.notes')}</p>
          <p className="font-sans text-data text-ink-muted">{pick(quote.note)}</p>
        </div>

        {isWon && (
          <div className="rounded-md bg-success/8 border border-success/25 p-md inline-flex items-center gap-sm">
            <Check size={16} className="text-success" /> <span className="font-sans text-data text-ink">{t('pipe.wonNote')}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

function NewDealModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (q: PipelineQuote) => void }) {
  const { t, pick } = useLocale()
  const [accountId, setAccountId] = useState('')
  const [value, setValue] = useState('')
  const [validUntil, setValidUntil] = useState('2026-07-31')
  const [note, setNote] = useState('')
  const valid = accountId && Number(value) > 0
  const submit = () => {
    const acct = orgDirectory.find((o) => o.id === accountId)!
    onAdd({
      id: `pq-${Date.now()}`, ref: 'RFQ-2026-' + String(Math.floor(1000 + Math.random() * 8999)),
      account: acct.name, accountId, stage: 'draft', valueMinor: Number(value) * 100,
      createdAt: '2026-06-21', validUntil, note: { en: note || 'New opportunity', ar: note || 'فرصة جديدة' },
    })
    setAccountId(''); setValue(''); setNote(''); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} size="md" eyebrow={t('pipe.title')} title={t('pipe.newDeal')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('pipe.createDeal')}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label">{t('accts.title')}</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input cursor-pointer">
            <option value="">{t('pipe.selectAccount')}</option>
            {orgDirectory.map((o) => <option key={o.id} value={o.id}>{pick(o.name)}</option>)}
          </select>
        </label>
        <div className="flex flex-col sm:flex-row gap-md">
          <label className="flex flex-col gap-xs flex-1">
            <span className="label">{t('pipe.dealValue')} (SAR)</span>
            <input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="50000" className="input" />
          </label>
          <label className="flex flex-col gap-xs flex-1">
            <span className="label">{t('quotes.validUntil')}</span>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="input" />
          </label>
        </div>
        <label className="flex flex-col gap-xs">
          <span className="label">{t('rfq.notes')}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('pipe.notePlaceholder')} className="input resize-none" />
        </label>
      </div>
    </Modal>
  )
}

/* ── pieces ── */
function Metric({ icon: Icon, label, value, sub, tone = 'ink' }: { icon: typeof Wallet; label: string; value: string; sub?: string; tone?: 'ink' | 'gold' }) {
  return (
    <div className={cn('card p-lg flex flex-col gap-xs', tone === 'gold' && 'ring-1 ring-primary/30 bg-primary/[0.04]')}>
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs"><Icon size={17} /></span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-headline tabular-nums', tone === 'gold' ? 'text-primary-hover' : 'text-ink')}>{value}</span>
      {sub && <span className="font-sans text-caption text-ink-subtle">{sub}</span>}
    </div>
  )
}

function QuotaMetric({ attained, quota, pct }: { attained: number; quota: number; pct: number }) {
  const { t, money } = useLocale()
  const tone = pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-primary' : 'bg-danger'
  return (
    <div className="card p-lg flex flex-col gap-xs">
      <span className="grid place-items-center w-9 h-9 rounded-md bg-primary/10 text-primary-hover mb-xxs"><Target size={17} /></span>
      <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{t('pipe.quota')}</span>
      <span className="font-serif text-headline tabular-nums text-ink">{pct}%</span>
      <div className="h-1.5 rounded-pill bg-canvas-cool overflow-hidden mt-xxs">
        <span className={cn('block h-full rounded-pill', tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="font-sans text-caption text-ink-subtle tabular-nums">{money(attained, { withSymbol: false })} / {money(quota, { withSymbol: false })}</span>
    </div>
  )
}

function Detail({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{label}</span>
      <span className={cn('font-serif text-card-title tabular-nums', emphasis ? 'text-primary-hover' : 'text-ink')}>{value}</span>
    </div>
  )
}
