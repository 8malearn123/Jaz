import type { Bilingual } from './types'
import { plantSite } from './fulfilment'
import { MOQ_MINOR, wholesaleProducts } from './wholesale'
import { megaCatalog } from './mega'

// ── Distributor information pack ────────────────────────────────────────────
// The terms a buyer needs before they can plan a season: what they earn, what a
// pallet weighs, how long the goods keep, which papers travel with them, and what
// marketing and shelf support comes with the account.
//
// The same pack serves both business channels, because both sides ask the same
// questions and only the answers differ:
//   · horeca — an operator inside the Kingdom, billed in riyals, collecting at the plant
//   · export — a market distributor abroad, billed in dollars, loading containers
// Anything that is genuinely the same on both sides (shelf life, HS codes, the GS1
// scheme) is written once; anything that differs is written per channel.

export type PackChannel = 'horeca' | 'export'

/** A value that reads the same on both sides, or one written per channel. */
export type PackValue = Bilingual | Record<PackChannel, Bilingual>

/** The line to show for this channel — a shared value is used as-is. */
export function packValue(value: PackValue, channel: PackChannel): Bilingual {
  return 'en' in value ? (value as Bilingual) : (value as Record<PackChannel, Bilingual>)[channel]
}

export interface PackItem {
  key: string
  label: Bilingual
  value: PackValue
  /** The sentence under the value — the caveat, the mechanic, the exception. */
  detail?: PackValue
}

export type PackSectionId = 'commercial' | 'logistics' | 'marketing' | 'merchandising'

export interface PackSection {
  id: PackSectionId
  label: Bilingual
  blurb: Bilingual
  items: PackItem[]
}

/** Which revision of the pack these terms belong to — printed on the PDF. */
export const packRevision: Bilingual = {
  en: 'Revision 2026.1 · issued 1 July 2026',
  ar: 'الإصدار ٢٠٢٦٫١ · صدر في ١ يوليو ٢٠٢٦',
}

// Pallet and container standards. Declared before the sections that quote them, so
// the prose and the loading table can never state two different numbers.
export const PALLET = { footprintMm: '1,200 × 1,000', maxHeightM: 1.45, maxGrossKg: 700 }
export const CONTAINER = { twentyFtPallets: 10, fortyFtPallets: 20, setPointC: 16 }

const collectionTerms: Bilingual = {
  en: `${plantSite.incoterm} — collected at ${plantSite.label.en}. FOB Jeddah, CIF and DDP quoted on request.`,
  ar: `${plantSite.incoterm} — الاستلام من ${plantSite.label.ar}. FOB جدة وCIF وDDP تُسعَّر عند الطلب.`,
}

