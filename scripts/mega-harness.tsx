import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { DistributorFileProvider } from '../src/state/DistributorFileContext'
import { MegaAccount } from '../src/pages/mega/MegaAccount'

// Renders the Mega Business · Export workspace directly (bypassing RequireAuth)
// so the real panels — not the auth gate — are exercised in SSR. Test-only.
export function renderMega(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <DistributorFileProvider>
          <StaticRouter location={url}>
            <MegaAccount />
          </StaticRouter>
        </DistributorFileProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
