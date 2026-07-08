import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dict, type Locale } from './dictionary'

interface LocaleContextValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  isRTL: boolean
  setLocale: (l: Locale) => void
  toggleLocale: () => void
  /** Translate a UI key from the dictionary. */
  t: (key: keyof typeof dict | string) => string
  /** Pick the right value from a bilingual { en, ar } content pair. */
  pick: <T>(pair: { en: T; ar: T }) => T
  /** Format a halala (minor-unit) integer as a localized SAR string. */
  money: (minor: number, opts?: { withSymbol?: boolean }) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = 'jaz.locale'

// Eastern-Arabic numerals for Arabic locale
const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
function toArabicDigits(s: string): string {
  return s.replace(/\d/g, (d) => arabicDigits[Number(d)])
}
// Inverse: normalize Eastern-Arabic (٠-٩) and Persian (۰-۹) numerals to ASCII for parsing user input.
export function toAsciiDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf))
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en'
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    return stored === 'ar' || stored === 'en' ? stored : 'en'
  })

  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    const root = document.documentElement
    root.lang = locale === 'ar' ? 'ar' : 'en'
    root.dir = dir
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale, dir])

  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])
  const toggleLocale = useCallback(() => setLocaleState((p) => (p === 'en' ? 'ar' : 'en')), [])

  const t = useCallback(
    (key: string) => {
      const entry = dict[key]
      if (!entry) return key
      return entry[locale]
    },
    [locale],
  )

  const pick = useCallback(<T,>(pair: { en: T; ar: T }) => pair[locale], [locale])

  const money = useCallback(
    (minor: number, opts?: { withSymbol?: boolean }) => {
      const withSymbol = opts?.withSymbol ?? true
      const value = minor / 100
      const formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })
      const num = locale === 'ar' ? toArabicDigits(formatted) : formatted
      if (!withSymbol) return num
      // ﷼ (U+FDFC) renders as the official Saudi Riyal symbol via the SaudiRiyal font.
      return locale === 'ar' ? `${num} ﷼` : `﷼ ${num}`
    },
    [locale],
  )

  const value = useMemo(
    () => ({ locale, dir, isRTL: dir === 'rtl', setLocale, toggleLocale, t, pick, money }),
    [locale, dir, setLocale, toggleLocale, t, pick, money],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
