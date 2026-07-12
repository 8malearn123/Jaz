import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CreditCard, Landmark, Wallet, ShieldCheck, AlertTriangle, MapPin, Plus, Pencil, Gift, ExternalLink, Lock } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { useChannel, type Channel } from '@/state/ChannelContext'
import { customer } from '@/data/account'
import { organization, availableCreditMinor } from '@/data/organization'
import { members, orgAddresses } from '@/data/business'
import { variantById } from '@/data/products'
import type { Bilingual } from '@/data/types'
import { openPrintWindow } from '@/lib/printWindow'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { OrderSummary } from '@/components/ui/OrderSummary'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { MotifGlyph } from '@/components/brand/PatternBand'
import { cn } from '@/lib/cn'

type PayMethod = 'mada' | 'card' | 'applepay' | 'tabby' | 'tamara' | 'bank_transfer' | 'credit'

export function CheckoutPage() {
  const { t, pick, money } = useLocale()
  const { channel } = useChannel()
  const { totalMinor, lines, clear, unitPrice } = useCart()
  const [placed, setPlaced] = useState(false)
  const [method, setMethod] = useState<PayMethod>('mada')
  // Bank-transfer receipt (B2B): attached in the same flow, required before placing the order.
  const [receipt, setReceipt] = useState<string | null>(null)
  // B2C never collects card data on-site — checkout hands off to the payment gateway.
  const [gatewayOpen, setGatewayOpen] = useState(false)
  // Snapshot of the order at placement, so the confirmation screen can print an invoice.
  const [snap, setSnap] = useState<OrderSnap | null>(null)

  const place = () => {
    const items = lines
      .map((l) => { const found = variantById(l.variantId); return found ? { title: found.product.title, qty: l.qty, unitMinor: unitPrice(l.variantId, l.qty) } : null })
      .filter(Boolean) as OrderSnap['items']
    setSnap({ orderNo: 'JAZ-2026-' + String(Math.floor(100000 + Math.random() * 800000)), items, totalMinor })
    clear()
    setPlaced(true)
  }

  useEffect(() => {
    // keep a sensible default method per channel
    setMethod(channel === 'b2b' ? 'credit' : 'mada')
    setReceipt(null)
  }, [channel])

  const needsReceipt = channel === 'b2b' && method === 'bank_transfer' && !receipt

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

  if (placed) return <OrderConfirmed onReset={() => setPlaced(false)} order={snap} />

  return (
    <section className="container-jaz py-xl">
      <div className="flex flex-col gap-xs mb-lg">
        <Eyebrow>{t('checkout.title')}</Eyebrow>
        <h1 className="font-serif text-display-lg text-ink">{t('checkout.title')}</h1>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-xl items-start">
        {/* form */}
        <div className="flex flex-col gap-xl">
          <ContactSection channel={channel} />
          <DeliverySection channel={channel} />
          <PaymentSection channel={channel} method={method} setMethod={setMethod} receipt={receipt} setReceipt={setReceipt} />
        </div>

        {/* summary + credit */}
        <div className="lg:sticky lg:top-28 flex flex-col gap-md">
          {channel === 'b2b' && method === 'credit' ? (
            <CreditCheckout baseTotalMinor={totalMinor} onPlace={place} />
          ) : (
            <OrderSummary>
              {/* B2C: hand off to the payment gateway; B2B bank transfer places directly (receipt attached) */}
              <button onClick={() => (channel === 'b2b' ? place() : setGatewayOpen(true))} disabled={needsReceipt} className={buttonClass('primary', 'md', cn('w-full mt-md', needsReceipt && 'opacity-50 cursor-not-allowed'))}>
                {channel === 'b2b' ? <>{t('checkout.placeOrder')} · {money(totalMinor)}</> : <><ExternalLink size={15} /> {pick({ en: 'Continue to payment', ar: 'المتابعة إلى الدفع' })} · {money(totalMinor)}</>}
              </button>
              {needsReceipt && <p className="font-sans text-caption text-danger text-center mt-xs">{pick({ en: 'Attach the transfer receipt before placing the order.', ar: 'أرفق إيصال التحويل قبل إرسال الطلب.' })}</p>}
            </OrderSummary>
          )}
          <p className="flex items-center justify-center gap-xs font-sans text-caption text-ink-subtle">
            <ShieldCheck size={14} className="text-success" />
            {pick({ en: 'PCI-DSS · payment completes at the secure gateway, nothing stored here', ar: 'متوافق مع PCI-DSS · الدفع يتم لدى وسيط الدفع الآمن ولا يُخزَّن شيء هنا' })}
          </p>
        </div>
      </div>

      {gatewayOpen && (
        <PaymentGatewayModal
          methodLabel={method === 'mada' ? t('checkout.pay.mada') : method === 'card' ? t('checkout.pay.card') : method === 'applepay' ? t('checkout.pay.applepay') : method === 'tabby' ? t('checkout.pay.tabby') : t('checkout.pay.tamara')}
          amountMinor={totalMinor}
          onClose={() => setGatewayOpen(false)}
          onSuccess={() => { setGatewayOpen(false); place() }}
        />
      )}
    </section>
  )
}

