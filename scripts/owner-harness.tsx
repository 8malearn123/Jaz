import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LocaleProvider } from '../src/i18n/LocaleContext'
import { ChannelProvider } from '../src/state/ChannelContext'
import { AdminConsole } from '../src/pages/AdminConsole'

// Renders the admin/owner console directly under a given location. Test-only.
export function renderAdmin(loc: string): string {
  return renderToString(
    <LocaleProvider>
      <ChannelProvider>
        <StaticRouter location={loc}>
          <AdminConsole />
        </StaticRouter>
      </ChannelProvider>
    </LocaleProvider>,
  )
}
