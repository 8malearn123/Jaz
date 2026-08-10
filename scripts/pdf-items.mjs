// The distributor requirements exactly as the source brief lists them. Both business
// portals must render every one of these inside their Company tab — that is the whole
// contract of the distributor file, so it is asserted rather than spot-checked.
export const PDF_ITEMS = {
  Commercial: [
    'Distributor margin structure', 'MSRP guidance', 'Wholesale pricing policy',
    'Territory exclusivity model', 'Annual sales targets', 'Payment terms',
    'Credit policy', 'Incoterms',
  ],
  Logistics: [
    'MOQ by SKU', 'Carton configuration', 'Master carton dimensions', 'Pallet configuration',
    'Container loading', 'Shelf life', 'Storage temperature', 'Production lead time',
    'Export lead time', 'Country of origin', 'HS codes', 'Barcode (GS1)', 'Export documentation',
  ],
  Marketing: [
    'Annual marketing calendar', 'Launch kit', 'POSM catalogue', 'Digital asset library',
    'Social media toolkit', 'Sampling program', 'Trade exhibition participation',
    'Distributor training program',
  ],
  Merchandising: [
    'Shelf planograms', 'Premium display concepts', 'Duty-free merchandising',
    'Gift display concepts', 'Coffee pairing recommendations', 'Cross-merchandising',
  ],
}

/** The same list in Arabic — the file is bilingual, so coverage is asserted twice. */
export const PDF_ITEMS_AR = {
  Commercial: [
    'هيكل هامش الموزّع', 'إرشادات السعر الاستهلاكي', 'سياسة أسعار الجملة',
    'نموذج حصرية الإقليم', 'أهداف المبيعات السنوية', 'شروط السداد',
    'سياسة الائتمان', 'شروط التسليم',
  ],
  Logistics: [
    'الحد الأدنى للطلب لكل صنف', 'تكوين الكرتون', 'أبعاد الكرتون الرئيسي', 'تكوين الطبلية',
    'تحميل الحاوية', 'العمر الافتراضي', 'حرارة التخزين', 'مدة الإنتاج',
    'مدة التصدير', 'بلد المنشأ', 'الرموز الجمركية', 'الباركود (GS1)', 'مستندات التصدير',
  ],
  Marketing: [
    'التقويم التسويقي السنوي', 'حقيبة الإطلاق', 'كتالوج مواد نقاط البيع', 'مكتبة الأصول الرقمية',
    'حقيبة التواصل الاجتماعي', 'برنامج العيّنات', 'المشاركة في المعارض التجارية',
    'برنامج تدريب الموزّعين',
  ],
  Merchandising: [
    'مخططات الرفوف', 'مفاهيم العرض الفاخر', 'العرض في الأسواق الحرّة',
    'مفاهيم عرض الهدايا', 'توصيات إقران القهوة', 'العرض المتقاطع',
  ],
}

/** Assert the Company tab carries every requirement. Returns 1 on failure, 0 on pass. */
export function checkPdfCoverage(label, html, locale = 'en') {
  const all = Object.values(locale === 'ar' ? PDF_ITEMS_AR : PDF_ITEMS).flat()
  const gaps = all.filter((item) => !html.includes(item))
  const ok = gaps.length === 0
  console.log(`${ok ? '✓' : '✗'}  ${label.padEnd(22)} ${all.length - gaps.length}/${all.length} requirements${ok ? '' : `  MISSING: ${gaps.join(' | ')}`}`)
  return ok ? 0 : 1
}
