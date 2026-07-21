import type { Bilingual } from './types'

// ── Owner supply chain (isolated). Raw materials, finished batches, purchase
// invoices, suppliers — plus raw availability + BOMs that feed product buildable qty.

export type RawKey = 'cacao' | 'milk' | 'sugar' | 'foil'

export interface RawMaterial {
  key: RawKey
  name: Bilingual
  category: Bilingual
  qtyLabel: Bilingual // e.g. "0.8 ton" / "1,900 rolls"
  pct: number // level %
  reorderPct: number // reorder-point marker %
  landedMinor: number // imported (landed) cost per costUnit
  costUnit: Bilingual // unit the landed cost is quoted per (e.g. ton / roll)
  low: boolean
  systemQty: number // for stock-take
  unit: Bilingual
}

export const rawMaterials: RawMaterial[] = [
  { key: 'cacao', name: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, category: { en: 'Cocoa & derivatives', ar: 'كاكاو ومشتقاته' }, qtyLabel: { en: '0.8 ton', ar: '٠٫٨ طن' }, pct: 16, reorderPct: 30, landedMinor: 4600000, costUnit: { en: 'ton', ar: 'طن' }, low: true, systemQty: 800, unit: { en: 'kg', ar: 'كجم' } },
  { key: 'milk', name: { en: 'Milk powder', ar: 'حليب مجفف' }, category: { en: 'Dairy & sweeteners', ar: 'ألبان ومحلّيات' }, qtyLabel: { en: '2.4 ton', ar: '٢٫٤ طن' }, pct: 62, reorderPct: 30, landedMinor: 1980000, costUnit: { en: 'ton', ar: 'طن' }, low: false, systemQty: 2400, unit: { en: 'kg', ar: 'كجم' } },
  { key: 'sugar', name: { en: 'Fine sugar', ar: 'سكر ناعم' }, category: { en: 'Dairy & sweeteners', ar: 'ألبان ومحلّيات' }, qtyLabel: { en: '5.1 ton', ar: '٥٫١ طن' }, pct: 84, reorderPct: 25, landedMinor: 850000, costUnit: { en: 'ton', ar: 'طن' }, low: false, systemQty: 5100, unit: { en: 'kg', ar: 'كجم' } },
  { key: 'foil', name: { en: 'Gold wrapping foil', ar: 'ورق تغليف ذهبي' }, category: { en: 'Packaging & support', ar: 'تغليف ومواد داعمة' }, qtyLabel: { en: '1,900 rolls', ar: '١٬٩٠٠ لفة' }, pct: 22, reorderPct: 40, landedMinor: 320000, costUnit: { en: 'roll', ar: 'لفة' }, low: true, systemQty: 1900, unit: { en: 'roll', ar: 'لفة' } },
]

// Owner-added stock items (inventory-only overlay; not part of the production BOM/buildable system).
export interface ExtraRaw { id: string; name: Bilingual; category: Bilingual; unit: Bilingual; costUnit: Bilingual; costMinor: number; qty: number; reorderQty: number }

// Stock/purchase units. Same-dimension pairs convert automatically (toBase ratio);
// count units (carton → piece …) have no fixed ratio, so the factor stays manual.
export interface StockUnit { key: string; label: Bilingual; dim: 'mass' | 'volume' | 'count'; toBase: number }
export const stockUnits: StockUnit[] = [
  { key: 'g', label: { en: 'g', ar: 'جم' }, dim: 'mass', toBase: 0.001 },
  { key: 'kg', label: { en: 'kg', ar: 'كجم' }, dim: 'mass', toBase: 1 },
  { key: 'ton', label: { en: 'ton', ar: 'طن' }, dim: 'mass', toBase: 1000 },
  { key: 'ml', label: { en: 'ml', ar: 'مل' }, dim: 'volume', toBase: 0.001 },
  { key: 'liter', label: { en: 'liter', ar: 'لتر' }, dim: 'volume', toBase: 1 },
  { key: 'piece', label: { en: 'piece', ar: 'قطعة' }, dim: 'count', toBase: 1 },
  { key: 'roll', label: { en: 'roll', ar: 'لفة' }, dim: 'count', toBase: 1 },
  { key: 'carton', label: { en: 'carton', ar: 'كرتون' }, dim: 'count', toBase: 1 },
  { key: 'bag', label: { en: 'bag', ar: 'كيس' }, dim: 'count', toBase: 1 },
]
export const unitFactor = (buyKey: string, stockKey: string): number => {
  const b = stockUnits.find((u) => u.key === buyKey), s = stockUnits.find((u) => u.key === stockKey)
  return b && s && b.dim === s.dim ? b.toBase / s.toBase : 1
}

