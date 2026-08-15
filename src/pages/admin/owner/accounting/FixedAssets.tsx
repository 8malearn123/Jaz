import { useMemo, useState } from 'react'
import { Building2, Plus, CalendarClock } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Confirm'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { openAccountingReportPdf } from '@/lib/accountingPdf'
import { downloadExcel } from '@/lib/excel'
import { assetCategoryMeta, depreciationSchedule, runTotal, type AssetCategory, type FixedAsset } from '@/data/fixedAssets'
import { assetPurchaseEntry, depreciationEntry } from '@/lib/postingRules'
import { useLedger } from '@/state/LedgerContext'
import { useCostCenters } from '@/state/CostCenterContext'
import { StatCard, Pill, UtilBar } from '../_shared'
import { Amount, EmptyRow, ExportBar, Head, sheetAmount, useIssuedOn } from './_bits'

const parseMinor = (s: string) => {
  const [whole, frac = ''] = toAsciiDigits(s).replace(/[^\d.]/g, '').split('.')
  return Math.max(0, (parseInt(whole || '0', 10) || 0) * 100 + (parseInt((frac + '00').slice(0, 2), 10) || 0))
}
const parseInt10 = (s: string) => Math.max(0, parseInt(toAsciiDigits(s).replace(/\D/g, ''), 10) || 0)

/**
 * The fixed-asset register. An asset is bought once and consumed over years, so its cost
 * never lands in one month: it is capitalised here and released to the income statement a
 * month at a time. Running the month's depreciation posts a real entry — a line per asset,
 * each carrying the cost centre that uses it.
 */
