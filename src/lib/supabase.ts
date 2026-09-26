import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// The storefront runs in two modes on purpose.
//
// Configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, and identity
// is real — sessions come from Supabase Auth and the role is whatever the
// profiles row says, enforced by RLS.
//
// Unconfigured: no env, no client. The role picker at /roles and the seeded data
// still drive the app exactly as before, which is what the SSR smoke harness and
// a fresh clone with no keys rely on. Nothing here throws when the keys are
// missing — `isSupabaseConfigured` is how callers ask.

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// On the server there is no localStorage to persist a session into, and no URL
// fragment to read one out of, so both are switched off when window is absent.
const isBrowser = typeof window !== 'undefined'

export const supabase: SupabaseClient<Database> | null =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: {
          persistSession: isBrowser,
          autoRefreshToken: isBrowser,
          detectSessionInUrl: isBrowser,
        },
      })
    : null

/** Narrowing helper for call sites that have already checked configuration. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}
