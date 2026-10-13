import { useEffect, useRef, useState } from 'react'
import type { OctatrackLink } from '../engine/elekloader/octatrack-link'
import type { LoadReading } from '../engine/elekloader/upload-wire'
import type { LoadPoint } from '../config/octatrack-load'
import { useOctatrackLink } from './useOctatrackLink'

export const LOAD_INTERVAL = 2000, LOAD_HISTORY = 150
interface History { link: OctatrackLink; base: string; points: LoadPoint[]; notice: string; unsupported: boolean; now: number; visible: boolean }
/** One cached read every two seconds, only in the visible idle Load tab. */
export function useOctatrackLoad(link: OctatrackLink | null, active: boolean) {
  const state = useOctatrackLink(link), base = state.identity?.base
  const [history, setHistory] = useState<History>()
  const current = history?.link === link && history?.base === base ? history : undefined
  const unsupported = !!current?.unsupported
  const pending = useRef(false), previous = useRef<{ link: OctatrackLink; base: string; ticks: number; frames: number } | undefined>(undefined)
  const ready = state.status === 'ready' && !!state.identity?.canSubmit
  useEffect(() => {
    if (!link || !base || !active || !ready || unsupported) return
    let live = true, timer: ReturnType<typeof setTimeout> | undefined, expiry: ReturnType<typeof setTimeout> | undefined, controller: AbortController | undefined
    const update = (reading: LoadReading | null | undefined, notice: string, unavailable = false) => {
      const now = Date.now(), visible = !document.hidden
      setHistory(old => {
        const points = old?.link === link && old?.base === base ? old.points : []
        return { link, base, points: reading === undefined ? points : [...points, { at: now, reading }].slice(-LOAD_HISTORY), notice, unsupported: unavailable, now, visible }
      })
    }
    const allowed = () => live && !document.hidden
    const schedule = () => { if (allowed()) timer = setTimeout(() => void read(), LOAD_INTERVAL) }
    const read = async () => {
      if (!allowed()) return
      if (pending.current) { schedule(); return }
      pending.current = true; controller = new AbortController()
      // Expire displayed values even if a USB transfer takes longer than normal.
      expiry = setTimeout(() => { if (allowed()) update(undefined, 'Waiting for a fresh USB reading.') }, 6001)
      try {
        const reading = await link.liveLoad(controller.signal, allowed)
        if (!allowed()) return
        if (!reading) { update(undefined, 'This base does not provide live load yet. A compatible beta base is required.', true); return }
        const last = previous.current
        previous.current = { link, base, ticks: reading.ticks, frames: reading.frames }
        // Frozen tick/frame counters indicate unavailable timing, not an idle instrument.
        const stalled = !!last && last.link === link && last.base === base && (last.ticks === reading.ticks || last.frames === reading.frames)
        update(stalled ? null : reading, stalled ? 'Waiting for fresh device meter windows.' : '')
      } catch { if (allowed()) update(null, 'USB is busy or unavailable. History resumes when a read succeeds.') }
      finally { clearTimeout(expiry); pending.current = false; schedule() }
    }
    const visibility = () => {
      clearTimeout(timer); clearTimeout(expiry); controller?.abort()
      update(undefined, '')
      if (allowed()) void read()
    }
    document.addEventListener('visibilitychange', visibility); void read()
    return () => { live = false; clearTimeout(timer); clearTimeout(expiry); controller?.abort(); document.removeEventListener('visibilitychange', visibility) }
  }, [link, base, active, ready, unsupported])
  return { points: current?.points ?? [], notice: current?.notice ?? '', now: current?.now ?? 0, visible: current?.visible ?? false, ready, unsupported, clear: () => setHistory(old => old && { ...old, points: [] }) }
}
