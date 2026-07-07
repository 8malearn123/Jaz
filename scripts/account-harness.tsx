import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { CartProvider } from '../src/state/CartContext'
import { AccountPage } from '../src/pages/AccountPage'

// Renders the signed-in Customer account directly (bypassing RequireAuth) so the
// real panels — not the auth gate — are exercised in SSR. Test-only.
export function renderAccount(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <StaticRouter location={url}>
            <AccountPage />
          </StaticRouter>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
