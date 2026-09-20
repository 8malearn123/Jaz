import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seededArtworks, type AcquisitionRequest } from '@/data/artworks'
import type { Artwork, ArtworkStatus } from '@/data/types'

/*
 * The gallery's state, one level above both ends of it: the console defines and
 * prices the paintings, the storefront hangs them. Seeded works stay derived from
 * the catalogue — the console edits them as an overlay rather than a copy, so a
 * change to a commission still reaches the gallery — while a work defined in the
 * console is stored whole, since nothing else knows about it.
 */

interface ArtworksValue {
  /** Every painting the console knows: seeded (with overrides applied) then owner-defined. */
  artworks: Artwork[]
  /** What the storefront hangs — the same list, minus what the console is holding back. */
  publicArtworks: Artwork[]
  addArtwork: (fields: Omit<Artwork, 'id' | 'custom'>) => void
  updateArtwork: (id: string, patch: Partial<Artwork>) => void
  /** Only a work the console defined can be deleted; a seeded one is hidden instead. */
  removeArtwork: (id: string) => void
  setStatus: (id: string, status: ArtworkStatus) => void
  requests: AcquisitionRequest[]
  /** From the gallery: a collector asks for a piece, which holds it at «محجوزة». */
  requestAcquisition: (r: Omit<AcquisitionRequest, 'id' | 'at' | 'handled'>) => void
  setRequestHandled: (id: string, handled: boolean) => void
}

const ArtworksContext = createContext<ArtworksValue | null>(null)

const STORAGE_KEY = 'jaz.artworks'

interface Stored {
  overrides: Record<string, Partial<Artwork>>
  custom: Artwork[]
  requests: AcquisitionRequest[]
}
const EMPTY: Stored = { overrides: {}, custom: [], requests: [] }

function load(): Stored {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Stored>
    return { overrides: parsed.overrides ?? {}, custom: parsed.custom ?? [], requests: parsed.requests ?? [] }
  } catch {
    return EMPTY
  }
}

export function ArtworksProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(load)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      /* a full or blocked store must not take the gallery down with it */
    }
  }, [stored])

  const artworks = useMemo<Artwork[]>(
    () => [...seededArtworks.map((a) => ({ ...a, ...stored.overrides[a.id] })), ...stored.custom],
    [stored.overrides, stored.custom],
  )

  const publicArtworks = useMemo(() => artworks.filter((a) => !a.hidden), [artworks])

  const addArtwork = useCallback((fields: Omit<Artwork, 'id' | 'custom'>) => {
    setStored((prev) => ({ ...prev, custom: [...prev.custom, { ...fields, id: `aw-x-${Date.now().toString(36)}`, custom: true }] }))
  }, [])

  const updateArtwork = useCallback((id: string, patch: Partial<Artwork>) => {
    setStored((prev) =>
      prev.custom.some((a) => a.id === id)
        ? { ...prev, custom: prev.custom.map((a) => (a.id === id ? { ...a, ...patch } : a)) }
        : { ...prev, overrides: { ...prev.overrides, [id]: { ...prev.overrides[id], ...patch } } },
    )
  }, [])

  const removeArtwork = useCallback((id: string) => {
    setStored((prev) => ({ ...prev, custom: prev.custom.filter((a) => a.id !== id) }))
  }, [])

  const setStatus = useCallback((id: string, status: ArtworkStatus) => updateArtwork(id, { status }), [updateArtwork])

  const requestAcquisition = useCallback(
    (r: Omit<AcquisitionRequest, 'id' | 'at' | 'handled'>) => {
      setStored((prev) => ({
        ...prev,
        requests: [{ ...r, id: `ar-${Date.now().toString(36)}`, at: new Date().toISOString(), handled: false }, ...prev.requests],
      }))
      // An asked-for canvas comes off the wall at once: two collectors must never be
      // told the same one-of-one is still available.
      setStatus(r.artworkId, 'reserved')
    },
    [setStatus],
  )

  const setRequestHandled = useCallback((id: string, handled: boolean) => {
    setStored((prev) => ({ ...prev, requests: prev.requests.map((r) => (r.id === id ? { ...r, handled } : r)) }))
  }, [])

  const value = useMemo<ArtworksValue>(
    () => ({
      artworks,
      publicArtworks,
      addArtwork,
      updateArtwork,
      removeArtwork,
      setStatus,
      requests: stored.requests,
      requestAcquisition,
      setRequestHandled,
    }),
    [artworks, publicArtworks, addArtwork, updateArtwork, removeArtwork, setStatus, stored.requests, requestAcquisition, setRequestHandled],
  )

  return <ArtworksContext.Provider value={value}>{children}</ArtworksContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useArtworks() {
  const ctx = useContext(ArtworksContext)
  if (!ctx) throw new Error('useArtworks must be used within ArtworksProvider')
  return ctx
}
