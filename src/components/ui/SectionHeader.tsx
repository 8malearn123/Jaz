import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  title: string
  body?: string
  align?: 'start' | 'center'
  tone?: 'ink' | 'on-dark'
  className?: string
}

/**
 * A section's opening line: a bilingual Canela title, optionally with a short standfirst
 * beneath it. Deliberately unadorned — no numeral, no kicker, no label — so the title
 * alone announces the section.
 */
export function SectionHeader({ title, body, align = 'start', tone = 'ink', className }: SectionHeaderProps) {
  const titleColor = tone === 'on-dark' ? 'text-ink-on-dark' : 'text-ink'
  const bodyColor = tone === 'on-dark' ? 'text-ink-on-dark-muted' : 'text-ink-muted'
  return (
    <div className={cn('flex flex-col gap-md', align === 'center' && 'items-center text-center', className)}>
      <h2 className={cn('font-serif text-display-md md:text-display-lg whitespace-pre-line text-balance max-w-3xl', titleColor)}>
        {title}
      </h2>
      {body && <p className={cn('text-body-lg max-w-prose', bodyColor)}>{body}</p>}
    </div>
  )
}
