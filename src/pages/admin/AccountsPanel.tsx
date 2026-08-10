import { useState } from 'react'
import { Building2, ArrowUpRight, CheckCircle2, Lock, FileText, Briefcase, ClipboardList } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { orgDirectory, salesPipeline, creditApplications, type OrgSummary, type CreditApplication } from '@/data/staff'
import type { Bilingual } from '@/data/types'
import { UtilizationGauge } from '@/components/charts/Charts'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'
import { openDistributorFilePdf } from '@/lib/distributorFilePdf'
import { packValue } from '@/data/distributorPack'
import { completeness, displayValue, distributorProfileSeed, profileFields } from '@/data/distributorProfile'

const tierVariant = { platinum: 'gold', gold: 'gold', silver: 'neutral', bronze: 'neutral' } as const
const statusVariant = { active: 'success', pending: 'gold', suspended: 'danger' } as const
const stageVariant: Record<string, 'gold' | 'success' | 'neutral' | 'danger'> = { draft: 'neutral', sent: 'gold', accepted: 'gold', won: 'success', lost: 'danger' }

/** The directory chip for an account's distributor file — not started, or how far along. */
function fileState(o: OrgSummary, pick: (b: Bilingual) => string): { variant: 'neutral' | 'gold' | 'success'; label: string } {
  const word = pick({ en: 'file', ar: 'الملف' })
  if (!o.fileChannel) return { variant: 'neutral', label: `${word} — ${pick({ en: 'not started', ar: 'لم يبدأ' })}` }
  const done = completeness(distributorProfileSeed[o.fileChannel], o.fileChannel)
  return { variant: done.missing.length === 0 ? 'success' : 'gold', label: `${word} ${done.pct}%` }
}