/* ═══════════════ 1 · Commercial ═══════════════ */
const commercial: PackItem[] = [
  {
    key: 'margin',
    label: { en: 'Distributor margin structure', ar: 'هيكل هامش الموزّع' },
    value: {
      horeca: { en: 'Trade price = MSRP − 32% · Gold tier +3 pts · Elite +5 pts', ar: 'سعر التجارة = السعر الاستهلاكي − ٣٢٪ · الفئة الذهبية +٣ نقاط · النخبة +٥ نقاط' },
      export: { en: 'Distributor = MSRP − 45% · sub-distributor 15 pts · retailer 25 pts', ar: 'الموزّع = السعر الاستهلاكي − ٤٥٪ · الموزّع الفرعي ١٥ نقطة · التجزئة ٢٥ نقطة' },
    },
    detail: {
      horeca: { en: 'The tier discount is applied to the contract price list at order time and re-read at each annual review.', ar: 'يُطبَّق خصم الفئة على قائمة الأسعار التعاقدية عند الطلب، ويُعاد احتسابه في كل مراجعة سنوية.' },
      export: { en: 'The downstream points are indicative — the distributor sets its own resale price inside the MSRP corridor.', ar: 'النقاط اللاحقة إرشادية — يحدّد الموزّع سعر إعادة البيع داخل نطاق السعر الاستهلاكي.' },
    },
  },
  {
    key: 'msrp',
    label: { en: 'MSRP guidance', ar: 'إرشادات السعر الاستهلاكي' },
    value: {
      horeca: { en: 'Serving-price guidance per SKU, published with the price list', ar: 'إرشاد سعر التقديم لكل صنف، يُنشر مع قائمة الأسعار' },
      export: { en: 'MSRP set per market · ±10% corridor before written approval', ar: 'سعر استهلاكي لكل سوق · نطاق ±١٠٪ قبل الموافقة الخطية' },
    },
    detail: {
      horeca: { en: 'Advisory only. What an outlet charges on its own menu is its decision.', ar: 'إرشادي فقط — سعر القائمة داخل المنشأة قرارها وحدها.' },
      export: { en: 'Pricing outside the corridor needs written approval, so one market does not undercut the next.', ar: 'التسعير خارج النطاق يحتاج موافقة خطية حتى لا يُضعف سوقٌ سوقًا آخر.' },
    },
  },
  {
    key: 'pricing_policy',
    label: { en: 'Wholesale pricing policy', ar: 'سياسة أسعار الجملة' },
    value: {
      horeca: { en: 'Contract price list fixed for the term · break price applies from the break quantity', ar: 'قائمة أسعار تعاقدية ثابتة طوال المدة · يسري سعر الكمية من حدّ الكمية المعلن' },
      export: { en: 'Fixed per-pallet list price — no volume breaks', ar: 'سعر ثابت للطبلية حسب القائمة — بلا خصومات كمّية' },
    },
    detail: {
      horeca: { en: 'Every line and its break quantity are published in the catalogue — nothing is negotiated per order.', ar: 'كل بند وحدّ كميته منشوران في الكتالوج — لا تفاوض على مستوى الطلب.' },
      export: { en: 'A line is its list price times its quantity, reviewed once a year with the territory.', ar: 'قيمة البند = سعر القائمة × الكمية، وتُراجَع سنويًا مع الإقليم.' },
    },
  },
  {
    key: 'territory',
    label: { en: 'Territory exclusivity model', ar: 'نموذج حصرية الإقليم' },
    value: {
      horeca: { en: 'Non-exclusive · priced per registered outlet across the group', ar: 'غير حصري · التسعير لكل منفذ مسجّل ضمن المجموعة' },
      export: { en: 'Exclusive by market for the annual term', ar: 'حصرية بالسوق طوال المدة السنوية' },
    },
    detail: {
      horeca: { en: 'New branches are added to the same account and inherit its price list and credit line.', ar: 'تُضاف الفروع الجديدة إلى الحساب نفسه وترث قائمة أسعاره وحدّه الائتماني.' },
      export: { en: 'Exclusivity lapses to non-exclusive below 80% of the annual target, at the next review.', ar: 'تسقط الحصرية إلى غير حصرية دون ٨٠٪ من الهدف السنوي، عند المراجعة التالية.' },
    },
  },
  {
    key: 'targets',
    label: { en: 'Annual sales targets', ar: 'أهداف المبيعات السنوية' },
    value: {
      horeca: { en: 'SAR 720,000 a year · reviewed each quarter', ar: '٧٢٠٬٠٠٠ ﷼ سنويًا · تُراجَع كل ربع' },
      export: { en: 'USD 1,050,000 a year · reviewed each quarter', ar: '١٬٠٥٠٬٠٠٠ دولار سنويًا · تُراجَع كل ربع' },
    },
    detail: { en: 'The target is set on invoiced value, not on orders placed — cancelled lines do not count towards it.', ar: 'يُحتسب الهدف على القيمة المفوترة لا على الطلبات المُقدَّمة — البنود الملغاة لا تُحتسب.' },
  },
  {
    key: 'payment_terms',
    label: { en: 'Payment terms', ar: 'شروط السداد' },
    value: {
      horeca: { en: 'Net 30 from invoice date · settled in Saudi riyals', ar: 'صافي ٣٠ من تاريخ الفاتورة · السداد بالريال السعودي' },
      export: { en: 'Net 60 from the bill-of-lading date · settled in US dollars', ar: 'صافي ٦٠ من تاريخ بوليصة الشحن · السداد بالدولار الأمريكي' },
    },
    detail: {
      horeca: { en: 'A ZATCA tax invoice is issued at handover and the statement is closed monthly.', ar: 'تُصدر فاتورة ضريبية معتمدة عند التسليم، ويُقفل كشف الحساب شهريًا.' },
      export: { en: 'The dollar figure is fixed at the pegged rate, so a limit set today is worth the same riyals tomorrow.', ar: 'يُثبَّت المبلغ بالدولار على سعر الربط، فيبقى الحدّ المتّفق عليه بالقيمة ذاتها بالريال.' },
    },
  },
  {
    key: 'credit_policy',
    label: { en: 'Credit policy', ar: 'سياسة الائتمان' },
    value: { en: 'Revolving limit · every order reserves against the headroom before it is confirmed', ar: 'حدّ متجدّد · كل طلب يحجز من المتاح قبل تأكيده' },
    detail: {
      horeca: { en: 'A cancelled line releases its reservation the same day. The live limit and next review date are in Finance.', ar: 'يُحرَّر حجز البند الملغى في اليوم نفسه. الحدّ الحالي وتاريخ المراجعة القادمة في تبويب المالية.' },
      export: { en: 'First season runs against a documentary credit; the open limit follows two settled cycles. Live figures are in Finance.', ar: 'الموسم الأول باعتماد مستندي، ويُفتح الحدّ بعد دورتَي سداد. الأرقام الحالية في تبويب المالية.' },
    },
  },
  {
    key: 'incoterms',
    label: { en: 'Incoterms', ar: 'شروط التسليم' },
    value: collectionTerms,
    detail: { en: 'Title and risk pass at the gate in Jazan; anything past the gate is quoted as a separate service.', ar: 'تنتقل الملكية والمخاطر عند بوابة جيزان، وما بعدها يُسعَّر كخدمة مستقلة.' },
  },
]

