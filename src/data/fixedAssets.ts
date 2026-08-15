import type { Bilingual } from './types'
import { ACC } from './coa'

// ── Fixed assets & depreciation (الأصول الثابتة والإهلاك) — isolated.
//
// An asset is bought once and consumed over years, so its cost cannot sit in the month
// it was paid for. Each asset here carries its cost, the account it is capitalised in,
// the life it is written off over, and how many months of that life had already run
// when the book opened. Depreciation is straight line — the same charge every month —
// which is what the schedule and the monthly posting both read.

export type AssetCategory = 'equipment' | 'vehicles' | 'fixtures'

export const assetCategoryMeta: Record<AssetCategory, { label: Bilingual; account: string; color: string; bg: string }> = {
  equipment: { label: { en: 'Production equipment', ar: 'معدات إنتاج' }, account: ACC.equipment, color: '#8a6b3f', bg: '#f6edde' },
  vehicles: { label: { en: 'Cold-chain vehicles', ar: 'مركبات مبرّدة' }, account: ACC.vehicles, color: '#365766', bg: '#e7eef1' },
  fixtures: { label: { en: 'Fixtures & fittings', ar: 'أثاث وتجهيزات' }, account: ACC.fixtures, color: '#355c4b', bg: '#e8f0ec' },
}

export interface FixedAsset {
  id: string
  name: Bilingual
  category: AssetCategory
  costMinor: number
  /** Straight-line life, in months. */
  lifeMonths: number
  inService: Bilingual
  /** Months of life already consumed when the opening balance was struck. */
  openingMonths: number
  /** Which cost centre carries its depreciation. */
  centerId?: string
}

export const fixedAssetsSeed: FixedAsset[] = [
  {
    id: 'FA-01', category: 'equipment', costMinor: 120000000, lifeMonths: 120, openingMonths: 30,
    name: { en: 'Cocoa production line — Jazan', ar: 'خط إنتاج الكاكاو — جازان' },
    inService: { en: 'Jan 2024', ar: 'يناير ٢٠٢٤' }, centerId: 'CC-01',
  },
  {
    id: 'FA-02', category: 'vehicles', costMinor: 48000000, lifeMonths: 72, openingMonths: 24,
    name: { en: 'Refrigerated delivery vans (2)', ar: 'مركبتا توصيل مبرّدتان' },
    inService: { en: 'Jul 2024', ar: 'يوليو ٢٠٢٤' }, centerId: 'CC-03',
  },
  {
    id: 'FA-03', category: 'fixtures', costMinor: 27000000, lifeMonths: 60, openingMonths: 16,
    name: { en: 'Jazan boutique fit-out', ar: 'تجهيزات معرض جازان' },
    inService: { en: 'Mar 2025', ar: 'مارس ٢٠٢٥' }, centerId: 'CC-04',
  },
  {
    id: 'FA-04', category: 'fixtures', costMinor: 36000000, lifeMonths: 96, openingMonths: 18,
    name: { en: 'Warehouse cold-storage system', ar: 'نظام التبريد بالمستودع' },
    inService: { en: 'Jan 2025', ar: 'يناير ٢٠٢٥' }, centerId: 'CC-03',
  },
]

/* ── the arithmetic ───────────────────────────────────────────────────────── */

/** The straight-line charge for one month. */
export const monthlyDepreciation = (a: FixedAsset): number =>
  a.lifeMonths > 0 ? Math.round(a.costMinor / a.lifeMonths) : 0

/**
 * Depreciation accumulated after `months` of life. Computed from the whole cost rather
 * than by adding up rounded monthly charges, so the asset lands exactly on nil at the
 * end of its life instead of drifting a few halalas either way.
 */
export function accumulatedAfter(a: FixedAsset, months: number): number {
  const m = Math.max(0, Math.min(a.lifeMonths, months))
  return Math.round((a.costMinor * m) / a.lifeMonths)
}

/** What the asset had already lost when the book opened. */
export const openingAccumulated = (a: FixedAsset): number => accumulatedAfter(a, a.openingMonths)

/** Cost less accumulated depreciation, after `months` of life. */
export const netBookValue = (a: FixedAsset, months: number): number => a.costMinor - accumulatedAfter(a, months)

/** Remaining months of life. */
export const remainingMonths = (a: FixedAsset, months: number): number => Math.max(0, a.lifeMonths - months)

export interface DepreciationRow {
  asset: FixedAsset
  monthlyMinor: number
  accumulatedMinor: number
  netBookValueMinor: number
  remainingMonths: number
  /** Fully written off — it stays on the books at nil and stops being charged. */
  retired: boolean
}

/**
 * The schedule as of `monthsPosted` further months beyond the opening position — which
 * is how many depreciation runs have been posted since the book opened.
 */
export function depreciationSchedule(assets: FixedAsset[], monthsPosted: number): DepreciationRow[] {
  return assets.map((asset) => {
    const months = asset.openingMonths + monthsPosted
    const retired = months >= asset.lifeMonths
    return {
      asset,
      monthlyMinor: retired ? 0 : monthlyDepreciation(asset),
      accumulatedMinor: accumulatedAfter(asset, months),
      netBookValueMinor: netBookValue(asset, months),
      remainingMonths: remainingMonths(asset, months),
      retired,
    }
  })
}

/** What one depreciation run costs across the whole register. */
export const runTotal = (rows: DepreciationRow[]): number => rows.reduce((s, r) => s + r.monthlyMinor, 0)
