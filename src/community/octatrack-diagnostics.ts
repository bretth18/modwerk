import { scopedApi } from './api'
import { MODULES } from '../catalog/modules'
import type { Inventory } from '../config/inventory'
import type { OctatrackLink, LinkDiagnostic } from '../engine/elekloader/octatrack-link'
import { browserRequestsPrivacy, countOctatrackAction } from './usage'
import { OCTATRACK_DIAGNOSTICS_VERSION, DIAGNOSTIC_USB_EVENTS, type SiteDiagnosticEvent, type DiagnosticConsent, type OctatrackDiagnostic } from './octatrack-diagnostics-contract'
import { subscribeSiteDiagnosticEvents, collectBrowserDiagnosticEvents } from './site-diagnostic-events'

export interface DiagnosticPreference { accountId: string | null; available: boolean; enabled: boolean; ready: boolean; busy: boolean; error: string; notice: string; hasChoice: boolean; lastSent: string | null }
const listeners = new Set<() => void>()
const locallyStopped = new Set<string>()
let snapshot: DiagnosticPreference = {accountId:null,available:false,enabled:false,ready:false,busy:false,error:'',notice:'',hasChoice:false,lastSent:null}
let owner: string | null = null, blocked = false, expires = 0
let preferenceRevision = 0
let generation = 0, accountApi: ReturnType<typeof scopedApi> | undefined
let transfer: AbortController | undefined
let healthRead: AbortController | undefined
const publish = (value: Partial<DiagnosticPreference>) => { snapshot = {...snapshot,...value}; listeners.forEach(listener=>listener()) }
export const diagnosticPreference = () => snapshot
export const subscribeDiagnosticPreference = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export async function changeDiagnosticSharing(enabled: boolean) {
  if (!owner || !accountApi?.current() || !snapshot.ready || snapshot.busy || enabled && browserRequestsPrivacy()) return false
  const member = owner, client = accountApi, currentGeneration = generation, revision = ++preferenceRevision
  const current = () => owner === member && generation === currentGeneration && preferenceRevision === revision && client.current()
  if (!enabled) { locallyStopped.add(member); blocked = true; transfer?.abort(); healthRead?.abort(); publish({enabled:false}) }
  publish({busy:true,error:'',notice:''})
  try {
    const saved = await client.request<DiagnosticConsent>('/octatrack/diagnostics/consent',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled,version:OCTATRACK_DIAGNOSTICS_VERSION})})
    if (!current()) return false
    if (saved.accountId !== member || !enabled && saved.enabled || enabled && (!saved.enabled || saved.version !== OCTATRACK_DIAGNOSTICS_VERSION || !(Date.parse(saved.expiresAt ?? '') > Date.now()))) throw new Error('Your sign-in or diagnostic choice changed in another tab. Refresh and try again.')
    if (enabled && saved.enabled) locallyStopped.delete(member)
    blocked = !saved.enabled; expires = Date.parse(saved.expiresAt ?? '')
    publish({enabled:saved.enabled,ready:true,available:true,hasChoice:saved.version === OCTATRACK_DIAGNOSTICS_VERSION && !!saved.changedAt,notice:saved.enabled?'Diagnostics sharing is on.':'Sharing stopped. Your shared diagnostics were deleted.',...(!saved.enabled ? {lastSent:null} : {})})
    return true
  } catch (error) {
    if (current()) publish({error:enabled ? error instanceof Error ? error.message : 'Couldn’t enable diagnostics.' : 'Sharing stopped on this page. I couldn’t confirm deletion on the server; please try Stop sharing and delete again.'})
  } finally { if (preferenceRevision === revision) publish({busy:false}) }
  return false
}

/** One collector per authenticated member page. No persistent trace queue, arbitrary errors, extra device identifiers,
 * project references or diagnostic reads before consent. Unsent events are dropped; USB work never awaits the network. */
