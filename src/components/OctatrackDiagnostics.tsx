import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { OctatrackLink } from '../engine/elekloader/octatrack-link'
import type { Inventory } from '../config/inventory'
import { changeDiagnosticSharing, collectOctatrackDiagnostics, diagnosticPreference, subscribeDiagnosticPreference } from '../community/octatrack-diagnostics'
import { api } from '../community/api'
import { browserRequestsPrivacy } from '../community/usage'
import type { DiagnosticEntry } from '../community/octatrack-diagnostics-contract'
import { DiagnosticDetails, DiagnosticsInvitation } from './DiagnosticsInvitation'

export function OctatrackDiagnosticsCollector({memberId,link,inventory}: {memberId:string;link:OctatrackLink|null;inventory?:Inventory}) {
  const latest = useRef(inventory)
  useEffect(()=>{latest.current=inventory},[inventory])
  useEffect(()=>collectOctatrackDiagnostics(memberId,link,()=>latest.current),[memberId,link])
  return null
}
export function OctatrackDiagnosticsSettings() {
  const state = useSyncExternalStore(subscribeDiagnosticPreference,diagnosticPreference,diagnosticPreference)
  const [invitation,setInvitation]=useState(false)
  const privacy = browserRequestsPrivacy()
  return <section className="octatrack-diagnostics" aria-label="Diagnostics">
    <h3>Diagnostics</h3>
    <p>{state.enabled ? 'You’re helping me find browser, build and Octatrack sync problems.' : 'Help me find browser, build and Octatrack sync problems by sharing private technical reports.'}</p>
    {!state.enabled && <button type="button" className="button button-quiet" aria-haspopup="dialog" onClick={()=>setInvitation(true)}>About sharing diagnostics</button>}
    <DiagnosticDetails/>
    {state.ready && (state.hasChoice || state.error) && <button className="text-button" disabled={state.busy} onClick={()=>void changeDiagnosticSharing(false)}>Stop sharing and delete</button>}
    {state.notice && <p className="link-hint" role="status">{state.notice}</p>}
    {state.lastSent && <p className="link-hint" role="status">Last diagnostic received: {new Date(state.lastSent).toLocaleTimeString()}</p>}
    {privacy && <p className="link-hint">Your browser requests privacy, so automatic diagnostics stay off here.</p>}
    {state.error && <p className="file-error" role="alert">{state.error}</p>}
    {invitation && <DiagnosticsInvitation onClose={()=>setInvitation(false)}/>}
  </section>
}
export function OctatrackDiagnosticsAdmin() {
  const [data,setData] = useState<{events:DiagnosticEntry[];counts:{day:string;event:string;count:number}[]}>(),[error,setError]=useState('')
  async function load() { try {setData(await api('/admin/octatrack/diagnostics'));setError('')} catch(error) {setError(error instanceof Error?error.message:'Couldn’t read diagnostics.')} }
  useEffect(()=>{let cancelled=false;void api<{events:DiagnosticEntry[];counts:{day:string;event:string;count:number}[]}>('/admin/octatrack/diagnostics').then(value=>{if(!cancelled)setData(value)}).catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:'Couldn’t read diagnostics.')});return()=>{cancelled=true}},[])
  return <section className="configuration-section"><div className="section-title"><h2>Technical diagnostics</h2><button className="button button-quiet" onClick={()=>void load()}>Refresh</button></div>
    <p className="service-note">Private opt-in records from the last 30 days; newest 100 shown. A record is an observation, not a confirmed bug. Daily sync-action counts also include people who leave technical sharing off.</p>
    {data && <><details><summary>Daily sync counts</summary>{data.counts.map(row=><p key={row.day+row.event}>{row.day} · {row.event}: {row.count}</p>)}</details>{data.events.length ? data.events.map(entry=><details key={entry.eventId+entry.username}><summary>{entry.createdAt} · @{entry.username} · {entry.data.event}</summary><pre className="diagnostic-json">{JSON.stringify(entry.data,null,2)}</pre></details>) : <p>No shared diagnostics yet.</p>}</>}
    {error && <p className="file-error" role="alert">{error}</p>}
  </section>
}
