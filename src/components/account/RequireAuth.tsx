import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Lock, ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { useChannel } from '@/state/ChannelContext'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'

/** Gate a route behind an authenticated session; guests see a sign-in prompt. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { signedIn } = useChannel()
  const { pathname, search } = useLocation()
  if (signedIn) return <>{children}</>
  return <SignInGate next={encodeURIComponent(pathname + search)} />
}

function SignInGate({ next }: { next: string }) {
  const { t } = useLocale()
  return (
    <section className="container-narrow py-section">
      <div className="max-w-md mx-auto card p-xl lg:p-xxl flex flex-col items-center text-center gap-lg">
        <span className="grid place-items-center w-16 h-16 rounded-pill bg-primary/10 text-primary-hover">
          <Lock size={28} />
        </span>
        <div className="flex flex-col gap-xs">
          <h1 className="font-serif text-display-md text-ink">{t('auth.gate.title')}</h1>
          <p className="text-body text-ink-muted">{t('auth.gate.body')}</p>
        </div>
        <div className="w-full flex flex-col gap-sm">
          <Link to={`/signin?next=${next}`} className={buttonClass('primary', 'md', 'w-full')}>
            <LogIn size={16} /> {t('nav.signin')}
          </Link>
          <Link to={`/signup?next=${next}`} className={buttonClass('secondary', 'md', 'w-full')}>
            <UserPlus size={16} /> {t('signin.createAccount')}
          </Link>
        </div>
        <Link to="/roles" className="link-gold">
          {t('auth.gate.explore')} <ArrowRight size={14} className="rtl:rotate-180" />
        </Link>
      </div>
    </section>
  )
}