export function FixedAssets() {
  const { pick, money, locale } = useLocale()
  const { flash } = useToast()
  const { assets, depreciationRuns, periods, post, isLocked } = useLedger()
  const { centerOf } = useCostCenters()
  const issuedOn = useIssuedOn()
  const [addOpen, setAddOpen] = useState(false)
  const [confirmRun, setConfirmRun] = useState(false)

  const openPeriod = periods.find((p) => !p.closed)
  const schedule = useMemo(() => depreciationSchedule(assets, depreciationRuns), [assets, depreciationRuns])

  const costTotal = schedule.reduce((s, r) => s + r.asset.costMinor, 0)
  const accumTotal = schedule.reduce((s, r) => s + r.accumulatedMinor, 0)
  const nbvTotal = schedule.reduce((s, r) => s + r.netBookValueMinor, 0)
  const monthlyTotal = runTotal(schedule)

  const canRun = monthlyTotal > 0 && openPeriod != null && !isLocked(openPeriod.key)

  const runDepreciation = () => {
    if (!openPeriod) return
    const draft = depreciationEntry({
      date: `${openPeriod.key}-28`,
      period: openPeriod.key,
      assets,
      monthsPosted: depreciationRuns,
    })
    if (!draft) return
    const r = post(draft)
    flash(r.ok
      ? `${pick({ en: 'Depreciation posted', ar: 'رُحّل الإهلاك' })} · ${r.entry.no} · ${money(monthlyTotal)}`
      : pick(r.problems[0]))
  }

  const exportPdf = () => {
    openAccountingReportPdf({
      title: pick({ en: 'Fixed asset register', ar: 'سجل الأصول الثابتة' }),
      subtitle: `Jaz · ${pick({ en: 'Straight-line depreciation', ar: 'إهلاك بالقسط الثابت' })}`,
      meta: [
        { label: pick({ en: 'Assets', ar: 'عدد الأصول' }), value: String(assets.length) },
        { label: pick({ en: 'Cost', ar: 'التكلفة' }), value: money(costTotal) },
        { label: pick({ en: 'Accumulated depreciation', ar: 'مجمع الإهلاك' }), value: money(accumTotal) },
        { label: pick({ en: 'Net book value', ar: 'صافي القيمة الدفترية' }), value: money(nbvTotal) },
        { label: pick({ en: 'Monthly charge', ar: 'قسط الشهر' }), value: money(monthlyTotal) },
        { label: pick({ en: 'Issued on', ar: 'تاريخ الإصدار' }), value: issuedOn },
      ],
      tables: [{
        head: [
          { label: pick({ en: 'Asset', ar: 'الأصل' }) },
          { label: pick({ en: 'In service', ar: 'تاريخ التشغيل' }) },
          { label: pick({ en: 'Cost', ar: 'التكلفة' }), num: true },
          { label: pick({ en: 'Monthly', ar: 'القسط الشهري' }), num: true },
          { label: pick({ en: 'Accumulated', ar: 'المجمع' }), num: true },
          { label: pick({ en: 'Net book value', ar: 'صافي القيمة' }), num: true },
        ],
        empty: pick({ en: 'The register is empty', ar: 'السجل فارغ' }),
        rows: [
          ...schedule.map((r) => ({
            cells: [
              { text: `${r.asset.id} · ${pick(r.asset.name)}`, sub: pick(assetCategoryMeta[r.asset.category].label) },
              { text: pick(r.asset.inService) },
              { text: money(r.asset.costMinor), num: true },
              { text: r.retired ? '—' : money(r.monthlyMinor), num: true },
              { text: money(r.accumulatedMinor), num: true },
              { text: money(r.netBookValueMinor), num: true },
            ],
          })),
          {
            cells: [
              { text: pick({ en: 'Totals', ar: 'الإجماليات' }), strong: true },
              { text: '' },
              { text: money(costTotal), num: true, strong: true },
              { text: money(monthlyTotal), num: true, strong: true },
              { text: money(accumTotal), num: true, strong: true },
              { text: money(nbvTotal), num: true, strong: true },
            ],
            tone: 'grand' as const,
          },
        ],
      }],
      footnote: pick({
        en: 'Generated from the Jaz platform · accumulated depreciation is computed from the whole cost rather than by adding up rounded monthly charges, so an asset lands exactly on nil at the end of its life.',
        ar: 'صدر من منصة جاز · يُحتسب مجمع الإهلاك من كامل التكلفة لا بجمع أقساط شهرية مقرّبة، فينتهي الأصل عند الصفر تمامًا في نهاية عمره.',
      }),
    }, { rtl: locale === 'ar' })
    flash(pick({ en: 'Report opened — use “Save as PDF”', ar: 'فُتح التقرير — استخدم «حفظ بصيغة PDF»' }))
  }

  const exportExcel = () => downloadExcel(
    'fixed-assets',
    pick({ en: 'Fixed assets', ar: 'الأصول الثابتة' }),
    [
      [pick({ en: 'Asset', ar: 'الأصل' }), pick({ en: 'Category', ar: 'الفئة' }), pick({ en: 'In service', ar: 'تاريخ التشغيل' }), pick({ en: 'Life (months)', ar: 'العمر (أشهر)' }), pick({ en: 'Cost', ar: 'التكلفة' }), pick({ en: 'Monthly', ar: 'القسط الشهري' }), pick({ en: 'Accumulated', ar: 'المجمع' }), pick({ en: 'Net book value', ar: 'صافي القيمة' })],
      ...schedule.map((r) => [
        pick(r.asset.name), pick(assetCategoryMeta[r.asset.category].label), pick(r.asset.inService), r.asset.lifeMonths,
        sheetAmount(r.asset.costMinor), sheetAmount(r.monthlyMinor), sheetAmount(r.accumulatedMinor), sheetAmount(r.netBookValueMinor),
      ]),
      ['', '', '', '', sheetAmount(costTotal), sheetAmount(monthlyTotal), sheetAmount(accumTotal), sheetAmount(nbvTotal)],
    ],
  )

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Fixed assets', ar: 'الأصول الثابتة' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'What the business owns and uses for years — capitalised when bought, then released to the income statement one month at a time. Nothing here is an estimate: running the month posts a real entry.',
            ar: 'ما تملكه المنشأة وتستخدمه لسنوات — يُرسمل عند الشراء ثم يُحمَّل على قائمة الدخل شهرًا بعد شهر. لا شيء هنا تقديري: تشغيل إهلاك الشهر يُرحِّل قيدًا حقيقيًا.',
          })}</p>
        </div>
        <div className="flex items-center gap-xs">
          <button onClick={() => setAddOpen(true)} className={buttonClass('secondary', 'sm')}>
            <Plus size={14} /> {pick({ en: 'Add asset', ar: 'إضافة أصل' })}
          </button>
          <ExportBar onPdf={exportPdf} onExcel={exportExcel} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Cost', ar: 'التكلفة' })} value={money(costTotal, { withSymbol: false })} sub={`${assets.length} ${pick({ en: 'assets', ar: 'أصل' })}`} tone="dark" />
        <StatCard label={pick({ en: 'Accumulated depreciation', ar: 'مجمع الإهلاك' })} value={money(accumTotal, { withSymbol: false })} sub={`${depreciationRuns} ${pick({ en: 'runs posted', ar: 'دورة مُرحّلة' })}`} />
        <StatCard label={pick({ en: 'Net book value', ar: 'صافي القيمة الدفترية' })} value={money(nbvTotal, { withSymbol: false })} sub={pick({ en: 'What the balance sheet carries', ar: 'ما تحمله قائمة المركز المالي' })} tone="gold" />
        <StatCard label={pick({ en: 'Monthly charge', ar: 'قسط الشهر' })} value={money(monthlyTotal, { withSymbol: false })} sub={pick({ en: 'Next depreciation run', ar: 'دورة الإهلاك القادمة' })} tone="green" />
      </div>

      <div className="card p-lg flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-start gap-sm min-w-0">
          <span className="grid place-items-center w-8 h-8 rounded-md text-primary-hover bg-primary/10 shrink-0"><CalendarClock size={16} /></span>
          <div className="min-w-0">
            <p className="font-sans text-data text-ink">{pick({ en: 'Run this month’s depreciation', ar: 'تشغيل إهلاك هذا الشهر' })}</p>
            <p className="font-sans text-caption text-ink-subtle mt-xxs">
              {openPeriod
                ? pick({
                  en: `Posts ${money(monthlyTotal)} to depreciation for ${openPeriod.label.en}, a line per asset against the cost centre that uses it.`,
                  ar: `يُرحّل ${money(monthlyTotal)} إهلاكًا لفترة ${openPeriod.label.ar}، بسطر لكل أصل على مركز التكلفة الذي يستخدمه.`,
                })
                : pick({ en: 'Every period is closed — reopen one first.', ar: 'كل الفترات مقفلة — أعد فتح فترة أولًا.' })}
            </p>
          </div>
        </div>
        <button onClick={() => setConfirmRun(true)} disabled={!canRun} className={buttonClass('primary', 'sm')}>
          {pick({ en: 'Post the run', ar: 'ترحيل الدورة' })}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-lg py-md bg-surface-2 border-b border-hairline flex items-center gap-sm">
          <Building2 size={16} className="text-ink-subtle" />
          <h4 className="font-serif text-card-title text-ink">{pick({ en: 'The register', ar: 'السجل' })}</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <Head cols={[
              { label: { en: 'Asset', ar: 'الأصل' } },
              { label: { en: 'Cost centre', ar: 'مركز التكلفة' } },
              { label: { en: 'Life consumed', ar: 'المستهلك من العمر' } },
              { label: { en: 'Cost', ar: 'التكلفة' }, num: true },
              { label: { en: 'Monthly', ar: 'القسط الشهري' }, num: true },
              { label: { en: 'Accumulated', ar: 'المجمع' }, num: true },
              { label: { en: 'Net book value', ar: 'صافي القيمة' }, num: true },
            ]} />
            <tbody>
              {schedule.length === 0 && (
                <EmptyRow span={7}>{pick({ en: 'The register is empty.', ar: 'السجل فارغ.' })}</EmptyRow>
              )}
              {schedule.map((r) => {
                const meta = assetCategoryMeta[r.asset.category]
                const cc = r.asset.centerId ? centerOf(r.asset.centerId) : undefined
                const consumedPct = r.asset.lifeMonths > 0
                  ? Math.round(((r.asset.lifeMonths - r.remainingMonths) / r.asset.lifeMonths) * 100)
                  : 0
                return (
                  <tr key={r.asset.id} className={cn('border-b border-hairline last:border-0 hover:bg-surface-2/30 transition-colors', r.retired && 'opacity-60')}>
                    <td className="px-lg py-sm">
                      <div className="flex items-center gap-sm flex-wrap">
                        <span className="font-sans text-data text-ink tabular-nums">{r.asset.id}</span>
                        <span className="font-sans text-data text-ink">{pick(r.asset.name)}</span>
                        <Pill color={meta.color} bg={meta.bg}>{pick(meta.label)}</Pill>
                        {r.retired && <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Fully depreciated', ar: 'مُهلك بالكامل' })}</Pill>}
                      </div>
                      <span className="block font-sans text-caption text-ink-subtle">{pick(r.asset.inService)} · {r.asset.lifeMonths} {pick({ en: 'months', ar: 'شهرًا' })}</span>
                    </td>
                    <td className="px-lg py-sm font-sans text-caption text-ink-muted">{cc ? `${cc.code} · ${pick(cc.name)}` : '—'}</td>
                    <td className="px-lg py-sm">
                      <div className="flex items-center gap-sm">
                        <div className="w-20"><UtilBar pct={consumedPct} color={consumedPct >= 100 ? '#b5403b' : '#b08a57'} /></div>
                        <span className="font-sans text-caption text-ink-subtle tabular-nums whitespace-nowrap">
                          {consumedPct}% · {r.remainingMonths} {pick({ en: 'left', ar: 'متبقٍ' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.asset.costMinor} /></td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.monthlyMinor} tone="muted" /></td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.accumulatedMinor} tone="muted" /></td>
                    <td className="px-lg py-sm text-end"><Amount minor={r.netBookValueMinor} /></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2 border-t border-hairline-strong">
                <td colSpan={3} className="px-lg py-md font-sans text-caption uppercase tracking-wide text-ink-subtle">{pick({ en: 'Totals', ar: 'الإجماليات' })}</td>
                <td className="px-lg py-md text-end"><Amount minor={costTotal} dash={false} /></td>
                <td className="px-lg py-md text-end"><Amount minor={monthlyTotal} dash={false} /></td>
                <td className="px-lg py-md text-end"><Amount minor={accumTotal} dash={false} /></td>
                <td className="px-lg py-md text-end"><Amount minor={nbvTotal} tone="gold" dash={false} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {addOpen && <AddAssetModal onClose={() => setAddOpen(false)} />}
      {confirmRun && openPeriod && (
        <ConfirmDialog
          open
          onClose={() => setConfirmRun(false)}
          onConfirm={runDepreciation}
          title={pick({ en: 'Post this month’s depreciation?', ar: 'ترحيل إهلاك هذا الشهر؟' })}
          message={pick({
            en: `${money(monthlyTotal)} is charged to depreciation for ${openPeriod.label.en} and added to accumulated depreciation — a line per asset, on the cost centre that uses it. Fully depreciated assets are skipped.`,
            ar: `يُحمَّل ${money(monthlyTotal)} إهلاكًا لفترة ${openPeriod.label.ar} ويُضاف إلى مجمع الإهلاك — بسطر لكل أصل على مركز التكلفة الذي يستخدمه. وتُستثنى الأصول المُهلكة بالكامل.`,
          })}
          confirmLabel={pick({ en: 'Yes, post it', ar: 'نعم، رحّله' })}
        />
      )}
    </div>
  )
}

/** Add an asset — and capitalise it in the books at the same moment. */
function AddAssetModal({ onClose }: { onClose: () => void }) {
  const { pick, money } = useLocale()
  const { flash } = useToast()
  const { addAsset, post, periods } = useLedger()
  const { activeCenters } = useCostCenters()
  const openPeriod = periods.find((p) => !p.closed)

  const [en, setEn] = useState('')
  const [ar, setAr] = useState('')
  const [category, setCategory] = useState<AssetCategory>('equipment')
  const [cost, setCost] = useState('')
  const [years, setYears] = useState('5')
  const [centerId, setCenterId] = useState('')
  const [paid, setPaid] = useState(true)

  const costMinor = parseMinor(cost)
  const lifeMonths = parseInt10(years) * 12
  const valid = en.trim() !== '' && ar.trim() !== '' && costMinor > 0 && lifeMonths > 0 && openPeriod != null
  const monthly = lifeMonths > 0 ? Math.round(costMinor / lifeMonths) : 0

  const submit = () => {
    if (!valid || !openPeriod) return
    const asset: Omit<FixedAsset, 'id'> = {
      name: { en: en.trim(), ar: ar.trim() },
      category,
      costMinor,
      lifeMonths,
      // It enters service in the period it is bought in, so its life starts now.
      inService: openPeriod.label,
      openingMonths: 0,
      centerId: centerId === '' ? undefined : centerId,
    }
    const id = addAsset(asset)
    // Buying it is a purchase like any other — capitalised, not expensed, with its tax split out.
    const r = post(assetPurchaseEntry({
      date: `${openPeriod.key}-15`,
      asset: { ...asset, id },
      paid,
    }))
    flash(r.ok
      ? `${id} · ${money(costMinor)} · ${r.entry.no}`
      : pick(r.problems[0]))
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      eyebrow={pick({ en: 'Fixed assets', ar: 'الأصول الثابتة' })}
      title={pick({ en: 'Add an asset', ar: 'إضافة أصل ثابت' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Capitalise it', ar: 'رسملة الأصل' })}</button>
      </>}
    >
      <div className="flex flex-col gap-md">
        <div className="grid sm:grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Name (Arabic)', ar: 'الاسم بالعربية' })}</span>
            <input value={ar} onChange={(e) => setAr(e.target.value)} className="input" placeholder="اسم الأصل…" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Name (English)', ar: 'الاسم بالإنجليزية' })}</span>
            <input value={en} onChange={(e) => setEn(e.target.value)} className="input" placeholder="Asset name…" dir="ltr" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Category', ar: 'الفئة' })}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)} className="input cursor-pointer">
              {(Object.keys(assetCategoryMeta) as AssetCategory[]).map((k) => (
                <option key={k} value={k}>{pick(assetCategoryMeta[k].label)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Cost, excluding VAT (SAR)', ar: 'التكلفة غير شاملة الضريبة (ريال)' })}</span>
            <input value={cost} onChange={(e) => setCost(e.target.value)} className="input tabular-nums" inputMode="decimal" placeholder="0" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Useful life (years)', ar: 'العمر الإنتاجي (سنوات)' })}</span>
            <input value={years} onChange={(e) => setYears(e.target.value)} className="input tabular-nums" inputMode="numeric" placeholder="5" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Cost centre', ar: 'مركز التكلفة' })}</span>
            <select value={centerId} onChange={(e) => setCenterId(e.target.value)} className="input cursor-pointer">
              <option value="">{pick({ en: 'Not assigned', ar: 'غير مُسند' })}</option>
              {activeCenters.map((c) => <option key={c.id} value={c.id}>{c.code} · {pick(c.name)}</option>)}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-sm cursor-pointer">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 accent-[#b08a57]" />
          <span className="font-sans text-data text-ink">{pick({ en: 'Paid from the bank now — otherwise it is owed to the supplier', ar: 'مدفوع من البنك الآن — وإلا فهو مستحق للمورّد' })}</span>
        </label>

        {costMinor > 0 && lifeMonths > 0 && (
          <p className="font-sans text-caption rounded-lg bg-primary/[0.05] border border-primary/20 p-md text-ink-muted tabular-nums">
            {pick({
              en: `It is capitalised at ${money(costMinor)} and charged at ${money(monthly)} a month for ${lifeMonths} months. Nothing reaches the income statement until the first depreciation run.`,
              ar: `يُرسمل بمبلغ ${money(costMinor)} ويُحمَّل بواقع ${money(monthly)} شهريًا على مدى ${lifeMonths} شهرًا. ولا يصل شيء إلى قائمة الدخل قبل أول دورة إهلاك.`,
            })}
          </p>
        )}
      </div>
    </Modal>
  )
}
