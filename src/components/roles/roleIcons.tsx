import {
  User, ShoppingBag, CheckCircle2, Building2, Handshake, Headset, PenTool, Wallet, ShieldCheck, ScrollText,
  type LucideIcon,
} from 'lucide-react'
import type { RoleId } from '@/data/roles'

export const roleIcons: Record<RoleId, LucideIcon> = {
  customer: User,
  b2b_buyer: ShoppingBag,
  b2b_approver: CheckCircle2,
  b2b_admin: Building2,
  sales_agent: Handshake,
  support_agent: Headset,
  content_editor: PenTool,
  finance: Wallet,
  admin: ShieldCheck,
  auditor: ScrollText,
}
