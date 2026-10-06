import { useEffect, useState } from 'react'
import { api } from './api'

const POLL_MS = 60000

/** How many members have the site open right now; null until known or while the community service is unreachable.
 * The request carries no credentials, and polling pauses while this tab is hidden. */
export function useMembersOnline() {
  const [online, setOnline] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () => { void api<{ online: number }>('/community/online').then(value => { if (!cancelled) setOnline(value.online) }).catch(() => { if (!cancelled) setOnline(null) }) }
    load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    const visible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', visible)
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [])
  return online
}
