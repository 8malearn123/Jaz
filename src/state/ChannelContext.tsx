import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { organization } from '@/data/organization'
import type { Organization } from '@/data/types'
import { personas, PRIVILEGED_ROLES, type Persona, type RoleId } from '@/data/roles'
import { isSupabaseConfigured } from '@/lib/supabase'
import { signOut as apiSignOut } from '@/lib/api/auth'
import { useOptionalAuth } from '@/state/AuthContext'

export type Channel = 'b2c' | 'b2b'

interface ChannelContextValue {
  /** Active persona/role (one of the architecture roles). */
  role: RoleId
  persona: Persona
  setRole: (r: RoleId) => void
  /** Whether a session is authenticated (vs. browsing as a guest). */
  signedIn: boolean
  /** Start a session. Backed by Supabase when configured; a local switch otherwise. */
  signIn: (r: RoleId) => void
  /** End the session and return to a clean guest state. */
  signOut: () => void
  /** Pricing channel, derived from the persona. */
  channel: Channel
  setChannel: (c: Channel) => void
  isBusiness: boolean
  isStaff: boolean
  isPrivileged: boolean
  /** False while the real session is still being resolved. */
  authReady: boolean
  /** True when the role comes from the server rather than this browser. */
  roleIsServerOwned: boolean
  org: Organization
}

const ChannelContext = createContext<ChannelContextValue | null>(null)

const STORAGE_KEY = 'jaz.role'
const AUTH_KEY = 'jaz.authed'

export function ChannelProvider({ children }: { children: ReactNode }) {
  const { ready, session, serverRole } = useOptionalAuth()

  // Demo state. Still the whole story when Supabase is unconfigured; ignored for
  // identity decisions when it is, because the server's answer wins.
  const [localRole, setLocalRole] = useState<RoleId>(() => {
    if (typeof window === 'undefined') return 'customer'
    const stored = window.localStorage.getItem(STORAGE_KEY) as RoleId | null
    return stored && personas[stored] ? stored : 'customer'
  })
  const [localSignedIn, setLocalSignedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(AUTH_KEY) === '1'
  })

  useEffect(() => {
    if (isSupabaseConfigured) return
    window.localStorage.setItem(STORAGE_KEY, localRole)
  }, [localRole])
  useEffect(() => {
    if (isSupabaseConfigured) return
    window.localStorage.setItem(AUTH_KEY, localSignedIn ? '1' : '0')
  }, [localSignedIn])

  // With a backend, the role is whatever the profiles row says. Writing
  // jaz.role in the console no longer buys anything: RLS decides what the
  // server will hand over, and this only decides what the UI offers to ask for.
  const roleIsServerOwned = isSupabaseConfigured
  const role: RoleId = roleIsServerOwned ? (serverRole ?? 'customer') : localRole
  const signedIn = roleIsServerOwned ? Boolean(session) : localSignedIn

  const persona = personas[role] ?? personas.customer
  const channel: Channel = persona.channel
  const isStaff = persona.group === 'staff'
  const isPrivileged = PRIVILEGED_ROLES.includes(role)

  // No-ops once the server owns the role — kept so the ~40 existing call sites
  // (role picker, channel toggle, demo flows) compile and behave unchanged
  // without a backend.
  const setRole = useCallback((r: RoleId) => {
    if (roleIsServerOwned) return
    setLocalRole(r)
  }, [roleIsServerOwned])

  const signIn = useCallback((r: RoleId) => {
    if (roleIsServerOwned) return
    setLocalRole(r)
    setLocalSignedIn(true)
  }, [roleIsServerOwned])

  const signOut = useCallback(() => {
    if (roleIsServerOwned) {
      void apiSignOut()
      return
    }
    setLocalSignedIn(false)
    setLocalRole('customer')
  }, [roleIsServerOwned])

  // Backward-compatible quick toggle: maps to the matching shopper/business persona.
  const setChannel = useCallback((c: Channel) => {
    if (roleIsServerOwned) return
    setLocalRole(c === 'b2b' ? 'b2b' : 'customer')
  }, [roleIsServerOwned])

  const value = useMemo<ChannelContextValue>(
    () => ({
      role,
      persona,
      setRole,
      signedIn,
      signIn,
      signOut,
      channel,
      setChannel,
      isBusiness: channel === 'b2b',
      isStaff,
      isPrivileged,
      authReady: ready,
      roleIsServerOwned,
      org: organization,
    }),
    [role, persona, setRole, signedIn, signIn, signOut, channel, setChannel, isStaff, isPrivileged, ready, roleIsServerOwned],
  )

  return <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChannel() {
  const ctx = useContext(ChannelContext)
  if (!ctx) throw new Error('useChannel must be used within ChannelProvider')
  return ctx
}
