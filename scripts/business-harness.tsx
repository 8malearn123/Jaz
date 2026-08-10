import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { CartProvider } from '../src/state/CartContext'
import { BillingProvider } from '../src/state/BillingContext'
import { StatementsProvider } from '../src/state/StatementsContext'
import { DistributorFileProvider } from '../src/state/DistributorFileContext'
import { BusinessPage } from '../src/pages/BusinessPage'

// Renders the signed-in B2B portal directly (bypassing RequireAuth) so the real
// panels — not the auth gate — are exercised in SSR. Test-only.
export function renderBusiness(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <BillingProvider>
            <StatementsProvider>
              <DistributorFileProvider>
                <StaticRouter location={url}>
                  <BusinessPage />
                </StaticRouter>
              </DistributorFileProvider>
            </StatementsProvider>
          </BillingProvider>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
