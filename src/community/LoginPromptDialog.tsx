import { useEffect, useRef } from 'react'
import { accountHref } from './member-access'
export function LoginPromptDialog({next,onClose}:{next:string;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const element=dialog.current,previousFocus=document.activeElement;element?.showModal();return()=>{element?.close();if(previousFocus instanceof HTMLElement)previousFocus.focus()}},[])
  return <dialog ref={dialog} className="app-dialog login-prompt-dialog" aria-labelledby="login-prompt-title" aria-describedby="login-prompt-message" onCancel={event=>{event.preventDefault();onClose()}}><h2 id="login-prompt-title">Sign in to build firmware</h2><p id="login-prompt-message">Use your Modwerk account or create one to continue. Your configuration will be waiting when you return, and your firmware stays on this device.</p><div className="dialog-actions"><a className="button button-primary" href={accountHref('login',next)} onClick={onClose} autoFocus>Sign in</a><a className="button button-quiet" href={accountHref('register',next)} onClick={onClose}>Create account</a><button className="text-button" onClick={onClose}>Cancel</button></div></dialog>
}
