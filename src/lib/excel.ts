// Minimal SpreadsheetML (Excel 2003 XML) writer — a real Excel file that opens
// natively in Excel/Numbers/LibreOffice, with no dependencies. Strings are
// escaped and numbers typed, so Arabic labels and amounts come through intact.
export function downloadExcel(filename: string, sheetName: string, rows: (string | number)[][]) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const cell = (v: string | number) =>
    typeof v === 'number'
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${esc(sheetName)}"><Table>
${rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`
  const blob = new Blob(['﻿', xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
