import { useEffect, useRef, useState } from 'react'
import { post } from './api'
import { FLASH_STATES, LOG_MISSING_REASONS, loggerInCatalog, LOGGER_MODULE_ID, OT_MODELS } from './issue-context'
import type { FlashState, IssueContext, LogMissingReason, OtModel } from './issue-context'
import { describeOtLog, OT_LOG_MAX_BYTES, OT_LOG_NAME, OtLogError, parseOtLog } from './ot-log'
import type { OtLog } from './ot-log'
import { moduleIssuesUrl, REPORT_OS, useWorkspaceReportContext } from './report-context'

type Sent = { githubUrl: string | null }
const LOGGER_RELEASED = loggerInCatalog()

export function IssueReport({id,author,openRequest=0}:{id:string;author:string;openRequest?:number}){
 const report=useRef<HTMLDetailsElement>(null),title=useRef<HTMLInputElement>(null)
 useEffect(()=>{
  if(!openRequest||!report.current)return
  report.current.open=true
  const target=title.current??report.current.querySelector('summary')
  target?.focus()
  report.current.scrollIntoView({block:'start'})
 },[openRequest])
 const workspace=useWorkspaceReportContext()
 const [model,setModel]=useState<OtModel|''>(''),[flash,setFlash]=useState<FlashState|''>('')
 const [log,setLog]=useState<OtLog|null>(null),[logError,setLogError]=useState('')
 const [noLog,setNoLog]=useState(!LOGGER_RELEASED),[reason,setReason]=useState<LogMissingReason|''>(LOGGER_RELEASED?'':'logger-not-in-build'),[note,setNote]=useState('')
 const [sent,setSent]=useState<Sent|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const inConfiguration=workspace.modules.some(item=>item.id===id)||id.startsWith('remix-')
 const hasLogger=workspace.modules.some(item=>item.id===LOGGER_MODULE_ID)
 const reasonOptions=(Object.keys(LOG_MISSING_REASONS) as LogMissingReason[]).filter(item=>!(item==='logger-not-in-build'&&hasLogger)&&!(item==='not-flashed'&&flash==='flashed'))
 const logReady=!!log||(noLog&&!!reason&&reasonOptions.includes(reason)&&(reason!=='other'||note.trim().length>=10))

 async function readLog(file:File|undefined){
  setLog(null);setLogError('')
  if(!file)return
  if(file.size>OT_LOG_MAX_BYTES){setLogError('This file is larger than '+OT_LOG_MAX_BYTES/1024+' KB, so it is not '+OT_LOG_NAME+'. Choose the file from the top folder of the card.');return}
  try{setLog(parseOtLog(new Uint8Array(await file.arrayBuffer())));setNoLog(false)}
  catch(error){setLogError(error instanceof OtLogError?error.message:'This file could not be read.')}
 }
 async function send(form:HTMLFormElement){
  if(!model||!flash)return
  if(!logReady){setError('Attach '+OT_LOG_NAME+', or tick “I can’t attach” and choose why.');return}
  setBusy(true);setError('')
  const fields=Object.fromEntries(new FormData(form)) as Record<string,string>
  const context:IssueContext={model,flash,os:REPORT_OS,modules:workspace.modules,keepStockFx2:workspace.keepStockFx2,build:workspace.build}
  try{
   const result=await post<{githubUrl:string|null}>('/modules/'+id+'/issues',{displayName:fields.displayName,title:fields.title,steps:fields.steps,expected:fields.expected,actual:fields.actual,context,...(log?{log:log.text}:{logMissing:{reason,note}})})
   setSent({githubUrl:result.githubUrl})
  }catch(error){setError(error instanceof Error?error.message:'Unable to send issue.')}
  finally{setBusy(false)}
 }

 return <details ref={report} className="issue-report"><summary>Report an issue <span>For @{author}</span></summary>
  {sent?<p className="success-note" role="status">Issue sent to @{author}.{sent.githubUrl?<> It is on GitHub as <a href={sent.githubUrl} target="_blank" rel="noreferrer">{sent.githubUrl.replace('https://github.com/','')} ↗</a>, where the author can reply and close it.</>:' The Octamod administrator will pass it on.'} Follow its status under <a href="#activity">Your activity</a> on this device.</p>:
  <form className="community-form" onSubmit={event=>{event.preventDefault();void send(event.currentTarget)}}>
   <p className="service-note">This report becomes a <strong>public GitHub issue</strong> for <a href={'https://github.com/'+author} target="_blank" rel="noreferrer">@{author}</a>, who is notified and can answer there. No account or email is needed. Your name, the text below, your module list and the attached log are public. Do not include firmware, samples or private data. <a href={moduleIssuesUrl(id)} target="_blank" rel="noreferrer">Known issues for this module ↗</a></p>
   <label>Your name (optional)<input name="displayName" maxLength={60} placeholder="Guest"/></label>
   <label>Issue title<input ref={title} name="title" required maxLength={160} placeholder="What went wrong, in one line"/></label>
   <div className="issue-report-row">
    <label>Octatrack<select required value={model} onChange={event=>setModel(event.target.value as OtModel)}><option value="" disabled>Choose…</option>{(Object.keys(OT_MODELS) as OtModel[]).map(key=><option key={key} value={key}>{OT_MODELS[key]}</option>)}</select></label>
    <label>It is running<select required value={flash} onChange={event=>setFlash(event.target.value as FlashState)}><option value="" disabled>Choose…</option>{(Object.keys(FLASH_STATES) as FlashState[]).map(key=><option key={key} value={key}>{FLASH_STATES[key]}</option>)}</select></label>
   </div>
   <label>Steps to reproduce<textarea name="steps" required maxLength={3000} rows={4} placeholder={'1. Load a project with …\n2. Set FX1 to …\n3. Turn …'}/></label>
   <label>Expected result<textarea name="expected" required maxLength={1000} rows={2}/></label>
   <label>Actual result<textarea name="actual" required maxLength={2000} rows={2} placeholder="What happened instead: sound, screen message, freeze, reboot …"/></label>

   <fieldset className="issue-report-attached"><legend>Configuration (attached automatically)</legend>
    {workspace.modules.length?<><p className="service-note">From your active configuration <strong>{workspace.configurationName}</strong>, base OS {REPORT_OS}: {workspace.modules.map(item=>item.id+' '+item.version).join(', ')}.{workspace.build?' Build fingerprint '+workspace.build.slice(0,12)+'….':' Not built in this browser session, so no build fingerprint.'}</p>
     {!inConfiguration&&<p className="file-error">This module is not in your active configuration. Switch to the configuration you flashed before reporting, so the author can rebuild it.</p>}</>
    :<p className="service-note">No modules are selected in your active configuration. Select the configuration you flashed so the author sees your exact module versions.</p>}
   </fieldset>

   <fieldset className="issue-report-log"><legend>{OT_LOG_NAME} from the card</legend>
    {!LOGGER_RELEASED&&<p className="service-note">The OCTAMOD logger module is not released yet, so current builds cannot write {OT_LOG_NAME}. Leave “I can’t attach” ticked with the first reason. Once the logger is released, a log is required.</p>}
    <ol className="issue-report-steps">
     <li>Reproduce the problem, then save the project (<kbd>PROJECT</kbd> › SAVE PROJECT). If the Octatrack froze or rebooted, switch it off and on once instead: start-up writes the previous session to the log.</li>
     <li>Connect the Octatrack by USB and choose <kbd>PROJECT</kbd> › SYSTEM › USB DISK MODE, or put the CF card in a card reader.</li>
     <li>Open the card on your computer. {OT_LOG_NAME} is in the top folder, next to your sets.</li>
     <li>Choose it below. Your browser checks it before anything is sent; only this log format is accepted.</li>
     <li>Eject the card on your computer before you leave USB disk mode or remove the card.</li>
    </ol>
    <label>Log file<input type="file" accept=".log,.LOG,text/plain" onChange={event=>void readLog(event.target.files?.[0])}/></label>
    {log&&<p className="success-note" role="status">{OT_LOG_NAME} checked: {describeOtLog(log.summary)}.{log.summary.build!=='unknown'&&workspace.build&&!workspace.build.startsWith(log.summary.build)?' It was written by a different build than this browser last built; that is fine if it is the firmware you flashed.':''}</p>}
    {logError&&<p className="file-error" role="alert">{logError}</p>}
    {!log&&<label className="issue-report-escape"><input type="checkbox" checked={noLog} onChange={event=>setNoLog(event.target.checked)}/><span>I can’t attach {OT_LOG_NAME}</span></label>}
    {!log&&noLog&&<><label>Why not?<select required value={reasonOptions.includes(reason as LogMissingReason)?reason:''} onChange={event=>setReason(event.target.value as LogMissingReason)}><option value="" disabled>Choose…</option>{reasonOptions.map(key=><option key={key} value={key}>{LOG_MISSING_REASONS[key]}</option>)}</select></label>
     <label>Details{reason==='other'?'':' (optional)'}<input value={note} onChange={event=>setNote(event.target.value)} maxLength={500} required={reason==='other'} minLength={reason==='other'?10:undefined} placeholder="For example: blank screen after the Elektron logo"/></label></>}
   </fieldset>

   <button className="button button-quiet" disabled={busy}>{busy?'Sending…':'Send issue to author'}</button>
  </form>}
  {error&&<p className="file-error" role="alert">{error}</p>}</details>
}
