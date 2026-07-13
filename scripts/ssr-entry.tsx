import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from '../src/App'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { CartProvider } from '../src/state/CartContext'
import { BillingProvider } from '../src/state/BillingContext'
import { TeamProvider } from '../src/state/TeamContext'
import { BrandProvider } from '../src/state/BrandContext'

// Render any route to an HTML string — used only by the smoke test.
// Provider tree mirrors src/main.tsx so components that read app context render.
export function render(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <BillingProvider>
            <TeamProvider>
              <BrandProvider>
                <StaticRouter location={url}>
                  <App />
                </StaticRouter>
              </BrandProvider>
            </TeamProvider>
          </BillingProvider>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