export function collectOctatrackDiagnostics(memberId: string, link: OctatrackLink | null, inventory: () => Inventory | undefined) {
  let stopped = false, refreshing = false, reading = false, activeSync = false, lastHealth = '', sent = 0, budgetAt = Date.now(), sending = false
  const queue: OctatrackDiagnostic[] = []
  const requests = new AbortController()
  const currentGeneration = ++generation, client = accountApi = scopedApi(), busy = snapshot.busy
  owner = memberId; blocked = locallyStopped.has(memberId); expires = 0
  publish({accountId:memberId,available:false,enabled:false,ready:false,busy,error:'',notice:'',hasChoice:false,lastSent:null})
  const current = () => !stopped && generation === currentGeneration && owner === memberId && client.current()
  const allowed = () => current() && snapshot.enabled && !blocked && expires > Date.now() && !browserRequestsPrivacy()
  let siteCleanup: (() => void) | undefined
  const syncSiteCollection = () => {
    if (!allowed()) { siteCleanup?.(); siteCleanup=undefined; return }
    if (siteCleanup) return
    const unsubscribe=subscribeSiteDiagnosticEvents(event=>send(event),allowed)
    const stopBrowser=typeof window === 'undefined' ? () => {} : collectBrowserDiagnosticEvents(window)
    siteCleanup=()=>{stopBrowser();unsubscribe()}
  }
  const stopPreference=subscribeDiagnosticPreference(syncSiteCollection)
  async function refresh() {
    if (!current() || refreshing || snapshot.busy) return false
    refreshing = true
    const revision = preferenceRevision
    try {
      const saved = await client.request<DiagnosticConsent>('/octatrack/diagnostics/consent',{signal:requests.signal})
      if (!current() || snapshot.busy || preferenceRevision !== revision) return false
      if (saved.accountId !== memberId) { publish({enabled:false,ready:false,error:'Your sign-in changed. Refresh this page to manage diagnostics.'}); return false }
      expires = Date.parse(saved.expiresAt ?? '')
      publish({enabled:saved.enabled && saved.version === OCTATRACK_DIAGNOSTICS_VERSION && !blocked,ready:true,available:true,hasChoice:saved.version === OCTATRACK_DIAGNOSTICS_VERSION && !!saved.changedAt})
      if (!saved.enabled) { transfer?.abort(); healthRead?.abort() }
      return true
    } catch { if (current() && preferenceRevision === revision && !snapshot.busy) publish({enabled:false,ready:true,available:false}) }
    finally { refreshing = false }
    return false
  }
  function send(event: LinkDiagnostic | SiteDiagnosticEvent) {
    if (!allowed() || event.event === 'health' && sending) return
    const usbEvent=(DIAGNOSTIC_USB_EVENTS as readonly string[]).includes(event.event)
    const modules = usbEvent ? inventory()?.moduleIds.flatMap(id => { const module = MODULES.find(item => item.id === id); return module ? [{id:module.id,catalogVersion:module.version}] : [] }) : undefined
    const data: OctatrackDiagnostic = {id:crypto.randomUUID(),...event,...(modules ? {modules} : {})}
    if (queue.length >= 16) queue.shift()
    queue.push(data); void drain()
  }
  async function drain() {
    if (sending) return
    sending = true
    try {
      while (queue.length && allowed()) {
        if (Date.now()-budgetAt>=3600000) {budgetAt=Date.now();sent=0}
        if (sent >= 100) break
        const data = queue.shift()!, controller = transfer = new AbortController()
        sent++
        try {
          const result = await client.fetch('/octatrack/diagnostics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:OCTATRACK_DIAGNOSTICS_VERSION,data}),signal:controller.signal})
          if (!current() || controller.signal.aborted) break
          if (result.status === 403) { publish({enabled:false}); break }
          if (result.ok) {
            const body=await result.json()
            if (body.stored && allowed() && !controller.signal.aborted) publish({lastSent:new Date().toISOString()})
          }
        } catch { /* No retry or disk queue; a later event can succeed. */ }
        finally { if (transfer === controller) transfer = undefined }
      }
    } finally { queue.length=0; sending=false }
  }
  const unsubscribe = link?.subscribeDiagnostics(event => {
    if (!current()) return
    if (event.event === 'sync_started') { activeSync = true; countOctatrackAction('usb_sync_started') }
    else if (activeSync && ['kept','undone','sync_failed','disconnected'].includes(event.event)) {
      countOctatrackAction(event.event === 'kept' ? 'usb_sync_kept' : event.event === 'undone' ? 'usb_sync_undone' : 'usb_sync_failed'); activeSync = false
    }
    void send(event)
  })
  async function tick() {
    syncSiteCollection()
    if (!await refresh()) return // Never use a stale choice while another refresh is still pending.
    if (!allowed() || reading || !link || link.getState().status !== 'ready') return
    reading = true
    const controller = healthRead = new AbortController()
    try {
      const record = await link.health(controller.signal, allowed)
      if (!record || !allowed()) return
      const fingerprint = JSON.stringify(record)
      if (fingerprint === lastHealth) return
      lastHealth = fingerprint
      const state = link.getState()
      void send({event:'health',phase:state.status,...(state.identity ? {base:state.identity.base} : {}),...(state.active ? {active:state.active} : {}),reading:record})
    } catch { /* Another tab or an active load owns the unit; skip this round. */ }
    finally { reading = false; if (healthRead === controller) healthRead = undefined }
  }
  void refresh()
  const timer = setInterval(() => { void tick() }, 30_000)
  return () => { stopped = true; requests.abort(); clearInterval(timer); unsubscribe?.(); stopPreference(); siteCleanup?.(); if (generation === currentGeneration) { transfer?.abort(); healthRead?.abort(); owner = null; accountApi = undefined; publish({accountId:null,available:false,enabled:false,ready:false}) } }
}
