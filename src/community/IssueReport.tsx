import { useEffect, useId, useRef, useState } from 'react'
import { post } from './api'
import { useCommunity } from './context'
import { AccountAccess } from './AccountAccess'
import { FLASH_STATES, LOG_MISSING_REASONS, OT_MODELS } from './issue-context'
import type { FlashState, IssueContext, LogMissingReason, OtModel } from './issue-context'
import { describeOtLog, OT_LOG_MAX_BYTES, OT_LOG_NAME, OtLogError, parseOtLog } from './ot-log'
import type { OtLog } from './ot-log'
import { moduleIssuesUrl, REPORT_OS, useWorkspaceReportContext } from './report-context'

type Sent = { githubUrl: string | null; author: string }

export function IssueReport({id,author,openRequest=0}:{id:string;author:string;openRequest?:number}){
 const report=useRef<HTMLDetailsElement>(null),title=useRef<HTMLInputElement>(null),success=useRef<HTMLDivElement>(null)
 const fileInput=useRef<HTMLInputElement>(null),readRequest=useRef(0),helpId=useId()
 useEffect(()=>{
  if(!openRequest||!report.current)return
  report.current.open=true
  const target=title.current??report.current.querySelector('summary')
  target?.focus()
  report.current.scrollIntoView({block:'start'})
 },[openRequest])
 const {session}=useCommunity()
 const workspace=useWorkspaceReportContext()
 const [model,setModel]=useState<OtModel|''>(''),[flash,setFlash]=useState<FlashState|''>('')
 const [log,setLog]=useState<OtLog|null>(null),[logError,setLogError]=useState('')
 const [reading,setReading]=useState(false),[logName,setLogName]=useState(''),[logNote,setLogNote]=useState('')
 const [noLog,setNoLog]=useState(false),[reason,setReason]=useState<LogMissingReason|''>(''),[note,setNote]=useState('')
 const [sent,setSent]=useState<Sent|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{if(sent){success.current?.focus();report.current?.scrollIntoView({block:'start'})}},[sent])
 const inConfiguration=workspace.modules.some(item=>item.id===id)||id.startsWith('remix-')
 const reasonOptions=(Object.keys(LOG_MISSING_REASONS) as LogMissingReason[]).filter(item=>!(item==='not-flashed'&&flash==='flashed'))
 const logReady=!!log||(noLog&&!!reason&&reasonOptions.includes(reason)&&(reason!=='other'||note.trim().length>=10))

 async function readLogs(files:File[]){
  const request=++readRequest.current
  setLog(null);setLogError('');setLogNote('');setReading(true)
  try{
   if(files.length>2)throw new OtLogError('Choose OCTAMOD.LOG and, if present, OCTAMOD1.LOG. Two files are enough.')
   const valid:{file:File;log:OtLog}[]=[],rejected:string[]=[]
   for(const file of files){
    try{
     if(file.size>OT_LOG_MAX_BYTES)throw new OtLogError('This file is larger than 64 KB. Choose a log from the top folder of the card.')
     valid.push({file,log:parseOtLog(new Uint8Array(await file.arrayBuffer()))})
    }catch(error){rejected.push(file.name+': '+(error instanceof Error?error.message:'Could not read this file.'))}
   }
   if(request!==readRequest.current)return
   // Card file dates can be wrong if the device clock is unset. Show the
   // choice explicitly and allow either file to be selected on its own.
   valid.sort((a,b)=>b.file.lastModified-a.file.lastModified)
   if(valid.length){
    setLog(valid[0].log);setLogName(valid[0].file.name);setNoLog(false)
    setLogNote(rejected.length?'The other file could not be checked; using this complete log.':valid.length>1?'Using the complete log with the newest file date. Choose either file on its own to change this.':'')
   }else if(rejected.length)setLogError(rejected.join(' '))
  }catch(error){if(request===readRequest.current)setLogError(error instanceof Error?error.message:'Unable to read the log.')}
  finally{if(request===readRequest.current)setReading(false)}
 }
 function removeLog(){
  ++readRequest.current;setReading(false);setLog(null);setLogError('');setLogNote('')
  if(fileInput.current)fileInput.current.value=''
 }
 async function send(form:HTMLFormElement){
  if(!session.user||!model||!flash||reading||busy)return
  if(!logReady){setError('Attach '+OT_LOG_NAME+', or tick “I can’t attach” and choose why.');return}
  setBusy(true);setError('')
  // Reserve a tab during the user's submit gesture; a delayed window.open
  // would usually be blocked. Keep a visible link if popups are disabled.
  let issueTab:Window|null=null
  try{issueTab=window.open('about:blank','_blank');if(issueTab)issueTab.opener=null}catch{/* The confirmation link is the fallback. */}
  const fields=Object.fromEntries(new FormData(form)) as Record<string,string>
  const context:IssueContext={model,flash,os:REPORT_OS,modules:workspace.modules,keepStockFx2:workspace.keepStockFx2,build:workspace.build}
  try{
   const result=await post<Sent>('/modules/'+id+'/issues',{title:fields.title,steps:fields.steps,expected:fields.expected,actual:fields.actual,context,...(log?{log:log.text}:{logMissing:{reason,note}})})
   setSent(result)
   if(result.githubUrl&&/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[0-9]+$/.test(result.githubUrl)){
    try{if(issueTab)issueTab.location.replace(result.githubUrl)}catch{issueTab?.close()}
   }else issueTab?.close()
  }catch(error){issueTab?.close();setError(error instanceof Error?error.message:'Unable to send issue.')}
  finally{setBusy(false)}
 }

 return <details ref={report} className="issue-report"><summary>Report an issue <span>For @{author}</span></summary>
  {!session.user?<AccountAccess/>:sent?<div ref={success} className="issue-report-success" role="status" tabIndex={-1}>
   <strong>{sent.githubUrl?'Your GitHub issue is open':'Your report is saved'}</strong>
   <p>{sent.githubUrl?<>The issue mentions @{sent.author||author} and includes your report and log, if attached.</>:<>GitHub has not received it yet. Your report is saved for the administrator to forward to @{sent.author||author}; you do not need to submit it again.</>}</p>
   {sent.githubUrl&&<a className="button button-primary" href={sent.githubUrl} target="_blank" rel="noreferrer">Open issue on GitHub ↗</a>}
   <p>Track it under <a href="#activity">Your activity</a> from any device. Replies are on GitHub.</p>
  </div>:
  <form className="community-form" aria-busy={busy} onSubmit={event=>{event.preventDefault();void send(event.currentTarget)}}>
   <p className="service-note">Tell <a href={'https://github.com/'+author} target="_blank" rel="noreferrer">@{author}</a> what happened. We create a <strong>public GitHub issue</strong> that mentions them and opens in a new tab. Your verified account identifies this report; your email stays private. <a href={moduleIssuesUrl(id)} target="_blank" rel="noreferrer">Check existing issues ↗</a></p>
   <fieldset><legend>1. Describe the problem</legend>
   <p className="service-note">Reporting as {session.user?.displayName}</p>
   <label>Issue title<input ref={title} name="title" required maxLength={160} placeholder="What went wrong, in one line"/></label>
   <div className="issue-report-row">
    <label>Octatrack<select required value={model} onChange={event=>setModel(event.target.value as OtModel)}><option value="" disabled>Choose…</option>{(Object.keys(OT_MODELS) as OtModel[]).map(key=><option key={key} value={key}>{OT_MODELS[key]}</option>)}</select></label>
    <label>It is running<select required value={flash} onChange={event=>setFlash(event.target.value as FlashState)}><option value="" disabled>Choose…</option>{(Object.keys(FLASH_STATES) as FlashState[]).map(key=><option key={key} value={key}>{FLASH_STATES[key]}</option>)}</select></label>
   </div>
   <label>Steps to reproduce<textarea name="steps" required maxLength={3000} rows={4} placeholder={'1. Load a project with …\n2. Set FX1 to …\n3. Turn …'}/></label>
   <label>Expected result<textarea name="expected" required maxLength={1000} rows={2}/></label>
   <label>Actual result<textarea name="actual" required maxLength={2000} rows={2} placeholder="What happened instead: sound, screen message, freeze, reboot …"/></label>

   </fieldset>
   <fieldset className="issue-report-attached"><legend>2. Check your configuration</legend>
    {workspace.modules.length?<><p className="service-note">Attached from this browser’s active configuration <strong>{workspace.configurationName}</strong>, base OS {REPORT_OS}: {workspace.modules.map(item=>item.id+' '+item.version).join(', ')}.{workspace.build?' Build fingerprint '+workspace.build.slice(0,12)+'….':' Not built in this browser session, so no build fingerprint.'}</p>
     {!inConfiguration&&<p className="file-error">This module is not in your active configuration. If you have it saved here, select the configuration you flashed before reporting.</p>}</>
    :<p className="service-note">No modules are selected in your active configuration. If you have it saved here, select the configuration you flashed. An attached device log also includes its own module list.</p>}
   </fieldset>

   <fieldset className="issue-report-log"><legend>3. Attach the device log</legend>
    <p className="service-note">Logging is built in; there is nothing to select or enable. Older builds may not have a log.</p>
    <details className="issue-report-help" open><summary>Where to find the log</summary>
     <ol className="issue-report-steps" id={helpId}>
      <li>If the Octatrack still responds, stop playback and recording. Wait at least 30 seconds after the last save, then save the project from the <kbd>PROJECT</kbd> menu. Wait for saving to finish.</li>
      <li>Connect it by USB and open <kbd>PROJECT</kbd> › SYSTEM › USB DISK MODE. Alternatively, switch it off before removing the CF card and use a card reader.</li>
      <li>Open the card in Finder (Mac) or File Explorer (Windows). Look in the <strong>top folder of the card</strong>, beside your set folders, for <strong>OCTAMOD.LOG</strong> and <strong>OCTAMOD1.LOG</strong>.</li>
      <li>Choose one or both files below. We check them on your device and select the complete log with the newest file date. Nothing is uploaded until you press “Create issue”.</li>
      <li>Eject the card on your computer before leaving USB disk mode or removing the card.</li>
     </ol>
     <p className="service-note"><strong>After a freeze or crash:</strong> copy the logs already on the card as soon as possible. The latest events may be missing. Restarting cannot guarantee their recovery; describe the last action and screen in your report. You can report without a log if neither file is readable.</p>
    </details>
    <label>Choose log files<input ref={fileInput} type="file" multiple accept=".log,.LOG,text/plain" disabled={busy} aria-describedby={helpId} onChange={event=>void readLogs(Array.from(event.target.files??[]))}/></label>
    {reading&&<p className="service-note" role="status">Checking your log on this device…</p>}
    {log&&<div className="issue-report-log-preview">
     <p className="success-note" role="status"><strong>{logName} is ready.</strong> {describeOtLog(log.summary)}.</p>
     {logNote&&<p className="service-note">{logNote}</p>}
     <p className="service-note">Device log: OS {log.summary.os}; {log.summary.modules.map(item=>item.id+' '+item.version).join(', ')||'no modules listed'}. This stays separate from your browser configuration.</p>
     <details><summary>Preview the log that will be public</summary><pre tabIndex={0}>{log.text.trimEnd()}</pre></details>
     <button type="button" className="button button-quiet" disabled={busy} onClick={removeLog}>Remove log</button>
    </div>}
    {logError&&<p className="file-error" role="alert">{logError} Try the other log, or choose why you cannot attach one below.</p>}
    {!log&&<label className="issue-report-escape"><input type="checkbox" checked={noLog} onChange={event=>setNoLog(event.target.checked)}/><span>I can’t attach {OT_LOG_NAME}</span></label>}
    {!log&&noLog&&<><label>Why not?<select required value={reasonOptions.includes(reason as LogMissingReason)?reason:''} onChange={event=>setReason(event.target.value as LogMissingReason)}><option value="" disabled>Choose…</option>{reasonOptions.map(key=><option key={key} value={key}>{LOG_MISSING_REASONS[key]}</option>)}</select></label>
     <label>Details{reason==='other'?'':' (optional)'}<input value={note} onChange={event=>setNote(event.target.value)} maxLength={500} required={reason==='other'} minLength={reason==='other'?10:undefined} placeholder="For example: blank screen after the Elektron logo"/></label></>}
   </fieldset>

   <p className="service-note">Your report, optional name, configuration and attached log will be public on GitHub. Leave out firmware, samples and private information.</p>
   <button className="button button-primary" disabled={busy||reading}>{busy?'Creating issue…':'Create issue'}</button>
  </form>}
  {error&&<p className="file-error" role="alert">{error}</p>}</details>
}
