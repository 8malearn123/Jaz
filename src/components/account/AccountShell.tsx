import type { ReactNode, ComponentType } from 'react'
import { cn } from '@/lib/cn'
import { Eyebrow } from '@/components/ui/Misc'
import { WaveDivider } from '@/components/brand/WaveDivider'

export interface TabDef {
  id: string
  label: string
  icon: ComponentType<{ size?: number | string; className?: string }>
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
          <nav
            className="flex lg:flex-col gap-xs overflow-x-auto no-scrollbar lg:overflow-visible lg:sticky lg:top-28 -mx-lg px-lg lg:mx-0 lg:px-0"
            aria-label={title}
          >
            {tabs.map((tab) => {
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
                  <tab.icon size={17} className={isActive ? 'text-primary-bright' : 'text-ink-subtle'} />
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
