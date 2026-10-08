import { useEffect, useState } from 'react'
import { api } from './api'
import { useCommunity } from './context'
import { MODULE_STATISTICS_CHANGED } from './module-statistics'

export function useModuleWorksReports(id: string) {
  const { session } = useCommunity()
  const [result, setResult] = useState<{ id: string; count: number | null } | null>(null)
  useEffect(() => {
    let active = true, latest = 0
    function load() {
      if (!session.available) return
      const request = ++latest
      void api<{ worksReports?: number }>('/modules/' + id)
        .then(value => { if (active && request === latest) setResult({ id, count: Number.isSafeInteger(value.worksReports) && value.worksReports! >= 0 ? value.worksReports! : null }) })
        .catch(() => { if (active && request === latest) setResult({ id, count: null }) })
    }
    load()
    window.addEventListener(MODULE_STATISTICS_CHANGED, load)
    window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener(MODULE_STATISTICS_CHANGED, load); window.removeEventListener('focus', load) }
  }, [id, session.available])
  return session.available && result?.id === id ? result.count : null
}
