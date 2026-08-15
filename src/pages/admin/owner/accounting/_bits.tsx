import type { ReactNode } from 'react'
import { Check, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Bilingual } from '@/data/types'
import type { AccountType } from '@/data/coa'
import { Pill } from '../_shared'

// Small pieces every accounting panel repeats: how an account type reads, how an amount
// is set, how a report is exported, and how the book says whether it is in balance.

export const accountTypeMeta: Record<AccountType, { label: Bilingual; color: string; bg: string }> = {
  asset: { label: { en: 'Asset', ar: 'أصل' }, color: '#365766', bg: '#e7eef1' },
  liability: { label: { en: 'Liability', ar: 'خصم' }, color: '#a4533f', bg: '#f7e9e4' },
  equity: { label: { en: 'Equity', ar: 'حقوق ملكية' }, color: '#5a4a86', bg: '#eeeaf6' },
  revenue: { label: { en: 'Revenue', ar: 'إيراد' }, color: '#2f7d5b', bg: '#e6f2ea' },
  expense: { label: { en: 'Expense', ar: 'مصروف' }, color: '#8a6b3f', bg: '#f6edde' },
}

export function AccountTypePill({ type }: { type: AccountType }) {
  const { pick } = useLocale()
  const m = accountTypeMeta[type]
  return <Pill color={m.color} bg={m.bg}>{pick(m.label)}</Pill>
}

/** A money figure in a table cell — tabular, never wrapped, quiet when it is nil. */
export function Amount({ minor, tone = 'plain', dash = true }: { minor: number; tone?: 'plain' | 'muted' | 'gold' | 'danger' | 'success'; dash?: boolean }) {
  const { money } = useLocale()
  if (minor === 0 && dash) return <span className="font-sans text-data text-ink-subtle tabular-nums">—</span>
  return (
    <span className={cn(
      'font-sans text-data tabular-nums whitespace-nowrap',
      tone === 'muted' && 'text-ink-muted',
      tone === 'gold' && 'text-primary-hover',
      tone === 'danger' && 'text-danger',
      tone === 'success' && 'text-success',
      tone === 'plain' && 'text-ink',
    )}>{money(minor)}</span>
  )
}

/** Column headers, written the way every owner table writes them. */
export function Head({ cols }: { cols: { label: Bilingual; num?: boolean; className?: string }[] }) {
  const { pick } = useLocale()
  return (
    <thead>
      <tr className="bg-surface-2 border-b border-hairline">
        {cols.map((c, i) => (
          <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', c.num ? 'text-end' : 'text-start', c.className)}>
            {pick(c.label)}
          </th>
        ))}
      </tr>
    </thead>
  )
}

/** The row a table shows when it has nothing to show. */
export function EmptyRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className="px-lg py-lg text-center font-sans text-data text-ink-subtle">{children}</td>
    </tr>
  )
}

/** Export buttons — the printable report and the spreadsheet, side by side. */
export function ExportBar({ onPdf, onExcel }: { onPdf: () => void; onExcel?: () => void }) {
  const { pick } = useLocale()
  return (
    <div className="flex items-center gap-xs">
      {onExcel && (
        <button onClick={onExcel} className={buttonClass('secondary', 'sm')}>
          <FileSpreadsheet size={14} /> {pick({ en: 'Excel', ar: 'إكسل' })}
        </button>
      )}
      <button onClick={onPdf} className={buttonClass('primary', 'sm')}>
        <Download size={15} /> {pick({ en: 'Export PDF', ar: 'تصدير PDF' })}
      </button>
    </div>
  )
}

/**
 * The book's own verdict. Every statement in this section carries one, because a reader
 * should never have to add the columns up themselves to find out whether they agree.
 */
export function BalanceBadge({ balanced, okLabel, badLabel, differenceMinor }: {
  balanced: boolean
  okLabel: Bilingual
  badLabel: Bilingual
  differenceMinor?: number
}) {
  const { pick, money } = useLocale()
  return (
    <span className={cn(
      'inline-flex items-center gap-xs rounded-pill px-3 py-1 font-sans text-caption font-medium',
      balanced ? 'text-success bg-success/10' : 'text-danger bg-danger/10',
    )}>
      {balanced ? <Check size={13} /> : <AlertTriangle size={13} />}
      {pick(balanced ? okLabel : badLabel)}
      {!balanced && differenceMinor != null && differenceMinor !== 0 && <span className="tabular-nums">· {money(differenceMinor)}</span>}
    </span>
  )
}

/** A date the way the printed reports date themselves. */
export function useIssuedOn(): string {
  const { locale } = useLocale()
  return new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Plain-number string for a spreadsheet cell — minor units become riyals with two decimals. */
export const sheetAmount = (minor: number): number => Math.round(minor) / 100
