import { useEffect, useState } from 'react'
import { api } from './api'
import type { MembersOnline } from './forum-contract'

const POLL_MS = 60000

/** Who has the site open right now: the count and the members who show themselves in the online list; null until
 * known or while the community service is unreachable. The request carries no credentials. With `poll`, it repeats
 * every minute while this tab is visible; without it, one request on mount. */
export function useMembersOnline(poll = true) {
  const [presence, setPresence] = useState<MembersOnline | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () => { void api<MembersOnline>('/community/online').then(value => { if (!cancelled) setPresence(value) }).catch(() => { if (!cancelled) setPresence(null) }) }
    load()
    if (!poll) return () => { cancelled = true }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    const visible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', visible); window.addEventListener('online', visible)
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible) }
  }, [poll])
  return presence
}
