// The auth endpoints the storefront calls. Everything the UI needs from the
// backend for identity lives here, so pages never touch the Supabase client
// directly and the fallback path has one place to live.

import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ProfileRow } from '@/lib/database.types'
import type { RoleId } from '@/data/roles'
import { personas } from '@/data/roles'

export interface AuthResult {
  ok: boolean
  /** Bilingual-safe message for the UI; null when the call succeeded. */
  error: string | null
}

const ok: AuthResult = { ok: true, error: null }
const fail = (error: string): AuthResult => ({ ok: false, error })

/** Roles a person may claim when signing themselves up. Staff are granted, never claimed. */
const SELF_SERVICE_ROLES: RoleId[] = ['customer', 'b2b']

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
  return error ? fail(error.message) : ok
}

/** Individual shoppers sign in with a phone OTP; this sends the code. */
export async function sendPhoneOtp(phone: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')
  const { error } = await requireSupabase().auth.signInWithOtp({ phone })
  return error ? fail(error.message) : ok
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')
  const { error } = await requireSupabase().auth.verifyOtp({ phone, token, type: 'sms' })
  return error ? fail(error.message) : ok
}

export async function signUp(params: {
  email: string
  password: string
  role: RoleId
  fullNameEn?: string
  fullNameAr?: string
  phone?: string
}): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')

  // Clamped here as well as in the database trigger. The trigger is the boundary
  // that actually holds — this only keeps the UI from asking for something the
  // server will silently refuse and then reporting the wrong role back.
  const role: RoleId = SELF_SERVICE_ROLES.includes(params.role) ? params.role : 'customer'

  const { error } = await requireSupabase().auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        role,
        full_name_en: params.fullNameEn ?? null,
        full_name_ar: params.fullNameAr ?? null,
        phone: params.phone ?? null,
      },
    },
  })
  return error ? fail(error.message) : ok
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/signin` : undefined
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo })
  return error ? fail(error.message) : ok
}

export async function signOut(): Promise<AuthResult> {
  if (!isSupabaseConfigured) return ok
  const { error } = await requireSupabase().auth.signOut()
  return error ? fail(error.message) : ok
}

/** Reads the signed-in user's profile. Returns null when nobody is signed in. */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[auth] failed to read profile', error.message)
    return null
  }
  return data
}

/** Updates the parts of a profile its owner is allowed to change. */
export async function updateOwnProfile(
  userId: string,
  patch: Pick<Partial<ProfileRow>, 'full_name_en' | 'full_name_ar' | 'phone'>,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')
  const { error } = await requireSupabase().from('profiles').update(patch).eq('id', userId)
  return error ? fail(error.message) : ok
}

/**
 * Grants a role. Only admin/owner get past the database trigger — for anyone
 * else this returns the server's refusal rather than pretending it worked.
 */
export async function grantRole(userId: string, role: RoleId): Promise<AuthResult> {
  if (!isSupabaseConfigured) return fail('auth.notConfigured')
  if (!personas[role]) return fail('auth.unknownRole')
  const { error } = await requireSupabase().from('profiles').update({ role }).eq('id', userId)
  return error ? fail(error.message) : ok
}
