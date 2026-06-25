import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Smartphone, Lock, Mail, ShieldCheck, Fingerprint, ArrowRight, Truck, BadgeCheck, KeyRound } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { buttonClass } from '@/components/ui/Button'
import { WaveDivider } from '@/components/brand/WaveDivider'
import { AuthLayout, AuthHeading, AuthField, ModeToggle, AuthDivider, OtpInput, type AuthMode, type TrustPoint } from '@/components/account/AuthScaffold'

type Step = 'credentials' | 'otp'

export function SignInPage() {
  const { t, pick } = useLocale()
  const { signIn } = useChannel()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const initialMode: AuthMode = params.get('mode') === 'b2b' ? 'b2b' : 'b2c'
  const next = params.get('next')
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [step, setStep] = useState<Step>('credentials')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [note, setNote] = useState('')
  const isBusiness = mode === 'b2b'

  const safeNext = next && next.startsWith('/') ? next : null
  const complete = () => {
    signIn(isBusiness ? 'b2b' : 'customer')
    navigate(safeNext ?? (isBusiness ? '/business' : '/account'))
  }
  const switchMode = (m: AuthMode) => {
    setMode(m)
    setStep('credentials')
    setNote('')
  }
  const qs = (m: AuthMode) => `?mode=${m}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ''}`

  const points: TrustPoint[] = [
    { icon: ShieldCheck, text: t('auth.point.secure') },
    { icon: Truck, text: t('auth.point.coldchain') },
    { icon: BadgeCheck, text: t('auth.point.zatca') },
  ]

  return (
    <AuthLayout points={points}>
      {step === 'otp' ? (
        <OtpStep
          mode={mode}
          target={contact || (isBusiness ? pick({ en: 'your device', ar: 'جهازك' }) : pick({ en: 'your mobile', ar: 'جوالك' }))}
          otp={otp}
          setOtp={setOtp}
          onBack={() => setStep('credentials')}
          onVerify={complete}
        />
      ) : (
        <>
          <AuthHeading title={t('signin.title')} subtitle={t('signin.subtitle')} />
          <ModeToggle mode={mode} onChange={switchMode} />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setStep('otp')
            }}
            className="flex flex-col gap-md"
          >
            {isBusiness ? (
              <>
                <AuthField icon={Mail} label={t('checkout.email')} type="email" placeholder="procurement@company.sa" autoComplete="email" required onChange={(e) => setContact(e.target.value)} />
                <div className="flex flex-col gap-xs">
                  <AuthField icon={Lock} label={t('signin.password')} type="password" placeholder="••••••••" autoComplete="current-password" required />
                  <button type="button" onClick={() => setNote(t('signin.resetSent'))} className="self-end font-sans text-caption text-primary-hover hover:text-ink transition-colors">
                    {t('signin.forgot')}
                  </button>
                </div>
                <div className="flex items-center gap-xs rounded-md bg-brand-blue/8 border border-brand-blue/20 p-sm">
                  <ShieldCheck size={16} className="text-brand-blue shrink-0" />
                  <span className="font-sans text-caption text-ink-muted">{t('signin.mfaNote')}</span>
                </div>
                <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
                  {t('signin.continue')} <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
                <AuthDivider label={pick({ en: 'or', ar: 'أو' })} />
                <button type="button" onClick={complete} className={buttonClass('secondary', 'md', 'w-full')}>
                  <Fingerprint size={16} /> {t('signin.nafath')}
                </button>
              </>
            ) : (
              <>
                <AuthField icon={Smartphone} label={t('signin.otp')} type="text" inputMode="tel" placeholder="+9665XXXXXXXX" autoComplete="tel" required onChange={(e) => setContact(e.target.value)} />
                <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
                  {t('signin.sendOtp')} <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
                <p className="font-sans text-caption text-ink-subtle text-center">{t('signin.individual.desc')}</p>
                <AuthDivider label={pick({ en: 'or', ar: 'أو' })} />
                <button type="button" onClick={complete} className={buttonClass('secondary', 'md', 'w-full')}>
                  <Fingerprint size={16} /> {t('signin.nafath')}
                </button>
              </>
            )}

            {note && (
              <p className="flex items-center gap-xs rounded-md bg-success/10 border border-success/20 px-sm py-2 font-sans text-caption text-success">
                <BadgeCheck size={14} /> {note}
              </p>
            )}
          </form>

          <p className="font-sans text-data text-ink-muted">
            {t('signin.noAccount')}{' '}
            <Link to={`/signup${qs(mode)}`} className="text-primary-hover hover:text-ink font-medium transition-colors">
              {t('signin.createAccount')}
            </Link>
          </p>

          <div className="mt-auto pt-md border-t border-hairline">
            <WaveDivider tone="gold" height={12} className="opacity-50 mb-md" />
            <Link to="/shop" className="link-gold">
              {t('signin.continueAs')} <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  )
}

function OtpStep({
  mode,
  target,
  otp,
  setOtp,
  onBack,
  onVerify,
}: {
  mode: AuthMode
  target: string
  otp: string
  setOtp: (v: string) => void
  onBack: () => void
  onVerify: () => void
}) {
  const { t } = useLocale()
  return (
    <>
      <AuthHeading
        title={mode === 'b2b' ? t('signin.mfaTitle') : t('signin.otpTitle')}
        subtitle={
          <span>
            {t('signin.otpSentTo')} <span dir="ltr" className="font-medium text-ink">{target}</span>
          </span>
        }
        onBack={onBack}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onVerify()
        }}
        className="flex flex-col gap-lg"
      >
        <div className="flex flex-col gap-sm">
          <span className="label !mb-0 flex items-center gap-xs"><KeyRound size={13} /> {t('signin.enterCode')}</span>
          <OtpInput value={otp} onChange={setOtp} />
        </div>
        <button type="submit" disabled={otp.length < 6} className={buttonClass('primary', 'md', 'w-full disabled:opacity-40 disabled:pointer-events-none')}>
          {t('signin.verify')} <ArrowRight size={16} className="rtl:rotate-180" />
        </button>
        <p className="font-sans text-caption text-ink-subtle text-center">
          {t('signin.noCode')}{' '}
          <button type="button" onClick={() => setOtp('')} className="text-primary-hover hover:text-ink transition-colors">
            {t('signin.resend')}
          </button>
        </p>
      </form>
    </>
  )
}
