import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  products as seededProducts,
  getProductById as seedById,
  getProduct as seedBySlug,
  variantById as seedVariantById,
} from '@/data/products'
import type { Product } from '@/data/types'
import { isSupabaseConfigured } from '@/lib/supabase'
import { fetchPublicProducts } from '@/lib/api/catalogue'

/*
 * The catalogue the storefront reads. One place, so /shop, /product/:slug, the cart,
 * checkout, search and the account panels all see the same fifteen products.
 *
 * The seed is never discarded. It is the starting value and the fallback: if
 * Supabase is unconfigured, or the read fails, or the table is empty, the shop shows
 * the seeded catalogue rather than nothing. A storefront with no products is worse
 * than a slightly stale one.
 */

type VariantHit = { product: Product; variant: Product['variants'][number] }

interface CatalogueValue {
  products: Product[]
  byId: (id: string) => Product | undefined
  bySlug: (slug: string) => Product | undefined
  /** Same signature as the module helper it replaces, so call sites are unchanged. */
  variantById: (id: string) => VariantHit | undefined
  /** True once a server read has replaced the seed. */
  fromServer: boolean
  /** False while the first read is still in flight. */
  ready: boolean
}

const CatalogueContext = createContext<CatalogueValue | null>(null)

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const backed = isSupabaseConfigured
  // Starts as the seed even when backed, so the first paint is never an empty shop.
  const [products, setProducts] = useState<Product[]>(seededProducts)
  const [fromServer, setFromServer] = useState(false)
  const [ready, setReady] = useState(!backed)

  useEffect(() => {
    if (!backed) return
    let cancelled = false
    void fetchPublicProducts().then((rows) => {
      if (cancelled) return
      // null means "no usable data" — keep the seed rather than empty the shop.
      if (rows && rows.length > 0) {
        setProducts(rows)
        setFromServer(true)
      }
      setReady(true)
    })
    return () => { cancelled = true }
  }, [backed])

  const value = useMemo<CatalogueValue>(() => {
    const idIndex = new Map(products.map((p) => [p.id, p]))
    const slugIndex = new Map(products.map((p) => [p.slug, p]))
    // Indexed rather than scanned: variantById is called once per line on the cart,
    // the checkout summary and every order row, which is a lot of linear searches
    // through every product's variants.
    const variantIndex = new Map<string, VariantHit>()
    for (const product of products) {
      for (const variant of product.variants) variantIndex.set(variant.id, { product, variant })
    }
    return {
      products,
      byId: (id) => idIndex.get(id),
      bySlug: (slug) => slugIndex.get(slug),
      variantById: (id) => variantIndex.get(id),
      fromServer,
      ready,
    }
  }, [products, fromServer, ready])

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
}

/**
 * Tolerates a tree with no provider above it — the SSR harnesses each mount their
 * own slice of providers — by falling back to the seeded catalogue. That is the same
 * data the unconfigured path uses, so a missing provider degrades to the prototype
 * rather than to an empty page.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCatalogue(): CatalogueValue {
  const ctx = useContext(CatalogueContext)
  return ctx ?? SEED_FALLBACK
}

const SEED_FALLBACK: CatalogueValue = {
  products: seededProducts,
  byId: seedById,
  bySlug: seedBySlug,
  variantById: seedVariantById,
  fromServer: false,
  ready: true,
}
