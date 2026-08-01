import type { Bilingual } from './types'

// ── Where goods change hands ────────────────────────────────────────────────
// Wholesale is collected, not delivered. HORECA and B2B orders alike are handed over
// at the plant in Jazan, on the same EXW terms the export channel already runs on —
// so a wholesale order has a collection slot, not a branch arrival window, and the
// buyer's own branches are a billing and contact matter rather than a destination.
//
// Retail is untouched: a B2C order still ships to the customer's address.

export const plantSite = {
  label: { en: 'Jaz plant, Jazan', ar: 'مصنع جاز، جيزان' } as Bilingual,
  region: { en: 'Jazan, Saudi Arabia', ar: 'جيزان، المملكة العربية السعودية' } as Bilingual,
  incoterm: 'EXW',
  /** Collection runs on the cold-chain shift, same as the export gate. */
  hours: { en: '7:00 AM – 4:00 PM, Sun–Thu', ar: '٧:٠٠ ص – ٤:٠٠ م، الأحد–الخميس' } as Bilingual,
}

/** One line naming where an order is received, used wherever a destination used to sit. */
export const pickupLabel: Bilingual = {
  en: `Pickup — ${plantSite.label.en}`,
  ar: `استلام من الموقع — ${plantSite.label.ar}`,
}

/** The rule itself, for the notice shown on every wholesale fulfilment surface. */
export const pickupNotice: Bilingual = {
  en: `Receiving: collected from the site — ${plantSite.label.en} (${plantSite.incoterm}). No branch delivery.`,
  ar: `الاستلام: من الموقع — ${plantSite.label.ar} (${plantSite.incoterm}). لا يوجد تسليم للفرع.`,
}
