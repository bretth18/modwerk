import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './Icon'

type Warning = { id: string; title: string; description: string; href: string }

export function SelectionWarning({ warnings }: { warnings: readonly Warning[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null), panelId = useId()
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div className="selection-warning" ref={root}>
    <p className="sr-only" role="status">{warnings.map(warning => warning.title).join('. ')}</p>
    <button ref={button} type="button" className="selection-warning-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}><Icon name="sliders" size={18} /><span>{warnings.length === 1 ? 'Compatibility issue' : 'Compatibility issues'}</span><Icon name={open ? 'close' : 'help'} size={16} /></button>
    <section className="selection-warning-panel" id={panelId} aria-label="Module compatibility" hidden={!open}>
      <header><h2>Module compatibility</h2><button type="button" className="icon-button" aria-label="Close compatibility details" onClick={() => { setOpen(false); button.current?.focus() }}><Icon name="close" size={18} /></button></header>
      <div className="selection-warning-list">{warnings.map(warning => <a key={warning.id} href={warning.href} onClick={() => setOpen(false)}><strong>{warning.title}</strong><span>{warning.description}</span><small>Review configuration <Icon name="arrow" size={14} /></small></a>)}</div>
    </section>
  </div>
}
