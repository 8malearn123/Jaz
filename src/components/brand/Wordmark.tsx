import { cn } from '@/lib/cn'
import { useBrand } from '@/state/BrandContext'

interface WordmarkProps {
  tone?: 'gold' | 'ink' | 'on-dark'
  size?: 'sm' | 'md' | 'lg'
  withWave?: boolean
  className?: string
}

const logoHeight: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-14',
}

// The real JAZ logo, one colourway per tone so it reads on light and dark surfaces.
// The owner's "Identity & appearance" upload (BrandContext.logoUrl) overrides all of these.
const defaultLogo: Record<NonNullable<WordmarkProps['tone']>, string> = {
  ink: '/brand/logo-brown.png',
  'on-dark': '/brand/logo-white.png',
  gold: '/brand/logo-gold.png',
}

/** The JAZ logo. Renders the owner-uploaded logo when present, otherwise the brand
 *  default colourway for the given tone. Treated as precious. */
export function Wordmark({ tone = 'ink', size = 'md', withWave = false, className }: WordmarkProps) {
  const { logoUrl } = useBrand()
  const src = logoUrl ?? defaultLogo[tone]
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <img src={src} alt="JAZ Chocolate" className={cn('w-auto object-contain', logoHeight[size])} />
      {withWave && (
        <svg
          className={cn('mt-1', tone === 'gold' ? 'text-primary' : tone === 'on-dark' ? 'text-primary-bright' : 'text-primary')}
          width="46"
          height="6"
          viewBox="0 0 46 6"
          fill="none"
          aria-hidden
        >
          <path d="M1 3 Q 6.75 0.5, 12.5 3 T 24 3 T 35.5 3 T 45 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}
