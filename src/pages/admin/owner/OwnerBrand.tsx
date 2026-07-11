import { Upload, RotateCcw, Trash2, Check } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { buttonClass } from '@/components/ui/Button'
import { Wordmark } from '@/components/brand/Wordmark'
import { useBrand, DEFAULT_PRIMARY } from '@/state/BrandContext'
import { cn } from '@/lib/cn'
import { PanelHead } from './_shared'

// Curated accent presets that sit well with the rest of the palette.
const PRESETS: { hex: string; label: { en: string; ar: string } }[] = [
  { hex: DEFAULT_PRIMARY, label: { en: 'Aged gold (default)', ar: 'ذهبي (الافتراضي)' } },
  { hex: '#355c4b', label: { en: 'Jazani green', ar: 'أخضر جازاني' } },
  { hex: '#365766', label: { en: 'Coastal blue', ar: 'أزرق ساحلي' } },
  { hex: '#8e2f55', label: { en: 'Rose', ar: 'وردي داكن' } },
  { hex: '#3b241a', label: { en: 'Dark chocolate', ar: 'شوكولاتة داكنة' } },
  { hex: '#8a6b3f', label: { en: 'Deep bronze', ar: 'برونزي عميق' } },
]

/** Identity & appearance — the owner controls the system accent color and the logo. */
export function OwnerBrand() {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { primary, setPrimary, resetPrimary, logoUrl, logoName, setLogo, clearLogo } = useBrand()

  const applyColor = (hex: string, label?: string) => {
    setPrimary(hex)
    flash(`${pick({ en: 'Accent color applied', ar: 'طُبق لون النظام' })}${label ? ` · ${label}` : ''}`)
  }

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Identity & appearance', ar: 'الهوية والمظهر' })}
        subtitle={pick({ en: 'System colors and logo — changes apply live across the whole platform', ar: 'ألوان النظام والشعار — التغييرات تنعكس مباشرة على المنصة كاملة' })} />

      <div className="grid lg:grid-cols-2 gap-lg items-start">
        {/* ── system accent color ── */}
        <div className="card p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between gap-sm">
            <h3 className="font-serif text-card-title text-ink">{pick({ en: 'System color', ar: 'لون النظام' })}</h3>
            {primary !== DEFAULT_PRIMARY && (
              <button onClick={() => { resetPrimary(); flash(pick({ en: 'Back to the default gold', ar: 'رجع اللون الافتراضي' })) }} className={buttonClass('ghost', 'sm')}><RotateCcw size={14} /> {pick({ en: 'Reset', ar: 'استعادة الافتراضي' })}</button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-xs">
            {PRESETS.map((p) => {
              const on = primary.toLowerCase() === p.hex.toLowerCase()
              return (
                <button key={p.hex} onClick={() => applyColor(p.hex, pick(p.label))}
                  className={cn('flex items-center gap-sm rounded-lg border p-sm text-start transition-colors', on ? 'border-ink/60 ring-1 ring-ink/20' : 'border-hairline hover:border-ink/30')}>
                  <span className="grid place-items-center w-9 h-9 rounded-md shrink-0" style={{ backgroundColor: p.hex }}>{on && <Check size={15} className="text-white" />}</span>
                  <span className="font-sans text-caption text-ink leading-tight">{pick(p.label)}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-sm pt-sm border-t border-hairline">
            <span className="font-sans text-data text-ink">{pick({ en: 'Custom color', ar: 'لون مخصص' })}</span>
            <input type="color" value={primary} onChange={(e) => applyColor(e.target.value)}
              className="w-10 h-10 rounded-md border border-hairline-strong cursor-pointer bg-transparent p-0.5" aria-label={pick({ en: 'Pick custom color', ar: 'اختر لونًا مخصصًا' })} />
            <span className="font-sans text-caption text-ink-subtle tabular-nums" dir="ltr">{primary}</span>
          </div>

          {/* live preview of primary-toned elements */}
          <div className="rounded-lg border border-hairline bg-surface-2 p-md flex flex-col gap-sm">
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{pick({ en: 'Live preview', ar: 'معاينة مباشرة' })}</span>
            <div className="flex flex-wrap items-center gap-sm">
              <button className={buttonClass('primary', 'sm')}>{pick({ en: 'Primary button', ar: 'زر أساسي' })}</button>
              <span className="inline-flex items-center gap-xxs rounded-pill bg-primary/10 text-primary-hover px-3 py-1 font-sans text-caption">{pick({ en: 'Tag', ar: 'وسم' })}</span>
              <span className="font-serif text-card-title text-primary-hover">{pick({ en: 'Heading accent', ar: 'عنوان مميز' })}</span>
            </div>
          </div>
        </div>

        {/* ── logo ── */}
        <div className="card p-lg flex flex-col gap-md">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Logo', ar: 'الشعار' })}</h3>

          {/* preview on light and dark */}
          <div className="grid grid-cols-2 gap-sm">
            <div className="rounded-lg border border-hairline bg-surface-1 grid place-items-center py-lg"><Wordmark size="lg" tone="ink" /></div>
            <div className="rounded-lg border border-hairline-dark bg-canvas-dark grid place-items-center py-lg"><Wordmark size="lg" tone="on-dark" /></div>
          </div>

          <div className="flex flex-wrap items-center gap-sm">
            <label className={buttonClass('primary', 'sm', 'cursor-pointer')}>
              <Upload size={15} /> {logoUrl ? pick({ en: 'Replace logo', ar: 'استبدال الشعار' }) : pick({ en: 'Upload logo', ar: 'رفع الشعار' })}
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setLogo(URL.createObjectURL(f), f.name); flash(pick({ en: 'Logo uploaded — applied everywhere', ar: 'رُفع الشعار — طُبق في كل النظام' })) }
                e.target.value = ''
              }} />
            </label>
            {logoUrl && (
              <button onClick={() => { clearLogo(); flash(pick({ en: 'Back to the JAZ wordmark', ar: 'رجع شعار جاز النصي' })) }} className="btn btn-sm bg-transparent text-danger border border-danger/40 hover:bg-danger/5"><Trash2 size={14} /> {pick({ en: 'Remove logo', ar: 'إزالة الشعار' })}</button>
            )}
          </div>
          {logoName && <p className="font-sans text-caption text-ink-subtle" dir="ltr">{logoName}</p>}
          <p className="font-sans text-caption text-ink-subtle">{pick({ en: 'PNG, JPG, SVG or WebP. A transparent background looks best. The uploaded logo replaces the JAZ wordmark across the storefront, portals and console.', ar: 'PNG أو JPG أو SVG أو WebP. الخلفية الشفافة أفضل. الشعار المرفوع يحل محل شعار جاز النصي في المتجر والبوابات ولوحة التحكم.' })}</p>
        </div>
      </div>
    </div>
  )
}
