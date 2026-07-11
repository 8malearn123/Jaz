import { cn } from '@/lib/cn'
import { useLocale } from '@/i18n/LocaleContext'
import { useBrand } from '@/state/BrandContext'

interface WordmarkProps {
  tone?: 'gold' | 'ink' | 'on-dark'
  size?: 'sm' | 'md' | 'lg'
  withWave?: boolean
  className?: string
}

const toneColor: Record<NonNullable<WordmarkProps['tone']>, string> = {
  gold: 'text-primary',
  ink: 'text-ink',
  'on-dark': 'text-ink-on-dark',
}

const sizeClass: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'text-[20px]',
  md: 'text-[26px]',
  lg: 'text-[34px]',
}

const logoHeight: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-11',
}

/** The JAZ wordmark — serif voice, gold-foil tone. Treated as precious.
 *  When the owner uploads a logo (Identity & appearance), it replaces the text. */
export function Wordmark({ tone = 'ink', size = 'md', withWave = false, className }: WordmarkProps) {
  const { locale } = useLocale()
  const { logoUrl } = useBrand()
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      {logoUrl ? (
        <img src={logoUrl} alt="JAZ" className={cn('w-auto object-contain', logoHeight[size])} />
      ) : (
      <span
        className={cn('font-serif font-medium tracking-[0.14em]', toneColor[tone], sizeClass[size])}
        aria-label="JAZ"
      >
        {locale === 'ar' ? 'جاز' : 'JAZ'}
      </span>
      )}
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
