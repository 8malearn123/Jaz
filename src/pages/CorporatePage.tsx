import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers, Landmark, Gift, FileCheck2, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { JazanScene } from '@/components/brand/JazanScene'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { cn } from '@/lib/cn'

const features = [
  { icon: Layers, key: 'corp.feature.pricing' },
  { icon: Landmark, key: 'corp.feature.credit' },
  { icon: Gift, key: 'corp.feature.gifting' },
  { icon: FileCheck2, key: 'corp.feature.invoicing' },
] as const

export function CorporatePage() {
  const { t, pick } = useLocale()
  const { setChannel } = useChannel()
  const navigate = useNavigate()

  const enterBusiness = () => {
    setChannel('b2b')
    navigate('/account')
  }

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden bg-canvas-dark text-ink-on-dark">
        <div className="absolute inset-0 opacity-40">
          <JazanScene tone="dark" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-canvas-dark" />
        <div className="container-jaz relative py-section flex flex-col gap-lg max-w-2xl">
          <Reveal>
            <Eyebrow tone="on-dark">{t('corp.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-serif text-[clamp(2.4rem,6vw,4rem)] leading-[1.06] text-ink-on-dark whitespace-pre-line text-balance">
              {t('corp.hero.title')}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="text-body-lg text-ink-on-dark-muted max-w-prose">{t('corp.hero.body')}</p>
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap gap-sm pt-xs">
            <a href="#apply" className={buttonClass('primary')}>
              {t('corp.apply.title')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </a>
            <button onClick={enterBusiness} className="btn bg-transparent text-ink-on-dark border border-hairline-dark hover:border-primary/60 hover:text-primary-bright">
              {pick({ en: 'View the business portal', ar: 'استعرض بوابة الأعمال' })}
            </button>
          </Reveal>
        </div>
        <WaveDivider tone="gold" height={20} />
      </section>

      {/* features */}
      <section className="container-jaz py-section">
        <Reveal>
          <SectionHeader number="01" eyebrow={pick({ en: 'Capabilities', ar: 'الإمكانات' })} title={pick({ en: 'One catalogue, account-based trade', ar: 'كتالوج واحد، وتجارة على الحساب' })} />
        </Reveal>
        <div className="mt-xl grid gap-md sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.key} delay={i * 70}>
              <div className="card card-hover p-xl h-full flex flex-col gap-sm">
                <span className="grid place-items-center w-12 h-12 rounded-md bg-primary/10 text-primary-hover">
                  <f.icon size={22} />
                </span>
                <h3 className="font-serif text-card-title text-ink mt-xs">{t(`${f.key}.title`)}</h3>
                <p className="text-body-sm text-ink-muted">{t(`${f.key}.body`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* governed credit explainer */}
      <section className="bg-surface-2 border-y border-hairline">
        <div className="container-jaz py-section">
          <Reveal>
            <SectionHeader
              number="02"
              eyebrow={pick({ en: 'Governed credit', ar: 'ائتمان منضبط' })}
              title={pick({ en: 'Credit is governed,\nnever implicit', ar: 'الائتمان منضبط،\nلا ضمنيّ أبدًا' })}
              body={pick({
                en: 'Every account carries an explicit, auditable limit. Orders consume credit transactionally — and over-limit spending is structurally impossible.',
                ar: 'كل حساب يحمل حدًّا صريحًا قابلًا للتدقيق. تستهلك الطلبات الائتمان لحظيًا — وتجاوز الحد مستحيلٌ بنيويًا.',
              })}
            />
          </Reveal>

          <div className="mt-xl grid gap-md md:grid-cols-3">
            {[
              { n: '01', en: 'Sales requests', ar: 'المبيعات تطلب', enb: 'Your account manager opens a credit application with your requested limit and terms.', arb: 'يفتح مدير حسابك طلب ائتمان بالحد والشروط المطلوبة.' },
              { n: '02', en: 'Finance approves', ar: 'المالية تعتمد', enb: 'A finance decision-maker reviews and sets the limit under dual control — fully audited.', arb: 'يراجع مختصّ المالية ويحدّد الحد برقابة مزدوجة — مع تدقيق كامل.' },
              { n: '03', en: 'Buy on account', ar: 'الشراء على الحساب', enb: 'Orders reserve credit at checkout; the gate offers reduce, pay-excess, or request-increase.', arb: 'تحجز الطلبات الائتمان عند الدفع؛ وتعرض البوابة: التقليل، دفع الفائض، أو طلب الرفع.' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="card p-xl h-full flex flex-col gap-sm">
                  <span className="font-serif text-section-number text-primary">{s.n}</span>
                  <h4 className="font-serif text-headline text-ink">{pick({ en: s.en, ar: s.ar })}</h4>
                  <p className="text-body-sm text-ink-muted">{pick({ en: s.enb, ar: s.arb })}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* tiers */}
          <Reveal delay={120}>
            <div className="mt-xl card p-xl flex flex-col gap-md">
              <div className="flex items-center justify-between flex-wrap gap-sm">
                <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Price-list tiers', ar: 'فئات قوائم الأسعار' })}</h4>
                <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'with quantity volume breaks', ar: 'مع كسور سعرية حسب الكمية' })}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
                {['bronze', 'silver', 'gold', 'platinum'].map((tier, i) => (
                  <div key={tier} className={cn('rounded-md border p-md text-center', tier === 'gold' ? 'border-primary bg-primary/8' : 'border-hairline')}>
                    <span className="font-serif text-card-title text-ink capitalize">{tier}</span>
                    <span className="block font-sans text-caption text-ink-subtle mt-xxs">−{8 + i * 6}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* application */}
      <section id="apply" className="container-jaz py-section scroll-mt-24">
        <div className="grid lg:grid-cols-2 gap-xl items-start">
          <div className="flex flex-col gap-md">
            <Reveal>
              <SectionHeader number="03" eyebrow={pick({ en: 'Apply', ar: 'التقديم' })} title={t('corp.apply.title')} body={t('corp.apply.body')} />
            </Reveal>
            <Reveal delay={100} className="flex flex-col gap-sm mt-sm">
              {[
                { en: 'Verified via Wathq (Ministry of Commerce)', ar: 'موثّق عبر واثق (وزارة التجارة)' },
                { en: 'VAT validated against the ZATCA registry', ar: 'الرقم الضريبي مُتحقَّق من سجل هيئة الزكاة' },
                { en: 'Cold-chain delivery & bilingual invoicing', ar: 'توصيل بسلسلة تبريد وفوترة بلغتين' },
              ].map((it, i) => (
                <div key={i} className="flex items-center gap-sm">
                  <CheckCircle2 size={18} className="text-success shrink-0" />
                  <span className="font-sans text-data text-ink-muted">{pick(it)}</span>
                </div>
              ))}
            </Reveal>
          </div>

          <Reveal delay={120}>
            <ApplicationForm />
          </Reveal>
        </div>
      </section>
    </>
  )
}

function ApplicationForm() {
  const { t, pick } = useLocale()
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className="card p-xl flex flex-col items-center text-center gap-md">
        <span className="grid place-items-center w-16 h-16 rounded-pill bg-success/12 text-success">
          <CheckCircle2 size={30} />
        </span>
        <h3 className="font-serif text-headline text-ink">{pick({ en: 'Submitted for verification', ar: 'أُرسل للتوثيق' })}</h3>
        <p className="text-body text-ink-muted max-w-sm">
          {pick({
            en: 'We will verify your CR and VAT and reach out within two business days, usually on WhatsApp.',
            ar: 'سنتحقق من سجلك التجاري ورقمك الضريبي ونتواصل خلال يومي عمل، عادةً عبر واتساب.',
          })}
        </p>
        <Link to="/account" className={buttonClass('secondary', 'md', 'mt-xs')}>
          {pick({ en: 'Preview the portal', ar: 'استعرض البوابة' })}
        </Link>
      </div>
    )
  }

  const types = [
    { v: 'corporate_gifting', en: 'Corporate gifting', ar: 'إهداء الشركات' },
    { v: 'hospitality', en: 'Hospitality', ar: 'ضيافة' },
    { v: 'reseller', en: 'Reseller', ar: 'موزّع' },
    { v: 'retailer', en: 'Retailer', ar: 'تجزئة' },
    { v: 'events', en: 'Events', ar: 'فعاليات' },
  ]

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="card p-xl flex flex-col gap-md">
      <div className="flex items-center gap-sm">
        <StatusBadge variant="gold">{pick({ en: 'New account', ar: 'حساب جديد' })}</StatusBadge>
        <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle">
          <ShieldCheck size={14} className="text-success" /> Wathq · ZATCA
        </span>
      </div>
      <label className="flex flex-col gap-xs">
        <span className="label">{t('corp.apply.legalName')}</span>
        <input className="input" required placeholder={pick({ en: 'As per Commercial Registration', ar: 'حسب السجل التجاري' })} />
      </label>
      <div className="flex flex-col sm:flex-row gap-md">
        <label className="flex flex-col gap-xs flex-1">
          <span className="label">{t('corp.apply.cr')}</span>
          <input className="input" inputMode="numeric" required placeholder="1010XXXXXX" />
        </label>
        <label className="flex flex-col gap-xs flex-1">
          <span className="label">{t('corp.apply.vat')}</span>
          <input className="input" inputMode="numeric" required placeholder="3000XXXXXXXXXX3" />
        </label>
      </div>
      <label className="flex flex-col gap-xs">
        <span className="label">{t('corp.apply.type')}</span>
        <select className="input cursor-pointer" required defaultValue="">
          <option value="" disabled>
            {pick({ en: 'Select…', ar: 'اختر…' })}
          </option>
          {types.map((tp) => (
            <option key={tp.v} value={tp.v}>
              {pick({ en: tp.en, ar: tp.ar })}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-xs">
        <span className="label">{t('checkout.email')}</span>
        <input type="email" className="input" required placeholder="procurement@company.sa" />
      </label>
      <button type="submit" className={buttonClass('primary', 'md', 'w-full mt-xs')}>
        {t('corp.apply.submit')}
      </button>
      <p className="font-sans text-caption text-ink-subtle text-center">
        {pick({ en: 'By submitting you agree to PDPL-compliant processing of your data.', ar: 'بالإرسال أنت توافق على معالجة بياناتك وفق نظام حماية البيانات الشخصية.' })}
      </p>
    </form>
  )
}
