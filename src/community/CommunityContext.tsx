import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { DeveloperSession, PublishedModule, Session } from './api'
import { CommunityContext, emptyDeveloperSession, emptySession } from './context'
export function CommunityProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState(emptySession),[loading,setLoading]=useState(true),[developer,setDeveloper]=useState<DeveloperSession|null>(null),[catalog,setCatalog]=useState<PublishedModule[]>([])
 const active=useRef(true),sessionRequest=useRef<Promise<void>|null>(null),catalogRequest=useRef<Promise<void>|null>(null),developerRequest=useRef<Promise<void>|null>(null),sessionVersion=useRef(0),developerVersion=useRef(0)
 const refreshCatalog=useCallback(()=>{
  if(catalogRequest.current)return catalogRequest.current
  const request=api<PublishedModule[]>('/catalog').then(items=>{if(active.current)setCatalog(items)}).catch(()=>{}).finally(()=>{catalogRequest.current=null})
  catalogRequest.current=request
  return request
 },[])
 const refreshDeveloper=useCallback((force=true)=>{
  if(!force&&developerRequest.current)return developerRequest.current
  const version=++developerVersion.current
  const request=api<DeveloperSession>('/developer/auth/session').then(value=>{if(active.current&&version===developerVersion.current)setDeveloper(value)}).catch(()=>{if(active.current&&version===developerVersion.current)setDeveloper(emptyDeveloperSession)}).finally(()=>{if(version===developerVersion.current)developerRequest.current=null})
  developerRequest.current=request
  return request
 },[])
 const refresh=useCallback((force=true)=>{
  if(!force&&sessionRequest.current)return sessionRequest.current
  // Explicit refreshes after account changes supersede older requests.
  const version=++sessionVersion.current
  setLoading(true)
  // Catalog availability must never invalidate an authenticated session.
  void refreshCatalog()
  const request=api<Session>('/auth/session').then(next=>{if(active.current&&version===sessionVersion.current)setSession(next)}).catch(()=>{if(active.current&&version===sessionVersion.current)setSession(emptySession)}).finally(()=>{if(version===sessionVersion.current){sessionRequest.current=null;if(active.current)setLoading(false)}})
  sessionRequest.current=request
  return request
 },[refreshCatalog])
 useEffect(()=>{
  active.current=true
  void refresh(false)
  const resume=()=>{if(document.visibilityState==='visible')void refresh(false)}
  const changed=(event:StorageEvent)=>{if(event.key===null||event.key.startsWith('octamod.community.session:'))void refresh()}
  window.addEventListener('focus',resume);window.addEventListener('online',resume);window.addEventListener('storage',changed)
  return()=>{active.current=false;window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener('storage',changed)}
 },[refresh])
 useEffect(()=>{
  const load=()=>{void refreshDeveloper(false)}
  const changed=(event:StorageEvent)=>{if(event.key===null||event.key.startsWith('modwerk.developer.session:'))void refreshDeveloper()}
  load();window.addEventListener('focus',load);window.addEventListener('storage',changed)
  return()=>{window.removeEventListener('focus',load);window.removeEventListener('storage',changed)}
 },[refreshDeveloper])
 return <CommunityContext.Provider value={{session,loading,developer,catalog,refresh,refreshDeveloper}}>{children}</CommunityContext.Provider>
}
