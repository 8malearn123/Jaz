import { openPrintWindow } from './printWindow'

// ── Printable accounting reports.
//
// The trial balance, the income statement, the balance sheet, the VAT return, an account's
// ledger and the journal are all the same object on paper: a titled sheet, a block of
// metadata, and one or more ruled tables that end in a total. So there is one builder here
// rather than six, and each panel describes its report in already-localised strings — it
// holds `pick` and `money`, this module does not need them.
//
// The browser's own "Save as PDF" produces the file, exactly as the statement of account
// and the cost-centre report already do, which keeps full Arabic/RTL shaping.

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

export interface ReportCell {
  text: string
  /** Right-aligned (left in Arabic) and tabular — for money and counts. */
  num?: boolean
  /** Quiet second line under the value. */
  sub?: string
  strong?: boolean
}

export interface ReportRow {
  cells: ReportCell[]
  /** `net` shades a subtotal, `grand` shades the report's own total. */
  tone?: 'net' | 'grand'
}

export interface ReportTable {
  caption?: string
  head: { label: string; num?: boolean }[]
  rows: ReportRow[]
  /** Shown in place of the body when there is nothing to report. */
  empty?: string
}

export interface AccountingReport {
  title: string
  subtitle?: string
  meta: { label: string; value: string }[]
  tables: ReportTable[]
  footnote?: string
}

const cellHtml = (c: ReportCell): string =>
  `<td class="${c.num ? 'num' : ''}">${c.strong ? '<b>' : ''}${esc(c.text)}${c.strong ? '</b>' : ''}${c.sub ? `<span class="mut"> · ${esc(c.sub)}</span>` : ''}</td>`

function tableHtml(t: ReportTable): string {
  const body = t.rows.length === 0
    ? `<tr><td class="mut" colspan="${t.head.length}">${esc(t.empty ?? '—')}</td></tr>`
    : t.rows.map((r) => `<tr${r.tone ? ` class="${r.tone}"` : ''}>${r.cells.map(cellHtml).join('')}</tr>`).join('')
  return `
    ${t.caption ? `<h2>${esc(t.caption)}</h2>` : ''}
    <table>
      <thead><tr>${t.head.map((h) => `<th class="${h.num ? 'num' : ''}">${esc(h.label)}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
    </table>`
}

/** Open the report in a print window. `rtl` mirrors the numeric columns, as Arabic needs. */
export function openAccountingReportPdf(report: AccountingReport, opts: { rtl: boolean }) {
  const { rtl } = opts
  openPrintWindow(`<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(report.title)}</title><style>
    @page{size:A4 portrait;margin:14mm}
    html,body{margin:0;width:auto}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;padding:20px;color:#2b2b2b;-webkit-print-color-adjust:exact}
    h1{font-size:20px;margin:0 0 4px}
    h2{font-size:14px;margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid #b08a57}
    .sub{color:#777;font-size:12px;margin-bottom:14px}
    .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 10px;font-size:12px;margin:10px 0}
    .meta b{display:block;color:#777;font-weight:600;font-size:10px;text-transform:uppercase}
    .mut{color:#999;font-weight:400}
    table{width:100%;border-collapse:collapse;margin:10px 0 4px;page-break-inside:auto}
    tr{page-break-inside:avoid}
    th,td{border:1px solid #ccc;padding:6px 10px;font-size:11.5px;text-align:${rtl ? 'right' : 'left'}}
    th{background:#f3efe8;font-size:10.5px;text-transform:uppercase;color:#6b6b6b}
    td.num,th.num{text-align:${rtl ? 'left' : 'right'};font-variant-numeric:tabular-nums;white-space:nowrap}
    tr.net td{font-weight:700;background:#faf7f0}
    tr.grand td{font-weight:700;background:#f3efe8}
    .foot{margin-top:22px;font-size:10.5px;color:#999;border-top:1px solid #eee;padding-top:8px}
  </style></head><body>
    <h1>${esc(report.title)}</h1>
    ${report.subtitle ? `<div class="sub">${esc(report.subtitle)}</div>` : ''}
    <div class="meta">${report.meta.map((m) => `<div><b>${esc(m.label)}</b>${esc(m.value)}</div>`).join('')}</div>
    ${report.tables.map(tableHtml).join('')}
    ${report.footnote ? `<div class="foot">${esc(report.footnote)}</div>` : ''}
  </body></html>`)
}
