import { User, Building2 } from 'lucide-react'
import { useChannel, type Channel } from '@/state/ChannelContext'
import { useLocale } from '@/i18n/LocaleContext'
import { cn } from '@/lib/cn'

interface RoleSwitcherProps {
  tone?: 'dark' | 'light'
  size?: 'sm' | 'md'
  full?: boolean
  className?: string
}

/** The always-visible Individual ↔ Business switch. Changes pricing & account world. */
export function RoleSwitcher({ tone = 'light', size = 'md', full = false, className }: RoleSwitcherProps) {
  const { channel, setChannel } = useChannel()
  const { t } = useLocale()

  const opts: { value: Channel; label: string; icon: typeof User }[] = [
    { value: 'b2c', label: t('role.individual'), icon: User },
    { value: 'b2b', label: t('role.business'), icon: Building2 },
  ]

  const sm = size === 'sm'
  const trackClass =
    tone === 'dark'
      ? 'bg-canvas-dark/60 border-hairline-dark'
      : 'bg-surface-2 border-hairline'

  return (
    <div
      role="group"
      aria-label={t('role.shoppingAs')}
      className={cn('inline-flex p-0.5 rounded-pill border', trackClass, full && 'w-full', className)}
    >
      {opts.map((o) => {
        const isActive = channel === o.value
        return (
          <button
            key={o.value}
            onClick={() => setChannel(o.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center justify-center gap-xs rounded-pill font-sans uppercase transition-all duration-300',
              full && 'flex-1',
              sm ? 'px-3 py-1.5 text-[11px] tracking-[0.08em]' : 'px-4 py-2 text-button',
              isActive
                ? 'bg-primary text-on-primary shadow-lift'
                : tone === 'dark'
                  ? 'text-ink-on-dark-muted hover:text-ink-on-dark'
                  : 'text-ink-muted hover:text-ink',
            )}
          >
            <o.icon size={sm ? 13 : 15} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
