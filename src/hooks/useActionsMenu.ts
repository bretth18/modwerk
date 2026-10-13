import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

/** A ⋯ menu's state: it focuses its first item, Escape, a click outside or a route change closes it, and arrow keys move. */
export function useActionsMenu() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>('a, button:not(:disabled)')?.focus()
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    const onPointer = (event: PointerEvent) => { if (!panelRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false) }
    window.addEventListener('hashchange', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => { window.removeEventListener('hashchange', close); window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) }
  }, [open])
  function moveFocus(event: ReactKeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a, button:not(:disabled)') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
    event.preventDefault()
  }
  // Focus returns to the menu button first, so a dialog opened by the action restores focus there.
  function choose(action: () => void) { setOpen(false); buttonRef.current?.focus(); action() }
  return { open, setOpen, buttonRef, panelRef, panelId, moveFocus, choose }
}
