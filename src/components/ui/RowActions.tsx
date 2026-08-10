import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { cn } from '@/lib/cn'

export interface RowAction {
  id: string
  label: string
  /** One line of explanation under the label — for actions that carry a consequence. */
  hint?: string
  icon?: LucideIcon
  /** 'primary' marks the row's decision (gold), 'danger' a destructive one. */
  tone?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  onSelect: () => void
}

/** Row actions folded under a three-dot button: the table keeps one narrow column
 *  and the actions appear on click. Rendered in a portal so a table's horizontal
 *  scroll container can't clip it, and flipped above the row near the fold. */
export function RowActions({ actions, label, flagged = false }: { actions: RowAction[]; label: string; flagged?: boolean }) {
  const { dir } = useLocale()
  const rtl = dir === 'rtl'
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [cursor, setCursor] = useState(-1)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Anchor to the trigger in viewport space, re-measuring on scroll and resize.
  // The menu stays hidden until it has been measured, so it never flashes at 0,0.
  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect()
      const m = menuRef.current
      if (!b || !m) return
      const gap = 6
      const pad = 8
      const below = b.bottom + gap
      const top = below + m.offsetHeight > window.innerHeight - pad ? Math.max(pad, b.top - gap - m.offsetHeight) : below
      // the menu hangs from the trigger's inline-end edge in either direction
      const raw = rtl ? b.left : b.right - m.offsetWidth
      const left = Math.min(Math.max(pad, raw), Math.max(pad, window.innerWidth - m.offsetWidth - pad))
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, rtl, actions.length])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    // Escape also closes when the menu was opened by mouse and focus is still on the trigger.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setCursor(-1)
      btnRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open && cursor >= 0) itemRefs.current[cursor]?.focus()
  }, [open, cursor])

  const close = (restoreFocus = true) => {
    setOpen(false)
    setCursor(-1)
    if (restoreFocus) btnRef.current?.focus()
  }

  /** Move the highlight by `step`, skipping disabled entries. */
  const move = (from: number, step: number) => {
    const n = actions.length
    for (let i = 1; i <= n; i++) {
      const next = (from + step * i + n * n) % n
      if (!actions[next].disabled) return next
    }
    return from
  }

  const onTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    setOpen(true)
    setCursor(e.key === 'ArrowUp' ? move(0, -1) : move(-1, 1))
  }

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation() // don't let a surrounding dialog close too
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => move(c, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => move(c < 0 ? 0 : c, -1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCursor(move(-1, 1))
    } else if (e.key === 'End') {
      e.preventDefault()
      setCursor(move(0, -1))
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          setOpen((o) => !o)
          setCursor(-1)
        }}
        onKeyDown={onTriggerKey}
        className={cn(
          'relative grid place-items-center w-9 h-9 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open ? 'border-ink/30 bg-surface-2 text-ink' : 'border-hairline text-ink-muted hover:text-ink hover:border-ink/30 hover:bg-surface-2',
        )}
      >
        <MoreHorizontal size={16} />
        {/* a waiting decision stays visible even with the actions folded away */}
        {flagged && <span className="absolute -top-1 w-2 h-2 rounded-pill bg-primary ring-2 ring-surface-1" style={{ insetInlineEnd: -2 }} />}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
            className="z-[120] w-[min(18rem,calc(100vw-16px))] p-xs rounded-lg border border-hairline bg-surface-1 shadow-soft-lg overflow-hidden animate-scale-in origin-top"
          >
            {actions.map((a, i) => (
              <button
                key={a.id}
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onMouseEnter={() => setCursor(i)}
                onClick={() => {
                  close() // hand focus back to the trigger before the action takes over
                  a.onSelect()
                }}
                className={cn(
                  'w-full flex items-start gap-sm px-md py-2.5 rounded-md text-start font-sans text-data transition-colors',
                  'focus:outline-none disabled:opacity-45 disabled:pointer-events-none',
                  a.tone === 'danger'
                    ? 'text-danger hover:bg-danger/8 focus-visible:bg-danger/8'
                    : a.tone === 'primary'
                      ? 'text-ink hover:bg-primary/10 focus-visible:bg-primary/10'
                      : 'text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:bg-surface-2 focus-visible:text-ink',
                )}
              >
                {a.icon && (
                  <a.icon
                    size={16}
                    className={cn('mt-0.5 shrink-0', a.tone === 'danger' ? 'text-danger' : a.tone === 'primary' ? 'text-primary-hover' : 'text-ink-subtle')}
                  />
                )}
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className={cn('truncate', a.tone === 'primary' && 'font-medium text-ink')}>{a.label}</span>
                  {a.hint && <span className="font-sans text-caption text-ink-subtle">{a.hint}</span>}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