// Raw availability (kg / units) the product buildable computation reads.
export const rawAvail: Record<RawKey, number> = { cacao: 800, milk: 2400, sugar: 5100, foil: 1900 }

// Per-unit bill of materials by product SKU (grams/units of each raw per finished unit).
export const bomBySku: Record<string, Partial<Record<RawKey, number>>> = {
  'BAR-DARK-70': { cacao: 0.07, sugar: 0.02, foil: 1 },
  'BAR-MILK': { cacao: 0.03, milk: 0.03, sugar: 0.02, foil: 1 },
  'BOX-JASMINE': { cacao: 0.28, milk: 0.1, sugar: 0.08, foil: 12 },
  'HOTEL-AMENITY': { cacao: 0.02, milk: 0.02, foil: 1 },
  'PALLET-ASSORTED': { cacao: 22, milk: 8, sugar: 6, foil: 480 },
}

export interface FinishedBatch { code: string; product: Bilingual; systemQty: number; countedQty: number; expiryDays: number; unitMinor: number; color: string }
export const finishedBatches: FinishedBatch[] = [
  { code: 'BATCH-FG-018', product: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, systemQty: 1240, countedQty: 1240, expiryDays: 92, unitMinor: 4400, color: '#2e1a10' },
  { code: 'BATCH-FG-044', product: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, systemQty: 860, countedQty: 852, expiryDays: 61, unitMinor: 3800, color: '#6b4a2e' },
  { code: 'BATCH-FG-091', product: { en: 'Rose gift box', ar: 'بوكس الورد' }, systemQty: 210, countedQty: 198, expiryDays: 14, unitMinor: 31000, color: '#9c5566' },
  { code: 'BATCH-FG-063', product: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, systemQty: 540, countedQty: 545, expiryDays: 47, unitMinor: 16800, color: '#b08a57' },
]

// Per-item stock movement audit trail (who moved what, when and why).
export interface StockMovement { id: string; itemId: string; kind: 'in' | 'out' | 'adjust'; qty: number; at: Bilingual; by: Bilingual; note: Bilingual }
export const stockMovementsSeed: StockMovement[] = [
  { id: 'MV-091', itemId: 'cacao', kind: 'in', qty: 5000, at: { en: '04 Jul · 09:20', ar: '٠٤ يوليو · ٠٩:٢٠' }, by: { en: 'Salem Al-Ghamdi — warehouse', ar: 'سالم الغامدي — أمين المستودع' }, note: { en: 'Purchase invoice PINV-3312 received', ar: 'استلام فاتورة المشتريات PINV-3312' } },
  { id: 'MV-090', itemId: 'cacao', kind: 'out', qty: 620, at: { en: '03 Jul · 14:05', ar: '٠٣ يوليو · ١٤:٠٥' }, by: { en: 'Hind Al-Asiri — production', ar: 'هند العسيري — الإنتاج' }, note: { en: 'Production draw — Dark 70% batch', ar: 'خصم إنتاج — دفعة لوح داكن ٧٠٪' } },
  { id: 'MV-089', itemId: 'milk', kind: 'in', qty: 3000, at: { en: '03 Jul · 11:40', ar: '٠٣ يوليو · ١١:٤٠' }, by: { en: 'Salem Al-Ghamdi — warehouse', ar: 'سالم الغامدي — أمين المستودع' }, note: { en: 'Purchase invoice PINV-3310 received', ar: 'استلام فاتورة المشتريات PINV-3310' } },
  { id: 'MV-088', itemId: 'sugar', kind: 'adjust', qty: -40, at: { en: '03 Jul · 08:15', ar: '٠٣ يوليو · ٠٨:١٥' }, by: { en: 'Salem Al-Ghamdi — warehouse', ar: 'سالم الغامدي — أمين المستودع' }, note: { en: 'Stock-take adjustment', ar: 'تسوية جرد' } },
  { id: 'MV-087', itemId: 'foil', kind: 'out', qty: 1200, at: { en: '02 Jul · 16:30', ar: '٠٢ يوليو · ١٦:٣٠' }, by: { en: 'Hind Al-Asiri — production', ar: 'هند العسيري — الإنتاج' }, note: { en: 'Production draw — jasmine boxes', ar: 'خصم إنتاج — بوكسات الفُل' } },
  { id: 'MV-086', itemId: 'foil', kind: 'in', qty: 4000, at: { en: '28 Jun · 10:00', ar: '٢٨ يونيو · ١٠:٠٠' }, by: { en: 'Salem Al-Ghamdi — warehouse', ar: 'سالم الغامدي — أمين المستودع' }, note: { en: 'Purchase invoice PINV-3301 received', ar: 'استلام فاتورة المشتريات PINV-3301' } },
]

