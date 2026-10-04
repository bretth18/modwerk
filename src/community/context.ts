import { createContext, useContext } from 'react'
import type { PublishedModule, Session } from './api'
export const emptySession:Session={available:false,emailAvailable:false,admin:false,user:null}
export const CommunityContext=createContext<{session:Session;loading:boolean;catalog:PublishedModule[];refresh:()=>Promise<void>}>({session:emptySession,loading:true,catalog:[],refresh:async()=>{}})
export function useCommunity(){return useContext(CommunityContext)}
