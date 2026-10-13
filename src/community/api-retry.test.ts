import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
let api: typeof import('./api').api, post: typeof import('./api').post

beforeEach(async()=>{
 vi.resetModules()
 ;({api,post}=await import('./api'))
 vi.useFakeTimers()
 vi.stubEnv('VITE_COMMUNITY_API_URL','')
 vi.stubGlobal('localStorage',{getItem:()=>null})
 vi.stubGlobal('sessionStorage',{getItem:()=>null})
})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals()})
describe('community read recovery',()=>{
 it('binds private background requests to the account that started them',async()=>{
  let token='a'.repeat(64)
  const setItem=vi.fn()
  vi.stubGlobal('localStorage',{getItem:()=>token,setItem})
  const {scopedApi}=await import('./api'),client=scopedApi()
  let finish:(value:Response)=>void=()=>{}
  const fetch=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve}))
  vi.stubGlobal('fetch',fetch)
  const pending=client.request('/octatrack/diagnostics',{method:'POST',body:'{}'})
  const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'})
  token='b'.repeat(64)
  finish(Response.json({ok:true},{headers:{'X-Octamod-Session':'a'.repeat(64)}}));await rejected
  expect(setItem).not.toHaveBeenCalled();expect(client.current()).toBe(false)
  await expect(client.request('/octatrack/diagnostics')).rejects.toMatchObject({name:'AbortError'})
  expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('keeps public reads free of saved credentials and preserves protected reads',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>'a'.repeat(64)})
  vi.stubGlobal('sessionStorage',{getItem:()=>'b'.repeat(64)})
  const fetch=vi.fn().mockImplementation(async()=>Response.json({}))
  vi.stubGlobal('fetch',fetch)
  for(const path of ['/catalog','/community/summary?fresh=1','/announcements','/notifications','/announcements/mine'])await api(path)
  const headers=fetch.mock.calls.map(([,options])=>(options as RequestInit).headers as Headers)
  expect(headers.map(value=>value.has('Authorization'))).toEqual([false,false,false,true,true])
  expect(headers.map(value=>value.has('X-Octamod-Admin'))).toEqual([false,false,false,true,true])
 })
 it('sends the member session on a presence check-in while leaving public count reads credential-free',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>'a'.repeat(64)})
  const fetch=vi.fn().mockImplementation(async()=>Response.json({online:1,members:[],more:1}))
  vi.stubGlobal('fetch',fetch)
  await api('/community/online');await post('/community/online',{})
  const headers=fetch.mock.calls.map(([,options])=>(options as RequestInit).headers as Headers)
  expect(headers[0].has('Authorization')).toBe(false)
  expect(headers[1].get('Authorization')).toBe('Bearer '+'a'.repeat(64))
 })

 it('retries a transient session failure once',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(Response.json({error:'temporary'}, {status:503})).mockResolvedValueOnce(Response.json({available:true,user:null}))
  vi.stubGlobal('fetch',fetch)
  const result=api('/auth/session')
  await vi.advanceTimersByTimeAsync(200)
  expect(await result).toEqual({available:true,user:null})
  expect(fetch).toHaveBeenCalledTimes(2)
 })
 it('recovers an interrupted catalog read',async()=>{
  const fetch=vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json([]))
  vi.stubGlobal('fetch',fetch)
  const result=api('/catalog')
  await vi.advanceTimersByTimeAsync(200)
  expect(await result).toEqual([])
  expect(fetch).toHaveBeenCalledTimes(2)
 })
 it('allows a slow read to finish past ten seconds while keeping a deadline',async()=>{
  const timeout=vi.spyOn(AbortSignal,'timeout').mockImplementation(delay=>{
   const controller=new AbortController()
   setTimeout(()=>controller.abort(new DOMException('Timed out','TimeoutError')),delay)
   return controller.signal
  })
  const fetch=vi.fn((_url:string,options:RequestInit)=>new Promise<Response>((resolve,reject)=>{
   setTimeout(()=>resolve(Response.json({available:true,user:null})),12000)
   options.signal!.addEventListener('abort',()=>reject(options.signal!.reason),{once:true})
  }))
  vi.stubGlobal('fetch',fetch)
  const result=api('/auth/session')
  await vi.advanceTimersByTimeAsync(12000)
  await expect(result).resolves.toEqual({available:true,user:null})
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(timeout).toHaveBeenCalledWith(30000)
 })
 it('still times out stalled reads and opens recovery after the bounded retry',async()=>{
  vi.spyOn(AbortSignal,'timeout').mockImplementation(delay=>{
   const controller=new AbortController()
   setTimeout(()=>controller.abort(new DOMException('Timed out','TimeoutError')),delay)
   return controller.signal
  })
  const fetch=vi.fn((_url:string,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(options.signal!.reason),{once:true})))
  vi.stubGlobal('fetch',fetch)
  const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(60200);await failed
  expect(fetch).toHaveBeenCalledTimes(2)
  await expect(api('/auth/session')).rejects.toThrow('Couldn’t reach')
  expect(fetch).toHaveBeenCalledTimes(2)
 })
 it('retries marking notifications read, which is idempotent',async()=>{
  const fetch=vi.fn().mockRejectedValueOnce(new TypeError('connection dropped')).mockResolvedValueOnce(Response.json({ok:true}))
  vi.stubGlobal('fetch',fetch)
  const result=post('/notifications',{ids:['n1']},'PATCH')
  await vi.advanceTimersByTimeAsync(200)
  expect(await result).toEqual({ok:true})
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch.mock.calls.map(([,options])=>(options as RequestInit).body)).toEqual(['{"ids":["n1"]}','{"ids":["n1"]}'])
 })
 it('does not replay other notification changes',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('connection dropped'))
  vi.stubGlobal('fetch',fetch)
  await expect(post('/notifications/preferences',{likes:false},'PATCH')).rejects.toThrow('Couldn’t reach')
  expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('retries an interrupted public acknowledgement without changing its ids',async()=>{
  const fetch=vi.fn().mockRejectedValueOnce(new TypeError('connection dropped')).mockResolvedValueOnce(Response.json({ok:true}))
  vi.stubGlobal('fetch',fetch)
  const result=post('/announcements/mine',{ids:['announcement-'+'a'.repeat(32)]},'PATCH')
  await vi.advanceTimersByTimeAsync(200)
  expect(await result).toEqual({ok:true})
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body)
 })
 it('does not replay a mutation when the connection drops',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('connection dropped'))
  vi.stubGlobal('fetch',fetch)
  await expect(post('/auth/login',{})).rejects.toThrow('Couldn’t reach')
  expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('does not replay permission failures or account handoffs',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(Response.json({error:'sign in'}, {status:401})).mockResolvedValueOnce(Response.json({error:'temporary'}, {status:503}))
  vi.stubGlobal('fetch',fetch)
  await expect(api('/notifications')).rejects.toThrow('sign in')
  await expect(api('/developer/auth/start')).rejects.toThrow('temporary')
  expect(fetch).toHaveBeenCalledTimes(2)
 })
 it('propagates cancellation to the fetch without retrying',async()=>{
  const controller=new AbortController()
  const fetch=vi.fn((_url:string,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true})))
  vi.stubGlobal('fetch',fetch)
  const result=api('/catalog',{signal:controller.signal})
  const rejected=expect(result).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(0)
  controller.abort()
  await rejected
  await vi.advanceTimersByTimeAsync(200)
  expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('shares an outage cooldown across routes and lets one probe reopen reads',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await failed
  for(const path of ['/auth/session','/developer/auth/session','/forum/categories','/community/online'])await expect(api(path)).rejects.toThrow('Couldn’t reach')
  expect(fetch).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(2000)
  let recover!: (value:Response)=>void
  fetch.mockImplementationOnce(()=>new Promise<Response>(resolve=>{recover=resolve})).mockImplementation(async()=>Response.json({ok:true}))
  const session=api('/auth/session'),catalog=api('/catalog'),online=api('/community/online')
  await vi.advanceTimersByTimeAsync(0)
  expect(fetch).toHaveBeenCalledTimes(3)
  recover(Response.json({ok:true}))
  await expect(Promise.all([session,catalog,online])).resolves.toEqual([{ok:true},{ok:true},{ok:true}])
  expect(fetch).toHaveBeenCalledTimes(5)
 })
 it('backs off failed probes and resets the delay after recovery',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const fail=async()=>{
   const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
   await vi.advanceTimersByTimeAsync(200);await failed
  }
  await fail()
  for(const delay of [2000,5000,15000,30000,60000,60000]){
   const calls=fetch.mock.calls.length
   await vi.advanceTimersByTimeAsync(delay-1)
   await expect(api('/auth/session')).rejects.toThrow('Couldn’t reach')
   expect(fetch).toHaveBeenCalledTimes(calls)
   await vi.advanceTimersByTimeAsync(1);await fail()
   expect(fetch).toHaveBeenCalledTimes(calls+2)
  }
  await vi.advanceTimersByTimeAsync(60000)
  fetch.mockResolvedValueOnce(Response.json([]))
  await expect(api('/catalog')).resolves.toEqual([])
  await fail()
  await vi.advanceTimersByTimeAsync(2000)
  fetch.mockResolvedValueOnce(Response.json([]))
  await expect(api('/catalog')).resolves.toEqual([])
 })
 it('counts a concurrent failure burst once and releases waiters after a failed probe',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const burst=expect(Promise.all([api('/catalog'),api('/auth/session'),api('/forum/categories')])).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await burst
  expect(fetch).toHaveBeenCalledTimes(6)
  await vi.advanceTimersByTimeAsync(2000)
  const probe=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  const waiting=expect(api('/auth/session')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await Promise.all([probe,waiting])
  expect(fetch).toHaveBeenCalledTimes(8)
 })
 it('keeps cancellation out of outage recovery, including the retry pause',async()=>{
  const controller=new AbortController(),fetch=vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(Response.json([]))
  vi.stubGlobal('fetch',fetch)
  const cancelled=expect(api('/catalog',{signal:controller.signal})).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(0);controller.abort()
  await vi.advanceTimersByTimeAsync(200);await cancelled
  await expect(api('/catalog')).resolves.toEqual([])
  expect(fetch).toHaveBeenCalledTimes(2)
 })
 it('lets a cancelled recovery probe hand off to a waiting read',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await failed
  await vi.advanceTimersByTimeAsync(2000)
  const controller=new AbortController()
  fetch.mockImplementationOnce((_url:string,options:RequestInit)=>new Promise<Response>((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}))).mockResolvedValue(Response.json([]))
  const cancelled=expect(api('/catalog',{signal:controller.signal})).rejects.toThrow('Couldn’t reach'),waiting=api('/auth/session')
  await vi.advanceTimersByTimeAsync(0);controller.abort();await cancelled
  await expect(waiting).resolves.toEqual([])
  expect(fetch).toHaveBeenCalledTimes(4)
 })
 it('can cancel a waiting read without interrupting the recovery probe',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await failed
  await vi.advanceTimersByTimeAsync(2000)
  let recover!: (value:Response)=>void
  fetch.mockImplementationOnce(()=>new Promise<Response>(resolve=>{recover=resolve}))
  const probe=api('/catalog'),controller=new AbortController()
  const waiting=expect(api('/auth/session',{signal:controller.signal})).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(0);controller.abort();await waiting
  expect(fetch).toHaveBeenCalledTimes(3)
  recover(Response.json([]));await expect(probe).resolves.toEqual([])
 })
 it('does not let one route’s server error pause other reads',async()=>{
  const fetch=vi.fn().mockImplementation(async()=>Response.json({error:'unavailable'},{status:503}))
  vi.stubGlobal('fetch',fetch)
  const failed=expect(api('/catalog')).rejects.toThrow('unavailable')
  await vi.advanceTimersByTimeAsync(200);await failed
  fetch.mockImplementation(async()=>Response.json({ok:true}))
  await expect(api('/auth/session')).resolves.toEqual({ok:true})
  expect(fetch).toHaveBeenCalledTimes(3)
 })
 it('does not block writes, handoffs or another backend during an outage',async()=>{
  const fetch=vi.fn().mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await failed
  await expect(api('/forum/categories')).rejects.toThrow('Couldn’t reach')
  expect(fetch).toHaveBeenCalledTimes(2)
  fetch.mockImplementation(async()=>Response.json({ok:true}))
  await expect(post('/auth/login',{})).resolves.toEqual({ok:true})
  await expect(api('/developer/auth/start')).resolves.toEqual({ok:true})
  vi.stubEnv('VITE_COMMUNITY_API_URL','https://other.example.test/api')
  await expect(api('/catalog')).resolves.toEqual({ok:true})
  expect(fetch).toHaveBeenCalledTimes(5)
 })
 it('ignores a stale successful response when a newer request has found an outage',async()=>{
  let stale!: (value:Response)=>void
  const fetch=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{stale=resolve})).mockRejectedValue(new TypeError('offline'))
  vi.stubGlobal('fetch',fetch)
  const old=api('/community/online')
  const failed=expect(api('/catalog')).rejects.toThrow('Couldn’t reach')
  await vi.advanceTimersByTimeAsync(200);await failed
  stale(Response.json({ok:true}));await old
  await expect(api('/auth/session')).rejects.toThrow('Couldn’t reach')
  expect(fetch).toHaveBeenCalledTimes(3)
 })
})
