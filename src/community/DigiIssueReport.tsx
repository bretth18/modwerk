import { useState } from 'react'
import { post } from './api'
import { useCommunity } from './context'
import { MemberPrompt } from './MemberPrompt'
import { FLASH_STATES, type DigiIssueContext, type FlashState } from './issue-context'
import { useWorkspaceReportContext } from './report-context'
import { communityModule } from './modules'
import { DEVICES_BY_ID } from '../devices/registry'
import { ReportSharing } from './ReportSharing'

export function DigiIssueReport({id}:{id:string}) {
  const module=communityModule(id)!,device=DEVICES_BY_ID[module.machine],workspace=useWorkspaceReportContext(module.machine),{session}=useCommunity()
  const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sharing,setSharing]=useState(false)
  async function send(form:HTMLFormElement) {
    setBusy(true);setError('')
    try {
      const fields=Object.fromEntries(new FormData(form)) as Record<string,string>
      const context:DigiIssueContext={machine:module.machine as DigiIssueContext['machine'],model:fields.model,flash:fields.flash as FlashState,os:fields.os,moduleVersion:fields.moduleVersion,modules:workspace.modules,keepStockFx2:null,build:workspace.build}
      await post('/modules/'+id+'/issues',{title:fields.title,steps:fields.steps,expected:fields.expected,actual:fields.actual,context,maintainerSharing:sharing});setSent(true)
    } catch(error) {setError(error instanceof Error?error.message:'Unable to send the report.')} finally {setBusy(false)}
  }
  return <details className="issue-report"><summary>Report an issue <span>For @{module.author}</span></summary>{sent?<p className="success-note" role="status">Your private report is saved. Follow it and read replies under <a href="#account">Your account</a>.</p>:!session.user?.verified?<MemberPrompt/>:<form className="community-form" onSubmit={event=>{event.preventDefault();void send(event.currentTarget)}}>
    <p className="service-note">This report is visible to you and the administrator. Choose below if verified module maintainers may also help. Nothing is published to GitHub or the forum.</p>
    <label>Issue title<input name="title" required maxLength={160}/></label>
    <div className="form-two-columns"><label>{device.name} model<select name="model" required><option value="">Choose…</option>{(device.variants??[device.name]).map(model=><option key={model}>{model}</option>)}</select></label><label>It is running<select name="flash" required><option value="">Choose…</option>{Object.entries(FLASH_STATES).map(([key,label])=><option key={key} value={key}>{label.replace('an Octamod','a Modwerk')}</option>)}</select></label></div>
    <div className="form-two-columns"><label>Base OS<select name="os" required><option value="">Choose the OS you used…</option>{device.firmware?.releases.map(release=><option key={release}>{release}</option>)}</select></label><label>Module version<input name="moduleVersion" required maxLength={80} defaultValue={module.version}/></label></div>
    <label>Steps to reproduce<textarea name="steps" required maxLength={3000} rows={4}/></label><label>Expected result<textarea name="expected" required maxLength={1000} rows={2}/></label><label>Actual result<textarea name="actual" required maxLength={2000} rows={2}/></label>
    <fieldset><legend>Configuration from this browser</legend><p className="service-note">{workspace.modules.length?<>{workspace.configurationName}: {workspace.modules.map(item=>item.id+' '+item.version).join(', ')}.</>:'No modules selected for this machine.'} Select the configuration you used before reporting. {workspace.build?'Build fingerprint: '+workspace.build:'No build fingerprint is available.'}</p></fieldset>
    <p className="service-note">{device.name} reports use these details without an Octatrack log. Do not include firmware, samples, passwords or personal information.</p>
    <ReportSharing checked={sharing} onChange={setSharing} disabled={busy}/><button className="button button-primary" disabled={busy}>{busy?'Sending…':'Send private report'}</button>
  </form>}{error&&<p className="file-error" role="alert">{error}</p>}</details>
}
