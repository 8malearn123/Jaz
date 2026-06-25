import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Smartphone, Lock, ShieldCheck, Fingerprint, ArrowRight, User, Building2 } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { buttonClass } from '@/components/ui/Button'
import { Wordmark } from '@/components/brand/Wordmark'
import { JazanScene } from '@/components/brand/JazanScene'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { cn } from '@/lib/cn'

export function SignInPage() {
  const { t, pick } = useLocale()
  const { setRole } = useChannel()
  const navigate = useNavigate()
  // Local choice only — does not change your live role until you sign in.
  const [mode, setMode] = useState<'b2c' | 'b2b'>('b2c')
  const isBusiness = mode === 'b2b'

  const signIn = () => {
    setRole(isBusiness ? 'b2b' : 'customer')
    navigate(isBusiness ? '/business' : '/account')
  }
  const goToDashboard = (e: React.FormEvent) => {
    e.preventDefault()
    signIn()
  }

  return (
    <section className="container-jaz py-xl">
      <div className="grid lg:grid-cols-2 rounded-xl overflow-hidden border border-hairline shadow-soft min-h-[560px]">
        {/* brand panel */}
        <div className="relative bg-canvas-dark text-ink-on-dark p-xl lg:p-xxl flex flex-col justify-between order-2 lg:order-1 min-h-[220px]">
          <div className="absolute inset-0 opacity-50">
            <JazanScene tone="dark" />
          </div>
          <div className="relative">
            <Wordmark tone="on-dark" size="lg" withWave />
          </div>
          <div className="relative mt-lg">
            <p className="font-serif text-headline text-ink-on-dark leading-snug max-w-sm">{t('brand.tagline')}</p>
            <p className="font-sans text-caption tracking-wide text-ink-on-dark-muted mt-sm">{t('brand.location')}</p>
          </div>
        </div>

        {/* form panel */}
        <div className="bg-surface-1 p-xl lg:p-xxl flex flex-col gap-lg order-1 lg:order-2">
          <div className="flex flex-col gap-xs">
            <h1 className="font-serif text-display-md text-ink">{t('signin.title')}</h1>
            <p className="text-body text-ink-muted">{t('signin.subtitle')}</p>
          </div>

          {/* local sign-in type — commits only when you sign in */}
          <div className="inline-flex p-0.5 rounded-pill border border-hairline bg-surface-2 w-full">
            {([
              { v: 'b2c' as const, label: t('role.individual'), icon: User },
              { v: 'b2b' as const, label: t('role.business'), icon: Building2 },
            ]).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setMode(o.v)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-xs rounded-pill py-2.5 font-sans text-button uppercase transition-all',
                  mode === o.v ? 'bg-primary text-on-primary shadow-lift' : 'text-ink-muted hover:text-ink',
                )}
              >
                <o.icon size={15} />
                {o.label}
              </button>
            ))}
          </div>

          <form onSubmit={goToDashboard} className="flex flex-col gap-md">
            {isBusiness ? (
              <>
                <Field icon={Lock} label={t('checkout.email')} type="email" placeholder="procurement@company.sa" />
                <Field icon={Lock} label={t('signin.password')} type="password" placeholder="••••••••" />
                <div className="flex items-center gap-xs rounded-md bg-brand-blue/8 border border-brand-blue/20 p-sm">
                  <ShieldCheck size={16} className="text-brand-blue shrink-0" />
                  <span className="font-sans text-caption text-ink-muted">{t('signin.mfaNote')}</span>
                </div>
                <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
                  {t('signin.continue')} <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
                <div className="relative flex items-center gap-sm my-xxs">
                  <span className="flex-1 h-px bg-hairline" />
                  <span className="font-sans text-caption text-ink-subtle uppercase tracking-wide">{pick({ en: 'or', ar: 'أو' })}</span>
                  <span className="flex-1 h-px bg-hairline" />
                </div>
                <button type="button" onClick={signIn} className={buttonClass('secondary', 'md', 'w-full')}>
                  <Fingerprint size={16} /> {t('signin.nafath')}
                </button>
              </>
            ) : (
              <>
                <Field icon={Smartphone} label={t('signin.otp')} type="text" placeholder="+9665XXXXXXXX" />
                <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
                  {t('signin.sendOtp')} <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
                <p className="font-sans text-caption text-ink-subtle text-center">{t('signin.individual.desc')}</p>
              </>
            )}
          </form>

          <div className="mt-auto pt-md border-t border-hairline">
            <WaveDivider tone="gold" height={12} className="opacity-50 mb-md" />
            <Link to="/shop" className="link-gold">
              {t('signin.continueAs')} <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ icon: Icon, label, ...props }: { icon: typeof Lock; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="label">{label}</span>
      <div className="relative">
        <Icon size={17} className="absolute top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" style={{ insetInlineStart: 14 }} />
        <input className="input ps-11" {...props} />
      </div>
    </label>
  )
}
