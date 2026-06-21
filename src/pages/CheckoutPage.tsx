import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CreditCard, Landmark, Wallet, ShieldCheck, AlertTriangle, ArrowRight, Building2, User } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { useChannel, type Channel } from '@/state/ChannelContext'
import { organization, availableCreditMinor } from '@/data/organization'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { OrderSummary } from '@/components/ui/OrderSummary'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { MotifGlyph } from '@/components/brand/PatternBand'
import { cn } from '@/lib/cn'

type PayMethod = 'mada' | 'card' | 'applepay' | 'tabby' | 'tamara' | 'bank_transfer' | 'credit'

export function CheckoutPage() {
  const { t, pick, money } = useLocale()
  const { channel, persona, org } = useChannel()
  const { totalMinor, lines, clear } = useCart()
  const [placed, setPlaced] = useState(false)
  const [method, setMethod] = useState<PayMethod>('mada')

  useEffect(() => {
    // keep a sensible default method per channel
    setMethod(channel === 'b2b' ? 'credit' : 'mada')
  }, [channel])

  if (lines.length === 0 && !placed) {
    return (
      <section className="container-narrow py-section text-center min-h-[50vh] grid place-items-center">
        <div className="flex flex-col items-center gap-md">
          <h1 className="font-serif text-display-md text-ink">{t('cart.empty')}</h1>
          <Link to="/shop" className={buttonClass('primary')}>
            {t('cta.continueShopping')}
          </Link>
        </div>
      </section>
    )
  }

  if (placed) return <OrderConfirmed onReset={() => setPlaced(false)} />

  return (
    <section className="container-jaz py-xl">
      <div className="flex flex-col gap-xs mb-lg">
        <Eyebrow>{t('checkout.title')}</Eyebrow>
        <h1 className="font-serif text-display-lg text-ink">{t('checkout.title')}</h1>
      </div>

      {/* buying context — derived from the active persona (switch via /roles) */}
      <div className="inline-flex flex-col gap-xs">
        <span className="label">{t('checkout.channel')}</span>
        <div className="inline-flex items-center gap-sm rounded-md bg-surface-2 border border-hairline ps-2 pe-3 py-2">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-primary/10 text-primary-hover shrink-0">
            {channel === 'b2b' ? <Building2 size={16} /> : <User size={16} />}
          </span>
          <div className="flex flex-col">
            <span className="font-sans text-data text-ink leading-tight">{channel === 'b2b' ? t('checkout.b2b') : t('checkout.b2c')}</span>
            <span className="font-sans text-caption text-ink-subtle leading-tight">{channel === 'b2b' ? pick(org.legalName) : pick(persona.name)}</span>
          </div>
          <Link to="/roles" className="ms-sm font-sans text-caption uppercase tracking-[0.08em] text-primary-hover hover:text-ink transition-colors">
            {t('role.switch')}
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-xl items-start mt-lg">
        {/* form */}
        <div className="flex flex-col gap-xl">
          <ContactSection />
          <DeliverySection />
          {channel === 'b2b' && <PoSection />}
          <PaymentSection channel={channel} method={method} setMethod={setMethod} />
        </div>

        {/* summary + credit */}
        <div className="lg:sticky lg:top-28 flex flex-col gap-md">
          {channel === 'b2b' && method === 'credit' ? (
            <CreditCheckout baseTotalMinor={totalMinor} onPlace={() => { clear(); setPlaced(true) }} />
          ) : (
            <OrderSummary>
              <button onClick={() => { clear(); setPlaced(true) }} className={buttonClass('primary', 'md', 'w-full mt-md')}>
                {t('checkout.placeOrder')} · {money(totalMinor)}
              </button>
            </OrderSummary>
          )}
          <p className="flex items-center justify-center gap-xs font-sans text-caption text-ink-subtle">
            <ShieldCheck size={14} className="text-success" />
            {pick({ en: 'PCI-DSS · card data is tokenised, never stored', ar: 'متوافق مع PCI-DSS · بيانات البطاقة مُرمَّزة ولا تُخزَّن' })}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── form sections ─────────────── */
function FieldShell({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-baseline gap-sm">
        <span className="font-serif text-section-number text-primary">{step}</span>
        <h2 className="font-serif text-headline text-ink">{title}</h2>
      </div>
      <div className="card p-lg sm:p-xl flex flex-col gap-md">{children}</div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-xs flex-1 min-w-0">
      <span className="label">{label}</span>
      <input className="input" {...props} />
    </label>
  )
}

function ContactSection() {
  const { t } = useLocale()
  return (
    <FieldShell step="01" title={t('checkout.contact')}>
      <div className="flex flex-col sm:flex-row gap-md">
        <Field label={t('checkout.firstName')} autoComplete="given-name" defaultValue="" />
        <Field label={t('checkout.lastName')} autoComplete="family-name" />
      </div>
      <div className="flex flex-col sm:flex-row gap-md">
        <Field label={t('checkout.email')} type="email" autoComplete="email" placeholder="name@example.com" />
        <Field label={t('checkout.phone')} type="tel" inputMode="tel" placeholder="+9665XXXXXXXX" />
      </div>
    </FieldShell>
  )
}

function DeliverySection() {
  const { t } = useLocale()
  return (
    <FieldShell step="02" title={t('checkout.delivery')}>
      <div className="flex items-center gap-xs mb-xs">
        <StatusBadge variant="gold">{t('checkout.nationalAddress')}</StatusBadge>
        <span className="font-sans text-caption text-ink-subtle">SPL</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-md">
        <Field label={t('checkout.city')} placeholder="Jazan" />
        <Field label={t('checkout.district')} />
      </div>
      <Field label={t('checkout.shortAddress')} placeholder="RWAB1234" />
    </FieldShell>
  )
}

function PoSection() {
  const { t } = useLocale()
  return (
    <FieldShell step="03" title={t('checkout.poNumber')}>
      <Field label={t('checkout.poNumber')} placeholder="PO-2026-0042" />
    </FieldShell>
  )
}

/* ─────────────── payment ─────────────── */
function PaymentSection({ channel, method, setMethod }: { channel: Channel; method: PayMethod; setMethod: (m: PayMethod) => void }) {
  const { t, pick } = useLocale()
  const methods: { id: PayMethod; label: string; icon: typeof CreditCard; note?: string; b2bOnly?: boolean; b2cOnly?: boolean }[] = [
    { id: 'mada', label: t('checkout.pay.mada'), icon: CreditCard },
    { id: 'card', label: t('checkout.pay.card'), icon: CreditCard },
    { id: 'applepay', label: t('checkout.pay.applepay'), icon: Wallet, b2cOnly: true },
    { id: 'tabby', label: t('checkout.pay.tabby'), icon: Wallet, b2cOnly: true },
    { id: 'tamara', label: t('checkout.pay.tamara'), icon: Wallet, b2cOnly: true },
    { id: 'bank_transfer', label: pick({ en: 'Bank transfer / SADAD', ar: 'تحويل بنكي / سداد' }), icon: Landmark, b2bOnly: true },
    { id: 'credit', label: t('checkout.pay.credit'), icon: Landmark, note: t('checkout.pay.creditNote'), b2bOnly: true },
  ]
  const visible = methods.filter((m) => (channel === 'b2b' ? !m.b2cOnly : !m.b2bOnly))
  const step = channel === 'b2b' ? '04' : '03'

  return (
    <FieldShell step={step} title={t('checkout.payment')}>
      <div className="grid sm:grid-cols-2 gap-sm">
        {visible.map((m) => {
          const active = method === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                'flex items-center gap-sm text-start p-md rounded-md border transition-all',
                active ? 'border-primary bg-primary/8 ring-1 ring-primary/30' : 'border-hairline-strong hover:border-ink/30',
              )}
            >
              <span className={cn('grid place-items-center w-9 h-9 rounded-md shrink-0', active ? 'bg-primary text-on-primary' : 'bg-surface-2 text-ink-muted')}>
                <m.icon size={17} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="font-sans text-data text-ink truncate">{m.label}</span>
                {m.note && <span className="font-sans text-caption text-ink-subtle truncate">{m.note}</span>}
              </span>
            </button>
          )
        })}
      </div>
      {method === 'card' || method === 'mada' ? (
        <div className="flex flex-col gap-md pt-sm">
          <Field label={pick({ en: 'Card number', ar: 'رقم البطاقة' })} placeholder="4242 4242 4242 4242" inputMode="numeric" />
          <div className="flex gap-md">
            <Field label={pick({ en: 'Expiry', ar: 'الانتهاء' })} placeholder="MM/YY" />
            <Field label="CVC" placeholder="123" inputMode="numeric" />
          </div>
        </div>
      ) : null}
    </FieldShell>
  )
}

