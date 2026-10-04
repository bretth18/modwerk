import { useEffect, useRef, useState } from 'react'
import { api, post } from './api'
import { apiUrl, sourceRepository } from '../hosting'
import type { CommunityModule } from './modules'
import { DEVICES_BY_ID } from '../devices/registry'
import { PrivateIssueDetail } from './PrivateIssueDetail'
type DeveloperSession={available:boolean;user:{login:string}|null}
type Module=CommunityModule & {claimed:boolean;blocked:boolean;reports:{total:number;open:number|null};ratings:{count:number;average:number|null};threads:number}
type Report={id:string;module_id:string;title:string;status:string;created_at:string}
const verifierKey='modwerk.developer.sign-in'
async function startSignIn(){
  const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('')
  sessionStorage.setItem(verifierKey,verifier)
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))),challenge=Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('')
  window.location.assign(apiUrl('/developer/auth/start?challenge='+challenge))
}
export function DeveloperPage({route}:{route:string}) {
  const [session,setSession]=useState<DeveloperSession|null>(null),[modules,setModules]=useState<Module[]>([]),[reports,setReports]=useState<Report[]>([]),[selected,setSelected]=useState(''),[status,setStatus]=useState('open'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const complete=route.startsWith('developer/complete/'),reportId=route.startsWith('developer/report/')?route.split('/')[2]:''
  useEffect(()=>{
    if(complete)return
    let cancelled=false
    void api<DeveloperSession>('/developer/auth/session').then(async value=>{
      if(cancelled)return;setSession(value);setModules([]);setReports([])
      if(value.user){const items=await api<Module[]>('/developer/modules');if(!cancelled)setModules(items)}else setModules([])
    }).catch(error=>{if(!cancelled)setError(error.message)})
    return()=>{cancelled=true}
  },[complete,revision])
  const completing=useRef(false)
  useEffect(()=>{
    if(!complete){completing.current=false;return}
    if(completing.current)return
    completing.current=true
    const code=route.split('/')[2],verifier=sessionStorage.getItem(verifierKey)
    history.replaceState(null,'','#developer/complete')
    void post('/developer/auth/complete',{code,verifier}).then(()=>{sessionStorage.removeItem(verifierKey);window.location.assign('#developer')}).catch(error=>setError(error.message))
  },[complete,route])
  useEffect(()=>{
    if(!session?.user||reportId)return
    let cancelled=false
    void api<Report[]>('/developer/issues?status='+status+(selected?'&moduleId='+encodeURIComponent(selected):'')).then(value=>{if(!cancelled)setReports(value)}).catch(error=>{if(!cancelled)setError(error.message)})
    return()=>{cancelled=true}
  },[session?.user,selected,status,reportId,revision])
  async function act(action:()=>Promise<unknown>){setBusy(true);setError('');try{await action();setRevision(value=>value+1)}catch(error){setError(error instanceof Error?error.message:'Unable to update developer access.')}finally{setBusy(false)}}
  return <div className="community-page developer-page"><div className="page-heading"><div><p className="page-kicker">MODWERK / DEVELOPERS</p><h1>Developer workspace</h1><p>Claim your modules, answer private reports and keep their documentation and releases current.</p></div>{session?.user&&<button className="button button-quiet" disabled={busy} onClick={()=>void act(()=>api('/developer/auth/session',{method:'DELETE'}))}>Sign out @{session.user.login}</button>}</div>
    {error&&<p className="file-error" role="alert">{error}</p>}
    {complete?<section className="configuration-section"><h2>{error?'GitHub sign-in could not finish':'Signing in with GitHub…'}</h2>{!error&&<p role="status">Opening your developer workspace…</p>}<a className="text-button" href="#developer">Start again</a></section>:!session?error?<button className="button button-quiet" onClick={()=>{setError('');setRevision(value=>value+1)}}>Retry connection</button>:<p role="status">Checking developer sign-in…</p>:!session.user?<section className="configuration-section"><h2>Sign in with GitHub</h2><p>Use the GitHub account listed as an author or maintainer in your module’s reviewed source. No separate developer password or email is needed.</p><button className="button button-primary" disabled={!session.available||busy} onClick={()=>void act(startSignIn)}>Continue with GitHub</button>{!session.available&&<p className="service-note">GitHub developer sign-in is not configured on this backend yet.</p>}</section>:reportId?<PrivateIssueDetail key={reportId} id={reportId} back="#developer"/>:<>
      <section className="configuration-section"><h2>Your modules</h2>{!modules.length?<p className="service-note">No reviewed module lists @{session.user.login} as a maintainer yet. Add the handle to the module manifest through a reviewed GitHub PR, then sign in again.</p>:<div className="developer-module-grid">{modules.map(module=><article className="inbox-issue" key={module.id}><div className="section-title"><h3><a href={module.href}>{module.name}</a></h3><span className="pill">{DEVICES_BY_ID[module.machine].name}</span></div><p>Version {module.version} · Evidence: {module.evidence}</p>{!module.claimed?<button className="button button-primary" disabled={busy||module.blocked} onClick={()=>void act(()=>post('/developer/modules/'+module.id+'/claim',{}))}>{module.blocked?'Access revoked — contact administrator':'Claim module'}</button>:<><p>{module.reports.open??0} open reports · {module.ratings.count} ratings{module.ratings.average!==null?' ('+module.ratings.average.toFixed(1)+'/5)':''} · {module.threads} discussions</p><div className="forum-actions"><button className="text-button" onClick={()=>{setSelected(module.id);document.getElementById('developer-reports')?.focus()}}>View reports</button><a href={'#forum?machine='+module.machine+'&module='+module.id}>Forum threads</a><a href={(sourceRepository()||'https://github.com/repeat98/octamod')+'/tree/main/'+module.sourcePath} target="_blank" rel="noreferrer">Source & documentation ↗</a><a href={'#submit/'+module.id}>Prepare an update</a></div></>}</article>)}</div>}</section>
      <section className="configuration-section"><div className="section-title"><h2 id="developer-reports" tabIndex={-1}>Private module reports</h2><span className="pill">{reports.filter(item=>item.status==='open').length} open</span></div><div className="statistics-controls"><label>Module<select value={selected} onChange={event=>setSelected(event.target.value)}><option value="">All claimed modules</option>{modules.filter(module=>module.claimed).map(module=><option key={module.id} value={module.id}>{DEVICES_BY_ID[module.machine].name} · {module.name}</option>)}</select></label><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="open">Open</option><option value="closed">Resolved</option><option value="all">All reports</option></select></label></div>{reports.map(item=><article className="inbox-issue" key={item.id}><a href={'#developer/report/'+item.id}>{item.title}</a><small>{item.module_id} · {item.status==='open'?'Open':'Resolved'} · {item.created_at}</small></article>)}{!reports.length&&<p className="service-note">No shared reports match these filters. Only reports their authors choose to share appear here.</p>}{reports.length===200&&<p className="service-note">Showing the latest 200 reports.</p>}</section>
      <p className="service-note">Module updates go through GitHub pull requests and owner review. Developer sign-in grants access only to claimed modules; it does not grant site administration or publication.</p>
    </>}
  </div>
}
