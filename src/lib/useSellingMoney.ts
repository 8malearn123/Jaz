import { useMemo } from 'react'
import { useLocale } from '@/i18n/LocaleContext'
import { sellingCurrencyFor, toSelling, fromSelling } from '@/data/selling'
import type { CountryCode } from '@/data/countries'

type MoneyFn = (minor: number, opts?: { withSymbol?: boolean; currency?: 'SAR' | 'USD' }) => string

export interface SellingMoney {
  /** Renders stored riyal minor units in the buyer's selling currency. */
  money: (sarMinor: number, opts?: { withSymbol?: boolean }) => string
  currency: 'SAR' | 'USD'
  /** Symbol for labels that name the currency themselves, e.g. "Credit limit ($)". */
  symbol: string
  /** Is this buyer sold to in a currency other than the home riyal? */
  isExport: boolean
  /** Stored riyals → the buyer's currency, for figures shown outside `money`. */
  toBuyer: (sarMinor: number) => number
  /** The buyer's currency → stored riyals, for figures captured from a form. */
  fromBuyer: (minor: number) => number
}

/** Bind money helpers to what a buyer in `country` transacts in. Plain function so it
 *  can be used per row in a list, where the country differs from one account to the next. */
export function makeSellingMoney(money: MoneyFn, country?: CountryCode): SellingMoney {
  const currency = sellingCurrencyFor(country)
  return {
    money: (sarMinor, opts) => money(toSelling(sarMinor, currency), { ...opts, currency }),
    currency,
    symbol: currency === 'USD' ? '$' : '﷼',
    isExport: currency !== 'SAR',
    toBuyer: (sarMinor) => toSelling(sarMinor, currency),
    fromBuyer: (minor) => fromSelling(minor, currency),
  }
}

/** Hook form, for a view that belongs to a single buyer. */
export function useSellingMoney(country?: CountryCode): SellingMoney {
  const { money } = useLocale()
  return useMemo(() => makeSellingMoney(money, country), [money, country])
}