/* ═══════════════ 2 · Logistics ═══════════════ */
const logistics: PackItem[] = [
  {
    key: 'moq',
    label: { en: 'MOQ by SKU', ar: 'الحد الأدنى للطلب لكل صنف' },
    value: {
      horeca: { en: `Per line as published · minimum order value SAR ${(MOQ_MINOR / 100).toLocaleString('en-US')}`, ar: `لكل بند كما هو منشور · الحد الأدنى لقيمة الطلب ${(MOQ_MINOR / 100).toLocaleString('en-US')} ﷼` },
      export: { en: '1–3 pallets per SKU · pallets are not split', ar: '١–٣ طبليات لكل صنف · لا تُجزَّأ الطبلية' },
    },
    detail: { en: 'The per-SKU minimum is in the loading table below and is enforced at order time.', ar: 'الحد الأدنى لكل صنف مذكور في جدول التحميل أدناه ويُطبَّق عند الطلب.' },
  },
  {
    key: 'carton',
    label: { en: 'Carton configuration', ar: 'تكوين الكرتون' },
    value: {
      horeca: { en: 'Inner units per master carton as listed below · food-grade liner, shrink-wrapped', ar: 'الوحدات الداخلية لكل كرتون رئيسي كما في الجدول أدناه · بطانة غذائية وتغليف انكماشي' },
      export: { en: 'Units per pallet as listed below · cartons are not broken at pallet level', ar: 'الوحدات لكل طبلية كما في الجدول أدناه · لا تُفتح الكراتين على مستوى الطبلية' },
    },
  },
  {
    key: 'carton_dims',
    label: { en: 'Master carton dimensions', ar: 'أبعاد الكرتون الرئيسي' },
    value: { en: 'Per SKU in the loading table · ITF-14 printed on two adjacent faces', ar: 'لكل صنف في جدول التحميل · باركود ITF-14 مطبوع على وجهين متجاورين' },
    detail: { en: 'Double-wall B/C flute, 32 ECT — rated for six-high stacking in the warehouse.', ar: 'كرتون مموّج مزدوج B/C بمقاومة 32 ECT — يتحمّل التستيف بستّ طبقات في المستودع.' },
  },
  {
    key: 'pallet',
    label: { en: 'Pallet configuration', ar: 'تكوين الطبلية' },
    value: { en: `${PALLET.footprintMm} mm block pallet · max ${PALLET.maxHeightM} m loaded · max ${PALLET.maxGrossKg} kg gross`, ar: `طبلية ${PALLET.footprintMm} مم · ارتفاع محمّل أقصى ${PALLET.maxHeightM} م · وزن إجمالي أقصى ${PALLET.maxGrossKg} كجم` },
    detail: { en: 'Stretch-wrapped with corner boards and a top cap; the SSCC label sits on two adjacent sides.', ar: 'تغليف مطّاطي مع زوايا واقية وغطاء علوي، وملصق SSCC على جانبين متجاورين.' },
  },
  {
    key: 'container',
    label: { en: "Container loading (20'/40')", ar: 'تحميل الحاوية (٢٠/٤٠ قدم)' },
    value: { en: `20' reefer = ${CONTAINER.twentyFtPallets} pallets · 40' reefer = ${CONTAINER.fortyFtPallets} pallets · set point +${CONTAINER.setPointC} °C`, ar: `حاوية مبرّدة ٢٠ قدم = ${CONTAINER.twentyFtPallets} طبلية · ٤٠ قدم = ${CONTAINER.fortyFtPallets} طبلية · درجة الضبط +${CONTAINER.setPointC}°م` },
    detail: { en: 'Loaded single-tier, doors sealed with a numbered seal and a data logger placed in the last pallet.', ar: 'تحميل بطبقة واحدة، وختم الأبواب بختم مرقّم مع مسجّل حرارة داخل آخر طبلية.' },
  },
  {
    key: 'shelf_life',
    label: { en: 'Shelf life', ar: 'العمر الافتراضي' },
    value: { en: 'Couverture & drops 12 months · cocoa powder and butter 18 · ready-to-serve 9 — from production date', ar: 'الكوفرتور والحبيبات ١٢ شهرًا · بودرة الكاكاو والزبدة ١٨ · الجاهز للتقديم ٩ — من تاريخ الإنتاج' },
    detail: { en: 'No batch leaves the plant with less than two-thirds of its life remaining.', ar: 'لا تغادر أي دفعة المصنع بأقل من ثلثَي عمرها الافتراضي.' },
  },
  {
    key: 'storage',
    label: { en: 'Storage temperature', ar: 'حرارة التخزين' },
    value: { en: '16–18 °C · relative humidity ≤ 55% · away from strong odours and direct light', ar: '١٦–١٨°م · رطوبة نسبية ≤ ٥٥٪ · بعيدًا عن الروائح النفّاذة والضوء المباشر' },
    detail: { en: 'Bloom from a broken cold chain is not a manufacturing claim — the temperature log is what settles it.', ar: 'التزهّر الناتج عن انقطاع سلسلة التبريد ليس عيبًا تصنيعيًا — وسجل الحرارة هو الفيصل.' },
  },
  {
    key: 'production_lead',
    label: { en: 'Production lead time', ar: 'مدة الإنتاج' },
    value: { en: '10 working days from a confirmed order · 15 for private label or custom packing', ar: '١٠ أيام عمل من تأكيد الطلب · ١٥ يومًا للعلامة الخاصة أو التعبئة المخصّصة' },
  },
  {
    key: 'export_lead',
    label: { en: 'Export lead time', ar: 'مدة التصدير' },
    value: {
      horeca: { en: 'Collection slot opens the working day after release', ar: 'يُفتح موعد الاستلام في يوم العمل التالي للإفراج' },
      export: { en: 'Add 7 working days for documents, cold-chain booking and loading', ar: 'تُضاف ٧ أيام عمل للمستندات وحجز سلسلة التبريد والتحميل' },
    },
  },
  {
    key: 'origin',
    label: { en: 'Country of origin', ar: 'بلد المنشأ' },
    value: { en: `Saudi Arabia — manufactured at ${plantSite.label.en}`, ar: `المملكة العربية السعودية — يُصنَّع في ${plantSite.label.ar}` },
  },
  {
    key: 'hs',
    label: { en: 'HS codes', ar: 'الرموز الجمركية' },
    value: { en: '1806.32 bars · 1806.20 bulk ≥ 2 kg · 1805.00 cocoa powder · 1804.00 cocoa butter', ar: '1806.32 الألواح · 1806.20 السائب ≥ ٢ كجم · 1805.00 بودرة الكاكاو · 1804.00 زبدة الكاكاو' },
    detail: { en: 'The code per line is printed on the commercial invoice — confirm the destination tariff before the first shipment.', ar: 'يُطبع رمز كل بند على الفاتورة التجارية — يُتحقَّق من تعرفة بلد الوصول قبل أول شحنة.' },
  },
  {
    key: 'gs1',
    label: { en: 'Barcode (GS1)', ar: 'الباركود (GS1)' },
    value: { en: 'GS1 Saudi Arabia prefix 628 · EAN-13 per consumer unit · ITF-14 per carton · SSCC per pallet', ar: 'بادئة GS1 السعودية 628 · EAN-13 لوحدة الاستهلاك · ITF-14 للكرتون · SSCC للطبلية' },
  },
  {
    key: 'export_docs',
    label: { en: 'Export documentation', ar: 'مستندات التصدير' },
    value: {
      horeca: { en: 'ZATCA tax invoice, delivery note and a batch/COA sheet issued at every collection', ar: 'فاتورة ضريبية معتمدة وإشعار تسليم وورقة دفعة/تحليل مع كل استلام' },
      export: { en: 'Commercial invoice, packing list, certificate of origin, SFDA health certificate, halal certificate, B/L or AWB, temperature log', ar: 'فاتورة تجارية، قائمة تعبئة، شهادة منشأ، شهادة صحية من الغذاء والدواء، شهادة حلال، بوليصة شحن أو بوليصة جوية، وسجل الحرارة' },
    },
    detail: {
      export: { en: 'Documents are couriered on the loading day and the scanned set is posted to the order the same day.', ar: 'تُرسل المستندات بالبريد السريع يوم التحميل، وتُرفع النسخ الممسوحة على الطلب في اليوم نفسه.' },
      horeca: { en: 'Every document is retrievable from the order months later, not only at handover.', ar: 'كل مستند متاح من الطلب بعد أشهر، لا عند التسليم فقط.' },
    },
  },
]

