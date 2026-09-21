import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, UserRound, Smartphone, Mail, Lock, Building2, Hash, Receipt, ArrowRight, KeyRound,
  Gift, Truck, Fingerprint, Landmark, BadgeCheck, Headset, CheckCircle2, ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { buttonClass } from '@/components/ui/Button'
import { AuthLayout, AuthHeading, AuthField, ModeToggle, OtpInput, type AuthMode, type TrustPoint } from '@/components/account/AuthScaffold'
import { isSupabaseConfigured } from '@/lib/supabase'
import { signUp, sendPhoneOtp, verifyPhoneOtp } from '@/lib/api/auth'

type Step = 'details' | 'otp' | 'review'

export function SignUpPage() {
  const { t, pick } = useLocale()
  const { signIn } = useChannel()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const initialMode: AuthMode = params.get('mode') === 'b2b' ? 'b2b' : 'b2c'
  const next = params.get('next')
  const safeNext = next && next.startsWith('/') ? next : null
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [step, setStep] = useState<Step>('details')
  const [mobile, setMobile] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isBusiness = mode === 'b2b'

  const switchMode = (m: AuthMode) => {
    setMode(m)
    setStep('details')
    setError('')
  }
  const finishB2c = () => {
    signIn('customer')
    navigate(safeNext ?? '/account')
  }
  const enterPortal = () => {
    signIn('b2b')
    navigate(safeNext ?? '/business')
  }

  // Real signup. The role asked for here is only a request — public.handle_new_user()
  // clamps it to customer/b2b, so a crafted payload cannot register staff.
  const submitB2b = async () => {
    setError('')
    setBusy(true)
    const res = await signUp({
      email,
      password,
      role: 'b2b',
      fullNameEn: fullName || undefined,
      phone: mobile || undefined,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? '')
      return
    }
    setStep('review')
  }

  const submitB2cOtp = async () => {
    setError('')
    setBusy(true)
    const res = await sendPhoneOtp(mobile)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? '')
      return
    }
    setStep('otp')
  }

  const verifyB2c = async () => {
    setError('')
    setBusy(true)
    const res = await verifyPhoneOtp(mobile, otp)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? '')
      return
    }
    navigate(safeNext ?? '/account')
  }
  const qs = `?mode=${mode}${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ''}`

  const points: TrustPoint[] = isBusiness
    ? [
        { icon: Landmark, text: t('auth.point.credit') },
        { icon: BadgeCheck, text: t('auth.point.zatca') },
        { icon: Headset, text: t('auth.point.manager') },
      ]
    : [
        { icon: Gift, text: t('auth.point.rewards') },
        { icon: Truck, text: t('auth.point.coldchain') },
        { icon: Fingerprint, text: t('auth.point.nafath') },
      ]

  return (
    <AuthLayout points={points}>
      {step === 'review' ? (
        <ReviewPanel onEnter={enterPortal} />
      ) : step === 'otp' ? (
        <>
          <AuthHeading
            title={t('signup.verifyTitle')}
            subtitle={
              <span>
                {t('signin.otpSentTo')} <span dir="ltr" className="font-medium text-ink">{mobile || pick({ en: 'your mobile', ar: 'جوالك' })}</span>
              </span>
            }
            onBack={() => setStep('details')}
          />
          <form onSubmit={(e) => { e.preventDefault(); void (isSupabaseConfigured ? verifyB2c() : finishB2c()) }} className="flex flex-col gap-lg">
            <div className="flex flex-col gap-sm">
              <span className="label !mb-0 flex items-center gap-xs"><KeyRound size={13} /> {t('signin.enterCode')}</span>
              <OtpInput value={otp} onChange={setOtp} />
            </div>
            <button type="submit" disabled={otp.length < 6} className={buttonClass('primary', 'md', 'w-full disabled:opacity-40 disabled:pointer-events-none')}>
              {t('signup.createAccount')} <ArrowRight size={16} className="rtl:rotate-180" />
            </button>
            <p className="font-sans text-caption text-ink-subtle text-center">
              {t('signin.noCode')}{' '}
              <button type="button" onClick={() => setOtp('')} className="text-primary-hover hover:text-ink transition-colors">{t('signin.resend')}</button>
            </p>
          </form>
        </>
      ) : (
        <>
          <AuthHeading title={t('signup.title')} subtitle={t('signup.subtitle')} />
          <ModeToggle mode={mode} onChange={switchMode} />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!isSupabaseConfigured) {
                setStep(isBusiness ? 'review' : 'otp')
                return
              }
              void (isBusiness ? submitB2b() : submitB2cOtp())
            }}
            className="flex flex-col gap-md"
          >
            {isBusiness ? (
              <>
                <AuthField icon={Building2} label={t('signup.companyName')} placeholder={pick({ en: 'Najd Hospitality Group', ar: 'مجموعة نجد للضيافة' })} required />
                <div className="grid sm:grid-cols-2 gap-md">
                  <AuthField icon={Hash} label={t('signup.crNumber')} placeholder="1010xxxxxx" inputMode="numeric" required />
                  <AuthField icon={Receipt} label={t('signup.vatNumber')} hint={t('signup.optional')} placeholder="3xxxxxxxxxxxxx3" inputMode="numeric" />
                </div>
                <AuthField icon={UserRound} label={t('signup.contactName')} placeholder={pick({ en: 'Procurement lead', ar: 'مسؤول المشتريات' })} autoComplete="name" required onChange={(e) => setFullName(e.target.value)} />
                <AuthField icon={Mail} label={t('signup.workEmail')} type="email" placeholder="procurement@company.sa" autoComplete="email" required onChange={(e) => setEmail(e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-md">
                  <AuthField icon={Smartphone} label={t('checkout.phone')} type="tel" placeholder="+9665XXXXXXXX" autoComplete="tel" required onChange={(e) => setMobile(e.target.value)} />
                  <AuthField icon={Lock} label={t('signin.password')} type="password" placeholder="••••••••" autoComplete="new-password" required onChange={(e) => setPassword(e.target.value)} />
                </div>
                <TermsRow agreed={agreed} onToggle={() => setAgreed((v) => !v)} />
                <button type="submit" disabled={!agreed || busy} className={buttonClass('primary', 'md', 'w-full disabled:opacity-40 disabled:pointer-events-none')}>
                  {t('signup.createBusiness')} <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
              </>
            ) : (
              <>
                <AuthField icon={User} label={t('signup.fullName')} placeholder={pick({ en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' })} autoComplete="name" required onChange={(e) => setFullName(e.target.value)} />
                <AuthField icon={Smartphone} label={t('checkout.phone')} type="tel" inputMode="tel" placeholder="+9665XXXXXXXX" autoComplete="tel" required onChange={(e) => setMobile(e.target.value)} />
                <AuthField icon={Mail} label={t('signup.email')} hint={t('signup.optional')} type="email" placeholder="you@email.com" autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
                <TermsRow agreed={agreed} onToggle={() => setAgreed((v) => !v)} />
                <button type="submit" disabled={!agreed || busy} className={buttonClass('primary', 'md', 'w-full disabled:opacity-40 disabled:pointer-events-none')}>
                  {t('signin.sendOtp')} <ArrowRight size={16} className="rtl:rotate-180" />
                </button>
              </>
            )}

            {error && (
              <p role="alert" className="flex items-center gap-xs rounded-md bg-danger/10 border border-danger/20 px-sm py-2 font-sans text-caption text-danger">
                <ShieldAlert size={14} /> {error}
              </p>
            )}
          </form>

          <p className="font-sans text-data text-ink-muted mt-auto pt-md border-t border-hairline">
            {t('signup.haveAccount')}{' '}
            <Link to={`/signin${qs}`} className="text-primary-hover hover:text-ink font-medium transition-colors">
              {t('nav.signin')}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}

function TermsRow({ agreed, onToggle }: { agreed: boolean; onToggle: () => void }) {
  const { t } = useLocale()
  return (
    <button type="button" onClick={onToggle} role="checkbox" aria-checked={agreed} className="flex items-start gap-sm text-start">
      <span className={`mt-0.5 grid place-items-center w-5 h-5 rounded border shrink-0 transition-colors ${agreed ? 'bg-primary border-primary text-on-primary' : 'border-hairline-strong bg-surface-1'}`}>
        {agreed && <CheckCircle2 size={13} />}
      </span>
      <span className="font-sans text-caption text-ink-muted leading-snug">{t('signup.agree')}</span>
    </button>
  )
}

function ReviewPanel({ onEnter }: { onEnter: () => void }) {
  const { t } = useLocale()
  const items = [t('signup.review.cr'), t('signup.review.vat'), t('signup.review.credit')]
  return (
    <div className="flex flex-col gap-lg my-auto text-center items-center">
      <span className="grid place-items-center w-16 h-16 rounded-pill bg-success/12 text-success">
        <CheckCircle2 size={32} />
      </span>
      <div className="flex flex-col gap-xs">
        <h1 className="font-serif text-display-md text-ink">{t('signup.review.title')}</h1>
        <p className="text-body text-ink-muted max-w-sm">{t('signup.review.body')}</p>
      </div>
      <ul className="w-full flex flex-col gap-sm text-start">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-sm rounded-md border border-hairline bg-surface-2 px-md py-3">
            <ShieldCheck size={16} className="text-primary-hover shrink-0" />
            <span className="font-sans text-data text-ink">{it}</span>
          </li>
        ))}
      </ul>
      <button onClick={onEnter} className={buttonClass('primary', 'md', 'w-full')}>
        {t('signup.review.enter')} <ArrowRight size={16} className="rtl:rotate-180" />
      </button>
      <p className="font-sans text-caption text-ink-subtle">{t('signup.review.note')}</p>
    </div>
  )
}
