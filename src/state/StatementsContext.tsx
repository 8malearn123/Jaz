import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { vendorStatementsSeed, type VendorStatement } from '@/data/vendorStatements'

// Monthly vendor statements live above both portals: the owner console (where
// the accountant reviews, approves and sends) and the partner's business
// portal (where the partner approves the received statement) see one state.

interface StatementsCtx {
  statements: VendorStatement[]
  // accountant approval — the statement is considered sent to the partner
  accountantApprove: (id: string) => void
  // the partner's own approval of a received statement
  partnerApprove: (id: string) => void
}

const Ctx = createContext<StatementsCtx | null>(null)

export function StatementsProvider({ children }: { children: ReactNode }) {
  const [statements, setStatements] = useState<VendorStatement[]>(() => vendorStatementsSeed.map((s) => ({ ...s })))

  const accountantApprove = useCallback((id: string) => setStatements((prev) => prev.map((s) =>
    s.id === id && s.status === 'review' ? { ...s, status: 'sent', accountantAt: { en: 'Just now', ar: 'الآن' } } : s)), [])
  const partnerApprove = useCallback((id: string) => setStatements((prev) => prev.map((s) =>
    s.id === id && s.status === 'sent' ? { ...s, status: 'confirmed', partnerAt: { en: 'Just now', ar: 'الآن' } } : s)), [])

  return <Ctx.Provider value={{ statements, accountantApprove, partnerApprove }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStatements() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStatements must be used within StatementsProvider')
  return ctx
}
