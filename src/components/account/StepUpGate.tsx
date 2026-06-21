import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ShieldCheck, KeyRound } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'

/**
 * Step-up MFA gate for privileged surfaces (admin / finance / auditor), per §5.3/5.4.
 * Verification is remembered for the browser session.
 */
export function StepUpGate({ id, required, children }: { id: string; required: boolean; children: ReactNode }) {
  const { t } = useLocale()
  const key = `jaz.mfa.${id}`
  const [verified, setVerified] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(key) === '1'
  })
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (required && !verified) inputRef.current?.focus()
  }, [required, verified])

  if (!required || verified) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.replace(/\D/g, '').length < 6) return
    window.sessionStorage.setItem(key, '1')
    setVerified(true)
  }

  return (
    <div className="container-narrow py-section min-h-[60vh] grid place-items-center">
      <form onSubmit={submit} className="w-full max-w-md card p-xl flex flex-col items-center text-center gap-md">
        <span className="grid place-items-center w-16 h-16 rounded-pill bg-primary/12 text-primary-hover">
          <ShieldCheck size={30} />
        </span>
        <h1 className="font-serif text-headline text-ink">{t('mfa.title')}</h1>
        <p className="text-body text-ink-muted">{t('mfa.body')}</p>
        <div className="relative w-full max-w-[220px]">
          <KeyRound size={17} className="absolute top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" style={{ insetInlineStart: 14 }} />
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="• • • • • •"
            className="input ps-11 text-center tracking-[0.5em] font-sans text-body"
            aria-label={t('mfa.title')}
          />
        </div>
        <button type="submit" disabled={code.length < 6} className={buttonClass('primary', 'md', 'w-full')}>
          {t('mfa.verify')}
        </button>
        <p className="font-sans text-caption text-ink-subtle">{t('mfa.demoHint')}</p>
      </form>
    </div>
  )
}