/* ─────────────── B2B credit checkout (the spine) ─────────────── */
function CreditCheckout({ baseTotalMinor, onPlace }: { baseTotalMinor: number; onPlace: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const available = availableCreditMinor(organization)
  // Let the buyer preview a larger seasonal order against the credit gate.
  const max = Math.round(available * 1.9)
  const [orderTotal, setOrderTotal] = useState(Math.min(baseTotalMinor || 5000, available))
  const [resolution, setResolution] = useState<null | 'reduce' | 'pay' | 'request'>(null)

  const over = orderTotal > available
  const shortfall = Math.max(0, orderTotal - available)

  useEffect(() => {
    if (!over) setResolution(null)
  }, [over])

  const termLabel = useMemo(() => {
    const map: Record<string, { en: string; ar: string }> = {
      net_15: { en: 'Net 15', ar: 'صافي ١٥' },
      net_30: { en: 'Net 30', ar: 'صافي ٣٠' },
      net_60: { en: 'Net 60', ar: 'صافي ٦٠' },
      prepaid: { en: 'Prepaid', ar: 'مسبق' },
    }
    return pick(map[organization.credit.paymentTerms])
  }, [pick])

  const fmtBar = (v: number) => `${Math.min(100, (v / organization.credit.limitMinor) * 100)}%`

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 overflow-hidden">
      <div className="bg-surface-2 px-lg py-md border-b border-hairline flex items-center justify-between">
        <h2 className="font-serif text-card-title text-ink">{t('credit.title')}</h2>
        <StatusBadge variant="gold">{organization.tier.toUpperCase()}</StatusBadge>
      </div>

      <div className="p-lg flex flex-col gap-md">
        {/* available meter */}
        <div className="flex flex-col gap-xs">
          <div className="flex items-center justify-between font-sans text-data">
            <span className="text-ink-muted">{t('credit.available')}</span>
            <span className="text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              {money(available)} / {money(organization.credit.limitMinor)}
            </span>
          </div>
          <div className="h-2 rounded-pill bg-canvas-cool overflow-hidden flex">
            <span className="h-full bg-danger/70" style={{ width: fmtBar(organization.credit.outstandingMinor) }} title="outstanding" />
            <span className="h-full bg-primary/70" style={{ width: fmtBar(organization.credit.reservedMinor) }} title="reserved" />
          </div>
          <div className="flex flex-wrap gap-x-md gap-y-xxs font-sans text-caption text-ink-subtle">
            <span className="inline-flex items-center gap-xxs"><Dot c="#b5403b" /> {t('credit.outstanding')} {money(organization.credit.outstandingMinor)}</span>
            <span className="inline-flex items-center gap-xxs"><Dot c="#b08a57" /> {t('credit.reserved')} {money(organization.credit.reservedMinor)}</span>
          </div>
        </div>

        {/* order amount preview */}
        <div className="flex flex-col gap-xs pt-sm border-t border-hairline">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">{pick({ en: 'This order', ar: 'هذا الطلب' })}</span>
            <span className="font-serif text-card-title text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              {money(orderTotal)}
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={max}
            step={1000}
            value={orderTotal}
            onChange={(e) => setOrderTotal(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label={pick({ en: 'Preview order amount against credit', ar: 'معاينة مبلغ الطلب مقابل الائتمان' })}
          />
          <span className="font-sans text-caption text-ink-subtle">
            {pick({ en: 'Drag to preview a larger seasonal order against your credit gate.', ar: 'اسحب لمعاينة طلبٍ موسميٍّ أكبر مقابل بوابة الائتمان.' })}
          </span>
        </div>

        {!over ? (
          /* within credit — happy path */
          <div className="flex flex-col gap-sm">
            <div className="flex items-start gap-sm rounded-md bg-success/8 border border-success/25 p-md">
              <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
              <p className="font-sans text-data text-ink-muted">
                {pick({
                  en: `Within available credit. We will reserve ${money(orderTotal)} on account and issue a ZATCA standard invoice on ${''}`,
                  ar: `ضمن الائتمان المتاح. سنحجز ${money(orderTotal)} على الحساب ونُصدر فاتورة معيارية معتمدة بشروط `,
                })}
                <strong className="text-ink"> {termLabel}</strong>.
              </p>
            </div>
            <button onClick={onPlace} className={buttonClass('primary', 'md', 'w-full')}>
              {t('checkout.placeOrder')} · {money(orderTotal)}
            </button>
          </div>
        ) : (
          /* over limit — the three governed paths */
          <div className="flex flex-col gap-sm rounded-md bg-danger/6 border border-danger/25 p-md">
            <div className="flex items-start gap-sm">
              <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-data font-medium text-ink">{t('credit.overLimit.title')}</p>
                <p className="font-sans text-caption text-ink-muted mt-0.5">{t('credit.overLimit.body')}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-sm bg-surface-1 border border-hairline px-md py-2">
              <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{t('credit.overLimit.shortfall')}</span>
              <span className="font-serif text-card-title text-danger tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                {money(shortfall)}
              </span>
            </div>

            <div className="flex flex-col gap-xs">
              <PathButton active={resolution === 'reduce'} onClick={() => { setResolution('reduce'); setOrderTotal(available) }} label={t('credit.overLimit.reduce')} />
              <PathButton active={resolution === 'pay'} onClick={() => setResolution('pay')} label={t('credit.overLimit.payExcess')} />
              <PathButton active={resolution === 'request'} onClick={() => setResolution('request')} label={t('credit.overLimit.requestMore')} highlight />
            </div>

            {resolution === 'pay' && (
              <div className="rounded-md bg-surface-1 border border-hairline p-md flex flex-col gap-xs animate-fade-up">
                <div className="flex items-center justify-between font-sans text-data">
                  <span className="text-ink-muted">{pick({ en: 'Reserve on account', ar: 'حجز على الحساب' })}</span>
                  <span className="tabular-nums">{money(available)}</span>
                </div>
                <div className="flex items-center justify-between font-sans text-data">
                  <span className="text-ink-muted">{pick({ en: 'Pay now · mada / card', ar: 'ادفع الآن · مدى / بطاقة' })}</span>
                  <span className="tabular-nums text-ink">{money(shortfall)}</span>
                </div>
                <button onClick={onPlace} className={buttonClass('primary', 'sm', 'w-full mt-xs')}>
                  {pick({ en: 'Pay excess & place order', ar: 'ادفع الفائض وأكّد الطلب' })}
                </button>
              </div>
            )}

            {resolution === 'request' && <LimitIncreaseForm requestedMinor={Math.ceil(orderTotal / 100000) * 100000} />}
          </div>
        )}
      </div>
    </div>
  )
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block w-2 h-2 rounded-pill" style={{ backgroundColor: c }} />
}

function PathButton({ label, onClick, active, highlight }: { label: string; onClick: () => void; active?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-sm text-start px-md py-3 rounded-md border transition-all font-sans text-data',
        active
          ? 'border-primary bg-primary/10 text-ink'
          : highlight
            ? 'border-primary/40 bg-surface-1 text-ink hover:bg-primary/5'
            : 'border-hairline-strong bg-surface-1 text-ink-muted hover:text-ink hover:border-ink/30',
      )}
    >
      {label}
      <ArrowRight size={15} className={cn('rtl:rotate-180', active ? 'text-primary' : 'text-ink-subtle')} />
    </button>
  )
}

