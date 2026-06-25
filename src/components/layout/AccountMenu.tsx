import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Building2, ShieldCheck, LogIn, LogOut, ChevronRight, Lock, UserPlus, ArrowLeftRight } from 'lucide-react'
import { useChannel } from '@/state/ChannelContext'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { roleIcons } from '@/components/roles/roleIcons'
import { cn } from '@/lib/cn'

export function AccountMenu() {
  const { persona, signedIn, signOut, isBusiness, isStaff, isPrivileged } = useChannel()
  const { t, pick } = useLocale()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const PersonaIcon = roleIcons[persona.id]

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSignOut = () => {
    setOpen(false)
    signOut()
    navigate('/')
  }

  const accent = signedIn && (isStaff || isBusiness) ? 'text-primary-hover' : 'text-ink-muted hover:text-ink'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('relative grid place-items-center w-10 h-10 transition-colors', accent)}
        aria-label={t('nav.account')}
        aria-expanded={open}
      >
        <User size={19} />
        {signedIn && (isBusiness || isStaff) && <span className="absolute top-1.5 w-1.5 h-1.5 rounded-pill bg-primary" style={{ insetInlineEnd: 6 }} />}
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] w-[300px] rounded-lg border border-hairline bg-surface-1 shadow-soft-lg overflow-hidden z-50 animate-scale-in origin-top"
          style={{ insetInlineEnd: 0 }}
        >
          {signedIn ? (
            <>
              {/* identity */}
              <div className="p-lg bg-surface-2 border-b border-hairline flex items-center gap-sm">
                <span className="grid place-items-center w-10 h-10 rounded-md shrink-0" style={{ backgroundColor: persona.accent, color: persona.onAccent }}>
                  <PersonaIcon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-serif text-card-title text-ink truncate">{pick(persona.name)}</p>
                  <p className="font-sans text-caption text-ink-subtle truncate flex items-center gap-xxs">
                    {pick(persona.roleLabel)}
                    {isPrivileged && <Lock size={11} />}
                  </p>
                </div>
              </div>

              {/* the current role's dashboard */}
              <div className="p-xs">
                {isStaff ? (
                  <MenuLink to="/admin" icon={ShieldCheck} label={t('role.adminConsole')} active onClick={() => setOpen(false)} />
                ) : isBusiness ? (
                  <MenuLink to="/business" icon={Building2} label={t('role.businessPortal')} active onClick={() => setOpen(false)} />
                ) : (
                  <MenuLink to="/account" icon={User} label={t('role.myAccount')} active onClick={() => setOpen(false)} />
                )}
                <MenuLink to="/roles" icon={ArrowLeftRight} label={t('role.switch')} onClick={() => setOpen(false)} />
              </div>
              <div className="p-xs border-t border-hairline">
                <button onClick={handleSignOut} className="w-full flex items-center gap-sm px-md py-2.5 rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors font-sans text-data">
                  <LogOut size={16} className="text-ink-subtle" />
                  {t('role.signOut')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* guest */}
              <div className="p-lg bg-surface-2 border-b border-hairline">
                <p className="font-serif text-card-title text-ink">{t('auth.menu.guestTitle')}</p>
                <p className="font-sans text-caption text-ink-subtle mt-0.5">{t('auth.menu.guestBody')}</p>
              </div>
              <div className="p-sm flex flex-col gap-xs">
                <Link to="/signin" onClick={() => setOpen(false)} className={buttonClass('primary', 'md', 'w-full')}>
                  <LogIn size={16} /> {t('nav.signin')}
                </Link>
                <Link to="/signup" onClick={() => setOpen(false)} className={buttonClass('secondary', 'md', 'w-full')}>
                  <UserPlus size={16} /> {t('signin.createAccount')}
                </Link>
              </div>
              <div className="p-xs border-t border-hairline">
                <MenuLink to="/roles" icon={ArrowLeftRight} label={t('auth.gate.explore')} onClick={() => setOpen(false)} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuLink({
  to,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  to: string
  icon: typeof User
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-sm px-md py-2.5 rounded-md transition-colors font-sans text-data',
        active ? 'bg-primary/10 text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon size={16} className={active ? 'text-primary-hover' : 'text-ink-subtle'} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight size={14} className="text-primary rtl:rotate-180" />}
    </Link>
  )
}
