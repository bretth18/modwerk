import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

export function SupportButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className="support-link" aria-haspopup="dialog" onClick={onClick}><span className="support-heart"><Icon name="heart" size={14} /></span>Support Modwerk</button>
}

export function SupportDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element?.showModal()
    return () => {
      element?.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  return <dialog ref={dialog} className="app-dialog support-dialog" aria-labelledby="support-title" aria-describedby="support-message" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="support-title"><span className="support-heart"><Icon name="heart" size={20} /></span>A little support for Modwerk</h2>
    <div id="support-message">
      <p>Modwerk is a collaborative effort, built on octabam and the work of module authors and everyone who shares ideas, fixes and feedback.</p>
      <p>I look after this site, curate the modules and help keep the community a useful, welcoming place. If you’d like to support the time I put into that, you can leave a small tip.</p>
      <p>Thanks for being part of it.</p>
    </div>
    <div className="dialog-actions">
      <button type="button" className="button button-quiet" autoFocus onClick={onClose}>Close</button>
      <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer" aria-label="Support via PayPal (opens in a new tab)">Support via PayPal <span aria-hidden="true">↗</span></a>
    </div>
  </dialog>
}
