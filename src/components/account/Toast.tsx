import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'

interface ToastValue {
  /** Show a transient confirmation message (auto-dismisses). */
  flash: (msg: string) => void
}

const ToastContext = createContext<ToastValue | null>(null)

/**
 * Lightweight toast, scoped to the Customer account subtree only.
 * Mirrors the prototype's `flash()` UX without touching app-wide providers.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flash = useCallback((m: string) => {
    setMsg(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ flash }}>
      {children}
      {msg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-sm rounded-pill bg-canvas-dark text-ink-on-dark px-lg py-3 shadow-soft-lg animate-scale-in"
        >
          <span className="grid place-items-center w-4 h-4 rounded-pill bg-primary text-on-primary shrink-0">
            <Check size={11} />
          </span>
          <span className="font-sans text-data whitespace-nowrap">{msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
