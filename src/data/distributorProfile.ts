import type { Bilingual } from './types'
import { distributorPack, packValue, type PackChannel, type PackValue } from './distributorPack'

// ── The importer's file ─────────────────────────────────────────────────────
// One surface, two columns. Every term Jaz declares in the distributor pack sits
// in the partner's own company file, and beside it — where the term calls for one —
// the partner's answer:
//
//   Jaz: "exclusive by market"          → partner: which markets
//   Jaz: "annual target USD 1,050,000"  → partner: the figure they committed to
//   Jaz: "store at 16–18 °C"            → partner: the range their warehouse holds
//   Jaz: "SFDA + halal travel with it"  → partner: licence and destination registration
//
// A field hangs off a pack item by its key, so a clause can never appear without
// its answer, nor an answer without the clause it settles. Which questions get
// asked follows the channel: an operator inside the Kingdom is not asked for a
// port of entry, and an exporter is not asked for collection hours.

export type ProfileFieldKind = 'text' | 'number' | 'select' | 'tags'

export interface ProfileField {
  id: string
  /** The pack item this answers — `PackItem.key`. */
  for: string
  label: PackValue
  kind: ProfileFieldKind
  /** Blocks completion while empty. */
  required: boolean
  /** Suffix after a number (currency, unit of measure). */
  unit?: PackValue
  options?: { value: string; label: Bilingual }[]
  placeholder?: PackValue
  /** Asked of one channel only. */
  only?: PackChannel
}

const yesNo = (yes: Bilingual, no: Bilingual) => [
  { value: 'yes', label: yes },
  { value: 'no', label: no },
]

