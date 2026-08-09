import { openPrintWindow } from './printWindow'
import type { Bilingual } from '@/data/types'
import {
  distributorPack, loadingColumns, loadingRows, packRevision, packValue,
  PALLET, CONTAINER, type PackChannel,
} from '@/data/distributorPack'

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

/** The distributor information pack as a document — the browser's "Save as PDF"
 *  produces the file the buyer forwards to their own team, in whichever language
 *  the portal is being read in. */
export function openDistributorPackPdf(channel: PackChannel, opts: { locale: string; pick: (b: Bilingual) => string }) {
  const { locale, pick } = opts
  const ar = locale === 'ar'
  const dir = ar ? 'rtl' : 'ltr'
  const L = (en: string, arText: string) => (ar ? arText : en)
  const P = (b: Bilingual) => esc(pick(b))

  const cols = loadingColumns[channel]
  const rows = loadingRows(channel)
  const title = L('Distributor information pack', 'حقيبة معلومات الموزّع')
  const audience = channel === 'export'
    ? L('Export distributor terms', 'شروط موزّع التصدير')
    : L('HORECA operator terms', 'شروط منشآت الضيافة')

  const sections = distributorPack.map((s, i) => `
    <section${i > 0 ? ' class="brk"' : ''}>
      <h2>${String(i + 1).padStart(2, '0')} · ${P(s.label)}</h2>
      <p class="blurb">${P(s.blurb)}</p>
      <table>
        <tbody>
          ${s.items.map((item) => `
            <tr>
              <th>${P(item.label)}</th>
              <td>${P(packValue(item.value, channel))}${item.detail ? `<span class="det">${P(packValue(item.detail, channel))}</span>` : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${s.id === 'logistics' ? loadingTable() : ''}
    </section>`).join('')

  function loadingTable() {
    const standard = channel === 'export'
      ? L(`20' reefer ${CONTAINER.twentyFtPallets} pallets · 40' reefer ${CONTAINER.fortyFtPallets} pallets · set point +${CONTAINER.setPointC} °C`,
        `حاوية مبرّدة ٢٠ قدم ${CONTAINER.twentyFtPallets} طبليات · ٤٠ قدم ${CONTAINER.fortyFtPallets} طبلية · درجة الضبط +${CONTAINER.setPointC}°م`)
      : L(`Pallet ${PALLET.footprintMm} mm · max ${PALLET.maxHeightM} m loaded · max ${PALLET.maxGrossKg} kg gross`,
        `طبلية ${PALLET.footprintMm} مم · ارتفاع محمّل أقصى ${PALLET.maxHeightM} م · وزن إجمالي أقصى ${PALLET.maxGrossKg} كجم`)
    return `
      <h3>${L('Loading table', 'جدول التحميل')}</h3>
      <p class="blurb">${esc(standard)}</p>
      <table class="grid">
        <thead>
          <tr>
            <th>SKU</th>
            ${[cols.unit, cols.moq, cols.packedIn, cols.dims, cols.grossKg, cols.perLoad].map((c) => `<th>${P(c)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td><b>${esc(r.sku)}</b><span class="det">${P(r.name)}</span></td>
              <td>${P(r.unit)}</td>
              <td>${esc(r.moq)}</td>
              <td>${esc(r.packedIn)}</td>
              <td>${esc(r.dims)}</td>
              <td>${esc(r.grossKg)}</td>
              <td>${esc(r.perLoad)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page{size:A4 portrait;margin:15mm}
    html,body{margin:0;width:auto}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#2b2b2b;-webkit-print-color-adjust:exact}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#777;font-size:12px}
    .rev{color:#999;font-size:11px;margin-bottom:18px}
    h2{font-size:14px;margin:22px 0 2px;text-transform:uppercase;letter-spacing:.08em;color:#8a6b3f}
    h3{font-size:13px;margin:18px 0 2px}
    .blurb{color:#777;font-size:11px;margin:0 0 8px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #ccc;padding:7px 10px;font-size:12px;vertical-align:top;text-align:${ar ? 'right' : 'left'};word-break:break-word}
    tbody th{background:#f3efe8;font-weight:600;width:34%}
    thead th{background:#f3efe8;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    table.grid tbody th{width:auto}
    .det{display:block;color:#888;font-size:10.5px;margin-top:3px}
    .foot{margin-top:24px;font-size:11px;color:#999}
    section.brk{break-inside:auto}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>${esc(title)} · JAZ</h1>
    <div class="sub">${esc(audience)}</div>
    <div class="rev">${P(packRevision)}</div>
    ${sections}
    <div class="foot">${L('Generated from the Jaz platform. Standing terms only — live credit and order figures are in the portal.', 'صدر من منصة جاز. شروط ثابتة فقط — أرقام الائتمان والطلبات الحيّة في البوابة.')}</div>
  </body></html>`)
}
