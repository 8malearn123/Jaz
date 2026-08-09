import { BadgeCheck, Container, Download, Megaphone, Percent, Store } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { buttonClass } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Misc'
import { openDistributorPackPdf } from '@/lib/distributorPackPdf'
import {
  distributorPack, loadingColumns, loadingRows, packRevision, packValue,
  PALLET, CONTAINER, type PackChannel, type PackSectionId,
} from '@/data/distributorPack'

const sectionIcon: Record<PackSectionId, typeof Percent> = {
  commercial: Percent,
  logistics: Container,
  marketing: Megaphone,
  merchandising: Store,
}

/**
 * The distributor information pack — the terms behind the account, in one place:
 * commercial, logistics, marketing and merchandising. The same panel serves the
 * HORECA portal and the export portal; `channel` decides which side of every
 * per-channel term is shown, and which catalogue the loading table is built from.
 */
export function DistributorPack({ channel }: { channel: PackChannel }) {
  const { pick, locale } = useLocale()
  const rows = loadingRows(channel)
  const cols = loadingColumns[channel]

  const channelLabel = channel === 'export'
    ? { en: 'Export distributor terms', ar: 'شروط موزّع التصدير' }
    : { en: 'HORECA operator terms', ar: 'شروط منشآت الضيافة' }

  return (
    <div className="flex flex-col gap-lg">
      {/* what this is, which revision, and a copy to take away */}
      <div className="card p-lg flex flex-wrap items-start justify-between gap-md">
        <div className="flex flex-col gap-xs min-w-0">
          <div className="flex flex-wrap items-center gap-sm">
            <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs">
              <BadgeCheck size={18} className="text-primary-hover" />
              {pick({ en: 'Distributor information pack', ar: 'حقيبة معلومات الموزّع' })}
            </h3>
            <StatusBadge variant="gold">{pick(channelLabel)}</StatusBadge>
          </div>
          <p className="font-sans text-data text-ink-muted max-w-prose">
            {pick({
              en: 'Everything the account is bound by before a season is planned — margins and territory, packing and papers, the marketing calendar and the shelf. These are the standing terms; the live figures for your credit and orders stay in their own tabs.',
              ar: 'كل ما يلتزم به الحساب قبل التخطيط لأي موسم — الهوامش والإقليم، والتعبئة والمستندات، والتقويم التسويقي والرفّ. هذه هي الشروط الثابتة، أما أرقامكم الحيّة للائتمان والطلبات فتبقى في تبويباتها.',
            })}
          </p>
          <span className="font-sans text-caption text-ink-subtle">{pick(packRevision)}</span>
        </div>
        <button onClick={() => openDistributorPackPdf(channel, { locale, pick })} className={buttonClass('secondary', 'sm')}>
          <Download size={15} /> {pick({ en: 'Download the pack', ar: 'تنزيل الحقيبة' })}
        </button>
      </div>

      {distributorPack.map((section) => {
        const Icon = sectionIcon[section.id]
        return (
          <div key={section.id} className="card overflow-hidden">
            <div className="bg-surface-2 px-lg py-md border-b border-hairline flex flex-wrap items-baseline gap-x-sm gap-y-xxs">
              <h3 className="font-serif text-card-title text-ink inline-flex items-center gap-xs">
                <Icon size={17} className="text-primary-hover self-center" /> {pick(section.label)}
              </h3>
              <p className="font-sans text-caption text-ink-subtle">{pick(section.blurb)}</p>
            </div>
            <dl className="divide-y divide-hairline">
              {section.items.map((item) => (
                <div key={item.key} className="px-lg py-md grid sm:grid-cols-[minmax(0,15rem)_1fr] gap-x-md gap-y-xxs">
                  <dt className="font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle sm:pt-0.5">{pick(item.label)}</dt>
                  <dd className="flex flex-col gap-xxs min-w-0">
                    <span className="font-sans text-data text-ink">{pick(packValue(item.value, channel))}</span>
                    {item.detail && <span className="font-sans text-caption text-ink-subtle">{pick(packValue(item.detail, channel))}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            {/* the packing figures the logistics terms keep pointing at */}
            {section.id === 'logistics' && (
              <div className="border-t border-hairline">
                <div className="px-lg py-md flex flex-wrap items-baseline justify-between gap-sm">
                  <h4 className="font-serif text-body text-ink">{pick({ en: 'Loading table', ar: 'جدول التحميل' })}</h4>
                  <span className="font-sans text-caption text-ink-subtle">
                    {channel === 'export'
                      ? pick({ en: `20' reefer ${CONTAINER.twentyFtPallets} pallets · 40' reefer ${CONTAINER.fortyFtPallets}`, ar: `حاوية ٢٠ قدم ${CONTAINER.twentyFtPallets} طبليات · ٤٠ قدم ${CONTAINER.fortyFtPallets}` })
                      : pick({ en: `Pallet ${PALLET.footprintMm} mm · max ${PALLET.maxGrossKg} kg`, ar: `طبلية ${PALLET.footprintMm} مم · بحد أقصى ${PALLET.maxGrossKg} كجم` })}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-2 text-start">
                        <th className="px-lg py-sm text-start font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle font-normal">SKU</th>
                        {([cols.unit, cols.moq, cols.packedIn, cols.dims, cols.grossKg, cols.perLoad]).map((c, i) => (
                          <th key={i} className="px-md py-sm text-start font-sans text-caption uppercase tracking-[0.08em] text-ink-subtle font-normal whitespace-nowrap">{pick(c)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {rows.map((r) => (
                        <tr key={r.sku}>
                          <td className="px-lg py-sm align-top">
                            <span className="font-sans text-data text-ink block">{r.sku}</span>
                            <span className="font-sans text-caption text-ink-subtle block">{pick(r.name)}</span>
                          </td>
                          <td className="px-md py-sm align-top font-sans text-caption text-ink-muted">{pick(r.unit)}</td>
                          <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums">{r.moq}</td>
                          <td className="px-md py-sm align-top font-sans text-caption text-ink-muted whitespace-nowrap">{r.packedIn}</td>
                          <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums whitespace-nowrap" dir="ltr">{r.dims}</td>
                          <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums">{r.grossKg}</td>
                          <td className="px-md py-sm align-top font-sans text-caption text-ink-muted tabular-nums">{r.perLoad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
