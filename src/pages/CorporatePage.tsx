import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { buttonClass } from '@/components/ui/Button'
import { Eyebrow, StatusBadge } from '@/components/ui/Misc'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { JazanScene } from '@/components/brand/JazanScene'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { PatternBand, MotifGlyph } from '@/components/brand/PatternBand'
import { FauxQR } from '@/components/brand/FauxQR'
import { cn } from '@/lib/cn'

/* The Maison Ledger — the B2B page set as one suite of Saudi trade documents:
   cover sheet, registry strip, ledger index, sealed statement of account,
   tariff annex, application form, acknowledgment receipt. Digits inside the
   document artifacts stay Latin + tabular (as on real ZATCA paper), wrapped
   dir="ltr" wherever a sign or hyphenated code could be bidi-reordered. */

export function CorporatePage() {
  const { t, pick } = useLocale()
  const { signedIn, setChannel } = useChannel()
  const navigate = useNavigate()

  const enterBusiness = () => {
    if (signedIn) {
      setChannel('b2b')
      navigate('/business')
    } else {
      navigate('/signin?mode=b2b&next=%2Fbusiness')
    }
  }

  const ghostBtn = 'btn bg-transparent text-ink-on-dark border border-hairline-dark hover:border-primary/60 hover:text-primary-bright'

  return (
    <>
      {/* ── 01 · Cover sheet ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-canvas-dark text-ink-on-dark">
        <div className="absolute inset-0 opacity-40">
          <JazanScene tone="dark" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-canvas-dark" />
        <div className="container-jaz relative py-section grid lg:grid-cols-12 gap-lg items-center">
          <div className="lg:col-span-6 flex flex-col gap-lg">
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
              <button onClick={enterBusiness} className={ghostBtn}>
                {pick({ en: 'View the business portal', ar: 'استعرض بوابة الأعمال' })}
              </button>
            </Reveal>
            <Reveal delay={320}>
              <div className="flex flex-wrap items-center gap-md border-t border-ink-on-dark/15 pt-md">
                {(['corp.ledger.trust1', 'corp.ledger.trust2', 'corp.ledger.trust3'] as const).map((k, i) => (
                  <span key={k} className="inline-flex items-center gap-md">
                    {i > 0 && <MotifGlyph motif="coffee" size={13} className="text-primary-bright shrink-0" />}
                    <span className="font-sans text-caption text-ink-on-dark-muted">{t(k)}</span>
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="hidden lg:block lg:col-span-5 lg:col-start-8">
            <ProFormaArtifact />
          </Reveal>
        </div>
        <WaveDivider tone="gold" height={20} />
      </section>

      {/* ── Registry strip — a pre-printed invoice edge, deliberately still ── */}
      <div className="bg-chocolate text-ink-on-dark-muted border-b border-hairline-dark py-md">
        <div className="container-jaz flex items-center justify-between gap-lg overflow-x-auto no-scrollbar">
          {(['corp.ledger.meta1', 'corp.ledger.meta2', 'corp.ledger.meta3', 'corp.ledger.meta4'] as const).map((k, i) => (
            <span key={k} className="inline-flex items-center gap-lg shrink-0">
              {i > 0 && <MotifGlyph motif="jasmine" size={16} className="text-primary shrink-0" />}
              <span className="font-sans text-caption uppercase tracking-[0.18em] whitespace-nowrap">{t(k)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── 02 · Ledger index (capabilities) ─────────────── */}
      <section className="container-jaz py-section">
        <Reveal>
          <SectionHeader
            number="01"
            eyebrow={pick({ en: 'Capabilities', ar: 'الإمكانات' })}
            label="INDEX · الفهرس"
            title={pick({ en: 'One catalogue, account-based trade', ar: 'كتالوج واحد، وتجارة على الحساب' })}
          />
        </Reveal>

        <div className="mt-xl">
          <DoubleRule />
          <ul>
            {(['pricing', 'credit', 'gifting', 'invoicing'] as const).map((key, i) => (
              <Reveal key={key} as="li" delay={i * 80}>
                <div className="group grid grid-cols-12 gap-x-md gap-y-sm items-baseline py-lg border-b border-hairline rounded-sm transition-all duration-500 ease-editorial hover:bg-surface-2 hover:ps-sm">
                  <div className="col-span-12 sm:col-span-2 flex sm:block items-baseline gap-sm">
                    <span
                      className="font-serif text-[clamp(2.4rem,4vw,3.4rem)] leading-none tabular-nums text-hairline-strong group-hover:text-primary transition-colors duration-500"
                      aria-hidden
                    >
                      {`0${i + 1}`}
                    </span>
                    <span className="block font-sans text-caption uppercase tracking-[0.14em] text-ink-subtle sm:mt-xs">
                      {t('corp.ledger.folio')}
                    </span>
                  </div>
                  <div className="col-span-12 sm:col-span-3 flex items-baseline min-w-0">
                    <h3 className="font-serif text-card-title text-ink">{t(`corp.feature.${key}.title`)}</h3>
                    <DotLeader className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <p className="col-span-12 sm:col-span-4 text-body-sm text-ink-muted">{t(`corp.feature.${key}.body`)}</p>
                  <div className="col-span-12 sm:col-span-3 flex sm:justify-end items-center">
                    <IndexChip kind={key} />
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
          <DoubleRule tone="gold" className="mt-[-1px]" />
        </div>
      </section>

      {/* ── 03 · Governed credit — the sealed statement ──── */}
      <section className="relative bg-surface-2 border-y border-hairline bg-grain overflow-hidden">
        <div className="absolute inset-x-0 top-0" aria-hidden>
          <PatternBand motif="mountain" height={80} opacity={0.08} tone="ink" />
        </div>
        <div className="container-jaz relative py-section">
          <div className="grid lg:grid-cols-12 gap-xl items-start">
            <div className="lg:col-span-5">
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
              <EndorsementTrail />
            </div>

            <Reveal delay={150} className="lg:col-span-6 lg:col-start-7">
              <SealedStatement />
            </Reveal>
          </div>

          <TariffAnnex />
        </div>
      </section>

      {/* ── 04 · Application — Form JAZ/CR-01 ────────────── */}
      <section id="apply" className="container-jaz py-section scroll-mt-24">
        <div className="grid lg:grid-cols-12 gap-xl items-start">
          <div className="lg:col-span-5 flex flex-col gap-md">
            <Reveal>
              <SectionHeader number="03" eyebrow={pick({ en: 'Apply', ar: 'التقديم' })} title={t('corp.apply.title')} body={t('corp.apply.body')} />
            </Reveal>
            <Reveal delay={100} className="mt-sm">
              <DoubleRule />
              {[
                { text: { en: 'Verified via Wathq (Ministry of Commerce)', ar: 'موثّق عبر واثق (وزارة التجارة)' }, source: 'WATHQ' },
                { text: { en: 'VAT validated against the ZATCA registry', ar: 'الرقم الضريبي مُتحقَّق من سجل هيئة الزكاة' }, source: 'ZATCA' },
                { text: { en: 'Cold-chain delivery & bilingual invoicing', ar: 'توصيل بسلسلة تبريد وفوترة بلغتين' }, source: 'JAZ LOGISTICS' },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-md py-sm border-b border-hairline last:border-0">
                  <span className="flex items-center gap-sm min-w-0">
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                    <span className="font-sans text-data text-ink-muted">{pick(row.text)}</span>
                  </span>
                  <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle shrink-0" dir="ltr">
                    {row.source}
                  </span>
                </div>
              ))}
              <DoubleRule />
              <p className="text-body-sm text-ink-muted pt-md">{t('corp.ledger.verifyNote')}</p>
            </Reveal>
          </div>

          <Reveal delay={120} className="lg:col-span-6 lg:col-start-7">
            <ApplicationForm />
          </Reveal>
        </div>
      </section>

      {/* ── 05 · Closing seam — the portal strip ─────────── */}
      <section className="bg-chocolate text-ink-on-dark border-t border-hairline-dark">
        <WaveDivider tone="gold" height={16} flip />
        <Reveal className="container-jaz py-xl flex flex-col sm:flex-row items-center justify-between gap-md">
          <div className="flex items-center gap-md text-center sm:text-start">
            <MotifGlyph motif="coffee" size={24} className="text-primary shrink-0 hidden sm:block" />
            <div>
              <p className="font-serif text-subhead text-ink-on-dark">{t('corp.ledger.counter')}</p>
              <p className="font-sans text-caption text-ink-on-dark-muted mt-xxs">{t('corp.ledger.counterSub')}</p>
            </div>
          </div>
          <button onClick={enterBusiness} className={cn(ghostBtn, 'shrink-0')}>
            {pick({ en: 'View the business portal', ar: 'استعرض بوابة الأعمال' })}
          </button>
        </Reveal>
      </section>
    </>
  )
}

/* ─────────────── Hero artifact: the pro-forma cover sheet ─────────────── */

/** Scroll drift for the hero sheet only — SSR-safe, reduced-motion-gated. */
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setY(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
  return y
}

function ProFormaArtifact() {
  const y = useScrollY()
  return (
    <div aria-hidden className="relative max-w-[420px]" style={{ transform: `translateY(${y * -0.04}px)` }}>
      {/* carbon copy underneath */}
      <div className="absolute inset-0 translate-y-2 translate-x-1 rtl:-translate-x-1 bg-surface-2/90 rounded-lg rotate-[1deg] rtl:rotate-[-1deg]" />
      <div className="relative bg-surface-1 text-ink rounded-lg shadow-soft-lg rotate-[-2.5deg] rtl:rotate-[2.5deg] overflow-hidden">
        <DocHeader
          docType="PRO FORMA · كشف مبدئي"
          title={
            <>
              <span dir="ltr">Al-Rawda Trading Co.</span>
              <span className="block font-arabic text-body-sm text-ink-muted mt-xxs">شركة الروضة التجارية</span>
            </>
          }
          end={
            <span className="flex flex-col items-end gap-xs">
              <FauxQR value="proforma-hero" size={56} className="rounded-xs" />
              <span className="font-sans text-caption text-ink-subtle tabular-nums" dir="ltr">
                № 2026-0087
              </span>
            </span>
          }
        />
        <div className="px-lg pt-md pb-lg">
          {[
            { code: 'INV-2831', amount: '18,400 ﷼' },
            { code: 'INV-2854', amount: '9,150 ﷼' },
          ].map((r) => (
            <div key={r.code} className="flex items-baseline py-xs font-sans text-data tabular-nums text-ink-muted">
              <span dir="ltr">{r.code}</span>
              <DotLeader />
              <span dir="ltr">{r.amount}</span>
            </div>
          ))}
          <DoubleRule className="mt-sm" />
          <div className="flex items-baseline justify-between pt-sm">
            <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">TOTAL · الإجمالي</span>
            <span className="font-serif text-subhead tabular-nums" dir="ltr">
              27,550 ﷼
            </span>
          </div>
        </div>
        <div className="bg-surface-2 px-lg py-sm pe-xxl flex items-center">
          <span className="font-sans text-caption uppercase tracking-[0.12em] text-ink-subtle">NET 30 · على الحساب</span>
        </div>
      </div>
      {/* static corner seal — the animated one belongs to the statement below */}
      <StampSeal
        labelEn="JAZ MAISON · TRADE DESK"
        labelAr="مكتب التجارة"
        size={84}
        className="absolute -bottom-5 end-3 opacity-60 rotate-[9deg] rtl:rotate-[-9deg]"
      />
    </div>
  )
}

/* ─────────────── Ledger index row artifacts ─────────────── */

function IndexChip({ kind }: { kind: 'pricing' | 'credit' | 'gifting' | 'invoicing' }) {
  const { pick } = useLocale()
  if (kind === 'pricing') {
    return (
      <span className="flex items-center gap-sm" aria-hidden>
        <span className="flex items-center gap-xs">
          {['bg-hairline-strong', 'bg-ink-subtle', 'bg-primary', 'bg-ink'].map((c) => (
            <span key={c} className={cn('w-2.5 h-2.5 rounded-pill', c)} />
          ))}
        </span>
        <span className="font-sans text-caption tabular-nums text-ink-subtle" dir="ltr">
          −8% → −26%
        </span>
      </span>
    )
  }
  if (kind === 'credit') {
    return (
      <span className="flex items-center gap-sm" aria-hidden>
        <span className="relative w-[72px] h-1.5 rounded-pill bg-hairline">
          <span className="absolute inset-y-0 start-0 w-[60%] bg-primary rounded-pill" />
          <span className="absolute -top-0.5 -bottom-0.5 end-0 w-px bg-ink" />
        </span>
        <span className="font-sans text-caption text-ink-subtle">{pick({ en: 'limit', ar: 'الحد' })}</span>
      </span>
    )
  }
  if (kind === 'gifting') {
    return (
      <span className="w-11 h-11 rounded-pill border border-primary/40 grid place-items-center" aria-hidden>
        <MotifGlyph motif="jasmine" size={26} />
      </span>
    )
  }
  return <FauxQR value="zatca-index" size={40} className="rounded-xs ring-1 ring-hairline" aria-hidden />
}

/* ─────────────── Endorsement trail (the three steps) ─────────────── */

function EndorsementTrail() {
  const { t, pick } = useLocale()
  const steps = [
    {
      key: 'corp.ledger.endorse1',
      title: { en: 'Sales requests', ar: 'المبيعات تطلب' },
      body: { en: 'Your account manager opens a credit application with your requested limit and terms.', ar: 'يفتح مدير حسابك طلب ائتمان بالحد والشروط المطلوبة.' },
    },
    {
      key: 'corp.ledger.endorse2',
      title: { en: 'Finance approves', ar: 'المالية تعتمد' },
      body: { en: 'A finance decision-maker reviews and sets the limit under dual control — fully audited.', ar: 'يراجع مختصّ المالية ويحدّد الحد برقابة مزدوجة — مع تدقيق كامل.' },
      dual: true,
    },
    {
      key: 'corp.ledger.endorse3',
      title: { en: 'Buy on account', ar: 'الشراء على الحساب' },
      body: { en: 'Orders reserve credit at checkout; at the limit, the gate offers:', ar: 'تحجز الطلبات الائتمان عند الدفع؛ وعند بلوغ الحد تعرض البوابة:' },
      gates: [
        { en: 'Reduce', ar: 'تقليل' },
        { en: 'Pay excess', ar: 'دفع الفائض' },
        { en: 'Request increase', ar: 'طلب رفع الحد' },
      ],
    },
  ]
  return (
    <ol className="mt-xl relative flex flex-col gap-xl border-s-2 border-primary/30 ps-lg">
      {steps.map((s, i) => (
        <Reveal key={s.key} as="li" delay={i * 120}>
          <div className="relative">
            <span className="absolute top-1 -start-lg -ms-[7px] w-3 h-3 rounded-pill bg-primary ring-4 ring-surface-2" aria-hidden />
            <span className="font-sans text-caption uppercase tracking-[0.12em] text-primary-hover">{t(s.key)}</span>
            <h4 className="font-serif text-card-title text-ink mt-xxs flex items-center gap-sm">
              {pick(s.title)}
              {s.dual && (
                <span className="inline-flex items-center" aria-hidden>
                  <span className="w-6 h-6 rounded-pill border-[1.5px] border-primary grid place-items-center bg-surface-2">
                    <Check size={11} className="text-primary-hover" />
                  </span>
                  <span className="w-6 h-6 rounded-pill border-[1.5px] border-primary grid place-items-center bg-surface-2 -ms-[9px]">
                    <Check size={11} className="text-primary-hover" />
                  </span>
                </span>
              )}
            </h4>
            <p className="text-body-sm text-ink-muted mt-xxs">{pick(s.body)}</p>
            {s.gates && (
              <span className="flex flex-wrap gap-xs mt-sm">
                {s.gates.map((g, gi) => (
                  <StatusBadge key={gi}>{pick(g)}</StatusBadge>
                ))}
              </span>
            )}
          </div>
        </Reveal>
      ))}
    </ol>
  )
}

/* ─────────────── The sealed statement (signature centerpiece) ─────────────── */

const STATEMENT_ROWS = [
  { code: 'SO-1042', amount: '−48,000 ﷼', avail: '202,000' },
  { code: 'SO-1061', amount: '−107,750 ﷼', avail: '94,250' },
  { code: 'PAY-118', amount: '+30,000 ﷼', avail: '124,250', payment: true },
] as const

function SealedStatement() {
  const { t, locale } = useLocale()
  const ref = useRef<HTMLDivElement>(null)
  const stamped = useStamped(ref)

  return (
    <div>
      <div ref={ref} className="relative bg-surface-1 rounded-lg border border-hairline shadow-soft-lg">
        <DocHeader
          docType="STATEMENT OF ACCOUNT · كشف الحساب"
          title={
            <>
              <span dir="ltr">Naseem Jazan Est.</span>
              <span className="block font-arabic text-body-sm text-ink-muted mt-xxs">مؤسسة نسيم جازان</span>
            </>
          }
          end={
            <span className="flex flex-col items-end gap-xs">
              <FauxQR value="stmt-4102" size={56} className="rounded-xs" />
              <span className="font-sans text-caption text-ink-subtle tabular-nums" dir="ltr">
                № 4102 · Gold
              </span>
            </span>
          }
        />

        {/* limit + consumption bar */}
        <div className="px-lg pt-md">
          <div className="flex items-baseline justify-between gap-md">
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-muted">{t('corp.ledger.limit')}</span>
            <span className="font-serif text-headline text-ink tabular-nums" dir="ltr">
              250,000 ﷼
            </span>
          </div>
          <div className="mt-sm h-1.5 rounded-pill bg-hairline overflow-hidden" aria-hidden>
            <div
              className="h-full bg-primary rounded-pill transition-[width] duration-[900ms] ease-editorial delay-300"
              style={{ width: stamped ? '50.3%' : '0%' }}
            />
          </div>
          <div className="mt-xs flex items-baseline justify-between font-sans text-caption text-ink-subtle tabular-nums">
            <span>
              {t('corp.ledger.consumed')} <span dir="ltr">125,750 ﷼</span>
            </span>
            <span>
              {t('corp.ledger.available')} <span dir="ltr">124,250 ﷼</span>
            </span>
          </div>
        </div>

        {/* ledger table */}
        <div className="px-lg py-md">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-md font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle pb-xs">
            <span>{t('corp.ledger.colDoc')}</span>
            <span className="text-end">{t('corp.ledger.colAmount')}</span>
            <span className="text-end min-w-[64px]">{t('corp.ledger.colAvail')}</span>
          </div>
          <DoubleRule />
          {STATEMENT_ROWS.map((r, i) => (
            <Reveal key={r.code} delay={i * 120}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-md items-baseline py-xs border-b border-hairline font-sans text-data tabular-nums">
                <span dir="ltr">{r.code}</span>
                <span className={cn('text-end', 'payment' in r && r.payment && 'text-success')} dir="ltr">
                  {r.amount}
                </span>
                <span className="text-end min-w-[64px]" dir="ltr">
                  {r.avail}
                </span>
              </div>
            </Reveal>
          ))}
          {/* the kill-shot row: the gate refuses, structurally */}
          <Reveal delay={360}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-md items-center py-xs px-xs bg-danger/5 rounded-sm font-sans text-data tabular-nums">
              <span dir="ltr">SO-1077</span>
              <span className="text-end line-through text-ink-subtle" dir="ltr">
                −140,000 ﷼
              </span>
              <span className="flex justify-end min-w-[64px]">
                <StatusBadge variant="danger" className="whitespace-nowrap">
                  {t('corp.ledger.blocked')}
                </StatusBadge>
              </span>
            </div>
          </Reveal>
          <p className={cn('font-serif text-body-sm text-ink-muted mt-md', locale === 'en' && 'italic')}>{t('corp.ledger.impossible')}</p>
        </div>

        {/* endorsement footer — two signatures, one decision */}
        <div className="bg-surface-2 rounded-b-lg px-lg py-md pe-xxl flex items-end gap-xl">
          {[
            { name: 'R. AlAmoudi', arabicName: false, caption: 'SALES · المبيعات' },
            { name: 'هند القحطاني', arabicName: true, caption: 'FINANCE · المالية' },
          ].map((sig) => (
            <div key={sig.caption} className="flex flex-col gap-xxs w-28">
              <span className={cn('text-body leading-none pb-xs', sig.arabicName ? 'font-arabic' : 'font-serif italic')} aria-hidden>
                {sig.name}
              </span>
              <span className="border-b border-ink/40" aria-hidden />
              <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{sig.caption}</span>
            </div>
          ))}
        </div>

        {/* the seal — one thump, once */}
        <StampSeal
          labelEn="JAZ MAISON · DUAL CONTROL"
          labelAr="رقابة مزدوجة"
          size={116}
          className={cn(
            'absolute -bottom-5 end-6 transition-all duration-300 ease-editorial',
            stamped ? 'opacity-100 scale-100 rotate-[-8deg] rtl:rotate-[8deg]' : 'opacity-0 scale-[1.6] rotate-[-14deg] rtl:rotate-[14deg]',
          )}
          style={{ transitionDelay: '700ms' }}
        />
      </div>
      <p className="mt-lg text-center font-sans text-caption text-ink-subtle">{t('corp.ledger.illustrative')}</p>
    </div>
  )
}

/* ─────────────── Annex A — the tariff ─────────────── */

function TariffAnnex() {
  const { t } = useLocale()
  const tiers = [
    { key: 'corp.tiers.bronze', off: '−8%' },
    { key: 'corp.tiers.silver', off: '−14%' },
    { key: 'corp.tiers.gold', off: '−20%', gold: true },
    { key: 'corp.tiers.platinum', off: '−26%' },
  ]
  return (
    <Reveal className="mt-xxl max-w-[560px]">
      <DoubleRule tone="gold" />
      <div className="flex items-baseline justify-between pt-sm">
        <span className="eyebrow text-primary-hover">{t('corp.ledger.annex')}</span>
        <span className="font-serif text-subhead text-primary" aria-hidden>
          *
        </span>
      </div>
      <ul className="mt-sm">
        {tiers.map((tier) => (
          <li key={tier.key} className={cn('py-sm', !tier.gold && 'border-b border-hairline last:border-0')}>
            <span className="flex items-baseline">
              <span className={cn('flex items-center gap-xs font-serif text-body', tier.gold ? 'text-primary-hover' : 'text-ink')}>
                {tier.gold && <MotifGlyph motif="coffee" size={16} className="translate-y-0.5" />}
                {t(tier.key)}
              </span>
              <DotLeader />
              <span className={cn('font-sans text-data tabular-nums', tier.gold ? 'text-primary-hover font-medium' : 'text-ink-muted')}>
                {t('corp.tiers.list')}{' '}
                <span dir="ltr">{tier.off}</span>
              </span>
            </span>
            {tier.gold && <DoubleRule tone="gold" className="mt-sm" />}
          </li>
        ))}
      </ul>
      <p className="pt-sm font-sans text-caption text-ink-subtle">{t('corp.tiers.note')}</p>
      <p className="pt-xxs font-sans text-caption text-ink-subtle tabular-nums">
        {t('corp.tiers.exampleName')} — {t('corp.tiers.retail')} <span dir="ltr">﷼ 48.00</span> · {t('corp.tiers.gold')}{' '}
        <span dir="ltr">﷼ 38.40</span>
      </p>
    </Reveal>
  )
}

/* ─────────────── Form JAZ/CR-01 → acknowledgment receipt ─────────────── */

function ApplicationForm() {
  const { t, pick } = useLocale()
  const [sent, setSent] = useState(false)
  const [cr, setCr] = useState('')

  if (sent) {
    return (
      <div className="card shadow-soft overflow-hidden relative animate-fade-in">
        <DocHeader
          docType="ACKNOWLEDGMENT · إشعار استلام"
          title={pick({ en: 'Submitted for verification', ar: 'أُرسل للتوثيق' })}
          end={
            <span className="font-sans text-caption text-ink-subtle tabular-nums" dir="ltr">
              № APP-2026-0113
            </span>
          }
        />
        <div className="p-xl flex flex-col items-center text-center gap-md">
          <FauxQR value={cr ? `APP-${cr}` : 'APP-2026-0113'} size={88} className="ring-1 ring-hairline rounded-xs" />
          <span className="font-sans text-caption text-ink-subtle tabular-nums" dir="ltr">
            {cr ? `APP-${cr}` : 'APP-2026-0113'}
          </span>
          <p className="text-body text-ink-muted max-w-sm">
            {pick({
              en: 'We will verify your CR and VAT and reach out within two business days, usually on WhatsApp.',
              ar: 'سنتحقق من سجلك التجاري ورقمك الضريبي ونتواصل خلال يومي عمل، عادةً عبر واتساب.',
            })}
          </p>
          <Link to="/business" className={buttonClass('secondary', 'md', 'mt-xs')}>
            {pick({ en: 'Preview the portal', ar: 'استعرض البوابة' })}
          </Link>
        </div>
        <StampSeal
          labelEn="JAZ MAISON · RECEIVED"
          labelAr="مُستلَم"
          size={96}
          className="absolute top-14 end-6 rotate-[-10deg] rtl:rotate-[10deg] animate-scale-in"
        />
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

  const folio = (n: string) => (
    <span className="font-serif text-primary me-xs normal-case tracking-normal" aria-hidden>
      {n}
    </span>
  )

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="card shadow-soft overflow-hidden">
      <DocHeader
        docType="FORM JAZ/CR-01 · نموذج فتح حساب"
        title={
          <>
            {t('corp.ledger.formTitle')}
            <span className="inline-flex items-center gap-xs font-sans text-caption text-ink-subtle ms-sm">
              <ShieldCheck size={13} className="text-success" /> Wathq · ZATCA
            </span>
          </>
        }
        end={
          <span className="flex flex-col items-end gap-xs">
            <StatusBadge variant="gold">{pick({ en: 'New account', ar: 'حساب جديد' })}</StatusBadge>
            <span className="font-sans text-caption text-ink-subtle tabular-nums" dir="ltr">
              № 2026-0113
            </span>
          </span>
        }
      />
      <div className="p-lg flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="label mb-0">
            {folio('01')}
            {t('corp.apply.legalName')}
          </span>
          <input className="input" required placeholder={pick({ en: 'As per Commercial Registration', ar: 'حسب السجل التجاري' })} />
        </label>
        <div className="flex flex-col sm:flex-row gap-md">
          <label className="flex flex-col gap-xs flex-1">
            <span className="label mb-0">
              {folio('02')}
              {t('corp.apply.cr')}
            </span>
            <input
              className="input text-start rtl:text-end"
              dir="ltr"
              inputMode="numeric"
              required
              placeholder="1010XXXXXX"
              value={cr}
              onChange={(e) => setCr(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-xs flex-1">
            <span className="label mb-0">
              {folio('03')}
              {t('corp.apply.vat')}
            </span>
            <input className="input text-start rtl:text-end" dir="ltr" inputMode="numeric" required placeholder="3000XXXXXXXXXX3" />
          </label>
        </div>
        <label className="flex flex-col gap-xs">
          <span className="label mb-0">
            {folio('04')}
            {t('corp.apply.type')}
          </span>
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
          <span className="label mb-0">
            {folio('05')}
            {t('checkout.email')}
          </span>
          <input type="email" className="input" required placeholder="procurement@company.sa" />
        </label>
        <button type="submit" className={buttonClass('primary', 'md', 'w-full mt-xs')}>
          {t('corp.apply.submit')}
        </button>
        <p className="font-sans text-caption text-ink-subtle border-t border-hairline pt-sm">
          <span className="text-primary me-xs" aria-hidden>
            †
          </span>
          {pick({ en: 'By submitting you agree to PDPL-compliant processing of your data.', ar: 'بالإرسال أنت توافق على معالجة بياناتك وفق نظام حماية البيانات الشخصية.' })}
        </p>
      </div>
    </form>
  )
}

/* ─────────────── Document primitives ─────────────── */

/** Double accounting rule — the "totals" line of a ledger. */
function DoubleRule({ tone = 'ink', className }: { tone?: 'ink' | 'gold'; className?: string }) {
  return (
    <div aria-hidden className={className}>
      <div className={cn('h-px', tone === 'gold' ? 'bg-primary/60' : 'bg-hairline-strong')} />
      <div className={cn('h-px mt-[3px]', tone === 'gold' ? 'bg-primary/25' : 'bg-hairline')} />
    </div>
  )
}

/** Dotted table-of-contents leader between a label and its value. */
function DotLeader({ className }: { className?: string }) {
  return <span aria-hidden className={cn('flex-1 mx-sm border-b border-dotted border-hairline-strong -translate-y-[0.35em] min-w-[24px]', className)} />
}

/** Shared chrome for every document card: doc-type line, serif title, and the
    gold wave seam that binds the whole stationery suite together. */
function DocHeader({ docType, title, end }: { docType: string; title: ReactNode; end?: ReactNode }) {
  return (
    <>
      <div className="flex items-start justify-between gap-md p-lg pb-md">
        <div className="min-w-0">
          <span className="font-sans text-caption uppercase tracking-[0.14em] text-ink-subtle">{docType}</span>
          <h3 className="font-serif text-card-title text-ink mt-xxs leading-snug">{title}</h3>
        </div>
        {end && <div className="shrink-0">{end}</div>}
      </div>
      <WaveDivider tone="gold" height={12} unit={20} />
    </>
  )
}

/** Circular rubber stamp in registry-ink blue — the only blue on the page,
    which is what makes it read as ink rather than UI. English rides the ring
    on a textPath; Arabic is a horizontal text (shaping breaks on paths). */
function StampSeal({
  labelEn,
  labelAr,
  sub = '1447 · 2026',
  size = 112,
  className,
  style,
}: {
  labelEn: string
  labelAr: string
  sub?: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const id = useId().replace(/:/g, '')
  return (
    <span className={cn('inline-block mix-blend-multiply', className)} style={style} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className="text-brand-blue opacity-[0.88]">
        <defs>
          <path id={`ring-${id}`} d="M 60,60 m -48,0 a 48,48 0 1,1 96,0 a 48,48 0 1,1 -96,0" />
        </defs>
        <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1" />
        <text className="font-sans" fill="currentColor" fontSize="8.5" letterSpacing="2">
          <textPath href={`#ring-${id}`} startOffset="25%" textAnchor="middle">
            {labelEn}
          </textPath>
        </text>
        <text className="font-sans" fill="currentColor" fontSize="8.5" letterSpacing="4">
          <textPath href={`#ring-${id}`} startOffset="75%" textAnchor="middle">
            · · ·
          </textPath>
        </text>
        <path d="M52 42 l6 6 l12 -13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="60" y="70" textAnchor="middle" className="font-arabic" fill="currentColor" fontSize="13">
          {labelAr}
        </text>
        <text x="60" y="84" textAnchor="middle" className="font-sans" fill="currentColor" fontSize="7.5" letterSpacing="1.5">
          {sub}
        </text>
      </svg>
    </span>
  )
}

/** Fires once when the statement scrolls into view — the stamp thump.
    Reduced motion (or SSR) short-circuits straight to the stamped state. */
function useStamped(ref: RefObject<HTMLElement>) {
  const [stamped, setStamped] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStamped(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setStamped(true)
            obs.unobserve(e.target)
          }
        })
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return stamped
}
