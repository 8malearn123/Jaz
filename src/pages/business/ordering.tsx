import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ShoppingCart, ArrowRight } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useWholesaleOrder } from '@/state/WholesaleOrderContext'
import { useToast } from '@/components/account/Toast'
import {
  wholesaleProducts, wholesaleCategories, wholesaleBySku, wholesaleUnitPrice, MOQ_MINOR,
  type WholesaleProduct, type WholesaleCategory,
} from '@/data/wholesale'
import { buttonClass } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { fill, StockBadge, QtyStepper, Row } from './shared'

export const thumbBg = (accent: string, step = 9): React.CSSProperties => ({
  backgroundColor: accent,
  backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 2px, transparent 2px ${step}px)`,
})

/* ─────────── Catalog browser (categories, search, cards) ─────────── */
export function CatalogBrowser({ onOpen }: { onOpen: (sku: string) => void }) {
  const { t, pick } = useLocale()
  const [cat, setCat] = useState<WholesaleCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const shown = wholesaleProducts.filter((p) =>
    (cat === 'all' || p.category === cat) &&
    (!q || pick(p.name).toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
  )

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <h2 className="font-serif text-headline text-ink">{t('wholesale.title')}</h2>
          <p className="font-sans text-caption text-ink-subtle mt-xxs">{t('wholesale.subtitle')}</p>
        </div>
        <label className="inline-flex items-center gap-sm bg-surface-1 border border-hairline rounded-md px-md h-11 min-w-[240px] focus-within:border-primary transition-colors">
          <Search size={16} className="text-ink-subtle shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('wholesale.search')} className="flex-1 min-w-0 bg-transparent outline-none font-sans text-data text-ink" />
        </label>
      </div>

      <div className="flex flex-wrap gap-xs">
        {wholesaleCategories.map((c) => {
          const on = c.id === cat
          const count = c.id === 'all' ? wholesaleProducts.length : wholesaleProducts.filter((p) => p.category === c.id).length
          return (
            <button key={c.id} onClick={() => setCat(c.id)} className={cn('inline-flex items-center gap-xs rounded-pill border px-4 py-2 font-sans text-data transition-colors', on ? 'bg-primary text-on-primary border-primary' : 'bg-surface-1 text-ink-muted border-hairline hover:border-ink/30')}>
              {pick(c.label)} <span className={cn('rounded-pill px-1.5 text-caption tabular-nums', on ? 'bg-on-primary/15' : 'bg-surface-2 text-ink-subtle')}>{count}</span>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card border-dashed p-xxl text-center">
          <p className="font-serif text-card-title text-ink-muted">{t('wholesale.noMatches')}</p>
          <p className="font-sans text-data text-ink-subtle mt-xs">{t('wholesale.noMatchesBody')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-md">
          {shown.map((p) => <WholesaleCard key={p.sku} product={p} onOpen={() => onOpen(p.sku)} />)}
        </div>
      )}
    </div>
  )
}

function WholesaleCard({ product: p, onOpen }: { product: WholesaleProduct; onOpen: () => void }) {
  const { t, pick, money } = useLocale()
  const { qty, setQty, inc, dec } = useWholesaleOrder()
  const q = qty[p.sku] || 0
  const tierUp = q >= p.breakQty
  return (
    <div className={cn('card overflow-hidden flex flex-col transition-shadow', q > 0 ? 'ring-1 ring-primary/30 shadow-soft' : '')}>
      <div className="relative h-32" style={thumbBg(p.accent, 12)}>
        {p.badge && <span className={cn('absolute top-sm font-sans text-caption uppercase tracking-wide rounded-pill px-2.5 py-1', p.badge === 'best' ? 'bg-success text-white' : 'bg-primary-bright text-on-primary')} style={{ insetInlineStart: 12 }}>{t(`wholesale.badge.${p.badge}`)}</span>}
        <button onClick={onOpen} className="absolute bottom-sm rounded-pill bg-surface-1/90 border border-hairline px-3 py-1 font-sans text-caption text-ink hover:bg-surface-1" style={{ insetInlineEnd: 12 }}>{t('wholesale.details')} ←</button>
      </div>
      <div className="p-md flex flex-col gap-sm flex-1">
        <div className="flex items-start justify-between gap-sm">
          <div className="min-w-0">
            <p className="font-sans text-data text-ink truncate">{pick(p.name)}</p>
            <p className="font-sans text-caption text-ink-subtle tabular-nums">{p.sku} · {pick(p.unit)}</p>
          </div>
          <StockBadge stock={p.stock} />
        </div>
        <div className="flex items-end gap-md pt-sm border-t border-hairline">
          <div>
            <p className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{fill(t('wholesale.priceTo'), { n: p.breakQty - 1 })}</p>
            <p className="font-sans text-data text-ink-muted tabular-nums">{money(p.priceMinor)}</p>
          </div>
          <div>
            <p className="font-sans text-caption uppercase tracking-wide text-success">{t('wholesale.priceBulk')}</p>
            <p className="font-serif text-card-title text-success tabular-nums">{money(p.breakPriceMinor)}</p>
          </div>
          <span className={cn('ms-auto font-sans text-caption self-end whitespace-nowrap', tierUp ? 'text-success' : 'text-ink-subtle')}>{tierUp ? `${t('wholesale.tierActive')} ✓` : fill(t('wholesale.tierFrom'), { n: p.breakQty })}</span>
        </div>
        <div className="flex items-center gap-sm mt-auto pt-xs">
          <QtyStepper qty={q} onDec={() => dec(p.sku)} onInc={() => inc(p.sku)} onSet={(n) => setQty(p.sku, n)} />
          <span className="font-sans text-caption text-ink-subtle">{fill(t('wholesale.minOrder'), { n: p.minQty })}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Product detail modal (tier table reuses TierLadder scoped to the SKU) ─────────── */
export function WholesaleDetailModal({ sku, onClose }: { sku: string | null; onClose: () => void }) {
  const { t, pick } = useLocale()
  const { qty, setQty, inc, dec } = useWholesaleOrder()
  const { flash } = useToast()
  const p = sku ? wholesaleBySku(sku) : undefined
  if (!p) return null
  const q = qty[p.sku] || 0
  const add = () => { if (q < p.minQty) setQty(p.sku, p.minQty); flash(`${pick(p.name)} — ${t('wholesale.addedToOrder')}`); onClose() }

  return (
    <Modal open={!!p} onClose={onClose} size="lg" eyebrow={p.sku} title={pick(p.name)}
      footer={<>
        <QtyStepper qty={q} onDec={() => dec(p.sku)} onInc={() => inc(p.sku)} onSet={(n) => setQty(p.sku, n)} size="lg" />
        <button onClick={add} className={buttonClass('primary', 'sm', 'flex-1')}><Plus size={15} /> {t('wholesale.addToOrder')}</button>
      </>}>
      <div className="flex flex-col sm:flex-row gap-lg">
        <div className="sm:w-56 h-48 sm:h-auto rounded-lg shrink-0" style={thumbBg(p.accent, 13)} />
        <div className="flex-1 min-w-0 flex flex-col gap-md">
          <div className="flex items-center gap-sm">
            <StockBadge stock={p.stock} />
            <span className="font-sans text-caption text-ink-subtle">{pick(p.unit)}</span>
          </div>
          <p className="font-sans text-body text-ink-muted leading-relaxed">{pick(p.description)}</p>
          <TierLadder product={p} title={t('wholesale.wholesalePrices')} />
          <p className="inline-flex items-center gap-xs rounded-md bg-primary/[0.06] border border-primary/20 px-md py-2 font-sans text-caption text-primary-hover">{fill(t('wholesale.minOrderFull'), { n: p.minQty, unit: pick(p.unit) })}</p>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────── Quantity-discount tier ladder (one component; scopes to a product) ─────────── */
export function TierLadder({ product, title }: { product?: WholesaleProduct; title?: string }) {
  const { t, money } = useLocale()
  const p = product ?? wholesaleBySku('CHV70')!
  const activeQty = useWholesaleOrder().qty[p.sku] || 0
  const tierUp = activeQty >= p.breakQty
  const tiers = [
    { range: product ? fill(t('wholesale.priceTo'), { n: p.breakQty - 1 }) : fill(t('wholesale.tierRange1'), { n: p.breakQty - 1 }), price: money(p.priceMinor), active: product ? !tierUp : false },
    { range: fill(t('wholesale.tierRange2'), { n: p.breakQty }), price: money(p.breakPriceMinor), active: product ? tierUp : true },
  ]
  return (
    <div className={product ? '' : 'card p-lg'}>
      <p className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle mb-md">{title ?? t('wholesale.tierLadder')}</p>
      <div className="flex flex-col gap-xs">
        {tiers.map((tr, i) => (
          <div key={i} className={cn('flex items-center justify-between rounded-md px-md py-2.5 border', tr.active ? 'bg-success/8 border-success/25' : 'border-transparent')}>
            <span className="inline-flex items-center gap-sm">
              <span className={cn('w-2 h-2 rounded-pill', tr.active ? 'bg-success' : 'bg-hairline-strong')} />
              <span className={cn('font-sans text-data', tr.active ? 'text-ink font-medium' : 'text-ink-muted')}>{tr.range}</span>
            </span>
            <span className={cn('font-sans text-data tabular-nums', tr.active ? 'text-success font-semibold' : 'text-ink-subtle')}>{tr.price}</span>
          </div>
        ))}
      </div>
      {!product && <p className="font-sans text-caption text-ink-subtle mt-md leading-relaxed">{t('wholesale.tierLadderNote')}</p>}
    </div>
  )
}

/* ─────────── Order-summary rail: full (overview) + compact bar (catalog) ─────────── */
export function OrderRail({ variant = 'full', onReview }: { variant?: 'full' | 'compact'; onReview?: () => void }) {
  const { t, money } = useLocale()
  const { subtotalMinor, savingsMinor, vatMinor, totalMinor, moqMet, moqRemainingMinor, lineCount, commitToCart } = useWholesaleOrder()
  const { flash } = useToast()
  const navigate = useNavigate()
  const pct = Math.min(100, (subtotalMinor / (subtotalMinor + moqRemainingMinor || 1)) * 100)

  const checkout = () => {
    if (!moqMet) { flash(fill(t('wsum.moqRemaining'), { n: money(moqRemainingMinor) })); return }
    const n = commitToCart()
    flash(`${n} ${t('wsum.addedToCart')}`)
    navigate('/checkout')
  }

  if (variant === 'compact') {
    // Just the review button, floating in the corner — hidden entirely until something is selected.
    if (lineCount === 0) return null
    return (
      <button onClick={() => onReview?.()} className="fixed top-28 end-6 z-40 inline-flex items-center gap-xs rounded-pill px-5 py-3 font-sans text-button uppercase tracking-[0.06em] bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-soft-lg">
        <span className="relative inline-flex shrink-0">
          <ShoppingCart size={16} />
          <span className="absolute -top-2.5 -end-2.5 grid place-items-center min-w-[17px] h-[17px] rounded-pill bg-ink text-ink-on-dark font-sans text-[10px] tabular-nums px-1">{lineCount}</span>
        </span>
        {t('wsum.review')} <ArrowRight size={14} className="rtl:rotate-180" />
      </button>
    )
  }

  return (
    <div className="rounded-xl p-lg text-ink-on-dark" style={{ background: 'linear-gradient(160deg,#2b2019,#17120f)' }}>
      <p className="font-sans text-caption uppercase tracking-[0.12em] text-primary-bright">{t('wsum.title')}</p>
      <div className="mt-md">
        <div className="flex items-center justify-between mb-xs">
          <span className="font-sans text-caption text-ink-on-dark-muted">{t('wsum.moq')}</span>
          <span className="font-sans text-caption text-primary-bright tabular-nums">{money(MOQ_MINOR)}</span>
        </div>
        <div className="h-2.5 rounded-pill bg-hairline-dark overflow-hidden"><span className="block h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} /></div>
        <p className={cn('font-sans text-caption mt-2', moqMet ? 'text-success' : 'text-primary-bright')}>{moqMet ? `✓ ${t('wsum.moqMet')}` : fill(t('wsum.moqRemaining'), { n: money(moqRemainingMinor) })}</p>
      </div>
      <div className="my-md h-px bg-hairline-dark" />
      <div className="flex flex-col gap-2.5">
        <Row tone="dark" label={t('wsum.subtotal')} value={money(subtotalMinor)} />
        {savingsMinor > 0 && <Row tone="dark" accent label={t('wsum.savings')} value={`−${money(savingsMinor)}`} />}
        <Row tone="dark" label={t('wsum.vat')} value={money(vatMinor)} />
      </div>
      <div className="my-md h-px bg-hairline-dark" />
      <div className="flex items-baseline justify-between">
        <span className="font-sans text-data text-ink-on-dark">{t('wsum.total')}</span>
        <span className="font-serif text-headline text-primary-bright tabular-nums">{money(totalMinor)}</span>
      </div>
      <button onClick={checkout} disabled={lineCount === 0} className={cn('w-full mt-lg inline-flex items-center justify-center gap-xs rounded-md px-4 py-3 font-sans text-button uppercase tracking-[0.06em] transition-colors', moqMet ? 'bg-primary text-on-primary hover:bg-primary-hover' : 'bg-hairline-dark text-ink-on-dark-muted', lineCount === 0 && 'opacity-50 cursor-not-allowed')}>
        <ShoppingCart size={15} /> {moqMet ? t('wsum.checkout') : t('wsum.checkoutLocked')}
      </button>
      {lineCount === 0 && <p className="font-sans text-caption text-ink-on-dark-muted text-center mt-sm">{t('wsum.emptyHint')}</p>}
    </div>
  )
}

/* ─────────── Review-order popup (opened from the catalog rail) ─────────── */
export function WholesaleReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, pick, money } = useLocale()
  const { qty, setQty, inc, dec, lineCount, subtotalMinor, savingsMinor, vatMinor, totalMinor, moqMet, moqRemainingMinor, commitToCart } = useWholesaleOrder()
  const { flash } = useToast()
  const navigate = useNavigate()
  const lines = wholesaleProducts.filter((p) => (qty[p.sku] || 0) > 0)
  const pct = Math.min(100, (subtotalMinor / (subtotalMinor + moqRemainingMinor || 1)) * 100)

  const checkout = () => {
    if (!moqMet) { flash(fill(t('wsum.moqRemaining'), { n: money(moqRemainingMinor) })); return }
    const n = commitToCart(); flash(`${n} ${t('wsum.addedToCart')}`); onClose(); navigate('/checkout')
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" eyebrow={t('business.tab.overview')} title={t('wsum.review')}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Keep shopping', ar: 'متابعة التسوّق' })}</button>
        <button onClick={checkout} disabled={lineCount === 0} className={buttonClass('primary', 'sm')}><ShoppingCart size={15} /> {moqMet ? t('wsum.checkout') : t('wsum.checkoutLocked')}</button>
      </>}>
      {lineCount === 0 ? (
        <p className="font-sans text-data text-ink-subtle text-center py-lg">{t('wsum.emptyHint')}</p>
      ) : (
        <div className="flex flex-col gap-md">
          <ul className="rounded-lg border border-hairline overflow-hidden divide-y divide-hairline">
            {lines.map((p) => {
              const q = qty[p.sku]
              const unit = wholesaleUnitPrice(p, q)
              return (
                <li key={p.sku} className="flex items-center gap-md px-md py-2.5">
                  <span className="w-9 h-9 rounded-md shrink-0" style={thumbBg(p.accent)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-data text-ink truncate">{pick(p.name)}</p>
                    <p className="font-sans text-caption text-ink-subtle tabular-nums">{money(unit)} / {pick(p.unit)}</p>
                  </div>
                  <QtyStepper qty={q} onDec={() => dec(p.sku)} onInc={() => inc(p.sku)} onSet={(n) => setQty(p.sku, n)} size="sm" />
                  <span className="font-sans text-data text-ink tabular-nums w-24 text-end shrink-0">{money(unit * q, { withSymbol: false })}</span>
                </li>
              )
            })}
          </ul>

          {/* MOQ progress */}
          <div>
            <div className="flex items-center justify-between mb-xs">
              <span className="font-sans text-caption text-ink-subtle">{t('wsum.moq')}</span>
              <span className="font-sans text-caption text-primary-hover tabular-nums">{money(MOQ_MINOR)}</span>
            </div>
            <div className="h-2.5 rounded-pill bg-hairline overflow-hidden"><span className={cn('block h-full transition-all duration-300', moqMet ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} /></div>
            <p className={cn('font-sans text-caption mt-2', moqMet ? 'text-success' : 'text-primary-hover')}>{moqMet ? `✓ ${t('wsum.moqMet')}` : fill(t('wsum.moqRemaining'), { n: money(moqRemainingMinor) })}</p>
          </div>

          {/* totals */}
          <div className="flex flex-col gap-2.5 rounded-lg bg-surface-2 border border-hairline p-md">
            <Row tone="light" label={t('wsum.subtotal')} value={money(subtotalMinor)} />
            {savingsMinor > 0 && <Row tone="light" accent label={t('wsum.savings')} value={`−${money(savingsMinor)}`} />}
            <Row tone="light" label={t('wsum.vat')} value={money(vatMinor)} />
            <div className="flex items-baseline justify-between pt-xs mt-xs border-t border-hairline-strong">
              <span className="font-sans text-data text-ink">{t('wsum.total')}</span>
              <span className="font-serif text-headline text-primary-hover tabular-nums">{money(totalMinor)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
