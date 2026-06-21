import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ShoppingBag, Search, Menu, X, Globe } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useCart } from '@/state/CartContext'
import { cn } from '@/lib/cn'
import { Wordmark } from '@/components/brand/Wordmark'
import { buttonClass } from '@/components/ui/Button'
import { RoleSwitcher } from './RoleSwitcher'
import { AccountMenu } from './AccountMenu'

const navItems = [
  { to: '/shop', key: 'nav.shop' },
  { to: '/collections', key: 'nav.collections' },
  { to: '/corporate', key: 'nav.corporate' },
  { to: '/heritage', key: 'nav.heritage' },
] as const

export function Navbar() {
  const { t, toggleLocale, locale } = useLocale()
  const { count } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50">
      {/* slim announcement strip + role switch */}
      <div className="bg-chocolate text-ink-on-dark-muted">
        <div className="container-jaz flex items-center justify-between gap-md h-10 overflow-hidden">
          <p className="hidden sm:block font-sans text-caption tracking-[0.1em] uppercase truncate">
            {locale === 'ar'
              ? 'توصيل بسلسلة تبريد في كل المملكة · فاتورة معتمدة من هيئة الزكاة'
              : 'Cold-chain delivery Kingdom-wide · ZATCA-compliant invoicing'}
          </p>
          <div className="flex items-center gap-sm ms-auto">
            <span className="hidden md:inline font-sans text-caption uppercase tracking-[0.1em] text-ink-on-dark-muted/70">
              {t('role.shoppingAs')}
            </span>
            <RoleSwitcher tone="dark" size="sm" />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'transition-colors duration-300 border-b',
          scrolled ? 'bg-canvas/85 backdrop-blur-md border-hairline' : 'bg-canvas border-transparent',
        )}
      >
        <nav className="container-jaz flex items-center justify-between gap-md h-[72px]">
          {/* inline-start: menu (mobile) + wordmark */}
          <div className="flex items-center gap-sm">
            <button
              className="lg:hidden grid place-items-center w-10 h-10 -ms-2 text-ink"
              onClick={() => setOpen(true)}
              aria-label={t('nav.menu')}
            >
              <Menu size={22} />
            </button>
            <Link to="/" className="flex items-center" aria-label="JAZ home">
              <Wordmark tone="ink" size="md" />
            </Link>
          </div>

          {/* center: links */}
          <ul className="hidden lg:flex items-center gap-xl">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'eyebrow transition-colors duration-200 pb-1 border-b-2',
                      isActive ? 'text-ink border-primary' : 'text-ink-muted border-transparent hover:text-ink',
                    )
                  }
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* inline-end: utilities */}
          <div className="flex items-center gap-xxs sm:gap-xs">
            <button
              onClick={toggleLocale}
              className="hidden sm:inline-flex items-center gap-xxs h-10 px-3 font-sans text-caption uppercase tracking-[0.1em] text-ink-muted hover:text-ink transition-colors rounded-md"
              aria-label="Toggle language"
            >
              <Globe size={15} />
              {t('lang.toggle')}
            </button>
            <button className="grid place-items-center w-10 h-10 text-ink-muted hover:text-ink transition-colors" aria-label={t('nav.search')}>
              <Search size={19} />
            </button>
            <AccountMenu />
            <Link to="/cart" className="relative grid place-items-center w-10 h-10 text-ink hover:text-primary-hover transition-colors" aria-label={t('nav.cart')}>
              <ShoppingBag size={20} />
              {count > 0 && (
                <span
                  className="absolute -top-0.5 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-pill bg-primary text-on-primary font-sans text-[10px] font-semibold tabular-nums"
                  style={{ insetInlineEnd: 2 }}
                >
                  {count}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>

      {/* mobile sheet */}
      <MobileSheet open={open} onClose={() => setOpen(false)} />
    </header>
  )
}

function MobileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, toggleLocale } = useLocale()
  return (
    <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('absolute inset-0 bg-overlay/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute inset-y-0 w-[84%] max-w-sm bg-canvas shadow-soft-lg transition-transform duration-300 ease-editorial flex flex-col',
          open ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full',
        )}
        style={{ insetInlineStart: 0 }}
      >
        <div className="flex items-center justify-between h-[72px] px-lg border-b border-hairline">
          <Wordmark tone="ink" size="md" />
          <button onClick={onClose} className="grid place-items-center w-10 h-10 text-ink" aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {/* role switch */}
        <div className="px-lg pt-lg flex flex-col gap-xs">
          <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('role.shoppingAs')}</span>
          <RoleSwitcher full />
        </div>
        <nav className="flex flex-col p-lg gap-xs flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'font-serif text-headline py-2 border-b border-hairline/60 transition-colors',
                  isActive ? 'text-primary-hover' : 'text-ink hover:text-primary-hover',
                )
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
          <Link to="/account" className="font-serif text-headline py-2 border-b border-hairline/60 text-ink hover:text-primary-hover">
            {t('role.myAccount')}
          </Link>
          <Link to="/business" className="font-serif text-headline py-2 border-b border-hairline/60 text-ink hover:text-primary-hover">
            {t('role.businessPortal')}
          </Link>
        </nav>
        <div className="p-lg flex flex-col gap-sm border-t border-hairline">
          <button onClick={toggleLocale} className={buttonClass('secondary', 'md', 'w-full')}>
            <Globe size={16} />
            {t('lang.toggle')}
          </button>
          <Link to="/shop" className={buttonClass('primary', 'md', 'w-full')}>
            {t('cta.shop')}
          </Link>
        </div>
      </div>
    </div>
  )
}
