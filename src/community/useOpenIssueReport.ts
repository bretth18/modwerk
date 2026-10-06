import { useEffect, useSyncExternalStore, type RefObject } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
function requested() { return new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('report') === '1' }

export function useOpenIssueReport(report: RefObject<HTMLDetailsElement | null>, title: RefObject<HTMLInputElement | null>, openRequest: number) {
  const fromLink = useSyncExternalStore(subscribe, requested, () => false)
  useEffect(() => {
    if ((!openRequest && !fromLink) || !report.current) return
    report.current.setAttribute('open', '')
    const target = title.current ?? report.current.querySelector('summary')
    target?.focus()
    report.current.scrollIntoView({ block: 'start' })
  }, [openRequest, fromLink, report, title])
}
