import type { Bilingual, Product } from '@/data/types'
import { flavors } from '@/data/flavors'

/*
 * A gift box carries a `flavorId`, but only as an art key — it picks the accent and the
 * illustration, it does not describe what is inside. Printing that flavour's name against
 * a box reads as a lie ("Rose · The Orchard Box"), so every surface that shows a product's
 * flavour or art goes through these two helpers rather than re-deriving the rule.
 */

/** Which illustration a product wears. */
export function artKind(product: Product): 'bar' | 'box' {
  return product.type === 'gift_box' ? 'box' : 'bar'
}

/** The small accent label above a product's title. */
export function accentLabel(product: Product): Bilingual {
  if (product.type === 'gift_box') return { en: 'Gift box', ar: 'علبة هدية' }
  return flavors[product.flavorId].name
}
