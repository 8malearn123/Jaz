// ── The originals ────────────────────────────────────────────────────────────
// Every bar carries a painting, and the painting itself is a canvas held in Jazan:
// one of one. /shop sells the bar, /art sells the canvas.
//
// The list is derived from the catalogue's art cards rather than typed out again —
// same rule the heritage index follows — so a commission can never appear on the
// wrapper and be missing from the gallery. What a catalogue entry cannot know is
// what selling an original needs: its medium, its true size, what it costs, and
// whether it is still on the wall. Those are stated here, keyed by the bar whose
// wrapper carries the work.
import { products } from './products'
import type { Artwork, ArtworkFacts, Bilingual, Product } from './types'

/** The acquisition facts, per the bar that carries the painting. */
const facts: Record<string, ArtworkFacts> = {
  'single-origin-dark': { year: 2025, medium: { en: 'Oil on canvas', ar: 'زيت على قماش' }, widthCm: 90, heightCm: 120, priceMinor: 2400000, status: 'available' },
  'dark-60': { year: 2025, medium: { en: 'Acrylic on canvas', ar: 'أكريليك على قماش' }, widthCm: 80, heightCm: 100, priceMinor: 1950000, status: 'sold' },
  'signature-milk': { year: 2024, medium: { en: 'Oil on canvas', ar: 'زيت على قماش' }, widthCm: 100, heightCm: 100, priceMinor: 2200000, status: 'available' },
  'jazan-jasmine': { year: 2025, medium: { en: 'Acrylic on canvas', ar: 'أكريليك على قماش' }, widthCm: 70, heightCm: 100, priceMinor: 1850000, status: 'available' },
  'damascena-rose': { year: 2025, medium: { en: 'Watercolour on paper', ar: 'ألوان مائية على ورق' }, widthCm: 56, heightCm: 76, priceMinor: 1150000, status: 'reserved' },
  'khawlani-coffee': { year: 2024, medium: { en: 'Oil on canvas', ar: 'زيت على قماش' }, widthCm: 90, heightCm: 110, priceMinor: 2600000, status: 'available' },
  'sea-salt-dark': { year: 2024, medium: { en: 'Acrylic on canvas', ar: 'أكريليك على قماش' }, widthCm: 80, heightCm: 120, priceMinor: 2050000, status: 'available' },
  'chili-dark': { year: 2025, medium: { en: 'Acrylic on canvas', ar: 'أكريليك على قماش' }, widthCm: 70, heightCm: 90, priceMinor: 1450000, status: 'available' },
  'lavender-milk': { year: 2025, medium: { en: 'Watercolour on paper', ar: 'ألوان مائية على ورق' }, widthCm: 50, heightCm: 70, priceMinor: 980000, status: 'sold' },
  'jazani-mango': { year: 2026, medium: { en: 'Acrylic on canvas', ar: 'أكريليك على قماش' }, widthCm: 100, heightCm: 130, priceMinor: 2850000, status: 'available' },
  'sun-papaya': { year: 2026, medium: { en: 'Acrylic on canvas', ar: 'أكريليك على قماش' }, widthCm: 70, heightCm: 90, priceMinor: 1600000, status: 'available' },
  'banana-dark': { year: 2026, medium: { en: 'Oil on canvas', ar: 'زيت على قماش' }, widthCm: 80, heightCm: 100, priceMinor: 1750000, status: 'available' },
}

/** A painting with no stated facts is still hung — priced on request, never invented. */
const unstated: ArtworkFacts = { year: 2025, medium: { en: 'Mixed media', ar: 'وسائط مختلطة' }, widthCm: 70, heightCm: 100, priceMinor: 0, status: 'available' }

const sameWork = (a: Product, b: Product) =>
  a.artCard!.artworkTitle.en === b.artCard!.artworkTitle.en &&
  a.artCard!.artistName.en === b.artCard!.artistName.en &&
  a.artCard!.description.en === b.artCard!.description.en

/**
 * One entry per distinct painting. A work printed on more than one bar is one canvas,
 * so the bars are collected onto it — and the title alone is not the key: the catalogue
 * holds three different paintings called «حين تزهر الحقول», and merging them would
 * quietly delete two commissions (and sell one canvas three times).
 */
export function deriveArtworks(catalogue: Product[]): Artwork[] {
  return catalogue
    .filter((p) => p.artCard)
    .reduce<Product[][]>((groups, p) => {
      const g = groups.find((members) => sameWork(members[0], p))
      if (g) g.push(p)
      else groups.push([p])
      return groups
    }, [])
    .map((members) => {
      const lead = members[0]
      const art = lead.artCard!
      return {
        id: `aw-${lead.slug}`,
        title: art.artworkTitle,
        artist: art.artistName,
        description: art.description,
        flavorId: lead.flavorId,
        barSlugs: members.map((m) => m.slug),
        ...(facts[lead.slug] ?? unstated),
      }
    })
}

/**
 * The gallery derived from the in-code catalogue. Still the whole story with no
 * backend; with one, ArtworksProvider re-derives from whatever the products table
 * returns, so the ids stay `aw-<slug>` and the artwork_overrides rows keyed on them
 * keep matching.
 */
export const seededArtworks: Artwork[] = deriveArtworks(products)

export const artworkStatuses = ['available', 'reserved', 'sold'] as const

export const artworkStatusMeta: Record<Artwork['status'], { label: Bilingual; color: string; bg: string }> = {
  available: { label: { en: 'Available', ar: 'متاحة' }, color: '#355c4b', bg: '#e8f0ec' },
  reserved: { label: { en: 'Reserved', ar: 'محجوزة' }, color: '#8a6b3f', bg: '#f6edde' },
  sold: { label: { en: 'Acquired', ar: 'مُقتناة' }, color: '#6e6258', bg: '#efeae1' },
}

/** What a collector sends from the gallery — the console answers it. */
export interface AcquisitionRequest {
  id: string
  artworkId: string
  name: string
  email: string
  phone: string
  note: string
  at: string
  handled: boolean
}
