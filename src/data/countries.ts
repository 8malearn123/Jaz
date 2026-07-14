import type { Bilingual } from './types'

// ── Shared country vocabulary: contracted partners carry a country, and
// products can be dedicated to one country (or offered everywhere).

export type CountryCode = 'sa' | 'ae' | 'kw' | 'qa' | 'bh' | 'om'

export interface CountryDef { code: CountryCode; label: Bilingual; flag: string }
export const countries: CountryDef[] = [
  { code: 'sa', label: { en: 'Saudi Arabia', ar: 'السعودية' }, flag: '🇸🇦' },
  { code: 'ae', label: { en: 'UAE', ar: 'الإمارات' }, flag: '🇦🇪' },
  { code: 'kw', label: { en: 'Kuwait', ar: 'الكويت' }, flag: '🇰🇼' },
  { code: 'qa', label: { en: 'Qatar', ar: 'قطر' }, flag: '🇶🇦' },
  { code: 'bh', label: { en: 'Bahrain', ar: 'البحرين' }, flag: '🇧🇭' },
  { code: 'om', label: { en: 'Oman', ar: 'عُمان' }, flag: '🇴🇲' },
]
export const countryOf = (code?: string) => countries.find((c) => c.code === code)