/* ═══════════════ 3 · Marketing ═══════════════ */
const marketing: PackItem[] = [
  {
    key: 'calendar',
    label: { en: 'Annual marketing calendar', ar: 'التقويم التسويقي السنوي' },
    value: {
      horeca: { en: 'Ramadan, both Eids, Founding Day, National Day and the year-end gifting season', ar: 'رمضان والعيدان ويوم التأسيس واليوم الوطني وموسم إهداء نهاية العام' },
      export: { en: 'The Kingdom calendar plus each market’s own gifting season', ar: 'تقويم المملكة إضافة إلى موسم الإهداء في كل سوق' },
    },
    detail: { en: 'Each window is locked 90 days ahead so production, artwork and stock land together.', ar: 'تُغلق كل نافذة قبل ٩٠ يومًا لتتزامن معها خطط الإنتاج والتصاميم والمخزون.' },
  },
  {
    key: 'launch_kit',
    label: { en: 'Launch kit', ar: 'حقيبة الإطلاق' },
    value: { en: 'Brand book, product one-pagers, photography, sampling protocol and a 90-day launch plan', ar: 'دليل العلامة، وبطاقات المنتجات، والتصوير، وبروتوكول التذوّق، وخطة إطلاق لتسعين يومًا' },
    detail: { en: 'Delivered at contract signature, before the first order ships.', ar: 'تُسلَّم عند توقيع العقد، قبل شحن أول طلب.' },
  },
  {
    key: 'posm',
    label: { en: 'POSM catalogue', ar: 'كتالوج مواد نقاط البيع' },
    value: { en: 'Counter units, shelf talkers, tasting trays, gift-wrap stations and branded totes', ar: 'وحدات الكاونتر، ولافتات الرفوف، وصواني التذوّق، ومحطات التغليف، والأكياس المعلّمة' },
    detail: { en: 'Ordered from the pack and billed at cost; freight follows the same terms as the goods.', ar: 'تُطلب من الحقيبة وتُفوتر بسعر التكلفة، والشحن بالشروط ذاتها المطبَّقة على البضاعة.' },
  },
  {
    key: 'assets',
    label: { en: 'Digital asset library', ar: 'مكتبة الأصول الرقمية' },
    value: { en: 'Packshots, lifestyle photography, video, logos and print-ready artwork in Arabic and English', ar: 'صور المنتجات، والتصوير الحياتي، والفيديو، والشعارات، وملفات جاهزة للطباعة بالعربية والإنجليزية' },
    detail: { en: 'Versioned per season — the previous season stays available so live print runs are never orphaned.', ar: 'بإصدارات موسمية، ويبقى الموسم السابق متاحًا حتى لا تتعطّل مطبوعات قيد التنفيذ.' },
  },
  {
    key: 'social',
    label: { en: 'Social media toolkit', ar: 'حقيبة التواصل الاجتماعي' },
    value: { en: 'Ready posts, reels, a caption bank and a bilingual tone-of-voice guide', ar: 'منشورات جاهزة، ومقاطع قصيرة، وبنك نصوص، ودليل نبرة صوت ثنائي اللغة' },
    detail: { en: 'Refreshed each quarter; local adaptation is yours to make, the brand marks are not.', ar: 'يُحدَّث كل ربع — التكييف المحلي من حقّكم، أما عناصر العلامة فلا تُعدَّل.' },
  },
  {
    key: 'sampling',
    label: { en: 'Sampling program', ar: 'برنامج العيّنات' },
    value: {
      horeca: { en: 'Chef tastings and menu trials — samples released against the account, not invoiced', ar: 'جلسات تذوّق للطهاة وتجارب قوائم — تُصرف العيّنات على الحساب دون فوترة' },
      export: { en: '1% of invoiced volume released as samples each quarter', ar: '١٪ من الكمية المفوترة تُصرف عيّنات كل ربع' },
    },
  },
  {
    key: 'exhibitions',
    label: { en: 'Trade exhibition participation', ar: 'المشاركة في المعارض التجارية' },
    value: {
      horeca: { en: 'Saudi Food Show and hospitality shows, plus chef competitions in the Kingdom', ar: 'معرض الأغذية السعودي ومعارض الضيافة، إضافة إلى مسابقات الطهاة داخل المملكة' },
      export: { en: 'Gulfood (Dubai), Saudi Food Show (Riyadh) and ISM (Cologne)', ar: 'جلفود (دبي)، ومعرض الأغذية السعودي (الرياض)، وISM (كولونيا)' },
    },
    detail: { en: 'Shared stand and cost split are agreed 120 days ahead of each show.', ar: 'يُتفق على الجناح المشترك وتقاسم التكلفة قبل ١٢٠ يومًا من كل معرض.' },
  },
  {
    key: 'training',
    label: { en: 'Distributor training program', ar: 'برنامج تدريب الموزّعين' },
    value: { en: 'Two days a year on product, tempering and storytelling, plus a chef-led session for the sales team', ar: 'يومان سنويًا في المنتج والتقسية وسرد قصة العلامة، مع جلسة بإشراف طاهٍ لفريق المبيعات' },
    detail: { en: 'Held at the plant in Jazan or on your site — attendance is what keeps the tier discount.', ar: 'يُعقد في مصنع جيزان أو في موقعكم — والحضور شرط لاستمرار خصم الفئة.' },
  },
]

