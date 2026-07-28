import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LocaleProvider } from '@/i18n/LocaleContext'
import { ChannelProvider } from '@/state/ChannelContext'
import { CartProvider } from '@/state/CartContext'
import { BillingProvider } from '@/state/BillingContext'
import { StatementsProvider } from '@/state/StatementsContext'
import { ForecastProvider } from '@/state/ForecastContext'
import { TeamProvider } from '@/state/TeamContext'
import { GovernanceProvider } from '@/state/GovernanceContext'
import { BrandProvider } from '@/state/BrandContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <ChannelProvider>
        <CartProvider>
          <BillingProvider>
           <StatementsProvider>
           <ForecastProvider>
            <TeamProvider>
              {/* Governance sits above the console: it needs to know who is signed in. */}
              <GovernanceProvider>
                <BrandProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </BrandProvider>
              </GovernanceProvider>
            </TeamProvider>
           </ForecastProvider>
           </StatementsProvider>
          </BillingProvider>
        </CartProvider>
      </ChannelProvider>
    </LocaleProvider>
  </StrictMode>,
)
