import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { DeveloperSession, PublishedModule, Session } from './api'
import { CommunityContext, emptyDeveloperSession, emptySession } from './context'
export function CommunityProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState(emptySession),[developer,setDeveloper]=useState<DeveloperSession|null>(null),[catalog,setCatalog]=useState<PublishedModule[]>([])
 const refreshDeveloper=useCallback(async()=>{try{setDeveloper(await api<DeveloperSession>('/developer/auth/session'))}catch{setDeveloper(emptyDeveloperSession)}},[])
 async function refresh(){try{const next=await api<Session>('/auth/session');setSession(next);if(next.available)setCatalog(await api<PublishedModule[]>('/catalog'))}catch{setSession(emptySession)}}
 useEffect(()=>{let cancelled=false;void api<Session>('/auth/session').then(next=>{if(cancelled)return;setSession(next);if(next.available)void api<PublishedModule[]>('/catalog').then(items=>{if(!cancelled)setCatalog(items)}).catch(()=>{})}).catch(()=>{});return()=>{cancelled=true}},[])
 useEffect(()=>{
  let cancelled=false
  const load=()=>{void api<DeveloperSession>('/developer/auth/session').then(value=>{if(!cancelled)setDeveloper(value)}).catch(()=>{if(!cancelled)setDeveloper(emptyDeveloperSession)})}
  const changed=(event:StorageEvent)=>{if(event.key===null||event.key.startsWith('modwerk.developer.session:'))load()}
  load();window.addEventListener('focus',load);window.addEventListener('storage',changed)
  return()=>{cancelled=true;window.removeEventListener('focus',load);window.removeEventListener('storage',changed)}
 },[])
 return <CommunityContext.Provider value={{session,developer,catalog,refresh,refreshDeveloper}}>{children}</CommunityContext.Provider>
}
