import { BusinessAccount } from './business/BusinessAccount'

/**
 * The B2B portal is a single unified account — like the B2C account, but built
 * for business: ordering, approvals, quotes, lists, team, credit, budgets,
 * analytics, gifting and the legal entity, all in one place.
 * Role switching happens only from the top-nav persona chip.
 */
export function BusinessPage() {
  return <BusinessAccount />
}
