// The gallery's endpoints, plus the mapping between the database's flat rows and
// the bilingual Artwork shape the UI already speaks.
//
// The overlay model is preserved: a seeded commission is edited as a PARTIAL
// override (a null column means the catalogue still supplies that field), while a
// console-defined work is stored whole.

import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase'
import type { ArtworkRow, ArtworkOverrideRow, AcquisitionRequestRow } from '@/lib/database.types'
import type { Artwork, FlavorId } from '@/data/types'
import type { AcquisitionRequest } from '@/data/artworks'

export interface GalleryState {
  overrides: Record<string, Partial<Artwork>>
  custom: Artwork[]
  requests: AcquisitionRequest[]
}

export const EMPTY_GALLERY: GalleryState = { overrides: {}, custom: [], requests: [] }

// ---------------------------------------------------------------- row -> UI
// These mappers are exported so scripts/verify-gallery.mjs can assert the overlay
// invariants without a database or a network.

export function rowToArtwork(r: ArtworkRow): Artwork {
  return {
    id: r.id,
    title: { en: r.title_en, ar: r.title_ar },
    artist: { en: r.artist_en, ar: r.artist_ar },
    description: { en: r.description_en, ar: r.description_ar },
    medium: { en: r.medium_en, ar: r.medium_ar },
    flavorId: r.flavor_id as FlavorId,
    barSlugs: r.bar_slugs,
    year: r.year,
    widthCm: Number(r.width_cm),
    heightCm: Number(r.height_cm),
    priceMinor: Number(r.price_minor),
    status: r.status,
    image: r.image ?? undefined,
    hidden: r.hidden,
    custom: true,
  }
}

/**
 * A null column means "not overridden", so it must be left OUT of the patch
 * rather than spread in as undefined — `{...seeded, ...patch}` with an explicit
 * `title: undefined` would erase the catalogue's title.
 */
export function rowToOverride(r: ArtworkOverrideRow): Partial<Artwork> {
  const patch: Partial<Artwork> = {}
  if (r.title_en !== null || r.title_ar !== null) {
    patch.title = { en: r.title_en ?? '', ar: r.title_ar ?? '' }
  }
  if (r.artist_en !== null || r.artist_ar !== null) {
    patch.artist = { en: r.artist_en ?? '', ar: r.artist_ar ?? '' }
  }
  if (r.description_en !== null || r.description_ar !== null) {
    patch.description = { en: r.description_en ?? '', ar: r.description_ar ?? '' }
  }
  if (r.medium_en !== null || r.medium_ar !== null) {
    patch.medium = { en: r.medium_en ?? '', ar: r.medium_ar ?? '' }
  }
  if (r.year !== null) patch.year = r.year
  if (r.width_cm !== null) patch.widthCm = Number(r.width_cm)
  if (r.height_cm !== null) patch.heightCm = Number(r.height_cm)
  if (r.price_minor !== null) patch.priceMinor = Number(r.price_minor)
  if (r.status !== null) patch.status = r.status
  if (r.image !== null) patch.image = r.image
  if (r.hidden !== null) patch.hidden = r.hidden
  return patch
}

export function rowToRequest(r: AcquisitionRequestRow): AcquisitionRequest {
  return {
    id: r.id,
    artworkId: r.artwork_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    note: r.note,
    at: r.created_at,
    handled: r.handled,
  }
}

// ---------------------------------------------------------------- UI -> row

/** Only the keys present in the patch are written, so a partial stays partial. */
export function patchToOverrideRow(patch: Partial<Artwork>): Partial<ArtworkOverrideRow> {
  const row: Partial<ArtworkOverrideRow> = {}
  if (patch.title) { row.title_en = patch.title.en; row.title_ar = patch.title.ar }
  if (patch.artist) { row.artist_en = patch.artist.en; row.artist_ar = patch.artist.ar }
  if (patch.description) { row.description_en = patch.description.en; row.description_ar = patch.description.ar }
  if (patch.medium) { row.medium_en = patch.medium.en; row.medium_ar = patch.medium.ar }
  if (patch.year !== undefined) row.year = patch.year
  if (patch.widthCm !== undefined) row.width_cm = patch.widthCm
  if (patch.heightCm !== undefined) row.height_cm = patch.heightCm
  if (patch.priceMinor !== undefined) row.price_minor = patch.priceMinor
  if (patch.status !== undefined) row.status = patch.status
  if (patch.image !== undefined) row.image = patch.image
  if (patch.hidden !== undefined) row.hidden = patch.hidden
  return row
}

