import { useEffect, useState } from 'react'
import { api } from './api'
import { useCommunity } from './context'
import { MODULE_STATISTICS_CHANGED } from './module-statistics'

/** Account-backed button state survives navigation, reloads and other devices. */
export function useWorkingReportVersions(id: string) {
  const { session, preview } = useCommunity()
  const memberId = session.user?.verified ? session.user.id : ''
  const [result, setResult] = useState<{ id: string; memberId: string; versions: string[] } | null>(null)
  useEffect(() => {
    if (!memberId || !session.available || import.meta.env.DEV && preview) return
    let active = true, latest = 0
    function load() {
      const request = ++latest
      void api<{ versions: string[] }>('/working-reports?module=' + encodeURIComponent(id))
        .then(value => { if (active && request === latest) setResult({ id, memberId, versions: value.versions }) })
        .catch(() => {
          // Keep a successful state on transient failures; an initial failure permits a retry.
          if (active && request === latest) setResult(current => current?.id === id && current.memberId === memberId ? current : { id, memberId, versions: [] })
        })
    }
    load()
    window.addEventListener(MODULE_STATISTICS_CHANGED, load)
    window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener(MODULE_STATISTICS_CHANGED, load); window.removeEventListener('focus', load) }
  }, [id, memberId, session.available, preview])
  const matched = !!memberId && result?.id === id && result.memberId === memberId
  return { versions: matched ? result.versions : [], loading: !!memberId && session.available && !(import.meta.env.DEV && preview) && !matched }
}
