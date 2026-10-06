import { useEffect, useState, type RefObject } from 'react'

// Phones scroll the document; the app bar slides away while reading and returns on the first upward scroll.
// It stays while something in it has focus or is expanded (search, notifications, menu), and on every route change.
export function usePhoneToolbar(enabled: boolean, toolbar: RefObject<HTMLElement | null>, resetKey: string) {
  const [hidden, setHidden] = useState(false)
  // Every route change shows the bar again (state adjusted during render, as React recommends for derived resets).
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) { setSeenKey(resetKey); if (hidden) setHidden(false) }
  useEffect(() => {
    if (!enabled) return
    let last = window.scrollY, frame = 0
    const update = () => {
      frame = 0
      const y = Math.max(0, window.scrollY)
      const delta = y - last
      const overscrolled = y >= document.documentElement.scrollHeight - window.innerHeight - 1
      if (Math.abs(delta) < 6 || overscrolled) return
      last = y
      const bar = toolbar.current
      const busy = !!bar && (bar.contains(document.activeElement) || !!bar.querySelector('[aria-expanded="true"]'))
      if (delta > 0 && y > 96 && !busy) setHidden(true)
      else if (delta < 0 || y <= 96) setHidden(false)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame) }
  }, [enabled, toolbar])
  return enabled && hidden
}
