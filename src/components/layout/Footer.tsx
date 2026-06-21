import { Link } from 'react-router-dom'
import { Instagram, Twitter, MessageCircle } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { Wordmark } from '@/components/brand/Wordmark'
import { WaveDivider } from '@/components/brand/WaveDivider'

const columns = [
  {
    head: 'footer.shop',
    links: [
      { key: 'footer.allChocolate', to: '/shop' },
      { key: 'footer.collections', to: '/collections' },
      { key: 'footer.giftCards', to: '/shop' },
      { key: 'footer.subscriptions', to: '/shop' },
    ],
  },
  {
    head: 'footer.about',
    links: [
      { key: 'footer.ourStory', to: '/heritage' },
      { key: 'footer.artists', to: '/heritage' },
      { key: 'footer.sustainability', to: '/heritage' },
      { key: 'footer.careers', to: '/heritage' },
    ],
  },
  {
    head: 'footer.business',
    links: [
      { key: 'footer.corporateGifting', to: '/corporate' },
      { key: 'footer.creditAccounts', to: '/business' },
      { key: 'footer.becomeReseller', to: '/corporate' },
      { key: 'nav.business', to: '/business' },
    ],
  },
  {
    head: 'footer.support',
    links: [
      { key: 'footer.contact', to: '/heritage' },
      { key: 'footer.shipping', to: '/heritage' },
      { key: 'footer.returns', to: '/heritage' },
      { key: 'footer.privacy', to: '/heritage' },
    ],
  },
] as const

export function Footer() {
  const { t } = useLocale()
  return (
    <footer className="bg-canvas-dark text-ink-on-dark-muted mt-section">
      <WaveDivider tone="gold" height={20} className="opacity-90" />
      <div className="container-jaz pt-xxl pb-xl">
        <div className="grid gap-xl lg:grid-cols-[1.4fr_2.6fr]">
          {/* brand block */}
          <div className="flex flex-col gap-md max-w-sm">
            <Wordmark tone="on-dark" size="lg" withWave />
            <p className="font-serif text-body-lg text-ink-on-dark leading-relaxed">{t('brand.tagline')}</p>
            <p className="font-sans text-caption tracking-wide text-ink-on-dark-muted">{t('brand.location')}</p>
            <div className="flex items-center gap-sm mt-xs">
              {[Instagram, Twitter, MessageCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="grid place-items-center w-10 h-10 rounded-pill border border-hairline-dark text-ink-on-dark-muted hover:text-primary hover:border-primary/50 transition-colors"
                  aria-label="social"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-lg gap-y-xl">
            {columns.map((col) => (
              <div key={col.head} className="flex flex-col gap-md">
                <h4 className="eyebrow text-primary-bright">{t(col.head)}</h4>
                <ul className="flex flex-col gap-sm">
                  {col.links.map((link) => (
                    <li key={link.key + link.to}>
                      <Link to={link.to} className="font-sans text-data text-ink-on-dark-muted hover:text-ink-on-dark transition-colors">
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-xxl pt-lg border-t border-hairline-dark flex flex-col md:flex-row items-start md:items-center justify-between gap-sm">
          <p className="font-sans text-caption text-ink-on-dark-muted">{t('footer.rights')}</p>
          <p className="font-sans text-caption text-ink-subtle">{t('footer.madeIn')}</p>
        </div>
      </div>
    </footer>
  )
}
