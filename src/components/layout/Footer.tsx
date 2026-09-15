import { Link } from 'react-router-dom'
import { Instagram, Twitter, MessageCircle } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { Wordmark } from '@/components/brand/Wordmark'

/*
 * "يكون صغير ونظيف جدًا" — the client asked for a small, very clean footer, and gave
 * its whole contents: three headings, two links each, then the socials and the rights
 * line. Everything the old footer carried beyond that (the tagline, the location line,
 * the wave divider, a second legal line, and twelve more links) is gone on purpose —
 * each was a reason the block read as a page rather than a footer.
 */
const columns = [
  {
    head: 'footer.shop',
    links: [
      { key: 'footer.allProducts', to: '/shop' },
      { key: 'footer.gifts', to: '/gifts' },
    ],
  },
  {
    head: 'footer.about',
    links: [
      { key: 'footer.ourStory', to: '/heritage' },
      // There is no /contact route and no published address for the maison. The
      // corporate application is the one surface here that actually reaches JAZ —
      // retarget the day a real contact page exists rather than inventing one.
      { key: 'footer.contact', to: '/corporate#apply' },
    ],
  },
  {
    head: 'footer.business',
    links: [
      { key: 'footer.corporateGifting', to: '/corporate' },
      { key: 'footer.corporateOrders', to: '/business' },
    ],
  },
] as const

// Placeholders until the maison hands over its accounts — each named, so a screen
// reader announces three links rather than three identical "social"s.
const socials = [
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Twitter, label: 'Twitter' },
  { Icon: MessageCircle, label: 'WhatsApp' },
] as const

export function Footer() {
  const { t } = useLocale()
  return (
    <footer className="bg-canvas-dark text-ink-on-dark-muted mt-section border-t border-hairline-dark">
      <div className="container-jaz py-xl">
        <div className="flex flex-col gap-xl md:flex-row md:items-start md:justify-between">
          <Wordmark tone="on-dark" size="md" />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-xl gap-y-lg">
            {columns.map((col) => (
              <div key={col.head} className="flex flex-col gap-sm">
                <h4 className="eyebrow text-primary-bright">{t(col.head)}</h4>
                <ul className="flex flex-col gap-xs">
                  {col.links.map((link) => (
                    <li key={link.key}>
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

        <div className="mt-xl pt-md border-t border-hairline-dark flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-sm">
          <p className="font-sans text-caption text-ink-on-dark-muted">{t('footer.rights')}</p>
          <div className="flex items-center gap-xs">
            {socials.map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={label}
                className="grid place-items-center w-9 h-9 rounded-pill text-ink-on-dark-muted hover:text-primary transition-colors"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
