import { useEffect } from 'react'

// While a bottom sheet is open on a phone, the page behind it must not scroll under the scrim.
export function useSheetScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [locked])
}
