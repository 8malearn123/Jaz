// Hand-written to match supabase/migrations/20260921000000_auth_roles.sql.
// Regenerate with: npx supabase gen types typescript --project-id <ref>
//
// These are `type` aliases rather than interfaces on purpose: postgrest-js
// constrains a schema to Record<string, unknown>, and an interface has no
// implicit index signature, so interfaces here resolve every query to `never`.

import type { RoleId } from '@/data/roles'

/** The Postgres enum public.app_role mirrors RoleId exactly. */
export type AppRole = RoleId

export type ProfileRow = {
  id: string
  email: string | null
  phone: string | null
  full_name_en: string | null
  full_name_ar: string | null
  role: AppRole
  org_id: string | null
  created_at: string
  updated_at: string
}

export type OrganizationRow = {
  id: string
  name_en: string
  name_ar: string
  cr_number: string | null
  vat_number: string | null
  channel: 'b2c' | 'b2b'
  credit_limit: number
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      organizations: {
        Row: OrganizationRow
        Insert: Partial<OrganizationRow> & { name_en: string; name_ar: string }
        Update: Partial<OrganizationRow>
        Relationships: []
      }
      artworks: {
        Row: ArtworkRow
        Insert: Omit<Partial<ArtworkRow>, 'id'> & {
          title_en: string; title_ar: string; artist_en: string; artist_ar: string
          flavor_id: string; year: number; width_cm: number; height_cm: number
        }
        Update: Partial<ArtworkRow>
        Relationships: []
      }
      artwork_overrides: {
        Row: ArtworkOverrideRow
        Insert: Partial<ArtworkOverrideRow> & { artwork_id: string }
        Update: Partial<ArtworkOverrideRow>
        Relationships: []
      }
      acquisition_requests: {
        Row: AcquisitionRequestRow
        Insert: Omit<Partial<AcquisitionRequestRow>, 'id'> & { artwork_id: string; name: string; email: string }
        Update: Partial<AcquisitionRequestRow>
        Relationships: []
      }
      employees: {
        Row: EmployeeRow
        Insert: Omit<Partial<EmployeeRow>, 'id'> & { name_en: string; name_ar: string }
        Update: Partial<EmployeeRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole }
      is_staff: { Args: Record<string, never>; Returns: boolean }
      is_privileged: { Args: Record<string, never>; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      can_edit_content: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: { app_role: AppRole; artwork_status: ArtworkStatusRow; team_permission: TeamPermissionRow; job_role: JobRoleRow }
    CompositeTypes: Record<string, never>
  }
}

// ---------------------------------------------------------------- gallery
// Matches supabase/migrations/20260923020000_artworks.sql.

export type ArtworkStatusRow = 'available' | 'reserved' | 'sold'

export type ArtworkRow = {
  id: string
  title_en: string
  title_ar: string
  artist_en: string
  artist_ar: string
  description_en: string
  description_ar: string
  medium_en: string
  medium_ar: string
  flavor_id: string
  bar_slugs: string[]
  year: number
  width_cm: number
  height_cm: number
  price_minor: number
  status: ArtworkStatusRow
  image: string | null
  hidden: boolean
  created_at: string
  updated_at: string
}

/** Every column but artwork_id is nullable: null means "not overridden". */
export type ArtworkOverrideRow = {
  artwork_id: string
  title_en: string | null
  title_ar: string | null
  artist_en: string | null
  artist_ar: string | null
  description_en: string | null
  description_ar: string | null
  medium_en: string | null
  medium_ar: string | null
  year: number | null
  width_cm: number | null
  height_cm: number | null
  price_minor: number | null
  status: ArtworkStatusRow | null
  image: string | null
  hidden: boolean | null
  updated_at: string
}

export type AcquisitionRequestRow = {
  id: string
  artwork_id: string
  name: string
  email: string
  phone: string
  note: string
  handled: boolean
  created_at: string
}

// ---------------------------------------------------------------- team
// Matches supabase/migrations/20260926000000_team.sql.

export type TeamPermissionRow =
  | 'orders' | 'purchases' | 'raw' | 'production' | 'waste'
  | 'products' | 'customers' | 'suppliers' | 'reports' | 'accounting' | 'ledger'

export type JobRoleRow =
  | 'sys_admin' | 'finance_mgr' | 'accountant' | 'chef'
  | 'production' | 'warehouse' | 'purchasing' | 'sales' | 'auditor'

export type EmployeeRow = {
  id: string
  name_en: string
  name_ar: string
  title_en: string
  title_ar: string
  phone: string
  email: string
  perms: TeamPermissionRow[]
  active: boolean
  job_role: JobRoleRow | null
  manager_id: string | null
  profile_id: string | null
  created_at: string
  updated_at: string
}
