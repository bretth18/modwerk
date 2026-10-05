import { useState } from 'react'
import { Icon } from '../components/Icon'
import { AccountConfirmation } from './AccountConfirmation'
import { apiFetch } from './api'
export function AccountExport(){
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  async function download(form:HTMLFormElement){
    setBusy(true);setError('');setMessage('')
    try{
      const result=await apiFetch('/auth/data-export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:new FormData(form).get('password')})})
      if(!result.ok){const body=await result.json() as {error?:string};throw new Error(body.error??'Unable to download account data.')}
      const blob=await result.blob(),url=URL.createObjectURL(blob),link=document.createElement('a')
      link.href=url;link.download='modwerk-account-data.json';document.body.append(link);link.click();link.remove()
      // Keep the URL valid while the browser starts saving the file.
      window.setTimeout(()=>URL.revokeObjectURL(url),60000)
      form.reset();setMessage('Your account data download was requested.')
    }catch(error){setError(error instanceof Error?error.message:'Unable to download account data.')}finally{setBusy(false)}
  }
  return <section className="configuration-section account-data-export">
    <h2>Download your account data</h2>
    <p className="account-card-description">Save a private copy of your account and contributions.</p>
    <dl className="account-facts"><div><dt>Format</dt><dd>JSON file</dd></div><div><dt>Local configurations</dt><dd>Stay on this device</dd></div></dl>
    <details className="account-action-details"><summary>Download personal data<Icon name="download" size={16}/></summary><form className="community-form" onSubmit={event=>{event.preventDefault();void download(event.currentTarget)}}><AccountConfirmation onReady={setReady}/><button className="button button-primary" disabled={busy||!ready}>{busy?'Preparing download…':'Download my data'}</button></form></details>
    <p className="account-card-note">This file contains personal data. Store it privately.</p>
    <details className="account-details"><summary>What’s included</summary><ul><li>Your account details and community contributions.</li><li>Your private reports and community activity.</li></ul><p>Saved firmware and local configurations stay on this device and are managed from Configuration.</p></details>
    {error&&<p className="file-error" role="alert">{error}</p>}{message&&<p className="success-note" role="status">{message}</p>}
  </section>
}
