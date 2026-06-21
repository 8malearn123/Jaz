import { useMemo, useState } from 'react'
import {
  Mail, MessageCircle, MessagesSquare, Bot, User, Headset, Send, Check,
  ArrowUpRight, Sparkles, FileText, Inbox,
} from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { tickets, ticketThreads, aiSuggestions, type SupportTicket, type ChatMessage } from '@/data/staff'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

const channelIcon = { chat: MessagesSquare, email: Mail, whatsapp: MessageCircle }
const statusVariant = { open: 'danger', pending: 'gold', resolved: 'success' } as const
const priorityVariant = { high: 'danger', normal: 'gold', low: 'neutral' } as const

export function SupportDesk() {
  const { t, pick, locale } = useLocale()
  const firstOpen = tickets.find((x) => x.status !== 'resolved') ?? tickets[0]
  const [selectedId, setSelectedId] = useState(firstOpen.id)
  const [statuses, setStatuses] = useState<Record<string, SupportTicket['status']>>({})
  const [extra, setExtra] = useState<Record<string, ChatMessage[]>>({})
  const [composer, setComposer] = useState('')
  const [filter, setFilter] = useState<'all' | 'open'>('all')

  const statusOf = (tk: SupportTicket) => statuses[tk.id] ?? tk.status
  const list = useMemo(
    () => tickets.filter((tk) => (filter === 'open' ? statusOf(tk) !== 'resolved' : true)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, statuses],
  )

  const ticket = tickets.find((tk) => tk.id === selectedId)!
  const status = statusOf(ticket)
  const thread = [...(ticketThreads[ticket.id] ?? []), ...(extra[ticket.id] ?? [])]
  const suggestion = aiSuggestions[ticket.id]

  const send = () => {
    if (!composer.trim()) return
    const msg: ChatMessage = { id: `a-${Date.now()}`, sender: 'agent', at: '2026-06-21T12:00', body: { en: composer, ar: composer } }
    setExtra((p) => ({ ...p, [ticket.id]: [...(p[ticket.id] ?? []), msg] }))
    setComposer('')
    setStatuses((p) => ({ ...p, [ticket.id]: 'pending' }))
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('sup.title')}</h2>
        <div className="inline-flex p-1 rounded-md bg-surface-2 border border-hairline">
          {(['all', 'open'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-sm font-sans text-caption uppercase tracking-[0.08em] transition-all', filter === f ? 'bg-ink text-ink-on-dark' : 'text-ink-muted hover:text-ink')}
            >
              {f === 'all' ? t('sup.filterAll') : t('sup.filterOpen')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[330px_1fr] gap-lg items-start">
        {/* queue */}
        <div className="card overflow-hidden">
          <div className="px-md py-3 bg-surface-2 border-b border-hairline flex items-center gap-xs">
            <Inbox size={15} className="text-ink-subtle" />
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-muted">{t('sup.queue')} · {list.length}</span>
          </div>
          <ul className="divide-y divide-hairline max-h-[560px] overflow-y-auto">
            {list.map((tk) => {
              const Ch = channelIcon[tk.channel]
              const st = statusOf(tk)
              const active = tk.id === selectedId
              return (
                <li key={tk.id}>
                  <button
                    onClick={() => { setSelectedId(tk.id); setComposer('') }}
                    className={cn('w-full text-start px-md py-3 flex flex-col gap-xs transition-colors', active ? 'bg-primary/8' : 'hover:bg-surface-2')}
                  >
                    <div className="flex items-center gap-xs">
                      <Ch size={14} className="text-ink-subtle shrink-0" />
                      <span className="font-sans text-data text-ink truncate flex-1">{pick(tk.subject)}</span>
                      {tk.priority === 'high' && <span className="w-2 h-2 rounded-pill bg-danger shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between gap-xs">
                      <span className="font-sans text-caption text-ink-subtle truncate">{pick(tk.requester)}</span>
                      <StatusBadge variant={statusVariant[st]}>{t(`sup.status.${st}`)}</StatusBadge>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* detail */}
        <div className="card overflow-hidden flex flex-col">
          {/* header */}
          <div className="px-lg py-md bg-surface-2 border-b border-hairline flex flex-wrap items-start justify-between gap-sm">
            <div className="min-w-0">
              <h3 className="font-serif text-card-title text-ink">{pick(ticket.subject)}</h3>
              <p className="font-sans text-caption text-ink-subtle mt-xxs">
                {pick(ticket.requester)} · {t(`sup.channel.${ticket.channel}`)} · {t('sup.opened')} {new Date(ticket.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex items-center gap-xs">
              {ticket.aiHandled && <StatusBadge variant="gold">{t('sup.ai')}</StatusBadge>}
              <StatusBadge variant={priorityVariant[ticket.priority]}>{t(`sup.priority.${ticket.priority}`)}</StatusBadge>
              <StatusBadge variant={statusVariant[status]}>{t(`sup.status.${status}`)}</StatusBadge>
            </div>
          </div>

          {/* conversation */}
          <div className="p-lg flex flex-col gap-md max-h-[460px] overflow-y-auto">
            {thread.map((m) => <Bubble key={m.id} msg={m} />)}
          </div>

          {/* AI suggestion + composer */}
          {status === 'resolved' ? (
            <div className="px-lg py-md border-t border-hairline flex items-center gap-sm text-success">
              <Check size={16} />
              <span className="font-sans text-data">{t('sup.resolvedNote')}</span>
            </div>
          ) : (
            <div className="border-t border-hairline p-lg flex flex-col gap-md">
              {suggestion && (
                <div className="rounded-lg bg-primary/[0.05] border border-primary/25 p-md flex flex-col gap-sm">
                  <div className="flex items-center justify-between gap-sm">
                    <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.1em] text-primary-hover">
                      <Sparkles size={14} /> {t('sup.aiSuggestion')}
                    </span>
                    <span className="font-sans text-caption text-ink-subtle">{Math.round(suggestion.confidence * 100)}% {t('sup.confidence')}</span>
                  </div>
                  <p className="font-serif text-body text-ink">{pick(suggestion.reply)}</p>
                  <div className="flex flex-wrap items-center gap-xs">
                    {suggestion.citations.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-xxs rounded-pill bg-surface-1 border border-hairline px-2 py-0.5 font-sans text-caption text-ink-muted">
                        <FileText size={11} className="text-ink-subtle" /> {pick(c)}
                      </span>
                    ))}
                  </div>
                  {suggestion.routeTo && (
                    <p className="font-sans text-caption text-ink-subtle">
                      <ArrowUpRight size={12} className="inline rtl:rotate-[-90deg]" /> {t('sup.routes')}: {pick(suggestion.routeTo)}
                    </p>
                  )}
                  <button onClick={() => setComposer(pick(suggestion.reply))} className={buttonClass('secondary', 'sm', 'self-start')}>
                    {t('sup.useReply')}
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-sm">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  rows={3}
                  placeholder={t('sup.composer')}
                  className="input resize-none"
                />
                <div className="flex items-center gap-xs">
                  <button onClick={send} disabled={!composer.trim()} className={buttonClass('primary', 'sm')}>
                    <Send size={15} /> {t('sup.send')}
                  </button>
                  <button onClick={() => setStatuses((p) => ({ ...p, [ticket.id]: 'pending' }))} className={buttonClass('ghost', 'sm')}>
                    <ArrowUpRight size={15} className="rtl:rotate-[-90deg]" /> {t('sup.escalateRep')}
                  </button>
                  <button onClick={() => setStatuses((p) => ({ ...p, [ticket.id]: 'resolved' }))} className={buttonClass('secondary', 'sm', 'ms-auto')}>
                    <Check size={15} /> {t('sup.resolve')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const { t, pick, locale } = useLocale()
  const isAgent = msg.sender === 'agent'
  const isAI = msg.sender === 'ai'
  const Icon = isAgent ? Headset : isAI ? Bot : User
  const senderLabel = t(`sup.sender.${msg.sender}`)

  return (
    <div className={cn('flex flex-col gap-xs max-w-[88%]', isAgent ? 'self-end items-end' : 'self-start items-start')}>
      <div className="flex items-center gap-xs">
        <span className={cn('grid place-items-center w-6 h-6 rounded-pill shrink-0', isAI ? 'bg-primary/15 text-primary-hover' : isAgent ? 'bg-chocolate text-ink-on-dark' : 'bg-surface-2 text-ink-muted border border-hairline')}>
          <Icon size={13} />
        </span>
        <span className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle">{senderLabel}</span>
        <span className="font-sans text-caption text-ink-subtle">
          {new Date(msg.at).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className={cn('rounded-lg px-md py-2.5 font-serif text-body leading-relaxed', isAgent ? 'bg-chocolate text-ink-on-dark' : isAI ? 'bg-primary/[0.06] text-ink border border-primary/15' : 'bg-surface-2 text-ink border border-hairline')}>
        {pick(msg.body)}
      </div>
      {msg.citations && msg.citations.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {msg.citations.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-xxs rounded-pill bg-surface-1 border border-hairline px-2 py-0.5 font-sans text-caption text-ink-subtle">
              <FileText size={10} /> {pick(c)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
