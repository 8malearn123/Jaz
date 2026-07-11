import type { Bilingual } from './types'

// ── Owner order-ops board (isolated). Its OWN status machine + channel enum —
// deliberately separate from Customer OrderStatus and Business AccountOrderStatus.

export type OwnerChannel = 'B2C' | 'B2B' | 'MEGA'
export type OwnerOrderStage = 0 | 1 | 2 | 3 | 4 | 5

export interface OwnerOrderStatusDef { key: string; label: Bilingual; color: string; bg: string }
export const ownerOrderStatuses: OwnerOrderStatusDef[] = [
  { key: 'new', label: { en: 'New', ar: 'جديد' }, color: '#365766', bg: '#e7eef1' },
  { key: 'confirmed', label: { en: 'Confirmed', ar: 'مؤكد' }, color: '#8a6b3f', bg: '#f6edde' },
  { key: 'prod', label: { en: 'In production', ar: 'قيد التصنيع' }, color: '#b08a57', bg: '#f7efe2' },
  { key: 'ready', label: { en: 'Ready to ship', ar: 'جاهز للشحن' }, color: '#355c4b', bg: '#e8f0ec' },
  { key: 'shipped', label: { en: 'Shipped', ar: 'تم الشحن' }, color: '#3b241a', bg: '#efe7df' },
  { key: 'done', label: { en: 'Completed', ar: 'مكتمل' }, color: '#2f7d5b', bg: '#e6f2ea' },
]

export const ownerChannelMeta: Record<OwnerChannel, { label: Bilingual; bg: string; color: string }> = {
  B2C: { label: { en: 'B2C', ar: 'B2C' }, bg: '#f6edde', color: '#8a6b3f' },
  B2B: { label: { en: 'HoReCa', ar: 'HoReCa' }, bg: '#e8f0ec', color: '#355c4b' },
  MEGA: { label: { en: 'B2B', ar: 'B2B' }, bg: '#e7eef1', color: '#365766' },
}

export interface OwnerOrder {
  id: string
  customer: Bilingual
  chan: OwnerChannel
  items: Bilingual
  qty: number
  amountMinor: number
  date: Bilingual
  stage: OwnerOrderStage
  sla: boolean
  cancelled?: boolean
  department?: Bilingual // routed production department (owner assigns)
}

