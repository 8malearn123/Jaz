import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { BillingProvider } from '../src/state/BillingContext'
import { StatementsProvider } from '../src/state/StatementsContext'
import { ForecastProvider } from '../src/state/ForecastContext'
import { TeamProvider } from '../src/state/TeamContext'
import { GovernanceProvider } from '../src/state/GovernanceContext'
import { BrandProvider } from '../src/state/BrandContext'
import { AdminConsole } from '../src/pages/AdminConsole'

// Renders the admin/owner console directly under a given location. Test-only.
// The provider stack mirrors main.tsx — the console reads team, governance, billing
// and brand state, so a missing provider throws before a single panel renders.
export function renderAdmin(loc: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <BillingProvider>
          <StatementsProvider>
            <ForecastProvider>
              <TeamProvider>
                <GovernanceProvider>
                  <BrandProvider>
                    <StaticRouter location={loc}>
                      <AdminConsole />
                    </StaticRouter>
                  </BrandProvider>
                </GovernanceProvider>
              </TeamProvider>
            </ForecastProvider>
          </StatementsProvider>
        </BillingProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
