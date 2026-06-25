import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { organization } from '@/data/organization'
import type { Organization } from '@/data/types'
import { personas, PRIVILEGED_ROLES, type Persona, type RoleId } from '@/data/roles'

export type Channel = 'b2c' | 'b2b'

interface ChannelContextValue {
  /** Active persona/role (one of the architecture roles). */
  role: RoleId
  persona: Persona
  setRole: (r: RoleId) => void
  /** Whether a session is authenticated (vs. browsing as a guest). */
  signedIn: boolean
  /** Authenticate as a role and start a session. */
  signIn: (r: RoleId) => void
  /** End the session and return to a clean guest state. */
  signOut: () => void
  /** Pricing channel, derived from the persona. */
  channel: Channel
  setChannel: (c: Channel) => void
  isBusiness: boolean
  isStaff: boolean
  isPrivileged: boolean
  org: Organization
}

const ChannelContext = createContext<ChannelContextValue | null>(null)

const STORAGE_KEY = 'jaz.role'
const AUTH_KEY = 'jaz.authed'

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleId>(() => {
    if (typeof window === 'undefined') return 'customer'
    const stored = window.localStorage.getItem(STORAGE_KEY) as RoleId | null
    return stored && personas[stored] ? stored : 'customer'
  })
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(AUTH_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, role)
  }, [role])
  useEffect(() => {
    window.localStorage.setItem(AUTH_KEY, signedIn ? '1' : '0')
  }, [signedIn])

  const persona = personas[role]
  const channel: Channel = persona.channel
  const isStaff = persona.group === 'staff'
  const isPrivileged = PRIVILEGED_ROLES.includes(role)

  const setRole = useCallback((r: RoleId) => setRoleState(r), [])
  const signIn = useCallback((r: RoleId) => {
    setRoleState(r)
    setSignedIn(true)
  }, [])
  const signOut = useCallback(() => {
    setSignedIn(false)
    setRoleState('customer')
  }, [])
  // Backward-compatible quick toggle: maps to the matching shopper/business persona.
  const setChannel = useCallback((c: Channel) => setRoleState(c === 'b2b' ? 'b2b' : 'customer'), [])

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
      org: organization,
    }),
    [role, persona, setRole, signedIn, signIn, signOut, channel, setChannel, isStaff, isPrivileged],
  )

  return <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChannel() {
  const ctx = useContext(ChannelContext)
  if (!ctx) throw new Error('useChannel must be used within ChannelProvider')
  return ctx
}