// Immutable stock-take audit report — created automatically when a stock-take is finalized.
// By design there is no edit or delete path for these.
export interface StockTakeReportLine { name: Bilingual; system: number; counted: number; variance: number; valueMinor: number }
export interface StockTakeReport {
  id: string
  scope: 'raw' | 'finished'
  startedAt: number // epoch ms — when the stock-take was opened
  endedAt: number // epoch ms — when it was finalized
  method: Bilingual // how the count was performed
  lines: StockTakeReportLine[]
  netValueMinor: number
}

export type PurchaseMatch = 'matched' | 'pending' | 'flagged'

// Extra (landed) costs on a purchase invoice — each one is classified by source
// so the invoice records where the cost came from, not just a lump sum.
export type ExtraCostType = 'shipping' | 'packaging' | 'customs' | 'insurance' | 'other'
export const extraCostTypes: { key: ExtraCostType; label: Bilingual }[] = [
  { key: 'shipping', label: { en: 'Shipping / delivery', ar: 'شحن / توصيل' } },
  { key: 'packaging', label: { en: 'Packaging', ar: 'تغليف' } },
  { key: 'customs', label: { en: 'Customs & clearance', ar: 'جمارك وتخليص' } },
  { key: 'insurance', label: { en: 'Insurance', ar: 'تأمين' } },
  { key: 'other', label: { en: 'Other…', ar: 'أخرى…' } },
]
export interface InvoiceExtraCost {
  type: ExtraCostType
  note?: string // free-text source, e.g. carrier name — required when type is 'other'
  amountMinor: number
}

export interface PurchaseInvoice {
  id: string
  supplier: Bilingual
  material: Bilingual
  date: Bilingual
  totalMinor: number
  match: PurchaseMatch
  po?: string // linked purchase order (absent → no PO, so it can't 3-way match → flagged)
  rawKey?: RawKey // raw stock this invoice restocks (drives the automatic stock/cost update)
  qty?: number // received quantity in the raw's unit
  extraCosts?: InvoiceExtraCost[] // classified extra costs included in totalMinor
}
export const purchaseInvoices: PurchaseInvoice[] = [
  { id: 'PINV-3312', supplier: { en: 'Barry Callebaut', ar: 'باري كاليبو' }, material: { en: 'Cocoa mass', ar: 'كتلة كاكاو' }, date: { en: '04 Jul', ar: '٠٤ يوليو' }, totalMinor: 26450000, match: 'matched', po: 'PO-2041', rawKey: 'cacao', qty: 5000 },
  { id: 'PINV-3310', supplier: { en: 'Almarai', ar: 'المراعي' }, material: { en: 'Milk powder', ar: 'حليب مجفف' }, date: { en: '03 Jul', ar: '٠٣ يوليو' }, totalMinor: 6831000, match: 'pending', po: 'PO-2044', rawKey: 'milk', qty: 3000 },
  { id: 'PINV-3307', supplier: { en: 'Nut Traders', ar: 'تجار المكسّرات' }, material: { en: 'Raw sugar', ar: 'سكر خام' }, date: { en: '01 Jul', ar: '٠١ يوليو' }, totalMinor: 1288000, match: 'flagged', rawKey: 'sugar', qty: 8000 },
  { id: 'PINV-3301', supplier: { en: 'Jizan Press', ar: 'مطابع جيزان' }, material: { en: 'Gold foil', ar: 'ورق ذهبي' }, date: { en: '28 Jun', ar: '٢٨ يونيو' }, totalMinor: 1564000, match: 'pending', po: 'PO-2047', rawKey: 'foil', qty: 4000 },
]

