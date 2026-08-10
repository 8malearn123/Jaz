import { openPrintWindow } from './printWindow'
import type { Bilingual } from '@/data/types'
import {
  distributorPack, loadingColumns, loadingRows, packRevision, packValue,
  PALLET, CONTAINER, type PackChannel,
} from '@/data/distributorPack'
import { completeness, displayValue, fieldsForItem, type ProfileValues } from '@/data/distributorProfile'

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))

export interface DistributorFileDoc {
  channel: PackChannel
  values: ProfileValues
  accountName: Bilingual
  /** Legal-entity lines printed under the title — CR, VAT, market, whatever the portal holds. */
  entity?: { label: Bilingual; value: string }[]
}

/** The company file as a document: every term Jaz declares beside the account's answer,
 *  the loading table, and what is still owed. The browser's "Save as PDF" produces the
 *  file — the same one a reviewer at Jaz opens from the account record. */
export function openDistributorFilePdf(doc: DistributorFileDoc, opts: { locale: string; pick: (b: Bilingual) => string }) {
  const { channel, values, accountName, entity = [] } = doc
  const { locale, pick } = opts
  const ar = locale === 'ar'
  const dir = ar ? 'rtl' : 'ltr'
  const L = (en: string, arText: string) => (ar ? arText : en)
  const P = (b: Bilingual) => esc(pick(b))

  const done = completeness(values, channel)
  const cols = loadingColumns[channel]
  const rows = loadingRows(channel)
  const title = L('Distributor file', 'ملف الموزّع')
  const audience = channel === 'export'
    ? L('Export distributor', 'موزّع تصدير')
    : L('HORECA operator', 'منشأة ضيافة')

  const entityRows = entity.length === 0 ? '' : `
    <table class="meta">
      <tbody>${entity.map((e) => `<tr><th>${P(e.label)}</th><td>${esc(e.value)}</td></tr>`).join('')}</tbody>
    </table>`

  const outstanding = done.missing.length === 0
    ? `<p class="ok">${L('Every required answer is in.', 'كل الإجابات المطلوبة مكتملة.')}</p>`
    : `<p class="gap"><b>${done.missing.length} ${L('required answers still missing', 'إجابة مطلوبة ما زالت ناقصة')}:</b> ${done.missing.map((f) => P(packValue(f.label, channel))).join(' · ')}</p>`

  const sections = distributorPack.map((s, i) => `
    <section>
      <h2>${String(i + 1).padStart(2, '0')} · ${P(s.label)}</h2>
      <p class="blurb">${P(s.blurb)}</p>
      <table class="pair">
        <thead>
          <tr>
            <th class="term">${L('Term', 'البند')}</th>
            <th>${L('Jaz declares', 'تُعلن جاز')}</th>
            <th>${L('The account declares', 'تُعلن المنشأة')}</th>
          </tr>
        </thead>
        <tbody>
          ${s.items.map((item) => {
            const answers = fieldsForItem(item.key, channel)
            const answered = answers.length === 0
              ? `<span class="none">${L('No answer needed', 'لا يتطلّب ردًّا')}</span>`
              : answers.map((f) => {
                const shown = displayValue(f, values[f.id], channel, pick)
                return `<div class="ans"><span class="k">${P(packValue(f.label, channel))}</span>${
                  shown ? esc(shown) : `<span class="none">${L('Not answered yet', 'لم يُجب بعد')}</span>`
                }</div>`
              }).join('')
            return `
              <tr>
                <th class="term">${P(item.label)}</th>
                <td>${P(packValue(item.value, channel))}${item.detail ? `<span class="det">${P(packValue(item.detail, channel))}</span>` : ''}</td>
                <td>${answered}</td>
              </tr>`
          }).join('')}
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

  openPrintWindow(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)} · ${P(accountName)}</title><style>
    @page{size:A4 portrait;margin:14mm}
    html,body{margin:0;width:auto}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#2b2b2b;-webkit-print-color-adjust:exact}
    h1{font-size:20px;margin:0 0 2px}
    .sub{color:#777;font-size:12px}
    .rev{color:#999;font-size:11px;margin-bottom:14px}
    .score{border:1px solid #ccc;border-radius:6px;padding:10px 12px;margin:12px 0;font-size:12px;background:#faf7f0}
    .score b.big{font-size:18px}
    .ok{color:#2f7d5b;font-weight:600;margin:6px 0 0}
    .gap{margin:6px 0 0;color:#8a6b3f}
    h2{font-size:14px;margin:20px 0 2px;text-transform:uppercase;letter-spacing:.08em;color:#8a6b3f}
    h3{font-size:13px;margin:16px 0 2px}
    .blurb{color:#777;font-size:11px;margin:0 0 6px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #ccc;padding:7px 10px;font-size:11.5px;vertical-align:top;text-align:${ar ? 'right' : 'left'};word-break:break-word}
    thead th{background:#f3efe8;font-weight:600;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em}
    th.term{background:#f3efe8;font-weight:600;width:22%}
    table.pair td{width:39%}
    table.meta th{background:#f3efe8;font-weight:600;width:34%}
    table.meta{margin-bottom:4px}
    .det{display:block;color:#888;font-size:10px;margin-top:3px}
    .ans{margin-bottom:6px}
    .ans:last-child{margin-bottom:0}
    .ans .k{display:block;color:#888;font-size:10px}
    .none{color:#aaa;font-style:italic}
    .foot{margin-top:22px;font-size:10.5px;color:#999}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>${esc(title)} · ${P(accountName)}</h1>
    <div class="sub">JAZ · ${esc(audience)}</div>
    <div class="rev">${P(packRevision)}</div>
    ${entityRows}
    <div class="score">
      <b class="big">${done.pct}%</b> ${L('complete', 'مكتمل')} — ${done.filled}/${done.total} ${L('answered', 'مُجاب')}
      ${outstanding}
    </div>
    ${sections}
    <div class="foot">${L('Generated from the Jaz platform. Live credit and order figures are in the portal.', 'صدر من منصة جاز. أرقام الائتمان والطلبات الحيّة في البوابة.')}</div>
  </body></html>`)
}
