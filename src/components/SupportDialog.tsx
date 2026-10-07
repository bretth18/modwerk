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
      <p>Modwerk is a community effort, built on octabam and the work of module authors and everyone who shares ideas, fixes and feedback.</p>
      <p>Hosting, storage and the community backend cost money every month, and so far I've covered that myself. On top of that I spend a lot of time on the site, curating modules and keeping the community useful and welcoming.</p>
      <p>If Modwerk helps you and you'd like to chip in, you can leave a small tip. It's totally optional and everything stays free either way. Reporting bugs, sharing modules and helping each other out is already the best support there is :))</p>
    </div>
    <div className="dialog-actions">
      <button type="button" className="button button-quiet" autoFocus onClick={onClose}>Close</button>
      <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer" aria-label="Support on Ko-fi (opens in a new tab)">Support on Ko-fi <span aria-hidden="true">↗</span></a>
    </div>
  </dialog>
}
