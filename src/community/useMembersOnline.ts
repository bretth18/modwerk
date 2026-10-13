import { useEffect, useState } from 'react'
import { api } from './api'
import type { MembersOnline } from './forum-contract'
import { useCommunity } from './context'
import { anonymousCountsAllowed } from './usage'

const POLL_MS = 60000

/** Who has the site open right now: the count and the members who show themselves in the online list; null until
 * known or while the community service is unreachable. With `poll`, a visible tab checks in every minute, including
 * visitors without accounts. Privacy opt-outs and one-off consumers read the total without registering presence. */
export function useMembersOnline(poll = true, registerPresence = true) {
  const [presence, setPresence] = useState<MembersOnline | null>(null)
  const memberId = useCommunity().session.user?.id ?? null
  useEffect(() => {
    let cancelled = false
    let pending = false
    const controller = new AbortController()
    const load = async () => {
      if (pending) return
      pending = true
      try {
        const checkIn = poll && registerPresence && document.visibilityState === 'visible' && anonymousCountsAllowed()
        const options = { signal: controller.signal, referrerPolicy: 'no-referrer' as const }
        let value: MembersOnline
        if (checkIn) {
          try { value = await api<MembersOnline>('/community/online', { ...options, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }) }
          catch (error) { if (controller.signal.aborted) throw error; value = await api<MembersOnline>('/community/online', options) }
        } else value = await api<MembersOnline>('/community/online', options)
        if (!cancelled) setPresence(value)
      } catch { if (!cancelled) setPresence(null) }
      finally { pending = false }
    }
    load()
    if (!poll) return () => { cancelled = true; controller.abort() }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    const visible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', visible); window.addEventListener('online', visible)
    return () => { cancelled = true; controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible) }
  }, [poll, registerPresence, memberId])
  return presence
}
