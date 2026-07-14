import { openPrintWindow } from './printWindow'
import type { Bilingual } from '@/data/types'
import type { VendorStatement } from '@/data/vendorStatements'

/** Printable monthly statement of account — the browser's "Save as PDF"
 *  produces the PDF. Shows the month's movement and both approvals. */
export function openStatementPdf(s: VendorStatement, opts: { locale: string; pick: (b: Bilingual) => string; money: (minor: number) => string }) {
  const { locale, pick, money } = opts
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const L = (en: string, ar: string) => (locale === 'ar' ? ar : en)
  const approval = (label: string, at?: Bilingual) => `
    <div class="appr ${at ? 'ok' : ''}">
      <b>${label}</b>
      <span>${at ? `✓ ${L('Approved', 'معتمد')} · ${pick(at)}` : L('Pending', 'بانتظار الاعتماد')}</span>
    </div>`
  openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${s.id}</title><style>
    @page{size:A4 portrait;margin:15mm}
    html,body{margin:0;width:auto}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#2b2b2b;-webkit-print-color-adjust:exact}
    h1{font-size:20px;margin:0 0 4px} .sub{color:#777;font-size:12px;margin-bottom:16px}
    .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:13px;margin:14px 0}
    .meta b{display:block;color:#777;font-weight:600;font-size:11px;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #ccc;padding:8px 12px;font-size:13px;text-align:${locale === 'ar' ? 'right' : 'left'}}
    th{background:#f3efe8}
    td:last-child{text-align:${locale === 'ar' ? 'left' : 'right'}}
    tr.net td{font-weight:700;background:#faf7f0}
    .apprs{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
    .appr{border:1px solid #ccc;border-radius:6px;padding:10px 12px;font-size:12px}
    .appr b{display:block;color:#777;font-weight:600;font-size:11px;text-transform:uppercase;margin-bottom:4px}
    .appr.ok span{color:#2f7d5b;font-weight:600}
    .foot{margin-top:24px;font-size:11px;color:#999}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>${L('Statement of account', 'كشف حساب')} · ${pick(s.monthLabel)}</h1>
    <div class="sub">Jaz · ${L('Issued automatically on the 1st of every month', 'يصدر تلقائيًا في اليوم الأول من كل شهر')}</div>
    <div class="meta">
      <div><b>${L('Partner', 'الشريك')}</b>${pick(s.vendor)}</div>
      <div><b>${L('Statement no.', 'رقم الكشف')}</b>${s.id}</div>
      <div><b>${L('Period', 'الفترة')}</b>${pick(s.monthLabel)}</div>
      <div><b>${L('Issued on', 'تاريخ الإصدار')}</b>${pick(s.issuedOn)}</div>
    </div>
    <table>
      <thead><tr><th>${L('Item', 'البند')}</th><th>${L('Amount', 'المبلغ')}</th></tr></thead>
      <tbody>
        <tr><td>${L('Opening balance', 'الرصيد الافتتاحي')}</td><td>${money(s.openingMinor)}</td></tr>
        <tr><td>${L('Purchases during the month', 'مشتريات الشهر')}</td><td>${money(s.chargesMinor)}</td></tr>
        <tr><td>${L('Payments received', 'المدفوعات المستلمة')}</td><td>−${money(s.paymentsMinor)}</td></tr>
        <tr class="net"><td>${L('Closing balance', 'الرصيد الختامي')}</td><td>${money(s.closingMinor)}</td></tr>
      </tbody>
    </table>
    <div class="apprs">
      ${approval(L('Accountant approval — Jaz', 'اعتماد المحاسب — جاز'), s.accountantAt)}
      ${approval(L('Partner approval', 'اعتماد الشريك'), s.partnerAt)}
    </div>
    <div class="foot">${L('Generated from the Jaz platform.', 'صدر من منصة جاز.')}</div>
  </body></html>`)
}
