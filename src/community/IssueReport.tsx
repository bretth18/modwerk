import { useEffect, useRef, useState } from 'react'
import { post } from './api'
export function IssueReport({id,author,openRequest=0}:{id:string;author:string;openRequest?:number}){
 const report=useRef<HTMLDetailsElement>(null),title=useRef<HTMLInputElement>(null)
 useEffect(()=>{
  if(!openRequest||!report.current)return
  report.current.open=true
  const target=title.current??report.current.querySelector('summary')
  target?.focus()
  report.current.scrollIntoView({block:'start'})
 },[openRequest])
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function send(form:HTMLFormElement){setBusy(true);setError('');try{await post('/modules/'+id+'/issues',Object.fromEntries(new FormData(form)));setSent(true)}catch(error){setError(error instanceof Error?error.message:'Unable to send issue.')}finally{setBusy(false)}}
 return <details ref={report} className="issue-report"><summary>Report an issue <span>For @{author}</span></summary>{sent?<p className="success-note" role="status">Issue recorded for @{author}. Follow its status under <a href="#activity">Your activity</a> on this device.</p>:<form className="community-form" onSubmit={event=>{event.preventDefault();void send(event.currentTarget)}}><p className="service-note">This report is directed to <a href={'https://github.com/'+author} target="_blank" rel="noreferrer">@{author}</a>. No Octamod account or email required. Reports are private: the Octamod administrator passes them on to the author, and only this device can see your own reports. No notification is sent.</p><label>Your name (optional)<input name="displayName" maxLength={60} placeholder="Guest"/></label><label>Issue title<input ref={title} name="title" required maxLength={160} placeholder="What went wrong?"/></label><label>Details<textarea name="body" required maxLength={4000} rows={4} placeholder="Device model, module / firmware revision, steps to reproduce, expected result and actual result. Do not include firmware or private data."/></label><button className="button button-quiet" disabled={busy}>{busy?'Sending…':'Send issue to author'}</button></form>}{error&&<p className="file-error" role="alert">{error}</p>}</details>
}
