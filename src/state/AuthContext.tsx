import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fetchProfile } from '@/lib/api/auth'
import type { ProfileRow } from '@/lib/database.types'
import type { RoleId } from '@/data/roles'

// Owns the real session. ChannelContext reads from this and keeps its own
// prototype behaviour when Supabase is not configured, so this provider is the
// only place that knows whether identity is real.

interface AuthContextValue {
  /** True once the initial session lookup has settled. */
  ready: boolean
  session: Session | null
  profile: ProfileRow | null
  /** Server-owned role, or null when signed out / unconfigured. */
  serverRole: RoleId | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // With no backend there is nothing to wait for — report ready immediately so
  // the tree never blocks on a session that will not arrive.
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    setProfile(await fetchProfile(userId))
  }, [])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (!cancelled) setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // The profile row is fetched separately rather than read from the JWT:
      // a role granted by an admin takes effect on the next read, without the
      // person having to sign out and back in to refresh a stale claim.
      void loadProfile(next?.user.id)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id)
  }, [loadProfile, session])

  const value = useMemo<AuthContextValue>(
    () => ({ ready, session, profile, serverRole: profile?.role ?? null, refreshProfile }),
    [ready, session, profile, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/**
 * Same value, but tolerates a tree with no AuthProvider above it — the SSR
 * harnesses each mount their own slice of providers to render one portal.
 * Falling back to "no session" keeps those trees rendering, and keeps the
 * failure safe: an unconfigured or unmounted auth layer denies rather than
 * grants. ChannelProvider uses this so it never depends on AuthProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  return ctx ?? EMPTY_AUTH
}

const EMPTY_AUTH: AuthContextValue = {
  ready: true,
  session: null,
  profile: null,
  serverRole: null,
  refreshProfile: async () => {},
}