/* ═══════════ What the partner answers, term by term ═══════════ */
export const partnerFields: ProfileField[] = [
  /* ── Commercial ── */
  {
    id: 'resale_margin', for: 'margin', kind: 'number', required: false,
    label: { en: 'Resale margin you apply', ar: 'هامش إعادة البيع المطبّق لديكم' },
    unit: { en: '% off your selling price', ar: '٪ من سعر بيعكم' },
  },
  {
    id: 'resale_channels', for: 'msrp', kind: 'tags', required: true,
    label: { en: 'Resale channels', ar: 'قنوات إعادة البيع' },
    placeholder: { horeca: { en: 'Hotels, Restaurants, Banqueting', ar: 'فنادق، مطاعم، ضيافة مناسبات' }, export: { en: 'Modern trade, Travel retail, Specialty', ar: 'التجزئة الحديثة، التجزئة السفرية، المتاجر المتخصّصة' } },
  },
  {
    id: 'monthly_value', for: 'pricing_policy', kind: 'number', required: false,
    label: { en: 'Expected monthly order value', ar: 'قيمة الطلب الشهري المتوقّعة' },
    unit: { horeca: { en: 'SAR', ar: '﷼' }, export: { en: 'USD', ar: 'دولار' } },
  },
  {
    id: 'markets', for: 'territory', kind: 'tags', required: true,
    label: {
      horeca: { en: 'Cities and regions served', ar: 'المدن والمناطق المخدومة' },
      export: { en: 'Markets covered', ar: 'الأسواق المغطّاة' },
    },
    placeholder: { horeca: { en: 'Riyadh, Jeddah, Dammam', ar: 'الرياض، جدة، الدمام' }, export: { en: 'United Arab Emirates, Germany', ar: 'الإمارات، ألمانيا' } },
  },
  {
    id: 'annual_commitment', for: 'targets', kind: 'number', required: true,
    label: { en: 'Annual purchase commitment', ar: 'الالتزام الشرائي السنوي' },
    unit: { horeca: { en: 'SAR', ar: '﷼' }, export: { en: 'USD', ar: 'دولار' } },
  },
  {
    id: 'payment_method', for: 'payment_terms', kind: 'select', required: true,
    label: { en: 'Settlement method', ar: 'طريقة السداد' },
    options: [
      { value: 'transfer', label: { en: 'Bank transfer', ar: 'تحويل بنكي' } },
      { value: 'lc', label: { en: 'Documentary credit (L/C)', ar: 'اعتماد مستندي' } },
      { value: 'cheque', label: { en: 'Cheque', ar: 'شيك' } },
    ],
  },
  {
    id: 'security', for: 'credit_policy', kind: 'select', required: true,
    label: { en: 'Security offered against the limit', ar: 'الضمان المقدَّم مقابل الحد' },
    options: [
      { value: 'lc', label: { en: 'Documentary credit', ar: 'اعتماد مستندي' } },
      { value: 'bank_guarantee', label: { en: 'Bank guarantee', ar: 'ضمان بنكي' } },
      { value: 'prepaid', label: { en: 'Prepayment — no limit needed', ar: 'دفع مسبق — لا حاجة لحدّ' } },
    ],
  },
  {
    id: 'incoterm_pref', for: 'incoterms', kind: 'select', required: true,
    label: { en: 'Preferred incoterm', ar: 'شرط التسليم المفضّل' },
    options: [
      { value: 'EXW', label: { en: 'EXW — collect at Jazan', ar: 'EXW — الاستلام من جيزان' } },
      { value: 'FOB', label: { en: 'FOB Jeddah', ar: 'FOB جدة' } },
      { value: 'CIF', label: { en: 'CIF destination port', ar: 'CIF ميناء الوصول' } },
      { value: 'DDP', label: { en: 'DDP delivered', ar: 'DDP تسليم واصل' } },
    ],
  },

  /* ── Logistics ── */
  {
    id: 'recurring_skus', for: 'moq', kind: 'tags', required: false,
    label: { en: 'Lines you reorder regularly', ar: 'الأصناف التي تُعيدون طلبها بانتظام' },
    placeholder: { horeca: { en: 'CHV70, PWD22, TRF', ar: 'CHV70، PWD22، TRF' }, export: { en: 'PLT-ASSORTED, BULK-COCOA', ar: 'PLT-ASSORTED، BULK-COCOA' } },
  },
  {
    id: 'repacks_locally', for: 'carton', kind: 'select', required: false,
    label: { en: 'Repacked locally before resale', ar: 'يُعاد التعبئة محليًا قبل البيع' },
    options: yesNo({ en: 'Yes — under our own licence', ar: 'نعم — تحت رخصتنا' }, { en: 'No — sold as received', ar: 'لا — يُباع كما يُستلم' }),
  },
  {
    id: 'handling_limit', for: 'carton_dims', kind: 'text', required: false,
    label: { en: 'Warehouse handling limits', ar: 'قيود المناولة في المستودع' },
    placeholder: { en: 'Forklift only · no ramp', ar: 'رافعة شوكية فقط · بلا منحدر' },
  },
  {
    id: 'pallet_standard', for: 'pallet', kind: 'select', required: true,
    label: { en: 'Pallet standard you accept', ar: 'مقاس الطبلية المقبول لديكم' },
    options: [
      { value: 'iso', label: { en: 'ISO 1,200 × 1,000 mm', ar: 'أيزو ١٬٢٠٠ × ١٬٠٠٠ مم' } },
      { value: 'euro', label: { en: 'EUR 1,200 × 800 mm', ar: 'يورو ١٬٢٠٠ × ٨٠٠ مم' } },
      { value: 'either', label: { en: 'Either', ar: 'كلاهما' } },
    ],
  },
  {
    id: 'port_of_entry', for: 'container', kind: 'text', required: true, only: 'export',
    label: { en: 'Port of entry', ar: 'ميناء الوصول' },
    placeholder: { en: 'Jebel Ali · Hamburg', ar: 'جبل علي · هامبورغ' },
  },
  {
    id: 'collection_site', for: 'container', kind: 'text', required: true, only: 'horeca',
    label: { en: 'Where the collected order is stored', ar: 'أين يُخزَّن الطلب بعد الاستلام' },
    placeholder: { en: 'Central warehouse, Riyadh', ar: 'المستودع المركزي، الرياض' },
  },
  {
    id: 'min_remaining_life', for: 'shelf_life', kind: 'number', required: true,
    label: { en: 'Minimum life remaining on receipt', ar: 'أقل عمر متبقٍّ مقبول عند الاستلام' },
    unit: { en: 'months', ar: 'شهر' },
  },
  {
    id: 'temp_range', for: 'storage', kind: 'select', required: true,
    label: { en: 'Range your store holds', ar: 'النطاق الحراري الذي يحفظه مستودعكم' },
    options: [
      { value: '16_18', label: { en: '16–18 °C — to spec', ar: '١٦–١٨°م — مطابق' } },
      { value: '18_22', label: { en: '18–22 °C', ar: '١٨–٢٢°م' } },
      { value: 'ambient', label: { en: 'Ambient — no control', ar: 'حرارة الجو — بلا تحكّم' } },
    ],
  },
  {
    id: 'cold_capacity', for: 'storage', kind: 'number', required: true,
    label: { en: 'Temperature-controlled capacity', ar: 'السعة المبرّدة المتحكَّم بها' },
    unit: { horeca: { en: 'cartons', ar: 'كرتون' }, export: { en: 'pallets', ar: 'طبلية' } },
  },
  {
    id: 'order_notice', for: 'production_lead', kind: 'number', required: false,
    label: { en: 'Notice you normally give before an order', ar: 'المهلة التي تمنحونها عادةً قبل الطلب' },
    unit: { en: 'working days', ar: 'يوم عمل' },
  },
  {
    id: 'customs_broker', for: 'export_lead', kind: 'text', required: true, only: 'export',
    label: { en: 'Customs broker', ar: 'المخلّص الجمركي' },
  },
  {
    id: 'receiving_contact', for: 'export_lead', kind: 'text', required: true, only: 'horeca',
    label: { en: 'Collection contact & hours', ar: 'جهة الاستلام وساعاته' },
    placeholder: { en: 'Name · 7:00 AM – 3:00 PM', ar: 'الاسم · ٧:٠٠ ص – ٣:٠٠ م' },
  },
  {
    id: 'label_language', for: 'origin', kind: 'text', required: true, only: 'export',
    label: { en: 'Mandatory label languages', ar: 'لغات الملصق الإلزامية' },
    placeholder: { en: 'Arabic, English, German', ar: 'العربية، الإنجليزية، الألمانية' },
  },
  {
    id: 'import_duty', for: 'hs', kind: 'number', required: false, only: 'export',
    label: { en: 'Import duty at destination', ar: 'الرسوم الجمركية في بلد الوصول' },
    unit: { en: '%', ar: '٪' },
  },
  {
    id: 'gs1_prefix', for: 'gs1', kind: 'text', required: false,
    label: { en: 'Your own GS1 company prefix', ar: 'بادئة GS1 الخاصة بمنشأتكم' },
  },
  {
    id: 'import_licence', for: 'export_docs', kind: 'text', required: true, only: 'export',
    label: { en: 'Food import licence no.', ar: 'رقم رخصة استيراد الأغذية' },
  },
  {
    id: 'food_authority_reg', for: 'export_docs', kind: 'text', required: true, only: 'export',
    label: { en: 'Destination food-authority registration', ar: 'تسجيل الجهة الغذائية في بلد الوصول' },
    placeholder: { en: 'Authority · registration no.', ar: 'الجهة · رقم التسجيل' },
  },
  {
    id: 'halal_required', for: 'export_docs', kind: 'select', required: true, only: 'export',
    label: { en: 'Halal certificate required at destination', ar: 'شهادة الحلال مطلوبة في بلد الوصول' },
    options: yesNo({ en: 'Required', ar: 'مطلوبة' }, { en: 'Not required', ar: 'غير مطلوبة' }),
  },
  {
    id: 'doc_recipient', for: 'export_docs', kind: 'text', required: true, only: 'horeca',
    label: { en: 'Who receives the invoice and batch sheet', ar: 'من يستلم الفاتورة وورقة الدفعة' },
  },

  /* ── Marketing ── */
  {
    id: 'priority_seasons', for: 'calendar', kind: 'tags', required: false,
    label: { en: 'Seasons you prioritise', ar: 'المواسم ذات الأولوية لديكم' },
    placeholder: { en: 'Ramadan, National Day, year-end', ar: 'رمضان، اليوم الوطني، نهاية العام' },
  },
  {
    id: 'launch_date', for: 'launch_kit', kind: 'text', required: false,
    label: { en: 'Target launch date', ar: 'تاريخ الإطلاق المستهدف' },
    placeholder: { en: 'Q4 2026', ar: 'الربع الرابع ٢٠٢٦' },
  },
  {
    id: 'posm_needed', for: 'posm', kind: 'tags', required: false,
    label: { en: 'POSM you need', ar: 'مواد نقاط البيع المطلوبة' },
    placeholder: { en: 'Counter units, tasting trays', ar: 'وحدات كاونتر، صواني تذوّق' },
  },
  {
    id: 'asset_languages', for: 'assets', kind: 'text', required: false,
    label: { en: 'Languages you need assets in', ar: 'لغات الأصول المطلوبة' },
  },
  {
    id: 'social_handles', for: 'social', kind: 'text', required: false,
    label: { en: 'Accounts that will carry the brand', ar: 'الحسابات التي ستحمل العلامة' },
  },
  {
    id: 'sampling_volume', for: 'sampling', kind: 'number', required: false,
    label: { en: 'Sampling volume expected a year', ar: 'كمية العيّنات المتوقّعة سنويًا' },
    unit: { horeca: { en: 'cartons', ar: 'كرتون' }, export: { en: 'kg', ar: 'كجم' } },
  },
  {
    id: 'exhibitions', for: 'exhibitions', kind: 'tags', required: false,
    label: { en: 'Exhibitions you attend', ar: 'المعارض التي تشاركون فيها' },
    placeholder: { en: 'Gulfood, ISM', ar: 'جلفود، ISM' },
  },
  {
    id: 'sales_team', for: 'training', kind: 'number', required: true,
    label: { en: 'Sales team size', ar: 'حجم فريق المبيعات' },
  },
  {
    id: 'trainees', for: 'training', kind: 'number', required: false,
    label: { en: 'Staff nominated for training', ar: 'الموظفون المرشّحون للتدريب' },
  },

  /* ── Merchandising ── */
  {
    id: 'doors', for: 'planograms', kind: 'number', required: true,
    label: {
      horeca: { en: 'Outlets served', ar: 'المنافذ المخدومة' },
      export: { en: 'Retail doors covered', ar: 'منافذ التجزئة المغطّاة' },
    },
  },
  {
    id: 'display_units', for: 'premium_display', kind: 'number', required: false,
    label: { en: 'Display units you want built', ar: 'وحدات العرض المطلوب تنفيذها' },
  },
  {
    id: 'merchandisers', for: 'premium_display', kind: 'number', required: false,
    label: { en: 'Merchandisers on the ground', ar: 'مروّجون ميدانيون' },
  },
  {
    id: 'travel_doors', for: 'duty_free', kind: 'number', required: false, only: 'export',
    label: { en: 'Travel-retail doors', ar: 'منافذ التجزئة السفرية' },
  },
  {
    id: 'lobby_retail', for: 'duty_free', kind: 'select', required: false, only: 'horeca',
    label: { en: 'Lobby or lounge retail corner', ar: 'ركن بيع في اللوبي أو الصالة' },
    options: yesNo({ en: 'Yes', ar: 'نعم' }, { en: 'Not yet', ar: 'ليس بعد' }),
  },
  {
    id: 'gift_counter', for: 'gift_display', kind: 'select', required: false,
    label: { en: 'Made-to-order gift counter', ar: 'ركن إهداء بالتجميع حسب الطلب' },
    options: yesNo({ en: 'Yes — staffed', ar: 'نعم — بموظف مخصّص' }, { en: 'Not yet', ar: 'ليس بعد' }),
  },
  {
    id: 'coffee_partner', for: 'coffee_pairing', kind: 'text', required: false,
    label: { en: 'Coffee partner or in-house roast', ar: 'شريك القهوة أو التحميص الداخلي' },
  },
  {
    id: 'adjacent_categories', for: 'cross_merch', kind: 'tags', required: false,
    label: { en: 'Categories placed next to the range', ar: 'الفئات المجاورة للتشكيلة' },
    placeholder: { en: 'Premium dates, Arabic coffee', ar: 'تمور فاخرة، قهوة عربية' },
  },
]

