import { useState } from 'react'
import { CatalogBrowser, OrderRail, WholesaleDetailModal, WholesaleReviewModal } from './ordering'

/** Catalog = product & price discovery. The rail's "Review order" opens a popup (no tab switch). */
export function CatalogPanel() {
  const [detailSku, setDetailSku] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  return (
    <div className="flex flex-col gap-lg">
      <CatalogBrowser onOpen={setDetailSku} />
      <OrderRail variant="compact" onReview={() => setReviewOpen(true)} />
      <WholesaleDetailModal sku={detailSku} onClose={() => setDetailSku(null)} />
      <WholesaleReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  )
}