function LimitIncreaseForm({ requestedMinor }: { requestedMinor: number }) {
  const { t, money, locale } = useLocale()
  const [sent, setSent] = useState(false)
  const [amount, setAmount] = useState(requestedMinor)
  const [justification, setJustification] = useState('')

  if (sent) {
    return (
      <div className="rounded-md bg-success/8 border border-success/25 p-md flex items-start gap-sm animate-fade-up">
        <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
        <div>
          <p className="font-sans text-data font-medium text-ink">{t('credit.app.submitted')}</p>
          <p className="font-sans text-caption text-ink-muted mt-0.5">{t('credit.app.submittedBody')}</p>
          <p className="font-sans text-caption text-ink-subtle mt-xs">
            {t('credit.app.requested')}: <span className="tabular-nums">{money(amount)}</span> · {organization.salesRep[locale]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSent(true) }}
      className="rounded-md bg-surface-1 border border-hairline p-md flex flex-col gap-sm animate-fade-up"
    >
      <p className="font-serif text-card-title text-ink">{t('credit.app.title')}</p>
      <label className="flex flex-col gap-xs">
        <span className="label">{t('credit.app.requested')}</span>
        <input
          type="number"
          value={Math.round(amount / 100)}
          onChange={(e) => setAmount(Number(e.target.value) * 100)}
          step={1000}
          className="input"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        />
      </label>
      <label className="flex flex-col gap-xs">
        <span className="label">{t('credit.app.justification')}</span>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={2}
          placeholder={t('credit.app.justificationPlaceholder')}
          className="input resize-none"
        />
      </label>
      <p className="font-sans text-caption text-ink-subtle leading-relaxed">{t('credit.overLimit.requestNote')}</p>
      <button type="submit" className={buttonClass('dark', 'sm', 'w-full')}>
        {t('credit.app.submit')}
      </button>
    </form>
  )
}

