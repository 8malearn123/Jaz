import { useSearchParams } from 'react-router-dom'

/** Linkable tab/section state backed by a URL query param (?tab= by default). */
export function useTab(defaultTab: string, paramName = 'tab'): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams()
  const active = params.get(paramName) ?? defaultTab
  const setActive = (id: string) => {
    const next = new URLSearchParams(params)
    if (id === defaultTab) next.delete(paramName)
    else next.set(paramName, id)
    setParams(next, { replace: false })
  }
  return [active, setActive]
}