export function AccountsPanel() {
  const { t, pick, money } = useLocale()
  const [requests, setRequests] = useState<CreditApplication[]>(creditApplications)
  const [detail, setDetail] = useState<OrgSummary | null>(null)
  const [filter, setFilter] = useState<'all' | OrgSummary['status']>('all')
  const filters: ('all' | OrgSummary['status'])[] = ['all', 'active', 'pending', 'suspended']
  const shown = filter === 'all' ? orgDirectory : orgDirectory.filter((o) => o.status === filter)

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h2 className="font-serif text-headline text-ink">{t('accts.title')}</h2>
        <div className="flex items-center gap-xs flex-wrap">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-pill px-3 py-1.5 font-sans text-caption border transition-colors',
                filter === f ? 'bg-ink text-ink-on-dark border-ink' : 'bg-surface-1 text-ink-muted border-hairline-strong hover:border-ink/40')}>
              {f === 'all' ? t('oa.filterAll') : t(`accts.status.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-md sm:grid-cols-2">
        {shown.map((o) => {
          const pct = Math.round((o.availableMinor / o.limitMinor) * 100)
          const deals = salesPipeline.filter((q) => q.accountId === o.id && q.stage !== 'lost')
          const file = fileState(o, pick)
          const pipelineValue = deals.reduce((s, q) => s + q.valueMinor, 0)
          return (
            <button key={o.id} onClick={() => setDetail(o)} className="card card-hover p-lg flex flex-col gap-sm text-start">
              <div className="flex items-start justify-between gap-sm">
                <div className="flex items-center gap-sm min-w-0">
                  <span className="grid place-items-center w-10 h-10 rounded-md bg-primary/10 text-primary-hover shrink-0"><Building2 size={18} /></span>
                  <div className="min-w-0">
                    <h3 className="font-serif text-card-title text-ink truncate">{pick(o.name)}</h3>
                    <p className="font-sans text-caption text-ink-subtle">{pick(o.type)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-xxs shrink-0">
                  <StatusBadge variant={tierVariant[o.tier]}>{o.tier}</StatusBadge>
                  <StatusBadge variant={statusVariant[o.status]}>{t(`accts.status.${o.status}`)}</StatusBadge>
                  {/* how far this account's distributor file has got — scannable across the directory */}
                  <StatusBadge variant={file.variant}>{file.label}</StatusBadge>
                </div>
              </div>
              <div className="flex flex-col gap-xxs">
                <div className="flex items-center justify-between font-sans text-caption text-ink-muted">
                  <span>{t('accts.available')}</span>
                  <span className="tabular-nums text-ink">{money(o.availableMinor)} / {money(o.limitMinor)}</span>
                </div>
                <div className="h-1.5 rounded-pill bg-canvas-cool overflow-hidden">
                  <span className="block h-full bg-success/60" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-xxs font-sans text-caption">
                <span className="inline-flex items-center gap-xs text-ink-subtle"><Briefcase size={13} /> {deals.length} {t('accts.openDeals')}</span>
                <span className="text-ink tabular-nums">{money(pipelineValue)}</span>
              </div>
            </button>
          )
        })}
      </div>

      <AccountDetailModal
        account={detail}
        requests={requests}
        onClose={() => setDetail(null)}
        onRequest={(app) => setRequests((p) => [app, ...p])}
      />
    </div>
  )
}

/**
 * What a reviewer at Jaz needs from an account's distributor file without opening the
 * partner's portal: how complete it is, what is still owed, the handful of answers that
 * decide whether the account can be served — and the whole file as a document.
 * Read-only on purpose: the answers belong to the account, not to us.
 */
function DistributorFileReview({ account }: { account: OrgSummary }) {
  const { pick, locale } = useLocale()
  const channel = account.fileChannel

  if (!channel) {
    return (
      <div className="rounded-lg border border-hairline p-md flex items-start gap-sm">
        <ClipboardList size={16} className="text-ink-subtle mt-0.5 shrink-0" />
        <div>
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Distributor file', ar: 'ملف الموزّع' })}</h4>
          <p className="font-sans text-caption text-ink-subtle">
            {pick({ en: 'Not started — the account fills this in from its own portal during onboarding.', ar: 'لم يبدأ — تعبّئه المنشأة من بوابتها أثناء التأهيل.' })}
          </p>
        </div>
      </div>
    )
  }

  const values = distributorProfileSeed[channel]
  const done = completeness(values, channel)
  // the answers a reviewer actually reads before serving the account
  const headline = ['markets', 'annual_commitment', 'incoterm_pref', 'temp_range'] as const
  const fields = profileFields(channel)

  return (
    <div className="rounded-lg border border-hairline p-md flex flex-col gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h4 className="font-serif text-card-title text-ink inline-flex items-center gap-sm">
          <ClipboardList size={16} className="text-primary-hover" /> {pick({ en: 'Distributor file', ar: 'ملف الموزّع' })}
        </h4>
        <div className="flex items-center gap-xs">
          <StatusBadge variant={done.missing.length === 0 ? 'success' : 'gold'}>
            {done.pct}% · {done.filled}/{done.total}
          </StatusBadge>
          <button
            onClick={() => openDistributorFilePdf({
              channel, values, accountName: account.name,
              entity: [
                { label: { en: 'Account type', ar: 'نوع الحساب' }, value: pick(account.type) },
                { label: { en: 'Tier', ar: 'الفئة' }, value: account.tier.toUpperCase() },
              ],
            }, { locale, pick })}
            className={buttonClass('secondary', 'sm')}
          >
            <FileText size={15} /> {pick({ en: 'Open the file (PDF)', ar: 'فتح الملف (PDF)' })}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-md gap-y-sm">
        {headline.map((id) => {
          const f = fields.find((x) => x.id === id)
          if (!f) return null
          const shown = displayValue(f, values[id], channel, pick)
          return (
            <div key={id} className="flex flex-col gap-xxs">
              <span className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle">{pick(packValue(f.label, channel))}</span>
              <span className={cn('font-sans text-data', shown ? 'text-ink' : 'text-ink-subtle italic')}>
                {shown ?? pick({ en: 'Not answered yet', ar: 'لم يُجب بعد' })}
              </span>
            </div>
          )
        })}
      </div>

      {done.missing.length > 0 && (
        <p className="font-sans text-caption text-ink-muted">
          <span className="text-primary-hover">{done.missing.length} {pick({ en: 'required answers outstanding', ar: 'إجابة مطلوبة معلّقة' })}:</span>{' '}
          {done.missing.map((f) => pick(packValue(f.label, channel))).join(' · ')}
        </p>
      )}
    </div>
  )
}

function AccountDetailModal({ account, requests, onClose, onRequest }: {
  account: OrgSummary | null
  requests: CreditApplication[]
  onClose: () => void
  onRequest: (app: CreditApplication) => void
}) {
  const { t, pick, money } = useLocale()
  const { persona } = useChannel()
  const [showForm, setShowForm] = useState(false)
  const [newLimit, setNewLimit] = useState('')
  const [reason, setReason] = useState('')
  const [sent, setSent] = useState(false)
  if (!account) return null

  const used = account.limitMinor - account.availableMinor
  const utilPct = Math.round((used / account.limitMinor) * 100)
  const deals = salesPipeline.filter((q) => q.accountId === account.id && q.stage !== 'lost')
  const accountReqs = requests.filter((r) => r.org.en === account.name.en)
  const valid = Number(newLimit) * 100 > account.limitMinor && reason.trim().length > 4

  const submit = () => {
    onRequest({
      id: `ca-${Date.now()}`, org: account.name, kind: account.limitMinor > 0 ? 'limit_increase' : 'new',
      requestedLimitMinor: Number(newLimit) * 100, currentLimitMinor: account.limitMinor,
      requestedBy: persona.name, justification: { en: reason, ar: reason }, status: 'submitted',
      submittedAt: '2026-06-21', riskRating: 'low',
    })
    setSent(true); setShowForm(false); setNewLimit(''); setReason('')
    setTimeout(() => setSent(false), 2600)
  }

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick(account.type)} title={pick(account.name)}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{t('cta.back')}</button>}>
      <div className="flex flex-col gap-lg">
        <div className="flex items-center gap-sm">
          <StatusBadge variant={tierVariant[account.tier]}>{account.tier}</StatusBadge>
          <StatusBadge variant={statusVariant[account.status]}>{t(`accts.status.${account.status}`)}</StatusBadge>
        </div>

        {/* credit */}
        <div className="grid sm:grid-cols-[auto_1fr] gap-lg items-center">
          <div className="grid place-items-center">
            <UtilizationGauge
              segments={[{ value: used, color: '#b08a57' }, { value: account.availableMinor, color: '#355c4b' }]}
              centerValue={`${utilPct}%`}
              centerLabel={t('oa.utilised')}
              size={132}
            />
          </div>
          <div className="grid grid-cols-3 gap-md">
            <Mini label={t('credit.available')} value={money(account.availableMinor)} color="#355c4b" />
            <Mini label={t('accts.used')} value={money(used)} color="#b08a57" />
            <Mini label={t('credit.limit')} value={money(account.limitMinor)} />
          </div>
        </div>

        {/* the account's distributor file — read-only here; the account owns the answers */}
        <DistributorFileReview account={account} />

        {/* credit-increase request (segregation of duties → finance approves) */}
        <div className="rounded-lg border border-hairline p-md flex flex-col gap-sm">
          <div className="flex items-center justify-between gap-sm">
            <h4 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><FileText size={16} className="text-primary-hover" /> {t('accts.creditRequests')}</h4>
            {!showForm && <button onClick={() => setShowForm(true)} className={buttonClass('secondary', 'sm')}><ArrowUpRight size={15} /> {t('accts.requestIncrease')}</button>}
          </div>

          {sent && (
            <p className="inline-flex items-center gap-xs font-sans text-caption text-success"><CheckCircle2 size={14} /> {t('accts.requestSent')}</p>
          )}

          {showForm && (
            <div className="flex flex-col gap-sm rounded-md bg-surface-2 border border-hairline p-md">
              <div className="flex flex-col sm:flex-row gap-sm">
                <label className="flex flex-col gap-xs flex-1">
                  <span className="label">{t('accts.newLimit')} (﷼)</span>
                  <input value={newLimit} onChange={(e) => setNewLimit(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={String(Math.round(account.limitMinor / 100) * 2)} className="input" />
                </label>
              </div>
              <label className="flex flex-col gap-xs">
                <span className="label">{t('oa.justification')}</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={t('accts.reasonPlaceholder')} className="input resize-none" />
              </label>
              <p className="inline-flex items-start gap-xs font-sans text-caption text-ink-subtle"><Lock size={13} className="mt-0.5 shrink-0" /> {t('accts.sodNote')}</p>
              <div className="flex items-center gap-xs">
                <button onClick={() => setShowForm(false)} className={buttonClass('ghost', 'sm')}>{t('common.cancel')}</button>
                <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{t('oa.submitRequest')}</button>
              </div>
            </div>
          )}

          {accountReqs.length > 0 ? (
            <ul className="flex flex-col gap-xs">
              {accountReqs.map((r) => (
                <li key={r.id} className="flex items-center gap-sm rounded-md bg-surface-1 border border-hairline px-md py-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-data text-ink tabular-nums">{money(r.currentLimitMinor)} → {money(r.requestedLimitMinor)}</p>
                    <p className="font-sans text-caption text-ink-subtle truncate">{pick(r.justification)}</p>
                  </div>
                  <StatusBadge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'gold'}>
                    {r.status === 'approved' || r.status === 'rejected' ? t(`capp.${r.status}`) : t(`capp.status.${r.status}`)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            !showForm && <p className="font-sans text-caption text-ink-subtle">{t('accts.noRequests')}</p>
          )}
        </div>

        {/* deals */}
        <div className="flex flex-col gap-sm">
          <h4 className="font-serif text-card-title text-ink inline-flex items-center gap-sm"><Briefcase size={16} className="text-primary-hover" /> {t('accts.dealsTitle')} · {deals.length}</h4>
          {deals.length > 0 ? (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {deals.map((q) => (
                <li key={q.id} className="flex items-center gap-md py-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-data text-ink truncate">{q.ref}</p>
                    <p className="font-sans text-caption text-ink-subtle truncate">{pick(q.note)}</p>
                  </div>
                  <StatusBadge variant={stageVariant[q.stage]}>{t(`pipe.stage.${q.stage}`)}</StatusBadge>
                  <span className="font-sans text-data text-ink tabular-nums shrink-0">{money(q.valueMinor)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-sans text-caption text-ink-subtle">{t('accts.noDeals')}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-xxs">
      <span className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-wide text-ink-subtle">
        {color && <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />}{label}
      </span>
      <span className="font-serif text-card-title text-ink tabular-nums">{value}</span>
    </div>
  )
}
