import { useEffect, useRef } from 'react'
import { accountHref } from './member-access'
import { Icon } from '../components/Icon'
export function LoginPromptDialog({next,onClose}:{next:string;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),signIn=useRef<HTMLAnchorElement>(null)
  useEffect(()=>{const element=dialog.current,previousFocus=document.activeElement;element?.showModal();signIn.current?.focus();return()=>{element?.close();if(previousFocus instanceof HTMLElement)previousFocus.focus()}},[])
  return <dialog ref={dialog} className="app-dialog login-prompt-dialog" aria-labelledby="login-prompt-title" aria-describedby="login-prompt-message login-prompt-notice login-prompt-privacy" onCancel={event=>{event.preventDefault();onClose()}}>
    <header className="login-prompt-header">
      <h2 id="login-prompt-title">Sign in to build firmware</h2>
      <button type="button" className="icon-button" aria-label="Cancel" onClick={onClose}><Icon name="close" size={18}/></button>
    </header>
    <p id="login-prompt-message">Sign in or create a free Modwerk account to continue.</p>
    <div id="login-prompt-notice" className="login-prompt-notice">
      <p>Firmware builds are currently available only to signed-in users. This helps us grow an active community for bug reports, feedback and forum discussions.</p>
      <p><strong>Modwerk will always stay free and open source &lt;3</strong></p>
    </div>
    <p id="login-prompt-privacy">Your configuration will be waiting when you return. Your firmware stays on this device.</p>
    <div className="dialog-actions">
      <a ref={signIn} className="button button-primary" href={accountHref('login',next)} onClick={onClose}>Sign in</a>
      <a className="button button-quiet" href={accountHref('register',next)} onClick={onClose}>Create account</a>
    </div>
  </dialog>
}
