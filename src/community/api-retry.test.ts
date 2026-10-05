import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, post } from './api'

beforeEach(()=>{
 vi.useFakeTimers()
 vi.stubEnv('VITE_COMMUNITY_API_URL','')
 vi.stubGlobal('localStorage',{getItem:()=>null})
 vi.stubGlobal('sessionStorage',{getItem:()=>null})
})
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals()})
describe('community read recovery',()=>{
 it('keeps public reads free of saved credentials and preserves protected reads',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>'a'.repeat(64)})
  vi.stubGlobal('sessionStorage',{getItem:()=>'b'.repeat(64)})
  const fetch=vi.fn().mockImplementation(async()=>Response.json({}))
  vi.stubGlobal('fetch',fetch)
  for(const path of ['/catalog','/community/summary?fresh=1','/notifications'])await api(path)
  const headers=fetch.mock.calls.map(([,options])=>(options as RequestInit).headers as Headers)
  expect(headers.map(value=>value.has('Authorization'))).toEqual([false,false,true])
  expect(headers.map(value=>value.has('X-Octamod-Admin'))).toEqual([false,false,true])
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
  controller.abort()
  await rejected
  await vi.advanceTimersByTimeAsync(200)
  expect(fetch).toHaveBeenCalledTimes(1)
 })
})
