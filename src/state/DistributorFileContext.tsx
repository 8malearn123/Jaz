import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Bilingual } from '@/data/types'
import type { PackChannel } from '@/data/distributorPack'
import { distributorProfileSeed, type ProfileValues } from '@/data/distributorProfile'

// The distributor file lives above both sides that read it: the owner console,
// where Jaz authors the terms of an account, and the partner's own portal, where
// the account reads them. One state, so an edge the owner changes is the edge the
// partner sees — and so a partner's request for a change reaches the owner.
//
// Keyed by channel rather than by account id: `horeca` is the in-Kingdom operator's
// file, `export` the market distributor's. That is the same key `OrgSummary.fileChannel`
// and `OwnerVendor.fileChannel` carry, so a console surface resolves an account's
// file without any further plumbing.

/** What the account asked to have changed, and when they asked. */
export interface FileChangeRequest {
  note: string
  at: Bilingual
}

interface DistributorFileCtx {
  values: Record<PackChannel, ProfileValues>
  /** Jaz rewrites the file — the only write path into the answers. */
  saveValues: (channel: PackChannel, next: ProfileValues) => void
  changeRequests: Record<PackChannel, FileChangeRequest | null>
  /** The account cannot edit, so it asks. */
  requestChange: (channel: PackChannel, note: string) => void
  /** Jaz has dealt with the request. */
  resolveChange: (channel: PackChannel) => void
}

const Ctx = createContext<DistributorFileCtx | null>(null)

export function DistributorFileProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<PackChannel, ProfileValues>>(() => ({
    horeca: { ...distributorProfileSeed.horeca },
    export: { ...distributorProfileSeed.export },
  }))
  const [changeRequests, setChangeRequests] = useState<Record<PackChannel, FileChangeRequest | null>>({
    horeca: null,
    export: null,
  })

  const saveValues = useCallback((channel: PackChannel, next: ProfileValues) => {
    setValues((prev) => ({ ...prev, [channel]: { ...next } }))
  }, [])

  const requestChange = useCallback((channel: PackChannel, note: string) => {
    setChangeRequests((prev) => ({ ...prev, [channel]: { note: note.trim(), at: { en: 'Just now', ar: 'الآن' } } }))
  }, [])

  const resolveChange = useCallback((channel: PackChannel) => {
    setChangeRequests((prev) => ({ ...prev, [channel]: null }))
  }, [])

  return (
    <Ctx.Provider value={{ values, saveValues, changeRequests, requestChange, resolveChange }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDistributorFile() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDistributorFile must be used within DistributorFileProvider')
  return ctx
}
