import { useState } from 'react'
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
  return <section className="configuration-section"><h2>Download your account data</h2><p>Get your account details, contributions, private reports and community activity as a JSON file. This file contains personal data; store it privately. Saved firmware and local configurations stay on this device and are managed from Configuration.</p><details><summary>Download personal data</summary><form className="community-form" onSubmit={event=>{event.preventDefault();void download(event.currentTarget)}}><AccountConfirmation onReady={setReady}/><button className="button button-quiet" disabled={busy||!ready}>{busy?'Preparing download…':'Download my data'}</button></form></details>{error&&<p className="file-error" role="alert">{error}</p>}{message&&<p className="success-note" role="status">{message}</p>}</section>
}