export interface SupplierContact { person: Bilingual; phone: string; email: string; city: Bilingual }
export interface Supplier {
  id: string; name: Bilingual; country: Bilingual; material: Bilingual; score: number; leadDays: number; onTimePct: number
  contact?: SupplierContact
  supplies?: Bilingual[] // raw products we order from this supplier
}
export const suppliers: Supplier[] = [
  { id: 'S-01', name: { en: 'Barry Callebaut', ar: 'Barry Callebaut' }, country: { en: 'Belgium', ar: 'بلجيكا' }, material: { en: 'Cocoa', ar: 'كاكاو' }, score: 96, leadDays: 18, onTimePct: 98,
    contact: { person: { en: 'Marc Dubois', ar: 'مارك دوبوا' }, phone: '+32 2 555 0141', email: 'sales@barry-callebaut.com', city: { en: 'Brussels', ar: 'بروكسل' } },
    supplies: [{ en: 'Cocoa mass', ar: 'كتلة كاكاو' }, { en: 'Cocoa butter', ar: 'زبدة كاكاو' }, { en: 'Bulk couverture', ar: 'كوفرتور خام' }] },
  { id: 'S-02', name: { en: 'Almarai', ar: 'المراعي' }, country: { en: 'Saudi Arabia', ar: 'السعودية' }, material: { en: 'Dairy', ar: 'ألبان' }, score: 91, leadDays: 4, onTimePct: 95,
    contact: { person: { en: 'Eng. Fahad Al-Dossari', ar: 'م. فهد الدوسري' }, phone: '+966 11 470 0005', email: 'b2b@almarai.com', city: { en: 'Riyadh', ar: 'الرياض' } },
    supplies: [{ en: 'Milk powder', ar: 'حليب مجفف' }] },
  { id: 'S-03', name: { en: 'Jizan Press', ar: 'مطابع جيزان للتغليف' }, country: { en: 'Saudi Arabia', ar: 'السعودية' }, material: { en: 'Packaging', ar: 'تغليف' }, score: 78, leadDays: 9, onTimePct: 84,
    contact: { person: { en: 'Naif Asiri', ar: 'أ. نايف عسيري' }, phone: '+966 17 322 8890', email: 'orders@jizanpress.sa', city: { en: 'Jazan', ar: 'جيزان' } },
    supplies: [{ en: 'Gold wrapping foil', ar: 'ورق تغليف ذهبي' }, { en: 'Gift boxes', ar: 'علب هدايا' }] },
  { id: 'S-04', name: { en: 'Nut Traders Co.', ar: 'Nut Traders Co.' }, country: { en: 'Turkey', ar: 'تركيا' }, material: { en: 'Nuts', ar: 'مكسرات' }, score: 64, leadDays: 22, onTimePct: 71,
    contact: { person: { en: 'Emre Kaya', ar: 'إمره كايا' }, phone: '+90 212 555 0173', email: 'export@nuttraders.com.tr', city: { en: 'Istanbul', ar: 'إسطنبول' } },
    supplies: [{ en: 'Hazelnuts', ar: 'بندق' }, { en: 'Pistachios', ar: 'فستق' }, { en: 'Fine sugar', ar: 'سكر ناعم' }] },
]
