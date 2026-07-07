import type { Bilingual } from './types'

// ── Wholesale / foodservice catalogue for the B2B portal ───────────────────
// Isolated from the retail `products.ts` on purpose: this is a separate SKU
// universe (couverture, kitchen ingredients, ready-to-serve) with quantity-break
// pricing and a minimum order value (MOQ). The retail catalogue is untouched.

export type WholesaleCategory = 'couverture' | 'ingredients' | 'ready'
export type WholesaleStock = 'in' | 'low'
export type WholesaleBadge = 'new' | 'best'

export interface WholesaleProduct {
  sku: string
  name: Bilingual
  category: WholesaleCategory
  /** Pack / case description, e.g. "5 kg carton". */
  unit: Bilingual
  /** Tinted-thumb accent (product-layer hex, not a core token). */
  accent: string
  stock: WholesaleStock
  /** Unit price for 1 .. breakQty-1 (minor units, SAR). */
  priceMinor: number
  /** Quantity at which the wholesale break price kicks in. */
  breakQty: number
  /** Unit price at or above breakQty. */
  breakPriceMinor: number
  /** Minimum order quantity for this line. */
  minQty: number
  /** Shown in the buyer's quick-order matrix of recurring staples. */
  recurring: boolean
  badge?: WholesaleBadge
  description: Bilingual
}

/** Minimum order value to unlock wholesale checkout (SAR 1,500). */
export const MOQ_MINOR = 150000

export const wholesaleCategories: { id: WholesaleCategory | 'all'; label: Bilingual }[] = [
  { id: 'all', label: { en: 'All', ar: 'الكل' } },
  { id: 'couverture', label: { en: 'Couverture', ar: 'كوفرتور' } },
  { id: 'ingredients', label: { en: 'Kitchen ingredients', ar: 'مكوّنات المطبخ' } },
  { id: 'ready', label: { en: 'Ready to serve', ar: 'جاهز للتقديم' } },
]

const sar = (n: number) => n * 100

