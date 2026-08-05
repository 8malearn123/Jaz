import { useMemo, useState } from 'react'
import { Plus, X, Trash2, FileText, Download, Layers, Power } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import type { Bilingual } from '@/data/types'
import {
  costCenterKinds, processSideMeta, processBasisMeta, applyProcesses, sumCharges, processesFor,
  type CostCenter, type CostCenterKind, type CostProcess, type ProcessBasis, type ProcessSide,
} from '@/data/costCenters'
import { useCostCenters } from '@/state/CostCenterContext'
import { openCostCenterReportPdf } from '@/lib/costCenterPdf'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, Pill, FilterChips, UtilBar } from './_shared'

export type AccountingView = 'centers' | 'entries' | 'reports'

/* ── parsers (Arabic digits tolerated, like every other owner form) ── */
const parseDecimal = (s: string) => {
  const n = parseFloat(toAsciiDigits(s).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}
const parseMinor = (s: string) => {
  const [whole, frac = ''] = toAsciiDigits(s).replace(/[^\d.]/g, '').split('.')
  return Math.max(0, (parseInt(whole || '0', 10) || 0) * 100 + (parseInt((frac + '00').slice(0, 2), 10) || 0))
}

/** Accounting — cost centres, their processes, the postings they collect and the PDF report. */
export function OwnerAccounting({ view = 'centers' }: { view?: AccountingView }) {
  const { pick } = useLocale()
  return (
    <div className="flex flex-col gap-lg">
      <PanelHead
        title={pick({ en: 'Accounting', ar: 'المحاسبة' })}
        subtitle={pick({
          en: 'Cost centres, the processes each one adds at the moment of sale and of purchase, and their reports',
          ar: 'مراكز التكلفة، والعمليات التي يضيفها كل مركز وقت البيع ووقت الشراء، وتقاريرها',
        })}
      />
      {view === 'centers' && <CentersView />}
      {view === 'entries' && <EntriesView />}
      {view === 'reports' && <ReportsView />}
    </div>
  )
}

/* ───────────── Cost centres ───────────── */
function CentersView() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { centers, entriesOf, totalsOfCenter, addCenter, toggleCenter, removeCenter, addProcess, removeProcess } = useCostCenters()
  const [newOpen, setNewOpen] = useState(false)
  const [procFor, setProcFor] = useState<CostCenter | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CostCenter | null>(null)

  const active = centers.filter((c) => c.active).length
  const processCount = centers.reduce((a, c) => a + c.processes.length, 0)
  const absorbed = centers.reduce((a, c) => a + totalsOfCenter(c.id).totalProcessMinor, 0)
  const budget = centers.reduce((a, c) => a + c.budgetMinor, 0)

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Cost centres', ar: 'مراكز التكلفة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Every centre carries its own cost processes — a percentage, a per-unit charge or a flat amount — added automatically to the document when a sale or a purchase is filed against it.',
            ar: 'كل مركز يحمل عمليات التكلفة الخاصة به — نسبة أو مبلغ لكل وحدة أو مبلغ ثابت — تُضاف تلقائيًا إلى المستند عند ترحيل عملية بيع أو شراء عليه.',
          })}</p>
        </div>
        <button onClick={() => setNewOpen(true)} className={buttonClass('primary', 'sm')}><Plus size={15} /> {pick({ en: 'Add cost centre', ar: 'إضافة مركز تكلفة' })}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Cost centres', ar: 'مراكز التكلفة' })} value={String(centers.length)} sub={`${active} ${pick({ en: 'active', ar: 'نشط' })}`} tone="dark" />
        <StatCard label={pick({ en: 'Cost processes', ar: 'عمليات التكلفة' })} value={String(processCount)} sub={pick({ en: 'Across all centres', ar: 'على كل المراكز' })} />
        <StatCard label={pick({ en: 'Absorbed', ar: 'المحمّل' })} value={money(absorbed, { withSymbol: false })} sub={pick({ en: 'Sale + purchase side', ar: 'جانبا البيع والشراء' })} tone="gold" />
        <StatCard label={pick({ en: 'Budgets', ar: 'الميزانيات' })} value={money(budget, { withSymbol: false })} sub={pick({ en: 'Period allocation', ar: 'مخصص الفترة' })} tone="green" />
      </div>

      <div className="flex flex-col gap-md">
        {centers.map((c) => {
          const meta = costCenterKinds[c.kind]
          const t = totalsOfCenter(c.id)
          const usedPct = c.budgetMinor > 0 ? Math.round((t.totalProcessMinor / c.budgetMinor) * 100) : 0
          return (
            <div key={c.id} className={cn('card overflow-hidden', !c.active && 'opacity-60')}>
              <div className="flex flex-wrap items-start justify-between gap-sm px-lg py-md bg-surface-2 border-b border-hairline">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className="font-sans text-data text-ink tabular-nums">{c.code}</span>
                    <h4 className="font-serif text-card-title text-ink truncate">{pick(c.name)}</h4>
                    <Pill color={meta.color} bg={meta.bg}>{pick(meta.label)}</Pill>
                    {!c.active && <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Suspended', ar: 'موقوف' })}</Pill>}
                  </div>
                  <p className="font-sans text-caption text-ink-subtle mt-xxs">
                    {c.manager ? pick(c.manager) : pick({ en: 'No responsible party', ar: 'بدون جهة مسؤولة' })}
                    {' · '}{c.processes.length} {pick({ en: 'processes', ar: 'عملية' })}
                    {' · '}{t.saleCount + t.purchaseCount} {pick({ en: 'documents filed', ar: 'مستند مُرحّل' })}
                  </p>
                </div>
                <div className="flex items-center gap-xs">
                  <button onClick={() => setProcFor(c)} className={buttonClass('secondary', 'sm')}><Plus size={14} /> {pick({ en: 'Add process', ar: 'إضافة عملية' })}</button>
                  <button onClick={() => { toggleCenter(c.id); flash(pick(c.active ? { en: `${c.code} suspended`, ar: `أُوقف ${c.code}` } : { en: `${c.code} activated`, ar: `فُعّل ${c.code}` })) }}
                    title={pick(c.active ? { en: 'Suspend', ar: 'إيقاف' } : { en: 'Activate', ar: 'تفعيل' })}
                    className="grid place-items-center w-8 h-8 rounded-md border border-hairline-strong text-ink-muted hover:text-ink hover:border-ink/40 transition-colors"><Power size={14} /></button>
                  <button onClick={() => setConfirmDelete(c)} title={pick({ en: 'Delete', ar: 'حذف' })}
                    className="grid place-items-center w-8 h-8 rounded-md border border-hairline-strong text-ink-subtle hover:text-danger hover:border-danger/40 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              {/* the processes this centre adds */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-hairline">
                      {[{ h: { en: 'Cost process', ar: 'عملية التكلفة' }, a: 'text-start' }, { h: { en: 'Added at', ar: 'تُضاف عند' }, a: 'text-start' }, { h: { en: 'Basis', ar: 'الأساس' }, a: 'text-start' }, { h: { en: 'Rate', ar: 'المعدل' }, a: 'text-end' }, { h: { en: 'Absorbed', ar: 'المحمّل' }, a: 'text-end' }, { h: { en: '', ar: '' }, a: 'text-end' }].map((x, i) => (
                        <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2', x.a)}>{pick(x.h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {c.processes.length === 0 && (
                      <tr><td colSpan={6} className="px-lg py-md font-sans text-caption text-ink-subtle">{pick({ en: 'No processes yet — nothing will be added to a document filed against this centre.', ar: 'لا توجد عمليات بعد — لن يُضاف شيء على المستندات المرحّلة على هذا المركز.' })}</td></tr>
                    )}
                    {c.processes.map((p) => {
                      const sm = processSideMeta[p.side]
                      const load = t.byProcess.filter((b) => b.processId === p.id).reduce((a, b) => a + b.amountMinor, 0)
                      return (
                        <tr key={p.id} className="border-b border-hairline last:border-0">
                          <td className="px-lg py-sm font-sans text-data text-ink">{pick(p.name)}{p.note && <span className="block font-sans text-caption text-ink-subtle">{pick(p.note)}</span>}</td>
                          <td className="px-lg py-sm"><Pill color={sm.color} bg={sm.bg}>{pick(sm.label)}</Pill></td>
                          <td className="px-lg py-sm font-sans text-caption text-ink-muted">{pick(processBasisMeta[p.basis].label)}</td>
                          <td className="px-lg py-sm text-end font-sans text-data text-ink tabular-nums whitespace-nowrap">{rateLabel(p, money, pick)}</td>
                          <td className="px-lg py-sm text-end font-sans text-data text-ink-muted tabular-nums whitespace-nowrap">{load > 0 ? money(load) : '—'}</td>
                          <td className="px-lg py-sm text-end">
                            <button onClick={() => removeProcess(c.id, p.id)} className="grid place-items-center w-7 h-7 rounded-md text-ink-subtle hover:text-danger ms-auto" aria-label={pick({ en: 'Remove process', ar: 'إزالة العملية' })}><X size={14} /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
                <span className="font-sans text-caption text-ink-muted tabular-nums">
                  {pick({ en: 'Sale side', ar: 'جانب البيع' })} {money(t.saleProcessMinor)} · {pick({ en: 'Purchase side', ar: 'جانب الشراء' })} {money(t.purchaseProcessMinor)}
                </span>
                <div className="flex items-center gap-sm min-w-[180px]">
                  {c.budgetMinor > 0 && (
                    <>
                      <span className="font-sans text-caption text-ink-subtle tabular-nums whitespace-nowrap">{money(t.totalProcessMinor)} / {money(c.budgetMinor)} · {usedPct}%</span>
                      <div className="w-24"><UtilBar pct={usedPct} color={usedPct > 100 ? '#b5403b' : '#b08a57'} /></div>
                    </>
                  )}
                  <SingleReportButton center={c} entries={entriesOf(c.id)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {newOpen && <AddCenterModal onClose={() => setNewOpen(false)} onSubmit={(c) => { const id = addCenter(c); flash(`${pick({ en: 'Cost centre added', ar: 'أُضيف مركز التكلفة' })} ${id}`) }} />}
      {procFor && <AddProcessModal center={procFor} onClose={() => setProcFor(null)} onSubmit={(p) => { addProcess(procFor.id, p); flash(`${pick(p.name)} → ${procFor.code}`) }} />}
      {confirmDelete && (
        <ConfirmDialog
          open
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => { removeCenter(confirmDelete.id); flash(`${pick({ en: 'Deleted', ar: 'حُذف' })} ${confirmDelete.code}`) }}
          title={pick({ en: 'Delete this cost centre?', ar: 'حذف مركز التكلفة؟' })}
          message={pick({
            en: `${confirmDelete.code} · ${pick(confirmDelete.name)} will no longer be selectable on sales or purchases. Entries already filed against it stay in the ledger and in its reports.`,
            ar: `${confirmDelete.code} · ${pick(confirmDelete.name)} لن يعود متاحًا للاختيار في المبيعات أو المشتريات. القيود المرحّلة عليه تبقى في السجل وفي تقاريره.`,
          })}
          confirmLabel={pick({ en: 'Yes, delete it', ar: 'نعم، احذفه' })}
        />
      )}
    </div>
  )
}

/** How a process's configured rate reads on screen. */
function rateLabel(p: CostProcess, money: (m: number, o?: { withSymbol?: boolean }) => string, pick: <T,>(b: { en: T; ar: T }) => T): string {
  if (p.basis === 'pct') return `${p.rate}%`
  if (p.basis === 'per_unit') return `${money(p.rate)} / ${pick({ en: 'unit', ar: 'وحدة' })}`
  return `${money(p.rate)} / ${pick({ en: 'doc', ar: 'مستند' })}`
}

/* ───────────── Entries (the posting ledger) ───────────── */
function EntriesView() {
  const { pick, money } = useLocale()
  const { entries, centers, centerOf } = useCostCenters()
  const [side, setSide] = useState<'all' | 'sale' | 'purchase'>('all')
  const [center, setCenter] = useState<string>('all')

  const shown = entries.filter((e) => (side === 'all' || e.side === side) && (center === 'all' || e.centerId === center))
  const baseTotal = shown.reduce((a, e) => a + e.baseMinor, 0)
  const loadTotal = shown.reduce((a, e) => a + e.processMinor, 0)

  const sideChips = [
    { id: 'all' as const, label: pick({ en: 'All', ar: 'الكل' }), count: entries.length },
    { id: 'sale' as const, label: pick({ en: 'Sales', ar: 'المبيعات' }), count: entries.filter((e) => e.side === 'sale').length },
    { id: 'purchase' as const, label: pick({ en: 'Purchases', ar: 'المشتريات' }), count: entries.filter((e) => e.side === 'purchase').length },
  ]

  return (
    <div className="flex flex-col gap-md">
      <div className="min-w-0">
        <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Cost centre entries', ar: 'قيود مراكز التكلفة' })}</h3>
        <p className="font-sans text-caption text-ink-subtle mt-xxs">{pick({
          en: 'Every sale and purchase filed against a centre, with the processes that were added at that moment',
          ar: 'كل عملية بيع وشراء مُرحّلة على مركز، ومعها العمليات التي أُضيفت في تلك اللحظة',
        })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-md">
        <FilterChips chips={sideChips} active={side} onChange={setSide} label={pick({ en: 'Side', ar: 'الجانب' })} />
        <select value={center} onChange={(e) => setCenter(e.target.value)} className="input cursor-pointer w-auto py-1.5">
          <option value="all">{pick({ en: 'All cost centres', ar: 'كل مراكز التكلفة' })}</option>
          {centers.map((c) => <option key={c.id} value={c.id}>{c.code} · {pick(c.name)}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-surface-2 border-b border-hairline">
                {[{ h: { en: 'Entry · document', ar: 'القيد · المستند' }, a: 'text-start' }, { h: { en: 'Cost centre', ar: 'مركز التكلفة' }, a: 'text-start' }, { h: { en: 'Party', ar: 'الطرف' }, a: 'text-start' }, { h: { en: 'Base amount', ar: 'المبلغ الأساس' }, a: 'text-end' }, { h: { en: 'Processes added', ar: 'العمليات المضافة' }, a: 'text-start' }, { h: { en: 'Load', ar: 'التحميل' }, a: 'text-end' }].map((x, i) => (
                  <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', x.a)}>{pick(x.h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={6} className="px-lg py-lg text-center font-sans text-data text-ink-subtle">{pick({
                  en: 'Nothing filed yet. Create a manual order or enter a purchase invoice and pick a cost centre — the entry appears here.',
                  ar: 'لا توجد قيود بعد. أنشئ طلبًا يدويًا أو أدخل فاتورة مشتريات واختر مركز تكلفة — يظهر القيد هنا.',
                })}</td></tr>
              )}
              {shown.map((e) => {
                const c = centerOf(e.centerId)
                const sm = processSideMeta[e.side]
                return (
                  <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors align-top">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-sm">
                        <span className="font-sans text-data text-ink tabular-nums">{e.ref}</span>
                        <Pill color={sm.color} bg={sm.bg}>{pick(e.side === 'sale' ? { en: 'Sale', ar: 'بيع' } : { en: 'Purchase', ar: 'شراء' })}</Pill>
                      </div>
                      <p className="font-sans text-caption text-ink-subtle">{e.id} · {pick(e.at)}{e.by && ` · ${pick(e.by)}`}</p>
                    </td>
                    <td className="px-lg py-md font-sans text-data text-ink">{c ? `${c.code} · ${pick(c.name)}` : e.centerId}</td>
                    <td className="px-lg py-md font-sans text-data text-ink-muted truncate max-w-[180px]">{pick(e.party)}</td>
                    <td className="px-lg py-md text-end font-sans text-data text-ink tabular-nums whitespace-nowrap">{money(e.baseMinor)}<span className="block font-sans text-caption text-ink-subtle">{e.qty.toLocaleString()} {pick({ en: 'units', ar: 'وحدة' })}</span></td>
                    <td className="px-lg py-md">
                      <ul className="flex flex-col gap-xxs">
                        {e.charges.map((ch) => (
                          <li key={ch.processId} className="font-sans text-caption text-ink-muted tabular-nums">
                            {pick(ch.name)} <span className="text-ink-subtle">({ch.basis === 'pct' ? `${ch.rate}%` : money(ch.rate)})</span> · {money(ch.amountMinor)}
                          </li>
                        ))}
                        {e.charges.length === 0 && <li className="font-sans text-caption text-ink-subtle">—</li>}
                      </ul>
                    </td>
                    <td className="px-lg py-md text-end font-sans text-data text-primary-hover tabular-nums whitespace-nowrap">{money(e.processMinor)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
          <span className="font-sans text-caption text-ink-muted">{shown.length} {pick({ en: 'entries', ar: 'قيد' })}</span>
          <span className="font-sans text-caption text-ink-muted tabular-nums">
            {pick({ en: 'Base', ar: 'الأساس' })} {money(baseTotal)} · {pick({ en: 'Process load', ar: 'تحميل العمليات' })} <span className="text-primary-hover">{money(loadTotal)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ───────────── Reports → PDF ───────────── */
function ReportsView() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { centers, entries, entriesOf, totalsOfCenter } = useCostCenters()
  const [scope, setScope] = useState<string>('all')
  const [side, setSide] = useState<'all' | 'sale' | 'purchase'>('all')
  const [includeEntries, setIncludeEntries] = useState(true)
  const [period, setPeriod] = useState('')

  const inScope = scope === 'all' ? centers : centers.filter((c) => c.id === scope)
  const sections = useMemo(() => inScope.map((c) => {
    const list = entriesOf(c.id).filter((e) => side === 'all' || e.side === side)
    return { center: c, entries: list, totals: totalsOfCenter(c.id) }
  }), [inScope, entriesOf, totalsOfCenter, side])
  // Totals follow the chosen side so the preview and the PDF agree on what is being reported.
  const rows = sections.map((s) => {
    const saleLoad = side === 'purchase' ? 0 : s.totals.saleProcessMinor
    const purchaseLoad = side === 'sale' ? 0 : s.totals.purchaseProcessMinor
    return { ...s, saleLoad, purchaseLoad, total: saleLoad + purchaseLoad }
  })
  const grand = rows.reduce((a, r) => a + r.total, 0)

  const periodLabel: Bilingual = period.trim() !== ''
    ? { en: period.trim(), ar: period.trim() }
    : { en: 'Current period', ar: 'الفترة الحالية' }

  const exportPdf = () => {
    openCostCenterReportPdf({
      side,
      scope: scope === 'all' ? { en: 'All cost centres', ar: 'كل مراكز التكلفة' } : (inScope[0]?.name ?? { en: '—', ar: '—' }),
      periodLabel,
      issuedOn: new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      sections: rows.map((r) => ({
        center: r.center,
        entries: r.entries,
        // Zero the side that was filtered out so the printed breakdown matches the header.
        totals: {
          ...r.totals,
          saleProcessMinor: r.saleLoad,
          purchaseProcessMinor: r.purchaseLoad,
          totalProcessMinor: r.total,
          saleBaseMinor: side === 'purchase' ? 0 : r.totals.saleBaseMinor,
          purchaseBaseMinor: side === 'sale' ? 0 : r.totals.purchaseBaseMinor,
          saleCount: side === 'purchase' ? 0 : r.totals.saleCount,
          purchaseCount: side === 'sale' ? 0 : r.totals.purchaseCount,
          byProcess: r.totals.byProcess.filter((p) => side === 'all' || p.side === side),
        },
      })),
      includeEntries,
    }, { locale, pick, money })
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Cost centre reports', ar: 'تقارير مراكز التكلفة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Choose the scope, then export a printable PDF: a consolidated summary followed by each centre’s process breakdown and, if you want it, every posting behind the figures.',
            ar: 'اختر النطاق ثم صدّر ملف PDF قابلًا للطباعة: ملخص مجمّع يتبعه تفصيل عمليات كل مركز، ومعه — إن أردت — كل القيود خلف الأرقام.',
          })}</p>
        </div>
        <button onClick={exportPdf} className={buttonClass('primary', 'sm')}><Download size={15} /> {pick({ en: 'Export PDF', ar: 'تصدير PDF' })}</button>
      </div>

      <div className="card p-lg grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Cost centre', ar: 'مركز التكلفة' })}</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="input cursor-pointer">
            <option value="all">{pick({ en: 'All cost centres', ar: 'كل مراكز التكلفة' })}</option>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.code} · {pick(c.name)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Side', ar: 'الجانب' })}</span>
          <select value={side} onChange={(e) => setSide(e.target.value as 'all' | 'sale' | 'purchase')} className="input cursor-pointer">
            <option value="all">{pick({ en: 'Sales & purchases', ar: 'البيع والشراء' })}</option>
            <option value="sale">{pick({ en: 'Sales side only', ar: 'جانب البيع فقط' })}</option>
            <option value="purchase">{pick({ en: 'Purchases side only', ar: 'جانب الشراء فقط' })}</option>
          </select>
        </label>
        <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Period label', ar: 'وصف الفترة' })}</span>
          <input value={period} onChange={(e) => setPeriod(e.target.value)} className="input" placeholder={pick({ en: 'e.g. July 2026', ar: 'مثال: يوليو ٢٠٢٦' })} />
        </label>
        <label className="flex items-center gap-sm self-end pb-1.5 cursor-pointer">
          <input type="checkbox" checked={includeEntries} onChange={(e) => setIncludeEntries(e.target.checked)} className="w-4 h-4 accent-[#b08a57]" />
          <span className="font-sans text-data text-ink">{pick({ en: 'Include every posting', ar: 'تضمين كل القيود' })}</span>
        </label>
      </div>

      {/* on-screen preview of exactly what the PDF will carry */}
      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
          <FileText size={16} className="text-ink-subtle" />
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'Report preview', ar: 'معاينة التقرير' })}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-hairline">
                {[{ h: { en: 'Cost centre', ar: 'مركز التكلفة' }, a: 'text-start' }, { h: { en: 'Documents', ar: 'المستندات' }, a: 'text-end' }, { h: { en: 'Sale side', ar: 'جانب البيع' }, a: 'text-end' }, { h: { en: 'Purchase side', ar: 'جانب الشراء' }, a: 'text-end' }, { h: { en: 'Total absorbed', ar: 'إجمالي المحمّل' }, a: 'text-end' }, { h: { en: 'Budget used', ar: 'استهلاك الميزانية' }, a: 'text-end' }].map((x, i) => (
                  <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2.5', x.a)}>{pick(x.h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.center.id} className="border-b border-hairline last:border-0">
                  <td className="px-lg py-sm font-sans text-data text-ink">{r.center.code} · {pick(r.center.name)}</td>
                  <td className="px-lg py-sm text-end font-sans text-data text-ink-muted tabular-nums">{r.entries.length}</td>
                  <td className="px-lg py-sm text-end font-sans text-data text-ink-muted tabular-nums whitespace-nowrap">{money(r.saleLoad)}</td>
                  <td className="px-lg py-sm text-end font-sans text-data text-ink-muted tabular-nums whitespace-nowrap">{money(r.purchaseLoad)}</td>
                  <td className="px-lg py-sm text-end font-sans text-data text-ink tabular-nums whitespace-nowrap">{money(r.total)}</td>
                  <td className="px-lg py-sm text-end font-sans text-caption text-ink-subtle tabular-nums">{r.center.budgetMinor > 0 ? `${Math.round((r.total / r.center.budgetMinor) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-sm bg-surface-2 border-t border-hairline flex flex-wrap items-center justify-between gap-sm">
          <span className="font-sans text-caption text-ink-muted">{rows.length} {pick({ en: 'cost centres', ar: 'مركز تكلفة' })} · {entries.length} {pick({ en: 'entries in the ledger', ar: 'قيد في السجل' })}</span>
          <span className="font-sans text-caption text-ink tabular-nums">{pick({ en: 'Grand total', ar: 'الإجمالي العام' })} <span className="text-primary-hover">{money(grand)}</span></span>
        </div>
      </div>
    </div>
  )
}

/** One-centre PDF straight from its card. */
function SingleReportButton({ center, entries }: { center: CostCenter; entries: ReturnType<typeof useCostCenters>['entries'] }) {
  const { pick, money, locale } = useLocale()
  const { totalsOfCenter } = useCostCenters()
  return (
    <button
      onClick={() => openCostCenterReportPdf({
        side: 'all', scope: center.name, periodLabel: { en: 'Current period', ar: 'الفترة الحالية' },
        issuedOn: new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        sections: [{ center, entries, totals: totalsOfCenter(center.id) }], includeEntries: true,
      }, { locale, pick, money })}
      className={buttonClass('secondary', 'sm')}
    ><Download size={14} /> PDF</button>
  )
}

/* ───────────── modals ───────────── */
function AddCenterModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (c: { code: string; name: Bilingual; kind: CostCenterKind; manager?: Bilingual; budgetMinor: number }) => void }) {
  const { pick } = useLocale()
  const [en, setEn] = useState('')
  const [ar, setAr] = useState('')
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<CostCenterKind>('production')
  const [manager, setManager] = useState('')
  const [budget, setBudget] = useState('')

  const valid = en.trim() !== '' && ar.trim() !== '' && code.trim() !== ''
  const submit = () => {
    if (!valid) return
    onSubmit({
      code: code.trim().toUpperCase(),
      name: { en: en.trim(), ar: ar.trim() },
      kind,
      manager: manager.trim() === '' ? undefined : { en: manager.trim(), ar: manager.trim() },
      budgetMinor: parseMinor(budget),
    })
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" eyebrow={pick({ en: 'Accounting', ar: 'المحاسبة' })} title={pick({ en: 'Add cost centre', ar: 'إضافة مركز تكلفة' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add cost centre', ar: 'إضافة المركز' })}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="grid sm:grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Name (Arabic)', ar: 'الاسم بالعربية' })}</span>
            <input value={ar} onChange={(e) => setAr(e.target.value)} className="input" placeholder="مركز تكلفة…" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Name (English)', ar: 'الاسم بالإنجليزية' })}</span>
            <input value={en} onChange={(e) => setEn(e.target.value)} className="input" placeholder="Cost centre…" dir="ltr" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Accounting code', ar: 'الرمز المحاسبي' })}</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input tabular-nums" placeholder="CC-…" dir="ltr" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Type', ar: 'النوع' })}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as CostCenterKind)} className="input cursor-pointer">
              {(Object.keys(costCenterKinds) as CostCenterKind[]).map((k) => <option key={k} value={k}>{pick(costCenterKinds[k].label)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Responsible party', ar: 'الجهة المسؤولة' })}</span>
            <input value={manager} onChange={(e) => setManager(e.target.value)} className="input" placeholder={pick({ en: 'Department or person…', ar: 'قسم أو شخص…' })} />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Period budget (optional)', ar: 'ميزانية الفترة (اختياري)' })}</span>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} className="input tabular-nums" inputMode="decimal" placeholder="0" />
          </label>
        </div>
        <p className="font-sans text-caption rounded-lg bg-surface-2 border border-hairline p-md text-ink-subtle">
          {pick({
            en: 'The centre is created empty. Add its cost processes next — each one names a charge, the side it fires on (sale, purchase or both) and how it is valued.',
            ar: 'يُنشأ المركز فارغًا. أضف بعدها عمليات التكلفة الخاصة به — كل عملية باسمها والجانب الذي تُضاف عنده (بيع أو شراء أو كليهما) وطريقة احتسابها.',
          })}
        </p>
      </div>
    </Modal>
  )
}

function AddProcessModal({ center, onClose, onSubmit }: { center: CostCenter; onClose: () => void; onSubmit: (p: Omit<CostProcess, 'id'>) => void }) {
  const { pick, money } = useLocale()
  const [en, setEn] = useState('')
  const [ar, setAr] = useState('')
  const [side, setSide] = useState<ProcessSide>('sale')
  const [basis, setBasis] = useState<ProcessBasis>('pct')
  const [rateStr, setRateStr] = useState('')

  const rate = basis === 'pct' ? parseDecimal(rateStr) : parseMinor(rateStr)
  const valid = en.trim() !== '' && ar.trim() !== '' && rate > 0
  const submit = () => {
    if (!valid) return
    onSubmit({ name: { en: en.trim(), ar: ar.trim() }, side, basis, rate })
    onClose()
  }
  // Worked example on a 10,000 SAR / 100-unit document, so the rate is never abstract.
  const sample = basis === 'pct' ? Math.round((1000000 * rate) / 100) : basis === 'per_unit' ? rate * 100 : rate

  return (
    <Modal open onClose={onClose} size="lg" eyebrow={`${center.code} · ${pick(center.name)}`} title={pick({ en: 'Add cost process', ar: 'إضافة عملية تكلفة' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add process', ar: 'إضافة العملية' })}</button>
      </>}>
      <div className="flex flex-col gap-md">
        <div className="grid sm:grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Process name (Arabic)', ar: 'اسم العملية بالعربية' })}</span>
            <input value={ar} onChange={(e) => setAr(e.target.value)} className="input" placeholder="عمولة، شحن، رسوم…" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Process name (English)', ar: 'اسم العملية بالإنجليزية' })}</span>
            <input value={en} onChange={(e) => setEn(e.target.value)} className="input" placeholder="Commission, freight, fee…" dir="ltr" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Added at', ar: 'تُضاف عند' })}</span>
            <select value={side} onChange={(e) => setSide(e.target.value as ProcessSide)} className="input cursor-pointer">
              {(['sale', 'purchase', 'both'] as ProcessSide[]).map((s) => <option key={s} value={s}>{pick(processSideMeta[s].label)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Basis', ar: 'أساس الاحتساب' })}</span>
            <select value={basis} onChange={(e) => { setBasis(e.target.value as ProcessBasis); setRateStr('') }} className="input cursor-pointer">
              {(['pct', 'per_unit', 'fixed'] as ProcessBasis[]).map((b) => <option key={b} value={b}>{pick(processBasisMeta[b].label)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs sm:col-span-2"><span className="label">{basis === 'pct' ? pick({ en: 'Rate (%)', ar: 'النسبة (٪)' }) : pick({ en: 'Amount (SAR)', ar: 'المبلغ (ريال)' })}</span>
            <input value={rateStr} onChange={(e) => setRateStr(e.target.value)} className={cn('input tabular-nums', rateStr !== '' && rate <= 0 && 'border-danger')} inputMode="decimal" placeholder="0" />
            <span className="font-sans text-caption text-ink-subtle">{pick(processBasisMeta[basis].hint)}</span>
          </label>
        </div>
        {rate > 0 && (
          <p className="font-sans text-caption rounded-lg bg-primary/[0.05] border border-primary/20 p-md text-ink-muted tabular-nums">
            {pick({ en: 'On a 10,000 SAR document of 100 units, this process adds', ar: 'على مستند بقيمة ١٠٬٠٠٠ ريال و١٠٠ وحدة، تضيف هذه العملية' })} <span className="text-primary-hover">{money(sample)}</span>
          </p>
        )}
      </div>
    </Modal>
  )
}

/* ───────────── shared field — used by the sale and purchase desks ───────────── */

/**
 * Cost-centre picker with a live preview of exactly what the centre's processes will
 * add to this document. Shared by the manual-order form and the purchase-invoice form,
 * so a sale and a purchase are filed the same way.
 */
export function CostCenterField({ side, value, onChange, doc, required = false }: {
  side: 'sale' | 'purchase'
  value: string
  onChange: (id: string) => void
  doc: { amountMinor: number; qty: number }
  required?: boolean
}) {
  const { pick, money } = useLocale()
  const { activeCenters, centerOf } = useCostCenters()
  const cc = value ? centerOf(value) : undefined
  const charges = cc ? applyProcesses(cc, side, doc) : []
  const total = sumCharges(charges)
  const fires = cc ? processesFor(cc, side) : []

  return (
    <div className="flex flex-col gap-xs">
      <span className="label">{pick({ en: 'Cost centre', ar: 'مركز التكلفة' })}{required && <span className="text-danger"> *</span>}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn('input cursor-pointer', required && !value && 'border-danger')}>
        <option value="">{pick({ en: 'Not assigned', ar: 'غير مُسند' })}</option>
        {activeCenters.map((c) => <option key={c.id} value={c.id}>{c.code} · {pick(c.name)}</option>)}
      </select>
      {cc && (
        <div className="rounded-md border border-hairline-strong bg-surface-2/60 divide-y divide-hairline">
          <div className="flex items-center gap-xs px-3 py-2">
            <Layers size={14} className="text-ink-subtle shrink-0" />
            <span className="font-sans text-caption text-ink-muted">
              {fires.length > 0
                ? pick(side === 'sale'
                  ? { en: 'Added to this order at the moment of sale', ar: 'تُضاف على هذا الطلب وقت البيع' }
                  : { en: 'Added to this invoice at the moment of purchase', ar: 'تُضاف على هذه الفاتورة وقت الشراء' })
                : pick({ en: 'This centre has no process on this side — nothing will be added.', ar: 'لا توجد عمليات لهذا المركز على هذا الجانب — لن يُضاف شيء.' })}
            </span>
          </div>
          {charges.map((ch) => (
            <div key={ch.processId} className="flex items-center justify-between gap-sm px-3 py-1.5">
              <span className="font-sans text-caption text-ink truncate">{pick(ch.name)} <span className="text-ink-subtle">({ch.basis === 'pct' ? `${ch.rate}%` : ch.basis === 'per_unit' ? `${money(ch.rate)}/${pick({ en: 'unit', ar: 'وحدة' })}` : money(ch.rate)})</span></span>
              <span className="font-sans text-caption text-ink tabular-nums shrink-0">{money(ch.amountMinor)}</span>
            </div>
          ))}
          {charges.length > 0 && (
            <div className="flex items-center justify-between gap-sm px-3 py-2">
              <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Cost centre load', ar: 'تحميل مركز التكلفة' })}</span>
              <span className="font-sans text-data text-primary-hover tabular-nums">{money(total)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
