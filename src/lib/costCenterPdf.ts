import { openPrintWindow } from './printWindow'
import type { Bilingual } from '@/data/types'
import { costCenterKinds, processBasisMeta, type CostCenter, type CostEntry, type CostCenterTotals } from '@/data/costCenters'

/** One centre's slice of a report — the centre, what was filed against it, and its totals. */
export interface CostCenterReportSection {
  center: CostCenter
  entries: CostEntry[]
  totals: CostCenterTotals
}

export interface CostCenterReport {
  /** Which side the report covers — 'all' shows both. */
  side: 'all' | 'sale' | 'purchase'
  /** What the reader asked for: one centre by name, or every centre. */
  scope: Bilingual
  periodLabel: Bilingual
  issuedOn: string
  sections: CostCenterReportSection[]
  /** Print the individual postings under each centre, not only the process breakdown. */
  includeEntries: boolean
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

/** Printable cost-centre report — the browser's "Save as PDF" produces the PDF,
 *  with full Arabic/RTL support like the statement of account. */
export function openCostCenterReportPdf(
  report: CostCenterReport,
  opts: { locale: string; pick: (b: Bilingual) => string; money: (minor: number) => string },
) {
  const { locale, pick, money } = opts
  const ar = locale === 'ar'
  const dir = ar ? 'rtl' : 'ltr'
  const L = (en: string, arText: string) => (ar ? arText : en)
  const P = (b: Bilingual) => esc(pick(b))

  const grand = report.sections.reduce((a, s) => ({
    saleBase: a.saleBase + s.totals.saleBaseMinor,
    purchaseBase: a.purchaseBase + s.totals.purchaseBaseMinor,
    saleLoad: a.saleLoad + s.totals.saleProcessMinor,
    purchaseLoad: a.purchaseLoad + s.totals.purchaseProcessMinor,
    total: a.total + s.totals.totalProcessMinor,
    budget: a.budget + s.center.budgetMinor,
    docs: a.docs + s.totals.saleCount + s.totals.purchaseCount,
  }), { saleBase: 0, purchaseBase: 0, saleLoad: 0, purchaseLoad: 0, total: 0, budget: 0, docs: 0 })

  const sideLabel = report.side === 'sale' ? L('Sales side only', 'جانب البيع فقط')
    : report.side === 'purchase' ? L('Purchases side only', 'جانب الشراء فقط')
      : L('Sales & purchases', 'البيع والشراء')

  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—')

  // ── consolidated summary — one row per centre
  const summaryRows = report.sections.map((s) => `
    <tr>
      <td><b>${esc(s.center.code)}</b><span class="mut"> · ${P(s.center.name)}</span></td>
      <td>${P(costCenterKinds[s.center.kind].label)}</td>
      <td class="num">${esc(money(s.totals.saleProcessMinor))}</td>
      <td class="num">${esc(money(s.totals.purchaseProcessMinor))}</td>
      <td class="num"><b>${esc(money(s.totals.totalProcessMinor))}</b></td>
      <td class="num">${s.center.budgetMinor > 0 ? esc(money(s.center.budgetMinor)) : '—'}</td>
      <td class="num">${pct(s.totals.totalProcessMinor, s.center.budgetMinor)}</td>
    </tr>`).join('')

  // ── per-centre detail — the process list as configured, what each one absorbed, and (optionally) the postings
  const detail = report.sections.map((s) => {
    const procRows = s.totals.byProcess.length === 0
      ? `<tr><td colspan="5" class="mut">${L('No postings against this cost centre yet', 'لا توجد حركات على مركز التكلفة بعد')}</td></tr>`
      : s.totals.byProcess.map((p) => {
        const cfg = s.center.processes.find((x) => x.id === p.processId)
        const basis = cfg
          ? cfg.basis === 'pct' ? `${cfg.rate}%`
            : cfg.basis === 'per_unit' ? `${money(cfg.rate)} / ${L('unit', 'وحدة')}`
              : `${money(cfg.rate)} / ${L('document', 'مستند')}`
          : '—'
        return `<tr>
            <td>${P(p.name)}</td>
            <td>${p.side === 'sale' ? L('On sale', 'عند البيع') : L('On purchase', 'عند الشراء')}</td>
            <td>${esc(basis)}${cfg ? `<span class="mut"> · ${P(processBasisMeta[cfg.basis].label)}</span>` : ''}</td>
            <td class="num">${p.count}</td>
            <td class="num">${esc(money(p.amountMinor))}</td>
          </tr>`
      }).join('')

    const entryRows = !report.includeEntries || s.entries.length === 0 ? '' : `
      <table>
        <thead><tr>
          <th>${L('Entry', 'القيد')}</th><th>${L('Document', 'المستند')}</th><th>${L('Party', 'الطرف')}</th>
          <th>${L('Side', 'الجانب')}</th><th class="num">${L('Base amount', 'المبلغ الأساس')}</th><th class="num">${L('Process load', 'تحميل العمليات')}</th>
        </tr></thead>
        <tbody>${s.entries.map((e) => `
          <tr>
            <td>${esc(e.id)}<span class="mut"> · ${P(e.at)}</span></td>
            <td>${esc(e.ref)}</td>
            <td>${P(e.party)}</td>
            <td>${e.side === 'sale' ? L('Sale', 'بيع') : L('Purchase', 'شراء')}</td>
            <td class="num">${esc(money(e.baseMinor))}</td>
            <td class="num">${esc(money(e.processMinor))}</td>
          </tr>`).join('')}</tbody>
      </table>`

    return `
      <section class="cc">
        <h2>${esc(s.center.code)} · ${P(s.center.name)}</h2>
        <div class="meta">
          <div><b>${L('Type', 'النوع')}</b>${P(costCenterKinds[s.center.kind].label)}</div>
          <div><b>${L('Responsible', 'الجهة المسؤولة')}</b>${s.center.manager ? P(s.center.manager) : '—'}</div>
          <div><b>${L('Documents filed', 'عدد المستندات')}</b>${s.totals.saleCount + s.totals.purchaseCount} <span class="mut">(${L('sales', 'بيع')} ${s.totals.saleCount} · ${L('purchases', 'شراء')} ${s.totals.purchaseCount})</span></div>
          <div><b>${L('Status', 'الحالة')}</b>${s.center.active ? L('Active', 'نشط') : L('Suspended', 'موقوف')}</div>
          <div><b>${L('Sales base', 'أساس المبيعات')}</b>${esc(money(s.totals.saleBaseMinor))}</div>
          <div><b>${L('Purchases base', 'أساس المشتريات')}</b>${esc(money(s.totals.purchaseBaseMinor))}</div>
        </div>
        <table>
          <thead><tr>
            <th>${L('Cost process', 'عملية التكلفة')}</th><th>${L('Fires on', 'تُضاف عند')}</th><th>${L('Configured rate', 'المعدل المعتمد')}</th>
            <th class="num">${L('Times applied', 'مرات التطبيق')}</th><th class="num">${L('Absorbed', 'المحمّل')}</th>
          </tr></thead>
          <tbody>
            ${procRows}
            <tr class="net"><td colspan="4">${L('Total absorbed by this cost centre', 'إجمالي المحمّل على مركز التكلفة')}</td><td class="num">${esc(money(s.totals.totalProcessMinor))}</td></tr>
          </tbody>
        </table>
        ${entryRows}
      </section>`
  }).join('')

  openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${L('Cost centre report', 'تقرير مراكز التكلفة')}</title><style>
    @page{size:A4 portrait;margin:14mm}
    html,body{margin:0;width:auto}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;padding:20px;color:#2b2b2b;-webkit-print-color-adjust:exact}
    h1{font-size:20px;margin:0 0 4px}
    h2{font-size:14px;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #b08a57}
    .sub{color:#777;font-size:12px;margin-bottom:14px}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 10px;font-size:12px;margin:10px 0}
    .meta b{display:block;color:#777;font-weight:600;font-size:10px;text-transform:uppercase}
    .mut{color:#999;font-weight:400}
    table{width:100%;border-collapse:collapse;margin:10px 0 4px}
    th,td{border:1px solid #ccc;padding:6px 10px;font-size:11.5px;text-align:${ar ? 'right' : 'left'}}
    th{background:#f3efe8;font-size:10.5px;text-transform:uppercase;color:#6b6b6b}
    td.num,th.num{text-align:${ar ? 'left' : 'right'};font-variant-numeric:tabular-nums;white-space:nowrap}
    tr.net td{font-weight:700;background:#faf7f0}
    tr.grand td{font-weight:700;background:#f3efe8}
    section.cc{margin-top:20px;page-break-inside:avoid}
    .foot{margin-top:22px;font-size:10.5px;color:#999;border-top:1px solid #eee;padding-top:8px}
  </style></head><body>
    <h1>${L('Cost centre report', 'تقرير مراكز التكلفة')}</h1>
    <div class="sub">Jaz · ${L('Cost processes added at the moment of sale and of purchase', 'عمليات التكلفة المضافة وقت البيع ووقت الشراء')}</div>
    <div class="meta">
      <div><b>${L('Scope', 'النطاق')}</b>${P(report.scope)}</div>
      <div><b>${L('Side', 'الجانب')}</b>${esc(sideLabel)}</div>
      <div><b>${L('Period', 'الفترة')}</b>${P(report.periodLabel)}</div>
      <div><b>${L('Cost centres', 'عدد مراكز التكلفة')}</b>${report.sections.length}</div>
      <div><b>${L('Documents filed', 'المستندات المرحّلة')}</b>${grand.docs}</div>
      <div><b>${L('Issued on', 'تاريخ الإصدار')}</b>${esc(report.issuedOn)}</div>
    </div>
    <table>
      <thead><tr>
        <th>${L('Cost centre', 'مركز التكلفة')}</th><th>${L('Type', 'النوع')}</th>
        <th class="num">${L('Sale side', 'جانب البيع')}</th><th class="num">${L('Purchase side', 'جانب الشراء')}</th>
        <th class="num">${L('Total absorbed', 'إجمالي المحمّل')}</th><th class="num">${L('Budget', 'الميزانية')}</th><th class="num">${L('Used', 'الاستهلاك')}</th>
      </tr></thead>
      <tbody>
        ${summaryRows || `<tr><td colspan="7" class="mut">${L('No cost centres in scope', 'لا توجد مراكز تكلفة ضمن النطاق')}</td></tr>`}
        <tr class="grand">
          <td colspan="2">${L('Grand total', 'الإجمالي العام')}</td>
          <td class="num">${esc(money(grand.saleLoad))}</td>
          <td class="num">${esc(money(grand.purchaseLoad))}</td>
          <td class="num">${esc(money(grand.total))}</td>
          <td class="num">${grand.budget > 0 ? esc(money(grand.budget)) : '—'}</td>
          <td class="num">${pct(grand.total, grand.budget)}</td>
        </tr>
      </tbody>
    </table>
    ${detail}
    <div class="foot">${L('Generated from the Jaz platform · cost processes are frozen onto each entry at the moment it is filed, so a later rate change never restates a posted document.', 'صدر من منصة جاز · تُثبَّت عمليات التكلفة على كل قيد لحظة ترحيله، فلا يعيد تعديل المعدل لاحقًا تقييم مستند مُرحّل.')}</div>
  </body></html>`)
}