export function artworkToRow(a: Omit<Artwork, 'id' | 'custom'>) {
  return {
    title_en: a.title.en,
    title_ar: a.title.ar,
    artist_en: a.artist.en,
    artist_ar: a.artist.ar,
    description_en: a.description.en,
    description_ar: a.description.ar,
    medium_en: a.medium.en,
    medium_ar: a.medium.ar,
    flavor_id: a.flavorId,
    bar_slugs: a.barSlugs,
    year: a.year,
    width_cm: a.widthCm,
    height_cm: a.heightCm,
    price_minor: a.priceMinor,
    status: a.status,
    image: a.image ?? null,
    hidden: a.hidden ?? false,
  }
}

// ---------------------------------------------------------------- reads

/**
 * Everything the gallery needs in one pass. Requests come back empty for anyone
 * who is not staff — RLS filters them — which is the intended result, not an
 * error to report.
 */
export async function fetchGallery(): Promise<GalleryState> {
  if (!isSupabaseConfigured) return EMPTY_GALLERY
  const db = requireSupabase()

  const [custom, overrides, requests] = await Promise.all([
    db.from('artworks').select('*').order('created_at', { ascending: true }),
    db.from('artwork_overrides').select('*'),
    db.from('acquisition_requests').select('*').order('created_at', { ascending: false }),
  ])

  if (custom.error) console.error('[gallery] artworks:', custom.error.message)
  if (overrides.error) console.error('[gallery] overrides:', overrides.error.message)
  // A non-staff visitor gets an empty list here rather than an error, so only a
  // real failure is worth logging.
  if (requests.error) console.error('[gallery] requests:', requests.error.message)

  return {
    custom: (custom.data ?? []).map(rowToArtwork),
    overrides: Object.fromEntries((overrides.data ?? []).map((r) => [r.artwork_id, rowToOverride(r)])),
    requests: (requests.data ?? []).map(rowToRequest),
  }
}

// ---------------------------------------------------------------- writes

export interface WriteResult { ok: boolean; error: string | null }
const OK: WriteResult = { ok: true, error: null }
const bad = (error: string): WriteResult => ({ ok: false, error })

export async function createArtwork(fields: Omit<Artwork, 'id' | 'custom'>): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('gallery.notConfigured')
  const { error } = await requireSupabase().from('artworks').insert(artworkToRow(fields))
  return error ? bad(error.message) : OK
}

/**
 * Routes by which kind of work it is, exactly as the local provider did: a
 * console-defined work is patched in place, a seeded one gains or updates an
 * override row.
 */
export async function saveArtworkPatch(
  id: string,
  patch: Partial<Artwork>,
  isCustom: boolean,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('gallery.notConfigured')
  const db = requireSupabase()

  if (isCustom) {
    const row = artworkPatchToRow(patch)
    if (Object.keys(row).length === 0) return OK
    const { error } = await db.from('artworks').update(row).eq('id', id)
    return error ? bad(error.message) : OK
  }

  const row = patchToOverrideRow(patch)
  if (Object.keys(row).length === 0) return OK
  const { error } = await db
    .from('artwork_overrides')
    .upsert({ artwork_id: id, ...row }, { onConflict: 'artwork_id' })
  return error ? bad(error.message) : OK
}

/** The custom-artwork equivalent of patchToOverrideRow. */
function artworkPatchToRow(patch: Partial<Artwork>): Partial<ArtworkRow> {
  const row = patchToOverrideRow(patch) as Partial<ArtworkRow>
  if (patch.flavorId !== undefined) row.flavor_id = patch.flavorId
  if (patch.barSlugs !== undefined) row.bar_slugs = patch.barSlugs
  return row
}

/** Only a console-defined work can be deleted; a seeded one is hidden instead. */
export async function deleteArtwork(id: string): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('gallery.notConfigured')
  const { error } = await requireSupabase().from('artworks').delete().eq('id', id)
  return error ? bad(error.message) : OK
}

/**
 * Sends a collector's request. The canvas is held by a database trigger on this
 * insert, not by a second call — the visitor is usually anonymous and has no
 * write access to either artwork table.
 */
export async function sendAcquisitionRequest(
  r: Omit<AcquisitionRequest, 'id' | 'at' | 'handled'>,
): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('gallery.notConfigured')
  const { error } = await requireSupabase().from('acquisition_requests').insert({
    artwork_id: r.artworkId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    note: r.note,
  })
  return error ? bad(error.message) : OK
}

export async function setRequestHandled(id: string, handled: boolean): Promise<WriteResult> {
  if (!isSupabaseConfigured) return bad('gallery.notConfigured')
  const { error } = await requireSupabase().from('acquisition_requests').update({ handled }).eq('id', id)
  return error ? bad(error.message) : OK
}
