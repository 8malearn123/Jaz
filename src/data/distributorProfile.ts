import type { Bilingual } from './types'
import { packValue, type PackChannel, type PackValue } from './distributorPack'

// ── The importer's own file ─────────────────────────────────────────────────
// The distributor pack is what Jaz declares to a partner. This is the other half:
// what the partner declares back. Every field here answers a term in the pack, so
// a clause stops being prose and becomes a figure that can be checked.
//
//   pack: "exclusive by market"        → profile: which markets
//   pack: "annual target"              → profile: the number this partner committed to
//   pack: "store at 16–18 °C"          → profile: the range their warehouse holds
//   pack: "SFDA + halal travel with it" → profile: their import licence and registrations
//
// Which questions are asked depends on the channel: an operator inside the Kingdom
// is not asked for a port of entry, and an exporter is not asked for receiving hours.

export type ProfileFieldKind = 'text' | 'number' | 'select' | 'tags'

export interface ProfileField {
  id: string
  label: PackValue
  /** The pack term this field answers — shown under the value so the pairing is visible. */
  mirrors: PackValue
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

export type ProfileGroupId = 'commercial' | 'legal' | 'logistics' | 'market'

export interface ProfileGroup {
  id: ProfileGroupId
  label: Bilingual
  blurb: Bilingual
  fields: ProfileField[]
}

const yesNo = (yes: Bilingual, no: Bilingual) => [
  { value: 'yes', label: yes },
  { value: 'no', label: no },
]

/* ═══════════ 1 · Commercial commitment ═══════════ */
const commercial: ProfileField[] = [
  {
    id: 'markets', kind: 'tags', required: true,
    label: {
      horeca: { en: 'Cities and regions served', ar: 'المدن والمناطق المخدومة' },
      export: { en: 'Markets covered', ar: 'الأسواق المغطّاة' },
    },
    mirrors: { en: 'Territory exclusivity model', ar: 'نموذج حصرية الإقليم' },
    placeholder: { en: 'Riyadh, Jeddah, Dammam', ar: 'الرياض، جدة، الدمام' },
  },
  {
    id: 'annual_commitment', kind: 'number', required: true,
    label: { en: 'Annual purchase commitment', ar: 'الالتزام الشرائي السنوي' },
    mirrors: { en: 'Annual sales targets', ar: 'أهداف المبيعات السنوية' },
    unit: { horeca: { en: 'SAR', ar: '﷼' }, export: { en: 'USD', ar: 'دولار' } },
  },
  {
    id: 'incoterm_pref', kind: 'select', required: true,
    label: { en: 'Preferred incoterm', ar: 'شرط التسليم المفضّل' },
    mirrors: { en: 'Incoterms', ar: 'شروط التسليم' },
    options: [
      { value: 'EXW', label: { en: 'EXW — collect at Jazan', ar: 'EXW — الاستلام من جيزان' } },
      { value: 'FOB', label: { en: 'FOB Jeddah', ar: 'FOB جدة' } },
      { value: 'CIF', label: { en: 'CIF destination port', ar: 'CIF ميناء الوصول' } },
      { value: 'DDP', label: { en: 'DDP delivered', ar: 'DDP تسليم واصل' } },
    ],
  },
  {
    id: 'resale_channels', kind: 'tags', required: true,
    label: { en: 'Resale channels', ar: 'قنوات إعادة البيع' },
    mirrors: { en: 'MSRP guidance', ar: 'إرشادات السعر الاستهلاكي' },
    placeholder: { en: 'Modern trade, HORECA, travel retail', ar: 'التجزئة الحديثة، الضيافة، التجزئة السفرية' },
  },
  {
    id: 'sub_distributors', kind: 'number', required: false, only: 'export',
    label: { en: 'Sub-distributors in the network', ar: 'الموزّعون الفرعيون في الشبكة' },
    mirrors: { en: 'Distributor margin structure', ar: 'هيكل هامش الموزّع' },
  },
  {
    id: 'payment_method', kind: 'select', required: true,
    label: { en: 'Settlement method', ar: 'طريقة السداد' },
    mirrors: { en: 'Payment terms · Credit policy', ar: 'شروط السداد · سياسة الائتمان' },
    options: [
      { value: 'transfer', label: { en: 'Bank transfer', ar: 'تحويل بنكي' } },
      { value: 'lc', label: { en: 'Documentary credit (L/C)', ar: 'اعتماد مستندي' } },
      { value: 'cheque', label: { en: 'Cheque', ar: 'شيك' } },
    ],
  },
]

/* ═══════════ 2 · Legal & licensing ═══════════ */
const legal: ProfileField[] = [
  {
    id: 'cr', kind: 'text', required: true,
    label: { en: 'Commercial registration', ar: 'السجل التجاري' },
    mirrors: { en: 'Account verification', ar: 'توثيق الحساب' },
  },
  {
    id: 'vat', kind: 'text', required: true,
    label: { en: 'Tax registration number', ar: 'الرقم الضريبي' },
    mirrors: { en: 'Payment terms', ar: 'شروط السداد' },
  },
  {
    id: 'signatory', kind: 'text', required: true,
    label: { en: 'Authorized signatory', ar: 'المفوّض بالتوقيع' },
    mirrors: { en: 'Contract signing', ar: 'توقيع العقود' },
  },
  {
    id: 'import_licence', kind: 'text', required: true, only: 'export',
    label: { en: 'Food import licence no.', ar: 'رقم رخصة استيراد الأغذية' },
    mirrors: { en: 'Export documentation', ar: 'مستندات التصدير' },
  },
  {
    id: 'food_authority_reg', kind: 'text', required: true, only: 'export',
    label: { en: 'Destination food-authority registration', ar: 'تسجيل الجهة الغذائية في بلد الوصول' },
    mirrors: { en: 'Export documentation', ar: 'مستندات التصدير' },
    placeholder: { en: 'Authority · registration no.', ar: 'الجهة · رقم التسجيل' },
  },
  {
    id: 'halal_required', kind: 'select', required: true, only: 'export',
    label: { en: 'Halal certificate required at destination', ar: 'شهادة الحلال مطلوبة في بلد الوصول' },
    mirrors: { en: 'Export documentation', ar: 'مستندات التصدير' },
    options: yesNo({ en: 'Required', ar: 'مطلوبة' }, { en: 'Not required', ar: 'غير مطلوبة' }),
  },
  {
    id: 'label_language', kind: 'text', required: true, only: 'export',
    label: { en: 'Mandatory label languages', ar: 'لغات الملصق الإلزامية' },
    mirrors: { en: 'Barcode (GS1) · Country of origin', ar: 'الباركود (GS1) · بلد المنشأ' },
    placeholder: { en: 'Arabic, English, German', ar: 'العربية، الإنجليزية، الألمانية' },
  },
]

/* ═══════════ 3 · Logistics capability ═══════════ */
const logistics: ProfileField[] = [
  {
    id: 'warehouses', kind: 'number', required: true,
    label: { en: 'Warehouses', ar: 'عدد المستودعات' },
    mirrors: { en: 'Pallet configuration', ar: 'تكوين الطبلية' },
  },
  {
    id: 'cold_capacity', kind: 'number', required: true,
    label: { en: 'Temperature-controlled capacity', ar: 'السعة المبرّدة المتحكَّم بها' },
    mirrors: { en: 'Storage temperature', ar: 'حرارة التخزين' },
    unit: { horeca: { en: 'cartons', ar: 'كرتون' }, export: { en: 'pallets', ar: 'طبلية' } },
  },
  {
    id: 'temp_range', kind: 'select', required: true,
    label: { en: 'Range the store holds', ar: 'النطاق الحراري المتاح' },
    mirrors: { en: 'Storage temperature', ar: 'حرارة التخزين' },
    options: [
      { value: '16_18', label: { en: '16–18 °C — to spec', ar: '١٦–١٨°م — مطابق' } },
      { value: '18_22', label: { en: '18–22 °C', ar: '١٨–٢٢°م' } },
      { value: 'ambient', label: { en: 'Ambient — no control', ar: 'حرارة الجو — بلا تحكّم' } },
    ],
  },
  {
    id: 'fleet', kind: 'select', required: true,
    label: { en: 'Onward transport', ar: 'النقل اللاحق' },
    mirrors: { en: 'Incoterms', ar: 'شروط التسليم' },
    options: [
      { value: 'own', label: { en: 'Own refrigerated fleet', ar: 'أسطول مبرّد مملوك' } },
      { value: '3pl', label: { en: 'Third-party logistics', ar: 'مزوّد لوجستي خارجي' } },
      { value: 'mixed', label: { en: 'Mixed', ar: 'مختلط' } },
    ],
  },
  {
    id: 'customs_broker', kind: 'text', required: true, only: 'export',
    label: { en: 'Customs broker', ar: 'المخلّص الجمركي' },
    mirrors: { en: 'Export documentation', ar: 'مستندات التصدير' },
  },
  {
    id: 'port_of_entry', kind: 'text', required: true, only: 'export',
    label: { en: 'Port of entry', ar: 'ميناء الوصول' },
    mirrors: { en: "Container loading (20'/40')", ar: 'تحميل الحاوية (٢٠/٤٠ قدم)' },
  },
  {
    id: 'receiving_hours', kind: 'text', required: true, only: 'horeca',
    label: { en: 'Collection contact & hours', ar: 'جهة الاستلام وساعاته' },
    mirrors: { en: 'Export lead time', ar: 'مدة التصدير' },
    placeholder: { en: 'Name · 7:00 AM – 3:00 PM', ar: 'الاسم · ٧:٠٠ ص – ٣:٠٠ م' },
  },
  {
    id: 'gs1_prefix', kind: 'text', required: false,
    label: { en: 'Own GS1 company prefix', ar: 'بادئة GS1 الخاصة بالمنشأة' },
    mirrors: { en: 'Barcode (GS1)', ar: 'الباركود (GS1)' },
  },
]

/* ═══════════ 4 · Market & merchandising capability ═══════════ */
const market: ProfileField[] = [
  {
    id: 'doors', kind: 'number', required: true,
    label: {
      horeca: { en: 'Outlets served', ar: 'المنافذ المخدومة' },
      export: { en: 'Retail doors covered', ar: 'منافذ التجزئة المغطّاة' },
    },
    mirrors: { en: 'Shelf planograms', ar: 'مخططات الرفوف' },
  },
  {
    id: 'sales_team', kind: 'number', required: true,
    label: { en: 'Sales team size', ar: 'حجم فريق المبيعات' },
    mirrors: { en: 'Distributor training program', ar: 'برنامج تدريب الموزّعين' },
  },
  {
    id: 'merchandisers', kind: 'number', required: false,
    label: { en: 'Merchandisers on the ground', ar: 'مروّجون ميدانيون' },
    mirrors: { en: 'Premium display concepts', ar: 'مفاهيم العرض الفاخر' },
  },
  {
    id: 'marketing_budget_pct', kind: 'number', required: true,
    label: { en: 'Marketing spend committed', ar: 'الإنفاق التسويقي الملتزم به' },
    mirrors: { en: 'Annual marketing calendar', ar: 'التقويم التسويقي السنوي' },
    unit: { en: '% of purchases', ar: '٪ من المشتريات' },
  },
  {
    id: 'exhibitions', kind: 'tags', required: false,
    label: { en: 'Exhibitions attended', ar: 'المعارض المشارَك فيها' },
    mirrors: { en: 'Trade exhibition participation', ar: 'المشاركة في المعارض التجارية' },
    placeholder: { en: 'Gulfood, ISM', ar: 'جلفود، ISM' },
  },
  {
    id: 'trained_staff', kind: 'number', required: false,
    label: { en: 'Staff trained by JAZ', ar: 'الموظفون المدرَّبون من جاز' },
    mirrors: { en: 'Distributor training program', ar: 'برنامج تدريب الموزّعين' },
  },
]

export const distributorProfileGroups: ProfileGroup[] = [
  {
    id: 'commercial',
    label: { en: 'Commercial commitment', ar: 'الالتزام التجاري' },
    blurb: { en: 'What you sell, where, and how much of it you commit to.', ar: 'ماذا تبيعون، وأين، وبأي حجم تلتزمون.' },
    fields: commercial,
  },
  {
    id: 'legal',
    label: { en: 'Legal & licensing', ar: 'القانوني والتراخيص' },
    blurb: { en: 'The registrations that let the goods clear and be sold.', ar: 'التسجيلات التي تُخلِّص البضاعة وتُجيز بيعها.' },
    fields: legal,
  },
  {
    id: 'logistics',
    label: { en: 'Logistics capability', ar: 'القدرات اللوجستية' },
    blurb: { en: 'Whether you can hold the chocolate the way the pack says it must be held.', ar: 'هل تستطيعون حفظ الشوكولاتة بالشروط التي تنصّ عليها الحقيبة.' },
    fields: logistics,
  },
  {
    id: 'market',
    label: { en: 'Market & merchandising', ar: 'السوق والعرض' },
    blurb: { en: 'The reach and the people behind the shelf.', ar: 'الانتشار والفريق خلف الرفّ.' },
    fields: market,
  },
]

/** The questions this channel is actually asked. */
export function profileFields(channel: PackChannel): ProfileField[] {
  return distributorProfileGroups.flatMap((g) => g.fields).filter((f) => !f.only || f.only === channel)
}

/** The fields of one group, for the channel being asked. */
export function groupFields(group: ProfileGroup, channel: PackChannel): ProfileField[] {
  return group.fields.filter((f) => !f.only || f.only === channel)
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

/** Completion of a single group — drives the per-card counter. */
export function groupCompleteness(group: ProfileGroup, values: ProfileValues, channel: PackChannel) {
  const fields = groupFields(group, channel)
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
 * an importer file that starts at 100% would never show what it is for. */
export const distributorProfileSeed: Record<PackChannel, ProfileValues> = {
  horeca: {
    markets: 'Riyadh, Jeddah, Dammam, Khobar',
    annual_commitment: '720000',
    incoterm_pref: 'EXW',
    resale_channels: 'Hotels, Restaurants, Banqueting',
    payment_method: 'transfer',
    cr: '1010256744',
    vat: '300012345600003',
    signatory: 'Khalid Al-Otaibi',
    warehouses: '2',
    cold_capacity: '1800',
    temp_range: '16_18',
    fleet: 'own',
    receiving_hours: '',
    gs1_prefix: '',
    doors: '34',
    sales_team: '',
    merchandisers: '6',
    marketing_budget_pct: '',
    exhibitions: 'Saudi Food Show',
    trained_staff: '12',
  },
  export: {
    markets: 'United Arab Emirates, Germany, Netherlands',
    annual_commitment: '1050000',
    incoterm_pref: 'CIF',
    resale_channels: 'Modern trade, Travel retail, Specialty',
    sub_distributors: '4',
    payment_method: 'lc',
    cr: '1010 554 921',
    vat: '3115 0092 8800 003',
    signatory: 'Sofia Bauer',
    import_licence: '',
    food_authority_reg: 'ESMA · UAE-FI-88214',
    halal_required: 'yes',
    label_language: '',
    warehouses: '3',
    cold_capacity: '640',
    temp_range: '16_18',
    fleet: '3pl',
    customs_broker: 'Bahri Logistics',
    port_of_entry: 'Jebel Ali · Hamburg',
    gs1_prefix: '',
    doors: '410',
    sales_team: '22',
    merchandisers: '',
    marketing_budget_pct: '3',
    exhibitions: 'Gulfood, ISM Cologne',
    trained_staff: '',
  },
}
