import { AlertTriangle } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { Modal } from './Modal'
import { buttonClass } from './Button'

/** Destructive-action confirmation: nothing happens until the user explicitly
 *  confirms — closing or "go back" leaves everything untouched. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel: string
}) {
  const { pick } = useLocale()
  return (
    <Modal open={open} onClose={onClose} size="sm" eyebrow={pick({ en: 'Confirmation', ar: 'تأكيد' })} title={title}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Go back', ar: 'تراجع' })}</button>
        <button onClick={() => { onConfirm(); onClose() }} className="btn btn-sm bg-danger text-white hover:opacity-90">
          <AlertTriangle size={14} /> {confirmLabel}
        </button>
      </>}>
      <div className="flex items-start gap-sm">
        <span className="grid place-items-center w-10 h-10 rounded-pill bg-danger/10 text-danger shrink-0"><AlertTriangle size={18} /></span>
        <p className="font-sans text-data text-ink-muted">{message}</p>
      </div>
    </Modal>
  )
}
