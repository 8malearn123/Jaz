import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { organization } from '@/data/organization'
import type { Organization } from '@/data/types'

export type Channel = 'b2c' | 'b2b'

interface ChannelContextValue {
  channel: Channel
  setChannel: (c: Channel) => void
  /** The signed-in B2B account (mock). Present regardless of channel for the portal. */
  org: Organization
  /** Whether the user is "signed in" to the business portal (mock auth). */
  isBusiness: boolean
}

const ChannelContext = createContext<ChannelContextValue | null>(null)

const STORAGE_KEY = 'jaz.channel'

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [channel, setChannelState] = useState<Channel>(() => {
    if (typeof window === 'undefined') return 'b2c'
    const stored = window.localStorage.getItem(STORAGE_KEY) as Channel | null
    return stored === 'b2b' ? 'b2b' : 'b2c'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, channel)
  }, [channel])

  const setChannel = useCallback((c: Channel) => setChannelState(c), [])

  const value = useMemo<ChannelContextValue>(
    () => ({ channel, setChannel, org: organization, isBusiness: channel === 'b2b' }),
    [channel, setChannel],
  )

  return <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChannel() {
  const ctx = useContext(ChannelContext)
  if (!ctx) throw new Error('useChannel must be used within ChannelProvider')
  return ctx
}
