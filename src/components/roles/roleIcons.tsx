import {
  User, Building2, Globe, Handshake, Headset, PenTool, Wallet, ShieldCheck, ScrollText, Crown,
  type LucideIcon,
} from 'lucide-react'
import type { RoleId } from '@/data/roles'

export const roleIcons: Record<RoleId, LucideIcon> = {
  customer: User,
  b2b: Building2,
  mega_business: Globe,
  sales_agent: Handshake,
  support_agent: Headset,
  content_editor: PenTool,
  finance: Wallet,
  admin: ShieldCheck,
  auditor: ScrollText,
  owner: Crown,
}
