import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type Step = { title: string; go: () => void }

/**
 * A module's page over the current one, so looking at it never navigates away. With `prev`/`next`,
 * chevrons beside the panel (and the arrow keys) page through the module set without closing it.
 */
export function ModuleDialog({ title, index, total, prev, next, status, actions, onClose, children }: { title: string; index?: number; total?: number; prev?: Step; next?: Step; status?: ReactNode; actions?: ReactNode; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null), panel = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState<'prev' | 'next'>()
  useEffect(() => {
    const element = dialog.current, previousFocus = document.activeElement
    element?.showModal()
    panel.current?.focus()
    return () => { element?.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus() }
  }, [])
  useEffect(() => { panel.current?.scrollTo(0, 0) }, [title])
  const step = (which: 'prev' | 'next') => { const target = which === 'prev' ? prev : next; if (!target) return; setDirection(which); target.go() }
  // On the document, not the dialog: a click inside the page can drop focus to <body>, where Escape and the arrows would get lost.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="tablist"], [role="slider"], audio, video')) return
      if (event.key === 'ArrowLeft' && prev) { event.preventDefault(); step('prev') }
      if (event.key === 'ArrowRight' && next) { event.preventDefault(); step('next') }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })
  const paging = !!(prev || next)
  return <dialog ref={dialog} className="module-dialog" aria-label={title} data-step={direction} onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    {paging && <StepButton which="prev" target={prev} onStep={step} />}
    <div ref={panel} className="module-dialog-panel" tabIndex={-1}>
      <div className="module-dialog-bar">
        <span className="module-dialog-meta">
          {index !== undefined && total !== undefined && total > 1 && <span className="module-dialog-position" aria-label={`Module ${index + 1} of ${total}`}>
            {total <= 16 && <span className="module-dialog-trigs" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i === index ? 'is-on' : undefined} />)}</span>}
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}<em>/</em>{String(total).padStart(2, '0')}</span>
          </span>}
          {status}
        </span>
        <span className="module-page-buttons">{actions}<button type="button" className="button button-quiet module-dialog-close" aria-label={'Close ' + title} title="Close (Esc)" onClick={onClose}><Icon name="close" size={18} /></button></span>
      </div>
      {children}
    </div>
    {paging && <StepButton which="next" target={next} onStep={step} />}
  </dialog>
}

/** The module page's chevrons (`catalog-chevron`), so paging looks the same in both places. */
function StepButton({ which, target, onStep }: { which: 'prev' | 'next'; target?: Step; onStep: (which: 'prev' | 'next') => void }) {
  const label = which === 'prev' ? 'Previous' : 'Next'
  return <button type="button" className={'catalog-chevron module-dialog-step is-' + (which === 'prev' ? 'previous' : 'next')} disabled={!target}
    aria-label={target ? label + ' module: ' + target.title : 'No ' + label.toLowerCase() + ' module'} aria-keyshortcuts={which === 'prev' ? 'ArrowLeft' : 'ArrowRight'}
    title={target ? label + ': ' + target.title + (which === 'prev' ? ' (←)' : ' (→)') : undefined} onClick={() => onStep(which)}><Icon name="back" size={24} /><span aria-hidden="true">{label}</span></button>
}