/* ─────────────── confirmation ─────────────── */
function OrderConfirmed({ onReset }: { onReset: () => void }) {
  const { t, pick } = useLocale()
  const orderNo = 'JAZ-2026-' + String(Math.floor(100000 + Math.random() * 800000))
  return (
    <section className="container-narrow py-section min-h-[60vh] grid place-items-center text-center">
      <div className="flex flex-col items-center gap-md max-w-lg">
        <span className="grid place-items-center w-20 h-20 rounded-pill bg-success/12 text-success">
          <CheckCircle2 size={36} />
        </span>
        <MotifGlyph motif="jasmine" size={28} />
        <h1 className="font-serif text-display-md text-ink">{t('checkout.orderPlaced')}</h1>
        <p className="text-body-lg text-ink-muted">{t('checkout.orderPlacedBody')}</p>
        <div className="w-full rounded-lg border border-hairline bg-surface-1 overflow-hidden mt-sm">
          <WaveDivider tone="gold" height={14} />
          <div className="p-lg flex items-center justify-between">
            <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">{pick({ en: 'Order number', ar: 'رقم الطلب' })}</span>
            <span className="font-sans text-body text-ink tabular-nums">{orderNo}</span>
          </div>
        </div>
        <div className="flex gap-sm mt-sm">
          <Link to="/shop" onClick={onReset} className={buttonClass('primary')}>
            {t('cta.continueShopping')}
          </Link>
          <Link to="/account" onClick={onReset} className={buttonClass('secondary')}>
            {t('nav.account')}
          </Link>
        </div>
      </div>
    </section>
  )
}
