import { apiUrl } from '../hosting'
import type { UsageDevice, UsageEvent } from './usage-contract'
import { USAGE_CONSENT_VERSION } from '../legal/policy'
import { canTrackModuleDownload } from './module-downloads'
const preferenceKey = 'octamod.usage.consent', visitorKey = 'octamod.usage.daily-visitor', configurationsKey = 'octamod.usage.started-configurations'
let withdrawnForThisPage=false
/** Saved only when a visitor objects to identifier-free counts; nothing is stored while they are allowed. */
const anonymousOffKey = 'modwerk.usage.anonymous-off'
const anonymousConfigurations = new Set<string>()
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
export function browserRequestsPrivacy() { return typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl === true) }
export function usageAllowed() {
  try {
    if(withdrawnForThisPage || typeof window === 'undefined' || browserRequestsPrivacy())return false
    const saved:unknown=JSON.parse(localStorage.getItem(preferenceKey)??'null')
    if(!saved||typeof saved!=='object')return false
    const consent=saved as {version?:unknown;acceptedAt?:unknown}
    return consent.version===USAGE_CONSENT_VERSION && typeof consent.acceptedAt==='string' && Number.isFinite(Date.parse(consent.acceptedAt)) && Date.now()>=Date.parse(consent.acceptedAt) && Date.now()-Date.parse(consent.acceptedAt)<180*86400000
  } catch { return false }
}
export function setUsageAllowed(enabled: boolean) {
  if(!enabled)withdrawnForThisPage=true
  try {
    if(enabled&&!browserRequestsPrivacy())localStorage.setItem(preferenceKey,JSON.stringify({version:USAGE_CONSENT_VERSION,acceptedAt:new Date().toISOString()}))
    else {localStorage.removeItem(preferenceKey);localStorage.removeItem(visitorKey);localStorage.removeItem(configurationsKey)}
    localStorage.removeItem('octamod.usage.opt-out')
    if(enabled&&!browserRequestsPrivacy())withdrawnForThisPage=false
    lastPage = ''
    return true
  } catch {return false}
}
/** Identifier-free counts need no device storage or identifiers; Do Not Track, Global Privacy Control and a saved objection stop them. */
export function anonymousCountsAllowed() {
  if(typeof window === 'undefined' || browserRequestsPrivacy())return false
  try { return localStorage.getItem(anonymousOffKey)!=='1' } catch { return true }
}
export function setAnonymousCountsAllowed(enabled: boolean) {
  try { if(enabled)localStorage.removeItem(anonymousOffKey); else localStorage.setItem(anonymousOffKey,'1'); return true } catch { return false }
}
function countAnonymously(body: {event: UsageEvent; device?: UsageDevice} | {event: 'module_download'; moduleId: string}) {
  try {void fetch(apiUrl('/usage/count'),{method:'POST',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{})} catch { /* Counts never block device work. */ }
}
function visitor() {
  const day = new Date().toISOString().slice(0,10)
  try {
    let record: {day?:string;value?:string} = {}
    try {record=JSON.parse(localStorage.getItem(visitorKey)??'{}') as typeof record} catch { /* Replace an invalid local identifier. */ }
    if(record?.day === day && typeof record.value === 'string' && uuid.test(record.value))return record.value
    const value=crypto.randomUUID();localStorage.setItem(visitorKey,JSON.stringify({day,value}));return value
  } catch {return null}
}
/** After consent, the only outbound fields are a closed event name, two random identifiers and, for builds and downloads,
 * which of the three building machines it was. Never pass build/configuration data. */
export function trackUsage(event: UsageEvent, device?: UsageDevice) {
  const machine = device ? {device} : {}
  if(!usageAllowed()){if(anonymousCountsAllowed())countAnonymously({event,...machine});return}
  const dailyVisitor=visitor();if(!dailyVisitor)return
  try {void fetch(apiUrl('/usage/events'),{method:'POST',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json','X-Octamod-Usage-Consent':USAGE_CONSENT_VERSION},body:JSON.stringify({event,...machine,eventId:crypto.randomUUID(),visitor:dailyVisitor})}).catch(()=>{})} catch { /* Counts never block device work. */ }
}
let lastPage = ''
export function trackPageView(route: string) {
  if((!usageAllowed()&&!anonymousCountsAllowed())||lastPage===route)return
  lastPage=route
  if(route==='admin'||route==='review')return
  trackUsage('page_view') // The route itself is never sent.
}
export function trackConfigurationStarted(id: string) {
  if(!uuid.test(id))return
  if(!usageAllowed()){
    // Deduplicated in memory for this page only; configuration IDs never leave the device.
    if(anonymousCountsAllowed()&&!anonymousConfigurations.has(id)){anonymousConfigurations.add(id);countAnonymously({event:'configuration_started'})}
    return
  }
  try {
    let ids: string[]=[]
    try {const saved:unknown=JSON.parse(localStorage.getItem(configurationsKey)??'[]');if(Array.isArray(saved))ids=saved.filter((value):value is string=>typeof value==='string'&&uuid.test(value))} catch { /* Keep tracking best-effort. */ }
    if(ids.includes(id))return
    localStorage.setItem(configurationsKey,JSON.stringify([...ids.slice(-999),id]))
    trackUsage('configuration_started') // Local configuration IDs and contents never leave the device.
  } catch { /* Storage-disabled browsers are excluded. */ }
}

/** Call only after an enabled download of a completed build, using that build's reported module IDs. */
export function trackFirmwareDownload(moduleIds: readonly string[], device: UsageDevice) {
  trackUsage('firmware_download_requested', device)
  if(!usageAllowed()){
    if(anonymousCountsAllowed())for(const moduleId of new Set(moduleIds))if(canTrackModuleDownload(moduleId))countAnonymously({event:'module_download',moduleId})
    return
  }
  const dailyVisitor=visitor();if(!dailyVisitor)return
  for(const moduleId of new Set(moduleIds)) {
    if(!canTrackModuleDownload(moduleId))continue
    try {void fetch(apiUrl('/usage/module-downloads'),{method:'POST',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json','X-Octamod-Usage-Consent':USAGE_CONSENT_VERSION},body:JSON.stringify({moduleId,eventId:crypto.randomUUID(),visitor:dailyVisitor})}).catch(()=>{})} catch { /* Counts never block a firmware download. */ }
  }
}
