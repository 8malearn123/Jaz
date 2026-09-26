import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LocaleProvider } from '@/i18n/LocaleContext'
import { AuthProvider } from '@/state/AuthContext'
import { ChannelProvider } from '@/state/ChannelContext'
import { CatalogueProvider } from '@/state/CatalogueContext'
import { CartProvider } from '@/state/CartContext'
import { BillingProvider } from '@/state/BillingContext'
import { StatementsProvider } from '@/state/StatementsContext'
import { DistributorFileProvider } from '@/state/DistributorFileContext'
import { ForecastProvider } from '@/state/ForecastContext'
import { TeamProvider } from '@/state/TeamContext'
import { GovernanceProvider } from '@/state/GovernanceContext'
import { BrandProvider } from '@/state/BrandContext'
import { ArtworksProvider } from '@/state/ArtworksContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      {/* Owns the real session; ChannelProvider reads the role from it. */}
      <AuthProvider>
      <ChannelProvider>
        {/* The catalogue sits above the cart and the gallery: both read from it. */}
        <CatalogueProvider>
        <CartProvider>
          <BillingProvider>
           <StatementsProvider>
           {/* The distributor file is authored in the console and read in the
               partner portals — one state above both. */}
           <DistributorFileProvider>
           <ForecastProvider>
            <TeamProvider>
              {/* Governance sits above the console: it needs to know who is signed in. */}
              <GovernanceProvider>
                <BrandProvider>
                  {/* The gallery is authored in the console and hung on /art — one state above both. */}
                  <ArtworksProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </ArtworksProvider>
                </BrandProvider>
              </GovernanceProvider>
            </TeamProvider>
           </ForecastProvider>
           </DistributorFileProvider>
           </StatementsProvider>
          </BillingProvider>
        </CartProvider>
        </CatalogueProvider>
      </ChannelProvider>
      </AuthProvider>
    </LocaleProvider>
  </StrictMode>,
)
