import { Link } from 'react-router-dom'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { MotifGlyph } from '@/components/brand/PatternBand'

export function NotFoundPage() {
  const { t } = useLocale()
  return (
    <section className="container-narrow py-section min-h-[60vh] grid place-items-center text-center">
      <div className="flex flex-col items-center gap-md">
        <MotifGlyph motif="mango" size={48} />
        <p className="font-serif text-display-xl text-primary leading-none">404</p>
        <h1 className="font-serif text-display-md text-ink">{t('notFound.title')}</h1>
        <p className="text-body-lg text-ink-muted max-w-md">{t('notFound.body')}</p>
        <Link to="/" className={buttonClass('primary', 'md', 'mt-sm')}>
          {t('notFound.cta')}
        </Link>
      </div>
    </section>
  )
}
