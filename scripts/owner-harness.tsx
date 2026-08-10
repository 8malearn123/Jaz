import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { BillingProvider } from '../src/state/BillingContext'
import { StatementsProvider } from '../src/state/StatementsContext'
import { DistributorFileProvider } from '../src/state/DistributorFileContext'
import { ForecastProvider } from '../src/state/ForecastContext'
import { TeamProvider } from '../src/state/TeamContext'
import { GovernanceProvider } from '../src/state/GovernanceContext'
import { BrandProvider } from '../src/state/BrandContext'
import { AdminConsole } from '../src/pages/AdminConsole'
import { ToastProvider } from '../src/components/account/Toast'
import { DistributorFileSections } from '../src/components/account/DistributorProfile'
import type { PackChannel } from '../src/data/distributorPack'

// Renders the admin/owner console directly under a given location. Test-only.
// The provider stack mirrors main.tsx — the console reads team, governance, billing
// and brand state, so a missing provider throws before a single panel renders.
export function renderAdmin(loc: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <BillingProvider>
          <StatementsProvider>
            <DistributorFileProvider>
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
            </DistributorFileProvider>
          </StatementsProvider>
        </BillingProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}

// The distributor file on its own, under an explicit edit flag. The owner's route to
// it is a modal behind a click, which SSR cannot open — so the rule that decides who
// may write is asserted on the component that carries it. Test-only.
export function renderFile(channel: PackChannel, editable: boolean): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <DistributorFileProvider>
          <ToastProvider>
            <DistributorFileSections channel={channel} editable={editable} />
          </ToastProvider>
        </DistributorFileProvider>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
