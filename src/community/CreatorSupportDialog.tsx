import { useEffect, useId, useRef } from 'react'
import { Icon } from '../components/Icon'
import { koFiEmbedUrl, koFiUrl } from './creator-support'

/** Mounted only after the visitor presses the cup icon. */
export function CreatorSupportDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), closeButton = useRef<HTMLButtonElement>(null), title = useId()
  useEffect(() => {
    const element = dialog.current, previousFocus = document.activeElement
    element?.showModal(); closeButton.current?.focus()
    return () => { element?.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus() }
  }, [])
  return <dialog ref={dialog} className="app-dialog creator-support-dialog" aria-labelledby={title} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="creator-support-dialog-header">
      <span className="creator-support-dialog-mark"><Icon name="heart" size={20}/></span>
      <div><h2 id={title}>Support the creator</h2><p>Say thanks for the work behind this module.</p></div>
      <button ref={closeButton} type="button" className="icon-button" aria-label="Close creator support" onClick={onClose}><Icon name="close" size={18}/></button>
    </header>
    <div className="creator-support-dialog-body"><iframe src={koFiEmbedUrl(url)} title="Ko-fi tip panel" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"/></div>
    <footer className="creator-support-dialog-footer">
      <span><Icon name="lock" size={13}/>Tips handled by Ko-fi</span>
      <a className="creator-support-dialog-link" href={koFiUrl(url)} target="_blank" rel="noopener noreferrer" aria-label="Open Ko-fi in a new tab">Open Ko-fi <span aria-hidden="true">↗</span></a>
    </footer>
  </dialog>
}
