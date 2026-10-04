import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { PublishedModule, Session } from './api'
import { CommunityContext, emptySession } from './context'
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(emptySession), [catalog, setCatalog] = useState<PublishedModule[]>([]), [loading, setLoading] = useState(true)
  const revision = useRef(0)
  const refresh = useCallback(async () => {
    const version = ++revision.current
    try {
      const next = await api<Session>('/auth/session')
      if (version !== revision.current) return
      setSession(next); setLoading(false)
      if (next.available) { try { const items = await api<PublishedModule[]>('/catalog'); if (version === revision.current) setCatalog(items) } catch { /* A catalog failure must not sign the user out. */ } }
      else setCatalog([])
    } catch { if (version === revision.current) { setSession(emptySession); setCatalog([]); setLoading(false) } }
  }, [])
  useEffect(() => {
    const update = () => { void refresh() }
    update(); window.addEventListener('octamod-session-expired', update); window.addEventListener('focus', update); window.addEventListener('storage', update)
    const invalidate = () => { ++revision.current }
    return () => { invalidate(); window.removeEventListener('octamod-session-expired', update); window.removeEventListener('focus', update); window.removeEventListener('storage', update) }
  }, [refresh])
  return <CommunityContext.Provider value={{ session, catalog, loading, refresh }}>{children}</CommunityContext.Provider>
}
