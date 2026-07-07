import { useState } from 'react'
import { Globe, ArrowRight, MapPin, Check, Snowflake, PackageCheck, Truck } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { exportOrders, exportFlow, type ExportOrder, type ExportStage } from '@/data/ownerVendors'
import { cn } from '@/lib/cn'
import { PanelHead, StatCard, Pill } from './_shared'
import type { Bilingual } from '@/data/types'
import type { LucideIcon } from 'lucide-react'

const stageColor = ['#365766', '#8a6b3f', '#b08a57', '#2f7d5b']
const LAST = (exportFlow.length - 1) as ExportStage

// Cold-chain checkpoints aligned to the 4 export stages.
const checkpoints: { icon: LucideIcon; title: Bilingual; detail: Bilingual }[] = [
  { icon: PackageCheck, title: { en: 'Order received', ar: 'استلام الطلب' }, detail: { en: 'Booked & documented', ar: 'حُجز ووُثّق' } },
  { icon: Snowflake, title: { en: 'Packed & flash-chilled', ar: 'التعبئة والتبريد السريع' }, detail: { en: 'Held at 16–18°C', ar: 'حُفظ عند ١٦–١٨°م' } },
  { icon: Truck, title: { en: 'In cold transit', ar: 'قيد النقل المبرّد' }, detail: { en: 'Customs cleared · reefer truck', ar: 'تخليص جمركي · شاحنة مبرّدة' } },
  { icon: Check, title: { en: 'Delivered', ar: 'تم التسليم' }, detail: { en: 'Signed at destination', ar: 'استُلم في الوجهة' } },
]

