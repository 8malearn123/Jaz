import {
  User, Building2, Handshake, Headset, PenTool, Wallet, ShieldCheck, ScrollText,
  type LucideIcon,
} from 'lucide-react'
import type { RoleId } from '@/data/roles'

export const roleIcons: Record<RoleId, LucideIcon> = {
  customer: User,
  b2b: Building2,
  sales_agent: Handshake,
  support_agent: Headset,
  content_editor: PenTool,
  finance: Wallet,
  admin: ShieldCheck,
  auditor: ScrollText,
}
