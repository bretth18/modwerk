import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

export function FirmwareDownloadDialog({ onDownload, onClose }: { onDownload: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current, previousFocus = document.activeElement
    element?.showModal()
    return () => { element?.close(); if (previousFocus instanceof HTMLElement) previousFocus.focus() }
  }, [])

  return <dialog ref={dialog} className="app-dialog firmware-download-dialog" aria-labelledby="firmware-download-title" aria-describedby="firmware-download-message" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="firmware-download-title">Start with a fresh project</h2>
    <div id="firmware-download-message">
      <p>Back up your projects. After installing, create and open a fresh Octatrack project.</p>
      <p>Projects using replaced stock effects won’t work. Removing stock FX2 effects can also break compatibility.</p>
    </div>
    <div className="dialog-actions">
      <button type="button" className="button button-quiet" autoFocus onClick={onClose}>Cancel</button>
      <button type="button" className="button button-danger" onClick={onDownload}><Icon name="download" size={16} />I understand — download</button>
    </div>
  </dialog>
}
