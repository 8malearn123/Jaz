import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  /** Two-digit section marker, e.g. "01" */
  number?: string
  eyebrow?: string
  title: string
  /** Uppercase label opposite the number, e.g. "APPLICATIONS" */
  label?: string
  body?: string
  align?: 'start' | 'center'
  tone?: 'ink' | 'on-dark'
  className?: string
}

/**
 * The brand's signature section marker: a gold Canela numeral set tight against a
 * bilingual title, with a small uppercase Gotham label opposite. The most recognizable
 * typographic device in the system.
 */
export function SectionHeader({
  number,
  eyebrow,
  title,
  label,
  body,
  align = 'start',
  tone = 'ink',
  className,
}: SectionHeaderProps) {
  const titleColor = tone === 'on-dark' ? 'text-ink-on-dark' : 'text-ink'
  const bodyColor = tone === 'on-dark' ? 'text-ink-on-dark-muted' : 'text-ink-muted'
  return (
    <div className={cn('flex flex-col gap-md', align === 'center' && 'items-center text-center', className)}>
      {(number || label || eyebrow) && (
        <div
          className={cn(
            'flex items-baseline gap-md w-full',
            align === 'center' ? 'justify-center' : 'justify-between',
          )}
        >
          <div className="flex items-baseline gap-sm">
            {number && (
              <span className="font-serif text-section-number text-primary tabular-nums" aria-hidden>
                {number}
              </span>
            )}
            {eyebrow && <span className={cn('eyebrow', tone === 'on-dark' ? 'text-primary-bright' : 'text-primary-hover')}>{eyebrow}</span>}
          </div>
          {label && align !== 'center' && (
            <span className={cn('eyebrow hidden sm:block', tone === 'on-dark' ? 'text-ink-on-dark-muted' : 'text-ink-subtle')}>
              {label}
            </span>
          )}
        </div>
      )}
      <h2 className={cn('font-serif text-display-md md:text-display-lg whitespace-pre-line text-balance max-w-3xl', titleColor)}>
        {title}
      </h2>
      {body && <p className={cn('text-body-lg max-w-prose', bodyColor)}>{body}</p>}
    </div>
  )
}
