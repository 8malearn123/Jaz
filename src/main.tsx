import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LocaleProvider } from '@/i18n/LocaleContext'
import { ChannelProvider } from '@/state/ChannelContext'
import { CartProvider } from '@/state/CartContext'
import { BillingProvider } from '@/state/BillingContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <BillingProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </BillingProvider>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>
  </StrictMode>,
)
