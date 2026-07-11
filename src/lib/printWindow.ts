// Open a clean dedicated window with the given HTML and trigger the print dialog —
// the browser's "Save as PDF" produces the actual PDF, with full Arabic/RTL support.
export function openPrintWindow(html: string) {
  const w = window.open('', '_blank', 'width=840,height=640')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 150)
}
