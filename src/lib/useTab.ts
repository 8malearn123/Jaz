import { useSearchParams } from 'react-router-dom'

/** Linkable tab state backed by ?tab= in the URL. */
export function useTab(defaultTab: string): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams()
  const active = params.get('tab') ?? defaultTab
  const setActive = (id: string) => {
    const next = new URLSearchParams(params)
    if (id === defaultTab) next.delete('tab')
    else next.set('tab', id)
    setParams(next, { replace: false })
  }
  return [active, setActive]
}