/* ═══════════════ 4 · Merchandising ═══════════════ */
const merchandising: PackItem[] = [
  {
    key: 'planograms',
    label: { en: 'Shelf planograms', ar: 'مخططات الرفوف' },
    value: {
      horeca: { en: 'Back-of-house storage layouts and hospitality-cart plans per outlet format', ar: 'مخططات التخزين الخلفي وعربات الضيافة لكل نمط منفذ' },
      export: { en: '1 m and 2 m bay planograms per retail format, with facings and blocking', ar: 'مخططات لأرفف بعرض متر ومترين لكل نمط تجزئة، مع الواجهات والتكتّل اللوني' },
    },
    detail: { en: 'Rotation is first-expiry-first-out; the planogram marks where the oldest batch sits.', ar: 'الدوران بمبدأ الأقرب انتهاءً أولًا، ويحدّد المخطط موضع أقدم دفعة.' },
  },
  {
    key: 'premium_display',
    label: { en: 'Premium display concepts', ar: 'مفاهيم العرض الفاخر' },
    value: { en: 'Gondola end, island table and vitrine concepts in walnut and brass, with build drawings', ar: 'مفاهيم لنهاية الممر وطاولة جزيرة وفاترينة بخشب الجوز والنحاس، مع مخططات التنفيذ' },
    detail: { en: 'Built locally to the drawings; JAZ approves the first unit from photographs before the run.', ar: 'تُصنَّع محليًا وفق المخططات، وتعتمد جاز الوحدة الأولى بالصور قبل الإنتاج.' },
  },
  {
    key: 'duty_free',
    label: { en: 'Duty-free merchandising', ar: 'العرض في الأسواق الحرّة' },
    value: {
      horeca: { en: 'The travel-retail set adapted for hotel lobby and lounge retail corners', ar: 'مجموعة التجزئة السفرية مكيَّفة لأركان البيع في اللوبي والصالات' },
      export: { en: 'Travel-retail set: multi-pack facings, bulk-buy pricing and airport-format displays', ar: 'مجموعة التجزئة السفرية: واجهات العبوات المتعدّدة، وتسعير الشراء بالجملة، وعروض بمقاسات المطارات' },
    },
  },
  {
    key: 'gift_display',
    label: { en: 'Gift display concepts', ar: 'مفاهيم عرض الهدايا' },
    value: { en: 'Seasonal gifting tables, a ribbon bar, and made-to-order box building at the counter', ar: 'طاولات إهداء موسمية، وركن أشرطة، وتجميع العلب حسب الطلب عند الكاونتر' },
    detail: { en: 'The counter build is the highest-margin format in the pack — it is worth the staffing.', ar: 'التجميع عند الكاونتر أعلى الصيغ هامشًا في الحقيبة، ويستحق تخصيص موظف له.' },
  },
  {
    key: 'coffee_pairing',
    label: { en: 'Coffee pairing recommendations', ar: 'توصيات إقران القهوة' },
    value: { en: 'A pairing card per bar flavour — Arabic coffee, single-origin espresso and Jazani spiced coffee', ar: 'بطاقة إقران لكل نكهة لوح — القهوة العربية، والإسبريسو أحادي المنشأ، والقهوة الجيزانية المبهّرة' },
  },
  {
    key: 'cross_merch',
    label: { en: 'Cross-merchandising', ar: 'العرض المتقاطع' },
    value: { en: 'Adjacency plans with premium dates, Arabic coffee and luxury gifting', ar: 'خطط تجاور مع التمور الفاخرة والقهوة العربية والهدايا الراقية' },
    detail: { en: 'Those three baskets are what JAZ is bought alongside — placing against them lifts both sides.', ar: 'هذه السلال الثلاث هي ما تُشترى جاز معه، ووضعها بجوارها يرفع مبيعات الطرفين.' },
  },
]

