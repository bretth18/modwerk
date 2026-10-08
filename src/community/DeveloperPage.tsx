import { CopyButton } from './StarterPrompts'
import { BackLink } from '../components/BackLink'
import { useEffect, useState } from 'react'
import { api, post } from './api'
import { CreatorSupport } from './CreatorSupport'
import { sourceRepository } from '../hosting'
import { moduleThreadId, type CommunityModule } from './modules'
import { NotificationList } from './NotificationList'
import { notificationLines } from './notification-text'
import type { NotificationItem as Notification } from './notification-contract'
import { DEVICES_BY_ID } from '../devices/registry'
import { PrivateIssueDetail } from './PrivateIssueDetail'
import { useCommunity } from './context'
import { AccountPage } from './AccountPage'
import { threadHref } from '../routing'
type Module=CommunityModule & {claimed:boolean;blocked:boolean;reports:{total:number;open:number|null};ratings:{count:number;average:number|null};threads:number}
type Report={id:string;module_id:string;title:string;status:string;created_at:string;forum_thread_id:string|null;github_url:string|null}
export function DeveloperPage({route}:{route:string}) {
  const {developer:session,refreshDeveloper}=useCommunity()
  const [modules,setModules]=useState<Module[]>([]),[reports,setReports]=useState<Report[]>([]),[selected,setSelected]=useState(''),[status,setStatus]=useState('open'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const [notifications,setNotifications]=useState<Notification[]>([])
  const complete=route.startsWith('developer/complete'),reportId=route.startsWith('developer/report/')?route.split('/')[2]:''
  useEffect(()=>{
    if(!session?.user||complete)return
    let cancelled=false
    void api<Module[]>('/developer/modules').then(items=>{if(!cancelled)setModules(items)}).catch(error=>{if(!cancelled){setError(error.message);void refreshDeveloper()}})
    return()=>{cancelled=true}
  },[session?.user,complete,revision,refreshDeveloper])
  useEffect(()=>{
    if(!session?.user||reportId)return
    let cancelled=false
    void api<Report[]>('/developer/issues?status='+status+(selected?'&moduleId='+encodeURIComponent(selected):'')).then(value=>{if(!cancelled)setReports(value)}).catch(error=>{if(!cancelled)setError(error.message)})
    return()=>{cancelled=true}
  },[session?.user,selected,status,reportId,revision])
  useEffect(()=>{
    if(!session?.user||reportId)return
    let cancelled=false
    void api<Notification[]>('/developer/notifications').then(value=>{if(!cancelled)setNotifications(value)}).catch(error=>{if(!cancelled)setError(error.message)})
    return()=>{cancelled=true}
  },[session?.user,reportId,revision])
  async function act(action:()=>Promise<unknown>){setBusy(true);setError('');try{await action();await refreshDeveloper();setRevision(value=>value+1)}catch(error){setError(error instanceof Error?error.message:'Unable to update developer access.')}finally{setBusy(false)}}
  if(!session?.user||complete)return <AccountPage route={complete?'account/'+route:'account/developer'}/>
  return <div className="community-page developer-page"><BackLink href="#forum">Community forum</BackLink><div className="page-heading"><div><p className="page-kicker">MODWERK / DEVELOPERS</p><h1>Developer workspace</h1><p>Claim your modules, follow bug reports and keep their documentation and releases current.</p></div>{session?.user&&<button className="button button-quiet" disabled={busy} onClick={()=>void act(()=>api('/developer/auth/session',{method:'DELETE'}))}>Sign out @{session.user.login}</button>}</div>
    {error&&<p className="file-error" role="alert">{error}</p>}
    {reportId?<PrivateIssueDetail key={reportId} id={reportId} back="#developer"/>:<>
      <section className="configuration-section"><div className="section-title"><h2>Module activity</h2><button className="text-button" disabled={busy||!notifications.some(item=>!item.seen)} onClick={()=>void act(()=>post('/developer/notifications',{},'PATCH'))}>Mark all read</button></div>{notifications.length?<div className="account-notifications"><NotificationList lines={notificationLines(notifications)} onOpen={()=>{}}/></div>:<p className="service-note">Replies in module threads, and comments, ratings and likes on your claimed modules appear here automatically. Public bug reports mention you on GitHub and are listed under Module reports below. Sign in to a member account with the same GitHub account to get module activity in the bell and by email.</p>}</section>
      <section className="configuration-section"><h2>Your modules</h2>{!modules.length?<p className="service-note">No reviewed module lists @{session.user.login} as a maintainer yet. Add the handle to the module manifest through a reviewed GitHub PR, then sign in again.</p>:<div className="developer-module-grid">{modules.map(module=><article className="inbox-issue" key={module.id}><div className="section-title"><h3><a href={module.href}>{module.name}</a></h3><span className="pill">{DEVICES_BY_ID[module.machine].name}</span></div><p>Version {module.version} · Evidence: {module.evidence}</p>{!module.claimed?<button className="button button-primary" disabled={busy||module.blocked} onClick={()=>void act(()=>post('/developer/modules/'+module.id+'/claim',{}))}>{module.blocked?'Access revoked — contact administrator':'Claim module'}</button>:<><p>{module.reports.open??0} open reports · {module.ratings.count} ratings{module.ratings.average!==null?' ('+module.ratings.average.toFixed(1)+'/5)':''} · {module.threads} discussions</p><div className="forum-actions"><button className="text-button" onClick={()=>{setSelected(module.id);document.getElementById('developer-reports')?.focus()}}>View reports</button><a href={threadHref(moduleThreadId(module.id))}>Module thread</a><a href={'#forum?machine='+module.machine+'&module='+module.id}>Forum threads</a><a href={(sourceRepository()||'https://github.com/repeat98/octamod')+'/tree/main/'+module.sourcePath} target="_blank" rel="noreferrer">Source & documentation ↗</a><a href={'#submit/'+module.id}>Prepare an update</a></div><CreatorSupport id={module.id} editor/></>}</article>)}</div>}</section>
      <section className="configuration-section"><div className="section-title"><h2 id="developer-reports" tabIndex={-1}>Module reports</h2><span className="pill">{reports.filter(item=>item.status==='open').length} open</span></div><p className="service-note">Open a report to read GitHub replies, close it with an explanation or reopen it. You can manage reports for your claimed modules here without repository write access or an administrator. Published firmware fixes use “Resolve report and notify followers” after download verification.</p><div className="statistics-controls"><label>Module<select value={selected} onChange={event=>setSelected(event.target.value)}><option value="">All claimed modules</option>{modules.filter(module=>module.claimed).map(module=><option key={module.id} value={module.id}>{DEVICES_BY_ID[module.machine].name} · {module.name}</option>)}</select></label><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="open">Open</option><option value="closed">Resolved</option><option value="all">All reports</option></select></label></div>{reports.map(item=><article className="inbox-issue" key={item.id}><h3>{item.title}</h3><a href={'#developer/report/'+item.id}>{item.status==='open'?'Open report to reply or close':'View report or reopen'}</a>{item.github_url?<a href={item.github_url} target="_blank" rel="noreferrer">GitHub issue ↗</a>:item.forum_thread_id&&<a href={threadHref(item.forum_thread_id)}>Forum discussion →</a>}{item.github_url&&item.status==='open'&&<CopyButton text={'Fix issue '+item.github_url} label="Copy fix prompt"/>}<small>{item.module_id} · {item.status==='open'?'Open':'Resolved'} · {item.created_at}</small></article>)}{!reports.length&&<p className="service-note">No reports match these filters. New bug reports arrive automatically; older private reports require reporter sharing.</p>}{reports.length===200&&<p className="service-note">Showing the latest 200 reports.</p>}</section>
      <p className="service-note">Copy a fix prompt into your coding agent in your fork. It prepares the fix and version bump, guides your hardware tests, and follows the release. After verifying the live download, use “Resolve report and notify followers” on the report to close it on GitHub and Modwerk and queue update notifications.</p>
      <p className="service-note">Open a GitHub pull request to update your module. Registered authors can request automatic merge and publication after the required checks pass; changes beyond their own modules need owner review. Developer sign-in grants access to claimed modules and does not grant site administration.</p>
    </>}
  </div>
}