/** The questions this channel is actually asked. */
export function profileFields(channel: PackChannel): ProfileField[] {
  return partnerFields.filter((f) => !f.only || f.only === channel)
}

/** The answers hanging off one pack term, for this channel. */
export function fieldsForItem(itemKey: string, channel: PackChannel): ProfileField[] {
  return partnerFields.filter((f) => f.for === itemKey && (!f.only || f.only === channel))
}

export type ProfileValues = Record<string, string>

export interface Completeness {
  filled: number
  total: number
  pct: number
  /** Required answers still missing — the list that blocks submission. */
  missing: ProfileField[]
}

const isFilled = (v: string | undefined) => Boolean(v && v.trim())

/** How complete this file is, and precisely what is still owed. */
export function completeness(values: ProfileValues, channel: PackChannel): Completeness {
  const fields = profileFields(channel)
  const filled = fields.filter((f) => isFilled(values[f.id])).length
  const missing = fields.filter((f) => f.required && !isFilled(values[f.id]))
  return { filled, total: fields.length, pct: Math.round((filled / fields.length) * 100), missing }
}

/** Completion of one pack section — drives the per-card counter. */
export function sectionCompleteness(sectionId: string, values: ProfileValues, channel: PackChannel) {
  const section = distributorPack.find((s) => s.id === sectionId)
  const keys = new Set(section?.items.map((i) => i.key) ?? [])
  const fields = profileFields(channel).filter((f) => keys.has(f.for))
  return { filled: fields.filter((f) => isFilled(values[f.id])).length, total: fields.length }
}

