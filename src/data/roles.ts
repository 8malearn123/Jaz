import type { Bilingual } from './types'

// The ten roles from the Production Architecture §2.2 (Identity & Access).
export type RoleId =
  | 'customer'
  | 'b2b_buyer'
  | 'b2b_approver'
  | 'b2b_admin'
  | 'sales_agent'
  | 'support_agent'
  | 'content_editor'
  | 'finance'
  | 'admin'
  | 'auditor'

export type RoleGroup = 'shopper' | 'business' | 'staff'

export interface Persona {
  id: RoleId
  name: Bilingual
  roleLabel: Bilingual
  group: RoleGroup
  /** org-scoped (user_role.org_id) vs platform-level */
  scope: 'org' | 'platform'
  /** pricing channel this persona shops in */
  channel: 'b2c' | 'b2b'
  /** privileged roles need step-up MFA for /admin & credit decisions (§5.3/5.4) */
  requiresMFA: boolean
  /** where this persona lands after selection */
  home: string
  accent: string
  onAccent: string
}

export const personas: Record<RoleId, Persona> = {
  customer: {
    id: 'customer',
    name: { en: 'Layla Al-Ahmadi', ar: 'ليلى الأحمدي' },
    roleLabel: { en: 'Customer', ar: 'عميلة' },
    group: 'shopper',
    scope: 'org',
    channel: 'b2c',
    requiresMFA: false,
    home: '/account',
    accent: '#b08a57',
    onAccent: '#2a1a12',
  },
  b2b_buyer: {
    id: 'b2b_buyer',
    name: { en: 'Faisal Al-Harbi', ar: 'فيصل الحربي' },
    roleLabel: { en: 'Buyer · Najd Hospitality', ar: 'مشترٍ · مجموعة نجد للضيافة' },
    group: 'business',
    scope: 'org',
    channel: 'b2b',
    requiresMFA: false,
    home: '/business',
    accent: '#365766',
    onAccent: '#f3eee5',
  },
  b2b_approver: {
    id: 'b2b_approver',
    name: { en: 'Sara Al-Dosari', ar: 'سارة الدوسري' },
    roleLabel: { en: 'Approver · Najd Hospitality', ar: 'معتمِدة · مجموعة نجد' },
    group: 'business',
    scope: 'org',
    channel: 'b2b',
    requiresMFA: false,
    home: '/business?tab=orders',
    accent: '#355c4b',
    onAccent: '#f3eee5',
  },
  b2b_admin: {
    id: 'b2b_admin',
    name: { en: 'Khalid Al-Otaibi', ar: 'خالد العتيبي' },
    roleLabel: { en: 'Org Admin · Najd Hospitality', ar: 'مدير المنشأة · مجموعة نجد' },
    group: 'business',
    scope: 'org',
    channel: 'b2b',
    requiresMFA: false,
    home: '/business?tab=team',
    accent: '#3b241a',
    onAccent: '#f3eee5',
  },
  sales_agent: {
    id: 'sales_agent',
    name: { en: 'Majed Al-Shehri', ar: 'ماجد الشهري' },
    roleLabel: { en: 'Sales Agent', ar: 'مندوب مبيعات' },
    group: 'staff',
    scope: 'platform',
    channel: 'b2b',
    requiresMFA: false,
    home: '/admin?section=pipeline',
    accent: '#8a6b3f',
    onAccent: '#f3eee5',
  },
  support_agent: {
    id: 'support_agent',
    name: { en: 'Huda Al-Ghamdi', ar: 'هدى الغامدي' },
    roleLabel: { en: 'Support Agent', ar: 'وكيلة دعم' },
    group: 'staff',
    scope: 'platform',
    channel: 'b2c',
    requiresMFA: false,
    home: '/admin?section=support',
    accent: '#365766',
    onAccent: '#f3eee5',
  },
  content_editor: {
    id: 'content_editor',
    name: { en: 'Yousef Al-Maliki', ar: 'يوسف المالكي' },
    roleLabel: { en: 'Content Editor', ar: 'محرر محتوى' },
    group: 'staff',
    scope: 'platform',
    channel: 'b2c',
    requiresMFA: false,
    home: '/admin?section=catalogue',
    accent: '#8e2f55',
    onAccent: '#fdf3f7',
  },
  finance: {
    id: 'finance',
    name: { en: 'Aisha Al-Subaie', ar: 'عائشة السبيعي' },
    roleLabel: { en: 'Finance', ar: 'المالية' },
    group: 'staff',
    scope: 'platform',
    channel: 'b2b',
    requiresMFA: true,
    home: '/admin?section=credit',
    accent: '#355c4b',
    onAccent: '#f3eee5',
  },
  admin: {
    id: 'admin',
    name: { en: 'Omar Al-Rashid', ar: 'عمر الراشد' },
    roleLabel: { en: 'Administrator', ar: 'مدير المنصة' },
    group: 'staff',
    scope: 'platform',
    channel: 'b2c',
    requiresMFA: true,
    home: '/admin',
    accent: '#241712',
    onAccent: '#f3eee5',
  },
  auditor: {
    id: 'auditor',
    name: { en: 'Nada Al-Harthi', ar: 'ندى الحارثي' },
    roleLabel: { en: 'Auditor', ar: 'مدقّقة' },
    group: 'staff',
    scope: 'platform',
    channel: 'b2c',
    requiresMFA: true,
    home: '/admin?section=audit',
    accent: '#6e6258',
    onAccent: '#f3eee5',
  },
}

export const personaList: Persona[] = Object.values(personas)

export const PRIVILEGED_ROLES: RoleId[] = ['admin', 'finance', 'auditor']

export function isStaffRole(role: RoleId): boolean {
  return personas[role].group === 'staff'
}
