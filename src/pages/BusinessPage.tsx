import { useChannel } from '@/state/ChannelContext'
import { BuyerWorkspace } from './business/BuyerWorkspace'
import { ApproverWorkspace } from './business/ApproverWorkspace'
import { OrgAdminPortal } from './business/OrgAdminPortal'

/**
 * The B2B portal renders a different, purpose-built workspace per role:
 * - b2b_admin    → full organization administration
 * - b2b_approver → an order-approvals queue
 * - b2b_buyer    → an ordering cockpit (default)
 * Role switching happens only from the top-nav persona chip.
 */
export function BusinessPage() {
  const { role } = useChannel()
  if (role === 'b2b_admin') return <OrgAdminPortal />
  if (role === 'b2b_approver') return <ApproverWorkspace />
  return <BuyerWorkspace />
}