export function OwnerExport() {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const [stages, setStages] = useState<Record<string, ExportStage>>(() => Object.fromEntries(exportOrders.map((o) => [o.id, o.stage])))
  const [trackId, setTrackId] = useState<string | null>(null)

  const advance = (id: string) => setStages((prev) => {
    const cur = prev[id]
    if (cur >= LAST) return prev
    const ns = (cur + 1) as ExportStage
    flash(`${id} → ${pick(exportFlow[ns].label)}`)
    return { ...prev, [id]: ns }
  })

  const totalMinor = exportOrders.reduce((a, o) => a + o.valueMinor, 0)
  const tracked = exportOrders.find((o) => o.id === trackId) ?? null

  return (
    <div className="flex flex-col gap-lg">
      <PanelHead title={pick({ en: 'Export clients', ar: 'عملاء التصدير' })} subtitle={pick({ en: 'GCC inbound orders · cold-chain export', ar: 'طلبات التصدير الخليجية · شحن مبرّد' })} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-sm">
        <StatCard label={pick({ en: 'Export orders', ar: 'طلبات التصدير' })} value={String(exportOrders.length)} sub={pick({ en: 'This cycle', ar: 'هذه الدورة' })} tone="dark" />
        <StatCard label={pick({ en: 'Total value', ar: 'إجمالي القيمة' })} value={money(totalMinor, { withSymbol: false })} unit={pick({ en: '﷼', ar: '﷼' })} sub={pick({ en: '4 GCC markets', ar: '٤ أسواق خليجية' })} tone="gold" />
        <StatCard label={pick({ en: 'In transit', ar: 'قيد الشحن' })} value={String(exportOrders.filter((o) => stages[o.id] === 2).length)} sub={pick({ en: 'Cold-chain', ar: 'سلسلة تبريد' })} tone="green" />
      </div>

      <div className="card overflow-hidden">
        <ul className="divide-y divide-hairline">
          {exportOrders.map((o) => {
            const st = stages[o.id]
            const canAdv = st < LAST
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-md px-lg py-md">
                <span className="grid place-items-center w-10 h-10 rounded-md bg-surface-2 border border-hairline text-primary-hover shrink-0"><Globe size={18} /></span>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-sm"><span className="font-sans text-data text-ink tabular-nums">{o.id}</span><Pill color={stageColor[st]} bg={stageColor[st] + '1a'}>{pick(exportFlow[st].label)}</Pill></div>
                  <p className="font-sans text-caption text-ink-subtle truncate">{pick(o.client)} · <span className="inline-flex items-center gap-xxs"><MapPin size={11} /> {pick(o.destination)}</span></p>
                </div>
                <div className="text-end">
                  <p className="font-sans text-data text-ink tabular-nums">{money(o.valueMinor)}</p>
                  <p className="font-sans text-caption text-ink-subtle tabular-nums">{o.qty.toLocaleString()} {pick({ en: 'units', ar: 'وحدة' })}</p>
                </div>
                <div className="flex items-center gap-xs">
                  {canAdv ? (
                    <button onClick={() => advance(o.id)} className={cn('inline-flex items-center gap-xxs rounded-md bg-primary text-on-primary px-3 py-1.5 font-sans text-caption hover:bg-primary-hover whitespace-nowrap')}><ArrowRight size={13} className="rtl:rotate-180" /> {pick({ en: 'Advance', ar: 'المتابعة' })}</button>
                  ) : (
                    <span className="font-sans text-caption text-success">{pick({ en: 'Delivered', ar: 'سُلّم' })} ✓</span>
                  )}
                  <button onClick={() => setTrackId(o.id)} className="rounded-md border border-hairline px-3 py-1.5 font-sans text-caption text-ink-muted hover:text-ink hover:border-ink/30">{pick({ en: 'Track', ar: 'تتبّع' })}</button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {tracked && <TrackModal order={tracked} stage={stages[tracked.id]} onClose={() => setTrackId(null)} />}
    </div>
  )
}

function TrackModal({ order, stage, onClose }: { order: ExportOrder; stage: ExportStage; onClose: () => void }) {
  const { pick, money } = useLocale()
  return (
    <Modal open onClose={onClose} size="md" eyebrow={order.id} title={pick(order.client)}
      footer={<button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Close', ar: 'إغلاق' })}</button>}>
      <div className="flex flex-col gap-lg">
        <div className="grid grid-cols-3 gap-md">
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Destination', ar: 'الوجهة' })}</span><span className="font-sans text-data text-ink inline-flex items-center gap-xxs"><MapPin size={13} /> {pick(order.destination)}</span></div>
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Units', ar: 'الوحدات' })}</span><span className="font-sans text-data text-ink tabular-nums">{order.qty.toLocaleString()}</span></div>
          <div className="flex flex-col gap-xxs"><span className="label !mb-0">{pick({ en: 'Value', ar: 'القيمة' })}</span><span className="font-sans text-data text-ink tabular-nums">{money(order.valueMinor)}</span></div>
        </div>

        {/* cold-chain timeline */}
        <ol className="flex flex-col">
          {checkpoints.map((cp, i) => {
            const done = i < stage, cur = i === stage
            const Icon = cp.icon
            return (
              <li key={i} className="flex items-stretch gap-md">
                <div className="flex flex-col items-center">
                  <span className={cn('grid place-items-center w-9 h-9 rounded-pill border-2 shrink-0', done ? 'bg-success/15 border-success text-success' : cur ? 'bg-primary/10 border-primary text-primary-hover animate-pulse' : 'bg-surface-2 border-hairline-strong text-ink-subtle')}><Icon size={16} /></span>
                  {i < checkpoints.length - 1 && <span className={cn('w-0.5 flex-1 my-1 rounded-pill', i < stage ? 'bg-success/50' : 'bg-hairline')} />}
                </div>
                <div className={cn('pb-md', i === checkpoints.length - 1 && 'pb-0')}>
                  <p className={cn('font-sans text-data', done || cur ? 'text-ink' : 'text-ink-subtle')}>{pick(cp.title)}</p>
                  <p className="font-sans text-caption text-ink-subtle">{pick(cp.detail)}{cur && <span className="text-primary-hover"> · {pick({ en: 'current', ar: 'الحالية' })}</span>}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </Modal>
  )
}