export const ownerOrdersSeed: OwnerOrder[] = [
  // GCC export requests are ordinary orders (they used to live in a separate
  // "Export clients" section) — destination and cold-chain noted on the line.
  { id: 'EX-3081', customer: { en: 'Gulf Sweets Dist.', ar: 'موزّع حلويات الخليج' }, chan: 'MEGA', items: { en: 'Export — Dubai, UAE · cold-chain', ar: 'تصدير — دبي، الإمارات · شحن مبرّد' }, qty: 2400, amountMinor: 26400000, date: { en: '06 Jul', ar: '٠٦ يوليو' }, stage: 1, sla: false },
  { id: 'EX-3079', customer: { en: 'Doha Luxury Foods', ar: 'أطعمة الدوحة الفاخرة' }, chan: 'MEGA', items: { en: 'Export — Doha, Qatar · cold-chain', ar: 'تصدير — الدوحة، قطر · شحن مبرّد' }, qty: 1600, amountMinor: 17600000, date: { en: '05 Jul', ar: '٠٥ يوليو' }, stage: 4, sla: false },
  { id: 'EX-3076', customer: { en: 'Kuwait Gourmet', ar: 'ذوّاقة الكويت' }, chan: 'MEGA', items: { en: 'Export — Kuwait City · cold-chain', ar: 'تصدير — مدينة الكويت · شحن مبرّد' }, qty: 800, amountMinor: 8800000, date: { en: '06 Jul', ar: '٠٦ يوليو' }, stage: 0, sla: false },
  { id: 'EX-3072', customer: { en: 'Manama Retail', ar: 'تجزئة المنامة' }, chan: 'MEGA', items: { en: 'Export — Manama, Bahrain · cold-chain', ar: 'تصدير — المنامة، البحرين · شحن مبرّد' }, qty: 1200, amountMinor: 13200000, date: { en: '02 Jul', ar: '٠٢ يوليو' }, stage: 5, sla: false },
  { id: 'JZ-2618', customer: { en: 'Badi Trading Est.', ar: 'مؤسسة بادي للتجارة' }, chan: 'B2B', items: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, qty: 120, amountMinor: 2016000, date: { en: '06 Jul', ar: '٠٦ يوليو' }, stage: 0, sla: true },
  { id: 'JZ-2617', customer: { en: 'Salma Al-Otaibi', ar: 'سلمى العتيبي' }, chan: 'B2C', items: { en: 'Dark 70% + Milk bar', ar: 'لوح داكن ٧٠٪ + لوح حليب' }, qty: 6, amountMinor: 24600, date: { en: '06 Jul', ar: '٠٦ يوليو' }, stage: 0, sla: false },
  { id: 'JZ-2615', customer: { en: 'Al-Dana Markets', ar: 'أسواق الدانة' }, chan: 'MEGA', items: { en: 'Assorted bar pallets', ar: 'طبليات ألواح مشكّلة' }, qty: 1800, amountMinor: 19840000, date: { en: '05 Jul', ar: '٠٥ يوليو' }, stage: 1, sla: true },
  { id: 'JZ-2613', customer: { en: 'Al-Nakheel Hotel', ar: 'فندق النخيل' }, chan: 'B2B', items: { en: 'Luxury date selection', ar: 'تشكيلة التمر الفاخرة' }, qty: 80, amountMinor: 1680000, date: { en: '05 Jul', ar: '٠٥ يوليو' }, stage: 2, sla: false },
  { id: 'JZ-2611', customer: { en: 'Noura Al-Qahtani', ar: 'نورة القحطاني' }, chan: 'B2C', items: { en: 'Jasmine luxury box', ar: 'بوكس الفُل الفاخر' }, qty: 2, amountMinor: 33600, date: { en: '04 Jul', ar: '٠٤ يوليو' }, stage: 2, sla: false },
  { id: 'JZ-2609', customer: { en: 'Ramz Café', ar: 'مقهى رمز' }, chan: 'B2B', items: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, qty: 240, amountMinor: 912000, date: { en: '04 Jul', ar: '٠٤ يوليو' }, stage: 3, sla: false },
  { id: 'JZ-2606', customer: { en: 'Hyper Panda', ar: 'هايبر بنده' }, chan: 'MEGA', items: { en: 'Seasonal assortment pallets', ar: 'طبليات تشكيلة موسمية' }, qty: 3200, amountMinor: 35200000, date: { en: '03 Jul', ar: '٠٣ يوليو' }, stage: 4, sla: false },
  { id: 'JZ-2602', customer: { en: 'Abdulaziz Al-Shammari', ar: 'عبدالعزيز الشمري' }, chan: 'B2C', items: { en: 'Dark 70% bar', ar: 'لوح داكن ٧٠٪' }, qty: 4, amountMinor: 17600, date: { en: '03 Jul', ar: '٠٣ يوليو' }, stage: 5, sla: false },
  { id: 'JZ-2599', customer: { en: 'Al-Tazaj Restaurants', ar: 'مطاعم الطازج' }, chan: 'B2B', items: { en: 'Jasmine box + date selection', ar: 'بوكس الفُل + تشكيلة التمر' }, qty: 150, amountMinor: 3150000, date: { en: '02 Jul', ar: '٠٢ يوليو' }, stage: 5, sla: false },
  { id: 'JZ-2595', customer: { en: 'Khalid Al-Mutairi', ar: 'خالد المطيري' }, chan: 'B2C', items: { en: 'Milk & jasmine bar', ar: 'لوح حليب بالفُل' }, qty: 3, amountMinor: 11400, date: { en: '02 Jul', ar: '٠٢ يوليو' }, stage: 0, sla: false, cancelled: true },
]

export const ownerDepartments: Bilingual[] = [
  { en: 'Production', ar: 'التصنيع' },
  { en: 'Packaging', ar: 'التغليف' },
  { en: 'Shipping', ar: 'الشحن' },
  { en: 'Delivery', ar: 'التوصيل' },
]