export const wholesaleProducts: WholesaleProduct[] = [
  {
    sku: 'CHV70', category: 'couverture', accent: '#3b241a', stock: 'in', minQty: 2, breakQty: 6, recurring: true, badge: 'best',
    name: { en: 'Dark couverture 70%', ar: 'كوفرتور داكن ٧٠٪' }, unit: { en: '5 kg carton', ar: 'كرتون ٥ كجم' },
    priceMinor: sar(245), breakPriceMinor: sar(218),
    description: { en: 'Belgian dark couverture at 70% cocoa — ideal for enrobing, dipping and fillings. High shine and a stable melting point for hotel and café kitchens.', ar: 'كوفرتور بلجيكي داكن بنسبة كاكاو ٧٠٪، مثالي للتغطية والتقطير والحشوات. لمعان عالٍ ونقطة انصهار ثابتة تناسب مطابخ الفنادق والمقاهي.' },
  },
  {
    sku: 'CHM45', category: 'couverture', accent: '#8a6b3f', stock: 'in', minQty: 2, breakQty: 6, recurring: true,
    name: { en: 'Milk couverture 45%', ar: 'كوفرتور حليب ٤٥٪' }, unit: { en: '5 kg carton', ar: 'كرتون ٥ كجم' },
    priceMinor: sar(230), breakPriceMinor: sar(205),
    description: { en: 'Creamy milk couverture at 45% cocoa, balanced sweetness — for bonbons, hot drinks and decoration.', ar: 'كوفرتور حليب كريمي بنسبة كاكاو ٤٥٪، متوازن الحلاوة، مناسب للبونبون والمشروبات الساخنة والتزيين.' },
  },
  {
    sku: 'CHW28', category: 'couverture', accent: '#d8c39a', stock: 'in', minQty: 2, breakQty: 6, recurring: false, badge: 'new',
    name: { en: 'White couverture 28%', ar: 'كوفرتور أبيض ٢٨٪' }, unit: { en: '5 kg carton', ar: 'كرتون ٥ كجم' },
    priceMinor: sar(236), breakPriceMinor: sar(210),
    description: { en: 'White couverture rich in cocoa butter (28%), a soft ivory tone and balanced milky flavour — ideal for colouring, layers and light fillings.', ar: 'كوفرتور أبيض غنيّ بزبدة الكاكاو بنسبة ٢٨٪، بلون عاجيّ ناعم ونكهة حليبية متوازنة — مثالي للتلوين والطبقات والحشوات الفاتحة.' },
  },
  {
    sku: 'CHV85', category: 'couverture', accent: '#2a1912', stock: 'low', minQty: 2, breakQty: 6, recurring: false,
    name: { en: 'Dark couverture 85%', ar: 'كوفرتور داكن ٨٥٪' }, unit: { en: '5 kg carton', ar: 'كرتون ٥ كجم' },
    priceMinor: sar(262), breakPriceMinor: sar(234),
    description: { en: 'Intense dark couverture at 85% cocoa with a noble low-sugar bitterness — for lovers of strong flavour and refined desserts.', ar: 'كوفرتور داكن مكثّف بنسبة كاكاو ٨٥٪ ومرارة نبيلة قليلة السكر، لعشّاق الطعم القويّ والحلويات الراقية.' },
  },
  {
    sku: 'PWD22', category: 'ingredients', accent: '#5a3d2b', stock: 'in', minQty: 4, breakQty: 10, recurring: true,
    name: { en: 'Raw cocoa powder', ar: 'بودرة كاكاو خام' }, unit: { en: '1 kg bag', ar: 'كيس ١ كجم' },
    priceMinor: sar(68), breakPriceMinor: sar(58),
    description: { en: 'Partially defatted cocoa powder with a dark colour and concentrated flavour — for baking, drinks and finishing.', ar: 'بودرة كاكاو مُزالة الدسم جزئيًا بلون داكن ونكهة مركّزة، للمخبوزات والمشروبات والتزيين النهائي.' },
  },
  {
    sku: 'DRP60', category: 'ingredients', accent: '#4a2f1f', stock: 'low', minQty: 2, breakQty: 6, recurring: true,
    name: { en: 'Chocolate drops 60%', ar: 'حبيبات شوكولاتة ٦٠٪' }, unit: { en: '4 kg carton', ar: 'كرتون ٤ كجم' },
    priceMinor: sar(185), breakPriceMinor: sar(165),
    description: { en: 'Heat-resistant chocolate drops (60%) that hold their shape while baking — ideal for cookies and muffins.', ar: 'حبيبات شوكولاتة مقاومة للحرارة (٦٠٪) تحافظ على شكلها أثناء الخبز — مثالية للكوكيز والمافن.' },
  },
  {
    sku: 'CCB18', category: 'ingredients', accent: '#e5d4a8', stock: 'in', minQty: 2, breakQty: 8, recurring: false,
    name: { en: 'Pure cocoa butter', ar: 'زبدة كاكاو نقية' }, unit: { en: '2 kg tub', ar: 'علبة ٢ كجم' },
    priceMinor: sar(142), breakPriceMinor: sar(128),
    description: { en: 'Food-grade pure cocoa butter for adjusting couverture fluidity, polishing moulds and preparing cocoa colours — high purity, natural aroma.', ar: 'زبدة كاكاو نقية غذائية لضبط سيولة الكوفرتور وتلميع القوالب وتحضير ألوان الكاكاو — نقاء عالٍ ورائحة طبيعية.' },
  },
  {
    sku: 'GNC30', category: 'ingredients', accent: '#6b4a30', stock: 'in', minQty: 2, breakQty: 6, recurring: false, badge: 'new',
    name: { en: 'Ready ganache filling', ar: 'غاناش جاهز للحشو' }, unit: { en: '3 kg pail', ar: 'دلو ٣ كجم' },
    priceMinor: sar(158), breakPriceMinor: sar(142),
    description: { en: 'Ready chocolate ganache with a firm creamy texture, saving prep time for filling bonbons, cakes and tarts — use directly after softening.', ar: 'غاناش شوكولاتة جاهز بقوام كريمي ثابت، يوفّر وقت التحضير لحشو البونبون والكيك والتارت — يُستخدم مباشرةً بعد التطرية.' },
  },
  {
    sku: 'SPR', category: 'ready', accent: '#6b4a30', stock: 'in', minQty: 2, breakQty: 6, recurring: true,
    name: { en: 'Pourable chocolate sauce', ar: 'صوص شوكولاتة سائح' }, unit: { en: '3 L jug', ar: 'جالون ٣ لتر' },
    priceMinor: sar(120), breakPriceMinor: sar(108),
    description: { en: 'Ready-to-use chocolate sauce with a flowing texture — for drinks, desserts and direct service without heating.', ar: 'صوص شوكولاتة جاهز للاستخدام بقوام انسيابي، للمشروبات والحلويات والتقديم المباشر دون تسخين.' },
  },
  {
    sku: 'TRF', category: 'ready', accent: '#8e2f55', stock: 'low', minQty: 1, breakQty: 4, recurring: true, badge: 'best',
    name: { en: 'Ready-to-serve truffles', ar: 'ترافل جاهز للتقديم' }, unit: { en: 'Box of 48', ar: 'علبة ٤٨ حبة' },
    priceMinor: sar(310), breakPriceMinor: sar(280),
    description: { en: 'Luxury ganache-filled truffles, ready to serve with coffee or as hospitality — kept chilled, served at room temperature.', ar: 'ترافل فاخر محشو بالغاناش، جاهز للتقديم مع القهوة أو كضيافة — يُحفظ مبرّدًا ويقدَّم بحرارة الغرفة.' },
  },
  {
    sku: 'BON36', category: 'ready', accent: '#7a4a2e', stock: 'in', minQty: 1, breakQty: 4, recurring: false,
    name: { en: 'Assorted luxury bonbons', ar: 'بونبون مشكّل فاخر' }, unit: { en: 'Box of 36', ar: 'علبة ٣٦ حبة' },
    priceMinor: sar(288), breakPriceMinor: sar(258),
    description: { en: 'A handmade bonbon assortment with varied fillings and a glossy couverture shell — ready for hospitality carts and gift boxes.', ar: 'تشكيلة بونبون مصنوعة يدويًا بحشوات متنوّعة وقشرة كوفرتور لامعة، جاهزة لعربات الضيافة وصناديق الهدايا.' },
  },
  {
    sku: 'BAR90', category: 'ready', accent: '#b08a57', stock: 'in', minQty: 2, breakQty: 5, recurring: false, badge: 'new',
    name: { en: 'JAZ signature bars', ar: 'ألواح جاز الفاخرة' }, unit: { en: '24-bar carton', ar: 'كرتون ٢٤ لوح' },
    priceMinor: sar(216), breakPriceMinor: sar(192),
    description: { en: 'JAZ signature bars in Jazani flavours (jasmine, rose, mango), packed for direct sale at checkout and exhibitions.', ar: 'ألواح جاز الموقّعة بنكهات جيزانية (فُل، ورد، مانجو)، معبّأة للبيع المباشر عند نقاط الدفع والمعارض.' },
  },
]

export function wholesaleBySku(sku: string): WholesaleProduct | undefined {
  return wholesaleProducts.find((p) => p.sku === sku)
}

/** Tiered unit price — the break price applies once qty reaches breakQty. */
export function wholesaleUnitPrice(p: WholesaleProduct, qty: number): number {
  return qty >= p.breakQty ? p.breakPriceMinor : p.priceMinor
}