export const distributorPack: PackSection[] = [
  {
    id: 'commercial',
    label: { en: 'Commercial', ar: 'التجاري' },
    blurb: { en: 'What you earn, what you owe, and where you may sell.', ar: 'ما تكسبونه، وما يترتّب عليكم، وأين يحقّ لكم البيع.' },
    items: commercial,
  },
  {
    id: 'logistics',
    label: { en: 'Logistics', ar: 'اللوجستيات' },
    blurb: { en: 'How the goods are packed, how long they keep, and which papers travel with them.', ar: 'كيف تُعبَّأ البضاعة، وكم تبقى صالحة، وأي مستندات تُرافقها.' },
    items: logistics,
  },
  {
    id: 'marketing',
    label: { en: 'Marketing', ar: 'التسويق' },
    blurb: { en: 'The calendar, the assets and the support that come with the account.', ar: 'التقويم والأصول والدعم المرافق للحساب.' },
    items: marketing,
  },
  {
    id: 'merchandising',
    label: { en: 'Merchandising', ar: 'العرض والتسويق بالمتجر' },
    blurb: { en: 'How the range is displayed once it is on your floor.', ar: 'كيف تُعرض التشكيلة بعد وصولها إلى صالتكم.' },
    items: merchandising,
  },
]

/** One row of the loading table — the same shape whether it came from a carton or a pallet SKU. */
export interface LoadingRow {
  sku: string
  name: Bilingual
  /** The unit the price list sells in. */
  unit: Bilingual
  /** Minimum quantity of that unit, per order. */
  moq: string
  /** Inner units inside one master carton / one pallet. */
  packedIn: string
  /** Master carton or pallet dimensions. */
  dims: string
  grossKg: string
  /** Cartons on a pallet, or pallets in a 40' reefer. */
  perLoad: string
}