// Order snapshot captured at placement — powers the confirmation-screen invoice.
interface OrderSnap { orderNo: string; items: { title: Bilingual; qty: number; unitMinor: number }[]; totalMinor: number }

/** Simulated hand-off to the external payment gateway: a short redirect phase,
 *  then the gateway screen where the payment is completed. */
function PaymentGatewayModal({ methodLabel, amountMinor, onClose, onSuccess }: { methodLabel: string; amountMinor: number; onClose: () => void; onSuccess: () => void }) {
  const { pick, money } = useLocale()
  const [phase, setPhase] = useState<'redirecting' | 'pay'>('redirecting')
  useEffect(() => {
    const id = setTimeout(() => setPhase('pay'), 1400)
    return () => clearTimeout(id)
  }, [])

  return (
    <Modal open onClose={onClose} size="sm" eyebrow={pick({ en: 'Secure payment', ar: 'دفع آمن' })} title={pick({ en: 'Payment gateway', ar: 'بوابة وسيط الدفع' })}
      footer={phase === 'pay' ? <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel & return', ar: 'إلغاء والعودة' })}</button> : undefined}>
      {phase === 'redirecting' ? (
        <div className="flex flex-col items-center gap-md py-lg text-center">
          <span className="w-10 h-10 rounded-pill border-[3px] border-primary border-t-transparent animate-spin" />
          <p className="font-sans text-data text-ink">{pick({ en: 'Redirecting you to the secure payment gateway…', ar: 'جارٍ تحويلك إلى بوابة وسيط الدفع الآمنة…' })}</p>
          <p className="font-sans text-caption text-ink-subtle inline-flex items-center gap-xxs"><Lock size={12} /> {pick({ en: 'Encrypted connection', ar: 'اتصال مشفّر' })}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            <div className="flex items-center justify-between px-md py-2.5">
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Payment method', ar: 'وسيلة الدفع' })}</span>
              <span className="font-sans text-data text-ink">{methodLabel}</span>
            </div>
            <div className="flex items-center justify-between px-md py-2.5">
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Amount', ar: 'المبلغ' })}</span>
              <span className="font-sans text-data text-ink tabular-nums">{money(amountMinor)}</span>
            </div>
            <div className="flex items-center justify-between px-md py-2.5">
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Merchant', ar: 'التاجر' })}</span>
              <span className="font-sans text-data text-ink">JAZ Chocolate</span>
            </div>
          </div>
          <button onClick={onSuccess} className={buttonClass('primary', 'md', 'w-full')}>
            <Lock size={15} /> {pick({ en: 'Complete payment', ar: 'إتمام الدفع' })} · {money(amountMinor)}
          </button>
          <p className="font-sans text-caption text-ink-subtle text-center">{pick({ en: 'You complete the payment on the gateway — Jaz never sees your card data.', ar: 'تُتم الدفع لدى وسيط الدفع — جاز لا تطّلع على بيانات بطاقتك إطلاقًا.' })}</p>
        </div>
      )}
    </Modal>
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

function ContactSection({ channel }: { channel: Channel }) {
  const { t, pick } = useLocale()
  const b2c = channel === 'b2c'
  const [editing, setEditing] = useState(false)

  // We already know who the buyer is — the signed-in customer, or the business account's admin.
  const admin = members.find((m) => m.role === 'b2b_admin') ?? members[0]
  const known: { name: string; email: string; phone: string | null; org: string | null } = b2c
    ? { name: pick(customer.name), email: customer.email, phone: customer.phone, org: null }
    : { name: pick(admin.name), email: admin.email, phone: null, org: pick(organization.legalName) }

  // Show what we have — don't re-ask.
  if (!editing) {
    const initials = known.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
    return (
      <FieldShell step="01" title={t('checkout.contact')}>
        <div className="flex items-center gap-md">
          <span className="grid place-items-center w-12 h-12 rounded-pill bg-primary/10 border border-primary/20 text-primary-hover font-serif text-card-title shrink-0">{initials}</span>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-data text-ink truncate">{known.name}{known.org && <span className="text-ink-subtle"> · {known.org}</span>}</p>
            <p className="font-sans text-caption text-ink-subtle truncate">{known.email}{known.phone && <> · <span className="tabular-nums" dir="ltr">{known.phone}</span></>}</p>
          </div>
          <button onClick={() => setEditing(true)} className={buttonClass('ghost', 'sm')}><Pencil size={14} /> {t('addr.edit')}</button>
        </div>
      </FieldShell>
    )
  }

  const [first, ...rest] = known.name.split(' ')
  return (
    <FieldShell step="01" title={t('checkout.contact')}>
      <div className="flex flex-col sm:flex-row gap-md">
        <Field label={t('checkout.firstName')} autoComplete="given-name" defaultValue={first ?? ''} />
        <Field label={t('checkout.lastName')} autoComplete="family-name" defaultValue={rest.join(' ')} />
      </div>
      <div className="flex flex-col sm:flex-row gap-md">
        <Field label={t('checkout.email')} type="email" autoComplete="email" placeholder="name@example.com" defaultValue={known.email} />
        <Field label={t('checkout.phone')} type="tel" inputMode="tel" placeholder="+9665XXXXXXXX" defaultValue={known.phone ?? ''} />
      </div>
    </FieldShell>
  )
}

function AddressForm() {
  const { t } = useLocale()
  return (
    <>
      <div className="flex items-center gap-xs mb-xs">
        <StatusBadge variant="gold">{t('checkout.nationalAddress')}</StatusBadge>
        <span className="font-sans text-caption text-ink-subtle">SPL</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-md">
        <Field label={t('checkout.city')} placeholder="Jazan" />
        <Field label={t('checkout.district')} />
      </div>
      <Field label={t('checkout.shortAddress')} placeholder="RWAB1234" />
    </>
  )
}

function DeliverySection({ channel }: { channel: Channel }) {
  const { t } = useLocale()
  const b2c = channel === 'b2c'
  const [mode, setMode] = useState<'me' | 'gift'>('me')

  // Reuse the account's known addresses — the customer's saved ones for B2C, the org's branches for B2B.
  const addresses = b2c ? customer.addresses : orgAddresses.filter((a) => a.type === 'shipping')

  // No saved addresses on either side → plain manual entry.
  if (addresses.length === 0) {
    return <FieldShell step="02" title={t('checkout.delivery')}><AddressForm /></FieldShell>
  }

  // B2B ships to its own branches — pick one, no gift mode.
  if (!b2c) {
    return (
      <FieldShell step="02" title={t('checkout.delivery')}>
        <SavedAddressPicker addresses={addresses} />
      </FieldShell>
    )
  }

  return (
    <FieldShell step="02" title={t('checkout.delivery')}>
      <div className="inline-flex self-start rounded-md border border-hairline-strong p-0.5">
        <SegBtn active={mode === 'me'} onClick={() => setMode('me')} icon={MapPin} label={t('checkout.deliverToMe')} />
        <SegBtn active={mode === 'gift'} onClick={() => setMode('gift')} icon={Gift} label={t('checkout.sendAsGift')} />
      </div>
      {mode === 'me' ? <SavedAddressPicker addresses={addresses} /> : <GiftRecipientPicker />}
    </FieldShell>
  )
}

function SegBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof MapPin; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('inline-flex items-center gap-xs px-md py-2 rounded-sm font-sans text-data transition-colors', active ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink')}
    >
      <Icon size={15} /> {label}
    </button>
  )
}

function SavedAddressPicker({ addresses }: { addresses: { id: string; label: Bilingual; city: Bilingual; district: Bilingual; shortAddress: string; isDefault: boolean }[] }) {
  const { t, pick } = useLocale()
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0]
  const [selectedId, setSelectedId] = useState<string>(defaultAddr?.id ?? 'new')
  const usingNew = selectedId === 'new'

  return (
    <div className="flex flex-col gap-md">
      <span className="label !mb-0">{t('checkout.savedAddresses')}</span>
      <div className="grid sm:grid-cols-2 gap-sm">
        {addresses.map((a) => {
          const active = selectedId === a.id
          return (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={cn('text-start p-md rounded-md border transition-all flex flex-col gap-xs', active ? 'border-primary bg-primary/8 ring-1 ring-primary/30' : 'border-hairline-strong hover:border-ink/30')}
            >
              <span className="flex items-center justify-between gap-sm">
                <span className="inline-flex items-center gap-xs font-serif text-card-title text-ink"><MapPin size={16} className="text-primary-hover" /> {pick(a.label)}</span>
                {a.isDefault && <StatusBadge variant="gold">{t('addr.default')}</StatusBadge>}
              </span>
              <span className="font-sans text-caption text-ink-muted">{pick(a.district)}, {pick(a.city)} · {a.shortAddress}</span>
            </button>
          )
        })}
        <button
          onClick={() => setSelectedId('new')}
          className={cn('text-start p-md rounded-md border border-dashed transition-all flex items-center gap-sm font-sans text-data', usingNew ? 'border-primary bg-primary/8 ring-1 ring-primary/30 text-ink' : 'border-hairline-strong text-ink-muted hover:border-ink/30 hover:text-ink')}
        >
          <Plus size={16} /> {t('checkout.useNewAddress')}
        </button>
      </div>
      {usingNew && <div className="flex flex-col gap-md pt-sm animate-fade-up"><AddressForm /></div>}
    </div>
  )
}

function GiftRecipientPicker() {
  const { t, pick } = useLocale()
  const recipients = customer.giftRecipients
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? '')
  const [anon, setAnon] = useState(recipients[0]?.anonymous ?? false)
  const selected = recipients.find((r) => r.id === recipientId)
  const pickRecipient = (r: (typeof recipients)[number]) => { setRecipientId(r.id); setAnon(r.anonymous) }

  if (recipients.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-hairline-strong p-lg text-center flex flex-col items-center gap-sm">
        <Gift size={22} className="text-ink-subtle" />
        <p className="font-sans text-data text-ink-muted">{t('checkout.noRecipients')}</p>
        <Link to="/account?tab=addresses" className={buttonClass('secondary', 'sm')}>{t('checkout.addRecipient')}</Link>
      </div>
    )
  }

  const who = selected ? pick(selected.name) : ''
  const me = pick(customer.name)

  return (
    <div className="flex flex-col gap-md">
      <span className="label !mb-0">{t('checkout.chooseRecipient')}</span>
      <div className="grid sm:grid-cols-2 gap-sm">
        {recipients.map((r) => {
          const active = r.id === recipientId
          const initials = pick(r.name).split(' ').map((w) => w[0]).slice(0, 2).join('')
          return (
            <button
              key={r.id}
              onClick={() => pickRecipient(r)}
              className={cn('text-start p-md rounded-md border transition-all flex items-center gap-sm', active ? 'border-primary bg-primary/8 ring-1 ring-primary/30' : 'border-hairline-strong hover:border-ink/30')}
            >
              <span className="grid place-items-center w-10 h-10 rounded-pill bg-primary/10 border border-primary/20 text-primary-hover font-serif text-card-title shrink-0">{initials}</span>
              <span className="flex flex-col min-w-0">
                <span className="font-sans text-data text-ink truncate">{pick(r.name)} <span className="text-ink-subtle">· {pick(r.relation)}</span></span>
                <span className="font-sans text-caption text-ink-muted truncate">{pick(r.district)}, {pick(r.city)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <label className="flex items-center gap-sm cursor-pointer">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="w-4 h-4 accent-primary" />
        <span className="font-sans text-data text-ink-muted">{t('checkout.giftAnon')}</span>
      </label>

      <label className="flex flex-col gap-xs">
        <span className="label">{t('checkout.giftMessage')}</span>
        <textarea rows={2} placeholder={t('checkout.giftMessagePlaceholder')} className="input resize-none" />
      </label>

      {selected && (
        <p className="font-sans text-caption text-ink-subtle inline-flex items-center gap-xs">
          <Gift size={13} className="text-primary-hover" />
          {anon
            ? pick({ en: `Arrives to ${who} from “a well-wisher”.`, ar: `تصل إلى ${who} من «فاعل خير».` })
            : pick({ en: `Arrives to ${who} from ${me}.`, ar: `تصل إلى ${who} باسمك.` })}
        </p>
      )}
    </div>
  )
}

/* ─────────────── payment ─────────────── */
// B2B pays by bank transfer (receipt attached in the same flow) or on credit terms — no cards.
function PaymentSection({ channel, method, setMethod, receipt, setReceipt }: { channel: Channel; method: PayMethod; setMethod: (m: PayMethod) => void; receipt: string | null; setReceipt: (r: string | null) => void }) {
  const { t, pick } = useLocale()
  const methods: { id: PayMethod; label: string; icon: typeof CreditCard; note?: string; b2bOnly?: boolean; b2cOnly?: boolean }[] = [
    { id: 'mada', label: t('checkout.pay.mada'), icon: CreditCard, b2cOnly: true },
    { id: 'card', label: t('checkout.pay.card'), icon: CreditCard, b2cOnly: true },
    { id: 'applepay', label: t('checkout.pay.applepay'), icon: Wallet, b2cOnly: true },
    { id: 'tabby', label: t('checkout.pay.tabby'), icon: Wallet, b2cOnly: true },
    { id: 'tamara', label: t('checkout.pay.tamara'), icon: Wallet, b2cOnly: true },
    { id: 'bank_transfer', label: pick({ en: 'Bank transfer / SADAD', ar: 'تحويل بنكي / سداد' }), icon: Landmark, note: pick({ en: 'Attach the transfer receipt below', ar: 'يُرفق إيصال التحويل بالأسفل' }), b2bOnly: true },
    { id: 'credit', label: t('checkout.pay.credit'), icon: Landmark, note: t('checkout.pay.creditNote'), b2bOnly: true },
  ]
  const visible = methods.filter((m) => (channel === 'b2b' ? !m.b2cOnly : !m.b2bOnly))
  const step = '03'

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
      {/* No card fields on-site — payment completes at the payment gateway. */}
      {channel !== 'b2b' && (
        <div className="flex items-start gap-sm rounded-md bg-surface-2 border border-hairline px-md py-sm">
          <ExternalLink size={16} className="text-primary-hover mt-0.5 shrink-0" />
          <p className="font-sans text-caption text-ink-muted">
            {pick({ en: 'After confirming, you are redirected to the secure payment gateway to complete the payment with your chosen method. No card data is entered or stored here.', ar: 'بعد التأكيد سيتم تحويلك إلى بوابة وسيط الدفع الآمنة لإتمام العملية بالوسيلة التي اخترتها — لا تُدخل أي بيانات بطاقة هنا ولا تُخزَّن.' })}
          </p>
        </div>
      )}

      {/* bank transfer: the receipt is attached in the same flow, required before placing the order */}
      {channel === 'b2b' && method === 'bank_transfer' && (
        <div className="flex flex-col gap-xs pt-sm border-t border-hairline">
          <span className="label">{pick({ en: 'Transfer receipt', ar: 'إيصال التحويل' })}</span>
          {receipt ? (
            <div className="flex items-center justify-between gap-sm rounded-md bg-success/8 border border-success/25 px-md py-sm">
              <span className="inline-flex items-center gap-xs font-sans text-data text-ink min-w-0"><CheckCircle2 size={16} className="text-success shrink-0" /> <span className="truncate" dir="ltr">{receipt}</span></span>
              <button type="button" onClick={() => setReceipt(null)} className="font-sans text-caption text-danger hover:underline shrink-0">{pick({ en: 'Remove', ar: 'إزالة' })}</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-xs rounded-md border-2 border-dashed border-hairline-strong hover:border-primary/50 transition-colors px-md py-lg cursor-pointer text-center">
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setReceipt(f.name); e.target.value = '' }} />
              <span className="font-sans text-data text-ink">{pick({ en: 'Attach the transfer receipt (image or PDF)', ar: 'أرفق إيصال التحويل (صورة أو PDF)' })}</span>
              <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'Required before placing the order', ar: 'إلزامي قبل إرسال الطلب' })}</span>
            </label>
          )}
        </div>
      )}
    </FieldShell>
  )
}

