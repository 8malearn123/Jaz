import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { CartProvider } from '../src/state/CartContext'
import { BusinessPage } from '../src/pages/BusinessPage'

// Renders the signed-in B2B portal directly (bypassing RequireAuth) so the real
// panels — not the auth gate — are exercised in SSR. Test-only.
export function renderBusiness(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <StaticRouter location={url}>
            <BusinessPage />
          </StaticRouter>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
