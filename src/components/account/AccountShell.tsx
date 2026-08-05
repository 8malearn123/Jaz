import { useEffect, useRef, type ReactNode, type ComponentType } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Eyebrow } from '@/components/ui/Misc'
import { WaveDivider } from '@/components/brand/WaveDivider'

export interface TabDef {
  id: string
  label: string
  icon?: ComponentType<{ size?: number | string; className?: string }>
  /** Nested sub-tabs — expand under this tab when one of them is active. */
  children?: TabDef[]
}

interface AccountShellProps {
  eyebrow: string
  title: string
  subtitle?: string
  tone?: 'light' | 'dark'
  tabs: TabDef[]
  active: string
  onSelect: (id: string) => void
  headerExtra?: ReactNode
  /** Optional card pinned to the bottom of the tab column (desktop sidebar only). */
  navFooter?: ReactNode
  children: ReactNode
}

/** Dashboard chrome shared by the Individual and Business account worlds. */
export function AccountShell({ eyebrow, title, subtitle, tone = 'light', tabs, active, onSelect, headerExtra, navFooter, children }: AccountShellProps) {
  const dark = tone === 'dark'
  const navRef = useRef<HTMLElement>(null)

  // Keep the current section visible inside the nav's own scroll — a deep link to a
  // section far down the list should land on it, not below the fold of the column.
  // Only the nav's scrollTop is ever touched, so the page itself never jumps.
  useEffect(() => {
    const nav = navRef.current
    if (!nav || nav.scrollHeight <= nav.clientHeight) return
    const el = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (!el) return
    const navBox = nav.getBoundingClientRect()
    const elBox = el.getBoundingClientRect()
    if (elBox.top < navBox.top) nav.scrollTop -= navBox.top - elBox.top + 8
    else if (elBox.bottom > navBox.bottom) nav.scrollTop += elBox.bottom - navBox.bottom + 8
  }, [active])

  return (
    <>
      {/* header band */}
      <section className={cn(dark ? 'bg-canvas-dark text-ink-on-dark' : 'bg-surface-2 border-b border-hairline')}>
        <div className="container-jaz pt-xxl pb-xl">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-lg">
            <div className="flex flex-col gap-sm">
              <Eyebrow tone={dark ? 'on-dark' : 'gold'}>{eyebrow}</Eyebrow>
              <h1 className={cn('font-serif text-display-md leading-tight', dark ? 'text-ink-on-dark' : 'text-ink')}>{title}</h1>
              {subtitle && <p className={cn('text-body', dark ? 'text-ink-on-dark-muted' : 'text-ink-muted')}>{subtitle}</p>}
            </div>
            {headerExtra && <div className="shrink-0">{headerExtra}</div>}
          </div>
        </div>
        {dark && <WaveDivider tone="gold" height={18} />}
      </section>

      {/* body */}
      <section className="container-jaz py-xl">
        <div className="grid lg:grid-cols-[236px_1fr] gap-lg lg:gap-xl items-start">
          {/* tab nav */}
          {/* Sticky on its own: pinned under the navbar and scrolling inside itself, so a
              long section list never drags the page with it. Mobile keeps the horizontal rail. */}
          <nav
            ref={navRef}
            className="flex items-start lg:items-stretch lg:flex-col gap-xs overflow-x-auto sidebar-scroll -mx-lg px-lg lg:mx-0 lg:px-0 lg:sticky lg:top-28 lg:max-h-[calc(100vh-9rem)] lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:pe-1.5"
            aria-label={title}
          >
            {tabs.map((tab) => {
              const kids = tab.children
              // Group tab: expands to its sub-tabs when one of them is active.
              if (kids && kids.length) {
                const open = kids.some((c) => c.id === active)
                return (
                  <div key={tab.id} className="flex flex-col gap-xs shrink-0">
                    <button
                      onClick={() => onSelect(kids[0].id)}
                      aria-expanded={open}
                      className={cn(
                        'flex items-center gap-sm whitespace-nowrap rounded-md px-md py-3 transition-colors text-start font-sans text-button uppercase tracking-[0.06em]',
                        open ? 'text-ink bg-surface-2' : 'text-ink-muted hover:text-ink hover:bg-surface-2',
                      )}
                    >
                      {tab.icon && <tab.icon size={17} className={open ? 'text-primary-hover' : 'text-ink-subtle'} />}
                      <span className="flex-1">{tab.label}</span>
                      <ChevronDown size={15} className={cn('shrink-0 transition-transform', open ? 'text-primary-hover rotate-180' : 'text-ink-subtle')} />
                    </button>
                    {open && (
                      <div className="flex lg:flex-col gap-xs ms-[19px] ps-sm border-s border-hairline-strong">
                        {kids.map((c) => {
                          const on = c.id === active
                          return (
                            <button
                              key={c.id}
                              onClick={() => onSelect(c.id)}
                              aria-current={on ? 'page' : undefined}
                              className={cn(
                                'whitespace-nowrap rounded-md px-md py-2 transition-colors text-start shrink-0 font-sans text-data',
                                on ? 'bg-ink text-ink-on-dark' : 'text-ink-muted hover:text-ink hover:bg-surface-2',
                              )}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }
              const isActive = tab.id === active
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelect(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-sm whitespace-nowrap rounded-md px-md py-3 transition-colors text-start shrink-0',
                    'font-sans text-button uppercase tracking-[0.06em]',
                    isActive ? 'bg-ink text-ink-on-dark' : 'text-ink-muted hover:text-ink hover:bg-surface-2',
                  )}
                >
                  {tab.icon && <tab.icon size={17} className={isActive ? 'text-primary-bright' : 'text-ink-subtle'} />}
                  {tab.label}
                </button>
              )
            })}
            {navFooter && <div className="hidden lg:block mt-lg pt-lg border-t border-hairline">{navFooter}</div>}
          </nav>

          {/* panel */}
          <div className="min-w-0 animate-fade-in">{children}</div>
        </div>
      </section>
    </>
  )
}