/** Carton-level spec for the in-Kingdom wholesale lines — the retail catalogue is untouched. */
const cartonSpecs: Record<string, { inner: string; cartonMm: string; grossKg: number; cartonsPerPallet: number }> = {
  CHV70: { inner: '2 × 2.5 kg blocks', cartonMm: '330 × 230 × 130', grossKg: 5.4, cartonsPerPallet: 96 },
  CHM45: { inner: '2 × 2.5 kg blocks', cartonMm: '330 × 230 × 130', grossKg: 5.4, cartonsPerPallet: 96 },
  CHW28: { inner: '2 × 2.5 kg blocks', cartonMm: '330 × 230 × 130', grossKg: 5.4, cartonsPerPallet: 96 },
  CHV85: { inner: '2 × 2.5 kg blocks', cartonMm: '330 × 230 × 130', grossKg: 5.4, cartonsPerPallet: 96 },
  PWD22: { inner: '10 × 1 kg bags', cartonMm: '400 × 300 × 200', grossKg: 10.6, cartonsPerPallet: 48 },
  DRP60: { inner: '1 × 4 kg carton', cartonMm: '300 × 200 × 160', grossKg: 4.4, cartonsPerPallet: 128 },
  CCB18: { inner: '6 × 2 kg tubs', cartonMm: '400 × 300 × 200', grossKg: 12.4, cartonsPerPallet: 48 },
  GNC30: { inner: '4 × 3 kg pails', cartonMm: '400 × 300 × 250', grossKg: 12.6, cartonsPerPallet: 40 },
  SPR: { inner: '4 × 3 L jugs', cartonMm: '400 × 300 × 250', grossKg: 13.0, cartonsPerPallet: 40 },
  TRF: { inner: '6 × boxes of 48', cartonMm: '400 × 300 × 200', grossKg: 8.4, cartonsPerPallet: 48 },
  BON36: { inner: '6 × boxes of 36', cartonMm: '400 × 300 × 200', grossKg: 7.8, cartonsPerPallet: 48 },
  BAR90: { inner: '24 bars', cartonMm: '400 × 300 × 120', grossKg: 2.6, cartonsPerPallet: 88 },
}

