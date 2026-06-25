import { useRef, type ReactNode, type InputHTMLAttributes } from 'react'
import { User, Building2, ArrowLeft, type LucideIcon } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { Wordmark } from '@/components/brand/Wordmark'
import { JazanScene } from '@/components/brand/JazanScene'
import { cn } from '@/lib/cn'

export type AuthMode = 'b2c' | 'b2b'
export interface TrustPoint {
  icon: LucideIcon
  text: string
}

/** Two-column auth card — atmospheric brand panel + form panel. */
export function AuthLayout({ points, children }: { points: TrustPoint[]; children: ReactNode }) {
  const { t, pick } = useLocale()
  return (
    <section className="container-jaz py-xl lg:py-section">
      <div className="grid lg:grid-cols-2 rounded-xl overflow-hidden border border-hairline shadow-soft-lg min-h-[600px]">
        {/* brand panel */}
        <div className="relative bg-canvas-dark text-ink-on-dark p-xl lg:p-xxl flex flex-col justify-between order-2 lg:order-1 min-h-[240px]">
          <div className="absolute inset-0 opacity-50">
            <JazanScene tone="dark" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-canvas-dark/30 via-transparent to-canvas-dark/70" />
          <div className="relative">
            <Wordmark tone="on-dark" size="lg" withWave />
            <p className="font-serif text-headline text-ink-on-dark leading-snug max-w-sm mt-lg">{t('brand.tagline')}</p>
            <p className="font-sans text-caption tracking-wide text-ink-on-dark-muted mt-sm">{t('brand.location')}</p>
          </div>
          <ul className="relative flex flex-col gap-sm mt-lg">
            {points.map((p, i) => (
              <li key={i} className="flex items-center gap-sm font-sans text-caption text-ink-on-dark-muted">
                <span className="grid place-items-center w-7 h-7 rounded-md bg-surface-dark-1 border border-hairline-dark text-primary-bright shrink-0">
                  <p.icon size={14} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        {/* form panel */}
        <div className="bg-surface-1 p-xl lg:p-xxl flex flex-col gap-lg order-1 lg:order-2">{children}</div>
      </div>
      <p className="text-center font-sans text-caption text-ink-subtle mt-md">{pick({ en: 'Demo experience · no real credentials are sent.', ar: 'تجربة عرض · لا تُرسل بيانات حقيقية.' })}</p>
    </section>
  )
}

/** Heading with an optional back affordance for multi-step screens. */
export function AuthHeading({ title, subtitle, onBack }: { title: string; subtitle?: ReactNode; onBack?: () => void }) {
  const { t } = useLocale()
  return (
    <div className="flex flex-col gap-xs">
      {onBack && (
        <button type="button" onClick={onBack} className="self-start inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle hover:text-ink transition-colors mb-xxs">
          <ArrowLeft size={14} className="rtl:rotate-180" /> {t('auth.back')}
        </button>
      )}
      <h1 className="font-serif text-display-md text-ink">{title}</h1>
      {subtitle && <p className="text-body text-ink-muted">{subtitle}</p>}
    </div>
  )
}

/** B2C / B2B segmented control. */
export function ModeToggle({ mode, onChange }: { mode: AuthMode; onChange: (m: AuthMode) => void }) {
  const { t } = useLocale()
  const options = [
    { v: 'b2c' as const, label: t('role.individual'), icon: User },
    { v: 'b2b' as const, label: t('role.business'), icon: Building2 },
  ]
  return (
    <div className="inline-flex p-0.5 rounded-pill border border-hairline bg-surface-2 w-full">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={mode === o.v}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-xs rounded-pill py-2.5 font-sans text-button uppercase transition-all',
            mode === o.v ? 'bg-primary text-on-primary shadow-lift' : 'text-ink-muted hover:text-ink',
          )}
        >
          <o.icon size={15} />
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Labelled input with a leading icon. */
export function AuthField({
  icon: Icon,
  label,
  hint,
  ...props
}: { icon: LucideIcon; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="label !mb-0">{label}</span>
      <div className="relative">
        <Icon size={17} className="absolute top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" style={{ insetInlineStart: 14 }} />
        <input className="input ps-11" {...props} />
      </div>
      {hint && <span className="font-sans text-caption text-ink-subtle">{hint}</span>}
    </label>
  )
}

/** "or" divider. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-sm">
      <span className="flex-1 h-px bg-hairline" />
      <span className="font-sans text-caption text-ink-subtle uppercase tracking-wide">{label}</span>
      <span className="flex-1 h-px bg-hairline" />
    </div>
  )
}

/** One-time-code entry — auto-advancing boxes, paste-aware, always LTR. */
export function OtpInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setAt = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const chars = value.padEnd(length).split('')
    chars[i] = digit || ' '
    onChange(chars.join('').replace(/\s+$/g, '').slice(0, length))
    if (digit && i < length - 1) refs.current[i + 1]?.focus()
  }
  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus()
  }
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!text) return
    e.preventDefault()
    onChange(text)
    refs.current[Math.min(text.length, length - 1)]?.focus()
  }

  return (
    <div dir="ltr" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          aria-label={`Digit ${i + 1}`}
          className="h-14 w-full rounded-md border border-hairline-strong bg-surface-1 text-center font-serif text-headline text-ink tabular-nums outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(176,138,87,0.18)]"
        />
      ))}
    </div>
  )
}
