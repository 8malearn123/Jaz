import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Building2, LogIn, LogOut, ChevronRight } from 'lucide-react'
import { useChannel } from '@/state/ChannelContext'
import { useLocale } from '@/i18n/LocaleContext'
import { customer } from '@/data/account'
import { cn } from '@/lib/cn'
import { RoleSwitcher } from './RoleSwitcher'

export function AccountMenu() {
  const { channel, isBusiness, org } = useChannel()
  const { t, pick } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('relative grid place-items-center w-10 h-10 transition-colors', isBusiness ? 'text-primary-hover' : 'text-ink-muted hover:text-ink')}
        aria-label={t('nav.account')}
        aria-expanded={open}
      >
        <User size={19} />
        {isBusiness && <span className="absolute top-1.5 w-1.5 h-1.5 rounded-pill bg-primary" style={{ insetInlineEnd: 6 }} />}
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] w-[300px] rounded-lg border border-hairline bg-surface-1 shadow-soft-lg overflow-hidden z-50 animate-scale-in origin-top"
          style={{ insetInlineEnd: 0 }}
        >
          {/* identity */}
          <div className="p-lg bg-surface-2 border-b border-hairline">
            <p className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('account.greeting')}</p>
            <p className="font-serif text-card-title text-ink truncate">{isBusiness ? pick(org.legalName) : pick(customer.name)}</p>
          </div>

          {/* role switch */}
          <div className="p-lg flex flex-col gap-sm border-b border-hairline">
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('role.shoppingAs')}</span>
            <RoleSwitcher full />
            <p className="font-sans text-caption text-ink-muted leading-relaxed">
              {channel === 'b2b' ? t('role.businessDesc') : t('role.individualDesc')}
            </p>
          </div>

          {/* destinations */}
          <div className="p-xs">
            <MenuLink to="/account" icon={User} label={t('role.myAccount')} active={!isBusiness} onClick={() => setOpen(false)} />
            <MenuLink to="/business" icon={Building2} label={t('role.businessPortal')} active={isBusiness} onClick={() => setOpen(false)} />
          </div>
          <div className="p-xs border-t border-hairline">
            <MenuLink to="/signin" icon={LogIn} label={t('nav.signin')} onClick={() => setOpen(false)} />
            <button className="w-full flex items-center gap-sm px-md py-2.5 rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors font-sans text-data">
              <LogOut size={16} className="text-ink-subtle" />
              {t('role.signOut')}
            </button>
          </div>
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