/** The loading table for a channel, built from the catalogue that channel actually orders from. */
export function loadingRows(channel: PackChannel): LoadingRow[] {
  if (channel === 'export') {
    return megaCatalog.map((p) => ({
      sku: p.sku,
      name: p.name,
      unit: { en: 'Pallet', ar: 'طبلية' },
      moq: `${p.moq}`,
      packedIn: `${p.unitsPerPallet.toLocaleString('en-US')} units`,
      dims: `${p.cbm} m³`,
      grossKg: `${p.grossKg}`,
      perLoad: `${CONTAINER.fortyFtPallets}`,
    }))
  }
  return wholesaleProducts.map((p) => {
    const spec = cartonSpecs[p.sku]
    return {
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      moq: `${p.minQty}`,
      packedIn: spec?.inner ?? '—',
      dims: spec?.cartonMm ?? '—',
      grossKg: spec ? `${spec.grossKg}` : '—',
      perLoad: spec ? `${spec.cartonsPerPallet}` : '—',
    }
  })
}

/** Column headings differ per channel — one counts cartons on a pallet, the other pallets in a container. */
export const loadingColumns: Record<PackChannel, { unit: Bilingual; moq: Bilingual; packedIn: Bilingual; dims: Bilingual; grossKg: Bilingual; perLoad: Bilingual }> = {
  horeca: {
    unit: { en: 'Sale unit', ar: 'وحدة البيع' },
    moq: { en: 'MOQ', ar: 'الحد الأدنى' },
    packedIn: { en: 'Carton holds', ar: 'محتوى الكرتون' },
    dims: { en: 'Carton mm', ar: 'أبعاد الكرتون (مم)' },
    grossKg: { en: 'Gross kg', ar: 'الوزن الإجمالي (كجم)' },
    perLoad: { en: 'Cartons / pallet', ar: 'كراتين / طبلية' },
  },
  export: {
    unit: { en: 'Sale unit', ar: 'وحدة البيع' },
    moq: { en: 'MOQ', ar: 'الحد الأدنى' },
    packedIn: { en: 'Pallet holds', ar: 'محتوى الطبلية' },
    dims: { en: 'Volume', ar: 'الحجم' },
    grossKg: { en: 'Gross kg', ar: 'الوزن الإجمالي (كجم)' },
    perLoad: { en: "Pallets / 40'", ar: 'طبليات / ٤٠ قدم' },
  },
}
