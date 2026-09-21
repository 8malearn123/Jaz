import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Lock, ArrowRight, LogIn, UserPlus, ShieldAlert } from 'lucide-react'
import { useChannel } from '@/state/ChannelContext'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import type { RoleId } from '@/data/roles'
import { personas } from '@/data/roles'

/**
 * Gate a route behind an authenticated session; guests see a sign-in prompt.
 *
 * `allow` additionally narrows the route to a set of roles. It is a UI gate, not
 * the security boundary — RLS is what actually refuses a customer the owner's
 * data. This keeps them from reaching a console that would render empty.
 */
export function RequireAuth({
  children,
  titleKey = 'auth.gate.title',
  bodyKey = 'auth.gate.body',
  explore = true,
  allow,
}: {
  children: ReactNode
  titleKey?: string
  bodyKey?: string
  explore?: boolean
  allow?: RoleId[] | 'staff'
}) {
  const { signedIn, role, authReady, roleIsServerOwned } = useChannel()
  const { pathname, search } = useLocation()

  // Wait for the real session before deciding. Without this the gate flashes on
  // every reload for a signed-in person, because getSession() is asynchronous.
  if (roleIsServerOwned && !authReady) return <GateSkeleton />

  if (!signedIn) {
    return <SignInGate next={encodeURIComponent(pathname + search)} titleKey={titleKey} bodyKey={bodyKey} explore={explore} />
  }

  if (allow) {
    const permitted = allow === 'staff' ? personas[role]?.group === 'staff' : allow.includes(role)
    if (!permitted) return <WrongRoleGate />
  }

  return <>{children}</>
}

function GateSkeleton() {
  return (
    <section className="container-narrow py-section" aria-busy="true">
      <div className="max-w-md mx-auto card p-xl flex flex-col items-center gap-md">
        <span className="w-16 h-16 rounded-pill bg-ink/5 animate-pulse" />
        <span className="h-4 w-40 rounded-md bg-ink/5 animate-pulse" />
        <span className="h-3 w-56 rounded-md bg-ink/5 animate-pulse" />
      </div>
    </section>
  )
}

function WrongRoleGate() {
  const { pick } = useLocale()
  const { persona } = useChannel()
  return (
    <section className="container-narrow py-section">
      <div className="max-w-md mx-auto card p-xl lg:p-xxl flex flex-col items-center text-center gap-lg">
        <span className="grid place-items-center w-16 h-16 rounded-pill bg-danger/10 text-danger">
          <ShieldAlert size={28} />
        </span>
        <div className="flex flex-col gap-xs">
          <h1 className="font-serif text-display-md text-ink">
            {pick({ en: 'Not your section', ar: 'ليست صلاحيتك' })}
          </h1>
          <p className="text-body text-ink-muted">
            {pick({
              en: 'This area is limited to staff accounts. Your account is signed in as',
              ar: 'هذا القسم مقصور على حسابات الموظفين. حسابك مسجَّل الدخول بصفة',
            })}{' '}
            <span className="text-ink font-medium">{pick(persona.roleLabel)}</span>.
          </p>
        </div>
        <Link to="/" className={buttonClass('secondary', 'md', 'w-full')}>
          {pick({ en: 'Back to the storefront', ar: 'العودة إلى المتجر' })}
        </Link>
      </div>
    </section>
  )
}

function SignInGate({ next, titleKey, bodyKey, explore }: { next: string; titleKey: string; bodyKey: string; explore: boolean }) {
  const { t } = useLocale()
  return (
    <section className="container-narrow py-section">
      <div className="max-w-md mx-auto card p-xl lg:p-xxl flex flex-col items-center text-center gap-lg">
        <span className="grid place-items-center w-16 h-16 rounded-pill bg-primary/10 text-primary-hover">
          <Lock size={28} />
        </span>
        <div className="flex flex-col gap-xs">
          <h1 className="font-serif text-display-md text-ink">{t(titleKey)}</h1>
          <p className="text-body text-ink-muted">{t(bodyKey)}</p>
        </div>
        <div className="w-full flex flex-col gap-sm">
          <Link to={`/signin?next=${next}`} className={buttonClass('primary', 'md', 'w-full')}>
            <LogIn size={16} /> {t('nav.signin')}
          </Link>
          <Link to={`/signup?next=${next}`} className={buttonClass('secondary', 'md', 'w-full')}>
            <UserPlus size={16} /> {t('signin.createAccount')}
          </Link>
        </div>
        {explore && (
          <Link to="/roles" className="link-gold">
            {t('auth.gate.explore')} <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        )}
      </div>
    </section>
  )
}
