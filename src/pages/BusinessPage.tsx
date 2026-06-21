import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'
import { useChannel } from '@/state/ChannelContext'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { BuyerWorkspace } from './business/BuyerWorkspace'
import { ApproverWorkspace } from './business/ApproverWorkspace'
import { OrgAdminPortal } from './business/OrgAdminPortal'

/**
 * The B2B portal renders a different, purpose-built workspace per role:
 * - b2b_admin    → full organization administration
 * - b2b_approver → an order-approvals queue
 * - b2b_buyer    → an ordering cockpit (default)
 */
export function BusinessPage() {
  const { role } = useChannel()
  const { t } = useLocale()

  const switchRole = (
    <Link to="/roles" className={buttonClass('primary', 'sm')}>
      <ArrowLeftRight size={15} />
      {t('role.switch')}
    </Link>
  )

  if (role === 'b2b_admin') return <OrgAdminPortal headerExtra={switchRole} />
  if (role === 'b2b_approver') return <ApproverWorkspace headerExtra={switchRole} />
  return <BuyerWorkspace headerExtra={switchRole} />
}
