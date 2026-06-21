import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { products } from '@/data/products'
import { flavors } from '@/data/flavors'
import type { FlavorId, ProductType } from '@/data/types'
import { ProductArt } from '@/components/brand/ProductArt'
import { cn } from '@/lib/cn'

const thumbKind = (type: ProductType): 'bar' | 'box' => (type === 'bar' ? 'bar' : 'box')

/** Small flavor-keyed chocolate illustration — so a product reads visually, not just by name. */
export function ProductThumb({ flavorId, type, className }: { flavorId: FlavorId; type: ProductType; className?: string }) {
  return (
    <span className={cn('block rounded-md overflow-hidden border border-hairline shrink-0', className)} aria-hidden>
      <ProductArt flavorId={flavorId} kind={thumbKind(type)} branded={false} />
    </span>
  )
}

interface ProductPickerProps {
  value: string
  onChange: (productId: string) => void
  placeholder?: string
  className?: string
}

/**
 * A visual replacement for a plain product <select>: the trigger and every option
 * show the actual chocolate art, so a buyer sees what they're choosing. Expands
 * inline (never an absolute overlay) so it can't be clipped inside a scrolling modal.
 */
export function ProductPicker({ value, onChange, placeholder, className }: ProductPickerProps) {
  const { t, pick, money } = useLocale()
  const [open, setOpen] = useState(false)
  const selected = products.find((p) => p.id === value)

  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-sm rounded-md border border-hairline-strong bg-surface-1 ps-2 pe-3 py-2 text-start hover:border-ink/40 focus:outline-none focus:border-primary transition-colors"
      >
        {selected ? (
          <>
            <ProductThumb flavorId={selected.flavorId} type={selected.type} className="w-10 h-10" />
            <span className="flex-1 min-w-0">
              <span className="block font-sans text-data text-ink truncate">{pick(selected.title)}</span>
              <span className="block font-sans text-caption text-ink-subtle truncate">{pick(flavors[selected.flavorId].name)}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 font-sans text-data text-ink-subtle ps-1">{placeholder ?? t('rfq.selectProduct')}</span>
        )}
        <ChevronDown size={16} className={cn('text-ink-subtle transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="rounded-md border border-hairline bg-surface-1 shadow-soft max-h-64 overflow-y-auto">
          <ul className="divide-y divide-hairline">
            {products.map((p) => {
              const isSel = p.id === value
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(p.id); setOpen(false) }}
                    className={cn('w-full flex items-center gap-sm px-2 py-2 text-start hover:bg-surface-2 transition-colors', isSel && 'bg-primary/[0.06]')}
                  >
                    <ProductThumb flavorId={p.flavorId} type={p.type} className="w-10 h-10" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-sans text-data text-ink truncate">{pick(p.title)}</span>
                      <span className="block font-sans text-caption text-ink-subtle truncate">{pick(flavors[p.flavorId].name)} · {money(p.variants[0].b2bPriceMinor)}</span>
                    </span>
                    {isSel && <Check size={15} className="text-primary-hover shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