/* ─────────────── B2B credit checkout (the spine) ─────────────── */
function CreditCheckout({ baseTotalMinor, onPlace }: { baseTotalMinor: number; onPlace: () => void }) {
  const { t, pick, money, locale } = useLocale()
  const available = availableCreditMinor(organization)
  // The real cart total — no previews or simulations, just confirm the order.
  const orderTotal = baseTotalMinor
  const over = orderTotal > available
  const shortfall = Math.max(0, orderTotal - available)

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

        {/* the actual order total — nothing to tweak, just confirm */}
        <div className="flex items-center justify-between pt-sm border-t border-hairline">
          <span className="label !mb-0">{pick({ en: 'This order', ar: 'هذا الطلب' })}</span>
          <span className="font-serif text-card-title text-ink tabular-nums" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {money(orderTotal)}
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
          /* over limit — shortfall + a direct limit-increase request */
          <div className="flex flex-col gap-sm rounded-md bg-danger/6 border border-danger/25 p-md">
            <div className="flex items-start gap-sm">
              <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-data font-medium text-ink">{t('credit.overLimit.title')}</p>
                <p className="font-sans text-caption text-ink-muted mt-0.5">{t('credit.overLimit.shortfall')}: <span className="tabular-nums text-danger">{money(shortfall)}</span></p>
              </div>
            </div>
            <LimitIncreaseForm requestedMinor={Math.ceil(orderTotal / 100000) * 100000} />
          </div>
        )}
      </div>
    </div>
  )
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block w-2 h-2 rounded-pill" style={{ backgroundColor: c }} />
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
function OrderConfirmed({ onReset, order }: { onReset: () => void; order: { orderNo: string; items: { title: Bilingual; qty: number; unitMinor: number }[]; totalMinor: number } | null }) {
  const { t, pick, money, locale } = useLocale()
  const orderNo = order?.orderNo ?? 'JAZ-2026-' + String(Math.floor(100000 + Math.random() * 800000))

  // Printable invoice for the confirmed order — the browser's "Save as PDF" produces the file.
  const downloadInvoice = () => {
    if (!order) return
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    const L = (en: string, ar: string) => (locale === 'ar' ? ar : en)
    const subtotal = Math.round(order.totalMinor / 1.15)
    const vat = order.totalMinor - subtotal
    const rows = order.items.map((it) => `<tr><td>${pick(it.title)}</td><td>${it.qty}</td><td>${money(it.unitMinor)}</td><td>${money(it.unitMinor * it.qty)}</td></tr>`).join('')
    openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${orderNo}</title><style>
      @page{size:A4 portrait;margin:15mm}
      html,body{margin:0;width:auto}
      *{box-sizing:border-box}
      body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#2b2b2b;-webkit-print-color-adjust:exact}
      h1{font-size:20px;margin:0 0 4px} .sub{color:#777;font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;word-break:break-word;text-align:${locale === 'ar' ? 'right' : 'left'}}
      th{background:#f3efe8}
      .totals{margin-top:14px;font-size:13px} .totals div{display:flex;justify-content:space-between;padding:3px 0}
      .totals .net{font-weight:700;font-size:15px;border-top:1px solid #ccc;padding-top:8px;margin-top:6px}
      .foot{margin-top:24px;font-size:11px;color:#999}
      @media print{body{padding:0}}
    </style></head><body>
      <h1>${L('Tax invoice', 'فاتورة ضريبية')} ${orderNo}</h1>
      <div class="sub">Jaz · ${L('ZATCA compliant', 'متوافقة مع هيئة الزكاة والضريبة والجمارك')}</div>
      <table><thead><tr><th>${L('Item', 'الصنف')}</th><th>${L('Qty', 'الكمية')}</th><th>${L('Unit price', 'سعر الوحدة')}</th><th>${L('Total', 'الإجمالي')}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        <div><span>${L('Subtotal', 'المجموع الفرعي')}</span><span>${money(subtotal)}</span></div>
        <div><span>${L('VAT 15%', 'ضريبة القيمة المضافة ١٥٪')}</span><span>${money(vat)}</span></div>
        <div class="net"><span>${L('Total', 'الإجمالي')}</span><span>${money(order.totalMinor)}</span></div>
      </div>
      <div class="foot">${L('Issued from the Jaz store.', 'صدرت من متجر جاز.')}</div>
    </body></html>`)
  }

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
        <div className="flex flex-wrap justify-center gap-sm mt-sm">
          <Link to="/shop" onClick={onReset} className={buttonClass('primary')}>
            {t('cta.continueShopping')}
          </Link>
          {order && (
            <button onClick={downloadInvoice} className={buttonClass('secondary')}>
              {pick({ en: 'Download invoice', ar: 'تنزيل الفاتورة' })}
            </button>
          )}
          <Link to="/account" onClick={onReset} className={buttonClass('secondary')}>
            {t('nav.account')}
          </Link>
        </div>
      </div>
    </section>
  )
}
