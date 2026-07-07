import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { MegaAccount } from '../src/pages/mega/MegaAccount'

// Renders the Mega Business · Export workspace directly (bypassing RequireAuth)
// so the real panels — not the auth gate — are exercised in SSR. Test-only.
export function renderMega(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <StaticRouter location={url}>
          <MegaAccount />
        </StaticRouter>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
