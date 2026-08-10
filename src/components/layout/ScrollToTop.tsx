import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Reposition before the browser paints, so the new view never flashes at the old
// scroll offset. The smoke test renders these routes on the server, where a layout
// effect is both useless and noisy — fall back to the passive one there.
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Query params that address a *view*, not a filter. The dashboards swap whole
 * sections through these — `?tab=` on the account portals, `?section=`/`?sub=`
 * in the console — so changing one is a page change even though the pathname
 * never moves. Filters (`?flavor=`, and the in-component status/sort pickers)
 * are deliberately absent: narrowing a list should leave you where you are.
 */
const VIEW_PARAMS = ['tab', 'section', 'sub'] as const

/** The part of the URL that decides which view is on screen. */
function viewKey(pathname: string, search: string) {
  const params = new URLSearchParams(search)
  // Serialised rather than concatenated: a value carrying the separator can't
  // then read as a different view.
  return JSON.stringify([pathname, ...VIEW_PARAMS.map((p) => params.get(p))])
}

/**
 * Every move to a new view starts at the top of it.
 *
 * Mounted at the router, not inside the storefront Layout, so the standalone
 * routes (the role picker) get the same treatment. Back/forward is left alone:
 * the browser restores the scroll position it recorded for that history entry,
 * which is exactly what a Back click means.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation()
  const navigationType = useNavigationType()
  const key = viewKey(pathname, search)
  const lastKey = useRef<string | null>(null)

  // No dependency array on purpose: the ref below is the source of truth for
  // "did the view change", so we read the *current* navigation type at the
  // moment of the change rather than re-firing whenever it happens to flip.
  useBeforePaint(() => {
    if (lastKey.current === key) return
    const first = lastKey.current === null
    lastKey.current = key
    // First paint and history navigation both keep the browser's own position.
    if (first || navigationType === 'POP') return
    // Only the vertical axis — `left` is left alone so RTL pages don't jump.
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  })

  return null
}
