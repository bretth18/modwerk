import { useEffect, useRef, type ReactNode } from 'react'
import './octatrack-link.css'

/** The card route of the Octatrack page's Setup (base OS file, checks, the .bin); `open` scrolls to it when the guided
 * sync sends people here. */
export function CardInstall({ open = false, onOpened, setName, children }: { open?: boolean; onOpened?: () => void; setName?: string; children: ReactNode }) {
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    section.current?.scrollIntoView({ block: 'start' })
    onOpened?.()
  }, [open, onOpened])
  return <section ref={section} className="card-install is-open" aria-labelledby="card-install-title"><h3 id="card-install-title">Install from the card</h3>{setName && <p className="card-install-set">This builds <b>{setName}</b>, the module set you’re editing, into a firmware file for the card.</p>}{children}</section>
}
