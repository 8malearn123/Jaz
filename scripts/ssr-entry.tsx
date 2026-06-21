import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from '../src/App'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { CartProvider } from '../src/state/CartContext'

// Render any route to an HTML string — used only by the smoke test.
export function render(url: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
