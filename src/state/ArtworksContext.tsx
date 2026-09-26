import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { deriveArtworks, type AcquisitionRequest } from '@/data/artworks'
import type { Artwork, ArtworkStatus } from '@/data/types'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useCatalogue } from '@/state/CatalogueContext'
import {
  fetchGallery, createArtwork, saveArtworkPatch, deleteArtwork,
  sendAcquisitionRequest, setRequestHandled as apiSetRequestHandled,
  EMPTY_GALLERY, type GalleryState,
} from '@/lib/api/artworks'

/*
 * The gallery's state, one level above both ends of it: the console defines and
 * prices the paintings, the storefront hangs them. Seeded works stay derived from
 * the catalogue — the console edits them as an overlay rather than a copy, so a
 * change to a commission still reaches the gallery — while a work defined in the
 * console is stored whole, since nothing else knows about it.
 *
 * With Supabase configured, that overlay lives in artwork_overrides and the
 * console-defined works in artworks, both behind RLS: a visitor reads, only a
 * content role writes. Without it, the same shape is kept in localStorage exactly
 * as before, so the prototype and the SSR harnesses are unaffected.
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
  /** False while the first read from the server is still in flight. */
  ready: boolean
  /** The server's refusal, when one arrives — otherwise null. */
  error: string | null
}

const ArtworksContext = createContext<ArtworksValue | null>(null)

const STORAGE_KEY = 'jaz.artworks'

function loadLocal(): GalleryState {
  if (typeof window === 'undefined') return EMPTY_GALLERY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_GALLERY
    const parsed = JSON.parse(raw) as Partial<GalleryState>
    return { overrides: parsed.overrides ?? {}, custom: parsed.custom ?? [], requests: parsed.requests ?? [] }
  } catch {
    return EMPTY_GALLERY
  }
}

export function ArtworksProvider({ children }: { children: ReactNode }) {
  const backed = isSupabaseConfigured
  // The twelve commissions are derived from the catalogue's art cards, so they must
  // follow whichever catalogue is in play — the seed, or the products table. The ids
  // stay `aw-<slug>`, which is what the artwork_overrides rows are keyed on.
  const { products: catalogue } = useCatalogue()
  const seeded = useMemo(() => deriveArtworks(catalogue), [catalogue])
  const [stored, setStored] = useState<GalleryState>(() => (backed ? EMPTY_GALLERY : loadLocal()))
  const [ready, setReady] = useState(!backed)
  const [error, setError] = useState<string | null>(null)

  // Local mode persists; backed mode must not, or a stale browser copy would
  // shadow what the server says on the next load.
  useEffect(() => {
    if (backed) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      /* a full or blocked store must not take the gallery down with it */
    }
  }, [backed, stored])

  const reload = useCallback(async () => {
    if (!backed) return
    setStored(await fetchGallery())
    setReady(true)
  }, [backed])

  useEffect(() => {
    void reload()
  }, [reload])

  const artworks = useMemo<Artwork[]>(
    () => [...seeded.map((a) => ({ ...a, ...stored.overrides[a.id] })), ...stored.custom],
    [seeded, stored.overrides, stored.custom],
  )

  const publicArtworks = useMemo(() => artworks.filter((a) => !a.hidden), [artworks])

  /** Runs a write, then re-reads so the UI shows what the server actually kept. */
  const commit = useCallback(
    async (write: () => Promise<{ ok: boolean; error: string | null }>) => {
      const res = await write()
      if (!res.ok) {
        setError(res.error)
        return
      }
      setError(null)
      await reload()
    },
    [reload],
  )

  const addArtwork = useCallback((fields: Omit<Artwork, 'id' | 'custom'>) => {
    if (backed) {
      void commit(() => createArtwork(fields))
      return
    }
    setStored((prev) => ({ ...prev, custom: [...prev.custom, { ...fields, id: `aw-x-${Date.now().toString(36)}`, custom: true }] }))
  }, [backed, commit])

  const updateArtwork = useCallback((id: string, patch: Partial<Artwork>) => {
    if (backed) {
      // Which table to write is decided by what the row is, not by the caller.
      const isCustom = stored.custom.some((a) => a.id === id)
      void commit(() => saveArtworkPatch(id, patch, isCustom))
      return
    }
    setStored((prev) =>
      prev.custom.some((a) => a.id === id)
        ? { ...prev, custom: prev.custom.map((a) => (a.id === id ? { ...a, ...patch } : a)) }
        : { ...prev, overrides: { ...prev.overrides, [id]: { ...prev.overrides[id], ...patch } } },
    )
  }, [backed, commit, stored.custom])

  const removeArtwork = useCallback((id: string) => {
    if (backed) {
      void commit(() => deleteArtwork(id))
      return
    }
    setStored((prev) => ({ ...prev, custom: prev.custom.filter((a) => a.id !== id) }))
  }, [backed, commit])

  const setStatus = useCallback((id: string, status: ArtworkStatus) => updateArtwork(id, { status }), [updateArtwork])

  const requestAcquisition = useCallback(
    (r: Omit<AcquisitionRequest, 'id' | 'at' | 'handled'>) => {
      if (backed) {
        // The hold on the canvas is applied by a trigger on this insert, so there
        // is no second call here: the collector is usually anonymous and cannot
        // write to the artwork tables at all.
        void commit(() => sendAcquisitionRequest(r))
        return
      }
      setStored((prev) => ({
        ...prev,
        requests: [{ ...r, id: `ar-${Date.now().toString(36)}`, at: new Date().toISOString(), handled: false }, ...prev.requests],
      }))
      // An asked-for canvas comes off the wall at once: two collectors must never be
      // told the same one-of-one is still available.
      setStatus(r.artworkId, 'reserved')
    },
    [backed, commit, setStatus],
  )

  const setRequestHandled = useCallback((id: string, handled: boolean) => {
    if (backed) {
      void commit(() => apiSetRequestHandled(id, handled))
      return
    }
    setStored((prev) => ({ ...prev, requests: prev.requests.map((r) => (r.id === id ? { ...r, handled } : r)) }))
  }, [backed, commit])

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
      ready,
      error,
    }),
    [artworks, publicArtworks, addArtwork, updateArtwork, removeArtwork, setStatus, stored.requests, requestAcquisition, setRequestHandled, ready, error],
  )

  return <ArtworksContext.Provider value={value}>{children}</ArtworksContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useArtworks() {
  const ctx = useContext(ArtworksContext)
  if (!ctx) throw new Error('useArtworks must be used within ArtworksProvider')
  return ctx
}
