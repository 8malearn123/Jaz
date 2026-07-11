import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LocaleProvider } from '@/i18n/LocaleContext'
import { ChannelProvider } from '@/state/ChannelContext'
import { CartProvider } from '@/state/CartContext'
import { BillingProvider } from '@/state/BillingContext'
import { TeamProvider } from '@/state/TeamContext'
import { BrandProvider } from '@/state/BrandContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <BillingProvider>
            <TeamProvider>
              <BrandProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </BrandProvider>
            </TeamProvider>
          </BillingProvider>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>
  </StrictMode>,
)