/** The label to print for a stored value — a select shows its option, not its key. */
export function displayValue(field: ProfileField, value: string | undefined, channel: PackChannel, pick: (b: Bilingual) => string): string | null {
  if (!isFilled(value)) return null
  const v = (value as string).trim()
  if (field.kind === 'select') {
    const opt = field.options?.find((o) => o.value === v)
    return opt ? pick(opt.label) : v
  }
  if (field.kind === 'number') {
    const n = Number(v)
    const shown = Number.isFinite(n) ? n.toLocaleString('en-US') : v
    return field.unit ? `${shown} ${pick(packValue(field.unit, channel))}` : shown
  }
  return v
}

/* ── Seeded files ──
 * What each account has already declared. Both are deliberately short of complete:
 * a file that opens at 100% never shows what it is for. */
export const distributorProfileSeed: Record<PackChannel, ProfileValues> = {
  horeca: {
    resale_margin: '',
    resale_channels: 'Hotels, Restaurants, Banqueting',
    monthly_value: '60000',
    markets: 'Riyadh, Jeddah, Dammam, Khobar',
    annual_commitment: '720000',
    payment_method: 'transfer',
    security: 'bank_guarantee',
    incoterm_pref: 'EXW',
    recurring_skus: 'CHV70, CHM45, PWD22, TRF',
    repacks_locally: 'no',
    handling_limit: '',
    pallet_standard: 'iso',
    collection_site: 'Central warehouse, Riyadh',
    min_remaining_life: '8',
    temp_range: '16_18',
    cold_capacity: '1800',
    order_notice: '14',
    receiving_contact: '',
    doc_recipient: 'finance@najd-hg.sa',
    gs1_prefix: '',
    priority_seasons: 'Ramadan, National Day',
    launch_date: '',
    posm_needed: 'Tasting trays, Counter units',
    asset_languages: '',
    social_handles: '',
    sampling_volume: '40',
    exhibitions: 'Saudi Food Show',
    sales_team: '',
    trainees: '12',
    doors: '34',
    display_units: '',
    merchandisers: '6',
    lobby_retail: 'yes',
    gift_counter: '',
    coffee_partner: 'In-house roast · Najd Coffee',
    adjacent_categories: 'Premium dates, Arabic coffee',
  },
  export: {
    resale_margin: '25',
    resale_channels: 'Modern trade, Travel retail, Specialty',
    monthly_value: '88000',
    markets: 'United Arab Emirates, Germany, Netherlands',
    annual_commitment: '1050000',
    payment_method: 'lc',
    security: 'lc',
    incoterm_pref: 'CIF',
    recurring_skus: 'PLT-ASSORTED, PLT-GIFTBOX',
    repacks_locally: 'no',
    handling_limit: '',
    pallet_standard: 'euro',
    port_of_entry: 'Jebel Ali · Hamburg',
    min_remaining_life: '9',
    temp_range: '16_18',
    cold_capacity: '640',
    order_notice: '21',
    customs_broker: 'Bahri Logistics',
    label_language: '',
    import_duty: '5',
    gs1_prefix: '',
    import_licence: '',
    food_authority_reg: 'ESMA · UAE-FI-88214',
    halal_required: 'yes',
    priority_seasons: 'Ramadan, Christmas gifting',
    launch_date: 'Q4 2026',
    posm_needed: 'Gondola ends, Multi-pack facings',
    asset_languages: 'English, German, Arabic',
    social_handles: '',
    sampling_volume: '',
    exhibitions: 'Gulfood, ISM Cologne',
    sales_team: '22',
    trainees: '',
    doors: '410',
    display_units: '60',
    merchandisers: '',
    travel_doors: '18',
    gift_counter: 'yes',
    coffee_partner: '',
    adjacent_categories: 'Premium dates, Arabic coffee, Luxury gifting',
  },
}
